# 개별 선수 데이터 통합 가이드라인
## Individual Athlete Data Integration Guidelines - Version 1.0

---

## 🎯 문서의 목적 (Purpose)

이 문서는 AI 분석 도구에 개별 선수의 데이터를 효과적으로 통합하기 위한 **표준화된 프로세스**, **데이터 품질 관리 체계**, **확장 가능한 통합 아키텍처**를 제공합니다. 향후 새로운 종류의 선수 데이터가 추가되어도 **핵심 계산 알고리즘의 정합성**을 유지하면서 **유연한 확장**이 가능하도록 설계되었습니다.

---

## 📊 데이터 레벨 분류 시스템 (Data Level Classification System)

### 5단계 데이터 레벨 (5-Level Data Hierarchy)

```javascript
/**
 * 개인화 수준에 따른 5단계 데이터 분류
 * Level 1: 기본 정보 → Level 5: 유전자 정보
 * 각 레벨은 이전 레벨의 데이터를 포함하며 확장됨
 */

const AthleteDataLevels = {
  level1: {
    name: "기본 프로필 (Basic Profile)",
    description: "인구통계학적 기본 정보",
    required: true,
    updateFrequency: "monthly",
    confidence: 1.0,
    fields: {
      personal: {
        age: {
          type: "integer",
          range: [10, 80],
          required: true,
          source: "user_input",
          validation: "age_verification"
        },
        gender: {
          type: "enum",
          values: ["male", "female", "other"],
          required: true,
          source: "user_input"
        },
        height: {
          type: "integer",
          range: [120, 220],
          unit: "cm",
          required: true,
          source: "user_input",
          validation: "height_weight_consistency"
        },
        weight: {
          type: "float",
          range: [30, 150],
          unit: "kg",
          precision: 1,
          required: true,
          source: "user_input",
          validation: "bmi_check"
        }
      },
      contact: {
        email: {
          type: "email",
          required: true,
          source: "user_input",
          validation: "email_verification"
        },
        timezone: {
          type: "string",
          required: false,
          source: "device_sync",
          default: "UTC"
        }
      }
    }
  },

  level2: {
    name: "운동 경력 (Training History)",
    description: "운동 경험 및 현재 수준",
    required: false,
    updateFrequency: "quarterly",
    confidence: 0.9,
    prerequisite: "level1",
    fields: {
      experience: {
        trainingYears: {
          type: "float",
          range: [0, 50],
          precision: 1,
          required: true,
          source: "user_input",
          validation: "experience_age_consistency"
        },
        primarySport: {
          type: "enum",
          values: ["running", "cycling", "swimming", "triathlon", "other"],
          required: true,
          source: "user_input"
        },
        currentLevel: {
          type: "enum",
          values: ["beginner", "intermediate", "advanced", "elite"],
          required: true,
          source: "assessment_test"
        }
      },
      performance: {
        personalBest5K: {
          type: "time",
          format: "HH:MM:SS",
          required: false,
          source: "race_history",
          validation: "performance_consistency"
        },
        personalBest10K: {
          type: "time",
          format: "HH:MM:SS",
          required: false,
          source: "race_history",
          validation: "performance_consistency"
        },
        weeklyVolume: {
          type: "integer",
          range: [0, 200],
          unit: "km",
          required: false,
          source: "training_log",
          validation: "volume_consistency"
        }
      }
    }
  },

  level3: {
    name: "생리학적 마커 (Physiological Markers)",
    description: "기본 생리학적 측정치",
    required: false,
    updateFrequency: "bi-annually",
    confidence: 0.85,
    prerequisite: "level2",
    fields: {
      cardiovascular: {
        restingHR: {
          type: "integer",
          range: [30, 100],
          unit: "bpm",
          required: false,
          source: "device_measurement",
          validation: "hr_resting_check"
        },
        maxHR: {
          type: "integer",
          range: [150, 220],
          unit: "bpm",
          required: false,
          source: "lab_test",
          validation: "hr_max_formula_check"
        },
        vo2max: {
          type: "float",
          range: [20, 90],
          unit: "ml/kg/min",
          required: false,
          source: "lab_test",
          validation: "vo2max_performance_correlation"
        }
      },
      metabolic: {
        lactateThreshold: {
          type: "float",
          range: [2.0, 6.0],
          unit: "mmol/L",
          required: false,
          source: "lab_test",
          validation: "lt_validity_check"
        },
        runningEconomy: {
          type: "float",
          range: [150, 300],
          unit: "ml/kg/km",
          required: false,
          source: "lab_test",
          validation: "economy_consistency"
        }
      }
    }
  },

  level4: {
    name: "고급 생리학 (Advanced Physiology)",
    description: "상세 생리학적 및 유전자 정보",
    required: false,
    updateFrequency: "annually",
    confidence: 0.8,
    prerequisite: "level3",
    fields: {
      muscle: {
        muscleFiberType: {
          type: "enum",
          values: ["slow_twitch_dominant", "fast_twitch_dominant", "mixed"],
          required: false,
          source: "muscle_biopsy",
          validation: "fiber_type_validation"
        },
        muscleMassPercentage: {
          type: "float",
          range: [30, 50],
          unit: "percent",
          required: false,
          source: "dexa_scan",
          validation: "body_composition_check"
        }
      },
      genetics: {
        actn3Genotype: {
          type: "enum",
          values: ["RR", "RX", "XX", "unknown"],
          required: false,
          source: "genetic_test",
          validation: "genetic_correlation_check"
        },
        aceGenotype: {
          type: "enum",
          values: ["II", "ID", "DD", "unknown"],
          required: false,
          source: "genetic_test",
          validation: "genetic_correlation_check"
        }
      }
    }
  },

  level5: {
    name: "정밀 의학 (Precision Medicine)",
    description: "정밀 의학 수준의 데이터",
    required: false,
    updateFrequency: "as_needed",
    confidence: 0.75,
    prerequisite: "level4",
    fields: {
      omics: {
        dnaSequencing: {
          type: "file",
          format: "fastq",
          required: false,
          source: "whole_genome_sequencing",
          validation: "genomic_data_validation"
        },
        proteinBiomarkers: {
          type: "array",
          items: "string",
          required: false,
          source: "proteomics_analysis",
          validation: "biomarker_correlation"
        }
      },
      microbiome: {
        gutMicrobiome: {
          type: "object",
          required: false,
          source: "microbiome_analysis",
          validation: "microbiome_athletic_correlation"
        }
      }
    }
  }
};
```

