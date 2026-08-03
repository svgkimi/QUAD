/**
 * appsInToss.ts
 * -----------------------------------------------------------------------
 * 앱인토스(@apps-in-toss/web-framework) SDK 안전 래퍼. 이 파일 밖의 코드는 SDK를 직접
 * import하지 않고 반드시 이 모듈을 거친다 - 토스 앱 웹뷰 밖(일반 브라우저)에서는 SDK 호출이
 * 실패하거나 무의미한 값을 반환할 수 있는데, 이 경우 항상 안전하게 폴백되어 기존 Vercel
 * 웹 배포 동작에는 영향이 없다.
 *
 * import 대상은 실제로 설치된 @apps-in-toss/web-framework@2.10.8의 타입 선언
 * (node_modules/@apps-in-toss/web-bridge/dist/*.d.ts)을 직접 확인해 검증한 이름이다.
 */
import {
  closeView,
  getAnonymousKey,
  getAppsInTossGlobals,
  getOperationalEnvironment,
  SafeAreaInsets as SdkSafeAreaInsets,
  setIosSwipeGestureEnabled,
} from "@apps-in-toss/web-framework";

export interface SafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface AppsInTossBrand {
  readonly displayName: string;
  readonly icon: string;
  readonly primaryColor: string;
}

const ZERO_INSETS: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** 현재 코드가 토스 앱(또는 샌드박스 앱) 웹뷰 안에서 실행 중인지 판별한다. 일반 브라우저에서는 false */
export function isAppsInToss(): boolean {
  try {
    const env = getOperationalEnvironment();
    return env === "toss" || env === "sandbox";
  } catch {
    return false;
  }
}

/** 콘솔에 등록된 브랜드명/아이콘/컬러를 조회한다. 토스 환경이 아니거나 실패하면 null */
export function getBrand(): AppsInTossBrand | null {
  if (!isAppsInToss()) return null;
  try {
    const globals = getAppsInTossGlobals();
    return { displayName: globals.brandDisplayName, icon: globals.brandIcon, primaryColor: globals.brandPrimaryColor };
  } catch {
    return null;
  }
}

/** 현재 화면(미니앱)을 닫는다. 토스 환경이 아니면 아무 동작도 하지 않는다 */
export async function closeScreen(): Promise<void> {
  if (!isAppsInToss()) return;
  try {
    await closeView();
  } catch {
    // 닫기 실패는 무시 - 사용자가 모달만 닫고 게임으로 복귀하게 된다
  }
}

/** 사용자 익명 식별자(hash)를 조회한다. 토스 환경이 아니거나 실패/미지원이면 null */
export async function getUserAnonymousKey(): Promise<string | null> {
  if (!isAppsInToss()) return null;
  try {
    const result = await getAnonymousKey();
    if (!result || result === "ERROR") return null;
    return result.hash;
  } catch {
    return null;
  }
}

/**
 * iOS 스와이프 뒤로가기 제스처를 켜거나 끈다 (게임 미니앱 심사 체크리스트: OS 백제스처 비활성화).
 * 토스 환경이 아니면 아무 동작도 하지 않는다.
 */
export async function setIosBackSwipeEnabled(isEnabled: boolean): Promise<void> {
  if (!isAppsInToss()) return;
  try {
    await setIosSwipeGestureEnabled({ isEnabled });
  } catch {
    // 미지원 버전/환경이면 조용히 무시
  }
}

/** 현재 Safe Area inset 값을 조회한다. 토스 환경이 아니거나 실패하면 모두 0 */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (!isAppsInToss()) return ZERO_INSETS;
  try {
    return SdkSafeAreaInsets.get();
  } catch {
    return ZERO_INSETS;
  }
}

/**
 * Safe Area 변경을 구독한다. 토스 환경이 아니면 즉시 구독하지 않고 빈 unsubscribe를 반환한다.
 * 입력: 콜백(변경된 insets) / 출력: 구독 해제 함수
 */
export function subscribeSafeArea(callback: (insets: SafeAreaInsets) => void): () => void {
  if (!isAppsInToss()) return () => {};
  try {
    return SdkSafeAreaInsets.subscribe({ onEvent: callback });
  } catch {
    return () => {};
  }
}
