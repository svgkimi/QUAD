import { describe, expect, it } from "vitest";
import { STAGES } from "../../src/campaign/stages";
import { StageHud } from "../../src/components/StageHud";
import { StageSelect } from "../../src/components/screens/StageSelect";
import { click, mount } from "./agent-A-harness";

describe("explicit campaign mode labels", () => {
  it.each([[1, "타임어택"], [3, "단일 미션"], [5, "AI 대전"], [10, "보스 대전"], [14, "생존"]] as const)("stage %i names its mode without another HUD row", async (id, label) => {
    const host = await mount(<StageHud stage={STAGES[id - 1]} run={null} lines={0} />);
    const hud = host.querySelector(`[aria-label="스테이지 ${id} 진행"]`)!;
    expect(hud.firstElementChild?.textContent).toBe(`${id} / 50 · ${label}`);
    expect(hud.children).toHaveLength(2);
  });

  it("uses chapter numbers and removes decorative one-line introductions", async () => {
    const host = await mount(<StageSelect completed={50} ready error={false} onRetry={() => {}} onStart={() => {}} onClose={() => {}} />);
    expect([...host.querySelectorAll("h3")].map(h => h.textContent)).toEqual(["1장", "2장", "3장", "4장", "5장"]);
    await click(host, "5번 1장 라이벌 완료");
    expect(host.querySelector('[role="dialog"] h2')?.textContent).toBe("스테이지 5");
    expect(host.textContent).toContain("AI 보드 넘치게 하기");
    expect(host.querySelector('[aria-label="별 획득 조건"]')?.textContent).toContain("99초 이내");
  });
});
