// Cached head poses, independent blink clocks, and optional device speech.
let headAtlas=null,faceSprites=null,lifeClock=0,comicPaintTime=-1;
const comicCanvases=[],faceUrls=[],portraitPose=[-1,-1,-1];
loadImage('assets/blink-heads-v9.png').then(img=>{headAtlas=img;}).catch(()=>{});
function prepareFaces(){
 if(faceSprites||!headAtlas||sprites.length!==3)return;
 const crop=[[74,53,351,437],[558,32,377,456],[1020,43,492,451]];
 const target=[[42,15,48,61,69],[46,15,58,69,76],[56,18,76,75,85]];
 faceSprites=sprites.map((base,i)=>[0,1].map(closed=>{
  const out=document.createElement('canvas');out.width=base.width;out.height=base.height;
  const c=out.getContext('2d'),[sx,sy,sw,sh]=crop[i],[x,y,w,h,cut]=target[i];
  c.drawImage(headAtlas,sx,sy+(closed?508:0),sw,sh,x,y,w,h);
  c.drawImage(base,0,cut,base.width,base.height-cut,0,cut,base.width,base.height-cut);
  return out;
 }));
 people.forEach((p,i)=>{sprites[i]=faceSprites[i][0];faceUrls[i]=faceSprites[i].map(s=>s.toDataURL());});updatePortraitFaces();
}
function eyesClosed(i,t){const period=4.3+i*.61,clock=t+i*1.73,phase=clock%period;return !reducedMotion&&(phase<.18||(Math.floor(clock/period)%3===2&&phase>.30&&phase<.43));}
function updatePortraitFaces(){if(!faceSprites)return;people.forEach((p,i)=>{const pose=eyesClosed(i,lifeClock)?1:0;if(portraitPose[i]===pose)return;portraitPose[i]=pose;document.documentElement.style.setProperty('--sprite-'+p.css,'url("'+faceUrls[i][pose]+'")');});}
function faceFor(i,t){return faceSprites?.[i][eyesClosed(i,t)?1:0]||sprites[i];}
const characterBeforeFaces=character;
character=function(i,x,y,moving,flip,t){const original=sprites[i];if(!original)return;sprites[i]=faceFor(i,lifeClock);try{characterBeforeFaces(i,x,y,moving,flip,t);}finally{sprites[i]=original;}};
const bodyBeforeGestures=drawWalkingBody;
drawWalkingBody=function(img,i,w,h,phase,amount=0,idle=0,paint=ctx,expression){
 const gesture=expression??(!reducedMotion&&!paused&&!modalPause&&((lifeClock+i*2.1)%11)<2.5?.65:0);
 bodyBeforeGestures(img,i,w,h,phase,amount,reducedMotion?0:idle,paint,gesture*(1-amount));
};
function buildComicActors(){
 comicCanvases.length=0;
 const actors=$('comicCast').children;
 for(let i=0;i<3;i++){
  const c=document.createElement('canvas');c.width=180;c.height=340;c.setAttribute?.('aria-hidden','true');
  actors[i].append(c);comicCanvases.push(c);
 }
 comicPaintTime=-1;
}
function paintComicActors(){
 if(!comic.open||!sceneSession||!sprites.length||lifeClock-comicPaintTime<1/30)return;
 comicPaintTime=lifeClock;
 const frame=storyScenes[sceneSession.id].frames[sceneSession.index],who=frame.who==='player'?state.role:frame.who;
 comicCanvases.forEach((c,i)=>{const img=faceFor(i,lifeClock);if(!img)return;const p=c.getContext('2d');
  c.parentElement?.classList.add('actor-painted');p.clearRect(0,0,c.width,c.height);p.save();p.translate(90,332);
  const h=310,w=h*img.width/img.height;
  drawWalkingBody(img,i,w,h,0,0,lifeClock+i*2.7,p,reducedMotion?0:i===who?1:.12);p.restore();
 });
}
const drawBeforeLife=draw;
draw=function(t,dt){if(!document.hidden&&!paused)lifeClock+=Math.min(.05,Math.max(0,dt||0));prepareFaces();updatePortraitFaces();drawBeforeLife(t,dt);paintComicActors();};

