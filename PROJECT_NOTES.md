# Submission / Viva Notes

## 60-second explanation

This project is a real-time multiplayer drawing and guessing game. The React client renders the lobby, game canvas, chat and leaderboard. A Node.js/Express server owns the room and game state. Socket.IO synchronizes players, drawing strokes, guesses, hints, timers and scores. Each round the server selects one drawer, sends 1–5 word choices privately to that drawer, receives the selected word, then accepts drawing only from that drawer. Other players submit guesses; the server validates the guess and updates scores. After the configured rounds, the server sends the final leaderboard.

## Common interview questions

### Why Socket.IO?
It provides event-based real-time communication, reconnection behavior and room broadcasting on top of WebSockets/compatible transports.

### Why keep the game state on the server?
It prevents individual clients from deciding who the drawer is or awarding themselves points. The server remains authoritative.

### How is the drawing synchronized?
The client sends compact stroke events containing coordinates, color, size and tool. The server broadcasts them to the room. Clients render the received points on their canvas.

### How are hints generated?
The server schedules hint timers during a round and reveals random unrevealed letter positions.

### How is cheating reduced?
The selected word is sent privately to the drawer. Guess validation and scoring happen on the server. Drawing events are accepted only from the current drawer.

### What is the deployment limitation?
This implementation stores rooms in server memory. A restart removes rooms, and multiple server instances would require shared state plus a Socket.IO adapter.

## Latest UI update
- Fixed room-code Copy buttons with Clipboard API + textarea fallback for non-secure contexts.
- Added visible `Copied` feedback after successful copy.
- Refreshed the lobby UI with a cleaner modern dark/purple design, responsive player cards, room-code panel, invite-link panel, status pills, and improved header.
