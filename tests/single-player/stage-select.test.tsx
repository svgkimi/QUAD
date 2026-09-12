import { describe, expect, it } from "vitest";
import { StageSelect } from "../../src/components/screens/StageSelect";
import { click, mount } from "./agent-A-harness";

describe("50-stage menu contracts", () => {
  it("keeps sequential locks and distinguishes five bosses from middle AI", async () => {
    const host = await mount(<StageSelect completed={0} ready error={false} onRetry={() => {}} onStart={() => {}} onClose={() => {}} />);
    const stages = [...host.querySelectorAll<HTMLButtonElement>('button[aria-label*="번 "]')];
    expect(stages).toHaveLength(50);
    expect(stages.filter(b => !b.disabled)).toHaveLength(1);
    expect(stages.filter(b => b.textContent?.includes("보스"))).toHaveLength(5);
    expect(stages.filter(b => b.textContent?.includes("중간 AI"))).toHaveLength(5);
  });
  it("shows a short goal and performance stars instead of explanatory paragraphs", async () => {
    const host = await mount(<StageSelect completed={29} ready error={false} onRetry={() => {}} onStart={() => {}} onClose={() => {}} />);
    await click(host, "30번 3장 보스 도전");
    expect(host.textContent).toContain("AI 보드 넘치게 하기");
    expect(host.querySelector('[aria-label="별 획득 조건"]')?.textContent).toContain("75초 이내");
    expect(host.querySelector("ul")).toBeNull();
    expect(host.textContent).not.toContain("200스테이지");
    expect(host.textContent).not.toContain("낙하 속도");
    expect(host.textContent).not.toContain("좌우 반전");
  });
  it("shows recorded best stars and one star for legacy completions", async () => {
    const host = await mount(<StageSelect completed={2} stars={{ 1: 3 }} ready error={false} onRetry={() => {}} onStart={() => {}} onClose={() => {}} />);
    expect(host.querySelector('#stage-1-stars')?.textContent).toBe("획득 별 3 / 3");
    expect(host.querySelector('#stage-2-stars')?.textContent).toBe("획득 별 1 / 3");
    expect(host.querySelector('#stage-3-stars')?.textContent).toBe("획득 별 0 / 3");
  });
});
