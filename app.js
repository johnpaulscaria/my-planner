/* My Planner: plain JavaScript, no build step. Data lives in your browser (localStorage). */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const fmt = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (ds, n) => { const d = parse(ds); d.setDate(d.getDate() + n); return fmt(d); };
const diff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const today = () => fmt(new Date());
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nice = ds => parse(ds).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const CATS = { birthday: ['🎂 Birthday', '#e0559c'], travel: ['✈️ Travel', '#0ea5a5'], bills: ['💳 Bills', '#8b5cf6'], work: ['💼 Work', '#3b6ef5'], health: ['🩺 Health', '#ef7a3c'], other: ['📌 Other', '#6b7280'] };
const cat = e => CATS[e.cat] || CATS.other;

let S = { events: [], habits: [], done: {} }, tab = 'cal', sel = today(), view = new Date(), wk = 0, hist = [];
view.setDate(1);
const cfg = () => { try { return JSON.parse(localStorage.getItem('planner.cfg') || '{}'); } catch (e) { return {}; } };
const save = () => { S.ts = Date.now(); try { localStorage.setItem('planner.v1', JSON.stringify(S)); } catch (e) { } push(); };

/* ---------- date logic ---------- */
function occurs(e, ds) {
  if (ds < e.date) return false;
  const r = e.repeat || 'none';
  if (r === 'none') return ds <= (e.end || e.date);
  const a = parse(e.date), b = parse(ds);
  if (r === 'yearly') return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (r === 'monthly') return a.getDate() === b.getDate();
  if (r === 'weekly') return diff(e.date, ds) % 7 === 0;
  return false;
}
const isStart = (e, ds) => (e.repeat && e.repeat !== 'none') ? occurs(e, ds) : ds === e.date;
const eventsOn = ds => S.events.filter(e => occurs(e, ds)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
function hstat(ds) {
  const act = S.habits.filter(h => h.start <= ds);
  if (!act.length) return '';
  const n = (S.done[ds] || []).filter(id => act.some(h => h.id === id)).length;
  if (n === act.length) return 'full';
  if (n > 0) return 'part';
  return ds < today() ? 'miss' : 'pend';
}
function alerts() {
  const out = [], t = today();
  S.events.forEach(e => {
    const r = Number(e.remind);
    if (!(r >= 0)) return;
    for (let k = 0; k <= r; k++) { const d = addDays(t, k); if (isStart(e, d)) { out.push({ e, k, d }); break; } }
  });
  return out.sort((a, b) => a.k - b.k);
}
const when = k => k === 0 ? 'today' : k === 1 ? 'tomorrow' : 'in ' + k + ' days';

/* ---------- rendering ---------- */
function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  document.querySelectorAll('.sec').forEach(s => s.classList.toggle('on', s.id === 'v-' + tab));
  $('#banner').innerHTML = alerts().map(a => `<div class="alert">⏰ <b>${esc(a.e.title)}</b> is ${when(a.k)}${a.e.time ? ' at ' + esc(a.e.time) : ''}</div>`).join('');
  if (tab === 'cal') rCal();
  if (tab === 'daily') rDaily();
  if (tab === 'up') rUp();
  if (tab === 'week') rWeek();
}
function evRows(ds) {
  const list = eventsOn(ds);
  if (!list.length) return '<div class="mute">Nothing planned.</div>';
  return list.map(e => {
    const start = isStart(e, ds), n = e.end && e.repeat === 'none' ? diff(e.date, e.end) + 1 : 1, i = diff(e.date, ds);
    const plan = (e.plan || '').split('\n').map(s => s.trim()).filter(Boolean);
    const dayPlan = n > 1 ? `<div style="margin:6px 0"><span class="tag" style="background:${cat(e)[1]}">Day ${i + 1} of ${n}</span> ${esc(plan[i] || 'Free day')}</div>` : '';
    const items = start ? (e.items || []).map((it, k) => `<label class="row"><input type="checkbox" data-a="item" data-e="${e.id}" data-i="${k}" ${it.d ? 'checked' : ''}><span class="grow ${it.d ? 'done' : ''}">${esc(it.t)}</span></label>`).join('') : '';
    return `<div class="card" style="margin:8px 0;border-left:4px solid ${cat(e)[1]}"><div class="bar" style="margin:0"><div><b>${esc(e.title)}</b> ${e.repeat && e.repeat !== 'none' ? '<span class="mute">(' + e.repeat + ')</span>' : ''}<div class="mute">${cat(e)[0]} · ${e.time ? esc(e.time) : 'All day'}</div></div><button class="g" data-a="edit" data-e="${e.id}">Edit</button></div>${dayPlan}${items}</div>`;
  }).join('');
}
function habRows(ds) {
  const act = S.habits.filter(h => h.start <= ds);
  if (!act.length) return '<div class="mute">No daily tasks yet. Add some in the Daily tab.</div>';
  const fut = ds > today(), dn = S.done[ds] || [];
  return act.map(h => `<label class="row"><input type="checkbox" data-a="hab" data-h="${h.id}" data-d="${ds}" ${dn.includes(h.id) ? 'checked' : ''} ${fut ? 'disabled' : ''}><span class="grow ${dn.includes(h.id) ? 'done' : ''}">${esc(h.t)}</span></label>`).join('');
}
function rCal() {
  const y = view.getFullYear(), m = view.getMonth(), lead = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
  let h = `<div class="card"><div class="bar"><button data-a="prev">‹</button><b>${view.toLocaleString('en', { month: 'long', year: 'numeric' })}</b><span><button data-a="now">Today</button> <button data-a="next">›</button></span></div><div class="grid">` + 'SMTWTFS'.split('').map(x => `<div class="dow">${x}</div>`).join('');
  for (let i = 0; i < lead; i++) h += '<div></div>';
  for (let d = 1; d <= dim; d++) {
    const ds = y + '-' + pad(m + 1) + '-' + pad(d), ev = eventsOn(ds).slice(0, 3);
    h += `<button class="cell ${ds === sel ? 'sel' : ''} ${ds === today() ? 'tod' : ''}" data-a="sel" data-d="${ds}"><span>${d}</span><span class="dots">${ev.map(e => `<u style="background:${cat(e)[1]}"></u>`).join('')}</span><i class="hb ${hstat(ds)}"></i></button>`;
  }
  h += `</div><div class="leg"><span style="--c:var(--ok)">All tasks done</span><span style="--c:var(--part)">Some done</span><span style="--c:var(--miss)">Missed</span>${Object.values(CATS).map(c => `<span style="--c:${c[1]}">${c[0].split(' ')[1]}</span>`).join('')}</div></div>`;
  h += `<div class="card"><div class="bar"><b>${nice(sel)}</b><button class="p" data-a="new" data-d="${sel}">+ Add event</button></div>${evRows(sel)}<div style="margin-top:10px"><b>Daily tasks</b>${habRows(sel)}</div></div>`;
  $('#v-cal').innerHTML = h;
}
function rDaily() {
  const t = today(); let full = 0, miss = 0, strip = '';
  for (let i = 13; i >= 0; i--) {
    const d = addDays(t, -i), s = hstat(d);
    if (s === 'full') full++; if (s === 'miss') miss++;
    strip += `<div style="text-align:center"><i class="hb ${s}" style="display:block;width:18px;height:18px;border-radius:5px;margin:auto"></i><div class="mute" style="font-size:10px">${parse(d).getDate()}</div></div>`;
  }
  $('#v-daily').innerHTML = `<div class="card"><div class="bar"><b>Today</b><span class="mute">${nice(t)}</span></div>${habRows(t)}</div>
  <div class="card"><b>Last 14 days</b><div style="display:flex;gap:4px;justify-content:space-between;margin:10px 0">${strip}</div><div class="mute">${full} days fully done · ${miss} days missed</div></div>
  <div class="card"><b>My daily tasks</b><div style="display:flex;gap:8px;margin:8px 0"><input id="newhab" placeholder="e.g. Drink 2L water"><button class="p" data-a="addhab">Add</button></div>${S.habits.map(h => `<div class="row"><span class="grow">${esc(h.t)}</span><button class="g" data-a="delhab" data-h="${h.id}">Remove</button></div>`).join('') || '<div class="mute">Nothing yet.</div>'}</div>`;
}
function rUp() {
  const t = today(), out = [];
  for (let i = 0; i < 366; i++) { const d = addDays(t, i); eventsOn(d).forEach(e => { if (isStart(e, d)) out.push({ e, d, i }); }); }
  $('#v-up').innerHTML = `<div class="card"><div class="bar"><b>Next 12 months</b><button class="p" data-a="new" data-d="${t}">+ Add event</button></div>` +
    (out.slice(0, 60).map(o => `<div class="row"><div class="grow"><b>${esc(o.e.title)}</b><div class="mute">${cat(o.e)[0]} · ${nice(o.d)}${o.e.end && o.e.repeat === 'none' ? ' → ' + nice(o.e.end) : ''}</div></div><span class="tag" style="background:${cat(o.e)[1]}">${o.i === 0 ? 'today' : 'in ' + o.i + 'd'}</span><button class="g" data-a="edit" data-e="${o.e.id}">Edit</button></div>`).join('') || '<div class="mute">No events yet. Add a birthday or trip to begin.</div>') + '</div>';
}

