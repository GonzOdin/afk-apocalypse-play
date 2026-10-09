# AFK Apocalypse — own signal server

The free public lobby server (0.peerjs.com) kills connections when you send
through it, so the game now uses this tiny server you control. The game
already speaks its protocol; nothing else changes.

## Deploy the server (Fly.io, free tier)

1. Make a free account at https://fly.io and install flyctl:
   `curl -L https://fly.io/install.sh | sh`
2. `cd afk-signal-server`
3. `fly launch` — say yes to create the app, **no** to deploy now, no to
   Postgres/Redis. Note the app name it picks (or set your own).
4. Open the generated `fly.toml` and make sure the http_service section has:
   `auto_stop_machines = "off"` and `min_machines_running = 1`
   (a sleeping lobby misses joins).
5. `fly deploy`
6. Your server URL is `wss://<app-name>.fly.dev/peerjs`

## Point the game at it

Upload `afk-apocalypse-v2.html` to your GitHub repo as `index.html`.
Then host from:

    https://<you>.github.io/<repo>/?sig=wss://<app-name>.fly.dev/peerjs

The COPY LINK button keeps `?sig=` in the join link, so guests need nothing
special. (Once the server URL is final, it can be baked in as the default
and the `?sig=` goes away.)

## Test it

Open `afk-relay-diag.html`'s bigger brother: just host a game on one device
and join from the other. The lobby now shows RECONNECTING... if the server
ever drops, and heals itself.
