(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const CATALOG=Array.isArray(window.SWADE_EQUIPMENT)?window.SWADE_EQUIPMENT:[];
const CATALOG_BY_ID=new Map(CATALOG.map(item=>[String(item.id),item]));
const EDGE_LIBRARY=Array.isArray(window.SWADE_EDGES)?window.SWADE_EDGES:[];
const HINDRANCE_LIBRARY=Array.isArray(window.SWADE_HINDRANCES)?window.SWADE_HINDRANCES:[];
const EDGE_BY_ID=new Map(EDGE_LIBRARY.map(item=>[String(item.id),item]));
const HINDRANCE_BY_ID=new Map(HINDRANCE_LIBRARY.map(item=>[String(item.id),item]));
const POWER_LIBRARY=Array.isArray(window.SWADE_POWERS)?window.SWADE_POWERS:[];
const POWER_BY_ID=new Map(POWER_LIBRARY.map(item=>[String(item.id),item]));
const MAGIC_CHARACTERS=new Set(['miko','rene']);
const RANK_ORDER=['Новичок','Закалённый','Ветеран','Герой','Легенда'];
const chip=$('#userChip');
const chipAvatar=$('#userChipAvatar');
const chipName=$('#userChipName');
const chipSub=$('#userChipSub');
const content=$('#characterContent');
const characterTabButton=document.querySelector('[data-tab="character"]');
const DICE=['—','d4','d6','d8','d10','d12','d12+1','d12+2','d12+3'];
const ATTRS=[
  ['agility','Ловкость'],['smarts','Смекалка'],['spirit','Характер'],['strength','Сила'],['vigor','Выносливость']
];
const SKILL_LIBRARY=[
  ['Азартные игры','Смекалка'],['Академические знания','Смекалка'],['Атлетика','Ловкость'],['Безумная наука','Смекалка'],['Вера','Характер'],['Верховая езда','Ловкость'],['Внимание','Смекалка'],['Военное дело','Смекалка'],['Вождение','Ловкость'],['Воровство','Ловкость'],['Выживание','Смекалка'],['Выступление','Характер'],['Драка','Ловкость'],['Запугивание','Характер'],['Колдовство','Смекалка'],['Лечение','Смекалка'],['Насмешка','Смекалка'],['Наука','Смекалка'],['Оккультизм','Смекалка'],['Осведомлённость','Смекалка'],['Пилотирование','Ловкость'],['Язык','Смекалка'],['Поиск информации','Смекалка'],['Псионика','Смекалка'],['Ремонт','Смекалка'],['Скрытность','Ловкость'],['Стрельба','Ловкость'],['Судовождение','Ловкость'],['Талант','Характер'],['Убеждение','Характер'],['Хакерство','Смекалка'],['Электроника','Смекалка']
];
const SKILL_ATTR=new Map(SKILL_LIBRARY);
const BASIC_SKILLS=['Атлетика','Внимание','Осведомлённость','Скрытность','Убеждение'];
const WEAPON_CATEGORIES=new Set(['Оружие ближнего боя','Стрелковое оружие','Огнестрельное оружие','Пулемёт','Футуристическое оружие','Особое оружие']);
const BODY_ARMOR_PARTS=[
  ['head','Голова'],
  ['torso','Торс'],
  ['arms','Руки'],
  ['legs','Ноги']
];
const BODY_ARMOR_LAYOUTS={
  default:{
    head:{anchor:[50,12],elbow:[33,12],label:[17,13],side:'left'},
    torso:{anchor:[50,34],elbow:[68,34],label:[82,32],side:'right'},
    arms:{anchor:[35,51],elbow:[23,51],label:[15,52],side:'left'},
    legs:{anchor:[52,86],elbow:[70,86],label:[86,89],side:'right'}
  },
  miko:{
    head:{anchor:[50,11],elbow:[34,11],label:[18,12],side:'left'},
    torso:{anchor:[50,33],elbow:[68,33],label:[82,31],side:'right'},
    arms:{anchor:[35,52],elbow:[23,52],label:[15,53],side:'left'},
    legs:{anchor:[52,87],elbow:[70,87],label:[86,90],side:'right'}
  },
  mortimer:{
    head:{anchor:[50,12],elbow:[34,12],label:[18,13],side:'left'},
    torso:{anchor:[50,34],elbow:[68,34],label:[82,32],side:'right'},
    arms:{anchor:[35,52],elbow:[23,52],label:[15,53],side:'left'},
    legs:{anchor:[52,87],elbow:[70,87],label:[86,90],side:'right'}
  },
  velizariy:{
    head:{anchor:[50,12],elbow:[66,12],label:[82,14],side:'right'},
    torso:{anchor:[50,34],elbow:[32,34],label:[18,35],side:'left'},
    arms:{anchor:[35,52],elbow:[23,52],label:[15,53],side:'left'},
    legs:{anchor:[52,87],elbow:[70,87],label:[86,90],side:'right'}
  },
  rene:{
    head:{anchor:[50,12],elbow:[34,12],label:[18,13],side:'left'},
    torso:{anchor:[50,34],elbow:[68,34],label:[82,32],side:'right'},
    arms:{anchor:[35,52],elbow:[23,52],label:[15,53],side:'left'},
    legs:{anchor:[52,87],elbow:[70,87],label:[86,90],side:'right'}
  },
  ssark_tal:{
    head:{anchor:[50,11],elbow:[67,11],label:[83,13],side:'right'},
    torso:{anchor:[50,35],elbow:[31,35],label:[18,37],side:'left'},
    arms:{anchor:[35,50],elbow:[23,50],label:[15,51],side:'left'},
    legs:{anchor:[54,86],elbow:[71,86],label:[87,89],side:'right'}
  }
};
function isWeaponItem(item){return WEAPON_CATEGORIES.has(String(item?.category||''));}
function isEquipableItem(item){const c=String(item?.category||'');return c==='Броня'||c==='Щит'||isWeaponItem(item);}
let currentView=null;
const uiState={catalogOpen:false,catalogSearch:'',catalogCategory:'',expandedItemId:null,skillsFoldOpen:false,traitsFoldOpen:false,magicFoldOpen:false,powerCatalogOpen:false,powerSearch:'',powerRankFilter:'available',expandedPowerId:null,transferItemId:null,notesDirty:false,notesFoldOpen:false,armorMapOpen:false,selectedArmorPart:null};

function initials(user){
  const a=(user?.first_name||'').trim().charAt(0);
  const b=(user?.last_name||'').trim().charAt(0);
  return (a+b||'?').toUpperCase();
}
function telegramDisplayName(user){
  return [user?.first_name,user?.last_name].filter(Boolean).join(' ').trim() || (user?.username?('@'+user.username):'Гость');
}
function setAvatar(el,url,user){
  if(!el)return;
  el.innerHTML='';
  if(url){
    const img=document.createElement('img');
    img.src=url; img.alt=''; img.referrerPolicy='no-referrer';
    img.onerror=()=>{el.textContent=initials(user)};
    el.appendChild(img);
  }else el.textContent=initials(user);
}
let characterArtModal=null;
let characterArtReturnFocus=null;
function ensureCharacterArtModal(){
  if(characterArtModal&&document.body.contains(characterArtModal))return characterArtModal;
  const modal=document.createElement('div');
  modal.className='character-art-modal';
  modal.hidden=true;
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-hidden','true');
  modal.setAttribute('aria-labelledby','characterArtTitle');
  modal.innerHTML=`<div class="character-art-dialog">
    <button type="button" class="character-art-close" data-character-art-close aria-label="Закрыть изображение персонажа">×</button>
    <div class="character-art-stage"><img id="characterArtImage" alt=""></div>
    <div class="character-art-caption"><strong id="characterArtTitle"></strong><small>Полное изображение персонажа</small></div>
  </div>`;
  modal.addEventListener('click',event=>{
    if(event.target===modal||event.target.closest('[data-character-art-close]'))closeCharacterArt();
  });
  document.body.appendChild(modal);
  characterArtModal=modal;
  return modal;
}
function openCharacterArt(character,trigger){
  const url=String(character?.portrait||character?.fullImage||character?.avatar||'').trim();
  if(!url)return;
  const modal=ensureCharacterArtModal(),img=modal.querySelector('#characterArtImage'),title=modal.querySelector('#characterArtTitle');
  characterArtReturnFocus=trigger||document.activeElement;
  if(img){img.src=url;img.alt=`${character?.name||'Персонаж'} — полное изображение`;}
  if(title)title.textContent=character?.name||'Персонаж';
  modal.hidden=false;modal.setAttribute('aria-hidden','false');
  document.documentElement.classList.add('character-art-open');
  requestAnimationFrame(()=>modal.querySelector('[data-character-art-close]')?.focus());
}
function closeCharacterArt(){
  const modal=characterArtModal;if(!modal||modal.hidden)return;
  modal.hidden=true;modal.setAttribute('aria-hidden','true');
  document.documentElement.classList.remove('character-art-open');
  const focusTarget=characterArtReturnFocus;characterArtReturnFocus=null;
  if(focusTarget&&document.contains(focusTarget)&&typeof focusTarget.focus==='function')focusTarget.focus({preventScroll:true});
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&characterArtModal&&!characterArtModal.hidden)closeCharacterArt();});
function renderChip(user,character){
  setAvatar(chipAvatar,character?.avatar||user?.photo_url||'',user);
  chipName.textContent=character?.name||telegramDisplayName(user);
  chipSub.textContent=user?.username?('@'+user.username):(character?'Персонаж':'Telegram');
  chip.classList.toggle('bound',Boolean(character));
  const hasArt=Boolean(character&&(character.portrait||character.fullImage||character.avatar));
  chipAvatar.classList.toggle('top-character-art-trigger',hasArt);
  if(hasArt){chipAvatar.title='Открыть полное изображение персонажа';chipAvatar.setAttribute('aria-label',`Открыть полное изображение персонажа ${character.name||''}`)}
  else{chipAvatar.removeAttribute('title');chipAvatar.removeAttribute('aria-label')}
}
chipAvatar.addEventListener('click',event=>{
  if(!currentView?.character)return;
  if(!(currentView.character.portrait||currentView.character.fullImage||currentView.character.avatar))return;
  event.preventDefault();
  event.stopPropagation();
  openCharacterArt(currentView.character,chipAvatar);
});
function identitySuffix(user,character){
  const id=user?.id!=null?String(user.id):'';
  const username=String(user?.username||'').trim().toLowerCase();
  const name=String(character?.name||'guest').trim().toLowerCase();
  return id||username||name;
}
function storageKey(prefix,user,character){return `norvayne_${prefix}_${identitySuffix(user,character)}`}

/* Telegram CloudStorage: server-side storage per bot + Telegram user.
   We keep localStorage as an offline cache and sync each character to its own cloud keys. */
const TG=window.Telegram&&window.Telegram.WebApp;
const CLOUD_VERSION='v6';
const CLOUD_CHUNK_SIZE=3400;
const CLOUD_WRITERS=new Map();
const SHARED_WRITERS=new Map();
let activeCloudWriters=0;
let cloudBatchHadError=false;
let sharedStorageState='unknown';
let partyMoneyPollTimer=null;
let partyMoneyRefreshInFlight=false;

