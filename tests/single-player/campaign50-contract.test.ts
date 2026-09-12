import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/engine";
import { STAGES } from "../../src/campaign/stages";
import { getCampaignRun, reduceCampaign } from "../../src/campaign/session";

describe("basic fifty release contract", () => {
  it("contains fifty goals, ten duels, four survival stages and no fixed sequence", () => {
    expect(STAGES).toHaveLength(50);
    expect(STAGES.filter(s => s.kind === "duel").map(s => s.id)).toEqual([5,10,15,20,25,30,35,40,45,50]);
    expect(STAGES.filter(s => s.kind === "survival").map(s => s.id)).toEqual([14,23,33,43]);
    expect(STAGES.every(s => s.sequence.length === 0)).toBe(true);
    expect(Math.max(...STAGES.map(s => s.difficulty))).toBe(4);
    expect(STAGES[0]).toMatchObject({ kind: "lines", target: 3, layers: [] });
    expect(STAGES[48]).toMatchObject({ kind: "timed", target: 18, limitMs: 120000, difficulty: 4 });
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
});
