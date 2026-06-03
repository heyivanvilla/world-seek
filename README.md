# 🌍 World Seek

A multiplayer hide-and-seek geo-guessing party game. Each player secretly drops a pin
somewhere in the world (their hiding spot), then everyone takes turns guessing where each
player is hiding using Google Street View. Points are awarded by distance — closest wins.

## Stack

- **Next.js 14** (App Router) for the client
- **Socket.IO** on a **custom Node server** that holds all room state in memory and is the
  single source of truth (clients send intents; the server runs the game and pushes a
  redacted per-player state)
- **Google Maps + Street View** for hiding and guessing

## Prerequisites

- Node.js 18+ (this repo was verified on Node 24)
- A **Google Maps JavaScript API key** with **Maps JavaScript API** and **Street View**
  enabled and **billing on** (in the [Google Cloud console](https://console.cloud.google.com/)).

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key
```

## Run (development)

```bash
npm run dev
# → World Seek ready on http://localhost:3000
```

The `dev` script runs the **custom server** (`server/index.ts`) via `tsx watch`, which serves
both Next.js and the Socket.IO endpoint on the same port.

## Production

```bash
npm run build
npm start
```

## Deploy on Coolify (self-hosted)

The repo ships a `Dockerfile` and `.dockerignore`, so deploying is "point Coolify at the repo".

1. **DNS:** point an `A` record (e.g. `worldseek.yourdomain.com`) at your Coolify server IP.
2. **Connect the repo:** Coolify → *Sources* → add a **GitHub App** (enables auto-deploy on
   push) with access to this private repo.
3. **New Resource → Application** → pick the repo + branch. **Build Pack: Dockerfile.**
4. **Port:** set *Ports Exposes* to `3000`. **Domain:** set the FQDN (Coolify issues HTTPS via
   Traefik, including `wss://` for the socket).
5. **Environment variables:**
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — **mark as a Build Variable** (available at build time).
     Next.js inlines it into the browser bundle during `next build`; if it's runtime-only,
     Street View silently fails.
   - `ALLOWED_ORIGIN` = your `https://...` domain (runtime; locks Socket.IO CORS).
   - `PORT` = `3000` (optional).
6. **Deploy.** Keep **replicas = 1** — game state is in-memory, so a second instance would split
   rooms and break Socket.IO.

**Secure the Maps key** in Google Cloud Console (it's public by design): add an HTTP-referrer
restriction for your domain, restrict it to the **Maps JavaScript API**, and set a billing
budget alert.

## How to play

1. Open `http://localhost:3000`, enter a name, and **Start game**. You're the host (GM).
2. Share the URL (e.g. `http://localhost:3000/game/abr-tyr`). Each person opens it and picks
   a name; they appear in your lobby live.
3. As host, pick a difficulty and **Start game** (needs ≥2 players).
4. **Hiding:** everyone drops a pin and confirms with **Hide here** (only spots with Street
   View coverage are allowed).
5. **Finding:** one hider at a time — everyone else sees that hider's Street View and drops a
   guess. The hider sits out their own round.
6. **Results:** the real spot, all guesses, and points are revealed. Host advances.
7. After the last round, final scores + winner. Host can return everyone to the lobby.

### Reconnection & join-locking

- A session token is stored in `localStorage` per game. Refresh or reconnect mid-game and you
  drop back into your seat.
- New players **cannot join once the game has started** — only reconnections with a valid
  token are honored.

## Project layout

```
server/                 custom Node server (Next + Socket.IO) and event handlers
src/shared/             types, scoring (haversine + decay), code/token generation — shared
src/server-logic/       in-memory store, state-machine transitions, per-player projection
src/lib/                client socket, session storage, useGame hook, Google Maps loader
src/components/         MapPicker, StreetView, and the phase screens
src/app/                home page + /game/[code] room shell
scripts/smoke.mjs       headless end-to-end test of the full game loop (server must be running)
```

## Testing the game logic without a browser

With the dev server running:

```bash
node scripts/smoke.mjs
```

This drives three simulated players through create → join → start → hide → guess → results →
finish → reconnect, asserting the server's behavior (no Maps key needed).

## Known limitations (MVP)

- Room state is in-memory — a server restart drops live games.
- Anti-cheat is panoId-based (the hider's coords aren't sent to guessers until the reveal),
  which is friendly-game grade, not bulletproof.
- No per-phase timers — phases advance when everyone has acted, with a host "skip the wait"
  override.