/* ---------- weekly review ---------- */
let reviewText = '';
function weekData() {
  const mon = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7 + wk * 7); return fmt(d); })();
  const days = [...Array(7)].map((_, i) => addDays(mon, i)), t = today();
  let poss = 0, don = 0;
  const per = S.habits.map(h => {
    let p = 0, d = 0;
    days.forEach(x => { if (h.start <= x && x <= t) { p++; if ((S.done[x] || []).includes(h.id)) d++; } });
    poss += p; don += d; return { h, p, d };
  }).filter(x => x.p);
  const evs = []; days.forEach(x => eventsOn(x).forEach(e => { if (isStart(e, x)) evs.push({ e, x }); }));
  const next = []; for (let i = 7; i < 14; i++) { const x = addDays(mon, i); eventsOn(x).forEach(e => { if (isStart(e, x)) next.push({ e, x }); }); }
  return { mon, days, per, poss, don, evs, next, pct: poss ? Math.round(don / poss * 100) : 0, missed: days.filter(x => hstat(x) === 'miss') };
}
function rWeek() {
  const w = weekData();
  const strip = w.days.map(d => `<div style="text-align:center"><i class="hb ${hstat(d)}" style="display:block;width:28px;height:28px;border-radius:8px;margin:auto"></i><div class="mute" style="font-size:11px">${parse(d).toLocaleDateString('en', { weekday: 'short' })}</div></div>`).join('');
  $('#v-week').innerHTML = `<div class="card"><div class="bar"><button data-a="wprev">‹</button><b>${nice(w.days[0])} – ${nice(w.days[6])}</b><button data-a="wnext">›</button></div>
  <div style="display:flex;justify-content:space-between;margin:10px 0">${strip}</div>
  <div class="stat"><div><b>${w.pct}%</b><span class="mute">tasks done</span></div><div><b>${w.missed.length}</b><span class="mute">days missed</span></div><div><b>${w.evs.length}</b><span class="mute">events</span></div></div></div>
  <div class="card"><b>By daily task</b>${w.per.map(x => `<div class="row"><span class="grow">${esc(x.h.t)}</span><span class="mute">${x.d}/${x.p} days</span></div>`).join('') || '<div class="mute">No daily tasks tracked yet.</div>'}</div>
  <div class="card"><b>This week’s events</b>${w.evs.map(o => `<div class="row"><span class="grow">${esc(o.e.title)}<div class="mute">${nice(o.x)}${o.e.items && o.e.items.length ? ' · checklist ' + o.e.items.filter(i => i.d).length + '/' + o.e.items.length : ''}</div></span></div>`).join('') || '<div class="mute">No events.</div>'}</div>
  <div class="card"><b>Coming next week</b>${w.next.map(o => `<div class="row"><span class="grow">${esc(o.e.title)}<div class="mute">${nice(o.x)}</div></span></div>`).join('') || '<div class="mute">Nothing planned yet.</div>'}</div>
  <div class="card"><div class="bar"><b>Friendly review</b><button class="p" data-a="reflect">Ask my friend</button></div><div id="reflect" style="white-space:pre-wrap">${esc(reviewText) || '<span class="mute">Get a short, honest look back at your week and a plan for the next one (needs your OpenAI key in Settings).</span>'}</div></div>`;
}
async function reflect() {
  const w = weekData(), box = $('#reflect');
  box.textContent = 'Thinking…';
  const sum = `Week ${w.days[0]} to ${w.days[6]}. Daily tasks done: ${w.pct}%. Missed days: ${w.missed.length}. ` +
    `Per task: ${w.per.map(x => x.h.t + ' ' + x.d + '/' + x.p).join('; ') || 'none'}. Events: ${w.evs.map(o => o.e.title).join('; ') || 'none'}. Next week: ${w.next.map(o => o.e.title + ' on ' + o.x).join('; ') || 'nothing yet'}.`;
  try {
    reviewText = await gpt('You are a warm, honest friend reviewing the user’s week. In under 130 words: one thing that went well, one thing to improve, and 3 concrete suggestions for next week. Plain text, no markdown.', sum, false);
    box.textContent = reviewText;
  } catch (e) { box.textContent = errText(e); }
}

