(function(){
'use strict';
const clean=s=>String(s==null?'':s);
function addBook(meta){
 if(!Array.isArray(S.books))S.books=[];
 let b=S.books.find(x=>x.pdfId===meta.id||x.id===meta.id);
 if(!b){b={id:meta.id,pdfId:meta.id,title:clean(meta.title),author:clean(meta.author),mood:'literary',pages:Number(meta.pages)||0,status:'reading',started:today(),finished:'',rating:0,thoughts:'',notes:'',pdf:true};S.books.unshift(b);}
 else{b.title=clean(meta.title)||b.title;b.author=clean(meta.author)||b.author;b.pages=Number(meta.pages)||b.pages||0;b.status=b.status==='done'?'done':'reading';}
 save();return b;
}
window.KairosBridge={
 addBook,
 markReadingStart:function(meta,page,total){const book=addBook(meta),day=today();book.pages=Number(total)||book.pages||0;book.pdfPage=Number(page)||1;if(!book.pdfDailyProgress||typeof book.pdfDailyProgress!=='object')book.pdfDailyProgress={};book.pdfDailyProgress[day]=Math.max(Number(book.pdfDailyProgress[day])||0,Number(page)||1);save();return book;},
 updateBookProgress:function(meta,page,total){
  const b=addBook(meta),day=today();b.pages=Number(total)||b.pages||0;b.pdfPage=Number(page)||1;
  if(!b.pdfDailyProgress||typeof b.pdfDailyProgress!=='object')b.pdfDailyProgress={};
  const previous=Number(b.pdfDailyProgress[day])||0,now=Math.max(previous,Number(page)||1);
  if(now>previous){if(!S.reads[day])S.reads[day]={};S.reads[day][b.id]=(S.reads[day][b.id]||0)+(now-previous);b.pdfDailyProgress[day]=now;}
  save();return b;
 },
 addWord:function(x){
  if(!Array.isArray(S.words))S.words=[];
  const b=addBook({id:x.bookId,title:x.bookTitle,author:'',pages:x.bookPages||0});
  S.words.push({id:uid(),w:clean(x.word),meaning:clean(x.meaning),example:clean(x.example),src:b.id,srcText:'',date:today(),mastered:false,mDate:'',bookId:b.id,page:Number(x.page)||1});
  save();if(typeof render==='function'&&tab==='words')render();
 },
 addQuote:function(x){
  addBook({id:x.bookId,title:x.bookTitle||x.author,author:'',pages:x.bookPages||0});
  if(!Array.isArray(S.quotes))S.quotes=[];
  S.quotes.push({id:uid(),text:clean(x.text),author:clean(x.author||''),note:clean(x.note||''),created:new Date().toISOString(),sourceBookId:x.bookId,page:Number(x.page)||1});
  save();if(typeof render==='function'&&tab==='quotes')render();
 },
 capturesFor:function(id){return [...(S.words||[]).filter(x=>x.src===id||x.bookId===id).map(x=>({label:x.w,page:x.page||1})),...(S.quotes||[]).filter(x=>x.sourceBookId===id).map(x=>({label:(x.text||'').slice(0,42),page:x.page||1}))].sort((a,b)=>a.page-b.page);},
 uploadPdf:async function(id,file){
  if(typeof sb==='undefined'||!sb)throw new Error('Supabase is not configured.');
  const r=await sb.auth.getSession();if(r.error)throw r.error;const u=r.data.session?.user;if(!u)return {ok:false,reason:'Sign in to enable cloud copies.'};
  const path=u.id+'/'+id+'.pdf',result=await sb.storage.from('kairos-pdfs').upload(path,file,{contentType:'application/pdf',upsert:true});
  if(result.error)throw result.error;return {ok:true,path};
 },
 syncLibrary:async function(items,download){
  if(typeof sb==='undefined'||!sb)throw new Error('Supabase is not configured.');
  const r=await sb.auth.getSession();if(r.error)throw r.error;const u=r.data.session?.user;if(!u)throw new Error('Sign in to sync your PDF library.');
  const bucket=sb.storage.from('kairos-pdfs');let list=items.slice();
  if(download){const remote=await bucket.download(u.id+'/library.json');if(!remote.error){const arr=JSON.parse(await remote.data.text());for(const m of arr)if(!list.some(x=>x.id===m.id))list.push(m);}}
  for(const m of list){const local=await window.KairosReadingRoom.getFile(m.id);if(local&&!m.cloudPath){const up=await bucket.upload(u.id+'/'+m.id+'.pdf',local.file,{contentType:'application/pdf',upsert:true});if(up.error)throw up.error;m.cloudPath=u.id+'/'+m.id+'.pdf';}
   if(download&&!local&&m.cloudPath){const f=await bucket.download(m.cloudPath);if(!f.error)await window.KairosReadingRoom.putFile({id:m.id,file:f.data});}}
  const meta=await bucket.upload(u.id+'/library.json',new Blob([JSON.stringify(list)],{type:'application/json'}),{contentType:'application/json',upsert:true});if(meta.error)throw meta.error;
  list.forEach(addBook);return list;
 }
};
})();