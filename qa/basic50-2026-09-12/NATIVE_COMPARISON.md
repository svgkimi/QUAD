# iOS Simulator 단계별 대조

iPhone 16 / iOS 26.5 (23F77), Xcode 26.6 (17F113). 일반 네이티브 WKWebView 393×759와 같은 시뮬레이터 안의 QA용 320×568 고정 WebView를 검사했다. 작은 호스트는 별도 실기기/SE 검사가 아니다. UI 조작은 QA 스크립트의 semantic click이며 물리 손가락 입력은 아니다.

웹 빌드 SHA-256: 07e38e04dabcdc504e932961cb5ed8a2ecdd2795edf383beb078a18cbbe18aa8

QA 호스트만 스테이지 전체 해금 데이터를 주입했다. 일반 테스트 앱은 주입하지 않는다.

## 기본 호스트 393×759

| 단계 | 시작 목표 | HUD | 게임판·버튼 | AI | 정지 | 대조 |
|---|---|---|---|---|---|---|
| 1 | 3줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 2 | 4줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 3 | 4줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 4 | 5줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 5 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 6 | 5줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 7 | 5줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 8 | 6줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 9 | 6줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 10 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 11 | 7줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 12 | 7줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 13 | 8줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 14 | 75초 생존 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 15 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 16 | 8줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 17 | 8줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 18 | 9줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 19 | 9줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 20 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 21 | 10줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 22 | 10줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 23 | 90초 생존 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 24 | 10줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 25 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 26 | 12줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 27 | 11줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 28 | 12줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 29 | 12줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 30 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 31 | 12줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 32 | 13줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 33 | 90초 생존 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 34 | 14줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 35 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 36 | 14줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 37 | 14줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 38 | 15줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 39 | 15줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 40 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 41 | 15줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 42 | 15줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 43 | 105초 생존 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 44 | 16줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 45 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 46 | 16줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 47 | 17줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 48 | 18줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 49 | 18줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 50 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
## 축소 호스트 320×568

| 단계 | 시작 목표 | HUD | 게임판·버튼 | AI | 정지 | 대조 |
|---|---|---|---|---|---|---|
| 1 | 3줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 2 | 4줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 3 | 4줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 4 | 5줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 5 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 6 | 5줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 7 | 5줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 8 | 6줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 9 | 6줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 10 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 11 | 7줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 12 | 7줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 13 | 8줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 14 | 75초 생존 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 15 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 16 | 8줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 17 | 8줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 18 | 9줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 19 | 9줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 20 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 21 | 10줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 22 | 10줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 23 | 90초 생존 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 24 | 10줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 25 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 26 | 12줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 27 | 11줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 28 | 12줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 29 | 12줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 30 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 31 | 12줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 32 | 13줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 33 | 90초 생존 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 34 | 14줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 35 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 36 | 14줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 37 | 14줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 38 | 15줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 39 | 15줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 40 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 41 | 15줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 42 | 15줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 43 | 105초 생존 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 44 | 16줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 45 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |
| 46 | 16줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 47 | 17줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 48 | 18줄 제거 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 49 | 18줄 제거 · 120초 | PASS | PASS | 해당 없음 | PASS | 일치 |
| 50 | AI 보드 넘치게 하기 | PASS | PASS | 동작 | PASS | 일치 |

불일치: 0

## 한계

- 모든 단계의 네이티브 진입/목표/AI 이동/정지/좌표 검사이며, 시뮬레이터에서 50단계를 사람이 직접 클리어한 기록은 아니다. 승패·별 결과는 별도 엔진 1,000판과 회귀 검사에서 검증했다.
- VoiceOver/TalkBack, iPhone/Android 실기기, 실제 햅틱·청감, 장시간 플레이 및 사람의 난이도 평가는 미확인.
- 첫 검사에서 카운트다운 직후 캔버스 크기 계산 전 패드 침범을 관측했다. useLayoutEffect로 첫 페인트 전에 크기를 결정하고, 겹침 assertion을 보강한 새 빌드를 재검사했다.
