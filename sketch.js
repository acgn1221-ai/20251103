// CSV 題庫測驗（p5.js）
let questions = [];
let selected = [];
let current = 0;
let score = 0;
let totalQuestions = 5; // 固定使用前 5 題

let choiceButtons = [];
let message = '';
let particles = [];
let canvasW = 800, canvasH = 360;
let started = false; // 使用者是否按下開始
 
// 版面與字型自適應相關
let currentOrder = ['a','b','c','d']; // 按鈕 idx -> 欄位字母（會被 shuffle）
let baseFontSize = 16;
let questionFontSize = 32;
let titleFontSize = 18;
let smallFontSize = 14;
let scoreFontSize = 28;
let tinyFontSize = 13;
let btnHeight = 32;
let btnGap = 8;
let btnWidth = 280;

// 星空相關變數
let stars = [];
let shootingStars = [];
let driftStars = [];
// 結果用的慶祝星星
let resultStars = [];
let resultStarsSpawned = false;

// 當 fetch 內建 CSV 失敗（例如透過 file:// 開啟時），使用內建字串做為備援
const defaultCSV = `id,question,a,b,c,d,answer,explanation
1,上課總共會點名幾次？,4次,5次,6次,7次,c,本學期共點名 6 次
2,這學期用什麼寫程式？,Notepad,Visual Studio Code,Sublime Text,Atom,b,使用 Visual Studio Code 開發
3,用什麼 AI 寫程式？,ChatGPT,Copilot,GitHub,Bard,c,使用 GitHub 輔助寫程式
4,寫筆記的軟體？,OneNote,Word,Google Docs,HackMD,d,使用 HackMD 寫筆記
5,在哪裡點名？,Teams,iClass,Moodle,Google Meet,b,在 iClass 平台點名
6,甚麼是變數？,儲存資料的容器,網頁元素,編譯器,a,變數用來儲存與操作資料
7,JavaScript 中用於比較是否完全相等的運算子是？,==,=,===,!=,c,=== 會比較值且型別
8,哪一個事件會在使用者點擊按鈕時觸發？,onhover,onclick,onscroll,onload,b,onclick 在點擊時觸發
9,哪個標籤用於引入外部 CSS？,<link>,<style>,<script>,<meta>,a,<link> 用於引入外部資源
10,在 HTML 中用於建立段落的是？,<p>,<div>,<span>,<section>,a,<p> 用於段落
11,哪個 CSS 屬性用於改變字體大小？,font-size,font-weight,color,display,a,font-size 控制文字大小
12,哪個事件會在表單提交時觸發？,onsubmit,onclick,onchange,onload,a,onsubmit 在提交時觸發
13,JavaScript 中用於宣告常數的關鍵字是？,let,var,const,static,c,const 用於宣告常數
14,哪個方法用於選取 DOM 元素？,getElementById,querySelector,selectElement,findElement,b,querySelector 可使用 CSS 選擇器
15,何者為 HTTP 狀態碼 404 的含意？,成功,未找到,伺服器錯誤,未授權,b,404 表示未找到
16,在 CSS 中要讓元素水平置中，常用哪個屬性？,margin:auto,align:center,text-align:center,display:flex,a,margin:auto 常搭配寬度使用
17,哪一個標籤用於包含 JavaScript 程式碼？,<script>,<code>,<js>,<source>,a,<script> 用於放置 JS
18,在 JavaScript 中要把字串轉成數字可以用哪個函數？,Number,parseInt,parseFloat,以上皆可,d,以上皆可
19,哪一個屬性可讓元素不佔版面但仍保有其位置？,visibility:hidden,display:none,opacity:0,position:absolute,a,visibility:hidden 會隱藏但保留空間
20,哪個 CSS 選擇器會選取具有特定 class 的元素？,#id,.class,tag,*,b,.class 選取 class
`;