### 데이터 레벨별 계산 정확도 (Calculation Accuracy by Data Level)

```javascript
/**
 * 데이터 레벨에 따른 계산 정확도 향상
 * 각 레벨은 이전 레벨 대비 특정 비율만큼 정확도 향상
 */

const AccuracyImprovements = {
  level1: {
    baseAccuracy: 0.75,
    description: "기본 인구통계학적 정보만으로는 제한된 정확도"
  },
  level2: {
    improvementOverLevel1: 0.08,
    expectedAccuracy: 0.83,
    description: "운동 경력 정보로 8% 정확도 향상"
  },
  level3: {
    improvementOverLevel2: 0.06,
    expectedAccuracy: 0.89,
    description: "생리학적 마커로 6% 추가 향상"
  },
  level4: {
    improvementOverLevel3: 0.04,
    expectedAccuracy: 0.93,
    description: "고급 생리학 정보로 4% 추가 향상"
  },
  level5: {
    improvementOverLevel4: 0.02,
    expectedAccuracy: 0.95,
    description: "정밀 의학 데이터로 2% 최종 향상"
  }
};
```

---

## 🔍 데이터 품질 관리 체계 (Data Quality Management System)

### 4단계 품질 평가 (4-Stage Quality Assessment)

```javascript
/**
 * 데이터 품질을 4가지 차원에서 종합 평가
 * 완전성(Completeness), 일관성(Consistency), 시계열성(Currency), 정확성(Accuracy)
 */

class DataQualityManager {
  constructor() {
    this.qualityThresholds = {
      completeness: 0.8,
      consistency: 0.9,
      currency: 0.7,
      accuracy: 0.85,
      overall: 0.8
    };

    this.qualityWeights = {
      completeness: 0.3,
      consistency: 0.3,
      currency: 0.2,
      accuracy: 0.2
    };
  }

  /**
   * 종합 데이터 품질 평가
   */
  assessDataQuality(athleteData, dataLevel) {
    const quality = {
      completeness: this.calculateCompleteness(athleteData, dataLevel),
      consistency: this.checkConsistency(athleteData, dataLevel),
      currency: this.evaluateCurrency(athleteData, dataLevel),
      accuracy: this.validateAccuracy(athleteData, dataLevel)
    };

    // 가중치가 적용된 종합 점수
    const weightedScore = Object.keys(quality).reduce((score, dimension) => {
      return score + (quality[dimension] * this.qualityWeights[dimension]);
    }, 0);

    const overallQuality = {
      score: weightedScore,
      level: this.getQualityLevel(weightedScore),
      dimensions: quality,
      recommendations: this.generateQualityRecommendations(quality, dataLevel),
      lastAssessment: new Date().toISOString()
    };

    return overallQuality;
  }

  /**
   * 완전성 평가 - 필수 필드의 채워진 비율
   */
  calculateCompleteness(athleteData, dataLevel) {
    const requiredFields = this.getRequiredFields(dataLevel);
    const filledFields = requiredFields.filter(field => {
      const value = this.getFieldValue(athleteData, field);
      return value !== null && value !== undefined && value !== '';
    });

    return filledFields.length / requiredFields.length;
  }

  /**
   * 일관성 평가 - 데이터 간의 논리적 일관성
   */
  checkConsistency(athleteData, dataLevel) {
    const inconsistencies = [];

    // BMI 계산 및 검증
    if (athleteData.height && athleteData.weight) {
      const bmi = athleteData.weight / Math.pow(athleteData.height / 100, 2);
      if (bmi < 15 || bmi > 40) {
        inconsistencies.push({
          type: "bmi_extreme",
          message: `BMI ${bmi.toFixed(1)}가 정상 범위(15-40)를 벗어납니다`,
          severity: "high"
        });
      }
    }

    // 나이와 운동 경력의 일관성
    if (athleteData.age && athleteData.trainingYears) {
      const maxReasonableYears = athleteData.age - 12;
      if (athleteData.trainingYears > maxReasonableYears) {
        inconsistencies.push({
          type: "experience_age_inconsistency",
          message: `운동 경력이 나이에 비해 비현실적입니다`,
          severity: "critical"
        });
      }
    }

    // VO2max와 성과의 일관성
    if (athleteData.vo2max && athleteData.personalBest5K) {
      const expectedVO2max = this.estimateVO2maxFrom5K(athleteData.personalBest5K);
      const difference = Math.abs(athleteData.vo2max - expectedVO2max);
      if (difference > 8) {
        inconsistencies.push({
          type: "vo2max_performance_inconsistency",
          message: `VO2max와 5K 성과가 일치하지 않습니다`,
          severity: "medium"
        });
      }
    }

    // 일관성 점수 계산 (0-1)
    const maxSeverityScore = 3; // critical=3, high=2, medium=1
    const totalSeverity = inconsistencies.reduce((sum, inc) => {
      const severityScore = { critical: 3, high: 2, medium: 1 }[inc.severity] || 0;
      return sum + severityScore;
    }, 0);

    return Math.max(0, 1 - (totalSeverity / (maxSeverityScore * 3)));
  }

  /**
   * 시계열성 평가 - 데이터의 최신성
   */
  evaluateCurrency(athleteData, dataLevel) {
    const fieldAges = [];
    const now = new Date();

    Object.keys(athleteData).forEach(field => {
      const lastUpdated = this.getLastUpdatedDate(athleteData, field);
      if (lastUpdated) {
        const ageInDays = (now - lastUpdated) / (1000 * 60 * 60 * 24);
        const maxAge = this.getMaxAcceptableAge(field, dataLevel);
        
        if (ageInDays <= maxAge) {
          fieldAges.push(1.0);
        } else {
          const ageRatio = Math.min(ageInDays / maxAge, 3); // 최대 3배까지 허용
          fieldAges.push(Math.max(0, 1 - (ageRatio - 1) / 2));
        }
      }
    });

    return fieldAges.length > 0 ? fieldAges.reduce((a, b) => a + b, 0) / fieldAges.length : 0;
  }

  /**
   * 정확성 평가 - 데이터의 정밀도 및信뢰성
   */
  validateAccuracy(athleteData, dataLevel) {
    const accuracyFactors = [];

    // 데이터 소스의 신뢰도
    const sourceReliability = {
      lab_test: 1.0,
      medical_device: 0.95,
      certified_scale: 0.9,
      gps_device: 0.85,
      user_input: 0.7,
      estimated: 0.5
    };

    Object.keys(athleteData).forEach(field => {
      const source = this.getDataSource(athleteData, field);
      const reliability = sourceReliability[source] || 0.5;
      accuracyFactors.push(reliability);
    });

    // 측정 방법의 정밀도
    const measurementPrecision = this.assessMeasurementPrecision(athleteData);
    accuracyFactors.push(measurementPrecision);

    return accuracyFactors.reduce((a, b) => a + b, 0) / accuracyFactors.length;
  }

  /**
   * 품질 수준 결정
   */
  getQualityLevel(score) {
    if (score >= 0.9) return "excellent";
    if (score >= 0.8) return "good";
    if (score >= 0.7) return "acceptable";
    if (score >= 0.6) return "poor";
    return "unacceptable";
  }

  /**
   * 개선 권장사항 생성
   */
  generateQualityRecommendations(quality, dataLevel) {
    const recommendations = [];

    if (quality.completeness < this.qualityThresholds.completeness) {
      recommendations.push({
        priority: "high",
        type: "completeness",
        message: "필수 데이터가 누락되었습니다",
        actions: [
          "누락된 필수 필드 확인",
          "대체 데이터 소스 검토",
          "추정 방법 적용"
        ]
      });
    }

    if (quality.consistency < this.qualityThresholds.consistency) {
      recommendations.push({
        priority: "medium",
        type: "consistency",
        message: "데이터 간에 논리적 불일치가 있습니다",
        actions: [
          "데이터 검증 규칙 확인",
          "측정 단위 확인",
          "논리적 관계 재검토"
        ]
      });
    }

    if (quality.currency < this.qualityThresholds.currency) {
      recommendations.push({
        priority: "medium",
        type: "currency",
        message: "데이터가 오래되어 신뢰도가 낮습니다",
        actions: [
          "최신 데이터 수집",
          "데이터 수명 주기 검토",
          "자동 업데이트 설정"
        ]
      });
    }

    return recommendations;
  }
}
```

