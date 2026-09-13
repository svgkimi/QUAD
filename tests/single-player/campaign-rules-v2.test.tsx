import { describe, expect, it, vi } from "vitest";
import { applyAction, createInitialState, createEmptyBoard, getShapeCells, type EngineState, type ScoreEvent } from "../../src/engine";
import { calculateAttackLines } from "../../src/campaign/attack";
import { advanceTargetCells } from "../../src/campaign/targets";
import { addGarbage } from "../../src/campaign/garbage";
import { STAGES, makeStageBoard, type StageDefinition } from "../../src/campaign/stages";
import { getCampaignRun, reduceCampaign } from "../../src/campaign/session";
import { StageCriteria } from "../../src/components/StageCriteria";
import { StageHud } from "../../src/components/StageHud";
import { starRequirements, previewStageStars } from "../../src/campaign/stars";
import { click, mount } from "./agent-A-harness";

const event = (overrides: Partial<ScoreEvent> = {}): ScoreEvent => ({ points: 0, category: "none", tSpin: "none", combo: 1, backToBack: false, isLevelUp: false, clearedRows: [], ...overrides });
const start = (stage = STAGES[4]) => reduceCampaign(createInitialState({ seed: 42 }), { type: "START", seed: 42 }, stage);
/** 입력: 엔진 상태·줄 수 / 출력: 세로 I로 정확히 해당 줄을 지울 수 있는 제어된 보드. */
function readyLines(state: EngineState, count: number): EngineState {
  const board = createEmptyBoard().map(row => [...row]);
  for (let y = 40 - count; y < 40; y++) for (let x = 0; x < 10; x++) board[y][x] = x === 4 ? null : "J";
  const minX = Math.min(...getShapeCells("I", 1).map(cell => cell.x));
  return { ...state, board, active: { type: "I", rotation: 1, position: { x: 4 - minX, y: 18 } } };
}

