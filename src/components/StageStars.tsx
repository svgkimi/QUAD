/** 입력: 획득 별0~3·크기 / 출력: SVG 성과 별. 난이도와 별개다. */
export function StageStars({ count, size = 16 }: { readonly count: number; readonly size?: number }) {
  return <span role="img" aria-label={`획득 별 ${count} / 3`} className="inline-flex items-center justify-center gap-1">
    {[1, 2, 3].map(n => <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={n <= count ? "text-amber-300" : "text-white/35"}>
      <path d="m12 2 3.1 6.3 7 .9-5.1 5 1.2 7-6.2-3.3L5.8 21l1.2-6.8-5-5 6.9-.9Z" fill={n <= count ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>)}
  </span>;
}
