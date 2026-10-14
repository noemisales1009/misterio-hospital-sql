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
    var toque=false;try{toque=matchMedia("(pointer:coarse)").matches}catch(e){}
    toast(toque?"Texto selecionado: toque e segure para copiar":"Texto selecionado: use Ctrl+C");
  }
  document.querySelectorAll("pre[data-sql]").forEach(function(pre){
    var raw=pre.textContent;
    pre.innerHTML=hl(raw);
    var b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Copiar";
    b.addEventListener("click",function(){copy(raw,pre)});
    pre.parentNode.appendChild(b);
  });
  var copyAll=document.getElementById("copyAll");
  if(copyAll) copyAll.addEventListener("click",function(){
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
  var topBox=document.createElement("div");topBox.className="trail-top";
  var chipsBox=document.createElement("div");chipsBox.className="trail-chips";
  if(trail){trail.appendChild(topBox);trail.appendChild(chipsBox)}
  if(trail&&!document.querySelector(".casos")){
    var voltar=document.createElement("a");
    voltar.className="syncbtn";voltar.id="btnCasos";voltar.href="index.html";
    voltar.className="syncbtn icone";
    voltar.title="Todos os casos";voltar.setAttribute("aria-label","Todos os casos");
    voltar.innerHTML="<span class='ic' aria-hidden='true'><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 11l9-8 9 8'/><path d='M5 10v10h5v-6h4v6h5V10'/></svg></span><span class='rot'>Todos os casos</span>";
    topBox.appendChild(voltar);
  }
  var chips=fases.map(function(sec){
    var a=document.createElement("a");a.className="chip";a.href="#"+sec.id;
    var n={"7":"★","8":"✎","9":"A","10":"B","11":"C","12":"D"}[sec.dataset.fase]||sec.dataset.fase;
    a.innerHTML='<span>'+n+'</span><span>'+sec.dataset.nome+'</span>';
    chipsBox.appendChild(a);return a;
  });
  // celular e tablet: a fileira de fases desliza de lado; mantém a fase atual à vista
  var chipVisto=false;
  function mostraChip(i){
    var c=chips[i];
    if(!c||chipsBox.scrollWidth<=chipsBox.clientWidth) return;
    var calmo=false;try{calmo=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
    chipsBox.scrollTo({left:c.offsetLeft-(chipsBox.clientWidth-c.offsetWidth)/2,behavior:calmo?"auto":"smooth"});
  }
  var cnt=document.createElement("span");cnt.className="count";if(fases.length) topBox.appendChild(cnt);
  function render(){
    var total=0;
    fases.forEach(function(sec,i){
      var cb=sec.querySelector('input[type=checkbox]');
      var on=!!state[sec.id];cb.checked=on;chips[i].classList.toggle("done",on);sec.classList.toggle("feita",on);if(on) total++;
    });
    if(!fases.length) return;
    if(bar) bar.style.width=(total/fases.length*100)+"%";
    cnt.textContent=total+"/"+fases.length;
    atualizaBloqueios();
  }

  // acordeão: as fases ficam fechadas; clicar no título abre e fecha
  document.documentElement.classList.add("acordeao");
  var secoes=[].slice.call(document.querySelectorAll("section.fase")).filter(function(sec,i){
    var head=null,k,c;
    for(k=0;k<sec.children.length;k++){
      c=sec.children[k];
      if(c.classList.contains("fase-head")||c.tagName==="H2"){head=c;break}
    }
    if(!head) return false;
    var corpo=document.createElement("div");
    corpo.className="fase-corpo";
    corpo.id=(sec.id||("sec"+i))+"-corpo";
    var resto=[];
    for(k=0;k<sec.children.length;k++){ if(sec.children[k]!==head) resto.push(sec.children[k]); }
    resto.forEach(function(el){corpo.appendChild(el)});
    if(sec.hasAttribute("data-fase")){
      var nav=document.createElement("div");
      nav.className="fase-nav";
      nav.innerHTML='<button type="button" class="btn" data-dir="-1">← Fase anterior</button><button type="button" class="btn" data-dir="1">Próxima fase →</button>';
      nav.addEventListener("click",function(ev){
        var b=ev.target.closest("button");
        if(!b||b.disabled) return;
        var alvo=fases[fases.indexOf(sec)+parseInt(b.getAttribute("data-dir"),10)];
        if(alvo) abrirPorId(alvo.id,true);
      });
      corpo.appendChild(nav);
    }
    sec.appendChild(corpo);
    head.classList.add("acordeao-cabeca");
    head.setAttribute("role","button");
    head.setAttribute("tabindex","0");
    head.setAttribute("aria-controls",corpo.id);
    head.setAttribute("aria-expanded","false");
    sec._head=head;
    head.addEventListener("click",function(){setAberta(sec,!sec.classList.contains("aberta"))});
    head.addEventListener("keydown",function(e){
      if(e.key==="Enter"||e.key===" "){e.preventDefault();setAberta(sec,!sec.classList.contains("aberta"))}
    });
    return true;
  });
  // fases em sequência: a próxima só libera quando a anterior estiver concluída
  function liberada(i){
    if(i<=0) return true;
    return !!(state[fases[i-1].id]||state[fases[i].id]);
  }
  function bloqueada(sec){
    var i=fases.indexOf(sec);
    return i>-1 && !liberada(i);
  }
  function atualizaBloqueios(){
    var atual=-1;
    fases.forEach(function(sec,i){
      var trava=!liberada(i);
      sec.classList.toggle("bloqueada",trava);
      if(chips[i]) chips[i].classList.toggle("bloqueada",trava);
      if(sec._head) sec._head.setAttribute("aria-disabled",trava?"true":"false");
      var ant=sec.querySelector('.fase-nav [data-dir="-1"]'),prox=sec.querySelector('.fase-nav [data-dir="1"]');
      if(ant) ant.disabled=(i===0);
      if(prox) prox.disabled=(i>=fases.length-1)||!liberada(i+1);
      if(trava&&sec.classList.contains("aberta")) setAberta(sec,false);
      if(atual===-1&&!trava&&!state[sec.id]) atual=i;
    });
    fases.forEach(function(sec,i){
      sec.classList.toggle("atual",i===atual);
      if(chips[i]) chips[i].classList.toggle("atual",i===atual);
    });
    if(!chipVisto&&atual>-1){chipVisto=true;mostraChip(atual)}
  }
  function setAberta(sec,sim){
    if(!sec._head) return;
    if(sim&&bloqueada(sec)){toast("Conclua a fase anterior para liberar esta");return}
    if(sim){
      // uma por vez: abrir esta fecha as outras
      secoes.forEach(function(o){
        if(o!==sec&&o.classList.contains("aberta")){
          o.classList.remove("aberta");
          o._head.setAttribute("aria-expanded","false");
        }
      });
    }
    sec.classList.toggle("aberta",sim);
    sec._head.setAttribute("aria-expanded",sim?"true":"false");
    if(sim) mostraChip(fases.indexOf(sec));
  }
  function abrirPorId(id,rolar){
    var sec=document.getElementById(id);
    if(!sec||!sec._head) return;
    if(bloqueada(sec)){toast("Conclua a fase anterior para liberar esta");return}
    setAberta(sec,true);
    if(rolar) setTimeout(function(){sec.scrollIntoView({behavior:"smooth",block:"start"})},40);
  }
  chips.forEach(function(a,i){
    a.addEventListener("click",function(e){
      e.preventDefault();
      abrirPorId(fases[i].id,true);
      try{history.replaceState(null,"","#"+fases[i].id)}catch(x){}
    });
  });
  if(location.hash) abrirPorId(location.hash.slice(1),true);
  window.addEventListener("hashchange",function(){
    if(location.hash) abrirPorId(location.hash.slice(1),true);
  });
  // nuvem: Supabase com login por usuário (opcional; sem configurar, tudo fica só no navegador)
  var CFG_KEY="misterio-sql-supabase", SES_KEY="misterio-sql-sessao", cfg={}, sessao=null;
  try{cfg=JSON.parse(localStorage.getItem(CFG_KEY)||"{}")}catch(e){}
  try{sessao=JSON.parse(localStorage.getItem(SES_KEY)||"null")}catch(e){}
  var MC=window.MISTERIO_CONFIG||{}, doBuild=!!(MC.url&&MC.key);
  if(!(cfg&&cfg.url&&cfg.key)&&doBuild){cfg={url:MC.url,key:MC.key}}
  cfg=cfg||{};

  var syncBtn=document.createElement("button");syncBtn.type="button";syncBtn.className="syncbtn";syncBtn.id="btnNuvem";
  topBox.appendChild(syncBtn);
  function $(id){return document.getElementById(id)}
  var dlg=$("syncDlg"),sbMsg=$("sbMsg"),lgMsg=$("lgMsg"),tela=$("telaLogin");
  var SKIP_KEY="misterio-sql-sem-login";

  function base(){return cfg.url.replace(/\/+$/,"").replace(/\/(rest|auth)\/v1$/,"")}
  function configurado(){return !!(cfg.url&&cfg.key)}
  function logado(){return configurado()&&!!(sessao&&sessao.access_token)}
  function agora(){return Math.floor(Date.now()/1000)}

  function rotulo(){
    syncBtn.dataset.on=logado()?"1":"0";
    var txt=logado()?"Salvo na nuvem":(configurado()?"Entrar para salvar":"Salvar na nuvem");
    var dica=logado()?("Salvo na nuvem como "+(sessao.email||"usuário")):txt;
    var svgNuvem="<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z'/><path d='M9 14.5l2.2 2.2L15.5 12'/></svg>";
    syncBtn.textContent="";
    var ic=document.createElement("span");ic.className="ic";ic.setAttribute("aria-hidden","true");
    ic.innerHTML=logado()?svgNuvem:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z'/></svg>";
    var rt=document.createElement("span");rt.className="rot";rt.textContent=txt;
    syncBtn.appendChild(ic);syncBtn.appendChild(rt);
    syncBtn.title=dica;syncBtn.setAttribute("aria-label",dica);syncBtn.classList.add("icone");
  }
  function painel(){
    $("sbConnGrp").hidden=configurado();
    $("sbUserGrp").hidden=!logado();
    $("sbClear").hidden=!configurado()||doBuild;
    $("sbWho").textContent=logado()?"Conectado como "+(sessao.email||"usuário")+". Seu progresso é salvo na nuvem.":"";
  }
  function aviso(t){
    sbMsg.textContent=t;lgMsg.textContent=t;
    lgMsg.setAttribute("data-tipo",t.indexOf("❌")===0?"erro":(t.indexOf("✅")===0?"ok":"info"));
  }
  function ocupado(sim){
    ["sbLogin","sbSignup","lgNova","lgEsqueci"].forEach(function(id){var b=$(id);if(b) b.disabled=sim});
    tela.setAttribute("aria-busy",sim?"true":"false");
  }
  function mostraLogin(){
    aviso("");tela.hidden=false;
    try{$("sbEmail").focus()}catch(e){}
  }
  function escondeLogin(){tela.hidden=true}

  function guardaSessao(r){
    if(r&&r.access_token){
      sessao={access_token:r.access_token,refresh_token:r.refresh_token,
        expires_at:r.expires_at||(agora()+(r.expires_in||3600)),
        email:(r.user&&r.user.email)||(sessao&&sessao.email)||"",
        uid:(r.user&&r.user.id)||(sessao&&sessao.uid)||""};
      try{localStorage.setItem(SES_KEY,JSON.stringify(sessao))}catch(e){}
      try{document.dispatchEvent(new Event("misterio:sessao"))}catch(e){}
    }
  }
  function limpaSessao(){
    sessao=null;try{localStorage.removeItem(SES_KEY)}catch(e){}
    try{document.dispatchEvent(new Event("misterio:sessao"))}catch(e){}
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
      guardaSessao(r);rotulo();painel();escondeLogin();sincroniza(true);try{document.dispatchEvent(new Event("misterio:login"))}catch(x){}
    }else{
      aviso("✅ Conta criada. Confirme seu e-mail (veja a caixa de entrada) e depois clique em Entrar.");
    }
  }
  $("sbLogin").addEventListener("click",function(){
    var c=credenciais();if(!c) return;
    ocupado(true);aviso("Entrando...");
    authReq("token?grant_type=password",c).then(aposAutenticar).catch(function(e){aviso("❌ "+msgAuth(e))}).then(function(){ocupado(false)});
  });
  $("sbSignup").addEventListener("click",function(){
    var c=credenciais();if(!c) return;
    ocupado(true);aviso("Criando conta...");
    authReq("signup",c).then(aposAutenticar).catch(function(e){aviso("❌ "+msgAuth(e))}).then(function(){ocupado(false)});
  });
  // ---- tela de login: abas, ver senha, esqueci a senha e link recebido por e-mail
  var modoLogin="entrar";
  function lgModo(m){
    modoLogin=m;
    var ent=(m==="entrar"), cri=(m==="criar"), nov=(m==="nova");
    $("lgTabEntrar").setAttribute("aria-selected",ent?"true":"false");
    $("lgTabCriar").setAttribute("aria-selected",cri?"true":"false");
    $("lgAbas").hidden=nov;
    $("sbLogin").hidden=!ent;$("sbSignup").hidden=!cri;$("lgNova").hidden=!nov;
    $("lgEsqueci").hidden=!ent;
    $("lgCampoEmail").hidden=nov;
    $("lgRotSenha").firstChild.textContent=nov?"Nova senha ":"Senha ";
    $("sbPass").setAttribute("autocomplete",ent?"current-password":"new-password");
    $("lgSubtitulo").textContent=nov?"Escolha uma nova senha":(cri?"Crie sua conta para guardar o progresso":"Entre para continuar de onde parou");
    aviso("");
  }
  $("lgTabEntrar").addEventListener("click",function(){lgModo("entrar")});
  $("lgTabCriar").addEventListener("click",function(){lgModo("criar")});
  $("lgVer").addEventListener("click",function(){
    var p=$("sbPass"),mostrar=p.type==="password";
    p.type=mostrar?"text":"password";
    this.setAttribute("aria-label",mostrar?"Ocultar senha":"Mostrar senha");
    this.setAttribute("aria-pressed",mostrar?"true":"false");
  });
  $("sbPass").addEventListener("keydown",function(e){
    if(e.key!=="Enter") return;
    e.preventDefault();
    $(modoLogin==="criar"?"sbSignup":(modoLogin==="nova"?"lgNova":"sbLogin")).click();
  });
  $("lgEsqueci").addEventListener("click",function(){
    var em=$("sbEmail").value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){aviso("❌ Digite seu e-mail acima para receber o link.");$("sbEmail").focus();return}
    ocupado(true);aviso("Enviando...");
    authReq("recover",{email:em})
      .then(function(){aviso("✅ Se esse e-mail tiver conta, enviamos um link para criar uma nova senha.")})
      .catch(function(e){aviso("❌ "+msgAuth(e))})
      .then(function(){ocupado(false)});
  });
  var tokenRecuperacao="";
  $("lgNova").addEventListener("click",function(){
    var pw=$("sbPass").value;
    if(pw.length<8||pw.length>72){aviso("❌ A senha precisa ter de 8 a 72 caracteres.");return}
    ocupado(true);aviso("Salvando...");
    fetch(base()+"/auth/v1/user",{method:"PUT",headers:{apikey:cfg.key,Authorization:"Bearer "+tokenRecuperacao,"Content-Type":"application/json"},body:JSON.stringify({password:pw})})
      .then(function(r){if(!r.ok) throw new Error("falha");return r.json()})
      .then(function(){$("sbPass").value="";tokenRecuperacao="";lgModo("entrar");aviso("✅ Senha alterada. Entre com a nova senha.")})
      .catch(function(){aviso("❌ Não foi possível alterar a senha. Peça um novo link.")})
      .then(function(){ocupado(false)});
  });
  (function(){
    var h=location.hash.replace(/^#/,"");
    if(h.indexOf("access_token=")===-1||!configurado()) return;
    var p={};
    h.split("&").forEach(function(kv){var i=kv.indexOf("=");if(i>0) p[kv.slice(0,i)]=decodeURIComponent(kv.slice(i+1))});
    try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
    if(!p.access_token) return;
    if(p.type==="recovery"){tokenRecuperacao=p.access_token;mostraLogin();lgModo("nova");return}
    fetch(base()+"/auth/v1/user",{headers:{apikey:cfg.key,Authorization:"Bearer "+p.access_token}})
      .then(function(r){return r.ok?r.json():Promise.reject()})
      .then(function(u){
        guardaSessao({access_token:p.access_token,refresh_token:p.refresh_token,expires_in:parseInt(p.expires_in||"3600",10),user:u});
        rotulo();painel();escondeLogin();sincroniza(true);
        try{document.dispatchEvent(new Event("misterio:login"))}catch(x){}
      }).catch(function(){});
  })();
  $("sbLogout").addEventListener("click",function(){
    var tk=sessao&&sessao.access_token;
    if(tk) authReq("logout",{},tk).catch(function(){});
    sairLocal();try{sessionStorage.removeItem(SKIP_KEY)}catch(e){}
    if(dlg.open) dlg.close();
    mostraLogin();aviso("Você saiu. Entre de novo quando quiser.");
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
    rotulo();painel();if(dlg.open) dlg.close();mostraLogin();
  });
  $("sbClear").addEventListener("click",function(){
    var tk=sessao&&sessao.access_token;
    if(tk&&configurado()) authReq("logout",{},tk).catch(function(){});
    cfg={};try{localStorage.removeItem(CFG_KEY)}catch(e){}
    sairLocal();$("sbUrl").value="";$("sbKey").value="";aviso("Desconectado do projeto.");
  });
  $("sbClose").addEventListener("click",function(){dlg.close()});
  syncBtn.addEventListener("click",function(){
    if(configurado()&&!logado()){mostraLogin();return}
    aviso("");painel();
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open","");
  });
  $("lgPular").addEventListener("click",function(){
    try{sessionStorage.setItem(SKIP_KEY,"1")}catch(e){}
    escondeLogin();
  });
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape"&&!tela.hidden) $("lgPular").click();
  });
  rotulo();painel();
  window.MisterioNuvem={
    logado:logado,
    api:api,
    uid:function(){return sessao&&sessao.uid||""},
    email:function(){return sessao&&sessao.email||""},
    toast:toast,
    sair:function(){var b=document.getElementById("sbLogout");if(b) b.click()},
    abrirLogin:function(){if(configurado()&&!logado()) mostraLogin(); else syncBtn.click()}
  };

  fases.forEach(function(sec){
    sec.querySelector('input[type=checkbox]').addEventListener("change",function(e){
      state[sec.id]=e.target.checked;
      salvaLocal();
      render();
      if(e.target.checked){var nx=sec.nextElementSibling; if(nx&&nx.dataset.fase){toast("Boa! Próxima fase aberta");setAberta(sec,false);abrirPorId(nx.id,true)}}
      empurra([sec.id]).catch(function(){toast("Não foi para a nuvem. Ficou salvo neste navegador")});
    });
  });
  render();
  if(logado()) sincroniza(false);
  else if(configurado()){
    var pulou=false;try{pulou=sessionStorage.getItem(SKIP_KEY)==="1"}catch(e){}
    if(!pulou) mostraLogin();
  }
})();
