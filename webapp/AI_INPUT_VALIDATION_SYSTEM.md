# AI 분석 도구 입력값 검증 시스템
## Input Validation System for AI Analysis Tools - Version 1.0

---

## 🛡️ 입력값 검증 아키텍처 (Input Validation Architecture)

### 1. 다층 검증 시스템 (Multi-layer Validation System)

```javascript
/**
 * 4단계 검증 프로세스
 * Layer 1: 문법적 검증 (Syntactic) → Layer 2:预料적 검증 (Semantic) → 
 * Layer 3: 논리적 검증 (Logical) → Layer 4: 맥락적 검증 (Contextual)
 */

class MultiLayerValidationSystem {
  constructor() {
    this.layers = [
      new SyntacticValidationLayer(),
      new SemanticValidationLayer(), 
      new LogicalValidationLayer(),
      new ContextualValidationLayer()
    ];
    
    this.errorRecovery = new ErrorRecoveryEngine();
    this.confidenceScoring = new ConfidenceScoringEngine();
  }

  /**
   * 전체 검증 프로세스
   */
  async validate(data, context = {}) {
    const validationResult = {
      isValid: true,
      confidence: 1.0,
      errors: [],
      warnings: [],
      suggestions: [],
      corrections: {},
      layerResults: []
    };

    // 각 레이어 순차적 실행
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const layerResult = await layer.validate(data, context);
      
      validationResult.layerResults.push({
        layer: layer.constructor.name,
        result: layerResult
      });

      // 치명적 오류 발생 시 즉시 중단
      if (layerResult.isCritical) {
        validationResult.isValid = false;
        validationResult.errors.push(...layerResult.errors);
        
        // 오류 복구 시도
        const recovery = await this.errorRecovery.attemptRecovery(
          layerResult.errors,
          data,
          context
        );
        
        if (recovery.success) {
          validationResult.corrections = recovery.corrections;
          validationResult.confidence = recovery.confidence;
        }
        
        break;
      }

      // 경고는 계속 진행 but 기록
      if (layerResult.warnings.length > 0) {
        validationResult.warnings.push(...layerResult.warnings);
        validationResult.confidence *= 0.9; // 신뢰도 하락
      }

      // 제안사항 기록
      if (layerResult.suggestions.length > 0) {
        validationResult.suggestions.push(...layerResult.suggestions);
      }
    }

    // 최종 신뢰도 계산
    validationResult.confidence = this.confidenceScoring.calculate(
      validationResult,
      context
    );

    return validationResult;
  }
}
```

### 1.1 문법적 검증 레이어 (Syntactic Validation Layer)
```javascript
/**
 * 데이터 타입, 형식, 범위 등 기본적인 문법적 검증
 */
class SyntacticValidationLayer {
  
  async validate(data, context) {
    const result = {
      isValid: true,
      isCritical: false,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 1. 데이터 타입 검증
    const typeValidation = this.validateDataTypes(data);
    if (!typeValidation.isValid) {
      result.isValid = false;
      result.errors.push(...typeValidation.errors);
    }

    // 2. 필수 필드 검증
    const requiredValidation = this.validateRequiredFields(data);
    if (!requiredValidation.isValid) {
      result.isValid = false;
      result.isCritical = true; // 필수 필드 누락은 치명적
      result.errors.push(...requiredValidation.errors);
    }

    // 3. 형식 검증 (패턴 매칭)
    const formatValidation = this.validateFormats(data);
    if (!formatValidation.isValid) {
      result.isValid = false;
      result.errors.push(...formatValidation.errors);
    }

    // 4. 범위 검증
    const rangeValidation = this.validateRanges(data);
    if (!rangeValidation.isValid) {
      result.isValid = false;
      result.warnings.push(...rangeValidation.warnings);
      result.errors.push(...rangeValidation.errors);
    }

    return result;
  }

  /**
   * 데이터 타입 검증
   */
  validateDataTypes(data) {
    const errors = [];
    const typeRules = this.getTypeRules();

    Object.keys(data).forEach(field => {
      const value = data[field];
      const rule = typeRules[field];
      
      if (!rule) return; // 규칙이 없는 필드는 스킵

      const isValidType = this.checkType(value, rule.type);
      if (!isValidType) {
        errors.push({
          field,
          type: 'type_mismatch',
          message: `${field}는 ${rule.type} 타입이어야 합니다. 현재: ${typeof value}`,
          provided: value,
          expected: rule.type
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 타입 규칙 정의
   */
  getTypeRules() {
    return {
      age: { type: 'number', integer: true },
      weight: { type: 'number', min: 0 },
      height: { type: 'number', min: 0 },
      gender: { type: 'string', enum: ['male', 'female', 'other'] },
      raceTime: { type: 'string', pattern: /^\d{1,2}:\d{2}:\d{2}$/ },
      vo2max: { type: 'number', min: 0 },
      trainingYears: { type: 'number', integer: true, min: 0 }
    };
  }

  /**
   * 타입 확인 헬퍼
   */
  checkType(value, expectedType) {
    switch (expectedType) {
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'string':
        return typeof value === 'string';
      case 'integer':
        return Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      default:
        return typeof value === expectedType;
    }
  }
}
```

