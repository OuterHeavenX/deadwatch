
/* Deadwatch 0.4 — ranged wave survival. Units are world pixels, time is seconds. */
(function (root) {
'use strict';
const PI=Math.PI, TAU=PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const angleTo=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const turn=(a,b,s)=>a+clamp(wrap(b-a),-s,s);
const smooth=t=>t*t*(3-2*t);
const v=(x,y)=>({x,y});
const add=(a,b)=>v(a.x+b.x,a.y+b.y);
const lerpV=(a,b,t)=>v(mix(a.x,b.x,t),mix(a.y,b.y,t));
const polar=(a,d)=>v(Math.cos(a)*d,Math.sin(a)*d);
function rotate(p,a){const c=Math.cos(a),s=Math.sin(a);return v(p.x*c-p.y*s,p.x*s+p.y*c);}
function closest(p,a,b){const dx=b.x-a.x,dy=b.y-a.y;const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return v(a.x+dx*t,a.y+dy*t);}
function cross(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
function intersects(a,b,c,d){
 const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
 if(ab1*ab2<0&&cd1*cd2<0)return true;
 return Math.min(distance(a,closest(a,c,d)),distance(b,closest(b,c,d)),distance(c,closest(c,a,b)),distance(d,closest(d,a,b)))<1e-7;
}
function segmentDistance(a,b,c,d){if(intersects(a,b,c,d))return 0;return Math.min(distance(a,closest(a,c,d)),distance(b,closest(b,c,d)),distance(c,closest(c,a,b)),distance(d,closest(d,a,b)));}
function rectHit(a,b,r,pad=0){
 const x=r.x-pad,y=r.y-pad,w=r.w+pad*2,h=r.h+pad*2;
 if(a.x>=x&&a.x<=x+w&&a.y>=y&&a.y<=y+h)return true;
 if(b.x>=x&&b.x<=x+w&&b.y>=y&&b.y<=y+h)return true;
 const p=[v(x,y),v(x+w,y),v(x+w,y+h),v(x,y+h)];
 return p.some((q,i)=>intersects(a,b,q,p[(i+1)%4]));
}
/* Sample the whole moving segment against the moving target. At the fixed
   120 Hz step the 2-pixel spacing is below the smallest 4-pixel blade radius. */
function sweepCircle(oldBlade,newBlade,oldTarget,newTarget,r){
 const span=Math.max(distance(oldBlade.a,newBlade.a),distance(oldBlade.b,newBlade.b))+distance(oldTarget,newTarget);
 const n=Math.max(1,Math.ceil(span/2));
 for(let i=0;i<=n;i++){const t=i/n,a=lerpV(oldBlade.a,newBlade.a,t),b=lerpV(oldBlade.b,newBlade.b,t),c=lerpV(oldTarget,newTarget,t),p=closest(c,a,b);if(distance(p,c)<=r)return {t,x:p.x,y:p.y};}
 return null;
}
function sweepBlades(a0,a1,b0,b1,r=5){
 const span=Math.max(distance(a0.a,a1.a),distance(a0.b,a1.b))+Math.max(distance(b0.a,b1.a),distance(b0.b,b1.b));
 const n=Math.max(1,Math.ceil(span/2));
 for(let i=0;i<=n;i++){const t=i/n,a=lerpV(a0.a,a1.a,t),b=lerpV(a0.b,a1.b,t),c=lerpV(b0.a,b1.a,t),d=lerpV(b0.b,b1.b,t);if(segmentDistance(a,b,c,d)<=r){const p=closest(c,a,b);return {t,x:p.x,y:p.y};}}
 return null;
}
const GUNS=Object.freeze({
 carbine:{name:'Carbine',role:'Arcade automatic fire',mag:24,reserve:144,damage:20,interval:.025,reload:1.35,range:660,pellets:1,spread:.03,pierce:1},
 shotgun:{name:'Scattergun',role:'Close-range crowd control',mag:6,reserve:42,damage:10,interval:.62,reload:1.65,range:345,pellets:7,spread:.16,pierce:1},
 scout:{name:'Scout rifle',role:'Powerful shots pierce two targets',mag:8,reserve:64,damage:74,interval:.48,reload:1.55,range:820,pellets:1,spread:.009,pierce:2},
 pistol:{name:'Backup pistol',role:'Unlimited reserve · reload required',mag:10,reserve:Infinity,damage:24,interval:.29,reload:.95,range:500,pellets:1,spread:.02,pierce:1}
});
const ZOMBIES=Object.freeze({walker:{health:112,speed:53,damage:18,windup:.38,radius:14},runner:{health:80,speed:104,damage:16,windup:.32,radius:12},brute:{health:480,speed:40,damage:28,windup:.60,radius:21}});
const WAVES=[{total:6,cap:3,gap:2.8},{total:9,cap:4,gap:2.65},{total:12,cap:5,gap:2.5},{total:15,cap:6,gap:2.35},{total:19,cap:7,gap:2.2},{total:23,cap:8,gap:2.05},{total:27,cap:9,gap:1.9},{total:32,cap:10,gap:1.8}];
const RULES=Object.freeze({spawnWarning:1.6,spawnDistance:390,spawnMinimum:260,hurtGrace:.9,rollDuration:.22,rollCost:0,rollDistance:100,meleeReach:5,meleeArc:.85,runnerRush:1.14});
class Random{constructor(seed){this.n=seed>>>0||1;}next(){this.n=(Math.imul(this.n,1664525)+1013904223)>>>0;return this.n/4294967296;}range(a,b){return a+(b-a)*this.next();}}
function rayCircle(origin,dir,target,r,limit){const x=origin.x-target.x,y=origin.y-target.y,b=x*dir.x+y*dir.y,c=x*x+y*y-r*r;if(c<=0)return 0;const disc=b*b-c;if(disc<0)return Infinity;const t=-b-Math.sqrt(disc);return t>=0&&t<=limit?t:Infinity;}
function rayRect(origin,dir,rect,limit){let lo=0,hi=limit;for(const [axis,min,max] of [['x',rect.x,rect.x+rect.w],['y',rect.y,rect.y+rect.h]]){const speed=dir[axis];if(Math.abs(speed)<1e-9){if(origin[axis]<min||origin[axis]>max)return Infinity;}else{let a=(min-origin[axis])/speed,b=(max-origin[axis])/speed;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return Infinity;}}return lo;}
function muzzle(p){return {...add(p,rotate(v(30,5),p.aim)),groundHeight:p.groundHeight||0};}
class Game{
 constructor(seed=45912){this.seed=seed;this.rng=new Random(seed);this.width=1440;this.height=1040;this.time=0;this.serial=0;this.status='menu';this.mode='campaign';this.wave=0;this.zombies=[];this.warnings=[];this.pickups=[];this.decoys=[];this.barrels=[];this.obstacles=[];this.events=[];this.log=[];this.frames=[];this.player=null;this.navGraphs=new Map();}
 emit(type,data={}){const e={t:+this.time.toFixed(3),type,...data};this.events.push(e);this.log.push(e);if(this.log.length>2400)this.log.shift();}
 setGodMode(enabled){this.godMode=!!enabled;if(this.godMode&&this.player){this.player.hp=this.player.maxHp;this.player.hurtGrace=0;this.player.flash=0;}return this.godMode;}
 gun(){return this.player.guns[this.player.slot];}
 start(mode='campaign',loadout='carbine'){
  if(!['carbine','shotgun','scout'].includes(loadout))loadout='carbine';this.loadout=loadout;this.mode=mode;this.time=0;this.wave=0;this.serial=0;this.rng=new Random(this.seed);this.events=[];this.log=[];this.frames=[];this.zombies=[];this.warnings=[];this.pickups=[];this.decoys=[];this.status='playing';this.pursuitTracks=new WeakMap();this.flankPlanAt=0;this.flankRoute=null;this.flankRouteSeq=0;this.mods={damage:1,reload:1};this.stats={kills:0,shots:0,connected:0,damageTaken:0,rolls:0,lures:0,heals:0,seconds:0};
  this.obstacles=[{x:405,y:300,w:160,h:60},{x:890,y:300,w:75,h:145},{x:390,y:715,w:100,h:70},{x:845,y:705,w:185,h:55}];this.navGraphs=new Map();
  this.barrels=[{id:++this.serial,x:605,y:305,hp:28},{id:++this.serial,x:1030,y:470,hp:28},{id:++this.serial,x:750,y:780,hp:28},{id:++this.serial,x:325,y:610,hp:28}];
  const makeGun=id=>({id,ammo:GUNS[id].mag,reserve:mode==='range'?Infinity:GUNS[id].reserve});
  this.player={x:720,y:520,r:13,vx:0,vy:0,aim:0,wanted:0,body:0,speed:208,hp:120,maxHp:120,stamina:100,step:0,slot:0,guns:[makeGun(loadout),makeGun('pistol')],fireCooldown:0,reload:null,hurtGrace:0,flash:0,recoil:0,roll:0,rollCooldown:0,rollHeading:0,medkits:2,lures:2,focus:false};this.initDepot();this.beginWave(0);
 }
 // Optional depot interactions do not alter the wave director or base weapon data.
 initDepot(){
  this.points=this.mode==='range'?9999:300;this.power=false;this.ownedGuns={[this.player.guns[0].id]:this.player.guns[0]};this.interaction=null;this.interactionLatch=false;this.depotStats={earned:0,spent:0,interactions:0,trapKills:0};
  this.stations=[
   {id:'generator',kind:'generator',name:'GENERATOR',icon:'P',x:560,y:420,powered:false},
   {id:'carbine',kind:'rack',gun:'carbine',name:'CARBINE RACK',icon:'C',x:340,y:325,powered:false},
   {id:'shotgun',kind:'rack',gun:'shotgun',name:'SCATTERGUN RACK',icon:'S',x:1030,y:370,powered:false},
   {id:'scout',kind:'rack',gun:'scout',name:'SCOUT RACK',icon:'R',x:1060,y:810,powered:false},
   {id:'clinic',kind:'clinic',name:'FIELD CLINIC',icon:'+',x:345,y:795,powered:true},
   {id:'bench',kind:'bench',name:'TUNING BENCH',icon:'↑',x:850,y:215,powered:true},
   {id:'trap',kind:'trap',name:'SHOCK SWITCH',icon:'ϟ',x:720,y:450,powered:true}
  ];this.trap={x:720,y:335,radius:105,arming:0,active:0,cooldown:0,pulse:0};
 }
 awardPoints(amount,x,y){this.points+=amount;this.depotStats.earned+=amount;this.emit('points',{amount,points:this.points,x,y});}
 cancelInteraction(){this.interaction=null;this.interactionLatch=true;}
 quickDevices(){return this.arena?.id==='depot'||this.arena?.id==='breakwater';}
 stationOffer(s){
  const primary=this.player.guns[0],spec=GUNS[primary.id],offer={id:s.id,x:s.x,y:s.y,kind:s.kind,title:s.name,detail:'',action:'',cost:0,duration:.6,enabled:true,reason:''};
  if(s.kind==='generator'){Object.assign(offer,{title:'Restore power',detail:'Power the clinic, tuning bench and shock trap',action:'power',duration:1.2});if(this.power)offer.reason='POWER ONLINE';}
  else if(s.kind==='rack'){
   if(primary.id===s.gun){Object.assign(offer,{title:spec.name+' ammunition',detail:'Fill reserve only · reload still required',action:'ammo',cost:300});if(primary.reserve>=spec.reserve)offer.reason='AMMO FULL';}
   else if(this.ownedGuns[s.gun])Object.assign(offer,{title:'Equip '+GUNS[s.gun].name,detail:'Stored ammo and tuning · keeps your pistol',action:'equip'});
   else Object.assign(offer,{title:'Buy '+GUNS[s.gun].name,detail:'Full magazine and reserve · keeps your pistol',action:'buy',cost:700});
  }else if(s.kind==='clinic'){Object.assign(offer,{title:'Buy a medkit',detail:'Carry one extra medkit · maximum three',action:'medkit',cost:250});if(this.player.medkits>=3)offer.reason='MEDKITS FULL';}
  else if(s.kind==='bench'){Object.assign(offer,{title:'Tune '+spec.name,detail:'+25% damage for this primary · one tune per gun',action:'tune',cost:1250,duration:1});if(primary.tuned)offer.reason='ALREADY TUNED';}
  else if(s.kind==='trap'){Object.assign(offer,{title:'Activate shock trap',detail:'4-second field · safe for you · 24-second cycle',action:'trap',cost:250});if(this.trap.arming>0)offer.reason='TRAP ARMING';else if(this.trap.active>0)offer.reason='TRAP ACTIVE';else if(this.trap.cooldown>0)offer.reason='COOLING · '+Math.ceil(this.trap.cooldown)+'s';}
  if(this.quickDevices()&&(s.kind==='generator'||s.kind==='trap')){
   offer.quickUse=true;offer.duration=s.kind==='generator'?.30:.10;
   if(s.kind==='generator')offer.detail='Tap once · power the lights, services and shock field';
   else{offer.cost=0;offer.detail='FREE · 4-second field · safe for you · 24-second cycle';}
  }
  if(s.powered&&!this.power)offer.reason='POWER REQUIRED';
  if(!offer.reason&&this.points<offer.cost)offer.reason='NEED '+(offer.cost-this.points)+' MORE POINTS';
  offer.enabled=!offer.reason;return offer;
 }
 interactionOffer(){if(this.status!=='playing')return null;let best=null,range=82;for(const s of this.stations){const d=distance(s,this.player);if(d<range&&this.clearRoute(this.player,s)){range=d;best=s;}}return best?this.stationOffer(best):null;}
 completeInteraction(id){
  const offer=this.interactionOffer();if(!offer||offer.id!==id||!offer.enabled)return false;
  const s=this.stations.find(s=>s.id===id),p=this.player,primary=p.guns[0];
  if(offer.action==='power'){this.power=true;this.emit('power_on',{x:s.x,y:s.y});}
  else if(offer.action==='buy'||offer.action==='equip'){
   if(!this.ownedGuns[s.gun])this.ownedGuns[s.gun]={id:s.gun,ammo:GUNS[s.gun].mag,reserve:this.mode==='range'?Infinity:GUNS[s.gun].reserve};
   p.guns[0]=this.ownedGuns[s.gun];p.slot=0;p.reload=null;p.fireCooldown=Math.max(p.fireCooldown,.15);this.emit('switch',{gun:s.gun});
  }else if(offer.action==='ammo')primary.reserve=GUNS[primary.id].reserve;
  else if(offer.action==='medkit')p.medkits++;
  else if(offer.action==='tune')primary.tuned=true;
  else if(offer.action==='trap'){this.trap.arming=.8;this.trap.active=0;this.trap.cooldown=24;this.trap.pulse=0;this.emit('trap_armed',{x:this.trap.x,y:this.trap.y,radius:this.trap.radius});}
  else return false;
  this.points-=offer.cost;this.depotStats.spent+=offer.cost;this.depotStats.interactions++;this.emit('interaction_complete',{station:id,action:offer.action,cost:offer.cost,points:this.points,x:s.x,y:s.y,title:offer.title});return true;
 }
 updateInteraction(dt,held,blocked){
  if(!held){this.interaction=null;this.interactionLatch=false;return;}
  if(this.interactionLatch)return;
  const offer=this.interactionOffer();if(!offer||!offer.enabled||(blocked&&!(offer.quickUse&&this.player.roll<=0))){this.interaction=null;return;}
  if(!this.interaction||this.interaction.id!==offer.id||this.interaction.action!==offer.action)this.interaction={id:offer.id,action:offer.action,elapsed:0,total:offer.duration};
  this.interaction.elapsed+=dt;if(this.interaction.elapsed+1e-8>=offer.duration){this.completeInteraction(offer.id);this.interaction=null;this.interactionLatch=true;}
 }
 updateDevices(dt){
  const trap=this.trap,wasCooling=trap.cooldown;trap.cooldown=Math.max(0,trap.cooldown-dt);
  if(wasCooling>0&&trap.cooldown===0&&trap.active<=0&&trap.arming<=0&&this.power&&this.quickDevices())this.emit('trap_ready',{x:trap.x,y:trap.y});
  if(trap.arming>0){trap.arming=Math.max(0,trap.arming-dt);if(trap.arming===0){trap.active=4;trap.pulse=0;this.emit('trap_on',{x:trap.x,y:trap.y,radius:trap.radius});}return;}
  if(trap.active<=0)return;trap.active=Math.max(0,trap.active-dt);trap.pulse-=dt;
  if(trap.pulse<=0){trap.pulse+=.2;for(const z of this.zombies)if(!z.dead&&distance(z,trap)<=trap.radius&&this.clearRoute(trap,z)){this.damageZombie(z,16);if(z.dead)this.depotStats.trapKills++;}}
  if(trap.active===0)this.emit('trap_off',{x:trap.x,y:trap.y});
 }
 depotTrace(){return {points:this.points,power:this.power,stats:{...this.depotStats},trap:{...this.trap},owned:Object.values(this.ownedGuns).map(g=>({id:g.id,ammo:g.ammo,reserve:Number.isFinite(g.reserve)?g.reserve:'unlimited',tuned:!!g.tuned}))};}
 beginWave(wave){this.wave=wave;this.status='playing';this.warnings=[];this.decoys=[];this.queue=[];this.waveTime=0;this.nextSpawn=this.time+2.5;this.player.reload=null;this.cancelInteraction();
  const total=this.mode==='range'?2:WAVES[wave].total;for(let i=0;i<total;i++){const kind=wave>=4&&i%9===8?'brute':wave>=2&&i%4===3?'runner':'walker';this.queue.push(kind);}this.emit('wave_start',{wave:wave+1,total,cap:this.mode==='range'?2:WAVES[wave].cap});
 }
 advance(upgrade){if(this.status!=='between'||!['firepower','survival','handling'].includes(upgrade))return false;const p=this.player;if(upgrade==='firepower')this.mods.damage+=.15;else if(upgrade==='survival'){p.maxHp+=20;p.hp=Math.min(p.maxHp,p.hp+40);}else{this.mods.reload=Math.max(.45,this.mods.reload*.85);p.speed=Math.min(240,p.speed+7);}this.emit('upgrade',{upgrade});this.beginWave(this.wave+1);return true;}
 completeWave(){if(this.mode==='range')return;const p=this.player;if(this.wave===7){this.status='won';this.emit('won');return;}this.status='between';p.hp=Math.min(p.maxHp,p.hp+30);p.stamina=100;p.roll=0;p.reload=null;p.lures=Math.min(3,p.lures+1);if(this.wave%2===1)p.medkits=Math.min(3,p.medkits+1);for(const gun of p.guns){const spec=GUNS[gun.id];gun.ammo=spec.mag;if(Number.isFinite(gun.reserve))gun.reserve=Math.min(spec.reserve,gun.reserve+spec.mag*2);}this.emit('wave_clear',{wave:this.wave+1});}
 reload(){const p=this.player,g=this.gun(),spec=GUNS[g.id];if(this.status!=='playing'||p.reload||p.roll>0||g.ammo>=spec.mag||g.reserve<=0)return false;p.reload={slot:p.slot,left:spec.reload*this.mods.reload,total:spec.reload*this.mods.reload};this.emit('reload',{gun:g.id});return true;}
 switchGun(){const p=this.player;if(this.status!=='playing')return;p.reload=null;p.slot=1-p.slot;p.fireCooldown=Math.max(p.fireCooldown,.12);this.emit('switch',{gun:this.gun().id});}
 roll(move){const p=this.player;if(this.status!=='playing'||p.roll>0||p.rollCooldown>0||p.stamina<RULES.rollCost)return false;p.roll=RULES.rollDuration;p.hurtGrace=Math.max(p.hurtGrace,RULES.rollDuration);p.rollCooldown=.7;p.rollHeading=Math.hypot(move.x,move.y)>.1?Math.atan2(move.y,move.x):p.aim+PI;p.stamina-=RULES.rollCost;p.reload=null;this.stats.rolls++;this.emit('roll',{x:p.x,y:p.y,heading:p.rollHeading});return true;}
 heal(){const p=this.player;if(this.status!=='playing'||p.medkits<=0||p.hp>=p.maxHp)return false;p.medkits--;p.hp=Math.min(p.maxHp,p.hp+50);this.stats.heals++;this.emit('heal',{x:p.x,y:p.y});return true;}
 lureSpot(aim=this.player.wanted){
  const p=this.player;
  const dir=polar(aim,1),stop=this.wallDistance(p,dir,240),q=add(p,polar(aim,Math.max(0,stop-8)));
  q.x=clamp(q.x,70,this.width-70);q.y=clamp(q.y,70,this.height-70);
  // Shots can cross Pump's low rails; a lure still needs room for a zombie's body.
  const clearance=Math.max(...Object.values(ZOMBIES).map(z=>z.radius))+1;
  if(!this.validPosition(q,clearance)){
   const throwClear=point=>{const length=distance(p,point);return this.wallDistance(p,polar(angleTo(p,point),1),length)>=length-.001;};
   const safe={x:q.x,y:q.y,r:clearance+.5};this.resolveWalls(safe);
   if(this.validPosition(safe,clearance)&&distance(safe,q)<clearance*2&&distance(safe,p)<=240&&throwClear(safe)){
    q.x=safe.x;q.y=safe.y;
   }else{
    let found=false;
    for(let d=Math.min(232,distance(p,q));d>=0;d-=4){
     const near=add(p,polar(aim,d));
     if(this.validPosition(near,clearance)&&throwClear(near)){q.x=near.x;q.y=near.y;found=true;break;}
    }
    if(!found)return null;
   }
  }
  return q;
 }
 lure(){
  const p=this.player;if(this.status!=='playing'||p.lures<=0)return false;const q=this.lureSpot();if(!q)return false;
  p.lures--;this.decoys.push({id:++this.serial,x:q.x,y:q.y,r:12,left:8.28,total:8,radius:360,fromX:p.x,fromY:p.y,thrownAt:this.time,landAt:this.time+.28,pulseAt:this.time+.28});this.stats.lures++;this.emit('lure',{x:q.x,y:q.y});return true;
 }
 combatActors(){return[this.player];}
 actorById(id){return id==='player'?this.player:null;}
 zombieTarget(z){return this.player;}
 pursuitPosition(actor,seconds,maxLead=120){
  const vx=Number.isFinite(actor.vx)?actor.vx:0,vy=Number.isFinite(actor.vy)?actor.vy:0,speed=Math.hypot(vx,vy),heading=Math.atan2(vy,vx),old=this.pursuitTracks.get(actor);
  let rate=old?.rate||0;
  if(!old||this.time!==old.time){
   const elapsed=old?this.time-old.time:0;
   rate=old&&elapsed>0&&elapsed<.15&&speed>55&&old.speed>55?mix(rate,clamp(wrap(heading-old.heading)/elapsed,-2.5,2.5),1-Math.exp(-elapsed*8)):0;
   this.pursuitTracks.set(actor,{time:this.time,heading,speed,rate});
  }
  const lead=Math.min(seconds,maxLead/Math.max(1,speed));
  if(Math.abs(rate)<.08)return v(actor.x+vx*lead,actor.y+vy*lead);
  // Follow observed turns, so a repeated circle can be intercepted across its inside edge.
  const end=heading+rate*lead;return v(actor.x+speed*(Math.sin(end)-Math.sin(heading))/rate,actor.y+speed*(Math.cos(heading)-Math.cos(end))/rate);
 }
 runnerIntercept(z,actor){
  const speed=Math.hypot(actor.vx,actor.vy),heading=Math.atan2(actor.vy,actor.vx),rate=this.pursuitTracks.get(actor)?.rate||0;
  if(speed<55||speed>actor.speed*1.2||Math.abs(rate)<.12||Math.abs(rate)>1||distance(z,actor)<55){delete z.intercept;return null;}
  const old=z.intercept;
  if(!old||this.time>=old.until||Math.abs(wrap(heading-old.heading))>.35||distance(actor,old.origin)>90){
   z.intercept={goal:null,until:this.time+.35,heading,origin:v(actor.x,actor.y)};
   // Choose a future point the runner can actually reach, instead of settling into a trailing orbit.
   for(let i=2;i<=8;i++){
    const seconds=i*.5,q=this.pursuitPosition(actor,seconds,840);
    if(distance(q,actor)>80&&distance(z,q)<=z.speed*seconds&&this.validPosition(q,z.r)&&this.clearRoute(z,q,z.r-.25)){
     z.intercept.goal=q;break;
    }
   }
  }
  const q=z.intercept?.goal;
  return q&&this.validPosition(q,z.r)&&this.clearRoute(z,q,z.r-.25)?q:null;
 }
 runnerRoute(actor,forecast=true){
  const speed=Math.hypot(actor.vx||0,actor.vy||0),life=this.lifeStats?.deaths||0;
  if(speed<55||speed>actor.speed*1.2){if(this.flankRoute)for(const r of this.zombies)if(r.kind==='runner'){delete r.flank;delete r.chaseSince;}this.flankRoute=null;return [];}
  let state=this.flankRoute;const last=state?.points.at(-1),elapsed=last?this.time-last.t:0;
  if(!state||state.wave!==this.wave||state.life!==life||elapsed>.5||last&&distance(last,actor)>speed*elapsed+35){
   if(state)for(const r of this.zombies)if(r.kind==='runner'){delete r.flank;delete r.chaseSince;}
   state=this.flankRoute={key:++this.flankRouteSeq,wave:this.wave,life,points:[],forecastAt:-1,future:[]};
  }
  const points=state.points;
  if(!points.length||this.time-points.at(-1).t>=.1-1e-8){
   points.push({x:actor.x,y:actor.y,vx:actor.vx,vy:actor.vy,t:this.time});
   while(points.length>360||points.length&&this.time-points[0].t>36)points.shift();
  }
  if(!forecast||this.time-state.forecastAt<.25-1e-8)return state.future;
  state.forecastAt=this.time;state.future=[];
  // Reuse a recently observed pass only when position AND travel direction agree.
  let match=null;
  for(let i=0;i<points.length-1&&points[i+1].t<this.time-5;i++){
   const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;if(len<4)continue;
   const alignment=(dx*actor.vx+dy*actor.vy)/(Math.sqrt(len)*speed);if(alignment<.8)continue;
   const f=clamp(((actor.x-a.x)*dx+(actor.y-a.y)*dy)/len,0,1),x=a.x+dx*f,y=a.y+dy*f,error=Math.hypot(actor.x-x,actor.y-y);
   if(error>120)continue;
   const score=error+(1-alignment)*60+(this.time-a.t)*.02;
   if(!match||score<match.score)match={x,y,t:a.t+(b.t-a.t)*f,speed:Math.sqrt(len)/(b.t-a.t),index:i,score};
  }
  let prev=actor,index=match?.index||0;
  const heading=Math.atan2(actor.vy,actor.vx),rate=this.pursuitTracks.get(actor)?.rate||0;
  const rates=[];
  for(let i=points.length-1;i>0&&this.time-points[i-1].t<1.2;i--){const a=points[i-1],b=points[i];rates.push(wrap(Math.atan2(b.vy,b.vx)-Math.atan2(a.vy,a.vx))/(b.t-a.t));}
  const mean=rates.reduce((a,b)=>a+b,0)/Math.max(1,rates.length),spread=Math.sqrt(rates.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,rates.length));
  const steady=rates.length>=8&&Math.abs(mean)>.12&&Math.abs(mean)<1&&spread<Math.max(.1,Math.abs(mean)*.35);
  let predicted=v(actor.x,actor.y);
  for(let i=1;i<=16;i++){
   const seconds=i*.25;let q,basis='motion';
   if(match){
    const t=match.t+seconds*clamp(speed/Math.max(55,match.speed),.8,1.2);
    while(index<points.length-2&&points[index+1].t<t)index++;
    const a=points[index],b=points[index+1],f=clamp((t-a.t)/(b.t-a.t),0,1);
    q=v(a.x+(b.x-a.x)*f+actor.x-match.x,a.y+(b.y-a.y)*f+actor.y-match.y);basis='repeat';
   }else{
    // A brief steering correction is not evidence of a multi-second circle.
    // Let its influence settle into a heading instead of winding the forecast back around.
    for(let step=0;step<5;step++){const t=seconds-.25+(step+.5)*.05,a=heading+(steady?mean*t:rate*.55*(1-Math.exp(-t/.55))),edge=45+actor.r+.01;predicted.x=clamp(predicted.x+Math.cos(a)*speed*.05,edge,this.width-edge);predicted.y=clamp(predicted.y+Math.sin(a)*speed*.05,edge,this.height-edge);}
    q=v(predicted.x,predicted.y);
   }
   // A forecast must describe traversable player travel, not just a legal endpoint.
   if(!this.validPosition(q,actor.r-.01)||!this.clearRoute(prev,q,actor.r-.25))break;
   state.future.push({x:q.x,y:q.y,seconds,basis});prev=q;
  }
  return state.future;
 }
 runnerTravelTime(z,route,future){
  const path=[{x:this.player.x,y:this.player.y,seconds:0},...future],base=Math.max(1,z.pressureSpeed||z.speed);
  let x=z.x,y=z.y,index=0;
  // Account for the existing close-range rush; this estimates travel and never changes speed.
  for(let t=0;t<=future.at(-1).seconds;t+=.1){
   let i=0;while(i<path.length-2&&path[i+1].seconds<t)i++;
   const a=path[i],b=path[i+1],f=clamp((t-a.seconds)/(b.seconds-a.seconds),0,1),px=a.x+(b.x-a.x)*f,py=a.y+(b.y-a.y)*f;
   const speed=base*(Math.hypot(x-px,y-py)<280?RULES.runnerRush:1);let left=speed*.1,used=0;
   while(index<route.length){const q=route[index],gap=Math.hypot(q.x-x,q.y-y);if(gap>left){x+=(q.x-x)*left/gap;y+=(q.y-y)*left/gap;break;}x=q.x;y=q.y;left-=gap;used+=gap;index++;if(index===route.length)return t+used/speed;}
  }
  return Infinity;
 }
 runnerFlank(z,actor){
  const speed=Math.hypot(actor.vx||0,actor.vy||0),heading=Math.atan2(actor.vy,actor.vx),d=distance(z,actor);
  this.runnerRoute(actor,false);
  if(speed<55||speed>actor.speed*1.2||d>900){delete z.flank;delete z.chaseSince;return null;}
  z.chaseSince??=this.time;
  // Close combat releases the diversion without forgetting the ongoing pursuit.
  if(d<75){delete z.flank;return null;}
  const old=z.flank;
  if(old?.goal){
   let useful=this.time<old.until&&old.routeKey===this.flankRoute.key&&distance(z,old.goal)>30&&this.validPosition(old.goal,z.r);
   if(useful){
    const t=this.time-old.plannedAt,path=old.expected;let i=0;while(i<path.length-2&&path[i+1].seconds<t)i++;
    const a=path[i],b=path[i+1],f=clamp((t-a.seconds)/(b.seconds-a.seconds),0,1),expected=v(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f);
    useful=distance(actor,expected)<65&&Math.abs(wrap(heading-angleTo(a,b)))<.95;
    if(useful&&this.time>=old.checkAt){old.checkAt=this.time+.25;useful=distance(z,old.goal)/Math.max(1,(z.pressureSpeed||z.speed)*RULES.runnerRush)+.08<old.until-this.time;}
   }
   if(useful)return old.goal;
   old.goal=null;delete z.flank;
  }
  if(this.time-z.chaseSince<6||this.time<(this.flankPlanAt||0))return null;
  this.flankPlanAt=this.time+.25;
  const runners=this.zombies.filter(a=>!a.dead&&a.kind==='runner'),limit=Math.min(3,Math.ceil(runners.length/3));
  const active=runners.filter(a=>a.flank?.goal&&a.flank.until>this.time);if(active.length>=limit)return null;
  const future=this.runnerRoute(actor),pairs=[];
  for(const r of runners){
   if(r.flank?.goal||r.attack||r.animalStun>0||this.time-(r.chaseSince??this.time)<6||this.zombieTarget(r)!==actor||this.decoys.some(a=>a.left>0&&distance(r,a)<430))continue;
   const gap=distance(r,actor),travelSpeed=Math.max(1,r.pressureSpeed||r.speed);if(gap<75||gap>900)continue;
   for(const q of future){
    if(q.seconds<.75||distance(actor,q)<110||active.some(a=>distance(a.flank.goal,q)<150)||!this.validPosition(q,r.r))continue;
    const lower=distance(r,q)/(travelSpeed*RULES.runnerRush);if(lower+.22>q.seconds)continue;
    pairs.push({r,q,travelSpeed,score:q.seconds+(q.seconds-lower)*.15});
   }
  }
  pairs.sort((a,b)=>a.score-b.score||a.r.id-b.r.id);const searched=[];
  for(const {r,q,travelSpeed} of pairs){
   // Nearly stacked runners must not spend the whole budget on the same failed crossing.
   if(searched.some(a=>a.q.seconds===q.seconds&&distance(a.r,r)<30))continue;
   if(searched.length>=4)break;searched.push({r,q});
   const route=this.clearRoute(r,q,r.r-.25)?[]:this.routeTo(r,q);if(!route)continue;
   const travelTime=this.runnerTravelTime(r,[...route,q],future);if(travelTime+.22>q.seconds)continue;
   r.flank={goal:v(q.x,q.y),heading,until:this.time+q.seconds,retry:this.time+.25,plannedAt:this.time,travelTime,basis:q.basis,routeKey:this.flankRoute.key,checkAt:this.time+.25,expected:[{x:actor.x,y:actor.y,seconds:0},...future]};
   break;
  }
  return z.flank?.goal||null;
 }
 damageActor(actor,amount,from){return this.damagePlayer(amount,from);}
 damagePlayer(amount,from){const p=this.player;if(this.godMode||this.status!=='playing'||this.mode==='range'||p.hurtGrace>0)return false;amount=this.scaleCampaignIncomingDamage?.(amount)??amount;p.hp=Math.max(0,p.hp-amount);p.hurtGrace=RULES.hurtGrace;p.flash=.22;this.stats.damageTaken+=amount;this.emit('hurt',{amount,x:p.x,y:p.y,from});if(p.hp<=0&&!this.handlePlayerDown?.(from)){this.status='defeat';this.emit('defeat');}return true;}
 damageZombie(z,amount){if(z.dead)return;z.hp=Math.max(0,z.hp-amount);z.flash=.12;this.emit('hit',{id:z.id,x:z.x,y:z.y,amount:Math.round(amount)});if(z.hp<=0){z.dead=true;z.deathTime=this.time;z.attack=null;this.stats.kills++;this.awardPoints(z.kind==='brute'?200:z.kind==='runner'?100:80,z.x,z.y);this.emit('kill',{id:z.id,x:z.x,y:z.y,kind:z.kind});if(this.stats.kills%3===0)this.pickups.push({type:'ammo',x:z.x,y:z.y,left:35});if(this.stats.kills%8===0)this.pickups.push({type:'health',x:z.x+10,y:z.y,left:35});}}
 explode(barrel){if(barrel.hp<=0&&barrel.spent)return;barrel.hp=0;barrel.spent=true;this.emit('explosion',{x:barrel.x,y:barrel.y,radius:125});for(const z of this.zombies)if(!z.dead&&distance(z,barrel)<125&&this.clearRoute(barrel,z))this.damageZombie(z,170*(1-distance(z,barrel)/230));if(distance(this.player,barrel)<90&&this.clearRoute(barrel,this.player))this.damagePlayer(25,'fuel can');}
 wallDistance(origin,dir,limit){let d=limit;for(const o of this.obstacles)if(!o.walkwayRail||(origin.groundHeight??this.surfaceHeight?.(origin.x,origin.y)??0)<.5)d=Math.min(d,rayRect(origin,dir,o,limit));for(const o of [{x:0,y:0,w:45,h:this.height},{x:this.width-45,y:0,w:45,h:this.height},{x:0,y:0,w:this.width,h:45},{x:0,y:this.height-45,w:this.width,h:45}])d=Math.min(d,rayRect(origin,dir,o,limit));return d;}
 shoot(){const p=this.player,gun=this.gun(),spec=GUNS[gun.id];if(this.status!=='playing'||p.roll>0||p.reload||p.fireCooldown>0)return false;if(gun.ammo<=0){this.reload();return false;}gun.ammo--;p.fireCooldown=spec.interval;p.recoil=.09;this.stats.shots++;const origin=muzzle(p),paths=[];let connected=false;
  const toMuzzle=angleTo(p,origin),muzzleDistance=distance(p,origin),blocked=this.wallDistance(p,polar(toMuzzle,1),muzzleDistance);
  if(blocked<muzzleDistance-.01){paths.push({a:v(p.x,p.y),b:add(p,polar(toMuzzle,blocked)),kind:'wall'});}
  else for(let pellet=0;pellet<spec.pellets;pellet++){
   const spread=spec.spread*(p.focus?.48:1),angle=p.aim+(spec.pellets>1?(pellet/(spec.pellets-1)*2-1)*spread:this.rng.range(-spread,spread)),dir=polar(angle,1),wall=this.wallDistance(origin,dir,spec.range),hits=[];
   for(const z of this.zombies)if(!z.dead){const t=rayCircle(origin,dir,z,z.r,wall);if(Number.isFinite(t))hits.push({type:'zombie',z,t});}
   for(const b of this.barrels)if(!b.spent){const t=rayCircle(origin,dir,b,12,wall);if(Number.isFinite(t))hits.push({type:'barrel',b,t});}
   hits.sort((a,b)=>a.t-b.t);let end=wall,count=0,kind=wall<spec.range?'wall':'air';
   for(const hit of hits){if(hit.type==='zombie'&&hit.z.dead)continue;connected=true;end=hit.t;kind=hit.type;
    const falloff=gun.id==='shotgun'?clamp(1-hit.t/spec.range*.4,.55,1):1,damage=spec.damage*this.mods.damage*(gun.tuned?1.25:1)*falloff*(count?.72:1);
    if(hit.type==='barrel'){hit.b.hp-=damage;if(hit.b.hp<=0)this.explode(hit.b);break;}
    this.damageZombie(hit.z,damage);count++;if(count>=spec.pierce)break;end=wall;kind=wall<spec.range?'wall':'air';
   }paths.push({a:origin,b:add(origin,polar(angle,end)),kind});
  }
  if(connected)this.stats.connected++;this.emit('shot',{gun:gun.id,x:origin.x,y:origin.y,paths});return true;
 }
 clearRoute(a,b,r=0){
  if(r<=0)return !this.obstacles.some(o=>rectHit(a,b,o,r));
  const dx=b.x-a.x,dy=b.y-a.y,length2=dx*dx+dy*dy,radius2=r*r;
  return !this.obstacles.some(o=>{
   if(!rectHit(a,b,o,r))return false;
   // Match resolveWalls' circular bodies: padded sides with rounded corners.
   if(rectHit(a,b,{x:o.x-r,y:o.y,w:o.w+2*r,h:o.h})||rectHit(a,b,{x:o.x,y:o.y-r,w:o.w,h:o.h+2*r}))return true;
   for(let i=0;i<4;i++){const x=o.x+(i&1?o.w:0),y=o.y+(i&2?o.h:0),t=length2?clamp(((x-a.x)*dx+(y-a.y)*dy)/length2,0,1):0,ex=a.x+dx*t-x,ey=a.y+dy*t-y;if(ex*ex+ey*ey<=radius2)return true;}
   return false;
  });
 }
 validPosition(p,r){return p.x>45+r&&p.x<this.width-45-r&&p.y>45+r&&p.y<this.height-45-r&&this.clearRoute(p,p,r);}
 resolveWalls(f){f.x=clamp(f.x,45+f.r,this.width-45-f.r);f.y=clamp(f.y,45+f.r,this.height-45-f.r);for(const o of this.obstacles){const q=v(clamp(f.x,o.x,o.x+o.w),clamp(f.y,o.y,o.y+o.h)),d=distance(f,q);if(d<f.r){if(d>1e-7){const m=(f.r-d)/d;f.x+=(f.x-q.x)*m;f.y+=(f.y-q.y)*m;}else{const e=[{d:f.x-o.x,x:o.x-f.r,y:f.y},{d:o.x+o.w-f.x,x:o.x+o.w+f.r,y:f.y},{d:f.y-o.y,x:f.x,y:o.y-f.r},{d:o.y+o.h-f.y,x:f.x,y:o.y+o.h+f.r}].sort((a,b)=>a.d-b.d)[0];f.x=e.x;f.y=e.y;}}}}
 navGraph(radius){if(this.navObstacles!==this.obstacles){this.navObstacles=this.obstacles;this.navGraphs=new Map();}if(this.navGraphs.has(radius))return this.navGraphs.get(radius);const pad=radius+10,nodes=[];for(const o of this.obstacles)for(const p of [v(o.x-pad,o.y-pad),v(o.x+o.w+pad,o.y-pad),v(o.x-pad,o.y+o.h+pad),v(o.x+o.w+pad,o.y+o.h+pad)])if(this.validPosition(p,radius))nodes.push(p);const edges=nodes.map(()=>[]);for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(this.clearRoute(nodes[i],nodes[j],radius-.25)){const d=distance(nodes[i],nodes[j]);edges[i].push([j,d]);edges[j].push([i,d]);}const graph={nodes,edges};this.navGraphs.set(radius,graph);return graph;}
 routeTo(f,goal){if(!this.clearRoute(goal,goal,f.r-.25))return null;const {nodes,edges}=this.navGraph(f.r),cost=nodes.map(p=>this.clearRoute(f,p,f.r-.25)?distance(f,p):Infinity),parent=nodes.map(()=>-1),used=new Set();let end=-1,best=Infinity;for(let i=0;i<nodes.length;i++){let u=-1;for(let j=0;j<nodes.length;j++)if(!used.has(j)&&(u<0||cost[j]<cost[u]))u=j;if(u<0||!Number.isFinite(cost[u])||cost[u]>=best)break;used.add(u);if(this.clearRoute(nodes[u],goal,f.r-.25)&&cost[u]+distance(nodes[u],goal)<best){best=cost[u]+distance(nodes[u],goal);end=u;}for(const [j,d] of edges[u])if(cost[u]+d<cost[j]){cost[j]=cost[u]+d;parent[j]=u;}}if(end<0)return null;const route=[];for(let u=end;u>=0;u=parent[u])route.unshift(nodes[u]);return route;}
 waypoint(f,goal){if(this.clearRoute(f,goal,f.r-.25)){f.navPath=null;return goal;}if(!f.navPath||!f.navPath.length||this.time>=f.navUntil||!f.navGoal||distance(f.navGoal,goal)>38||!this.clearRoute(f,f.navPath[0],f.r-.25)){f.navPath=this.routeTo(f,goal);f.navGoal=v(goal.x,goal.y);f.navUntil=this.time+.8;}if(!f.navPath)return null;while(f.navPath.length&&distance(f,f.navPath[0])<7)f.navPath.shift();return f.navPath[0]||goal;}
 spawnZombie(kind,x,y){const spec=ZOMBIES[kind],scale=1+this.wave*(kind==='brute'?0.12:0.08);const z={id:++this.serial,kind,x,y,r:spec.radius,hp:spec.health*scale,maxHp:spec.health*scale,speed:spec.speed+this.wave*(kind==='runner'?1.8:1.1),aim:angleTo({x,y},this.player),step:0,dead:false,flash:0,attack:null,cooldown:.6,navPath:null,navUntil:0,navGoal:null};this.zombies.push(z);this.emit('spawn',{id:z.id,kind,x,y});return z;}
 spawnPoint(){const points=[v(100,180),v(720,75),v(1325,175),v(1360,530),v(1320,875),v(720,965),v(110,890),v(80,530)],eligible=points.filter(p=>distance(p,this.player)>=RULES.spawnDistance&&this.validPosition(p,23));if(this.wave<2)eligible.sort((a,b)=>distance(b,this.player)-distance(a,this.player));const list=this.wave<2?eligible.slice(0,3):eligible;return list[Math.floor(this.rng.next()*list.length)]||points.slice().sort((a,b)=>distance(b,this.player)-distance(a,this.player))[0];}
 director(dt){const cap=this.mode==='range'?2:WAVES[this.wave].cap,gap=this.mode==='range'?3.2:WAVES[this.wave].gap;for(let i=this.warnings.length-1;i>=0;i--){const w=this.warnings[i];w.left-=dt;if(w.left>0)continue;if(distance(w,this.player)<RULES.spawnMinimum){const p=this.spawnPoint();w.x=p.x;w.y=p.y;w.left=RULES.spawnWarning;continue;}this.spawnZombie(w.kind,w.x,w.y);this.warnings.splice(i,1);}
  const active=this.zombies.filter(z=>!z.dead).length;if(this.mode==='range'&&!this.queue.length&&active+this.warnings.length<cap)this.queue.push('walker');
  if(this.time>=this.nextSpawn&&this.queue.length&&active+this.warnings.length<cap){const p=this.spawnPoint(),kind=this.queue.shift();this.warnings.push({x:p.x,y:p.y,kind,left:RULES.spawnWarning});this.nextSpawn=this.time+gap;this.emit('spawn_warning',{x:p.x,y:p.y,kind});}
  if(this.mode!=='range'&&!this.queue.length&&!this.warnings.length&&!active)this.completeWave();
 }
 updateZombie(z,dt){if(z.dead)return;z.flash=Math.max(0,z.flash-dt);z.cooldown=Math.max(0,z.cooldown-dt);const actor=this.zombieTarget(z);const decoy=this.zombieDecoy(z),target=decoy||actor;
  z.contactPlayer=!decoy&&actor===this.player;
  if(z.attack){
   const swipe=z.attack,victim=this.actorById(swipe.targetId||'player');swipe.left-=dt;
   // A short committed step follows the tell. It cannot turn after the attack begins.
   if(swipe.player&&victim&&swipe.left<swipe.total*.55&&swipe.stepLeft>0){
    const step=Math.min(swipe.stepLeft,z.speed*dt*(z.kind==='runner'?1.5:.85),Math.max(0,distance(z,victim)-z.r-victim.r)),x=z.x,y=z.y;
    z.x+=Math.cos(swipe.aim)*step;z.y+=Math.sin(swipe.aim)*step;this.resolveWalls(z);
    const moved=Math.hypot(z.x-x,z.y-y);swipe.stepLeft=Math.max(0,swipe.stepLeft-moved);z.step+=moved*.07;
   }
   if(swipe.left<=0){if(swipe.player&&victim&&distance(z,victim)<z.r+victim.r+RULES.meleeReach&&Math.abs(wrap(angleTo(z,victim)-swipe.aim))<RULES.meleeArc&&this.clearRoute(z,victim))this.damageActor(victim,ZOMBIES[z.kind].damage,z.kind);z.attack=null;z.cooldown=z.kind==='runner'?.75:z.kind==='brute'?1.05:.9;}return;
  }
  const d=distance(z,target);let visible=this.clearRoute(z,target,z.r-.25),goal=target,flanking=false;
  // A player can stand nearer a prop than a wider zombie can. Aim the route at a legal nearby body position.
  if(!visible&&target===this.player&&!this.validPosition(target,z.r-.25)){
   const q={x:target.x,y:target.y,r:z.r+.5};this.resolveWalls(q);
   if(this.validPosition(q,z.r)&&distance(q,target)<z.r+target.r+RULES.meleeReach&&this.clearRoute(q,target)){
    goal=q;visible=this.clearRoute(z,q,z.r-.25)&&this.clearRoute(z,target);
   }
  }
  // Some runners cut across a predictable route; walls and close swipes still use real positions.
  // Mix IDs so the regular spawn sequence cannot assign a whole group the same behavior.
  if(!decoy&&this.mode!=='range'&&z.kind==='runner'&&(actor===this.player&&this.wave<7?(Math.imul(z.id,0x9e3779b1)>>>0)%3!==0:z.id%3!==0)&&d>z.r+actor.r-2&&d<420){
   const vx=Number.isFinite(actor.vx)?actor.vx:0,vy=Number.isFinite(actor.vy)?actor.vy:0,speed=Math.hypot(vx,vy);
   if(speed>55){
    // Existing short pursuit and attack prediction remain the fallback when no cutoff is reachable.
    const q=this.pursuitPosition(actor,clamp(d/Math.max(1,z.speed)*.8,.55,.9)),intercept=actor===this.player&&this.wave<7?this.runnerIntercept(z,actor):null,dx=q.x-z.x,dy=q.y-z.y;
    // Short pursuit must still close on the actor when no reachable intercept is available.
    if(intercept)goal=intercept;else if(dx*(actor.x-z.x)+dy*(actor.y-z.y)>d*Math.hypot(dx,dy)*.25&&this.validPosition(q,z.r)&&this.clearRoute(z,q,z.r-.25))goal=q;
   }
  }
  if(z.kind==='runner'&&this.mode!=='range'&&this.wave<7){
   if(!decoy&&actor===this.player){
    const flank=this.runnerFlank(z,actor);if(flank){goal=flank;flanking=true;}
   }else{delete z.flank;delete z.chaseSince;}
  }
  z.aim=turn(z.aim,angleTo(z,goal),dt*3.8);
  const swipeStep=z.kind==='runner'?42:z.kind==='brute'?12:14;
  // Keep pursuing when a moving target would already be beyond the committed swipe.
  const windup=ZOMBIES[z.kind].windup,strike=z.kind==='runner'&&!decoy?this.pursuitPosition(target,windup):target;
  const reachable=z.kind!=='runner'||distance(z,strike)<z.r+actor.r+RULES.meleeReach+swipeStep;
  // Start outside body contact, then require the same small hit range and facing at impact.
  if(reachable&&visible&&d<z.r+actor.r+RULES.meleeReach+Math.min(swipeStep,20)&&z.cooldown<=0&&Math.abs(wrap(angleTo(z,strike)-z.aim))<RULES.meleeArc){
   if(!decoy&&z.kind==='runner')z.aim=turn(z.aim,angleTo(z,strike),.65);
   z.attack={left:windup,total:windup,aim:z.aim,stepLeft:swipeStep,player:!decoy,targetId:actor.actorId||'player'};return;
  }
  let move=v(0,0),pursuit=null;if(d>z.r+actor.r+4||!visible){const q=this.waypoint(z,goal);if(q){move=polar(angleTo(z,q),1);pursuit=visible&&!flanking?polar(angleTo(z,target),1):v(move.x,move.y);}}
  for(const other of this.zombies){if(other===z||other.dead)continue;const gap=distance(z,other),space=z.r+other.r+10;if(gap<space){const a=gap>.01?angleTo(other,z):z.id*2.399,force=(1-gap/space)*1.1;move=add(move,polar(a,force));}}
  // Crowd spacing can slide sideways but cannot reverse an active chase or wall route.
  if(pursuit){const forward=move.x*pursuit.x+move.y*pursuit.y;if(forward<.25){move.x+=pursuit.x*(.25-forward);move.y+=pursuit.y*(.25-forward);}}
  const m=Math.hypot(move.x,move.y),speed=z.speed*(m>1?1/m:1);z.x+=move.x*speed*dt;z.y+=move.y*speed*dt;z.step+=m*speed*dt*.07;this.resolveWalls(z);
 }
 tick(dt,input={}){if(this.status!=='playing')return;dt=clamp(dt,0,1/60);if(!dt)return;this.time+=dt;this.waveTime+=dt;this.stats.seconds+=dt;const p=this.player;for(const name of ['hurtGrace','fireCooldown','flash','recoil','rollCooldown'])p[name]=Math.max(0,p[name]-dt);
  p.wanted=Number.isFinite(input.aim)?input.aim:p.wanted;p.aim=turn(p.aim,p.wanted,dt*10);p.body=turn(p.body,p.aim,dt*6);p.focus=!!input.focus;const move=input.move||v(0,0),m=Math.hypot(move.x,move.y);
  if(input.switch)this.switchGun();if(input.heal)this.heal();if(input.lure)this.lure();if(input.roll)this.roll(move);if(input.reload)this.reload();
  if(p.reload){p.reload.left-=dt;if(p.reload.left<=0){const gun=p.guns[p.reload.slot],need=GUNS[gun.id].mag-gun.ammo,amount=Math.min(need,gun.reserve);gun.ammo+=amount;gun.reserve-=amount;p.reload=null;this.emit('reload_done',{gun:gun.id});}}
  if(p.roll>0){const duration=p.watchDashDuration||RULES.rollDuration,step=p.watchDashDuration?Math.min(dt,p.roll):dt,u=clamp(1-p.roll/duration+step/(2*duration),0,1),speed=RULES.rollDistance/duration*(.4+.6*Math.sin(PI*u))/(.4+1.2/PI)*(dt>0?step/dt:1);p.roll=Math.max(0,p.roll-dt);if(p.watchDashDuration&&p.roll<1e-9)p.roll=0;p.vx=Math.cos(p.rollHeading)*speed;p.vy=Math.sin(p.rollHeading)*speed;}
  else{const speed=p.speed*(p.focus?.78:1),a=1-Math.exp(-dt*15);p.vx=mix(p.vx,move.x/Math.max(1,m)*speed,a);p.vy=mix(p.vy,move.y/Math.max(1,m)*speed,a);}
  this.movePlayer(dt);p.step+=Math.hypot(p.vx,p.vy)*dt*.075;p.stamina=clamp(p.stamina+(p.roll>0?0:25)*dt,0,100);
  this.updateInteraction(dt,!!input.interact,!!input.fire||p.roll>0,input.interactTap);
  if(input.fire)this.shoot();if(this.status!=='playing')return;this.updateDevices(dt);this.director(dt);if(this.status!=='playing')return;
  for(const z of this.zombies){this.updateZombie(z,dt);if(this.status!=='playing')break;}
  // The player is never pushed around by a crowd's summed movement forces.
  for(const z of this.zombies)if(!z.dead){
   if(this.dashGhosts(z))continue;const d=distance(p,z),minimum=p.r+z.r*.84;
   if(d<minimum){
    // Body overlap is a real hit opportunity before crowd separation removes it.
    // Keep distractions, attack recovery, stun, walls and all player protection rules.
    const contact=z.contactPlayer&&!z.boss&&!(z.animalStun>0)&&z.cooldown<=0&&p.hurtGrace<=0&&!this.arcade?.vehicle&&this.clearRoute(z,p);
    const a=d>.001?angleTo(p,z):z.id*2.399;z.x=p.x+Math.cos(a)*minimum;z.y=p.y+Math.sin(a)*minimum;this.resolveWalls(z);
    if(contact&&this.damagePlayer(ZOMBIES[z.kind].damage,z.kind)){z.attack=null;z.cooldown=z.kind==='runner'?.75:z.kind==='brute'?1.05:.9;}
    if(this.status!=='playing')break;
   }
  }
  this.decoys=this.decoys.filter(d=>(d.left-=dt)>0);for(const item of this.pickups){item.left-=dt;if(item.left>0&&distance(item,p)<34&&this.clearRoute(p,item)){if(item.type==='health'){if(p.hp>=p.maxHp)continue;p.hp=Math.min(p.maxHp,p.hp+20);}else{const gun=p.guns[0],spec=GUNS[gun.id];if(Number.isFinite(gun.reserve))gun.reserve=Math.min(spec.reserve,gun.reserve+spec.mag);}item.left=0;this.emit('pickup',{pickupType:item.type,x:item.x,y:item.y});}}this.pickups=this.pickups.filter(i=>i.left>0);
  this.zombies=this.zombies.filter(z=>!z.dead||this.time-z.deathTime<13);
  if(Math.floor(this.time*12)!==Math.floor((this.time-dt)*12)){this.frames.push({t:+this.time.toFixed(3),wave:this.wave+1,points:this.points,power:this.power,interaction:this.interaction?.id||null,trap:this.trap.active>0,x:+p.x.toFixed(1),y:+p.y.toFixed(1),aim:+p.aim.toFixed(3),hp:p.hp,gun:this.gun().id,ammo:this.gun().ammo,reserve:Number.isFinite(this.gun().reserve)?this.gun().reserve:'unlimited',reload:p.reload?.left||0,roll:p.roll,active:this.zombies.filter(z=>!z.dead).length,queued:this.queue.length,warnings:this.warnings.length,zombies:Math.floor(this.time*12)%4===0?this.zombies.filter(z=>!z.dead).map(z=>({id:z.id,kind:z.kind,x:+z.x.toFixed(1),y:+z.y.toFixed(1),hp:+z.hp.toFixed(1),bite:!!z.attack})):undefined});if(this.frames.length>3000)this.frames.shift();}
 }
 export(){return {version:'Deadwatch_0.4',parent:'Deadwatch_0.3',date:new Date().toISOString(),mode:this.mode,wave:this.wave+1,loadout:this.loadout,status:this.status,rules:RULES,waves:WAVES,stats:this.stats,depot:this.depotTrace(),events:this.log,frames:this.frames};}
}
const api={Game,Random,GUNS,ZOMBIES,WAVES,RULES,rayCircle,rayRect,muzzle,clamp,mix,wrap,angleTo,distance,turn,v,add,rotate,polar,closest,rectHit};
if(typeof module==='object'&&module.exports)module.exports=api;else root.DeadwatchCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);


/* Deadwatch 0.4: optional supply runs. Extends the preserved 0.3 simulation. */
(function(root){'use strict';
function install(C){
 const RULES=Object.freeze({flight:5,lifetime:35,points:300,magazines:2,lures:1,callHold:.8,claimHold:.9});
 const SITES=Object.freeze([{x:1150,y:655},{x:1140,y:250},{x:1170,y:870},{x:285,y:220},{x:240,y:870},{x:690,y:850}]);
 class SupplyGame extends C.Game{
  initDepot(){
   super.initDepot();
   this.supply={phase:'idle',usedWave:-1,drop:null,called:0,recovered:0,expired:0};
   this.stations.push({id:'radio',kind:'radio',name:'SUPPLY RADIO',icon:'D',x:570,y:870,powered:true});
  }
  supplySite(){
   // Fixed rotating sites do not consume combat randomness or enemy IDs.
   const start=((this.seed>>>0)+this.wave)%SITES.length;
   for(let i=0;i<SITES.length;i++){
    const q=SITES[(start+i)%SITES.length];
    if(C.distance(q,this.player)>=350&&this.validPosition(q,28)&&this.stations.every(s=>s.kind==='cache'||C.distance(q,s)>105)&&this.barrels.every(b=>b.spent||C.distance(q,b)>145))return {...q};
   }
   return null;
  }
  stationOffer(s){
   if(s.kind!=='radio'&&s.kind!=='cache')return super.stationOffer(s);
   const offer={id:s.id,x:s.x,y:s.y,kind:s.kind,title:'Call a supply drop',detail:'300 points · two reserve magazines · one lure',action:'supply_call',cost:0,duration:RULES.callHold,enabled:true,reason:''};
   if(s.kind==='cache'){
    Object.assign(offer,{title:'Recover supply crate',detail:'300 points · up to two reserve magazines + one lure',action:'supply_claim',duration:RULES.claimHold});
    if(this.supply.phase!=='ready'||this.supply.drop!==s||s.left<=0)offer.reason='CRATE EXPIRED';
   }else if(!this.power)offer.reason='POWER REQUIRED';
   else if(this.mode!=='range'&&this.wave<1)offer.reason='AVAILABLE FROM WAVE 2';
   else if(this.supply.phase!=='idle')offer.reason=this.supply.phase==='inbound'?'DROP INBOUND':'RECOVER THE ACTIVE CRATE';
   else if(this.mode!=='range'&&this.supply.usedWave===this.wave)offer.reason='NEXT CALL: NEXT WAVE';
   else if(!this.supplySite())offer.reason='NO CLEAR DROP SITE';
   offer.enabled=!offer.reason;return offer;
  }
  completeInteraction(id){
   if(id!=='radio'&&id!=='supply-crate')return super.completeInteraction(id);
   const offer=this.interactionOffer();if(!offer||offer.id!==id||!offer.enabled)return false;
   const state=this.supply;
   if(offer.action==='supply_call'){
    const q=this.supplySite();if(!q)return false;
    state.phase='inbound';state.usedWave=this.wave;state.called++;
    state.drop={id:'supply-crate',kind:'cache',name:'SUPPLY CRATE',icon:'◆',powered:false,...q,flightLeft:RULES.flight,left:RULES.lifetime};
    this.emit('supply_called',{...q,flight:RULES.flight,lifetime:RULES.lifetime,wave:this.wave+1});
   }else{
    const drop=state.drop,gun=this.player.guns[0],spec=C.GUNS[gun.id],beforeAmmo=gun.reserve,beforeLures=this.player.lures;
    if(Number.isFinite(gun.reserve))gun.reserve=Math.min(spec.reserve,gun.reserve+spec.mag*RULES.magazines);
    this.player.lures=Math.min(3,this.player.lures+RULES.lures);
    this.awardPoints(RULES.points,drop.x,drop.y);
    state.recovered++;
    this.emit('supply_recovered',{x:drop.x,y:drop.y,points:RULES.points,ammo:Number.isFinite(beforeAmmo)?gun.reserve-beforeAmmo:0,lures:this.player.lures-beforeLures,gun:gun.id});
    this.removeSupply();
   }
   this.depotStats.interactions++;
   this.emit('interaction_complete',{station:id,action:offer.action,cost:0,points:this.points,x:offer.x,y:offer.y,title:offer.title});
   return true;
  }
  removeSupply(){
   this.stations=this.stations.filter(s=>s.id!=='supply-crate');
   if(this.interaction?.id==='supply-crate')this.cancelInteraction();
   this.supply.phase='idle';this.supply.drop=null;
  }
  updateDevices(dt){
   super.updateDevices(dt);
   const state=this.supply,drop=state.drop;if(!drop)return;
   if(state.phase==='inbound'){
    drop.flightLeft=Math.max(0,drop.flightLeft-dt);
    if(drop.flightLeft<1e-8){drop.flightLeft=0;state.phase='ready';this.stations.push(drop);this.emit('supply_landed',{x:drop.x,y:drop.y,lifetime:RULES.lifetime});}
   }else if(state.phase==='ready'){
    drop.left=Math.max(0,drop.left-dt);
    if(drop.left<1e-8){state.expired++;this.emit('supply_expired',{x:drop.x,y:drop.y});this.removeSupply();}
   }
  }
  depotTrace(){return {...super.depotTrace(),supply:{...this.supply,drop:this.supply.drop?{...this.supply.drop}:null}};}
 }
 return {...C,Game:SupplyGame,SUPPLY_RULES:RULES};
}
if(typeof module==='object'&&module.exports)module.exports=install(require('./core.js'));
else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);


/* Deadwatch 0.8: Contact Damage. Immediate zombie contact hits on top of 0.7 swarm pressure. */
(function(root){'use strict';
function install(C){
 const A=(id,name,kind,start,obstacles,barrels,spawns,stations,supplies,theme)=>({id,name,kind,start,obstacles:obstacles.map(o=>({x:o[0],y:o[1],w:o[2],h:o[3]})),barrels:barrels.map(p=>({x:p[0],y:p[1]})),spawns:spawns.map(p=>({x:p[0],y:p[1]})),stations,supplies:supplies.map(p=>({x:p[0],y:p[1]})),theme});
  // Four readable arena entrances. Three lanes per gate keep burst spawns separated.
  const edgeSpawns=[[678,82],[720,82],[762,82],[1358,478],[1358,520],[1358,562],[762,958],[720,958],[678,958],[82,562],[82,520],[82,478]];
 const ARENAS=Object.freeze([
  A('depot','North Depot','depot',[720,520],[[405,300,160,60],[890,300,75,145],[390,715,100,70],[845,705,185,55]],[[605,305],[1030,470],[750,780],[325,610]],edgeSpawns,{generator:[560,420],carbine:[340,325],shotgun:[1030,370],scout:[1060,810],clinic:[345,795],bench:[850,215],trap:[720,450],radio:[570,870],trapField:[720,335,105]},[[1150,655],[1140,250],[1170,870],[285,220],[240,870],[690,850]],['#243940','#354a4c','#1b2b32','#d0c996']),
  A('breakwater','Breakwater','beach',[700,520],[[260,225,230,65],[705,180,85,250],[970,515,245,70],[330,655,95,215],[675,760,215,65]],[[540,245],[905,245],[1240,685],[555,875]],edgeSpawns,{generator:[540,500],carbine:[190,390],shotgun:[1215,390],scout:[1120,850],clinic:[245,845],bench:[910,150],trap:[705,640],radio:[530,900],trapField:[705,560,105]},[[1160,760],[1100,180],[230,190],[215,760],[620,900],[920,895]],['#8f7855','#c1a978','#2c5664','#f2d58f']),
  A('memorial','Memorial Park','graveyard',[720,505],[[235,280,270,80],[910,245,205,80],[590,620,265,95],[1030,710,120,170],[285,760,175,70]],[[560,355],[1195,405],[905,820],[520,865]],edgeSpawns,{generator:[610,470],carbine:[210,570],shotgun:[1190,570],scout:[1180,870],clinic:[230,865],bench:[830,170],trap:[760,455],radio:[565,900],trapField:[760,545,110]},[[1220,210],[1230,890],[215,205],[220,900],[830,890],[885,390]],['#253a2c','#42563d','#171f1a','#b7b07c']),
  A('pump','Pump Station','pump',[720,665],[[285,210,125,280],[1015,210,125,280],[555,745,330,70],[630,255,180,80],[570,500,110,110],[760,500,110,110]],[[485,300],[950,300],[500,650],[940,650]],edgeSpawns,{generator:[720,410],carbine:[210,565],shotgun:[1230,565],scout:[1080,875],clinic:[260,875],bench:[900,155],trap:[720,620],radio:[545,915],trapField:[720,535,100]},[[1190,820],[1190,165],[245,170],[230,825],[500,880],[950,880]],['#17363b','#2b5557','#102a32','#79d6c1']),
  A('cold','Cold Storage','cold',[720,865],[[245,215,325,90],[870,215,325,90],[245,700,325,90],[870,700,325,90],[665,410,110,205]],[[610,340],[830,340],[610,660],[830,660]],edgeSpawns,{generator:[720,350],carbine:[185,500],shotgun:[1250,500],scout:[1125,865],clinic:[260,865],bench:[925,360],trap:[720,640],radio:[520,915],trapField:[720,530,105]},[[1215,350],[1210,900],[225,350],[225,900],[475,535],[970,535]],['#9fbac2','#d9e8e7','#405964','#d8ffff']),
  A('rail','Rail Crossing','rail',[720,610],[[165,295,435,70],[840,295,435,70],[350,675,310,70],[805,675,310,70],[665,455,110,125]],[[635,220],[805,220],[635,825],[805,825]],edgeSpawns,{generator:[720,405],carbine:[190,505],shotgun:[1245,505],scout:[1170,865],clinic:[245,865],bench:[925,165],trap:[720,625],radio:[540,915],trapField:[720,540,100]},[[1210,830],[1180,165],[235,165],[225,830],[510,850],[940,850]],['#4a3b31','#6c5543','#241d1a','#d39a62']),
  A('quarantine','Quarantine Camp','camp',[720,505],[[205,205,175,105],[470,190,175,105],[795,190,175,105],[1060,205,175,105],[285,650,190,115],[645,690,150,115],[965,650,190,115]],[[425,470],[1015,470],[525,840],[915,840]],edgeSpawns,{generator:[720,385],carbine:[180,520],shotgun:[1260,520],scout:[1185,870],clinic:[210,865],bench:[850,345],trap:[720,620],radio:[520,915],trapField:[720,535,105]},[[1240,850],[1240,360],[200,360],[200,850],[520,520],[940,520]],['#3e4630','#626848','#25291f','#d3bd70']),
  A('evac','Evacuation Zone','evac',[720,525],[[175,420,260,55],[1005,420,260,55],[470,235,130,170],[840,235,130,170],[505,700,175,75],[760,700,175,75]],[[445,610],[995,610],[580,835],[860,835]],edgeSpawns,{generator:[720,620],carbine:[210,300],shotgun:[1230,300],scout:[1140,860],clinic:[260,860],bench:[845,160],trap:[720,455],radio:[525,905],trapField:[720,540,115]},[[1210,840],[1200,180],[230,180],[220,840],[480,600],[960,600]],['#34363d','#56565a','#1f2027','#f0a35f'])
 ]);
 const PRESSURE_WAVES=Object.freeze([{total:24,cap:20,gap:1.15,burst:4},{total:34,cap:24,gap:1.10,burst:4},{total:46,cap:28,gap:1.05,burst:4},{total:60,cap:30,gap:1.00,burst:4},{total:76,cap:32,gap:.98,burst:5},{total:88,cap:34,gap:.96,burst:5},{total:104,cap:36,gap:.94,burst:5},{total:120,cap:38,gap:.92,burst:5}]);
 const MIXES=Object.freeze([{runner:9,brute:0},{runner:14,brute:1},{runner:20,brute:2},{runner:27,brute:3},{runner:35,brute:5},{runner:36,brute:5},{runner:44,brute:7},{runner:52,brute:10}]);
 const ROUND_PACING=Object.freeze({seconds:120,clearRelief:2,eventRelief:2});
 const PAR=Object.freeze([42,52,64,76,90,104,120,138].map(t=>t+ROUND_PACING.seconds));
 const POWER_DROP_EVERY=15;
 function mixedQueue(wave,total){const spec=MIXES[wave]||MIXES[MIXES.length-1],counts={walker:Math.max(0,total-spec.runner-spec.brute),runner:spec.runner,brute:spec.brute},out=[];for(let i=0;i<total;i++){let pick='walker';const left=total-i;if(counts.brute>0&&i>2&&((i+wave*2)%Math.max(4,Math.floor(total/spec.brute)))===0)pick='brute';else if(counts.runner>0&&((i+wave)%3===1||counts.runner>=left-counts.brute))pick='runner';else if(counts.walker<=0)pick=counts.runner?'runner':'brute';if(counts[pick]<=0)pick=counts.walker?'walker':counts.runner?'runner':'brute';counts[pick]--;out.push(pick);}return out;}
 class RouteGame extends C.Game{
  start(mode='campaign',loadout='carbine'){
   this.score=0;this.scoreBreakdown={combat:0,treasure:0,chain:0,round:0};this.streak=0;this.bestStreak=0;this.lastKillAt=-999;this.lastWaveScore=null;this.arenaHistory=[];this.arcadePickups=[];this.arcade={rapid:0,insta:0,picked:0};this.lastPressureToast=-999;
   const out=super.start(mode,loadout);if(mode!=='range'){this.player.maxHp=100;this.player.hp=100;this.player.medkits=Math.min(1,this.player.medkits);this.player.lures=Math.min(2,this.player.lures);}return out;
  }
  applyArena(wave){
   const arena=ARENAS[Math.max(0,Math.min(ARENAS.length-1,wave))];this.arena=arena;this.arenaIndex=wave;this.obstacles=arena.obstacles.map(o=>({...o}));this.navGraphs=new Map();this.navObstacles=null;
   this.zombies=[];this.pickups=[];this.arcadePickups=[];this.warnings=[];this.decoys=[];
   this.barrels=arena.barrels.map(p=>({id:++this.serial,x:p.x,y:p.y,hp:28}));
   if(this.player){this.player.x=arena.start[0];this.player.y=arena.start[1];this.player.vx=this.player.vy=0;}
   if(this.stations){this.stations=this.stations.filter(s=>s.id!=='supply-crate');for(const s of this.stations){const p=arena.stations[s.id];if(p){s.x=p[0];s.y=p[1];}}}
   if(this.trap){const q=arena.stations.trapField;this.trap.x=q[0];this.trap.y=q[1];this.trap.radius=q[2];this.trap.arming=0;this.trap.active=0;this.trap.pulse=0;}
   if(this.supply?.drop){const q=this.supplySite();if(q){Object.assign(this.supply.drop,q);if(this.supply.phase==='ready')this.stations.push(this.supply.drop);}else{this.supply.expired++;this.emit('supply_expired',{x:this.supply.drop.x,y:this.supply.drop.y,relocated:true});this.removeSupply();}}
  }
  beginWave(wave){
   this.wave=wave;this.applyArena(wave);super.beginWave(wave);if(this.mode!=='range')this.queue=mixedQueue(wave,PRESSURE_WAVES[wave].total);this.waveStartedAt=this.time;this.streak=0;this.lastKillAt=-999;this.arenaHistory.push({wave:wave+1,id:this.arena.id,name:this.arena.name});this.emit('arena_start',{wave:wave+1,arena:this.arena.id,name:this.arena.name});
   this.roundPace=this.mode==='range'?null:{remaining:ROUND_PACING.seconds,finished:false,resting:false,peak:0,reliefUntil:0,eventUntil:0,pushCycle:-1,cap:Math.ceil(PRESSURE_WAVES[wave].cap*.7)};
  }
  roundFinishedSpawning(){return !this.roundPace||this.waveTime>=ROUND_PACING.seconds;}
  roundSpawnPlan(cfg){
   const pace=this.roundPace;if(!pace)return {cap:2,gap:3.2,burst:1,resting:false};
   const elapsed=this.waveTime,live=this.zombies.filter(z=>!z.dead),pressure=live.length+this.warnings.length+(this.antiCamp?.breachWarnings?.length||0);
   // A proper crowd clear earns a short escape window; picking off tiny groups does not stall the round.
   if(!pressure&&pace.peak>=Math.max(8,Math.ceil(cfg.cap*.55))){pace.reliefUntil=this.time+ROUND_PACING.clearRelief;pace.peak=0;}
   pace.peak=Math.max(pace.peak,pressure);
   const train=this.railTrain,air=this.campAir;
   // Pause entrances during the actual deployment. Survivors then share the normal crowd budget.
   const trainRush=train?.variant==='hostile'&&(train.phase==='opening'||train.phase==='active'&&train.cargo.length>0);
   const crashRush=air&&(['falling','skid'].includes(air.phase)||air.cargo.length>0);
   if(trainRush||crashRush)pace.eventUntil=this.time+ROUND_PACING.eventRelief;
   pace.remaining=Math.max(0,ROUND_PACING.seconds-elapsed);pace.finished=this.roundFinishedSpawning();
   const opening=elapsed<8,final=elapsed>=81,breather=elapsed>=38&&elapsed<41||elapsed>=78&&elapsed<81;
   const support=(this.squad||[]).filter(b=>!b.down&&b.hp>0).length;
   pace.cap=Math.ceil(cfg.cap*(opening?.7:final?1:.9)*(1+support*.20));
   pace.resting=pace.finished||breather||this.time<pace.reliefUntil||this.time<pace.eventUntil;
   return {cap:pace.cap,gap:cfg.gap*(opening?1.2:final?.82:1)/(1+support*.12),burst:opening?3:cfg.burst+(final?1:0),resting:pace.resting};
  }
  director(dt){
   const cfg=PRESSURE_WAVES[this.wave]||PRESSURE_WAVES[PRESSURE_WAVES.length-1],plan=this.roundSpawnPlan(cfg),cap=plan.cap,gap=plan.gap,warning=this.mode==='range'?C.RULES.spawnWarning:Math.max(.58,.98-this.wave*.055);
   if(this.roundPace?.finished)this.queue=[];
   else if(this.roundPace&&!plan.resting&&!this.queue.length)this.queue=mixedQueue(this.wave,cfg.total);
   for(let i=this.warnings.length-1;i>=0;i--){const w=this.warnings[i];w.left-=dt;if(w.left>0)continue;if(C.distance(w,this.player)<C.RULES.spawnMinimum){const p=this.spawnPoint();w.x=p.x;w.y=p.y;w.left=warning;continue;}this.spawnZombie(w.kind,w.x,w.y);this.warnings.splice(i,1);}
   const active=this.zombies.filter(z=>!z.dead).length;if(this.mode==='range'&&!this.queue.length&&active+this.warnings.length<cap)this.queue.push('walker');
   const pendingHunters=this.antiCamp?.breachWarnings?.length||0,slots=Math.max(0,cap-active-this.warnings.length-pendingHunters);
   if(!plan.resting&&this.time>=this.nextSpawn&&this.queue.length&&slots>0){
    // Two ordinary packets can arrive together, then pay for both spawn intervals.
    // Fixed wave windows never inspect whether the player is moving or where they aim.
    const pushTime=this.waveTime-18,cycle=Math.floor(pushTime/24);
    const push=this.mode!=='range'&&this.wave<7&&pushTime>=0&&pushTime%24<3&&this.roundPace.pushCycle!==cycle&&slots>=plan.burst*2&&this.queue.length>=plan.burst*2;
    if(push){
     this.roundPace.pushCycle=cycle;
     const front=[];for(const kind of ['brute','runner','runner']){const i=this.queue.indexOf(kind);if(i>=0)front.push(this.queue.splice(i,1)[0]);}
     this.queue.unshift(...front);
    }
    const count=Math.min(plan.burst*(push?2:1),slots,this.queue.length),points=this.spawnPoints(push?2:count);
    for(let i=0;i<count;i++){const p=points[push?i%points.length:i]||this.spawnPoint(),kind=this.queue.shift();this.warnings.push({x:p.x,y:p.y,kind,left:warning});this.emit('spawn_warning',{x:p.x,y:p.y,kind});}
    if(this.mode!=='range'&&count>=3&&this.time-this.lastPressureToast>8){this.lastPressureToast=this.time;this.emit('pressure_surge',{count});}
    this.nextSpawn=this.time+gap*(push?2:1);
   }
   if(this.mode!=='range'&&this.roundFinishedSpawning()&&!this.queue.length&&!this.warnings.length&&!pendingHunters&&!active)this.completeWave();
  }
  spawnZombie(kind,x,y){const z=super.spawnZombie(kind,x,y);if(this.mode!=='range'){const base=kind==='walker'?2.05:kind==='runner'?1.54:1.65,step=kind==='walker'?.025:kind==='runner'?.015:.025;z.speed*=base+this.wave*step;if(kind==='runner')z.speed=Math.min(z.speed,(184+Math.min(this.wave,5)*2)/C.RULES.runnerRush);z.pressureSpeed=z.speed;}return z;}
  updateZombie(z,dt){
   if(z.dead)return;
   if(this.mode==='range')return super.updateZombie(z,dt);
   const actor=this.zombieTarget(z),base=z.speed,d=C.distance(z,actor),rush=z.kind==='runner'&&d<280?C.RULES.runnerRush:this.wave>=4&&d<220?1.08:1;
   // Campaign pressure uses the shared, dodgeable swipe instead of instant radial damage.
   z.speed=base*rush;super.updateZombie(z,dt);z.speed=base;
  }
  tick(dt,input={}){
   if(this.status==='playing'){
    this.arcade.rapid=Math.max(0,this.arcade.rapid-dt);this.arcade.insta=Math.max(0,this.arcade.insta-dt);
    this.arcade.pickupLock=Math.max(0,(this.arcade.pickupLock||0)-dt);
    for(const q of this.arcadePickups){q.left-=dt;if(q.left>0&&this.arcade.pickupLock<=0&&C.distance(q,this.player)<40&&this.clearRoute(this.player,q)&&this.collectArcade(q)){q.left=0;this.arcade.pickupLock=.65;}}
    this.arcadePickups=this.arcadePickups.filter(q=>q.left>0);
   }
   return super.tick(dt,input);
  }
  collectArcade(q){
   this.arcade.picked++;if(q.type==='rapid')this.arcade.rapid=Math.max(this.arcade.rapid,7);else if(q.type==='insta')this.arcade.insta=Math.max(this.arcade.insta,5.5);else if(q.type==='bomb'){const live=this.zombies.filter(z=>!z.dead);for(const z of live)this.damageZombie(z,z.hp+1);}
   this.emit('arcade_power',{power:q.type,x:q.x,y:q.y});return true;
  }
  shoot(){const ok=super.shoot();if(ok&&this.arcade.rapid>0)this.player.fireCooldown*=.5;return ok;}
  spawnPoints(count=1){const points=this.arena?.spawns||[],eligible=points.filter(p=>C.distance(p,this.player)>=C.RULES.spawnDistance&&this.validPosition(p,23)),pool=(eligible.length?eligible:points).slice();if(!pool.length)return [C.v(100,180)];const chosen=[pool.splice(Math.floor(this.rng.next()*pool.length),1)[0]];while(chosen.length<count&&pool.length){let best=0,bestSep=-1;for(let i=0;i<pool.length;i++){const a=C.angleTo(this.player,pool[i]),sep=Math.min(...chosen.map(q=>Math.abs(C.wrap(a-C.angleTo(this.player,q)))));if(sep>bestSep){bestSep=sep;best=i;}}chosen.push(pool.splice(best,1)[0]);}return chosen;}
  spawnPoint(){return this.spawnPoints(1)[0];}
  supplySite(){const sites=this.arena?.supplies||[];const start=((this.seed>>>0)+this.wave)%Math.max(1,sites.length);for(let i=0;i<sites.length;i++){const q=sites[(start+i)%sites.length];if(C.distance(q,this.player)>=320&&this.validPosition(q,28)&&this.stations.every(s=>s.kind==='cache'||C.distance(q,s)>95)&&this.barrels.every(b=>b.spent||C.distance(q,b)>125))return {...q};}return null;}
  addScore(base,category='combat',multiply=true,details={}){
   if(!Number.isFinite(base)||base<=0||!Object.hasOwn(this.scoreBreakdown,category))return 0;
   const multiplier=multiply?(this.reward?.multiplier||1):1,amount=Math.round(base*multiplier);
   this.score+=amount;this.scoreBreakdown[category]+=amount;
   this.emit('score',{...details,amount,base,category,multiplier,score:this.score});
   this.checkScoreLives?.();return amount;
  }
  damageZombie(z,amount){const alive=!z.dead,pickupStart=this.pickups.length;if(this.arcade?.insta>0&&alive)amount=Math.max(amount,z.hp+1);super.damageZombie(z,amount);if(alive&&z.dead){if(this.mode!=='range'&&this.pickups.length>pickupStart){const added=this.pickups.splice(pickupStart);for(const item of added){if(item.type==='ammo'&&this.stats.kills%6===0)this.pickups.push(item);else if(item.type==='health'&&this.stats.kills%16===0)this.pickups.push(item);}}this.streak=this.time-this.lastKillAt<=4.5?this.streak+1:1;this.lastKillAt=this.time;this.bestStreak=Math.max(this.bestStreak,this.streak);const base=z.boss?5000:z.kind==='brute'?500:z.kind==='runner'?150:100;this.addScore(base,'combat',true,{streak:this.streak,kind:z.boss?'boss':z.kind,x:z.x,y:z.y});if(this.streak%10===0)this.addScore(250,'chain',false,{streak:this.streak,x:z.x,y:z.y});if(this.mode!=='range'&&this.stats.kills%POWER_DROP_EVERY===0){const cycle=['rapid','insta','rapid','bomb'],type=cycle[(Math.floor(this.stats.kills/POWER_DROP_EVERY)-1)%cycle.length];this.arcadePickups.push({type,x:z.x+12,y:z.y-8,left:15});this.emit('arcade_drop',{power:type,x:z.x+12,y:z.y-8});}}}
  damagePlayer(amount,from){const scaled=this.mode==='range'?amount:Math.ceil(amount*(1+this.wave*.08)),hit=super.damagePlayer(scaled,from);if(hit&&this.streak){this.emit('streak_broken',{streak:this.streak});this.streak=0;this.lastKillAt=-999;}return hit;}
  completeWave(){if(this.mode!=='range'){const elapsed=Math.max(0,this.time-(this.waveStartedAt||0)),par=PAR[this.wave]||100,speed=Math.max(0,Math.round((par-elapsed)*20/10)*10),clear=350,survival=Math.round(this.player.hp/this.player.maxHp*150),bonus=clear+speed+survival;this.addScore(bonus,'round',false);this.lastWaveScore={wave:this.wave+1,elapsed:+elapsed.toFixed(2),par,speed,clear,survival,total:bonus,score:this.score};this.emit('wave_score',{...this.lastWaveScore});}return super.completeWave();}
  export(){const out=super.export();return {...out,version:'Deadwatch_0.8',parent:'Deadwatch_0.7',arena:this.arena?{id:this.arena.id,name:this.arena.name}:null,arenaHistory:this.arenaHistory,competition:{score:this.score,breakdown:{...this.scoreBreakdown},streak:this.streak,bestStreak:this.bestStreak,lastWave:this.lastWaveScore},arcade:{...this.arcade,pickups:this.arcadePickups.map(q=>({...q}))}};}
 }
 return {...C,Game:RouteGame,ARENAS,MIXES,ARCADE_WAVES:PRESSURE_WAVES,PRESSURE_WAVES,POWER_DROP_EVERY,PAR_TIMES:PAR,ROUND_PACING};
}
if(typeof module==='object'&&module.exports)module.exports=install(require('./supplies.js'));else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

// Cosmetic family only. Keep the internal ray class and its existing simulation unchanged.
(function(root){'use strict';
 const variants=Object.freeze({
  vortex:Object.freeze({id:'vortex',name:'VOIDCASTER: VORTEX',subtitle:'Void energy prototype',color:'#b56cff',core:'#dfb8ff',inner:'#f4e9ff'}),
  overdrive:Object.freeze({id:'overdrive',name:'VOIDCASTER: OVERDRIVE',subtitle:'Unstable ion prototype',color:'#ff9345',core:'#ffc777',inner:'#fff2d8'}),
  shockline:Object.freeze({id:'shockline',name:'VOIDCASTER: SHOCKLINE',subtitle:'Arc-charged prototype',color:'#55bfff',core:'#a8e5ff',inner:'#e9faff'})
 }),ids=Object.freeze(Object.keys(variants));
 let cosmeticSeed=(Date.now()^0x56ca57e1)>>>0;
 function randomVariant(){
  // Rejection sampling gives exactly 85 byte values to each variant. Never consume game RNG.
  let byte;const data=new Uint8Array(1);
  do{if(root.crypto?.getRandomValues){root.crypto.getRandomValues(data);byte=data[0];}
   else{cosmeticSeed=(Math.imul(cosmeticSeed,1664525)+1013904223)>>>0;byte=cosmeticSeed>>>24;}
  }while(byte===255);
  return ids[byte%3];
 }
 const style=value=>{const id=typeof value==='string'?value:value?.voidVariant;return Object.hasOwn(variants,id)?variants[id]:variants.vortex;};
 function assign(q){if(!Object.hasOwn(variants,q.voidVariant))q.voidVariant=randomVariant();return style(q);}
 function prepare(game){
  for(const list of [game.arcadePickups,game.lootPickups])for(const q of list||[])if(q.type==='ray')assign(q);
  if(game.arcade?.weapon==='ray')assign(game.arcade);
  for(const b of game.squad||[])if(b.arcade?.weapon==='ray')assign(b.arcade);
 }
 function pulse(value,time=0){
  const id=style(value).id;
  return id==='overdrive'?.94+.04*Math.sin(time*19)+.025*Math.sin(time*43):id==='shockline'?.94+.035*Math.sin(time*9)+.025*Math.pow(Math.max(0,Math.sin(time*26)),8):.94+.06*Math.sin(time*3.1);
 }
 const neutral=Object.freeze({
  '#b65342':'#43515a','#b65744':'#43515a','#60352f':'#2b353e','#703c38':'#2b353e',
  '#6a322e':'#28343e','#713b34':'#28343e','#4b3030':'#202c35','#633d33':'#202c35',
  '#bda46b':'#8b9ba7','#b39558':'#718694','#c2a266':'#8a9aa6','#d0b273':'#718898',
  '#ceac67':'#718898','#dbc18b':'#9aaebb','#c5b686':'#8f9fa9','#dcc18a':'#8296a5',
  '#bfae7c':'#8495a2','#ceb886':'#718898','#ddc28d':'#8296a5','#dfc896':'#8a9aa6',
  '#c3a676':'#718898','#d5d4a7':'#a8b9c5','#59463a':'#2a3640'
 });
 function finish(parts,value,time=0,detail=true){
  const v=style(value),energy=pulse(v.id,time);
  for(const p of parts){
   // Coil collars stay metal; their former tiny glow must not recolor the whole fitting.
   if(neutral[p.color]){p.color=neutral[p.color];p.glow=0;}
   else if(p.glow>0){p.color=p.glow>.5?v.core:v.color;p.glow*=energy*1.18;}
   if(detail){
    if(p.mesh==='pickupWeaponOrb')p.mesh='voidcasterOrb';
    else if(p.mesh==='pickupWeaponCylinder')p.mesh='voidcasterCylinder';
   }
  }
  return parts;
 }
 root.DeadwatchVoidcaster=Object.freeze({variants,ids,style,assign,prepare,pulse,finish,randomVariant});
})(globalThis);
/* Deadwatch 0.9: Drop Arsenal. One base gun; temporary arcade weapons and vehicles. */
(function(root){'use strict';
function install(C){
 const ARCADE_DROP_EVERY=12;
 const ARCADE_DROP_GAP=14;
 const RANGE_DROP_EVERY=2;
 const WEAPON_CHARGE=10; // 10s continuous fire, ~50s if carried without firing.
 const VEHICLE_TIME=14;
 const DROP_LIFE=18;
 const LABELS=Object.freeze({deathmachine:'DEATH MACHINE',ray:'VOIDCASTER',tank:'TANK',heli:'ATTACK HELI',bomb:'SCREEN BOMB'});
 function dropType(ordinal,wave){
  if(ordinal%7===0)return 'bomb';
  if(wave>=4&&ordinal%5===0)return 'heli';
  if(wave>=2&&ordinal%3===0)return 'tank';
  return ordinal%2===0?'ray':'deathmachine';
 }
 class DropGame extends C.Game{
  start(mode='campaign',loadout='carbine'){
   this.nextArcadeDropAt=0;
   const out=super.start(mode,'carbine');
   this.loadout='carbine';
   this.player.guns=[this.player.guns[0]];this.player.slot=0;
   this.ownedGuns={carbine:this.player.guns[0]};
   this.stations=this.stations.filter(s=>s.kind!=='rack');
   Object.assign(this.arcade,{weapon:null,weaponCharge:0,voidVariant:null,vehicle:null,vehicleLeft:0,shots:0,dropPicked:0,pickupLock:0});
   return out;
  }
  switchGun(){this.player.slot=0;return false;}
  reload(){if(this.arcade?.weapon||this.arcade?.vehicle)return false;return super.reload();}
  clearSpecial(reason='expired'){
   const old=this.arcade?.vehicle||this.arcade?.weapon;if(!old)return;
   this.arcade.weapon=null;this.arcade.weaponCharge=0;this.arcade.voidVariant=null;this.arcade.vehicle=null;this.arcade.vehicleLeft=0;this.player.reload=null;this.player.fireCooldown=Math.max(this.player.fireCooldown,.12);this.player.hurtGrace=Math.max(this.player.hurtGrace,1.0);
   this.emit('arcade_end',{power:old,reason,x:this.player.x,y:this.player.y});
  }
  collectArcade(q){
   if(!q||!LABELS[q.type])return false;
   this.arcade.picked=(this.arcade.picked||0)+1;this.arcade.dropPicked=(this.arcade.dropPicked||0)+1;this.player.reload=null;this.player.slot=0;
   if(q.type==='bomb'){
    for(const z of this.zombies.filter(z=>!z.dead))this.damageZombie(z,z.hp+1);
   }else if(q.type==='tank'||q.type==='heli'){
    this.arcade.weapon=null;this.arcade.weaponCharge=0;this.arcade.voidVariant=null;this.arcade.vehicle=q.type;this.arcade.vehicleLeft=VEHICLE_TIME;this.arcade.shots=0;this.player.fireCooldown=0;this.player.hurtGrace=Math.max(this.player.hurtGrace,.2);
   }else{
    this.arcade.vehicle=null;this.arcade.vehicleLeft=0;this.arcade.weapon=q.type;this.arcade.voidVariant=q.type==='ray'?root.DeadwatchVoidcaster.assign(q).id:null;this.arcade.weaponCharge=WEAPON_CHARGE;this.arcade.shots=0;this.player.fireCooldown=0;
   }
   this.emit('arcade_power',{power:q.type,label:q.type==='ray'?root.DeadwatchVoidcaster.style(this.arcade).name:LABELS[q.type],voidVariant:q.type==='ray'?this.arcade.voidVariant:undefined,x:q.x,y:q.y});return true;
  }
  allowKillPowerDrop(){
   if(this.mode==='range')return true;
   // More enemies should create bigger fights, not a vehicle pickup every few seconds.
   if(this.time<this.nextArcadeDropAt)return false;
   this.nextArcadeDropAt=this.time+ARCADE_DROP_GAP;return true;
  }
  damageZombie(z,amount){
   const alive=!z.dead,before=this.arcadePickups.length;super.damageZombie(z,amount);
   if(alive&&z.dead){
    // Remove the inherited 0.8 rapid/insta/bomb drop, then use the 0.9 arsenal table.
    if(this.arcadePickups.length>before)this.arcadePickups.splice(before);
    const every=this.railRewardRules?.()?.powerDropEvery??(this.mode==='range'?RANGE_DROP_EVERY:ARCADE_DROP_EVERY);
    if(this.stats.kills%every===0&&this.allowKillPowerDrop?.()!==false){
     const ordinal=Math.floor(this.stats.kills/every),unlockWave=this.mode==='range'?7:this.wave,type=dropType(ordinal,unlockWave),q={type,x:z.x+12,y:z.y-8,left:DROP_LIFE};if(type==='ray')root.DeadwatchVoidcaster.assign(q);this.arcadePickups.push(q);this.emit('arcade_drop',{power:type,label:type==='ray'?root.DeadwatchVoidcaster.style(q).name:LABELS[type],voidVariant:q.voidVariant,x:q.x,y:q.y});
    }
   }
  }
  damagePlayer(amount,from){if(this.arcade?.vehicle){this.emit('vehicle_armor',{vehicle:this.arcade.vehicle,from,x:this.player.x,y:this.player.y});return false;}return super.damagePlayer(amount,from);}
  resolveWalls(f){
   if(this.arcade?.vehicle==='heli'&&f===this.player){f.x=C.clamp(f.x,45+f.r,this.width-45-f.r);f.y=C.clamp(f.y,45+f.r,this.height-45-f.r);return;}
   return super.resolveWalls(f);
  }
  emitWeaponEvent(type,actor,data){this.emit(type,actor===this.player?data:{...data,actorId:actor.actorId,actorX:actor.x,actorY:actor.y,aim:actor.aim});}
  specialHitscan(kind,damage,interval,range,pierce=1,ignoreWalls=false,p=this.player,arcade=this.arcade,stats=this.stats){
   const origin=C.muzzle(p),dir=C.polar(p.aim,1),wall=ignoreWalls?range:this.wallDistance(origin,dir,range),hits=[];
   for(const z of this.zombies)if(!z.dead){const t=C.rayCircle(origin,dir,z,z.r+2,wall);if(Number.isFinite(t))hits.push({z,t});}
   hits.sort((a,b)=>a.t-b.t);let end=wall,count=0,connected=false;for(const hit of hits){if(hit.z.dead)continue;connected=true;end=hit.t;this.damageZombie(hit.z,damage*(count?.78:1));count++;if(count>=pierce)break;}
   p.fireCooldown=interval;p.recoil=.08;stats.shots++;if(connected)stats.connected++;arcade.shots=(arcade.shots||0)+1;this.emitWeaponEvent('special_shot',p,{kind,x:origin.x,y:origin.y,paths:[{a:origin,b:C.add(origin,C.polar(p.aim,end)),kind:connected?'zombie':wall<range?'wall':'air'}]});return true;
  }
  rayShot(p=this.player,arcade=this.arcade,stats=this.stats){
   const audioEventStart=this.events.length,voidVariant=root.DeadwatchVoidcaster.style(arcade).id; // Cosmetic attribution only; damage is unchanged.
   const origin=C.muzzle(p),dir=C.polar(p.aim,1),range=780,wall=this.wallDistance(origin,dir,range);let end=wall,hit=null;
   for(const z of this.zombies)if(!z.dead){const t=C.rayCircle(origin,dir,z,z.r+4,wall);if(Number.isFinite(t)&&(!hit||t<hit.t))hit={z,t};}
   if(hit)end=hit.t;const q=C.add(origin,C.polar(p.aim,end));let connected=false;if(hit){this.damageZombie(hit.z,225);connected=true;}
   for(const z of this.zombies)if(!z.dead&&C.distance(z,q)<92){const d=C.distance(z,q),splash=135*(1-d/120);if(splash>20){this.damageZombie(z,splash);connected=true;}}
   for(let i=audioEventStart;i<this.events.length;i++){const e=this.events[i];if(e.type==='hit'||e.type==='kill'){e.audioWeapon='ray';e.voidVariant=voidVariant;}}
   p.fireCooldown=.14;p.recoil=.1;stats.shots++;if(connected)stats.connected++;arcade.shots=(arcade.shots||0)+1;this.emitWeaponEvent('special_shot',p,{kind:'ray',voidVariant,x:origin.x,y:origin.y,paths:[{a:origin,b:q,kind:hit?'zombie':wall<range?'wall':'air'}],blast:{x:q.x,y:q.y,radius:92}});return true;
  }
  tankShot(p=this.player,arcade=this.arcade,stats=this.stats,target=null){
   const range=target?C.clamp(C.distance(p,target),70,420):420,dir=C.polar(p.aim,1),d=this.wallDistance(p,dir,range),q=C.add(p,C.polar(p.aim,Math.max(70,d-8)));let connected=false;
   for(const z of this.zombies)if(!z.dead&&C.distance(z,q)<112&&this.clearRoute(q,z)){const fall=C.clamp(1-C.distance(z,q)/145,.3,1);this.damageZombie(z,240*fall);connected=true;}
   p.fireCooldown=.42;stats.shots++;if(connected)stats.connected++;arcade.shots=(arcade.shots||0)+1;this.emitWeaponEvent('special_shot',p,{kind:'tank',x:p.x,y:p.y,paths:[{a:C.v(p.x,p.y),b:q,kind:'shell'}],blast:{x:q.x,y:q.y,radius:112}});return true;
  }
  heliShot(p=this.player,arcade=this.arcade,stats=this.stats){
   return this.specialHitscan('heli',82,.075,860,2,true,p,arcade,stats);
  }
  shoot(){
   const p=this.player;if(this.status!=='playing'||p.roll>0||p.fireCooldown>0)return false;
   if(this.arcade?.vehicle==='tank')return this.tankShot();
   if(this.arcade?.vehicle==='heli')return this.heliShot();
   if(this.arcade?.weapon==='deathmachine')return this.specialHitscan('deathmachine',58,.016,720,2,false);
   if(this.arcade?.weapon==='ray')return this.rayShot();
   return super.shoot();
  }
  tick(dt,input={}){
   if(this.status==='playing'&&this.arcade){
    if(this.arcade.weapon){const before=this.arcade.weaponCharge;this.arcade.weaponCharge=Math.max(0,before-dt*(input.fire?1:.2));
     if(before>WEAPON_CHARGE*.2&&this.arcade.weaponCharge<=WEAPON_CHARGE*.2&&this.arcade.weaponCharge>0)this.emit('arcade_low',{power:this.arcade.weapon,label:LABELS[this.arcade.weapon],vehicle:false});
     if(this.arcade.weaponCharge<=0)this.clearSpecial('empty');}
    if(this.arcade.vehicle){const before=this.arcade.vehicleLeft;this.arcade.vehicleLeft=Math.max(0,before-dt);
     if(before>3&&this.arcade.vehicleLeft<=3&&this.arcade.vehicleLeft>0)this.emit('arcade_low',{power:this.arcade.vehicle,label:LABELS[this.arcade.vehicle],vehicle:true});
     if(this.arcade.vehicleLeft<=0)this.clearSpecial('expired');}
   }
   const p=this.player,baseSpeed=p?.speed;if(p&&this.arcade?.vehicle==='tank')p.speed=Math.min(baseSpeed,160);else if(p&&this.arcade?.vehicle==='heli')p.speed=Math.max(baseSpeed,228);
   const out=super.tick(dt,input);
   if(p&&Number.isFinite(baseSpeed))p.speed=baseSpeed;
   if(this.status==='playing'&&this.arcade?.vehicle==='tank')for(const z of this.zombies)if(!z.dead&&C.distance(z,p)<p.r+z.r+28&&(this.arena?.id!=='pump'||this.clearRoute(p,z)))this.damageZombie(z,z.hp+1);
   return out;
  }
  applyArena(wave){this.clearSpecial('arena');const out=super.applyArena(wave);if(this.stations)this.stations=this.stations.filter(s=>s.kind!=='rack');return out;}
  export(){const out=super.export();return {...out,version:'Deadwatch_0.9',parent:'Deadwatch_0.8',dropArsenal:{every:ARCADE_DROP_EVERY,rangeEvery:RANGE_DROP_EVERY,weapon:this.arcade.weapon,voidVariant:this.arcade.voidVariant,weaponCharge:this.arcade.weaponCharge,vehicle:this.arcade.vehicle,vehicleLeft:this.arcade.vehicleLeft,picked:this.arcade.dropPicked}};}
 }
 return {...C,Voidcaster:root.DeadwatchVoidcaster,Game:DropGame,ARCADE_DROP_EVERY,ARCADE_DROP_GAP,ARCADE_RANGE_DROP_EVERY:RANGE_DROP_EVERY,ARCADE_DROP_LABELS:LABELS,ARCADE_WEAPON_CHARGE:WEAPON_CHARGE,ARCADE_VEHICLE_TIME:VEHICLE_TIME,arcadeDropType:dropType};
}
if(typeof module==='object'&&module.exports)module.exports=install(require('./route08.js'));else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

/* Deadwatch 0.12: Bullet Storm. Dead Ops-inspired fire cadence on top of Arcade Flow. */
(function(root){'use strict';
function install(C){
 class ArcadeFlowGame extends C.Game{
  ensureInfiniteBase(){
   const g=this.player?.guns?.[0];
   if(g&&g.id==='carbine'){
    g.ammo=Infinity;
    g.reserve=Infinity;
   }
   if(this.player)this.player.reload=null;
  }
  start(mode='campaign',loadout='carbine'){
   const out=super.start(mode,'carbine');
   this.ensureInfiniteBase();
   return out;
  }
  reload(){
   if(this.player)this.player.reload=null;
   return false;
  }
  beginWave(wave){
   const out=super.beginWave(wave);
   this.ensureInfiniteBase();
   return out;
  }
  completeWave(){
   const out=super.completeWave();
   this.ensureInfiniteBase();
   return out;
  }
  stationOffer(s){
   const offer=super.stationOffer(s);
   if(offer?.action==='supply_claim')offer.detail='300 points · +1 lure · base ammo stays unlimited';
   return offer;
  }
  completeInteraction(id){
   const out=super.completeInteraction(id);
   this.ensureInfiniteBase();
   return out;
  }
  damageZombie(z,amount){
   super.damageZombie(z,amount);
   // Ammo drops are obsolete when the permanent base gun is infinite.
   if(this.pickups?.length)this.pickups=this.pickups.filter(p=>p.type!=='ammo');
  }
  tick(dt,input={}){
   // Ignore legacy reload input entirely; movement/fire should never be interrupted by it.
   if(input&&Object.prototype.hasOwnProperty.call(input,'reload'))input={...input,reload:false};
   const out=super.tick(dt,input);
   this.ensureInfiniteBase();
   return out;
  }
  export(){
   const out=super.export();
   if(out.frames)for(const f of out.frames)if(!Number.isFinite(f.ammo))f.ammo='unlimited';
   if(out.depot?.owned)for(const g of out.depot.owned)if(!Number.isFinite(g.ammo))g.ammo='unlimited';
   return {...out,version:'Deadwatch_0.12',parent:'Deadwatch_0.11',arcadeFlow:{baseAmmo:'unlimited',reload:false}};
  }
 }
 return {...C,Game:ArcadeFlowGame};
}
if(typeof module==='object'&&module.exports)module.exports=install(require('./route09.js'));else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

/* Deadwatch 0.13: Panic Tools. Dead Ops-inspired limited nukes + straight-line boosts. */
(function(root){'use strict';
function install(C){
 const PANIC=Object.freeze({startNukes:1,startBoosts:2,boostDuration:.52,boostSpeed:520,boostInvuln:1.75,nukeInvuln:2.5,maxNukes:3,maxBoosts:4});
 class PanicGame extends C.Game{
  start(mode='campaign',loadout='carbine'){
   const out=super.start(mode,loadout);
   this.panic={nukes:mode==='range'?9:PANIC.startNukes,boosts:mode==='range'?9:PANIC.startBoosts,boostLeft:0,boostHeading:0,invuln:0,nukesUsed:0,boostsUsed:0};
   return out;
  }
  useNuke(){
   if(this.status!=='playing'||!this.panic||this.panic.nukes<=0||this.arcade?.vehicle)return false;
   this.panic.nukes--;this.panic.nukesUsed++;this.panic.invuln=Math.max(this.panic.invuln,PANIC.nukeInvuln);
   this.player.hurtGrace=Math.max(this.player.hurtGrace,.25);
   const targets=this.zombies.filter(z=>!z.dead);
   for(const z of targets)this.damageZombie(z,z.hp+1);
   this.emit('panic_nuke',{x:this.player.x,y:this.player.y,kills:targets.length,nukes:this.panic.nukes});
   return true;
  }
  useBoost(move={x:0,y:0}){
   if(this.status!=='playing'||!this.panic||this.panic.boosts<=0||this.panic.boostLeft>0||this.arcade?.vehicle)return false;
   const m=Math.hypot(move?.x||0,move?.y||0);
   this.panic.boosts--;this.panic.boostsUsed++;this.panic.boostLeft=PANIC.boostDuration;
   this.panic.boostHeading=m>.15?Math.atan2(move.y,move.x):this.player.aim;
   this.panic.invuln=Math.max(this.panic.invuln,PANIC.boostInvuln);
   this.player.roll=0;this.player.rollCooldown=Math.max(this.player.rollCooldown,.2);this.player.reload=null;
   this.emit('panic_boost',{x:this.player.x,y:this.player.y,heading:this.panic.boostHeading,boosts:this.panic.boosts});
   return true;
  }
  damagePlayer(amount,from){if(this.panic?.invuln>0)return false;return super.damagePlayer(amount,from);}
  completeWave(){
   const before=this.panic?{nukes:this.panic.nukes,boosts:this.panic.boosts}:null,out=super.completeWave();
   if(this.panic&&this.status==='between'){
    this.panic.nukes=Math.min(PANIC.maxNukes,Math.max(1,this.panic.nukes));
    this.panic.boosts=Math.min(PANIC.maxBoosts,Math.max(1,this.panic.boosts));
    if(before&&(before.nukes!==this.panic.nukes||before.boosts!==this.panic.boosts))this.emit('panic_refill',{nukes:this.panic.nukes,boosts:this.panic.boosts});
   }
   return out;
  }
  tick(dt,input={}){
   if(this.status==='playing'&&this.panic){
    this.panic.invuln=Math.max(0,this.panic.invuln-dt);
    if(input.nuke)this.useNuke();
    if(input.boost)this.useBoost(input.move||{x:0,y:0});
   }
   const p=this.player,baseSpeed=p?.speed,boosting=this.status==='playing'&&this.panic?.boostLeft>0;
   let nextInput=input;
   if(boosting){
    p.speed=PANIC.boostSpeed;
    const dir=C.polar(this.panic.boostHeading,1);
    nextInput={...input,move:dir,roll:false};
   }
   const out=super.tick(dt,nextInput);
   if(p&&Number.isFinite(baseSpeed))p.speed=baseSpeed;
   if(this.status==='playing'&&this.panic){
    if(boosting){
     for(const z of this.zombies)if(!z.dead&&C.distance(z,p)<p.r+z.r+20&&(this.arena?.id!=='pump'||this.clearRoute(p,z)))this.damageZombie(z,z.hp+1);
     this.panic.boostLeft=Math.max(0,this.panic.boostLeft-dt);
     if(this.panic.boostLeft===0)this.emit('panic_boost_end',{x:p.x,y:p.y});
    }
   }
   return out;
  }
  export(){const out=super.export();return {...out,version:'Deadwatch_0.13',parent:'Deadwatch_0.12',panic:this.panic?{...this.panic}:null};}
 }
 return {...C,Game:PanicGame,PANIC_RULES:PANIC};
}
if(typeof module==='object'&&module.exports)module.exports=install(require('./route11.js'));else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

/* Deadwatch 0.14: Open Routes. Wider loops, fewer pinch points, no hard combat pockets. */
(function(root){'use strict';
function install(C){
 const A=(id,name,kind,start,obstacles,barrels,spawns,stations,supplies,theme)=>({id,name,kind,start,obstacles:obstacles.map(o=>({x:o[0],y:o[1],w:o[2],h:o[3]})),barrels:barrels.map(p=>({x:p[0],y:p[1]})),spawns:spawns.map(p=>({x:p[0],y:p[1]})),stations,supplies:supplies.map(p=>({x:p[0],y:p[1]})),theme});
 const edgeSpawns=[[678,82],[720,82],[762,82],[1358,478],[1358,520],[1358,562],[762,958],[720,958],[678,958],[82,562],[82,520],[82,478]];
 const outerSupplies=[[1160,820],[1160,190],[260,190],[260,820],[520,900],[930,900]];
 const ARENAS=Object.freeze([
  A('depot','North Depot','depot',[720,520],
    [[300,250,180,70],[960,250,180,70],[300,720,180,70],[960,720,180,70],[535,435,90,160],[815,435,90,160]],
    [[565,300],[875,300],[565,750],[875,750]],edgeSpawns,
    {generator:[720,650],carbine:[245,430],shotgun:[1195,430],scout:[1120,845],clinic:[245,845],bench:[900,165],trap:[720,390],radio:[560,900],trapField:[720,520,105]},outerSupplies,
    ['#243940','#354a4c','#1b2b32','#d0c996']),
  A('breakwater','Breakwater','beach',[720,560],
    [[300,250,230,60],[880,250,180,60],[360,680,150,70],[930,650,220,70],[650,460,140,70]],
    [[575,260],[840,260],[520,735],[1180,720]],edgeSpawns,
    {generator:[720,590],carbine:[235,470],shotgun:[1205,470],scout:[1115,850],clinic:[245,850],bench:[900,160],trap:[720,390],radio:[550,900],trapField:[720,610,105]},outerSupplies,
    ['#8f7855','#c1a978','#2c5664','#f2d58f']),
  A('memorial','Memorial Park','graveyard',[720,560],
    [[280,260,190,70],[970,260,190,70],[370,680,170,70],[900,680,170,70],[625,400,190,70]],
    [[520,345],[920,345],[600,760],[840,760]],edgeSpawns,
    {generator:[720,530],carbine:[235,520],shotgun:[1205,520],scout:[1120,855],clinic:[240,855],bench:[840,170],trap:[720,600],radio:[560,900],trapField:[720,575,110]},outerSupplies,
    ['#253a2c','#42563d','#171f1a','#b7b07c']),
  A('pump','Pump Station','pump',[720,560],
    [[300,260,110,220],[1030,260,110,220],[540,350,100,100],[800,350,100,100],[650,690,140,70]],
    [[470,305],[970,305],[510,670],[930,670]],edgeSpawns,
    {generator:[720,430],carbine:[235,560],shotgun:[1205,560],scout:[1110,855],clinic:[245,855],bench:[900,165],trap:[720,625],radio:[550,900],trapField:[720,555,105]},outerSupplies,
    ['#17363b','#2b5557','#102a32','#79d6c1']),
  A('cold','Cold Storage','cold',[720,520],
    [[280,240,220,80],[940,240,220,80],[280,700,220,80],[940,700,220,80]],
    [[570,340],[870,340],[570,680],[870,680]],edgeSpawns,
    {generator:[720,385],carbine:[235,500],shotgun:[1205,500],scout:[1120,850],clinic:[245,850],bench:[900,380],trap:[720,630],radio:[550,900],trapField:[720,555,105]},outerSupplies,
    ['#9fbac2','#d9e8e7','#405964','#d8ffff']),
  A('rail','Rail Crossing','rail',[720,600],
    [[260,300,300,60],[880,300,300,60],[350,690,220,60],[870,690,220,60],[675,450,90,80]],
    [[610,230],[830,230],[620,815],[820,815]],edgeSpawns,
    {generator:[720,390],carbine:[235,515],shotgun:[1205,515],scout:[1120,850],clinic:[245,850],bench:[900,165],trap:[720,645],radio:[550,900],trapField:[720,600,105]},outerSupplies,
    ['#4a3b31','#6c5543','#241d1a','#d39a62']),
  A('quarantine','Quarantine Camp','camp',[720,520],
    [[280,250,150,90],[645,250,150,90],[1010,250,150,90],[360,690,150,90],[930,690,150,90]],
    [[525,440],[915,440],[570,825],[870,825]],edgeSpawns,
    {generator:[720,420],carbine:[235,520],shotgun:[1205,520],scout:[1120,855],clinic:[245,855],bench:[860,385],trap:[720,620],radio:[550,900],trapField:[720,555,105]},outerSupplies,
    ['#3e4630','#626848','#25291f','#d3bd70']),
  A('evac','Evacuation Zone','evac',[720,540],
    [[280,420,180,55],[980,420,180,55],[560,220,100,120],[780,220,100,120],[530,700,130,65],[780,700,130,65]],
    [[490,610],[950,610],[580,825],[860,825]],edgeSpawns,
    {generator:[720,620],carbine:[235,320],shotgun:[1205,320],scout:[1115,850],clinic:[245,850],bench:[900,165],trap:[720,490],radio:[550,900],trapField:[720,555,115]},outerSupplies,
    ['#34363d','#56565a','#1f2027','#f0a35f'])
 ]);
 class OpenRouteGame extends C.Game{
  applyArena(wave){
   if(typeof this.clearSpecial==='function')this.clearSpecial('arena');
   const arena=ARENAS[Math.max(0,Math.min(ARENAS.length-1,wave))];
   this.arena=arena;this.arenaIndex=wave;this.obstacles=arena.obstacles.map(o=>({...o}));this.navGraphs=new Map();this.navObstacles=null;
   this.zombies=[];this.pickups=[];this.arcadePickups=[];this.warnings=[];this.decoys=[];
   this.barrels=arena.barrels.map(p=>({id:++this.serial,x:p.x,y:p.y,hp:28}));
   if(this.player){this.player.x=arena.start[0];this.player.y=arena.start[1];this.player.vx=this.player.vy=0;}
   if(this.stations){
    this.stations=this.stations.filter(s=>s.id!=='supply-crate'&&s.kind!=='rack');
    for(const s of this.stations){const p=arena.stations[s.id];if(p){s.x=p[0];s.y=p[1];}}
   }
   if(this.trap){const q=arena.stations.trapField;this.trap.x=q[0];this.trap.y=q[1];this.trap.radius=q[2];this.trap.arming=0;this.trap.active=0;this.trap.pulse=0;}
   if(this.supply?.drop){
    const q=this.supplySite();
    if(q){Object.assign(this.supply.drop,q);if(this.supply.phase==='ready')this.stations.push(this.supply.drop);}
    else{this.supply.expired++;this.emit('supply_expired',{x:this.supply.drop.x,y:this.supply.drop.y,relocated:true});this.removeSupply();}
   }
  }
  export(){const out=super.export();return {...out,version:'Deadwatch_0.14',parent:'Deadwatch_0.13',layout:{philosophy:'open loops',outerEscapeLoop:true,minObstacleGap:120}};}
 }
 return {...C,Game:OpenRouteGame,ARENAS};
}
if(typeof module==='object'&&module.exports)module.exports=install(require('./route13.js'));else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

/* Deadwatch 0.15: Treasure Trail. Structurally distinct arenas + playable post-wave loot rush. */
(function(root){'use strict';
function install(C){
 const A=(id,name,kind,start,obstacles,barrels,spawns,stations,supplies,theme,layoutStyle)=>({id,name,kind,start,layoutStyle,obstacles:obstacles.map(o=>({x:o[0],y:o[1],w:o[2],h:o[3]})),barrels:barrels.map(p=>({x:p[0],y:p[1]})),spawns:spawns.map(p=>({x:p[0],y:p[1]})),stations,supplies:supplies.map(p=>({x:p[0],y:p[1]})),theme});
 const edgeSpawns=[[678,82],[720,82],[762,82],[1358,478],[1358,520],[1358,562],[762,958],[720,958],[678,958],[82,562],[82,520],[82,478]];
 const outerSupplies=[[1160,820],[1160,190],[260,190],[260,820],[520,900],[930,900]];
 const ARENAS=Object.freeze([
  // Two huge warehouse bays create a vertical boulevard and two outer flanks.
  A('depot','North Depot','depot',[720,520],
    [[250,240,170,520],[1020,240,170,520]],
    [[470,330],[970,330],[470,730],[970,730]],edgeSpawns,
    {generator:[720,650],clinic:[250,520],bench:[1160,520],trap:[720,390],radio:[560,900],trapField:[720,520,110]},outerSupplies,
    ['#243940','#354a4c','#1b2b32','#d0c996'],'twin-warehouse-boulevard'),
  // Long sea wall up top; lower wrecks make the shoreline asymmetrical and open.
  A('breakwater','Breakwater','beach',[720,520],
    [[270,250,900,70],[330,650,220,70],[890,650,220,70]],
    [[255,770],[1185,770],[580,560],[860,560]],edgeSpawns,
    {generator:[720,520],clinic:[245,820],bench:[1190,820],trap:[720,760],radio:[560,900],trapField:[720,570,110]},outerSupplies,
    ['#8f7855','#c1a978','#2c5664','#f2d58f'],'seawall-and-wrecks'),
  // A genuine central monument forces circular rotation around one big landmark.
  A('memorial','Memorial Park','graveyard',[420,520],
    [[590,390,260,260],[260,240,140,100],[1040,240,140,100],[260,700,140,100],[1040,700,140,100]],
    [[500,300],[940,300],[500,760],[940,760]],edgeSpawns,
    {generator:[470,600],clinic:[240,520],bench:[1200,520],trap:[470,410],radio:[560,900],trapField:[470,520,110]},outerSupplies,
    ['#253a2c','#42563d','#171f1a','#b7b07c'],'central-monument-ring'),
  // Four huge tanks make a clean cross intersection instead of random boxes.
  A('pump','Pump Station','pump',[720,520],
    [[300,250,200,180],[940,250,200,180],[300,640,200,180],[940,640,200,180]],
    [[555,290],[885,290],[555,745],[885,745]],edgeSpawns,
    {generator:[720,420],clinic:[245,520],bench:[1195,520],trap:[720,650],radio:[560,900],trapField:[720,540,110]},outerSupplies,
    ['#17363b','#2b5557','#102a32','#79d6c1'],'four-tank-cross'),
  // Staggered freezer banks form real aisles with deliberate cross-cuts.
  A('cold','Cold Storage','cold',[720,600],
    [[260,270,260,70],[660,270,260,70],[1060,270,140,70],[260,690,140,70],[540,690,260,70],[940,690,260,70]],
    [[590,440],[850,440],[430,820],[1010,820]],edgeSpawns,
    {generator:[720,500],clinic:[245,520],bench:[1195,520],trap:[720,810],radio:[560,900],trapField:[720,575,105]},outerSupplies,
    ['#9fbac2','#d9e8e7','#405964','#d8ffff'],'staggered-freezer-aisles'),
  // Two long platforms create three vertical lanes; small signal boxes break sightlines without making pockets.
  A('rail','Rail Crossing','rail',[720,600],
    [[260,300,300,60],[880,300,300,60],[350,690,220,60],[870,690,220,60],[675,450,90,80],[260,500,100,50],[1080,500,100,50]],
    [[345,325],[1095,325],[345,735],[1095,735]],edgeSpawns,
    {generator:[720,520],clinic:[245,850],bench:[1195,850],trap:[720,760],radio:[560,900],trapField:[720,600,110]},outerSupplies,
    ['#4a3b31','#6c5543','#241d1a','#d39a62'],'split-train-crossing'),
  // Nine small tents create a loose grid: many decisions, but all lanes remain wide.
  A('quarantine','Quarantine Camp','camp',[720,600],
    [[270,250,110,70],[665,250,110,70],[1060,250,110,70],[270,480,110,70],[665,480,110,70],[1060,480,110,70],[270,710,110,70],[665,710,110,70],[1060,710,110,70]],
    [[470,365],[970,365],[470,825],[970,825]],edgeSpawns,
    {generator:[520,600],clinic:[245,850],bench:[1195,850],trap:[920,600],radio:[560,900],trapField:[720,600,105]},outerSupplies,
    ['#3e4630','#626848','#25291f','#d3bd70'],'tent-grid'),
  // Open helipad in the center, with an outer barricade ring rather than center clutter.
  A('evac','Evacuation Zone','evac',[720,520],
    [[260,260,220,60],[960,260,220,60],[260,720,220,60],[960,720,220,60],[610,230,220,50],[610,760,220,50],[240,455,50,130],[1150,455,50,130]],
    [[500,370],[940,370],[500,670],[940,670]],edgeSpawns,
    {generator:[720,660],clinic:[245,850],bench:[1195,850],trap:[720,360],radio:[560,900],trapField:[720,520,120]},outerSupplies,
    ['#34363d','#56565a','#1f2027','#f0a35f'],'open-helipad-ring')
 ]);
 const LOOT_TIME=8;
 const LOOT_LABELS=Object.freeze({coin:'COIN',gem:'GEM',boost:'BOOST',nuke:'NUKE',medkit:'MEDKIT',lure:'LURE'});
 class TreasureTrailGame extends C.Game{
  applyArena(wave){
   if(typeof this.clearSpecial==='function')this.clearSpecial('arena');
   const arena=ARENAS[Math.max(0,Math.min(ARENAS.length-1,wave))];
   this.arena=arena;this.arenaIndex=wave;this.obstacles=arena.obstacles.map(o=>({...o}));this.navGraphs=new Map();this.navObstacles=null;
   this.zombies=[];this.pickups=[];this.arcadePickups=[];this.lootPickups=[];this.warnings=[];this.decoys=[];
   this.barrels=arena.barrels.map(p=>({id:++this.serial,x:p.x,y:p.y,hp:28}));
   if(this.player){this.player.x=arena.start[0];this.player.y=arena.start[1];this.player.vx=this.player.vy=0;}
   if(this.stations){
    this.stations=this.stations.filter(s=>s.id!=='supply-crate'&&s.kind!=='rack');
    for(const s of this.stations){const p=arena.stations[s.id];if(p){s.x=p[0];s.y=p[1];}}
   }
   if(this.trap){const q=arena.stations.trapField;this.trap.x=q[0];this.trap.y=q[1];this.trap.radius=q[2];this.trap.arming=0;this.trap.active=0;this.trap.pulse=0;}
   if(this.supply?.drop){
    const q=this.supplySite();
    if(q){Object.assign(this.supply.drop,q);if(this.supply.phase==='ready')this.stations.push(this.supply.drop);}
    else{this.supply.expired++;this.emit('supply_expired',{x:this.supply.drop.x,y:this.supply.drop.y,relocated:true});this.removeSupply();}
   }
  }
  start(mode='campaign',loadout='carbine'){
   const out=super.start(mode,loadout);this.loot=null;this.lootPickups=[];this.lootStats={showers:0,collected:0,coins:0,gems:0,utility:0};return out;
  }
  lootSpots(count){
   const spots=[],center={x:720,y:520},phase=(this.wave+1)*.47;
   for(const radius of [120,190,265,335,400])for(let i=0;i<16&&spots.length<count;i++){
    const a=phase+i*Math.PI*2/16+(radius%2)*.01,q={x:center.x+Math.cos(a)*radius,y:center.y+Math.sin(a)*radius};
    if(!this.validPosition(q,18))continue;
    if(this.stations?.some(s=>C.distance(q,s)<70))continue;
    if(this.barrels?.some(b=>!b.spent&&C.distance(q,b)<65))continue;
    if(spots.some(s=>C.distance(q,s)<58))continue;
    spots.push(q);
   }
   return spots;
  }
  spawnLootShower(){
   const types=['coin','coin','coin','coin','coin','coin','coin','gem','gem','gem','boost',this.wave%2?'medkit':'lure'];
   if(this.wave%3===2||this.wave===7)types.push('nuke');else types.push('gem');
   const spots=this.lootSpots(types.length);
   this.lootPickups=types.slice(0,spots.length).map((type,i)=>({id:++this.serial,type,x:spots[i].x,y:spots[i].y,left:LOOT_TIME}));
   this.lootStats.showers++;this.emit('loot_shower',{wave:this.wave+1,count:this.lootPickups.length,types:this.lootPickups.map(q=>q.type)});
  }
  collectLoot(q){
   const p=this.player;let amount=0;
   if(q.type==='coin'){amount=75;this.awardPoints(amount,q.x,q.y);this.score=(this.score||0)+100;this.lootStats.coins++;}
   else if(q.type==='gem'){amount=175;this.awardPoints(amount,q.x,q.y);this.score=(this.score||0)+400;this.lootStats.gems++;}
   else if(q.type==='boost'){if(this.panic)this.panic.boosts=Math.min(C.PANIC_RULES?.maxBoosts||9,this.panic.boosts+1);this.lootStats.utility++;}
   else if(q.type==='nuke'){if(this.panic)this.panic.nukes=Math.min(C.PANIC_RULES?.maxNukes||9,this.panic.nukes+1);this.lootStats.utility++;}
   else if(q.type==='medkit'){if(p.medkits<3)p.medkits++;else{amount=125;this.awardPoints(amount,q.x,q.y);}this.lootStats.utility++;}
   else if(q.type==='lure'){if(p.lures<3)p.lures++;else{amount=125;this.awardPoints(amount,q.x,q.y);}this.lootStats.utility++;}
   q.left=0;this.lootStats.collected++;this.emit('loot_pickup',{pickupType:q.type,label:LOOT_LABELS[q.type],amount,x:q.x,y:q.y});
  }
  completeWave(){
   if(this.mode==='range')return super.completeWave();
   const out=super.completeWave(),nextStatus=this.status;
   if(nextStatus!=='between'&&nextStatus!=='won')return out;
   this.loot={left:LOOT_TIME,total:LOOT_TIME,nextStatus,wave:this.wave+1};
   this.spawnLootShower();this.status='loot';this.player.vx=this.player.vy=0;this.emit('loot_start',{wave:this.wave+1,left:LOOT_TIME,nextStatus});return out;
  }
  finishLoot(){
   if(!this.loot)return;const next=this.loot.nextStatus;this.lootPickups=[];this.loot=null;this.status=next;this.emit('loot_end',{wave:this.wave+1,nextStatus:next});
  }
  tickLoot(dt,input={}){
   dt=C.clamp(dt,0,1/60);if(!dt||!this.loot)return;
   this.time+=dt;this.loot.left=Math.max(0,this.loot.left-dt);const p=this.player;
   for(const name of ['hurtGrace','fireCooldown','flash','recoil','rollCooldown'])p[name]=Math.max(0,p[name]-dt);
   p.wanted=Number.isFinite(input.aim)?input.aim:p.wanted;p.aim=C.turn(p.aim,p.wanted,dt*10);p.body=C.turn(p.body,p.aim,dt*6);p.focus=false;
   const move=input.move||C.v(0,0),m=Math.hypot(move.x,move.y),speed=p.speed,a=1-Math.exp(-dt*15);
   p.vx=C.mix(p.vx,move.x/Math.max(1,m)*speed,a);p.vy=C.mix(p.vy,move.y/Math.max(1,m)*speed,a);p.x+=p.vx*dt;p.y+=p.vy*dt;this.resolveWalls(p);p.step+=Math.hypot(p.vx,p.vy)*dt*.075;p.stamina=C.clamp(p.stamina+25*dt,0,100);
   for(const q of this.lootPickups){
     q.left=Math.max(0,q.left-dt);if(q.left<=0)continue;
     let d=C.distance(q,p);if(!this.clearRoute(p,q))continue;
     if((q.type==='coin'||q.type==='gem')&&d>36&&d<92){const step=Math.min(d-32,dt*260),t=step/d;q.x+=(p.x-q.x)*t;q.y+=(p.y-q.y)*t;d-=step;}
     if(d<38)this.collectLoot(q);
    }
   this.lootPickups=this.lootPickups.filter(q=>q.left>0);
   if(!this.lootPickups.length)this.loot.left=Math.min(this.loot.left,.7);
   if(this.loot.left<=0)this.finishLoot();
  }
  tick(dt,input={}){if(this.status==='loot'){this.tickLoot(dt,input);return;}return super.tick(dt,input);}
  export(){const out=super.export();return {...out,version:'Deadwatch_0.15',parent:'Deadwatch_0.14',layout:{philosophy:'distinct arena identities + open escape routes',styles:ARENAS.map(a=>a.layoutStyle)},treasure:{active:this.loot?{...this.loot}:null,pickups:this.lootPickups?.map(q=>({...q}))||[],stats:{...this.lootStats}}};}
 }
 return {...C,Game:TreasureTrailGame,ARENAS,LOOT_TIME,LOOT_LABELS};
}
if(typeof module==='object'&&module.exports)module.exports=install(require('./route14.js'));else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

/* Deadwatch 0.16: Jackpot. Dead Ops-inspired staged treasure hoards and x1-x9 score multiplier. */
(function(root){'use strict';
function install(C){
 const MAX_MULT=9;
 const REWARD_VARIANTS=Object.freeze({
  hoard:{id:'treasure-hoard',title:'TREASURE HOARD',time:9.5},
  gem:{id:'gem-vault',title:'GEM VAULT',time:10},
  panic:{id:'panic-cache',title:'PANIC CACHE',time:10},
  armory:{id:'armory',title:'BONUS ARMORY',time:12},
  jackpot:{id:'jackpot',title:'JACKPOT',time:12}
 });
 const variantForWave=wave=>wave===3?REWARD_VARIANTS.armory:wave===7?REWARD_VARIANTS.jackpot:wave===2||wave===6?REWARD_VARIANTS.gem:wave===4?REWARD_VARIANTS.panic:REWARD_VARIANTS.hoard;
 const tierLabel={silver:'SILVER',gold:'GOLD',stack:'GOLD STACK',small:'GEM',medium:'GEM',large:'GIANT GEM'};
 class JackpotGame extends C.Game{
  applyArena(wave){
   const out=super.applyArena(wave);
   const fixes={depot:{clinic:[200,520],bench:[1240,520]},rail:{generator:[720,570]}}[this.arena?.id];
   if(fixes&&this.stations)for(const st of this.stations){const p=fixes[st.id];if(p){st.x=p[0];st.y=p[1];}}
   return out;
  }
  start(mode='campaign',loadout='carbine'){
   const out=super.start(mode,loadout);
   this.reward={multiplier:1,progress:0,max:MAX_MULT,best:1,treasure:0,gems:0};
   this.lootPiles=[];
   this.lootStats={showers:0,collected:0,coins:0,gems:0,utility:0,spawned:0,bursts:0,multiplierUps:0};
   return out;
  }
  hoardCenters(){
   const candidates=[
    {x:430,y:330},{x:1010,y:330},{x:430,y:710},{x:1010,y:710},
    {x:720,y:255},{x:720,y:785},{x:360,y:520},{x:1080,y:520},
    {x:560,y:380},{x:880,y:380},{x:560,y:660},{x:880,y:660}
   ];
   const out=[];
   const ok=q=>this.validPosition(q,34)&&!(this.stations||[]).some(s=>C.distance(q,s)<85)&&!(this.barrels||[]).some(b=>!b.spent&&C.distance(q,b)<70)&&out.every(p=>C.distance(p,q)>210);
   for(const q of candidates)if(ok(q))out.push({...q});
   if(out.length<4){for(const q of this.lootSpots(40))if(ok(q))out.push({...q});}
   return out.slice(0,4);
  }
  descriptor(type,tier){return {type,tier};}
  rewardPayload(variant){
   const c=(tier='silver')=>this.descriptor('coin',tier),g=(tier='small')=>this.descriptor('gem',tier),u=()=>this.wave%2?this.descriptor('medkit'):this.descriptor('lure');
   const opening=[c('silver'),c('gold'),g('small'),c('stack'),g('small'),this.descriptor('boost'),c('gold'),u(),c('silver'),g('medium')];
   let tail=[];
   if(variant.id==='gem-vault')tail=[g('small'),g('medium'),g('medium'),g('large'),g('small'),g('medium'),c('gold'),g('large'),c('stack'),g('medium'),this.descriptor('boost'),this.descriptor('nuke'),g('small'),g('medium'),g('large'),c('gold')];
   else if(variant.id==='panic-cache')tail=[c('gold'),c('stack'),g('small'),c('gold'),this.descriptor('boost'),this.descriptor('boost'),this.descriptor('nuke'),this.descriptor('medkit'),this.descriptor('lure'),g('medium'),c('stack'),g('small'),c('gold'),c('silver')];
   else if(variant.id==='jackpot')tail=[c('gold'),c('stack'),c('stack'),g('medium'),g('large'),g('large'),c('gold'),g('medium'),this.descriptor('boost'),this.descriptor('boost'),this.descriptor('nuke'),this.descriptor('nuke'),this.descriptor('medkit'),this.descriptor('lure'),g('large'),c('stack'),g('medium'),c('gold'),g('large'),c('stack'),g('medium'),c('gold'),g('large'),c('stack')];
   else tail=[c('silver'),c('gold'),c('stack'),g('small'),c('gold'),g('medium'),c('silver'),this.descriptor('boost'),c('stack'),g('small'),c('gold'),u(),g('medium'),c('silver'),c('gold'),g('small')];
   return opening.concat(tail);
  }
  spawnRewardItem(desc,pileIndex){
   const pile=this.lootPiles[pileIndex%Math.max(1,this.lootPiles.length)]||{x:720,y:520};
   let q={x:pile.x,y:pile.y};
   for(let tries=0;tries<22;tries++){
    const a=this.rng.range(0,Math.PI*2),r=this.rng.range(14,64),cand={x:pile.x+Math.cos(a)*r,y:pile.y+Math.sin(a)*r};
    if(this.validPosition(cand,12)){q=cand;break;}
   }
   const item={id:++this.serial,type:desc.type,tier:desc.tier||null,x:q.x,y:q.y,left:this.loot?.left||10,pile:pileIndex,born:this.time};
   this.lootPickups.push(item);this.lootStats.spawned++;
   if(pile){pile.flash=.32;pile.spawned=(pile.spawned||0)+1;}
   return item;
  }
  spawnLootShower(){
   const variant=variantForWave(this.wave),payload=this.rewardPayload(variant);
   this.loot.variant=variant.id;this.loot.title=variant.title;this.loot.total=variant.time;this.loot.left=variant.time;this.loot.elapsed=0;this.loot.burstIndex=0;
   this.lootPiles=this.hoardCenters().map((p,i)=>({...p,id:i,flash:0,spawned:0}));
   this.lootPickups=[];
   // Open with a visible pile, then keep erupting over the next few seconds.
   for(let i=0;i<Math.min(10,payload.length);i++)this.spawnRewardItem(payload[i],i%4);
   const rest=payload.slice(10),groups=4,per=Math.ceil(rest.length/groups);this.loot.spawnPlan=[];
   for(let i=0;i<groups;i++){
    const items=rest.slice(i*per,(i+1)*per);if(items.length)this.loot.spawnPlan.push({at:.7+i*.78,pile:i%4,items,done:false});
   }
   this.lootStats.showers++;
   this.emit('loot_shower',{wave:this.wave+1,count:payload.length,variant:variant.id,title:variant.title,piles:this.lootPiles.map(p=>({x:p.x,y:p.y})),types:payload.map(q=>q.type)});
  }
  addMultiplier(amount,x,y,label){
   if(!this.reward||!Number.isFinite(amount)||amount<=0||this.reward.multiplier>=MAX_MULT)return;
   // Higher multipliers require more treasure; progress remains a 0..1 HUD fraction.
   while(amount>0&&this.reward.multiplier<MAX_MULT){
    const cost=Math.pow(1.4,this.reward.multiplier-1),needed=(1-this.reward.progress)*cost;
    if(amount+1e-9<needed){this.reward.progress+=amount/cost;amount=0;}
    else{amount=Math.max(0,amount-needed);this.reward.progress=0;this.reward.multiplier++;this.reward.best=Math.max(this.reward.best,this.reward.multiplier);this.lootStats.multiplierUps++;this.emit('multiplier_up',{multiplier:this.reward.multiplier,x,y,label});}
   }
   if(this.reward.multiplier>=MAX_MULT)this.reward.progress=0;
   this.emit('multiplier_progress',{multiplier:this.reward.multiplier,progress:this.reward.progress,x,y});
  }
  collectLoot(q){
   if(!q||q.left<=0)return;
   const p=this.player;let amount=0,meter=0,label='TREASURE';
   if(q.type==='coin'){
    const table={silver:[35,50,.07],gold:[70,110,.11],stack:[120,190,.18]},v=table[q.tier]||table.silver;
    amount=v[0];this.awardPoints(amount,q.x,q.y);this.addScore(v[1],'treasure',true,{pickupType:q.type,tier:q.tier,x:q.x,y:q.y});meter=v[2];label=tierLabel[q.tier]||'TREASURE';this.reward.treasure++;this.lootStats.coins++;
   }else if(q.type==='gem'){
    const table={small:[120,260,.34],medium:[180,425,.62],large:[300,850,1.18]},v=table[q.tier]||table.small;
    amount=v[0];this.awardPoints(amount,q.x,q.y);this.addScore(v[1],'treasure',true,{pickupType:q.type,tier:q.tier,x:q.x,y:q.y});meter=v[2];label=tierLabel[q.tier]||'GEM';this.reward.gems++;this.lootStats.gems++;
   }else if(q.type==='boost'){if(this.panic)this.panic.boosts=Math.min(C.PANIC_RULES?.maxBoosts||9,this.panic.boosts+1);this.lootStats.utility++;label='BOOST';}
   else if(q.type==='nuke'){if(this.panic)this.panic.nukes=Math.min(C.PANIC_RULES?.maxNukes||9,this.panic.nukes+1);this.lootStats.utility++;label='NUKE';}
   else if(q.type==='medkit'){if(p.medkits<3)p.medkits++;else{amount=125;this.awardPoints(amount,q.x,q.y);}this.lootStats.utility++;label='MEDKIT';}
   else if(q.type==='lure'){if(p.lures<3)p.lures++;else{amount=125;this.awardPoints(amount,q.x,q.y);}this.lootStats.utility++;label='LURE';}
   if(meter)this.addMultiplier(meter,q.x,q.y,label);
   q.left=0;this.lootStats.collected++;this.emit('loot_pickup',{pickupType:q.type,tier:q.tier,label,amount,multiplier:this.reward.multiplier,progress:this.reward.progress,x:q.x,y:q.y});
   if(q.type==='gem'&&q.tier==='large')this.emit('jackpot_pickup',{label:'GIANT GEM',multiplier:this.reward.multiplier,x:q.x,y:q.y});
  }
  tickLoot(dt,input={}){
   dt=C.clamp(dt,0,1/60);if(!dt||!this.loot)return;
   this.time+=dt;this.loot.left=Math.max(0,this.loot.left-dt);this.loot.elapsed=this.loot.total-this.loot.left;
   for(const pile of this.lootPiles||[])pile.flash=Math.max(0,(pile.flash||0)-dt);
   for(const burst of this.loot.spawnPlan||[])if(!burst.done&&burst.at<=this.loot.elapsed){burst.done=true;for(const desc of burst.items)this.spawnRewardItem(desc,burst.pile);this.lootStats.bursts++;this.emit('loot_burst',{variant:this.loot.variant,pile:burst.pile,x:this.lootPiles[burst.pile]?.x||720,y:this.lootPiles[burst.pile]?.y||520,count:burst.items.length});}
   const p=this.player;
   for(const name of ['hurtGrace','fireCooldown','flash','recoil','rollCooldown'])p[name]=Math.max(0,p[name]-dt);
   p.wanted=Number.isFinite(input.aim)?input.aim:p.wanted;p.aim=C.turn(p.aim,p.wanted,dt*10);p.body=C.turn(p.body,p.aim,dt*6);p.focus=false;
   const move=input.move||C.v(0,0),m=Math.hypot(move.x,move.y),speed=p.speed,a=1-Math.exp(-dt*15);
   p.vx=C.mix(p.vx,move.x/Math.max(1,m)*speed,a);p.vy=C.mix(p.vy,move.y/Math.max(1,m)*speed,a);p.x+=p.vx*dt;p.y+=p.vy*dt;this.resolveWalls(p);p.step+=Math.hypot(p.vx,p.vy)*dt*.075;p.stamina=C.clamp(p.stamina+25*dt,0,100);
   for(const q of this.lootPickups){
     q.left=Math.max(0,q.left-dt);if(q.left<=0)continue;
     let d=C.distance(q,p);if(!this.clearRoute(p,q))continue;
     if((q.type==='coin'||q.type==='gem')&&d>36&&d<92){const step=Math.min(d-32,dt*260),t=step/d;q.x+=(p.x-q.x)*t;q.y+=(p.y-q.y)*t;d-=step;}
     if(d<38)this.collectLoot(q);
    }
   this.lootPickups=this.lootPickups.filter(q=>q.left>0);
   const pending=(this.loot.spawnPlan||[]).some(b=>!b.done);
   if(!this.lootPickups.length&&!pending)this.loot.left=Math.min(this.loot.left,.7);
   if(this.loot.left<=0)this.finishLoot();
  }
  finishLoot(){this.lootPiles=[];return super.finishLoot();}
  export(){const out=super.export();return {...out,version:'Deadwatch_0.16',parent:'Deadwatch_0.15',reward:{...this.reward},treasure:{...out.treasure,active:this.loot?{...this.loot,spawnPlan:(this.loot.spawnPlan||[]).map(b=>({...b,items:b.items?.map(i=>({...i}))}))}:null,piles:(this.lootPiles||[]).map(p=>({...p})),stats:{...this.lootStats}}};}
 }
 return {...C,Game:JackpotGame,REWARD_MAX_MULTIPLIER:MAX_MULT,REWARD_VARIANTS,rewardVariantForWave:variantForWave};
}
if(typeof module==='object'&&module.exports)module.exports=install(require('./route15.js'));else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

/* Deadwatch 0.36.107: Anti-camping disabled. Keep legacy state/API for diagnostics and map compatibility; holding position adds no flank bias, hunters or shock strikes. */
(function(root){'use strict';
function install(C){
 const RULES=Object.freeze({
  enabled:false,
  resetDistance:185,
  campRadius:150,
  openWarning:5.0,
  edgeWarning:3.3,
  edgeDistance:150,
  breachCooldownEarly:3.7,
  breachCooldownLate:2.8,
  hunterWarning:.9,
  hunterMinRadius:215,
  hunterMaxRadius:315,
  hunterSpeed:1.32,
  hunterChaseSpeed:190,
  hunterChaseStep:1.5,
  zoneAtOpen:9.0,
  zoneAtEdge:7.0,
  zoneWarning:1.15,
  zoneActive:3.25,
  zoneRadius:122,
  zoneDamage:18,
  zoneTick:.48,
  zoneCooldown:7.0,
  flankBiasAt:2.4
 });
 class BreakoutGame extends C.Game{
  start(mode='campaign',loadout='carbine'){
   this.antiCamp={anchor:{x:720,y:520},hold:0,breaches:0,huntersSpawned:0,flankBursts:0,breachCooldown:0,zoneCooldown:0,breachWarnings:[],zone:null,lastThreshold:RULES.openWarning};
   const out=super.start(mode,loadout);this.resetAntiCampAnchor();return out;
  }
  applyArena(wave){const out=super.applyArena(wave);if(this.antiCamp){this.antiCamp.breachWarnings=[];this.antiCamp.zone=null;this.antiCamp.breachCooldown=1.5;this.antiCamp.zoneCooldown=2;this.resetAntiCampAnchor();}return out;}
  resetAntiCampAnchor(){if(!this.antiCamp||!this.player)return;this.antiCamp.anchor={x:this.player.x,y:this.player.y};this.antiCamp.hold=0;}
  edgeDistance(){const p=this.player;return Math.min(p.x-45,this.width-45-p.x,p.y-45,this.height-45-p.y);}
  campThreshold(){return this.edgeDistance()<RULES.edgeDistance?RULES.edgeWarning:RULES.openWarning;}
  breachCount(){return this.wave>=6?3:this.wave>=2?2:1;}
  candidateBreachPoints(count){
   const p=this.player,points=[],angles=[p.aim+Math.PI,p.aim+Math.PI*.68,p.aim-Math.PI*.68,p.aim+Math.PI*.42,p.aim-Math.PI*.42,p.aim+Math.PI/2,p.aim-Math.PI/2,0,Math.PI/2,Math.PI,Math.PI*1.5];
   const radii=[245,285,315,220];
   for(const a of angles)for(const r of radii){
    const q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};
    if(C.distance(q,p)<RULES.hunterMinRadius||C.distance(q,p)>RULES.hunterMaxRadius)continue;
    if(!this.validPosition(q,16))continue;
    if(points.some(x=>C.distance(x,q)<145))continue;
    points.push(q);if(points.length>=count)return points;
   }
   // Fallback to any valid arena spawn that is far enough away.
   for(const q of this.arena?.spawns||[])if(this.validPosition(q,16)&&C.distance(q,p)>=RULES.hunterMinRadius&&!points.some(x=>C.distance(x,q)<145)){points.push({...q});if(points.length>=count)break;}
   return points;
  }
  scheduleHunterBreach(){
   if(!RULES.enabled||this.roundPace?.resting)return false;
   const ac=this.antiCamp,active=this.zombies.filter(z=>!z.dead),pending=ac.breachWarnings.length;
   const cap=this.roundPace?.cap??C.PRESSURE_WAVES[this.wave].cap,slots=cap-active.length-this.warnings.length-pending;
   const count=Math.min(this.breachCount()-active.filter(z=>z.hunter).length-pending,slots);
   if(count<=0)return false;
   const points=this.candidateBreachPoints(count);if(!points.length)return false;
   for(const q of points)ac.breachWarnings.push({x:q.x,y:q.y,left:RULES.hunterWarning,total:RULES.hunterWarning,kind:'runner',breach:true});
   ac.breaches++;ac.breachCooldown=this.wave>=4?RULES.breachCooldownLate:RULES.breachCooldownEarly;
   this.emit('camp_breach',{x:this.player.x,y:this.player.y,count:points.length,hold:+ac.hold.toFixed(2),edge:this.edgeDistance()<RULES.edgeDistance});
   return true;
  }
  spawnHunter(w){
   if(!RULES.enabled)return null;
   // Include the close-range rush in the ceiling; early hunters stay below base player speed.
   const z=super.spawnZombie('runner',w.x,w.y);z.hunter=true;z.speed=Math.min(z.speed*(RULES.hunterSpeed+this.wave*.018),(RULES.hunterChaseSpeed+this.wave*RULES.hunterChaseStep)/C.RULES.runnerRush);z.pressureSpeed=z.speed;z.hp*=.9;z.maxHp=z.hp;this.antiCamp.huntersSpawned++;this.emit('hunter_drop',{id:z.id,x:z.x,y:z.y});return z;
  }
  scheduleShockZone(){
   if(!RULES.enabled)return false;
   const ac=this.antiCamp;if(ac.zone||ac.zoneCooldown>0)return false;
   ac.zone={x:ac.anchor.x,y:ac.anchor.y,radius:RULES.zoneRadius,phase:'warning',left:RULES.zoneWarning,total:RULES.zoneWarning,tick:0};
   ac.zoneCooldown=RULES.zoneCooldown;this.emit('camp_zone_warning',{x:ac.zone.x,y:ac.zone.y,radius:ac.zone.radius});return true;
  }
  updateCampPressure(dt){
   const ac=this.antiCamp;if(!RULES.enabled||!ac||this.mode==='range'||this.status!=='playing')return;
   ac.breachCooldown=Math.max(0,ac.breachCooldown-dt);ac.zoneCooldown=Math.max(0,ac.zoneCooldown-dt);
   const p=this.player,specialMove=this.panic?.boostLeft>0||!!this.arcade?.vehicle||this.roundPace?.resting;
   if(specialMove){ac.anchor={x:p.x,y:p.y};ac.hold=0;}else{
    const drift=C.distance(p,ac.anchor);
    if(drift>RULES.resetDistance){ac.anchor={x:p.x,y:p.y};ac.hold=0;this.emit('camp_reset',{x:p.x,y:p.y});}
    else ac.hold+=dt;
    const threshold=this.campThreshold();ac.lastThreshold=threshold;
    if(ac.hold>=threshold&&ac.breachCooldown<=0)this.scheduleHunterBreach();
    const zoneAt=this.edgeDistance()<RULES.edgeDistance?RULES.zoneAtEdge:RULES.zoneAtOpen;
    if(ac.hold>=zoneAt)this.scheduleShockZone();
   }
   for(let i=ac.breachWarnings.length-1;i>=0;i--){const w=ac.breachWarnings[i];w.left-=dt;if(w.left>0)continue;this.spawnHunter(w);ac.breachWarnings.splice(i,1);}
   const zone=ac.zone;
   if(zone){
    zone.left=Math.max(0,zone.left-dt);
    if(zone.phase==='warning'&&zone.left<=0){zone.phase='active';zone.left=RULES.zoneActive;zone.total=RULES.zoneActive;zone.tick=0;this.emit('camp_zone_on',{x:zone.x,y:zone.y,radius:zone.radius});}
    else if(zone.phase==='active'){
     zone.tick-=dt;
     if(zone.tick<=0&&C.distance(p,zone)<=zone.radius){zone.tick=RULES.zoneTick;this.damagePlayer(RULES.zoneDamage,'shock strike');}
     if(zone.left<=0){this.emit('camp_zone_off',{x:zone.x,y:zone.y});ac.zone=null;}
    }
   }
  }
  spawnPoints(count=1){
   const ac=this.antiCamp;if(!RULES.enabled||!ac||this.mode==='range'||ac.hold<RULES.flankBiasAt)return super.spawnPoints(count);
   const points=this.arena?.spawns||[],eligible=points.filter(p=>C.distance(p,this.player)>=C.RULES.spawnDistance&&this.validPosition(p,23)),pool=(eligible.length?eligible:points).slice();
   if(!pool.length)return super.spawnPoints(count);
   const chosen=[];
   // While a player is stale, put the first normal spawn outside their current firing cone.
   pool.sort((a,b)=>Math.abs(C.wrap(C.angleTo(this.player,b)-this.player.aim))-Math.abs(C.wrap(C.angleTo(this.player,a)-this.player.aim)));
   chosen.push(pool.shift());
   while(chosen.length<count&&pool.length){let best=0,bestSep=-1;for(let i=0;i<pool.length;i++){const a=C.angleTo(this.player,pool[i]),sep=Math.min(...chosen.map(q=>Math.abs(C.wrap(a-C.angleTo(this.player,q)))));if(sep>bestSep){bestSep=sep;best=i;}}chosen.push(pool.splice(best,1)[0]);}
   ac.flankBursts++;return chosen;
  }
  tick(dt,input={}){const out=super.tick(dt,input);if(this.status==='playing')this.updateCampPressure(C.clamp(dt,0,1/60));return out;}
  export(){const out=super.export(),ac=this.antiCamp;return {...out,version:'Deadwatch_0.17',parent:'Deadwatch_0.16',antiCamp:ac?{...ac,anchor:{...ac.anchor},breachWarnings:ac.breachWarnings.map(w=>({...w})),zone:ac.zone?{...ac.zone}:null}:null};}
 }
 return {...C,Game:BreakoutGame,ANTI_CAMP_RULES:RULES};
}
if(typeof module==='object'&&module.exports)module.exports=install(require('./route16.js'));else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);


/* Arcade lives: isolated death recovery; wave director and combat remain unchanged. */
(function(root){'use strict';
function install(C){
 const LIFE_RULES=Object.freeze({startingLives:3,shieldSeconds:2.5});
 class LivesGame extends C.Game{
  start(mode='campaign',loadout='carbine'){
   this.lives=LIFE_RULES.startingLives;this.respawnShield=0;this.lifeStats={deaths:0,respawns:0};
   return super.start(mode,loadout);
  }
  beginWave(wave){this.respawnShield=0;return super.beginWave(wave);}
  respawnPoint(){
   const p=this.player,start=this.arena?.start||[720,520],candidates=[{x:p.x,y:p.y},{x:start[0],y:start[1]}];
   for(const y of [180,350,520,690,860])for(const x of [180,360,540,720,900,1080,1260])candidates.push({x,y});
   const threats=this.zombies.filter(z=>!z.dead),warnings=[...(this.warnings||[]),...(this.antiCamp?.breachWarnings||[])],zone=this.antiCamp?.zone;
   let best={x:p.x,y:p.y},bestScore=-Infinity;
   for(const q of candidates){
    if(!this.validPosition(q,p.r+12))continue;
    let clearance=500;
    for(const z of threats)clearance=Math.min(clearance,C.distance(q,z)-z.r-p.r);
    for(const w of warnings)clearance=Math.min(clearance,C.distance(q,w)-80);
    for(const b of this.barrels||[])if(!b.spent)clearance=Math.min(clearance,C.distance(q,b)-115);
    if(zone)clearance=Math.min(clearance,C.distance(q,zone)-zone.radius-35);
    const edge=Math.min(q.x-45,this.width-45-q.x,q.y-45,this.height-45-q.y),score=Math.min(clearance,330)+Math.min(edge,160)*.25-C.distance(q,p)*.02;
    if(score>bestScore){bestScore=score;best=q;}
   }
   return{x:best.x,y:best.y};
  }
  handlePlayerDown(from){
   this.lives=Math.max(0,this.lives-1);this.lifeStats.deaths++;
   if(this.reward){const before=this.reward.multiplier;this.reward.multiplier=Math.max(1,before-2);this.reward.progress=0;this.emit('multiplier_lost',{before,multiplier:this.reward.multiplier});}
   const p=this.player,origin={x:p.x,y:p.y};
   this.emit('life_lost',{...origin,lives:this.lives,from});
   if(this.lives===0)return false;
   const q=this.respawnPoint();this.clearSpecial('respawn');
   Object.assign(p,{x:q.x,y:q.y,vx:0,vy:0,hp:p.maxHp,stamina:100,roll:0,rollCooldown:.25,reload:null,fireCooldown:.15,slot:0,hurtGrace:0,flash:0,recoil:0});
   if(this.panic){this.panic.boostLeft=0;this.panic.invuln=0;}
   this.cancelInteraction();this.resetAntiCampAnchor();
   this.respawnShield=LIFE_RULES.shieldSeconds;this.lifeStats.respawns++;
   this.emit('respawn',{x:q.x,y:q.y,fromX:origin.x,fromY:origin.y,lives:this.lives,shield:this.respawnShield});
   return true;
  }
  damagePlayer(amount,from){if(this.respawnShield>0)return false;return super.damagePlayer(amount,from);}
  tick(dt,input={}){
   if(this.status==='playing')this.respawnShield=Math.max(0,this.respawnShield-C.clamp(dt,0,1/60));
   return super.tick(dt,input);
  }
  export(){return{...super.export(),lives:this.lives,respawnShield:this.respawnShield,lifeStats:{...this.lifeStats}};}
 }
 return{...C,Game:LivesGame,LIFE_RULES};
}
if(typeof module==='object'&&module.exports)module.exports=install(module.exports);else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

/* Temporary support companion. Separate from the player's weapon and vehicle slots. */
(function(root){'use strict';
function install(C){
 const RULES=Object.freeze({duration:15,damage:2.25,interval:.025,range:660,firstDrop:8,dropEvery:36});
 class CompanionGame extends C.Game{
  start(mode='campaign',loadout='carbine'){this.companion=null;this.companionStats={picked:0,shots:0,hits:0,kills:0};return super.start(mode,loadout);}
  collectArcade(q){
   if(q?.type!=='drone')return super.collectArcade(q);
   const p=this.player,old=this.companion;
   this.companion=old?{...old,left:RULES.duration}:{x:p.x,y:p.y,r:18,aim:p.aim,left:RULES.duration,cooldown:0,flash:0,stowed:true};
   this.companionStats.picked++;this.arcade.picked++;this.arcade.dropPicked++;
   this.emit('companion_pickup',{x:q.x??p.x,y:q.y??p.y,refreshed:!!old,duration:RULES.duration});return true;
  }
  endCompanion(reason){if(!this.companion)return;const d=this.companion;this.companion=null;this.emit('companion_end',{x:d.x,y:d.y,reason});}
  handlePlayerDown(from){this.endCompanion('death');return super.handlePlayerDown(from);}
  applyArena(wave){const out=super.applyArena(wave);if(this.companion)this.companion.stowed=true;return out;}
  damageZombie(z,amount){
   const alive=!z.dead;super.damageZombie(z,amount);
   const rail=this.railRewardRules?.(),first=rail?.droneFirst??(this.mode==='range'?3:RULES.firstDrop),every=rail?.droneEvery??(this.mode==='range'?8:RULES.dropEvery);
   if(alive&&z.dead&&this.stats.kills>=first&&(this.stats.kills-first)%every===0&&this.allowKillPowerDrop?.()!==false){
    const q={type:'drone',x:z.x,y:z.y,left:22};this.arcadePickups.push(q);this.emit('arcade_drop',{power:'drone',label:'ATTACK DRONE',x:q.x,y:q.y});
   }
  }
  updateCompanion(dt,input,combat,d=this.companion,p=this.player,stats=this.companionStats){
   if(!d||!p)return;
   if(combat){const before=d.left;d.left=Math.max(0,d.left-dt);if(before>3&&d.left<=3&&d.left>0)(p===this.player?this.emit('companion_low'):null);if(d.left<=0){if(p===this.player)this.endCompanion('expired');else{p.drone=null;this.emit('squad_power_end',{actorId:p.actorId,name:p.name,power:'drone',x:p.x,y:p.y});}return;}}
   d.cooldown=Math.max(0,d.cooldown-dt);d.flash=Math.max(0,d.flash-dt);d.aim=p.aim;
   const f=C.polar(p.aim,1),side={x:-f.y,y:f.x};let target=null;
   for(const [back,offset] of [[24,54],[24,-54],[62,0],[-54,0],[0,0]]){
    const q={x:p.x-f.x*back+side.x*offset,y:p.y-f.y*back+side.y*offset};
    if(this.validPosition(q,d.r)&&this.clearRoute(p,q,d.r)){target=q;break;}
   }
   if(!target){d.stowed=true;return;}
   if(d.stowed||C.distance(d,p)>175||!this.validPosition(d,d.r)||!this.clearRoute(d,target,d.r)){d.x=target.x;d.y=target.y;}
   else{const k=1-Math.exp(-dt*13);d.x=C.mix(d.x,target.x,k);d.y=C.mix(d.y,target.y,k);}
   d.stowed=false;if(p!==this.player){const target=this.zombies.find(z=>z.id===p.targetId&&!z.dead);if(target)d.aim=C.angleTo(d,target);}
   if(!combat||!input.fire||p.roll>0||d.cooldown>0)return;
   // Clip the muzzle offset too, so firing beside a wall cannot start inside it.
   const shotDir=C.polar(d.aim,1),muzzleDistance=Math.min(16,Math.max(0,this.wallDistance(d,shotDir,16)-1));
   const origin=C.add(d,C.polar(d.aim,muzzleDistance)),wall=this.wallDistance(origin,shotDir,RULES.range);
   let nearest=null,end=wall;
   for(const z of this.zombies)if(!z.dead){const t=C.rayCircle(origin,shotDir,z,z.r+1,wall);if(Number.isFinite(t)&&t<end){nearest={entity:z,barrel:false};end=t;}}
   for(const b of this.barrels||[])if(!b.spent){const t=C.rayCircle(origin,shotDir,b,16,wall);if(Number.isFinite(t)&&t<end){nearest={entity:b,barrel:true};end=t;}}
   if(p!==this.player&&(this.combatActors().some(a=>C.rayCircle(origin,shotDir,a,a.r+6,end)<end)||(nearest?.barrel&&this.combatActors().some(a=>C.distance(a,nearest.entity)<150))))return;
   const kills=this.stats.kills;d.cooldown=RULES.interval;d.flash=.065;stats.shots++;
   if(nearest){stats.hits++;if(nearest.barrel){nearest.entity.hp-=RULES.damage;if(nearest.entity.hp<=0)this.explode(nearest.entity);}else this.damageZombie(nearest.entity,RULES.damage);}
   stats.kills+=this.stats.kills-kills;
   this.emit('companion_shot',{actorX:d.x,actorY:d.y,aim:d.aim,x:origin.x,y:origin.y,height:1.80+Math.sin(this.time*5)*.045,path:{a:{x:origin.x,y:origin.y},b:C.add(origin,C.polar(d.aim,end)),kind:nearest?(nearest.barrel?'barrel':'zombie'):wall<RULES.range?'wall':'air'}});
  }
  tick(dt,input={}){
   const out=super.tick(dt,input),step=C.clamp(dt,0,1/60);
   if(this.status==='loot'){
    for(const q of this.arcadePickups)if(q.type==='drone'&&q.left>0){q.left=Math.max(0,q.left-step);if(q.left>0&&C.distance(q,this.player)<40&&this.clearRoute(this.player,q)){this.collectArcade(q);q.left=0;}}
    this.arcadePickups=this.arcadePickups.filter(q=>q.left>0);
   }
   if(this.status==='playing'||this.status==='loot')this.updateCompanion(step,input,this.status==='playing');
   else if(this.status==='defeat'||this.status==='won')this.endCompanion('run ended');
   return out;
  }
  export(){return{...super.export(),companion:this.companion?{...this.companion}:null,companionStats:{...this.companionStats}};}
 }
 return{...C,Game:CompanionGame,COMPANION_RULES:RULES,ARCADE_DROP_LABELS:Object.freeze({...C.ARCADE_DROP_LABELS,drone:'ATTACK DRONE'})};
}
if(typeof module==='object'&&module.exports)module.exports=install(module.exports);else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

(function(root){'use strict';
function install(C){
 const RULES=Object.freeze({enabled:false,duration:20,tagsRequired:10,tagEvery:5});
 const ANIMALS=Object.freeze({
  monkey:Object.freeze({name:'MONKEY',ability:'BANANA BOMBS',range:370,interval:1.35,radius:15}),
  cow:Object.freeze({name:'COW',ability:'MOO-VE OVER',range:260,interval:2.4,radius:22}),
  dolphin:Object.freeze({name:'DOLPHIN',ability:'SPLASH DAMAGE',range:300,interval:.85,radius:18})
 });
 class ReinforcementGame extends C.Game{
  start(mode='campaign',loadout='carbine'){this.reinforcement=null;this.reinforcementSerial=0;this.reinforcementTags=0;this.animalProjectiles=[];this.animalSeed=(Math.random()*4294967296)>>>0;this.animalRng=new C.Random(this.animalSeed);this.reinforcementStats={picked:0,shots:0,hits:0,kills:0,tagsDropped:0,tagsCollected:0};return super.start(mode,loadout);}
  collectArcade(q){
   if(q?.type!=='soldier')return super.collectArcade(q);
   if(!RULES.enabled){q.left=0;return false;}
   if(q.collected||q.left===0)return false;
   q.collected=true;q.left=0;
   this.reinforcementTags++;this.reinforcementStats.tagsCollected++;this.arcade.picked++;this.arcade.dropPicked++;
   this.emit('reinforcement_tag',{x:q.x??this.player.x,y:q.y??this.player.y,tags:this.reinforcementTags,required:RULES.tagsRequired});
   if(this.reinforcementTags<RULES.tagsRequired)return true;
   this.reinforcementTags-=RULES.tagsRequired;
   const p=this.player,old=this.reinforcement,kind=Object.keys(ANIMALS)[Math.min(2,Math.floor(this.animalRng.next()*3))],spec=ANIMALS[kind];
   this.animalProjectiles=[];
   this.reinforcement={id:++this.reinforcementSerial,kind,x:p.x,y:p.y,r:spec.radius,aim:p.aim,vx:0,vy:0,recoil:0,left:RULES.duration,cooldown:.25,targetId:null,targetClock:0,stowed:true,step:0,action:0,charge:null};
   this.reinforcementStats.picked++;
   this.emit('reinforcement_pickup',{x:q.x??p.x,y:q.y??p.y,kind,label:spec.name,ability:spec.ability,replaced:!!old,duration:RULES.duration});return true;
  }
  endReinforcement(reason){const a=this.reinforcement;if(!a)return;this.reinforcement=null;this.animalProjectiles=[];this.emit('reinforcement_end',{x:a.x,y:a.y,kind:a.kind,label:ANIMALS[a.kind].name,reason});}
  handlePlayerDown(from){this.endReinforcement('death');return super.handlePlayerDown(from);}
  applyArena(wave){const out=super.applyArena(wave);if(this.reinforcement){this.reinforcement.stowed=true;this.reinforcement.navPath=null;this.reinforcement.charge=null;this.animalProjectiles=[];}return out;}
  damageZombie(z,amount){
   const alive=!z.dead;super.damageZombie(z,amount);
   if(RULES.enabled&&alive&&z.dead&&this.streak>0&&this.streak%RULES.tagEvery===0){
    const q={type:'soldier',x:z.x,y:z.y,left:22};this.arcadePickups.push(q);this.reinforcementStats.tagsDropped++;
    this.emit('arcade_drop',{power:'soldier',label:'WILD TAG',streak:this.streak,x:q.x,y:q.y});
   }
  }
  updateReinforcement(dt,combat){
   if(!RULES.enabled)return;
   const a=this.reinforcement,p=this.player;if(!a||!p)return;const spec=ANIMALS[a.kind];
   if(combat){const before=a.left;a.left=Math.max(0,a.left-dt);if(before>3&&a.left<=3&&a.left>0)this.emit('reinforcement_low',{kind:a.kind,label:spec.name});if(a.left<=0){this.endReinforcement('expired');return;}}
   a.cooldown=Math.max(0,a.cooldown-dt);a.recoil=Math.max(0,a.recoil-dt);a.action=Math.max(0,a.action-dt);a.targetClock=Math.max(0,a.targetClock-dt);
   if(combat)this.updateAnimalProjectiles(dt);
   if(a.charge){if(combat)this.updateCowCharge(a,dt);else a.vx=a.vy=0;return;}
   const f=C.polar(p.aim,1),side={x:-f.y,y:f.x};let goal=null;
   for(const [back,offset] of [[55,-72],[80,0],[55,72],[-65,-45],[0,0]]){const q={x:p.x-f.x*back+side.x*offset,y:p.y-f.y*back+side.y*offset};if(this.validPosition(q,a.r)&&this.clearRoute(p,q,a.r)){goal=q;break;}}
   if(!goal){a.stowed=true;a.vx=a.vy=0;return;}
   if(a.stowed||C.distance(a,p)>460||!this.validPosition(a,a.r)){a.x=goal.x;a.y=goal.y;a.navPath=null;a.vx=a.vy=0;}
   else{
    const q=this.waypoint(a,goal),x=a.x,y=a.y;
    if(q){const d=C.distance(a,q),speed=Math.min(300,Math.max(0,d-3)*5),step=Math.min(d,speed*dt),v=C.polar(Math.atan2(q.y-a.y,q.x-a.x),step),next={x:a.x+v.x,y:a.y+v.y};if(this.validPosition(next,a.r)&&this.clearRoute(a,next,a.r)){a.x=next.x;a.y=next.y;}}
    a.vx=dt?(a.x-x)/dt:0;a.vy=dt?(a.y-y)/dt:0;
   }
   a.stowed=false;a.step+=Math.hypot(a.vx,a.vy)*dt*.05;
   let target=this.zombies.find(z=>z.id===a.targetId&&!z.dead);
   if(!target||a.targetClock<=0){let best=spec.range;target=null;for(const z of this.zombies)if(!z.dead){const d=C.distance(a,z);if(d<best&&this.clearRoute(a,z)){target=z;best=d;}}a.targetId=target?.id??null;a.targetClock=.15;}
   const wanted=target?Math.atan2(target.y-a.y,target.x-a.x):p.aim,diff=Math.atan2(Math.sin(wanted-a.aim),Math.cos(wanted-a.aim));a.aim+=C.clamp(diff,-dt*14,dt*14);
   if(!combat||!target||a.cooldown>0||Math.abs(diff)>.18||C.distance(a,target)>spec.range||!this.clearRoute(a,target))return;
   a.cooldown=spec.interval;a.action=.4;this.reinforcementStats.shots++;
   if(a.kind==='monkey'){
    const dist=C.distance(a,target),dir=C.polar(a.aim,1),end=Math.min(dist,this.wallDistance(a,dir,dist));
    const q=C.add(a,C.polar(a.aim,end));this.animalProjectiles.push({x:a.x,y:a.y,tx:q.x,ty:q.y,aim:a.aim,left:.44,max:.44});
    this.emit('animal_attack',{kind:a.kind,x:a.x,y:a.y});
   }else if(a.kind==='cow'){
    a.charge={windup:.22,left:.42,aim:a.aim,hits:[]};this.emit('animal_attack',{kind:a.kind,x:a.x,y:a.y});
   }else{
    const dir=C.polar(a.aim,1),end=this.wallDistance(a,dir,spec.range),b=C.add(a,C.polar(a.aim,end));
    for(const z of this.zombies)if(!z.dead){const d=C.distance(a,z),angle=Math.atan2(z.y-a.y,z.x-a.x)-a.aim;if(d<spec.range&&Math.cos(angle)>.89&&this.clearRoute(a,z)){z.animalSlow=Math.max(z.animalSlow||0,1.25);this.animalDamage(z,48);}}
    this.emit('animal_attack',{kind:a.kind,x:a.x,y:a.y,aim:a.aim,b});
   }
  }
  animalDamage(z,amount){const kills=this.stats.kills;this.reinforcementStats.hits++;this.damageZombie(z,amount);this.reinforcementStats.kills+=this.stats.kills-kills;}
  updateAnimalProjectiles(dt){
   for(const b of this.animalProjectiles){b.left-=dt;if(b.left>0)continue;
    const center={x:b.tx,y:b.ty};for(const z of this.zombies)if(!z.dead&&C.distance(center,z)<82&&this.clearRoute(center,z))this.animalDamage(z,115);
    this.emit('animal_blast',{kind:'monkey',x:b.tx,y:b.ty,radius:82});
   }
   this.animalProjectiles=this.animalProjectiles.filter(b=>b.left>0);
  }
  animalPush(z,aim,amount){
   const dir=C.polar(aim,1),distance=Math.min(amount,Math.max(0,this.wallDistance(z,dir,amount)-z.r-2)),next=C.add(z,C.polar(aim,distance));
   if(this.validPosition(next,z.r)&&this.clearRoute(z,next,z.r)){z.x=next.x;z.y=next.y;}
  }
  updateCowCharge(a,dt){
   const c=a.charge;a.aim=c.aim;a.vx=a.vy=0;
   if(c.windup>0){c.windup=Math.max(0,c.windup-dt);return;}
   const distance=Math.min(dt,c.left)*680,dir=C.polar(c.aim,1),next=C.add(a,C.polar(c.aim,distance));
   if(!this.validPosition(next,a.r)||!this.clearRoute(a,next,a.r)){a.charge=null;return;}
   for(const z of this.zombies)if(!z.dead&&!c.hits.includes(z.id)&&Number.isFinite(C.rayCircle(a,dir,z,z.r+a.r+5,distance))&&this.clearRoute(a,z)){
    c.hits.push(z.id);this.animalDamage(z,165);if(!z.dead){this.animalPush(z,c.aim,64);z.animalStun=.5;}
    this.emit('animal_blast',{kind:'cow',x:z.x,y:z.y,radius:24});
   }
   a.x=next.x;a.y=next.y;a.vx=dir.x*680;a.vy=dir.y*680;a.step+=distance*.07;c.left-=dt;if(c.left<=0)a.charge=null;
  }
  updateZombie(z,dt){
   if(z.dead||(!z.animalStun&&!z.animalSlow))return super.updateZombie(z,dt);
   if(z.animalStun>0){z.animalStun=Math.max(0,z.animalStun-dt);z.animalSlow=Math.max(0,(z.animalSlow||0)-dt);return;}
   const speed=z.speed,slow=(z.animalSlow||0)>0;z.animalSlow=Math.max(0,(z.animalSlow||0)-dt);
   if(slow)z.speed*=.45;try{return super.updateZombie(z,dt);}finally{z.speed=speed;}
  }
  tick(dt,input={}){
   const step=C.clamp(dt,0,1/60);
   // Tags are collectibles: do not make a pile wait for the weapon pickup lock.
   if(this.status==='playing'||this.status==='loot'){
    for(const q of this.arcadePickups)if(q.type==='soldier'&&q.left>0){if(this.status==='loot')q.left=Math.max(0,q.left-step);if(q.left>0&&C.distance(q,this.player)<40&&this.clearRoute(this.player,q))this.collectArcade(q);}
    this.arcadePickups=this.arcadePickups.filter(q=>q.left>0);
   }
   const out=super.tick(dt,input);
   if(this.status==='playing'||this.status==='loot')this.updateReinforcement(step,this.status==='playing');else if(this.status==='defeat'||this.status==='won')this.endReinforcement('run ended');return out;
  }
  export(){return{...super.export(),reinforcement:this.reinforcement?{...this.reinforcement}:null,reinforcementStats:{...this.reinforcementStats},reinforcementTags:this.reinforcementTags,animalSeed:this.animalSeed,animalProjectiles:this.animalProjectiles.map(q=>({...q}))};}
 }
 return{...C,Game:ReinforcementGame,REINFORCEMENT_RULES:RULES,ANIMAL_COMPANIONS:ANIMALS,ARCADE_DROP_LABELS:Object.freeze({...C.ARCADE_DROP_LABELS,soldier:'WILD TAG'})};
}
if(typeof module==='object'&&module.exports)module.exports=install(module.exports);else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

// Arcade run rewards: score lives and one inter-round armory, reusing existing pickups and controls.
(function(root){'use strict';
function install(C){
 const RUN_REWARDS=Object.freeze({lifeScore:50000,maxLives:5,armoryWave:3});
 class RunRewardsGame extends C.Game{
  start(mode='campaign',loadout='carbine'){
   this.nextLifeScore=RUN_REWARDS.lifeScore;this.scoreLivesEarned=0;this.armoryReward=null;
   return super.start(mode,loadout);
  }
  checkScoreLives(){
   if(!['campaign','quick','endless'].includes(this.mode)||this.lives<=0||!Number.isFinite(this.score)||!Number.isFinite(this.nextLifeScore))return;
   while(this.score>=this.nextLifeScore){
    const threshold=this.nextLifeScore;this.nextLifeScore+=RUN_REWARDS.lifeScore;
    if(this.lives<RUN_REWARDS.maxLives){this.lives++;this.scoreLivesEarned++;this.emit('extra_life',{lives:this.lives,threshold,next:this.nextLifeScore,x:this.player.x,y:this.player.y});}
   }
  }
  damageZombie(z,amount){const out=super.damageZombie(z,amount);this.checkScoreLives();return out;}
  completeWave(){const out=super.completeWave();this.checkScoreLives();return out;}
  rewardPayload(variant){
   if(variant.id!=='armory')return super.rewardPayload(variant);
   return [{type:'ray',armory:true},{type:'tank',armory:true},{type:'heli',armory:true},
    {type:'nuke'},{type:'boost'},{type:'coin',tier:'stack'},{type:'gem',tier:'medium'},
    {type:'boost'},{type:'coin',tier:'gold'},{type:'nuke'},{type:'gem',tier:'small'},{type:'coin',tier:'stack'}];
  }
  spawnRewardItem(desc,pileIndex){
   if(!desc.armory)return super.spawnRewardItem(desc,pileIndex);
   const p=this.player,offers=this.lootPickups.filter(q=>q.armory),target=-Math.PI/2+offers.length*Math.PI*2/3;
   const legal=q=>this.validPosition(q,24)&&this.clearRoute(p,q)&&C.distance(p,q)>85&&offers.every(o=>C.distance(o,q)>105)&&!(this.stations||[]).some(o=>C.distance(o,q)<55);
   let spot=null;
   for(const r of [140,190,240]){for(let i=0;i<24;i++){const a=target+i*Math.PI/12,q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};if(legal(q)){spot=q;break;}}if(spot)break;}
   if(!spot)spot=this.lootSpots(40).find(legal);if(!spot)return null;
   const item={id:++this.serial,type:desc.type,armory:true,...spot,left:this.loot.left,born:this.time};
   if(item.type==='ray')C.Voidcaster.assign(item);this.lootPickups.push(item);this.lootStats.spawned++;return item;
  }
  collectLoot(q){
   if(q?.armory){
    if(q.left<=0||this.status!=='loot'||this.loot?.variant!=='armory'||this.armoryReward)return;
    this.armoryReward={type:q.type,wave:this.wave+1,voidVariant:q.type==='ray'?C.Voidcaster.assign(q).id:null};
    for(const item of this.lootPickups)if(item.armory)item.left=0;
    this.lootStats.collected++;this.emit('armory_choice',{power:q.type,label:q.type==='ray'?C.Voidcaster.assign(q).name:C.ARCADE_DROP_LABELS[q.type],x:q.x,y:q.y});return;
   }
   const out=super.collectLoot(q);this.checkScoreLives();return out;
  }
  beginWave(wave){
   const reward=this.armoryReward;this.armoryReward=null;const out=super.beginWave(wave);
   // Arena setup clears temporary weapons; grant the chosen reward afterwards, at full duration.
   if(reward?.wave===wave)this.collectArcade({type:reward.type,voidVariant:reward.voidVariant,x:this.player.x,y:this.player.y});
   return out;
  }
  startArmoryTest(){
   this.start('range');this.beginWave(RUN_REWARDS.armoryWave);
   this.loot={left:12,total:12,nextStatus:'between',wave:this.wave+1};this.spawnLootShower();this.status='loot';
   this.emit('loot_start',{wave:this.wave+1,left:this.loot.left,nextStatus:'between'});
  }
  export(){return{...super.export(),runRewards:{nextLifeScore:this.nextLifeScore,scoreLivesEarned:this.scoreLivesEarned,armoryReward:this.armoryReward?{...this.armoryReward}:null}};}
 }
 return{...C,Game:RunRewardsGame,RUN_REWARDS};
}
if(typeof module==='object'&&module.exports)module.exports=install(module.exports);else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

// Round-four finale: an isolated boss encounter before the existing armory reward.
(function(root){'use strict';
function install(C){
 const BREAKER_RULES=Object.freeze({wave:3,health:4400,radius:31,speed:82,chargeSpeed:420,warning:1.1,recovery:2.7,escortCap:2});
 class BreakerGame extends C.Game{
  start(mode='campaign',loadout='carbine'){this.bossEncounter=null;return super.start(mode,loadout);}
  beginWave(wave){this.bossEncounter=null;return super.beginWave(wave);}
  completeWave(){
   if(this.status!=='playing')return;
   if(this.mode==='campaign'&&this.wave===BREAKER_RULES.wave){
    if(!this.bossEncounter){this.beginBossEncounter();return;}
    if(!this.bossEncounter.defeated)return;
   }
   return super.completeWave();
  }
  beginBossEncounter(){
   if(this.bossEncounter)return false;
   const p=this.player,r=BREAKER_RULES.radius,candidates=[];
   for(const distance of [300,360,420])for(let i=0;i<16;i++){const a=i*Math.PI/8;const q={x:p.x+Math.cos(a)*distance,y:p.y+Math.sin(a)*distance};if(this.validPosition(q,r)&&this.clearRoute(q,p,r))candidates.push(q);}
   const fallback=[...(this.arena?.spawns||[]),...this.navGraph(r).nodes].filter(q=>this.validPosition(q,r)&&C.distance(q,p)>180);
   const spot=candidates[0]||fallback.sort((a,b)=>C.distance(a,p)-C.distance(b,p))[0];
   if(!spot)return false;
   this.queue=[];this.warnings=[];
   if(this.antiCamp){this.antiCamp.zone=null;this.antiCamp.breachWarnings=[];this.resetAntiCampAnchor();}
   const z=super.spawnZombie('brute',spot.x,spot.y);
   Object.assign(z,{boss:true,r,hp:BREAKER_RULES.health,maxHp:BREAKER_RULES.health,speed:BREAKER_RULES.speed,pressureSpeed:BREAKER_RULES.speed,bossPhase:'arrival',bossTimer:1.4,bossCharge:null,bossImpactAt:0,attack:null});
   this.bossEncounter={id:z.id,active:true,defeated:false,addsAt:this.time+6};
   this.emit('boss_spawn',{id:z.id,name:'THE BREAKER',x:z.x,y:z.y});return true;
  }
  director(dt){
   const encounter=this.bossEncounter;if(!encounter?.active)return super.director(dt);
   if(encounter.defeated){
    encounter.active=false;this.warnings=[];this.queue=[];
    for(const z of this.zombies)if(z.bossEscort&&!z.dead){z.dead=true;z.hp=0;z.deathTime=this.time;z.attack=null;}
    if(this.mode==='range'){
     this.loot={left:12,total:12,nextStatus:'between',wave:this.wave+1};this.spawnLootShower();this.status='loot';this.emit('loot_start',{wave:this.wave+1,left:12,nextStatus:'between'});
    }else this.completeWave();
    return;
   }
   for(let i=this.warnings.length-1;i>=0;i--){const w=this.warnings[i];w.left-=dt;if(w.left>0)continue;this.warnings.splice(i,1);if(C.distance(w,this.player)<180)continue;const z=super.spawnZombie('walker',w.x,w.y);z.bossEscort=true;}
   const count=this.zombies.filter(z=>z.bossEscort&&!z.dead).length+this.warnings.length;
   if(this.zombies.find(z=>z.boss&&!z.dead)?.bossPhase==='hunt'&&this.time>=encounter.addsAt&&count<BREAKER_RULES.escortCap){const q=this.spawnPoint();this.warnings.push({x:q.x,y:q.y,kind:'walker',left:1});encounter.addsAt=this.time+6;}
  }
  updateCampPressure(dt){if(this.bossEncounter?.active)return;return super.updateCampPressure(dt);}
  prepareBossCharge(z){
   const actor=this.zombieTarget(z),a=C.angleTo(z,actor),dx=Math.cos(a),dy=Math.sin(a),wanted=Math.min(440,Math.max(180,C.distance(z,actor)+85));let length=0;
   for(let d=8;d<=wanted;d+=8){const q={x:z.x+dx*d,y:z.y+dy*d};if(!this.validPosition(q,z.r)||!this.clearRoute(z,q,z.r))break;length=d;}
   if(length<80)return false;
   z.aim=a;z.bossPhase='windup';z.bossTimer=BREAKER_RULES.warning;z.bossCharge={x:z.x,y:z.y,dx,dy,length,remaining:length,wall:length+8<=wanted};
   this.emit('boss_windup',{id:z.id,x:z.x,y:z.y});return true;
  }
  recoverBoss(z){const wall=!!z.bossCharge?.wall;z.bossPhase='recover';z.bossTimer=wall?3.2:BREAKER_RULES.recovery;z.bossCharge=null;this.emit('boss_recover',{id:z.id,x:z.x,y:z.y,wall});}
  updateZombie(z,dt){
   if(!z.boss)return super.updateZombie(z,dt);if(z.dead)return;const actor=this.zombieTarget(z);
   z.flash=Math.max(0,z.flash-dt);z.bossTimer=Math.max(0,z.bossTimer-dt);z.attack=null;
   if(this.trap.active>0&&this.time>=(z.bossTrapUntil||0)&&C.distance(z,this.trap)<=this.trap.radius&&this.clearRoute(this.trap,z)){
     z.bossTrapUntil=this.time+12;this.recoverBoss(z);z.bossTimer=3.2;this.emit('boss_stagger',{id:z.id,x:z.x,y:z.y});return;
    }
    if(z.bossPhase==='slam'){
     if(z.bossTimer<=0){for(const a of this.combatActors())if(!a.down&&C.distance(z,a)<128+a.r&&this.clearRoute(z,a))this.damageActor(a,30,'Breaker slam');this.emit('boss_slam',{id:z.id,x:z.x,y:z.y,radius:128});this.recoverBoss(z);}return;
    }
    if(z.bossPhase==='arrival'||z.bossPhase==='recover'){
    if(z.bossTimer<=0){z.bossPhase='hunt';z.bossTimer=2.2;}return;
   }
   if(z.bossPhase==='windup'){
    if(z.bossTimer<=0){z.bossPhase='charge';this.emit('boss_charge',{id:z.id,x:z.x,y:z.y});}return;
   }
   if(z.bossPhase==='charge'){
    const c=z.bossCharge;let travel=Math.min(c.remaining,BREAKER_RULES.chargeSpeed*dt);
    while(travel>0){const step=Math.min(8,travel),next={x:z.x+c.dx*step,y:z.y+c.dy*step};
     if(!this.validPosition(next,z.r)||!this.clearRoute(z,next,z.r)){this.recoverBoss(z);return;}
     const contact=this.combatActors().find(a=>(C.distance(z,a)<z.r+a.r||Number.isFinite(C.rayCircle(z,{x:c.dx,y:c.dy},a,z.r+a.r,step)))&&this.clearRoute(z,a));
     z.x=next.x;z.y=next.y;z.step+=step*.07;c.remaining-=step;travel-=step;
     if(contact){this.damageActor(contact,34,'Breaker charge');this.recoverBoss(z);return;}
    }
    if(c.remaining<=.001)this.recoverBoss(z);return;
   }
   const distance=C.distance(z,actor);
   if(z.bossTimer<=0&&distance<155&&this.clearRoute(z,actor)){z.bossPhase='slam';z.bossTimer=1.0;z.bossCharge=null;z.aim=C.angleTo(z,actor);this.emit('boss_slam_warning',{id:z.id,x:z.x,y:z.y,radius:128});return;}
    if(z.bossTimer<=0&&distance<490&&this.clearRoute(z,actor,z.r)&&this.prepareBossCharge(z))return;
   const q=this.waypoint(z,actor);
   if(q&&distance>z.r+actor.r+8){const a=C.angleTo(z,q),step=Math.min(BREAKER_RULES.speed*dt,C.distance(z,q));z.aim=C.turn(z.aim,a,dt*5);z.x+=Math.cos(a)*step;z.y+=Math.sin(a)*step;z.step+=step*.07;this.resolveWalls(z);}
  }
  useNuke(){this.bossBlast=true;try{return super.useNuke();}finally{this.bossBlast=false;}}
  collectArcade(q){if(q?.type!=='bomb')return super.collectArcade(q);this.bossBlast=true;try{return super.collectArcade(q);}finally{this.bossBlast=false;}}
  damageZombie(z,amount){
   const alive=!z.dead;
   if(z.boss&&alive){
    if(amount===z.hp+1){
     if(!this.bossBlast&&(this.arcade?.vehicle==='tank'||this.panic?.boostLeft>0)){if(this.time<z.bossImpactAt)return;z.bossImpactAt=this.time+.75;amount=600;}
     else amount=z.maxHp*.25;
    }else amount*=z.bossPhase==='recover'?2.1:.70;
   }
   const out=super.damageZombie(z,amount);
   if(z.boss&&alive&&z.dead&&this.bossEncounter){this.bossEncounter.defeated=true;this.emit('boss_defeated',{id:z.id,x:z.x,y:z.y});}
   return out;
  }
  startBossTest(){this.start('range');this.beginWave(BREAKER_RULES.wave);this.queue=[];this.warnings=[];this.zombies=[];this.beginBossEncounter();}
  export(){const z=this.zombies.find(z=>z.boss);return{...super.export(),bossEncounter:this.bossEncounter?{...this.bossEncounter,phase:z?.bossPhase,hp:z?.hp,maxHp:z?.maxHp}:null};}
 }
 return{...C,Game:BreakerGame,BREAKER_RULES};
}
if(typeof module==='object'&&module.exports)module.exports=install(module.exports);else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

// Portal routes choose scenery independently of combat round progression.
(function(root){'use strict';
 function install(C){
  const PORTAL_GATES=Object.freeze([
   {id:'north',label:'NORTH',arrow:'↑',x:720,y:145,color:'#73dcf0'},
   {id:'east',label:'EAST',arrow:'→',x:1290,y:520,color:'#efbf72'},
   {id:'south',label:'SOUTH',arrow:'↓',x:720,y:895,color:'#9bd59b'},
   {id:'west',label:'WEST',arrow:'←',x:150,y:520,color:'#c7a5ed'}
  ].map(Object.freeze));
  class PortalRouteGame extends C.Game{
   start(mode='campaign',loadout='carbine',routeSeed){
    this.routeSeed=(Number.isInteger(routeSeed)?routeSeed:Math.floor(Math.random()*4294967296))>>>0;
    this.routeRng=new C.Random(this.routeSeed);this.visitedArenas=[];this.exits=[];this.pendingArena=null;this.deferRouteAdvance=false;
    return super.start(mode,loadout);
   }
   applyArena(wave){
    const index=this.pendingArena??wave;this.pendingArena=null;
    const out=super.applyArena(index);
    if(this.mode==='campaign'&&this.visitedArenas&&!this.visitedArenas.includes(index))this.visitedArenas.push(index);
    return out;
   }
   beginWave(wave){
    if(this.deferRouteAdvance){this.openExits();return;}
    this.exits=[];return super.beginWave(wave);
   }
   advance(upgrade){
    if(this.mode!=='campaign')return super.advance(upgrade);
    this.deferRouteAdvance=true;
    try{return super.advance(upgrade);}finally{this.deferRouteAdvance=false;}
   }
   openExits(){
    const shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(this.routeRng.next()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
    const available=this.wave===6?[7]:[1,2,3,4,5,6].filter(i=>!this.visitedArenas.includes(i));
    const destinations=shuffle(available).slice(0,4),gates=shuffle([...PORTAL_GATES]);
    // Pump's east exit belongs on the open ground, clear of the raised gallery and its bench.
    if(this.arena?.id==='pump'){
     const east=gates.findIndex(g=>g.id==='east');
     gates[east]={...gates[east],x:1100,y:590};
    }
    this.exits=destinations.map((index,i)=>({...gates[i],arenaIndex:index,name:C.ARENAS[index].name,arenaId:C.ARENAS[index].id,radius:30,armed:C.distance(this.player,gates[i])>54}));
    this.exits.sort((a,b)=>PORTAL_GATES.findIndex(g=>g.id===a.id)-PORTAL_GATES.findIndex(g=>g.id===b.id));
    this.exitOpenedAt=this.time;this.status='exiting';this.cancelInteraction();this.player.vx=this.player.vy=0;this.player.roll=0;this.player.focus=false;
    this.emit('routes_open',{seed:this.routeSeed,exits:this.exits.map(e=>({id:e.id,arena:e.arenaId}))});
   }
   enterExit(id){
    if(this.status!=='exiting'||this.time-this.exitOpenedAt<.6)return false;
    const exit=this.exits.find(e=>e.id===id);
    if(!exit?.armed||C.distance(this.player,exit)>exit.radius||!this.clearRoute(this.player,exit,this.player.r))return false;
    this.pendingArena=exit.arenaIndex;
    this.emit('route_enter',{direction:exit.id,arena:exit.arenaId,name:exit.name,wave:this.wave+2});
    this.beginWave(this.wave+1);return true;
   }
   interactionOffer(){
    if(this.status!=='exiting')return super.interactionOffer();
    const exit=this.exits.find(e=>C.distance(this.player,e)<120&&this.clearRoute(this.player,e));
    return exit?{kind:'route',title:'PORTAL',detail:exit.armed?'STEP ONTO THE LIGHT':'STEP BACK, THEN ENTER',enabled:true}:null;
   }
   tick(dt,input={}){
    if(this.status!=='exiting')return super.tick(dt,input);
    dt=C.clamp(dt,0,1/60);this.time+=dt;
    const p=this.player,move=input.move||C.v(0,0),m=Math.hypot(move.x,move.y),a=1-Math.exp(-dt*15);
    p.wanted=Number.isFinite(input.aim)?input.aim:p.wanted;p.aim=C.turn(p.aim,p.wanted,dt*10);p.body=C.turn(p.body,p.aim,dt*6);p.focus=false;
    p.vx=C.mix(p.vx,move.x/Math.max(1,m)*p.speed,a);p.vy=C.mix(p.vy,move.y/Math.max(1,m)*p.speed,a);
    p.x+=p.vx*dt;p.y+=p.vy*dt;this.resolveWalls(p);p.step+=Math.hypot(p.vx,p.vy)*dt*.075;p.stamina=C.clamp(p.stamina+25*dt,0,100);
    for(const exit of this.exits){if(C.distance(p,exit)>54)exit.armed=true;if(this.enterExit(exit.id))break;}
   }
   export(){return{...super.export(),routeSeed:this.routeSeed,visitedArenas:[...(this.visitedArenas||[])],exits:(this.exits||[]).map(e=>({...e}))};}
  }
  return{...C,Game:PortalRouteGame,PORTAL_GATES};
 }
 if(typeof module==='object'&&module.exports)module.exports=install(module.exports);else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);

// Offline squad: independent decisions, shared actor targeting, no player swapping.
(function(root){'use strict';
 function install(C){
  const SQUAD_RULES=Object.freeze({count:1,health:120,range:560,damage:12,interval:.11,think:.20,revive:2});
  class SquadGame extends C.Game{
   start(...args){
    this.squad=[];this.squadStats={shots:0,hits:0,connected:0,kills:0,dodges:0,heals:0,revives:0,treasure:0,powers:0,nukes:0,boosts:0};
    const out=super.start(...args);this.player.actorId='player';
    if(this.botEnabled!==false)this.addSquadBot();return out;
   }
   addSquadBot(){
    if(this.squad.length>=SQUAD_RULES.count)return;
    const slot=this.squad.length,b={actorId:'rook-'+slot,name:'ROOK',slot,r:13,x:this.player.x,y:this.player.y,vx:0,vy:0,aim:this.player.aim,body:this.player.aim,step:0,recoil:0,flash:0,hp:120,maxHp:120,hurtGrace:0,down:false,revive:0,medkits:2,healClock:0,healUntil:0,dodge:0,dodgeCooldown:0,cooldown:.4,burst:0,think:0,targetId:null,navPath:null,navUntil:0,state:'REGROUPING',formationAngle:this.player.aim,stuck:0};
    Object.assign(b,{randomSeed:15731+slot*7919,objective:null,fireCooldown:0,arcade:{weapon:null,weaponCharge:0,vehicle:null,vehicleLeft:0,shots:0},nukes:0,boosts:0,drone:null,droneStats:{shots:0,hits:0,kills:0},pickupLock:0,powerFiredAt:-100,burstLeft:5});
    this.squad.push(b);this.placeSquadBot(b);return b;
   }
   setBotEnabled(enabled){
    this.botEnabled=!!enabled;
    if(!enabled)this.squad=[];
    else if(this.player&&['playing','loot','exiting'].includes(this.status)&&!this.squad?.length)this.addSquadBot();
    return this.botEnabled;
   }
   placeSquadBot(b){
    const p=this.player;let spot=null;
    search:for(const radius of [72,105,42])for(let i=0;i<12;i++){
     const a=p.aim+Math.PI*.72+i*Math.PI/6,q=C.add(p,C.polar(a,radius));
     if(this.validPosition(q,b.r)&&this.clearRoute(p,q,b.r)&&this.squad.every(other=>other===b||C.distance(q,other)>35)){spot=q;break search;}
    }
    Object.assign(b,{x:spot?.x??p.x,y:spot?.y??p.y,vx:0,vy:0,navPath:null,navUntil:0,targetId:null,think:0,dodge:0,stuck:0,goal:null,objective:null});
   }
   applyArena(wave){
    const out=super.applyArena(wave);
    for(const b of this.squad||[]){this.clearSquadPower(b);if(b.drone)b.drone.stowed=true;if(b.down){b.down=false;b.hp=60;}else b.hp=Math.min(b.maxHp,b.hp+25);b.revive=0;b.hurtGrace=1;this.placeSquadBot(b);}
    return out;
   }
   combatActors(){return[this.player,...(this.squad||[]).filter(b=>!b.down&&b.hp>0)];}
   actorById(id){return id==='player'?this.player:(this.squad||[]).find(b=>b.actorId===id&&!b.down)||null;}
   zombieTarget(z){
    if(!this.squad?.some(b=>!b.down))return this.player;
    const old=this.actorById(z.squadTarget||'player');
    if(old&&this.time<(z.squadTargetUntil||0))return old;
    let target=this.player,best=Infinity;
    for(const a of this.combatActors()){
     const score=C.distance(z,a)*(this.clearRoute(z,a)?1:1.5)*(a===old?.82:1)*(a===this.player?1:1.10);
     if(score<best){best=score;target=a;}
    }
    z.squadTarget=target.actorId||'player';z.squadTargetUntil=this.time+.45;return target;
   }
   damageActor(actor,amount,from){
    if(actor===this.player)return this.damagePlayer(amount,from);
    if(!actor||actor.down||this.status!=='playing'||this.godMode||this.mode==='range'||actor.hurtGrace>0||actor.dodge>0||actor.arcade?.vehicle)return false;
    actor.hp=Math.max(0,actor.hp-Math.ceil(amount*(1+this.wave*.08)));actor.hurtGrace=.55;actor.flash=.22;actor.healClock=0;actor.think=0;
    if(!actor.hp){this.clearSquadPower(actor);actor.drone=null;Object.assign(actor,{down:true,downAt:this.time,state:'DOWN',vx:0,vy:0,revive:0,objective:null});this.emit('squad_down',{actorId:actor.actorId,name:actor.name,x:actor.x,y:actor.y});}
    return true;
   }
   explode(barrel){
    const spent=barrel.spent,out=super.explode(barrel);
    if(!spent&&barrel.spent)for(const b of this.squad||[])if(C.distance(b,barrel)<90&&this.clearRoute(b,barrel))this.damageActor(b,25,'fuel can');
    return out;
   }
   squadRandom(b){b.randomSeed=(Math.imul(b.randomSeed,1664525)+1013904223)>>>0;return b.randomSeed/4294967296;}
   squadRange(b){const k=b.arcade.vehicle||b.arcade.weapon;return k==='tank'?420:k==='heli'?860:k==='ray'?780:k==='deathmachine'?720:SQUAD_RULES.range;}
   squadPosition(b,q){return b.arcade.vehicle==='heli'?q.x>60&&q.x<this.width-60&&q.y>60&&q.y<this.height-60:this.validPosition(q,b.r);}
   squadRoute(b,q){return b.arcade.vehicle==='heli'||this.clearRoute(b,q,b.r);}
   resolveWalls(actor){
    if(actor!==this.player&&actor.arcade?.vehicle==='heli'){actor.x=C.clamp(actor.x,60,this.width-60);actor.y=C.clamp(actor.y,60,this.height-60);return;}
    return super.resolveWalls(actor);
   }
   squadLanding(b){
    if(this.validPosition(b,b.r))return{x:b.x,y:b.y};
    for(let r=24;r<360;r+=24)for(let i=0;i<20;i++){const q=C.add(b,C.polar(i*Math.PI/10,r));if(this.validPosition(q,b.r))return q;}
    return{x:this.player.x,y:this.player.y};
   }
   clearSquadPower(b){
    if(!b.arcade)return;
    const old=b.arcade.vehicle||b.arcade.weapon;if(old==='heli'){const q=this.squadLanding(b);b.x=q.x;b.y=q.y;}
    Object.assign(b.arcade,{weapon:null,weaponCharge:0,voidVariant:null,vehicle:null,vehicleLeft:0,shots:0});b.objective=null;b.think=0;
    if(old){b.hurtGrace=Math.max(b.hurtGrace,1);this.emit('squad_power_end',{actorId:b.actorId,name:b.name,power:old,x:b.x,y:b.y});}
   }
   squadCanCollect(b,q){
    if(!q||q.left<=0||q.armory||b.pickupLock>0)return false;
    const p=this.player,d=C.distance(p,q),toward=(p.vx||0)*(q.x-p.x)+(p.vy||0)*(q.y-p.y);
    if(d<85||(d<210&&toward>35*d))return false;
    if(['ray','deathmachine','tank','heli'].includes(q.type))return !b.arcade.weapon&&!b.arcade.vehicle;
    if(q.type==='drone')return !b.drone;
    if(q.type==='nuke')return b.nukes<2;
    if(q.type==='boost')return b.boosts<3;
    if(q.type==='medkit')return b.medkits<3;
    return ['coin','gem','bomb'].includes(q.type);
   }
   squadPickup(b){
    let best=null,score=-Infinity;
    for(const q of [...(this.arcadePickups||[]),...(this.lootPickups||[])]){
     if(!this.squadCanCollect(b,q)||C.distance(b,q)>900||!this.squadPosition(b,q)||q.left<C.distance(b,q)/200+.3)continue;
     if(this.squad.some(other=>other!==b&&!other.down&&other.objective?.pickup===q))continue;
     const value=['tank','heli'].includes(q.type)?8:['ray','deathmachine','drone','nuke','bomb'].includes(q.type)?7:q.type==='boost'?5:q.type==='medkit'?(b.hp<60?8:4):q.type==='gem'?4:2;
     const s=value-C.distance(b,q)/190-this.squadDanger(q,b)*.8+(b.objective?.pickup===q?2:0);
     if(s>score){score=s;best=q;}
    }
    return score>-.5?best:null;
   }
   squadNuke(b){
    const targets=this.zombies.filter(z=>!z.dead),before=this.stats.kills,old=this.bossBlast;this.bossBlast=true;
    try{for(const z of targets)this.damageZombie(z,z.hp+1);}finally{this.bossBlast=old;}
    b.hurtGrace=Math.max(b.hurtGrace,C.PANIC_RULES.nukeInvuln);this.squadStats.nukes++;this.squadStats.kills+=this.stats.kills-before;
    this.emit('panic_nuke',{actorId:b.actorId,name:b.name,x:b.x,y:b.y,kills:this.stats.kills-before,nukes:b.nukes});
   }
   collectSquadPickup(b,q){
    if(!this.squadCanCollect(b,q)||C.distance(b,q)>34||!this.clearRoute(b,q))return false;
    if(q.type==='coin'||q.type==='gem'){this.collectLoot(q);this.squadStats.treasure++;return true;}
    const a=b.arcade;
    if(q.type==='tank'||q.type==='heli'){a.vehicle=q.type;a.vehicleLeft=C.ARCADE_VEHICLE_TIME;}
    else if(q.type==='ray'||q.type==='deathmachine'){a.weapon=q.type;a.voidVariant=q.type==='ray'?C.Voidcaster.assign(q).id:null;a.weaponCharge=C.ARCADE_WEAPON_CHARGE;}
    else if(q.type==='bomb')this.squadNuke(b);
    else if(q.type==='nuke')b.nukes++;
    else if(q.type==='boost')b.boosts++;
    else if(q.type==='medkit')b.medkits++;
    else if(q.type==='drone')b.drone={x:b.x,y:b.y,r:18,aim:b.aim,left:C.COMPANION_RULES.duration,cooldown:0,flash:0,stowed:true};
    q.left=0;a.shots=0;b.cooldown=0;b.fireCooldown=0;b.pickupLock=.65;b.objective=null;b.think=0;this.squadStats.powers++;
    this.emit('squad_power',{actorId:b.actorId,name:b.name,power:q.type,label:q.type==='ray'?C.Voidcaster.style(a).name:C.ARCADE_DROP_LABELS[q.type]||q.type.toUpperCase(),voidVariant:a.voidVariant,x:b.x,y:b.y});return true;
   }
   squadDanger(q,b){
    let risk=0;
    for(const z of this.zombies){
     if(z.dead)continue;
     const lead=z.boss||z.attack?0:Math.min(45,z.speed*.25),pred=C.add(z,C.polar(z.aim,lead)),d=C.distance(q,pred);
     if(d<180){risk+=Math.pow(1-d/180,2)*(z.hunter||z.kind==='runner'?5:3);if(d<z.r+b.r+26)risk+=8;}
     const c=z.bossCharge;
     if(c&&['windup','charge'].includes(z.bossPhase)){
      const start=z.bossPhase==='charge'?z:c,end=C.add(start,{x:c.dx*(c.remaining??c.length),y:c.dy*(c.remaining??c.length)});
      if(C.distance(q,C.closest(q,start,end))<z.r+b.r+22)risk+=22;
     }
    }
    const zone=this.antiCamp?.zone;if(zone&&C.distance(q,zone)<zone.radius+b.r+22)risk+=18;
    for(const w of [...(this.warnings||[]),...(this.antiCamp?.breachWarnings||[])])if(C.distance(q,w)<80)risk+=3;
    return risk;
   }
   squadTarget(b){
    let chosen=null,best=-Infinity;
    for(const z of this.zombies){
     if(z.dead||C.distance(b,z)>1050)continue;
     const me=C.distance(b,z),friend=C.distance(this.player,z),visible=this.combatSight(b,z);
     const score=(friend<120?6:0)+(me<150?5:0)+(z.hunter?3:z.kind==='runner'?2:0)+(z.boss&&z.bossPhase==='recover'?4:0)+(z.hp<35?1:0)+(z.id===b.targetId?2:0)-me/220-(visible||b.arcade.vehicle==='heli'?0:4);
     if(score>best){best=score;chosen=z;}
    }
    return chosen;
   }
   squadFormation(b){
    const p=this.player;if(Math.hypot(p.vx,p.vy)>30)b.formationAngle=Math.atan2(p.vy,p.vx);
    const a=b.formationAngle,side=b.slot%2?-1:1;
    for(const [back,lateral] of [[76,side*85],[90,-side*80],[110,0],[40,side*55],[0,0]]){
     const q={x:p.x-Math.cos(a)*back-Math.sin(a)*lateral,y:p.y-Math.sin(a)*back+Math.cos(a)*lateral};
     if(this.validPosition(q,b.r)&&this.clearRoute(p,q,b.r))return q;
    }
    return {x:p.x,y:p.y};
   }
   squadMission(b,target,combat){
    const p=this.player,o=b.objective;
    if(this.status==='exiting'||C.distance(b,p)>960)return{...this.squadFormation(b),state:'REGROUPING'};
    if(b.arcade.vehicle==='heli'&&b.arcade.vehicleLeft<1.4)return{...this.squadLanding(b),state:'LANDING'};
    if(combat&&b.medkits>0&&this.time>=b.healUntil&&p.hp<p.maxHp*.55&&b.hp>35&&C.distance(b,p)<400)return{x:p.x,y:p.y,state:'HELPING YOU'};
    const pickup=this.squadPickup(b);
    if(pickup){b.objective={kind:'pickup',pickup,x:pickup.x,y:pickup.y};return{...pickup,state:['coin','gem'].includes(pickup.type)?'COLLECTING':'GETTING '+(C.ARCADE_DROP_LABELS[pickup.type]||pickup.type.toUpperCase())};}
    if(target){
     if(o?.kind==='fight'&&o.targetId===target.id&&this.time<o.until&&C.distance(o.enemy,target)<110&&this.squadPosition(b,o))return o;
     const a=C.angleTo(target,b),radius=b.arcade.vehicle==='tank'?330:b.arcade.vehicle==='heli'?230:215+this.squadRandom(b)*65;
     let best=null,score=-Infinity;
     const side=this.squadRandom(b)<.5?-1:1;
     for(const offset of [side*.60,-side*.55,side*1.1,-side*1.1,0,Math.PI]){
      const q=C.add(target,C.polar(a+offset,radius));if(!this.squadPosition(b,q))continue;
      const s=(this.clearRoute(q,target)||b.arcade.vehicle==='heli'?4:0)-this.squadDanger(q,b)*1.2-C.distance(b,q)/240-Math.max(0,C.distance(q,p)-750)/160;
      if(s>score){score=s;best=q;}
     }
     b.objective={...(best||target),kind:'fight',targetId:target.id,enemy:{x:target.x,y:target.y},until:this.time+2.8+this.squadRandom(b)*2.2,state:'HUNTING'};
     return b.objective;
    }
    if(o?.kind==='patrol'&&this.time<o.until&&C.distance(b,o)>30)return o;
    const start=this.squadRandom(b)*Math.PI*2;
    for(let i=0;i<12;i++){
     const q=C.add(b,C.polar(start+i*Math.PI/6,240+this.squadRandom(b)*160));
     if(this.squadPosition(b,q)&&this.squadDanger(q,b)<1&&C.distance(q,p)<850){b.objective={...q,kind:'patrol',until:this.time+5+this.squadRandom(b)*3,state:'SCOUTING'};return b.objective;}
    }
    return{x:b.x,y:b.y,state:'WATCHING'};
   }
   thinkSquadBot(b,combat){
    const p=this.player,target=combat?this.squadTarget(b):null;b.targetId=target?.id??null;
    const goal=this.squadMission(b,target,combat),state=goal.state;
    // A path waypoint handles buildings; local candidates choose the safest reachable step.
    const waypoint=b.arcade.vehicle==='heli'?goal:this.waypoint(b,goal),candidates=[{x:b.x,y:b.y}];
    if(waypoint){const d=C.distance(b,waypoint);candidates.push(C.add(b,C.polar(C.angleTo(b,waypoint),Math.min(96,d))));}
    for(let i=0;i<12;i++)candidates.push(C.add(b,C.polar(i*Math.PI/6,96)));
    const hereRisk=this.squadDanger(b,b);let best=-Infinity,chosen=candidates[0],chosenRisk=hereRisk;
    for(const q of candidates){
     if(!this.squadPosition(b,q)||!this.squadRoute(b,q))continue;
     const risk=this.squadDanger(q,b),separation=C.distance(q,p),travel=C.distance(q,b);
     const armor=!!b.arcade.vehicle;
     let score=-risk*(armor?.18:2.4)-(waypoint?C.distance(q,waypoint)/75:travel/100)-Math.max(0,separation-850)/200;
     if(travel>10&&Math.hypot(b.vx,b.vy)>30)score+=((q.x-b.x)*b.vx+(q.y-b.y)*b.vy)/(travel*Math.hypot(b.vx,b.vy))*.18;
     if(separation<44)score-=(44-separation)/9;
     if(target){
      if(this.clearRoute(q,target))score+=1.1;score-=Math.max(0,(armor?45:145)-C.distance(q,target))/60;
      const dir=C.polar(C.angleTo(q,target),1),length=C.distance(q,target);
      if(this.combatActors().some(friend=>friend!==b&&C.rayCircle(q,dir,friend,friend.r+8,length)<length))score-=3.5;
      if((this.barrels||[]).some(can=>!can.spent&&C.rayCircle(q,dir,can,18,length)<length&&this.combatActors().some(friend=>C.distance(friend,can)<150)))score-=3.5;
     }
     for(const other of this.squad)if(other!==b&&C.distance(q,other)<45)score-=3;
     if(score>best){best=score;chosen=q;chosenRisk=risk;}
    }
    b.goal=chosen;b.state=hereRisk>3&&chosenRisk<hereRisk?'EVADING':state;
    if(combat&&!b.arcade.vehicle&&hereRisk>8&&chosenRisk<hereRisk-3&&C.distance(b,chosen)>35&&b.dodgeCooldown<=0){
     const boost=b.boosts>0;b.dodge=boost?C.PANIC_RULES.boostDuration:.24;b.dodgeAngle=C.angleTo(b,chosen);b.dodgeCooldown=4.2+this.squadRandom(b)*1.5;this.squadStats.dodges++;b.state=boost?'BOOSTING':'DODGING';
     if(boost){b.boosts--;b.boosting=true;b.hurtGrace=C.PANIC_RULES.boostInvuln;this.squadStats.boosts++;this.emit('panic_boost',{actorId:b.actorId,name:b.name,x:b.x,y:b.y,heading:b.dodgeAngle});}
     else this.emit('squad_dodge',{actorId:b.actorId,x:b.x,y:b.y});
    }
   }
   fireSquadBot(b,target){
    if(!target||target.dead||b.cooldown>0||b.fireCooldown>0||b.dodge>0||this.status!=='playing')return;
    const distance=C.distance(b,target),wanted=C.angleTo(b,target);
    if(distance>this.squadRange(b)||Math.abs(C.wrap(wanted-b.aim))>.12||(!this.combatSight(b,target)&&b.arcade.vehicle!=='heli'))return;
    const power=b.arcade.vehicle||b.arcade.weapon;
    if(power){
     const direction=C.polar(b.aim,1);if(power!=='heli'&&this.combatActors().some(friend=>friend!==b&&C.rayCircle(b,direction,friend,friend.r+8,distance)<distance))return;
     const kills=this.stats.kills,hits=this.squadStats.connected;
     if(power==='ray')this.rayShot(b,b.arcade,this.squadStats);
     else if(power==='tank')this.tankShot(b,b.arcade,this.squadStats,target);
     else if(power==='heli')this.heliShot(b,b.arcade,this.squadStats);
     else this.specialHitscan('deathmachine',58,.045,720,2,false,b,b.arcade,this.squadStats);
     b.powerFiredAt=this.time;this.squadStats.kills+=this.stats.kills-kills;this.squadStats.hits+=this.squadStats.connected-hits;return;
    }
    const dir=C.polar(b.aim,1),offset=Math.min(27,Math.max(0,this.wallDistance(b,dir,27)-1)),origin={...C.add(b,C.polar(b.aim,offset)),groundHeight:b.groundHeight||0};
    const wall=this.wallDistance(origin,dir,SQUAD_RULES.range);let end=wall,hit=null,barrel=null;
    for(const z of this.zombies)if(!z.dead){const t=C.rayCircle(origin,dir,z,z.r+1,wall);if(t<end){hit=z;barrel=null;end=t;}}
    for(const can of this.barrels||[])if(!can.spent){const t=C.rayCircle(origin,dir,can,16,wall);if(t<end){hit=null;barrel=can;end=t;}}
    // Teammates and nearby explosive barrels block firing, even with friendly fire disabled.
    for(const friend of this.combatActors())if(friend!==b&&C.rayCircle(origin,dir,friend,friend.r+6,end)<end){b.think=Math.min(b.think,.1);b.state='REPOSITIONING';return;}
    if(barrel&&this.combatActors().some(friend=>C.distance(friend,barrel)<150)){b.think=Math.min(b.think,.1);b.state='REPOSITIONING';return;}
    if(!hit&&!barrel)return;
    b.burst++;b.burstLeft--;b.cooldown=b.burstLeft<=0?.17+this.squadRandom(b)*.17:SQUAD_RULES.interval;if(b.burstLeft<=0)b.burstLeft=4+Math.floor(this.squadRandom(b)*5);b.recoil=.09;this.squadStats.shots++;
    const kills=this.stats.kills,damage=SQUAD_RULES.damage*this.mods.damage;
    if(hit){this.squadStats.hits++;this.damageZombie(hit,damage);}else{barrel.hp-=damage;if(barrel.hp<=0)this.explode(barrel);}
    this.squadStats.kills+=this.stats.kills-kills;
    this.emit('squad_shot',{actorId:b.actorId,actorX:b.x,actorY:b.y,aim:b.aim,x:origin.x,y:origin.y,height:1.18,path:{a:{x:origin.x,y:origin.y},b:C.add(origin,C.polar(b.aim,end)),kind:hit?'zombie':'barrel'}});
   }
   updateSquadBot(b,dt,combat){
    for(const key of ['hurtGrace','cooldown','fireCooldown','recoil','flash','dodgeCooldown','pickupLock'])b[key]=Math.max(0,b[key]-dt);
    if(b.down){
     const near=C.distance(b,this.player)<66&&this.clearRoute(b,this.player),safe=!this.zombies.some(z=>!z.dead&&C.distance(z,b)<85);
     b.revive=near&&safe?b.revive+dt:0;
     if(this.status==='loot'||this.status==='exiting'||b.revive>=SQUAD_RULES.revive){b.down=false;b.hp=60;b.hurtGrace=2;b.think=0;b.revive=0;this.squadStats.revives++;this.emit('squad_revived',{actorId:b.actorId,name:b.name,x:b.x,y:b.y});}
     return;
    }
    if(combat){
     const a=b.arcade;
     if(a.weapon){a.weaponCharge=Math.max(0,a.weaponCharge-dt*(this.time-b.powerFiredAt<.15?1:.2));if(!a.weaponCharge)this.clearSquadPower(b);}
     if(a.vehicle){a.vehicleLeft=Math.max(0,a.vehicleLeft-dt);if(!a.vehicleLeft)this.clearSquadPower(b);}
     if(b.nukes>0&&!a.vehicle){
      const alive=this.zombies.filter(z=>!z.dead),close=alive.filter(z=>C.distance(z,b)<210).length,help=alive.filter(z=>C.distance(z,this.player)<180).length;
      if((b.hp<45&&close>=4)||(this.player.hp<45&&help>=5)||(alive.length>=18&&close>=7)){b.nukes--;this.squadNuke(b);}
     }
    }
    b.think-=dt;if(b.think<=0){b.think=.18+this.squadRandom(b)*.07;this.thinkSquadBot(b,combat);}
    const target=combat?this.zombies.find(z=>z.id===b.targetId&&!z.dead):null;
    const aim=target?C.angleTo(b,target)+Math.sin(this.time*6+b.slot)*.022:C.distance(b,b.goal||b)>10?C.angleTo(b,b.goal):b.aim;
    b.aim=C.turn(b.aim,aim,dt*7);b.body=C.turn(b.body,b.aim,dt*5);
    const p=this.player,goal=b.goal||b,distance=C.distance(b,goal),old={x:b.x,y:b.y};
    let vx=0,vy=0;
    if(b.dodge>0){b.dodge=Math.max(0,b.dodge-dt);vx=Math.cos(b.dodgeAngle)*(b.boosting?C.PANIC_RULES.boostSpeed:470);vy=Math.sin(b.dodgeAngle)*(b.boosting?C.PANIC_RULES.boostSpeed:470);}
    else{b.boosting=false;if(distance>7){const a=C.angleTo(b,goal),pace=b.arcade.vehicle==='tank'?160:b.arcade.vehicle==='heli'?235:C.distance(b,p)>800?255:b.objective?.kind==='patrol'?175:213,speed=Math.min(pace,distance*5);vx=Math.cos(a)*speed;vy=Math.sin(a)*speed;}}
    const smooth=1-Math.exp(-dt*(b.dodge>0?18:10));b.vx=C.mix(b.vx,vx,smooth);b.vy=C.mix(b.vy,vy,smooth);
    const next={x:b.x+b.vx*dt,y:b.y+b.vy*dt};
    if(this.squadPosition(b,next)&&this.squadRoute(b,next)){b.x=next.x;b.y=next.y;}else{b.vx=b.vy=0;b.think=0;b.navPath=null;}
    this.resolveWalls(b);b.step+=C.distance(b,old)*.075;
    const moved=C.distance(b,old);b.stuck=distance>24&&moved<dt*12?b.stuck+dt:Math.max(0,b.stuck-dt*2);
    if(b.stuck>1.2){b.navPath=null;b.navUntil=0;b.think=0;b.objective=null;}
    // Only recover an off-screen stranded actor; normal navigation never teleports.
    if(b.stuck>4&&C.distance(b,p)>650)this.placeSquadBot(b);
    if(combat){
     const zone=this.antiCamp?.zone;if(zone?.phase==='active'&&C.distance(b,zone)<zone.radius)this.damageActor(b,12,'shock strike');if(b.down)return;
     const patient=p.hp<p.maxHp*.55&&C.distance(b,p)<58&&this.clearRoute(b,p)?p:b.hp<b.maxHp*.40?b:null;
     const safe=!this.zombies.some(z=>!z.dead&&C.distance(z,b)<125)&&this.squadDanger(b,b)<1;
     if(patient&&safe&&b.medkits>0&&this.time>=b.healUntil){
      b.healClock+=dt;b.state=patient===p?'PATCHING YOU':'PATCHING UP';
      if(b.healClock>=1){patient.hp=Math.min(patient.maxHp,patient.hp+35);b.medkits--;b.healUntil=this.time+30;b.healClock=0;this.squadStats.heals++;this.emit('squad_heal',{actorId:b.actorId,name:b.name,x:patient.x,y:patient.y,patient:patient===p?'player':b.actorId});}
     }else{b.healClock=0;this.fireSquadBot(b,target);}
     if(b.arcade.vehicle==='tank'||b.boosting)for(const z of this.zombies)if(!z.dead&&C.distance(b,z)<b.r+z.r+(b.arcade.vehicle?28:12)&&this.clearRoute(b,z)){
      if(z.boss){if(this.time<(z.squadImpactAt||0))continue;z.squadImpactAt=this.time+.75;this.damageZombie(z,600);}else this.damageZombie(z,z.hp+1);
     }
    }
    if(combat||this.status==='loot')for(const q of [...(this.arcadePickups||[]),...(this.lootPickups||[])])if(this.collectSquadPickup(b,q))break;
    if(b.drone)this.updateCompanion(dt,{fire:!!target&&this.clearRoute(b,target)},combat,b.drone,b,b.droneStats);
   }
   tick(dt,input={}){
    const out=super.tick(dt,input),step=C.clamp(dt,0,1/60);
    if(step>0&&['playing','loot','exiting'].includes(this.status))for(const b of this.squad||[])this.updateSquadBot(b,step,this.status==='playing');
    return out;
   }
   export(){return{...super.export(),botEnabled:this.botEnabled!==false,squad:(this.squad||[]).map(b=>({...b})),squadStats:{...this.squadStats}};}
  }
  return{...C,Game:SquadGame,SQUAD_RULES};
 }
 if(typeof module==='object'&&module.exports)module.exports=install(module.exports);else root.DeadwatchCore=install(root.DeadwatchCore);
})(typeof globalThis!=='undefined'?globalThis:this);


/* Pump Station service gallery: shared surface data for simulation and rendering. */
(function(root){'use strict';
 const C=root.DeadwatchCore,W=Object.freeze({x0:1160,x1:1310,y0:140,y1:900,up:340,down:700,height:3.35});
 function arenaSurfaceHeight(arena,x,y){
  if((arena?.id||arena)!=='pump'||x<W.x0||x>W.x1||y<W.y0||y>W.y1)return 0;
  return W.height*Math.max(0,Math.min(1,(y-W.y0)/(W.up-W.y0),(W.y1-y)/(W.y1-W.down)));
 }
 class WalkwayGame extends C.Game{
  surfaceHeight(x,y){return arenaSurfaceHeight(this.arena,x,y);}
  actorHeight(a){
   const flying=(a===this.player?this.arcade:a.arcade)?.vehicle==='heli';
   if(this.arena?.id!=='pump'||!flying)return this.surfaceHeight(a.x,a.y);
   const x=C.clamp(a.x,W.x0,W.x1),y=C.clamp(a.y,W.y0,W.y1);
   return this.surfaceHeight(x,y)*C.clamp(1-Math.hypot(a.x-x,a.y-y)/140,0,1);
  }
  applyArena(wave){
   this.pumpOverload=null;
   const out=super.applyArena(wave);
   this.stations=this.stations.filter(s=>s.id!=='pump-overload');
   if(this.arena?.id==='pump'){
    this.pumpOverload={phase:'ready',used:false,left:0,damageClock:0,kills:0};
    this.stations.push({id:'pump-overload',kind:'pump-overload',name:'Pump overload',x:1276,y:520,powered:true});
    this.obstacles.push(...[W.x0,W.x1].map(x=>({x:x-4,y:W.y0,w:8,h:W.y1-W.y0,walkwayRail:true})));
    // Keep the weapon bench accessible from the original ground-floor cross.
    const bench=this.stations?.find(s=>s.id==='bench');if(bench){bench.x=1085;bench.y=530;}
    this.navGraphs=new Map();this.navObstacles=null;
   }
   this.syncSurfaceActors();return out;
  }
  syncSurfaceActors(){
   for(const a of [this.player,...(this.squad||[]),...(this.zombies||[])])if(a)a.groundHeight=this.actorHeight(a);
   for(const [d,p] of [[this.companion,this.player],...(this.squad||[]).map(b=>[b.drone,b])])if(d&&p)d.groundHeight=p.groundHeight||0;
  }
  resolveWalls(a){const out=super.resolveWalls(a);a.groundHeight=this.actorHeight(a);return out;}
  spawnZombie(...args){const z=super.spawnZombie(...args);if(z)z.groundHeight=this.surfaceHeight(z.x,z.y);return z;}
  combatSight(a,b){
   if(this.surfaceHeight(a.x,a.y)<.5)return this.clearRoute(a,b);
   return !this.obstacles.some(o=>!o.walkwayRail&&C.rectHit(a,b,o));
  }
  damageZombie(z,amount){
   if(this.arena?.id!=='pump')return super.damageZombie(z,amount);
   const lists=[this.pickups,this.arcadePickups,this.lootPickups],starts=lists.map(l=>l?.length||0),out=super.damageZombie(z,amount);
   for(let i=0;i<lists.length;i++)for(const q of lists[i]?.slice(starts[i])||[]){
    if(this.surfaceHeight(z.x,z.y)>0)q.x=C.clamp(q.x,W.x0+20,W.x1-20);
    if(!this.validPosition(q,10)){q.x=z.x;q.y=z.y;}
   }
   return out;
  }

  stationOffer(s){
   if(s.id!=='pump-overload')return super.stationOffer(s);
   const o=this.pumpOverload;
   const reason=!this.power?'RESTORE GROUND-FLOOR POWER':!o?'UNAVAILABLE':o.phase==='charging'?'PURGE IN '+Math.ceil(o.left)+'s':o.phase==='hot'?'WALKWAY LIVE · '+Math.ceil(o.left)+'s':o.used?'USED THIS ROUND':'';
   return{id:s.id,x:s.x,y:s.y,kind:s.kind,title:'Overload pump grid',detail:'Clears ground enemies · walkway electrifies · 4 runners arrive · once per round',action:'pump-overload',cost:0,duration:2,enabled:!reason,reason};
  }
  completeInteraction(id){
   if(id!=='pump-overload')return super.completeInteraction(id);
   const offer=this.interactionOffer(),o=this.pumpOverload;
   if(!offer||offer.id!==id||!offer.enabled||!o||o.used)return false;
   Object.assign(o,{phase:'charging',used:true,left:3.5,damageClock:0,kills:0,beep:4});
   // Reserve the incoming rush immediately, so a purge cannot prematurely end the round.
   // Use the existing north/south gates and normal spawn warnings, never the walkway.
   for(const [i,index] of [0,2,6,8].entries()){
    const q=this.arena.spawns[index];this.warnings.push({kind:'runner',x:q.x,y:q.y,left:4.3+i*.22,pumpRush:true});
    this.emit('spawn_warning',{x:q.x,y:q.y,kind:'runner'});
   }
   for(const b of this.squad||[]){b.think=0;b.objective=null;}
   this.depotStats.interactions++;
   this.emit('pump_overload_armed',{x:offer.x,y:offer.y,left:3.5});return true;
  }
  onPumpDeck(a,margin=0){return a.x>W.x0&&a.x<W.x1&&a.y>W.up-margin&&a.y<W.down+margin;}
  squadMission(b,target,combat){
   const o=this.pumpOverload;
   if(o&&(o.phase==='charging'||o.phase==='hot')&&b.arcade?.vehicle!=='heli'&&this.onPumpDeck(b,50))
    return{x:(W.x0+W.x1)/2,y:b.y<(W.up+W.down)/2?W.up-75:W.down+75,state:'CLEARING WALKWAY'};
   return super.squadMission(b,target,combat);
  }
  thinkSquadBot(b,combat){
   const o=this.pumpOverload;
   if(o&&(o.phase==='charging'||o.phase==='hot')&&b.arcade?.vehicle!=='heli'&&this.onPumpDeck(b,50)){
    const escape=this.squadMission(b,null,false);b.goal=this.waypoint(b,escape)||escape;
    b.state='CLEARING WALKWAY';b.targetId=null;b.objective=null;b.dodge=0;return;
   }
   return super.thinkSquadBot(b,combat);
  }
  updatePumpOverload(dt){
   const o=this.pumpOverload;if(!o||!['charging','hot'].includes(o.phase))return;
   if(this.status!=='playing'){o.phase='spent';o.left=0;return;}
   o.left=Math.max(0,o.left-dt);
   if(o.phase==='charging'){
    const n=Math.ceil(o.left);if(n>0&&n<o.beep){o.beep=n;this.emit('pump_overload_beep',{left:n});}
    if(o.left>0)return;
    o.phase='hot';o.left=6;o.damageClock=.2;
    for(const z of this.zombies)if(!z.dead&&this.surfaceHeight(z.x,z.y)<.2){
     this.damageZombie(z,z.boss?z.maxHp*.22:z.kind==='brute'?z.maxHp*.65:z.hp+1);if(z.dead)o.kills++;
    }
    this.emit('pump_overload_fire',{x:1276,y:520,kills:o.kills,left:6});return;
   }
   if(o.left<=0){o.phase='spent';this.emit('pump_overload_safe',{});return;}
   o.damageClock-=dt;if(o.damageClock>0)return;o.damageClock=.65;
   for(const a of this.combatActors()){
    const vehicle=a===this.player?this.arcade?.vehicle:a.arcade?.vehicle;
    if(!a.down&&vehicle!=='heli'&&this.onPumpDeck(a))this.damageActor(a,12,'overloaded walkway');
   }
   for(const z of this.zombies)if(!z.dead&&this.onPumpDeck(z))this.damageZombie(z,22);
  }
  tick(dt,input={}){const out=super.tick(dt,input);this.syncSurfaceActors();this.updatePumpOverload(C.clamp(dt,0,1/60));return out;}
 }
 root.DeadwatchCore={...C,Game:WalkwayGame,PUMP_WALKWAY:W,arenaSurfaceHeight};
})(typeof globalThis!=='undefined'?globalThis:this);

// Rail Crossing: a paid mystery train, with a physical central track and shared combat/pickups.
(function(root){'use strict';
 const C=root.DeadwatchCore,TRAIN=Object.freeze({cost:750,warning:12,support:15,range:625,cargo:30,unloadBurst:6,unloadGap:.46,stop:-7.2,y:620,cooldown:45,powerDropEvery:24,powerDropGap:20,droneFirst:36,droneEvery:72});
 function railPlatformHeight(train,x,y){
  if(!train||train.door<=.03||Math.abs(train.lead-TRAIN.stop)>.01||Math.abs(x-720)>1.68/.035)return 0;
  return .65*C.clamp((90-Math.abs(y-TRAIN.y))/54,0,1);
 }
 class RailTrainGame extends C.Game{
  railRewardRules(){return this.arena?.id==='rail'?TRAIN:null;}
  allowKillPowerDrop(){
   const rules=this.railRewardRules();if(!rules)return super.allowKillPowerDrop();
   // Combat pickups share one budget; a paid train delivery still guarantees its prize.
   if(this.time<(this.railNextPowerDropAt||0)||this.arcadePickups.some(q=>q.left>0))return false;
   this.railNextPowerDropAt=this.time+rules.powerDropGap;return true;
  }
  surfaceHeight(x,y){return this.arena?.id==='rail'?railPlatformHeight(this.railTrain,x,y):super.surfaceHeight(x,y);}
  start(...args){this.railReward=null;return super.start(...args);}
  applyArena(wave){
   this.railTrain=null;this.railBounds=null;this.railPieces=[];this.stations=this.stations?.filter(s=>s.id!=='rail-switch');const out=super.applyArena(wave);
   if(this.arena?.id==='rail'){
    // Move the parked foreground cars outward and the signal hut off the boarding axis.
    this.obstacles[2].x=185;this.obstacles[3].x=1035;this.obstacles[4].x=565;
    for(const barrel of this.barrels)if(barrel.y>690&&barrel.y<755){barrel.x=barrel.x<720?435:1005;barrel.y=775;}
    const generator=this.stations.find(q=>q.id==='generator');if(generator)generator.x=610;
    Object.assign(this.trap,{x:720,y:780,radius:92});
    const s=this.stations.find(q=>q.id==='trap');if(s)Object.assign(s,{x:870,y:825,name:'PLATFORM SHOCK SWITCH'});
    this.stations.push({id:'rail-switch',kind:'rail-switch',name:'MYSTERY TRAIN',x:540,y:835,powered:false});
   }
   return out;
  }
  beginWave(wave){
   const deferred=this.deferRouteAdvance,reward=this.railReward;if(!deferred)this.railReward=null;
   const out=super.beginWave(wave);if(deferred)return out;
   if(reward?.wave===wave){const p=this.player,q={x:p.x+55,y:p.y};this.arcadePickups.push({type:reward.type,voidVariant:reward.voidVariant,...(this.validPosition(q,14)?q:{x:p.x,y:p.y}),left:28,trainSupply:true,born:this.time});}
   if(this.arena?.id!=='rail'||this.status!=='playing')return out;
   this.railNextPowerDropAt=0;
   this.railTrain={phase:'ready',variant:null,left:0,lead:65,door:0,cargo:[],total:0,spawned:0,kills:0,rewarded:false,crew:[],unload:0,beep:13,shots:0,calls:0};
   this.railRandom=new C.Random((this.routeSeed||this.seed)^Math.imul(wave+1,0x45d9f3b));return out;
  }
  stationOffer(s){
   if(s.id!=='rail-switch')return super.stationOffer(s);
   const t=this.railTrain,reason=!t?'UNAVAILABLE':t.phase==='cooldown'?(t.left>0?'NEXT TRAIN · '+Math.ceil(t.left)+'s':'CLEAR TRAIN ZOMBIES'):t.phase!=='ready'?'TRAIN CALLED · CLEAR THE TRACKS':this.points<TRAIN.cost?'NEED '+Math.ceil(TRAIN.cost-this.points)+' MORE POINTS':'';
   return{id:s.id,x:s.x,y:s.y,kind:s.kind,title:'Call mystery train',detail:'Power-up, soldier cover or 30-zombie horde · 12s warning',action:'rail-call',cost:TRAIN.cost,duration:.65,enabled:!reason,reason};
  }
  completeInteraction(id){
   if(id!=='rail-switch')return super.completeInteraction(id);
   const offer=this.interactionOffer(),t=this.railTrain;if(!offer||offer.id!==id||!offer.enabled||!t||t.phase!=='ready')return false;
   const roll=this.railRandom.next(),variant=roll<.35?'hostile':roll<.70?'support':'supply',prize=['heli','tank','ray'][Math.floor(this.railRandom.next()*3)];
   const cargo=[];
   if(variant==='hostile'){
    // Reserve ordinary enemies for the rush; armored brutes retain their normal entrances.
    for(let i=this.queue.length-1;i>=0&&cargo.length<TRAIN.cargo;i--)if(this.queue[i]!=='brute')cargo.unshift(...this.queue.splice(i,1));
    while(cargo.length<TRAIN.cargo)cargo.push(cargo.length%3===2?'runner':'walker');
   }
   Object.assign(t,{phase:'warning',variant,prize,left:TRAIN.warning,lead:65,door:0,cargo,total:cargo.length,spawned:0,kills:0,rewarded:false,crew:[],unload:0,beep:TRAIN.warning,shots:0,calls:t.calls+1,navAt:0});
   this.points-=offer.cost;this.depotStats.spent+=offer.cost;this.depotStats.interactions++;
   this.emit('interaction_complete',{station:id,action:offer.action,cost:offer.cost,points:this.points,x:offer.x,y:offer.y,title:'MYSTERY TRAIN CALLED'});
   this.emit('train_warning',{variant:'mystery',left:t.left});return true;
  }
  actorHeight(a){
   if(a.trainDrop){const u=C.clamp((this.time-a.born)/.9,0,1);return .65*(1-u)+Math.sin(Math.PI*u)*1.8;}
   if(a.trainCrew)return .65;if(a.railEntry)return .65*C.clamp((90-Math.abs(a.y-TRAIN.y))/54,0,1);return super.actorHeight(a);
  }
  resolveWalls(a){if(a.railEntry&&Math.abs(a.y-TRAIN.y)<90){a.groundHeight=this.actorHeight(a);return;}return super.resolveWalls(a);}
  syncRailCollision(){
   const t=this.railTrain,live=t&&['warning','opening','active','closing','departing'].includes(t.phase)&&(t.phase!=='warning'||t.left<6);
   const remove=()=>{if(this.railBounds){this.obstacles=this.obstacles.filter(o=>!o.railTrainBody);this.railBounds=null;this.railPieces=[];this.navObstacles=null;}};
   if(!live){remove();return;}
   const x=720+(t.lead-3.4)/.035,w=28.4/.035;if(x>this.width+40||x+w<-40){remove();return;}
   const split=t.door>.80&&Math.abs(t.lead-TRAIN.stop)<.01,half=1.65/.035*t.door;
   const shapes=split?[{x,y:TRAIN.y-28,w:720-half-x,h:56},{x:720+half,y:TRAIN.y-28,w:x+w-720-half,h:56}]:[{x,y:TRAIN.y-28,w,h:56}];
   const changed=!this.railBounds||Math.abs(this.railBounds.x-x)>.01||Math.abs((this.railBounds.half||0)-(split?half:0))>.01;
   if(this.railPieces.length!==shapes.length){
    this.obstacles=this.obstacles.filter(o=>!o.railTrainBody);this.railPieces=shapes.map(o=>({...o,railTrainBody:true}));this.obstacles.push(...this.railPieces);this.navObstacles=null;
   }else for(let i=0;i<shapes.length;i++)Object.assign(this.railPieces[i],shapes[i]);
   this.railBounds={x,y:TRAIN.y-28,w,h:56,half:split?half:0};
   if(changed&&this.time>=t.navAt){this.navObstacles=null;t.navAt=this.time+.16;}
   const r=this.railBounds,blocked=(q,pad)=>this.railPieces.some(o=>C.rectHit(q,q,o,pad));
   // The open center is a real passage. Closing doors clear it before departure.
   for(const actor of [this.player,...(this.squad||[]),...this.zombies]){
    if(!actor||actor.dead||actor.railEntry||(actor===this.player?this.arcade:actor.arcade)?.vehicle==='heli'||!blocked(actor,actor.r))continue;
    const end=t.phase==='closing'&&Math.abs(actor.x-720)<65?90:28;
    const choices=[{x:actor.x,y:TRAIN.y-end-actor.r-3},{x:actor.x,y:TRAIN.y+end+actor.r+3}].filter(q=>this.validPosition(q,actor.r));
    if(!choices.length)for(let d=24;d<=180&&!choices.length;d+=24)for(let i=0;i<12;i++){const q=C.add(actor,C.polar(i*Math.PI/6,d));if(this.validPosition(q,actor.r))choices.push(q);}
    choices.sort((a,b)=>C.distance(a,actor)-C.distance(b,actor));if(choices.length){actor.x=choices[0].x;actor.y=choices[0].y;actor.navPath=null;}
   }
   for(const q of [...this.pickups,...this.arcadePickups,...(this.lootPickups||[])])if(!q.trainDrop&&blocked(q,15)){
    const choices=[{x:q.x,y:r.y-24},{x:q.x,y:r.y+r.h+24}].filter(p=>this.validPosition(p,12));if(choices.length)Object.assign(q,choices.sort((a,b)=>C.distance(a,q)-C.distance(b,q))[0]);
   }
  }
  updateZombie(z,dt){
   if(!z.dead&&z.railEntry){
    const side=z.railSide||1;z.aim=side*Math.PI/2;z.flash=Math.max(0,z.flash-dt);z.cooldown=Math.max(0,z.cooldown-dt);
    const step=Math.min(90-(z.y-TRAIN.y)*side,Math.max(105,z.speed)*dt);z.y+=step*side;z.step+=step*.07;z.groundHeight=this.actorHeight(z);
    if((z.y-TRAIN.y)*side>=90){delete z.railEntry;z.groundHeight=0;}return;
   }
   return super.updateZombie(z,dt);
  }
  damageZombie(z,amount){
   const alive=!z.dead,lists=[this.pickups,this.arcadePickups,this.lootPickups],starts=lists.map(q=>q?.length||0),out=super.damageZombie(z,amount);
   if(alive&&z.dead&&z.railConvoy){
    if(this.railTrain&&z.railConvoy===this.railTrain.calls)this.railTrain.kills++;
    for(let i=0;i<lists.length;i++)for(const q of lists[i]?.slice(starts[i])||[])if(z.railEntry&&Math.abs(q.y-TRAIN.y)<94){q.x=C.clamp(q.x,674,766);q.y=TRAIN.y+(z.railSide||1)*110;}
    this.rewardRailTrain();
   }
   return out;
  }
  rewardRailTrain(){
   const t=this.railTrain;if(!t||t.variant!=='hostile'||t.rewarded||t.cargo.length||t.kills<t.total)return;
   t.rewarded=true;
   this.lootPickups.push({id:++this.serial,type:'gem',tier:'medium',x:720,y:TRAIN.y+160,left:22,pile:-1,born:this.time,trainBonus:true});
   this.lootStats.spawned++;this.emit('train_cleared',{x:720,y:TRAIN.y+160,count:1});
  }
  collectArcade(q){
   if(q?.trainDrop&&this.time-q.born<.9)return false;
   if(q?.trainSupply&&q.left!==undefined&&q.left<=0)return false;
   const cleared=this.mode!=='range'&&this.roundFinishedSpawning()&&!this.queue.length&&!this.warnings.length&&!(this.antiCamp?.breachWarnings?.length)&&!this.zombies.some(z=>!z.dead);
   if(q?.trainSupply&&(this.status==='loot'||this.status==='playing'&&cleared)){
    this.railReward={type:q.type,wave:this.wave+1,voidVariant:q.type==='ray'?C.Voidcaster.assign(q).id:null};q.left=0;
    this.emit('armory_choice',{power:q.type,label:q.type==='ray'?C.Voidcaster.assign(q).name:C.ARCADE_DROP_LABELS[q.type],x:q.x,y:q.y});return true;
   }
   return super.collectArcade(q);
  }
  squadCanCollect(b,q){if(q?.trainSupply&&(this.status!=='playing'||this.time-q.born<3))return false;return super.squadCanCollect(b,q);}
  completeWave(){
   const t=this.railTrain;if(t&&(['warning','opening'].includes(t.phase)||t.cargo.length||(t.phase==='active'&&t.variant==='supply'&&t.left>4.9)))return;
   const bonus=(this.lootPickups||[]).filter(q=>q.trainBonus&&q.left>0),out=super.completeWave();
   if(this.status==='loot')for(const q of bonus)if(!this.lootPickups.includes(q)){q.left=Math.max(q.left,this.loot.left);this.lootPickups.push(q);}
   if(t&&this.status!=='playing')this.departRailTrain();return out;
  }
  departRailTrain(){
   const t=this.railTrain;if(!t||['ready','cooldown','closing','departing'].includes(t.phase))return;
   t.phase='closing';t.left=.9;this.emit('train_depart',{variant:t.variant});
  }
  fireRailCrew(b,dt){
   b.recoil=Math.max(0,b.recoil-dt);b.cooldown=Math.max(0,b.cooldown-dt);if(b.cooldown>0||this.status!=='playing')return;
   const target=this.zombies.filter(z=>!z.dead&&(z.y-TRAIN.y)*(b.trainSide||1)>60&&C.distance(b,z)<TRAIN.range&&this.clearRoute(b,z)).sort((a,z)=>C.distance(b,a)-C.distance(b,z))[0];if(!target)return;
   b.aim=C.angleTo(b,target);const dir=C.polar(b.aim,1),origin=C.add(b,C.polar(b.aim,27));let end=C.distance(origin,target)+target.r,hit=null;
   for(const z of this.zombies)if(!z.dead){const d=C.rayCircle(origin,dir,z,z.r+1,end);if(d<end){end=d;hit=z;}}
   if(!hit||this.combatActors().some(a=>C.rayCircle(origin,dir,a,a.r+6,end)<end))return;
   if(this.barrels.some(a=>!a.spent&&C.rayCircle(origin,dir,a,18,end)<end))return;
   b.burst=(b.burst+1)%5;b.cooldown=b.burst===0?.52:.13;b.recoil=.09;
   this.damageZombie(hit,28*this.mods.damage);this.railTrain.shots++;
   this.emit('squad_shot',{actorId:b.actorId,actorX:b.x,actorY:b.y,aim:b.aim,groundHeight:.65,x:origin.x,y:origin.y,height:1.18,path:{a:origin,b:C.add(origin,C.polar(b.aim,end)),kind:'zombie'}});
  }
  updateRailTrain(dt){
   const t=this.railTrain;if(!t||t.phase==='ready')return;
   if(this.status!=='playing'&&!['cooldown','closing','departing'].includes(t.phase))this.departRailTrain();
   t.left=Math.max(0,t.left-dt);
   if(t.phase==='cooldown'){if(t.left<=0&&(t.variant!=='hostile'||t.kills>=t.total))t.phase='ready';return;}
   if(t.phase==='warning'){
    t.lead=TRAIN.stop+72.2*Math.pow(Math.min(1,t.left/6),2);
    const n=Math.ceil(t.left);if(n>0&&n<t.beep){t.beep=n;this.emit('train_countdown',{variant:n>8?'mystery':t.variant,left:n});}
    if(t.left<=0){t.phase='opening';t.left=.85;t.lead=TRAIN.stop;this.navObstacles=null;this.emit('train_arrive',{variant:t.variant});}return;
   }
   if(t.phase==='opening'){
    t.door=1-t.left/.85;if(t.left>0)return;t.door=1;t.phase='active';
    // When combat ended during the approach, soldiers leave supplies instead of wasting a paid call.
    if(t.variant==='support'&&this.roundFinishedSpawning()&&!this.queue.length&&!this.warnings.length&&!this.zombies.some(z=>!z.dead))t.variant='supply';
    t.left=t.variant==='support'?TRAIN.support:t.variant==='supply'?6:4;
    if(t.variant==='support')t.crew=[-1,1].map((side,i)=>({actorId:'train-crew-'+i,trainCrew:true,trainSide:side,x:720+(i?18:-18),y:TRAIN.y+side*40,aim:side*Math.PI/2,vx:0,vy:0,hp:100,maxHp:100,r:13,groundHeight:.65,recoil:0,cooldown:i*.2,burst:0}));
    if(t.variant==='supply')this.arcadePickups.push({id:++this.serial,type:t.prize,x:720,y:TRAIN.y+36,left:28,born:this.time,trainSupply:true,trainDrop:true});
    this.emit('train_open',{variant:t.variant,power:t.prize,left:t.left,count:t.total});return;
   }
   if(t.phase==='active'){
    if(t.variant==='support'){for(const b of t.crew)this.fireRailCrew(b,dt);if(t.left<=0)this.departRailTrain();}
    else if(t.variant==='supply'){if(t.left<=0)this.departRailTrain();}
    else{
     t.unload-=dt;const cap=this.replayEnemyCap?.((this.mode==='range'?2:(C.PRESSURE_WAVES[this.wave]?.cap||24))+TRAIN.cargo)??((this.mode==='range'?2:(C.PRESSURE_WAVES[this.wave]?.cap||24))+TRAIN.cargo),active=this.zombies.filter(z=>!z.dead).length+this.warnings.length+(this.antiCamp?.breachWarnings?.length||0);
     if(t.cargo.length&&t.unload<=0&&active<cap){
      // Three abreast through each door. A bounded train reserve prevents the normal cap trickling them out.
      const count=Math.min(TRAIN.unloadBurst,t.cargo.length,Math.max(0,cap-active));
      for(let i=0;i<count;i++){
       const side=t.spawned%2?-1:1,lane=Math.floor(t.spawned/2)%3,z=this.spawnZombie(t.cargo.shift(),720+[-30,0,30][lane],TRAIN.y+side*36);
       Object.assign(z,{railConvoy:t.calls,railEntry:true,railSide:side,aim:side*Math.PI/2,groundHeight:.65});t.spawned++;
      }
      t.unload=TRAIN.unloadGap;
     }
     if(!t.cargo.length&&t.left<=0&&!this.zombies.some(z=>!z.dead&&z.railEntry))this.departRailTrain();
    }return;
   }
   if(t.phase==='closing'){t.door=t.left/.9;if(t.left<=0){t.phase='departing';t.left=5;t.door=0;t.crew=[];}return;}
   if(t.phase==='departing'){t.lead=TRAIN.stop-115*Math.pow(1-t.left/5,2);if(t.left<=0){t.phase='cooldown';t.left=TRAIN.cooldown;}}
  }
  director(dt){
   this.updateRailTrain(dt);this.syncRailCollision();const t=this.railTrain;
   if(t?.variant==='hostile'&&t.cargo.length&&this.mode!=='range'){
    const occupied=this.zombies.filter(z=>!z.dead).length+this.warnings.length+(this.antiCamp?.breachWarnings?.length||0),cap=C.PRESSURE_WAVES[this.wave].cap;
    const held=this.queue.splice(Math.max(0,cap-t.cargo.length-this.breachCount()-occupied));
    try{return super.director(dt);}finally{this.queue.push(...held);}
   }
   return super.director(dt);
  }
  tick(dt,input={}){
   const before=this.status,out=super.tick(dt,input),step=C.clamp(dt,0,1/60);
   if(this.railTrain&&before!=='playing'&&['loot','exiting'].includes(this.status)){this.updateRailTrain(step);this.syncRailCollision();}
   if(!['playing','loot','exiting'].includes(this.status))return out;
   for(const q of this.arcadePickups||[])if(q.trainSupply&&q.left>0){
    if(q.trainDrop){const u=C.clamp((this.time-q.born)/.9,0,1);q.y=TRAIN.y+36+126*u*u*(3-2*u);if(u>=1)delete q.trainDrop;}
    if(this.status==='loot'){q.left=Math.max(0,q.left-step);if(q.left>0&&C.distance(q,this.player)<40&&this.clearRoute(this.player,q))this.collectArcade(q);}
   }
   if(this.railTrain&&this.status==='playing'){
    for(const q of this.lootPickups||[])if(q.trainBonus&&q.left>0){
     q.left=Math.max(0,q.left-step);let d=C.distance(q,this.player);if(!this.clearRoute(q,this.player))continue;
     if(d>36&&d<92){const f=Math.min(d-32,step*260)/d;q.x+=(this.player.x-q.x)*f;q.y+=(this.player.y-q.y)*f;d=C.distance(q,this.player);}
     if(d<38)this.collectLoot(q);
    }
    this.lootPickups=this.lootPickups.filter(q=>q.left>0);
   }
   return out;
  }
 }
 root.DeadwatchCore={...C,Game:RailTrainGame,RAIL_TRAIN:TRAIN,railPlatformHeight};
})(typeof globalThis!=='undefined'?globalThis:this);

// Quarantine Camp: continuous evacuation traffic with rare unsignalled aircraft accidents.
(function(root){'use strict';
 const C=root.DeadwatchCore,AIR=Object.freeze({fall:3.2,slide:1.15,skid:54,cargo:12,wreckTime:28,w:148,h:76,exit:78});
 function campFlybyPose(time,slot){
  const clock=time+slot*18+8,cycle=Math.floor(clock/36),u=(clock%36)/32,dir=slot?-1:1;
  return{active:u<=1,cycle,x:720+dir*(-1060+2120*u),y:520+(slot?120:-125)+Math.sin(u*Math.PI)*95,height:4.1+slot*.8+Math.sin(u*Math.PI)*.55,heading:dir>0?0:Math.PI,roll:dir*.045,slot};
 }
 function campAircraftPose(c){
  const dir=Math.cos(c.heading),roll=c.rollSign||1;
  if(c.phase==='falling'){
   const u=C.clamp(1-c.left/AIR.fall,0,1),v=1-u,hx=c.x-dir*AIR.skid,hy=c.y;
   const x=v*v*v*c.fromX+3*v*v*u*(c.fromX+Math.cos(c.fromHeading)*130)+3*v*u*u*(hx-dir*105)+u*u*u*hx;
   const y=v*v*v*c.fromY+3*v*v*u*(c.fromY+Math.sin(c.fromHeading)*130)+3*v*u*u*hy+u*u*u*hy;
   const da=Math.atan2(Math.sin(c.heading-c.fromHeading),Math.cos(c.heading-c.fromHeading));
   return{x,y,height:.80+(c.fromHeight-.80)*(1-u*u),heading:c.fromHeading+da*u+.72*Math.sin(u*Math.PI)*roll,roll:roll*(.95*u+.22*Math.sin(u*19)*Math.sin(Math.PI*u)),pitch:-.22*u};
  }
  const u=c.phase==='skid'?C.clamp(1-c.left/AIR.slide,0,1):1;
  return{x:c.x-dir*AIR.skid*(1-u)*(1-u),y:c.y,height:.80+.14*Math.sin(u*Math.PI)*(1-u),heading:c.heading+.07*Math.sin(u*Math.PI*2)*(1-u),roll:roll*(.95+.15*Math.sin(u*Math.PI*3)*(1-u)),pitch:-.22+.10*u};
 }
 class QuarantineGame extends C.Game{
  applyArena(...args){this.campAir=null;this.campWreck=null;return super.applyArena(...args);}
  beginWave(wave){
   const deferred=this.deferRouteAdvance,out=super.beginWave(wave);if(deferred||this.arena?.id!=='quarantine'||this.status!=='playing')return out;
   this.railNextPowerDropAt=0;this.campRandom=new C.Random((this.routeSeed||this.seed)^Math.imul(wave+17,0x45d9f3b));
   this.campAir={phase:'idle',left:(this.mode==='range'?22:44)+this.campRandom.next()*12,evacStart:this.time,count:0,x:720,y:410,heading:0,cargo:[],spawned:0,unload:0,impactAt:-100,flightSlot:-1,flightCycle:-1};return out;
  }
  railRewardRules(){return this.arena?.id==='quarantine'?C.RAIL_TRAIN:super.railRewardRules();}
  campCrashSite(){
   const sites=[[500,405],[935,405],[720,390],[500,175],[940,175],[720,885]],p=this.player,c=this.campAir;
   const legal=([x,y])=>{
    if(C.distance({x,y},p)<215||this.combatActors().some(a=>!a.down&&C.distance({x,y},a)<165))return false;
    if(c.count&&Math.hypot(x-c.x,y-c.y)<120)return false;
    const dir=x<720?1:-1,r={x:x-AIR.w/2-20-(dir>0?AIR.skid:0),y:y-AIR.h/2-20,w:AIR.w+40+AIR.skid,h:AIR.h+40};
    if(C.distance({x:x-dir*AIR.skid,y},p)<190)return false;
    if(r.x<65||r.y<65||r.x+r.w>this.width-65||r.y+r.h>this.height-65)return false;
    if(this.obstacles.some(o=>r.x<o.x+o.w&&r.x+r.w>o.x&&r.y<o.y+o.h&&r.y+r.h>o.y))return false;
    if([-1,1].some(side=>[-26,0,26].some(dx=>{const a={x:x+dx,y:y+side*24},b={x:x+dx,y:y+side*(AIR.exit+16)};return !this.validPosition(b,16)||!this.clearRoute(a,b,16);})))return false;
    return !this.stations.some(o=>C.distance({x,y},o)<110)&&!this.barrels.some(o=>!o.spent&&C.distance({x,y},o)<105);
   };
   return sites.filter(legal).map(([x,y])=>({x,y,rank:Math.abs(Math.hypot(x-p.x,y-p.y)-310)+this.campRandom.next()*90})).sort((a,b)=>a.rank-b.rank)[0]||null;
  }
  startCampCrash(){
   const c=this.campAir,q=this.campCrashSite();if(!c||!q)return false;
   const flight=[0,1].map(i=>campFlybyPose(this.time-c.evacStart,i)).filter(f=>f.active&&f.x>150&&f.x<1290).sort((a,b)=>C.distance(a,q)-C.distance(b,q))[0];if(!flight)return false;
   const cargo=[];for(let i=this.queue.length-1;i>=0&&cargo.length<AIR.cargo;i--)if(this.queue[i]!=='brute')cargo.unshift(...this.queue.splice(i,1));
   while(cargo.length<AIR.cargo)cargo.push(cargo.length%4===3?'runner':'walker');
   Object.assign(c,{phase:'falling',left:AIR.fall,x:q.x,y:q.y,heading:q.x<720?0:Math.PI,cargo,spawned:0,unload:.75,count:c.count+1,flightSlot:flight.slot,flightCycle:flight.cycle,fromX:flight.x,fromY:flight.y,fromHeight:flight.height,fromHeading:flight.heading,rollSign:q.x<720?1:-1});return true;
  }
  removeCampWreck(){
   if(!this.campWreck)return;this.obstacles=this.obstacles.filter(o=>!o.campWreck);this.campWreck=null;this.navObstacles=null;this.navGraphs=new Map();
  }
  syncCampWreck(){
   const c=this.campAir,p=campAircraftPose(c);
   if(!this.campWreck){this.campWreck={campWreck:true};this.obstacles.push(this.campWreck);}
   Object.assign(this.campWreck,{x:p.x-AIR.w/2,y:p.y-AIR.h/2,w:AIR.w,h:AIR.h});
   for(const a of [...this.combatActors(),...this.zombies])if(!a.dead&&(a===this.player?this.arcade:a.arcade)?.vehicle!=='heli')this.resolveWalls(a);
   for(const q of [...this.pickups,...this.arcadePickups,...this.lootPickups])if(C.rectHit(q,q,this.campWreck,15)){
    const side=q.y<p.y?-1:1;q.x=C.clamp(q.x,p.x-45,p.x+45);q.y=p.y+side*(AIR.h/2+30);
   }
  }
  impactCampAircraft(){
   const c=this.campAir;if(!c)return;
   Object.assign(c,{phase:'skid',left:AIR.slide,impactAt:this.time});const p=campAircraftPose(c);
   for(const a of this.combatActors())if(!a.down&&C.distance(a,p)<88&&(a===this.player?this.arcade:a.arcade)?.vehicle!=='heli')this.damageActor(a,18,'helicopter crash');
   for(const z of [...this.zombies])if(!z.dead&&C.distance(z,p)<100)this.damageZombie(z,150);
   this.syncCampWreck();this.navObstacles=null;this.navGraphs=new Map();
   this.emit('camp_air_impact',{x:p.x,y:p.y});
  }
  actorHeight(a){if(a.campEntry)return .40*C.clamp((AIR.exit-Math.abs(a.y-a.campOriginY))/(AIR.exit-24),0,1);return super.actorHeight(a);}
  resolveWalls(a){if(a.campEntry&&Math.abs(a.y-a.campOriginY)<AIR.exit){a.groundHeight=this.actorHeight(a);return;}return super.resolveWalls(a);}
  updateZombie(z,dt){
   if(!z.dead&&z.campEntry){
    const side=z.campSide,step=Math.max(0,Math.min(AIR.exit-(z.y-z.campOriginY)*side,Math.max(120,z.speed)*dt));
    z.aim=side*Math.PI/2;z.flash=Math.max(0,z.flash-dt);z.cooldown=Math.max(0,z.cooldown-dt);z.y+=side*step;z.step+=step*.07;z.groundHeight=this.actorHeight(z);
    if((z.y-z.campOriginY)*side>=AIR.exit-.001){delete z.campEntry;this.resolveWalls(z);}return;
   }
   return super.updateZombie(z,dt);
  }
  damageZombie(z,amount){
   const alive=!z.dead,lists=[this.pickups,this.arcadePickups,this.lootPickups],starts=lists.map(q=>q?.length||0),out=super.damageZombie(z,amount);
   if(alive&&z.dead&&z.campEntry)for(let i=0;i<lists.length;i++)for(const q of lists[i]?.slice(starts[i])||[]){q.x=z.campOriginX;q.y=z.campOriginY+z.campSide*(AIR.h/2+32);}
   return out;
  }
  updateCampAir(dt){
   const c=this.campAir;if(!c)return;
   if(c.phase==='idle'){
    if(this.status!=='playing'||this.mode!=='range'&&this.roundFinishedSpawning())return;c.left=Math.max(0,c.left-dt);if(c.left<=0&&!this.startCampCrash())c.left=2;return;
   }
   c.left=Math.max(0,c.left-dt);
   if(c.phase==='falling'){if(c.left<=0)this.impactCampAircraft();return;}
   if(c.phase==='skid'){
    this.syncCampWreck();if(c.left<=0){c.phase='wreck';c.left=AIR.wreckTime;this.navObstacles=null;this.navGraphs=new Map();}return;
   }
   if(c.phase==='wreck'){
    c.unload-=dt;const cap=this.replayEnemyCap?.((this.mode==='range'?2:(C.PRESSURE_WAVES[this.wave]?.cap||26))+AIR.cargo)??((this.mode==='range'?2:(C.PRESSURE_WAVES[this.wave]?.cap||26))+AIR.cargo);
    const occupied=this.zombies.filter(z=>!z.dead).length+this.warnings.length+(this.antiCamp?.breachWarnings?.length||0);
    if(this.status==='playing'&&c.cargo.length&&c.unload<=0&&occupied<cap){
     const count=Math.min(3,c.cargo.length,cap-occupied);
     for(let i=0;i<count;i++){
      const side=c.spawned%2?-1:1,x=c.x+[-26,0,26][Math.floor(c.spawned/2)%3],z=this.spawnZombie(c.cargo.shift(),x,c.y+side*24);
      Object.assign(z,{campEntry:true,campConvoy:c.count,campSide:side,campOriginX:c.x,campOriginY:c.y,aim:side*Math.PI/2,groundHeight:.40});c.spawned++;
     }
     c.unload=.50;
    }
    if(c.left<=0&&!c.cargo.length&&!this.zombies.some(z=>!z.dead&&z.campEntry)){this.removeCampWreck();c.phase='idle';c.left=72+this.campRandom.next()*42;}
   }
  }
  director(dt){
   this.updateCampAir(dt);const c=this.campAir;
   if(c?.cargo.length&&this.mode!=='range'){
    const cap=C.PRESSURE_WAVES[this.wave]?.cap||26,occupied=this.zombies.filter(z=>!z.dead).length+this.warnings.length+(this.antiCamp?.breachWarnings?.length||0);
    const held=this.queue.splice(Math.max(0,cap-c.cargo.length-this.breachCount()-occupied));
    try{return super.director(dt);}finally{this.queue.push(...held);}
   }
   return super.director(dt);
  }
  completeWave(){if(this.campAir&&(['falling','skid'].includes(this.campAir.phase)||this.campAir.cargo.length))return;return super.completeWave();}
  tick(dt,input={}){const before=this.status,out=super.tick(dt,input);if(before!=='playing'&&['loot','exiting'].includes(this.status))this.updateCampAir(C.clamp(dt,0,1/60));return out;}
 }
 root.DeadwatchCore={...C,Game:QuarantineGame,CAMP_AIR:AIR,campFlybyPose,campAircraftPose};
})(typeof globalThis!=='undefined'?globalThis:this);

// Final airfield objective. Existing combat, controls and the campaign director stay shared.
(function(root){'use strict';
 const C=root.DeadwatchCore,EVAC=Object.freeze({health:2400,repair:450,repairCost:0,repairHold:1.35,practiceSeconds:60,takeoffSeconds:6.5});
 class EvacuationGame extends C.Game{
  start(...args){this.evac=null;return super.start(...args);}
  applyArena(wave){
   this.evac=null;if(this.stations)this.stations=this.stations.filter(s=>s.kind!=='evac');
   const out=super.applyArena(wave);if(this.arena?.id!=='evac')return out;
   this.evac={phase:'defending',hp:EVAC.health,maxHp:EVAC.health,flash:0,critical:false,repairs:0,assigned:0,takeoff:0,door:0,x:720,y:520,targets:[
    {actorId:'evac-north',x:716,y:472,r:4},{actorId:'evac-south',x:716,y:568,r:4},
    {actorId:'evac-nose',x:820,y:520,r:4},{actorId:'evac-tail',x:643,y:479,r:4}
   ]};
   // Rounded-body navigation uses small solid hull/tail footprints; the rotor is overhead.
   this.obstacles.push({x:672,y:496,w:124,h:48,evacHeli:true},{x:585,y:511,w:87,h:18,evacHeli:true});
   this.navGraphs=new Map();this.navObstacles=null;
   for(const [side,y] of [['north',460],['south',580]])this.stations.push({id:'evac-'+side,kind:'evac',name:'RESCUE HELICOPTER',x:706,y,powered:false});
   Object.assign(this.player,{x:816,y:644,vx:0,vy:0});for(const b of this.squad||[])this.placeSquadBot(b);
   // The shock field guards the nose approach, outside the solid fuselage.
   Object.assign(this.trap,{x:890,y:520,radius:100});
   return out;
  }
  beginWave(wave){
   const deferred=this.deferRouteAdvance,out=super.beginWave(wave);
   if(!deferred&&this.evac?.phase==='defending'&&this.status==='playing'){
    if(this.mode==='range')this.queue=Array.from({length:40},(_,i)=>i%5===4?'runner':'walker');
    this.emit('evac_defend',{x:720,y:520});
   }return out;
  }
  spawnZombie(...args){
   const z=super.spawnZombie(...args);if(this.evac?.phase==='defending')z.evacAttacker=++this.evac.assigned%4===0&&this.zombies.filter(a=>a!==z&&!a.dead&&a.evacAttacker).length<3;return z;
  }
  zombieTarget(z){
   const e=this.evac;if(e?.phase!=='defending'||!z.evacAttacker||z.hunter||z.boss)return super.zombieTarget(z);
   const old=e.targets.find(t=>t.actorId===z.evacTarget);
   if(old&&this.time<(z.evacTargetUntil||0))return old;
   let best=null,score=Infinity;
   for(const target of e.targets){const d=C.distance(z,target)*(this.clearRoute(z,target,z.r-.25)?1:1.8);if(d<score){score=d;best=target;}}
   z.evacTarget=best.actorId;z.evacTargetUntil=this.time+1.2;return best;
  }
  actorById(id){return this.evac?.phase==='defending'&&this.evac.targets.find(t=>t.actorId===id)||super.actorById(id);}
  damageActor(actor,amount,from){
   if(!actor?.actorId?.startsWith('evac-'))return super.damageActor(actor,amount,from);
   const e=this.evac;if(!e||e.phase!=='defending'||this.status!=='playing'||this.godMode||!(amount>0))return false;
   amount=this.scaleCampaignIncomingDamage?.(amount)??amount;e.hp=Math.max(0,e.hp-amount);e.flash=.18;
   if(e.hp<=0){e.phase='failed';this.status='defeat';this.cancelInteraction();this.emit('evac_failed',{x:e.x,y:e.y});this.emit('defeat',{reason:'helicopter_lost'});}
   else if(e.hp<=e.maxHp*.3&&!e.critical){e.critical=true;this.emit('evac_critical',{x:e.x,y:e.y});}
   return true;
  }
  stationOffer(s){
   if(s.kind!=='evac')return super.stationOffer(s);
   const e=this.evac,boarding=e?.phase==='boarding',offer={id:s.id,x:s.x,y:s.y,kind:'evac',title:boarding?'BOARD HELICOPTER':'REPAIR HELICOPTER',detail:boarding?'Hold USE to evacuate your squad':'Restore '+EVAC.repair+' hull · stop firing to repair',action:boarding?'evac_board':'evac_repair',cost:boarding?0:EVAC.repairCost,duration:boarding?.85:EVAC.repairHold,enabled:true,reason:''};
   if(!e||!['defending','boarding'].includes(e.phase))offer.reason='PREPARING EXTRACTION';
   else if(!boarding&&e.hp>=e.maxHp)offer.reason='HULL FULL · PROTECT THE HELICOPTER';
   else if(!boarding&&this.points<offer.cost)offer.reason='NEED '+Math.ceil(offer.cost-this.points)+' MORE POINTS';
   offer.enabled=!offer.reason;return offer;
  }
  completeInteraction(id){
   if(!id.startsWith('evac-'))return super.completeInteraction(id);
   const offer=this.interactionOffer(),e=this.evac;if(!e||!offer||offer.id!==id||!offer.enabled)return false;
   if(offer.action==='evac_repair'){
    e.hp=Math.min(e.maxHp,e.hp+EVAC.repair);e.repairs++;if(e.hp>e.maxHp*.4)e.critical=false;
    this.points-=offer.cost;this.depotStats.spent+=offer.cost;this.depotStats.interactions++;
    this.emit('evac_repaired',{x:e.x,y:e.y,hp:e.hp,cost:offer.cost});return true;
   }
   if(offer.action==='evac_board'&&e.phase==='boarding'){
    e.phase='takeoff';e.takeoff=0;this.cancelInteraction();Object.assign(this.player,{x:706,y:580,vx:0,vy:0,roll:0,recoil:0,fireCooldown:0});
    for(const b of this.squad||[])Object.assign(b,{vx:0,vy:0,state:'EVACUATING'});
    this.emit('evac_takeoff',{x:e.x,y:e.y});return true;
   }return false;
  }
  roundFinishedSpawning(){return this.evac&&this.mode==='range'?this.waveTime>=EVAC.practiceSeconds:super.roundFinishedSpawning();}
  roundSpawnPlan(cfg){
   if(!this.evac||this.mode!=='range')return super.roundSpawnPlan(cfg);
   return{cap:12,gap:1.8,burst:2,resting:this.roundFinishedSpawning()};
  }
  director(dt){
   if(this.evac&&!['defending','standby'].includes(this.evac.phase))return;
   if(this.evac&&this.mode==='range'&&this.roundFinishedSpawning())this.queue=[];
   const out=super.director(dt);
   if(this.evac?.phase==='defending'&&this.mode==='range'&&this.roundFinishedSpawning()){
    this.queue=[];if(!this.warnings.length&&!this.zombies.some(z=>!z.dead))this.completeWave();
   }return out;
  }
  updateCampPressure(dt){if(this.evac&&!['defending','standby'].includes(this.evac.phase))return;return super.updateCampPressure(dt);}
  completeWave(){
   const e=this.evac;if(!e||e.phase==='standby')return super.completeWave();
   if(e.phase!=='defending'||this.status!=='playing'||!this.roundFinishedSpawning()||this.zombies.some(z=>!z.dead)||this.warnings.length||this.antiCamp?.breachWarnings?.length)return;
   e.phase='reward';this.queue=[];if(this.antiCamp){this.antiCamp.zone=null;this.antiCamp.breachWarnings=[];}
   if(this.mode!=='range'){
    const out=super.completeWave();if(this.loot){this.loot.nextStatus='playing';return out;}
   }
   this.openEvacuation();
  }
  emit(type,data){if(type==='won'&&this.evac&&this.evac.phase!=='complete')return;return super.emit(type,data);}
  finishLoot(){const out=super.finishLoot();if(this.evac?.phase==='reward')this.openEvacuation();return out;}
  openEvacuation(){this.evac.phase='boarding';this.status='playing';this.cancelInteraction();this.emit('evac_ready',{x:706,y:580});}
  tick(dt,input={}){
   const e=this.evac,step=C.clamp(dt,0,1/60);
   if(e&&['playing','loot'].includes(this.status)){
    e.flash=Math.max(0,e.flash-step);const target=['reward','boarding'].includes(e.phase)?1:0;e.door=C.mix(e.door,target,1-Math.exp(-step*3));
    if(e.phase==='takeoff'){
     this.time+=step;this.stats.seconds+=step;e.takeoff=Math.min(EVAC.takeoffSeconds,e.takeoff+step);
     if(e.takeoff>=EVAC.takeoffSeconds){e.phase='complete';this.status='won';this.emit('won',{evacuated:true,hull:e.hp,repairs:e.repairs});}return;
    }
   }
   return super.tick(dt,input);
  }
  export(){return{...super.export(),evac:this.evac?{...this.evac,targets:this.evac.targets.map(t=>({...t}))}:null};}
 }
 root.DeadwatchCore={...C,Game:EvacuationGame,EVAC_RULES:EVAC};
})(typeof globalThis!=='undefined'?globalThis:this);

// .152 Campaign Watch Rank. The v1 key is retained so existing browser saves migrate.
(function(root){'use strict';
 const KEY='deadwatch.profile.v1',SCHEMA='deadwatch-profile',MAX_RANK=25;
 const MAP_XP=Object.freeze([150,175,200,300,225,250,275,400]);
 const SKINS=Object.freeze([
  {id:'field',name:'Field Olive',level:1,cost:0,tint:0,color:'#738064'},
  {id:'night',name:'Night Watch',level:2,cost:100,tint:1,color:'#607f91'},
  {id:'desert',name:'Desert Patrol',level:3,cost:180,tint:2,color:'#ab9369'},
  {id:'ember',name:'Ember Watch',level:5,cost:300,tint:3,color:'#9c6656'}
 ]);
 const MILESTONES=Object.freeze([{wave:2,credits:25},{wave:4,credits:40},{wave:6,credits:60},{wave:8,credits:100}]);
 const UPGRADES=Object.freeze([
  {id:'health',group:'SURVIVAL',name:'Maximum Health',step:4,unit:'% maximum health'},
  {id:'healing',group:'SURVIVAL',name:'Med Kit Healing',step:10,unit:'% healing'},
  {id:'dashRecharge',group:'MOBILITY',name:'Dash Recharge',step:5,unit:'% shorter recharge'},
  {id:'dashSpeed',group:'MOBILITY',name:'Dash Speed',step:10,unit:'% dash speed',detail:'Cover the same distance faster. The attack-timing window stays unchanged.'},
  {id:'repair',group:'FIELD TECH',name:'Repair Speed',step:10,unit:'% repair speed'},
  {id:'lureRadius',group:'FIELD TECH',name:'Lure Radius',step:10,unit:'% radius'},
  {id:'lureDuration',group:'FIELD TECH',name:'Lure Duration',step:10,unit:'% duration'},
  {id:'powerDuration',group:'POWER-UP MASTERY',name:'Timed Power-Up Duration',step:5,unit:'% active duration'}
 ]);
 const PERKS=Object.freeze([
  {rank:5,id:'quickHands',name:'QUICK HANDS',detail:'Complete non-repair USE actions 25% faster: power panels, traps, boarding and other held interactions. Med Kits remain instant.'},
  {rank:10,id:'escapeArtist',name:'ESCAPE ARTIST',detail:'A perfect Dash refunds an extra 0.25s of recharge. The existing timing window is unchanged.'},
  {rank:15,id:'engineer',name:'ENGINEER',detail:'Completing a repair stage pushes nearby normal zombies away. No damage.'},
  {rank:20,id:'panicReserve',name:'PANIC RESERVE',detail:'Start each new run with 3 Speed Boosts instead of 2. The extra Boost is granted only at the start of a new run.'},
  {rank:25,id:'lastStand',name:'LAST STAND',detail:'Once per run, lethal damage leaves you at 1 HP.'}
 ]);
 const integer=(v,max=1e9)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
 const clone=o=>JSON.parse(JSON.stringify(o));
 function rank(xp){let level=1,progress=Math.max(0,xp||0),needed=300;while(level<MAX_RANK&&progress>=needed){progress-=needed;level++;needed=300+75*(level-1);}return{level,progress,needed:level===MAX_RANK?0:needed,max:level===MAX_RANK};}
 function newWatch(){return{rank:1,currentXP:0,points:0,upgrades:Object.fromEntries(UPGRADES.map(u=>[u.id,0])),perks:[],mapsCompleted:[],firstMaps:[],firstCampaign:false,highestEndlessRound:0,endlessRecords:{solo:0,teammate:0,maps:{},rotation:0},campaignCompletions:0,awards:[]};}
 const fresh=()=>({version:4,xp:0,legacyXP:0,credits:0,owned:['field'],selected:'field',milestones:[],stats:{runs:0,kills:0,seconds:0,wins:0,bestWave:0,bestScore:0},applied:[],pending:null,watch:newWatch()});
 function syncRank(data){const r=rank(data.xp),w=data.watch;w.rank=r.level;w.currentXP=r.progress;w.perks=PERKS.filter(p=>r.level>=p.rank).map(p=>p.id);return r;}
 function validRun(r){
  if(!r||typeof r!=='object'||typeof r.id!=='string'||r.id.length>100||!r.id.length||!['campaign','range','quick','endless'].includes(r.mode)||typeof r.practice!=='boolean'||r.won!==undefined&&typeof r.won!=='boolean'||!integer(r.kills,1e7)||!integer(r.seconds,1e7)||!integer(r.score)||!Array.isArray(r.cleared))return false;
  if(r.mode==='campaign'||r.mode==='range')return integer(r.wave,8)&&r.cleared.length<=8&&r.cleared.every(n=>integer(n,8)&&n>0);
  return integer(r.wave)&&r.wave>0&&integer(r.completedRounds)&&r.completedRounds<=r.wave&&integer(r.bankedBlocks)&&r.bankedBlocks<=Math.floor(r.completedRounds/5)&&integer(r.deathCount)&&['solo','teammate'].includes(r.team)&&typeof r.rotation==='boolean'&&Array.isArray(r.maps)&&r.maps.length>0&&r.maps.length<=8&&r.maps.every(id=>root.DeadwatchCore.ARENAS.some(a=>a.id===id))&&r.cleared.length<=5&&r.cleared.every(n=>integer(n,5)&&n>0);
 }
 function normalize(raw){
  if(!raw||![1,2,3,4].includes(raw.version)||!integer(raw.xp)||!integer(raw.credits)||!Array.isArray(raw.owned)||raw.owned.length>4||!raw.owned.every(id=>SKINS.some(s=>s.id===id))||!raw.owned.includes('field')||!raw.owned.includes(raw.selected))throw Error('Invalid profile.');
  if(!Array.isArray(raw.milestones)||raw.milestones.length>4||!raw.milestones.every(n=>MILESTONES.some(m=>m.wave===n)))throw Error('Invalid milestones.');
  const stats={};for(const key of Object.keys(fresh().stats)){if(!integer(raw.stats?.[key],key==='bestWave'?8:1e9))throw Error('Invalid stats.');stats[key]=raw.stats[key];}
  if(!Array.isArray(raw.applied)||raw.applied.length>64||!raw.applied.every(id=>typeof id==='string'&&id.length<=100))throw Error('Invalid run history.');
  if(raw.pending!==null&&!validRun(raw.pending))throw Error('Invalid run checkpoint.');
  const data={version:4,xp:raw.version===1?0:raw.xp,legacyXP:raw.version===1?raw.xp:raw.legacyXP||0,credits:raw.credits,owned:[...new Set(raw.owned)],selected:raw.selected,milestones:[...new Set(raw.milestones)],stats,applied:[...raw.applied],pending:raw.pending?clone(raw.pending):null,watch:newWatch()};
  if(raw.version>=2){const w=raw.watch;if(!w||!w.upgrades)throw Error('Missing Watch Rank.');let spent=0;
   if(raw.version===2)for(const id of ['medSpeed','dashRecovery','lureRecharge'])if(w.upgrades[id]!==0)throw Error('Invalid legacy upgrade.');
   for(const u of UPGRADES){const n=raw.version===2&&u.id==='dashSpeed'?0:w.upgrades[u.id];if(!integer(n,3))throw Error('Invalid upgrade.');data.watch.upgrades[u.id]=n;spent+=n;}
   if(!integer(w.points,24)||w.points+spent!==rank(data.xp).level-1)throw Error('Invalid upgrade points.');data.watch.points=w.points;
   for(const key of ['mapsCompleted','firstMaps']){if(!Array.isArray(w[key])||w[key].length>8||!w[key].every(id=>typeof id==='string'&&/^[a-z0-9_-]{1,40}$/.test(id)))throw Error('Invalid map history.');data.watch[key]=[...new Set(w[key])];}
   if(typeof w.firstCampaign!=='boolean'||!integer(w.campaignCompletions)||!integer(w.highestEndlessRound))throw Error('Invalid completion history.');
   Object.assign(data.watch,{firstCampaign:w.firstCampaign,campaignCompletions:w.campaignCompletions,highestEndlessRound:w.highestEndlessRound});
   if(!Array.isArray(w.awards)||w.awards.length>128||!w.awards.every(id=>typeof id==='string'&&id.length<130))throw Error('Invalid reward history.');data.watch.awards=[...w.awards];
  }
  if(raw.version>=4){const records=raw.watch.endlessRecords;
   if(!records||!['solo','teammate','rotation'].every(k=>integer(records[k]))||!records.maps||typeof records.maps!=='object'||Array.isArray(records.maps)||Object.keys(records.maps).length>8||!Object.entries(records.maps).every(([id,n])=>root.DeadwatchCore.ARENAS.some(a=>a.id===id)&&integer(n)))throw Error('Invalid Endless records.');
   data.watch.endlessRecords=clone(records);
  }
  syncRank(data);return data;
 }
 class Store{
  constructor(storage){this.storage=storage;this.data=fresh();this.saved=false;this.blocked=false;this.notice='';
   try{const text=storage?.getItem(KEY);this.unreadSave=text||null;if(text){const raw=JSON.parse(text);this.data=normalize(raw);this.saved=true;if(raw.version<4){const backup=(raw.version===3?'deadwatch.profile.pre-replay-v':'deadwatch.profile.pre-watch-v')+raw.version;if(!storage.getItem(backup))storage.setItem(backup,text);this.migrated=true;this.save();}}}
   catch(_){this.blocked=true;this.notice='Save could not be read or backed up. Export it before importing a valid profile.';}
  }
  save(){if(this.blocked)return false;syncRank(this.data);try{if(!this.storage)throw Error();this.storage.setItem(KEY,JSON.stringify(this.data));this.saved=true;this.notice='';return true;}catch(_){this.saved=false;this.notice='Browser save unavailable. Export your profile to keep it.';return false;}}
  begin(game){if(game.replay)return this.beginReplay(game);return{id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),mode:game.mode,practice:!!game.godMode||game.mode!=='campaign',won:false,kills:0,seconds:0,score:0,wave:1,cleared:[],deaths:Array(8).fill(0),bankedXP:0,startRank:rank(this.data.xp).level};}
  update(run,game){if(!run||run.finished)return;if(run.mode==='quick'||run.mode==='endless')return this.updateReplay(run,game);run.won=run.won===true||game.status==='won';run.practice=run.practice||!!game.godMode||game.mode!=='campaign';run.kills=Math.max(0,Math.floor(game.stats?.kills||0));run.seconds=Math.max(0,Math.floor(game.time||0));run.score=Math.max(0,Math.floor(game.score||0));run.wave=Math.min(8,Math.max(1,(game.wave||0)+1));}
  track(run,game,event){
   if(run&&!run.finished&&(run.mode==='quick'||run.mode==='endless'))return this.trackReplay(run,game,event);
   if(!run||run.finished||!['life_lost','wave_clear','loot_start','won'].includes(event.type))return null;this.update(run,game);
   if(event.type==='life_lost'){run.deaths??=Array(8).fill(0);run.deaths[game.wave]++;this.checkpoint(run,game);return null;}
   if(!['wave_clear','loot_start','won'].includes(event.type))return null;
   const wave=event.type==='won'?8:Number(event.wave);
   if(!integer(wave,8)||wave<1||wave===8&&(event.type!=='won'||!event.evacuated||game.evac?.phase!=='complete'))return null;
   const key=run.id+':'+wave,w=this.data.watch;
   if(run.cleared.includes(wave)||w.awards.includes(key)||this.data.applied.includes(run.id))return null;
   run.cleared.push(wave);
   if(run.practice||this.blocked){this.checkpoint(run,game);return null;}
   const before=this.data.xp,mapId=game.arena?.id||'map-'+wave,lines=[{label:'Map '+wave+' clear',xp:MAP_XP[wave-1]}];
   if(!(run.deaths?.[wave-1]>0))lines.push({label:'No death',xp:50});
   if(!w.firstMaps.includes(mapId)){w.firstMaps.push(mapId);lines.push({label:'First map clear',xp:100});}
   if(!w.mapsCompleted.includes(mapId))w.mapsCompleted.push(mapId);
   if(wave===8&&run.cleared.length===8){lines.push({label:'Full campaign',xp:500});w.campaignCompletions++;if(!w.firstCampaign){w.firstCampaign=true;lines.push({label:'First full campaign',xp:500});}}
   const xp=lines.reduce((sum,item)=>sum+item.xp,0),previous=rank(before).level;this.data.xp+=xp;
   const after=syncRank(this.data),points=after.level-previous;w.points+=points;w.awards.push(key);w.awards=w.awards.slice(-128);run.bankedXP=(run.bankedXP||0)+xp;
   this.checkpoint(run,game);
   return{key,wave,map:game.arena?.name||'Campaign',lines,xp,before,after:this.data.xp,rankBefore:previous,rankAfter:after.level,points,saved:this.saved};
  }
  beginReplay(game){
   const r=game.replay,run={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),mode:game.mode,practice:!!game.godMode,won:false,kills:0,seconds:0,score:0,wave:1,cleared:[],bankedXP:0,startRank:rank(this.data.xp).level,completedRounds:0,bankedBlocks:0,deathCount:0,team:r.everTeammate?'teammate':'solo',rotation:r.rotation,maps:[...r.maps]};
   this.checkpoint(run,game);return run;
  }
  updateReplay(run,game){
   const r=game.replay;if(!r||run.mode!==game.mode){run.practice=true;return;}
   run.practice=run.practice||!!game.godMode;run.won=run.won||run.mode==='quick'&&r.completed===5;
   run.kills=Math.max(0,Math.floor(game.stats?.kills||0));run.seconds=Math.max(0,Math.floor(game.time||0));run.score=Math.max(0,Math.floor(game.score||0));run.wave=r.round;
   run.deathCount=Math.max(run.deathCount,game.lifeStats?.deaths||0);if(r.everTeammate)run.team='teammate';
   if(run.mode==='endless'&&!run.practice&&!this.blocked){
    const w=this.data.watch,records=w.endlessRecords,id=game.arena.id;
    records[run.team]=Math.max(records[run.team],r.round);records.maps[id]=Math.max(records.maps[id]||0,r.round);
    if(run.rotation)records.rotation=Math.max(records.rotation,r.round);
    w.highestEndlessRound=Math.max(w.highestEndlessRound,r.round);
   }
  }
  trackReplay(run,game,event){
   if(!['life_lost','defeat','replay_round_start','replay_round_clear'].includes(event.type))return null;
   this.update(run,game);
   if(event.type!=='replay_round_clear'){this.checkpoint(run,game);return null;}
   const round=event.round,r=game.replay;
   if(!integer(round)||round<1||round!==r.completed||round<=run.completedRounds)return null;
   run.completedRounds=round;if(run.mode==='quick')run.cleared.push(round);
   let lines,key;
   if(run.mode==='quick'&&round===5){key=run.id+':quick';lines=[{label:'Match complete',xp:175}];if(!run.deathCount)lines.push({label:'No death',xp:25});}
   else if(run.mode==='endless'&&round%5===0){const block=round/5;if(block<=run.bankedBlocks)return null;run.bankedBlocks=block;key=run.id+':block-'+block;lines=[{label:'Rounds '+(round-4)+'–'+round+' cleared',xp:250+75*(block-1)}];}
   if(!lines||run.practice||this.blocked||this.data.watch.awards.includes(key)||this.data.applied.includes(run.id)){this.checkpoint(run,game);return null;}
   const before=this.data.xp,previous=rank(before).level,xp=lines.reduce((sum,row)=>sum+row.xp,0),w=this.data.watch;
   this.data.xp+=xp;const after=syncRank(this.data),points=after.level-previous;w.points+=points;w.awards.push(key);w.awards=w.awards.slice(-128);run.bankedXP+=xp;
   this.checkpoint(run,game);
   return{key,mode:run.mode,wave:round,map:game.arena.name,lines,xp,before,after:this.data.xp,rankBefore:previous,rankAfter:after.level,points,saved:this.saved};
  }

  checkpoint(run,game){if(!run||run.finished)return;this.update(run,game);this.data.pending=run.practice?null:clone(run);this.save();}
  settle(run,game,reason='retired'){
   if(!run)return null;if(run.finished)return run.result;if(game)this.update(run,game);
   const result={id:run.id,reason,practice:run.practice,xp:run.bankedXP||0,credits:0,kills:run.kills,cleared:run.completedRounds??run.cleared.length,milestones:[],levelBefore:run.startRank||rank(this.data.xp).level,levelAfter:rank(this.data.xp).level,duplicate:false};run.finished=true;
   if(this.data.applied.includes(run.id)){result.duplicate=true;run.result=result;if(this.data.pending?.id===run.id){this.data.pending=null;this.save();}return result;}
   if(!run.practice&&(run.kills>0||run.seconds>0||run.cleared.length||run.completedRounds>0)){
    const victory=run.won===true;result.credits=run.kills+result.cleared*20+(victory?75:0);
    for(const m of MILESTONES)if(run.mode==='campaign'&&run.cleared.includes(m.wave)&&!this.data.milestones.includes(m.wave)){this.data.milestones.push(m.wave);result.milestones.push(m.wave);result.credits+=m.credits;}
    this.data.credits+=result.credits;const stats=this.data.stats;stats.runs++;stats.kills+=run.kills;stats.seconds+=run.seconds;stats.wins+=Number(victory);if(run.mode==='campaign')stats.bestWave=Math.max(stats.bestWave,run.wave);stats.bestScore=Math.max(stats.bestScore,run.score);
    this.data.applied.push(run.id);this.data.applied=this.data.applied.slice(-64);
   }
   if(this.data.pending?.id===run.id)this.data.pending=null;run.result=result;this.save();return result;
  }
  recover(){const run=this.data.pending;if(!run)return null;return this.settle(run,null,'recovered');}
  purchase(id){const u=UPGRADES.find(u=>u.id===id),w=this.data.watch;if(!u||u.pending||this.blocked||w.points<1||w.upgrades[id]>=3)return{ok:false,message:'Upgrade unavailable.'};w.upgrades[id]++;w.points--;this.save();return{ok:true,message:u.name+' · TIER '+['','I','II','III'][w.upgrades[id]]};}
  equip(id){const skin=SKINS.find(s=>s.id===id);if(!skin)return{ok:false,message:'Unknown uniform.'};
   if(!this.data.owned.includes(id)){if(rank(this.data.xp).level<skin.level)return{ok:false,message:'Reach Watch Rank '+skin.level+' first.'};if(this.data.credits<skin.cost)return{ok:false,message:'Not enough credits.'};this.data.credits-=skin.cost;this.data.owned.push(id);}
   this.data.selected=id;this.save();return{ok:true,message:skin.name.toUpperCase()+' EQUIPPED'};
  }
  exportJSON(){if(this.blocked&&this.unreadSave)return this.unreadSave;const data=clone(this.data);data.pending=null;return JSON.stringify({schema:SCHEMA,version:4,profile:data},null,2);}
  parseImport(text){if(text.length>262144)throw Error('Profile file is too large.');const file=JSON.parse(text);if(file.schema!==SCHEMA||![1,2,3,4].includes(file.version))throw Error('Not a Deadwatch profile.');const data=normalize(file.profile);data.pending=null;return data;}
  importProfile(data){this.data=normalize(data);this.data.pending=null;this.blocked=false;this.save();}
 }
 root.DeadwatchProgression={Store,SKINS,MILESTONES,UPGRADES,PERKS,MAP_XP,rank,KEY};
})(typeof globalThis!=='undefined'?globalThis:this);

/* Memorial-only grave entrances. Borrow scheduled walkers; never add to the horde budget. */
(function(root){'use strict';
 const C=root.DeadwatchCore;
 const plots=Object.freeze([[345,425],[345,610],[1095,425],[1095,610],[610,240],[830,240],[615,790],[835,790]].map(([x,y],id)=>Object.freeze({id,x,y})));
 const rules=Object.freeze({warning:2.15,rise:1.10,minimum:C.RULES.spawnMinimum,interval:7,intervalJitter:5,reuse:25});
 class MemorialGame extends C.Game{
  applyArena(wave){const out=super.applyArena(wave);this.graveyard=this.arena?.id==='memorial'?{seed:(this.seed^Math.imul(wave+1,0x45d9f3b))>>>0,nextAt:this.time+(this.mode==='range'?1.5:5),used:[],scars:[],risen:0}:null;return out;}
  graveRandom(){const s=this.graveyard;s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
  graveSafe(q,ignore=null,selecting=false){
   if(!this.validPosition(q,22)||C.distance(q,this.player)<rules.minimum+(selecting?35:0))return false;
   if(selecting&&C.distance(q,this.player)>580)return false;
   if((this.squad||[]).some(b=>!b.down&&b.hp>0&&C.distance(q,b)<rules.minimum))return false;
   return !this.zombies.some(z=>!z.dead&&C.distance(q,z)<58)&&!this.warnings.some(w=>w!==ignore&&C.distance(q,w)<64);
  }
  director(dt){
   if(this.arena?.id!=='memorial'||!this.graveyard)return super.director(dt);
   const s=this.graveyard;
   // A player who approaches the warning redirects it to an ordinary entrance.
   for(const w of this.warnings)if(w.graveId!==undefined&&!this.graveSafe(w,w)){
    Object.assign(w,this.spawnPoint());delete w.graveId;delete w.graveTotal;w.left=Math.max(w.left,1.0);
   }
   const previous=new Set(this.warnings),eventStart=this.events.length,out=super.director(dt);
   if(this.status!=='playing'||this.time<s.nextAt||this.warnings.some(w=>w.graveId!==undefined))return out;
   const w=this.warnings.find(w=>!previous.has(w)&&w.kind==='walker');if(!w)return out;
   const choices=plots.filter(q=>(s.used[q.id]??-Infinity)+rules.reuse<=this.time&&this.graveSafe(q,w,true));
   if(!choices.length){s.nextAt=this.time+1.5;return out;}
   const q=choices[Math.floor(this.graveRandom()*choices.length)],old={x:w.x,y:w.y};
   Object.assign(w,{x:q.x,y:q.y,graveId:q.id,graveTotal:rules.warning,left:rules.warning});
   const event=this.events.slice(eventStart).find(e=>e.type==='spawn_warning'&&e.kind===w.kind&&e.x===old.x&&e.y===old.y&&e.graveId===undefined);
   if(event)Object.assign(event,{x:q.x,y:q.y,graveId:q.id,warning:rules.warning});
   s.used[q.id]=this.time;s.nextAt=this.time+rules.interval+this.graveRandom()*rules.intervalJitter;
   return out;
  }
  spawnZombie(kind,x,y){
   const w=this.arena?.id==='memorial'?this.warnings.find(w=>w.graveId!==undefined&&w.kind===kind&&w.x===x&&w.y===y&&w.left<=0):null;
   const z=super.spawnZombie(kind,x,y);
   if(w&&z){z.graveId=w.graveId;z.graveRise=z.graveTotal=rules.rise;z.cooldown=rules.rise+.6;z.contactPlayer=false;this.graveyard.scars[w.graveId]=this.time;this.graveyard.risen++;
    const event=this.events.findLast(e=>e.type==='spawn'&&e.id===z.id);if(event)event.graveId=w.graveId;
   }
   return z;
  }
  updateZombie(z,dt){
   if(this.arena?.id==='memorial'&&!z.dead&&z.graveRise>0){
    z.graveRise=Math.max(0,z.graveRise-dt);z.flash=Math.max(0,z.flash-dt);z.cooldown=Math.max(.6,z.cooldown-dt);z.contactPlayer=false;z.attack=null;return;
   }
   return super.updateZombie(z,dt);
  }
 }
 root.DeadwatchCore={...C,Game:MemorialGame,MEMORIAL_GRAVES:plots,MEMORIAL_GRAVE_RULES:rules};
})(typeof globalThis!=='undefined'?globalThis:this);

/* .147 COLD SNAP: Cold Storage's player-operated refrigeration emergency. */
(function(root){'use strict';
 const C=root.DeadwatchCore;
 const R=Object.freeze({duration:7,recharge:45,freeze:2.4,valveDuration:2.5,valveRecharge:22,doorHold:10,
  panel:{x:821,y:654},breach:{x:851.1,y:370},breachWake:.15,breachGap:.30,breachHealth:1.75,
  doors:[{x:520,y:297,w:140,h:16},{x:920,y:297,w:140,h:16}],
  zones:[{x:370,y:350,w:205,h:195,vx:450,vy:356},{x:885,y:350,w:210,h:195,vx:990,vy:356},{x:540,y:557,w:260,h:114,vx:670,vy:675}],
  valves:[{x:450,y:365},{x:990,y:365}],forklift:{x:1280,y:595,w:58,h:61},pallet:{x:1263,y:522,w:90,h:82},forkControl:{x:1360,y:643}});
 const inRect=(p,r,pad=0)=>p.x>r.x-pad&&p.x<r.x+r.w+pad&&p.y>r.y-pad&&p.y<r.y+r.h+pad;
 function coldSnapPhase(s,time){
  const age=s?.running?Math.max(0,time-s.started):-1,active=age>=0&&age<R.duration;
  const mist=active?C.clamp((age-1.25)/.8,0,1)*C.clamp((7-age)/1.1,0,1):0;
  return{age,active,mist,frost:active?C.clamp((age-1.2)/1.8,0,1)*C.clamp((7-age)/.85,0,1):0,
   blackout:active&&age<.20,alarm:active&&age>=.20,pulse:.22+.78*Math.pow(.5+.5*Math.sin(Math.max(0,age)*Math.PI*3),6),
   fan:active?(age<.2?0:age<1.6?1+4*(age-.2)/1.4:age<5.8?5:5*(7-age)/1.2):1,
   label:!active?'':age<1.25?'WARNING — REFRIGERATION PURGE':age<5.8?'COLD SNAP · FREEZE ZONES ACTIVE':'SYSTEM OVERLOAD · VENTING'};
 }
 class ColdSnapGame extends C.Game{
  applyArena(wave){
   this.coldSnap=null;const out=super.applyArena(wave);
   this.stations=this.stations.filter(s=>!s.kind?.startsWith('cold-'));
   if(this.arena?.id!=='cold')return out;
   this.coldSnap={started:-1,running:false,readyAt:0,uses:0,cue:0,fanTime:0,powerAt:this.power?this.time:-999,hadPower:!!this.power,
    doors:R.doors.map(()=>({open:1,target:1,closed:false,closeAt:0,until:0})),valves:R.valves.map(()=>({until:0,readyAt:0})),
    pallet:{phase:'ready',at:0},breach:{phase:'sealed',at:0,cargo:[],nextAt:0,spawned:0,hintAt:0},shards:[]};
   this.stations.push({id:'cold-snap',kind:'cold-panel',name:'COLD SNAP',...R.panel,powered:true});
   R.doors.forEach((q,i)=>{for(const side of [-1,1])this.stations.push({id:'cold-door-'+i+'-'+side,kind:'cold-door',door:i,name:'Freezer shutter '+(i+1),x:q.x+q.w/2,y:q.y+q.h/2+side*66,powered:true});});
   this.stations.push({id:'cold-forklift',kind:'cold-forklift',name:'Drop pallet stack',...R.forkControl,powered:false});
   this.coldRebuildBarriers();return out;
  }
  coldRebuildBarriers(){
   const c=this.coldSnap;if(!c)return;
   const barriers=[{...R.forklift,coldBarrier:'forklift'}];
   c.doors.forEach((d,i)=>{if(d.closed)barriers.push({...R.doors[i],coldBarrier:'door-'+i});});
   if(c.pallet.phase==='down')barriers.push({...R.pallet,coldBarrier:'pallet'});
   this.obstacles=[...this.obstacles.filter(o=>!o.coldBarrier),...barriers];this.navGraphs=new Map();this.navObstacles=null;
   for(const a of [this.player,...this.zombies,...(this.squad||[]),this.reinforcement].filter(Boolean)){a.navPath=null;a.navGoal=null;a.navUntil=0;delete a.flank;}
  }
  coldDoorOccupied(i){const r=R.doors[i];return [...this.combatActors(),...this.zombies].some(a=>a&&!a.dead&&!a.down&&inRect(a,r,(a.r||16)+8));}
  coldDoor(i,close,automatic=false){
   const c=this.coldSnap,d=c?.doors[i];if(!d)return false;
   if(close&&this.coldDoorOccupied(i))return false;
   d.target=close?0:1;d.closeAt=this.time+.68;d.until=close?this.time+R.doorHold:0;
   if(!close&&d.closed){d.closed=false;this.coldRebuildBarriers();}
   this.emit('cold_door',{door:i,close,automatic,x:R.doors[i].x+70,y:305});return true;
  }
  stationOffer(s){
   if(!s.kind?.startsWith('cold-')||!this.coldSnap)return super.stationOffer(s);
   const c=this.coldSnap,o={id:s.id,x:s.x,y:s.y,kind:s.kind,title:s.name,detail:'',action:s.kind,cost:0,duration:.45,enabled:true,reason:''};
   if(s.kind==='cold-panel'){
    o.title='Activate COLD SNAP';o.duration=.8;o.detail='7-second purge · marked zones freeze enemies · 45s recharge';
    if(!this.power)o.reason='RESTORE GENERATOR POWER';else if(c.running)o.reason='REFRIGERATION PURGE ACTIVE';else if(c.breach.cargo.length)o.reason='FREEZER BREACH IN PROGRESS';else if(this.time<c.readyAt)o.reason='REPRESSURIZING · '+Math.ceil(c.readyAt-this.time)+'s';
   }else if(s.kind==='cold-door'){
    const d=c.doors[s.door],closing=d.target>0;o.title=(closing?'Close':'Open')+' freezer shutter '+(s.door+1);o.detail='Redirect the horde · opens automatically after 10s';o.duration=.28;
    if(!this.power)o.reason='POWER REQUIRED';else if(c.running)o.reason='EMERGENCY OVERRIDE';else if(closing&&this.coldDoorOccupied(s.door))o.reason='DOORWAY OCCUPIED';
   }else{
    o.title='Drop forklift pallet stack';o.detail='Crush / stun heavies · 0.7s drop · debris blocks 9s · one use';o.duration=.22;
    if(c.pallet.phase!=='ready')o.reason='PALLETS RELEASED';else if(this.combatActors().some(a=>!a.down&&inRect(a,R.pallet,(a.r||16)+12)))o.reason='CLEAR THE DROP ZONE';
   }
   o.enabled=!o.reason;return o;
  }
  completeInteraction(id){
   if(!id.startsWith('cold-'))return super.completeInteraction(id);
   const offer=this.interactionOffer(),c=this.coldSnap;if(!c||!offer||offer.id!==id||!offer.enabled)return false;
   const station=this.stations.find(s=>s.id===id);
   if(id==='cold-snap'){
    c.started=this.time;c.running=true;c.readyAt=this.time+R.duration+R.recharge;c.uses++;c.cue=0;
    if(c.uses===1&&c.breach.phase==='sealed'){c.breach.phase='waiting';c.breach.at=this.time;c.breach.cargo=['brute','walker','walker','walker'];c.breach.nextAt=this.time+9.2;}
    this.emit('cold_warning',{...R.panel,first:c.uses===1});
   }else if(station.kind==='cold-door'){if(!this.coldDoor(station.door,c.doors[station.door].target>0))return false;}
   else{c.pallet.phase='warning';c.pallet.at=this.time;this.emit('cold_pallet_warning',{x:R.pallet.x+45,y:R.pallet.y+41});}
   this.depotStats.interactions++;return true;
  }
  emit(type,data={}){
   super.emit(type,data);
   if(!this.coldSnap||this.arena?.id!=='cold'||!['shot','special_shot','squad_shot'].includes(type))return;
   for(const path of data.paths||[]){
    const dx=path.b.x-path.a.x,dy=path.b.y-path.a.y,len=Math.hypot(dx,dy);if(len<.01)continue;
    R.valves.forEach((q,i)=>{const v=this.coldSnap.valves[i];if(this.time<v.readyAt)return;
     const d=C.rayCircle(path.a,{x:dx/len,y:dy/len},q,15,len);
     if(Number.isFinite(d)&&this.clearRoute(path.a,q)){v.until=this.time+R.valveDuration;v.readyAt=this.time+R.valveRecharge;this.emit('cold_valve',{...q,valve:i});}
    });
   }
  }
  updateDevices(dt){super.updateDevices(dt);if(this.coldSnap)this.updateColdSnap(dt);}
  updateColdSnap(dt){
   const c=this.coldSnap,t=this.time;if(!c||this.status!=='playing')return;
   if(this.power&&!c.hadPower){c.powerAt=t;this.emit('cold_restart',{initial:true});}c.hadPower=!!this.power;
   const phase=coldSnapPhase(c,t),a=phase.age;
   const fan=this.power?phase.active?phase.fan:C.clamp((t-c.powerAt)/1.15,0,1):0;c.fanTime+=dt*fan;
   if(c.running){
    const cues=[[.32,'cold_lock'],[1.25,'cold_purge'],[5.8,'cold_overload'],[7,'cold_restart']];
    while(c.cue<cues.length&&a>=cues[c.cue][0]){const name=cues[c.cue++][1];
     if(name==='cold_lock')c.doors.forEach((_,i)=>this.coldDoor(i,true,true));
     if(name==='cold_overload')c.doors.forEach((_,i)=>this.coldDoor(i,false,true));
     if(name==='cold_restart'){c.running=false;c.powerAt=t;}
     this.emit(name,{...R.panel});
    }
   }
   c.doors.forEach((d,i)=>{
    if(d.target===0&&!d.closed&&this.coldDoorOccupied(i)){d.target=1;d.until=0;this.emit('cold_door_blocked',{door:i});}
    const step=dt*2.1;d.open=C.clamp(d.open+(d.target>d.open?step:d.target<d.open?-step:0),0,1);
    if(d.target===0&&!d.closed&&t>=d.closeAt){d.closed=true;d.open=0;this.coldRebuildBarriers();}
    if(d.closed&&t>=d.until)this.coldDoor(i,false,true);
   });
   const p=c.pallet;
   if(p.phase==='warning'&&t-p.at>=.7){
    if(this.combatActors().some(a=>!a.down&&inRect(a,R.pallet,(a.r||16)+12))){p.phase='ready';this.emit('cold_pallet_cancel',{});}
    else{p.phase='down';p.at=t;
     for(const z of this.zombies)if(!z.dead&&inRect(z,R.pallet,z.r)){this.damageZombie(z,z.boss?z.maxHp*.2:z.kind==='brute'?z.maxHp*.7:z.hp+1);if(!z.dead&&z.kind==='brute'){z.coldFight={phase:'stunned',left:2.6,cycle:0};z.attack=null;z.contactPlayer=false;}}
     this.coldRebuildBarriers();for(const z of this.zombies)if(!z.dead&&inRect(z,R.pallet,z.r))this.resolveWalls(z);
     this.emit('cold_pallet_drop',{x:R.pallet.x+45,y:R.pallet.y+41});
    }
   }else if(p.phase==='down'&&t-p.at>=9){p.phase='spent';this.coldRebuildBarriers();this.emit('cold_pallet_clear',{});}
   const b=c.breach,age=t-b.at;
   if(b.phase==='waiting'&&age>=7.65){b.phase='knock1';this.emit('cold_knock',{...R.breach,beat:1});}
   if(b.phase==='knock1'&&age>=8.4){b.phase='knock2';this.emit('cold_knock',{...R.breach,beat:2});}
   if(b.phase==='knock2'&&age>=9.2){b.phase='broken';this.emit('cold_breach',{...R.breach});}
   c.shards=c.shards.filter(s=>t-s.at<.85);
  }
  coldInVapor(z){
   const c=this.coldSnap;if(!c)return false;const p=coldSnapPhase(c,this.time);
   if(p.active&&p.age>=1.25&&p.age<5.8&&R.zones.some(r=>inRect(z,r)&&this.clearRoute({x:r.vx,y:r.vy},z)))return true;
   return R.valves.some((q,i)=>c.valves[i].until>this.time&&C.distance(q,z)<92&&this.clearRoute(q,z));
  }
  updateZombie(z,dt){
   if(!this.coldSnap||z.dead)return super.updateZombie(z,dt);
   if((z.coldWakeUntil||0)>this.time){z.contactPlayer=false;z.attack=null;z.cooldown=Math.max(z.cooldown,.65);return;}
   const vapor=this.coldInVapor(z);z.coldExposure=vapor?Math.min(1,(z.coldExposure||0)+dt):Math.max(0,(z.coldExposure||0)-dt*2);
   if(vapor){z.coldSlowUntil=this.time+1.1;z.coldCoatUntil=this.time+4;if(z.kind!=='brute'&&!z.boss&&z.coldExposure>=.4)z.coldFrozenUntil=this.time+R.freeze;}
   if((z.coldFrozenUntil||0)>this.time){z.contactPlayer=false;z.attack=null;z.cooldown=Math.max(.65,z.cooldown);z.flash=Math.max(0,z.flash-dt);return;}
   const speed=z.speed;
   if((z.coldSlowUntil||0)>this.time)z.speed*=z.kind==='brute'?.28:.35;
   try{if(z.kind==='brute'&&!z.boss&&this.updateColdBrute(z,dt))return;return super.updateZombie(z,dt);}finally{z.speed=speed;}
  }
  damageZombie(z,amount){
   const frozen=!!this.coldSnap&&!z.dead&&(z.coldFrozenUntil||0)>this.time&&amount>0;
   const first=this.events.length,out=super.damageZombie(z,frozen?Math.max(amount,z.hp+1):amount);
   if(frozen)for(let i=first;i<this.events.length;i++)if(['hit','kill'].includes(this.events[i].type)&&this.events[i].id===z.id)this.events[i].coldShatter=true;
   if(frozen&&z.dead){z.coldShattered=true;this.coldSnap.shards.push({x:z.x,y:z.y,at:this.time,id:z.id});if(this.coldSnap.shards.length>24)this.coldSnap.shards.shift();this.emit('cold_shatter',{id:z.id,x:z.x,y:z.y});}
   return out;
  }
  roundSpawnPlan(cfg){const p=super.roundSpawnPlan(cfg),c=this.coldSnap;if(c&&(c.running||c.breach.cargo.length))return{...p,cap:this.mode==='range'?6:p.cap,resting:true};return p;}
  director(dt){
   const c=this.coldSnap;if(!c)return super.director(dt);
   const b=c.breach;
   if(b.phase==='broken'&&b.cargo.length&&this.time>=b.nextAt){
    const cap=this.mode==='range'?6:this.roundPace?.cap||C.PRESSURE_WAVES[this.wave].cap,q={...R.breach};
    const clear=this.validPosition(q,25)&&this.combatActors().every(a=>a.down||C.distance(a,q)>115)&&this.zombies.every(z=>z.dead||C.distance(z,q)>53);
    if(clear&&this.zombies.filter(z=>!z.dead).length+this.warnings.length<cap){
     const z=this.spawnZombie(b.cargo.shift(),q.x,q.y);z.maxHp*=R.breachHealth;z.hp=z.maxHp;z.coldWakeUntil=this.time+R.breachWake;z.coldCoatUntil=this.time+18;z.cooldown=1.2;z.coldBreach=true;b.spawned++;b.nextAt=this.time+R.breachGap;
    }else{b.nextAt=this.time+.2;if(!clear&&this.combatActors().some(a=>!a.down&&C.distance(a,q)<=115)&&this.time>=b.hintAt){b.hintAt=this.time+3;this.emit('cold_breach_blocked',{});}}
   }
   return super.director(dt);
  }
  completeWave(){if(this.coldSnap&&(this.coldSnap.running||this.coldSnap.breach.cargo.length))return;const out=super.completeWave();if(this.coldSnap){this.coldSnap.doors.forEach(d=>{d.closed=false;d.target=d.open=1;});if(this.coldSnap.pallet.phase==='down')this.coldSnap.pallet.phase='spent';this.coldRebuildBarriers();}return out;}
  export(){const out=super.export();return this.coldSnap?{...out,coldSnap:JSON.parse(JSON.stringify(this.coldSnap))}:out;}
 }
 root.DeadwatchCore={...C,Game:ColdSnapGame,COLD_SNAP_RULES:R,coldSnapPhase};
})(typeof globalThis!=='undefined'?globalThis:this);

// .148: skill movement, committed distractions and saved repair work.
(function(root){'use strict';
 const C=root.DeadwatchCore,R=Object.freeze({dashDuration:.22,dashDistance:100,dashRecharge:1.75,dashGrace:.12,ghostDepth:68,perfectRecovery:.45,lureRadius:360,lureDuration:8,repairHold:1.35,repairAmount:450,repairCooldown:8});
 const inside=(p,r,pad=0)=>p.x>=r.x-pad&&p.x<=r.x+r.w+pad&&p.y>=r.y-pad&&p.y<=r.y+r.h+pad;
 class FairSurvivalGame extends C.Game{
  applyArena(wave){const out=super.applyArena(wave);this.lurePreview=null;
   if(this.player)Object.assign(this.player,{roll:0,rollCooldown:0,dashUntil:0,dashGraceUntil:0,dashGhostIds:[],perfectUntil:0});
   if(this.evac){this.evac.repairNodes=[{id:'evac-north',name:'PORT',x:706,y:460},{id:'evac-south',name:'STARBOARD',x:706,y:580},{id:'evac-nose',name:'NOSE',x:842,y:555}].map(n=>({...n,progress:0,readyAt:0,completed:0}));
    this.stations=this.stations.filter(s=>s.kind!=='evac');for(const n of this.evac.repairNodes)this.stations.push({id:n.id,kind:'evac',name:n.name+' REPAIR',x:n.x,y:n.y,powered:false});
   }return out;
  }
  roll(move={x:0,y:0}){
   const p=this.player;if(this.status!=='playing'||p.roll>0||p.rollCooldown>0||this.arcade?.vehicle||this.panic?.boostLeft>0)return false;
   const heading=Math.hypot(move.x,move.y)>.1?Math.atan2(move.y,move.x):p.wanted,dx=Math.cos(heading),dy=Math.sin(heading),intervals=[];
   for(const z of this.zombies){if(z.dead)continue;const x=z.x-p.x,y=z.y-p.y,t=x*dx+y*dy,r=p.r+z.r*.84,side=x*dy-y*dx;if(Math.abs(side)>=r)continue;const half=Math.sqrt(r*r-side*side),near=Math.max(0,t-half),far=t+half;if(far>0&&near<R.dashDistance)intervals.push({z,near,far});}
   intervals.sort((a,b)=>a.near-b.near);const layer=[];let far=intervals[0]?.far||0;
   for(const hit of intervals){if(layer.length&&hit.near>far+5)break;layer.push(hit);far=Math.max(far,hit.far);}
   const thin=layer.length&&far-layer[0].near<=R.ghostDepth&&layer.every(h=>h.z.kind!=='brute'&&!h.z.boss);
   Object.assign(p,{roll:R.dashDuration,rollCooldown:R.dashRecharge,rollHeading:heading,dashUntil:this.time+R.dashDuration,dashGraceUntil:this.time+R.dashGrace,dashStarted:this.time,dashEligible:p.hurtGrace<=0&&!(this.respawnShield>0),dashPerfect:false,dashGhostIds:thin?layer.map(h=>h.z.id):[],reload:null});
   p.hurtGrace=Math.max(p.hurtGrace,R.dashGrace);this.stats.rolls++;this.emit('roll',{x:p.x,y:p.y,heading,dash:true});return true;
  }
  dashGhosts(z){return this.player?.dashUntil>this.time&&this.player.dashGhostIds?.includes(z.id);}
  movePlayer(dt){
   const p=this.player;if(this.arcade?.vehicle){p.x+=p.vx*dt;p.y+=p.vy*dt;this.resolveWalls(p);return;}
   const length=Math.hypot(p.vx,p.vy)*dt,steps=Math.max(1,Math.ceil(length/4)),dx=p.vx*dt/steps,dy=p.vy*dt/steps;
   for(let i=0;i<steps;i++){
    const old={x:p.x,y:p.y},next={...p,x:p.x+dx,y:p.y+dy};this.resolveWalls(next);
    // Preserve tangential travel at fences. A straight push into a wall never invents a direction.
    const blockedX=Math.abs(next.x-old.x-dx)>.01,blockedY=Math.abs(next.y-old.y-dy)>.01;
    if(blockedX&&!blockedY&&Math.abs(dy)>.1){next.y=old.y+Math.sign(dy)*Math.hypot(dx,dy);this.resolveWalls(next);}
    else if(blockedY&&!blockedX&&Math.abs(dx)>.1){next.x=old.x+Math.sign(dx)*Math.hypot(dx,dy);this.resolveWalls(next);}
    if(p.dashUntil>this.time){
     const obstruction=this.zombies.find(z=>!z.dead&&!this.dashGhosts(z)&&C.distance(next,z)<p.r+z.r*.84&&C.distance(next,z)<C.distance(old,z)-.01);
     if(obstruction){p.roll=0;p.dashUntil=this.time;p.vx=p.vy=0;break;}
    }
    p.x=next.x;p.y=next.y;p.groundHeight=next.groundHeight;
   }
  }
  damagePlayer(amount,from){
   const p=this.player;
   if(amount>0&&!this.godMode&&!this.arcade?.vehicle&&p?.dashEligible&&p.dashGraceUntil>this.time&&!p.dashPerfect&&/^(walker|runner|brute|Breaker (charge|slam)|Cold brute (charge|slam))$/.test(from||'')){
    p.dashPerfect=true;p.rollCooldown=Math.max(.3,p.rollCooldown-R.perfectRecovery);p.perfectUntil=this.time+.45;this.emit('perfect_dash',{x:p.x,y:p.y});
   }
   return super.damagePlayer(amount,from);
  }
  zombieDecoy(z){
   if(z.boss)return null;
   let d=this.decoys.find(d=>d.id===z.lureId&&d.left>0&&this.time>=d.landAt);
   if(d&&z.kind==='brute'&&this.time>=z.lureHeavyUntil)return null;
   if(d)return d;
   if(this.time<(z.lureCheckAt||0))return null;z.lureCheckAt=this.time+.18;
   d=this.decoys.filter(d=>d.left>0&&this.time>=d.landAt&&C.distance(z,d)<=d.radius&&!(z.kind==='brute'&&z.lureIgnored===d.id)).sort((a,b)=>b.id-a.id)[0];
   if(d){z.lureId=d.id;z.attack=null;z.navPath=null;delete z.flank;delete z.chaseSince;if(z.kind==='brute'){z.lureHeavyUntil=this.time+.65;z.lureIgnored=d.id;}}
   return d||null;
  }
  updateColdBrute(z,dt){
   const f=z.coldFight||(z.coldFight={phase:'hunt',left:1.1,cycle:0}),actor=this.zombieTarget(z);z.contactPlayer=false;z.attack=null;z.flash=Math.max(0,z.flash-dt);z.cooldown=Math.max(.2,z.cooldown-dt);f.left=Math.max(0,f.left-dt);
   const recover=(duration,reason)=>{f.phase=reason==='pallet'?'stunned':'recover';f.left=duration;f.charge=null;this.emit('cold_brute_recover',{id:z.id,x:z.x,y:z.y,reason});};
   if(f.phase==='recover'||f.phase==='stunned'){if(f.left<=0){f.phase='hunt';f.left=.8;}return true;}
   if(f.phase==='windup'){if(f.left<=0){f.phase='charge';this.emit('cold_brute_charge',{id:z.id,x:z.x,y:z.y});}return true;}
   if(f.phase==='slam'){
    if(f.left<=0){for(const a of this.combatActors())if(!a.down&&C.distance(z,a)<90+a.r&&this.clearRoute(z,a))this.damageActor(a,26,'Cold brute slam');this.emit('cold_brute_slam',{id:z.id,x:z.x,y:z.y,radius:90});recover(1.6,'slam');}return true;
   }
   if(f.phase==='charge'){
    const c=f.charge;if(!c){recover(1.6,'wall');return true;}let travel=Math.min(c.remaining,350*dt*(z.coldSlowUntil>this.time?.28:1));
    while(travel>0){const step=Math.min(5,travel),q={x:z.x+c.dx*step,y:z.y+c.dy*step};
     for(let i=0;i<this.coldSnap.doors.length;i++)if(this.coldSnap.doors[i].closed&&inside(q,C.COLD_SNAP_RULES.doors[i],z.r+2)){this.coldDoor(i,false,true);this.emit('cold_brute_smash',{x:q.x,y:q.y});}
     if(this.coldSnap.pallet.phase==='down'&&inside(q,C.COLD_SNAP_RULES.pallet,z.r+2)){this.coldSnap.pallet.phase='spent';this.coldRebuildBarriers();this.emit('cold_brute_smash',{x:q.x,y:q.y});recover(1.8,'pallet wreck');return true;}
     if(!this.validPosition(q,z.r)||!this.clearRoute(z,q,z.r-.25)){recover(2.0,'wall');return true;}
     z.x=q.x;z.y=q.y;z.step+=step*.07;c.remaining-=step;travel-=step;
     const hit=this.combatActors().find(a=>!a.down&&C.distance(z,a)<z.r+a.r&&this.clearRoute(z,a));
     if(hit){this.damageActor(hit,30,'Cold brute charge');recover(1.4,'charge');return true;}
    }if(c.remaining<=.01)recover(1.45,'miss');return true;
   }
   const lure=this.zombieDecoy(z),goal=lure||actor,d=C.distance(z,goal);
   if(!lure&&f.left<=0&&this.clearRoute(z,actor)){
    if(d<105){f.phase='slam';f.left=.9;z.aim=C.angleTo(z,actor);this.emit('cold_brute_slam_warning',{id:z.id,x:z.x,y:z.y,radius:90});return true;}
    if(d<390&&this.clearRoute(z,actor,z.r)){const a=C.angleTo(z,actor),length=Math.min(330,d+65);z.aim=a;f.phase='windup';f.left=.95;f.charge={x:z.x,y:z.y,dx:Math.cos(a),dy:Math.sin(a),length,remaining:length};f.cycle++;this.emit('cold_brute_windup',{id:z.id,x:z.x,y:z.y});return true;}
   }
   const q=this.waypoint(z,goal);if(q&&d>z.r+(lure?12:actor.r)+6){const a=C.angleTo(z,q),step=Math.min(z.speed*dt*(lure?.55:1),C.distance(z,q));z.aim=C.turn(z.aim,a,dt*3);z.x+=Math.cos(a)*step;z.y+=Math.sin(a)*step;z.step+=step*.07;this.resolveWalls(z);}return true;
  }
  shoot(){const previous=this.fairShotActor;this.fairShotActor=this.player;try{return super.shoot();}finally{this.fairShotActor=previous;}}
  specialHitscan(...args){const previous=this.fairShotActor;this.fairShotActor=args[6]||this.player;try{return super.specialHitscan(...args);}finally{this.fairShotActor=previous;}}
  damageZombie(z,amount){
   if(amount>0&&!z.dead&&z.coldFight&&this.fairShotActor&&['recover','stunned'].includes(z.coldFight.phase)){
    const a=C.angleTo(z,this.fairShotActor),rear=Math.cos(a-z.aim)<-.2;
    if(rear||z.coldFight.phase==='stunned'){amount*=2.2;this.emit('cold_brute_weakpoint',{id:z.id,x:z.x,y:z.y});}
   }return super.damageZombie(z,amount);
  }
  stationOffer(s){
   if(s.kind!=='evac'||!this.evac?.repairNodes)return super.stationOffer(s);
   if(this.evac.phase!=='defending')return super.stationOffer(s);
   const n=this.evac.repairNodes.find(n=>n.id===s.id),o={id:s.id,x:s.x,y:s.y,kind:'evac',title:n.name+' · REPAIR HELICOPTER',detail:'450 hull · progress saved · no points needed',action:'evac_repair',cost:0,duration:R.repairHold,enabled:true,reason:'',saved:n.progress};
   if(this.evac.hp>=this.evac.maxHp)o.reason='HULL FULL · PROTECT THE HELICOPTER';else if(n.readyAt>this.time)o.reason='PATCH SETTING · '+Math.ceil(n.readyAt-this.time)+'s';
   else if(n.progress>0)o.detail=Math.round(n.progress/R.repairHold*100)+'% SAVED · HOLD USE TO CONTINUE';o.enabled=!o.reason;return o;
  }
  updateInteraction(dt,held,blocked){
   const offer=this.interactionOffer(),n=this.evac?.phase==='defending'&&this.evac.repairNodes?.find(n=>n.id===offer?.id);
   if(!n)return super.updateInteraction(dt,held,blocked);
   if(!held){this.interaction=null;this.interactionLatch=false;return;}
   if(this.interactionLatch||!offer.enabled||blocked||this.player.flash>0){this.interaction=null;return;}
   n.progress=Math.min(R.repairHold,n.progress+dt);this.interaction={id:n.id,action:'evac_repair',elapsed:n.progress,total:R.repairHold};
   if(n.progress+1e-8>=R.repairHold){this.completeInteraction(n.id);this.interaction=null;this.interactionLatch=true;}
  }
  completeInteraction(id){
   const n=this.evac?.phase==='defending'&&this.evac.repairNodes?.find(n=>n.id===id);
   if(!n)return super.completeInteraction(id);
   const offer=this.interactionOffer();if(!offer||offer.id!==id||!offer.enabled||n.progress+1e-8<R.repairHold)return false;
   const e=this.evac;e.hp=Math.min(e.maxHp,e.hp+R.repairAmount);e.repairs++;n.completed++;n.progress=0;n.readyAt=this.time+R.repairCooldown;if(e.hp>e.maxHp*.4)e.critical=false;
   this.depotStats.interactions++;this.emit('evac_repaired',{x:n.x,y:n.y,hp:e.hp,cost:0,node:n.id,completed:n.completed});return true;
  }
  tick(dt,input={}){
   const p=this.player,speed=p?.speed,playing=this.status==='playing';
   if(playing){this.lurePreview=input.lurePreview&&p.lures>0?this.lureSpot(input.aim??p.wanted):null;if(p.perfectUntil>this.time&&p.roll<=0)p.speed*=1.16;}
   try{const out=super.tick(dt,input);if(playing){for(const d of this.decoys)if(this.time>=d.landAt&&this.time>=(d.pulseAt||0)){d.pulseAt=this.time+.8;this.emit('lure_pulse',{x:d.x,y:d.y,left:d.left});}}return out;}finally{if(p)p.speed=speed;}
  }
  export(){const out=super.export();return{...out,fairRules:R,evac:this.evac?JSON.parse(JSON.stringify(this.evac)):out.evac};}
 }
 root.DeadwatchCore={...C,Game:FairSurvivalGame,FAIR_RULES:R};
})(typeof globalThis!=='undefined'?globalThis:this);

// .152: bounded progression hooks. Rank 1 / zero tiers delegate unchanged.
(function(root){'use strict';
 const C=root.DeadwatchCore;
 class WatchGame extends C.Game{
  setWatchProfile(w){const old=this.watchTier('health');this.watchRank=Math.max(1,Math.min(25,w?.rank||1));this.watchUpgrades={...(w?.upgrades||{})};
   if(this.player&&this.watchBaseHP){const delta=this.watchBaseHP*(4*(this.watchTier('health')-old))/100;this.player.maxHp+=delta;this.player.hp=Math.min(this.player.hp,this.player.maxHp);}
  }
  watchTier(id){return Math.max(0,Math.min(3,this.watchUpgrades?.[id]||0));}
  watchPerk(rank){return(this.watchRank||1)>=rank;}
  start(...args){this.watchBaseHP=0;this.watchLastStandUsed=false;const out=super.start(...args);this.watchBaseHP=this.player.maxHp;this.player.maxHp=this.watchBaseHP*(100+4*this.watchTier('health'))/100;this.player.hp=this.player.maxHp;if(this.mode==='campaign'&&this.watchPerk(20))this.panic.boosts=Math.min(C.PANIC_RULES.maxBoosts,this.panic.boosts+1);return out;}
  heal(){const p=this.player,before=p.hp,result=super.heal();if(result&&this.watchTier('healing'))p.hp=Math.min(p.maxHp,before+50*(100+10*this.watchTier('healing'))/100);return result;}
  roll(move){const result=super.roll(move);if(result){const p=this.player,tier=this.watchTier('dashSpeed');p.rollCooldown*=1-.05*this.watchTier('dashRecharge');p.watchDashDuration=tier?C.RULES.rollDuration/(1+.1*tier):0;if(tier){p.roll=p.watchDashDuration;p.dashUntil=this.time+p.roll;}}return result;}
  damagePlayer(amount,from){const perfect=this.player?.dashPerfect,result=super.damagePlayer(amount,from);if(!perfect&&this.player?.dashPerfect&&this.watchPerk(10)){this.player.rollCooldown=Math.max(.3,this.player.rollCooldown-.25);this.emit('watch_escape',{x:this.player.x,y:this.player.y,refund:.25});}return result;}
  lure(){const result=super.lure();if(result){const d=this.decoys[this.decoys.length-1],mult=1+.1*this.watchTier('lureDuration');d.radius*=1+.1*this.watchTier('lureRadius');d.total*=mult;d.left=(d.left-.28)*mult+.28;}return result;}
  // .161: a deliberate tap starts switches; the existing offer owns range, time and cost.
  isTapInteraction(offer){return !!offer&&(offer.action==='power'||offer.action==='trap'||offer.action==='cold-panel'||offer.action==='cold-door');}
  cancelInteraction(){this.tapActivation=null;return super.cancelInteraction();}
  updateInteraction(dt,held,blocked,pressed){
   const fresh=pressed===undefined?held&&!this.tapUseHeld:!!pressed;this.tapUseHeld=!!held;
   const offer=this.interactionOffer();
   if(this.tapActivation){
    if(this.status!=='playing'||!offer?.enabled||offer.id!==this.tapActivation.id||offer.action!==this.tapActivation.action){this.cancelInteraction();return;}
   }else if(this.isTapInteraction(offer)){
    if(!fresh||!offer.enabled||this.status!=='playing')return super.updateInteraction(dt,false,false);
    this.tapActivation={id:offer.id,action:offer.action};this.interaction=null;this.interactionLatch=false;
   }
   const tapping=!!this.tapActivation;if(tapping){held=true;blocked=false;}
   const tier=this.watchTier('repair'),rate=held&&(tier||this.watchPerk(5))?(offer?.action?.includes('repair')?1+.1*tier:offer&&this.watchPerk(5)?1.25:1):1;
   const result=super.updateInteraction(dt*rate,held,blocked);
   if(tapping&&!this.interaction)this.tapActivation=null;
   return result;
  }
  completeInteraction(id){if(!this.watchPerk(15))return super.completeInteraction(id);const offer=this.interactionOffer(),repair=offer?.id===id&&offer.action?.includes('repair'),result=super.completeInteraction(id);if(result&&repair)this.watchRepairPulse();return result;}
  watchRepairPulse(){const p=this.player;let pushed=0;
   for(const z of this.zombies){if(z.dead||z.boss||z.kind==='brute')continue;const d=C.distance(p,z);if(d>105||!this.clearRoute(p,z,z.r))continue;const angle=d>.001?Math.atan2(z.y-p.y,z.x-p.x):p.aim,dx=Math.cos(angle),dy=Math.sin(angle);
    for(let step=0;step<12;step++){const next={x:z.x+dx*4,y:z.y+dy*4};if(!this.validPosition(next,z.r)||!this.clearRoute(z,next,z.r))break;z.x=next.x;z.y=next.y;}
    z.attack=null;z.navPath=null;pushed++;
   }this.emit('watch_engineer',{x:p.x,y:p.y,pushed});
  }
  collectArcade(q){const previous=this.reinforcement,result=super.collectArcade(q);if(!result)return result;const mult=1+.05*this.watchTier('powerDuration');if(mult===1)return result;
   if((q.type==='tank'||q.type==='heli')&&this.arcade.vehicle===q.type)this.arcade.vehicleLeft*=mult;
   else if(q.type==='drone'&&this.companion)this.companion.left*=mult;
   else if(q.type==='soldier'&&this.reinforcement&&this.reinforcement!==previous)this.reinforcement.left*=mult;
   return result;
  }
  useBoost(move){const result=super.useBoost(move);if(result)this.panic.boostLeft*=1+.05*this.watchTier('powerDuration');return result;}
  handlePlayerDown(from){if(this.watchPerk(25)&&!this.watchLastStandUsed){this.watchLastStandUsed=true;this.player.hp=1;this.emit('watch_last_stand',{x:this.player.x,y:this.player.y,from});return true;}return super.handlePlayerDown(from);}
 }
 root.DeadwatchCore={...C,Game:WatchGame};
})(typeof globalThis!=='undefined'?globalThis:this);
// .153: difficulty is chosen once at run start. Hard delegates to the existing rules.
(function(root){'use strict';
 const C=root.DeadwatchCore,CASUAL=Object.freeze({incomingDamage:.60,normalHordeCap:.75,spawnGap:1.25});
 class DifficultyGame extends C.Game{
  setSoloDifficulty(value){this.soloDifficulty=value==='casual'?'casual':'hard';return this.soloDifficulty;}
  start(mode='campaign',...args){this.runDifficulty=mode==='campaign'&&this.botEnabled===false&&this.soloDifficulty==='casual'?'casual':'hard';return super.start(mode,...args);}
  isCasualRun(){return this.mode==='campaign'&&this.runDifficulty==='casual';}
  scaleCampaignIncomingDamage(amount){return this.isCasualRun()?amount*CASUAL.incomingDamage:amount;}
  roundSpawnPlan(cfg){
   const plan=super.roundSpawnPlan(cfg);if(!this.isCasualRun())return plan;
   plan.cap=Math.max(2,Math.floor(plan.cap*CASUAL.normalHordeCap));plan.gap*=CASUAL.spawnGap;
   if(this.roundPace)this.roundPace.cap=plan.cap;
   return plan;
  }
  export(){const out=super.export();out.campaignDifficulty=this.mode==='campaign'?(this.runDifficulty||'hard'):null;return out;}
 }
 root.DeadwatchCore={...C,Game:DifficultyGame,CASUAL_RULES:CASUAL};
})(typeof globalThis!=='undefined'?globalThis:this);


// .155: replay flow owns global rounds; the original campaign route delegates unchanged.
(function(root){'use strict';
 const C=root.DeadwatchCore;
 const REPLAY_RULES=Object.freeze({roundSeconds:C.ROUND_PACING.seconds,soloCap:32,teamCap:38,quickRounds:5});
 const replayMode=mode=>mode==='quick'||mode==='endless';
 class ReplayGame extends C.Game{
  setReplayUnlockedMaps(ids){this.replayUnlockedMaps=C.ARENAS.filter(a=>ids?.includes(a.id)).map(a=>a.id);}
  configureReplay(mode,options={}){
   if(!replayMode(mode))throw Error('Unknown replay mode.');
   const maps=[...new Set(options.maps||[])],allowed=this.replayUnlockedMaps||[];
   if(!maps.length||maps.some(id=>!allowed.includes(id)))throw Error('Clear the selected maps in Campaign first.');
   const rotation=mode==='endless'&&options.rotation===true;
   if(!rotation&&maps.length!==1)throw Error('Choose one map.');
   this.replaySetup={mode,maps,rotation,team:options.team===true,difficulty:options.difficulty==='hard'?'hard':'casual'};
   return this.replaySetup;
  }
  start(mode='campaign',...args){
   if(!replayMode(mode)){this.replay=null;return super.start(mode,...args);}
   const setup=this.replaySetup;
   if(!setup||setup.mode!==mode||setup.maps.some(id=>!this.replayUnlockedMaps?.includes(id)))throw Error('Choose unlocked maps before starting.');
   this.replay={...setup,maps:[...setup.maps],round:0,completed:0,tier:1,finaleStarted:false,finaleKind:null,everTeammate:setup.team};
   this.botEnabled=setup.team;
   const out=super.start(mode,...args);this.runDifficulty=setup.difficulty;
   if(this.watchPerk(20))this.panic.boosts=Math.min(C.PANIC_RULES.maxBoosts,this.panic.boosts+1);
   return out;
  }
  setBotEnabled(enabled){const out=super.setBotEnabled(enabled);if(this.replay&&enabled)this.replay.everTeammate=true;return out;}
  isCasualRun(){return this.replay?this.runDifficulty==='casual':super.isCasualRun();}
  replayMapFor(round){const r=this.replay;return r.maps[r.rotation?Math.floor((round-1)/5)%r.maps.length:0];}
  replayEnemyCap(cap=Infinity){return this.replay?Math.min(cap,REPLAY_RULES.teamCap):cap;}
  applyArena(wave){
   if(!this.replay)return super.applyArena(wave);
   this.pendingArena=C.ARENAS.findIndex(a=>a.id===this.replayMapFor(this.replay.round));
   const out=super.applyArena(wave);
   // The helicopter stays in the scene; defense/repair/boarding starts on each fifth round.
   if(this.evac&&this.replay.round%5!==0){this.evac.phase='standby';this.stations=this.stations.filter(s=>s.kind!=='evac');}
   return out;
  }
  beginWave(wave){
   if(!this.replay)return super.beginWave(wave);
   const r=this.replay;r.round++;r.tier=this.mode==='endless'?Math.floor((r.round-1)/5)+1:1;r.finaleStarted=false;r.finaleKind=null;this.replaySpawnConfig=null;
   const phase=(r.round-1)%5;
   if(this.railReward)this.railReward.wave=phase;if(this.armoryReward)this.armoryReward.wave=phase;
   const out=super.beginWave(phase);this.queue=this.replayQueue();
   if(this.arenaHistory.length>64)this.arenaHistory.splice(0,this.arenaHistory.length-64);
   this.roundPace.cap=this.replayEnemyCap(this.roundPace.cap);
   this.emit('replay_round_start',{round:r.round,tier:r.tier,arena:this.arena.id,name:this.arena.name,mode:this.mode});return out;
  }
  replayQueue(){
   const cfg=C.PRESSURE_WAVES[this.wave],mix=C.MIXES[this.wave],tier=this.replay.tier-1;
   let runner=mix.runner/cfg.total,brute=mix.brute/cfg.total;
   if(this.mode==='quick'&&this.replay.round===4){runner+=.08;brute+=.05;}
   if(this.mode==='endless'){const pressure=1-1/(1+.18*tier);runner=Math.min(.55,runner+.18*pressure);brute=Math.min(.18,brute+.14*pressure);}
   const out=[];let runners=0,brutes=0;
   for(let i=1;i<=cfg.total;i++){
    if(Math.floor(i*brute)>brutes){out.push('brute');brutes++;}
    else if(Math.floor(i*runner)>runners){out.push('runner');runners++;}
    else out.push('walker');
   }return out;
  }
  roundSpawnPlan(cfg){
   if(!this.replay)return super.roundSpawnPlan(cfg);
   if(this.mode==='endless'&&!this.replaySpawnConfig){const t=this.replay.tier-1;this.replaySpawnConfig={...cfg,cap:cfg.cap+Math.min(10,t*2),gap:cfg.gap*(.38+.62/(1+.10*t)),burst:cfg.burst+Math.min(3,Math.floor(t/2))};}
   const scaled=this.mode==='endless'?this.replaySpawnConfig:cfg;
   const plan=super.roundSpawnPlan(scaled);plan.cap=Math.min(plan.cap,this.botEnabled!==false?REPLAY_RULES.teamCap:REPLAY_RULES.soloCap);this.roundPace.cap=plan.cap;return plan;
  }
  scaleReplayZombie(z){
   if(z&&this.replay&&this.mode==='endless'&&!z.boss&&!(this.arena?.id==='cold'&&z.kind==='brute')&&!z.replayScaled){
    // Health and damage retain the existing five bounded wave profiles. Speed adds at most 18%.
    const t=this.replay.tier-1;z.speed*=1+.18*(1-1/(1+.20*t));z.pressureSpeed=z.speed;z.replayScaled=true;
   }return z;
  }
  spawnZombie(...args){return this.scaleReplayZombie(super.spawnZombie(...args));}
  spawnHunter(...args){return this.scaleReplayZombie(super.spawnHunter(...args));}
  director(dt){
   if(this.replay&&!this.roundFinishedSpawning()&&!this.queue.length)this.queue=this.replayQueue();
   return super.director(dt);
  }
  replayFinale(){
   const r=this.replay,id=this.arena.id,major=this.mode==='endless'&&r.round%10===0;
   if(!(this.mode==='quick'&&r.round===5||major)||r.finaleStarted)return false;
   // Existing scripted cargo must finish before adding the finale.
   if(this.coldSnap&&(this.coldSnap.running||this.coldSnap.breach.cargo.length)||this.railTrain&&(['warning','opening'].includes(this.railTrain.phase)||this.railTrain.cargo.length)||this.campAir&&(['falling','skid'].includes(this.campAir.phase)||this.campAir.cargo.length))return true;
   r.finaleStarted=true;
   const alternate=major&&Math.floor(r.round/10)%2===0;
   if(id==='pump'&&!major||major&&alternate&&id!=='evac'){
    if(this.beginBossEncounter()){r.finaleKind='breaker';this.emit('replay_finale',{label:'MAJOR THREAT · THE BREAKER'});return true;}
   }
   if(id==='cold'){
    const b=this.coldSnap.breach;Object.assign(b,{phase:'waiting',at:this.time-7,cargo:['brute','walker','walker','runner'],nextAt:this.time+2.2,spawned:0,hintAt:0});
    r.finaleKind='cold';this.emit('replay_finale',{label:'FREEZER BREACH · READY THE TRAPS'});return true;
   }
   if(id==='rail'&&['ready','cooldown','closing','departing'].includes(this.railTrain?.phase)){
    const t=this.railTrain,cargo=Array.from({length:C.RAIL_TRAIN.cargo},(_,i)=>i%3===2?'runner':'walker');
    Object.assign(t,{phase:'warning',variant:'hostile',left:C.RAIL_TRAIN.warning,lead:65,door:0,cargo,total:cargo.length,spawned:0,kills:0,rewarded:false,crew:[],unload:0,beep:C.RAIL_TRAIN.warning,shots:0,calls:t.calls+1,navAt:0});
    r.finaleKind='train';this.emit('train_warning',{variant:'mystery',left:t.left});this.emit('replay_finale',{label:'HOSTILE CONVOY · CLEAR THE CROSSING'});return true;
   }
   if(id==='quarantine'&&this.campAir?.phase==='idle'&&this.startCampCrash()){
    r.finaleKind='crash';this.emit('replay_finale',{label:'INFECTED AIRLIFT · HOLD THE CAMP'});return true;
   }
   if(id==='evac'&&!major){r.finaleKind='extraction';return false;}
   // A bounded, warned assault reuses the map's ordinary/graveyard entrances and enemy types.
   const count=Math.min(this.replayEnemyCap(),major?20:16),spots=this.spawnPoints(count);
   for(let i=0;i<count;i++){const p=spots[i]||this.spawnPoint(),kind=i%5===4?'brute':i%3===1?'runner':'walker';this.warnings.push({...p,kind,left:C.RULES.spawnWarning});this.emit('spawn_warning',{...p,kind});}
   r.finaleKind='assault';this.emit('replay_finale',{label:id==='memorial'?'GRAVEYARD ASSAULT':id==='depot'?'DEPOT OVERRUN':id==='breakwater'?'BREAKWATER SIEGE':id==='evac'?'EXTRACTION UNDER SIEGE':'SECTOR ASSAULT'});return true;
  }
  completeWave(){
   if(!this.replay)return super.completeWave();
   if(this.status!=='playing'||this.replay.completed===this.replay.round||!this.roundFinishedSpawning()||this.zombies.some(z=>!z.dead)||this.warnings.length||this.antiCamp?.breachWarnings?.length)return;
   if(this.replayFinale())return;
   const out=super.completeWave();
   if(this.status==='loot'&&(!this.evac||this.evac.phase==='standby'))this.finishReplayRound();return out;
  }
  finishReplayRound(){
   const r=this.replay;if(!r||r.completed===r.round)return;
   r.completed=r.round;const won=this.mode==='quick'&&r.completed===5;
   if(won){if(this.loot)this.loot.nextStatus='won';else this.status='won';}
   else if(!this.loot)this.status='between';
   this.emit('replay_round_clear',{round:r.round,arena:this.arena.id,name:this.arena.name,mode:this.mode,matchComplete:won});
  }
  emit(type,data={}){
   if(this.replay&&type==='won'&&data.evacuated){this.finishReplayRound();return;}
   return super.emit(type,data);
  }
  advance(upgrade){
   if(!this.replay)return super.advance(upgrade);
   if(this.status!=='between'||upgrade!=='continue')return false;
   this.beginWave(0);return true;
  }
  export(){const out=super.export();if(this.replay)out.replay=JSON.parse(JSON.stringify(this.replay));return out;}
 }
 root.DeadwatchCore={...C,Game:ReplayGame,REPLAY_RULES};
})(typeof globalThis!=='undefined'?globalThis:this);
