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

### Windows browser-test startup lock

The records browser-test fixture already serializes only its Vite startup through `backend/tests/records-flow-e2e-startup-lock.js`. `records-flow-e2e-fixture.js` calls `startViteWithLock()` before it starts Vite; on Windows the helper uses a workspace-specific named pipe, waits for contention to clear, and releases the lock as soon as the local server is ready. Separate workspaces do not block one another.

For a startup-lock timeout, use this safe sequence:

1. Let the currently running browser-test invocation finish or stop normally, then inspect its test output for the startup-lock timeout or Vite startup error.
2. Run the lock-only proof: `node --test --test-name-pattern=RECORDS-E2E-STARTUP-LOCK backend/tests/records-recovery-e2e.test.js`.
3. Re-run the browser test normally. The fixture acquires and releases the lock itself; do not create, rename, or remove manual lock artifacts.

### Full-test workspace integrity

Before a long `npm test` run, confirm that the current folder has `.git`, `package.json`, `src`, `backend`, and `frontend/src`. Run the suite from an isolated clone or worktree, never from the only local copy of unpushed work.

The `TEST-CLEANUP-BOUNDARY-001` contract rejects test commands and test cleanup helpers that directly target the repository root. Test cleanup may remove only a purpose-built temporary directory or a narrowly named test artifact. If the required project markers disappear during a run, stop immediately, preserve the command context, and restore from the last pushed commit before doing any further work. Do not try to continue in a partially removed folder.

Use `powershell -ExecutionPolicy Bypass -File scripts/run-release-preflight.ps1`
for the safe focused check. It verifies the repository markers, runs the
cleanup, public-boundary, type, and build checks, and never removes files. Add
`-IncludeBrowser` only from an isolated worktree after the focused check is
green; that is the one deliberate opt-in to the longer serial browser suite.

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