### 1.2 의미적 검증 레이어 (Semantic Validation Layer)
```javascript
/**
 * 데이터의 의미적 정합성 검증
 * 범위, 단위, 생리학적 타당성 등
 */
class SemanticValidationLayer {
  
  async validate(data, context) {
    const result = {
      isValid: true,
      isCritical: false,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 1. 생리학적 범위 검증
    const physiologicalValidation = this.validatePhysiologicalRanges(data);
    if (!physiologicalValidation.isValid) {
      result.warnings.push(...physiologicalValidation.warnings);
      result.suggestions.push(...physiologicalValidation.suggestions);
    }

    // 2. 단위 및 측정 체계 검증
    const unitValidation = this.validateUnits(data);
    if (!unitValidation.isValid) {
      result.errors.push(...unitValidation.errors);
      result.isValid = false;
    }

    // 3. 통계적 이상치 검출
    const outlierDetection = this.detectStatisticalOutliers(data);
    if (outlierDetection.hasOutliers) {
      result.warnings.push(...outlierDetection.warnings);
      result.suggestions.push(...outlierDetection.suggestions);
    }

    // 4. 나이-성능 일관성 검증
    const ageConsistency = this.validateAgePerformanceConsistency(data);
    if (!ageConsistency.isValid) {
      result.warnings.push(...ageConsistency.warnings);
    }

    return result;
  }

  /**
   * 생리학적 범위 검증
   */
  validatePhysiologicalRanges(data) {
    const warnings = [];
    const suggestions = [];

    // BMI 계산 및 검증
    if (data.height && data.weight) {
      const bmi = data.weight / Math.pow(data.height / 100, 2);
      
      if (bmi < 15 || bmi > 40) {
        warnings.push({
          field: ["height", "weight"],
          type: 'physiological_extreme',
          message: `BMI가 ${bmi.toFixed(1)}로 정상 범위(15-40)를 벗어납니다`,
          severity: 'high',
          bmi: bmi
        });

        suggestions.push({
          type: 'double_check',
          message: "신장과 체중을 다시 확인해주세요",
          fields: ["height", "weight"]
        });
      }
    }

    // VO2max 범위 검증
    if (data.vo2max) {
      const ageAdjustedRange = this.getAgeAdjustedVO2MaxRange(data.age, data.gender);
      if (data.vo2max < ageAdjustedRange.min || data.vo2max > ageAdjustedRange.max) {
        warnings.push({
          field: 'vo2max',
          type: 'physiological_extreme',
          message: `VO2max ${data.vo2max}는 ${data.age}세 ${data.gender}의 정상 범위(${ageAdjustedRange.min}-${ageAdjustedRange.max})를 벗어납니다`,
          severity: 'medium'
        });
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions
    };
  }

  /**
   * 통계적 이상치 검출 (Modified Thompson Tau Test)
   */
  detectStatisticalOutliers(data) {
    const outliers = [];
    const warnings = [];
    const suggestions = []

    // 인구통계학적 데이터와 비교
    const populationStats = this.getPopulationStatistics();
    
    Object.keys(data).forEach(field => {
      const value = data[field];
      const stats = populationStats[field];
      
      if (!stats) return;

      // Z-score 계산
      const zScore = Math.abs((value - stats.mean) / stats.stdDev);
      
      if (zScore > 3) { // 3시그마 이상
        outliers.push({
          field,
          value,
          zScore,
          probability: this.getOutlierProbability(zScore)
        });

        warnings.push({
          field,
          type: 'statistical_outlier',
          message: `${field}값이 인구평균으로부터 ${zScore.toFixed(2)} 표준편차 벗어남`,
          severity: zScore > 4 ? 'high' : 'medium'
        });
      }
    });

    return {
      hasOutliers: outliers.length > 0,
      outliers,
      warnings,
      suggestions
    };
  }

  /**
   * 나이-성능 일관성 검증
   */
  validateAgePerformanceConsistency(data) {
    const warnings = [];

    // 나이와 경기 성과의 합리성
    if (data.age && data.raceTime) {
      const expectedRange = this.getAgePerformanceRange(data.age, data.raceType);
      const actualPerformance = this.parseRaceTime(data.raceTime);
      
      if (actualPerformance < expectedRange.elite || 
          actualPerformance > expectedRange.recreational) {
        warnings.push({
          field: ["age", "raceTime"],
          type: 'age_performance_inconsistency',
          message: `${data.age}세의 ${data.raceType} 경기 기록이 예상 범위를 벗어납니다`,
          expected: expectedRange,
          actual: actualPerformance,
          severity: 'medium'
        });
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }
}
```

