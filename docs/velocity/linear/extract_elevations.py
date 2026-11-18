import argparse
import hashlib
import json
import sys
from pathlib import Path

import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.util.geolocation as geolocation
from ifcopenshell.util.unit import calculate_unit_scale
import numpy as np
from pyproj import Transformer


def vertical_intersections(triangles, position):
    first = triangles[:, 0]
    along = triangles[:, 1] - first
    across = triangles[:, 2] - first
    determinant = along[:, 0] * across[:, 1] - along[:, 1] * across[:, 0]
    usable = np.abs(determinant) > 1e-10
    first, along, across, determinant = first[usable], along[usable], across[usable], determinant[usable]
    relative = np.asarray(position) - first[:, :2]
    weight_along = (relative[:, 0] * across[:, 1] - relative[:, 1] * across[:, 0]) / determinant
    weight_across = (along[:, 0] * relative[:, 1] - along[:, 1] * relative[:, 0]) / determinant
    inside = (weight_along >= -1e-7) & (weight_across >= -1e-7) & (weight_along + weight_across <= 1 + 1e-7)
    return (first[:, 2] + weight_along * along[:, 2] + weight_across * across[:, 2])[inside]


def extract(model_path, requests):
    model = ifcopenshell.open(str(model_path))
    if not np.isclose(calculate_unit_scale(model), 1.0):
        raise ValueError('The source IFC must use metres')
    conversions = model.by_type('IfcMapConversion')
    if len(conversions) != 1:
        raise ValueError('Expected one explicit IFC map conversion')
    horizontal_crs = conversions[0].TargetCRS.Name
    transformer = Transformer.from_crs(3857, horizontal_crs, always_xy=True)
    settings = ifcopenshell.geom.settings()
    settings.set(settings.USE_WORLD_COORDS, True)
    surfaces = {}
    for entity_type in ('IfcCourse', 'IfcSlab'):
        meshes = []
        for entity in model.by_type(entity_type):
            shape = ifcopenshell.geom.create_shape(settings, entity)
            vertices = np.asarray(shape.geometry.verts, dtype=float).reshape(-1, 3)
            triangles = vertices[np.asarray(shape.geometry.faces, dtype=int).reshape(-1, 3)]
            meshes.append((entity, triangles, vertices[:, :2].min(axis=0), vertices[:, :2].max(axis=0)))
        surfaces[entity_type] = meshes
    samples = []
    for request in requests:
        feed = request['feed']
        if feed not in ('paving', 'concrete'):
            raise ValueError(f'Unexpected elevated feed: {feed}')
        east, north = transformer.transform(request['Longitude'], request['Latitude'])
        local_x, local_y, _ = geolocation.auto_enh2xyz(model, east, north, 0)
        position = np.array([local_x, local_y])
        entity_type = 'IfcCourse' if feed == 'paving' else 'IfcSlab'
        matches = []
        for entity, triangles, minimum, maximum in surfaces[entity_type]:
            if np.any(position < minimum - 1e-6) or np.any(position > maximum + 1e-6):
                continue
            heights = vertical_intersections(triangles, position)
            if len(heights):
                matches.append((float(heights.max()), float(heights.min()), entity))
        if not matches:
            raise ValueError(f"No {entity_type} intersects {request['SensorID']} at {request['Longitude']}, {request['Latitude']}")
        top, bottom, entity = max(matches, key=lambda match: match[0])
        thickness = top - bottom
        expected_thickness = 0.1 if feed == 'paving' else 0.45
        if abs(thickness - expected_thickness) > 0.005:
            raise ValueError(f'Unexpected {entity_type} thickness at {request}: {thickness}')
        surface_top = float(geolocation.auto_xyz2enh(model, local_x, local_y, top)[2])
        surface_bottom = float(geolocation.auto_xyz2enh(model, local_x, local_y, bottom)[2])
        offset = 2.0 if feed == 'paving' else -(surface_top - surface_bottom) / 2
        samples.append({
            'feed': feed, 'SensorID': request['SensorID'], 'Longitude': request['Longitude'], 'Latitude': request['Latitude'],
            'SurfaceTop_m': round(surface_top, 4), 'SurfaceBottom_m': round(surface_bottom, 4),
            'VerticalOffset_m': round(offset, 4), 'Elevation_m': round(surface_top + offset, 3),
            'IfcType': entity.is_a(), 'GlobalId': entity.GlobalId, 'Name': entity.Name,
        })
    if not samples:
        raise ValueError('No sensor positions were supplied')
    return {
        'sourceModel': model_path.name, 'sourceSha256': hashlib.sha256(model_path.read_bytes()).hexdigest(),
        'ifcSchema': model.schema_identifier, 'sourceHorizontalCRS': horizontal_crs, 'outputHorizontalCRS': 3857,
        'heightUnit': 'metre', 'sceneHeightReference': 'EGM96_height',
        'verticalReferenceNote': 'Uses the IFC map-converted heights already aligned numerically to the demonstration scene; not a surveyed EGM96 transformation.',
        'pavingPlacement': 'Asphalt surface plus an assumed 2.0 m roller antenna mounting height.',
        'concretePlacement': 'Mid-depth of the intersected IfcSlab; core and surface temperature channels share this core-probe display location.',
        'method': 'Vertical intersection with actual tessellated IfcCourse or IfcSlab geometry at each unique existing feed XY. No nearest-point fallback or extrapolation.',
        'samples': sorted(samples, key=lambda sample: (sample['feed'], sample['SensorID'], sample['Longitude'], sample['Latitude']))
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    arguments = parser.parse_args()
    result = extract(arguments.model, json.load(sys.stdin))
    content = json.dumps(result, indent=2) + '\n'
    if arguments.output.exists():
        if arguments.output.read_text(encoding='utf-8') != content:
            raise ValueError('Existing elevation controls differ; review before replacing them')
    else:
        with arguments.output.open('x', encoding='utf-8', newline='\n') as output:
            output.write(content)
    print(json.dumps({'verifiedPositions': len(result['samples']), 'sourceSha256': result['sourceSha256'],
                      'sensors': {sensor_id: [sample['Elevation_m'] for sample in result['samples'] if sample['SensorID'] == sensor_id]
                                  for sensor_id in sorted({sample['SensorID'] for sample in result['samples']})}}, indent=2))


if __name__ == '__main__':
    main()
