// The roguelike run: antes, debts, magazines of shells, perks, items, cracks.

import {
  quotaFor, tierFor, timerFor, buildMagazine, twistFor,
  PERKS, ITEMS, MAX_PERKS, MAX_ITEMS, perkById, itemById, pick, ri, FINAL_ANTE,
} from './content.js';
import { audio } from './audio.js';
import { store, save } from './store.js';
import { track } from './analytics.js';

const START_CHIPS = 100;
const MIN_WAGER = 10;

export class Run {
  constructor() {
    this.chips = START_CHIPS;
    this.ante = 1;
    this.maxIntegrity = 4;
    this.integrity = 4;
    this.perks = [];
    this.items = ['peek'];
    this.score = 0;
    this.overtime = false;
    this.deathReason = '';
    this.wagerStr = '';
    this.msg = '';
    this.msgT = 0;
    this.startRound();
  }

  // ---------- helpers ----------
  has(perkId) { return this.perks.includes(perkId); }

  say(m) { this.msg = m; this.msgT = 2.2; }

  minWager() {
    const min = this.round.twist === 'highstakes'
      ? Math.max(MIN_WAGER, Math.ceil(this.chips * 0.25))
      : Math.min(MIN_WAGER, this.chips);
    return Math.min(min, this.maxWager());
  }

  // the house sets a table limit: you may never wager more than your current debt
  maxWager() { return Math.min(this.chips, this.round.quota); }

  wager() { return Math.min(this.maxWager(), parseInt(this.wagerStr || '0', 10) || 0); }

  shell() { return this.round.shells[this.round.idx]; }

  shellsLeft() { return this.round.shells.length - this.round.idx; }

  // ---------- round lifecycle ----------
  startRound() {
    const shells = buildMagazine(this.ante);
    this.round = {
      quota: quotaFor(this.ante),
      twist: twistFor(this.ante),
      shells,
      idx: 0,
      remTrue: shells.filter((s) => s.isTrue).length,
      remBluff: shells.filter((s) => !s.isTrue).length,
      combo: 1.0,
      insuranceUsed: false,
    };
    this.phase = 'wager';
    this.resetShellMods();
    if (this.round.twist) audio.sfx('alarm');
    this.persist();
  }

  resetShellMods() {
    this.mods = { frozen: false, jackpot: false, revealed: null, peekDigit: null };
  }

  // ---------- wager phase ----------
  typeDigit(d) {
    if (this.phase !== 'wager') return;
    if (this.wagerStr.length >= 6) return;
    this.wagerStr = (this.wagerStr + d).replace(/^0+(?=\d)/, '');
    audio.sfx('key');
  }

  clearWager() {
    this.wagerStr = '';
    audio.sfx('key');
  }

  setWagerPct(p) {
    if (this.phase !== 'wager') return;
    this.wagerStr = String(Math.max(1, Math.floor(this.maxWager() * p)));
    audio.sfx('key');
  }

  canCashOut() {
    return this.phase === 'wager' && this.chips >= this.round.quota && this.round.idx > 0;
  }

  cashOut() {
    if (!this.canCashOut()) { audio.sfx('denied'); this.say('CANNOT CASH OUT YET'); return; }
    audio.sfx('cash');
    this.phase = 'audit';
    this.persist();
  }

  deal() {
    if (this.phase !== 'wager') return;
    const w = this.wager();
    if (w < this.minWager() && w < this.chips) {
      audio.sfx('denied');
      this.say(`MIN WAGER ${this.minWager()}`);
      return;
    }
    if (w <= 0) { audio.sfx('denied'); this.say('TYPE A WAGER FIRST'); return; }
    this.activeWager = w;
    this.chips -= w;
    this.phase = 'call';
    this.callTotal = timerFor(this.ante, this.round.twist) + (this.has('slowclock') ? 3000 : 0);
    this.callDeadline = performance.now() + this.callTotal;
    audio.sfx('deal');
  }

  // ---------- call phase ----------
  timeLeft() { return Math.max(0, this.callDeadline - performance.now()); }

  update() {
    if (this.msgT > 0) this.msgT -= 1 / 60;
    if (this.phase === 'call' && !this.mods.frozen && this.timeLeft() <= 0) {
      this.resolve(null);
    }
  }

  useItem(slot) {
    if (this.phase !== 'call') { audio.sfx('denied'); return; }
    const id = this.items[slot];
    if (!id) { audio.sfx('denied'); return; }
    const s = this.shell();
    switch (id) {
      case 'peek':
        this.mods.peekDigit = String(s.answer).slice(-1);
        audio.sfx('peek');
        break;
      case 'lens':
        this.mods.revealed = s.isTrue ? 'TRUE' : 'BLUFF';
        audio.sfx('peek');
        break;
      case 'eject':
        this.chips += this.activeWager; // wager refunded
        if (s.isTrue) this.round.remTrue--; else this.round.remBluff--;
        audio.sfx('deal');
        this.say('SHELL EJECTED');
        this.items.splice(slot, 1);
        this.nextShell();
        return;
      case 'solder':
        if (this.integrity >= this.maxIntegrity) { audio.sfx('denied'); this.say('LCD ALREADY FINE'); return; }
        this.integrity++;
        audio.sfx('buy');
        break;
      case 'freeze':
        this.mods.frozen = true;
        audio.sfx('peek');
        break;
      case 'jackpot':
        this.mods.jackpot = true;
        audio.sfx('coin');
        break;
    }
    this.items.splice(slot, 1);
  }