### 1.3 논리적 검증 레이어 (Logical Validation Layer)
```javascript
/**
 * 데이터 간의 논리적 관계 검증
 * 상호 의존성, 시간적 순서, 인과관계 등
 */
class LogicalValidationLayer {
  
  async validate(data, context) {
    const result = {
      isValid: true,
      isCritical: false,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 1. 상호 의존성 검증
    const dependencyValidation = this.validateDependencies(data);
    if (!dependencyValidation.isValid) {
      result.isValid = false;
      result.errors.push(...dependencyValidation.errors);
    }

    // 2. 시간적 일관성 검증
    const temporalValidation = this.validateTemporalConsistency(data);
    if (!temporalValidation.isValid) {
      result.warnings.push(...temporalValidation.warnings);
    }

    // 3. 인과관계 검증
    const causalValidation = this.validateCausalRelationships(data);
    if (!causalValidation.isValid) {
      result.warnings.push(...causalValidation.warnings);
      result.suggestions.push(...causalValidation.suggestions);
    }

    // 4. 역사적 일관성 검증
    const historicalValidation = await this.validateHistoricalConsistency(data, context);
    if (!historicalValidation.isValid) {
      result.warnings.push(...historicalValidation.warnings);
    }

    return result;
  }

  /**
   * 상호 의존성 검증
   */
  validateDependencies(data) {
    const errors = [];

    // 훈련 경력 vs 나이
    if (data.trainingYears && data.age) {
      const maxReasonableYears = data.age - 12; // 12세 이전 훈련 시작 가정
      if (data.trainingYears > maxReasonableYears) {
        errors.push({
          fields: ["trainingYears", "age"],
          type: 'dependency_violation',
          message: `훈련 경력(${data.trainingYears}년)이 나이에 비해 비현실적으로 깁니다`,
          constraint: `trainingYears <= age - 12`,
          severity: 'high'
        });
      }
    }

    // VO2max vs 경기 성과
    if (data.vo2max && data.raceTime && data.raceDistance) {
      const expectedVO2max = this.estimateVO2maxFromPerformance(
        data.raceTime, 
        data.raceDistance
      );
      
      const difference = Math.abs(data.vo2max - expectedVO2max);
      if (difference > 8) { // 8 ml/kg/min 이상 차이
        errors.push({
          fields: ["vo2max", "raceTime", "raceDistance"],
          type: 'performance_inconsistency',
          message: `VO2max(${data.vo2max})와 경기 성과가 불일치합니다`,
          expected: expectedVO2max,
          actual: data.vo2max,
          difference: difference,
          severity: 'medium'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 시간적 일관성 검증
   */
  validateTemporalConsistency(data) {
    const warnings = [];

    // 훈련 경력 vs 최근 경기
    if (data.trainingYears && data.recentRaceDate) {
      const trainingStartYear = new Date().getFullYear() - data.trainingYears;
      const raceYear = new Date(data.recentRaceDate).getFullYear();
      
      if (raceYear < trainingStartYear) {
        warnings.push({
          fields: ["trainingYears", "recentRaceDate"],
          type: 'temporal_inconsistency',
          message: `최근 경기가 훈련 시작 전에 발생했습니다`,
          trainingStart: trainingStartYear,
          raceYear: raceYear,
          severity: 'low'
        });
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * 역사적 일관성 검증
   */
  async validateHistoricalConsistency(data, context) {
    const warnings = [];

    // 이전 기록과의 비교 (context.historicalData 필요)
    if (context.historicalData && data.raceTime) {
      const currentPerformance = this.parseRaceTime(data.raceTime);
      const previousPerformances = context.historicalData.map(this.parseRaceTime);
      
      // 성과 변화 추세 분석
      const trend = this.calculatePerformanceTrend(previousPerformances);
      const expectedRange = this.predictExpectedPerformance(trend);
      
      if (currentPerformance < expectedRange.min || currentPerformance > expectedRange.max) {
        warnings.push({
          type: 'unexpected_performance_change',
          message: `예상된 성과 범위를 벗어났습니다`,
          expected: expectedRange,
          actual: currentPerformance,
          trend: trend,
          severity: 'medium'
        });
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }
}
```

