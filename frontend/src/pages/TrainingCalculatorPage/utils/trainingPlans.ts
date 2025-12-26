// 훈련 계획 생성 유틸리티
import type { TrainingFrequency, TrainingPhase, Experience, Gender, UserProfile, Conditions } from './adjustments';
import type { TrainingPaces } from './vdotCalculations';
import { formatPace } from './vdotCalculations';

export type DayIntensity = 'low' | 'medium' | 'high' | 'rest';

export interface DayPlan {
  day: string;
  type: string;
  intensity: DayIntensity;
  duration: string;
  description: string;
}

export interface WeekPlan {
  week: string;
  focus: string;
  volume: string;
  keyWorkout: string;
}

export interface Workout {
  title: string;
  warmup: string;
  main: string;
  cooldown: string;
  tips: string;
  pace: string;
}

export interface Recommendation {
  title: string;
  items: string[];
}

/**
 * 주간 마이크로사이클 생성
 */
export function generateWeeklyPlan(frequency: TrainingFrequency, phase: TrainingPhase): DayPlan[] {
  let days: DayPlan[];
  
  if (frequency === '3-4') {
    days = [
      { day: '월', type: 'Easy', intensity: 'low', duration: '40-50분', description: 'E 페이스 회복런' },
      { day: '화', type: 'Rest', intensity: 'rest', duration: '휴식', description: '완전 휴식 또는 크로스트레이닝' },
      { day: '수', type: 'Interval', intensity: 'high', duration: '45분', description: '400m x 8 @ I 페이스' },
      { day: '목', type: 'Rest', intensity: 'rest', duration: '휴식', description: '완전 휴식' },
      { day: '금', type: 'Tempo', intensity: 'medium', duration: '35분', description: '20분 T 페이스' },
      { day: '토', type: 'Rest', intensity: 'rest', duration: '휴식', description: '완전 휴식' },
      { day: '일', type: 'Long', intensity: 'low', duration: '60-90분', description: 'E 페이스 장거리' },
    ];
  } else if (frequency === '5-6') {
    days = [
      { day: '월', type: 'Easy', intensity: 'low', duration: '50-60분', description: 'E 페이스 회복런' },
      { day: '화', type: 'Interval', intensity: 'high', duration: '50분', description: '1000m x 5 @ I 페이스' },
      { day: '수', type: 'Easy', intensity: 'low', duration: '40분', description: 'E 페이스 + 스트라이드' },
      { day: '목', type: 'Tempo', intensity: 'medium', duration: '45분', description: '2 x 15분 T 페이스' },
      { day: '금', type: 'Easy', intensity: 'low', duration: '30분', description: '회복 조깅' },
      { day: '토', type: 'Race Pace', intensity: 'medium', duration: '40분', description: '목표 레이스 페이스' },
      { day: '일', type: 'Long', intensity: 'low', duration: '90-120분', description: 'E/M 페이스 장거리' },
    ];
  } else if (frequency === '7') {
    days = [
      { day: '월', type: 'Easy+', intensity: 'low', duration: '60분', description: 'E 페이스 + 언덕' },
      { day: '화', type: 'Interval', intensity: 'high', duration: '60분', description: '1200m x 5 @ I 페이스' },
      { day: '수', type: 'Recovery', intensity: 'low', duration: '40분', description: '회복 조깅' },
      { day: '목', type: 'Threshold', intensity: 'medium', duration: '50분', description: '30분 T 페이스' },
      { day: '금', type: 'Easy', intensity: 'low', duration: '45분', description: 'E 페이스' },
      { day: '토', type: 'Repetition', intensity: 'high', duration: '45분', description: '200m x 10 @ R 페이스' },
      { day: '일', type: 'Long', intensity: 'low', duration: '120-150분', description: 'Progressive 장거리' },
    ];
  } else {
    // double sessions
    days = [
      { day: '월', type: 'AM: Easy\nPM: Recovery', intensity: 'low', duration: 'AM: 50분\nPM: 30분', description: '이중 회복' },
      { day: '화', type: 'AM: Interval\nPM: Easy', intensity: 'high', duration: 'AM: 60분\nPM: 30분', description: '핵심 세션 + 회복' },
      { day: '수', type: 'AM: Easy', intensity: 'low', duration: 'AM: 60분', description: '싱글 세션' },
      { day: '목', type: 'AM: Threshold\nPM: Easy', intensity: 'medium', duration: 'AM: 50분\nPM: 30분', description: 'T 페이스 + 회복' },
      { day: '금', type: 'AM: Recovery', intensity: 'low', duration: 'AM: 40분', description: '회복 조깅' },
      { day: '토', type: 'AM: Repetition', intensity: 'high', duration: 'AM: 50분', description: '스피드 세션' },
      { day: '일', type: 'AM: Long\nPM: Recovery', intensity: 'low', duration: 'AM: 120분\nPM: 20분', description: '장거리 + 쿨다운' },
    ];
  }
  
  // 훈련 단계별 수정
  if (phase === 'base') {
    days = days.map(d => {
      if (d.type.includes('Interval') || d.type.includes('Repetition')) {
        return {
          ...d,
          type: d.type.replace(/Interval|Repetition/, 'Fartlek'),
          intensity: 'medium' as DayIntensity,
          description: '변속주 (구조화되지 않은)',
        };
      }
      return d;
    });
  } else if (phase === 'taper') {
    days = days.map(d => ({
      ...d,
      duration: d.duration.replace(/\d+/g, (match) => Math.round(parseInt(match) * 0.6).toString()),
    }));
  }
  
  return days;
}