function setup() {
  // 建立 canvas 在 canvasHolder 裡
  const holder = select('#canvasHolder');
  const cnv = createCanvas(canvasW, canvasH);
  cnv.parent('canvasHolder');

  textFont('Verdana');
  rectMode(CORNER);

  // 建立四個選項按鈕（使用 p5 DOM）
  for (let i = 0; i < 4; i++) {
    const b = createButton('');
    b.addClass('choiceBtn');
    b.mousePressed(() => handleChoice(i));
    choiceButtons.push(b);
  }

  // 連結按鈕
  const restart = document.getElementById('btnRestart');
  restart.addEventListener('click', () => {
    if (questions.length > 0) {
      started = false; // 停止目前測驗，回到準備狀態
      restartQuiz();
      message = '已重設題庫，按「開始測驗」開始。';
    }
  });

  const startBtn = document.getElementById('btnStart');
  startBtn.addEventListener('click', () => {
    if (!questions || questions.length === 0) {
      message = '題庫尚未載入，請放置 questions.csv 或重新整理頁面';
      return;
    }
    startQuiz();
  });

  // 初始載入內建 CSV（不自動開始，等待使用者按「開始測驗」）
  fetch('questions.csv').then(r => r.text()).then(t => {
    const data = parseCSV(t);
    questions = normalizeQuestions(data);
    if (questions.length === 0) {
      message = '題庫載入失敗或無題目，使用預設題庫';
      questions = normalizeQuestions(parseCSV(defaultCSV));
    } else {
      message = `已載入 ${questions.length} 題，按「開始測驗」開始。`;
    }
  }).catch(err => {
    console.warn('fetch questions.csv failed, using embedded default CSV', err);
    questions = normalizeQuestions(parseCSV(defaultCSV));
    message = `使用預設題庫，共 ${questions.length} 題，按「開始測驗」開始。`;
  });

  updateButtonPositions();
  // 建立星空
  createStars();
}

function windowResized() {
  // 畫面大小改變：調整 canvas 寬度與按鈕位置
  const holder = select('#canvasHolder');
  if (holder && holder.elt) {
    const w = Math.min(900, Math.max(320, holder.elt.clientWidth || windowWidth - 40));
    resizeCanvas(w, canvasH);
  }
  updateButtonPositions();
  createStars();
}

function computeLayout() {
  // 根據畫布寬度調整字型與按鈕尺寸
  baseFontSize = Math.round(constrain(width / 46, 12, 30));
  titleFontSize = Math.round(baseFontSize * 1.1);
  questionFontSize = Math.round(baseFontSize * 2.0);
  smallFontSize = Math.round(baseFontSize * 0.95);
  scoreFontSize = Math.round(baseFontSize * 1.9);
  tinyFontSize = Math.max(11, Math.round(baseFontSize * 0.7));
  btnHeight = Math.max(30, Math.round(baseFontSize * 1.8));
  btnGap = Math.max(6, Math.round(baseFontSize * 0.5));
  btnWidth = Math.min(420, width - 40);
}

function updateButtonPositions() {
  computeLayout();
  // 把按鈕放在畫布下方
  const cnv = select('canvas');
  if (!cnv) return;
  const rect = cnv.elt.getBoundingClientRect();
  const x = rect.left;
  const y = rect.top + cnv.elt.height + 10;

  const startX = x + (cnv.elt.width - btnWidth) / 2; // 水平置中
  for (let i = 0; i < choiceButtons.length; i++) {
    const b = choiceButtons[i];
    const px = startX;
    const py = y + i * (btnHeight + btnGap); // 垂直排列
    b.position(px, py);
    b.size(btnWidth, btnHeight);
    // 調整按鈕字型大小
    b.style('font-size', baseFontSize + 'px');
    b.style('line-height', btnHeight + 'px');
  }
}

function draw() {
  // 夜空底色
  background(6, 12, 28);

  // 更新並繪製恆星
  // 畫漂浮微星（在恆星前面但在題目卡片後面）
  for (let d of driftStars) {
    d.update();
    d.draw();
  }

  // 更新並繪製恆星
  for (let s of stars) {
    s.update();
    s.draw();
  }

  // 偶爾產生流星
  if (random() < 0.006 && shootingStars.length < 3) shootingStars.push(new ShootingStar());
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    shootingStars[i].update();
    shootingStars[i].draw();
    if (shootingStars[i].done) shootingStars.splice(i, 1);
  }

  // 題目卡片（半透明）
  noStroke();
  fill(12, 22, 38, 200);
  rect(10, 10, width - 20, height - 20, 10);
  // 外暈光
  push();
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = 'rgba(30,120,255,0.06)';
  fill(12,22,38,0);
  rect(10, 10, width - 20, height - 20, 10);
  pop();

  // 依畫面計算字型與按鈕尺寸
  computeLayout();
  fill(230);
  textSize(smallFontSize);
  if (questions.length === 0) {
    textAlign(LEFT, TOP);
    text(message, 20, 20);
    return;
  }

  if (current >= selected.length) {
    // 顯示成績
    showResult();
    return;
  }

  const q = questions[selected[current]];
  textAlign(LEFT, TOP);
  textSize(titleFontSize);
  fill(240);
  text(`題目 ${current+1} / ${selected.length}`, 28, 22);

  // 題目字體大小改為 32px 並以雙引號括起
  textSize(questionFontSize);
  fill(240);
  text(`"${q.question}"`, 28, 54, width - 56, 160);

  // 顯示提示/回饋文字
  textSize(smallFontSize);
  fill(180);
  text(message, 28, height - 48);

  // particles（使用加法混合來強調光亮）
  blendMode(ADD);
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].done) particles.splice(i, 1);
  }
  blendMode(BLEND);
}

