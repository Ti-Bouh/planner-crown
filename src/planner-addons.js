/* Planner Crown — ajouts du site hébergé (injectés par build.py, indépendants de la source de l'artifact).
   Coller (Ctrl+V) une capture de rapport de raid n'importe où dans le planner l'ouvre dans Début de serveur › Recrutement. */
(function(){
  function toast(msg){
    let t = document.getElementById("capToast");
    if (!t){ t = document.createElement("div"); t.id = "capToast"; t.setAttribute("role", "status");
      t.style.cssText = "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:60;background:var(--panel,#fff);color:var(--ink,#1c2230);border:2px solid var(--brass,#9a6b12);border-radius:10px;padding:10px 16px;font:14px var(--f-body,system-ui);box-shadow:0 6px 24px rgba(0,0,0,.15)";
      document.body.appendChild(t); }
    t.textContent = msg;
  }
  function enJpeg(dataUrl){ return new Promise(ok => { const i = new Image(); i.onload = () => { const c = document.createElement("canvas"); c.width = i.naturalWidth; c.height = i.naturalHeight;
    c.getContext("2d").drawImage(i, 0, 0); ok(c.toDataURL("image/jpeg", 0.92)); }; i.onerror = () => ok(null); i.src = dataUrl; }); }
  document.addEventListener("paste", e => {
    const it = [...((e.clipboardData || {}).items || [])].find(i => i.type && i.type.startsWith("image/"));
    if (!it) return;
    e.preventDefault();
    const rd = new FileReader();
    rd.onload = async () => {
      toast("Capture reçue : ouverture de Début de serveur › Recrutement…");
      let url = rd.result;
      try { sessionStorage.setItem("calcCapture", url); }
      catch { url = await enJpeg(url); try { sessionStorage.setItem("calcCapture", url || ""); } catch { toast("Capture trop lourde : colle-la directement dans Début de serveur › Recrutement."); return; } }
      location.href = "calculs.html#recrutement";
    };
    rd.readAsDataURL(it.getAsFile());
  });
})();