/* ---------- event form ---------- */
function openForm(id, date) {
  const e = S.events.find(x => x.id === id) || { title: '', cat: 'other', date: date || today(), end: '', time: '', repeat: 'none', remind: 1, items: [], plan: '' };
  $('#sheet').innerHTML = `<h3 style="margin:0 0 6px">${id ? 'Edit event' : 'New event'}</h3>
  <label>What is it?</label><input id="f-t" value="${esc(e.title)}" placeholder="e.g. Amma’s birthday, Goa trip">
  <div class="two"><div><label>Category</label><select id="f-c">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${k === (e.cat || 'other') ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
  <div><label>Time (optional)</label><input id="f-tm" type="time" value="${e.time || ''}"></div></div>
  <div class="two"><div><label>Date</label><input id="f-d" type="date" value="${e.date}"></div><div><label>End date (multi-day trips)</label><input id="f-e" type="date" value="${e.end || ''}"></div></div>
  <div class="two"><div><label>Repeat</label><select id="f-r">${['none', 'yearly', 'monthly', 'weekly'].map(o => `<option ${o === (e.repeat || 'none') ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
  <div><label>Remind me</label><select id="f-m">${[[-1, 'No reminder'], [0, 'On the day'], [1, '1 day before'], [3, '3 days before'], [7, '1 week before'], [14, '2 weeks before']].map(([v, l]) => `<option value="${v}" ${Number(e.remind) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
  <label>Checklist (one item per line)</label><textarea id="f-i" rows="4" placeholder="Book tickets&#10;Pack charger">${esc((e.items || []).map(i => i.t).join('\n'))}</textarea>
  <label>Day-by-day itinerary (one line per day, needs an end date)</label><textarea id="f-p" rows="4" placeholder="Beach and seafood lunch&#10;Old Goa churches">${esc(e.plan || '')}</textarea>
  <div style="display:flex;gap:8px;margin-top:14px"><button class="p" data-a="saveev" data-e="${id || ''}" style="flex:1">Save</button><button data-a="close">Cancel</button>${id ? '<button data-a="delev" data-e="' + id + '" style="color:var(--miss)">Delete</button>' : ''}</div>`;
  $('#modal').hidden = false;
}
function saveEv(id) {
  const title = $('#f-t').value.trim(), date = $('#f-d').value;
  let end = $('#f-e').value;
  if (!title || !date) { alert('Please add a title and a date.'); return; }
  if (end && end < date) end = '';
  const old = S.events.find(x => x.id === id), prev = Object.fromEntries(((old && old.items) || []).map(i => [i.t, i.d]));
  const items = $('#f-i').value.split('\n').map(s => s.trim()).filter(Boolean).map(t => ({ t, d: !!prev[t] }));
  const ev = { id: id || uid(), title, cat: $('#f-c').value, date, end, time: $('#f-tm').value, repeat: $('#f-r').value, remind: Number($('#f-m').value), items, plan: $('#f-p').value.trim() };
  if (old) Object.assign(old, ev); else S.events.push(ev);
  sel = date; view = parse(date); view.setDate(1);
  $('#modal').hidden = true; save(); render();
}

/* ---------- settings, backup ---------- */
function openCfg() {
  const c = cfg();
  $('#sheet').innerHTML = `<h3 style="margin:0 0 6px">Settings</h3>
  <label>OpenAI API key (stays in this browser only)</label><input id="c-k" type="password" value="${esc(c.key || '')}" placeholder="sk-...">
  <label>Model</label><input id="c-m" value="${esc(c.model || 'gpt-4o-mini')}">
  <div class="mute" style="margin-top:8px">Your key is sent only to api.openai.com. Do not use this on a shared computer, and never commit a key to GitHub.</div>
  <label>Backup</label><div style="display:flex;gap:8px"><button data-a="export">Download backup</button><button data-a="import">Restore backup</button></div>
  <input id="c-f" type="file" accept=".json" hidden>
  <div style="display:flex;gap:8px;margin-top:14px"><button class="p" data-a="savecfg" style="flex:1">Save</button><button data-a="close">Close</button></div>`;
  $('#modal').hidden = false;
  $('#c-f').onchange = async e => {
    try { const d = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(d.events)) throw 0; S = Object.assign({ events: [], habits: [], done: {} }, d); save(); $('#modal').hidden = true; render(); } catch (x) { alert('That file is not a valid planner backup.'); }
  };
}
function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
  a.download = 'planner-backup-' + today() + '.json'; a.click();
}

/* ---------- AI friend (OpenAI) ---------- */
async function gpt(system, user, json) {
  const c = cfg();
  if (!c.key) throw { nokey: 1 };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.key },
    body: JSON.stringify({ model: c.model || 'gpt-4o-mini', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], ...(json ? { response_format: { type: 'json_object' } } : {}) })
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || 'Request failed (' + r.status + ')');
  return j.choices[0].message.content;
}
const errText = e => e && e.nokey ? 'Add your OpenAI API key in ⚙️ Settings first.' : 'Something went wrong: ' + (e && e.message || e);
function addMsg(who, text, extra) {
  const d = document.createElement('div'); d.className = 'm ' + who; d.textContent = text;
  $('#msgs').appendChild(d); if (extra) $('#msgs').appendChild(extra);
  d.scrollIntoView({ block: 'nearest' }); return d;
}
function proposal(p) {
  const box = document.createElement('div'); box.className = 'card'; box.style.margin = '0';
  const evs = (p.events || []).filter(e => e && e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''));
  const habs = (p.habits || []).filter(Boolean);
  box.innerHTML = '<b>Suggested for your planner</b>' + evs.map(e => `<div class="row"><div class="grow"><b>${esc(e.title)}</b><div class="mute">${nice(e.date)}${e.end ? ' → ' + nice(e.end) : ''}${(e.items || []).length ? ' · ' + e.items.length + ' checklist items' : ''}${(e.plan || []).length ? ' · itinerary' : ''}</div></div></div>`).join('') + habs.map(h => `<div class="row"><span class="grow">Daily: ${esc(h)}</span></div>`).join('') + '<button class="p" style="margin-top:8px">Add all to my planner</button>';
  box.querySelector('button').onclick = function () {
    evs.forEach(e => S.events.push({ id: uid(), title: String(e.title), cat: CATS[e.cat] ? e.cat : 'other', date: e.date, end: /^\d{4}-\d{2}-\d{2}$/.test(e.end || '') && e.end >= e.date ? e.end : '', time: e.time || '', repeat: ['yearly', 'monthly', 'weekly'].includes(e.repeat) ? e.repeat : 'none', remind: Number.isFinite(Number(e.remind)) ? Number(e.remind) : 1, items: (e.items || []).map(t => ({ t: String(t), d: false })), plan: (e.plan || []).join('\n') }));
    habs.forEach(h => S.habits.push({ id: uid(), t: String(h), start: today() }));
    save(); render(); this.disabled = true; this.textContent = 'Added ✓';
  };
  return box;
}
async function ask() {
  const inp = $('#chatin'), text = inp.value.trim();
  if (!text) return;
  inp.value = ''; hist.push({ r: 'You', c: text }); addMsg('u', text);
  const wait = addMsg('a', 'Thinking…');
  const sys = `You are a warm, practical planning friend inside a personal calendar app. Today is ${today()}. Existing events: ${S.events.slice(0, 40).map(e => e.title + ' (' + e.date + ')').join('; ') || 'none'}. Existing daily tasks: ${S.habits.map(h => h.t).join('; ') || 'none'}.
Talk like a friend: short and kind. If key details are missing (exact dates, duration, who is going, budget, interests), ask at most 2 short questions and propose nothing yet. Once you have enough, propose concrete events with future dates, categories, reminders, ordered checklists (for trips: documents, bookings, packing, before-leaving tasks) and, for multi-day trips, an end date and one itinerary line per day. Suggest daily habits only when asked for a routine.
Reply with ONLY a JSON object: {"say":"message","events":[{"title":"","cat":"birthday|travel|bills|work|health|other","date":"YYYY-MM-DD","end":"YYYY-MM-DD or empty","time":"HH:MM or empty","repeat":"none|yearly|monthly|weekly","remind":1,"items":["..."],"plan":["Day 1 ...","Day 2 ..."]}],"habits":["..."]}. Use empty arrays when not proposing.`;
  try {
    const t = await gpt(sys, hist.map(m => m.r + ': ' + m.c).join('\n'), true);
    let p; try { p = JSON.parse(t); } catch (e) { p = { say: t }; }
    wait.remove(); hist.push({ r: 'Friend', c: p.say || '' });
    addMsg('a', p.say || '', (p.events && p.events.length) || (p.habits && p.habits.length) ? proposal(p) : null);
  } catch (e) { wait.textContent = errText(e); }
}

