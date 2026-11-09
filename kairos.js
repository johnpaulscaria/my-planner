/* Kairos workspace routing. World and Heaven stay separate. */
(function(){
'use strict';
const worldly=new Set(['cal','daily','up','books','words','quotes','week','chat','dash']);
const $=s=>document.querySelector(s);
let current='';
function showHome(){
 current='';
 document.body.classList.add('kairos-at-home');
 document.documentElement.removeAttribute('data-kairos-world');
 document.body.removeAttribute('data-kairos-world');
 const home=$('#kairos-home');if(home)home.hidden=false;
 const shell=$('.app-shell');if(shell)shell.hidden=true;
}
function enterWorld(which){
 current=which==='worldly'?'worldly':'spiritual';
 document.body.classList.remove('kairos-at-home');
 const home=$('#kairos-home');if(home)home.hidden=true;
 const shell=$('.app-shell');if(shell)shell.hidden=current==='spiritual';
 document.documentElement.dataset.kairosWorld=current;
 document.body.dataset.kairosWorld=current;
 if(current==='spiritual'){
   document.documentElement.dataset.theme='dark';
   if(window.AevumSpiritualWalk&&typeof window.AevumSpiritualWalk.enter==='function')window.AevumSpiritualWalk.enter();
   else if(shell)shell.hidden=false;
   return;
 }
 if(shell)shell.hidden=false;
 // Hard boundary: spiritual tools belong exclusively to Heaven, never to World.
 document.querySelectorAll('#tabs button[data-t]').forEach(b=>{
   const t=b.dataset.t;
   b.hidden=!worldly.has(t);
   if(!worldly.has(t))b.remove();
 });
 ['bible','rosary','spbooks','prayers','journal'].forEach(id=>{
   document.querySelectorAll('#v-'+id).forEach(s=>s.remove());
 });
 document.querySelectorAll('.app-shell [data-life-hub],.app-shell .life-hub-grid,.app-shell [data-sp-action],.app-shell [data-personal]').forEach(n=>n.remove());
 document.querySelectorAll('.app-shell .sec').forEach(s=>{s.hidden=false;});
 
 const eyebrow=$('.topbar .eyebrow');
 if(eyebrow)eyebrow.innerHTML='<span class="eyebrow-dot"></span> WORLD / WORKSPACE';
 const title=$('#page-title');if(title)title.textContent='Overview';
 const desc=$('#today-label');if(desc)desc.textContent='Your plans, progress and ideas in one place.';
 const button=$('#tabs [data-t="dash"]');if(button)button.click();
}
document.addEventListener('click',e=>{
 const entry=e.target.closest('[data-enter-world]');
 if(entry){e.preventDefault();enterWorld(entry.dataset.enterWorld);return;}
 if(e.target.closest('[data-home-return]')){e.preventDefault();showHome();return;}
 const nav=e.target.closest('#tabs button[data-t]');
 if(nav&&current==='worldly'&&!worldly.has(nav.dataset.t)){e.preventDefault();e.stopImmediatePropagation();}
});
document.addEventListener('DOMContentLoaded',showHome);
if(document.readyState!=='loading')showHome();
window.Kairos={home:showHome,enter:enterWorld};
})();