function handleChoice(idx) {
  if (!started) return;
  if (current >= selected.length) return;
  // prevent double click
  disableChoiceButtons(true);

  const q = questions[selected[current]];
  // 透過 currentOrder 來對應按鈕與原始欄位 (a/b/c/d)
  const chosenKey = currentOrder[idx];
  const correct = (String(q.answer).trim().toLowerCase() === String(chosenKey).toLowerCase());
  if (correct) {
    score++;
    message = '答對！' + (q.explanation ? ('  說明：' + q.explanation) : '');
    spawnParticles('good', 64); // 答對的彩帶多一點
  } else {
    message = `答錯，正確答案：${q.answer.toUpperCase()}。` + (q.explanation ? (' 說明：' + q.explanation) : '');
    spawnParticles('bad', 12); // 答錯的少一點
    shakeCanvas();
  }

  // 顯示一段時間後進下一題
  setTimeout(() => {
    current++;
    message = '';
    if (current < selected.length) {
      refreshChoices();
    }
    disableChoiceButtons(false);
  }, 1100);
}

function spawnParticles(type, count = 28) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(random(100, width - 100), random(80, height - 80), type));
  }
}

// spawn result celebration stars
function spawnResultStars(score) {
  // score ranges 0..totalQuestions
  const pct = Math.round((score / Math.max(1, totalQuestions)) * 100);
  let count = 12;
  let speed = 2;
  let sizeRange = [3, 6];
  let colors = [[200,220,255]]; // default pale
  if (pct >= 80) {
    count = 48; speed = 4; sizeRange = [4, 10]; colors = [[255,220,120],[180,230,255],[220,180,255]];
    // add a few shooting stars for high score
    for (let i = 0; i < 6; i++) if (shootingStars.length < 8) shootingStars.push(new ShootingStar());
  } else if (pct >= 40) {
    count = 22; speed = 3; sizeRange = [3, 8]; colors = [[200,240,220],[200,220,255]];
  } else {
    count = 8; speed = 1.6; sizeRange = [2, 6]; colors = [[180,190,200]];
  }

  for (let i = 0; i < count; i++) {
    const x = random(width * 0.15, width * 0.85);
    const y = random(height * 0.15, height * 0.65);
    const vx = random(-speed, speed);
    const vy = random(-speed * 0.2, -speed * 0.6);
    const sz = random(sizeRange[0], sizeRange[1]);
    const col = colors[floor(random(colors.length))];
    resultStars.push(new ResultStar(x, y, vx, vy, sz, col));
  }
}

function showResult() {
  // 隱藏按鈕
  disableChoiceButtons(true);
  // 顯示成績在畫布中心
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(scoreFontSize);
  text(`完成！得分 ${score} / ${selected.length}`, width/2, height/2 - 30);

  const pct = Math.round((score / selected.length) * 100);
  let fbLines = [];
  if (pct === 100) fbLines = ['太棒了！完美！', '你掌握得非常好，繼續保持！', '挑戰更高難度或新增題庫試試看！'];
  else if (pct >= 80) fbLines = ['很好！很接近完美。', '再練習幾次就能達到完美。', '很棒的表現！'];
  else if (pct >= 60) fbLines = ['不錯，還有進步空間。', '針對錯題再復習一次會更好。', '加油，你可以的！'];
  else fbLines = ['建議再多練習，加油！', '錯誤是最好的老師，下次會更好。', '別放棄，持續練習！'];

  textSize(titleFontSize);
  // 顯示多行鼓勵文字
  for (let i = 0; i < fbLines.length; i++) {
    text(fbLines[i], width/2, height/2 + 10 + i * 22);
  }

  // 顯示重試提示
  textSize(tinyFontSize);
  fill(200);
  text('按上方「重設/重新測驗」重新開始', width/2, height/2 + 10 + fbLines.length * 22 + 12);
  // spawn result celebration stars once
  if (!resultStarsSpawned) {
    spawnResultStars(score);
    resultStarsSpawned = true;
  }

  // 更新並繪製結果星星
  blendMode(ADD);
  for (let i = resultStars.length - 1; i >= 0; i--) {
    resultStars[i].update();
    resultStars[i].draw();
    if (resultStars[i].done) resultStars.splice(i, 1);
  }
  blendMode(BLEND);
}

