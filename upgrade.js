/* My Planner: Spiritual Life / Worldly Life enhancements. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const KEY = 'myplanner.spiritual.books.v1';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readBooks = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; } };
  const saveBooks = b => localStorage.setItem(KEY, JSON.stringify(b));
  let editing = null;

  const labels = {spbooks:'Spiritual reading',prayers:'Prayers & devotions',dash:'Overview',cal:'Calendar',daily:'Daily tasks',up:'Upcoming',bible:'Holy Bible',rosary:'Holy Rosary',journal:'Private journal',books:'Reading room',words:'Vocabulary',quotes:'Quotes',week:'Weekly review',chat:'Your companion'};
  function activate(tab) {
    document.querySelectorAll('.sec').forEach(s => s.classList.toggle('on', s.id === 'v-' + tab));
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const h = $('#page-title'); if (h) h.textContent = labels[tab] || 'My Planner';
  }
  function theme(value) {
    const dark = value === 'dark' || (value === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    const icon = $('#theme-icon'); if (icon) icon.textContent = dark ? '☀' : '☾';
    localStorage.setItem('myplanner.theme', value);
  }
  function initTheme() {
    theme(localStorage.getItem('myplanner.theme') || 'system');
    const btn = $('#theme-toggle');
    if (btn) btn.addEventListener('click', () => theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    if (window.matchMedia) {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', () => { if (localStorage.getItem('myplanner.theme') === 'system') theme('system'); });
    }
  }
  function dashboard() {
    const root = $('#v-dash');
    if (!root || root.querySelector('.life-hub-grid')) return;
    const wrap = document.createElement('div');
    wrap.className = 'life-hub-grid';
    wrap.innerHTML = '<a class="life-hub spiritual-hub" href="#" data-life-hub="spiritual"><span>✝</span><div><small>FAITH · PRAYER · SCRIPTURE</small><h2>Spiritual life</h2><p>Bible · Rosary · Devotions · Spiritual reading</p></div><b>↗</b></a><a class="life-hub worldly-hub" href="#" data-life-hub="worldly"><span>◈</span><div><small>CAREER · LEARNING · PERSONAL GROWTH</small><h2>Worldly life</h2><p>Goals · Books · Vocabulary · Projects</p></div><b>↗</b></a>';
    root.prepend(wrap);
  }
  function renderBooks() {
    const root = $('#v-spbooks'); if (!root) return;
    const books = readBooks();
    const finished = books.filter(b => b.status === 'Finished').length;
    root.innerHTML = '<div class="personal-hero"><div class="kicker">SPIRITUAL LIFE · CATHOLIC</div><h2>Spiritual reading</h2><p>A dedicated library for Scripture companions, Catholic theology, saints, Church history and spiritual classics.</p></div>' +
      '<div class="personal-grid"><div class="personal-panel"><div class="bar"><h3>Your spiritual library</h3><span class="tag">' + finished + '/' + books.length + ' finished</span></div>' +
      '<div class="personal-note">Keep spiritual books separate from your general reading room. Record what you read, what you learn and how it shapes your life.</div>' +
      '<div class="personal-stats"><div><b>' + books.length + '</b><span>Books</span></div><div><b>' + (books.length - finished) + '</b><span>In progress</span></div><div><b>' + finished + '</b><span>Completed</span></div></div>' +
      '<div class="bar"><h3>Books</h3><button class="p" data-sp-action="new">＋ Add a book</button></div>' +
      (books.length ? books.map(b => {
        const pct = b.pages ? Math.min(100, Math.round((Number(b.current || 0) / Number(b.pages)) * 100)) : 0;
        return '<article class="reading-card"><div class="bar"><div><h4>' + esc(b.title) + '</h4><p>' + esc(b.author || 'Author not added') + ' · ' + esc(b.category || 'Spiritual classic') + '</p></div><span class="tag">' + esc(b.status || 'Reading') + '</span></div><div class="small-muted">' + Number(b.current || 0) + (b.pages ? ' / ' + Number(b.pages) + ' pages · ' + pct + '%' : ' pages') + '</div>' + (b.pages ? '<div class="sp-progress"><span style="width:' + pct + '%"></span></div>' : '') + (b.note ? '<p>' + esc(b.note) + '</p>' : '') + '<div class="form-actions"><button data-sp-action="edit" data-id="' + esc(b.id) + '">Edit</button><button data-sp-action="delete" data-id="' + esc(b.id) + '">Delete</button></div></article>';
      }).join('') : '<div class="journal-empty"><p>Your spiritual library is ready.</p><p>Add your first book to begin tracking your reading.</p></div>') +
      '</div><div class="personal-panel"><h3>Suggested Catholic library</h3>' +
      [['Confessions','St. Augustine','Spiritual autobiography'],['The Imitation of Christ','Thomas à Kempis','Spiritual classic'],['Introduction to the Devout Life','St. Francis de Sales','Practical spirituality'],['Story of a Soul','St. Thérèse of Lisieux','Saints & spirituality'],['The Interior Castle','St. Teresa of Ávila','Contemplative prayer'],['Catechism of the Catholic Church','Catholic Church','Doctrine & faith']].map(x => '<article class="reading-card"><h4>' + x[0] + '</h4><p>' + x[1] + ' · ' + x[2] + '</p><button data-sp-action="suggest" data-title="' + esc(x[0]) + '" data-author="' + esc(x[1]) + '" data-category="' + esc(x[2]) + '">Add to my library</button></article>').join('') +
      '</div></div><div class="personal-panel sp-form" hidden><h3 id="sp-form-title">Add spiritual book</h3><div class="form-grid"><label>Book title<input id="sp-title" maxlength="120"></label><label>Author<input id="sp-author" maxlength="100"></label><label>Category<input id="sp-category" maxlength="80"></label><label>Total pages<input id="sp-pages" type="number" min="1"></label><label>Current page<input id="sp-current" type="number" min="0" value="0"></label><label>Status<select id="sp-status"><option>Reading</option><option>Want to read</option><option>On hold</option><option>Finished</option></select></label><label class="full">Reflection / notes<textarea id="sp-note" rows="3"></textarea></label></div><div class="form-actions"><button class="p" data-sp-action="save">Save book</button><button data-sp-action="cancel">Cancel</button></div></div>';
  }
  function editBook(book) {
    editing = book ? book.id : null;
    const form = $('.sp-form'); if (!form) return;
    form.hidden = false;
    $('#sp-form-title').textContent = book ? 'Edit spiritual book' : 'Add spiritual book';
    $('#sp-title').value = book ? book.title : '';
    $('#sp-author').value = book ? book.author || '' : '';
    $('#sp-category').value = book ? book.category || '' : '';
    $('#sp-pages').value = book ? book.pages || '' : '';
    $('#sp-current').value = book ? book.current || 0 : 0;
    $('#sp-status').value = book ? book.status || 'Reading' : 'Reading';
    $('#sp-note').value = book ? book.note || '' : '';
    form.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function prayers() {
    const root = $('#v-prayers'); if (!root) return;
    const items = [
      ['Morning Offering','O Jesus, through the Immaculate Heart of Mary, I offer You my prayers, works, joys and sufferings of this day.'],
      ['Angelus','The Angel of the Lord declared unto Mary. And she conceived of the Holy Spirit.'],
      ['Divine Mercy Chaplet','A devotion entrusted to St. Faustina, prayed with the Chaplet beads.'],
      ['Examination of Conscience','Pause, give thanks, review the day honestly, ask forgiveness and resolve to begin again.'],
      ['Night Prayer','Entrust the day to God, pray for those in need and rest in His peace.']
    ];
    root.innerHTML = '<div class="personal-hero"><div class="kicker">SPIRITUAL LIFE · CATHOLIC</div><h2>Prayer &amp; devotions</h2><p>A quiet place for daily Catholic prayer and devotional practices.</p></div><div class="personal-grid"><div class="personal-panel"><h3>Daily prayer rhythm</h3>' +
      items.map((x,i) => '<article class="reading-card"><h4>' + x[0] + '</h4><p>' + x[1] + '</p>' + (i === 2 ? '<a href="https://www.thedivinemercy.org/message/devotions/pray-the-chaplet" target="_blank" rel="noopener noreferrer">Chaplet guide ↗</a>' : '') + '</article>').join('') +
      '</div><div class="personal-panel"><h3>Other Catholic devotions</h3><article class="reading-card"><h4>Liturgical calendar</h4><p>Follow solemnities, feasts, memorials and seasons of the Church year.</p><a href="https://www.usccb.org/resources/liturgical-calendar" target="_blank" rel="noopener noreferrer">USCCB resources ↗</a></article><article class="reading-card"><h4>Saint of the day</h4><p>Discover the witness and writings of the saints.</p><a href="https://www.catholic.org/saints/" target="_blank" rel="noopener noreferrer">Explore saints ↗</a></article></div></div>';
  }
  document.addEventListener('click', function(e) {
    const nav = e.target.closest('#tabs button[data-t]');
    if (nav && (nav.dataset.t === 'spbooks' || nav.dataset.t === 'prayers')) {
      e.preventDefault(); e.stopImmediatePropagation();
      activate(nav.dataset.t);
      if (nav.dataset.t === 'spbooks') renderBooks(); else prayers();
      return;
    }
    const hub = e.target.closest('[data-life-hub]');
    if (hub) {
      e.preventDefault();
      const dest = hub.dataset.lifeHub === 'spiritual' ? 'bible' : 'books';
      const b = document.querySelector('#tabs button[data-t="' + dest + '"]');
      if (b) b.click();
      return;
    }
    const btn = e.target.closest('[data-sp-action]');
    if (!btn) return;
    const action = btn.dataset.spAction, books = readBooks();
    if (action === 'new') editBook(null);
    if (action === 'cancel') { const f = $('.sp-form'); if (f) f.hidden = true; editing = null; }
    if (action === 'edit') editBook(books.find(b => b.id === btn.dataset.id));
    if (action === 'suggest') editBook({title:btn.dataset.title,author:btn.dataset.author,category:btn.dataset.category,status:'Want to read'});
    if (action === 'delete' && confirm('Remove this book from your spiritual library?')) { saveBooks(books.filter(b => b.id !== btn.dataset.id)); renderBooks(); }
    if (action === 'save') {
      const title = $('#sp-title').value.trim();
      if (!title) { alert('Please enter a book title.'); return; }
      const record = {id:editing || ('sp-' + Date.now()),title,author:$('#sp-author').value.trim(),category:$('#sp-category').value.trim(),pages:Math.max(0,Number($('#sp-pages').value)||0),current:Math.max(0,Number($('#sp-current').value)||0),status:$('#sp-status').value,note:$('#sp-note').value.trim()};
      const list = readBooks(), at = list.findIndex(b => b.id === editing);
      if (at >= 0) list[at] = record; else list.unshift(record);
      saveBooks(list); editing = null; renderBooks();
    }
  }, true);
  document.addEventListener('DOMContentLoaded', function() { initTheme(); dashboard(); });
  if (document.readyState !== 'loading') { initTheme(); dashboard(); }
  const oldRender = window.render;
  if (typeof oldRender === 'function') window.render = function() { oldRender.apply(this, arguments); dashboard(); };
  window.MyPlannerUpgrade = {renderBooks,prayers,theme};
})();
