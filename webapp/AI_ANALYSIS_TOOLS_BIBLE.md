# AI 계산 및 분석 도구 바이블
## AI Analysis Tools Bible - Version 1.0

---

## 🎯 문서의 목적 (Purpose Statement)

이 문서는 **절대 변경되지 않는 상위 등급의 지침**과 **지속적으로 업데이트 가능한 세부 사항**을 분리하여, 향후 새로운 논문, 개발자, 개별 선수 데이터가 추가되어도 **핵심 훈련 계산 방법의 정합성**을 유지하면서 **확장성**을 보장합니다.

### 핵심 철학 (Immutable Core Philosophy)
1. **훈련 계산의 정합성 > UI/UX 변화**
2. **과학적 근거 > 경험적 추정**
3. **개인화된 분석 > 일반화된 표준**
4. **데이터 검증 > 데이터 양**

---

## 📋 상위 등급 지침 (Supreme Guidelines) - 변경 불가

### 1. 계산 정합성 우선 원칙 (Calculation Integrity First)
```
모든 업데이트는 기존 계산 결과의 ±0.5% 오차 범위를 벗어나지 않아야 함
새로운 알고리즘 도입 시, 이전 버전과의 상관관계 r ≥ 0.98 유지 필수
```

### 2. 과학적 검증 프로토콜 (Scientific Validation Protocol)
```
새로운 계산법 적용 전 필요 조건:
- 최소 3개의 peer-reviewed 연구 지원
- 표본 크기 n ≥ 100
- 효과 크기 Cohen's d ≥ 0.5
- 재현 가능한 실험 조건 명시
```

### 3. 개인화 레벨 시스템 (Personalization Level System)
```
Level 1: 기본 인구통계학적 데이터 (나이, 성별, 키, 체중)
Level 2: 운동 경력 및 현재 수준
Level 3: 유전적/생리학적 특성 (VO2max, 젖산 역치)
Level 4: 훈련 반응성 및 회복 능력
Level 5: 심리적 요인 및 동기부여 상태
```

---

## 🔧 핵심 계산 알고리즘 (Core Calculation Algorithms)

### 3.1 VDOT 계산 엔진 (VDOT Calculation Engine)

#### 기본 공식 (Basic Formula)
```javascript
// Jack Daniels VDOT 공식 기반
function calculateVDOT(raceTime, raceDistance) {
  // raceTime: seconds
  // raceDistance: meters
  const velocity = raceDistance / raceTime; // m/s
  const vdot = (-4.6 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2)) * 0.9;
  return Math.round(vdot * 100) / 100;
}
```

#### 개인화 보정 계수 (Personalization Factors)
```javascript
const personalizationFactors = {
  age: { 
    coefficient: -0.002, // per year after 30
    baseline: 30
  },
  gender: {
    male: 1.0,
    female: 0.92
  },
  trainingYears: {
    coefficient: 0.015, // per year up to 10 years
    max: 0.15
  }
};
```

### 3.2 훈련 영역 계산 (Training Zone Calculations)

#### 심박수 기반 영역 (Heart Rate Based Zones)
```javascript
function calculateHRZones(maxHR, restingHR, trainingGoal) {
  const HRR = maxHR - restingHR; // Heart Rate Reserve
  
  return {
    zone1: { 
      min: Math.round(restingHR + HRR * 0.5),
      max: Math.round(restingHR + HRR * 0.6),
      purpose: "Active recovery, warm-up"
    },
    zone2: {
      min: Math.round(restingHR + HRR * 0.6),
      max: Math.round(restingHR + HRR * 0.7),
      purpose: "Aerobic base building"
    },
    zone3: {
      min: Math.round(restingHR + HRR * 0.7),
      max: Math.round(restingHR + HRR * 0.8),
      purpose: "Aerobic threshold"
    },
    zone4: {
      min: Math.round(restingHR + HRR * 0.8),
      max: Math.round(restingHR + HRR * 0.9),
      purpose: "Lactate threshold"
    },
    zone5: {
      min: Math.round(restingHR + HRR * 0.9),
      max: maxHR,
      purpose: "Neuromuscular power"
    }
  };
}
```

#### 페이스 기반 영역 (Pace Based Zones)
```javascript
function calculatePaceZones(vdot, raceDistance) {
  const basePace = getVDOTEquivalentPace(vdot, raceDistance);
  
  return {
    easy: basePace * 1.2,     // 20% slower
    marathon: basePace * 1.05, // 5% slower
    threshold: basePace * 0.95,  // 5% faster
    interval: basePace * 0.88, // 12% faster
    repetition: basePace * 0.82 // 18% faster
  };
}
```

---

## 📊 입력값 검증 체계 (Input Validation Framework)

### 4.1 기본 검증 규칙 (Basic Validation Rules)

