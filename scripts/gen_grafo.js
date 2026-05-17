'use strict';
const fs   = require('fs');
const path = require('path');

const SRC_RA  = 'C:/Users/usuario/precio-justo-scraper/data/red_analisis.json';
const SRC_H   = 'C:/Users/usuario/precio-justo-scraper/data/hackathon_500.json';
const OUT     = path.resolve(__dirname, '..', 'apps', 'web', 'public', 'grafo.html');

// Cuántos contratos tomar por país
const MAX_PER_PAIS = { CO: 500, GT: 877, CL: 1000, SV: 50 };
const MAX_NODES    = 400;

// ── Color por país ─────────────────────────────────────────────────────────────
const PAIS_COLOR = {
  CO: { entidad: '96,165,250',   empresa: '251,146,60'  },  // azul / naranja
  GT: { entidad: '52,211,153',   empresa: '167,139,250' },  // verde / violeta
  CL: { entidad: '251,191,36',   empresa: '248,113,113' },  // amarillo / rojo
  SV: { entidad: '34,211,238',   empresa: '244,114,182' },  // cyan / rosa
};
const PAIS_LABEL = { CO: 'Colombia', GT: 'Guatemala', CL: 'Chile', SV: 'El Salvador' };

// ── URL directa al contrato en portal oficial ────────────────────────────────
// GT: guatecompras.gt bloquea TODO acceso externo (403 incluso en homepage)
// CO: datos.gov.co (Socrata API) — CONFIRMADO funcionando
// SV: comprasal.gob.sv/proceso/{id} — SPA, funciona en browser
// CL: no hay URL directa por contrato (datos históricos MOP 2010-2015)
function buildContractUrl(id, pais) {
  if (!id) return '';
  if (pais === 'CO') {
    // Los IDs CO1.REQ.xxx no están en jbjy-vk9h (SECOP II) y devuelven []
    // Se usa búsqueda por nombre de empresa vía sourceUrl() en el browser
    return '';
  }
  if (pais === 'SV') {
    const num = id.split('-').pop();
    return `https://www.comprasal.gob.sv/proceso/${num}`;
  }
  return ''; // GT bloqueado, CL sin URL directa por contrato
}

// ── Leer datos ────────────────────────────────────────────────────────────────
console.log('Leyendo fuentes...');
const ra = JSON.parse(fs.readFileSync(SRC_RA,  'utf8'));
const hk = JSON.parse(fs.readFileSync(SRC_H,   'utf8'));

// Monopolios Colombia
const monoRaw   = (ra['señales'] || {}).monopolios || [];
const monoEnt   = new Map();
const monoEmp   = new Map();
monoRaw.forEach(m => { monoEnt.set(m.entidad, m); monoEmp.set(m.empresa_dominante, m); });

// ── Normalizar contratos a formato común ──────────────────────────────────────
// red_analisis.json: { entidad_compradora, empresa_ganadora, monto, pais }
// hackathon_500.json: { entidad, empresa_ganadora, monto, pais }  (indexed obj)

function normalizeRA(c) {
  // Para CO siempre usar buildContractUrl (datos.gov.co), no el community.secop.gov.co que da 403
  const url = buildContractUrl(c.id, c.pais) || c.url || '';
  return { pais: c.pais, emp: (c.empresa_ganadora||'').trim(), ent: (c.entidad_compradora||'').trim(), monto: c.monto||0, url };
}
function normalizeHK(c) {
  const url = buildContractUrl(c.id, c.pais) || c.url || '';
  return { pais: c.pais, emp: (c.empresa_ganadora||'').trim(), ent: (c.entidad||c.entidad_compradora||'').trim(), monto: c.monto||0, url };
}

// Todos los países desde hackathon_500 (tiene URLs reales por contrato)
const hkEntries = Array.isArray(hk) ? hk : Object.values(hk);

// Colombia desde hackathon_500 (URLs reales SECOP II)
const coContratos = hkEntries
  .filter(c => c.pais==='CO' && c.empresa_ganadora && (c.entidad||c.entidad_compradora) && c.monto>0)
  .sort((a, b) => b.monto - a.monto)
  .slice(0, MAX_PER_PAIS.CO)
  .map(normalizeHK);
const gtContratos = hkEntries.filter(c => c.pais==='GT' && c.empresa_ganadora && (c.entidad||c.entidad_compradora) && c.monto>0).map(normalizeHK);
const svContratos = hkEntries.filter(c => c.pais==='SV' && c.empresa_ganadora && (c.entidad||c.entidad_compradora) && c.monto>0).map(normalizeHK);
const clContratos = hkEntries.filter(c => c.pais==='CL' && c.empresa_ganadora && (c.entidad||c.entidad_compradora) && c.monto>0)
  .sort((a,b)=>b.monto-a.monto).slice(0, MAX_PER_PAIS.CL).map(normalizeHK);