/**
 * 메조사이클 (4주 블록) 생성
 */
export function generateMesocycle(phase: TrainingPhase): WeekPlan[] {
  switch (phase) {
    case 'base':
      return [
        { week: '1주차', focus: '적응', volume: '70%', keyWorkout: 'Easy 런 위주, 주 3-4회 Fartlek' },
        { week: '2주차', focus: '볼륨 증가', volume: '85%', keyWorkout: 'Long Run 10% 증가, Tempo 도입' },
        { week: '3주차', focus: '강도 도입', volume: '100%', keyWorkout: 'Threshold 20분 x 2회, Long Run 유지' },
        { week: '4주차', focus: '회복', volume: '60%', keyWorkout: 'Easy 런 위주, 테스트 타임트라이얼' },
      ];
    case 'build':
      return [
        { week: '1주차', focus: 'VO₂max', volume: '80%', keyWorkout: '1000m x 5 @ I pace, Tempo 25분' },
        { week: '2주차', focus: '젖산역치', volume: '90%', keyWorkout: 'Threshold 30분 연속, 800m x 6' },
        { week: '3주차', focus: '종합', volume: '100%', keyWorkout: '1600m x 4 @ I pace, Long Run w/ M pace' },
        { week: '4주차', focus: '회복/테스트', volume: '70%', keyWorkout: '3-5km 테스트, Easy 런' },
      ];
    case 'peak':
      return [
        { week: '1주차', focus: '레이스 시뮬레이션', volume: '90%', keyWorkout: '목표 거리 80% @ 목표 페이스' },
        { week: '2주차', focus: '스피드', volume: '80%', keyWorkout: '400m x 10 @ R pace, 짧은 Tempo' },
        { week: '3주차', focus: '레이스 준비', volume: '70%', keyWorkout: '목표 페이스 확인, 전략 점검' },
        { week: '4주차', focus: '대회', volume: '50%', keyWorkout: '대회 3일전부터 테이퍼링' },
      ];
    default:
      return [
        { week: '1주차', focus: '기초', volume: '70%', keyWorkout: 'Easy 런 위주' },
        { week: '2주차', focus: '발전', volume: '85%', keyWorkout: '다양한 페이스 경험' },
        { week: '3주차', focus: '도전', volume: '100%', keyWorkout: '핵심 세션 집중' },
        { week: '4주차', focus: '회복', volume: '60%', keyWorkout: '다음 사이클 준비' },
      ];
  }
}

/**
 * 핵심 훈련 세션 상세 정보 생성
 */
