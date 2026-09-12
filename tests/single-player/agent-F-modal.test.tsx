import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TitleScreen } from '../../src/components/screens/TitleScreen';
import { PauseOverlay } from '../../src/components/screens/PauseOverlay';
import { GameOverScreen } from '../../src/components/screens/GameOverScreen';
import { TouchControls } from '../../src/components/TouchControls';
import { useGameEngine } from '../../src/hooks/useGameEngine';

vi.mock('@apps-in-toss/web-framework', () => ({ generateHapticFeedback: vi.fn() }));
vi.mock('../../src/lib/appsInToss', () => ({ isAppsInToss: () => false }));
let container: HTMLDivElement;
let root: Root;
const props = {
  highScore: 123, soundEnabled: true, onStart: vi.fn(), onToggleSound: vi.fn(),
  musicTracks: [{ id: 'a', name: 'Track A' }, { id: 'b', name: 'Track B' }],
  musicTrackIndex: 0, onSelectMusicTrack: vi.fn(), musicVolume: 0.5,
  onChangeMusicVolume: vi.fn(), isMobile: true,
};
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
/** Mount the production lobby and activate its settings button; returns the opener. */
function openSettings(): HTMLButtonElement {
  act(() => root.render(<TitleScreen {...props} />));
  const opener = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('게임 설정'))!;
  opener.focus();
  act(() => opener.click());
  return opener;
}
it('settings exposes a named modal and Escape closes it', () => {
  openSettings();
  const dialog = container.querySelector('[role="dialog"]')!;
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('게임 설정');
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});
it('opening modal moves focus inside [expected accessibility behavior]', () => {
  openSettings();
  expect(container.querySelector('[role="dialog"]')!.contains(document.activeElement)).toBe(true);
});
it('modal makes background main inert [expected accessibility behavior]', () => {
  openSettings();
  expect(container.querySelector('main')!.hasAttribute('inert')).toBe(true);
});
it('closing modal restores opener focus [expected accessibility behavior]', () => {
  const opener = openSettings();
  const close = container.querySelector<HTMLButtonElement>('[aria-label="게임 설정 닫기"]')!;
  close.focus();
  act(() => close.click());
  expect(document.activeElement).toBe(opener);
});
it('Tab and Shift+Tab cycle within settings', () => {
  openSettings();
  const dialog = container.querySelector('[role="dialog"]')!;
  const buttons = [...dialog.querySelectorAll<HTMLElement>('button,input')];
  buttons.at(-1)!.focus();
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
  expect(document.activeElement).toBe(buttons[0]);
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
  expect(document.activeElement).toBe(buttons.at(-1));
});
it('selected music exposes a programmatic selected state [expected accessibility behavior]', () => {
  openSettings();
  const track = [...container.querySelectorAll('button')].find(b => b.textContent?.startsWith('Track A'))!;
  expect(track.getAttribute('aria-pressed') === 'true' || track.getAttribute('aria-checked') === 'true').toBe(true);
});
it('pause overlay exposes named dialog semantics [expected accessibility behavior]', () => {
  act(() => root.render(<PauseOverlay onResume={vi.fn()} onRestart={vi.fn()} onMainMenu={vi.fn()} />));
  expect(container.querySelector('[role="dialog"][aria-labelledby],dialog[aria-labelledby]')).not.toBeNull();
});
it('gameover moves focus to restart and Escape returns to the lobby', () => {
  const onMainMenu = vi.fn();
  act(() => root.render(<GameOverScreen score={100} highScore={100} isNewHighScore={true} onRestart={vi.fn()} onMainMenu={onMainMenu} />));
  expect(container.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
  expect(document.activeElement?.textContent).toBe('다시하기');
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(onMainMenu).toHaveBeenCalledTimes(1);
});
it('touch rotate accepts semantic click activation [expected accessibility behavior]', () => {
  const dispatch = vi.fn();
  act(() => root.render(<TouchControls dispatch={dispatch} triggerHardDrop={vi.fn()} status="playing" />));
  act(() => container.querySelector<HTMLButtonElement>('[aria-label="회전"]')!.click());
  expect(dispatch).toHaveBeenCalledWith({ type: 'ROTATE_CW' });
});
it('engine keyboard listener leaves volume range arrows alone [expected accessibility behavior]', () => {
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  function Harness() {
    useGameEngine();
    return <input type="range" aria-label="volume" />;
  }
  act(() => root.render(<Harness />));
  const range = container.querySelector('input')!;
  range.focus();
  const event = new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true, cancelable: true });
  act(() => range.dispatchEvent(event));
  act(() => range.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true })));
  expect(event.defaultPrevented).toBe(false);
});
