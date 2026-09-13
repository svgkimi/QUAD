# 룰 확장 v2 — 실행 기반 플레이 시나리오

실제 사용자 인터뷰가 아닌 자동 정책 관측이다. 느린 정책: 판단700ms/입력90ms. 빠른 정책: 판단120ms/입력35ms·NEXT 탐색. 50ms 시간 단위로 입력은 올림 처리한다. HOLD·사람의 실수·목표별 전략은 모델링하지 않는다. 하나의 성공 사례로 모든 랜덤 시드의 해결 가능성을 보증하지 않는다.

## 1 — 150초 안에 3줄 지우기

- 빠른 정책 성공 사례: 시드 11, 4.40초, cleared(goal), 14개 배치·3줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 20.50초, cleared(goal), 20개 배치·3줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 2 — 150초 안에 4줄 지우기

- 빠른 정책 성공 사례: 시드 11, 6.85초, cleared(goal), 22개 배치·4줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 22.70초, cleared(goal), 22개 배치·4줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 3 — 150초 안에 한 번에 2줄 이상 지우기

- 빠른 정책 성공 사례: 시드 42, 4.10초, cleared(goal), 13개 배치·4줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 31.00초, failed(topout), 31개 배치·3줄 제거·0별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":2,"sent":0,"received":0,"remainingTargets":0,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 4 — 150초 안에 5줄 지우기

- 빠른 정책 성공 사례: 시드 11, 8.95초, cleared(goal), 28개 배치·5줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 23.90초, cleared(goal), 23개 배치·5줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 5 — 180초 안에 줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기

- 빠른 정책 성공 사례: 시드 11, 21.00초, cleared(ai-topout), 65개 배치·24줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 15/피격 0줄.
- 느린 정책 사례: 시드 11, 95.30초, cleared(ai-topout), 91개 배치·33줄 제거·3별. 남은 목표 0개, 한 번에 최대 3줄, 공격 12/피격 3줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":3,"received":0,"remainingTargets":0,"bestClear":1},{"atMs":20050,"lines":22,"height":5,"sent":14,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 6 — 150초 안에 ◇ 표시 블록 4개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 1.45초, cleared(goal), 5개 배치·2줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 123, 51.10초, failed(topout), 50개 배치·12줄 제거·0별. 남은 목표 2개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":2,"sent":0,"received":0,"remainingTargets":4,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 7 — 140초 안에 5줄 지우기

- 빠른 정책 성공 사례: 시드 11, 8.95초, cleared(goal), 28개 배치·5줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 23.90초, cleared(goal), 23개 배치·5줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 8 — 145초 안에 ◇ 표시 블록 4개 모두 제거하기

- 빠른 정책 성공 사례: 시드 42, 0.85초, cleared(goal), 3개 배치·2줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 54.50초, failed(topout), 52개 배치·8줄 제거·0별. 남은 목표 2개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":3,"sent":0,"received":0,"remainingTargets":4,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 9 — 130초 안에 6줄 지우기

- 빠른 정책 성공 사례: 시드 11, 9.25초, cleared(goal), 29개 배치·6줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 25.00초, cleared(goal), 24개 배치·6줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 10 — 180초 안에 줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기

- 빠른 정책 성공 사례: 시드 11, 29.65초, cleared(ai-topout), 91개 배치·30줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 20/피격 1줄.
- 느린 정책 사례: 시드 42, 102.00초, failed(topout), 98개 배치·30줄 제거·0별. 남은 목표 0개, 한 번에 최대 3줄, 공격 12/피격 5줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":3,"received":0,"remainingTargets":0,"bestClear":1},{"atMs":20050,"lines":22,"height":5,"sent":14,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 11 — 140초 안에 6줄 지우기

- 빠른 정책 성공 사례: 시드 11, 9.25초, cleared(goal), 29개 배치·6줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 25.00초, cleared(goal), 24개 배치·6줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 12 — 180초 안에 한 번에 4줄 이상 지우기

