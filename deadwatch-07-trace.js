
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DeadwatchTrace=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const round=(v,n=3)=>Number.isFinite(v)?Number(v.toFixed(n)):v;
function cloneSafe(v,depth=0){
 if(v==null||typeof v==='string'||typeof v==='boolean')return v;
 if(typeof v==='number')return Number.isFinite(v)?round(v):null;
 if(depth>4)return undefined;
 if(Array.isArray(v))return v.slice(0,96).map(x=>cloneSafe(x,depth+1)).filter(x=>x!==undefined);
 if(typeof v==='object'){
  const o={};for(const [k,x] of Object.entries(v)){if(typeof x==='function')continue;const c=cloneSafe(x,depth+1);if(c!==undefined)o[k]=c;}return o;
 }
 return undefined;
}
function actor(z){return{id:z.id,kind:z.kind,x:round(z.x),y:round(z.y),hp:round(z.hp),maxHp:round(z.maxHp),speed:round(z.speed),dead:!!z.dead,hunter:!!z.hunter,attack:!!z.attack,cooldown:round(z.cooldown||0),pursuit:z.kind==='runner'?{chaseSince:z.chaseSince===undefined?null:round(z.chaseSince),flank:z.flank?.goal?{x:round(z.flank.goal.x),y:round(z.flank.goal.y),until:round(z.flank.until),plannedAt:round(z.flank.plannedAt),travelTime:round(z.flank.travelTime),basis:z.flank.basis}:null,intercept:z.intercept?.goal?{x:round(z.intercept.goal.x),y:round(z.intercept.goal.y),until:round(z.intercept.until)}:null}:undefined};}
function nearestZombie(game){const p=game.player;if(!p)return null;let best=null;for(const z of game.zombies||[]){if(z.dead)continue;const d=Math.hypot(z.x-p.x,z.y-p.y);if(!best||d<best.distance)best={id:z.id,kind:z.kind,hunter:!!z.hunter,distance:round(d),x:round(z.x),y:round(z.y),hp:round(z.hp)};}return best;}
class TraceRecorder{
 constructor(opts={}){this.build=opts.build||'Deadwatch 0.32.9 ActualPursuitRun';this.sampleHz=opts.sampleHz||5;this.maxSamples=opts.maxSamples||18000;this.reset();}
 reset(){this.data=null;this.nextSample=0;this.frameTimes=[];this.lastFrameWork=null;this.active=false;this.finished=false;}
 start(game,extra={}){this.data={schema:'deadwatch-trace-v1',meta:{build:this.build,createdAt:new Date().toISOString(),sampleHz:this.sampleHz,...cloneSafe(extra)},samples:[],events:[],performance:{slowFrameCount:0,slowFrames:[]},summary:null};this.nextSample=0;this.frameTimes=[];this.lastFrameWork=null;this.active=true;this.finished=false;return this.data;}
 noteFrame(dt,game=null,sync=null){
  if(!this.active||!Number.isFinite(dt)||dt<=0)return;
  this.frameTimes.push(dt);if(this.frameTimes.length>120)this.frameTimes.shift();
  if(dt>.05&&this.data?.performance&&['playing','loot','exiting'].includes(game?.status)){
   const report=this.data.performance;report.slowFrameCount++;
   report.slowFrames.push({t:round(game.time),arena:game.arena?.id,status:game.status,gapMs:round(dt*1000),previousFrame:cloneSafe(this.lastFrameWork),sync:cloneSafe(sync)});
   if(report.slowFrames.length>180)report.slowFrames.shift();
  }
 }
 noteWork(work){if(this.active)this.lastFrameWork=work;}
 fps(){if(!this.frameTimes.length)return null;const avg=this.frameTimes.reduce((a,b)=>a+b,0)/this.frameTimes.length;return avg>0?round(1/avg,1):null;}
 sample(game,command={},inputState={},presentation=null,sync=null){if(!this.active||!this.data||!game)return false;const t=Number(game.time)||0;if(this.data.samples.length&&t+1e-9<this.nextSample)return false;if(this.data.samples.length>=this.maxSamples)return false;const p=game.player||{};const living=(game.zombies||[]).filter(z=>!z.dead).map(actor);const ac=game.antiCamp||{};const sample={
  t:round(t),status:game.status,mode:game.mode,wave:(game.wave||0)+1,arena:game.arena?.id||null,score:game.score||0,
  multiplier:game.reward?.multiplier||1,incoming:(game.queue?.length||0)+(game.warnings?.length||0)+(ac.breachWarnings?.length||0),fps:this.fps(),
  player:{x:round(p.x),y:round(p.y),hp:round(p.hp),maxHp:round(p.maxHp),aim:round(p.aim),wanted:round(p.wanted),vx:round(p.vx),vy:round(p.vy),stamina:round(p.stamina),roll:round(p.roll||0),hurtGrace:round(p.hurtGrace||0),medkits:p.medkits,lures:p.lures},
  input:{move:cloneSafe(command.move||{x:0,y:0}),aim:round(command.aim),fire:!!command.fire,focus:!!command.focus,interact:!!command.interact,interactTap:!!command.interactTap,roll:!!command.roll,nuke:!!command.nuke,boost:!!command.boost,lure:!!command.lure,heal:!!command.heal,...cloneSafe(inputState)},
  squad:cloneSafe(game.squad||[]),squadStats:cloneSafe(game.squadStats||{}),
  companion:cloneSafe(game.companion),reinforcement:cloneSafe(game.reinforcement),animalProjectiles:cloneSafe(game.animalProjectiles),reinforcementTags:game.reinforcementTags,streak:game.time-game.lastKillAt<=4.5?game.streak:0,lives:game.lives,respawnShield:round(game.respawnShield||0),panic:cloneSafe(game.panic||{}),arcade:cloneSafe(game.arcade||{}),pressure:{hold:round(ac.hold||0),breaches:ac.breaches||0,huntersSpawned:ac.huntersSpawned||0,flankBursts:ac.flankBursts||0,zone:cloneSafe(ac.zone||null)},
  nearestZombie:nearestZombie(game),zombies:living
 };if(presentation)sample.presentation=cloneSafe(presentation);if(this.lastFrameWork)sample.frameWork=cloneSafe(this.lastFrameWork);if(sync)sample.sync=cloneSafe(sync);this.data.samples.push(sample);this.nextSample=t+1/this.sampleHz;return true;}
 recordEvent(event,game,sync=null){if(!this.active||!this.data||!event)return;const e=cloneSafe(event)||{};e.t=round(Number(game?.time)||0);e.hp=round(game?.player?.hp);e.wave=(game?.wave||0)+1;e.arena=game?.arena?.id||null;e.nearestZombie=nearestZombie(game);if(sync)e.sync=cloneSafe(sync);this.data.events.push(e);}
 finish(game,reason,sync=null){if(!this.data||this.finished)return this.data;this.finished=true;this.active=false;this.data.summary={reason:reason||game?.status||'unknown',time:round(Number(game?.time)||0),wave:(game?.wave||0)+1,arena:game?.arena?.id||null,score:game?.score||0,hp:round(game?.player?.hp),lives:game?.lives,lifeStats:cloneSafe(game?.lifeStats||{}),squadStats:cloneSafe(game?.squadStats||{}),companionStats:cloneSafe(game?.companionStats||{}),reinforcementStats:cloneSafe(game?.reinforcementStats||{}),animalSeed:game?.animalSeed,reinforcementTags:game?.reinforcementTags,kills:game?.stats?.kills,shots:game?.stats?.shots,connected:game?.stats?.connected,accuracy:game?.stats?.shots?round(game.stats.connected/game.stats.shots):0,samples:this.data.samples.length,events:this.data.events.length};if(sync)this.data.summary.sync=cloneSafe(sync);return this.data;}
 exportObject(){return this.data==null?null:JSON.parse(JSON.stringify(this.data));}
 exportJSON(){return JSON.stringify(this.data);}
 filename(){const stamp=new Date().toISOString().replace(/[:.]/g,'-');return `Deadwatch_0.36.38_trace_${stamp}.json`;}
}
return{TraceRecorder,nearestZombie};
});

