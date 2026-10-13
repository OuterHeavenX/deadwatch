
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DeadwatchInput=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function normalizePad(dx,dy,r=50,dead=7){const m=Math.hypot(dx,dy);if(m<=dead)return{x:0,y:0};const q=Math.min(1,(m-dead)/Math.max(1,r-dead)),s=q/m;return{x:dx*s,y:dy*s};}
function cameraRelative(v,aim){const fx=Math.cos(aim),fy=Math.sin(aim),rx=-fy,ry=fx;return{x:fx*(-v.y)+rx*v.x,y:fy*(-v.y)+ry*v.x};}
function deadwatchMove(v){return{x:v.x,y:v.y};}
function aimFromPad(v){return Math.atan2(v.y,v.x);}
function twinStickAim(current,v,dead=.08){return Math.hypot(v.x||0,v.y||0)<=dead?current:aimFromPad(v);}
function integrateYaw(current,stickX,dt,rate=4.2,dead=.08){const x=Math.abs(stickX)<=dead?0:stickX;return current+x*rate*Math.max(0,dt||0);}
function fireDragVector(dx,dy,r=50){const v=normalizePad(dx,dy,r,4);return{...v,active:Math.hypot(v.x,v.y)>.08};}
class EdgeQueue{constructor(){this.q={};}push(k){this.q[k]=true;}consume(){const o=this.q;this.q={};return o;}}
class InputController{
 constructor(rootEl,callbacks={}){this.root=rootEl;this.callbacks=callbacks;this.move={x:0,y:0};this.aimVec={x:0,y:0};this.padAimActive=false;this.fireAimActive=false;this.touchAimActive=false;this.fireHeld=false;this.interactHeld=false;this.keys=new Set();this.mouseAim=null;this.mouseFire=false;this.mouseFocus=false;this.edges=new EdgeQueue();this.padPrev=[];this.padBlocked=[];this.padKey=null;this.padAxesBlocked=true;this.pointerResets=[];this.bindKeyboard();this.bindTouch();this.bindMouse();this.bindBrowserGestures();window.addEventListener('blur',()=>this.reset());}
 trackPointer(el,getId,end){
  this.pointerResets.push(()=>{const id=getId();if(id===null)return;end({pointerId:id});try{if(el.hasPointerCapture?.(id))el.releasePointerCapture(id);}catch(_){}});
  el.addEventListener('lostpointercapture',end);
 }
 reset(){
  for(const release of this.pointerResets)release();
  this.move={x:0,y:0};this.aimVec={x:0,y:0};this.padAimActive=this.fireAimActive=this.touchAimActive=this.fireHeld=this.interactHeld=false;
  this.mouseAim=null;this.mouseFire=this.mouseFocus=false;this.lureAimHeld=false;this.lureAimVector=null;this.keys.clear();this.edges.consume();this.padPrev=[];
  // Releasing controls after a menu, focus change or reconnect prevents accidental actions.
  this.resetGamepad();this.callbacks.cancelUse?.();
 }
 bindKeyboard(){window.addEventListener('keydown',e=>{const text=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||'')||e.target?.isContentEditable;if(text)return;if(e.code==='Escape'||e.code==='KeyP'){if(!e.repeat)this.callbacks.pause?.();e.preventDefault();return;}if(this.callbacks.enabled&&!this.callbacks.enabled())return;const codes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyG','KeyX','KeyF','KeyE','KeyV'];if(!codes.includes(e.code))return;e.preventDefault();this.keys.add(e.code);if(e.repeat)return;const m={Space:'roll',ShiftLeft:'roll',ShiftRight:'roll',KeyG:'nuke',KeyX:'boost',KeyE:'heal',KeyV:'interactTap'};if(e.code==='KeyF')this.lureAimHeld=true;if(m[e.code])this.edges.push(m[e.code]);});window.addEventListener('keyup',e=>{if(e.code==='KeyF'&&this.keys.has('KeyF')){this.lureAimHeld=false;if(!this.callbacks.enabled||this.callbacks.enabled())this.edges.push('lure');}this.keys.delete(e.code);});}
 bindBrowserGestures(){
  const guard=event=>{if(event.target?.closest?.('#gameCanvas,#gunEffectsCanvas,#touch,#gameViewport button'))event.preventDefault();};
  for(const type of ['contextmenu','selectstart','dragstart'])this.root.addEventListener(type,guard,{capture:true});
 }
 bindMouse(){const surface=this.root.querySelector('#gameCanvas'),active=()=>!this.callbacks.enabled||this.callbacks.enabled();surface?.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||!active())return;this.mouseAim={x:e.clientX,y:e.clientY};});surface?.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||!active())return;e.preventDefault();this.mouseAim={x:e.clientX,y:e.clientY};if(e.button===0)this.mouseFire=true;if(e.button===2)this.mouseFocus=true;});window.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')return;if(e.button===0)this.mouseFire=false;if(e.button===2)this.mouseFocus=false;});surface?.addEventListener('contextmenu',e=>e.preventDefault());}
 bindPad(el,kind){if(!el)return;const knob=el.querySelector('.knob');let pid=null;const update=e=>{const r=el.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),v=normalizePad(dx,dy,Math.min(r.width,r.height)*.45,5);if(kind==='move')this.move=v;else{this.mouseAim=null;this.aimVec=v;this.padAimActive=Math.hypot(v.x,v.y)>.08;this.touchAimActive=this.padAimActive||this.fireAimActive;}if(knob)knob.style.transform=`translate(calc(-50% + ${v.x*30}px),calc(-50% + ${v.y*30}px))`;};const end=e=>{if(pid!==e.pointerId)return;pid=null;if(kind==='move')this.move={x:0,y:0};else{this.padAimActive=false;if(!this.fireAimActive)this.aimVec={x:0,y:0};this.touchAimActive=this.padAimActive||this.fireAimActive;}if(knob)knob.style.transform='translate(-50%,-50%)';el.classList.remove('active');};this.trackPointer(el,()=>pid,end);el.addEventListener('pointerdown',e=>{e.preventDefault();if(pid!==null)return;pid=e.pointerId;el.setPointerCapture(pid);el.classList.add('active');update(e);});el.addEventListener('pointermove',e=>{if(e.pointerId===pid)update(e);});el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);}
 bindButton(id,onDown,onUp){const el=this.root.querySelector('#'+id);if(!el)return;let pid=null;const end=e=>{if(pid!==e.pointerId)return;pid=null;el.classList.remove('down');onUp?.(e);};this.trackPointer(el,()=>pid,end);el.addEventListener('pointerdown',e=>{e.preventDefault();if(pid!==null)return;pid=e.pointerId;el.setPointerCapture(pid);el.classList.add('down');onDown?.(e);});el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);}
 bindLure(){const el=this.root.querySelector('#lureBtn');if(!el)return;let pid=null,start=null;
  const end=e=>{if(pid!==e.pointerId)return;const commit=e.type==='pointerup';pid=null;start=null;this.lureAimHeld=false;el.classList.remove('down');if(commit)this.edges.push('lure');else this.lureAimVector=null;};this.trackPointer(el,()=>pid,end);
  el.addEventListener('pointerdown',e=>{e.preventDefault();if(pid!==null)return;pid=e.pointerId;start={x:e.clientX,y:e.clientY};this.mouseAim=null;this.lureAimHeld=true;this.lureAimVector=null;el.setPointerCapture(pid);el.classList.add('down');});
  el.addEventListener('pointermove',e=>{if(pid!==e.pointerId||!start)return;const v=fireDragVector(e.clientX-start.x,e.clientY-start.y,48);if(v.active)this.lureAimVector={x:v.x,y:v.y};});
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
 }
 bindTouch(){this.bindLure();this.bindPad(this.root.querySelector('#movePad'),'move');this.bindPad(this.root.querySelector('#aimPad'),'aim');const fire=this.root.querySelector('#fireBtn');if(fire){let pid=null,start=null;const move=e=>{if(e.pointerId!==pid||!start)return;const v=fireDragVector(e.clientX-start.x,e.clientY-start.y,48);this.fireAimActive=v.active;if(v.active)this.aimVec={x:v.x,y:v.y};this.touchAimActive=this.padAimActive||this.fireAimActive;};const end=e=>{if(e.pointerId!==pid)return;pid=null;start=null;this.fireHeld=false;this.fireAimActive=false;this.touchAimActive=this.padAimActive;if(!this.padAimActive)this.aimVec={x:0,y:0};fire.classList.remove('down');};this.trackPointer(fire,()=>pid,end);fire.addEventListener('pointerdown',e=>{e.preventDefault();if(pid!==null)return;pid=e.pointerId;start={x:e.clientX,y:e.clientY};fire.setPointerCapture(pid);this.mouseAim=null;this.fireHeld=true;fire.classList.add('down');});fire.addEventListener('pointermove',move);fire.addEventListener('pointerup',end);fire.addEventListener('pointercancel',end);}for(const [id,key] of [['rollBtn','roll'],['nukeBtn','nuke'],['boostBtn','boost'],['healBtn','heal']])this.bindButton(id,()=>this.edges.push(key));this.bindButton('interactBtn',()=>{this.interactHeld=true;this.edges.push('interactTap');},e=>{this.interactHeld=false;if(e.type!=='pointerup'){delete this.edges.q.interactTap;this.callbacks.cancelUse?.();}});this.bindButton('pauseBtn',()=>this.callbacks.pause?.());this.bindButton('fullBtn',()=>this.callbacks.fullscreen?.());}
 gamepadKey(p){return p.index+':'+p.id;}
 findGamepad(){
  let pads;try{pads=navigator.getGamepads?.()||[];}catch(_){return null;}
  let first=null,standard=null;
  for(const p of pads){if(!p||!p.connected||!p.axes||p.axes.length<4||!p.buttons)continue;if(this.gamepadKey(p)===this.padKey)return p;first=first||p;if(p.mapping==='standard')standard=standard||p;}
  return standard||first;
 }
 gamepadButtons(p){return Array.from(p.buttons,(b,i)=>{const threshold=(i===4||i===6||i===7) ? .4 : .55;return typeof b==='number'?b>threshold:!!b?.pressed||b?.value>threshold;});}
 resetGamepad(p=this.findGamepad()){
  this.padPrev=p?this.gamepadButtons(p):[];this.padBlocked=this.padPrev.slice();this.padAxesBlocked=true;
 }
 pollPad(){
  const p=this.findGamepad(),neutral=this.padNeutral||(this.padNeutral={move:{x:0,y:0},aim:{x:0,y:0},fire:false,focus:false,interact:false});
  if(!p){if(this.padKey!==null){this.padKey=null;this.resetGamepad(null);this.edges.consume();this.callbacks.controller?.(null);}return null;}
  const key=this.gamepadKey(p),now=this.gamepadButtons(p);
  if(key!==this.padKey){const changed=this.padKey!==null;this.padKey=key;this.resetGamepad(p);this.edges.consume();if(changed)this.callbacks.controller?.(null);this.callbacks.controller?.(p);return neutral;}
  const axes=Array.from({length:4},(_,i)=>Number.isFinite(p.axes[i])?clamp(p.axes[i],-1,1):0);
  if(!axes.some(v=>Math.abs(v)>.12))this.padAxesBlocked=false;
  for(let i=0;i<now.length;i++)if(!now[i])this.padBlocked[i]=false;
  const edge=i=>!!now[i]&&!this.padPrev[i]&&!this.padBlocked[i],held=i=>!!now[i]&&!this.padBlocked[i];
  const pressed=now.map((_,i)=>edge(i));this.padPrev=now;
  if(this.root.hidden||(this.root.hasFocus&&!this.root.hasFocus())){this.resetGamepad(p);this.edges.consume();return neutral;}
  const dz=(x,y)=>this.padAxesBlocked||Math.hypot(x,y)<.12?{x:0,y:0}:{x,y},move=dz(axes[0],axes[1]),aim=dz(axes[2],axes[3]);
  if(pressed[9]){this.reset();this.callbacks.pause?.();return neutral;}
  if(this.callbacks.enabled&&!this.callbacks.enabled()){
   this.edges.consume();this.callbacks.menu?.({move,pressed,buttons:now.map((_,i)=>held(i))});return neutral;
  }
  if(pressed[0])this.edges.push('roll');if(pressed[2])this.edges.push('nuke');if(pressed[5])this.edges.push('boost');if(pressed[3])this.edges.push('lure');if(pressed[1])this.edges.push('heal');if(pressed[4])this.edges.push('interactTap');
  return{move,aim,fire:held(7),focus:held(6),interact:held(4)};
 }
 command(game,dt=1/60){const p=game.player;if(!p)return{};let local={x:(+(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-+(this.keys.has('KeyA')||this.keys.has('ArrowLeft')))+this.move.x,y:(+(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-+(this.keys.has('KeyW')||this.keys.has('ArrowUp')))+this.move.y},aim=p.wanted,fire=this.fireHeld||this.mouseFire||this.touchAimActive,focus=this.mouseFocus,interact=this.interactHeld||this.keys.has('KeyV');const pad=this.pollPad();if(pad){if(Math.hypot(pad.move.x,pad.move.y)>.01)local=pad.move;if(Math.hypot(pad.aim.x,pad.aim.y)>.03){this.mouseAim=null;aim=twinStickAim(aim,pad.aim);}fire=fire||pad.fire;focus=focus||pad.focus;interact=interact||pad.interact;}if(this.touchAimActive)aim=twinStickAim(aim,this.aimVec);if(this.lureAimVector)aim=twinStickAim(aim,this.lureAimVector);if(this.mouseAim&&!this.touchAimActive&&!this.lureAimVector){if(this.callbacks.aim)aim=this.callbacks.aim(this.mouseAim,p);else{const dx=this.mouseAim.x-innerWidth*.5,dy=this.mouseAim.y-innerHeight*.5;if(Math.hypot(dx,dy)>10)aim=Math.atan2(dy,dx);}}if(interact){const offer=game.interactionOffer?.();if(offer?.enabled&&!offer.quickUse&&!game.isTapInteraction?.(offer))fire=false;}const move=deadwatchMove(local);const m=Math.hypot(move.x,move.y);const out={move:m>1?{x:move.x/m,y:move.y/m}:move,aim,fire,focus,interact,interactTap:false,lurePreview:!!this.lureAimHeld,...this.edges.consume()};if(!this.lureAimHeld)this.lureAimVector=null;return out;}
}
return{InputController,normalizePad,cameraRelative,deadwatchMove,aimFromPad,twinStickAim,integrateYaw,fireDragVector,EdgeQueue};
});