---

## 🔄 데이터 수명 주기 관리 (Data Lifecycle Management)

### 자동 데이터 업데이트 시스템 (Automated Data Refresh System)

```javascript
/**
 * 데이터의 신선도를 유지하기 위한 자동 업데이트 시스템
 * 각 데이터 타입별로 적절한 업데이트 주기 설정
 */

class DataLifecycleManager {
  constructor() {
    this.refreshSchedules = {
      // 실시간 데이터 (매일 업데이트)
      realTime: {
        heartRate: { interval: "daily", maxAge: 1 },
        sleepData: { interval: "daily", maxAge: 1 },
        stepCount: { interval: "daily", maxAge: 1 }
      },
      
      // 단기 데이터 (주간 업데이트)
      shortTerm: {
        weight: { interval: "weekly", maxAge: 7 },
        trainingVolume: { interval: "weekly", maxAge: 7 },
        subjectiveWellness: { interval: "weekly", maxAge: 7 }
      },
      
      // 중기 데이터 (월간 업데이트)
      mediumTerm: {
        vo2max: { interval: "monthly", maxAge: 30 },
        lactateThreshold: { interval: "monthly", maxAge: 30 },
        bodyComposition: { interval: "monthly", maxAge: 30 }
      },
      
      // 장기 데이터 (분기별 업데이트)
      longTerm: {
        muscleFiberType: { interval: "quarterly", maxAge: 90 },
        geneticMarkers: { interval: "yearly", maxAge: 365 }
      }
    };

    this.updateQueue = [];
    this.notificationService = new NotificationService();
  }

  /**
   * 업데이트 필요성 평가
   */
  assessUpdateNeeds(athleteData) {
    const updateNeeds = [];
    const now = new Date();

    Object.keys(this.refreshSchedules).forEach(category => {
      const categoryData = this.refreshSchedules[category];
      
      Object.keys(categoryData).forEach(dataType => {
        const schedule = categoryData[dataType];
        const lastUpdate = this.getLastUpdateTime(athleteData, dataType);
        
        if (lastUpdate) {
          const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
          
          if (daysSinceUpdate > schedule.maxAge) {
            updateNeeds.push({
              dataType,
              category,
              urgency: daysSinceUpdate > schedule.maxAge * 2 ? "high" : "medium",
              daysOverdue: daysSinceUpdate - schedule.maxAge,
              recommendation: this.getUpdateRecommendation(dataType, athleteData)
            });
          }
        }
      });
    });

    return updateNeeds;
  }

  /**
   * 스마트 업데이트 권장사항
   */
  getUpdateRecommendation(dataType, athleteData) {
    const recommendations = {
      vo2max: {
        type: "lab_test",
        message: "정밀 심폐 기능 검사가 필요합니다",
        preparation: "24시간 전부터 고강도 운동 자제, 카페인 섭취 제한",
        duration: "약 2시간 소요",
        cost: "150,000원"
      },
      lactateThreshold: {
        type: "lab_test",
        message: "운동 중 젖산 측정 검사가 필요합니다",
        preparation: "검사 전날 휴식, 검사 당일 가벼운 아침식사",
        duration: "약 1.5시간 소요",
        cost: "120,000원"
      },
      muscleFiberType: {
        type: "medical_procedure",
        message: "근육 생검 검사가 필요합니다",
        preparation: "검사 전 혈액 검사, 수술 동의서 작성",
        duration: "약 30분 (총康复 1주일)",
        cost: "300,000원"
      }
    };

    return recommendations[dataType] || {
      type: "general_update",
      message: `${dataType} 데이터 업데이트가 필요합니다`,
      preparation: "특별한 준비사항 없음",
      duration: "가변적",
      cost: "무료"
    };
  }

  /**
   * 자동 업데이트 스케줄링
   */
  scheduleAutoUpdates(athleteData) {
    const updateNeeds = this.assessUpdateNeeds(athleteData);
    const scheduledUpdates = [];

    updateNeeds.forEach(need => {
      if (need.urgency === "high") {
        // 즉시 업데이트 큐에 추가
        this.updateQueue.push({
          athleteId: athleteData.id,
          dataType: need.dataType,
          priority: "high",
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 내
          estimatedEffort: this.estimateUpdateEffort(need.dataType)
        });

        // 사용자에게 알림
        this.notificationService.sendHighPriorityUpdate(athleteData, need);
      } else {
        // 일반 업데이트는 주간 스케줄에 추가
        scheduledUpdates.push({
          athleteId: athleteData.id,
          dataType: need.dataType,
          suggestedDate: this.suggestUpdateDate(need, athleteData),
          estimatedEffort: this.estimateUpdateEffort(need.dataType)
        });
      }
    });

    return {
      immediateUpdates: this.updateQueue.filter(item => item.priority === "high"),
      scheduledUpdates: scheduledUpdates,
      summary: this.generateUpdateSummary(athleteData, updateNeeds)
    };
  }

  /**
   * 업데이트 난이도 추정
   */
  estimateUpdateEffort(dataType) {
    const effortMatrix = {
      heartRate: { time: 5, cost: 0, complexity: "low" },
      weight: { time: 2, cost: 0, complexity: "low" },
      vo2max: { time: 120, cost: 150000, complexity: "high" },
      lactateThreshold: { time: 90, cost: 120000, complexity: "medium" },
      muscleFiberType: { time: 10080, cost: 300000, complexity: "very_high" }
    };

    return effortMatrix[dataType] || { time: 60, cost: 50000, complexity: "medium" };
  }

  /**
   * 업데이트 요약 생성
   */
  generateUpdateSummary(athleteData, updateNeeds) {
    const totalNeeds = updateNeeds.length;
    const highPriorityCount = updateNeeds.filter(n => n.urgency === "high").length;
    const estimatedCost = updateNeeds.reduce((sum, need) => {
      return sum + this.estimateUpdateEffort(need.dataType).cost;
    }, 0);

    return {
      totalUpdatesRequired: totalNeeds,
      highPriorityUpdates: highPriorityCount,
      estimatedTotalCost: estimatedCost,
      recommendation: this.getUpdateRecommendation(totalNeeds, highPriorityCount),
      nextAssessmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * 업데이트 우선순위 권장사항
   */
  getUpdateRecommendation(totalNeeds, highPriorityCount) {
    if (highPriorityCount > 0) {
      return {
        priority: "immediate",
        message: `${highPriorityCount}개의 고우선순위 업데이트가 필요합니다`,
        action: "즉시 데이터 업데이트를 시작하세요",
        deadline: "24시간 이내"
      };
    } else if (totalNeeds > 3) {
      return {
        priority: "planned",
        message: "여러 데이터 업데이트가 예정되어 있습니다",
        action: "일정을 조정하여 단계적으로 업데이트하세요",
        deadline: "2주 이내"
      };
    } else {
      return {
        priority: "routine",
        message: "정기적인 데이터 업데이트가 필요합니다",
        action: "평소처럼 다음 검토 시점에 업데이트하세요",
        deadline: "1개월 이내"
      };
    }
  }
}
```

