import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";

/** 입력: 제목·설명·종료 콜백·내용 / 출력: 초기·순환·복원 포커스를 관리하는 모달. */
export function Modal({ title, description, onClose, children }: {
  readonly title: string; readonly description?: string;
  readonly onClose: () => void; readonly children: ReactNode;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  useModalFocus(root, onClose);
  return <div ref={root} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}
    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-md sm:items-center sm:p-6"
    onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="max-h-[82dvh] w-full max-w-sm overflow-y-auto rounded-[1.75rem] border border-white/15 bg-[#15151f] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><h2 id={id} className="text-xl font-black tracking-tight text-white">{title}</h2>
          {description && <p className="mt-1 text-xs leading-relaxed text-white/75">{description}</p>}</div>
        <button type="button" aria-label={`${title} 닫기`} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-white/80">×</button>
      </div>{children}
    </div>
  </div>;
}

/** 입력: 모달 루트와 닫기 함수 / 출력: 포커스 및 배경 입력 수명 관리. */
export function useModalFocus(root: RefObject<HTMLDivElement>, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = root.current!;
    const changed: HTMLElement[] = [];
    // 자신의 조상은 제외하고 각 조상의 형제 영역만 비활성화한다. 중첩 모달도 동일하게 동작한다.
    let branch: HTMLElement = dialog;
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.hasAttribute("inert")) {
          sibling.setAttribute("inert", ""); changed.push(sibling);
        }
      }
      branch = branch.parentElement;
    }
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')];
    (focusable()[0] ?? dialog).focus();
    const keydown = (event: KeyboardEvent) => {
      if (dialog.hasAttribute("inert") || dialog.closest('[inert]')) return;
      if (event.key === "Escape" || event.code === "Escape") {
        event.preventDefault(); event.stopImmediatePropagation(); close.current();
      } else if (event.key === "Tab" || event.code === "Tab") {
        const items = focusable();
        const current = items.indexOf(document.activeElement as HTMLElement);
        if (!items.length) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && current <= 0) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && (current < 0 || current === items.length - 1)) { event.preventDefault(); items[0].focus(); }
      }
    };
    window.addEventListener("keydown", keydown, true);
    return () => {
      window.removeEventListener("keydown", keydown, true);
      changed.forEach(element => element.removeAttribute("inert"));
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus();
    };
  }, []);
}