- 빠른 정책 성공 사례: 시드 11, 10.00초, cleared(goal), 32개 배치·7줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 25.60초, failed(topout), 26개 배치·3줄 제거·0별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":4,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10000,"lines":7,"height":14,"sent":0,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 13 — 140초 안에 ◇ 표시 블록 6개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 52.80초, cleared(goal), 163개 배치·65줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 123, 140.00초, failed(timeout), 135개 배치·51줄 제거·0별. 남은 목표 4개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":30050,"lines":34,"height":7,"sent":0,"received":0,"remainingTargets":2,"bestClear":4},{"atMs":40050,"lines":48,"height":4,"sent":0,"received":0,"remainingTargets":2,"bestClear":4},{"atMs":50050,"lines":61,"height":5,"sent":0,"received":0,"remainingTargets":2,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 14 — 60초 동안 살아남기

- 빠른 정책 성공 사례: 시드 11, 60.00초, cleared(goal), 183개 배치·68줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 60.00초, cleared(goal), 58개 배치·18줄 제거·3별. 남은 목표 0개, 한 번에 최대 3줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":30050,"lines":30,"height":8,"sent":0,"received":0,"remainingTargets":0,"bestClear":4},{"atMs":40050,"lines":42,"height":10,"sent":0,"received":0,"remainingTargets":0,"bestClear":4},{"atMs":50050,"lines":57,"height":5,"sent":0,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 15 — 175초 안에 줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기

- 빠른 정책 성공 사례: 시드 11, 21.00초, cleared(ai-topout), 65개 배치·24줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 15/피격 0줄.
- 느린 정책 사례: 시드 50001, 57.40초, failed(topout), 58개 배치·12줄 제거·0별. 남은 목표 0개, 한 번에 최대 2줄, 공격 6/피격 4줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":3,"received":0,"remainingTargets":0,"bestClear":1},{"atMs":20050,"lines":22,"height":5,"sent":14,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 16 — 130초 안에 ◇ 표시 블록 4개 모두 제거하기

- 빠른 정책 성공 사례: 시드 42, 0.85초, cleared(goal), 3개 배치·2줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 55.70초, failed(topout), 54개 배치·8줄 제거·0별. 남은 목표 2개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":3,"sent":0,"received":0,"remainingTargets":4,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 17 — 135초 안에 8줄 지우기

- 빠른 정책 성공 사례: 시드 11, 10.15초, cleared(goal), 32개 배치·11줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 31.20초, cleared(goal), 30개 배치·8줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 18 — 135초 안에 ◇ 표시 블록 6개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 22.10초, cleared(goal), 67개 배치·28줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 135.00초, failed(timeout), 127개 배치·49줄 제거·0별. 남은 목표 2개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":4,"sent":0,"received":0,"remainingTargets":6,"bestClear":0},{"atMs":10050,"lines":12,"height":4,"sent":0,"received":0,"remainingTargets":2,"bestClear":2},{"atMs":20050,"lines":24,"height":4,"sent":0,"received":0,"remainingTargets":2,"bestClear":2}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 19 — 125초 안에 9줄 지우기

- 빠른 정책 성공 사례: 시드 11, 10.15초, cleared(goal), 32개 배치·11줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 33.30초, cleared(goal), 32개 배치·10줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 20 — 170초 안에 줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기

- 빠른 정책 성공 사례: 시드 11, 28.60초, cleared(ai-topout), 88개 배치·26줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 16/피격 0줄.
- 느린 정책 사례: 시드 2026, 116.20초, failed(topout), 111개 배치·38줄 제거·0별. 남은 목표 0개, 한 번에 최대 3줄, 공격 15/피격 11줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":3,"received":0,"remainingTargets":0,"bestClear":1},{"atMs":20050,"lines":22,"height":5,"sent":14,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 21 — 135초 안에 8줄 지우기

- 빠른 정책 성공 사례: 시드 11, 10.15초, cleared(goal), 32개 배치·11줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 31.20초, cleared(goal), 30개 배치·8줄 제거·3별. 남은 목표 0개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 22 — 130초 안에 10줄 지우기

- 빠른 정책 성공 사례: 시드 11, 10.15초, cleared(goal), 32개 배치·11줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 33.30초, cleared(goal), 32개 배치·10줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 23 — 75초 동안 살아남기

- 빠른 정책 성공 사례: 시드 11, 75.00초, cleared(goal), 229개 배치·87줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 75.00초, cleared(goal), 71개 배치·22줄 제거·3별. 남은 목표 0개, 한 번에 최대 3줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50050,"lines":57,"height":5,"sent":0,"received":0,"remainingTargets":0,"bestClear":4},{"atMs":60050,"lines":68,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":4},{"atMs":70050,"lines":84,"height":3,"sent":0,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 24 — 125초 안에 ◇ 표시 블록 6개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 8.95초, cleared(goal), 28개 배치·13줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 123, 125.00초, failed(timeout), 121개 배치·48줄 제거·0별. 남은 목표 2개, 한 번에 최대 3줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":4,"sent":0,"received":0,"remainingTargets":6,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 25 — 170초 안에 줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기

- 빠른 정책 성공 사례: 시드 11, 21.00초, cleared(ai-topout), 65개 배치·24줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 15/피격 0줄.
- 느린 정책 사례: 시드 50001, 63.45초, failed(topout), 60개 배치·15줄 제거·0별. 남은 목표 0개, 한 번에 최대 1줄, 공격 4/피격 5줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":3,"received":0,"remainingTargets":0,"bestClear":1},{"atMs":20050,"lines":22,"height":5,"sent":14,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 26 — 130초 안에 ◇ 표시 블록 6개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 22.10초, cleared(goal), 67개 배치·28줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 130.00초, failed(timeout), 122개 배치·46줄 제거·0별. 남은 목표 2개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":4,"sent":0,"received":0,"remainingTargets":6,"bestClear":0},{"atMs":10050,"lines":12,"height":4,"sent":0,"received":0,"remainingTargets":2,"bestClear":2},{"atMs":20050,"lines":24,"height":4,"sent":0,"received":0,"remainingTargets":2,"bestClear":2}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 27 — 125초 안에 11줄 지우기