---

## 📈 데이터 통합 성과 측정 (Data Integration Performance Measurement)

### 통합 효과성 지표 (Integration Effectiveness Metrics)

```javascript
/**
 * 개별 선수 데이터 통합의 효과성을 측정하는 종합 지표
 * 정확도 향상, 만족도, 시스템 성과를 종합적으로 평가
 */

class IntegrationPerformanceMetrics {
  constructor() {
    this.baselineMetrics = {
      predictionAccuracy: 0.75,  // 기본 정확도
      userSatisfaction: 3.5,   // 5점 만점
      systemReliability: 0.95,     // 시스템 신뢰도
      dataUtilization: 0.6        // 데이터 활용률
    };

    this.improvementTargets = {
      level1: { accuracy: 0.02, satisfaction: 0.2, reliability: 0.01 },
      level2: { accuracy: 0.08, satisfaction: 0.3, reliability: 0.02 },
      level3: { accuracy: 0.14, satisfaction: 0.4, reliability: 0.03 },
      level4: { accuracy: 0.18, satisfaction: 0.45, reliability: 0.04 },
      level5: { accuracy: 0.20, satisfaction: 0.5, reliability: 0.05 }
    };
  }

  /**
   * 데이터 레벨별 성과 측정
   */
  measurePerformance(athleteId, dataLevel, timeFrame = 90) {
    const performance = {
      athleteId,
      dataLevel,
      measurementPeriod: timeFrame,
      metrics: {},
      improvements: {},
      roi: {},
      timestamp: new Date().toISOString()
    };

    // 기본 성과 측정
    performance.metrics = this.collectPerformanceMetrics(athleteId, timeFrame);
    
    // 개선도 계산
    performance.improvements = this.calculateImprovements(performance.metrics, dataLevel);
    
    // 투자 대비 수익률(ROI) 계산
    performance.roi = this.calculateROI(performance.improvements, dataLevel);

    return performance;
  }

  /**
   * 실제 성과 지표 수집
   */
  collectPerformanceMetrics(athleteId, timeFrame) {
    const metrics = {};

    // 예측 정확도
    metrics.predictionAccuracy = this.calculatePredictionAccuracy(athleteId, timeFrame);
    
    // 사용자 만족도
    metrics.userSatisfaction = this.getUserSatisfactionScore(athleteId, timeFrame);
    
    // 데이터 활용률
    metrics.dataUtilization = this.calculateDataUtilization(athleteId);
    
    // 시스템 신뢰도
    metrics.systemReliability = this.calculateSystemReliability(athleteId, timeFrame);
    
    // 계산 속도
    metrics.calculationSpeed = this.measureCalculationSpeed(athleteId);
    
    // 개인화 효과
    metrics.personalizationEffect = this.measurePersonalizationEffect(athleteId, timeFrame);

    return metrics;
  }

  /**
   * 예측 정확도 계산
   */
  calculatePredictionAccuracy(athleteId, timeFrame) {
    const predictions = this.getPredictions(athleteId, timeFrame);
    const actualResults = this.getActualResults(athleteId, timeFrame);
    
    let correctPredictions = 0;
    let totalPredictions = 0;

    predictions.forEach((prediction, index) => {
      const actual = actualResults[index];
      if (actual && prediction) {
        const accuracy = this.calculateAccuracy(prediction, actual);
        if (accuracy > 0.8) correctPredictions++;
        totalPredictions++;
      }
    });

    return totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  }

  /**
   * 개선도 계산
   */
  calculateImprovements(currentMetrics, dataLevel) {
    const improvements = {};
    const targets = this.improvementTargets[dataLevel];

    Object.keys(targets).forEach(metric => {
      const baseline = this.baselineMetrics[metric];
      const current = currentMetrics[metric];
      const target = targets[metric];
      
      improvements[metric] = {
        actualImprovement: current - baseline,
        targetImprovement: target,
        achievementRate: Math.min((current - baseline) / target, 1.0),
        gap: Math.max(0, target - (current - baseline))
      };
    });

    return improvements;
  }

  /**
   * 투자 대비 수익률(ROI) 계산
   */
  calculateROI(improvements, dataLevel) {
    const dataCollectionCosts = {
      level1: { cost: 0, effort: 1 },      // 무료, 노력 적음
      level2: { cost: 50000, effort: 3 },   // 소액 비용, 노력 중간
      level3: { cost: 200000, effort: 5 },  // 실험실 비용, 노력 많음
      level4: { cost: 400000, effort: 7 }, // 고급 검사 비용, 노력 많음
      level5: { cost: 1000000, effort: 9 } // 정밀 의학 비용, 노력 매우 많음
    };

    const costs = dataCollectionCosts[dataLevel];
    const totalBenefits = this.calculateTotalBenefits(improvements);
    
    const roi = (totalBenefits - costs.cost) / costs.cost;
    const paybackPeriod = costs.cost / Math.max(totalBenefits / 12, 1); // 월 단위

    return {
      roi: Math.max(-1, Math.min(roi, 5)), // -100% ~ 500% 범위
      paybackPeriodMonths: paybackPeriod,
      costBenefitRatio: totalBenefits / costs.cost,
      effortRewardRatio: this.calculateEffortRewardRatio(improvements, costs.effort),
      recommendation: this.getROIRecommendation(roi, paybackPeriod)
    };
  }

  /**
   ROI 기반 권장사항
   */
  getROIRecommendation(roi, paybackPeriod) {
    if (roi > 2.0 && paybackPeriod < 6) {
      return {
        recommendation: "highly_recommended",
        message: "매우 높은 수익률과 빠른 회수 기간",
        action: "즉시 해당 데이터 레벨로 업그레이드"
      };
    } else if (roi > 0.5 && paybackPeriod < 12) {
      return {
        recommendation: "recommended",
        message: "좋은 수익률과 적절한 회수 기간",
        action: "계획적으로 데이터 레벨 업그레이드"
      };
    } else if (roi > 0) {
      return {
        recommendation: "consider",
        message: "양호한 수익률이나 긴 회수 기간",
        action: "재정 상황을 고려하여 단계적 업그레이드"
      };
    } else {
      return {
        recommendation: "not_recommended",
        message: "비용이 수익을 초과합니다",
        action: "더 낮은 레벨에서 성과 향상 시도"
      };
    }
  }
}
```

