# Roadway Construction Feeds for ArcGIS Velocity

Seven synthetic instrument feeds for the Marina Bay roadway. These are CSV inputs for **Velocity HTTP Simulator**, not browser-generated readings. Nothing in this folder connects sensors to the website or creates a Velocity service automatically.

## Choose a Feed

Each link below is the raw CSV URL to paste into HTTP Simulator. Start with **traffic**, **paving**, or **runoff** for an easily visible demonstration; add geotechnical and concrete monitoring when you want to explain those workflows.

| Feed | What it represents | Main measurement fields | Raw CSV |
| --- | --- | --- | --- |
| Settlement | Survey/settlement instruments at the two approach embankments | `Settlement_mm`, `SettlementRate_mm_h` | [Settlement CSV](https://raw.githubusercontent.com/dchantlos/construction-timelapse/main/docs/velocity/linear/velocity_linear_settlement_feed.csv) |
| Groundwater | Piezometers supporting excavation, dewatering, and embankment monitoring | `PorePressure_kPa`, `PressureChange_kPa`, `TipDepth_m` | [Groundwater CSV](https://raw.githubusercontent.com/dchantlos/construction-timelapse/main/docs/velocity/linear/velocity_linear_groundwater_feed.csv) |
| Vibration | Triaxial geophones at receptors near foundation works | `PPV_X_mm_s`, `PPV_Y_mm_s`, `PPV_Z_mm_s`, `PPV_Max_mm_s`, `DominantFrequency_Hz` | [Vibration CSV](https://raw.githubusercontent.com/dchantlos/construction-timelapse/main/docs/velocity/linear/velocity_linear_vibration_feed.csv) |
| Concrete | Core and surface thermocouples in two deck pours | `CoreTemp_C`, `SurfaceTemp_C`, `TempDifference_C`, `AgeHours` | [Concrete CSV](https://raw.githubusercontent.com/dchantlos/construction-timelapse/main/docs/velocity/linear/velocity_linear_concrete_feed.csv) |
| Runoff | Water-quality and level instruments at temporary drainage/treatment outlets | `Turbidity_NTU`, `pH`, `WaterDepth_m`, `Flow_L_s` | [Runoff CSV](https://raw.githubusercontent.com/dchantlos/construction-timelapse/main/docs/velocity/linear/velocity_linear_runoff_feed.csv) |
| Paving | GNSS-equipped rollers with infrared surface temperature and a compaction index | `SurfaceTemp_C`, `RollerSpeed_kmh`, `PassCount`, `RollerCMV`, `CompactionValid` | [Paving CSV](https://raw.githubusercontent.com/dchantlos/construction-timelapse/main/docs/velocity/linear/velocity_linear_paving_feed.csv) |
| Traffic | Radar/camera-derived traffic observations at work-zone approaches | `MeanSpeed_kmh`, `QueueLength_m`, `VehicleCount_1min` | [Traffic CSV](https://raw.githubusercontent.com/dchantlos/construction-timelapse/main/docs/velocity/linear/velocity_linear_traffic_feed.csv) |

There are **two tracks per feed**, one for each work front, and **2,880 records per CSV**. All seven CSVs together contain 20,160 observations. Each file is below 0.5 MB, well below HTTP Simulator's documented 16 MB limit.

Weather and regional air quality are intentionally not simulated in these files. Continue using Open-Meteo for those. Workers and site vehicles are also excluded; the site's modeled occupancy counts are different from traffic passing a roadway detector.

## HTTP Simulator Settings

In Velocity, create a new feed, choose **HTTP Simulator**, and use the raw URL for one CSV.

| Setting | Value |
| --- | --- |
| URL or file path | The full raw CSV URL from the table above |
| Authentication | None for these public GitHub files |
| Field separator | Comma |
| Header | First row contains field names |
| Features per execution | **2** |
| Interval for sending events | **1000 milliseconds** for accelerated replay |
| Repeat simulation | **Enabled** |
| Time field index | **0**: `Timestamp` is the first column |
| Convert to current time | **Enabled** |
| Start-time field | `Timestamp`, numeric epoch milliseconds |
| Date format | **Epoch milliseconds**, not Epoch seconds or Other (string) |
| End-time field | None / leave unset |
| Track ID field | `TrackID`, String |
| Location type | **X/Y fields**, producing point geometry |
| X field | `Longitude` |
| Y field | `Latitude` |
| Spatial reference | **Web Mercator, EPSG:3857 / WKID:102100** |
| Z field | **`Elevation_m` for paving and concrete**; none for the other five feeds |
| Z units | **Metres** for the two Z-enabled feeds |
| M (measure) field | **None / leave unset for all seven feeds** |

**The names `Longitude` and `Latitude` follow the existing vertical CSVs, but their values are Web Mercator metres, NOT geographic degrees. Do not select EPSG:4326.** Coordinates are approximately X 11.56 million and Y 144 thousand. Using degrees would place the data incorrectly or reject the features.

The source data describes 24 hours at one-minute cadence, starting at 07:00 Singapore time. At 2 records every second, you replay one source minute per second and the full file takes **24 minutes**. Use **60000 milliseconds** instead for one source minute per real minute. Start with 1000 for a presentation.

`Timestamp` is rewritten to current time by the simulator. `ScenarioTimestamp` preserves the original sequence time and should remain a normal numeric attribute, not the start-time field. Repeating the file restarts the construction scenario, including concrete age and settlement baseline movement; it is not a continuous engineering history.

On the schema screen, check numeric fields have not been imported as text. [feed-manifest.json](feed-manifest.json) lists every field and its type for each feed. It is a reference, not an automatic Velocity deployment template.

## Z and M Checklist

| Feed | Does the data have Z? | Z (altitude) field | Z units | Does the data have M? |
| --- | --- | --- | --- | --- |
| Paving | Yes | `Elevation_m` | Metres | No |
| Concrete | Yes | `Elevation_m` | Metres | No |
| Settlement | No | None | Not applicable | No |
| Groundwater | No | None | Not applicable | No |
| Vibration | No | None | Not applicable | No |
| Runoff | No | None | Not applicable | No |
| Traffic | No | None | Not applicable | No |

**Lowercase `_m` in a field name means metres; it does not mean geometry M.** `Elevation_m` provides Z altitude. `Chainage_m` remains an ordinary distance-along-road attribute in every feed. These feeds are positioned using X/Y (and optionally Z), not a calibrated linear-referencing route. Leave the M (measure) selector and any route/measure mappings unset for this setup.

## Confirm Schema

Select **Delimited**, delimiter **comma**, and **Has header row = Yes**. Click **Derive schema** before correcting the field types; deriving again can reset manual choices. Keep the supplied column names.

| Fields | Type to confirm |
| --- | --- |
| `Timestamp`, `ScenarioTimestamp` | Int64 |
| `SensorID`, `TrackID`, `WorkFront`, `Quality`, state/category fields, `ReferenceID`, `PourID` when present | String |
| `Longitude`, `Latitude`, `Chainage_m`, `Elevation_m` when present | Float64 |
| `IsSimulated`, `Window_s`, `PassCount`, `CompactionValid`, `VehicleCount_1min` when present | Int32 |
| Other sensor measurement fields | Float64 |

In **Identify key fields**, set Location to **X/Y fields**, set X/Y and WKID as above, and use the Z/M checklist. Under **Date and time**, choose **Epoch milliseconds**, start time **Timestamp**, and no end time. Under **Tracking**, select **TrackID**. Keep `ScenarioTimestamp` as an attribute, not the time used for replay. No separate HTTP polling schedule is needed: the simulator's sending interval controls the replay.

Give each feed a distinct name, such as `MBE_Linear_Paving_Sim` or `MBE_Linear_Concrete_Sim`. Save, start, and inspect the received data before using it in an analytic.

## Elevation on the Roadway

The **paving** and **concrete** CSVs include `Elevation_m` (Float64). Use this field for geometry Z when configuring the feed, retain Z through the analytic/output, and display its scene layer using **absolute height**, not on-the-ground or relative-to-ground. Keep the layer's additional elevation offset at zero: the supplied values already contain the intended position.

- **Paving rollers:** the asphalt surface was sampled from the source IFC at every distinct roller X/Y. The field includes an assumed **2 m antenna mounting height** above that surface. Heights vary along the ramps: approximately 17.881-25.788 m on the West track and 16.298-24.386 m on the East track.
- **Concrete probes:** the positions are at mid-depth inside the intersected deck slabs: **25.235 m West** and **25.042 m East**. Core and surface temperature measurements share the core probe's map location. Use a symbol callout or a slice to inspect an embedded probe rather than changing its data elevation just to make it visible.
- **Other feeds:** the existing ground/receptor stations remain X/Y-only. Display them on the terrain; do not assign the roadway's deck height to groundwater, runoff, or off-road monitoring locations. `TipDepth_m` is still an attribute describing a buried piezometer, not geometry Z.

The published progress scene uses Web Mercator with **EGM96 metre heights**. These Z values use the IFC's existing map-converted heights, already aligned numerically to that demonstration scene. They are model-derived demo coordinates, not survey-certified elevations or a newly performed vertical-datum transformation.

The raw URLs have not changed. **If you created the paving or concrete feed using the earlier X/Y-only CSV, re-sample/reconfigure its schema to include `Elevation_m` and set geometry Z.** Recreate the feed/output if its saved geometry schema cannot be updated. Merely restarting an old two-dimensional feed will not add Z. Check that received geometry includes `z`, not just an elevation attribute, before connecting a stream service to the website.

## Shared Fields

| Field | Meaning and type |
| --- | --- |
| `Timestamp` | Int64 epoch milliseconds; mark as start time |
| `SensorID` | Readable String instrument ID, prefixed `LIN-` |
| `TrackID` | Stable String ID; use for all observations from the same instrument |
| `Longitude`, `Latitude` | Float64 Web Mercator X/Y in metres |
| `Chainage_m` | Float64 distance along the roadway; rollers move within their work sections |
| `WorkFront` | String: `West` or `East` |
| `Quality` | String data flag; the supplied synthetic records are `Good` |
| `IsSimulated` | Int32, always `1`; retain it through analytics and outputs |
| `ScenarioTimestamp` | Int64 original scenario time; do not replace it during replay |

The locations follow the conceptual roadway alignment. Fixed geotechnical points identify monitoring stations; `TipDepth_m` is an attribute, not an absolute Z coordinate. Exact mount heights, survey benchmarks, and real instrument locations require project information. The traffic points are illustrative work-zone approaches, not surveyed locations on a real traffic lane.

## Check Each Feed Before Using It

1. Preview the schema and map. Confirm the points are in Marina Bay, Singapore.
2. Start the feed and confirm two different `TrackID` values arrive at each replay tick.
3. Check `Timestamp` is current and `ScenarioTimestamp` retains the source date.
4. Watch for changes: traffic queues grow and speeds fall; runoff responds to a rainfall episode; concrete warms then cools; rollers move along short sections and pause during a modeled weather hold.
5. Retain `IsSimulated` and confirm numeric units. Do not sum different measurements into one value.
6. Set sharing to the intended audience. A public source CSV does not make your Velocity service public automatically.
7. For paving/concrete, confirm the stream geometry retains Z and the scene displays it at absolute height. Check the rollers at both ends of their ramp tracks, not just at one position.

The feed can be consumed as a stream layer. Add a real-time analytic and a **Stream Layer output** when you need processing before display, and a feature-layer output if you need a stored observation history. Configure outputs according to your organization's Velocity subscription and retention requirements.

After you have working hosted services, provide the **StreamServer URLs** and the intended authentication/sharing method for website integration. Do not put write-endpoint credentials or tokens in the browser. No website sensor connection is included in this data publication.

## Measurement Meanings

- **Settlement:** downward movement from an assumed reference. The rate is expressed in millimetres per hour. Actual monitoring needs stable survey control and approved movement criteria.
- **Groundwater:** pore-water pressure and its change from an assumed baseline, in kPa. This is not a directly measured water-table elevation; tip elevation and instrument corrections matter.
- **Vibration:** maximum-axis peak particle velocity over a 60-second reporting window, plus a representative dominant frequency. This is not sound level or a raw vibration waveform. Real equipment samples much faster and can send window summaries to Velocity while preserving waveform records elsewhere.
- **Concrete:** core/surface temperature, their difference, and elapsed pour age. Temperature alone does not certify strength or authorize formwork removal. No invented MPa or strength percentage is included.
- **Runoff:** turbidity in NTU is not total suspended solids in mg/L. Turbidity-to-TSS conversion requires site-specific sampling/calibration. Neither these values nor their states demonstrate discharge compliance.
- **Paving:** `RollerCMV` is a dimensionless, illustrative compaction measurement value, not density or percent compaction. Use `CompactionValid = 1` for compaction analyses; the zero values during `Idle` and `Weather_Hold` are not accepted compaction measurements. Pass counts represent repeated short demonstration rolling cycles, not an acceptance map.
- **Traffic:** vehicle count is the number passing a detector during one source minute, not the number of vehicles on the construction site. With accelerated replay, it still represents a source minute, not a real elapsed second.

The states such as `Settling`, `Warming`, `Queueing`, and `Weather_Hold` describe the synthetic scenario. They are not safety thresholds, regulatory limits, automated construction instructions, or evidence of schedule/cost impact. Project specialists must define any warning rules and confirm instrument suitability before use with real work.

## Generation and Verification

The generator runs locally with Node.js and no additional packages:

```text
node --test docs/velocity/linear/feeds.test.mjs
node docs/velocity/linear/generate_feeds.mjs
```

It is deterministic: the same source generates the same CSV bytes. It preserves identical existing files and refuses to overwrite a changed dataset by default. For an intentional source/schema update, use `node docs/velocity/linear/generate_feeds.mjs --update`; this first checks each changed CSV against its previous manifest hash and refuses to replace an externally edited file. The manifest records SHA-256 hashes, schema, source cadence, sensor IDs, and each feed's Z field/elevation mode.

[elevation-controls.json](elevation-controls.json) records the 12 checked model surface intersections, source IFC identifiers, mounting offsets, and model SHA-256. [extract_elevations.py](extract_elevations.py) creates those controls using IfcOpenShell, NumPy, and pyproj: it reads unique feed positions as a JSON array from standard input and accepts `--model` and `--output` paths. It does not modify the IFC. CSV generation on GitHub uses the checked controls and needs no IFC or Python installation. Changing a roller path or probe X/Y requires re-sampling; unknown positions are rejected rather than given a guessed elevation.

The data-only GitHub workflow tests the generator and publishes only this folder's CSVs and manifest. It does not publish local website edits, change the vertical feeds, or create Velocity services.

## References

- [Esri: HTTP Simulator](https://doc.esri.com/en/arcgis-velocity/latest/ingest/simulator.html): timestamp/track sorting, features per execution, replay time, and file limits.
- [Esri: Configure input data](https://doc.esri.com/en/arcgis-velocity/latest/ingest/configure-input-data.html): schema, geometry, and key fields.
- [Esri: Visualize stream or feature layers](https://doc.esri.com/en/arcgis-velocity/latest/visualize/visualize-stream-or-feature-layers.html).
- [FHWA: Bridge substructure monitoring](https://www.fhwa.dot.gov/publications/research/infrastructure/structures/bridge/09040/index.cfm): instrumentation for construction and longer-term monitoring. This is an archived research reference, not a current specification.
- [FHWA: Intelligent compaction](https://www.fhwa.dot.gov/pavement/ic/): roller monitoring and compaction measurement values.
- [GEOKON: Piezometers](https://www.geokon.com/Piezometers): examples of instruments measuring pore-water pressure. This is a manufacturer reference, not a product endorsement.

These references establish the types of monitoring and the ingestion workflow. **The CSV measurements themselves are entirely synthetic, not copied from those organizations or sourced from a live sensor network.**
