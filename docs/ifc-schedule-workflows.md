# IFC and ArcGIS construction timelapse workflows

Start with one installation activity and a few model components. Can you pick a component, find the activity that sets its planned finish, and tell whether it was installed by the reporting date? The four workflows below take that pilot from an IFC and a planner's schedule to a stakeholder web app.

**See the example:** [Play the planned sequence][planned] or [open the Progress view][progress] on a computer or tablet. The linear demo uses a generated baseline and a simulated progress snapshot. It did **not** import that baseline from P6 or collect those installations in the field. The Field Maps workflow below is a proof of concept; the P6 workflow uses a separate, public ArcGIS Pro toolbox.

## 1. Link the planner's schedule to IFC components

1. **Get both inputs.** The planner supplies the project and activity IDs, activity names, and approved baseline start and finish dates. An [activities worksheet exported from P6][oracle-export] works; P6 is not required. The design team supplies a georeferenced IFC with a stable `GlobalId` for each component.
2. **Load them in ArcGIS Pro.** Run **Excel To Table** on a clean worksheet with one row per activity. Run **BIM File To Geodatabase** on the IFC. Keep IDs as text and dates as Date fields. Use the source IFC `GlobalId`, not `OBJECTID` or a geodatabase-generated GlobalID.
3. **Agree on the links.** The planner and BIM coordinator create a mapping table with an IFC `GlobalId` and activity ID per installation. For example, activity `A120`, “Install panels,” can appear on three rows, one for each panel. Do not guess links from names or row order. If combining projects or models, scope the IDs accordingly.
4. **Attach the dates.** In a working geodatabase, run **Validate Join** and then [**Join Field**][join-field] twice. First join the activities **to the mapping table** by activity ID to copy the dates. Then join the enriched mapping **to the component features** by IFC `GlobalId` to copy the activity ID and dates. For an installation view, select one installation milestone per component; keep other milestones in a separate related table.

**Pilot check:** Select the three panels. Each should show `A120` and its planned finish, and there should still be three features. Investigate missing or ambiguous matches before publishing. The original IFC stays unchanged.

## 2. Compare planned and field-reported progress

1. **Set up the geodatabase.** In Pro, use **Add Field** to add `CStatus` (Text, length 40) to each participating component class, or check the existing field. Keep the stable component ID and planned finish. In the geodatabase run **Create Domain** (Text, Coded Value), **Add Coded Value To Domain** once per row below, then [**Assign Domain To Field**][domain] for `CStatus` in each class. The domain controls the dropdown; **Unique Values** symbology controls the 3D colors.

   | Stored `CStatus` code | Meaning at the reporting date | 3D display |
   | --- | --- | --- |
   | `Installed` | Installation reported in the field | Green |
   | `Scheduled_10_Days` | Forecast finish in 1–10 days | Blue |
   | `Scheduled_11_to_30_Days` | Forecast finish in 11–30 days | Red-orange |
   | `Scheduled_31_Plus_Days` | Forecast finish in 31 or more days | Ghosted gray |

2. **Publish the editable pair.** In Pro, [**Share As Web Layer**][publish] with a 3D object scene layer for geometry and its **associated feature layer** for editable attributes. Grant the crew edit access and enable sync if they work offline. A standalone scene layer package is not the field-editing endpoint.
3. **Record an installation.** Configure a [Field Maps form][field-maps] with the `CStatus` dropdown and an installation date. The crew selects a component, sets `Installed`, and submits or syncs. If the mobile map cannot select the 3D geometry, use a supported point, footprint or related inspection record keyed to the same component, and configure and test how that edit reaches the component record. Matching IDs alone do not transfer edits.
4. **Compare at one cutoff.** Count planned components whose baseline finish is on or before that date. Count actual installations with a dated `Installed` report by the same date. A component is overdue if it was due but not installed by then. The three forecast buckets are **not** overdue flags. Retain dated installation records or reporting snapshots for historical comparisons.

**Pilot check:** Mark one uninstalled panel `Installed` and sync. Check its ID and date in the associated feature layer. In a field-connected Progress view, that panel should turn green and the installed count should rise by one without changing the baseline. The shipped app reads **published scene-layer statistics**: to implement this proof of concept, query and aggregate the current feature records for the view, or update the progress fields and [refresh the scene cache][cache] before relying on its totals.

## 3. Build the stakeholder dashboard in JavaScript

This is a custom **ArcGIS Maps SDK for JavaScript** app, not an ArcGIS Dashboards item. Publish the components as **3D object scene layers** in ArcGIS Online, retaining the component IDs, dates, `CStatus`, and the progress and cost attributes used by the app. Follow either row left to right:

