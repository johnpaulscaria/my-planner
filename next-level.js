/* My Planner — Next Level add-on.
   Keeps the original planner.v1 data intact. New data is stored separately in planner.next.v1. */
(function(){
'use strict';
const KEY='planner.next.v1';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const uid=()=>Math.random().toString(36).slice(2,10);
const blank=()=>({goals:[],habitLog:{},reminders:[],chat:[],settings:{dailyFocus:3}});
let N;
try{N=Object.assign(blank(),JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){N=blank()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(N))}catch(e){alert('Could not save. Your browser storage may be full.')} }
function oldData(){try{return JSON.parse(localStorage.getItem('planner.v1')||'{}')}catch(e){return {}}}
function navButton(id,label,icon){if($('#tabs button[data-t="'+id+'"]'))return;const b=document.createElement('button');b.dataset.t=id;b.innerHTML='<span class="studio-icon">'+icon+'</span><span>'+label+'</span>';$('#tabs').appendChild(b)}
function ensure(){
 navButton('nlgoals','Goals','◎');navButton('nlinsights','Insights','▥');
 const main=$('.studio-content');if(!main)return;
 if(!$('#v-nlgoals')){const s=document.createElement('section');s.id='v-nlgoals';s.className='sec';main.appendChild(s)}
 if(!$('#v-nlinsights')){const s=document.createElement('section');s.id='v-nlinsights';s.className='sec';main.appendChild(s)}
 const names={nlgoals:'Goals & habits',nlinsights:'Insights'};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(b&&names[b.dataset.t]){setTimeout(()=>{const h=$('#studio-page-title');if(h)h.textContent=names[b.dataset.t]},0)}});
}
function legacyStats(){
 const d=oldData(),events=Array.isArray(d.events)?d.events:[],habits=Array.isArray(d.habits)?d.habits:[],books=Array.isArray(d.books)?d.books:[],words=Array.isArray(d.words)?d.words:[];
 const today=iso();let done=0,total=0;
 habits.forEach(h=>{if(h.start<=today){total++;if((d.done||{})[h.id+'_'+today]||(d.done||{})[today+'_'+h.id])done++}});
 const reads=d.reads||{};let pages=0;Object.keys(reads).forEach(day=>Object.values(reads[day]||{}).forEach(n=>pages+=Number(n)||0));
 return {events,habits,books,words,done,total,pages,finished:books.filter(b=>b.status==='done').length};
}
function logFor(day){return N.habitLog[day]||(N.habitLog[day]={})}
function habitStreak(id){let streak=0,d=new Date();for(let i=0;i<366;i++){const day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(logFor(day)[id])streak++;else if(i>0)break;d.setDate(d.getDate()-1)}return streak}
function pct(g){return Math.max(0,Math.min(100,Math.round((Number(g.current)||0)/(Number(g.target)||1)*100)))}
function renderGoals(){
 const root=$('#v-nlgoals');if(!root)return;
 const today=iso(),legacy=legacyStats();
 const habits=N.goals.filter(g=>g.type==='habit'),goals=N.goals.filter(g=>g.type!=='habit');
 const checked=logFor(today);
 root.innerHTML=`
 <div class="nl-hero"><div class="nl-eyebrow">PERSONAL OPERATING SYSTEM</div><h2>Make progress visible.</h2><p>Turn the person you want to become into small, repeatable actions. Keep your goals measurable and your daily plan realistic.</p></div>
 <div class="nl-grid">
  <div class="nl-stat"><span>Active goals</span><strong>${goals.filter(g=>pct(g)<100).length}</strong><span>Long-term direction</span></div>
  <div class="nl-stat"><span>Habits today</span><strong>${habits.filter(h=>checked[h.id]).length}/${habits.length}</strong><span>Small actions, repeated</span></div>
  <div class="nl-stat"><span>Reading progress</span><strong>${legacy.pages}</strong><span>Pages logged in your original planner</span></div>
 </div>
 <div class="nl-panel" style="margin-top:16px"><div class="nl-section-head"><h2>Today's habits</h2><button class="p" data-nl="add-habit">+ New habit</button></div>
 ${habits.length?habits.map(h=>`<div class="row"><label style="display:flex;align-items:center;gap:11px;flex:1"><input class="nl-habit-check" type="checkbox" data-nl-check="${h.id}" ${checked[h.id]?'checked':''}><span style="flex:1"><b>${esc(h.title)}</b><div class="mute">${esc(h.why||'Show up consistently')}</div></span></label><span class="tag">${habitStreak(h.id)} day streak</span><button data-nl="delete" data-id="${h.id}">×</button></div>`).join(''):'<div class="nl-empty">Add one small habit you want to practise consistently.</div>'}
 </div>
 <div class="nl-panel" style="margin-top:16px"><div class="nl-section-head"><h2>Long-term goals</h2><button class="p" data-nl="add-goal">+ New goal</button></div>
 ${goals.length?goals.map(g=>`<div class="nl-goal"><div class="nl-goal-top"><div><b>${esc(g.title)}</b><div><small>${esc(g.deadline?'Target date: '+g.deadline:'No deadline set')} · ${esc(g.category||'Personal')}</small></div></div><b>${pct(g)}%</b></div><div class="nl-progress"><span style="width:${pct(g)}%"></span></div><div class="nl-inline"><small>${Number(g.current)||0} / ${Number(g.target)||1} ${esc(g.unit||'steps')}</small><button data-nl="progress" data-id="${g.id}">Update progress</button><button data-nl="edit-goal" data-id="${g.id}">Edit</button><button data-nl="delete" data-id="${g.id}">Delete</button></div>${g.note?`<p class="nl-footnote">${esc(g.note)}</p>`:''}</div>`).join(''):'<div class="nl-empty">Your goals should be specific enough to measure. Add one and define the next milestone.</div>'}
 </div>
 <div class="nl-panel" style="margin-top:16px"><h3>Planning companion</h3><p class="mute">A private, browser-based planning helper. It works without an API key and doesn't send your data anywhere.</p>
 <div class="nl-quick"><button data-nl-prompt="Help me plan a balanced day">Plan my day</button><button data-nl-prompt="Break my biggest goal into small next steps">Break down a goal</button><button data-nl-prompt="Help me make my habits easier to maintain">Improve my habits</button></div>
 <div class="nl-chat-log" id="nl-chat-log">${N.chat.slice(-8).map(m=>`<div class="nl-chat-msg ${m.role==='user'?'user':''}">${esc(m.text)}</div>`).join('')}</div>
 <form id="nl-chat-form"><div class="nl-inline"><input id="nl-chat-input" placeholder="What do you want help planning?" required><button class="p">Ask</button></div></form>
 <p class="nl-footnote">This companion uses simple planning rules, not a hosted AI model. For generative AI, configure a secure backend rather than putting a private API key in browser code.</p></div>`;
}
function renderInsights(){
 const root=$('#v-nlinsights');if(!root)return;const s=legacyStats(),today=iso(),habits=N.goals.filter(g=>g.type==='habit'),log=logFor(today);
 const completed=habits.filter(h=>log[h.id]).length,goalList=N.goals.filter(g=>g.type!=='habit');
 const future=s.events.filter(e=>e.date>=today).length;
 root.innerHTML=`<div class="nl-hero"><div class="nl-eyebrow">YOUR PERSONAL REVIEW</div><h2>Progress, not perfection.</h2><p>A clear view of the systems you're building. These insights combine your existing planner data with your new goals and habit check-ins.</p></div>
 <div class="nl-grid">
  <div class="nl-stat"><span>Upcoming events</span><strong>${future}</strong><span>From your original calendar</span></div>
  <div class="nl-stat"><span>Books finished</span><strong>${s.finished}</strong><span>From your reading room</span></div>
  <div class="nl-stat"><span>Vocabulary bank</span><strong>${s.words.length}</strong><span>Words you've collected</span></div>
  <div class="nl-stat"><span>Pages read</span><strong>${s.pages}</strong><span>Total logged pages</span></div>
  <div class="nl-stat"><span>Goals in progress</span><strong>${goalList.filter(g=>pct(g)<100).length}</strong><span>Defined outcomes</span></div>
  <div class="nl-stat"><span>Habits checked today</span><strong>${completed}/${habits.length}</strong><span>From Goals & habits</span></div>
 </div>
 <div class="nl-panel" style="margin-top:16px"><h3>Goal progress</h3>${goalList.length?goalList.map(g=>`<div class="nl-bar-row"><span>${esc(g.title)}</span><div class="nl-bar"><span style="width:${pct(g)}%"></span></div><b>${pct(g)}%</b></div>`).join(''):'<div class="nl-empty">Create goals to see progress here.</div>'}</div>
 <div class="nl-panel" style="margin-top:16px"><h3>Today's focus</h3><p>${completed===habits.length&&habits.length?'All your tracked habits are checked off. Nice work.':habits.length?`You've completed ${completed} of ${habits.length} tracked habits today. Pick the next small action and keep going.`:'Start with one habit, one measurable goal, and a realistic daily priority.'}</p><div class="nl-tip"><b>Planning principle</b><p style="margin:5px 0 0">Choose three meaningful priorities at most. Put the hardest one in a protected block of time, and define what “done” looks like before you begin.</p></div>
 <div class="nl-inline" style="margin-top:14px"><button class="p" data-t="nlgoals">Review goals and habits</button><button data-nl="export">Export Next Level data</button><button data-nl="reminders">Enable browser reminders</button></div><p class="nl-footnote">Reminder delivery depends on browser permission and whether the website is open. This static website cannot guarantee scheduled notifications while fully closed.</p></div>`;
}
function addGoal(type='goal',existing=null){
 const g=existing||{title:'',category:'Personal',current:0,target:type==='habit'?1:10,unit:type==='habit'?'days':'steps',deadline:'',note:'',why:''};
 const sheet=$('#sheet');sheet.innerHTML=`<h3>${existing?'Edit':'Create'} ${type==='habit'?'habit':'goal'}</h3>
 <label>Name</label><input id="nl-title" maxlength="120" value="${esc(g.title)}" placeholder="${type==='habit'?'e.g. Read for 20 minutes':'e.g. Finish a data analytics course'}" required>
 ${type==='habit'?`<label>Why it matters (optional)</label><input id="nl-why" value="${esc(g.why||'')}" placeholder="Make the reason memorable">`:`<div class="two"><div><label>Category</label><select id="nl-category">${['Career','Learning','Health','Finance','Personal','Creative'].map(x=>`<option ${g.category===x?'selected':''}>${x}</option>`).join('')}</select></div><div><label>Target date</label><input id="nl-deadline" type="date" value="${esc(g.deadline||'')}"></div></div><div class="two"><div><label>Current progress</label><input id="nl-current" type="number" min="0" value="${Number(g.current)||0}"></div><div><label>Target amount</label><input id="nl-target" type="number" min="1" value="${Number(g.target)||10}"></div></div><label>Unit (e.g. lessons, applications)</label><input id="nl-unit" value="${esc(g.unit||'steps')}"><label>Next milestone / notes</label><textarea id="nl-note" rows="2">${esc(g.note||'')}</textarea>`}
 <div class="nl-inline" style="margin-top:15px"><button class="p" data-nl="save-form" data-type="${type}" data-id="${existing?existing.id:''}">Save</button><button data-nl="close">Cancel</button></div>`;
 $('#modal').hidden=false;
}
function saveForm(type,id){
 const title=$('#nl-title').value.trim();if(!title){alert('Please enter a name.');return}
 let item;
 if(type==='habit')item={id:id||uid(),type:'habit',title,why:$('#nl-why').value.trim(),category:'Habit',current:0,target:1,unit:'days'};
 else {const target=Math.max(1,Number($('#nl-target').value)||1);item={id:id||uid(),type:'goal',title,category:$('#nl-category').value,deadline:$('#nl-deadline').value,current:Math.max(0,Number($('#nl-current').value)||0),target,unit:$('#nl-unit').value.trim()||'steps',note:$('#nl-note').value.trim()};item.current=Math.min(item.current,item.target)}
 const ix=N.goals.findIndex(x=>x.id===id);if(ix>=0)N.goals[ix]=item;else N.goals.push(item);save();$('#modal').hidden=true;renderGoals();renderInsights();
}
function plannerReply(input){
 const s=legacyStats(),active=N.goals.filter(g=>g.type!=='habit'&&pct(g)<100),habits=N.goals.filter(g=>g.type==='habit'),low=habits.filter(h=>!logFor(iso())[h.id]);
 const q=input.toLowerCase();
 if(q.includes('goal')||q.includes('break down'))return active.length?`Pick one goal: “${active[0].title}”. Define a 25-minute next action that creates visible progress, then schedule it before lower-priority work. ${active[0].deadline?'Your target date is '+active[0].deadline+'. ':''}Keep the first step small enough to start today.`:'Add one measurable goal first. Use a clear outcome, a target date, and a next milestone. Then I can help turn it into a smaller action plan.'; 
 if(q.includes('habit'))return low.length?`Make “${low[0].title}” easier to start: attach it to an existing routine, reduce the first version to two minutes, and prepare what you need in advance. Track showing up, not doing it perfectly.`:'Choose one habit and attach it to something you already do daily. Make the starting version so easy you can do it on a difficult day.';
 if(q.includes('day')||q.includes('today')||q.includes('plan'))return `Try a simple three-part day:\n1. One important outcome: ${active[0]?active[0].title:'choose the task that would make today feel worthwhile'}.\n2. One maintenance task: review your calendar (${s.events.filter(e=>e.date>=iso()).length} upcoming events are in your planner).\n3. One growth action: read a few pages or practise a new word.\n\nKeep 20–30% of your time unplanned for interruptions. What is the one outcome that matters most today?`;
 return `Let's make this concrete. What outcome do you want, by when, and what is the smallest useful next step? You currently have ${active.length} active goals, ${habits.length} tracked habits, ${s.books.length} books in your reading room, and ${s.words.length} saved words. Start with one priority rather than trying to improve everything at once.`;
}
function sendChat(text){
 if(!text.trim())return;N.chat.push({role:'user',text:text.trim(),at:Date.now()});N.chat.push({role:'assistant',text:plannerReply(text),at:Date.now()});N.chat=N.chat.slice(-30);save();renderGoals();
}
function exportData(){const blob=new Blob([JSON.stringify(N,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='my-planner-next-level-'+iso()+'.json';a.click();URL.revokeObjectURL(url)}
async function enableReminders(){if(!('Notification'in window)){alert('This browser does not support notifications.');return}const p=await Notification.requestPermission();if(p==='granted'){new Notification('My Planner reminders enabled',{body:'Keep the planner open to receive in-app reminder checks.'});alert('Permission enabled. Browser reminders can only be checked while the planner is open.')}else alert('Notifications were not enabled. You can still use the planner normally.')}
document.addEventListener('change',e=>{const c=e.target.closest('[data-nl-check]');if(c){logFor(iso())[c.dataset.nlCheck]=c.checked;save();renderGoals();renderInsights()}});
document.addEventListener('submit',e=>{if(e.target.id==='nl-chat-form'){e.preventDefault();const i=$('#nl-chat-input');sendChat(i.value);}});
document.addEventListener('click',e=>{
 const p=e.target.closest('[data-nl-prompt]');if(p){sendChat(p.dataset.nlPrompt);return}
 const b=e.target.closest('[data-nl]');if(!b)return;const id=b.dataset.id;
 switch(b.dataset.nl){
 case 'add-goal':addGoal('goal');break;case 'add-habit':addGoal('habit');break;case 'close':$('#modal').hidden=true;break;
 case 'save-form':saveForm(b.dataset.type,b.dataset.id||null);break;
 case 'delete':if(confirm('Delete this item?')){N.goals=N.goals.filter(g=>g.id!==id);save();renderGoals();renderInsights()}break;
 case 'edit-goal':addGoal('goal',N.goals.find(g=>g.id===id));break;
 case 'progress':{const g=N.goals.find(g=>g.id===id);if(!g)return;const v=prompt('Current progress ('+g.unit+')',g.current);if(v!==null&&Number.isFinite(Number(v))&&Number(v)>=0){g.current=Math.min(g.target,Number(v));save();renderGoals();renderInsights()}break}
 case 'export':exportData();break;case 'reminders':enableReminders();break;
 }
});
function patchRender(){
 const original=window.render;
 if(typeof original==='function'&&!original.__nlwrapped){window.render=function(){original.apply(this,arguments);if(window.__nlActive==='nlgoals')renderGoals();if(window.__nlActive==='nlinsights')renderInsights()};window.render.__nlwrapped=true}
}
function init(){
 ensure();
 const oldRender=window.render;
 // The legacy renderer toggles .on only among existing sections. Track our custom views after it runs.
 document.addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;const id=b.dataset.t;if(id!=='nlgoals'&&id!=='nlinsights')return;
 window.__nlActive=id;document.querySelectorAll('.sec').forEach(s=>s.classList.toggle('on',s.id==='v-'+id));document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x===b));
 const title=$('#studio-page-title');if(title)title.textContent=id==='nlgoals'?'Goals & habits':'Insights';
 if(id==='nlgoals')renderGoals();else renderInsights();
 });
 // Keep the add-on sections compatible with the original render function.
 const appScript=document.createElement('style');appScript.textContent='#v-nlgoals.on,#v-nlinsights.on{display:block!important}';document.head.appendChild(appScript);
 patchRender();
 if(typeof oldRender==='function')oldRender();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
