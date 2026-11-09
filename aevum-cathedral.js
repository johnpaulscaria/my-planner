/* Aevum Cathedral — rebuilt immersive 3D scene.
   Architecture is assembled from curved, bevelled and lathed meshes (not box-only placeholders).
   Three.js is loaded as ES modules so GLTFLoader can be added without globals. */
(() => {
  'use strict';
  const THREE_CDN = 'https://esm.sh/three@0.160.0';
  let THREE, active = false, raf = 0, renderer, scene, camera, clock, player, yaw = 0, pitch = .16;
  let keys = {}, doors = [], flames = [], interactives = [], pointer = false, last = 0;
  const $ = (s, r=document) => r.querySelector(s);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const mat = (color, roughness=.8, metalness=0, extra={}) => new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
  const stone = mat('#b8aa91',.92), paleStone = mat('#d8c9ad',.84), shadowStone=mat('#655a4b',.95), marble=mat('#d8d0c1',.28), darkMarble=mat('#4d4841',.32), wood=mat('#3c2116',.48), oak=mat('#69452b',.55), gold=mat('#b38c4e',.28,.78), iron=mat('#282521',.42,.72);
  function mesh(g,m,p,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function box(p,w,h,d,m,x,y,z){return mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);}
  function sphere(p,r,m,x,y,z, sx=1,sy=1,sz=1){const o=mesh(new THREE.SphereGeometry(r,32,24),m,p,x,y,z);o.scale.set(sx,sy,sz);return o;}
  function cylinder(p,rt,rb,h,m,x,y,z,n=32){return mesh(new THREE.CylinderGeometry(rt,rb,h,n,1),m,p,x,y,z);}
  function lathe(p,points,m,x,y,z){return mesh(new THREE.LatheGeometry(points.map(v=>new THREE.Vector2(v[0],v[1])),48),m,p,x,y,z);}
  function archCurve(p,x,z,rx,ry,y0,m,tube=.16){
    const pts=[]; for(let i=0;i<=48;i++){const a=Math.PI*i/48;pts.push(new THREE.Vector3(x+Math.cos(a)*rx,y0+Math.sin(a)*ry,z));}
    const curve=new THREE.CatmullRomCurve3(pts);return mesh(new THREE.TubeGeometry(curve,96,tube,12,false),m,p);
  }
  function makeGlassTexture(hue){
    const c=document.createElement('canvas');c.width=256;c.height=512;const x=c.getContext('2d');
    const grad=x.createLinearGradient(0,0,256,512);grad.addColorStop(0,'#182e50');grad.addColorStop(.5,hue);grad.addColorStop(1,'#5d2d36');x.fillStyle=grad;x.fillRect(0,0,256,512);
    for(let i=0;i<90;i++){x.fillStyle=['#d9b66d','#6e9a9b','#a84c45','#d7d0b0'][i%4];x.globalAlpha=.35;x.beginPath();x.arc((i*73)%256,(i*137)%512,5+(i%4)*4,0,Math.PI*2);x.fill();}
    x.globalAlpha=1;x.strokeStyle='#c5a56d';x.lineWidth=8;x.strokeRect(8,8,240,496);x.lineWidth=3;x.beginPath();x.moveTo(128,8);x.lineTo(128,504);x.moveTo(8,256);x.lineTo(248,256);x.stroke();
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  function makeStoneTexture(){
    const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');x.fillStyle='#b8aa91';x.fillRect(0,0,512,512);
    for(let i=0;i<16000;i++){const v=Math.random();x.fillStyle=v>.5?'rgba(255,245,220,.12)':'rgba(42,32,22,.09)';x.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*3,1+Math.random()*3);}
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,4);return t;
  }
  const stoneTexture=makeStoneTexture();stone.map=stoneTexture;stone.needsUpdate=true;
  function column(p,x,z,h=10){
    cylinder(p,.48,.62,h,stone,x,h/2,z,48);cylinder(p,.68,.68,.22,shadowStone,x,.12,z,48);
    cylinder(p,.7,.7,.22,paleStone,x,h-.12,z,48);cylinder(p,.58,.72,.36,paleStone,x,h-.38,z,48);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const f=mesh(new THREE.BoxGeometry(.12,.48,.12),gold,p,x+Math.cos(a)*.63,h-.42,z+Math.sin(a)*.63);f.rotation.y=-a;}
    for(let y=1.3;y<h-1;y+=1.8)cylinder(p,.49,.49,.035,shadowStone,x,y,z,48);
  }
  function lancet(p,x,z,y=5.4,w=1.6,h=3.9,texture){
    const frame=mat('#796747',.4,.45), glass=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
    box(p,.12,h,w+.22,frame,x,y,z);
    const panel=mesh(new THREE.PlaneGeometry(w,h),glass,p,x,y,z-.075);
    // pointed Gothic head
    archCurve(p,x,z-.09,w/2,h*.35,y+h*.16,frame,.075);
    box(p,.08,h,.08,gold,x-w/2,y,z-.16);box(p,.08,h,.08,gold,x+w/2,y,z-.16);
    box(p,w,.08,.08,gold,x,y-h/2,z-.16);box(p,w,.08,.08,gold,x,y,z-.16);
    return panel;
  }
  function statue(p,x,z,kind='mary',scale=1){
    const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);p.add(g);
    const robe=mat(kind==='mary'?'#253b68':kind==='joseph'?'#725039':'#8b2730',.88), mantle=mat(kind==='mary'?'#192d54':'#473329',.9), skin=mat('#c99b79',.82), hair=mat('#49352b',.9);
    cylinder(g,.72,.88,.28,darkMarble,0,.14,0,40);
    // flowing robe as a tapered lathed silhouette
    lathe(g,[[.25,.25],[.48,.42],[.66,1.05],[.55,1.75],[.35,2.25],[.25,2.4],[0,2.42]],robe,0,0,0);
    sphere(g,.27,skin,0,2.7,0,.84,1.08,.8);sphere(g,.29,hair,0,2.87,-.035,.9,.6,.9);
    // mantle folds and shoulders
    const cape=mesh(new THREE.ConeGeometry(.72,1.75,32,1,true),mantle,g,0,1.58,-.12);cape.rotation.x=.08;
    cylinder(g,.07,.1,.12,gold,0,3.05,0,24);
    if(kind==='mary'){const halo=new THREE.TorusGeometry(.48,.035,12,64);const h=mesh(halo,gold,g,0,3.22,-.06);h.rotation.x=.18;}
    if(kind==='joseph'){cylinder(g,.035,.045,1.55,wood,.72,1.45,.05,12);sphere(g,.22,mat('#f0d9bb'),.72,2.3,.05);}
    // hands held in prayer
    const armL=mesh(new THREE.CapsuleGeometry(.12,.82,6,12),robe,g,-.43,2.0,0);armL.rotation.z=-.48;
    const armR=mesh(new THREE.CapsuleGeometry(.12,.82,6,12),robe,g,.43,2.0,0);armR.rotation.z=.48;
    sphere(g,.13,skin,0,1.83,.23,.85,1,.7);
    return g;
  }
  function candle(p,x,y,z){
    cylinder(p,.055,.07,.45,mat('#eee0c4',.55),x,y,z,20);
    cylinder(p,.018,.018,.09,iron,x,y-.25,z,12);
    const flameMat=new THREE.MeshBasicMaterial({color:'#ffb34d',transparent:true,opacity:.9});
    const f=mesh(new THREE.SphereGeometry(.075,16,12),flameMat,p,x,y+.28,z);f.scale.set(.62,1.8,.62);
    const light=new THREE.PointLight('#ff9b42',1.3,4,2);light.position.set(x,y+.38,z);p.add(light);
    flames.push({f,light,phase:Math.random()*10});
  }
  function pew(p,x,z){
    const g=new THREE.Group();g.position.set(x,0,z);p.add(g);
    box(g,3.55,.16,.48,oak,0,1.0,0);box(g,3.55,.16,.38,wood,0,1.62,-.42);
    box(g,3.55,.1,.12,gold,0,1.12,.18);
    for(const dx of [-1.62,1.62]){box(g,.18,.94,.2,oak,dx,.49,0);box(g,.18,.84,.2,oak,dx,1.23,-.42);sphere(g,.12,gold,dx,.9,.1);}
    for(let i=0;i<3;i++)box(g,.08,.4,.05,wood,-1+i,1.22,-.42);
  }
  function label(text,x,y,z){
    const el=document.createElement('div');el.className='ac-world-label';el.textContent=text;$('#aevum-cathedral').appendChild(el);return {el,pos:new THREE.Vector3(x,y,z)};
  }
  function addInteractive(id,name,x,z){
    interactives.push({id,name,pos:new THREE.Vector3(x,0,z),label:label(name,x,2.5,z)});
  }
  function buildChurch(){
    scene=new THREE.Scene();scene.background=new THREE.Color('#11151a');scene.fog=new THREE.FogExp2('#11151a',.009);
    scene.add(new THREE.HemisphereLight('#dce7f2','#3a2c20',1.15));
    const sun=new THREE.DirectionalLight('#f2dfbf',2.1);sun.position.set(-12,20,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;scene.add(sun);
    const nave=new THREE.PointLight('#f7dfb6',1.7,42,1.5);nave.position.set(0,8,-1);scene.add(nave);
    // exterior forecourt and cathedral floor
    box(scene,100,.4,100,mat('#34332e',.95),0,-.35,5);
    const floorMat=mat('#8b8172',.3);box(scene,22,.35,34,floorMat,0,.05,-2);
    for(let x=-10;x<=10;x+=2)for(let z=-17;z<=13;z+=2){const tile=box(scene,1.96,.025,1.96,(Math.abs(x/2+z/2)%2?marble:darkMarble),x,.24,z);tile.receiveShadow=true;}
    // nave side walls and apse
    box(scene,.7,12,34,stone,-11,6,-2);box(scene,.7,12,34,stone,11,6,-2);box(scene,22,12,.8,stone,0,6,-19);
    // outer façade and entrance
    box(scene,7.5,11,1.0,stone,-7.25,5.5,14.8);box(scene,7.5,11,1.0,stone,7.25,5.5,14.8);box(scene,7,3.2,1.0,stone,0,9.4,14.8);
    // central portal piers and archivolts
    for(const x of [-3.5,3.5]){box(scene,.9,8,1.1,paleStone,x,4,14.0);cylinder(scene,.55,.55,.25,gold,x,7.7,13.9,32);}
    for(let i=0;i<4;i++)archCurve(scene,0,13.35,3.0-i*.28,4.0-i*.28,.4+i*.12,paleStone,.13);
    // door leaves on hinges
    for(const side of [-1,1]){
      const pivot=new THREE.Group();pivot.position.set(side*3.0,.3,13.55);scene.add(pivot);
      const leaf=box(pivot,3,6.5,.34,wood,side*1.5,3.25,0);
      for(let y=.8;y<6;y+=1.25){box(pivot,2.7,.09,.42,oak,side*1.5,y,.02);box(pivot,.09,1.0,.42,oak,side*1.5,y+.5,.02);}
      for(const y of [1.1,3.2,5.4]){const hinge=cylinder(pivot,.06,.06,.35,iron,side*2.86,y,.24,16);hinge.rotation.z=Math.PI/2;}
      const ring=mesh(new THREE.TorusGeometry(.13,.025,8,24),gold,pivot,side*2.55,3.1,.24);ring.rotation.x=Math.PI/2;
      doors.push({pivot,side,open:false});
    }
    // Gothic clerestory and nave bays
    for(let z=-14;z<=10;z+=6){
      for(const x of [-9.6,9.6]){column(scene,x,z,10.5);lancet(scene,x*1.105,z,6.1,1.75,4.4,makeGlassTexture(x<0?'#8b393d':'#315f75'));}
      archCurve(scene,0,z,9.6,4.3,7.8,paleStone,.22);
      archCurve(scene,0,z,9.2,4.0,7.85,gold,.055);
      // transverse rib springers and bosses
      for(const x of [-9.2,9.2]){const rib=mesh(new THREE.CylinderGeometry(.16,.16,9.5,16),paleStone,scene,x,5,z);rib.rotation.z=Math.PI/2;}
      sphere(scene,.22,gold,0,11.7,z);
    }
    // roof vaults and apse semi-dome approximation via curved shell
    const vault=mesh(new THREE.SphereGeometry(12,48,32,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#817866',roughness:.9,side:THREE.BackSide}),scene,0,0,-2);vault.scale.set(1,.92,1.55);vault.position.y=10.4;
    const apse=mesh(new THREE.SphereGeometry(7,48,32,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#8b7d67',roughness:.9,side:THREE.BackSide}),scene,0,3,-18.2);apse.scale.set(1,.9,.5);
    // side altar niches and stained glass
    for(const x of [-9.8,9.8])for(const z of [-10,0,8]){
      box(scene,.18,4.7,2.2,shadowStone,x*1.04,4.8,z);archCurve(scene,x*1.04,z-1.08,1.1,1.0,6.2,paleStone,.09);
    }
    // sanctuary, altar, tabernacle and crucifix
    box(scene,12,.55,7,mat('#a99a81',.65),0,.65,-15.8);
    for(const x of [-4.7,4.7])box(scene,.25,.55,.25,gold,x,.85,-15.8);
    box(scene,7,.65,2.1,marble,0,1.2,-15.5);box(scene,7,.1,2.15,gold,0,1.57,-15.5);
    box(scene,1.5,1.25,.85,gold,0,2.35,-16.25);box(scene,1.35,.1,.76,mat('#d8bd7c',.25,.5),0,3.03,-16.25);
    // tabernacle door motif
    const tabCross=box(scene,.12,.62,.05,mat('#f5e6c6',.2,.5),0,2.48,-15.79);box(scene,.42,.12,.05,mat('#f5e6c6',.2,.5),0,2.6,-15.79);
    box(scene,.14,2.5,.14,gold,0,4.0,-16.1);box(scene,.9,.14,.14,gold,0,4.65,-16.1);
    // altar candles
    for(const x of [-2.6,-1.8,1.8,2.6])candle(scene,x,2.0,-14.55);
    // crucifix cross and corpus silhouette
    box(scene,.18,3.4,.2,wood,0,6.0,-17.3);box(scene,1.65,.18,.2,wood,0,6.55,-17.3);
    const corpus=mat('#c7ad91',.82);sphere(scene,.19,corpus,0,7.25,-17.16,.8,1.2,.65);
    const arms=box(scene,1.25,.12,.12,corpus,0,7.1,-17.15);arms.rotation.z=.12;
    // pew rows with centre aisle
    for(let z=9;z>=-9;z-=3.2){pew(scene,-5.7,z);pew(scene,5.7,z);}
    // Our Lady chapel, statue and devotional details
    statue(scene,-8.0,-1.8,'mary',1.05);box(scene,2.5,.25,2.2,marble,-8,.35,-1.8);
    archCurve(scene,-8,-1.8,1.8,3.4,.7,gold,.09);
    for(let i=0;i<5;i++){candle(scene,-9.1+i*.5,.8,-3.45);}
    box(scene,1.2,.12,.8,oak,-6.0,.65,-2.8);box(scene,1.0,.05,.65,mat('#542b22'),-6,.76,-2.8);
    addInteractive('rosary','Rosary book',-6,-2.8);
    // side saint chapels
    statue(scene,8.2,-8.2,'joseph',.95);statue(scene,8.2,4.2,'sacred',.95);
    for(const x of [-8.2,8.2])for(const z of [-8.2,4.2]){box(scene,2.3,.22,1.8,marble,x,.38,z);candle(scene,x-.65,.85,z-1);candle(scene,x+.65,.85,z-1);}
    addInteractive('bible','Bible lectern',-7,7);
    // carved lectern and open book
    const lect= new THREE.Group();lect.position.set(-7,0,7);scene.add(lect);box(lect,.95,1.25,.8,oak,0,.85,0);box(lect,1.35,.12,1.05,wood,0,1.55,0);
    const book=box(lect,.9,.08,.7,mat('#e6d9bd',.9),0,1.68,-.02);book.rotation.x=-.18;
    box(lect,.05,.04,.72,gold,0,1.73,-.02);
    // journal writing desk
    box(scene,2.2,.16,1.1,oak,7,.95,9);box(scene,.16,.9,.16,wood,6.1,.45,9);box(scene,.16,.9,.16,wood,7.9,.45,9);
    box(scene,.72,.07,.5,mat('#d9c9a7'),7,1.08,9);addInteractive('journal','Prayer journal',7,9);
    addInteractive('mass','Sit in the pews',5.7,5.8);addInteractive('prayer','Pray before the altar',0,-12);
    // votive candle rack
    for(let i=0;i<12;i++){const x=-4.4+(i%6)*.55,z=4.8+Math.floor(i/6)*.55;candle(scene,x,.7,z);}
    // exterior approach, steps and garden lanterns
    for(let i=0;i<5;i++)box(scene,12,.22,.65,mat('#817766'),0,-.1-i*.2,15.8+i*.6);
    for(const x of [-7,7]){cylinder(scene,.13,.17,2,iron,x,1,19,16);candle(scene,x,2.1,19);}
    // player avatar
    player=new THREE.Group();scene.add(player);player.position.set(0,0,24);
    cylinder(player,.22,.24,.12,iron,0,.08,0,20);
    const coat=mat('#343b40',.85), skin=mat('#bd9478',.82);
    const body=mesh(new THREE.CapsuleGeometry(.28,.85,6,12),coat,player,0,1.12,0);
    sphere(player,.22,skin,0,1.88,0,.9,1.12,.9);
    sphere(player,.23,mat('#302820'),0,2.02,-.02,.95,.55,.9);
    for(const x of [-.15,.15]){const leg=mesh(new THREE.CapsuleGeometry(.11,.62,4,10),coat,player,x,.48,0);leg.userData.base=x;}
    // soft ambient fill from stained glass
    for(const x of [-10,10]){const l=new THREE.PointLight(x<0?'#8aa9dc':'#d68c72',.85,20,2);l.position.set(x*.8,6,-2);scene.add(l);}
    addInteractive('confession','Confessional',9.2,-1.8);
    // low-key visual dust motes
    const dustGeo=new THREE.BufferGeometry(),arr=new Float32Array(450);for(let i=0;i<arr.length;i++)arr[i]=(Math.random()-.5)*24;dustGeo.setAttribute('position',new THREE.BufferAttribute(arr,3));
    const dust=mesh(dustGeo,new THREE.PointsMaterial({color:'#e5d6b8',size:.025,transparent:true,opacity:.32}),scene);dust.name='dust';
  }
  function addStyles(){
    if($('#aevum-cathedral-style'))return;const s=document.createElement('style');s.id='aevum-cathedral-style';
    s.textContent=`
      #aevum-cathedral{position:fixed;inset:0;z-index:30000;background:#0b0c0e;color:#eee4d0;overflow:hidden;font-family:Georgia,serif}
      #aevum-cathedral canvas{width:100%;height:100%;display:block;touch-action:none}
      .ac-top{position:absolute;top:20px;left:25px;letter-spacing:.24em;font:11px Arial;color:#d7bd8b;text-shadow:0 2px 8px #000;pointer-events:none}
      .ac-top strong{display:block;font:26px Georgia;letter-spacing:.08em;color:#f3e5ca}
      .ac-controls{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);font:10px Arial;letter-spacing:.14em;color:#e6d6bb;background:#0b0a09b8;border:1px solid #b99b663f;padding:10px 16px;border-radius:5px;white-space:nowrap}
      .ac-exit{position:absolute;right:22px;top:20px;background:#17140fdd;color:#ead9b8;border:1px solid #b89a655e;padding:11px 16px;letter-spacing:.12em;font:10px Arial}
      .ac-prompt{position:absolute;left:50%;bottom:76px;transform:translateX(-50%);background:#17140fdd;border:1px solid #c9aa70;padding:12px 18px;display:none;text-align:center;min-width:210px}
      .ac-prompt b{display:block;font:16px Georgia;color:#f2dfb9}.ac-prompt small{font:9px Arial;letter-spacing:.2em;color:#c3a979}
      .ac-world-label{position:absolute;transform:translate(-50%,-100%);font:10px Arial;letter-spacing:.12em;color:#f4e7cd;text-shadow:0 1px 6px #000;pointer-events:none;white-space:nowrap}
      .ac-panel{position:absolute;inset:0;background:#070706b8;display:grid;place-items:center;padding:20px}
      .ac-paper{max-width:720px;width:100%;max-height:85vh;overflow:auto;background:#e9dfca;color:#30261a;padding:38px 46px;box-shadow:0 30px 100px #000;border:1px solid #b99c6b}
      .ac-paper h2{font:32px Georgia;text-align:center;margin:10px 0 4px}.ac-paper .sub{text-align:center;font-style:italic;color:#816947;margin:0 0 25px}
      .ac-paper p{font:17px/1.75 Georgia}.ac-paper textarea{width:100%;min-height:160px;padding:12px;background:#f4ecd9;color:#30261a;border:1px solid #bda77f;font:16px Georgia}
      .ac-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}.ac-actions button{padding:10px 16px;background:#382b1d;color:#f5e8d0;border:1px solid #a88b5e}
      .ac-mobile{position:absolute;bottom:78px;left:16px;display:none;grid-template-columns:repeat(3,42px);gap:4px}.ac-mobile button{height:40px;background:#17140fdd;color:#ead9b8;border:1px solid #a88b5e}
      @media(max-width:700px){.ac-controls{font-size:8px;bottom:10px}.ac-mobile{display:grid}.ac-paper{padding:24px 20px}.ac-paper p{font-size:15px}}
    `;document.head.appendChild(s);
  }
  function ui(){
    const root=document.createElement('div');root.id='aevum-cathedral';root.innerHTML='<div class="ac-top"><strong>AEVUM</strong>A QUIET PLACE TO RETURN</div><button class="ac-exit">← RETURN TO KAIROS</button><div class="ac-prompt"><b></b><small>PRESS E TO INTERACT</small></div><div class="ac-controls">W A S D · WALK &nbsp; MOUSE · LOOK &nbsp; E · INTERACT &nbsp; ESC · CLOSE</div><div class="ac-mobile"><span></span><button data-k="KeyW">↑</button><span></span><button data-k="KeyA">←</button><button data-k="KeyS">↓</button><button data-k="KeyD">→</button></div>';
    document.body.appendChild(root);root.querySelector('.ac-exit').onclick=exit;
    root.addEventListener('pointerdown',e=>{if(e.target.tagName==='CANVAS'&&innerWidth>700&&renderer.domElement.requestPointerLock)renderer.domElement.requestPointerLock();});
    root.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b){keys[b.dataset.k]=true;setTimeout(()=>keys[b.dataset.k]=false,170);}});
  }
  function loadThree(){
    if(window.__aevumModulePromise)return window.__aevumModulePromise;
    window.__aevumModulePromise=Promise.all([import(THREE_CDN)]).then(([T])=>{window.__AevumTHREE=T;return T;});
    return window.__aevumModulePromise;
  }
  function nearest(){
    let best=null,d=3.1;for(const o of interactives){const n=Math.hypot(player.position.x-o.pos.x,player.position.z-o.pos.z);if(n<d){best=o;d=n;}}
    if(player.position.z>12&&Math.abs(player.position.x)<4.4)return {id:'door',name:'Open the cathedral doors'};
    return best;
  }
  function openDoors(){
    doors.forEach((d)=>{d.open=true;}); 
  }
  function panel(id){
    const content={
      rosary:['The Holy Rosary','Today’s mysteries','Begin with the Sign of the Cross, the Apostles’ Creed, one Our Father, three Hail Marys and the Glory Be. Then pray five decades: announce each mystery, pray one Our Father, ten Hail Marys and the Glory Be. Conclude with the Hail Holy Queen.'],
      bible:['Daily Scripture','At the lectern','Open the Daily Bible Reading section in Kairos for the current Catholic readings and your sequential chapter plan.'],
      mass:['A moment in the pews','Be still','Take a quiet moment for reflection. This space is a personal devotional aid, not a simulation of the sacrament.'],
      prayer:['Personal prayer','Before the altar','Bring your intentions before God. Sit quietly, reflect, and pray.'],
      journal:['Prayer journal','A private reflection','Write a thought, gratitude or prayer intention for today.'],
      confession:['Examination of conscience','A quiet place','Prepare for the Sacrament of Reconciliation. This space is for reflection; it does not replace confession with a priest.']
    }[id]||['Aevum','A quiet moment','Take a moment to pause.'];
    const root=$('#aevum-cathedral'),p=document.createElement('div');p.className='ac-panel';
    p.innerHTML='<div class="ac-paper"><div style="text-align:center;font:10px Arial;letter-spacing:.2em;color:#94794e">AEVUM · '+new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})+'</div><h2>'+content[0]+'</h2><p class="sub">'+content[1]+'</p><p>'+content[2]+'</p>'+(id==='journal'?'<textarea id="ac-note" placeholder="Write your reflection…">'+(localStorage.getItem('aevum.spiritual.notes.v1')||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</textarea>':'')+'<div class="ac-actions"><button data-save>Save / complete</button><button data-close>Return to cathedral</button></div></div>';
    root.appendChild(p);p.addEventListener('click',e=>{if(e.target===p||e.target.closest('[data-close]'))p.remove();if(e.target.closest('[data-save]')){if(id==='journal')localStorage.setItem('aevum.spiritual.notes.v1',$('#ac-note',p).value);const st=JSON.parse(localStorage.getItem('aevum.spiritual.progress.v1')||'{}');st.date=new Date().toISOString().slice(0,10);st.done=st.done||{};st.done[id]=true;localStorage.setItem('aevum.spiritual.progress.v1',JSON.stringify(st));p.remove();}});
  }
  function interact(){if(player.position.z>12&&Math.abs(player.position.x)<4.4){openDoors();return;}const n=nearest();if(n){if(n.id==='door')openDoors();else panel(n.id);}}
  function resize(){if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
  function animate(){
    if(!active)return;raf=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),now=performance.now()*.001;
    const forward=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(forward.z,0,-forward.x),move=new THREE.Vector3();
    if(keys.KeyW||keys.ArrowUp)move.add(forward);if(keys.KeyS||keys.ArrowDown)move.sub(forward);if(keys.KeyA||keys.ArrowLeft)move.sub(right);if(keys.KeyD||keys.ArrowRight)move.add(right);
    if(move.lengthSq()){move.normalize().multiplyScalar(3.1*dt);player.position.add(move);player.rotation.y=Math.atan2(move.x,move.z);}
    player.position.x=clamp(player.position.x,-9.4,9.4);player.position.z=clamp(player.position.z,-25,25);
    doors.forEach(d=>{const target=d.open?(d.side<0?.98:-.98):0;d.pivot.rotation.y=THREE.MathUtils.damp(d.pivot.rotation.y,target,3.2,dt);});
    flames.forEach((f)=>{const v=.88+Math.sin(now*11+f.phase)*.13+Math.sin(now*19+f.phase)*.06;f.f.scale.y=1.65*v;f.f.material.opacity=.78+Math.sin(now*14+f.phase)*.12;f.light.intensity=1.0+Math.sin(now*12+f.phase)*.35;});
    // First-person cathedral view: camera sits at the visitor's eye line.
    // Yaw and pitch control the view; movement remains relative to the direction faced.
    const eye=new THREE.Vector3(player.position.x,player.position.y+1.72,player.position.z);
    const look=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
    camera.position.copy(eye);
    camera.lookAt(eye.clone().add(look));
    const n=nearest(),prompt=$('.ac-prompt');if(prompt){prompt.style.display=n?'block':'none';prompt.querySelector('b').textContent=n?.name||'';}
    interactives.forEach(o=>{const v=o.label.pos.clone().project(camera);o.label.el.style.left=((v.x*.5+.5)*innerWidth)+'px';o.label.el.style.top=((-v.y*.5+.5)*innerHeight)+'px';o.label.el.style.display=v.z<1?'block':'none';});
    renderer.render(scene,camera);
  }
  function keydown(e){if(!active)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='KeyE'&&!e.repeat)interact();else if(e.code==='Escape'){const p=$('.ac-panel');if(p)p.remove();else exit();}else keys[e.code]=true;}
  function keyup(e){keys[e.code]=false;}
  function mouse(e){if(!active||document.pointerLockElement!==renderer?.domElement)return;yaw-=e.movementX*.0022;pitch=clamp(pitch-e.movementY*.0013,-.12,.65);}
  async function enter(){
    if(active)return;active=true;addStyles();ui();
    try{
      THREE=await loadThree();if(!active)return;
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      $('#aevum-cathedral').prepend(renderer.domElement);
      buildChurch();camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,180);camera.position.set(0,1.72,24);clock=new THREE.Clock();
      window.addEventListener('resize',resize);document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);document.addEventListener('mousemove',mouse);animate();
    }catch(err){console.error('[Aevum Cathedral]',err);const root=$('#aevum-cathedral');if(root)root.innerHTML='<div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:30px;background:#100f0d;color:#e8dcc5"><div><h2>Cathedral renderer unavailable</h2><p>'+String(err.message||err).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</p><button onclick="window.AevumCathedral.exit()">Return to Kairos</button></div></div>';}
  }
  function exit(){active=false;cancelAnimationFrame(raf);document.exitPointerLock?.();window.removeEventListener('resize',resize);document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);document.removeEventListener('mousemove',mouse);$('#aevum-cathedral')?.remove();renderer?.dispose();renderer=null;scene=null;interactives=[];flames=[];doors=[];keys={};if(window.Kairos?.home)window.Kairos.home();}
  window.AevumCathedral={enter,exit};
})();