/* Moteurs de calcul Crown : castle, cabines, raids.
   Portage formule par formule des classeurs Excel (Castle Événements, Cab Calcul optimum,
   Cab Démolition, Raid Simulateur / Journal / Synthèse). Aucune dépendance au DOM. */
(function (root) {
  const D = root.CROWN_DATA;
  const sum = a => a.reduce((s, x) => s + x, 0);

  /* ================= CASTLE ================= */
  const C = D.castle; // tableaux indexés par niveau 0..10
  function castleCombo(p, opt) {
    // p : {na, nb, n, l, grp, bonus, iron (par jour, Infinity = sans limite), store, goal}
    opt = opt || {};
    const { na, nb, n, l, grp, bonus, goal } = p;
    const unlimited = !isFinite(p.iron);
    const iron = unlimited ? 1e12 : p.iron, store = unlimited ? 1e15 : p.store;
    const nbe = nb - n, nw = na + nbe + 6;
    const B0 = 5, B1 = B0 + l * n, B2 = B1 + 5, B3 = B2 + 10 * nw, B4 = B3 + 11 * n;
    const dem = sum(C.cabT.slice(1, l + 1)) / 2, bL = C.cabB[l];
    const others = [C.CT, C.TT, C.AT, C.AT, C.BT, C.BT];
    const othNames = ["Castle", "Sorcerer's Tower", "Forum", "Forum", "Entrepôt", "Entrepôt"];
    let N = 0, O = 0, K = 0, S = null, first = null;
    const trace = opt.trace ? [] : null;
    for (let a = 1; a <= B4; a++) {
      let ph, start;
      if (a <= B0) { ph = 0; start = 0; } else if (a <= B1) { ph = 1; start = B0; } else if (a <= B2) { ph = 2; start = B1; }
      else if (a <= B3) { ph = 3; start = B2; } else { ph = 4; start = B3; }
      const c = a - start - 1;
      let H = 0, I = 1 + bonus, L = 1 / C.vqTime, M = 0, desc = "";
      if (ph === 0) { H = C.BAS[c + 1]; desc = "Basilica niv. " + (c + 1); }
      else if (ph === 1) {
        const Dl = Math.floor(c / n) + 1, E = c - (Dl - 1) * n;
        H = C.cabT[Dl]; I = 1 + bonus + n * C.cabB[Dl - 1] + E * (C.cabB[Dl] - C.cabB[Dl - 1]); desc = "Cabine niv. " + Dl;
      } else if (ph === 2) { H = C.BAS[c + 6]; I = 1 + bonus + n * bL; desc = "Basilica niv. " + (c + 6); }
      else if (ph === 3) {
        const Dl = Math.floor(c / nw) + 1, E = c % nw;
        if (E < na) { H = C.AT[Dl]; desc = "Training Arena niv. " + Dl; }
        else if (E < na + nbe) { H = C.BT[Dl]; desc = "Barracks niv. " + Dl; }
        else { const k = E - na - nbe; H = others[k][Dl]; desc = othNames[k] + " niv. " + Dl; }
        I = 1 + bonus + n * bL;
        L = (1 + na * C.AE[Dl - 1] + Math.min(E, na) * (C.AE[Dl] - C.AE[Dl - 1])) / C.vqTime;
        const cbl = E > na + nbe ? Dl : Dl - 1;
        M = (nbe * C.BC[Dl - 1] + Math.max(0, Math.min(E - na, nbe)) * (C.BC[Dl] - C.BC[Dl - 1])) * (1 + C.CB[cbl]);
      } else {
        const g = grp, Dl = Math.floor(c / (11 * g)), E = c - Dl * 11 * g, F = Math.min(g, n - Dl * g);
        const lvl = ((E - F) % 10 + 10) % 10 + 1;
        if (E < F) { H = dem; desc = "Démolition d'une Cabine"; } else { H = C.BT[lvl]; desc = "Barracks de remplacement niv. " + lvl; }
        I = 1 + bonus + (n - Dl * g - Math.min(E, F)) * bL;
        L = (1 + na * C.AE[10]) / C.vqTime;
        const extra = E >= F ? Math.floor((E - F) / 10) * C.BC[10] + C.BC[lvl - 1] : 0;
        M = ((nbe + Dl * g) * C.BC[10] + extra) * (1 + C.CB[10]);
      }
      const J = H / I;
      const P = Math.max(0, Math.min(M - O, L * J, (N + iron * J / 86400) / C.vqIron));
      const Q = O + P, R = Math.min(store, N + iron * J / 86400 - P * C.vqIron);
      if (first === null && P > 0 && O === 0) first = K;
      if (S === null && O < goal - 0.5 && Q >= goal - 0.5) {
        S = K + (goal - O) / (P / J);
        if (opt.stopAtGoal) return { days: S / 86400, partial: true };
      }
      if (trace) trace.push({ a, ph, desc, H, I, J, K, L, M, N, O, P, Q, R });
      O = Q; N = R; K += J;
    }
    const end = K / 86400;
    const rate = (1 + na * C.AE[10]) / C.vqTime * 86400;
    const cap = nb * C.BC[10] * (1 + C.CB[10]);
    const need = goal - O, ir = iron / C.vqIron;
    let tail;
    if (O >= goal - 0.5) tail = 0;
    else if (iron >= 1e11 || rate <= ir) tail = need / rate;
    else { const x = rate * (N / C.vqIron) / (rate - ir); tail = x >= need ? need / rate : (N / C.vqIron) / (rate - ir) + (need - x) / ir; }
    const days = cap < goal ? Infinity : (S !== null ? S / 86400 : end + tail);
    return { days, end, cap, loss: castleLoss(n, l), lossW: castleLossW(n, l), trEnd: O, feEnd: N, first: first === null ? null : first / 86400,
             rate, tail, steps: B4, iron: goal * C.vqIron, trace };
  }
  function castleLoss(n, l) { return n * (sum(C.cabS.slice(1, l + 1)) - sum(C.cabS.slice(1, l)) / 3); }
  function castleLossW(n, l) { return n * (sum(C.cabW.slice(1, l + 1)) - sum(C.cabW.slice(1, l)) / 3); }

  function castleGrid(q) {
    // q : {mil, naMin, naMax, naStep, fixedNa, cabStep, lvMin, lvMax}
    const out = [];
    const nas = q.fixedNa != null ? [q.fixedNa] : [];
    if (q.fixedNa == null) for (let na = q.naMin; na <= Math.min(q.naMax, q.mil); na += q.naStep) nas.push(na);
    for (const na of nas) { const nb = q.mil - na; if (nb < 0) continue;
      for (let n = 0; n <= nb; n += q.cabStep) for (let l = q.lvMin; l <= q.lvMax; l++) { out.push({ na, nb, n, l }); if (n === 0) break; } }
    return out;
  }
  // Solveur : classement par durée (à 1e-9 j près), puis pierre perdue, puis construction la plus courte, puis moins d'Arenas
  async function castleSolve(base, q, onProgress, top) {
    top = top || 5;
    const grid = castleGrid(q), res = [];
    for (let i = 0; i < grid.length; i++) {
      const g = grid[i], r = castleCombo({ ...base, ...g }, { stopAtGoal: true });
      res.push({ ...g, days: r.days, loss: castleLoss(g.n, g.l) });
      if (onProgress && i % 150 === 149) await onProgress(i + 1, grid.length);
    }
    const key = r => Math.round(r.days * 1e9) / 1e9;
    res.sort((a, b) => key(a) - key(b) || a.loss - b.loss);
    const cand = res.slice(0, Math.max(top * 6, 30)).map(r => ({ ...r, ...castleCombo({ ...base, na: r.na, nb: r.nb, n: r.n, l: r.l }) }));
    cand.sort((a, b) => key(a) - key(b) || a.loss - b.loss || a.end - b.end || a.na - b.na);
    return { tested: grid.length, best: cand.slice(0, top).filter(r => isFinite(r.days)) };
  }

  /* ================= CABINES ================= */
  const B = D.batiments, CD = D.cabines;
  function cabTables() {
    const b = CD.bonus, t = CD.temps, F = [0], G = [0], Hc = [0];
    for (let k = 1; k <= 10; k++) { F[k] = F[k - 1] + CD.bois[k]; G[k] = G[k - 1] + CD.pierre[k]; Hc[k] = Hc[k - 1] + t[k]; }
    const I = F.map((_, k) => k ? F[k - 1] / 3 : 0), J = G.map((_, k) => k ? G[k - 1] / 3 : 0), Kd = Hc.map(h => h / 2);
    return { b, t, F, G, H: Hc, I, J, K: Kd };
  }
  function cabParams(p) {
    // p : {bonus, depart, paquet, arenas, barracks, autresH, pierreJour, boisJour}
    const arenaH = sum(B.arenaT) / 3600, barH = sum(B.barT) / 3600, castleH = sum(B.castleT) / 3600, basH = sum(B.basT) / 3600;
    return { arenaH, barH, castleH, basH,
      travailH: p.arenas * arenaH + p.barracks * barH + castleH + basH + p.autresH,
      bois: p.arenas * sum(B.arenaW) + sum(B.basW),
      pierre: p.arenas * sum(B.arenaS) + p.barracks * sum(B.barS) + sum(B.castleS) + sum(B.basS) };
  }
  function cabRow(p, L, n, T, P) {
    const C_ = T.b[L], Dsp = 1 + p.bonus + n * C_;
    let E = 0;
    for (let k = 1; k <= 10; k++) { if (k > L || k <= p.depart) continue;
      for (let i = 0; i < n; i++) E += (T.t[k] / 3600) / (1 + p.bonus + n * T.b[k - 1] + i * (T.b[k] - T.b[k - 1])) / 24; }
    const F = (P.travailH - (Math.min(n, p.barracks) * P.barH + Math.max(0, n - p.barracks) * P.arenaH)) / Dsp / 24;
    let G = 0, Hh = 0;
    for (let i = 0; i < n; i++) {
      G += (T.H[L] / 2 / 3600) / (Dsp - i * C_) / 24;
      const grpEnd = Math.min(p.paquet * (Math.floor(i / p.paquet) + 1), n);
      Hh += (i < Math.max(0, n - p.barracks) ? P.arenaH : P.barH) / (Dsp - C_ * grpEnd) / 24;
    }
    const Itot = E + F + G + Hh;
    const Jb = P.bois + n * (Math.max(0, T.F[L] - T.F[p.depart]) - T.I[L]);
    const Kp = P.pierre + n * (Math.max(0, T.G[L] - T.G[p.depart]) - T.J[L]);
    const Lb = n * (T.F[L] - T.I[L]), M = n * (T.G[L] - T.J[L]);
    const tb = p.boisJour ? Jb / p.boisJour : 0, tp = p.pierreJour ? Kp / p.pierreJour : 0;
    const N = Math.max(Itot, tb, tp);
    const O = N === Itot ? "Construction" : (tp >= tb ? "Pierre" : "Bois");
    return { niveau: L, n, bonusCab: C_, speed: Dsp, montee: E, principale: F, demolition: G, reconstruction: Hh, total: Itot,
             boisLivrer: Jb, pierreLivrer: Kp, perteBois: Lb, pertePierre: M, delai: N, limitant: O };
  }
  function cabOptimise(p, tol) {
    const T = cabTables(), P = cabParams(p), rows = [];
    for (let L = 4; L <= 10; L++) for (let n = 5; n <= 60; n += 5) rows.push(cabRow(p, L, n, T, P));
    const minN = Math.min(...rows.map(r => r.delai));
    let rec = null; for (const r of rows) { const v = r.delai <= minN + tol ? r.pertePierre : 1e15; if (!rec || v < rec.v) rec = { v, r }; }
    let fast = null; for (const r of rows) if (!fast || r.delai < fast.delai) fast = r;
    const perLevel = []; for (let L = 4; L <= 10; L++) { let b = null; for (const r of rows) if (r.niveau === L && (!b || r.delai < b.delai)) b = r; perLevel.push(b); }
    return { rows, recommended: rec.r, fastest: fast, perLevel, params: P };
  }
  function cabDemolition(p) {
    // p : {n, niveau, groupe, bonus, remplacer ('Barracks'|'Training Arena'), vise, overrides: {g: type}}
    const T = cabTables(), L = p.niveau, b = T.b[L], dem = T.K[L], rb = T.I[L], rp = T.J[L];
    const upTo = arr => sum(arr.slice(0, p.vise));
    const barT = upTo(B.barT), arT = upTo(B.arenaT), barS = upTo(B.barS), arW = upTo(B.arenaW), arS = upTo(B.arenaS);
    const groups = []; let cum = 0;
    for (let g = 1; (g - 1) * p.groupe < p.n; g++) {
      const size = Math.min(p.groupe, p.n - (g - 1) * p.groupe), type = (p.overrides && p.overrides[g]) || p.remplacer;
      const rest = p.n - (g - 1) * p.groupe, E = 1 + p.bonus + rest * b;
      let F = 0; for (let i = 0; i < size; i++) F += dem / (E - i * b); F /= 86400;
      const G = E - size * b, Hh = size * (type === "Training Arena" ? arT : barT) / G / 86400;
      cum += F + Hh;
      groups.push({ g, size, type, rest, speedAvant: E, demolition: F, speedApres: G, reconstruction: Hh, temps: F + Hh, cumul: cum,
        rembBois: size * rb, rembPierre: size * rp, coutBois: size * (type === "Training Arena" ? arW : 0), coutPierre: size * (type === "Training Arena" ? arS : barS) });
    }
    const tot = k => sum(groups.map(x => x[k]));
    return { groups, bonusCab: b, demBase: dem, speedDepart: 1 + p.bonus + p.n * b, speedFin: 1 + p.bonus,
             totalDemolition: tot("demolition"), totalReconstruction: tot("reconstruction"), total: tot("temps"),
             rembBois: tot("rembBois"), rembPierre: tot("rembPierre"), coutBois: tot("coutBois"), coutPierre: tot("coutPierre") };
  }

  /* ================= RAIDS ================= */
  const TYPES = ["Infanterie", "Cavalerie", "Mystique", "Artillerie"];
  function unitStats(units, vo) { return units.map(u => ({ ...u, attEff: u.att * (1 + (u.bonus || 0)), cout: u.bois + u.fer + u.or * vo })); }
  function butinBase(cave, niveau) { if (!(niveau >= 1 && niveau <= 10)) return null; return (cave === "Montagne" ? D.butin.montagne : D.butin.normal)[niveau - 1]; }
  function journalRow(r, units, vo) {
    const [R, Tr] = units; const E = +r.rEnv || 0, F = +r.rPerdus || 0, G = +r.tEnv || 0, H = +r.tPerdus || 0;
    if (E + G === 0) return null;
    const S = (+r.bois || 0) + (+r.pierre || 0) + (+r.fer || 0) + (+r.nourriture || 0), Nn = +r.nonTransporte || 0;
    const Rcap = (E - F) * R.transport + (G - H) * Tr.transport;
    const U = (+r.or || 0) * vo + S, V = F * R.cout + H * Tr.cout, W = U - V, X = E * R.cout + G * Tr.cout;
    const bR = r.bonusR === "" || r.bonusR == null ? R.bonus : +r.bonusR, bT = r.bonusT === "" || r.bonusT == null ? Tr.bonus : +r.bonusT;
    const AF = E * R.att * (1 + bR) + G * Tr.att * (1 + bT), Q = (F + H) / (E + G);
    const base = butinBase(r.type, +r.niveau), pct = r.pct === "" || r.pct == null ? null : +r.pct;
    const AH = pct != null && base != null ? base * (2 - pct) : null;
    const AJ = base ? 2 - (S + Nn) / base : null;
    return { ratio: G === 0 ? "R pur" : (Math.round(E / G * 10) / 10) + ":1", Q, Rcap, S, T: Rcap ? (S + Nn) / Rcap : null, U, V, W, X,
             Y: X ? W / X : null, Z: U ? V / U : null, AA: +r.duree ? W / +r.duree : null, AF, AG: Q * AF, AH,
             AI: AH ? (S + Nn) / AH - 1 : null, AJ, AK: pct != null ? pct : AJ };
  }
  function defenseParPoint(cave, niveau) {
    const comp = D.compositions.find(c => c.cave === cave && +c.niveau === +niveau);
    const mon = nom => D.monstres.find(m => m.nom === nom);
    const out = {};
    for (const t of TYPES) {
      if (comp && mon(comp.m1) && mon(comp.m2)) { const a = mon(comp.m1), b = mon(comp.m2); out[t] = comp.part * a[t] / a.transport + (1 - comp.part) * b[t] / b.transport; }
      else { const ms = D.monstres.filter(m => m.cave === cave); out[t] = ms.length ? Math.max(...ms.map(m => m[t] / m.transport)) : null; }
    }
    return { def: out, comp: comp || null };
  }
  function raidSim(p, journal) {
    // p : {cave, niveau, pct, marge, coef, vo, units, rDispo, tDispo}
    const units = unitStats(p.units, p.vo), [R, Tr] = units;
    const base = butinBase(p.cave, p.niveau); if (base == null) return null;
    const B10 = base * (2 - p.pct);
    let sI = 0, sS = 0; for (const r of journal || []) { sI += +r.or || 0; sS += (+r.bois || 0) + (+r.pierre || 0) + (+r.fer || 0) + (+r.nourriture || 0); }
    const B11 = B10 * (sS ? sI / sS : 0);
    const { def, comp } = defenseParPoint(p.cave, p.niveau), Einf = def.Infanterie;
    const gain = B10 + B11 * p.vo;
    const seul = units.map(u => { const e = def[u.type]; if (e == null) return { nom: u.nom, type: u.type };
      const Dp = p.coef * B10 * e / u.attEff, Cn = Math.ceil(B10 * p.marge / u.transport + Dp), F = Dp * u.cout, G = gain - F, H = Cn * u.cout, J = Cn * u.places;
      return { nom: u.nom, type: u.type, envoyer: Cn, pertes: Dp, taux: Dp / Cn, valeurPertes: F, profit: G, valeurArmee: H, profitArmee: G / H, places: J, profitPlace: G / J }; });
    const mix = [6, 4, 3, 2, 1.5, 1].map(r => {
      const Dt = Math.ceil(B10 * p.marge / (r * R.transport + Tr.transport) + p.coef * B10 * Einf / (r * R.attEff + Tr.attEff)), Cr = Math.ceil(r * Dt);
      const E = p.coef * B10 * Einf / (Cr * R.attEff + Dt * Tr.attEff), H = Cr * R.cout + Dt * Tr.cout, F = E * H, G = gain - F, J = Cr * R.places + Dt * Tr.places;
      return { ratio: (String(r).replace(".", ",")) + ":1", r, rangers: Cr, triaires: Dt, taux: E, valeurPertes: F, profit: G, valeurArmee: H, profitArmee: G / H, places: J, profitPlace: G / J }; });
    const pick = k => { const s = seul.filter(x => x[k] != null), bs = s.reduce((a, b) => b[k] > a[k] ? b : a, s[0]), bm = mix.reduce((a, b) => b[k] > a[k] ? b : a, mix[0]);
      return bs[k] >= bm[k] ? bs.nom : "Ranger:Triaire " + bm.ratio; };
    // avec tes troupes
    const Ra = p.rDispo, Ta = p.tDispo, loss = p.coef * B10 * Einf;
    const N52 = Math.ceil(B10 * p.marge / R.transport + loss / R.attEff), N53 = Math.min(Ra, N52);
    let Nk = Math.max(0, (B10 * p.marge - R.transport * N53) / Tr.transport);
    for (let k = 0; k < 5; k++) Nk = N53 >= N52 ? 0 : Math.max(0, (B10 * p.marge / (1 - Math.min(0.9, loss / Math.max(1, R.attEff * N53 + Tr.attEff * Nk))) - R.transport * N53) / Tr.transport);
    const aR = N53, aT = Math.ceil(Nk), aTaux = loss / (R.attEff * aR + Tr.attEff * aT), aProfit = gain - aTaux * (aR * R.cout + aT * Tr.cout);
    let modeB = null;
    if (Ra + Ta > 0) {
      const q = Ta ? Ra / Ta : 0;
      const tpr = Ta === 0 ? 0 : Math.ceil(B10 * p.marge / (q * R.transport + Tr.transport) + loss / (q * R.attEff + Tr.attEff));
      const rpr = Ta === 0 ? N52 : Math.ceil(q * tpr);
      const nr = rpr === 0 ? Math.floor(Ta / tpr) : tpr === 0 ? Math.floor(Ra / rpr) : Math.min(Math.floor(Ra / rpr), Math.floor(Ta / tpr));
      const taux = loss / (R.attEff * rpr + Tr.attEff * tpr), pr = gain - taux * (rpr * R.cout + tpr * Tr.cout);
      modeB = { ratioStock: Ta === 0 ? "Ranger seul" : Ra === 0 ? "Triaire seul" : (Ra / Ta).toFixed(1).replace(".", ",") + ":1", triaires: tpr, rangers: rpr, nbRaids: nr, taux, profit: pr, total: pr * nr };
    }
    return { base, butin: B10, or: B11, def, comp, seul, mix,
      best: { cavernes: pick("profit"), troupes: pick("profitArmee"), places: pick("profitPlace") },
      modeA: { rangers: aR, triaires: aT, ratio: aT === 0 ? "Ranger seul" : aR === 0 ? "Triaire seul" : (aR / aT).toFixed(1).replace(".", ",") + ":1", taux: aTaux, profit: aProfit,
               stockOK: aT <= Ta, resteR: Ra - aR, resteT: Ta - aT, manqueT: aT - Ta }, modeB };
  }
  function raidSynthese(journal, units, vo, f) {
    // f : {type, niveau, pctMin, pctMax}
    const rows = journal.map(r => ({ r, c: journalRow(r, units, vo) })).filter(x => x.c && x.r.type === f.type && +x.r.niveau === +f.niveau)
      .filter(x => x.c.AK == null || (x.c.AK >= f.pctMin && x.c.AK <= f.pctMax));
    const cfgs = [...new Set(rows.map(x => x.r.config))];
    const avg = (xs, k) => { const v = xs.map(x => x.c[k]).filter(v => v != null && isFinite(v)); return v.length ? sum(v) / v.length : null; };
    const out = cfgs.map(cfg => { const xs = rows.filter(x => x.r.config === cfg), aa = xs.map(x => x.c.AA).filter(v => v > 0);
      return { config: cfg, n: xs.length, taux: avg(xs, "Q"), remplissage: avg(xs, "T"), butin: avg(xs, "U"), profit: avg(xs, "W"), armee: avg(xs, "X"), profitArmee: avg(xs, "Y"), profitHeure: aa.length ? sum(aa) / aa.length : null }; });
    const maxF = Math.max(...out.map(o => o.profit)), maxH = Math.max(...out.map(o => o.profitArmee));
    for (const o of out) { o.tauxMax = o.armee ? (o.butin - maxF) / o.armee : null;
      o.verdict = o.profit === maxF ? "Meilleur profit / raid" : o.profitArmee === maxH ? "Meilleur rendement / armée" : o.taux <= o.tauxMax ? "OK" : "Pertes trop hautes de " + ((o.taux - o.tauxMax) * 100).toFixed(1).replace(".", ",") + " %"; }
    return out;
  }


  /* ================= RECRUTEMENT (zerks financés par le fer des raids) ================= */
  // ville : {arenas, arena10 (bool), raidsJour, surplus (fraction)} ; rapports : [{fer, bois, pierre, nourriture, or, rPerdus, tPerdus}]
  function recrutement(ville, rapports) {
    const n = rapports.length; if (!n) return null;
    const R = D.unites.find(u => u.nom === "Ranger"), T = D.unites.find(u => u.nom === "Triaire");
    const moy = k => sum(rapports.map(r => +r[k] || 0)) / n;
    const parRaid = { fer: moy("fer"), bois: moy("bois"), pierre: moy("pierre"), nourriture: moy("nourriture"), or: moy("or"), rPerdus: moy("rPerdus"), tPerdus: moy("tPerdus") };
    const rj = Math.max(0, +ville.raidsJour || 0), s = Math.min(1, Math.max(0, +ville.surplus || 0));
    const ferPertes = parRaid.tPerdus * T.fer, ferNetRaid = Math.max(0, parRaid.fer - ferPertes);
    const ferZerksRaid = ferNetRaid * (1 - s);
    const jour = { ferBrut: parRaid.fer * rj, ferPertes: ferPertes * rj, ferNet: ferNetRaid * rj, reserve: ferNetRaid * s * rj, ferZerks: ferZerksRaid * rj };
    const zerksJour = jour.ferZerks / C.vqIron;
    const vitesseCible = zerksJour * C.vqTime / 86400;           // en multiple de la vitesse de base (1 = 100 %)
    const N = Math.max(0, Math.floor(+ville.arenas || 0)), a10 = !!ville.arena10 && N > 0, autres = a10 ? N - 1 : N;
    const vitesse = L => 1 + (a10 ? C.AE[10] : 0) + autres * C.AE[L];
    const niveaux = [];
    for (let L = 1; L <= 10; L++) {
      const v = vitesse(L), zj = v * 86400 / C.vqTime, ferBesoin = zj * C.vqIron;
      niveaux.push({ niveau: L, vitesse: v, zerksJour: zj, ferJour: ferBesoin, raidsNecessaires: ferZerksRaid ? ferBesoin / ferZerksRaid : Infinity, continu: v <= vitesseCible + 1e-9 });
    }
    const ok = niveaux.filter(x => x.continu), choix = autres > 0 ? (ok.length ? ok[ok.length - 1] : null) : null;
    const vMin = vitesse(1), vChoisie = autres > 0 ? (choix ? choix.vitesse : vMin) : vitesse(1);
    const zerksReels = Math.min(zerksJour, vChoisie * 86400 / C.vqTime);
    const excedentFer = Math.max(0, jour.ferZerks - zerksReels * C.vqIron);
    const raffinage = { fer: jour.reserve + excedentFer, bois: (parRaid.bois - parRaid.rPerdus * R.bois) * rj, pierre: parRaid.pierre * rj,
                        nourriture: parRaid.nourriture * rj, or: (parRaid.or - parRaid.tPerdus * T.or) * rj };
    return { n, parRaid, jour, zerksJour, zerksParRaid: ferZerksRaid / C.vqIron, vitesseCible, arenas: N, arena10: a10, autres, niveaux, choix,
             vitesseFixe: autres === 0 ? vitesse(1) : null, // aucune Arena à régler : vitesse imposée
             tropRapide: autres > 0 ? !ok.length : vitesse(1) > vitesseCible + 1e-9,
             raidsPourContinu: ferZerksRaid ? (autres > 0 ? vMin : vitesse(1)) * 86400 / C.vqTime * C.vqIron / ferZerksRaid : Infinity,
             zerksReels, excedentFer, raffinage };
  }

  root.CrownEngine = { castleCombo, castleGrid, castleSolve, castleLoss, cabOptimise, cabDemolition, cabParams, raidSim, journalRow, raidSynthese, recrutement, unitStats, butinBase, defenseParPoint, TYPES };
})(typeof window !== "undefined" ? window : globalThis);
