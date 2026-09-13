import { STAGES } from "./stages";

// 별도 개발자 빌드에만 포함한다. URL·저장소·런타임 설정으로 켤 수 없다.
export const DEVELOPER_STAGE_ACCESS = __QUAD_DEVELOPER_STAGE_ACCESS__;

/** 입력: 단계·완료 수·기록 준비·테스트 권한 / 출력: 실제 시작 허용 여부. */
export function canStartStage(id: number, completed: number, ready: boolean, developerAccess = false): boolean {
  return Number.isInteger(id) && id >= 1 && id <= STAGES.length &&
    (developerAccess || (ready && id <= completed + 1));
}
