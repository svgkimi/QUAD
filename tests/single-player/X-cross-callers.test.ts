// Reviewer X: bounded caller-model characterization, not browser/device verification.
import { act, createElement, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSound } from '../../src/hooks/useSound';
import { useHighScore } from '../../src/hooks/useHighScore';
import { useGameEngine } from '../../src/hooks/useGameEngine';
import { applyAction, createInitialState, tick } from '../../src/engine/gameEngine';
import { moveDown } from '../../src/engine/movement';

const sdk = vi.hoisted(() => ({ active: true, getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('@apps-in-toss/web-framework', () => ({ Storage: sdk }));
vi.mock('../../src/lib/appsInToss', () => ({ isAppsInToss: () => sdk.active }));
let root: Root | undefined;
let host: HTMLDivElement;
let game: ReturnType<typeof useGameEngine>;
let audio: ReturnType<typeof useSound>;
let score: ReturnType<typeof useHighScore>;
let mainMenu: () => void;
let phase: string;

/** Input: none; output: null. Mirrors SinglePlayerApp's status/music and gameover/score effects. */
function CallerModel() {
  const [screen, setScreen] = useState('game'); phase = screen;
  audio = useSound(); game = useGameEngine({ enabled: screen === 'game' }); score = useHighScore();
  mainMenu = () => setScreen('title'); // SinglePlayerApp:124, phase only.
  useEffect(() => {
    if (game.state.status === 'playing') audio.music.start(); else audio.music.stop();
  }, [game.state.status, audio.music]);
  useEffect(() => {
    if (game.state.status === 'gameover') score.submitScore(game.state.score);
  }, [game.state.status, game.state.score, score.submitScore]);
  return null;
}
/** Input: none; output: Promise<void>; mounts actual hooks and mirrored caller effects. */
async function mount() {
  host = document.createElement('div'); root = createRoot(host);
  await act(async () => root!.render(createElement(CallerModel)));
}
/** Input: none; output: Promise<void>; at most 30 real HARD_DROP actions, no injected gameover/score. */
async function finishShortGame() {
  act(() => game.start(2));
  for (let n = 0; n < 30 && game.state.status === 'playing'; n++) act(() => game.dispatch({ type: 'HARD_DROP' }));
  expect(game.state.status).toBe('gameover');
  expect(game.state.score).toBeGreaterThan(0);
  expect(game.state.score).toBeLessThan(1000);
}
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('AudioContext', undefined); // No Web Audio / no listening claim.
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  localStorage.clear(); sdk.active = true;
  sdk.getItem.mockReset().mockResolvedValue(null); sdk.setItem.mockReset().mockResolvedValue(undefined);
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount()); root = undefined;
  host?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});
it('X: blocked softdrop is reachable from START without a board fixture', () => {
  let state = applyAction(createInitialState(), { type: 'START', seed: 2 });
  for (let n = 0; n < 40 && moveDown(state.board, state.active!).moved; n++) state = applyAction(state, { type: 'SOFT_DROP' });
  state = tick(state, 490); const old = state;
  state = applyAction(state, { type: 'SOFT_DROP' });
  expect(state.active).toEqual(old.active); expect(state.score).toBe(old.score);
  expect(state.lockDelay.elapsedMs).toBe(old.lockDelay.elapsedMs);
  expect(state.lockDelay.resetCount).toBe(old.lockDelay.resetCount);
});
it('X: normal pause -> main menu -> unmount does not leak an interval', async () => {
  await mount(); act(() => game.start(2)); expect(vi.getTimerCount()).toBe(1);
  act(() => game.pause()); act(mainMenu); expect(phase).toBe('title');
  await act(async () => root!.unmount()); root = undefined;
  expect(vi.getTimerCount()).toBe(0);
});
it('X: title rejects hidden resume and unmount releases interval', async () => {
  await mount(); act(() => game.start(2)); act(() => game.pause()); act(mainMenu);
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' })));
  expect(phase).toBe('title'); expect(game.state.status).toBe('paused');
  await act(async () => root!.unmount()); root = undefined;
  expect(vi.getTimerCount()).toBe(0);
});
it('X: SDK read held past countdown and real gameover preserves the higher persisted record', async () => {
  let resolveRead!: (value: string) => void; let persisted = '1000';
  sdk.getItem.mockImplementation((key: string) => key === 'quad:high-score'
    ? new Promise<string>(resolve => { resolveRead = resolve; }) : Promise.resolve(null));
  sdk.setItem.mockImplementation(async (key: string, value: string) => { if (key === 'quad:high-score') persisted = value; });
  await mount(); act(() => vi.advanceTimersByTime(2550)); await finishShortGame();
  expect(persisted).toBe('1000');
  await act(async () => resolveRead('1000'));
  expect(score.highScore).toBe(1000); expect(persisted).toBe('1000');
  console.log('X SDK delayed result', { gameScore: game.state.score, inMemory: score.highScore, persisted });
});
it('X: ordinary web localStorage already hydrates the higher record synchronously', async () => {
  sdk.active = false; localStorage.setItem('quad:high-score', '1000');
  await mount(); await finishShortGame();
  expect(score.highScore).toBe(1000); expect(localStorage.getItem('quad:high-score')).toBe('1000');
  expect(sdk.setItem).not.toHaveBeenCalled();
});
