import { useCallback, useEffect, useRef, useState } from "react";
import { getItem, setItem } from "../lib/persistentStorage";
import { STAGES } from "../campaign/stages";

export const CAMPAIGN_PROGRESS_KEY = "quad:campaign-basic50-v1";
const KEY = CAMPAIGN_PROGRESS_KEY;
type Status = "loading" | "saved" | "saving" | "error";

/** 입력: 저장 문자열 / 출력: 순서대로 완료한 단계 수. 버전/범위가 잘못되면 안전한 첫 단계. */
export function parseCampaignProgress(raw: string | null): number {
  try {
    const data = JSON.parse(raw ?? "null");
    return data?.version === 1 && Number.isInteger(data.completed) && data.completed >= 0 && data.completed <= STAGES.length ? data.completed : 0;
  } catch { return 0; }
}

/** 입력: 저장값 / 출력: 완료 단계별 최고 별. 과거 클리어는1별로 보존한다. */
export function parseCampaignStars(raw: string | null): Record<number, number> {
  const completed = parseCampaignProgress(raw), result: Record<number, number> = {};
  let data: { stars?: Record<string, unknown> } | null = null;
  try { data = JSON.parse(raw ?? "null"); } catch { /* 손상된 기록에는 별을 부여하지 않는다. */ }
  for (let id = 1; id <= completed; id++) {
    const value = data?.stars?.[id];
    result[id] = typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 3 ? value : 1;
  }
  return result;
}

/** 입력: 활성 여부 / 출력: 진행·최고 별·순차 해금·재시도. 초기 읽기 전에는 쓰지 않는다. */
export function useCampaignProgress(active = true) {
  const [completed, setCompleted] = useState(0), [ready, setReady] = useState(false);
  const [stars, setStars] = useState<Record<number, number>>({});
  const bestStars = useRef<Record<number, number>>({});
  const [status, setStatus] = useState<Status>("loading"), [readAttempt, setReadAttempt] = useState(0);
  const best = useRef(0), loaded = useRef(false), mounted = useRef(false), version = useRef(0);
  const persist = useCallback(() => {
    if (!loaded.current) return;
    const request = ++version.current;
    setStatus("saving");
    void setItem(KEY, JSON.stringify({ version: 1, completed: best.current, stars: bestStars.current })).then(ok => {
      if (mounted.current && request === version.current) setStatus(ok ? "saved" : "error");
    }).catch(() => { if (mounted.current && request === version.current) setStatus("error"); });
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    if (loaded.current) return;
    setStatus("loading");
    void getItem(KEY).then(raw => {
      if (cancelled) return;
      best.current = Math.max(best.current, parseCampaignProgress(raw));
      bestStars.current = parseCampaignStars(raw); setStars(bestStars.current);
      loaded.current = true; setCompleted(best.current); setReady(true); setStatus("saved");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [readAttempt, active]);
  const complete = useCallback((id: number, earned = 1) => {
    if (!loaded.current || !Number.isInteger(id) || id < 1 || id > best.current + 1 || id > STAGES.length || !Number.isInteger(earned) || earned < 1 || earned > 3) return;
    const previous = bestStars.current[id] ?? 0;
    if (id <= best.current && earned <= previous) return;
    best.current = Math.max(best.current, id); setCompleted(best.current);
    bestStars.current = { ...bestStars.current, [id]: Math.max(previous, earned) };
    setStars(bestStars.current); persist();
  }, [persist]);
  const retry = useCallback(() => { if (loaded.current) persist(); else setReadAttempt(n => n + 1); }, [persist]);
  return { completed, stars, ready, status, complete, retry };
}