---

## 🔧 확장 가능한 통합 아키텍처 (Extensible Integration Architecture)

### 플러그인 기반 데이터 소스 통합 (Plugin-based Data Source Integration)

```javascript
/**
 * 새로운 데이터 소스를 플러그인 방식으로 쉽게 추가
 * 각 플러그인은 표준화된 인터페이스를 구현
 */

class DataSourcePluginInterface {
  constructor() {
    this.name = this.constructor.name;
    this.version = "1.0.0";
    this.supportedDataTypes = [];
    this.authenticationRequired = false;
    this.rateLimit = {
      requestsPerMinute: 60,
      requestsPerHour: 1000
    };
  }

  /**
   * 플러그인 초기화
   */
  async initialize(config) {
    this.config = config;
    this.rateLimiter = new RateLimiter(this.rateLimit);
    
    if (this.authenticationRequired) {
      this.authenticator = new Authenticator(config.auth);
      await this.authenticator.authenticate();
    }
    
    console.log(`Data source plugin initialized: ${this.name} v${this.version}`);
  }

  /**
   * 데이터 가져오기
   */
  async fetchData(dataRequest) {
    await this.rateLimiter.waitForToken();
    
    try {
      const rawData = await this.fetchRawData(dataRequest);
      const processedData = await this.processData(rawData, dataRequest);
      const validatedData = await this.validateData(processedData);
      
      return {
        success: true,
        data: validatedData,
        metadata: this.generateMetadata(rawData, processedData),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallbackData: await this.getFallbackData(dataRequest)
      };
    }
  }

  /**
   * 데이터 처리 (각 플러그인별 구현)
   */
  async processData(rawData, dataRequest) {
    throw new Error("processData() must be implemented by plugin");
  }

  /**
   * 데이터 검증
   */
  async validateData(data) {
    const validator = new DataValidator();
    return await validator.validate(data, this.getValidationRules());
  }

  /**
   * 플러그인 정보
   */
  getPluginInfo() {
    return {
      name: this.name,
      version: this.version,
      supportedDataTypes: this.supportedDataTypes,
      authenticationRequired: this.authenticationRequired,
      rateLimit: this.rateLimit,
      healthStatus: this.getHealthStatus()
    };
  }
}

// Garmin Connect 플러그인 예시
class GarminConnectPlugin extends DataSourcePluginInterface {
  constructor() {
    super();
    this.name = "GarminConnect";
    this.supportedDataTypes = ["heartRate", "steps", "sleep", "activities", "bodyComposition"];
    this.authenticationRequired = true;
  }

  async initialize(config) {
    await super.initialize(config);
    this.apiClient = new GarminAPIClient(config.apiKey);
  }

  async fetchRawData(dataRequest) {
    const { dataType, dateRange, athleteId } = dataRequest;
    
    switch (dataType) {
      case "heartRate":
        return await this.apiClient.getHeartRate(dateRange);
      case "activities":
        return await this.apiClient.getActivities(dateRange);
      case "bodyComposition":
        return await this.apiClient.getBodyComposition(dateRange);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  async processData(rawData, dataRequest) {
    const processedData = [];
    
    rawData.forEach(item => {
      processedData.push({
        timestamp: new Date(item.startTime),
        value: this.extractValue(item, dataRequest.dataType),
        unit: this.getUnit(dataRequest.dataType),
        source: "garmin_connect",
        confidence: this.assessConfidence(item)
      });
    });

    return processedData;
  }

  extractValue(item, dataType) {
    const valueMap = {
      heartRate: item.averageHR,
      steps: item.steps,
      sleep: item.sleepHours,
      activities: item.distance
    };
    
    return valueMap[dataType];
  }
}

// Apple Health 플러그인 예시
class AppleHealthPlugin extends DataSourcePluginInterface {
  constructor() {
    super();
    this.name = "AppleHealth";
    this.supportedDataTypes = ["heartRate", "steps", "sleep", "weight", "height"];
    this.authenticationRequired = false; // 기기 내 데이터
  }

  async initialize(config) {
    await super.initialize(config);
    this.healthKit = new HealthKitAPI();
    await this.healthKit.requestPermissions(this.supportedDataTypes);
  }

  async fetchRawData(dataRequest) {
    const { dataType, dateRange } = dataRequest;
    
    return await this.healthKit.queryData(dataType, {
      startDate: dateRange.start,
      endDate: dateRange.end
    });
  }

  async processData(rawData, dataRequest) {
    return rawData.map(item => ({
      timestamp: new Date(item.date),
      value: item.value,
      unit: item.unit,
      source: "apple_health",
      confidence: item.metadata?.wasUserEntered ? 0.7 : 0.9
    }));
  }
}
```

