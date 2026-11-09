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
 document.body.dataset.kairosWorld=current;
 document.documentElement.dataset.theme=current==='worldly'?'light':'dark';
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
 const root=$('#v-dash');if(!root||root.querySelector('.kairos-quick-launch'))return;
 const panel=document.createElement('section');
 panel.className='card kairos-quick-launch';
 panel.innerHTML='<div class="kairos-quick-head"><div><span class="kairos-quick-kicker">YOUR WORKBENCH</span><h2>Where would you like to begin?</h2><p>Jump straight into the work you want to move forward.</p></div><button class="p" data-a="new">＋ New event</button></div><div class="kairos-quick-grid">'+
 '<button class="kairos-quick-tile" data-t="daily"><span class="quick-symbol">✓</span><strong>Daily tasks</strong><small>Build momentum, one task at a time</small></button>'+
 '<button class="kairos-quick-tile" data-t="cal"><span class="quick-symbol">▦</span><strong>Calendar</strong><small>Plan the days ahead</small></button>'+
 '<button class="kairos-quick-tile" data-t="books"><span class="quick-symbol">▤</span><strong>Reading room</strong><small>Track pages and ideas</small></button>'+
 '<button class="kairos-quick-tile" data-t="words"><span class="quick-symbol">Aa</span><strong>Vocabulary</strong><small>Keep learning every day</small></button>'+
 '<button class="kairos-quick-tile" data-t="week"><span class="quick-symbol">◷</span><strong>Weekly review</strong><small>Reflect and reset your focus</small></button>'+
 '<button class="kairos-quick-tile" data-t="quotes"><span class="quick-symbol">❝</span><strong>Quotes</strong><small>Save thoughts worth keeping</small></button>'+
 '</div>';
 root.prepend(panel);
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