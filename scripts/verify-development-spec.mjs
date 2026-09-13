import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const html = readFileSync(resolve(root, "campaign-planning/NEXT_LEVEL_REVIEW.html"), "utf8");
assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/.test(html), "Review must not access network/storage");
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  beforeParse(window) { window.addEventListener("error", event => errors.push(event.message)); },
});
const document = dom.window.document;
/** 입력: 선택자 / 출력: 존재하는 시안 요소, 없으면 검사 실패. */
const element = selector => { const node = document.querySelector(selector); assert(node, selector); return node; };
const screen = name => element(`[data-screen=${name}]`).click();
const action = name => element(`[data-action=${name}]`).click();
try {
  for (const button of document.querySelectorAll("[data-screen]")) {
    button.click();
    assert.equal(document.querySelectorAll("#board .cell").length, 200);
  }
  screen("stages"); action("entry");
  assert.equal(element("#sheet h2").textContent, "스테이지 53");
  action("play"); assert(element("#overlay").hidden);
  assert.equal(document.querySelectorAll("#board .target").length, 8);
  screen("blast"); assert.equal(document.querySelectorAll("#board .target").length, 8);
  element("#blast-step").click();
  assert.equal(document.querySelectorAll("#board .target").length, 4);
  assert(element("#goal-text").textContent.includes("4개"));
  screen("shapes");
  for (const shape of ["I5", "L5", "I6"]) {
    element(`[data-shape=${shape}]`).click();
    for (let i = 0; i < 4; i++) {
      assert.equal(document.querySelectorAll("#shape-grid .on").length, shape === "I6" ? 6 : 5);
      action("rotate");
    }
  }
  screen("play"); element("#goal-button").click();
  assert(!element("#overlay").hidden); action("resume");
  element("#pause-button").click(); action("restart"); action("pause");
  assert.equal(element("#sheet h2").textContent, "일시정지");
  action("exit"); action("stages");
  assert.equal(element("#sheet h2").textContent, "스테이지");
  screen("success"); action("next");
  assert.equal(element("#sheet h2").textContent, "스테이지 54");
  assert(element("#sheet .summary").textContent.includes("10개"));
  assert.equal(document.querySelectorAll("#board .target").length, 10);
  assert(element('#sheet [aria-label="별 획득 조건"]').textContent.includes("100초"));
  assert.deepEqual(errors, []);
  for (const file of ["GAME_DEVELOPMENT_SPEC_V1.md", "CURRENT_REVIEW.md"]) {
    const path = resolve(root, "campaign-planning", file);
    for (const match of readFileSync(path, "utf8").matchAll(/\]\(([^)]+)\)/g)) {
      if (!/^https?:/.test(match[1])) assert(existsSync(resolve(dirname(path), match[1])), match[1]);
    }
  }
  console.log("PASS: 7 review views, 8→4 blast example, 12 shape rotations, confirmation routes, 53→54 goals/stars and document links. Prototype only; not gameplay or Simulator verification.");
} finally { dom.window.close(); }
