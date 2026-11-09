/* Kairos: world switching is a presentation layer; existing planner storage and features remain unchanged. */
(function(){
'use strict';
const spiritual=new Set(['bible','rosary','spbooks','prayers','journal']);
const worldly=new Set(['cal','daily','up','books','words','quotes','week','chat']);
const $=s=>document.querySelector(s);
let mode=localStorage.getItem('kairos.world')||'spiritual';
function setMode(next,fromNav){
 mode=next==='worldly'?'worldly':'spiritual';
 localStorage.setItem('kairos.world',mode);
 document.documentElement.dataset.kairosWorld=mode;
 document.querySelectorAll('[data-world-mode]').forEach(b=>{const active=b.dataset.worldMode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 document.querySelectorAll('#tabs button[data-t]').forEach(b=>{
  const t=b.dataset.t;
  b.hidden=mode==='spiritual'?!spiritual.has(t)&&t!=='dash':!worldly.has(t)&&t!=='dash';
 });
 const active=document.querySelector('#tabs button.on')?.dataset.t;
 if(!fromNav&&active&&active!=='dash'&&!(mode==='spiritual'?spiritual:worldly).has(active)){
  const home=$('#tabs [data-t="dash"]');if(home)home.click();
 }
 const eyebrow=document.querySelector('.topbar .eyebrow');
 if(eyebrow)eyebrow.innerHTML='<span class="eyebrow-dot"></span> '+(mode==='spiritual'?'SPIRITUAL LIFE':'WORLDLY LIFE');
 const title=$('#page-title');
 if(title&&(!active||active==='dash'))title.textContent=mode==='spiritual'?'Overview · Spiritual':'Overview · Worldly';
}
function decorateDashboard(){
 const root=$('#v-dash');if(!root)return;
 const hubs=root.querySelector('.life-hub-grid');
 if(hubs&&!hubs.dataset.kairos){
  hubs.dataset.kairos='1';
  hubs.innerHTML='<a class="life-hub spiritual-hub" href="#" data-life-hub="spiritual"><span>✝</span><div><small>PRAYER · SCRIPTURE · FORMATION</small><h2>Spiritual life</h2><p>Bible, Rosary, devotions and spiritual reading</p></div><b>↗</b></a><a class="life-hub worldly-hub" href="#" data-life-hub="worldly"><span>◈</span><div><small>WORK · LEARNING · STEWARDSHIP</small><h2>Worldly life</h2><p>Planning, books, goals and personal growth</p></div><b>↗</b></a>';
 }
 if(!root.querySelector('.kairos-dashboard-title')){
  const h=document.createElement('div');h.className='kairos-dashboard-title';h.textContent='A considered life, lived with intention';
  root.insertBefore(h,hubs||root.firstChild);
 }
}
document.addEventListener('click',e=>{
 const toggle=e.target.closest('[data-world-mode]');
 if(toggle){e.preventDefault();setMode(toggle.dataset.worldMode,false);return;}
 const nav=e.target.closest('#tabs button[data-t]');
 if(nav){if(spiritual.has(nav.dataset.t))setMode('spiritual',true);else if(worldly.has(nav.dataset.t))setMode('worldly',true);}
});
document.addEventListener('DOMContentLoaded',()=>{setMode(mode,true);decorateDashboard();});
if(document.readyState!=='loading'){setMode(mode,true);decorateDashboard();}
const oldRender=window.render;
if(typeof oldRender==='function')window.render=function(){oldRender.apply(this,arguments);decorateDashboard();setMode(mode,true);};
window.Kairos={setWorld:setMode};
})();
