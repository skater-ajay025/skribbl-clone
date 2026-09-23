# skribbl-clone — Real-Time Multiplayer Drawing Game

A full-stack, real-time drawing and guessing game built for the **Intern Assignment: skribbl.io Clone** brief.

## What is included

- React + TypeScript + Vite frontend
- Node.js + Express backend
- Socket.IO WebSockets for live game state, drawing, chat and guesses
- HTML5 Canvas drawing engine
- Room creation/joining with 6-character room code
- Configurable max players, rounds, draw time, word choices, hints and categories
- Lobby with host controls and player list
- Turn-based word selection
- Live stroke synchronization
- Brush, colors, brush sizes, eraser, undo and clear
- Guess scoring and leaderboard
- Countdown timer
- Letter hints
- Game-over leaderboard
- Public-room API for optional open rooms
- Render deployment blueprint
- Architecture/code-walkthrough notes below

The assignment asks for multiplayer rooms, turn-based drawing, real-time drawing, word selection, scoring, leaderboard, WebSockets, chat/guessing, configurable settings, README/deployment guidance, and code understanding. This project implements those core flows locally and is structured for Render deployment.

## Project structure

```text
skribbl-clone/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── styles/
│   │   ├── App.tsx
│   │   ├── socket.ts
│   │   ├── types.ts
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig*.json
│   └── vite.config.ts
├── server/
│   ├── data/words.json
│   ├── src/game.js
│   └── src/server.js
├── render.yaml
├── package.json
├── .gitignore
└── README.md
```

## Run locally

### 1. Requirements

- Node.js 20+
- npm 10+

### 2. Install dependencies

From the project root:

```bash
npm install
npm --prefix client install
npm --prefix server install
```

### 3. Start frontend + backend

```bash
npm run dev
```

Open:

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/api/health

Open the game in two browser tabs/windows. Create a room in one tab, then join using the room code in the other. Start the game from the host tab.

### Run separately

```bash
npm run dev:server
npm run dev:client
```

## Production build

```bash
npm run build
npm start
```

The server serves `client/dist` when the frontend has been built.

## Deployment — Render

The included `render.yaml` is a starting point for a single Render Web Service.

1. Push this folder to GitHub.
2. Create a Render Web Service from the repository.
3. Use the build/start commands from `render.yaml`.
4. After deployment, use the generated Render URL as the public application URL.
5. Put the live URL in this README before submitting.

Example placeholder:

```text
Live URL: https://YOUR-SERVICE-NAME.onrender.com
```

A live URL cannot be created from this ZIP without access to your GitHub/Render account, so the deployment step remains for the project owner.

## Architecture overview

```text
React Client
   │
   │ Socket.IO events
   ▼
Node + Express + Socket.IO
   │
   ├── Room
   │    ├── players
   │    ├── settings
   │    └── Game
   │         ├── round / drawer
   │         ├── word / hints
   │         ├── scoring
   │         └── strokes
   │
   └── words.json
```

### Drawing flow

1. The drawer presses the canvas.
2. The browser converts the pointer position into canvas coordinates.
3. `draw_start`, `draw_move`, and `draw_end` are emitted through Socket.IO.
4. The server accepts drawing events only from the current drawer.
5. The server broadcasts `draw_data` to the room.
6. Every client appends the stroke/point to its local canvas state.

### Game-state flow

The server is authoritative for room membership, current drawer, selected word, round timer and scoring. Clients receive `game_state`, `round_start`, `hint_update`, `round_end` and `game_over` events.

### Word matching

Guesses are normalized with `trim()` and `toLowerCase()`, then compared with the selected word. Correct guesses receive points based on remaining time. Incorrect guesses are broadcast as normal chat messages.

### OOP design

The server includes the assignment's suggested OOP separation:

- `Player`: player identity, host/ready state and score.
- `Room`: players, settings, broadcasting and room state.
- `Game`: round flow, word selection, hints, timers and scoring.

## Important implementation notes

- Room/game data is in memory. Restarting the server clears rooms and scores.
- For a production multi-instance deployment, use a shared store/Socket.IO adapter such as Redis and persistent storage where needed.
- The Render blueprint is provided, but the final live URL depends on the deployment account and service configuration.

## Assignment mapping

| Brief requirement | Implementation |
|---|---|
| Create/join rooms | Room code + create/join UI |
| Private room | Private setting + room code/invite link |
| Lobby | Player list + host start |
| Turn-based rounds | Server-controlled drawer rotation |
| Real-time drawing | Socket.IO stroke events |
| Word choices | 1–5 server-generated choices |
| Guessing | Chat input + server word check |
| Scoring | Time-based points + drawer bonus |
| Leaderboard | Live player list + final table |
| Hints | Timed letter reveal |
| Drawing tools | Brush, colors, sizes, eraser, undo, clear |
| Chat | Socket.IO room messages |
| Countdown | Server round end timestamp |
| Deployment | Render blueprint + README |

## Submission checklist

- [ ] Push project to GitHub
- [ ] Deploy on Render/Railway
- [ ] Replace the README placeholder with the real live URL
- [ ] Test two or more browser clients
- [ ] Verify create room → join → start → choose word → draw → guess → score → game end
- [ ] Be ready to explain Socket.IO, Canvas stroke sync, server-authoritative game state and word matching
