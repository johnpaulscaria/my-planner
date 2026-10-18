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

const BLANK = () => ({ events: [], habits: [], done: {}, books: [], reads: {}, words: [] });
let S = BLANK(), tab = 'cal', sel = today(), view = new Date(), wk = 0, hist = [];
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
  const n = act.filter(h => hdone(h, ds)).length;
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
  if (tab === 'books') rBooks();
  if (tab === 'words') rWords();
  if (tab === 'dash') rDash();
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
  const fut = ds > today();
  return act.map(h => { const dn = hdone(h, ds), auto = !!h.auto; return `<label class="row"><input type="checkbox" data-a="hab" data-h="${h.id}" data-d="${ds}" ${dn ? 'checked' : ''} ${fut || auto ? 'disabled' : ''}><span class="grow ${dn ? 'done' : ''}">${esc(h.t)}${auto ? ' <span class="mute">(' + (h.auto === 'read' ? 'ticks when you log pages' : 'ticks when you add a word') + ')</span>' : ''}</span></label>`; }).join('');
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
  h += `<div class="card"><div class="bar"><b>${nice(sel)}</b><button class="p" data-a="new" data-d="${sel}">+ Add event</button></div>${evRows(sel)}<div style="margin-top:10px"><b>Daily tasks</b>${habRows(sel)}</div>${dayExtras(sel)}</div>`;
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
  <div class="card"><b>My daily tasks</b><div style="display:flex;gap:8px;margin:8px 0"><input id="newhab" placeholder="e.g. Drink 2L water"><button class="p" data-a="addhab">Add</button></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px"><button data-a="addauto" data-k="read">+ Reading habit</button><button data-a="addauto" data-k="vocab">+ New-word habit</button></div>${S.habits.map(h => `<div class="row"><span class="grow">${esc(h.t)}</span><button class="g" data-a="delhab" data-h="${h.id}">Remove</button></div>`).join('') || '<div class="mute">Nothing yet.</div>'}</div>`;
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
    days.forEach(x => { if (h.start <= x && x <= t) { p++; if (hdone(h, x)) d++; } });
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

/* ---------- books, words, dashboard ---------- */
let per = 'week', poff = 0, rd = today(), wq = '', wf = 'all', card = null;
const bookById = id => S.books.find(b => b.id === id);
const pagesOn = ds => Object.values(S.reads[ds] || {}).reduce((a, b) => a + b, 0);
const wordsOn = ds => S.words.filter(w => w.date === ds).length;
const pagesFor = id => Object.values(S.reads).reduce((a, d) => a + (d[id] || 0), 0);
const srcName = w => { const b = bookById(w.src); return b ? b.title : (w.srcText || ''); };
const hdone = (h, ds) => h.auto === 'read' ? pagesOn(ds) > 0 : h.auto === 'vocab' ? wordsOn(ds) > 0 : (S.done[ds] || []).includes(h.id);
const bname = id => (bookById(id) || { title: '(deleted book)' }).title;
const box = (n, l) => `<div><b>${n}</b><span class="mute">${l}</span></div>`;
const dayExtras = ds => { const p = pagesOn(ds), w = S.words.filter(x => x.date === ds); return `<div style="margin-top:10px"><b>Reading and words</b><div class="mute">${p ? '📖 ' + p + ' pages read' : 'No pages logged'}${w.length ? ' · 🔤 ' + w.map(x => esc(x.w)).join(', ') : ''}</div></div>`; };

