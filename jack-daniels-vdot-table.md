# Jack Daniels VDOT 정확한 훈련 페이스 비율

## VDOT 50 기준 (5K: 19:35)
실제 Jack Daniels Running Formula 책의 정확한 수치

### 레이스 페이스
- 5K: 3:55/km (기준)
- 10K: 4:04/km
- HM: 4:17/km  
- FM: 4:32/km

### 훈련 페이스 (Jack Daniels 공식 테이블)
| Zone | 페이스/km | 5K 대비 비율 | 실제 계산 |
|------|----------|-------------|----------|
| Easy | 4:55-5:29 | 125-140% | 평균 133% |
| Marathon | 4:32 | 116% | |
| Threshold | 4:16 | 109% | |
| Interval | 3:52 | 99% | |
| Repetition | 3:40/km (1:28/400m) | 94% | |

## 정확한 계산식 (5K 기록 기준)

```javascript
// 5K 페이스를 초/km로 변환
const fiveKPaceSeconds = fiveKTime / 5; // 초/km

// Jack Daniels 정확한 비율
const trainingPaces = {
  'Easy': fiveKPaceSeconds * 1.30,      // 중간값 사용
  'Marathon': fiveKPaceSeconds * 1.16,  
  'Threshold': fiveKPaceSeconds * 1.09,
  'Interval': fiveKPaceSeconds * 0.98,  // 5K보다 약간 빠름
  'Repetition': fiveKPaceSeconds * 0.94
};
```

## VDOT 변환표 (주요 기록)

| VDOT | 5K | Easy/km | M/km | T/km | I/km | R/400m |
|------|-----|---------|------|------|------|--------|
| 40 | 23:20 | 5:52-6:29 | 5:23 | 5:05 | 4:37 | 1:45 |
| 45 | 21:22 | 5:22-5:56 | 4:56 | 4:39 | 4:14 | 1:36 |
| 50 | 19:35 | 4:55-5:29 | 4:32 | 4:16 | 3:52 | 1:28 |
| 55 | 18:03 | 4:32-5:03 | 4:10 | 3:56 | 3:34 | 1:21 |
| 60 | 16:43 | 4:12-4:40 | 3:52 | 3:38 | 3:18 | 1:15 |

## 중요 포인트

1. **Easy 페이스는 범위가 있음**: 느린쪽(140%)과 빠른쪽(125%) 
2. **Interval은 5K보다 약간 빠름**: 98-99% (VO2max 페이스)
3. **Repetition은 더 빠름**: 94% (속도/경제성 향상)
4. **Marathon 페이스**: 풀마라톤 목표 페이스 (5K의 116%)
5. **Threshold**: "comfortably hard" - 20분간 유지 가능한 페이스