### 1.4 맥락적 검증 레이어 (Contextual Validation Layer)
```javascript
/**
 * 더 넓은 맥락에서의 데이터 타당성 검증
 * 계절성, 지역적 특성, 문화적 맥락 등
 */
class ContextualValidationLayer {
  
  async validate(data, context) {
    const result = {
      isValid: true,
      isCritical: false,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 1. 계절성 검증
    const seasonalValidation = this.validateSeasonality(data, context);
    if (!seasonalValidation.isValid) {
      result.warnings.push(...seasonalValidation.warnings);
    }

    // 2. 지역적 특성 검증
    const regionalValidation = this.validateRegionalCharacteristics(data, context);
    if (!regionalValidation.isValid) {
      result.warnings.push(...regionalValidation.warnings);
    }

    // 3. 문화적 맥락 검증
    const culturalValidation = this.validateCulturalContext(data, context);
    if (!culturalValidation.isValid) {
      result.suggestions.push(...culturalValidation.suggestions);
    }

    // 4. 개인적 맥락 검증
    const personalValidation = await this.validatePersonalContext(data, context);
    if (!personalValidation.isValid) {
      result.suggestions.push(...personalValidation.suggestions);
    }

    return result;
  }

  /**
   * 계절성 검증
   */
  validateSeasonality(data, context) {
    const warnings = [];
    const currentMonth = new Date().getMonth() + 1;
    
    // 계절별 VO2max 변화 (일반적으로 여름이 낮음)
    if (data.vo2max && context.seasonalData) {
      const seasonalAverage = context.seasonalData[currentMonth]?.vo2max;
      if (seasonalAverage) {
        const difference = Math.abs(data.vo2max - seasonalAverage) / seasonalAverage;
        if (difference > 0.15) { // 15% 이상 차이
          warnings.push({
            type: 'seasonal_inconsistency',
            message: `계절적 평균과 VO2max가 크게 차이납니다`,
            current: data.vo2max,
            seasonalAverage: seasonalAverage,
            difference: difference * 100,
            season: this.getSeasonName(currentMonth),
            severity: 'low'
          });
        }
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * 개인적 맥락 검증
   */
  async validatePersonalContext(data, context) {
    const suggestions = [];

    // 개인의 역사적 패턴과 비교
    if (context.personalHistory) {
      const personalPattern = context.personalHistory.pattern;
      const currentData = this.extractPattern(data);
      
      const similarity = this.calculatePatternSimilarity(personalPattern, currentData);
      if (similarity < 0.7) { // 70% 이하 유사성
        suggestions.push({
          type: 'personal_pattern_deviation',
          message: `평소의 패턴과 다른 변화가 감지되었습니다`,
          similarity: similarity,
          usualPattern: personalPattern,
          currentPattern: currentData,
          action: "변화의 원인을 확인해보세요 (수면, 스트레스, 영양 등)"
        });
      }
    }

    return {
      isValid: suggestions.length === 0,
      suggestions
    };
  }

  /**
   * 계절 이름 반환
   */
  getSeasonName(month) {
    const seasons = {
      12: '겨울', 1: '겨울', 2: '겨울',
      3: '봄', 4: '봄', 5: '봄',
      6: '여름', 7: '여름', 8: '여름',
      9: '가을', 10: '가을', 11: '가을'
    };
    return seasons[month];
  }
}
```

---

