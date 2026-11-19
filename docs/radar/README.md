# Roadway Rain Radar

The linear progress page displays actual NEA radar imagery over Esri Dark Gray Canvas. It does not substitute rainfall-station points or forecast precipitation for radar.

## Data and Display

- Official dataset: [NEA Weather Radar Images API](https://data.gov.sg/datasets/d_418e9ac3414fd927b7405631e0a7bc82/view).
- Endpoint: `https://api-open.data.gov.sg/v2/real-time/api/weather-radar-images/70km`.
- NEA / data.gov.sg attribution and the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence) link are visible in the panel. The dataset is Beta.
- The client displays the latest image first, then loads a bounded two-hour history, including the previous Singapore day around midnight. The normal observation cadence is five minutes.
- Presigned PNG URLs stay in memory. No API key is embedded. Requests and decoding were verified from the local browser; public deployments must respect provider rate limits.
- Failed updates retain only usable cached frames with an appropriate status. Expired URLs are discarded, and delayed observations are not labeled current.
- Playback, frame selection, Latest, opacity, project Locate, Singapore extent, full radar coverage, and zoom controls are provided. Playback pauses when hidden.

The MediaLayer uses the API's EPSG:4326 bounding box through `ExtentAndRotationGeoreference`. Projection metadata is validated as Azimuthal Equidistant, but image pixels are not independently reprojected before display. The observed 480-by-480 image spans a 70 km radius. Closer zoom does not increase radar resolution or establish rainfall at a particular structure. Radar can contain non-rain echoes; it is not a forecast or construction safety clearance.

## Dark Basemap

[Esri Dark Gray Canvas](https://www.arcgis.com/home/item.html?id=e6b230fe483b43f390a7e767731d52d6) supplies muted roads and street labels behind the rain imagery. It uses the same public vector style as the application's existing dark basemap. The radar colors are unchanged, while the map controls, loading background and attribution strip use matching dark colors. Basemap service credits remain visible. Only the radar inset changes; the main 3D scene is unchanged.

## Project Footprint

[roadway-corridor.geojson](roadway-corridor.geojson) contains one polygon derived from the existing IFC's curved `IfcAlignment` and 20 m deck width. It is a conceptual deck footprint, not a surveyed construction-site, property, or right-of-way boundary.

- Length: 1,537.597 m; width: 20 m; geodesic area: 30,751.664 square metres.
- Closed ring: 773 vertices. Source IFC SHA-256 and alignment `GlobalId` are retained.
- A blue outline, white halo and translucent blue fill distinguish it from the radar colors. The project name appears in the panel title, "Marina Bay East Roadway", with no project text label over the map. Geometry is unchanged by this styling.
- Opening and Locate center on the project at zoom 12; manual zoom is limited to 14.

[extract_roadway_corridor.py](extract_roadway_corridor.py) samples the existing IFC alignment at intervals no greater than four metres, offsets to the deck edges, applies IFC placement/map conversion, and exports longitude/latitude. It checks units, CRS, ring closure, and area against width times length. It does not modify or regenerate the IFC and refuses to overwrite an output. Use the existing project Python environment with IfcOpenShell, NumPy, and pyproj:

```text
python docs/radar/extract_roadway_corridor.py "path/to/Marina Bay Elevated Roadway - ArcGIS.ifc" "path/to/roadway-config.json" "path/to/new-corridor.geojson"
```

## Validation

```text
node --test tests/linear-radar.test.mjs tests/linear-radar-corridor.test.mjs tests/linear-weather.test.mjs tests/linear-conditions.test.mjs
```

Browser checks cover rendered radar pixels changing between frames, a fixed project polygon, real pointer playback and Locate controls, and nonblank maps at desktop, 390 px and 320 px widths. The dark basemap, road-label styles, blue project outline and unchanged title were checked in the browser. The existing weather/occupancy panel is preserved; the rejected rainfall-station prototype is not imported.