function disableChoiceButtons(dis) {
  for (let b of choiceButtons) {
    if (b && b.elt) b.elt.disabled = dis ? true : false;
  }
}

function restartQuiz() {
  score = 0;
  current = 0;
  message = '';
  particles = [];
  // 清除結果星星與標記
  resultStars = [];
  resultStarsSpawned = false;

  // 固定使用前 5 題
  selected = [0, 1, 2, 3, 4]; // 使用題庫中的前 5 題

  // 設定按鈕文字
  // 若畫布寬度需依容器調整
  const holder = select('#canvasHolder');
  if (holder && holder.elt) {
    const w = Math.min(900, Math.max(320, holder.elt.clientWidth || windowWidth - 40));
    resizeCanvas(w, canvasH);
  }
  refreshChoices();
  updateButtonPositions();
  disableChoiceButtons(false);
}

function refreshChoices() {
  // 將按鈕文字更新為目前題目的選項
  if (!questions || selected.length === 0) return;
  if (current >= selected.length) return;
  const q = questions[selected[current]];
  // 建立選項物件
  const opts = { a: q.a || '', b: q.b || '', c: q.c || '', d: q.d || '' };
  // 隨機化按鈕顯示順序（currentOrder 對應到按鈕索引）
  currentOrder = ['a','b','c','d'];
  shuffleArray(currentOrder);
  for (let i = 0; i < choiceButtons.length; i++) {
    const letter = currentOrder[i];
    const label = opts[letter] || '';
    choiceButtons[i].html(`${letter.toUpperCase()}. ${label}`);
  }
}

function handleFileUpload(e) {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target.result;
    const data = parseCSV(text);
    const parsed = normalizeQuestions(data);
    if (parsed.length === 0) {
      message = '上傳的 CSV 無效或無題目';
      return;
    }
    const append = document.getElementById('appendCheckbox') && document.getElementById('appendCheckbox').checked;
    if (append && questions && questions.length > 0) {
      // 簡單合併（若有 id 重複不去重）
      questions = questions.concat(parsed);
      message = `已新增 ${parsed.length} 題，題庫現有 ${questions.length} 題，按「開始測驗」開始。`;
    } else {
      questions = parsed;
      message = `已載入 ${questions.length} 題，按「開始測驗」開始。`;
    }
  };
  reader.readAsText(f, 'utf-8');
}

// 以難度由簡入難地選題並開始測驗
function startQuiz() {
  // 固定使用前 5 題
  selected = [0, 1, 2, 3, 4];

  // 重置計分與狀態
  score = 0; current = 0; message = '';
  started = true;
  refreshChoices();
  updateButtonPositions();
  disableChoiceButtons(false);
}

// 將 CSV 的 array-of-objects 轉成我們期望的欄位名，如果缺欄或空白會補空字串
function normalizeQuestions(rows) {
  if (!rows || rows.length === 0) return [];
  return rows.map(r => ({
    id: r.id || '',
    question: r.question || r.q || '',
    a: r.a || '',
    b: r.b || '',
    c: r.c || '',
    d: r.d || '',
    answer: (r.answer || '').toString().trim(),
    explanation: r.explanation || ''
  })).filter(r => r.question && (r.a || r.b || r.c || r.d));
}

// 簡單洗牌
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// 基本的 CSV 解析器（支援雙引號包住的欄位）
function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length === 0) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j].trim()] = (cells[j] !== undefined) ? cells[j] : '';
    }
    rows.push(obj);
  }
  return rows;
}

function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

// 簡單的 confetti / particle
class Particle {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.vx = random(-3, 3);
    this.vy = random(-6, -1);
    this.life = 90;
    this.size = random(4, 9);
    this.type = type;
    this.done = false;
    // 儲存為 RGB 陣列，方便在 draw 時帶入 alpha
    if (type === 'good') this.col = [random(120,220), random(180,255), random(150,255)];
    else this.col = [255,120,120];
  }
  update() {
    this.vy += 0.18; // gravity
    this.x += this.vx; this.y += this.vy;
    this.life--;
    if (this.life <= 0) this.done = true;
  }
  draw() {
    push();
    noStroke();
    const a = map(this.life, 0, 90, 0, 255);
    fill(this.col[0], this.col[1], this.col[2], a);
    translate(this.x, this.y);
    rotate(frameCount * 0.06);
    rect(0, 0, this.size, this.size);
    pop();
  }
}

