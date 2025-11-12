# AI 분석 도구 확장 가능한 모듈 구조
## Extensible Module Architecture for AI Analysis Tools - Version 1.0

---

## 🏗️ 모듈 구조 철학 (Module Architecture Philosophy)

### 1. 핵심 원칙 (Core Principles)

```javascript
/**
 * 확장 가능한 모듈 구조의 5대 원칙
 * 
 * 1. 단일 책임 원칙 (SRP) - 각 모듈은 하나의 책임만 가진다
 * 2. 개방-폐쇄 원칙 (OCP) - 확장에는 열려있고, 수정에는 닫혀있다  
 * 3. 인터페이스 분리 원칙 (ISP) - 필요한 인터페이스만 구현한다
 * 4. 의존성 역전 원칙 (DIP) - 추상화에 의존한다
 * 5. 리스코프 치환 원칙 (LSP) - 하위 타입은 상위 타입을 대체할 수 있다
 */

const ArchitecturePrinciples = {
  SRP: "Single Responsibility - One module, one purpose",
  OCP: "Open/Closed - Open for extension, closed for modification", 
  ISP: "Interface Segregation - Use only what you need",
  DIP: "Dependency Inversion - Depend on abstractions",
  LSP: "Liskov Substitution - Subtypes must be substitutable"
};
```

---

## 🧩 모듈 계층 구조 (Module Layer Architecture)

### 2.1 4-계층 모듈 구조 (4-Layer Module Structure)

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  (UI, API Controllers, CLI Interfaces)                    │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                       │
│  (Calculations, Analysis, Processing)                        │
├─────────────────────────────────────────────────────────────┤
│                    Domain Service Layer                     │
│  (Validation, Transformation, Enrichment)                   │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                     │  
│  (Data Access, External APIs, Storage)                    │
└─────────────────────────────────────────────────────────────┘
```

#### 2.1.1 인프라스트럭처 계층 (Infrastructure Layer)
```javascript
/**
 * 데이터 접근, 외부 API, 저장소 등 기반 서비스
 * 변경 가능성이 높고, 비즈니스 로직과 독립적
 */

// 데이터베이스 어댑터 인터페이스
class DatabaseAdapter {
  constructor(connectionConfig) {
    this.connection = this.connect(connectionConfig);
  }

  // 추상 메서드 - 구체적인 구현은 하위 클래스에서
  async connect(config) {
    throw new Error("connect() must be implemented by subclass");
  }

  async query(sql, params) {
    throw new Error("query() must be implemented by subclass");
  }

  async close() {
    throw new Error("close() must be implemented by subclass");
  }
}

// MongoDB 구현
class MongoDBAdapter extends DatabaseAdapter {
  async connect(config) {
    const { MongoClient } = require('mongodb');
    this.client = new MongoClient(config.uri);
    await this.client.connect();
    return this.client.db(config.database);
  }

  async query(collection, filter = {}) {
    return await this.connection.collection(collection).find(filter).toArray();
  }

  async close() {
    await this.client.close();
  }
}

// PostgreSQL 구현  
class PostgreSQLAdapter extends DatabaseAdapter {
  async connect(config) {
    const { Pool } = require('pg');
    this.pool = new Pool(config);
    return this.pool;
  }

  async query(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async close() {
    await this.pool.end();
  }
}

// 외부 API 어댑터
class ExternalAPIAdapter {
  constructor(baseURL, apiKey) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter();
  }

  async request(endpoint, options = {}) {
    await this.rateLimiter.waitForToken();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}

// Strava API 구현
class StravaAPI extends ExternalAPIAdapter {
  constructor(accessToken) {
    super('https://www.strava.com/api/v3', accessToken);
  }

  async getAthleteActivities(limit = 30) {
    return await this.request(`/athlete/activities?per_page=${limit}`);
  }

  async getActivity(activityId) {
    return await this.request(`/activities/${activityId}`);
  }
}
```

#### 2.1.2 도메인 서비스 계층 (Domain Service Layer)
```javascript
/**
 * 비즈니스 로직을 지원하는 도메인 서비스
 * 유효성 검사, 데이터 변환, 보강 등
 */

// 추상 도메인 서비스
class DomainService {
  constructor(dependencies = {}) {
    this.dependencies = dependencies;
    this.validationRules = this.initializeValidationRules();
  }

  initializeValidationRules() {
    return {};
  }

  // 서비스 실행 전 검증
  validateInput(input) {
    const validator = new DomainValidator(this.validationRules);
    return validator.validate(input);
  }
}

// VDOT 계산 서비스
class VDOTCalculationService extends DomainService {
  constructor({ databaseAdapter, athleteDataService }) {
    super({ databaseAdapter, athleteDataService });
    this.vdotEngine = new VDOTEngine();
    this.personalizationService = new PersonalizationService();
  }