/* ---------- browser alerts ---------- */
function notify() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  let n = {}; try { n = JSON.parse(localStorage.getItem('planner.notified') || '{}'); } catch (e) { }
  alerts().forEach(a => { const k = a.e.id + a.d; if (n[k]) return; n[k] = 1; try { new Notification(a.e.title, { body: 'Coming up ' + when(a.k) }); } catch (e) { } });
  try { localStorage.setItem('planner.notified', JSON.stringify(n)); } catch (e) { }
}
$('#bell').onclick = async () => {
  if (!('Notification' in window)) { alert('Alerts are not supported here. The banner at the top still shows reminders.'); return; }
  const p = await Notification.requestPermission();
  $('#bell').textContent = p === 'granted' ? '🔔 Alerts on' : '🔕 Alerts blocked'; notify();
};
$('#cfg').onclick = openCfg;
if ('Notification' in window && Notification.permission === 'granted') $('#bell').textContent = '🔔 Alerts on';

/* ---------- cloud sync (Supabase) ---------- */
const sb = (window.supabase && window.PLANNER_CFG) ? supabase.createClient(PLANNER_CFG.url, PLANNER_CFG.key) : null;
let user = null, pushT = null, cloud = 'out';
function badge() { $('#acct').textContent = !sb ? '☁️ Off' : cloud === 'ok' ? '☁️ Synced' : cloud === 'busy' ? '☁️ Syncing…' : cloud === 'err' ? '☁️ Offline' : '☁️ Sign in'; }
function push() {
  if (!sb || !user) return;
  S.ts = S.ts || Date.now(); clearTimeout(pushT); cloud = 'busy'; badge();
  pushT = setTimeout(async () => {
    const { error } = await sb.from('planner').upsert({ user_id: user.id, data: S, updated_at: new Date().toISOString() });
    cloud = error ? 'err' : 'ok'; badge();
  }, 800);
}
async function pull() {
  if (!sb || !user) return;
  cloud = 'busy'; badge();
  const { data, error } = await sb.from('planner').select('data').eq('user_id', user.id).maybeSingle();
  if (error) { cloud = 'err'; badge(); return; }
  const r = data && data.data;
  if (r && Array.isArray(r.events) && (r.ts || 0) > (S.ts || 0)) {
    try { localStorage.setItem('planner.prev', JSON.stringify(S)); } catch (e) { }
    S = Object.assign({ events: [], habits: [], done: {} }, r);
    try { localStorage.setItem('planner.v1', JSON.stringify(S)); } catch (e) { }
    render(); cloud = 'ok'; badge();
  } else if (!r || (S.ts || 0) > (r.ts || 0)) push();
  else { cloud = 'ok'; badge(); }
}
function openAcct() {
  if (!sb) { alert('Cloud sync needs an internet connection the first time. Reload and try again.'); return; }
  $('#sheet').innerHTML = user
    ? `<h3 style="margin:0 0 6px">Account</h3><div>Signed in as <b>${esc(user.email)}</b></div><div class="mute" style="margin-top:6px">Your planner syncs automatically across every device where you sign in.</div>
       <div style="display:flex;gap:8px;margin-top:14px"><button class="p" data-a="syncnow" style="flex:1">Sync now</button><button data-a="signout">Sign out</button><button data-a="close">Close</button></div>`
    : `<h3 style="margin:0 0 6px">Sign in to sync</h3><div class="mute">Use the same email and password on your phone and computer.</div>
       <label>Email</label><input id="a-e" type="email" autocomplete="email"><label>Password (6+ characters)</label><input id="a-p" type="password" autocomplete="current-password">
       <div id="a-m" class="mute" style="margin-top:8px"></div>
       <div style="display:flex;gap:8px;margin-top:14px"><button class="p" data-a="signin" style="flex:1">Sign in</button><button data-a="signup">Create account</button><button data-a="close">Close</button></div>`;
  $('#modal').hidden = false;
}
async function doAuth(up) {
  const email = $('#a-e').value.trim(), password = $('#a-p').value, m = $('#a-m');
  if (!email || password.length < 6) { m.textContent = 'Enter your email and a password of at least 6 characters.'; return; }
  m.textContent = 'Please wait…';
  const r = up ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
  if (r.error) { m.textContent = r.error.message; return; }
  if (!r.data.session) { m.textContent = 'Check your email to confirm your account, then sign in.'; return; }
  $('#modal').hidden = true;
}
if (sb) sb.auth.onAuthStateChange((ev, session) => { user = session ? session.user : null; if (user) setTimeout(pull, 0); else { cloud = 'out'; badge(); } });
$('#acct').onclick = openAcct;
document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
window.addEventListener('online', pull);
badge();