- 빠른 정책 성공 사례: 시드 11, 10.15초, cleared(goal), 32개 배치·11줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 36.60초, cleared(goal), 35개 배치·11줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 28 — 120초 안에 ◇ 표시 블록 8개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 30.85초, cleared(goal), 94개 배치·39줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 123, 49.60초, failed(topout), 49개 배치·8줄 제거·0별. 남은 목표 4개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":10050,"lines":7,"height":14,"sent":0,"received":0,"remainingTargets":2,"bestClear":2},{"atMs":20050,"lines":22,"height":8,"sent":0,"received":0,"remainingTargets":2,"bestClear":2},{"atMs":30050,"lines":36,"height":5,"sent":0,"received":0,"remainingTargets":2,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 29 — 120초 안에 12줄 지우기

- 빠른 정책 성공 사례: 시드 11, 10.55초, cleared(goal), 33개 배치·12줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 37.70초, cleared(goal), 36개 배치·12줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 30 — 165초 안에 줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기

- 빠른 정책 성공 사례: 시드 11, 29.65초, cleared(ai-topout), 91개 배치·30줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 20/피격 2줄.
- 느린 정책 사례: 시드 42, 83.50초, failed(topout), 82개 배치·29줄 제거·0별. 남은 목표 0개, 한 번에 최대 3줄, 공격 12/피격 13줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":3,"received":0,"remainingTargets":0,"bestClear":1},{"atMs":20050,"lines":22,"height":6,"sent":14,"received":1,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 31 — 130초 안에 ◇ 표시 블록 6개 모두 제거하기

- 빠른 정책 성공 사례: 시드 42, 4.20초, cleared(goal), 14개 배치·7줄 제거·3별. 남은 목표 0개, 한 번에 최대 3줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 49.30초, failed(topout), 48개 배치·8줄 제거·0별. 남은 목표 2개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":4,"sent":0,"received":0,"remainingTargets":6,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 32 — 120초 안에 13줄 지우기

- 빠른 정책 성공 사례: 시드 11, 12.00초, cleared(goal), 37개 배치·13줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 45.20초, cleared(goal), 43개 배치·13줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 33 — 80초 동안 살아남기