function cloudAvailable(){
  try{return Boolean(TG?.CloudStorage&&(!TG.isVersionAtLeast||TG.isVersionAtLeast('6.9')))}catch(_e){return false}
}
function characterStorageId(character){
  const raw=String(character?.id||'character').trim().toLowerCase();
  return (raw.replace(/[^a-z0-9_-]+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'').slice(0,40)||'character');
}
function cloudBaseKey(kind,character){return `nv_${CLOUD_VERSION}_${characterStorageId(character)}_${kind}`}
function sharedAvailable(){return Boolean(TG?.initData)}
async function sharedRequest(payload){
  if(!sharedAvailable())return null;
  try{
    const response=await fetch('/api/state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:TG.initData,...payload})});
    const data=await response.json().catch(()=>({}));
    if(response.status===503||data.storageAvailable===false){sharedStorageState='missing';return null}
    if(!response.ok||!data.ok)throw new Error(data.error||'Ошибка общего хранилища');
    sharedStorageState='ok';return data;
  }catch(error){
    if(sharedStorageState!=='missing')sharedStorageState='error';
    console.warn('Norvayne shared storage request failed',error);return null;
  }
}
async function sharedGetEnvelope(kind,character){
  const data=await sharedRequest({action:'get',characterId:characterStorageId(character),kind});
  const envelope=data?.envelope;
  return envelope&&envelope.__norvayneSync===1?envelope:null;
}
function enqueueSharedWrite(kind,character,envelope){
  if(!sharedAvailable())return Promise.resolve(false);
  const key=`${characterStorageId(character)}:${kind}`;
  let state=SHARED_WRITERS.get(key);
  if(!state){state={running:false,pending:null,promise:Promise.resolve(true)};SHARED_WRITERS.set(key,state)}
  state.pending=envelope;
  if(!state.running){
    state.running=true;
    state.promise=(async()=>{
      let ok=true;
      try{
        while(state.pending){
          const next=state.pending;state.pending=null;
          const data=await sharedRequest({action:'set',characterId:characterStorageId(character),kind,envelope:next});
          if(!data)ok=false;
        }
      }finally{state.running=false}
      return ok;
    })();
  }
  return state.promise;
}
function setSyncStatus(text,state=''){
  const el=$('#cloudSyncStatus');if(!el)return;
  el.textContent=text;el.dataset.state=state;
  if(el.tagName==='BUTTON')el.disabled=state==='saving';
}
function cloudGetItem(key){
  return new Promise(resolve=>{
    if(!cloudAvailable())return resolve(null);
    try{TG.CloudStorage.getItem(key,(err,value)=>resolve(err?null:String(value??'')))}catch(_e){resolve(null)}
  });
}
function cloudSetItem(key,value){
  return new Promise((resolve,reject)=>{
    if(!cloudAvailable())return resolve(false);
    try{TG.CloudStorage.setItem(key,String(value??''),(err,stored)=>err?reject(new Error(String(err))):resolve(Boolean(stored)))}catch(error){reject(error)}
  });
}
function cloudRemoveItems(keys){
  return new Promise(resolve=>{
    if(!cloudAvailable()||!keys.length)return resolve(true);
    try{
      if(TG.CloudStorage.removeItems)TG.CloudStorage.removeItems(keys,(err,removed)=>resolve(!err&&removed!==false));
      else Promise.all(keys.map(k=>new Promise(r=>TG.CloudStorage.removeItem(k,()=>r(true))))).then(()=>resolve(true));
    }catch(_e){resolve(false)}
  });
}
function cloudGetItems(keys){
  return new Promise(resolve=>{
    if(!cloudAvailable()||!keys.length)return resolve({});
    try{
      if(TG.CloudStorage.getItems)TG.CloudStorage.getItems(keys,(err,values)=>resolve(err?{}:(values||{})));
      else Promise.all(keys.map(async k=>[k,await cloudGetItem(k)])).then(entries=>resolve(Object.fromEntries(entries)));
    }catch(_e){resolve({})}
  });
}
async function cloudReadLarge(baseKey){
  const metaRaw=await cloudGetItem(`${baseKey}_meta`);if(!metaRaw)return null;
  try{
    const meta=JSON.parse(metaRaw),count=Math.max(0,Math.min(128,Number(meta.count)||0));
    if(!count)return '';
    const keys=Array.from({length:count},(_,i)=>`${baseKey}_${i}`),values=await cloudGetItems(keys);
    if(keys.some(k=>values[k]===undefined||values[k]===null))return null;
    const result=keys.map(k=>String(values[k])).join('');
    return result||null;
  }catch(_e){return null}
}
async function cloudWriteLarge(baseKey,value){
  const text=String(value??''),chunks=[];
  for(let i=0;i<text.length;i+=CLOUD_CHUNK_SIZE)chunks.push(text.slice(i,i+CLOUD_CHUNK_SIZE));
  if(!chunks.length)chunks.push('');
  const oldMetaRaw=await cloudGetItem(`${baseKey}_meta`);let oldCount=0;
  try{oldCount=Number(JSON.parse(oldMetaRaw||'{}').count)||0}catch(_e){}
  for(let i=0;i<chunks.length;i++)await cloudSetItem(`${baseKey}_${i}`,chunks[i]);
  await cloudSetItem(`${baseKey}_meta`,JSON.stringify({count:chunks.length,updatedAt:Date.now(),format:1}));
  if(oldCount>chunks.length)await cloudRemoveItems(Array.from({length:oldCount-chunks.length},(_,j)=>`${baseKey}_${chunks.length+j}`));
  return true;
}
function makeEnvelope(value,updatedAt=Date.now()){
  return {__norvayneSync:1,updatedAt:Number(updatedAt)||Date.now(),data:value};
}
function parseEnvelope(raw){
  if(raw===null||raw===undefined||raw==='')return null;
  try{
    const parsed=JSON.parse(String(raw));
    if(parsed&&parsed.__norvayneSync===1&&Object.prototype.hasOwnProperty.call(parsed,'data')){
      return {updatedAt:Number(parsed.updatedAt)||0,data:parsed.data,envelope:parsed};
    }
    return {updatedAt:0,data:parsed,envelope:makeEnvelope(parsed,0)};
  }catch(_e){return null}
}
function localReadEnvelope(key){
  try{return parseEnvelope(localStorage.getItem(key))}catch(_e){return null}
}
function localWriteEnvelope(key,envelope){
  try{localStorage.setItem(key,JSON.stringify(envelope));return true}catch(_e){return false}
}
function enqueueCloudWrite(kind,character,envelope){
  if(!cloudAvailable())return Promise.resolve(false);
  const key=cloudBaseKey(kind,character),text=JSON.stringify(envelope);
  let state=CLOUD_WRITERS.get(key);
  if(!state){state={running:false,pending:null,promise:Promise.resolve(true)};CLOUD_WRITERS.set(key,state)}
  state.pending=text;
  if(!state.running){
    state.running=true;
    if(activeCloudWriters===0){
      cloudBatchHadError=false;
      try{TG?.enableClosingConfirmation?.()}catch(_e){}
    }
    activeCloudWriters++;
    state.promise=(async()=>{
      setSyncStatus('☁ Сохраняю…','saving');
      let ok=true;
      try{
        while(state.pending!==null){
          const next=state.pending;state.pending=null;
          try{await cloudWriteLarge(key,next)}catch(error){ok=false;cloudBatchHadError=true;console.error('Norvayne CloudStorage write failed',error)}
        }
      }finally{
        state.running=false;
        activeCloudWriters=Math.max(0,activeCloudWriters-1);
        if(activeCloudWriters===0){
          try{TG?.disableClosingConfirmation?.()}catch(_e){}
          setSyncStatus(cloudBatchHadError?'⚠ Только на этом устройстве':'☁ Синхронизировано',cloudBatchHadError?'error':'ok');
        }else setSyncStatus('☁ Сохраняю…','saving');
      }
      return ok;
    })();
  }
  return state.promise;
}
async function readPersistedJson(kind,user,character){
  const localKey=storageKey(kind,user,character),local=localReadEnvelope(localKey);
  const [cloudRaw,serverEnvelope]=await Promise.all([
    cloudAvailable()?cloudReadLarge(cloudBaseKey(kind,character)):Promise.resolve(null),
    sharedGetEnvelope(kind,character)
  ]);
  const cloud=parseEnvelope(cloudRaw);
  const server=serverEnvelope?{updatedAt:Number(serverEnvelope.updatedAt)||0,data:serverEnvelope.data,envelope:serverEnvelope}:null;

  const candidates=[['local',local],['cloud',cloud],['server',server]].filter(([,value])=>Boolean(value));
  if(!candidates.length)return null;
  candidates.sort((a,b)=>(Number(b[1].updatedAt)||0)-(Number(a[1].updatedAt)||0));
  const [source,chosen]=candidates[0];

  let envelope=chosen.envelope;
  if(!envelope||envelope.__norvayneSync!==1||!envelope.updatedAt)envelope=makeEnvelope(chosen.data,Date.now());
  localWriteEnvelope(localKey,envelope);

  if(cloudAvailable()&&(!cloud||envelope.updatedAt>(cloud.updatedAt||0)))enqueueCloudWrite(kind,character,envelope);
  if(!server||envelope.updatedAt>(server.updatedAt||0))enqueueSharedWrite(kind,character,envelope);
  return chosen.data;
}
function writePersistedJson(kind,user,character,value){
  const envelope=makeEnvelope(value),localKey=storageKey(kind,user,character);
  localWriteEnvelope(localKey,envelope);
  enqueueCloudWrite(kind,character,envelope);
  enqueueSharedWrite(kind,character,envelope);
  return envelope;
}
async function forceSyncCurrent(){
  if(!currentView)return false;
  if(!cloudAvailable()&&!sharedAvailable()){setSyncStatus('⚠ Синхронизация недоступна','error');return false}
  const entries=[['sheet',currentView.profile],['inventory',currentView.inventory],['money',currentView.money]];
  setSyncStatus('☁ Синхронизирую…','saving');
  const results=[];
  for(const [kind,value] of entries){
    const envelope=makeEnvelope(value),localKey=storageKey(kind,currentView.user,currentView.character);
    localWriteEnvelope(localKey,envelope);
    const cloudResult=cloudAvailable()?await enqueueCloudWrite(kind,currentView.character,envelope):true;
    const sharedResult=await enqueueSharedWrite(kind,currentView.character,envelope);
    results.push(Boolean(cloudResult||sharedResult));
  }
  const ok=results.every(Boolean);
  setSyncStatus(ok?'☁ Синхронизировано':'⚠ Ошибка синхронизации',ok?'ok':'error');
  return ok;
}

/* Character sheet */
function defaultProfile(){
  const skills={};
  BASIC_SKILLS.forEach(name=>skills[name]='d4');
  return {
    rank:'Новичок',
    ancestry:'',
    attributes:{agility:'d4',smarts:'d4',spirit:'d4',strength:'d4',vigor:'d4'},
    skills,
    skillModifiers:{},
    customSkillAttributes:{},
    paceBase:6,
    naturalArmor:0,
    wounds:0,
    fatigue:0,
    bennies:3,
    shaken:false,
    distracted:false,
    vulnerable:false,
    edges:[],
    hindrances:[],
    powers:[],
    powerPoints:10,
    powerPointsMax:10
  };
}
function normalizeDie(value){
  const v=String(value||'').trim();
  return DICE.includes(v)?v:'d4';
}
function clampInt(value,min,max){
  const n=Math.round(Number(value));
  if(!Number.isFinite(n))return min;
  return Math.min(max,Math.max(min,n));
}
function normalizeEdgeSelections(raw){
  if(Array.isArray(raw))return [...new Set(raw.map(v=>typeof v==='string'?v:v?.id).map(String).filter(id=>EDGE_BY_ID.has(id)))];
  if(typeof raw==='string'){
    const names=raw.split(/\n|,/).map(v=>v.trim().toLowerCase()).filter(Boolean);
    return EDGE_LIBRARY.filter(e=>names.includes(e.name.toLowerCase())).map(e=>String(e.id));
  }
  return [];
}
function normalizeHindranceSelections(raw){
  if(Array.isArray(raw)){
    const seen=new Set(),out=[];
    raw.forEach(v=>{
      const id=String(typeof v==='string'?v:v?.id||'');const def=HINDRANCE_BY_ID.get(id);if(!def||seen.has(id))return;
      const allowed=Array.isArray(def.severity)&&def.severity.length?def.severity:['minor'];
      const requested=typeof v==='object'?String(v.severity||''):'';out.push({id,severity:allowed.includes(requested)?requested:allowed[0]});seen.add(id);
    });
    return out;
  }
  if(typeof raw==='string'){
    const names=raw.split(/\n|,/).map(v=>v.trim().toLowerCase()).filter(Boolean);
    return HINDRANCE_LIBRARY.filter(h=>names.includes(h.name.toLowerCase())).map(h=>({id:String(h.id),severity:(h.severity||['minor'])[0]}));
  }
  return [];
}
function normalizePowerSelections(raw){
  if(!Array.isArray(raw))return [];
  return [...new Set(raw.map(v=>typeof v==='string'?v:v?.id).map(String).filter(id=>POWER_BY_ID.has(id)))];
}
function magicEnabled(character){return Boolean(character?.magic)||MAGIC_CHARACTERS.has(characterStorageId(character));}
function rankIndex(value){
  const raw=String(value||'').trim().toLowerCase();
  const aliases={н:0,'новичок':0,з:1,'закалённый':1,'закаленный':1,в:2,'ветеран':2,г:3,'герой':3,л:4,'легенда':4};
  if(Object.prototype.hasOwnProperty.call(aliases,raw))return aliases[raw];
  const found=RANK_ORDER.findIndex(rank=>raw.includes(rank.toLowerCase()));
  return found<0?0:found;
}
function powerAvailable(power,profile){return rankIndex(power?.rank)<=rankIndex(profile?.rank);}
function powerBaseCost(power){return Number.isFinite(Number(power?.pp))?Math.max(0,Number(power.pp)):null;}
function normalizeProfile(raw){
  const base=defaultProfile();
  const attrs={...base.attributes,...(raw?.attributes||{})};
  Object.keys(attrs).forEach(k=>attrs[k]=normalizeDie(attrs[k]));
  const skills={};
  const incoming=raw?.skills&&typeof raw.skills==='object'?raw.skills:{};
  Object.entries({...base.skills,...incoming}).forEach(([name,die])=>{const clean=String(name||'').trim();if(clean)skills[clean]=normalizeDie(die)});
  const skillModifiers={};
  const incomingModifiers=raw?.skillModifiers&&typeof raw.skillModifiers==='object'?raw.skillModifiers:{};
  Object.entries(incomingModifiers).forEach(([name,value])=>{const clean=String(name||'').trim();if(clean&&Object.prototype.hasOwnProperty.call(skills,clean))skillModifiers[clean]=clampInt(value,-20,20)});
  const customSkillAttributes={};
  const incomingCustomAttrs=raw?.customSkillAttributes&&typeof raw.customSkillAttributes==='object'?raw.customSkillAttributes:{};
  Object.entries(incomingCustomAttrs).forEach(([name,key])=>{const clean=String(name||'').trim(),attr=String(key||'');if(clean&&Object.prototype.hasOwnProperty.call(skills,clean)&&ATTRS.some(([k])=>k===attr))customSkillAttributes[clean]=attr});
  return {
    rank:String(raw?.rank??base.rank).trim()||base.rank,
    ancestry:String(raw?.ancestry??base.ancestry).trim(),
    attributes:attrs,skills,skillModifiers,customSkillAttributes,
    paceBase:clampInt(raw?.paceBase??base.paceBase,1,30),
    naturalArmor:clampInt(raw?.naturalArmor??base.naturalArmor,0,20),
    wounds:clampInt(raw?.wounds??base.wounds,0,5),
    fatigue:clampInt(raw?.fatigue??base.fatigue,0,2),
    bennies:clampInt(raw?.bennies??base.bennies,0,99),
    shaken:Boolean(raw?.shaken??base.shaken),
    distracted:Boolean(raw?.distracted??base.distracted),
    vulnerable:Boolean(raw?.vulnerable??base.vulnerable),
    edges:normalizeEdgeSelections(raw?.edges),
    hindrances:normalizeHindranceSelections(raw?.hindrances),
    powers:normalizePowerSelections(raw?.powers),
    powerPoints:clampInt(raw?.powerPoints??base.powerPoints,0,999),
    powerPointsMax:clampInt(raw?.powerPointsMax??base.powerPointsMax,1,999)
  };
}
async function loadProfile(user,character){
  try{const raw=await readPersistedJson('sheet',user,character);return raw?normalizeProfile(raw):defaultProfile()}catch(_e){return defaultProfile()}
}
function saveProfile(user,character,profile){const clean=normalizeProfile(profile);writePersistedJson('sheet',user,character,clean);return clean}
function dieInfo(die){
  const s=String(die||'');
  if(s==='—')return {sides:0,mod:0,step:-1};
  const m=s.match(/^d(4|6|8|10|12)(?:\+(\d+))?$/i);
  if(!m)return {sides:4,mod:0,step:0};
  const sides=Number(m[1]),mod=Number(m[2]||0);
  const baseStep={4:0,6:1,8:2,10:3,12:4}[sides]??0;
  return {sides,mod,step:baseStep+mod};
}
function halfDie(die){
  const info=dieInfo(die);
  if(info.sides===0)return 0;
  return Math.floor(info.sides/2)+Math.floor(info.mod/2);
}
function comfortableLoad(die){
  const info=dieInfo(die);
  if(info.sides===0)return 0;
  if(info.sides<12)return {4:10,6:20,8:30,10:40}[info.sides]||10;
  return 50+info.mod*10;
}
function compareStrength(actual,required){return dieInfo(actual).step-dieInfo(required).step}
function shiftDie(die,steps){
  const ladder=['d4','d6','d8','d10','d12','d12+1','d12+2','d12+3'];let idx=ladder.indexOf(normalizeDie(die));if(idx<0)idx=0;
  return ladder[Math.max(0,Math.min(ladder.length-1,idx+(Number(steps)||0)))];
}
function modifierScore(def){
  const m=def?.mods||{};return Math.max(Math.abs(Number(m.parry)||0),Math.abs(Number(m.toughness)||0),Math.abs(Number(m.pace)||0),Math.abs(Number(m.startingBennies)||0),Math.abs(Number(m.woundIgnore)||0),Math.abs(Number(m.maxWounds)||0),1);
}
function blankEffects(){return {toughness:0,pace:0,parry:0,loadStrengthSteps:0,startingBennies:0,woundIgnore:0,maxWounds:3,skill:{},attributeChecks:{},notes:[]}}
function mergeMods(target,mods){
  if(!mods)return;
  target.toughness+=Number(mods.toughness)||0;target.pace+=Number(mods.pace)||0;target.parry+=Number(mods.parry)||0;target.loadStrengthSteps+=Number(mods.loadStrengthSteps)||0;target.startingBennies+=Number(mods.startingBennies)||0;
  target.woundIgnore=Math.max(target.woundIgnore,Number(mods.woundIgnore)||0);target.maxWounds=Math.max(target.maxWounds,Number(mods.maxWounds)||3);
  Object.entries(mods.skill||{}).forEach(([k,v])=>target.skill[k]=(target.skill[k]||0)+(Number(v)||0));
  Object.entries(mods.attributeChecks||{}).forEach(([k,v])=>target.attributeChecks[k]=(target.attributeChecks[k]||0)+(Number(v)||0));
}
function selectedTraitEffects(profile){
  const out=blankEffects(),selectedEdges=(profile.edges||[]).map(id=>EDGE_BY_ID.get(String(id))).filter(Boolean),chosen=[];
  const exclusive=new Map();
  selectedEdges.forEach(def=>{if(def.exclusiveGroup){const prev=exclusive.get(def.exclusiveGroup);if(!prev||modifierScore(def)>=modifierScore(prev))exclusive.set(def.exclusiveGroup,def)}else chosen.push(def)});
  chosen.push(...exclusive.values());chosen.forEach(def=>mergeMods(out,def.mods));
  (profile.hindrances||[]).forEach(sel=>{const def=HINDRANCE_BY_ID.get(String(sel.id));if(!def)return;const mods=def.modsBySeverity?.[sel.severity]||def.mods;mergeMods(out,mods)});
  return out;
}
function signed(value){const n=Number(value)||0;return n>0?`+${n}`:String(n)}
function diceOptions(selected){return DICE.map(v=>`<option value="${v}"${v===selected?' selected':''}>${v}</option>`).join('')}
function skillAttrLabel(name,profile){
  const library=SKILL_ATTR.get(name);if(library)return library;
  const key=profile?.customSkillAttributes?.[name];
  return ATTRS.find(([k])=>k===key)?.[1]||'Своя характеристика';
}
function manualSkillModifier(profile,name){return clampInt(profile?.skillModifiers?.[name]??0,-20,20)}
function sheetDetailsHTML(profile,effects){
  const used=new Set(Object.keys(profile.skills)),remaining=SKILL_LIBRARY.filter(([name])=>!used.has(name));
  return `
    <div class="swade-sheet-meta">
      <label><span>Ранг</span><input type="text" value="${esc(profile.rank)}" data-profile-text="rank" maxlength="40"></label>
      <label><span>Народ / вид</span><input type="text" value="${esc(profile.ancestry)}" data-profile-text="ancestry" placeholder="Например: человек" maxlength="60"></label>
    </div>
    <div class="sheet-attributes">
      ${ATTRS.map(([key,label])=>{const mod=effects.attributeChecks[key]||0;return `<label class="sheet-attribute"><span>${label}</span><select data-attribute="${key}">${diceOptions(profile.attributes[key])}</select>${mod?`<small class="rule-mod ${mod>0?'positive':'negative'}">${signed(mod)} к проверкам</small>`:''}</label>`}).join('')}
    </div>
    <div class="sheet-derived-settings">
      <label><span>Базовый шаг</span><input type="number" min="1" max="30" value="${profile.paceBase}" data-profile-number="paceBase"></label>
      <label><span>Естественная броня</span><input type="number" min="0" max="20" value="${profile.naturalArmor}" data-profile-number="naturalArmor"></label>
    </div>
    <div class="skills-head"><strong>Навыки</strong><small>Базовые навыки отмечены ◇</small></div>
    <div class="skills-list">
      ${Object.entries(profile.skills).map(([name,die])=>{const ruleMod=effects.skill[name]||0,manualMod=manualSkillModifier(profile,name),totalMod=ruleMod+manualMod;return `<div class="skill-row">
        <div class="skill-name"><strong>${BASIC_SKILLS.includes(name)?'◇ ':''}${esc(name)}</strong><small>${esc(skillAttrLabel(name,profile))}${ruleMod?` · черты <b class="rule-mod ${ruleMod>0?'positive':'negative'}">${signed(ruleMod)}</b>`:''}${totalMod?` · итого <b class="rule-mod ${totalMod>0?'positive':'negative'}">${signed(totalMod)}</b>`:''}</small></div>
        <select data-skill="${esc(name)}" aria-label="Кость навыка ${esc(name)}">${diceOptions(die)}</select>
        <div class="skill-mod-control" title="Постоянный модификатор навыка"><button type="button" data-skill-mod-step="-1" data-skill-name="${esc(name)}" aria-label="Уменьшить модификатор ${esc(name)}">−</button><strong class="${manualMod>0?'positive':manualMod<0?'negative':''}">${signed(manualMod)}</strong><button type="button" data-skill-mod-step="1" data-skill-name="${esc(name)}" aria-label="Увеличить модификатор ${esc(name)}">+</button></div>
        ${BASIC_SKILLS.includes(name)?'<span class="skill-lock" title="Базовый навык">◇</span>':`<button type="button" class="skill-remove" data-remove-skill="${esc(name)}" aria-label="Убрать навык">×</button>`}
      </div>`}).join('')}
    </div>
    <div class="skill-add-row"><select id="skillAddSelect"><option value="">Добавить навык из SWADE…</option>${remaining.map(([name,attr])=>`<option value="${esc(name)}">${esc(name)} · ${esc(attr)}</option>`).join('')}</select><button type="button" data-add-skill>Добавить</button></div>
    <details class="custom-skill-fold"><summary>+ Свой навык</summary><div class="custom-skill-form">
      <label><span>Название</span><input id="customSkillName" type="text" maxlength="60" placeholder="Например: Алхимия"></label>
      <label><span>Характеристика</span><select id="customSkillAttr">${ATTRS.map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('')}</select></label>
      <label><span>Кость</span><select id="customSkillDie">${diceOptions('d4')}</select></label>
      <label><span>Модификатор</span><input id="customSkillModifier" type="number" min="-20" max="20" step="1" value="0"></label>
      <button type="button" data-add-custom-skill>Добавить навык</button>
    </div></details>`;
}
function statusCounter(label,key,value,max){
  return `<div class="status-counter" data-status-counter="${key}"><span>${label}</span><div><button type="button" data-status-step="-1" data-status="${key}" aria-label="Уменьшить ${label.toLowerCase()}">−</button><strong data-status-value="${key}">${value}${max?`/${max}`:''}</strong><button type="button" data-status-step="1" data-status="${key}" aria-label="Увеличить ${label.toLowerCase()}">+</button></div></div>`;
}
function conditionToggle(label,key,active,description){
  return `<button type="button" class="combat-condition${active?' active':''}" data-condition-toggle="${key}" aria-pressed="${active?'true':'false'}"><span class="combat-condition-mark">${active?'✓':'○'}</span><span><strong>${esc(label)}</strong><small>${esc(description)}</small></span></button>`;
}
function powerPPLabel(power){return Number.isFinite(Number(power?.pp))?`${formatNumber(power.pp)} ПС`:String(power?.pp||'Особ.');}
function magicQuickHTML(profile,character){
  if(!magicEnabled(character))return '';
  const selected=(profile.powers||[]).map(id=>POWER_BY_ID.get(String(id))).filter(Boolean);
  const preview=selected.slice(0,3).map(power=>`<span>${esc(power.name)}</span>`).join('');
  return `<section class="magic-quick">
    <div class="magic-quick-title"><div class="eyebrow">МИСТИКА</div><strong>Пункты силы</strong></div>
    <div class="magic-pp-control"><button type="button" data-power-pp-step="-1" aria-label="Уменьшить пункты силы">−</button><strong>${profile.powerPoints}<small> / ${profile.powerPointsMax}</small></strong><button type="button" data-power-pp-step="1" aria-label="Увеличить пункты силы">+</button><button type="button" class="magic-rest" data-power-rest title="Обычное восстановление за час отдыха">+5 отдых</button></div>
    <div class="magic-known-preview"><b>${selected.length}</b><span>заклинаний</span>${preview?`<div>${preview}</div>`:'<small>Выбери силы из каталога</small>'}</div>
  </section>`;
}
function powerFactsHTML(power){
  return `<div class="power-facts"><span><b>Ранг</b>${esc(power.rank)}</span><span><b>ПС</b>${esc(powerPPLabel(power))}</span><span><b>Дистанция</b>${esc(power.range)}</span><span><b>Длительность</b>${esc(power.duration)}</span></div>`;
}
function powerDetailsHTML(power){
  const transformations=Array.isArray(power.transformations)&&power.transformations.length?`<div class="power-transformations"><b>Преобразования</b>${power.transformations.map(text=>`<span>${esc(text)}</span>`).join('')}</div>`:'';
  return `<div class="power-details"><p>${esc(power.description||'')}</p>${power.manifestations?`<p class="power-manifest"><b>Проявления:</b> ${esc(power.manifestations)}</p>`:''}${transformations}<small>Книга SWADE · стр. ${esc(power.page||'—')}</small></div>`;
}
function selectedPowerHTML(power,profile){
  const expanded=uiState.expandedPowerId===String(power.id),cost=powerBaseCost(power),canSpend=cost!==null&&profile.powerPoints>=cost;
  return `<article class="known-power${expanded?' expanded':''}"><button type="button" class="power-expand" data-expand-power="${esc(power.id)}" aria-expanded="${expanded?'true':'false'}">›</button><div class="known-power-main"><strong>${esc(power.name)}</strong>${powerFactsHTML(power)}</div><div class="known-power-actions">${cost!==null?`<button type="button" class="power-spend" data-spend-power="${esc(power.id)}"${canSpend?'':' disabled'} title="Списать базовую стоимость">−${formatNumber(cost)} ПС</button>`:''}<button type="button" class="power-remove" data-remove-power="${esc(power.id)}" title="Убрать из выбранных">×</button></div>${expanded?powerDetailsHTML(power):''}</article>`;
}
function powerCatalogCardHTML(power,profile){
  const selected=(profile.powers||[]).includes(String(power.id)),available=powerAvailable(power,profile),expanded=uiState.expandedPowerId===String(power.id);
  return `<article class="power-catalog-card${selected?' selected':''}${available?'':' locked'}${expanded?' expanded':''}"><button type="button" class="power-expand" data-expand-power="${esc(power.id)}" aria-expanded="${expanded?'true':'false'}">›</button><div class="power-catalog-main"><strong>${esc(power.name)}</strong>${powerFactsHTML(power)}</div><div class="power-catalog-action">${selected?'<span>Выбрано</span>':available?`<button type="button" data-add-power="${esc(power.id)}">+</button>`:`<span title="Сначала повысь ранг персонажа">${esc(power.rank)}</span>`}</div>${expanded?powerDetailsHTML(power):''}</article>`;
}
function magicFoldHTML(profile,character){
  if(!magicEnabled(character))return '';
  const selected=(profile.powers||[]).map(id=>POWER_BY_ID.get(String(id))).filter(Boolean);
  return `<details class="sheet-fold magic-fold" id="magicFold"${uiState.magicFoldOpen?' open':''}><summary><span>Заклинания</span><small>${selected.length} выбрано · ${profile.powerPoints}/${profile.powerPointsMax} ПС</small></summary><div class="sheet-fold-body">
    <div class="magic-settings"><div><strong>Текущий запас</strong><small>Обычное восстановление — 5 ПС за час отдыха.</small></div><label><span>Максимум ПС</span><input type="number" min="1" max="999" value="${profile.powerPointsMax}" data-power-max></label></div>
    <div class="magic-rule-note">Базовый запас зависит от мистического дара: магия, псионика и чудеса обычно начинают с 10 ПС; феномен и безумная наука — с 15 ПС. Максимум можно поправить под вашего персонажа.</div>
    <div class="known-powers">${selected.length?selected.map(power=>selectedPowerHTML(power,profile)).join(''):'<div class="power-empty">Пока ничего не выбрано. Открой каталог и добавь силы персонажа.</div>'}</div>
    <div class="power-catalog-head"><div><div class="eyebrow">БИБЛИОТЕКА SWADE</div><strong>Каталог сил</strong></div><button type="button" id="powerCatalogToggle" class="catalog-toggle">${uiState.powerCatalogOpen?'Закрыть каталог':'+ Каталог сил'}</button></div>
    <section class="power-catalog" id="powerCatalog"${uiState.powerCatalogOpen?'':' hidden'}><div class="power-catalog-tools"><input id="powerSearch" type="search" value="${esc(uiState.powerSearch)}" placeholder="Поиск заклинания…"><select id="powerRankFilter"><option value="available"${uiState.powerRankFilter==='available'?' selected':''}>Доступные по рангу</option><option value="all"${uiState.powerRankFilter==='all'?' selected':''}>Все силы</option><option value="selected"${uiState.powerRankFilter==='selected'?' selected':''}>Только выбранные</option></select></div><div class="power-catalog-caption"><span>${POWER_LIBRARY.length} сил в основной книге</span><small>Нажми › для подробностей</small></div><div id="powerCatalogResults" class="power-catalog-results"></div></section>
  </div></details>`;
}
function renderPowerCatalogResults(){
  if(!currentView||!magicEnabled(currentView.character))return;const root=$('#powerCatalogResults');if(!root)return;
  const q=String(uiState.powerSearch||'').trim().toLowerCase(),profile=currentView.profile;
  const rows=POWER_LIBRARY.filter(power=>{
    if(q&&!`${power.name} ${power.description} ${power.rank} ${power.range}`.toLowerCase().includes(q))return false;
    if(uiState.powerRankFilter==='available'&&!powerAvailable(power,profile))return false;
    if(uiState.powerRankFilter==='selected'&&!profile.powers.includes(String(power.id)))return false;
    return true;
  });
  root.innerHTML=rows.length?rows.map(power=>powerCatalogCardHTML(power,profile)).join(''):'<div class="power-empty">Ничего не найдено.</div>';
}

/* Equipment */
function normalizeInventoryItem(raw){
  const name=String(raw?.name||'').trim();
  let quantity=Number(raw?.quantity);
  if(!Number.isFinite(quantity)||quantity<0)quantity=1;
  quantity=Math.round(quantity);
  let catalogId=String(raw?.catalogId||'').trim();
  if(!catalogId&&name){
    const match=CATALOG.find(x=>String(x.name).trim().toLowerCase()===name.toLowerCase());
    if(match)catalogId=String(match.id);
  }
  return {
    id:String(raw?.id||`item_${Date.now()}_${Math.random().toString(36).slice(2,8)}`),
    catalogId,
    name:name||(catalogId&&CATALOG_BY_ID.get(catalogId)?.name)||'',
    quantity,
    equipped:Boolean(raw?.equipped),
    price:(raw?.price===null||raw?.price===undefined||raw?.price==='')?null:(Number.isFinite(Number(raw.price))?Math.max(0,Number(raw.price)):null),
    weight:(raw?.weight===null||raw?.weight===undefined||raw?.weight==='')?null:(Number.isFinite(Number(raw.weight))?Math.max(0,Number(raw.weight)):null),
    notes:String(raw?.notes||'').trim()
  };
}
async function loadInventory(user,character){
  const inventoryFallback=Array.isArray(character?.inventory)?character.inventory:[];
  const equipmentFallback=(Array.isArray(character?.equipment)?character.equipment:[]).flatMap(group=>Array.isArray(group?.items)?group.items:[]).map(item=>({name:item?.name||'',quantity:item?.quantity??1,equipped:item?.equipped||false}));
  const fallback=[...inventoryFallback,...equipmentFallback];
  try{const data=await readPersistedJson('inventory',user,character);return (Array.isArray(data)?data:fallback).map(normalizeInventoryItem).filter(item=>item.name)}catch(_e){return fallback.map(normalizeInventoryItem).filter(item=>item.name)}
}
function saveInventory(user,character,items){const clean=(Array.isArray(items)?items:[]).map(normalizeInventoryItem).filter(item=>item.name);writePersistedJson('inventory',user,character,clean);return clean}
function itemDetails(inv){
  const catalog=inv.catalogId?CATALOG_BY_ID.get(String(inv.catalogId)):null;
  return {...(catalog||{}),...inv,name:inv.name||catalog?.name||'Предмет',category:catalog?.category||'Своё снаряжение',page:catalog?.page||null,
    price:inv.price!=null?inv.price:(catalog?.price??null),weight:inv.weight!=null?inv.weight:(catalog?.weight??null),notes:inv.notes||catalog?.notes||''};
}
function formatNumber(value){
  const n=Number(value); if(!Number.isFinite(n))return '—';
  return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
}
function formatPrice(value){return value==null?'—':`$${formatNumber(value)}`}
function statPairs(item){
  const pairs=[];
  const add=(label,key,fmt=v=>v)=>{const v=item[key]; if(v!==undefined&&v!==null&&v!==''&&v!==false)pairs.push([label,fmt(v)])};
  add('Категория','category'); add('Цена','price',formatPrice); add('Вес','weight',v=>`${formatNumber(v)} кг`);
  add('Броня','armor',v=>`+${v}`); add('Покрытие','coverage'); add('Защита','parry',v=>Number(v)>0?`+${v}`:String(v)); add('Укрытие','cover');
  add('Урон','damage'); add('Дистанция','range'); add('ББ','ap'); add('СКС','rof'); add('Боезапас','capacity'); add('Область','area'); add('Мин. сила','minStrength'); add('Дальность','reach'); add('Перезарядка','reload');
  if(item.twoHanded)pairs.push(['Свойство','Двуручное']);
  if(item.ballistic)pairs.push(['Защита от выстрелов','−4 урона от огнестрела']);
  add('Примечание','notes');
  if(item.page)pairs.push(['Источник',`SWADE, стр. ${item.page}`]);
  return pairs;
}
function quickStats(item){
  const out=[];
  if(item.damage)out.push(item.damage);
  if(item.armor!=null)out.push(`Броня +${item.armor}`);
  if(item.parry!=null)out.push(`Защита ${Number(item.parry)>0?'+':''}${item.parry}`);
  if(item.range)out.push(item.range);
  if(item.minStrength)out.push(`Сила ${item.minStrength}`);
  if(item.weight!=null)out.push(`${formatNumber(item.weight)} кг`);
  return out.slice(0,3);
}
function coverageParts(item){
  const text=String(item?.coverage||'').trim().toLowerCase();
  const parts=new Set();
  if(!text)return [];
  if(text.includes('всё тело')||text.includes('все тело'))['head','torso','arms','legs'].forEach(part=>parts.add(part));
  if(text.includes('голова'))parts.add('head');
  if(text.includes('торс'))parts.add('torso');
  if(text.includes('руки'))parts.add('arms');
  if(text.includes('ноги'))parts.add('legs');
  return [...parts];
}
function layeredArmorValue(items){
  const values=(items||[]).map(item=>Number(item?.armor)||0).filter(v=>v>0).sort((a,b)=>b-a);
  if(!values.length)return 0;
  return values[0]+values.slice(1).reduce((sum,value)=>sum+Math.floor(value/2),0);
}
function bodyArmorState(equipped,naturalArmor=0){
  const natural=Math.max(0,Number(naturalArmor)||0);
  const partEntries=BODY_ARMOR_PARTS.map(([id,label])=>{
    const covering=(equipped||[]).filter(item=>item.category==='Броня'&&coverageParts(item).includes(id)&&Number(item.armor)>0);
    const worn=layeredArmorValue(covering); // SWADE layered armor for derived mechanics such as Toughness.
    const wornTotal=covering.reduce((sum,item)=>sum+Math.max(0,Number(item.armor)||0),0); // UI zone protection: all sources shown in the diagram add together.
    const sources=[];
    if(natural>0)sources.push(`Природная броня +${natural}`);
    covering.forEach(item=>sources.push(`${item.name} +${Number(item.armor)||0}`));
    const value=natural+wornTotal;
    return [id,{id,label,worn,wornTotal,natural,value,sources,protected:value>0}];
  });
  return Object.fromEntries(partEntries);
}
function armorCalloutValue(bodyArmor,part){
  const value=Math.max(0,Number(bodyArmor?.[part]?.value)||0);
  return value>0?`+${value}`:'—';
}
function bodyArmorFigureSVG(character,bodyArmor){
  const imageUrl=String(character?.bodyMapImage||character?.portrait||character?.fullImage||character?.avatar||'').trim();
  if(!imageUrl){
    return '<div class="armor-figure-fallback">Нет изображения персонажа</div>';
  }
  const layout=BODY_ARMOR_LAYOUTS[String(character?.id||'')]||BODY_ARMOR_LAYOUTS.default;
  const partOrder=['head','torso','arms','legs'];
  const labels={head:'ГОЛОВА',torso:'ТОРС',arms:'РУКИ',legs:'НОГИ'};
  const callouts=partOrder.map(part=>{
    const cfg=layout[part]||BODY_ARMOR_LAYOUTS.default[part];
    const value=armorCalloutValue(bodyArmor,part);
    const textAnchor=cfg.side==='left'?'end':'start';
    const textX=cfg.label[0];
    const textY=cfg.label[1];
    const lineEndX=cfg.side==='left'?cfg.label[0]+2.5:cfg.label[0]-2.5;
    return `<g class="armor-callout-group armor-callout-${part}${uiState.selectedArmorPart===part?' is-selected':''}" data-armor-zone="${part}" role="button" tabindex="0" aria-label="Показать броню: ${labels[part]}">
      <path d="M ${cfg.anchor[0]} ${cfg.anchor[1]} L ${cfg.elbow[0]} ${cfg.elbow[1]} L ${lineEndX} ${cfg.label[1]}"></path>
      <circle cx="${cfg.anchor[0]}" cy="${cfg.anchor[1]}" r="1.15"></circle>
      <text x="${textX}" y="${textY}" text-anchor="${textAnchor}">
        <tspan class="armor-callout-label">${labels[part]}</tspan>
        <tspan class="armor-callout-value" x="${textX}" dy="6.2">${value}</tspan>
      </text>
    </g>`;
  }).join('');
  return `<div class="armor-figure-photo-wrap">
    <img class="armor-figure-photo" src="${esc(imageUrl)}" alt="${esc(character?.name||'Персонаж')}">
    <svg class="armor-photo-overlay" viewBox="0 0 100 150" aria-label="Схема защиты тела" role="img">${callouts}</svg>
  </div>`;
}
function bodyArmorMapHTML(character,derived){
  const parts=BODY_ARMOR_PARTS.map(([id])=>derived?.bodyArmor?.[id]).filter(Boolean);
  const protectedCount=parts.filter(part=>part.protected).length;
  return `<details class="armor-bodymap-fold" id="armorBodyMapFold"${uiState.armorMapOpen?' open':''}>
    <summary><span><strong>Схема защиты</strong><small>${protectedCount?`${protectedCount} из ${parts.length} зон защищены`:'Броня по зонам тела'}</small></span><b>›</b></summary>
    <div class="armor-bodymap">
      <div class="armor-bodymap-figure">${bodyArmorFigureSVG(character,derived?.bodyArmor||{})}</div>
      <div class="armor-bodymap-legend">${parts.map(part=>`<button type="button" data-armor-zone="${esc(part.id)}" class="armor-part${part.protected?' is-protected':''}${uiState.selectedArmorPart===part.id?' is-selected':''}"><div><strong>${esc(part.label)}</strong><small>${part.sources.length?esc(part.sources.join(' · ')):'Без защиты'}</small></div><b>${part.protected?`+${esc(part.value)}`:'—'}</b></button>`).join('')}</div>
    </div>
  </details>`;
}
function calculateDerived(profile,inventory){
  const effects=selectedTraitEffects(profile),details=inventory.map(itemDetails),equipped=details.filter(x=>x.equipped&&Number(x.quantity)>0);
  const totalWeight=details.reduce((sum,x)=>sum+(Number(x.weight)||0)*Math.max(0,Number(x.quantity)||0),0),totalValue=details.reduce((sum,x)=>sum+(Number(x.price)||0)*Math.max(0,Number(x.quantity)||0),0);
  const effectiveLoadStrength=shiftDie(profile.attributes.strength,effects.loadStrengthSteps),comfort=comfortableLoad(effectiveLoadStrength),overloaded=comfort>0&&totalWeight>comfort;
  const heavy=equipped.filter(x=>x.minStrength&&compareStrength(effectiveLoadStrength,x.minStrength)<0);
  const minStrengthPacePenalty=heavy.filter(x=>x.category==='Броня'||x.category==='Щит').reduce((sum,x)=>sum+Math.abs(Math.min(0,compareStrength(effectiveLoadStrength,x.minStrength))),0);
  const bodyArmor=bodyArmorState(equipped,profile.naturalArmor);
  const wornArmor=Number(bodyArmor?.torso?.worn)||0;
  const armor=(Number(profile.naturalArmor)||0)+wornArmor,fight=profile.skills['Драка']||'—';let parry=2+halfDie(fight)+effects.parry;
  const shields=equipped.filter(x=>x.category==='Щит').reduce((sum,x)=>sum+(Number(x.parry)||0),0),weapons=equipped.filter(x=>x.category==='Оружие ближнего боя'&&Number(x.parry));
  const positives=weapons.map(x=>Number(x.parry)||0).filter(v=>v>0),negatives=weapons.map(x=>Number(x.parry)||0).filter(v=>v<0).reduce((a,b)=>a+b,0);parry+=shields+(positives.length?Math.max(...positives):0)+negatives;
  const toughness=2+halfDie(profile.attributes.vigor)+armor+effects.toughness,woundPenalty=Math.max(0,profile.wounds-effects.woundIgnore);
  let pace=profile.paceBase+effects.pace-woundPenalty-(overloaded?2:0)-minStrengthPacePenalty;pace=Math.max(1,pace);
  return {totalWeight,totalValue,comfort,overloaded,heavyCount:heavy.length,armor,wornArmor,parry,toughness,pace,equippedCount:equipped.length,effects,effectiveLoadStrength,maxWounds:effects.maxWounds,startingBennies:Math.max(0,3+effects.startingBennies),bodyArmor};
}
function equipmentSummaryHTML(derived){
  const loadClass=derived.overloaded?' warn':'';
  return `<div class="equipment-summary">
    <div><span>Вес</span><strong class="${loadClass.trim()}">${formatNumber(derived.totalWeight)} / ${formatNumber(derived.comfort)} кг</strong></div>
    <div><span>Стоимость</span><strong>${formatPrice(derived.totalValue)}</strong></div>
    <div><span>Надето</span><strong>${derived.equippedCount}</strong></div>
    <div><span>Мин. сила</span><strong${derived.heavyCount?' class="warn"':''}>${derived.heavyCount?`⚠ ${derived.heavyCount}`:'OK'}</strong></div>
  </div>`;
}
function combatLoadoutHTML(character,profile,inventory,derived){
  const equipped=inventory.map(itemDetails).filter(item=>item.equipped&&Number(item.quantity)>0);
  const weapons=equipped.filter(isWeaponItem);
  const armors=equipped.filter(item=>item.category==='Броня');
  const shields=equipped.filter(item=>item.category==='Щит');
  const weaponHTML=weapons.length?weapons.map(item=>{
    const stats=[];
    if(item.damage)stats.push(`Урон ${item.damage}`);
    if(item.range)stats.push(`Дист. ${item.range}`);
    if(item.reach)stats.push(`Дальность ${item.reach}`);
    if(item.ap!=null&&item.ap!=='')stats.push(`ББ ${item.ap}`);
    if(item.rof!=null&&item.rof!=='')stats.push(`СКС ${item.rof}`);
    if(item.capacity!=null&&item.capacity!=='')stats.push(`Боезапас ${item.capacity}`);
    return `<div class="loadout-weapon"><strong>${esc(item.name)}</strong><div>${stats.slice(0,4).map(v=>`<span>${esc(v)}</span>`).join('')||'<span>Экипировано</span>'}</div></div>`;
  }).join(''):'<div class="loadout-empty">Оружие не экипировано</div>';
  const armorHTML=armors.length?armors.map(item=>{const parts=coverageParts(item);const relevant=uiState.selectedArmorPart&&parts.includes(uiState.selectedArmorPart);return `<span class="loadout-armor-chip${relevant?' armor-zone-match':''}" data-armor-parts="${esc(parts.join(','))}">${esc(item.name)} · +${esc(item.armor??0)}${item.coverage?` · ${esc(item.coverage)}`:''}</span>`}).join(''):'<span class="loadout-empty">Броня не надета</span>';
  const shieldHTML=shields.length?shields.map(item=>`<span class="loadout-armor-chip">${esc(item.name)} · защита ${Number(item.parry)>0?'+':''}${esc(item.parry??0)}</span>`).join(''):'';
  const naturalNote=Number(profile?.naturalArmor)>0?`<div class="armor-map-note">Природная броня: <strong>+${esc(profile.naturalArmor)}</strong></div>`:'';
  return `<section class="combat-loadout" aria-label="Экипированное снаряжение">
    <div class="combat-loadout-block combat-weapons"><div class="combat-loadout-label">ЭКИПИРОВАННОЕ ОРУЖИЕ</div>${weaponHTML}</div>
    <div class="combat-loadout-block combat-armor"><div class="combat-loadout-label">НАДЕТАЯ БРОНЯ</div><div class="combat-armor-summary"><strong>+<span data-loadout-worn-armor>${derived.wornArmor}</span></strong><span>к стойкости на корпусе</span></div><div class="combat-armor-list">${armorHTML}${shieldHTML}</div>${bodyArmorMapHTML(character,derived)}${naturalNote}</div>
  </section>`;
}
function inventoryRowsHTML(inventory){
  if(!inventory.length)return '<div class="equipment-empty inventory-empty">Снаряжение пока пусто. Открой каталог SWADE или добавь свой предмет.</div>';
  const hasRecipients=Array.isArray(currentView?.recipients)&&currentView.recipients.length>0;
  return `<div class="smart-equipment-list">${inventory.map(inv=>{
    const item=itemDetails(inv),expanded=uiState.expandedItemId===inv.id,transferOpen=uiState.transferItemId===inv.id;
    const armorParts=item.category==='Броня'?coverageParts(item):[];const armorMatch=Boolean(uiState.selectedArmorPart&&armorParts.includes(uiState.selectedArmorPart));
    return `<article class="smart-equipment-row${inv.equipped?' equipped':''}${transferOpen?' transfer-open':''}${armorMatch?' armor-zone-match':''}" data-armor-parts="${esc(armorParts.join(','))}">
      <div class="smart-equipment-main">
        <button type="button" class="equipment-expand" data-expand-item="${esc(inv.id)}" aria-expanded="${expanded}">›</button>
        <div class="smart-equipment-copy">
          <div class="smart-equipment-title"><strong>${esc(item.name)}</strong><span>${esc(item.category)}</span>${inv.equipped?'<em>Надето</em>':''}</div>
          <div class="smart-equipment-stats">${quickStats(item).map(v=>`<span>${esc(v)}</span>`).join('')}</div>
        </div>
        <div class="smart-equipment-price"><strong>${formatPrice(item.price)}</strong><small>×${inv.quantity}</small></div>
        <div class="smart-equipment-actions">
          ${isEquipableItem(item)?`<button type="button" class="equip-toggle${inv.equipped?' active':''}" data-toggle-equipped="${esc(inv.id)}">${inv.equipped?'Снять':'Надеть'}</button>`:''}
          <button type="button" data-item-qty="-1" data-item-id="${esc(inv.id)}">−</button><b>${inv.quantity}</b><button type="button" data-item-qty="1" data-item-id="${esc(inv.id)}">+</button>
          ${hasRecipients&&inv.quantity>0?`<button type="button" class="item-transfer-toggle${transferOpen?' active':''}" data-transfer-item-toggle="${esc(inv.id)}" aria-label="Передать предмет персонажу"><span class="transfer-label">Передать</span><span class="transfer-icon">⇢</span></button>`:''}
          <button type="button" class="item-remove" data-remove-item="${esc(inv.id)}" title="Убрать">×</button>
        </div>
      </div>
      <div class="smart-equipment-details${expanded?' is-open':''}">${statPairs(item).map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>
      ${transferOpen&&hasRecipients?`<div class="item-transfer-panel"><div class="item-transfer-copy"><strong>Передать «${esc(item.name)}»</strong><small>Предмет появится у выбранного персонажа; у тебя уменьшится количество.</small></div><label><span>Кому</span><select data-item-transfer-recipient="${esc(inv.id)}">${recipientOptions()}</select></label><label><span>Кол-во</span><input type="number" min="1" max="${Math.max(1,inv.quantity)}" step="1" value="1" data-item-transfer-amount="${esc(inv.id)}"></label><button type="button" data-transfer-item-submit="${esc(inv.id)}">Передать</button></div>`:''}
    </article>`;
  }).join('')}</div>`;
}
function catalogCategories(){return [...new Set(CATALOG.map(x=>x.category))]}
function catalogPanelHTML(){
  return `<div class="equipment-catalog" id="equipmentCatalog"${uiState.catalogOpen?'':' hidden'}>
    <div class="catalog-tools"><input id="catalogSearch" type="search" placeholder="Поиск: меч, кольчуга, мушкет…" value="${esc(uiState.catalogSearch)}"><select id="catalogCategory"><option value="">Все категории</option>${catalogCategories().map(cat=>`<option value="${esc(cat)}"${uiState.catalogCategory===cat?' selected':''}>${esc(cat)}</option>`).join('')}</select></div>
    <div class="catalog-caption"><span>База предметов из главы «Снаряжение» SWADE</span><small id="catalogCount"></small></div>
    <div class="catalog-results" id="catalogResults"></div>
  </div>`;
}
function equipmentHTML(inventory,derived){
  return `<section class="inventory-panel smart-inventory">
    <div class="inventory-head">
      <div><div class="eyebrow">СНАРЯЖЕНИЕ</div><h3>Снаряжение персонажа</h3></div>
      <button type="button" class="catalog-toggle" id="catalogToggle">${uiState.catalogOpen?'Закрыть каталог':'+ Каталог SWADE'}</button>
    </div>
    ${equipmentSummaryHTML(derived)}
    ${catalogPanelHTML()}
    ${inventoryRowsHTML(inventory)}
    <details class="manual-item-fold"><summary>Добавить свой предмет</summary>
      <form id="manualItemForm" class="manual-item-form">
        <label><span>Название</span><input name="name" required maxlength="80" placeholder="Свой предмет"></label>
        <label><span>Кол-во</span><input name="quantity" type="number" min="0" step="1" value="1"></label>
        <label><span>Цена</span><input name="price" type="number" min="0" step="0.5" placeholder="—"></label>
        <label><span>Вес, кг</span><input name="weight" type="number" min="0" step="0.1" placeholder="—"></label>
        <button type="submit">Добавить</button>
      </form>
    </details>
    <div id="inventoryMessage" class="inventory-message" hidden></div>
  </section>`;
}
function showInventoryMessage(text){const box=$('#inventoryMessage');if(box){box.hidden=!text;box.textContent=text||''}}
function filteredCatalog(){
  const q=uiState.catalogSearch.trim().toLowerCase();
  return CATALOG.filter(item=>(!uiState.catalogCategory||item.category===uiState.catalogCategory)&&(!q||[item.name,item.category,item.notes,item.damage,item.range].some(v=>String(v||'').toLowerCase().includes(q))));
}
function renderCatalogResults(){
  const root=$('#catalogResults'),count=$('#catalogCount'); if(!root)return;
  const results=filteredCatalog(); const shown=results.slice(0,36);
  if(count)count.textContent=`${results.length} предметов${results.length>36?' · показаны первые 36':''}`;
  root.innerHTML=shown.length?shown.map(item=>`<div class="catalog-item">
    <div><strong>${esc(item.name)}</strong><small>${esc(item.category)} · стр. ${item.page}</small><div>${quickStats(item).map(v=>`<span>${esc(v)}</span>`).join('')}</div></div>
    <div class="catalog-item-side"><b>${formatPrice(item.price)}</b><button type="button" data-add-catalog="${esc(item.id)}">+</button></div>
  </div>`).join(''):'<div class="catalog-empty">Ничего не найдено.</div>';
}

function severityLabel(value){return value==='major'?'Крупный':'Мелкий'}
function edgeOptions(profile){
  const selected=new Set(profile.edges||[]),groups=[...new Set(EDGE_LIBRARY.map(e=>e.group))];
  return groups.map(group=>`<optgroup label="${esc(group)}">${EDGE_LIBRARY.filter(e=>e.group===group&&!selected.has(String(e.id))).map(e=>`<option value="${esc(e.id)}">${esc(e.name)} · ${esc(e.rank)}</option>`).join('')}</optgroup>`).join('');
}
function hindranceOptions(profile){
  const selected=new Set((profile.hindrances||[]).map(h=>String(h.id)));
  return HINDRANCE_LIBRARY.filter(h=>!selected.has(String(h.id))).map(h=>`<option value="${esc(h.id)}">${esc(h.name)}${(h.severity||[]).length>1?' · мелкий/крупный':` · ${severityLabel((h.severity||['minor'])[0]).toLowerCase()}`}</option>`).join('');
}
function effectsSummaryHTML(effects){
  const chips=[];if(effects.toughness)chips.push(`Стойкость ${signed(effects.toughness)}`);if(effects.parry)chips.push(`Защита ${signed(effects.parry)}`);if(effects.pace)chips.push(`Шаг ${signed(effects.pace)}`);if(effects.loadStrengthSteps)chips.push(`Сила для нагрузки ${signed(effects.loadStrengthSteps)} ступ.`);if(effects.woundIgnore)chips.push(`Игнор штрафа ранений ${effects.woundIgnore}`);if(effects.maxWounds!==3)chips.push(`Предел ранений ${effects.maxWounds}`);if(effects.startingBennies)chips.push(`Стартовые фишки ${signed(effects.startingBennies)}`);
  Object.entries(effects.skill).filter(([,v])=>v).slice(0,8).forEach(([name,v])=>chips.push(`${name} ${signed(v)}`));
  Object.entries(effects.attributeChecks).filter(([,v])=>v).forEach(([key,v])=>{const label=ATTRS.find(([k])=>k===key)?.[1]||key;chips.push(`${label}: проверки ${signed(v)}`)});
  return `<div class="trait-effects"><span>Автоматически учтено</span><div>${chips.length?chips.map(c=>`<b>${esc(c)}</b>`).join(''):'<em>Постоянных числовых модификаторов нет</em>'}</div></div>`;
}
function traitsHTML(profile,effects){
  const edges=(profile.edges||[]).map(id=>EDGE_BY_ID.get(String(id))).filter(Boolean),hinds=(profile.hindrances||[]).map(sel=>({sel,def:HINDRANCE_BY_ID.get(String(sel.id))})).filter(x=>x.def);
  return `<div class="trait-editor">
    ${effectsSummaryHTML(effects)}
    <div class="trait-grid">
      <section class="trait-column"><div class="trait-column-head"><strong>Черты</strong><span>${edges.length}</span></div>
        <div class="trait-selected">${edges.length?edges.map(def=>`<div class="trait-row"><div><strong>${esc(def.name)}</strong><small>${esc(def.group)} · ${esc(def.rank)}${def.req&&def.req!=='—'?` · требуется: ${esc(def.req)}`:''}</small><p>${esc(def.summary)}</p></div><button type="button" data-remove-edge="${esc(def.id)}" title="Убрать">×</button></div>`).join(''):'<div class="trait-empty">Черты не выбраны.</div>'}</div>
        <div class="trait-add"><select id="edgeAddSelect"><option value="">Выбрать черту…</option>${edgeOptions(profile)}</select><button type="button" data-add-edge>Добавить</button></div>
      </section>
      <section class="trait-column"><div class="trait-column-head"><strong>Изъяны</strong><span>${hinds.length}</span></div>
        <div class="trait-selected">${hinds.length?hinds.map(({sel,def})=>{const allowed=def.severity||['minor'];return `<div class="trait-row hindrance-row"><div><strong>${esc(def.name)}</strong><small>${allowed.length>1?`<select data-hindrance-severity="${esc(def.id)}">${allowed.map(v=>`<option value="${v}"${v===sel.severity?' selected':''}>${severityLabel(v)}</option>`).join('')}</select>`:severityLabel(sel.severity)}</small><p>${esc(def.summary)}</p></div><button type="button" data-remove-hindrance="${esc(def.id)}" title="Убрать">×</button></div>`}).join(''):'<div class="trait-empty">Изъяны не выбраны.</div>'}</div>
        <div class="trait-add"><select id="hindranceAddSelect"><option value="">Выбрать изъян…</option>${hindranceOptions(profile)}</select><button type="button" data-add-hindrance>Добавить</button></div>
      </section>
    </div>
    <p class="trait-rules-note">Требования показаны как подсказка и не блокируют выбор. Условные эффекты (например, ярость, алкоголь или бонус только в определённой среде) не применяются автоматически.</p>
  </div>`;
}

/* Shared party data: treasury, notes, recipients and live sync */
function normalizePartyMoney(raw){return normalizeMoney(raw||{});}
function normalizeSharedNotes(raw){return {text:String(raw?.text||'').slice(0,12000),updatedAt:Number(raw?.updatedAt)||0,updatedBy:String(raw?.updatedBy||'')};}
async function loadPartyContext(){
  const data=await sharedRequest({action:'party-context'});
  if(!data)return {money:normalizePartyMoney({}),notes:normalizeSharedNotes({}),players:[],available:false};
  return {money:normalizePartyMoney(data.partyMoney||{}),notes:normalizeSharedNotes(data.notes||{}),players:Array.isArray(data.players)?data.players:[],available:true};
}
function recipientOptions(selected=''){
  const rows=Array.isArray(currentView?.recipients)?currentView.recipients:[];
  return `<option value=""${selected?'':' selected'}>Выбери персонажа…</option>`+rows.map(row=>`<option value="${esc(row.id)}"${String(row.id)===String(selected)?' selected':''}>${esc(row.name)}${row.telegramUsername?` · @${esc(row.telegramUsername)}`:''}</option>`).join('');
}
function sharedNotesMeta(notes){
  const n=normalizeSharedNotes(notes);if(!n.updatedAt)return 'Пока никто не редактировал';
  let when='';try{when=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(n.updatedAt))}catch(_e){}
  return `${n.updatedBy?`Изменил ${n.updatedBy}`:'Обновлено'}${when?` · ${when}`:''}`;
}
function sharedNotesHTML(notes){
  const n=normalizeSharedNotes(notes),preview=n.text.trim().replace(/\s+/g,' ').slice(0,88);
  return `<details class="shared-notes-panel" id="sharedNotesFold"${uiState.notesFoldOpen?' open':''}><summary><div><div class="eyebrow">ОБЩИЕ ЗАМЕТКИ</div><strong>Заметки группы</strong><small data-shared-notes-preview>${esc(preview||'Нажми, чтобы добавить общую заметку')}</small></div><span>›</span></summary><div class="shared-notes-body"><textarea id="sharedNotesEditor" maxlength="12000" placeholder="Планы группы, важные имена, подсказки, договорённости…">${esc(n.text)}</textarea><div class="shared-notes-footer"><small id="sharedNotesMeta">${esc(sharedNotesMeta(n))}</small><div><span id="sharedNotesCount">${n.text.length}/12000</span><button type="button" id="sharedNotesSave" data-shared-notes-save>Сохранить для всех</button></div></div><div id="sharedNotesMessage" class="inventory-message" hidden></div></div></details>`;
}
function updateSharedNotesDom(notes){
  const n=normalizeSharedNotes(notes),editor=$('#sharedNotesEditor'),meta=$('#sharedNotesMeta'),preview=document.querySelector('[data-shared-notes-preview]'),count=$('#sharedNotesCount');
  if(editor&&!uiState.notesDirty)editor.value=n.text;
  if(meta)meta.textContent=sharedNotesMeta(n);
  if(preview)preview.textContent=n.text.trim().replace(/\s+/g,' ').slice(0,88)||'Нажми, чтобы добавить общую заметку';
  if(count&&!uiState.notesDirty)count.textContent=`${n.text.length}/12000`;
}
function showSharedNotesMessage(text){const box=$('#sharedNotesMessage');if(box){box.hidden=!text;box.textContent=text||''}}
function partyMoneyHTML(state){
  const available=Boolean(state?.available),money=normalizePartyMoney(state?.money||{});
  if(!available){
    const text=sharedStorageState==='missing'?'Общее хранилище не подключено.':'Общая казна временно недоступна.';
    return `<section class="party-money-panel unavailable"><div class="party-money-head"><div><div class="eyebrow">ОБЩАЯ КАЗНА</div><h3>Общие деньги</h3></div><span class="party-money-live">синхронизация</span></div><p class="party-money-note">${esc(text)}</p></section>`;
  }
  return `<section class="party-money-panel"><div class="party-money-head"><div><div class="eyebrow">ОБЩАЯ КАЗНА</div><h3>Общие деньги</h3></div><span class="party-money-live">● общие для всех</span></div>
    <div id="partyMoneyMessage" class="inventory-message money-message" hidden></div>
    <div class="party-money-strip"><div><span>Орлы</span><strong data-party-money-balance="eagles">${formatNumber(money.eagles)}</strong></div><div><span>Сикели</span><strong data-party-money-balance="sikels">${formatNumber(money.sikels)}</strong></div></div>
    <details class="party-money-edit"><summary>Изменить общую казну</summary><div class="party-money-controls">${['eagles','sikels'].map(code=>`<div class="party-money-control"><strong>${code==='eagles'?'Орлы':'Сикели'}</strong><input type="number" min="0" step="1" value="1" data-party-money-input="${code}" aria-label="Сумма"><div><button type="button" data-party-money-action="subtract" data-currency="${code}">−</button><button type="button" data-party-money-action="add" data-currency="${code}">+</button><button type="button" class="party-money-set" data-party-money-action="set" data-currency="${code}">Задать</button></div></div>`).join('')}</div><p class="party-money-note">Изменение одного игрока автоматически появляется у остальных.</p></details>
  </section>`;
}
function updatePartyMoneyDom(money){
  const clean=normalizePartyMoney(money);
  ['eagles','sikels'].forEach(code=>{const el=document.querySelector(`[data-party-money-balance="${code}"]`);if(el)el.textContent=formatNumber(clean[code])});
}
function showPartyMoneyMessage(text){const box=$('#partyMoneyMessage');if(box){box.hidden=!text;box.textContent=text||''}}
function sharedWriteBusy(kind){if(!currentView)return false;const key=`${characterStorageId(currentView.character)}:${kind}`,state=SHARED_WRITERS.get(key);return Boolean(state?.running||state?.pending)}
function adoptRemoteEnvelope(kind,envelope){
  if(!currentView||!envelope||envelope.__norvayneSync!==1||sharedWriteBusy(kind))return false;
  const updatedAt=Number(envelope.updatedAt)||0,last=Number(currentView.liveSeen?.[kind])||0;
  if(updatedAt<=last)return false;
  currentView.liveSeen=currentView.liveSeen||{};currentView.liveSeen[kind]=updatedAt;
  const localKey=storageKey(kind,currentView.user,currentView.character);localWriteEnvelope(localKey,envelope);
  if(cloudAvailable())enqueueCloudWrite(kind,currentView.character,envelope);
  if(kind==='money'){
    const next=normalizeMoney(envelope.data||{}),changed=JSON.stringify(next)!==JSON.stringify(currentView.money);
    currentView.money=next;if(changed)updateMoneyDom(next);return changed;
  }
  if(kind==='inventory'){
    const next=(Array.isArray(envelope.data)?envelope.data:[]).map(normalizeInventoryItem).filter(item=>item.name),changed=JSON.stringify(next)!==JSON.stringify(currentView.inventory);
    currentView.inventory=next;return changed;
  }
  return false;
}
async function refreshPartyMoney(){
  if(!currentView||partyMoneyRefreshInFlight||!sharedAvailable())return false;
  partyMoneyRefreshInFlight=true;
  try{
    const data=await sharedRequest({action:'live-sync'});if(!data)return false;
    currentView.partyMoney={money:normalizePartyMoney(data.partyMoney||{}),available:true};updatePartyMoneyDom(currentView.partyMoney.money);
    const incomingNotes=normalizeSharedNotes(data.notes||{});
    if(incomingNotes.updatedAt>Number(currentView.notes?.updatedAt||0)){currentView.notes=incomingNotes;updateSharedNotesDom(incomingNotes)}
    adoptRemoteEnvelope('money',data.moneyEnvelope);
    const inventoryChanged=adoptRemoteEnvelope('inventory',data.inventoryEnvelope);
    if(inventoryChanged){const draft=uiState.notesDirty?String($('#sharedNotesEditor')?.value||''):'';rerender();if(uiState.notesDirty){const editor=$('#sharedNotesEditor');if(editor)editor.value=draft;const count=$('#sharedNotesCount');if(count)count.textContent=`${draft.length}/12000`;}}
    return true;
  }finally{partyMoneyRefreshInFlight=false}
}
function startPartyMoneyPolling(){
  if(partyMoneyPollTimer){clearInterval(partyMoneyPollTimer);partyMoneyPollTimer=null;}
  if(!currentView||!sharedAvailable())return;
  partyMoneyPollTimer=setInterval(()=>{if(document.visibilityState==='visible')refreshPartyMoney()},4000);
}

/* Money */
function normalizeMoney(raw){
  const safe=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.round(n)):0};
  return {eagles:safe(raw?.eagles),sikels:safe(raw?.sikels)};
}
async function loadMoney(user,character){
  const fallback=normalizeMoney(character?.money||{});try{const raw=await readPersistedJson('money',user,character);return raw?normalizeMoney(raw):fallback}catch(_e){return fallback}
}
function saveMoney(user,character,money){const clean=normalizeMoney(money);writePersistedJson('money',user,character,clean);return clean}
function currencyLabel(code,amount){
  const n=Math.abs(Number(amount)||0),last=n%10,last2=n%100;
  if(code==='sikels'){if(last===1&&last2!==11)return 'Сикель';if(last>=2&&last<=4&&(last2<12||last2>14))return 'Сикеля';return 'Сикелей';}
  if(last===1&&last2!==11)return 'Орёл';if(last>=2&&last<=4&&(last2<12||last2>14))return 'Орла';return 'Орлов';
}
function moneyHTML(money){
  const rows=[{code:'eagles',name:'Орлы',realm:'Резвурия',symbol:'О'},{code:'sikels',name:'Сикели',realm:'Дория',symbol:'С'}];
  const hasRecipients=Array.isArray(currentView?.recipients)&&currentView.recipients.length>0;
  return `<section class="money-panel compact-money"><div class="money-head compact-money-head"><div><div class="eyebrow">ЛИЧНЫЙ КОШЕЛЁК</div><h3>Деньги персонажа</h3></div><div class="money-rate">1 Сикель = 2 Орла</div></div>
    <div id="moneyMessage" class="inventory-message money-message" hidden></div>
    <div class="money-rows">${rows.map(row=>`<div class="money-row" data-currency="${row.code}"><div class="money-row-title"><span class="currency-symbol">${row.symbol}</span><div><strong>${row.name}</strong><small>${row.realm}</small></div></div><div class="money-row-balance"><strong data-money-balance="${row.code}">${formatNumber(money[row.code])}</strong></div><input class="money-row-input" type="number" min="0" step="1" value="1" data-money-input="${row.code}" aria-label="Сумма"><div class="money-row-actions"><button type="button" data-money-action="subtract" data-currency="${row.code}">−</button><button type="button" data-money-action="add" data-currency="${row.code}">+</button><button type="button" class="money-set-btn" data-money-action="set" data-currency="${row.code}">Задать</button></div></div>`).join('')}</div>
    <details class="money-transfer-panel"><summary><span>Передать деньги персонажу</span><small>${hasRecipients?'из личного кошелька':'нет доступных получателей'}</small></summary>${hasRecipients?`<div class="money-transfer-form"><label><span>Кому</span><select id="moneyTransferRecipient">${recipientOptions()}</select></label><label><span>Валюта</span><select id="moneyTransferCurrency"><option value="eagles">Орлы</option><option value="sikels">Сикели</option></select></label><label><span>Сумма</span><input id="moneyTransferAmount" type="number" min="1" step="1" value="1"></label><button type="button" data-transfer-money-submit>Передать</button></div>`:'<p class="transfer-empty">Другие персонажи пока недоступны.</p>'}</details>
    <details class="exchange-card compact-exchange" id="exchangeFold"><summary><div><div class="eyebrow">ОБМЕН</div><strong>Калькулятор курса</strong></div><span>1 С = 2 О</span></summary><div class="exchange-fold-body"><div class="exchange-head"><small>Быстрый пересчёт без изменения баланса</small><button type="button" id="exchangeSwap" class="exchange-swap" aria-label="Поменять валюты местами">⇄</button></div><div class="exchange-inline"><input id="exchangeAmount" type="number" min="0" step="0.5" value="1"><select id="exchangeFrom"><option value="sikels">Сикели</option><option value="eagles">Орлы</option></select><div id="exchangeResult" class="exchange-result"></div></div></div></details>
  </section>`;
}
function updateMoneyDom(money){['eagles','sikels'].forEach(code=>{const el=document.querySelector(`[data-money-balance="${code}"]`);if(el)el.textContent=formatNumber(money[code])})}
function showMoneyMessage(text){const box=$('#moneyMessage');if(box){box.hidden=!text;box.textContent=text||''}}
function updateExchangeResult(){
  const amountEl=$('#exchangeAmount'),fromEl=$('#exchangeFrom'),result=$('#exchangeResult');if(!amountEl||!fromEl||!result)return;
  const amount=Math.max(0,Number(amountEl.value)||0),from=fromEl.value,to=from==='sikels'?'eagles':'sikels',converted=from==='sikels'?amount*2:amount/2;
  result.innerHTML=`<strong>${formatNumber(amount)} ${currencyLabel(from,amount)}</strong><span>=</span><strong>${formatNumber(converted)} ${currencyLabel(to,converted)}</strong>`;
}

