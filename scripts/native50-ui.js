(async () => {
  const send = value => window.webkit.messageHandlers.quadQA.postMessage(JSON.stringify(value));
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const find = label => [...document.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === label || b.textContent.trim() === label || [...b.querySelectorAll("span")].some(s => s.textContent.trim() === label));
  const click = label => { const b=find(label); if(!b||b.disabled)throw Error("Missing/disabled "+label);b.click(); };
  const wait = async test => { for(let n=0;n<300;n++){if(test())return;await delay(100);}throw Error("UI wait timeout"); };
  const capture = async name => { window.QUAD_QA_CAPTURED=null; await delay(100); send({capture:name});await wait(()=>window.QUAD_QA_CAPTURED===name); };
  const rect = element => {if(!element)return null;const r=element.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
  const layout = () => ({viewport:[innerWidth,innerHeight],board:rect(document.querySelector(".play-board-region canvas")),keys:[...document.querySelectorAll('[data-testid="touch-controls"] button')].map(b=>({label:b.getAttribute("aria-label"),...rect(b)})),overflow:document.documentElement.scrollWidth>innerWidth});
  window.addEventListener("error",e=>send({error:e.message}));
  window.addEventListener("unhandledrejection",e=>send({error:String(e.reason)}));
  try {
    localStorage.setItem("quad:campaign-basic50-v1",JSON.stringify({version:1,completed:50}));
    await wait(()=>find("스테이지 모드"));
    await capture("main");
    click("스테이지 모드");await wait(()=>document.querySelector('[aria-label^="50번 "]'));
    if(document.querySelectorAll('button[aria-label*="번 "]').length!==50)throw Error("Not 50 stages");
    if(!document.body.textContent.includes("/ 150"))throw Error("Not 150 stars");
    await capture("stages");
    for(let id=1;id<=50;id++){
      const button=document.querySelector('[aria-label^="'+id+'번 "]');button.scrollIntoView({block:"center"});button.click();
      await wait(()=>find("이 스테이지 시작"));
      const intro=document.querySelector('[role="dialog"]')?.textContent;
      click("이 스테이지 시작");
      await wait(()=>find("일시정지")&&!find("하드드롭")?.disabled);
      const hud=()=>document.querySelector('[aria-label="스테이지 '+id+' 진행"]')?.textContent;
      if(!hud()?.includes(id+" / 50"))throw Error("Wrong HUD at "+id);
      const geometry=layout();
      if(geometry.overflow)throw Error("Overflow at "+id);
      if(!geometry.board || geometry.keys.length!==6)throw Error("Missing board/controls at "+id);
      if(geometry.board.x<0 || geometry.board.y<0 || geometry.board.x+geometry.board.w>innerWidth+.5 || geometry.board.y+geometry.board.h>innerHeight+.5)throw Error("Board clipped at "+id);
      for(const key of geometry.keys){
        if(key.w<44||key.h<44||key.x<-.5||key.x+key.w>innerWidth+.5||key.y+key.h>innerHeight+.5)throw Error("Clipped/small key "+id+" "+JSON.stringify(key));
        const b=geometry.board;
        if(key.x<b.x+b.w && key.x+key.w>b.x && key.y<b.y+b.h && key.y+key.h>b.y)throw Error("Board overlaps key at "+id+" "+key.label);
      }
      if(id%5===0){
        const ai=()=>document.querySelector('[aria-label^="AI 보드,"]')?.innerHTML;
        const before=ai();await wait(()=>ai()!==before);
      }
      if([1,14,49,50].includes(id))await capture("play-"+id);
      click("일시정지");await delay(50);
      const frozen=hud();await delay(120);
      if(hud()!==frozen)throw Error("Pause clock moved at "+id);
      send({phase:"stage-checked",stage:id,intro,hud:frozen,...geometry,aiMoved:id%5===0,pauseStable:true});
      if([1,14,49,50].includes(id))await capture("stage-"+id);
      click("메인으로");await delay(50);click("메인으로");
      await wait(()=>find("스테이지 모드"));click("스테이지 모드");await wait(()=>document.querySelector('[aria-label^="50번 "]'));
    }
    send({phase:"done",checkedStages:50});
  }catch(error){send({phase:"failed",error:String(error)});}
})();