## 🚨 오류 복구 시스템 (Error Recovery System)

### 2.1 지능형 오류 복구 엔진 (Intelligent Error Recovery Engine)

```javascript
/**
 * 머신러닝 기반 오류 복구 시스템
 * 과거 데이터를 학습하여 최적의 복구 전략 선택
 */
class IntelligentErrorRecoveryEngine {
  constructor() {
    this.recoveryModels = new Map();
    this.successRates = new Map();
    this.learningEngine = new RecoveryLearningEngine();
  }

  /**
   * 최적의 복구 전략 선택 및 실행
   */
  async findOptimalRecoveryStrategy(error, context) {
    const errorSignature = this.createErrorSignature(error, context);
    
    // 1. 정확히 일치하는 과거 사례 찾기
    const exactMatch = await this.findExactMatch(errorSignature);
    if (exactMatch && exactMatch.successRate > 0.8) {
      return this.executeRecoveryStrategy(exactMatch.strategy, error, context);
    }

    // 2. 유사한 사례 찾기
    const similarCases = await this.findSimilarCases(errorSignature);
    if (similarCases.length > 0) {
      const bestStrategy = this.selectBestStrategy(similarCases);
      return this.executeRecoveryStrategy(bestStrategy, error, context);
    }

    // 3. 일반적인 복구 전략 시도
    const genericStrategies = this.getGenericRecoveryStrategies(error.type);
    for (const strategy of genericStrategies) {
      const result = await this.executeRecoveryStrategy(strategy, error, context);
      if (result.success) {
        // 학습 데이터로 저장
        await this.learningEngine.learnFromSuccess(errorSignature, strategy);
        return result;
      }
    }

    // 4. 실패 시 폴백 값 반환
    return this.getFallbackValue(error, context);
  }

  /**
   * 오류 서명 생성
   */
  createErrorSignature(error, context) {
    return {
      errorType: error.type,
      errorField: error.field,
      errorValue: error.value,
      contextHash: this.hashContext(context),
      timestamp: Date.now(),
      dataDistribution: this.analyzeDataDistribution(context),
      userPattern: this.analyzeUserPattern(context)
    };
  }

  /**
   * 회복 전략 실행
   */
  async executeRecoveryStrategy(strategy, error, context) {
    try {
      let recoveredValue;
      let confidence;
      let method;

      switch (strategy.type) {
        case 'interpolation':
          const interpResult = await this.interpolateMissingValue(error, context);
          recoveredValue = interpResult.value;
          confidence = interpResult.confidence;
          method = 'interpolation';
          break;

        case 'machine_learning':
          const mlResult = await this.predictWithML(error, context);
          recoveredValue = mlResult.prediction;
          confidence = mlResult.confidence;
          method = 'machine_learning';
          break;

        case 'population_statistics':
          const popResult = this.estimateFromPopulation(error, context);
          recoveredValue = popResult.value;
          confidence = popResult.confidence;
          method = 'population_statistics';
          break;

        case 'rule_based':
          const ruleResult = this.applyRecoveryRules(error, context);
          recoveredValue = ruleResult.value;
          confidence = ruleResult.confidence;
          method = 'rule_based';
          break;

        default:
          throw new Error(`Unknown recovery strategy: ${strategy.type}`);
      }

      return {
        success: true,
        recoveredValue,
        confidence,
        method,
        strategy: strategy.name,
        timestamp: new Date().toISOString()
      };

    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError.message,
        fallback: await this.getFallbackValue(error, context)
      };
    }
  }

  /**
   * 머신러닝 기반 예측
   */
  async predictWithML(error, context) {
    const model = await this.getMLModel(error.field);
    
    const features = this.extractFeatures(error, context);
    const prediction = await model.predict(features);
    
    // 신뢰도 계산
    const confidence = this.calculateMLConfidence(model, features, prediction);
    
    return {
      prediction: prediction.value,
      confidence: confidence,
      modelInfo: {
        name: model.name,
        version: model.version,
        lastUpdated: model.lastUpdated,
        trainingSamples: model.trainingSamples
      }
    };
  }

  /**
   * 보간법을 통한 누락값 추정
   */
  async interpolateMissingValue(error, context) {
    const data = context.data || {};
    const field = error.field;
    
    // 관련 필드 찾기
    const relatedFields = this.findRelatedFields(field);
    const availableData = {};
    
    relatedFields.forEach(relatedField => {
      if (data[relatedField] !== undefined && data[relatedField] !== null) {
        availableData[relatedField] = data[relatedField];
      }
    });

    if (Object.keys(availableData).length === 0) {
      return {
        value: null,
        confidence: 0,
        method: 'insufficient_data'
      };
    }

    // 다중 선형 보간
    const interpolatedValue = await this.multipleLinearInterpolation(
      field, 
      availableData, 
      context
    );

    // 신뢰도는 사용된 관련 필드의 수와 상관관계에 따라 결정
    const correlation = this.calculateCorrelation(field, Object.keys(availableData));
    const confidence = Math.min(correlation * 0.8, 0.95); // 최대 95%

    return {
      value: interpolatedValue,
      confidence: confidence,
      method: 'multiple_linear_interpolation',
      relatedFields: Object.keys(availableData),
      correlation: correlation
    };
  }
}
```

