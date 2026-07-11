const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  cors: { origin: '*' },
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.send('OK'));
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// ─── Constants ──────────────────────────────────────────────────────────────
const ARABIC_LETTERS = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];
const CATEGORIES = ['إنسان', 'حيوان', 'شيء', 'مدينة', 'دولة'];
const ROUND_DURATION = 60;

// Phonetic hint shown in UI when English/French is active
const ARABIC_PHONETIC = {
  'ا':'A','ب':'B','ت':'T','ث':'S','ج':'J','ح':'H','خ':'H',
  'د':'D','ذ':'Z','ر':'R','ز':'Z','س':'S','ش':'SH','ص':'S',
  'ض':'D','ط':'T','ع':'A','غ':'G','ف':'F','ق':'K','ك':'K',
  'ل':'L','م':'M','ن':'N','ه':'H','و':'W','ي':'Y',
};

const DIFFICULTY_CONFIG = {
  easy:   { minMs: 40000, maxMs: 55000, fillRate: 0.55 },
  medium: { minMs: 20000, maxMs: 40000, fillRate: 0.80 },
  hard:   { minMs:  5000, maxMs: 15000, fillRate: 0.95 },
};

// ─── Word Banks ──────────────────────────────────────────────────────────────
// MSA base — expanded pools per letter
const BOT_WORDS = {
  'إنسان': {
    'ا': ['أحمد','إبراهيم','أمير','أنس','أيمن','إيمان','أسامة','أسماء','أروى','أيوب','إسلام','أنوار','إبتسام','أميرة','إياد'],
    'ب': ['بلال','بدر','بسام','بشار','بيان','بريم','بثينة','باسل','بدرية','برهان'],
    'ت': ['تامر','تركي','توفيق','تيسير','تغريد','تبارك'],
    'ث': ['ثامر','ثابت','ثريا'],
    'ج': ['جمال','جاسم','جواد','جنى','جابر','جميلة','جهاد','جبير','جلال'],
    'ح': ['حسن','حمد','حنان','حسام','حسين','حيدر','حمزة','حفيظ','حمدي','حورية','حازم','حمودة'],
    'خ': ['خالد','خلود','خضر','خديجة','خليل','خضيرة','خلف','خيري'],
    'د': ['داوود','دانا','دلال','ديما','درار','دينا','دياب'],
    'ذ': ['ذياب','ذيب','ذكاء'],
    'ر': ['رامي','رنا','رشيد','ريم','رانيا','ربيع','ريان','رغد','رائد','رلى','رياض'],
    'ز': ['زياد','زينب','زكريا','زاهر','زهرة','زهير','زينو'],
    'س': ['سالم','سارة','سامي','سلمى','سيف','سعيد','سلطان','سناء','سوسن','سفيان','سمر','سامية'],
    'ش': ['شادي','شيرين','شكري','شهد','شريف','شوقي','شيماء','شاهين'],
    'ص': ['صالح','صفاء','صلاح','صبا','صقر','صهيب','صبحي'],
    'ض': ['ضياء','ضحى','ضيف الله'],
    'ط': ['طارق','طلال','طيبة','طه','طاهر','طلعت','طوطة'],
    'ع': ['علي','عمر','عبدالله','عائشة','عادل','عبير','عصام','عمرو','عزة','علاء','عبدالرحمن','عبدالعزيز'],
    'غ': ['غانم','غادة','غيث','غالية','غالب'],
    'ف': ['فارس','فاطمة','فيصل','فؤاد','فريدة','فريد','فدوى','فهد','فراس'],
    'ق': ['قاسم','قيس','قمر','قتيبة','قصي'],
    'ك': ['كريم','كمال','كوثر','كفاح','كاظم','كنزة'],
    'ل': ['لمى','لين','لؤي','لقمان','لارا','لبنى','لطيفة'],
    'م': ['محمد','مريم','مصطفى','منى','مجد','معتصم','ملك','مروان','مياسة','منصور','مازن','مشاعل'],
    'ن': ['ناصر','نور','نادية','نهاد','نزار','نرمين','نوال','نجاة','نجوى','نبيل','نضال'],
    'ه': ['هاني','هند','هديل','هيثم','هلا','هشام','هناء','هيفاء'],
    'و': ['وليد','وسام','وفاء','وائل','ورد','وجدان','وميض'],
    'ي': ['يوسف','ياسر','يمنى','يزيد','ياسمين','يحيى'],
  },
  'حيوان': {
    'ا': ['أسد','أرنب','أفعى','أخطبوط','أيل','إوزة','أبو قردان','أسماك','أيائل'],
    'ب': ['بقرة','بط','بعير','ببغاء','بطريق','بجعة','برمائيات','بومة'],
    'ت': ['تمساح','تيس','تنين','تمر هندي'],
    'ث': ['ثعلب','ثور','ثعبان','ثديات'],
    'ج': ['جمل','جرذ','جاموس','جراد','جربوع'],
    'ح': ['حمار','حصان','حمامة','حوت','حمل','حلزون','حرباء','حمير','حنش'],
    'خ': ['خروف','خفاش','خرتيت','خيل'],
    'د': ['دب','دجاجة','دلفين','ديك','دعسوقة','دودة','دحلة'],
    'ذ': ['ذئب','ذبابة','ذهبية'],
    'ر': ['ريم','رخم','ربيط'],
    'ز': ['زرافة','زبرا','زواحف'],
    'س': ['سمكة','سلحفاة','سنجاب','سرطان','سمندل','سنونو','ستارة'],
    'ش': ['شمبانزي','شاة','شبل','شابور'],
    'ص': ['صقر','صرصور','صوار'],
    'ض': ['ضبع','ضبي','ضفدع','ضفادع'],
    'ط': ['طاووس','طائر','طيور'],
    'ع': ['عقاب','عنزة','عصفور','عنكبوت','عجل','عقرب','علجوم'],
    'غ': ['غزال','غراب','غوريلا','غرير'],
    'ف': ['فهد','فيل','فأر','فراشة','فرس','فيران'],
    'ق': ['قطة','قرد','قنفذ','قندس','قرش','قنقر'],
    'ك': ['كلب','كنغر','كركدن','كبش','كروان'],
    'ل': ['لبؤة','لقلق','لفاح'],
    'م': ['مها','ماعز','محار','مهر','مارمور'],
    'ن': ['نسر','نمر','نملة','نعامة','نحلة','نمس'],
    'ه': ['همستر','هدهد','هرة'],
    'و': ['وعل','ورل','وروار'],
    'ي': ['يربوع','يمامة'],
  },
  'شيء': {
    'ا': ['أريكة','إبريق','أقلام','أكواب','إبرة','أجراس','إطار','أحذية'],
    'ب': ['باب','بطانية','برواز','بطارية','بيت','بوصلة','بسطة'],
    'ت': ['تلفاز','تلفون','توك','تحفة','تابوت'],
    'ث': ['ثلاجة','ثريا','ثوب'],
    'ج': ['جهاز','جوارب','جنطة','جداريات'],
    'ح': ['حقيبة','حاسوب','حذاء','حنفية','حصيرة','حبل','حاوية'],
    'خ': ['خاتم','خيمة','خزانة','خرطوم','خارطة'],
    'د': ['دفتر','دولاب','درج','دلو','دباسة','دبوس','دراجة'],
    'ذ': ['ذراع','ذاكرة','ذبذبة'],
    'ر': ['راديو','رسالة','رف','ركاب','رمانة','رداء','رباط'],
    'ز': ['زجاجة','زهرية','زلاجة','زاوية'],
    'س': ['سيارة','سكين','سلة','سرير','ساعة','سماعة','سنارة','سلاح'],
    'ش': ['شاشة','شبشب','شوكة','شريط','شمعة','شنطة'],
    'ص': ['صحن','صابون','صندوق','صنبور','صدرية'],
    'ض': ['ضوء','ضفيرة'],
    'ط': ['طاولة','طابع','طنجرة','طاسة','طفاية'],
    'ع': ['عصا','عجلة','عطر','عربة','عصير','علبة','عدسة'],
    'غ': ['غلاية','غطاء','غرفة','غسالة'],
    'ف': ['فرشاة','فرن','فتاحة','فنجان','فأس'],
    'ق': ['قلم','قميص','قدر','قفل','قارورة','قبة'],
    'ك': ['كتاب','كرسي','كمبيوتر','كوب','كمامة','كيس'],
    'ل': ['لمبة','لوحة','لعبة','لباس','لاقط','لصاقة'],
    'م': ['مطرقة','مقص','مفتاح','مكنسة','مصباح','مبرد','مسطرة'],
    'ن': ['نظارة','نافذة','نار','نعل','نعناع'],
    'ه': ['هاتف','هوائي','هدية','هاون','هيكل'],
    'و': ['وسادة','ورقة','وعاء','وتر'],
    'ي': ['يخت','ياقوت','يد','يفطة'],
  },
  'مدينة': {
    'ا': ['أبوظبي','أكادير','أسوان','أمستردام','أنقرة','أثينا','أوسلو'],
    'ب': ['بيروت','بغداد','برلين','بروكسل','بنغازي','بكين','بلغراد'],
    'ت': ['تونس','تبوك','تكريت','طوكيو','تمبكتو'],
    'ث': [],
    'ج': ['جدة','جنيف','جاكرتا','جنوة','جوهانسبرغ'],
    'ح': ['حيفا','حلب','حمص','حائل','حضرموت'],
    'خ': ['خميس مشيط','الخرطوم'],
    'د': ['دبي','دمشق','الدوحة','دكار','دلهي'],
    'ذ': [],
    'ر': ['روما','رام الله','رشيد','ريو'],
    'ز': ['زغرب','الزقازيق','زيورخ'],
    'س': ['سيدني','سنغافورة','سراييفو','سيول','سيفيل'],
    'ش': ['شنغهاي','شيكاغو','شرم الشيخ'],
    'ص': ['صنعاء','صفاقس'],
    'ض': [],
    'ط': ['طرابلس','طنجة','طهران','طوكيو'],
    'ع': ['عمان','عدن','عجمان','عرعر'],
    'غ': ['غرناطة','غيانا'],
    'ف': ['فيينا','فلورنسا','فرانكفورت','فاس'],
    'ق': ['القاهرة','قرطاج','قرطبة'],
    'ك': ['كوالالمبور','الكويت','كراتشي','كابول','كيب تاون'],
    'ل': ['لندن','لاهور','ليشبونة','لوكسمبورغ','لوس أنجلوس'],
    'م': ['مكة','المدينة','مسقط','موسكو','مانيلا','مدريد','مراكش'],
    'ن': ['نيويورك','نيروبي','نابلس','نيقوسيا','نيس'],
    'ه': ['هامبورغ','هونغ كونغ','هلسنكي','هانوي'],
    'و': ['وارسو','واشنطن','وهران'],
    'ي': ['يوكوهاما','يافا'],
  },
  'دولة': {
    'ا': ['الأردن','أمريكا','إيران','إيطاليا','إندونيسيا','أستراليا','إسبانيا','ألمانيا','الإمارات'],
    'ب': ['البرازيل','البحرين','بلجيكا','بنغلاديش','بنما','بلغاريا'],
    'ت': ['تركيا','تونس','تشاد','تايلاند','تنزانيا','تايوان'],
    'ث': [],
    'ج': ['الجزائر','جيبوتي','جامايكا','جورجيا'],
    'ح': [],
    'خ': [],
    'د': ['الدنمارك'],
    'ذ': [],
    'ر': ['روسيا','رواندا','رومانيا'],
    'ز': ['زيمبابوي','زامبيا'],
    'س': ['السعودية','سوريا','السودان','سنغافورة','سريلانكا','سلوفينيا'],
    'ش': ['شيلي','سويسرا'],
    'ص': ['الصين','الصومال'],
    'ض': [],
    'ط': ['طاجيكستان'],
    'ع': ['العراق','عُمان'],
    'غ': ['غانا','غينيا','غواتيمالا'],
    'ف': ['فرنسا','الفلبين','فنزويلا','فنلندا','فيجي'],
    'ق': ['قطر','قبرص','قيرغيزستان'],
    'ك': ['الكويت','كندا','كوريا','كمبوديا','كولومبيا','كينيا'],
    'ل': ['لبنان','ليبيا','ليبيريا','لاوس','لوكسمبورغ'],
    'م': ['مصر','المغرب','موريتانيا','موزمبيق','مالي','المكسيك','ماليزيا'],
    'ن': ['النيجر','نيجيريا','نيبال','نيوزيلندا','نيكاراغوا','النرويج'],
    'ه': ['هولندا','هندوراس','الهند','هنغاريا','هايتي'],
    'و': [],
    'ي': ['اليمن','اليونان'],
  },
};

