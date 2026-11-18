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

| Setting | Value for every CSV in this folder |
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
| Track ID field | `TrackID`, String |
| X field | `Longitude` |
| Y field | `Latitude` |
| Spatial reference | **Web Mercator, EPSG:3857 / WKID:102100** |
| Z field | None |

**The names `Longitude` and `Latitude` follow the existing vertical CSVs, but their values are Web Mercator metres, NOT geographic degrees. Do not select EPSG:4326.** Coordinates are approximately X 11.56 million and Y 144 thousand. Using degrees would place the data incorrectly or reject the features.

The source data describes 24 hours at one-minute cadence, starting at 07:00 Singapore time. At 2 records every second, you replay one source minute per second and the full file takes **24 minutes**. Use **60000 milliseconds** instead for one source minute per real minute. Start with 1000 for a presentation.

`Timestamp` is rewritten to current time by the simulator. `ScenarioTimestamp` preserves the original sequence time and should remain a normal numeric attribute, not the start-time field. Repeating the file restarts the construction scenario, including concrete age and settlement baseline movement; it is not a continuous engineering history.

On the schema screen, check numeric fields have not been imported as text. [feed-manifest.json](feed-manifest.json) lists every field and its type for each feed. It is a reference, not an automatic Velocity deployment template.

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

It is deterministic: the same source generates the same CSV bytes. It preserves identical existing files and refuses to overwrite a changed dataset. The manifest records SHA-256 hashes, schema, source cadence, and sensor IDs. Review any future change to a generated file before replacing it.

The data-only GitHub workflow tests the generator and publishes only this folder's CSVs and manifest. It does not publish local website edits, change the vertical feeds, or create Velocity services.

## References

- [Esri: HTTP Simulator](https://doc.esri.com/en/arcgis-velocity/latest/ingest/simulator.html): timestamp/track sorting, features per execution, replay time, and file limits.
- [Esri: Configure input data](https://doc.esri.com/en/arcgis-velocity/latest/ingest/configure-input-data.html): schema, geometry, and key fields.
- [Esri: Visualize stream or feature layers](https://doc.esri.com/en/arcgis-velocity/latest/visualize/visualize-stream-or-feature-layers.html).
- [FHWA: Bridge substructure monitoring](https://www.fhwa.dot.gov/publications/research/infrastructure/structures/bridge/09040/index.cfm): instrumentation for construction and longer-term monitoring. This is an archived research reference, not a current specification.
- [FHWA: Intelligent compaction](https://www.fhwa.dot.gov/pavement/ic/): roller monitoring and compaction measurement values.
- [GEOKON: Piezometers](https://www.geokon.com/Piezometers): examples of instruments measuring pore-water pressure. This is a manufacturer reference, not a product endorsement.

These references establish the types of monitoring and the ingestion workflow. **The CSV measurements themselves are entirely synthetic, not copied from those organizations or sourced from a live sensor network.**
