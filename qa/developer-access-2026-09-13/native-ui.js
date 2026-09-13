/** 입력: 개발자 QA Simulator / 출력: 전체 선택·실제 후반 플레이·저장 비변경 증거. 사용자 앱에는 주입하지 않는다. */
(async () => {
  const send = value => window.webkit.messageHandlers.quadQA.postMessage(JSON.stringify(value));
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const find = label => [...document.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === label || b.textContent.trim() === label || [...b.querySelectorAll("span")].some(s => s.textContent.trim() === label));
  const click = label => { const b = find(label); if (!b || b.disabled) throw Error("Missing/disabled " + label); b.click(); };
  const wait = async test => { for (let n = 0; n < 200; n++) { if (test()) return; await delay(100); } throw Error("UI wait timeout"); };
  const capture = async name => { window.QUAD_QA_CAPTURED = null; send({ capture: name }); await wait(() => window.QUAD_QA_CAPTURED === name); };
  const key = async code => { window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true })); await delay(30); window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code, bubbles: true })); };
  const start = async id => {
    const b = document.querySelector('[aria-label^="' + id + '번 "]');
    if (!b || b.disabled) throw Error("Locked developer stage " + id);
    b.scrollIntoView({ block: "center" }); b.click();
    await wait(() => find("이 스테이지 시작")); click("이 스테이지 시작");
    await wait(() => find("일시정지") && !find("하드드롭")?.disabled);
    if (!document.querySelector('[aria-label="스테이지 ' + id + ' 진행"]')) throw Error("Wrong active stage " + id);
  };
  const snapshot = '{"version":1,"completed":2,"stars":{"1":3,"2":2}}';
  const storageKey = "quad:campaign-basic50-v1";
  const assertStorage = () => { if (localStorage.getItem(storageKey) !== snapshot) throw Error("Developer practice changed progress"); };
  window.addEventListener("error", event => send({ error: event.message }));
  window.addEventListener("unhandledrejection", event => send({ error: String(event.reason) }));
  try {
    localStorage.setItem(storageKey, snapshot);
    await wait(() => find("스테이지 모드"));
    if (!document.body.textContent.includes("DEV · 전체 단계 연습")) throw Error("Missing developer identification");
    await capture("developer-main"); click("스테이지 모드");
    await wait(() => document.querySelector('[aria-label^="50번 "]'));
    const buttons = [...document.querySelectorAll('button[aria-label*="번 "]')];
    if (buttons.length !== 50 || buttons.some(b => b.disabled)) throw Error("Not all stages open");
    if (buttons.some(b => b.getAttribute("aria-label").includes("완료"))) throw Error("Fake completion");
    if (!document.body.textContent.includes("기록 저장 안 함")) throw Error("Missing practice warning");
    document.querySelector('[aria-label^="50번 "]').scrollIntoView({ block: "center" });
    await delay(100); await capture("developer-stage-list");
    for (const id of [50, 30]) {
      await start(id);
      const ai = () => document.querySelector('[aria-label^="AI 보드,"]')?.innerHTML;
      const before = ai(); await wait(() => ai() && ai() !== before);
      const board = document.querySelector(".play-board-region canvas").getBoundingClientRect();
      if (board.width < 100 || board.x < 0 || board.right > innerWidth || board.bottom > innerHeight) throw Error("Clipped board");
      await capture("developer-play-" + id);
      click("일시정지"); await wait(() => find("다시하기"));
      click("다시하기"); await wait(() => find("다시 시작")); click("다시 시작");
      await wait(() => find("일시정지") && !find("하드드롭")?.disabled);
      assertStorage();
      send({ phase: "stage-checked", stage: id, aiMoved: true, restart: true, progressUnchanged: true, viewport: [innerWidth, innerHeight], board: { x: board.x, y: board.y, width: board.width, height: board.height } });
      click("일시정지"); await wait(() => find("메인으로")); click("메인으로");
      await wait(() => document.querySelector('[role="dialog"] h2')?.textContent === "메인으로 돌아갈까요?"); click("메인으로");
      await wait(() => find("스테이지 모드")); click("스테이지 모드");
      await wait(() => document.querySelector('[aria-label^="50번 "]'));
    }
    // 연습 클리어도 정상 규칙으로 평가하되 기존 저장값을 바꾸지 않아야 한다.
    const originalRandom = Math.random;
    try { Math.random = () => 7 / 4294967296; await start(12); } finally { Math.random = originalRandom; }
    for (const code of ["ArrowUp", "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft", "Space"]) await key(code);
    await wait(() => document.querySelector('[role="dialog"] h2')?.textContent === "스테이지 클리어!");
    if (!document.body.textContent.includes("이번 연습 3별")) throw Error("Missing earned practice stars");
    assertStorage(); await capture("developer-practice-result");
    click("다음 스테이지"); await wait(() => find("일시정지") && !find("하드드롭")?.disabled);
    if (!document.querySelector('[aria-label="스테이지 13 진행"]')) throw Error("Next stage remains locked");
    assertStorage();
    send({ phase: "done", available: 50, clearedStage: 12, earnedStars: 3, nextStage: 13, progressUnchanged: true, viewport: [innerWidth, innerHeight] });
  } catch (error) { send({ phase: "failed", error: String(error) }); }
})();
