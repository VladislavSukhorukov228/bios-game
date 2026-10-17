'use strict';
// Visible floors, with furniture and wall margins excluded.
floors[0] = [[735,280,875,935], [120,850,1410,958]];
floors[1] = floors[0].map(r => r.slice());
floors[2] = [[410,405,1105,915], [350,525,1105,695], [465,695,1130,925], [320,900,1230,935]];
floors[3] = [
  [555,430,930,938], [440,430,1140,540], [915,530,1140,600],
  [445,220,525,455],
  [735,345,815,455], [745,345,910,395], [820,220,910,395],
  [1020,345,1100,455], [1020,335,1250,395], [1180,225,1250,395],
  [400,630,590,685], [375,575,470,775], [305,710,470,775],
  [555,900,1340,938], [915,545,1320,605], [1260,555,1330,930]
];
const footprint = [[-12,-7],[0,-7],[12,-7],[-12,0],[0,0],[12,0],[-12,7],[0,7],[12,7]];
function rawFloor(room,x,y) {
  return floors[room]?.some(([a,b,c,d]) => x>=a && x<=c && y>=b && y<=d) || false;
}
walkable = function(room,x,y) {
  return Number.isFinite(x) && Number.isFinite(y) && footprint.every(([dx,dy]) => rawFloor(room,x+dx,y+dy));
};
function clearSegment(room,a,b) {
  const steps = Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));
  for (let i=0;i<=steps;i++) {
    const p=i/steps;
    if (!walkable(room,a.x+(b.x-a.x)*p,a.y+(b.y-a.y)*p)) return false;
  }
  return true;
}
const navCache = new Map();
function navGraph(room) {
  if (navCache.has(room)) return navCache.get(room);
  const nodes=[], byKey=new Map(), edges=new Map();
  for(let y=10;y<=1024;y+=15) for(let x=0;x<=1536;x+=15) {
    if(walkable(room,x,y)) { const p={x,y}; nodes.push(p); byKey.set(x+','+y,p); }
  }
  for(const p of nodes) {
    const list=[];
    for(const [dx,dy] of [[15,0],[-15,0],[0,15],[0,-15]]) {
      const n=byKey.get((p.x+dx)+','+(p.y+dy));
      if(n && clearSegment(room,p,n)) list.push(n);
    }
    edges.set(p,list);
  }
  const graph={nodes,edges}; navCache.set(room,graph); return graph;
}
floorNodes = room => navGraph(room).nodes;
nearestFloor = function(room,x,y) {
  const nodes=floorNodes(room);
  return nodes.reduce((best,p) => Math.hypot(p.x-x,p.y-y)<Math.hypot(best.x-x,best.y-y)?p:best,nodes[0]);
};
findRoute = function(room,from,to) {
  if(!walkable(room,from.x,from.y)) return [];
  const graph=navGraph(room); let start=null,best=Infinity;
  for(const p of graph.nodes) {
    const d=Math.hypot(p.x-from.x,p.y-from.y);
    if(d<best && clearSegment(room,from,p)) {best=d;start=p;}
  }
  if(!start) return [];
  const end=nearestFloor(room,to.x,to.y),queue=[start],parents=new Map([[start,null]]);
  for(let i=0;i<queue.length;i++) {
    const p=queue[i];
    if(p===end) {
      const path=[]; for(let n=p;n;n=parents.get(n)) path.unshift(n);
      if(walkable(room,to.x,to.y) && clearSegment(room,end,to)) path.push({x:to.x,y:to.y});
      return path;
    }
    for(const n of graph.edges.get(p)) if(!parents.has(n)) {parents.set(n,p);queue.push(n);}
  }
  return [];
};
function moveActor(actor,x,y) {
  if(!clearSegment(actor.room,actor,{x,y})) return false;
  actor.x=x; actor.y=y; return true;
}
function movePlayerManual(nx,ny) {
  moveActor(state,nx,state.y);
  moveActor(state,state.x,ny);
}
function movePlayerTarget(dt) {
  if(!target) return;
  const d=Math.hypot(target.x-state.x,target.y-state.y),step=240*dt;
  if(d<=step) {
    if(!moveActor(state,target.x,target.y)) {route=[];target=null;pending=null;return;}
    target=route.shift()||null;
    if(!target) {const callback=pending;pending=null;if(callback)callback();}
  } else if(!moveActor(state,state.x+(target.x-state.x)/d*step,state.y+(target.y-state.y)/d*step)) {
    route=[];target=null;pending=null;
  }
}
const npcBeforeCollision=updateNpc;
updateNpc=function(n,dt) {
  if(!walkable(n.room,n.x,n.y)) {Object.assign(n,nearestFloor(n.room,n.x,n.y));n.route=[];}
  const previous={room:n.room,x:n.x,y:n.y}; npcBeforeCollision(n,dt);
  if(n.room===previous.room && !clearSegment(n.room,previous,n)) {
    n.x=previous.x;n.y=previous.y;n.route=[];n.t=n.wait+1;
  }
};
function perspectiveSize(y) {return clamp(.72+(y-285)*.00044,.70,1);}
// Foreground partitions hide people behind them instead of making them stand on the wall.
const livingPartitions=[
  {front:415,polygon:[[155,277],[429,277],[440,410],[146,410]]},
  {front:415,polygon:[[527,277],[715,277],[715,415],[527,415]]},
  {front:415,polygon:[[831,277],[1009,277],[1009,415],[831,415]]},
  {front:435,polygon:[[1125,278],[1387,278],[1397,444],[1130,434]]}
];
const characterBeforeDepth=character;
character=function(i,x,y,moving,flip,t) {
  characterBeforeDepth(i,x,y,moving,flip,t);
  if(state.room!==3 || !images.living) return;
  for(const wall of livingPartitions) {
    if(y>=wall.front) continue;
    ctx.save();ctx.beginPath();
    wall.polygon.forEach(([px,py],j)=>j?ctx.lineTo(px,py):ctx.moveTo(px,py));
    ctx.closePath();ctx.clip();ctx.drawImage(images.living,0,0,1536,1024);ctx.restore();
  }
};
const crewPanel=document.createElement('dialog');
crewPanel.id='crewPanel';crewPanel.setAttribute('aria-labelledby','crewPanelTitle');
const crewHead=document.createElement('div');crewHead.className='crew-panel-head';
const crewTitle=document.createElement('h2');crewTitle.id='crewPanelTitle';crewTitle.textContent='Экипаж и дом';
const crewClose=document.createElement('button');crewClose.textContent='Закрыть';
crewClose.setAttribute('aria-label','Закрыть показатели экипажа');
crewHead.append(crewTitle,crewClose);crewPanel.append(crewHead,document.querySelector('aside'));document.body.append(crewPanel);
function closeCrew() {
  crewPanel.close();modalPause=!!$('modal').open||comic.open||night.open;
  update();save();$('crewPanelButton').focus();
}
function openCrew() {
  if(!started) return;
  stopStick();keys.clear();modalPause=true;crewPanel.showModal();crewClose.focus();
}
crewClose.onclick=closeCrew;
crewPanel.addEventListener('cancel',e=>{e.preventDefault();closeCrew();});
crewPanel.addEventListener('click',e=>{if(e.target.closest?.('#crewButtons button'))closeCrew();},true);
const crewButton=document.createElement('button');crewButton.id='crewPanelButton';crewButton.textContent='Экипаж';
crewButton.onclick=openCrew;document.querySelector('header').insertBefore(crewButton,$('journal'));
$('joystick').addEventListener('pointerdown',()=>{$('joystick').classList.add('in-use');});
for(const event of ['pointerup','pointercancel','lostpointercapture']) $('joystick').addEventListener(event,()=>{$('joystick').classList.remove('in-use');});
const stopStickBeforeDim=stopStick;
stopStick=function(){stopStickBeforeDim();$('joystick').classList.remove('in-use');};
const beginBeforeCollision=begin;
begin=function(resume){beginBeforeCollision(resume);npcs.forEach(n=>{Object.assign(n,nearestFloor(n.room,n.x,n.y));n.route=[];});};
resize();
