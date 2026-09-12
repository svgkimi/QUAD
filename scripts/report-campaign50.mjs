import {readFileSync,writeFileSync} from "node:fs";
const out=process.argv[2]??"qa/basic50-2026-09-12";
const result=JSON.parse(readFileSync(out+"/simulation.json","utf8")), specs=JSON.parse(readFileSync(out+"/developer-scenarios.json","utf8"));
let developer="# 기본 50: 단계별 개발자 시나리오\n\n설계 별점은 목표치이며 인간 체감 검증을 통과했다는 뜻이 아니다. 독립 명세 BASIC50_SPEC.json과 소스 설정을 비교했다.\n\n";
let user="# 기본 50: 실행 기반 사용자 시나리오\n\n실제 사람의 인터뷰/실기기 플레이 기록이 아니다. 5개 시드와 4개 입력 정책을 엔진에서 실행한 모사 시나리오다. 느린 정책은 생각 700ms/입력 90ms, 빠른 정책은 생각 120ms/입력 35ms, 시간 진행은 50ms이다. 봇은 사람의 시각 인지·손가락 실수를 재현하지 않는다.\n\n";
for(const s of specs){
 const goal=s.kind==="duel"?"AI 보드 넘침":s.kind==="survival"?s.surviveMs/1000+"초 생존":s.target+"줄 제거"+(s.limitMs?" / "+s.limitMs/1000+"초":"");
 developer+=`## ${s.id}번 — ${goal}\n\n- 예상 난이도: ${s.difficulty}/5. 낙하: ${s.gravityMs}ms/칸. 시작 장애물: ${s.obstacleRows}줄.${s.aiMoveMs?" AI 배치 간격: "+s.aiMoveMs+"ms.":""}\n- ${s.developerScenario}\n- 실패: ${s.limitMs?"제한 시간 도달 또는 ":""}보드 넘침. 목표 달성 전에는 별·다음 단계 해금 금지.\n- 무입력/DROP 반복 통과 없음, 새 시드 재시작, 명시 시드 재현, 완료 후 입력 차단 확인.\n\n`;
 const entries=result.rows.filter(r=>r.stage===s.id);
 const win=entries.find(r=>r.profile==="fast-agent"&&r.outcome==="cleared");
 const slower=entries.find(r=>r.profile==="steady-agent"&&r.outcome!=="cleared")??entries.find(r=>r.profile==="steady-agent");
 user+=`## ${s.id}번 — ${goal}\n\n- 빠른 정책: 시드 ${win?.seed}, ${(win?.elapsedMs/1000).toFixed(2)}초에 클리어. ${win?.pieces}개 배치, ${win?.lines}줄 제거, ${win?.stars}별.\n- 느린 정책 사례: 시드 ${slower.seed}, ${slower.elapsedMs/1000}초, ${slower.outcome} (${slower.reason}), ${slower.lines}줄 제거.\n- 무입력 0/5, DROP 반복 0/5 클리어 여부는 COMPARISON.md의 실제 집계를 참고한다.\n- 일치 판정: 목표/승패 규칙은 ${result.summary.find(x=>x.stage===s.id).contract}; 체감 난이도·재도전 재미는 미확인.\n\n`;
}
writeFileSync(out+"/DEVELOPER_SCENARIOS.md",developer);
writeFileSync(out+"/USER_SCENARIOS.md",user);
console.log("Wrote 50 developer and 50 observed-policy scenarios");