function derivedSummaryHTML(profile,derived){
  return `<section class="combat-dashboard" aria-label="Боевой статус персонажа">
    <div class="combat-dashboard-head"><div><div class="eyebrow">БОЕВОЙ СТАТУС</div><h3>Состояние персонажа</h3></div><span class="combat-dashboard-hint">меняется в 1 касание</span></div>
    <div class="swade-derived" id="swadeDerived">
      <div><span>Шаг</span><strong data-derived="pace">${derived.pace}</strong></div>
      <div><span>Защита</span><strong data-derived="parry">${derived.parry}</strong></div>
      <div><span>Стойкость</span><strong data-derived="toughness">${derived.toughness}${derived.armor?` <small>(броня +${derived.armor})</small>`:''}</strong></div>
      <div><span>Нагрузка</span><strong data-derived="load"${derived.overloaded?' class="warn"':''}>${formatNumber(derived.totalWeight)}/${formatNumber(derived.comfort)}</strong><small class="derived-sub">Сила ${esc(derived.effectiveLoadStrength)}</small></div>
    </div>
    <div class="swade-status-strip">
      ${statusCounter('Ранения','wounds',profile.wounds,derived.maxWounds)}${statusCounter('Усталость','fatigue',profile.fatigue,2)}${statusCounter('Фишки','bennies',profile.bennies,null)}
      <div class="start-benny-note">Старт: ${derived.startingBennies} фиш.</div>
    </div>
    <div class="combat-conditions">
      ${conditionToggle('В шоке','shaken',profile.shaken,'нужно выйти из шока')}
      ${conditionToggle('Отвлечён','distracted',profile.distracted,'−2 к действиям')}
      ${conditionToggle('Уязвим','vulnerable',profile.vulnerable,'+2 по персонажу')}
    </div>
  </section>`;
}
function refreshDerived(){
  if(!currentView)return;const d=calculateDerived(currentView.profile,currentView.inventory);currentView.derived=d;
  const map={pace:d.pace,parry:d.parry,load:`${formatNumber(d.totalWeight)}/${formatNumber(d.comfort)}`};Object.entries(map).forEach(([key,val])=>{const el=document.querySelector(`[data-derived="${key}"]`);if(el){el.textContent=val;if(key==='load')el.classList.toggle('warn',d.overloaded)}});
  const toughnessEl=document.querySelector('[data-derived="toughness"]');if(toughnessEl)toughnessEl.innerHTML=`${d.toughness}${d.armor?` <small>(броня +${d.armor})</small>`:''}`;
  const wornEl=document.querySelector('[data-loadout-worn-armor]');if(wornEl)wornEl.textContent=d.wornArmor;
  const loadSub=document.querySelector('.derived-sub');if(loadSub)loadSub.textContent=`Сила ${d.effectiveLoadStrength}`;
}
async function renderCharacter(user,character){
  renderChip(user,character);
  content.innerHTML='<div class="character-notice"><strong>Загружаю лист персонажа…</strong><p>Получаю сохранённые данные и общие данные группы.</p></div>';
  const [profile,inventory,money,partyContext]=await Promise.all([loadProfile(user,character),loadInventory(user,character),loadMoney(user,character),loadPartyContext()]);
  renderCharacterUI(user,character,profile,inventory,money,partyContext);
  setSyncStatus(cloudAvailable()?'☁ Синхронизировано':'Локальное сохранение',cloudAvailable()?'ok':'local');
}
function renderCharacterUI(user,character,profile,inventory,money,partyContext){
  const derived=calculateDerived(profile,inventory),context=partyContext||{};
  currentView={
    user,character,inventory,money,profile,derived,
    partyMoney:{money:normalizePartyMoney(context.money||currentView?.partyMoney?.money||{}),available:context.available!==undefined?Boolean(context.available):Boolean(currentView?.partyMoney?.available)},
    notes:normalizeSharedNotes(context.notes||currentView?.notes||{}),
    recipients:Array.isArray(context.players)?context.players:(Array.isArray(currentView?.recipients)?currentView.recipients:[]),
    liveSeen:currentView?.liveSeen||{money:0,inventory:0}
  };
  renderChip(user,character);
  const name=telegramDisplayName(user),handle=user?.username?'@'+user.username:'без username';
  content.innerHTML=`
    <div class="character-head"><button type="button" class="character-avatar character-art-trigger" id="characterAvatar" data-character-art aria-label="Открыть полное изображение персонажа ${esc(character.name)}" title="Открыть полное изображение"></button><div class="character-identity"><div class="eyebrow">ЛИСТ ПЕРСОНАЖА · SWADE</div><h2>${esc(character.name)}</h2><p>${esc(character.title||'Персонаж')}</p><div class="telegram-owner"><strong>${esc(name)}</strong><span>${esc(handle)}</span></div><button type="button" id="cloudSyncStatus" class="cloud-sync-status" data-sync-now data-state="${cloudAvailable()?'ok':'local'}" title="Нажми, чтобы принудительно синхронизировать">${cloudAvailable()?'☁ Telegram Cloud':'Локальное сохранение'}</button></div></div>
    ${derivedSummaryHTML(profile,derived)}
    <details class="sheet-fold" id="skillsFold"${uiState.skillsFoldOpen?' open':''}><summary><span>Характеристики и навыки</span><small>5 характеристик · ${Object.keys(profile.skills).length} навыков</small></summary><div class="sheet-fold-body">${sheetDetailsHTML(profile,derived.effects)}</div></details>
    <details class="sheet-fold" id="traitsFold"${uiState.traitsFoldOpen?' open':''}><summary><span>Черты и изъяны</span><small>${profile.edges.length} черт · ${profile.hindrances.length} изъянов</small></summary><div class="sheet-fold-body">${traitsHTML(profile,derived.effects)}</div></details>
    ${combatLoadoutHTML(character,profile,inventory,derived)}
    ${magicQuickHTML(profile,character)}
    ${sharedNotesHTML(currentView.notes)}
    ${magicFoldHTML(profile,character)}
    <div class="character-divider"><span>◇</span><strong>Снаряжение</strong><span>◇</span></div>${equipmentHTML(inventory,derived)}
    <div class="character-divider"><span>◇</span><strong>Деньги</strong><span>◇</span></div>${partyMoneyHTML(currentView.partyMoney)}${moneyHTML(money)}`;
  setAvatar($('#characterAvatar'),character.avatar||user?.photo_url||'',user);bindEvents();startPartyMoneyPolling();
}
function saveAndRefreshProfile(){
  if(!currentView)return;
  currentView.profile=saveProfile(currentView.user,currentView.character,currentView.profile);
  refreshDerived();
}
function rerender(){if(currentView)renderCharacterUI(currentView.user,currentView.character,currentView.profile,currentView.inventory,currentView.money,{money:currentView.partyMoney?.money,available:currentView.partyMoney?.available,notes:currentView.notes,players:currentView.recipients})}

