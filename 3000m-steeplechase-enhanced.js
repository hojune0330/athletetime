// 3000m 장애물 경주 페이스 계산표 - 강화 버전
// 모든 랩 페이스 표시, 5초 간격, 상세한 누적 시간

function generateEnhancedSteeplechaseChart() {
  const tbodyInside = document.getElementById('steeplechaseInsideTable');
  const tbodyOutside = document.getElementById('steeplechaseOutsideTable');
  
  if (!tbodyInside || !tbodyOutside) return;
  
  tbodyInside.innerHTML = '';
  tbodyOutside.innerHTML = '';
  
  // 5초 간격으로 7분부터 13분까지
  const targetTimes = [];
  for (let seconds = 7 * 60; seconds <= 13 * 60; seconds += 5) {
    targetTimes.push({
      time: seconds,
      highlight: seconds % 30 === 0 // 30초마다 하이라이트
    });
  }
  
  // 장애물 구성별 거리 정의
  const insideConfig = {
    lapDistance: 396.084,  // 내측 물장애물 시 랩 거리
    startSection: 227.412,  // 시작 구간 거리
    totalLapDistance: 2772.588  // 7랩 총 거리
  };
  
  const outsideConfig = {
    lapDistance: 419.407,  // 외측 물장애물 시 랩 거리
    startSection: 64.151,  // 시작 구간 거리
    totalLapDistance: 2935.849  // 7랩 총 거리
  };
  
  // 시간 포맷 함수
  function formatTime(seconds) {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return secs < 10 ? `${mins}:0${secs}` : `${mins}:${secs}`;
  }
  
  // 페이스 포맷 함수 (분:초/km)
  function formatPace(secondsPerKm) {
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.floor(secondsPerKm % 60);
    return secs < 10 ? `${mins}:0${secs}` : `${mins}:${secs}`;
  }
  
  targetTimes.forEach(target => {
    // 기본 페이스 계산
    const pacePerKm = target.time / 3;
    
    // 내측 구성 계산
    const insideStartTime = (target.time / 3000) * insideConfig.startSection;
    const insideLapTime = (target.time / 3000) * insideConfig.lapDistance;
    
    // 각 랩별 누적 시간 계산 (시작 구간 후)
    const insideLaps = [];
    insideLaps.push({
      lap: '시작',
      split: insideStartTime,
      cumulative: insideStartTime,
      lapPace: insideStartTime
    });
    
    for (let lap = 1; lap <= 7; lap++) {
      insideLaps.push({
        lap: lap,
        split: insideLapTime,
        cumulative: insideStartTime + (insideLapTime * lap),
        lapPace: insideLapTime
      });
    }
    
    // 내측 테이블 행 추가
    const rowInside = tbodyInside.insertRow();
    if (target.highlight) {
      rowInside.className = 'bg-blue-50 font-semibold';
    }
    
    // 내측 HTML - 모든 랩 표시
    let insideHTML = `
      <td class="text-xs font-bold text-blue-700">${formatTime(target.time)}</td>
      <td class="text-xs">${formatPace(pacePerKm)}</td>
      <td class="text-xs">${formatTime(insideStartTime)}</td>`;
    
    // 1-7랩 표시
    for (let lap = 1; lap <= 7; lap++) {
      const cumulativeTime = insideStartTime + (insideLapTime * lap);
      const lapPaceDisplay = formatTime(insideLapTime);
      insideHTML += `<td class="text-xs">
        <div class="font-semibold">${formatTime(cumulativeTime)}</div>
        <div class="text-gray-500" style="font-size: 10px;">(${lapPaceDisplay})</div>
      </td>`;
    }
    
    insideHTML += `<td class="text-xs font-bold bg-blue-200">${formatTime(target.time)}</td>`;
    rowInside.innerHTML = insideHTML;
    
    // 외측 구성 계산
    const outsideStartTime = (target.time / 3000) * outsideConfig.startSection;
    const outsideLapTime = (target.time / 3000) * outsideConfig.lapDistance;
    
    // 외측 테이블 행 추가
    const rowOutside = tbodyOutside.insertRow();
    if (target.highlight) {
      rowOutside.className = 'bg-purple-50 font-semibold';
    }
    
    // 외측 HTML - 모든 랩 표시
    let outsideHTML = `
      <td class="text-xs font-bold text-purple-700">${formatTime(target.time)}</td>
      <td class="text-xs">${formatPace(pacePerKm)}</td>
      <td class="text-xs">${formatTime(outsideStartTime)}</td>`;
    
    // 1-7랩 표시
    for (let lap = 1; lap <= 7; lap++) {
      const cumulativeTime = outsideStartTime + (outsideLapTime * lap);
      const lapPaceDisplay = formatTime(outsideLapTime);
      outsideHTML += `<td class="text-xs">
        <div class="font-semibold">${formatTime(cumulativeTime)}</div>
        <div class="text-gray-500" style="font-size: 10px;">(${lapPaceDisplay})</div>
      </td>`;
    }
    
    outsideHTML += `<td class="text-xs font-bold bg-purple-200">${formatTime(target.time)}</td>`;
    rowOutside.innerHTML = outsideHTML;
  });
  
  // 테이블 헤더도 업데이트
  updateSteeplechaseHeaders();
}

function updateSteeplechaseHeaders() {
  // 내측 테이블 헤더 업데이트
  const insideTable = document.querySelector('#steeplechaseInsideTable').closest('table');
  const insideThead = insideTable.querySelector('thead tr');
  insideThead.innerHTML = `
    <th class="text-xs">목표기록</th>
    <th class="text-xs">km페이스</th>
    <th class="text-xs">시작구간</th>
    <th class="text-xs">1랩</th>
    <th class="text-xs">2랩</th>
    <th class="text-xs">3랩</th>
    <th class="text-xs">4랩</th>
    <th class="text-xs">5랩</th>
    <th class="text-xs">6랩</th>
    <th class="text-xs">7랩</th>
    <th class="text-xs bg-blue-200 font-bold">완주</th>
  `;
  
  // 외측 테이블 헤더 업데이트
  const outsideTable = document.querySelector('#steeplechaseOutsideTable').closest('table');
  const outsideThead = outsideTable.querySelector('thead tr');
  outsideThead.innerHTML = `
    <th class="text-xs">목표기록</th>
    <th class="text-xs">km페이스</th>
    <th class="text-xs">시작구간</th>
    <th class="text-xs">1랩</th>
    <th class="text-xs">2랩</th>
    <th class="text-xs">3랩</th>
    <th class="text-xs">4랩</th>
    <th class="text-xs">5랩</th>
    <th class="text-xs">6랩</th>
    <th class="text-xs">7랩</th>
    <th class="text-xs bg-purple-200 font-bold">완주</th>
  `;
}

// 기존 함수 대체
if (typeof generateSteeplechaseChart !== 'undefined') {
  window.generateSteeplechaseChart = generateEnhancedSteeplechaseChart;
} else {
  window.generateEnhancedSteeplechaseChart = generateEnhancedSteeplechaseChart;
}

// DOM이 준비되면 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', generateEnhancedSteeplechaseChart);
} else {
  generateEnhancedSteeplechaseChart();
}