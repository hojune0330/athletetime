// 기록 표기 보조 (인문/신뢰 도메인)
// 데이터 검수 결과, 빈 기록(record="")의 28.9%는 깨진 데이터가 아니라
// 불참/기권/무기록/실격 같은 "경기 상태"였다(note 필드).
// 화면에서 빈 기록을 "-"로만 보여주면 "데이터가 비었다"는 오해를 주므로,
// note를 사람이 읽을 수 있는 상태 라벨로 보여준다. (데이터 자체는 수정하지 않음)

export type RecordStatusKind = 'mark' | 'dns' | 'dnf' | 'no-mark' | 'dq' | 'unknown';

const STATUS_MAP: { match: (note: string) => boolean; kind: RecordStatusKind; label: string }[] = [
  { match: (n) => /불참|DNS/i.test(n), kind: 'dns', label: '불참' },
  { match: (n) => /기권|DNF|중도|포기/i.test(n), kind: 'dnf', label: '기권' },
  { match: (n) => /제한시간|시간초과|컷오프|cut/i.test(n), kind: 'dnf', label: '시간초과' },
  { match: (n) => /실격|DQ|탈락/i.test(n), kind: 'dq', label: '실격' },
  { match: (n) => /^NM$|무기록|기록없음/i.test(n), kind: 'no-mark', label: '무기록' },
];

export type RecordDisplay = {
  hasMark: boolean;
  kind: RecordStatusKind;
  /** 화면에 표시할 텍스트: 기록값이 있으면 기록, 없으면 상태 라벨, 둘 다 없으면 '기록 미상' */
  text: string;
};

/**
 * 기록 표시 텍스트를 결정한다.
 * @param record  recordDisplay (있으면 그대로 표기)
 * @param note    note 필드(상태 정보)
 */
export function resolveRecordDisplay(record?: string | null, note?: string | null): RecordDisplay {
  const mark = (record || '').trim();
  if (mark) {
    return { hasMark: true, kind: 'mark', text: mark };
  }

  const n = (note || '').trim();
  if (n) {
    for (const rule of STATUS_MAP) {
      if (rule.match(n)) {
        return { hasMark: false, kind: rule.kind, text: rule.label };
      }
    }
  }

  // 기록도 상태도 모르는 경우: 단정하지 않는다.
  return { hasMark: false, kind: 'unknown', text: '기록 미상' };
}
