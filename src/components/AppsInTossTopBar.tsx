/**
 * AppsInTossTopBar.tsx
 * -----------------------------------------------------------------------
 * 앱인토스(토스 미니앱) 환경에서만 렌더링되는 상단 바. 브랜드 아이콘/이름과 우상단 닫기
 * 버튼을 표시한다 (게임 미니앱 심사 체크리스트: "네비게이션 바에 등록된 브랜드 로고와
 * 미니앱 이름 노출" / "우상단 닫기 버튼 정상 노출·동작·종료 확인 모달" 항목 대응).
 * granite.config.ts에서 네이티브 navigationBar를 모두 꺼두었으므로, 브랜드 표시와 닫기는
 * 전적으로 이 컴포넌트가 책임진다.
 *
 * 토스 환경이 아니면(isAppsInToss() === false) null을 반환해 기존 웹 배포 화면에는
 * 아무 영향도 주지 않는다.
 */
import { useState } from "react";
import { closeScreen, getBrand, isAppsInToss } from "../lib/appsInToss";

export function AppsInTossTopBar() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!isAppsInToss()) return null;

  const brand = getBrand();

  return (
    <>
      <div
        className="flex w-full shrink-0 items-center justify-between gap-2"
        style={{
          paddingTop: "max(0.5rem, var(--ait-safe-top, 0px))",
          paddingLeft: "max(0.75rem, var(--ait-safe-left, 0px))",
          paddingRight: "max(0.75rem, var(--ait-safe-right, 0px))",
          paddingBottom: "0.5rem",
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {brand?.icon && <img src={brand.icon} alt="" className="h-6 w-6 shrink-0 rounded-md" />}
          <span className="truncate text-sm font-semibold text-white/80">{brand?.displayName ?? "쿼드"}</span>
        </div>
        <button
          type="button"
          aria-label="닫기"
          onClick={() => setConfirmOpen(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-white/70 active:bg-white/10"
        >
          ×
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#14141c] p-6 text-center shadow-2xl">
            <p className="text-base font-semibold text-white">게임을 종료할까요?</p>
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-semibold text-white/80"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void closeScreen()}
                className="flex-1 rounded-xl bg-rose-500/90 py-2.5 text-sm font-semibold text-white"
              >
                종료
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