### 데이터 통합 관리자 (Data Integration Manager)

```javascript
/**
 * 여러 데이터 소스를 통합 관리하고 최적의 데이터 선택
 */

class DataIntegrationManager {
  constructor() {
    this.plugins = new Map();
    this.dataQualityManager = new DataQualityManager();
    this.conflictResolver = new DataConflictResolver();
    this.cacheManager = new CacheManager();
  }

  /**
   * 플러그인 등록
   */
  registerPlugin(pluginClass, config = {}) {
    const plugin = new pluginClass();
    
    try {
      plugin.initialize(config);
      this.plugins.set(plugin.name, {
        instance: plugin,
        config,
        status: "registered",
        lastHealthCheck: new Date()
      });
      
      console.log(`Data source plugin registered: ${plugin.name}`);
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  /**
   * 통합 데이터 가져오기
   */
  async fetchIntegratedData(athleteId, dataRequirements) {
    const integratedData = {};
    const dataSources = {};
    const qualityScores = {};

    // 각 데이터 요구사항에 대해
    for (const requirement of dataRequirements) {
      const { dataType, priority, dateRange, qualityThreshold } = requirement;
      
      // 사용 가능한 플러그인 찾기
      const availablePlugins = this.findPluginsForDataType(dataType);
      
      if (availablePlugins.length === 0) {
        console.warn(`No plugins available for data type: ${dataType}`);
        continue;
      }

      // 각 플러그인에서 데이터 가져오기
      const dataCandidates = [];
      
      for (const pluginInfo of availablePlugins) {
        try {
          const result = await pluginInfo.instance.fetchData({
            dataType,
            dateRange,
            athleteId
          });

          if (result.success) {
            dataCandidates.push({
              plugin: pluginInfo.instance.name,
              data: result.data,
              quality: this.assessDataQuality(result.data),
              timestamp: result.timestamp
            });
          }
        } catch (error) {
          console.error(`Plugin ${pluginInfo.instance.name} failed to fetch data:`, error);
        }
      }

      // 최고 품질의 데이터 선택
      const bestData = this.selectBestData(dataCandidates, qualityThreshold);
      
      if (bestData) {
        integratedData[dataType] = bestData.data;
        dataSources[dataType] = bestData.plugin;
        qualityScores[dataType] = bestData.quality;
      }
    }

    return {
      athleteId,
      data: integratedData,
      sources: dataSources,
      quality: qualityScores,
      integrationTimestamp: new Date().toISOString(),
      summary: this.generateIntegrationSummary(dataSources, qualityScores)
    };
  }

  /**
   * 최고의 데이터 선택
   */
  selectBestData(dataCandidates, qualityThreshold) {
    if (dataCandidates.length === 0) return null;
    
    // 품질 점수로 정렬
    const sortedCandidates = dataCandidates.sort((a, b) => {
      return b.quality.overallScore - a.quality.overallScore;
    });

    const bestCandidate = sortedCandidates[0];
    
    // 품질 임계값 확인
    if (bestCandidate.quality.overallScore >= qualityThreshold) {
      return bestCandidate;
    }

    // 품질이 낮으면 여러 소스의 데이터 융합 고려
    if (sortedCandidates.length > 1) {
      return this.fuseMultipleDataSources(sortedCandidates);
    }

    return bestCandidate;
  }

  /**
   * 데이터 품질 평가
   */
  assessDataQuality(data) {
    return this.dataQualityManager.assessDataQuality(data, 'integrated');
  }

  /**
   * 데이터 소스 상태 모니터링
   */
  async monitorDataSources() {
    const monitoringResults = [];

    for (const [name, pluginInfo] of this.plugins) {
      try {
        const healthStatus = await pluginInfo.instance.getHealthStatus();
        
        monitoringResults.push({
          pluginName: name,
          status: pluginInfo.status,
          health: healthStatus,
          lastHealthCheck: pluginInfo.lastHealthCheck,
          recommendation: this.generateHealthRecommendation(healthStatus)
        });

        // 마지막 건강 검查 시간 업데이트
        pluginInfo.lastHealthCheck = new Date();
      } catch (error) {
        console.error(`Health check failed for plugin ${name}:`, error);
        
        monitoringResults.push({
          pluginName: name,
          status: "error",
          error: error.message,
          recommendation: "플러그인 재시작 또는 설정 확인 필요"
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      totalPlugins: this.plugins.size,
      healthyPlugins: monitoringResults.filter(r => r.health?.status === "healthy").length,
      results: monitoringResults
    };
  }
}
```