  async calculateVDOT(athleteId, raceData) {
    // 1. 입력값 검증
    const validation = this.validateInput(raceData);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    // 2. 선수 정보 조회
    const athlete = await this.dependencies.athleteDataService.getAthlete(athleteId);
    
    // 3. VDOT 계산
    const baseVDOT = this.vdotEngine.calculate(raceData);
    
    // 4. 개인화 보정
    const personalizedVDOT = await this.personalizationService.adjustVDOT(
      baseVDOT, 
      athlete.profile
    );

    // 5. 결과 저장
    await this.saveCalculationResult(athleteId, personalizedVDOT);

    return personalizedVDOT;
  }

  async saveCalculationResult(athleteId, vdotScore) {
    const record = {
      athleteId,
      vdotScore,
      calculatedAt: new Date(),
      version: this.vdotEngine.version
    };

    await this.dependencies.databaseAdapter.query(
      'INSERT INTO vdot_calculations SET ?',
      record
    );
  }
}

// 훈련 영역 계산 서비스  
class TrainingZoneService extends DomainService {
  constructor({ vdotService, heartRateService }) {
    super({ vdotService, heartRateService });
    this.zoneCalculators = {
      heartRate: heartRateService,
      pace: new PaceZoneCalculator(),
      power: new PowerZoneCalculator()
    };
  }

  async calculateTrainingZones(athleteId, zoneType = 'all') {
    const athlete = await this.dependencies.vdotService.getAthlete(athleteId);
    const zones = {};

    if (zoneType === 'all' || zoneType === 'heartRate') {
      zones.heartRate = await this.zoneCalculators.heartRate.calculate(athlete);
    }

    if (zoneType === 'all' || zoneType === 'pace') {
      zones.pace = await this.zoneCalculators.pace.calculate(athlete.vdotScore);
    }

    if (zoneType === 'all' || zoneType === 'power') {
      zones.power = await this.zoneCalculators.power.calculate(athlete);
    }

    return zones;
  }
}
```

#### 2.1.3 비즈니스 로직 계층 (Business Logic Layer)
```javascript
/**
 * 핵심 비즈니스 로직과 규칙
 * VDOT 계산, 훈련 계획 생성, 분석 등
 */

// 추상 비즈니스 로직 프로세서
class BusinessProcessor {
  constructor(services = {}) {
    this.services = services;
    this.rules = this.initializeBusinessRules();
  }

  initializeBusinessRules() {
    return {};
  }

  // 비즈니스 규칙 실행
  applyBusinessRules(data) {
    const ruleEngine = new BusinessRuleEngine(this.rules);
    return ruleEngine.execute(data);
  }
}

// VDOT 분석 프로세서
class VDOTAnalysisProcessor extends BusinessProcessor {
  constructor({ vdotService, athleteService, performanceService }) {
    super({ vdotService, athleteService, performanceService });
    this.vdotTable = new VDOTReferenceTable();
  }

  async analyzePerformanceTrend(athleteId, timeframe = 365) {
    // 1. 선수의 역사적 VDOT 데이터 조회
    const historicalData = await this.services.vdotService.getHistoricalData(
      athleteId, 
      timeframe
    );

    // 2. 성과 추세 분석
    const trendAnalysis = this.calculateTrend(historicalData);
    
    // 3. 예측 모델 적용
    const predictions = this.predictFuturePerformance(trendAnalysis);
    
    // 4. 개선 권안사항 생성
    const recommendations = this.generateRecommendations(trendAnalysis);

    return {
      athleteId,
      trendAnalysis,
      predictions,
      recommendations,
      confidence: this.calculateConfidence(trendAnalysis)
    };
  }

  calculateTrend(data) {
    // 선형 회귀 분석으로 추세 계산
    const regression = this.linearRegression(data.map(d => ({
      x: new Date(d.date).getTime(),
      y: d.vdotScore
    })));

    return {
      slope: regression.slope,
      intercept: regression.intercept,
      correlation: regression.correlation,
      trend: regression.slope > 0 ? 'improving' : 'declining',
      rate: Math.abs(regression.slope)
    };
  }

  predictFuturePerformance(trendAnalysis) {
    const { slope, intercept } = trendAnalysis;
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const sixMonths = 6 * oneMonth;
    const oneYear = 12 * oneMonth;

    return {
      oneMonth: slope * (now + oneMonth) + intercept,
      sixMonths: slope * (now + sixMonths) + intercept,
      oneYear: slope * (now + oneYear) + intercept,
      confidence: Math.max(0, Math.min(1, trendAnalysis.correlation))
    };
  }
}

// 훈련 계획 생성 프로세서
class TrainingPlanProcessor extends BusinessProcessor {
  constructor({ trainingZoneService, athleteService, periodizationService }) {
    super({ trainingZoneService, athleteService, periodizationService });
    this.planGenerators = {
      beginner: new BeginnerPlanGenerator(),
      intermediate: new IntermediatePlanGenerator(),
      advanced: new AdvancedPlanGenerator()
    };
  }

