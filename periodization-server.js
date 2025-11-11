const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// 9일-10일 주기화 프로그램 데이터
const periodizationData = {
  // 9일 주기 프로그램
  cycle9: {
    days: [
      { day: 1, type: '고강도', focus: '무산소+힘', intensity: 90, duration: 75, recovery: '중' },
      { day: 2, type: '저강도', focus: '회복+기술', intensity: 50, duration: 45, recovery: '상' },
      { day: 3, type: '중강도', focus: '유산소+지구력', intensity: 70, duration: 90, recovery: '중' },
      { day: 4, type: '고강도', focus: '인터벌+스피드', intensity: 85, duration: 60, recovery: '하' },
      { day: 5, type: '저강도', focus: '활성회복', intensity: 40, duration: 30, recovery: '상' },
      { day: 6, type: '최고강도', focus: '테스트+경기', intensity: 95, duration: 45, recovery: '최하' },
      { day: 7, type: '휴식', focus: '완전회복', intensity: 0, duration: 0, recovery: '최상' },
      { day: 8, type: '중강도', focus: '기술+전술', intensity: 65, duration: 75, recovery: '중' },
      { day: 9, type: '고강도', focus: '종합훈련', intensity: 80, duration: 80, recovery: '하' }
    ]
  },
  // 10일 주기 프로그램
  cycle10: {
    days: [
      { day: 1, type: '고강도', focus: '무산소+힘', intensity: 90, duration: 75, recovery: '중' },
      { day: 2, type: '저강도', focus: '회복+기술', intensity: 50, duration: 45, recovery: '상' },
      { day: 3, type: '중강도', focus: '유산소+지구력', intensity: 70, duration: 90, recovery: '중' },
      { day: 4, type: '고강도', focus: '인터벌+스피드', intensity: 85, duration: 60, recovery: '하' },
      { day: 5, type: '저강도', focus: '활성회복', intensity: 40, duration: 30, recovery: '상' },
      { day: 6, type: '최고강도', focus: '테스트+경기', intensity: 95, duration: 45, recovery: '최하' },
      { day: 7, type: '휴식', focus: '완전회복', intensity: 0, duration: 0, recovery: '최상' },
      { day: 8, type: '중강도', focus: '기술+전술', intensity: 65, duration: 75, recovery: '중' },
      { day: 9, type: '고강도', focus: '종합훈련', intensity: 80, duration: 80, recovery: '하' },
      { day: 10, type: '저강도', focus: '준비+평가', intensity: 45, duration: 40, recovery: '상' }
    ]
  }
};

// 고급 주기화 알고리즘
function generateAdvancedPeriodization(athleteLevel, cycleType, trainingPhase) {
  const baseCycle = periodizationData[cycleType];
  let multiplier = 1.0;
  
  // 운동 수준별 조정
  switch(athleteLevel) {
    case '초급자': multiplier = 0.7; break;
    case '중급자': multiplier = 1.0; break;
    case '고급자': multiplier = 1.3; break;
    case '엘리트': multiplier = 1.5; break;
  }
  
  // 훈련 단계별 조정
  let phaseMultiplier = 1.0;
  switch(trainingPhase) {
    case '준비기': phaseMultiplier = 0.8; break;
    case '기본기': phaseMultiplier = 1.0; break;
    case '특수기': phaseMultiplier = 1.2; break;
    case '경기기': phaseMultiplier = 1.4; break;
    case '회복기': phaseMultiplier = 0.6; break;
  }
  
  return {
    ...baseCycle,
    days: baseCycle.days.map(day => ({
      ...day,
      intensity: Math.round(day.intensity * multiplier * phaseMultiplier),
      duration: Math.round(day.duration * multiplier * phaseMultiplier)
    }))
  };
}

// API 엔드포인트
app.use(express.json());
app.use(express.static(__dirname));

// 주기화 데이터 제공
app.get('/api/periodization/:cycleType', (req, res) => {
  const { cycleType } = req.params;
  const { level = '중급자', phase = '기본기' } = req.query;
  
  if (!periodizationData[cycleType]) {
    return res.status(404).json({ error: '해당 주기를 찾을 수 없습니다.' });
  }
  
  const result = generateAdvancedPeriodization(level, cycleType, phase);
  res.json(result);
});

