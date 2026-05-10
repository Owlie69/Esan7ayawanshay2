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
const ROUND_DURATION = 60;

const DIFFICULTY_CONFIG = {
  easy:   { minMs: 40000, maxMs: 55000, fillRate: 0.55 },
  medium: { minMs: 20000, maxMs: 40000, fillRate: 0.80 },
  hard:   { minMs:  5000, maxMs: 15000, fillRate: 0.95 },
};

const BOT_WORDS = {
  'إنسان': {
    'ا': ['أحمد','إبراهيم','أمير','أنس','أيمن','إيمان','أسامة'],
    'ب': ['بلال','بدر','بسام','بشار','بيان'],
    'ت': ['تامر','تركي','توفيق','تيسير'],
    'ث': ['ثامر','ثابت'],
    'ج': ['جمال','جاسم','جواد','جنى','جابر'],
    'ح': ['حسن','حمد','حنان','حسام','حسين','حيدر'],
    'خ': ['خالد','خلود','خضر','خديجة','خليل'],
    'د': ['داوود','دانا','دلال','ديما'],
    'ذ': ['ذياب','ذيب'],
    'ر': ['رامي','رنا','رشيد','ريم','رانيا','ربيع'],
    'ز': ['زياد','زينب','زكريا','زاهر','زهرة'],
    'س': ['سالم','سارة','سامي','سلمى','سيف','سعيد','سلطان'],
    'ش': ['شادي','شيرين','شكري','شهد','شريف'],
    'ص': ['صالح','صفاء','صلاح','صبا','صقر'],
    'ض': ['ضياء','ضحى'],
    'ط': ['طارق','طلال','طيبة','طه','طاهر'],
    'ع': ['علي','عمر','عبدالله','عائشة','عادل','عبير','عصام'],
    'غ': ['غانم','غادة','غيث','غالية'],
    'ف': ['فارس','فاطمة','فيصل','فؤاد','فريدة','فريد'],
    'ق': ['قاسم','قيس','قمر','قتيبة'],
    'ك': ['كريم','كمال','كوثر','كفاح'],
    'ل': ['لمى','لين','لؤي','لقمان'],
    'م': ['محمد','مريم','مصطفى','منى','مجد','معتصم','ملك'],
    'ن': ['ناصر','نور','نادية','نهاد','نزار','نرمين'],
    'ه': ['هاني','هند','هديل','هيثم','هلا'],
    'و': ['وليد','وسام','وفاء','وائل','ورد'],
    'ي': ['يوسف','ياسر','يمنى','يزيد','ياسمين'],
  },
  'حيوان': {
    'ا': ['أسد','أرنب','أفعى','أخطبوط','أيل','إوزة'],
    'ب': ['بقرة','بط','بعير','ببغاء','بطريق','بجعة'],
    'ت': ['تمساح','تيس','تنين'],
    'ث': ['ثعلب','ثور','ثعبان'],
    'ج': ['جمل','جرذ','جاموس','جراد'],
    'ح': ['حمار','حصان','حمامة','حوت','حمل','حلزون'],
    'خ': ['خروف','خفاش','خرتيت'],
    'د': ['دب','دجاجة','دلفين','ديك','دعسوقة'],
    'ذ': ['ذئب','ذبابة'],
    'ر': ['ريم','رخم'],
    'ز': ['زرافة','زبرا'],
    'س': ['سمكة','سلحفاة','سنجاب','سرطان','سمندل'],
    'ش': ['شمبانزي','شاة','شبل'],
    'ص': ['صقر','صرصور'],
    'ض': ['ضبع','ضبي','ضفدع'],
    'ط': ['طاووس','طائر'],
    'ع': ['عقاب','عنزة','عصفور','عنكبوت','عجل'],
    'غ': ['غزال','غراب','غوريلا'],
    'ف': ['فهد','فيل','فأر','فراشة','فرس'],
    'ق': ['قطة','قرد','قنفذ','قندس','قرش'],
    'ك': ['كلب','كنغر','كركدن','كبش'],
    'ل': ['لبؤة','لقلق'],
    'م': ['مها','ماعز','محار','مهر'],
    'ن': ['نسر','نمر','نملة','نعامة','نحلة'],
    'ه': ['همستر','هدهد'],
    'و': ['وعل','ورل'],
    'ي': ['يربوع'],
  },
  'شيء': {
    'ا': ['أريكة','إبريق','أقلام','أكواب','إبرة'],
    'ب': ['باب','بطانية','برواز','بطارية','بيت'],
    'ت': ['تلفاز','تلفون','توك','تحفة'],
    'ث': ['ثلاجة','ثريا'],
    'ج': ['جهاز','جوارب','جنطة'],
    'ح': ['حقيبة','حاسوب','حذاء','حنفية','حصيرة'],
    'خ': ['خاتم','خيمة','خزانة'],
    'د': ['دفتر','دولاب','درج','دلو','دباسة'],
    'ذ': ['ذراع','ذاكرة'],
    'ر': ['راديو','رسالة','رف','ركاب','رمانة'],
    'ز': ['زجاجة','زهرية','زلاجة'],
    'س': ['سيارة','سكين','سلة','سرير','ساعة'],
    'ش': ['شاشة','شبشب','شوكة','شريط'],
    'ص': ['صحن','صابون','صندوق','صنبور'],
    'ض': ['ضوء'],
    'ط': ['طاولة','طابع','طنجرة','طاسة'],
    'ع': ['عصا','عجلة','عطر','عربة','عصير'],
    'غ': ['غلاية','غطاء','غرفة'],
    'ف': ['فرشاة','فرن','فتاحة','فنجان'],
    'ق': ['قلم','قميص','قدر','قفل','قارورة'],
    'ك': ['كتاب','كرسي','كمبيوتر','كوب','كمامة'],
    'ل': ['لمبة','لوحة','لعبة','لباس'],
    'م': ['مطرقة','مقص','مفتاح','مكنسة','مصباح'],
    'ن': ['نظارة','نافذة','نار','نعل'],
    'ه': ['هاتف','هوائي','هدية','هاون'],
    'و': ['وسادة','ورقة','وعاء'],
    'ي': ['يخت','ياقوت','يد'],
  },
  'مدينة': {
    'ا': ['أبوظبي','أكادير','أسوان','أمستردام','أنقرة','أثينا'],
    'ب': ['بيروت','بغداد','برلين','بروكسل','بنغازي'],
    'ت': ['تونس','تبوك','تكريت','تمبكتو'],
    'ث': [],
    'ج': ['جدة','جنيف','جاكرتا','جنوة'],
    'ح': ['حيفا','حلب','حمص','حائل'],
    'خ': ['خميس مشيط','الخرطوم'],
    'د': ['دبي','دمشق','الدوحة','دكار'],
    'ذ': [],
    'ر': ['روما','رام الله','رشيد','ريو'],
    'ز': ['زغرب','الزقازيق'],
    'س': ['سيدني','سنغافورة','سراييفو','سيول'],
    'ش': ['شنغهاي','شيكاغو','شرم الشيخ'],
    'ص': ['صنعاء','صفاقس'],
    'ض': [],
    'ط': ['طرابلس','طنجة','طهران','طوكيو'],
    'ع': ['عمان','عدن','عجمان','عرعر'],
    'غ': ['غرناطة'],
    'ف': ['فيينا','فلورنسا','فرانكفورت','فاس'],
    'ق': ['القاهرة','قرطاج'],
    'ك': ['كوالالمبور','الكويت','كراتشي','كابول'],
    'ل': ['لندن','لاهور','ليشبونة','لوكسمبورغ'],
    'م': ['مكة','المدينة','مسقط','موسكو','مانيلا','مدريد'],
    'ن': ['نيويورك','نيروبي','نابلس','نيقوسيا'],
    'ه': ['هامبورغ','هونغ كونغ','هلسنكي','هانوي'],
    'و': ['وارسو','واشنطن','وهران'],
    'ي': ['يوكوهاما','يافا'],
  },
  'دولة': {
    'ا': ['الأردن','أمريكا','إيران','إيطاليا','إندونيسيا','أستراليا','إسبانيا'],
    'ب': ['البرازيل','البحرين','بلجيكا','بنغلاديش','بنما'],
    'ت': ['تركيا','تونس','تشاد','تايلاند','تنزانيا','تايوان'],
    'ث': [],
    'ج': ['الجزائر','جيبوتي','جامايكا','جورجيا'],
    'ح': [],
    'خ': [],
    'د': [],
    'ذ': [],
    'ر': ['روسيا','رواندا','رومانيا'],
    'ز': ['زيمبابوي','زامبيا'],
    'س': ['السعودية','سوريا','السودان','سنغافورة','سريلانكا'],
    'ش': ['شيلي'],
    'ص': ['الصين','الصومال'],
    'ض': [],
    'ط': ['طاجيكستان'],
    'ع': ['العراق','عُمان'],
    'غ': ['غانا','غينيا','غواتيمالا'],
    'ف': ['فرنسا','الفلبين','فنزويلا','فنلندا','فيجي'],
    'ق': ['قطر','قبرص','قيرغيزستان'],
    'ك': ['الكويت','كندا','كوريا','كمبوديا','كولومبيا','كينيا'],
    'ل': ['لبنان','ليبيا','ليبيريا','لاوس','لوكسمبورغ'],
    'م': ['مصر','المغرب','موريتانيا','موزمبيق','مالي','المكسيك'],
    'ن': ['النيجر','نيجيريا','نيبال','نيوزيلندا','نيكاراغوا'],
    'ه': ['هولندا','هندوراس','الهند','هنغاريا'],
    'و': [],
    'ي': ['اليمن','اليونان'],
  },
};

