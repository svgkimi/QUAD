// @vitest-environment jsdom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { ControlLayoutEditor } from "../../src/components/screens/ControlLayoutEditor";
import { defaultControlLayout } from "../../src/lib/controlLayout";
import { click, mount } from "./agent-A-harness";
vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));
vi.mock("../../src/lib/appsInToss", () => ({ isAppsInToss: () => false }));
vi.mock("../../src/components/GameBoard", () => ({ GameBoard: () => <div data-testid="board-preview" /> }));
const layout = defaultControlLayout(400, 600, 72, 56);

/** 입력: 없음 / 출력: jsdom 전용 명시적 영역 좌표. 실제 기기 화면 검사가 아니다. */
function geometry() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
    if (this.dataset.testid === "control-editor-stage") return { x: 20, y: 80, left: 20, top: 80, right: 420, bottom: 680, width: 400, height: 600, toJSON() {} };
    const x = Math.max(42, Math.min(358, Number(this.style.left.match(/,\s*([\d.]+)%/)?.[1] ?? 50) * 4));
    const y = Math.max(34, Math.min(566, Number(this.style.top.match(/,\s*([\d.]+)%/)?.[1] ?? 50) * 6));
    return { x: x - 16, y: y + 52, left: x - 16, top: y + 52, right: x + 56, bottom: y + 108, width: 72, height: 56, toJSON() {} };
  });
}
/** 입력: 버튼과 목적 좌표 / 출력: 캡처된 포인터 드래그 이벤트. */
async function drag(button: HTMLElement, x: number, y: number) {
  const b = button.getBoundingClientRect();
  for (const [type, px, py] of [["pointerdown", b.left + 36, b.top + 28], ["pointermove", x, y], ["pointerup", x, y]] as const) {
    const event = new MouseEvent(type, { bubbles: true, clientX: px, clientY: py, button: 0 });
    Object.defineProperty(event, "pointerId", { value: 1 });
    await act(async () => { button.dispatchEvent(event); });
  }
}

describe("button layout editor", () => {
  it("drag toward the protected board stays inside the pad and preserves size", async () => {
    geometry(); const save = vi.fn(async () => true);
    const sized = { ...layout, left: { ...layout.left, scale: .9 } };
    const host = await mount(<ControlLayoutEditor layout={sized} ready loadError={false} onSave={save} onClose={vi.fn()} />);
    await drag(host.querySelector<HTMLElement>('[aria-label="왼쪽 이동 위치"]')!, 220, -200);
    await click(host, "배치 저장");
    expect(save.mock.calls[0][0].left).toMatchObject({ scale: .9, y: 34 / 600 });
    expect(host.querySelector('[data-testid="protected-board-region"] button')).toBeNull();
    expect(host.querySelector('#control-size')?.getAttribute('min')).toBe('80');
  });
  it("drag changes only the selected button, save returns normalized coordinates", async () => {
    geometry(); const save = vi.fn(async () => true), close = vi.fn();
    const host = await mount(<ControlLayoutEditor layout={layout} ready loadError={false} onSave={save} onClose={close} />);
    await drag(host.querySelector<HTMLElement>('[aria-label="왼쪽 이동 위치"]')!, 220, 280);
    await click(host, "배치 저장");
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toMatchObject({ ...layout, left: { x: .5, y: 1 / 3 } });
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("overlap blocks saving and reset explicitly saves null", async () => {
    geometry(); const save = vi.fn(async () => true);
    const host = await mount(<ControlLayoutEditor layout={layout} ready loadError={false} onSave={save} onClose={vi.fn()} />);
    const right = host.querySelector<HTMLElement>('[aria-label="오른쪽 이동 위치"]')!.getBoundingClientRect();
    await drag(host.querySelector<HTMLElement>('[aria-label="왼쪽 이동 위치"]')!, right.left + 36, right.top + 28);
    await click(host, "배치 저장"); expect(save).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("겹치면");
    await click(host, "기본 배치 복원"); expect(save).toHaveBeenCalledWith(null);
  });
  it("cancel never saves and failed saves keep the editor open", async () => {
    geometry(); const save = vi.fn(async () => false), close = vi.fn();
    const host = await mount(<ControlLayoutEditor layout={layout} ready loadError={false} onSave={save} onClose={close} />);
    await click(host, "배치 저장"); expect(close).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("저장하지 못했어요");
    save.mockClear(); await click(host, "취소"); expect(save).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledTimes(1);
  });
});
