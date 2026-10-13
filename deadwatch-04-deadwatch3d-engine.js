
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Deadwatch3D=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SCALE=.035,CX=720,CY=520,Voidcaster=globalThis.DeadwatchVoidcaster;
const MATERIAL_IDS=Object.freeze({MATTE:0,ASPHALT:1,CONCRETE:2,METAL:3,ORGANIC:4,WET:5,GLASS:6,FABRIC:7,LEATHER:8,RUBBER:9,SKIN:10,PARK_STONE:11,PARK_ROOF:12,PARK_LEAF:13,CAMP_CANVAS:14,DEPOT_ASPHALT:15,DEPOT_CONCRETE:16,DEPOT_METAL:17,DEPOT_PAINT:18,DEPOT_WET:19,DEPOT_BRICK:20,DEPOT_GLASS:21,VEHICLE_PAINT:22,VEHICLE_METAL:23,VEHICLE_RUBBER:24,VEHICLE_GLASS:25,TANK_PAINT:26,TANK_METAL:27,TANK_RUBBER:28});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
function simToWorld(x,y){return{x:(x-CX)*SCALE,z:(y-CY)*SCALE};}
function activeTrapMarkerPlan(trap,count=16){
 if(!trap||!(Number(trap.active)>0||Number(trap.arming)>0||trap.preview)||!Number.isFinite(trap.x)||!Number.isFinite(trap.y)||!Number.isFinite(trap.radius)||trap.radius<=0)return[];
 const center=simToWorld(trap.x,trap.y),n=clamp(Math.round(Number(count)||16),12,20),r=trap.radius*SCALE;
 const out=[];
 for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2;
  out.push({x:center.x+Math.cos(a)*r,z:center.z+Math.sin(a)*r,scale:.075+(i%2)*.012,glow:.55+(i%3)*.08});
 }
 return out;
}

// Shared switchgear and shock equipment: the default for every current and future arena.
// Presentation only; existing interactions, damage, timers and instance batches stay authoritative.
function powerTrapDevicePlan(game){
 const id=game.arena?.id||game.arenaId;
 const parts=[],glows=[],shadows=[],ribbons=[],M=MATERIAL_IDS,time=Number(game.time)||0,trap=game.trap||{},powered=!!game.power;
 const active=powered&&trap.active>0,arming=powered&&trap.arming>0,cooling=powered&&!active&&!arming&&trap.cooldown>0;
 const state=!powered?'off':active?'active':arming?'arming':cooling?'cooling':'ready';
 const signal={off:'#846751',ready:'#8ed4af',arming:'#e4b562',active:'#a0eff3',cooling:'#bf8b52'}[state];
 const emission=!powered?.02:active?.80:arming?.36+.18*Math.sin(time*16):cooling?.12:.30;
 const charge=!powered?0:active?clamp(trap.active/4,0,1):arming?clamp(1-trap.arming/.8,0,1):cooling?clamp(1-trap.cooldown/24,0,1):1;
 const add=(mesh,matrix,color,material=M.METAL,glow=0)=>{const p={mesh,matrix,color,material,glow};parts.push(p);return p;};
 const box=(x,y,z,w,h,d,c,mat=M.METAL,g=0)=>add('box',model(x,y,z,w/2,h/2,d/2),c,mat,g);
 const rounded=(x,y,z,w,h,d,c,mat=M.METAL,g=0)=>add('pickupRoundBox',model(x,y,z,w/2,h/2,d/2),c,mat,g);
 const cyl=(x,y,z,r,h,c,mat=M.METAL,g=0)=>add('pickupCylinder',model(x,y,z,r,h/2,r),c,mat,g);
 const seg=(a,b,r,c,mat=M.METAL,g=0)=>{const m=basisModel(...a,...b,r,r);for(const k of [0,1,2])m[k]*=-1;add('pickupCylinder',m,c,mat,g);};
 const dark='#273b3f',paint=id==='breakwater'?'#607b80':id==='memorial'?'#687866':'#657c70',trim='#97a48c',copper='#b19763';
 const liftSince=(start,h)=>{if(!h)return;for(let i=start[0];i<parts.length;i++)parts[i].matrix[13]+=h;for(let i=start[1];i<glows.length;i++)glows[i].y+=h;for(let i=start[2];i<shadows.length;i++)shadows[i].y+=h;for(let i=start[3];i<ribbons.length;i++){ribbons[i].a={...ribbons[i].a,y:ribbons[i].a.y+h};ribbons[i].b={...ribbons[i].b,y:ribbons[i].b.y+h};}};
 const gauge=(x,y,z,r,value)=>{
  cyl(x,y,z,r,.055,dark);cyl(x,y+.032,z,r*.78,.018,'#b8bda1',M.MATTE);
  const angle=-2.1+clamp(value,0,1)*2.8;seg([x,y+.050,z],[x+Math.sin(angle)*r*.61,y+.05,z+Math.cos(angle)*r*.61],.012,'#34423b');
  cyl(x,y+.058,z,.022,.012,dark);
 };
 const lamp=(x,y,z,color,level)=>{
  cyl(x,y,z,.080,.042,dark);cyl(x,y+.038,z,.055,.031,color,M.GLASS,level);
 };
 const cable=points=>{for(let i=1;i<points.length;i++)seg(points[i-1],points[i],.027,'#283938',M.MATTE);};
 for(const station of game.stations||[]){
  if(!['generator','trap'].includes(station.kind))continue;
  const first=[parts.length,glows.length,shadows.length,ribbons.length];
  const p=simToWorld(station.x,station.y),x=p.x,z=p.z,gen=station.kind==='generator',focused=game.interactionOffer?.id===station.id;
  const status=gen?(powered?'#9fd8b4':'#d6ad69'):signal,light=gen?(powered?.40:.23):emission;
  shadows.push({x,y:.067,z,radius:gen?1.02:.83,color:'#111c1d',strength:.53,mode:0});
  rounded(x,.115,z,gen?1.58:1.19,.14,gen?1.16:.97,'#626f63',M.PARK_STONE);
  for(const dx of [-1,1])for(const dz of [-1,1])cyl(x+dx*(gen?.62:.46),.196,z+dz*(gen?.41:.33),.035,.025,trim);
  if(gen){
   // Heavy switchgear cabinet: recessed doors, hinges, cooling bank and a readable top panel.
   rounded(x,.83,z,1.24,1.26,.82,paint);rounded(x,1.49,z,1.34,.11,.92,'#879686');
   rounded(x,1.564,z+.02,1.04,.065,.64,dark);
   for(const dx of [-.28,.28]){
    box(x+dx,.86,z+.419,.51,.97,.030,'#455e57');box(x+dx,.86,z+.443,.45,.90,.018,'#5e786a');
    for(const yy of [.48,1.20])box(x+dx+(dx<0?-.215:.215),yy,z+.461,.052,.12,.029,trim);
    box(x+dx+(dx<0?.11:-.11),.84,z+.468,.047,.19,.048,copper);
   }
   for(let i=0;i<5;i++)box(x-.27,.46+i*.075,z+.47,.35,.025,.025,'#304a43');
   rounded(x-.61,.83,z-.24,.30,1.05,.37,'#415852');
   for(let i=0;i<5;i++)box(x-.80+i*.071,.83,z-.24,.030,.99,.37,'#819282');
   cyl(x+.47,1.60,z-.29,.082,.15,dark);cyl(x+.47,1.70,z-.29,.064,.073,status,M.GLASS,light);
   gauge(x-.28,1.618,z-.10,.145,powered?.72:.07);
   // Breaker handle moves between the real OFF and ON states.
   box(x+.21,1.61,z-.06,.26,.035,.31,'#8b9984');
   const endZ=z+(powered?-.145:.115),endY=powered?1.755:1.83;
   for(const dx of [.15,.27])seg([x+dx,1.65,z-.04],[x+dx,endY,endZ],.020,trim);
   seg([x+.105,endY,endZ],[x+.315,endY,endZ],.046,powered?'#9db795':'#bd9158',M.MATTE);
   lamp(x-.35,1.615,z+.22,'#d3a163',powered?.01:.36);lamp(x-.10,1.615,z+.22,'#9ce0b6',powered?.48:.015);
   box(x+.31,1.618,z+.22,.22,.016,.19,'#c0aa70',M.MATTE);
   add('pickupBolt',model(x+.31,1.637,z+.22,.16,.025,.16),'#35483c',M.MATTE);
   // Front readout, inspection plate and ceramic bus terminals stay on the cabinet.
   box(x+.28,1.17,z+.464,.33,.25,.032,'#243d40');
   box(x+.28,1.17,z+.484,.272,.18,.012,powered?'#568b75':'#334846',M.GLASS,powered?.16:0);
   for(let i=0;i<3;i++)box(x+.19+i*.08,1.17,z+.494,.026,powered?.065+i*.026:.018,.006,powered?'#b0edc4':'#6d8172',M.GLASS,powered?.40:0);
   box(x+.26,.55,z+.476,.28,.11,.017,'#c6b578',M.MATTE);
   for(let i=0;i<3;i++)box(x+.17+i*.09,.55,z+.487,.036,.067,.007,'#495246',M.MATTE);
   for(const dx of [-.37,0,.37]){
    cyl(x+dx,1.57,z-.38,.057,.14,'#bdc3ab',M.MATTE);
    for(const yy of [1.56,1.61])cyl(x+dx,yy,z-.38,.073,.024,'#8d9d8c');
    cyl(x+dx,1.662,z-.38,.030,.043,copper);
   }
   seg([x-.37,1.681,z-.38],[x+.37,1.681,z-.38],.024,copper);
   if(powered)glows.push({x:x+.47,y:1.735,z:z-.29,radius:.25,color:'#b2efbf',strength:.24,mode:1});
   if(id==='pump')cable([[x-.61,.29,z-.24],[x-.88,.095,z-.36],[x-1.15,.095,z-.36],[x-3.03,.095,z+.92],[x-2.80,.095,z+1.45]]);
   else{
    // Local service loop ends in a floor socket, so new maps need no hand-routed cable.
    cable([[x-.61,.29,z-.24],[x-.88,.095,z-.36],[x-1.12,.095,z-.22],[x-1.17,.095,z+.10],[x-1.02,.095,z+.28]]);
    cyl(x-1.02,.088,z+.28,.12,.05,dark);cyl(x-1.02,.121,z+.28,.079,.025,trim);
   }
  }else{
   // Shock controller has a sloped desk, protected lever and visible capacitor pair.
   rounded(x,.49,z,.79,.59,.63,'#425d5c');rounded(x,.91,z,1.08,.15,.87,'#788d7d');
   const panel=model(x,1.044,z+.07,.47,.040,.31),c=Math.cos(.24),sn=Math.sin(.24);
   panel[5]=c*.040;panel[6]=sn*.040;panel[9]=-sn*.31;panel[10]=c*.31;
   add('pickupRoundBox',panel,dark);
   // Controls are placed on the same incline as the desk, with clear separation.
   const deskY=zz=>1.086-Math.tan(.24)*(zz-(z+.07));
   const deskPart=(xx,zz,w,hh,d,color,offset,material=M.METAL,glow=0)=>{
    const matrix=model(xx,deskY(zz)+offset*c,zz+offset*sn,w/2,hh/2,d/2);
    matrix[5]=c*hh/2;matrix[6]=sn*hh/2;matrix[9]=-sn*d/2;matrix[10]=c*d/2;
    add('box',matrix,color,material,glow);
   };
   const screenZ=z-.005;
   deskPart(x-.20,screenZ,.39,.029,.28,'#1c3034',.028);
   deskPart(x-.20,screenZ,.29,.015,.16,status,.056,M.GLASS,light*.55);
   for(const dx of [.20,.36])seg([x+dx,deskY(z+.11)+.02,z+.11],[x+dx,1.35,z+(active||arming?-.035:.17)],.021,trim);
   seg([x+.16,1.35,z+(active||arming?-.035:.17)],[x+.40,1.35,z+(active||arming?-.035:.17)],.042,'#c69658',M.MATTE);
   for(const dx of [-.18,.18]){
    cyl(x+dx,1.20,z-.32,.097,.46,'#657e79');
    for(const yy of [1.07,1.24,1.39])cyl(x+dx,yy,z-.32,.108,.038,'#a0aa8e');
    cyl(x+dx,1.472,z-.32,.049,.12,signal,M.GLASS,emission*.60);
   }
   for(let i=0;i<5;i++){
    const xx=x-.36+i*.18,zz=z+.26,lit=charge>=(i+1)/5-.001;
    deskPart(xx,zz,.123,.017,.073,lit?status:'#344a42',.024,M.GLASS,lit?light*.65:.01);
   }
   // Thin waveform segments stay seated on the existing inclined screen.
   for(let i=0;i<5;i++)deskPart(x-.30+i*.05,screenZ,.023,.005,powered?.035+.045*(.5+.5*Math.sin(time*5+i*1.8)):.025,powered?'#c2f8dc':'#64786b',.067,M.GLASS,powered?.38:0);
   for(let i=0;i<4;i++)box(x,.34+i*.085,z+.324,.51,.030,.022,trim);
   box(x-.46,.76,z+.21,.032,.28,.17,'#c0a36c',M.MATTE);
   if(id==='pump')cable([[x+.47,.22,z+.09],[x+.72,.095,z+.13],[x+2.74,.095,z+.13],[x+2.74,.095,z-1.03]]);
   else{
    cable([[x+.47,.22,z+.09],[x+.72,.095,z+.13],[x+.96,.095,z+.04],[x+1.01,.095,z-.22],[x+.87,.095,z-.36]]);
    cyl(x+.87,.088,z-.36,.12,.05,dark);cyl(x+.87,.121,z-.36,.079,.025,trim);
   }
  }
  glows.push({x,y:.082,z,radius:focused?1.04:.82,color:status,strength:focused?.19:powered?.10:.055,mode:0});
  if(focused)glows.push({x,y:.088,z,radius:gen?.98:.85,color:game.interactionOffer.enabled?'#dfc591':'#9b7660',strength:.38,mode:-.045});
  liftSince(first,Math.max(0,Number(station.groundHeight)||0));
 }
 // Flush electrode assemblies surround the true damage radius; no new blockers.
 if(Number.isFinite(trap.x)&&Number.isFinite(trap.y)&&trap.radius>0){
  const first=[parts.length,glows.length,shadows.length,ribbons.length],p=simToWorld(trap.x,trap.y),r=trap.radius*SCALE,emitters=[];
  for(let i=0;i<16;i++){
   const angle=i*Math.PI/8,x=p.x+Math.cos(angle)*r,z=p.z+Math.sin(angle)*r;
   const mark=model(x,.092,z,.052,.011,.17,-angle);add('box',mark,powered?'#99aa92':'#777c64',M.MATTE);
  }
  for(let i=0;i<4;i++){
   const angle=Math.PI/4+i*Math.PI/2,x=p.x+Math.cos(angle)*r,z=p.z+Math.sin(angle)*r;
   emitters.push({x,z});cyl(x,.119,z,.265,.072,'#536d68');cyl(x,.17,z,.21,.035,copper);
   cyl(x,.209,z,.13,.044,dark);cyl(x,.244,z,.105,.027,signal,M.GLASS,emission);
   for(const yy of [.160,.204]){add('lootRing',model(x,yy,z,.236,.19,.236),yy<.2?'#8c9e91':'#c2aa73');}
   for(const sign of [-1,1])seg([x+sign*.10,.254,z],[x+sign*.07,.310,z],.018,trim);
   seg([x-.07,.310,z],[x+.07,.310,z],.018,signal,M.GLASS,emission);
   for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])box(x+Math.cos(a)*.20,.193,z+Math.sin(a)*.20,.061,.073,.061,trim);
   shadows.push({x,y:.075,z,radius:.38,color:'#132123',strength:.30,mode:0});
   if(powered)glows.push({x,y:.275,z,radius:active?.60:.40,color:signal,strength:active?.36:arming?.18:.075,mode:0});
  }
  if(powered&&(active||arming||game.interactionOffer?.kind==='trap'))glows.push({x:p.x,y:.12,z:p.z,radius:r,color:signal,strength:active?.42:arming?.25+.10*Math.sin(time*16):.17,mode:-.022});
  if(active){
   glows.push({x:p.x,y:.09,z:p.z,radius:r*.90,color:'#72ccd6',strength:.08,mode:0});
   // One batched, depth-tested ribbon pass. Same field radius and active-state timing.
   const phase=Math.floor(time*17);
   for(let i=0;i<5;i++){
    const index=i<4?i:phase%4,A=emitters[index],B=emitters[(index+(i<4?1:2))%4],dx=B.x-A.x,dz=B.z-A.z,L=Math.hypot(dx,dz);let prev={x:A.x,y:.267,z:A.z};
    for(let j=1;j<=6;j++){
     const t=j/6,envelope=Math.sin(t*Math.PI),jitter=Math.sin(phase*2.31+i*3.8+j*4.2)*envelope*.24;
     const next={x:lerp(A.x,B.x,t)-dz/L*jitter,y:.267+envelope*(.10+.045*Math.sin(phase+i+j)),z:lerp(A.z,B.z,t)+dx/L*jitter};
     ribbons.push({a:prev,b:next,width:i<4?.045:.034,opacity:i<4?.78:.58,color:i<4?'#68dff3':'#99f6e6',mode:-1});prev=next;
    }
   }
  }
  liftSince(first,Math.max(0,Number(trap.groundHeight)||0));
 }
 return liftRenderPlan({parts,glows,shadows,ribbons,state,charge},id==='memorial'?.04:0);
}

function arcadeDevicePlan(game){
 const id=game.arena?.id||game.arenaId,shared=powerTrapDevicePlan(game);
 if(!['depot','breakwater','memorial'].includes(id))return shared;
 const isPark=id==='memorial';
 const parts=[],glows=[],shadows=[],M=MATERIAL_IDS,powered=!!game.power;
 const add=(mesh,matrix,c,g=0,mat=M.METAL)=>parts.push({mesh,matrix,color:c,glow:g,material:mat});
 const box=(x,y,z,w,h,d,c,g=0,a=0,mesh='box',mat=M.METAL)=>add(mesh,model(x,y,z,w/2,h/2,d/2,a),c,g,mat);
 const cyl=(x,y,z,r,h,c,g=0)=>add('pickupCylinder',model(x,y,z,r,h/2,r),c,g);
 const seg=(a,b,r,c,g=0)=>add('pickupCylinder',basisModel(a.x,a.y,a.z,b.x,b.y,b.z,r,r),c,g);
 for(const s of game.stations||[]){
  if(!['clinic','bench','radio','cache'].includes(s.kind))continue;
  const p=simToWorld(s.x,s.y),x=p.x,z=p.z,online=powered||s.kind==='cache';
  const accent={clinic:'#95e2bc',bench:'#e7c780',radio:'#86d7ed',cache:'#ffce77'}[s.kind];
  const signal=online?accent:'#686c60';
  const glow=online?.40:.025,focused=game.interactionOffer?.id===s.id;
  shadows.push({x,y:.014,z,radius:s.kind==='bench'?.90:.73,color:'#091417',strength:.44,mode:0});
  if(s.kind==='clinic'){
   // Field medical case on a short fold-out stand; top cross reads from overhead.
   for(const dx of [-.36,.36]){box(x+dx,.22,z,.07,.40,.08,'#677b75');box(x+dx,.046,z,.11,.07,.65,'#364949');}
   box(x,.56,z,1.04,.36,.68,'#aebfb4',0,0,'powerHull');
   box(x,.774,z,1.06,.086,.70,'#d3dbcd',0,0,'powerHull');
   box(x,.823,z,.46,.010,.43,'#304e44',0,0,'box',M.MATTE);
   box(x,.834,z,.085,.014,.33,'#bceacb',online?.13:0);box(x,.835,z,.33,.014,.085,'#bceacb',online?.13:0);
   for(const dx of [-.38,.38])box(x+dx,.61,z+.35,.10,.17,.036,'#43554e');
   for(const dx of [-.16,.16])box(x+dx,.64,z-.37,.05,.07,.06,'#40524b');
   box(x,.64,z-.405,.35,.06,.05,'#40524b');
   box(x-.37,.826,z+.20,.15,.017,.08,signal,glow,0,'box',M.GLASS);
  }else if(s.kind==='bench'){
   for(const dx of [-.46,.46]){box(x+dx,.34,z,.075,.66,.55,'#405453');box(x+dx,.064,z,.14,.09,.67,'#50605a');}
   box(x,.31,z-.18,.94,.07,.065,'#60706a');
   box(x,.724,z,1.19,.13,.73,'#766a4d',0,0,'powerHull');
   box(x,.796,z,.87,.014,.46,'#2b4544',0,0,'box',M.RUBBER);
   // Metal vise, steel spanner and cartridge tray.
   box(x+.36,.88,z-.03,.22,.17,.24,'#73837b',0,0,'powerHull');
   for(const dz of [-.11,.08])box(x+.36,1.004,z+dz,.25,.07,.055,'#b7bda6');
   seg({x:x+.19,y:.91,z:z+.13},{x:x+.56,y:.91,z:z+.13},.022,'#bdbea5');
   box(x-.18,.831,z,.34,.035,.056,'#c0c3ac',0,-.55);
   for(const dz of [-.045,.045])box(x-.345,.842,z+.10+dz,.13,.033,.028,'#c0c3ac');
   box(x-.34,.81,z-.23,.25,.018,.13,'#414e43');
   for(const dx of [-.42,-.34,-.26])box(x+dx,.833,z-.23,.033,.03,.095,'#c2a16d');
   box(x+.39,.804,z+.27,.29,.020,.052,signal,glow,0,'box',M.GLASS);
  }else if(s.kind==='radio'){
   // Weatherproof communications set with carry handle, tuning dials and whip.
   box(x,.09,z,.85,.15,.61,'#35453e',0,0,'powerHull');
   box(x,.43,z,.72,.54,.50,id==='breakwater'?'#4e6870':'#586853',0,0,'powerHull');
   box(x,.735,z,.72,.07,.51,'#788779',0,0,'powerHull');
   box(x-.11,.778,z-.045,.34,.02,.27,'#182d32');box(x-.11,.791,z-.045,.25,.008,.18,signal,glow,0,'box',M.GLASS);
   for(const zOff of [-.11,.10])cyl(x+.24,.798,z+zOff,.068,.06,'#bec4a9');
   for(let i=0;i<4;i++)box(x-.11,.33+i*.064,z+.258,.37,.029,.019,'#202e2b');
   for(const dx of [-.20,.20])box(x+dx,.86,z-.19,.047,.19,.055,'#303f36');box(x,.956,z-.19,.45,.043,.055,'#82917e');
   cyl(x-.28,.83,z-.18,.055,.14,'#343f36');
   seg({x:x-.28,y:.88,z:z-.18},{x:x-.36,y:1.52,z:z-.23},.018,'#a7b6a2');
   cyl(x-.36,1.535,z-.23,.030,.055,signal,glow*.7);
  }else if(s.kind==='cache'){
   // Reinforced supply case, distinct from collectible weapon silhouettes.
   box(x,.30,z,1.04,.54,.79,'#59694a',0,0,'powerHull');
   box(x,.604,z,1.08,.10,.82,'#8c986d',0,0,'powerHull');
   for(const dx of [-.38,.38]){box(x+dx,.36,z+.405,.075,.49,.026,'#b2b796');box(x+dx,.665,z,.075,.027,.82,'#b2b796');}
   for(const dx of [-.37,.37])box(x+dx,.31,z-.408,.082,.46,.023,'#8b997b');
   box(x,.40,z+.43,.19,.15,.045,'#2a3d33',0,0,'powerHull');
   box(x,.43,z+.457,.082,.06,.018,signal,glow,0,'box',M.GLASS);
   box(x,.676,z,.29,.013,.22,'#d3d7ad',0,0,'box',M.MATTE);
   for(const dx of [-.18,.18])box(x+dx,.73,z-.18,.052,.15,.06,'#384c3b');box(x,.80,z-.18,.40,.043,.06,'#384c3b');
  }
  if(isPark){
   // Worn field equipment: compact silhouettes, physical status lamps and no floating signs.
   if(s.kind==='clinic'){
    // Rolled dressing and a capped antiseptic bottle beside the overhead cross.
    seg({x:x+.36,y:.88,z:z-.18},{x:x+.36,y:.88,z:z+.04},.066,'#c6c9b1');
    cyl(x-.38,.91,z-.20,.051,.15,'#7b9a8c');cyl(x-.38,1.003,z-.20,.048,.035,'#ccd0bd');
    box(x,.60,z+.370,.082,.23,.016,'#9f4c40');box(x,.60,z+.371,.23,.082,.017,'#9f4c40');
   }else if(s.kind==='bench'){
    // A weapon on the service mat and a shaded work lamp distinguish the tuning bench.
    box(x-.06,.858,z-.06,.40,.052,.095,'#8d9584',0,-.18);
    box(x-.31,.853,z-.105,.21,.058,.12,'#655b47',0,-.18);
    seg({x:x+.12,y:.863,z:z-.026},{x:x+.35,y:.863,z:z+.016},.020,'#28342e');
    box(x-.035,.84,z+.024,.095,.045,.105,'#344237',0,-.18);
    seg({x:x-.51,y:.76,z:z-.29},{x:x-.51,y:1.37,z:z-.29},.026,'#4c5c50');
    seg({x:x-.51,y:1.37,z:z-.29},{x:x-.15,y:1.42,z:z-.11},.022,'#86907b');
    box(x-.15,1.415,z-.11,.29,.075,.17,'#4b5d4d',0,0,'powerHull');
    box(x-.15,1.369,z-.11,.24,.018,.125,online?'#e6ce9a':'#777568',online?.64:0,0,'box',M.GLASS);
    if(online)glows.push({x:x-.14,y:.814,z:z-.03,radius:.46,color:'#e1c38a',strength:.14,mode:0});
   }
  }
  if(online||focused)glows.push({x,y:.044,z,radius:focused?1.10:.86,color:signal,strength:focused?.24:.08,mode:0});
  if(focused)glows.push({x,y:.049,z,radius:.80,color:game.interactionOffer.enabled?'#ffe6aa':'#c78667',strength:.55,mode:-.06});
 }
 // Round fuel drums on the first two maps; Memorial keeps its existing barrels.
 for(const b of isPark?[]:game.barrels||[]){
  const p=simToWorld(b.x,b.y),x=p.x,z=p.z;
  shadows.push({x,y:.013,z,radius:b.spent?.68:.46,color:'#101713',strength:b.spent?.60:.38,mode:0});
  if(b.spent){
   seg({x:x-.05,y:.055,z},{x:x+.08,y:.30,z:z+.035},.258,'#30352f');
   cyl(x+.08,.314,z+.035,.227,.022,'#172320');
   box(x-.18,.060,z+.19,.22,.085,.12,'#4c4e3b',0,.65,'powerHull');
   box(x+.24,.047,z-.12,.20,.06,.13,'#393f34',0,-.35,'powerHull');
  }else{
   cyl(x,.405,z,.275,.79,'#975b40');
   for(const y of [.15,.66])cyl(x,y,z,.286,.055,'#43534c');
   cyl(x,.803,z,.258,.027,'#a79872');
   cyl(x+.115,.829,z-.07,.052,.036,'#3c4a43');
   box(x-.052,.822,z+.04,.22,.009,.22,'#d4ae59',0,Math.PI/4,'box',M.MATTE);
   box(x-.052,.830,z+.04,.035,.007,.11,'#4b422d',0,0,'box',M.MATTE);
   box(x-.052,.831,z+.118,.035,.007,.025,'#4b422d',0,0,'box',M.MATTE);
  }
 }
 // Memorial paving is raised slightly; keep equipment, field marks and contact shadows above it.
 if(isPark){for(const p of parts)p.matrix[13]+=.04;for(const p of glows)p.y+=.04;for(const p of shadows)p.y+=.04;}
 return{parts:parts.concat(shared.parts),glows:glows.concat(shared.glows),shadows:shadows.concat(shared.shadows),ribbons:shared.ribbons,state:shared.state,charge:shared.charge};
}
function obstacleToWorld(r){const p=simToWorld(r.x+r.w/2,r.y+r.h/2);return{x:p.x,z:p.z,w:r.w*SCALE,d:r.h*SCALE};}
function segAabb(ax,az,bx,bz,r,pad=0){let lo=0,hi=1,dx=bx-ax,dz=bz-az;for(const [o,d,min,max] of [[ax,dx,r.x-pad,r.x+r.w+pad],[az,dz,r.y-pad,r.y+r.h+pad]]){if(Math.abs(d)<1e-9){if(o<min||o>max)return Infinity;}else{let t0=(min-o)/d,t1=(max-o)/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return Infinity;}}return lo;}
function shoulderCamera(player,obstacles=[]){
 const a=player.aim||0,f={x:Math.cos(a),z:Math.sin(a)},r={x:-Math.sin(a),z:Math.cos(a)};
 let dist=5.15;const base=simToWorld(player.x,player.y),shoulder=.68;
 let cx=base.x-f.x*dist+r.x*shoulder,cz=base.z-f.z*dist+r.z*shoulder;
 const simCam={x:cx/SCALE+CX,y:cz/SCALE+CY};let hit=1;
 for(const o of obstacles||[]){const t=segAabb(player.x,player.y,simCam.x,simCam.y,o,18);if(t<hit)hit=t;}
 if(hit<1){dist*=Math.max(.3,hit-.075);cx=base.x-f.x*dist+r.x*shoulder;cz=base.z-f.z*dist+r.z*shoulder;}
 return{position:{x:cx,y:3.0,z:cz},target:{x:base.x+f.x*2.15,y:1.15,z:base.z+f.z*2.15},distance:dist};
}
function overheadCamera(player){
 const base=simToWorld(player.x,player.y);
 return{position:{x:base.x,y:15.8,z:base.z+7.4},target:{x:base.x,y:.28,z:base.z},distance:17.45};
}
function arcadeCameraTarget(player,aspect=16/9){
 const base=simToWorld(player.x,player.y),wide=clamp((Number(aspect)||1.78)-1.7,0,1.3);
 const height=14.6+wide*.55,back=6.65+wide*.50,lift=(player.groundHeight||0)*.8;
 return{
  position:{x:base.x,y:height+lift,z:base.z+back},
  target:{x:base.x,y:.28+lift,z:base.z-.18},
  distance:Math.hypot(height-.28,back+.18),
  fov:Math.PI/3.45
 };
}
// One short trail segment per 1/30 second, from positions the simulation actually reached.
function advanceDashTrail(previous,game){
 const p=game.player,boost=game.panic?.boostLeft>0,active=game.status==='playing'&&!game.arcade?.vehicle&&(boost||p?.roll>0);
 if(!active||!p)return{state:null,effect:null};
 const point={x:p.x,y:p.y,height:game.actorHeight?.(p)||p.groundHeight||0},kind=boost?'boost':'dash';
 const state={...point,time:game.time,wave:game.wave,lives:game.lives,kind};
 if(!previous||previous.wave!==game.wave||previous.lives!==game.lives||previous.kind!==kind||game.time<previous.time)return{state,effect:null};
 if(game.time-previous.time<1/30-1e-8)return{state:previous,effect:null};
 const distance=Math.hypot(point.x-previous.x,point.y-previous.y);
 if(distance<1||distance>80)return{state,effect:null};
 const life=boost?.24:.18;
 return{state,effect:{kind:'dashTrail',a:{x:previous.x,y:previous.y,height:previous.height},b:point,life,max:life,color:boost?'#79e6ff':'#a1e5df'}};
}

function fairVisualPlan(game,quality=2){
 const parts=[],glows=[],t=game.time||0,ground=game.arena?.id==='cold'?.265:.085,M=MATERIAL_IDS,n=quality?40:24;
 const add=(mesh,matrix,color,glow=.2)=>parts.push({mesh,matrix,color,glow,material:M.GLASS,cast:false});
 const line=(ax,az,bx,bz,color,width=.026,y=ground)=>add('pickupCylinder',basisModel(ax,y,az,bx,y,bz,width,width),color,.5);
 const ring=(x,z,r,color,fraction=1,dashed=false)=>{for(let i=0;i<Math.ceil(n*fraction);i++){if(dashed&&i%2)continue;const a=i/n*Math.PI*2,b=Math.min((i+1)/n,fraction)*Math.PI*2;line(x+Math.cos(a)*r,z+Math.sin(a)*r,x+Math.cos(b)*r,z+Math.sin(b)*r,color);}};
 const orb=(x,y,z,r,color)=>add('pickupOrb',model(x,y,z,r,r,r),color,.9);
 for(const d of game.decoys||[]){
  const q=simToWorld(d.x,d.y),flight=clamp((t-d.thrownAt)/.28,0,1),life=clamp(d.left/(d.total||8),0,1);
  if(flight<1){const a=simToWorld(d.fromX,d.fromY);orb(lerp(a.x,q.x,flight),1.1+Math.sin(flight*Math.PI)*2.1,lerp(a.z,q.z,flight),.13,'#9cfff0');continue;}
  const pulse=(t-d.landAt)/.8%1;
  add('pickupCylinder',model(q.x,.22,q.z,.20,.18,.20),'#456e72',.1);orb(q.x,.48,q.z,.105,'#9cfff0');
  ring(q.x,q.z,d.radius*SCALE,'#62b9b7',1,true);ring(q.x,q.z,(d.radius*SCALE)*pulse,'#6bcac5',1,true);
  ring(q.x,q.z,.70,'#365a61');ring(q.x,q.z,.70,'#b0fff0',life);
  glows.push({x:q.x,y:ground,z:q.z,radius:1.45,color:'#70ebd3',strength:.12+.12*(1-pulse),mode:0});
 }
 if(game.lurePreview){const q=simToWorld(game.lurePreview.x,game.lurePreview.y);ring(q.x,q.z,game.lurePreview.radius*SCALE,'#a0fff2',1,true);ring(q.x,q.z,.55,'#d4fff5');line(q.x-.75,q.z,q.x+.75,q.z,'#b1fff0');line(q.x,q.z-.75,q.x,q.z+.75,'#b1fff0');}
 for(const z of game.zombies||[]){
  if(z.dead)continue;const f=z.coldFight,q=simToWorld(z.x,z.y),slam=f?.phase==='slam'||z.bossPhase==='slam',recover=f&&['recover','stunned'].includes(f.phase);
  if(slam){const total=z.boss?1:.9,radius=(z.boss?128:90)*SCALE,left=z.boss?z.bossTimer:f.left;ring(q.x,q.z,radius,'#ffb075');ring(q.x,q.z,radius*clamp(1-left/total,0,1),'#ff725d');glows.push({x:q.x,y:ground,z:q.z,radius:radius*.9,color:'#dd653c',strength:.09,mode:0});}
  if(f?.phase==='windup'&&f.charge){const c=f.charge,half=(z.r+13)*SCALE,len=c.length*SCALE,nx=-c.dy,nz=c.dx;
   for(const side of [-1,1])line(q.x+nx*half*side,q.z+nz*half*side,q.x+c.dx*len+nx*half*side,q.z+c.dy*len+nz*half*side,'#ffb173');
   for(let d=.5;d<len;d+=1.2){const x=q.x+c.dx*d,zz=q.z+c.dy*d;for(const side of [-1,1])line(x-c.dx*.28+nx*.22*side,zz-c.dy*.28+nz*.22*side,x,zz,'#ffd9a0');}
  }
  if(f){const a=z.aim||0,bx=q.x-Math.cos(a)*.42,bz=q.z-Math.sin(a)*.42,color=recover?'#9dffe1':'#5c93a1';
   add('pickupCylinder',model(bx,1.44,bz,.14,.29,.14),color,recover?1.0:.1);orb(bx,1.8,bz,.13,recover?'#d1ffe9':'#78afb7');
   if(recover){ring(q.x,q.z,1.1,'#82e3c6',clamp(f.left/2.6,0,1));glows.push({x:bx,y:1.72,z:bz,radius:.5,color:'#84ffd6',strength:.30,mode:1});}
  }
 }
 const c=game.coldSnap;
 if(c&&c.pallet.phase!=='spent'){
  const r=globalThis.DeadwatchCore.COLD_SNAP_RULES.pallet,q=simToWorld(r.x+r.w/2,r.y+r.h/2),w=r.w*SCALE/2,d=r.h*SCALE/2,warning=c.pallet.phase==='warning',down=c.pallet.phase==='down',age=t-c.pallet.at,color=warning?'#ffab61':'#8c956f';
  if(!down){for(let j=-2;j<=2;j++)line(q.x-w+.10,q.z+j*d/3,q.x+w-.10,q.z+j*d/3+.23,color,.045);ring(q.x,q.z,.38,color,warning?clamp(age/.7,0,1):1);}
  if(down&&age<.8){const u=age/.8;ring(q.x,q.z,.6+u*2.7,'#ccb991');for(let k=0;k<(quality?10:5);k++){const a=k*2.399,y=.25+u*2.2-u*u*2.2;add('pickupRoundBox',model(q.x+Math.cos(a)*u*2.1,y,q.z+Math.sin(a)*u*1.8,.08,.04,.15,a+u*3),'#a49778',0);}}
 }
 if(game.evac&&['defending','boarding'].includes(game.evac.phase))for(const [i,node] of (game.evac.repairNodes||[]).entries()){
  const q=simToWorld(node.x,node.y),cool=node.readyAt>t,fraction=clamp(node.progress/1.35,0,1),color=cool?'#779294':'#9bf1b5';
  ring(q.x,q.z,.78,color,1,true);if(fraction>0)ring(q.x,q.z,.95,'#d6ffe1',fraction);
  line(q.x-.22,q.z,q.x+.22,q.z,color,.055);line(q.x,q.z-.22,q.x,q.z+.22,color,.055);
  for(let j=0;j<=i;j++)orb(q.x+(j-i/2)*.18,.20,q.z-.51,.045,color);
  glows.push({x:q.x,y:.065,z:q.z,radius:1.2,color,strength:cool?.06:.13,mode:0});
 }
 return{parts,glows};
}

function breakerVisualPlan(z,pose){
 const parts=[],glows=[];if(!z.boss||pose.alpha<.55)return{parts,glows};
 const multiply=(a,b)=>{const m=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)m[c*4+r]+=a[k*4+r]*b[c*4+k];return m;};
 // Curved plate, domed helmet and unequal shoulder caps follow the existing skin palette.
 const armor=(bone,x,y,zz,sx,sy,sz,color,mesh='breakerShell',front=false,material=MATERIAL_IDS.METAL)=>{
  const local=model(x,y,zz,sx,sy,sz);
  if(front){local[5]=0;local[6]=sy;local[9]=-sz;local[10]=0;}
  parts.push({mesh,matrix:multiply(pose.matrix,multiply(pose.palette.subarray(bone*16,bone*16+16),local)),color,glow:0,material});
 };
 // A fitted breastplate leaves the waist, neck and ruined uniform visible.
 armor(3,0,1.29,.115,.205,.080,.235,'#535e56','breakerShell',true);
 armor(3,0,1.12,.10,.170,.052,.090,'#353f37','breakerShell',true);
 armor(3,-.085,1.45,.137,.035,.013,.045,'#8c8060','pickupWeaponOrb',false,MATERIAL_IDS.LEATHER);
 armor(3,.085,1.45,.137,.035,.013,.045,'#8c8060','pickupWeaponOrb',false,MATERIAL_IDS.LEATHER);
 // One battered pauldron sits lower and smaller, breaking the matching-block silhouette.
 armor(32,-.30,1.425,0,.165,.110,.175,'#626c61');
 armor(8,.30,1.415,0,.135,.085,.145,'#4a584c');
 for(const [bone,x,y] of [[32,-.30,1.536],[8,.30,1.501]])
  armor(bone,x,y,.025,.048,.006,.072,'#9d8e62','pickupWeaponOrb');
 // Low steel dome and a thin rolled rim replace the square helmet and visor.
 armor(6,0,1.679,-.012,.184,.185,.194,'#455247');
 armor(6,0,1.682,-.012,.191,.012,.201,'#737d69','pickupWeaponOrb');
 // Small shallow wear marks stay on the curved metal instead of raised rectangular trim.
 armor(32,-.345,1.501,.082,.030,.005,.024,'#8d9180','pickupWeaponOrb');
 armor(6,-.070,1.818,.068,.027,.006,.023,'#8b927c','pickupWeaponOrb');
 if(z.dead)return{parts,glows};
 const c=z.bossCharge,color=z.bossPhase==='recover'?'#86e5b5':'#e7a05b';
 glows.push({x:pose.shadow.x,y:.075,z:pose.shadow.z,radius:1.20,color,strength:z.bossPhase==='recover'?.30:.06,mode:-.055});
 if(z.bossPhase==='windup'&&c){
  const p=simToWorld(z.x,z.y),length=c.length*SCALE,nx=-c.dy,nz=c.dx,half=44*SCALE;
  const line=(ax,az,bx,bz,r,col)=>parts.push({mesh:'pickupCylinder',matrix:basisModel(ax,.09,az,bx,.09,bz,r,r),color:col,glow:.8,material:MATERIAL_IDS.GLASS});
  for(const side of [-1,1])line(p.x+nx*half*side,p.z+nz*half*side,p.x+c.dx*length+nx*half*side,p.z+c.dy*length+nz*half*side,.024,'#ffbd68');
  for(let d=.75;d<length-.25;d+=1.2){const x=p.x+c.dx*d,zz=p.z+c.dy*d;for(const side of [-1,1])line(x-c.dx*.23+nx*.22*side,zz-c.dy*.23+nz*.22*side,x,zz,.035,'#ffe6a0');}
 }
 return{parts,glows};
}

function emptyPresentationMetrics(){return{
 drawCalls:0,actorPartInstances:0,visibleZombies:0,effectInstances:0,frameMs:0,
 cameraPosition:null,cameraTarget:null,nearestZombieScreenSize:null,walkerMotion:null
};}
function buildRenderSnapshot(game,visual={}){
 Voidcaster.prepare(game);
 const surface=q=>game.actorHeight?.(q)||0;
 const cloneActor=(z)=>({r:z.r||14,coldFight:z.coldFight?{...z.coldFight,charge:z.coldFight.charge?{...z.coldFight.charge}:null}:null,...(game.coldSnap?{coldFrozenUntil:z.coldFrozenUntil||0,coldCoatUntil:z.coldCoatUntil||0,coldShattered:!!z.coldShattered,coldWakeUntil:z.coldWakeUntil||0}:{}),...(z.graveRise>0?{graveId:z.graveId,graveRise:z.graveRise,graveTotal:z.graveTotal}:{}),groundHeight:surface(z),id:z.id||0,x:+z.x||0,y:+z.y||0,aim:+z.aim||0,speed:+z.speed||0,kind:z.kind||'walker',hp:+z.hp||0,maxHp:+z.maxHp||0,dead:!!z.dead,hunter:!!z.hunter,boss:!!z.boss,bossPhase:z.bossPhase,bossTimer:+z.bossTimer||0,bossCharge:z.bossCharge?{...z.bossCharge}:null,attack:!!z.attack,deathTime:+z.deathTime||0,flash:+z.flash||0});
 const cloneList=(list)=>(list||[]).map(q=>({...q,groundHeight:surface(q)})),arena=game.arena||null,p=visual.renderPlayer||game.player||null;
 const arenaCopy=arena?{id:arena.id||'depot',name:arena.name||'',theme:Array.isArray(arena.theme)?[...arena.theme]:arena.theme||null}:null;
 return{
   time:+game.time||0,arenaTime:+game.waveTime||0,depotSequence:visual.depotSequence||null,power:!!game.power,respawnShield:+game.respawnShield||0,interactionOffer:game.interactionOffer?.()||null,arena:arenaCopy,arenaId:arenaCopy?.id||'depot',theme:arenaCopy?.theme||null,
  player:p?{groundHeight:surface({...p,arcade:game.arcade}),x:+p.x||0,y:+p.y||0,aim:+p.aim||0,vx:+p.vx||0,vy:+p.vy||0,hp:+p.hp||0,maxHp:+p.maxHp||0,step:+p.step||0,recoil:+p.recoil||0,fireCooldown:+p.fireCooldown||0}:null,
  lurePreview:game.lurePreview?{...game.lurePreview,radius:360}:null,
  coldSnap:game.coldSnap?{...game.coldSnap,doors:game.coldSnap.doors.map(d=>({...d})),valves:game.coldSnap.valves.map(v=>({...v})),pallet:{...game.coldSnap.pallet},breach:{...game.coldSnap.breach,cargo:[...game.coldSnap.breach.cargo]},shards:game.coldSnap.shards.map(s=>({...s}))}:null,
  graveyard:game.arena?.id==='memorial'&&game.graveyard?{scars:[...game.graveyard.scars],risen:game.graveyard.risen}:null,
  campAir:game.campAir?{...game.campAir,cargo:undefined}:null,
   evac:game.evac?{...game.evac,targets:undefined,repairNodes:game.evac.repairNodes?.map(n=>({...n}))}:null,
  squad:cloneList(game.squad),railTrain:game.railTrain?{variant:game.railTrain.variant,phase:game.railTrain.phase,lead:game.railTrain.lead,door:game.railTrain.door,left:game.railTrain.left}:null,trainCrew:game.railTrain?.door>.72?cloneList(game.railTrain.crew):[],pumpOverload:game.pumpOverload?{...game.pumpOverload}:null,
  exits:game.status==='exiting'?cloneList(game.exits):[],
  zombies:(game.zombies||[]).map(cloneActor),obstacles:cloneList((game.obstacles||[]).filter(o=>!o.railTrainBody&&!o.campWreck&&!o.evacHeli&&!o.coldBarrier)),barrels:cloneList(game.barrels),stations:cloneList(game.stations),
  trap:game.trap?{...game.trap,groundHeight:surface(game.trap)}:null,warnings:cloneList(game.warnings),antiCamp:{breachWarnings:cloneList(game.antiCamp?.breachWarnings)},decoys:cloneList(game.decoys),
  pickups:cloneList(game.pickups),arcadePickups:cloneList(game.arcadePickups),lootPickups:cloneList(game.lootPickups),arcade:{vehicle:game.arcade?.vehicle||null,weapon:game.arcade?.weapon||null,voidVariant:game.arcade?.voidVariant||null,shots:game.arcade?.shots||0},
  companion:game.companion?{...game.companion}:null,reinforcement:game.reinforcement?{...game.reinforcement}:null,animalProjectiles:cloneList(game.animalProjectiles),
  effects:{flashes:cloneList(visual.flashes),blasts:cloneList(visual.blasts),tracers:cloneList(visual.tracers),splats:cloneList(visual.splats)}
 };
}
// Cached North Depot dressing. Uses existing building colliders and fenced service areas.
const DEPOT_DETAILED_PROPS=new Set(['truck','forklift','container','puddle']);
function northDepotDecor(source){
 const solid=new Set(['truck','forklift','container','drum','crate','pallet','cableReel','dumpster','barrier','cone','sign','worklight']);
 return source.filter(p=>!['fence','light','worklight'].includes(p.kind)).map(p=>{
  if(!solid.has(p.kind))return p;
  const q={...p};
  if(Math.abs(p.x)>16){q.x=Math.sign(p.x)*(25.25+(p.w||1)/2);}
  else q.z=Math.sign(p.z||1)*(18.70+(p.d||1)/2);
  return q;
 });
}
function northDepotDetailPlan(obstacles,decor=[]){
 const parts=[],lights=[],fixtures=[],shadowParts=[],M={...MATERIAL_IDS,ASPHALT:MATERIAL_IDS.DEPOT_ASPHALT,CONCRETE:MATERIAL_IDS.DEPOT_CONCRETE,METAL:MATERIAL_IDS.DEPOT_METAL,MATTE:MATERIAL_IDS.DEPOT_PAINT,WET:MATERIAL_IDS.DEPOT_WET};
 const add=(mesh,matrix,color,material=M.METAL,glow=0)=>parts.push({mesh,matrix,color,material,glow});
 const box=(x,y,z,w,h,d,color,angle=0,material=M.METAL,glow=0)=>add('box',model(x,y,z,w/2,h/2,d/2,angle),color,material,glow);
 const oval=(x,y,z,w,h,d,color,material=M.METAL,glow=0)=>add('pickupOrb',model(x,y,z,w,h,d),color,material,glow);
 // basisModel is left-handed; the outward pickup cylinder needs a right-handed frame.
 const seg=(a,b,r,color,material=M.METAL)=>{const m=basisModel(...a,...b,r,r);for(const k of [0,1,2])m[k]*=-1;add('pickupCylinder',m,color,material);};
 const paint=(x,z,w,d,color='#999471',angle=0)=>box(x,.026,z,w,.009,d,color,angle,M.MATTE);
 // The district floor stays below the playable yard, with no near-coplanar overlap.
 box(0,-.16,0,220,.16,180,'#263b3f',0,M.ASPHALT);
 const fixture=(x,y,z,color,powered=true,phase=0,radius=5.5,gx=x,gz=z)=>{
  const index=fixtures.length;fixtures.push({x,y,z,color,powered,phase,radius});
  lights.push({x:gx,y:.058,z:gz,radius:radius*.44,color,strength:.28,mode:0,fixture:index});return index;
 };
 for(const [index,o] of obstacles.entries()){
  const r=obstacleToWorld(o);if(r.w*r.d<=8)continue;
  const h=buildingHeight(o),roof=h+.16,left=r.x<0,normal=left?1:-1,inner=r.x+normal*r.w/2,outer=r.x-normal*r.w/2;
  shadowParts.push({mesh:'box',matrix:model(r.x,h/2,r.z,r.w/2,h/2,r.d/2)});
  const wallColor=index%2?'#827b65':'#637e80',trim='#899089',dark='#24393d';
  // Thin facade skins, foundation bands and corner pilasters stay against the collider.
  for(const x of [inner,outer]){
   box(x,.58,r.z,.035,1.14,r.d,wallColor,0,M.CONCRETE);
   box(x,.13,r.z,.055,.25,r.d,'#303c3b',0,M.CONCRETE);
   box(x,h-.18,r.z,.06,.10,r.d,trim);
   for(const z of [r.z-r.d/2+.06,r.z+r.d/2-.06])box(x,h/2,z,.085,h,.14,'#697773');
  }
  for(const z of [r.z-r.d/2,r.z+r.d/2])box(r.x,.5,z,r.w,.97,.036,wallColor,0,M.CONCRETE);
  // Recessed roof panels, metal seams and parapet caps make the overhead silhouette readable.
  for(const side of [-1,1]){
   box(r.x+side*(r.w/2-.075),roof+.075,r.z,.13,.15,r.d,'#687b7b');
   box(r.x,roof+.075,r.z+side*(r.d/2-.075),r.w-.12,.15,.13,'#687b7b');
   box(r.x+side*(r.w/2-.25),roof+.015,r.z,.08,.025,r.d-.32,'#152a30');
  }
  for(let dz=-r.d/2+.6;dz<r.d/2-.4;dz+=1.45){
   box(r.x,roof+.02,r.z+dz,r.w-.42,.025,.032,'#617777');
   box(r.x,roof+.015,r.z+dz+.09,r.w-.48,.018,.045,'#20363b');
  }
  for(const dz of [-r.d*.32,r.d*.29])box(r.x+r.w*.12,roof+.017,r.z+dz,r.w*.36,.018,.70,'#354d50',0,M.MATTE);
  // Loading bays face the central yard, rather than only dressing the short end walls.
  for(let bay=0;bay<4;bay++){
   const z=r.z-r.d/2+2.0+bay*(r.d-4)/3,face=inner+normal*.055;
   if(bay===1||bay===3){
    box(face,1.02,z,.075,1.95,2.35,dark);
    box(face+normal*.047,1.03,z,.028,1.75,2.16,index%2?'#a3966d':'#739897');
    for(let j=0;j<7;j++)box(face+normal*.068,.28+j*.225,z,.016,.025,2.12,'#344c50');
    for(const dz of [-1.20,1.20])box(face+normal*.018,1.02,z+dz,.11,2.06,.10,trim);
    box(face+normal*.09,.92,z+.75,.07,.055,.21,'#b6b799');
    for(let j=-2;j<=2;j++)paint(inner+normal*.24,z+j*.40,.25,.22,j%2?'#b6a15f':'#394747');
   }else{
    for(const dz of [-.72,.72]){
     box(face,1.55,z+dz,.09,.64,1.04,dark);
     box(face+normal*.051,1.55,z+dz,.020,.50,.88,bay===0?'#647f85':'#3b5356',0,MATERIAL_IDS.DEPOT_GLASS,.035);
     box(face+normal*.07,1.55,z+dz,.03,.54,.035,'#a1aaa0');
     box(face+normal*.07,1.55,z+dz,.03,.035,.92,'#a1aaa0');
     box(face+normal*.065,1.23,z+dz,.11,.06,1.10,'#87938c');
    }
   }
   if(bay===1||bay===3){
    box(face+normal*.11,2.14,z,.24,.10,.50,'#26373a');
    box(face+normal*.15,2.09,z,.26,.035,.38,'#ffe3a0',0,M.GLASS,.75);
    parts[parts.length-1].fixture=fixture(face+normal*.25,2.04,z,'#ffd79b',true,0,5.6,inner+normal*1.12,z);
    // Shallow awnings cast a readable edge above the existing loading doors.
    box(inner+normal*.43,2.43,z,.86,.10,2.76,index%2?'#aa915e':'#618d93');
    box(inner+normal*.87,2.39,z,.06,.18,2.80,'#b2aa87');
    for(const dz of [-1.05,1.05])seg([inner+normal*.06,1.99,z+dz],[inner+normal*.76,2.37,z+dz],.025,'#697d7d');
   }
  }
  // One framed service door on each end, with a sealed window above it.
  for(const side of [-1,1]){
   const z=r.z+side*(r.d/2+.04),x=r.x-r.w*.20;
   box(x,.99,z,1.04,1.96,.075,dark);box(x,.97,z+side*.045,.86,1.80,.025,'#65726b');
   box(x+.29,1.02,z+side*.064,.13,.045,.034,'#d1c49b');
   box(r.x+r.w*.22,1.54,z,.96,.57,.07,dark);box(r.x+r.w*.22,1.54,z+side*.045,.82,.43,.02,'#66858a',0,MATERIAL_IDS.DEPOT_GLASS,.035);
  }
  // Flat maintenance apron: no raised curb or new obstacle along escape routes.
  box(inner+normal*.46,.012,r.z,.88,.016,r.d-.25,'#465457',0,M.CONCRETE);
  for(let dz=-r.d/2+1;dz<r.d/2;dz+=2.7){paint(inner+normal*.46,r.z+dz,.87,.018,'#26383b');paint(inner+normal*.92,r.z+dz,.045,1.55,'#aea477');}
 }
 // Worn center-lane paint, branching asphalt cracks and flush repair patches.
 for(let z=-12.6;z<=12.6;z+=3.1){paint(-.07,z,.065,1.10,'#858875');paint(.08,z+.18,.03,.46,'#545f57');}
 for(const [x,z,a] of [[-5.5,-5.8,.5],[4.2,4.5,-.35],[-2.8,9.8,.8],[5.5,-10.6,-.3]]){
  const co=Math.cos(a),si=Math.sin(a),pt=(u,v)=>({x:x+u*co-v*si,z:z+u*si+v*co});
  const line=(a,b,w)=>{const u=pt(...a),v=pt(...b);box((u.x+v.x)/2,.028,(u.z+v.z)/2,Math.hypot(v.x-u.x,v.z-u.z),.010,w,'#182d32',-Math.atan2(v.z-u.z,v.x-u.x),M.MATTE);};
  line([-1.1,0],[-.25,.15],.022);line([-.25,.15],[.35,-.08],.025);line([.35,-.08],[1.2,.12],.020);line([-.25,.15],[-.42,.68],.014);line([.35,-.08],[.66,-.60],.014);
 }
 for(const [x,z] of [[-5.2,5.3],[4.8,-4.1]]){box(x,.012,z,1.9,.016,1.18,'#304449',.13,M.ASPHALT);paint(x-.65,z+.27,.40,.023,'#526365',.13);}
 // Existing equipment receives new detail in fenced service areas.
 for(const p of decor){
  const c=p.color||'#647677';
  if(p.kind==='container'){
   box(p.x,p.h/2,p.z,p.w,p.h,p.d,c);
   for(const z of [p.z-p.d/2-.013,p.z+p.d/2+.013])for(let x=-p.w/2+.18;x<p.w/2;x+=.32)box(p.x+x,p.h/2,z,.033,p.h*.86,.045,'#394f52');
   for(const z of [p.z-p.d/2,p.z+p.d/2])box(p.x,p.h+.03,z,p.w,.055,.065,'#a0a28b');
   for(const x of [-p.w*.23,p.w*.23])box(p.x+x,p.h+.04,p.z,.035,.04,p.d*.86,'#8a8c73');
  }else if(p.kind==='truck'){
   const cab=p.x+p.w*.31,bed=p.x-p.w*.14;
   box(p.x,.34,p.z,p.w*.92,.23,p.d*.90,'#253539');
   box(bed,.98,p.z,p.w*.61,1.02,p.d*.94,c);box(bed,1.51,p.z,p.w*.64,.08,p.d,'#788580');
   add('powerHull',model(cab,.98,p.z,p.w*.17,.48,p.d*.47),c);
   box(cab,1.48,p.z,p.w*.34,.075,p.d*.94,'#85948e');
   for(const side of [-1,1]){
    box(cab,1.21,p.z+side*p.d*.473,p.w*.23,.32,.025,'#77999e',0,MATERIAL_IDS.DEPOT_GLASS,.045);
    box(cab-.08,.81,p.z+side*p.d*.48,p.w*.25,.018,.026,'#a9b19d');
    for(const dx of [-p.w*.29,p.w*.31]){seg([p.x+dx,.30,p.z+side*p.d*.40],[p.x+dx,.30,p.z+side*p.d*.56],.29,'#1c282a',M.RUBBER);seg([p.x+dx,.30,p.z+side*p.d*.55],[p.x+dx,.30,p.z+side*p.d*.575],.12,'#9a9e8c');}
   }
   box(p.x+p.w*.488,.58,p.z,.085,.15,p.d*.94,'#a1a896');
   box(p.x+p.w*.482,.94,p.z,.035,.20,p.d*.36,'#263a3e');
   for(const dz of [-p.d*.32,p.d*.32])box(p.x+p.w*.505,.93,p.z+dz,.03,.12,.20,'#d7ce9c',0,M.GLASS,.08);
  }else if(p.kind==='forklift'){
   add('powerHull',model(p.x,.49,p.z,.58,.25,.48),c);
   box(p.x+.20,.90,p.z,.28,.55,.47,'#293a3a');box(p.x,.71,p.z,.45,.11,.50,'#405151');
   for(const z of [-.46,.46])for(const x of [-.43,.43]){seg([p.x+x,.25,p.z+z-.06],[p.x+x,.25,p.z+z+.06],.22,'#1d2b2c',M.RUBBER);}
   for(const z of [-.41,.41]){box(p.x-.28,1.17,p.z+z,.055,1.05,.055,'#6d7771');box(p.x+.43,1.17,p.z+z,.055,1.05,.055,'#6d7771');}
   box(p.x+.08,1.72,p.z,.94,.06,.99,'#d3b46b');
   for(const z of [-.27,.27]){box(p.x-.62,.88,p.z+z,.085,1.44,.065,'#36494b');box(p.x-1.04,.19,p.z+z,.89,.055,.11,'#939c91');}
  }else if(p.kind==='puddle'){
   oval(p.x,.013,p.z,p.w*.48,.007,p.d*.43,'#183940',M.WET,.04);oval(p.x+p.w*.26,.014,p.z+p.d*.10,p.w*.24,.008,p.d*.30,'#193b42',M.WET,.05);
   box(p.x-p.w*.09,.025,p.z-p.d*.10,p.w*.32,.006,.022,'#617c7d',-.1,M.WET,.03);
  }
 }

 // Thin, outward-facing stain patches read as surface wear instead of black holes.
 for(const p of groundDetailPlan('depot'))if(p.kind==='oilStain'){
  oval(p.x,.012,p.z,p.w*.49,.006,p.d*.43,'#30464a',M.ASPHALT);
  oval(p.x+p.w*.22,.018,p.z+p.d*.14,p.w*.25,.005,p.d*.30,'#2e4448',M.ASPHALT);
 }
 // Connected service aprons and roads continue beyond the playable perimeter.
 for(const side of [-1,1]){
  box(side*29.5,-.075,0,8.6,.15,36.4,'#384c4f',0,M.CONCRETE);
  box(0,-.075,side*21,67.6,.15,5.6,'#384c4f',0,M.CONCRETE);
  box(0,-.057,side*28,100,.018,7.0,'#21363c',0,M.ASPHALT);
  box(side*38,-.057,0,7,.018,63,'#21363c',0,M.ASPHALT);
  box(0,-.026,side*25.7,8,.022,15,'#30464a',0,M.ASPHALT);
  for(let x=-46;x<48;x+=5.4)paint(x,side*28,2.35,.065,'#807f68');
  for(let z=-29;z<30;z+=5.4)paint(side*38,z,.065,2.35,'#807f68');
  for(let x=-28;x<=28;x+=7)paint(x,side*22.6,3.3,.055,'#8d937b',Math.PI/2);
 }
 // Continuous open fencing replaces separated opaque panels at the same boundary.
 const fence=(x1,z1,x2,z2,count)=>{
  for(let i=0;i<=count;i++){
   const x=x1+(x2-x1)*i/count,z=z1+(z2-z1)*i/count;
   seg([x,0,z],[x,1.40,z],.036,'#87938b');
   if(i===count)continue;
   const nx=x1+(x2-x1)*(i+1)/count,nz=z1+(z2-z1)*(i+1)/count;
   for(const y of [.17,1.31])seg([x,y,z],[nx,y,nz],.025,'#637775');
   seg([x,.20,z],[nx,1.28,nz],.013,'#516a6b');seg([x,1.28,z],[nx,.20,nz],.013,'#516a6b');
  }
 };
 fence(-24.45,-17.55,24.45,-17.55,12);fence(-24.45,17.55,24.45,17.55,12);
 fence(-24.45,-17.55,-24.45,17.55,9);fence(24.45,-17.55,24.45,17.55,9);
 // Gatehouse at the north entrance, entirely outside the combat boundary.
 box(7.6,1.16,-22.6,4.2,2.32,3.2,'#69766c',0,M.CONCRETE);
 box(7.6,2.46,-22.6,4.55,.28,3.55,'#3d565c');
 for(const x of [6.55,7.75]){
  box(x,1.48,-20.97,.96,.70,.06,'#263c43');
  box(x,1.48,-20.928,.80,.53,.022,'#94b5aa',0,M.GLASS,.12);
  parts[parts.length-1].fixture=fixture(x,1.48,-20.84,'#b9e2d0',true,0,3.5,x,-20.45);
 }
 box(9.02,1.04,-20.95,.63,1.97,.09,'#263c40');box(9.02,1.04,-20.89,.51,1.79,.025,'#8c9686');
 box(7.3,2.07,-20.87,2.9,.16,.05,'#c3b478');
 seg([8.6,2.63,-22.9],[8.6,4.7,-22.9],.039,'#a8b4a3');
 for(const y of [3.7,4.15])seg([8.16,y,-22.9],[9.04,y,-22.9],.022,'#708887');
 box(-4.7,.52,-20.2,.38,1.04,.45,'#9a8661');box(-.3,.86,-20.2,8.5,.10,.13,'#b9b59a');
 for(let x=-4.2;x<3.9;x+=.75)box(x,.865,-20.2,.34,.105,.14,'#655844');
 // Low distant warehouses frame the district without entering the escape routes.
 for(const [x,z,w,d,c] of [[-18,-36,22,9,'#566966'],[20,-36,16,9,'#646f5e'],[-19,35,24,8,'#556b70'],[21,35,18,8,'#746d57']]){
  box(x,1.20,z,w,2.55,d,c,0,M.CONCRETE);box(x,2.58,z,w+.24,.22,d+.24,'#344e55');
  const side=z<0?1:-1,face=z+side*d/2;
  for(let dx=-w/2+2;dx<w/2;dx+=4.2){box(x+dx,1.0,face+side*.045,2.45,1.96,.08,'#879087');box(x+dx,2.12,face+side*.10,2.64,.12,.24,'#adb095');}
  for(let dx=-w/2+.6;dx<w/2;dx+=2.2)box(x+dx,2.706,z,.035,.023,d-.2,'#6f8888');
 }
 // Existing pole positions, now lit by the same power state as the loading bays.
 for(const [x,z] of [[-20,-14],[0,-14],[20,-14],[-20,14],[0,14],[20,14]]){
  seg([x,.02,z],[x,3.12,z],.054,'#687b75');box(x,3.12,z,.55,.13,.30,'#354c51');
  box(x,3.045,z,.42,.026,.23,'#ffe3a6',0,M.GLASS,.7);
  parts[parts.length-1].fixture=fixture(x,3.0,z,'#ffe0a4',true,0,6.2);
 }
 // A steady emergency beacon keeps the north entrance recognizable before power-up.
 box(7.6,2.78,-22.6,.30,.18,.30,'#dc8556',0,M.GLASS,.5);
 parts[parts.length-1].fixture=fixture(7.6,2.85,-22.6,'#ed9b70',false,1.7,4.2);
 // Yard identity is scenery only: flat route markings and equipment inside the old roofs.
 // Merge adjoining stencil pixels into strips to keep the cached instance count small.
 const glyphs={
  N:['10001','11001','10101','10011','10001'],O:['01110','10001','10001','10001','01110'],
  R:['11110','10001','11110','10100','10010'],T:['11111','00100','00100','00100','00100'],
  H:['10001','10001','11111','10001','10001'],D:['11110','10001','10001','10001','11110'],
  E:['11111','10000','11110','10000','11111'],P:['11110','10001','11110','10000','10000'],
  '0':['01110','10001','10001','10001','01110'],'1':['00100','01100','00100','00100','01110'],
  '2':['11110','00001','01110','10000','11111']
 };
 const stencil=(text,x,y,z,size,color,wall=false)=>{
  const start=x-(text.length*6-1)*size/2;
  [...text].forEach((letter,k)=>(glyphs[letter]||[]).forEach((row,j)=>{
   for(let a=0;a<row.length;a++)if(row[a]==='1'){
    let b=a+1;while(row[b]==='1')b++;
    const px=start+(k*6+(a+b)/2)*size;
    if(wall)box(px,y+(2-j)*size,z,(b-a)*size*.92,size*.88,.022,color,0,M.MATTE);
    else box(px,y,z+(j-2)*size,(b-a)*size*.92,.012,size*.88,color,0,M.MATTE);
    a=b-1;
   }
  }));
 };
 for(const [index,o] of obstacles.entries()){
  const r=obstacleToWorld(o);if(r.w*r.d<=8)continue;
  const roof=buildingHeight(o)+.16,accent=index%2?'#b29255':'#61979b',inner=r.x+(r.x<0?1:-1)*r.w/2;
  box(r.x,roof+.007,r.z,r.w-.28,.012,r.d-.30,index%2?'#615b50':'#46636a');
  for(const side of [-1,1]){
   box(r.x+side*(r.w/2-.20),roof+.05,r.z,.18,.035,r.d-.38,accent);
   box(r.x,1.98,r.z+side*(r.d/2+.031),r.w-.2,.22,.025,accent);
  }
  for(const x of [r.x-r.w/2-.028,r.x+r.w/2+.028])box(x,1.98,r.z,.026,.22,r.d-.20,accent);
  // Big roof numbers stay legible from the actual overhead camera.
  stencil(index%2?'02':'01',r.x,roof+.078,r.z-r.d*.34,.31,'#bfc2a7');
  // A pitched daylight monitor and exhaust stack sit wholly over solid warehouse space.
  // Pitched glazing and exposed frames replace the old flat monitor lid.
  const mz=r.z+r.d*.31,base=roof+.28,rise=.62,run=1.06;
  box(r.x,roof+.15,mz,r.w*.58,.30,2.16,'#304247');
  add('arenaGable',model(r.x,base,mz,r.w*.28,rise,run),'#435b60',M.METAL);
  const pitch=Math.atan2(rise,run),length=Math.hypot(rise,run);
  for(const side of [-1,1]){
   for(let pane=-1;pane<=1;pane++){
    const a=side*pitch,co=Math.cos(a),si=Math.sin(a),m=model(r.x+pane*r.w*.177,base+rise*.5+.018,mz+side*run*.5,r.w*.076,.008,length*.45);
    m[5]=co*.008;m[6]=si*.008;m[9]=-si*length*.45;m[10]=co*length*.45;
    add('box',m,pane===1&&index===1?'#516565':'#6f98a2',MATERIAL_IDS.DEPOT_GLASS);
   }
   seg([r.x-r.w*.29,base+.018,mz+side*run],[r.x+r.w*.29,base+.018,mz+side*run],.029,'#a6b3a9');
   for(const offset of [-.28,-.088,.088,.28])seg([r.x+offset*r.w,base+.028,mz+side*run],[r.x+offset*r.w,base+rise+.026,mz],.022,'#95a89f');
  }
  seg([r.x-r.w*.30,base+rise+.035,mz],[r.x+r.w*.30,base+rise+.035,mz],.040,'#b1b9a6');
  seg([r.x-r.w*.26,roof,r.z+1.0],[r.x-r.w*.26,roof+.72,r.z+1.0],.14,'#7c8980');
  box(r.x-r.w*.26,roof+.75,r.z+1.0,.48,.08,.48,'#52666b');
  // Loading-bay pads remain flush; their edges guide the eye without narrowing a route.
  for(const dz of [-3.8,6.3]){
   const x=inner+(r.x<0?1:-1)*1.7,z=r.z+dz;
   box(x,.008,z,2.5,.012,2.8,index%2?'#3d4948':'#3b5054',0,M.CONCRETE);
   for(const sign of [-1,1])paint(x,z+sign*1.28,2.15,.065,'#828879');
  }
 }
 // Quiet broad surface changes give the central junction and power station a home.
 box(0,.007,0,12.6,.010,6.0,'#2e4449',0,M.ASPHALT);
 box(0,.013,4.55,3.3,.014,2.7,'#455551',0,M.CONCRETE);
 for(const side of [-1,1]){
  paint(side*1.51,4.55,.07,2.5,'#a39c72');
  for(const z of [3.3,5.8])paint(side*1.05,z,.95,.07,'#a39c72');
  // Crosswalks land beside the buildings, clear of the centre trap and entrances.
  for(let j=0;j<5;j++)paint(side*8.0,-10.9+j*.29,2.4,.13,'#8d998e');
  for(let j=0;j<4;j++)paint(side*7.8,10.15+j*.29,2.15,.13,'#8d998e');
 }
 // Clinic / workshop service paint uses the current station locations; no new interactions.
 for(const [x,z,c] of [[-18.2,0,'#54766b'],[18.2,0,'#766b4c']]){
  box(x,.010,z,2.5,.014,2.7,c,0,M.CONCRETE);
  for(const side of [-1,1])paint(x+side*1.18,z,.055,2.55,'#a5ac91');
 }
 paint(-18.2,1.03,.64,.15,'#c4c8ae');paint(-18.2,1.03,.15,.61,'#c4c8ae');

 // East freight siding: rails, sleepers and two parked wagons outside the open fence.
 // Leave the cardinal entrance approach visible between the wagons.
 box(30.3,-.035,0,4.0,.04,31,'#384344',0,M.CONCRETE);
 for(let z=-15;z<=15;z+=1.25)box(30.3,.028,z,3.5,.10,.20,'#52615b');
 for(const x of [29.5,31.1])box(x,.115,0,.095,.095,31.2,'#95a199');
 for(const [z,c] of [[-9.1,'#a56e50'],[9.1,'#547b78']]){
  box(30.3,.66,z,3.05,.28,7.3,'#34464a');
  box(30.3,1.62,z,2.82,1.65,6.9,c);
  box(30.3,2.48,z,2.96,.10,7.04,'#929784');
  for(const x of [28.84,31.76]){
   for(let dz=-2.9;dz<3.1;dz+=.8)box(x,1.62,z+dz,.06,1.62,.08,'#425957');
   box(x,1.68,z, .065,.44,1.25,'#b5b49b');
   for(const dz of [-2.3,2.3])seg([x-.08,.37,z+dz],[x+.08,.37,z+dz],.30,'#253334',M.RUBBER);
  }
 }
 // West dispatch shed: a separate silhouette and a striped loading canopy.
 box(-31,1.45,-8.8,7,2.9,9.7,'#777967',0,M.CONCRETE);
 box(-31,3.0,-8.8,7.3,.20,10.0,'#3c5559');
 for(const z of [-11.5,-5.7]){
  box(-27.465,1.13,z,.04,2.2,2.45,'#3a4c4b');
  box(-27.42,1.15,z,.025,2.03,2.25,'#889180');
  box(-26.85,2.5,z,1.3,.13,3.1,'#a29062');
 }
 for(let z=-12.8;z<-4.0;z+=1.9)box(-31,3.13,z,6.8,.035,.055,'#798b86');
 // Low transformer yard fills the southwest service apron without screening the fence.
 box(-30.3,.014,9.5,6.2,.025,7.6,'#596c61',0,M.CONCRETE);
 for(const z of [8.0,11.0]){
  box(-30.3,.85,z,3.15,1.65,1.65,'#6e8984');
  box(-30.3,1.72,z,3.3,.12,1.82,'#b29b66');
  for(const x of [-31.25,-30.3,-29.35])box(x,1.89,z,.22,.22,1.32,'#40595b');
 }
 box(-32.48,.075,9.5,.13,.12,6.2,'#b29b66');
 box(-28.0,.69,9.5,.85,1.35,.92,'#8e7959');
 box(-27.56,.91,9.5,.035,.46,.67,'#b1ba9c');
 for(const z of [6.0,13.0]){
  for(const x of [-33.25,-27.35])box(x,.40,z,.11,.8,.11,'#a0a691');
  box(-30.3,.71,z,6.0,.08,.08,'#a0a691');
  for(const x of [-32.5,-30.3,-28.1])paint(x,z,.8,.10,'#b9aa77');
 }
 // A pair of storage tanks makes the northeast corner recognizable at a glance.
 for(const x of [19.0,22.5]){
  seg([x,.06,-23.2],[x,3.65,-23.2],1.28,'#84978a');
  seg([x,3.66,-23.2],[x,3.78,-23.2],1.33,'#4d6b6c');
  seg([x,1.08,-23.2],[x,1.23,-23.2],1.29,'#b09a6d');
  seg([x,.36,-21.9],[x,.36,-20.2],.13,'#738784');
  box(x,.09,-23.2,2.95,.18,2.95,'#4c5e5a',0,M.CONCRETE);
 }
 seg([19,.36,-20.2],[22.5,.36,-20.2],.13,'#738784');
 // Northern handling gantry, kept away from the central approach and its sight line.
 for(const x of [-18.8,-11.2]){
  box(x,2.4,-22,.30,4.8,.46,'#b39356');
  box(x,.12,-22,1.0,.24,1.25,'#52635c',0,M.CONCRETE);
  seg([x,.5,-22],[x+(x<-15?1.6:-1.6),4.45,-22],.055,'#9a895e');
 }
 box(-15,4.8,-22,8.2,.36,.65,'#b39356');
 box(-14.1,4.46,-22,.9,.35,.8,'#485d60');
 seg([-14.1,4.3,-22],[-14.1,2.2,-22],.026,'#a8b4a5');
 // Gatehouse sign faces the yard. No emissive gameplay-like markers on decoration.
 box(7.6,3.18,-22.0,4.3,1.06,.12,'#283e43');
 stencil('NORTH',7.6,3.41,-21.927,.111,'#c0c5a8',true);
 stencil('DEPOT',7.6,2.88,-21.927,.111,'#c0c5a8',true);
 // Low southern cargo stacks fill the foreground without tall occluding buildings.
 for(const [x,z,c] of [[-13,21.8,'#6a827b'],[-9.3,21.8,'#8d7559'],[13.4,22.0,'#5d787d']]){
  box(x,.52,z,2.9,1.04,2.5,c);
  for(const dx of [-.98,.98])box(x+dx,.54,z,.085,1.12,2.58,'#a0a58d');
  box(x,1.075,z,3.0,.055,2.6,'#3f595d');
 }

 // Built-up architecture lives on the existing roofs and outside the playable fence.
 // Repeated modules are cached and instanced; no new scene work is done in the simulation.
 for(const [index,o] of obstacles.entries()){
  const r=obstacleToWorld(o);if(r.w*r.d<=8)continue;
  const h=buildingHeight(o),roof=h+.16,side=r.x<0?1:-1,inner=r.x+side*r.w/2;
  const trim=index%2?'#aa9d79':'#7e9e9b',steel='#4c6469',dark='#293e42';
  // Paired ventilation banks: sloped cowls, louvers, ribbed housings and pipe supports.
  for(const dz of [-2.15,2.05]){
   const x=r.x-r.w*.22,z=r.z+dz;
   box(x,roof+.24,z,1.30,.43,1.74,steel);
   box(x,roof+.49,z,1.49,.12,1.91,trim);
   for(let j=-2;j<=2;j++)box(x+j*.21,roof+.565,z,.095,.035,1.41,'#34494b');
   box(x,roof+.015,z,1.62,.025,2.10,'#253b3f',0,M.MATTE);
  }
  // Utility spine with expansion joints and occasional transverse runs.
  const px=r.x+side*r.w*.31;
  seg([px,roof+.26,r.z-r.d*.39],[px,roof+.26,r.z+r.d*.40],.085,'#b0afa0');
  for(let dz=-6.5;dz<=6.5;dz+=2.6){
   box(px,roof+.08,r.z+dz,.36,.16,.17,dark);
   seg([px,roof+.26,r.z+dz-.045],[px,roof+.26,r.z+dz+.045],.12,'#7e908b');
  }
  seg([px,roof+.26,r.z+.8],[r.x-r.w*.12,roof+.26,r.z+.8],.085,'#b0afa0');
  // Cornice / drain pipes give the long walls depth at real structural locations.
  for(const dz of [-r.d*.46,r.d*.46]){
   const x=inner+side*.105,z=r.z+dz;
   seg([x,.16,z],[x,h-.08,z],.042,'#788a83');
   for(const y of [.42,1.34,2.18])box(x+side*.02,y,z,.06,.055,.15,'#b2af91');
  }
  for(let dz=-r.d/2+.85;dz<r.d/2;dz+=1.25){
   // Shallow upper wall ribs stay attached to the solid warehouse.
   box(inner+side*.021,h-.50,r.z+dz,.045,.63,.046,trim);
  }
  // Long clerestory panes and mullions along the outer face.
  const outer=r.x-side*(r.w/2+.033);
  for(let j=0;j<6;j++){
   const z=r.z-6.5+j*2.6;
   box(outer,1.53,z,.026,.73,1.92,dark);
   box(outer-side*.020,1.53,z,.012,.59,1.75,'#668b91',0,MATERIAL_IDS.DEPOT_GLASS,.04);
   box(outer-side*.032,1.53,z,.025,.64,.06,trim);
  }
 }
 // Freight wagons: underframes, buffers, door latches and reinforcing corner castings.
 for(const z of [-9.1,9.1]){
  for(const dz of [-3.66,3.66]){
   box(30.3,.48,z+dz,2.30,.20,.16,'#253a3d');
   for(const x of [29.53,31.07])box(x,.61,z+dz,.28,.20,.26,'#7a8580');
  }
  for(const x of [28.82,31.78]){
   for(const dz of [-3.33,3.33])box(x,1.65,z+dz,.10,1.71,.12,'#b1ab90');
   for(const dz of [-.43,.43])seg([x,.94,z+dz],[x,2.28,z+dz],.032,'#c0bb9e');
  }
 }
 // Make the northern crane read as a working gantry instead of two plain posts.
 for(let x=-18.65;x<-11.3;x+=1.45){
  seg([x,4.64,-21.62],[Math.min(x+1.45,-11.25),5.33,-21.62],.038,'#a79b71');
  seg([x,5.33,-21.62],[Math.min(x+1.45,-11.25),4.64,-21.62],.038,'#a79b71');
 }
 box(-15,5.36,-22,8.1,.10,.92,'#ac9b6e');
 for(const z of [-22.45,-21.55])box(-15,4.63,z,8.1,.09,.10,'#756c50');
 for(let y=.35;y<4.2;y+=.36)seg([-18.98,y,-21.72],[-18.52,y,-21.72],.022,'#a7b1a1');
 // Southwest gear: porcelain insulators and busbars turn the low masses into recognizable equipment.
 for(const z of [8,11])for(const x of [-31.25,-30.3,-29.35]){
  seg([x,1.95,z],[x,2.30,z],.055,'#a8b5a8');
  for(const y of [2.02,2.15,2.28])seg([x,y-.025,z],[x,y+.025,z],.12,'#c2c1a1');
 }
 for(const x of [-31.25,-30.3,-29.35])seg([x,2.34,8],[x,2.34,11],.033,'#b3a17c');
 // Tank ring bands, inspection hatches and a low connecting catwalk, all outside the yard.
 for(const x of [19,22.5]){
  for(const y of [.30,2.90])seg([x,y-.035,-23.2],[x,y+.035,-23.2],1.305,'#536f6e');
  seg([x,3.78,-23.2],[x,3.90,-23.2],.35,'#a5b2a1');
  for(let y=.45;y<3.60;y+=.38)seg([x-.24,y,-21.89],[x+.24,y,-21.89],.023,'#aab5a6');
 }
 box(20.75,.44,-21.25,5.9,.13,.68,'#596d68');
 // Framed logistics boards and wall-mounted conduit keep the service building from feeling blank.
 for(const z of [-11.5,-5.7]){
  box(-27.36,2.24,z,.065,.22,2.07,'#c5b685',0,M.MATTE);
  box(-27.34,.25,z,.10,.30,2.55,'#9c9067');
 }
 // Low curb / ballast edges stay beyond the fence, with an open cardinal approach.
 for(const z of [-10.0,10.0]){
  box(27.5,.06,z,.22,.12,12.6,'#8c9583',0,M.CONCRETE);
  box(-26.35,.06,z,.20,.12,12.6,'#8c9583',0,M.CONCRETE);
 }
 // Vegetation breaks the perfect fence line, while staying beyond the playable bounds.
 for(const [x,z] of [[-25.95,-13.1],[-25.95,12.6],[25.95,-13.1],[25.95,12.6]]){
  for(let i=0;i<3;i++){
   const dx=(i-1)*.33,dz=(i%2?-.28:.24),size=.55+i*.11;
   add('parkCrown',model(x+dx,.32+i*.06,z+dz,size,.40+i*.09,size*.85,i*1.7),i%2?'#68765a':'#526c60',MATERIAL_IDS.ORGANIC);
  }
 }

 // Flush drainage ties the building aprons to the yard without adding an obstacle.
 for(const o of obstacles){
  const r=obstacleToWorld(o);if(r.w*r.d<=8)continue;
  const side=r.x<0?1:-1,x=r.x+side*(r.w/2+.46);
  for(const dz of [-6.2,.1,6.3]){
   const z=r.z+dz;
   box(x,.024,z,.54,.016,.92,'#617370',0,M.METAL);
   box(x,.034,z,.43,.007,.78,'#202f33',0,M.MATTE);
   for(let i=-2;i<=2;i++)box(x,.039,z+i*.14,.41,.004,.042,'#87918a');
  }
 }
 // Small service covers sit level with the asphalt, away from the power station.
 for(const [x,z] of [[-6.2,-5.8],[6.7,8.1]]){
  seg([x,.004,z],[x,.021,z],.37,'#455c62');
  seg([x,.022,z],[x,.029,z],.31,'#607779');
  for(let j=-2;j<=2;j++)paint(x,z+j*.092,Math.sqrt(.27*.27-(j*.092)**2)*2,.022,'#2b4143');
 }
 // The district continues past the gate: an old elevated water tank and pipe gallery.
 // Tall structures are only on the far side, never in the foreground over escape lanes.
 const tx=-4.1,tz=-21.9,towerStart=parts.length;
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const x=tx+sx*1.22,z=tz+sz*1.22;
  box(x,.08,z,.68,.16,.68,'#6d7b70',0,M.CONCRETE);
  seg([x,.12,z],[tx+sx*.96,5.05,tz+sz*.96],.076,'#899c93');
 }
 for(const side of [-1,1]){
  seg([tx-1.18,.60,tz+side*1.18],[tx+1.02,4.62,tz+side*1.02],.037,'#778c87');
  seg([tx+1.18,.60,tz+side*1.18],[tx-1.02,4.62,tz+side*1.02],.037,'#778c87');
  seg([tx+side*1.18,.60,tz-1.18],[tx+side*1.02,4.62,tz+1.02],.037,'#778c87');
 }
 seg([tx,4.78,tz],[tx,5.0,tz],1.75,'#4c666b');
 seg([tx,4.98,tz],[tx,7.23,tz],1.54,'#92a293');
 for(const y of [5.04,5.72,6.92,7.22])seg([tx,y-.033,tz],[tx,y+.033,tz],1.57,'#647f7d');
 add('depotCap',model(tx,7.47,tz,1.61,.24,1.61),'#4c676f',M.METAL);
 seg([tx,7.53,tz],[tx,7.88,tz],.11,'#99aaa0');
 seg([tx+.54,.10,tz],[tx+.54,5.08,tz],.13,'#647c7b');
 for(const p of parts.slice(towerStart))for(const k of [1,5,9,13])p.matrix[k]*=.50;
 // Two utility runs above the northern service road, with supports at structural intervals.
 for(const z of [-24.75,-25.18]){
  seg([-27.8,3.10,z],[23.2,3.10,z],.12,'#91a29a');
  for(const x of [-26,-15,-3,9,21]){
   seg([x-.055,3.10,z],[x+.055,3.10,z],.165,'#5e7879');
  }
 }
 for(const x of [-26,-15,-3,9,21]){
  for(const z of [-25.45,-24.45]){
   box(x,.09,z,.54,.18,.56,'#566d66',0,M.CONCRETE);
   box(x,1.54,z,.10,2.90,.10,'#526b6d');
  }
  box(x,2.95,-24.95,.17,.16,1.38,'#a39b76');
  seg([x,2.30,-25.45],[x,2.93,-24.62],.036,'#738984');
 }
 for(const x of [19,22.5])seg([x,3.10,-24.75],[x,3.10,-23.2],.11,'#91a29a');
 // Recesses, sills and roof exhausts give the dispatch shed a finished facade.
 for(const z of [-11.5,-5.7]){
  for(const dz of [-1.19,1.19])box(-27.405,1.16,z+dz,.058,2.13,.06,'#b3b69e');
  box(-27.383,1.52,z,.018,.39,1.84,'#658690',0,MATERIAL_IDS.DEPOT_GLASS);
  box(-27.362,1.52,z,.023,.42,.035,'#a4b1a1');
  box(-27.37,1.30,z,.067,.045,1.98,'#a4b1a1');
 }
 for(const z of [-11.65,-6.0]){
  seg([-32.25,3.14,z],[-32.25,3.63,z],.21,'#768e86');
  add('depotCap',model(-32.25,3.75,z,.34,.12,.34),'#a1ad98',M.METAL);
 }

 // Bevel only thick hardware; paint, facade skins and slender rails retain their exact planes.
 for(const p of parts)if(p.mesh==='box'){
  const m=p.matrix,axes=[Math.hypot(m[0],m[1],m[2]),Math.hypot(m[4],m[5],m[6]),Math.hypot(m[8],m[9],m[10])];
  if(Math.min(...axes)>.16&&Math.max(...axes)/Math.min(...axes)<8&&m[13]>.25)p.mesh='depotChamfer';
 }
 return {parts,lights,fixtures,shadowParts};
}

// Shared, cached visual plans for rounds 2–8. Every solid structure follows its existing collider.
const ARENA_LOOKS=Object.freeze({
 breakwater:{floor:'#4b6267',fog:'#29444d',body:'#698386',trim:'#bea571',lamp:'#b9e8ef',top:[.31,.35,.36],ground:[.12,.15,.16]},
 memorial:{floor:'#303c3b',fog:'#172830',body:'#7b827a',trim:'#969d91',lamp:'#efb978',top:[.29,.36,.43],ground:[.09,.13,.15]},
 pump:{floor:'#3c4948',fog:'#263639',body:'#7d9189',trim:'#ad945e',lamp:'#e4c18c',top:[.29,.32,.33],ground:[.085,.11,.115]},
 cold:{floor:'#485d65',fog:'#304b58',body:'#a2b3b2',trim:'#7c98a0',lamp:'#c0e2e9',top:[.29,.34,.37],ground:[.095,.125,.145]},
 rail:{floor:'#4e5253',fog:'#303d42',body:'#865a46',trim:'#b69c64',lamp:'#f1c88f',top:[.29,.32,.35],ground:[.09,.105,.12]},
 quarantine:{floor:'#414944',fog:'#25363c',body:'#7d8271',trim:'#c8ba92',lamp:'#f4bd80',top:[.265,.305,.335],ground:[.075,.10,.115]},
 evac:{floor:'#56615f',fog:'#283e49',body:'#778581',trim:'#c2c3a7',lamp:'#ddb67c',top:[.29,.34,.37],ground:[.10,.13,.145]}
});
function polishedArenaDecor(id,source){
 if(id==='breakwater')return [];
 if(['memorial','pump','cold','rail','quarantine','evac'].includes(id))return [];
 return source.filter(p=>!['light','rail','helipad'].includes(p.kind)).map(p=>{
  if(p.kind==='fence')return p;
  const q={...p};
  if(Math.abs(p.x)/24>Math.abs(p.z)/17){q.x=Math.sign(p.x||1)*(25.25+(p.w||1)/2);}
  else q.z=Math.sign(p.z||1)*(18.70+(p.d||1)/2);
  return q;
 });
}
// Depot-only closed metal cap, with outward winding and normals matching the slope.
function createDepotCapMesh(){
 const data=createCylinderMesh(16,.06,1),slope=.47;
 for(let i=0;i<data.normals.length;i+=3)if(Math.abs(data.normals[i+1])<.5){
  const len=Math.hypot(data.normals[i],slope,data.normals[i+2]);
  data.normals[i]/=len;data.normals[i+1]=slope/len;data.normals[i+2]/=len;
 }
 for(const key of ['positions','normals'])for(let i=0;i<data[key].length;i+=9)for(let axis=0;axis<3;axis++){
  [data[key][i+3+axis],data[key][i+6+axis]]=[data[key][i+6+axis],data[key][i+3+axis]];
 }
 return data;
}

// Shared cached bevel mesh used only by substantial Depot props; no collider changes.
function createDepotChamferMesh(){
 const positions=[],normals=[],b=.88;
 const tri=(a,c,d,n)=>{const u=c.map((v,i)=>v-a[i]),v=d.map((v,i)=>v-a[i]);
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(cross.reduce((sum,x,i)=>sum+x*n[i],0)<0)[c,d]=[d,c];
  positions.push(...a,...c,...d);for(let i=0;i<3;i++)normals.push(...n);
 };
 const quad=(a,c,d,e,n)=>{tri(a,c,d,n);tri(a,d,e,n);};
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const u=(axis+1)%3,v=(axis+2)%3,n=[0,0,0];n[axis]=sign;
  const point=(x,y)=>{const p=[0,0,0];p[axis]=sign;p[u]=x;p[v]=y;return p;};
  quad(point(-b,-b),point(b,-b),point(b,b),point(-b,b),n);
 }
 for(let free=0;free<3;free++)for(const a of [-1,1])for(const c of [-1,1]){
  const u=(free+1)%3,v=(free+2)%3,n=[0,0,0];n[u]=a/Math.SQRT2;n[v]=c/Math.SQRT2;
  const point=(t,swap)=>{const p=[0,0,0];p[free]=t;p[u]=a*(swap?b:1);p[v]=c*(swap?1:b);return p;};
  quad(point(-b,false),point(b,false),point(b,true),point(-b,true),n);
 }
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])tri([x,y*b,z*b],[x*b,y,z*b],[x*b,y*b,z],[x/Math.sqrt(3),y/Math.sqrt(3),z/Math.sqrt(3)]);
 return {positions,normals};
}

function createArenaGableMesh(){
 const vertices=[[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1],[-1,1,0],[1,1,0]],faces=[[0,2,1],[0,3,2],[0,1,5],[0,5,4],[3,4,5],[3,5,2],[0,4,3],[1,2,5]],positions=[],normals=[];
 for(const ids of faces){let [a,b,c]=ids.map(i=>vertices[i]);const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(n[0]*(a[0]+b[0]+c[0])+n[1]*(a[1]+b[1]+c[1]-1)+n[2]*(a[2]+b[2]+c[2])<0){[b,c]=[c,b];n=n.map(x=>-x);}
  const len=Math.hypot(...n);for(const p of [a,b,c]){positions.push(...p);normals.push(...n.map(x=>x/len));}
 }
 return {positions,normals};
}
function breakwaterSurroundings(){
 const parts=[],M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.METAL,glow=0,cast=true)=>parts.push({mesh,matrix,color,material,glow,cast});
 const box=(x,y,z,w,h,d,c,mat=M.METAL,a=0,cast=true)=>add('box',model(x,y,z,w/2,h/2,d/2,a),c,mat,0,cast);
 const seg=(a,b,r,c)=>add('pickupCylinder',basisModel(...a,...b,r,r),c);
 const water='#294b56',steel='#677e7d',stone='#697979',dark='#243d43';
 // Water continues past the entire camera footprint; quay faces descend to it.
 box(0,-.64,0,240,.05,240,water,M.WET,0,false);
 for(const side of [-1,1]){
  box(side*26.7,-.115,0,3,.23,36.4,stone,M.CONCRETE,0,false);
  box(0,-.115,side*19.9,56.4,.23,3.4,stone,M.CONCRETE,0,false);
  box(side*28.16,-.37,0,.22,.75,43.2,'#465f60',M.CONCRETE);
  box(0,-.37,side*21.54,56.4,.75,.20,'#465f60',M.CONCRETE);
  // Unbroken railings communicate the same boundary without opaque panels.
  for(let z=-17.55;z<=17.56;z+=3.51){seg([side*24.55,.03,z],[side*24.55,1.11,z],.043,steel);}
  for(const y of [.40,1.04])box(side*24.55,y,0,.07,.075,35.1,'#94a39c');
  for(let x=-24.55;x<=24.56;x+=4.91)seg([x,.03,side*17.55],[x,1.11,side*17.55],.043,steel);
  for(const y of [.40,1.04])box(0,y,side*17.55,49.1,.075,.07,'#94a39c');
  for(let z=-15;z<=15;z+=5){
   // Mooring posts, tire fenders and chipped quay paint remain outside the route.
   seg([side*26.2,.02,z],[side*26.2,.42,z],.13,'#394f50');seg([side*26.47,.37,z],[side*25.93,.37,z],.09,'#a89e71');
   box(side*28.29,-.20,z,.28,.64,.67,'#293c3d',M.RUBBER);
   box(side*27.86,.012,z,.14,.014,1.35,'#bcb78d',M.MATTE,0,false);
  }
 }
 // Roads and industrial land continue beyond the harbor-side buildings.
 box(0,-.15,-40,115,.20,38,'#4c6464',M.ASPHALT,0,false);
 box(0,-.15,42,115,.20,40,'#4c6262',M.ASPHALT,0,false);
 for(const z of [-33,32]){
  box(0,-.026,z,100,.03,5.4,'#314c54',M.ASPHALT,0,false);
  for(let x=-48;x<49;x+=4.4)box(x,.002,z,1.8,.009,.055,'#979e86',M.MATTE,0,false);
 }
 const warehouse=(x,z,w,d,h,c)=>{
  box(x,h/2,z,w,h,d,c,M.CONCRETE);
  box(x,h+.12,z,w+.20,.24,d+.2,'#4d696d');
  for(const side of [-1,1]){
   const face=z+side*d/2;
   box(x,.26,face,w,.5,.075,'#384e51',M.CONCRETE);
   for(let dx=-w/2+2;dx<w/2-1;dx+=5.6){
    box(x+dx,1.09,face+side*.048,2.46,2.1,.075,dark);
    box(x+dx,1.08,face+side*.094,2.25,1.93,.023,'#748681');
    for(let y=.3;y<1.96;y+=.26)box(x+dx,y,face+side*.11,2.20,.024,.026,'#455f63');
    box(x+dx,2.25,face+side*.17,2.75,.10,.44,'#a4afa0');
    box(x+dx,2.67,face+side*.057,2.8,.46,.036,'#8ea9a6',M.GLASS);
    for(const ox of [-.94,0,.94])box(x+dx+ox,2.67,face+side*.08,.045,.49,.035,'#405a60');
   }
  }
  for(let dx=-w/2+.5;dx<w/2;dx+=1.2)box(x+dx,h+.26,z,.024,.024,d-.1,'#819393');
  for(const dx of [-w*.27,w*.27]){box(x+dx,h+.46,z,1.3,.38,1.6,'#8c9d96');for(const dz of [-.5,0,.5])box(x+dx,h+.66,z+dz,1.05,.025,.10,'#415d60');}
 };
 warehouse(0,-26.45,56,8.3,3.45,'#798681');
 warehouse(-18,27.6,17,9.3,2.85,'#7c8270');warehouse(18,27.6,17,9.3,2.85,'#687e7c');
 // East service pier and gangways connect cranes to the dock system.
 box(34.5,-.16,0,9,.32,33,'#5c7476',M.CONCRETE,0,false);
 // Raised decks avoid coplanar overlap with the quay and service pier.
 for(const z of [-12,12])box(29.2,0,z,4.8,.12,1.8,'#85918a',M.CONCRETE,0,false);
 for(const z of [-10,10]){
  const x=35;
  for(const side of [-1,1])box(x+side*1.0,2.45,z,.22,4.9,.28,'#a99b63');
  box(x,4.90,z,2.3,.22,.34,'#c5b272');box(x-1.3,5.22,z,5.2,.21,.27,'#b6a165');
  seg([x+1,2.6,z],[x-3.9,5.2,z],.058,'#68756a');seg([x-3.7,5.15,z],[x-3.7,1.0,z],.017,'#b4c2b6');
 }
 // A moored cargo barge creates a large silhouette beyond the west railing.
 add('powerHull',model(-34.1,-.29,1,4.6,.54,12.6),'#344e54');
 box(-34.1,.26,1,8.7,.10,24.3,'#768778');
 const cargo=(x,z,c)=>{
  box(x,1.11,z,3.0,1.62,5.4,c);box(x,1.96,z,3.05,.09,5.45,'#95a28e');
  for(let dz=-2.5;dz<2.7;dz+=.40)for(const side of [-1,1])box(x+side*1.51,1.13,z+dz,.045,1.47,.045,'#3f5759');
  for(const side of [-1,1])box(x+side*.54,1.12,z+2.73,.05,1.43,.04,'#aab09a');
 };
 for(const [dx,z,c] of [[-1.75,-5,'#7c8467'],[1.75,-5,'#8d7159'],[-1.75,1,'#547c83'],[1.75,1,'#8e8c68']])cargo(-34.1+dx,z,c);
 box(-34.1,1.15,9,5.4,1.75,3.6,'#899788');box(-34.1,2.08,9,5.65,.10,3.85,'#abb5a0');
 for(const side of [-1,1]){box(-34.1+side*2.71,1.55,9,.03,.58,2.58,'#4c737d',M.GLASS);seg([-34.1+side*4.1,.28,-11],[-34.1+side*4.1,.93,-11],.037,steel);seg([-34.1+side*4.1,.91,-11],[-34.1+side*4.1,.91,13],.037,steel);}
 seg([-30.0,.4,-8],[-26.2,.30,-10],.033,'#a59a72');seg([-30.0,.4,11],[-26.2,.30,10],.033,'#a59a72');
 // Low contrast ripples around the moorings give the harbor a readable scale.
 for(let i=0;i<48;i++){const z=-38+(i%16)*5.1,x=(i<16?-43:i<32?43:-31)+Math.sin(i*1.3)*1.8;box(x,-.608,z,1.1+(i%4)*.7,.004,.024,'#668586',M.WET,.12,false);}
 return {parts};
}

// Small closed meshes for Memorial Park only; shared instances keep the foliage cheap.
function createParkCrownMesh(slender=false){
 const segments=16,rings=9,vertices=[[0,-1,0]],faces=[],positions=[],normals=[];
 for(let row=1;row<rings;row++){
  const t=row/rings,y=t*2-1;
  for(let col=0;col<segments;col++){
   const a=col/segments*Math.PI*2;
   const profile=slender?Math.pow(Math.sin(t*Math.PI),.63)*(1-.46*t):Math.sin(t*Math.PI);
   const lobes=1+.105*Math.sin(a*5+t*8)+.065*Math.cos(a*3-t*11)+.035*Math.sin(a*9+t*6);
   const r=profile*lobes;
   vertices.push([Math.cos(a)*r+.06*Math.sin(t*5),y+Math.sin(a*4+t*9)*profile*.047,Math.sin(a)*r]);
  }
 }
 const top=vertices.push([.035,1,0])-1,index=(r,c)=>1+r*segments+(c+segments)%segments;
 for(let c=0;c<segments;c++){
  faces.push([0,index(0,c),index(0,c+1)],[top,index(rings-2,c+1),index(rings-2,c)]);
  for(let r=0;r<rings-2;r++)faces.push([index(r,c),index(r+1,c),index(r+1,c+1)],[index(r,c),index(r+1,c+1),index(r,c+1)]);
 }
 const sums=vertices.map(()=>[0,0,0]);
 for(const ids of faces){
  const [a,b,c]=ids.map(i=>vertices[i]),u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]);
  let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(n.reduce((s,q,i)=>s+q*(a[i]+b[i]+c[i]),0)<0){[ids[1],ids[2]]=[ids[2],ids[1]];n=n.map(q=>-q);}
  for(const id of ids)for(let i=0;i<3;i++)sums[id][i]+=n[i];
 }
 for(const ids of faces)for(const id of ids){const n=sums[id],len=Math.hypot(...n)||1;positions.push(...vertices[id]);normals.push(...n.map(v=>v/len));}
 return {positions,normals};
}
function createParkObeliskMesh(){
 const v=[[-.56,0,-.56],[.56,0,-.56],[.56,0,.56],[-.56,0,.56],[-.34,.76,-.34],[.34,.76,-.34],[.34,.76,.34],[-.34,.76,.34],[0,1,0]],faces=[[0,2,1],[0,3,2]],positions=[],normals=[];
 for(let i=0;i<4;i++){const j=(i+1)%4;faces.push([i,j,j+4],[i,j+4,i+4],[i+4,j+4,8]);}
 for(const ids of faces){
  let [a,b,c]=ids.map(i=>v[i]);const u=b.map((q,i)=>q-a[i]),w=c.map((q,i)=>q-a[i]);let n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];
  if(n[0]*(a[0]+b[0]+c[0])+n[1]*(a[1]+b[1]+c[1]-1.2)+n[2]*(a[2]+b[2]+c[2])<0){[b,c]=[c,b];n=n.map(q=>-q);}
  const len=Math.hypot(...n);for(const p of [a,b,c]){positions.push(...p);normals.push(...n.map(q=>q/len));}
 }
 return {positions,normals};
}
function createParkBranchMesh(){
 const data=createCylinderMesh(9,.34,1);
 for(const key of ['positions','normals'])for(let i=0;i<data[key].length;i+=9)for(let k=0;k<3;k++)
  [data[key][i+3+k],data[key][i+6+k]]=[data[key][i+6+k],data[key][i+3+k]];
 return data;
}

// Memorial Park: cached scenery follows the five original collision footprints.
function memorialParkPlan(obstacles){
 const parts=[],lights=[],fixtures=[],solids=[],style=ARENA_LOOKS.memorial,M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.CONCRETE,glow=0,cast=true)=>{material=material===M.CONCRETE?M.PARK_STONE:material;const p={mesh,matrix,color,material,glow,cast};parts.push(p);return p;};
 const box=(x,y,z,w,h,d,c,mat=M.CONCRETE,a=0,cast=true)=>add('box',model(x,y,z,w/2,h/2,d/2,a),c,mat,0,cast);
 const oval=(x,y,z,w,h,d,c,mat=M.ORGANIC)=>add('pickupOrb',model(x,y,z,w,h,d),c,mat);
 const cyl=(x,y,z,r,h,c)=>add('pickupCylinder',model(x,y,z,r,h/2,r),c);
 const seg=(a,b,r,c)=>add('pickupCylinder',basisModel(...a,...b,r,r),c,M.METAL);
 const flat=(x,z,w,d,c,y=.021,a=0)=>box(x,y,z,w,.008,d,c,M.MATTE,a,false);
 const stone='#878e86',trim='#9a9e92',dark='#28332f',bronze='#4e5b50';
 const lamp=(x,z,y=2.8,powered=true)=>{
  cyl(x,.15,z,.15,.3,dark);seg([x,.2,z],[x,y,z],.052,'#596359');
  box(x,y-.035,z,.38,.08,.38,dark,M.METAL);box(x,y+.365,z,.38,.055,.38,dark,M.METAL);
  const f=fixtures.length;fixtures.push({x,y:y+.15,z,color:'#dec09a',powered,phase:x*.7,radius:5.8,intensity:.65});
  const glass=box(x,y+.17,z,.28,.32,.28,'#dec09a',M.GLASS);glass.fixture=f;
  add('powerHull',model(x,y+.43,z,.28,.10,.28),dark,M.METAL);
  for(const dx of [-.16,.16])for(const dz of [-.16,.16])box(x+dx,y+.17,z+dz,.035,.40,.035,dark,M.METAL);
  lights.push({x,y:.065,z,radius:2.7,color:'#dec09a',strength:.20,mode:0,fixture:f});
 };
 const bench=(x,y,z,w=1.6)=>{
  for(const dx of [-w*.36,w*.36]){box(x+dx,y+.25,z,.07,.50,.46,dark,M.METAL);box(x+dx,y+.58,z-.20,.07,.73,.07,dark,M.METAL);}
  for(const dz of [-.15,0,.15])box(x,y+.49,z+dz,w,.07,.12,'#756958',M.MATTE);
  for(const yy of [.69,.88])box(x,y+yy,z-.20,w,.13,.055,'#6c6253',M.MATTE);
 };
 const branch=(a,b,r)=>add('parkBranch',basisModel(...a,...b,r,r),'#635c49',M.MATTE);
 const tree=(x,y,z,s=1,leaf=true)=>{
  const at=(dx,dy,dz)=>[x+dx*s,y+dy*s,z+dz*s];
  branch(at(0,0,0),at(.12,1.30,-.04),.16*s);
  branch(at(.12,1.18,-.04),at(-.07,2.39,.06),.12*s);
  branch(at(-.07,2.24,.06),at(.16,3.67,.13),.074*s);
  // Forked winter branches leave gaps in the silhouette instead of one round crown.
  const forks=[[-.07,1.52,.02,-.81,2.43,.16,-1.07,3.11,.31],[.01,2.06,.04,.78,2.91,-.18,1.00,3.43,-.35],[-.02,2.31,.06,-.37,3.08,.67,-.57,3.71,.78]];
  for(const [ax,ay,az,bx,by,bz,cx,cy,cz] of forks){
   branch(at(ax,ay,az),at(bx,by,bz),.066*s);branch(at(bx,by,bz),at(cx,cy,cz),.035*s);
   branch(at(bx,by,bz),at(bx*.52,by+.53,bz+.29),.024*s);
   branch(at(cx*.94,cy-.16,cz),at(cx+.22,cy+.25,cz-.17),.013*s);
   if(leaf)add('parkCrown',model(x+bx*s,y+(by+.10)*s,z+bz*s,.34*s,.21*s,.38*s,bx+z),'#47513d',M.PARK_LEAF);
  }
  for(const a of [.3,2.4,4.1])branch(at(.02,.44,0),at(Math.cos(a)*.36,.015,Math.sin(a)*.35),.045*s);
 };
 const cypress=(x,y,z,h=2.4)=>{
  branch([x,y,z],[x+.06,y+h*.93,z],.065);
  for(let k=0;k<5;k++){
   const yy=y+h*(.25+k*.145),a=k*2.37+x,reach=.28*(1-k*.12),dx=Math.cos(a)*reach,dz=Math.sin(a)*reach;
   branch([x,yy-.10,z],[x+dx,yy+.11,z+dz],.024);
   add('parkCypress',model(x+dx*.58,yy+.12,z+dz*.58,.38-k*.025,h*.20,.34-k*.026,a),'#394b3c',M.PARK_LEAF);
  }
 };
 const shrub=(x,y,z,s=1)=>add('parkCrown',model(x,y+.31*s,z,.57*s,.33*s,.48*s,x+z),'#45503e',M.PARK_LEAF);
 const grave=(x,y,z,variant=0)=>{
  box(x,y+.065,z+.38,.70,.13,1.28,'#606d5d');
  box(x,y+.13,z+.48,.52,.015,.85,'#3c5141',M.MATTE);
  const firstHead=parts.length;box(x,y+.43,z-.19,.62,.79,.18,stone);
  if(variant%2)box(x,y+.84,z-.19,.73,.10,.23,trim);
  else oval(x,y+.81,z-.19,.31,.20,.095,stone,M.CONCRETE);
  box(x,y+.53,z-.09,.36,.28,.018,'#58665b');
  for(const yy of [.49,.57])box(x,y+yy,z-.075,.23,.018,.012,'#a2a68c');
  const lean=(variant%3-1)*.042,cs=Math.cos(lean),sn=Math.sin(lean);
  for(let i=firstHead;i<parts.length;i++){const m=parts[i].matrix;for(const j of [0,4,8]){const xx=m[j],yy=m[j+1];m[j]=cs*xx-sn*yy;m[j+1]=sn*xx+cs*yy;}const xx=m[12]-x,yy=m[13]-(y+.12);m[12]=x+cs*xx-sn*yy;m[13]=y+.12+sn*xx+cs*yy;}
  for(const dx of [-.13,.11])oval(x+dx,y+.20,z+.79,.075,.07,.065,dx<0?'#a78d64':'#925d51');
 };
 const plinth=(r,h)=>{
  box(r.x,h/2,r.z,r.w,h,r.d,'#717969');solids.push({...r,h});
  for(const side of [-1,1]){box(r.x+side*(r.w/2-.10),h+.055,r.z,.15,.07,r.d,trim);box(r.x,h+.055,r.z+side*(r.d/2-.10),r.w-.4,.07,.15,trim);}
  // Face joints and worn capstones make the platforms read as masonry.
  for(const side of [-1,1]){
   for(let dx=-r.w/2+.75;dx<r.w/2;dx+=.85)box(r.x+dx,h*.47,r.z+side*(r.d/2+.008),.018,h*.86,.014,'#445443');
   for(let dz=-r.d/2+.55;dz<r.d/2;dz+=.8)box(r.x+side*(r.w/2+.008),h*.47,r.z+dz,.014,h*.86,.018,'#445443');
   box(r.x,h*.20,r.z+side*(r.d/2+.012),r.w,.045,.018,'#4e5d4a');
  }
  // Shallow contact staining follows each footprint, never hiding a route.
  const stain=oval(r.x,.013,r.z,r.w*.54,.006,r.d*.56,'#2e4034');stain.cast=false;
 };
 // Soil extends beyond the fence; broad stone walks connect the original open loops.
 box(0,-.11,0,180,.18,150,'#242e2a',M.ORGANIC,0,false);
 box(0,.002,0,50.4,.004,36.4,'#363f32',M.ORGANIC,0,false);
 for(const x of [-8.05,8.05])flat(x,0,5.9,30.3,'#707767');
 for(const z of [-12.8,12.8])flat(0,z,44.9,4.7,'#737969',.026);
 flat(0,-7.55,21.6,5.8,'#717968',.026);flat(0,7.55,21.6,5.8,'#747b6a',.026);
 for(const x of [-20.75,20.75])flat(x,0,3.3,29.4,'#637260');
 flat(0,-16.55,4.2,3.3,'#707967',.019);flat(0,16.55,4.2,3.3,'#777e6b',.019);
 // Paving joints, worn edging and a central approach stay flush, so feet never float.
 for(const x of [-10.95,-5.15,5.15,10.95])flat(x,0,.12,20.8,'#858882',.033);
 for(const z of [-15.09,-10.51,10.51,15.09])flat(0,z,44.9,.11,'#858882',.033);
 // Inset limestone slabs: subtle height and color variation without changing foot height.
 const slab=(x,z,w,d,n)=>{
  box(x,.029,z,w,.009,d,['#6e706b','#70716c','#6b6e69','#71736c'][Math.abs(n)%4],M.CONCRETE,0,false);
 };
 for(let row=0;row<15;row++)for(const side of [-1,1])for(let col=0;col<3;col++)
  slab(side*8.05+(col-1)*1.89,-9.35+row*1.32,1.83,1.26,row*7+col+(side===1?1:0));
 for(const z of [-12.8,12.8])for(let col=0;col<30;col++)for(const dz of [-1.14,0,1.14])
  slab(-21.67+col*1.49,z+dz,1.43,1.08,col*3+Math.round(dz*10));
 for(const z of [-7.55,7.55])for(let row=0;row<4;row++)for(let col=0;col<6;col++)
  slab(-3.7+col*1.48,z-2.1+row*1.40,1.42,1.34,row+col*7);
 // Grass stays soft and traversable; low tufts and bare patches break up the empty lawns.
 for(const side of [-1,1])for(let i=0;i<22;i++){
  const x=side*(12.3+(Math.sin(i*9.11)*.5+.5)*5.4),z=-9.8+(Math.sin(i*6.87)*.5+.5)*19.6;
  if(obstacles.some(o=>{const r=obstacleToWorld(o);return Math.abs(x-r.x)<r.w/2+.4&&Math.abs(z-r.z)<r.d/2+.4;}))continue;
  const patch=oval(x,.009,z,.17+(i%3)*.11,.003,.08+(i%2)*.10,'#46583d');patch.cast=false;
  for(let k=0;k<3;k++){
   const tuft=add('arenaGable',model(x+(k-1)*.14,.025,z+Math.sin(k+i)*.12,.025,.10+(k%2)*.045,.13,i*.9+k),'#63714b',M.ORGANIC);tuft.cast=false;
  }
 }
 for(const [x,z,w,d] of [[-7.9,3.0,1.9,.60],[8.6,-5.6,1.4,.75],[-16.1,13.3,1.9,.43],[16,-12.4,1.3,.50]]){
  const puddle=oval(x,.041,z,w*.5,.006,d*.5,'#435b55',M.WET);puddle.cast=false;
 }
 // Memorial, two stone crypts and two planted grave beds: no new lane colliders.
 for(const [i,o] of obstacles.entries()){
  const r=obstacleToWorld(o),x=r.x,z=r.z;
  if(i===0){
   plinth(r,.28);
   box(x,.49,z,7.3,.42,7.3,'#727873');box(x,.76,z,5.7,.16,5.7,trim);
   box(x,1.18,z,2.2,.84,2.2,'#7f8881');box(x,1.64,z,2.42,.10,2.42,trim);
   box(x,1.95,z,1.28,.52,1.28,'#737e77');
   // A tapered stone shaft and bronze inset read clearly at the gameplay camera.
   add('parkObelisk',model(x,2.20,z,1,2.30,1),'#a3a79e',M.PARK_STONE);
   for(const side of [-1,1]){
    box(x+side*1.108,1.18,z,.025,.50,.91,'#394e48',M.METAL);
    box(x,1.18,z+side*1.108,.91,.50,.025,'#394e48',M.METAL);
    for(const yy of [1.04,1.17,1.30])box(x,yy,z+side*1.126,.60,.025,.015,'#b4a875',M.METAL);
   }
   for(const dx of [-2.7,2.7])bench(x+dx,.28,z+3.94,1.40);
   for(const dx of [-3.35,3.35])lamp(x+dx,z-3.35,2.65);
   // Tall planting occupies the blocked corners of the memorial, within its existing base.
   for(const dx of [-3.96,3.96])for(const dz of [-3.83,3.83]){
    cyl(x+dx,.49,z+dz,.40,.42,'#6d7961');cyl(x+dx,.73,z+dz,.43,.08,trim);
    cypress(x+dx,.76,z+dz,dz<0?2.35:1.95);
   }
   for(const side of [-1,1]){
    for(let k=-3;k<=3;k++)box(x+k*.94,.48,z+side*3.658,.017,.36,.018,'#596651');
    box(x,.35,z+side*3.661,7.17,.028,.019,'#4c5c4c');
   }
   for(const dx of [-2.18,2.18])shrub(x+dx,.84,z-1.9,.73);
   for(const dx of [-1.65,1.65]){
    cyl(x+dx,.96,z+1.90,.25,.27,bronze);oval(x+dx,1.15,z+1.90,.31,.16,.31,'#637767',M.METAL);
    const flame=oval(x+dx,1.41,z+1.90,.105,.24,.11,'#d3a36e',M.GLASS);flame.glow=.52;
   }
   fixtures.push({x,y:1.42,z:z+1.9,color:'#b49772',powered:false,phase:1.2,radius:3.6,intensity:.46});
   // Wreaths sit against the front step, inside the original footprint.
   for(const dx of [-.68,.68]){add('powerRing',model(x+dx,.45,z+3.63,.31,.31,.055),'#4c6242',M.ORGANIC);box(x+dx,.34,z+3.70,.09,.25,.025,'#a57654',M.FABRIC);}
  }else{
   plinth(r,.32);box(x,.36,z,r.w-.38,.035,r.d-.38,'#354f3c',M.ORGANIC);
   if(i<3){
    const w=3.42,d=2.20,h=i===1?1.67:1.94;
    box(x,.40+h/2,z,w,h,d,'#777f78');box(x,h+.47,z,w+.20,.14,d+.20,trim);
    add('arenaGable',model(x,h+.54,z,(w+.30)/2,.53,(d+.25)/2),'#424c4d',M.PARK_ROOF);
    // Roof seams follow both slopes; gutters, buttresses and plaques add facade depth.
    box(x,h+1.09,z,3.76,.045,.075,'#66736b',M.PARK_ROOF);
    for(const side of [-1,1]){
     box(x,h+.55,z+side*1.26,3.72,.10,.11,'#8e9987',M.METAL);
     for(const dz of [-.79,.79])box(x+side*1.68,1.08,z+dz,.25,1.45,.27,'#8c9286');
     box(x+side*1.73,1.04,z,.033,.37,.49,'#b7ab82',M.METAL);
     shrub(x+side*1.84,.39,z-.76,.52);
    }
    for(const dx of [-1.40,1.40])box(x+dx,1.21,z+d/2+.06,.22,1.67,.21,trim);
    box(x,1.07,z+d/2+.022,.87,1.40,.06,'#283e39');
    for(const dx of [-.29,0,.29])box(x+dx,1.10,z+d/2+.06,.035,1.31,.035,'#8a8b70',M.METAL);
    box(x,1.75,z+d/2+.062,1.03,.15,.08,'#938e78');
    for(const side of [-1,1])box(x+side*w/2,.98,z,.027,.57,.65,'#465b4f');
    lamp(x-r.w*.41,z+r.d*.35,2.28);
    oval(x+1.90,.61,z-.80,.33,.30,.51,'#516547');
   }else{
    for(const dx of [-1.3,0,1.3])grave(x+dx,.38,z+.16,i+Math.round(dx));
    tree(x-r.w*.30,.35,z-r.d*.25,.72);lamp(x+r.w*.39,z-r.d*.32,2.50);
    for(const dx of [-.36,.62,1.60])shrub(x+dx,.37,z-r.d*.32,.64);
    for(const dx of [-1.76,1.83]){cyl(x+dx,.61,z+.85,.19,.46,'#8d927b');add('parkCrown',model(x+dx,.96,z+.85,.29,.28,.25,dx),'#4b5740',M.PARK_LEAF);}
   }
  }
 }
 // Controlled wear, moss and leaves break up the paving without disguising pickups.
 for(let i=0;i<52;i++){
  const x=Math.sin(i*12.79)*22.6,z=Math.cos(i*7.31)*16.5;
  if(obstacles.some(o=>{const r=obstacleToWorld(o);return Math.abs(x-r.x)<r.w/2+.25&&Math.abs(z-r.z)<r.d/2+.25;}))continue;
  for(let k=0;k<3;k++)flat(x+k*.13,z+Math.sin(k+i)*.19,.10,.055,i%2?'#9b8458':'#b09a6c',.04,i*.3+k);
 }
 for(const [x,z,a] of [[-8,3,.4],[9,-5,-.5],[-17,13,.2],[12,-13,-.3]]){
  flat(x,z,1.1,.025,'#3e4c44',.041,a);flat(x+.44,z-.19,.60,.025,'#3e4c44',.042,a+.65);
 }
 // Thin iron railings mark the original boundary while revealing the cemetery beyond it.
 for(const side of [-1,1]){
  for(const y of [.30,1.10]){box(0,y,side*17.55,48.9,.055,.055,dark,M.METAL);box(side*24.45,y,0,.055,.055,35.1,dark,M.METAL);}
  for(let x=-24.45;x<=24.46;x+=.815)box(x,.62,side*17.55,.028,1.24,.028,'#6b7965',M.METAL);
  for(let z=-17.55;z<=17.56;z+=.8357)box(side*24.45,.62,z,.028,1.24,.028,'#6b7965',M.METAL);
  for(const x of [-24.45,-16.3,-8.15,0,8.15,16.3,24.45])box(x,.72,side*17.55,.12,1.44,.12,stone);
  for(const z of [-11.7,-5.85,0,5.85,11.7])box(side*24.45,.72,z,.12,1.44,.12,stone);
 }
 // Cemetery grounds continue outside the existing fence rather than ending at a board edge.
 for(const side of [-1,1]){
  box(side*25.85,.29,0,1.15,.58,36.8,'#64745e');box(side*25.85,.64,0,1.24,.11,36.8,'#8a9579');
  for(const x of [-15.8,15.8]){box(x,.32,side*19.4,25.2,.64,1.0,'#5b705d');box(x,.69,side*19.4,25.4,.10,1.12,'#839475');}
  for(let k=0;k<8;k++){
   const z=-17+k*5.1;tree(side*(29.8+(k%2)*2.1),0,z,.91+(k%3)*.12,k%3!==1);
   grave(side*27.5,0,z,side+k);
  }
  // Nearer trees and uneven banks cast into the outer walk without occupying it.
  for(const z of [-12.7,-1.0,11.7]){
   const x=side*26.35;
   oval(x,-.29,z,1.05,.47,2.15,'#425c3e');tree(x,.13,z,.86,z!==-1);
   shrub(x,.13,z+1.4,1.3);
  }
  for(const x of [-21,-13,13,21])tree(x,0,side*25.4,1.05+(x===13?.25:0),x!==-13);
  for(const x of [-3.3,3.3]){box(x,.80,side*19.1,.74,1.6,.74,stone);box(x,1.64,side*19.1,.92,.10,.92,trim);lamp(x,side*19.1,2.35,false);}
 }
 // Chapel backdrop: solid walls, recessed door, lit windows, buttresses and a pitched roof.
 const cz=-24.0;
 box(0,1.78,cz,9.1,3.56,7.8,'#798674');box(0,.22,cz,9.5,.44,8.2,'#566b5b');
 add('arenaGable',model(0,3.56,cz,4.76,2.25,4.13),'#3b464a',M.PARK_ROOF);
 box(0,3.59,cz+4.14,9.58,.16,.15,'#8a9388');box(0,5.85,cz,9.6,.13,.16,'#67766f');
 for(const dx of [-4.34,4.34])seg([dx,.18,cz+4.07],[dx,3.58,cz+4.07],.066,'#586f60');
 for(const x of [-3.1,3.1]){box(x,.29,cz+4.30,1.62,.58,.50,'#8c977c');shrub(x,.58,cz+4.3,1.0);}
 box(0,1.15,cz+3.94,1.78,2.3,.16,'#263e39');box(0,1.11,cz+4.03,1.48,2.18,.055,'#756a51',M.MATTE);
 for(const dx of [-1.04,1.04])box(dx,1.25,cz+4.07,.25,2.5,.27,trim);
 box(0,2.54,cz+4.07,2.31,.24,.27,trim);
 for(const dx of [-3.1,3.1]){
  box(dx,1.97,cz+3.93,1.16,1.62,.10,'#263e39');
  const window=box(dx,1.99,cz+4.0,.91,1.32,.03,'#bba781',M.GLASS);window.glow=.16;
  box(dx,1.98,cz+4.024,.055,1.36,.028,'#647061',M.METAL);box(dx,1.98,cz+4.024,.95,.05,.028,'#647061',M.METAL);
 }
 for(const x of [-4.0,4.0])box(x,1.47,cz+4.18,.48,2.94,.79,'#a0a78d');
 box(0,4.30,cz+.8,1.60,2.4,1.8,'#8c9982');
 box(0,4.53,cz+1.72,.77,1.1,.08,'#2d453e');
 add('arenaGable',model(0,5.50,cz+.8,1.04,.95,1.15),'#4b675e',M.PARK_ROOF);
 seg([0,6.37,cz+.8],[0,7.18,cz+.8],.055,'#b4b99a');seg([-.27,6.90,cz+.8],[.27,6.90,cz+.8],.045,'#b4b99a');
 flat(0,-21.4,4.8,7.0,'#6c7965',.025);
 for(let x=-20;x<=20;x+=4)if(Math.abs(x)>6){grave(x,0,-22.6,Math.abs(x));grave(x+1.2,0,23.1,Math.abs(x)+1);}
 // .139: a cemetery district surrounds the playable memorial on all four sides.
 // Far plots use a few instanced shapes. Optional detail is skipped in Performance.
 const tier=(from,value)=>{for(let i=from;i<parts.length;i++){parts[i].memorialDetail=value;if(value)parts[i].cast=false;}};
 let exteriorGravesOmitted=0;
 const farGrave=(x,z,n,detail=0)=>{
  // Leave real gaps around the new walks, family crypts and southern entrance.
  if((Math.abs(Math.abs(x)-28.95)<1.42&&Math.abs(z)<18.2)||
     (Math.abs(x+34.7)<2.35&&Math.abs(z+8.7)<2.8)||
     (Math.abs(x-34.7)<2.35&&Math.abs(z-10.1)<2.8)||
     (Math.abs(x)<8.0&&z>19.3&&z<29.0)||
     (Math.abs(Math.abs(z)-23.45)<1.7&&Math.abs(x)>6.6&&Math.abs(x)<26.1)){
   exteriorGravesOmitted++;return;
  }
  const begin=parts.length,c=['#78858a','#6e7d80','#899292','#61767a'][n%4],shape=n%6;
  const close=Math.abs(x)<38&&Math.abs(z)<32,edge='#9da59a';
  flat(x,z+.40,.94,1.92,n%3?'#303c38':'#414b43',.005);
  if(shape===0){
   box(x,.20,z-.48,.78,.28,.40,c,M.PARK_STONE,0,false);
   box(x,.79,z-.48,.19,1.10,.20,edge,M.PARK_STONE,0,false);
   box(x,1.04,z-.48,.79,.15,.22,edge,M.PARK_STONE,0,false);
  }else if(shape===1){
   box(x,.40,z-.48,.67,.70,.18,c,M.PARK_STONE,0,false);
   oval(x,.73,z-.48,.335,.27,.09,c,M.CONCRETE).cast=false;
  }else if(shape===2){
   box(x,.12,z-.48,.82,.23,.49,c,M.PARK_STONE,0,false);
   box(x,.61,z-.48,.42,.81,.31,edge,M.PARK_STONE,0,false);
   add('powerHull',model(x,1.12,z-.48,.23,.23,.17),c,M.PARK_STONE,0,false);
  }else if(shape===3){
   box(x,.36,z-.48,.71,.65,.18,c,M.PARK_STONE,.09,false);
   box(x+.10,.72,z-.48,.39,.12,.18,c,M.PARK_STONE,-.16,false);
  }else if(shape===4){
   box(x,.47,z-.48,.74,.86,.19,c,M.PARK_STONE,0,false);
   box(x,.91,z-.48,.88,.12,.27,edge,M.PARK_STONE,0,false);
  }else{
   box(x,.13,z+.35,.77,.24,1.71,c,M.PARK_STONE,0,false);
   flat(x,z+.20,.42,.52,'#475853',.258);
  }
  if(detail===0&&shape!==5){
   box(x,.49,z-.375,.36,.25,.02,'#344546',M.PARK_STONE,0,false);
   flat(x,z+1.26,.84,.13,'#74807a',.035);
  }
  tier(begin,detail);
  if(close&&n%3===0){
   const fine=parts.length;
   for(const side of [-1,1])box(x+side*.50,.065,z+.42,.095,.13,1.94,edge,M.PARK_STONE,0,false);
   flat(x,z+1.39,1.10,.12,edge,.064);
   add('campWear',model(x+.15,.026,z+.57,.29,.008,.61,n*.71),'#4c5c40',M.ORGANIC,0,false);
   if(n%2===0){
    add('powerRing',model(x,.22,z+.87,.19,.07,.21),'#64784c',M.PARK_LEAF,0,false);
    for(const side of [-1,1])oval(x+side*.15,.23,z+.85,.055,.045,.065,side<0?'#bd9a74':'#a67579',M.MATTE).cast=false;
   }else{
    box(x+.22,.18,z+.87,.11,.30,.11,'#c7b594',M.MATTE,0,false);
    oval(x+.22,.36,z+.87,.035,.065,.035,'#ffc685',M.GLASS).glow=.9;
   }
   tier(fine,1);
  }
 };
 let graveCount=0;
 for(let row=0;row<18;row++)for(let col=0;col<24;col++){
  const x=-73.6+col*6.4+(row%2)*1.45,z=-56.5+row*6.5;
  if(Math.abs(x)<27.8&&Math.abs(z)<21.8||Math.abs(x)<7.3&&z< -18||Math.abs(z-29)<2.0||Math.abs(x-39)<1.8)continue;
  const near=Math.abs(x)<38&&Math.abs(z)<32,detail=near?0:(row+col)%2;
  farGrave(x,z,graveCount++,detail);
  if(near&&graveCount%3===0)farGrave(x+2.0,z+.4,graveCount++,1);
 }
 // Tighter rows just beyond the boundary read as a continuous graveyard at play scale.
 for(const side of [-1,1]){
  for(let j=0;j<12;j++)for(const band of [0,1]){
   const x=side*(30.7+band*3.35),z=-23.2+j*4.1+band*.7;
   farGrave(x,z,graveCount++);
  }
  for(let j=0;j<14;j++){
   const x=-24.5+j*3.75,z=side*26.5;
   if(side<0&&Math.abs(x)<6.7)continue;
   farGrave(x,z,graveCount++);
  }
 }
 // Raised cemetery terraces and cross walks continue naturally behind the fence.
 for(const side of [-1,1]){
  flat(side*40,0,2.8,113,'#485354',-.004);
  flat(0,side*35.8,146,2.8,'#505b59',-.002);
  for(const x of [-73,-48,-24,0,24,48,73]){
   const begin=parts.length;
   tree(x,-.06,side*(44+(Math.abs(x)%3)*4),1.10+(Math.abs(x)%5)*.06,false);tier(begin,Math.abs(x)>50?1:0);
  }
  for(const z of [-34,-20,0,20,34]){
   const x=side*(48+Math.abs(z)%4),begin=parts.length;
   tree(x,-.08,z,1.15,false);tier(begin,1);
  }
  for(const x of [-61,-35,-12,12,35,61]){
   box(x,.62,side*61,1.15,1.24,1.08,'#526567',M.PARK_STONE,0,false);
   box(x,.015,side*61,23,.30,.53,'#34474a',M.PARK_STONE,0,false);
  }
  // Mausoleum silhouettes beyond the nearest grave rows.
  for(const z of [-28,7,33]){
   const x=side*(51+(z===7?8:0));
   box(x,1.08,z,4.9,2.16,3.5,'#566c70',M.PARK_STONE,0,false);
   box(x,2.24,z,5.25,.22,3.85,'#8b9590',M.PARK_STONE,0,false);
   add('arenaGable',model(x,2.35,z,2.78,.95,2.0),'#263c48',M.PARK_ROOF,0,false);
   box(x,1.02,z+1.78,1.08,1.86,.035,'#182f38',M.MATTE,0,false);
  }
 }
 // A defined chapel forecourt: approach stones, lanterns, a rose window and buttresses.
 for(const side of [-1,1]){
  for(const z of [-22.1,-25.7]){box(side*4.62,1.30,z,.52,2.6,.76,'#8d9690');box(side*4.75,2.68,z,.73,.18,.93,'#a0a79c');}
  for(const z of [-20.1,-25.7])lamp(side*6.25,z,2.65,false);
  bench(side*8.25,0,-19.35,2.05);
 }
 const rose=add('powerRing',model(0,3.53,-19.82,.63,.63,.055),'#a5a69a',M.PARK_STONE);
 oval(0,3.53,-19.83,.55,.55,.031,'#d3a36f',M.GLASS).glow=.40;
 for(let j=0;j<6;j++){const a=j*Math.PI/3;seg([Math.cos(a)*.10,3.53+Math.sin(a)*.10,-19.77],[Math.cos(a)*.52,3.53+Math.sin(a)*.52,-19.77],.025,'#505e5c');}
 // Flush burial plots inside the arena. Flat ledgers are intentionally traversable;
 // upright headstones remain on existing blocked beds or outside the fence.
 for(const q of DeadwatchCore.MEMORIAL_GRAVES){
  const p=simToWorld(q.x,q.y),x=p.x,z=p.z;
  flat(x,z,1.30,2.18,'#28352f',.044);
  for(const side of [-1,1])flat(x+side*.70,z,.105,2.46,'#747e76',.049);
  for(const side of [-1,1])flat(x,z+side*1.20,1.48,.12,'#7e8a7e',.050);
  flat(x,z-.88,.90,.35,'#92998a',.057);flat(x,z-.88,.51,.12,'#465651',.065);
  for(let j=0;j<5;j++)flat(x+Math.sin(q.id*3+j*2.7)*.44,z+Math.cos(j*4.3)*.71,.15,.075,'#4a5942',.058,j*.6);
 }
 // Uneven moss islands and grass texture fill the lawns, kept clear of the burial cues.
 for(const side of [-1,1])for(let j=0;j<34;j++){
  const x=side*(12.0+(Math.sin(j*5.91)*.5+.5)*5.6),z=-10.0+(Math.cos(j*3.71)*.5+.5)*20;
  if(obstacles.some(o=>{const r=obstacleToWorld(o);return Math.abs(x-r.x)<r.w/2+.35&&Math.abs(z-r.z)<r.d/2+.35;})||DeadwatchCore.MEMORIAL_GRAVES.some(q=>{const p=simToWorld(q.x,q.y);return Math.abs(x-p.x)<1.05&&Math.abs(z-p.z)<1.5;}))continue;
  const begin=parts.length;
  add('campWear',model(x,.012,z,.42+(j%4)*.18,.004,.28+(j%3)*.12,j*.91),j%3?'#394b3c':'#4b5843',M.ORGANIC,0,false);
  for(let k=0;k<4;k++)add('arenaGable',model(x+Math.sin(k*2.4)*.35,.02,z+Math.cos(k*2.4)*.23,.012,.055+(k%2)*.025,.09,j+k),'#728062',M.ORGANIC,0,false);
  tier(begin,j%3===0?1:0);
 }
 // A handful of flush memorial ledgers fill the quiet lawns without creating barriers.
 for(const side of [-1,1])for(const z of [-5.2,-1.3,2.3,5.7]){
  const x=side*17.7;
  flat(x,z,.64,1.05,'#6c7970',.029,.055*side);
  flat(x,z-.20,.38,.045,'#bdba94',.035);flat(x,z-.08,.29,.035,'#a7ad91',.035);
  flat(x,z+.07,.34,.029,'#9aa88b',.035);
 }
 // Warm votives and wreaths add detail to the crypts and monument in existing solid beds.
 const votives=(x,y,z)=>{
  for(let j=0;j<3;j++){
   const xx=x+(j-1)*.15,zz=z+(j%2)*.08,h=.12+(j%2)*.055;
   box(xx,y+h/2,zz,.07,h,.07,'#c7b895',M.MATTE);
   oval(xx,y+h+.05,zz,.026,.065,.026,'#ffc67d',M.GLASS).glow=1.05;
  }
  fixtures.push({x,y:y+.27,z,color:'#efb978',powered:false,phase:x+z,radius:3.6,intensity:.64,votive:true});
  lights.push({x,y:.068,z,radius:1.5,color:'#efb978',strength:.24,mode:0,fixture:fixtures.length-1});
 };
 for(const [i,o] of obstacles.entries()){
  const r=obstacleToWorld(o),x=r.x,z=r.z;
  if(i===0){
   for(const side of [-1,1]){votives(x+side*2.1,.84,z+2.2);votives(x+side*3.1,.70,z-2.7);}
  }else{
   for(const side of [-1,1])votives(x+side*1.14,.40,z+1.33);
   if(i<3){
    add('powerRing',model(x,.99,z+1.145,.27,.29,.04),'#536b4a',M.PARK_LEAF);
    box(x,.74,z+1.20,.07,.22,.025,'#977956',M.FABRIC);
    for(const side of [-1,1])for(let j=0;j<4;j++)add('parkCrown',model(x+side*1.73,.58+j*.21,z-.75+j*.06,.13,.20,.15,j),'#425b46',M.PARK_LEAF);
   }
  }
 }
 // Planted corners receive stone urns and flowers, all within the original solid beds.
 for(const o of obstacles.slice(1)){
  const r=obstacleToWorld(o);
  for(const side of [-1,1]){
   const x=r.x+side*(r.w*.39),z=r.z+.13;
   cyl(x,.65,z,.24,.47,'#9ca393');cyl(x,.93,z,.33,.12,'#b4b5a3');
   for(let j=0;j<5;j++)oval(x+Math.sin(j*2.4)*.16,1.06+(j%2)*.06,z+Math.cos(j*2.4)*.15,.10,.055,.10,j%2?'#b1986f':'#845d62',M.MATTE);
  }
 }
 // Small lanterns stay on solid platform edges; pools brighten the open circulation lanes.
 for(const [x,z] of [[-13.9,-8.8],[13.9,-8.8],[-13.9,8.8],[13.9,8.8]])lamp(x,z,2.32,false);
 for(const f of fixtures){f.color='#ffc481';f.intensity=f.votive?.72:f.powered?.84:.92;f.radius=f.votive?3.6:f.powered?7.1:6.6;}
 for(const l of lights){l.color='#efb978';l.strength*=1.5;l.radius*=1.16;}
 // Ground wear, shallow runoff and moss link the empty lawn to the cemetery paths.
 for(let i=0;i<28;i++){
  const x=Math.sin(i*8.31)*22.4,z=Math.cos(i*5.73)*15.4;
  if(obstacles.some(o=>{const r=obstacleToWorld(o);return Math.abs(x-r.x)<r.w/2+.5&&Math.abs(z-r.z)<r.d/2+.5;}))continue;
  const begin=parts.length;flat(x,z,.32+(i%3)*.17,.035,'#2d413d',.049,i*.68);
  flat(x+.25,z+.12,.21,.023,'#384a41',.051,i*.68+.45);tier(begin,1);
 }
 // .140: exterior-only landmarks and ground detail; all scenery stays beyond the railings.
 const exteriorStart=parts.length,exteriorFixtureStart=fixtures.length,exteriorLightStart=lights.length;
 const exteriorTag=(from,fine=0)=>{for(let i=from;i<parts.length;i++){parts[i].memorialExterior=true;parts[i].cast=false;if(fine)parts[i].memorialDetail=1;}};
 const wear=(x,z,w,d,n)=>add('campWear',model(x,.012,z,w,.006,d,n*.73),n%2?'#3f4e3f':'#4a5545',M.ORGANIC,0,false);
 // Narrow gravel walks, broken flagstones and overgrown verges between the near rows.
 for(const side of [-1,1]){
  flat(side*28.95,0,1.64,35.2,'#59615b',-.006);
  for(const x of [-16.1,16.1])flat(x,side*23.45,19.0,1.26,'#535e58',-.005);
  for(let j=0;j<13;j++){
   const z=-16.2+j*2.7,x=side*28.95;
   flat(x+Math.sin(j*2.3)*.10,z,1.31,.88,j%3?'#727c70':'#646f67',.019,(j%3-1)*.07);
   wear(x+side*1.01,z+.41,.31,.59,j);
   const fine=parts.length;
   flat(x-.16,z+.10,.52,.022,'#344540',.029,.49+j*.31);
   for(let k=0;k<3;k++)add('arenaGable',model(x+side*(.96+k*.06),.01,z+.35+k*.15,.013,.09+k*.02,.12,j+k),'#7b8060',M.ORGANIC,0,false);
   exteriorTag(fine,1);
  }
  // Modest lantern pools retain the existing nearest-four light budget.
  for(const z of [-14.5,7.4])lamp(side*28.55,z,2.30,false);
  for(const x of [-9.2,9.2]){cypress(x,0,side*24.4,3.1);wear(x,side*24.4,.67,.72,3);}
  // Near retaining walls now read as individual courses of weathered stone.
  const fine=parts.length;
  for(let j=0;j<18;j++){
   const z=-17.3+j*2;
   box(side*25.262,.30,z,.014,.38,.025,'#3d5049',M.PARK_STONE,0,false);
   box(side*26.438,.30,z+.30,.014,.38,.025,'#3d5049',M.PARK_STONE,0,false);
  }
  for(const z of [-14.7,-6.2,5.1,14.3]){
   add('parkCrown',model(side*26.46,.43,z,.16,.33,.44,z),'#40583e',M.PARK_LEAF,0,false);
   box(side*25.26,.63,z,.024,.045,.65,'#657655',M.PARK_STONE,0,false);
  }
  exteriorTag(fine,1);
 }
 // Broad, irregular moss and bare-soil islands give the cemetery floor more depth.
 for(const side of [-1,1])for(let j=0;j<20;j++){
  const x=side*(31.9+(j%3)*3.17),z=-30+j*3.13;
  add('campWear',model(x,-.011,z,1.10+(j%3)*.29,.004,1.20+(j%4)*.21,j*1.71),j%3?'#39473a':'#4b4f3e',M.ORGANIC,0,false);
  if(j%3===0){
   const fine=parts.length;
   for(let k=0;k<3;k++)add('arenaGable',model(x+.4+k*.09,.01,z-.6+k*.12,.014,.11+k*.03,.16,j+k),'#697354',M.ORGANIC,0,false);
   exteriorTag(fine,1);
  }
 }
 // Two family crypts provide recognizable silhouettes beside the nearest burial rows.
 const familyCrypt=(x,z,n)=>{
  box(x,.15,z,3.25,.30,2.92,'#657371');
  box(x,1.28,z,2.84,2.25,2.42,'#89938c');
  box(x,2.44,z,3.18,.18,2.78,'#b0b3a3');
  add('arenaGable',model(x,2.55,z,1.72,.82,1.52),'#424f51',M.PARK_ROOF);
  box(x,1.13,z+1.225,1.17,1.94,.04,'#203735',M.MATTE);
  for(const s of [-1,1]){box(x+s*.70,1.20,z+1.27,.19,2.13,.20,'#b1b6a5');box(x+s*1.36,1.14,z+1.13,.22,2.02,.26,'#a4ac9b');}
  box(x,2.23,z+1.29,1.61,.18,.23,'#b7bba9');
  box(x,.08,z+1.61,1.88,.16,.69,'#8a9785');
  const fine=parts.length;
  for(const dx of [-.36,-.18,0,.18,.36])box(x+dx,1.13,z+1.268,.027,1.79,.024,'#768573',M.METAL);
  for(const yy of [.55,1.31,1.91])box(x,yy,z+1.28,.99,.035,.035,'#88957e',M.METAL);
  box(x,2.64,z+1.46,.76,.24,.03,'#344d48');
  for(const yy of [2.60,2.67])box(x,yy,z+1.48,.46,.017,.012,'#9ba98e');
  for(const s of [-1,1])for(const yy of [.72,1.45,2.05])box(x+s*1.429,yy,z,.018,.02,2.22,'#52665a');
  add('parkCrown',model(x-1.42,.56,z+.58,.14,.45,.40,n),'#3b5842',M.PARK_LEAF);
  add('powerRing',model(x,1.45,z+1.31,.22,.25,.035),'#74815a',M.PARK_LEAF);
  box(x,1.17,z+1.35,.06,.22,.016,'#a88a70',M.FABRIC);
  exteriorTag(fine,1);
 };
 familyCrypt(-34.7,-8.7,0);familyCrypt(34.7,10.1,1);
 // Southern lychgate and memorial court: open ironwork, stone piers and urns.
 for(const side of [-1,1]){
  box(side*3.9,.18,24.0,1.46,.36,1.45,'#71847a');
  box(side*3.9,1.48,24.0,.93,2.60,.93,'#96a394');
  box(side*3.9,2.85,24.0,1.28,.19,1.25,'#b6bba6');
  cyl(side*3.9,3.13,24.0,.26,.42,'#9ea78f');
  oval(side*3.9,3.41,24.0,.36,.25,.36,'#56674a',M.PARK_LEAF);
  for(const y of [.62,1.51])box(side*6.0,y,24.0,3.24,.06,.06,'#718575',M.METAL);
  for(let j=0;j<10;j++)box(side*(4.46+j*.30),.98,24.0,.025,1.63,.028,'#6c7f6d',M.METAL);
  bench(side*6.0,0,22.0,1.8);
  lamp(side*3.9,26.6,2.70,false);
 }
 box(0,2.81,24.0,7.8,.25,.55,'#7d8b7e');
 add('arenaGable',model(0,2.96,24.0,4.26,.57,.67),'#3d4c4b',M.PARK_ROOF);
 box(0,2.79,24.30,2.62,.36,.05,'#364c46');
 box(0,2.79,24.334,1.84,.035,.013,'#acb497');
 flat(0,24.1,5.7,7.7,'#57675e',.006);
 for(let j=0;j<6;j++)flat(0,20.8+j*1.19,4.9,1.03,j%2?'#717c6d':'#657565',.017);
 // The chapel gets a solid threshold, carved door, ridge caps and a readable bell tower.
 for(let j=0;j<3;j++)box(0,.055+j*.065,-19.48-j*.23,2.57-j*.15,.11+j*.13,.48,'#9da48e');
 for(const side of [-1,1]){
  for(const yy of [.60,1.48])box(side*.37,yy,-19.928,.52,.56,.028,'#504e42',M.MATTE);
  box(side*.11,1.15,-19.89,.045,.17,.042,'#bcaa7b',M.METAL);
  box(side*3.24,4.16,-23.7,.22,.38,.17,'#8c978b');
 }
 box(0,1.13,-19.906,.035,2.07,.023,'#293b36',M.MATTE);
 cyl(0,4.51,-22.18,.20,.32,'#9b8f64');
 oval(0,4.33,-22.18,.29,.09,.28,'#9c946c',M.METAL);
 seg([0,4.70,-22.18],[0,5.10,-22.18],.032,'#354a40');
 const chapelFine=parts.length;
 for(let j=0;j<12;j++)box(-4.38+j*.795,5.89,-24.0,.74,.09,.23,j%3?'#6c7771':'#7d8880',M.PARK_ROOF);
 for(const side of [-1,1]){
  for(let j=0;j<5;j++)box(side*(1.58+j*.53),.54,-19.857,.025,.57,.015,'#4d6355');
  for(let j=0;j<4;j++)add('parkCrown',model(side*4.16,.34+j*.39,-19.66,.18,.31,.14,j),'#4f6648',M.PARK_LEAF,0,false);
 }
 exteriorTag(chapelFine,1);
 // A quiet gravedigger's corner: open earth, stacked slabs, shovel and barrow.
 const gx=-28.5,gz=14.4;
 flat(gx,gz,1.24,2.20,'#172925',.027);
 for(const side of [-1,1])box(gx+side*.65,.12,gz,.12,.24,2.40,'#66705b');
 add('campWear',model(gx-1.12,.06,gz,.38,.19,1.04,.2),'#6c6450',M.ORGANIC,0,false);
 for(let j=0;j<3;j++)box(gx+.83,.095+j*.13,gz+.65,.51,.12,.74,'#858e7c',M.PARK_STONE,j*.07,false);
 seg([gx-.95,.18,gz+.62],[gx-.69,1.57,gz+.79],.029,'#8c775b');
 box(gx-.99,.15,gz+.59,.18,.27,.045,'#7a867a',M.METAL,-.15,false);
 add('pickupCylinder',basisModel(gx+.79,.27,gz-1.45,gx+1.14,.27,gz-1.45,.25,.25),'#2c3d37',M.METAL,0,false);
 add('powerHull',model(gx+.96,.65,gz-1.00,.37,.23,.48),'#737e65',M.METAL,0,false);
 for(const side of [-1,1]){
  seg([gx+.96+side*.28,.49,gz-1.42],[gx+.96+side*.28,.85,gz-.16],.026,'#78856e');
  seg([gx+.96+side*.28,.06,gz-.71],[gx+.96+side*.28,.54,gz-.88],.025,'#78856e');
 }
 for(const f of fixtures.slice(exteriorFixtureStart)){f.color='#ffc481';f.intensity=.92;f.radius=6.6;}
 for(const l of lights.slice(exteriorLightStart)){l.color='#efb978';l.strength*=1.5;l.radius*=1.16;}
 exteriorTag(exteriorStart);
 graveCount-=exteriorGravesOmitted;
 return {parts,lights,fixtures,solids,style,graveCount};
}

// Pump Station art stays inside existing solid pads; apron wear is purely visual.
function pumpStationPlan(obstacles){
 const parts=[],lights=[],fixtures=[],solids=[],style=ARENA_LOOKS.pump,M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.METAL,glow=0,cast=true)=>{const p={mesh,matrix,color,material,glow,cast};parts.push(p);return p;};
 const box=(x,y,z,w,h,d,c,mat=M.METAL,a=0,cast=true)=>add('box',model(x,y,z,w/2,h/2,d/2,a),c,mat,0,cast);
 const oval=(x,y,z,w,h,d,c,mat=M.METAL)=>add('pickupOrb',model(x,y,z,w,h,d),c,mat);
 const cyl=(x,y,z,r,h,c,mat=M.METAL)=>add('pickupCylinder',model(x,y,z,r,h/2,r),c,mat);
 const seg=(a,b,r,c,mat=M.METAL)=>add('pickupCylinder',basisModel(...a,...b,r,r),c,mat);
 const flat=(x,z,w,d,c,y=.024,a=0)=>box(x,y,z,w,.006,d,c,M.MATTE,a,false);
 const line=(ax,az,bx,bz,w,c,y=.027)=>flat((ax+bx)/2,(az+bz)/2,Math.hypot(bx-ax,bz-az),w,c,y,-Math.atan2(bz-az,bx-ax));
 const ring=(x,y,z,r,t,c)=>{for(let k=0;k<32;k++){const a=k*Math.PI/16,b=(k+1)*Math.PI/16;seg([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],t,c);}};
 const steel='#596d70',dark='#26383b',cream='#b5b5a1',ochre='#a78a50',rust='#685342';
 const hatch=(x,y,z,r=.4)=>{cyl(x,y,z,r,.10,dark);cyl(x,y+.065,z,r*.85,.035,cream);box(x,y+.16,z,r,.045,.065,steel);for(let k=0;k<6;k++){const a=k*Math.PI/3;cyl(x+Math.cos(a)*r*.75,y+.094,z+Math.sin(a)*r*.75,.025,.025,dark);}};
 const ladder=(x,z,bottom,top)=>{for(const dx of [-.27,.27])seg([x+dx,bottom,z],[x+dx,top+.15,z],.03,steel);for(let y=bottom+.18;y<top;y+=.30)seg([x-.29,y,z],[x+.29,y,z],.023,cream);};
 const valve=(x,y,z,r=.28)=>{seg([x,y,z-.25],[x,y,z],.055,steel);for(let k=0;k<16;k++){const a=k*Math.PI/8,b=(k+1)*Math.PI/8;seg([x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],.025,ochre);}for(const a of [0,Math.PI/2])seg([x-Math.cos(a)*r,y-Math.sin(a)*r,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],.024,ochre);};
 const fixture=(x,y,z,powered=true,c='#e4c18c',floor=0,radius=6.4)=>{
  const f=fixtures.length;fixtures.push({x,y:y-.12,z:z+.16,color:c,powered,phase:x*.8+z,radius,intensity:.76});
  box(x,y+.06,z,.60,.15,.42,dark);const glass=box(x,y-.025,z+.035,.46,.032,.31,c,M.GLASS);glass.fixture=f;
  lights.push({x,y:floor+.065,z:z+.25,radius:2.6,color:c,strength:.19,mode:0,fixture:f});
 };
 const bollard=(x,z)=>{cyl(x,.10,z,.16,.2,dark);cyl(x,.58,z,.085,.9,ochre);cyl(x,.83,z,.09,.12,dark);};
 // Broad slabs and quiet wear break up the ground without covering pickups or escape lanes.
 // Continuous terrain reaches past every corner camera view; the plant has a defined apron.
 box(0,-.20,0,190,.24,160,'#303d33',M.PARK_STONE,0,false);
 box(0,-.11,0,82,.18,64,'#313b3c',M.ASPHALT,0,false);
 box(0,.009,0,47.8,.006,33.6,'#40494a',M.ASPHALT,0,false);
 box(0,.014,.2,9.0,.006,33.2,'#59605a',M.PARK_STONE,0,false);box(-4.0,.018,.35,38.2,.006,5.1,'#59615b',M.PARK_STONE,0,false);
 for(const x of [-18,-12,-6,0,6,12,18])line(x,-16.65,x,16.65,.022,'#2e3938',.022);
 for(const z of [-14,-9,-4,1,6,11,16])line(-23.8,z,23.8,z,.023,'#2f3a39',.023);
 const hash=n=>{const q=Math.sin(n*12.9898+4.73)*43758.5453;return q-Math.floor(q);};
 for(let i=0;i<30;i++){
  const x=-22+hash(i+1)*43,z=-15.9+hash(i+67)*31.5,w=.8+hash(i+100)*1.8,d=.25+hash(i+201)*.8;
  // Irregular, matte oil/water marks: flattened geometry, below paint and drains.
  add('pickupCylinder',model(x,.025,z,w,.003,d),i%3?'#3d4847':'#354140',M.PARK_STONE,0,false);
  add('pickupCylinder',model(x+w*.56,.026,z+d*.26,w*.57,.003,d*.62),i%3?'#3d4847':'#354140',M.PARK_STONE,0,false);
  if(i%3===0){line(x-w,z+.14,x-.08,z-.09,.035,'#293534',.033);line(x-.08,z-.09,x+.52,z+.38,.027,'#293534',.033);}
 }
 for(const x of [-4.35,4.35])for(let z=-15.8;z<16;z+=2.9)flat(x,z,.09,1.45,'#9d956e',.041);
 for(const x of [-18.2,-17.55,6.45,7.08])for(let z=-14;z<15;z+=3.1)flat(x,z,.13,1.6,'#354140',.032,.015);
 const drain=(x,z,w,d)=>{flat(x,z,w+.10,d+.10,'#68726a',.043);flat(x,z,w,d,'#202e30',.049);for(let t=-w/2+.08;t<w/2;t+=.18)flat(x+t,z,.037,d-.03,'#566562',.054);};
 for(const z of [-11.8,-2.45,3.3,12.1])drain(0,z,6.8,.22);
 for(const x of [-19.8,7.1])for(const z of [-6.3,7.35])drain(x,z,1.65,.48);
 // Flush maintenance trench surrounds the existing powered trap.
 flat(0,.7,5.5,5.15,'#29393c',.035);flat(0,.7,5.16,4.81,'#586965',.040);
 for(const x of [-1.72,0,1.72]){flat(x,.7,1.60,4.65,'#3a4d4e',.047);for(const z of [-1.3,2.7])flat(x,z,.43,.08,'#263639',.053);}
 for(const z of [-2.0,3.4])for(let x=-2.6;x<=2.6;x+=.40)flat(x,z,.22,.19,'#ab9459',.058,-.38);
 // Each blocked pad has a different recognizable industrial silhouette.
 const pads=obstacles.filter(o=>!o.walkwayRail).map(obstacleToWorld);
 pads.forEach((r,i)=>{
  box(r.x,.19,r.z,r.w,.38,r.d,'#69716a',M.PARK_STONE);solids.push({x:r.x,z:r.z,w:r.w,d:r.d,h:.38});
  box(r.x,.385,r.z,r.w-.18,.035,r.d-.18,'#4f5b56',M.PARK_STONE);
  for(const s of [-1,1]){box(r.x+s*(r.w/2-.09),.49,r.z,.18,.21,r.d,'#92917c',M.PARK_STONE);box(r.x,.49,r.z+s*(r.d/2-.09),r.w,.21,.18,'#92917c',M.PARK_STONE);}
  for(const s of [-1,1])for(const t of [-1,1])bollard(r.x+s*(r.w/2-.28),r.z+t*(r.d/2-.28));
  for(let k=-2;k<=2;k++)flat(r.x+k*.52,r.z+r.d/2+.13,.29,.20,ochre,.055,-.38);
  if(i===0){
   const x=r.x-.12,z=r.z-.15,R=2.23;
   cyl(x,.56,z,R+.13,.29,dark);cyl(x,2.27,z,R,3.30,'#83908b');
   oval(x,3.91,z,R,.40,R,'#929b90');cyl(x,4.05,z,R*.80,.09,'#8a958a');
   for(const y of [.77,1.70,2.66,3.75])cyl(x,y,z,R+.025,.058,'#546b69');
   ring(x,4.09,z,R*.86,.028,steel);
   for(let k=0;k<12;k++){const a=k*Math.PI/6,xx=x+Math.cos(a)*R*.86,zz=z+Math.sin(a)*R*.86;seg([xx,4.08,zz],[xx,4.72,zz],.022,steel);}
   ring(x,4.70,z,R*.86,.028,cream);hatch(x-.53,4.32,z,.38);
   cyl(x+.68,4.50,z-.35,.16,.89,steel);cyl(x+.68,4.96,z-.35,.23,.09,dark);
   ladder(x,z+R+.09,.50,4.37);
   box(x-1.08,2.56,z+2.02,.86,.67,.07,'#304744');box(x-1.08,2.56,z+2.07,.58,.10,.015,cream);
   seg([x+1.3,.82,z+1.76],[x+1.3,1.48,z+1.76],.15,steel);valve(x+1.3,1.24,z+2.0);
   seg([r.x+2.68,.42,r.z+1.89],[r.x+2.68,2.94,r.z+1.89],.052,steel);fixture(r.x+2.68,2.90,r.z+1.89,true);
  }else if(i===1){
   for(const dx of [-1.40,1.40]){
    const x=r.x+dx,z=r.z-.30,R=.99;
    for(const a of [0,Math.PI*.5,Math.PI,Math.PI*1.5])box(x+Math.cos(a)*.72,.85,z+Math.sin(a)*.72,.16,.94,.16,steel);
    oval(x,1.29,z,R,.44,R,'#526b6d');cyl(x,2.57,z,R,2.57,'#7a9290');oval(x,3.86,z,R,.46,R,'#96a39a');
    for(const y of [1.38,3.73])cyl(x,y,z,1.03,.085,cream);
    cyl(x,4.51,z,.14,.47,steel);cyl(x,4.77,z,.21,.09,dark);
    seg([x,1.4,z+1.07],[x,2.9,z+1.07],.07,cream);valve(x,1.54,z+1.17,.22);
    box(x,2.64,z+.99,.50,.37,.035,dark);box(x,2.64,z+1.015,.30,.06,.015,cream);
   }
   seg([r.x-2.9,.86,r.z+1.58],[r.x+2.8,.86,r.z+1.58],.22,'#5a7676');
   for(const dx of [-1.4,1.4])seg([r.x+dx,.86,r.z+1.58],[r.x+dx,1.3,r.z-.3],.12,steel);
   ladder(r.x,r.z-1.55,.46,3.4);seg([r.x-2.73,.42,r.z+1.96],[r.x-2.73,2.59,r.z+1.96],.052,steel);fixture(r.x-2.73,2.55,r.z+1.96,true,'#b0d1cc');
  }else if(i===2){
   for(const dx of [-2.15,0,2.15]){
    const x=r.x+dx,z=r.z;
    for(const zz of [z-1.6,z+1.6]){box(x,.74,zz,1.46,.70,.40,dark);box(x,.41,zz,1.72,.09,.60,steel);}
    seg([x,1.57,z-1.77],[x,1.57,z+1.77],.71,'#718787');oval(x,1.57,z-1.77,.71,.71,.34,'#8e9c91');oval(x,1.57,z+1.77,.71,.71,.34,'#8e9c91');
    for(const zz of [z-1.19,z+1.19])seg([x,1.57,zz-.04],[x,1.57,zz+.04],.75,dark);
    cyl(x,2.40,z,.13,.33,steel);hatch(x,2.61,z,.22);valve(x,1.60,z+2.16,.23);
    seg([x,.72,z+2.25],[x,1.29,z+2.25],.11,steel);
   }
   seg([r.x-2.18,.71,r.z+2.25],[r.x+2.18,.71,r.z+2.25],.16,steel);
   box(r.x,2.18,r.z-2.62,6.1,.10,.47,steel);seg([r.x+2.76,.42,r.z-1.95],[r.x+2.76,2.84,r.z-1.95],.052,steel);fixture(r.x+2.76,2.80,r.z-1.95,true);
  }else{
   const x=r.x,z=r.z-.45;
   box(x,1.83,z,5.75,2.83,3.63,'#656f65',M.PARK_STONE);box(x,3.33,z,6.12,.20,3.96,'#35494c');
   box(x,3.46,z,5.86,.065,3.7,'#566c6c');
   for(const dx of [-2.88,2.88])box(x+dx,1.96,z,.16,2.71,3.67,'#859185',M.PARK_STONE);
   // Recessed service door, window, awning and roof equipment make this a real pump house.
   box(x-.75,1.54,z+1.833,1.13,2.20,.046,dark);box(x-.75,1.53,z+1.862,.94,2.03,.025,'#4e686a');box(x-.42,1.44,z+1.891,.055,.17,.035,cream);
   box(x+1.20,2.24,z+1.84,1.42,.69,.04,dark);box(x+1.20,2.24,z+1.869,1.21,.48,.024,'#849b96',M.GLASS);
   box(x+1.20,2.24,z+1.895,.055,.54,.027,dark);box(x+1.20,2.24,z+1.896,1.25,.045,.027,dark);
   box(x-.66,2.85,z+2.1,1.82,.12,.76,'#536e71');
   for(const dx of [-1.3,-.01])seg([x+dx,2.77,z+2.39],[x+dx,2.27,z+1.9],.024,steel);
   box(x-1.30,3.71,z-.4,1.45,.49,1.31,steel);for(let k=-3;k<=3;k++)box(x-1.30+k*.16,3.97,z-.4,.055,.027,1.06,dark);
   cyl(x+1.53,3.91,z-.75,.24,.78,steel);cyl(x+1.53,4.34,z-.75,.35,.10,dark);
   for(const dx of [-1.6,1.5]){box(x+dx,.72,r.z+2.46,1.04,.62,.56,steel);seg([x+dx,.87,r.z+1.6],[x+dx,.87,r.z+2.65],.20,'#78918b');}
   fixture(x+.3,2.77,z+2.03,true);ladder(x-2.32,z+1.9,.46,3.50);
  }
 });
 // Facility edges have façades, service yards and pipework beyond the walking boundary.
 const house=(x,z,w,d,h)=>{
  box(x,.18,z,w+.30,.36,d+.3,'#5e675e',M.PARK_STONE);box(x,h/2+.3,z,w,h,d,'#646e64',M.PARK_STONE);
  box(x,h+.37,z,w+.22,.16,d+.24,'#364c50');box(x,h+.48,z,w-.12,.065,d-.12,'#526768');
  for(let xx=x-w/2+.75;xx<x+w/2;xx+=1.65){box(xx,h*.59,z+d/2+.027,1.14,.86,.044,dark);box(xx,h*.59,z+d/2+.055,.95,.65,.022,'#96a994',M.GLASS);box(xx,h*.59,z+d/2+.072,.052,.67,.022,steel);}
  for(const xx of [x-w/2+.10,x+w/2-.10])box(xx,h/2+.3,z+d/2+.06,.17,h,.18,'#879383',M.PARK_STONE);
  box(x,h*.39,z+d/2+.07,1.36,h*.72,.065,'#344f51');for(let y=.48;y<h*.73;y+=.28)box(x,y,z+d/2+.11,1.15,.042,.026,steel);
  box(x,h*.80+.2,z+d/2+.5,2.14,.12,1.05,'#456365');fixture(x,h*.8,z+d/2+.60,true);
  box(x-w*.25,h+.70,z,1.57,.39,1.27,steel);for(let k=-3;k<=3;k++)box(x-w*.25+k*.19,h+.913,z,.06,.023,1.06,dark);
  for(const dx of [-w*.36,w*.34])cyl(x+dx,h+.82,z-d*.22,.15,.65,steel);
 };
 house(-12.6,-21.4,12.6,5.2,4.30);house(10.4,-21.3,8.8,5.2,3.55);house(-14.5,21.1,11.4,4.7,3.20);
 const fence=(ax,az,bx,bz)=>{
  const L=Math.hypot(bx-ax,bz-az),N=Math.ceil(L/2.1);
  seg([ax,1.78,az],[bx,1.78,bz],.036,steel);seg([ax,.46,az],[bx,.46,bz],.026,steel);
  for(let k=0;k<=N;k++){const t=k/N,x=ax+(bx-ax)*t,z=az+(bz-az)*t;box(x,.15,z,.25,.3,.25,'#68796d',M.PARK_STONE);seg([x,.18,z],[x,1.91,z],.055,steel);}
  for(let k=0;k<N*4;k++){const t=(k+.5)/(N*4),x=ax+(bx-ax)*t,z=az+(bz-az)*t;seg([x,.47,z],[x,1.76,z],.013,'#596c65');}
 };
 for(const z of [-18.45,18.45])for(const [lo,hi] of [[-24.25,-3.0],[3.0,24.25]])fence(lo,z,hi,z);
 for(const x of [-24.25,24.25])for(const [lo,hi] of [[-18.45,-2.5],[2.5,18.45]])fence(x,lo,x,hi);
 for(const x of [-26.0,26.0]){
  for(const z of [-13,-8,-3,3,8,13]){box(x,1.4,z,.16,2.8,.16,steel);box(x,.16,z,.50,.32,.50,'#667568',M.PARK_STONE);}
  for(const [lo,hi] of [[-17,-2.6],[2.6,17]])for(const y of [1.3,2.43]){seg([x,y,lo],[x,y,hi],.22,'#536e6f');for(let z=lo+.6;z<hi;z+=2.6)seg([x,y,z-.045],[x,y,z+.045],.255,cream);}
 }
 for(const [x,z] of [[-20.8,-20.5],[20.3,-20.2],[-22.6,20.3],[12.8,20.8]]){
  box(x,.22,z,2.5,.44,1.7,'#546157',M.PARK_STONE);box(x,1.19,z,2.19,1.52,1.41,'#657973');
  for(let k=-4;k<=4;k++)box(x+k*.21,1.23,z+.719,.08,1.23,.035,dark);
  seg([x+1.08,1.1,z],[x+1.52,1.1,z],.12,steel);seg([x+1.52,.25,z],[x+1.52,1.1,z],.12,steel);
 }
 // Power-lit poles stay outside the playable boundary, aligned with the perimeter route.
 for(const [x,z] of [[-24.0,-10],[-24.0,10],[23.4,-10],[23.4,10]]){cyl(x,.14,z,.21,.28,dark);seg([x,.25,z],[x,4.65,z],.061,steel);seg([x,4.65,z],[x-Math.sign(x)*.8,4.65,z],.045,steel);fixture(x-Math.sign(x)*.8,4.62,z,true,'#d2c6a3');}
 // Outside the fence: drainage works on the east, maintenance yard on the west.
 // All substantial additions remain beyond the movement boundary and four gate approaches.
 const yardBuilding=(x,z,w,d,h,angle)=>{
  const p0=parts.length,l0=lights.length,f0=fixtures.length,c=Math.cos(angle),q=Math.sin(angle);
  house(0,0,w,d,h);
  for(let i=p0;i<parts.length;i++){
   const m=parts[i].matrix;
   for(const k of [0,4,8,12]){const xx=m[k],zz=m[k+2];m[k]=c*xx+q*zz;m[k+2]=-q*xx+c*zz;}
   m[12]+=x;m[14]+=z;
  }
  for(const list of [lights.slice(l0),fixtures.slice(f0)])for(const f of list){const xx=f.x,zz=f.z;f.x=x+c*xx+q*zz;f.z=z-q*xx+c*zz;}
 };
 yardBuilding(-29.15,-9.4,10.8,4.9,3.65,Math.PI/2);
 // Rear service road extends through the gate gap; long paint marks read at phone scale.
 box(-28.5,.003,5.8,7.6,.014,16.8,'#3b4646',M.ASPHALT,0,false);
 for(const z of [1.9,5.7,9.5,13.3])flat(-27.7,z,3.5,.09,'#8f8c6e',.036);
 for(const x of [-32.7,32.7])box(x,.20,0,.30,.40,37.8,'#64756a',M.PARK_STONE);
 // A grounded stack of replacement pipe and a corrugated maintenance container.
 box(-28.0,.18,11.2,4.3,.36,5.8,'#697568',M.PARK_STONE);
 for(const [dx,y] of [[-1.08,.86],[0,.86],[1.08,.86],[-.54,1.78],[.54,1.78]]){
  seg([-28+dx,y,9.0],[-28+dx,y,13.30],.49,'#677f7d');
  seg([-28+dx,y,13.31],[-28+dx,y,13.34],.38,'#24383c');
  for(const z of [9.7,12.7])seg([-28+dx,y,z-.045],[-28+dx,y,z+.045],.51,'#9d9f87');
 }
 box(-29.0,.18,18.5,6.5,.36,3.0,'#677367',M.PARK_STONE);
 box(-29.0,1.5,18.5,6.15,2.3,2.65,'#455e5f');box(-29,2.70,18.5,6.30,.10,2.76,'#5b7370');
 for(let x=-31.85;x<-26;x+=.38){box(x,1.48,19.845,.07,2.15,.075,'#69817a');box(x,2.765,18.5,.055,.035,2.53,'#6b7c74');}
 box(-25.91,1.46,18.5,.055,2.03,2.36,'#30494b');
 for(const z of [17.89,19.11]){box(-25.866,1.47,z,.04,1.85,.035,'#a6aa91');box(-25.85,1.5,z,.05,.05,.37,'#a6aa91');}
 // Concrete settling basins sit behind the gallery. Gate centre stays an open service crossing.
 for(const z of [-10,10]){
  const x=29.10,w=4.50,d=13.8;
  box(x,.045,z,w+.35,.13,d+.35,'#273c40',M.PARK_STONE);
  box(x,.14,z,w-.34,.09,d-.34,'#29474d',M.WET,0,false);
  for(const side of [-1,1]){
   box(x+side*w/2,.38,z,.29,.75,d+.28,'#7e8778',M.PARK_STONE);
   box(x,.38,z+side*d/2,w,.75,.29,'#7e8778',M.PARK_STONE);
   box(x+side*w/2,.795,z,.36,.08,d+.34,'#95967e',M.PARK_STONE);
  }
  for(const dz of [-4.5,0,4.5])box(x,.25,z+dz,w-.35,.14,.12,'#526b69',M.METAL);
  for(const zz of [z-4.8,z+4.8]){
   seg([26,1.3,zz],[28.2,1.3,zz],.23,'#6f8580');seg([28.2,.74,zz],[28.2,1.3,zz],.23,'#6f8580');
   seg([28.2,.70,zz],[28.2,.73,zz],.18,'#20363c');
   box(27.0,.44,zz,.19,.89,.54,'#596d67',M.PARK_STONE);
   for(const xx of [26.5,27.75])seg([xx-.035,1.3,zz],[xx+.035,1.3,zz],.27,cream);
  }
  for(const dz of [-6,6]){seg([31.35,.80,z+dz],[31.35,1.64,z+dz],.033,steel);}
  seg([31.35,1.63,z-6],[31.35,1.63,z+6],.035,cream);
 }
 // Service crossing and low outer retaining wall give the gate a destination.
 box(29.1,.06,0,7.6,.12,5.4,'#606e65',M.PARK_STONE);
 for(const z of [-2.2,2.2])for(const x of [27,29.1,31.2])flat(x,z,1.0,.15,'#b09a63',.13);
 for(const z of [-26.4,25.5])for(const [x,w] of [[-16,25],[16,25]]){
  box(x,.56,z,w,1.12,.54,'#53675c',M.PARK_STONE);box(x,1.17,z,w+.12,.12,.66,'#87907a',M.PARK_STONE);
  for(let xx=x-w/2+.3;xx<x+w/2;xx+=4.0)box(xx,.66,z,.69,1.32,.73,'#667d69',M.PARK_STONE);
 }
 // Weathered cable reels, crates and scattered rubble remain in the service yards.
 for(const [x,z] of [[-25.8,5.1],[-31.5,5.9],[21.6,-22.5],[19.4,22.1]]){
  cyl(x,.11,z,.63,.18,'#736d51',M.PARK_STONE);cyl(x,.51,z,.44,.66,'#263a3b');cyl(x,.90,z,.63,.13,'#938867',M.PARK_STONE);cyl(x,.975,z,.12,.03,dark);
  box(x+1.17,.43,z+.64,.88,.86,.81,'#645f47',M.PARK_STONE);
  for(const dx of [-.31,.31])box(x+1.17+dx,.44,z+1.058,.045,.79,.030,'#a1946c');
 }
 for(let i=0;i<32;i++){
  const side=i%2?1:-1,x=side*(24.75+hash(i+801)*.28),z=-16.8+hash(i+901)*33.6;if(Math.abs(z)<3.1)continue;
  box(x,.04,z,.17+hash(i+920)*.29,.08,.16+hash(i+930)*.18,'#617166',M.PARK_STONE,i*.83);
  for(let k=0;k<2;k++)add('arenaGable',model(x+k*.10,.04,z+k*.11,.06,.19+hash(i+k+950)*.17,.16,i+k),'#647b53',M.ORGANIC);
 }
 const scrub=(x,z,s)=>{
  for(let k=0;k<3;k++)add('parkCrown',model(x+Math.sin(k*2.3)*s*.4,.27*s,z+Math.cos(k*2.3)*s*.38,.55*s,.36*s,.54*s,k),'#485b48',M.PARK_LEAF);
 };
 for(const [x,z,q] of [[-24.85,-15.9,.85],[-25.1,15.6,.9],[23.3,-20.4,.8],[22.6,20.5,1.1],[-20.3,24.1,.9],[16.9,-25.1,1.15]])scrub(x,z,q);
 const bareTree=(x,z,s)=>{
  seg([x,.05,z],[x+.13*s,2.8*s,z-.08*s],.10*s,'#5b6652',M.PARK_STONE);
  for(const [dx,dz,h] of [[-.80,.20,2.4],[.76,-.18,3.0],[-.12,.70,3.45]]){
   seg([x+.09*s,1.3*s,z],[x+dx*s,h*s,z+dz*s],.046*s,'#5d6d54',M.PARK_STONE);
   seg([x+dx*.7*s,(h-.5)*s,z+dz*.7*s],[x+dx*1.35*s,(h+.30)*s,z+dz*.85*s],.022*s,'#67775a',M.PARK_STONE);
  }
  scrub(x,z,.78*s);
 };
 bareTree(-32.4,16.8,1.2);bareTree(20.1,24.0,1.1);bareTree(-20.5,-25.0,1.25);

 // Surrounding roads and earth shoulders replace the empty backdrop on all four sides.
 const outskirtsStart=parts.length;
 const road=(x,z,w,d)=>box(x,.010,z,w,.018,d,'#3d4947',M.ASPHALT,0,false);
 for(const x of [-36.2,36.2]){
  road(x,0,6.4,54);for(let z=-24;z<=24;z+=4.6)flat(x,z,.13,2.0,'#989575',.039);
  for(const side of [-1,1])box(x+side*3.3,.10,0,.22,.20,54,'#6e7d6c',M.PARK_STONE);
 }
 for(const z of [-30.2,30.2]){
  road(0,z,78.8,6.4);for(let x=-31;x<=31;x+=4.6)flat(x,z,2.0,.13,'#989575',.039);
  for(const side of [-1,1])box(0,.10,z+side*3.3,side===Math.sign(z)?78.8:65.8,.20,.22,'#6e7d6c',M.PARK_STONE);
 }
 // Existing entrance gaps now lead somewhere. Raised props stay out of their approaches.
 for(const z of [-22.6,22.6]){
  box(0,.031,z,5.7,.018,8.7,'#4c5750',M.PARK_STONE,0,false);
  for(const x of [-2.98,2.98])box(x,.10,z,.18,.20,8.7,'#78816c',M.PARK_STONE);
  for(const dz of [-2.8,0,2.8])flat(0,z+dz,.12,1.45,'#a09a72',.058);
 }
 box(-28.5,.027,0,9.8,.018,5.4,'#4c5750',M.PARK_STONE,0,false);
 box(34.1,.027,0,4.1,.018,5.4,'#4c5750',M.PARK_STONE,0,false);
 for(const x of [-31.6,-28.8,-26.0,34.4])flat(x,0,1.4,.12,'#a09a72',.055);
 // Broad planted shoulders anchor the near fence instead of leaving isolated props on a board.
 for(const [x,z,w,d] of [[-23.5,-21.8,8,5],[23.1,-22.8,9.8,7.0],[-23.3,23.0,7.4,4.1],[22.2,23.4,9.1,4.0],[7.3,21.6,5.7,5.0],[-6.8,21.3,5.7,4.8]]){
  box(x,-.006,z,w,.016,d,'#424e3c',M.PARK_STONE,0,false);
  for(let k=0;k<4;k++){
   const xx=x+(hash(k+x+1070)-.5)*w*.86,zz=z+(hash(k+z+1080)-.5)*d*.80;
   scrub(xx,zz,.68+hash(k+x+1090)*.50);
   for(let j=0;j<2;j++)add('arenaGable',model(xx+.19*j,.015,zz+.15*j,.07,.25+hash(j+k+1095)*.24,.22,k+j),'#6e7c56',M.ORGANIC);
  }
 }
 // Irregular banks and a mixed tree line soften the corners beyond the service apron.
 const bank=(x,z,w,d,h)=>{
  add('parkCrown',model(x,-.18,z,w,h,d,x+z),'#3e4c39',M.PARK_STONE);
  add('parkCrown',model(x+w*.46,-.20,z+d*.17,w*.67,h*.81,d*.73,z),'#48533e',M.PARK_STONE);
 };
 for(const [x,z,w,d,h] of [[-34,-23,5.3,3.8,.65],[32,-23,5.0,3.4,.7],[-34,24,5.6,3.5,.8],[30,25,5.1,2.9,.62],[-46,-9,5.5,14,.9],[47,10,6.8,15,1.0],[-16,-39,19,5.3,.85],[12,40,19,5.9,.9]])bank(x,z,w,d,h);
 const treeLine=(x,z,s,seed)=>{
  seg([x,-.01,z],[x+.12*s,3.5*s,z],.11*s,'#59624e',M.PARK_STONE);
  for(let k=0;k<4;k++){
   const y=(1.7+k*.46)*s,angle=seed+k*2.39,reach=(.70-k*.09)*s;
   const xx=x+Math.cos(angle)*reach,zz=z+Math.sin(angle)*reach;
   seg([x+.08*s,y-.48*s,z],[xx,y,zz],.035*s,'#59684d',M.PARK_STONE);
   add('parkCrown',model(xx,y+.17*s,zz,(.65-k*.055)*s,.48*s,(.56-k*.025)*s,angle),k%2?'#43553e':'#506047',M.PARK_LEAF);
  }
 };
 for(const [x,z,q] of [[-28,-24,1.1],[-32,-24.8,1.3],[-35,-20.2,1.15],[27.4,-23.9,1.1],[30.9,-25.3,1.4],[34.5,-22.1,1.2],[-32,23.8,1.0],[-35.3,23.3,1.15],[26.5,23.1,1.1],[30,24.8,1.4],[32.9,23.2,1.2],[-43,-16,1.7],[-44,2,1.45],[-43,18,1.65],[44,-19,1.6],[44,1,1.8],[45,20,1.5],[-21,-36,1.45],[24,-36,1.6],[-22,36,1.6],[21,36,1.5]])treeLine(x,z,q,x*.31+z);
 // Extra plant infrastructure creates silhouettes behind the nearer buildings and basins.
 yardBuilding(-18.7,-37.8,16.2,7.2,5.2,0);yardBuilding(12.2,-38.1,13.7,6.8,4.5,0);
 yardBuilding(-45.1,11.2,19.0,7.4,4.2,Math.PI/2);
 const storageTank=(x,z,r,h)=>{
  cyl(x,.22,z,r+.30,.44,'#627061',M.PARK_STONE);cyl(x,.50+h/2,z,r,h,'#667e78');
  oval(x,h+.50,z,r,.40,r,'#8d9985');for(const y of [.79,h*.5+.5,h+.34])cyl(x,y,z,r+.024,.065,'#3d5553');
  hatch(x-.43,h+.94,z+.12,.40);seg([x+r*.72,.65,z+r*.50],[x+r*.72,h+.89,z+r*.50],.065,steel);
  seg([x-r*.80,.65,z],[x-r*.80,.65,z+2.8],.19,steel);
 };
 storageTank(43.0,-11.3,2.65,5.6);storageTank(43.2,4.5,2.35,4.8);
 // South-side loading apron gives the foreground the same finish as the other edges.
 box(5.8,.020,24.3,4.9,.040,3.25,'#697465',M.PARK_STONE,0,false);
 for(const z of [23.2,24.4,25.6])flat(5.8,z,3.6,.11,'#a49c71',.049);
 for(const x of [-6.0,9.4,17.0]){
  box(x,.16,25.0,2.10,.32,.83,'#7a806c',M.PARK_STONE);
  box(x,.56,25.0,1.72,.55,.61,'#637661',M.PARK_STONE);
  for(const xx of [-.50,.50])box(x+xx,.58,25.315,.16,.42,.024,'#b29a65');
 }
 // Low service lamps illuminate ground, not the entire background.
 for(const [x,z] of [[-31.7,-22.0],[31.8,-22.3],[-32.2,22.1],[31.6,22.0],[-4.0,22.1],[4.0,-23.9]]){
  cyl(x,.13,z,.20,.26,dark);seg([x,.18,z],[x,3.45,z],.053,steel);fixture(x,3.41,z,true,'#dcc493',0,5.7);
 }
 // Distant silhouettes don't consume the near yard's cached shadow-map coverage.
 for(let i=outskirtsStart;i<parts.length;i++){
  const m=parts[i].matrix;if(Math.abs(m[12])>39||Math.abs(m[14])>33)parts[i].cast=false;
 }

 // Reuse the proven gallery geometry; only its finish and lighting are changed.
 const gallery=pumpWalkwayPlan();parts.push(...gallery.parts);lights.push(...gallery.lights);
 for(const z of [-4.6,4.8]){seg([20.43,3.39,z],[20.43,4.53,z],.039,steel);fixture(20.43,4.49,z,true,'#d9be8c',3.35,5.3);}
 return {parts,lights,fixtures,solids,style};
}
function pumpAtmospherePlan(time){
 const haze=[],t=Math.max(0,Number(time)||0),fract=n=>n-Math.floor(n);
 // Small vent plumes originate at real outlets and continue through the loot phase.
 for(const [x,y,z] of [[-10.64,5.01,-6.80],[12.73,4.44,6.15]])for(let k=0;k<5;k++){
  const u=fract(t*.19+k*.20),fade=Math.sin(u*Math.PI);
  haze.push({x:x+u*.55,y:y+u*1.55,z:z+u*.23,radius:.21+u*.57,color:'#bdc9bf',strength:.24*fade,mode:2+fract(t*.04+k*.173)});
 }
 return {parts:[],glows:[],shadows:[],ribbons:[],haze,flash:0,jetActive:false,weatherKind:'vent-steam'};
}

// .143 Cold Storage snow: presentation only, driven by the simulation clock.
// No simulation RNG, colliders, actor speeds, damage or controls are changed.
const COLD_SNOW_RULES=Object.freeze({width:50.4,depth:36.4,maxPrints:160,printLife:48,settleSeconds:65,uploadHz:6});
class ColdSnowState{
 constructor(){this.reset();}
 reset(){this.time=0;this.lastTime=null;this.lastArenaTime=null;this.prints=[];this.contacts={};this.previousPlayer=null;this.revision=0;this.roofs=[];this.solids=[];this.level=2;}
 update(game,details,level=2){
  const now=Math.max(0,Number(game.time)||0),arenaTime=Number(game.arenaTime);
  if(this.lastTime!==null&&(now<this.lastTime-1e-6||(Number.isFinite(arenaTime)&&Number.isFinite(this.lastArenaTime)&&arenaTime<this.lastArenaTime-1)))this.reset();
  this.delta=this.lastTime===null?0:Math.max(0,now-this.lastTime);this.time+=this.delta;this.lastTime=now;this.lastArenaTime=arenaTime;
  this.roofs=details?.snowRoofs||[];this.solids=details?.solids||[];this.level=level;
  const before=this.prints.length;this.prints=this.prints.filter(p=>this.time-p.at<COLD_SNOW_RULES.printLife);
  if(before!==this.prints.length)this.revision++;
  const p=game.player,old=this.previousPlayer;
  this.canStamp=!!p&&p.hp>0&&!game.arcade?.vehicle&&(p.groundHeight||0)<.12&&this.delta>0&&this.delta<.3;
  if(p&&old&&Math.hypot(p.x-old.x,p.y-old.y)>80){this.contacts={};this.canStamp=false;}
  if(!this.canStamp&&game.arcade?.vehicle)this.contacts={};
  this.previousPlayer=p?{x:p.x,y:p.y}:null;
  return this;
 }
 get amount(){return .22+.70*(1-Math.exp(-this.time/COLD_SNOW_RULES.settleSeconds));}
 surface(x,z){let roof=null;for(const r of this.roofs)if(Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)roof=Math.max(roof||0,r.y);if(roof!==null)return roof;let y=0;for(const r of this.solids)if(Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)y=Math.max(y,r.h);return y;}
 stamp(contact){
  if(!Number.isFinite(contact.x)||!Number.isFinite(contact.z)||!Number.isFinite(contact.angle)||Math.abs(contact.x)>25.05||Math.abs(contact.z)>18.05||this.surface(contact.x,contact.z)>.2)return;
  const old=this.prints[this.prints.length-1];if(old&&old.side===contact.side&&Math.hypot(old.x-contact.x,old.z-contact.z)<.12)return;
  this.prints.push({...contact,at:this.time});if(this.prints.length>COLD_SNOW_RULES.maxPrints)this.prints.shift();this.revision++;
 }
 feet(mesh,speed,ground=0){
  if(!this.canStamp||speed<8)return;
  const body=globalThis.DeadwatchSurvivor;if(!body?.boneNames||!body.bindPositions||!mesh?.palette||!mesh.matrix)return;
  const transform=(m,p,k=0)=>[m[k]*p[0]+m[k+4]*p[1]+m[k+8]*p[2]+m[k+12],m[k+1]*p[0]+m[k+5]*p[1]+m[k+9]*p[2]+m[k+13],m[k+2]*p[0]+m[k+6]*p[1]+m[k+10]*p[2]+m[k+14]];
  for(const side of ['l','r']){
   const b=body.boneNames.indexOf('foot_'+side);if(b<0)continue;const bind=body.bindPositions[b];
   const point=z=>transform(mesh.matrix,transform(mesh.palette,[bind[0],bind[1]-.10,bind[2]+z],b*16));
   const heel=point(-.105),toe=point(.252),height=Math.min(heel[1],toe[1])-ground;
   const planted=height<(this.contacts[side]?.down ? .075 : .043),previous=this.contacts[side];
   const contact={side,x:(heel[0]+toe[0])*.5,z:(heel[2]+toe[2])*.5,angle:Math.atan2(toe[2]-heel[2],toe[0]-heel[0])};
   if(planted&&previous&&!previous.down)this.stamp(contact);
   this.contacts[side]={down:planted};
  }
 }
}

// A reusable world-space mask records boot depressions and displaced snow rims.
// Red = compressed sole, green = rim. The rain/snow clock refills old impressions.
function paintColdFootprints(canvas,state){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);
 c.save();c.scale(w/COLD_SNOW_RULES.width,h/COLD_SNOW_RULES.depth);c.translate(25.2,18.2);
 for(const p of state.prints){
  const age=Math.max(0,state.time-p.at),fade=Math.pow(Math.max(0,1-age/COLD_SNOW_RULES.printLife),1.65);
  if(fade<.012)continue;c.save();c.translate(p.x,p.z);c.rotate(p.angle);c.globalAlpha=fade;
  const oval=(x,rx,ry,color)=>{c.beginPath();c.ellipse(x,0,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
  oval(-.12,.134,.142,'#00d000');oval(.075,.220,.154,'#00d000');
  oval(-.12,.098,.104,'#ff0000');oval(.075,.184,.114,'#ff0000');
  // Three raised tread bars remain lighter than the compressed sole.
  c.fillStyle='#6b5700';for(const x of [-.01,.06,.13])c.fillRect(x,-.09,.022,.18);
  c.restore();
 }
 c.restore();
}
// .145: shallow snow banks follow actual freezer footprints and yard margins.
// The working lanes remain exposed; this mesh is visual, never a new collider.
function coldGroundDeposit(x,z,solids){
 const smooth=(a,b,n)=>{const t=Math.max(0,Math.min(1,(n-a)/(b-a)));return t*t*(3-2*t);};
 let wall=0;
 for(const r of solids){
  const dx=Math.max(0,Math.abs(x-r.x)-r.w/2),dz=Math.max(0,Math.abs(z-r.z)-r.d/2);
  const d=Math.hypot(dx,dz),width=1.65+.30*Math.sin(x*.43+z*.19);
  wall=Math.max(wall,1-smooth(.05,width,d));
 }
 const margin=Math.min(25.2-Math.abs(x),18.2-Math.abs(z));
 const edge=Math.exp(-Math.pow((margin-.70-.22*Math.sin(x*.29+z*.37))/1.32,2));
 let pocket=0;for(const [cx,cz,w,d] of [[-19,-12,4,2.1],[20,12,3.8,2.2],[-17,13.4,4.6,1.6]])pocket=Math.max(pocket,Math.exp(-Math.pow((x-cx)/w,2)-Math.pow((z-cz)/d,2)));
 const bend=smooth(-4,4,z),laneA=-4.55-4.2*bend,laneB=9.45-4.2*bend;
 const cross=1-smooth(1.20,2.85,Math.abs(z+.18*Math.sin(x*.23)));
 const access=(1-smooth(.48,1.25,Math.min(Math.abs(x-laneA),Math.abs(x-laneB))))*.65;
 return Math.min(1,.055+wall*.98+edge*.92+pocket*.45)*(1-Math.max(cross,access)*.84);
}
function coldGroundHeight(deposit){const t=Math.max(0,Math.min(1,(deposit-.18)/.74));return .14*t*t*(3-2*t);}
function createColdGroundMesh(solids,performance=false){
 const nx=performance?40:80,nz=performance?29:58,vertices=new Float32Array((nx+1)*(nz+1)*5),indices=new Uint16Array(nx*nz*6);
 let v=0,k=0;const h=(x,z)=>coldGroundHeight(coldGroundDeposit(x,z,solids));
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const x=-25.2+i/nx*50.4,z=-18.2+j/nz*36.4,q=coldGroundDeposit(x,z,solids),e=.16;
  vertices.set([i/nx,j/nz,q,(h(x+e,z)-h(x-e,z))/(2*e),(h(x,z+e)-h(x,z-e))/(2*e)],v);v+=5;
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.set([a,c,b,b,c,d],k);k+=6;}
 return{vertices,indices,nx,nz};
}

const COLD_SNOW_VS=`#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
layout(location=1) in vec3 aSnow;
uniform mat4 uView,uProj;uniform vec4 uRect;uniform float uY,uAmount,uRoof;
out vec3 vWorld;out vec3 vSnow;
void main(){
 float settled=clamp((uAmount-.22)/.70,0.,1.),growth=.5+settled*.75;
 float h=uRoof>.5?0.:.14*smoothstep(.18,.92,aSnow.x)*growth;
 vSnow=vec3(aSnow.x,aSnow.yz*growth);
 vWorld=vec3(uRect.x+aPos.x*uRect.z,uY+h,uRect.y+aPos.y*uRect.w);
 gl_Position=uProj*uView*vec4(vWorld,1.);
}`;
const COLD_SNOW_FS=`#version 300 es
precision highp float;
in vec3 vWorld;in vec3 vSnow;out vec4 outColor;
uniform sampler2D uTracks,uShadow;
uniform mat4 uShadowMatrix;
uniform vec3 uCam,uFog,uTop;
uniform vec4 uLights[4];uniform vec3 uLightColors[4];
uniform float uAmount,uRoof,uShadowOn;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 vec2 uv=(vWorld.xz+vec2(25.2,18.2))/vec2(50.4,36.4);
 vec4 mask=texture(uTracks,uv);vec2 track=uRoof>.5?vec2(0):mask.rg*mask.a;
 // Roof appearance is retained. Ground snow follows shallow terrain banks
 // with slushy transitions and exposed working lanes.
 float cover,alphaScale;float sparkle=noise(vWorld.xz*21.);
 vec3 col=vec3(.79,.88,.94)*(uTop+vec3(.57));
 if(uRoof>.5){
  float grain=noise(vWorld.xz*.46)*.64+noise(vWorld.xz*1.7)*.36;
  cover=smoothstep(.49,.82,grain+uAmount*.72+uRoof*.16);
  col*=.94+sparkle*.09;alphaScale=.88;
 }else{
  float settled=clamp((uAmount-.22)/.70,0.,1.);
  // Connected banks use terrain placement, not random cutouts or a white wash.
  cover=smoothstep(.09,.62,vSnow.x+settled*.16);
  vec3 normal=normalize(vec3(-vSnow.y,1.,-vSnow.z));
  float slope=clamp(dot(normal,normalize(vec3(.38,.86,.22))),0.,1.);
  float powder=.975+(sparkle-.5)*.045;
  vec3 clean=vec3(.86,.915,.95)*(uTop+vec3(.61,.59,.56))*(.68+slope*.36)*powder;
  vec3 slush=vec3(.32,.40,.435)*(uTop+vec3(.64))*(.90+sparkle*.12);
  col=mix(slush,clean,smoothstep(.04,.66,cover));
  alphaScale=.96;
 }
 col*=1.-track.r*.46;col+=vec3(.13,.15,.16)*track.g;
 if(uShadowOn>.5){vec4 q=uShadowMatrix*vec4(vWorld,1.);vec3 sh=q.xyz/q.w*.5+.5;if(all(greaterThan(sh,vec3(0)))&&all(lessThan(sh,vec3(1)))){float depth=texture(uShadow,sh.xy).r;col*=sh.z-.002>depth?.64:1.;}}
 for(int i=0;i<4;i++){float a=max(0.,1.-distance(vWorld,uLights[i].xyz)/max(.01,uLights[i].w));col+=uLightColors[i]*a*a*.32;}
 float fog=smoothstep(22.,76.,distance(vWorld,uCam));col=mix(col,uFog,fog*.85);
 float alpha=cover*alphaScale;if(alpha<.006)discard;outColor=vec4(col,alpha);
}`;
class ColdSnowLayer{
 constructor(gl){
  this.gl=gl;this.p=gl.createProgram();const vs=shader(gl,gl.VERTEX_SHADER,COLD_SNOW_VS),fs=shader(gl,gl.FRAGMENT_SHADER,COLD_SNOW_FS);gl.attachShader(this.p,vs);gl.attachShader(this.p,fs);gl.linkProgram(this.p);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(this.p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.p));
  this.loc={};for(const n of ['View','Proj','Rect','Y','Tracks','Shadow','ShadowMatrix','Cam','Fog','Top','Lights[0]','LightColors[0]','Amount','Roof','ShadowOn'])this.loc[n]=gl.getUniformLocation(this.p,'u'+n);
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,1,1,0,0,1,1,0,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,8,0);gl.bindVertexArray(null);
  this.texture=gl.createTexture();this.canvas=document.createElement('canvas');this.lastUpload=-Infinity;this.lastState=null;this.size=0;
 }
 disposeGround(){if(!this.ground)return;const gl=this.gl;gl.deleteBuffer(this.ground.buffer);gl.deleteBuffer(this.ground.index);gl.deleteVertexArray(this.ground.vao);this.ground=null;}
 ensureGround(state){
  const coarse=state.level===0;if(this.ground&&this.ground.coarse===coarse)return;
  this.disposeGround();const gl=this.gl,mesh=createColdGroundMesh(state.solids,coarse),g={coarse,count:mesh.indices.length,vao:gl.createVertexArray(),buffer:gl.createBuffer(),index:gl.createBuffer()};
  gl.bindVertexArray(g.vao);gl.bindBuffer(gl.ARRAY_BUFFER,g.buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,20,8);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);gl.bindVertexArray(null);this.ground=g;
 }
 upload(state){
  const gl=this.gl,size=state.level===0?512:1024,resize=this.size!==size,reset=this.lastState!==state||state.time<this.lastUpload;
  if(!resize&&!reset&&state.time-this.lastUpload<1/COLD_SNOW_RULES.uploadHz)return false;
  if(resize){this.canvas.width=size;this.canvas.height=size*3/4;this.size=size;}
  paintColdFootprints(this.canvas,state);gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,this.texture);
  const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  if(resize){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.canvas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
  else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,this.canvas);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);this.lastUpload=state.time;this.lastState=state;return true;
 }
 draw(state,frame,shadow,metrics){
  const gl=this.gl,L=this.loc;this.ensureGround(state);metrics.snowTextureUploads=this.upload(state)?1:0;
  gl.useProgram(this.p);gl.bindVertexArray(this.vao);gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(L.Tracks,7);
  gl.uniformMatrix4fv(L.View,false,frame.view);gl.uniformMatrix4fv(L.Proj,false,frame.proj);gl.uniform3f(L.Cam,frame.cam.x,frame.cam.y,frame.cam.z);gl.uniform3fv(L.Fog,frame.fog);gl.uniform3fv(L.Top,frame.light.top);
  gl.uniform4fv(L['Lights[0]'],frame.environment.positions);gl.uniform3fv(L['LightColors[0]'],frame.environment.colors);gl.uniform1f(L.Amount,state.amount);
  gl.uniform1f(L.ShadowOn,0);gl.uniform1i(L.Shadow,7);
  if(shadow?.ready&&state.level>0){shadow.bind({shadow:L.Shadow,shadowMatrix:L.ShadowMatrix,staticShadow:L.ShadowOn});}
  gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const surface=(x,z,w,d,y,roof)=>{gl.uniform4f(L.Rect,x-w/2,z-d/2,w,d);gl.uniform1f(L.Y,y);gl.uniform1f(L.Roof,roof);gl.drawArrays(gl.TRIANGLES,0,6);};
  gl.bindVertexArray(this.ground.vao);gl.uniform4f(L.Rect,-25.2,-18.2,50.4,36.4);gl.uniform1f(L.Y,.070);gl.uniform1f(L.Roof,0);gl.drawElements(gl.TRIANGLES,this.ground.count,gl.UNSIGNED_SHORT,0);
  gl.bindVertexArray(this.vao);for(const r of state.roofs)surface(r.x,r.z,r.w,r.d,r.y+.012+state.amount*.027,1);
  gl.bindVertexArray(null);gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.CULL_FACE);gl.activeTexture(gl.TEXTURE0);
  metrics.snowGroundTriangles=this.ground.count/3;metrics.snowDrawCalls=1+state.roofs.length;metrics.drawCalls+=metrics.snowDrawCalls;metrics.snowCoverage=state.amount;metrics.snowFootprints=state.prints.length;metrics.snowMaskSize=this.size;
 }
 dispose(){this.disposeGround();const gl=this.gl;gl.deleteTexture(this.texture);gl.deleteBuffer(this.buffer);gl.deleteVertexArray(this.vao);gl.deleteProgram(this.p);this.canvas.width=this.canvas.height=1;}
}

// Cold Storage: insulated bays, a refrigeration plant and a continuous loading yard.
// All raised arena scenery follows existing colliders; the service lanes remain clear.
// A smooth, low drift with an irregular outline and a tapered edge; Cold Storage only.
function createColdSnowMesh(){
 const segments=24,rings=4,vertices=[[0,1,0]],faces=[],positions=[],normals=[];
 for(let r=1;r<=rings;r++)for(let k=0;k<segments;k++){
  const t=r/rings,a=k*Math.PI*2/segments,radius=.90+.06*Math.sin(a*3+.8)+.04*Math.sin(a*5-.4);
  vertices.push([Math.cos(a)*radius*t,Math.pow(1-t*t,1.3),Math.sin(a)*radius*t]);
 }
 const at=(r,k)=>1+(r-1)*segments+(k+segments)%segments;
 for(let k=0;k<segments;k++){
  faces.push([0,at(1,k+1),at(1,k)]);
  for(let r=1;r<rings;r++)faces.push([at(r,k),at(r,k+1),at(r+1,k)],[at(r,k+1),at(r+1,k+1),at(r+1,k)]);
 }
 const sums=vertices.map(()=>[0,0,0]);
 for(const ids of faces){
  const [a,b,c]=ids.map(i=>vertices[i]),u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  for(const id of ids)for(let i=0;i<3;i++)sums[id][i]+=n[i];
 }
 for(const ids of faces)for(const id of ids){const n=sums[id],len=Math.hypot(...n)||1;positions.push(...vertices[id]);normals.push(...n.map(v=>v/len));}
 for(let k=0;k<segments;k++)for(const p of [[0,0,0],vertices[at(rings,k)],vertices[at(rings,k+1)]]){positions.push(...p);normals.push(0,-1,0);}
 return{positions,normals};
}
function coldFanMatrix(part,time,powered){
 if(!powered)return part.matrix;
 const m=new Float32Array(part.matrix),r=part.rotor,a=time*(2.8+.35*Math.sin(r.x+r.z)),c=Math.cos(a),s=Math.sin(a),x=m[12]-r.x,z=m[14]-r.z;
 for(const j of [0,4,8]){const xx=m[j],zz=m[j+2];m[j]=c*xx+s*zz;m[j+2]=-s*xx+c*zz;}
 m[12]=r.x+c*x+s*z;m[14]=r.z-s*x+c*z;return m;
}

function coldSnapView(game){const c=game.coldSnap;return globalThis.DeadwatchCore.coldSnapPhase(c,game.time);}
function coldSnapLightGain(game){
 if(game.arena?.id!=='cold'||!game.coldSnap)return 1;
 const p=coldSnapView(game),c=game.coldSnap;
 return p.blackout?.13:p.alarm?.60:game.power?(.65+.35*clamp((game.time-c.powerAt)/1.15,0,1)):1;
}
function coldSnapLights(state,game){
 if(game.arena?.id!=='cold'||!game.coldSnap)return state;
 const p=coldSnapView(game),gain=p.blackout?0:p.alarm?.10:game.power?clamp((game.time-game.coldSnap.powerAt)/1.15,0,1):1;
 state.levels=state.levels.map(v=>v*gain);for(let i=0;i<state.colors.length;i++)state.colors[i]*=gain;
 if(p.alarm){
  const lights=[[821,654,1.9],[450,365,2.2],[990,365,2.2],[851,340,2.4]];
  lights.forEach(([x,z,y],i)=>{const q=simToWorld(x,z);state.positions.set([q.x,y,q.z,11.5],i*4);state.colors.set([3.2*p.pulse,.085*p.pulse,.05*p.pulse],i*3);});
 }
 return state;
}
function coldSnapPartMatrix(part,game){
 const c=game.coldSnap;if(!c)return part.rotor?coldFanMatrix(part,game.time,game.power):part.matrix;
 if(part.rotor)return coldFanMatrix(part,c.fanTime,game.power);
 const p=coldSnapView(game);
 if(part.coldFork){const f=c.pallet,u=f.phase==='warning'?clamp((game.time-f.at-.42)/.28,0,1):['down','spent'].includes(f.phase)?1:0,m=new Float32Array(part.matrix);m[13]-=u*1.77;return m;}
 if(part.coldBreachLeaf){
  const b=c.breach,age=game.time-b.at,m=new Float32Array(part.matrix);
  if(b.phase==='broken'){
   const t=clamp((age-9.2)/.36,0,1),a=t*Math.PI*.49,co=Math.cos(a),si=Math.sin(a),y=m[13]-.32,z=m[14]+6.26;
   for(const k of [0,4,8]){const yy=m[k+1],zz=m[k+2];m[k+1]=co*yy-si*zz;m[k+2]=si*yy+co*zz;}
   m[13]=.32+co*y-si*z;m[14]=-6.26+si*y+co*z;return m;
  }
  const kick=Math.max(0,1-Math.abs(age-7.72)/.22)+Math.max(0,1-Math.abs(age-8.47)/.22);
  m[14]+=.14*kick;m[13]+=.018*Math.sin(age*48)*kick;return m;
 }
 if(part.coldMachine&&p.active&&p.age>.2){const m=new Float32Array(part.matrix),shake=.020*p.mist+.009; m[12]+=Math.sin(game.time*67+m[14])*shake;m[14]+=Math.cos(game.time*73+m[12])*shake;return m;}
 return part.matrix;
}
function coldZombiePose(z,motion,dt,time){
 const frozen=(z.coldFrozenUntil||0)>time;
 if(frozen&&motion.coldPose){const matrix=motion.coldPose.matrix.slice();matrix[12]=((motion.renderX??z.x)-720)*.035;matrix[14]=((motion.renderY??z.y)-520)*.035;return{...motion.coldPose,matrix,tint:5};}
 const f=z.coldFight,actor=f?{...z,boss:true,coldPattern:true,bossPhase:f.phase==='stunned'?'recover':f.phase,bossTimer:f.left,bossCharge:f.charge}:z;
 const pose=DeadwatchMesh.plan(actor,motion,dt);
 if(frozen){motion.coldPose={...pose,palette:pose.palette.slice(),matrix:pose.matrix.slice(),tint:5};return motion.coldPose;}
 delete motion.coldPose;
 if((z.coldCoatUntil||0)>time)pose.tint=4+Math.min(.56,(z.coldCoatUntil-time)/6);
 return pose;
}
function coldSnapPlan(game,quality=2){
 const parts=[],glows=[],haze=[];
 if(game.arena?.id!=='cold'||!game.coldSnap)return{parts,glows,haze};
 const c=game.coldSnap,R=globalThis.DeadwatchCore.COLD_SNAP_RULES,p=coldSnapView(game),t=game.time,M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.METAL,glow=0)=>parts.push({mesh,matrix,color,material,glow,cast:false});
 const box=(x,y,z,w,h,d,color,material=M.METAL,glow=0,a=0)=>add('box',model(x,y,z,w/2,h/2,d/2,a),color,material,glow);
 const seg=(a,b,r,color,glow=0)=>add('pickupCylinder',basisModel(...a,...b,r,r),color,M.METAL,glow);
 const orb=(x,y,z,r,color,glow=0)=>add('pickupOrb',model(x,y,z,r,r,r),color,M.GLASS,glow);
 const line=(ax,az,bx,bz,w,color,y=.063)=>box((ax+bx)/2,y,(az+bz)/2,Math.hypot(bx-ax,bz-az),.012,w,color,M.MATTE,0,-Math.atan2(bz-az,bx-ax));
 const dark='#263d47',steel='#6d8a95',ice='#badce8',red='#ff503e',amber='#d5ac61';
 const snowflake=(x,y,z,size,color)=>{for(let i=0;i<3;i++){const a=i*Math.PI/3,dx=Math.cos(a)*size,dz=Math.sin(a)*size;seg([x-dx,y,z-dz],[x+dx,y,z+dz],.023,color,.25);}};
 // The emergency panel is bolted beside the existing southern refrigeration receiver.
 const panel=simToWorld(R.panel.x,R.panel.y),ready=game.power&&!p.active&&t>=c.readyAt&&!c.breach.cargo.length;
 box(panel.x,.10,panel.z,2.18,.20,1.14,dark);box(panel.x,1.00,panel.z,1.94,1.76,.61,'#627b83');
 box(panel.x,1.03,panel.z+.324,1.65,1.47,.040,dark);box(panel.x-.27,1.31,panel.z+.365,.88,.51,.033,ready?'#8adfe6':p.active?red:'#487681',M.GLASS,ready?.40:p.active?.6:.05);
 for(let i=0;i<4;i++)box(panel.x-.55+i*.16,1.25,panel.z+.391,.043,.16+.04*i,.015,ready?'#d3fffa':'#638c94',M.GLASS,.25);
 orb(panel.x+.51,1.05,panel.z+.44,.16,red,p.active?.9:.16);box(panel.x+.51,1.07,panel.z+.35,.43,.46,.07,amber);
 for(const x of [-.7,.7]){seg([panel.x+x,.17,panel.z],[panel.x+x,2.0,panel.z],.04,steel);box(panel.x+x,1.98,panel.z,.20,.08,.22,dark);}
 box(panel.x,2.02,panel.z,2.25,.13,.82,dark);snowflake(panel.x,.24,panel.z+1.02,.42,ice);
 orb(panel.x,2.18,panel.z,.14,p.alarm?red:ready?'#76e1ea':amber,p.alarm?p.pulse*1.5:.3);
 if(game.interactionOffer?.id==='cold-snap')glows.push({x:panel.x,y:.05,z:panel.z,radius:1.7,color:ready?'#98e9ff':amber,strength:.45,mode:-.05});
 // Two real cross-aisle freezer shutters; lifted leaves are drawn above the walkable opening.
 R.doors.forEach((r,i)=>{
  const q=simToWorld(r.x+r.w/2,r.y+r.h/2),w=r.w*.035,d=c.doors[i],height=2.35,raised=d.open*2.52;
  for(const side of [-1,1])box(q.x+side*(w/2-.06),1.38,q.z,.12,2.76,.22,steel);
  box(q.x,2.83,q.z,w+.22,.28,.40,dark);
  for(let k=0;k<6;k++){const center=.23+height/12+k*height/6+raised;if(center>2.63)continue;box(q.x,center,q.z,w-.18,Math.min(height/6-.017,2*(2.79-center)),.15,k%2?'#8ca7b1':'#9bb6bd');box(q.x,center-height/12,q.z+.085,w-.20,.026,.025,steel);}
  box(q.x,Math.min(2.70,.22+raised),q.z,w-.15,.12,.26,dark);orb(q.x,3.05,q.z,.12,d.target===0?red:'#80d6c1',d.target===0?.7:.23);
  for(const side of [-1,1]){const s=simToWorld(r.x+70,r.y+8+side*66);box(s.x,.54,s.z,.33,1.08,.29,dark);orb(s.x,.97,s.z,.12,d.closed?red:'#8cdce5',.4);}
  for(let k=0;k<8;k++)line(q.x-w/2+.2+k*.58,q.z-.26,q.x-w/2+.37+k*.58,q.z+.26,.10,amber);
 });
 // Physical cyan targets clearly distinguish shootable valves from decorative pipework.
 R.valves.forEach((r,i)=>{
  const q=simToWorld(r.x,r.y),v=c.valves[i],burst=t<v.until,ready=t>=v.readyAt;
  seg([q.x,.08,q.z],[q.x,1.50,q.z],.09,steel);seg([q.x,1.43,q.z],[q.x,1.43,q.z+.42],.085,steel);
  for(let k=0;k<8;k++){const a=k*Math.PI/4,b=(k+1)*Math.PI/4;seg([q.x+Math.cos(a)*.31,1.05+Math.sin(a)*.31,q.z+.17],[q.x+Math.cos(b)*.31,1.05+Math.sin(b)*.31,q.z+.17],.035,ready?'#80e8f4':'#577b83',ready?.3:0);}
  seg([q.x-.31,1.05,q.z+.17],[q.x+.31,1.05,q.z+.17],.027,ice);orb(q.x,1.75,q.z,.09,ready?'#8aeeff':amber,.6);
  glows.push({x:q.x,y:.064,z:q.z,radius:.68,color:ready?'#78daef':amber,strength:.30,mode:-.055});
  if(burst){for(let k=0;k<(quality?6:3);k++){const a=t*1.1+k*1.21;haze.push({x:q.x+Math.sin(a)*.5,y:.40+k*.14,z:q.z+.5+k*.39,radius:1.45+k*.19,color:'#c3e2ed',strength:.38,mode:2+(t*.22+k*.17)%1});}}
 });
 // Flush chevrons identify the three purge fields before they activate.
 R.zones.forEach((r,i)=>{
  const a=simToWorld(r.x,r.y),b=simToWorld(r.x+r.w,r.y+r.h),v=simToWorld(r.vx,r.vy),color=p.active?'#88dbeb':'#668c99';
  for(const x of [a.x,b.x])for(const z of [a.z,b.z]){line(x,z,x+(x===a.x?.44:-.44),z,.054,color);line(x,z,x,z+(z===a.z?.44:-.44),.054,color);}
  if(p.frost>.01){
   const u=p.frost,depth=(b.z-a.z)*u,direction=i===2?-1:1,from=i===2?b.z:a.z;
   // Branching frost grows along the pavement instead of opaque snow-shaped patches.
   for(let k=0;k<(quality?7:4);k++){
    const xx=a.x+.30+(b.x-a.x-.6)*(k+.4+.21*Math.sin(k*3.7))/(quality?7:4),bend=Math.sin(k*2.7)*.30,end=from+direction*depth*(.70+.30*(.5+.5*Math.sin(k*1.7)));
    seg([xx,.105,from],[xx+bend*u,.105,end],.017*u,ice,.035);
    for(let j=1;j<=3;j++){const at=j*.23,grow=clamp((u-at)*3,0,1);if(grow<=0)continue;const z=from+direction*(b.z-a.z)*at;
     for(const side of [-1,1])seg([xx+bend*at,.108,z],[xx+bend*at+side*.36*grow,.108,z+direction*.25*grow],.012*grow,ice,.03);
    }
   }
   glows.push({x:(a.x+b.x)/2,y:.080,z:from+direction*depth*.5,radius:Math.max(.1,depth*.65),color:'#88cde7',strength:.055*u,mode:0});
   // Wall frost grows up the adjacent insulated face; only the marked wall sections change.
   const wallZ=i===2?5.945:-6.276,wallX=i===0?-9.6:i===1?8.8:-1.7;
   for(let k=0;k<(quality?7:4);k++){const xx=wallX+(k-3)*.30,h=(.30+(k%3)*.19)*u;seg([xx,.31,wallZ],[xx+.12,.31+h,wallZ],.025,ice,.04);seg([xx+.07,.31+h*.6,wallZ],[xx-.13,.35+h*.8,wallZ],.018,ice);}
  }
  if(p.mist>.01){
   for(let k=0;k<(quality?9:5);k++){
    const age=(t*.7+k*.381)%1,x=v.x+Math.sin(k*2.399+t*.52)*(1+age*1.3),z=v.z+(i===2?-1:1)*(age*4.1+.15);
    haze.push({x,y:.37+age*.61,z,radius:1.5+age*2.25,color:'#bfdbe7',strength:p.mist*(.28+.14*(1-age)),mode:2+(t*.14+k*.17)%1});
   }
  }
 });
 if(p.alarm)for(const [x,y] of [[450,365],[990,365],[670,685]]){
  const q=simToWorld(x,y);box(q.x,2.16,q.z,.36,.11,.30,dark);orb(q.x,2.32,q.z,.17,red,1.6*p.pulse);
  glows.push({x:q.x,y:2.32,z:q.z,radius:.5,color:red,strength:.55*p.pulse,mode:1});glows.push({x:q.x,y:.08,z:q.z,radius:3.0,color:red,strength:.34*p.pulse,mode:0});
 }
 // Reuse the exterior forklift in the eastern lane. The stack drops onto the marked rectangle.
 const r=R.pallet,q=simToWorld(r.x+r.w/2,r.y+r.h/2),f=c.pallet,warning=f.phase==='warning',down=f.phase==='down',spent=f.phase==='spent';
 const age=t-f.at,drop=warning?clamp((age-.42)/.28,0,1):down||spent?1:0;
 for(const x of [q.x-r.w*.0175,q.x+r.w*.0175])line(x,q.z-r.h*.0175,x,q.z+r.h*.0175,.075,warning?red:amber);
 for(const z of [q.z-r.h*.0175,q.z+r.h*.0175])line(q.x-r.w*.0175,z,q.x+r.w*.0175,z,.075,warning?red:amber);
 if(!spent){
  for(let j=0;j<3;j++){const y=(1-drop)*1.88+.17+j*.37;
   for(const dx of [-.81,.81])box(q.x+dx,y-.08,q.z,.16,.18,1.77,'#514c3d');
   for(let k=0;k<5;k++)box(q.x-1.0+k*.5,y+.03,q.z,.43,.12,1.9,'#9b8b64');
  }
  for(const dx of [-.83,.83])box(q.x+dx,(1-drop)*1.88+.63,q.z, .07,1.12,1.96,'#54717b');
 }else for(let k=0;k<4;k++)box(q.x+(k-1.5)*.46,.039,q.z+(k%2)*.14,.28,.05,1.55,'#786c52',M.MATTE,0,k*.4);
 const control=simToWorld(R.forkControl.x,R.forkControl.y);box(control.x,.52,control.z,.30,1.04,.30,dark);orb(control.x,.99,control.z,.11,spent?'#526c6e':amber,.4);
 if(warning)glows.push({x:q.x,y:.078,z:q.z,radius:2.15,color:red,strength:.3+.2*Math.sin(t*12),mode:-.06});
 const breach=simToWorld(R.breach.x,340),b=c.breach;
 if(['knock1','knock2','broken'].includes(b.phase))orb(breach.x,2.77,breach.z+.04,.12,b.phase==='broken'?ice:red,.8);
 if(b.phase==='broken'&&t-b.at<11.2)for(let k=0;k<(quality?7:3);k++){const u=clamp((t-b.at-9.2)/2,0,1);haze.push({x:breach.x+Math.sin(k*2.4)*u*1.6,y:.5,z:breach.z+u*2+k*.08,radius:1.5+u,color:'#abcddc',strength:(1-u)*.38,mode:2+(k*.2+t*.1)%1});}
 for(const s of c.shards){const u=clamp((t-s.at)/.85,0,1),w=simToWorld(s.x,s.y);for(let k=0;k<(quality?12:6);k++){const a=k*2.399+s.id,rad=(.35+(k%4)*.25)*u*2,y=Math.max(.08,.75+u*(1.0+(k%3)*.4)-u*u*2.4),size=(1-u)*(.07+(k%3)*.022);add('pickupRoundBox',model(w.x+Math.cos(a)*rad,y,w.z+Math.sin(a)*rad,size,size*1.7,size*.65,a+t*3),ice,M.GLASS,.25);}}
 return{parts,glows,haze};
}

function coldStoragePlan(obstacles){
 const parts=[],lights=[],fixtures=[],solids=[],snowRoofs=[],style=ARENA_LOOKS.cold,M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.METAL,glow=0,cast=true)=>{const p={mesh,matrix,color,material,glow,cast};parts.push(p);return p;};
 const box=(x,y,z,w,h,d,c,mat=M.METAL,a=0,cast=true)=>add('box',model(x,y,z,w/2,h/2,d/2,a),c,mat,0,cast);
 const round=(x,y,z,w,h,d,c,mat=M.METAL)=>add('pickupRoundBox',model(x,y,z,w/2,h/2,d/2),c,mat);
 const cyl=(x,y,z,r,h,c,mat=M.METAL)=>add('pickupCylinder',model(x,y,z,r,h/2,r),c,mat);
 const seg=(a,b,r,c,mat=M.METAL)=>add('pickupCylinder',basisModel(...a,...b,r,r),c,mat);
 const flat=(x,z,w,d,c,y=.024,a=0)=>box(x,y,z,w,.006,d,c,M.MATTE,a,false);
 const line=(ax,az,bx,bz,w,c,y=.030)=>flat((ax+bx)/2,(az+bz)/2,Math.hypot(bx-ax,bz-az),w,c,y,-Math.atan2(bz-az,bx-ax));
 const hash=n=>{const v=Math.sin(n*12.9898+29.3)*43758.5453;return v-Math.floor(v);};
 const steel='#647f88',dark='#293f48',panel='#a2b3b2',snow='#bac9c9',rubber='#253239',amber='#b7a477';
 const drift=(x,y,z,w,h,d,c=snow)=>add('coldSnow',model(x,y,z,w,h,d),c,M.PARK_STONE,0,false);
 const fixture=(x,y,z,powered=true,c='#c0e2e9',radius=6.4,floor=0)=>{
  const f=fixtures.length;fixtures.push({x,y:y-.08,z:z+.08,color:c,powered,phase:x*.4+z,radius,intensity:.93});
  box(x,y+.035,z,.66,.13,.28,dark);const lens=box(x,y-.044,z,.53,.036,.20,c,M.GLASS);lens.fixture=f;
  lights.push({x,y:floor+.064,z:z+.18,radius:2.6,color:c,strength:.18,mode:0,fixture:f});
 };
 const fan=(x,y,z,r=.40)=>{
  cyl(x,y,z,r+.075,.072,steel);cyl(x,y+.050,z,r,.035,rubber);
  for(let k=0;k<5;k++){const a=k*Math.PI*.4,blade=box(x+Math.cos(a)*r*.40,y+.077,z+Math.sin(a)*r*.40,r*.83,.022,r*.25,'#8fa7ad',M.METAL,-a-.40,false);blade.rotor={x,z};}
  cyl(x,y+.10,z,r*.16,.055,panel);
  for(const q of [-.55,0,.55])box(x+q*r,y+.13,z,.026,.025,r*1.62,steel);
  box(x,y+.142,z,r*1.64,.025,.029,steel);
 };
 const cooler=(x,y,z,w=1.45)=>{
  for(const dx of [-w*.34,w*.34])box(x+dx,y+.10,z,.09,.2,1.12,dark);
  round(x,y+.43,z,w,.63,1.16,steel);box(x,y+.77,z,w+.05,.075,1.22,panel);
  for(let j=0;j<6;j++)box(x,y+.24+j*.071,z+.591,w-.18,.032,.028,dark);
  fan(x,y+.831,z,Math.min(.43,w*.29));
  seg([x+w*.42,y+.36,z-.40],[x+w*.42,y+.36,z-.73],.07,'#8faaa9');
  seg([x+w*.42,y+.36,z-.73],[x+w*.42,y+.07,z-.73],.07,'#8faaa9');
  cyl(x+w*.42,y+.055,z-.73,.115,.075,dark);
  for(const dx of [-w*.37,w*.37])cyl(x+dx,y+.83,z+.42,.026,.023,'#b6c5c0');
 };
 const number=(x,y,z,n)=>{
  const bits=[63,6,91,79,102,109,125,7,127,111],strokes=[[0,-.31,.29,.055],[.17,-.16,.05,.25],[.17,.16,.05,.25],[0,.31,.29,.055],[-.17,.16,.05,.25],[-.17,-.16,.05,.25],[0,0,.29,.055]];
  for(const [d,off] of [[0,-.24],[n,.24]])for(let k=0;k<7;k++)if(bits[d]&(1<<k)){const [dx,dz,w,h]=strokes[k];flat(x+off+dx,z+dz,w,h,'#c3c8b7',y);}
 };
 // Layered, separated surfaces prevent shimmer at shallow phone viewing angles.
 box(0,-.22,0,190,.26,160,'#526369',M.PARK_STONE,0,false);
 box(0,-.095,0,85,.12,68,'#68797b',M.PARK_STONE,0,false);
 box(0,.006,0,49.6,.008,35.4,'#485d65',M.ASPHALT,0,false);
 for(const x of [-18,-12,-6,0,6,12,18])line(x,-17.3,x,17.3,.025,'#354b54',.017);
 for(const z of [-14,-9,-4,1,6,11,16])line(-24.3,z,24.3,z,.027,'#354b54',.017);
 for(const x of [-4.4,4.4])for(let z=-15.8;z<16;z+=3.0)flat(x,z,.10,1.4,amber,.037);
 for(const x of [-16.1,-15.5,8.7,9.3])for(let z=-15;z<16;z+=2.6)flat(x,z,.15,1.72,'#334a53',.027,.025);
 for(let i=0;i<31;i++){
  const x=-23+hash(i+1)*46,z=-16+hash(i+63)*32,w=.36+hash(i+90)*1.65,d=.18+hash(i+130)*.51;
  // Irregular thaw patches replace the repeated circular discs.
  add('coldSnow',model(x,.021,z,w,.006,d,hash(i+190)*.8-.4),i%3?'#526d77':'#364f5c',i%3?M.PARK_STONE:M.WET,0,false);
  if(i%4===0){line(x-w*.7,z,x,z+.10,.031,'#899fa6',.032);line(x,z+.10,x+w*.58,z-.14,.023,'#899fa6',.032);}
 }
 const drain=(x,z,w)=>{flat(x,z,w+.11,.30,'#819292',.039);flat(x,z,w,.22,'#213844',.045);for(let xx=-w/2+.1;xx<w/2;xx+=.24)flat(x+xx,z,.045,.19,steel,.051);};
 for(const z of [-11,-3.0,4.6,13.0])drain(0,z,5.9);
 // Six original freezer footprints. The southern center pad becomes the landmark plant.
 const pads=obstacles.filter(o=>!o.walkwayRail&&!o.coldBarrier).map(obstacleToWorld);
 pads.forEach((r,i)=>{
  box(r.x,.12,r.z,r.w,.24,r.d,'#64777b',M.PARK_STONE);solids.push({x:r.x,z:r.z,w:r.w,d:r.d,h:i===4?2.30:3.2});
  for(const side of [-1,1]){
   box(r.x,.255,r.z+side*(r.d/2-.07),r.w-.10,.06,.11,steel);
   for(let x=-r.w/2+.32;x<r.w/2-.2;x+=.67)flat(r.x+x,r.z+side*(r.d/2+.13),.32,.14,amber,.042,-.30);
  }
  if(i===4){
   const machineStart=parts.length;
   // Horizontal ammonia receiver, compressor motor, insulated headers and service gauges.
   for(const x of [-2.20,2.20]){box(r.x+x,.59,r.z,.30,.70,1.55,steel);box(r.x+x,.27,r.z,.73,.07,1.88,dark);}
   seg([r.x-2.7,1.55,r.z],[r.x+2.7,1.55,r.z],.66,'#92aaa9');
   for(const x of [-2.7,2.7])add('pickupOrb',model(r.x+x,1.55,r.z,.27,.66,.66),'#aec0ba');
   for(const x of [-2.22,-.65,1.05,2.22])seg([r.x+x-.045,1.55,r.z],[r.x+x+.045,1.55,r.z],.681,steel);
   for(const zz of [-.89,.89]){seg([r.x-3.62,.54,r.z+zz],[r.x+3.55,.54,r.z+zz],.105,'#9baea8');seg([r.x+3.55,.54,r.z+zz],[r.x+3.55,1.57,r.z+zz],.105,'#9baea8');seg([r.x+3.55,1.57,r.z+zz],[r.x+2.73,1.57,r.z],.105,'#9baea8');}
   round(r.x-3.51,.81,r.z,1.03,1.05,1.42,steel);fan(r.x-3.51,1.375,r.z,.39);
   for(const xx of [-.38,.38]){cyl(r.x+xx,2.23,r.z,.10,.18,dark);cyl(r.x+xx,2.35,r.z,.145,.062,'#bfcec2');box(r.x+xx,2.39,r.z,.018,.013,.18,dark,M.METAL,.4);}
   round(r.x+3.49,1.53,r.z,.73,.78,.66,'#3e5b65');box(r.x+3.49,1.94,r.z,.51,.025,.38,'#a4d6c9',M.GLASS);
   seg([r.x-1.95,2.05,r.z],[r.x-1.95,3.28,r.z],.13,steel);cyl(r.x-1.95,3.34,r.z,.22,.12,panel);
   // Physical valve wheels and a restrained warning plate finish the receiver.
   for(const dx of [-1.35,1.35]){
    const x=r.x+dx,z=r.z+.89;seg([x,.60,z],[x,1.02,z],.034,steel);
    for(let k=0;k<12;k++){const a=k*Math.PI/6,b=(k+1)*Math.PI/6;seg([x+Math.cos(a)*.18,1.04,z+Math.sin(a)*.18],[x+Math.cos(b)*.18,1.04,z+Math.sin(b)*.18],.018,amber);}
    for(const a of [0,Math.PI/2])seg([x-Math.cos(a)*.17,1.04,z-Math.sin(a)*.17],[x+Math.cos(a)*.17,1.04,z+Math.sin(a)*.17],.015,amber);
   }
   box(r.x,1.57,r.z+.667,.61,.27,.027,dark);box(r.x,1.57,r.z+.688,.49,.19,.018,amber,M.MATTE);
   box(r.x,1.60,r.z+.704,.030,.092,.013,dark);box(r.x,1.526,r.z+.704,.030,.026,.013,dark);
   drift(r.x,2.18,r.z,1.9,.065,.31);fixture(r.x+3.48,2.05,r.z,false,'#e2bd80',4.3);
   for(let j=machineStart;j<parts.length;j++)parts[j].coldMachine=true;
   return;
  }
  const h=i===2?3.10:i===3?2.18:2.53,top=h+.24,front=r.z+r.d/2-.045;
  if(i===1){
   const cx=r.x+r.w*.235,opening=1.97,left=r.x-r.w/2+.07,right=r.x+r.w/2-.07;
   box((left+cx-opening/2)/2,.24+h/2,r.z,cx-opening/2-left,h,r.d-.14,panel);
   box((cx+opening/2+right)/2,.24+h/2,r.z,right-cx-opening/2,h,r.d-.14,panel);
   box(cx,2.51,r.z,opening,.50,r.d-.14,panel);box(cx,1.20,r.z-r.d/2+.10,opening,1.95,.06,'#142c37');
  }else box(r.x,.24+h/2,r.z,r.w-.14,h,r.d-.14,i===3?'#7d949c':panel);
  if(i!==1)box(r.x,.47,r.z,r.w-.12,.37,r.d-.12,'#516f7c');
  for(const side of [-1,1]){
   const z=r.z+side*(r.d/2-.054);
   for(let x=-r.w/2+.15;x<r.w/2-.1;x+=.75)box(r.x+x,.30+h*.5,z,.024,h-.12,.022,'#7e969d');
   for(const dx of [-r.w/2+.065,r.w/2-.065])box(r.x+dx,.24+h/2,z,.10,h,.061,steel);
   box(r.x,1.70,z,r.w-.20,.16,.033,'#587e8e');
   const count=r.w>7?2:1;
   for(let k=0;k<count;k++){
    const x=r.x+(k-(count-1)/2)*r.w*.47,w=i===3?1.55:1.78;
    box(x,1.23,z+side*.021,w+.19,1.98,.05,rubber);const leafStart=parts.length;box(x,1.24,z+side*.053,w,1.80,.038,'#91a9ad');
    for(let j=0;j<4;j++)box(x,.62+j*.39,z+side*.076,w-.05,.028,.025,'#607d88');
    box(x+w*.35,1.13,z+side*.11,.06,.34,.06,dark);
    if(i===1&&side===1&&k===1)for(let j=leafStart;j<parts.length;j++){parts[j].coldBreachLeaf=true;parts[j].cast=false;}
    for(const dx of [-w*.5,w*.5])box(x+dx,.33,z+side*.075,.13,.19,.11,rubber);
    // Corner bumpers, service plate and worn lower seals are mounted to the bay.
    for(const dx of [-w*.57,w*.57]){
     box(x+dx,.55,z+side*.083,.095,.52,.085,rubber);
     box(x+dx,.79,z+side*.129,.091,.077,.018,amber,M.MATTE);
    }
    box(x-w*.43,1.73,z+side*.100,.23,.23,.024,dark);
    box(x-w*.43,1.73,z+side*.118,.17,.17,.014,amber,M.MATTE);
    box(x-w*.43,1.744,z+side*.130,.024,.066,.010,dark);box(x-w*.43,1.696,z+side*.130,.024,.020,.010,dark);
    for(let j=0;j<3;j++)box(x-w*.30+j*w*.29,.42+j*.055,z+side*.103,.19+j*.03,.042,.012,'#6a858c',M.MATTE);
    if(side===1)fixture(x,2.27,z+.12,true,i===3?'#e4cb98':'#c0e2e9',6.5);
   }
  }
  if(i===3){
   for(const dx of [-1.72,1.72]){box(r.x+dx,1.46,front+.054,.70,.65,.06,dark);box(r.x+dx,1.46,front+.09,.56,.50,.021,'#8babae',M.GLASS);box(r.x+dx,1.46,front+.106,.028,.55,.020,steel);}
  }
  box(r.x,top+.067,r.z,r.w,.13,r.d,'#65838e');box(r.x,top+.146,r.z,r.w-.18,.026,r.d-.18,'#819da4');
  snowRoofs.push({x:r.x,z:r.z,w:r.w-.26,d:r.d-.26,y:top+.192});
  for(let x=-r.w/2+.35;x<r.w/2-.2;x+=.9)box(r.x+x,top+.175,r.z,.047,.028,r.d-.23,'#9cb2b6');
  // Recessed roof service hatch has a gasket, hinges and a bolted cover.
  const hx=r.x+r.w*.36,hz=r.z+.58;
  round(hx,top+.196,hz,.62,.050,.43,dark);round(hx,top+.228,hz,.53,.035,.35,'#92a9ac');
  for(const dx of [-.18,.18])box(hx+dx,top+.25,hz-.15,.07,.045,.05,steel);
  box(hx,top+.273,hz,.19,.039,.045,dark);
  for(const side of [-1,1])box(r.x,top+.13,r.z+side*(r.d/2-.04),r.w,.13,.075,steel);
  for(const dx of r.w>7?[-r.w*.24,r.w*.24]:[0])cooler(r.x+dx,top+.16,r.z,1.42);
  number(r.x-r.w/2+.68,top+.201,r.z+.02,i+1);
  for(let k=0;k<4;k++){const x=r.x-r.w*.33+k*r.w*.22;drift(x,top+.18,r.z-.81,.52+hash(k+i*4)*.45,.065,.24);}
  for(let k=0;k<5;k++){const x=r.x-r.w*.38+k*r.w*.19;seg([x,top+.035,front],[x,top-.13-hash(i*8+k)*.16,front],.022,'#b6d1d2',M.GLASS);}
  // Ladder and drainpipe remain against the occupied footprint.
  const lx=r.x+r.w/2-.35;
  for(const dx of [-.19,.19])seg([lx+dx,.25,front-.014],[lx+dx,top+.23,front-.014],.025,steel);
  for(let y=.42;y<top+.12;y+=.31)seg([lx-.21,y,front+.012],[lx+.21,y,front+.012],.022,'#a7bdbb');
  seg([r.x-r.w/2+.22,.24,front],[r.x-r.w/2+.22,top+.08,front],.050,'#526f7b');
 });
 // Frost collects beside the buildings rather than forming new obstacles in the lanes.
 for(const r of pads)for(const side of [-1,1])for(let k=0;k<4;k++){
  const x=r.x-r.w*.34+k*r.w*.23,z=r.z+side*(r.d/2+.11);
  add('coldSnow',model(x,.027,z,.34+hash(k+x)*.31,.006,.13),'#7c959e',M.PARK_STONE,0,false);
 }
 const fence=(ax,az,bx,bz)=>{
  const len=Math.hypot(bx-ax,bz-az),steps=Math.ceil(len/2.1);
  for(let k=0;k<=steps;k++){const t=k/steps,x=lerp(ax,bx,t),z=lerp(az,bz,t);seg([x,.08,z],[x,1.67,z],.046,steel);cyl(x,.12,z,.095,.24,dark);}
  for(const y of [.38,1.45])seg([ax,y,az],[bx,y,bz],.033,steel);
  for(let k=0;k<steps*3;k++){const t=(k+.5)/(steps*3),x=lerp(ax,bx,t),z=lerp(az,bz,t);seg([x,.38,z],[x,1.45,z],.012,'#799099');}
 };
 for(const z of [-18.6,18.6])for(const side of [-1,1])fence(side*3.1,z,side*24.8,z);
 for(const x of [-24.8,24.8])for(const side of [-1,1])fence(x,side*3.1,x,side*18.6);
 for(const z of [-24.2,24.2]){
  box(0,-.012,z,5.7,.030,11.2,'#445c67',M.ASPHALT,0,false);
  for(const zz of [-3,0,3])flat(0,z+zz,.12,1.4,amber,.016);
 }
 for(const x of [-31.0,31.0]){box(x,-.012,0,12.8,.030,5.7,'#445c67',M.ASPHALT,0,false);for(const xx of [-3,0,3])flat(x+xx,0,1.4,.12,amber,.016);}
 const yardBuilding=(x,z,w,d,h)=>{
  box(x,h/2-.04,z,w,h,d,'#647e86');box(x,h+.06,z,w+.20,.20,d+.20,'#3c5865');
  for(let dx=-w/2+.6;dx<w/2;dx+=1.25)box(x+dx,h/2,z+d/2+.015,.035,h,.025,'#496976');
  for(let dx=-w/2+2;dx<w/2-1;dx+=3.6){box(x+dx,1.18,z+d/2+.03,2.60,2.32,.065,dark);box(x+dx,1.22,z+d/2+.071,2.33,2.17,.025,'#829da5');for(let yy=.43;yy<2.27;yy+=.31)box(x+dx,yy,z+d/2+.092,2.31,.033,.025,steel);fixture(x+dx,2.66,z+d/2+.22,true,'#c0dce0',6.7);}
  for(let dx=-w/2+1;dx<w/2-1;dx+=2.9)drift(x+dx,h+.16,z-d*.24,1.32,.15,d*.24);
  cooler(x-w*.22,h+.19,z,1.8);cooler(x+w*.22,h+.19,z,1.8);
 };
 yardBuilding(-13.5,-23.7,18.8,5.6,4.15);yardBuilding(13.5,-23.7,18.8,5.6,4.65);
 // Pipe rack silhouettes behind the northern gate without covering its approach.
 for(const x of [-22,-5,5,22]){seg([x,0,-20],[x,4.4,-20],.095,steel);box(x,.13,-20,.47,.26,.47,dark);}
 for(const z of [-19.8,-20.2])seg([-22,4.38,z],[22,4.38,z],.17,'#8aa0a4');
 const pallet=(x,z,w=1.35)=>{
  for(const dx of [-w*.33,w*.33])box(x+dx,.13,z,.14,.18,1.0,'#665f50',M.MATTE);
  for(const dz of [-.39,-.13,.13,.39])box(x,.25,z+dz,w,.07,.19,'#948974',M.MATTE);
  round(x,.75,z,w*.86,.94,.84,'#90a5a5');for(const dx of [-w*.26,w*.26])box(x+dx,1.235,z,.055,.030,.83,'#516874');
  drift(x,1.24,z,.45,.047,.32);
 };
 const reefer=(x,z,a=0)=>{
  const first=parts.length;
  box(x,.58,z,2.20,.22,7.8,dark);round(x,1.98,z-.65,2.44,2.46,5.95,'#a3b6b6');
  box(x,3.25,z-.65,2.47,.10,5.99,'#829da4');
  for(let zz=-3.40;zz<2.1;zz+=.44)for(const side of [-1,1])box(x+side*1.226,1.99,z+zz,.026,2.17,.032,'#688893');
  for(const dx of [-.53,.53])box(x+dx,1.99,z-3.645,.044,2.20,.047,steel);
  round(x,1.53,z+3.02,2.27,1.88,1.55,'#657f89');box(x,2.37,z+3.70,1.82,.59,.045,'#294958',M.GLASS);
  box(x,.98,z+3.84,2.38,.21,.18,'#869ca3');box(x,1.33,z+3.81,1.1,.38,.034,dark);
  for(const dx of [-.84,.84])box(x+dx,1.42,z+3.833,.32,.19,.034,'#d4c7a4',M.GLASS);
  round(x,2.40,z+2.31,1.18,.80,.34,panel);for(let yy=2.18;yy<2.72;yy+=.12)box(x,yy,z+2.49,.97,.036,.020,dark);
  for(const dx of [-1.14,1.14])for(const dz of [-2.55,-1.65,2.88]){seg([x+dx-.14,.59,z+dz],[x+dx+.14,.59,z+dz],.43,rubber,M.RUBBER);seg([x+dx-.15,.59,z+dz],[x+dx+.15,.59,z+dz],.23,steel);}
  drift(x,3.31,z-1.1,.87,.10,1.93);
  if(a){const c=Math.cos(a),sn=Math.sin(a);for(let i=first;i<parts.length;i++){const m=parts[i].matrix,dx=m[12]-x,dz=m[14]-z;for(const j of [0,4,8]){const xx=m[j],zz=m[j+2];m[j]=c*xx+sn*zz;m[j+2]=-sn*xx+c*zz;}m[12]=x+c*dx+sn*dz;m[14]=z-sn*dx+c*dz;}}
 };
 reefer(-28.1,-10.2,.06);reefer(28.6,10.1,Math.PI+.12);reefer(-15.5,24.0,Math.PI/2);
 // Low foreground equipment and snowbanks prevent a blank edge without hiding players.
 for(const x of [-21,-17,-11,11,17,21]){
  box(x,.33,20.5,3.0,.66,.63,'#74888c',M.PARK_STONE);drift(x,.71,20.5,1.27,.10,.25);
  for(const dx of [-.75,.75])box(x+dx,.34,20.827,.23,.36,.026,amber);
 }
 for(const [x,z] of [[-27,6],[-27,8],[-30,7],[27,-7],[27,-9],[30,-8],[15,23],[17,23],[19,23]])pallet(x,z);
 for(const [x,z] of [[-23,-17],[23,-17],[-23,17],[23,17],[-7,20],[7,20]]){
  cyl(x,.13,z,.18,.26,dark);seg([x,.14,z],[x,3.42,z],.049,steel);fixture(x,3.39,z,false,'#dbc18e',6.1);
 }
 for(const [x,z,w,d] of [[-25,-21,5.0,2.3],[25,-21,5.3,2.8],[-24,24,6,3.4],[26,24,6,3.2],[-35,-8,3,14],[35,7,3,14],[-15,-32,15,3.1],[15,33,15,3.4]]){
  drift(x,-.05,z,w,.35,d,'#8da4ac');drift(x+w*.41,-.04,z+d*.16,w*.60,.28,d*.67,'#9aafb4');
 }
 const farStart=parts.length;
 yardBuilding(-15,-37,22,7,5.4);yardBuilding(16,-37,21,7,5.0);
 for(const side of [-1,1]){
  box(side*43,1.65,-6,6,3.3,27,'#506d79');box(side*43,3.36,-6,6.1,.12,27.1,'#8aa3a9');
  for(const z of [-14,0,14]){box(side*38,.14,z,2.6,.28,2.6,steel);cyl(side*38,2.70,z,1.10,5.0,'#839fa5');cyl(side*38,5.24,z,1.14,.12,'#bac7c5');}
 }
 for(let i=farStart;i<parts.length;i++)parts[i].cast=false;
 // .146 Exterior polish. Append scenery outside the playable fence only.
 const exteriorStart=parts.length;
 const berm=(x,z,w,d,h=.26)=>{
  drift(x,-.022,z,w,h,d,'#657c85');drift(x-.13,.018,z-.10,w*.89,h*.87,d*.79,'#b2c6cb');
 };
 const curb=(x,z,w,d)=>{box(x,.065,z,w,.13,d,'#687f87',M.PARK_STONE);};
 const bollard=(x,z)=>{cyl(x,.095,z,.16,.19,dark);cyl(x,.55,z,.073,.92,'#baa976');cyl(x,.64,z,.076,.17,dark);cyl(x,1.02,z,.081,.034,'#c9d4cc');};
 // Asphalt aprons, rounded plough berms and truck wheel wear connect the yard.
 for(const [x,z,w,d] of [[-30.2,-10.9,8.5,16.1],[30.5,-11.5,8.2,15.1],[-30.6,12.4,8.2,8.4],[0,25.6,13.8,13.0],[-13.5,-29.5,20.8,5.4],[13.5,-29.5,20.8,5.4]]){
  flat(x,z,w,d,'#3a515b',.002);for(const side of [-1,1])curb(x+side*(w/2-.10),z,.16,d);
 }
 for(const [x,z,w,d] of [[-34.1,-13.0,.95,5.8],[-34.3,11.9,1.1,4.3],[34.2,-12.3,1.0,5.4],[-6.8,26.1,.90,4.1],[6.8,26.1,.90,4.1],[-18,-31.9,6.1,.75],[16,-31.9,5.5,.82],[-27.2,20.5,2.0,1.4],[27.2,20.5,2.0,1.4]])berm(x,z,w,d);
 for(const [x,z,a] of [[-28.1,-11.3,0],[29.7,-12.0,0],[-14.1,24.1,Math.PI/2]]){
  for(const side of [-1,1])for(let k=0;k<3;k++){
   const xx=x+Math.cos(a)*side*.74+Math.sin(a)*(k-1)*2.0,zz=z-Math.sin(a)*side*.74+Math.cos(a)*(k-1)*2.0;
   flat(xx,zz,.17,1.84,'#263e48',.012,a);flat(xx+.09,zz,.041,1.78,'#607782',.015,a);
  }
 }
 // Road center stays clear. Paint, meltwater and chipped shoulders sit flush.
 for(const side of [-1,1]){
  for(let k=0;k<4;k++){
   flat(side*(27.0+k*2.6),-1.02,2.12,.13,'#263e48',.009);flat(side*(27.0+k*2.6),1.02,2.12,.13,'#263e48',.009);
   flat(-1.03,side*(20.2+k*2.55),.13,2.06,'#304953',.009);flat(1.03,side*(20.2+k*2.55),.13,2.06,'#304953',.009);
  }
  for(const x of [-4.2,4.2]){bollard(x,side*19.8);flat(x,side*21.1,.10,1.54,amber,.015);}
  for(const z of [-4.1,4.1])bollard(side*26.3,z);
 }
 // North loading apron: dock ramps and frost-edged bumpers under the existing bays.
 for(const center of [-13.5,13.5])for(const dx of [-5.7,-2.1,1.5,5.1]){
  const x=center+dx;
  box(x,.22,-20.58,2.7,.44,.62,'#586e78',M.PARK_STONE);
  for(const side of [-1,1])box(x+side*1.04,.57,-20.22,.18,.68,.15,rubber,M.RUBBER);
  box(x,.46,-20.55,2.3,.037,.53,'#8fa4ab');
  for(const side of [-1,1])flat(x+side*1.45,-28.9,.075,3.38,amber,.017);
 }
 // Simple metal stencil strokes give the depot its own readable identity.
 const glyph={
  C:[[[.72,1],[0,1],[0,0],[.72,0]]],O:[[[0,0],[0,1],[.72,1],[.72,0],[0,0]]],L:[[[0,1],[0,0],[.72,0]]],
  D:[[[0,0],[0,1],[.48,1],[.72,.77],[.72,.23],[.48,0],[0,0]]],S:[[[.72,1],[0,1],[0,.5],[.72,.5],[.72,0],[0,0]]],
  T:[[[0,1],[.8,1]],[[.4,1],[.4,0]]],R:[[[0,0],[0,1],[.72,1],[.72,.52],[0,.52]],[[.35,.52],[.78,0]]],
  A:[[[0,0],[.36,1],[.72,0]],[[.16,.44],[.56,.44]]],G:[[[.72,1],[0,1],[0,0],[.72,0],[.72,.45],[.40,.45]]],
  E:[[[.72,1],[0,1],[0,0],[.72,0]],[[0,.5],[.60,.5]]]
 };
 const stencil=(word,x,y,z,size)=>{
  const advance=size*1.0,total=word.length*advance;let left=x-total/2;
  for(const ch of word){for(const stroke of glyph[ch]||[])for(let k=1;k<stroke.length;k++){const a=stroke[k-1],b=stroke[k];seg([left+a[0]*size,y+a[1]*size,z],[left+b[0]*size,y+b[1]*size,z],.019,'#d0d8c9',M.MATTE);}left+=advance;}
 };
 box(-13.5,2.98,-20.815,8.8,.68,.10,'#29434f');box(-13.5,3.35,-20.76,8.92,.05,.18,steel);stencil('COLD STORAGE',-13.5,2.74,-20.748,.42);
 for(const x of [-17.85,-9.15])box(x,2.98,-20.75,.06,.65,.031,amber);
 for(const x of [-15.5,-11.5])fixture(x,3.88,-20.65,false,'#e0c391',4.8);
 // West refrigeration service compound: a low generator and insulated pipework.
 const gx=-29.9,gz=12.8;
 box(gx,.12,gz,3.92,.24,2.58,'#6d8188',M.PARK_STONE);round(gx,.92,gz,3.34,1.55,1.88,'#6c858b');
 box(gx,1.74,gz,3.47,.095,1.98,'#94aeb4');
 for(let k=0;k<7;k++)box(gx-1.15+k*.30,.98,gz+.95,.055,.83,.034,dark);
 box(gx+1.28,.96,gz+.98,.54,.77,.05,'#334d59');box(gx+1.28,1.13,gz+1.013,.37,.20,.022,'#98c7c9',M.GLASS);
 for(const dx of [-.10,.10])cyl(gx+1.28+dx,.88,gz+1.02,.035,.05,amber);
 seg([gx-1.1,1.75,gz-.53],[gx-1.1,2.42,gz-.53],.072,dark);seg([gx-1.1,2.42,gz-.53],[gx-.80,2.42,gz-.53],.072,steel);
 for(const side of [-1,1]){seg([gx+side*1.2,.39,gz-1.06],[gx+side*1.2,.39,gz-2.25],.075,'#a2b5b7');seg([gx+side*1.2,.39,gz-2.25],[gx+side*1.2,1.44,gz-2.25],.075,'#a2b5b7');}
 drift(gx,1.8,gz-.35,1.15,.10,.51);berm(gx+2.13,gz+.26,.50,1.57,.19);
 fixture(-28.6,2.8,14.8,false,'#d6bc88',5.2);
 seg([-28.6,.02,14.8],[-28.6,2.87,14.8],.05,steel);
 // Reels and a compact service cabinet occupy the existing western pallet yard.
 for(const [x,z] of [[-32.2,7.0],[-32.5,8.45]]){
  cyl(x,.12,z,.61,.13,'#756f5c',M.MATTE);cyl(x,.51,z,.38,.68,'#334650',M.RUBBER);cyl(x,.89,z,.61,.13,'#8f8872',M.MATTE);
  for(const dz of [-.26,0,.26])box(x,.966,z+dz,1.02,.019,.039,'#605f51',M.MATTE);drift(x,.98,z,.39,.04,.33);
 }
 box(-27.25,.74,13.4,1.02,1.48,.71,'#45606c');box(-27.25,.77,13.77,.83,1.13,.026,'#7d969a');box(-26.97,.78,13.80,.035,.23,.018,amber);
 // .147: the existing forklift is now usable inside the eastern service lane.
 const fx=20.6,fz=3.7;
 round(fx,.58,fz,1.73,.81,2.04,'#ad9c70');box(fx,.48,fz,1.80,.18,2.16,dark);
 for(const dx of [-.88,.88])for(const dz of [-.65,.69])seg([fx+dx-.12,.39,fz+dz],[fx+dx+.12,.39,fz+dz],.31,rubber,M.RUBBER);
 box(fx,.94,fz+.56,1.18,.36,.67,'#78858a');box(fx,1.09,fz-.10,.63,.15,.61,rubber,M.RUBBER);box(fx,1.32,fz+.18,.63,.54,.13,rubber,M.RUBBER);
 for(const dx of [-.69,.69])for(const dz of [-.69,.65])seg([fx+dx,.92,fz+dz],[fx+dx,2.45,fz+dz],.040,steel);
 box(fx,2.47,fz,1.61,.065,1.82,steel);for(const dx of [-.42,0,.42])box(fx+dx,2.515,fz,.042,.028,1.70,dark);
 for(const dx of [-.53,.53]){box(fx+dx,1.31,fz-1.12,.12,2.49,.18,dark);Object.assign(box(fx+dx,1.91,fz-1.79,.15,.08,1.36,steel),{coldFork:true,cast:false});}
 Object.assign(box(fx,1.91,fz-1.20,1.38,.19,.17,steel),{coldFork:true,cast:false});box(fx,1.91,fz-1.16,1.18,.10,.11,steel);
 cyl(fx+.58,2.59,fz+.52,.10,.16,'#dfb675',M.GLASS);drift(fx-.32,2.535,fz+.18,.44,.052,.59);
 pallet(32.2,-8.7,1.27);berm(33.3,-16.5,.9,1.9,.24);
 fixture(27.6,3.08,-15.9,false,'#d8bf89',5.3);seg([27.6,.02,-15.9],[27.6,3.15,-15.9],.050,steel);
 // Low foreground: wheel stops, grit bin and angled pedestrian markings.
 for(const x of [-10.0,-7.8,7.8,10.0]){box(x,.18,22.2,1.62,.36,.39,'#627981',M.PARK_STONE);for(const dx of [-.47,.47])box(x+dx,.20,22.402,.18,.21,.02,amber);drift(x,.37,22.2,.59,.055,.14);}
 round(11.5,.47,23.0,1.62,.88,1.09,'#88917a');box(11.5,.94,23.0,1.71,.095,1.18,'#adb29b');drift(11.5,1.0,22.88,.60,.055,.42);
 for(const side of [-1,1])for(let k=0;k<6;k++)flat(side*(4.9+k*.27),20.60,.12,1.06,amber,.018,-side*.42);
 // Sparse winter scrub and dirt-fringed banks soften the remaining service lots.
 for(const [x,z] of [[-34.4,-20.6],[34.7,-20.9],[-31.8,20.9],[31.9,22.5],[-22.7,-30.8],[22.8,-30.8]]){
  for(let k=0;k<4;k++){const a=k*1.7,h=.38+.14*hash(x+k);seg([x,0,z],[x+Math.cos(a)*.24,h,z+Math.sin(a)*.24],.013,'#586765',M.MATTE);}
  drift(x,-.01,z,.64,.12,.49,'#a7bdc3');
 }
 // Distant exterior additions do not enlarge the existing static-shadow workload.
 for(let i=exteriorStart;i<parts.length;i++)if(Math.abs(parts[i].matrix[12])>34||Math.abs(parts[i].matrix[14])>28)parts[i].cast=false;
 return{parts,lights,fixtures,solids,snowRoofs,style};
}
function coldAtmospherePlan(time,snow=null){
 const parts=[],glows=[],shadows=[],ribbons=[],haze=[],t=Math.max(0,Number(snow?.time??time)||0),fract=n=>n-Math.floor(n),hash=n=>fract(Math.sin(n*12.9898+35.1)*43758.5453);
 // World-space flakes drift down to the yard or the roof beneath each column.
 // Performance uses 60 visible flakes after the existing effects-stride budget.
 const count=snow?.level===0?180:300;
 for(let i=0;i<count;i++){
  const u=fract(t*(.068+hash(i+500)*.040)+hash(i)),x=-27+hash(i+100)*54+Math.sin(t*.31+i)*.62,z=-19+hash(i+200)*38+Math.sin(t*.23+i*.4)*.33;
  const landing=snow?.surface(x,z)||0,y=landing+.04+(1-u)*Math.max(2.0,8.5-landing);
  const fade=Math.min(1,u*10,(1-u)*16),size=.036+hash(i+300)*.040;
  ribbons.push({a:{x:x-.018,y:y+.044,z:z-.012},b:{x:x+.012,y,z},width:size,opacity:fade*.69,color:'#dcebf2',mode:2});
 }
 // Condensation rises from the receiver outlet and two rooftop refrigeration units.
 for(const [x,y,z] of [[-3.70,3.42,7.175],[14.35,4.48,-7.525],[-13.734,3.90,-7.525]])for(let k=0;k<4;k++){
  const u=fract(t*.17+k*.25),fade=Math.sin(u*Math.PI);
  haze.push({x:x+u*.62,y:y+u*1.32,z:z+u*.22,radius:.17+u*.59,color:'#b2cdd4',strength:.25*fade,mode:2+fract(t*.035+k*.173)});
 }
 // Small low patches breathe beside the freezer doors; never a full-screen fog layer.
 for(const [i,x,z] of [[0,-11.55,-5.95],[1,2.45,-5.95],[2,12.25,8.70]]){
  const u=fract(t*.072+i*.31);haze.push({x:x+u*.75,y:.26+u*.11,z:z+u*.40,radius:.60+u*.85,color:'#8daab7',strength:.105*Math.sin(u*Math.PI),mode:2+fract(t*.028+i*.17)});
 }
 return{parts,glows,shadows,ribbons,haze,flash:0,jetActive:false,weatherKind:'snow-and-condensation'};
}

// Rail Crossing: four recognizable rail vehicles over the existing obstacle footprints.
function railCrossingPlan(obstacles){
 const parts=[],lights=[],fixtures=[],solids=[],style=ARENA_LOOKS.rail,M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.METAL,glow=0,cast=true)=>{const p={mesh,matrix,color,material,glow,cast};parts.push(p);return p;};
 const box=(x,y,z,w,h,d,c,mat=M.METAL,a=0,cast=true)=>add('box',model(x,y,z,w/2,h/2,d/2,a),c,mat,0,cast);
 const round=(x,y,z,w,h,d,c)=>add('pickupRoundBox',model(x,y,z,w/2,h/2,d/2),c);
 const cyl=(x,y,z,r,h,c,mat=M.METAL)=>add('pickupCylinder',model(x,y,z,r,h/2,r),c,mat);
 const seg=(a,b,r,c,mat=M.METAL)=>add('pickupCylinder',basisModel(...a,...b,r,r),c,mat);
 const flat=(x,z,w,d,c,y=.025,a=0)=>box(x,y,z,w,.006,d,c,M.MATTE,a,false);
 const line=(ax,az,bx,bz,w,c,y=.029)=>flat((ax+bx)/2,(az+bz)/2,Math.hypot(bx-ax,bz-az),w,c,y,-Math.atan2(bz-az,bx-ax));
 const hash=n=>{const q=Math.sin(n*12.9898+18.7)*43758.5453;return q-Math.floor(q);};
 const steel='#7e8988',dark='#263236',rust='#865a46',cream='#aaa99b',ochre='#b69c64',wood='#695b47';
 const lamp=(x,y,z,powered=true,c='#e3c18a',radius=6.5)=>{
  const f=fixtures.length;fixtures.push({x,y:y-.08,z:z+.10,color:c,powered,phase:x*.7+z,radius,intensity:.88});
  box(x,y+.025,z,.64,.13,.32,dark);const p=box(x,y-.059,z,.49,.031,.23,c,M.GLASS);p.fixture=f;
  lights.push({x,y:.064,z:z+.24,radius:2.6,color:c,strength:.19,mode:0,fixture:f});
 };
 const pole=(x,z,h=3.7)=>{cyl(x,.15,z,.18,.30,dark);seg([x,.15,z],[x,h,z],.058,steel);seg([x,h,z],[x+.50,h,z],.045,steel);lamp(x+.50,h-.05,z);};
 const tracks=(z,length=132)=>{
  // Local spans prevent endpoint fog from erasing long, thin rails and ballast.
  const span=(y,zz,w,h,d,c,mat)=>{for(let left=-w/2;left<w/2;left+=10){const n=Math.min(10,w/2-left);box(left+n/2,y,zz,n,h,d,c,mat,0,false);}};
  span(.014,z,length,.014,2.83,'#656763',M.PARK_STONE);
  for(const side of [-1,1])span(.021,z+side*1.34,length,.018,.29,'#555b53',M.PARK_STONE);
  let n=0;for(let x=-length/2;x<length/2;x+=.86,n++){
   if(Math.abs(x)>(Math.abs(z)<18?39:34))continue; // Detail only where it survives the yard fog.
   const tint=['#403d32','#343933','#4a4436'][n%3];box(x,.036,z,.24,.024,2.28+(hash(n+z)-.5)*.09,tint,M.MATTE,(hash(n+19)-.5)*.015,false);
   if(Math.abs(x)<26&&Math.abs(z)<18&&n%2===0)for(const dz of [-.68,.68]){
    box(x,.049,z+dz,.31,.014,.24,'#454b44',M.METAL,0,false);
   }
  }
  for(const dz of [-.68,.68]){
   span(.042,z+dz,length,.016,.145,'#434c46',M.METAL);
   span(.055,z+dz,length,.026,.041,'#865c43',M.METAL);
   span(.070,z+dz,length,.014,.096,'#b1b8b3',M.METAL);
   for(let x=-24;x<25;x+=8.5)box(x,.060,z+dz+.036,.36,.030,.028,'#5b6456',M.METAL,0,false);
  }
  for(let i=0;i<38;i++){const x=-28+i*1.5,side=i%2?1:-1;add('coldSnow',model(x,.022,z+side*(1.37+hash(i+37)*.10),.30+hash(i+57)*.34,.012,.18+hash(i+83)*.12),i%3?'#555b53':'#68685c',M.PARK_STONE,0,false);}
 };
 // Quiet ground wear, ballast and flush crossings keep the central escape lanes readable.
 box(0,-.23,0,190,.28,160,'#3c443d',M.PARK_STONE,0,false);
 for(let ix=0;ix<11;ix++)for(let iz=0;iz<10;iz++)box(-44+(ix+.5)*8,-.10,-35+(iz+.5)*7,8,.14,7,'#414942',M.PARK_STONE,0,false);
 // Short ground tiles retain real material/lighting detail instead of interpolating distant fog.
 for(let ix=0;ix<8;ix++)for(let iz=0;iz<6;iz++)box(-24.9+(ix+.5)*6.225,.005,-17.85+(iz+.5)*5.95,6.225,.008,5.95,'#4e5253',M.ASPHALT,0,false);
 for(const [x,z,w,d] of [[-10.85,-10.0,11.5,2.7],[10.85,-10.0,11.5,2.7],[-14.875,10.35,8.7,2.4],[14.875,10.35,8.7,2.4],[-3.85,-1.05,4.25,3.8]]){
  const n=Math.ceil(w/4);for(let k=0;k<n;k++)box(x-w/2+(k+.5)*w/n,.013,z,w/n,.010,d,'#70736b',M.CONCRETE,0,false);
  for(const side of [-1,1])line(x-w/2,z+side*d/2,x+w/2,z+side*d/2,.045,'#a59d79',.027);
  for(let k=1;k<n;k++)line(x-w/2+k*w/n,z-d/2,x-w/2+k*w/n,z+d/2,.030,'#414b49',.028);
 }
 // Loading-bay chevrons and paired tire scuffs sit on the aprons, away from train doors.
 for(const [x,z] of [[-10.85,-10.0],[10.85,-10.0],[-14.875,10.35],[14.875,10.35]]){
  for(let k=0;k<6;k++)flat(x-2.05+k*.80,z-.90,.36,.36,'#b59a60',.030,.45);
  for(const dx of [-.70,.70])for(let k=0;k<4;k++)flat(x+dx+(k-1.5)*.08,z-.68+k*.46,.13,.42,'#4a4d46',.033,-.15);
 }
 for(const z of [-6.65,7.0,-24.8,25.2,3.5])tracks(z,z===-24.8?150:132);
 for(const z of [-6.65,7.0,3.5]){
  const width=z===3.5?4.9:7.65;box(0,.049,z,width,.018,3.10,'#777c76',M.CONCRETE,0,false);
  for(const x of [-width/2,width/2])flat(x,z,.055,3.25,'#b5a36d',.067);
  for(const dz of [-.68,.68])flat(0,z+dz,width,.205,'#24312f',.064);
  for(let x=-width/2+.65;x<width/2;x+=1.05)flat(x,z,.027,2.90,'#414d49',.065);
 }
 for(const z of [-12.3,12.8])for(let x=-21.5;x<23;x+=3.8)flat(x,z,1.82,.09,'#928d72',.034);
 for(const x of [-4.55,4.55])for(let z=-15.3;z<16;z+=3.2)flat(x,z,.10,1.50,ochre,.032);
 for(let i=0;i<32;i++){
  const x=-22.8+hash(i)*45.6,z=-16+hash(i+64)*32,w=.5+hash(i+90)*1.1,d=.20+hash(i+130)*.46;
  if(Math.min(...[-6.65,3.5,7].map(t=>Math.abs(z-t)))<1.7)continue;
  add('coldSnow',model(x,.022,z,w,.006,d,hash(i+191)-.5),i%4?'#4b5049':'#2b4043',i%4?M.PARK_STONE:M.WET,0,false);
  if(i%5===0){line(x-.8,z,x-.14,z+.18,.035,'#2d3a36');line(x-.14,z+.18,x+.57,z-.10,.027,'#2d3a36');}
 }
 // Tar repairs and drain channels break up the open asphalt without adding collision.
 for(const [x,z,w,d,a] of [[-10,-1.8,3.4,1.6,.10],[10,-1.5,4.1,2.0,-.09],[-13,14.6,3.0,1.5,.08],[10,14.0,3.3,1.7,-.08],[17,-13.7,3.7,1.6,.06]]){
  flat(x,z,w+.09,d+.09,'#343e3f',.025,a);box(x,.030,z,w,.008,d,'#474c4e',M.ASPHALT,a,false);
 }
 for(const side of [-1,1])for(const z of [-12,-1,13]){
  const x=side*22.6;flat(x,z,.44,3.1,'#646960',.027);flat(x,z,.29,2.96,dark,.035);
  for(let k=-5;k<=5;k++)flat(x,z+k*.25,.31,.037,'#7d8476',.042);
 }
 const ladder=(x,z,y0,y1)=>{for(const dx of [-.21,.21])seg([x+dx,y0,z],[x+dx,y1,z],.024,steel);for(let y=y0+.14;y<y1;y+=.27)seg([x-.23,y,z],[x+.23,y,z],.021,cream);};
 const chassis=r=>{
  box(r.x,.58,r.z,r.w-.13,.22,r.d-.16,dark);box(r.x,.75,r.z,r.w-.05,.14,r.d-.05,steel);
  for(const xx of [-r.w*.33,r.w*.33]){
   box(r.x+xx,.36,r.z,1.02,.24,r.d-.22,dark);
   for(const dx of [-.30,.30])for(const dz of [-r.d*.40,r.d*.40]){
    seg([r.x+xx+dx,.35,r.z+dz-.083],[r.x+xx+dx,.35,r.z+dz+.083],.29,dark);
    seg([r.x+xx+dx,.35,r.z+dz-.09],[r.x+xx+dx,.35,r.z+dz+.09],.15,steel);
   }
  }
  for(const side of [-1,1]){box(r.x+side*(r.w/2-.08),.50,r.z,.14,.18,.31,dark);for(const dz of [-.60,.60])box(r.x+side*(r.w/2-.09),.71,r.z+dz,.11,.18,.21,ochre);}
 };
 const freight=(r,kind)=>{
  chassis(r);
  if(kind===0){
   // Riveted boxcar: sliding doors, roof gutters, rubbed paint and end ladders.
   round(r.x,1.60,r.z,r.w-.45,1.69,r.d-.16,rust);round(r.x,2.49,r.z,r.w-.37,.23,r.d-.10,'#69716d');
   for(const side of [-1,1]){
    const z=r.z+side*(r.d/2-.064);
    for(let x=-r.w/2+.42;x<r.w/2-.25;x+=.62)box(r.x+x,1.58,z,.045,1.55,.032,'#664e41');
    box(r.x,1.53,z+side*.022,2.47,1.53,.045,dark);box(r.x,1.53,z+side*.055,2.30,1.41,.025,'#977965');
    for(const dx of [-.84,-.28,.28,.84])box(r.x+dx,1.53,z+side*.079,.044,1.36,.022,'#66584d');
    box(r.x,2.36,z+side*.078,3.10,.056,.075,steel);box(r.x+.85,1.52,z+side*.108,.052,.25,.044,ochre);
    box(r.x-r.w*.29,1.49,z+side*.041,.83,.22,.025,'#b8b6a0',M.MATTE);
    for(let k=0;k<4;k++)box(r.x-r.w*.29-.28+k*.19,1.49,z+side*.058,.095,.037,.014,'#4c5148',M.MATTE);
    for(let k=0;k<7;k++)box(r.x-r.w*.40+k*r.w*.13,.91+hash(k+r.x)*.13,z+side*.046,.15+hash(k+6)*.22,.045,.018,'#625246',M.MATTE);
    ladder(r.x+r.w*.41,z,.80,2.57);
   }
   for(let x=-r.w/2+.45;x<r.w/2-.3;x+=.90)box(r.x+x,2.615,r.z,.040,.025,r.d-.31,'#929990');
   round(r.x-r.w*.32,2.64,r.z,.57,.048,.52,'#4c625e');
  }else if(kind===1){
   // A round fuel tanker gives the northern row a very different silhouette.
   for(const dx of [-r.w*.30,r.w*.30])box(r.x+dx,.95,r.z,.30,.35,r.d-.25,steel);
   seg([r.x-r.w/2+.70,1.81,r.z],[r.x+r.w/2-.70,1.81,r.z],.78,'#81928b');
   for(const side of [-1,1])add('pickupOrb',model(r.x+side*(r.w/2-.70),1.81,r.z,.36,.78,.78),'#97a39a');
   for(const dx of [-r.w*.32,-r.w*.10,r.w*.10,r.w*.32])seg([r.x+dx-.037,1.81,r.z],[r.x+dx+.037,1.81,r.z],.80,'#526764');
   cyl(r.x,2.67,r.z,.35,.18,dark);cyl(r.x,2.79,r.z,.30,.08,cream);
   for(const dx of [-.80,.80])seg([r.x+dx,2.55,r.z-.52],[r.x+dx,3.10,r.z-.52],.021,steel);
   seg([r.x-.80,3.10,r.z-.52],[r.x+.80,3.10,r.z-.52],.026,cream);
   box(r.x,2.63,r.z-.46,1.8,.055,.30,steel);ladder(r.x,r.z+.83,.75,2.81);
   box(r.x-r.w*.28,1.84,r.z+.788,.51,.37,.025,ochre,M.MATTE);box(r.x-r.w*.28,1.84,r.z+.807,.26,.042,.014,dark);
   seg([r.x-r.w*.32,.99,r.z+.65],[r.x+r.w*.30,.99,r.z+.65],.046,'#89968c');
  }else if(kind===2){
   // Timber flatbed: stacked round logs, tie-down bands and side stakes.
   box(r.x,.87,r.z,r.w-.21,.11,r.d-.13,wood,M.MATTE);
   for(const level of [0,1])for(const dz of level?[-.26,.26]:[-.54,0,.54]){
    const y=1.20+level*.45,lo=r.x-r.w*.39+.08*hash(dz+level),hi=r.x+r.w*.39;
    seg([lo,y,r.z+dz],[hi,y,r.z+dz],.245,level?'#8b8068':'#776d56',M.MATTE);
    seg([lo-.009,y,r.z+dz],[lo+.012,y,r.z+dz],.225,'#b0a082',M.MATTE);seg([hi-.012,y,r.z+dz],[hi+.009,y,r.z+dz],.225,'#a39578',M.MATTE);
   }
   for(const dx of [-r.w*.28,r.w*.28]){
    box(r.x+dx,1.925,r.z,.072,.040,1.46,dark);for(const side of [-1,1]){box(r.x+dx,1.43,r.z+side*.77,.075,1.07,.055,steel);box(r.x+dx,1.46,r.z+side*.80,.086,.18,.045,ochre);}
   }
  }else{
   // Parked diesel shunter with glazed cab, long ventilated hood and protected walk rails.
   const cab=r.x-r.w*.30;round(cab,1.70,r.z,1.80,1.80,r.d-.12,'#647d75');round(cab,2.66,r.z,1.94,.18,r.d-.04,cream);
   box(cab-.912,2.14,r.z,.028,.61,1.38,'#345359',M.GLASS);
   for(const side of [-1,1]){box(cab,2.14,r.z+side*(r.d/2-.051),1.30,.56,.028,'#38575c',M.GLASS);box(cab-.18,2.14,r.z+side*(r.d/2-.027),.042,.61,.019,steel);box(cab+.60,1.27,r.z+side*(r.d/2-.039),.35,.75,.034,'#4b6862');}
   round(r.x+.65,1.44,r.z,4.15,1.20,1.40,'#64776a');round(r.x+.65,2.08,r.z,4.19,.12,1.47,'#8c9886');
   for(const side of [-1,1])for(let k=0;k<10;k++)box(r.x-.96+k*.34,1.49,r.z+side*.709,.10,.80,.025,dark);
   for(const dx of [.0,1.45]){cyl(r.x+dx,2.17,r.z,.37,.085,dark);for(const a of [0,Math.PI/3,Math.PI*2/3])box(r.x+dx,2.219,r.z,.64,.026,.060,steel,M.METAL,a);cyl(r.x+dx,2.239,r.z,.065,.042,cream);}
   cyl(r.x-.90,2.47,r.z,.10,.77,dark);cyl(r.x-.90,2.88,r.z,.15,.07,steel);
   for(const side of [-1,1]){const z=r.z+side*(r.d/2-.05);for(const dx of [-1.0,.7,2.9])seg([r.x+dx,.81,z],[r.x+dx,1.38,z],.020,steel);seg([r.x-1.0,1.38,z],[r.x+2.90,1.38,z],.023,ochre);}
   for(const dz of [-.57,.57]){box(r.x+r.w/2-.19,1.06,r.z+dz,.06,.18,.27,dark);add('pickupOrb',model(r.x+r.w/2-.145,1.08,r.z+dz,.035,.060,.082),'#e0c994',M.GLASS,.27);}
   for(const dx of [-r.w*.40,r.w*.40])for(const dz of [-.62,0,.62])box(r.x+dx,.80,r.z+dz,.25,.035,.28,ochre,M.MATTE);
  }
 };
 const pads=obstacles.filter(o=>!o.walkwayRail).map(obstacleToWorld);
 pads.forEach((r,i)=>{
  solids.push({...r,h:i===1?3.1:i<4?2.7:i===4?3.0:1.8});
  if(i<4){freight(r,i);return;}
  box(r.x,.115,r.z,r.w,.23,r.d,'#68736a',M.PARK_STONE);
  if(i===4){
   round(r.x,1.25,r.z,r.w-.17,2.1,r.d-.18,'#64736f');box(r.x,2.40,r.z,r.w,.22,r.d,'#65716d');
   for(const side of [-1,1]){box(r.x,2.526,r.z+side*(r.d/2-.04),r.w+.06,.036,.09,steel);seg([r.x-r.w/2+.09,2.41,r.z+side*(r.d/2-.05)],[r.x-r.w/2+.09,.29,r.z+side*(r.d/2-.05)],.041,dark);}
   for(const dx of [-.91,-.28,.35,.98])box(r.x+dx,2.516,r.z,.035,.014,r.d-.20,'#87918a');
   for(const side of [-1,1]){box(r.x,1.81,r.z+side*(r.d/2-.078),r.w-.53,.59,.029,'#2e4d51',M.GLASS);for(const dx of [-.71,0,.71])box(r.x+dx,1.81,r.z+side*(r.d/2-.048),.040,.63,.025,steel);}
   box(r.x+.69,1.00,r.z+r.d/2-.045,.65,1.42,.032,'#394f4b');box(r.x+.49,1.00,r.z+r.d/2-.012,.036,.17,.04,ochre);
   round(r.x-.72,2.65,r.z-.38,.80,.34,.71,steel);for(let k=0;k<4;k++)box(r.x-.72,2.838,r.z-.60+k*.14,.64,.027,.041,dark);
   lamp(r.x,2.33,r.z+r.d/2+.075,true,'#e9cc9c',6.2);
   seg([r.x+1.05,2.52,r.z-.86],[r.x+1.05,3.38,r.z-.86],.043,steel);round(r.x+1.05,3.41,r.z-.86,.30,.49,.25,dark);
   for(const yy of [3.28,3.49]){const f=fixtures.length;fixtures.push({x:r.x+1.05,y:yy,z:r.z-.70,powered:yy<3.4,color:yy<3.4?'#a2d1af':'#c79464',phase:1,radius:2.0,intensity:.2});const lens=add('pickupOrb',model(r.x+1.05,yy,r.z-.70,.065,.065,.025),yy<3.4?'#a2d1af':'#c79464',M.GLASS);lens.fixture=f;}
  }else{
   const x=r.x-.48;round(x,.94,r.z,1.31,1.49,r.d-.32,i===5?'#738779':'#7d7970');box(x,1.73,r.z,1.39,.095,r.d-.24,cream);
   for(let k=0;k<6;k++)box(x,.46+k*.145,r.z+r.d/2-.14,1.07,.040,.028,dark);
   round(r.x+1.04,.84,r.z,.64,1.31,r.d-.48,'#4d655f');box(r.x+1.04,1.54,r.z,.70,.090,r.d-.38,steel);
   for(const dx of [-.22,.22]){seg([x+dx,1.78,r.z],[x+dx,2.10,r.z],.039,dark);for(const yy of [1.83,1.92,2.01])cyl(x+dx,yy,r.z,.069,.043,'#a4ac9b');}
   box(x,.93,r.z+r.d/2-.11,.29,.23,.023,ochre,M.MATTE);box(x,.95,r.z+r.d/2-.09,.024,.105,.015,dark);
   seg([x,1.76,r.z-.42],[x,2.94,r.z-.42],.039,steel);seg([x,2.94,r.z-.42],[x,2.94,r.z+.24],.034,steel);lamp(x,2.90,r.z+.26,true,i===5?'#f1c88f':'#a9c6d5',7.8);
  }
 });
 // Cables, drainage and ballast fragments stay flat and clear of the shared power equipment.
 for(const [x,z] of [[-18,-1],[18,2],[-7,11],[7,-11]]){
  flat(x,z,1.3,.35,'#748071',.035);flat(x,z,1.2,.24,dark,.042);for(let i=-4;i<=4;i++)flat(x+i*.13,z,.032,.20,steel,.048);
 }
 for(let i=0;i<40;i++){
  const x=-23+hash(i+250)*46,z=(i%2?-6.65:7)+(hash(i+290)>.5?1:-1)*(1.28+hash(i+310)*.21);
  add('pickupOrb',model(x,.024,z,.047+hash(i+340)*.028,.018,.035),'#74766a',M.PARK_STONE,0,false);
 }
 const fence=(ax,az,bx,bz)=>{
  const n=Math.ceil(Math.hypot(bx-ax,bz-az)/2.3);
  for(let k=0;k<=n;k++){const x=lerp(ax,bx,k/n),z=lerp(az,bz,k/n);seg([x,.02,z],[x,1.49,z],.042,steel);}
  for(const y of [.38,1.31])seg([ax,y,az],[bx,y,bz],.032,steel);
  for(let k=0;k<n*3;k++){const t=(k+.5)/(n*3);seg([lerp(ax,bx,t),.38,lerp(az,bz,t)],[lerp(ax,bx,t),1.31,lerp(az,bz,t)],.012,'#647970');}
 };
 for(const z of [-18.6,18.6])for(const side of [-1,1]){fence(side*3.1,z,side*24.8,z);for(let k=0;k<4;k++)box(side*(5.8+k*5.4),.055,z,5.32,.14,.30,'#6c7269',M.PARK_STONE);}
 for(const x of [-24.8,24.8]){fence(x,-18.6,x,-3.1);fence(x,5.2,x,18.6);}
 for(const z of [-23.7,23.7])box(0,-.012,z,5.8,.028,10.5,'#4a5550',M.ASPHALT,0,false);
 for(const x of [-31.0,31.0])box(x,-.012,0,13,.028,5.7,'#4a5550',M.ASPHALT,0,false);
 for(const x of [-25.6,25.6])for(const z of [2.1,4.9]){box(x,.12,z,.46,.24,.46,dark);seg([x,.2,z],[x,2.8,z],.055,ochre);}
 // Freight continues into the surrounding yard; nothing new blocks a playable lane.
 freight({x:-34,z:-6.65,w:9,d:2.1},0);freight({x:34,z:7,w:9,d:2.1},1);freight({x:-17,z:25.2,w:8.2,d:2.1},2);
 const shed=(x,z,w,d,h)=>{
  box(x,h/2,z,w,h,d,'#626f64',M.PARK_STONE);box(x,h+.07,z,w+.16,.16,d+.16,'#354942');
  for(let dx=-w/2+.4;dx<w/2;dx+=.90)box(x+dx,h/2,z+d/2+.016,.032,h-.12,.026,'#43574e');
  for(let dx=-w/2+2;dx<w/2-1;dx+=3.5){box(x+dx,1.2,z+d/2+.032,2.3,2.35,.035,dark);box(x+dx,1.2,z+d/2+.057,2.12,2.18,.023,'#829082');for(let yy=.34;yy<2.2;yy+=.32)box(x+dx,yy,z+d/2+.081,2.10,.029,.024,'#586d60');lamp(x+dx,2.67,z+d/2+.18);}
  for(let dx=-w/2+.35;dx<w/2;dx+=1.3)box(x+dx,h+.172,z,.037,.044,d-.16,'#657e6d');
 };
 shed(-16,-33.7,22,7,4.45);shed(15,-33.7,21,7,4.1);shed(-31,13,8,6,2.8);
 // A signal gantry frames the background track, with bracing and readable warm lamps.
 for(const x of [-23.0,23.0]){box(x,.20,-21.2,.65,.40,.65,'#66776a',M.PARK_STONE);for(const dx of [-.18,.18])seg([x+dx,.34,-21.2],[x+dx,4.10,-21.2],.043,steel);}
 for(const y of [3.75,4.20])seg([-23,y,-21.2],[23,y,-21.2],.070,steel);
 for(let x=-22;x<22;x+=2.1)seg([x,3.75,-21.2],[x+1.9,4.20,-21.2],.024,steel);
 for(const x of [-8,8])lamp(x,3.72,-21.2,false,'#e6bb80',7.0);
 for(const [x,z] of [[-25.7,-13],[25.7,-13],[-25.7,13],[25.7,13],[-6,19.6],[6,19.6],[-29,-16],[29,17]])pole(x,z);
 // Low service strips, rusty spare pipe and ballast heaps connect the perimeter to the yard.
 for(const side of [-1,1])for(const z of [-13,-7,11,17])add('coldSnow',model(side*26.6,-.012,z,1.45,.12,2.75),'#5c5b4c',M.PARK_STONE,0,false);
 for(const [x,z] of [[-28,-9],[28,9]]){
  for(const dx of [-1.05,1.05])box(x+dx,.12,z,.20,.24,1.55,wood,M.MATTE);
  for(const [dz,y] of [[-.39,.39],[.39,.39],[0,1.01]]){seg([x-1.65,y,z+dz],[x+1.65,y,z+dz],.36,'#776150');seg([x+1.655,y,z+dz],[x+1.67,y,z+dz],.27,dark);}
 }
 // Stacked sleepers, reels, grass and low berms dress the outside without hiding the foreground.
 for(const [x,z] of [[-27,-13],[27,13],[-13,21],[14,21]]){
  for(let j=0;j<3;j++)for(let k=0;k<4;k++)box(x+(k-1.5)*.38,.16+j*.16,z, .32,.15,2.10,wood,M.MATTE,j%2?.035:-.035);
  for(const dx of [-.52,.52])box(x+dx,.58,z,.052,.055,2.12,dark);
 }
 for(const [x,z] of [[-28,7],[28,-9],[19,21]]){
  seg([x,.61,z-.31],[x,.61,z+.31],.40,'#364945');for(const dz of [-.34,.34])seg([x,.61,z+dz-.04],[x,.61,z+dz+.04],.60,wood,M.MATTE);
 }
 for(let i=0;i<20;i++){
  const side=i%2?1:-1,x=side*(26+hash(i+600)*4.3),z=(i%4<2?-1:1)*(4.4+hash(i+620)*12.8);
  add('coldSnow',model(x,-.025,z,.70+hash(i+650),.15,.48),'#4e5940',M.PARK_STONE,0,false);
  for(let k=0;k<3;k++)add('arenaGable',model(x+(k-1)*.17,.04,z,.033,.24+hash(i+k)*.18,.18,k*1.1),'#777b50',M.ORGANIC);
 }
 for(const [x,z,w,d] of [[-29,-23,6,2.8],[29,-23,6,3],[-28,27,7,3],[29,27,6,3],[-44,0,5,16],[44,0,5,16]])add('coldSnow',model(x,-.055,z,w,.55,d),'#4e5845',M.PARK_STONE,0,false);
 for(const side of [-1,1]){box(side*45,2.20,-14,7,4.4,22,'#4f6257',M.PARK_STONE);box(side*45,4.47,-14,7.1,.15,22.1,'#758474');}
 for(const p of parts)if(Math.abs(p.matrix[12])>39||Math.abs(p.matrix[14])>31)p.cast=false;
 return{parts,lights,fixtures,solids,style};
}
function railSignalState(time,train){
 const active=!!train&&['warning','opening','active','closing','departing'].includes(train.phase),mystery=train?.phase==='warning'&&train.left>8;
 const kind=mystery?'mystery':train?.variant,color=kind==='mystery'?'#ffd06e':kind==='support'?'#64ff9a':kind==='supply'?'#65caff':'#ff4236',cycle=(time*1.25)%1;
 const pulse=kind==='hostile'?(cycle<.18||cycle>.33&&cycle<.51?1:.24):kind==='mystery'?.70+.30*Math.sin(time*2.4):kind==='supply'?.86+.14*Math.sin(time*2):.94;
 return{active,mystery,color,pulse,slot:kind==='hostile'?0:kind==='support'?1:kind==='supply'?2:-1,moving:active&&(train.phase!=='warning'||train.left<6)};
}
function railAtmospherePlan(time,train){
 const parts=[],glows=[],shadows=[],ribbons=[],haze=[],M=MATERIAL_IDS,t=Math.max(0,Number(time)||0),fract=n=>n-Math.floor(n);
 const add=(mesh,matrix,color,material=M.METAL,glow=0)=>parts.push({mesh,matrix,color,material,glow});
 const box=(x,y,z,w,h,d,c,mat=M.METAL)=>add('pickupRoundBox',model(x,y,z,w/2,h/2,d/2),c,mat);
 const seg=(a,b,r,c,mat=M.METAL)=>add('pickupCylinder',basisModel(...a,...b,r,r),c,mat);
 // Signals identify the arrival early; the simulation owns train motion and door timing.
 const {active,moving,mystery,color,pulse,slot}=railSignalState(t,train);
 for(const x of [-3.2,3.2]){
  box(x,1.28,5.85,.11,2.56,.11,'#52645a');box(x,2.69,5.85,.65,1.27,.36,'#1e2d30');
  for(let i=0;i<3;i++){
   const y=3.06-i*.36,lit=active&&!mystery&&slot===i;
   box(x,y+.12,6.02,.48,.06,.26,'#324143');
   add('pickupOrb',model(x,y,6.08,.18,.145,.085),lit?color:'#374542',M.GLASS,lit?1.25*pulse:0);
   if(lit)glows.push({x,y,z:6.18,radius:.76,color,strength:.52*pulse,mode:1});
  }
  box(x,3.35,5.85,.51,.11,.47,'#75847a');
  add('pickupOrb',model(x,3.48,5.85,.19,.20,.19),active?color:'#51655b',M.GLASS,active?1.15*pulse:0);
  if(active){glows.push({x,y:3.48,z:5.85,radius:.76,color,strength:.54*pulse,mode:1});glows.push({x,y:.084,z:6.1,radius:2.25,color,strength:.22+.12*pulse,mode:0});}
 }
 // A lit, physical rail lever uses the same hold-to-use control as the other stations.
 const sx=-6.3,sz=11.025,ready=train?.phase==='ready',leverColor=ready?'#efc47d':active?color:'#65796e';
 box(sx,.10,sz,1.60,.20,1.28,'#6f7768',M.PARK_STONE);box(sx,.68,sz,1.18,1.08,.88,'#536c60');box(sx,1.26,sz,1.32,.11,1.01,'#a4ad90');
 box(sx,1.33,sz,1.06,.09,.73,'#273e39');box(sx-.29,1.39,sz-.09,.30,.035,.25,leverColor,M.GLASS);
 for(const sign of [-1,1]){seg([sx+.20+sign*.075,1.38,sz+.03],[sx+.20+sign*.075,active?1.64:1.92,sz+(active?-.28:.15)],.029,'#9aab92');box(sx+sign*.48,.78,sz+.451,.040,.72,.035,'#92a183');}
 seg([sx+.03,active?1.64:1.92,sz+(active?-.28:.15)],[sx+.37,active?1.64:1.92,sz+(active?-.28:.15)],.072,'#bc9e66');
 for(let i=0;i<4;i++)box(sx-.35+i*.23,.52,sz+.455,.14,.15,.024,i%2?'#ccac65':'#354c41');
 add('pickupOrb',model(sx-.29,1.49,sz-.26,.09,.12,.09),leverColor,M.GLASS,ready?.8:.25);
 glows.push({x:sx,y:.065,z:sz,radius:1.36,color:leverColor,strength:ready?.22:.09,mode:0});
 if(active)for(const x of [-20,-12,-4,4,12,20])glows.push({x,y:.085,z:3.5,radius:1.7,color,strength:.09+.14*pulse,mode:0});
 if(moving){
  const lead=train.lead,z=3.5,door=clamp(train.door||0,0,1);
  for(let i=0;i<4;i++){
   const x=lead+i*7.2;box(x,.54,z,6.68,.22,1.73,'#263635');
   if(i===0||i===1){
    const bx=i===0?x+1.85:x+2.43,by=i===0?3.09:3.23;
    box(bx,by,z,.74,.10,.42,'#263635');
    for(const dx of [-.23,.23])add('pickupOrb',model(bx+dx,by+.15,z,.15,.18,.15),color,M.GLASS,1.15*pulse);
    glows.push({x:bx,y:by+.15,z,radius:.90,color,strength:.56*pulse,mode:1});
   }
   for(const dx of [-2.08,2.08])for(const dz of [-.77,.77])seg([x+dx,.36,z+dz-.075],[x+dx,.36,z+dz+.075],.29,'#263635');
   if(i===0){box(x-.2,1.38,z,6.05,1.48,1.59,'#62796a');box(x+1.85,1.88,z,1.70,2.06,1.77,'#8c9580');box(x+1.85,2.96,z,1.82,.13,1.86,'#b2b8a0');box(x+1.85,2.43,z+.902,1.18,.46,.025,'#284c4f',M.GLASS);box(x-1.10,2.19,z,.24,.46,.25,'#263635');}
   else if(i===2){seg([x-2.71,1.59,z],[x+2.71,1.59,z],.75,'#7f8d81');for(const dx of [-2.71,2.71])add('pickupOrb',model(x+dx,1.59,z,.28,.75,.75),'#91a08d');}
   else if(i===1){
    box(x,.646,z,3.39,.020,1.83,'#899887');
    for(const sign of [-1,1]){
     box(x+sign*3.07,1.80,z,.16,2.3,1.80,'#806e52');
     box(x+sign*2.43,3.02,z,1.49,.16,1.94,'#84907c');
     box(x+sign*(.84+door*1.69),3.13,z,1.67,.11,1.84,'#9ba58e');
     for(const face of [-1,1]){
      box(x+sign*2.43,1.80,z+face*.89,1.43,2.3,.12,'#917252');
      box(x+sign*1.74,1.80,z+face*.98,.12,2.32,.13,'#c6b58b');
      box(x+sign*(.84+door*1.72),1.80,z+face*1.02,1.67,2.23,.11,'#786c51');
      box(x+sign*(1.38+door*1.72),1.60,z+face*1.088,.05,.25,.042,'#c7bb95');
      seg([x+sign*.02,3.21,z+face*.87],[x+sign*3.23,3.21,z+face*.87],.025,'#697f70');
     }
    }
    for(const face of [-1,1]){
     box(x,2.96,z+face*.98,3.59,.13,.16,'#c0b390');
     box(x,2.83,z+face*1.07,1.16,.052,.040,'#fff0c7',M.GLASS);
     add('pickupOrb',model(x+1.52,2.74,z+face*1.10,.15,.15,.08),color,M.GLASS,1.1*pulse);
     for(const dx of [-1.77,1.77])add('box',model(x+dx,1.94,z+face*1.062,.026,.68,.019),color,M.GLASS,.70*pulse);
     glows.push({x,y:1.45,z:z+face*1.15,radius:1.75,color,strength:(.13+.25*door)*pulse,mode:1});
     if(door>.1)glows.push({x,y:.092,z:z+face*2.5,radius:2.3,color,strength:.24*door*pulse,mode:0});
     if(door>.03){
      for(let k=0;k<3;k++)box(x,.325-k*.10,z+face*(1.18+k*.56),3.36,.65-k*.20,.62,'#788674');
      for(let k=-6;k<=6;k++)box(x+k*.24,.660,z+face*1.02,.15,.013,.16,k%2?'#baa56e':'#33483c',M.MATTE);
     }
    }
   }
   else{box(x,1.61,z,6.30,1.86,1.83,'#5f7e76');box(x,2.59,z,6.35,.18,1.88,'#7c8c7c');for(const dx of [-2,-1,0,1,2])box(x+dx,1.62,z+.93,.052,1.63,.032,'#415b51');}
   for(const dx of [-2.08,2.08])box(x+dx,.63,z,1.30,.28,1.18,'#394d43');
   if(i===0){
    for(let k=0;k<7;k++)box(x-1.9+k*.29,1.39,z+.818,.12,.57,.025,'#314b42');
    for(const dz of [-.93,.93]){seg([x-2.82,.82,z+dz],[x-2.82,1.62,z+dz],.025,'#c1b487');seg([x-2.82,1.62,z+dz],[x+.88,1.62,z+dz],.025,'#c1b487');for(const dx of [-1.8,-.5,.7])seg([x+dx,.82,z+dz],[x+dx,1.62,z+dz],.018,'#91a187');}
    for(const dz of [-.49,.49]){add('pickupOrb',model(x-3.26,1.39,z+dz,.045,.11,.11),'#fff0b4',M.GLASS,.8);glows.push({x:x-3.39,y:1.39,z:z+dz,radius:.47,color:'#fff0b4',strength:.30,mode:1});}
    glows.push({x:x-5.1,y:.066,z,radius:2.4,color:'#efe3b6',strength:.13,mode:0});
   }
   if(i===1||i===3)for(const dx of [-2.8,-2.42,-2.04,2.04,2.42,2.8])for(const face of (i===1?[-1,1]:[1]))box(x+dx,i===1?1.80:1.61,z+face*.958,.047,i===1?2.11:1.63,.048,'#b09d79');
   if(i<3)box(x+3.54,.48,z,.43,.16,.18,'#33483f');
   shadows.push({x,y:.053,z,radius:3.1,color:'#182721',strength:.27,mode:0});
  }
  for(let k=0;k<4;k++){const u=fract(t*.21+k*.25);haze.push({x:lead-1.1+u*1.8,y:2.43+u*1.43,z:z+u*.40,radius:.17+u*.63,color:'#83978c',strength:.20*Math.sin(u*Math.PI),mode:2+fract(t*.034+k*.19)});}
  if(train.phase==='opening'||train.phase==='closing'||train.phase==='warning'&&train.left<1.8)for(const dx of [-9.25,-5.12,-2.08,2.08,5.12,9.28]){const u=fract(t*.9+dx*.13);haze.push({x:lead+7.2+dx,y:.20+u*.25,z:z+.94+u*.3,radius:.25+u*.75,color:'#c3c8b7',strength:.25*(1-u),mode:2+fract(t*.4+dx)});}
 }
 // The parked shunter idles; small dust eddies stay at the outside service shoulders.
 for(let k=0;k<4;k++){const u=fract(t*.15+k*.25);haze.push({x:13.975+u*.55,y:2.93+u*1.48,z:7+u*.18,radius:.15+u*.46,color:'#9caa96',strength:.19*Math.sin(u*Math.PI),mode:2+fract(t*.033+k*.19)});}
 for(const [i,x,z] of [[0,-21,-11],[1,20,12]]){const u=fract(t*.045+i*.43);haze.push({x:x+u*1.8,y:.31,z:z+u*.53,radius:.85+u*1.50,color:'#a5a083',strength:.10*Math.sin(u*Math.PI),mode:2+fract(t*.023+i*.18)});}
 return{parts,glows,shadows,ribbons,haze,flash:0,jetActive:false,weatherKind:'rail-yard',trainActive:moving};
}

// Camp dressing augments the existing tent footprints and leaves the combat grid intact.
function createCampWearMesh(){
 const mesh=createColdSnowMesh();
 for(let i=0;i<mesh.positions.length;i+=3){const x=mesh.positions[i],z=mesh.positions[i+2],a=Math.atan2(z,x),warp=1+.17*Math.sin(a*3+.6)+.11*Math.sin(a*7-1.2);mesh.positions[i]=x*warp;mesh.positions[i+2]=z*warp;}
 return mesh;
}
function createCampCanvasMesh(){
 const positions=[],normals=[],nx=10,nz=12;
 const height=(x,z)=>.78*(1-Math.abs(z))+.22*Math.cos(z*Math.PI/2)-.025*Math.pow(Math.sin((x+1)*Math.PI*2),2)*(1-Math.abs(z));
 const vertex=(x,z)=>{const e=.002,dx=(height(x+e,z)-height(x-e,z))/(2*e),dz=(height(x,z+e)-height(x,z-e))/(2*e),n=[-dx,1,-dz],l=Math.hypot(...n);return{p:[x,height(x,z),z],n:n.map(v=>v/l)};};
 const tri=(a,b,c)=>{for(const v of [a,b,c]){positions.push(...v.p);normals.push(...v.n);}};
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const x=-1+2*i/nx,z=-1+2*j/nz,a=vertex(x,z),b=vertex(x+2/nx,z),c=vertex(x,z+2/nz),d=vertex(x+2/nx,z+2/nz);tri(a,c,b);tri(b,c,d);}
 for(const side of [-1,1])for(let j=0;j<nz;j++){const z=-1+2*j/nz,n=[side,0,0],a={p:[side,0,0],n},b={p:[side,height(side,z),z],n},c={p:[side,height(side,z+2/nz),z+2/nz],n};if(side<0)tri(a,c,b);else tri(a,b,c);}
 return{positions,normals};
}
function quarantineCampDetails(plan,obstacles){
 const {parts,lights,fixtures,solids}=plan,M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.METAL,glow=0,cast=true)=>{const q={mesh,matrix,color,material,glow,cast};parts.push(q);return q;};
 const box=(x,y,z,w,h,d,c,mat=M.METAL,a=0,cast=true)=>add('box',model(x,y,z,w/2,h/2,d/2,a),c,mat,0,cast);
 const seg=(a,b,r,c,mat=M.METAL)=>add('pickupCylinder',basisModel(...a,...b,r,r),c,mat);
 const flat=(x,z,w,d,c,y=.04,a=0)=>box(x,y,z,w,.008,d,c,M.MATTE,a,false);
 const hash=n=>{const v=Math.sin(n*14.37+21.1)*31473.22;return v-Math.floor(v);};
 const tents=obstacles.map(obstacleToWorld),style=plan.style;
 const line=(x1,z1,x2,z2,w,c,y=.050)=>flat((x1+x2)/2,(z1+z2)/2,Math.hypot(x2-x1,z2-z1),w,c,y,-Math.atan2(z2-z1,x2-x1));
 const inside=(x,z,pad=0)=>tents.some(r=>Math.abs(x-r.x)<r.w/2+pad&&Math.abs(z-r.z)<r.d/2+pad);
 // Short ground tiles preserve fog depth; all wear is world anchored and below pickup lights.
 for(let ix=0;ix<18;ix++)for(let iz=0;iz<14;iz++)box(-72+(ix+.5)*8,-.08,-49+(iz+.5)*7,8,.10,7,'#454c41',M.PARK_STONE,0,false);
 for(let ix=0;ix<8;ix++)for(let iz=0;iz<6;iz++)box(-24.9+(ix+.5)*6.225,.005,-17.85+(iz+.5)*5.95,6.225,.012,5.95,'#55594b',M.PARK_STONE,0,false);
 for(const x of [-7,7])for(let z=-16;z<17;z+=4.2){
  box(x,.017,z,4.4,.018,4.2,'#424b49',M.ASPHALT,0,false);
  for(const side of [-1,1])flat(x+side*1.78,z,.10,2.4,'#aca889',.049);
 }
 for(const z of [-4.3,3.95])for(let x=-22;x<24;x+=4.8)box(x,.029,z,4.8,.014,2.85,'#69716c',M.CONCRETE,0,false);
 // Overlapping mud edges and irregular repairs soften the road grid.
 for(let k=0;k<52;k++){
  const x=-23+hash(k)*46,z=-16+hash(k+55)*32;if(inside(x,z,.32))continue;
  const road=Math.min(Math.abs(x-7),Math.abs(x+7))<2.5;
  add('campWear',model(x,.038,z,.42+hash(k+19)*1.2,.005,.19+hash(k+61)*.58,k*.71),road?'#393f35':k%3?'#565b49':'#3a4642',M.PARK_STONE,0,false);
  if(k%3===0){for(let j=0;j<3;j++)box(x+hash(k+j*31)*.62,.047,z+hash(k+j*17)*.35,.12,.028,.09,'#8b8a73',M.PARK_STONE,j*.7,false);}
 }
 for(const [x,z,a] of [[-10.5,-5.8,.23],[9.8,4.8,-.17],[-5.4,10.7,.30],[14.6,-12.7,-.22],[-17.6,1.8,.16]]){
  add('campWear',model(x,.044,z,1.45,.005,.58,a),'#737367',M.PARK_STONE,0,false);
  add('campWear',model(x+.12,.050,z,1.29,.003,.47,a),'#3e5458',M.WET,0,false);
  for(let k=0;k<3;k++)line(x-.5+k*.4,z-.22,x-.29+k*.4,z-.21,.027,'#91a3a0',.055);
 }
 for(const x of [-7,7])for(const side of [-1,1])for(let z=-14;z<15;z+=1.4)flat(x+side*.61,z,.14,1.0,'#343c33',.040,.035*Math.sin(z));
 for(const [x,z] of [[-9.6,3.95],[9.6,-4.3],[-3.8,-4.3],[3.8,3.95]]){
  flat(x,z,.95,.39,'#202e2e',.044);for(let k=0;k<7;k++)flat(x-.36+k*.12,z,.034,.33,'#8b9991',.055);
 }
 for(const x of [-7,7])for(const z of [-11.6,10.9]){
  line(x,z+.5,x,z-.7,.11,'#bcb697',.053);line(x,z-.7,x-.36,z-.30,.12,'#bcb697',.053);line(x,z-.7,x+.36,z-.30,.12,'#bcb697',.053);
 }
 // No new blockers: each structure and its equipment stays on an existing tent footprint.
 for(const [i,footprint] of tents.entries()){
  const med=[1,3,5,7].includes(i),command=i===4,supply=!med&&!command;
  const r=supply?{...footprint,x:footprint.x+footprint.w*.135,w:footprint.w*.73}:footprint;
  const h=1.35+(i%3)*.055,rise=.90,x=r.x,z=r.z,front=z+r.d/2,back=z-r.d/2;
  if(supply){
   const ex=footprint.x-footprint.w*.37,ez=z-.28;
   box(ex,.105,z,.79,.13,r.d-.06,'#465952',M.PARK_STONE);
   add('pickupRoundBox',model(ex,.57,ez,.365,.40,.61),i===0?'#697e79':'#77816b',M.METAL);
   box(ex,.99,ez,.70,.055,1.10,'#9ca38b');
   for(let k=0;k<6;k++)box(ex-.26+k*.104,.61,ez+.624,.042,.44,.018,'#263d3e');
   box(ex,.62,ez-.65,.44,.23,.07,'#29484b');add('pickupOrb',model(ex,.65,ez-.693,.045,.044,.018),'#b9cfac',M.GLASS,.17);
   seg([ex+.23,.76,ez-.44],[ex+.23,1.60,ez-.44],.049,'#556e68');seg([ex+.23,1.60,ez-.44],[ex+.09,1.60,ez-.44],.049,'#536d68');
   box(ex,.38,front-.36,.73,.45,.53,'#a2a588',M.PARK_STONE);box(ex,.64,front-.36,.76,.05,.56,'#c2c3a4');
   for(const dx of [-.22,.22])box(ex+dx,.39,front-.36,.052,.47,.55,'#536c64');
  }
  const cloth=command?'#5e7475':med?'#a1a38c':i%2?'#777e68':'#85876d';
  solids.push({x:footprint.x,z:footprint.z,w:footprint.w,d:footprint.d,h:h+rise});
  box(x,.08,z,r.w+.08,.13,r.d+.10,'#363f39',M.PARK_STONE);
  box(x,h/2+.10,z,r.w-.04,h,r.d-.04,cloth,M.CAMP_CANVAS);
  add('campCanvas',model(x,h+.08,z,r.w/2+.025,rise,r.d/2+.02),cloth,M.CAMP_CANVAS);
  // Canvas hems, straps and shallow roof sag replace the old flat roof texture.
  for(const side of [-1,1])box(x,.27,z+side*(r.d/2-.014),r.w-.06,.22,.032,'#505d52',M.FABRIC);
  for(const dx of [-r.w*.34,0,r.w*.34])for(let j=0;j<8;j++){
   const a=-1+j/4,b=a+.25,roof=u=>h+.095+rise*(.78*(1-Math.abs(u))+.22*Math.cos(u*Math.PI/2));
   seg([x+dx,roof(a),z+a*(r.d/2+.025)],[x+dx,roof(b),z+b*(r.d/2+.025)],.016,med?'#b8bba5':'#a0aa94',M.FABRIC);
  }
  for(const side of [-1,1]){
   const px=x+side*r.w*.47;seg([px,.11,back+.055],[px,h+.07,back+.055],.026,'#a8b0a1');
   seg([x+side*r.w*.34,h+.94,z],[x+side*r.w*.47,.16,back+.08],.010,'#a7a68d',M.METAL);
   const wx=x+side*r.w*.32;
   box(wx,.97,front+.012,.65,.43,.026,'#263f43',M.GLASS);
   const window=box(wx,.98,front+.031,.49,.28,.016,med?'#c8ad7d':'#83a8a0',M.GLASS);window.glow=med?.16:.08;
   for(const dx of [-.19,0,.19])box(wx+dx,.98,front+.043,.018,.30,.023,'#666f5d');
   box(wx,1.22,front+.035,.73,.11,.14,cloth,M.PARK_STONE);
   box(wx,.42,back+.18,.61,.58,.40,'#5d6b63');box(wx,.72,back+.18,.65,.06,.45,'#8c9990');
   for(let k=0;k<4;k++)box(wx-.20+k*.13,.46,back-.028,.045,.26,.014,'#233d3e');
  }
  box(x,.74,front+.019,.80,1.27,.038,'#182d30',M.MATTE);
  for(const side of [-1,1])box(x+side*.45,.77,front+.047,.15,1.34,.095,cloth,M.PARK_STONE);
  box(x,1.43,front+.055,1.05,.16,.32,'#b4b497',M.PARK_STONE);
  // Rolled canvas, folded flaps and a shallow porch add depth to the entry silhouette.
  seg([x-.52,1.51,front+.15],[x+.52,1.51,front+.15],.058,'#9d9e83',M.CAMP_CANVAS);
  for(const side of [-1,1]){
   box(x+side*.37,.81,front+.075,.18,1.06,.065,'#939980',M.CAMP_CANVAS,side*.22);
   seg([x+side*.49,1.42,front+.075],[x+side*.49,1.29,front+.49],.019,'#a6b09b');
  }
  add('campCanvas',model(x,1.43,front+.23,.66,.10,.32),cloth,M.CAMP_CANVAS);
  box(x,1.36,front+.40,.36,.035,.12,'#d9b77e',M.GLASS).glow=.27;
  lights.push({x,y:.068,z:front+.96,radius:1.20,color:'#ebc18c',strength:.16,mode:0});
  // The canvas skirt ends on weighted hems within the existing shelter footprint.
  for(const side of [-1,1])for(let k=0;k<4;k++)add('pickupRoundBox',model(x-r.w*.36+k*r.w*.24,.16,z+side*(r.d/2-.10),.22,.085,.115),'#6e7863',M.PARK_STONE);

  // Painted ward badge is readable from the play camera, with lamps on the door.
  if(med){
   box(x,1.51,front+.081,.59,.36,.024,'#d4cfb1',M.MATTE);
   box(x,1.51,front+.097,.12,.27,.012,'#9b5549',M.MATTE);box(x,1.51,front+.098,.34,.09,.013,'#9b5549',M.MATTE);
   box(x,h+rise+.105,z,.64,.018,.18,'#d5d0ad',M.MATTE);box(x,h+rise+.109,z,.17,.022,.38,'#d5d0ad',M.MATTE);
  }else{
   for(let k=0;k<3;k++)box(x-.22+k*.22,1.5,front+.076,.11,.25,.03,command?'#c0bd8c':'#a39162',M.MATTE);
  }
  const fi=fixtures.length,q=box(x,1.52,front+.15,.34,.045,.21,'#f1c18a',M.GLASS);q.fixture=fi;
  fixtures.push({x,y:1.51,z:front+.15,color:'#f1c18a',powered:false,phase:i*.73,radius:4.3,intensity:.93});
  lights.push({x,y:.065,z:front+.73,radius:1.55,color:'#ecc392',strength:.33,mode:0,fixture:fi});
  for(const side of [-1,1]){
   box(x+side*r.w*.40,.26,front-.23,.57,.39,.46,'#697365',M.METAL);
   box(x+side*r.w*.40,.47,front-.23,.60,.045,.50,'#a1ab95');
  }
  if(command){
   const ax=x+r.w*.40,az=z-.72;seg([ax,.12,az],[ax,4.15,az],.037,'#b3bfb2');
   for(const y of [3.4,3.9])seg([ax-.48,y,az],[ax+.48,y,az],.021,'#aab9b0');
   for(const dx of [-.34,.34])seg([ax+dx,3.27,az],[ax+dx,4.01,az],.013,'#728c87');
   add('pickupOrb',model(ax,4.19,az,.06,.09,.06),'#ed926d',M.GLASS,.55);
   add('pickupOrb',model(x-.75,h+rise+.18,z-.08,.44,.15,.36),'#a8b8b4',M.METAL);
   seg([x-.75,h+rise+.2,z-.08],[x-.68,h+rise+.75,z+.10],.019,'#798e89');
  }else if(i===0||i===8){
   const bx=x-r.w*.34,bz=back+.36;box(bx,.89,bz,.75,1.25,.53,'#4b686b');
   box(bx,1.54,bz,.80,.065,.58,'#829f9a');for(let k=0;k<5;k++)box(bx-.24+k*.12,1.08,bz+.277,.044,.40,.015,'#21383c');
  }
 }
 const fixture=(x,y,z,c='#e9cea0',radius=6,powered=false)=>{
  box(x,y+.05,z,.56,.15,.32,'#314844');const q=box(x,y-.045,z,.44,.032,.25,c,M.GLASS);q.fixture=fixtures.length;
  fixtures.push({x,y:y-.08,z,color:c,powered,phase:x+z,radius,intensity:1.0});lights.push({x,y:.067,z,radius:3.3,color:c,strength:.26,mode:0,fixture:q.fixture});
 };
 const fence=(ax,az,bx,bz)=>{
  const n=Math.ceil(Math.hypot(ax-bx,az-bz)/2.6);
  for(let i=0;i<=n;i++){const x=lerp(ax,bx,i/n),z=lerp(az,bz,i/n);seg([x,.05,z],[x,1.62,z],.038,'#778777');}
  for(const y of [.32,1.43])seg([ax,y,az],[bx,y,bz],.025,'#7a8775');
  for(let i=0;i<n*2;i++){const u=i/(n*2),v=(i+1)/(n*2),x=lerp(ax,bx,u),z=lerp(az,bz,u),xx=lerp(ax,bx,v),zz=lerp(az,bz,v);seg([x,.32,z],[xx,1.43,zz],.009,'#71847d');seg([x,1.43,z],[xx,.32,zz],.009,'#71847d');}
  for(let i=0;i<n;i++){const u=(i+.5)/n,x=lerp(ax,bx,u),z=lerp(az,bz,u);seg([x,1.43,z],[x+.11,1.79,z],.014,'#75887c');}
 };
 for(const z of [-18.2,18.2])for(const side of [-1,1])fence(side*3,z,side*24.6,z);
 for(const x of [-24.6,24.6]){fence(x,-18.2,x,-3.1);fence(x,3.1,x,18.2);}
 for(const [side,x,z] of [[-1,-29,-4],[1,29,4],[-1,-10,-23],[1,10,-23]]){
  const firstPart=parts.length,firstFixture=fixtures.length,firstLight=lights.length;
  box(x,.021,z,8.2,.032,7.4,'#526462',M.CONCRETE,0,false);
  for(const dx of [-2.05,0,2.05])flat(x+dx,z,.035,7.1,'#344b4d',.049);
  for(const dz of [-1.85,0,1.85])flat(x,z+dz,7.9,.032,'#344b4d',.049);
  for(const side0 of [-1,1])for(let j=0;j<4;j++)flat(x+side0*3.8,z-2.7+j*1.8,.17,.8,'#c5b58b',.058);
  flat(x,z+4.8,1.46,2.65,'#7b8271',.041);for(let k=0;k<5;k++)flat(x,z+3.8+k*.43,1.40,.04,'#485e58',.049);
  for(let k=0;k<5;k++)add('pickupRoundBox',model(x+side*4.65,.19,z-1.35+k*.65,.31,.18,.27),'#85866b',M.PARK_STONE);

  for(let k=0;k<28;k++){const a=k*Math.PI/14,b=a+.18;seg([x+Math.cos(a)*3.15,.062,z+Math.sin(a)*3.15],[x+Math.cos(b)*3.15,.062,z+Math.sin(b)*3.15],.047,'#c6c8ae',M.MATTE);}
  for(const dx of [-.69,.69])flat(x+dx,z,.20,2.0,'#d1d4bd',.067);flat(x,z,1.5,.19,'#d1d4bd',.068);
  for(const dx of [-3.7,3.7])for(const dz of [-3.3,3.3]){box(x+dx,.13,z+dz,.23,.26,.23,'#2a4542');add('pickupOrb',model(x+dx,.285,z+dz,.10,.055,.10),'#87e0c0',M.GLASS,.65);}
  for(const dx of [-3.8,3.8]){seg([x+dx,.1,z+4.9],[x+dx,3.6,z+4.9],.044,'#7b8877');fixture(x+dx,3.57,z+4.9,'#c0dbd0',7.0);}
  // A lit holding shelter, field beds and packed cases make the evacuation readable.
  box(x,.11,z+7.3,4.2,.22,2.6,'#6f7b6c',M.PARK_STONE);
  for(const dx of [-1.85,1.85])for(const dz of [-1.1,1.1])seg([x+dx,.2,z+7.3+dz],[x+dx,2.13,z+7.3+dz],.035,'#9ba990');
  add('campCanvas',model(x,2.12,z+7.3,2.13,.40,1.4),'#788a7b',M.CAMP_CANVAS);fixture(x,1.95,z+6.12,'#f0cea0',5.8);
  // Visible medical supplies sit beside the boarding lane, away from the moving civilians.
  const tx=x+side*2.2,tz=z+4.6;
  box(tx,.62,tz,1.10,.10,.65,'#869c8e');for(const dx of [-.43,.43])for(const dz of [-.24,.24])seg([tx+dx,.06,tz+dz],[tx+dx,.62,tz+dz],.023,'#abbcaf');
  box(tx-.22,.79,tz,.39,.24,.32,'#c8c7aa');box(tx+.22,.76,tz,.28,.17,.27,'#729196');
  box(tx-.22,.916,tz,.20,.013,.047,'#9e6255',M.MATTE);box(tx-.22,.918,tz,.048,.015,.20,'#9e6255',M.MATTE);
  const ox=tx+side*.62;seg([ox,.14,tz-.12],[ox,.85,tz-.12],.13,'#687f79');seg([ox,.82,tz-.12],[ox,.99,tz-.12],.047,'#b5beaa');
  // A low guide rope and sign frame the queue without crowding its route.
  for(const dz of [3.2,5.1]){seg([x-1.0,.05,z+dz],[x-1.0,.76,z+dz],.025,'#96aca0');add('pickupOrb',model(x-1.0,.78,z+dz,.046,.040,.046),'#c7c8a9');}
  for(let k=0;k<5;k++){const a=k/5,b=(k+1)/5;seg([x-1.0,.72-.09*Math.sin(a*Math.PI),z+3.2+a*1.9],[x-1.0,.72-.09*Math.sin(b*Math.PI),z+3.2+b*1.9],.013,'#a39775',M.FABRIC);}

  for(const dx of [-1.1,1.0]){box(x+dx,.47,z+7.7,.69,.10,1.75,'#aeb3a0',M.FABRIC);for(const dz of [-.70,.70])seg([x+dx,.13,z+7.7+dz],[x+dx,.46,z+7.7+dz],.031,'#6f8077');}
  for(let k=0;k<3;k++){box(x+side*3.0,.29+k*.27,z+7.4,.95,.24,.66,'#68755b');box(x+side*3.0,.29+k*.27,z+7.4,.09,.25,.67,'#b9b594');}
  // A field ambulance stands beyond the boarding route.
  const vx=x+side*6.4,vz=z+6.5;
  add('pickupRoundBox',model(vx,.96,vz,1.05,.69,2.2),'#b0b6a4',M.METAL);add('pickupRoundBox',model(vx,1.71,vz-.27,1.04,.085,1.95),'#8b9e91',M.METAL);
  for(const side0 of [-1,1]){box(vx+side0*1.053,1.0,vz,.025,.17,3.65,'#97695b',M.MATTE);box(vx+side0*1.071,1.20,vz+.15,.028,.56,.15,'#c6c8ac',M.MATTE);box(vx+side0*1.073,1.20,vz+.15,.030,.15,.55,'#c6c8ac',M.MATTE);}
  box(vx,1.85,vz-1.33,1.28,.14,.25,'#415859');for(const dx of [-.43,.43])add('pickupOrb',model(vx+dx,1.93,vz-1.33,.15,.11,.12),'#e58e6c',M.GLASS,.50);
  box(vx,.49,vz-2.22,2.04,.17,.19,'#60766f');for(const dx of [-.72,.72])box(vx+dx,.96,vz-2.222,.36,.19,.023,'#d9cbaa',M.GLASS);

  box(vx,1.21,vz-2.22,1.63,.50,.035,'#304f54',M.GLASS);
  for(const xx of [-1.08,1.08])for(const zz of [-1.28,1.28])seg([vx+xx-.09,.40,vz+zz],[vx+xx+.09,.40,vz+zz],.36,'#263a35',M.RUBBER);
  box(vx,1.808,vz,.83,.015,.20,'#d8d6bd',M.MATTE);box(vx,1.81,vz,.21,.016,.81,'#d8d6bd',M.MATTE);
  for(const dz of [-3.7,3.7])for(let k=0;k<4;k++)add('coldSnow',model(x+side*(5.7+k*.45),-.04,z+dz,.55,.27,.39),'#566446',M.PARK_STONE,0,false);
  if(z< -20){for(const p of parts.slice(firstPart)){const m=p.matrix;for(const k of [0,2,4,6,8,10])m[k]*=-1;m[12]=2*x-m[12];m[14]=2*z-m[14];}for(const f of [...fixtures.slice(firstFixture),...lights.slice(firstLight)]){f.x=2*x-f.x;f.z=2*z-f.z;}}
 }
 for(const [x,z] of [[-28,-15],[28,-14],[-28,16],[28,19],[-16,-21],[16,-21]]){
  for(let k=0;k<4;k++)add('coldSnow',model(x+(k-1.5)*.6,.03,z,.53,.24,.31),'#6c7454',M.PARK_STONE);
  for(let k=0;k<3;k++)add('arenaGable',model(x+(k-1)*.2,.05,z,.035,.32+k*.07,.18,k),'#79825c',M.ORGANIC);
 }
 // Boundary service roads and layered defenses leave the four entrances open.
 for(const x of [-26.5,26.5])for(let z=-44;z<47;z+=5){
  box(x,.014,z,2.6,.026,5,'#3b4847',M.ASPHALT,0,false);
  for(const side of [-1,1])flat(x+side*1.04,z,.075,2.5,'#939d8a',.051);
  if(Math.abs(z)>8&&Math.abs(z)<31)for(const side of [-1,1])box(x+side*1.37,.092,z,.17,.13,4.92,'#869284',M.PARK_STONE);
 }
 const barrier=(x,z,a=0)=>{
  add('powerHull',model(x,.38,z,1.12,.34,.32,a),'#8e9689',M.PARK_STONE);
  box(x,.08,z,2.3,.11,.78,'#505f56',M.PARK_STONE,a);
  box(x,.735,z,2.0,.055,.25,'#b6b498',M.PARK_STONE,a);
 };
 for(const z of [-18.7,18.7])for(const x of [-21,-17,17,21])barrier(x,z);
 for(const x of [-25.1,25.1])for(const z of [-14,-10,10,14])barrier(x,z,Math.PI/2);
 const letters={E:[[1,1,0,1],[0,1,0,0],[0,0,1,0],[0,.52,.8,.52]],V:[[0,1,.5,0],[.5,0,1,1]],A:[[0,0,.5,1],[.5,1,1,0],[.22,.43,.78,.43]],C:[[1,1,0,1],[0,1,0,0],[0,0,1,0]]};
 const gate=(x,z,angle)=>{
  const start=parts.length,f0=fixtures.length,l0=lights.length;
  for(const dx of [-3.25,3.25]){
   box(x+dx,.38,z,.55,.76,.72,'#859388',M.PARK_STONE);seg([x+dx,.10,z],[x+dx,3.15,z],.08,'#749087');
   box(x+dx,2.92,z,.43,.17,.45,'#425b57');fixture(x+dx,2.84,z,'#d7e1c3',6.4,true);
  }
  seg([x-3.25,3.22,z],[x+3.25,3.22,z],.08,'#849b90');
  box(x,3.22,z,2.45,.69,.17,'#314c4f');box(x,3.59,z,2.52,.09,.21,'#98a994');
  for(let i=0;i<4;i++)for(const [a,b,c,d] of letters['EVAC'[i]])seg([x-.93+i*.49+a*.31,3.00+b*.40,z+.095],[x-.93+i*.49+c*.31,3.00+d*.40,z+.095],.018,'#e2dabb',M.MATTE);
  if(angle){const ca=Math.cos(angle),sa=Math.sin(angle);for(const p of parts.slice(start)){const m=p.matrix;for(const k of [0,4,8]){const xx=m[k],zz=m[k+2];m[k]=ca*xx-sa*zz;m[k+2]=sa*xx+ca*zz;}const xx=m[12]-x,zz=m[14]-z;m[12]=x+ca*xx-sa*zz;m[14]=z+sa*xx+ca*zz;}for(const f of [...fixtures.slice(f0),...lights.slice(l0)]){const xx=f.x-x,zz=f.z-z;f.x=x+ca*xx-sa*zz;f.z=z+sa*xx+ca*zz;}}
 };
 gate(0,-18.4,0);gate(0,18.4,Math.PI);gate(-24.9,0,Math.PI/2);gate(24.9,0,-Math.PI/2);
 // Lights and supply equipment occupy the rear corners of existing structures.
 for(const i of [0,2,6,8]){
  const r=tents[i],x=r.x+(i%3===0?-.40:.40)*r.w,z=r.z-r.d*.30;
  seg([x,.10,z],[x,3.25,z],.040,'#91a79a');box(x,3.28,z,.68,.29,.28,'#2f4b4c');fixture(x,3.20,z,'#c4dad2',7.6,true);
 }
 // Elevated watch posts, storage and scrub continue the scene beyond the fence.
 for(const [x,z] of [[-32,-16],[32,16]]){
  for(const dx of [-.91,.91])for(const dz of [-.88,.88]){box(x+dx,.13,z+dz,.39,.25,.41,'#728172',M.PARK_STONE);seg([x+dx,.18,z+dz],[x+dx,3.36,z+dz],.07,'#859789');}
  for(const side of [-1,1]){seg([x-.9,.35,z+side*.88],[x+.9,3.12,z+side*.88],.035,'#5d7972');seg([x+.9,.35,z+side*.88],[x-.9,3.12,z+side*.88],.035,'#5d7972');}
  box(x,3.19,z,2.04,.18,2.03,'#4d6662');box(x,3.68,z,1.85,.82,1.78,'#7c8e7e',M.PARK_STONE);
  for(const side of [-1,1]){box(x,3.84,z+side*.895,1.52,.35,.019,'#24464c',M.GLASS);box(x+side*.935,3.84,z,.022,.35,1.32,'#37565c',M.GLASS);}
  add('arenaGable',model(x,4.14,z,1.2,.43,1.15),'#647e72',M.PARK_STONE);fixture(x,3.17,z+.92,'#e4be8b',9.2);
  for(const dx of [-.25,.25])seg([x+dx,.08,z+1.20],[x+dx,3.18,z+1.20],.025,'#a2b5a2');for(let y=.35;y<3.2;y+=.32)seg([x-.25,y,z+1.20],[x+.25,y,z+1.20],.022,'#a2b5a2');
 }
 for(const [x,z,c] of [[-42,5,'#557474'],[44,-7,'#796d58'],[-39,-23,'#6e7c63'],[38,27,'#647c75']]){
  box(x,1.10,z,3.2,2.18,6.0,c);box(x,2.24,z,3.3,.12,6.10,'#8b9a89');
  for(const side of [-1,1])for(let k=0;k<13;k++)box(x+side*1.61,1.17,z-2.7+k*.45,.065,1.96,.075,'#425d56');
  for(const dx of [-.70,.70]){box(x+dx,1.12,z+3.017,1.35,2.03,.025,'#80917f');seg([x+dx,.25,z+3.06],[x+dx,2.05,z+3.06],.026,'#bdc4a8');}
 }
 // Side triage lanes feed the evacuation pads; all dressing stays outside the combat fence.
 for(const side of [-1,1]){
  const x=side*29,z=side*4;
  for(let k=0;k<5;k++)box(x,.021,z+8.5+k*1.8,3.75,.035,1.8,'#69766e',M.CONCRETE,0,false);
  for(let k=0;k<6;k++){
   const cx=side*27.88,cz=z+7.4+k*1.85;
   box(cx,.073,cz,.23,.07,.23,'#354d46');add('cone',model(cx,.21,cz,.075,.15,.075),'#b48154',M.MATTE);box(cx,.245,cz,.079,.045,.079,'#c8c4a5',M.MATTE);
  }
  const tz=z+16.6;
  for(const dx of [-1.75,1.75])for(const dz of [-1.06,1.06])seg([x+dx,.08,tz+dz],[x+dx,2.08,tz+dz],.034,'#9cae99');
  add('campCanvas',model(x,2.08,tz,1.90,.34,1.25),'#819383',M.CAMP_CANVAS);
  box(x,1.14,tz+1.08,3.45,1.83,.045,'#879480',M.CAMP_CANVAS);
  box(x,1.35,tz+1.11,.56,.13,.025,'#d1cdb0',M.MATTE);box(x,1.35,tz+1.13,.14,.53,.025,'#d1cdb0',M.MATTE);
  fixture(x,1.97,tz-.93,'#e8c79a',5.0);
  for(let k=0;k<3;k++){box(x+side*2.35,.21+k*.30,tz-.35,.68,.27,.55,'#6b7e73');box(x+side*2.35,.21+k*.30,tz-.35,.06,.28,.56,'#afb193');}
  box(x-side*1.19,.42,tz+.20,.63,.82,.51,'#587477');box(x-side*1.19,.86,tz+.20,.66,.065,.54,'#a4b3a1');
  for(const dz of [9.3,12.6]){line(x,z+dz+.35,x,z+dz-.45,.12,'#b4bc9e',.054);line(x,z+dz-.45,x-.29,z+dz-.12,.11,'#b4bc9e',.054);line(x,z+dz-.45,x+.29,z+dz-.12,.11,'#b4bc9e',.054);}
 }
 // A disabled supply van belongs to the background emergency, not the playable collision map.
 const fireX=20.4,fireZ=-22.1;
 add('campWear',model(fireX,.047,fireZ,2.3,.007,2.5),'#303b33',M.PARK_STONE,0,false);
 add('pickupRoundBox',model(fireX,.72,fireZ,.90,.38,1.65),'#404b40',M.METAL);
 box(fireX,1.20,fireZ-.33,1.80,.60,2.28,'#5c6653');box(fireX,1.48,fireZ-.30,1.86,.07,2.30,'#4e6050');
 box(fireX,1.06,fireZ+1.12,1.59,.44,.04,'#243c3c',M.GLASS);box(fireX,.49,fireZ+1.68,1.92,.17,.19,'#667367');
 for(const dx of [-.94,.94])for(const dz of [-1.04,1.04])seg([fireX+dx-.10,.32,fireZ+dz],[fireX+dx+.10,.32,fireZ+dz],.31,'#293c33',M.RUBBER);
 for(let k=0;k<5;k++)box(fireX+.89,.71,fireZ-.80+k*.43,.035,.28,.065,'#36473b');
 for(let k=0;k<18;k++){
  const side=k%2?-1:1,x=side*(33.5+hash(k+230)*5),z=-27+hash(k+271)*54;
  add('coldSnow',model(x,.05,z,.75+hash(k+303),.30,.6),'#667463',M.PARK_STONE);
  for(let j=0;j<4;j++)add('parkBranch',basisModel(x+j*.12,.13,z,x+(j-1.5)*.28,.72+hash(k+j)*.45,z+.19,.027,.018),'#747d56',M.ORGANIC);
 }

 // Continuous service aprons join the existing pads without changing their flight or boarding routes.
 for(const z of [-19.8,21.0])for(let x=-24;x<26;x+=4.8){
  box(x,.015,z,4.8,.028,2.15,'#424e4b',M.ASPHALT,0,false);
  flat(x,z,.075,1.5,'#a1a88f',.051,Math.PI/2);
  if(z>0?Math.abs(Math.abs(x)-14)>6.6:Math.abs(Math.abs(x)-10)>4.6)box(x,.095,z+Math.sign(z)*1.19,4.73,.14,.18,'#8b9685',M.PARK_STONE);
 }
 for(let z=-27.7;z<-18.3;z+=3.2)box(0,.022,z,3.3,.030,3.2,'#737f72',M.CONCRETE,0,false);
 for(const [x,z] of [[-26.5,-19.8],[26.5,-19.8],[-26.5,21.0],[26.5,21.0]]){
  box(x,.032,z,2.62,.018,2.18,'#424e4b',M.ASPHALT,0,false);
  for(let j=0;j<4;j++)flat(x-.85+j*.56,z+1.60,.22,1.02,'#aeb39a',.061);
  box(x-Math.sign(x)*1.17,.047,z+2.4,.28,.027,.75,'#273b39',M.MATTE);
  for(let j=0;j<4;j++)flat(x-Math.sign(x)*1.17,z+2.14+j*.17,.26,.035,'#83958a',.065);
 }
 for(const side of [-1,1]){
  // Scuffed parking courts give the southern boundary a readable motor-pool edge.
  const x=side*14;
  box(x,.021,23.9,9.6,.036,6.0,'#485652',M.ASPHALT,0,false);
  for(const edge of [-1,1]){flat(x,23.9+edge*2.7,8.7,.08,'#aaae93',.062);flat(x+edge*4.35,23.9,.08,5.4,'#aaae93',.062);}
  box(x,.13,27.00,9.6,.20,.22,'#879580',M.PARK_STONE);
  for(const [dx,dz] of [[-3,-.8],[2.4,1.1]])add('campWear',model(x+dx,.061,23.9+dz,.71,.006,.34,side*.3),'#354743',M.WET,0,false);
 }
 // Medical annex, service workshop and command building form a backdrop beyond the evacuation lanes.
 const building=(x,z,w,d,h,angle,kind)=>{
  const start=parts.length,f0=fixtures.length,l0=lights.length,front=z+d/2,wall=kind==='medical'?'#939b87':kind==='command'?'#88988d':'#7c8c80';
  box(x,.10,z,w+.55,.24,d+.55,'#6d7b6d',M.PARK_STONE);
  box(x,h/2+.13,z,w,h,d,wall,M.PARK_STONE);
  box(x,.40,z,w+.025,.38,d+.025,'#65796e',M.PARK_STONE);
  box(x,h+.19,z,w+.28,.18,d+.28,'#5c736a');
  for(const side of [-1,1]){
   box(x+side*(w/2-.08),h/2+.13,z,.17,h+.10,d+.045,'#a1ac97',M.PARK_STONE);
   box(x,h+.32,z+side*(d/2+.045),w+.37,.14,.14,'#a3afa0');
   box(x+side*w/2,h+.32,z,.14,.14,d,'#9baa99');
  }
  const rows=kind==='command'&&h>4.8?2:1;
  for(let row=0;row<rows;row++)for(let col=0;col<4;col++){
   const wx=x+[-.36,-.19,.19,.36][col]*w,wy=1.47+row*2.45,lit=(col+row+(kind==='medical'?0:1))%3!==0;
   box(wx,wy,front+.025,1.0,1.04,.055,'#3d5652');
   const pane=box(wx,wy+.015,front+.061,.83,.84,.022,lit?'#bea777':'#2f4d51',M.GLASS);pane.glow=lit?.12:.015;
   box(wx,wy+.015,front+.080,.043,.86,.025,'#9aa993');box(wx,wy+.015,front+.082,.85,.043,.025,'#899d90');
   box(wx,wy-.53,front+.13,1.10,.11,.23,'#a1ad98',M.PARK_STONE);
  }
  box(x,1.06,front+.034,.98,1.92,.07,'#2b4545');box(x,1.29,front+.078,.70,.99,.030,'#3e6365',M.GLASS);
  box(x+.29,1.00,front+.10,.045,.28,.035,'#bac2a5');box(x,.115,front+.40,1.55,.14,.80,'#97a28c',M.PARK_STONE);
  box(x,2.29,front+.54,2.18,.12,1.19,'#7b9385');
  for(const dx of [-.93,.93])seg([x+dx,2.22,front+.99],[x+dx,1.69,front+.10],.026,'#9baea0');
  fixture(x,2.23,front+.52,'#e0bc87',6.3);
  if(kind==='medical'){
   box(x,2.93,front+.049,.72,.63,.032,'#d0ccb0',M.MATTE);box(x,2.93,front+.077,.15,.49,.018,'#9d6252',M.MATTE);box(x,2.93,front+.079,.49,.15,.02,'#9d6252',M.MATTE);
  }else if(kind==='workshop'){
   box(x,2.93,front+.044,1.55,.35,.035,'#496964');for(let k=0;k<3;k++)box(x-.43+k*.43,2.93,front+.073,.22,.20,.025,'#bab794',M.MATTE);
  }else box(x,h/2+.10,front+.055,w,.13,.14,'#acb59f',M.PARK_STONE);
  box(x-w*.20,h+.56,z-.22,1.56,.64,.92,'#718b7e');box(x-w*.20,h+.90,z-.22,1.63,.06,.98,'#a3b19e');
  for(let k=0;k<4;k++)box(x-w*.20-.53+k*.35,h+.91,z-.22,.075,.06,.73,'#3f5d57');
  seg([x+w*.30,h+.24,z-.38],[x+w*.30,h+.90,z-.38],.13,'#8ea092');box(x+w*.30,h+.95,z-.38,.51,.07,.47,'#a7b39d');
  seg([x+w/2-.18,.22,front+.11],[x+w/2-.18,h+.24,front+.11],.037,'#607c70');
  if(angle){const ca=Math.cos(angle),sa=Math.sin(angle);for(let i=start;i<parts.length;i++){const m=parts[i].matrix;for(const k of [0,4,8]){const a=m[k],b=m[k+2];m[k]=ca*a-sa*b;m[k+2]=sa*a+ca*b;}const a=m[12]-x,b=m[14]-z;m[12]=x+ca*a-sa*b;m[14]=z+sa*a+ca*b;}for(const q of [...fixtures.slice(f0),...lights.slice(l0)]){const a=q.x-x,b=q.z-z;q.x=x+ca*a-sa*b;q.z=z+sa*a+ca*b;}}
 };
 building(-37.8,14.8,8.8,5.8,3.65,-Math.PI/2,'medical');
 building(37.8,-12.0,8.0,6.0,3.45,Math.PI/2,'workshop');
 building(0,-27.1,6.4,4.0,3.25,0,'command');
 box(0,.028,-24.1,7.4,.025,2.4,'#7e8978',M.CONCRETE,0,false);
 for(const side of [-1,1])box(side*34.15,.024,side<0?14.8:-12,1.7,.028,9.6,'#7f8a77',M.CONCRETE,0,false);
 // Covered outer checkpoints screen the traffic entry points at the ends of the service roads.
 for(const x of [-26.5,26.5])for(const z of [-34,34]){
  for(const dx of [-1.67,1.67])for(const dz of [-1.50,1.50])seg([x+dx,.05,z+dz],[x+dx,3.0,z+dz],.056,'#889d8d');
  add('campCanvas',model(x,3.0,z,1.94,.30,1.86),'#708c7d',M.CAMP_CANVAS);
  fixture(x,2.86,z+.40,'#d8c99f',6.2);
 }
 // A parked evacuation bus and support cars break up the near motor-pool apron.
 const bx=-14,bz=23.7;
 add('pickupRoundBox',model(bx,1.05,bz,3.82,.68,1.13),'#829583',M.METAL);
 box(bx,1.93,bz,7.55,.20,2.24,'#a6b49d');box(bx,.66,bz,7.66,.16,2.29,'#b8b08d',M.MATTE);
 for(const side of [-1,1]){
  for(let k=0;k<6;k++){box(bx-2.85+k*1.1,1.47,bz+side*1.137,.84,.61,.026,'#2f4e53',M.GLASS);box(bx-2.85+k*1.1,1.83,bz+side*1.16,.94,.065,.05,'#afbaa5');}
  for(const dx of [-2.48,2.38])seg([bx+dx,.43,bz+side*1.07],[bx+dx,.43,bz+side*1.25],.41,'#293c36',M.RUBBER);
 }
 box(bx+3.83,1.41,bz,.026,.75,1.91,'#385b5d',M.GLASS);box(bx+3.91,.49,bz,.17,.19,2.05,'#879b8b');
 for(const dz of [-.73,.73])box(bx+3.91,.86,bz+dz,.04,.23,.38,'#d9d4b0',M.GLASS).glow=.11;
 for(const z of [23.0,26.0]){
  add('pickupRoundBox',model(13.8,.54,z,1.93,.27,.87),'#687f78');add('pickupRoundBox',model(13.5,.96,z,.95,.33,.76),'#839890');
  box(14.48,.99,z,.022,.46,1.37,'#2c4b50',M.GLASS);box(12.53,1.01,z,.025,.40,1.28,'#36545a',M.GLASS);
  for(const dx of [-1.25,1.22])for(const dz of [-.88,.88])seg([13.8+dx,.29,z+dz-.07],[13.8+dx,.29,z+dz+.07],.27,'#263b34',M.RUBBER);
 }
 // Layered banks and scrub carry the ground into the distance instead of ending at a flat dark edge.
 for(let k=0;k<24;k++){
  const side=k%2?-1:1,band=k%4<2,x=band?side*(44+hash(k+600)*4):-38+Math.floor(k/4)*15,z=band?-34+Math.floor(k/4)*13:side*40;
  add('coldSnow',model(x,-.025,z,5.7+hash(k+610)*2.0,.55+hash(k+620)*.70,4.6+hash(k+630)*2.1,k*.31),'#607461',M.PARK_STONE,0,false);
  for(let j=0;j<2;j++){const px=x+(j-.5)*3.4,pz=z+Math.sin(k+j)*1.7;add('parkCrown',model(px,.18,pz,.82+hash(k+j)*.7,.68,.80),'#4f6c55',M.ORGANIC,0,false);}
 }
 for(const [x,z] of [[-30,-11.9],[30,-14.7],[-20.5,23.3],[20.5,25.5],[-19.5,-27.1],[19.5,-29.1]]){
  add('campWear',model(x,.048,z,2.4,.005,1.6,x*.1),'#596b58',M.PARK_STONE,0,false);
  for(let j=0;j<3;j++){const r=hash(x+z+j*17),a=j*2.39+r;add('coldSnow',model(x+Math.cos(a)*1.10,.052,z+Math.sin(a)*.60,.57+r*.29,.12+r*.14,.40+r*.23,a),'#6d786a',M.PARK_STONE);add('parkCrown',model(x+Math.cos(a+.4)*1.23,.075,z+Math.sin(a+.4)*.91,.35+r*.24,.18+r*.22,.32+r*.28,a),'#536c52',M.ORGANIC);}
 }
 for(const [x,z] of [[-24.5,-25.1],[24.5,-25.1],[-20.5,26.8],[20.5,27.8]]){
  seg([x,.05,z],[x,3.70,z],.049,'#8da292');seg([x,3.68,z],[x-Math.sign(x)*.72,3.68,z],.039,'#91a895');fixture(x-Math.sign(x)*.72,3.60,z,'#ddcea5',7.8);
 }

}
function campHelicopterParts(x,y,z,heading,time,scale=1.3,roll=0,pitch=0,wreck=false,doorsOpen=0){
 const source=powerupModelPlan({player:{x:720,y:520,aim:0,groundHeight:0},arcade:{vehicle:'heli',shots:0,transport:true,doorsOpen:wreck?1:doorsOpen},time:wreck?.016:time});
 const ca=Math.cos(heading),sa=Math.sin(heading),cr=Math.cos(roll),sr=Math.sin(roll),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const turn=(x,y,z)=>{const yy=y*cr-z*sr,zz=y*sr+z*cr,xx=x*cp-yy*sp,yp=x*sp+yy*cp;return[(xx*ca-zz*sa)*scale,yp*scale,(xx*sa+zz*ca)*scale];};
 return source.parts.flatMap((p,i)=>{
  const m=new Float32Array(p.matrix),localY=m[13]-source.pose.lift;
  // Torn rotor blades and a displaced tail distinguish the wreck from a parked aircraft.
  if(wreck&&p.heliRole==='bladeTip')return[];
  if(wreck&&p.heliRole==='blade'){if(p.blade%2)return[];for(const k of [0,1,2,8,9,10])m[k]*=.38;}
  if(wreck&&p.heliRole==='tail'){m[14]+=.46;m[13]-=.22;}
  if(wreck&&['canopy','nav','cabinLamp'].includes(p.heliRole))return[];
  if(wreck&&p.heliRole==='hull'){for(const k of [1,5,9])m[k]*=.84;}
  for(const k of [0,4,8]){const v=turn(m[k],m[k+1],m[k+2]);m[k]=v[0];m[k+1]=v[1];m[k+2]=v[2];}
  const v=turn(m[12],m[13]-source.pose.lift,m[14]);m[12]=x+v[0];m[13]=y+v[1];m[14]=z+v[2];
  return[{...p,matrix:m,color:wreck?(p.material===MATERIAL_IDS.GLASS?'#182b2c':'#353c33'):p.color,glow:wreck?0:p.glow}];
 });
}
function appendAirfieldPerson(parts,glows,shadows,t,x,z,progress,index,opts={}){
 const M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.METAL,glow=0)=>parts.push({mesh,matrix,color,material,glow});
 const box=(x,y,z,w,h,d,c,mat=M.METAL,glow=0)=>add('pickupRoundBox',model(x,y,z,w/2,h/2,d/2),c,mat,glow);
  const first=parts.length,g0=glows.length,walking=progress>0,crew=!!opts.crew,medic=!!opts.medic,run=walking?(opts.run??1):0;
  const phase=t*(7.5+run*3.8)+index*.83,swing=walking?Math.sin(phase)*(.24+run*.12):0,bob=walking?(.020+run*.018)*Math.cos(phase*2):.006*Math.sin(t*1.9+index),lean=run*.105;
  const shirt=medic?'#adb9b0':crew?'#697c77':['#aa9677','#688d9f','#a27562','#aab9af','#758468','#a89d89'][index%6],skin=index%2?'#b99d7e':'#96745c';
  const limb=(a,b,r,c,mat=M.FABRIC)=>add('pickupCylinder',basisModel(...a,...b,r,r),c,mat);
  box(x,1.05+bob,z-lean,.44,.55,.29,shirt,M.FABRIC);add('pickupOrb',model(x,.74+bob,z,.19,.135,.135),'#45534f',M.FABRIC);
  limb([x,1.29+bob,z-lean*1.3],[x,1.39+bob,z-lean*1.6],.070,skin,M.SKIN);
  add('pickupOrb',model(x,1.51+bob,z-.026-lean*1.8,.154,.195,.147),skin,M.SKIN);
  add('pickupOrb',model(x,1.645+bob,z+.014-lean*1.8,.155,.064,.143),crew||medic?'#c7c6a8':'#373e35',M.MATTE);
  if(crew||medic){box(x,1.08+bob,z-.16-lean,.33,.39,.032,medic?'#4e8389':'#ac9d5d',M.FABRIC);for(const y of [.97,1.18])box(x,y+bob,z-.182-lean,.35,.037,.019,'#d2d7b6',M.MATTE);}
  else{box(x-.08,1.06+bob,z-.151-lean,.065,.44,.015,'#616c5f',M.FABRIC);}
  for(const side of [-1,1]){
   const stride=swing*side,lift=walking?Math.max(0,Math.cos(phase+(side>0?0:Math.PI)))*(.085+run*.07):0;
   limb([x+side*.11,.73+bob,z],[x+side*.115,.40+lift*.4,z+stride*.48-.035],.073,'#45514f');
   limb([x+side*.115,.40+lift*.4,z+stride*.48-.035],[x+side*.12,.105+lift,z+stride],.059,'#4d5b55');
   box(x+side*.12,.063+lift,z+stride-.045,.15,.12,.26,'#283a36',M.RUBBER);
   const wave=crew?.19*Math.sin(t*3.3+index+side):0,ey=crew?1.30+wave:1.0+bob,ez=crew?z-.17:z-stride*.55-lean;
   const hy=crew?1.50+wave:medic?.83:1.02+bob,hz=crew?z-.34:medic?z+(opts.carry||1)*.28:z-stride*.83-.14-lean;
   limb([x+side*.22,1.24+bob,z-lean*1.3],[x+side*.34,ey,ez],.066,shirt);
   limb([x+side*.34,ey,ez],[x+side*.31,hy,hz],.052,shirt);
   add('pickupOrb',model(x+side*.31,hy-.015,hz,.056,.068,.055),skin,M.SKIN);
   if(crew){limb([x+side*.31,hy+.02,hz],[x+side*.31,hy+.28,hz-.025],.021,'#bed2b4',M.GLASS);glows.push({x:x+side*.31,y:hy+.18,z:hz-.02,radius:.13,color:'#c2dbb9',strength:.36,mode:1});}
  }
  if(!crew&&!medic){if(index%3===0)box(x,1.04+bob,z+.24-lean,.32,.40,.20,'#625d49',M.FABRIC);else box(x+.33,.84+bob,z+swing*.83-.14-lean,.25,.32,.28,'#635f4e',M.FABRIC);}
  if(opts.heading){const ca=Math.cos(opts.heading),sa=Math.sin(opts.heading);for(let i=first;i<parts.length;i++){const m=parts[i].matrix;for(const k of [0,4,8]){const a=m[k],b=m[k+2];m[k]=ca*a-sa*b;m[k+2]=sa*a+ca*b;}const a=m[12]-x,b=m[14]-z;m[12]=x+ca*a-sa*b;m[14]=z+sa*a+ca*b;}for(let i=g0;i<glows.length;i++){const q=glows[i],a=q.x-x,b=q.z-z;q.x=x+ca*a-sa*b;q.z=z+sa*a+ca*b;}}
  shadows.push({x,y:.073,z,radius:.32,color:'#142923',strength:.25,mode:0});
}
function quarantineAtmospherePlan(time,state){
 const parts=[],glows=[],shadows=[],ribbons=[],haze=[],M=MATERIAL_IDS,t=Math.max(0,time-(state?.evacStart||0)),fract=n=>n-Math.floor(n);
 const add=(mesh,matrix,color,material=M.METAL,glow=0)=>parts.push({mesh,matrix,color,material,glow});
 const box=(x,y,z,w,h,d,c,mat=M.METAL,glow=0)=>add('pickupRoundBox',model(x,y,z,w/2,h/2,d/2),c,mat,glow);
 const person=(...args)=>appendAirfieldPerson(parts,glows,shadows,t,...args);
 const aircraft=(x,y,z,heading,roll=0,pitch=0,scale=1.3,doorsOpen=0)=>{
  parts.push(...campHelicopterParts(x,y,z,heading,time,scale,roll,pitch,false,doorsOpen));
  shadows.push({x,y:.062,z,radius:3.3,color:'#14231e',strength:Math.max(.14,.42-y*.025),mode:0});
  glows.push({x,y:y+1.15,z,radius:3.2,color:'#bbc8b5',strength:.34,mode:-2-fract(time*6.2)});
  const blink=Math.pow(Math.max(0,Math.sin(time*5.5+x)),10);
  glows.push({x:x-.5*Math.cos(heading),y:y+.63,z,radius:.32,color:'#ff7257',strength:.9*blink,mode:1});
 };
 // Staggered approach, loading and departure cycles keep several evacuation jobs alive.
 for(const [index,[side,x,z]] of [[-1,-29,-4],[1,29,4],[-1,-10,-23],[1,10,-23]].entries()){
  const firstPart=parts.length,firstGlow=glows.length,firstShadow=shadows.length,firstHaze=haze.length;
  const phase=(t+12+index*14.5)%58;
  if(phase<44){
   let hx=x,hz=z,hy=1.15,roll=0,pitch=0;
   if(phase<10){const u=phase/10,e=u*u*(3-2*u);hx=x+side*22*(1-e);hz=z-7*(1-e);hy=1.15+6.4*(1-e);roll=side*.10*(1-e);pitch=.05*(1-e);}
   else if(phase>33){const u=(phase-33)/11,e=u*u;hx=x+side*24*e;hz=z-13*e;hy=1.15+8.5*e;roll=-side*.13*u;pitch=-.14*u;}
   aircraft(hx,hy,hz,side<0?0:Math.PI,roll,pitch,1.30,clamp((phase-9.5)*2,0,1)*clamp((33-phase)*2,0,1));
   if(phase>=10&&phase<=32){
    box(x,.18,z+1.08,1.05,.23,.67,'#7f8f7c');
    glows.push({x,y:.084,z:z+1.0,radius:1.7,color:'#e0eed0',strength:.42,mode:0},{x,y:1.10,z:z+.855,radius:.38,color:'#cfe5c1',strength:.28,mode:1});
   }
   if(phase<37)for(let k=0;k<6;k++){const u=fract(t*.46+k/6),a=k*1.05+t*.1;haze.push({x:hx+Math.cos(a)*(1.2+u*3),y:.12+u*.40,z:hz+Math.sin(a)*(1.2+u*3),radius:.45+u*.95,color:'#acac8b',strength:.20*(1-u),mode:2+fract(t*.03+k*.17)});}
   if(phase>=9&&phase<35)for(let k=0;k<4;k++){const u=fract(t*.36+k*.27),a=k*1.63+t*.18;add('box',model(x+Math.cos(a)*(1.6+u*3.0),.12+Math.sin(u*Math.PI)*.40,z+Math.sin(a)*(1.6+u*3.0),.075,.006,.11,t*2+k),'#b6b498',M.MATTE);}
  }
  if(phase<31||phase>=44)for(let i=0;i<9;i++){
   const start=44+i*.72,arrival=phase>=44?clamp((phase-start)/4.4,0,1):1;
   if(phase>=44&&phase<start)continue;
   const u=phase>=44?0:clamp((phase-12-i*1.5)/2.0,0,1);if(u>=1)continue;
   const lane=i%2?-.42:.42,wait=5.0+i*.34,px=x+lane*(1-u)+Math.sin(arrival*Math.PI)*side*.45;
   const pz=z+lerp(16.5,wait,arrival)-(wait-1.08)*u;
   person(px,pz,(arrival<1||u>0)?1:0,index*9+i,{run:arrival<1?.80:1});
  }
  // Ground crew remain at the pad as each new group arrives.
  person(x-1.55,z+2.45,0,6,{crew:true,heading:-.40});person(x+1.60,z+4.45,0,7,{crew:true,heading:.45});
  const warning=.15+.62*Math.pow(Math.max(0,Math.sin(t*8.3+index)),10);
  glows.push({x:x+side*6.4,y:1.93,z:z+5.17,radius:.42,color:'#f6a075',strength:warning,mode:1},{x:x+side*5.9,y:.078,z:z+5.8,radius:2.2,color:'#e7a172',strength:warning*.21,mode:0});
  if(index>=2){for(const p of parts.slice(firstPart)){const m=p.matrix;for(const k of [0,2,4,6,8,10])m[k]*=-1;m[12]=2*x-m[12];m[14]=2*z-m[14];}for(const f of [...glows.slice(firstGlow),...shadows.slice(firstShadow),...haze.slice(firstHaze)]){f.x=2*x-f.x;f.z=2*z-f.z;}}
 }
 // Independent flyovers continue above the round; an actual flight branches into the accident.
 for(let slot=0;slot<2;slot++){
  const f=DeadwatchCore.campFlybyPose(t,slot);if(!f.active||(state?.flightSlot===slot&&state.flightCycle===f.cycle))continue;
  const q=simToWorld(f.x,f.y);aircraft(q.x,f.height,q.z,f.heading,f.roll,-.045,1.25);
  glows.push({x:q.x+1.8*Math.cos(f.heading),y:.09,z:q.z,radius:1.6,color:'#dfe4bc',strength:.16,mode:0});
 }
 // Opposing emergency traffic stays on the service roads, outside the playable fence.
 for(const side of [-1,1])for(let unit=0;unit<2;unit++){
  const x=side*26.5,z=side*(-34+fract(t*.047+unit*.53+(side>0?.23:0))*68),front=side,medical=unit===0;
  const paint=medical?'#b5bdad':'#637c74',stripe=medical?'#a76451':'#b5a56b';
  box(x,.66,z,1.40,.66,2.88,paint);box(x,1.18,z-.39*front,1.38,.57,1.89,paint);
  box(x,.85,z+front*1.03,1.31,.27,.68,'#7b8d83');box(x,1.14,z+front*.79,1.22,.36,.049,'#29464c',M.GLASS);
  box(x,.45,z+front*1.46,1.39,.12,.12,'#425b54');box(x,.70,z+front*1.47,.57,.17,.025,'#253d3a');
  for(const dx of [-.71,.71]){
   box(x+dx,.87,z-.24*front,.018,.115,2.11,stripe,M.MATTE);
   box(x+dx,1.16,z+.46*front,.020,.31,.45,'#34555a',M.GLASS);
   box(x+dx*1.16,1.10,z+.76*front,.15,.11,.15,'#647c70');
   if(medical){box(x+dx*1.016,1.18,z-.42*front,.014,.37,.085,'#a76451',M.MATTE);box(x+dx*1.022,1.18,z-.42*front,.014,.10,.36,'#a76451',M.MATTE);}
   for(const dz of [-.93,.93]){add('pickupCylinder',basisModel(x+dx-.08,.28,z+dz,x+dx+.08,.28,z+dz,.27,.27),'#243630',M.RUBBER);add('pickupOrb',model(x+dx*1.12,.28,z+dz,.027,.11,.11),'#8c9a88',M.METAL);}
  }
  box(x,1.49,z+.20*front,.82,.075,.20,'#344d4c');
  for(const dx of [-.28,.28]){
   const flash=.12+.88*Math.pow(Math.max(0,Math.sin(t*8.5+unit*2+(dx>0?Math.PI:0))),10),color=dx<0?'#eb775d':'#7bacd3';
   box(x+dx,1.56,z+.20*front,.26,.105,.18,color,M.GLASS,flash);
   glows.push({x:x+dx,y:1.59,z:z+.20*front,radius:.32,color,strength:flash*.68,mode:1},{x:x+dx*2,y:.073,z,radius:2.0,color,strength:flash*.15,mode:0});
  }
  for(const dx of [-.48,.48]){box(x+dx,.78,z+front*1.47,.22,.16,.036,'#ede2bf',M.GLASS,.48);box(x+dx,.81,z-front*1.46,.17,.20,.035,'#c67552',M.GLASS,.20);}
  glows.push({x,y:.074,z:z+front*2.4,radius:1.75,color:'#e8d8b0',strength:.25,mode:0});
 }
 // Stretcher teams shuttle between triage and the holding shelter, returning empty.
 for(const side of [-1,1]){
  const cycle=fract(t/28+(side>0?.41:0)),loaded=cycle<.50,u=loaded?Math.min(1,cycle/.42):1-Math.min(1,(cycle-.50)/.42);
  const x=side*30.15,z=side*4+16.0-u*8.6,moving=cycle<.42||(cycle>.50&&cycle<.92),heading=loaded?0:Math.PI;
  const wave=moving?Math.sin(t*10)*.012:0;
  for(const dz of [-1.19,1.19])person(x,z+dz,moving?1:0,20+(side>0?1:0),{medic:true,run:.22,carry:(dz<0?1:-1)*(loaded?1:-1),heading});
  box(x,.82+wave,z,.74,.075,1.94,'#708c87');box(x,.89+wave,z,.66,.08,1.72,'#b9bca5',M.FABRIC);
  for(const dx of [-.34,.34])add('pickupCylinder',basisModel(x+dx,.83+wave,z-1.05,x+dx,.83+wave,z+1.05,.025,.025),'#a5b6a6',M.METAL);
  if(loaded){add('pickupOrb',model(x,1.01+wave,z+.05,.27,.15,.59),'#8a9c89',M.FABRIC);add('pickupOrb',model(x,1.04+wave,z-.66,.125,.12,.15),'#b1987b',M.SKIN);box(x,1.055+wave,z+.32,.48,.06,.82,'#c3c5af',M.FABRIC);}
  shadows.push({x,y:.071,z,radius:.61,color:'#142923',strength:.28,mode:0});
 }
 // A distant vehicle fire and watch-post searchlights give the perimeter its own emergency.
 for(let k=0;k<3;k++){
  const u=fract(t*1.65+k*.31),x=20.4+(k-1)*.20,z=-20.56;
  add('pickupOrb',model(x,.67+u*.62,z,.22*(1-u),.34+u*.27,.19*(1-u)),'#ecab59',M.GLASS,1.15);
  glows.push({x,y:.83,z,radius:.73,color:'#e5a056',strength:.60+.15*Math.sin(t*13+k),mode:1});
 }
 glows.push({x:20.4,y:.078,z:-20.56,radius:2.7,color:'#d79553',strength:.28,mode:0});
 for(let k=0;k<6;k++){const u=fract(t*.105+k/6);haze.push({x:20.4+u*1.85,y:.91+u*4.6,z:-20.56+u*.48,radius:.31+u*.97,color:k%2?'#647065':'#34443d',strength:.50*(1-u),mode:2+fract(t*.027+k*.19)});}
 for(const [x,z] of [[-32,-16],[32,16]]){
  const a=Math.sin(t*.24+x)*.68,tx=x-Math.sign(x)*(3.0+Math.cos(a)*1.4),tz=z+Math.sin(a)*5.0;
  glows.push({x:tx,y:.076,z:tz,radius:1.40,color:'#dbdfbc',strength:.30,mode:0});
 }
 if(state?.count){
  const c=state,p=simToWorld(c.x,c.y),age=Math.max(0,time-c.impactAt);
  if(c.phase==='falling'){
   const a=DeadwatchCore.campAircraftPose(c),q=simToWorld(a.x,a.y);
   parts.push(...campHelicopterParts(q.x,a.height,q.z,a.heading,time,1.25,a.roll,a.pitch));
   shadows.push({x:q.x,y:.085,z:q.z,radius:3.1,color:'#13271f',strength:.30,mode:0});
   // Sample earlier flight positions so the smoke trails the aircraft instead of moving as a cloud.
   for(let k=0;k<13;k++){
    const lag=k*.09,old=DeadwatchCore.campAircraftPose({...c,left:Math.min(DeadwatchCore.CAMP_AIR.fall,c.left+lag)}),v=simToWorld(old.x,old.y);
    haze.push({x:v.x-.45*Math.cos(old.heading),y:old.height+.45+k*.06,z:v.z,radius:.26+k*.065,color:'#2d3932',strength:.68*(1-k/16),mode:2+fract(k*.13+t*.015)});
   }
  }else if(c.phase==='skid'||c.phase==='wreck'){
   const a=DeadwatchCore.campAircraftPose(c),q=simToWorld(a.x,a.y),fade=c.phase==='wreck'?clamp(c.left/3,0,1):1;
   parts.push(...campHelicopterParts(q.x,a.height-(1-fade)*2.5,q.z,a.heading,time,1.25,a.roll,a.pitch,true));
   shadows.push({x:q.x,y:.061,z:q.z,radius:2.8,color:'#15241d',strength:.48,mode:0});
   const contactX=p.x-Math.cos(c.heading)*DeadwatchCore.CAMP_AIR.skid*SCALE;
   for(let k=0;k<7;k++){const u=k/6;add('coldSnow',model(lerp(contactX,q.x,u),.059,p.z,1.36,.008,1.06),'#2c3528',M.MATTE);}
   if(age<3.0)for(let k=0;k<12;k++){
    const angle=k*2.4,spread=.65+age*(.85+(k%4)*.25);
    haze.push({x:contactX+Math.cos(angle)*spread,y:.25+age*.35,z:p.z+Math.sin(angle)*spread*.7,radius:.55+age*.65,color:'#9a9b80',strength:.56*(1-age/3),mode:2+fract(k*.137)});
   }
   for(let k=0;k<14;k++){
    const dt=Math.min(age,1.4),angle=k*2.39,dx=Math.cos(angle)*(1.3+(k%4)*.7),dz=Math.sin(angle)*(1.0+(k%3)*.55),yy=Math.max(.08,.28+3.3*dt-4.9*dt*dt);
    add('box',model(contactX+dx*dt,yy,p.z+dz*dt,k%4===0?.55:.13,.03,k%4===0?.065:.09,angle+dt*3),'#505a4c',M.METAL);
    if(age<.8)glows.push({x:contactX+dx*dt*1.5,y:yy+.12,z:p.z+dz*dt*1.5,radius:.15,color:'#ffd095',strength:1.2*(1-age/.8),mode:1});
   }
   for(let k=0;k<3;k++){
    const x=q.x+(k-1)*.51,z=q.z+.18,pulse=.78+.18*Math.sin(time*13+k),rise=fract(time*1.8+k*.34);
    add('pickupOrb',model(x,1.05+rise*.40,z,.13*(1-rise),(.22+.21*rise)*fade,.12*(1-rise)),'#ffb35a',M.GLASS,1.3*fade);
    glows.push({x,y:1.15,z,radius:(.8+k*.10)*fade,color:'#ff9747',strength:1.10*pulse*fade,mode:1},{x,y:.082,z,radius:2.6,color:'#d5803f',strength:.27*fade,mode:0});
   }
   for(let k=0;k<10;k++){const u=fract(time*.16+k/10);haze.push({x:q.x+.2+u*1.4,y:1.22+u*4.0,z:q.z+u*.5,radius:.42+u*1.1,color:k%2?'#586251':'#303e32',strength:.54*(1-u)*fade,mode:2+fract(time*.023+k*.23)});}
   if(fade<1)haze.push({x:q.x,y:.75,z:q.z,radius:3.1,color:'#8c947e',strength:.48*Math.sin(fade*Math.PI),mode:2.3});
  }
  if(c.phase==='idle')add('coldSnow',model(p.x,.058,p.z,2.85,.008,1.85),'#303a2b',M.MATTE);
 }
 return{parts,glows,shadows,ribbons,haze,flash:state&&['skid','wreck'].includes(state.phase)?Math.max(0,.16-(time-state.impactAt)*.5):0,jetActive:false,weatherKind:'evacuation-airlift'};
}

// Final arena: a fortified airport apron. Scenery follows the original eight footprints.
function evacuationZonePlan(obstacles){
 const parts=[],lights=[],fixtures=[],solids=[],style=ARENA_LOOKS.evac,M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.METAL,glow=0,cast=true)=>{const p={mesh,matrix,color,material,glow,cast};parts.push(p);return p;};
 const box=(x,y,z,w,h,d,c,mat=M.METAL,a=0,cast=true)=>add('box',model(x,y,z,w/2,h/2,d/2,a),c,mat,0,cast);
 const round=(x,y,z,w,h,d,c,mat=M.METAL)=>add('pickupRoundBox',model(x,y,z,w/2,h/2,d/2),c,mat);
 const cyl=(x,y,z,r,h,c,mat=M.METAL)=>add('pickupCylinder',model(x,y,z,r,h/2,r),c,mat);
 const seg=(a,b,r,c,mat=M.METAL)=>add('pickupCylinder',basisModel(...a,...b,r,r),c,mat);
 const flat=(x,z,w,d,c,y=.028,a=0)=>box(x,y,z,w,.006,d,c,M.MATTE,a,false);
 const line=(ax,az,bx,bz,w,c,y=.032)=>flat((ax+bx)/2,(az+bz)/2,Math.hypot(bx-ax,bz-az),w,c,y,-Math.atan2(bz-az,bx-ax));
 const hash=n=>{const v=Math.sin(n*12.9898+53.7)*43758.5453;return v-Math.floor(v);};
 const steel='#748182',dark='#29383d',stone='#8a9087',olive='#626f63',paint='#c2c3a7',amber='#ddb67c',blue='#91c8dd';
 const lamp=(x,y,z,powered=true,c=amber,radius=6)=>{
  const f=fixtures.length;fixtures.push({x,y:y-.10,z,color:c,powered,phase:x*.31+z,radius,intensity:.85});
  round(x,y,z,.62,.17,.34,dark);box(x,y-.09,z,.48,.025,.25,c,M.GLASS).fixture=f;
  lights.push({x,y:.065,z,radius:2.25,color:c,strength:.18,mode:0,fixture:f});
 };
 const pole=(x,z,h=3.8,c=amber)=>{
  cyl(x,.13,z,.18,.26,dark);seg([x,.16,z],[x,h,z],.057,steel);
  seg([x,h,z],[x+.48,h,z],.044,steel);lamp(x+.48,h-.05,z,true,c,7);
 };
 const caseBox=(x,y,z,w=1.2,h=.65,d=.8)=>{
  round(x,y+h/2,z,w,h,d,olive);box(x,y+h+.025,z,w*.96,.06,d*.96,'#879084');
  for(const sx of [-1,1])box(x+sx*w*.32,y+h/2,z,.045,h+.07,d+.02,dark);
  for(const sz of [-1,1])box(x,y+h*.57,z+sz*(d/2+.012),w*.23,.055,.028,steel);
 };
 const ribs=(x,y,z,w,d)=>{for(let dx=-w/2+.3;dx<w/2;dx+=.55)box(x+dx,y,z,.036,.04,d,steel);};
 // Short tiles keep fog and material detail stable across the whole camera footprint.
 box(0,-.24,0,180,.28,150,'#374447',M.PARK_STONE,0,false);
 for(let ix=0;ix<12;ix++)for(let iz=0;iz<10;iz++)box(-48+(ix+.5)*8,-.10,-38+(iz+.5)*7.6,8,.14,7.6,'#424b4c',M.ASPHALT,0,false);
 for(let ix=0;ix<8;ix++)for(let iz=0;iz<6;iz++)box(-25.2+(ix+.5)*6.3,.002,-18.2+(iz+.5)*6.0667,6.3,.009,6.0667,style.floor,M.CONCRETE,0,false);
 // Inlaid landing pad, worn identification paint and a clear perimeter service lane.
 for(let ix=0;ix<4;ix++)for(let iz=0;iz<4;iz++)box(-5.7+(ix+.5)*2.85,.015,-5.7+(iz+.5)*2.85,2.85,.012,2.85,['#626b67','#606965','#646d69'][Math.floor(hash(ix*13+iz+710)*3)],M.CONCRETE,0,false);
 for(const offset of [-2.85,0,2.85]){flat(offset,0,.018,11.38,'#515d59',.028);flat(0,offset,11.38,.018,'#515d59',.028);}
 // Faint slab joints and rubbed paint replace the repeated checkerboard pattern.
 for(let k=0;k<11;k++){const x=-4.9+hash(k+740)*9.8,z=-4.9+hash(k+770)*9.8;if(Math.hypot(x,z)<2.3)continue;line(x,z,x+.20+hash(k+790)*.43,z+.12,.014,'#525f5a',.029);}
 for(const [cx,loops] of [[3.75,[0]],[4.62,[-.27,.27]]])for(const dz of loops){const rz=loops.length===1?.55:.27;for(let k=0;k<12;k++){const a=k*Math.PI/6,b=(k+1)*Math.PI/6;line(cx+Math.cos(a)*.25,3.6+dz+Math.sin(a)*rz,cx+Math.cos(b)*.25,3.6+dz+Math.sin(b)*rz,.065,'#a4ad9c',.053);}}
 for(let k=0;k<64;k++){
  const a=k*Math.PI/32,b=(k+1)*Math.PI/32;
  line(Math.cos(a)*4.70,Math.sin(a)*4.70,Math.cos(b)*4.70,Math.sin(b)*4.70,.13,k%9===0?'#929b8e':paint,.036);
 }
 flat(-1.05,0,.24,3.0,paint,.039);flat(1.05,0,.24,3.0,paint,.039);flat(0,0,2.16,.24,paint,.040);
 for(const x of [-7.6,7.6])for(let z=-15;z<=15;z+=2.8)flat(x,z,.09,1.30,'#b5a375');
 for(const z of [-14.6,14.6])for(let x=-22;x<=22;x+=3.1)flat(x,z,1.50,.085,'#b5a375');
 for(const x of [-20.8,20.8])for(let z=-5.3;z<=5.3;z+=.60)flat(x,z,2.1,.23,'#939d94',.027);
 for(const z of [-16.6,16.6])for(const x of [-14,-8,8,14]){
  flat(x,z,1.6,.31,dark,.025);for(let k=0;k<8;k++)flat(x-.68+k*.19,z,.055,.25,steel,.033);
 }
 for(let k=0;k<26;k++){
  const x=-23+hash(k)*46,z=-16+hash(k+40)*32;if(Math.abs(x)<5.6&&Math.abs(z)<5.6)continue;
  const a=hash(k+71)*2.2,l=.55+hash(k+98)*.85;
  line(x,z,x+Math.cos(a)*l,z+Math.sin(a)*l,.022,'#344346',.042);
  line(x+Math.cos(a)*l*.6,z+Math.sin(a)*l*.6,x+Math.cos(a+.6)*l,z+Math.sin(a+.6)*l,.016,'#3b4949',.043);
 }
 for(const x of [-10.1,10.1])for(const dx of [-.35,.35])for(let z=-13;z<14;z+=2.1)flat(x+dx,z,.11,1.62,'#3c494a',.038,.045);
 for(let k=0;k<8;k++){const a=(k+.5)*Math.PI/4,x=Math.cos(a)*5.38,z=Math.sin(a)*5.38;
  cyl(x,.042,z,.14,.05,dark);const p=cyl(x,.076,z,.07,.027,'#a3c8af',M.GLASS);p.glow=.25;
 }
 // Concrete, fitted sandbags and mounted fixtures remain inside existing colliders.
 for(const [i,o] of obstacles.entries()){
  const r=obstacleToWorld(o),{x,z,w,d}=r;solids.push({...r,h:i===4?2.05:i===5?1.88:1.0});
  if(i===4){
   box(x,.16,z,w,.32,d,dark,M.CONCRETE);round(x,1.11,z,w*.97,1.77,d*.94,olive);
   box(x,2.04,z,w,.14,d,'#899284');ribs(x,2.13,z,w-.2,d-.10);
   const f=z+d/2+.013;for(const dx of [-2.35,0,2.35]){
    box(x+dx,1.37,f,1.45,.66,.025,dark);box(x+dx,1.40,f+.016,1.26,.49,.018,'#83a9a5',M.GLASS);
    box(x+dx,1.37,f+.035,.035,.66,.025,steel);
   }
   box(x-3.1,.78,f,.65,1.43,.030,'#354947');box(x-2.88,.79,f+.028,.045,.07,.035,amber);
   box(x,1.90,f+.02,3.3,.22,.04,'#bbc1ad');for(const dx of [-.62,.62])box(x+dx,1.90,f+.048,.14,.12,.015,olive);
   round(x+2.6,2.32,z,.72,.43,1.02,dark);ribs(x+2.6,2.56,z,.60,.80);
   seg([x-2.8,2.1,z],[x-2.8,3.72,z],.029,steel);seg([x-3.2,3.25,z],[x-2.4,3.25,z],.018,steel);
   // Fitted command-post equipment lives on the existing roof and facade.
   round(x+.35,2.33,z,.95,.48,.72,'#647674');for(let k=0;k<5;k++)box(x+.02+k*.16,2.59,z,.045,.02,.57,dark);
   seg([x+.83,2.30,z],[x+1.55,2.30,z],.065,steel);seg([x+1.55,2.3,z],[x+1.55,2.10,z],.065,steel);
   box(x-2.96,1.57,f+.040,.13,.32,.05,'#cad3be');box(x-2.96,1.57,f+.071,.13,.035,.008,'#6b927c');
   for(const dx of [-2.15,2.15]){box(x+dx,.69,f+.035,.22,.46,.055,dark);box(x+dx,.69,f+.067,.14,.33,.018,'#687c71');}
   // Handrails and rain channels add depth without extending into a walking lane.
   for(const side of [-1,1]){seg([x-3.35,2.15,z+side*d*.35],[x+3.35,2.15,z+side*d*.35],.025,steel);for(const dx of [-3.35,0,3.35])seg([x+dx,2.06,z+side*d*.35],[x+dx,2.25,z+side*d*.35],.024,steel);}
   for(const dx of [-3.6,3.6])seg([x+dx,1.86,f+.055],[x+dx,.32,f+.055],.035,'#596c69');
   lamp(x,2.16,f,true,'#edc792',7);continue;
  }
  if(i===5){
   // Low airport rescue truck; rounded cabin, separate wheel arches and equipment lockers.
   box(x,.46,z,w*.93,.22,d*.85,dark);round(x-.8,1.15,z,w*.65,1.15,d*.90,'#7e6452');
   round(x+w*.32,1.02,z,w*.27,1.25,d*.92,'#98735a');box(x+w*.32,1.70,z,w*.28,.13,d*.96,'#b3977b');
   for(const side of [-1,1]){
    box(x+w*.32,1.31,z+side*d*.464,w*.19,.39,.019,'#354d55',M.GLASS);
    for(const dx of [-2.4,0]){box(x+dx,1.17,z+side*d*.455,1.85,.68,.025,'#a7a99a');for(let j=0;j<5;j++)box(x+dx,.91+j*.12,z+side*d*.474,1.71,.024,.018,'#727d76');}
    box(x-.5,.75,z+side*d*.47,w*.76,.10,.025,paint);
    for(const dx of [-w*.31,w*.31]){seg([x+dx,.40,z+side*d*.30],[x+dx,.40,z+side*d*.49],.36,'#242e30',M.RUBBER);seg([x+dx,.40,z+side*d*.49],[x+dx,.40,z+side*d*.50],.16,steel);}
    box(x+w*.463,1.03,z+side*d*.30,.02,.16,.21,'#e2c99d',M.GLASS).glow=.24;
   }
   box(x+w*.473,.72,z,.07,.19,d*.88,steel);box(x+w*.472,1.02,z,.018,.22,d*.31,dark);
   // Roof ladder, split windscreen, steps and a wound rescue hose.
   for(const dx of [.22,1.14])box(x+dx,1.78,z,.08,.12,.48,dark);
   for(const dz of [-.20,.20])seg([x+.12,1.85,z+dz],[x+1.28,1.85,z+dz],.030,steel);
   for(let k=0;k<5;k++)seg([x+.20+k*.25,1.85,z-.20],[x+.20+k*.25,1.85,z+.20],.024,steel);
   box(x+w*.477,1.36,z,.019,.42,d*.72,'#354d55',M.GLASS);box(x+w*.49,1.36,z,.024,.45,.044,steel);
   for(const side of [-1,1]){box(x+w*.34,.46,z+side*d*.47,.62,.08,.12,steel);box(x+w*.39,1.14,z+side*d*.478,.16,.028,.022,paint);}
   const hx=x-.10,hy=1.16,hz=z+d*.478;
   for(let k=0;k<14;k++){const a=k*Math.PI/7,b=(k+1)*Math.PI/7;seg([hx+Math.cos(a)*.23,hy+Math.sin(a)*.23,hz],[hx+Math.cos(b)*.23,hy+Math.sin(b)*.23,hz],.038,'#424e46',M.RUBBER);}
   caseBox(x-1.1,1.76,z,2.1,.21,d*.67);lamp(x+2.5,1.91,z,false,'#ec9a65',5);continue;
  }
  const long=w>d,length=long?w:d,steps=Math.max(2,Math.floor(length/.9));
  box(x,.19,z,w,.38,d,'#707e77',M.CONCRETE);box(x,.65,z,w*.97,.60,d*.82,stone,M.CONCRETE);
  box(x,.98,z,w*.94,.08,d*.64,'#a0a595',M.CONCRETE);
  for(let k=0;k<steps;k++){
   const s=-length*.43+(k+.5)*length*.86/steps,bx=x+(long?s:0),bz=z+(long?0:s);
   add('pickupOrb',model(bx,1.10,bz,long?.43:w*.28,.15,long?d*.27:.43),k%3?'#858c70':'#747f66',M.FABRIC);
   if(k%2===0){
    box(bx,.55,bz+(long?d*.42:0),long?.32:w*.86,.14,long?.022:.28,'#b6ac82');
    seg([bx-(long?.28:0),1.245,bz-(long?0:.28)],[bx+(long?.28:0),1.245,bz+(long?0:.28)],.008,'#646d56',M.FABRIC);
    box(bx,.27,bz+(long?d*.505:0),long?.12:w*.86,.033,long?.008:.12,'#58665e',M.CONCRETE);
   }
  }
  for(const side of [-1,1]){const px=x+(long?side*w*.36:0),pz=z+(long?0:side*d*.33);seg([px,1.02,pz],[px,2.23,pz],.03,steel);lamp(px,2.25,pz,true,blue,4.8);}
  if(i<2)caseBox(x,1.23,z,1.15,.40,Math.min(d*.55,.85));
 }
 // Interrupted perimeter fences preserve all four broad zombie entrances.
 const fence=(ax,az,bx,bz)=>{
  const length=Math.hypot(bx-ax,bz-az),n=Math.ceil(length/2.4);
  for(let i=0;i<=n;i++){const t=i/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;seg([x,0,z],[x,1.85,z],.034,steel);}
  for(const y of [.35,1.38,1.79])seg([ax,y,az],[bx,y,bz],.014,'#657577');
  for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n;seg([ax+(bx-ax)*a,.38,az+(bz-az)*a],[ax+(bx-ax)*b,1.38,az+(bz-az)*b],.008,'#53666a');seg([ax+(bx-ax)*a,1.38,az+(bz-az)*a],[ax+(bx-ax)*b,.38,az+(bz-az)*b],.008,'#53666a');}
 };
 for(const side of [-1,1]){
  fence(-24.8,side*18.55,-4.3,side*18.55);fence(4.3,side*18.55,24.8,side*18.55);
  fence(side*25.5,-18.55,side*25.5,-4.4);fence(side*25.5,4.4,side*25.5,18.55);
  for(const x of [-19.8,19.8])pole(x,side*19.8,4.3,side<0?blue:amber);
  for(const x of [-4.1,4.1]){box(x,.42,side*18.9,.35,.84,.36,stone,M.CONCRETE);box(x,.77,side*18.9,.39,.10,.40,amber);}
 }
 // Service roads and taxiway continue into the backdrop instead of ending at a void.
 for(let x=-42;x<=42;x+=7){box(x,-.012,-31.4,7,.018,6.0,'#39474b',M.ASPHALT,0,false);flat(x,-31.4,2.5,.12,paint,.016);}
 for(const z of [-34.1,-28.7])for(let x=-39;x<=39;x+=3.6){cyl(x,.08,z,.10,.13,dark);cyl(x,.16,z,.047,.04,blue,M.GLASS).glow=.52;}
 for(const side of [-1,1])for(let z=-34;z<35;z+=7){box(side*33.2,-.008,z,4.7,.012,7,'#39474b',M.ASPHALT,0,false);flat(side*33.2,z,.10,2.1,paint,.013);}
 // Rear terminal: recessed doors, glazing, loading canopies and roof equipment.
 const building=(x,z,w,d,h,c)=>{
  box(x,.17,z,w+.2,.34,d+.2,'#36474b',M.CONCRETE);box(x,h/2+.25,z,w,h,d,c,M.CONCRETE);
  box(x,h+.32,z,w+.2,.16,d+.2,'#6d7a7b');ribs(x,h+.43,z,w,d);
  for(const sx of [-1,1])box(x+sx*w*.47,h*.55,z,.12,h*.92,d+.04,steel);
 };
 building(-9,-24.6,18,6.1,3.0,'#687b7d');
 for(let x=-16.3;x<-1;x+=2.5){box(x,1.91,-21.52,1.99,1.25,.04,dark);box(x,1.94,-21.48,1.77,1.04,.019,'#638996',M.GLASS);box(x,1.90,-21.45,.07,1.26,.05,steel);}
 box(-9,2.83,-20.92,18,.16,1.46,'#899890');for(const x of [-17,-9,-1])seg([x,.1,-20.35],[x,2.78,-20.35],.075,steel);
 for(const x of [-13,-5]){box(x,1.04,-21.51,1.30,1.9,.06,'#34494d');lamp(x,2.66,-21.0,false,amber,6);}
 for(const x of [-14,-5]){round(x,3.92,-24.6,2.5,1.0,2.1,'#83918d');ribs(x,4.46,-24.6,2.2,1.8);}
 // Hangar opening has a dark back wall and separate sliding leaves, rather than transparent walls.
 building(16.8,-25.6,14.6,7.5,4.2,'#687980');
 box(16.8,2.03,-21.815,10.4,3.50,.055,'#223438');box(16.8,.025,-20.9,10.4,.018,2.8,'#6c7b76',M.CONCRETE,0,false);
 for(const side of [-1,1]){box(16.8+side*4.8,2.05,-21.73,1.10,3.45,.14,'#9aa59b');for(let y=.48;y<3.7;y+=.39)box(16.8+side*4.8,y,-21.645,1.04,.028,.025,steel);}
 for(const x of [11.4,22.2])lamp(x,4.15,-21.54,false,blue,7);
 caseBox(13.2,.04,-21.4,1.9,1.2,1.3);caseBox(14.1,1.26,-21.4,1.0,.65,.9);
 // Control tower sits beyond the west fence; its silhouette cannot cover the playing lanes.
 building(-28.7,-11.0,3.8,4.2,4.7,'#6d7d7b');
 box(-28.7,5.34,-11,5.5,1.48,5.5,dark);box(-28.7,5.46,-8.22,5.14,.94,.045,'#78a1aa',M.GLASS);
 for(const side of [-1,1])box(-28.7+side*2.77,5.46,-11,.045,.94,5.12,'#63858e',M.GLASS);
 box(-28.7,6.17,-11,5.92,.20,5.94,'#a1aba0');for(const dx of [-1.72,0,1.72])box(-28.7+dx,5.45,-8.17,.065,1.04,.07,steel);
 cyl(-28.7,6.70,-11,.13,1.0,steel);lamp(-28.7,4.53,-8.6,false,amber,8);
 // Close service apron: cargo dollies, baggage cases and utilities outside the fence.
 for(const side of [-1,1]){
  building(side*17,22.8,10.4,5.7,1.6,'#526665');
  for(let k=0;k<3;k++){const x=side*(9.2+k*2.5),z=19.3;box(x,.32,z,2.0,.17,1.2,steel);for(const dx of [-.64,.64])for(const dz of [-.53,.53])seg([x+dx,.22,z+dz-.045],[x+dx,.22,z+dz+.045],.20,dark,M.RUBBER);caseBox(x,.41,z,1.8,.80,1.04);}
  for(const z of [-10,10]){caseBox(side*27.3,.02,z,1.3,1.0,2.0);pole(side*27.2,z+1.8,3.2,blue);}
 }
 // Rescue staging is confined to existing barriers and the perimeter apron.
 for(const side of [-1,1]){
  const x=side*27.8,z=7.4;
  round(x,.78,z,2.35,1.38,4.9,'#a0aaa0');round(x,1.65,z-.42,2.18,.56,3.2,'#bbc1ae');
  box(x,1.24,z+2.13,1.94,.61,.05,'#2b4851',M.GLASS);box(x,1.63,z+1.88,2.18,.09,.55,steel);
  for(const dx of [-1.17,1.17]){
   box(x+dx,1.12,z-.3,.026,.16,.68,'#ad715a');box(x+dx,1.12,z-.3,.028,.62,.16,'#ad715a');
   for(const dz of [-1.52,1.46]){seg([x+dx-.12,.4,z+dz],[x+dx+.12,.4,z+dz],.39,dark,M.RUBBER);seg([x+dx-.13,.4,z+dz],[x+dx+.13,.4,z+dz],.17,steel);}
  }
  for(const dx of [-.74,.74]){box(x+dx,.78,z+2.47,.42,.22,.04,'#d7c59a',M.GLASS);lamp(x+dx,1.99,z+.65,false,dx<0?'#b97760':blue,3);}
  for(let k=0;k<3;k++){caseBox(side*(26.1+k*.60),0,12.0+k*.55,.75,.42,.55);}
  // Recessed service hatch, tied-down cargo and wheel marks beside the hangars.
  flat(side*20.2,-22.0,2.4,1.4,dark,.041);for(let k=0;k<7;k++)flat(side*20.2,-22.55+k*.18,2.15,.04,steel,.05);
  caseBox(side*22.4,0,-23.1,1.6,.85,1.2);caseBox(side*22.4,.85,-23.1,1.3,.62,.95);
 }
 // Pad approach chevrons, skid wear and inset tie-down rings, all below foot level.
 for(const side of [-1,1]){
  for(let k=0;k<4;k++){const z=side*(2.25+k*.58);line(-.92,z,-.65,z-side*.21,.055,'#b8c8ad',.055);line(-.65,z-side*.21,-.38,z,.055,'#b8c8ad',.055);}
  for(let k=0;k<3;k++)flat(-.2+k*.12,side*1.28,3.1,.035,'#39474a',.049,.012*k);
 }
 for(let k=0;k<6;k++){const a=k*Math.PI/3,x=Math.cos(a)*4.35,z=Math.sin(a)*4.35;
  cyl(x,.055,z,.12,.03,dark);for(let i=0;i<8;i++){const a=i*Math.PI/4,b=(i+1)*Math.PI/4;seg([x+Math.cos(a)*.072,.076,z+Math.sin(a)*.072],[x+Math.cos(b)*.072,.076,z+Math.sin(b)*.072],.012,steel);}
 }
 // Weathered apron patches add surface variation without transparent overlapping ground.
 for(let k=0;k<16;k++){const x=-22+hash(k+311)*44,z=-15+hash(k+341)*30;if(Math.abs(x)<6&&Math.abs(z)<6)continue;flat(x,z,.5+hash(k+381)*1.9,.16+hash(k+401)*.45,k%2?'#465253':'#424f50',.046,hash(k+421)*3);}
 // A continuous working airport surrounds the playable fence. These are visual-only props.
 const backdropStart=parts.length;
 for(let x=-38;x<=38;x+=4){box(x,-.007,30.8,4,.012,4.7,'#39474b',M.ASPHALT,0,false);flat(x,30.8,1.8,.10,paint,.015);}
 for(const side of [-1,1]){
  // Gravel verges and curbs connect the corner lots to the existing service road.
  for(let z=-32;z<=32;z+=4){box(side*37.0,-.021,z,2.4,.03,4,'#51594d',M.PARK_STONE,0,false);box(side*30.7,.09,z,.16,.18,3.86,'#829086',M.CONCRETE);}
  for(const z of [-21,21]){
   const x=side*27.8;box(x,.04,z,5.7,.065,6.6,'#56615b',M.CONCRETE,0,false);
   // Ribbed cargo containers, latch bars, corner castings and stacked freight.
   round(x,1.15,z,4.2,2.25,5.4,side*z>0?'#6c7666':'#647d80');box(x,2.29,z,4.28,.10,5.48,'#929c8e');
   for(const edge of [-1,1]){for(let k=0;k<9;k++)box(x+edge*2.11,1.2,z-2.30+k*.57,.035,2.04,.065,'#8a9689');box(x+edge*1.03,1.12,z+2.72,1.94,2.06,.040,'#798c83');seg([x+edge*.88,.25,z+2.76],[x+edge*.88,2.07,z+2.76],.025,steel);}
   for(const dx of [-2.04,2.04])for(const dz of [-2.62,2.62])box(x+dx,.11,z+dz,.15,.19,.15,dark);
   for(const dx of [-1.17,1.17])flat(x+dx,z+3.13,.18,.43,'#b3a880',.081);
   caseBox(x+side*.7,2.34,z-.55,1.8,.55,1.4);lamp(x,2.52,z+2.3,false,amber,5.4);
  }
  // Low perimeter workshops carry the backdrop to the fog, with recognisable doors and roofs.
  for(const z of [-21,-3,16]){
   const x=side*41.2;building(x,z,9.0,11.4,3.4+(z===-3?.7:0),'#536a6e');
   const face=x-side*4.54;
   for(const dz of [-3.45,2.30]){box(face,1.18,z+dz,.05,2.1,3.1,dark);for(let k=0;k<5;k++)box(face-side*.036,.38+k*.39,z+dz,.02,.07,2.85,'#819389');}
   round(x,4.35,z,2.6,.75,2.3,'#718b81');for(let k=0;k<4;k++)box(x-.91+k*.6,4.76,z,.09,.05,1.94,dark);
   lamp(face-side*.30,3.45,z,false,blue,7);
  }
  // Beyond the rear taxiway: terminal service wings, not an exposed flat board.
  building(side*17.5,-41.2,23.4,10.2,4.4,'#52666b');
  for(let k=0;k<5;k++)box(side*17.5-8.8+k*4.4,2.9,-36.03,2.85,1.1,.025,'#8ca49a',M.GLASS);
  for(const x of [side*27.5,side*7.5])pole(x,-35.7,4.7,blue);
 }
 // Triage cabin links the terminal to a lit pedestrian route outside the north fence.
 building(-21.5,-22.2,4.8,4.4,2.20,'#89998f');
 box(-21.5,1.02,-19.955,1.18,1.94,.038,'#263f42');box(-20.0,1.22,-19.94,.58,.19,.03,'#b8c2a8');box(-20.0,1.22,-19.92,.19,.60,.035,'#b8c2a8');lamp(-21.5,2.40,-19.78,false,amber,6);
 for(let x=-22.3;x<-11.9;x+=1.2){flat(x,-19.35,.48,.055,'#a9b7a6',.034);}
 // Equipment bays fill the exposed side strips without putting anything in the entrances.
 for(const side of [-1,1]){
  const x=side*28.3,z=15.1;
  for(const dx of [-.58,.58]){cyl(x+dx,.85,z,.47,1.55,'#86998e');cyl(x+dx,1.64,z,.50,.08,steel);seg([x+dx,1.71,z],[x+dx,1.96,z],.065,dark);}
  seg([x-.58,.32,z],[x+.58,.32,z],.075,'#9b9c80');round(x, .43,z+1.38,1.7,.74,.90,'#63766b');for(let k=0;k<6;k++)box(x-.62+k*.25,.51,z+1.84,.07,.48,.03,dark);
  for(let k=0;k<4;k++){const xx=side*(26.2+k*.37);caseBox(xx,.02,-16.8,.58,.36,.70);}
  // Painted parking bays and drain channels break up the remaining edge concrete.
  for(const zz of [-6.2,14.0]){flat(side*28.2,zz,3.5,.055,'#9ea88f',.045);flat(side*30.0,zz+1.2,.055,2.4,'#9ea88f',.045);}
 }
 for(let i=backdropStart;i<parts.length;i++)parts[i].evacBackdrop=true;
 // Windsock pole outside the playable fence; cloth is animated with the airport radar.
 cyl(26.7,.14,-15,.27,.28,dark);seg([26.7,.25,-15],[26.7,5.3,-15],.055,steel);
 return{parts,lights,fixtures,solids,style};
}
function evacuationAircraftPose(state){
 const taking=['takeoff','complete'].includes(state?.phase),elapsed=state?.takeoff||0,lift=Math.max(0,elapsed-1.1),travel=Math.max(0,elapsed-3.0);
 return{taking,elapsed,lift,x:travel*travel*1.8,y:1.47+lift*lift*.48,z:-travel*travel*.48,pitch:taking?Math.min(.12,travel*.05):0};
}
function evacuationLightState(environment,game){
 const e=game.evac;if(!e||e.phase==='failed'||e.phase==='complete')return environment;
 const pose=evacuationAircraftPose(e),p=simToWorld(game.player.x,game.player.y);
 if(Math.hypot(p.x-pose.x,p.z-pose.z)>13)return environment;
 const open=e.door||0,side=p.z<pose.z?-1:1,color=e.hp<e.maxHp*.3?'#d8b082':'#e0d8b3';
 // Reserve the third light; the fourth remains available to the weapon flash.
 environment.positions.set([pose.x-.50,pose.y+.10,pose.z+side*(.75+open*.40),7.4+open],8);
 environment.colors.set(hex(color).map(c=>c*(.75+open*.30)),6);return environment;
}
// Deterministic exterior activity uses the run clock, never input or combat randomness.
function evacuationTrafficPose(distance){
 const radius=3.4,arc=radius*Math.PI/2,horizontal=59.6,vertical=55.4,total=2*(horizontal+vertical)+4*arc;
 let d=((distance%total)+total)%total;
 const line=(x,z,heading,length)=>{if(d<=length)return{x:x+Math.cos(heading)*d,z:z+Math.sin(heading)*d,heading};d-=length;return null;};
 const turn=(x,z,angle)=>{if(d<=arc){const a=angle+d/radius;return{x:x+Math.cos(a)*radius,z:z+Math.sin(a)*radius,heading:a+Math.PI/2};}d-=arc;return null;};
 return line(-29.8,-31.4,0,horizontal)||turn(29.8,-28,-Math.PI/2)||line(33.2,-28,Math.PI/2,vertical)||turn(29.8,27.4,0)||line(29.8,30.8,Math.PI,horizontal)||turn(-29.8,27.4,Math.PI/2)||line(-33.2,27.4,-Math.PI/2,vertical)||turn(-29.8,-28,Math.PI)||{x:-29.8,z:-31.4,heading:0};
}
function evacuationActivityPlan(time){
 const t=Math.max(0,Number(time)||0),parts=[],glows=[],shadows=[],ribbons=[],haze=[],actors=[],M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.METAL,glow=0)=>parts.push({mesh,matrix,color,material,glow,evacBackground:true});
 const vehicle=(pose,kind,id)=>{
  const {x,z,heading}=pose,ca=Math.cos(heading),sa=Math.sin(heading),first=parts.length,cart=kind==='cart',van=kind==='van';
  const pt=(f,y,s)=>[x+f*ca-s*sa,y,z+f*sa+s*ca];
  const box=(f,y,s,w,h,d,color,mat=M.METAL,glow=0)=>{const q=pt(f,y,s);add('pickupRoundBox',model(...q,w/2,h/2,d/2,-heading),color,mat,glow);};
  const tube=(a,b,r,color,mat=M.METAL)=>add('pickupCylinder',basisModel(...pt(...a),...pt(...b),r,r),color,mat);
  box(0,.43,0,cart?2.15:van?3.15:2.8,.24,1.58,'#35494b');
  for(const f of cart?[-.72,.72]:[-.88,.88])for(const side of [-1,1]){tube([f,.28,side*.62],[f,.28,side*.84],.29,'#263934',M.RUBBER);tube([f,.28,side*.845],[f,.28,side*.86],.12,'#8a9c93');}
  if(cart){
   box(0,.69,0,1.87,.28,1.42,'#718880');box(0,1.18,0,1.62,.70,1.20,'#a3ac94',M.FABRIC);for(const f of [-.50,.50])box(f,1.19,0,.052,.73,1.23,'#4c6258');
  }else{
   box(van?-.24:.40,.93,0,van?2.57:1.78,van?1.1:.67,1.50,van?'#9caea2':'#8b906c');
   box(van?.64:-.53,1.50,0,van?1.08:.9,.79,1.44,'#6f8882');box(van?.73:-.17,1.58,0,.026,.41,1.25,'#34545c',M.GLASS);
   for(const side of [-1,1]){box(van?.55:-.53,1.59,side*.73,.65,.40,.018,'#35545b',M.GLASS);box(1.40,.87,side*.52,.025,.16,.25,'#ded3ae',M.GLASS,.36);}
   box(van?.40:-.54,1.97,0,.37,.085,.86,'#365053');
   const blink=.18+.55*Math.pow(Math.max(0,Math.sin(t*(van?5.3:3.8)+id)),8);box(van?.40:-.54,2.055,0,.27,.075,.56,van?'#a4c5df':'#dcc68c',M.GLASS,blink);
   if(van)for(const side of [-1,1]){box(-.70,1.14,side*.757,.54,.12,.018,'#b78769');box(-.70,1.14,side*.760,.13,.51,.018,'#b78769');}
   const head=pt(2.8,.065,0);glows.push({x:head[0],y:head[1],z:head[2],radius:1.0,color:'#cabd91',strength:.12,mode:0});
  }
  for(let i=first;i<parts.length;i++)parts[i].backgroundId=id;
  shadows.push({x,y:.058,z,radius:cart?1.2:1.5,color:'#152723',strength:.27,mode:0});actors.push({id,kind,x,z,heading});
 };
 const lead=90+t*2.05;
 vehicle(evacuationTrafficPose(lead),'tug',1);for(let k=1;k<=2;k++){
  const front=evacuationTrafficPose(lead-(k-1)*3.45),trailer=evacuationTrafficPose(lead-k*3.45);vehicle(trailer,'cart',k+1);
  add('pickupCylinder',basisModel(front.x-Math.cos(front.heading)*1.24,.42,front.z-Math.sin(front.heading)*1.24,trailer.x+Math.cos(trailer.heading)*1.10,.42,trailer.z+Math.sin(trailer.heading)*1.10,.030,.030),'#889b8b');
 }
 vehicle(evacuationTrafficPose(210+t*2.8),'van',4);
 const person=(x,z,walking,id,opts={})=>{const first=parts.length;appendAirfieldPerson(parts,glows,shadows,t,x,z,walking,id,opts);for(let i=first;i<parts.length;i++){parts[i].evacBackground=true;parts[i].backgroundId=id;}actors.push({id,kind:opts.crew?'crew':opts.medic?'medic':'civilian',x,z});};
 // Small groups move from the triage cabin into the terminal. Ends are hidden behind door facades.
 for(let i=0;i<4;i++){
  const phase=(t+i*4.6)%18.4,d=phase*1.35;let x,z,heading;
  if(d>12.5)continue;
  if(d<1.85){x=-21.5;z=-21.2+d;heading=Math.PI/2;}
  else if(d<10.35){x=-21.5+d-1.85;z=-19.35;heading=0;}
  else{x=-13;z=-19.35-(d-10.35);heading=-Math.PI/2;}
  person(x,z,1,10+i,{run:.35,heading:heading+Math.PI/2});
 }
 person(30.4,-2.6,0,20,{crew:true,heading:Math.PI/2});person(-30.4,1.8,0,21,{crew:true,heading:-Math.PI/2});
 // Medics carry supply cases between the ambulance and its equipment bay, pausing at each end.
 for(const side of [-1,1]){
  const phase=(t+(side>0?5:0))%20,walking=phase<8||phase>=10&&phase<18,u=phase<8?phase/8:phase<10?1:phase<18?1-(phase-10)/8:0;
  const x=side*30,z=3.0+u*9.0,heading=phase<10?Math.PI/2:-Math.PI/2;
  person(x,z,walking,side>0?22:23,{medic:true,run:.1,carry:-1,heading:heading+Math.PI/2});
  add('pickupRoundBox',model(x+Math.cos(heading)*.28,.84,z+Math.sin(heading)*.28,.20,.13,.15,-heading),'#b9c0a3',M.FABRIC);
 }
 // A distant rescue flight stays beyond the fence and has no gameplay collision or drops.
 const flight=(t+9)%52;if(flight<27){
  const x=-48+flight*3.55,z=-26.8,height=5.1+.25*Math.sin(flight*.13),first=parts.length;
  parts.push(...campHelicopterParts(x,height,z,0,t,1.12,0,-.025,false,0));for(let i=first;i<parts.length;i++)parts[i].evacBackground=true;
  shadows.push({x,y:.05,z,radius:2.8,color:'#172a27',strength:.13,mode:0});actors.push({id:30,kind:'aircraft',x,z});
 }
 for(let i=0;i<3;i++){const u=(t*.13+i/3)%1;haze.push({x:28.3+u*.38,y:.91+u*1.5,z:16.48+u*.2,radius:.13+u*.28,color:'#92a394',strength:Math.sin(u*Math.PI)*.075,mode:2+(t*.03+i*.27)%1});}
 return{parts,glows,shadows,ribbons,haze,actors};
}
function evacuationAtmospherePlan(time,state){
 const parts=[],glows=[],shadows=[],ribbons=[],haze=[],M=MATERIAL_IDS,t=Math.max(0,Number(time)||0),angle=t*.32;
 // A slow airport radar and sequenced runway lights are anchored to the world.
 const ca=Math.cos(angle),sa=Math.sin(angle),cx=-28.7,cy=7.18,cz=-11;
 const radar=(x,y,z,w,h,d,c)=>parts.push({mesh:'box',matrix:model(cx+x*ca+z*sa,cy+y,cz-x*sa+z*ca,w/2,h/2,d/2,angle),color:c,material:M.METAL,glow:0});
 radar(0,0,0,2.6,.48,.13,'#9caeaa');for(const x of [-1,-.5,0,.5,1])radar(x,0,-.13,.045,.62,.04,'#465d64');
 radar(0,-.22,0,.16,.60,.20,'#a7b4a4');
 for(const side of [-1,1])for(let k=0;k<7;k++){
  const pulse=Math.pow(Math.max(0,Math.sin(t*2.8-k*.78)),12),x=-18+k*6,z=side<0?-34.1:-28.7;
  if(pulse>.04)glows.push({x,y:.06,z,radius:.31,color:'#bddbdf',strength:pulse*.25,mode:0});
 }
 const beacon=.18+.35*Math.pow(Math.max(0,Math.sin(t*2.4)),8);
 parts.push({mesh:'pickupOrb',matrix:model(-28.7,7.70,-11,.10,.12,.10),color:'#e49b77',material:M.GLASS,glow:beacon});
 // Segmented cloth has a soft taper and a world-anchored breeze.
 for(let i=0;i<6;i++){const z=-15+Math.sin(t*1.3-i*.5)*.07*i,r=.18-i*.022;
  parts.push({mesh:'pickupCylinder',matrix:basisModel(26.7+i*.22,5.14-i*.045,z,26.92+i*.22,5.095-i*.045,z,r,r),color:i%2?'#c9c2a6':'#bb805b',material:M.FABRIC,glow:0});
 }
 if(state){
  const {taking,elapsed,lift,x,y,z,pitch}=evacuationAircraftPose(state);
  const damaged=state.hp<state.maxHp*.3,failed=state.phase==='failed',ready=['reward','boarding'].includes(state.phase),color=failed?'#ee694e':ready?'#97e9b6':damaged?'#f39a69':'#dbcf9c';
  parts.push(...campHelicopterParts(x,y,z,0,failed?.016:t*(taking?1:.45),1.7,0,pitch,failed,state.door||0));
  // Map-specific fittings keep the pickup/crash helicopter models unchanged.
  const ca=Math.cos(pitch),sa=Math.sin(pitch),fit=(mesh,matrix,color,material=M.METAL,glow=0)=>{
   for(const k of [0,4,8]){const xx=matrix[k],yy=matrix[k+1];matrix[k]=xx*ca-yy*sa;matrix[k+1]=xx*sa+yy*ca;}
   const xx=matrix[12],yy=matrix[13];matrix[12]=x+xx*ca-yy*sa;matrix[13]=y+xx*sa+yy*ca;matrix[14]+=z;
   parts.push({mesh,matrix,color,material,glow,evacFitting:true});
  };
  const fitting=(a,b,c,w,h,d,color,material=M.METAL,glow=0)=>fit('pickupRoundBox',model(a,b,c,w/2,h/2,d/2),color,material,glow);
  const tube=(a,b,r,color,material=M.METAL)=>fit('pickupCylinder',basisModel(...a,...b,r,r),color,material);
  if(!failed){
   // Belly searchlight and its mount; warm cabin light spills onto the boarding threshold.
   fitting(1.85,-.58,0,.38,.26,.38,'#344846');tube([1.82,-.43,0],[1.82,-.27,0],.055,'#7f9185');
   fit('pickupOrb',model(1.97,-.63,0,.10,.06,.14),'#e5dbb9',M.GLASS,.48);
   if(!taking)glows.push({x:3.2,y:.068,z:0,radius:1.48,color:'#d3c9a2',strength:.09,mode:0});
   for(const side of [-1,1]){
    tube([-.98,-.48,side*1.15],[.00,-.48,side*1.15],.019,'#a1b2a0');
    for(const f of [-.96,-.12])tube([f,-.38,side*1.15],[f,.45,side*1.15],.015,'#889e8b');
    if((state.door||0)>.48){
     // Thin recessed seat backs and belts stay inside each exposed cabin aperture.
     for(const f of [-.90,-.41]){
      fitting(f,-.05,side*1.094,.31,.46,.020,'#788277',M.FABRIC);
      fitting(f,-.23,side*1.118,.34,.085,.055,'#56685b',M.FABRIC);
      tube([f-.11,.16,side*1.114],[f+.10,-.20,side*1.114],.013,'#c0b898',M.FABRIC);
     }
     fitting(-.48,.49,side*1.11,.62,.032,.037,'#e5dfb1',M.GLASS,.36);
     glows.push({x:x-.49,y:.067,z:z+side*1.9,radius:1.2,color:'#d9d5af',strength:.13*(state.door||0),mode:0});
    }
   }
  }
  for(const p of parts){if(p.heliRole==='nav')p.glow=.22+.18*Math.pow(Math.max(0,Math.sin(t*4.7)),8);if(state.flash>0&&p.heliRole==='hull'){p.color='#a9987c';p.glow=.12;}}
  shadows.push({x,y:.065,z,radius:3.25+lift*.10,color:'#112024',strength:Math.max(.1,.5-lift*.05),mode:0});
  const rotor=.12+(taking?.16:0);
  glows.push({x:x-.17,y:y+1.48,z,radius:4.26,color:'#b9c9bb',strength:rotor,mode:-2-((t*(taking?6.2:2.8))%1)});
  glows.push({x:x-.3,y:y+.9,z,radius:.20,color:'#ec8d70',strength:Math.pow(Math.max(0,Math.sin(t*5.3)),10)*.65,mode:1});
  if(!taking)for(const side of [-1,1]){
   glows.push({x:-.49,y:.072,z:side*2.1,radius:.77,color,strength:.24+.08*Math.sin(t*3.0),mode:-.07});
   parts.push({mesh:'pickupRoundBox',matrix:model(-.49,.12,side*1.68,.32,.03,.16),color,material:M.GLASS,glow:.30});
   if(ready)for(let k=0;k<3;k++){const light=.12+.26*Math.pow(Math.max(0,Math.sin(t*3.5+k*.8)),6);parts.push({mesh:'box',matrix:model(-.49,.055,side*(2.45+k*.60),.20,.006,.019),color:'#a5cfae',material:M.GLASS,glow:light});}
  }
  if(taking&&elapsed<5.8)for(let i=0;i<14;i++){
   const u=(t*.72+i/14)%1,a=i*2.399+t*.13,r=1.7+u*4.6;
   haze.push({x:Math.cos(a)*r,y:.09+u*.27,z:Math.sin(a)*r,radius:.32+u*.40,color:'#a2ab9c',strength:(1-u)*.065,mode:2+(t*.03+i*.17)%1});
  }
  if(damaged||failed)for(let i=0;i<4;i++){const u=(t*.4+i/4)%1;haze.push({x:x-.5+u*.4,y:y+.8+u*2.1,z:z+.08,radius:.18+u*.35,color:'#6d756c',strength:(1-u)*.15,mode:2+(t*.035+i*.21)%1});}
 }
 const background=evacuationActivityPlan(t);parts.push(...background.parts);glows.push(...background.glows);shadows.push(...background.shadows);haze.push(...background.haze);
 return{parts,glows,shadows,ribbons,haze,flash:0,jetActive:false,weatherKind:'airfield',ambientActors:background.actors};
}

function arenaPolishPlan(id,obstacles){
 if(id==='evac')return evacuationZonePlan(obstacles);
 if(id==='quarantine'){const plan={parts:[],lights:[],solids:[],style:ARENA_LOOKS.quarantine,fixtures:[]};quarantineCampDetails(plan,obstacles.filter(o=>!o.campWreck));return plan;}
 if(id==='rail')return railCrossingPlan(obstacles);
 if(id==='cold')return coldStoragePlan(obstacles);
 if(id==='pump')return pumpStationPlan(obstacles);
 if(id==='memorial')return memorialParkPlan(obstacles);
 obstacles=obstacles.filter(o=>!o.walkwayRail);
 const style=ARENA_LOOKS[id];if(!style)return {parts:[],lights:[],solids:[]};
 const parts=[],lights=[],solids=[],M=MATERIAL_IDS;
 const add=(mesh,matrix,color,material=M.METAL,glow=0)=>parts.push({mesh,matrix,color,material,glow});
 const box=(x,y,z,w,h,d,color,angle=0,material=M.METAL,glow=0)=>add('box',model(x,y,z,w/2,h/2,d/2,angle),color,material,glow);
 const oval=(x,y,z,w,h,d,color,material=M.METAL,glow=0)=>add('pickupOrb',model(x,y,z,w,h,d),color,material,glow);
 const cylinder=(x,y,z,r,h,color,rz=r)=>add('pickupCylinder',model(x,y,z,r,h/2,rz),color);
 const seg=(a,b,r,color,material=M.METAL)=>add('pickupCylinder',basisModel(...a,...b,r,r),color,material);
 const mark=(x,z,w,d,color=style.trim,angle=0,y=.025)=>box(x,y,z,w,.008,d,color,angle,M.MATTE);
 const groundLine=(ax,az,bx,bz,w,c,y=.028)=>mark((ax+bx)/2,(az+bz)/2,Math.hypot(bx-ax,bz-az),w,c,-Math.atan2(bz-az,bx-ax),y);
 const water=(x,z,w,d,c='#34555d')=>{oval(x,.016,z,w/2,.008,d/2,c,M.WET,.025);oval(x+w*.24,.017,z+d*.10,w*.23,.008,d*.28,c,M.WET,.025);};
 const floorMaterial=id==='memorial'||id==='quarantine'?M.MATTE:id==='breakwater'||id==='cold'?M.CONCRETE:M.ASPHALT;
 if(id!=='breakwater')box(0,-.083,0,66,.16,46,style.floor,0,floorMaterial);
 const base=(r,h,c=style.body,material=M.CONCRETE)=>{
  box(r.x,h/2,r.z,r.w,h,r.d,c,0,material);
  solids.push({x:r.x,z:r.z,w:r.w,d:r.d,h});
  box(r.x,.11,r.z,r.w,.22,r.d,'#354845',0,material);
 };
 const rim=(r,y,c=style.trim)=>{
  for(const side of [-1,1]){box(r.x+side*(r.w/2-.05),y,r.z,.09,.10,r.d,c);box(r.x,y,r.z+side*(r.d/2-.05),r.w,.10,.09,c);}
 };
 const bay=(x,z,w,h,front,c)=>{
  box(x,h/2+.08,z,w,h,.045,'#243c42');box(x,h/2+.08,z+front*.028,w-.12,h-.12,.018,c);
  for(let y=.20;y<h;y+=.25)box(x,y,z+front*.042,w-.16,.022,.018,'#475f63');
  for(const dx of [-w/2,w/2])box(x+dx,h/2+.08,z+front*.026,.065,h+.10,.07,style.trim);
  box(x,h+.10,z+front*.026,w+.08,.07,.07,style.trim);
 };
 // Art detail is anchored to existing obstacle footprints. Flat wear never blocks movement.
 const fixtures=[];
 const tint=(color,f)=>hex(color).map(v=>v*f);
 const contact=(r,h)=>{
  for(const [pad,f,y] of [[.32,.75,.010],[.16,.62,.013],[.045,.45,.016]])
   box(r.x-h*.13,y,r.z-h*.09,r.w+pad+h*.26,.004,r.d+pad+h*.18,tint(style.floor,f),0,M.MATTE);
 };
 const lamp=(x,y,z,color=style.lamp,powered=true,phase=0,radius=5.2)=>{
  box(x,y+.07,z,.46,.16,.30,'#293939');
  box(x,y-.022,z,.34,.035,.23,color,0,M.GLASS,.08);
  const part=parts[parts.length-1];part.fixture=fixtures.length;
  fixtures.push({x,y:y-.04,z,color,powered,phase,radius});
  lights.push({x,y:.065,z,radius:radius*.6,color,strength:.26,mode:0,fixture:fixtures.length-1});
 };
 const pole=(x,z,y,color,powered=true,phase=0)=>{
  cylinder(x,.14,z,.16,.28,'#344542');seg([x,.15,z],[x,y,z],.045,'#6d7c70');lamp(x,y,z,color,powered,phase);
 };
 const crate=(x,y,z,w=.85,h=.7,d=.72,c='#998466')=>{
  box(x,y+h/2,z,w,h,d,c,0,M.MATTE);
  for(const sx of [-1,1]){box(x+sx*w*.37,y+h/2,z,.065,h+.025,d+.025,'#514d3f');}
  for(const sz of [-1,1]){box(x,y+h*.14,z+sz*d*.502,w,.065,.026,'#c0ac7c');box(x,y+h*.87,z+sz*d*.502,w,.055,.026,'#c0ac7c');}
 };
 const drum=(x,y,z,c='#8e7350')=>{
  cylinder(x,y+.39,z,.28,.78,c);for(const dy of [.10,.66])cylinder(x,y+dy,z,.289,.04,'#343f3c');
  cylinder(x,y+.79,z,.25,.026,'#89968a');cylinder(x+.12,y+.81,z,.038,.015,'#253833');
 };
 const tree=(x,y,z,s=1)=>{
  seg([x,y,z],[x+.09*s,y+2.5*s,z],.13*s,'#5e5540',M.MATTE);
  for(const [dx,dz,dy] of [[-.53,-.18,1.85],[.55,.12,2.16],[-.14,.42,2.55]]){
   seg([x,y+1.2*s,z],[x+dx*s,y+dy*s,z+dz*s],.065*s,'#615740',M.MATTE);
   oval(x+dx*s,y+(dy+.35)*s,z+dz*s,.72*s,.62*s,.65*s,dy>2.2?'#61704a':'#3e583e',M.ORGANIC);
  }
 };
 const bench=(x,y,z,w=1.55)=>{
  for(const dx of [-w*.37,w*.37]){box(x+dx,y+.24,z,.065,.48,.48,'#39483e');box(x+dx,y+.53,z-.19,.065,.72,.065,'#39483e');}
  for(const dz of [-.15,0,.15])box(x,y+.46,z+dz,w,.065,.13,'#93856a',0,M.MATTE);
  for(const dy of [.63,.80])box(x,y+dy,z-.20,w,.13,.055,'#877b60',0,M.MATTE);
 };
 const ladder=(x,z,top)=>{
  for(const dx of [-.24,.24])seg([x+dx,.42,z],[x+dx,top,z],.025,'#a7b4a3');
  for(let y=.58;y<top;y+=.25)seg([x-.24,y,z],[x+.24,y,z],.022,'#81958e');
 };
 const fan=(x,y,z,r=.40)=>{
  cylinder(x,y,z,r,.085,'#273c41');cylinder(x,y+.055,z,r*.86,.030,'#677e7c');
  for(let k=0;k<5;k++){const a=k*Math.PI*2/5;box(x+Math.cos(a)*r*.34,y+.08,z+Math.sin(a)*r*.34,r*.72,.025,.075,'#263e42',-a);}
  cylinder(x,y+.10,z,.078,.04,'#b4beb0');
 };
 const truck=(r)=>{
  const x=r.x,z=r.z,w=r.w*.90,d=r.d*.86,y=.16,cab=x+w*.30;
  box(x,.50,z,w,.20,d*.82,'#2a3739');
  box(x-w*.15,1.10,z,w*.61,.98,d,'#68786c');box(x-w*.15,1.62,z,w*.64,.09,d*1.03,'#929c85');
  add('powerHull',model(cab,1.03,z,w*.17,.47,d*.49),'#6c7c6b');
  box(cab,1.54,z,w*.33,.10,d,'#889981');
  for(const side of [-1,1]){
   box(cab,1.24,z+side*d*.497,w*.23,.33,.028,'#4f777e',0,M.GLASS);
   box(x-w*.13,1.20,z+side*d*.503,w*.42,.07,.025,'#d2c99f');
   for(const dx of [-w*.31,w*.31]){seg([x+dx,.38,z+side*d*.34],[x+dx,.38,z+side*d*.54],.32,'#1d292b',M.RUBBER);seg([x+dx,.38,z+side*d*.53],[x+dx,.38,z+side*d*.57],.13,'#a1a58e');}
  }
  box(x+w*.49,.76,z,.09,.14,d*.93,'#a8ad97');box(x+w*.49,1.01,z,.035,.24,d*.43,'#283d40');
  for(const dz of [-d*.33,d*.33])box(x+w*.50,1.04,z+dz,.03,.15,.21,'#ebddb2',0,M.GLASS,.70);
  lamp(cab,1.70,z,'#f58c58',false,2.3,5.8);
  box(x-w*.28,1.75,z,.95,.16,d*.58,'#47534b');
  for(let k=0;k<4;k++)box(x-w*.28+(k-1.5)*.19,1.84,z,.07,.05,d*.56,'#7b8775');
 };

 for(const [i,o] of obstacles.entries()){
  const r=obstacleToWorld(o),front=r.z+r.d/2;
  if(id==='breakwater'){
   if(i>0){base(r,.34,'#73807a');rim(r,.37,'#a6ad91');continue;}
   const colors=['#56838b','#a77859','#758777'],h=1.75;
   base(r,h,colors[i%3],M.METAL);rim(r,h+.04,'#c0ba99');
   for(let x=-r.w/2+.22;x<r.w/2;x+=.42){
    for(const side of [-1,1])box(r.x+x,.95,r.z+side*(r.d/2+.013),.036,1.43,.029,'#3f5d63');
    box(r.x+x,h+.018,r.z,.028,.025,r.d-.16,'#789296');
   }
   for(let x=-r.w/2+1.5;x<r.w/2-1;x+=5.2){
    bay(r.x+x,front+.025,1.95,1.46,1,'#6c8789');
    mark(r.x+x,front+.19,2.25,.11,'#c5b37c');
    box(r.x+x,h-.20,front+.052,.40,.10,.020,'#d4c9a6');
   }
  }else if(id==='memorial'){
   const center=r.w>7;base(r,center?.80:.46,'#727d72');rim(r,center?.84:.51,'#a2ac96');
   if(center){
    box(r.x,1.04,r.z,r.w*.76,.43,r.d*.76,'#5f7168',0,M.CONCRETE);
    box(r.x,1.32,r.z,r.w*.59,.15,r.d*.59,'#a1ad9c',0,M.CONCRETE);
    box(r.x,1.77,r.z,1.72,.82,1.72,'#9ca799',0,M.CONCRETE);
    add('powerHull',model(r.x,2.36,r.z,.54,.23,.54),'#b6beaa',M.CONCRETE);
    for(const side of [-1,1]){box(r.x+side*.88,1.86,r.z,.025,.43,.75,'#465e58');box(r.x,1.86,r.z+side*.88,.75,.43,.025,'#465e58');}
    for(const dx of [-r.w*.31,r.w*.31])for(const dz of [-r.d*.31,r.d*.31]){cylinder(r.x+dx,1.18,r.z+dz,.15,.66,'#abb49e');oval(r.x+dx,1.57,r.z+dz,.21,.12,.21,'#c4c6a7');}
   }else{
    box(r.x,.51,r.z,r.w-.35,.035,r.d-.34,'#405647',0,M.MATTE);
    for(const dx of [-r.w*.26,r.w*.26]){box(r.x+dx,.81,r.z-.25,.58,.65,.18,'#9eaa98',0,M.CONCRETE);oval(r.x+dx,1.15,r.z-.25,.29,.18,.09,'#aeb8a4',M.CONCRETE);box(r.x+dx,.535,r.z+.44,.66,.065,1.0,'#7e8e7b',0,M.CONCRETE);}
   }
  }else if(id==='pump'){
   base(r,.38,'#697775');rim(r,.42,'#aab092');
   const radius=Math.min(r.w,r.d)*.32;
   cylinder(r.x-.40,1.44,r.z,radius,2.05,style.body);
   oval(r.x-.40,2.49,r.z,radius,.26,radius,'#88a4a1');
   for(const y of [.61,2.19])cylinder(r.x-.40,y,r.z,radius*1.025,.065,'#b0b9aa');
   cylinder(r.x-.40,2.78,r.z,.20,.18,'#718c86');
   const x=r.x+r.w*.36,z=r.z+r.d*.32;
   seg([x,.53,z],[x,1.33,z],.17,'#bda85f');seg([x,1.33,z],[r.x+.12,1.33,z],.17,'#738e86');
   cylinder(x,1.42,z,.30,.10,'#cb9a5e');
   box(r.x-r.w*.33,.67,r.z+r.d*.39,.75,.50,.43,'#3a5558');box(r.x-r.w*.33,.95,r.z+r.d*.39,.54,.04,.29,'#a7e5c5',0,M.GLASS,.19);
   for(const x0 of [-r.w*.35,r.w*.35])mark(r.x+x0,front+.13,.85,.07,'#c2ac60');
  }else if(id==='cold'){
   const h=2.62;base(r,h,style.body,M.METAL);rim(r,h+.035,'#e0ebe1');
   for(let x=-r.w/2+.2;x<r.w/2;x+=.46){box(r.x+x,h+.025,r.z,.033,.035,r.d-.18,'#91adb2');for(const side of [-1,1])box(r.x+x,.99,r.z+side*(r.d/2+.013),.018,1.54,.03,'#91aeb5');}
   const doors=r.w>7?2:1;
   for(let d=0;d<doors;d++){const x=r.x+(d-(doors-1)/2)*r.w*.46;bay(x,front+.024,Math.min(2.2,r.w*.58),1.55,1,'#a7c3c9');box(x,1.70,front+.06,.58,.05,.06,'#c1efff',0,M.GLASS,.38);}
   box(r.x,h+.17,r.z,.88,.27,r.d*.64,'#b0c4c4');for(const dz of [-.35,0,.35])box(r.x,h+.316,r.z+dz,.64,.025,.045,'#5d7a82');
   for(const side of [-1,1])box(r.x,h+.072,r.z+side*(r.d/2-.13),r.w*.83,.06,.20,'#d5e4de',0,M.MATTE);
  }else if(id==='rail'){
   const car=r.w>5.5,h=car?1.90:1.15;base(r,h,car?['#8d6150','#727e65','#736c56'][i%3]:'#747a6b',M.METAL);
   rim(r,h+.06,car?'#b6a889':'#a8af97');
   if(car){
    for(let x=-r.w/2+.28;x<r.w/2;x+=.57)for(const side of [-1,1])box(r.x+x,.93,r.z+side*(r.d/2+.012),.042,1.12,.035,'#4e5146');
    box(r.x,h+.05,r.z,r.w-.25,.07,r.d-.28,'#5a655c');
    for(const dx of [-r.w*.34,r.w*.34]){box(r.x+dx,.28,r.z,r.w*.12,.26,r.d*.95,'#2c3936');}
    bay(r.x,front+.03,Math.min(2.2,r.w*.27),1.27,1,'#8b8870');
   }else{
    box(r.x,1.22,r.z,r.w*.85,.10,r.d*.83,'#9b9e82');box(r.x,1.40,r.z,.55,.25,.48,'#435956');
    oval(r.x,1.60,r.z,.10,.09,.10,'#ffd19a',M.GLASS,.45);
   }
  }else if(id==='quarantine'){
   base(r,.83,style.body,M.FABRIC);
   add('arenaGable',model(r.x,.83,r.z,r.w/2,.77,r.d/2),i%3===1?'#8c987d':'#7b896e',M.FABRIC);
   for(const side of [-1,1])box(r.x+side*(r.w/2-.05),.44,r.z,.065,.89,r.d-.06,'#b6ad80');
   box(r.x,.43,front+.026,.80,.79,.027,'#293d35',0,M.FABRIC);
   for(const side of [-1,1])box(r.x+side*.44,.43,front+.045,.065,.82,.043,'#c9bf94');
   // Medical patch and seams sit on the canvas roof, with no ropes across walking lanes.
   box(r.x,1.618,r.z,.59,.015,.10,'#d9dac0',0,M.MATTE);box(r.x,1.62,r.z,.13,.016,.34,'#d9dac0',0,M.MATTE);
   for(const x of [-r.w*.30,r.w*.30])seg([r.x+x,.86,r.z-r.d*.49],[r.x+x,1.61,r.z],.018,'#b4b591',M.FABRIC);
  }else if(id==='evac'){
   if(i===5){base(r,.15,'#69766f');continue;}
   const alongX=r.w>=r.d,len=alongX?r.w:r.d,h=.88;
   base(r,h,'#7c8680');
   box(r.x,h+.10,r.z,r.w*.85,.18,r.d*.85,'#abb39c',0,M.CONCRETE);
   for(let d=-len/2+.35;d<len/2-.2;d+=.70){
    const x=r.x+(alongX?d:0),z=r.z+(alongX?0:d);
    oval(x,1.10,z,alongX?.36:r.w*.28,.13,alongX?r.d*.28:.36,'#92977c',M.FABRIC);
   }
   const face=r.z+r.d/2+.021;
   if(alongX)for(let x=-r.w/2+.35;x<r.w/2-.2;x+=.60)box(r.x+x,.55,face,.30,.20,.018,(Math.round(x*10)%2)?'#dcc387':'#3a4644',0,M.MATTE);
   for(const side of [-1,1]){const x=r.x+(alongX?side*(r.w/2-.28):0),z=r.z+(alongX?0:side*(r.d/2-.28));oval(x,1.19,z,.09,.06,.09,'#ffd698',M.GLASS,.55);}
  }
 }
 // Theme-specific ground and landmarks. All route markings and wear stay flush to the floor.
 if(id==='breakwater'){
  for(let x=-21;x<=21;x+=4)for(const z of [-15,15]){mark(x,z,2.4,.065,'#d0bd86');mark(x+.9,z,.025,1.8,'#809897');}
  for(const [x,z] of [[-7,-1],[6,4],[-13,9],[13,-11]])water(x,z,3.8,1.4);
 }else if(id==='memorial'){
  for(const x of [-7.4,7.4])for(let z=-15;z<=15;z+=1.25)mark(x,z,1.80,1.10,(Math.round(z*4)%3)?'#687768':'#71816e');
  for(const z of [-12.2,12.2])for(let x=-20;x<=20;x+=1.5)mark(x,z,1.35,1.9,'#657869');
  for(const [x,z] of [[-18,0],[18,0],[-3,-13],[3,13]]){oval(x,.014,z,1.7,.008,.62,'#2a4233',M.MATTE);}
 }else if(id==='pump'){
  // Pump floor markings use explicit height layers. The old stripe bars were coplanar with
  // their dark backing strip, which caused z-fighting/shimmer whenever the camera moved.
  for(const z of [-3.6,3.6]){
   mark(0,z,13.5,.52,'#233c3f',0,.024);
   for(let x=-6.5;x<=6.5;x+=.35)mark(x,z,.12,.40,'#667e7a',0,.044);
  }
  for(const [x,z] of [[-4.8,8],[4.8,-8],[12,0],[-12,0]])water(x,z,2.4,1.3,'#24474b');
  // Slightly wider and higher lane paint avoids sub-pixel shimmer at the overhead camera angle.
  for(const x of [-6.4,6.4])for(let z=-12;z<=12;z+=2.7){mark(x,z,.10,1.46,'#b1a364',0,.050);}
 }else if(id==='cold'){
  for(const x of [-12,-4,4,12]){mark(x,0,.045,12.5,'#b8c9c5');for(const z of [-6,6])mark(x,z,3.4,.065,'#d1dace');}
  for(const [x,z] of [[-8,3],[8,-2],[-16,-11],[15,11]])water(x,z,4.1,1.9,'#698b99');
  for(const side of [-1,1])for(let x=-20;x<=20;x+=4)oval(x,.03,side*16.4,1.45,.018,.42,'#c3d5d4',M.MATTE);
 }else if(id==='rail'){
  for(const z of [-6.65,7]){
   mark(0,z,45,1.9,'#3c4038');for(let x=-22;x<=22;x+=1.2)mark(x,z,.19,1.85,'#716451',0,.031);
   for(const side of [-1,1])mark(0,z+side*.57,45,.060,'#a3aaa0',0,.042);
  }
  for(const x of [-6.5,6.5])for(let z=-3;z<=3;z+=.5)mark(x,z,2.8,.27,'#74766a');
 }else if(id==='quarantine'){
  for(const x of [-7,7]){mark(x,0,1.9,29,'#647362');for(let z=-14;z<=14;z+=1.4)mark(x,z,1.8,.055,'#43564b');}
  for(const [x,z] of [[-18,-11],[18,10],[3,12],[-3,-12]])oval(x,.014,z,2.4,.008,.8,'#374c3c',M.MATTE);
  for(const side of [-1,1]){box(side*26.5,.70,0,1.6,1.4,1.9,'#84896c');box(side*26.5,1.43,0,1.5,.06,1.8,'#c3bea0');}
 }else if(id==='evac'){
  mark(0,0,10.6,10.6,'#51605f');
  for(let i=0;i<40;i++){const a=i*Math.PI/20,b=a+.115;groundLine(Math.cos(a)*4.55,Math.sin(a)*4.55,Math.cos(b)*4.55,Math.sin(b)*4.55,.13,'#c6cbb3',.036);}
  mark(-1.23,0,.24,3.30,'#dde0c9',0,.041);mark(1.23,0,.24,3.30,'#dde0c9',0,.041);mark(0,0,2.65,.24,'#dde0c9',0,.042);
  for(const x of [-8.2,8.2])for(let z=-13;z<=13;z+=2.2)mark(x,z,.10,1.05,'#c5baa0');
  for(const z of [-13.6,13.6])for(let x=-3;x<=3;x+=.75)mark(x,z,.36,1.4,'#c1b395');
 }
 // Scaled cracks and drains tie the themes together without filling the escape lanes with clutter.
 for(const [x,z,a] of [[-4.2,-10.7,.35],[5.2,9.6,-.45],[-18,5,.7]]){
  groundLine(x-.8,z,x-.12,z+.16,.020,'#253a3a');groundLine(x-.12,z+.16,x+.9,z-.2,.023,'#253a3a');groundLine(x-.12,z+.16,x+.10,z+.65,.014,'#253a3a');
 }
 for(const [x,z] of [[-24.9,-10],[-24.9,10],[24.9,-10],[24.9,10],[-12,-18.9],[12,18.9]]){
  seg([x,0,z],[x,2.9,z],.045,'#5b6f6c');box(x,2.94,z,.48,.12,.29,'#3a4d50');box(x,2.865,z,.39,.03,.23,style.lamp,0,M.GLASS,.80);
  lights.push({x,y:.045,z,radius:2.3,color:style.lamp,strength:.25,mode:0});
 }
 // Landmarks, close scenery, facade depth and pools of light around the original obstacles.
 for(const [i,o] of obstacles.entries()){
  const r=obstacleToWorld(o),x=r.x,z=r.z,f=z+r.d/2,h=solids[i].h;
  contact(r,h);
  // Flush aprons and drains explain how the built surfaces meet the yard.
  if(!['memorial','quarantine'].includes(id)){
   mark(x,f+.45,r.w,.76,tint(style.floor,1.12),0,.023);
   for(let dx=-r.w/2+.6;dx<r.w/2;dx+=1.9)mark(x+dx,f+.45,.025,.73,tint(style.floor,.65),0,.031);
   mark(x,f+.85,Math.min(r.w,4.2),.17,'#263a3b',0,.030);
   for(let dx=-1.8;dx<1.8&&dx<r.w/2;dx+=.26)if(Math.abs(dx)<r.w/2)mark(x+dx,f+.85,.07,.15,'#849087',0,.033);
  }
  if(id==='breakwater'){
   if(i===0){
    // Harbor control room and crane sit on the long cargo structure, inside its footprint.
    const cx=x-r.w*.28;
    box(cx,2.22,z,4.5,.94,r.d*.82,'#778f89');box(cx,2.73,z,4.68,.10,r.d*.91,'#b6bd9f');
    for(const dx of [-1.5,0,1.5]){box(cx+dx,2.32,f-.17,1.25,.46,.04,'#29474e');box(cx+dx,2.32,f-.14,1.07,.33,.026,'#94bec0',0,M.GLASS,.10);}
    for(const dx of [-r.w*.39,0,r.w*.39]){box(x+dx,1.64,f+.08,2.5,.13,.25,'#a1a589');lamp(x+dx,1.55,f+.16,'#f1d49b');}
    const kx=x+4.8;box(kx,2.9,z,.28,2.25,.32,'#bf9d55');box(kx+2.0,3.98,z,4.4,.23,.28,'#cfad6a');
    seg([kx,2.95,z],[kx+3.8,3.97,z],.052,'#756c4d');seg([kx+3.5,3.89,z],[kx+3.5,2.22,z],.019,'#d5ceaf');
    add('powerRing',model(kx+3.5,2.17,z,.08,.15,.15),'#384f51');
   }else{
    const y=.34;
    for(const [dx,dz,level] of [[-r.w*.30,-.20,0],[0,.24,0],[r.w*.28,-.23,0],[-r.w*.30,-.20,1]])crate(x+dx,y+level*.78,z+dz,1.30,.76,1.10,level?'#a19769':'#7b8768');
    for(const dx of [-.38,.34])drum(x+dx,y,z-r.d*.29,'#8f7051');
    pole(x+r.w*.43,z+r.d*.34,2.7,'#e6d5a4');
   }
  }else if(id==='memorial'){
   if(r.w>7){
    // The broken obelisk gives the center a recognizable vertical silhouette.
    box(x,2.92,z,.60,1.08,.63,'#9daa99',0,M.CONCRETE);add('powerHull',model(x,3.57,z,.34,.23,.34),'#c1c7ad',M.CONCRETE);
    for(const dx of [-r.w*.38,r.w*.38]){bench(x+dx,.82,z+.95,1.40);pole(x+dx,z-r.d*.34,2.55,'#f3cd8c');}
    for(const dz of [-r.d*.31,r.d*.31])box(x,1.36,z+dz,1.70,.024,.24,'#5c7461',0,M.MATTE);
   }else{
    const s=i%2?.78:.96;tree(x+r.w*.34,.54,z-r.d*.28,s);
    for(const dx of [-r.w*.32,r.w*.31])oval(x+dx,.65,z+r.d*.31,.45,.18,.27,'#4a6242',M.ORGANIC);
    pole(x-r.w*.38,z-r.d*.27,2.20,'#f1cd91');
   }
  }else if(id==='pump'){
   // Service catwalk, ladder, pipe elbows and instrument rack share the tank platform.
   const px=x+r.w*.34,pz=z+r.d*.31;
   ladder(px,pz-.14,2.47);box(px,2.47,z,.76,.08,r.d*.74,'#677e77');
   for(const side of [-1,1]){const zz=z+side*r.d*.32;seg([px+.31,.48,zz],[px+.31,2.95,zz],.025,'#abaf84');}
   seg([px+.31,2.93,z-r.d*.32],[px+.31,2.93,z+r.d*.32],.03,'#b8b886');
   seg([x-r.w*.35,.53,z+r.d*.34],[x-r.w*.35,1.25,z+r.d*.34],.11,'#bc9d62');
   seg([x-r.w*.35,1.25,z+r.d*.34],[x-.5,1.25,z+r.d*.34],.11,'#83968b');
   cylinder(x-.40,2.91,z,.23,.36,'#718c88');
   lamp(px,2.89,pz,'#e8d69d');
   if(i===1){seg([x-r.w*.34,.45,z-r.d*.31],[x-r.w*.34,3.55,z-r.d*.31],.18,'#536a68');cylinder(x-r.w*.34,3.57,z-r.d*.31,.26,.12,'#a5af9a');}
  }else if(id==='cold'){
   for(const dx of r.w>7?[-r.w*.26,r.w*.26]:[0]){
    box(x+dx,1.90,f+.04,2.25,.13,.25,'#778e94');lamp(x+dx,1.81,f+.13,'#d0e8f4');
    box(x+dx,2.21,f+.026,1.25,.34,.035,'#435f68');box(x+dx,2.21,f+.05,1.12,.24,.021,'#82a4af',0,M.GLASS,.04);
    box(x+dx,2.89,z,1.10,.45,1.0,'#8ca5a9');fan(x+dx,3.14,z,.39);
   }
   for(const dx of [-r.w*.42,r.w*.42]){box(x+dx,1.27,f+.03,.065,2.53,.07,'#7e989e');box(x+dx,2.56,f-.02,.09,.10,.25,'#d6e6e2');}
   for(let dx=-r.w*.42;dx<r.w*.44;dx+=.55)seg([x+dx,2.58,f-.025],[x+dx,2.37-(i%3)*.05,f-.025],.018,'#d4ebe5');
  }else if(id==='rail'){
   if(r.w>5.5){
    for(const dx of [-r.w*.39,r.w*.39]){ladder(x+dx,f-.06,2.08);box(x+dx,1.95,z,.045,.055,r.d*.85,'#b6af8d');}
    for(let dx=-r.w/2+.22;dx<r.w/2;dx+=.65)box(x+dx,1.96,z,.04,.04,r.d*.86,'#7c806d');
    lamp(x,1.52,f+.10,'#edcb8c');
    box(x,1.53,f+.024,.50,.24,.02,'#c6b995');box(x,1.53,f+.04,.25,.05,.01,'#686954');
   }else{
    if(i===4){
     box(x,1.65,z,r.w*.87,.88,r.d*.88,'#717d70');box(x,2.13,z,r.w*.96,.13,r.d*.96,'#adad88');
     for(const side of [-1,1]){box(x+side*r.w*.44,1.78,z,.026,.38,r.d*.61,'#38565a');box(x,1.78,z+side*r.d*.445,r.w*.61,.38,.026,'#718e8a',0,M.GLASS,.08);}
     pole(x-r.w*.32,z-r.d*.30,3.20,'#f4b575',false,.7);
    }else{
     const sx=x+r.w*.32;seg([sx,1.2,z],[sx,2.94,z],.06,'#a1a78d');box(sx,2.73,z,.26,.53,.17,'#233d3b');lamp(sx,2.69,z+.11,'#eeb97b',false,i);
    }
   }
  }else if(id==='quarantine'){
   // Guy ropes stay over the tent footprint. No invisible trip-lines in the lanes.
   for(const side of [-1,1]){
    seg([x+side*r.w*.29,1.6,z],[x+side*r.w*.46,.86,z+r.d*.47],.015,'#c4bb8b',M.FABRIC);
    box(x+side*r.w*.32,.52,f+.025,.64,.36,.025,'#3a5344',0,M.FABRIC);
    for(const dx of [-.19,.19])box(x+side*r.w*.32+dx,.52,f+.04,.025,.32,.02,'#a6ae89');
   }
   box(x,1.02,f+.05,1.13,.07,.27,'#b7b28b',0,M.FABRIC);lamp(x,1.12,f+.12,'#edcd91');
   if(i===4){
    seg([x+r.w*.41,.08,z-r.d*.30],[x+r.w*.41,3.0,z-r.d*.30],.032,'#9eae96');
    for(const h0 of [2.4,2.8])seg([x+r.w*.41-.34,h0,z-r.d*.30],[x+r.w*.41+.34,h0,z-r.d*.30],.018,'#c1c4a2');
    box(x,1.45,f-.16,.76,.13,.07,'#d6d1af');box(x,1.45,f-.115,.17,.36,.022,'#954c3d');
   }
  }else if(id==='evac'){
   if(i===5)truck(r);
   else if(i===4){
    // Command shelter anchors the far side of the landing area.
    box(x,1.45,z,r.w*.75,1.08,r.d*.89,'#596e68');box(x,2.03,z,r.w*.78,.12,r.d*.95,'#a6ad93');
    for(const dx of [-1.7,0,1.7]){box(x+dx,1.60,f-.065,1.12,.42,.025,'#2a464b');box(x+dx,1.60,f-.045,.94,.29,.016,'#8eb5b2',0,M.GLASS,.08);}
    seg([x+r.w*.30,1.95,z],[x+r.w*.30,3.2,z],.031,'#b6c2a8');
    lamp(x,2.15,f-.1,'#f1d294');
   }else{
    const long=r.w>=r.d;
    for(const side of [-1,1]){const px=x+(long?side*r.w*.35:0),pz=z+(long?0:side*r.d*.35);pole(px,pz,2.35,'#efd09b');}
    if(i<2){crate(x,1.27,z,1.05,.60,Math.min(1.0,r.d*.7),'#647361');}
   }
  }
 }
 // Broad, irregular wear and repairs tie the open lanes to the structures, without raising them.
 let seed=[...id].reduce((n,c)=>n*31+c.charCodeAt(0),17)>>>0;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const organic=id==='memorial'||id==='quarantine';
 for(let k=0;k<28;k++){
  const x=-21+rand()*42,z=-15+rand()*30,s=.30+rand()*.85;
  if(id==='pump'&&Math.abs(x)<4.25&&Math.abs(z)<4.0)continue;
  if(obstacles.some(o=>{const r=obstacleToWorld(o);return Math.abs(x-r.x)<r.w/2+.3&&Math.abs(z-r.z)<r.d/2+.3;}))continue;
  oval(x,.019,z,s,.004,s*(.24+rand()*.32),tint(style.floor,.75+rand()*.12),M.MATTE);
  for(let j=0;j<3;j++){const dx=(rand()-.5)*s*1.4,dz=(rand()-.5)*s;mark(x+dx,z+dz,.05+rand()*.12,.035+rand()*.08,organic?'#778263':'#87908a',rand()*2,.035);}
 }
 if(!organic){
  for(const side of [-1,1])for(let j=0;j<8;j++){
   const z=-12+j*3.3,x=side*3.25+Math.sin(j*.7)*.34;
   for(const dx of [-.34,.34])mark(x+dx,z,.10,1.9,tint(style.floor,.70),-.05,.037);
  }
 }else{
  for(const o of obstacles){const r=obstacleToWorld(o);for(const side of [-1,1]){mark(r.x+side*r.w*.32,r.z+r.d/2+.12,.55,.15,'#69764e',.08,.029);}}
 }

 // Dedicated Pump Station identity pass. Everything here is visual-only: no routes or colliders change.
 if(id==='pump'){
  const pipeGreen='#6f9187',pipeDark='#3d5b59',brass='#c3a45f',hazard='#d1b55e',rust='#75564b',panel='#263f42';
  // Flat sump plates replace the old squashed wet spheres. Their normals stay stable while the camera moves, eliminating specular floor flashes.
  mark(0,0,4.90,3.85,'#21484c',0,.026);
  mark(.48,-.28,2.58,1.34,'#2c5e60',-.04,.036);
  mark(-.52,.34,1.36,.72,'#285356',.08,.037);
  // Crossing grate/paint strips sit on separate depth layers so intersections cannot fight.
  for(let x=-3.2;x<=3.2;x+=.42)mark(x,0,.20,1.16,'#566a66',0,.040);
  for(let z=-3.0;z<=3.0;z+=.42)mark(0,z,1.16,.20,'#566a66',0,.058);
  for(const side of [-1,1]){
   mark(side*2.15,0,.15,5.9,hazard,0,.046);
   mark(0,side*2.15,5.9,.15,hazard,0,.064);
  }

  // Four tank platforms receive unique control faces, valve wheels and pipework so they no longer read as repeated cylinders.
  const rs=obstacles.map(obstacleToWorld);
  rs.forEach((r,i)=>{
   const sideX=r.x<0?1:-1, sideZ=r.z<0?1:-1;
   const fx=r.x+sideX*(r.w/2-.18), fz=r.z+sideZ*(r.d/2-.18);
   // Instrument cabinet is anchored over the blocked platform footprint.
   box(fx,.88,fz,.64,1.18,.34,panel,0,M.METAL);
   box(fx,1.12,fz+sideZ*.18,.46,.40,.025,'#8fc5b8',0,M.GLASS,.10);
   for(const dy of [.75,.91,1.07])oval(fx-.18,.56+dy*.40,fz+sideZ*.20,.045,.045,.022,dy>.9?'#e0ba68':'#9db798',M.GLASS,.28);
   // Valve ring and short feed pipe on the lane-facing side of each tank.
   const vx=r.x+sideX*(r.w*.24),vz=r.z+sideZ*(r.d*.39);
   seg([vx,.56,vz],[vx,1.35,vz],.09,pipeGreen);
   add('powerRing',model(vx,1.18,vz,.30,.30,.08),brass,M.METAL);
   cylinder(vx,1.18,vz,.075,.19,pipeDark);
   // Tank ID panel / warning stripe.
   box(r.x,.80,r.z+sideZ*(r.d/2+.018),1.25,.50,.028,'#304f50');
   mark(r.x,r.z+sideZ*(r.d/2+.05),1.02,.08,i%2?hazard:'#b96855',0,.84);
  });

  // High process pipes link the four tanks across the open cross. They sit well above the player and preserve navigation.
  const NW=rs[0],NE=rs[1],SW=rs[2],SE=rs[3];
  if(NW&&NE&&SW&&SE){
   for(const y of [3.15,3.48]){
    seg([NW.x, y, NW.z],[NE.x, y, NE.z],.105,y>3.3?brass:pipeGreen);
    seg([SW.x, y, SW.z],[SE.x, y, SE.z],.105,y>3.3?pipeDark:pipeGreen);
   }
   for(const xoff of [-.20,.20]){
    seg([NW.x+xoff,3.32,NW.z],[SW.x+xoff,3.32,SW.z],.09,xoff<0?brass:pipeGreen);
    seg([NE.x+xoff,3.32,NE.z],[SE.x+xoff,3.32,SE.z],.09,xoff<0?pipeDark:pipeGreen);
   }
   // Elbows and flange collars make the overhead network look engineered rather than like bare bars.
   for(const r of rs){
    cylinder(r.x,3.32,r.z,.19,.10,'#263f41');
    cylinder(r.x,3.32,r.z,.145,.16,brass);
   }
  }

  // Perimeter service language: chemical drums, spill containment, floodlights and compact pump skids.
  for(const [x,z,phase] of [[-20,-13,0],[20,-13,.8],[-20,13,1.6],[20,13,2.4]]){
   mark(x,z,3.0,2.0,'#314e4f',0,.030);
   for(const dx of [-.68,0,.68])drum(x+dx,.05,z,dx===0?'#7f6850':'#486b68');
   pole(x+(x<0?1.55:-1.55),z,3.25,'#c2eee0',true,phase);
  }
  for(const [x,z,a] of [[-12,-14,0],[12,14,Math.PI],[-18,5,Math.PI/2],[18,-5,-Math.PI/2]]){
   box(x,.35,z,2.25,.50,1.05,'#3f5f5f',a,M.METAL);
   cylinder(x-.58*Math.cos(a),.73,z+.58*Math.sin(a),.28,.42,'#6e8f86');
   cylinder(x+.53*Math.cos(a),.72,z-.53*Math.sin(a),.25,.38,'#809a8f');
   seg([x-.80*Math.cos(a),.72,z+.80*Math.sin(a)],[x+.80*Math.cos(a),.72,z-.80*Math.sin(a)],.07,brass);
  }

  // Flat runoff stains avoid view-dependent highlights while still breaking up the teal floor.
  for(const [x,z,a] of [[-15,-8,.28],[14,7,-.32],[-9,11,.12],[10,-11,-.10]]){
   mark(x,z,3.85,.78,'#315c5c',a,.029);
   mark(x+.55*Math.cos(a),z+.55*Math.sin(a),1.65,.34,'#294f50',a-.08,.035);
   groundLine(x-1.8,z-.2,x+1.8,z+.2,.05,rust,.041);
   groundLine(x-.9,z+.15,x+.6,z-.40,.028,'#4b4d42',.045);
  }

  // Tank aprons, ladders and feed collars make the four big tanks feel planted instead of floating on the floor texture.
  rs.forEach((r,i)=>{
   const sideX=r.x<0?1:-1, sideZ=r.z<0?1:-1;
   mark(r.x,r.z,r.w+.52,r.d+.52,'#355356',0,.028);
   mark(r.x,r.z,r.w+.18,r.d+.18,'#2b4648',0,.031);
   for(const lx of [-.10,.10]){
    seg([r.x+sideX*(r.w/2-.34)+lx,.12,r.z+sideZ*(r.d/2-.20)],[r.x+sideX*(r.w/2-.34)+lx,1.18,r.z+sideZ*(r.d/2-.20)],.028,'#7f978f');
    for(let y=.30;y<=.98;y+=.22)seg([r.x+sideX*(r.w/2-.46),y,r.z+sideZ*(r.d/2-.20)],[r.x+sideX*(r.w/2-.22),y,r.z+sideZ*(r.d/2-.20)],.018,'#b3c2b9');
   }
   groundLine(r.x-sideX*.2,r.z+sideZ*(r.d/2+.18),r.x-sideX*1.0,r.z+sideZ*(r.d/2+.18),.045,'#8f9c90',.041);
   add('powerRing',model(r.x-sideX*1.18,.08,r.z+sideZ*(r.d/2+.18),.22,.22,.05),brass,M.METAL);
  });

  // A raised process manifold gives Pump Station a stronger center silhouette without blocking the playable cross.
  for(const sx of [-1,1])for(const sz of [-1,1]){
   seg([sx*1.62,.14,sz*1.62],[sx*1.62,3.05,sz*1.62],.055,'#708b84');
   for(const y of [.66,1.50,2.34])box(sx*1.62,y,sz*1.62,.18,.10,.34,'#c09e59');
  }
  for(const y of [2.55,2.88]){
   seg([-1.62,y,-1.62],[1.62,y,-1.62],.05,pipeDark);
   seg([-1.62,y,1.62],[1.62,y,1.62],.05,pipeDark);
   seg([-1.62,y,-1.62],[-1.62,y,1.62],.05,pipeGreen);
   seg([1.62,y,-1.62],[1.62,y,1.62],.05,pipeGreen);
  }
  add('powerRing',model(0,2.10,0,1.02,1.02,.06),'#8bd7ca',M.GLASS,.22);
  cylinder(0,3.18,0,.24,.22,'#293d3e');
  seg([0,3.18,0],[0,3.86,0],.06,brass);
  box(0,3.98,0,.78,.10,.78,'#2b4345',0,M.METAL);
  for(const [x,z,p] of [[-6.4,-6.4,0],[6.4,-6.4,.8],[-6.4,6.4,1.6],[6.4,6.4,2.4]])pole(x,z,2.55,'#9fe3d4',true,p);

  // Edge pipe racks and service clutter add height and grime at the boundaries instead of in the escape lanes.
  for(const z of [-14.8,14.8]){
   for(const x of [-1.1,1.1])seg([x,.18,z],[x,2.65,z],.055,'#6c8680');
   seg([-1.1,2.72,z],[1.1,2.72,z],.07,pipeGreen);
   seg([-1.1,3.05,z],[1.1,3.05,z],.06,brass);
   box(0,.26,z,2.9,.20,.52,'#304547',0,M.METAL);
  }
  for(const x of [-21.2,21.2]){
   for(const z of [-1.1,1.1])seg([x,.18,z],[x,2.65,z],.055,'#6c8680');
   seg([x,2.72,-1.1],[x,2.72,1.1],.07,pipeGreen);
   seg([x,3.05,-1.1],[x,3.05,1.1],.06,brass);
   box(x,.26,0,.52,.20,2.9,'#304547',0,M.METAL);
  }
  for(const [x,z] of [[-21.6,-3.4],[21.6,3.4],[-7.8,15.1],[7.8,-15.1]]){
   add('powerRing',model(x,.07,z,.34,.34,.05),'#4a5b57',M.METAL);
   groundLine(x-.55,z+.12,x+.55,z-.12,.034,'#262e2f',.043);
  }
  for(const [x,y,z,c] of [[-22.2,.04,-7.2,'#7f6a52'],[22.1,.04,7.3,'#6d7a67'],[-16.4,.04,13.9,'#8d7758'],[16.2,.04,-13.8,'#8a7255']])crate(x,y,z,.74,.58,.72,c);
  for(const [x,z] of [[-23.2,6.5],[23.1,-6.2],[-5.6,16.5],[5.9,-16.4]])drum(x,.03,z,'#6c7c72');
  for(const [x1,z1,x2,z2] of [[-24.6,-2.8,-18.4,-2.2],[24.4,2.8,18.0,2.1],[-2.4,18.4,-2.0,13.8],[2.4,-18.4,2.0,-13.8]])groundLine(x1,z1,x2,z2,.05,'#242e31',.044);
 }

 if(id==='pump'){
  const W=DeadwatchCore.PUMP_WALKWAY,a=simToWorld(W.x0,W.y0),b=simToWorld(W.x1,W.y1);
  // Remove earlier perimeter dressing that would intersect the new playable deck.
  for(let i=parts.length-1;i>=0;i--){const m=parts[i].matrix;if(m[12]>a.x-.2&&m[12]<b.x+.2&&m[14]>a.z-1.8&&m[14]<b.z+1.8)parts.splice(i,1);}
  const gallery=pumpWalkwayPlan();parts.push(...gallery.parts);lights.push(...gallery.lights);
 }
 if(id==='breakwater')parts.push(...breakwaterSurroundings().parts);
 if(id==='quarantine')quarantineCampDetails({parts,lights,solids,style,fixtures},obstacles);
 return {parts,lights,solids,style,fixtures};
}



function pumpOverloadPlan(game){
 const parts=[],glows=[];if(game.arena?.id!=='pump')return{parts,glows};
 const W=DeadwatchCore.PUMP_WALKWAY,M=MATERIAL_IDS,o=game.pumpOverload||{},charging=o.phase==='charging',hot=o.phase==='hot';
 const q=simToWorld(1292,520),h=W.height,a=simToWorld(W.x0,W.up),b=simToWorld(W.x1,W.down);
 const color=hot?'#a2faff':charging?'#ffae63':o.used?'#526760':game.power?'#8bf1bc':'#cd965a',blink=charging?.4+.3*Math.sin(game.time*13):hot?.75:.22;
 const add=(mesh,matrix,color,glow=0,material=M.METAL)=>parts.push({mesh,matrix,color,glow,material});
 const box=(x,y,z,w,hh,d,c,g=0)=>add('box',model(x,y,z,w/2,hh/2,d/2),c,g);
 const seg=(a,b,r,c,g=0)=>add('pickupCylinder',basisModel(...a,...b,r,r),c,g);
 // Rounded breaker cabinet is backed against the rail, with the centre lane left open.
 add('pickupRoundBox',model(q.x,h+.105,q.z,.37,.075,.46),'#66796c');
 add('pickupRoundBox',model(q.x,h+.70,q.z,.335,.52,.40),'#5b746a');
 add('pickupRoundBox',model(q.x,h+1.25,q.z,.37,.065,.435),'#90a08c');
 box(q.x-.342,h+.72,q.z,.026,.78,.63,'#263e3e');box(q.x-.363,h+.71,q.z,.019,.69,.54,'#567669');
 for(const z of [-.25,.25])for(const yy of [.44,.94])box(q.x-.382,h+yy,q.z+z,.032,.11,.055,'#9aaa8d');
 for(let i=0;i<4;i++)box(q.x-.380,h+.47+i*.082,q.z,.024,.026,.36,'#a0ac93');
 box(q.x-.30,h+1.333,q.z,.14,.015,.54,'#d0ae69');
 for(const z of [-.15,.15])box(q.x-.30,h+1.343,q.z+z,.145,.008,.072,'#425343');
 add('pickupCylinder',model(q.x+.04,h+1.345,q.z-.18,.117,.032,.117),'#263d3c');
 add('pickupCylinder',model(q.x+.04,h+1.384,q.z-.18,.088,.012,.088),'#b3bd9e');
 box(q.x+.04,h+1.401,q.z-.18,.09,.012,.014,o.used?'#776e55':'#435346');
 const level=charging?Math.max(0,Math.min(1,1-o.left/3.5)):hot?Math.max(0,Math.min(1,o.left/6)):o.used?0:game.power?1:0;
 for(let i=0;i<4;i++)box(q.x-.17+i*.12,h+1.337,q.z+.19,.071,.017,.11,level>=(i+1)/4-.001?color:'#354d46',level>=(i+1)/4-.001?blink*.9:.01);
 const handleY=h+(o.used?.76:1.06),handleX=q.x-(o.used?.61:.53);
 for(const z of [-.10,.10])seg([q.x-.39,h+.91,q.z+z],[handleX,handleY,q.z+z],.024,'#b7b99b');
 seg([handleX,handleY,q.z-.145],[handleX,handleY,q.z+.145],.049,o.used?'#777f60':'#c1945e');
 seg([q.x+.24,h+1.30,q.z-.27],[q.x+.24,h+1.56,q.z-.27],.033,'#435d57');
 add('pickupCylinder',model(q.x+.24,h+1.64,q.z-.27,.077,.08,.077),color,blink+.10,M.GLASS);
 add('pickupCylinder',model(q.x+.24,h+1.733,q.z-.27,.102,.015,.102),'#a2ae94');
 for(const z of [-.36,.36])seg([q.x-.25,h+.19,q.z+z],[q.x+.25,h+.19,q.z+z],.022,'#99a88d');
 glows.push({x:q.x-.45,y:h+.078,z:q.z,radius:.72,color,strength:charging||hot?.36:.12,mode:-.10});
 if(charging||hot){
  const mid=(a.x+b.x)/2,span=b.x-a.x-.42;
  for(let z=a.z+.30;z<b.z;z+=1.1)box(mid,h+.064,z,span,.016,.10,charging?'#dc9657':'#77dbe8',charging?.17+blink*.20:.30);
  for(const x of [a.x+.12,b.x-.12])box(x,h+.06,(a.z+b.z)/2,.09,.04,b.z-a.z-.12,charging?'#e39858':'#7ce6f2',blink*.48);
 }
 if(hot){
  // Arcs stay inside the hazardous flat deck; both sloping escape ramps stay safe.
  for(let i=0;i<7;i++){
   const z=a.z+.65+i*(b.z-a.z-1.3)/6,phase=game.time*21+i*2.1;
   const points=[[a.x+.25,h+.10,z],[a.x+1.55,h+.13+Math.abs(Math.sin(phase))*.28,z+.20*Math.sin(phase)],[(a.x+b.x)/2,h+.15,z-.13],[b.x-.25,h+.10,z]];
   for(let k=1;k<points.length;k++)seg(points[k-1],points[k],.015,'#b9faff',.75);
  }
  const age=6-o.left;if(age<.9){
   const fade=1-age/.9;
   for(const x of [-11.2,11.2])for(const z of [-6.3,7.35]){
    glows.push({x,y:.07,z,radius:.6+age*11,color:'#89f5f1',strength:fade*.80,mode:-.045});
    for(let i=0;i<4;i++){const t=i*Math.PI/2+.35,r=1+age*5;seg([x,.14,z],[x+Math.cos(t)*r,.08,z+Math.sin(t)*r],.022,'#bafdf3',fade*.65);}
   }
  }
 }
 return{parts,glows};
}

function pumpWalkwayPlan(){
 const W=DeadwatchCore.PUMP_WALKWAY,M=MATERIAL_IDS,parts=[],lights=[];
 const a=simToWorld(W.x0,W.y0),b=simToWorld(W.x1,W.y1),x=(a.x+b.x)/2,w=b.x-a.x,H=W.height;
 const level=z=>DeadwatchCore.arenaSurfaceHeight('pump',(W.x0+W.x1)/2,z/SCALE+CY);
 const add=(mesh,matrix,color,material=M.METAL,glow=0,cast=true)=>parts.push({mesh,matrix,color,material,glow,cast});
 const box=(x,y,z,w,h,d,c,m=M.METAL,g=0)=>add('box',model(x,y,z,w/2,h/2,d/2),c,m,g);
 const seg=(a,b,r,c)=>add('pickupCylinder',basisModel(...a,...b,r,r),c);
 const slab=(z0,z1,h0,h1)=>{
  const dz=z1-z0,dy=h1-h0,L=Math.hypot(dz,dy),co=dz/L,si=dy/L;
  const mat=model(x,(h0+h1)/2-.11*co,(z0+z1)/2+.11*si,w/2,.11,L/2);
  mat[5]=co*.11;mat[6]=-si*.11;mat[9]=si*L/2;mat[10]=co*L/2;
  add('box',mat,'#647876',M.PARK_STONE);
 };
 const zUp=(W.up-CY)*SCALE,zDown=(W.down-CY)*SCALE;
 slab(a.z,zUp,0,H);slab(zUp,zDown,H,H);slab(zDown,b.z,H,0);
 // Enclosed pump/service housing beneath the gallery. Sides are intentionally solid.
 box(x,(H-.22)/2,(zUp+zDown)/2,w-.10,H-.22,zDown-zUp,'#35494b');
 for(const [lo,hi] of [[a.z,zUp],[zDown,b.z]])for(let z=lo+.125;z<hi;z+=.25){
  // The enclosed ramp support remains entirely below the sloping deck, including its toe.
  const h=Math.min(level(z-.125),level(z+.125))-.27;if(h>.02)box(x,h/2,z,w-.10,h,.25,'#3d5453');
 }
 // Broad, low-contrast seams follow the ramp normal. No dense subpixel grille lines.
 const surfaceStrip=(z,depth,color)=>{
  const lo=z-depth/2,hi=z+depth/2,h0=level(lo),h1=level(hi),dy=h1-h0,L=Math.hypot(depth,dy),co=depth/L,si=dy/L;
  const mat=model(x,(h0+h1)/2+.017*co,z-.017*si,(w-.35)/2,.006,L/2);
  mat[5]=co*.006;mat[6]=-si*.006;mat[9]=si*L/2;mat[10]=co*L/2;
  add('box',mat,color,M.PARK_STONE,0,false);
 };
 for(const [lo,hi] of [[a.z,zUp],[zUp,zDown],[zDown,b.z]]){
  const ramp=lo!==zUp;
  for(let z=lo+.56;z<hi-.32;z+=ramp?1.18:2.08)surfaceStrip(z,ramp?.15:.105,ramp?'#546a68':'#526965');
 }
 for(const side of [a.x+.08,b.x-.08]){
  for(const [lo,hi] of [[a.z,zUp],[zUp,zDown],[zDown,b.z]]){
   seg([side,level(lo)+1.0,lo],[side,level(hi)+1.0,hi],.035,'#ac955d');
   seg([side,level(lo)+.50,lo],[side,level(hi)+.50,hi],.022,'#7c8980');
   seg([side,level(lo)+.12,lo],[side,level(hi)+.12,hi],.044,'#bca05b');
  }
  for(let z=a.z;z<=b.z+.01;z+=1.33){const h=level(z);
   seg([side,h+.05,z],[side,h+1.02,z],.029,'#bec0a4');
   box(side,h+.035,z,.19,.025,.18,'#3b4848');
  }
  for(let z=zUp+.6;z<zDown;z+=1.8){
   box(side,1.53,z,.14,2.94,.16,'#70817a');
   box(side,1.45,z+.60,.026,.87,.93,'#172e34');
   for(let y=1.1;y<1.9;y+=.16)box(side+(side<x?-.018:.018),y,z+.60,.035,.026,.81,'#71847d');
   box(side,2.78,z+.6,.07,.18,.73,'#988459');
  }
 }
 // Floor arrows visibly invite players up both ramps, with no extra HUD.
 for(const [z,sign] of [[a.z+.95,1],[b.z-.95,-1]]){
  const za=z-sign*.27,zb=z+sign*.10;
  seg([x-.34,level(za)+.045,za],[x,level(zb)+.045,zb],.045,'#d5bf76');
  seg([x+.34,level(za)+.045,za],[x,level(zb)+.045,zb],.045,'#d5bf76');
 }
 // Small amber fixtures light the deck; structural feet and stains anchor the height.
 for(const z of [zUp+.8,(zUp+zDown)/2,zDown-.8]){
  for(const xx of [a.x+.1,b.x-.1]){
   box(xx,H+.81,z,.15,.19,.23,'#253b3e');box(xx,H+.82,z+.122,.10,.10,.015,'#eac68a',M.GLASS,.7);
   lights.push({x:xx+(xx<x?.28:-.28),y:H+.065,z,radius:1.8,color:'#ffd699',strength:.26,mode:0});
  }
  box(x,.011,z,w+.34,.01,1.4,'#1c353b',M.MATTE);
 }
 for(const z of [zUp,zDown])for(const xx of [a.x,b.x])box(xx,.13,z,.36,.26,.40,'#849086',M.CONCRETE);
 return {parts,lights};
}

function buildingHeight(o){
 const r=obstacleToWorld(o),n=Math.round((o.x||0)+(o.y||0));
 return r.w*r.d>8?2.2+((n%3+3)%3)*.28:1.15+((n%2+2)%2)*.28;
}
function buildingFacade(o){
 const r=obstacleToWorld(o);if(r.w*r.d<=8)return[];
 const front=r.z+r.d/2+.025,roof=buildingHeight(o)+.16,out=[];
 const doorW=Math.min(1.35,Math.max(.85,r.w*.2));
 out.push({kind:'door',x:r.x-r.w*.28,z:front,w:doorW,d:.06,h:1.85,y:.925,color:'#253033'});
 const span=Math.min(r.w*.26,2.15);
 for(const side of [-1,1])out.push({kind:'window',x:r.x+span*side,z:front,w:.72,d:.045,h:.42,y:1.48,color:'#b8d6cf'});
 for(const side of [-1,1])out.push({kind:'roofVent',x:r.x+r.w*.22*side,z:r.z-r.d*.08,w:.58,d:.58,h:.3,y:roof+.15,color:'#394748'});
 out.push({kind:'warningStripe',x:r.x,z:front+.008,w:Math.min(r.w*.55,4.6),d:.025,h:.08,y:.18,color:'#c59a45'});
 return out;
}
function actorPose(step=0,speed=0,attacking=false){
 const move=clamp(Math.abs(speed)/180,0,1),phase=step*.19;
 return{legSwing:Math.sin(phase)*.23*move,armSwing:Math.sin(phase+Math.PI)*.17*move,bob:Math.abs(Math.sin(phase))*.045*move,armReach:attacking?.62:.18,hunch:attacking?.12:0};
}
function groundedGait(step=0,speed=0,bodyAngle=0,moveAngle=bodyAngle){
 const move=clamp(Math.abs(speed)/180,0,1),angle=Number.isFinite(moveAngle)?moveAngle:bodyAngle;
 const moveForward={x:Math.cos(angle),z:Math.sin(angle)},moveRight={x:-Math.sin(angle),z:Math.cos(angle)};
 if(move<.025)return{move,phase:0,moveForward,moveRight,stride:0,footLiftL:0,footLiftR:0,bodyBob:0};
 const phase=step*.19,s=Math.sin(phase),c=Math.cos(phase);
 // The root stays almost level while one foot is always planted. Vertical motion belongs to the swinging foot, not the whole actor.
 return{move,phase,moveForward,moveRight,stride:s*.23*move,footLiftL:Math.max(0,s)*.115*move,footLiftR:Math.max(0,-s)*.115*move,bodyBob:(1-Math.abs(c))*.012*move};
}
function distanceGroundedGait(travel=0,worldSpeed=0,scale=1,stride=0){
 const speed=Math.max(0,Number(worldSpeed)||0),s=Math.max(.01,Number(scale)||1),moving=speed>.05;
 const stepLength=stride>0?stride:.66*s,cycle=stepLength*2;
 if(!moving)return{stepLength,bodyBob:0,left:{forward:0,lift:0,stance:true},right:{forward:0,lift:0,stance:true}};
 const foot=(offset)=>{let phase=((Number(travel)||0)+offset)%cycle;if(phase<0)phase+=cycle;
  if(phase<stepLength)return{forward:stepLength*.5-phase,lift:0,stance:true};
  const u=(phase-stepLength)/stepLength,e=u*u*(3-2*u);return{forward:-stepLength*.5+stepLength*e,lift:Math.sin(Math.PI*u)*.13*s,stance:false};};
 const left=foot(0),right=foot(stepLength),swing=Math.max(left.lift,right.lift)/(Math.max(.001,.13*s));
 return{stepLength,bodyBob:(1-swing)*.006*s,left,right};
}
function visualMotionState(prev,current,dt,fallbackAngle=0,maxSpeed=320){
 const x=Number(current?.x)||0,y=Number(current?.y)||0,cap=Math.max(0,Number(maxSpeed)||320);
 if(!prev||!Number.isFinite(prev.x)||!Number.isFinite(prev.y))return{x,y,angle:Number.isFinite(fallbackAngle)?fallbackAngle:0,speed:0,travel:0,vx:0,vy:0};
 const dx=x-prev.x,dy=y-prev.y,dist=Math.hypot(dx,dy),safeDt=clamp(Number(dt)||0,1/240,.1),travel=(Number(prev.travel)||0)+dist*SCALE;
 if(dist<.00025)return{x,y,angle:Number.isFinite(prev.angle)?prev.angle:(Number.isFinite(fallbackAngle)?fallbackAngle:0),speed:0,travel,vx:0,vy:0};
 const vx=dx/safeDt,vy=dy/safeDt;
 return{x,y,angle:Math.atan2(dy,dx),speed:Math.min(cap,dist/safeDt),travel,vx,vy};
}
function interpolatePlayer(previous,current,alpha){
 if(!previous||!current||Math.hypot(current.x-previous.x,current.y-previous.y)>80)return current;
 const t=clamp(Number(alpha)||0,0,1);
 return{...current,x:lerp(previous.x,current.x,t),y:lerp(previous.y,current.y,t),aim:previous.aim+angleDelta(previous.aim,current.aim)*t};
}
function playerPresentationMotion(previous,player,dt){
 const base=visualMotionState(previous,player,dt,player.aim||0,420),step=clamp(Number(dt)||0,0,.05);
 if(!previous||Math.hypot(player.x-previous.x,player.y-previous.y)>80)return{...base,speed:0,vx:0,vy:0,survivorCache:null};
 if(step<=0)return{...previous,x:player.x,y:player.y};
 const vx=base.vx,vy=base.vy,rate=Math.hypot(vx,vy)<previous.speed?36:28,t=1-Math.exp(-step*rate);
 const fx=lerp(previous.vx||0,vx,t),fy=lerp(previous.vy||0,vy,t),speed=Math.min(420,Math.hypot(fx,fy));
 return{...base,vx:fx,vy:fy,speed:speed<1?0:speed,angle:speed>5?previous.angle+angleDelta(previous.angle,Math.atan2(fy,fx))*(1-Math.exp(-step*28)):previous.angle,survivorCache:previous.survivorCache};
}
function angleDelta(a,b){let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<=-Math.PI)d+=Math.PI*2;return d;}
function updateBreakerMotion(prev,z,dt){
 const base=visualMotionState(prev,z,dt,z.aim||0,600),step=clamp(Number(dt)||0,0,.1);
 const moving=!z.dead&&(z.bossPhase==='charge'||z.bossPhase==='hunt')&&base.speed>4.5;
 const speed=moving?base.speed:0,target=z.bossPhase==='hunt'&&moving?base.angle:(z.aim||0),old=prev?.displayAngle??target;
 const displayAngle=z.bossPhase==='charge'?target:old+angleDelta(old,target)*(1-Math.exp(-14*step));
 return{...base,speed,meshState:prev?.meshState,displayAngle,filteredSpeed:speed,filteredVX:moving?base.vx:0,filteredVY:moving?base.vy:0,renderX:base.x,renderY:base.y,gaitClock:base.travel,motionClock:(prev?.motionClock||0)+step,runVisual:z.bossPhase==='charge'?1:0,hitKick:Math.max(0,(prev?.hitKick||0)-step*7),deathAge:z.dead?(prev?.deathAge||0)+step:0};
}
function updatePresentationMotion(prev,z,dt){
 if(z.boss)return updateBreakerMotion(prev,z,dt);
 const base=visualMotionState(prev,z,dt,z.aim||0,Math.max(220,(z.speed||0)*1.35)),step=clamp(Number(dt)||0,1/240,.05),life=walkerLifeProfile(z.id||0);
 const followRate=z.kind==='runner'?22:18,vecRate=z.kind==='runner'?17:13,speedRate=z.kind==='runner'?15:11,targetRate=z.kind==='runner'?14:10;
 const followAlpha=1-Math.exp(-followRate*step),vecAlpha=1-Math.exp(-vecRate*step),speedAlpha=1-Math.exp(-speedRate*step),targetAlpha=1-Math.exp(-targetRate*step);
 const pvx=Number.isFinite(prev?.filteredVX)?prev.filteredVX:0,pvy=Number.isFinite(prev?.filteredVY)?prev.filteredVY:0;
 const filteredVX=lerp(pvx,base.vx||0,vecAlpha),filteredVY=lerp(pvy,base.vy||0,vecAlpha);
 const filteredSpeed=lerp(Number.isFinite(prev?.filteredSpeed)?prev.filteredSpeed:0,Math.min(Math.max(0,base.speed||0),Math.hypot(filteredVX,filteredVY)),speedAlpha);
 const moving=filteredSpeed>3.5;
 const moveAngle=moving?Math.atan2(filteredVY,filteredVX):(Number.isFinite(prev?.moveAngle)?prev.moveAngle:(Number.isFinite(base.angle)?base.angle:(z.aim||0)));
 const aim=Number.isFinite(z.aim)?z.aim:moveAngle;
 const desiredTarget=z.attack?aim:(moving?moveAngle:aim);
 const prevTarget=Number.isFinite(prev?.turnTarget)?prev.turnTarget:desiredTarget;
 let target=prevTarget+angleDelta(prevTarget,desiredTarget)*targetAlpha;
 if(Math.abs(angleDelta(target,desiredTarget))<.01)target=desiredTarget;
 const old=Number.isFinite(prev?.displayAngle)?prev.displayAngle:target,error=angleDelta(old,target);
 const stiffness=z.hunter?62:z.kind==='runner'?52:38,damping=z.hunter?13.5:z.kind==='runner'?11.8:9.8,maxVelocity=z.hunter?10.5:z.kind==='runner'?8.9:6.6;
 let angularVelocity=Number.isFinite(prev?.angularVelocity)?prev.angularVelocity:0;
 angularVelocity+=(error*stiffness-angularVelocity*damping)*step;
 angularVelocity=clamp(angularVelocity,-maxVelocity,maxVelocity);
 if(Math.sign(angularVelocity)!==Math.sign(error)&&Math.abs(error)<.11)angularVelocity*=.35;
 let delta=angularVelocity*step;if(Math.abs(delta)>Math.abs(error))delta=error;
 if(Math.abs(error)<.002&&Math.abs(angularVelocity)<.02)angularVelocity=0;
 const displayAngle=old+delta;
 let renderX=Number.isFinite(prev?.renderX)?prev.renderX:base.x,renderY=Number.isFinite(prev?.renderY)?prev.renderY:base.y;
 renderX=lerp(renderX,base.x,followAlpha);renderY=lerp(renderY,base.y,followAlpha);
 const offsetX=renderX-base.x,offsetY=renderY-base.y,offsetMag=Math.hypot(offsetX,offsetY),offsetCap=.055;
 if(offsetMag>offsetCap&&offsetMag>0){renderX=base.x+offsetX/offsetMag*offsetCap;renderY=base.y+offsetY/offsetMag*offsetCap;}
 const gaitClock=(Number(prev?.gaitClock)||0)+(filteredSpeed*SCALE)*step*(.90+life.tempo*.10);
 const motionClock=(Number(prev?.motionClock)||0)+step;
 const gaitSpeed=Math.max(0,filteredSpeed*(.90-life.drag*.08));
 const runTarget=walkerRunAmount(z,filteredSpeed),runAlpha=1-Math.exp(-(runTarget>(prev?.runVisual||0)?9.5:6.5)*step),runVisual=lerp(Number(prev?.runVisual)||0,runTarget,runAlpha);
 return{...base,meshState:prev?.meshState,displayAngle,angularVelocity,turnTarget:target,turnError:error,moveAngle,filteredVX,filteredVY,filteredSpeed,gaitClock,motionClock,gaitSpeed,runVisual,renderX,renderY,hitKick:Math.max(0,(prev?.hitKick||0)-dt*7),deathAge:z.dead?Math.max(0,(prev?.deathAge||0)+dt):0};
}
function arenaEntrancePlan(){
 return[
  {kind:'entryGate',id:'north',x:0,z:-15.33,heading:Math.PI/2,acrossX:true},
  {kind:'entryGate',id:'east',x:22.33,z:0,heading:Math.PI,acrossX:false},
  {kind:'entryGate',id:'south',x:0,z:15.33,heading:-Math.PI/2,acrossX:true},
  {kind:'entryGate',id:'west',x:-22.33,z:0,heading:0,acrossX:false}
 ];
}
function portalModelPlan(exits=[],time=0){
 const parts=[],glows=[],M=MATERIAL_IDS;
 const add=(mesh,matrix,color,glow=0)=>parts.push({mesh,matrix,color,glow,material:M.GLASS});
 for(const exit of exits){
  const p=simToWorld(exit.x,exit.y),pulse=.5+.5*Math.sin(time*2.4);
  // Flat rings sit just above the floor decals; local X is the ground normal.
  const ring=radius=>new Float32Array([0,.035,0,0,radius,0,0,0,0,0,-radius,0,p.x,.13,p.z,1]);
  add('powerRing',ring(1.04),exit.color,.75+pulse*.12);
  add('powerRing',ring(.73),exit.color,.42+(1-pulse)*.20);
  add('powerRing',ring(.38),exit.color,.28+pulse*.20);
  for(let i=0;i<9;i++){
   const phase=(time*.32+i/9)%1,angle=-time*1.8+i*Math.PI*2/9,radius=.18+.70*phase;
   add('pickupOrb',model(p.x+Math.cos(angle)*radius,.15,p.z+Math.sin(angle)*radius,.027,.012,.027),'#d9f4e9',.75);
  }
  glows.push({x:p.x,y:.11,z:p.z,radius:1.6,color:exit.color,strength:.28+pulse*.08,mode:0});
 }
 return{parts,glows};
}
// Depot presentation only. This clock never advances the simulation or its RNG.
class DepotSequence{
 constructor(){this.reset();}
 reset(mode=null,game=null){
  this.enabled=mode==='campaign'&&game?.arena?.id==='depot';this.intro=this.enabled?0:null;
  this.clock=0;this.powerAt=null;this.powerSeen=false;this.slipAt=null;this.slipSpent=false;this.anchor=null;
 }
 get opening(){return this.enabled&&this.intro!==null;}
 skip(){if(!this.opening)return false;this.intro=null;this.clock=0;return true;}
 cancel(){this.reset();}
 event(e,game){
  if(!this.enabled||this.opening||game?.arena?.id!=='depot'||e.type!=='power_on'||this.powerSeen)return false;
  this.powerSeen=true;this.powerAt=this.clock;this.anchor={x:Number.isFinite(e.x)?e.x:game.player.x,y:Number.isFinite(e.y)?e.y:game.player.y};return true;
 }
 tick(dt,game){
  const cues=[];dt=clamp(Number(dt)||0,0,this.opening?6.2:.05);
  if(!this.enabled)return cues;
  if(game?.arena?.id!=='depot'||!['playing','loot','exiting'].includes(game.status)){this.cancel();return ['cancel'];}
  if(this.opening){
   const before=this.intro;this.intro=Math.min(6.2,before+dt);
   if(before<2.65&&this.intro>=2.65)cues.push('arrival-boom');
   if(this.intro>=6.2-1e-8){this.skip();cues.push('handoff');}
   return cues;
  }
  const before=this.clock;this.clock+=dt;
  if(this.powerAt!==null)for(const t of [.38,.85,1.32,1.79])if(before<this.powerAt+t&&this.clock>=this.powerAt+t)cues.push('relay');
  // At most one six-second anomaly per campaign, deferred until there is breathing room.
  if(!this.slipSpent&&this.powerSeen&&game.time>=60&&this.clock-this.powerAt>=25&&['playing','loot'].includes(game.status)&&!game.arcade?.vehicle&&!game.trap?.active&&(game.player.recoil||0)<=.001){
   const clear=(game.zombies||[]).every(z=>z.dead||Math.hypot(z.x-game.player.x,z.y-game.player.y)>145);
   if(clear){this.slipSpent=true;this.slipAt=this.clock;cues.push('slip');}
  }
  return cues;
 }
 view(game){
  if(!this.enabled||game?.arena?.id!=='depot')return null;
  const powerTime=this.powerAt===null?-1:this.clock-this.powerAt,slipTime=this.slipAt===null?-1:this.clock-this.slipAt;
  return{introTime:this.intro===null?-1:this.intro,sceneTime:this.intro===null?(Number(game.time)||0)+6.2:this.intro,powerTime:powerTime<4?powerTime:-1,slipTime:slipTime<6?slipTime:-1,anchor:this.anchor?{...this.anchor}:null};
 }
}
function depotSlipStrength(sequence){const t=sequence?.slipTime??-1;return t<0||t>=6?0:Math.min(1,t/.8,(6-t)/1.1);}
function depotFixtureColor(color,sequence){
 const amount=depotSlipStrength(sequence)*.76;if(!amount)return color;
 return '#'+hex(color).map((c,k)=>Math.round(255*lerp(c,[.89,.23,.13][k],amount)).toString(16).padStart(2,'0')).join('');
}
function depotOpeningCamera(desired,sequence){
 const t=sequence?.introTime??-1;if(t<0)return desired;
 const u=clamp((t-1.0)/4.6,0,1),remain=1-u*u*(3-2*u);
 return{...desired,position:{x:desired.position.x-4*remain,y:desired.position.y+9*remain,z:desired.position.z+6*remain},target:{...desired.target,z:desired.target.z-1.2*remain}};
}
function depotSequencePlan(game,sequence,details){
 const parts=[],glows=[],ribbons=[];if(!sequence)return{parts,glows,ribbons};
 const t=sequence.powerTime,slip=depotSlipStrength(sequence),anchor=sequence.anchor&&simToWorld(sequence.anchor.x,sequence.anchor.y);
 // Brief, world-anchored transformer discharge. All sparks remain outside the fence.
 if(t>=.40&&t<.95){
  const phase=(t-.40)/.55,x=-30.3,y=1.95,z=8.0;
  for(let i=0;i<7;i++){const a=i*2.399;const b={x:x+Math.cos(a)*(.2+phase*.65),y:y+Math.sin(Math.PI*phase)*.35-phase*.7,z:z+Math.sin(a)*(.2+phase*.65)};ribbons.push({a:{x:b.x-Math.cos(a)*.10,y:b.y+.08,z:b.z-Math.sin(a)*.10},b,width:.028,opacity:(1-phase)*.58,color:'#c5f0ff',mode:-1});}
  glows.push({x,y:2.0,z,radius:1.1,color:'#a2ddec',strength:(1-phase)*.32,mode:1});
 }
 const reveal=t>=1.48&&t<2.12||slip>.35;
 if(reveal&&anchor&&details){
  // Choose an existing vertical window nearest the activation point. No new opening/collider.
  const windows=details.parts.filter(p=>p.material===MATERIAL_IDS.DEPOT_GLASS&&p.matrix[13]>1&&p.matrix[13]<2&&Math.abs(p.matrix[5])>.1&&Math.abs(p.matrix[6])<.001);
  windows.sort((a,b)=>Math.hypot(a.matrix[12]-anchor.x,a.matrix[14]-anchor.z)-Math.hypot(b.matrix[12]-anchor.x,b.matrix[14]-anchor.z));
  const pane=windows[0];if(pane){
   const m=pane.matrix,normalX=Math.abs(m[0])<Math.abs(m[10]),nx=normalX?Math.sign(anchor.x-m[12])||1:0,nz=normalX?0:Math.sign(anchor.z-m[14])||1;
   const x=m[12]+nx*.028,z=m[14]+nz*.028,y=m[13],half=Math.min(.23,Math.abs(m[5])*.86),width=Math.min(.115,(normalX?Math.abs(m[10]):Math.abs(m[0]))*.20);
   const background=new Float32Array(m);background[12]+=nx*.017;background[14]+=nz*.017;parts.push({mesh:'box',matrix:background,color:slip>.35?'#aa6e5e':'#90bdb1',material:MATERIAL_IDS.GLASS,glow:.28});
   parts.push({mesh:'pickupOrb',matrix:model(x,y+half*.52,z,normalX?.021:width*.48,half*.29,normalX?width*.48:.021),color:'#102426',material:MATERIAL_IDS.MATTE,glow:0});
   parts.push({mesh:'pickupRoundBox',matrix:model(x,y-half*.33,z,normalX?.017:width,half*.60,normalX?width:.017),color:'#14272a',material:MATERIAL_IDS.MATTE,glow:0});
  }
 }
 return{parts,glows,ribbons};
}

function memorialRisePose(z,pose){
 if(!(z.graveRise>0))return pose;
 const buried=Math.pow(clamp(z.graveRise/z.graveTotal,0,1),1.25);
 pose.matrix[13]-=pose.silhouette.height*1.04*buried;
 pose.shadow.sx*=1-buried;pose.shadow.sz*=1-buried;
 return pose;
}
function memorialGravePlan(game,quality=2){
 const parts=[],glows=[],haze=[];if(game.arena?.id!=='memorial')return{parts,glows,haze};
 const M=MATERIAL_IDS,add=(mesh,matrix,color,glow=0,material=M.MATTE)=>parts.push({mesh,matrix,color,glow,material});
 const box=(x,y,z,w,h,d,c,a=0)=>add('box',model(x,y,z,w/2,h/2,d/2,a),c);
 const oval=(x,y,z,rx,ry,rz,c)=>add('pickupOrb',model(x,y,z,rx,ry,rz),c);
 const arm=(a,b,r,c)=>{const m=basisModel(...a,...b,r,r);for(const k of [0,1,2])m[k]*=-1;add('pickupCylinder',m,c);};
 for(const q of DeadwatchCore.MEMORIAL_GRAVES){
  const p=simToWorld(q.x,q.y),w=(game.warnings||[]).find(w=>w.graveId===q.id),z=(game.zombies||[]).find(z=>!z.dead&&z.graveId===q.id&&z.graveRise>0),scar=game.graveyard?.scars?.[q.id];
  if(!w&&!z&&scar===undefined)continue;
  const phase=w?clamp(1-w.left/w.graveTotal,0,1):1,risen=z?1-z.graveRise/z.graveTotal:0,age=scar===undefined?0:game.time-scar;
  const open=z||scar!==undefined,scale=open?1:.28+phase*.65;
  oval(p.x,.059,p.z,.55*scale,.009,.94*scale,open?'#162725':'#465245');
  const active=!!(w||z),count=quality>0?7:4;
  if(active||age<7)for(let i=0;i<count;i++){
   const a=i*2.399+q.id,reach=(open?.55:.25+phase*.25),bounce=active?Math.abs(Math.sin(game.time*10+i))*phase*.085:0;
   box(p.x+Math.cos(a)*reach,.087+bounce,p.z+Math.sin(a)*reach*1.45,.14+(i%3)*.04,.09,.17,'#5b5947',a);
  }
  if(w){
   glows.push({x:p.x,y:.069,z:p.z,radius:.84+phase*.18,color:'#d4a16b',strength:.12+phase*.12,mode:-.035});
   if(phase>.46){
    const reach=(phase-.46)/.54;
    for(const side of [-1,1]){
     const x=p.x+side*.23,h=.08+reach*.40,zz=p.z-.25;
     arm([x,.025,zz+.15],[x+side*.045,h,zz],.050,'#6a7562');
     oval(x+side*.045,h+.02,zz,.075,.085,.046,'#89907a');
     for(let j=0;j<3;j++)arm([x+side*.045+(j-1)*.040,h+.045,zz],[x+side*.035+(j-1)*.045,h+.16-(j%2)*.025,zz-.045],.014,'#969c82');
    }
   }
  }
  if(active)haze.push({x:p.x,y:.14+risen*.17,z:p.z,radius:.58+phase*.30,color:'#a69878',strength:(w?.13:.20)*(1-risen*.8),mode:2+(game.time*.32+q.id)%1});
 }
 return{parts,glows,haze};
}
function memorialAtmospherePlan(time=0){
 const parts=[],glows=[],shadows=[],ribbons=[],haze=[];
 // Long, low mist stays beyond the fence or over blocked beds, leaving the fighting lanes clear.
 for(const side of [-1,1])for(let i=0;i<5;i++){
  const x=side*(29.5+(i%2)*8)+Math.sin(time*.055+i)*1.2,z=-29+i*13;
  haze.push({x,y:.38,z,radius:4.2+(i%2)*1.3,color:'#8ba6b4',strength:.065+.025*Math.sin(time*.18+i),mode:2+(time*.027+i*.19)%1});
 }
 for(const x of [-3.1,3.1])glows.push({x,y:.18,z:-18.9,radius:2.0,color:'#e8b675',strength:.14+.015*Math.sin(time*2+x),mode:0});
 return{parts,glows,shadows,ribbons,haze,flash:0,jetActive:false,weatherKind:'none'};
}

function cinematicArenaPlan(id='depot',time=0,train=null,camp=null,evac=null,sequence=null,coldSnow=null){
 if(id==='memorial')return memorialAtmospherePlan(time);
 if(id==='evac')return evacuationAtmospherePlan(time,evac);
 if(id==='quarantine')return quarantineAtmospherePlan(time,camp);
 if(id==='pump')return pumpAtmospherePlan(time);
 if(id==='cold')return coldAtmospherePlan(time,coldSnow);
 if(id==='rail')return railAtmospherePlan(time,train);
 const parts=[],glows=[],shadows=[],ribbons=[],haze=[],M=MATERIAL_IDS;
 if(!['depot','breakwater','memorial'].includes(id))return{parts,glows,shadows,ribbons,haze,flash:0,jetActive:false,weatherKind:'none'};
 time=Math.max(0,Number(id==='depot'&&sequence?sequence.sceneTime:time)||0);
 const slip=id==='depot'?depotSlipStrength(sequence):0;
 // The run clock continues during loot. Emitters and flight paths stay in world coordinates.
 const fract=n=>n-Math.floor(n),hash=n=>fract(Math.sin(n*12.9898+(id==='depot'?17:id==='breakwater'?41:73))*43758.5453);
 const add=(mesh,matrix,color,glow=0,material=M.METAL)=>parts.push({mesh,matrix,color,glow,material});
 const box=(x,y,z,sx,sy,sz,color,ry=0,glow=0,material=M.MATTE)=>add('box',model(x,y,z,sx,sy,sz,ry),color,glow,material);
 const ribbon=(a,b,width,opacity,color,mode=2)=>{if(opacity>.002)ribbons.push({a,b,width,opacity,color,mode});};
 const rain=(count,color,opacity,speed,wind,width)=>{
  const columns=20,rows=Math.ceil(count/columns);
  for(let i=0;i<count;i++){
   const depth=hash(i+95),phase=fract(time*speed*(.82+depth*.34)+hash(i)*1.37);
   const x=-27+54*((i%columns)+hash(i+20))/columns+wind*(phase-.5);
   const z=-19+38*(Math.floor(i/columns)+hash(i+60))/rows+.16*phase;
   const length=.22+depth*.26,y=.18+(1-phase)*6.4,fade=Math.min(1,phase*10,(1-phase)*12);
   ribbon({x:x-wind*length/6.4,y:y+length,z:z-.16*length/6.4},{x,y,z},width*(.82+depth*.4),opacity*(.75+depth*.35)*fade,color,3);
   if(i%7===0&&phase>.92){const splash=(phase-.92)/.08;glows.push({x,y:.12,z,radius:.06+splash*.26,color,strength:.32*(1-splash),mode:-.14});}
  }
 };
 if(id==='depot'){
  for(let i=0;i<28;i++){
   const u=fract(hash(i+110)+time*(.009+hash(i+120)*.006)),x=-27+54*u,z=-16+32*hash(i+130)+Math.sin(time*.42+i)*.55,lift=Math.pow(.5+.5*Math.sin(time*.9+i*1.7),5),y=.16+.52*lift+slip*(1.8+.8*hash(i+163)),size=(.12+hash(i+145)*.075)*Math.min(1,u*18,(1-u)*18);
   box(x,y,z,size,.009,size*(.42+hash(i+155)*.25),i%4===0?'#d5cdb8':i%3?'#a39b83':'#bcb292',time*.85+i,0,M.MATTE);
  }
  for(const [i,bx,bz] of [[0,-9,-5],[1,8,6],[2,-8,8],[3,10,-7]]){
   const phase=time*.13+i;
   haze.push({x:bx+Math.sin(phase)*2.0,y:.9,z:bz+Math.cos(phase*.73)*.8,radius:3.8,color:'#b8a17e',strength:.28+.07*Math.sin(phase*.6),mode:2+fract(time*.04+i*.17)});
  }
 }else if(id==='breakwater'){
  rain(600,'#c0d1d6',.50,1.55,4.5,.015);
  for(let i=0;i<16;i++){
   const phase=fract(time*.23+hash(i+150)),edge=i%4,side=edge%2?1:-1,lift=Math.sin(phase*Math.PI),inward=phase*1.8,along=hash(i+170)*2-1;
   const x=edge<2?side*(28.25-inward):along*25,z=edge<2?along*18:side*(21.6-inward),y=-.25+lift*.95;
   haze.push({x,y:y+.65,z,radius:1.4+phase*2.2,color:'#c4d8db',strength:.56*lift,mode:2+fract(time*.04+i*.17)});
   ribbon({x,y:y+.42,z},{x:x+(edge<2?-side*.23:.1),y:y-.08,z:z+(edge>=2?-side*.23:.1)},.028,.52*lift,'#d8edf0');
  }
  for(const [i,x,z] of [[0,-26.4,-10],[1,26.4,9],[2,-26.4,11],[3,26.4,-12]])glows.push({x,y:.06,z,radius:.72,color:i%2?'#f0bf69':'#d96757',strength:.20+.13*Math.max(0,Math.sin(time*2.4+i)),mode:0});
 }else{
  const leafColors=['#ac804e','#977844','#b39362','#8a8855'];
  for(let i=0;i<40;i++){
   const u=fract(hash(i+210)+time*(.008+hash(i+230)*.006)),x=-27+54*u,z=-16+32*hash(i+250)+Math.sin(time*.48+i*1.4)*.68,lift=Math.pow(.5+.5*Math.sin(time*1.1+i*.83),6),y=.16+.48*lift,size=(.095+hash(i+270)*.065)*Math.min(1,u*18,(1-u)*18);
   box(x,y,z,size,.009,size*.46,leafColors[i%leafColors.length],time*.95+i*.71,0,M.PARK_LEAF);
  }
  const banks=[[-17,-6],[-10,1],[11,-8],[17,4],[-5,11],[9,10],[-17,11],[15,-12],[-2,-4],[5,3]];
  for(let i=0;i<banks.length;i++){
   const x=banks[i][0]+Math.sin(time*.15+i)*2.8,z=banks[i][1]+Math.cos(time*.11+i)*1.3,wave=.5+.5*Math.sin(time*.25+i);
   haze.push({x,y:1.05,z,radius:3.8+hash(i+330)*1.1,color:'#bbc8c0',strength:.50+.13*wave,mode:2+fract(time*.04+i*.137)});
  }
 }
 const cfg=id==='depot'?{start:4,period:27,duration:4.6,y:8.2,z:1.2,heading:.08,pair:true,scale:.53}:id==='breakwater'?{start:5.5,period:32,duration:4.8,y:8.0,z:1.4,heading:-.12,pair:false,scale:.56}:{start:7,period:38,duration:4.4,y:8.0,z:1.4,heading:.10,pair:false,scale:.48};
 const elapsed=time-cfg.start,local=elapsed>=0?elapsed%cfg.period:Infinity,jetActive=local<cfg.duration;
 if(jetActive){
  const u=local/cfg.duration,heading=cfg.heading,f={x:Math.cos(heading),z:Math.sin(heading)},r={x:-Math.sin(heading),z:Math.cos(heading)},travel=-36+72*u;
  const jet=(back=0,side=0,scale=1)=>{
   const x=f.x*(travel+back)+r.x*(cfg.z+side),z=f.z*(travel+back)+r.z*(cfg.z+side),y=cfg.y+(side?-.22:0),ry=-heading;
   const pt=(forward,lateral,up=0)=>({x:x+f.x*forward+r.x*lateral,y:y+up,z:z+f.z*forward+r.z*lateral});
   add('cinematicJet',model(x,y-.055*scale,z,.92*scale,.92*scale,.92*scale,ry),'#46575b',0,M.METAL);
   add('pickupWeaponOrb',model(x,y+.015*scale,z,1.26*scale,.15*scale,.18*scale,ry),'#59686b',0,M.METAL);
   let q=pt(1.10*scale,0,.015*scale);add('pickupWeaponOrb',model(q.x,q.y,q.z,.36*scale,.12*scale,.145*scale,ry),'#718083',0,M.METAL);
   q=pt(-.94*scale,0,.15*scale);add('pickupWeaponOrb',model(q.x,q.y,q.z,.31*scale,.18*scale,.045*scale,ry),'#3d4b50',0,M.METAL);
   for(const sideWing of [-1,1]){
    const a=pt(-.72*scale,sideWing*.31*scale,-.11*scale),b=pt(.18*scale,sideWing*.31*scale,-.11*scale),tip=pt(-.10*scale,sideWing*1.08*scale);
    add('pickupCylinder',basisModel(a.x,a.y,a.z,b.x,b.y,b.z,.07*scale,.07*scale),'#303c40',0,M.METAL);
    add('pickupOrb',model(tip.x,tip.y,tip.z,.055*scale,.045*scale,.055*scale),sideWing<0?'#db5d51':'#78c89b',.82,M.GLASS);
    const trail=pt(-5.1*scale,sideWing*.31*scale,-.10*scale);
    ribbons.push({a,b:trail,width:.030*scale,opacity:.12,color:'#bcc9ca',mode:2});
   }
   shadows.push({x:x-f.x*1.15,y:.025,z:z-f.z*1.15,radius:1.75*scale,color:'#071115',strength:.25,mode:0});
  };
  jet(0,0,cfg.scale);if(cfg.pair)jet(-2.4,1.9,cfg.scale*.88);
 }
 let flash=0;
 if(id==='depot'&&sequence?.introTime>=2.65&&sequence.introTime<3.65)flash=.17*Math.pow(1-(sequence.introTime-2.65),2);
 if(id==='breakwater'){
  const phase=time>=3?(time-3)%15:Infinity;
  const pulse=(t,span)=>t>=0&&t<span?Math.min(1,t/.035)*Math.pow(1-t/span,1.5):0;
  // Distant lightning illuminates the scene instead of striking beside the player.
  flash=.30*Math.max(pulse(phase,1.05),.55*pulse(phase-.66,.45));
 }
 return{parts,glows,shadows,ribbons,haze,flash,jetActive,weatherKind:id==='depot'?'wind':id==='breakwater'?'storm':'mist'};
}
function arenaDecor(id='depot'){
 const out=[];
 const add=(kind,x,z,w=1,d=1,h=1,color)=>out.push({kind,x,z,w,d,h,color});
 // Visual-only perimeter dressing. Keep it at edges / against existing geometry so collision remains v19-authoritative.
 for(let x=-22;x<=22;x+=4){add('fence',x,-17.55,3.4,.08,1.35);add('fence',x,17.55,3.4,.08,1.35);}
 for(let z=-13;z<=13;z+=4){add('fence',-24.45,z,.08,3.4,1.35);add('fence',24.45,z,.08,3.4,1.35);}
 const lights=[[-20,-14],[0,-14],[20,-14],[-20,14],[0,14],[20,14]];for(const p of lights)add('light',p[0],p[1],.12,.12,3.2,'#ffd99a');
 if(id==='depot'){
  add('container',-10.8,-8.7,3.3,1.25,1.35,'#556f70');add('container',-7.3,-8.7,3.3,1.25,1.35,'#7e5b4d');
  add('container',10.8,8.9,3.3,1.25,1.35,'#3f6670');add('container',7.3,8.9,3.3,1.25,1.35,'#6f704f');
  add('pallet',-13.8,6.8,1.4,.9,.45);add('pallet',13.8,-6.8,1.4,.9,.45);add('barrier',0,-10.6,3.6,.35,.65);add('barrier',0,10.6,3.6,.35,.65);
  add('sign',-17.5,-9.6,.9,.12,1.8,'#e1b65f');add('sign',17.5,9.6,.9,.12,1.8,'#e1b65f');
  // Busy depot dressing: purely visual, deliberately parked outside the main escape loops.
  add('truck',-18.2,-2.6,4.6,1.75,1.85,'#394f54');add('truck',18.0,3.0,4.2,1.7,1.75,'#665446');
  add('forklift',-8.8,11.5,1.5,1.15,1.55,'#c7933e');add('forklift',8.4,-11.6,1.5,1.15,1.55,'#b67d35');
  for(const p of [[-15.4,9.3],[-14.6,9.8],[14.8,-9.2],[15.7,-9.7],[-4.5,-12.3],[5.2,12.4]])add('drum',p[0],p[1],.48,.48,.8,'#7d5c45');
  for(const p of [[-11.8,12.5],[-10.9,12.5],[10.8,-12.5],[11.7,-12.5],[-2.2,13.1],[2.4,-13.1]])add('cone',p[0],p[1],.28,.28,.55,'#e68447');
  add('crate',-16.3,5.1,1.1,1.1,1,'#6e765f');add('crate',16.2,-5.0,1.1,1.1,1,'#6e6258');
  add('dumpster',-20.8,6.7,1.9,1.05,1.15,'#3f5c58');add('dumpster',20.6,-6.4,1.9,1.05,1.15,'#46534d');
  add('cableReel',-12.7,-12.8,1.0,.72,1.0,'#6d5740');add('cableReel',12.4,12.7,1.0,.72,1.0,'#6d5740');
  add('puddle',-5.8,7.9,2.9,1.35,.02,'#152b31');add('puddle',6.5,-7.8,2.3,1.0,.02,'#182e33');
  add('worklight',-3.8,-11.8,.18,.18,2.3,'#ffe4a6');add('worklight',4.3,11.7,.18,.18,2.3,'#ffe4a6');
 }else if(id==='breakwater'){
  for(let x=-18;x<=18;x+=6)add('crate',x,13.3,1.2,1.2,1.1,'#8f7855');add('barrier',-10,-7.5,4,.3,.55);add('barrier',10,7.5,4,.3,.55);
 }else if(id==='memorial'){
  for(const p of [[-15,-7],[-12,-5],[-9,-8],[12,6],[15,8],[9,8]])add('grave',p[0],p[1],.65,.18,.7,'#8c8f82');
 }else if(id==='pump'){
  add('pipe',-14,-10,4,.35,.5,'#4f6d70');add('pipe',14,10,4,.35,.5,'#4f6d70');add('tank',-16,7,2,2,2.2,'#38585c');add('tank',16,-7,2,2,2.2,'#38585c');
 }else if(id==='cold'){
  for(const x of [-16,-8,0,8,16])add('light',x,0,.12,.12,2.7,'#b6f3ff');add('crate',-18,9,1.5,1.5,1.3,'#9fbac2');add('crate',18,-9,1.5,1.5,1.3,'#9fbac2');
 }else if(id==='rail'){
  for(let x=-22;x<=22;x+=4){add('rail',x,-2.2,3.8,.09,.08,'#6c5543');add('rail',x,2.2,3.8,.09,.08,'#6c5543');}add('signal',-18,-5,.35,.35,2.6,'#d39a62');add('signal',18,5,.35,.35,2.6,'#d39a62');
 }else if(id==='quarantine'){
  for(const p of [[-18,-10],[-9,-10],[0,-10],[9,-10],[18,-10],[-18,10],[-9,10],[0,10],[9,10],[18,10]])add('tent',p[0],p[1],2.2,1.6,1.2,'#626848');
 }else if(id==='evac'){
  add('helipad',0,0,10,10,.02,'#56565a');for(const p of [[-12,-10],[12,-10],[-12,10],[12,10]])add('light',p[0],p[1],.12,.12,3.4,'#f0a35f');
 }
 return out;
}
function m4(){return new Float32Array(16);}function ident(){const o=m4();o[0]=o[5]=o[10]=o[15]=1;return o;}
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),o=m4();o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=(2*far*near)/(near-far);return o;}
function lookAt(e,t,up={x:0,y:1,z:0}){let zx=e.x-t.x,zy=e.y-t.y,zz=e.z-t.z,l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;let xx=up.y*zz-up.z*zy,xy=up.z*zx-up.x*zz,xz=up.x*zy-up.y*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;let yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;const o=ident();o[0]=xx;o[1]=yx;o[2]=zx;o[4]=xy;o[5]=yy;o[6]=zy;o[8]=xz;o[9]=yz;o[10]=zz;o[12]=-(xx*e.x+xy*e.y+xz*e.z);o[13]=-(yx*e.x+yy*e.y+yz*e.z);o[14]=-(zx*e.x+zy*e.y+zz*e.z);return o;}
function model(x,y,z,sx,sy,sz,ry=0){const c=Math.cos(ry),s=Math.sin(ry),o=ident();o[0]=c*sx;o[2]=-s*sx;o[5]=sy;o[8]=s*sz;o[10]=c*sz;o[12]=x;o[13]=y;o[14]=z;return o;}
const BOX_POS=[-1,-1,1,1,-1,1,1,1,1,-1,-1,1,1,1,1,-1,1,1,1,-1,-1,-1,-1,-1,-1,1,-1,1,-1,-1,-1,1,-1,1,1,-1,-1,-1,-1,-1,-1,1,-1,1,1,-1,-1,-1,-1,1,1,-1,1,-1,1,-1,1,1,-1,-1,1,1,-1,1,-1,1,1,1,-1,1,1,1,-1,1,1,1,1,1,1,1,-1,-1,1,1,1,1,-1,-1,1,-1,-1,-1,-1,1,-1,-1,1,-1,1,-1,-1,-1,1,-1,1,-1,-1,1];
const BOX_NORM=[];for(let f=0;f<6;f++){const n=[[0,0,1],[0,0,-1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]][f];for(let i=0;i<6;i++)BOX_NORM.push(...n);}

function createSphereMesh(segments=12,rings=8){
 const positions=[],normals=[];segments=Math.max(6,segments|0);rings=Math.max(4,rings|0);
 const pt=(u,v)=>{const th=u*Math.PI*2,ph=(v-.5)*Math.PI,cp=Math.cos(ph);return [Math.cos(th)*cp,Math.sin(ph),Math.sin(th)*cp];};
 const push=(a)=>{positions.push(...a);normals.push(...a);};
 for(let y=0;y<rings;y++)for(let x=0;x<segments;x++){
  const u0=x/segments,u1=(x+1)/segments,v0=y/rings,v1=(y+1)/rings;
  const a=pt(u0,v0),b=pt(u1,v0),c=pt(u1,v1),d=pt(u0,v1);push(a);push(b);push(c);push(a);push(c);push(d);
 }
 return{positions,normals};
}
function createCylinderMesh(segments=12,topScale=1,bottomScale=1){
 const positions=[],normals=[];segments=Math.max(6,segments|0);const push=(p,n)=>{positions.push(...p);normals.push(...n);};
 for(let i=0;i<segments;i++){
  const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
  const p0=[ca*bottomScale,-1,sa*bottomScale],p1=[cb*bottomScale,-1,sb*bottomScale],p2=[cb*topScale,1,sb*topScale],p3=[ca*topScale,1,sa*topScale];
  const na=[ca,0,sa],nb=[cb,0,sb];push(p0,na);push(p1,nb);push(p2,nb);push(p0,na);push(p2,nb);push(p3,na);
  push([0,-1,0],[0,-1,0]);push(p1,[0,-1,0]);push(p0,[0,-1,0]);push([0,1,0],[0,1,0]);push(p3,[0,1,0]);push(p2,[0,1,0]);
 }
 return{positions,normals};
}
function createConeMesh(segments=12){return createCylinderMesh(segments,.08,1);}
function createWedgeMesh(){
 const v=[[-1,-1,-1],[1,-1,-1],[-1,-1,1],[1,-1,1],[-1,1,1],[1,1,1]],tris=[[0,1,3],[0,3,2],[0,4,5],[0,5,1],[2,3,5],[2,5,4],[0,2,4],[1,5,3]];
 const positions=[],normals=[];for(const t of tris){const a=v[t[0]],b=v[t[1]],c=v[t[2]],ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1,n=[nx/l,ny/l,nz/l];for(const q of [a,b,c]){positions.push(...q);normals.push(...n);}}
 return{positions,normals};
}
function groundDetailPlan(id='depot'){
 const out=[],add=(kind,x,z,w=1,d=1,ry=0,color)=>out.push({kind,x,z,w,d,ry,color});
 if(id==='depot'){
  const stains=[[-15,-8,2.8,1.7,.2],[-7,4,2.2,1.2,-.35],[3,-6,2.6,1.4,.6],[12,7,3.1,1.5,-.15],[17,-3,2.1,1.1,.35],[-18,5,1.9,1.0,-.5]];
  for(const a of stains)add('oilStain',...a,'#172226');
  const cracks=[[-19,-11,3.6,.035,.35],[-12,-2,4.3,.032,-.7],[-4,9,3.8,.03,.25],[4,4,4.6,.035,-.3],[10,-10,3.5,.03,.8],[17,10,3.8,.03,-.55],[-2,-13,2.8,.028,.1],[14,1,2.7,.028,.45],[-16,12,2.6,.028,-.25]];
  for(const a of cracks)add('crack',...a,'#10191b');
  for(const p of [[-10,-5],[0,-5],[10,-5],[-10,5],[0,5],[10,5]])add('drain',p[0],p[1],1.05,.38,0,'#202b2d');
  for(const p of [[-18,0,0],[18,0,Math.PI],[-2,-11,Math.PI/2],[2,11,-Math.PI/2]])add('roadArrow',p[0],p[1],2.1,.46,p[2],'#77755e');
  for(const p of [[-13,13],[13,-13],[-5,-10],[5,10]])add('patch',p[0],p[1],2.4,1.7,.3,'#29383a');
 } else {
  for(const p of [[-10,-6],[7,5],[-2,10]])add('oilStain',p[0],p[1],2.3,1.2,.2,'#182326');
  for(const p of [[-14,4,3,.03,.4],[9,-8,3.5,.03,-.3],[2,2,2.8,.03,.8]])add('crack',...p,'#10191b');
 }
 return out;
}
function buildingTopDetailPlan(o){
 const r=obstacleToWorld(o);if(r.w*r.d<=8)return[];const y=buildingHeight(o)+.16,out=[];
 out.push({kind:'acUnit',x:r.x-r.w*.20,z:r.z-r.d*.12,w:Math.min(.9,r.w*.18),d:Math.min(.72,r.d*.22),h:.38,y,color:'#596566'});
 out.push({kind:'skylight',x:r.x+r.w*.18,z:r.z+r.d*.06,w:Math.min(1.2,r.w*.22),d:Math.min(.62,r.d*.18),h:.12,y,color:'#608087'});
 out.push({kind:'duct',x:r.x+r.w*.02,z:r.z-r.d*.18,w:.42,d:.42,h:.7,y,color:'#657273'});
 if(r.w>5.8)out.push({kind:'roofPipe',x:r.x-r.w*.34,z:r.z+r.d*.22,w:.18,d:.18,h:.95,y,color:'#6b7370'});
 return out;
}
function zombieVisualProfile(kind='walker',id=0,hunter=false){
 const n=Math.abs(id|0)%3;let s;
 if(kind==='brute')s={body:n?'#77695c':'#806b5c',chest:'#8d7866',head:'#c2af8c',legs:'#3c3832',arms:'#b4a082',scale:1.36,glow:.18};
 else if(kind==='runner')s={body:n===0?'#8a5b50':n===1?'#805f54':'#7a5149',chest:'#a06f5e',head:'#c7ad87',legs:'#433735',arms:'#bd9f7e',scale:.9,glow:.24};
 else s={body:n===0?'#667b72':n===1?'#6c785e':'#707365',chest:'#829188',head:'#c1b99a',legs:'#35413f',arms:'#b5b18e',scale:1,glow:.18};
 if(hunter)return{...s,body:'#7c4047',chest:'#9a4d51',head:'#c99e83',arms:'#bd8878',scale:s.scale*1.03,glow:1.35,hunter:true};return s;
}
function actorReadabilityScale(kind='walker'){
 if(kind==='player')return 1.32;
 if(kind==='brute')return 1.27;
 if(kind==='hunter')return 1.32;
 if(kind==='runner')return 1.24;
 return 1.26;
}
function zombieArcadeProfile(kind='walker',hunter=false){
 if(hunter)return{strideScale:1.28,cadence:1.22,forwardLean:.24,shoulderScale:1.18,headScale:.95,armSwing:1.35,hitKick:1.25};
 if(kind==='runner')return{strideScale:1.20,cadence:1.16,forwardLean:.18,shoulderScale:1.02,headScale:.96,armSwing:1.25,hitKick:1.12};
 if(kind==='brute')return{strideScale:.90,cadence:.82,forwardLean:.08,shoulderScale:1.28,headScale:1.08,armSwing:.82,hitKick:.72};
 return{strideScale:1,cadence:1,forwardLean:.11,shoulderScale:1,headScale:1,armSwing:1,hitKick:1};
}
function buildZombiePosePlan(z,motion,now=0){
 const style=zombieVisualProfile(z.kind||'walker',z.id||0,!!z.hunter),profile=zombieArcadeProfile(z.kind||'walker',!!z.hunter);
 const p=simToWorld(z.x,z.y),baseFacing=Number.isFinite(motion?.displayAngle)?motion.displayAngle:(z.aim||0),scale=style.scale*actorReadabilityScale(z.hunter?'hunter':(z.kind||'walker'));
 const attackReach=z.attack?.38*scale:0,hitBack=clamp(motion?.hitKick||0,0,1)*.10*scale,death=clamp((motion?.deathAge||0)/.28,0,1),poseFacing=baseFacing+hitBack*.35,a=poseFacing;
 const f={x:Math.cos(a),z:Math.sin(a)},r={x:-Math.sin(a),z:Math.cos(a)};
 const gait=distanceGroundedGait((motion?.travel||0)*profile.cadence,Math.abs(motion?.speed||0)*SCALE,scale,.66*scale*profile.strideScale);
 const lean=profile.forwardLean*scale,chestForward=lean+attackReach*.16-hitBack;
 const rootY=lerp(.67*scale,.18*scale,death),pelvis={x:p.x+f.x*lean*.15,y:rootY+gait.bodyBob,z:p.z+f.z*lean*.15};
 const chest={x:p.x+f.x*chestForward,y:lerp(1.18*scale,.30*scale,death)+gait.bodyBob,z:p.z+f.z*chestForward};
 const head={x:chest.x+f.x*.16*scale,y:lerp(1.68*scale,.35*scale,death)+gait.bodyBob,z:chest.z+f.z*.16*scale};
 const parts=[],add=(name,mesh,matrix,color,material=MATERIAL_IDS.ORGANIC,glow=0)=>parts.push({name,mesh,matrix,color,material,glow,actorId:z.id||0});
 add('pelvis','torso',model(pelvis.x,pelvis.y,pelvis.z,.27*scale,.22*scale,.19*scale,a),style.legs);
 add('torso','torso',model(chest.x,chest.y,chest.z,.37*scale*profile.shoulderScale,.40*scale,.23*scale,a),style.body,MATERIAL_IDS.ORGANIC,style.glow*.16+hitBack*3.5);
 add('head','sphere',model(head.x,head.y,head.z,.22*scale*profile.headScale,.27*scale,.21*scale*profile.headScale,a),style.head,MATERIAL_IDS.ORGANIC,hitBack*2.4);
 add('jaw','sphere',model(head.x+f.x*.085*scale,head.y-.135*scale,head.z+f.z*.085*scale,.16*scale,.075*scale,.15*scale,a),style.arms,MATERIAL_IDS.ORGANIC,hitBack*.8);
 add('wound','sphere',model(chest.x+r.x*.19*scale,chest.y+.025*scale,chest.z+r.z*.19*scale,.075*scale,.045*scale,.035*scale,a),'#9b2f29',MATERIAL_IDS.WET,.32+hitBack*1.2);
 const shY=lerp(1.34*scale,.32*scale,death)+gait.bodyBob,hipY=lerp(.68*scale,.22*scale,death)+gait.bodyBob;
 for(const side of [-1,1]){
  const foot=side<0?gait.left:gait.right,hip={x:pelvis.x+r.x*.16*scale*side,y:hipY,z:pelvis.z+r.z*.16*scale*side};
  const knee={x:hip.x+f.x*foot.forward*.58,y:lerp(.39*scale,.16*scale,death)+foot.lift*.42,z:hip.z+f.z*foot.forward*.58};
  const ankle={x:hip.x+f.x*foot.forward,y:.10*scale+foot.lift,z:hip.z+f.z*foot.forward};
  add(side<0?'thighL':'thighR','cylinder',basisModel(hip.x,hip.y,hip.z,knee.x,knee.y,knee.z,.095*scale,.095*scale),style.legs);
  add(side<0?'shinL':'shinR','cylinder',basisModel(knee.x,knee.y,knee.z,ankle.x,ankle.y,ankle.z,.082*scale,.082*scale),style.legs);
  add(side<0?'footL':'footR','sphere',model(ankle.x+f.x*.08*scale,.07*scale+foot.lift,ankle.z+f.z*.08*scale,.11*scale,.07*scale,.20*scale,a),style.legs);
  const shoulder={x:chest.x+r.x*.34*scale*profile.shoulderScale*side,y:shY,z:chest.z+r.z*.34*scale*profile.shoulderScale*side},swing=Math.sin((motion?.travel||0)*4.2+side*Math.PI)*.14*scale*profile.armSwing;
  const attackBias=z.attack?attackReach*(side<0?1:.72):0,elbow={x:shoulder.x+f.x*(.12*scale+swing+attackBias*.45),y:lerp(1.05*scale,.28*scale,death)+gait.bodyBob,z:shoulder.z+f.z*(.12*scale+swing+attackBias*.45)};
  const reach=.13*scale+attackBias,hand={x:elbow.x+f.x*reach,y:lerp((z.attack?1.10:.83)*scale,.25*scale,death)+gait.bodyBob,z:elbow.z+f.z*reach};
  add(side<0?'shoulderL':'shoulderR','sphere',model(shoulder.x,shoulder.y,shoulder.z,.115*scale,.105*scale,.115*scale,a),style.body,MATERIAL_IDS.ORGANIC,style.glow*.12);
  add(side<0?'upperArmL':'upperArmR','cylinder',basisModel(shoulder.x,shoulder.y,shoulder.z,elbow.x,elbow.y,elbow.z,.075*scale,.075*scale),style.arms);
  add(side<0?'foreArmL':'foreArmR','cylinder',basisModel(elbow.x,elbow.y,elbow.z,hand.x,hand.y,hand.z,.065*scale,.065*scale),style.arms);
 }
 return{parts,shadow:{x:p.x,z:p.z,sx:.54*scale,sz:.36*scale},silhouette:{height:lerp(1.95*scale,.72*scale,death),width:.84*scale*profile.shoulderScale,lean}};
}
function buildPlayerPosePlan(p,motion={}){return DeadwatchSurvivor.poseInfo(p,motion);}
function createEffectPool(capacity=256){
 const cap=Math.max(1,capacity|0),items=new Array(cap).fill(null),free=Array.from({length:cap},(_,i)=>cap-1-i);let cursor=0;
 return{
  spawn(v){let i=free.length?free.pop():cursor++%cap;items[i]={...v};return true;},
  update(dt){for(let i=0;i<items.length;i++){const e=items[i];if(!e)continue;if(e.fresh){e.fresh=false;continue;}e.life-=dt;if(e.life<=0){items[i]=null;free.push(i);}}},
  active(){const out=[];for(const e of items)if(e)out.push(e);return out;},
  activeCount(){let n=0;for(const e of items)if(e)n++;return n;}
 };
}
const ARCADE_FX_MAX_LIFE=Object.freeze({muzzle:.06,tracer:.08,impact:.10,hit:.14,blood:.24,blast:.65,nuke:1.10,boost:.55,dashBurst:.24,dashTrail:.24,pickupPulse:.55,voidImpact:.60});
function arcadeTracerSegment(a,b,progress=0,maxLen=3.1){
 const dx=b.x-a.x,dz=b.z-a.z,full=Math.hypot(dx,dz);
 if(full<1e-6)return{a:{...a},b:{...b},length:0};
 const ux=dx/full,uz=dz/full,streak=Math.min(full,Math.max(.9,Math.min(maxLen,full*.26)));
 const head=Math.min(full,Math.max(streak,full*clamp(progress,0,1))),tail=Math.max(0,head-streak);
 return{a:{x:a.x+ux*tail,z:a.z+uz*tail},b:{x:a.x+ux*head,z:a.z+uz*head},length:head-tail};
}
function projectedScreenFraction(worldHeight,distance,fov){
 const h=Math.max(0,Number(worldHeight)||0),d=Math.max(.001,Number(distance)||0),vf=Math.max(.1,Number(fov)||Math.PI/3);
 return clamp(h/(2*d*Math.tan(vf/2)),0,1);
}
function buildEffectInstancePlan(effects=[]){
 const out={opaque:[],emissive:[],rings:[],glows:[]};
 for(const e of effects){
  const firstRing=out.rings.length;
  const age=1-clamp((e.life||0)/Math.max(.001,e.max||1),0,1),p=e.worldP?{x:e.worldP.x,z:e.worldP.z}:e.x!=null?simToWorld(e.x,e.y):null;
  if(e.kind==='dashTrail'&&e.a&&e.b){
   const a=simToWorld(e.a.x,e.a.y),b=simToWorld(e.b.x,e.b.y),dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz),fade=(1-age)*(1-age);
   if(n<.001||fade<=0)continue;
   const sx=-dz/n,sz=dx/n;
   for(const side of [-1,0,1]){
    const offset=side*.14;
    out.emissive.push({kind:side?'tracerGlow':'tracerCore',a:{x:a.x+sx*offset*.45,y:(e.a.height||0)+.16,z:a.z+sz*offset*.45},b:{x:b.x+sx*offset,y:(e.b.height||0)+.20,z:b.z+sz*offset},radius:(side?.026:.018)*fade,color:side?(e.color||'#a1e5df'):'#eafffa',glow:(side?.8:1.5)*fade});
   }
   continue;
  }
  if(e.kind==='bulletRibbon'||e.kind==='bulletImpact'||(e.kind==='muzzle'&&e.worldP))continue;
  if(e.kind==='animalWater'&&e.b){
   const a=simToWorld(e.x,e.y),b=simToWorld(e.b.x,e.b.y),fade=1-age;
   const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),start=Math.min(.95,length*.3)/Math.max(.01,length),point=t=>({x:lerp(a.x,b.x,t)-dz/Math.max(.01,length)*Math.sin(t*38+age*17)*.065*t,z:lerp(a.z,b.z,t)+dx/Math.max(.01,length)*Math.sin(t*38+age*17)*.065*t});
   for(let j=0;j<9;j++){const t=start+(1-start)*j/9,end=Math.min(1,t+(1-start)*.073),u=point(t),v=point(end);out.emissive.push({kind:'tracerGlow',a:u,b:v,y:1.18+Math.sin(t*Math.PI)*.12,radius:(.047+.025*t)*fade,color:j%2?'#a8dee2':'#70b9cf',glow:.22});}
   for(let j=0;j<8;j++){const t=start+(1-start)*((j+age)/8),q=point(t);out.emissive.push({kind:'orb',x:q.x,y:1.18+Math.sin(j*3+age*8)*.09,z:q.z,scale:(.06+.035*t)*fade,color:'#a8dde6',glow:.20});}
   out.glows.push({x:b.x,y:.05,z:b.z,radius:.25+age*.7,color:'#81eaf0',strength:.3*fade,mode:-.15});continue;
  }
  if(e.kind==='animalSplash'&&p){
   const fade=1-age,color=e.animal==='monkey'?'#ffd65e':'#d8d2b4',radius=(e.radius||40)*SCALE;
   out.glows.push({x:p.x,y:.05,z:p.z,radius:.18+age*radius,color,strength:.55*fade,mode:-.09});
   for(let j=0;j<7;j++){const a=j/7*Math.PI*2;out.emissive.push({kind:'orb',x:p.x+Math.cos(a)*age*radius*.7,y:.16+Math.sin(age*Math.PI)*.6,z:p.z+Math.sin(a)*age*radius*.7,scale:.09*fade,color,glow:.25});}continue;
  }
  if(e.kind==='tracer'&&e.a&&e.b){
   const a=e.worldA?{x:e.worldA.x,z:e.worldA.z}:simToWorld(e.a.x,e.a.y),b=simToWorld(e.b.x,e.b.y);
   const maxLen=e.weapon==='deathmachine'?1.95:e.weapon==='ray'?1.18:1.45;
   const glowRadius=e.weapon==='deathmachine'?.060:e.weapon==='ray'?.050:.046;
   const coreRadius=e.weapon==='deathmachine'?.022:e.weapon==='ray'?.018:.016;
   const streak=arcadeTracerSegment(a,b,age,maxLen),color=e.color||'#ffe9b0',core=e.coreColor||(e.weapon==='ray'?'#d7ffe8':'#fff7d6'),y=Number.isFinite(e.worldA?.y)?e.worldA.y:1.18;
   out.emissive.push({kind:'tracerGlow',a:streak.a,b:streak.b,y,color,radius:glowRadius,glow:e.weapon==='ray'?1.55:.90});
   out.emissive.push({kind:'tracerCore',a:streak.a,b:streak.b,y,color:core,radius:coreRadius,glow:e.weapon==='ray'?2.6:2.0});
   continue;
  }
  if(!p)continue;
  if(e.kind==='voidImpact'){
   const v=Voidcaster.style(e);
   out.rings.push({x:p.x,z:p.z,radius:2.6*age+.25,width:.10,color:v.color,glow:1.3,alpha:Math.pow(1-age,.8)});
   continue;
  }
  if(e.kind==='muzzle'){
   const y=Number.isFinite(e.worldP?.y)?e.worldP.y:1.22,dir=e.worldDir||{x:1,z:0},flash=e.weapon==='deathmachine'?.18:e.weapon==='ray'?.15:.13;
   out.emissive.push({kind:'orb',x:p.x,y,z:p.z,scale:(e.weapon==='deathmachine'?.19:e.weapon==='ray'?.16:.15)*(1-age),color:e.color||'#ffd989',glow:e.weapon==='ray'?2.2:1.95});
   out.emissive.push({kind:'tracerGlow',a:{x:p.x,z:p.z},b:{x:p.x+dir.x*flash,z:p.z+dir.z*flash},y,color:e.color||'#ffd989',radius:e.weapon==='deathmachine'?.082:.065,glow:e.weapon==='ray'?1.7:1.15});
   out.emissive.push({kind:'tracerCore',a:{x:p.x,z:p.z},b:{x:p.x+dir.x*(flash*.72),z:p.z+dir.z*(flash*.72)},y,color:e.weapon==='ray'?'#d7ffe8':'#fff7d6',radius:e.weapon==='deathmachine'?.030:.022,glow:2.4});
  }
  else if(e.kind==='impact'){
   out.emissive.push({kind:'hit',x:p.x,y:.22,z:p.z,scale:(e.scale||1)*(.12+age*.12),color:e.color||'#ffc96f',glow:1.45});
   out.rings.push({x:p.x,z:p.z,radius:.10+age*.28,width:.045,color:e.color||'#ffc96f',glow:1.1});
  }
  else if(e.kind==='hit') out.emissive.push({kind:'hit',x:p.x,y:.62,z:p.z,scale:(e.scale||1)*(.11+age*.10),color:e.color||'#fff0d0',glow:1.3});
  else if(e.kind==='blood') out.emissive.push({kind:'blood',x:p.x,y:.18,z:p.z,scale:(e.scale||1)*(.15+age*.16),color:e.color||'#7d211e',glow:.12});
  else if(e.kind==='nuke'){
   const fade=1-age,sweep=1-fade*fade,hot=Math.max(0,1-age/.30);
   // Transparent light and fire; no opaque blast shell covering the survivor.
   out.glows.push({x:p.x,y:.055,z:p.z,radius:1.2+sweep*8,color:'#ffd077',strength:1.45*fade*fade,mode:0});
   out.glows.push({x:p.x,y:.40+age*.70,z:p.z,radius:.65+sweep*2.6,color:hot>0?'#fff5d3':'#ffad54',strength:2.4*fade*fade,mode:1});
   if(hot>0)out.glows.push({x:p.x,y:.7,z:p.z,radius:1.15+sweep*3.0,color:'#fffbea',strength:hot*2.8,mode:1});
   for(let i=0;i<12;i++){
    const a=i*Math.PI/6+.17,r=.65+Math.pow(age,.58)*(3.6+(i%3)*.6);
    out.glows.push({x:p.x+Math.cos(a)*r,y:.25+Math.sin(age*Math.PI)*(.7+(i%3)*.15),z:p.z+Math.sin(a)*r,radius:.32+age*.82,color:i%3?'#ffba64':'#ffe2a3',strength:.90*Math.pow(fade,2.1),mode:1});
   }
   out.rings.push({x:p.x,z:p.z,radius:.60+sweep*24,width:.18+fade*.20,color:'#fff4cc',glow:1.20,alpha:Math.pow(fade,.45),soft:true});
   out.rings.push({x:p.x,z:p.z,radius:.55+sweep*22.8,width:.50+fade*.30,color:'#ffb35c',glow:.55,alpha:fade,soft:true});
  }
  else if(e.kind==='boost'||e.kind==='dashBurst'){
   const color=e.color||'#a1e5df',heading=Number.isFinite(e.heading)?e.heading:0,fade=(1-age)*(1-age);
   out.glows.push({x:p.x-Math.cos(heading)*.18,y:.08,z:p.z-Math.sin(heading)*.18,radius:.20+age*.38,color,strength:.38*fade,mode:0});
   out.emissive.push({kind:'orb',x:p.x,y:.17,z:p.z,scale:.09*fade,color:'#eafffa',glow:1.25*fade});
   out.rings.push({x:p.x,z:p.z,radius:.16+age*.65,width:.07,color,glow:.70,alpha:fade,soft:true});
  }
  else if(e.kind==='blast'||e.kind==='pickupPulse'){const pickup=e.kind==='pickupPulse';out.rings.push({x:p.x,z:p.z,radius:(pickup?1.9:2.6)*age+.25,width:pickup?.08:.10,color:e.color||'#ffb45f',glow:pickup?1.35:1.3});}
  for(let i=firstRing;i<out.rings.length;i++)out.rings[i].alpha=(out.rings[i].alpha??1)*Math.pow(1-age,.8);
 }
 return out;
}
function pickupPresentation(type='ammo',age=0,importance=0){
 const pulse=.92+.08*Math.sin(age*5.5),spin=age*2.8;
 const high=importance>=2,mid=importance===1;
 return{scale:(high?1.55:mid?1.3:1)*pulse,glow:high?1.8:mid?1.35:.85,spin,beaconHeight:high?2.8:mid?2.0:.8,bob:.08+.06*Math.sin(age*4.2)};
}
function actorAccessoryPlan(opts={}){
 if(opts.player)return[
  {name:'helmet',primitive:'sphere'},{name:'shoulderL',primitive:'sphere'},{name:'shoulderR',primitive:'sphere'},
  {name:'chestStrap',primitive:'cylinder'},{name:'belt',primitive:'cylinder'},{name:'kneeL',primitive:'sphere'},{name:'kneeR',primitive:'sphere'}
 ];
 if(opts.zombie)return[
  {name:'wound',primitive:'sphere'},{name:'tornCloth',primitive:'taperedCylinder'},{name:'jaw',primitive:'sphere'}
 ];
 return[];
}
function depotAtmospherePlan(id='depot'){
 const out=[],add=(kind,x,z,w=1,d=1,ry=0,color)=>out.push({kind,x,z,w,d,ry,color});
 if(id==='depot'){
  for(const p of [[-20,-14,2.8],[0,-14,3.0],[20,-14,2.8],[-20,14,2.8],[0,14,3.0],[20,14,2.8]])add('lightPool',p[0],p[1],p[2],p[2]*.7,0,'#5a4827');
  for(const p of [[-8.8,-10.5,3.2,.32,0],[8.8,10.5,3.2,.32,0],[-18.5,4.5,2.6,.3,Math.PI/2],[18.5,-4.5,2.6,.3,Math.PI/2]])add('hazardStripe',...p,'#bd8b37');
  for(const p of [[-15,-1,4.8,.075,.12],[-15.2,-.5,4.8,.075,.12],[13,5,5.2,.075,-.28],[13.2,5.5,5.2,.075,-.28]])add('tireMark',...p,'#12191a');
  for(const p of [[-7.5,-7.7],[7.5,7.8],[-17,11],[17,-11]])add('steamVent',p[0],p[1],.34,.34,0,'#718487');
  add('lightPool',-3.8,-11.8,2.1,1.4,0,'#6d5327');add('lightPool',4.3,11.7,2.1,1.4,0,'#6d5327');
 }else{
  for(const p of [[-12,-10],[12,10]])add('lightPool',p[0],p[1],2.4,1.6,0,'#493d27');
  for(const p of [[-9,7],[10,-6]])add('tireMark',p[0],p[1],3.8,.07,.25,'#12191a');
 }
 return out;
}
function actorMeshPlan(opts={}){
 const parts=[
  {name:'pelvis',primitive:'taperedCylinder'},{name:'torso',primitive:'taperedCylinder'},{name:'head',primitive:'sphere'},
  {name:'neck',primitive:'cylinder'},{name:'upperArmL',primitive:'cylinder'},{name:'upperArmR',primitive:'cylinder'},
  {name:'foreArmL',primitive:'cylinder'},{name:'foreArmR',primitive:'cylinder'},{name:'handL',primitive:'sphere'},{name:'handR',primitive:'sphere'},
  {name:'thighL',primitive:'cylinder'},{name:'thighR',primitive:'cylinder'},{name:'shinL',primitive:'cylinder'},{name:'shinR',primitive:'cylinder'},
  {name:'footL',primitive:'sphere'},{name:'footR',primitive:'sphere'}
 ];
 if(opts.armed)parts.push({name:'vest',primitive:'taperedCylinder'},{name:'backpack',primitive:'sphere'});
 if(opts.zombie)parts.push({name:'jaw',primitive:'sphere'},{name:'wound',primitive:'sphere'});
 return parts;
}
const ROUND_PROP_KINDS=Object.freeze(['drum','cone','cableReel','pipe','tank','truckWheel']);
function carbineMeshPlan(){return[
 {name:'stockPad',primitive:'box'},{name:'stock',primitive:'cone'},{name:'receiver',primitive:'box'},{name:'handguard',primitive:'cylinder'},
 {name:'magazine',primitive:'cylinder'},{name:'pistolGrip',primitive:'cylinder'},{name:'foregrip',primitive:'cylinder'},
 {name:'barrel',primitive:'cylinder'},{name:'optic',primitive:'cylinder'},{name:'frontSight',primitive:'cylinder'},{name:'muzzle',primitive:'cylinder'}
];}
function carbineDetailPlan(origin,a,scale=1,color='#4a5552'){
 const x=origin.x,y=origin.y,z=origin.z,f={x:Math.cos(a),z:Math.sin(a)},r={x:-Math.sin(a),z:Math.cos(a)},pt=(df,dr,dy)=>({x:x+f.x*df*scale+r.x*dr*scale,y:y+dy*scale,z:z+f.z*df*scale+r.z*dr*scale});
 const parts=[],seg=(name,A,B,rad,col,glow=0,mesh='cylinder',rz=rad,material=MATERIAL_IDS.METAL)=>parts.push({name,kind:'segment',A,B,rad,rz,color:col,glow,mesh,material}),boxp=(name,c,sx,sy,sz,col,glow=0,material=MATERIAL_IDS.METAL)=>parts.push({name,kind:'box',c,sx:sx*scale,sy:sy*scale,sz:sz*scale,color:col,glow,ry:a,material});
 boxp('receiver',pt(.04,0,0),.43,.155,.125,color,.035);
 boxp('receiverWearA',pt(.055,.066,.040),.155,.010,.021,'#8d8a76',.018,MATERIAL_IDS.METAL);
 boxp('receiverWearB',pt(.145,-.066,-.026),.115,.010,.018,'#747566',.012,MATERIAL_IDS.METAL);
 seg('stock',pt(-.18,0,0),pt(-.47,0,0),.092*scale,'#303938',0,'cone',.072*scale);
 boxp('stockPad',pt(-.505,0,0),.075,.205,.155,'#302821',0,MATERIAL_IDS.LEATHER);
 seg('handguard',pt(.22,0,0),pt(.62,0,0),.058*scale,'#3c4846',.025,'torso',.048*scale);
 boxp('topRail',pt(.40,0,.055),.38,.025,.078,'#1a2222',.02);
 boxp('handguardWear',pt(.455,.058,.015),.165,.009,.016,'#72766a',.010,MATERIAL_IDS.METAL);
 seg('barrel',pt(.58,0,0),pt(.98,0,0),.023*scale,'#232a29',.018);
 seg('magazine',pt(.015,-.025,-.055),pt(.075,-.025,-.33),.060*scale,'#252b2a',0,'torso',.045*scale);
 seg('pistolGrip',pt(-.035,-.030,-.045),pt(-.085,-.030,-.245),.050*scale,'#202625',0,'cylinder',.050*scale,MATERIAL_IDS.RUBBER);
 seg('foregrip',pt(.315,.018,-.015),pt(.315,.018,-.17),.044*scale,'#202625',0,'cylinder',.044*scale,MATERIAL_IDS.RUBBER);
 seg('optic',pt(.09,0,.095),pt(.235,0,.095),.036*scale,'#111919',.05,'torso',.029*scale);
 seg('frontSight',pt(.77,0,.025),pt(.77,0,.115),.022*scale,'#161d1c',.025);
 seg('muzzle',pt(.95,0,0),pt(1.03,0,0),.033*scale,'#161c1b',.025);
 return{parts,supportGrip:pt(.315,.018,-.075),triggerGrip:pt(-.050,-.030,-.085),muzzle:pt(1.03,0,0),stockEnd:pt(-.505,0,0)};
}
function basisModel(ax,ay,az,bx,by,bz,sx=1,sz=1){
 const mx=(ax+bx)/2,my=(ay+by)/2,mz=(az+bz)/2,dyx=bx-ax,dyy=by-ay,dyz=bz-az,len=Math.hypot(dyx,dyy,dyz)||1;
 const yx=dyx/len,yy=dyy/len,yz=dyz/len;let tx=0,ty=1,tz=0;if(Math.abs(yy)>.92){tx=1;ty=0;tz=0;}
 let xx=ty*yz-tz*yy,xy=tz*yx-tx*yz,xz=tx*yy-ty*yx,l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;
 let zx=yy*xz-yz*xy,zy=yz*xx-yx*xz,zz=yx*xy-yy*xx;
 const o=ident();o[0]=xx*sx;o[1]=xy*sx;o[2]=xz*sx;o[4]=yx*len/2;o[5]=yy*len/2;o[6]=yz*len/2;o[8]=zx*sz;o[9]=zy*sz;o[10]=zz*sz;o[12]=mx;o[13]=my;o[14]=mz;return o;
}
function hex(c){if(Array.isArray(c))return c;const n=parseInt((c||'#ffffff').replace('#',''),16);return[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];}
function groupInstances(items=[]){
 const map=new Map();
 for(const item of items){
  const key=`${item.mesh}|${item.material}`;
  let g=map.get(key);if(!g){g={mesh:item.mesh,material:item.material,items:[]};map.set(key,g);}g.items.push(item);
 }
 return [...map.values()];
}
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
// Four nearby environment lights bound the fragment cost on phones.
function arenaLightState(plan,time,power,origin,sequence=null){
 const positions=new Float32Array(16),colors=new Float32Array(12),fixtures=plan?.fixtures||[];
 const levels=fixtures.map(f=>{
  const normal=f.powered?(power?.94:.20):(.64+.13*Math.sin(time*2.5+f.phase)+.04*Math.sin(time*8.7+f.phase));
  const t=sequence?.powerTime??-1;if(t<0)return normal;
  const sector=(f.x<0?0:1)+(f.z<0?2:0),delay=.35+sector*.43;
  return f.powered?lerp(.12,normal,clamp((t-delay)/.30,0,1)):lerp(.26,normal,clamp((t-.30)/1.05,0,1));
 });
 const nearest=fixtures.map((f,i)=>({f,i,d:Math.hypot(f.x-origin.x,f.z-origin.z)})).sort((a,b)=>a.d-b.d).slice(0,4);
 nearest.forEach(({f,i},n)=>{positions.set([f.x,f.y,f.z,f.radius],n*4);colors.set(hex(f.color).map((c,k)=>lerp(c,[.82,.27,.18][k],depotSlipStrength(sequence)*.55)*levels[i]*1.5*(f.intensity??1)),n*3);});
 return {positions,colors,levels,enabled:plan?1:0};
}
function combatLightState(state,game,motion={}){
 const p=game.player;if(!p)return state;
 const kind=game.arcade?.vehicle||game.arcade?.weapon||'carbine';
 const flash=kind==='tank'?clamp(((p.fireCooldown||0)-.30)/.12,0,1):clamp((p.recoil||0)/.09,0,1);
 if(flash<=.001)return state;
 const world=powerupPose(game,motion).muzzleWorld,color=kind==='ray'?Voidcaster.style(game.arcade).color:'#ffcc86',radius=kind==='tank'?5.5:3.8;
 state.positions.set([world.x,world.y,world.z,radius],12);state.colors.set(hex(color).map(v=>v*flash*1.35),9);state.enabled=state.enabled||1;
 state.muzzleGlow={x:world.x,y:(p.groundHeight||0)+.047,z:world.z,radius:kind==='tank'?1.8:1.12,color,strength:flash*.20,mode:0};return state;
}
const ARENA_LIGHT_GLSL=`
uniform float uEnvEnabled;
uniform vec4 uEnvPositions[4];
uniform vec3 uEnvColors[4];
highp float envHash(highp vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
highp float envNoise(highp vec2 p){highp vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(envHash(i),envHash(i+vec2(1,0)),f.x),mix(envHash(i+vec2(0,1)),envHash(i+vec2(1,1)),f.x),f.y);}
vec3 environmentLight(vec3 w,vec3 n){vec3 sum=vec3(0);for(int i=0;i<4;i++){vec3 delta=uEnvPositions[i].xyz-w;float dist=length(delta),radius=max(uEnvPositions[i].w,.01);float fall=max(0.,1.-dist/radius);float diffuse=max(.08,dot(n,delta/max(dist,.01)));sum+=uEnvColors[i]*fall*fall*diffuse;}return sum;}
`;

// Static directional shadow map: rendered once per dock scene, then reused as the camera moves.
class DockShadowMap{
 constructor(gl,renderer,parts,direction=[38,86,22],span=[55,48]){
  this.gl=gl;this.size=1024;this.ready=false;
  const vs=`#version 300 es
  layout(location=0) in vec3 aPos;layout(location=2) in vec4 m0;layout(location=3) in vec4 m1;layout(location=4) in vec4 m2;layout(location=5) in vec4 m3;
  uniform mat4 uLight;void main(){gl_Position=uLight*mat4(m0,m1,m2,m3)*vec4(aPos,1.);}`;
  const fs=`#version 300 es
  precision mediump float;out vec4 outColor;void main(){outColor=vec4(1);}`;
  const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  const ortho=ident();ortho[0]=1/span[0];ortho[5]=1/span[1];ortho[10]=-2/169;ortho[14]=-171/169;
  const lv=lookAt({x:direction[0],y:direction[1],z:direction[2]},{x:0,y:0,z:0});this.matrix=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)this.matrix[col*4+row]+=ortho[k*4+row]*lv[col*4+k];
  this.texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0+3);gl.bindTexture(gl.TEXTURE_2D,this.texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,this.size,this.size,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.texture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);gl.deleteFramebuffer(fb);gl.deleteProgram(p);return;}
  gl.viewport(0,0,this.size,this.size);gl.colorMask(false,false,false,false);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(p);gl.uniformMatrix4fv(gl.getUniformLocation(p,'uLight'),false,this.matrix);
  const groups=new Map();
  for(const part of parts){if(part.cast===false)continue;const m=part.matrix,vertical=Math.abs(m[1])+Math.abs(m[5])+Math.abs(m[9]);if(m[13]+vertical<.20)continue;const axes=[Math.hypot(m[0],m[1],m[2]),Math.hypot(m[4],m[5],m[6]),Math.hypot(m[8],m[9],m[10])].sort((a,b)=>a-b);if(axes[1]<.10)continue;let a=groups.get(part.mesh);if(!a){a=[];groups.set(part.mesh,a);}a.push(m);}
  for(const [name,matrices] of groups){
   const mesh=renderer.meshes.get(name);if(!mesh)continue;
   const vao=gl.createVertexArray(),ib=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.posBuffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
   const data=new Float32Array(matrices.length*16);matrices.forEach((m,i)=>data.set(m,i*16));gl.bindBuffer(gl.ARRAY_BUFFER,ib);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   for(let i=0;i<4;i++){gl.enableVertexAttribArray(i+2);gl.vertexAttribPointer(i+2,4,gl.FLOAT,false,64,i*16);gl.vertexAttribDivisor(i+2,1);}
   gl.drawArraysInstanced(gl.TRIANGLES,0,mesh.count,matrices.length);gl.bindVertexArray(null);gl.deleteBuffer(ib);gl.deleteVertexArray(vao);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.colorMask(true,true,true,true);gl.enable(gl.CULL_FACE);gl.viewport(0,0,renderer.canvas.width,renderer.canvas.height);gl.deleteFramebuffer(fb);gl.deleteProgram(p);gl.activeTexture(gl.TEXTURE0);this.ready=true;
 }
 bind(loc){const gl=this.gl;gl.uniform1f(loc.staticShadow,this.ready?1:0);gl.uniform1i(loc.shadow,3);if(this.ready){gl.activeTexture(gl.TEXTURE0+3);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniformMatrix4fv(loc.shadowMatrix,false,this.matrix);gl.activeTexture(gl.TEXTURE0);}}
}
const DOCK_SURFACE_GLSL=`
uniform float uDock,uDockTime,uStaticShadow;
uniform highp sampler2D uDockShadow;
uniform highp mat4 uDockShadowMatrix;
float dockShadow(highp vec3 world,vec3 n){
 highp vec4 p=uDockShadowMatrix*vec4(world,1.);highp vec3 uv=p.xyz*.5+.5;
 if(any(lessThan(uv,vec3(.001)))||any(greaterThan(uv,vec3(.999))))return 0.;
 highp float slope=1.-dot(n,normalize(uKeyDir));highp float bias=max(.0007,(uEnvEnabled>2.5?.0028:.0014)*slope);float total=0.;
 for(int i=0;i<5;i++){vec2 d=i==0?vec2(0):i==1?vec2(1.2,0):i==2?vec2(-1.2,0):i==3?vec2(0,1.2):vec2(0,-1.2);total+=step(texture(uDockShadow,uv.xy+d/1024.).r,uv.z-bias);}
 return total*.2;
}
vec3 railSurface(vec3 color,highp vec3 world,vec3 n,float material){
 if(n.y<.75||world.y<-.08||world.y>.13)return color;
 highp vec2 p=world.xz;float span=max(length(dFdx(p)),length(dFdy(p)));
 float track=min(min(abs(p.y+6.65),abs(p.y-3.5)),abs(p.y-7.));
 if(material>10.5&&material<11.5){
  // Subpixel gravel averages out rather than sparkling as the camera moves.
  highp vec2 uv=p*9.5,cell=floor(uv),edge=min(fract(uv),1.-fract(uv));
  float stone=envHash(cell),fade=1.-smoothstep(.08,.23,span),aa=max(fwidth(min(edge.x,edge.y)),.015);
  float gap=1.-smoothstep(.025,.07+aa,min(edge.x,edge.y));
  color*=.95+((stone-.5)*.52-gap*.16)*fade;
  color*=.91+envNoise(p*1.8)*.18;
 }else if(material>.5&&material<1.5){
  float grit=mix(envHash(floor(p*28.)),.5,smoothstep(.025,.07,span));
  float oil=smoothstep(.53,.77,envNoise(p*vec2(.32,.85)))*(1.-smoothstep(1.65,3.6,track));
  float dust=smoothstep(.53,.78,envNoise(p*.23+7.));
  color*=.92+(grit-.5)*.12-oil*.16;
  color=mix(color,color*vec3(1.13,1.06,.91),dust*.48);
 }else if(material>1.5&&material<2.5){
  float wear=envNoise(p*1.6),grit=mix(envHash(floor(p*25.)),.5,smoothstep(.025,.08,span));
  color*=.91+wear*.14+(grit-.5)*.07;
 }else if(material<.5&&world.y>.040&&world.y<.054&&track<1.19){
  float grain=envNoise(p*vec2(35.,1.7));color*=.86+grain*.24;
 }
 return color;
}
vec3 campSurface(vec3 color,highp vec3 world,vec3 n,float material){
 // Canvas uses weathering at world scale; fine threads fade before becoming screen noise.
 if(material>13.5&&material<14.5){
  float span=max(length(dFdx(world)),length(dFdy(world))),fade=1.-smoothstep(.045,.14,span);
  float bleach=envNoise(world.xz*.62+world.y*.19),streak=envNoise(vec2(world.x*4.7+world.z*.9,world.y*.55));
  float hem=(1.-smoothstep(.16,.63,world.y))*(.5+.5*streak);
  color*=.90+bleach*.13; color*=1.-hem*.22;
  color*=1.+(streak-.5)*.10*fade;
  return color;
 }
 if(world.y<-.05||world.y>.15||n.y<.75)return color;
 highp vec2 p=world.xz;float span=max(length(dFdx(p)),length(dFdy(p)));
 float grit=mix(envHash(floor(p*24.)),.5,smoothstep(.025,.09,span)),broad=envNoise(p*.30),wear=envNoise(p*1.1);
 if(material>10.5&&material<11.5){
  color*=.80+broad*.25+wear*.13+(grit-.5)*.09;
  float mud=smoothstep(.54,.73,envNoise(p*.47+6.));color=mix(color,color*vec3(.72,.76,.74),mud*.55);
 }else if(material>.5&&material<1.5){
  float rut=1.-smoothstep(.11,.22,min(abs(abs(p.x-7.)-.61),abs(abs(p.x+7.)-.61)));
  color*=.86+wear*.18+(grit-.5)*.10-rut*.075;
  float dirt=smoothstep(.56,.77,broad);color=mix(color,color*vec3(1.18,1.11,.88),dirt*.45);
 }else if(material>1.5&&material<2.5){
  highp vec2 uv=fract(p/vec2(2.4,2.1)),edge=min(uv,1.-uv),aa=max(fwidth(uv),vec2(.002));
  vec2 seam=1.-smoothstep(vec2(.004),vec2(.008)+aa,edge);color*=.92+wear*.13+(grit-.5)*.07-max(seam.x,seam.y)*.17;
 }else if(material<.5){color*=.84+wear*.20;}
 return color;
}
vec3 dockSurface(vec3 color,highp vec3 world,vec3 n,float material){
 if(uDock>2.5)return campSurface(color,world,n,material);
 if(uDock>1.5)return railSurface(color,world,n,material);
 if(world.y<-.4&&material>4.5&&material<5.5){
  float ripple=.5+.5*sin(world.x*1.8+world.z*.48+uDockTime*.65+sin(world.z*1.1)*.35);
  float crossWave=.5+.5*sin(world.z*2.2-world.x*.37-uDockTime*.42);
  float quay=abs(abs(world.x)-28.2),foam=(1.-smoothstep(.08,.62,quay))*(.5+.5*sin(world.z*3.2+uDockTime));
  color*=.86+ripple*.16+crossWave*.06;color+=vec3(.032,.043,.042)*pow(ripple*crossWave,5.)+vec3(.034,.048,.045)*foam;
 }else if(world.y<.075&&world.y>-.06&&n.y>.85&&material<2.5){
  // Concrete pours, fine aggregate, slab seams and hairline damage use world dimensions.
  vec2 cell=world.xz/vec2(4.5,3.6),uv=fract(cell),edge=min(uv,1.-uv);
  float aa=max(fwidth(min(edge.x,edge.y)),.0015);float seam=1.-smoothstep(.004-aa,.008+aa,min(edge.x,edge.y));
  float slab=envHash(floor(cell)),pixelSpan=max(length(dFdx(world.xz)),length(dFdy(world.xz))),grit=mix(envHash(floor(world.xz*24.)),.5,smoothstep(.018,.06,pixelSpan));
  float hair=1.-smoothstep(.008,.030,abs(fract(world.x*.137+world.z*.087+envNoise(world.xz*.7)*.17)-.50));
  color*=.90+slab*.16+(grit-.5)*.10;color*=1.-seam*.22-hair*.045;
  float quay=min(abs(abs(world.x)-24.5),abs(abs(world.z)-17.5));
  float grime=(1.-smoothstep(.10,1.10,quay))*(.45+.55*envNoise(world.xz*1.4));
  float repair=smoothstep(.83,.89,slab)*smoothstep(.07,.18,min(edge.x,edge.y));
  color*=1.-grime*.23-repair*.12;
  color=mix(color,color*vec3(.90,1.03,.88),grime*.22);
 }else if(material>2.5&&material<3.5){
  float wear=envNoise(world.xz*3.5+world.y*2.7);color=mix(color,color*vec3(1.14,.85,.64),smoothstep(.67,.88,wear)*.28);
 }
 return color;
}
`;

const DEPOT_SURFACE_GLSL=`
// Depot-only materials. Derivative filtering keeps small detail stable as the camera moves.
uniform float uDepotQuality;
float depotBoxDistance(highp vec2 p,vec2 center,vec2 halfSize){return length(max(abs(p-center)-halfSize,vec2(0)));}
vec3 depotSurface(vec3 base,highp vec3 w,vec3 normal,vec3 view,vec3 key,float material,float shadow){
 vec3 n=normal;
 highp vec2 uv=n.y>.75?w.xz:abs(n.x)>abs(n.z)?w.zy:w.xy;
 highp float footprint=max(length(dFdx(uv)),length(dFdy(uv)));
 if(material>20.5){
  // Opaque industrial glazing: view-dependent sky, dark interior, restrained dirt.
  // This is an analytic reflection, with no extra render target or transparent sorting.
  float nv=max(dot(n,view),.02),nd=max(dot(n,key),0.);
  vec3 reflected=reflect(-view,n);
  float horizon=smoothstep(-.18,.65,reflected.y);
  vec3 sky=mix(vec3(.09,.16,.18),vec3(.42,.57,.62),horizon);
  float cloud=envNoise(reflected.xz*3.4+vec2(.7,1.3));
  sky=mix(sky,vec3(.58,.65,.62),smoothstep(.58,.78,cloud)*.24*horizon);
  float fresnel=.30+.58*pow(1.-nv,4.);
  float dirt=envNoise(uv*2.6);
  vec3 interior=base*(.13+.08*dirt)+vec3(.017,.029,.03);
  vec3 glazing=mix(interior,sky,fresnel)*(.91+.09*dirt);
  glazing+=base*environmentLight(w,n)*.26;
  if(uDepotQuality>.5){
   float highlight=pow(max(dot(n,normalize(key+view)),0.),72.);
   glazing+=vec3(.9,.77,.57)*highlight*.38*(1.-shadow*.85);
  }
  return pow(max(glazing,vec3(0)),vec3(.94));
 }
 float detail=1.-smoothstep(.035,.16,footprint),quality=step(.5,uDepotQuality);
 float macro=envNoise(uv*.48),medium=envNoise(uv*2.7);
 float fine=uDepotQuality>.5?envNoise(uv*23.):.5;
 float rough=.83,wet=0.,height=0.;vec3 albedo=base;
 if(material<15.5){
  // Asphalt: aggregate, repaired seams, tire wear and shallow rain-darkened depressions.
  float lanes=exp(-pow((abs(w.x)-1.25)*1.6,2.))*.14+exp(-pow((abs(w.x)-19.0)*1.2,2.))*.10;
  float grains=(fine-.5)*.14*detail*quality;
  albedo*=.90+macro*.24+grains-lanes*(.55+.45*medium);
  highp vec2 slabs=uv/vec2(4.3,6.1),cell=floor(slabs),f=fract(slabs);
  float seam=min(min(f.x,1.-f.x),min(f.y,1.-f.y));
  float join=(1.-smoothstep(.002,.010+footprint*.18,seam))*smoothstep(.55,.78,envHash(cell));
  albedo*=1.-join*.19;
  // Broad, feathered tire arcs from the loading turns. World-space wear aligns across patches.
  if(w.y<.08&&n.y>.8){
   highp vec2 turn=w.xz-vec2(-5.0,6.8),turn2=w.xz-vec2(5.1,-7.5);
   float radius=length(turn),radius2=length(turn2);
   float pair=min(abs(radius-3.05),abs(radius-3.69));
   float pair2=min(abs(radius2-2.55),abs(radius2-3.18));
   float tire=(1.-smoothstep(.045,.125+footprint,pair))*smoothstep(-.8,1.0,turn.x)*smoothstep(-2.0,-.3,turn.y);
   tire+=(1.-smoothstep(.045,.125+footprint,pair2))*smoothstep(-.7,.8,-turn2.x)*smoothstep(-1.4,.3,-turn2.y);
   albedo*=1.-min(tire,1.)*(.09+.10*medium);
   // Damp moss lives near the perimeter, leaving the centre visually quiet.
   float edge=min(abs(abs(w.x)-24.9),abs(abs(w.z)-18.2));
   float verge=(1.-smoothstep(.12,.95,edge))*smoothstep(.36,.66,macro*.55+medium*.45);
   albedo=mix(albedo,base*vec3(.77,.92,.58),verge*.34);
  }
  wet=smoothstep(.54,.72,macro*.68+medium*.32)*.68;
  height=(fine-.5)*.0025*detail*quality;
  rough=mix(.88,.20,wet);
 }else if(material<16.5){
  // Cast concrete: broad mineral variation, exposed aggregate, damp lower surfaces.
  albedo*=.86+macro*.24+(fine-.5)*.08*detail*quality;
  float damp=(1.-smoothstep(.08,.65,w.y))*(.12+medium*.16);
  albedo=mix(albedo,albedo*vec3(.63,.73,.66),damp);
  rough=.94;height=(fine-.5)*.004*detail*quality;
 }else if(material<17.5){
  // Painted steel: weathering follows world-scale seams, not stretched object coordinates.
  float streak=envNoise(vec2(uv.x*5.0,uv.y*.35));
  float rust=smoothstep(.56,.78,macro*.42+streak*.58)*smoothstep(.32,.76,medium);
  albedo=mix(base*(.88+streak*.17),vec3(.29,.16,.075),rust*.30);
  rough=mix(.43,.91,rust);height=(fine-.5)*.0025*detail*quality;
  if(n.y>.8){
   highp float rib=abs(fract(w.z*1.55)-.5),aa=max(fwidth(w.z*1.55),.015);
   float seam=1.-smoothstep(.017,.017+aa,rib);
   albedo*=1.-seam*.15;rough+=.05*medium;
  }
 }else if(material<18.5){
  // Worn markings remain opaque and readable; no subpixel discard or sparkling stipple.
  float wear=smoothstep(.56,.80,medium*.65+macro*.35);
  albedo*=.86+medium*.14;albedo=mix(albedo,albedo*.58,wear*.55);rough=.89;
 }else if(material<19.5){
  // Wet patches reflect an analytic sky and the existing nearby lamps, without extra render targets.
  albedo=mix(base,vec3(.19,.26,.28),.60)*.66;wet=.94;rough=.14;
  height=uDepotQuality>1.5?sin(w.x*7.5+w.z*2.0)*sin(w.z*6.7-w.x)*.0012:0.;
 }else{
  // Bonded masonry on the existing warehouse bodies; anti-aliased mortar at a fixed world scale.
  highp vec2 brick=uv*vec2(2.35,4.7);brick.x+=mod(floor(brick.y),2.)*.5;
  highp vec2 f=fract(brick),edge=min(f,1.-f),aa=max(fwidth(brick)*.85,vec2(.015));
  float mortar=max(1.-smoothstep(.032,.032+aa.x,edge.x),1.-smoothstep(.055,.055+aa.y,edge.y));
  float visible=1.-smoothstep(.30,.95,max(aa.x,aa.y));
  albedo=base*(.88+envHash(floor(brick))*.17);
  albedo=mix(albedo,vec3(.25,.285,.27),mortar*visible*.48);
  albedo*=.92+macro*.12;rough=.95;height=(1.-mortar)*.009*visible;
 }
 if(uDepotQuality>1.5){
  // Surface-gradient bump preserves correct orientation on vertical and horizontal faces.
  vec3 dx=dFdx(w),dy=dFdy(w),r1=cross(dy,n),r2=cross(n,dx);
  float det=dot(dx,r1);
  vec3 grad=(dFdx(height)*r1+dFdy(height)*r2)*sign(det)/max(abs(det),.00001);
  n=normalize(n-clamp(grad,vec3(-.20),vec3(.20)));
 }
 albedo*=1.-wet*.24;
 float wall=min(depotBoxDistance(w.xz,vec2(-13.475,-.7),vec2(2.975,9.1)),depotBoxDistance(w.xz,vec2(13.475,-.7),vec2(2.975,9.1)));
 float contact=w.y<.12?.62+.38*smoothstep(.02,.92,wall):1.;
 float up=clamp(n.y*.5+.5,0.,1.),nd=max(dot(n,key),0.),nv=max(dot(n,view),.02);
 vec3 hemi=mix(uAmbientGround,uAmbientTop,up)*contact;
 vec3 sun=vec3(1.0,.82,.61)*nd*.92*(1.-shadow*.84);
 vec3 color=albedo*(hemi*(1.-shadow*.14)+sun);
 color+=albedo*environmentLight(w,n)*1.12;
 // Broad rough highlights retain volume; sharper reflections are reserved for wet material.
 vec3 halfVector=normalize(key+view);
 float shine=pow(max(dot(n,halfVector),0.),mix(10.,110.,1.-rough));
 color+=vec3(1.0,.87,.68)*shine*mix(.025,.24,1.-rough)*(1.-shadow*.80);
 if(wet>.02){
  vec3 reflected=reflect(-view,n);
  float fresnel=.12+.38*pow(1.-nv,4.);
  vec3 sky=mix(vec3(.17,.23,.27),vec3(.45,.59,.66),clamp(reflected.y*.5+.5,0.,1.));
  color=mix(color,sky,wet*fresnel);
  if(uDepotQuality>.5)for(int i=0;i<4;i++){
   vec3 delta=uEnvPositions[i].xyz-w;float dist=max(length(delta),.01);
   float fall=max(0.,1.-dist/max(uEnvPositions[i].w,.01));
   float reflection=pow(max(dot(reflected,delta/dist),0.),24.);
   color+=uEnvColors[i]*reflection*fall*fall*wet*.26;
  }
 }
 // Restrained contrast/exposure applied only to the Depot material family.
 return pow(max(color,vec3(0)),vec3(.94));
}
`;
const VEHICLE_SURFACE_GLSL=`
// Object-space finish for playable vehicles. Existing arena/transport materials stay on their old path.
vec3 vehicleSurface(vec3 base,vec3 local,vec3 world,vec3 n,vec3 V,vec3 key,float material,float shadow){
 highp vec2 uv=vec2(local.x+local.y*.47,local.z+local.y*.71);
 float macro=envNoise(uv*2.8),detail=1.-smoothstep(.06,.28,length(fwidth(local))),grain=envNoise(uv*29.);
 float nd=max(0.,dot(n,key))*(1.-shadow*.80),up=clamp(n.y*.5+.5,0.,1.);
 vec3 ambient=mix(uAmbientGround,uAmbientTop,up)*(1.-shadow*.12),H=normalize(key+V);
 float edge=pow(1.-max(dot(n,V),0.),3.),spec=0.;
 if(material<22.5){
  float paintMask=smoothstep(.37,.64,macro),scuff=smoothstep(.67,.84,grain)*detail;
  base*=mix(.73,1.07,paintMask);base=mix(base,vec3(.43,.41,.33),scuff*.16);
  base*=1.+(grain-.5)*.085*detail;spec=pow(max(dot(n,H),0.),24.)*.065;
 }else if(material<23.5){
  float abrasion=envNoise(vec2(uv.x*38.,uv.y*5.));
  base*=.86+macro*.15;base=mix(base,vec3(.45,.46,.40),smoothstep(.66,.88,abrasion)*.15*detail);
  spec=pow(max(dot(n,H),0.),42.)*.19;
 }else if(material<24.5){
  base*=.76+macro*.13+(grain-.5)*.06*detail;spec=pow(max(dot(n,H),0.),16.)*.022;
 }else{
  vec3 reflected=reflect(-V,n),sky=mix(vec3(.055,.09,.10),vec3(.46,.61,.65),smoothstep(-.30,.85,reflected.y));
  sky+=vec3(.13,.19,.20)*pow(max(0.,1.-abs(reflected.y-.16)),18.);
  vec3 glass=base*(ambient+nd*.25)*.42+sky*(.52+edge*.37);
  glass+=vec3(.68,.79,.77)*pow(max(dot(n,H),0.),72.)*.48*(1.-shadow*.7);
  return glass;
 }
 vec3 color=base*(ambient+nd*.64)+base*edge*.065+vec3(spec)*(1.-shadow*.7);
 if(uEnvEnabled>.5)color+=base*environmentLight(world,n);
 return color;
}
`;
const TANK_SURFACE_GLSL=`
// Tank-only finish: broad armor planes stay clean at phone scale; fine wear fades with distance.
vec3 tankSurface(vec3 base,vec3 local,vec3 world,vec3 n,vec3 V,vec3 key,float material,float shadow){
 highp vec2 uv=vec2(local.x+local.y*.47,local.z+local.y*.71);
 float detail=1.-smoothstep(.045,.18,length(fwidth(local)));
 float wear=(envNoise(uv*18.)-.5)*detail;
 float nd=max(0.,dot(n,key))*(1.-shadow*.80),up=clamp(n.y*.5+.5,0.,1.);
 vec3 ambient=mix(uAmbientGround,uAmbientTop,up)*(1.-shadow*.12),H=normalize(key+V);
 float edge=pow(1.-max(dot(n,V),0.),3.),spec;
 if(material<26.5){
  base*=.94+wear*.035;spec=pow(max(dot(n,H),0.),28.)*.075;
 }else if(material<27.5){
  base*=.95+wear*.045;spec=pow(max(dot(n,H),0.),38.)*.17;
 }else{
  base*=.85+wear*.025;spec=pow(max(dot(n,H),0.),16.)*.016;
 }
 vec3 color=base*(ambient+nd*.67)+base*edge*.045+vec3(spec)*(1.-shadow*.7);
 if(uEnvEnabled>.5)color+=base*environmentLight(world,n);
 return color;
}
`;
function program(gl){
 const vs=`#version 300 es
uniform mediump float uEnvEnabled;vec3 envNormal(mat4 m,vec3 n){vec3 sq=vec3(dot(m[0].xyz,m[0].xyz),dot(m[1].xyz,m[1].xyz),dot(m[2].xyz,m[2].xyz));return normalize(mat3(m)*(n/max(sq,vec3(.00000001))));}in vec3 aPos;in vec3 aNorm;uniform mat4 uProj,uView,uModel;out vec3 vN;out vec3 vW;out highp vec3 vDockWorld;out vec3 vL;out float vD;void main(){vec4 w=uModel*vec4(aPos,1.0);gl_Position=uProj*uView*w;vN=uEnvEnabled>.5?envNormal(uModel,aNorm):normalize(mat3(uModel)*aNorm);vW=w.xyz;vDockWorld=w.xyz;vL=aPos;vD=length((uView*w).xyz);}`;
 const fs=`#version 300 es
precision mediump float;in vec3 vN;in vec3 vW;in highp vec3 vDockWorld;in vec3 vL;in float vD;uniform vec3 uColor,uFog,uCam,uKeyDir,uAmbientTop,uAmbientGround;uniform float uGlow,uMaterial;${ARENA_LIGHT_GLSL}
${DOCK_SURFACE_GLSL}
${DEPOT_SURFACE_GLSL}
${VEHICLE_SURFACE_GLSL}
${TANK_SURFACE_GLSL}
out vec4 outColor;float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec3 n=normalize(vN),key=normalize(uKeyDir),V=normalize(uCam-vW),H=normalize(key+V);if(uMaterial>25.5&&uMaterial<28.5){
 float shade=uStaticShadow>.5?dockShadow(vDockWorld,n):0.;
 vec3 color=tankSurface(uColor,vL,vDockWorld,n,V,key,uMaterial,shade)+uColor*uGlow;
 outColor=vec4(mix(color,uFog,smoothstep(17.,49.,vD)),1.);return;
}if(uMaterial>21.5&&uMaterial<25.5){
 float shade=uStaticShadow>.5?dockShadow(vDockWorld,n):0.;
 vec3 color=vehicleSurface(uColor,vL,vDockWorld,n,V,key,uMaterial,shade)+uColor*uGlow;
 outColor=vec4(mix(color,uFog,smoothstep(17.,49.,vD)),1.);return;
}if(uMaterial>14.5&&uMaterial<21.5){
 float shade=uStaticShadow>.5?dockShadow(vDockWorld,n):0.;
 vec3 color=depotSurface(uColor,vDockWorld,n,V,key,uMaterial,shade)+uColor*uGlow;
 float fog=smoothstep(19.,56.,vD);outColor=vec4(mix(color,uFog,fog),1.);return;
}float up01=clamp(n.y*.5+.5,0.0,1.0),nd=max(0.0,dot(n,key)),rim=pow(1.0-clamp(dot(n,V),0.0,1.0),2.2),grain=h21(floor(vW.xz*4.5)+floor(vW.y*3.0)),fine=h21(floor(vW.xz*13.0)),localNoise=h21(floor(vL.xy*23.0)+floor(vL.zy*17.0));if(uEnvEnabled>.5){grain=envNoise(vW.xz*4.5+vW.y);fine=envHash(floor(vW.xz*21.));}
if(uEnvEnabled>1.5&&vW.y<.08&&n.y>.8)grain=.5+(grain-.5)*.28;
if(uDock>.5&&vW.y<.075&&n.y>.85){grain=.55;fine=envHash(floor(vW.xz*65.));}float castShade=uStaticShadow>.5?dockShadow(vDockWorld,n):0.;nd*=1.-castShade*.82;
vec3 ambient=mix(uAmbientGround,uAmbientTop,up01)*(1.-castShade*.12);float horizon=clamp((vW.y+.1)*.07,0.0,.16),spec=0.0;vec3 col=uColor*(ambient+vec3(nd*.62+horizon))+uColor*rim*.24;if(uMaterial>10.5){
 col-=uColor*rim*.17;
 if(uMaterial<11.5){
  highp vec3 w=vDockWorld;float weather=envNoise(w.xz*.72+w.y*.23),streak=envNoise(vec2(w.x*4.8+w.z*3.3,w.y*.37));
  float damp=(1.-smoothstep(.10,1.30,w.y))*smoothstep(.38,.74,envNoise(w.xz*1.2));
  float detailFade=1.-smoothstep(.07,.24,length(fwidth(w)));float mineral=envNoise(w.xz*7.+w.y*3.1);
  col*=.90+weather*.10;col*=.955+streak*.06;col*=1.-damp*.12;col*=1.+(mineral-.5)*.045*detailFade;
 }else if(uMaterial<12.5){
  highp vec2 uv=vec2(vDockWorld.x*2.35+mod(floor(vDockWorld.z*3.4),2.)*.5,vDockWorld.z*3.4);
  highp vec2 cell=floor(uv),edge=min(fract(uv),1.-fract(uv)),aa=max(fwidth(uv)*1.25,vec2(.008));
  vec2 grout=1.-smoothstep(vec2(.018),vec2(.018)+aa,edge);float visible=1.-smoothstep(.35,.9,max(aa.x,aa.y));
  col*=.91+envHash(cell)*.09;col*=1.-max(grout.x,grout.y)*.17*visible;
 }else{float leaf=envNoise(vDockWorld.xz*5.7+vDockWorld.y*3.3);col*=.88+leaf*.12;}
}else if(uMaterial>.5&&uMaterial<1.5){col*=.72+grain*.24;col+=uColor*step(.965,fine)*.08;}else if(uMaterial>1.5&&uMaterial<2.5){float grime=.82+grain*.19;float streak=uEnvEnabled>.5?.94+.06*grain:.93+.07*sin((vW.x+vW.z)*7.0+grain*5.0);col*=grime*streak;}else if(uMaterial>2.5&&uMaterial<3.5){float rib=uEnvEnabled>.5?.94+grain*.06:.9+.1*sin((vW.x+vW.z)*14.0);col*=rib;spec=pow(max(dot(n,H),0.0),22.0)*.18;}else if(uMaterial>3.5&&uMaterial<4.5){col*=.88+grain*.16;}else if(uMaterial>4.5&&uMaterial<5.5){col*=.64+grain*.08;spec=pow(max(dot(n,H),0.0),28.0)*.42;}else if(uMaterial>5.5&&uMaterial<6.5){col*=.86+fine*.08;spec=pow(max(dot(n,H),0.0),36.0)*.5;}else if(uMaterial>6.5&&uMaterial<7.5){float macroWeave=.90+.075*sin(vL.x*10.5)*sin(vL.y*12.5),fineWeave=.965+.035*sin(vL.x*31.0)*sin(vL.y*35.0);col*=macroWeave*fineWeave*(.92+localNoise*.09);col+=uColor*rim*.055;}else if(uMaterial>7.5&&uMaterial<8.5){col*=.80+localNoise*.16;spec=pow(max(dot(n,H),0.0),18.0)*.075;}else if(uMaterial>8.5&&uMaterial<9.5){float tread=.92+.08*sin(vL.z*11.0);col*=tread*(.73+localNoise*.07);spec=pow(max(dot(n,H),0.0),14.0)*.035;}else if(uMaterial>9.5){float skinTone=.92+.055*sin(vL.y*8.0+vL.x*5.0);col*=skinTone*(.90+localNoise*.07);col+=vec3(.035,.014,.006)*up01;spec=pow(max(dot(n,H),0.0),28.0)*.045;}if(uEnvEnabled>.5){
 if(vW.y<.08&&n.y>.8){float soil=envNoise(vW.xz*.38),wear=envNoise(vW.xz*1.7);col*=uDock>.5?.94+soil*.06+wear*.035:uEnvEnabled>1.5?.94+soil*.05+wear*.02:.79+soil*.26+wear*.08;}
 col+=uColor*environmentLight(vW,n);
}if(uDock>.5)col=dockSurface(col,vDockWorld,n,uMaterial);col+=vec3(spec)*(1.-castShade*.7)+uColor*uGlow;float f=uEnvEnabled>3.5?smoothstep(24.0,88.0,length(uCam-vW)):smoothstep(17.0,49.0,vD);outColor=vec4(mix(col,uFog,f),1.0);}`;
 const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;
}
function instancedProgram(gl){
 const vs=`#version 300 es
uniform mediump float uEnvEnabled;vec3 envNormal(mat4 m,vec3 n){vec3 sq=vec3(dot(m[0].xyz,m[0].xyz),dot(m[1].xyz,m[1].xyz),dot(m[2].xyz,m[2].xyz));return normalize(mat3(m)*(n/max(sq,vec3(.00000001))));}in vec3 aPos;in vec3 aNorm;in vec4 iM0;in vec4 iM1;in vec4 iM2;in vec4 iM3;in vec4 iColorGlow;in float iMaterial;uniform mat4 uProj,uView;out vec3 vN;out vec3 vW;out highp vec3 vDockWorld;out vec3 vL;out float vD;flat out vec4 vColorGlow;flat out float vMaterial;void main(){mat4 M=mat4(iM0,iM1,iM2,iM3);vec4 w=M*vec4(aPos,1.0);gl_Position=uProj*uView*w;vN=uEnvEnabled>.5?envNormal(M,aNorm):normalize(mat3(M)*aNorm);vW=w.xyz;vDockWorld=w.xyz;vL=aPos;vD=length((uView*w).xyz);vColorGlow=iColorGlow;vMaterial=iMaterial;}`;
 const fs=`#version 300 es
precision mediump float;in vec3 vN;in vec3 vW;in highp vec3 vDockWorld;in vec3 vL;in float vD;flat in vec4 vColorGlow;flat in float vMaterial;uniform vec3 uFog,uCam,uKeyDir,uAmbientTop,uAmbientGround;${ARENA_LIGHT_GLSL}
${DOCK_SURFACE_GLSL}
${DEPOT_SURFACE_GLSL}
${VEHICLE_SURFACE_GLSL}
${TANK_SURFACE_GLSL}
out vec4 outColor;float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec3 n=normalize(vN),key=normalize(uKeyDir),V=normalize(uCam-vW),H=normalize(key+V),uColor=vColorGlow.rgb;float uGlow=vColorGlow.a,uMaterial=vMaterial;if(uMaterial>25.5&&uMaterial<28.5){
 float shade=uStaticShadow>.5?dockShadow(vDockWorld,n):0.;
 vec3 color=tankSurface(uColor,vL,vDockWorld,n,V,key,uMaterial,shade)+uColor*uGlow;
 outColor=vec4(mix(color,uFog,smoothstep(17.,49.,vD)),1.);return;
}if(uMaterial>21.5&&uMaterial<25.5){
 float shade=uStaticShadow>.5?dockShadow(vDockWorld,n):0.;
 vec3 color=vehicleSurface(uColor,vL,vDockWorld,n,V,key,uMaterial,shade)+uColor*uGlow;
 outColor=vec4(mix(color,uFog,smoothstep(17.,49.,vD)),1.);return;
}if(uMaterial>14.5&&uMaterial<21.5){
 float shade=uStaticShadow>.5?dockShadow(vDockWorld,n):0.;
 vec3 color=depotSurface(uColor,vDockWorld,n,V,key,uMaterial,shade)+uColor*uGlow;
 float fog=smoothstep(19.,56.,vD);outColor=vec4(mix(color,uFog,fog),1.);return;
}float up01=clamp(n.y*.5+.5,0.0,1.0),nd=max(0.0,dot(n,key)),rim=pow(1.0-clamp(dot(n,V),0.0,1.0),2.2),grain=h21(floor(vW.xz*4.5)+floor(vW.y*3.0)),fine=h21(floor(vW.xz*13.0)),localNoise=h21(floor(vL.xy*23.0)+floor(vL.zy*17.0));if(uEnvEnabled>.5){grain=envNoise(vW.xz*4.5+vW.y);fine=envHash(floor(vW.xz*21.));}
if(uEnvEnabled>1.5&&vW.y<.08&&n.y>.8)grain=.5+(grain-.5)*.28;
if(uDock>.5&&vW.y<.075&&n.y>.85){grain=.55;fine=envHash(floor(vW.xz*65.));}float castShade=uStaticShadow>.5?dockShadow(vDockWorld,n):0.;nd*=1.-castShade*.82;
vec3 ambient=mix(uAmbientGround,uAmbientTop,up01)*(1.-castShade*.12);float horizon=clamp((vW.y+.1)*.07,0.0,.16),spec=0.0;vec3 col=uColor*(ambient+vec3(nd*.62+horizon))+uColor*rim*.24;if(uMaterial>10.5){
 col-=uColor*rim*.17;
 if(uMaterial<11.5){
  highp vec3 w=vDockWorld;float weather=envNoise(w.xz*.72+w.y*.23),streak=envNoise(vec2(w.x*4.8+w.z*3.3,w.y*.37));
  float damp=(1.-smoothstep(.10,1.30,w.y))*smoothstep(.38,.74,envNoise(w.xz*1.2));
  float detailFade=1.-smoothstep(.07,.24,length(fwidth(w)));float mineral=envNoise(w.xz*7.+w.y*3.1);
  col*=.90+weather*.10;col*=.955+streak*.06;col*=1.-damp*.12;col*=1.+(mineral-.5)*.045*detailFade;
 }else if(uMaterial<12.5){
  highp vec2 uv=vec2(vDockWorld.x*2.35+mod(floor(vDockWorld.z*3.4),2.)*.5,vDockWorld.z*3.4);
  highp vec2 cell=floor(uv),edge=min(fract(uv),1.-fract(uv)),aa=max(fwidth(uv)*1.25,vec2(.008));
  vec2 grout=1.-smoothstep(vec2(.018),vec2(.018)+aa,edge);float visible=1.-smoothstep(.35,.9,max(aa.x,aa.y));
  col*=.91+envHash(cell)*.09;col*=1.-max(grout.x,grout.y)*.17*visible;
 }else{float leaf=envNoise(vDockWorld.xz*5.7+vDockWorld.y*3.3);col*=.88+leaf*.12;}
}else if(uMaterial>.5&&uMaterial<1.5){col*=.72+grain*.24;col+=uColor*step(.965,fine)*.08;}else if(uMaterial>1.5&&uMaterial<2.5){float grime=.82+grain*.19;float streak=uEnvEnabled>.5?.94+.06*grain:.93+.07*sin((vW.x+vW.z)*7.0+grain*5.0);col*=grime*streak;}else if(uMaterial>2.5&&uMaterial<3.5){float rib=uEnvEnabled>.5?.94+grain*.06:.9+.1*sin((vW.x+vW.z)*14.0);col*=rib;spec=pow(max(dot(n,H),0.0),22.0)*.18;}else if(uMaterial>3.5&&uMaterial<4.5){col*=.88+grain*.16;}else if(uMaterial>4.5&&uMaterial<5.5){col*=.64+grain*.08;spec=pow(max(dot(n,H),0.0),28.0)*.42;}else if(uMaterial>5.5&&uMaterial<6.5){col*=.86+fine*.08;spec=pow(max(dot(n,H),0.0),36.0)*.5;}else if(uMaterial>6.5&&uMaterial<7.5){float macroWeave=.90+.075*sin(vL.x*10.5)*sin(vL.y*12.5),fineWeave=.965+.035*sin(vL.x*31.0)*sin(vL.y*35.0);col*=macroWeave*fineWeave*(.92+localNoise*.09);col+=uColor*rim*.055;}else if(uMaterial>7.5&&uMaterial<8.5){col*=.80+localNoise*.16;spec=pow(max(dot(n,H),0.0),18.0)*.075;}else if(uMaterial>8.5&&uMaterial<9.5){float tread=.92+.08*sin(vL.z*11.0);col*=tread*(.73+localNoise*.07);spec=pow(max(dot(n,H),0.0),14.0)*.035;}else if(uMaterial>9.5){float skinTone=.92+.055*sin(vL.y*8.0+vL.x*5.0);col*=skinTone*(.90+localNoise*.07);col+=vec3(.035,.014,.006)*up01;spec=pow(max(dot(n,H),0.0),28.0)*.045;}if(uEnvEnabled>.5){
 if(vW.y<.08&&n.y>.8){float soil=envNoise(vW.xz*.38),wear=envNoise(vW.xz*1.7);col*=uDock>.5?.94+soil*.06+wear*.035:uEnvEnabled>1.5?.94+soil*.05+wear*.02:.79+soil*.26+wear*.08;}
 col+=uColor*environmentLight(vW,n);
}if(uDock>.5)col=dockSurface(col,vDockWorld,n,uMaterial);col+=vec3(spec)*(1.-castShade*.7)+uColor*uGlow;float f=uEnvEnabled>3.5?smoothstep(24.0,88.0,length(uCam-vW)):smoothstep(17.0,49.0,vD);outColor=vec4(mix(col,uFog,f),1.0);}`;
 const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;
}
// Deadwatch 0.32.9: dedicated four-pose pursuit-run atlas on the 16-direction 0.31 walker foundation.
const WALKER_ATLAS = {
  "width": 2832,
  "height": 2320,
  "referenceHeight": 232.5,
  "frames": [
    {
      "row": 0,
      "direction": 0,
      "x": 33,
      "y": 43,
      "w": 110,
      "h": 239,
      "anchorX": 88.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 1,
      "x": 209,
      "y": 43,
      "w": 109,
      "h": 237,
      "anchorX": 265.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 2,
      "x": 388,
      "y": 53,
      "w": 99,
      "h": 229,
      "anchorX": 442.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 3,
      "x": 555,
      "y": 48,
      "w": 108,
      "h": 233,
      "anchorX": 619.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 4,
      "x": 732,
      "y": 48,
      "w": 109,
      "h": 234,
      "anchorX": 796.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 5,
      "x": 909,
      "y": 48,
      "w": 110,
      "h": 233,
      "anchorX": 973.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 6,
      "x": 1091,
      "y": 49,
      "w": 114,
      "h": 233,
      "anchorX": 1150.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 7,
      "x": 1273,
      "y": 36,
      "w": 111,
      "h": 246,
      "anchorX": 1327.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 8,
      "x": 1450,
      "y": 35,
      "w": 113,
      "h": 247,
      "anchorX": 1504.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 9,
      "x": 1628,
      "y": 36,
      "w": 111,
      "h": 246,
      "anchorX": 1681.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 10,
      "x": 1810,
      "y": 41,
      "w": 110,
      "h": 241,
      "anchorX": 1858.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 11,
      "x": 1983,
      "y": 52,
      "w": 121,
      "h": 228,
      "anchorX": 2035.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 12,
      "x": 2160,
      "y": 52,
      "w": 121,
      "h": 230,
      "anchorX": 2212.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 13,
      "x": 2336,
      "y": 53,
      "w": 121,
      "h": 227,
      "anchorX": 2389.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 14,
      "x": 2518,
      "y": 50,
      "w": 101,
      "h": 232,
      "anchorX": 2566.0,
      "baseline": 280
    },
    {
      "row": 0,
      "direction": 15,
      "x": 2689,
      "y": 43,
      "w": 108,
      "h": 238,
      "anchorX": 2743.0,
      "baseline": 280
    },
    {
      "row": 1,
      "direction": 0,
      "x": 34,
      "y": 335,
      "w": 108,
      "h": 237,
      "anchorX": 88.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 1,
      "x": 210,
      "y": 335,
      "w": 107,
      "h": 239,
      "anchorX": 265.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 2,
      "x": 383,
      "y": 341,
      "w": 102,
      "h": 231,
      "anchorX": 442.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 3,
      "x": 547,
      "y": 341,
      "w": 122,
      "h": 230,
      "anchorX": 619.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 4,
      "x": 724,
      "y": 340,
      "w": 124,
      "h": 232,
      "anchorX": 796.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 5,
      "x": 901,
      "y": 340,
      "w": 122,
      "h": 231,
      "anchorX": 973.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 6,
      "x": 1094,
      "y": 326,
      "w": 106,
      "h": 246,
      "anchorX": 1150.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 7,
      "x": 1269,
      "y": 323,
      "w": 115,
      "h": 251,
      "anchorX": 1327.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 8,
      "x": 1447,
      "y": 322,
      "w": 116,
      "h": 250,
      "anchorX": 1504.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 9,
      "x": 1623,
      "y": 323,
      "w": 116,
      "h": 251,
      "anchorX": 1681.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 10,
      "x": 1803,
      "y": 334,
      "w": 120,
      "h": 238,
      "anchorX": 1858.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 11,
      "x": 1984,
      "y": 340,
      "w": 119,
      "h": 230,
      "anchorX": 2035.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 12,
      "x": 2160,
      "y": 341,
      "w": 120,
      "h": 231,
      "anchorX": 2212.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 13,
      "x": 2339,
      "y": 341,
      "w": 118,
      "h": 229,
      "anchorX": 2389.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 14,
      "x": 2518,
      "y": 342,
      "w": 99,
      "h": 230,
      "anchorX": 2566.0,
      "baseline": 570
    },
    {
      "row": 1,
      "direction": 15,
      "x": 2691,
      "y": 335,
      "w": 105,
      "h": 236,
      "anchorX": 2743.0,
      "baseline": 570
    },
    {
      "row": 2,
      "direction": 0,
      "x": 36,
      "y": 623,
      "w": 114,
      "h": 239,
      "anchorX": 88.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 1,
      "x": 210,
      "y": 623,
      "w": 115,
      "h": 237,
      "anchorX": 265.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 2,
      "x": 378,
      "y": 641,
      "w": 111,
      "h": 221,
      "anchorX": 442.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 3,
      "x": 549,
      "y": 639,
      "w": 128,
      "h": 222,
      "anchorX": 619.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 4,
      "x": 726,
      "y": 638,
      "w": 129,
      "h": 224,
      "anchorX": 796.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 5,
      "x": 903,
      "y": 637,
      "w": 128,
      "h": 224,
      "anchorX": 973.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 6,
      "x": 1081,
      "y": 622,
      "w": 121,
      "h": 240,
      "anchorX": 1150.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 7,
      "x": 1273,
      "y": 617,
      "w": 109,
      "h": 245,
      "anchorX": 1327.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 8,
      "x": 1451,
      "y": 617,
      "w": 109,
      "h": 245,
      "anchorX": 1504.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 9,
      "x": 1628,
      "y": 617,
      "w": 110,
      "h": 247,
      "anchorX": 1681.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 10,
      "x": 1799,
      "y": 624,
      "w": 120,
      "h": 238,
      "anchorX": 1858.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 11,
      "x": 1979,
      "y": 635,
      "w": 123,
      "h": 225,
      "anchorX": 2035.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 12,
      "x": 2155,
      "y": 636,
      "w": 124,
      "h": 226,
      "anchorX": 2212.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 13,
      "x": 2334,
      "y": 637,
      "w": 122,
      "h": 223,
      "anchorX": 2389.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 14,
      "x": 2516,
      "y": 635,
      "w": 106,
      "h": 227,
      "anchorX": 2566.0,
      "baseline": 860
    },
    {
      "row": 2,
      "direction": 15,
      "x": 2692,
      "y": 623,
      "w": 111,
      "h": 237,
      "anchorX": 2743.0,
      "baseline": 860
    },
    {
      "row": 3,
      "direction": 0,
      "x": 31,
      "y": 921,
      "w": 114,
      "h": 231,
      "anchorX": 88.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 1,
      "x": 207,
      "y": 921,
      "w": 113,
      "h": 230,
      "anchorX": 265.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 2,
      "x": 381,
      "y": 927,
      "w": 111,
      "h": 225,
      "anchorX": 442.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 3,
      "x": 550,
      "y": 923,
      "w": 111,
      "h": 228,
      "anchorX": 619.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 4,
      "x": 727,
      "y": 922,
      "w": 110,
      "h": 230,
      "anchorX": 796.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 5,
      "x": 904,
      "y": 922,
      "w": 112,
      "h": 229,
      "anchorX": 973.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 6,
      "x": 1092,
      "y": 912,
      "w": 112,
      "h": 240,
      "anchorX": 1150.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 7,
      "x": 1272,
      "y": 911,
      "w": 113,
      "h": 243,
      "anchorX": 1327.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 8,
      "x": 1447,
      "y": 910,
      "w": 116,
      "h": 242,
      "anchorX": 1504.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 9,
      "x": 1625,
      "y": 911,
      "w": 114,
      "h": 243,
      "anchorX": 1681.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 10,
      "x": 1810,
      "y": 915,
      "w": 111,
      "h": 237,
      "anchorX": 1858.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 11,
      "x": 1983,
      "y": 926,
      "w": 123,
      "h": 224,
      "anchorX": 2035.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 12,
      "x": 2159,
      "y": 927,
      "w": 124,
      "h": 225,
      "anchorX": 2212.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 13,
      "x": 2337,
      "y": 928,
      "w": 123,
      "h": 222,
      "anchorX": 2389.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 14,
      "x": 2520,
      "y": 931,
      "w": 110,
      "h": 221,
      "anchorX": 2566.0,
      "baseline": 1150
    },
    {
      "row": 3,
      "direction": 15,
      "x": 2688,
      "y": 921,
      "w": 113,
      "h": 229,
      "anchorX": 2743.0,
      "baseline": 1150
    },
    {
      "row": 4,
      "direction": 0,
      "x": 33,
      "y": 1210,
      "w": 110,
      "h": 237,
      "anchorX": 88.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 1,
      "x": 203,
      "y": 1210,
      "w": 114,
      "h": 234,
      "anchorX": 265.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 2,
      "x": 377,
      "y": 1218,
      "w": 110,
      "h": 224,
      "anchorX": 442.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 3,
      "x": 543,
      "y": 1211,
      "w": 116,
      "h": 225,
      "anchorX": 619.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 4,
      "x": 719,
      "y": 1208,
      "w": 118,
      "h": 232,
      "anchorX": 796.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 5,
      "x": 897,
      "y": 1205,
      "w": 117,
      "h": 234,
      "anchorX": 973.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 6,
      "x": 1081,
      "y": 1204,
      "w": 122,
      "h": 236,
      "anchorX": 1150.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 7,
      "x": 1268,
      "y": 1189,
      "w": 116,
      "h": 253,
      "anchorX": 1327.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 8,
      "x": 1450,
      "y": 1188,
      "w": 113,
      "h": 254,
      "anchorX": 1504.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 9,
      "x": 1630,
      "y": 1189,
      "w": 112,
      "h": 253,
      "anchorX": 1681.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 10,
      "x": 1804,
      "y": 1196,
      "w": 125,
      "h": 245,
      "anchorX": 1858.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 11,
      "x": 1975,
      "y": 1209,
      "w": 137,
      "h": 230,
      "anchorX": 2035.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 12,
      "x": 2151,
      "y": 1212,
      "w": 140,
      "h": 230,
      "anchorX": 2212.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 13,
      "x": 2328,
      "y": 1216,
      "w": 137,
      "h": 226,
      "anchorX": 2389.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 14,
      "x": 2512,
      "y": 1215,
      "w": 115,
      "h": 231,
      "anchorX": 2566.0,
      "baseline": 1440
    },
    {
      "row": 4,
      "direction": 15,
      "x": 2689,
      "y": 1210,
      "w": 110,
      "h": 236,
      "anchorX": 2743.0,
      "baseline": 1440
    },
    {
      "row": 5,
      "direction": 0,
      "x": 34,
      "y": 1502,
      "w": 108,
      "h": 232,
      "anchorX": 88.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 1,
      "x": 206,
      "y": 1501,
      "w": 108,
      "h": 230,
      "anchorX": 265.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 2,
      "x": 372,
      "y": 1506,
      "w": 112,
      "h": 223,
      "anchorX": 442.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 3,
      "x": 533,
      "y": 1503,
      "w": 134,
      "h": 226,
      "anchorX": 619.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 4,
      "x": 709,
      "y": 1499,
      "w": 136,
      "h": 232,
      "anchorX": 796.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 5,
      "x": 887,
      "y": 1497,
      "w": 134,
      "h": 233,
      "anchorX": 973.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 6,
      "x": 1083,
      "y": 1480,
      "w": 115,
      "h": 251,
      "anchorX": 1150.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 7,
      "x": 1266,
      "y": 1476,
      "w": 118,
      "h": 258,
      "anchorX": 1327.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 8,
      "x": 1447,
      "y": 1474,
      "w": 116,
      "h": 258,
      "anchorX": 1504.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 9,
      "x": 1625,
      "y": 1476,
      "w": 118,
      "h": 258,
      "anchorX": 1681.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 10,
      "x": 1800,
      "y": 1488,
      "w": 134,
      "h": 244,
      "anchorX": 1858.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 11,
      "x": 1981,
      "y": 1497,
      "w": 136,
      "h": 233,
      "anchorX": 2035.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 12,
      "x": 2156,
      "y": 1500,
      "w": 139,
      "h": 232,
      "anchorX": 2212.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 13,
      "x": 2336,
      "y": 1503,
      "w": 135,
      "h": 228,
      "anchorX": 2389.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 14,
      "x": 2516,
      "y": 1507,
      "w": 109,
      "h": 227,
      "anchorX": 2566.0,
      "baseline": 1730
    },
    {
      "row": 5,
      "direction": 15,
      "x": 2692,
      "y": 1501,
      "w": 108,
      "h": 227,
      "anchorX": 2743.0,
      "baseline": 1730
    },
    {
      "row": 6,
      "direction": 0,
      "x": 36,
      "y": 1790,
      "w": 114,
      "h": 237,
      "anchorX": 88.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 1,
      "x": 209,
      "y": 1790,
      "w": 113,
      "h": 222,
      "anchorX": 265.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 2,
      "x": 371,
      "y": 1806,
      "w": 124,
      "h": 219,
      "anchorX": 442.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 3,
      "x": 537,
      "y": 1802,
      "w": 148,
      "h": 221,
      "anchorX": 619.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 4,
      "x": 713,
      "y": 1798,
      "w": 151,
      "h": 224,
      "anchorX": 796.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 5,
      "x": 891,
      "y": 1794,
      "w": 148,
      "h": 226,
      "anchorX": 973.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 6,
      "x": 1071,
      "y": 1777,
      "w": 130,
      "h": 244,
      "anchorX": 1150.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 7,
      "x": 1272,
      "y": 1770,
      "w": 107,
      "h": 252,
      "anchorX": 1327.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 8,
      "x": 1451,
      "y": 1770,
      "w": 109,
      "h": 252,
      "anchorX": 1504.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 9,
      "x": 1627,
      "y": 1770,
      "w": 117,
      "h": 252,
      "anchorX": 1681.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 10,
      "x": 1805,
      "y": 1779,
      "w": 123,
      "h": 241,
      "anchorX": 1858.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 11,
      "x": 1986,
      "y": 1792,
      "w": 128,
      "h": 226,
      "anchorX": 2035.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 12,
      "x": 2158,
      "y": 1796,
      "w": 134,
      "h": 222,
      "anchorX": 2212.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 13,
      "x": 2341,
      "y": 1800,
      "w": 127,
      "h": 215,
      "anchorX": 2389.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 14,
      "x": 2517,
      "y": 1800,
      "w": 116,
      "h": 215,
      "anchorX": 2566.0,
      "baseline": 2020
    },
    {
      "row": 6,
      "direction": 15,
      "x": 2692,
      "y": 1790,
      "w": 115,
      "h": 222,
      "anchorX": 2743.0,
      "baseline": 2020
    },
    {
      "row": 7,
      "direction": 0,
      "x": 31,
      "y": 2088,
      "w": 114,
      "h": 226,
      "anchorX": 88.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 1,
      "x": 204,
      "y": 2087,
      "w": 112,
      "h": 226,
      "anchorX": 265.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 2,
      "x": 371,
      "y": 2092,
      "w": 123,
      "h": 222,
      "anchorX": 442.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 3,
      "x": 536,
      "y": 2085,
      "w": 122,
      "h": 227,
      "anchorX": 619.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 4,
      "x": 712,
      "y": 2081,
      "w": 126,
      "h": 231,
      "anchorX": 796.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 5,
      "x": 890,
      "y": 2079,
      "w": 119,
      "h": 232,
      "anchorX": 973.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 6,
      "x": 1081,
      "y": 2067,
      "w": 125,
      "h": 245,
      "anchorX": 1150.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 7,
      "x": 1270,
      "y": 2064,
      "w": 114,
      "h": 250,
      "anchorX": 1327.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 8,
      "x": 1447,
      "y": 2063,
      "w": 116,
      "h": 249,
      "anchorX": 1504.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 9,
      "x": 1625,
      "y": 2064,
      "w": 119,
      "h": 250,
      "anchorX": 1681.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 10,
      "x": 1812,
      "y": 2069,
      "w": 119,
      "h": 242,
      "anchorX": 1858.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 11,
      "x": 1985,
      "y": 2083,
      "w": 135,
      "h": 226,
      "anchorX": 2035.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 12,
      "x": 2162,
      "y": 2086,
      "w": 136,
      "h": 225,
      "anchorX": 2212.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 13,
      "x": 2339,
      "y": 2090,
      "w": 135,
      "h": 219,
      "anchorX": 2389.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 14,
      "x": 2522,
      "y": 2096,
      "w": 117,
      "h": 217,
      "anchorX": 2566.0,
      "baseline": 2310
    },
    {
      "row": 7,
      "direction": 15,
      "x": 2690,
      "y": 2087,
      "w": 116,
      "h": 225,
      "anchorX": 2743.0,
      "baseline": 2310
    }
  ]
};
const WALKER_ATLAS_PNG = '';
/* A4.1 GAMEPLAY MOTION TEST — presentation-only integration. Game simulation/AI/controls remain from 0.32.9. */
const A41_MOTION_ATLAS=Object.freeze({width:2760,height:1500,cellW:230,cellH:300,frameCount:12,anchorX:115,baseline:257,referenceHeight:239});
const A41_MOTION_ROW=Object.freeze({idle:0,walk:1,jog:2,sprint:3,attack:4});
const A41_MOTION_ATLAS_PNG = '';

function isSpriteWalker(z){return (z.kind==='walker'||z.kind==='runner')&&!z.hunter;}
function walkerRunAmount(z,speed){
 const s=Math.max(0,Number(speed)||0),runner=z?.kind==='runner',start=runner?46:62,end=runner?66:80;
 return clamp((s-start)/(end-start),0,1);
}
function walkerLifeProfile(id=0){
 const n=Math.abs(id|0),u=((Math.imul((n+17)>>>0,2654435761)>>>0)&65535)/65535,v=((Math.imul((n+43)>>>0,1597334677)>>>0)&65535)/65535,w=((Math.imul((n+71)>>>0,2246822519)>>>0)&65535)/65535;
 return{tempo:.90+u*.20,drag:v*.22,hunch:.035+w*.070,sway:.018+u*.022,phase:(n%11)*.571,hitSide:(n&1)?1:-1,deathSide:(n%4<2)?1:-1};
}
function selectWalkerDirection(prevDirection,phase,margin=.18){
 const wrap16=n=>((n%16)+16)%16,p=wrap16(Number(phase)||0),nearest=wrap16(Math.round(p));
 if(!Number.isFinite(prevDirection))return nearest;
 const prev=wrap16(Math.round(prevDirection));let d=((p-prev+8)%16+16)%16-8;
 if(Math.abs(d)<=.5+Math.max(0,Number(margin)||0))return prev;
 return nearest;
}
function a41MotionState(z,motion={}){
 if(z?.attack)return 'attack';
 if(z?.dead)return 'idle';
 const speed=Math.max(0,Number(motion.filteredSpeed??motion.speed)||0);
 if(speed<=4.5)return 'idle';
 const run=clamp(Number(motion.runVisual)||0,0,1);
 if(run<.28)return 'walk';
 if(run<.72)return 'jog';
 return 'sprint';
}
function a41Region(state,frame){
 const row=A41_MOTION_ROW[state]??0,i=Math.max(0,Math.min(A41_MOTION_ATLAS.frameCount-1,frame|0));
 const x=i*A41_MOTION_ATLAS.cellW,y=row*A41_MOTION_ATLAS.cellH;
 return{x,y,w:A41_MOTION_ATLAS.cellW,h:A41_MOTION_ATLAS.cellH,anchorX:x+A41_MOTION_ATLAS.anchorX,baseline:y+A41_MOTION_ATLAS.baseline};
}
function walkerSpritePlan(z,motion={},camera={position:{x:0,y:15,z:7},target:{x:0,y:0,z:0}}){
 const dx=camera.position.x-camera.target.x,dz=camera.position.z-camera.target.z,viewYaw=Math.atan2(dx,dz),facing=Number.isFinite(motion.displayAngle)?motion.displayAngle:(z.aim||0),life=walkerLifeProfile(z.id||0),sixteenth=Math.PI/8;
 const wrap16=n=>((n%16)+16)%16,smooth01=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
 const directionPhase=wrap16((facing+viewYaw-Math.PI/2)/sixteenth),committedDirection=selectWalkerDirection(motion.spriteDirection,directionPhase,.18);motion.spriteDirection=committedDirection;
 const speed=Math.max(0,Number(motion.filteredSpeed??motion.speed)||0),moving=!z.dead&&speed>4.5,travel=Math.max(0,Number(motion.gaitClock??motion.travel)||0),gaitTravel=travel*(.98+life.tempo*.02);
 let state=a41MotionState(z,motion),phase=0,framePhase=0;
 if(state==='idle')phase=((Number(motion.motionClock)||0)*.60+life.phase*.035)%1;
 else if(state==='attack'){
  const attackTotal=Math.max(.001,Number(z?.attack?.total)||.65),attackProgress=clamp(1-(Number(z?.attack?.left)||0)/attackTotal,0,1);
  phase=attackProgress;framePhase=phase*(A41_MOTION_ATLAS.frameCount-1);
 }else{
  const cycleDistance=state==='walk'?1.36:state==='jog'?1.10:.94;
  phase=((gaitTravel/cycleDistance)+(Math.abs(z.id||0)%7)/7)%1;
 }
 if(state!=='attack')framePhase=phase*A41_MOTION_ATLAS.frameCount;
 const frameFloor=Math.floor(framePhase),last=A41_MOTION_ATLAS.frameCount-1;
 const frame0=state==='attack'?Math.min(last,frameFloor):((frameFloor%A41_MOTION_ATLAS.frameCount)+A41_MOTION_ATLAS.frameCount)%A41_MOTION_ATLAS.frameCount;
 const frame1=state==='attack'?Math.min(last,frame0+1):(frame0+1)%A41_MOTION_ATLAS.frameCount;
 const frameBlend=z.dead?0:smooth01(framePhase-frameFloor),r0=a41Region(state,frame0),r1=a41Region(state,frame1),h=1.78,ref=A41_MOTION_ATLAS.referenceHeight;
 const p=simToWorld(Number.isFinite(motion.renderX)?motion.renderX:z.x,Number.isFinite(motion.renderY)?motion.renderY:z.y),hit=clamp(Number(motion.hitKick)||0,0,1);
 const b=r=>[(r.x-r.anchorX)/ref*h,(r.baseline-r.y-r.h)/ref*h,(r.x+r.w-r.anchorX)/ref*h,(r.baseline-r.y)/ref*h],uv=r=>[r.x/A41_MOTION_ATLAS.width,r.y/A41_MOTION_ATLAS.height,(r.x+r.w)/A41_MOTION_ATLAS.width,(r.y+r.h)/A41_MOTION_ATLAS.height],mixFrame=(a,c)=>a.map((v,i)=>lerp(v,c[i],frameBlend));
 const bounds=mixFrame(b(r0),b(r1)),uv00=uv(r0),uv10=uv(r1);
 const deathAge=Math.max(0,Number(motion.deathAge)||0),deathProgress=z.dead?clamp(deathAge/1.55,0,1):0,fadeProgress=z.dead?clamp((deathAge-1.95)/.85,0,1):0,deathEase=deathProgress*deathProgress*(3-2*deathProgress);
 const poseRoll=(life.hitSide*.055*hit)+(life.deathSide*1.03*deathEase),poseX=1+deathEase*.10,poseY=(1-hit*.025)*(1-deathEase*.57),poseLift=-deathEase*.015,alpha=z.dead?1-fadeProgress:1;
 const runAmount=Number.isFinite(motion.runVisual)?motion.runVisual:walkerRunAmount(z,speed);
 return{actorId:z.id||0,direction:committedDirection,committedDirection,direction0:committedDirection,direction1:committedDirection,directionBlend:0,frame:frame0,frame0,frame1,frameBlend,gaitPhase:phase,state,runAmount,useRunArt:state==='sprint',region:r0,position:{x:p.x,y:.018-(z.graveRise>0?1.45*Math.pow(clamp(z.graveRise/z.graveTotal,0,1),1.25):0),z:p.z},height:h,alpha,hit,pose:[poseRoll,poseX,poseY,poseLift],personality:life,deathAge,attackProgress:state==='attack'?phase:0,visualHeading:facing,angularVelocity:Number(motion.angularVelocity)||0,
  shadow:{sx:.40+deathEase*.12,sz:.27+deathEase*.05,alpha:1-fadeProgress*.75},bounds,uv00,uv01:uv00,uv10,uv11:uv10,blend:[frameBlend,0,0,0]};
}
const WALKER_SPRITE_VS=`#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 iAnchorAlpha;
layout(location=2) in vec4 iBounds;
layout(location=3) in vec4 iUV00;
layout(location=4) in vec4 iUV01;
layout(location=5) in vec4 iUV10;
layout(location=6) in vec4 iUV11;
layout(location=7) in vec4 iBlend;
layout(location=8) in vec4 iPose;
uniform mat4 uProj,uView;
out vec2 vUV00,vUV01,vUV10,vUV11;flat out vec2 vBlend;out float vAlpha,vHit,vDistance;
vec2 cellUV(vec4 rect,vec2 c){return vec2(mix(rect.x,rect.z,c.x),mix(rect.w,rect.y,c.y));}
void main(){
 vec3 right=vec3(uView[0][0],uView[1][0],uView[2][0]);
 vec3 up=vec3(uView[0][1],uView[1][1],uView[2][1]);
 vec2 offset=mix(iBounds.xy,iBounds.zw,aCorner);offset*=iPose.yz;
 float c=cos(iPose.x),s=sin(iPose.x);offset=vec2(c*offset.x-s*offset.y,s*offset.x+c*offset.y);offset.y+=iPose.w;
 vec3 world=iAnchorAlpha.xyz+right*offset.x+up*offset.y;gl_Position=uProj*uView*vec4(world,1.0);
 vUV00=cellUV(iUV00,aCorner);vUV01=cellUV(iUV01,aCorner);vUV10=cellUV(iUV10,aCorner);vUV11=cellUV(iUV11,aCorner);vBlend=iBlend.xy;
 vAlpha=iAnchorAlpha.w;vHit=iBlend.z;vDistance=length((uView*vec4(world,1.0)).xyz);
}`;
const WALKER_SPRITE_FS=`#version 300 es
precision highp float;
in vec2 vUV00,vUV01,vUV10,vUV11;flat in vec2 vBlend;in float vAlpha,vHit,vDistance;
uniform sampler2D uAtlas;uniform vec3 uFog;out vec4 outColor;
vec4 pm(vec4 t){return vec4(t.rgb*t.a,t.a);}
void main(){
 vec4 t00=pm(texture(uAtlas,vUV00)),t10=pm(texture(uAtlas,vUV10));
 vec4 texel=mix(t00,t10,vBlend.x);
 if(texel.a<.16)discard;float dither=fract(dot(floor(gl_FragCoord.xy),vec2(.754877666,.569840296)));if(vAlpha<dither)discard;
 vec3 color=(texel.rgb/max(texel.a,.001))*1.10;color=mix(color,vec3(1.0,.72,.55),vHit*.38);float fog=smoothstep(17.0,49.0,vDistance);outColor=vec4(mix(color,uFog,fog),1.0);
}`
class WalkerSpriteRenderer{
 constructor(gl){
  this.gl=gl;this.ready=false;this.error=null;this.capacity=0;this.data=new Float32Array(0);
  this.program=gl.createProgram();gl.attachShader(this.program,shader(gl,gl.VERTEX_SHADER,WALKER_SPRITE_VS));gl.attachShader(this.program,shader(gl,gl.FRAGMENT_SHADER,WALKER_SPRITE_FS));gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
  this.loc={proj:gl.getUniformLocation(this.program,'uProj'),view:gl.getUniformLocation(this.program,'uView'),fog:gl.getUniformLocation(this.program,'uFog'),atlas:gl.getUniformLocation(this.program,'uAtlas')};
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,1,1,0,0,1,1,0,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(const [loc,size,offset] of [[1,4,0],[2,4,16],[3,4,32],[4,4,48],[5,4,64],[6,4,80],[7,4,96],[8,4,112]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,128,offset);gl.vertexAttribDivisor(loc,1);}gl.bindVertexArray(null);
  this.texture=gl.createTexture();this.image=new Image();this.image.onload=()=>{try{gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.ready=true;}catch(e){this.error=String(e);}};this.image.onerror=()=>{this.error='Walker artwork could not load';};this.image.src=A41_MOTION_ATLAS_PNG;
 }
 draw(plans,frame,metrics){
  if(!this.ready||!plans.length)return;const gl=this.gl,need=plans.length*32;
  if(need>this.capacity){this.capacity=Math.max(32*32,this.capacity*2,need);this.data=new Float32Array(this.capacity);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.capacity*4,gl.DYNAMIC_DRAW);}
  let o=0;for(const p of plans){this.data.set([p.position.x,p.position.y,p.position.z,p.alpha,...p.bounds,...p.uv00,...p.uv01,...p.uv10,...p.uv11,p.frameBlend,p.directionBlend,p.hit,0,...p.pose],o);o+=32;}
  gl.useProgram(this.program);gl.uniformMatrix4fv(this.loc.proj,false,frame.proj);gl.uniformMatrix4fv(this.loc.view,false,frame.view);gl.uniform3f(this.loc.fog,...frame.fog);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.loc.atlas,0);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data.subarray(0,need));gl.drawArraysInstanced(gl.TRIANGLES,0,6,plans.length);gl.bindVertexArray(null);gl.enable(gl.CULL_FACE);
  metrics.drawCalls++;metrics.walkerSprites=plans.length;metrics.walkerSpriteDrawCalls=1;
 }
}

// Deadwatch 0.35 bullet presentation. World-space paths; camera-facing soft ribbons.
const BULLET_STYLE=Object.freeze({
 carbine:{length:1.08,width:.13,color:'#ffb23e'},
 deathmachine:{length:1.40,width:.145,color:'#ffbf59'},
 ray:{length:.82,width:.15,color:'#62ffc0'},
 heli:{length:1.32,width:.13,color:'#ffbf59'},
 tank:{length:1.35,width:.17,color:'#ffb24f'}
});
function bulletVisuals(path,weapon='carbine',muzzle=null){
 if(!path?.a||!path?.b)return[];
 const start=simToWorld(path.a.x,path.a.y),end=simToWorld(path.b.x,path.b.y),a=muzzle?{...muzzle}:{...start,y:1.5};
 const forward={x:path.b.x-path.a.x,z:path.b.y-path.a.y};
 // A wall can stop the simulation shot before the visible barrel. Never draw backwards.
 if((end.x-a.x)*forward.x+(end.z-a.z)*forward.z<=0)return[];
 const b={x:end.x,y:a.y,z:end.z},distance=Math.hypot(b.x-a.x,b.z-a.z);
 if(distance<.015)return[];
 const style=BULLET_STYLE[weapon]||BULLET_STYLE.carbine,travel=clamp(distance/190,.033,.135),duration=travel+.027;
 const seed=(Math.abs(path.b.x*17.13+path.b.y*7.77)%1)*Math.PI*2;
 const result=[{kind:'bulletRibbon',weapon,worldA:a,worldB:b,travel,life:duration,max:duration,fresh:true,seed}];
 if(path.kind==='wall')result.push({kind:'bulletImpact',worldP:b,delay:travel,life:travel+.085,max:travel+.085,fresh:true,seed,weapon});
 return result;
}
function bulletRibbonPlan(effects=[],liveMuzzle=null){
 const out=[],push=(a,b,width,opacity,color,mode=0)=>{if(opacity>.001&&Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)>.001)out.push({a,b,width,opacity:clamp(opacity,0,1),color,mode});};
 for(const e of effects){
  if(!(e.life>0))continue;
  const elapsed=Math.max(0,e.max-e.life),style=BULLET_STYLE[e.weapon]||BULLET_STYLE.carbine;
  if(e.kind==='bulletRibbon'){
   const a=e.worldA,b=e.worldB,dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,full=Math.hypot(dx,dy,dz);
   if(full<.001)continue;
   const length=Math.min(style.length,full*.78),travel=Math.max(.001,e.travel),head=Math.min(full,full*elapsed/travel+.12);
   const tail=Math.max(0,head-length)+Math.max(0,elapsed-travel)/.027*Math.min(length,head);
   if(tail>=head)continue;
   const point=d=>({x:a.x+dx*d/full,y:a.y+dy*d/full,z:a.z+dz*d/full});
   const fade=1-clamp((elapsed-travel)/.027,0,1);
   push(point(tail),point(head),style.width,Math.pow(fade,.55),style.color);
  }else if(e.kind==='muzzle'&&e.worldP){
   const a=liveMuzzle?.muzzleWorld||e.worldP,dir=liveMuzzle?{x:Math.cos(liveMuzzle.weaponAngle),z:Math.sin(liveMuzzle.weaponAngle)}:(e.worldDir||{x:1,z:0}),mag=Math.hypot(dir.x,dir.z)||1,dx=dir.x/mag,dz=dir.z/mag;
   const age=clamp(elapsed/Math.max(.001,e.max),0,1),fade=Math.pow(1-age,1.1),length=(e.weapon==='deathmachine'?.39:.30)*(1-age*.5),width=style.width*1.45;
   push(a,{x:a.x+dx*length,y:a.y,z:a.z+dz*length},width,fade,style.color,1);
   for(const side of [-1,1])push({x:a.x+dx*.045,y:a.y,z:a.z+dz*.045},{x:a.x+dx*.11-dz*side*.10,y:a.y+side*.035,z:a.z+dz*.11+dx*side*.10},width*.53,fade*.58,style.color,1);
  }else if(e.kind==='bulletImpact'){
   const t=elapsed-(e.delay||0);if(t<0)continue;
   const age=clamp(t/.085,0,1),a=e.worldP;
   for(let i=0;i<4;i++){
    const ang=(e.seed||0)+i*2.399,dist=.028+t*(2.2+i*.52),len=.07*(1-age)+.025;
    const end={x:a.x+Math.cos(ang)*dist,y:a.y+Math.sin(ang*1.7)*dist*.6,z:a.z+Math.sin(ang)*dist};
    push({x:end.x-Math.cos(ang)*len,y:end.y-.015,z:end.z-Math.sin(ang)*len},end,.030,Math.pow(1-age,1.5),e.weapon==='ray'?'#7affc9':'#ffcd75',1);
   }
  }
 }
 return out;
}
const BULLET_VS=`#version 300 es
precision highp float;
layout(location=0)in vec2 aCorner;
layout(location=1)in vec3 iA;layout(location=2)in vec3 iB;
layout(location=3)in vec2 iSize;layout(location=4)in vec3 iColor;layout(location=5)in float iMode;
uniform mat4 uView,uProj;uniform float uHeight;
out vec2 vUv;flat out vec4 vColor;flat out float vMode;
void main(){
 vec4 A=uView*vec4(iA,1.),B=uView*vec4(iB,1.);vec2 d=B.xy-A.xy;
 vec2 side=length(d)>.00001?normalize(vec2(-d.y,d.x)):vec2(1.,0.);
 vec4 p=mix(A,B,aCorner.x);float pixelWorld=2.*max(.1,-p.z)/(uProj[1][1]*uHeight);
 float width=max(iSize.x,pixelWorld*(iMode>2.5?.85:iMode>1.5?1.25:1.35));
 float taper=iMode<-.5?1.:iMode>2.5?(.65+.35*aCorner.x):iMode>.5?1.:(.28+.72*sqrt(aCorner.x));
 p.xy+=side*aCorner.y*width*taper;
 gl_Position=uProj*p;vUv=aCorner;vColor=vec4(iColor,iSize.y);vMode=iMode;
}`;
const BULLET_FS=`#version 300 es
precision highp float;
in vec2 vUv;flat in vec4 vColor;flat in float vMode;out vec4 outColor;
void main(){
 float x=vUv.x,y=abs(vUv.y),edge=smoothstep(0.,.11,x)*(1.-smoothstep(.87,1.,x));
 if(vMode<-.5){
  float core=exp(-y*y*110.),halo=exp(-y*y*7.)*.30;
  float alpha=(core+halo)*vColor.a;
  if(alpha<.006)discard;
  outColor=vec4(mix(vColor.rgb,vec3(.91,1.,1.),core*.90),alpha);return;
 }
 if(vMode>1.5){
  float alpha=exp(-y*y*5.5)*edge*vColor.a;
  if(alpha<.005)discard;
  outColor=vec4(vColor.rgb,alpha);return;
 }
 float tail=vMode>.5?1.:(.20+.80*x);
 float headShape=exp(-pow((x-.80)*9.,2.));
 float core=exp(-y*y*105.)*(vMode>.5?1.:(.45+.55*headShape));
 float halo=exp(-y*y*9.)*.27;
 float head=headShape*exp(-y*y*18.)*.72;
 float energy=(core+halo+head)*edge*tail;
 float alpha=clamp(energy*vColor.a,0.,1.);
 if(alpha<.006)discard;
 vec3 tint=mix(vColor.rgb,vec3(1.,.98,.88),min(.92,core*.76+head*.48));
 outColor=vec4(tint,alpha);
}`;
class BulletRibbonRenderer{
 constructor(gl){
  this.gl=gl;this.capacity=0;this.data=null;
  this.p=gl.createProgram();gl.attachShader(this.p,shader(gl,gl.VERTEX_SHADER,BULLET_VS));gl.attachShader(this.p,shader(gl,gl.FRAGMENT_SHADER,BULLET_FS));gl.linkProgram(this.p);
  if(!gl.getProgramParameter(this.p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.p));
  this.loc={view:gl.getUniformLocation(this.p,'uView'),proj:gl.getUniformLocation(this.p,'uProj'),height:gl.getUniformLocation(this.p,'uHeight')};
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
  this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,-1,1,-1,1,1,0,-1,1,1,0,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,8,0);
  this.instances=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);
  for(const [location,count,offset] of [[1,3,0],[2,3,3],[3,2,6],[4,3,8],[5,1,11]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,count,gl.FLOAT,false,48,offset*4);gl.vertexAttribDivisor(location,1);}
  gl.bindVertexArray(null);
 }
 draw(plans,frame,height,metrics={},weather=false){
  const n=plans.length;if(!n)return;const gl=this.gl;
  if(n>this.capacity){this.capacity=2**Math.ceil(Math.log2(Math.max(16,n)));this.data=new Float32Array(this.capacity*12);gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,gl.DYNAMIC_DRAW);}
  for(let i=0;i<n;i++){const p=plans[i],color=hex(p.color);this.data.set([p.a.x,p.a.y,p.a.z,p.b.x,p.b.y,p.b.z,p.width,p.opacity,...color,p.mode||0],i*12);}
  gl.useProgram(this.p);gl.uniformMatrix4fv(this.loc.view,false,frame.view);gl.uniformMatrix4fv(this.loc.proj,false,frame.proj);gl.uniform1f(this.loc.height,height);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.SRC_ALPHA,weather?gl.ONE_MINUS_SRC_ALPHA:gl.ONE);
  gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data.subarray(0,n*12));gl.drawArraysInstanced(gl.TRIANGLES,0,6,n);
  gl.bindVertexArray(null);gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.CULL_FACE);
  metrics.drawCalls=(metrics.drawCalls||0)+1;
  if(weather){metrics.weatherRibbons=n;metrics.weatherDrawCalls=1;}else{metrics.bulletRibbons=n;metrics.bulletDrawCalls=1;}
 }
}

// Power-up presentation only. Simulation, timers, damage and controls stay in the core.
function createPowerupRing(){
 const positions=[],normals=[],point=(u,v)=>[Math.sin(v)*.12,(1+Math.cos(v)*.12)*Math.cos(u),(1+Math.cos(v)*.12)*Math.sin(u)],normal=(u,v)=>[Math.sin(v),Math.cos(v)*Math.cos(u),Math.cos(v)*Math.sin(u)];
 for(let i=0;i<20;i++)for(let j=0;j<6;j++){
  const u=i*Math.PI/10,v=j*Math.PI/3,du=Math.PI/10,dv=Math.PI/3;
  for(const [a,b] of [[u,v],[u+du,v],[u+du,v+dv],[u,v],[u+du,v+dv],[u,v+dv]]){positions.push(...point(a,b));normals.push(...normal(a,b));}
 }
 return {positions,normals};
}
function createPowerupHull(){
 const ring=[[-.80,-1],[.80,-1],[1,-.78],[1,.78],[.80,1],[-.80,1],[-1,.78],[-1,-.78]],vertices=[],positions=[],normals=[];
 for(const y of [-1,1])for(const [x,z] of ring)vertices.push([x*(y===1?.91:1),y,z*(y===1?.90:1)]);
 function tri(i,j,k){
  let A=vertices[i],B=vertices[j],D=vertices[k],u=B.map((x,n)=>x-A[n]),v=D.map((x,n)=>x-A[n]),N=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(N.reduce((s,x,n)=>s+x*(A[n]+B[n]+D[n]),0)<0){[B,D]=[D,B];N=N.map(x=>-x);}
  const len=Math.hypot(...N);N=N.map(x=>x/len);for(const p of [A,B,D]){positions.push(...p);normals.push(...N);}
 }
 for(let i=0;i<8;i++){const j=(i+1)%8;tri(i,j,j+8);tri(i,j+8,i+8);}
 for(let i=1;i<7;i++){tri(0,i,i+1);tri(8,8+i,9+i);}
 return {positions,normals};
}
function createTankMeshes(){
 // A smoother round profile is used only by the playable tank at High/Auto detail.
 const round=createCylinderMesh(32);
 for(const key of ['positions','normals'])for(let i=0;i<round[key].length;i+=9)for(let j=0;j<3;j++)[round[key][i+3+j],round[key][i+6+j]]=[round[key][i+6+j],round[key][i+3+j]];
 // Closed armor shells with distinct lower hull, sloping glacis and chamfered turret cheeks.
 const shell=rings=>{
  const v=rings.flat(),n=rings[0].length,faces=[],positions=[],normals=[];
  for(let r=0;r<rings.length-1;r++)for(let j=0;j<n;j++){const k=(j+1)%n,a=r*n+j,b=r*n+k,c=(r+1)*n+j,d=(r+1)*n+k;faces.push([a,b,c],[b,d,c]);}
  for(let j=1;j<n-1;j++){faces.push([0,j,j+1]);const o=(rings.length-1)*n;faces.push([o,o+j+1,o+j]);}
  const center=v.reduce((a,p)=>a.map((x,i)=>x+p[i]/v.length),[0,0,0]);
  for(const f of faces){let [a,b,c]=f.map(i=>v[i]);const u=b.map((x,i)=>x-a[i]),w=c.map((x,i)=>x-a[i]);let normal=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];
   if(normal.reduce((s,x,i)=>s+x*((a[i]+b[i]+c[i])/3-center[i]),0)<0){[b,c]=[c,b];normal=normal.map(x=>-x);}
   const l=Math.hypot(...normal)||1;for(const p of [a,b,c]){positions.push(...p);normals.push(...normal.map(x=>x/l));}
  }return{positions,normals};
 };
 const ring=(rear,front,width,y,cut)=>[[rear,y,-width+cut],[rear+cut,y,-width],[front-cut,y,-width],[front,y,-width+cut],[front,y,width-cut],[front-cut,y,width],[rear+cut,y,width],[rear,y,width-cut]];
 return{
  tankHull:shell([ring(-1.28,1.26,.70,.32,.17),ring(-1.42,1.46,.88,.67,.23),ring(-1.20,.88,.76,1.045,.16)]),
  tankRoundCylinder:round,
  tankHullDetailed:shell([ring(-1.61,1.59,.70,.32,.17),ring(-1.75,1.79,.88,.67,.23),ring(-1.546,1.250,.768,1.018,.165),ring(-1.513,1.193,.740,1.045,.153)]),
  tankTurretDetailed:shell([ring(-.83,.71,.54,1.095,.19),ring(-.88,.78,.64,1.24,.24),ring(-.713,.455,.473,1.495,.167),ring(-.683,.413,.443,1.515,.15)]),
  tankTurret:shell([ring(-.83,.71,.54,1.095,.19),ring(-.88,.78,.64,1.24,.24),ring(-.70,.43,.46,1.515,.16)])
 };
}
// Collectible presentation only; shared meshes keep treasure showers batched.
function createPickupRoundBox(){
 const positions=[],normals=[],steps=[-1,-.965,-.90,-.78,0,.78,.90,.965,1],radius=.22;
 for(const axis of [0,1,2])for(const side of [-1,1]){
  const u=(axis+1)%3,v=(axis+2)%3;
  const point=(a,b)=>{const p=[0,0,0];p[axis]=side;p[u]=a;p[v]=b;const core=p.map(x=>clamp(x,-1+radius,1-radius)),delta=p.map((x,i)=>x-core[i]),len=Math.hypot(...delta),n=delta.map(x=>x/len);return {p:core.map((x,i)=>x+n[i]*radius),n};};
  for(let i=0;i<steps.length-1;i++)for(let j=0;j<steps.length-1;j++){
   const A=point(steps[i],steps[j]),B=point(steps[i+1],steps[j]),D=point(steps[i+1],steps[j+1]),E=point(steps[i],steps[j+1]);
   for(const face of (side>0?[[A,B,D],[A,D,E]]:[[A,D,B],[A,E,D]]))for(const q of face){positions.push(...q.p);normals.push(...q.n);}
  }
 }
 return {positions,normals};
}
// Smooth, closed armor shell with a shallow dent and an uneven worn rim.
function createBreakerShellMesh(){
 const positions=[],normals=[],segments=24,rings=8;
 const point=(row,col)=>{
  const p=row/rings*Math.PI/2,a=col/segments*Math.PI*2,s=Math.sin(p),c=Math.cos(p);
  const notch=Math.exp(-Math.pow(Math.atan2(Math.sin(a-.7),Math.cos(a-.7))/.26,2));
  const rim=1+.024*Math.sin(a*3)-.12*notch*Math.pow(s,6);
  return{x:[s*Math.cos(a)*rim,c*(1-.10*notch*s*s),s*Math.sin(a)*rim],n:[s*Math.cos(a),c,s*Math.sin(a)]};
 };
 const tri=(a,b,c,bottom=false)=>{for(const v of [a,b,c]){positions.push(...v.x);normals.push(...(bottom?[0,-1,0]:v.n));}};
 for(let row=0;row<rings;row++)for(let col=0;col<segments;col++){
  const a=point(row,col),b=point(row,col+1),c=point(row+1,col+1),d=point(row+1,col);
  if(row>0)tri(a,b,c);tri(a,c,d);
 }
 const center={x:[0,0,0],n:[0,-1,0]};
 for(let col=0;col<segments;col++)tri(point(rings,col),point(rings,col+1),center,true);
 return{positions,normals};
}

function createCinematicJetMesh(){
 const outline=[[1.55,0],[1.12,.16],[.25,.26],[-.15,1.08],[-.48,1.02],[-.32,.28],[-1.02,.18],[-1.22,.52],[-1.43,.48],[-1.31,0],[-1.43,-.48],[-1.22,-.52],[-1.02,-.18],[-.32,-.28],[-.48,-1.02],[-.15,-1.08],[.25,-.26],[1.12,-.16]],positions=[],normals=[],half=.055;
 const push=(a,b,c,wantY=null)=>{let u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;if(wantY!==null&&n[1]*wantY<0){[b,c]=[c,b];n=n.map(q=>-q);}for(const p of [a,b,c]){positions.push(...p);normals.push(...n.map(q=>q/l));}};
 for(const y of [half,-half])for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length;push([0,y,0],[outline[i][0],y,outline[i][1]],[outline[j][0],y,outline[j][1]],y);}
 for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length,a=[outline[i][0],-half,outline[i][1]],b=[outline[j][0],-half,outline[j][1]],c=[outline[j][0],half,outline[j][1]],d=[outline[i][0],half,outline[i][1]];push(a,b,c);push(a,c,d);}
 return{positions,normals};
}

function createPickupMeshes(){
 const outward=data=>{for(const key of ['positions','normals'])for(let i=0;i<data[key].length;i+=9)for(let j=0;j<3;j++)[data[key][i+3+j],data[key][i+6+j]]=[data[key][i+6+j],data[key][i+3+j]];return data;};
 const gem={positions:[],normals:[]},bolt={positions:[],normals:[]},radiation={positions:[],normals:[]};
 const tri=(mesh,A,B,D)=>{const u=B.map((x,i)=>x-A[i]),v=D.map((x,i)=>x-A[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n);for(const p of [A,B,D]){mesh.positions.push(...p);mesh.normals.push(...n.map(x=>x/l));}};
 const face=(A,B,D)=>{const u=B.map((x,i)=>x-A[i]),v=D.map((x,i)=>x-A[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(n.reduce((s,x,i)=>s+x*(A[i]+B[i]+D[i]),0)<0)[B,D]=[D,B];tri(gem,A,B,D);};
 const ring=(i,r,y)=>[Math.cos(i*Math.PI/4)*r,y,Math.sin(i*Math.PI/4)*r];
 for(let i=0;i<8;i++){const a=ring(i,1,0),b=ring(i+1,1,0),c=ring(i,.48,.48),d=ring(i+1,.48,.48);face([0,-.80,0],b,a);face(a,b,d);face(a,d,c);face([0,.48,0],c,d);}
 const polygon=[[-.08,-.60],[-.48,.10],[-.10,.10],[-.22,.65],[.49,-.18],[.10,-.18]],point=(i,y)=>[polygon[i][0],y,polygon[i][1]];
 for(const ids of [[0,1,2],[0,2,5],[2,3,4],[2,4,5]]){let [a,b,c]=ids.map(i=>point(i,.07));const cross=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);if(cross<0)[b,c]=[c,b];tri(bolt,a,b,c);tri(bolt,[a[0],-.07,a[2]],[c[0],-.07,c[2]],[b[0],-.07,b[2]]);}
 for(let i=0;i<polygon.length;i++){const j=(i+1)%polygon.length;tri(bolt,point(i,-.07),point(j,-.07),point(j,.07));tri(bolt,point(i,-.07),point(j,.07),point(i,.07));}
 for(let sector=0;sector<3;sector++)for(let j=0;j<6;j++){
  const a=sector*Math.PI*2/3-Math.PI/6+j*Math.PI/18,b=a+Math.PI/18,pt=(r,t)=>[r*Math.cos(t),0,r*Math.sin(t)];
  tri(radiation,pt(.15,a),pt(.31,b),pt(.31,a));tri(radiation,pt(.15,a),pt(.15,b),pt(.31,b));
 }
 return {cinematicJet:createCinematicJetMesh(),breakerShell:createBreakerShellMesh(),pickupPowerTorso:outward(createCylinderMesh(20,.82,1)),pickupRoundBox:createPickupRoundBox(),voidcasterOrb:outward(createSphereMesh(28,16)),voidcasterCylinder:outward(createCylinderMesh(32)),pickupWeaponOrb:outward(createSphereMesh(20,12)),pickupWeaponCylinder:outward(createCylinderMesh(24)),pickupOrb:outward(createSphereMesh(12,8)),pickupCylinder:outward(createCylinderMesh(16)),pickupGem:gem,pickupBolt:bolt,pickupRadiation:radiation};
}
function createLootMeshes(){
 const make=()=>({positions:[],normals:[]}),tri=(m,a,b,c)=>{const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;for(const p of [a,b,c]){m.positions.push(...p);m.normals.push(...n.map(x=>x/l));}};
 const closed=(m,a,b,c)=>{const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(n.reduce((s,x,i)=>s+x*(a[i]+b[i]+c[i]),0)<0)[b,c]=[c,b];tri(m,a,b,c);};
 const lathe=(profile,N)=>{
  const m=make(),at=(r,k)=>[Math.cos(k*Math.PI*2/N)*profile[r][1],profile[r][0],Math.sin(k*Math.PI*2/N)*profile[r][1]];
  for(let r=0;r<profile.length-1;r++)for(let k=0;k<N;k++){const a=at(r,k),b=at(r,k+1),c=at(r+1,k),d=at(r+1,k+1);closed(m,a,b,c);closed(m,b,d,c);}
  for(const r of [0,profile.length-1])for(let k=0;k<N;k++)closed(m,[0,profile[r][0],0],at(r,k),at(r,k+1));return m;
 };
 const star=make(),ring=make(),point=(i,y)=>{const a=i*Math.PI/5,r=i%2?.43:1;return[Math.sin(a)*r,y,-Math.cos(a)*r];};
 for(let i=0;i<10;i++){closed(star,[0,.07,0],point(i,.07),point(i+1,.07));closed(star,[0,-.07,0],point(i,-.07),point(i+1,-.07));closed(star,point(i,-.07),point(i+1,-.07),point(i,.07));closed(star,point(i+1,-.07),point(i+1,.07),point(i,.07));}
 for(let i=0;i<24;i++){
  const a=i*Math.PI/12,b=(i+1)*Math.PI/12,p=(r,t,y)=>[r*Math.cos(t),y,r*Math.sin(t)];
  for(const y of [-.04,.04]){const f=y>0?tri:(m,a,b,c)=>tri(m,a,c,b);f(ring,p(1,a,y),p(.84,a,y),p(1,b,y));f(ring,p(.84,a,y),p(.84,b,y),p(1,b,y));}
  for(const r of [.84,1]){const f=r===1?tri:(m,a,b,c)=>tri(m,a,c,b);f(ring,p(r,a,-.04),p(r,a,.04),p(r,b,-.04));f(ring,p(r,a,.04),p(r,b,.04),p(r,b,-.04));}
 }
 return{lootCoin:lathe([[-1,.87],[-.65,1],[.65,1],[1,.87]],32),lootGem:lathe([[-.80,.03],[-.065,.93],[.035,1],[.34,.68],[.53,.41]],8),lootStar:star,lootRing:ring};
}
function pickupAccent(q){
 if(q.type==='ray')return Voidcaster.assign(q).color;
 if(q.type==='coin')return q.tier==='silver'?'#bccfc3':'#e9c16b';
 return({gem:'#72cfdf',ray:'#7cd9a1',deathmachine:'#dcc28b',tank:'#b0c591',heli:'#8fc5d2',drone:'#88cbd0',soldier:'#b4d2b7',bomb:'#eab073',nuke:'#e7bc76',boost:'#8dd0d6',health:'#96d2a8',medkit:'#96d2a8',lure:'#c4b2d5',ammo:'#d3bd87'})[q.type]||'#d3bd87';
}
// Compact pools and narrow rims keep the objects readable without flooding the ground with green.
function pickupAppearance(q){
 const left=Number.isFinite(q?.left)?q.left:Infinity;
 if(left<=0)return {visible:false,strength:0};
 if(left>4)return {visible:true,strength:1};
 const age=4-left,phase=age*2.5+age*age*.4,visible=phase%1<.70;
 return {visible,strength:visible?1.18:.12};
}
function pickupAuraPlan(q,time,size,y){
 const appearance=pickupAppearance(q);if(!appearance.strength)return[];
 const p=simToWorld(q.x,q.y),treasure=q.type==='coin'||q.type==='gem',color=pickupAccent(q);
 const pulse=q.type==='ray'?Voidcaster.pulse(q,time):.94+Math.sin(time*3.1+q.x*.01)*.06,strength=appearance.strength*pulse*(q.type==='ray'?1.16:1);
 const out=[{x:p.x,y:.045,z:p.z,radius:(treasure?.56:.91)*size,color,strength:strength*(treasure?.33:.67),mode:0},
  {x:p.x,y:.051,z:p.z,radius:(treasure?.41:.69)*size,color,strength:strength*(treasure?.13:.29),mode:-.10}];
 if(!treasure)out.push({x:p.x,y:y-.13,z:p.z,radius:.57*size,color,strength:strength*.17,mode:1});
 return out;
}
const PICKUP_GLOW_VS=`#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 iPositionRadius;
layout(location=2) in vec4 iColorStrength;
layout(location=3) in float iMode;
uniform mat4 uView,uProj;
out vec2 vUV;
out vec4 vColor;
flat out float vMode;
void main(){
 vec3 offset=vec3(aCorner.x,0.,aCorner.y)*iPositionRadius.w;
 if(iMode>.5){
  vec3 right=vec3(uView[0][0],uView[1][0],uView[2][0]);
  vec3 up=vec3(uView[0][1],uView[1][1],uView[2][1]);
  offset=(right*aCorner.x+up*aCorner.y*.70)*iPositionRadius.w;
  if(iMode>1.5)offset=(right*aCorner.x*1.45+up*aCorner.y*.38)*iPositionRadius.w;
 }
 gl_Position=uProj*uView*vec4(iPositionRadius.xyz+offset,1.);
 vUV=aCorner;vColor=iColorStrength;vMode=iMode;
}`;
const PICKUP_GLOW_FS=`#version 300 es
precision mediump float;
in vec2 vUV;
in vec4 vColor;
flat in float vMode;
out vec4 outColor;
void main(){
 float d=length(vUV);if(d>=1.)discard;
 if(vMode>1.5){
  vec2 p=vUV*vec2(3.6,5.);float phase=fract(vMode)*6.2831853;
  float curls=.58+.18*sin(p.x*1.3+sin(p.y*1.5+phase))+.12*sin(p.x*2.7-p.y*1.9+phase)+.08*sin(p.x*4.+p.y*2.1-phase);
  float alpha=pow(1.-smoothstep(.10,1.,d),1.35)*max(.2,curls)*vColor.a;
  outColor=vec4(vColor.rgb,alpha);return;
 }
 float soft=1.-smoothstep(0.,1.,d);
 float alpha=(soft*soft*.34+pow(soft,4.)*.40)*vColor.a;
 if(vMode<=-2.){
  float phase=fract(-vMode)*6.2831853,blade=pow(.5+.5*cos(atan(vUV.y,vUV.x)*4.-phase*4.),8.);
  alpha=(.025+.10*blade)*smoothstep(.17,.35,d)*(1.-smoothstep(.82,1.,d))*vColor.a;
 }else if(vMode<=-1.){
  float w=-vMode-1.,angle=atan(vUV.y,vUV.x),edge=1.-w*.5+.003*sin(angle*19.)+.002*cos(angle*31.);
  float spread=max(w*.42,fwidth(d)*1.4);alpha=exp(-pow((d-edge)/spread,2.))*vColor.a*.72;
 }else if(vMode<0.){float w=-vMode,aa=max(fwidth(d),.002);if(d<1.-w-aa)discard;alpha=smoothstep(1.-w-aa,1.-w+aa,d)*(1.-smoothstep(1.-aa,1.,d))*vColor.a;}
 outColor=vec4(vColor.rgb,alpha);
}`;
class PickupGlowRenderer{
 constructor(gl){
  this.gl=gl;this.capacity=0;this.data=null;
  this.p=gl.createProgram();gl.attachShader(this.p,shader(gl,gl.VERTEX_SHADER,PICKUP_GLOW_VS));gl.attachShader(this.p,shader(gl,gl.FRAGMENT_SHADER,PICKUP_GLOW_FS));gl.linkProgram(this.p);
  if(!gl.getProgramParameter(this.p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.p));
  this.loc={view:gl.getUniformLocation(this.p,'uView'),proj:gl.getUniformLocation(this.p,'uProj')};
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
  this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,8,0);
  this.instances=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);
  for(const [location,count,offset] of [[1,4,0],[2,4,4],[3,1,8]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,count,gl.FLOAT,false,36,offset*4);gl.vertexAttribDivisor(location,1);}
  gl.bindVertexArray(null);
 }
 draw(plans,frame,metrics={},shadow=false){
  const n=plans.length;if(!n)return;const gl=this.gl;
  if(n>this.capacity){this.capacity=2**Math.ceil(Math.log2(Math.max(16,n)));this.data=new Float32Array(this.capacity*9);gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,gl.DYNAMIC_DRAW);}
  for(let i=0;i<n;i++){const p=plans[i];this.data.set([p.x,p.y,p.z,p.radius,...hex(p.color),p.strength,p.mode],i*9);}
  gl.useProgram(this.p);gl.uniformMatrix4fv(this.loc.view,false,frame.view);gl.uniformMatrix4fv(this.loc.proj,false,frame.proj);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.SRC_ALPHA,shadow?gl.ONE_MINUS_SRC_ALPHA:gl.ONE);
  gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.instances);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data.subarray(0,n*9));gl.drawArraysInstanced(gl.TRIANGLES,0,6,n);
  gl.bindVertexArray(null);gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.CULL_FACE);
  metrics.drawCalls=(metrics.drawCalls||0)+1;metrics.pickupGlowInstances=n;metrics.pickupGlowDrawCalls=1;
 }
}


function animalModelPlan(animal,time=0,projectiles=[]){
 const parts=[],glows=[],shadows=[];
 if(!animal||animal.left<=0||animal.stowed)return{parts,glows,shadows};
 const p=simToWorld(animal.x,animal.y),a=animal.aim||0,co=Math.cos(a),si=Math.sin(a),M=MATERIAL_IDS;
 const speed=Math.hypot(animal.vx||0,animal.vy||0),moving=speed>8,phase=animal.step||0,charge=animal.charge,act=clamp((animal.action||0)/.4,0,1);
 const pt=(f,y,s)=>({x:p.x+co*f-si*s,y,z:p.z+si*f+co*s});
 const oval=(f,y,s,rx,ry,rz,color,turn=0,glow=0,material=M.ORGANIC)=>{const q=pt(f,y,s);parts.push({mesh:'pickupOrb',matrix:model(q.x,q.y,q.z,rx,ry,rz,-a-turn),color,glow,material});};
 const seg=(A,B,r,color,material=M.ORGANIC)=>{const u=pt(...A),v=pt(...B);parts.push({mesh:'pickupCylinder',matrix:basisModel(u.x,u.y,u.z,v.x,v.y,v.z,r,r),color,glow:0,material});};
 const banana=(f,y,s,size=1)=>{let prev=null;for(let i=0;i<6;i++){const t=i/5,point=[f+(t-.5)*.36*size,y+Math.sin(t*Math.PI)*.12*size,s];if(prev)seg(prev,point,.048*size,i===1||i===5?'#b99a37':'#f9d757');prev=point;}};
 if(animal.kind==='monkey'){
  const fur='#78563f',dark='#4c3d30',tan='#caa074',bob=moving?Math.abs(Math.sin(phase))*.035:Math.sin(time*3)*.012;
  oval(-.06,.69+bob,0,.26,.39,.25,fur);oval(.145,.69+bob,0,.12,.28,.20,tan);
  oval(.06,1.18+bob,0,.26,.255,.25,fur);oval(.235,1.15+bob,0,.092,.18,.20,tan);
  oval(.287,1.065+bob,0,.075,.062,.115,'#d8b58d');oval(.335,1.13+bob,0,.024,.023,.034,dark);
  for(const side of [-1,1]){
   oval(.035,1.18+bob,side*.267,.085,.125,.082,fur);oval(.082,1.18+bob,side*.282,.03,.080,.05,tan);
   oval(.30,1.225+bob,side*.091,.022,.033,.032,'#ebe0bc');oval(.32,1.225+bob,side*.091,.011,.022,.017,'#15232a');
   const stride=moving?Math.sin(phase+(side>0?Math.PI:0))*.16:0;
   seg([-.12,.49,side*.17],[-.18-stride,.27,side*.20],.09,fur);seg([-.18-stride,.27,side*.20],[.02-stride,.12,side*.20],.07,fur);oval(.065-stride,.095,side*.20,.13,.075,.08,dark);
   const lift=side<0?act*.50:0,hand=[.10+stride,.32+bob+lift,side*.32];
   seg([.01,.91+bob,side*.20],[-.10+stride,.57+bob+lift*.4,side*.32],.075,fur);seg([-.10+stride,.57+bob+lift*.4,side*.32],hand,.06,fur);oval(...hand,.080,.085,.069,tan);
  }
  let prev=[-.26,.52,0];for(let i=1;i<=9;i++){const t=i/9*Math.PI*1.4,q=[-.26-.45*Math.sin(t*.65),.46+.30*(1-Math.cos(t)),Math.sin(t)*.12];seg(prev,q,.04,fur);prev=q;}
  banana(.21,.42+act*.50,-.34,.85);
 }else if(animal.kind==='cow'){
  const white='#d6d7c7',black='#293b3e',pink='#b78986',low=charge?.windup>0?-.17:charge?-.10:0,bob=moving?Math.abs(Math.sin(phase))*.025:0;
  oval(-.13,.83+bob,0,.65,.39,.39,white);oval(.44,.90+bob,0,.25,.30,.32,white);
  // Irregular dark patches follow the curved back rather than forming box panels.
  oval(-.35,1.157+bob,-.09,.23,.057,.23,black,.15);oval(.11,1.13+bob,.20,.25,.05,.15,black,-.4);oval(-.51,.86+bob,.35,.15,.23,.036,black);
  oval(.67,1.06+bob+low,0,.32,.29,.28,white);oval(.91,.98+bob+low,0,.19,.16,.265,pink);
  for(const side of [-1,1]){
   oval(1.064,1.005+low,side*.11,.02,.032,.042,'#553f41');oval(.78,1.15+low,side*.24,.035,.056,.029,'#1b2d31');
   oval(.57,1.17+low,side*.335,.15,.05,.085,white,side*.22);oval(.59,1.20+low,side*.34,.09,.018,.05,pink);
   seg([.53,1.26+low,side*.19],[.43,1.44+low,side*.26],.051,'#b8ae8c');seg([.43,1.44+low,side*.26],[.55,1.51+low,side*.28],.026,'#e5dcc2');
   for(const front of [-1,1]){const stride=moving?Math.sin(phase+(front*side>0?0:Math.PI))*.14:0,f=front>0?.34:-.54;seg([f,.70,side*.26],[f+stride,.32,side*.29],.085,white);seg([f+stride,.32,side*.29],[f-stride*.4,.12,side*.29],.061,white);oval(f-stride*.4,.077,side*.29,.104,.077,.081,black);}
  }
  oval(-.17,.45,0,.22,.12,.20,pink);seg([-.72,.95,0],[-.91,.58,Math.sin(time*4)*.15],.026,white);oval(-.91,.54,Math.sin(time*4)*.15,.045,.095,.045,black);
  oval(.51,.62,0,.12,.09,.12,'#beaa58',0,0,M.METAL);
 }else{
  const blue='#648f9e',top='#507a8b',belly='#c0e0db',bob=Math.sin(time*4)*.11,h=1.22+bob,tail=Math.sin(time*8)*.13;
  oval(0,h,0,.66,.29,.31,blue);oval(.04,h-.15,0,.57,.12,.265,belly);oval(.49,h+.02,0,.29,.24,.24,blue);
  oval(.78,h-.05,0,.36,.085,.12,blue);oval(.82,h-.085,0,.29,.027,.104,belly);
  oval(-.06,h+.26,0,.19,.25,.06,top,.15);oval(-.14,h+.43,0,.095,.14,.035,top,.25);
  oval(-.61,h-.025,0,.29,.16,.18,blue);oval(-.86,h+tail,0,.22,.086,.105,blue);
  for(const side of [-1,1]){
   oval(-.05,h-.16,side*.37,.31,.045,.12,top,side*.60);oval(-.99,h+tail,side*.20,.20,.045,.285,top,-side*.40);
   oval(.53,h+.06,side*.208,.038,.039,.018,'#e0f3ec');oval(.54,h+.06,side*.224,.022,.023,.009,'#112d38');
  }
  // The dolphin swims through the air in its own small wake.
  glows.push({x:p.x,y:.044,z:p.z,radius:.83,color:'#65cfe4',strength:.19,mode:-.11});
  for(let i=0;i<3;i++){const t=(time*1.6+i/3)%1;oval(-.78-t*.4,h-.14+t*.35,(i-1)*.16,.055*(1-t),.055*(1-t),.055*(1-t),'#a4e7ee',0,.25,M.GLASS);}
 }
 const color=animal.kind==='monkey'?'#e7c766':animal.kind==='cow'?'#dce5cc':'#87e9f0';
 shadows.push({x:p.x,y:.029,z:p.z,radius:animal.kind==='cow'?.94:.64,color:'#0a181d',strength:animal.kind==='dolphin'?.25:.42,mode:0});
 glows.push({x:p.x,y:.046,z:p.z,radius:animal.kind==='cow'?1.03:.76,color,strength:animal.left<=3?.3+.2*Math.sin(time*9):.38,mode:-.045});
 for(const q of projectiles){
  const age=clamp(1-q.left/q.max,0,1),x=lerp(q.x,q.tx,age),y=lerp(q.y,q.ty,age),b=simToWorld(x,y),height=.9+Math.sin(age*Math.PI)*2.1;
  for(let i=0;i<5;i++){const t=i/4,angle=q.aim+age*8,dx=(t-.5)*.48;parts.push({mesh:'pickupOrb',matrix:model(b.x+Math.cos(angle)*dx,height+Math.sin(t*Math.PI)*.16,b.z+Math.sin(angle)*dx,.092,.071,.062,-angle),color:i===0||i===4?'#af8d37':'#ffe05c',glow:.08,material:M.ORGANIC});}
  shadows.push({x:b.x,y:.03,z:b.z,radius:.19,color:'#102329',strength:.25,mode:0});
 }
 return{parts,glows,shadows};
}

function companionModelPlan(drone,time=0,pickup=false){
 const parts=[],glows=[],shadows=[];
 if(!drone||drone.left<=0||(!pickup&&drone.stowed))return{parts,glows,shadows};
 const p=simToWorld(drone.x,drone.y),a=pickup?-.4+Math.sin(time*.8)*.20:drone.aim||0,scale=pickup?1.08:1;
 const height=pickup?.64+Math.sin(time*3)*.06:1.92+Math.sin(time*5)*.045,co=Math.cos(a),si=Math.sin(a),M=MATERIAL_IDS;
 const pt=(f,y,s)=>({x:p.x+(co*f-si*s)*scale,y:height+y*scale,z:p.z+(si*f+co*s)*scale});
 const add=(mesh,matrix,color,glow=0,material=M.METAL)=>parts.push({mesh,matrix,color,glow,material});
 const box=(f,y,s,w,h,d,c,turn=0,mesh='powerHull')=>{const q=pt(f,y,s);add(mesh,model(q.x,q.y,q.z,w*scale/2,h*scale/2,d*scale/2,-a-turn),c);};
 const oval=(f,y,s,rx,ry,rz,c,g=0)=>{const q=pt(f,y,s);add('pickupOrb',model(q.x,q.y,q.z,rx*scale,ry*scale,rz*scale,-a),c,g);};
 // Pickup meshes face outward; mirror only this local cylinder frame, not basisModel.
 const segment=(A,B,r,c)=>{const u=pt(...A),v=pt(...B),m=basisModel(u.x,u.y,u.z,v.x,v.y,v.z,r*scale,r*scale);for(const k of [0,1,2])m[k]*=-1;add('pickupCylinder',m,c);};
 box(0,0,0,.62,.22,.38,'#526c64');box(-.045,.131,0,.43,.060,.30,'#bcc8ac');
 box(-.11,.168,0,.22,.014,.11,'#243c3d',0,'box');
 for(const f of [-.175,-.11,-.045])box(f,.180,0,.020,.011,.095,'#6d8980',0,'box');
 box(-.055,-.123,0,.36,.065,.23,'#2a4241');
 for(const side of [-1,1]){
  box(-.08,.053,side*.183,.27,.048,.024,'#d4ac66',0,'box');
  segment([-.22,-.075,side*.12],[-.24,-.22,side*.20],.018,'#789389');
  segment([.10,-.085,side*.12],[.15,-.22,side*.20],.018,'#789389');
  segment([-.28,-.22,side*.20],[.22,-.22,side*.20],.022,'#405851');
 }
 // Gimbal lens and underslung barrel keep the existing firing anchor.
 oval(.29,-.012,0,.095,.088,.109,'#243c40');oval(.366,-.012,0,.018,.050,.064,'#87e8ed',.56);
 oval(.27,.068,-.087,.028,.022,.018,'#cff4db',.30);
 box(.22,-.115,0,.34,.10,.14,'#354b4a');segment([.32,-.12,0],[.56,-.12,0],.034,'#b1b9a3');
 segment([.45,-.12,0],[.50,-.12,0],.044,'#30474a');
 for(const f of [-.28,.28])for(const side of [-.38,.38]){
  segment([f*.50,.02,side*.28],[f,.025,side],.035,'#415b56');
  oval(f,.04,side,.082,.077,.082,'#354d48');
  const q=pt(f,.122,side);
  add('lootRing',model(q.x,q.y,q.z,.253*scale,.83*scale,.253*scale,-a),'#91a797');
  const spin=(pickup?time*5:time*65)+f*3+side;
  box(f,.133,side,.413,.012,.036,'#58726c',spin,'box');box(f,.135,side,.413,.012,.036,'#91a397',spin+Math.PI/2,'box');
  const hub=pt(f,.149,side);add('pickupCylinder',model(hub.x,hub.y,hub.z,.035*scale,.020*scale,.035*scale),'#cbd0b7');
  glows.push({...pt(f,.14,side),radius:.219*scale,color:'#b6cbb7',strength:pickup?.10:.19,mode:-2-(time*(pickup?.35:2.4)%1)});
 }
 oval(-.23,.028,.19,.036,.029,.027,'#80ecbf',.55);oval(-.23,.028,-.19,.036,.029,.027,'#80ecbf',.55);
 if(!pickup){
  shadows.push({x:p.x,y:.035,z:p.z,radius:.69,color:'#0c191c',strength:.32,mode:0});
  if(drone.flash>0){const m=pt(.59,-.12,0);glows.push({...m,radius:.20,color:'#fff2bd',strength:Math.min(1,drone.flash/.04),mode:1});}
 }
 return{parts,glows,shadows};
}
function liftRenderPlan(plan,h){if(h){for(const p of plan.parts||[])p.matrix[13]+=h;for(const key of ['glows','shadows'])for(const p of plan[key]||[])p.y=(p.y||0)+h;for(const r of plan.ribbons||[]){r.a={...r.a,y:r.a.y+h};r.b={...r.b,y:r.b.y+h};}}return plan;}
function pickupIconPlan(q,time=0,importance=0,detail=true){
 if(!q||q.left<=0)return {parts:[],glows:[],type:q?.type};
 if(q.type==='soldier'){
  const p=simToWorld(q.x,q.y),parts=[],y=.64+Math.sin(time*3)*.045,a=-.28+Math.sin(time*.8)*.12,M=MATERIAL_IDS;
  if(pickupAppearance(q).visible){
   for(const [x,z,angle] of [[-.17,-.07,a],[.20,.12,a-.28]]){
    const co=Math.cos(angle),si=Math.sin(angle),add=(mesh,fx,yy,fz,sx,sy,sz,c,mat=M.METAL)=>parts.push({mesh,matrix:model(p.x+x+co*fx+si*fz,yy,p.z+z-si*fx+co*fz,sx,sy,sz,angle),color:c,glow:0,material:mat});
    add('pickupRoundBox',0,y,0,.225,.025,.355,'#a8b7ab');add('powerHull',0,y+.028,.02,.187,.007,.277,'#667e75');
    add('pickupCylinder',0,y+.035,-.274,.044,.008,.044,'#293f3d');
    add('lootStar',0,y+.044,.143,.081,.050,.081,'#c6d1b8');
    for(let i=0;i<3;i++)add('box',-.019,y+.044,-.13+i*.056,.105-i*.015,.004,.010,'#c2cbb5');
   }
   for(let i=0;i<14;i++){const t=i/13*Math.PI;parts.push({mesh:'pickupOrb',matrix:model(p.x+Math.cos(t)*.30,y-.015-Math.sin(t)*.025,p.z-.26-Math.sin(t)*.33,.022,.016,.022),color:'#b8c2b0',glow:0,material:M.METAL});}
  }
  return{parts,glows:pickupAuraPlan(q,time,1.1,y),type:'soldier',color:pickupAccent(q),size:1.1};
 }
 if(q.type==='drone'){
  const aura=pickupAuraPlan(q,time,1.1,.64),plan=pickupAppearance(q).visible?companionModelPlan(q,time,true):{parts:[],glows:[]};
  return{parts:plan.parts,glows:[...aura,...plan.glows],type:'drone',color:pickupAccent(q),size:1.1};
 }
 const type=q.type||'ammo',parts=[],p=simToWorld(q.x,q.y),phase=(q.x*.013+q.y*.017),age=time+phase;
 const treasure=type==='coin'||type==='gem',special=['ray','deathmachine','heli','tank','bomb'].includes(type);
 const size=type==='gem'?({small:.76,medium:1,large:1.3}[q.tier]||.9):type==='coin'?({silver:.82,gold:1,stack:1.06}[q.tier]||.9):['ray','deathmachine'].includes(type)?1.27:special?1.15:1;
 const a=treasure?age*.55:-.38+Math.sin(age*.8)*.22,y=treasure?(type==='gem'?.52:.34)+Math.sin(age*3)*.035:.60+Math.sin(age*3)*.08,co=Math.cos(a),si=Math.sin(a);
 const color=pickupAccent(q);
 const metal=MATERIAL_IDS.METAL,matte=MATERIAL_IDS.MATTE;
 const add=(mesh,matrix,c,glow=0,material=metal)=>parts.push({mesh,matrix,color:c,glow,material});
 const pt=(x,h,z)=>({x:p.x+(co*x-si*z)*size,y:y+h*size,z:p.z+(si*x+co*z)*size});
 const shape=(mesh,x,h,z,sx,sy,sz,c,glow=0,turn=0,material=metal)=>{const v=pt(x,h,z);add(mesh,model(v.x,v.y,v.z,sx*size,sy*size,sz*size,-a-turn),c,glow,material);};
 const box=(x,h,z,w,d,l,c,turn=0,glow=0)=>shape('box',x,h,z,w/2,d/2,l/2,c,glow,turn);
 const oval=(x,h,z,w,d,l,c,glow=0)=>shape('pickupOrb',x,h,z,w,d,l,c,glow);
 const seg=(A,B,r,c,glow=0)=>{const u=pt(...A),v=pt(...B);add('pickupCylinder',basisModel(u.x,u.y,u.z,v.x,v.y,v.z,r*size,r*size),c,glow);};
 const weaponOval=(x,h,z,w,d,l,c,glow=0)=>shape('pickupWeaponOrb',x,h,z,w,d,l,c,glow);
 const weaponSeg=(A,B,r,c,glow=0)=>{const u=pt(...A),v=pt(...B);const m=basisModel(u.x,u.y,u.z,v.x,v.y,v.z,r*size,r*size);if(type==='ray')for(const k of [0,1,2])m[k]*=-1;add('pickupWeaponCylinder',m,c,glow);};
 const glows=pickupAuraPlan(q,time,size,y);
 if(!pickupAppearance(q).visible)return {parts:[],glows,type,color,size};
 if(type==='ray'){
  // Rounded red receiver, ergonomic grip, and open brass coils around a green core.
  weaponOval(-.26,0,0,.265,.145,.15,'#b65744');weaponOval(-.45,.015,0,.13,.13,.14,'#703c38');
  shape('pickupRoundBox',-.33,-.11,.24,.088,.075,.235,'#303e40',0,-.34);
  weaponOval(-.28,-.10,.41,.095,.06,.085,'#526261');
  weaponSeg([-.07,.015,0],[.58,.015,0],.07,'#53e68b',.26);
  for(const x of [.035,.25,.46])shape('powerRing',x,.015,0,.155,.135,.135,'#ceb886',.05);
  weaponSeg([-.10,.015,0],[-.02,.015,0],.125,'#88958a');
  shape('powerRing',.634,.015,0,.33,.094,.094,'#536b67');
  shape('powerRing',.675,.015,0,.09,.13,.13,'#ddc28d',.08);
  weaponOval(.681,.015,0,.018,.061,.061,'#c0ffd4',.56);
  weaponSeg([-.43,.155,0],[-.08,.155,0],.026,'#dfc896');
  weaponSeg([-.20,-.055,.18],[.015,-.055,.18],.022,'#c3a676');
  weaponSeg([.015,-.055,.18],[.015,-.065,.29],.022,'#c3a676');
  weaponSeg([.015,-.065,.29],[-.18,-.07,.32],.022,'#c3a676');
  for(let i=0;i<3;i++)box(-.40+i*.078,.143,-.050,.031,.022,.11,'#633d33');
  weaponOval(-.22,.163,.068,.059,.017,.041,'#a8e9b5',.18);shape('powerHull',-.13,-.095,-.11,.11,.05,.042,'#71846e');
  for(const f of [.035,.25,.46])for(const sign of [-1,1]){
   box(f,.015+sign*.125,0,.050,.044,.058,'#d5d4a7');
   box(f,.015,sign*.132,.048,.050,.024,'#88fdb4',0,.48+.07*Math.sin(time*5));
  }
  for(const side of [-1,1]){
   box(-.30,.015,side*.143,.19,.075,.014,'#713b34');
   for(const f of [-.35,-.29,-.23])box(f,.020,side*.155,.018,.043,.008,'#dbc18b');
  }
 }else if(type==='deathmachine'){
  // Cylindrical receiver and side drum replace the squared receiver/ammo slabs.
  weaponSeg([-.53,0,0],[-.04,0,0],.145,'#6e8380');weaponOval(-.52,0,0,.12,.145,.148,'#435853');
  weaponSeg([-.18,0,0],[-.07,0,0],.156,'#b2bbaa');
  shape('pickupWeaponCylinder',-.33,-.015,.25,.158,.123,.158,'#7d8d72');
  shape('pickupWeaponCylinder',-.33,.115,.25,.132,.018,.132,'#c5b37f');
  shape('pickupWeaponCylinder',-.33,.137,.25,.056,.015,.056,'#566651');
  shape('pickupRoundBox',-.55,-.035,-.10,.09,.07,.21,'#334944',0,-.3);
  for(const x of [-.40,-.14])weaponSeg([x,.11,-.03],[x,.245,-.03],.025,'#344946');
  weaponSeg([-.40,.245,-.03],[-.14,.245,-.03],.034,'#c0c9b5');
  for(let i=0;i<6;i++){
   const r=i*Math.PI/3,h=Math.cos(r)*.097,z=Math.sin(r)*.097;
   weaponSeg([-.02,h,z],[.73,h,z],.034,'#afbeb9');
   weaponSeg([.71,h,z],[.75,h,z],.040,'#d4cab0');
   weaponSeg([.751,h,z],[.759,h,z],.024,'#243937');
  }
  for(const x of [.20,.61])shape('powerRing',x,0,0,.17,.15,.15,'#5c7069');
  shape('powerRing',.744,0,0,.13,.16,.16,'#b7bfa6');
  for(let i=0;i<4;i++){const x=-.45+i*.071;weaponSeg([x,.07,.125],[x,.13,.225],.020,'#c9ad73');box(x,.151,-.021,.032,.015,.15,'#344c48');}
 }else if(type==='tank'){
  for(const z of [-.37,.37]){
   shape('powerHull',0,-.105,z,.54,.15,.125,'#2b3c32');
   for(const x of [-.30,-.10,.10,.30])seg([x,-.11,z-.09],[x,-.11,z+.09],.081,'#7f9571');
   for(let i=0;i<7;i++)box(-.45+i*.15,.047,z,.10,.025,.25,'#95a583');
  }
  shape('tankHull',0,-.16,0,.37,.37,.37,'#98ad7f',0,0,matte);shape('tankTurret',0,-.16,0,.37,.37,.37,'#b7c493',0,0,matte);
  shape('pickupCylinder',-.108,.414,.05,.073,.014,.073,'#56714f');
  seg([.22,.328,0],[.777,.328,0],.028,'#b9c8a0');seg([.415,.328,0],[.50,.328,0],.043,'#859e6e');
  seg([.715,.328,0],[.778,.328,0],.045,'#4c6847');seg([.779,.328,0],[.784,.328,0],.029,'#1c3628');
  for(let i=0;i<4;i++)box(-.39+i*.049,.231,0,.019,.010,.16,'#405c43');box(-.01,.410,-.12,.091,.025,.042,'#52756a');
 }else if(type==='heli'){
  shape('heliFuselage',0,0,0,.34,.34,.34,'#7b9682',0,0,matte);shape('heliCanopy',0,0,0,.34,.34,.34,'#759ea4',.025,0,MATERIAL_IDS.GLASS);
  for(const side of [-1,1]){
   const pane=[[.40,.448,side*.028],[.46,.315,side*.465],[1.23,.086,side*.294],[1.34,.097,side*.028]].map(p=>p.map(x=>x*.34));
   for(let i=0;i<4;i++)weaponSeg(pane[i],pane[(i+1)%4],.0065,'#c2ceb4');
   box(-.11,-.006,side*.222,.30,.22,.022,'#93a68a');box(-.09,.043,side*.237,.18,.091,.012,'#4b7376');
   weaponOval(-.10,.157,side*.094,.19,.064,.075,'#98ab8d');
   weaponSeg([-.32,-.267,side*.254],[.37,-.267,side*.254],.016,'#c4cdb5');weaponSeg([.37,-.267,side*.254],[.43,-.219,side*.254],.016,'#c4cdb5');
   for(const x of [-.20,.21])weaponSeg([x,-.095,side*.135],[x,-.26,side*.25],.014,'#9db29b');
   weaponSeg([.16,-.12,side*.17],[.57,-.12,side*.17],.019,'#445f51');
  }
  weaponSeg([-.30,.037,0],[-.92,.124,0],.034,'#9aae8f');shape('heliFin',-.91,.119,0,.34,.34,.34,'#8ca388');box(-.73,.104,0,.18,.020,.43,'#b2c0a2');
  weaponSeg([-.034,.19,0],[-.034,.297,0],.026,'#d2d6b9');
  const rotor=time*6.2;for(let i=0;i<4;i++)shape('heliBlade',-.034,.300,0,.34,.34,.34,i%2?'#8a9c88':'#adbea5',0,rotor+i*Math.PI/2);
  weaponOval(-.034,.32,0,.064,.033,.064,'#cbd5b8');
 }else if(type==='coin'){
  const count=q.tier==='stack'?3:1,silver=q.tier==='silver';
  for(let i=0;i<count;i++){
   const x=i%2?.07:-.035,z=i%2?.045:-.015,h=i*.11;
   shape('lootCoin',x,h,z,.31,.049,.31,silver?'#bfcabc':'#d8b771');
   shape('pickupCylinder',x,h+.052,z,.239,.006,.239,silver?'#879e98':'#a9854c');
  }
  const x=(count-1)%2?.07:-.035,z=(count-1)%2?.045:-.015,top=(count-1)*.11+.064;
  shape('lootStar',x,top,z,.157,.07,.157,silver?'#d4ddc9':'#f0d495',.03);
  for(const dx of [-.20,.20])oval(x+dx,top,z,.015,.006,.015,silver?'#d0dbcc':'#f0d194');
 }else if(type==='gem'){
  shape('lootGem',0,.025,0,.41,.46,.41,'#5eb5c6',.06,0,MATERIAL_IDS.GLASS);
  const glint=.12+.28*Math.pow(Math.max(0,Math.sin(age*2.1)),8);
  box(-.059,.274,.040,.106,.008,.018,'#d4f4e9',0,glint);box(-.059,.275,.040,.018,.008,.100,'#d4f4e9',0,glint);
 }else if(type==='boost'){
  for(const x of [-.22,.22]){weaponSeg([x,-.08,-.31],[x,-.08,.31],.117,'#44666b');weaponSeg([x,-.08,-.326],[x,-.08,-.295],.126,'#9bb7af');weaponSeg([x,-.08,.295],[x,-.08,.326],.126,'#9bb7af');}
  shape('powerHull',0,.030,0,.30,.080,.34,'#416b6a');shape('pickupBolt',0,.137,0,.58,.44,.58,'#b9e8da',.14,0,matte);
  for(let i=0;i<3;i++)box(-.10+i*.10,.12,.267,.057,.016,.037,'#8dc9ad',0,.16);
 }else if(type==='nuke'||type==='bomb'){
  const bomb=type==='bomb',top=bomb?.31:.18,r=bomb?.43:.37;
  shape('pickupCylinder',0,-.04,0,r,top+.07,r,'#6b7260');shape('pickupCylinder',0,-top-.095,0,r+.022,.028,r+.022,'#3f5448');
  shape('pickupCylinder',0,top,0,r+.015,.030,r+.015,'#a5af90');shape('pickupCylinder',0,top+.034,0,r-.033,.016,r-.033,'#dcb96a');
  shape('pickupRadiation',0,top+.053,0,bomb?.99:.91,1,bomb?.99:.91,'#263b30',0,0,matte);shape('pickupCylinder',0,top+.054,0,.081,.009,.081,'#263b30');
  for(const side of [-1,1]){
   box(side*(r-.035),-.03,0,.044,(top+.06)*2,.16,'#aeb89b');
   seg([side*(r+.01),.03,-.14],[side*(r+.09),.10,-.14],.020,'#bcc6aa');seg([side*(r+.09),.10,-.14],[side*(r+.09),.10,.14],.024,'#aebb9f');seg([side*(r+.09),.10,.14],[side*(r+.01),.03,.14],.020,'#bcc6aa');
  }
  box(0,-.015,r+.005,.25,.12,.025,'#293e36');box(0,.008,r+.022,.14,.038,.015,'#dfbc79',0,.17);
 }else if(type==='health'||type==='medkit'){
  const pouch=type==='health',body=pouch?'#965f51':'#bdcbb8',lid=pouch?'#aa7562':'#d5dcc7';
  shape(pouch?'pickupRoundBox':'powerHull',0,-.015,0,.38,.16,.29,body,0,0,pouch?MATERIAL_IDS.FABRIC:metal);
  shape('powerHull',0,.142,0,.375,.034,.287,lid);box(0,.180,0,.40,.015,.38,pouch?'#925f4e':'#527b63');
  box(0,.194,0,.104,.015,.295,'#e1e4c8',0,.06);box(0,.195,0,.295,.015,.104,'#e1e4c8',0,.06);
  for(const x of [-.265,.265]){box(x,-.005,.298,.075,.12,.025,'#738d77');box(x,.143,.294,.080,.055,.026,'#a6b79a');}
  for(const x of [-.14,.14])seg([x,.02,-.30],[x,.02,-.405],.023,'#475e50');seg([-.14,.02,-.405],[.14,.02,-.405],.025,'#708776');
  if(pouch)for(let i=0;i<5;i++)box(-.25+i*.125,.177,-.239,.043,.008,.014,'#d3b396');
 }else if(type==='lure'){
  shape('powerHull',0,-.16,0,.285,.055,.24,'#4b5b61');shape('pickupCylinder',0,.015,0,.22,.15,.22,'#75827c');
  for(let i=0;i<4;i++)shape('pickupCylinder',0,-.076+i*.058,0,.226,.009,.226,'#354f4f');
  shape('pickupCylinder',0,.190,0,.239,.032,.239,'#acb7a0');shape('pickupCylinder',0,.25,0,.176,.026,.176,'#c1a8cd',.10);
  seg([0,.275,0],[0,.51,0],.015,'#a6b9ac');oval(0,.525,0,.036,.040,.036,'#d8c6e4',.25);
  box(0,.016,.237,.16,.115,.024,'#293f43');box(0,.032,.253,.095,.028,.012,'#c2b6d2',0,.14);
  for(const side of [-1,1])seg([side*.25,-.15,-.12],[side*.25,.11,-.12],.023,'#9bae9b');
 }else{
  shape('powerHull',0,-.025,0,.37,.155,.265,'#647c5a',0,0,matte);shape('powerHull',0,.139,0,.385,.036,.274,'#91a17d');
  for(const x of [-.27,.27])box(x,-.005,.272,.064,.13,.026,'#afba99');
  for(const z of [-.17,0,.17]){weaponSeg([-.20,.208,z],[.22,.208,z],.041,'#c5aa72');weaponSeg([.21,.208,z],[.278,.208,z],.027,'#e0c591');weaponSeg([-.23,.208,z],[-.20,.208,z],.046,'#877858');}
  for(const x of [-.16,.16])seg([x,.03,-.27],[x,.03,-.354],.019,'#b1bf9b');seg([-.16,.03,-.354],[.16,.03,-.354],.023,'#a2b58f');
 }

 if(type==='ray')Voidcaster.finish(parts,q,time,detail);
 return {parts,glows,type,color,size};
}

function rampTankPoint(p,q){
 const W=DeadwatchCore.PUMP_WALKWAY,h=p.groundHeight||0;
 if(h<=0||h>=W.height)return q;
 const slope=(p.y<W.up?1:-1)*W.height/((W.up-W.y0)*SCALE),a=Math.atan(slope),co=Math.cos(a),si=Math.sin(a),z=(p.y-CY)*SCALE;
 return {x:q.x,y:h+(q.y-h)*co+(q.z-z)*si,z:z-(q.y-h)*si+(q.z-z)*co};
}
function powerupPose(game,motion={}){
 const p=game.player,a=p.aim||0,kind=game.arcade?.vehicle||(game.arcade?.weapon==='ray'?'ray':null),co=Math.cos(a),si=Math.sin(a),base=simToWorld(p.x,p.y);
 if(kind!=='tank'&&kind!=='heli'){
  const pose=DeadwatchSurvivor.poseInfo(p,motion);pose.powerupKind=kind;
  return pose;
 }
 const lift=kind==='heli'?2.48+Math.sin((game.time||0)*4)*.045:0;
 const kick=kind==='tank'?clamp(((p.fireCooldown||0)-.30)/.12,0,1)*.24:0;
 const local=(f,y,s=0)=>{const q={x:base.x+co*f-si*s,y:y+(p.groundHeight||0),z:base.z+si*f+co*s};return kind==='tank'?rampTankPoint(p,q):q;};
 const side=((game.arcade?.shots||0)%2?1:-1)*.50;
 return {powerupKind:kind,weaponAngle:a,weaponScale:1,gunOrigin:local(kind==='tank'?.38:1.02,kind==='tank'?1.32:lift-.37,kind==='heli'?side:0),muzzleWorld:local(kind==='tank'?2.10-kick:1.68,kind==='tank'?1.32:lift-.37,kind==='heli'?side:0),missileWorld:local(.73,lift-.18,Math.sign(side)*.91),lift,kick,shadow:{x:base.x,z:base.z,sx:kind==='tank'?1.9:2.25,sz:kind==='tank'?1.35:1.4}};
}
function createHelicopterMeshes(){
 const smooth=(v,faces)=>{
  const ns=v.map(()=>[0,0,0]);
  for(const [i,j,k] of faces){const a=v[i],b=v[j],c=v[k],u=b.map((q,n)=>q-a[n]),w=c.map((q,n)=>q-a[n]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];for(const id of [i,j,k])for(let q=0;q<3;q++)ns[id][q]+=n[q];}
  const positions=[],normals=[];for(const f of faces)for(const i of f){positions.push(...v[i]);const l=Math.hypot(...ns[i])||1;normals.push(...ns[i].map(x=>x/l));}return{positions,normals};
 };
 const hard=(v,faces)=>{
  const positions=[],normals=[];for(const [i,j,k] of faces){const a=v[i],b=v[j],c=v[k],u=b.map((q,n)=>q-a[n]),w=c.map((q,n)=>q-a[n]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n)||1;for(const p of [a,b,c]){positions.push(...p);normals.push(...n.map(x=>x/l));}}return{positions,normals};
 };
 const profile=[[-1.10,.12,.18,.24],[-.87,.065,.34,.48],[-.48,.0,.44,.60],[.25,-.005,.45,.62],[.72,-.06,.35,.54],[1.12,-.13,.245,.39],[1.39,-.18,.145,.18],[1.49,-.18,.045,.055]],v=[],faces=[],N=20;
 for(const [x,cy,ry,rz] of profile)for(let j=0;j<N;j++){const a=j*Math.PI*2/N,sy=Math.sin(a),cz=Math.cos(a);v.push([x,cy+Math.sign(sy)*Math.pow(Math.abs(sy),.86)*ry,Math.sign(cz)*Math.pow(Math.abs(cz),.82)*rz]);}
 for(let r=0;r<profile.length-1;r++)for(let j=0;j<N;j++){const a=r*N+j,b=(r+1)*N+j,c=r*N+(j+1)%N,d=(r+1)*N+(j+1)%N;faces.push([a,b,c],[b,d,c]);}
 for(const [r,end] of [[0,false],[profile.length-1,true]]){const c=v.length;v.push([profile[r][0],profile[r][1],0]);for(let j=0;j<N;j++){const a=r*N+j,b=r*N+(j+1)%N;faces.push(end?[c,b,a]:[c,a,b]);}}
 const panels=[],pf=[];
 for(const side of [-1,1]){
  const pts=[[.40,.448,side*.028],[.46,.315,side*.465],[1.23,.086,side*.294],[1.34,.097,side*.028]],base=panels.length;panels.push(...pts);
  if(side>0)pf.push([base,base+1,base+2],[base,base+2,base+3]);else pf.push([base,base+2,base+1],[base,base+3,base+2]);
 }
 // Blade and fin are solid tapered profiles rather than rectangular sticks.
 const prism=(outline,thickness,axis)=>{
  const v=[];for(const side of [-1,1])for(const [a,b] of outline)v.push(axis==='y'?[a,side*thickness,b]:[a,b,side*thickness]);
  const n=outline.length,faces=[];for(let i=1;i<n-1;i++){faces.push([0,i+1,i],[n,n+i,n+i+1]);}for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([i,j,n+i],[j,n+j,n+i]);}
  // Orient the closed mesh outward, including the fin's different extrusion axis.
  const center=v.reduce((a,p)=>a.map((x,i)=>x+p[i]/v.length),[0,0,0]);
  for(const f of faces){const [a,b,c]=f.map(i=>v[i]),u=b.map((x,i)=>x-a[i]),w=c.map((x,i)=>x-a[i]),normal=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],mid=a.map((x,i)=>(x+b[i]+c[i])/3-center[i]);if(normal.reduce((sum,x,i)=>sum+x*mid[i],0)<0)[f[1],f[2]]=[f[2],f[1]];}
  return hard(v,faces);
 };
 return{heliFuselage:smooth(v,faces),heliCanopy:hard(panels,pf),heliBlade:prism([[.23,-.054],[2.49,-.071],[2.54,.010],[2.34,.101],[.37,.073]],.013,'y'),heliFin:prism([[.16,-.09],[-.21,-.10],[-.48,.73],[-.23,.84],[.04,.14]],.037,'z')};
}
function powerupModelPlan(game,motion={}){
 const pose=powerupPose(game,motion),kind=pose.powerupKind,parts=[],a=pose.weaponAngle||0,metal=MATERIAL_IDS.METAL,rubber=MATERIAL_IDS.RUBBER;
 if(!kind)return {pose,parts};
 const vehicleModel=kind==='tank'||(kind==='heli'&&!game.arcade?.transport);
 const origin=kind==='ray'?pose.gunOrigin:{...simToWorld(game.player.x,game.player.y),y:game.player.groundHeight||0},scale=kind==='ray'?pose.weaponScale:1;
 function frame(angle){
  const co=Math.cos(angle),si=Math.sin(angle),pt=(f,y,s=0)=>({x:origin.x+(co*f-si*s)*scale,y:origin.y+y*scale,z:origin.z+(si*f+co*s)*scale});
  const add=(mesh,matrix,color,glow=0,material=metal)=>{if(vehicleModel)material=material===MATERIAL_IDS.MATTE?MATERIAL_IDS.VEHICLE_PAINT:material===metal?MATERIAL_IDS.VEHICLE_METAL:material===rubber?MATERIAL_IDS.VEHICLE_RUBBER:material===MATERIAL_IDS.GLASS&&glow<.08?MATERIAL_IDS.VEHICLE_GLASS:material;if(kind==='tank'){material=material===MATERIAL_IDS.VEHICLE_PAINT?MATERIAL_IDS.TANK_PAINT:material===MATERIAL_IDS.VEHICLE_METAL?MATERIAL_IDS.TANK_METAL:material===MATERIAL_IDS.VEHICLE_RUBBER?MATERIAL_IDS.TANK_RUBBER:material;if(mesh==='pickupWeaponCylinder'&&motion.vehicleDetail!==false)mesh='tankRoundCylinder';}parts.push({mesh,matrix,color,glow,material});};
  const box=(f,y,s,l,h,w,color,turn=0,glow=0,material=metal)=>{const q=pt(f,y,s);add('box',model(q.x,q.y,q.z,l*scale/2,h*scale/2,w*scale/2,-angle-turn),color,glow,material);};
  const oval=(f,y,s,l,h,w,color,glow=0,material=metal)=>{const q=pt(f,y,s);add('pickupWeaponOrb',model(q.x,q.y,q.z,l*scale,h*scale,w*scale,-angle),color,glow,material);};
  const seg=(A,B,r,color,mesh='cylinder',rz=r,glow=0,material=metal)=>{const u=pt(...A),v=pt(...B),name=mesh==='cylinder'?'pickupWeaponCylinder':mesh==='torso'?'pickupPowerTorso':mesh;const m=basisModel(u.x,u.y,u.z,v.x,v.y,v.z,r*scale,rz*scale);if(kind==='ray')for(const k of [0,1,2])m[k]*=-1;add(name,m,color,glow,material);};
  const ring=(f,y,s,r,color)=>{const q=pt(f,y,s);add('powerRing',model(q.x,q.y,q.z,r*scale,r*scale,r*scale,-angle),color);};
  const hull=(f,y,s,l,h,w,color)=>{const q=pt(f,y,s);add('powerHull',model(q.x,q.y,q.z,l*scale/2,h*scale/2,w*scale/2,-angle),color,0,MATERIAL_IDS.MATTE);};
  return {pt,add,box,oval,seg,ring,hull};
 }
 const F=frame(a),{box,oval,seg}=F;
 if(kind==='ray'){
  const energy=.48+.07*Math.sin((game.time||0)*5)+clamp((game.player.recoil||0)*4,0,.30);
  oval(.13,.045,0,.31,.16,.158,'#b65342',0,MATERIAL_IDS.MATTE);
  oval(-.08,.045,0,.14,.115,.115,'#60352f');
  seg([.18,.04,0],[.405,.04,0],.073,'#283b3d');
  for(const side of [-1,1]){
   seg([.43,.04,side*.091],[.94,.04,side*.091],.012,'#bda46b');
   seg([.43,.04+side*.091,0],[.94,.04+side*.091,0],.012,'#718479');
  }
  seg([.42,.04,0],[.94,.04,0],.053,'#72ff9d','cylinder',.053,energy,MATERIAL_IDS.GLASS);
  box(-.055,-.12,0,.12,.23,.095,'#343335',-.13,0,rubber);
  box(.315,-.072,0,.15,.10,.12,'#59463a',0,0,rubber);
  box(.10,-.13,.01,.20,.035,.095,'#b39558');
  box(.13,.185,0,.29,.035,.08,'#c2a266');
  for(const f of [.48,.69,.91])F.ring(f,.04,0,.127,'#d0b273');
  for(const f of [.45,.94])seg([f-.013,.04,0],[f+.013,.04,0],.086,'#9aa397');
  const shroud=F.pt(1.0,0,0);F.add('powerRing',model(shroud.x,shroud.y,shroud.z,.31*scale,.090*scale,.090*scale,-a),'#343d3d');
  oval(1.03,0,0,.023,.061,.061,'#a3ffb4',1.15,MATERIAL_IDS.GLASS);
  oval(.19,.14,-.10,.065,.032,.022,'#8aff9f',.65,MATERIAL_IDS.GLASS);
  for(const s of [-1,1])seg([.02,.05,s*.138],[.25,.05,s*.138],.021,'#ceac67');
  for(const f of [.04,.14,.24])box(f,.117,-.135,.028,.044,.016,'#4b3030');
  oval(.11,.215,0,.072,.025,.052,'#283b36');
  oval(.11,.235,0,.046,.009,.032,'#bcf8a5',.30,MATERIAL_IDS.GLASS);
  // Ceramic coil spacers, bright energy nodes and receiver details retain the barrel endpoint.
  for(const f of [.48,.69,.91])for(const sign of [-1,1]){
   box(f,.04+sign*.114,0,.050,.044,.058,'#d5d4a7');
   box(f,.04,sign*.125,.048,.050,.024,'#88fdb4',0,energy,MATERIAL_IDS.GLASS);
  }
  for(const side of [-1,1]){
   box(.08,.043,side*.151,.21,.079,.012,'#6a322e',0,0,MATERIAL_IDS.MATTE);
   for(const f of [.025,.085,.145])box(f,.049,side*.161,.018,.045,.008,'#dbc18b');
   box(.28,.055,side*.123,.050,.050,.024,'#c5b686');
  }
  F.ring(1.012,.010,0,.087,'#dcc18a');
  seg([.34,.04,0],[.405,.04,0],.079,'#bfae7c');
 }else if(kind==='tank'){
  const bodyAngle=motion.vehicleBodyAngle??a,H=frame(bodyAngle),track=motion.travel||0,M=MATERIAL_IDS;
  const armor='#666b52',edge='#a8a98c',dark='#252e28',dust='#8b8064',co=Math.cos(bodyAngle),si=Math.sin(bodyAngle);
  const shell=(name,F,angle,color)=>{const q=F.pt(0,0,0);F.add(name,model(q.x,q.y,q.z,1,1,1,-angle),color,0,M.MATTE);parts[parts.length-1].tankRole=name;};
  H.hull(-.05,.43,0,3.20,.26,1.45,'#34483d');shell('tankHullDetailed',H,bodyAngle,armor);parts[parts.length-1].tankRole='tankHull';
  const R=.335,beltLength=5.68+Math.PI*R*2,spacing=beltLength/34;
  const belt=distance=>{
   let q=((distance%beltLength)+beltLength)%beltLength;
   if(q<2.84)return[-1.42+q,.74,1,0];q-=2.84;
   if(q<Math.PI*R){const t=Math.PI/2-q/R;return[1.42+Math.cos(t)*R,.405+Math.sin(t)*R,Math.sin(t),-Math.cos(t)];}q-=Math.PI*R;
   if(q<2.84)return[1.42-q,.070,-1,0];q-=2.84;
   const t=-Math.PI/2-q/R;return[-1.42+Math.cos(t)*R,.405+Math.sin(t)*R,Math.sin(t),-Math.cos(t)];
  };
  // Fixed transverse axes keep each shoe flat across the belt, including the vertical end arcs.
  const shoe=(b,side,pad=false)=>{
   const [f,y,tx,ty]=b,offset=pad?.026:0,q=H.pt(f-ty*offset,y+tx*offset,side*1.04),l=pad?spacing*.35:spacing*.465,h=pad?.010:.024,w=pad?.157:.241;
   const m=model(q.x,q.y,q.z,1,1,1);m[0]=co*tx*l;m[1]=ty*l;m[2]=si*tx*l;m[4]=-co*ty*h;m[5]=tx*h;m[6]=-si*ty*h;m[8]=-si*w;m[9]=0;m[10]=co*w;
   H.add('box',m,pad?'#314038':'#727c6b',0,pad?rubber:metal);parts[parts.length-1].tankRole=pad?'trackPad':'trackLink';
  };
  for(const side of [-1,1]){
   H.box(0,.45,side*1.02,2.84,.42,.40,'#273b33',0,0,rubber);
   for(let i=0;i<34;i++){const b=belt(i*spacing+track);shoe(b,side);if(b[1]>.14)shoe(b,side,true);}
   // Six road wheels and raised end sprockets sit inside the moving track belt.
   for(let j=0;j<6;j++){
    const f=-1.10+j*.44,cy=.280;
    H.seg([f-.10,.57,side*.89],[f,cy,side*1.21],.046,'#4e6755');
    H.seg([f,cy,side*1.16],[f,cy,side*1.27],.205,'#2b3b33','cylinder',.205,0,rubber);
    H.seg([f,cy,side*1.273],[f,cy,side*1.29],.153,'#78896d');
    H.seg([f,cy,side*1.293],[f,cy,side*1.31],.057,'#a3ad92');
    const turn=-track/.205;
    for(let k=0;k<2;k++){const t=turn+k*Math.PI/2,dx=Math.cos(t)*.103,dy=Math.sin(t)*.103;H.seg([f-dx,cy-dy,side*1.292],[f+dx,cy+dy,side*1.292],.016,'#495f4e');}
   }
   for(const f of [-1.48,1.48]){
    H.seg([f,.48,side*1.16],[f,.48,side*1.285],.205,'#556d58');
    H.seg([f,.48,side*1.289],[f,.48,side*1.306],.110,'#293e34');
    for(let k=0;k<4;k++){const t=k*Math.PI/2-track/.205;H.oval(f+Math.cos(t)*.142,.48+Math.sin(t)*.142,side*1.31,.026,.026,.013,'#a0a88b');}
   }
   H.hull(0,.855,side*1.035,3.55,.095,.54,'#7d8c70');
   for(const f of [-1.10,0,1.10]){
    H.hull(f,.69,side*1.302,1.02,.30,.046,'#62775f');
    H.box(f,.825,side*1.32,.58,.019,.025,edge);
    H.oval(f-.28,.762,side*1.333,.022,.022,.011,'#aab098');
   }
   H.box(1.24,.889,side*1.02,.22,.13,.26,dark);H.box(1.356,.897,side*1.02,.018,.085,.19,'#d4cfaa',0,.15,M.GLASS);
   H.seg([1.382,.87,side*.90],[1.382,.96,side*.90],.016,edge);H.seg([1.382,.96,side*.90],[1.382,.96,side*1.15],.016,edge);
   H.box(-1.67,.781,side*1.00,.054,.08,.13,'#a55f48',0,.03,M.GLASS);
   H.box(-1.18,1.080,side*.48,.46,.086,.28,'#536b55');H.box(-1.18,1.128,side*.48,.36,.018,.23,'#879779');
   H.seg([-1.62,.68,side*.56],[-1.78,.68,side*.56],.056,'#374d40');H.seg([-1.785,.68,side*.56],[-1.796,.68,side*.56],.039,'#162a23');
   H.seg([1.56,.625,side*.49],[1.75,.588,side*.49],.027,'#9da58a');
  }
  // Engine deck, tow cable, driver's hatch and vision slit remain attached to the hull.
  H.box(-1.15,1.061,0,.48,.025,.50,dark);
  for(let i=0;i<6;i++)H.box(-1.355+i*.075,1.079,0,.025,.016,.46,'#92a082');
  H.hull(.86,1.074,-.22,.39,.065,.39,'#829375');H.box(.94,1.127,-.22,.13,.04,.25,'#2b4643');H.box(1.006,1.134,-.22,.012,.021,.19,'#719292',0,.025,M.GLASS);
  for(let i=0;i<6;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;H.seg([-1.79,.84-Math.sin(a)*.12,Math.cos(a)*.54],[-1.79,.84-Math.sin(b)*.12,Math.cos(b)*.54],.014,'#a19877');}
  H.box(.82,1.063,.40,.065,.012,.33,dust);H.box(-.95,1.058,.17,.28,.010,.042,dust);
  // Low turret ring, sloping cheeks and a rear stowage basket replace the stacked body shapes.
  seg([0,1.023,0],[0,1.113,0],.565,'#334b3d');shell('tankTurretDetailed',F,a,'#73775b');parts[parts.length-1].tankRole='tankTurret';
  seg([-.29,1.515,.14],[-.29,1.571,.14],.209,'#354f41');seg([-.29,1.574,.14],[-.29,1.599,.14],.179,'#9aa787');
  box(-.29,1.621,.14,.15,.032,.041,'#c2c5a5');
  seg([-.48,1.516,-.25],[-.48,1.548,-.25],.125,'#5f7b61');box(-.48,1.565,-.25,.14,.025,.040,'#b2bca0');
  for(const side of [-1,1]){
   box(-.08,1.542,side*.32,.21,.042,.10,'#405e51');box(-.073,1.568,side*.32,.14,.014,.061,'#83a3a0',0,.024,M.GLASS);
   for(let i=0;i<3;i++){const f=.02+i*.13;seg([f,1.24,side*.59],[f+.14,1.35,side*.71],.037,'#425c47');seg([f+.14,1.35,side*.71],[f+.154,1.362,side*.722],.025,'#1d342b');}
   seg([-.91,1.18,side*.39],[-1.035,1.39,side*.39],.016,'#7c937d');seg([-.82,1.39,side*.42],[-1.075,1.39,side*.42],.019,'#9bab8d');
   box(-.17,1.516,side*.449,.28,.012,.027,'#aeb79b');
  }
  seg([-1.035,1.385,-.42],[-1.035,1.385,.42],.018,'#a1b193');seg([-.967,1.285,-.33],[-.967,1.285,.33],.109,'#8d9274','cylinder',.109,0,M.FABRIC);
  for(const side of [-1,1])box(-.967,1.398,side*.19,.16,.018,.035,'#4f6851');
  seg([-.56,1.48,.38],[-.56,1.57,.38],.037,'#6a826b');seg([-.56,1.57,.38],[-.65,2.00,.42],.010,'#263d31');
  // Distinct applique cheeks and dark seams give the armor thickness at gameplay distance.
  for(const side of [-1,1]){
   F.hull(.075,1.323,side*.608,.58,.183,.138,'#5c644c');
   box(.085,1.420,side*.603,.44,.018,.104,'#9b9b7e');
  }
  if(motion.vehicleDetail!==false){
   // Fasteners, optics, stowage and repair hardware: no new firing or collision geometry.
   for(const side of [-1,1]){
    for(const f of [-.14,.27])seg([f,1.327,side*.671],[f,1.327,side*.691],.023,'#b0aa88');
    H.hull(-1.31,.996,side*.73,.36,.19,.24,'#6c6c53');
    H.box(-1.31,1.097,side*.73,.30,.014,.19,'#9a9375');
    H.box(-1.31,1.005,side*.861,.08,.044,.019,'#bbb08b');
    H.seg([-.88,.913,side*1.03],[.26,.913,side*1.03],.021,'#514c39');
    H.box(-.22,.937,side*1.03,.12,.045,.07,'#a0997c');
    for(const f of [-.62,.08,.77])H.oval(f,.775,side*1.337,.021,.023,.009,'#c1b493');
    // Identification chevrons are paint on the skirts, with no emissive/glow treatment.
    H.seg([.83,.728,side*1.332],[.98,.660,side*1.332],.015,'#c7bea0','box',.004);
    H.seg([.98,.660,side*1.332],[.83,.595,side*1.332],.015,'#c7bea0','box',.004);
   }
   F.hull(.005,1.569,-.25,.23,.12,.17,'#303d33');
   box(.122,1.580,-.25,.014,.060,.119,'#42626a',0,0,M.VEHICLE_GLASS);
   box(.005,1.637,-.25,.20,.019,.147,'#a6a187');
   for(const f of [-1.035,-.90,-.765])H.box(f,1.084,.31,.076,.022,.13,'#303b31');
   for(const side of [-1,1])seg([-.967,1.399,side*.19],[-.967,1.399,side*.27],.013,'#b1a27b');
  }
  // Recoil and the muzzle opening retain the exact existing firing coordinates.
  const kick=pose.kick;
  seg([.43,1.32,0],[.78-kick,1.32,0],.184,'#4d664d');
  seg([.69-kick,1.32,0],[2.047-kick,1.32,0],.072,'#809074');
  seg([1.10-kick,1.32,0],[1.34-kick,1.32,0],.108,'#657e62');
  for(const f of [.84,1.53])seg([f-kick,1.32,0],[f+.045-kick,1.32,0],.083,'#a3ad91');
  seg([1.93-kick,1.32,0],[2.086-kick,1.32,0],.112,'#455d48');
  seg([2.087-kick,1.32,0],[2.104-kick,1.32,0],.076,'#14261e');F.ring(2.091-kick,1.32,0,.097,'#98a68a');
  parts[parts.length-1].tankRole='muzzleRim';
 }else if(kind==='heli'){
  const h=pose.lift,time=game.time||0,transport=!!game.arcade?.transport,open=transport?clamp(game.arcade?.doorsOpen||0,0,1):0;
  const M=MATERIAL_IDS,body=transport?'#687b70':'#536252',edge='#83978a',dark='#293f3e';
  const tag=role=>{parts[parts.length-1].heliRole=role;};
  const mesh=(name,f,y,s,color,turn=0,material=M.METAL,role)=>{const q=F.pt(f,y,s);F.add(name,model(q.x,q.y,q.z,1,1,1,-a-turn),color,0,material);if(role)tag(role);};
  mesh('heliFuselage',0,h,0,body,0,M.MATTE,'hull');
  mesh('heliCanopy',0,h,0,'#2d4650',0,M.GLASS,'canopy');
  // Split windscreen and narrow framing retain a clear cockpit silhouette from above.
  for(const side of [-1,1]){
   const pane=[[.40,h+.448,side*.028],[.46,h+.315,side*.465],[1.23,h+.086,side*.294],[1.34,h+.097,side*.028]];
   for(let i=0;i<4;i++)seg(pane[i],pane[(i+1)%4],.018,edge);
   seg([.79,h+.228,side*.060],[1.15,h+.142,side*.23],.009,'#223a3d');
   box(.29,h+.10,side*.615,.39,.31,.018,'#233f47',0,.015,M.GLASS);tag('window');
   seg([.10,h+.27,side*.59],[.50,h+.27,side*.55],.015,edge);
   seg([.10,h-.045,side*.625],[.50,h-.045,side*.595],.013,edge);
   // The cabin aperture sits behind a sliding door, with a dark threshold and lit upper rail.
   box(-.30,h-.015,side*.633,.96,.63,.016,'#142a2c',0,0,M.MATTE);tag('cabin');
   const df=-.30-open*.79;
   box(df,h-.015,side*.659,.94,.65,.031,body,0,0,M.MATTE);tag('door');
   box(df+.04,h+.095,side*.684,.58,.30,.015,'#263f48',0,.015,M.GLASS);tag('window');
   for(const dx of [-.43,.43])seg([df+dx,h-.325,side*.681],[df+dx,h+.295,side*.675],.010,edge);
   seg([-.91,h+.335,side*.621],[.16,h+.335,side*.621],.020,edge);
   box(df+.27,h-.155,side*.691,.12,.033,.018,'#b3baa1');
   box(-.31,h-.356,side*.643,1.10,.053,.077,'#869787');
   if(transport){
    box(df-.10,h-.20,side*.685,.25,.063,.011,'#d6cfad',0,0,M.MATTE);
    box(df-.10,h-.20,side*.687,.069,.225,.012,'#d6cfad',0,0,M.MATTE);
    if(open>.1){box(-.35,h+.299,side*.647,.46,.025,.023,'#c4d4ae',0,.18,M.GLASS);tag('cabinLamp');}
   }else{
    // These muzzle and missile endpoints match the existing firing pose exactly.
    box(-.12,h-.06,side*.77,.48,.085,.56,body);
    seg([.05,h-.18,side*.91],[.62,h-.18,side*.91],.125,dark);
    seg([.64,h-.18,side*.91],[.73,h-.18,side*.91],.075,'#161f22');
    seg([.55,h-.37,side*.50],[1.68,h-.37,side*.50],.058,dark);
    seg([1.53,h-.37,side*.50],[1.68,h-.37,side*.50],.091,'#697969');
    seg([1.676,h-.37,side*.50],[1.686,h-.37,side*.50],.048,'#111e21');
   }
   // Twin engine fairings, recessed inlets and heat-darkened exhaust mouths.
   oval(-.32,h+.44,side*.27,.55,.20,.215,'#718171');
   oval(.075,h+.477,side*.27,.15,.103,.158,'#1e3436');
   seg([-.76,h+.50,side*.27],[-1.01,h+.49,side*.27],.095,'#526764');
   seg([-1.015,h+.49,side*.27],[-1.026,h+.49,side*.27],.074,'#172c2d');
   for(let i=0;i<4;i++)box(-.62+i*.12,h+.612,side*.28,.035,.025,.215,'#2e4745');
   // Braced skids, shock collars and raised toes keep the touchdown height unchanged.
   for(const f of [-.62,.62]){
    seg([f,h-.29,side*.40],[f+.025,h-.785,side*.74],.040,'#637d75');
    seg([f+.008,h-.48,side*.53],[f+.013,h-.64,side*.65],.057,'#243c3a');
    seg([f-.14,h-.57,side*.66],[f+.14,h-.57,side*.66],.024,edge);
   }
   seg([-1.10,h-.81,side*.74],[1.02,h-.81,side*.74],.044,'#a0aca0');
   seg([1.02,h-.81,side*.74],[1.22,h-.69,side*.74],.044,'#a0aca0');
   seg([-1.10,h-.81,side*.74],[-1.21,h-.735,side*.74],.040,'#8da195');
   for(const f of [-.72,.72])box(f,h-.823,side*.74,.24,.035,.09,'#354b44',0,0,M.RUBBER);
   box(-.18,h-.31,side*.69,.63,.055,.22,'#768d80');
   oval(-.60,h+.04,side*.678,.043,.036,.030,side>0?'#68cda6':'#da7763',.47,M.GLASS);tag('nav');
  }
  if(!transport){
   // Sensor mount and dark service panels read from above without enlarging the aircraft.
   for(const side of [-1,1]){
    F.hull(-.61,h+.363,side*.45,.40,.095,.15,'#3b4b43');
    seg([1.06,h-.30,side*.135],[1.06,h-.45,side*.135],.026,'#859083');
    box(-2.04,h+.362,side*.078,.078,.075,.015,'#c4b782',0,0,M.MATTE);tag('tail');
   }
   if(motion.vehicleDetail!==false){
    for(const side of [-1,1]){
     // Recessed launcher tubes surround the unchanged missile origin.
     for(let i=0;i<7;i++){
      const t=i*Math.PI/3,r=i===6?0:.071,y=h-.18+Math.cos(t)*r,s=side*.91+Math.sin(t)*r;
      seg([.732,y,s],[.744,y,s],.025,'#101c1c');
     }
     for(const f of [-.77,-.51,-.25,.01])oval(f,h-.274,side*.650,.010,.012,.009,'#a4aa93');
     seg([-.78,h-.27,side*.654],[.04,h-.27,side*.654],.007,'#142822');
     box(-.62,h+.418,side*.448,.23,.013,.09,'#a0a68b');
     box(-.58,h+.429,side*.448,.072,.011,.09,'#453e2c');
     seg([-.97,h+.135,side*.20],[-.94,h+.228,side*.40],.014,'#9ca693');
     box(-.60,h-.09,side*.688,.175,.045,.011,'#c4bba1',0,0,M.MATTE);
     box(-.57,h-.09,side*.700,.032,.047,.006,'#25372f',0,0,M.MATTE);
    }
    oval(1.172,h-.368,-.073,.037,.032,.032,'#6d999e',0,M.VEHICLE_GLASS);
    oval(1.172,h-.368,.073,.031,.029,.029,'#9b8060',0,M.VEHICLE_GLASS);
   }
  }
  // Tapered tail boom, swept stabilizers and a separate lateral rotor gearbox.
  seg([-.90,h+.105,0],[-2.65,h+.34,0],.138,body,'torso',.098);tag('tail');
  seg([-2.61,h+.34,0],[-2.79,h+.39,0],.088,edge);tag('tail');
  mesh('heliFin',-2.67,h+.35,0,body,0,M.MATTE,'tail');
  box(-2.15,h+.30,0,.49,.047,1.14,'#778b7c');tag('tail');
  for(const side of [-1,1]){seg([-2.45,h+.38,side*.041],[-2.65,h+.89,side*.041],.012,'#b4b69c');tag('tail');}
  seg([-2.67,h+.39,-.02],[-2.67,h+.39,-.20],.070,'#8b9e90');tag('tail');
  oval(-2.67,h+.39,-.205,.092,.091,.05,'#233c3c');tag('tail');
  for(let i=0;i<4;i++){
   const r=time*53+i*Math.PI/2;
   seg([-2.67+Math.cos(r)*.07,h+.39+Math.sin(r)*.07,-.225],[-2.67+Math.cos(r)*.39,h+.39+Math.sin(r)*.39,-.225],.020,'#a8b3a0','box',.043);tag('tail');
  }
  // Rotor swashplate, control links and tapered graphite blades share the old rotor plane.
  seg([-.10,h+.53,0],[-.10,h+.87,0],.065,'#a6b5a2');
  oval(-.10,h+.65,0,.16,.045,.16,'#425e57');oval(-.10,h+.875,0,.145,.065,.145,'#849b8c');
  for(let i=0;i<4;i++){
   const t=time*39+i*Math.PI/2,co=Math.cos(t),si=Math.sin(t);
   seg([-.10+co*.10,h+.68,si*.10],[-.10+co*.30,h+.87,si*.30],.014,'#c4ccb5');
   mesh('heliBlade',-.10,h+.88,0,'#334d49',t,M.MATTE,'blade');parts[parts.length-1].blade=i;
   box(-.10+co*2.40,h+.897,si*2.40,.12,.016,.10,'#b6b799',t,0,M.MATTE);tag('bladeTip');parts[parts.length-1].blade=i;
  }
  seg([-.73,h+.57,0],[-.89,h+.93,0],.012,'#293f3a');
  seg([.50,h-.36,0],[.41,h-.66,0],.013,'#314a41');
  oval(1.04,h-.355,0,.145,.105,.14,'#394f4d');
  oval(1.15,h-.355,0,.027,.058,.068,'#849f9c',.035,M.GLASS);tag('nav');
  oval(-.51,h+.658,0,.034,.027,.034,'#ed9c81',.32+.30*Math.pow(Math.max(0,Math.sin(time*5.5)),10),M.GLASS);tag('nav');

 }
 if(kind==='ray')Voidcaster.finish(parts,game.arcade,game.time||0,motion.weaponDetail!==false);
 if(kind==='tank'&&(game.player.groundHeight||0)>0){
  const p=game.player,origin={x:(p.x-CX)*SCALE,y:p.groundHeight,z:(p.y-CY)*SCALE};
  for(const part of parts){const m=part.matrix,q=rampTankPoint(p,{x:m[12],y:m[13],z:m[14]});
   for(let k=0;k<12;k+=4){const v=rampTankPoint(p,{x:origin.x+m[k],y:origin.y+m[k+1],z:origin.z+m[k+2]});m[k+1]=v.y-origin.y;m[k+2]=v.z-origin.z;}
   m[13]=q.y;m[14]=q.z;
  }
 }
 return {pose,parts};
}

// Visual budget only: simulation, targeting and input keep their existing timing.
class RenderQuality{
 constructor(mode='auto',touch=false){this.touch=!!touch;this.setMode(mode);}
 setMode(mode){this.mode=['auto','performance','high'].includes(mode)?mode:'auto';this.level=this.mode==='performance'?0:this.mode==='high'?2:this.touch?1:2;this.resetSampling();}
 resetSampling(){this.seconds=0;this.frames=0;this.slowFrames=0;this.warmup=1.25;}
 get pixelRatio(){return [.75,1,1.5][this.level];}
 get maxPixels(){return [600000,1000000,Infinity][this.level];}
 get shadows(){return this.level>0;}
 get effectsStride(){return this.level===0?3:1;}
 observe(elapsed,active){
  if(this.mode!=='auto'||!active||!Number.isFinite(elapsed)||elapsed<=0||elapsed>.25){this.resetSampling();return false;}
  if(this.warmup>0){this.warmup-=elapsed;return false;}
  this.seconds+=elapsed;this.frames++;if(elapsed>.025)this.slowFrames++;
  if(this.seconds<2.5)return false;
  const lower=this.level>0&&this.seconds/this.frames>.028&&this.slowFrames/this.frames>.6;
  // Only step down during this session; avoid repeated sharp/soft quality oscillation.
  this.resetSampling();if(lower){this.level--;this.warmup=4;return true;}return false;
 }
}
function budgetCinematicEffects(plan,stride=1){
 if(stride<=1)return plan;
 return{...plan,haze:plan.haze.filter((_,i)=>i%stride===0),ribbons:plan.ribbons.filter((_,i)=>i%stride===0)};
}

class Renderer3D{
 constructor(canvas){
  this.canvas=canvas;this.quality=new RenderQuality('high');this.gl=canvas.getContext?.('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'})||null;this.camPos=null;this.camTarget=null;this.decorCache=new Map();this.northDepotDetails=null;this.arenaDetailCache=new Map();this.groundCache=new Map();this.atmosphereCache=new Map();this.actorMotion=new Map();this.lastGameTime=-1;this.metrics=emptyPresentationMetrics();this.frameStart=0;
  if(!this.gl){this.mode='fallback';this.ctx=canvas.getContext?.('2d')||null;return;}
  this.mode='webgl2';const gl=this.gl;this.p=program(gl);this.loc={pos:gl.getAttribLocation(this.p,'aPos'),norm:gl.getAttribLocation(this.p,'aNorm'),proj:gl.getUniformLocation(this.p,'uProj'),view:gl.getUniformLocation(this.p,'uView'),model:gl.getUniformLocation(this.p,'uModel'),color:gl.getUniformLocation(this.p,'uColor'),fog:gl.getUniformLocation(this.p,'uFog'),cam:gl.getUniformLocation(this.p,'uCam'),glow:gl.getUniformLocation(this.p,'uGlow'),material:gl.getUniformLocation(this.p,'uMaterial'),keyDir:gl.getUniformLocation(this.p,'uKeyDir'),ambientTop:gl.getUniformLocation(this.p,'uAmbientTop'),ambientGround:gl.getUniformLocation(this.p,'uAmbientGround'),envEnabled:gl.getUniformLocation(this.p,'uEnvEnabled'),envPositions:gl.getUniformLocation(this.p,'uEnvPositions[0]'),envColors:gl.getUniformLocation(this.p,'uEnvColors[0]'),dock:gl.getUniformLocation(this.p,'uDock'),staticShadow:gl.getUniformLocation(this.p,'uStaticShadow'),shadow:gl.getUniformLocation(this.p,'uDockShadow'),shadowMatrix:gl.getUniformLocation(this.p,'uDockShadowMatrix'),dockTime:gl.getUniformLocation(this.p,'uDockTime'),depotQuality:gl.getUniformLocation(this.p,'uDepotQuality')};this.ip=instancedProgram(gl);this.iloc={pos:gl.getAttribLocation(this.ip,'aPos'),norm:gl.getAttribLocation(this.ip,'aNorm'),m0:gl.getAttribLocation(this.ip,'iM0'),m1:gl.getAttribLocation(this.ip,'iM1'),m2:gl.getAttribLocation(this.ip,'iM2'),m3:gl.getAttribLocation(this.ip,'iM3'),colorGlow:gl.getAttribLocation(this.ip,'iColorGlow'),material:gl.getAttribLocation(this.ip,'iMaterial'),proj:gl.getUniformLocation(this.ip,'uProj'),view:gl.getUniformLocation(this.ip,'uView'),fog:gl.getUniformLocation(this.ip,'uFog'),cam:gl.getUniformLocation(this.ip,'uCam'),keyDir:gl.getUniformLocation(this.ip,'uKeyDir'),ambientTop:gl.getUniformLocation(this.ip,'uAmbientTop'),ambientGround:gl.getUniformLocation(this.ip,'uAmbientGround'),envEnabled:gl.getUniformLocation(this.ip,'uEnvEnabled'),envPositions:gl.getUniformLocation(this.ip,'uEnvPositions[0]'),envColors:gl.getUniformLocation(this.ip,'uEnvColors[0]'),dock:gl.getUniformLocation(this.ip,'uDock'),staticShadow:gl.getUniformLocation(this.ip,'uStaticShadow'),shadow:gl.getUniformLocation(this.ip,'uDockShadow'),shadowMatrix:gl.getUniformLocation(this.ip,'uDockShadowMatrix'),dockTime:gl.getUniformLocation(this.ip,'uDockTime'),depotQuality:gl.getUniformLocation(this.ip,'uDepotQuality')};this.instanceGroups=new Map();this.instanceFrame=null;this.playerMotion=null;this.meshes=new Map();this.registerMesh('box',{positions:BOX_POS,normals:BOX_NORM});this.registerMesh('depotChamfer',createDepotChamferMesh());this.registerMesh('depotCap',createDepotCapMesh());this.registerMesh('sphere',createSphereMesh(10,6));this.registerMesh('cylinder',createCylinderMesh(10));this.registerMesh('torso',createCylinderMesh(10,.82,1));this.registerMesh('cone',createConeMesh(10));this.registerMesh('wedge',createWedgeMesh());this.registerMesh('powerSphere',createSphereMesh(16,10));this.registerMesh('powerCylinder',createCylinderMesh(16));this.registerMesh('powerTorso',createCylinderMesh(16,.82,1));this.registerMesh('powerRing',createPowerupRing());this.registerMesh('powerHull',createPowerupHull());this.registerMesh('arenaGable',createArenaGableMesh());this.registerMesh('campCanvas',createCampCanvasMesh());this.registerMesh('campWear',createCampWearMesh());this.registerMesh('parkCrown',createParkCrownMesh());this.registerMesh('coldSnow',createColdSnowMesh());this.registerMesh('parkCypress',createParkCrownMesh(true));this.registerMesh('parkObelisk',createParkObeliskMesh());this.registerMesh('parkBranch',createParkBranchMesh());for(const [name,data] of Object.entries(createPickupMeshes()))this.registerMesh(name,data);for(const [name,data] of Object.entries(createHelicopterMeshes()))this.registerMesh(name,data);for(const [name,data] of Object.entries(createTankMeshes()))this.registerMesh(name,data);for(const [name,data] of Object.entries(createLootMeshes()))this.registerMesh(name,data);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);this.meshZombies=new DeadwatchMesh.Renderer(gl);this.meshPlayer=new DeadwatchSurvivor.Renderer(gl);this.bulletRibbons=new BulletRibbonRenderer(gl);this.pickupGlow=new PickupGlowRenderer(gl);this.walkerSprites={ready:false};this.resize();
 }
 resize(){
  const cw=this.canvas.clientWidth||320,ch=this.canvas.clientHeight||180,nativeDpr=typeof window!=='undefined'?window.devicePixelRatio||1:1;
  const dpr=Math.min(nativeDpr,this.quality.pixelRatio,Math.sqrt(this.quality.maxPixels/(cw*ch))),w=Math.max(1,Math.floor(cw*dpr)),h=Math.max(1,Math.floor(ch*dpr));
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}if(this.gl)this.gl.viewport(0,0,w,h);
 }
 registerMesh(name,data){const gl=this.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);const posBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,posBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.positions),gl.STATIC_DRAW);gl.enableVertexAttribArray(this.loc.pos);gl.vertexAttribPointer(this.loc.pos,3,gl.FLOAT,false,0,0);const normBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,normBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.normals),gl.STATIC_DRAW);gl.enableVertexAttribArray(this.loc.norm);gl.vertexAttribPointer(this.loc.norm,3,gl.FLOAT,false,0,0);this.meshes.set(name,{vao,count:data.positions.length/3,posBuffer,normBuffer,instanceVao:null,instanceBuffer:null,instanceData:new Float32Array(0),instanceCapacity:0});}
 ensureInstancedMesh(mesh){
  if(mesh.instanceVao)return;const gl=this.gl,L=this.iloc,stride=21*4;mesh.instanceVao=gl.createVertexArray();mesh.instanceBuffer=gl.createBuffer();gl.bindVertexArray(mesh.instanceVao);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.posBuffer);gl.enableVertexAttribArray(L.pos);gl.vertexAttribPointer(L.pos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.normBuffer);gl.enableVertexAttribArray(L.norm);gl.vertexAttribPointer(L.norm,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instanceBuffer);for(const [loc,off] of [[L.m0,0],[L.m1,16],[L.m2,32],[L.m3,48]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,4,gl.FLOAT,false,stride,off);gl.vertexAttribDivisor(loc,1);}gl.enableVertexAttribArray(L.colorGlow);gl.vertexAttribPointer(L.colorGlow,4,gl.FLOAT,false,stride,64);gl.vertexAttribDivisor(L.colorGlow,1);gl.enableVertexAttribArray(L.material);gl.vertexAttribPointer(L.material,1,gl.FLOAT,false,stride,80);gl.vertexAttribDivisor(L.material,1);gl.bindVertexArray(null);
 }
 noteActorHit(id,x,y,amount=0){const state=this.actorMotion.get(id)||{x:+x||0,y:+y||0,travel:0,displayAngle:0};state.hitKick=1;state.hitAmount=+amount||0;state.hitWorld={x:+x||0,y:+y||0};this.actorMotion.set(id,state);}
 clearInstanceQueues(){for(const items of this.instanceGroups.values())items.length=0;}
 queueInstance(mesh,matrix,color,glow=0,material=MATERIAL_IDS.MATTE,actorId=0){
  if(this.mode!=='webgl2'||!this.meshes.has(mesh))return;const key=`${mesh}|${material}`;let items=this.instanceGroups.get(key);if(!items){items=[];items.mesh=mesh;items.material=material;this.instanceGroups.set(key,items);}items.push({mesh,material,actorId,matrix,color,glow});
 }
 setEnvironmentUniforms(loc,state){
  const gl=this.gl;gl.uniform1f(loc.envEnabled,state?.enabled||0);
  if(state?.enabled){gl.uniform4fv(loc.envPositions,state.positions);gl.uniform3fv(loc.envColors,state.colors);}
 }
 setDockUniforms(loc,enabled,depot=false,memorial=false,pump=false,cold=false,rail=false,camp=false,evac=false){
  const gl=this.gl;gl.uniform1f(loc.depotQuality,this.quality.level??2);const shadow=enabled?this.dockShadow:depot?this.depotShadow:memorial?this.memorialShadow:pump?this.pumpShadow:cold?this.coldShadow:rail?this.railShadow:camp?this.campShadow:evac?this.evacShadow:null;
  gl.uniform1f(loc.dockTime,this.dockTime||0);gl.uniform1f(loc.dock,camp?3:rail?2:(enabled||evac)&&shadow?.ready?1:0);
  if(shadow){shadow.bind(loc);if(!this.quality.shadows)gl.uniform1f(loc.staticShadow,0);}else{gl.uniform1f(loc.staticShadow,0);gl.uniform1i(loc.shadow,3);}
 }
 flushInstances(){
  if(this.mode!=='webgl2'||!this.instanceGroups.size)return;const gl=this.gl,F=this.instanceFrame;if(!F){for(const items of this.instanceGroups.values())items.length=0;return;}gl.useProgram(this.ip);gl.uniformMatrix4fv(this.iloc.proj,false,F.proj);gl.uniformMatrix4fv(this.iloc.view,false,F.view);gl.uniform3f(this.iloc.fog,F.fog[0],F.fog[1],F.fog[2]);gl.uniform3f(this.iloc.cam,F.cam.x,F.cam.y,F.cam.z);const light=F.light||{key:[.38,.86,.22],top:[.24,.29,.31],ground:[.08,.10,.11]};gl.uniform3f(this.iloc.keyDir,...light.key);gl.uniform3f(this.iloc.ambientTop,...light.top);gl.uniform3f(this.iloc.ambientGround,...light.ground);this.setEnvironmentUniforms(this.iloc,F.environment);this.setDockUniforms(this.iloc,F.isDock,F.isDepot,F.isMemorial,F.isPump,F.isCold,F.isRail,F.isCamp,F.isEvac);
  for(const items of this.instanceGroups.values()){
   const count=items.length;if(!count)continue;const mesh=this.meshes.get(items.mesh);if(!mesh)continue;this.ensureInstancedMesh(mesh);const need=count*21;if(mesh.instanceCapacity<need){let cap=Math.max(21,mesh.instanceCapacity||21);while(cap<need)cap*=2;mesh.instanceCapacity=cap;mesh.instanceData=new Float32Array(cap);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,cap*4,gl.DYNAMIC_DRAW);}const data=mesh.instanceData;let o=0;for(const item of items){data.set(item.matrix,o);o+=16;const c=hex(item.color);data[o++]=c[0];data[o++]=c[1];data[o++]=c[2];data[o++]=Number(item.glow)||0;data[o++]=Number(item.material)||0;}gl.bindVertexArray(mesh.instanceVao);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instanceBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,need));gl.drawArraysInstanced(gl.TRIANGLES,0,mesh.count,count);this.metrics.actorPartInstances+=count;this.metrics.drawCalls+=1;items.length=0;
  }gl.bindVertexArray(null);gl.useProgram(this.p);
 }
 drawMesh(name,m,color,glow=0,material=MATERIAL_IDS.MATTE){const gl=this.gl,mesh=this.meshes.get(name);if(!mesh)return;const c=hex(color);gl.bindVertexArray(mesh.vao);gl.uniformMatrix4fv(this.loc.model,false,m);gl.uniform3f(this.loc.color,c[0],c[1],c[2]);gl.uniform1f(this.loc.glow,glow);gl.uniform1f(this.loc.material,material);this.metrics.drawCalls++;gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
 box(x,y,z,sx,sy,sz,color,ry=0,glow=0,material=MATERIAL_IDS.MATTE){this.drawMesh('box',model(x,y,z,sx/2,sy/2,sz/2,ry),color,glow,material);}
 ellipsoid(x,y,z,sx,sy,sz,color,ry=0,glow=0,material=MATERIAL_IDS.MATTE){this.drawMesh('sphere',model(x,y,z,sx,sy,sz,ry),color,glow,material);}
 segment(ax,ay,az,bx,by,bz,r,color,glow=0,mesh='cylinder',rz=r,material=MATERIAL_IDS.MATTE){this.drawMesh(mesh,basisModel(ax,ay,az,bx,by,bz,r,rz),color,glow,material);}
 strip(x,z,len,width,color,ry=0,glow=0,material=MATERIAL_IDS.MATTE){this.box(x,.012,z,len,.018,width,color,ry,glow,material);}
 surfaceAtWorld(x,z){return this.surfaceArena==='rail'?DeadwatchCore.railPlatformHeight(this.surfaceTrain,x/SCALE+CX,z/SCALE+CY):DeadwatchCore.arenaSurfaceHeight(this.surfaceArena,x/SCALE+CX,z/SCALE+CY);}
 shadow(x,z,sx=.55,sz=.38,speed=0,angle=0){const stretch=1+clamp(Math.abs(speed)/220,0,.22);this.ellipsoid(x,this.surfaceAtWorld(x,z)+.010,z,sx*.78*stretch,.010,sz*.76,'#111819',angle,0,MATERIAL_IDS.MATTE);}
 carbine(x,y,z,a,scale=1,color='#4a5552'){
  const plan=carbineDetailPlan({x,y,z},a,scale,color);
  for(const p of plan.parts){if(p.kind==='box')this.box(p.c.x,p.c.y,p.c.z,p.sx,p.sy,p.sz,p.color,p.ry,p.glow||0,p.material);else this.segment(p.A.x,p.A.y,p.A.z,p.B.x,p.B.y,p.B.z,p.rad,p.color,p.glow||0,p.mesh||'cylinder',p.rz||p.rad,p.material);}
 }
 actor(x,z,a,colors,scale=1,opts={}){
  const pose=actorPose(opts.step||0,opts.speed||0,!!opts.attack),gait=groundedGait(opts.step||0,opts.speed||0,a,opts.moveAngle),footGait=opts.zombie?distanceGroundedGait(opts.travel||0,Math.abs(opts.speed||0)*SCALE,scale):null,f={x:Math.cos(a),z:Math.sin(a)},r={x:-Math.sin(a),z:Math.cos(a)},mf=gait.moveForward,bob=footGait?footGait.bodyBob:gait.bodyBob*scale;
  this.shadow(x,z,.52*scale,.34*scale);
  if(opts.dead){
   const y=.17*scale;this.ellipsoid(x,y,z,.34*scale,.22*scale,.48*scale,colors.body,a);this.ellipsoid(x+f.x*.58*scale,.18*scale,z+f.z*.58*scale,.22*scale,.22*scale,.22*scale,colors.head);this.segment(x-r.x*.22*scale,y,z-r.z*.22*scale,x-r.x*.65*scale+f.x*.15*scale,.13*scale,z-r.z*.65*scale+f.z*.15*scale,.08*scale,colors.arms||colors.head);this.segment(x+r.x*.22*scale,y,z+r.z*.22*scale,x+r.x*.72*scale-f.x*.10*scale,.12*scale,z+r.z*.72*scale-f.z*.10*scale,.08*scale,colors.arms||colors.head);return;
  }
  const zombie=!!opts.zombie,hunch=zombie?(.13+pose.hunch)*scale:0,pelvis={x:x+f.x*hunch*.25,y:.67*scale+bob,z:z+f.z*hunch*.25},chest={x:x+f.x*hunch,y:1.18*scale+bob,z:z+f.z*hunch};
  this.drawMesh('torso',model(pelvis.x,pelvis.y,pelvis.z,.27*scale,.22*scale,.19*scale,a),colors.legs||colors.body,0,MATERIAL_IDS.ORGANIC);
  this.drawMesh('torso',model(chest.x,chest.y,chest.z,.37*scale,.40*scale,.23*scale,a),colors.body,0,MATERIAL_IDS.ORGANIC);
  this.ellipsoid(chest.x,1.37*scale+bob,chest.z,.38*scale,.16*scale,.26*scale,colors.chest||colors.body,a,0,MATERIAL_IDS.ORGANIC);
  const neck={x:chest.x+f.x*(zombie?.07:0),y:1.48*scale+bob,z:chest.z+f.z*(zombie?.07:0)},head={x:chest.x+f.x*(zombie?.18:0),y:1.68*scale+bob,z:chest.z+f.z*(zombie?.18:0)};
  this.segment(neck.x,neck.y-.08*scale,neck.z,neck.x,neck.y+.08*scale,neck.z,.09*scale,colors.head);
  this.ellipsoid(head.x,head.y,head.z,.22*scale,.27*scale,.21*scale,colors.head,a,0,MATERIAL_IDS.ORGANIC);
  if(opts.hair)this.ellipsoid(head.x,head.y+.18*scale,head.z,.225*scale,.08*scale,.215*scale,opts.hair,a,0,MATERIAL_IDS.ORGANIC);
  if(opts.armed){
   // Rounded tactical silhouette that stays readable from the fixed overhead view.
   this.ellipsoid(head.x-f.x*.015*scale,head.y+.18*scale,head.z-f.z*.015*scale,.235*scale,.09*scale,.225*scale,'#1b292d',a,0,MATERIAL_IDS.METAL);
   this.ellipsoid(chest.x+r.x*.34*scale,1.36*scale+bob,chest.z+r.z*.34*scale,.115*scale,.10*scale,.15*scale,'#243a3e',a,0,MATERIAL_IDS.METAL);
   this.ellipsoid(chest.x-r.x*.34*scale,1.36*scale+bob,chest.z-r.z*.34*scale,.115*scale,.10*scale,.15*scale,'#243a3e',a,0,MATERIAL_IDS.METAL);
   this.segment(chest.x-r.x*.22*scale,1.42*scale+bob,chest.z-r.z*.22*scale,chest.x+r.x*.22*scale,1.03*scale+bob,chest.z+r.z*.22*scale,.026*scale,'#b58b52',0,'cylinder',.018*scale,MATERIAL_IDS.ORGANIC);
   this.segment(pelvis.x-r.x*.23*scale,.79*scale+bob,pelvis.z-r.z*.23*scale,pelvis.x+r.x*.23*scale,.79*scale+bob,pelvis.z+r.z*.23*scale,.035*scale,'#111d20',0,'cylinder',.024*scale,MATERIAL_IDS.METAL);
  }
  if(zombie){
   const variant=Math.abs(opts.id||0)%3,rag=variant===0?'#392f2b':variant===1?'#493a34':'#303b38';
   this.drawMesh('torso',model(chest.x-f.x*.035*scale,1.20*scale+bob,chest.z-f.z*.035*scale,.385*scale,.18*scale,.24*scale,a),rag,0,MATERIAL_IDS.ORGANIC);
   this.ellipsoid(chest.x+f.x*.21*scale-r.x*.14*scale,1.24*scale+bob,chest.z+f.z*.21*scale-r.z*.14*scale,.085*scale,.11*scale,.035*scale,'#762824',a,.10,MATERIAL_IDS.WET);
   this.ellipsoid(head.x+f.x*.16*scale,head.y-.11*scale,head.z+f.z*.16*scale,.15*scale,.055*scale,.15*scale,'#6f5044',a,0,MATERIAL_IDS.ORGANIC);
  }
  for(const side of [-1,1]){
   const stride=footGait?(side<0?footGait.left.forward:footGait.right.forward):gait.stride*scale*side,lift=footGait?(side<0?footGait.left.lift:footGait.right.lift):(side<0?gait.footLiftL:gait.footLiftR)*scale;
   const hip={x:pelvis.x+r.x*.16*scale*side,y:.68*scale+bob,z:pelvis.z+r.z*.16*scale*side};
   const knee={x:hip.x+mf.x*stride*.58,y:.39*scale+lift*.42,z:hip.z+mf.z*stride*.58};
   const ankle={x:hip.x+mf.x*stride,y:.10*scale+lift,z:hip.z+mf.z*stride};
   this.segment(hip.x,hip.y,hip.z,knee.x,knee.y,knee.z,.095*scale,colors.legs);this.segment(knee.x,knee.y,knee.z,ankle.x,ankle.y,ankle.z,.082*scale,colors.legs);
   this.ellipsoid(ankle.x+f.x*.08*scale,.07*scale+lift,ankle.z+f.z*.08*scale,.11*scale,.07*scale,.20*scale,colors.boots||colors.legs,a);
   // Small per-foot contact shadow makes planted feet read against asphalt/concrete even under flat overhead lighting.
   if(lift<.025*scale)this.ellipsoid(ankle.x+f.x*.05*scale,.006,ankle.z+f.z*.05*scale,.15*scale,.006,.12*scale,'#030607',a,0,MATERIAL_IDS.MATTE);
  }
  const shL={x:chest.x+r.x*.34*scale,y:1.34*scale+bob,z:chest.z+r.z*.34*scale},shR={x:chest.x-r.x*.34*scale,y:1.34*scale+bob,z:chest.z-r.z*.34*scale};
  let elL,elR,haL,haR;
  if(opts.armed){elL={x:chest.x+r.x*.26*scale+f.x*.22*scale,y:1.18*scale+bob,z:chest.z+r.z*.26*scale+f.z*.22*scale};haL={x:chest.x+r.x*.11*scale+f.x*.47*scale,y:1.20*scale+bob,z:chest.z+r.z*.11*scale+f.z*.47*scale};elR={x:chest.x-r.x*.27*scale+f.x*.13*scale,y:1.19*scale+bob,z:chest.z-r.z*.27*scale+f.z*.13*scale};haR={x:chest.x-r.x*.10*scale+f.x*.29*scale,y:1.18*scale+bob,z:chest.z-r.z*.10*scale+f.z*.29*scale};}
  else{const reach=(opts.attack?.62:.08)*scale,swing=pose.armSwing*scale;elL={x:shL.x+f.x*(reach*.55+swing),y:1.05*scale+bob,z:shL.z+f.z*(reach*.55+swing)};haL={x:elL.x+f.x*(reach*.45+.06*scale),y:(opts.attack?1.16:.83)*scale+bob,z:elL.z+f.z*(reach*.45+.06*scale)};elR={x:shR.x+f.x*(reach*.55-swing),y:1.05*scale+bob,z:shR.z+f.z*(reach*.55-swing)};haR={x:elR.x+f.x*(reach*.45+.06*scale),y:(opts.attack?1.16:.83)*scale+bob,z:elR.z+f.z*(reach*.45+.06*scale)};}
  for(const [sh,el,ha] of [[shL,elL,haL],[shR,elR,haR]]){this.segment(sh.x,sh.y,sh.z,el.x,el.y,el.z,.085*scale,colors.arms||colors.head);this.segment(el.x,el.y,el.z,ha.x,ha.y,ha.z,.073*scale,colors.arms||colors.head);this.ellipsoid(ha.x,ha.y,ha.z,.085*scale,.075*scale,.085*scale,colors.head);}
  if(opts.armed){this.ellipsoid(chest.x-f.x*.10*scale,1.18*scale+bob,chest.z-f.z*.10*scale,.34*scale,.34*scale,.20*scale,'#17343a',a,0,MATERIAL_IDS.METAL);this.ellipsoid(chest.x-f.x*.25*scale,1.20*scale+bob,chest.z-f.z*.25*scale,.27*scale,.34*scale,.16*scale,'#32484b',a,0,MATERIAL_IDS.ORGANIC);this.carbine(chest.x+f.x*.24*scale,1.23*scale+bob,chest.z+f.z*.24*scale,a,scale,opts.gunColor||'#4a5552');}
  if(zombie){const ex=head.x+f.x*.19*scale,ez=head.z+f.z*.19*scale;this.ellipsoid(ex+r.x*.075*scale,head.y+.03*scale,ez+r.z*.075*scale,.025,.025,.025,'#ff715b',0,1.5+(opts.glow||0),MATERIAL_IDS.GLASS);this.ellipsoid(ex-r.x*.075*scale,head.y+.03*scale,ez-r.z*.075*scale,.025,.025,.025,'#ff715b',0,1.5+(opts.glow||0),MATERIAL_IDS.GLASS);this.ellipsoid(chest.x+f.x*.20*scale+r.x*.13*scale,1.20*scale+bob,chest.z+f.z*.20*scale+r.z*.13*scale,.10*scale,.13*scale,.04*scale,'#5f211f',a,.08,MATERIAL_IDS.WET);if(opts.hunter){this.ellipsoid(x,.04,z,.72*scale,.018,.48*scale,'#9d2e35',0,.16,MATERIAL_IDS.GLASS);}}
 }
 stationModel(s,game){
  if(s.kind?.startsWith('cold-')||['pump-overload','generator','trap','rail-switch'].includes(s.kind))return;
   if(['depot','breakwater','memorial'].includes(game.arena?.id)&&['clinic','bench','radio','cache'].includes(s.kind))return;
  const p=simToWorld(s.x,s.y),kind=s.kind||s.id||'',powered=!!game?.power;
   const color=s.powered&&!powered?'#66574b':'#83f2b1',glow=s.powered&&!powered?.04:.65;
   const focused=game?.interactionOffer?.id===s.id;
   if(focused)for(let i=0;i<12;i++){const a=i*Math.PI/6;this.ellipsoid(p.x+Math.cos(a)*.76,.028,p.z+Math.sin(a)*.76,.048,.017,.048,game.interactionOffer.enabled?'#e8cb84':'#986956',0,.30,MATERIAL_IDS.GLASS);}
  this.shadow(p.x,p.z,.6,.5);
  if(kind==='clinic'){this.box(p.x,.42,p.z,.86,.74,.64,'#d8d9d2',0,0,MATERIAL_IDS.METAL);this.box(p.x,.82,p.z,.56,.12,.5,color,0,glow*.4,MATERIAL_IDS.GLASS);this.box(p.x,.92,p.z,.12,.38,.05,'#d8f2e4');this.box(p.x,.92,p.z,.38,.12,.05,'#d8f2e4');}
  else if(kind==='bench'){for(const dx of [-.34,.34])this.box(p.x+dx,.3,p.z,.08,.6,.52,'#2d3838',0,0,MATERIAL_IDS.METAL);this.box(p.x,.66,p.z,.94,.16,.62,'#6a5d47',0,0,MATERIAL_IDS.CONCRETE);this.segment(p.x-.28,.82,p.z,p.x+.24,.82,p.z,.045,'#8cc1d8',.18,'cylinder',.045,MATERIAL_IDS.METAL);}
  else if(s.id==='radio'||kind==='radio'){this.box(p.x,.38,p.z,.58,.72,.48,'#273538',0,0,MATERIAL_IDS.METAL);this.segment(p.x,.62,p.z,p.x,1.35,p.z,.035,'#62dbe3',.28,'cylinder',.035,MATERIAL_IDS.METAL);this.ellipsoid(p.x,1.38,p.z,.08,.08,.08,'#62dbe3',0,.8,MATERIAL_IDS.GLASS);}
  else{this.box(p.x,.48,p.z,.7,.96,.7,'#243132',0,0,MATERIAL_IDS.METAL);this.box(p.x,.98,p.z,.58,.12,.58,'#c9c9a0',0,.35,MATERIAL_IDS.GLASS);}
 }
 prop(p){
  const c=p.color||'#66706a';
   if(p.kind==='fence'){const alongX=p.w>=p.d;this.box(p.x,.65,p.z,p.w||.08,1.3,p.d||.08,'#354242');if(alongX){for(const dx of [-(p.w||1)/2,(p.w||1)/2])this.box(p.x+dx,.72,p.z,.08,1.45,.08,'#66706a');}else{for(const dz of [-(p.d||1)/2,(p.d||1)/2])this.box(p.x,.72,p.z+dz,.08,1.45,.08,'#66706a');}}
   else if(p.kind==='entryGate'){
    const fx=Math.cos(p.heading),fz=Math.sin(p.heading),rx=-fz,rz=fx,beamRy=p.acrossX?0:Math.PI/2;
    const padX=p.x-fx*.62,padZ=p.z-fz*.62;
    this.box(padX,.014,padZ,p.acrossX?3.9:2.5,.026,p.acrossX?2.5:3.9,'#172326',beamRy,0,MATERIAL_IDS.ASPHALT);
    this.box(p.x-fx*.94,1.92,p.z-fz*.94,p.acrossX?3.75:1.55,.13,p.acrossX?1.55:3.75,'#263438',beamRy,0,MATERIAL_IDS.METAL);
    for(const side of [-1,1]){const x=p.x+rx*1.58,z=p.z+rz*1.58;this.box(x,.86,z,.20,1.72,.20,'#53615d',0,0,MATERIAL_IDS.METAL);this.ellipsoid(x,1.78,z,.13,.10,.13,'#ff9b61',0,1.15,MATERIAL_IDS.GLASS);}
    this.box(p.x,1.69,p.z,p.acrossX?3.36:.18,.18,p.acrossX?.18:3.36,'#69736a',beamRy,0,MATERIAL_IDS.METAL);
    for(const side of [-1,1])this.strip(p.x+rx*side*1.28+fx*.72,p.z+rz*side*1.28+fz*.72,1.55,.055,'#c49a53',-p.heading,.06,MATERIAL_IDS.MATTE);
    for(const n of [.36,.92]){const x=p.x+fx*n,z=p.z+fz*n;this.strip(x,z,.46,.14,'#d3b66e',-p.heading,.07,MATERIAL_IDS.MATTE);this.drawMesh('wedge',model(x+fx*.22,.022,z+fz*.22,.14,.012,.14,-p.heading),'#d3b66e',.07,MATERIAL_IDS.MATTE);}
   }
   else if(p.kind==='light'){this.segment(p.x,.03,p.z,p.x,p.h-.18,p.z,.055,'#475454');this.ellipsoid(p.x,p.h-.08,p.z,.32,.11,.18,c,0,1.15);this.ellipsoid(p.x,.018,p.z,1.25,.012,1.25,'#493d25',0,.04);}
  else if(p.kind==='container'){this.box(p.x,p.h/2,p.z,p.w,p.h,p.d,c,0,0,MATERIAL_IDS.METAL);for(let i=-2;i<=2;i++)this.box(p.x+i*p.w/5,p.h/2+.02,p.z+p.d/2+.015,.035,p.h*.82,.035,'#273335');}
  else if(p.kind==='pallet'){for(let y=.08;y<=p.h;y+=.16)this.box(p.x,y,p.z,p.w,.08,p.d,'#80684a');}
  else if(p.kind==='barrier'){this.box(p.x,p.h/2,p.z,p.w,p.h,p.d,'#ba9a65');this.box(p.x,p.h*.66,p.z,p.w*.82,.1,p.d*1.04,'#493f36');}
  else if(p.kind==='sign'){this.box(p.x,.75,p.z,.08,1.5,.08,'#5b605b');this.box(p.x,1.4,p.z,p.w,.45,.08,c,0,.15);}
  else if(p.kind==='crate'){this.box(p.x,p.h/2,p.z,p.w,p.h,p.d,c);this.box(p.x,p.h/2,p.z+p.d/2+.01,p.w*.82,.06,.03,'#d0bf91');}
  else if(p.kind==='grave'){this.box(p.x,p.h/2,p.z,p.w,p.h,p.d,c);this.box(p.x,p.h+.18,p.z,.42,.35,.14,c);}
  else if(p.kind==='pipe'){this.segment(p.x-p.w/2,p.h/2,p.z,p.x+p.w/2,p.h/2,p.z,Math.max(.08,p.d*.42),c);}
  else if(p.kind==='tank'){this.segment(p.x,.08,p.z,p.x,p.h-.08,p.z,p.w*.48,c,0,'cylinder',p.d*.48);this.ellipsoid(p.x,p.h-.02,p.z,p.w*.48,.22,p.d*.48,'#597376');}
  else if(p.kind==='rail'){this.box(p.x,.04,p.z,p.w,.08,p.d,c);}
  else if(p.kind==='signal'){this.box(p.x,p.h/2,p.z,.1,p.h,.1,'#4d514c');this.box(p.x,p.h-.25,p.z,.35,.48,.2,'#8d593b');this.box(p.x,p.h-.18,p.z+.11,.11,.11,.06,'#ff654a',0,1.1);}
  else if(p.kind==='tent'){this.box(p.x,p.h/2,p.z,p.w,p.h,p.d,c);this.box(p.x,p.h+.12,p.z,p.w*.72,.18,p.d*.72,'#777b58');}
  else if(p.kind==='truck'){this.box(p.x,p.h*.48,p.z,p.w*.62,p.h*.72,p.d,c);this.drawMesh('torso',model(p.x+p.w*.34,p.h*.55,p.z,p.w*.16,p.h*.34,p.d*.48,Math.PI/2),'#53666a');this.box(p.x+p.w*.39,p.h*.62,p.z+p.d*.48,p.w*.17,p.h*.22,.04,'#9bb3b7',0,.08);for(const dx of [-p.w*.22,p.w*.3])for(const dz of [-p.d*.5,p.d*.5])this.segment(p.x+dx,.27,p.z+dz-.12,p.x+dx,.27,p.z+dz+.12,.24,'#151a1b');}
  else if(p.kind==='forklift'){this.drawMesh('torso',model(p.x,.45,p.z,p.w*.45,.32,p.d*.48,Math.PI/2),c);this.segment(p.x-p.w*.25,.35,p.z,p.x-p.w*.25,1.55,p.z,.055,'#313b3b');this.segment(p.x-p.w*.38,.25,p.z,p.x-p.w*.78,.25,p.z,.045,'#313b3b');this.segment(p.x+p.w*.12,.94,p.z-p.d*.34,p.x+p.w*.12,.94,p.z+p.d*.34,.045,'#5f4d2f');for(const dz of [-p.d*.47,p.d*.47])this.segment(p.x+.15,.23,p.z+dz-.09,p.x+.15,.23,p.z+dz+.09,.19,'#171b1a');}
  else if(p.kind==='drum'){this.segment(p.x,.04,p.z,p.x,p.h-.04,p.z,p.w*.48,c,0,'cylinder',p.d*.48,MATERIAL_IDS.METAL);this.ellipsoid(p.x,p.h*.2,p.z,p.w*.53,.025,p.d*.53,'#342f2a');this.ellipsoid(p.x,p.h*.78,p.z,p.w*.53,.025,p.d*.53,'#342f2a');}
  else if(p.kind==='cone'){this.ellipsoid(p.x,.035,p.z,p.w*.72,.035,p.d*.72,'#3a332b');this.drawMesh('cone',model(p.x,p.h*.48,p.z,p.w*.28,p.h*.48,p.d*.28,0),c);this.ellipsoid(p.x,p.h*.55,p.z,p.w*.31,.025,p.d*.31,'#f3dfb0');}
  else if(p.kind==='dumpster'){this.box(p.x,p.h*.47,p.z,p.w,p.h*.82,p.d,c,0,0,MATERIAL_IDS.METAL);this.box(p.x,p.h*.91,p.z,p.w*1.02,.12,p.d*1.04,'#263836');this.box(p.x+p.w*.48,p.h*.36,p.z,.06,p.h*.48,p.d*.72,'#86908a');}
  else if(p.kind==='cableReel'){this.segment(p.x,p.h*.48,p.z-p.d*.36,p.x,p.h*.48,p.z+p.d*.36,.16,'#433a30');this.segment(p.x,p.h*.48,p.z-p.d*.42,p.x,p.h*.48,p.z-p.d*.30,p.w*.48,c);this.segment(p.x,p.h*.48,p.z+p.d*.30,p.x,p.h*.48,p.z+p.d*.42,p.w*.48,c);}
  else if(p.kind==='puddle'){this.box(p.x,.008,p.z,p.w,.012,p.d,c,0,.08,MATERIAL_IDS.WET);this.box(p.x+p.w*.18,.012,p.z-p.d*.12,p.w*.35,.01,p.d*.16,'#30505a',0,.12);}
  else if(p.kind==='worklight'){this.segment(p.x,.03,p.z,p.x,p.h-.18,p.z,.045,'#4d5552');this.ellipsoid(p.x,p.h-.06,p.z,.23,.11,.14,c,0,1.45);this.ellipsoid(p.x,.014,p.z,1.6,.012,1.2,'#5a492a',0,.055);}
  else if(p.kind==='door'){this.box(p.x,p.y||p.h/2,p.z,p.w,p.h,p.d,c);this.box(p.x,p.y||p.h/2,p.z+p.d*.55,p.w*.86,.07,.025,'#647073');}
  else if(p.kind==='window'){this.box(p.x,p.y||1.45,p.z,p.w,p.h,p.d,c,0,.3,MATERIAL_IDS.GLASS);this.box(p.x,p.y||1.45,p.z+p.d*.6,.05,p.h*1.05,.02,'#243035');}
  else if(p.kind==='roofVent'){this.box(p.x,p.y||2.45,p.z,p.w,p.h,p.d,c);this.box(p.x,(p.y||2.45)+p.h*.6,p.z,p.w*.72,.08,p.d*.72,'#5d6968');}
  else if(p.kind==='warningStripe'){this.box(p.x,p.y||.18,p.z,p.w,p.h,p.d,c,0,.08,MATERIAL_IDS.METAL);}
  else if(p.kind==='acUnit'){this.box(p.x,(p.y||2.5)+p.h/2,p.z,p.w,p.h,p.d,c,0,0,MATERIAL_IDS.METAL);for(const dz of [-p.d*.28,p.d*.28])this.box(p.x,(p.y||2.5)+p.h+.012,p.z+dz,p.w*.72,.018,.035,'#2d383a',0,0,MATERIAL_IDS.METAL);}
  else if(p.kind==='skylight'){this.box(p.x,(p.y||2.5)+p.h/2,p.z,p.w,p.h,p.d,c,0,.08,MATERIAL_IDS.GLASS);this.box(p.x,(p.y||2.5)+.0175,p.z,p.w*1.08,.035,p.d*1.08,'#2b383c',0,0,MATERIAL_IDS.METAL);}
  else if(p.kind==='duct'){this.segment(p.x,p.y||2.5,p.z,p.x,(p.y||2.5)+p.h,p.z,p.w*.45,c,0,'cylinder',p.d*.45,MATERIAL_IDS.METAL);this.ellipsoid(p.x,(p.y||2.5)+p.h,p.z,p.w*.53,.08,p.d*.53,'#77817e',0,0,MATERIAL_IDS.METAL);}
  else if(p.kind==='roofPipe'){this.segment(p.x,p.y||2.5,p.z,p.x,(p.y||2.5)+p.h,p.z,p.w*.45,c,0,'cylinder',p.d*.45,MATERIAL_IDS.METAL);this.segment(p.x,(p.y||2.5)+p.h,p.z,p.x+p.w*1.8,(p.y||2.5)+p.h,p.z,p.w*.38,c,0,'cylinder',p.d*.38,MATERIAL_IDS.METAL);}
  else if(p.kind==='crack'){const dx=Math.cos(p.ry||0)*p.w/2,dz=Math.sin(p.ry||0)*p.w/2;this.segment(p.x-dx,.018,p.z-dz,p.x+dx,.018,p.z+dz,p.d||.025,c,0,'cylinder',p.d||.025,MATERIAL_IDS.MATTE);}
  else if(p.kind==='oilStain'){this.ellipsoid(p.x,.012,p.z,p.w*.5,.012,p.d*.5,c,p.ry||0,.01,MATERIAL_IDS.WET);}
  else if(p.kind==='patch'){this.box(p.x,.009,p.z,p.w,.012,p.d,c,p.ry||0,0,MATERIAL_IDS.ASPHALT);}
  else if(p.kind==='drain'){this.box(p.x,.014,p.z,p.w,.025,p.d,c,0,0,MATERIAL_IDS.METAL);for(let i=-2;i<=2;i++)this.strip(p.x+i*p.w/5,p.z,p.d*.85,.018,'#0f1719',Math.PI/2,0,MATERIAL_IDS.METAL);}
  else if(p.kind==='roadArrow'){this.strip(p.x-Math.cos(p.ry||0)*.25,p.z-Math.sin(p.ry||0)*.25,p.w*.62,p.d*.28,c,p.ry||0,0,MATERIAL_IDS.MATTE);this.drawMesh('wedge',model(p.x+Math.cos(p.ry||0)*p.w*.27,.018,p.z+Math.sin(p.ry||0)*p.w*.27,p.d*.72,.012,p.d*.72,-(p.ry||0)),c,0,MATERIAL_IDS.MATTE);}
  else if(p.kind==='lightPool'){this.ellipsoid(p.x,.008,p.z,p.w*.5,.008,p.d*.5,c,p.ry||0,.055,MATERIAL_IDS.WET);}
  else if(p.kind==='hazardStripe'){for(let i=-3;i<=3;i++){const off=i*p.w/7,ca=Math.cos(p.ry||0),sa=Math.sin(p.ry||0);this.strip(p.x-ca*off,p.z-sa*off,p.d*.82,p.w/11,i%2?'#252726':c,(p.ry||0)+Math.PI/2,.02,MATERIAL_IDS.MATTE);}}
  else if(p.kind==='tireMark'){this.strip(p.x,p.z,p.w,p.d,c,p.ry||0,.0,MATERIAL_IDS.MATTE);}
  else if(p.kind==='steamVent'){const t=(typeof performance!=='undefined'?performance.now():0)*.001;this.segment(p.x,.02,p.z,p.x,.28,p.z,p.w*.22,'#4b5b5d',0,'cylinder',p.d*.22,MATERIAL_IDS.METAL);for(let i=0;i<3;i++){const ph=t*.65+i*1.7,y=.34+((t*.28+i*.27)%1)*.72,drift=Math.sin(ph)*.13;this.ellipsoid(p.x+drift,y,p.z+Math.cos(ph)*.09,.16+i*.035,.10+i*.03,.16+i*.035,'#718487',0,.025,MATERIAL_IDS.GLASS);}}
  else if(p.kind==='helipad'){this.box(p.x,.005,p.z,p.w,.012,p.d,'#46494d');this.strip(p.x,p.z,p.w*.7,.18,'#d7d9c8');this.strip(p.x,p.z,p.d*.7,.18,'#d7d9c8',Math.PI/2);}
 }
 updateColdSnow(game){
  if(game?.arena?.id!=='cold'){if(this.coldSnowLayer)this.coldSnowLayer.dispose();this.coldSnowLayer=null;this.coldSnowState=null;return;}
  let details=this.arenaDetailCache.get('cold');if(!details){details=arenaPolishPlan('cold',game.obstacles||[]);this.arenaDetailCache.set('cold',details);}
  if(!this.coldSnowState)this.coldSnowState=new ColdSnowState();
  this.coldSnowState.update(game,details,this.quality.level);
 }
 getPresentationMetrics(){return JSON.parse(JSON.stringify(this.metrics));}
 renderFallback(game){this.metrics=emptyPresentationMetrics();this.frameStart=typeof performance!=='undefined'?performance.now():0;this.resize();const c=this.ctx;if(!c||!game?.player)return;c.fillStyle='#091416';c.fillRect(0,0,this.canvas.width,this.canvas.height);const sx=this.canvas.width/1440,sy=this.canvas.height/1040;c.save();c.scale(sx,sy);c.fillStyle='#223238';c.fillRect(0,0,1440,1040);for(const o of game.obstacles||[]){c.fillStyle='#4d6260';c.fillRect(o.x,o.y,o.w,o.h);}for(const z of game.zombies||[]){if(z.dead)continue;c.fillStyle=z.kind==='brute'?'#8c715d':z.kind==='runner'?'#b07a52':'#819b84';c.beginPath();c.arc(z.x,z.y,z.r||14,0,Math.PI*2);c.fill();}c.fillStyle='#e6c678';c.beginPath();c.arc(game.player.x,game.player.y,16,0,Math.PI*2);c.fill();c.restore();this.metrics.visibleZombies=(game.zombies||[]).filter(z=>!z.dead).length;this.metrics.frameMs=Math.max(0,(typeof performance!=='undefined'?performance.now():0)-this.frameStart);}
 render(game,dt,visual={}){
   if(this.mode==='fallback'){this.renderFallback(game);return;}this.metrics=emptyPresentationMetrics();this.clearInstanceQueues();this.frameStart=typeof performance!=='undefined'?performance.now():0;this.resize();this.updateColdSnow(game);const gl=this.gl;gl.useProgram(this.p);const arenaId=game?.arena?.id||'depot',arenaLook=ARENA_LOOKS[arenaId],cinema=budgetCinematicEffects(cinematicArenaPlan(arenaId,game.time,game.railTrain,game.campAir,game.evac,game.depotSequence,this.coldSnowState),this.quality.effectsStride),portals=portalModelPlan(game.exits,game.time),fog=arenaLook?.fog||game?.arena?.theme?.[2]||'#142126',fc=hex(fog).map(v=>clamp(v+cinema.flash,0,1));gl.clearColor(fc[0]*.42,fc[1]*.46,fc[2]*.52,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(!game?.player){this.metrics.frameMs=Math.max(0,(typeof performance!=='undefined'?performance.now():0)-this.frameStart);return;}
  this.surfaceArena=arenaId;this.surfaceTrain=game.railTrain||null;
  const desired=depotOpeningCamera(arcadeCameraTarget(game.player,this.canvas.width/Math.max(1,this.canvas.height)),game.depotSequence),snap=!this.camPos,t=snap?1:1-Math.exp(-dt*8.5);if(!this.camPos){this.camPos={...desired.position};this.camTarget={...desired.target};}for(const k of ['x','y','z']){this.camPos[k]=lerp(this.camPos[k],desired.position[k],t);this.camTarget[k]=lerp(this.camTarget[k],desired.target[k],t);}const cam={position:{...this.camPos},target:{...this.camTarget}};
  if(visual.shake){cam.position.x+=(Math.random()-.5)*visual.shake*.025;cam.position.y+=(Math.random()-.5)*visual.shake*.018;}
  const isDepot=(game.arena?.id||'depot')==='depot';
  let arenaDetails=null;
  if(arenaLook){const id=game.arena.id;arenaDetails=this.arenaDetailCache.get(id);if(!arenaDetails){arenaDetails=arenaPolishPlan(id,game.obstacles||[]);this.arenaDetailCache.set(id,arenaDetails);}}
  if(isDepot&&!this.northDepotDetails)this.northDepotDetails=northDepotDetailPlan(game.obstacles||[],northDepotDecor(arenaDecor('depot')));
  const environment=arenaLightState(isDepot?this.northDepotDetails:arenaDetails,game.depotSequence?.sceneTime??game.time,game.power,simToWorld(game.player.x,game.player.y),game.depotSequence);if(isDepot)environment.enabled=2;else if(['memorial','pump','cold','rail','quarantine','evac'].includes(game.arena?.id))environment.enabled=game.arena?.id==='memorial'?4:3;if(game.arena?.id==='rail'){const signal=railSignalState(game.time,game.railTrain);if(signal.active){const x=signal.moving?clamp(game.railTrain.lead+7.2,-24,24):0;environment.positions.set([x,2.8,3.5,8.5],12);environment.colors.set(hex(signal.color).map(c=>c*(.40+.50*signal.pulse)),9);}}if(game.arena?.id==='evac')evacuationLightState(environment,game);coldSnapLights(environment,game);combatLightState(environment,game,this.playerMotion||{});
  const isDock=game.arena?.id==='breakwater',isMemorial=game.arena?.id==='memorial',isPump=game.arena?.id==='pump',isCold=game.arena?.id==='cold',isRail=game.arena?.id==='rail',isCamp=game.arena?.id==='quarantine',isEvac=game.arena?.id==='evac';
  if(isEvac&&!this.evacShadow)this.evacShadow=new DockShadowMap(gl,this,arenaDetails.parts,[38,86,22],[39,34]);
  if(isCamp&&!this.campShadow)this.campShadow=new DockShadowMap(gl,this,arenaDetails.parts,[-48,72,34],[40,32]);
  if(isRail&&!this.railShadow)this.railShadow=new DockShadowMap(gl,this,arenaDetails.parts,[38,86,22],[34,30]);
  if(isCold&&!this.coldShadow)this.coldShadow=new DockShadowMap(gl,this,arenaDetails.parts,[38,86,22],[34,30]);
  if(isPump&&!this.pumpShadow)this.pumpShadow=new DockShadowMap(gl,this,arenaDetails.parts,[38,86,22],[33,29]);
  if(isMemorial&&!this.memorialShadow)this.memorialShadow=new DockShadowMap(gl,this,arenaDetails.parts,[-42,80,-34],[33,31]);
  if(isDock&&!this.dockShadow)this.dockShadow=new DockShadowMap(gl,this,arenaDetails.parts);
  if(isDepot&&!this.depotShadow)this.depotShadow=new DockShadowMap(gl,this,[...this.northDepotDetails.parts,...this.northDepotDetails.shadowParts],[-36,68,24],[40,32]);
  gl.useProgram(this.p);this.dockTime=game.time;this.setDockUniforms(this.loc,isDock,isDepot,isMemorial,isPump,isCold,isRail,isCamp,isEvac);
  this.setEnvironmentUniforms(this.loc,environment);
   const proj=perspective(desired.fov,this.canvas.width/this.canvas.height,.08,140),view=lookAt(cam.position,cam.target);gl.uniformMatrix4fv(this.loc.proj,false,proj);gl.uniformMatrix4fv(this.loc.view,false,view);gl.uniform3f(this.loc.fog,fc[0],fc[1],fc[2]);gl.uniform3f(this.loc.cam,cam.position.x,cam.position.y,cam.position.z);const baseLight=isDepot?{key:[-.36,.68,.24],top:[.32,.40,.44],ground:[.12,.16,.17]}:{key:isMemorial?[-.42,.80,-.34]:isCamp?[-.48,.72,.34]:[.38,.86,.22],top:arenaLook?.top||[.24,.29,.31],ground:arenaLook?.ground||[.08,.10,.11]},light={key:baseLight.key,top:baseLight.top.map(v=>clamp(v*coldSnapLightGain(game)+cinema.flash*1.35,0,1)),ground:baseLight.ground.map(v=>clamp(v*coldSnapLightGain(game)+cinema.flash*.55,0,1))};gl.uniform3f(this.loc.keyDir,...light.key);gl.uniform3f(this.loc.ambientTop,...light.top);gl.uniform3f(this.loc.ambientGround,...light.ground);this.instanceFrame={proj,view,fog:fc,cam:cam.position,light,environment,isDock,isDepot,isMemorial,isPump,isCold,isRail,isCamp,isEvac};
  const theme=game.arena?.theme||['#304049','#40525b','#15232a','#d8c98e'];this.box(0,-.08,0,50.4,.16,36.4,arenaLook?.floor||theme[0],0,0,isDock?MATERIAL_IDS.CONCRETE:isDepot?MATERIAL_IDS.DEPOT_ASPHALT:MATERIAL_IDS.ASPHALT);
  // Road paint / lane hints make the spaces read as intentional industrial arenas without affecting collision.
  if(!arenaLook){for(let x=-20;x<=20;x+=5)this.strip(x,-14.8,2.6,.08,'#8d8a6a');for(let x=-20;x<=20;x+=5)this.strip(x,14.8,2.6,.08,'#8d8a6a');}
  if((game.arena?.id||'depot')==='depot'){for(const z of [-8.8,-5.8,-2.8,.2,3.2,6.2])this.strip(-19.9,z,3.5,.055,'#6f7362',Math.PI/2);for(const z of [-7.2,-3.6,0,3.6,7.2])this.strip(19.8,z,3.3,.055,'#6f7362',Math.PI/2);}
  const groundId=game.arena?.id||'depot';let gdetail=this.groundCache.get(groundId);if(!gdetail){gdetail=arenaLook?[]:groundDetailPlan(groundId).filter(p=>!isDepot||p.kind!=='oilStain');this.groundCache.set(groundId,gdetail);}for(const p of gdetail)this.prop(p);
  let atmosphere=this.atmosphereCache.get(groundId);if(!atmosphere){atmosphere=arenaLook?[]:depotAtmospherePlan(groundId).filter(p=>!isDepot||p.kind!=='lightPool');this.atmosphereCache.set(groundId,atmosphere);}for(const p of atmosphere)this.prop(p);
  if(!arenaLook)for(const o of game.obstacles||[]){const r=obstacleToWorld(o),large=r.w*r.d>8,h=buildingHeight(o);this.box(r.x,h/2,r.z,r.w,h,r.d,isDepot?(r.x<0?'#697574':'#797465'):theme[1],0,0,isDepot?MATERIAL_IDS.DEPOT_BRICK:MATERIAL_IDS.CONCRETE);if(large){this.box(r.x,h+.08,r.z,r.w*1.02,.16,r.d*1.02,'#273536',0,0,MATERIAL_IDS.METAL);this.strip(r.x,r.z+r.d/2+.02,r.w*.8,.05,theme[3],0,.09,MATERIAL_IDS.METAL);if(!isDepot)for(const p of buildingFacade(o))this.prop(p);for(const p of buildingTopDetailPlan(o))this.prop(p);}else this.box(r.x,h+.05,r.z,r.w*.96,.08,r.d*.96,'#5c6560',0,0,MATERIAL_IDS.METAL);}
   const id=game.arena?.id||'depot';let decor=this.decorCache.get(id);if(!decor){decor=isDepot?northDepotDecor(arenaDecor(id)):arenaLook?polishedArenaDecor(id,arenaDecor(id)):arenaDecor(id);this.decorCache.set(id,decor);}for(const p of decor)if(!isDepot||!DEPOT_DETAILED_PROPS.has(p.kind))this.prop(p);for(const p of arenaEntrancePlan())this.prop(p);
  if(isDepot){if(!this.northDepotDetails)this.northDepotDetails=northDepotDetailPlan(game.obstacles||[],decor);for(const part of this.northDepotDetails.parts)this.queueInstance(part.mesh,part.matrix,part.fixture===undefined?part.color:depotFixtureColor(part.color,game.depotSequence),part.fixture===undefined?part.glow:.06+.72*environment.levels[part.fixture],part.material);}
   if(arenaDetails)for(const part of arenaDetails.parts){if(isMemorial&&this.quality.level===0&&part.memorialDetail)continue;this.queueInstance(part.mesh,isCold?coldSnapPartMatrix(part,game):part.matrix,part.color,part.fixture===undefined?part.glow:.08+.65*environment.levels[part.fixture],part.material);}
   if(isCold){this.flushInstances();if(!this.coldSnowLayer)this.coldSnowLayer=new ColdSnowLayer(gl);this.coldSnowLayer.draw(this.coldSnowState,this.instanceFrame,this.coldShadow,this.metrics);gl.useProgram(this.p);}
   for(const part of cinema.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
   for(const part of portals.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
  for(const b of game.barrels||[]){if(isDepot||isDock)continue;const p=simToWorld(b.x,b.y);
   if(!arenaLook){this.box(p.x,.42,p.z,.52,.84,.52,b.spent?'#303433':'#a85d42',0,b.spent?0:.04);this.box(p.x,.75,p.z,.55,.06,.55,'#372f2a');}
   else{this.drawMesh('pickupCylinder',model(p.x,.42,p.z,.26,.42,.26),b.spent?'#303433':'#9e6143',0,MATERIAL_IDS.METAL);
    for(const y of [.13,.71])this.drawMesh('pickupCylinder',model(p.x,y,p.z,.269,.022,.269),'#394744',0,MATERIAL_IDS.METAL);
    this.drawMesh('pickupCylinder',model(p.x,.846,p.z,.237,.012,.237),b.spent?'#3f4943':'#a08d65',0,MATERIAL_IDS.METAL);
   }
  }
  for(const s of game.stations||[])if(s.kind!=='evac')this.stationModel(s,game);
  const coldEvent=coldSnapPlan(game,this.quality.level);for(const part of coldEvent.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
  const overload=pumpOverloadPlan(game);for(const part of overload.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
  const depotEvent=isDepot?depotSequencePlan(game,game.depotSequence,this.northDepotDetails):{parts:[],glows:[],ribbons:[]};
  for(const part of depotEvent.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
  const devices=arcadeDevicePlan(game);
  if(devices)for(const part of devices.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
  if(game.trap&&!devices){
   const trap={...game.trap,preview:game.interactionOffer?.kind==='trap'},active=trap.active>0,arming=trap.arming>0;
   const marks=activeTrapMarkerPlan(trap),color=active?'#72efff':arming?'#ffd17a':'#485d62';
   for(const m of marks)this.ellipsoid(m.x,.035,m.z,m.scale,.028,m.scale,color,0,active?m.glow:arming?.35:.03,MATERIAL_IDS.GLASS);
   if(active)for(let i=0;i<marks.length;i+=2){const a=marks[i],b=marks[(i+1)%marks.length],mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,y=.11+.08*Math.sin(game.time*31+i);this.segment(a.x,.08,a.z,mx,y,mz,.017,'#b8f9ff',1.2,'cylinder',.012,MATERIAL_IDS.GLASS);this.segment(mx,y,mz,b.x,.08,b.z,.017,'#7defff',1.0,'cylinder',.012,MATERIAL_IDS.GLASS);}
  }
  for(const w of game.warnings||[]){if(isMemorial&&w.graveId!==undefined)continue;const p=simToWorld(w.x,w.y);this.box(p.x,.55,p.z,.16,1.1,.16,'#ff755f',0,.9);this.box(p.x,.02,p.z,1.1,.02,1.1,'#a32e27',0,.2);}
  for(const w of game.antiCamp?.breachWarnings||[]){const p=simToWorld(w.x,w.y);this.box(p.x,.8,p.z,.12,1.6,.12,'#ff4f42',0,1.1);this.box(p.x,.02,p.z,1.4,.02,1.4,'#8d1f1b',0,.3);}
  const fairFX=fairVisualPlan(game,this.quality.level);for(const part of fairFX.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
   const graveFX=memorialGravePlan(game,this.quality.level);for(const part of graveFX.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
   const pickupGlows=devices?devices.glows:[],vehicleShadows=devices?devices.shadows:[];pickupGlows.push(...graveFX.glows,...coldEvent.glows,...fairFX.glows);pickupGlows.push(...cinema.glows,...portals.glows,...overload.glows,...depotEvent.glows);vehicleShadows.push(...cinema.shadows);if(environment.muzzleGlow)pickupGlows.push(environment.muzzleGlow);const drawPickup=q=>{const plan=liftRenderPlan(pickupIconPlan(q,game.time,0,this.quality.level>0),q.groundHeight||0);pickupGlows.push(...plan.glows);for(const part of plan.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);};
  for(const list of [game.pickups,game.arcadePickups,game.lootPickups])for(const q of list||[])drawPickup(q);
  const dronePlan=liftRenderPlan(companionModelPlan(['takeoff','complete'].includes(game.evac?.phase)?null:game.companion,game.time),game.companion?.groundHeight||0);pickupGlows.push(...dronePlan.glows);vehicleShadows.push(...dronePlan.shadows);
  for(const part of dronePlan.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
  if(game.respawnShield>0&&game.player){
   const p=simToWorld(game.player.x,game.player.y),ground=game.player.groundHeight||0,fade=Math.min(1,game.respawnShield/.45),pulse=.85+.12*Math.sin(game.time*9);
   pickupGlows.push({x:p.x,y:ground+.054,z:p.z,radius:.83,color:'#9aeaff',strength:fade*pulse,mode:-.065},{x:p.x,y:ground+.048,z:p.z,radius:.90,color:'#62cfff',strength:fade*.20,mode:0});
  }
  if(game.time+1e-6<this.lastGameTime){this.actorMotion.clear();this.playerMotion=null;this.reinforcementMotion=null;this.squadMotion?.clear();}this.lastGameTime=game.time;
     const seenZombieIds=new Set(),meshPlans=[];let nearestZombieDistance=Infinity,nearestZombieHeight=0;
   this.metrics.walkerSpriteReady=false;this.metrics.walkerSprites=0;this.metrics.walkerSpriteDrawCalls=0;
   for(const z of game.zombies||[]){
    if(z.coldShattered||z.dead&&game.time-z.deathTime>3)continue;
    const id=z.id||0;seenZombieIds.add(id);if(!z.dead)this.metrics.visibleZombies++;
    const prev=this.actorMotion.get(id),motion=updatePresentationMotion(prev,z,dt);this.actorMotion.set(id,motion);
    const pose=isCold?coldZombiePose(z,motion,dt,game.time):DeadwatchMesh.plan(z,motion,dt);if(isMemorial)memorialRisePose(z,pose);if(z.boss){const bossVisual=breakerVisualPlan(z,pose);for(const part of bossVisual.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);pickupGlows.push(...bossVisual.glows);}if(pose.alpha>0){meshPlans.push(pose);this.shadow(pose.shadow.x,pose.shadow.z,pose.shadow.sx,pose.shadow.sz,motion.speed,motion.displayAngle);}
    if(!z.dead){const d=Math.hypot(pose.shadow.x-cam.position.x,pose.silhouette.height*.5-cam.position.y,pose.shadow.z-cam.position.z);if(d<nearestZombieDistance){nearestZombieDistance=d;nearestZombieHeight=pose.silhouette.height;this.metrics.walkerMotion={id,state:pose.state,gaitPhase:pose.phase,renderer:'3D mesh',filteredSpeed:motion.filteredSpeed};}}
   }
for(const id of this.actorMotion.keys())if(!seenZombieIds.has(id))this.actorMotion.delete(id);
  const boarded=['takeoff','complete'].includes(game.evac?.phase),playerMeshes=[],ally=boarded?null:game.reinforcement;
  this.squadMotion=this.squadMotion||new Map();const seenSquad=new Set();
  for(const b of boarded?[]:[...(game.squad||[]),...(game.trainCrew||[])]){
   seenSquad.add(b.actorId);const previous=this.squadMotion.get(b.actorId),motion=playerPresentationMotion(previous,b,dt);this.squadMotion.set(b.actorId,motion);
   const p=simToWorld(b.x,b.y),view={player:b,arcade:b.arcade,time:game.time},vehicle=b.arcade?.vehicle;
   if(vehicle&&!b.down){
    const last=previous?.vehicleBodyAngle??b.aim,target=motion.speed>8?motion.angle:last;
    motion.vehicleBodyAngle=last+Math.atan2(Math.sin(target-last),Math.cos(target-last))*(1-Math.exp(-dt*8));
    motion.vehicleDetail=this.quality.level>0;const plan=powerupModelPlan(view,motion);
    for(const part of plan.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
    if(vehicle==='heli'){
     const a=plan.pose.weaponAngle,phase=((game.time*39+a)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
     pickupGlows.push({x:p.x-Math.cos(a)*.10,y:(b.groundHeight||0)+plan.pose.lift+.88,z:p.z-Math.sin(a)*.10,radius:2.53,color:'#b9c9bb',strength:.72,mode:-2-phase/(Math.PI*2)});
     vehicleShadows.push({x:p.x,y:(b.groundHeight||0)+.032,z:p.z,radius:2.15,color:'#071115',strength:.62,mode:0});
    }else this.shadow(p.x,p.z,plan.pose.shadow.sx,plan.pose.shadow.sz,motion.speed,-motion.vehicleBodyAngle);
   }else{
    const mesh=DeadwatchSurvivor.planPlayer(b,motion,dt,game.time),pose=mesh.pose;mesh.tint=1;mesh.hit=b.flash>0?.22:0;
    if(b.down){
     const a=clamp((game.time-b.downAt)/.4,0,1)*Math.PI/2,co=Math.cos(a),si=Math.sin(a),mat=mesh.matrix.slice();
     for(let k=0;k<3;k++){mesh.matrix[4+k]=mat[4+k]*co+mat[8+k]*si;mesh.matrix[8+k]=-mat[4+k]*si+mat[8+k]*co;}mesh.matrix[13]+=.42*si;
    }else if(b.arcade?.weapon==='ray'){
     motion.weaponDetail=this.quality.level>0;const plan=powerupModelPlan(view,motion);for(const part of plan.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
    }else this.carbine(pose.gunOrigin.x,pose.gunOrigin.y,pose.gunOrigin.z,pose.weaponAngle,pose.weaponScale,'#4a5552');
    playerMeshes.push(mesh);this.shadow(p.x,p.z,b.down?.8:pose.shadow.sx,b.down?.55:pose.shadow.sz,motion.speed,b.aim);
   }
   if(b.trainCrew)continue;
   const drone=liftRenderPlan(companionModelPlan(b.drone,game.time),b.drone?.groundHeight||0);pickupGlows.push(...drone.glows);vehicleShadows.push(...drone.shadows);for(const part of drone.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
   pickupGlows.push({x:p.x,y:(b.groundHeight||0)+.06,z:p.z,radius:vehicle?1.25:.64,color:b.down?'#ed9173':'#77dbeb',strength:b.down?.50:.22,mode:-.085});
   const y=(b.groundHeight||0)+(b.down?.70:vehicle==='heli'?4.05:2.66),hp=clamp(b.hp/b.maxHp,0,1);this.box(p.x,y,p.z,.82,.045,.035,'#132628');
   if(hp>0)this.box(p.x-.40*(1-hp),y+.002,p.z+.006,.80*hp,.038,.035,hp<.35?'#f19c78':'#7de0dd',0,.35,MATERIAL_IDS.GLASS);
  }
  for(const id of this.squadMotion.keys())if(!seenSquad.has(id))this.squadMotion.delete(id);

  const animalPlan=animalModelPlan(ally,game.time,game.animalProjectiles||[]);
  for(const part of animalPlan.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
  pickupGlows.push(...animalPlan.glows);vehicleShadows.push(...animalPlan.shadows);
  this.reinforcementMotion=null;
  const pp=simToWorld(game.player.x,game.player.y),pa=game.player.aim||0,ps=Math.hypot(game.player.vx||0,game.player.vy||0),pstate=playerPresentationMotion(this.playerMotion,game.player,dt);this.playerMotion=pstate;const pmove=pstate.speed>8?pstate.angle:pa;
     if(boarded){this.lastPlayerPose=null;}else if(game.arcade?.vehicle){
    const previous=this.vehicleBodyAngle??pa,target=pstate.speed>8?pstate.angle:previous;
    this.vehicleBodyAngle=previous+Math.atan2(Math.sin(target-previous),Math.cos(target-previous))*(1-Math.exp(-dt*8));
    pstate.vehicleBodyAngle=this.vehicleBodyAngle;
    pstate.vehicleDetail=this.quality.level>0;const plan=powerupModelPlan(game,pstate);this.lastPlayerPose=plan.pose;
    if(plan.pose.powerupKind==='heli'){
     const angle=plan.pose.weaponAngle,phase=((game.time*39+angle)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
     pickupGlows.push({x:pp.x-Math.cos(angle)*.10,y:(game.player.groundHeight||0)+plan.pose.lift+.88,z:pp.z-Math.sin(angle)*.10,radius:2.53,color:'#b9c9bb',strength:.72,mode:-2-phase/(Math.PI*2)});
    }
    if(plan.pose.powerupKind==='heli')vehicleShadows.push({x:pp.x,y:(game.player.groundHeight||0)+.032,z:pp.z,radius:2.15,color:'#071115',strength:.62,mode:0});
    else this.shadow(pp.x,pp.z,plan.pose.shadow.sx,plan.pose.shadow.sz,ps,-this.vehicleBodyAngle);
    for(const part of plan.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);
   }else{
    this.vehicleBodyAngle=null;
    const mesh=DeadwatchSurvivor.planPlayer(game.player,pstate,dt,game.time),pplan=mesh.pose;
    if(isCold)this.coldSnowState.feet(mesh,pstate.speed,game.player.groundHeight||0);
    mesh.tint=visual.playerTint||0;pplan.powerupKind=game.arcade?.weapon==='ray'?'ray':null;this.lastPlayerPose=pplan;
    this.metrics.playerMotion={state:mesh.state,phase:mesh.phase,backpedal:mesh.backpedal};
    this.shadow(pplan.shadow.x,pplan.shadow.z,pplan.shadow.sx,pplan.shadow.sz,ps,pa);
    if(pplan.powerupKind==='ray'){pstate.weaponDetail=this.quality.level>0;const plan=powerupModelPlan(game,pstate);for(const part of plan.parts)this.queueInstance(part.mesh,part.matrix,part.color,part.glow,part.material);}
    else this.carbine(pplan.gunOrigin.x,pplan.gunOrigin.y,pplan.gunOrigin.z,pplan.weaponAngle,pplan.weaponScale,'#4a5552');
    playerMeshes.push(mesh);
   }
  this.meshPlayer.draw(playerMeshes,this.instanceFrame,this.metrics);gl.useProgram(this.p);
  this.flushInstances();
  this.meshZombies.draw(meshPlans,this.instanceFrame,this.metrics);gl.useProgram(this.p);
  const fxPlan=buildEffectInstancePlan(visual.pool?.active?.()||[]);for(const list of [fxPlan.emissive,fxPlan.glows,fxPlan.rings])for(const f of list)if(Number.isFinite(f.x)&&Number.isFinite(f.z))f.y=(f.y||0)+this.surfaceAtWorld(f.x,f.z);this.metrics.effectInstances=fxPlan.opaque.length+fxPlan.emissive.length+fxPlan.rings.length;
  for(const e of fxPlan.emissive){if(e.kind==='tracerGlow'||e.kind==='tracerCore')this.segment(e.a.x,e.a.y??e.y??1.18,e.a.z,e.b.x,e.b.y??e.y??1.18,e.b.z,e.radius,e.color,e.glow||1.5,'cylinder',e.radius*.72,MATERIAL_IDS.GLASS);else this.ellipsoid(e.x,e.y,e.z,e.scale,e.scale*.72,e.scale,e.color,0,e.glow||1,MATERIAL_IDS.GLASS);}
  pickupGlows.push(...fxPlan.glows);
  for(const r of fxPlan.rings)pickupGlows.push({x:r.x,y:(r.y||0)+.062,z:r.z,radius:r.radius,color:r.color,strength:Math.min(1.6,r.glow)*(r.alpha??1),mode:(r.soft?-1:0)-Math.min(.95,r.width/Math.max(.01,r.radius))});
  for(const s of visual.splats||[]){const p=simToWorld(s.x,s.y),age=1-s.life/s.max,sz=(s.size||.7)*(1+age*.18);this.ellipsoid(p.x,this.surfaceAtWorld(p.x,p.z)+.014,p.z,sz*.78,.010,sz*.52,s.color||'#5f1d1b',s.angle||0,.05,MATERIAL_IDS.WET);}
  for(const tr of visual.tracers||[]){const a=simToWorld(tr.a.x,tr.a.y),b=simToWorld(tr.b.x,tr.b.y),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),ang=Math.atan2(dz,dx),mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;this.segment(a.x,1.22,a.z,b.x,1.22,b.z,.015,tr.color||'#ffe1a0',1.35,'cylinder',.009,MATERIAL_IDS.GLASS);}
  for(const f of visual.flashes||[]){const p=simToWorld(f.x,f.y);this.ellipsoid(p.x,1.25,p.z,.19,.19,.19,f.color||'#fff0a0',0,1.6,MATERIAL_IDS.GLASS);this.ellipsoid(p.x,.02,p.z,.38,.012,.30,'#6c4d24',0,.10,MATERIAL_IDS.WET);}for(const b of visual.blasts||[]){const p=simToWorld(b.x,b.y),s=(1-b.life/b.max)*2.4+.3;this.ellipsoid(p.x,.12,p.z,s*.5,.08,s*.5,b.color||'#ffb35f',0,1.4,MATERIAL_IDS.GLASS);}
  const arenaLights=(isDepot?this.northDepotDetails.lights:(arenaDetails?.lights||[])).map(l=>l.fixture===undefined?l:{...l,strength:l.strength*environment.levels[l.fixture]});if(vehicleShadows.length)this.pickupGlow.draw(vehicleShadows,this.instanceFrame,this.metrics,true);this.pickupGlow.draw([...arenaLights,...pickupGlows],this.instanceFrame,this.metrics);gl.useProgram(this.p);
   if(cinema.haze.length)this.pickupGlow.draw(isMemorial&&this.quality.level===0?cinema.haze.filter((_,i)=>i%2===0):cinema.haze,this.instanceFrame,this.metrics,true);
   if(graveFX.haze.length)this.pickupGlow.draw(graveFX.haze,this.instanceFrame,this.metrics,true);
   if(coldEvent.haze.length)this.pickupGlow.draw(coldEvent.haze,this.instanceFrame,this.metrics,true);
   this.bulletRibbons.draw(cinema.ribbons,this.instanceFrame,this.canvas.height,this.metrics,true);
   const ribbons=bulletRibbonPlan(visual.pool?.active?.()||[],game.arcade?.vehicle?null:this.lastPlayerPose);if(devices?.ribbons?.length)ribbons.push(...devices.ribbons);ribbons.push(...depotEvent.ribbons);this.bulletRibbons.draw(ribbons,this.instanceFrame,this.canvas.height,this.metrics);gl.useProgram(this.p);
  this.metrics.effectInstances+=(visual.flashes?.length||0)+(visual.blasts?.length||0)+(visual.tracers?.length||0)+(visual.splats?.length||0);this.metrics.frameMs=Math.max(0,(typeof performance!=='undefined'?performance.now():0)-this.frameStart);this.metrics.cameraPosition={...cam.position};this.metrics.cameraTarget={...cam.target};this.metrics.nearestZombieScreenSize=projectedScreenFraction(nearestZombieHeight,nearestZombieDistance,desired.fov);
 }
}
return{fairVisualPlan,coldSnapView,coldSnapLightGain,coldSnapLights,coldSnapPartMatrix,coldSnapPlan,coldZombiePose,coldGroundDeposit,coldGroundHeight,createColdGroundMesh,ColdSnowState,ColdSnowLayer,COLD_SNOW_RULES,COLD_SNOW_VS,COLD_SNOW_FS,paintColdFootprints,coldAtmospherePlan,memorialParkPlan,memorialGravePlan,memorialRisePose,memorialAtmospherePlan,createDepotCapMesh,createDepotChamferMesh,advanceDashTrail,RenderQuality,budgetCinematicEffects,evacuationTrafficPose,evacuationActivityPlan,evacuationAircraftPose,evacuationLightState,portalModelPlan,cinematicArenaPlan,breakerVisualPlan,companionModelPlan,arcadeDevicePlan,breakwaterSurroundings,DockShadowMap,arenaLightState,ARENA_LOOKS,arenaPolishPlan,polishedArenaDecor,createArenaGableMesh,northDepotDecor,northDepotDetailPlan,pickupAppearance,pickupAuraPlan,PickupGlowRenderer,pickupIconPlan,createPickupMeshes,powerupPose,powerupModelPlan,bulletVisuals,bulletRibbonPlan,BulletRibbonRenderer,BULLET_STYLE,BULLET_VS,BULLET_FS,WalkerSpriteRenderer,walkerSpritePlan,walkerLifeProfile,walkerRunAmount,selectWalkerDirection,isSpriteWalker,WALKER_ATLAS,WALKER_SPRITE_VS,WALKER_SPRITE_FS,Renderer3D,simToWorld,activeTrapMarkerPlan,obstacleToWorld,shoulderCamera,overheadCamera,arcadeCameraTarget,emptyPresentationMetrics,buildRenderSnapshot,animalModelPlan,interpolatePlayer,playerPresentationMotion,combatLightState,groupInstances,zombieArcadeProfile,buildZombiePosePlan,buildPlayerPosePlan,carbineDetailPlan,createEffectPool,ARCADE_FX_MAX_LIFE,arcadeTracerSegment,projectedScreenFraction,buildEffectInstancePlan,pickupPresentation,angleDelta,updatePresentationMotion,buildingFacade,buildingTopDetailPlan,groundDetailPlan,zombieVisualProfile,actorReadabilityScale,actorAccessoryPlan,depotAtmospherePlan,actorPose,groundedGait,distanceGroundedGait,visualMotionState,arenaDecor,createSphereMesh,createCylinderMesh,createConeMesh,createWedgeMesh,actorMeshPlan,carbineMeshPlan,ROUND_PROP_KINDS,MATERIAL_IDS,SCALE,DepotSequence,depotSlipStrength,depotOpeningCamera,depotSequencePlan};
});