// ─── Dialect Extensions ──────────────────────────────────────────────────────
// Each dialect adds words on top of the MSA base above.
const DIALECT_EXTRA = {
  egyptian: {
    'إنسان': {
      'ا': ['إسلام','إيهاب','أسماء','إنتصار','إيمان','أيوب'],
      'ب': ['بهجت','بيومي','بدرية'],
      'ح': ['حمادة','حجازي','حنفي','حميدة'],
      'ش': ['شعراوي','شيماء','شحاتة'],
      'ع': ['عصام','عزت','عاطف','عمرو'],
      'م': ['محمود','مبروك','منيرة'],
      'ن': ['نيللي','نبيلة'],
    },
    'شيء': {
      'ا': ['أتوبيس','أكلة'],
      'ب': ['بقلاوة'],
      'ع': ['عربية','عيش'],
      'ش': ['شنطة'],
      'ف': ['فول','فلافل','فتة'],
      'ك': ['كشري','كوباية'],
      'م': ['موبايل','مترو','مكرونة','منيل'],
      'ط': ['طبلية'],
    },
    'مدينة': {
      'ا': ['الإسكندرية','الأقصر','أسوان','الإسماعيلية'],
      'ب': ['بورسعيد','بنها','بني سويف'],
      'ج': ['الجيزة'],
      'س': ['السويس','سوهاج'],
      'ط': ['طنطا'],
      'ق': ['القاهرة','قنا'],
      'م': ['المنصورة','المنيا','المحلة'],
    },
  },
  gulf: {
    'إنسان': {
      'ا': ['أنور','أشرف','إبتسام'],
      'ع': ['عبدالعزيز','عبدالرحمن'],
      'ف': ['فهد','فيصل','فلاح'],
      'م': ['مشعل','مطر','منصور'],
      'ن': ['نايف','نواف','نورة'],
      'س': ['سلطان','سلمى','سيف'],
    },
    'شيء': {
      'د': ['دشداشة','دلة'],
      'ع': ['عقال','عبايا'],
      'غ': ['غترة'],
      'ب': ['بشت'],
      'م': ['مجلس','مقهى'],
      'ث': ['ثوب'],
    },
    'مدينة': {
      'ا': ['أبوظبي','أبها'],
      'ب': ['بريدة'],
      'ج': ['جدة'],
      'د': ['دبي','الدمام'],
      'ر': ['الرياض'],
      'ع': ['عجمان'],
      'ف': ['الفجيرة'],
      'ك': ['الكويت'],
      'م': ['المنامة','مسقط'],
      'ن': ['نجران'],
      'ش': ['الشارقة'],
    },
  },
  moroccan: {
    'إنسان': {
      'ا': ['أمين','أيوب','أميمة','إلهام'],
      'ح': ['حكيم','حفيظ'],
      'م': ['منير','مصطفى','مريم'],
      'ن': ['نوال','نجاة','نعيمة'],
      'ي': ['يسمينة','يونس'],
      'ر': ['رشيد','رشيدة'],
    },
    'شيء': {
      'ب': ['برنوس','بغرير'],
      'ج': ['جلابة'],
      'ط': ['طاجين'],
      'ك': ['كسكسي'],
      'م': ['مسمن'],
      'ص': ['صبلاغ'],
      'ح': ['حريرة'],
    },
    'مدينة': {
      'ا': ['أكادير','أصيلة'],
      'ب': ['بني ملال'],
      'ت': ['تطوان','تيزنيت'],
      'خ': ['خريبكة'],
      'ر': ['الرباط'],
      'س': ['سطات','سلا'],
      'ط': ['طنجة'],
      'ف': ['فاس'],
      'م': ['مراكش','مكناس'],
      'و': ['وجدة','ورزازات'],
    },
  },
  levantine: {
    'إنسان': {
      'ا': ['إيناس','آلاء','أنس'],
      'ب': ['بثينة','باسل'],
      'ح': ['حيدر','حسام'],
      'ن': ['نبيل','نادية'],
      'ع': ['عمر','علاء'],
    },
    'شيء': {
      'ب': ['بزورة','بقلاوة'],
      'ح': ['حمص'],
      'ف': ['فلافل','فتوش'],
      'ك': ['كنافة'],
      'م': ['منقوشة','مسخن'],
      'ت': ['تبولة'],
    },
    'مدينة': {
      'ا': ['إربد'],
      'ب': ['بيروت','بعلبك'],
      'ح': ['حلب','حمص','حماة'],
      'د': ['دمشق','درعا'],
      'ط': ['طرابلس'],
      'ق': ['القدس'],
      'ل': ['اللاذقية'],
      'ن': ['نابلس'],
      'ص': ['صيدا','صور'],
      'ع': ['عمان','عجلون'],
    },
  },
  english: {
    'إنسان': {
      'ا': ['Adam','Alice','Alex','Amy','Andrew','Anna','Aaron'],
      'ب': ['Bob','Brian','Betty','Bill','Barbara','Blake'],
      'ت': ['Tom','Tim','Tina','Terry','Tyler'],
      'ج': ['Jack','James','Jane','John','Julia','Jake','Jordan'],
      'ح': ['Harry','Hannah','Henry','Helen','Harvey'],
      'د': ['David','Dan','Diane','Danny','Diana'],
      'ر': ['Robert','Rachel','Ryan','Rebecca','Robin'],
      'ز': ['Zara','Zach','Zoe','Zara'],
      'س': ['Sam','Sarah','Steve','Simon','Sophia','Sandra'],
      'ش': ['Sharon','Shane'],
      'ع': ['Aaron','Amy','Anna','Adam'],
      'ف': ['Frank','Fred','Frances','Fatima'],
      'ق': ['Kevin','Karen','Kyle'],
      'ك': ['Kate','Kim','Karl'],
      'ل': ['Leo','Laura','Linda','Luke','Lisa'],
      'م': ['Michael','Mary','Mark','Maria','Martin'],
      'ن': ['Nick','Nancy','Nathan','Nicole','Neil'],
      'ه': ['Helen','Henry','Hannah'],
      'و': ['William','Wendy','Walter','Wayne'],
      'ي': ['Yasmin','Yusuf','Yara'],
    },
    'حيوان': {
      'ا': ['Antelope','Alligator','Ant','Anteater','Axolotl'],
      'ب': ['Bear','Buffalo','Butterfly','Beaver','Baboon'],
      'ت': ['Tiger','Turtle','Turkey','Toucan','Toad'],
      'ج': ['Jaguar','Jellyfish','Jay'],
      'ح': ['Horse','Hamster','Hippo','Hawk','Hyena','Hedgehog'],
      'د': ['Dolphin','Deer','Duck','Dog','Donkey'],
      'ر': ['Rabbit','Raccoon','Robin','Rooster'],
      'ز': ['Zebra','Zebu'],
      'س': ['Snake','Shark','Squirrel','Spider','Salmon'],
      'ش': ['Sheep','Shrimp'],
      'ع': ['Eagle','Ant','Ape'],
      'ف': ['Fox','Falcon','Frog','Fish','Flamingo'],
      'ق': ['Cat','Kangaroo','Koala'],
      'ك': ['Koala','Kingfisher'],
      'ل': ['Lion','Leopard','Llama','Lizard'],
      'م': ['Monkey','Mouse','Moose','Mole'],
      'ن': ['Narwhal','Nightingale'],
      'ه': ['Horse','Hummingbird','Heron'],
      'و': ['Wolf','Walrus','Weasel','Warthog'],
      'ي': ['Yak'],
    },
    'شيء': {
      'ا': ['Alarm','Apple','Anchor'],
      'ب': ['Bag','Ball','Book','Bottle','Box','Bucket'],
      'ت': ['Table','Tent','Towel','Torch'],
      'ج': ['Jar','Jacket'],
      'ح': ['Hammer','Hat','Hose','Helmet'],
      'د': ['Door','Drum','Desk','Drawer'],
      'ر': ['Radio','Rope','Ruler','Ring'],
      'ز': ['Zipper'],
      'س': ['Scissors','Sofa','Spoon','Shoe','Screen','Sock'],
      'ش': ['Shoe','Shirt','Shelf','Shield'],
      'ع': ['Oven','Axe'],
      'ف': ['Fork','Fan','Frame','Flashlight'],
      'ق': ['Key','Kettle','Knife'],
      'ك': ['Key','Kettle','Kite'],
      'ل': ['Lamp','Ladder','Lock','Lens'],
      'م': ['Mirror','Mug','Map','Mattress','Microphone'],
      'ن': ['Nail','Needle','Net','Notebook'],
      'ه': ['Hanger','Helmet'],
      'و': ['Watch','Wallet','Wheel','Window'],
      'ي': ['Yarn'],
    },
    'مدينة': {
      'ا': ['Amsterdam','Athens','Algiers','Amman'],
      'ب': ['Berlin','Barcelona','Brussels','Baghdad','Beirut','Boston'],
      'ت': ['Tokyo','Toronto','Tunis','Tehran'],
      'ج': ['Jakarta','Geneva'],
      'ح': ['Havana'],
      'د': ['Dubai','Delhi','Dublin'],
      'ر': ['Rome','Riyadh','Rio'],
      'ز': ['Zurich','Zagreb'],
      'س': ['Sydney','Singapore','Seoul','Seville'],
      'ش': ['Shanghai','Chicago'],
      'ع': ['Abu Dhabi','Ankara'],
      'ف': ['Frankfurt','Florence'],
      'ق': ['Cairo','Kabul','Kuwait'],
      'ك': ['Kabul','Kuala Lumpur'],
      'ل': ['London','Los Angeles','Lisbon','Lima'],
      'م': ['Madrid','Mecca','Moscow','Manila','Miami'],
      'ن': ['New York','Nairobi'],
      'ه': ['Hong Kong','Hamburg','Hanoi'],
      'و': ['Warsaw','Washington'],
      'ي': ['Yokohama'],
    },
    'دولة': {
      'ا': ['America','Algeria','Austria','Australia','Argentina'],
      'ب': ['Belgium','Brazil','Bulgaria','Bahrain','Bangladesh'],
      'ت': ['Turkey','Tunisia','Thailand','Tanzania'],
      'ج': ['Germany','Jamaica','Georgia'],
      'ح': ['Hungary'],
      'د': ['Denmark'],
      'ر': ['Russia','Romania','Rwanda'],
      'ز': ['Zimbabwe','Zambia'],
      'س': ['Saudi Arabia','Sudan','Somalia','Singapore'],
      'ش': ['Chile','Switzerland'],
      'ع': ['Iraq','Oman'],
      'ف': ['France','Finland','Philippines'],
      'ق': ['Qatar','Cyprus'],
      'ك': ['Kuwait','Canada','Korea','Kenya','Colombia'],
      'ل': ['Lebanon','Libya','Latvia'],
      'م': ['Morocco','Mauritania','Mexico','Malaysia'],
      'ن': ['Nigeria','Nepal','Niger','Netherlands','Norway'],
      'ه': ['Netherlands','Honduras','Hungary'],
      'ي': ['Yemen'],
    },
  },
  french: {
    'إنسان': {
      'ا': ['Antoine','Amélie','Alexandre','Alice','Arnaud'],
      'ب': ['Baptiste','Bernard','Brigitte','Benoît'],
      'ت': ['Thomas','Théodore','Thierry'],
      'ج': ['Jacques','Jean','Julie','Julien'],
      'ح': ['Henri','Hélène'],
      'د': ['David','Denis','Delphine'],
      'ر': ['Raphaël','René','Renée','Robin'],
      'س': ['Sophie','Simon','Sylvie','Sébastien'],
      'ع': ['Arnaud','Alexis','Anne'],
      'ف': ['François','Fabrice','Florence','Frédéric'],
      'ك': ['Cédric','Christine','Christophe','Clara'],
      'ل': ['Laurent','Louis','Léa','Lucie'],
      'م': ['Marie','Marc','Martin','Margot'],
      'ن': ['Nicolas','Nathalie','Noémie'],
      'ه': ['Hervé','Hélène'],
      'و': ['Vincent','Virginie','Valérie'],
    },
    'حيوان': {
      'ا': ['Autruche','Alligator','Aigle'],
      'ب': ['Bison','Baleine','Bourdon'],
      'ت': ['Tortue','Tigre','Toucan'],
      'ح': ['Hippopotame','Hirondelle'],
      'د': ['Dindon','Dauphin'],
      'ر': ['Renard','Raton laveur'],
      'س': ['Serpent','Singe','Sanglier'],
      'ع': ['Aigle','Abeille','Âne'],
      'ف': ['Faucon','Flamant','Fourmi'],
      'ق': ['Crocodile'],
      'ل': ['Lion','Loup','Lapin'],
      'م': ['Mouton','Mouche','Marmotte'],
      'ه': ['Hibou','Hérisson'],
      'و': ['Vache','Vautour'],
    },
    'شيء': {
      'ا': ['Armoire','Assiette'],
      'ب': ['Bureau','Brosse','Bouteille','Boîte'],
      'ت': ['Table','Tasse'],
      'ر': ['Radio','Rideau','Règle'],
      'س': ['Sac','Savon'],
      'ش': ['Chaussure','Chapeau','Chemise'],
      'ع': [],
      'ف': ['Fourchette','Fenêtre'],
      'ك': ['Crayon','Clé','Couverture'],
      'ل': ['Lampe','Livre','Lit'],
      'م': ['Miroir','Montre','Meuble'],
      'ن': ['Nappe'],
      'و': ['Verre','Voiture','Valise'],
    },
    'مدينة': {
      'ا': ['Amsterdam','Alger','Athènes'],
      'ب': ['Berlin','Barcelone','Bruxelles'],
      'ت': ['Tokyo','Tunis','Toronto'],
      'ج': ['Genève'],
      'د': ['Dubaï','Damas'],
      'ر': ['Rome','Rabat','Rio de Janeiro'],
      'ز': ['Zurich'],
      'س': ['Sydney'],
      'ش': ['Shanghai'],
      'ف': ['Francfort','Florence'],
      'ق': ['Le Caire','Casablanca'],
      'ل': ['Londres','Lisbonne','Lima'],
      'م': ['Madrid','Moscou','Marrakech','Montréal'],
      'ن': ['New York','Naples','Nairobi'],
      'ه': ['Hong Kong','Hambourg'],
      'و': ['Varsovie','Washington'],
    },
    'دولة': {
      'ا': ['Algérie','Autriche','Australie','Albanie'],
      'ب': ['Belgique','Brésil','Bulgarie'],
      'ت': ['Turquie','Tunisie','Thaïlande'],
      'ج': ['Allemagne','Jamaïque','Géorgie'],
      'ح': ['Hongrie'],
      'د': ['Danemark'],
      'ر': ['Russie','Roumanie','Rwanda'],
      'ز': ['Zimbabwe','Zambie'],
      'س': ['Sénégal'],
      'ش': ['Chili','Chine','Suisse'],
      'ف': ['France','Finlande'],
      'ك': ['Koweït','Canada','Cameroun'],
      'ل': ['Liban','Libye'],
      'م': ['Maroc','Mauritanie','Mexique','Malaisie'],
      'ن': ['Nigéria','Népal','Niger','Norvège'],
      'ه': ['Hollande','Honduras'],
      'و': ['Venezuela'],
      'ي': ['Yémen'],
    },
  },
};