async function handleClick(event){
  if(!currentView)return;
  const artTrigger=event.target.closest('[data-character-art]');
  if(artTrigger){openCharacterArt(currentView.character,artTrigger);return;}
  const armorZone=event.target.closest('[data-armor-zone]');
  if(armorZone){const part=String(armorZone.dataset.armorZone||'');if(BODY_ARMOR_PARTS.some(([id])=>id===part)){uiState.armorMapOpen=true;uiState.selectedArmorPart=uiState.selectedArmorPart===part?null:part;rerender();}return;}
  const syncNow=event.target.closest('[data-sync-now]');
  if(syncNow){forceSyncCurrent();return;}
  const ppStep=event.target.closest('[data-power-pp-step]');
  if(ppStep&&magicEnabled(currentView.character)){currentView.profile.powerPoints=clampInt(currentView.profile.powerPoints+(Number(ppStep.dataset.powerPpStep)||0),0,999);currentView.profile=saveProfile(currentView.user,currentView.character,currentView.profile);rerender();return;}
  const restPower=event.target.closest('[data-power-rest]');
  if(restPower&&magicEnabled(currentView.character)){if(currentView.profile.powerPoints<currentView.profile.powerPointsMax)currentView.profile.powerPoints=Math.min(currentView.profile.powerPointsMax,currentView.profile.powerPoints+5);currentView.profile=saveProfile(currentView.user,currentView.character,currentView.profile);rerender();return;}
  const spendPower=event.target.closest('[data-spend-power]');
  if(spendPower&&magicEnabled(currentView.character)){const power=POWER_BY_ID.get(String(spendPower.dataset.spendPower)),cost=powerBaseCost(power);if(cost!==null&&currentView.profile.powerPoints>=cost){currentView.profile.powerPoints-=cost;currentView.profile=saveProfile(currentView.user,currentView.character,currentView.profile);rerender()}return;}
  const powerCatalogToggle=event.target.closest('#powerCatalogToggle');
  if(powerCatalogToggle&&magicEnabled(currentView.character)){uiState.powerCatalogOpen=!uiState.powerCatalogOpen;uiState.magicFoldOpen=true;rerender();return;}
  const addPower=event.target.closest('[data-add-power]');
  if(addPower&&magicEnabled(currentView.character)){const id=String(addPower.dataset.addPower||''),power=POWER_BY_ID.get(id);if(power&&powerAvailable(power,currentView.profile)&&!currentView.profile.powers.includes(id)){currentView.profile.powers.push(id);uiState.magicFoldOpen=true;currentView.profile=saveProfile(currentView.user,currentView.character,currentView.profile);rerender()}return;}
  const removePower=event.target.closest('[data-remove-power]');
  if(removePower&&magicEnabled(currentView.character)){currentView.profile.powers=currentView.profile.powers.filter(id=>id!==String(removePower.dataset.removePower));uiState.magicFoldOpen=true;currentView.profile=saveProfile(currentView.user,currentView.character,currentView.profile);rerender();return;}
  const expandPower=event.target.closest('[data-expand-power]');
  if(expandPower&&magicEnabled(currentView.character)){uiState.expandedPowerId=uiState.expandedPowerId===String(expandPower.dataset.expandPower)?null:String(expandPower.dataset.expandPower);uiState.magicFoldOpen=true;rerender();return;}
  const addEdge=event.target.closest('[data-add-edge]');
  if(addEdge){const sel=$('#edgeAddSelect'),id=String(sel?.value||'');if(id&&EDGE_BY_ID.has(id)&&!currentView.profile.edges.includes(id)){currentView.profile.edges.push(id);uiState.traitsFoldOpen=true;saveAndRefreshProfile();rerender()}return;}
  const removeEdge=event.target.closest('[data-remove-edge]');
  if(removeEdge){currentView.profile.edges=currentView.profile.edges.filter(id=>id!==removeEdge.dataset.removeEdge);uiState.traitsFoldOpen=true;saveAndRefreshProfile();rerender();return;}
  const addHind=event.target.closest('[data-add-hindrance]');
  if(addHind){const sel=$('#hindranceAddSelect'),id=String(sel?.value||''),def=HINDRANCE_BY_ID.get(id);if(def&&!currentView.profile.hindrances.some(h=>h.id===id)){currentView.profile.hindrances.push({id,severity:(def.severity||['minor'])[0]});uiState.traitsFoldOpen=true;saveAndRefreshProfile();rerender()}return;}
  const removeHind=event.target.closest('[data-remove-hindrance]');
  if(removeHind){currentView.profile.hindrances=currentView.profile.hindrances.filter(h=>h.id!==removeHind.dataset.removeHindrance);uiState.traitsFoldOpen=true;saveAndRefreshProfile();rerender();return;}
  const addSkill=event.target.closest('[data-add-skill]');
  if(addSkill){const sel=$('#skillAddSelect'),name=String(sel?.value||'');if(name&&!currentView.profile.skills[name]){uiState.skillsFoldOpen=true;currentView.profile.skills[name]='d4';currentView.profile.skillModifiers[name]=0;saveAndRefreshProfile();rerender();}return;}
  const addCustomSkill=event.target.closest('[data-add-custom-skill]');
  if(addCustomSkill){
    const name=String($('#customSkillName')?.value||'').trim(),attr=String($('#customSkillAttr')?.value||''),die=normalizeDie($('#customSkillDie')?.value),modifier=clampInt($('#customSkillModifier')?.value??0,-20,20);
    if(!name)return;
    uiState.skillsFoldOpen=true;
    const existing=Object.keys(currentView.profile.skills).find(key=>key.toLowerCase()===name.toLowerCase());
    if(existing){currentView.profile.skills[existing]=die;currentView.profile.skillModifiers[existing]=modifier;if(!SKILL_ATTR.has(existing)&&ATTRS.some(([key])=>key===attr))currentView.profile.customSkillAttributes[existing]=attr;}
    else{currentView.profile.skills[name]=die;currentView.profile.skillModifiers[name]=modifier;if(ATTRS.some(([key])=>key===attr))currentView.profile.customSkillAttributes[name]=attr;}
    saveAndRefreshProfile();rerender();return;
  }
  const skillMod=event.target.closest('[data-skill-mod-step]');
  if(skillMod){const name=String(skillMod.dataset.skillName||''),step=Number(skillMod.dataset.skillModStep)||0;if(Object.prototype.hasOwnProperty.call(currentView.profile.skills,name)){uiState.skillsFoldOpen=true;currentView.profile.skillModifiers[name]=clampInt(manualSkillModifier(currentView.profile,name)+step,-20,20);saveAndRefreshProfile();rerender();}return;}
  const removeSkill=event.target.closest('[data-remove-skill]');
  if(removeSkill){const name=removeSkill.dataset.removeSkill;uiState.skillsFoldOpen=true;delete currentView.profile.skills[name];delete currentView.profile.skillModifiers[name];delete currentView.profile.customSkillAttributes[name];saveAndRefreshProfile();rerender();return;}
  const status=event.target.closest('[data-status-step]');
  if(status){const key=status.dataset.status,step=Number(status.dataset.statusStep)||0,max=key==='wounds'?(currentView.derived?.maxWounds||3):key==='fatigue'?2:99;currentView.profile[key]=clampInt((currentView.profile[key]||0)+step,0,max);saveAndRefreshProfile();const el=document.querySelector(`[data-status-value="${key}"]`);if(el)el.textContent=`${currentView.profile[key]}${key==='wounds'?'/'+max:key==='fatigue'?'/2':''}`;return;}
  const condition=event.target.closest('[data-condition-toggle]');
  if(condition){const key=String(condition.dataset.conditionToggle||'');if(['shaken','distracted','vulnerable'].includes(key)){currentView.profile[key]=!Boolean(currentView.profile[key]);saveAndRefreshProfile();condition.classList.toggle('active',currentView.profile[key]);condition.setAttribute('aria-pressed',currentView.profile[key]?'true':'false');const mark=condition.querySelector('.combat-condition-mark');if(mark)mark.textContent=currentView.profile[key]?'✓':'○';}return;}
  const saveNotes=event.target.closest('[data-shared-notes-save]');
  if(saveNotes){const editor=$('#sharedNotesEditor');if(!editor)return;saveNotes.disabled=true;const data=await sharedRequest({action:'shared-notes-set',text:String(editor.value||'')});saveNotes.disabled=false;if(!data){showSharedNotesMessage('Не удалось сохранить заметки. Проверь соединение.');return;}currentView.notes=normalizeSharedNotes(data.notes||{});uiState.notesDirty=false;updateSharedNotesDom(currentView.notes);showSharedNotesMessage('Сохранено. Заметка уже доступна всей группе.');return;}
  const catalogToggle=event.target.closest('#catalogToggle');
  if(catalogToggle){uiState.catalogOpen=!uiState.catalogOpen;const panel=$('#equipmentCatalog');if(panel)panel.hidden=!uiState.catalogOpen;catalogToggle.textContent=uiState.catalogOpen?'Закрыть каталог':'+ Каталог SWADE';if(uiState.catalogOpen)renderCatalogResults();return;}
  const addCatalog=event.target.closest('[data-add-catalog]');
  if(addCatalog){
    const catalog=CATALOG_BY_ID.get(addCatalog.dataset.addCatalog);if(!catalog)return;
    const existing=currentView.inventory.find(x=>x.catalogId===String(catalog.id));
    if(existing)existing.quantity+=1;else currentView.inventory.push(normalizeInventoryItem({catalogId:catalog.id,name:catalog.name,quantity:1}));
    currentView.inventory=saveInventory(currentView.user,currentView.character,currentView.inventory);rerender();return;
  }
  const transferItemToggle=event.target.closest('[data-transfer-item-toggle]');
  if(transferItemToggle){const id=String(transferItemToggle.dataset.transferItemToggle||'');uiState.transferItemId=uiState.transferItemId===id?null:id;rerender();return;}
  const transferItemSubmit=event.target.closest('[data-transfer-item-submit]');
  if(transferItemSubmit){const id=String(transferItemSubmit.dataset.transferItemSubmit||''),recipient=[...document.querySelectorAll('[data-item-transfer-recipient]')].find(el=>el.dataset.itemTransferRecipient===id),amountInput=[...document.querySelectorAll('[data-item-transfer-amount]')].find(el=>el.dataset.itemTransferAmount===id),targetCharacterId=String(recipient?.value||''),amount=Math.max(0,Math.round(Number(amountInput?.value)||0));if(!targetCharacterId||amount<1){showInventoryMessage('Выбери персонажа и количество.');return;}transferItemSubmit.disabled=true;const data=await sharedRequest({action:'transfer-item',targetCharacterId,itemId:id,amount});transferItemSubmit.disabled=false;if(!data){showInventoryMessage('Не удалось передать предмет. Проверь соединение.');return;}if(data.applied===false){const messages={INSUFFICIENT_ITEMS:'Недостаточно предметов для передачи.',ITEM_NOT_FOUND:'Предмет не найден.',INVALID_RECIPIENT:'Нельзя передать предмет этому персонажу.',INVALID_AMOUNT:'Укажи количество больше нуля.'};showInventoryMessage(messages[data.reason]||'Не удалось передать предмет.');return;}adoptRemoteEnvelope('inventory',data.senderEnvelope);uiState.transferItemId=null;rerender();showInventoryMessage(`Передано: ${data.item?.quantity||amount} × ${data.item?.name||'предмет'} → ${data.recipient?.name||'персонаж'}.`);return;}
  const expand=event.target.closest('[data-expand-item]');
  if(expand){
    const id=String(expand.dataset.expandItem||'');
    const willOpen=uiState.expandedItemId!==id;
    // Close the previously opened equipment card directly in the DOM. On mobile
    // Telegram WebView a full re-render on this tiny disclosure button could
    // swallow the second tap, leaving the details visually open.
    const openedButton=content.querySelector('.equipment-expand[aria-expanded="true"]');
    if(openedButton&&openedButton!==expand){
      openedButton.setAttribute('aria-expanded','false');
      const openedRow=openedButton.closest('.smart-equipment-row');
      const openedDetails=openedRow?.querySelector('.smart-equipment-details');
      if(openedDetails)openedDetails.classList.remove('is-open');
    }
    uiState.expandedItemId=willOpen?id:null;
    expand.setAttribute('aria-expanded',willOpen?'true':'false');
    const row=expand.closest('.smart-equipment-row');
    const details=row?.querySelector('.smart-equipment-details');
    if(details)details.classList.toggle('is-open',willOpen);
    return;
  }
  const equip=event.target.closest('[data-toggle-equipped]');
  if(equip){const item=currentView.inventory.find(x=>x.id===equip.dataset.toggleEquipped);if(item)item.equipped=!item.equipped;currentView.inventory=saveInventory(currentView.user,currentView.character,currentView.inventory);rerender();return;}
  const qty=event.target.closest('[data-item-qty]');
  if(qty){const item=currentView.inventory.find(x=>x.id===qty.dataset.itemId);if(item){item.quantity=Math.max(0,item.quantity+(Number(qty.dataset.itemQty)||0));currentView.inventory=saveInventory(currentView.user,currentView.character,currentView.inventory);rerender();}return;}
  const remove=event.target.closest('[data-remove-item]');
  if(remove){currentView.inventory=currentView.inventory.filter(x=>x.id!==remove.dataset.removeItem);currentView.inventory=saveInventory(currentView.user,currentView.character,currentView.inventory);rerender();return;}
  const transferMoney=event.target.closest('[data-transfer-money-submit]');
  if(transferMoney){const targetCharacterId=String($('#moneyTransferRecipient')?.value||''),code=String($('#moneyTransferCurrency')?.value||''),amount=Math.max(0,Math.round(Number($('#moneyTransferAmount')?.value)||0));if(!targetCharacterId||!['eagles','sikels'].includes(code)||amount<1){showMoneyMessage('Выбери персонажа, валюту и сумму.');return;}transferMoney.disabled=true;const data=await sharedRequest({action:'transfer-money',targetCharacterId,currency:code,amount});transferMoney.disabled=false;if(!data){showMoneyMessage('Не удалось передать деньги. Проверь соединение.');return;}if(data.applied===false){const messages={INSUFFICIENT_FUNDS:`Недостаточно ${code==='eagles'?'Орлов':'Сикелей'} для передачи.`,INVALID_RECIPIENT:'Нельзя перевести деньги этому персонажу.',INVALID_AMOUNT:'Укажи сумму больше нуля.'};showMoneyMessage(messages[data.reason]||'Не удалось передать деньги.');return;}adoptRemoteEnvelope('money',data.senderEnvelope);updateMoneyDom(currentView.money);showMoneyMessage(`Передано ${formatNumber(amount)} ${currencyLabel(code,amount)} → ${data.recipient?.name||'персонаж'}.`);return;}
  const partyMoneyBtn=event.target.closest('[data-party-money-action]');
  if(partyMoneyBtn){
    const code=partyMoneyBtn.dataset.currency;if(!['eagles','sikels'].includes(code))return;
    const input=document.querySelector(`[data-party-money-input="${code}"]`),amount=Math.max(0,Math.round(Number(input?.value)||0)),operation=partyMoneyBtn.dataset.partyMoneyAction;
    partyMoneyBtn.disabled=true;
    const data=await sharedRequest({action:'party-money-change',currency:code,operation,amount});
    partyMoneyBtn.disabled=false;
    if(!data){showPartyMoneyMessage('Не удалось изменить общую казну. Проверь соединение.');return;}
    currentView.partyMoney={money:normalizePartyMoney(data.money||{}),available:true};updatePartyMoneyDom(currentView.partyMoney.money);
    if(data.applied===false&&data.reason==='INSUFFICIENT_FUNDS'){showPartyMoneyMessage(`В общей казне недостаточно валюты: сейчас ${formatNumber(currentView.partyMoney.money[code])}.`);return;}
    showPartyMoneyMessage(operation==='set'?'Общий баланс обновлён для всей группы.':operation==='add'?'Сумма добавлена в общую казну.':'Сумма вычтена из общей казны.');return;
  }
  const moneyBtn=event.target.closest('[data-money-action]');
  if(moneyBtn){
    const code=moneyBtn.dataset.currency;if(!['eagles','sikels'].includes(code))return;
    const input=document.querySelector(`[data-money-input="${code}"]`),amount=Math.max(0,Math.round(Number(input?.value)||0)),action=moneyBtn.dataset.moneyAction,next={...currentView.money};
    if(action==='add')next[code]+=amount;else if(action==='subtract'){if(amount>next[code]){showMoneyMessage(`Недостаточно валюты: сейчас ${formatNumber(next[code])}.`);return;}next[code]-=amount;}else if(action==='set')next[code]=amount;
    currentView.money=saveMoney(currentView.user,currentView.character,next);updateMoneyDom(currentView.money);showMoneyMessage(action==='set'?'Баланс обновлён.':action==='add'?'Сумма добавлена.':'Сумма вычтена.');return;
  }
}
function handleChange(event){
  if(!currentView)return;
  const t=event.target;
  if(t.matches('[data-power-max]')&&magicEnabled(currentView.character)){currentView.profile.powerPointsMax=clampInt(t.value,1,999);currentView.profile=saveProfile(currentView.user,currentView.character,currentView.profile);rerender();return;}
  if(t.id==='powerRankFilter'&&magicEnabled(currentView.character)){uiState.powerRankFilter=t.value;renderPowerCatalogResults();return;}
  if(t.matches('[data-hindrance-severity]')){const id=t.dataset.hindranceSeverity,item=currentView.profile.hindrances.find(h=>h.id===id),def=HINDRANCE_BY_ID.get(id);if(item&&def&&(def.severity||[]).includes(t.value)){item.severity=t.value;uiState.traitsFoldOpen=true;saveAndRefreshProfile();rerender()}return;}
  if(t.matches('[data-attribute]')){currentView.profile.attributes[t.dataset.attribute]=normalizeDie(t.value);saveAndRefreshProfile();return;}
  if(t.matches('[data-skill]')){currentView.profile.skills[t.dataset.skill]=normalizeDie(t.value);saveAndRefreshProfile();return;}
  if(t.matches('[data-profile-text]')){currentView.profile[t.dataset.profileText]=String(t.value||'');saveAndRefreshProfile();return;}
  if(t.matches('[data-profile-number]')){currentView.profile[t.dataset.profileNumber]=Number(t.value)||0;saveAndRefreshProfile();return;}
  if(t.id==='catalogCategory'){uiState.catalogCategory=t.value;renderCatalogResults();return;}
}
function handleInput(event){
  const t=event.target;
  if(t.id==='sharedNotesEditor'){uiState.notesDirty=true;const count=$('#sharedNotesCount');if(count)count.textContent=`${String(t.value||'').length}/12000`;return;}
  if(t.id==='powerSearch'&&currentView&&magicEnabled(currentView.character)){uiState.powerSearch=t.value;renderPowerCatalogResults();return;}
  if(t.id==='catalogSearch'){uiState.catalogSearch=t.value;renderCatalogResults();return;}
}
function bindEvents(){
  content.onclick=handleClick;content.onchange=handleChange;content.oninput=handleInput;
  content.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('[data-armor-zone]')){e.preventDefault();e.target.click();}};
  const manual=$('#manualItemForm');
  if(manual)manual.onsubmit=e=>{e.preventDefault();const fd=new FormData(manual),name=String(fd.get('name')||'').trim();if(!name)return;currentView.inventory.push(normalizeInventoryItem({name,quantity:Math.max(0,Math.round(Number(fd.get('quantity'))||0)),price:fd.get('price')===''?null:Number(fd.get('price')),weight:fd.get('weight')===''?null:Number(fd.get('weight'))}));currentView.inventory=saveInventory(currentView.user,currentView.character,currentView.inventory);rerender();};
  const amount=$('#exchangeAmount'),from=$('#exchangeFrom'),swap=$('#exchangeSwap');if(amount)amount.oninput=updateExchangeResult;if(from)from.onchange=updateExchangeResult;if(swap)swap.onclick=()=>{if(from){from.value=from.value==='sikels'?'eagles':'sikels';updateExchangeResult();}};updateExchangeResult();
  const skillsFold=$('#skillsFold');if(skillsFold)skillsFold.ontoggle=()=>{uiState.skillsFoldOpen=skillsFold.open};
  const traitsFold=$('#traitsFold');if(traitsFold)traitsFold.ontoggle=()=>{uiState.traitsFoldOpen=traitsFold.open};
  const magicFold=$('#magicFold');if(magicFold)magicFold.ontoggle=()=>{uiState.magicFoldOpen=magicFold.open};
  const notesFold=$('#sharedNotesFold');if(notesFold)notesFold.ontoggle=()=>{uiState.notesFoldOpen=notesFold.open};
  const armorMapFold=$('#armorBodyMapFold');if(armorMapFold)armorMapFold.ontoggle=()=>{uiState.armorMapOpen=armorMapFold.open};
  if(uiState.catalogOpen)renderCatalogResults();
  if(uiState.powerCatalogOpen)renderPowerCatalogResults();
}

