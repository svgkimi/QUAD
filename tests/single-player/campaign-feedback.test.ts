import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/engine";
import { STAGES } from "../../src/campaign/stages";
import { getCampaignRun, reduceCampaign } from "../../src/campaign/session";

describe("first playtest feedback retained in basic fifty", () => {
  it("never clears a stage with one neutral drop", () => {
    for (const stage of STAGES) for (const seed of [1,7,123,900]) {
      const state = reduceCampaign(createInitialState({ seed }), { type: "START", seed }, stage);
      expect(getCampaignRun(reduceCampaign(state, { type: "HARD_DROP" }, stage))?.outcome).toBe("playing");
    }
  });
  it("only the first three stages use 0.5 and early survival is absent", () => {
    expect(STAGES.slice(3).every(s => s.difficulty >= 1)).toBe(true);
    expect(STAGES.filter(s => s.kind === "survival").every(s => s.id >= 14)).toBe(true);
  });
  it("stage four cannot clear by waiting", () => {
    const stage = STAGES[3];
    let state = reduceCampaign(createInitialState({ seed: 1 }), { type: "START", seed: 1 }, stage);
    for(let ms=0;ms<180000 && getCampaignRun(state)?.outcome === "playing";ms+=50)
      state = reduceCampaign(state, { type: "TICK", deltaMs: 50 }, stage);
    expect(getCampaignRun(state)?.reason).toBe("topout");
  });
  it.each(STAGES.filter(s => s.kind === "duel"))("AI $id moves within two seconds and freezes when paused", stage => {
    let state = reduceCampaign(createInitialState({ seed: 1 }), { type: "START", seed: 1 }, stage);
    const before = getCampaignRun(state)!.ai!.board;
    for(let ms=0;ms<2000;ms+=16) state = reduceCampaign(state,{type:"TICK",deltaMs:16},stage);
    expect(getCampaignRun(state)!.ai!.board).not.toEqual(before);
    state = reduceCampaign(state,{type:"PAUSE"},stage);
    expect(reduceCampaign(state,{type:"TICK",deltaMs:5000},stage)).toEqual(state);
  });
  it("early AI clears real lines and attacks without player assistance", () => {
    const stage = STAGES[4];
    let state = reduceCampaign(createInitialState({seed: 1}),{type:"START",seed:1},stage);
    for(let ms=0;ms<60000 && getCampaignRun(state)?.outcome==="playing" && !getCampaignRun(state)?.received;ms+=50)
      state=reduceCampaign(state,{type:"TICK",deltaMs:50},stage);
    expect(getCampaignRun(state)!.ai!.totalLinesCleared).toBeGreaterThan(0);
    expect(getCampaignRun(state)!.received).toBeGreaterThan(0);
  });
});