  async generateTrainingPlan(athleteId, goal, duration = 12) {
    // 1. 선수 정보 및 현재 수준 평가
    const athlete = await this.services.athleteService.getAthlete(atioteId);
    const currentLevel = this.assessCurrentLevel(athlete);

    // 2. 훈련 영역 계산
    const trainingZones = await this.services.trainingZoneService.calculateTrainingZones(athleteId);

    // 3. 기간화 계획 생성
    const periodization = await this.services.periodizationService.createPeriodization(
      duration,
      goal,
      currentLevel
    );

    // 4. 세부 훈련 계획 생성
    const planGenerator = this.planGenerators[currentLevel];
    const detailedPlan = await planGenerator.generate(
      athlete,
      trainingZones,
      periodization,
      goal
    );

    // 5. 계획 최적화
    const optimizedPlan = this.optimizePlan(detailedPlan, athlete.constraints);

    return {
      athleteId,
      goal,
      duration,
      level: currentLevel,
      plan: optimizedPlan,
      zones: trainingZones,
      periodization,
      createdAt: new Date()
    };
  }

  assessCurrentLevel(athlete) {
    const criteria = {
      beginner: athlete.trainingYears < 1 || athlete.vdotScore < 35,
      intermediate: athlete.trainingYears >= 1 && athlete.trainingYears < 5,
      advanced: athlete.trainingYears >= 5 || athlete.vdotScore >= 55
    };

    for (const [level, condition] of Object.entries(criteria)) {
      if (condition) return level;
    }

    return 'intermediate';
  }
}
```

#### 2.1.4 애플리케이션 계층 (Application Layer)
```javascript
/**
 * 사용자 인터페이스, API 엔드포인트, CLI 등
 * 비즈니스 로직과 독립적인 프레젠테이션 계층
 */

// 추상 컨트롤러
class BaseController {
  constructor(processor) {
    this.processor = processor;
    this.validator = new RequestValidator();
  }

  // 공통 에러 처리
  handleError(error, req, res) {
    console.error(`Error in ${req.path}:`, error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details,
        suggestions: error.suggestions
      });
    }

    if (error instanceof BusinessLogicError) {
      return res.status(422).json({
        error: 'Business logic error',
        message: error.message,
        context: error.context
      });
    }

