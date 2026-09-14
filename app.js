(function(){
'use strict';
const WORLD=window.WORLD_DATA||{states:[],burgs:[],year:983,era:'Mikiv Era'};
const MAP_W=3840, MAP_H=2049;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const tg=window.Telegram&&window.Telegram.WebApp;
try{
  if(tg){
    tg.ready(); tg.expand();
    const p=tg.themeParams||{};
    document.documentElement.style.setProperty('--bg',p.bg_color||'#111318');
    document.documentElement.style.setProperty('--text',p.text_color||'#f7f7f7');
    document.documentElement.style.setProperty('--hint',p.hint_color||'#9aa0aa');
    document.documentElement.style.setProperty('--button',p.button_color||'#5b8cff');
  }
}catch(_e){}

$('#yearPill').textContent=(WORLD.year||983)+' ME';
const stateSelect=$('#stateSelect');
if(stateSelect){
  WORLD.states.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.fullName||s.name;stateSelect.appendChild(o)});
  stateSelect.value='';
  stateSelect.addEventListener('change',()=>{
    const s=WORLD.states.find(x=>Number(x.id)===Number(stateSelect.value));
    if(!s){showHint(); return;}
    showState(s);
    focusState(s.id);
  });
}

const appRoot=$('#appRoot');
function openTab(tab){
  const allowed=new Set(['map','calendar','character']);
  if(!allowed.has(tab))tab='map';
  document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
  appRoot.classList.toggle('calendar-open',tab==='calendar');
  appRoot.classList.toggle('character-open',tab==='character');
  setTimeout(()=>{if(tab!=='character'){renderTransform();clampPos();renderTransform()}},230);
}
document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>openTab(btn.dataset.tab)));

function requestedStartTab(){
  let tab='';
  try{
    tab=(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.start_param)||'';
    if(!tab){
      const params=new URLSearchParams(window.location.search);
      tab=params.get('tgWebAppStartParam')||params.get('startapp')||params.get('tab')||'';
    }
  }catch(_e){}
  return ['map','calendar','character'].includes(tab)?tab:'map';
}

const stage=$('#mapStage'), canvas=$('#mapCanvas'), img=$('#mapImage'), cityLayer=$('#cityLayer'), zoomBadge=$('#zoomBadge');
let zoom=1,pos={x:0,y:0},drag=null,suppressClick=false;
const activePointers=new Map();
let pinch=null;

function renderTransform(){
  // IMPORTANT: resize the SVG itself instead of CSS scaling a cached bitmap.
  // This makes Chromium/Telegram re-rasterize the vector at the current zoom level.
  const baseW=Math.max(1,stage.clientWidth);
  canvas.style.width=Math.round(baseW*zoom)+'px';
  canvas.style.transform=`translate(-50%,-50%) translate3d(${pos.x}px,${pos.y}px,0)`;
  zoomBadge.textContent=Math.round(zoom*100)+'%';
  stage.classList.toggle('zoomed',zoom>1.15);
}
function clampPos(){
  const sw=stage.clientWidth, sh=stage.clientHeight;
  const w=Math.max(sw,stage.clientWidth*zoom), h=w*MAP_H/MAP_W;
  const maxX=Math.max(0,(w-sw)/2)+sw*.08;
  const maxY=Math.max(0,(h-sh)/2)+sh*.08;
  pos.x=Math.max(-maxX,Math.min(maxX,pos.x));
  pos.y=Math.max(-maxY,Math.min(maxY,pos.y));
}
function setZoom(v,anchor){
  const old=zoom;
  // Allow close inspection of cities and local roads. SVG stays vector at every level.
  zoom=Math.min(12,Math.max(1,Math.round(v*100)/100));
  if(anchor&&old!==zoom){
    const r=stage.getBoundingClientRect();
    const ax=anchor.x-(r.left+r.width/2), ay=anchor.y-(r.top+r.height/2);
    const ratio=zoom/old;
    pos.x=ax-(ax-pos.x)*ratio;
    pos.y=ay-(ay-pos.y)*ratio;
  }
  renderTransform(); clampPos(); renderTransform();
}
$('#zoomIn').onclick=e=>{e.stopPropagation();setZoom(zoom*1.35)};
$('#zoomOut').onclick=e=>{e.stopPropagation();setZoom(zoom/1.35)};
$('#resetMap').onclick=e=>{e.stopPropagation();zoom=1;pos={x:0,y:0};if(stateSelect)stateSelect.value='';renderTransform()};