function range() {
  const t = new Date(); t.setHours(0, 0, 0, 0); let a, b, label;
  const sd = d => d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
  if (per === 'week') { a = new Date(t); a.setDate(a.getDate() - (a.getDay() + 6) % 7 + poff * 7); b = new Date(a); b.setDate(b.getDate() + 6); label = sd(a) + ' – ' + sd(b) + ', ' + b.getFullYear(); }
  else if (per === 'month') { a = new Date(t.getFullYear(), t.getMonth() + poff, 1); b = new Date(a.getFullYear(), a.getMonth() + 1, 0); label = a.toLocaleString('en', { month: 'long', year: 'numeric' }); }
  else { a = new Date(t.getFullYear() + poff, 0, 1); b = new Date(a.getFullYear(), 11, 31); label = String(a.getFullYear()); }
  return { a: fmt(a), b: fmt(b), label };
}
function stats(r) {
  const t = today(), inR = d => d >= r.a && d <= r.b;
  let pages = 0, days = 0, best = 0, poss = 0, done = 0, full = 0, miss = 0, ev = 0; const byBook = {};
  Object.keys(S.reads).forEach(d => {
    if (!inR(d)) return;
    const n = pagesOn(d); if (n > 0) { pages += n; days++; best = Math.max(best, n); }
    Object.entries(S.reads[d]).forEach(([id, k]) => { byBook[id] = (byBook[id] || 0) + k; });
  });
  for (let d = r.a; d <= r.b && d <= t; d = addDays(d, 1)) {
    S.habits.filter(h => h.start <= d).forEach(h => { poss++; if (hdone(h, d)) done++; });
    const st = hstat(d); if (st === 'full') full++; if (st === 'miss') miss++;
  }
  for (let d = r.a; d <= r.b; d = addDays(d, 1)) S.events.forEach(e => { if (isStart(e, d)) ev++; });
  return {
    pages, days, best, avg: days ? Math.round(pages / days) : 0, full, miss, ev, pct: poss ? Math.round(done / poss * 100) : 0,
    fin: S.books.filter(b => b.status === 'done' && b.finished && inR(b.finished)).length,
    started: S.books.filter(b => b.started && inR(b.started)).length,
    words: S.words.filter(w => inR(w.date)).length, mast: S.words.filter(w => w.mDate && inR(w.mDate)).length,
    top: Object.entries(byBook).sort((x, y) => y[1] - x[1]).slice(0, 5)
  };
}
function chart(r) {
  const bars = [];
  if (per === 'year') for (let m = 0; m < 12; m++) { const pre = r.a.slice(0, 4) + '-' + pad(m + 1); bars.push({ l: 'JFMAMJJASOND'[m], v: Object.keys(S.reads).filter(d => d.startsWith(pre)).reduce((x, d) => x + pagesOn(d), 0) }); }
  else for (let d = r.a; d <= r.b; d = addDays(d, 1)) bars.push({ l: per === 'week' ? parse(d).toLocaleDateString('en', { weekday: 'narrow' }) : String(parse(d).getDate()), v: pagesOn(d) });
  const mx = Math.max(1, ...bars.map(x => x.v));
  return `<div style="display:flex;gap:3px;align-items:flex-end;height:96px">${bars.map(x => `<div style="flex:1;text-align:center"><div title="${x.v} pages" style="background:var(--acc);border-radius:4px 4px 0 0;height:${Math.round(x.v / mx * 70)}px;min-height:${x.v ? 2 : 0}px"></div><div class="mute" style="font-size:10px">${x.l}</div></div>`).join('')}</div><div class="mute" style="margin-top:4px">Pages read ${per === 'year' ? 'per month' : 'per day'}</div>`;
}
function dashBar() {
  const r = range();
  return `<div class="bar"><span>${['week', 'month', 'year'].map(p => `<button data-a="per" data-p="${p}" class="${per === p ? 'p' : ''}">${p[0].toUpperCase() + p.slice(1)}</button>`).join(' ')}</span><span><button data-a="pprev">‹</button> <b style="margin:0 4px">${r.label}</b> <button data-a="pnext">›</button></span></div>`;
}
function rDash() {
  const r = range(), s = stats(r);
  $('#v-dash').innerHTML = `<div class="card">${dashBar()}</div>
  <div class="card"><b>📚 Reading</b><div class="stat" style="margin-top:8px">${box(s.pages, 'pages read')}${box(s.days, 'reading days')}${box(s.avg, 'avg pages/day')}${box(s.best, 'best day')}${box(s.fin, 'books finished')}${box(s.started, 'books started')}</div><div style="margin-top:12px">${chart(r)}</div>${s.top.length ? '<div style="margin-top:10px">' + s.top.map(([id, n]) => `<div class="row"><span class="grow">${esc(bname(id))}</span><span class="mute">${n} pages</span></div>`).join('') + '</div>' : ''}</div>
  <div class="card"><b>🔤 Vocabulary</b><div class="stat" style="margin-top:8px">${box(s.words, 'new words')}${box(s.mast, 'mastered')}${box(S.words.length, 'words in total')}</div></div>
  <div class="card"><b>✅ Daily tasks and events</b><div class="stat" style="margin-top:8px">${box(s.pct + '%', 'tasks done')}${box(s.full, 'perfect days')}${box(s.miss, 'missed days')}${box(s.ev, 'events')}</div></div>`;
}

