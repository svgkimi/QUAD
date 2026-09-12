import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSound, type UseSoundResult } from '../../src/hooks/useSound';
import { useHighScore, type UseHighScoreResult } from '../../src/hooks/useHighScore';
import { calculateSpeedMultiplier } from '../../src/engine';

const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('../../src/lib/persistentStorage', () => storage);
/** 오디오 출력 없이 파라미터 호출만 기록한다. */
function parameter() { return { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() }; }
/** Web Audio 수명주기 테스트 대역. 실제 청취 검증은 아니다. */
class AudioContextStub {
  static instances: AudioContextStub[] = [];
  state = 'running'; currentTime = 0; sampleRate = 48000; destination = {};
  close = vi.fn(async () => { this.state = 'closed'; });
  resume = vi.fn(async () => { this.state = 'running'; });
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  constructor() { AudioContextStub.instances.push(this); }
  createGain() { return { gain: parameter(), connect: vi.fn(), disconnect: vi.fn() }; }
  createBiquadFilter() { return { type: '', frequency: parameter(), Q: parameter(), connect: vi.fn() }; }
  createDynamicsCompressor() { return { threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter(), connect: vi.fn() }; }
  createOscillator() { return { type: '', frequency: parameter(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
  createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
  createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
}
let root: Root | undefined;
let host: HTMLDivElement;
let audio: UseSoundResult;
let score: UseHighScoreResult;
/** 입력한 훅을 실제 React root에 마운트하고 현재 값을 테스트 변수에 기록한다. */
async function mount(kind: 'audio' | 'score') {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  function Harness() { if (kind === 'audio') audio = useSound(); else score = useHighScore(); return null; }
  await act(async () => { root!.render(React.createElement(Harness)); });
}
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('AudioContext', AudioContextStub);
  AudioContextStub.instances = []; localStorage.clear(); storage.getItem.mockReset().mockResolvedValue(null); storage.setItem.mockReset().mockResolvedValue(undefined);
});
afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); }); root = undefined;
  host?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
describe('Single-player: sound and persistence contracts', () => {
  it('music interval shortens with level speed and stop clears it', async () => {
    await mount('audio'); const interval = vi.spyOn(window, 'setInterval');
    act(() => audio.music.start()); expect(interval.mock.calls.at(-1)?.[1]).toBe(180);
    const multiplier = calculateSpeedMultiplier(10); act(() => audio.music.setSpeedMultiplier(multiplier));
    expect(interval.mock.calls.at(-1)?.[1]).toBeCloseTo(180 / multiplier); expect(Number(interval.mock.calls.at(-1)?.[1])).toBeLessThan(180);
    act(() => audio.music.stop()); expect(vi.getTimerCount()).toBe(0);
  });
  it('repeated music start does not duplicate timers', async () => {
    await mount('audio'); act(() => { for (let i = 0; i < 30; i++) audio.music.start(); });
    expect(vi.getTimerCount()).toBe(1); act(() => audio.music.stop()); expect(vi.getTimerCount()).toBe(0);
  });
  it('unmount clears music interval and closes AudioContext', async () => {
    await mount('audio'); act(() => audio.music.start()); const context = AudioContextStub.instances[0];
    await act(async () => root!.unmount()); root = undefined;
    expect(vi.getTimerCount()).toBe(0); expect(context.close).toHaveBeenCalledTimes(1);
  });
  it('POLICY: mute remains session-only pending approval', async () => {
    await mount('audio'); act(() => audio.toggle()); expect(audio.enabled).toBe(false);
    await act(async () => root!.unmount()); root = undefined; host.remove(); await mount('audio'); expect(audio.enabled).toBe(true);
  });
  it('corrupt saved track and volume fall back without crash', async () => {
    localStorage.setItem('quad:music-track', 'not-a-number'); localStorage.setItem('quad:music-volume', 'Infinity');
    await mount('audio'); expect(audio.music.trackIndex).toBe(0); expect(audio.music.volume).toBe(0.6);
  });
  it('delayed settings preserve newer selections', async () => {
    let resolveTrack!: (value: string) => void; let resolveVolume!: (value: string) => void;
    storage.getItem.mockImplementation((key: string) => new Promise<string>(resolve => { if (key.endsWith('music-track')) resolveTrack = resolve; else resolveVolume = resolve; }));
    await mount('audio'); act(() => { audio.music.setTrackIndex(2); audio.music.setVolume(0.2); }); expect(audio.music.trackIndex).toBe(2);
    await act(async () => { resolveTrack('0'); resolveVolume('0.8'); }); expect(audio.music.trackIndex).toBe(2); expect(audio.music.volume).toBe(0.2);
  });
  it('submit before hydration preserves higher persisted record', async () => {
    let resolveRead!: (value: string) => void; let persisted = '1000';
    storage.getItem.mockImplementation(() => new Promise<string>(resolve => { resolveRead = resolve; }));
    storage.setItem.mockImplementation(async (_key: string, value: string) => { persisted = value; });
    await mount('score'); act(() => { score.submitScore(100); }); expect(persisted).toBe('1000');
    await act(async () => { resolveRead('1000'); }); expect(score.highScore).toBe(1000); expect(persisted).toBe('1000');
  });
  it('normal submitted record remains monotonic', async () => {
    await mount('score'); await act(async () => { score.submitScore(80); score.submitScore(40); score.submitScore(100); });
    expect(score.highScore).toBe(100); expect(storage.setItem.mock.calls.map(call => call[1])).toEqual(['80', '100']);
  });
  it('failed initial score read reports error and never overwrites an unknown record', async () => {
    storage.getItem.mockRejectedValue(new Error('SDK unavailable'));
    await mount('score');
    await act(async () => { score.submitScore(100); });
    expect(score.highScore).toBe(100);
    expect(score.saveStatus).toBe('error');
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('failed score write reports error but retains the in-memory record', async () => {
    storage.setItem.mockResolvedValue(false);
    await mount('score');
    await act(async () => { score.submitScore(100); });
    expect(score.highScore).toBe(100); expect(score.saveStatus).toBe('error');
  });
  it('one failed settings read does not discard the other saved setting', async () => {
    storage.getItem.mockImplementation((key: string) => key.endsWith('music-track') ? Promise.reject(new Error('read failed')) : Promise.resolve('0.8'));
    await mount('audio');
    expect(audio.storageError).toBe(true); expect(audio.music.volume).toBe(0.8);
  });
  it('a late AudioContext resume never schedules sound after unmount', async () => {
    await mount('audio'); act(() => audio.music.start());
    const context = AudioContextStub.instances[0]; context.state = 'suspended';
    const pending: Array<() => void> = [];
    context.resume.mockImplementation(() => new Promise<void>(resolve => pending.push(resolve)));
    const tones = vi.spyOn(context, 'createOscillator');
    const noise = vi.spyOn(context, 'createBufferSource');
    act(() => audio.sounds.hardDrop());
    const before = [tones.mock.calls.length, noise.mock.calls.length];
    await act(async () => { root!.unmount(); }); root = undefined;
    await act(async () => { context.state = 'running'; pending.forEach(resolve => resolve()); });
    expect([tones.mock.calls.length, noise.mock.calls.length]).toEqual(before);
    expect(vi.getTimerCount()).toBe(0);
  });
});
