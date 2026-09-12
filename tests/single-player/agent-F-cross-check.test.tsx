import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import SinglePlayerApp from '../../src/components/SinglePlayerApp';

const fixtures = vi.hoisted(() => {
  const noop = () => undefined;
  return {
    toss: false,
    sound: {
      enabled: true, toggle: noop,
      sounds: { uiSelect: noop, countdownTick: noop, move: noop, rotate: noop, hardDrop: noop, softDrop: noop, hold: noop },
      music: { tracks: [{ id: 'a', name: 'Track A' }], trackIndex: 0, volume: .5,
        setTrackIndex: noop, setVolume: noop, start: noop, stop: noop, setSpeedMultiplier: noop },
    },
  };
});
vi.mock('../../src/hooks/useSound', () => ({ useSound: () => fixtures.sound }));
vi.mock('../../src/hooks/useHighScore', () => ({ useHighScore: () => ({ highScore: 0, submitScore: () => false }) }));
vi.mock('../../src/hooks/useEffects', () => ({ useEffects: () => ({ shake: null, popups: [] }) }));
// 이 suite는 동기 화면 분기를 검사한다. 배치 저장의 비동기 계약은 control-layout suite에서 검사한다.
vi.mock('../../src/hooks/useControlLayout', () => ({ useControlLayout: () => ({ layout: null, ready: true, error: false, save: async () => true }) }));
vi.mock('../../src/components/AppsInTossTopBar', () => ({ AppsInTossTopBar: () => null }));
vi.mock('../../src/lib/appsInToss', () => ({ isAppsInToss: () => fixtures.toss }));
vi.mock('@apps-in-toss/web-framework', () => ({ generateHapticFeedback: vi.fn() }));
// Keep production state transitions and DOM overlays, but do not emulate canvas layout/drawing.
vi.mock('../../src/components/GameBoard', () => ({ GameBoard: ({ status, responsive = false }: { status: string; responsive?: boolean }) =>
  <canvas data-status={status} data-responsive={String(responsive)} /> }));
let container: HTMLDivElement;
let root: Root;
let widthDescriptor: PropertyDescriptor | undefined;
let heightDescriptor: PropertyDescriptor | undefined;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  fixtures.toss = false;
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  heightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals();
  if (widthDescriptor) Object.defineProperty(window, 'innerWidth', widthDescriptor);
  if (heightDescriptor) Object.defineProperty(window, 'innerHeight', heightDescriptor);
});
/** Change viewport inputs only; jsdom does not compute CSS layout. */
function viewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}
/** Activate a rendered production button by visible text. */
function clickText(text: string): void {
  const button = [...container.querySelectorAll('button')].find(b => b.textContent?.includes(text));
  expect(button).toBeTruthy(); act(() => button!.click());
}
/** Advance each production countdown effect separately without sleeping. */
function finishCountdown(): void {
  for (const ms of [700, 700, 700, 450]) act(() => vi.advanceTimersByTime(ms));
}
it.each([390, 844])('new countdown excludes previous PAUSED at width %i', width => {
  viewport(width, 844); act(() => root.render(<SinglePlayerApp />));
  clickText('게임 시작'); finishCountdown();
  expect(container.querySelector('canvas')?.getAttribute('data-status')).toBe('playing');
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', code: 'KeyP', bubbles: true })));
  expect(container.textContent).toContain('PAUSED');
  clickText('메인으로'); clickText('메인으로'); clickText('게임 시작');
  expect(container.querySelector('.animate-countdown-pulse')?.textContent).toBe('3');
  expect(container.textContent).not.toContain('PAUSED');
  // 새 요구: 이전 PAUSED 보드를 가리는 것뿐 아니라 빈 ready 보드만 렌더링한다.
  expect(container.querySelector('canvas')?.getAttribute('data-status')).toBe('ready');
  finishCountdown();
  expect(container.textContent).not.toContain('PAUSED');
  expect(container.querySelector('canvas')?.getAttribute('data-status')).toBe('playing');
});
it('background cannot replace an open modal', () => {
  viewport(390, 844); act(() => root.render(<SinglePlayerApp />));
  const controls = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('조작 안내'))!;
  controls.focus(); act(() => controls.click());
  expect(container.querySelector('[role="dialog"]')!.contains(document.activeElement)).toBe(true);
  expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe('조작 안내');
  const backgroundSettings = [...container.querySelectorAll('main button')].find(b => b.textContent?.includes('게임 설정'))!;
  expect(backgroundSettings.disabled).toBe(false);
  expect(container.querySelector('main')?.hasAttribute('inert')).toBe(true);
  backgroundSettings.focus(); act(() => backgroundSettings.click());
  expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe('조작 안내');
});
it.each([
  [844, 390, false, 6, 'true'], [820, 1180, false, 0, 'true'],
  [767, 1180, false, 6, 'true'], [768, 1180, false, 0, 'true'],
  [844, 390, true, 6, 'true'], [820, 1180, true, 6, 'true'],
] as const)('viewport branch %ix%i Toss=%s yields %i controls', (width, height, toss, count, responsive) => {
  fixtures.toss = toss; viewport(width, height); act(() => root.render(<SinglePlayerApp />)); clickText('게임 시작');
  expect(container.querySelectorAll('[data-testid="touch-controls"] button').length).toBe(count);
  expect(container.querySelector('canvas')?.getAttribute('data-responsive')).toBe(responsive);
});
it('compact landscape resize preserves touch pad', () => {
  viewport(390, 844); act(() => root.render(<SinglePlayerApp />)); clickText('게임 시작'); finishCountdown();
  expect(container.querySelectorAll('[data-testid="touch-controls"] button').length).toBe(6);
  viewport(844, 390); act(() => window.dispatchEvent(new Event('resize')));
  expect(container.querySelectorAll('[data-testid="touch-controls"] button').length).toBe(6);
  expect(container.querySelector('canvas')?.getAttribute('data-status')).toBe('playing');
});
it.each([[820, 1180], [1280, 720]])('coarse-pointer %ix%i retains all six controls', (width, height) => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  viewport(width, height); act(() => root.render(<SinglePlayerApp />)); clickText('게임 시작');
  expect(container.querySelectorAll('[data-testid="touch-controls"] button')).toHaveLength(6);
});
it('pause help and cancelled abandonment preserve the paused game', () => {
  viewport(390, 844); act(() => root.render(<SinglePlayerApp />)); clickText('게임 시작'); finishCountdown();
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', bubbles: true })));
  clickText('조작 안내');
  expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe('조작 안내');
  act(() => container.querySelector<HTMLButtonElement>('[aria-label="조작 안내 닫기"]')!.click());
  expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe('PAUSED');
  clickText('메인으로'); expect(container.textContent).toContain('현재 게임은 종료돼요');
  clickText('돌아가기');
  expect(container.querySelector('canvas')?.getAttribute('data-status')).toBe('paused');
  clickText('계속하기');
  expect(container.querySelector('canvas')?.getAttribute('data-status')).toBe('playing');
});
