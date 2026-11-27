/* Bridge between the Reading Room and Kairos' existing planner data. */
(function(){
  'use strict';
  const esc=s=>String(s==null?'':s);
  async function signedIn(){if(typeof sb==='undefined'||!sb)return null;const r=await sb.auth.getSession();if(r.error)throw r.error;return r.data.session?.user||null;}
  window.KairosBridge={
    addWord:function(x){if(!Array.isArray(S.words))S.words=[];S.words.push({id:uid(),w:esc(x.word),meaning:esc(x.meaning),example:esc(x.example),src:'',srcText:esc(x.bookTitle||'PDF')+' · page '+x.page,date:today(),mastered:false,mDate:'',bookId:x.bookId,page:x.page});save();if(typeof render==='function'&&tab==='words')render();},
    addQuote:function(x){if(!Array.isArray(S.quotes))S.quotes=[];S.quotes.push({id:uid(),text:esc(x.text),author:esc(x.author||''),note:esc(x.note||''),created:new Date().toISOString(),sourceBookId:x.bookId,page:x.page});save();if(typeof render==='function'&&tab==='quotes')render();},
    capturesFor:function(id){return [...(S.words||[]).filter(x=>x.bookId===id).map(x=>({label:x.w,page:x.page||1})),...(S.quotes||[]).filter(x=>x.sourceBookId===id).map(x=>({label:(x.text||'').slice(0,42),page:x.page||1}))].sort((a,b)=>a.page-b.page);},
    uploadPdf:async function(id,file){const u=await signedIn();if(!u)return {ok:false,reason:'Sign in to enable cloud copies.'};const path=u.id+'/'+id+'.pdf';const result=await sb.storage.from('kairos-pdfs').upload(path,file,{contentType:'application/pdf',upsert:true});if(result.error)throw result.error;return {ok:true,path};},
    syncLibrary:async function(items,download){const u=await signedIn();if(!u)throw new Error('Sign in to sync your PDF library.');const bucket=sb.storage.from('kairos-pdfs');let list=items.slice();if(download){const remote=await bucket.download(u.id+'/library.json');if(!remote.error){const remoteList=JSON.parse(await remote.data.text());for(const m of remoteList){if(!list.some(x=>x.id===m.id))list.push(m);}}}
      for(const m of list){if(!m.cloudPath){const local=await window.KairosReadingRoom.getFile(m.id);if(local){const up=await bucket.upload(u.id+'/'+m.id+'.pdf',local.file,{contentType:'application/pdf',upsert:true});if(up.error)throw up.error;m.cloudPath=u.id+'/'+m.id+'.pdf';}}}
      if(download){for(const m of list){if(!await window.KairosReadingRoom.hasFile(m.id)&&m.cloudPath){const f=await bucket.download(m.cloudPath);if(!f.error)await window.KairosReadingRoom.putFile({id:m.id,file:f.data});}}}
      const meta=await bucket.upload(u.id+'/library.json',new Blob([JSON.stringify(list)],{type:'application/json'}),{contentType:'application/json',upsert:true});if(meta.error)throw meta.error;return list;
    }
  };
})();