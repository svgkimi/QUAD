import { describe, expect, it } from "vitest";
import { applyAction, createEmptyBoard, createInitialState, refillQueue } from "../../src/engine";
import { reduceCampaign } from "../../src/campaign/session";
import { STAGES } from "../../src/campaign/stages";
import { CAMPAIGN_PROGRESS_KEY, parseCampaignProgress } from "../../src/hooks/useCampaignProgress";

describe("random campaign / unchanged classic boundary", () => {
  it("independent draws may repeat immediately; classic bag still contains seven unique types", () => {
    expect(new Set(refillQueue([], () => 0, "independent")).size).toBe(1);
    expect(new Set(refillQueue([], () => 0, "bag")).size).toBe(7);
  });
  it("campaign HOLD and lock refill remain replay-pure without altering classic mode", () => {
    let state = reduceCampaign(createInitialState({seed:7}), {type:"START",seed:7},STAGES[0]);
    for(let n=0;n<40;n++){
      state = { ...state, board:createEmptyBoard(),status:"playing" };
      const before=JSON.stringify(state);
      expect(applyAction(state,{type:"HOLD"})).toEqual(applyAction(state,{type:"HOLD"}));
      const a=applyAction(state,{type:"HARD_DROP"}),b=applyAction(state,{type:"HARD_DROP"});
      expect(a).toEqual(b);expect(JSON.stringify(state)).toBe(before);
      expect(a.randomizer).toBe("independent");state=a;
    }
    const classic=applyAction(state,{type:"START",seed:7});
    expect(classic.randomizer).toBeUndefined();
    expect(new Set([classic.active!.type,...classic.pieceQueue.slice(0,6)]).size).toBe(7);
  });
  it("new campaign uses a distinct progress key and accepts exactly 0..50 clears", () => {
    expect(CAMPAIGN_PROGRESS_KEY).toBe("quad:campaign-basic50-v1");
    expect(parseCampaignProgress('{"version":1,"completed":50}')).toBe(50);
    expect(parseCampaignProgress('{"version":1,"completed":51}')).toBe(0);
  });
});