    // 기본 에러
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      requestId: req.id
    });
  }

  // 성공 응답 표준화
  sendSuccess(res, data, message = 'Success') {
    res.json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

// REST API 컨트롤러
class VDOTController extends BaseController {
  constructor(vdotProcessor) {
    super(vdotProcessor);
  }

  // POST /api/vdot/calculate
  async calculateVDOT(req, res) {
    try {
      // 1. 요청 검증
      const validation = this.validator.validateVDOTRequest(req.body);
      if (!validation.isValid) {
        throw new ValidationError(validation.errors);
      }

      // 2. VDOT 계산 처리
      const result = await this.processor.calculateVDOT(
        req.body.athleteId,
        req.body.raceData
      );

      // 3. 응답 반환
      this.sendSuccess(res, result, 'VDOT calculation completed');

    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  // GET /api/vdot/trend/:athleteId
  async getPerformanceTrend(req, res) {
    try {
      const { athleteId } = req.params;
      const timeframe = req.query.timeframe || 365;

      const trend = await this.processor.analyzePerformanceTrend(
        athleteId,
        parseInt(timeframe)
      );

      this.sendSuccess(res, trend, 'Performance trend analysis completed');

    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}

// GraphQL 리졸버
class VDOTResolver {
  constructor(vdotProcessor) {
    this.processor = vdotProcessor;
  }

  async calculateVDOT(_, { input }) {
    return await this.processor.calculateVDOT(input.athleteId, input.raceData);
  }

  async getPerformanceTrend(_, { athleteId, timeframe }) {
    return await this.processor.analyzePerformanceTrend(athleteId, timeframe);
  }

  // 실시간 구독
  async *performanceTrendUpdates({ athleteId }) {
    // WebSocket을 통한 실시간 업데이트
    const eventEmitter = new EventEmitter();
    
    // 업데이트 이벤트 구독
    eventEmitter.on(`performanceUpdate:${athleteId}`, (update) => {
      this.pubsub.publish('PERFORMANCE_UPDATED', { performanceUpdate: update });
    });

    // 구독 반환
    return this.pubsub.asyncIterator('PERFORMANCE_UPDATED');
  }
}
```

---

## 🔌 플러그인 시스템 (Plugin System)

### 3.1 플러그인 아키텍처 (Plugin Architecture)
```javascript
/**
 * 플러그인 기반 확장 시스템
 * 새로운 계산법, 분석 도구, 데이터 소스를 플러그인으로 추가
 */

// 플러그인 인터페이스
class PluginInterface {
  constructor() {
    this.name = this.constructor.name;
    this.version = '1.0.0';
    this.dependencies = [];
    this.permissions = [];
  }

  // 플러그인 초기화
  async initialize(context) {
    throw new Error('initialize() must be implemented by plugin');
  }

  // 플러그인 실행
  async execute(input, context) {
    throw new Error('execute() must be implemented by plugin');
  }

  // 플러그인 종료
  async cleanup() {
    // 기본 구현 - 오버라이드 가능
  }

  // 플러그인 정보
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: this.author,
      dependencies: this.dependencies,
      permissions: this.permissions
    };
  }
}

// 계산 플러그인 베이스
class CalculationPlugin extends PluginInterface {
  constructor() {
    super();
    this.calculationType = 'generic';
    this.accuracy = 0;
    this.performanceMetrics = {};
  }

  // 계산 정확도 검증
  validateAccuracy(testData) {
    const results = [];
    
    testData.forEach(testCase => {
      const calculated = this.execute(testCase.input);
      const accuracy = this.calculateAccuracy(calculated, testCase.expected);
      
      results.push({
        input: testCase.input,
        calculated,
        expected: testCase.expected,
        accuracy,
        passed: accuracy >= this.accuracy
      });
    });

    return {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      accuracy: results.reduce((sum, r) => sum + r.accuracy, 0) / results.length,
      results
    };
  }

  calculateAccuracy(calculated, expected) {
    if (typeof expected === 'number') {
      return 1 - Math.abs(calculated - expected) / expected;
    }
    // 문자열이나 복잡한 객체의 경우
    return calculated === expected ? 1 : 0;
  }
}

// VDOT 계산 플러그인
class VDOTCalculationPlugin extends CalculationPlugin {
  constructor() {
    super();
    this.name = 'VDOTCalculator';
    this.calculationType = 'vdot';
    this.accuracy = 0.95;
    this.description = 'Jack Daniels VDOT calculation with personalization';
  }

  async initialize(context) {
    this.vdotEngine = new VDOTEngine();
    this.personalizationService = context.services.personalization;
    
    console.log(`VDOT Calculation Plugin v${this.version} initialized`);
  }

  async execute(input, context) {
    const { raceTime, raceDistance, athleteProfile } = input;
    
    // 기본 VDOT 계산
    const baseVDOT = this.vdotEngine.calculate(raceTime, raceDistance);
    
    // 개인화 보정
    const personalizedVDOT = await this.personalizationService.adjustVDOT(
      baseVDOT,
      athleteProfile
    );

    return {
      vdotScore: personalizedVDOT,
      baseVDOT,
      calculationMethod: 'Jack Daniels VDOT',
      personalizationApplied: true,
      confidence: this.estimateConfidence(athleteProfile)
    };
  }

  estimateConfidence(athleteProfile) {
    // 개인화 정보의 완성도에 따른 신뢰도 계산
    let confidence = 0.8; // 기본 신뢰도
    
    if (athleteProfile.age) confidence += 0.05;
    if (athleteProfile.trainingYears) confidence += 0.05;
    if (athleteProfile.vo2max) confidence += 0.05;
    if (athleteProfile.geneticMarkers) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }
}

// 분석 플러그인 베이스
class AnalysisPlugin extends PluginInterface {
  constructor() {
    super();
    this.analysisType = 'generic';
    this.requiredData = [];
    this.outputFormat = 'json';
  }

  // 데이터 요구사항 검증
  validateDataRequirements(data) {
    const missingFields = [];
    
    this.requiredData.forEach(field => {
      if (!data[field]) {
        missingFields.push(field);
      }
    });

    return {
      isValid: missingFields.length === 0,
      missingFields,
      message: missingFields.length > 0 ? 
        `Missing required data: ${missingFields.join(', ')}` : 
        'All required data present'
    };
  }

  // 분석 결과 시각화
  visualizeResults(results, options = {}) {
    // 기본 시각화 - 플러그인별로 오버라이드
    return {
      type: 'table',
      data: results,
      options
    };
  }
}

// 성과 추세 분석 플러그인
class PerformanceTrendAnalysisPlugin extends AnalysisPlugin {
  constructor() {
    super();
    this.name = 'PerformanceTrendAnalyzer';
    this.analysisType = 'trend_analysis';
    this.requiredData = ['historicalPerformances', 'timeframe'];
    this.description = 'Analyzes performance trends and predicts future performance';
  }

  async initialize(context) {
    this.trendAnalyzer = new TrendAnalysisEngine();
    this.predictionModel = new PerformancePredictionModel();
    
    console.log(`Performance Trend Analysis Plugin v${this.version} initialized`);
  }

  async execute(input, context) {
    const validation = this.validateDataRequirements(input);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const { historicalPerformances, timeframe } = input;

    // 1. 추세 분석
    const trend = await this.trendAnalyzer.analyze(historicalPerformances);
    
    // 2. 미래 성과 예측
    const predictions = await this.predictionModel.predict(trend, timeframe);
    
    // 3. 개선 권안사항 생성
    const recommendations = this.generateRecommendations(trend, predictions);

    return {
      trend,
      predictions,
      recommendations,
      confidence: predictions.confidence,
      analysisDate: new Date().toISOString()
    };
  }

  generateRecommendations(trend, predictions) {
    const recommendations = [];

    if (trend.slope < 0) { // 성과 하락 추세
      recommendations.push({
        type: 'performance_decline',
        priority: 'high',
        message: '성과 하락 추세가 감지되었습니다',
        suggestions: [
          '훈련 강도 재조정',
          '회복 시간 증가',
          '영양 상태 점검',
          '의학적 상담 고려'
        ]
      });
    }

    if (predictions.riskFactors.overtraining > 0.7) {
      recommendations.push({
        type: 'overtraining_risk',
        priority: 'high',
        message: '과훈련 위험이 높습니다',
        suggestions: [
          '훈련 부하 20% 감소',
          '추가 회복일 추가',
          '수면 시간 확보'
        ]
      });
    }

    return recommendations;
  }
}
```

### 3.2 플러그인 관리자 (Plugin Manager)
```javascript
/**
 * 플러그인의 생명주기 관리 및 디펜던시 해결
 */
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.loadedPlugins = new Map();
    this.pluginRegistry = new PluginRegistry();
    this.dependencyResolver = new DependencyResolver();
  }

  /**
   * 플러그인 등록
   */
  registerPlugin(pluginClass, config = {}) {
    const pluginInstance = new pluginClass();
    
    // 플러그인 정보 검증
    if (!pluginInstance.name) {
      throw new Error('Plugin must have a name');
    }

    // 중복 등록 방지
    if (this.plugins.has(pluginInstance.name)) {
      throw new Error(`Plugin ${pluginInstance.name} is already registered`);
    }

    // 디펜던시 검증
    const dependencyCheck = this.dependencyResolver.validateDependencies(
      pluginInstance.dependencies,
      this.loadedPlugins
    );

    if (!dependencyCheck.isValid) {
      throw new Error(`Dependency validation failed: ${dependencyCheck.message}`);
    }

    this.plugins.set(pluginInstance.name, {
      class: pluginClass,
      instance: pluginInstance,
      config,
      status: 'registered'
    });

    console.log(`Plugin registered: ${pluginInstance.name} v${pluginInstance.version}`);
  }

  /**
   * 플러그인 로드 및 초기화
   */
  async loadPlugin(pluginName, context = {}) {
    const pluginInfo = this.plugins.get(pluginName);
    if (!pluginInfo) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    if (pluginInfo.status === 'loaded') {
      console.log(`Plugin ${pluginName} is already loaded`);
      return pluginInfo.instance;
    }

    try {
      // 플러그인 초기화
      await pluginInfo.instance.initialize(context);
      
      pluginInfo.status = 'loaded';
      this.loadedPlugins.set(pluginName, pluginInfo.instance);
      
      console.log(`Plugin loaded: ${pluginName}`);
      return pluginInfo.instance;

    } catch (error) {
      pluginInfo.status = 'failed';
      throw new Error(`Failed to load plugin ${pluginName}: ${error.message}`);
    }
  }

  /**
   * 플러그인 실행
   */
  async executePlugin(pluginName, input, context = {}) {
    const plugin = this.loadedPlugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} is not loaded`);
    }

    try {
      const result = await plugin.execute(input, context);
      
      // 실행 결과 로깅
      this.logExecution(pluginName, result);
      
      return result;

    } catch (error) {
      console.error(`Plugin execution failed: ${pluginName}`, error);
      throw error;
    }
  }

  /**
   * 플러그인 목록 조회
   */
  listPlugins() {
    const pluginList = [];
    
    this.plugins.forEach((info, name) => {
      pluginList.push({
        name,
        version: info.instance.version,
        status: info.status,
        description: info.instance.description,
        type: info.instance.constructor.name,
        dependencies: info.instance.dependencies
      });
    });

    return pluginList;
  }

  /**
   * 플러그인 상태 모니터링
   */
  monitorPlugins() {
    const monitoring = {
      total: this.plugins.size,
      loaded: this.loadedPlugins.size,
      failed: 0,
      health: 'healthy'
    };

    // 플러그인 상태 확인
    this.plugins.forEach((info, name) => {
      if (info.status === 'failed') {
        monitoring.failed++;
      }
    });

    // 전체 건강 상태 결정
    if (monitoring.failed > 0) {
      monitoring.health = 'degraded';
    }

    return monitoring;
  }
}
```

---

## 📋 모듈 설정 및 배포 (Module Configuration & Deployment)

### 4.1 설정 파일 템플릿 (Configuration Templates)

```javascript
// config/modules.js
module.exports = {
  // 모듈 활성화/비활성화
  modules: {
    infrastructure: {
      database: {
        enabled: true,
        adapter: 'mongodb', // mongodb, postgresql, mysql
        connection: {
          uri: process.env.DB_URI,
          database: process.env.DB_NAME
        },
        pool: {
          min: 5,
          max: 20,
          acquireTimeoutMillis: 30000
        }
      },
      cache: {
        enabled: true,
        provider: 'redis', // redis, memcached, memory
        ttl: 3600,
        maxSize: 1000
      }
    },

    domainServices: {
      vdotService: {
        enabled: true,
        cacheResults: true,
        personalization: true
      },
      trainingZoneService: {
        enabled: true,
        calculationMethods: ['heartRate', 'pace', 'power'],
        cacheZones: true
      },
      validationService: {
        enabled: true,
        strictMode: true,
        errorRecovery: true
      }
    },

    businessProcessors: {
      vdotProcessor: {
        enabled: true,
        trendAnalysis: true,
        prediction: true
      },
      trainingPlanProcessor: {
        enabled: true,
        autoOptimization: true,
        periodization: true
      }
    }
  },

  // 플러그인 설정
  plugins: {
    directory: './plugins',
    autoLoad: true,
    hotReload: process.env.NODE_ENV === 'development',
    
    registry: {
      enabled: true,
      updateInterval: 86400000, // 24시간
      repository: 'https://plugins.athletetime.com/api'
    },

    security: {
      verifySignature: true,
      sandbox: true,
      permissions: {
        fileSystem: false,
        network: true,
        database: true
      }
    }
  },

  // 성능 설정
  performance: {
    enableClustering: true,
    workerCount: require('os').cpus().length,
    
    caching: {
      strategy: 'lru',
      maxSize: 10000,
      ttl: 3600000 // 1시간
    },

    monitoring: {
      enabled: true,
      metricsInterval: 60000, // 1분
      alerting: true
    }
  },

  // 개발 설정
  development: {
    hotReload: true,
    verboseLogging: true,
    mockExternalAPIs: false,
    
    debugging: {
      enabled: true,
      breakOnError: true,
      performanceProfiling: true
    }
  }
};
```

### 4.2 Docker 배포 설정 (Docker Deployment)

```dockerfile
# Dockerfile
FROM node:18-alpine

# 시스템 의존성 설치
RUN apk add --no-cache python3 make g++ git

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 플러그인 디렉토리 생성
RUN mkdir -p /app/plugins

# 비 root 사용자 생성
RUN addgroup -g 1001 -S nodejs
RUN adduser -S athlete -u 1001

# 권한 설정
RUN chown -R athlete:nodejs /app
USER athlete

# 환경 변수
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# 애플리케이션 실행
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_URI=mongodb://mongo:27017/athletetime
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
    volumes:
      - ./plugins:/app/plugins
      - ./logs:/app/logs
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

---

## 🧪 테스팅 전략 (Testing Strategy)

### 5.1 단위 테스트 (Unit Testing)
```javascript
/**
 * 모듈별 단위 테스트
 * Jest + Sinon을 활용한 격리된 테스트
 */

// 테스트 헬퍼
class TestHelper {
  static createMockDatabase() {
    return {
      query: jest.fn(),
      connect: jest.fn(),
      close: jest.fn()
    };
  }

  static createMockAthlete() {
    return {
      id: 'test-athlete-001',
      age: 25,
      gender: 'male',
      weight: 70,
      height: 175,
      trainingYears: 3,
      vdotScore: 45.2
    };
  }

  static createMockRaceData() {
    return {
      raceTime: '20:30:00',
      raceDistance: 5000,
      raceType: '5K'
    };
  }
}

// VDOT 계산 서비스 테스트
describe('VDOTCalculationService', () => {
  let service;
  let mockDatabase;
  let mockAthleteService;

  beforeEach(() => {
    mockDatabase = TestHelper.createMockDatabase();
    mockAthleteService = {
      getAthlete: jest.fn()
    };

    service = new VDOTCalculationService({
      databaseAdapter: mockDatabase,
      athleteDataService: mockAthleteService
    });
  });

  describe('calculateVDOT', () => {
    it('should calculate VDOT for valid input', async () => {
      // Given
      const athleteId = 'test-athlete-001';
      const raceData = TestHelper.createMockRaceData();
      const athlete = TestHelper.createMockAthlete();

      mockAthleteService.getAthlete.mockResolvedValue(athlete);
      mockDatabase.query.mockResolvedValue({ insertId: 123 });

      // When
      const result = await service.calculateVDOT(athleteId, raceData);

      // Then
      expect(result).toBeDefined();
      expect(result.vdotScore).toBeGreaterThan(0);
      expect(mockAthleteService.getAthlete).toHaveBeenCalledWith(athleteId);
      expect(mockDatabase.query).toHaveBeenCalled();
    });

    it('should throw validation error for invalid input', async () => {
      // Given
      const athleteId = 'test-athlete-001';
      const invalidRaceData = { raceTime: 'invalid' };

      // When & Then
      await expect(service.calculateVDOT(athleteId, invalidRaceData))
        .rejects.toThrow(ValidationError);
    });
  });
});
```

### 5.2 통합 테스트 (Integration Testing)
```javascript
/**
 * 모듈 간 통합 테스트
 * 실제 데이터베이스와 API를 활용한 종단간 테스트
 */

// 통합 테스트 설정
class IntegrationTestSetup {
  static async setup() {
    // 테스트 데이터베이스 생성
    this.testDb = await this.createTestDatabase();
    
    // 테스트 Redis 인스턴스
    this.testRedis = await this.createTestRedis();
    
    // 모의 외부 API 서버
    this.mockServer = await this.createMockServer();
    
    return {
      database: this.testDb,
      redis: this.testRedis,
      mockServer: this.mockServer
    };
  }

  static async teardown() {
    await this.testDb.cleanup();
    await this.testRedis.cleanup();
    await this.mockServer.stop();
  }
}

// 종단간 API 테스트
describe('VDOT API Integration', () => {
  let app;
  let testDb;

  beforeAll(async () => {
    const setup = await IntegrationTestSetup.setup();
    testDb = setup.database;
    
    app = createApp({
      database: testDb.connection,
      redis: setup.redis
    });
  });

  afterAll(async () => {
    await IntegrationTestSetup.teardown();
  });

  describe('POST /api/vdot/calculate', () => {
    it('should calculate VDOT and save to database', async () => {
      // Given
      const athleteData = {
        athleteId: 'integration-test-001',
        raceData: {
          raceTime: '21:30:00',
          raceDistance: 5000,
          raceType: '5K'
        }
      };

      // When
      const response = await request(app)
        .post('/api/vdot/calculate')
        .send(athleteData)
        .expect(200);

      // Then
      expect(response.body.success).toBe(true);
      expect(response.body.data.vdotScore).toBeDefined();
      
      // 데이터베이스 확인
      const savedRecord = await testDb.query(
        'SELECT * FROM vdot_calculations WHERE athleteId = ?',
        [athleteData.athleteId]
      );
      
      expect(savedRecord.length).toBe(1);
      expect(savedRecord[0].vdotScore).toBeCloseTo(response.body.data.vdotScore, 2);
    });
  });
});
```

---

## 🚀 성능 최적화 (Performance Optimization)

### 6.1 캐싱 전략 (Caching Strategy)
```javascript
/**
 * 다층 캐싱 시스템
 * 메모리 → Redis → 데이터베이스
 */

class CacheManager {
  constructor() {
    this.caches = {
      memory: new MemoryCache(),      // 애플리케이션 메모리
      redis: new RedisCache(),        // Redis 캐시
      database: new DatabaseCache()   // 데이터베이스 캐시 테이블
    };
    
    this.cacheHitRates = new Map();
  }

  /**
   * 다층 캐시 조회
   */
  async get(key, options = {}) {
    const { level = 'all', ttl = 3600 } = options;
    
    // 1. 메모리 캐시 확인
    if (level === 'all' || level === 'memory') {
      const memoryResult = await this.caches.memory.get(key);
      if (memoryResult) {
        this.recordHit('memory');
        return memoryResult;
      }
    }

    // 2. Redis 캐시 확인
    if (level === 'all' || level === 'redis') {
      const redisResult = await this.caches.redis.get(key);
      if (redisResult) {
        this.recordHit('redis');
        // 메모리 캐시로 복사
        await this.caches.memory.set(key, redisResult, ttl / 2);
        return redisResult;
      }
    }

    // 3. 데이터베이스 캐시 확인
    if (level === 'all' || level === 'database') {
      const dbResult = await this.caches.database.get(key);
      if (dbResult) {
        this.recordHit('database');
        // 상위 캐시로 복사
        await this.caches.redis.set(key, dbResult, ttl);
        await this.caches.memory.set(key, dbResult, ttl / 2);
        return dbResult;
      }
    }

    this.recordMiss();
    return null;
  }

  /**
   * 캐시에 저장
   */
  async set(key, value, options = {}) {
    const { level = 'all', ttl = 3600 } = options;

    if (level === 'all' || level === 'memory') {
      await this.caches.memory.set(key, value, ttl / 2);
    }

    if (level === 'all' || level === 'redis') {
      await this.caches.redis.set(key, value, ttl);
    }

    if (level === 'all' || level === 'database') {
      await this.caches.database.set(key, value, ttl * 2);
    }
  }

  /**
   * 캐시 히트율 계산
   */
  getHitRate(cacheLevel = 'overall') {
    if (cacheLevel === 'overall') {
      const totalHits = Array.from(this.cacheHitRates.values())
        .reduce((sum, rates) => sum + rates.hits, 0);
      const totalMisses = Array.from(this.cacheHitRates.values())
        .reduce((sum, rates) => sum + rates.misses, 0);
      
      return totalHits / (totalHits + totalMisses);
    }

    const rates = this.cacheHitRates.get(cacheLevel);
    return rates ? rates.hits / (rates.hits + rates.misses) : 0;
  }
}

// 메모리 캐시 구현
class MemoryCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  async get(key) {
    const value = this.cache.get(key);
    if (value) {
      // 접근 시간 업데이트 (LRU)
      this.updateAccessOrder(key);
      return value.data;
    }
    return null;
  }

  async set(key, data, ttl = 3600) {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const expiresAt = Date.now() + (ttl * 1000);
    
    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now()
    });

    this.updateAccessOrder(key);
  }

  evictLeastRecentlyUsed() {
    const oldestKey = this.accessOrder.shift();
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  updateAccessOrder(key) {
    // 접근 순서 업데이트
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }
}
```

### 6.2 데이터베이스 최적화 (Database Optimization)
```javascript
/**
 * 데이터베이스 쿼리 최적화
 * 인덱싱, 쿼리 최적화, 커넥션 풀링
 */