describe("historical attack policy with corrected B2B boundary", () => {
  it.each([["single",0],["double",1],["triple",2],["tetris",4]] as const)("%s base is %i for BOTH sides", (category, amount) => {
    expect(calculateAttackLines(event({ category }), false)).toBe(amount);
    const count = ["single","double","triple","tetris"].indexOf(category) + 1;
    const stage = { ...STAGES[4], aiHandicapRows: 0 };
    const base = start(stage);
    const player = reduceCampaign(readyLines(base, count), { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(player)?.sent).toBe(amount);
    expect(getCampaignRun(player)!.ai!.board.flat().filter(Boolean)).toHaveLength(amount * 9);
    const run = getCampaignRun(base)!;
    const ai = reduceCampaign({ ...base, campaign: { ...run, ai: readyLines(run.ai!, count) } } as EngineState, { type: "TICK", deltaMs: stage.aiMoveMs! }, stage);
    expect(getCampaignRun(ai)?.received).toBe(amount);
    expect(ai.board.flat().filter(Boolean)).toHaveLength(amount * 9);
  });
  it("uses the real event producer: first four 4, next B2B four 5 plus combo 1", () => {
    const stage = { ...STAGES[4], aiHandicapRows: 0 }, base = start(stage);
    const first = reduceCampaign(readyLines(base,4), { type: "HARD_DROP" }, stage);
    expect(first.lastScoreEvent?.points).toBe(800);
    expect(first.backToBack).toBe(true);
    expect(getCampaignRun(first)?.sent).toBe(4);
    const second = reduceCampaign(readyLines(first,4), { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(second)!.sent - getCampaignRun(first)!.sent).toBe(6);
    expect(second.lastScoreEvent?.points).toBe(1250);
    const afterSingle = applyAction(readyLines(first,1), { type: "HARD_DROP" });
    expect(afterSingle.backToBack).toBe(false);
    const afterGap = applyAction({ ...afterSingle, board: createEmptyBoard() }, { type: "HARD_DROP" });
    const freshFour = applyAction(readyLines(afterGap,4), { type: "HARD_DROP" });
    expect(calculateAttackLines(freshFour.lastScoreEvent!, afterGap.backToBack)).toBe(4);
  });
  it.each([["single",2],["double",4],["triple",6]] as const)("T-Spin %s base %i", (category, amount) => {
    expect(calculateAttackLines(event({ category, tSpin: "normal" }),false)).toBe(amount);
    expect(calculateAttackLines(event({ category, tSpin: "normal" }),true)).toBe(amount + 1);
    expect(calculateAttackLines(event({ category, tSpin: "mini" }),false)).toBe(1);
  });
  it.each([[1,0],[2,1],[3,1],[4,2],[5,2],[6,3],[7,3]])("combo %i adds %i", (combo, bonus) => {
    expect(calculateAttackLines(event({ category: "single", combo }),false)).toBe(bonus);
    expect(calculateAttackLines(event({ category: "none", tSpin: "normal", combo }),true)).toBe(0);
  });
  it("does not truncate the valid 10-line T-Spin/B2B/combo attack to 8", () => {
    const count = calculateAttackLines(event({ category: "triple", tSpin: "normal", combo: 6 }),true);
    expect(count).toBe(10);
    const base = applyAction(createInitialState(),{type:"START"});
    expect(addGarbage(base,count,42).state.board.flat().filter(Boolean)).toHaveLength(90);
  });
  it("cannot delete overflowing buffered cells by receiving a large attack", () => {
    const base = applyAction(createInitialState(),{type:"START"}), board = base.board.map(row=>[...row]); board[0][0] = "J";
    expect(addGarbage({ ...base, board },10,42).state.status).toBe("gameover");
  });
});

describe("target blocks and one-lock missions", () => {
  it("target coordinates follow line shifts without consuming unrelated targets", () => {
    const cells = [{x:0,y:35},{x:9,y:38},{x:0,y:39}];
    expect(advanceTargetCells(cells,[36])).toEqual([{x:0,y:36},{x:9,y:38},{x:0,y:39}]);
    expect(advanceTargetCells(cells,[38,39])).toEqual([{x:0,y:37}]);
    expect(advanceTargetCells(cells,[])).toBe(cells);
    expect(cells[0].y).toBe(35);
  });
  it.each(STAGES.filter(stage=>stage.targetCells))("stage $id marks actual occupied cells with unique coordinates", stage=>{
    const board=makeStageBoard(stage), cells=stage.targetCells!;
    expect(stage.kind).toBe("timed"); expect(cells).toHaveLength(stage.target);
    expect(new Set(cells.map(c=>`${c.x}:${c.y}`)).size).toBe(cells.length);
    expect(cells.every(c=>board[c.y][c.x]!==null)).toBe(true);
  });
  it("an unrelated line cannot complete the target goal; marked rows do", () => {
    const stage: StageDefinition = { ...STAGES[5], target:1, targetCells:[{x:0,y:39}], layers:[{rows:1,gap:3,width:4}], sequence:["I"] };
    let state=start(stage); const board=createEmptyBoard().map(row=>[...row]);
    for(let x=0;x<10;x++) board[38][x]=x>=3&&x<=6?null:"J";
    board[39][0]="J";board[39][3]="J";
    state=reduceCampaign({...state,board},{type:"HARD_DROP"},stage);
    expect(state.totalLinesCleared).toBe(1);expect(getCampaignRun(state)?.outcome).toBe("playing");
    expect(getCampaignRun(state)?.targetCells).toEqual([{x:0,y:39}]);
    const won=reduceCampaign(readyLines(state,1),{type:"HARD_DROP"},stage);
    expect(getCampaignRun(won)?.targetCells).toEqual([]);expect(getCampaignRun(won)?.outcome).toBe("cleared");
    expect(reduceCampaign(won,{type:"TICK",deltaMs:500},stage)).toBe(won);
  });
  it("two single clears do not satisfy a simultaneous double; HOLD is not a lock", () => {
    const stage={...STAGES[2],layers:[],target:2}, initial=start(stage);
    const held=reduceCampaign(initial,{type:"HOLD"},stage);
    expect(getCampaignRun(held)?.bestClear).toBe(0);
    const first=reduceCampaign(readyLines(initial,1),{type:"HARD_DROP"},stage);
    const second=reduceCampaign(readyLines(first,1),{type:"HARD_DROP"},stage);
    expect(second.totalLinesCleared).toBe(2);expect(getCampaignRun(second)?.outcome).toBe("playing");
    const won=reduceCampaign(readyLines(second,2),{type:"HARD_DROP"},stage);
    expect(getCampaignRun(won)?.outcome).toBe("cleared");expect(getCampaignRun(won)?.bestClear).toBe(2);
  });
  it.each(STAGES.filter(s=>s.kind!=="survival"))("stage $id has a finite failure deadline and pause freezes it",stage=>{
    const base=start(stage), paused=reduceCampaign(base,{type:"PAUSE"},stage);
    expect(reduceCampaign(paused,{type:"TICK",deltaMs:stage.limitMs!+1},stage)).toEqual(paused);
    const almost={...base,campaign:{...getCampaignRun(base)!,elapsedMs:stage.limitMs!-1}} as EngineState;
    expect(getCampaignRun(reduceCampaign(almost,{type:"TICK",deltaMs:2},stage))?.reason).toBe("timeout");
  });
});

describe("criteria presentation", () => {
  it("shows the same thresholds with actual results and labels predicted stars honestly", async()=>{
    const stage=STAGES[5], state=start(stage), run=getCampaignRun(state)!;
    const host=await mount(<StageCriteria stage={stage} run={run} lines={0}/>);
    for(const label of starRequirements(stage))expect(host.textContent).toContain(label);
    expect(host.textContent).toContain("◇ 표시");expect(host.textContent).toContain("현재 기록: 0.0초");
    expect(previewStageStars(stage,run,0)).toBe(3);
    expect(previewStageStars(stage,{...run,elapsedMs:stage.limitMs!},0)).toBe(1);
  });
  it("the HUD opens criteria with a semantic button and names target progress in cells",async()=>{
    const onShowCriteria=vi.fn(), stage=STAGES[5];
    const host=await mount(<StageHud stage={stage} run={getCampaignRun(start(stage))} lines={0} onShowCriteria={onShowCriteria}/>);
    expect(host.textContent).toContain("◇ 0 / 4개");
    expect(host.querySelector('[aria-label="목표 달성 시 예상 3별"]')).not.toBeNull();
    await click(host,"목표와 별 조건 보기");expect(onShowCriteria).toHaveBeenCalledTimes(1);
  });
});