/* ---------- wiring ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-t],[data-a]');
  if (!b) return;
  if (b.dataset.t) { tab = b.dataset.t; render(); return; }
  const a = b.dataset.a;
  if (a === 'prev' || a === 'next') { view.setMonth(view.getMonth() + (a === 'next' ? 1 : -1)); render(); }
  else if (a === 'now') { sel = today(); view = new Date(); view.setDate(1); render(); }
  else if (a === 'sel') { sel = b.dataset.d; render(); }
  else if (a === 'new') openForm(null, b.dataset.d);
  else if (a === 'edit') openForm(b.dataset.e);
  else if (a === 'close') $('#modal').hidden = true;
  else if (a === 'saveev') saveEv(b.dataset.e || null);
  else if (a === 'delev') { if (confirm('Delete this event?')) { S.events = S.events.filter(e => e.id !== b.dataset.e); $('#modal').hidden = true; save(); render(); } }
  else if (a === 'addhab') { const t = $('#newhab').value.trim(); if (t) { S.habits.push({ id: uid(), t, start: today() }); save(); render(); } }
  else if (a === 'delhab') { if (confirm('Remove this daily task? Past records stay.')) { S.habits = S.habits.filter(h => h.id !== b.dataset.h); save(); render(); } }
  else if (a === 'wprev') { wk--; reviewText = ''; render(); }
  else if (a === 'wnext') { wk++; reviewText = ''; render(); }
  else if (a === 'reflect') reflect();
  else if (a === 'savecfg') { localStorage.setItem('planner.cfg', JSON.stringify({ key: $('#c-k').value.trim(), model: $('#c-m').value.trim() })); $('#modal').hidden = true; }
  else if (a === 'export') exportData();
  else if (a === 'import') $('#c-f').click();
  else if (a === 'signin') doAuth(false);
  else if (a === 'signup') doAuth(true);
  else if (a === 'signout') { sb.auth.signOut(); $('#modal').hidden = true; }
  else if (a === 'syncnow') { $('#modal').hidden = true; pull(); }
  else if (b.id === 'send') ask();
});
document.addEventListener('change', ev => {
  const c = ev.target, a = c.dataset && c.dataset.a;
  if (a === 'item') { const e = S.events.find(x => x.id === c.dataset.e); if (e) { e.items[c.dataset.i].d = c.checked; save(); render(); } }
  if (a === 'hab') { const d = c.dataset.d, l = S.done[d] || (S.done[d] = []), i = l.indexOf(c.dataset.h); if (c.checked && i < 0) l.push(c.dataset.h); if (!c.checked && i >= 0) l.splice(i, 1); save(); render(); }
});
$('#chatin').addEventListener('keydown', e => { if (e.key === 'Enter') ask(); });
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') $('#modal').hidden = true; });

try { const l = JSON.parse(localStorage.getItem('planner.v1') || 'null'); if (l) S = Object.assign(S, l); } catch (e) { }
render(); notify(); setInterval(() => { const t = (document.activeElement || {}).tagName; if (t !== 'INPUT' && t !== 'TEXTAREA' && t !== 'SELECT' && $('#modal').hidden) render(); notify(); }, 60000);
addMsg('a', 'Hi! Tell me what you want to plan, like a trip, a birthday, or a new routine, and I will help you organise it.');

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