// ─── Security Helpers ────────────────────────────────────────────────────────
function sanitize(str, max = 25) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'&\\]/g, '').trim().slice(0, max);
}

function isValidName(s) {
  return typeof s === 'string' && s.trim().length >= 1 && s.trim().length <= 20;
}

// Per-socket rate limiting
const socketRates = new Map();
function rateLimit(socketId, event, max = 10) {
  const key = `${socketId}:${event}`;
  const now = Date.now();
  const e = socketRates.get(key);
  if (!e || now > e.reset) {
    socketRates.set(key, { count: 1, reset: now + 60000 });
    return true;
  }
  e.count++;
  return e.count <= max;
}

// ─── Room State ──────────────────────────────────────────────────────────────
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
    dialects: ['msa'],
    countdownTimer: null,
  };
}

function pickLetter(room) {
  const available = ARABIC_LETTERS.filter(l => !room.usedLetters.includes(l));
  const pool = available.length ? available : ARABIC_LETTERS;
  const letter = pool[Math.floor(Math.random() * pool.length)];
  room.usedLetters.push(letter);
  return letter;
}

// ─── Bot Helpers ─────────────────────────────────────────────────────────────
function getBotPool(cat, letter, dialects) {
  const words = new Set();
  // MSA base is always included
  (BOT_WORDS[cat]?.[letter] || []).forEach(w => words.add(w));
  // Add dialect extras
  for (const d of dialects) {
    if (d === 'msa') continue;
    (DIALECT_EXTRA[d]?.[cat]?.[letter] || []).forEach(w => words.add(w));
  }
  return [...words];
}

