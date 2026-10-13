/* Add this script to a guide and give editable elements a data-siriai-review-id. */
(()=>{
  'use strict';
  const script=document.currentScript;
  const match=location.hash.match(/^#siriai-review=([0-9a-f]{64})$/);
  if(!script||!match)return;
  const token=match[1];
  const endpoint=new URL('https://siriai-workflow-plan.hwangyksiriai.chatgpt.site/api/external-reviews');
  endpoint.searchParams.set('token',token);
  endpoint.searchParams.set('page',location.href.split('#')[0]);
  let ready=false,selecting=false,selected=null,submitting=false;
  const host=document.createElement('div');host.id='siriai-review-widget';
  document.body.append(host);
  const shadow=host.attachShadow({mode:'closed'});
  shadow.innerHTML=`<style>
    :host{all:initial;font-family:system-ui,-apple-system,'Noto Sans KR',sans-serif;color:#26334a}
    *,*:before,*:after{box-sizing:border-box}
    button,input,textarea{font:inherit}
    .bar{position:fixed;z-index:2147483646;right:18px;bottom:18px;max-width:calc(100vw - 36px);background:#fff;border:1px solid #dce3ea;box-shadow:0 12px 35px #18304d33;border-radius:18px;padding:12px 14px;display:flex;align-items:center;gap:10px;font-size:13px}
    .bar strong{font-size:14px}.bar small{display:block;color:#65748a}.bar button,.panel button{border:0;border-radius:10px;padding:9px 12px;cursor:pointer;background:#243c5a;color:#fff;font-weight:700}
    .bar button[disabled],.panel button[disabled]{opacity:.5;cursor:wait}
    .panel{position:fixed;z-index:2147483647;right:18px;bottom:82px;width:min(430px,calc(100vw - 36px));max-height:calc(100vh - 100px);overflow:auto;background:#fff;border:1px solid #dce3ea;box-shadow:0 18px 50px #18304d44;border-radius:18px;padding:19px;display:none;font-size:14px}
    .panel.open{display:block}.head{display:flex;align-items:center;justify-content:space-between;gap:8px}.head h2{margin:0;font-size:18px}.close{background:#eef2f5!important;color:#283b52!important;padding:5px 9px!important}
    p{line-height:1.55;color:#617087;margin:8px 0 15px}.label{font-weight:700;margin:14px 0 5px;display:block}.original{background:#f3f5f8;border:1px solid #e1e6ed;border-radius:10px;padding:10px;white-space:pre-wrap;max-height:130px;overflow:auto;word-break:break-word}
    textarea,input[type=text],input[type=file]{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px;background:#fff;color:#26334a}textarea{min-height:115px;resize:vertical}.note{min-height:65px}.submit{width:100%;margin-top:15px}.message{color:#a3263e;font-weight:600;margin-top:10px;min-height:20px}.hint{font-size:12px;color:#627389;margin-top:8px}
    img.preview{display:block;max-width:100%;max-height:160px;object-fit:contain;margin:8px 0;border-radius:9px}
    @media(max-width:640px){.bar{left:10px;right:10px;bottom:10px}.panel{left:10px;right:10px;bottom:78px;width:auto}}
  </style><div class="bar"><div><strong>브랜드 수정 제안</strong><small id="status">검토 링크 확인 중…</small></div><button id="choose" disabled>수정할 곳 선택</button></div><div class="panel" id="panel"><div class="head"><h2 id="title">수정안 작성</h2><button class="close" id="close" type="button" aria-label="닫기">✕</button></div><p>선택한 문구나 사진의 수정안을 보내주세요. 원본 가이드는 바로 바뀌지 않습니다.</p><span class="label">현재 내용</span><div class="original" id="original"></div><label class="label" id="editLabel" for="proposal">제안 내용</label><textarea id="proposal" maxlength="5000" placeholder="바꿀 문구를 입력해 주세요."></textarea><input id="replacement" type="file" accept="image/jpeg,image/png,image/webp" hidden><img id="preview" class="preview" hidden alt="교체 사진 미리보기"><label class="label" for="reviewer">작성자 이름</label><input id="reviewer" type="text" maxlength="80" placeholder="브랜드 담당자 이름"><label class="label" for="note">추가 설명 (선택)</label><textarea id="note" class="note" maxlength="1000" placeholder="수정 이유나 요청사항"></textarea><button class="submit" id="submit" type="button">수정안 제출</button><div class="hint">제출 후 담당자가 변경 전후를 확인합니다.</div><div class="message" id="message" role="status"></div></div>`;
  const $=id=>shadow.getElementById(id);
  const status=$('status'),choose=$('choose'),panel=$('panel'),original=$('original'),proposal=$('proposal'),replacement=$('replacement'),preview=$('preview'),reviewer=$('reviewer'),note=$('note'),message=$('message');
  // A new Claude-made guide only needs this script tag. Explicit IDs on a
  // reviewed page take precedence; otherwise stable DOM-order IDs are used.
  function connectTargets(){
    let index=0;
    const candidates=document.querySelectorAll('main *,article *,section *,body *');
    for(const element of candidates){
      if(element.closest('#siriai-review-widget,nav,footer,form,button,a,[role="button"]'))continue;
      if(element.hasAttribute('data-siriai-review-id'))continue;
      if(element.closest('[data-siriai-review-id]'))continue;
      const tag=element.tagName;
      const text=(element.innerText||'').trim();
      const isImage=tag==='IMG';
      const isText=/^(P|H1|H2|H3|H4|H5|H6|LI|BLOCKQUOTE|FIGCAPTION)$/.test(tag)
        ||(tag==='DIV'&&text.length>=8&&![...element.children].some(child=>/^(DIV|P|UL|OL|SECTION|ARTICLE)$/.test(child.tagName)));
      if((isImage||isText)&&getComputedStyle(element).display!=='none'){
        index++;
        element.setAttribute('data-siriai-review-id',`auto-${String(index).padStart(4,'0')}`);
      }
    }
  }
  connectTargets();
  function targetFor(node){return node instanceof Element?node.closest('[data-siriai-review-id]'):null;}
  function open(target){
    if(selected)selected.style.outline='';
    selected=target;selecting=false;choose.textContent='수정할 곳 선택';
    selected.style.outline='3px solid #c43b65';
    selected.scrollIntoView({block:'nearest'});
    const image=target.tagName==='IMG';
    original.textContent=image?(target.getAttribute('alt')||target.getAttribute('src')||'사진'):(target.innerText||target.textContent||'').trim().slice(0,5000);
    $('title').textContent=image?'사진 교체 요청':'문구 수정 제안';
    $('editLabel').textContent=image?'새 사진 선택':'바꿀 문구';
    proposal.hidden=image;replacement.hidden=!image;preview.hidden=true;replacement.value='';proposal.value=image?'':original.textContent;
    note.value='';message.textContent='';panel.classList.add('open');proposal.hidden?replacement.focus():proposal.focus();
  }
  function close(){panel.classList.remove('open');if(selected)selected.style.outline='';selected=null;}
  choose.addEventListener('click',()=>{if(!ready)return;close();selecting=!selecting;choose.textContent=selecting?'선택 취소':'수정할 곳 선택';status.textContent=selecting?'가이드에서 수정할 문구·사진을 누르세요.':'수정할 곳을 선택해 주세요.';});
  $('close').addEventListener('click',close);
  document.addEventListener('click',event=>{if(!ready||!selecting)return;const target=targetFor(event.target);if(!target)return;event.preventDefault();event.stopPropagation();open(target);},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){close();selecting=false;choose.textContent='수정할 곳 선택';}},true);
  replacement.addEventListener('change',()=>{const file=replacement.files?.[0];if(!file){preview.hidden=true;return;}if(file.size>6000000){message.textContent='6MB 이하의 사진을 선택해 주세요.';replacement.value='';return;}preview.src=URL.createObjectURL(file);preview.hidden=false;message.textContent='';});
  $('submit').addEventListener('click',async()=>{
    if(!selected||submitting)return;
    const name=reviewer.value.trim(),kind=selected.tagName==='IMG'?'image':'text';
    if(!name){message.textContent='작성자 이름을 입력해 주세요.';reviewer.focus();return;}
    if(kind==='image'&&!replacement.files?.[0]){message.textContent='교체할 사진을 선택해 주세요.';return;}
    if(kind==='text'&&(!proposal.value.trim()||proposal.value.trim()===original.textContent.trim())){message.textContent='바뀐 문구를 입력해 주세요.';return;}
    submitting=true;$('submit').disabled=true;message.textContent='제출 중…';
    try{
      let options;
      const common={targetId:selected.getAttribute('data-siriai-review-id'),originalValue:kind==='image'?(selected.getAttribute('src')||''):original.textContent,name,note:note.value};
      if(kind==='image'){
        const form=new FormData();for(const [key,value] of Object.entries(common))form.append(key,value||'');form.append('file',replacement.files[0]);options={method:'POST',body:form,credentials:'omit',referrerPolicy:'no-referrer'};
      }else options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...common,proposedValue:proposal.value}),credentials:'omit',referrerPolicy:'no-referrer'};
      const result=await fetch(endpoint.href,options),data=await result.json();
      if(!result.ok)throw Error(data.error||'제출하지 못했습니다.');
      close();status.textContent='수정안이 접수되었습니다. 다른 곳도 선택할 수 있습니다.';
    }catch(error){message.textContent=error instanceof Error?error.message:'제출하지 못했습니다.';}
    finally{submitting=false;$('submit').disabled=false;}
  });
  fetch(endpoint.href,{credentials:'omit',referrerPolicy:'no-referrer'}).then(async result=>{const data=await result.json();if(!result.ok)throw Error(data.error||'검토 링크를 확인해 주세요.');if(!document.querySelector('[data-siriai-review-id]'))throw Error('이 가이드에는 수정 가능한 영역이 연결되지 않았습니다.');ready=true;choose.disabled=false;status.textContent='수정할 곳을 선택해 주세요.';}).catch(error=>{status.textContent=error instanceof Error?error.message:'검토 기능을 열지 못했습니다.';});
})();