- 빠른 정책 성공 사례: 시드 11, 80.00초, cleared(goal), 244개 배치·95줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 80.00초, cleared(goal), 76개 배치·26줄 제거·3별. 남은 목표 0개, 한 번에 최대 3줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50050,"lines":57,"height":5,"sent":0,"received":0,"remainingTargets":0,"bestClear":4},{"atMs":60050,"lines":68,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":4},{"atMs":70050,"lines":84,"height":3,"sent":0,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 34 — 115초 안에 ◇ 표시 블록 8개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 8.55초, cleared(goal), 28개 배치·14줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 74.50초, failed(topout), 73개 배치·20줄 제거·0별. 남은 목표 2개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":5,"sent":0,"received":0,"remainingTargets":8,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 35 — 160초 안에 줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기

- 빠른 정책 성공 사례: 시드 11, 29.65초, cleared(ai-topout), 91개 배치·30줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 20/피격 1줄.
- 느린 정책 사례: 시드 42, 96.00초, failed(topout), 94개 배치·30줄 제거·0별. 남은 목표 0개, 한 번에 최대 3줄, 공격 12/피격 10줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":3,"received":0,"remainingTargets":0,"bestClear":1},{"atMs":20050,"lines":22,"height":5,"sent":14,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 36 — 125초 안에 ◇ 표시 블록 8개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 30.85초, cleared(goal), 94개 배치·39줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 123, 49.60초, failed(topout), 49개 배치·8줄 제거·0별. 남은 목표 4개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":10050,"lines":7,"height":14,"sent":0,"received":0,"remainingTargets":2,"bestClear":2},{"atMs":20050,"lines":22,"height":8,"sent":0,"received":0,"remainingTargets":2,"bestClear":2},{"atMs":30050,"lines":36,"height":5,"sent":0,"received":0,"remainingTargets":2,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 37 — 115초 안에 14줄 지우기

- 빠른 정책 성공 사례: 시드 11, 12.45초, cleared(goal), 38개 배치·14줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 49.00초, cleared(goal), 47개 배치·14줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 38 — 115초 안에 ◇ 표시 블록 10개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 42.10초, cleared(goal), 131개 배치·55줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 115.00초, failed(timeout), 110개 배치·42줄 제거·0별. 남은 목표 2개, 한 번에 최대 3줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":20050,"lines":23,"height":9,"sent":0,"received":0,"remainingTargets":2,"bestClear":3},{"atMs":30050,"lines":39,"height":3,"sent":0,"received":0,"remainingTargets":2,"bestClear":4},{"atMs":40050,"lines":50,"height":5,"sent":0,"received":0,"remainingTargets":2,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 39 — 110초 안에 15줄 지우기

- 빠른 정책 성공 사례: 시드 11, 14.95초, cleared(goal), 46개 배치·16줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 54.80초, cleared(goal), 53개 배치·15줄 제거·2별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 40 — 155초 안에 줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기

- 빠른 정책 성공 사례: 시드 11, 28.25초, cleared(ai-topout), 87개 배치·32줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 18/피격 2줄.
- 느린 정책 사례: 시드 11, 69.30초, failed(topout), 68개 배치·21줄 제거·0별. 남은 목표 0개, 한 번에 최대 3줄, 공격 7/피격 12줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":3,"received":0,"remainingTargets":0,"bestClear":1},{"atMs":20050,"lines":22,"height":6,"sent":14,"received":1,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 41 — 120초 안에 ◇ 표시 블록 8개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 23.15초, cleared(goal), 72개 배치·28줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 38.90초, failed(topout), 39개 배치·5줄 제거·0별. 남은 목표 4개, 한 번에 최대 1줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":5,"sent":0,"received":0,"remainingTargets":8,"bestClear":0},{"atMs":10050,"lines":8,"height":13,"sent":0,"received":0,"remainingTargets":2,"bestClear":2},{"atMs":20050,"lines":22,"height":8,"sent":0,"received":0,"remainingTargets":2,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 42 — 115초 안에 15줄 지우기

- 빠른 정책 성공 사례: 시드 11, 14.95초, cleared(goal), 46개 배치·16줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 54.80초, cleared(goal), 53개 배치·15줄 제거·2별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 43 — 90초 동안 살아남기

- 빠른 정책 성공 사례: 시드 11, 90.00초, cleared(goal), 275개 배치·104줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 90.00초, cleared(goal), 86개 배치·30줄 제거·3별. 남은 목표 0개, 한 번에 최대 3줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":60050,"lines":68,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":4},{"atMs":70050,"lines":84,"height":3,"sent":0,"received":0,"remainingTargets":0,"bestClear":4},{"atMs":80050,"lines":95,"height":5,"sent":0,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 44 — 110초 안에 ◇ 표시 블록 10개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 109.40초, cleared(goal), 338개 배치·137줄 제거·1별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 110.00초, failed(timeout), 105개 배치·40줄 제거·0별. 남은 목표 6개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":80050,"lines":97,"height":7,"sent":0,"received":0,"remainingTargets":2,"bestClear":3},{"atMs":90050,"lines":110,"height":6,"sent":0,"received":0,"remainingTargets":2,"bestClear":4},{"atMs":100050,"lines":124,"height":4,"sent":0,"received":0,"remainingTargets":2,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 45 — 150초 안에 줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기

- 빠른 정책 성공 사례: 시드 11, 21.00초, cleared(ai-topout), 65개 배치·24줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 15/피격 0줄.
- 느린 정책 사례: 시드 11, 70.40초, failed(topout), 68개 배치·21줄 제거·0별. 남은 목표 0개, 한 번에 최대 3줄, 공격 7/피격 11줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":3,"received":0,"remainingTargets":0,"bestClear":1},{"atMs":20050,"lines":22,"height":5,"sent":14,"received":0,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 46 — 115초 안에 ◇ 표시 블록 8개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 8.55초, cleared(goal), 28개 배치·14줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 74.50초, failed(topout), 73개 배치·20줄 제거·0별. 남은 목표 2개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":5,"sent":0,"received":0,"remainingTargets":8,"bestClear":0}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 47 — 110초 안에 17줄 지우기

