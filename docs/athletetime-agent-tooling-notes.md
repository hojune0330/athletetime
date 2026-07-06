# AthleteTime Agent Tooling Notes

Last checked: 2026-06-21

## Git Bash MCP

Codex agents on this Windows machine should prefer the `git_bash` MCP for short shell/git commands, but should not use plain background jobs for long-running servers.

### Fixed Environment Issue

`C:\Users\SAMSUNG\.bashrc` had been saved as UTF-16LE and contained a broken multiline PATH export. Git Bash read it as binary-ish text and printed this on every command:

```text
/c/Users/SAMSUNG/.bashrc: line 1: $'\377\376export': command not found
```

It was replaced with UTF-8 text:

```bash
# Git Bash startup config for Codex/agent tooling.
export PATH="/bin:$PATH"
```

Backup created:

```text
C:\Users\SAMSUNG\.bashrc.bak-20260621-033300
```

### Long-Running Server Rule

Do not start Vite/Node servers in Git Bash MCP with a plain `&`:

```bash
npm --prefix frontend run dev &
node src/server.js &
```

The MCP call can remain attached to the child process and wait until timeout.

Use one of these instead:

```bash
nohup node src/server.js >/tmp/athletetime-server.log 2>&1 </dev/null &
```

Or, on Windows, prefer PowerShell `Start-Process` for long-running local QA servers:

```powershell
$backend = Start-Process -FilePath "node" -ArgumentList @("src/server.js") -WorkingDirectory (Get-Location) -WindowStyle Hidden -PassThru
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList @("--prefix","frontend","run","dev","--","--host","127.0.0.1","--port","5179") -WorkingDirectory (Get-Location) -WindowStyle Hidden -PassThru
```

Always record PIDs and stop them after QA.

### Frontend dev mode — API baseURL & remote backend (`.env.development` / `.env.development.remote`)

기본 로컬 개발(권장):
- 백엔드: `PORT=3005 node src/server.js` (또는 통합 서버)
- 프론트: `npm --prefix frontend run dev` (Vite, 5173)
- `frontend/.env.development`의 `VITE_API_BASE_URL`은 **비워둔다**. 그러면 `/api`가 상대경로 → Vite proxy → `localhost:3005`로 흐른다.
- 홈 D-day 보드처럼 로컬 최신 API를 타야 하는 화면을 이렇게 검수한다(이전 404/폴백 원인이던 절대 URL 트랩 제거).

Render 등 원격 백엔드로 확인할 때:
```bash
npm --prefix frontend run dev -- --mode development.remote
```
- `frontend/.env.development.remote`에 `VITE_API_BASE_URL=https://athletetime-backend.onrender.com`가 들어 있다.
- 즉, **dev 기본 = 로컬 proxy**, **remote 확인 = `--mode development.remote`**.