  payoutMult(s) {
    let m = this.round.combo;
    if (this.mods.jackpot) m *= 3;
    if (this.has('lucky7') && (s.expr.includes('7') || String(s.shown).includes('7'))) m *= 2;
    if (this.has('bluffbounty') && !s.isTrue) m *= 1.75;
    if (this.has('believer') && s.isTrue) m *= 1.5;
    if (this.has('glassjaw')) m *= 1.75;
    return m;
  }

  resolve(guess) {
    if (this.phase !== 'call') return;
    const s = this.shell();
    const timeout = guess === null;
    const correct = !timeout && guess === s.isTrue;
    if (s.isTrue) this.round.remTrue--; else this.round.remBluff--;

    if (correct) {
      const profit = Math.max(1, Math.round(this.activeWager * this.payoutMult(s)));
      this.chips += this.activeWager + profit;
      this.score += profit;
      this.round.combo += this.has('overclock') ? 1.0 : 0.5;
      this.round.combo = Math.min(4, this.round.combo);
      this.lastResult = { correct, timeout, profit, truth: `${s.expr}=${s.answer}`, wasTrue: s.isTrue, cracked: false };
      this.rideStake = this.activeWager + profit;
      this.rideWins = 0;
      audio.sfx(profit >= this.activeWager * 2 ? 'bigwin' : 'win');
    } else {
      let cracked = false;
      let refunded = false;
      if (this.has('magnet') && Math.random() < 0.25) {
        this.chips += this.activeWager;
        refunded = true;
      }
      const skipCrack =
        (timeout && this.has('hotstreak')) ||
        (!this.round.insuranceUsed && this.has('insurance') && !timeout && (this.round.insuranceUsed = true));
      if (!skipCrack) {
        const dmg = this.mods.jackpot ? 2 : 1;
        this.integrity -= dmg;
        cracked = true;
        audio.sfx('crack');
      }
      if (!(timeout && this.has('hotstreak'))) this.round.combo = 1.0;
      this.lastResult = { correct, timeout, profit: 0, truth: `${s.expr}=${s.answer}`, wasTrue: s.isTrue, cracked, refunded };
      audio.sfx(timeout ? 'denied' : 'wrong');
      if (this.integrity <= 0) {
        this.die('SHATTERED');
        return;
      }
    }
    this.phase = 'result';
  }

  // ---------- result / ride ----------
  continueFromResult() {
    if (this.phase !== 'result') return;
    audio.sfx('nav');
    this.nextShell();
  }

  canRide() {
    // 3 consecutive rides max, or the weighted coin becomes a money printer
    return this.phase === 'result' && this.lastResult?.correct && this.rideWins < 3;
  }

  startRide() {
    if (!this.canRide()) { audio.sfx('denied'); return; }
    this.phase = 'ride';
    audio.sfx('flip');
  }

  resolveRide() {
    if (this.phase !== 'ride') return null;
    const p = this.has('weighted') ? 0.6 : 0.5;
    const won = Math.random() < p;
    if (won) {
      this.chips += this.rideStake;
      this.score += this.rideStake;
      this.rideWins++;
      this.rideStake *= 2;
      this.phase = 'result';
      this.lastResult = { ...this.lastResult, rode: true };
      audio.sfx('bigwin');
    } else {
      this.chips -= this.rideStake;
      this.rideStake = 0;
      audio.sfx('wrong');
      this.phase = 'result';
      this.lastResult = { ...this.lastResult, correct: false, rodeLost: true, cracked: false };
    }
    return won;
  }

  nextShell() {
    this.round.idx++;
    this.resetShellMods();
    this.wagerStr = '';
    if (this.round.idx >= this.round.shells.length) {
      this.phase = 'audit';
      audio.sfx('alarm');
    } else {
      this.phase = 'wager';
    }
    this.persist();
  }

  // ---------- audit ----------
  payAudit() {
    if (this.phase !== 'audit') return;
    if (this.chips < this.round.quota) {
      this.die('REPOSSESSED');
      return;
    }
    this.chips -= this.round.quota;
    this.score += this.round.quota;
    if (this.has('interest')) this.chips += Math.min(200, Math.round(this.chips * 0.1));
    audio.sfx('cash');
    track('ante_cleared', { ante: this.ante, chips: this.chips });
    if (this.ante === FINAL_ANTE && !this.overtime) {
      this.phase = 'victory';
      audio.sfx('victory');
      track('victory', { score: this.score, chips: this.chips });
      this.persist();
      return;
    }
    this.enterShop();
  }

  enterOvertime() {
    this.overtime = true;
    this.enterShop();
  }