function generateBotAnswers(letter, difficulty, botIndex, dialects) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const answers = {};
  for (const cat of CATEGORIES) {
    if (Math.random() > config.fillRate) continue;
    const pool = getBotPool(cat, letter, dialects);
    if (!pool.length) continue;

    // Each bot uses a different offset to reduce answer collisions
    const offset = (botIndex * Math.ceil(pool.length / 3)) % pool.length;
    let idx;
    if (difficulty === 'hard') {
      // Wide range — rarer words
      idx = (offset + Math.floor(Math.random() * pool.length)) % pool.length;
    } else if (difficulty === 'easy') {
      // Narrow range — common words, more collisions expected
      const half = Math.ceil(pool.length / 2);
      idx = (offset + Math.floor(Math.random() * half)) % pool.length;
    } else {
      idx = (offset + Math.floor(Math.random() * pool.length)) % pool.length;
    }
    answers[cat] = pool[idx];
  }
  return answers;
}

function submitBotAnswers(roomId, botId, answers) {
  const room = rooms[roomId];
  if (!room || room.state !== 'playing') return;
  room.answers[botId] = answers;
  room.submitted.add(botId);
  const allIn = Object.keys(room.players).every(pid => room.submitted.has(pid));
  if (allIn) {
    if (room.countdownTimer) { clearTimeout(room.countdownTimer); room.countdownTimer = null; }
    endRound(roomId);
  } else if (room.submitted.size === 1 && !room.countdownTimer) {
    io.to(roomId).emit('countdown_start', { seconds: 3 });
    room.countdownTimer = setTimeout(() => endRound(roomId), 3000);
  }
}