const speechDevice=window.speechSynthesis;
let voiceEnabled=false,voiceSerial=0,voiceSpeaking=false;
const voiceBar=document.createElement('div');voiceBar.className='voice-controls';
const voiceToggle=document.createElement('button'),voiceRepeat=document.createElement('button'),voiceStatus=document.createElement('span');
voiceToggle.id='voiceToggle';voiceRepeat.id='voiceRepeat';voiceRepeat.textContent='Повторить';voiceStatus.setAttribute('role','status');
voiceBar.append(voiceToggle,voiceRepeat,voiceStatus);(comic.querySelector('.comic-speech')||comic).append(voiceBar);
const roleSpeech=[{pitch:.93,rate:.92},{pitch:.76,rate:1.01},{pitch:1.17,rate:.96}];
let chosenVoices={};try{chosenVoices=JSON.parse(localStorage.getItem('bios-voices-v1'))||{};}catch{}
function russianVoices(){return (speechDevice?.getVoices()||[]).filter(v=>/^ru(?:-|_|$)/i.test(v.lang)).sort((a,b)=>(a.voiceURI||a.name||'').localeCompare(b.voiceURI||b.name||''));}
function russianVoice(role=0){const voices=russianVoices();return voices.find(v=>v.voiceURI===chosenVoices[role])||voices[role%voices.length];}
function speakingRole(){const f=sceneSession&&storyScenes[sceneSession.id].frames[sceneSession.index];return f?.who==='player'?state.role:Number.isInteger(f?.who)?f.who:null;}
const voiceOptions=document.createElement('details'),voiceSummary=document.createElement('summary'),voiceSelects=[];
voiceOptions.className='voice-options';voiceSummary.textContent='Голоса персонажей';voiceOptions.append(voiceSummary);voiceBar.append(voiceOptions);
for(let i=0;i<3;i++){const label=document.createElement('label'),title=document.createElement('span'),select=document.createElement('select');title.textContent=people[i].name;select.setAttribute('aria-label','Голос: '+people[i].name);select.onchange=()=>{chosenVoices[i]=select.value;try{localStorage.setItem('bios-voices-v1',JSON.stringify(chosenVoices));}catch{}stopVoice();updateVoiceControls();};label.append(title,select);voiceOptions.append(label);voiceSelects.push(select);}
function refreshVoiceOptions(){const voices=russianVoices();voiceSelects.forEach((select,i)=>{select.replaceChildren();for(const [value,label] of [['','Автоматически'],...voices.map(v=>[v.voiceURI,v.name])]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}select.value=voices.some(v=>v.voiceURI===chosenVoices[i])?chosenVoices[i]:'';select.disabled=!voices.length;});}
refreshVoiceOptions();
function updateVoiceControls(message){
 const supported=!!speechDevice&&typeof window.SpeechSynthesisUtterance==='function',available=supported&&!!russianVoice();
 voiceToggle.disabled=!supported;voiceToggle.textContent=voiceEnabled?'Озвучка: вкл':'Озвучка: выкл';voiceToggle.setAttribute('aria-pressed',String(voiceEnabled));
 voiceRepeat.disabled=!voiceEnabled||!available||!sceneSession;
 voiceStatus.textContent=message||(!supported?'Чтение вслух недоступно в этом браузере':!available?'Русский голос пока недоступен на устройстве':voiceEnabled?(russianVoices().length<3?'Голоса различаются высотой и темпом · синтез речи':'Отдельные голоса героев · синтез речи'):'Нажми, чтобы слушать реплики');
}
function stopVoice(){voiceSerial++;speechDevice?.cancel();voiceSpeaking=false;}
function readComicLine(){
 stopVoice();if(!voiceEnabled||!sceneSession||!comic.open||document.hidden)return;
 const role=speakingRole(),profile=roleSpeech[role]||{pitch:1,rate:.94},voice=russianVoice(role??0);if(!voice||typeof window.SpeechSynthesisUtterance!=='function'){updateVoiceControls();return;}
 const serial=voiceSerial,utterance=new window.SpeechSynthesisUtterance(typedText);
 utterance.voice=voice;utterance.lang='ru-RU';utterance.rate=profile.rate;utterance.pitch=profile.pitch;utterance.volume=.85;
 utterance.onstart=()=>{if(serial===voiceSerial){voiceSpeaking=true;updateVoiceControls('Читаю реплику…');}};
 utterance.onend=()=>{if(serial===voiceSerial){voiceSpeaking=false;updateVoiceControls();}};
 utterance.onerror=()=>{if(serial===voiceSerial){voiceSpeaking=false;updateVoiceControls('Не удалось прочитать. Можно повторить или читать текст.');}};
 try{speechDevice.speak(utterance);}catch{updateVoiceControls('Не удалось включить голос. Текст доступен.');}
}
voiceToggle.onclick=()=>{voiceEnabled=!voiceEnabled;updateVoiceControls();if(voiceEnabled)readComicLine();else stopVoice();};
voiceRepeat.onclick=readComicLine;
speechDevice?.addEventListener?.('voiceschanged',()=>{refreshVoiceOptions();updateVoiceControls();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopVoice();});
const renderBeforeLife=renderComicFrame;
renderComicFrame=function(){stopVoice();renderBeforeLife();buildComicActors();paintComicActors();updateVoiceControls();readComicLine();};
const suspendBeforeVoice=suspendComic,finishBeforeVoice=finishComic;
suspendComic=function(){stopVoice();suspendBeforeVoice();};
finishComic=function(){stopVoice();finishBeforeVoice();};
$('comicLater').onclick=suspendComic;
comic.addEventListener('close',stopVoice);
updateVoiceControls();

