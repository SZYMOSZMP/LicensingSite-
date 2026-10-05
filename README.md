# Xkixos Licensing

Self-hosted license keys for Minecraft plugins (and any other software). It's private: a single owner account, no payments.

- **Plugins and license keys**: max servers per key, expiry dates, enable/disable, notes.
- **Signed license checks**: RSA-SHA256 signature and a one-time nonce on every answer, so they can't be faked or replayed.
- **Live server tracking**: heartbeats every 30s show how many servers are online for each key.
- **IP blacklist**, **check log** and **analytics** chart.
- **BuiltByBit**: keys are baked into every download using an External license key placeholder.
- **Polymart (Voxel Shop)**: purchases are verified with Polymart on first startup.
- **Tebex**: keys are emailed on purchase; refunds and chargebacks disable the key.
- **REST API** with API keys.
- **Public license checker** for buyers at `/check`.
- **Guides** inside the dashboard. Code samples use your own site address and plugin ID.
- **A single Java class** to drop into your plugin. You download it from the dashboard with your URL and key already filled in.

## Running it

Requires Node.js 20 or newer.

```bash
npm install
npm run build
npm start          # http://localhost:3000
```

Open the site and log in at `/login` with your password (the default is `Je!onek23` — set `OWNER_PASSWORD` to change it, or change it later in Dashboard → Settings). The dashboard stays logged in for 30 days, so you don't have to sign in every visit. For development with hot reload, use `npm run dev`.

### Settings (environment variables)

Copy `.env.example` to `.env` or set these in your host's panel:

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port the site listens on. |
| `PUBLIC_URL` | `http://localhost:PORT` | Your public https address. Can also be set in Dashboard → Settings, which takes priority. |
| `TRUST_PROXY` | `false` | Set to `true` only behind a reverse proxy (Caddy, Nginx, Cloudflare) so the real server IP is read from `X-Forwarded-For`. |
| `DATA_DIR` | `./data` | Where the SQLite database and the signing key are stored. |
| `OWNER_PASSWORD` | `Je!onek23` | The password that protects the dashboard. An owner account is created automatically on first run; log in with this at `/login`. Change it later in Dashboard → Settings. |
| `OWNER_USERNAME` | `owner` | Username for the auto-created owner account (login only needs the password). |

**Back up the `data` folder.** It holds every license and the private signing key. If you lose the key, every plugin you've built has to be rebuilt with the new one.

## Adding it to a plugin

1. In the dashboard, create a plugin. You get an 8-character ID.
2. On the plugin's page, click **Download XkixosLicense.java** and put it in your project.
3. At the top of `onEnable`:

```java
if (!XkixosLicense.validateKey(this, "yourPluginId")) {
    getServer().getPluginManager().disablePlugin(this);
    return;
}
```

Buyers paste their key into `plugins/YourPlugin/license.txt`. BuiltByBit and Polymart downloads already have the key inside the jar.

The class works on Spigot, Paper and Folia, Java 8 and newer, and needs no extra dependencies.

## API overview

| Endpoint | Used by |
|---|---|
| `GET /api/validate/{pluginId}/{key}?sessionId=&nonce=` | The plugin, on startup |
| `POST /api/heartbeat/{pluginId}/{key}` | The plugin, every 30s |
| `POST /api/builtbybit` | BuiltByBit placeholder |
| `POST /api/tebex` | Tebex webhook |
| `GET /api/check?pluginId=&key=` | Public checker page |
| `/api/v1/...` | REST API (`X-API-Key: xkl_...`). See Dashboard → Guides → REST API. |

## Tests

```bash
npm run build && npm test
```

This starts the real server with a throwaway database. It tests:
- every validation result, and that signatures check out;
- server limits and heartbeats;
- the blacklist;
- BuiltByBit and Tebex webhooks;
- the REST API.

To check that the Java class compiles against the Spigot API, run `cd library && mvn compile`.

## Project layout

```
server.mjs                 Node server (passes the real client IP to the app)
src/lib/                   Database, validation, signing, marketplaces, email
src/app/api/               Public endpoints and REST API
src/app/dashboard/         Dashboard pages and guides
library/                   XkixosLicense.java template (downloaded pre-filled from the dashboard)
tests/                     End-to-end tests
```
