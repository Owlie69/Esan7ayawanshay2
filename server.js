const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const ARABIC_LETTERS = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];
const CATEGORIES = ['إنسان', 'حيوان', 'شيء', 'مدينة', 'دولة'];
const ROUND_DURATION = 60; // seconds

const rooms = {};

function makeRoom(roomId) {
  return {
    id: roomId,
    players: {},
    state: 'waiting', // waiting | playing | scoring
    letter: null,
    round: 0,
    timer: null,
    timeLeft: 0,
    answers: {},
    scores: {},
    roundsToPlay: 5,
    usedLetters: [],
  };
}

function pickLetter(room) {
  const available = ARABIC_LETTERS.filter(l => !room.usedLetters.includes(l));
  const pool = available.length ? available : ARABIC_LETTERS;
  const letter = pool[Math.floor(Math.random() * pool.length)];
  room.usedLetters.push(letter);
  return letter;
}

function startRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.round++;
  room.letter = pickLetter(room);
  room.state = 'playing';
  room.answers = {};
  room.timeLeft = ROUND_DURATION;

  for (const pid of Object.keys(room.players)) {
    room.answers[pid] = {};
  }

  io.to(roomId).emit('round_start', {
    round: room.round,
    total: room.roundsToPlay,
    letter: room.letter,
    categories: CATEGORIES,
    timeLeft: room.timeLeft,
  });

  room.timer = setInterval(() => {
    room.timeLeft--;
    io.to(roomId).emit('tick', { timeLeft: room.timeLeft });
    if (room.timeLeft <= 0) endRound(roomId);
  }, 1000);
}

function endRound(roomId) {
  const room = rooms[roomId];
  if (!room || room.state !== 'playing') return;
  clearInterval(room.timer);
  room.state = 'scoring';

  // Calculate scores for this round
  const roundScores = {};
  for (const pid of Object.keys(room.players)) {
    roundScores[pid] = 0;
  }

  for (const cat of CATEGORIES) {
    const answerMap = {};
    for (const [pid, ans] of Object.entries(room.answers)) {
      const val = (ans[cat] || '').trim().toLowerCase();
      if (!val) continue;
      answerMap[pid] = val;
    }

    // Count how many players gave each answer
    const freq = {};
    for (const v of Object.values(answerMap)) {
      freq[v] = (freq[v] || 0) + 1;
    }

    for (const [pid, val] of Object.entries(answerMap)) {
      roundScores[pid] += freq[val] === 1 ? 10 : 5;
    }
  }

  for (const pid of Object.keys(room.players)) {
    room.scores[pid] = (room.scores[pid] || 0) + roundScores[pid];
  }

  const playersInfo = Object.entries(room.players).map(([pid, p]) => ({
    id: pid,
    name: p.name,
    roundScore: roundScores[pid] || 0,
    totalScore: room.scores[pid] || 0,
  })).sort((a, b) => b.totalScore - a.totalScore);

  io.to(roomId).emit('round_end', {
    letter: room.letter,
    categories: CATEGORIES,
    answers: room.answers,
    playerNames: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, p.name])),
    roundScores,
    players: playersInfo,
    round: room.round,
    total: room.roundsToPlay,
  });

  if (room.round >= room.roundsToPlay) {
    room.state = 'finished';
    io.to(roomId).emit('game_over', { players: playersInfo });
  }
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ name, rounds }) => {
    const roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
    rooms[roomId] = makeRoom(roomId);
    const room = rooms[roomId];
    room.roundsToPlay = Math.max(1, Math.min(10, parseInt(rounds) || 5));
    room.players[socket.id] = { name, isHost: true };
    room.scores[socket.id] = 0;
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.emit('room_created', { roomId, playerId: socket.id });
    io.to(roomId).emit('lobby_update', lobbyInfo(room));
  });

  socket.on('join_room', ({ roomId, name }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error', 'Room not found');
    if (room.state !== 'waiting') return socket.emit('error', 'Game already started');
    room.players[socket.id] = { name, isHost: false };
    room.scores[socket.id] = 0;
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.emit('room_joined', { roomId, playerId: socket.id });
    io.to(roomId).emit('lobby_update', lobbyInfo(room));
  });

  socket.on('start_game', () => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    if (!room.players[socket.id]?.isHost) return;
    if (Object.keys(room.players).length < 1) return;
    startRound(socket.data.roomId);
  });

  socket.on('submit_answers', ({ answers }) => {
    const room = rooms[socket.data.roomId];
    if (!room || room.state !== 'playing') return;
    room.answers[socket.id] = answers;

    // If all players submitted, end round early
    const allIn = Object.keys(room.players).every(pid => Object.keys(room.answers[pid] || {}).length > 0);
    if (allIn) endRound(socket.data.roomId);
  });

  socket.on('next_round', () => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    if (!room.players[socket.id]?.isHost) return;
    if (room.state === 'scoring' && room.round < room.roundsToPlay) {
      startRound(socket.data.roomId);
    }
  });

  socket.on('play_again', () => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    if (!room.players[socket.id]?.isHost) return;
    room.round = 0;
    room.scores = {};
    room.usedLetters = [];
    room.state = 'waiting';
    for (const pid of Object.keys(room.players)) room.scores[pid] = 0;
    io.to(socket.data.roomId).emit('lobby_update', lobbyInfo(room));
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const room = rooms[roomId];
    if (!room) return;
    delete room.players[socket.id];
    delete room.scores[socket.id];
    if (Object.keys(room.players).length === 0) {
      clearInterval(room.timer);
      delete rooms[roomId];
      return;
    }
    // Reassign host if needed
    if (!Object.values(room.players).some(p => p.isHost)) {
      Object.values(room.players)[0].isHost = true;
    }
    io.to(roomId).emit('lobby_update', lobbyInfo(room));
  });
});

function lobbyInfo(room) {
  return {
    roomId: room.id,
    players: Object.entries(room.players).map(([id, p]) => ({ id, name: p.name, isHost: p.isHost })),
    rounds: room.roundsToPlay,
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Game running at http://localhost:${PORT}`));