```javascript
const validationRules = {
  age: {
    min: 10,
    max: 80,
    type: 'integer',
    required: true
  },
  weight: {
    min: 30,
    max: 150,
    type: 'float',
    unit: 'kg',
    required: true
  },
  vo2max: {
    min: 20,
    max: 90,
    type: 'float',
    unit: 'ml/kg/min',
    required: false,
    default: null
  },
  raceTime: {
    pattern: /^\d{1,2}:\d{2}:\d{2}$/,
    maxHours: 24,
    required: true
  }
};
```

### 4.2 상호 의존성 검증 (Cross-validation Rules)
```javascript
function validateAthleteProfile(data) {
  const errors = [];
  
  // 1. 나이와 경력의 합리성
  if (data.trainingYears > data.age - 12) {
    errors.push('Training years cannot exceed age - 12');
  }
  
  // 2. 체중과 키의 BMI 범위
  const bmi = data.weight / Math.pow(data.height / 100, 2);
  if (bmi < 15 || bmi > 40) {
    errors.push('BMI should be between 15 and 40');
  }
  
  // 3. VO2max와 경기 기록의 일치성
  const expectedVO2max = estimateVO2maxFromRace(data.raceTime, data.raceDistance);
  if (data.vo2max && Math.abs(data.vo2max - expectedVO2max) > 10) {
    errors.push('VO2max inconsistent with race performance');
  }
  
  return errors;
}
```

---

## 🧬 개별 선수 데이터 통합 가이드라인

### 5.1 데이터 레벨 분류 (Data Level Classification)

```javascript
const athleteDataLevels = {
  level1: {
    name: "Basic Profile",
    fields: ["age", "gender", "height", "weight", "trainingYears"],
    updateFrequency: "monthly",
    source: "user_input"
  },
  level2: {
    name: "Performance History",
    fields: ["raceTimes", "personalBests", "trainingVolume"],
    updateFrequency: "weekly",
    source: ["user_input", "device_sync"]
  },
  level3: {
    name: "Physiological Markers",
    fields: ["restingHR", "maxHR", "vo2max", "lactateThreshold"],
    updateFrequency: "bi-weekly",
    source: "lab_testing"
  },
  level4: {
    name: "Advanced Metrics",
    fields: ["runningEconomy", "muscleFiberType", "geneticMarkers"],
    updateFrequency: "quarterly",
    source: "specialized_testing"
  }
};
```

### 5.2 데이터 품질 관리 (Data Quality Management)
```javascript
function assessDataQuality(athleteData) {
  const quality = {
    completeness: calculateCompleteness(athleteData),
    consistency: checkConsistency(athleteData),
    currency: evaluateCurrency(athleteData),
    accuracy: validateAccuracy(athleteData)
  };
  
  const overallScore = Object.values(quality).reduce((a, b) => a + b, 0) / 4;
  
  return {
    score: overallScore,
    level: overallScore >= 0.8 ? "high" : overallScore >= 0.6 ? "medium" : "low",
    recommendations: generateQualityRecommendations(quality)
  };
}
```

---

## 📚 새로운 논문 업데이트 프로토콜

### 6.1 연구 평가 기준 (Research Evaluation Criteria)

```javascript
const researchEvaluation = {
  qualityScore: {
    journalImpact: 0.3,    // Impact factor weight
    sampleSize: 0.25,        // n > 100 gets full score
    studyDesign: 0.25,     // RCT > longitudinal > cross-sectional
    statisticalPower: 0.2    // Power > 0.8
  },
  
  applicabilityScore: {
    populationMatch: 0.4,    // How well subjects match our users
    interventionPracticality: 0.3,
    outcomeRelevance: 0.3
  },
  
  minimumThreshold: 0.7,
  updateTrigger: "consensus_score > 0.75 from 3+ studies"
};
```

### 6.2 업데이트 구현 절차 (Update Implementation Process)

```javascript
function implementResearchUpdate(newResearch, currentAlgorithm) {
  const process = {
    step1: evaluateResearchQuality(newResearch),
    step2: calculateEffectSize(newResearch),
    step3: validateAgainstCurrentData(currentAlgorithm),
    step4: runABTest(),
    step5: implementGradualRollout(),
    step6: monitorPerformance()
  };
  
  return process;
}
```

---

## 🔄 버전 관리 및 하위 호환성

### 7.1 버전 체계 (Versioning System)
```
Major.Minor.Patch-Build
- Major: 핵심 계산법 변경 (호환성 깨짐)
- Minor: 새로운 기능 추가 (하위 호환성 유지)
- Patch: 버그 수정 (하위 호환성 유지)
- Build: 빌드 번호
```