function renderAdminChip(user){
  currentView=null;
  setAvatar(chipAvatar,user?.photo_url||'',user);
  chipAvatar.classList.remove('top-character-art-trigger');
  chipAvatar.removeAttribute('title');
  chipAvatar.removeAttribute('aria-label');
  chipName.textContent='Мастер';
  chipSub.textContent=user?.username?('@'+user.username+' · админ'):'Администратор';
  chip.classList.add('bound');
}
function gmUpdatedLabel(value){
  const n=Number(value)||0;if(!n)return 'Данные ещё не синхронизированы';
  try{return 'Обновлено '+new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(n))}catch(_e){return 'Данные синхронизированы'}
}
function gmItemHTML(raw){
  const inv=normalizeInventoryItem(raw),item=itemDetails(inv),pairs=statPairs(item);
  return `<details class="gm-item gm-item-full${inv.equipped?' equipped':''}"><summary><div class="gm-item-main"><strong>${esc(item.name)}</strong><span>${inv.equipped?'Надето':'В снаряжении'}</span></div><div class="gm-item-meta"><b>×${inv.quantity}</b>${item.category?`<span>${esc(item.category)}</span>`:''}${item.weight!=null?`<span>${formatNumber(item.weight)} кг</span>`:''}${item.price!=null?`<span>${formatPrice(item.price)}</span>`:''}</div></summary><div class="gm-item-all-stats">${pairs.length?pairs.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join(''):'<div class="gm-empty">Дополнительных параметров нет.</div>'}</div></details>`;
}
function gmPowerHTML(power){
  const cost=powerBaseCost(power),transformations=Array.isArray(power.transformations)?power.transformations:[];
  return `<details class="gm-power gm-power-full"><summary><div class="gm-power-main"><strong>${esc(power.name)}</strong><span>${esc(power.rank)}${cost!==null?` · ${formatNumber(cost)} ПС`:` · ${esc(powerPPLabel(power))}`}</span></div><div class="gm-power-meta"><span>Дистанция: ${esc(power.range||'—')}</span><span>Длительность: ${esc(power.duration||'—')}</span></div></summary><div class="gm-power-details"><p>${esc(power.description||'')}</p>${power.manifestations?`<p><b>Проявления:</b> ${esc(power.manifestations)}</p>`:''}${transformations.length?`<div class="gm-power-transformations"><b>Преобразования</b>${transformations.map(v=>`<span>${esc(v)}</span>`).join('')}</div>`:''}<small>Источник: SWADE, стр. ${esc(power.page||'—')}</small></div></details>`;
}
function gmMagicHTML(row,character){
  if(!magicEnabled(character))return '';
  const sheet=row?.sheet&&typeof row.sheet==='object'?normalizeProfile(row.sheet):defaultProfile();
  const selected=(sheet.powers||[]).map(id=>POWER_BY_ID.get(String(id))).filter(Boolean);
  return `<section class="gm-section gm-magic-section"><div class="gm-section-head"><div><span>Мистика</span><small>${selected.length} выбранных сил</small></div><strong>${sheet.powerPoints}<small> / ${sheet.powerPointsMax} ПС</small></strong></div><div class="gm-powers">${selected.length?selected.map(gmPowerHTML).join(''):'<div class="gm-empty">Заклинания не выбраны.</div>'}</div></section>`;
}
function gmPartyMoneyHTML(raw){
  const money=normalizePartyMoney(raw||{});
  return `<section class="gm-party-money"><div><span>Общая казна</span><small>единый баланс группы</small></div><div class="gm-party-money-values"><b>О ${formatNumber(money.eagles)}</b><b>С ${formatNumber(money.sikels)}</b></div></section>`;
}
function gmCombatStatusHTML(row){
  const sheet=row?.sheet&&typeof row.sheet==='object'?normalizeProfile(row.sheet):defaultProfile(),inventory=Array.isArray(row?.inventory)?row.inventory:[],derived=calculateDerived(sheet,inventory);
  const conditions=[];if(sheet.shaken)conditions.push('В шоке');if(sheet.distracted)conditions.push('Отвлечён');if(sheet.vulnerable)conditions.push('Уязвим');
  return `<section class="gm-combat-status"><div><span>Ранения</span><strong>${sheet.wounds}/${derived.maxWounds}</strong></div><div><span>Усталость</span><strong>${sheet.fatigue}/2</strong></div><div><span>Фишки</span><strong>${sheet.bennies}</strong></div><div class="gm-condition-cell"><span>Состояния</span><strong>${conditions.length?conditions.map(v=>`<em>${esc(v)}</em>`).join(''):'<small>Нет</small>'}</strong></div></section>`;
}
function gmSharedNotesHTML(raw){
  const notes=normalizeSharedNotes(raw||{}),text=notes.text.trim();
  return `<details class="gm-shared-notes"><summary><span>Общие заметки</span><small>${text?`${text.length} симв.`:'пока пусто'}</small></summary><div>${text?`<p>${esc(text).replace(/\n/g,'<br>')}</p><small>${esc(sharedNotesMeta(notes))}</small>`:'<div class="gm-empty">Игроки ещё не добавили общие заметки.</div>'}</div></details>`;
}
function gmSeverityLabel(value){return String(value)==='major'?'Крупный':'Малый'}
function gmDerivedHTML(profile,inventory,derived){
  const woundPenalty=Math.max(0,profile.wounds-(Number(derived?.effects?.woundIgnore)||0));
  const cells=[
    ['Защита',derived.parry],['Стойкость',derived.toughness],['Броня корпуса',`+${derived.armor}`],['Шаг',derived.pace],
    ['Макс. ранений',derived.maxWounds],['Старт. фишки',derived.startingBennies],['Штраф ранений',woundPenalty?`−${woundPenalty}`:'0'],['Естественная броня',`+${profile.naturalArmor}`],
    ['Вес',`${formatNumber(derived.totalWeight)} / ${formatNumber(derived.comfort)} кг`],['Сила для нагрузки',derived.effectiveLoadStrength],['Стоимость вещей',formatPrice(derived.totalValue)],['Надето',derived.equippedCount]
  ];
  return `<section class="gm-section"><div class="gm-section-title">Производные и боевые показатели</div><div class="gm-derived-grid">${cells.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div></section>`;
}
function gmAttributesHTML(profile,derived){
  return `<section class="gm-section"><div class="gm-section-title">Характеристики</div><div class="gm-attribute-grid">${ATTRS.map(([key,label])=>{const mod=Number(derived?.effects?.attributeChecks?.[key])||0;return `<div><span>${esc(label)}</span><strong>${esc(profile.attributes[key])}</strong>${mod?`<small>${signed(mod)} к проверкам</small>`:''}</div>`}).join('')}</div><div class="gm-base-settings"><span>Базовый шаг <b>${esc(profile.paceBase)}</b></span><span>Естественная броня <b>+${esc(profile.naturalArmor)}</b></span></div></section>`;
}
function gmSkillsHTML(profile,derived){
  const rows=Object.entries(profile.skills||{}).sort((a,b)=>a[0].localeCompare(b[0],'ru'));
  return `<section class="gm-section"><div class="gm-section-title">Навыки <small>${rows.length}</small></div><div class="gm-skill-list">${rows.length?rows.map(([name,die])=>{const manual=manualSkillModifier(profile,name),rules=Number(derived?.effects?.skill?.[name])||0,total=manual+rules;return `<div class="gm-skill-row"><div><strong>${esc(name)}</strong><small>${esc(skillAttrLabel(name,profile))}${BASIC_SKILLS.includes(name)?' · базовый':''}</small></div><b>${esc(die)}</b><span class="${total>0?'positive':total<0?'negative':''}">${signed(total)}</span><small>${manual?`свой ${signed(manual)}`:''}${manual&&rules?' · ':''}${rules?`правила ${signed(rules)}`:''}</small></div>`}).join(''):'<div class="gm-empty">Навыки не синхронизированы.</div>'}</div></section>`;
}
function gmTraitsHTML(profile){
  const edges=(profile.edges||[]).map(id=>EDGE_BY_ID.get(String(id))).filter(Boolean);
  const hindrances=(profile.hindrances||[]).map(sel=>({sel,def:HINDRANCE_BY_ID.get(String(sel.id))})).filter(x=>x.def);
  return `<section class="gm-section"><div class="gm-section-title">Черты и изъяны</div><div class="gm-traits-grid"><div><div class="gm-subtitle">Черты <small>${edges.length}</small></div>${edges.length?edges.map(def=>`<div class="gm-trait-card"><strong>${esc(def.name)}</strong><small>${esc([def.group,def.rank,def.req&&def.req!=='—'?`треб.: ${def.req}`:''].filter(Boolean).join(' · '))}</small><p>${esc(def.summary||'')}</p></div>`).join(''):'<div class="gm-empty">Нет выбранных черт.</div>'}</div><div><div class="gm-subtitle">Изъяны <small>${hindrances.length}</small></div>${hindrances.length?hindrances.map(({sel,def})=>`<div class="gm-trait-card hindrance"><strong>${esc(def.name)}</strong><small>${esc(gmSeverityLabel(sel.severity))}</small><p>${esc(def.summary||'')}</p></div>`).join(''):'<div class="gm-empty">Нет выбранных изъянов.</div>'}</div></div></section>`;
}
function gmArmorZonesHTML(derived){
  const parts=BODY_ARMOR_PARTS.map(([id,label])=>({id,label,...(derived?.bodyArmor?.[id]||{})}));
  return `<section class="gm-section"><div class="gm-section-title">Защита по частям тела</div><div class="gm-armor-zone-grid">${parts.map(part=>`<div><div><span>${esc(part.label)}</span><strong>${Number(part.value)>0?`+${esc(part.value)}`:'—'}</strong></div><small>${Array.isArray(part.sources)&&part.sources.length?esc(part.sources.join(' · ')):'Без защиты'}</small></div>`).join('')}</div></section>`;
}
function gmInventoryHTML(inventory,derived){
  const totalQty=inventory.reduce((sum,item)=>sum+Math.max(0,Number(item?.quantity)||0),0),equipped=inventory.filter(item=>item?.equipped&&Number(item?.quantity)>0).length;
  return `<section class="gm-section"><div class="gm-section-title">Снаряжение <small>${inventory.length} поз. · ${totalQty} шт. · надето ${equipped}</small></div><div class="gm-inventory-summary"><span>Общий вес <b>${formatNumber(derived.totalWeight)} кг</b></span><span>Комфортная нагрузка <b>${formatNumber(derived.comfort)} кг</b></span><span>Общая стоимость <b>${formatPrice(derived.totalValue)}</b></span></div><div class="gm-items">${inventory.length?inventory.map(gmItemHTML).join(''):'<div class="gm-empty">Снаряжение пока не синхронизировано.</div>'}</div></section>`;
}
function gmFullCharacterHTML(row,character){
  const hasSheet=Boolean(row?.sheet&&typeof row.sheet==='object');
  const profile=hasSheet?normalizeProfile(row.sheet):defaultProfile();
  const inventory=(Array.isArray(row?.inventory)?row.inventory:[]).map(normalizeInventoryItem).filter(item=>item.name);
  const derived=calculateDerived(profile,inventory);
  const money=normalizeMoney(row?.money||{});
  const conditions=[profile.shaken?'В шоке':'',profile.distracted?'Отвлечён':'',profile.vulnerable?'Уязвим':''].filter(Boolean);
  return `<details class="gm-full-sheet"><summary><div><strong>Полный лист персонажа</strong><small>${hasSheet?'Все синхронизированные данные':'Лист ещё не синхронизирован'}</small></div><b>›</b></summary><div class="gm-full-sheet-body">
    ${!hasSheet?'<div class="gm-sync-warning">Персонаж ещё не синхронизировал лист с общей базой. Ниже могут отображаться только базовые значения.</div>':''}
    <section class="gm-section gm-main-info"><div class="gm-section-title">Основная информация</div><div class="gm-info-grid"><div><span>Имя</span><strong>${esc(character.name||'—')}</strong></div><div><span>Игрок</span><strong>${esc(row?.telegramUsername?'@'+row.telegramUsername:'—')}</strong></div><div><span>Роль</span><strong>${esc(character.title||'Персонаж игрока')}</strong></div><div><span>Ранг</span><strong>${esc(profile.rank||'—')}</strong></div><div><span>Народ / вид</span><strong>${esc(profile.ancestry||'—')}</strong></div><div><span>Статус</span><strong>${conditions.length?esc(conditions.join(', ')):'Без состояний'}</strong></div><div><span>Синхронизация</span><strong>${esc(gmUpdatedLabel(row?.updatedAt))}</strong></div></div></section>
    ${gmDerivedHTML(profile,inventory,derived)}
    ${gmAttributesHTML(profile,derived)}
    ${gmSkillsHTML(profile,derived)}
    ${gmTraitsHTML(profile)}
    ${gmArmorZonesHTML(derived)}
    <section class="gm-section"><div class="gm-section-title">Личные деньги</div><div class="gm-money-strip gm-money-strip-full"><div><span>Орлы</span><strong>${formatNumber(money.eagles)}</strong></div><div><span>Сикели</span><strong>${formatNumber(money.sikels)}</strong></div></div></section>
    ${gmMagicHTML(row,character)}
    ${gmInventoryHTML(inventory,derived)}
  </div></details>`;
}
function gmPlayerCard(row,index){
  const character=row?.character||{},inventory=Array.isArray(row?.inventory)?row.inventory:[],money=normalizeMoney(row?.money||{});
  return `<article class="gm-player-card"><div class="gm-player-head"><button type="button" class="gm-player-avatar character-art-trigger" id="gmAvatar${index}" data-gm-character-art="${index}" aria-label="Открыть полное изображение персонажа ${esc(character.name||'Персонаж')}" title="Открыть полное изображение"></button><div><div class="eyebrow">${esc(row?.telegramUsername?'@'+row.telegramUsername:'ИГРОК')}</div><h3>${esc(character.name||'Персонаж')}</h3><small>${esc(gmUpdatedLabel(row?.updatedAt))}</small></div></div>${gmCombatStatusHTML(row)}<div class="gm-money-strip"><div><span>Орлы</span><strong>${formatNumber(money.eagles)}</strong></div><div><span>Сикели</span><strong>${formatNumber(money.sikels)}</strong></div></div>${gmFullCharacterHTML(row,character)}</article>`;
}
async function migrateLegacyVelizariyForAdmin(){
  if(!cloudAvailable()||!sharedAvailable())return;
  const legacyCharacter={id:'velizariy'};
  for(const kind of ['sheet','inventory','money']){
    try{
      const raw=await cloudReadLarge(cloudBaseKey(kind,legacyCharacter)),parsed=parseEnvelope(raw);
      if(parsed?.envelope)await sharedRequest({action:'admin-seed',characterId:'velizariy',kind,envelope:parsed.envelope});
    }catch(error){console.warn('Legacy Velizariy migration skipped',error)}
  }
}
async function renderAdmin(user){
  renderAdminChip(user);
  content.innerHTML='<div class="character-notice"><strong>Открываю панель Мастера…</strong><p>Загружаю полные листы персонажей, деньги, снаряжение и состояния.</p></div>';
  await migrateLegacyVelizariyForAdmin();
  const data=await sharedRequest({action:'admin-list'});
  if(!data){
    const storageMissing=sharedStorageState==='missing';
    content.innerHTML=`<section class="gm-panel"><div class="gm-hero"><div><div class="eyebrow">ПАНЕЛЬ МАСТЕРА</div><h2>Мастер</h2><p>${esc(user?.username?'@'+user.username:'Администратор')}</p></div></div><div class="character-notice gm-warning"><strong>${storageMissing?'Нужно подключить общее хранилище':'Не удалось загрузить данные игроков'}</strong><p>${storageMissing?'Для просмотра полных листов персонажей подключи Upstash Redis в Vercel. После этого данные начнут зеркалироваться автоматически.':'Попробуй обновить панель чуть позже.'}</p><button type="button" class="gm-refresh" id="gmRefresh">Обновить</button></div></section>`;
    content.onclick=e=>{if(e.target.closest('#gmRefresh'))renderAdmin(user)};
    return;
  }
  const rows=Array.isArray(data.players)?data.players:[];
  content.innerHTML=`<section class="gm-panel"><div class="gm-hero"><div><div class="eyebrow">ПАНЕЛЬ МАСТЕРА</div><h2>Мастер</h2><p>${esc(user?.username?'@'+user.username:'Администратор')} · просмотр без редактирования</p></div><button type="button" class="gm-refresh" id="gmRefresh">Обновить</button></div>${gmPartyMoneyHTML(data.partyMoney)}${gmSharedNotesHTML(data.notes)}<div class="gm-overview"><strong>${rows.length}</strong><span>персонажей доступно для просмотра</span></div><div class="gm-player-grid">${rows.map(gmPlayerCard).join('')}</div></section>`;
  rows.forEach((row,index)=>setAvatar($(`#gmAvatar${index}`),row?.character?.avatar||'',user));
  content.onclick=e=>{
    const art=e.target.closest('[data-gm-character-art]');
    if(art){const row=rows[Number(art.dataset.gmCharacterArt)];if(row?.character)openCharacterArt(row.character,art);return;}
    if(e.target.closest('#gmRefresh'))renderAdmin(user);
  };
}