### 2.2 회복 학습 엔진 (Recovery Learning Engine)
```javascript
/**
 * 오류 복구 성공 사례를 학습하여 향후 복구 전략 개선
 */
class RecoveryLearningEngine {
  constructor() {
    this.successDatabase = [];
    this.failureDatabase = [];
    this.model = null;
  }

  /**
   * 성공한 복구 사례로부터 학습
   */
  async learnFromSuccess(errorSignature, strategy, result) {
    const learningData = {
      errorSignature,
      strategy,
      result,
      timestamp: Date.now(),
      success: true
    };

    this.successDatabase.push(learningData);
    
    // 주기적으로 모델 재학습
    if (this.successDatabase.length % 100 === 0) {
      await this.retrainModel();
    }
  }

  /**
   * 실패한 복구 사례로부터 학습
   */
  async learnFromFailure(errorSignature, strategy, failureReason) {
    const learningData = {
      errorSignature,
      strategy,
      failureReason,
      timestamp: Date.now(),
      success: false
    };

    this.failureDatabase.push(learningData);
  }

  /**
   * 최적의 복구 전략 예측
   */
  async predictBestStrategy(errorSignature) {
    if (!this.model) {
      await this.trainInitialModel();
    }

    const features = this.extractFeaturesForPrediction(errorSignature);
    const prediction = await this.model.predict(features);
    
    return {
      strategy: prediction.strategy,
      confidence: prediction.confidence,
      expectedSuccessRate: prediction.successRate,
      alternatives: prediction.alternatives
    };
  }

  /**
   * 모델 재학습
   */
  async retrainModel() {
    const trainingData = [
      ...this.successDatabase,
      ...this.failureDatabase
    ];

    if (trainingData.length < 50) {
      console.log("Insufficient data for retraining");
      return;
    }

    // TensorFlow.js 또는 유사한 ML 라이브러리 사용
    this.model = await this.trainModel(trainingData);
    
    console.log(`Model retrained with ${trainingData.length} samples`);
  }
}
```

---

## 📊 검증 메트릭 및 모니터링 (Validation Metrics & Monitoring)

