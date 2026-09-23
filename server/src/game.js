import crypto from 'node:crypto';

export class Player {
  constructor(id, name, isHost = false) {
    this.id = id;
    this.name = name;
    this.score = 0;
    this.ready = false;
    this.isHost = isHost;
    this.hasGuessed = false;
  }
}

export class Game {
  constructor(room) {
    this.room = room;
    this.phase = 'lobby';
    this.round = 0;
    this.drawerIndex = -1;
    this.word = '';
    this.wordOptions = [];
    this.strokes = [];
    this.hints = [];
    this.startedAt = null;
    this.roundTimer = null;
    this.hintTimers = [];
    this.roundEndsAt = null;
  }

  clearTimers() {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = null;
    this.hintTimers.forEach(clearTimeout);
    this.hintTimers = [];
  }

  resetCanvas() {
    this.strokes = [];
  }

  nextDrawerIndex() {
    if (!this.room.players.length) return -1;
    return (this.drawerIndex + 1) % this.room.players.length;
  }

  publicState() {
    return {
      phase: this.phase,
      round: this.round,
      totalRounds: this.room.settings.rounds,
      drawerId: this.drawerId,
      hints: this.hints,
      drawTime: this.room.settings.drawTime,
      roundEndsAt: this.roundEndsAt,
      strokes: this.strokes
    };
  }

  get drawerId() {
    return this.room.players[this.drawerIndex]?.id ?? null;
  }

  chooseOptions() {
    const all = this.room.getWordPool();
    const count = Math.min(this.room.settings.wordCount, all.length);
    return [...all].sort(() => Math.random() - 0.5).slice(0, count);
  }

  start() {
    this.phase = 'playing';
    this.round = 1;
    this.drawerIndex = -1;
    this.startRound();
  }

  startRound() {
    this.clearTimers();
    this.resetCanvas();
    this.drawerIndex = this.nextDrawerIndex();
    this.word = '';
    this.wordOptions = this.chooseOptions();
    this.hints = [];
    this.room.players.forEach(p => { p.hasGuessed = false; });
    this.roundEndsAt = null;
    this.room.broadcast('round_start', {
      drawerId: this.drawerId,
      wordOptions: this.wordOptions,
      drawTime: this.room.settings.drawTime,
      round: this.round,
      totalRounds: this.room.settings.rounds
    });
    this.room.broadcastState();
  }

  chooseWord(word) {
    if (this.phase !== 'playing' || !this.wordOptions.includes(word)) return false;
    this.word = word.toLowerCase().trim();
    this.wordOptions = [];
    this.startedAt = Date.now();
    this.roundEndsAt = Date.now() + this.room.settings.drawTime * 1000;
    this.room.io.to(this.room.id).emit('word_chosen_public', {
      drawerId: this.drawerId,
      hints: this.makeMaskedWord()
    });
    const drawerSocket = this.room.io.sockets.sockets.get(this.drawerId);
    drawerSocket?.emit('word_chosen_private', { word: this.word });
    this.scheduleHints();
    this.roundTimer = setTimeout(() => this.endRound('time'), this.room.settings.drawTime * 1000);
    this.room.broadcastState();
    return true;
  }

  makeMaskedWord() {
    const word = this.word || '';
    return word.split('').map(ch => ch === ' ' ? ' ' : '_');
  }

  scheduleHints() {
    if (!this.room.settings.hints || this.room.settings.hints <= 0 || !this.word) return;
    const count = Math.min(this.room.settings.hints, Math.max(0, this.word.replace(/\s/g, '').length - 1));
    if (!count) return;
    const interval = (this.room.settings.drawTime * 1000) / (count + 1);
    for (let i = 1; i <= count; i++) {
      this.hintTimers.push(setTimeout(() => {
        const positions = this.word.split('').map((c, idx) => c !== ' ' ? idx : -1).filter(i => i >= 0);
        const available = positions.filter(i => !this.hints.includes(i));
        if (!available.length) return;
        const pos = available[Math.floor(Math.random() * available.length)];
        this.hints.push(pos);
        this.room.io.to(this.room.id).emit('hint_update', { hints: this.hints, maskedWord: this.maskedWord() });
        this.room.broadcastState();
      }, Math.floor(interval * i)));
    }
  }

  maskedWord() {
    return this.word.split('').map((ch, idx) => ch === ' ' ? ' ' : this.hints.includes(idx) ? ch : '_');
  }