function pointerCenter(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
function pointerDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
let pinchFrame=0;
function beginPinch(){
  if(activePointers.size<2)return;
  const [a,b]=Array.from(activePointers.values()).slice(0,2);
  const center=pointerCenter(a,b);
  pinch={
    distance:Math.max(1,pointerDistance(a,b)),
    zoom,
    posX:pos.x,
    posY:pos.y,
    center,
    previewZoom:zoom,
    previewPos:{x:pos.x,y:pos.y}
  };
  drag=null;
  suppressClick=true;
  stage.classList.add('dragging','pinching');
}
function drawPinchPreview(){
  pinchFrame=0;
  if(!pinch)return;
  const ratio=pinch.previewZoom/pinch.zoom;
  // During the live two-finger gesture we ONLY use a GPU transform.
  // Resizing the large SVG on every touchmove forces Telegram/iOS to
  // re-rasterize it and is the main source of stutter. The real vector
  // size is committed once when the gesture ends.
  canvas.style.width=Math.round(Math.max(1,stage.clientWidth)*pinch.zoom)+'px';
  canvas.style.transform=`translate(-50%,-50%) translate3d(${pinch.previewPos.x}px,${pinch.previewPos.y}px,0) scale(${ratio})`;
  zoomBadge.textContent=Math.round(pinch.previewZoom*100)+'%';
  stage.classList.toggle('zoomed',pinch.previewZoom>1.15);
}
function updatePinch(){
  if(!pinch||activePointers.size<2)return;
  const [a,b]=Array.from(activePointers.values()).slice(0,2);
  const center=pointerCenter(a,b);
  const distance=Math.max(1,pointerDistance(a,b));
  const nextZoom=Math.min(12,Math.max(1,pinch.zoom*(distance/pinch.distance)));
  const r=stage.getBoundingClientRect();
  const startAx=pinch.center.x-(r.left+r.width/2), startAy=pinch.center.y-(r.top+r.height/2);
  const nowAx=center.x-(r.left+r.width/2), nowAy=center.y-(r.top+r.height/2);
  const ratio=nextZoom/pinch.zoom;
  const nextPos={
    x:nowAx-(startAx-pinch.posX)*ratio,
    y:nowAy-(startAy-pinch.posY)*ratio
  };
  pinch.previewZoom=nextZoom;
  pinch.previewPos=nextPos;
  if(!pinchFrame) pinchFrame=requestAnimationFrame(drawPinchPreview);
}

stage.addEventListener('pointerdown',e=>{
  // Controls must receive their own taps; do not let the map capture them.
  if(e.target.closest('.map-controls')) return;
  if(e.pointerType==='touch') e.preventDefault();
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{stage.setPointerCapture(e.pointerId)}catch(_e){}

  if(activePointers.size>=2){beginPinch();return;}
  if(e.target.closest('.city-hit')) return;

  suppressClick=false;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:pos.x,oy:pos.y,moved:false};
  stage.classList.add('dragging');
},{passive:false});
stage.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch') e.preventDefault();
  if(activePointers.has(e.pointerId)) activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(activePointers.size>=2){
    if(!pinch) beginPinch();
    updatePinch();
    return;
  }
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>7)drag.moved=true;
  pos={x:drag.ox+dx,y:drag.oy+dy}; clampPos(); renderTransform();
},{passive:false});
function endPointer(e){
  activePointers.delete(e.pointerId);
  if(pinch){
    if(pinchFrame){cancelAnimationFrame(pinchFrame);pinchFrame=0;}
    suppressClick=true;
    zoom=pinch.previewZoom;
    pos=pinch.previewPos;
    pinch=null;
    stage.classList.remove('pinching');
    clampPos();
    renderTransform(); // one SVG re-rasterization after the gesture, not every frame
    if(activePointers.size===1){
      const [id,p]=Array.from(activePointers.entries())[0];
      drag={id,x:p.x,y:p.y,ox:pos.x,oy:pos.y,moved:true};
    }else{
      drag=null;
      stage.classList.remove('dragging');
    }
    return;
  }
  if(drag&&drag.id===e.pointerId){
    suppressClick=!!drag.moved;
    drag=null;
    stage.classList.remove('dragging');
  }
}
stage.addEventListener('pointerup',endPointer);
stage.addEventListener('pointercancel',endPointer);
stage.addEventListener('lostpointercapture',e=>{if(activePointers.has(e.pointerId))endPointer(e)});
stage.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*(e.deltaY<0?1.16:1/1.16),{x:e.clientX,y:e.clientY})},{passive:false});