const allContratos = [...coContratos, ...gtContratos, ...svContratos, ...clContratos];
console.log(`  CO:${coContratos.length} GT:${gtContratos.length} CL:${clContratos.length} SV:${svContratos.length}  Total:${allContratos.length}`);

// ── Agregar edges ─────────────────────────────────────────────────────────────
const edgeMap = new Map();
allContratos.forEach(c => {
  if (!c.emp || !c.ent) return;
  const k = c.pais + '|' + c.emp + '|||' + c.ent;
  if (!edgeMap.has(k)) edgeMap.set(k, { pais: c.pais, emp: c.emp, ent: c.ent, monto: 0, count: 0, sample_url: '' });
  const e = edgeMap.get(k);
  e.monto += c.monto;
  e.count += 1;
  if (!e.sample_url && c.url) e.sample_url = c.url;
});
console.log('  Edges únicos:', edgeMap.size);

// ── Calcular importancia de nodos ─────────────────────────────────────────────
const nodeMap = new Map();
const ensureN = (id, type, name, pais) => {
  if (!nodeMap.has(id)) nodeMap.set(id, { id, type, name, pais, monto: 0, contratos: 0, degree: 0 });
  return nodeMap.get(id);
};
edgeMap.forEach(e => {
  const en = ensureN(e.pais+':emp:'+e.emp, 'empresa', e.emp, e.pais);
  const gn = ensureN(e.pais+':ent:'+e.ent, 'entidad', e.ent, e.pais);
  en.monto += e.monto; en.contratos += e.count; en.degree++;
  gn.monto += e.monto; gn.contratos += e.count; gn.degree++;
});

// ── Seleccionar top N — balanceado por país ───────────────────────────────────
// Garantizar presencia de cada país, luego completar por monto
const sorted = [...nodeMap.values()].sort((a, b) => b.monto - a.monto);

// Primero: nodos de monopolios Colombia (garantizados)
const must = new Set();
monoRaw.forEach(m => {
  const ei = 'CO:emp:' + m.empresa_dominante;
  const gi = 'CO:ent:' + m.entidad;
  if (nodeMap.has(ei)) must.add(ei);
  if (nodeMap.has(gi)) must.add(gi);
});

// Por país: top 60 de cada uno (para asegurar representación)
const GUARANTEE = { CO: 80, GT: 80, CL: 80, SV: 30 };
const paisTaken = { CO: 0, GT: 0, CL: 0, SV: 0 };
const topNodes = [...must].map(id => nodeMap.get(id));
const inSet = new Set([...must]);

// Garantía por país
sorted.forEach(n => {
  if (inSet.has(n.id)) return;
  const limit = GUARANTEE[n.pais] || 0;
  if ((paisTaken[n.pais] || 0) < limit) {
    topNodes.push(n); inSet.add(n.id);
    paisTaken[n.pais] = (paisTaken[n.pais] || 0) + 1;
  }
});

// Completar hasta MAX_NODES
sorted.forEach(n => {
  if (topNodes.length >= MAX_NODES) return;
  if (!inSet.has(n.id)) { topNodes.push(n); inSet.add(n.id); }
});

console.log('  Nodos seleccionados:', topNodes.length, '| must:', must.size);
const byPaisCount = {};
topNodes.forEach(n => { byPaisCount[n.pais] = (byPaisCount[n.pais]||0)+1; });
console.log('  Por país:', byPaisCount);

// ── Enriquecer monopolios Colombia ────────────────────────────────────────────
topNodes.forEach(n => {
  if (n.pais !== 'CO') return;
  const cleanName = n.name;
  if (n.type === 'entidad' && monoEnt.has(cleanName)) {
    const m = monoEnt.get(cleanName);
    n.monopolio = true; n.empresa_dominante = m.empresa_dominante;
    n.monopolio_pct = m.porcentaje; n.mono_c = m.contratos_ganados; n.mono_total = m.total_contratos_entidad;
  } else if (n.type === 'empresa' && monoEmp.has(cleanName)) {
    const m = monoEmp.get(cleanName);
    n.monopolio = true; n.mono_entidad = m.entidad; n.monopolio_pct = m.porcentaje;
  }
});

// ── Links ─────────────────────────────────────────────────────────────────────
const finalLinks = [];
const topSet = new Set(topNodes.map(n => n.id));
edgeMap.forEach(e => {
  const s = e.pais+':emp:'+e.emp, t = e.pais+':ent:'+e.ent;
  if (topSet.has(s) && topSet.has(t))
    finalLinks.push({ source: s, target: t, monto: Math.round(e.monto), count: e.count, pais: e.pais, sample_url: e.sample_url||'' });
});
console.log('  Links:', finalLinks.length);