- 빠른 정책 성공 사례: 시드 11, 15.30초, cleared(goal), 47개 배치·17줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 56.00초, cleared(goal), 54개 배치·18줄 제거·2별. 남은 목표 0개, 한 번에 최대 3줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 48 — 110초 안에 ◇ 표시 블록 12개 모두 제거하기

- 빠른 정책 성공 사례: 시드 11, 14.45초, cleared(goal), 46개 배치·17줄 제거·3별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 64.50초, failed(topout), 63개 배치·18줄 제거·0별. 남은 목표 2개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":7,"sent":0,"received":0,"remainingTargets":12,"bestClear":0},{"atMs":10050,"lines":14,"height":4,"sent":0,"received":0,"remainingTargets":2,"bestClear":2}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 49 — 105초 안에 18줄 지우기

- 빠른 정책 성공 사례: 시드 11, 15.45초, cleared(goal), 48개 배치·18줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 0/피격 0줄.
- 느린 정책 사례: 시드 11, 79.80초, failed(topout), 76개 배치·15줄 제거·0별. 남은 목표 0개, 한 번에 최대 2줄, 공격 0/피격 0줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":7,"sent":0,"received":0,"remainingTargets":0,"bestClear":1}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

## 50 — 150초 안에 줄을 지워 방해 줄을 보내고 AI 보드를 넘치게 만들기

- 빠른 정책 성공 사례: 시드 11, 29.05초, cleared(ai-topout), 89개 배치·35줄 제거·3별. 남은 목표 0개, 한 번에 최대 4줄, 공격 19/피격 4줄.
- 느린 정책 사례: 시드 11, 37.95초, failed(topout), 37개 배치·7줄 제거·0별. 남은 목표 0개, 한 번에 최대 4줄, 공격 4/피격 8줄.
- 실행 중 관측: [{"atMs":50,"lines":0,"height":0,"sent":0,"received":0,"remainingTargets":0,"bestClear":0},{"atMs":10050,"lines":7,"height":8,"sent":3,"received":1,"remainingTargets":0,"bestClear":1},{"atMs":20050,"lines":23,"height":6,"sent":14,"received":2,"remainingTargets":0,"bestClear":4}]
- 일치 판정: PASS. 목표 판정·정지·난수 계약은 확인했지만 재미/인간 난이도는 미확인.

