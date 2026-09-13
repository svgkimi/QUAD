import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/engine";
import { STAGES, type StageDefinition } from "../../src/campaign/stages";
import { getCampaignRun, reduceCampaign } from "../../src/campaign/session";
import { earnedStageStars, starThresholds } from "../../src/campaign/stars";
import { StageHud } from "../../src/components/StageHud";
import { mount } from "./agent-A-harness";

function finished(stage: StageDefinition, value: number, height = 0) {
  const state = reduceCampaign(createInitialState(), { type: "START" }, stage);
  const board = state.board.map(row => row.map(() => null));
  for (let row = 40 - height; row < 40; row++) (board[row] as (string | null)[])[0] = "I";
  return { ...state, board, campaign: { ...getCampaignRun(state)!, outcome: "cleared" as const, elapsedMs: value, piecesUsed: value, dangerMs: value } };
}

describe("performance stars", () => {
  it.each(STAGES.filter(s => s.kind !== "survival"))("stage $id uses the exact advertised performance boundaries", stage => {
    const [two, three] = starThresholds(stage);
    expect(three).toBeLessThan(two);
    expect(earnedStageStars(stage, finished(stage, three))).toBe(3);
    expect(earnedStageStars(stage, finished(stage, three + 1))).toBe(2);
    expect(earnedStageStars(stage, finished(stage, two))).toBe(2);
    expect(earnedStageStars(stage, finished(stage, two + 1))).toBe(1);
  });
  it.each(STAGES.filter(s => s.kind === "survival"))("survival $id awards advertised line performance only after surviving", stage => {
    const [two, three] = starThresholds(stage);
    for (const [lines, stars] of [[0,1],[two-1,1],[two,2],[three-1,2],[three,3],[three+1,3]]) {
      expect(earnedStageStars(stage, { ...finished(stage, stage.surviveMs!), totalLinesCleared: lines })).toBe(stars);
    }
  });
  it("never gives stars for unfinished, failed or other-stage runs", () => {
    const stage = STAGES[0], state = reduceCampaign(createInitialState(), { type: "START" }, stage);
    expect(earnedStageStars(stage, state)).toBe(0);
    const failed = { ...state, campaign: { ...getCampaignRun(state)!, outcome: "failed" as const } };
    expect(earnedStageStars(stage, failed)).toBe(0);
    expect(earnedStageStars(STAGES[1], finished(stage, 0))).toBe(0);
    expect(earnedStageStars(stage, createInitialState())).toBe(0);
  });
  it("shows stage mode and progress without verbose explanations in the playing HUD", async () => {
    const run = getCampaignRun(reduceCampaign(createInitialState(), { type: "START" }, STAGES[3]));
    const host = await mount(<StageHud stage={STAGES[3]} run={run} lines={2} />);
    expect(host.textContent).toBe("4 / 50 · 타임어택2 / 5줄150초");
    expect(host.textContent).not.toContain("난이도");
    expect(host.textContent).not.toContain("목표");
    expect(host.textContent).not.toContain("★");
  });
});