function renderUnbound(user,message){
  currentView=null;renderChip(user,null);const handle=user?.username?'@'+user.username:'username отсутствует';
  content.innerHTML=`<div class="character-head unbound"><div class="character-avatar" id="characterAvatar"></div><div class="character-identity"><div class="eyebrow">TELEGRAM</div><h2>${esc(telegramDisplayName(user))}</h2><p>${esc(handle)}</p></div></div><div class="character-notice"><strong>Персонаж пока не привязан</strong><p>${esc(message||'Добавь этот Telegram-ник в список игроков — после этого здесь автоматически появится лист персонажа.')}</p>${user?.username?`<code>@${esc(user.username)}</code>`:''}</div>`;
  setAvatar($('#characterAvatar'),user?.photo_url||'',user);
}
function renderOutsideTelegram(){currentView=null;renderChip(null,null);content.innerHTML='<div class="character-notice"><strong>Открой приложение через Telegram</strong><p>Тогда Norvayne сможет определить пользователя и открыть его личный лист персонажа.</p></div>'}
chip?.addEventListener('click',()=>characterTabButton?.click());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&currentView)refreshPartyMoney()});
window.addEventListener('focus',()=>{if(currentView)refreshPartyMoney()});

async function init(){
  const tg=window.Telegram&&window.Telegram.WebApp;try{tg?.ready();tg?.expand()}catch(_e){}
  const unsafeUser=tg?.initDataUnsafe?.user||null;if(unsafeUser)renderChip(unsafeUser,null);
  if(!tg?.initData){renderOutsideTelegram();return;}
  try{
    const response=await fetch('/api/player',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:tg.initData})});
    const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Не удалось определить пользователя');
    if(data.role==='admin')await renderAdmin(data.telegram);else if(data.bound&&data.character)await renderCharacter(data.telegram,data.character);else renderUnbound(data.telegram);
  }catch(error){renderUnbound(unsafeUser||{},'Не удалось подтвердить пользователя Telegram. '+error.message);}
}
init();
})();