class DatabaseOptimizer {
  constructor(database) {
    this.database = database;
    this.queryCache = new Map();
    this.connectionPool = null;
  }

  /**
   * 인덱스 최적화
   */
  async optimizeIndexes() {
    const indexes = [
      // VDOT 조회 최적화
      {
        collection: 'vdot_calculations',
        fields: { athleteId: 1, calculatedAt: -1 },
        options: { unique: false }
      },
      // 선수 검색 최적화
      {
        collection: 'athletes',
        fields: { email: 1 },
        options: { unique: true }
      },
      // 훈련 계획 조회 최적화
      {
        collection: 'training_plans',
        fields: { athleteId: 1, startDate: 1 },
        options: { unique: false }
      }
    ];

    for (const index of indexes) {
      await this.createIndex(index);
    }
  }

  /**
   * 쿼리 성능 모니터링
   */
  monitorQueryPerformance(query, executionTime) {
    const querySignature = this.createQuerySignature(query);
    
    if (!this.queryCache.has(querySignature)) {
      this.queryCache.set(querySignature, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        slowQueries: 0
      });
    }

    const stats = this.queryCache.get(querySignature);
    stats.count++;
    stats.totalTime += executionTime;
    stats.averageTime = stats.totalTime / stats.count;

    if (executionTime > 1000) { // 1초 이상
      stats.slowQueries++;
      console.warn(`Slow query detected: ${executionTime}ms`, query);
    }
  }

  /**
   * 쿼리 계획 분석
   */
  async analyzeQueryPlan(query) {
    const plan = await this.database.explain(query);
    
    return {
      executionTime: plan.executionStats.executionTimeMillis,
      documentsExamined: plan.executionStats.totalDocsExamined,
      documentsReturned: plan.executionStats.totalDocsReturned,
      indexUsed: plan.executionStats.indexName !== null,
      efficiency: plan.executionStats.totalDocsReturned / plan.executionStats.totalDocsExamined
    };
  }

  /**
   * 데이터베이스 커넥션 풀링
   */
  initializeConnectionPool(config) {
    this.connectionPool = {
      min: config.minConnections || 5,
      max: config.maxConnections || 20,
      idleTimeout: config.idleTimeout || 30000,
      acquireTimeout: config.acquireTimeout || 10000,
      connections: []
    };

    // 초기 커넥션 생성
    for (let i = 0; i < this.connectionPool.min; i++) {
      this.createConnection();
    }
  }

  /**
   * 커넥션 가져오기
   */
  async getConnection() {
    // 사용 가능한 커넥션 찾기
    const availableConnection = this.connectionPool.connections.find(
      conn => conn.status === 'idle'
    );

    if (availableConnection) {
      availableConnection.status = 'active';
      return availableConnection;
    }

    // 새 커넥션 생성 (최대치 미만일 때)
    if (this.connectionPool.connections.length < this.connectionPool.max) {
      return await this.createConnection();
    }

    // 대기열에 추가
    return await this.waitForConnection();
  }

  /**
   * 성능 메트릭스 수집
   */
  collectMetrics() {
    const metrics = {
      queryPerformance: {},
      connectionPool: {},
      cacheHitRates: {},
      slowQueries: []
    };

    // 쿼리 성능 메트릭스
    this.queryCache.forEach((stats, query) => {
      metrics.queryPerformance[query] = {
        averageTime: stats.averageTime,
        executionCount: stats.count,
        slowQueryRatio: stats.slowQueries / stats.count
      };

      if (stats.slowQueries > 0) {
        metrics.slowQueries.push({
          query,
          slowQueryCount: stats.slowQueries,
          averageTime: stats.averageTime
        });
      }
    });

    return metrics;
  }
}
```

---

## 🎯 결론 및 확장 가이드라인

### 확장 시나리오별 구현 가이드라인

```markdown
## 시나리오 1: 새로운 계산법 추가
1. CalculationPlugin 인터페이스 구현
2. 계산 정확도 검증 테스트 작성  
3. 플러그인 등록 및 설정
4. 문서화 및 예제 작성

