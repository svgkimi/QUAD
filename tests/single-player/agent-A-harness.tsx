import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, vi } from "vitest";

let root: Root | null = null;
let host: HTMLDivElement;
let nextFrameId = 0;
const frames = new Map<number, FrameRequestCallback>();

/** Deterministic DOM/timer lifecycle; input: none, output: per-test isolated environment. */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(new Date("2026-09-09T00:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback): number => {
    const id = ++nextFrameId;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number): void => { frames.delete(id); });
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  // Guard against accidental external side effects; SDK/audio are stubbed separately.
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Agent A forbids network access"); }));
  vi.stubGlobal("WebSocket", class { constructor() { throw new Error("Agent A forbids WebSocket access"); } });
  window.localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
});

/** Release only this test's DOM/listeners/timers; input/output: none. */
afterEach(async () => {
  if (root) await act(async () => { root?.unmount(); });
  root = null;
  host.remove();
  frames.clear();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Mount real React components; input: ReactNode, output: isolated host element. */
export async function mount(node: ReactNode): Promise<HTMLDivElement> {
  root = createRoot(host);
  await act(async () => { root?.render(node); });
  return host;
}

/** Simulate reload without losing jsdom storage; input: ReactNode, output: none. */
export async function remount(node: ReactNode): Promise<void> {
  await act(async () => { root?.unmount(); });
  root = createRoot(host);
  await act(async () => { root?.render(node); });
}

/** Run one scheduled animation frame; input: timestamp ms, output: none. */
export async function frame(time: number): Promise<void> {
  const pending = [...frames.values()];
  frames.clear();
  await act(async () => { pending.forEach((callback) => callback(time)); });
}

/** Advance only deterministic timers, not RAF; input: elapsed ms, output: none. */
export async function advance(ms: number): Promise<void> {
  await act(async () => { vi.advanceTimersByTime(ms); });
}

/** Deliver a DOM key event; input: code/type, output: none. */
export async function key(code: string, type: "keydown" | "keyup" = "keydown"): Promise<void> {
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }));
  });
}

/** Simulate visibility event, not a browser/device check; input: hidden, output: none. */
export async function visibility(hidden: boolean): Promise<void> {
  vi.spyOn(document, "hidden", "get").mockReturnValue(hidden);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(hidden ? "hidden" : "visible");
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
}

/** Click an existing DOM button; input: host and exact accessible/text label, output: none. */
export async function click(hostElement: HTMLElement, label: string): Promise<void> {
  const button = [...hostElement.querySelectorAll("button")].find(
    (element) => element.getAttribute("aria-label") === label || element.textContent?.trim() === label ||
      [...element.querySelectorAll("span")].some((span) => span.textContent?.trim() === label),
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => { button.click(); });
  // 새 확인 계약: helper의 포기/재시작 요청은 확인까지 수행한다.
  const confirm = hostElement.querySelector('[role="dialog"] h2')?.textContent;
  if (confirm === "메인으로 돌아갈까요?" || confirm === "다시 시작할까요?") {
    const label = confirm.startsWith("메인") ? "메인으로" : "다시 시작";
    const action = [...hostElement.querySelectorAll('[role="dialog"] button')].find(e => e.textContent === label) as HTMLButtonElement;
    await act(async () => action.click());
  }
}

/** Finish 3/2/1/GO in separate React commits; input/output: none. */
export async function finishCountdown(): Promise<void> {
  for (const ms of [700, 700, 700, 450]) await advance(ms);
}