const rooms = {};

function makeRoom(roomId) {
  return {
    id: roomId,
    players: {},
    state: 'waiting',
    letter: null,
    round: 0,
    timer: null,
    timeLeft: 0,
    answers: {},
    submitted: new Set(),
    scores: {},
    roundsToPlay: 5,
    usedLetters: [],
    voidedAnswers: {},
    lastRoundScores: {},
    isBotGame: false,
  };
}

function pickLetter(room) {
  const available = ARABIC_LETTERS.filter(l => !room.usedLetters.includes(l));
  const pool = available.length ? available : ARABIC_LETTERS;
  const letter = pool[Math.floor(Math.random() * pool.length)];
  room.usedLetters.push(letter);
  return letter;
}

function generateBotAnswers(letter, difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const answers = {};
  for (const cat of CATEGORIES) {
    if (Math.random() > config.fillRate) continue;
    const pool = (BOT_WORDS[cat] && BOT_WORDS[cat][letter]) || [];
    if (!pool.length) continue;
    let idx;
    if (difficulty === 'hard') {
      // prefer rarer words (second half of pool)
      const start = Math.floor(pool.length / 2);
      idx = start + Math.floor(Math.random() * (pool.length - start));
    } else if (difficulty === 'easy') {
      // prefer common words (first half)
      idx = Math.floor(Math.random() * Math.ceil(pool.length / 2));
    } else {
      idx = Math.floor(Math.random() * pool.length);
    }
    answers[cat] = pool[Math.min(idx, pool.length - 1)];
  }
  return answers;
}