export function generateWorkoutDetails(experience: Experience, paces: TrainingPaces): Workout[] {
  const intervalWorkout: Workout = {
    title: 'VO₂max 인터벌',
    warmup: '20분 Easy + 4x100m 스트라이드',
    main: experience === 'beginner' ? '800m x 4 @ I 페이스 (회복 2-3분)' :
          experience === 'intermediate' ? '1000m x 5 @ I 페이스 (회복 2-3분)' :
          experience === 'advanced' ? '1200m x 5 @ I 페이스 (회복 2분)' :
          '1600m x 5 @ I 페이스 (회복 90초)',
    cooldown: '15분 Easy + 스트레칭',
    tips: '일정한 페이스 유지, 마지막 반복까지 여유 있게',
    pace: formatPace(paces.interval),
  };
  
  const thresholdWorkout: Workout = {
    title: '젖산역치 훈련',
    warmup: '15분 Easy + 동적 스트레칭',
    main: experience === 'beginner' ? '20분 연속 @ T 페이스' :
          experience === 'intermediate' ? '2 x 15분 @ T 페이스 (휴식 1분)' :
          experience === 'advanced' ? '30분 연속 @ T 페이스' :
          '2 x 20분 @ T 페이스 (휴식 1분)',
    cooldown: '10분 Easy',
    tips: '편안하게 힘든 정도, 대화 어려운 수준',
    pace: formatPace(paces.threshold),
  };
  
  const longRunWorkout: Workout = {
    title: '장거리 훈련',
    warmup: '천천히 시작',
    main: experience === 'beginner' ? '60-75분 @ E 페이스' :
          experience === 'intermediate' ? '90-105분 @ E/M 페이스' :
          experience === 'advanced' ? '105-120분, 마지막 30분 M 페이스' :
          '120-150분 Progressive (E→M→T)',
    cooldown: '5-10분 매우 천천히',
    tips: '수분과 에너지 보충, 일정한 페이스',
    pace: `${formatPace(paces.easy.max)}-${formatPace(paces.easy.min)}`,
  };
  
  const repetitionWorkout: Workout = {
    title: '스피드/폼 훈련',
    warmup: '20분 Easy + 드릴',
    main: experience === 'beginner' ? '200m x 6 @ R 페이스 (완전회복)' :
          experience === 'intermediate' ? '400m x 6 @ R 페이스 (완전회복)' :
          experience === 'advanced' ? '400m x 4 + 200m x 4 @ R 페이스' :
          '600m x 6 @ R 페이스 (완전회복)',
    cooldown: '15분 Easy',
    tips: '폼에 집중, 완전 회복 후 다음 반복',
    pace: formatPace(paces.repetition),
  };
  
  return [intervalWorkout, thresholdWorkout, longRunWorkout, repetitionWorkout];
}

/**
 * 전문가 권장사항 생성
 */
export function generateRecommendations(profile: UserProfile, conditions: Conditions): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  // 성별 특화
  if (profile.gender === 'female') {
    recommendations.push({
      title: '여성 러너 권장사항',
      items: [
        '철분 수치 정기 체크 (페리틴 50ng/ml 이상 유지)',
        '월경 주기 고려한 훈련 강도 조절',
        '칼슘과 비타민 D 충분히 섭취',
        '골밀도 검사 연 1회',
      ],
    });
  }
  
  // 연령대 특화
  if (profile.ageGroup.includes('master')) {
    recommendations.push({
      title: '마스터즈 러너 권장사항',
      items: [
        '회복 시간 1.5-2배 확보',
        '주 2회 이상 근력 운동 필수',
        '고강도 훈련 전 충분한 워밍업 (20분 이상)',
        '유연성 운동 매일 15분',
        '정기 건강검진 (심혈관계 포함)',
      ],
    });
  }
  
  // 훈련 단계 특화
  if (profile.trainingPhase === 'base') {
    recommendations.push({
      title: '기초 체력기 권장사항',
      items: [
        '주간 마일리지 10% 이내 증가',
        '속도보다 시간/거리에 집중',
        '주 1-2회 크로스트레이닝',
        '코어 강화 운동 주 3회',
      ],
    });
  } else if (profile.trainingPhase === 'peak' || profile.trainingPhase === 'taper') {
    recommendations.push({
      title: '대회 준비 권장사항',
      items: [
        '새로운 장비나 음식 시도 금지',
        '충분한 수면 (8시간 이상)',
        '탄수화물 비중 60-70%로 증가',
        '대회 3일 전부터 카페인 섭취 제한',
        '레이스 페이스 시뮬레이션',
      ],
    });
  }
  
  // 조건 특화
  if (conditions.injuryRecovery) {
    recommendations.push({
      title: '부상 회복 프로토콜',
      items: [
        'Pain Scale 3/10 이하에서만 훈련',
        '아이싱과 압박 매일 실시',
        '항염증 음식 섭취 (오메가-3, 강황)',
        '대체 운동으로 유산소 유지 (수영, 자전거)',
        '물리치료사 상담 권장',
      ],
    });
  }
  
  // 일반 영양 가이드 (항상 포함)
  recommendations.push({
    title: '영양 섭취 가이드',
    items: [
      '훈련 전: 탄수화물 30-50g (1-2시간 전)',
      '훈련 중: 60분 이상 시 시간당 30-60g 탄수화물',
      '훈련 후 30분 내: 탄수화물:단백질 = 3:1 비율',
      '일일 수분 섭취: 체중(kg) x 35ml + 훈련 손실량',
      '전해질 보충: 나트륨 300-700mg/시간',
    ],
  });
  
  return recommendations;
}
