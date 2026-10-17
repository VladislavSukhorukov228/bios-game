'use strict';
const objectLayer=document.createElement('div');objectLayer.id='objectLayer';objectLayer.setAttribute('aria-label','Предметы для осмотра');$('world').append(objectLayer);
let objectButtons=[],objectRoom=-1;
function discoveryKey(){return [state.day,state.stage,state.chapterStep||0,!!state.flour,!!state.dayDone].join(':');}
function discoveries(){if(!Array.isArray(state.discoveries))state.discoveries=[];return state.discoveries;}
function discovered(){return discoveries().includes(discoveryKey());}
const objectSymbols={bed:'☾',bed1:'☾',bed2:'☾',table:'☕',books:'▤',pantry:'▣',lab:'◉',panel:'ϟ',wheat:'♧',vegetables:'♧',bathroom:'≈',water:'≈'};
function buildObjectButtons(){objectLayer.replaceChildren();objectButtons=[];for(const [key,p] of localSpots()){const b=document.createElement('button');b.className='object-button';b.setAttribute('aria-label','Осмотреть: '+p.label);const icon=document.createElement('span');icon.textContent=objectSymbols[key]||'○';const label=document.createElement('span');label.className='object-label';label.textContent=p.label;b.append(icon,label);b.onclick=e=>{e.stopPropagation();go(key);};objectLayer.append(b);objectButtons.push({key,p,b});}objectRoom=state.room;}
function positionObjectButtons(){if(objectRoom!==state.room)buildObjectButtons();objectLayer.hidden=!started||modalPause;for(const {p,b} of objectButtons){const x=p.x*scale-camera,y=(p.y-65)*scale-cameraY;b.style.left=x+'px';b.style.top=y+'px';const near=Math.hypot(p.x-state.x,p.y-state.y)<170;b.classList.toggle('near',near);b.hidden=x<0||x>vw||y<0||y>vh;b.disabled=paused;}}
const renderPlacesBeforeExplore=renderPlaces;renderPlaces=function(){renderPlacesBeforeExplore();$('places').replaceChildren();const hint=document.createElement('span');hint.textContent='Осматривай предметы в комнате · подходи к экипажу · открывай двери в другие отсеки';$('places').append(hint);buildObjectButtons();};
const interactBeforeExplore=interact;interact=function(key){if(!spots[key])return;if(state.room!==spots[key].room||Math.hypot(state.x-spots[key].x,state.y-spots[key].y)>125){go(key);return;}if(key===taskSpot()&&!discovered()){discoveries().push(discoveryKey());toast('Ты нашёл дело для экипажа.');}interactBeforeExplore(key);update();save();};
const searchHints={
 1:['Знакомство начинается там, где экипаж собирается вместе.','У водорослей сегодня не хватает света. Начни с наблюдения.','Проблема со светом связана с оборудованием рядом с водорослями.','Для хлеба сначала нужно зерно, а для выпечки — кухня.','Пора собраться там, где вы едите вместе.'],
 2:['Ищи капли рядом с водорослями.','Собранная вода должна пройти обработку.','Проверь место, где экипаж моется.','Обсудите результаты там, где собираетесь вместе.'],
 3:['Посмотри записи рядом с пшеницей.','Теперь загляни к овощным грядкам.','Посчитай, что уже хранится в доме.','Урожай пора превратить в еду.'],
 4:['Новую подсказку передали снаружи вместе с книгами.','Где задаётся режим света?','После настройки вернись проверить водоросли.','Приборам отдых не нужен, а экипажу нужен.'],
 5:['Начни самостоятельную проверку с водорослей.','Теперь проверь, как возвращается вода.','Не забудь о будущих посадках.','Пора собрать результаты за общим столом.']
};
let hintKey='',hintLevel=0;
function searchHint(){const k=discoveryKey();if(hintKey!==k){hintKey=k;hintLevel=0;}const spot=spots[taskSpot()];const text=state.dayDone?'После завершения дел отдохни в собственной каюте.':searchHints[state.day]?.[state.day===1?Math.min(state.stage,4):state.chapterStep]||'Осмотрись и поговори с напарниками.';hintLevel=Math.min(2,hintLevel+1);show('Подсказка исследователю','<p>'+text+'</p>'+(hintLevel===2&&spot?'<p><b>'+spot.label+'</b> · '+rooms[spot.room].name+'. Нажми на предмет в комнате.</p>':''),[{text:'Поищу сам',primary:true,fn:close},...(hintLevel===1?[{text:'Где именно искать?',fn:searchHint}]:[])]);}
$('questGo').textContent='Нужна подсказка?';$('questGo').onclick=searchHint;
const updateBeforeExplore=update;update=function(){updateBeforeExplore();if(!started)return;if(state.chapterComplete)return;if(!state.dayDone&&!discovered()){$('questTitle').textContent=state.day===1?'Осмотрись и помоги экипажу':chapters[state.day].title;$('questText').textContent='Ищи дело в самом комплексе: осматривай предметы и разговаривай с напарниками. Подсказка — если застрянешь.';}else if(!state.dayDone){$('questText').textContent=state.day===1?quests[state.stage][1]:currentTask()?.body||'Исследуй комплекс.';} }; 
// Original synthesized audio. Start immediately where allowed; otherwise unlock on a gesture.
const audioDefaults={music:.25,effects:.5};let soundSettings={...audioDefaults};try{const v=JSON.parse(localStorage.getItem('bios-sound-v1'));for(const k of ['music','effects'])if(Number.isFinite(v?.[k]))soundSettings[k]=clamp(v[k],0,1);}catch{}
const sound={ctx:null,musicBus:null,effectsBus:null,enabled:false,wanted:true,beat:0,next:0,lastStep:0,x:null,y:null,room:null};
function soundAvailable(){return sound.enabled&&sound.ctx?.state==='running'&&!document.hidden&&!paused;}
function tone(freq,when,length,volume,bus,type='sine'){const c=sound.ctx;if(!c||!bus)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,when);g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(volume,when+.02);g.gain.exponentialRampToValueAtTime(.0001,when+length);o.connect(g);g.connect(bus);o.start(when);o.stop(when+length+.03);o.onended=()=>{o.disconnect();g.disconnect();};}
function soundEffect(kind){if(!soundAvailable())return;const t=sound.ctx.currentTime;if(kind==='step'){tone(105+Math.random()*18,t,.07,.12,sound.effectsBus,'triangle');}else if(kind==='success'){tone(392,t,.45,.12,sound.effectsBus);tone(523.25,t+.12,.6,.09,sound.effectsBus);}else if(kind==='door'){tone(150,t,.24,.08,sound.effectsBus,'triangle');}else{tone(620,t,.08,.035,sound.effectsBus);}}
async function enableSound({quiet=false}={}){
 sound.wanted=true;
 try{
  const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor)throw new Error('unsupported');
  if(!sound.ctx){sound.ctx=new AudioCtor();sound.musicBus=sound.ctx.createGain();sound.effectsBus=sound.ctx.createGain();sound.musicBus.connect(sound.ctx.destination);sound.effectsBus.connect(sound.ctx.destination);}
  await sound.ctx.resume();
  if(!sound.wanted){updateSoundGains();return false;}
  sound.enabled=sound.ctx.state==='running';if(!sound.enabled)throw new Error('blocked');
  sound.next=sound.ctx.currentTime+.1;updateSoundGains();$('soundButton').textContent='Звук: вкл';return true;
 }catch{
  if(!sound.wanted)return false;
  sound.enabled=false;updateSoundGains();
  if(!quiet)toast('Звук пока недоступен. Попробуй открыть игру в браузере и включить его снова.');
  return false;
 }
}
function updateSoundGains(){if(!sound.ctx)return;const muted=!sound.enabled||document.hidden||paused;const t=sound.ctx.currentTime;sound.musicBus.gain.setTargetAtTime(muted?0:soundSettings.music*(nightState.active ? .35 : 1),t,.15);sound.effectsBus.gain.setTargetAtTime(muted?0:soundSettings.effects,t,.03);}
function disableSound(){sound.wanted=false;sound.enabled=false;updateSoundGains();$('soundButton').textContent='Звук';}
function saveSoundSettings(){try{localStorage.setItem('bios-sound-v1',JSON.stringify(soundSettings));}catch{}updateSoundGains();}
function openSoundPanel(){show('Звуки маленького мира','<p>Тихая инструментальная мелодия, шаги и отклики действий. В диалогах можно отдельно включить чтение реплик вслух.</p>',[{text:sound.enabled?'Выключить звук':'Включить звук',primary:true,fn:async()=>{if(sound.enabled)disableSound();else await enableSound();openSoundPanel();}},{text:'Вернуться',fn:close}]);const controls=document.createElement('div');controls.className='sound-sliders';for(const [key,title]of [['music','Музыка'],['effects','Шаги и действия']]){const label=document.createElement('label');const text=document.createElement('span');text.textContent=title;const input=document.createElement('input');input.type='range';input.min='0';input.max='100';input.value=Math.round(soundSettings[key]*100);input.setAttribute('aria-label',title);const output=document.createElement('output');output.textContent=input.value+'%';input.oninput=()=>{soundSettings[key]=Number(input.value)/100;output.textContent=input.value+'%';saveSoundSettings();};label.append(text,input,output);controls.append(label);}$('modalBody').append(controls);}
const soundButton=document.createElement('button');soundButton.id='soundButton';soundButton.textContent='Звук';soundButton.onclick=openSoundPanel;document.querySelector('header').insertBefore(soundButton,$('journal'));
function updateSound(){if(!sound.ctx)return;updateSoundGains();if(!soundAvailable()){sound.next=sound.ctx.currentTime+.1;return;}const t=sound.ctx.currentTime;if(t>=sound.next){const melody=[261.63,329.63,392,329.63,293.66,349.23,440,349.23,246.94,293.66,392,293.66,261.63,329.63,392,523.25];const note=melody[sound.beat%melody.length];tone(note,t+.02,1.8,.06,sound.musicBus);if(sound.beat%4===0)tone(note/2,t+.02,3,.045,sound.musicBus);sound.beat++;sound.next=t+1.15;}
const d=sound.room===state.room&&sound.x!==null?Math.hypot(state.x-sound.x,state.y-sound.y):0;if(started&&!modalPause&&d>.1&&d<40&&t-sound.lastStep>.3){soundEffect('step');sound.lastStep=t;}sound.x=state.x;sound.y=state.y;sound.room=state.room;}
document.addEventListener('visibilitychange',updateSoundGains);
function unlockGameAudio(){if(sound.wanted&&(!sound.enabled||sound.ctx?.state!=='running'))void enableSound({quiet:true});}
for(const event of ['pointerdown','touchend','click','keydown'])document.addEventListener(event,unlockGameAudio,{capture:true,passive:true});
// A suspended resume promise must not prevent a later gesture from retrying.
void enableSound({quiet:true});
document.addEventListener('click',e=>{if(e.target.closest?.('#modal button,#comic button'))soundEffect('tap');});
const successBeforeSound=flashSuccess;flashSuccess=function(){successBeforeSound();soundEffect('success');};
// A brief, skippable night shows the crew asleep and advances exactly one day.
const night=document.createElement('dialog');night.id='night';night.setAttribute('aria-labelledby','nightTitle');night.innerHTML='<div class="night-picture"><img src="assets/night-v12.png" alt="Ночной жилой отсек: Сергей, Андрей и Анастасия спят в своих кроватях"><span class="sleep-mark sleep-one" aria-hidden="true">z z</span><span class="sleep-mark sleep-two" aria-hidden="true">z z</span><span class="sleep-mark sleep-three" aria-hidden="true">z z</span></div><div class="night-copy"><small>БИОС · ТИХИЕ ЧАСЫ</small><h2 id="nightTitle">В доме гаснет свет</h2><p id="nightClock">22:00</p><p id="nightNote">Экипаж отдыхает. Завтра — новый день.</p><button id="skipNight">Проснуться</button></div>';document.body.append(night);
const nightState={active:false,elapsed:0,fromDay:0};const nextDayBeforeNight=nextDay;
nextDay=function(){if(nightState.active||!state.dayDone||state.chapterComplete)return;close();stopStick();keys.clear();target=null;route=[];pending=null;nightState.active=true;nightState.elapsed=0;nightState.fromDay=state.day;modalPause=true;$('nightTitle').textContent='В доме гаснет свет';$('nightClock').textContent='22:00';night.className=reducedMotion?'night-still':'night-enter';night.showModal();$('skipNight').focus();updateSoundGains();};
function finishNight(){if(!nightState.active)return;nightState.active=false;night.close();modalPause=false;if(state.day===nightState.fromDay){state.room=3;Object.assign(state,nearestFloor(3,spots[['bed','bed1','bed2'][state.role]].x,spots[['bed','bed1','bed2'][state.role]].y));npcs.forEach(n=>{n.room=3;Object.assign(n,nearestFloor(3,spots[['bed','bed1','bed2'][n.i]].x,spots[['bed','bed1','bed2'][n.i]].y));n.route=[];n.t=0;n.pause=4;});renderPlaces();centerHero();nextDayBeforeNight();}updateSoundGains();}
$('skipNight').onclick=finishNight;night.addEventListener('cancel',e=>{e.preventDefault();finishNight();});
function updateNight(dt){if(!nightState.active||document.hidden)return;nightState.elapsed+=dt;const p=Math.min(1,nightState.elapsed/(reducedMotion?2:7));const minutes=(22*60+Math.floor(8*60*p))%(24*60);$('nightClock').textContent=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');$('nightTitle').textContent=p<.2?'В доме гаснет свет':p<.8?'Все спят':'Доброе утро';night.style.setProperty('--night-light',p>.8?(p-.8)*.8:0);if(p>=1)finishNight();}
let lastDrawRoom=state.room;const drawBeforeExplore=draw;draw=function(t,dt){drawBeforeExplore(t,dt);positionObjectButtons();if(started&&state.room!==lastDrawRoom){lastDrawRoom=state.room;$('world').classList.remove('room-enter');void $('world').offsetWidth;$('world').classList.add('room-enter');soundEffect('door');}updateNight(dt);updateSound();};
