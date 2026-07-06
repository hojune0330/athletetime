# AthleteTime 배포 대상 확정 (오너 결정 기록)

> 결정일: 2026-07-06 · 결정자: 오너(hojune0330) · 기록: Claude (GenSpark AI Developer)
> 이 문서는 오너의 명시적 결정을 기록한 것으로, 변경하려면 오너 승인이 필요하다.

---

## 1. 저장소 지형도

| 저장소 | 역할 | 상태 |
|---|---|---|
| `hojune0330/2026-first-item` | **신규 개발 저장소** (현재 작업 중인 이 repo) | 개발 진행 중 |
| `hojune0330/athletetime` | **최종 이식·호스팅·운영 저장소** | 현재 프로덕션 운영 중 |

> (참고) 현재 프로덕션 도메인 `athlete-time.netlify.app`은 도메인 이름에만 하이픈이 있을 뿐,
> 배포 소스는 `athletetime` repo다.

---

## 2. 현재 프로덕션 (`athletetime` repo 기준)

- **프론트**: Netlify — https://athlete-time.netlify.app (정적 배포)
- **백엔드**: Render — https://athletetime-backend.onrender.com
  - Express + `ws`(WebSocket) + PostgreSQL + Cloudinary
  - `/health` 확인됨 (v4.0.0, database connected)
  - 익명 채팅 WebSocket 정상 동작 (rooms: main/training/race/injury) — HTTP/1.1 101 핸드셰이크 확인
  - `/api/posts`, `/api/marketplace` 등 실데이터 보유 (커뮤니티 글, 마켓 물품)

## 3. 이식 방향 (확정된 것)

- `2026-first-item`에서 개발한 신규 서비스(React SPA + 통합 Express 서버)를
  `athletetime` repo로 이식하여 실서비스를 호스팅·관리한다.
- 신규 개발물은 "단일 Express 서버가 프론트+API를 같은 origin에서 서빙"하는 구조
  (`VITE_API_BASE_URL=""`)로, 레거시와 같은 Render 배포 방식과 호환된다.

## 4. 이식 시 반드시 다뤄야 할 것 (마이그레이션 체크리스트 초안)

1. **데이터 연속성**: 레거시 PostgreSQL의 커뮤니티 글·댓글·마켓 물품을 유실 없이 승계
2. **URL 호환**: 기존에 공유된 링크(`athlete-time.netlify.app/...`)가 새 구조에서 깨지지 않도록 리다이렉트 계획
3. **채팅 통합**: 레거시 `backend/utils/websocket.js`의 ws 채팅을 신규 통합 서버에 흡수
   (신규 프론트 `useWebSocket.ts`의 `VITE_WS_URL`이 이 서버를 가리키도록)
4. **배포 전환 순서**: 신규 배포 검증 → 도메인 전환 → 레거시 백엔드 종료 (동시 전환 금지)
5. **환경 변수**: JWT_SECRET, ZERO_RESULT_SEARCH_SECRET, DATABASE_URL, Cloudinary 키 등 프로덕션 시크릿 이관
