[CmdletBinding()]
param(
  [switch]$IncludeBrowser
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$requiredPaths = @(
  '.git',
  'package.json',
  'src',
  'backend',
  'frontend',
  'data'
)

function Invoke-PreflightStep {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  Write-Host "[preflight] $Name"
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "Preflight step failed: $Name"
  }
}

foreach ($requiredPath in $requiredPaths) {
  if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot $requiredPath))) {
    throw "This does not look like a complete AthleteTime repository: missing $requiredPath"
  }
}

$gitRoot = (& git -C $repositoryRoot rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($gitRoot) -ne [IO.Path]::GetFullPath($repositoryRoot)) {
  throw 'Run the preflight from the checked-out AthleteTime repository, not from a parent or temporary folder.'
}

Push-Location $repositoryRoot
try {
  Invoke-PreflightStep 'repository cleanup boundary' {
    node --test backend/tests/test-cleanup-boundary.test.js
  }
  Invoke-PreflightStep 'data and public-boundary checks' {
    node --test backend/tests/data-request-sensitive-input.test.js backend/tests/record-event-normalization.test.js backend/tests/launch-interaction-safety.test.js
  }
  Invoke-PreflightStep 'frontend type check' {
    npm.cmd --prefix frontend run type-check
  }
  Invoke-PreflightStep 'frontend production build' {
    npm.cmd --prefix frontend run build:check
  }

  if ($IncludeBrowser) {
    Invoke-PreflightStep 'serial full regression including browser flows' {
      npm.cmd test
    }
  } else {
    Write-Host '[preflight] Browser regression is intentionally skipped. Run with -IncludeBrowser from an isolated worktree when the focused checks are green.'
  }
} finally {
  Pop-Location
}
