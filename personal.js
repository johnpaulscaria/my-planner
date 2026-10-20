/* My Planner Personal Additions
   - Password-encrypted private journal using Web Crypto (AES-GCM + PBKDF2)
   - Daily rosary guide and weekday mysteries
   - Catholic daily Mass readings link plus a chapter-by-chapter OT/NT plan
   - Native-calendar .ics reminders and browser notifications while the app is open
   Existing app.js and planner.v1 data remain untouched.
*/
(function(){
'use strict';
const $ = s => document.querySelector(s);
const escapeHTML = s => String(s == null ? '' : s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const pretty = ds => new Date(ds+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
const KEY='myplanner.private-journal.encrypted.v1';
const PREF='myplanner.personal.preferences.v1';
let activePersonalTab='';
let journalKey=null, journalEntries=[], journalSalt=null, journalAutoLock=null, journalUnlocked=false;
let rosaryChecked={};
let preferences={journal:'20:30',rosary:'06:30',bible:'07:00',browserAlerts:false};
try{preferences=Object.assign(preferences,JSON.parse(localStorage.getItem(PREF)||'{}'));}catch(e){}
try{rosaryChecked=JSON.parse(localStorage.getItem('myplanner.rosary.checks.v1')||'{}');}catch(e){}
const getVault=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}};
const savePrefs=()=>localStorage.setItem(PREF,JSON.stringify(preferences));
const b64 = bytes => {
  const u = new Uint8Array(bytes); let binary = '';
  for (let i = 0; i < u.length; i += 0x8000) binary += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(binary);
};
const unb64 = str => Uint8Array.from(atob(str),c=>c.charCodeAt(0));
async function deriveKey(password,salt){
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encryptEntries(){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const bytes=new TextEncoder().encode(JSON.stringify(journalEntries));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},journalKey,bytes);
  localStorage.setItem(KEY,JSON.stringify({version:1,salt:b64(journalSalt),iv:b64(iv),cipher:b64(cipher),updated:new Date().toISOString()}));
}
function lockJournal(){
  journalKey=null;journalEntries=[];journalUnlocked=false;
  if(journalAutoLock)clearTimeout(journalAutoLock);
  journalAutoLock=null;
  if(activePersonalTab==='journal')renderJournal();
}
function refreshAutoLock(){
  if(journalAutoLock)clearTimeout(journalAutoLock);
  journalAutoLock=setTimeout(()=>{if(journalUnlocked){lockJournal();alert('Your private journal was locked after 5 minutes of inactivity.');}},5*60*1000);
}
function noteActivity(){if(journalUnlocked)refreshAutoLock();}
async function createVault(password){
  journalSalt=crypto.getRandomValues(new Uint8Array(16));
  journalKey=await deriveKey(password,journalSalt);
  journalEntries=[];journalUnlocked=true;
  await encryptEntries();refreshAutoLock();renderJournal();
}
async function unlockVault(password){
  const vault=getVault();if(!vault)throw new Error('No journal vault found.');
  journalSalt=unb64(vault.salt);
  journalKey=await deriveKey(password,journalSalt);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(vault.iv)},journalKey,unb64(vault.cipher));
  journalEntries=JSON.parse(new TextDecoder().decode(plain));
  journalUnlocked=true;refreshAutoLock();renderJournal();
}
function section(title,subtitle,content){
  return `<div class="personal-hero"><div class="kicker">MY PLANNER · PERSONAL</div><h2>${title}</h2><p>${subtitle}</p></div>${content}`;
}
function renderJournal(){
  const root=$('#v-journal');if(!root)return;
  if(!window.crypto||!crypto.subtle){
    root.innerHTML=section('Private journal','A quiet place to write honestly.',`<div class="personal-panel"><p>This browser does not support the encryption features required for the private journal. Open the website through HTTPS on GitHub Pages or use a modern browser.</p></div>`);return;
  }
  const vault=getVault();
  if(!vault&&!journalUnlocked){
    root.innerHTML=section('A space that is only yours','Your journal is encrypted in this browser before it is saved. Set a strong passphrase to create your private vault.',`
      <div class="personal-panel" style="max-width:650px"><div class="personal-note"><b>Important:</b> your passphrase is never stored. If you forget it, this journal cannot be recovered. Entries are encrypted locally and do not sync to your planner account.</div>
      <form id="journal-create" class="journal-editor"><label for="j-new-pass">Create a passphrase</label><input id="j-new-pass" type="password" autocomplete="new-password" minlength="10" required placeholder="Use at least 10 characters"><label for="j-confirm-pass">Confirm passphrase</label><input id="j-confirm-pass" type="password" autocomplete="new-password" minlength="10" required placeholder="Enter it again"><button class="p" type="submit">Create encrypted journal</button><p id="journal-auth-error" class="small-muted"></p></form></div>`);return;
  }
  if(!journalUnlocked){
    root.innerHTML=section('Welcome back to your journal','Your entries are locked. Unlock them with your passphrase.',`
      <div class="personal-panel" style="max-width:600px"><div class="journal-lock-icon">⌑</div><form id="journal-unlock" class="journal-editor"><label for="j-pass">Journal passphrase</label><input id="j-pass" type="password" autocomplete="current-password" required autofocus placeholder="Your passphrase"><button class="p" type="submit">Unlock journal</button><p id="journal-auth-error" class="small-muted"></p></form><p class="small-muted">Use the same browser and device where you created the journal, unless you have restored your encrypted vault backup.</p></div>`);return;
  }
  const selected=window._journalEditId?journalEntries.find(e=>e.id===window._journalEditId):null;
  const entries=journalEntries.slice().sort((a,b)=>(b.date+b.updated).localeCompare(a.date+a.updated));
  root.innerHTML=section('Your private journal','Write without an audience. Entries are encrypted before they touch browser storage.',`
  <div class="personal-grid">
    <div class="personal-panel">
      <div class="bar"><div><h3>${selected?'Edit entry':'Today, in your words'}</h3><div class="small-muted">${pretty(selected?selected.date:today())}</div></div><button data-personal="journal-lock">Lock</button></div>
      <form id="journal-entry-form" class="journal-editor">
        <input type="hidden" id="j-entry-id" value="${escapeHTML(selected?selected.id:'')}">
        <label for="j-date">Date</label><input type="date" id="j-date" value="${escapeHTML(selected?selected.date:today())}" required>
        <label for="j-title">Title</label><input id="j-title" maxlength="120" value="${escapeHTML(selected?selected.title:'')}" placeholder="A thought worth keeping">
        <label for="j-mood">How are you feeling?</label><select id="j-mood">${['','Calm','Grateful','Hopeful','Focused','Happy','Anxious','Tired','Frustrated','Sad','Unsure'].map(x=>`<option value="${x}" ${(selected?selected.mood:'')===x?'selected':''}>${x||'Choose a mood (optional)'}</option>`).join('')}</select>
        <label for="j-body">Your entry</label><textarea id="j-body" required placeholder="What happened today? What did you learn? What are you carrying with you?">${escapeHTML(selected?selected.body:'')}</textarea>
        <div class="form-actions"><button class="p" type="submit">${selected?'Save changes':'Save entry'}</button><button type="button" data-personal="journal-clear">New entry</button><button type="button" data-personal="journal-export">Export encrypted backup</button></div>
        <p class="small-muted">Your writing is encrypted with AES-GCM using a key derived from your passphrase. The encrypted vault is stored only in this browser.</p>
      </form>
    </div>
    <div class="personal-panel">
      <div class="bar"><h3>Past entries</h3><span class="tag">${entries.length} saved</span></div>
      <input id="journal-search" placeholder="Search titles and entries…" aria-label="Search journal">
      <div id="journal-entry-list">${renderJournalList(entries)}</div>
    </div>
  </div>`);
  refreshAutoLock();
}
function renderJournalList(entries){
  if(!entries.length)return '<div class="journal-empty"><p>No entries yet.</p><span class="small-muted">Your first entry does not need to be profound. Just start where you are.</span></div>';
  return entries.map(e=>`<article class="journal-entry"><div class="journal-meta">${escapeHTML(pretty(e.date))}${e.mood?' · '+escapeHTML(e.mood):''}</div><h4>${escapeHTML(e.title||'Untitled entry')}</h4><p>${escapeHTML(e.body.length>280?e.body.slice(0,280)+'…':e.body)}</p><div class="journal-entry-actions"><button data-personal="journal-edit" data-id="${escapeHTML(e.id)}">Edit</button><button data-personal="journal-delete" data-id="${escapeHTML(e.id)}">Delete</button></div></article>`).join('');
}
function exportEncryptedVault(){
  const vault=getVault();if(!vault){alert('There is no encrypted vault to export yet.');return;}
  const blob=new Blob([JSON.stringify({app:'My Planner encrypted journal backup',vault},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='my-planner-encrypted-journal-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function importVaultFile(file){
  const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);const v=data.vault||data;if(!v.salt||!v.iv||!v.cipher)throw new Error();localStorage.setItem(KEY,JSON.stringify(v));journalKey=null;journalEntries=[];journalUnlocked=false;renderJournal();alert('Encrypted vault restored. Unlock it with the original passphrase.');}catch(e){alert('That file is not a valid encrypted journal backup.');}};reader.readAsText(file);
}
const mysteryByDay={
  0:{name:'Glorious Mysteries',items:[['The Resurrection','The victory of Christ over death.'],['The Ascension','Christ returns to the Father.'],['The Descent of the Holy Spirit','The Spirit comes upon the apostles.'],['The Assumption of Mary','Mary is taken into heavenly glory.'],['The Coronation of Mary','Mary is crowned Queen of Heaven and Earth.']]},
  1:{name:'Joyful Mysteries',items:[['The Annunciation','Mary receives the message of the angel Gabriel.'],['The Visitation','Mary visits Elizabeth.'],['The Nativity','Jesus is born in Bethlehem.'],['The Presentation','Jesus is presented in the Temple.'],['The Finding of Jesus in the Temple','Jesus is found among the teachers.']]},
  2:{name:'Sorrowful Mysteries',items:[['The Agony in the Garden','Jesus prays in Gethsemane.'],['The Scourging at the Pillar','Jesus is scourged.'],['The Crowning with Thorns','Jesus is crowned with thorns.'],['The Carrying of the Cross','Jesus carries the cross to Calvary.'],['The Crucifixion','Jesus dies on the cross.']]},
  3:{name:'Glorious Mysteries',items:[['The Resurrection','The victory of Christ over death.'],['The Ascension','Christ returns to the Father.'],['The Descent of the Holy Spirit','The Spirit comes upon the apostles.'],['The Assumption of Mary','Mary is taken into heavenly glory.'],['The Coronation of Mary','Mary is crowned Queen of Heaven and Earth.']]},
  4:{name:'Luminous Mysteries',items:[['The Baptism of Jesus in the Jordan','The Father reveals Jesus as his beloved Son.'],['The Wedding at Cana','Jesus performs his first sign.'],['The Proclamation of the Kingdom','Jesus calls people to conversion and faith.'],['The Transfiguration','Christ is revealed in glory.'],['The Institution of the Eucharist','Jesus gives himself in the Eucharist.']]},
  5:{name:'Sorrowful Mysteries',items:[['The Agony in the Garden','Jesus prays in Gethsemane.'],['The Scourging at the Pillar','Jesus is scourged.'],['The Crowning with Thorns','Jesus is crowned with thorns.'],['The Carrying of the Cross','Jesus carries the cross to Calvary.'],['The Crucifixion','Jesus dies on the cross.']]},
  6:{name:'Joyful Mysteries',items:[['The Annunciation','Mary receives the message of the angel Gabriel.'],['The Visitation','Mary visits Elizabeth.'],['The Nativity','Jesus is born in Bethlehem.'],['The Presentation','Jesus is presented in the Temple.'],['The Finding of Jesus in the Temple','Jesus is found among the teachers.']]}
};
const prayers=[
 ['Sign of the Cross','In the name of the Father, and of the Son, and of the Holy Spirit. Amen.'],
 ["Apostles’ Creed","I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; he descended into hell; on the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God the Father almighty; from there he will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen."],
 ['Our Father','Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.'],
 ['Hail Mary','Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.'],
 ['Glory Be','Glory be to the Father, and to the Son, and to the Holy Spirit, as it was in the beginning, is now, and ever shall be, world without end. Amen.'],
 ['Fatima Prayer','O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to Heaven, especially those in most need of thy mercy. Amen.'],
 ['Hail, Holy Queen','Hail, holy Queen, Mother of mercy, our life, our sweetness and our hope. To thee do we cry, poor banished children of Eve; to thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us, and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Pray for us, O holy Mother of God, that we may be made worthy of the promises of Christ. Amen.']
];
function rosaryKey(){return today()+'-'+mysteryByDay[new Date().getDay()].name;}
function renderRosary(){
 const root=$('#v-rosary');if(!root)return;const mystery=mysteryByDay[new Date().getDay()],done=rosaryChecked[rosaryKey()]||[];
 root.innerHTML=section('Pray the rosary','A guided daily rosary with the mysteries traditionally prayed today. Move through the prayers at your own pace.',`
 <div class="personal-grid">
  <div class="personal-panel"><div class="bar"><div><div class="small-muted">${pretty(today())}</div><h3>${mystery.name}</h3></div><span class="tag">${done.length}/5 decades</span></div>
  <div class="personal-note">Begin with the Sign of the Cross and Apostles’ Creed. Pray one Our Father, three Hail Marys and one Glory Be. Announce each mystery, pray one Our Father, ten Hail Marys, one Glory Be and the Fatima Prayer. Finish with the Hail, Holy Queen.</div>
  <h3 style="margin-top:18px">Today's five mysteries</h3>
  ${mystery.items.map((it,i)=>`<article class="mystery-card"><div class="bar"><div><h4>${i+1}. ${it[0]}</h4><p>${it[1]}</p></div><button data-personal="rosary-done" data-decade="${i}" class="${done.includes(i)?'done':''}">${done.includes(i)?'Prayed ✓':'Mark prayed'}</button></div></article>`).join('')}
  <div class="form-actions"><button class="p" data-personal="rosary-reset">Reset today's progress</button><button data-personal="reminder-ics">Add daily reminders to calendar</button></div>
 </div>
 <div class="personal-panel"><h3>Rosary prayers</h3>${prayers.map(p=>`<div class="prayer-text"><b>${p[0]}</b><br>${p[1]}</div>`).join('')}<div class="personal-note">The mysteries follow the customary weekday pattern: Joyful (Monday and Saturday), Sorrowful (Tuesday and Friday), Glorious (Wednesday and Sunday), and Luminous (Thursday).</div></div>
 </div>`);
}
const OT=[
 ['Genesis',50],['Exodus',40],['Leviticus',27],['Numbers',36],['Deuteronomy',34],['Joshua',24],['Judges',21],['Ruth',4],['1 Samuel',31],['2 Samuel',24],['1 Kings',22],['2 Kings',25],['1 Chronicles',29],['2 Chronicles',36],['Ezra',10],['Nehemiah',13],['Tobit',14],['Judith',16],['Esther',10],['1 Maccabees',16],['2 Maccabees',15],['Job',42],['Psalms',150],['Proverbs',31],['Ecclesiastes',12],['Song of Songs',8],['Wisdom',19],['Sirach',51],['Isaiah',66],['Jeremiah',52],['Lamentations',5],['Baruch',6],['Ezekiel',48],['Daniel',14],['Hosea',14],['Joel',3],['Amos',9],['Obadiah',1],['Jonah',4],['Micah',7],['Nahum',3],['Habakkuk',3],['Zephaniah',3],['Haggai',2],['Zechariah',14],['Malachi',4]
];
const NT=[['Matthew',28],['Mark',16],['Luke',24],['John',21],['Acts',28],['Romans',16],['1 Corinthians',16],['2 Corinthians',13],['Galatians',6],['Ephesians',6],['Philippians',4],['Colossians',4],['1 Thessalonians',5],['2 Thessalonians',3],['1 Timothy',6],['2 Timothy',4],['Titus',3],['Philemon',1],['Hebrews',13],['James',5],['1 Peter',5],['2 Peter',3],['1 John',5],['2 John',1],['3 John',1],['Jude',1],['Revelation',22]
];
function totalChapters(books){return books.reduce((n,b)=>n+b[1],0)}
function chapterRef(books,index){let n=((index%totalChapters(books))+totalChapters(books))%totalChapters(books);for(const b of books){if(n<b[1])return b[0]+' '+(n+1);n-=b[1]}return ''}
function dayIndex(){return Math.max(0,Math.floor((new Date(today()+'T12:00:00')-new Date('2026-01-01T12:00:00'))/86400000))}
function renderBible(){
 const root=$('#v-bible');if(!root)return;const d=today(),idx=dayIndex(),ot=chapterRef(OT,idx),nt=chapterRef(NT,idx);
 const official='https://www.catholic.org/bible/daily_reading/?select_date='+encodeURIComponent(d);
 root.innerHTML=section('Scripture for every day','Follow the Church’s daily Mass readings, and keep a steady Old and New Testament reading rhythm alongside them.',`
 <div class="personal-grid">
  <div class="personal-panel"><div class="bar"><div><div class="small-muted">DAILY CATHOLIC MASS READINGS</div><h3>${pretty(d)}</h3></div><span class="tag">Today</span></div>
   <p class="small-muted">The official liturgical readings vary by the Church calendar and local rite. Open the full daily reading page for the First Reading, Psalm and Gospel.</p>
   <div class="reading-card"><h4>Daily Mass readings</h4><p>First Reading · Responsorial Psalm · Gospel · Saint of the Day</p><a class="ios-link-button" href="${official}" target="_blank" rel="noopener noreferrer">Read today's Catholic readings ↗</a></div>
   <div class="reading-card"><div class="small-muted">OLD TESTAMENT · DAILY PLAN</div><div class="reading-ref">${escapeHTML(ot)}</div><p>Read the chapter slowly. Notice a phrase, question, or idea that stays with you.</p><label class="reading-check"><input type="checkbox" data-personal="bible-check" data-id="ot-${d}" ${isBibleDone('ot',d)?'checked':''}> Mark Old Testament reading complete</label></div>
   <div class="reading-card"><div class="small-muted">NEW TESTAMENT · DAILY PLAN</div><div class="reading-ref">${escapeHTML(nt)}</div><p>Look for what this passage reveals about Christ, discipleship, or how to live today.</p><label class="reading-check"><input type="checkbox" data-personal="bible-check" data-id="nt-${d}" ${isBibleDone('nt',d)?'checked':''}> Mark New Testament reading complete</label></div>
   <div class="form-actions"><a class="ios-link-button" href="https://bible.usccb.org/readings/calendar" target="_blank" rel="noopener noreferrer">USCCB daily readings calendar ↗</a><a class="ios-link-button" href="https://www.catholic.org/bible/" target="_blank" rel="noopener noreferrer">Browse the Bible ↗</a><button data-personal="show-reminders">Set reminder times</button></div>
  </div>
  <div class="personal-panel"><h3>Build a daily rhythm</h3><p class="small-muted">A simple approach that is easier to maintain than an ambitious plan you abandon.</p>
    <div class="reading-card"><h4>1 · Read</h4><p>Read the Church's daily Mass readings, then one Old Testament and one New Testament chapter.</p></div>
    <div class="reading-card"><h4>2 · Reflect</h4><p>Write one sentence: “What is this asking me to notice or practise today?”</p></div>
    <div class="reading-card"><h4>3 · Pray</h4><p>Pray the rosary with the weekday mysteries in the Daily rosary section.</p><button class="p" data-personal="go-rosary">Open daily rosary</button></div>
    <div class="personal-note">The chapter plan starts on 1 January 2026 and continues sequentially by date. It is a supplementary reading plan, not a claim that these are the official Mass readings. Catholic Bibles include deuterocanonical books; the Old Testament sequence here includes the main Catholic books, but chapter divisions can differ slightly by edition.</div>
  </div>
 </div>
 ${renderReminderSettings()}`);
}
function getBibleChecks(){try{return JSON.parse(localStorage.getItem('myplanner.bible.checks.v1')||'{}')}catch(e){return {}}}
function isBibleDone(type,date){return !!getBibleChecks()[type+'-'+date]}
function saveBibleCheck(id,value){const c=getBibleChecks();c[id]=value;localStorage.setItem('myplanner.bible.checks.v1',JSON.stringify(c))}
function toICSDate(date,time){
 const parts=time.split(':').map(Number);const d=new Date(date+'T12:00:00');d.setHours(parts[0]||0,parts[1]||0,0,0);
 return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`;
}
function downloadICS(){
 const d=today(),items=[['Journal time',preferences.journal,'Write a private journal entry'],['Pray the rosary',preferences.rosary,'Daily rosary and weekday mysteries'],['Bible reading',preferences.bible,'Daily Mass readings plus Old and New Testament chapters']];
 const escICS=s=>String(s).replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');
 const events=items.map((x,i)=>`BEGIN:VEVENT\r\nUID:myplanner-${i}-${d}@johnpaulscaria.github.io\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}\r\nSUMMARY:${escICS(x[0])}\r\nDESCRIPTION:${escICS(x[2])}\r\nDTSTART:${toICSDate(d,x[1])}\r\nDURATION:PT15M\r\nRRULE:FREQ=DAILY\r\nBEGIN:VALARM\r\nTRIGGER:-PT0M\r\nACTION:DISPLAY\r\nDESCRIPTION:${escICS(x[0])}\r\nEND:VALARM\r\nEND:VEVENT`).join('\r\n');
 const ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//My Planner//Personal Reminders//EN\r\nCALSCALE:GREGORIAN\r\n'+events+'\r\nEND:VCALENDAR\r\n';
 const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='my-planner-daily-reminders.ics';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function renderReminderSettings(){
 const root=$('#v-bible');
 const content=`<div class="personal-panel"><h3>Daily reminders</h3><p class="small-muted">Choose your preferred times, then download a calendar file. Import it into Apple Calendar, Google Calendar or Outlook to receive reminders from that calendar app, even when My Planner is closed.</p>
 ${[['journal','Private journal'],['rosary','Daily rosary'],['bible','Bible reading']].map(([id,label])=>`<div class="reminder-row"><label for="rem-${id}">${label}</label><input id="rem-${id}" type="time" value="${escapeHTML(preferences[id])}"></div>`).join('')}
 <div class="form-actions"><button class="p" data-personal="save-reminders">Save times</button><button data-personal="reminder-ics">Download calendar reminders (.ics)</button><button data-personal="enable-browser-alerts">Enable browser alerts</button></div>
 <p class="small-muted">Browser alerts only trigger while the app is open and running. Reliable reminders while the site is fully closed require importing the calendar file or adding a push-notification backend; a static GitHub Pages site cannot schedule guaranteed background notifications by itself.</p></div>`;
 return content;
}
function showReminders(){
 const root=$('#v-bible');if(!root)return;
 root.innerHTML=section('Reminders that fit your day','Set a gentle rhythm for journaling, prayer and reading.',renderReminderSettings());
}
function renderCustom(){
 if(activePersonalTab==='journal')renderJournal();
 if(activePersonalTab==='rosary')renderRosary();
 if(activePersonalTab==='bible')renderBible();
}
function switchCustom(tab){
 activePersonalTab=tab;
 document.querySelectorAll('.sec').forEach(s=>s.classList.toggle('on',s.id==='v-'+tab));
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
 const labels={journal:'Private journal',rosary:'Daily rosary',bible:'Bible reading'};
 const h=$('#page-title');if(h)h.textContent=labels[tab]||'My Planner';
 renderCustom();
}
function installRenderHook(){
 if(typeof window.render!=='function'||window.render.__personalWrapped)return;
 const original=window.render;
 const wrapped=function(){original.apply(this,arguments);if(activePersonalTab){document.querySelectorAll('.sec').forEach(s=>s.classList.toggle('on',s.id==='v-'+activePersonalTab));renderCustom();}};
 wrapped.__personalWrapped=true;window.render=wrapped;
}
document.addEventListener('click',e=>{
 const nav=e.target.closest('#tabs button[data-t]');
 if(nav){
  if(['journal','rosary','bible'].includes(nav.dataset.t)){setTimeout(()=>switchCustom(nav.dataset.t),0);return;}
  activePersonalTab='';setTimeout(()=>{if(typeof window.render==='function')window.render();},0);return;
 }
 const b=e.target.closest('[data-personal]');if(!b)return;
 const a=b.dataset.personal;
 if(a==='journal-lock'){window._journalEditId=null;lockJournal();}
 if(a==='journal-clear'){window._journalEditId=null;renderJournal();}
 if(a==='journal-export')exportEncryptedVault();
 if(a==='journal-edit'){window._journalEditId=b.dataset.id;renderJournal();window.scrollTo({top:0,behavior:'smooth'});}
 if(a==='journal-delete'){if(confirm('Permanently delete this encrypted journal entry?')){journalEntries=journalEntries.filter(x=>x.id!==b.dataset.id);encryptEntries().then(renderJournal);}}
 if(a==='rosary-done'){const key=rosaryKey(),list=rosaryChecked[key]||(rosaryChecked[key]=[]),i=Number(b.dataset.decade);rosaryChecked[key]=list.includes(i)?list.filter(x=>x!==i):[...list,i];localStorage.setItem('myplanner.rosary.checks.v1',JSON.stringify(rosaryChecked));renderRosary();}
 if(a==='rosary-reset'){if(confirm('Reset today’s rosary progress?')){delete rosaryChecked[rosaryKey()];localStorage.setItem('myplanner.rosary.checks.v1',JSON.stringify(rosaryChecked));renderRosary();}}
 if(a==='go-rosary')switchCustom('rosary');
 if(a==='show-reminders')showReminders();
 if(a==='reminder-ics')downloadICS();
 if(a==='save-reminders'){['journal','rosary','bible'].forEach(k=>{const el=$('#rem-'+k);if(el&&el.value)preferences[k]=el.value;});savePrefs();alert('Reminder times saved. Download the calendar file and import it into your calendar app to get reminders outside My Planner.');showReminders();}
 if(a==='enable-browser-alerts'){if(!('Notification'in window)){alert('This browser does not support notifications. Use the calendar reminder file instead.');return;}Notification.requestPermission().then(p=>{preferences.browserAlerts=p==='granted';savePrefs();if(p==='granted')new Notification('My Planner reminders enabled',{body:'Keep the app open to receive browser alerts.'});else alert('Permission was not granted. You can still import calendar reminders.');});}
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='journal-create'){
  e.preventDefault();const p=$('#j-new-pass').value,c=$('#j-confirm-pass').value,err=$('#journal-auth-error');
  if(p.length<10){err.textContent='Choose a passphrase with at least 10 characters.';return;}
  if(p!==c){err.textContent='The passphrases do not match.';return;}
  try{await createVault(p);}catch(x){err.textContent='Could not create the encrypted journal in this browser.';}return;
 }
 if(e.target.id==='journal-unlock'){
  e.preventDefault();const p=$('#j-pass').value,err=$('#journal-auth-error');
  try{await unlockVault(p);}catch(x){journalKey=null;journalEntries=[];err.textContent='Unable to unlock. Check your passphrase and try again.';}return;
 }
 if(e.target.id==='journal-entry-form'){
  e.preventDefault();if(!journalUnlocked||!journalKey){alert('Unlock your journal before saving.');return;}
  const id=$('#j-entry-id').value||crypto.randomUUID();
  const entry={id,date:$('#j-date').value||today(),title:$('#j-title').value.trim(),mood:$('#j-mood').value,body:$('#j-body').value.trim(),updated:new Date().toISOString()};
  if(!entry.body){alert('Write something before saving.');return;}
  const ix=journalEntries.findIndex(x=>x.id===id);if(ix>=0)journalEntries[ix]=entry;else journalEntries.push(entry);
  window._journalEditId=null;await encryptEntries();renderJournal();
 }
});
document.addEventListener('input',e=>{
 if(journalUnlocked){noteActivity();}
 if(e.target.id==='journal-search'){
  const q=e.target.value.toLowerCase();const list=journalEntries.filter(x=>(x.title+' '+x.body+' '+x.mood).toLowerCase().includes(q)).sort((a,b)=>(b.date+b.updated).localeCompare(a.date+a.updated));
  const target=$('#journal-entry-list');if(target)target.innerHTML=renderJournalList(list);
 }
});
document.addEventListener('change',e=>{
 const c=e.target;if(c.matches('input[data-personal="bible-check"]')){saveBibleCheck(c.dataset.id,c.checked);}
});
document.addEventListener('click',e=>{
 if(e.target.closest('[data-personal="journal-import"]')){const f=$('#journal-import-file');if(f)f.click();}
});
document.addEventListener('keydown',e=>{if(journalUnlocked)noteActivity();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&journalUnlocked){/* keep the passphrase in memory for brief app switches; inactivity lock still applies */}});
window.addEventListener('beforeunload',()=>{journalKey=null;journalEntries=[];});
/* In-app notifications while the app is open. Calendar import is the reliable outside-app option. */
function checkSpiritualAlerts(){
 if(!preferences.browserAlerts||!('Notification'in window)||Notification.permission!=='granted')return;
 const d=today(),now=new Date(),hh=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
 for(const [key,title,body] of [['journal','Journal time','Take a few quiet minutes to write.'],['rosary','Time for the rosary','Pray today’s mysteries at your own pace.'],['bible','Bible reading','Read today’s Catholic readings and your OT/NT chapters.']]){
  if(preferences[key]===hh){const token='myplanner.alert.'+key+'.'+d;if(!localStorage.getItem(token)){new Notification(title,{body});localStorage.setItem(token,'1');}}
 }
}
installRenderHook();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(activePersonalTab)renderCustom();});else if(activePersonalTab)renderCustom();
setInterval(checkSpiritualAlerts,30000);
})();