/* books */
const bookRow = b => {
  const n = pagesFor(b.id), pc = b.pages ? Math.min(100, Math.round(n / b.pages * 100)) : 0;
  return `<div class="row" style="align-items:flex-start"><div class="grow"><b>${esc(b.title)}</b>${b.author ? ' <span class="mute">by ' + esc(b.author) + '</span>' : ''}<div class="mute">${n}${b.pages ? ' / ' + b.pages : ''} pages${b.rating ? ' · ' + '★'.repeat(b.rating) : ''}${b.finished ? ' · finished ' + b.finished : ''}</div>${b.pages ? `<div class="hb" style="width:100%;margin-top:4px"><div style="height:4px;border-radius:2px;background:var(--acc);width:${pc}%"></div></div>` : ''}${b.thoughts ? `<div class="mute" style="margin-top:4px;white-space:pre-wrap">“${esc(b.thoughts.slice(0, 140))}${b.thoughts.length > 140 ? '…' : ''}”</div>` : ''}</div><button class="g" data-a="editbook" data-b="${b.id}">Open</button></div>`;
};
function rBooks() {
  const r = range(), s = stats(r), opts = S.books.filter(b => b.status !== 'done');
  const entries = Object.entries(S.reads[rd] || {}).map(([id, n]) => `<div class="row"><span class="grow">${esc(bname(id))}</span><span>${n} pages</span><button class="g" data-a="unlog" data-d="${rd}" data-b="${id}">✕</button></div>`).join('');
  const grp = (st, ttl) => { const l = S.books.filter(b => b.status === st); return l.length ? `<div class="card"><b>${ttl}</b>${l.map(bookRow).join('')}</div>` : ''; };
  $('#v-books').innerHTML = `<div class="card">${dashBar()}<div class="stat">${box(s.pages, 'pages read')}${box(s.days, 'reading days')}${box(s.fin, 'books finished')}</div></div>
  <div class="card"><div class="bar"><b>Log pages read</b><input id="lg-d" type="date" value="${rd}" max="${today()}" style="width:auto"></div>
  ${opts.length ? `<div style="display:flex;gap:8px"><select id="lg-b">${opts.map(b => `<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select><input id="lg-n" type="number" min="1" placeholder="Pages" style="max-width:100px"><button class="p" data-a="logpages">Add</button></div>` : '<div class="mute">Add a book first, then log your pages here.</div>'}
  <div style="margin-top:8px">${entries}<div class="mute" style="margin-top:6px">Total on ${nice(rd)}: <b>${pagesOn(rd)}</b> pages</div></div></div>
  <div style="margin-bottom:12px"><button class="p" data-a="newbook">+ Add book</button></div>${grp('reading', 'Currently reading')}${grp('want', 'Want to read')}${grp('done', 'Finished')}`;
}
function logPages() {
  const id = $('#lg-b').value, n = Math.round(Number($('#lg-n').value));
  if (!id || !(n > 0)) { alert('Pick a book and enter the number of pages.'); return; }
  const day = S.reads[rd] || (S.reads[rd] = {}); day[id] = (day[id] || 0) + n;
  const b = bookById(id);
  if (b.status === 'want') { b.status = 'reading'; b.started = b.started || rd; }
  if (b.pages && pagesFor(id) >= b.pages && b.status !== 'done') { b.status = 'done'; b.finished = rd; }
  save(); render();
}
function openBook(id) {
  const b = bookById(id) || { title: '', author: '', pages: '', status: 'reading', started: today(), finished: '', rating: 0, thoughts: '', notes: '' };
  const ws = id ? S.words.filter(w => w.src === id) : [];
  $('#sheet').innerHTML = `<h3 style="margin:0 0 6px">${id ? 'Book' : 'New book'}</h3>
  <label>Title</label><input id="b-t" value="${esc(b.title)}">
  <div class="two"><div><label>Author</label><input id="b-a" value="${esc(b.author)}"></div><div><label>Total pages</label><input id="b-p" type="number" min="1" value="${b.pages || ''}"></div></div>
  <div class="two"><div><label>Status</label><select id="b-s">${[['want', 'Want to read'], ['reading', 'Reading'], ['done', 'Finished']].map(([v, l]) => `<option value="${v}" ${b.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div><label>My rating</label><select id="b-r">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${b.rating === n ? 'selected' : ''}>${n ? '★'.repeat(n) : 'Not rated'}</option>`).join('')}</select></div></div>
  <div class="two"><div><label>Started</label><input id="b-st" type="date" value="${b.started || ''}"></div><div><label>Finished</label><input id="b-f" type="date" value="${b.finished || ''}"></div></div>
  <label>My thoughts and review</label><textarea id="b-th" rows="5">${esc(b.thoughts)}</textarea>
  <label>Favourite quotes and notes</label><textarea id="b-n" rows="3">${esc(b.notes)}</textarea>
  ${id ? `<div class="mute" style="margin-top:8px">${pagesFor(id)} pages logged · ${ws.length} words learned from this book${ws.length ? ': ' + ws.slice(0, 8).map(w => esc(w.w)).join(', ') : ''}</div>` : ''}
  <div style="display:flex;gap:8px;margin-top:14px"><button class="p" data-a="savebook" data-b="${id || ''}" style="flex:1">Save</button><button data-a="close">Cancel</button>${id ? '<button data-a="delbook" data-b="' + id + '" style="color:var(--miss)">Delete</button>' : ''}</div>`;
  $('#modal').hidden = false;
}
function saveBook(id) {
  const title = $('#b-t').value.trim();
  if (!title) { alert('Please add a title.'); return; }
  const st = $('#b-s').value;
  const o = { title, author: $('#b-a').value.trim(), pages: Number($('#b-p').value) || 0, status: st, rating: Number($('#b-r').value), started: $('#b-st').value, finished: $('#b-f').value, thoughts: $('#b-th').value.trim(), notes: $('#b-n').value.trim() };
  if (st !== 'want' && !o.started) o.started = today();
  if (st === 'done' && !o.finished) o.finished = today();
  if (st !== 'done') o.finished = '';
  const old = bookById(id);
  if (old) Object.assign(old, o); else S.books.push(Object.assign({ id: uid() }, o));
  $('#modal').hidden = true; save(); render();
}
function delBook(id) {
  const b = bookById(id);
  S.words.forEach(w => { if (w.src === id) { w.src = ''; w.srcText = b.title; } });
  Object.keys(S.reads).forEach(d => { delete S.reads[d][id]; if (!Object.keys(S.reads[d]).length) delete S.reads[d]; });
  S.books = S.books.filter(x => x.id !== id); $('#modal').hidden = true; save(); render();
}

/* words */
function rWords() {
  const r = range(), s = stats(r);
  $('#v-words').innerHTML = `<div class="card">${dashBar()}<div class="stat">${box(s.words, 'new words')}${box(s.mast, 'mastered')}${box(S.words.length, 'words in total')}</div></div>
  <div class="card"><div class="bar"><b>My words</b><span><button data-a="practice">Practice</button> <button class="p" data-a="newword">+ Add word</button></span></div>
  <div style="display:flex;gap:8px;margin-bottom:6px"><input id="wq" placeholder="Search words or meanings" value="${esc(wq)}"><select id="wf" style="max-width:130px">${[['all', 'All'], ['learning', 'Learning'], ['mastered', 'Mastered']].map(([v, l]) => `<option value="${v}" ${wf === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div id="wlist">${wlist()}</div></div>`;
}
function wlist() {
  const q = wq.toLowerCase();
  const l = S.words.filter(w => (wf === 'all' || (wf === 'mastered') === !!w.mastered) && (!q || (w.w + ' ' + w.meaning + ' ' + srcName(w)).toLowerCase().includes(q))).sort((a, b) => b.date.localeCompare(a.date));
  return l.map(w => `<div class="row" style="align-items:flex-start"><div class="grow"><b>${esc(w.w)}</b> ${w.mastered ? '<span class="tag" style="background:var(--ok)">mastered</span>' : ''}<div>${esc(w.meaning)}</div>${w.example ? `<div class="mute"><i>“${esc(w.example)}”</i></div>` : ''}<div class="mute">${srcName(w) ? 'From ' + esc(srcName(w)) + ' · ' : ''}${w.date}</div></div><button class="g" data-a="editword" data-w="${w.id}">Edit</button></div>`).join('') || '<div class="mute">No words yet. Add the first one you come across while reading.</div>';
}
function openWord(id) {
  const w = S.words.find(x => x.id === id) || { w: '', meaning: '', src: '', srcText: '', example: '', date: today(), mastered: false };
  $('#sheet').innerHTML = `<h3 style="margin:0 0 6px">${id ? 'Edit word' : 'New word'}</h3>
  <label>Word</label><input id="w-w" value="${esc(w.w)}">
  <label>Meaning</label><textarea id="w-m" rows="2">${esc(w.meaning)}</textarea>
  <label>Where did I find it?</label><select id="w-s"><option value="">Not a book</option>${S.books.map(b => `<option value="${b.id}" ${w.src === b.id ? 'selected' : ''}>${esc(b.title)}</option>`).join('')}</select>
  <input id="w-o" placeholder="Or type another source (article, movie, chat)" value="${esc(w.srcText || '')}" style="margin-top:6px">
  <label>Sentence where I saw it (optional)</label><textarea id="w-e" rows="2">${esc(w.example || '')}</textarea>
  <div class="two"><div><label>Date learned</label><input id="w-d" type="date" value="${w.date}"></div><div><label>Status</label><select id="w-ms"><option value="0">Learning</option><option value="1" ${w.mastered ? 'selected' : ''}>Mastered</option></select></div></div>
  <div style="display:flex;gap:8px;margin-top:14px"><button class="p" data-a="saveword" data-w="${id || ''}" style="flex:1">Save</button><button data-a="close">Cancel</button>${id ? '<button data-a="delword" data-w="' + id + '" style="color:var(--miss)">Delete</button>' : ''}</div>`;
  $('#modal').hidden = false;
}
function saveWord(id) {
  const w = $('#w-w').value.trim(), m = $('#w-m').value.trim();
  if (!w || !m) { alert('Please add the word and its meaning.'); return; }
  const mast = $('#w-ms').value === '1', src = $('#w-s').value;
  const old = S.words.find(x => x.id === id);
  const o = { w, meaning: m, src, srcText: src ? '' : $('#w-o').value.trim(), example: $('#w-e').value.trim(), date: $('#w-d').value || today(), mastered: mast, mDate: mast ? ((old && old.mDate) || today()) : '' };
  if (old) Object.assign(old, o); else S.words.push(Object.assign({ id: uid() }, o));
  $('#modal').hidden = true; save(); render();
}
function practice() {
  const pool = S.words.filter(w => !w.mastered);
  $('#modal').hidden = false;
  if (!pool.length) { $('#sheet').innerHTML = '<h3 style="margin:0 0 6px">Practice</h3><div>Nothing to practise right now. Add new words first.</div><button data-a="close" style="margin-top:12px">Close</button>'; return; }
  card = pool[Math.floor(Math.random() * pool.length)];
  $('#sheet').innerHTML = `<h3 style="margin:0 0 6px">Practice</h3><div style="font-size:28px;font-weight:700;margin:14px 0">${esc(card.w)}</div><div id="ans" class="mute" style="min-height:64px">Try to recall the meaning first.</div><div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button data-a="reveal">Show meaning</button><button data-a="again">Next word</button><button class="p" data-a="got">I know it</button><button data-a="close">Close</button></div>`;
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
    try { const d = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(d.events)) throw 0; S = Object.assign(BLANK(), d); save(); $('#modal').hidden = true; render(); } catch (x) { alert('That file is not a valid planner backup.'); }
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
    S = Object.assign(BLANK(), r);
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
  else if (a === 'per') { per = b.dataset.p; poff = 0; render(); }
  else if (a === 'pprev') { poff--; render(); }
  else if (a === 'pnext') { poff++; render(); }
  else if (a === 'newbook') openBook(null);
  else if (a === 'editbook') openBook(b.dataset.b);
  else if (a === 'savebook') saveBook(b.dataset.b || null);
  else if (a === 'delbook') { if (confirm('Delete this book and its reading log?')) delBook(b.dataset.b); }
  else if (a === 'logpages') logPages();
  else if (a === 'unlog') { const d = S.reads[b.dataset.d]; if (d) { delete d[b.dataset.b]; if (!Object.keys(d).length) delete S.reads[b.dataset.d]; save(); render(); } }
  else if (a === 'newword') openWord(null);
  else if (a === 'editword') openWord(b.dataset.w);
  else if (a === 'saveword') saveWord(b.dataset.w || null);
  else if (a === 'delword') { if (confirm('Delete this word?')) { S.words = S.words.filter(w => w.id !== b.dataset.w); $('#modal').hidden = true; save(); render(); } }
  else if (a === 'practice' || a === 'again') practice();
  else if (a === 'reveal' && card) $('#ans').innerHTML = esc(card.meaning) + (card.example ? '<br><i>“' + esc(card.example) + '”</i>' : '');
  else if (a === 'got' && card) { card.mastered = true; card.mDate = today(); save(); render(); practice(); }
  else if (a === 'addauto') {
    const k = b.dataset.k;
    if (S.habits.some(h => h.auto === k)) alert('You already have this habit.');
    else { S.habits.push({ id: uid(), t: k === 'read' ? 'Read (log pages in Books)' : 'Learn a new word', start: today(), auto: k }); save(); render(); }
  }
  else if (b.id === 'send') ask();
});
document.addEventListener('change', ev => {
  const c = ev.target, a = c.dataset && c.dataset.a;
  if (c.id === 'lg-d') { rd = c.value || today(); render(); }
  if (c.id === 'wf') { wf = c.value; $('#wlist').innerHTML = wlist(); }
  if (a === 'item') { const e = S.events.find(x => x.id === c.dataset.e); if (e) { e.items[c.dataset.i].d = c.checked; save(); render(); } }
  if (a === 'hab') { const d = c.dataset.d, l = S.done[d] || (S.done[d] = []), i = l.indexOf(c.dataset.h); if (c.checked && i < 0) l.push(c.dataset.h); if (!c.checked && i >= 0) l.splice(i, 1); save(); render(); }
});
document.addEventListener('input', e => { if (e.target.id === 'wq') { wq = e.target.value; $('#wlist').innerHTML = wlist(); } });
$('#chatin').addEventListener('keydown', e => { if (e.key === 'Enter') ask(); });
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') $('#modal').hidden = true; });

try { const l = JSON.parse(localStorage.getItem('planner.v1') || 'null'); if (l) S = Object.assign(S, l); } catch (e) { }
render(); notify(); setInterval(() => { const t = (document.activeElement || {}).tagName; if (t !== 'INPUT' && t !== 'TEXTAREA' && t !== 'SELECT' && $('#modal').hidden) render(); notify(); }, 60000);
addMsg('a', 'Hi! Tell me what you want to plan, like a trip, a birthday, or a new routine, and I will help you organise it.');

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
