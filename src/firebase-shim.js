/* Planner Crown — couche Firebase pour la version hébergée hors de Claude.
   Elle recrée l'interface window.claude.use("db" | "user") utilisée par la page,
   au-dessus de Cloud Firestore et de la connexion Google (Firebase Auth). */
(function(){
  const FB_VERSION = "10.12.2";
  const FB_BASE = window.__FB_BASE__ || `https://www.gstatic.com/firebasejs/${FB_VERSION}`;
  const firebaseConfig = {
    apiKey: "AIzaSyBsN1rV_N9h-G2G-blu2q43b-iPG1YGTZ8",
    authDomain: "planner-crown.firebaseapp.com",
    projectId: "planner-crown",
    storageBucket: "planner-crown.firebasestorage.app",
    messagingSenderId: "978521794830",
    appId: "1:978521794830:web:095b92c86ed017b7f04f5f"
  };

  let ready = null, canWrite = null, currentUser = null;

  /* ---------- écran de connexion ---------- */
  function styles(){
    if (document.getElementById("fbCss")) return;
    const css = document.createElement("style"); css.id = "fbCss";
    css.textContent = `
      #fbGate{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:var(--bg,#eef0f3);padding:16px}
      #fbGate .box{max-width:440px;width:100%;background:var(--panel,#fff);color:var(--ink,#1c2230);border:1px solid var(--line,#d6dae3);border-radius:12px;padding:24px;display:grid;gap:14px}
      #fbGate h2{margin:0;font-family:var(--f-display,Georgia,serif);font-size:1.6rem}
      #fbGate p{margin:0;color:var(--muted,#5d6577);font-size:14px;line-height:1.5}
      #fbGate .err{color:var(--off,#b23a3a);font-weight:600}
      #fbGate button{font:inherit;font-weight:600;padding:10px 16px;border-radius:8px;border:1px solid var(--brass,#9a6b12);background:var(--brass,#9a6b12);color:var(--panel,#fff);cursor:pointer;justify-self:start}
      #fbUser{font-size:12px;color:var(--muted,#5d6577);display:flex;gap:8px;align-items:center}
      #fbUser button{font:inherit;box-shadow:none;min-height:0;font-size:12px;border:none;background:none;color:var(--muted,#5d6577);text-decoration:underline;cursor:pointer;padding:0}`;
    document.head.appendChild(css);
  }
  function gate(){
    let el = document.getElementById("fbGate");
    if (el) return el;
    styles();
    el = document.createElement("div"); el.id = "fbGate";
    el.innerHTML = `<div class="box"><h2>Planner Crown</h2><p id="fbGateMsg">Connecte-toi avec ton compte Google pour ouvrir le planner.</p><button type="button" id="fbGateBtn">Se connecter avec Google</button></div>`;
    document.body.appendChild(el);
    return el;
  }
  function showUserBadge(auth, signOut){
    const host = document.querySelector(".hright"); if (!host || document.getElementById("fbUser")) return;
    styles();
    const d = document.createElement("div"); d.id = "fbUser";
    d.innerHTML = `<span></span><button type="button">Se déconnecter</button>`;
    d.querySelector("span").textContent = currentUser?.email || "";
    d.querySelector("button").addEventListener("click", async () => { await signOut(auth); location.reload(); });
    host.appendChild(d);
  }

  /* ---------- adaptateur Firestore ---------- */
  function isPlain(v){ return v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype; }
  // la base Claude fusionne les objets imbriqués lors d'un update ; Firestore les remplace.
  // On aplatit donc en chemins de champs pour garder le même comportement.
  function flatten(obj, prefix, out){
    out = out || [];
    for (const k in obj){ const v = obj[k], p = prefix.concat(k);
      if (v === undefined) continue;
      if (isPlain(v) && Object.keys(v).length) flatten(v, p, out); else out.push([p, v]); }
    return out;
  }
  function mapErr(e){
    const code = e && e.code === "permission-denied" ? "invalid_argument"
      : e && e.code === "not-found" ? "invalid_argument"
      : e && e.code === "unavailable" ? "unavailable" : (e && e.code) || "unavailable";
    const err = new Error(e && e.message || String(e)); err.code = code; return err;
  }

  async function build(){
    const [{initializeApp}, F, A] = await Promise.all([
      import(`${FB_BASE}/firebase-app.js`),
      import(`${FB_BASE}/firebase-firestore.js`),
      import(`${FB_BASE}/firebase-auth.js`)
    ]);
    const app = initializeApp(firebaseConfig);
    const fdb = F.initializeFirestore(app, { ignoreUndefinedProperties: true });
    const auth = A.getAuth(app);

    // attendre la session Google (persistée) ou la demander
    currentUser = await new Promise(res => { const off = A.onAuthStateChanged(auth, u => { off(); res(u); }); });
    if (!currentUser){
      const g = gate();
      currentUser = await new Promise(res => {
        g.querySelector("#fbGateBtn").addEventListener("click", async () => {
          try { const r = await A.signInWithPopup(auth, new A.GoogleAuthProvider()); res(r.user); }
          catch(e){ g.querySelector("#fbGateMsg").innerHTML = `<span class="err">Connexion impossible (${e.code || e.message}).</span> Réessaie, et autorise les fenêtres pop-up pour cette page.`; }
        });
      });
    }

    const wrapDoc = s => ({ id: s.id, exists: s.exists(), data: () => s.exists() ? s.data() : undefined, metadata: { fromCache: s.metadata.fromCache, hasPendingWrites: s.metadata.hasPendingWrites } });
    const wrapQuery = s => ({ docs: s.docs.map(wrapDoc), size: s.size, empty: s.empty, docChanges: () => [], metadata: { fromCache: s.metadata.fromCache, hasPendingWrites: s.metadata.hasPendingWrites } });

    function docRef(path){
      const r = F.doc(fdb, path);
      return {
        id: r.id, path,
        get: async () => { try { return wrapDoc(await F.getDoc(r)); } catch(e){ throw mapErr(e); } },
        set: async d => { try { await F.setDoc(r, d); } catch(e){ throw mapErr(e); } },
        update: async d => { try {
          const pairs = flatten(d, []); if (!pairs.length) return;
          const args = []; pairs.forEach(([p, v]) => args.push(new F.FieldPath(...p), v));
          await F.updateDoc(r, ...args);
        } catch(e){ throw mapErr(e); } },
        delete: async () => { try { await F.deleteDoc(r); } catch(e){ throw mapErr(e); } },
        onSnapshot: (next, err) => F.onSnapshot(r, s => next(wrapDoc(s)), e => err && err(mapErr(e))),
        collection: sub => colRef(path + "/" + sub)
      };
    }
    function colRef(path, orderField){
      const c = F.collection(fdb, path);
      const q = () => orderField ? F.query(c, F.orderBy(orderField)) : c;
      return {
        path,
        doc: id => docRef(id ? path + "/" + id : F.doc(c).path),
        add: async d => { try { const r = await F.addDoc(c, d); return docRef(r.path); } catch(e){ throw mapErr(e); } },
        orderBy: f => colRef(path, f),
        get: async () => { try { return wrapQuery(await F.getDocs(q())); } catch(e){ throw mapErr(e); } },
        onSnapshot: (next, err) => F.onSnapshot(q(), s => next(wrapQuery(s)), e => err && err(mapErr(e)))
      };
    }
    const dbApi = { doc: docRef, collection: p => colRef(p) };

    // vérifier que ce compte a accès
    try { await F.getDoc(F.doc(fdb, "reglages/acces")); canWrite = true; }
    catch(e){
      if (e && e.code === "permission-denied"){
        const g = gate();
        g.querySelector("#fbGateMsg").innerHTML = `<span class="err">Le compte ${currentUser.email} n'a pas accès à ce planner.</span> Demande à Emeline d'ajouter cette adresse, ou connecte-toi avec un autre compte.`;
        const b = g.querySelector("#fbGateBtn"); b.textContent = "Changer de compte";
        b.replaceWith(b.cloneNode(true)); g.querySelector("#fbGateBtn").addEventListener("click", async () => { await A.signOut(auth); location.reload(); });
        return new Promise(() => {}); // reste bloqué sur l'écran
      }
      canWrite = null;
    }
    const g = document.getElementById("fbGate"); if (g) g.remove();
    showUserBadge(auth, A.signOut);
    window.__fbImport = async docs => { // import unique d'une sauvegarde { "chemin/doc": {...} }
      const paths = Object.keys(docs); let n = 0;
      for (let i = 0; i < paths.length; i += 400){
        const b = F.writeBatch(fdb);
        paths.slice(i, i + 400).forEach(p => b.set(F.doc(fdb, p), docs[p]));
        await b.commit(); n += Math.min(400, paths.length - i);
      }
      return n;
    };
    // base vide : proposer l'import unique de la sauvegarde
    try {
      const fs = await F.getDocs(F.collection(fdb, "fiches"));
      if (fs.empty) importBanner();
    } catch {}
    return dbApi;
  }

  function importBanner(){
    const b = document.createElement("div"); b.id = "fbImport";
    b.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:40;max-width:560px;margin:0 auto;background:var(--panel,#fff);color:var(--ink,#1c2230);border:2px solid var(--brass,#9a6b12);border-radius:10px;padding:14px 16px;display:grid;gap:8px;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.15)";
    b.innerHTML = `<strong>Le planner est vide.</strong><span>Si tu as le fichier de sauvegarde (planner-crown-sauvegarde.json), importe-le une seule fois pour récupérer les villes, opérations et menaces.</span><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input type="file" accept=".json,application/json"><button type="button" style="font:inherit;border:none;background:none;text-decoration:underline;cursor:pointer;color:inherit">Ignorer</button></div><span class="msg"></span>`;
    const msg = b.querySelector(".msg");
    b.querySelector("button").addEventListener("click", () => b.remove());
    b.querySelector("input").addEventListener("change", async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        const docs = data && data.docs ? data.docs : data;
        msg.textContent = "Import en cours…";
        const n = await window.__fbImport(docs);
        msg.textContent = n + " éléments importés. Rechargement…";
        setTimeout(() => location.reload(), 900);
      } catch(err){ msg.textContent = "Import impossible : " + (err.message || err); }
    });
    document.body.appendChild(b);
  }

  const userApi = {
    can: async name => name === "data.write" ? canWrite : null,
    isOwner: async () => false, canEdit: async () => !!canWrite
  };
  window.claude = {
    use: async name => {
      if (name === "db"){ if (!ready) ready = build().catch(e => { console.error(e); return null; }); return ready; }
      if (name === "user"){ if (ready) await ready; return userApi; }
      return null;
    }
  };
})();