// Keep +/- reliable inside Telegram/iOS WebViews. pointerdown is stopped so
// the stage never steals pointer capture from these controls.
$('#zoomIn').addEventListener('pointerdown',e=>e.stopPropagation());
$('#zoomOut').addEventListener('pointerdown',e=>e.stopPropagation());
$('#resetMap').addEventListener('pointerdown',e=>e.stopPropagation());

function focusState(stateId){
  const burgs=WORLD.burgs.filter(b=>Number(b.stateId)===Number(stateId) && Number.isFinite(Number(b.x)) && Number.isFinite(Number(b.y)));
  if(!burgs.length)return;

  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const b of burgs){
    const x=Number(b.x), y=Number(b.y);
    if(x<minX)minX=x; if(x>maxX)maxX=x;
    if(y<minY)minY=y; if(y>maxY)maxY=y;
  }

  // Padding also makes one-city microstates (e.g. Honer) easy to see.
  const spanX=Math.max(180,maxX-minX);
  const spanY=Math.max(140,maxY-minY);
  minX-=spanX*.22; maxX+=spanX*.22;
  minY-=spanY*.22; maxY+=spanY*.22;

  const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
  const normW=Math.max((maxX-minX)/MAP_W,.015);
  const normH=Math.max((maxY-minY)/MAP_H,.015);
  const stageAspect=Math.max(.1,stage.clientWidth/stage.clientHeight);
  const mapAspect=MAP_W/MAP_H;

  // At zoom=1 map width equals stage width. Fit the selected state's burg envelope.
  let targetZoom=Math.min(10, Math.max(1.35, Math.min(.82/normW, (.82*mapAspect/stageAspect)/normH)));
  zoom=Math.round(targetZoom*100)/100;

  const canvasW=stage.clientWidth*zoom;
  const canvasH=canvasW*MAP_H/MAP_W;
  pos.x=-(cx/MAP_W-.5)*canvasW;
  pos.y=-(cy/MAP_H-.5)*canvasH;
  clampPos();
  renderTransform();
}

function buildCityHits(){
  const frag=document.createDocumentFragment();
  for(const b of WORLD.burgs){
    const x=Number(b.x),y=Number(b.y); if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    const btn=document.createElement('button');
    btn.type='button'; btn.className='city-hit'; btn.style.left=(x/MAP_W*100)+'%'; btn.style.top=(y/MAP_H*100)+'%';
    btn.dataset.id=b.id; btn.title=b.name; btn.setAttribute('aria-label','Город '+b.name);
    btn.addEventListener('pointerdown',e=>e.stopPropagation());
    btn.addEventListener('click',e=>{e.stopPropagation();showBurg(b);highlightCity(btn)});
    frag.appendChild(btn);
  }
  cityLayer.replaceChildren(frag);
}
function highlightCity(btn){
  cityLayer.querySelector('.selected-city')?.classList.remove('selected-city');
  btn.classList.add('selected-city');
}
buildCityHits();

