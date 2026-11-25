/**
 * CAPTAÇÃO PENHA — a aba do Alumma tem que filtrar, ordenar, agrupar e exportar
 * IGUAL ao painel original (Desktop/Captação Penha), imóvel por imóvel.
 * Roda com: node src/lib/__tests__/captacaoPenha.test.mjs
 *
 * Como confere: `original()` aqui embaixo é a regra do painel original, copiada
 * do template.html dele sem mexer; o teste carrega a base de verdade
 * (public/captacao-penha/dados.json), sorteia centenas de combinações de
 * filtros e compara o resultado das duas — a lista (na ordem), os números do
 * painel, as abas por prédio/construtora/imobiliária, os destaques do cartão e
 * a planilha.
 *
 * Também confere a própria base (formato de cada imóvel). Rodar depois de
 * atualizar a varredura, antes do push: se o motor mudou algum campo, quebra
 * aqui e não na tela do corretor.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';

async function compila(rel) {
  const js = ts.transpileModule(fs.readFileSync(path.resolve(rel), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const tmp = path.join(os.tmpdir(), `${path.basename(rel, '.ts')}-teste-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmp, js, 'utf8');
  const mod = await import('file://' + tmp.replace(/\\/g, '/'));
  fs.unlinkSync(tmp);
  return mod;
}
const L = await compila('src/lib/captacaoPenha.ts');
const TXT = fs.readFileSync(path.resolve('public/captacao-penha/dados.json'), 'utf8');
const novaCopia = () => JSON.parse(TXT);

let falhas = 0, feitos = 0;
function checa(nome, obtido, esperado, detalhe) {
  feitos++;
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a === b) return true;
  falhas++;
  if (falhas <= 12) {
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    console.log(`✗ ${nome}${detalhe ? ' — ' + detalhe : ''}\n    alumma:   …${String(a).slice(Math.max(0, i - 60), i + 140)}\n    original: …${String(b).slice(Math.max(0, i - 60), i + 140)}`);
  }
  return false;
}

// ===========================================================================
// O PAINEL ORIGINAL — trechos do template.html (versão de 25/11/2026), sem
// alteração de regra. Só o que mexe em tela (DOM) ficou de fora.
// ===========================================================================
function original(D) {
  var META = D.meta, ITEMS = D.items;
  var ST = {c:'Pronto confirmado',p:'Provável pronto',a:'A confirmar',t:'Terreno'};
  var AD = {P:'Particular',I:'Imobiliária ou corretor',C:'Construtora',X:'Não informado'};
  var KIND = {predio:'prédio',residencial:'residencial',condominio:'condomínio',loteamento:'loteamento'};
  var BST = {pronto:'entregue',obra:'em obra',misto:'parte entregue'};
  var NONE = '∅';
  var FT = {}; META.feats.forEach(function(f){ FT[f[0]] = f[1]; });
  var ACC = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
  var na = function(s){ return String(s||'').normalize('NFD').replace(ACC,'').toLowerCase(); };
  var nz = function(s){ return na(s).replace(/[-_\/]+/g,' ').replace(/\s+/g,' '); };
  var nf = new Intl.NumberFormat('pt-BR');
  var short = function(v){ if(!v) return '–'; if(v>=1e6) return 'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:2})+' mi'; return 'R$ '+Math.round(v/1e3)+' mil'; };
  var dmy = function(s){ if(!s) return ''; var p=s.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; };
  var has = function(o){ for(var k in o) return true; return false; };
  var cnt = function(o){ return Object.keys(o).length; };
  var pct = function(x){ return Math.round(Math.abs(x)*100)+'%'; };
  var tempo = function(d){ if(d<60) return d+(d===1?' dia':' dias'); if(d<365) return Math.round(d/30.4)+' meses'; var a=d/365; return (a<1.95?'1 ano':Math.round(a)+' anos'); };
  function median(arr){ if(!arr.length) return null; var s=arr.slice().sort(function(a,b){ return a-b; }); var m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; }
  function intOf(s){ var d = String(s||'').replace(/[^\d]/g,''); return d==='' ? null : Number(d); }
  function moneyOf(s){
    s = na(s).replace(/r\$/g,'').trim(); if(!s) return null;
    var letras = s.replace(/[^a-z]/g,''), numtxt = s.replace(/[^\d.,]/g,'').replace(/^(\d{4,}|\d{1,3}(?:\.\d{3})+),\d{2}$/, '$1'); if(!numtxt) return null;
    var unit = /^(mil|k)$/.test(letras) ? 1e3 : /^(mi|m|mm|milhao|milhoes)$/.test(letras) ? 1e6 : 0;
    var v = /^\d{1,3}[.,]\d{1,2}$/.test(numtxt) ? parseFloat(numtxt.replace(',','.')) : Number(numtxt.replace(/[.,]/g,''));
    if(!isFinite(v) || v<=0) return null;
    if(unit) v = v*unit; else if(v<30) v = v*1e6; else if(v<100000) v = v*1e3;
    return Math.round(v);
  }
  function daysOf(s){
    s = na(s).trim(); if(!s) return null;
    var letras = s.replace(/[^a-z]/g,'');
    var mult = /^(m|mes|meses)$/.test(letras) ? 30 : /^(a|ano|anos)$/.test(letras) ? 365 : /^(s|sem|semana|semanas)$/.test(letras) ? 7 : 1;
    if(mult===1) return intOf(s);
    var m = /\d+(?:[.,]\d+)?/.exec(s); if(!m) return null;
    return Math.round(parseFloat(m[0].replace(',','.')) * mult);
  }
  var hid = {}, notes = {};

  var scan = new Date(META.scan+'T12:00:00');
  var byId = {};
  ITEMS.forEach(function(it){
    byId[it.i] = it;
    it._m2 = it.p && it.a ? it.p/it.a : null;
    it._ft = {}; (it.f||[]).forEach(function(c){ it._ft[c]=1; });
    it._ans = (it.an||[]).filter(function(a){ return a[0] && a[1]!=='P'; }).map(function(a){ return a[0]; });
    (it.l||[]).forEach(function(l){ if(l[3] && !l[5] && l[3]!=='Proprietário' && it._ans.indexOf(l[3])<0) it._ans.push(l[3]); });
    it._em = it.em || NONE; it._co = it.co || NONE;
    it._txt = nz([it.t,it.tp,it.em,it.co,it.ba,it.r,it.de,it.sx,it.w,it._ans.join(' '),(it.k||[]).join(' '),(it.f||[]).map(function(c){ return FT[c]; }).join(' '),ST[it.st],it.ad==='P'?'proprietario particular dono direto':''].join(' '));
    it._drop = !!(it.o && it.p && it.o > it.p);
    it._days = it.pu ? Math.max(0, Math.round((scan - new Date(it.pu+'T12:00:00'))/864e5)) : null;
    it._new = it._days!=null && it._days<=15;
    it._dif = (it.mr && it._m2) ? (it._m2/it.mr[0] - 1) : null;
    var rec = it.d ? Math.max(0, 20 - (scan - new Date(it.d+'T12:00:00'))/864e5) : 0;
    it._cap = (it.ad==='P'?1000:0) + (it.n>=2?100+it.n*5:0) + (it.st==='c'?30:(it.st==='p'||it.st==='t')?15:0) + rec + (it._drop?10:0) + (it.im&&it.im.length?3:0);
    var b = -1; (it.l||[]).some(function(l,i){ if(l[5]){ b = i; return true; } return false; }); it._best = b<0 ? 0 : b;
  });

  function defState(){ return { text:'', who:'', pmin:null, pmax:null, qmin:null, qmax:null, mar:null, dmin:null, dmax:null, tp:{}, ba:{}, st:{c:1,p:1,t:1}, em:{}, co:{}, an:{}, hid:false }; }
  var S = defState();
  var UI = { sort:'cap', tab:'im', limit:48, gq:'', gsort:'n' };
  var NUMF = { pmin:moneyOf, pmax:moneyOf, qmin:intOf, qmax:intOf, mar:intOf, dmin:daysOf, dmax:daysOf };
  var PAR = { pmin:'pmax', pmax:'pmin', qmin:'qmax', qmax:'qmin', dmin:'dmax', dmax:'dmin' };
  function shown(id){ return S[id]==null ? '' : (id==='pmin' || id==='pmax') ? nf.format(S[id]) : String(S[id]); }
  function lohi(a, b){ return (a!=null && b!=null && a>b) ? [b,a] : [a,b]; }
  var R = { p:[null,null], q:[null,null], d:[null,null] };
  var Q = {inc:[],exc:[]};
  function parseQuery(s){ var inc=[],exc=[],re=/(-?)"([^"]+)"|(-?)([^\s"]+)/g,m; while((m=re.exec(s||''))){ var neg=(m[1]||m[3])==='-', v=nz(m[2]||m[4]||'').trim(); if(v) (neg?exc:inc).push(v); } return {inc:inc,exc:exc}; }
  function stDefault(){ return !!(S.st.c && S.st.p && S.st.t && !S.st.a); }

  function pass(it, skip){
    if(S.hid){ if(!hid[it.i]) return false; } else if(hid[it.i]) return false;       // "ver os excluídos" mostra só eles
    if(skip!=='st' && !S.st[it.st]) return false;
    if(skip!=='who' && S.who){ if(S.who==='P'){ if(it.ad!=='P') return false; } else if(it.ad==='P' && !(it.n>=1)) return false; }
    if(skip!=='tp' && has(S.tp) && !S.tp[it.tp]) return false;
    if(skip!=='ba' && has(S.ba) && !S.ba[it.ba||'(não informado)']) return false;
    if(has(S.em) && !S.em[it._em]) return false;
    if(has(S.co) && !S.co[it._co]) return false;
    var i, ok;
    if(has(S.an)){ ok=false; for(i=0;i<it._ans.length;i++){ if(S.an[it._ans[i]]){ ok=true; break; } } if(!ok) return false; }
    if(R.p[0]!=null && !(it.p && it.p>=R.p[0])) return false;
    if(R.p[1]!=null && !(it.p && it.p<=R.p[1])) return false;
    if(R.q[0]!=null && !((it.q||0)>=R.q[0])) return false;
    if(R.q[1]!=null && !(it.q && it.q<=R.q[1])) return false;
    if(S.mar!=null && !(it._ft.fm || (it.dm!=null && it.dm<=S.mar))) return false;
    if(R.d[0]!=null || R.d[1]!=null){ if(it._days==null) return false; if(R.d[0]!=null && it._days<R.d[0]) return false; if(R.d[1]!=null && it._days>R.d[1]) return false; }
    for(i=0;i<Q.inc.length;i++){ if(it._txt.indexOf(Q.inc[i])<0) return false; }
    for(i=0;i<Q.exc.length;i++){ if(it._txt.indexOf(Q.exc[i])>=0) return false; }
    return true;
  }
  var sorters = {
    cap:function(a,b){ return b._cap-a._cap || (a.p||9e15)-(b.p||9e15); },
    new:function(a,b){ return (b.d||b.pu||'').localeCompare(a.d||a.pu||'') || b._cap-a._cap; },
    old:function(a,b){ return (b._days==null?-1:b._days)-(a._days==null?-1:a._days) || b._cap-a._cap; },
    pa:function(a,b){ return (a.p||9e15)-(b.p||9e15); },
    pd:function(a,b){ return (b.p||0)-(a.p||0); }
  };

  var TPK = [], BAK = [];
  (function(){ var t = {}, b = {}; ITEMS.forEach(function(it){ t[it.tp] = (t[it.tp]||0)+1; var k = it.ba||'(não informado)'; b[k] = (b[k]||0)+1; }); TPK = Object.keys(t).sort(function(x,y){ return t[y]-t[x]; }); BAK = Object.keys(b).sort(function(x,y){ return b[y]-b[x]; }); })();
  function countBy(key, getVal){ var c = {}; ITEMS.forEach(function(it){ if(pass(it,key)){ var v = getVal(it); c[v] = (c[v]||0)+1; } }); return c; }
  function anyFilter(){ return !!(S.text || S.who || S.pmin!=null || S.pmax!=null || S.qmin!=null || S.qmax!=null || S.mar!=null || S.dmin!=null || S.dmax!=null || has(S.tp) || has(S.ba) || !stDefault() || has(S.em) || has(S.co) || has(S.an) || S.hid); }

  var SUG = {em:[],co:[],ba:[],an:[]};
  (function(){
    var c = {em:{},co:{},ba:{},an:{}};
    ITEMS.forEach(function(it){ if(it.em) c.em[it.em] = (c.em[it.em]||0)+1; if(it.co) c.co[it.co] = (c.co[it.co]||0)+1; if(it.ba) c.ba[it.ba] = (c.ba[it.ba]||0)+1; it._ans.forEach(function(a){ c.an[a] = (c.an[a]||0)+1; }); });
    Object.keys(c).forEach(function(k){ SUG[k] = Object.keys(c[k]).map(function(n){ return [n, c[k][n], nz(n)]; }).sort(function(a,b){ return b[1]-a[1]; }); });
  })();
  // renderSug, sem a parte de tela: [grupo, nome, quantos]
  function sugestoes(valorDoCampo){
    var raw = valorDoCampo.trim(), v = nz(raw);
    if(v.length<2) return null;
    var out = [];
    ['em','co','ba','an'].forEach(function(k){
      var m = SUG[k].filter(function(x){ return x[2].indexOf(v)>=0; }).slice(0, 5);
      if(m.length) out.push([k, m.map(function(x){ return [x[0], x[1]]; })]);
    });
    return out;
  }
  // activeChips, sem a parte de tela: [rótulo, o que o × tira]
  function chips(){
    var a = [], add = function(label, rm){ a.push([label, rm]); };
    if(S.hid) add('Vendo só os anúncios que você excluiu', ['hid']);
    [['em','Prédio não identificado','Prédio: '],['co','Construtora não identificada','Construtora: '],['an','','Imobiliária: ']].forEach(function(x){
      Object.keys(S[x[0]]).forEach(function(v){ add(v===NONE ? x[1] : x[2]+v, [x[0], v]); });
    });
    return a;
  }

  function facts(it){
    var a = [];
    if(it.a) a.push('<b>'+nf.format(Math.round(it.a))+'</b> m²');
    if(it.q) a.push('<b>'+it.q+'</b> '+(it.q===1?'quarto':'quartos')+(it.s?' ('+it.s+' '+(it.s===1?'suíte':'suítes')+')':''));
    if(it.b) a.push('<b>'+it.b+'</b> '+(it.b===1?'banheiro':'banheiros'));
    if(it.v) a.push('<b>'+it.v+'</b> '+(it.v===1?'vaga':'vagas'));
    return a.join(' · ');
  }
  function highlights(it){
    var h = [];
    if(it.ad==='P') h.push(['own','Anúncio direto de particular']);
    if(it.n>=2) h.push(['multi',(it.ad==='P'?'Também em ':'Em ')+it.n+' imobiliárias, sem exclusividade']);
    if(it._drop) h.push(['drop','Baixou '+Math.round((1-it.p/it.o)*100)+'% (era '+short(it.o)+')']);
    if(it._days!=null) h.push([it._days>=180?'old':'', (it._new?'Novo: anunciado há ':'Anunciado há ')+(it.pe?'cerca de ':'')+tempo(it._days)]);
    if(it._ft.fm) h.push(['','Frente mar']); else if(it.dm!=null) h.push(['','A '+nf.format(it.dm)+' m do mar']);
    if(it._dif!=null && it._dif<=-0.10) h.push(['good','m² '+pct(it._dif)+' abaixo do típico '+(it.mr[1]==='e'?'do prédio':'do bairro')]);
    ['ur','pe'].forEach(function(c){ if(it._ft[c]) h.push(['', FT[c]]); });
    return h.slice(0,6);
  }
  var SRC = {OLX:'OLX',VR:'VivaReal',ZAP:'ZAP',IW:'Imovelweb',CNM:'Chaves na Mão',ISC:'Imóveis-SC',DWV:'DWV',SITE:'site da imobiliária'};
  function adLabel(l){ if(l[5]) return 'Ver anúncio do particular no '+SRC[l[0]]; if(l[0]==='SITE') return 'Ver no site da imobiliária'; return 'Ver anúncio no '+SRC[l[0]]; }
  // de details(): a linha miúda e o link do mapa
  function miudos(it){
    var x = [];
    if(it.pu) x.push(it.pe ? 'publicado por volta de '+it.pu.slice(5,7)+'/'+it.pu.slice(0,4) : 'publicado em '+dmy(it.pu));
    if(it.d) x.push('atualizado em '+dmy(it.d));
    if(it.cd) x.push('condomínio R$ '+nf.format(it.cd));
    if(it.ip) x.push('IPTU R$ '+nf.format(it.ip));
    if(it._dif!=null && it._dif>=0.10) x.push('m² '+pct(it._dif)+' acima do típico '+(it.mr[1]==='e'?'do prédio':'do bairro'));
    if(it.k) x.push('código '+it.k.slice(0,3).join(', '));
    return x.join(' · ');
  }
  function mapa(it){
    var q = it.g ? it.g[0]+','+it.g[1] : ((it.r?it.r+', ':'')+(it.ba?it.ba+', ':'')+'Penha, SC');
    if(it.g || it.r) return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);
    return null;
  }

  var current = [];
  function groupData(kind){
    var m = {}, keysOf = kind==='emp' ? function(it){ return [it._em]; } : kind==='con' ? function(it){ return [it._co]; } : function(it){ return it._ans; };
    current.forEach(function(it){ keysOf(it).forEach(function(k){ (m[k] = m[k] || []).push(it); }); });
    var top = function(list, f, n){ var c = {}; list.forEach(function(it){ var v = f(it); if(v) c[v] = (c[v]||0)+1; }); return Object.keys(c).sort(function(a,b){ return c[b]-c[a]; }).slice(0, n||1); };
    return Object.keys(m).map(function(key){
      var list = m[key], ps = list.map(function(it){ return it.p; }).filter(Boolean), ms = list.map(function(it){ return it._m2; }).filter(Boolean), im = {};
      list.forEach(function(it){ it._ans.forEach(function(n){ im[n] = 1; }); });
      var r = { key:key, none:key===NONE, n:list.length, own:list.filter(function(it){ return it.ad==='P'; }).length, imob:cnt(im), pmin:ps.length?Math.min.apply(null,ps):null, pmax:ps.length?Math.max.apply(null,ps):null, pmed:median(ps), m2:median(ms) };
      if(kind==='emp'){ var e = META.emps[key]; r.sub = r.none ? 'o anúncio não cita o prédio' : [e?KIND[e[0]]:'', e&&e[1]?BST[e[1]]:'', top(list,function(it){ return it.co; })[0]||'', top(list,function(it){ return it.ba; })[0]||''].filter(Boolean).join(' · '); }
      else if(kind==='con'){ var es = top(list,function(it){ return it.em; },99); r.sub = r.none ? 'prédio sem construtora conhecida ou não identificado' : (es.length ? es.length+(es.length===1?' empreendimento: ':' empreendimentos: ')+es.slice(0,4).join(', ')+(es.length>4?'…':'') : 'citada no texto do anúncio'); }
      else { r.solo = list.filter(function(it){ return it.n<=1 && it.ad!=='P'; }).length; r.sub = top(list,function(it){ return it.ba; },3).join(', '); }
      return r;
    });
  }
  // renderGroups, sem a parte de tela: as linhas, filtradas pelo que se digitou e ordenadas
  function linhasDoGrupo(kind, q, gsort){
    var rows = groupData(kind);
    var named = rows.filter(function(r){ return !r.none; }).length;
    if(q) rows = rows.filter(function(r){ return !r.none && nz(r.key+' '+(r.sub||'')).indexOf(q)>=0; });
    var srt = { n:function(a,b){ return b.n-a.n; }, nome:function(a,b){ return a.key.localeCompare(b.key); }, own:function(a,b){ return b.own-a.own || b.n-a.n; }, pmed:function(a,b){ return (b.pmed||0)-(a.pmed||0); } }[gsort] || function(a,b){ return b.n-a.n; };
    rows.sort(function(a,b){ if(a.none!==b.none) return a.none?1:-1; return srt(a,b); });
    return { named:named, rows:rows };
  }
  // renderTabs, sem a parte de tela
  function abas(){
    var e = {}, c = {}, a = {};
    current.forEach(function(it){ if(it.em) e[it.em] = 1; if(it.co) c[it.co] = 1; it._ans.forEach(function(n){ a[n] = 1; }); });
    return { im:current.length, emp:cnt(e), con:cnt(c), imob:cnt(a) };
  }
  function csv(){
    var head = ['Situação','Motivo','Tipo','Preço','Preço anterior','Área m²','R$/m²','Quartos','Suítes','Banheiros','Vagas','Bairro','Rua','Prédio ou loteamento','Prédio pelo endereço','Construtora','O anúncio diz','Distância do mar (m)','Dias anunciado','Condomínio','IPTU','Quem anuncia','Anunciantes','Nº imobiliárias','Título','Códigos','Publicado','Atualizado','Links','Anotação'];
    var cell = function(v){ v = v==null?'':String(v); return '"'+v.replace(/"/g,'""')+'"'; };
    var lines = [head.map(cell).join(';')].concat(current.map(function(it){
      return [ST[it.st], it.w, it.tp, it.p||'', it.o||'', it.a?String(it.a).replace('.',','):'', it._m2?Math.round(it._m2):'',
        it.q, it.s, it.b, it.v, it.ba, it.r, it.em, it.ei?'sim':'', it.co, (it.f||[]).map(function(c){ return FT[c]; }).join(' | '), it.dm, it._days, it.cd, it.ip, AD[it.ad],
        (it.an||[]).map(function(a){ return a[0]||'Particular'; }).join(' | '), it.n, it.t, (it.k||[]).join(' | '), dmy(it.pu), dmy(it.d), (it.l||[]).map(function(l){ return l[1]; }).join(' | '), notes[it.i]||''].map(cell).join(';');
    }));
    return String.fromCharCode(0xFEFF)+lines.join('\r\n');
  }
  // o "change" de um campo de número: lê, troca "de" e "até" se vieram invertidos e mostra arrumado
  function sairDoCampo(id, texto){
    S[id] = NUMF[id](texto);
    var par = PAR[id];
    if(par){ var lo = /min$/.test(id) ? id : par, hi = lo===id ? par : id; if(S[lo]!=null && S[hi]!=null && S[lo]>S[hi]){ var t = S[lo]; S[lo] = S[hi]; S[hi] = t; } }
    var r = {}; Object.keys(NUMF).forEach(function(k){ r[k] = [S[k], shown(k)]; }); return r;
  }

  return {
    ITEMS: ITEMS, TPK: TPK, BAK: BAK, moneyOf: moneyOf, daysOf: daysOf, intOf: intOf, parseQuery: parseQuery,
    defState: defState, sairDoCampo: sairDoCampo,
    usar: function(s, excl, anot){ S = s; hid = excl || {}; notes = anot || {}; Q = parseQuery(S.text); R.p = lohi(S.pmin, S.pmax); R.q = lohi(S.qmin, S.qmax); R.d = lohi(S.dmin, S.dmax); },
    lista: function(sort){ current = ITEMS.filter(function(it){ return pass(it); }).sort(sorters[sort]); return current; },
    painel: function(){
      var nP = 0, nI = 0;
      ITEMS.forEach(function(it){ if(!pass(it,'who')) return; if(it.ad==='P') nP++; if(it.ad!=='P' || it.n>=1) nI++; });
      return { particular:nP, imobiliaria:nI, st:countBy('st', function(it){ return it.st; }), tp:countBy('tp', function(it){ return it.tp; }), ba:countBy('ba', function(it){ return it.ba||'(não informado)'; }) };
    },
    anyFilter: anyFilter, sugestoes: sugestoes, chips: chips, facts: facts, highlights: highlights, adLabel: adLabel, miudos: miudos, mapa: mapa,
    linhasDoGrupo: linhasDoGrupo, abas: abas, csv: csv,
  };
}

// ===========================================================================
// 1) A base: formato de cada imóvel
// ===========================================================================
{
  const D = novaCopia();
  const ids = new Set();
  const feats = new Set(D.meta.feats.map((f) => f[0]));
  const erros = [];
  const erro = (it, m) => { if (erros.length < 8) erros.push(`${it.i}: ${m}`); };
  D.items.forEach((it) => {
    if (typeof it.i !== 'string' || !it.i) erro(it, 'sem identificação');
    if (ids.has(it.i)) erro(it, 'identificação repetida'); ids.add(it.i);
    if (/^__.*__$/.test(it.i)) erro(it, 'identificação reservada do Firestore');
    if (typeof it.t !== 'string' || !it.t) erro(it, 'sem título');
    if (typeof it.tp !== 'string' || !it.tp) erro(it, 'sem tipo');
    if (!'cpat'.includes(it.st) || it.st.length !== 1) erro(it, 'situação ' + it.st);
    if (!'PICX'.includes(it.ad) || it.ad.length !== 1) erro(it, 'anunciante ' + it.ad);
    if (!Array.isArray(it.l) || !it.l.length || it.l.some((l) => !Array.isArray(l) || l.length !== 6 || !/^https?:\/\//.test(l[1]))) erro(it, 'links');
    if (!Array.isArray(it.an) || it.an.some((a) => !Array.isArray(a) || a.length !== 3)) erro(it, 'anunciantes');
    if (!Array.isArray(it.im) || it.im.some((u) => !/^https?:\/\//.test(u))) erro(it, 'fotos');
    if (typeof it.n !== 'number') erro(it, 'nº de imobiliárias');
    ['p', 'a', 'q', 's', 'b', 'v', 'dm', 'cd', 'ip', 'o', 'pm'].forEach((k) => { if (it[k] != null && (typeof it[k] !== 'number' || !isFinite(it[k]))) erro(it, 'número em ' + k); });
    ['d', 'pu'].forEach((k) => { if (it[k] != null && !/^\d{4}-\d{2}-\d{2}$/.test(it[k])) erro(it, 'data em ' + k); });
    (it.f || []).forEach((c) => { if (!feats.has(c)) erro(it, 'menção desconhecida ' + c); });
    if (it.em && !D.meta.emps[it.em]) erro(it, 'empreendimento fora do catálogo: ' + it.em);
    if (it.mr && (!Array.isArray(it.mr) || it.mr.length !== 3 || !'eb'.includes(it.mr[1]))) erro(it, 'm² típico');
    if (it.g && (!Array.isArray(it.g) || it.g.length !== 2)) erro(it, 'coordenada');
  });
  checa('base: formato dos imóveis', erros, []);
  checa('base: data da varredura', /^\d{4}-\d{2}-\d{2}$/.test(D.meta.scan), true);
  checa('base: tem imóveis', D.items.length > 500, true, 'só ' + D.items.length);
  console.log(`base de ${D.meta.scan.split('-').reverse().join('/')}: ${D.items.length} imóveis`);
}

// ===========================================================================
// 2) O que se digita: preço, dias, quartos, busca
// ===========================================================================
const O = original(novaCopia());
const BASE = L.preparar(novaCopia());
{
  const precos = ['', ' ', '500', '1,5', '1.5', '850 mil', '850mil', '2 mi', '2mi', '2 milhões', '1 milhão', '1.200.000', '1.200.000,00', '1200000', 'R$ 750.000', 'r$ 1,2 mi', '29', '30', '99999', '100000',
    '0', '-5', 'abc', '3k', '300 k', '1,25', '12,5', '0,5', '450.000,00', '1.000', '1.000.000,50', '2,5mm', '7 m', '15 mil reais', '1e6', '500.5', '5.000.000', '12', '120', '1200', '12000', '120000', '٣'];
  precos.forEach((s) => checa('preço digitado', L.precoDe(s), O.moneyOf(s), JSON.stringify(s)));
  const dias = ['', '30', '6 meses', '6meses', '1 ano', '2 anos', '2 semanas', '1 sem', '3 m', '1,5 ano', '0', 'abc', '90 dias', '10d', '1 mes', '2 a', '45', '1.5 meses', '18 s'];
  dias.forEach((s) => checa('dias digitados', L.diasDe(s), O.daysOf(s), JSON.stringify(s)));
  ['', '3', '03', '2 quartos', 'x', '10', '1.200', '300 m'].forEach((s) => checa('inteiro digitado', L.inteiroDe(s), O.intOf(s), JSON.stringify(s)));
  ['', 'frente mar', '"frente mar" -permuta', 'Rôgga  santer', '-"sem escritura" casa', 'beto-carrero', '"', '- x', 'a/b_c', 'ÁGUA "Praia Alegre"'].forEach((s) => checa('busca', L.lerBusca(s), O.parseQuery(s), JSON.stringify(s)));
}

// ===========================================================================
// 3) O preparo (o que se calcula uma vez) e as listas fixas
// ===========================================================================
{
  const campos = ['i', '_m2', '_ft', '_ans', '_em', '_co', '_txt', '_drop', '_days', '_new', '_dif', '_cap', '_best'];
  const corta = (it) => campos.map((k) => it[k]);
  checa('preparo: nº de imóveis', BASE.itens.length, O.ITEMS.length);
  let ok = true;
  for (let i = 0; i < O.ITEMS.length && ok; i++) ok = checa('preparo do imóvel', corta(BASE.itens[i]), corta(O.ITEMS[i]), O.ITEMS[i].i);
  checa('tipos, do mais comum pro menos', BASE.tipos, O.TPK);
  checa('bairros, do mais comum pro menos', BASE.bairros, O.BAK);
  ok = true;
  for (let i = 0; i < O.ITEMS.length && ok; i++) {
    const a = BASE.itens[i], b = O.ITEMS[i];
    ok = checa('cartão: fatos', L.fatos(a).map((x) => '<b>' + x[0] + '</b> ' + x[1]).join(' · '), O.facts(b), b.i)
      && checa('cartão: destaques', L.destaques(a, BASE.FT), O.highlights(b), b.i)
      && checa('cartão: linha miúda', L.miudos(a), O.miudos(b), b.i)
      && checa('cartão: mapa', L.mapaDe(a), O.mapa(b), b.i)
      && checa('cartão: botão do anúncio', (a.l || []).map(L.rotuloAnuncio), (b.l || []).map(O.adLabel), b.i);
  }
}

// ===========================================================================
// 4) Filtros sorteados: lista, números do painel, abas, grupos, planilha
// ===========================================================================
function sorteador(semente) { let a = semente >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = sorteador(20261125);
const um = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const PALAVRAS = ['frente mar', 'rogga', 'santer', '-permuta', '"vista mar"', 'armacao', 'mobiliado', 'beto carrero', 'piscina', '-financiamento', 'particular', 'escritura', 'lavitta', 'urgente', 'quadra mar', 'terreno', '"praia alegre"', 'churrasqueira -geminada', 'zzzznada'];
const EMPS = [...new Set(O.ITEMS.map((it) => it._em))];
const CONS = [...new Set(O.ITEMS.map((it) => it._co))];
const ANS = [...new Set(O.ITEMS.flatMap((it) => it._ans))];
const IDS = O.ITEMS.map((it) => it.i);
const PRECOS = [null, 250000, 400000, 500000, 650000, 800000, 1000000, 1500000, 2500000];
function sorteiaFiltro() {
  const S = O.defState();
  if (chance(0.2)) S.text = um(PALAVRAS) + (chance(0.25) ? ' ' + um(PALAVRAS) : '');
  if (chance(0.3)) S.who = um(['P', 'I']);
  if (chance(0.3)) { S.pmin = um(PRECOS); S.pmax = um(PRECOS); }
  if (chance(0.2)) { S.qmin = um([null, 1, 2, 3, 4]); S.qmax = um([null, 1, 2, 3, 5]); }
  if (chance(0.12)) S.mar = um([0, 50, 100, 300, 800, 2000]);
  if (chance(0.15)) { S.dmin = um([null, 0, 15, 30, 90, 180, 365]); S.dmax = um([null, 7, 30, 60, 180, 400]); }
  if (chance(0.2)) S.tp = { [um(O.TPK)]: 1 };
  if (chance(0.2)) S.ba = { [um(O.BAK)]: 1 };
  if (chance(0.3)) { S.st = {}; ['c', 'p', 't', 'a'].forEach((k) => { if (chance(0.6)) S.st[k] = 1; }); }
  if (chance(0.08)) S.em = { [um(EMPS)]: 1 };
  if (chance(0.06)) S.co = { [um(CONS)]: 1 };
  if (chance(0.06)) S.an = { [um(ANS)]: 1 };
  return S;
}
const copia = (x) => JSON.parse(JSON.stringify(x));
// a linha de um grupo, com os campos sempre na mesma ordem (a ordem em que um objeto guarda os campos não é regra)
const linha = (r) => ({ key: r.key, none: r.none, n: r.n, own: r.own, imob: r.imob, pmin: r.pmin, pmax: r.pmax, pmed: r.pmed, m2: r.m2, sub: r.sub, solo: r.solo });
const idsDe = (lista) => lista.map((it) => it.i);
const RODADAS = 600;
let vazias = 0, maior = 0;
for (let r = 0; r < RODADAS; r++) {
  const S = r === 0 ? O.defState() : sorteiaFiltro();
  const excl = {}; const notas = {};
  if (chance(0.5)) { const n = Math.floor(rnd() * 60); for (let k = 0; k < n; k++) excl[um(IDS)] = 1; }
  if (chance(0.2)) { for (let k = 0; k < 20; k++) notas[um(IDS)] = 'ligar "amanhã"; dono\nviaja ' + k; }
  if (chance(0.08) && Object.keys(excl).length) S.hid = true;
  const ordem = um(['cap', 'new', 'old', 'pa', 'pd']);
  const rotulo = `rodada ${r} · ${JSON.stringify(S)} · ordem ${ordem}`;

  O.usar(copia(S), excl, notas);
  const esperado = O.lista(ordem);
  const F = L.aprontar(copia(S));
  const lista = L.listar(BASE, F, excl, ordem);
  if (!checa('lista filtrada e ordenada', idsDe(lista), idsDe(esperado), rotulo)) continue;
  if (!esperado.length) vazias++;
  maior = Math.max(maior, esperado.length);
  checa('números do painel', L.contar(BASE, F, excl), O.painel(), rotulo);
  checa('"limpar tudo" aparece', L.temFiltro(S), O.anyFilter(), rotulo);
  checa('etiquetas', L.etiquetas(S).map((e) => [e.rotulo, e.tira]), O.chips(), rotulo);
  checa('números das abas', L.contarAbas(lista), O.abas(), rotulo);
  if (r % 4 === 0) {
    ['emp', 'con', 'imob'].forEach((tipo) => {
      const q = chance(0.3) ? um(['ro', 'arm', 'imov', 'beach', 'centro', 'xyzq']) : '';
      const gs = um(['n', 'nome', 'own', 'pmed', 'n']);
      const esp = O.linhasDoGrupo(tipo, q, gs);
      const linhas = L.agrupar(tipo, lista, BASE.meta);
      checa(`grupos (${tipo}): quantos com nome`, linhas.filter((x) => !x.none).length, esp.named, rotulo);
      checa(`grupos (${tipo}): linhas`, L.ordenarGrupos(linhas, q, gs).map(linha), esp.rows.map(linha), `${rotulo} · busca "${q}" · ordem ${gs}`);
    });
  }
  if (r % 20 === 0) checa('planilha', L.planilha(lista, notas, BASE.FT), O.csv(), rotulo);
}

// ===========================================================================
// 5) Sugestões da busca e os campos "de/até"
// ===========================================================================
['', 'a', 'ro', 'rôgga', 'ARMAÇÃO', 'praia', 'imov', 'beach club', 'sant', 'cen', 'zzzz', ' la ', 'verde-mar'].forEach((s) => {
  const esp = O.sugestoes(s);
  const obt = L.sugerir(BASE, s);
  checa('sugestões da busca', obt && obt.map((g) => [g.chave, g.itens.map((x) => [x[0], x[1]])]), esp, JSON.stringify(s));
});
{
  const TEXTOS = ['', '500', '1,5', '2 mi', '300', '3', '1', '5', '6 meses', '30', '1 ano', '0', 'x'];
  for (let r = 0; r < 300; r++) {
    const S = O.defState();
    O.usar(S, {}, {});
    let M = L.filtroInicial();
    for (let k = 0; k < 4; k++) {
      const id = um(['pmin', 'pmax', 'qmin', 'qmax', 'mar', 'dmin', 'dmax']);
      const texto = um(TEXTOS);
      const esp = O.sairDoCampo(id, texto);
      M = L.confirmarCampo(M, id, L.LEITOR[id](texto));
      const obt = {}; Object.keys(esp).forEach((c) => { obt[c] = [M[c], L.mostrado(M, c)]; });
      if (!checa('campo "de/até" ao sair', obt, esp, `${id} = "${texto}"`)) break;
    }
  }
}

console.log(`${feitos} conferências · ${RODADAS} combinações de filtros (${vazias} sem resultado, a maior com ${maior} imóveis)`);
if (falhas) { console.log(`\n${falhas} DIFERENÇA(S) entre a aba do Alumma e o painel original.`); process.exit(1); }
console.log('✓ a aba do Alumma bate com o painel original em tudo.');