function scheduleBots(roomId) {
  const room = rooms[roomId];
  let botIndex = 0;
  for (const [pid, player] of Object.entries(room.players)) {
    if (!player.isBot) continue;
    const cfg = DIFFICULTY_CONFIG[player.difficulty];
    const delay = cfg.minMs + Math.random() * (cfg.maxMs - cfg.minMs);
    const idx = botIndex++;
    const letter = room.letter;
    const dialects = room.dialects;
    setTimeout(() => {
      submitBotAnswers(roomId, pid, generateBotAnswers(letter, player.difficulty, idx, dialects));
    }, delay);
  }
}

// ─── Game Flow ───────────────────────────────────────────────────────────────
function startRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.round++;
  room.letter = pickLetter(room);
  room.state = 'playing';
  room.answers = {};
  room.submitted = new Set();
  room.timeLeft = ROUND_DURATION;

  for (const pid of Object.keys(room.players)) room.answers[pid] = {};

  io.to(roomId).emit('round_start', {
    round: room.round,
    total: room.roundsToPlay,
    letter: room.letter,
    categories: CATEGORIES,
    timeLeft: room.timeLeft,
    phonetic: ARABIC_PHONETIC[room.letter] || '',
    hasLatinLang: room.dialects.some(d => d === 'english' || d === 'french'),
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
  if (room.countdownTimer) { clearTimeout(room.countdownTimer); room.countdownTimer = null; }
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
    players: Object.entries(room.players).map(([id, p]) => ({
      id, name: p.name, isHost: p.isHost, isBot: p.isBot || false,
    })),
    rounds: room.roundsToPlay,
    dialects: room.dialects,
  };
}