// 用於結果畫面的星星（較慢且有光暈）
class ResultStar {
  constructor(x, y, vx, vy, size, col) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.size = size;
    this.col = col || [255, 230, 200];
    this.life = random(100, 220);
    this.alpha = 255;
    this.done = false;
    this.phase = random(TWO_PI);
  }
  update() {
    this.vy += 0.03; // slight gravity
    this.x += this.vx;
    this.y += this.vy;
    this.phase += 0.04;
    this.alpha = map(this.life, 0, 220, 0, 255);
    this.life--;
    if (this.life <= 0) this.done = true;
  }
  draw() {
    push();
    noStroke();
    const glow = this.size * 2.5 + sin(this.phase) * 1.5;
    drawingContext.shadowBlur = glow * 2.2;
    drawingContext.shadowColor = `rgba(${this.col[0]},${this.col[1]},${this.col[2]},${this.alpha/255})`;
    fill(this.col[0], this.col[1], this.col[2], this.alpha);
    translate(this.x, this.y);
    rotate(this.phase);
    // draw a small star-like polygon (simple cross)
    beginShape();
    for (let i = 0; i < 4; i++) {
      vertex(0, -this.size);
      rotate(PI/2);
    }
    endShape(CLOSE);
    // core
    fill(255, 255, 255, this.alpha);
    circle(0, 0, this.size * 0.9);
    pop();
  }
}

// 畫布搖晃效果（用 CSS 快速實作）
function shakeCanvas() {
  const c = select('#canvasHolder');
  if (!c) return;
  c.elt.classList.add('shake');
  setTimeout(() => c.elt.classList.remove('shake'), 400);
}

// ===== 星空：Star & ShootingStar =====
function createStars() {
  stars = [];
  const count = Math.max(40, Math.floor(width * 0.12));
  for (let i = 0; i < count; i++) {
    stars.push(new Star(random(0, width), random(0, height), random(0.6, 2.8)));
  }
  // 建立漂浮微星
  driftStars = [];
  const dcount = Math.max(6, Math.floor(width * 0.02));
  for (let i = 0; i < dcount; i++) {
    driftStars.push(new DriftStar(random(0, width), random(0, height), random(1, 3)));
  }
}

class Star {
  constructor(x, y, size) {
    this.x = x; this.y = y; this.size = size;
    this.baseAlpha = random(120, 255);
    this.phase = random(TWO_PI);
    this.twinkle = random(0.01, 0.06);
  }
  update() {
    this.phase += this.twinkle;
    this.alpha = this.baseAlpha + sin(this.phase) * 60;
  }
  draw() {
    noStroke();
    fill(255, this.alpha);
    circle(this.x, this.y, this.size);
  }
}

class ShootingStar {
  constructor() {
    this.x = random(-width * 0.2, width * 0.2);
    this.y = random(0, height * 0.4);
    this.vx = random(8, 18);
    this.vy = random(3, 8);
    this.len = random(80, 180);
    this.life = 60;
    this.done = false;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.x - this.len > width || this.y > height + 40 || this.life <= 0) this.done = true;
  }
  draw() {
    strokeWeight(2);
    // 流星顏色改為 #aecbeb (174,203,235)
    stroke(174, 203, 235, 220);
    line(this.x, this.y, this.x - this.len * 0.6, this.y - this.len * 0.2);
    stroke(174, 203, 235, 120);
    point(this.x, this.y);
  }
}

// 漂浮微星（慢速漂移）
class DriftStar {
  constructor(x, y, size) {
    this.x = x; this.y = y; this.size = size;
    this.alpha = random(60, 180);
    // 往右下方漂移（由左上往右下飄）
    this.vx = random(0.2, 0.8);
    this.vy = random(0.08, 0.4);
    this.tw = random(0.005, 0.02);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha = constrain(this.alpha + sin(frameCount * this.tw) * 0.8, 30, 220);
    // 當超出右或下邊界時，回到左上方重新漂流
    if (this.x > width + 10 || this.y > height + 10) {
      this.x = random(-60, -10);
      this.y = random(-40, height * 0.25);
    }
  }
  draw() {
    noStroke();
    fill(255, this.alpha * 0.6);
    circle(this.x, this.y, this.size);
  }
}