---

## 🎯 결론 및 구현 체크리스트 (Conclusion & Implementation Checklist)

### 데이터 통합 구현 단계 (Data Integration Implementation Phases)

```markdown
## Phase 1: 기본 통합 (2주)
- [ ] Level 1 데이터 구조 설계
- [ ] 기본 품질 검증 시스템 구현
- [ ] 단순 데이터 소스 연동 (CSV, 수동 입력)
- [ ] 기본적인 에러 처리

## Phase 2: 고급 통합 (4주)
- [ ] Level 2-3 데이터 구조 확장
- [ ] 다중 데이터 소스 플러그인 시스템
- [ ] 고급 데이터 품질 관리
- [ ] 자동 데이터 동기화

## Phase 3: 지능형 통합 (6주)
- [ ] Level 4-5 데이터 구조
- [ ] 머신러닝 기반 데이터 품질 평가
- [ ] 스마트 데이터 소스 선택
- [ ] 예측 기반 데이터 업데이트

## Phase 4: 최적화 (2주)
- [ ] 성능 최적화 및 캐싱
- [ ] 실시간 데이터 처리
- [ ] 종합 모니터링 대시보드
- [ ] 문서화 및 교육
```

### 성공 기준 (Success Criteria)

```javascript
const SuccessMetrics = {
  dataQuality: {
    completeness: ">= 0.8",
    consistency: ">= 0.9", 
    accuracy: ">= 0.85",
    target: "모든 품질 지표가 임계값 이상"
  },
  
  integrationEfficiency: {
    processingTime: "< 5초",
    successRate: ">= 0.95",
    errorRecovery: ">= 0.9",
    target: "빠르고 안정적인 통합"
  },
  
  userAdoption: {
    level1Completion: ">= 0.95",
    level2Completion: ">= 0.7",
    level3Completion: ">= 0.4",
    satisfactionScore: ">= 4.0",
    target: "높은 참여도와 만족도"
  },
  
  systemPerformance: {
    uptime: ">= 0.99",
    responseTime: "< 2초",
    concurrentUsers: ">= 1000",
    target: "기업 수준의 안정성"
  }
};
```