// ─── Matchmaking ─────────────────────────────────────────────────────────────
const matchQueue = []; // { socketId, name, dialects, joinedAt }

function broadcastQueueUpdate() {
  for (const entry of matchQueue) {
    const sock = io.sockets.sockets.get(entry.socketId);
    if (sock) sock.emit('queue_update', { count: matchQueue.length });
  }
}

function removeFromQueue(socketId) {
  const idx = matchQueue.findIndex(e => e.socketId === socketId);
  if (idx !== -1) matchQueue.splice(idx, 1);
}

function tryMatch() {
  if (matchQueue.length < 2) return;
  const now = Date.now();
  const oldest = matchQueue[0];
  const waitedLong = now - oldest.joinedAt >= 25000;

  if (matchQueue.length < 4 && !waitedLong) return;

  const toMatch = matchQueue.splice(0, Math.min(4, matchQueue.length));
  const roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
  rooms[roomId] = makeRoom(roomId);
  const room = rooms[roomId];
  room.roundsToPlay = 5;
  // Merge all requested dialects
  const allDialects = new Set(['msa']);
  toMatch.forEach(p => (p.dialects || ['msa']).forEach(d => allDialects.add(d)));
  room.dialects = [...allDialects];

  toMatch.forEach((entry, i) => {
    const sock = io.sockets.sockets.get(entry.socketId);
    if (!sock) return;
    room.players[entry.socketId] = { name: entry.name, isHost: i === 0 };
    room.scores[entry.socketId] = 0;
    sock.join(roomId);
    sock.data.roomId = roomId;
    sock.emit('matchmaking_found', { roomId, playerId: entry.socketId, isHost: i === 0 });
  });

  io.to(roomId).emit('lobby_update', lobbyInfo(room));
  broadcastQueueUpdate();
}