  enterShop() {
    this.ante++;
    const notOwned = PERKS.filter((p) => !this.perks.includes(p.id));
    const p1 = pick(notOwned);
    const p2 = pick(notOwned.filter((p) => p !== p1));
    this.shop = {
      perks: [p1, p2].filter(Boolean),
      items: [pick(ITEMS), pick(ITEMS)],
      rerolls: 0,
      cursor: 0,
    };
    this.phase = 'shop';
    this.persist();
  }

  shopOffers() {
    const offers = [];
    for (const p of this.shop.perks) offers.push({ kind: 'perk', ...p });
    for (const it of this.shop.items) offers.push({ kind: 'item', ...it });
    offers.push({ kind: 'repair', name: 'LCD REPAIR', cost: 75, desc: 'Fix 1 crack in the display.' });
    return offers;
  }

  rerollCost() { return 25 + this.shop.rerolls * 15; }

  shopReroll() {
    const cost = this.rerollCost();
    if (this.chips < cost) { audio.sfx('denied'); this.say('CANNOT AFFORD REROLL'); return; }
    this.chips -= cost;
    this.shop.rerolls++;
    const notOwned = PERKS.filter((p) => !this.perks.includes(p.id));
    const p1 = pick(notOwned);
    const rest = notOwned.filter((p) => p.id !== p1?.id);
    this.shop.perks = [p1, pick(rest)].filter(Boolean);
    this.shop.items = [pick(ITEMS), pick(ITEMS)];
    audio.sfx('deal');
    this.persist();
  }

  shopBuy(offer) {
    if (this.chips < offer.cost) { audio.sfx('denied'); this.say('NOT ENOUGH CHIPS'); return; }
    if (offer.kind === 'perk') {
      if (this.perks.length >= MAX_PERKS) { audio.sfx('denied'); this.say('PERK SLOTS FULL'); return; }
      this.chips -= offer.cost;
      this.perks.push(offer.id);
      this.shop.perks = this.shop.perks.filter((p) => p.id !== offer.id);
      if (offer.id === 'ducttape') {
        this.maxIntegrity++;
        this.integrity = Math.min(this.maxIntegrity, this.integrity + 1);
      }
      if (offer.id === 'glassjaw') {
        this.maxIntegrity = 2;
        this.integrity = Math.min(this.integrity, 2);
      }
    } else if (offer.kind === 'item') {
      if (this.items.length >= MAX_ITEMS) { audio.sfx('denied'); this.say('ITEM SLOTS FULL'); return; }
      this.chips -= offer.cost;
      this.items.push(offer.id);
      const i = this.shop.items.findIndex((x) => x.id === offer.id);
      if (i >= 0) this.shop.items.splice(i, 1);
    } else if (offer.kind === 'repair') {
      if (this.integrity >= this.maxIntegrity) { audio.sfx('denied'); this.say('LCD ALREADY FINE'); return; }
      this.chips -= offer.cost;
      this.integrity++;
    }
    audio.sfx('buy');
    this.persist();
  }

  leaveShop() {
    audio.sfx('ok');
    this.startRound();
  }

  // ---------- endings ----------
  die(reason) {
    this.deathReason = reason;
    this.phase = 'dead';
    audio.sfx(reason === 'SHATTERED' ? 'shatter' : 'gameover');
    track('death', { reason, ante: this.ante, score: this.score });
    store.runSave = null;
    store.runsPlayed++;
    save();
  }

  endRunVoluntarily() {
    // from victory screen: bank the win instead of overtime
    store.runSave = null;
    save();
  }

  // ---------- persistence ----------
  persist() {
    if (this.phase === 'dead' || this.phase === 'victory') return;
    store.runSave = {
      chips: this.chips, ante: this.ante, maxIntegrity: this.maxIntegrity,
      integrity: this.integrity, perks: [...this.perks], items: [...this.items],
      score: this.score, overtime: this.overtime,
      round: {
        quota: this.round.quota, twist: this.round.twist,
        shells: this.round.shells, idx: this.round.idx,
        remTrue: this.round.remTrue, remBluff: this.round.remBluff,
        combo: this.round.combo, insuranceUsed: this.round.insuranceUsed,
      },
      phase: this.phase === 'call' || this.phase === 'result' || this.phase === 'ride' ? 'wager' : this.phase,
      shop: this.phase === 'shop' ? { perks: this.shop.perks, items: this.shop.items, rerolls: this.shop.rerolls } : null,
    };
    save();
  }

  static restore(s) {
    const r = Object.create(Run.prototype);
    r.chips = s.chips; r.ante = s.ante; r.maxIntegrity = s.maxIntegrity;
    r.integrity = s.integrity; r.perks = s.perks; r.items = s.items;
    r.score = s.score; r.overtime = s.overtime;
    r.deathReason = ''; r.wagerStr = ''; r.msg = ''; r.msgT = 0;
    r.round = s.round;
    r.phase = s.phase;
    r.resetShellMods();
    if (s.shop) r.shop = { ...s.shop, cursor: 0 };
    else if (s.phase === 'shop') r.shop = { perks: [], items: [], rerolls: 0, cursor: 0 };
    return r;
  }
}