| View | Save the web scene | Wire it into the app | Open it |
| --- | --- | --- | --- |
| Planned | Enable time on the component layers; set `webSceneId` in [the project config][config]. | [The planned page code][planned-js] connects a cumulative `TimeSlider` to the scene and updates the schedule bars. | [Planned sequence][planned] |
| Progress | Style the components by `CStatus`; set `progressWebSceneId` in the same config. | [The statistics reader][stats] reads I3S status counts and published `Prog_*` and `Fin_*` statistics. [The Progress page][progress-js] renders the progress and cost panels. | [Progress and costs][progress] |

Both pages load their `WebScene` by portal item ID into a [`SceneView`][scene-js]. For a customer project, map the layer names and fields as well as the two scene IDs. Host the app over HTTPS and share the app, scenes and source items with the same intended viewers.

**Check what the numbers mean:** The linear demo's [planned build curves][curves] use `Sched_StartDate`, not completed installations. For finish-based playback, use the planned installation finish for both layer time and chart counts. Compare published panel totals with the source data at the same reporting date.

**Live IoT is a separate input.** [ArcGIS Velocity streams][velocity] can show sensor conditions crews work in, such as wind or gas readings. They do not set a component to `Installed`. The linear demo [replays instrument observations][replay] and [models worker and vehicle counts][occupancy]; those counts are not personnel tracking.

## 4. Refresh the GIS schedule from Primavera P6

1. **Export fresh P6 XML.** Include the activity ID, dates and the agreed GIS link field. Supply a spatial feature class, for example one feature per work area with a unique link ID. The matching P6 and GIS fields may have different names, but their values and types must match.
2. **Run Sync P6 XML Schedule in Pro.** Add the public `schedule-sync-toolbox.pyt`, sign in to the target ArcGIS Online or Enterprise organization, select the **Activity** subject area and project, and select both link fields. Use **Join** for one-to-one matches. Use a **relationship class** when several activities occur at one location. A work-area activity does not prove that every IFC component there is installed.
3. **Publish, then repeat against the same item.** The first run publishes a geodatabase item and a hosted feature layer with the schedule data. For an update, use fresh XML and the **same organization, folder and hosted service title**. Run on demand or schedule the Pro tool **after** the export. A web map or app reading that service sees revised dates on refresh; the tool does not update a separate cached 3D scene or overwrite crew reports.

**Pilot check:** Change one known activity date, re-export, rerun and verify the new date on the **existing** hosted layer and in its web map. This is **file-based synchronization**, not a live P6 API connection. The [Esri article][article] and [P6 XML sample with test data][sample] document the workflow. The [toolbox README][toolbox] specifies Pro Standard or Advanced and notes that the project is no longer maintained; test it with representative data and your Pro version in staging first.

[planned]: https://dchantlos.github.io/construction-timelapse/index.html?project=linear
[progress]: https://dchantlos.github.io/construction-timelapse/progress.html?project=linear
[oracle-export]: https://docs.oracle.com/cd/G18294_01/p6help/en/7876.htm
[join-field]: https://doc.esri.com/en/arcgis-pro/latest/tool-reference/data-management/join-field.html
[domain]: https://doc.esri.com/en/arcgis-pro/latest/tool-reference/data-management/assign-domain-to-field.html
[publish]: https://doc.esri.com/en/arcgis-pro/latest/help/sharing/overview/web-scene-layer.html
[field-maps]: https://doc.esri.com/en/arcgis-field-maps/latest/prepare-maps/design-an-editable-layer.html
[cache]: https://doc.esri.com/en/arcgis-online/latest/manage-data/manage-hosted-scene-layers.html
[config]: https://github.com/dchantlos/construction-timelapse/blob/main/js/config.js
[planned-js]: https://github.com/dchantlos/construction-timelapse/blob/main/js/app.js
[stats]: https://github.com/dchantlos/construction-timelapse/blob/main/js/progress-stats.js
[progress-js]: https://github.com/dchantlos/construction-timelapse/blob/main/js/progress.js
[scene-js]: https://github.com/dchantlos/construction-timelapse/blob/main/js/scene.js
[curves]: https://github.com/dchantlos/construction-timelapse/blob/main/js/dashboard.js
[velocity]: https://github.com/dchantlos/construction-timelapse/blob/main/js/velocity-live.js
[replay]: https://github.com/dchantlos/construction-timelapse/blob/main/js/linear-feed-source.mjs
[occupancy]: https://github.com/dchantlos/construction-timelapse/blob/main/js/linear-site-activity.mjs
[article]: https://www.esri.com/en-us/industries/blog/articles/synchronizing-construction-schedules-to-arcgis-enterprise-and-arcgis-online
[sample]: https://github.com/Esri/schedule-sync/tree/main/example-workflows/Sync%20P6%20XML%20Schedule%20Workflow
[toolbox]: https://github.com/Esri/schedule-sync
