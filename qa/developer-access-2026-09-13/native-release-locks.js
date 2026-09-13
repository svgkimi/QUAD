/** 입력: 일반 빌드 QA Simulator / 출력: 개발자 전용 권한이 일반 빌드에 노출되지 않았다는 대조. */
(async () => {
  const send = value => window.webkit.messageHandlers.quadQA.postMessage(JSON.stringify(value));
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async test => { for (let n = 0; n < 200; n++) { if (test()) return; await delay(100); } throw Error("UI wait timeout"); };
  try {
    localStorage.setItem("quad:campaign-basic50-v1", '{"version":1,"completed":0}');
    localStorage.setItem("quad:developer-mode", "true");
    const stages = () => [...document.querySelectorAll("button")].find(b => b.textContent.includes("스테이지 모드"));
    await wait(stages); stages().click(); await wait(() => document.querySelector('[aria-label^="50번 "]'));
    const enabled = [...document.querySelectorAll('button[aria-label*="번 "]')].filter(b => !b.disabled);
    if (enabled.length !== 1 || !enabled[0].getAttribute("aria-label").startsWith("1번 ")) throw Error("Release lock bypass");
    if (document.body.textContent.includes("개발자 연습")) throw Error("Developer mode visible in release");
    window.QUAD_QA_CAPTURED = null; send({ capture: "normal-stage-locks" });
    await wait(() => window.QUAD_QA_CAPTURED === "normal-stage-locks");
    send({ phase: "done", build: "normal", available: 1, locked: 49 });
  } catch (error) { send({ phase: "failed", error: String(error) }); }
})();
