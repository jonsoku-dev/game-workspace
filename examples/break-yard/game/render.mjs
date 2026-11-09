const W = 960, H = 540, FLOOR = 405;
const C = { ink:'#172b31', dark:'#233d40', paper:'#eadbb9', steel:'#9baeb0', light:'#e2e7d4', orange:'#f5a543', hot:'#ffe9a4', rust:'#b95e3c', mint:'#a6e3cb' };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Break Yard needs a 2D canvas');
  const image = name => { const img = new Image(); img.src = new URL(`./assets/${name}.webp`, import.meta.url).href; return img; };
  const stage = image('foundry'), assembly = image('machine'), blade = image('blade');
  const line = (a,b,color,width=2) => { ctx.beginPath(); ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke(); };
  const poly = (points,fill,stroke=C.ink,width=2) => { ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();} };
  const circle = (x,y,r,fill,stroke=null,width=2) => {ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}};
  const bolt = (x,y,r=3) => {circle(x,y,r,C.ink);line({x:x-r/2,y},{x:x+r/2,y},C.steel,1);};
  const label = (text,x,y,size=12,color=C.paper,align='center') => {ctx.fillStyle=color;ctx.font=`800 ${size}px system-ui, sans-serif`;ctx.textAlign=align;ctx.fillText(text,x,y);};
  function background() {
    ctx.fillStyle='#263c3d';ctx.fillRect(0,0,W,H);
    if(stage.complete && stage.naturalWidth) {ctx.globalAlpha=.76;ctx.drawImage(stage,0,0,W,H);ctx.globalAlpha=1;}
    // The action band quiets the painted set so steel silhouettes and small contact marks survive.
    const wash=ctx.createLinearGradient(0,155,0,FLOOR);wash.addColorStop(0,'rgba(29,48,49,.38)');wash.addColorStop(1,'rgba(42,60,56,.72)');ctx.fillStyle=wash;ctx.fillRect(0,155,W,FLOOR-155);
    for(const x of [36,922]){ctx.fillStyle='#1c3032';ctx.fillRect(x,82,12,323);ctx.fillStyle='#a38353';ctx.fillRect(x+3,86,3,315);}
    ctx.fillStyle='#132a2d';ctx.fillRect(0,83,W,19);ctx.fillStyle='#ab9468';ctx.fillRect(0,83,W,3);
    for(let x=10;x<W;x+=44)poly([[x,88],[x+17,88],[x+8,97],[x-9,97]],'#3d5150',null);
    ctx.strokeStyle='rgba(167,185,160,.12)';ctx.lineWidth=1;
    for(let x=90;x<W;x+=130){ctx.beginPath();ctx.moveTo(x,170);ctx.lineTo(x,389);ctx.stroke();circle(x,181,3,'#64776b');}
    ctx.fillStyle='#152b2c';ctx.fillRect(0,FLOOR,W,H-FLOOR);ctx.fillStyle='#a29065';ctx.fillRect(0,FLOOR,W,5);ctx.fillStyle='#4a5546';ctx.fillRect(0,FLOOR+5,W,19);
    for(let x=-20;x<W;x+=48)poly([[x,FLOOR+7],[x+20,FLOOR+7],[x+7,FLOOR+21],[x-13,FLOOR+21]],'#bd9955',null);
    for(let x=0;x<W;x+=96){line({x,y:452},{x:x+68,y:452},'#31413a',2);bolt(x+79,442,2);}
    ctx.fillStyle='#101f23';ctx.fillRect(0,499,W,41);line({x:0,y:499},{x:W,y:499},'#50614e',3);
    label('BREAK / YARD',40,476,12,'#7b8b71','left');label('03 — SALVAGE LINE',920,476,10,'#7b8b71','right');
  }
  function chain(a,b,tension) {
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),n=Math.max(2,Math.ceil(len/11));
    const angle=Math.atan2(dy,dx), sag=(1-tension)*Math.min(25,len*.12);
    for(let i=0;i<=n;i++){const t=i/n,x=a.x+dx*t,y=a.y+dy*t+Math.sin(t*Math.PI)*sag;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.ellipse(0,0,6,i%2?2:3.5,0,0,Math.PI*2);ctx.strokeStyle=C.ink;ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle=tension>.7?C.hot:C.steel;ctx.lineWidth=1.7;ctx.stroke();ctx.restore();}
    circle(b.x,b.y,7,null,C.ink,5);circle(b.x,b.y,7,null,C.orange,2);
  }
  function arm(g) {
    const t=g.tool, p=t.pivot||g.pivot||{x:480,y:105}, e=t.elbow||g.elbow||{x:(p.x+t.x)/2-80,y:(p.y+t.y)/2};
    ctx.lineCap='round';
    for(const [a,b] of [[p,e],[e,t]]){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
      const metal=ctx.createLinearGradient(a.x+nx*13,a.y+ny*13,a.x-nx*13,a.y-ny*13);metal.addColorStop(0,'#293f42');metal.addColorStop(.22,'#86958b');metal.addColorStop(.36,'#d2d3b7');metal.addColorStop(.5,'#73877c');metal.addColorStop(1,'#354f50');
      poly([[a.x+nx*16,a.y+ny*16],[b.x+nx*10,b.y+ny*10],[b.x-nx*10,b.y-ny*10],[a.x-nx*16,a.y-ny*16]],metal,C.ink,3);
      line({x:a.x+nx*10,y:a.y+ny*10},{x:b.x+nx*7,y:b.y+ny*7},'#d5d3b3',1);line({x:a.x-nx*9,y:a.y-ny*9},{x:b.x-nx*6,y:b.y-ny*6},'#1b3033',3);}
    line({x:p.x+10,y:p.y+6},{x:e.x+9,y:e.y-10},C.ink,7);line({x:e.x+9,y:e.y-10},{x:t.x+9,y:t.y-23},'#ceae67',5);
    [p,e].forEach(p=>{circle(p.x,p.y,18,C.dark,C.ink,4);circle(p.x,p.y,10,'#b69c64',C.ink,2);bolt(p.x,p.y,4);});
    ctx.save();ctx.translate(t.x,t.y);ctx.rotate(-.18);poly([[-31,-48],[19,-48],[35,-19],[23,6],[-26,6],[-40,-14]],'#e9b45d',C.ink,4);poly([[-30,-39],[12,-39],[22,-23],[-32,-23]],'#596c66');for(let x=-22;x<17;x+=8)line({x,y:-37},{x:x+8,y:-25},C.ink,3);ctx.restore();
    const r=t.radius||32;ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle||0);
    if(!(blade.complete&&blade.naturalWidth)){const teeth=[];for(let i=0;i<30;i++){const a=i*Math.PI*2/30;teeth.push([Math.cos(a)*(r-5),Math.sin(a)*(r-5)],[Math.cos(a+.045)*r,Math.sin(a+.045)*r],[Math.cos(a+.12)*(r-1),Math.sin(a+.12)*(r-1)],[Math.cos(a+.17)*(r-7),Math.sin(a+.17)*(r-7)]);}
    poly(teeth,'#d3d8c0',null);circle(0,0,r-7,'#657d7a',C.ink,2);for(let i=0;i<6;i++){const a=i*Math.PI/3;line({x:Math.cos(a)*12,y:Math.sin(a)*12},{x:Math.cos(a+.4)*(r-10),y:Math.sin(a+.4)*(r-10)},'#b5c4b4',3);}circle(0,0,12,C.orange,C.ink,3);bolt(0,0,4);}if(blade.complete&&blade.naturalWidth){ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();ctx.drawImage(blade,-r,-r,r*2,r*2);ctx.restore();}ctx.restore();
  }
  function machine(m,g) {
    const x=m.x,y=m.y??FLOOR,h=m.height||120,armor=m.armor??1,facing=m.facing||1;
    ctx.save();ctx.translate(x-facing*34,y);
    ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(0,0,88,7,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.scale(facing,1);
    const painted=assembly.complete&&assembly.naturalWidth;
    const paint=()=>ctx.drawImage(assembly,0,44,500,246,-90,-106,180,106);
    // Tracks and rear mechanisms stay whole; only the two painted central shell halves peel.
    if(painted){ctx.save();ctx.beginPath();ctx.rect(-92,-109,184,111);ctx.rect(-42,-94,84,65);ctx.clip('evenodd');paint();ctx.restore();}
    else poly([[-85,-20],[-77,-90],[48,-102],[90,-57],[78,-9],[-69,-3]],'#607369',C.ink,2);
    circle(0,-62,29,'#162b2e','#6e8175',2);
    if(m.core!==0){circle(0,-62,20,'#a0844d','#263f41',3);circle(0,-62,13+(g.rhythm?.flash>0?g.rhythm.flash*2:0),'#e6c47d','#f2e4b5',1);line({x:-8,y:-62},{x:8,y:-62},'#fff1c7',2);}
    else {poly([[-19,-81],[-7,-72],[-12,-63],[-2,-56],[-13,-43],[-26,-53]],'#596a5e','#192d30',2);poly([[18,-84],[27,-68],[13,-57],[20,-43],[3,-51],[11,-65]],'#8e8b66','#192d30',2);}
    const peel=(1-armor)*25;
    for(const side of [-1,1]){ctx.save();ctx.translate(side*peel,-peel*.32);ctx.rotate(side*(1-armor)*.23);ctx.beginPath();ctx.rect(side<0?-42:0,-94,42,65);ctx.clip();if(painted)paint();else ctx.fillRect(-42,-94,84,65);ctx.restore();}
    ctx.restore();
    // The hook eye follows the simulation anchor, independent of the painted silhouette.
    const eye=m.eye||{x,y:y-h+18},ex=eye.x-(x-facing*34),ey=eye.y-y;
    line({x:ex,y:ey+14},{x:ex,y:ey+2},'#63796e',10);circle(ex,ey,7,'#253c3c','#c3b88e',2);circle(ex,ey,3,'#0b2025');
    if(m.stagger>0){ctx.globalAlpha=m.stagger*.35;circle(ex,ey,11,null,C.paper,1);}
    ctx.restore();
  }
  function joint(g) {
    if(!g.seam?.exposed)return;
    const x=g.seam.x,y=g.seam.y,armor=g.machines?.[0]?.armor??1;
    if(g.machines?.every(m=>m.core===0)){
      const shock=g.shockwave;if(shock){const age=Math.min(1,shock.age/shock.life);ctx.save();ctx.globalAlpha=1-age;ctx.translate(shock.x,shock.y);ctx.scale(1, .35);circle(0,0,22+age*74,null,C.paper,2);ctx.restore();}return;
    }
    poly([[x-37,y-25],[x+37,y-25],[x+37,y+27],[x-37,y+27]],C.dark,C.ink,3);
    for(const side of [-1,1])line({x:x+side*25,y:y-18},{x:x+side*28,y:y+21},'#b7b39a',5);
    circle(x,y,22,C.ink,C.steel,3);circle(x,y,15+(g.rhythm?.flash>0?g.rhythm.flash*2:0),C.orange,C.paper,2);
    poly([[x,y-12],[x+8,y],[x,y+12],[x-8,y]],C.paper,C.ink,2);
    for(let i=0;i<(g.coreHits||0);i++)line({x:x-10+i*7,y:y-12},{x:x-5+i*7,y:y+12},C.ink,2);
    const gap=(1-armor)*30;
    for(const side of [-1,1]){ctx.save();ctx.translate(x+side*(2+gap),y);ctx.rotate(side*(1-armor)*.18);if(assembly.complete&&assembly.naturalWidth){ctx.scale(side,1);ctx.drawImage(assembly,360,65,115,180,0,-29,24,58);}else poly([[0,-29],[side*24,-25],[side*24,29],[0,24]],'#6b7d70',C.ink,2);ctx.restore();}
    if(g.guardClosed){poly([[x-27,y-31],[x+27,y-31],[x+27,y+32],[x-27,y+32]],'#66736b',C.ink,3);for(let yy=y-22;yy<y+30;yy+=12)line({x:x-19,y:yy},{x:x+19,y:yy+8},C.paper,4);}
  }
  function particles(list,front,fixedFX=false) {
    for(const p of list||[]){if((p.type==='spark')!==front)continue;ctx.save();const alpha=Math.max(0,Math.min(1,p.life/(p.maxLife||p.life||1)));ctx.globalAlpha=alpha;
      if(fixedFX && p.origin && p.fixedOrigin)ctx.translate(p.fixedOrigin.x-p.origin.x,p.fixedOrigin.y-p.origin.y);
      if(p.type==='spark'){const speed=Math.hypot(p.vx||0,p.vy||0)||1;line({x:p.x,y:p.y},{x:p.x-(p.vx||0)/speed*(p.size||2)*4,y:p.y-(p.vy||0)/speed*(p.size||2)*4},p.material==='guard'?'#9dddeb':C.orange,(p.size||2)+2);line({x:p.x,y:p.y},{x:p.x-(p.vx||0)/speed*(p.size||2)*3,y:p.y-(p.vy||0)/speed*(p.size||2)*3},C.hot,1.5);}
      else if(p.type==='smoke'){circle(p.x,p.y,p.size||5,'#a0ac92');}
      else {ctx.translate(p.x,p.y);ctx.rotate(p.angle||0);const s=p.size||4;poly([[-s,-s*.4],[s*.5,-s],[s,s*.6],[-s*.4,s]],p.material==='ceramic'?C.light:'#c99c61',C.ink,1);line({x:-s,y:-s*.4},{x:s*.5,y:-s},C.paper,1);}
      ctx.restore();}
  }
  function debris(list){for(const p of list||[]){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle||0);ctx.beginPath();ctx.moveTo(-17,-14);ctx.lineTo(10,-20);ctx.lineTo(24,-3);ctx.lineTo(14,16);ctx.lineTo(-16,10);ctx.closePath();ctx.clip();if(assembly.complete&&assembly.naturalWidth)ctx.drawImage(assembly,330,65,145,130,-20,-22,46,44);else poly([[-17,-14],[10,-20],[24,-3],[14,16],[-16,10]],'#8d8b67',C.ink,2);ctx.restore();}}
  function cuts(g){if(g.machines?.every(m=>m.core===0))return;for(const c of g.cuts||[]){ctx.save();ctx.translate(c.target==='seam'?g.seam.x+(c.localX||0):c.x,c.target==='seam'?g.seam.y+(c.localY||0):c.y);ctx.rotate(c.angle||0);line({x:-(c.length||12)/2,y:0},{x:(c.length||12)/2,y:0},C.ink,5);line({x:-(c.length||12)/2,y:1},{x:(c.length||12)/2,y:1},'#edbf72',1.5);ctx.restore();}}
  function rhythm(g,lowMotion){
    for(const p of g.rhythm?.pulses||[]){const age=p.age||0,life=p.life||.6,progress=Math.min(1,age/life);ctx.save();ctx.globalAlpha=(1-progress)*.85;circle(p.x??g.seam.x,p.y??g.seam.y,28+(lowMotion?0:progress*65),null,C.paper,2);ctx.restore();
      if(p.type==='pulse')for(const m of g.machines||[]){const eye=m.eye||{x:m.x,y:303};const t=lowMotion?1:Math.min(1,progress*1.6);const q={x:eye.x+(g.tool.x-eye.x)*t,y:eye.y+(g.tool.y-eye.y)*t};circle(q.x,q.y,3,C.paper,C.ink,1);}
    }
    if(!g.seam?.exposed||g.machines?.every(m=>m.core===0))return;
    const x=g.seam.x,y=g.seam.y;
    for(const side of [-1,1]){poly([[x+side*43,y-5],[x+side*34,y],[x+side*43,y+5]],C.paper,null);}
    const hits=g.phase==='core'?g.coreHits:g.pulses,needed=g.phase==='core'?(g.rhythm?.needed||1):3;for(let i=0;i<needed;i++)poly([[x-15+i*15,y+53],[x-10+i*15,y+58],[x-15+i*15,y+63],[x-20+i*15,y+58]],i<(hits||0)?C.paper:C.dark,C.paper,1);
    if(['pulse','core'].includes(g.phase)){
      const progress=g.rhythm?.progress||0;line({x:x-34,y:y-49},{x:x+34,y:y-49},C.ink,7);line({x:x+19,y:y-49},{x:x+34,y:y-49},C.paper,4);
      poly([[x-34+progress*68,y-56],[x-29+progress*68,y-62],[x-39+progress*68,y-62]],C.paper,C.ink,1);
      if(g.rhythm?.inWindow){poly([[x-39,y-45],[x-32,y-49],[x-39,y-53]],C.paper,null);poly([[x+39,y-45],[x+32,y-49],[x+39,y-53]],C.paper,null);}
    }
  }
  function render(game,dt=0,lowMotion=false){
    if(!game?.tool)return;
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);ctx.lineJoin='round';ctx.lineCap='round';
    background();ctx.save();
    if(!lowMotion&&game.shake){const tick=Math.floor((game.time||game.elapsed||0)*90);ctx.translate(Math.sin(tick*2.7)*game.shake*4,Math.cos(tick*1.9)*game.shake*2);}
    particles(game.particles,false);debris(game.debris);
    const anchorPoint=m=>m.eye||{x:m.x,y:(m.y??FLOOR)-(m.height||120)+18};
    for(const id of game.chain?.anchors||[]){const m=game.machines?.find(m=>m.id===id);if(m)chain(game.tool,anchorPoint(m),game.chain.tension||0);}
    for(const m of game.machines||[])machine(m,game);joint(game);arm(game);
    // Only the biting rim passes behind the live plate; the wheel face stays readable.
    if(game.contact?.contactPatch){const p=game.contact.contactPatch.point;ctx.save();ctx.beginPath();ctx.rect(p.x-2,p.y-29,8,58);ctx.clip();for(const m of game.machines||[])machine(m,game);joint(game);ctx.restore();}
    for(const id of game.chain?.anchors||[]){const m=game.machines?.find(m=>m.id===id);if(m){const p=anchorPoint(m);circle(p.x,p.y,8,null,C.orange,3);}}
    cuts(game);
    if(game.seam?.exposed&&['grind','pulse','core'].includes(game.phase)){const target=game.seam.x-29;ctx.save();ctx.globalAlpha=.55;line({x:target,y:game.tool.y-43},{x:target,y:game.tool.y-36},C.paper,1);poly([[target-4,game.tool.y-47],[target,game.tool.y-43],[target+4,game.tool.y-47]],C.paper,null);ctx.restore();}
    const c=game.contact;if(c?.grinding&&c.point){circle(c.point.x,c.point.y,3,C.hot);const n=c.normal||{x:1,y:0};line({x:c.point.x-n.y*5,y:c.point.y+n.x*5},{x:c.point.x+n.y*5,y:c.point.y-n.x*5},C.paper,2);}particles(game.particles,true,game.fixedFX);
    rhythm(game,lowMotion);ctx.restore();
    // Foreground rails frame the arena without covering the contact band.
    for(const x of [17,943]){ctx.fillStyle='#101f23';ctx.fillRect(x-7,374,14,126);bolt(x,389,4);}
  }
  return {render};
}
