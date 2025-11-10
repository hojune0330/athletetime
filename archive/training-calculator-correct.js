// Jack Daniels VDOT Training Paces (정확한 공식)
// VDOT 기반 훈련 페이스 계산 - Jack Daniels Running Formula 3rd Edition 기준

function calculateTrainingPaces(vdot) {
  // Jack Daniels의 실제 페이스 테이블 (VDOT별 초/km)
  // 이 데이터는 Jack Daniels Running Formula 책의 공식 테이블 기반
  
  const vdotPaceTable = {
    30: {
      easy: { min: 417, max: 458 },  // 6:57-7:38 /km
      marathon: 374,                  // 6:14 /km
      threshold: 354,                 // 5:54 /km
      interval: 320,                  // 5:20 /km
      repetition: 296                 // 4:56 /km
    },
    35: {
      easy: { min: 372, max: 409 },  // 6:12-6:49 /km
      marathon: 333,                  // 5:33 /km
      threshold: 315,                 // 5:15 /km
      interval: 285,                  // 4:45 /km
      repetition: 264                 // 4:24 /km
    },
    40: {
      easy: { min: 337, max: 370 },  // 5:37-6:10 /km
      marathon: 301,                  // 5:01 /km
      threshold: 285,                 // 4:45 /km
      interval: 258,                  // 4:18 /km
      repetition: 239                 // 3:59 /km
    },
    45: {
      easy: { min: 308, max: 339 },  // 5:08-5:39 /km
      marathon: 275,                  // 4:35 /km
      threshold: 260,                 // 4:20 /km
      interval: 236,                  // 3:56 /km
      repetition: 218                 // 3:38 /km
    },
    50: {
      easy: { min: 284, max: 312 },  // 4:44-5:12 /km
      marathon: 253,                  // 4:13 /km
      threshold: 239,                 // 3:59 /km
      interval: 217,                  // 3:37 /km
      repetition: 201                 // 3:21 /km
    },
    55: {
      easy: { min: 263, max: 290 },  // 4:23-4:50 /km
      marathon: 235,                  // 3:55 /km
      threshold: 222,                 // 3:42 /km
      interval: 201,                  // 3:21 /km
      repetition: 186                 // 3:06 /km
    },
    60: {
      easy: { min: 246, max: 270 },  // 4:06-4:30 /km
      marathon: 219,                  // 3:39 /km
      threshold: 207,                 // 3:27 /km
      interval: 188,                  // 3:08 /km
      repetition: 174                 // 2:54 /km
    },
    65: {
      easy: { min: 230, max: 253 },  // 3:50-4:13 /km
      marathon: 205,                  // 3:25 /km
      threshold: 194,                 // 3:14 /km
      interval: 176,                  // 2:56 /km
      repetition: 163                 // 2:43 /km
    },
    70: {
      easy: { min: 217, max: 238 },  // 3:37-3:58 /km
      marathon: 193,                  // 3:13 /km
      threshold: 182,                 // 3:02 /km
      interval: 165,                  // 2:45 /km
      repetition: 153                 // 2:33 /km
    },
    75: {
      easy: { min: 205, max: 225 },  // 3:25-3:45 /km
      marathon: 182,                  // 3:02 /km
      threshold: 172,                 // 2:52 /km
      interval: 156,                  // 2:36 /km
      repetition: 144                 // 2:24 /km
    },
    80: {
      easy: { min: 194, max: 213 },  // 3:14-3:33 /km
      marathon: 172,                  // 2:52 /km
      threshold: 163,                 // 2:43 /km
      interval: 148,                  // 2:28 /km
      repetition: 137                 // 2:17 /km
    },
    85: {
      easy: { min: 185, max: 203 },  // 3:05-3:23 /km
      marathon: 164,                  // 2:44 /km
      threshold: 155,                 // 2:35 /km
      interval: 140,                  // 2:20 /km
      repetition: 130                 // 2:10 /km
    }
  };

  // VDOT 값에 가장 가까운 테이블 값 찾기
  const vdotKeys = Object.keys(vdotPaceTable).map(k => parseInt(k));
  let lowerVdot = 30, upperVdot = 30;
  
  for (let i = 0; i < vdotKeys.length - 1; i++) {
    if (vdot >= vdotKeys[i] && vdot <= vdotKeys[i + 1]) {
      lowerVdot = vdotKeys[i];
      upperVdot = vdotKeys[i + 1];
      break;
    }
  }
  
  if (vdot < 30) {
    lowerVdot = upperVdot = 30;
  } else if (vdot > 85) {
    lowerVdot = upperVdot = 85;
  }
  
  // 선형 보간법으로 정확한 페이스 계산
  let paces;
  
  if (lowerVdot === upperVdot) {
    paces = vdotPaceTable[lowerVdot];
  } else {
    const ratio = (vdot - lowerVdot) / (upperVdot - lowerVdot);
    const lowerPaces = vdotPaceTable[lowerVdot];
    const upperPaces = vdotPaceTable[upperVdot];
    
    paces = {
      easy: {
        min: Math.round(lowerPaces.easy.min - (lowerPaces.easy.min - upperPaces.easy.min) * ratio),
        max: Math.round(lowerPaces.easy.max - (lowerPaces.easy.max - upperPaces.easy.max) * ratio)
      },
      marathon: Math.round(lowerPaces.marathon - (lowerPaces.marathon - upperPaces.marathon) * ratio),
      threshold: Math.round(lowerPaces.threshold - (lowerPaces.threshold - upperPaces.threshold) * ratio),
      interval: Math.round(lowerPaces.interval - (lowerPaces.interval - upperPaces.interval) * ratio),
      repetition: Math.round(lowerPaces.repetition - (lowerPaces.repetition - upperPaces.repetition) * ratio)
    };
  }
  
  return paces;
}

// 훈련 강도별 심박수 구역
const heartRateZones = {
  easy: "최대심박수의 65-79%",
  marathon: "최대심박수의 80-85%",
  threshold: "최대심박수의 85-88%",
  interval: "최대심박수의 95-100%",
  repetition: "최대속도의 95%+"
};

// 훈련 지속 시간 가이드라인
const durationGuidelines = {
  easy: "30-150분",
  marathon: "40-110분",
  threshold: "20-60분 (총합)",
  interval: "3-5분 x 4-6회",
  repetition: "30초-2분 x 6-10회"
};

// % of VO2max for each training zone
const vo2maxPercentages = {
  easy: "59-74%",
  marathon: "75-84%",
  threshold: "85-88%",
  interval: "95-100%",
  repetition: "105-120%"
};