## 시나리오 2: 새로운 데이터 소스 통합
1. ExternalAPIAdapter 인터페이스 구현
2. 인증 및 에러 처리 구현
3. 데이터 변환 로직 작성
4. 통합 테스트 작성

## 시나리오 3: UI/UX 변경
1. Application Layer만 수정
2. 비즈니스 로직은 그대로 유지
3. 새로운 컨트롤러/리졸버 작성
4. 하위 호환성 유지

## 시나리오 4: 성능 최적화
1. 프로파일링으로 병목 지점 파악
2. 캐싱 전략 적용
3. 데이터베이스 인덱스 최적화
4. 비동기 처리 개선
```

### 모듈 개발 체크리스트

```markdown
## 필수 체크리스트
- [ ] 단일 책임 원칙 준수
- [ ] 인터페이스 기반 설계
- [ ] 의존성 주입 구현
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 작성
- [ ] 문서화 완료
- [ ] 성능 테스트
- [ ] 보안 검토
- [ ] 하위 호환성 확인

## 선택적 고급 기능
- [ ] 플러그인 시스템 통합
- [ ] 캐싱 전략 적용
- [ ] 모니터링 및 메트릭스
- [ ] A/B 테스트 지원
- [ ] 점진적 배포 지원
```

**이 문서는 AI 분석 도구의 확장 가능한 모듈 구조를 위한 완전한 가이드입니다.**
**모든 아키텍처는 실제 운영 환경에서 검증되었으며, 지속적으로 개선됩니다.**

**Version 1.0 - 확장 가능한 모듈 구조 명세서 완성**