// 맞춤형 주기화 생성
app.post('/api/periodization/custom', (req, res) => {
  const { 
    athleteLevel, 
    cycleLength = 9, 
    trainingPhase, 
    sportType = '육상',
    weeklyTrainingDays = 6
  } = req.body;
  
  const cycleType = cycleLength == 9 ? 'cycle9' : 'cycle10';
  const baseProgram = generateAdvancedPeriodization(athleteLevel, cycleType, trainingPhase);
  
  // 스포츠 종목별 맞춤화
  let sportSpecificDays = baseProgram.days.map(day => {
    let modifiedDay = { ...day };
    
    switch(sportType) {
      case '마라톤':
        if (day.type === '고강도') modifiedDay.focus = '템포런+인터벌';
        if (day.type === '중강도') modifiedDay.focus = 'LSD+회복런';
        break;
      case '단거리':
        if (day.type === '고강도') modifiedDay.focus = '스프린트+힘';
        if (day.type === '중강도') modifiedDay.focus = '스피드+기술';
        break;
      case '필드':
        if (day.type === '고강도') modifiedDay.focus = '기술+힘';
        if (day.type === '중강도') modifiedDay.focus = '기술+전술';
        break;
    }
    
    return modifiedDay;
  });
  
  // 훈련일수 조정
  if (weeklyTrainingDays < 7) {
    sportSpecificDays = sportSpecificDays.map(day => ({
      ...day,
      skip: day.type === '휴식' ? false : Math.random() > (weeklyTrainingDays / 7)
    }));
  }
  
  res.json({
    ...baseProgram,
    days: sportSpecificDays,
    metadata: {
      athleteLevel,
      cycleLength,
      trainingPhase,
      sportType,
      weeklyTrainingDays,
      totalIntensity: Math.round(sportSpecificDays.reduce((sum, day) => sum + day.intensity, 0) / sportSpecificDays.length),
      totalVolume: Math.round(sportSpecificDays.reduce((sum, day) => sum + day.duration, 0))
    }
  });
});

// 주기화 분석 및 최적화
app.get('/api/periodization/analyze/:cycleType', (req, res) => {
  const { cycleType } = req.params;
  const { level = '중급자', phase = '기본기' } = req.query;
  
  const program = generateAdvancedPeriodization(level, cycleType, phase);
  
  const analysis = {
    intensityDistribution: {
      low: program.days.filter(d => d.intensity < 60).length,
      medium: program.days.filter(d => d.intensity >= 60 && d.intensity < 80).length,
      high: program.days.filter(d => d.intensity >= 80).length
    },
    recoveryAnalysis: program.days.map((day, index) => ({
      day: index + 1,
      recoveryScore: getRecoveryScore(day.intensity, day.duration),
      adaptationScore: getAdaptationScore(day.type, day.focus)
    })),
    recommendations: generateRecommendations(program),
    periodization: {
      type: cycleType === 'cycle9' ? '9일 주기' : '10일 주기',
      totalDays: program.days.length,
      averageIntensity: Math.round(program.days.reduce((sum, day) => sum + day.intensity, 0) / program.days.length),
      averageDuration: Math.round(program.days.reduce((sum, day) => sum + day.duration, 0) / program.days.length)
    }
  };
  
  res.json(analysis);
});

function getRecoveryScore(intensity, duration) {
  const intensityScore = (100 - intensity) / 10;
  const durationScore = duration > 60 ? 3 : duration > 30 ? 5 : 8;
  return Math.round((intensityScore + durationScore) / 2);
}

function getAdaptationScore(type, focus) {
  const typeScores = { '휴식': 10, '저강도': 8, '중강도': 6, '고강도': 4, '최고강도': 2 };
  return typeScores[type] || 5;
}

function generateRecommendations(program) {
  const recommendations = [];
  const avgIntensity = program.days.reduce((sum, day) => sum + day.intensity, 0) / program.days.length;
  
  if (avgIntensity > 75) {
    recommendations.push('전체적인 훈련 강도가 높습니다. 회복일을 늘리거나 강도를 낮추는 것을 권장합니다.');
  }
  
  const highIntensityDays = program.days.filter(d => d.intensity >= 80).length;
  if (highIntensityDays > 3) {
    recommendations.push('고강도 훈련일이 많습니다. 고강도 훈련 사이에 충분한 회복 시간을 확보하세요.');
  }
  
  const restDays = program.days.filter(d => d.type === '휴식').length;
  if (restDays < 1) {
    recommendations.push('휴식일이 부족합니다. 주기에 최소 1-2일의 완전 휴식일을 포함시키세요.');
  }
  
  return recommendations;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`9일-10일 주기화 서버가 포트 ${PORT}에서 실행중입니다.`);
});
