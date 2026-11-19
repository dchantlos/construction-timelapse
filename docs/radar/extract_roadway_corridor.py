"""Export the conceptual roadway deck corridor without modifying the IFC."""

import argparse
import hashlib
import json
import math
from pathlib import Path

import ifcopenshell
import ifcopenshell.api.alignment as alignment_api
import ifcopenshell.geom
import ifcopenshell.util.geolocation as geolocation
import ifcopenshell.util.placement as placement
import ifcopenshell.util.unit as unit
import numpy as np
from pyproj import Geod, Transformer


def extract_corridor(source: Path, configuration: Path) -> dict:
    config = json.loads(configuration.read_text(encoding="utf-8"))
    width = float(config["deckWidthMetres"])
    if not math.isfinite(width) or width <= 0:
        raise ValueError("Roadway width must be positive metres")
    model = ifcopenshell.open(str(source))
    if not math.isclose(unit.calculate_unit_scale(model), 1.0):
        raise ValueError("The corridor exporter requires an IFC authored in metres")
    alignments = model.by_type("IfcAlignment")
    if len(alignments) != 1:
        raise ValueError("Select an IFC with exactly one roadway alignment")
    alignment = alignments[0]
    horizontal = alignment_api.get_horizontal_layout(alignment)
    length = sum(
        segment.DesignParameters.SegmentLength
        for relation in horizontal.IsNestedBy
        for segment in relation.RelatedObjects
        if segment.is_a("IfcAlignmentSegment")
    )
    curve = alignment_api.get_curve(alignment)
    if curve is None or not math.isfinite(length) or length <= width:
        raise ValueError("The IFC does not contain a usable roadway curve")
    settings = ifcopenshell.geom.settings()
    mapped = ifcopenshell.ifcopenshell_wrapper.map_shape(settings, curve)
    evaluator = ifcopenshell.ifcopenshell_wrapper.function_item_evaluator(settings, mapped)
    stations = np.linspace(0.0, length, math.ceil(length / 4.0) + 1)
    frames = np.asarray([evaluator.evaluate(float(station)) for station in stations])
    left = frames[:, :3, 3] + frames[:, :3, 1] * width / 2.0
    right = frames[:, :3, 3] - frames[:, :3, 1] * width / 2.0
    ring = np.vstack([left, right[::-1], left[:1]])
    if alignment.ObjectPlacement:
        transform = placement.get_local_placement(alignment.ObjectPlacement)
        homogeneous = np.column_stack([ring, np.ones(len(ring))])
        ring = (transform @ homogeneous.T).T[:, :3]
    mapped_points = np.asarray([geolocation.auto_xyz2enh(model, *point) for point in ring])
    crs = model.by_type("IfcProjectedCRS")
    if len(crs) != 1 or crs[0].Name != config["horizontalCRS"]:
        raise ValueError("IFC map CRS does not match the roadway configuration")
    geographic = Transformer.from_crs(crs[0].Name, "EPSG:4326", always_xy=True)
    longitude, latitude = geographic.transform(mapped_points[:, 0], mapped_points[:, 1])
    area, _perimeter = Geod(ellps="WGS84").polygon_area_perimeter(longitude, latitude)
    if not math.isclose(abs(area), width * length, rel_tol=0.02):
        raise ValueError("Exported polygon area does not match the roadway width and length")
    coordinates = np.round(np.column_stack([longitude, latitude]), 9).tolist()
    if area < 0:
        coordinates.reverse()
    if coordinates[0] != coordinates[-1] or not np.isfinite(coordinates).all():
        raise ValueError("Roadway polygon is not a closed finite ring")
    with source.open("rb") as handle:
        fingerprint = hashlib.file_digest(handle, "sha256").hexdigest()
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {
                "Name": config["name"],
                "GlobalId": alignment.GlobalId,
                "SourceIfcType": alignment.is_a(),
                "SourceIFC": source.name,
                "SourceIFCSHA256": fingerprint,
                "Width_m": width,
                "Length_m": round(length, 3),
                "Area_m2": round(abs(area), 3),
                "Description": "Conceptual roadway deck corridor, not a surveyed construction-site boundary."
            },
            "geometry": {"type": "Polygon", "coordinates": [coordinates]}
        }]
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("configuration", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()
    result = extract_corridor(arguments.source, arguments.configuration)
    with arguments.output.open("x", encoding="utf-8") as handle:
        json.dump(result, handle, separators=(",", ":"))
        handle.write("\n")
    feature = result["features"][0]
    print(json.dumps({
        "output": str(arguments.output),
        "vertices": len(feature["geometry"]["coordinates"][0]),
        "lengthMetres": feature["properties"]["Length_m"],
        "widthMetres": feature["properties"]["Width_m"],
        "areaSquareMetres": feature["properties"]["Area_m2"],
        "sourceModified": False
    }))


if __name__ == "__main__":
    main()