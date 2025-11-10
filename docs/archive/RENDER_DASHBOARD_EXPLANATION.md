# 렌더 대시보드 화면 설명

## 현재 보이는 화면 구성

### 1. 서비스 정보
- **이름**: "운동선수 시간" (athlete-time-backend)
- **타입**: Web Service
- **상태**: 실행 중 (초록색 점)
- **URL**: athlete-time-backend.onrender.com

### 2. 노란색 알림 메시지
```
"Free instances spin down after a period of inactivity..."
```
- **의미**: 무료 인스턴스는 비활성 시 자동으로 종료됨
- **영향**: 
  - 30분간 요청이 없으면 서버가 일시 중지
  - 다음 요청 시 재시작 (30-50초 지연)
- **해결**: 
  - Starter 플랜 사용 중이라면 무시 (24/7 실행)
  - 아직 Free라면 Starter로 업그레이드 필요

### 3. 주요 메뉴 (왼쪽)
- **Events**: 배포 이력
- **Logs**: 실시간 서버 로그
- **Shell**: 서버 터미널 접속
- **Metrics**: CPU/메모리 사용량
- **Environment**: 환경 변수 설정 ⭐
- **Settings**: 서비스 설정

## 지금 해야 할 작업

### 순서대로 진행하세요:

#### 1️⃣ New + 버튼 클릭
화면 오른쪽 상단의 보라색 "New +" 버튼을 찾아 클릭

#### 2️⃣ PostgreSQL 선택
드롭다운 메뉴에서 PostgreSQL 선택

#### 3️⃣ 데이터베이스 생성
- Name: `athlete-time-db`
- 나머지는 기본값 사용
- Create Database 클릭

#### 4️⃣ 연결 정보 복사
생성 완료 후:
- PostgreSQL 대시보드로 이동
- "Connect" 섹션 확인
- "Internal Database URL" 복사 (⚠️ External 아님!)

#### 5️⃣ 백엔드에 연결
다시 "운동선수 시간" 서비스로 돌아와서:
- 왼쪽 메뉴 "Environment" 클릭
- "Add Environment Variable" 클릭
- Key: `DATABASE_URL`
- Value: [복사한 URL 붙여넣기]
- Save Changes

## 예상 결과

설정 완료 후:
- 서비스가 자동으로 재배포됨
- Logs에서 "✅ 데이터베이스 테이블 초기화 완료" 확인
- 이제 모든 데이터가 영구 저장됨!

## 현재 문제와 해결

### 문제
- 게시글이 새로고침하면 사라짐
- 채팅 기록이 유지되지 않음
- 서버 재시작 시 모든 데이터 손실

### 원인
- Render의 파일 시스템은 일시적 (ephemeral)
- JSON 파일 저장은 재배포 시 초기화됨
- Starter 플랜도 파일 시스템은 영구적이지 않음

### 해결책
- PostgreSQL 데이터베이스 사용
- 모든 데이터를 DB에 저장
- 서버 재시작해도 데이터 유지

## 도움이 필요하신가요?

막히는 부분이 있다면:
1. 어느 단계에서 막혔는지 알려주세요
2. 에러 메시지가 있다면 캡처해주세요
3. 함께 해결해드리겠습니다!

---

💡 **팁**: PostgreSQL Free 플랜은 90일 후 삭제될 수 있으니, 
장기적으로는 Starter 플랜 고려를 추천합니다.