img.addEventListener('error',()=>{$('#status').textContent='Не удалось загрузить SVG-карту';$('#status').classList.add('error')});
img.addEventListener('load',()=>{$('#status').textContent='Карта загружена: 917 поселений · 746 маршрутов';setTimeout(()=>$('#status').textContent='',1200)});
window.addEventListener('resize',()=>{renderTransform();clampPos();renderTransform()});
renderTransform();
openTab(requestedStartTab());

function fact(label,value,wide){return `<div class="fact${wide?' wide':''}"><span>${esc(label)}</span><strong>${esc(value||'—')}</strong></div>`}
function card(title,kind,facts){
  $('#details').innerHTML=`<article class="object-card"><div class="object-card-head"><div><div class="object-kind">${esc(kind)}</div><h2>${esc(title)}</h2></div><button class="close-card" id="closeCard">×</button></div><div class="facts">${facts.join('')}</div><div class="lore-placeholder"><span>История и описание</span><p>Здесь позже можно хранить авторский лор, персонажей и события календаря.</p></div></article>`;
  $('#closeCard').onclick=showHint;
}
function showHint(){$('#details').innerHTML=''}
function showBurg(d){
  const types={Naval:'Морской',Generic:'Обычный',River:'Речной',Lake:'Озёрный',Hunting:'Охотничий',Highland:'Горный'};
  card(d.name,'ПОСЕЛЕНИЕ',[fact('Государство',d.state),fact('Население',d.population?'≈ '+Number(d.population).toLocaleString('ru-RU'):'—'),fact('Культура',d.culture),fact('Тип',types[d.type]||d.type),fact('Статус',[d.capital&&'Столица',d.port&&'Порт'].filter(Boolean).join(' · ')||'Обычное поселение')]);
}
function showState(d){card(d.fullName||d.name,'ГОСУДАРСТВО',[fact('Форма правления',d.form),fact('Столица',d.capital),fact('Культура',d.culture),fact('Площадь',d.area?'≈ '+Math.round(Number(d.area)).toLocaleString('ru-RU')+' км²':'—'),fact('Соседи',d.neighbors&&d.neighbors.length?d.neighbors.join(', '):'Нет',true)])}
showHint();

const CAL=window.CALENDAR_DATA||{year_len:394,months:['Ikhael','Ireul','Jeha','Amel'],month_len:{Ikhael:98,Ireul:99,Jeha:100,Amel:97},weekdays:['Hielat','Aniel','Kasdard','Rielach','Kielaph','Arah','Seriel'],moons:['Amiel','Kasdiel','Zariel'],lunar_cyc:{Amiel:15,Kasdiel:23,Zariel:50},lunar_shf:{Amiel:0,Kasdiel:0,Zariel:0},year:809,first_day:0,notes:{}};
let calYear=Number(CAL.year)||809;
let calMonth=0;
let selectedFantasy={year:calYear,month:0,day:1};

