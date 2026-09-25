# AI Site Analyst — ArcGIS AI assistant

A custom **ArcGIS AI assistant** ([ArcGIS AI components](https://developers.arcgis.com/javascript/latest/references/arcgis-ai-components/), beta) embedded in the *Simulated Construction Progress* page ([`progress.html`](../progress.html)). It reasons over the site's live **ArcGIS Velocity** IoT feeds and connects them to the 4D schedule and 5D cost dashboard — answering safety, trend and business-impact questions in plain language.

Open it from the **AI Site Analyst** launcher (bottom-right) on `progress.html`.

## What it can answer

- **Current conditions & air quality** — wind, harmful gases (CO, CO₂, NO₂, O₃, VOCs, CH₄), dust (PM10), noise, temperature, humidity, AQI.
- **Tower-crane wind safety** — live crane-apex wind vs the **20 m/s stand-down** / **12 m/s caution** limits.
- **Harmful-gas safety** — the multi-gas panel vs watch / caution / hazard thresholds.
- **Whole-day trends & patterns** — min / max / average, peak time of day, rising / falling / steady.
- **Crane lift-window forecasting** — spans where the mean wind stays below the caution limit.
- **IoT → schedule → cost impact** — wind-driven crane downtime → days behind → liquidated-damages penalty.
- **Environmental cost attribution** — wind stand-downs, gas evacuations and heat holds itemised in USD.

All cost figures are formatted to match the **Financials (5D)** tab exactly (same source data, same `$X,XXX` formatting).

## Architecture

- Built with the ArcGIS AI components **agent utilities** — `LLMAgent` + `FunctionTool` + [Zod](https://zod.dev/) — as a **custom agent** (not the out-of-the-box data-exploration agent), so its tools read the app's real feed directly instead of a published feature layer.
- Tools return **real readings only** — the model never invents a value.
- ArcGIS AI components require a bundler, so this is a self-contained **[Vite](https://vitejs.dev/)** sub-project that builds into [`../assistant/`](../assistant) for the parent app (which is served with no build step on GitHub Pages).

### Source files (`src/`)

| File | Role |
| --- | --- |
| `agent.ts` | The custom **Site Conditions** agent — system prompt, orchestrator description, and the 7 `FunctionTool`s. |
| `feed.ts` | Real data layer — reads the repo's sample Velocity CSVs (`docs/velocity/…`) plus live [Open-Meteo](https://open-meteo.com/) (temp / humidity / AQI). Thresholds mirror [`js/velocity.js`](../js/velocity.js). |
| `assistant.ts` | Builds the `<arcgis-assistant>` element (heading, entry message, suggested prompts) and mounts the custom agent. |
| `embed.ts` | `mountSiteConditions()` — the right-side drawer + deferred popup OAuth sign-in (the entry built by `build:embed`). |
| `main.ts` | Standalone dev entry (`index.html`). |
| `config.ts` | Portal URL, OAuth Client ID, site location, sensor markers, and the reference web-map id. |

### The 7 tools

| Tool | Purpose |
| --- | --- |
| `getSiteConditions` | Current wind / gas / dust / noise + live weather & AQI. |
| `assessCraneSafety` | Crane-apex wind & gust vs the 20 m/s stand-down limit. |
| `assessGasSafety` | Multi-gas panel vs watch / caution / hazard thresholds. |
| `analyzeConditionTrends` | Whole-day time-series: min / max / avg / peak time / trend. |
| `forecastCraneLiftWindows` | Recommended safe lift windows + day peak wind/gust. |
| `analyzeScheduleCostImpact` | Wind hours lost → days behind → delay penalty & CPI/SPI (USD). |
| `analyzeEnvironmentalImpact` | Itemised environmental costs — wind/heat/gas — matching the Financials tab (USD). |

### The `window.CT3D` bridge

The parent app ([`js/ai-bridge.js`](../js/ai-bridge.js)) exposes a small **read-only** `window.CT3D` surface so the agent can read live dashboard figures without touching the 3D scene:

- `getProgressSummary()` — live schedule slippage (days behind, components behind).
- `financials` — the 5D `FINANCIALS` (contract value, liquidated damages, CPI / SPI, …).
- `getEnvironmentalRisk()` — the `ENVIRONMENTAL_RISK` breakdown, the **single source of truth** shared with the Financials "Environmental Sensor Risk" card and its drill-down.

Both `FINANCIALS` and `ENVIRONMENTAL_RISK` live in [`js/config.js`](../js/config.js), so the assistant's numbers and the dashboard can never drift apart.

## Develop

```bash
cd ai
npm install
npm run dev        # standalone dev app at http://localhost:5173
npm run typecheck  # tsc --noEmit
```

Pinned versions (see `package.json`): `@arcgis/ai-components` `@arcgis/core` `@arcgis/map-components` `5.1.25`, `@esri/calcite-components` `^5.1.1`, `zod` `^4.6.5`, `vite` `^7`.

## Build into the Pages app

```bash
npm run build:embed   # → ../assistant/  (site-conditions.js stub + chunks/ + assets/)
```

- The heavy bundle is only fetched when the user clicks the launcher: [`js/site-conditions-widget.js`](../js/site-conditions-widget.js) lazy-imports `../assistant/site-conditions.js`.
- Because the parent app has no build step, the contents of `../assistant/` **must be committed** for GitHub Pages.
- Bump the `?v=` cache-busting query on the widget import + script tag when you rebuild.

## ArcGIS Online setup (one-time)

The agent's **data** needs nothing published, but the `<arcgis-assistant>` component itself requires:

1. **Enable AI assistants** in the ArcGIS Online org (and make sure beta apps aren't blocked).
2. Create an **OAuth credentials** developer item — *user authentication (PKCE), no client secret*. Add redirect URIs (`http://localhost:5173`, `http://localhost:8080`, and the Pages origin), then copy the **Client ID**.
3. `cp .env.example .env.local` and paste `VITE_ARCGIS_OAUTH_APP_ID`. Set `VITE_PORTAL_URL` to the org URL for a SAML / enterprise org.
4. A **web map you own with AI vector embeddings generated** (Item → Settings → *Manage AI vector embeddings* → *Generate*). The assistant orchestrator requires this to answer; its id is `WEBMAP_ID` in `src/config.ts`. The custom agent's tools don't use the map's data.

> The OAuth **Client ID is a public PKCE client** — it is designed to live in browser code, so it is baked into the committed bundle. There is **no client secret**.

Sign-in is **deferred** — triggered only on first launcher click — and uses a **popup** relayed by [`../oauth-callback.html`](../oauth-callback.html) (avoids a redirect race with the parent app's own ArcGIS identity manager).