// ── Slim payload ──────────────────────────────────────────────────────────────
const slimNodes = topNodes.map(n => {
  const o = { id: n.id, name: n.name, type: n.type, pais: n.pais,
    monto: Math.round(n.monto), contratos: n.contratos, degree: n.degree };
  if (n.monopolio) {
    o.monopolio = true;
    if (n.empresa_dominante) o.empresa_dominante = n.empresa_dominante;
    if (n.monopolio_pct)     o.monopolio_pct     = n.monopolio_pct;
    if (n.mono_c)            o.mono_c            = n.mono_c;
    if (n.mono_total)        o.mono_total        = n.mono_total;
    if (n.mono_entidad)      o.mono_entidad      = n.mono_entidad;
  }
  return o;
});

const mc  = slimNodes.filter(n => n.monopolio).length;
const lc  = finalLinks.length;
const data = JSON.stringify({ nodes: slimNodes, links: finalLinks });
console.log('  Payload:', Math.round(data.length/1024), 'KB | Mono:', mc);

// ── Colores y etiquetas para embeber ─────────────────────────────────────────
const paisColorJS  = JSON.stringify(PAIS_COLOR);
const paisLabelJS  = JSON.stringify(PAIS_LABEL);

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d0d0d;overflow:hidden;font-family:system-ui,sans-serif;color:#e2e8f0}
canvas{position:fixed;inset:0;display:block}
#logo{position:fixed;top:14px;left:14px;display:flex;align-items:center;gap:8px;pointer-events:none}
#logo-ic{width:30px;height:30px;border-radius:8px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);display:grid;place-items:center;font-size:14px}
#logo h1{font-size:12px;font-weight:700;color:#f1f5f9}
#logo p{font-size:9px;color:#64748b}
#ctrl{position:fixed;top:14px;right:14px;display:flex;flex-direction:column;gap:6px;width:210px}
#sw{position:relative}
#srch{width:100%;padding:7px 10px 7px 30px;background:rgba(15,23,42,.92);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e2e8f0;font-size:12px;outline:none}
#srch:focus{border-color:rgba(99,102,241,.5)}
#srch::placeholder{color:#475569}
.sic{position:absolute;left:9px;top:50%;transform:translateY(-50%);width:12px;height:12px;color:#475569;pointer-events:none}
.btn{padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.92);color:#94a3b8;font-size:11px;font-weight:600;cursor:pointer;text-align:left;width:100%;transition:all .15s}
.btn:hover{background:rgba(30,41,59,.95);color:#e2e8f0}
.btn.on{background:rgba(239,68,68,.12);color:#fca5a5;border-color:rgba(239,68,68,.35)}
.pais-btns{display:flex;gap:4px;flex-wrap:wrap}
.pbtn{flex:1;min-width:calc(50% - 2px);padding:5px 6px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.92);color:#94a3b8;font-size:10px;font-weight:600;cursor:pointer;text-align:center;transition:all .15s}
.pbtn:hover{background:rgba(30,41,59,.95);color:#e2e8f0}
.pbtn.on{border-color:rgba(255,255,255,.35);color:#f1f5f9;background:rgba(30,41,59,.95)}
#stats{position:fixed;bottom:12px;left:12px;display:flex;gap:12px;background:rgba(9,15,30,.88);border:1px solid rgba(255,255,255,.07);border-radius:9px;padding:6px 12px;pointer-events:none}
.sv{font-size:13px;font-weight:700;color:#f1f5f9}.sl{font-size:8px;color:#475569;margin-top:1px;text-transform:uppercase;letter-spacing:.05em}
#leg{position:fixed;bottom:12px;right:12px;background:rgba(9,15,30,.88);border:1px solid rgba(255,255,255,.07);border-radius:9px;padding:8px 12px;pointer-events:none}
.lt{font-size:8px;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.leg-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 12px}
.li{display:flex;align-items:center;gap:5px;font-size:9px;color:#94a3b8}
.ld{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.lm{width:7px;height:7px;border-radius:50%;border:2px solid #ef4444;flex-shrink:0;animation:mp 1.8s ease-in-out infinite}
@keyframes mp{0%,100%{opacity:.9}50%{opacity:.15}}
#tt{position:fixed;pointer-events:none;background:rgba(9,15,30,.97);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:9px 11px;font-size:11px;max-width:210px;display:none;line-height:1.5;z-index:100}
.tn{font-weight:700;font-size:12px;color:#f1f5f9;margin-bottom:2px}
.tp{font-size:9px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.ts{color:#94a3b8}.tm{color:#fca5a5;margin-top:3px;font-size:10px}
#pnl{position:fixed;top:0;right:0;height:100%;width:280px;background:rgba(9,15,30,.98);border-left:1px solid rgba(255,255,255,.07);transform:translateX(100%);transition:transform .25s;overflow-y:auto;z-index:50}
#pnl.open{transform:none}
#pnl-in{padding:16px}
#pnl-x{position:absolute;top:12px;right:12px;background:none;border:none;color:#475569;font-size:20px;cursor:pointer;line-height:1}
#pnl-x:hover{color:#e2e8f0}
.pb{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:5px;font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.pc-badge{display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700;margin-left:4px;border:1px solid rgba(255,255,255,.15)}
.pn{font-size:13px;font-weight:700;color:#f1f5f9;line-height:1.4;word-break:break-word;margin-bottom:4px}
.pg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}
.ps{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:7px;padding:8px}
.ps-v{font-size:14px;font-weight:700;color:#f1f5f9}.ps-l{font-size:8px;color:#64748b;margin-top:1px;text-transform:uppercase}
.pa{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.22);border-radius:7px;padding:9px;margin:8px 0}
.pa-t{font-size:10px;font-weight:700;color:#fca5a5;margin-bottom:4px}
.pb2{background:rgba(255,255,255,.05);border-radius:3px;height:4px;margin:5px 0}
.pb3{height:4px;border-radius:3px;background:linear-gradient(90deg,#ef4444,#dc2626)}
.pst{font-size:8px;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin:10px 0 4px}
.pci{display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;color:#94a3b8}
.pcd{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.pcn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pcn a{color:inherit;text-decoration:none;cursor:pointer}
.pcn a:hover{color:#e2e8f0;text-decoration:underline}
.pcv{font-size:9px;color:#475569;flex-shrink:0}
.pnl-radar{display:block;margin-top:8px;padding:5px 10px;border-radius:6px;border:1px solid rgba(99,102,241,.3);background:rgba(99,102,241,.08);color:#a5b4fc;font-size:10px;text-decoration:none;text-align:center;cursor:pointer}
.pnl-radar:hover{background:rgba(99,102,241,.15);color:#e0e7ff}
.pnl-nourl{margin-top:8px;padding:5px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:#475569;font-size:10px;text-align:center}
.pci-ext{font-size:10px;color:#475569;text-decoration:none;flex-shrink:0;padding:0 2px}
.pci-ext:hover{color:#94a3b8}
#pnl::-webkit-scrollbar{width:3px}
#pnl::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
`;

// ── JS ────────────────────────────────────────────────────────────────────────
const js = `
(function(){
'use strict';
var nodes=GD.nodes.map(function(d){return Object.assign({},d);});
var links=GD.links.map(function(d){return Object.assign({},d);});
var PCOL=${paisColorJS};
var PLBL=${paisLabelJS};

// URLs de portales oficiales — SOLO portales verificados accesibles externamente
// CO: datos.gov.co ✅ confirmado (devuelve JSON con datos reales)
// CL: mercadopublico.cl search da error 403/SPA; datos MOP son históricos 2010-2015 sin URL directa
// SV: comprasal.gob.sv es SPA (requiere JS del browser, no WebFetch)
// GT: guatecompras.gt bloquea todo acceso externo (403 incluso en homepage)
function sourceUrl(name,pais){
  var enc=encodeURIComponent(name);
  if(pais==='CO')return 'https://www.datos.gov.co/d/jbjy-vk9h?q='+enc;
  if(pais==='SV')return 'https://www.comprasal.gob.sv';
  return '';
}
var cv=document.getElementById('c');
var cx=cv.getContext('2d');
var W,H;
function setSize(){W=cv.width=innerWidth;H=cv.height=innerHeight;}
setSize();
window.addEventListener('resize',function(){setSize();draw();});

function fmtM(m,pais){
  var pre=pais?pais+' ':'';
  if(m>=1e12)return pre+(m/1e12).toFixed(2)+'B';
  if(m>=1e9) return pre+(m/1e9).toFixed(1)+'MM';
  if(m>=1e6) return pre+(m/1e6).toFixed(1)+'M';
  return pre+(m/1e3).toFixed(0)+'K';
}

function nRgb(n){
  var pc=PCOL[n.pais]||PCOL.CO;
  return n.type==='entidad'?pc.entidad:pc.empresa;
}
function nHex(n){
  var rgb=nRgb(n).split(',').map(Number);
  return '#'+rgb.map(function(v){return v.toString(16).padStart(2,'0');}).join('');
}

var maxM =d3.max(nodes,function(d){return d.monto;})||1;
var maxLM=d3.max(links,function(d){return d.monto;})||1;
var rs=d3.scaleSqrt().domain([0,maxM]).range([3,18]);
var ls=d3.scaleLog().domain([Math.max(1,maxLM*.001),maxLM]).range([0.3,3]).clamp(true);

var tx=0,ty=0,tk=1;
var hN=null,sN=null,dN=null,dimSet=null;
var filterPais=null;

var adj=new Map();
nodes.forEach(function(n){adj.set(n.id,{nb:new Set(),lk:[]});});
var adjOk=false;
function mkAdj(){
  links.forEach(function(l){
    var s=l.source&&l.source.id!=null?l.source.id:l.source;
    var t=l.target&&l.target.id!=null?l.target.id:l.target;
    if(adj.has(s)&&adj.has(t)){
      adj.get(s).nb.add(t);adj.get(s).lk.push(l);
      adj.get(t).nb.add(s);adj.get(t).lk.push(l);
    }
  });
  adjOk=true;
}

var sim=d3.forceSimulation(nodes)
  .force('link',d3.forceLink(links).id(function(d){return d.id;})
    .distance(function(d){return 55+rs(d.source.monto||0)+rs(d.target.monto||0);})
    .strength(0.2))
  .force('charge',d3.forceManyBody()
    .strength(function(d){return -55-rs(d.monto)*3;})
    .distanceMax(250))
  .force('center',d3.forceCenter(0,0).strength(0.06))
  .force('col',d3.forceCollide().radius(function(d){return rs(d.monto)+3;}).strength(0.7).iterations(1))
  .alphaDecay(0.02).velocityDecay(0.4);

var ftick=true;
sim.on('tick',function(){if(ftick){mkAdj();ftick=false;}draw();});

var zoom=d3.zoom().scaleExtent([0.04,12])
  .filter(function(e){if(e.type==='mousedown'){return !pick(e);}return !e.button;})
  .on('zoom',function(e){tx=e.transform.x;ty=e.transform.y;tk=e.transform.k;draw();});
d3.select(cv).call(zoom);
d3.select(cv).call(zoom.transform,d3.zoomIdentity.translate(W/2,H/2));

function isVisible(n){
  if(dimSet&&!dimSet.has(n.id))return false;
  if(filterPais&&n.pais!==filterPais)return false;
  return true;
}

function loop(){requestAnimationFrame(loop);draw();}
requestAnimationFrame(loop);

function draw(){
  cx.clearRect(0,0,W,H);
  cx.fillStyle='#0d0d0d';cx.fillRect(0,0,W,H);
  cx.save();cx.translate(tx,ty);cx.scale(tk,tk);
  var now=Date.now();

  links.forEach(function(l){
    var s=l.source,t=l.target;
    if(!s||!t)return;
    if(filterPais&&l.pais!==filterPais)return;
    var sx=s.x!=null?s.x:0,sy=s.y!=null?s.y:0,tx2=t.x!=null?t.x:0,ty2=t.y!=null?t.y:0;
    var si=s.id!=null?s.id:s,ti=t.id!=null?t.id:t;
    var a;
    if(dimSet)a=(dimSet.has(si)&&dimSet.has(ti))?0.5:0.02;
    else if(hN)a=(si===hN.id||ti===hN.id)?0.85:0.03;
    else a=Math.min(0.5,0.1+l.monto/maxLM*0.4);
    if(a<0.02)return;
    cx.beginPath();cx.moveTo(sx,sy);cx.lineTo(tx2,ty2);
    cx.strokeStyle='rgba('+nRgb(s)+','+a.toFixed(2)+')';
    cx.lineWidth=ls(Math.max(1,l.monto));cx.stroke();
  });

  nodes.forEach(function(n){
    var x=n.x!=null?n.x:0,y=n.y!=null?n.y:0;
    var r=rs(n.monto),ih=n===hN,is=n===sN;
    var rgb=nRgb(n);
    var vis=isVisible(n);
    var a;
    if(!vis){
      cx.beginPath();cx.arc(x,y,Math.max(2,r*.25),0,Math.PI*2);
      cx.fillStyle='rgba('+rgb+',.04)';cx.fill();return;
    }
    if(dimSet){a=0.9;}
    else if(hN&&!ih){a=adjOk&&adj.has(hN.id)&&adj.get(hN.id).nb.has(n.id)?0.9:0.08;}
    else{a=0.85;}

    cx.shadowBlur=0;
    if(ih){cx.shadowColor=nHex(n);cx.shadowBlur=14;}
    else if(n.degree>=5&&a>0.5){cx.shadowColor=nHex(n);cx.shadowBlur=3;}

    cx.beginPath();cx.arc(x,y,r,0,Math.PI*2);
    cx.fillStyle='rgba('+rgb+','+(a*(ih?1:.85)).toFixed(2)+')';cx.fill();
    cx.shadowBlur=0;
    cx.strokeStyle='rgba('+rgb+','+(a*.4).toFixed(2)+')';cx.lineWidth=0.7;cx.stroke();

    // País badge (pequeño punto diferenciador)
    if(n.pais!=='CO'&&r>5){
      cx.beginPath();cx.arc(x+r*.6,y-r*.6,2.5,0,Math.PI*2);
      cx.fillStyle='rgba(255,255,255,.5)';cx.fill();
    }

    if(n.monopolio&&a>0.3){
      var p=(Math.sin(now/500)+1)/2;
      cx.beginPath();cx.arc(x,y,r+3+p*2,0,Math.PI*2);
      cx.strokeStyle='rgba(239,68,68,'+(0.25+p*0.65).toFixed(2)+')';
      cx.lineWidth=1.2+p*0.5;cx.stroke();
    }
    if(ih||is){
      cx.beginPath();cx.arc(x,y,r+2.5,0,Math.PI*2);
      cx.strokeStyle='rgba(255,255,255,.5)';cx.lineWidth=1.2;cx.stroke();
    }
  });

  if(tk>0.5){
    var fs=Math.min(11,Math.max(7,9/tk));
    cx.font=fs+'px system-ui,sans-serif';cx.textAlign='center';cx.textBaseline='top';
    nodes.forEach(function(n){
      if(!isVisible(n))return;
      var ih=n===hN,is=n===sN;
      var show=ih||is||(tk>1.2&&n.degree>=3)||(tk>0.7&&n.degree>=8);
      if(!show)return;
      var x=n.x!=null?n.x:0,y=n.y!=null?n.y:0,r=rs(n.monto);
      var lbl='['+n.pais+'] '+(n.name.length>20?n.name.slice(0,19)+'\\u2026':n.name);
      var tw=cx.measureText(lbl).width;
      cx.fillStyle='rgba(13,13,13,.8)';cx.fillRect(x-tw/2-3,y+r+3,tw+6,fs+5);
      cx.fillStyle=ih?'#f1f5f9':'#94a3b8';cx.fillText(lbl,x,y+r+5);
    });
  }
  cx.restore();
}

function pick(e){
  var rect=cv.getBoundingClientRect();
  var mx=(e.clientX-rect.left-tx)/tk,my=(e.clientY-rect.top-ty)/tk;
  var best=null,bd=Infinity;
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i];
    if(!isVisible(n))continue;
    var dx=(n.x!=null?n.x:0)-mx,dy=(n.y!=null?n.y:0)-my,d=dx*dx+dy*dy,r=rs(n.monto)+8;
    if(d<r*r&&d<bd){best=n;bd=d;}
  }
  return best;
}

cv.addEventListener('mousedown',function(e){
  var n=pick(e);if(!n)return;
  dN=n;n.fx=n.x!=null?n.x:0;n.fy=n.y!=null?n.y:0;sim.alphaTarget(0.3).restart();
});
window.addEventListener('mousemove',function(e){
  if(dN){var rect=cv.getBoundingClientRect();dN.fx=(e.clientX-rect.left-tx)/tk;dN.fy=(e.clientY-rect.top-ty)/tk;return;}
  var n=pick(e);if(n!==hN)hN=n;
  if(n){showTT(e,n);}else{hideTT();}
});
window.addEventListener('mouseup',function(){if(dN){dN.fx=null;dN.fy=null;dN=null;sim.alphaTarget(0);}});
cv.addEventListener('click',function(e){var n=pick(e);sN=n||null;if(n)openPanel(n);else closePanel();});

var tt=document.getElementById('tt');
function showTT(e,n){
  var rgb=nRgb(n);
  tt.innerHTML=
    '<div class="tn">'+n.name+'</div>'+
    '<div class="tp" style="color:rgba('+rgb+',1)">'+
    (n.type==='entidad'?'Entidad p&#250;blica':'Empresa privada')+
    ' &middot; <strong>'+(PLBL[n.pais]||n.pais)+'</strong></div>'+
    '<div class="ts">Contratos: '+n.contratos.toLocaleString()+'</div>'+
    '<div class="ts">Monto: '+fmtM(n.monto,n.pais)+'</div>'+
    '<div class="ts">Conexiones: '+n.degree+'</div>'+
    (n.monopolio?'<div class="tm">&#9888; Monopolio '+n.monopolio_pct+'%</div>':'');
  tt.style.display='block';moveTT(e);
}
function hideTT(){tt.style.display='none';}
function moveTT(e){var x=e.clientX+12,y=e.clientY-8;if(x+215>W)x=e.clientX-219;if(y+130>H)y=e.clientY-138;tt.style.left=x+'px';tt.style.top=y+'px';}
cv.addEventListener('mousemove',function(e){if(tt.style.display==='block')moveTT(e);});

function openPanel(n){
  var gov=n.type==='entidad';
  var rgb=nRgb(n);
  var cl=adjOk&&adj.has(n.id)?adj.get(n.id):{lk:[],nb:new Set()};
  var cns=[...cl.nb].map(function(id){return nodes.find(function(x){return x.id===id;});}).filter(Boolean);
  cns.sort(function(a,b){
    function lm(cn){var lk=cl.lk.find(function(l){var s=l.source&&l.source.id!=null?l.source.id:l.source,t=l.target&&l.target.id!=null?l.target.id:l.target;return(s===n.id&&t===cn.id)||(t===n.id&&s===cn.id);});return lk?lk.monto:0;}
    return lm(b)-lm(a);
  });
  var h=
    '<div style="margin-bottom:8px">'+
    '<div class="pb" style="background:rgba('+rgb+',.1);border:1px solid rgba('+rgb+',.35);color:rgba('+rgb+',1)">'+
    (gov?'&#127963; Entidad p&#250;blica':'&#127970; Empresa privada')+'</div>'+
    '<span class="pc-badge" style="background:rgba(255,255,255,.06)">'+
    (PLBL[n.pais]||n.pais)+'</span></div>'+
    '<div class="pn">'+n.name+'</div>'+
    (function(){
      var su=sourceUrl(n.name,n.pais);
      if(su) return '<a class="pnl-radar" href="'+su+'" target="_blank" rel="noopener">&#128279; Verificar en '+(PLBL[n.pais]||n.pais)+'</a>';
      if(n.pais==='GT') return '<div class="pnl-nourl">&#128274; Guatecompras bloquea acceso externo</div>';
      if(n.pais==='CL') return '<div class="pnl-nourl">&#128193; Datos históricos MOP 2010-2015 (sin URL directa)</div>';
      return '';
    })()+
    '<div class="pg">'+
    '<div class="ps"><div class="ps-v">'+n.contratos.toLocaleString()+'</div><div class="ps-l">Contratos</div></div>'+
    '<div class="ps"><div class="ps-v">'+n.degree+'</div><div class="ps-l">Conexiones</div></div>'+
    '<div class="ps" style="grid-column:1/-1"><div class="ps-v" style="font-size:12px;color:rgba('+rgb+',1)">'+fmtM(n.monto,n.pais)+'</div><div class="ps-l">Monto total</div></div>'+
    '</div>';
  if(n.monopolio){
    var p=n.monopolio_pct||0;
    h+=gov?
      '<div class="pa"><div class="pa-t">&#9888; Se&ntilde;al de concentraci&oacute;n</div>'+
      '<div style="font-size:11px;color:#fca5a5;margin-bottom:4px"><strong>'+(n.empresa_dominante||'&#8212;')+'</strong> gana '+p+'%</div>'+
      '<div class="pb2"><div class="pb3" style="width:'+p+'%"></div></div>'+
      (n.mono_c&&n.mono_total?'<div style="font-size:10px;color:#f87171">'+n.mono_c+' de '+n.mono_total+' contratos</div>':'')+
      '</div>':
      '<div class="pa"><div class="pa-t">&#9888; Empresa dominante</div>'+
      '<div style="font-size:11px;color:#fca5a5">Concentra '+p+'% en <strong>'+(n.mono_entidad||'&#8212;')+'</strong></div></div>';
  }
  if(cns.length){
    h+='<div class="pst">'+(gov?'Empresas contratistas':'Entidades contratantes')+' (top '+Math.min(cns.length,8)+')</div>';
    cns.slice(0,8).forEach(function(cn){
      var lk=cl.lk.find(function(l){var s=l.source&&l.source.id!=null?l.source.id:l.source,t=l.target&&l.target.id!=null?l.target.id:l.target;return(s===n.id&&t===cn.id)||(t===n.id&&s===cn.id);});
      var contractUrl=lk&&lk.sample_url?lk.sample_url:'';
      var searchUrl=sourceUrl(cn.name,cn.pais);
      // Para CO: el link directo puede devolver [] — usar siempre búsqueda por nombre
      var finalUrl=cn.pais==='CO'?searchUrl:(contractUrl||searchUrl);
      h+='<div class="pci"><div class="pcd" style="background:'+nHex(cn)+'"></div>'+
        '<div class="pcn" title="'+cn.name+'">'+
        (finalUrl?'<a href="'+finalUrl+'" target="_blank" rel="noopener">'+cn.name+'</a>':cn.name)+
        '</div>'+
        (finalUrl?'<a href="'+finalUrl+'" target="_blank" rel="noopener" class="pci-ext" title="'+(contractUrl?'Ver contrato':'Buscar en portal')+'">&#8599;</a>':'')+
        '<div class="pcv">'+fmtM(lk?lk.monto:0,cn.pais)+'</div></div>';
    });
  }
  document.getElementById('pnl-body').innerHTML=h;
  document.getElementById('pnl').classList.add('open');
}
function closePanel(){document.getElementById('pnl').classList.remove('open');}
document.getElementById('pnl-x').onclick=function(){closePanel();sN=null;};

function applyFilter(){
  var q=document.getElementById('srch').value.toLowerCase().trim();
  var mono2=document.getElementById('btn-mono').classList.contains('on');
  if(!q&&!mono2){dimSet=null;return;}
  dimSet=new Set();
  nodes.forEach(function(n){
    if((!q||n.name.toLowerCase().indexOf(q)>=0)&&(!mono2||n.monopolio))
      dimSet.add(n.id);
  });
}
document.getElementById('srch').addEventListener('input',applyFilter);
document.getElementById('btn-mono').addEventListener('click',function(){this.classList.toggle('on');applyFilter();});

// Filtros por país
document.querySelectorAll('.pbtn').forEach(function(btn){
  btn.addEventListener('click',function(){
    var p=this.dataset.pais;
    if(filterPais===p){filterPais=null;this.classList.remove('on');}
    else{
      filterPais=p;
      document.querySelectorAll('.pbtn').forEach(function(b){b.classList.remove('on');});
      this.classList.add('on');
    }
  });
});

document.getElementById('btn-reset').addEventListener('click',function(){
  document.getElementById('srch').value='';
  document.getElementById('btn-mono').classList.remove('on');
  document.querySelectorAll('.pbtn').forEach(function(b){b.classList.remove('on');});
  dimSet=null;filterPais=null;
  d3.select(cv).transition().duration(500).call(zoom.transform,d3.zoomIdentity.translate(W/2,H/2));
});
})();
`;

// ── Stats para legend ────────────────────────────────────────────────────────
const countByPais = {};
slimNodes.forEach(n => { countByPais[n.pais] = (countByPais[n.pais]||0)+1; });

const html =
`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Red de Contratos — LATAM</title>
<style>${css}</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="logo">
  <div id="logo-ic">⧁</div>
  <div><h1>Red de Contratos LATAM</h1><p>${Object.keys(countByPais).join(' · ')} · ${slimNodes.length} nodos</p></div>
</div>
<div id="ctrl">
  <div id="sw">
    <svg class="sic" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input id="srch" type="text" placeholder="Buscar empresa o entidad...">
  </div>
  <div class="pais-btns">
    <button class="pbtn" data-pais="CO">🇨🇴 CO (${countByPais.CO||0})</button>
    <button class="pbtn" data-pais="GT">🇬🇹 GT (${countByPais.GT||0})</button>
    <button class="pbtn" data-pais="CL">🇨🇱 CL (${countByPais.CL||0})</button>
    <button class="pbtn" data-pais="SV">🇸🇻 SV (${countByPais.SV||0})</button>
  </div>
  <button class="btn" id="btn-mono">⚠ Monopolios Colombia (${mc})</button>
  <button class="btn" id="btn-reset">↺ Restablecer</button>
</div>
<div id="stats">
  <div><div class="sv">${slimNodes.filter(n=>n.type==='empresa').length}</div><div class="sl">Empresas</div></div>
  <div><div class="sv">${slimNodes.filter(n=>n.type==='entidad').length}</div><div class="sl">Entidades</div></div>
  <div><div class="sv">${lc}</div><div class="sl">Links</div></div>
  <div><div class="sv">${mc}</div><div class="sl">Monopolios</div></div>
</div>
<div id="leg">
  <div class="lt">Por país (entidad / empresa)</div>
  <div class="leg-grid">
    <div class="li"><div class="ld" style="background:#60a5fa"></div>CO Entidad</div>
    <div class="li"><div class="ld" style="background:#fb923c"></div>CO Empresa</div>
    <div class="li"><div class="ld" style="background:#34d399"></div>GT Entidad</div>
    <div class="li"><div class="ld" style="background:#a78bfa"></div>GT Empresa</div>
    <div class="li"><div class="ld" style="background:#fbbf24"></div>CL Entidad</div>
    <div class="li"><div class="ld" style="background:#f87171"></div>CL Empresa</div>
    <div class="li"><div class="ld" style="background:#22d3ee"></div>SV Entidad</div>
    <div class="li"><div class="ld" style="background:#f472b6"></div>SV Empresa</div>
    <div class="li"><div class="lm"></div>Monopolio CO</div>
  </div>
</div>
<div id="tt"></div>
<div id="pnl"><div id="pnl-in"><button id="pnl-x">×</button><div id="pnl-body"></div></div></div>
<script>const GD=${data};</script>
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script>${js}</script>
</body>
</html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log('OK ->', OUT);
console.log('Tamaño:', Math.round(html.length/1024), 'KB');