  handleGuess(player, text) {
    if (this.phase !== 'playing' || !this.word || player.id === this.drawerId || player.hasGuessed) return { correct: false, ignored: true };
    const guess = String(text).trim().toLowerCase();
    const correct = guess === this.word;
    if (correct) {
      player.hasGuessed = true;
      const elapsed = Math.max(0, Date.now() - this.startedAt);
      const remaining = Math.max(0, this.room.settings.drawTime * 1000 - elapsed);
      const points = Math.max(50, 100 + Math.floor(remaining / 1000) * 5);
      player.score += points;
      const allGuessers = this.room.players.filter(p => p.id !== this.drawerId);
      this.room.broadcast('guess_result', { correct: true, playerId: player.id, playerName: player.name, points });
      this.room.broadcast('chat_message', { playerId: player.id, playerName: player.name, text: `${player.name} guessed the word!`, system: true });
      if (allGuessers.every(p => p.hasGuessed)) this.endRound('guessed');
    } else {
      this.room.broadcast('guess_result', { correct: false, playerId: player.id, playerName: player.name, points: 0 });
      this.room.broadcast('chat_message', { playerId: player.id, playerName: player.name, text });
    }
    this.room.broadcastState();
    return { correct, points: correct ? player.score : 0 };
  }

  endRound(reason) {
    if (this.phase !== 'playing') return;
    this.clearTimers();
    const drawer = this.room.players[this.drawerIndex];
    if (reason === 'guessed' && drawer) drawer.score += 25;
    this.room.broadcast('round_end', {
      word: this.word,
      scores: this.room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
      nextDrawer: this.round < this.room.settings.rounds ? this.room.players[(this.drawerIndex + 1) % this.room.players.length]?.id : null
    });
    if (this.round >= this.room.settings.rounds) {
      this.endGame();
      return;
    }
    this.round += 1;
    setTimeout(() => this.startRound(), 1800);
  }

  endGame() {
    this.phase = 'ended';
    this.roundEndsAt = null;
    const leaderboard = [...this.room.players].sort((a, b) => b.score - a.score).map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score }));
    this.room.broadcast('game_over', { winner: leaderboard[0] ?? null, leaderboard });
    this.room.broadcastState();
  }
}

export class Room {
  constructor(io, hostName, settings = {}) {
    this.io = io;
    this.id = Room.makeId();
    this.createdAt = Date.now();
    this.settings = {
      maxPlayers: clamp(settings.maxPlayers, 2, 20, 8),
      rounds: clamp(settings.rounds, 2, 10, 4),
      drawTime: clamp(settings.drawTime, 15, 240, 60),
      wordCount: clamp(settings.wordCount, 1, 5, 3),
      hints: clamp(settings.hints, 0, 5, 2),
      category: ['all', 'animals', 'objects', 'actions'].includes(settings.category) ? settings.category : 'all',
      isPrivate: settings.isPrivate !== false
    };
    this.players = [];
    this.game = new Game(this);
    this.addPlayer(hostName, true);
  }

  static makeId() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  addPlayer(name, isHost = false, id = crypto.randomUUID()) {
    const player = new Player(id, sanitizeName(name), isHost);
    this.players.push(player);
    return player;
  }

  removePlayer(id) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx < 0) return null;
    const [removed] = this.players.splice(idx, 1);
    if (removed.isHost && this.players.length) this.players[0].isHost = true;
    if (this.game.phase === 'playing' && idx <= this.game.drawerIndex) {
      this.game.drawerIndex = Math.max(-1, this.game.drawerIndex - 1);
    }
    return removed;
  }

  getWordPool() {
    const words = this.io.appWords;
    if (this.settings.category === 'all') return Object.values(words).flat();
    return words[this.settings.category] ?? Object.values(words).flat();
  }

  broadcast(event, payload) {
    this.io.to(this.id).emit(event, payload);
  }

  broadcastState() {
    this.broadcast('game_state', {
      ...this.game.publicState(),
      players: this.players.map(p => ({ id: p.id, name: p.name, score: p.score, ready: p.ready, isHost: p.isHost })),
      settings: this.settings
    });
  }

  canStart() {
    return this.players.length >= 2 && this.game.phase === 'lobby';
  }
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

function sanitizeName(name) {
  return String(name || 'Player').trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 18) || 'Player';
}
