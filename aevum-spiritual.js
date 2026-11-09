/* Aevum Spiritual Walk: keyboard movement, proximity interactions, daily progress */
(function(){
'use strict';
const STORE='aevum.spiritual.progress.v1';
const JOURNAL='aevum.spiritual.notes.v1';
const $=(s,r=document)=>r.querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);
const load=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||'{}');return x.date===today()?x:{date:today(),done:{},mysteries:[],extras:[]};}catch(e){return {date:today(),done:{},mysteries:[],extras:[]};}};
let state=load(), player={x:50,y:88},keys={},target=null,dialog=null,game=null;
const zones=[
 {id:'mass',x:43,y:70,title:'Holy Mass',sub:'A place in the pews',hint:'Take your place and spend a moment in the presence of God.',object:'pew',mark:'✝'},
 {id:'prayer',x:54,y:34,title:'Personal Prayer',sub:'Before the altar',hint:'Spend a few quiet minutes in prayer before the altar.',object:'kneeler',mark:'✝'},
 {id:'rosary',x:19,y:47,title:'Holy Rosary',sub:'At Our Lady’s statue · Rosary book',hint:'Open the Rosary book for today’s mysteries.',object:'rosary-book',mark:'✧'},
 {id:'bible',x:77,y:55,title:'Bible Reading',sub:'The open Bible on the lectern',hint:'Open the Bible and spend time with today’s reading.',object:'bible-book',mark:'†'},
 {id:'journal',x:83,y:76,title:'Spiritual Journal',sub:'Your quiet reflection space',hint:'Write a reflection for today.',object:'journal-book',mark:'✎'}
];
const persist=()=>localStorage.setItem(STORE,JSON.stringify(state));
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ensure(){
 if($('#aevum-spiritual-game'))return;
 game=document.createElement('div');game.id='aevum-spiritual-game';game.hidden=true;
 game.innerHTML='<div class="aevum-scene"></div><aside class="aevum-sidebar"><div class="aevum-brand">Aevum<small>THE SPIRITUAL WALK</small></div><nav class="aevum-side-nav"><button data-game="home">⌂ <span>Home</span></button><button data-game="plan">▤ <span>Spiritual plan</span></button><button data-game="journal">✎ <span>Journal</span></button><button data-game="exit">↩ <span>Return to Aevum</span></button></nav><div class="aevum-verse">“Be still, and know that I am God.”<br><small>— Psalm 46:10</small></div></aside><div class="aevum-title"><h1>The Church</h1><p>YOUR DAILY SPIRITUAL JOURNEY</p></div><div class="aevum-date"></div><section class="aevum-plan"><h3>Today’s Spiritual Plan</h3><div class="aevum-plan-items"></div><div class="aevum-progress"><span></span></div><div class="aevum-plan-count" style="text-align:right;font:10px Arial;color:#cbb58d;margin-top:7px"></div></section><div class="aevum-zones"></div><div class="aevum-player"><i class="head"></i><i class="body"></i><i class="pack"></i><i class="legs"></i></div><div class="aevum-hint"><kbd>W A S D</kbd> Move <kbd>E</kbd> Interact <kbd>M</kbd> Plan <kbd>ESC</kbd> Close</div><div class="aevum-minimap"><div class="aevum-map-inner"><span class="aevum-map-player"></span></div></div><div class="aevum-quick"><button data-game="plan">☷ Today’s plan</button><button data-game="extras">＋ Anytime activities</button></div><div class="aevum-mobile-controls"><button data-move="up">↑</button><button data-move="left">←</button><button data-move="down">↓</button><button data-move="right">→</button><button data-move="interact">E</button></div><div class="aevum-modal" hidden><div class="aevum-dialog"></div></div>';
 document.body.appendChild(game);
 game.addEventListener('click',onClick);
 document.addEventListener('keydown',onKeyDown);
 document.addEventListener('keyup',onKeyUp);
 render();
}
function render(){
 if(!game)return;
 $('.aevum-date',game).textContent=new Date().toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
 $('.aevum-zones',game).innerHTML=zones.map(z=>'<button class="aevum-object '+z.object+'" data-zone="'+z.id+'" style="left:'+z.x+'%;top:'+z.y+'%" aria-label="Open '+z.title+'"><span class="object-art"><i>'+z.mark+'</i></span><span class="object-caption">'+z.title+(state.done[z.id]?' <b>✓</b>':'')+'<small>'+z.sub+'</small></span><span class="object-prompt">E · Interact</span></button>').join('');
 const items=[['mass','Holy Mass','Take a seat in the pews'],['prayer','Personal Prayer','Quiet time before the altar'],['rosary','Holy Rosary','Pray the mysteries with Mary'],['bible','Bible Reading','Spend time with Scripture'],['journal','Spiritual Journal','Write a short reflection']];
 const done=items.filter(x=>state.done[x[0]]).length;
 $('.aevum-plan-items',game).innerHTML=items.map(x=>'<div class="aevum-plan-row"><span class="aevum-check '+(state.done[x[0]]?'done':'')+'">'+(state.done[x[0]]?'✓':'')+'</span><span>'+x[1]+'<small>'+(state.done[x[0]]?'Completed today':x[2])+'</small></span></div>').join('');
 $('.aevum-progress span',game).style.width=(done/items.length*100)+'%';
 $('.aevum-plan-count',game).textContent=done+' / '+items.length+' completed';
 $('.aevum-player',game).style.left=player.x+'%';$('.aevum-player',game).style.top=player.y+'%';
 $('.aevum-map-player',game).style.left=player.x+'%';$('.aevum-map-player',game).style.top=player.y+'%';
}
function showDialog(title,body,actions){
 const modal=$('.aevum-modal',game),box=$('.aevum-dialog',game);
 box.innerHTML='<div class="eyebrow">AEVUM · SPIRITUAL WALK</div><h2>'+title+'</h2>'+body+'<div class="aevum-dialog-actions">'+actions+'</div>';
 modal.hidden=false;dialog=title;
}
function closeDialog(){$('.aevum-modal',game).hidden=true;dialog=null;}
function finish(id){state.done[id]=true;persist();render();closeDialog();showDialog('A moment well spent','<p>This activity has been marked complete for today. You can return to any place or repeat a prayer whenever you wish.</p>','<button class="primary" data-game="close">Continue</button>');}
function interact(id){
 const z=zones.find(x=>x.id===id);if(!z)return;
 if(id==='mass'){
 showDialog('Holy Mass','<div class="aevum-devotion-image" style="background-image:url(https://images.unsplash.com/photo-1548625361-58a9b86aa83f?auto=format&fit=crop&w=1200&q=85)"></div><p>'+z.hint+'</p><h3>Prayer before Mass</h3><p>In the name of the Father, and of the Son, and of the Holy Spirit. Amen.</p><p>Lord Jesus Christ, prepare my heart to take part in the Holy Mass with faith, reverence and love. Help me listen to Your Word, unite my prayers with the offering at the altar, and receive the grace You wish to give me. Amen.</p><h3>After Communion</h3><p>My Jesus, I believe that You are truly present. I love You above all things and desire to welcome You into my soul. Remain with me and guide me in Your love. Amen.</p>',(state.done.mass?'<button data-game="close">Close</button>':'<button class="primary" data-complete="mass">Mark Holy Mass attended</button>'));
 }else if(id==='prayer'){
 showDialog('Personal Prayer','<div class="aevum-devotion-image" style="background-image:url(https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=85)"></div><p>'+z.hint+'</p><h3>Our Father</h3><p>Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.</p><h3>Act of Faith</h3><p>O my God, I firmly believe that You are one God in three divine Persons, Father, Son and Holy Spirit. I believe in Jesus Christ, Your Son, who became man and died for our salvation. I believe all that You have revealed and the Holy Church teaches. Amen.</p><textarea id="aevum-prayer-note" rows="3" placeholder="Write your prayer intention…"></textarea>',(state.done.prayer?'<button data-game="close">Close</button>':'<button class="primary" data-complete="prayer">Complete personal prayer</button>'));
 }else if(id==='rosary'){
 const mysteries=['Joyful Mysteries','Luminous Mysteries','Sorrowful Mysteries','Glorious Mysteries'];
 const weekday=new Date().getDay();const todayMystery=weekday===0||weekday===3?'Glorious Mysteries':weekday===1||weekday===6?'Joyful Mysteries':weekday===2||weekday===5?'Sorrowful Mysteries':'Luminous Mysteries';const prayers=['Sign of the Cross','Apostles’ Creed','Our Father','Three Hail Marys','Glory Be'];const decades=['The First Mystery','The Second Mystery','The Third Mystery','The Fourth Mystery','The Fifth Mystery'];showDialog('Today’s Holy Rosary','<div class="aevum-devotion-image rosary-devotion-image" style="background-image:url(https://ologsct.com/cdn/shop/files/563944877_17909526603230993_8867397041143159013_n.jpg?v=1760460779&width=1445)"></div><div class="rosary-today"><div class="rosary-date">'+new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})+'</div><div class="rosary-mystery">'+todayMystery+'</div><p>Begin with the introductory prayers, then meditate on each mystery with one Our Father, ten Hail Marys and the Glory Be.</p><h3>Opening prayers</h3><p><b>Sign of the Cross</b><br>In the name of the Father, and of the Son, and of the Holy Spirit. Amen.</p><p><b>Apostles’ Creed</b><br>I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, His only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; He descended into hell; on the third day He rose again from the dead; He ascended into heaven, and is seated at the right hand of God the Father almighty; from there He will come to judge the living and the dead. I believe in the Holy Spirit, the holy Catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.</p><p><b>Our Father</b><br>Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.</p><p><b>Hail Mary</b><br>Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.</p><p><b>Glory Be</b><br>Glory be to the Father, and to the Son, and to the Holy Spirit, as it was in the beginning, is now, and ever shall be, world without end. Amen.</p>'+prayers.map((p,i)=>'<div class="rosary-step"><span>'+(i+1)+'</span>'+p+'</div>').join('')+'<h3>Five decades</h3>'+decades.map((p,i)=>'<div class="rosary-step"><span>'+(i+1)+'</span>'+p+' <small>Our Father · 10 Hail Marys · Glory Be</small></div>').join('')+'<p class="rosary-closing"><b>Hail, Holy Queen</b><br>Hail, holy Queen, Mother of mercy, our life, our sweetness and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us, and after this our exile show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Amen.</p></div>',(state.done.rosary?'<button data-game="close">Close</button>':'<button class="primary" data-complete="rosary">I have prayed today’s Rosary</button>'));
 }else if(id==='bible'){
 const readings=[['Psalm 23:1–6','The Lord is my shepherd; I shall not want.'],['Matthew 6:25–34','Do not worry about tomorrow, for tomorrow will worry about itself.'],['John 15:1–11','Remain in me, as I also remain in you.'],['Romans 12:1–12','Be joyful in hope, patient in affliction, faithful in prayer.'],['Isaiah 40:28–31','Those who hope in the Lord will renew their strength.'],['Luke 10:38–42','Mary has chosen what is better, and it will not be taken away from her.'],['Philippians 4:4–9','The peace of God, which transcends all understanding, will guard your hearts.']];const reading=readings[(new Date().getDay()+6)%7];showDialog('Today’s Bible Reading','<div class="aevum-devotion-image" style="background-image:url(https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=85)"></div><div class="bible-page"><div class="bible-kicker">DAILY SCRIPTURE</div><h3>'+reading[0]+'</h3><blockquote>“'+reading[1]+'”</blockquote><p>Read the full passage in your Bible. Sit with one line that speaks to you today.</p><textarea id="aevum-bible-note" rows="3" placeholder="A verse or thought to remember (optional)…"></textarea></div>',(state.done.bible?'<button data-game="close">Close</button>':'<button class="primary" data-complete="bible">Mark reading complete</button>'));
 }else if(id==='journal'){
 let note=localStorage.getItem(JOURNAL)||'';
 showDialog('Spiritual Journal','<div class="aevum-devotion-image" style="background-image:url(https://images.unsplash.com/photo-1455390582262-044c1f5b6e7b?auto=format&fit=crop&w=1200&q=85)"></div><p>A small private reflection saved in this browser. Your existing encrypted journal remains available in the main planner.</p><textarea id="aevum-journal-note" rows="6" placeholder="What are you grateful for? What would you like to bring to prayer?">'+esc(note)+'</textarea>','<button data-game="close">Close</button><button class="primary" data-save-journal>Save reflection</button>');
 }
}
function nearest(){let best=null,dist=Infinity;zones.forEach(z=>{const d=Math.hypot(z.x-player.x,z.y-player.y);if(d<dist){best=z;dist=d;}});return dist<13?best:null;}
function move(dx,dy){player.x=Math.max(7,Math.min(93,player.x+dx));player.y=Math.max(12,Math.min(91,player.y+dy));render();}
function step(){let dx=0,dy=0;if(keys.w||keys.ArrowUp)dy=-.65;if(keys.s||keys.ArrowDown)dy=.65;if(keys.a||keys.ArrowLeft)dx=-.65;if(keys.d||keys.ArrowRight)dx=.65;const avatar=$('.aevum-player',game);if(dx||dy){if(avatar)avatar.classList.add('is-moving');player.x=Math.max(7,Math.min(93,player.x+dx));player.y=Math.max(12,Math.min(91,player.y+dy));render();}else if(avatar)avatar.classList.remove('is-moving');}
let movementTimer=null;
function onKeyDown(e){
 if(!game||game.hidden)return;
 const typing=e.target&&(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable);
 if(!typing&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
 if(e.key==='Escape'){closeDialog();return;}
 if(dialog)return;
 if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){keys[e.key]=true;if(!movementTimer)movementTimer=setInterval(step,35);}
 if(e.key.toLowerCase()==='e'){const z=nearest();if(z)interact(z.id);else showDialog('Walk a little closer','<p>Move closer to a place in the church, then press E to interact.</p>','<button class="primary" data-game="close">Understood</button>');}
 if(e.key.toLowerCase()==='m')openPlan();
}
function onKeyUp(e){keys[e.key]=false;if(!Object.values(keys).some(Boolean)){if(movementTimer){clearInterval(movementTimer);movementTimer=null;}const avatar=$('.aevum-player',game);if(avatar)avatar.classList.remove('is-moving');}}
function openPlan(){showDialog('Your spiritual plan','<p>These activities are available in any order. Complete the main daily practices as you move through the church.</p>'+zones.map(z=>'<label><span>'+z.title+'</span><span style="margin-left:auto;color:'+(state.done[z.id]?'#d6b46f':'#b7a17b')+'">'+(state.done[z.id]?'✓ Complete':'Not yet')+'</span></label>').join(''),'<button class="primary" data-game="close">Return to the church</button>');}
function openExtras(){showDialog('Anytime activities','<p>These are not tied to a location or order. Add a small act of faith whenever it fits your day.</p><div class="aevum-dialog-actions" style="justify-content:flex-start"><button data-extra="Angelus">Pray the Angelus</button><button data-extra="Divine Mercy Chaplet">Divine Mercy Chaplet</button><button data-extra="Examination of Conscience">Examination of Conscience</button><button data-extra="Spiritual reading">Spiritual reading</button><button data-extra="Visit the Blessed Sacrament">Visit the Blessed Sacrament</button></div><p style="margin-top:15px">Today: '+(state.extras.length?state.extras.map(esc).join(' · '):'No anytime activities completed yet')+'</p>','<button class="primary" data-game="close">Done</button>');}
function onClick(e){
 const zone=e.target.closest('[data-zone]');if(zone){const id=zone.dataset.zone;const z=zones.find(x=>x.id===id);const avatar=$('.aevum-player',game);if(avatar)avatar.classList.add('is-moving');player.x=z.x;player.y=z.y+9;render();setTimeout(()=>{if(avatar)avatar.classList.remove('is-moving');interact(id);},320);return;}
 const mv=e.target.closest('[data-move]');if(mv){const d=mv.dataset.move;if(d==='interact'){const z=nearest();if(z)interact(z.id);return;}const map={up:[0,-4],down:[0,4],left:[-4,0],right:[4,0]};move(...map[d]);return;}
 const complete=e.target.closest('[data-complete]');if(complete){finish(complete.dataset.complete);return;}
 if(e.target.closest('[data-save-rosary]')){state.mysteries=[...game.querySelectorAll('[data-mystery]:checked')].map(x=>Number(x.dataset.mystery));if(state.mysteries.length)state.done.rosary=true;persist();render();closeDialog();return;}
 if(e.target.closest('[data-save-journal]')){localStorage.setItem(JOURNAL,$('#aevum-journal-note',game).value);state.done.journal=true;persist();render();closeDialog();return;}
 if(e.target.closest('[data-extra]')){const x=e.target.closest('[data-extra]').dataset.extra;if(!state.extras.includes(x))state.extras.push(x);persist();openExtras();return;}
 const g=e.target.closest('[data-game]');if(g){const action=g.dataset.game;if(action==='close'){closeDialog();return;}if(action==='plan'){openPlan();return;}if(action==='extras'){openExtras();return;}if(action==='journal'){interact('journal');return;}if(action==='home'||action==='exit'){exit();return;}}
 if(e.target.classList.contains('aevum-modal'))closeDialog();
}
function enter(){ensure();state=load();player={x:50,y:88};game.hidden=false;document.body.style.overflow='hidden';if(movementTimer){clearInterval(movementTimer);movementTimer=null;}render();}
function exit(){if(game)game.hidden=true;document.body.style.overflow='';closeDialog();if(window.Kairos&&typeof window.Kairos.home==='function')window.Kairos.home();else{const home=$('#kairos-home');if(home)home.hidden=false;const shell=$('.app-shell');if(shell)shell.hidden=true;document.body.classList.add('kairos-at-home');}}


document.addEventListener('visibilitychange',()=>{if(document.hidden&&movementTimer){clearInterval(movementTimer);movementTimer=null;keys={};}});
window.AevumSpiritualWalk={enter,exit,interact};
})();