### 7.2 마이그레이션 규칙 (Migration Rules)
```javascript
const migrationRules = {
  majorVersion: {
    backupRequired: true,
    gradualTransition: true,
    userNotification: "mandatory",
    dataMigration: "automated"
  },
  minorVersion: {
    backupRecommended: true,
    gradualTransition: false,
    userNotification: "optional",
    dataMigration: "backward_compatible"
  }
};
```

---

## 🧪 테스트 및 검증 프로토콜

### 8.1 단위 테스트 (Unit Testing)
```javascript
describe('VDOT Calculation', () => {
  test('should calculate VDOT for 5K in 20:00', () => {
    const result = calculateVDOT(1200, 5000);
    expect(result).toBeCloseTo(45.2, 1);
  });
  
  test('should handle edge cases', () => {
    expect(() => calculateVDOT(0, 5000)).toThrow();
    expect(() => calculateVDOT(1200, 0)).toThrow();
  });
});
```

### 8.2 통합 테스트 (Integration Testing)
```javascript
describe('Training Plan Generation', () => {
  test('should generate consistent plans for same input', () => {
    const athlete = createTestAthlete();
    const plan1 = generateTrainingPlan(athlete);
    const plan2 = generateTrainingPlan(athlete);
    
    expect(plan1.totalVolume).toBeCloseTo(plan2.totalVolume, 0);
  });
});
```

---

## 📊 성능 모니터링 (Performance Monitoring)

### 9.1 핵심 지표 (Key Metrics)
```javascript
const performanceMetrics = {
  calculationAccuracy: {
    target: 0.95,
    measure: 'correlation_with_actual_performance'
  },
  predictionPrecision: {
    target: 0.85,
    measure: 'mape_of_race_predictions'
  },
  userSatisfaction: {
    target: 4.2,
    measure: 'average_rating'
  },
  systemReliability: {
    target: 0.99,
    measure: 'uptime_percentage'
  }
};
```

### 9.2 경고 시스템 (Alerting System)
```javascript
function setupMonitoring() {
  const alerts = {
    accuracyDrop: {
      threshold: 0.9,
      action: 'investigate_algorithm'
    },
    userComplaints: {
      threshold: 5, // per week
      action: 'review_ui_ux'
    },
    systemDowntime: {
      threshold: 0.95,
      action: 'emergency_response'
    }
  };
  
  return alerts;
}
```

---

## 🚀 확장 가능한 아키텍처 (Extensible Architecture)

### 10.1 플러그인 시스템 (Plugin System)
```javascript
class AnalysisPlugin {
  constructor(name, version, dependencies) {
    this.name = name;
    this.version = version;
    this.dependencies = dependencies;
  }
  
  validateInput(data) {
    // Plugin-specific validation
  }
  
  calculate(data) {
    // Plugin-specific calculation
  }
  
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      accuracy: this.getAccuracy(),
      requirements: this.dependencies
    };
  }
}
```

### 10.2 API 인터페이스 (API Interface)
```javascript
const apiInterface = {
  version: "1.0",
  endpoints: {
    calculateVDOT: {
      method: "POST",
      input: ["raceTime", "raceDistance"],
      output: "vdotScore",
      validation: "strict"
    },
    generateTrainingPlan: {
      method: "POST", 
      input: ["athleteProfile", "goals", "constraints"],
      output: "trainingPlan",
      validation: "comprehensive"
    }
  }
};
```

---

## 📝 문서 업데이트 프로토콜

### 11.1 변경 관리 (Change Management)
```
1. 변경 요청 → 2. 영향 분석 → 3. 동료 검토 → 4. 테스트 → 5. 문서화 → 6. 배포
```

### 11.2 버전 히스토리 (Version History)
```markdown
## Version 1.0 (Current)
- Date: 2025-01-12
- Author: AI Development Team
- Changes: Initial comprehensive documentation
- Compatibility: All systems
- Validation: Full test suite passed
```

---

## 🎯 결론 및 다음 단계

이 바이블은 AI 분석 도구의 **불변하는 핵심 원칙**과 **확장 가능한 구조**를 정의합니다. 개발자는 이 문서를 기반으로 다음과 같은 작업을 수행할 수 있습니다:

1. **새로운 알고리즘 추가**: 섹션 10.1의 플러그인 시스템 활용
2. **개별 선수 데이터 통합**: 섹션 5의 가이드라인 따름
3. **연구 업데이트**: 섹션 6의 프로토콜 준수
4. **UI/UX 개선**: 핵심 계산은 유지하면서 인터페이스만 변경

### 긴급 연락처 (Emergency Contacts)
- 기술 리더: tech-lead@athletetime.com
- 데이터 과학자: data-science@athletetime.com
- 제품 관리자: product@athletetime.com

---

**⚠️ 중요**: 이 문서의 상위 등급 지침(섹션 1-3)은 **절대 변경 불가**하며, 모든 업데이트는 **하위 호환성**을 유지해야 합니다.