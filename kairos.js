/* Kairos workspace entry: the common landing page is the only place to choose a space. */
(function(){
'use strict';
const spiritual=new Set(['bible','rosary','spbooks','prayers','journal']);
const worldly=new Set(['cal','daily','up','books','words','quotes','week','chat','dash']);
const $=s=>document.querySelector(s);
let current='';
function showHome(){
 current='';
 document.body.classList.add('kairos-at-home');
 const home=$('#kairos-home');if(home)home.hidden=false;
 const shell=$('.app-shell');if(shell)shell.hidden=true;
}
function enterWorld(which){
 current=which==='worldly'?'worldly':'spiritual';
 document.body.classList.remove('kairos-at-home');
 const home=$('#kairos-home');if(home)home.hidden=true;
 const shell=$('.app-shell');if(shell)shell.hidden=false;
 document.documentElement.dataset.kairosWorld=current;
 const allow=current==='spiritual'?spiritual:worldly;
 document.querySelectorAll('#tabs button[data-t]').forEach(b=>{b.hidden=!allow.has(b.dataset.t);});
 const eyebrow=$('.topbar .eyebrow');
 if(eyebrow)eyebrow.innerHTML='<span class="eyebrow-dot"></span> '+(current==='spiritual'?'FOR HEAVEN':'FOR WORLD');
 const title=$('#page-title');
 if(title)title.textContent=current==='spiritual'?'Spiritual life':'Overview';
 const target=current==='spiritual'?'bible':'dash';
 const button=$('#tabs [data-t="'+target+'"]');
 if(button)button.click();
}
function decorateDashboard(){
 const root=$('#v-dash');if(!root)return;
 const hubs=root.querySelector('.life-hub-grid');if(hubs)hubs.remove();
 const title=root.querySelector('.kairos-dashboard-title');if(title)title.remove();
}
document.addEventListener('click',e=>{
 const entry=e.target.closest('[data-enter-world]');
 if(entry){e.preventDefault();enterWorld(entry.dataset.enterWorld);return;}
 if(e.target.closest('[data-home-return]')){e.preventDefault();showHome();return;}
 const nav=e.target.closest('#tabs button[data-t]');
 if(nav&&current==='spiritual'&&!spiritual.has(nav.dataset.t)){e.preventDefault();return;}
 if(nav&&current==='worldly'&&!worldly.has(nav.dataset.t)){e.preventDefault();return;}
});
document.addEventListener('DOMContentLoaded',()=>{decorateDashboard();showHome();});
if(document.readyState!=='loading'){decorateDashboard();showHome();}
const oldRender=window.render;
if(typeof oldRender==='function')window.render=function(){oldRender.apply(this,arguments);decorateDashboard();};
window.Kairos={home:showHome,enter:enterWorld};
})();