### 3.1 검증 품질 지표 (Validation Quality Metrics)
```javascript
/**
 * 검증 시스템의 성과 측정 및 개선
 */
class ValidationMetrics {
  constructor() {
    this.metrics = {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0
    };
    
    this.historicalData = [];
  }

  /**
   * 검증 결과 기반 메트릭 업데이트
   */
  updateMetrics(validationResult, groundTruth) {
    const result = {
      truePositives: 0,
      falsePositives: 0,
      trueNegatives: 0,
      falseNegatives: 0
    };

    // 실제 오류 vs 검출된 오류 비교
    validationResult.errors.forEach(detectedError => {
      const isRealError = groundTruth.errors.some(realError => 
        this.areErrorsEquivalent(detectedError, realError)
      );
      
      if (isRealError) {
        result.truePositives++;
      } else {
        result.falsePositives++;
      }
    });

    // 누락된 오류 찾기
    groundTruth.errors.forEach(realError => {
      const wasDetected = validationResult.errors.some(detectedError =>
        this.areErrorsEquivalent(detectedError, realError)
      );
      
      if (!wasDetected) {
        result.falseNegatives++;
      }
    });

    // 메트릭 계산
    this.metrics = this.calculateMetrics(result);
    this.historicalData.push({
      timestamp: Date.now(),
      metrics: this.metrics,
      result
    });

    return this.metrics;
  }

  /**
   * 메트릭 계산
   */
  calculateMetrics(confusionMatrix) {
    const { truePositives, falsePositives, trueNegatives, falseNegatives } = confusionMatrix;
    
    const total = truePositives + falsePositives + trueNegatives + falseNegatives;
    
    return {
      accuracy: (truePositives + trueNegatives) / total,
      precision: truePositives / (truePositives + falsePositives) || 0,
      recall: truePositives / (truePositives + falseNegatives) || 0,
      f1Score: 2 * (this.precision * this.recall) / (this.precision + this.recall) || 0,
      falsePositiveRate: falsePositives / (falsePositives + trueNegatives) || 0,
      falseNegativeRate: falseNegatives / (falseNegatives + truePositives) || 0
    };
  }

  /**
   * 메트릭 기반 검증 시스템 개선 제안
   */
  generateImprovementSuggestions() {
    const suggestions = [];

    if (this.metrics.falseNegativeRate > 0.1) { // 10% 이상
      suggestions.push({
        type: 'reduce_false_negatives',
        priority: 'high',
        description: '누락된 오류가 너무 많습니다. 검증 규칙을 강화하세요',
        recommendedActions: [
          '더 엄격한 범위 제한 적용',
          '추가적인 상호 의존성 검사',
          '통계적 이상치 탐지 강화'
        ]
      });
    }

    if (this.metrics.falsePositiveRate > 0.15) { // 15% 이상
      suggestions.push({
        type: 'reduce_false_positives',
        priority: 'medium',
        description: '잘못된 오류 탐지가 너무 많습니다. 규칙을 완화하세요',
        recommendedActions: [
          '범위 제한 완화',
          '신뢰도 기반 필터링 강화',
          '맥락적 정보 활용 증가'
        ]
      });
    }

    return suggestions;
  }
}
```

---

## 🎯 결론 및 구현 체크리스트

### 4.1 구현 우선순위 (Implementation Priority)

```markdown
## High Priority (즉시 구현)
1. **기본 문법적 검증** - 타입, 범위, 필수 필드
2. **단순 오류 복구** - 기본값, 보간법
3. **실시간 피드백** - UI 입력 중 즉각적인 검증

## Medium Priority (2주 내)
1. **논리적 검증** - 상호 의존성, 일관성
2. **지능형 오류 복구** - ML 기반 예측
3. **성능 모니터링** - 검증 메트릭 수집

## Low Priority (1개월 내)
1. **맥락적 검증** - 계절성, 개인적 패턴
2. **학습 시스템** - 실패 사례로부터 학습
3. **고급 복구 전략** - 복합적 상황 처리
```

### 4.2 설정 파일 템플릿 (Configuration Template)

```javascript
// validation.config.js
module.exports = {
  // 검증 수준 설정
  validationLevels: {
    strict: {
      syntactic: true,
      semantic: true,
      logical: true,
      contextual: true,
      errorRecovery: true
    },
    normal: {
      syntactic: true,
      semantic: true,
      logical: true,
      contextual: false,
      errorRecovery: true
    },
    basic: {
      syntactic: true,
      semantic: false,
      logical: false,
      contextual: false,
      errorRecovery: false
    }
  },

  // 오류 복구 설정
  errorRecovery: {
    enabled: true,
    confidenceThreshold: 0.7,
    maxAttempts: 3,
    fallbackToDefaults: true,
    machineLearning: {
      enabled: true,
      modelUpdateInterval: 86400000, // 24시간
      minTrainingSamples: 100
    }
  },

  // 성능 설정
  performance: {
    enableCaching: true,
    cacheSize: 10000,
    timeout: 5000, // 5초
    maxMemoryUsage: 100 * 1024 * 1024 // 100MB
  },

  // 모니터링 설정
  monitoring: {
    enabled: true,
    collectMetrics: true,
    alertThresholds: {
      falsePositiveRate: 0.15,
      falseNegativeRate: 0.1,
      averageValidationTime: 1000 // 1초
    }
  }
};
```

---

**이 문서는 AI 분석 도구의 입력값 검증 시스템을 위한 완전한 가이드입니다.**
**모든 검증 규칙은 과학적 근거에 기반하며, 지속적으로 업데이트됩니다.**

**Version 1.0 - 입력값 검증 시스템 명세서 완성**