/* Deadwatch: event-bound firing presentation; simulation and input are separate. */
(function(root){'use strict';
const C=root.DeadwatchCore,TAU=Math.PI*2,clamp=C.clamp,point=C.v;
let game=null,ctx=null;const gfx={recoil:0};
function line(c,a,b,color,width=1){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
function poly(c,points,color){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function mul4(m,v){const x=v[0],y=v[1],z=v[2],w=v[3];return[m[0]*x+m[4]*y+m[8]*z+m[12]*w,m[1]*x+m[5]*y+m[9]*z+m[13]*w,m[2]*x+m[6]*y+m[10]*z+m[14]*w,m[3]*x+m[7]*y+m[11]*z+m[15]*w];}
class Overlay{
 constructor(canvas,renderer){this.canvas=canvas;this.renderer=renderer;this.ctx=canvas.getContext('2d',{alpha:true});this.tracers=[];this.muzzles=[];this.shells=[];this.sparks=[];this.markers=[];this.nukeFlash=0;this.tankBursts=[];this.randomSeed=90317;this.lastW=0;this.lastH=0;}
 reset(){this.nukeFlash=0;this.tankBursts.length=0;for(const list of [this.tracers,this.muzzles,this.shells,this.sparks,this.markers])list.length=0;gfx.recoil=0;this.ctx.setTransform(1,0,0,1,0,0);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);}
 rnd(){this.randomSeed=(Math.imul(this.randomSeed,1664525)+1013904223)>>>0;return this.randomSeed/4294967296;}
 resize(){const src=this.renderer.canvas,w=src.width||Math.max(1,Math.round(innerWidth*(devicePixelRatio||1))),h=src.height||Math.max(1,Math.round(innerHeight*(devicePixelRatio||1)));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.ctx.imageSmoothingEnabled=true;this.ctx.imageSmoothingQuality='high';}return{w,h};}
 projectSim(x,y,height=.03){const f=this.renderer.instanceFrame;if(!f)return null;const q=root.Deadwatch3D.simToWorld(x,y),v=mul4(f.view,[q.x,height,q.z,1]),p=mul4(f.proj,v);if(!Number.isFinite(p[3])||Math.abs(p[3])<1e-6)return null;const nx=p[0]/p[3],ny=p[1]/p[3];return{x:(nx*.5+.5)*this.canvas.width,y:(1-(ny*.5+.5))*this.canvas.height,w:p[3]};}
 onEvent(e,g){
  if(e.type==='companion_shot'||e.type==='reinforcement_shot'||e.type==='squad_shot'){this.supportEvent(e,g);return;}
  if(e.type==='panic_nuke')this.nukeFlash=.22;
  const starts=[this.tracers.length,this.muzzles.length,this.sparks.length];
  const actor=e.actorId?g?.squad?.find(b=>b.actorId===e.actorId):null,view=actor?{player:actor,arcade:actor.arcade,time:g.time}:g,recoil=gfx.recoil;
  this.referenceEvent(e,view);if(actor)gfx.recoil=recoil;
  if(!view?.player||!['shot','special_shot','special_missile'].includes(e.type))return;
  const pose=root.Deadwatch3D.powerupPose(view,(actor?this.renderer.squadMotion?.get(actor.actorId):this.renderer.playerMotion)||{}),world=e.type==='special_missile'?pose?.missileWorld:pose?.muzzleWorld;
  if(!world)return;
  if(e.type==='special_shot'&&e.kind==='tank')this.tankFire(e,world,view.player,g);
  for(const t of this.tracers.slice(starts[0])){
   t.worldA={...world};t.height=e.kind==='tank'||e.type==='special_missile'?(g.surfaceHeight?.(t.b.x,t.b.y)||0)+.08:t.kind==='zombie'?(g.surfaceHeight?.(t.b.x,t.b.y)||0)+1.12:e.kind==='heli'?1.02:world.y;t.powerupKind=e.type==='special_missile'?'missile':e.kind||null;if(e.kind==='ray'){t.voidVariant=e.voidVariant||C.Voidcaster.style(view.arcade).id;t.color=C.Voidcaster.style(t).color;}
   const end=root.Deadwatch3D.simToWorld(t.b.x,t.b.y);
   if((end.x-world.x)*(t.b.x-t.a.x)+(end.z-world.z)*(t.b.y-t.a.y)<=0)t.life=0;
  }
  for(const m of this.muzzles.slice(starts[1])){m.worldP={...world};m.powerupKind=pose.powerupKind||null;if(e.kind==='ray')m.voidVariant=e.voidVariant||C.Voidcaster.style(view.arcade).id;if(actor&&(e.kind==='tank'||e.kind==='ray'))m.support=true;}
  for(const s of this.sparks.slice(starts[2]))s.height=world.y;
 }
 tankFire(e,world,actor,g){
  const impact=e.blast?{...root.Deadwatch3D.simToWorld(e.blast.x,e.blast.y),y:g.surfaceHeight?.(e.blast.x,e.blast.y)||0}:null;
  this.tankBursts.push({muzzle:{...world},impact,angle:actor.aim||0,phase:(e.x*.071+e.y*.037+(g.time||0)*1.3)%TAU,radius:(e.blast?.radius||112)*.035,life:.78,max:.78});
  if(this.tankBursts.length>12)this.tankBursts.splice(0,this.tankBursts.length-12);
 }
 drawTankFX(tr){
  const low=(this.renderer.quality?.level??2)===0,puffs=low?2:4;
  ctx.save();ctx.globalCompositeOperation='source-over';
  const cloud=(world,size,color,alpha)=>{const p=this.worldPoint(world,tr);if(!p||alpha<=0)return;ctx.globalAlpha=alpha;const mist=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,size);mist.addColorStop(0,color);mist.addColorStop(.22,color);mist.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=mist;ctx.fillRect(p.x-size,p.y-size,size*2,size*2);};
  for(const burst of this.tankBursts){
   const age=burst.max-burst.life,co=Math.cos(burst.angle),si=Math.sin(burst.angle);
   if(age<.58){const u=age/.58,fade=(1-u)*Math.min(1,age/.025);
    for(let i=0;i<puffs;i++){const spread=(i-(puffs-1)/2)*.28*(1+u),forward=.13+u*(.65+i*.18);
     cloud({x:burst.muzzle.x+co*forward-si*spread,y:burst.muzzle.y+.08+u*.7,z:burst.muzzle.z+si*forward+co*spread},14+u*30,'#bdc0ae',fade*.48);
    }
   }
   if(!burst.impact||age<.055)continue;
   const u=clamp((age-.055)/.725,0,1),fade=1-u,impact=burst.impact,hot=clamp(1-u/.18,0,1);
   if(hot>0){cloud({...impact,y:impact.y+.20},38+u*80,'rgba(255,165,58,.88)',hot*.82);cloud({...impact,y:impact.y+.25},16+u*24,'rgba(255,245,212,.98)',hot);}
   for(let i=0;i<puffs;i++){const a=burst.phase+i*2.39996,d=(.10+u*.57)*burst.radius;
    cloud({x:impact.x+Math.cos(a)*d,y:impact.y+.12+u*(.50+i*.10),z:impact.z+Math.sin(a)*d},22+u*30,'#9a8d72',fade*.58*Math.min(1,u*12));
   }
   const pieces=low?4:8;
   for(let i=0;i<pieces;i++){const a=burst.phase+i*2.39996,d=u*burst.radius*(.42+(i%3)*.16),height=Math.sin(u*Math.PI)*(.35+(i%4)*.12),w={x:impact.x+Math.cos(a)*d,y:impact.y+.08+height,z:impact.z+Math.sin(a)*d},p=this.worldPoint(w,tr),tail=this.worldPoint({x:w.x-Math.cos(a)*.12,y:w.y+.04,z:w.z-Math.sin(a)*.12},tr);if(!p||!tail)continue;ctx.globalAlpha=fade*fade;line(ctx,tail,p,u<.20?'#ffd18b':'#938267',u<.20?1.8:1.4);}
  }
  ctx.restore();
 }
 supportEvent(e,g){
  const soldier=e.type!=='companion_shot',actor={x:e.actorX,y:e.actorY,groundHeight:e.groundHeight??(g.surfaceHeight?.(e.actorX,e.actorY)||0),aim:e.aim,recoil:.09,vx:0,vy:0};
  const pose=soldier?root.DeadwatchSurvivor.poseInfo(actor,(e.type==='squad_shot'?this.renderer.squadMotion?.get(e.actorId):this.renderer.reinforcementMotion)||{}):null;
  const world=pose?.muzzleWorld||{...root.Deadwatch3D.simToWorld(e.x,e.y),y:(g.surfaceHeight?.(e.actorX,e.actorY)||0)+e.height};
  const supportPose=pose||{gunOrigin:world,weaponAngle:e.aim,weaponScale:.6};
  const t0=this.tracers.length,m0=this.muzzles.length,s0=this.sparks.length,recoil=gfx.recoil;
  this.referenceEvent({type:'shot',gun:'carbine',paths:[e.path]},{player:actor,supportPose});gfx.recoil=recoil;
  for(const t of this.tracers.slice(t0)){
   t.worldA={...world};t.height=e.path.kind==='zombie'?(g.surfaceHeight?.(t.b.x,t.b.y)||0)+1.12:world.y;
   const end=root.Deadwatch3D.simToWorld(t.b.x,t.b.y);if((end.x-world.x)*(t.b.x-t.a.x)+(end.z-world.z)*(t.b.y-t.a.y)<=0)t.life=0;
  }
  for(const m of this.muzzles.slice(m0)){m.worldP={...world};m.support=true;}
  for(const spark of this.sparks.slice(s0))spark.height=world.y;
 }
 worldPoint(p,tr){
  const f=this.renderer.instanceFrame,v=mul4(f.view,[p.x,p.y,p.z,1]),q=mul4(f.proj,v);
  if(!Number.isFinite(q[3])||q[3]<=1e-6)return null;
  const x=(q[0]/q[3]*.5+.5)*this.canvas.width-tr.e,y=(1-(q[1]/q[3]*.5+.5))*this.canvas.height-tr.f,det=tr.a*tr.d-tr.b*tr.c;
  if(Math.abs(det)<1e-8)return null;
  return{x:(tr.d*x-tr.c*y)/det,y:(tr.a*y-tr.b*x)/det};
 }
 raisedPoint(p,height,tr){const w=root.Deadwatch3D.simToWorld(p.x,p.y);return this.worldPoint({x:w.x,y:height??.03,z:w.z},tr);}
 referenceEvent(e,g){if(!g?.player)return;if(e.type==='shot'){const a=g.player.aim,strength=e.gun==='shotgun'?1:e.gun==='scout'?.82:e.gun==='pistol'?.4:.55;gfx.recoil=strength;const m=C.muzzle(g.player);this.muzzles.push({x:m.x,y:m.y,angle:a,life:.07,max:.07,strength,color:'#ffc577',inner:'#fff4d8',glow:'#ffd9953d'});const ra=this.rnd()*1.4+a+Math.PI/2,s=25+this.rnd()*35;this.spawnShell(g,a,ra,s);for(const p of e.paths||[]){this.tracers.push({...p,life:.09,max:.09,color:'#fff0c7'});if(p.kind==='wall'||p.kind==='barrel')for(let i=0;i<4;i++){const aa=Math.atan2(p.a.y-p.b.y,p.a.x-p.b.x)+(this.rnd()-.5)*2,ss=25+this.rnd()*80;this.sparks.push({x:p.b.x,y:p.b.y,vx:Math.cos(aa)*ss,vy:Math.sin(aa)*ss,life:.18+this.rnd()*.12,max:.3});}}}
 else if(e.type==='special_shot'){const m=C.muzzle(g.player),color=e.kind==='ray'?'#7dffb2':e.kind==='heli'?'#8de5ff':'#fff0c7';gfx.recoil=e.kind==='tank'?1.15:e.kind==='deathmachine'?.8:.65;this.muzzles.push({x:m.x,y:m.y,angle:g.player.aim,life:e.kind==='tank'?.11:.075,max:e.kind==='tank'?.11:.075,strength:gfx.recoil,color,inner:e.kind==='ray'?'#ecfff2':'#fff5da',glow:e.kind==='ray'?'rgba(93,255,161,.35)':e.kind==='heli'?'rgba(110,226,255,.28)':'rgba(255,207,116,.30)'});for(const p of e.paths||[]){const life=e.kind==='ray'?.10:e.kind==='tank'?.16:.11;this.tracers.push({...p,life,max:life,color});}}
 else if(e.type==='special_missile'&&e.blast){this.tracers.push({a:point(g.player.x,g.player.y),b:point(e.blast.x,e.blast.y),life:.18,max:.18,color:'#ffd195'});}
 else if(e.type==='hit'){let m=this.markers.find(m=>m.id===e.id);if(m){m.life=.14;}else this.markers.push({id:e.id,x:e.x,y:e.y,height:g.surfaceHeight?.(e.x,e.y)||0,life:.14,kill:false});}
 else if(e.type==='kill'){const m=this.markers.find(m=>m.id===e.id);if(m){m.kill=true;m.life=.24;}}
 }
 update(dt){for(let i=this.tankBursts.length-1;i>=0;i--){this.tankBursts[i].life-=dt;if(this.tankBursts[i].life<=0)this.tankBursts.splice(i,1);}this.nukeFlash=Math.max(0,this.nukeFlash-dt);this.updateShells(dt);gfx.recoil=Math.max(0,gfx.recoil-dt*8);for(const list of [this.tracers,this.muzzles,this.sparks,this.markers])for(let i=list.length-1;i>=0;i--){const p=list[i];p.life-=dt;if(p.life<=0){list.splice(i,1);continue;}if(p.vx!==undefined){p.x+=p.vx*dt;p.y+=p.vy*dt;const drag=Math.exp(-dt*(list===this.shells?7:4));p.vx*=drag;p.vy*=drag;if(list===this.shells)p.age+=dt;}}if(this.tracers.length>64)this.tracers.splice(0,this.tracers.length-64);if(this.muzzles.length>12)this.muzzles.splice(0,this.muzzles.length-12);}
 // Casings use world coordinates from the receiver, then settle on the floor.
 spawnShell(g,a,ra,speed){
  const pose=g.supportPose||root.DeadwatchSurvivor.poseInfo(g.player,this.renderer.playerMotion||{});
  const origin=pose?.gunOrigin||{...root.Deadwatch3D.simToWorld(g.player.x,g.player.y),y:1.5};
  const angle=pose?.weaponAngle??a,scale=pose?.weaponScale||1,co=Math.cos(angle),si=Math.sin(angle);
  this.shells.push({
   world:{x:origin.x+(co*.12-si*.065)*scale,y:origin.y+.025*scale,z:origin.z+(si*.12+co*.065)*scale},
   vx:Math.cos(ra)*speed*.035+(g.player.vx||0)*.035*.2,
   vz:Math.sin(ra)*speed*.035+(g.player.vy||0)*.035*.2,
   vy:1.1+(speed-25)/35*.8,angle:ra,spin:(speed-42)*.9,
   age:0,life:1.65,bounces:0,settled:false,floor:g.player.groundHeight||0
  });
  if(this.shells.length>48)this.shells.splice(0,this.shells.length-48);
 }
 updateShells(dt){
  for(let i=this.shells.length-1;i>=0;i--){
   const s=this.shells[i];s.life-=dt;s.age+=dt;
   if(s.life<=0){this.shells.splice(i,1);continue;}
   let left=dt;
   while(left>1e-8&&!s.settled){
    const step=Math.min(left,1/120);left-=step;
    s.world.x+=s.vx*step;s.world.z+=s.vz*step;
    s.world.y+=s.vy*step-6*step*step;s.vy-=12*step;
    s.angle+=s.spin*step;
    const drag=Math.exp(-.8*step);s.vx*=drag;s.vz*=drag;
    s.floor=this.renderer.surfaceAtWorld(s.world.x,s.world.z);
    if(s.world.y<=s.floor+.017){
     s.world.y=s.floor+.017;
     if(s.bounces++===0){s.vy=Math.abs(s.vy)*.18;s.vx*=.45;s.vz*=.45;s.spin*=.4;}
     else{s.vx=s.vy=s.vz=s.spin=0;s.settled=true;}
    }
   }
  }
 }
 drawShells(){
  const r=this.renderer,gl=r.gl;if(r.mode!=='webgl2'||!gl||!this.shells.length)return;
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);
  for(const s of this.shells){
   const w=s.world,fade=clamp(s.life/.5,0,1),radius=.017*fade,halfLength=.0475*Math.sqrt(fade);
   const maxTilt=Math.asin(clamp((w.y-(s.floor||0)-.017)/.0475,0,1));
   const tilt=s.settled?0:Math.sin(s.age*19+s.angle)*Math.min(.65,maxTilt),co=Math.cos(s.angle),si=Math.sin(s.angle),ct=Math.cos(tilt),st=Math.sin(tilt);
   const matrix=new Float32Array([-si*radius,0,co*radius,0,co*ct*halfLength,st*halfLength,si*ct*halfLength,0,-co*st*radius,ct*radius,-si*st*radius,0,w.x,s.settled?(s.floor||0)+radius:w.y,w.z,1]);
   const color='#'+[Math.round(48+137*fade),Math.round(64+85*fade),Math.round(73+12*fade)].map(n=>n.toString(16).padStart(2,'0')).join('');
   r.queueInstance('cylinder',matrix,color,0,root.Deadwatch3D.MATERIAL_IDS.METAL);
   // A small floor contact shadow, rendered with the world's depth buffer.
   r.queueInstance('sphere',new Float32Array([.052*fade,0,0,0,0,.001,0,0,0,0,.026*fade,0,w.x,(s.floor||0)+.004,w.z,1]),'#101819',0,root.Deadwatch3D.MATERIAL_IDS.MATTE);
  }
  r.flushInstances();
 }

 // Render the existing event paths; never infer targets or extend a hit endpoint.
 drawTracer(t,a,b){
  const life=clamp(t.life/(t.max||.11),0,1),col=t.color||'#fff0c7',ray=t.powerupKind==='ray';
  ctx.globalAlpha=life;
  if(ray||t.powerupKind==='tank'||t.powerupKind==='missile'){
   const age=1-life,head=clamp(age*3,0,1),tail=Math.max(0,head-(ray?.19:.10));
   const u=point(a.x+(b.x-a.x)*tail,a.y+(b.y-a.y)*tail),v=point(a.x+(b.x-a.x)*head,a.y+(b.y-a.y)*head);
   if(ray){
    const style=C.Voidcaster.style(t),dx=v.x-u.x,dy=v.y-u.y,len=Math.hypot(dx,dy);
    if(len>.001){
     const nx=-dy/len,ny=dx/len;
     // Original ray profile and real hit endpoint, with a brighter colored halo.
     line(ctx,u,v,style.color+'50',8);
     poly(ctx,[u,point(u.x+dx*.70+nx*2.2,u.y+dy*.70+ny*2.2),v,point(u.x+dx*.70-nx*2.2,u.y+dy*.70-ny*2.2)],style.core);
     line(ctx,point(u.x+dx*.35,u.y+dy*.35),v,style.inner,1.1);
     glow(ctx,v.x,v.y,13,style.color+'68');
    }
   }else{
    line(ctx,u,v,'#ffb64966',5);line(ctx,u,v,'#fff0b2',2.1);glow(ctx,v.x,v.y,12,'rgba(255,199,90,.45)');
   }
  }else{
   // Keep instant hitscan feedback, with a narrower warm wake and a bright leading streak.
   line(ctx,a,b,col+'18',4.5);line(ctx,a,b,col+'85',1.25);
   const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),head=clamp((1-life)*3.5+.18,0,1),tail=Math.max(0,head-Math.min(.24,26/Math.max(1,length)));
   line(ctx,point(a.x+dx*tail,a.y+dy*tail),point(a.x+dx*head,a.y+dy*head),'#fff7dc',1.9);
  }
 }
 drawMuzzle(m){
  const ray=m.powerupKind==='ray';
  ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.angle);
  if(ray){
   const v=C.Voidcaster.style(m);
   glow(ctx,2,0,27,v.color+'50');
   poly(ctx,[point(0,0),point(4,-4),point(15,-1.1),point(21,0),point(15,1.1),point(4,4)],v.color);
   poly(ctx,[point(0,0),point(5,-1.2),point(16,0),point(5,1.2)],v.inner);
   line(ctx,point(4,-5),point(7,-7),v.core,.8);line(ctx,point(4,5),point(7,7),v.core,.8);
  }else if(m.powerupKind==='tank'){
   glow(ctx,18,0,52,'rgba(255,172,66,.38)');
   const fire=(x,y,r)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#fffdf0');g.addColorStop(.20,'#ffe8b1');g.addColorStop(.48,'rgba(255,182,81,.86)');g.addColorStop(.75,'rgba(238,112,37,.30)');g.addColorStop(1,'rgba(191,77,28,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);};
   fire(9,0,16);fire(24,-4,20);fire(32,5,15);
   ctx.scale(2.3,.72);glow(ctx,7,0,9,'rgba(255,254,239,.96)');
  }else{
   const length=14+m.strength*13;
   glow(ctx,2,0,29+m.strength*14,m.glow||'#ffd9953d');
   poly(ctx,[point(0,-1.4),point(7,-4),point(6,-1),point(length,0),point(6,1.6),point(9,4),point(0,2)],m.color||'#ffc577');
   poly(ctx,[point(0,-1),point(7,-1.4),point(length*.70,0),point(5,1.3),point(0,1)],m.inner||'#fff4d8');
  }
  ctx.restore();
 }

 worldTransform(p){const a=this.projectSim(p.x,p.y),ex=this.projectSim(p.x+1,p.y),ey=this.projectSim(p.x,p.y+1);if(!a||!ex||!ey)return null;const A=ex.x-a.x,B=ex.y-a.y,Cc=ey.x-a.x,D=ey.y-a.y;return{a:A,b:B,c:Cc,d:D,e:a.x-A*p.x-Cc*p.y,f:a.y-B*p.x-D*p.y};}
 render(g,dt){game=g;ctx=this.ctx;this.resize();this.update(dt);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.canvas.width,this.canvas.height);if(!g?.player||!this.renderer.instanceFrame)return;const tr=this.worldTransform(g.player);if(!tr)return;ctx.save();ctx.setTransform(tr.a,tr.b,tr.c,tr.d,tr.e,tr.f);this.drawTankFX(tr);for(const t of this.tracers){const a=t.worldA?this.worldPoint(t.worldA,tr):t.a,b=t.worldA?this.raisedPoint(t.b,t.height,tr):t.b;if(!a||!b)continue;this.drawTracer(t,a,b);}ctx.globalAlpha=1;this.drawShells(tr);for(const raw of this.sparks){const p=raw.height==null?raw:this.raisedPoint(raw,raw.height,tr);if(!p)continue;ctx.globalAlpha=clamp(raw.life/raw.max,0,1);line(ctx,point(p.x-raw.vx*.026,p.y-raw.vy*.026),point(p.x,p.y),'#ffca78',1.35);if(raw.life/raw.max>.65)line(ctx,point(p.x-raw.vx*.009,p.y-raw.vy*.009),point(p.x,p.y),'#fff6d7',1.05);}for(const raw of this.markers){const m=raw.height?{...raw,...this.raisedPoint(raw,raw.height,tr)}:raw;ctx.globalAlpha=clamp(m.life/.1,0,1);const col=m.kill?'#f2ba78':'#fff0c7',gap=m.kill?8:6;for(const side of [-1,1])for(const sy of [-1,1])line(ctx,point(m.x+side*gap,m.y+sy*gap),point(m.x+side*(gap+4),m.y+sy*(gap+4)),col,1.8);}for(const raw of this.muzzles){const latest=this.renderer.lastPlayerPose,anchor=raw.worldP?(raw.support?raw.worldP:(latest?.powerupKind||null)===(raw.powerupKind||null)?latest?.muzzleWorld||raw.worldP:raw.worldP):null,p=anchor?this.worldPoint(anchor,tr):raw;if(!p)continue;const m={...raw,...p};ctx.globalAlpha=clamp(m.life/m.max,0,1);this.drawMuzzle(m);}ctx.globalAlpha=1;ctx.restore();
 if(this.nukeFlash>0){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.60*Math.pow(this.nukeFlash/.22,2);ctx.fillStyle='#fff2cd';ctx.fillRect(0,0,this.canvas.width,this.canvas.height);ctx.restore();}
 }
}
root.DeadwatchGunEffects={Overlay};
})(globalThis);
