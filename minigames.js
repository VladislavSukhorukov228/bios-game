'use strict';
// The console is a fictional teaching instrument, with no real electrical values.
let consoleSession=null;
function consoleReading(s){return s.power&&s.module?s.level:0;}
function consoleReady(s){return s.power&&s.module&&Math.abs(consoleReading(s)-s.target)<=2;}
function openLightConsole(practice=false){
 consoleSession={power:true,module:false,level:20,target:[40,60,80][Math.floor(Math.random()*3)],practice,done:false};
 show(practice?'Проверка на учебном стенде':'Щит освещения · культиватор','',[]);
 $('modal').classList.add('instrument-modal');
 $('modalBody').innerHTML=`<section class="soviet-console" aria-label="Пульт освещения культиватора">
 <div class="console-plate"><span>БИОС · ЛАБОРАТОРИЯ</span><strong>СВЕТ — 01</strong><small>УЧЕБНЫЙ ПУЛЬТ</small></div>
 <div class="console-layout"><div class="instrument-meter">
 <svg viewBox="0 0 300 190" role="img" aria-label="Стрелочный указатель уровня освещения">
 <path d="M35 148 A120 120 0 0 1 265 148" fill="none" stroke="#463f32" stroke-width="2"/>
 <path id="consoleBand" fill="none" stroke="#668253" stroke-width="12"/>
 <g fill="#463f32" font-size="15" font-family="monospace"><text x="27" y="170">0</text><text x="78" y="55">25</text><text x="141" y="34">50</text><text x="210" y="55">75</text><text x="252" y="170">100</text></g>
 <line id="consoleNeedle" x1="150" y1="158" x2="150" y2="48" stroke="#9e3c29" stroke-width="4"/><circle cx="150" cy="158" r="10" fill="#443d33"/>
 <text x="150" y="110" text-anchor="middle" fill="#514b3e" font-family="monospace" font-size="13">ОСВЕЩЕНИЕ</text></svg>
 <output id="consoleReading">0 у.е.</output></div>
 <div class="console-note"><strong>ЗАПИСЬ ДЕЖУРНОГО</strong><p>После замены блока восстановить отметку <b id="consoleTarget"></b>.</p><p>Сначала питание, затем блок, затем регулировка.</p><small>Условная шкала игрового пульта.</small></div></div>
 <div class="console-controls"><div><span class="engraved">СЕТЬ</span><button id="consolePower" class="power-toggle" aria-pressed="true">ВКЛ</button></div><div><span class="engraved">ЛАМПОВЫЙ БЛОК</span><button id="consoleModule" class="module-slot">Заменить блок</button></div></div>
 <label class="console-regulator" for="consoleLevel">РЕГУЛЯТОР СВЕТА <input id="consoleLevel" type="range" min="0" max="100" step="5" value="20"><span>0 · 25 · 50 · 75 · 100</span></label>
 <p id="consoleStatus" class="console-status" role="status"></p>
 <div class="console-actions"><button id="consoleTest">ПРОВЕРКА</button><button id="consoleHelp">Подсказка</button></div>
 <small class="console-exit-note">Крестик закрывает пульт. Задание засчитывается только после проверки.</small>
 </section>`;
 $('consolePower').onclick=()=>consoleAction('power');$('consoleModule').onclick=()=>consoleAction('module');
 $('consoleLevel').oninput=()=>consoleAction('level',Number($('consoleLevel').value));
 $('consoleTest').onclick=()=>consoleAction('test');$('consoleHelp').onclick=()=>refreshConsole(!consoleSession.module?(consoleSession.power?'Переведи тумблер «Сеть» в ВЫКЛ, затем замени блок.':'Нажми «Заменить блок».'):!consoleSession.power?'Включи питание и передвинь регулятор.':'Сверь показание с записью дежурного. Зеленая отметка — нужное значение.');
 refreshConsole();
}
function refreshConsole(message){
 const s=consoleSession;if(!s)return;
 const value=consoleReading(s),angle=-80+value*1.6,targetAngle=(-80+s.target*1.6)*Math.PI/180;
 $('consoleTarget').textContent=s.target+' у.е.';$('consoleReading').textContent=value+' у.е.';
 $('consoleNeedle').setAttribute('transform','rotate('+angle+' 150 158)');
 const polar=a=>[150+110*Math.sin(a),158-110*Math.cos(a)];const a=polar(targetAngle-.07),b=polar(targetAngle+.07);
 $('consoleBand').setAttribute('d',`M${a[0]} ${a[1]} A110 110 0 0 1 ${b[0]} ${b[1]}`);
 $('consolePower').textContent=s.power?'ВКЛ':'ВЫКЛ';$('consolePower').setAttribute('aria-pressed',String(s.power));
 $('consoleModule').textContent=s.module?'Блок установлен':'Заменить блок';$('consoleModule').disabled=s.module;
 $('consoleLevel').disabled=!s.power||!s.module;
 $('consoleStatus').textContent=message||(!s.module?'Ламповый блок не отвечает. Отключи питание для замены.':!s.power?'Новый блок установлен. Теперь включи питание.':consoleReady(s)?'Стрелка у нужной отметки. Нажми «Проверка».':'Двигай регулятор, пока показание не совпадёт с записью.');
}
function consoleAction(action,value){
 const s=consoleSession;if(!s||s.done||!$('modal').open)return;
 if(action==='power')s.power=!s.power;
 if(action==='module'){if(s.power){refreshConsole('Сначала отключи питание тумблером «Сеть».');soundEffect('tap');return;}s.module=true;}
 if(action==='level'){if(!s.power||!s.module||!Number.isFinite(value))return;s.level=clamp(Math.round(value/5)*5,0,100);}
 if(action==='test'){
  if(!consoleReady(s)){refreshConsole('Проверка не пройдена. Проверь блок, питание и отметку регулятора.');soundEffect('tap');return;}
  s.done=true;soundEffect('success');$('modal').classList.remove('instrument-modal');
  if(!s.practice&&state.day===1&&!state.light&&state.stage===2){state.light=true;state.stage=3;time(25);changeNeed('energy',-8);update();save();}
  show('Свет восстановлен','<div class="fact"><strong>'+ (s.practice?'Учебная проверка пройдена':'Культиватор снова освещён')+'</strong><p>Хлорелла использует свет для фотосинтеза. Ты восстановил условный режим по записи дежурного.</p></div><p>'+(s.practice?'Тренировку можно повторять. Ресурсы и задания при этом не изменяются.':'Теперь осмотри пшеницу в первом фитотроне — пора готовить хлеб.')+'</p>',[{text:'Вернуться в комплекс',primary:true,fn:close}]);return;
 }
 soundEffect('tap');refreshConsole();
}
repair=function(){openLightConsole(false);};
const interactBeforeConsole=interact;
interact=function(key){
 const p=spots.panel;
 if(key==='panel'&&state.light&&state.room===p.room&&Math.hypot(state.x-p.x,state.y-p.y)<=125&&!(currentTask()?.at==='panel'&&!state.dayDone)){
  show('Щит освещения','<p>Лампы работают. На учебном стенде можно потренироваться в настройке.</p>',[{text:'Открыть учебный пульт',primary:true,fn:()=>openLightConsole(true)},{text:'Вернуться',fn:close}]);return;
 }
 interactBeforeConsole(key);
};
$('modal').addEventListener('close',()=>{consoleSession=null;$('modal').classList.remove('instrument-modal');});
