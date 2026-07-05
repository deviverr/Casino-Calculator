(() => {
  'use strict';

  const SAVE_KEY = 'casino-calculator-v1';
  const MIN_BET = 10;
  const COMP = 100;
  const START_CHIPS = 500;

  // profit multiplier & decision time per difficulty tier
  const TIERS = {
    1: { mult: 1,   time: 7000, odds: '1:1' },
    2: { mult: 1.5, time: 6000, odds: '3:2' },
    3: { mult: 2,   time: 5500, odds: '2:1' },
    4: { mult: 3,   time: 5000, odds: '3:1' },
  };

  // ---------- state ----------
  let chips = START_CHIPS;
  let best = 0;
  let muted = false;
  let streak = 0;
  let bet = 0;
  let phase = 'betting'; // betting | deciding | offer | flipping | bust
  let round = null;      // { text, isTrue, answer, tier }
  let winnings = 0;      // amount at stake in double-or-nothing
  let timerId = null;
  let resetArmed = false;

  // ---------- dom ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    chips: $('statChips'), streak: $('statStreak'), best: $('statBest'),
    tag: $('displayTag'), main: $('displayMain'),
    display: document.querySelector('.display'),
    calculator: $('calculator'),
    timerFill: $('timerFill'),
    gamblePad: $('gamblePad'), calcPad: $('calcPad'),
    groupBet: $('groupBet'), groupDecide: $('groupDecide'),
    groupOffer: $('groupOffer'), groupBust: $('groupBust'),
    tabGamble: $('tabGamble'), tabCalc: $('tabCalc'),
    soundBtn: $('soundBtn'), resetBtn: $('resetBtn'),
  };

  // ---------- persistence ----------
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ chips, best, muted }));
    } catch (e) { /* private mode: play without saving */ }
  }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (d) {
        chips = Number.isFinite(d.chips) ? d.chips : START_CHIPS;
        best = Number.isFinite(d.best) ? d.best : 0;
        muted = !!d.muted;
      }
    } catch (e) { /* corrupt save: start fresh */ }
  }

  // ---------- sound ----------
  let actx = null;
  function tone(freq, dur, delay = 0, type = 'square', gain = 0.04) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t = actx.currentTime + delay;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(actx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (e) { /* no audio available */ }
  }

  const snd = {
    click: () => tone(700, 0.05),
    deal: () => { tone(500, 0.06); tone(800, 0.06, 0.08); },
    win: () => [660, 880, 1100].forEach((f, i) => tone(f, 0.12, i * 0.09)),
    lose: () => [400, 300, 220].forEach((f, i) => tone(f, 0.15, i * 0.12, 'sawtooth')),
    coin: () => { tone(1200, 0.08); tone(1600, 0.12, 0.06); },
    jackpot: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.15, i * 0.08, 'triangle', 0.06)),
  };

  // ---------- rendering ----------
  function setDisplay(tag, main) {
    el.tag.textContent = tag;
    el.main.textContent = main;
    el.main.classList.toggle('small', String(main).length > 14);
  }

  function bumpStat(node) {
    node.classList.remove('bump');
    void node.offsetWidth;
    node.classList.add('bump');
  }

  function renderStats() {
    el.chips.textContent = chips;
    el.streak.textContent = streak > 0 ? `🔥${streak}` : '0';
    el.best.textContent = best;
  }

  function showGroup(name) {
    for (const g of ['groupBet', 'groupDecide', 'groupOffer', 'groupBust']) {
      el[g].classList.toggle('hidden', g !== name);
    }
  }

  function flashDisplay(kind) {
    el.display.classList.remove('flash-win', 'flash-lose');
    void el.display.offsetWidth;
    el.display.classList.add(kind === 'win' ? 'flash-win' : 'flash-lose');
  }

  function shake() {
    el.calculator.classList.remove('shake');
    void el.calculator.offsetWidth;
    el.calculator.classList.add('shake');
  }

  // ---------- timer ----------
  function startTimer(ms, onExpire) {
    clearTimeout(timerId);
    el.timerFill.style.transition = 'none';
    el.timerFill.style.transform = 'scaleX(1)';
    void el.timerFill.offsetWidth;
    el.timerFill.style.transition = `transform ${ms}ms linear`;
    el.timerFill.style.transform = 'scaleX(0)';
    timerId = setTimeout(onExpire, ms);
  }

  function stopTimer() {
    clearTimeout(timerId);
    timerId = null;
    el.timerFill.style.transition = 'none';
    el.timerFill.style.transform = 'scaleX(0)';
  }

  // ---------- question generator ----------
  const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

  function tierFor(s) {
    if (s >= 10) return 4;
    if (s >= 6) return 3;
    if (s >= 3) return 2;
    return 1;
  }

  function bluff(answer) {
    for (let i = 0; i < 25; i++) {
      let wrong;
      if (Math.random() < 0.5) {
        const deltas = [1, 2, 3, 4, 5, 6, 10, 20, 100];
        const d = deltas[ri(0, deltas.length - 1)];
        wrong = answer + (Math.random() < 0.5 ? -d : d);
      } else {
        const digits = String(answer).split('');
        if (digits.length >= 2) {
          const j = ri(0, digits.length - 2);
          [digits[j], digits[j + 1]] = [digits[j + 1], digits[j]];
          wrong = parseInt(digits.join(''), 10);
        } else {
          wrong = answer + ri(1, 5);
        }
      }
      if (wrong !== answer && wrong > 0) return wrong;
    }
    return answer + 1;
  }

  function makeRound(s) {
    const tier = tierFor(s);
    let a, b, c, answer, expr;
    switch (tier) {
      case 1:
        a = ri(11, 99); b = ri(11, 99);
        if (Math.random() < 0.5) { answer = a + b; expr = `${a} + ${b}`; }
        else { if (b > a) [a, b] = [b, a]; answer = a - b; expr = `${a} − ${b}`; }
        break;
      case 2:
        if (Math.random() < 0.6) { a = ri(3, 9); b = ri(12, 99); answer = a * b; expr = `${a} × ${b}`; }
        else { a = ri(101, 999); b = ri(101, 999); answer = a + b; expr = `${a} + ${b}`; }
        break;
      case 3:
        a = ri(11, 49); b = ri(11, 29); answer = a * b; expr = `${a} × ${b}`;
        break;
      default:
        a = ri(11, 39); b = ri(11, 29); c = ri(10, 99);
        if (Math.random() < 0.5) { answer = a * b + c; expr = `${a} × ${b} + ${c}`; }
        else { answer = a * b - c; expr = `${a} × ${b} − ${c}`; }
    }
    const isTrue = Math.random() < 0.5;
    const shown = isTrue ? answer : bluff(answer);
    return { text: `${expr} = ${shown}`, isTrue, answer, expr, tier };
  }

  // ---------- gamble flow ----------
  function enterBetting(tagMsg) {
    phase = 'betting';
    round = null;
    stopTimer();
    if (chips <= 0) {
      phase = 'bust';
      showGroup('groupBust');
      setDisplay('THE HOUSE TAKES PITY ON YOU', 'BUSTED');
      return;
    }
    bet = Math.min(bet, chips);
    showGroup('groupBet');
    setDisplay(tagMsg || 'PLACE YOUR BET', `BET ${bet}`);
  }

  function addChip(kind) {
    if (phase !== 'betting') return;
    snd.click();
    if (kind === 'clear') bet = 0;
    else if (kind === 'all') bet = chips;
    else bet = Math.min(chips, bet + Number(kind));
    setDisplay('PLACE YOUR BET', `BET ${bet}`);
  }

  function deal() {
    if (phase !== 'betting') return;
    if (bet < MIN_BET && bet < chips) {
      shake();
      setDisplay(`MINIMUM BET ${MIN_BET}`, `BET ${bet}`);
      return;
    }
    if (bet <= 0) return;
    snd.deal();
    chips -= bet;
    renderStats();
    save();
    round = makeRound(streak);
    phase = 'deciding';
    showGroup('groupDecide');
    const t = TIERS[round.tier];
    setDisplay(`TRUE OR BLUFF? — PAYS ${t.odds}`, round.text);
    startTimer(t.time, () => resolveRound(null));
  }

  function resolveRound(guess) {
    if (phase !== 'deciding') return;
    stopTimer();
    const t = TIERS[round.tier];
    const correct = guess !== null && guess === round.isTrue;
    if (correct) {
      const profit = Math.round(bet * t.mult);
      winnings = bet + profit;
      chips += winnings;
      streak += 1;
      if (streak > best) best = streak;
      renderStats();
      bumpStat(el.chips);
      bumpStat(el.streak);
      save();
      flashDisplay('win');
      if (streak % 5 === 0) snd.jackpot(); else snd.win();
      phase = 'offer';
      showGroup('groupOffer');
      const hot = streak % 5 === 0 ? ` — 🔥 STREAK ${streak}!` : '';
      setDisplay(`CORRECT! DOUBLE OR NOTHING?${hot}`, `WIN +${profit}`);
    } else {
      const lost = bet;
      streak = 0;
      renderStats();
      save();
      flashDisplay('lose');
      shake();
      snd.lose();
      const truth = `${round.expr} = ${round.answer}`;
      const why = guess === null
        ? 'TOO SLOW'
        : (round.isTrue ? 'IT WAS TRUE' : 'IT WAS A BLUFF');
      bet = 0;
      enterBetting(`${why} — TRUTH: ${truth}`);
      if (phase === 'betting') setDisplay(`${why} — TRUTH: ${truth}`, `LOST ${lost}`);
    }
  }

  function doubleOrNothing() {
    if (phase !== 'offer') return;
    phase = 'flipping';
    snd.coin();
    let flips = 0;
    const iv = setInterval(() => {
      el.main.textContent = flips % 2 === 0 ? '♠' : '♥';
      flips += 1;
      if (flips >= 10) {
        clearInterval(iv);
        const won = Math.random() < 0.5;
        if (won) {
          chips += winnings;
          winnings *= 2;
          renderStats();
          bumpStat(el.chips);
          save();
          flashDisplay('win');
          snd.win();
          phase = 'offer';
          setDisplay('DOUBLED! GO AGAIN?', `RIDING ${winnings}`);
        } else {
          chips -= winnings;
          winnings = 0;
          renderStats();
          save();
          flashDisplay('lose');
          shake();
          snd.lose();
          bet = 0;
          enterBetting('THE HOUSE ALWAYS WINS');
        }
      }
    }, 90);
  }

  function collect() {
    if (phase !== 'offer') return;
    snd.click();
    winnings = 0;
    enterBetting('BANKED! PLACE YOUR BET');
  }

  function takeComp() {
    if (phase !== 'bust') return;
    snd.jackpot();
    chips = COMP;
    bet = 0;
    renderStats();
    bumpStat(el.chips);
    save();
    enterBetting(`COMPED ${COMP} CHIPS — SPEND WISELY`);
  }

  // ---------- calculator mode ----------
  const calc = { cur: '0', prev: null, op: null, fresh: true };

  function calcTrim(n) {
    if (!isFinite(n) || isNaN(n)) return 'ERROR';
    const s = String(Math.round(n * 1e9) / 1e9);
    return s.length > 13 ? n.toExponential(6) : s;
  }

  function calcApply() {
    const a = calc.prev ?? 0;
    const b = parseFloat(calc.cur);
    let r;
    switch (calc.op) {
      case '+': r = a + b; break;
      case '−': r = a - b; break;
      case '×': r = a * b; break;
      case '÷': r = b === 0 ? NaN : a / b; break;
      default: r = b;
    }
    calc.cur = calcTrim(r);
    calc.prev = isNaN(r) || !isFinite(r) ? null : r;
    calc.fresh = true;
  }

  function calcInput(k) {
    snd.click();
    if (k >= '0' && k <= '9') {
      if (calc.fresh) { calc.cur = k; calc.fresh = false; }
      else if (calc.cur.replace(/[-.]/g, '').length < 12) {
        calc.cur = calc.cur === '0' ? k : calc.cur + k;
      }
    } else if (k === '.') {
      if (calc.fresh) { calc.cur = '0.'; calc.fresh = false; }
      else if (!calc.cur.includes('.')) calc.cur += '.';
    } else if (k === 'C') {
      calc.cur = '0'; calc.prev = null; calc.op = null; calc.fresh = true;
    } else if (k === '±') {
      calc.cur = calc.cur.startsWith('-') ? calc.cur.slice(1)
        : (calc.cur === '0' ? '0' : '-' + calc.cur);
    } else if (k === '%') {
      calc.cur = calcTrim(parseFloat(calc.cur) / 100);
      calc.fresh = true;
    } else if (['+', '−', '×', '÷'].includes(k)) {
      if (calc.op && !calc.fresh) calcApply();
      else calc.prev = parseFloat(calc.cur);
      calc.op = k;
      calc.fresh = true;
    } else if (k === '=') {
      if (calc.op) { calcApply(); calc.op = null; }
    }
    renderCalc();
  }

  function renderCalc() {
    const pending = calc.op ? `${calcTrim(calc.prev ?? 0)} ${calc.op}` : 'CALC MODE — NO WAGERS HERE';
    setDisplay(pending, calc.cur);
  }

  // ---------- mode switching ----------
  let mode = 'gamble';

  function setMode(next) {
    if (mode === next) return;
    if (next === 'calc' && (phase === 'deciding' || phase === 'flipping')) {
      shake();
      setDisplay('FINISH THE ROUND FIRST!', el.main.textContent);
      return;
    }
    if (next === 'calc' && phase === 'offer') collect();
    mode = next;
    el.tabGamble.classList.toggle('active', mode === 'gamble');
    el.tabCalc.classList.toggle('active', mode === 'calc');
    el.gamblePad.classList.toggle('hidden', mode !== 'gamble');
    el.calcPad.classList.toggle('hidden', mode !== 'calc');
    snd.click();
    if (mode === 'calc') renderCalc();
    else enterBetting();
  }

  // ---------- misc controls ----------
  function toggleSound() {
    muted = !muted;
    el.soundBtn.textContent = muted ? '🔇 MUTED' : '🔊 SOUND';
    save();
    snd.click();
  }

  function reset() {
    if (!resetArmed) {
      resetArmed = true;
      el.resetBtn.textContent = '↺ SURE?';
      setTimeout(() => {
        resetArmed = false;
        el.resetBtn.textContent = '↺ RESET';
      }, 2500);
      return;
    }
    resetArmed = false;
    el.resetBtn.textContent = '↺ RESET';
    chips = START_CHIPS;
    best = 0;
    streak = 0;
    bet = 0;
    winnings = 0;
    stopTimer();
    save();
    renderStats();
    if (mode === 'gamble') enterBetting('FRESH STACK — GOOD LUCK');
    else renderCalc();
  }

  // ---------- wiring ----------
  document.querySelectorAll('.chip').forEach((b) =>
    b.addEventListener('click', () => addChip(b.dataset.chip)));
  $('dealBtn').addEventListener('click', deal);
  $('trueBtn').addEventListener('click', () => resolveRound(true));
  $('bluffBtn').addEventListener('click', () => resolveRound(false));
  $('doubleBtn').addEventListener('click', doubleOrNothing);
  $('collectBtn').addEventListener('click', collect);
  $('compBtn').addEventListener('click', takeComp);
  el.tabGamble.addEventListener('click', () => setMode('gamble'));
  el.tabCalc.addEventListener('click', () => setMode('calc'));
  el.soundBtn.addEventListener('click', toggleSound);
  el.resetBtn.addEventListener('click', reset);
  document.querySelectorAll('.key').forEach((b) =>
    b.addEventListener('click', () => calcInput(b.dataset.key)));

  document.addEventListener('keydown', (e) => {
    if (mode === 'calc') {
      const map = { Enter: '=', '=': '=', '+': '+', '-': '−', '*': '×', '/': '÷',
        Escape: 'C', c: 'C', '.': '.', '%': '%' };
      if (e.key >= '0' && e.key <= '9') calcInput(e.key);
      else if (map[e.key]) { e.preventDefault(); calcInput(map[e.key]); }
      else if (e.key === 'Backspace') calcInput('C');
    } else {
      if (phase === 'betting' && e.key === 'Enter') deal();
      else if (phase === 'deciding' && (e.key === 't' || e.key === 'T')) resolveRound(true);
      else if (phase === 'deciding' && (e.key === 'b' || e.key === 'B')) resolveRound(false);
      else if (phase === 'offer' && (e.key === 'd' || e.key === 'D')) doubleOrNothing();
      else if (phase === 'offer' && e.key === 'Enter') collect();
    }
  });

  // ---------- boot ----------
  load();
  el.soundBtn.textContent = muted ? '🔇 MUTED' : '🔊 SOUND';
  renderStats();
  enterBetting('WELCOME TO THE TABLE');
})();
