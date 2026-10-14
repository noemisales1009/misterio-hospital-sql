(function(){
  // realce simples de SQL
  var KW=/\b(SELECT|FROM|WHERE|AND|OR|LIMIT|COUNT|ORDER BY|DESC|ASC|LIKE|ILIKE|JOIN|ON|IN|AS|GROUP BY|HAVING|BETWEEN|MAX|MIN|AVG|SUM|CREATE TABLE|INSERT INTO|VALUES|UPDATE|SET|DELETE|NOT NULL|NULL|DEFAULT|PRIMARY KEY|GENERATED ALWAYS AS IDENTITY|true|false)\b/g;
  function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
  function hl(src){
    return src.split("\n").map(function(line){
      var ci=line.indexOf("--"), code=line, com="";
      if(ci>-1){code=line.slice(0,ci);com=line.slice(ci)}
      var parts=code.split(/('[^']*')/);
      var out=parts.map(function(p,i){
        if(i%2===1) return '<span class="st">'+esc(p)+'</span>';
        return esc(p).replace(KW,'<span class="kw">$1</span>').replace(/\b(\d+)\b/g,'<span class="nu">$1</span>');
      }).join("");
      return out+(com?'<span class="cm">'+esc(com)+'</span>':"");
    }).join("\n");
  }
  var toastEl=null;
  function toast(msg){
    if(toastEl) toastEl.remove();
    toastEl=document.createElement("div");toastEl.className="toast";toastEl.textContent=msg;
    document.body.appendChild(toastEl);setTimeout(function(){toastEl&&toastEl.remove()},1800);
  }
  function copy(text,fallbackEl){
    var done=function(){toast("Copiado! Cole no SQL Editor")};
    try{
      navigator.clipboard.writeText(text).then(done,function(){selectFallback(fallbackEl)});
    }catch(e){selectFallback(fallbackEl)}
  }
  function selectFallback(el){
    if(!el) return;
    var r=document.createRange();r.selectNodeContents(el);
    var s=getSelection();s.removeAllRanges();s.addRange(r);
    toast("Texto selecionado: use Ctrl+C");
  }
  document.querySelectorAll("pre[data-sql]").forEach(function(pre){
    var raw=pre.textContent;
    pre.innerHTML=hl(raw);
    var b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Copiar";
    b.addEventListener("click",function(){copy(raw,pre)});
    pre.parentNode.appendChild(b);
  });
  document.getElementById("copyAll").addEventListener("click",function(){
    var t=document.getElementById("sqlsrc").textContent;
    try{
      navigator.clipboard.writeText(t).then(function(){toast("Banco copiado! Cole no SQL Editor e clique em Run")},function(){toast("Não deu para copiar aqui. Use o arquivo .sql da conversa")});
    }catch(e){toast("Não deu para copiar aqui. Use o arquivo .sql da conversa")}
  });

  // progresso
  var fases=[].slice.call(document.querySelectorAll("section[data-fase]"));
  var trail=document.getElementById("trail"), bar=document.getElementById("bar");
  var KEY="misterio-sql-progresso", state={};
  try{state=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){}
  var chips=fases.map(function(sec){
    var a=document.createElement("a");a.className="chip";a.href="#"+sec.id;
    var n={"7":"★","8":"✎"}[sec.dataset.fase]||sec.dataset.fase;
    a.innerHTML='<span>'+n+'</span><span>'+sec.dataset.nome+'</span>';
    trail.appendChild(a);return a;
  });
  var cnt=document.createElement("span");cnt.className="count";trail.appendChild(cnt);
  function render(){
    var total=0;
    fases.forEach(function(sec,i){
      var cb=sec.querySelector('input[type=checkbox]');
      var on=!!state[sec.id];cb.checked=on;chips[i].classList.toggle("done",on);if(on) total++;
    });
    bar.style.width=(total/fases.length*100)+"%";
    cnt.textContent=total+"/"+fases.length;
  }
  // sincronização com Supabase (opcional; sem configurar, tudo continua só no navegador)
  var CFG_KEY="misterio-sql-supabase", cfg={};
  try{cfg=JSON.parse(localStorage.getItem(CFG_KEY)||"{}")}catch(e){}
  var syncBtn=document.createElement("button");syncBtn.type="button";syncBtn.className="syncbtn";
  trail.appendChild(syncBtn);
  var dlg=document.getElementById("syncDlg"),sbUrl=document.getElementById("sbUrl"),
      sbKey=document.getElementById("sbKey"),sbMsg=document.getElementById("sbMsg");
  function conectado(){return !!(cfg.url&&cfg.key)}
  function rotulo(){
    syncBtn.dataset.on=conectado()?"1":"0";
    syncBtn.textContent=conectado()?"☁ Sincronizado":"☁ Salvar na nuvem";
  }
  function api(path,opt){
    opt=opt||{};
    opt.headers=Object.assign({apikey:cfg.key,Authorization:"Bearer "+cfg.key,"Content-Type":"application/json"},opt.headers||{});
    return fetch(cfg.url.replace(/\/+$/,"").replace(/\/rest\/v1$/,"")+"/rest/v1/"+path,opt).then(function(r){
      if(!r.ok) return r.text().then(function(t){throw new Error(r.status+" "+t)});
      return r.status===204?null:r.json().catch(function(){return null});
    });
  }
  function salvaLocal(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(err){}}
  function empurra(ids){
    if(!conectado()) return Promise.resolve();
    var rows=ids.map(function(id){return {fase:id,concluida:!!state[id],atualizado_em:new Date().toISOString()}});
    if(!rows.length) return Promise.resolve();
    return api("progresso?on_conflict=fase",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});
  }
  function puxa(){
    if(!conectado()) return Promise.resolve();
    return api("progresso?select=fase,concluida").then(function(rows){
      var remoto={};
      (rows||[]).forEach(function(r){remoto[r.fase]=r.concluida;state[r.fase]=r.concluida});
      salvaLocal();render();
      var soLocal=Object.keys(state).filter(function(id){return state[id]&&!(id in remoto)});
      return empurra(soLocal);
    });
  }
  function sincroniza(avisar){
    return puxa().then(function(){sbMsg.textContent="✅ Conectado e sincronizado.";if(avisar)toast("Progresso sincronizado")})
      .catch(function(e){
        var m=String(e.message||e);
        sbMsg.textContent="❌ "+(/42P01|PGRST205|does not exist|schema cache/i.test(m)?"A tabela progresso não existe. Rode o banco_do_jogo.sql atualizado no SQL Editor.":m.slice(0,200));
        if(avisar)toast("Não deu para sincronizar. O progresso continua salvo neste navegador");
      });
  }
  syncBtn.addEventListener("click",function(){
    sbUrl.value=cfg.url||"";sbKey.value=cfg.key||"";sbMsg.textContent="";
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open","");
  });
  document.getElementById("sbClose").addEventListener("click",function(){dlg.close()});
  document.getElementById("sbSave").addEventListener("click",function(){
    var u=sbUrl.value.trim(),k=sbKey.value.trim();
    if(!/^https:\/\/.+/.test(u)||k.length<20){sbMsg.textContent="Preencha a URL (https://...) e a chave anon.";return}
    cfg={url:u,key:k};
    try{localStorage.setItem(CFG_KEY,JSON.stringify(cfg))}catch(e){}
    rotulo();sbMsg.textContent="Sincronizando...";sincroniza(false);
  });
  document.getElementById("sbClear").addEventListener("click",function(){
    cfg={};try{localStorage.removeItem(CFG_KEY)}catch(e){}
    rotulo();sbUrl.value="";sbKey.value="";sbMsg.textContent="Desconectado. O progresso segue salvo neste navegador.";
  });
  rotulo();

  fases.forEach(function(sec){
    sec.querySelector('input[type=checkbox]').addEventListener("change",function(e){
      state[sec.id]=e.target.checked;
      salvaLocal();
      render();
      if(e.target.checked){var nx=sec.nextElementSibling; if(nx&&nx.dataset.fase) toast("Boa! Próxima fase liberada");}
      empurra([sec.id]).catch(function(){toast("Não foi para a nuvem. Ficou salvo neste navegador")});
    });
  });
  render();
  if(conectado()) sincroniza(false);
})();
