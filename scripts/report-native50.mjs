import {readFileSync,writeFileSync,mkdirSync,copyFileSync,cpSync} from "node:fs";
import {createHash} from "node:crypto";
import {join} from "node:path";
const [root]=process.argv.slice(2);
if(!root)throw Error("Usage: node scripts/report-native50.mjs BUILD_ROOT");
const out="qa/basic50-2026-09-12";
const specs=JSON.parse(readFileSync("campaign-planning/BASIC50_SPEC.json","utf8"));
const hash=createHash("sha256").update(readFileSync(join(root,"web/index.html"))).digest("hex");
let text="# iOS Simulator 단계별 대조\n\n";
text+="iPhone 16 / iOS 26.5 (23F77), Xcode 26.6 (17F113). 일반 네이티브 WKWebView 393×759와 같은 시뮬레이터 안의 QA용 320×568 고정 WebView를 검사했다. 작은 호스트는 별도 실기기/SE 검사가 아니다. UI 조작은 QA 스크립트의 semantic click이며 물리 손가락 입력은 아니다.\n\n";
text+="웹 빌드 SHA-256: "+hash+"\n\nQA 호스트만 스테이지 전체 해금 데이터를 주입했다. 일반 테스트 앱은 주입하지 않는다.\n\n";
const failures=[];
for(const suffix of ["","-compact"]){
 const events=JSON.parse(readFileSync(join(root,"native-events"+suffix+".json"),"utf8"));
 const rows=events.filter(e=>e.phase==="stage-checked");
 if(!events.some(e=>e.phase==="done"&&e.checkedStages===50)||rows.length!==50)failures.push(suffix+": incomplete");
 mkdirSync(join(out,"native"),{recursive:true});
 copyFileSync(join(root,"native-events"+suffix+".json"),join(out,"native/events"+suffix+".json"));
 cpSync(join(root,"screenshots"+suffix),join(out,"native/screenshots"+suffix),{recursive:true});
 text+="## "+(suffix?"축소 호스트 320×568":"기본 호스트 393×759")+"\n\n| 단계 | 시작 목표 | HUD | 게임판·버튼 | AI | 정지 | 대조 |\n|---|---|---|---|---|---|---|\n";
 for(const spec of specs){
  const e=rows.find(e=>e.stage===spec.id);
  const goal=spec.kind==="duel"?"AI 보드 넘치게 하기":spec.kind==="survival"?spec.surviveMs/1000+"초 생존":spec.target+"줄 제거"+(spec.limitMs?" · "+spec.limitMs/1000+"초":"");
  const intro=e?.intro?.includes(goal)??false;
  const hud=Boolean(e?.hud?.includes(spec.id+" / 50")&&(spec.kind==="duel"?e.hud.includes("AI "):spec.kind==="survival"?e.hud.includes("초"):e.hud.includes("/ "+spec.target+"줄")));
  const board=e?.board;
  const geometry=Boolean(e&&!e.overflow&&board&&e.keys.length===6&&e.keys.every(k=>k.w>=44&&k.h>=44&&k.x>=0&&k.y>=0&&k.x+k.w<=e.viewport[0]+.5&&k.y+k.h<=e.viewport[1]+.5&&!(k.x<board.x+board.w&&k.x+k.w>board.x&&k.y<board.y+board.h&&k.y+k.h>board.y)));
  const ai=spec.kind!=="duel"||e?.aiMoved;
  const pass=intro&&hud&&geometry&&ai&&e?.pauseStable;
  if(!pass)failures.push(suffix+" stage "+spec.id);
  text+="| "+spec.id+" | "+goal+" | "+(hud?"PASS":"FAIL")+" | "+(geometry?"PASS":"FAIL")+" | "+(spec.kind==="duel"?(ai?"동작":"FAIL"):"해당 없음")+" | "+(e?.pauseStable?"PASS":"FAIL")+" | "+(pass?"일치":"불일치")+" |\n";
 }
}
text+="\n불일치: "+failures.length+"\n\n## 한계\n\n- 모든 단계의 네이티브 진입/목표/AI 이동/정지/좌표 검사이며, 시뮬레이터에서 50단계를 사람이 직접 클리어한 기록은 아니다. 승패·별 결과는 별도 엔진 1,000판과 회귀 검사에서 검증했다.\n- VoiceOver/TalkBack, iPhone/Android 실기기, 실제 햅틱·청감, 장시간 플레이 및 사람의 난이도 평가는 미확인.\n- 첫 검사에서 카운트다운 직후 캔버스 크기 계산 전 패드 침범을 관측했다. useLayoutEffect로 첫 페인트 전에 크기를 결정하고, 겹침 assertion을 보강한 새 빌드를 재검사했다.\n";
writeFileSync(join(out,"NATIVE_COMPARISON.md"),text);
console.log(JSON.stringify({buildHash:hash,stagesPerHost:50,hosts:2,failures}));
if(failures.length)process.exitCode=1;
