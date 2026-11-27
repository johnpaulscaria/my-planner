/* Bridge between the Reading Room and Kairos' existing planner data. */
(function(){
  'use strict';
  const esc=s=>String(s==null?'':s);
  window.KairosBridge={
    addWord:function(x){
      if(!Array.isArray(S.words))S.words=[];
      S.words.push({id:uid(),w:esc(x.word),meaning:esc(x.meaning),example:esc(x.example),src:'',srcText:esc(x.bookTitle||'PDF')+' · page '+x.page,date:today(),mastered:false,mDate:'',bookId:x.bookId,page:x.page});
      save();if(typeof render==='function'&&tab==='words')render();
    },
    addQuote:function(x){
      if(!Array.isArray(S.quotes))S.quotes=[];
      S.quotes.push({id:uid(),text:esc(x.text),author:esc(x.author||''),note:esc(x.note||''),created:new Date().toISOString(),sourceBookId:x.bookId,page:x.page});
      save();if(typeof render==='function'&&tab==='quotes')render();
    },
    capturesFor:function(id){
      return [...(S.words||[]).filter(x=>x.bookId===id).map(x=>({label:x.w,page:x.page||1})),...(S.quotes||[]).filter(x=>x.sourceBookId===id).map(x=>({label:(x.text||'').slice(0,42),page:x.page||1}))].sort((a,b)=>a.page-b.page);
    },
    uploadPdf:async function(id,file){
      if(!window.supabase||typeof sb==='undefined'||!sb||typeof user==='undefined'||!user)return {ok:false,reason:'Sign in to enable cloud copies.'};
      const path=user.id+'/'+id+'.pdf';
      const result=await sb.storage.from('kairos-pdfs').upload(path,file,{contentType:'application/pdf',upsert:true});
      if(result.error)throw result.error;
      return {ok:true,path};
    }
  };
})();