function submitBotAnswers(roomId, botId, answers) {
  const room = rooms[roomId];
  if (!room || room.state !== 'playing') return;
  room.answers[botId] = answers;
  room.submitted.add(botId);
  const allIn = Object.keys(room.players).every(pid => room.submitted.has(pid));
  if (allIn) endRound(roomId);
}

function scheduleBots(roomId) {
  const room = rooms[roomId];
  for (const [pid, player] of Object.entries(room.players)) {
    if (!player.isBot) continue;
    const cfg = DIFFICULTY_CONFIG[player.difficulty];
    const delay = cfg.minMs + Math.random() * (cfg.maxMs - cfg.minMs);
    setTimeout(() => {
      submitBotAnswers(roomId, pid, generateBotAnswers(room.letter, player.difficulty));
    }, delay);
  }
}

function startRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.round++;
  room.letter = pickLetter(room);
  room.state = 'playing';
  room.answers = {};
  room.submitted = new Set();
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

  if (room.isBotGame) scheduleBots(roomId);

  room.timer = setInterval(() => {
    room.timeLeft--;
    io.to(roomId).emit('tick', { timeLeft: room.timeLeft });
    if (room.timeLeft <= 0) endRound(roomId);
  }, 1000);
}

function calcRoundScores(room) {
  const roundScores = {};
  for (const pid of Object.keys(room.players)) roundScores[pid] = 0;

  for (const cat of CATEGORIES) {
    const answerMap = {};
    for (const [pid, ans] of Object.entries(room.answers)) {
      if (room.voidedAnswers[pid]?.[cat]) continue;
      const val = (ans[cat] || '').trim().toLowerCase();
      if (!val) continue;
      answerMap[pid] = val;
    }

    const freq = {};
    for (const v of Object.values(answerMap)) freq[v] = (freq[v] || 0) + 1;
    for (const [pid, val] of Object.entries(answerMap)) {
      roundScores[pid] += freq[val] === 1 ? 10 : 5;
    }
  }
  return roundScores;
}

function emitRoundEnd(roomId) {
  const room = rooms[roomId];
  const roundScores = room.lastRoundScores;

  const playersInfo = Object.entries(room.players).map(([pid, p]) => ({
    id: pid,
    name: p.name,
    roundScore: roundScores[pid] || 0,
    totalScore: room.scores[pid] || 0,
    isBot: p.isBot || false,
  })).sort((a, b) => b.totalScore - a.totalScore);

  io.to(roomId).emit('round_end', {
    letter: room.letter,
    categories: CATEGORIES,
    answers: room.answers,
    voidedAnswers: room.voidedAnswers,
    playerNames: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, p.name])),
    roundScores,
    players: playersInfo,
    round: room.round,
    total: room.roundsToPlay,
  });

  if (room.state === 'finished') {
    io.to(roomId).emit('game_over', { players: playersInfo });
  }
}

