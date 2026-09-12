import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, type EngineAction, type EngineState } from "../../src/engine";
import { STAGES, makeStageBoard, type StageDefinition } from "../../src/campaign/stages";
import { advanceTargetRows, getCampaignRun, reduceCampaign } from "../../src/campaign/session";
import { chooseOpponentActions } from "../../src/campaign/opponent";
import { addGarbage } from "../../src/campaign/garbage";

const fresh = () => createInitialState({ seed: 12 });

describe("campaign contracts", () => {
  it("has fifty stages and ten overflow duels with the approved difficulty ceiling", () => {
    expect(STAGES).toHaveLength(50);
    expect(STAGES.filter(s => s.kind === "duel").map(s => s.id)).toEqual([5,10,15,20,25,30,35,40,45,50]);
    expect(new Set(STAGES.map(s => s.kind))).toEqual(new Set(["lines", "timed", "survival", "duel"]));
    expect(STAGES.every(s => !s.reverseControls && !s.pieceLimit && !s.pressureMs)).toBe(true);
    expect(STAGES.filter(s => s.isBoss).map(s => [s.id, s.difficulty])).toEqual([[10,1.5],[20,2],[30,3],[40,3.5],[50,4]]);
    expect(STAGES.every(s => s.difficulty >= .5 && s.difficulty <= 4 && Number.isInteger(s.difficulty * 2))).toBe(true);
    expect(STAGES.filter(s => s.kind === "survival").map(s => s.surviveMs)).toEqual([75000,90000,90000,105000]);
    for (const boss of STAGES.filter(s => s.isBoss)) {
      const middle = STAGES[boss.id - 6];
      expect(boss.aiMoveMs!).toBeLessThan(middle.aiMoveMs!);
      expect(boss.aiHandicapRows).toBe(0); expect(middle.aiHandicapRows).toBe(0);
      expect(boss.aiLookahead).toBe(true); expect(middle.aiLookahead).toBe(false);
    }
  });
  it("tracks original target rows, not unrelated lines cleared above them", () => {
    expect(advanceTargetRows([35,38,39], [36])).toEqual([36,38,39]);
    expect(advanceTargetRows([35,38,39], [38,39])).toEqual([37]);
  });
  it("replays an explicit seed without mutation and randomizes a different seed", () => {
    const source = fresh(), original = JSON.stringify(source), stage = STAGES[13];
    const first = reduceCampaign(source, { type: "START", seed: 1 }, stage);
    const second = reduceCampaign(first, { type: "RESTART", seed: 99 }, stage);
    expect(first.board).toEqual(second.board); expect(first.pieceQueue).not.toEqual(second.pieceQueue);
    expect(reduceCampaign(source, { type: "START", seed: 1 }, stage)).toEqual(first);
    expect(JSON.stringify(source)).toBe(original);
    const classic = applyAction(first, { type: "RESTART", seed: 12 });
    expect(getCampaignRun(classic)).toBeNull(); expect(classic.gravityIntervalMs).toBeUndefined();
    expect(classic.board.flat().every(c => c === null)).toBe(true);
  });
  it("invalid setups are rejected and valid boards are copied", () => {
    const stage = STAGES[0], board = makeStageBoard(stage);
    const started = applyAction(fresh(), { type: "START", setup: { board, sequence: ["I"], gravityIntervalMs: 1200 } });
    expect(started.board).not.toBe(board); expect(started.board[39]).not.toBe(board[39]);
    expect(() => applyAction(fresh(), { type: "START", setup: { board: [], sequence: [], gravityIntervalMs: 1200 } })).toThrow();
  });
  it("clear is terminal even if resume/drop/tick is dispatched before the UI updates", () => {
    const stage: StageDefinition = { ...STAGES[0], target: 1, layers: [{ rows: 1, gap: 3, width: 4 }], sequence: ["I"] }; let state = reduceCampaign(fresh(), { type: "START" }, stage);
    state = reduceCampaign(state, { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(state)?.outcome).toBe("cleared");
    for (const action of [{ type: "RESUME" }, { type: "HARD_DROP" }, { type: "TICK", deltaMs: 99999 }] as const) expect(reduceCampaign(state, action, stage)).toBe(state);
  });
  it("pause freezes the deadline, survival pressure and AI clock", () => {
    for (const stage of [STAGES[4], STAGES[22], STAGES[21]]) {
      let state = reduceCampaign(fresh(), { type: "START" }, stage);
      state = reduceCampaign(state, { type: "PAUSE" }, stage);
      const paused = JSON.stringify(state);
      state = reduceCampaign(state, { type: "TICK", deltaMs: 600000 }, stage);
      expect(JSON.stringify(state)).toBe(paused);
    }
  });
  it("a time limit expires but survival clears at its boundary", () => {
    const timed = { ...STAGES[21], limitMs: 1 };
    const survival = { ...STAGES[22], surviveMs: 1 };
    expect(getCampaignRun(reduceCampaign(reduceCampaign(fresh(), { type: "START" }, timed), { type: "TICK", deltaMs: 2 }, timed))?.reason).toBe("timeout");
    expect(getCampaignRun(reduceCampaign(reduceCampaign(fresh(), { type: "START" }, survival), { type: "TICK", deltaMs: 2 }, survival))?.outcome).toBe("cleared");
  });
  it("survival pressure adds actual rows only while playing", () => {
    const stage = { ...STAGES[22], pressureMs: 1 };
    let state = reduceCampaign(fresh(), { type: "START" }, stage);
    state = reduceCampaign(state, { type: "TICK", deltaMs: 2 }, stage);
    expect(state.board[39].filter(c => c !== null)).toHaveLength(9);
    expect(getCampaignRun(state)?.received).toBe(1);
  });
  it("AI uses actual locks, waits initially, and does not win from a line target", () => {
    const stage = { ...STAGES[4], target: 0, aiHeadStartMs: 10, aiMoveMs: 10 };
    let state = reduceCampaign(fresh(), { type: "START" }, stage);
    const ai = getCampaignRun(state)!.ai!;
    state = reduceCampaign(state, { type: "TICK", deltaMs: 9 }, stage);
    expect(getCampaignRun(state)!.ai).toBe(ai);
    state = reduceCampaign(state, { type: "TICK", deltaMs: 11 }, stage);
    expect(getCampaignRun(state)!.ai!.board).not.toEqual(ai.board);
    expect(getCampaignRun(state)?.outcome).toBe("playing");
  });
  it("clearing a line sends real garbage; only overflow wins the duel", () => {
    const stage: StageDefinition = { ...STAGES[4], layers: [{ rows: 1, gap: 3, width: 4 }], sequence: ["I"] }; let state = reduceCampaign(fresh(), { type: "START" }, stage);
    state = reduceCampaign(state, { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(state)?.sent).toBe(1);
    expect(getCampaignRun(state)?.outcome).toBe("playing");
    expect(getCampaignRun(state)!.ai!.board[39].filter(c => c !== null)).toHaveLength(9);
    const run = getCampaignRun(state)!;
    const highBoard = run.ai!.board.map(row => [...row]); highBoard[20][0] = "J";
    const almost = { ...state, campaign: { ...run, ai: { ...run.ai!, board: highBoard } } };
    // Use a valid one-line-ready player board while keeping the almost-overflowing AI.
    const prepared = reduceCampaign(fresh(), { type: "START" }, stage);
    const won = reduceCampaign({ ...prepared, campaign: almost.campaign } as EngineState, { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(won)?.reason).toBe("ai-topout");
  });
  it("garbage shifts the active piece and does not mutate the defending state", () => {
    const state = applyAction(fresh(), { type: "START" }), snapshot = JSON.stringify(state);
    const result = addGarbage(state, 2, 123);
    expect(result.state.active!.position.y).toBe(state.active!.position.y - 2);
    expect(result.state.board).toHaveLength(40); expect(JSON.stringify(state)).toBe(snapshot);
    expect(addGarbage(state, 2, 123)).toEqual(result);
  });
  it("dormant legacy rule: limited pieces count locks, not HOLD, and allow success on the last piece", () => {
    const stage: StageDefinition = { ...STAGES[0], kind: "limited", target: 2, layers: [{ rows: 2, gap: 4, width: 2 }], sequence: ["O"], pieceLimit: 1 };
    let state = reduceCampaign(fresh(), { type: "START" }, stage);
    const held = reduceCampaign(state, { type: "HOLD" }, stage);
    expect(getCampaignRun(held)?.piecesUsed).toBe(0);
    const won = reduceCampaign(state, { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(won)?.piecesUsed).toBe(1);
    expect(getCampaignRun(won)?.outcome).toBe("cleared");
    state = reduceCampaign(state, { type: "MOVE_LEFT" }, stage);
    state = reduceCampaign(state, { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(state)?.reason).toBe("pieces");
    expect(reduceCampaign(state, { type: "RESUME" }, stage)).toBe(state);
  });
  it("dormant legacy rule: combo requires consecutive clearing locks, not just cumulative lines", () => {
    const stage: StageDefinition = { ...STAGES[0], kind: "combo", target: 2, layers: [{ rows: 4, gap: 4, width: 2 }], sequence: ["O", "O"] }; let state = reduceCampaign(fresh(), { type: "START" }, stage);
    state = reduceCampaign(state, { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(state)?.streak).toBe(1);
    expect(getCampaignRun(state)?.outcome).toBe("playing");
    const won = reduceCampaign(state, { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(won)?.streak).toBe(2);
    expect(getCampaignRun(won)?.outcome).toBe("cleared");
    const moved = reduceCampaign(state, { type: "MOVE_LEFT" }, stage);
    const broken = reduceCampaign(moved, { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(broken)?.streak).toBe(0);
    expect(getCampaignRun(broken)?.outcome).toBe("playing");
  });
  it("dormant legacy rule: reverse controls swaps only horizontal moves, including repeats and boundaries", () => {
    const stage = { ...STAGES[0], reverseControls: true }; const state = reduceCampaign(fresh(), { type: "START" }, stage);
    for (const [physical, logical] of [["MOVE_LEFT", "MOVE_RIGHT"], ["MOVE_RIGHT", "MOVE_LEFT"]] as const) {
      let actual = state, expected = state;
      for (let n = 0; n < 20; n++) {
        actual = reduceCampaign(actual, { type: physical }, stage);
        expected = applyAction(expected, { type: logical });
        expect(actual.active).toEqual(expected.active);
      }
    }
    for (const type of ["ROTATE_CW", "SOFT_DROP", "HOLD", "HARD_DROP"] as const) {
      expect(reduceCampaign(state, { type }, stage).active).toEqual(applyAction(state, { type }).active);
    }
    const paused = reduceCampaign(state, { type: "PAUSE" }, stage);
    expect(reduceCampaign(paused, { type: "MOVE_LEFT" }, stage).active).toEqual(paused.active);
    const classic = applyAction(state, { type: "RESTART", seed: 12 });
    expect(applyAction(classic, { type: "MOVE_LEFT" }).active!.position.x).toBe(classic.active!.position.x - 1);
  });
  it.each(STAGES.filter(s => s.kind === "survival"))("survival stage $id requires actual play, not waiting without input", stage => {
    let state = reduceCampaign(fresh(), { type: "START" }, stage);
    for (let ms = 0; ms <= stage.surviveMs! && getCampaignRun(state)?.outcome === "playing"; ms += 16) {
      state = reduceCampaign(state, { type: "TICK", deltaMs: 16 }, stage);
    }
    expect(getCampaignRun(state)?.reason).toBe("topout");
  });
  it("released survival stages never inject extra obstacles", () => {
    for (const stage of STAGES.filter(s => s.kind === "survival")) {
      let state = reduceCampaign(fresh(), { type: "START" }, stage);
      for (let t = 0; t < 20; t++) state = reduceCampaign(state, { type: "TICK", deltaMs: 1000 }, stage);
      expect(getCampaignRun(state)?.received).toBe(0);
    }
  });
  it("boss planning is deterministic, legal and does not mutate the source", () => {
    let state = reduceCampaign(fresh(), { type: "START" }, STAGES[29]);
    const ai = getCampaignRun(state)!.ai!, snapshot = JSON.stringify(ai);
    const plan = chooseOpponentActions(ai, true);
    expect(chooseOpponentActions(ai, true)).toEqual(plan);
    expect(JSON.stringify(ai)).toBe(snapshot);
    const next = plan.reduce(applyAction, ai);
    expect(next.status).toBe("playing"); expect(next.lastScoreEvent).not.toBe(ai.lastScoreEvent);
    expect(plan.filter(a => a.type === "HARD_DROP")).toHaveLength(1);
  });
  it.each(STAGES)("stage $id has a legal clearing witness (not a human difficulty rating)", stage => {
    let state = reduceCampaign(fresh(), { type: "START" }, stage);
    for (let turns = 0; turns < 2000 && getCampaignRun(state)?.outcome === "playing"; turns++) {
      // 새 독립 랜덤/고속 중력에서는 옛 6초 생존 정책이 피스를 방치한다.
      // 합법 경로 증명은 NEXT 탐색과 100ms tick을 사용한다(인간 난이도 평가는 별도 1000판 보고서).
      if (stage.kind !== "survival" || turns % 8 === 0) for (const action of chooseOpponentActions(state, true)) {
        const input: EngineAction = stage.reverseControls && action.type === "MOVE_LEFT" ? { type: "MOVE_RIGHT" }
          : stage.reverseControls && action.type === "MOVE_RIGHT" ? { type: "MOVE_LEFT" } : action;
        state = reduceCampaign(state, input, stage);
      }
      state = reduceCampaign(state, { type: "TICK", deltaMs: 100 }, stage);
    }
    expect(getCampaignRun(state)?.outcome, JSON.stringify({ stage: stage.id, run: { ...getCampaignRun(state), ai: undefined } })).toBe("cleared");
  });
});