setInterval(tryMatch, 5000);

// ─── Socket Handlers ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {

  socket.on('create_room', ({ name, rounds, dialects }) => {
    if (!rateLimit(socket.id, 'create_room', 5)) return;
    if (!isValidName(name)) return socket.emit('error', 'اسم غير صالح');
    const safeName = sanitize(name, 20);
    const roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
    rooms[roomId] = makeRoom(roomId);
    const room = rooms[roomId];
    room.roundsToPlay = Math.max(1, Math.min(10, parseInt(rounds) || 5));
    room.dialects = (Array.isArray(dialects) ? dialects : ['msa'])
      .filter(d => ['msa','egyptian','gulf','moroccan','levantine','english','french'].includes(d));
    if (!room.dialects.length) room.dialects = ['msa'];
    room.players[socket.id] = { name: safeName, isHost: true };
    room.scores[socket.id] = 0;
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.emit('room_created', { roomId, playerId: socket.id });
    io.to(roomId).emit('lobby_update', lobbyInfo(room));
  });

  socket.on('create_bot_game', ({ name, difficulty, rounds, dialects }) => {
    if (!rateLimit(socket.id, 'create_bot_game', 5)) return;
    if (!isValidName(name)) return socket.emit('bot_error', 'اسم غير صالح');
    const safeName = sanitize(name, 20);
    const diff = DIFFICULTY_CONFIG[difficulty] ? difficulty : 'medium';
    const roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
    rooms[roomId] = makeRoom(roomId);
    const room = rooms[roomId];
    room.roundsToPlay = Math.max(1, Math.min(10, parseInt(rounds) || 3));
    room.isBotGame = true;
    room.dialects = (Array.isArray(dialects) ? dialects : ['msa'])
      .filter(d => ['msa','egyptian','gulf','moroccan','levantine','english','french'].includes(d));
    if (!room.dialects.length) room.dialects = ['msa'];

    room.players[socket.id] = { name: safeName, isHost: true };
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
    if (!rateLimit(socket.id, 'join_room', 8)) return;
    if (!isValidName(name)) return socket.emit('error', 'اسم غير صالح');
    const safeName = sanitize(name, 20);
    const safeRoomId = sanitize(roomId, 6).toUpperCase();
    const room = rooms[safeRoomId];
    if (!room) return socket.emit('error', 'الغرفة غير موجودة');
    if (room.state !== 'waiting') return socket.emit('error', 'اللعبة بدأت بالفعل');
    if (Object.keys(room.players).length >= 8) return socket.emit('error', 'الغرفة ممتلئة');
    room.players[socket.id] = { name: safeName, isHost: false };
    room.scores[socket.id] = 0;
    socket.join(safeRoomId);
    socket.data.roomId = safeRoomId;
    socket.emit('room_joined', { roomId: safeRoomId, playerId: socket.id });
    io.to(safeRoomId).emit('lobby_update', lobbyInfo(room));
  });

  socket.on('join_matchmaking', ({ name, dialects }) => {
    if (!rateLimit(socket.id, 'join_matchmaking', 5)) return;
    if (!isValidName(name)) return socket.emit('error', 'اسم غير صالح');
    const safeName = sanitize(name, 20);
    removeFromQueue(socket.id);
    const safeDialects = (Array.isArray(dialects) ? dialects : ['msa'])
      .filter(d => ['msa','egyptian','gulf','moroccan','levantine','english','french'].includes(d));
    matchQueue.push({ socketId: socket.id, name: safeName, dialects: safeDialects, joinedAt: Date.now() });
    socket.data.inQueue = true;
    socket.emit('queue_update', { count: matchQueue.length });
    broadcastQueueUpdate();
    tryMatch();
  });

  socket.on('cancel_matchmaking', () => {
    removeFromQueue(socket.id);
    socket.data.inQueue = false;
    broadcastQueueUpdate();
  });

  socket.on('update_rounds', ({ rounds }) => {
    const room = rooms[socket.data.roomId];
    if (!room || !room.players[socket.id]?.isHost) return;
    room.roundsToPlay = Math.max(1, Math.min(10, parseInt(rounds) || 5));
  });

  socket.on('set_dialects', ({ dialects }) => {
    const room = rooms[socket.data.roomId];
    if (!room || !room.players[socket.id]?.isHost || room.state !== 'waiting') return;
    const safe = (Array.isArray(dialects) ? dialects : [])
      .filter(d => ['msa','egyptian','gulf','moroccan','levantine','english','french'].includes(d));
    room.dialects = safe.length ? safe : ['msa'];
    io.to(socket.data.roomId).emit('lobby_update', lobbyInfo(room));
  });

  socket.on('start_game', () => {
    const room = rooms[socket.data.roomId];
    if (!room || !room.players[socket.id]?.isHost) return;
    startRound(socket.data.roomId);
  });

  socket.on('submit_answers', ({ answers }) => {
    if (!rateLimit(socket.id, 'submit_answers', 20)) return;
    const room = rooms[socket.data.roomId];
    if (!room || room.state !== 'playing') return;
    if (room.submitted.has(socket.id)) return;
    // Sanitize each answer
    const safe = {};
    if (answers && typeof answers === 'object') {
      for (const cat of CATEGORIES) {
        safe[cat] = sanitize(answers[cat] || '', 30);
      }
    }
    room.answers[socket.id] = safe;
    room.submitted.add(socket.id);
    const roomId = socket.data.roomId;
    const allIn = Object.keys(room.players).every(pid => room.submitted.has(pid));
    if (allIn) {
      if (room.countdownTimer) { clearTimeout(room.countdownTimer); room.countdownTimer = null; }
      endRound(roomId);
    } else if (room.submitted.size === 1 && !room.countdownTimer) {
      io.to(roomId).emit('countdown_start', { seconds: 3 });
      room.countdownTimer = setTimeout(() => endRound(roomId), 3000);
    }
  });

  socket.on('void_answer', ({ playerId, category }) => {
    const room = rooms[socket.data.roomId];
    if (!room || room.state !== 'scoring') return;
    if (!room.players[socket.id]?.isHost) return;
    if (!room.players[playerId]) return; // validate target player exists
    if (!CATEGORIES.includes(category)) return; // validate category

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
    if (!room || !room.players[socket.id]?.isHost) return;
    if (room.state === 'scoring' && room.round < room.roundsToPlay) {
      startRound(socket.data.roomId);
    }
  });

  socket.on('play_again', () => {
    const room = rooms[socket.data.roomId];
    if (!room || !room.players[socket.id]?.isHost) return;
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

  socket.on('chat_message', ({ text }) => {
    if (!rateLimit(socket.id, 'chat_message', 60)) return;
    const room = rooms[socket.data.roomId];
    if (!room || !room.players[socket.id]) return;
    const safeText = sanitize(text, 200);
    if (!safeText) return;
    io.to(socket.data.roomId).emit('chat_message', {
      playerId: socket.id,
      name: room.players[socket.id].name,
      text: safeText,
    });
  });

  socket.on('rtc_ready', () => {
    socket.to(socket.data.roomId).emit('rtc_peer_joined', { peerId: socket.id });
  });
  socket.on('rtc_leave', () => {
    socket.to(socket.data.roomId).emit('rtc_peer_left', { peerId: socket.id });
  });
  socket.on('rtc_offer', ({ targetId, offer }) => {
    const t = io.sockets.sockets.get(targetId);
    if (t) t.emit('rtc_offer', { fromId: socket.id, offer });
  });
  socket.on('rtc_answer', ({ targetId, answer }) => {
    const t = io.sockets.sockets.get(targetId);
    if (t) t.emit('rtc_answer', { fromId: socket.id, answer });
  });
  socket.on('rtc_ice', ({ targetId, candidate }) => {
    const t = io.sockets.sockets.get(targetId);
    if (t) t.emit('rtc_ice', { fromId: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    socket.to(socket.data.roomId).emit('rtc_peer_left', { peerId: socket.id });
    removeFromQueue(socket.id);
    broadcastQueueUpdate();
    // Clean up rate limit entries
    for (const key of socketRates.keys()) {
      if (key.startsWith(socket.id + ':')) socketRates.delete(key);
    }

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

process.on('uncaughtException', err => console.error('Uncaught exception:', err));
process.on('unhandledRejection', reason => console.error('Unhandled rejection:', reason));

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Game running at http://localhost:${PORT}`));