function endRound(roomId) {
  const room = rooms[roomId];
  if (!room || room.state !== 'playing') return;
  clearInterval(room.timer);
  room.state = 'scoring';
  room.voidedAnswers = {};

  const roundScores = calcRoundScores(room);
  room.lastRoundScores = { ...roundScores };

  for (const pid of Object.keys(room.players)) {
    room.scores[pid] = (room.scores[pid] || 0) + (roundScores[pid] || 0);
  }

  if (room.round >= room.roundsToPlay) room.state = 'finished';

  emitRoundEnd(roomId);
}

function lobbyInfo(room) {
  return {
    roomId: room.id,
    players: Object.entries(room.players).map(([id, p]) => ({ id, name: p.name, isHost: p.isHost })),
    rounds: room.roundsToPlay,
  };
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

  socket.on('create_bot_game', ({ name, difficulty, rounds }) => {
    const diff = DIFFICULTY_CONFIG[difficulty] ? difficulty : 'medium';
    const roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
    rooms[roomId] = makeRoom(roomId);
    const room = rooms[roomId];
    room.roundsToPlay = Math.max(1, Math.min(10, parseInt(rounds) || 3));
    room.isBotGame = true;

    room.players[socket.id] = { name, isHost: true };
    room.scores[socket.id] = 0;
    socket.join(roomId);
    socket.data.roomId = roomId;

    const botNames = ['🤖 روبوت ١', '🤖 روبوت ٢', '🤖 روبوت ٣'];
    for (let i = 1; i <= 3; i++) {
      const botId = `bot_${roomId}_${i}`;
      room.players[botId] = { name: botNames[i - 1], isHost: false, isBot: true, difficulty: diff };
      room.scores[botId] = 0;
    }

    socket.emit('bot_game_created', { playerId: socket.id });
    setTimeout(() => startRound(roomId), 300);
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

  socket.on('update_rounds', ({ rounds }) => {
    const room = rooms[socket.data.roomId];
    if (!room || !room.players[socket.id]?.isHost) return;
    room.roundsToPlay = Math.max(1, Math.min(10, parseInt(rounds) || 5));
  });

  socket.on('start_game', () => {
    const room = rooms[socket.data.roomId];
    if (!room) return;
    if (!room.players[socket.id]?.isHost) return;
    startRound(socket.data.roomId);
  });

  socket.on('submit_answers', ({ answers }) => {
    const room = rooms[socket.data.roomId];
    if (!room || room.state !== 'playing') return;
    room.answers[socket.id] = answers;
    room.submitted.add(socket.id);
    const allIn = Object.keys(room.players).every(pid => room.submitted.has(pid));
    if (allIn) endRound(socket.data.roomId);
  });

  socket.on('void_answer', ({ playerId, category }) => {
    const room = rooms[socket.data.roomId];
    if (!room || room.state !== 'scoring') return;
    if (!room.players[socket.id]?.isHost) return;

    if (!room.voidedAnswers[playerId]) room.voidedAnswers[playerId] = {};
    room.voidedAnswers[playerId][category] = true;

    const newScores = calcRoundScores(room);
    for (const pid of Object.keys(room.players)) {
      room.scores[pid] = (room.scores[pid] || 0)
        - (room.lastRoundScores[pid] || 0)
        + (newScores[pid] || 0);
    }
    room.lastRoundScores = { ...newScores };

    emitRoundEnd(socket.data.roomId);
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
    room.usedLetters = [];
    room.scores = {};
    for (const pid of Object.keys(room.players)) room.scores[pid] = 0;
    if (room.isBotGame) {
      startRound(socket.data.roomId);
    } else {
      room.state = 'waiting';
      io.to(socket.data.roomId).emit('lobby_update', lobbyInfo(room));
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const room = rooms[roomId];
    if (!room) return;
    delete room.players[socket.id];
    delete room.scores[socket.id];

    if (room.isBotGame) {
      clearInterval(room.timer);
      delete rooms[roomId];
      return;
    }

    if (Object.keys(room.players).length === 0) {
      clearInterval(room.timer);
      delete rooms[roomId];
      return;
    }
    if (!Object.values(room.players).some(p => p.isHost)) {
      Object.values(room.players)[0].isHost = true;
    }
    io.to(roomId).emit('lobby_update', lobbyInfo(room));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Game running at http://localhost:${PORT}`));
