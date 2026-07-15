# G-002 검증 증거

> 실행일: 2026-07-14
> 기준: `main` `dddb3da2709e7376e7d5406067b190a7ed9c5079`

## 환경 복구

첫 검증 실행은 의존성이 설치되지 않은 상태여서 실패했다. 이 실패를 숨기지 않고, 아래 명령으로 root와 frontend 의존성을 복구한 뒤 동일 검증을 다시 실행했다.

```powershell
npm ci
npm --prefix frontend ci
```

결과: 설치 복구 완료. 이후 focused test, full suite, frontend build 통과.

## 테스트와 빌드

```powershell
node --test backend/tests/coverage-matrix.test.js
npm test
npm run build:check --prefix frontend
```

| 검증 | 결과 |
|---|---|
| focused test | PASS, 6/6 |
| full suite | 243 total, 238 pass, 0 fail, 5 skip |
| frontend build | PASS |

## 독립 데이터 카운트

연도별 `data/results/2015.json`부터 `2026.json`까지를 `index.json` 없이 독립 순회해 파일 수, 결과묶음, `events`, 결과행과 파일 byte 합계를 계산했다.

```powershell
node -e "const fs=require('fs');let files=0,bundles=0,events=0,rows=0,bytes=0;for(let y=2015;y<=2026;y++){const p='data/results/'+y+'.json';const a=JSON.parse(fs.readFileSync(p,'utf8'));files++;bundles+=a.length;bytes+=fs.statSync(p).size;for(const b of a){events+=(b.events||[]).length;for(const e of b.events||[])rows+=(e.results||[]).length}}console.log({files,bundles,events,rows,bytes})"
```

결과: `files=12`, `bundles=239`, `events=10086`, `rows=94195`, `bytes=26365866`.

## 보안과 no-go

```powershell
npm audit
npm --prefix frontend audit
git diff --numstat -- data/results data/competitions package.json package-lock.json frontend/package.json frontend/package-lock.json
```

- root audit: moderate 8, high 4.
- frontend audit: low 1, moderate 6, high 10, critical 1. Critical direct dependency는 `jspdf`다.
- `data/results`, `data/competitions`, root/frontend package 및 lock 파일 diff: 0.
- 테스트가 만든 임시 디렉터리와 파일 정리: OK.

테스트 통과는 취약점 해소를 뜻하지 않는다. dependency security는 별도 P0 작업과 Fable 승인을 유지한다.
