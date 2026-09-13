import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/engine";
import { STAGES } from "../../src/campaign/stages";
import { getCampaignRun, reduceCampaign } from "../../src/campaign/session";
import specification from "../../campaign-planning/RULES50_V2_SPEC.json";

describe("basic fifty release contract", () => {
  it.each(specification.stages)("v2 stage %s matches the separate candidate specification", (id, goal, amount, difficulty, rows, seconds) => {
    const stage = STAGES.find(s => s.id === id)!;
    expect(stage.kind).toBe(goal === "lines" || goal === "targets" ? "timed" : goal);
    expect(stage.target).toBe(goal === "survival" ? 0 : amount);
    expect(stage.difficulty).toBe(difficulty);
    expect(stage.layers.reduce((sum, l) => sum + l.rows, 0)).toBe(rows);
    expect(stage.limitMs ?? stage.surviveMs).toBe(Number(seconds) * 1000);
    expect(stage.targetCells?.length ?? 0).toBe(goal === "targets" ? amount : 0);
  });

  it("contains fifty goals, ten duels, four survival stages and no fixed sequence", () => {
    expect(STAGES).toHaveLength(50);
    expect(STAGES.filter(s => s.kind === "duel").map(s => s.id)).toEqual([5,10,15,20,25,30,35,40,45,50]);
    expect(STAGES.filter(s => s.kind === "survival").map(s => s.id)).toEqual([14,23,33,43]);
    expect(STAGES.every(s => s.sequence.length === 0)).toBe(true);
    expect(Math.max(...STAGES.map(s => s.difficulty))).toBe(4);
    expect(STAGES[0]).toMatchObject({ kind: "timed", target: 3, layers: [], limitMs: 150000 });
    expect(STAGES[48]).toMatchObject({ kind: "timed", target: 18, limitMs: 105000, difficulty: 4 });
    expect(STAGES.filter(s => s.kind === "mission").map(s => s.id)).toEqual([3,12]);
    expect(STAGES.filter(s => s.targetCells)).toHaveLength(16);
    expect(STAGES.every(s => (s.limitMs ?? s.surviveMs ?? 0) > 0)).toBe(true);
  });
  it("same seed replays exactly; retry with a new seed changes the piece stream", () => {
    const state = createInitialState({ seed: 1 }), stage = STAGES[0];
    const first = reduceCampaign(state, { type: "START", seed: 123 }, stage);
    expect(reduceCampaign(state, { type: "START", seed: 123 }, stage)).toEqual(first);
    const retry = reduceCampaign(first, { type: "RESTART", seed: 124 }, stage);
    expect(retry.board).toEqual(first.board);
    expect([retry.active?.type, ...retry.pieceQueue]).not.toEqual([first.active?.type, ...first.pieceQueue]);
    expect(getCampaignRun(retry)?.elapsedMs).toBe(0);
  });
  it("stage 6 no longer clears with two centre drops when the first two random pieces are I", () => {
    const stage = STAGES[5];
    let state = reduceCampaign(createInitialState(), { type: "START", seed: 7 }, stage);
    state = reduceCampaign(state, { type: "HARD_DROP" }, stage);
    state = reduceCampaign(state, { type: "HARD_DROP" }, stage);
    expect(getCampaignRun(state)?.outcome).toBe("playing");
    expect(getCampaignRun(state)?.targetCells).toHaveLength(4);
  });
});