### 지속적인 개선 프로세스 (Continuous Improvement Process)

```javascript
/**
 * 데이터 통합 시스템의 지속적인 개선을 위한 프로세스
 * 정기적인 검토, 피드백 수집, 시스템 업그레이드
 */

class ContinuousImprovementProcess {
  constructor() {
    this.reviewSchedule = {
      weekly: ["data_quality_review", "error_analysis"],
      monthly: ["user_feedback_analysis", "performance_optimization"],
      quarterly: ["architecture_review", "technology_update"],
      annually: ["strategic_planning", "major_upgrade_planning"]
    };
    
    this.improvementMetrics = {
      dataQualityTrend: [],
      userSatisfactionTrend: [],
      systemPerformanceTrend: [],
      costEfficiencyTrend: []
    };
  }

  /**
   * 주간 개선 활동
   */
  conductWeeklyReview() {
    const review = {
      dataQuality: this.analyzeDataQualityTrend(),
      errors: this.analyzeErrorPatterns(),
      userIssues: this.identifyUserIssues(),
      quickWins: this.identifyQuickWins()
    };

    return this.generateWeeklyActionPlan(review);
  }

  /**
   * 월간 개선 활동
   */
  conductMonthlyReview() {
    const userFeedback = this.collectUserFeedback();
    const performanceAnalysis = this.analyzeSystemPerformance();
    const costAnalysis = this.analyzeCostEfficiency();
    
    return {
      userFeedback,
      performanceAnalysis,
      costAnalysis,
      improvementOpportunities: this.identifyImprovementOpportunities()
    };
  }

  /**
   * 분기별 전략적 검토
   */
  conductQuarterlyReview() {
    const architectureAssessment = this.assessArchitecture();
    const technologyScan = this.scanNewTechnologies();
    const competitiveAnalysis = this.analyzeCompetitors();
    
    return {
      architectureAssessment,
      technologyScan,
      competitiveAnalysis,
      strategicRecommendations: this.generateStrategicRecommendations()
    };
  }
}
```

---

## 📞 지원 및 문의 (Support & Contact)

### 기술 지원 (Technical Support)
- 데이터 통합 문의: integration@athletetime.com
- 품질 관련 문의: quality@athletetime.com  
- 기술 지원: tech-support@athletetime.com

### 교육 및 교재 (Education & Training)
- 온라인 교육: https://academy.athletetime.com
- 기술 문서: https://docs.athletetime.com
- 커뮤니티: https://community.athletetime.com

---

**⚠️ 중요**: 이 가이드라인은 **핵심 계산 알고리즘의 정합성**을 유지하면서 **개별 선수 데이터를 효과적으로 통합**하기 위한 표준입니다. 모든 데이터 통합 활동은 이 문서의 원칙을 따라야 하며, 상위 등급 지침은 절대 변경될 수 없습니다.

**이 문서는 지속적으로 업데이트되며, 모든 변경사항은 버전 관리 시스템에 기록됩니다.**

**Version 1.0 - 개별 선수 데이터 통합 가이드라인 완성**