function monthLength(mi){const name=CAL.months[mi];return Number(CAL.month_len[name])||0}
function daysBeforeYear(y){return (y-(Number(CAL.year)||809))*(Number(CAL.year_len)||394)}
function daysBeforeMonth(mi){let n=0;for(let i=0;i<mi;i++)n+=monthLength(i);return n}
function absoluteDay(y,mi,d){return daysBeforeYear(y)+daysBeforeMonth(mi)+(d-1)}
function weekdayIndex(y,mi,d){const w=CAL.weekdays.length||7;return ((Number(CAL.first_day)||0)+absoluteDay(y,mi,d)%w+w)%w}
function noteKey(y,mi,d){return `${y}-${mi+1}-${d}`}
function moonPhase(name,y,mi,d){
  const cycle=Math.max(1,Number(CAL.lunar_cyc[name])||1);
  const shift=Number(CAL.lunar_shf?.[name])||0;
  const phase=((absoluteDay(y,mi,d)+shift)%cycle+cycle)%cycle/cycle;
  if(phase<.0625||phase>=.9375)return '🌑';
  if(phase<.1875)return '🌒';
  if(phase<.3125)return '🌓';
  if(phase<.4375)return '🌔';
  if(phase<.5625)return '🌕';
  if(phase<.6875)return '🌖';
  if(phase<.8125)return '🌗';
  return '🌘';
}
function renderCalendar(){
  const monthName=CAL.months[calMonth];
  $('#calendarYearTitle').textContent=calYear+' ME';
  $('#yearLengthLabel').textContent=(CAL.year_len||394)+' дней';
  $('#monthTitle').textContent=monthName+' · '+monthLength(calMonth)+' дней';

  const weekdays=$('#weekdays');weekdays.innerHTML='';
  for(const w of CAL.weekdays){const el=document.createElement('span');el.textContent=w;weekdays.appendChild(el)}

  const box=$('#days');box.innerHTML='';
  const offset=weekdayIndex(calYear,calMonth,1);
  for(let i=0;i<offset;i++)box.appendChild(document.createElement('span'));
  const len=monthLength(calMonth);
  for(let d=1;d<=len;d++){
    const b=document.createElement('button');b.type='button';b.textContent=d;
    const key=noteKey(calYear,calMonth,d);
    if(CAL.notes&&CAL.notes[key]){b.classList.add('has-note');b.title=CAL.notes[key]}
    if(selectedFantasy.year===calYear&&selectedFantasy.month===calMonth&&selectedFantasy.day===d)b.classList.add('selected');
    b.onclick=()=>{selectedFantasy={year:calYear,month:calMonth,day:d};renderCalendar()};
    box.appendChild(b);
  }
  const sel=selectedFantasy;
  $('#selectedDate').textContent=`${sel.day} ${CAL.months[sel.month]} ${sel.year} ME · ${CAL.weekdays[weekdayIndex(sel.year,sel.month,sel.day)]}`;
  const phases=$('#moonPhases');phases.innerHTML='';
  for(const moon of CAL.moons){const pill=document.createElement('div');pill.className='moon-pill';pill.innerHTML=`<span>${moonPhase(moon,sel.year,sel.month,sel.day)}</span><strong>${esc(moon)}</strong><small>${CAL.lunar_cyc[moon]} дн.</small>`;phases.appendChild(pill)}
  const note=CAL.notes?.[noteKey(sel.year,sel.month,sel.day)];
  const noteBox=$('#dayNote');
  if(note){noteBox.hidden=false;noteBox.innerHTML=`<span>Событие</span><strong>${esc(note)}</strong>`}else{noteBox.hidden=true;noteBox.innerHTML=''}
  const list=$('#eventsList');
  if(list){
    const rows=Object.entries(CAL.notes||{}).map(([key,text])=>{
      const m=key.match(/^(\d+)-(\d+)-(\d+)$/);
      if(!m)return null;
      return {y:+m[1],mi:+m[2]-1,d:+m[3],text};
    }).filter(Boolean).filter(x=>x.y===calYear).sort((a,b)=>a.mi-b.mi||a.d-b.d);
    list.innerHTML=rows.length?rows.map(x=>`<div class="event-row"><time>${x.d} ${esc(CAL.months[x.mi]||'')}</time><span>${esc(x.text)}</span></div>`).join(''):'<div class="event-row"><span>—</span><span>Нет записанных событий</span></div>';
  }
}
$('#prevMonth').onclick=()=>{calMonth--;if(calMonth<0){calMonth=CAL.months.length-1;calYear--}renderCalendar()};
$('#nextMonth').onclick=()=>{calMonth++;if(calMonth>=CAL.months.length){calMonth=0;calYear++}renderCalendar()};
renderCalendar();
})();
