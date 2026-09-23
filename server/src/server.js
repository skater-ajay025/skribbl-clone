import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { Room } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const clientDist = path.join(root, 'client', 'dist');
const words = JSON.parse(fs.readFileSync(path.join(root, 'server/data/words.json'), 'utf8'));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});
io.appWords = words;

app.use(cors());
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'skribbl-clone-server' }));
app.get('/api/rooms', (_req, res) => {
  const list = [...rooms.values()].filter(r => !r.settings.isPrivate && r.game.phase === 'lobby').map(r => ({
    id: r.id, players: r.players.length, maxPlayers: r.settings.maxPlayers, rounds: r.settings.rounds
  }));
  res.json(list);
});
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const rooms = new Map();
const socketRooms = new Map();

function getRoom(socket) {
  const roomId = socketRooms.get(socket.id);
  return roomId ? rooms.get(roomId) : null;
}
function leaveCurrentRoom(socket, notify = true) {
  const room = getRoom(socket);
  if (!room) return;
  const player = room.removePlayer(socket.id);
  socket.leave(room.id);
  socketRooms.delete(socket.id);
  if (notify) room.broadcast('player_left', { playerId: socket.id, players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, ready: p.ready, isHost: p.isHost })) });
  room.broadcastState();
  if (!room.players.length) {
    room.game.clearTimers();
    rooms.delete(room.id);
  }
  return player;
}

io.on('connection', socket => {
  socket.on('create_room', ({ hostName, settings }) => {
    leaveCurrentRoom(socket, false);
    const room = new Room(io, hostName, settings);
    rooms.set(room.id, room);
    const host = room.players[0];
    host.id = socket.id;
    socket.join(room.id);
    socketRooms.set(socket.id, room.id);
    socket.emit('room_created', { roomId: room.id, playerId: socket.id });
    room.broadcastState();
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    leaveCurrentRoom(socket, false);
    const id = String(roomId || '').trim().toUpperCase();
    const room = rooms.get(id);
    if (!room) return socket.emit('error_message', { message: 'Room not found.' });
    if (room.players.length >= room.settings.maxPlayers) return socket.emit('error_message', { message: 'Room is full.' });
    if (room.game.phase !== 'lobby') return socket.emit('error_message', { message: 'Game already started.' });
    const player = room.addPlayer(playerName, false, socket.id);
    socket.join(room.id);
    socketRooms.set(socket.id, room.id);
    socket.emit('room_joined', { roomId: room.id, playerId: socket.id });
    room.broadcast('player_joined', { player, players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, ready: p.ready, isHost: p.isHost })) });
    room.broadcastState();
  });

  socket.on('toggle_ready', () => {
    const room = getRoom(socket); if (!room) return;
    const player = room.players.find(p => p.id === socket.id); if (!player) return;
    player.ready = !player.ready;
    room.broadcastState();
  });

  socket.on('start_game', () => {
    const room = getRoom(socket); if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) return socket.emit('error_message', { message: 'Only the host can start the game.' });
    if (!room.canStart()) return socket.emit('error_message', { message: 'At least 2 players are required.' });
    room.game.start();
  });

  socket.on('choose_word', ({ word }) => {
    const room = getRoom(socket); if (!room) return;
    if (socket.id !== room.game.drawerId) return;
    room.game.chooseWord(word);
  });

  socket.on('draw_start', data => {
    const room = getRoom(socket); if (!room || socket.id !== room.game.drawerId || room.game.phase !== 'playing') return;
    const stroke = { points: [{ x: Number(data.x), y: Number(data.y) }], color: data.color, size: Number(data.size), tool: data.tool || 'brush' };
    room.game.strokes.push(stroke);
    socket.data.activeStroke = stroke;
    room.broadcast('draw_data', { action: 'start', stroke });
  });

  socket.on('draw_move', data => {
    const room = getRoom(socket); if (!room || socket.id !== room.game.drawerId || !socket.data.activeStroke) return;
    const point = { x: Number(data.x), y: Number(data.y) };
    socket.data.activeStroke.points.push(point);
    room.broadcast('draw_data', { action: 'move', strokeIndex: room.game.strokes.length - 1, point });
  });

  socket.on('draw_end', () => {
    const room = getRoom(socket); if (!room || socket.id !== room.game.drawerId) return;
    socket.data.activeStroke = null;
    room.broadcast('draw_data', { action: 'end' });
  });

  socket.on('canvas_clear', () => {
    const room = getRoom(socket); if (!room || socket.id !== room.game.drawerId) return;
    room.game.resetCanvas();
    room.broadcast('canvas_clear');
    room.broadcastState();
  });

  socket.on('draw_undo', () => {
    const room = getRoom(socket); if (!room || socket.id !== room.game.drawerId) return;
    room.game.strokes.pop();
    room.broadcast('draw_undo');
    room.broadcastState();
  });

  socket.on('guess', ({ text }) => {
    const room = getRoom(socket); if (!room) return;
    const player = room.players.find(p => p.id === socket.id); if (!player) return;
    room.game.handleGuess(player, text);
  });

  socket.on('chat', ({ text }) => {
    const room = getRoom(socket); if (!room) return;
    const player = room.players.find(p => p.id === socket.id); if (!player) return;
    const clean = String(text || '').trim().slice(0, 200); if (!clean) return;
    room.broadcast('chat_message', { playerId: player.id, playerName: player.name, text: clean });
  });

  socket.on('disconnect', () => leaveCurrentRoom(socket));
});
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});