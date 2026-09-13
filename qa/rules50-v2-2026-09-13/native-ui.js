/** 입력: Simulator QA 전용 WKWebView / 출력: 50단계의 목표·별·정지·좌표 증거. 일반 앱에는 주입하지 않는다. */
(async () => {
  const send = value => window.webkit.messageHandlers.quadQA.postMessage(JSON.stringify(value));
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const find = label => [...document.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === label || b.textContent.trim() === label || [...b.querySelectorAll("span")].some(s => s.textContent.trim() === label));
  const click = label => { const b = find(label); if (!b || b.disabled) throw Error("Missing/disabled " + label); b.click(); };
  const wait = async test => { for (let n = 0; n < 300; n++) { if (test()) return; await delay(100); } throw Error("UI wait timeout"); };
  const capture = async name => { window.QUAD_QA_CAPTURED = null; await delay(100); send({ capture: "rules-v2-" + name }); await wait(() => window.QUAD_QA_CAPTURED === "rules-v2-" + name); };
  const rect = node => { if (!node) throw Error("Missing geometry node"); const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const inside = r => r.x >= -.5 && r.y >= -.5 && r.x + r.w <= innerWidth + .5 && r.y + r.h <= innerHeight + .5;
  window.addEventListener("error", e => send({ error: e.message }));
  window.addEventListener("unhandledrejection", e => send({ error: String(e.reason) }));
  try {
    localStorage.setItem("quad:campaign-basic50-v1", JSON.stringify({ version: 1, completed: 50 }));
    await wait(() => find("스테이지 모드")); await capture("main");
    click("스테이지 모드"); await wait(() => document.querySelector('[aria-label^="50번 "]'));
    if (document.querySelectorAll('button[aria-label*="번 "]').length !== 50) throw Error("Not 50 stages");
    await capture("stages");
    const samples = [1, 3, 5, 6, 10, 12, 14, 49, 50];
    for (let id = 1; id <= 50; id++) {
      const mode = id % 10 === 0 ? "보스 대전" : id % 5 === 0 ? "AI 대전" : [3, 12].includes(id) ? "단일 미션" : [14, 23, 33, 43].includes(id) ? "생존" : "타임어택";
      const button = document.querySelector('[aria-label^="' + id + '번 "]'); button.scrollIntoView({ block: "center" }); button.click();
      await wait(() => find("이 스테이지 시작"));
      const intro = document.querySelector('[role="dialog"]');
      if (intro.querySelector("h2")?.textContent !== "스테이지 " + id) throw Error("Decorative stage title remains");
      const criteria = intro.querySelector('[aria-label="별 획득 조건"]');
      if (criteria?.children.length !== 3) throw Error("Missing star criteria");
      const criteriaText = criteria.textContent;
      if (samples.includes(id)) await capture("intro-" + id);
      click("이 스테이지 시작"); await wait(() => find("일시정지") && !find("하드드롭")?.disabled);
      const hud = () => document.querySelector('[aria-label="스테이지 ' + id + ' 진행"]');
      if (hud()?.firstElementChild?.textContent !== id + " / 50 · " + mode || hud().children.length !== 2) throw Error("Wrong mode/HUD at " + id);
      const boardNode = document.querySelector(".play-board-region canvas"), board = rect(boardNode);
      const keys = [...document.querySelectorAll('[data-testid="touch-controls"] button')].map(b => ({ label: b.getAttribute("aria-label"), ...rect(b) }));
      const hudRect = rect(find("목표와 별 조건 보기"));
      if (document.documentElement.scrollWidth > innerWidth || keys.length !== 6) throw Error("Overflow/missing controls at " + id);
      for (const r of [board, hudRect, ...keys]) if (!inside(r)) throw Error("Clipped at " + id + " " + JSON.stringify(r));
      for (const key of keys) {
        if (key.w < 44 || key.h < 44) throw Error("Small key");
        if (key.x < board.x + board.w && key.x + key.w > board.x && key.y < board.y + board.h && key.y + key.h > board.y) throw Error("Board/key overlap");
      }
      if (intro.textContent.includes("◇") && !boardNode.getAttribute("aria-label")?.includes("목표")) throw Error("Missing target alternative at " + id);
      if (id % 5 === 0) { const ai = () => document.querySelector('[aria-label^="AI 보드,"]')?.innerHTML; const before = ai(); await wait(() => ai() !== before); }
      if (samples.includes(id)) await capture("play-" + id);
      click("목표와 별 조건 보기"); await wait(() => document.querySelector('[role="dialog"] [aria-label="별 획득 조건"]'));
      const detail = document.querySelector('[role="dialog"]');
      if (detail.querySelector('[aria-label="별 획득 조건"]').textContent !== criteriaText) throw Error("Criteria changed at " + id);
      for (const b of detail.querySelectorAll("button")) if (!inside(rect(b))) throw Error("Clipped criteria button at " + id);
      const frozen = hud().textContent, aiFrozen = document.querySelector('[aria-label^="AI 보드,"]')?.innerHTML;
      await delay(200);
      if (hud().textContent !== frozen || document.querySelector('[aria-label^="AI 보드,"]')?.innerHTML !== aiFrozen) throw Error("Criteria did not pause game");
      if (samples.includes(id)) await capture("criteria-" + id);
      click("계속하기"); await wait(() => !document.querySelector('[role="dialog"]') && !find("하드드롭")?.disabled);
      click("일시정지"); await delay(50);
      const pauseDialog = document.querySelector('[role="dialog"]');
      for (const b of pauseDialog.querySelectorAll("button")) if (!inside(rect(b))) throw Error("Clipped pause button at " + id);
      if (id === 5) await capture("pause-5");
      send({ phase: "stage-checked", stage: id, mode, hud: frozen, criteria: criteriaText, viewport: [innerWidth, innerHeight], board, keys, hudRect, aiMoved: id % 5 === 0, criteriaPauseStable: true, criteriaResume: true });
      click("메인으로"); await delay(50); click("메인으로"); await wait(() => find("스테이지 모드"));
      click("스테이지 모드"); await wait(() => document.querySelector('[aria-label^="50번 "]'));
    }
    // 결과·별 저장까지 실제 UI 액션으로 확인하는 고정 시드 QA. 일반 앱의 난수/기록을 바꾸지 않는다.
    const clearCases = [
      { id: 1, seed: 1, moves: "LLLDDCRRDDCCLDRRRRDCLLLLDRRRRD" },
      { id: 3, seed: 8, moves: "LLLD" },
      { id: 6, seed: 7, moves: "RDRD" },
      { id: 12, seed: 7, moves: "CLLLLD" },
    ];
    const codes = { L: "ArrowLeft", R: "ArrowRight", C: "ArrowUp", D: "Space" };
    for (const fixture of clearCases) {
      const button = document.querySelector('[aria-label^="' + fixture.id + '번 "]'); button.scrollIntoView({ block: "center" }); button.click();
      await wait(() => find("이 스테이지 시작"));
      const originalRandom = Math.random; Math.random = () => fixture.seed / 4294967296;
      click("이 스테이지 시작"); await wait(() => find("일시정지") && !find("하드드롭")?.disabled); Math.random = originalRandom;
      for (const symbol of fixture.moves) {
        const code = codes[symbol];
        window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true, cancelable: true }));
        await delay(25);
        window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code, bubbles: true, cancelable: true }));
      }
      await wait(() => document.querySelector('[role="dialog"] h2')?.textContent === "스테이지 클리어!");
      await wait(() => JSON.parse(localStorage.getItem("quad:campaign-basic50-v1"))?.stars?.[fixture.id] === 3);
      const result = document.querySelector('[role="dialog"]');
      if (!result.querySelector('[aria-label="별 획득 조건"]')) throw Error("Missing result criteria");
      if (!find("하드드롭").disabled) throw Error("Terminal input enabled");
      await capture("result-" + fixture.id);
      send({ phase: "clear-checked", stage: fixture.id, seed: fixture.seed, moves: fixture.moves, stars: 3, persisted: true, result: result.textContent });
      click("단계 목록"); await wait(() => document.querySelector('[aria-label^="50번 "]'));
    }
    send({ phase: "done", checkedStages: 50, clearedThroughUI: clearCases.length });
  } catch (error) { send({ phase: "failed", error: String(error) }); }
})();
