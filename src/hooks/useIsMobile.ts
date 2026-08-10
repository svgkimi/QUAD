/**
 * useIsMobile.ts
 * -----------------------------------------------------------------------
 * 터치 기반 모바일 환경 여부를 판단하는 훅.
 *
 * 앱인토스(토스 미니앱) 환경이면 무조건 모바일로 간주한다. 미니앱은 오직 토스 앱 안의
 * 폰 화면에서만 실행되므로 감지할 이유가 없고, 만약 감지에 실패해 데스크톱 레이아웃이
 * 뜨면 터치 버튼(TouchControls)이 렌더되지 않아 조작 자체가 불가능해진다
 * (심사 체크리스트: "모든 UI 컴포넌트가 설계대로 동작" 위반).
 *
 * 그 외 일반 웹 환경에서는 뷰포트가 768px 미만이면 모바일 레이아웃을 사용한다.
 * 브라우저 미리보기·웹뷰처럼 실제 입력 장치가 마우스로 보고되더라도 좁은 화면에서는
 * 터치 버튼이 반드시 보여야 모바일 화면을 정확히 확인하고 조작할 수 있다.
 *
 * 입력: 없음 / 출력: boolean (모바일이면 true)
 */

import { useEffect, useState } from "react";
import { isAppsInToss } from "../lib/appsInToss";

/** 모바일로 취급하는 뷰포트 폭 상한(px). 이 값 미만이면서 터치 포인터일 때만 모바일 UI를 노출한다 */
const MOBILE_MAX_WIDTH = 768;

/** 현재 환경이 모바일(토스 앱 또는 좁은 화면)인지 판별한다. 입력: 없음 / 출력: boolean */
function computeIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  // 토스 미니앱은 항상 폰 화면이다 - 감지 없이 모바일 레이아웃을 강제한다
  if (isAppsInToss()) return true;
  return window.innerWidth < MOBILE_MAX_WIDTH;
}

/** 모바일(토스 앱 또는 좁은 화면) 여부를 반환하고, 리사이즈/회전 시 갱신하는 훅 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => computeIsMobile());

  useEffect(() => {
    const update = () => setIsMobile(computeIsMobile());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isMobile;
}
