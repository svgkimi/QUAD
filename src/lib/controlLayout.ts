import type { CSSProperties } from "react";

export const CONTROL_IDS = ["hold", "left", "right", "down", "rotate", "drop"] as const;
export type ControlId = typeof CONTROL_IDS[number];
export interface ControlPosition { readonly x: number; readonly y: number; readonly scale?: number }
export type ControlLayout = Readonly<Record<ControlId, ControlPosition>>;
export const CONTROL_LABELS: Record<ControlId, string> = { hold: "홀드", left: "왼쪽 이동", right: "오른쪽 이동", down: "소프트드롭", rotate: "회전", drop: "하드드롭" };

/** 입력: 저장 문자열 / 출력: 검증된 6개 위치 또는 기본 배치(null). */
export function parseControlLayout(raw: string | null): ControlLayout | null {
  try {
    const data = JSON.parse(raw ?? "null");
    // v1은 게임판 위까지 포함한 좌표라 안전한 pad 좌표로 해석할 수 없다. 자동 덮어쓰지는 않는다.
    if (!data || data.version !== 2 || !data.positions) return null;
    const result = {} as Record<ControlId, ControlPosition>;
    for (const id of CONTROL_IDS) {
      const p = data.positions[id];
      if (!p || typeof p.x !== "number" || typeof p.y !== "number" || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return null;
      if (p.scale !== undefined && (typeof p.scale !== "number" || !Number.isFinite(p.scale) || p.scale < .8 || p.scale > 1.25)) return null;
      result[id] = { x: p.x, y: p.y, ...(p.scale !== undefined ? { scale: p.scale } : {}) };
    }
    return result;
  } catch { return null; }
}

/** 입력: 상대 위치 / 출력: 기종 변경 후에도 버튼 전체가 화면 안에 남는 CSS 위치. */
export function controlPositionStyle(p: ControlPosition): CSSProperties {
  return {
    "--key-width": `max(44px, calc(var(--control-width) * ${p.scale ?? 1}))`,
    "--key-height": `max(44px, calc(var(--control-height) * ${p.scale ?? 1}))`,
    width: "var(--key-width)", height: "var(--key-height)",
    position: "absolute",
    left: `clamp(calc(var(--key-width) / 2 + 6px), ${p.x * 100}%, calc(100% - var(--key-width) / 2 - 6px))`,
    top: `clamp(calc(var(--key-height) / 2 + 6px), ${p.y * 100}%, calc(100% - var(--key-height) / 2 - 6px))`,
    transform: "translate(-50%, -50%)",
  } as CSSProperties;
}

/** 입력: 편집 영역과 버튼 크기 / 출력: 실제 3+3 기본 패드에 해당하는 상대 좌표. */
export function defaultControlLayout(width: number, height: number, keyWidth: number, keyHeight: number): ControlLayout {
  const x1 = keyWidth / 2 + 8, x2 = x1 + keyWidth + 10;
  const bottom = height - keyHeight / 2 - 6, top = keyHeight / 2 + 6;
  const point = (x: number, y: number) => ({ x: Math.max(0, Math.min(1, x / width)), y: Math.max(0, Math.min(1, y / height)) });
  return { hold: point((x1 + x2) / 2, top), left: point(x1, bottom), right: point(x2, bottom), down: point(width - (x1 + x2) / 2, top), rotate: point(width - x2, bottom), drop: point(width - x1, bottom) };
}

/** 입력: 상대 배치와 현재 가용 크기 / 출력: 가장자리 보정 후 6px 간격을 유지하는지 여부. */
export function isControlLayoutUsable(layout: ControlLayout, width: number, height: number, keyWidth: number, keyHeight: number): boolean {
  const points = CONTROL_IDS.map(id => {
    const w = Math.max(44, keyWidth * (layout[id].scale ?? 1)), h = Math.max(44, keyHeight * (layout[id].scale ?? 1));
    return { w, h, x: Math.max(w / 2 + 6, Math.min(width - w / 2 - 6, layout[id].x * width)), y: Math.max(h / 2 + 6, Math.min(height - h / 2 - 6, layout[id].y * height)) };
  });
  if (points.some(p => width < p.w + 12 || height < p.h + 12)) return false;
  return !points.some((a, i) => points.slice(i + 1).some(b => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 6 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + 6));
}
