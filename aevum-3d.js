/* Aevum 3D Cathedral — procedural Three.js vertical slice */
(function () {
  'use strict';
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
  const $ = (s, r=document) => r.querySelector(s);
  let active = false, ready = false, scene, camera, renderer, player, doors = [], clock, keys = {}, nearby = null, frame = 0;
  let yaw = 0, pitch = 0.22, doorOpen = false, inside = false, lastTime = 0;
  const objects = [];
  const activities = {
    rosary: ['Holy Rosary', 'Today’s mysteries', 'Open the Rosary book beside Our Lady. The weekday mysteries are shown in your prayer notebook.'],
    mass: ['Holy Mass', 'A place in the pews', 'Take a seat, be still, and mark your attendance after Mass.'],
    prayer: ['Personal Prayer', 'Before the altar', 'Pause here for personal prayer and bring your intentions before God.'],
    bible: ['Daily Scripture', 'The Bible lectern', 'Open today’s Scripture reading and spend a moment with the Word.'],
    journal: ['Spiritual Journal', 'Your prayer notebook', 'Write a private reflection or note an intention for today.']
  };
  function loadScript() {
    if (window.THREE) return Promise.resolve();
    if (window.__aevumThreePromise) return window.__aevumThreePromise;
    window.__aevumThreePromise = new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = THREE_URL; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
    return window.__aevumThreePromise;
  }
  function addStyles() {
    if ($('#aevum-3d-style')) return;
    const style = document.createElement('style'); style.id = 'aevum-3d-style';
    style.textContent = `
      #aevum-3d{position:fixed;inset:0;z-index:10020;background:#090a0b;color:#eee8dc;font-family:Georgia,serif;overflow:hidden}
      #aevum-3d canvas{display:block;width:100%;height:100%;touch-action:none}
      .a3d-top{position:absolute;left:30px;top:22px;pointer-events:none;text-shadow:0 2px 14px #000}
      .a3d-top strong{display:block;font-size:25px;letter-spacing:.12em;font-weight:400}.a3d-top small{font:9px Arial;letter-spacing:.28em;color:#c4aa7d}
      .a3d-exit{position:absolute;right:25px;top:22px;background:#171716cc;border:1px solid #9e8965;color:#eee4d2;padding:10px 15px;cursor:pointer;letter-spacing:.08em}
      .a3d-hint{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);background:#111c;padding:10px 16px;border:1px solid #9b835544;border-radius:3px;font:11px Arial;letter-spacing:.08em;white-space:nowrap;color:#e6d8bd}
      .a3d-prompt{position:absolute;left:50%;bottom:78px;transform:translateX(-50%);background:#171613ed;border:1px solid #b69a6b;padding:12px 20px;text-align:center;min-width:230px;display:none}
      .a3d-prompt b{display:block;font-size:16px;font-weight:400}.a3d-world-label{font-weight:600}.a3d-prompt small{font:10px Arial;color:#c8b38f;letter-spacing:.1em}
      .a3d-panel{position:absolute;inset:0;background:#070707b8;display:grid;place-items:center;padding:20px}
      .a3d-paper{width:min(540px,94vw);max-height:82vh;overflow:auto;background:linear-gradient(145deg,#eee5d2,#d6c6a8);color:#34291d;padding:34px;box-shadow:0 20px 80px #000;border:1px solid #b49a70}
      .a3d-paper small{font:10px Arial;letter-spacing:.2em;color:#806b4b}.a3d-paper h2{font-size:29px;font-weight:400;margin:12px 0}.a3d-paper p{font-size:16px;line-height:1.65}.a3d-paper textarea{box-sizing:border-box;width:100%;min-height:140px;background:#f7f0e2;border:1px solid #b7a487;padding:12px;font:15px Georgia;color:#34291d}
      .a3d-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}.a3d-actions button{padding:10px 16px;background:#392f23;color:#f4ead8;border:0;cursor:pointer}
      .a3d-mobile{display:none;position:absolute;left:18px;bottom:18px;gap:6px}.a3d-mobile button{width:42px;height:42px;border:1px solid #c2a87b88;background:#171613bb;color:#fff;border-radius:50%;font-size:18px;touch-action:none}
      @media(max-width:700px){.a3d-top{left:16px;top:15px}.a3d-top strong{font-size:19px}.a3d-exit{right:12px;top:12px}.a3d-hint{bottom:15px;font-size:9px}.a3d-mobile{display:grid;grid-template-columns:repeat(3,42px);grid-template-rows:repeat(2,42px)}.a3d-mobile [data-k=KeyW]{grid-column:2}.a3d-mobile [data-k=KeyA]{grid-column:1;grid-row:2}.a3d-mobile [data-k=KeyS]{grid-column:2;grid-row:2}.a3d-mobile [data-k=KeyD]{grid-column:3;grid-row:2}}
    `;
    document.head.appendChild(style);
  }
  const mat = (color, roughness=.8, metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});
  function box(parent, w,h,d, material,x,y,z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
  }
  function cylinder(parent, rt,rb,h,material,x,y,z,segments=16) {
    const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;
  }
  function sphere(parent,r,material,x,y,z,scaleY=1) {
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),material);m.position.set(x,y,z);m.scale.y=scaleY;m.castShadow=true;parent.add(m);return m;
  }
  function arch(parent,x,z,material) {
    const shape=new THREE.Shape(); shape.moveTo(-1.45,0);shape.lineTo(-1.45,3.4);shape.absarc(0,3.4,1.45,Math.PI,0,true);shape.lineTo(1.45,0);shape.lineTo(1.15,0);shape.lineTo(1.15,3.4);shape.absarc(0,3.4,1.15,0,Math.PI,false);shape.lineTo(-1.15,0);shape.lineTo(-1.45,0);
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false,curveSegments:24});const m=new THREE.Mesh(geo,material);m.position.set(x,0,z);m.castShadow=true;parent.add(m);
  }
  function label(text,x,y,z) {
    const el=document.createElement('div');el.className='a3d-world-label';el.textContent=text;el.style.cssText='position:absolute;color:#ead8b6;font:10px Arial;letter-spacing:.16em;text-shadow:0 2px 6px #000;pointer-events:none;white-space:nowrap';$('#aevum-3d').appendChild(el);return {el,pos:new THREE.Vector3(x,y,z)};
  }

  function makeTexture(base, accent, kind='stone') {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
    if(kind==='stone'){
      for(let i=0;i<2600;i++){const x=Math.random()*512,y=Math.random()*512,r=Math.random()*2.4+.3;ctx.fillStyle=Math.random()>.5?accent:'rgba(255,255,255,.035)';ctx.globalAlpha=.12+Math.random()*.22;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;ctx.strokeStyle='rgba(48,38,28,.18)';ctx.lineWidth=2;
      for(let y=0;y<512;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}
      for(let row=0;row<4;row++){const off=row%2?64:0;for(let x=off;x<512;x+=128){ctx.beginPath();ctx.moveTo(x,row*128);ctx.lineTo(x,(row+1)*128);ctx.stroke();}}
    } else if(kind==='wood'){
      for(let i=0;i<90;i++){ctx.strokeStyle=i%3?'rgba(24,12,6,.16)':'rgba(220,175,112,.13)';ctx.lineWidth=Math.random()*3+1;ctx.beginPath();let y=Math.random()*512;ctx.moveTo(0,y);ctx.bezierCurveTo(160,y-12,330,y+15,512,y+Math.random()*12-6);ctx.stroke();}
    } else {
      for(let y=0;y<512;y+=64)for(let x=0;x<512;x+=64){ctx.fillStyle=((x+y)/64)%2?'rgba(255,255,255,.035)':'rgba(0,0,0,.055)';ctx.fillRect(x,y,64,64);}
    }
    const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  function textured(color, texture, roughness=.9) {
    return new THREE.MeshStandardMaterial({color,map:texture,roughness});
  }
  function makeWorldLabel(text, position) {
    const el=document.createElement('div');el.className='a3d-world-label';el.textContent=text;
    el.style.cssText='position:absolute;z-index:3;transform:translate(-50%,-100%);padding:7px 11px;background:rgba(20,18,15,.82);border:1px solid rgba(190,158,105,.65);color:#f2e5cb;font:10px Arial,sans-serif;letter-spacing:.13em;white-space:nowrap;pointer-events:none;text-shadow:none;box-shadow:0 3px 12px #0008';
    $('#aevum-3d').appendChild(el);return {el,position};
  }

  function makePlayer() {
    const g=new THREE.Group(), skin=mat('#b98260'), coat=mat('#34434a'), trousers=mat('#252c32'), shoes=mat('#17191b'), hair=mat('#30231d');
    sphere(g,.235,skin,0,1.62,0,1.18);sphere(g,.24,hair,0,1.76,-.035,.72);sphere(g,.045,mat('#241c18'),-.19,1.65,.17,.7);sphere(g,.045,mat('#241c18'),.19,1.65,.17,.7);
    cylinder(g,.075,.075,.14,skin,0,1.43,0,24);cylinder(g,.25,.28,.62,coat,0,1.08,0,24);
    const legs=[],arms=[];
    for(const x of [-.115,.115]){const leg=cylinder(g,.09,.105,.55,trousers,x,.43,0,24);legs.push(leg);sphere(g,.095,trousers,x,.19,0,.8);box(g,.14,.1,.27,shoes,x,.08,.08);}
    for(const x of [-.29,.29]){const arm=cylinder(g,.075,.09,.52,coat,x,1.1,0,24);arm.rotation.z=x<0?-.16:.16;arms.push(arm);sphere(g,.075,skin,x*1.04,.82,.01);}
    g.position.set(0,0,11);scene.add(g);g.userData.legs=legs;g.userData.arms=arms;return g;
  }
  function buildWorld() {
    scene=new THREE.Scene();scene.background=new THREE.Color('#101719');scene.fog=new THREE.Fog('#101719',26,78);
    scene.add(new THREE.HemisphereLight('#e5e4df','#34271d',1.9));
    const sun=new THREE.DirectionalLight('#ffe8c5',3.0);sun.position.set(-10,20,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;scene.add(sun);
    const naveLight=new THREE.PointLight('#f4d7a2',2.2,32);naveLight.position.set(0,7,-2);scene.add(naveLight);
    const altarLight=new THREE.PointLight('#ffcf83',2.6,16);altarLight.position.set(0,4,-15);scene.add(altarLight);
    const stoneTex=makeTexture('#b9ad98','#827764','stone'), woodTex=makeTexture('#52331f','#24160f','wood'), floorTex=makeTexture('#766c5d','#4c443a','tile');
    const gold=mat('#b59a68',.32,.55), stone=textured('#d0c5b1',stoneTex), darkStone=mat('#655b4c'), wood=textured('#765033',woodTex), wood2=mat('#795638'), floor=textured('#8a806e',floorTex), roof=mat('#3b3732'), glass= new THREE.MeshStandardMaterial({color:'#718e9a',emissive:'#345d70',emissiveIntensity:.8,roughness:.25,metalness:.08});
    // Exterior approach and cathedral shell
    box(scene,80,.3,90,floor,0,-.22,0);box(scene,18,.2,12,mat('#82745e'),0,-.05,18);
    box(scene,7,10,3,stone,-6.5,5,-8);box(scene,7,10,3,stone,6.5,5,-8);box(scene,3,10,25,stone,-11,5,3);box(scene,3,10,25,stone,11,5,3);box(scene,20,10,3,stone,0,5,-20);
    // nave floor and vaulted ceiling mass
    box(scene,18,.35,25,mat('#8d806b'),0,.05,3);box(scene,18,.5,25,roof,0,10,3);
    for(let z=-7;z<=13;z+=5){for(const x of [-8.5,8.5]){cylinder(scene,.48,.62,9,stone,x,4.5,z,40);cylinder(scene,.68,.68,.28,gold,x,8.9,z,40);cylinder(scene,.72,.72,.18,darkStone,x,.12,z,40);arch(scene,x*.72,z-.1,gold);box(scene,.22,.22,4.8,gold,x*.82,8.95,z);}}
    // stained glass windows
    for(const x of [-10.92,10.92])for(let z=-5;z<=10;z+=5){box(scene,.12,3.6,1.8,glass,x,6,z);box(scene,.2,.12,2,gold,x,6,z);box(scene,.2,3.8,.12,gold,x,6,z);sphere(scene,.09,gold,x,7.8,z,1.8);}
    // altar and apse
    box(scene,10,5,1,stone,0,2.5,-19.7);box(scene,7,.55,2.2,wood2,0,1.1,-14.5);box(scene,6,.2,2.1,gold,0,1.48,-14.5);
    box(scene,.2,2.1,.2,gold,0,3.1,-15.2);box(scene,.9,.16,.18,gold,0,3.65,-15.2);
    // main doors on front wall, hinged outward
    for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*1.9,0,-7.9);scene.add(pivot);const leaf=box(pivot,3.7,6.5,.38,wood,side*1.85,3.25,0);for(let y=1;y<6;y+=1.4)box(pivot,3.3,.08,.48,wood2,side*1.85,y,0);cylinder(pivot,.07,.07,.3,gold,side*3.1,3.2,.25);doors.push({pivot,side});}
    // pews in orderly rows
    for(let z=-3;z<=9;z+=3.2){for(const x of [-5.2,5.2]){box(scene,3.9,.22,.55,wood,x,.9,z);box(scene,3.9,.22,.32,wood,x,1.6,z+.48);for(const dx of [-1.65,1.65]){box(scene,.18,.9,.18,wood2,x+dx,.45,z);box(scene,.18,.8,.18,wood2,x+dx,1.2,z+.48);}}}
    // Our Lady side chapel and rosary book
    cylinder(scene,.16,.2,1.4,gold,-7.6,.7,2,20);sphere(scene,.42,mat('#d9d1c1'),-7.6,1.75,2,1.35);cylinder(scene,.28,.4,.8,mat('#263c61'),-7.6,1.1,2,16);sphere(scene,.08,gold,-7.6,2.18,1.96);
    box(scene,1.2,.22,.9,wood2,-6.1,.8,4.1);const ros=box(scene,.7,.08,.48,mat('#5c3420'),-6.1,.95,4.1);ros.rotation.z=-.12;objects.push({id:'rosary',name:'Rosary book',pos:new THREE.Vector3(-6.1,1,4.1)});
    // bible lectern
    box(scene,.9,.15,.8,wood2,6.4,1.2,-1);const lect=cylinder(scene,.12,.18,1.7,wood,6.4,.5,-1);box(scene,1.2,.12,.8,wood2,6.4,2,-1);box(scene,.7,.08,.48,mat('#58351f'),6.4,2.12,-1);objects.push({id:'bible',name:'Open Bible',pos:new THREE.Vector3(6.4,2.2,-1)});
    // journal desk
    box(scene,2,.18,1.2,wood2,7,.95,8);for(const x of [6.2,7.8])for(const z of [7.6,8.4])box(scene,.13,.9,.13,wood,x,.45,z);box(scene,.8,.07,.5,mat('#6a4930'),7,1.08,8);objects.push({id:'journal',name:'Prayer notebook',pos:new THREE.Vector3(7,1.3,8)});
    objects.push({id:'mass',name:'Pews',pos:new THREE.Vector3(-4,.9,3)});objects.push({id:'prayer',name:'Altar',pos:new THREE.Vector3(0,1,-13)});
    // candles and warm pools of light
    for(let i=0;i<7;i++){const x=-8+i*2.65;cylinder(scene,.045,.05,.55,mat('#eee0b7'),x,.4,-13.4,10);const light=new THREE.PointLight('#ffbd69',.8,5);light.position.set(x,.9,-13.4);scene.add(light);}
    player=makePlayer();
    // Clear, readable signposts hover above the real devotional stations.
    objects.forEach(o=>{const p=o.pos.clone();p.y+=1.9;o.label=makeWorldLabel(o.name.toUpperCase(),p);});
    camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,150);
    clock=new THREE.Clock();
    renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    $('#aevum-3d').prepend(renderer.domElement);
  }
  function ui() {
    const root=document.createElement('div');root.id='aevum-3d';root.innerHTML='<div class="a3d-top"><strong>AEVUM</strong><small>A QUIET PLACE TO RETURN</small></div><button class="a3d-exit">← RETURN</button><div class="a3d-prompt"><b></b><small>PRESS E TO INTERACT</small></div><div class="a3d-hint">W A S D · WALK &nbsp;&nbsp; MOUSE · LOOK &nbsp;&nbsp; E · INTERACT &nbsp;&nbsp; ESC · CLOSE</div><div class="a3d-mobile"><button data-k="KeyW">↑</button><button data-k="KeyA">←</button><button data-k="KeyS">↓</button><button data-k="KeyD">→</button></div>';
    document.body.appendChild(root);root.querySelector('.a3d-exit').onclick=exit;
    root.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b){keys[b.dataset.k]=true;setTimeout(()=>keys[b.dataset.k]=false,180);}});
    root.addEventListener('pointerdown',e=>{if(e.target===renderer?.domElement&&renderer.domElement.requestPointerLock&&innerWidth>700)renderer.domElement.requestPointerLock();});
  }
  function showActivity(id) {
    const a=activities[id];if(!a)return;
    const root=$('#aevum-3d'),panel=document.createElement('div');panel.className='a3d-panel';panel.innerHTML='<div class="a3d-paper"><small>AEVUM · '+new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})+'</small><h2>'+a[0]+'</h2><p><em>'+a[1]+'</em></p><p>'+a[2]+'</p>'+(id==='journal'?'<textarea placeholder="Write your reflection…" id="a3d-note"></textarea>':'')+'<div class="a3d-actions"><button data-close>Return to church</button><button data-done>Mark complete</button></div></div>';
    root.appendChild(panel);panel.addEventListener('click',e=>{if(e.target.closest('[data-close]')||e.target===panel)panel.remove();if(e.target.closest('[data-done]')){const st=JSON.parse(localStorage.getItem('aevum.spiritual.progress.v1')||'{}');st.date=new Date().toISOString().slice(0,10);st.done=st.done||{};st.done[id]=true;if(id==='journal')localStorage.setItem('aevum.spiritual.notes.v1',$('#a3d-note',panel).value||'');localStorage.setItem('aevum.spiritual.progress.v1',JSON.stringify(st));panel.remove();}});
  }
  function nearest() {
    const p=player.position;let best=null,dist=3.2;
    for(const o of objects){const d=Math.hypot(p.x-o.pos.x,p.z-o.pos.z);if(d<dist){best=o;dist=d;}}
    if(!inside){const d=Math.hypot(p.x,p.z+7);if(d<4)return {id:'door',name:'Cathedral doors'};}
    return best;
  }
  function interact() {
    if(!inside){doorOpen=true;doors.forEach(d=>{d.pivot.rotation.y=d.side===-1?-.95:.95;});inside=true;return;}
    if(nearby?.id==='door'){doorOpen=true;doors.forEach(d=>d.pivot.rotation.y=d.side===-1?-.95:.95);return;}
    if(nearby)showActivity(nearby.id);
  }
  function animate() {
    if(!active)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);
    const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),right=new THREE.Vector3(forward.z,0,-forward.x),move=new THREE.Vector3();
    if(keys.KeyW||keys.ArrowUp)move.add(forward.clone().negate());if(keys.KeyS||keys.ArrowDown)move.add(forward);if(keys.KeyA||keys.ArrowLeft)move.add(right.clone().negate());if(keys.KeyD||keys.ArrowRight)move.add(right);
    if(move.lengthSq()){move.normalize().multiplyScalar(4.2*dt);player.position.add(move);player.rotation.y=Math.atan2(move.x,move.z);player.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(performance.now()*.012+i*Math.PI)*.48);player.userData.arms.forEach((a,i)=>a.rotation.x=Math.sin(performance.now()*.012+i*Math.PI)*.28);}
    player.position.x=THREE.MathUtils.clamp(player.position.x,-9.4,9.4);player.position.z=THREE.MathUtils.clamp(player.position.z,-22,20);
    const desired=new THREE.Vector3(player.position.x+Math.sin(yaw)*7,player.position.y+4.2+pitch*3,player.position.z+Math.cos(yaw)*7);
    camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(player.position.x,player.position.y+1.1,player.position.z);
    nearby=nearest();const prompt=$('.a3d-prompt');if(prompt){prompt.style.display=nearby?'block':'none';prompt.querySelector('b').textContent=nearby?.name||'';}
    objects.forEach(o=>{if(!o.label)return;const v=o.label.position.clone().project(camera);const x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight;o.label.el.style.left=x+'px';o.label.el.style.top=y+'px';o.label.el.style.display=v.z<1?'block':'none';});
    renderer.render(scene,camera);
  }
  function onKey(e){if(!active)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='KeyE'&&!e.repeat){interact();}else if(e.code==='Escape'){const panel=$('.a3d-panel');if(panel)panel.remove();else exit();}else keys[e.code]=true;}
  function onUp(e){keys[e.code]=false;}
  function onMouse(e){if(!active||document.pointerLockElement!==renderer?.domElement)return;yaw-=e.movementX*.0025;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0015,-.1,.65);}
  function resize(){if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
  function enter() {
    if(active)return;active=true;addStyles();ui();loadScript().then(()=>{if(!active)return;buildWorld();ready=true;window.addEventListener('resize',resize);document.addEventListener('keydown',onKey);document.addEventListener('keyup',onUp);document.addEventListener('mousemove',onMouse);animate();}).catch(()=>{const h=$('#aevum-3d');if(h)h.innerHTML='<p style="padding:40px">The 3D experience could not load. Please check your connection and try again.</p>';});
  }
  function exit(){active=false;cancelAnimationFrame(frame);document.exitPointerLock?.();window.removeEventListener('resize',resize);document.removeEventListener('keydown',onKey);document.removeEventListener('keyup',onUp);document.removeEventListener('mousemove',onMouse);const root=$('#aevum-3d');if(root)root.remove();if(window.AevumSpiritualWalk)window.AevumSpiritualWalk.exit();}
  window.Aevum3D={enter,exit};
  document.addEventListener('click',e=>{if(e.target.closest('[data-enter-world="spiritual"]')){setTimeout(()=>{const old=$('#aevum-spiritual-game');if(old)old.hidden=true;enter();},80);}});
})();