/* Moteurs de calcul Crown : castle, cabines, raids.
   Portage formule par formule des classeurs Excel (Castle Événements, Cab Calcul optimum,
   Cab Démolition, Raid Simulateur / Journal / Synthèse). Aucune dépendance au DOM. */
(function (root) {
  const D = root.CROWN_DATA;
  const sum = a => a.reduce((s, x) => s + x, 0);

  /* ================= CASTLE ================= */
  const C = D.castle; // tableaux indexés par niveau 0..10
  // Troupes qu'un château peut recruter (fiches du jeu, captures du 24/10 ; Vanquisher : classeur Crown).
  // t = temps d'enrôlement de base (s), places = emplacements de Barracks par unité, bat = bâtiment de recrutement.
  // Tous les bâtiments de recrutement ont la même courbe de vitesse (C.AE : +5 % au niveau 1 … +150 % au niveau 10).
  const FORGE_T = [0, 25, 180, 1200, 9000, 20250, 40500, 73800, 119250, 179550, 272250];
  const BATS = {
    arena:    { nom: "Training Arena",  pl: "Training Arenas",  bt: C.AT },
    ecurie:   { nom: "Écurie",          pl: "Écuries",          bt: C.TT },
    tour:     { nom: "Tour du sorcier", pl: "Tours du sorcier", bt: C.TT },
    academie: { nom: "Académie",        pl: "Académies",        bt: [0].concat(D.batiments.academieT) },
    forge:    { nom: "Forge",           pl: "Forges",           bt: FORGE_T }
  };
  const TROUPES = {
    vanq:      { nom: "Vanquisher (zerk)", pl: "zerks",       t: 200,  places: 1,  cout: { fer: 150 },                        bat: "arena" },
    ranger:    { nom: "Ranger",            pl: "Rangers",     t: 250,  places: 1,  cout: { bois: 160 },                       bat: "arena" },
    triari:    { nom: "Triaire",           pl: "Triaires",    t: 300,  places: 1,  cout: { fer: 140, or: 40 },                bat: "arena" },
    scout:     { nom: "Éclaireur",         pl: "Éclaireurs",  t: 300,  places: 2,  cout: { fer: 40, or: 120 },                bat: "ecurie" },
    arba:      { nom: "Arbalétrier",       pl: "Arbalétriers", t: 600, places: 2,  cout: { bois: 150, or: 200 },              bat: "ecurie" },
    cava:      { nom: "Cavalier",          pl: "Cavaliers",   t: 500,  places: 2,  cout: { fer: 250, or: 100 },               bat: "ecurie" },
    sorc:      { nom: "Sorcière",          pl: "Sorcières",   t: 600,  places: 1,  cout: { fer: 50, or: 150 },                bat: "tour" },
    druide:    { nom: "Druide",            pl: "Druides",     t: 1300, places: 2,  cout: { fer: 100, or: 350 },               bat: "tour" },
    priestess: { nom: "Priestess",         pl: "Priestess",   t: 350,  places: 1,  cout: { fer: 90, or: 100 },                bat: "academie" },
    praetor:   { nom: "Praetor",           pl: "Praetors",    t: 700,  places: 2,  cout: { fer: 200, or: 160 },               bat: "academie" },
    belier:    { nom: "Bélier",            pl: "Béliers",     t: 2500, places: 10, cout: { bois: 500, fer: 300 },             bat: "forge" },
    baliste:   { nom: "Baliste",           pl: "Balistes",    t: 3500, places: 10, cout: { bois: 400, fer: 600 },             bat: "forge" },
    scorpion:  { nom: "Scorpion",          pl: "Scorpions",   t: 4000, places: 10, cout: { bois: 300, pierre: 600, fer: 200 }, bat: "forge" }
  };
  const RESS = ["fer", "bois", "pierre"]; // l'or (au niveau de l'empire) n'est pas limité dans le calcul
  function castleCombo(p, opt) {
    // p : {na, nb, n, l, grp, bonus, troupe, jour: {fer, bois, pierre} (par jour, Infinity = sans limite), store, goal}
    // compatibilité : p.iron = fer par jour pour les zerks
    opt = opt || {};
    const { na, nb, n, l, grp, bonus, goal } = p;
    const U = TROUPES[p.troupe] || TROUPES.vanq, Bt = BATS[U.bat];
    const jour = p.jour || { fer: p.iron };
    const R = RESS.filter(k => (U.cout[k] || 0) > 0 && isFinite(jour[k] == null ? Infinity : jour[k]))
      .map(k => ({ k, c: U.cout[k], inc: +jour[k] / 86400, N: 0 }));
    const store = isFinite(p.store) ? p.store : 1e15;
    const nbe = nb - n, nw = na + nbe + 6;
    const B0 = 5, B1 = B0 + l * n, B2 = B1 + 5, B3 = B2 + 10 * nw, B4 = B3 + 11 * n;
    const dem = sum(C.cabT.slice(1, l + 1)) / 2, bL = C.cabB[l];
    const others = [C.CT, C.TT, C.AT, C.AT, C.BT, C.BT];
    const othNames = ["Castle", "Sorcerer's Tower", "Forum", "Forum", "Entrepôt", "Entrepôt"];
    const cap1 = v => v / U.places; // places → unités
    let O = 0, K = 0, S = null, first = null;
    const trace = opt.trace ? [] : null;
    const payable = J => R.reduce((m, r) => Math.min(m, (r.N + r.inc * J) / r.c), Infinity);
    const payer = (P, J) => R.forEach(r => { r.N = Math.min(store, r.N + r.inc * J - P * r.c); });
    for (let a = 1; a <= B4; a++) {
      let ph, start;
      if (a <= B0) { ph = 0; start = 0; } else if (a <= B1) { ph = 1; start = B0; } else if (a <= B2) { ph = 2; start = B1; }
      else if (a <= B3) { ph = 3; start = B2; } else { ph = 4; start = B3; }
      const c = a - start - 1;
      let H = 0, I = 1 + bonus, L = 1 / U.t, M = 0, desc = "";
      if (ph === 0) { H = C.BAS[c + 1]; desc = "Basilica niv. " + (c + 1); }
      else if (ph === 1) {
        const Dl = Math.floor(c / n) + 1, E = c - (Dl - 1) * n;
        H = C.cabT[Dl]; I = 1 + bonus + n * C.cabB[Dl - 1] + E * (C.cabB[Dl] - C.cabB[Dl - 1]); desc = "Cabine niv. " + Dl;
      } else if (ph === 2) { H = C.BAS[c + 6]; I = 1 + bonus + n * bL; desc = "Basilica niv. " + (c + 6); }
      else if (ph === 3) {
        const Dl = Math.floor(c / nw) + 1, E = c % nw;
        if (E < na) { H = Bt.bt[Dl]; desc = Bt.nom + " niv. " + Dl; }
        else if (E < na + nbe) { H = C.BT[Dl]; desc = "Barracks niv. " + Dl; }
        else { const k = E - na - nbe; H = others[k][Dl]; desc = othNames[k] + " niv. " + Dl; }
        I = 1 + bonus + n * bL;
        L = (1 + na * C.AE[Dl - 1] + Math.min(E, na) * (C.AE[Dl] - C.AE[Dl - 1])) / U.t;
        const cbl = E > na + nbe ? Dl : Dl - 1;
        M = cap1((nbe * C.BC[Dl - 1] + Math.max(0, Math.min(E - na, nbe)) * (C.BC[Dl] - C.BC[Dl - 1])) * (1 + C.CB[cbl]));
      } else {
        const g = grp, Dl = Math.floor(c / (11 * g)), E = c - Dl * 11 * g, F = Math.min(g, n - Dl * g);
        const lvl = ((E - F) % 10 + 10) % 10 + 1;
        if (E < F) { H = dem; desc = "Démolition d'une Cabine"; } else { H = C.BT[lvl]; desc = "Barracks de remplacement niv. " + lvl; }
        I = 1 + bonus + (n - Dl * g - Math.min(E, F)) * bL;
        L = (1 + na * C.AE[10]) / U.t;
        const extra = E >= F ? Math.floor((E - F) / 10) * C.BC[10] + C.BC[lvl - 1] : 0;
        M = cap1(((nbe + Dl * g) * C.BC[10] + extra) * (1 + C.CB[10]));
      }
      const J = H / I;
      const P = Math.max(0, Math.min(M - O, L * J, payable(J)));
      const Q = O + P;
      if (first === null && P > 0 && O === 0) first = K;
      if (S === null && O < goal - 0.5 && Q >= goal - 0.5) {
        S = K + (goal - O) / (P / J);
        if (opt.stopAtGoal) return { days: S / 86400, partial: true };
      }
      payer(P, J);
      if (trace) trace.push({ a, ph, desc, H, I, J, K, L, M, N: R.length ? R[0].N : 0, O, P, Q, R: R.length ? R[0].N : 0 });
      O = Q; K += J;
    }
    const end = K / 86400;
    const rate = (1 + na * C.AE[10]) / U.t;           // unités / s une fois tout construit
    const cap = cap1(nb * C.BC[10] * (1 + C.CB[10]));
    let tail = 0;
    if (O < goal - 0.5 && cap >= goal) {
      // après la construction : recrutement à pleine vitesse, limité par les ressources (pas de 10 min)
      const dt = 600; let o = O, t = 0;
      for (let i = 0; i < 1e6 && o < goal - 1e-9; i++) {
        const P = Math.min(rate * dt, payable(dt), goal - o);
        if (P <= 0) { t = Infinity; break; }
        const part = P < Math.min(rate * dt, payable(dt)) - 1e-9 ? (P / Math.min(rate * dt, payable(dt))) * dt : dt;
        payer(P, part); o += P; t += part;
      }
      tail = t / 86400;
    }
    const days = cap < goal ? Infinity : (S !== null ? S / 86400 : end + tail);
    const besoin = {}; RESS.concat(["or"]).forEach(k => { if (U.cout[k]) besoin[k] = goal * U.cout[k]; });
    return { days, end, cap, loss: castleLoss(n, l), lossW: castleLossW(n, l), trEnd: O, first: first === null ? null : first / 86400,
             rate: rate * 86400, tail, steps: B4, besoin, iron: besoin.fer || 0, troupe: U, bat: Bt, trace };
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
  // Solveur : Arenas fixées (plan de la cité). Le château est fini quand il est à la fois construit et rempli
  // (objectif de zerks) : on minimise max(construction, remplissage). Construire plus vite que le remplissage ne sert
  // à rien : parmi les combinaisons à q.tol jours du meilleur délai, on garde celle qui perd le moins de pierre.
  async function castleSolve(base, q, onProgress, top) {
    top = top || 5;
    const grid = castleGrid(q), res = [];
    for (let i = 0; i < grid.length; i++) {
      const g = grid[i];
      res.push({ ...g, ...castleCombo({ ...base, ...g }) });
      if (onProgress && i % 50 === 49) await onProgress(i + 1, grid.length);
    }
    const k = v => isFinite(v) ? Math.round(v * 1e6) / 1e6 : Infinity;
    res.forEach(r => { r.fini = Math.max(r.days, r.end); });
    const tol = Math.max(0, +q.tol || 0), min = Math.min(...res.map(r => r.fini));
    const ok = r => isFinite(r.fini) && r.fini <= min + tol + 1e-9;
    res.sort((a, b) => (ok(b) - ok(a)) || (ok(a) ? a.loss - b.loss || k(a.fini) - k(b.fini) : k(a.fini) - k(b.fini) || a.loss - b.loss));
    return { tested: grid.length, best: res.slice(0, top), min };
  }

  /* ================= CABINES ================= */
  const B = D.batiments, CD = D.cabines;
  function cabTables() {
    const b = CD.bonus, t = CD.temps, F = [0], G = [0], Hc = [0];
    for (let k = 1; k <= 10; k++) { F[k] = F[k - 1] + CD.bois[k]; G[k] = G[k - 1] + CD.pierre[k]; Hc[k] = Hc[k - 1] + t[k]; }
    const I = F.map((_, k) => k ? F[k - 1] / 3 : 0), J = G.map((_, k) => k ? G[k - 1] / 3 : 0), Kd = Hc.map(h => h / 2);
    return { b, t, F, G, H: Hc, I, J, K: Kd };
  }

  /* ================= CABINES : temps de construction de la cité complète ================= */
  // Bâtiments du plan, tous montés au niveau 10. Temps de base (s) de chaque bâtiment, du niveau 1 au niveau 10.
  const CITE_BAT = {
    barracks:  { nom: "Barracks",        t: () => B.barT },
    arenas:    { nom: "Training Arena",  t: () => B.arenaT },
    academies: { nom: "Académie",        t: () => B.academieT },
    forums:    { nom: "Forum",           t: () => B.forumT },
    entrepots: { nom: "Entrepôt",        t: () => B.barT },       // Storehouse : mêmes temps que la Barracks (wiki COTG)
    tours:     { nom: "Tour de sorcier", t: () => C.TT.slice(1) },
    castles:   { nom: "Castle",          t: () => B.castleT }
  };
  // p : {bonus, depart (niveau déjà atteint par les Cabines), groupe, basDepart, plan:{barracks, arenas, …}, places (100), sansLimitePlaces}
  function citeTemps(p, n, L) {
    const T = cabTables(), b = T.b, base = 1 + p.bonus, places = p.places || 100;
    // liste des bâtiments du plan, avec leur temps total 1 → 10 (s)
    const bats = [];
    for (const k in CITE_BAT) { const nb = Math.max(0, Math.floor(+((p.plan || {})[k]) || 0)), tot = sum(CITE_BAT[k].t()); for (let i = 0; i < nb; i++) bats.push({ k, tot }); }
    const F = bats.length;
    if (!p.sansLimitePlaces && n > 10 * p.basDepart) return null;      // pas assez d'emplacements pour poser les Cabines au départ
    if (F > places) return null;
    // 1. Cabines posées puis montées par couches jusqu'au niveau L
    let montee = 0;
    for (let k = 1; k <= L; k++) { if (k <= p.depart) continue;
      for (let i = 0; i < n; i++) montee += T.t[k] / (base + n * b[k - 1] + i * (b[k] - b[k - 1])); }
    const D = base + n * b[L];
    // 2. Basilica jusqu'au niveau 10
    let basilica = 0; for (let lv = Math.max(1, p.basDepart + 1); lv <= 10; lv++) basilica += C.BAS[lv] / D;
    // 3. bâtiments posés à côté des Cabines ; les derniers (les plus rapides à construire) attendent la démolition
    const principaux = Math.min(F, places - n), derniers = F - principaux;
    bats.sort((x, y) => y.tot - x.tot);                                 // les plus longs d'abord, à pleine vitesse
    const principal = sum(bats.slice(0, principaux).map(x => x.tot)) / D;
    // 4. démolition par groupes et pose des derniers bâtiments, la vitesse baisse à chaque groupe
    const g = Math.max(1, p.groupe || 1), K = T.H[L] / 2; let demolition = 0, reconstruction = 0, reste = n, idx = principaux, groupes = [];
    while (idx < F) {
      const s_ = Math.min(g, F - idx), avant = base + reste * b[L];
      let dm = 0; for (let i = 0; i < s_; i++) dm += K / (avant - i * b[L]);
      const apres = avant - s_ * b[L], rb = sum(bats.slice(idx, idx + s_).map(x => x.tot)) / apres;
      demolition += dm; reconstruction += rb; groupes.push({ taille: s_, vitesseAvant: avant, demolition: dm / 86400, reconstruction: rb / 86400 });
      reste -= s_; idx += s_;
    }
    const total = (montee + basilica + principal + demolition + reconstruction) / 86400;
    return { n, niveau: L, vitesse: D, montee: montee / 86400, basilica: basilica / 86400, principal: principal / 86400, demolition: demolition / 86400,
             reconstruction: reconstruction / 86400, total, demolies: derniers, gardees: n - derniers, batiments: F,
             pertePierre: derniers * (T.G[L] - T.J[L]) + (n - derniers) * 0, coutPierre: n * Math.max(0, T.G[L] - T.G[p.depart || 0]), groupes };
  }
  function citeOptimise(p, seuil, tol) {
    const maxN = Math.min(p.places || 100, p.sansLimitePlaces ? 100 : 10 * p.basDepart);
    const sans = citeTemps(p, 0, 1);
    const rows = []; for (let L = 1; L <= 10; L++) for (let n = 5; n <= maxN; n += 5) { const r = citeTemps(p, n, L); if (r) rows.push(r); }
    if (!rows.length) return { sans, rows, maxN };
    const perLevel = []; for (let L = 1; L <= 10; L++) { let x = null; for (const r of rows) if (r.niveau === L && (!x || r.total < x.total)) x = r; if (x) perLevel.push(x); }
    const niv = perLevel.map((m, i) => { const pr = i ? perLevel[i - 1] : null, gain = pr ? pr.total - m.total : null, pierre = pr ? m.coutPierre - pr.coutPierre : null;
      return { niveau: m.niveau, meilleur: m, gain, pierreEnPlus: pierre, pierreParJour: gain > 0 ? pierre / gain : null }; });
    let k = 0; while (k + 1 < niv.length && niv[k + 1].gain >= seuil) k++;
    const L = niv[k].niveau, auNiv = rows.filter(r => r.niveau === L), best = Math.min(...auNiv.map(r => r.total));
    const choix = auNiv.filter(r => r.total <= best + tol).sort((a, b) => a.n - b.n)[0];
    const fast = rows.reduce((a, r) => r.total < a.total ? r : a, rows[0]);
    return { sans, rows, maxN, niveaux: niv, niveau: L, choix, suivant: niv[k + 1] || null, plusRapide: fast };
  }
  function cabDemolition(p) {
    // p : {n, niveau, groupe, bonus, remplacer ('Barracks'|'Training Arena'), vise, overrides: {g: type}, gardees : Cabines qui restent (facultatif)}
    const T = cabTables(), L = p.niveau, b = T.b[L], dem = T.K[L], rb = T.I[L], rp = T.J[L];
    const upTo = arr => sum(arr.slice(0, p.vise));
    const barT = upTo(B.barT), arT = upTo(B.arenaT), barS = upTo(B.barS), arW = upTo(B.arenaW), arS = upTo(B.arenaS);
    const groups = [], k0 = +p.gardees || 0; let cum = 0;
    for (let g = 1; (g - 1) * p.groupe < p.n; g++) {
      const size = Math.min(p.groupe, p.n - (g - 1) * p.groupe), type = (p.overrides && p.overrides[g]) || p.remplacer;
      const rest = p.n - (g - 1) * p.groupe, E = 1 + p.bonus + (rest + k0) * b;
      let F = 0; for (let i = 0; i < size; i++) F += dem / (E - i * b); F /= 86400;
      const G = E - size * b, Hh = size * (type === "Training Arena" ? arT : barT) / G / 86400;
      cum += F + Hh;
      groups.push({ g, size, type, rest, speedAvant: E, demolition: F, speedApres: G, reconstruction: Hh, temps: F + Hh, cumul: cum,
        rembBois: size * rb, rembPierre: size * rp, coutBois: size * (type === "Training Arena" ? arW : 0), coutPierre: size * (type === "Training Arena" ? arS : barS) });
    }
    const tot = k => sum(groups.map(x => x[k]));
    return { groups, bonusCab: b, demBase: dem, speedDepart: 1 + p.bonus + (p.n + k0) * b, speedFin: 1 + p.bonus + k0 * b,
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



  /* ================= LECTURE D'UN RAPPORT DE RAID (texte issu de la capture) ================= */
  // Colonnes du rapport, dans l'ordre des icônes : or, bois, pierre, fer, nourriture
  const RES5 = ["or", "bois", "pierre", "fer", "nourriture"];
  function lireRapport(texte) {
    const lignes = String(texte || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const num = t => t === "-" || t === "—" || t === "–" ? 0 : +t.replace(/[,.\s]/g, "");
    const row = re => { const l = lignes.find(x => re.test(x)); if (!l) return null;
      const reste = l.replace(re, ""), toks = reste.match(/-|—|–|\d{1,3}(?:[,.]\d{3})+|\d+/g) || [];
      if (toks.length < 5) return null; const v = toks.slice(0, 5).map(num); return Object.fromEntries(RES5.map((k, i) => [k, v[i]])); };
    const tot = re => { const l = lignes.find(x => re.test(x)); const m = l && l.replace(re, "").match(/\d{1,3}(?:[,.]\d{3})+|\d+/); return m ? num(m[0]) : null; };
    const r = { dispo: row(/^Ava[il]{1,2}[a-z]*able\s*:?/i), depense: row(/^Expended\s*:?/i), ramene: row(/^Carried\s*:?/i),
                nonRamene: row(/^Not\s*Carried\s*:?/i), profit: row(/^Profit\s*:?/i),
                totalProfit: tot(/^Total\s*Res\s*Profit\s*:?/i), totalPerdu: tot(/^Res\s*Lost\s*:?/i) };
    const sj = lignes.find(x => /^Subject\s*:/i.test(x)), dt = lignes.find(x => /^Date\s*:/i.test(x));
    r.sujet = sj ? sj.replace(/^Subject\s*:\s*(Raid\s*:\s*)?/i, "").trim() : "";
    r.date = dt ? dt.replace(/^Date\s*:\s*/i, "").trim() : "";
    // contrôles croisés : chaque colonne doit vérifier Carried − Expended = Profit
    const ctrl = [], douteux = new Set();
    if (r.ramene && r.depense && r.profit) RES5.forEach(k => { const ok = r.ramene[k] - r.depense[k] === r.profit[k]; ctrl.push({k, ok}); if (!ok) douteux.add(k); });
    if (r.dispo && r.ramene && r.nonRamene) RES5.slice(1).forEach(k => { if (r.dispo[k] - r.ramene[k] !== r.nonRamene[k]) douteux.add(k); });
    // le jeu : Total Res Profit = ressources hors or ramenées − toutes les dépenses (or compris)
    r.totalDispo = tot(/^Res\s*Available\s*:?/i);
    if (r.ramene && r.depense && r.totalProfit != null && sum(RES5.slice(1).map(k => r.ramene[k])) - sum(RES5.map(k => r.depense[k])) !== r.totalProfit) douteux.add("total");
    if (r.dispo && r.totalDispo != null && sum(RES5.slice(1).map(k => r.dispo[k])) !== r.totalDispo) douteux.add("total");
    if (r.depense && r.totalPerdu != null && sum(RES5.map(k => r.depense[k])) !== r.totalPerdu) douteux.add("pertes");
    // caverne et niveau d'après le sujet (« Mountain Level 8 (351:330) »)
    const cav = r.sujet.match(/(Mountain|Forest|Hill)\s*Level\s*(\d+)/i);
    r.caverne = cav ? ({ mountain: "Montagne", forest: "Forêt", hill: "Colline" })[cav[1].toLowerCase()] : "";
    r.niveau = cav ? +cav[2] : null;
    // troupes envoyées par l'attaquant : nombres de la ligne « Sent » avant le second « Sent » (défenseur)
    const ls = lignes.find(x => /^Sent\b/i.test(x));
    r.envoyes = ls ? (ls.split(/Sent/i)[1] || "").match(/\d+/g)?.map(Number) || [] : [];
    r.nonTransporte = r.nonRamene ? sum(RES5.slice(1).map(k => r.nonRamene[k])) : 0;
    r.manquant = ["ramene", "depense", "profit"].filter(k => !r[k]);
    r.douteux = [...douteux]; r.fiable = !r.manquant.length && !r.douteux.length;
    return r;
  }

  /* ================= RECRUTEMENT (zerks financés par le fer des raids) ================= */
  // Durée saisie comme dans le jeu : "hh:mm:ss", "hh:mm" ou heures décimales ("2,5"). Renvoie des heures (null si illisible).
  function heures(t) {
    if (t == null || t === "") return null;
    const str = String(t).trim().replace(",", ".");
    if (/^\d+(\.\d+)?$/.test(str)) return +str;
    const m = str.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/); if (!m) return null;
    return +m[1] + +m[2] / 60 + (m[3] ? +m[3] / 3600 : 0);
  }
  // ville : {arenas, arena10, surplus} ; raids : une ligne = une armée qui raide en boucle (aller-retour = 2 × trajet aller)
  // [{fer, bois, pierre, nourriture, or, rPerdus, tPerdus, trajet}] : les débits horaires des lignes s'additionnent
  function recrutement(ville, raids) {
    const Rg = D.unites.find(u => u.nom === "Ranger"), Tr = D.unites.find(u => u.nom === "Triaire");
    const s = Math.min(1, Math.max(0, +ville.surplus || 0));
    const lignes = raids.map(r => {
      const aller = heures(r.trajet), cycle = aller ? 2 * aller : null;
      // dépenses (ligne « Expended » du rapport) ; à défaut, coût des Rangers / Triaires perdus
      const lu = ["dFer", "dBois", "dOr", "dPierre", "dNourriture"].some(k => r[k] !== undefined && r[k] !== "");
      const dep = lu ? { fer: +r.dFer || 0, bois: +r.dBois || 0, or: +r.dOr || 0, pierre: +r.dPierre || 0, nourriture: +r.dNourriture || 0 }
                     : { fer: (+r.tPerdus || 0) * Tr.fer, bois: (+r.rPerdus || 0) * Rg.bois, or: (+r.tPerdus || 0) * Tr.or, pierre: 0, nourriture: 0 };
      const zerks = r.armee === "zerks";
      const fer = +r.fer || 0, ferPertes = dep.fer, ferNet = Math.max(0, fer - ferPertes);
      const h = v => cycle ? v / cycle : 0;
      // armée de zerks : les zerks perdus sont re-recrutés, ils occupent la file en plus des nouveaux
      const remplacement = zerks ? ferPertes : 0;
      return { id: r.id, aller, cycle, raidsJour: cycle ? 24 / cycle : 0, ferNet, zerks, zerksRaid: ferNet * (1 - s) / C.vqIron, remplacesRaid: remplacement / C.vqIron,
               heure: { ferBrut: h(fer), ferPertes: h(ferPertes), ferNet: h(ferNet), remplacement: h(remplacement), bois: h((+r.bois || 0) - dep.bois),
                        pierre: h((+r.pierre || 0) - dep.pierre), nourriture: h((+r.nourriture || 0) - dep.nourriture), or: h((+r.or || 0) - dep.or) } };
    });
    const valides = lignes.filter(l => l.cycle);
    if (!valides.length) return { lignes, n: 0 };
    const tot = k => sum(valides.map(l => l.heure[k]));
    const heure = { ferBrut: tot("ferBrut"), ferPertes: tot("ferPertes"), ferNet: tot("ferNet"), remplacement: tot("remplacement") };
    heure.reserve = heure.ferNet * s; heure.ferZerks = heure.ferNet * (1 - s);
    heure.ferFile = heure.ferZerks + heure.remplacement;           // tout le fer qui passe dans la file de recrutement
    const zerksHeure = heure.ferZerks / C.vqIron, zerksJour = zerksHeure * 24;   // gain net de zerks
    const remplacesHeure = heure.remplacement / C.vqIron, fileHeure = zerksHeure + remplacesHeure;
    const vitesseCible = fileHeure * C.vqTime / 3600;             // multiple de la vitesse de base (1 = 100 %)
    const N = Math.max(0, Math.floor(+ville.arenas || 0)), a10 = !!ville.arena10 && N > 0, autres = a10 ? N - 1 : N;
    const vitesse = L => 1 + (a10 ? C.AE[10] : 0) + autres * C.AE[L];
    const niveaux = [];
    for (let L = 1; L <= 10; L++) {
      const v = vitesse(L), zh = v * 3600 / C.vqTime, ferH = zh * C.vqIron;
      niveaux.push({ niveau: L, vitesse: v, zerksHeure: zh, zerksJour: zh * 24, ferHeure: ferH, couverture: heure.ferFile / ferH, continu: v <= vitesseCible + 1e-9 });
    }
    const ok = niveaux.filter(x => x.continu), choix = autres > 0 && ok.length ? ok[ok.length - 1] : null;
    const vAppliquee = autres > 0 ? (choix ? choix.vitesse : vitesse(1)) : vitesse(1);
    const ferBesoinMin = vitesse(1) * 3600 / C.vqTime * C.vqIron;  // fer / h pour la vitesse la plus basse possible
    const fileReelleH = Math.min(fileHeure, vAppliquee * 3600 / C.vqTime);
    const zerksReelsH = Math.max(0, fileReelleH - remplacesHeure);
    const excedentFer = Math.max(0, heure.ferFile - fileReelleH * C.vqIron);
    const j = v => v * 24;
    const raffinage = { fer: j(heure.reserve + excedentFer), bois: j(tot("bois")), pierre: j(tot("pierre")), nourriture: j(tot("nourriture")), or: j(tot("or")) };
    return { lignes, n: valides.length, sansTrajet: lignes.length - valides.length, heure, jour: Object.fromEntries(Object.entries(heure).map(([k, v]) => [k, v * 24])),
             zerksHeure, zerksJour, vitesseCible, arenas: N, arena10: a10, autres, niveaux, choix, vitesseFixe: autres === 0 ? vitesse(1) : null,
             tropRapide: autres > 0 ? !ok.length : vitesse(1) > vitesseCible + 1e-9,
             facteurManquant: heure.ferFile ? ferBesoinMin / heure.ferFile : Infinity, ferManquantHeure: Math.max(0, ferBesoinMin - heure.ferFile), remplacesHeure, fileHeure,
             zerksReelsH, excedentFer: j(excedentFer), raffinage };
  }

  root.CrownEngine = { TROUPES_CASTLE: TROUPES, BATS_CASTLE: BATS, castleCombo, castleGrid, castleSolve, castleLoss, citeTemps, citeOptimise, cabDemolition, raidSim, journalRow, raidSynthese, recrutement, heures, lireRapport, unitStats, butinBase, defenseParPoint, TYPES };
})(typeof window !== "undefined" ? window : globalThis);
