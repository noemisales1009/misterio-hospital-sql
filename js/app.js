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
  // nuvem: Supabase com login por usuário (opcional; sem configurar, tudo fica só no navegador)
  var CFG_KEY="misterio-sql-supabase", SES_KEY="misterio-sql-sessao", cfg={}, sessao=null;
  try{cfg=JSON.parse(localStorage.getItem(CFG_KEY)||"{}")}catch(e){}
  try{sessao=JSON.parse(localStorage.getItem(SES_KEY)||"null")}catch(e){}
  var MC=window.MISTERIO_CONFIG||{}, doBuild=!!(MC.url&&MC.key);
  if(!(cfg&&cfg.url&&cfg.key)&&doBuild){cfg={url:MC.url,key:MC.key}}
  cfg=cfg||{};

  var syncBtn=document.createElement("button");syncBtn.type="button";syncBtn.className="syncbtn";
  trail.appendChild(syncBtn);
  function $(id){return document.getElementById(id)}
  var dlg=$("syncDlg"),sbMsg=$("sbMsg");

  function base(){return cfg.url.replace(/\/+$/,"").replace(/\/(rest|auth)\/v1$/,"")}
  function configurado(){return !!(cfg.url&&cfg.key)}
  function logado(){return configurado()&&!!(sessao&&sessao.access_token)}
  function agora(){return Math.floor(Date.now()/1000)}

  function rotulo(){
    syncBtn.dataset.on=logado()?"1":"0";
    syncBtn.textContent=logado()?"☁ "+(sessao.email||"Conectado"):(configurado()?"☁ Entrar":"☁ Salvar na nuvem");
  }
  function painel(){
    $("sbConnGrp").hidden=configurado();
    $("sbAuthGrp").hidden=!configurado()||logado();
    $("sbUserGrp").hidden=!logado();
    $("sbClear").hidden=!configurado()||doBuild;
    $("sbWho").textContent=logado()?"Conectado como "+(sessao.email||"usuário")+". Seu progresso é salvo na nuvem.":"";
  }
  function aviso(t){sbMsg.textContent=t}

  function guardaSessao(r){
    if(r&&r.access_token){
      sessao={access_token:r.access_token,refresh_token:r.refresh_token,
        expires_at:r.expires_at||(agora()+(r.expires_in||3600)),
        email:(r.user&&r.user.email)||(sessao&&sessao.email)||"",
        uid:(r.user&&r.user.id)||(sessao&&sessao.uid)||""};
      try{localStorage.setItem(SES_KEY,JSON.stringify(sessao))}catch(e){}
    }
  }
  function limpaSessao(){
    sessao=null;try{localStorage.removeItem(SES_KEY)}catch(e){}
  }
  function authReq(path,corpo,token){
    var h={apikey:cfg.key,"Content-Type":"application/json"};
    if(token) h.Authorization="Bearer "+token;
    return fetch(base()+"/auth/v1/"+path,{method:"POST",headers:h,body:JSON.stringify(corpo||{})}).then(function(r){
      return r.text().then(function(t){
        var o={};try{o=t?JSON.parse(t):{}}catch(e){}
        if(!r.ok){var er=new Error(o.msg||o.error_description||o.message||o.error||("erro "+r.status));er.status=r.status;throw er}
        return o;
      });
    });
  }
  function msgAuth(e){
    var m=String((e&&e.message)||e);
    if(/invalid login|invalid_grant|invalid credentials/i.test(m)) return "E-mail ou senha incorretos.";
    if(/not confirmed/i.test(m)) return "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.";
    if(/already registered|already been registered|user_already_exists/i.test(m)) return "Este e-mail já tem conta. Use Entrar.";
    if(/password/i.test(m)) return "Senha fraca ou inválida. Use 8 ou mais caracteres.";
    if(/rate limit|too many|over_email_send_rate_limit/i.test(m)) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
    if(/failed to fetch|network/i.test(m)) return "Sem conexão com o Supabase. Confira a internet e a URL.";
    return "Não foi possível concluir. Tente novamente.";
  }
  function sairLocal(){
    limpaSessao();state={};salvaLocal();render();rotulo();painel();
  }
  function garanteToken(){
    if(!logado()) return Promise.reject(new Error("nao logado"));
    if(sessao.expires_at-60>agora()) return Promise.resolve();
    return authReq("token?grant_type=refresh_token",{refresh_token:sessao.refresh_token}).then(guardaSessao).catch(function(e){
      if(e&&e.status&&e.status<500){sairLocal();toast("Sessão expirada. Entre de novo")}
      throw e;
    });
  }
  function api(path,opt){
    opt=opt||{};
    return garanteToken().then(function(){
      opt.headers=Object.assign({apikey:cfg.key,Authorization:"Bearer "+sessao.access_token,"Content-Type":"application/json"},opt.headers||{});
      return fetch(base()+"/rest/v1/"+path,opt);
    }).then(function(r){
      if(!r.ok) return r.text().then(function(t){var er=new Error(r.status+" "+t);er.status=r.status;throw er});
      return r.status===204?null:r.json().catch(function(){return null});
    });
  }
  function salvaLocal(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(err){}}
  function empurra(ids){
    if(!logado()) return Promise.resolve();
    var rows=ids.map(function(id){return {user_id:sessao.uid,fase:id,concluida:!!state[id],atualizado_em:new Date().toISOString()}});
    if(!rows.length) return Promise.resolve();
    return api("progresso?on_conflict=user_id,fase",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});
  }
  function puxa(){
    if(!logado()) return Promise.resolve();
    return api("progresso?select=fase,concluida").then(function(rows){
      var remoto={};
      (rows||[]).forEach(function(r){remoto[r.fase]=r.concluida;state[r.fase]=r.concluida});
      salvaLocal();render();
      var soLocal=Object.keys(state).filter(function(id){return state[id]&&!(id in remoto)});
      return empurra(soLocal);
    });
  }
  function sincroniza(avisar){
    return puxa().then(function(){if(logado()){aviso("✅ Progresso sincronizado.");if(avisar)toast("Progresso sincronizado")}})
      .catch(function(e){
        var m=String((e&&e.message)||e);
        aviso("❌ "+(/42P01|PGRST205|does not exist|schema cache|42703/i.test(m)?"A tabela progresso não existe ou está desatualizada. Rode o banco_do_jogo.sql atualizado no SQL Editor.":"Não deu para sincronizar agora. O progresso segue salvo neste navegador."));
        if(avisar)toast("Não deu para sincronizar. O progresso continua salvo neste navegador");
      });
  }

  function credenciais(){
    var em=$("sbEmail").value.trim(), pw=$("sbPass").value;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)||em.length>254){aviso("Digite um e-mail válido.");return null}
    if(pw.length<8||pw.length>72){aviso("A senha precisa ter de 8 a 72 caracteres.");return null}
    return {email:em,password:pw};
  }
  function aposAutenticar(r){
    $("sbPass").value="";
    if(r&&r.access_token){
      guardaSessao(r);rotulo();painel();aviso("Entrando...");sincroniza(true);
    }else{
      aviso("Conta criada. Confirme seu e-mail e depois clique em Entrar.");
    }
  }
  $("sbLogin").addEventListener("click",function(){
    var c=credenciais();if(!c) return;
    aviso("Entrando...");
    authReq("token?grant_type=password",c).then(aposAutenticar).catch(function(e){aviso("❌ "+msgAuth(e))});
  });
  $("sbSignup").addEventListener("click",function(){
    var c=credenciais();if(!c) return;
    aviso("Criando conta...");
    authReq("signup",c).then(aposAutenticar).catch(function(e){aviso("❌ "+msgAuth(e))});
  });
  $("sbPass").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();$("sbLogin").click()}});
  $("sbLogout").addEventListener("click",function(){
    var tk=sessao&&sessao.access_token;
    if(tk) authReq("logout",{},tk).catch(function(){});
    sairLocal();aviso("Você saiu. O guia voltou ao estado inicial neste navegador.");
  });
  $("sbSave").addEventListener("click",function(){
    var u=$("sbUrl").value.trim().replace(/\/rest\/v1\/?$/,"").replace(/\/+$/,""),k=$("sbKey").value.trim();
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(u)){aviso("Use a URL do projeto: https://xxxx.supabase.co");return}
    try{
      var pl=JSON.parse(atob(k.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
      if(pl.role==="service_role"){aviso("Essa é a chave service_role. Use a chave anon (public).");return}
      if(pl.role!=="anon"){aviso("A chave não parece ser a anon (public).");return}
    }catch(e){aviso("Chave inválida. Copie a chave anon (public) inteira.");return}
    cfg={url:u,key:k};
    try{localStorage.setItem(CFG_KEY,JSON.stringify(cfg))}catch(e){}
    rotulo();painel();aviso("Conectado ao projeto. Agora entre ou crie sua conta.");
  });
  $("sbClear").addEventListener("click",function(){
    var tk=sessao&&sessao.access_token;
    if(tk&&configurado()) authReq("logout",{},tk).catch(function(){});
    cfg={};try{localStorage.removeItem(CFG_KEY)}catch(e){}
    sairLocal();$("sbUrl").value="";$("sbKey").value="";aviso("Desconectado do projeto.");
  });
  $("sbClose").addEventListener("click",function(){dlg.close()});
  syncBtn.addEventListener("click",function(){
    aviso("");painel();
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open","");
  });
  rotulo();painel();

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
  if(logado()) sincroniza(false);
})();
