import { useCallback, useEffect, useRef, useState } from "react";
import { getItem, setItem } from "../lib/persistentStorage";
import { parseControlLayout, type ControlLayout } from "../lib/controlLayout";

const KEY = "quad:control-layout";

/** 입력: 없음 / 출력: 패드 위치, 읽기 상태, 명시적 저장 함수. 초기 읽기 중에는 저장하지 않는다. */
export function useControlLayout() {
  const [layout, setLayout] = useState<ControlLayout | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const mounted = useRef(false);
  const saving = useRef(false);
  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    void getItem(KEY).then(raw => {
      if (!cancelled) { setLayout(parseControlLayout(raw)); setReady(true); }
    }).catch(() => { if (!cancelled) { setError(true); setReady(true); } });
    return () => { cancelled = true; mounted.current = false; };
  }, []);
  const save = useCallback(async (next: ControlLayout | null): Promise<boolean> => {
    if (!ready || saving.current) return false;
    saving.current = true;
    try {
      const ok = await setItem(KEY, JSON.stringify({ version: 2, positions: next }));
      if (mounted.current) { if (ok) setLayout(next); setError(!ok); }
      return ok;
    } catch { if (mounted.current) setError(true); return false; }
    finally { saving.current = false; }
  }, [ready]);
  return { layout, ready, error, save };
}
