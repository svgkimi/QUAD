import { describe, expect, it } from "vitest";
import { canStartStage, DEVELOPER_STAGE_ACCESS } from "../../src/campaign/access";

describe("developer stage access is a separate build, not progress", () => {
  it("normal/test configuration disables developer access by default", () => {
    expect(DEVELOPER_STAGE_ACCESS).toBe(false);
  });
  it("normal play still requires hydration and sequential completion", () => {
    expect(canStartStage(1, 0, false)).toBe(false);
    expect(canStartStage(1, 0, true)).toBe(true);
    expect(canStartStage(2, 0, true)).toBe(false);
    expect(canStartStage(50, 48, true)).toBe(false);
    expect(canStartStage(50, 49, true)).toBe(true);
  });
  it.each(Array.from({ length: 50 }, (_, index) => index + 1))("developer build can enter stage %s with no progress", id => {
    expect(canStartStage(id, 0, false, true)).toBe(true);
  });
  it.each([0, -1, 51, 1.5, NaN, Infinity])("developer access never permits invalid stage %s", id => {
    expect(canStartStage(id, 50, true, true)).toBe(false);
  });
});
