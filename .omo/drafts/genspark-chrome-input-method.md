# Draft: Genspark Chrome Input Method

## Problem
- Chrome extension Playwright `locator.fill`, `locator.type`, `dom_cua.type`, and `tab.clipboard.writeText` can fail on Genspark with: `Browser Use virtual clipboard is not installed`.
- Plain Windows `SendKeys` can paste into the Codex app by mistake if Chrome is not the active OS window.
- Hardcoding a Korean Chrome window title is brittle because PowerShell output can display mojibake.

## Working Method
1. Claim the existing Genspark Chrome tab through the Chrome browser-client.
2. Verify the target tab URL contains `genspark.ai/agents?id=7b8d92d6-5591-4db9-a1c5-9f6349e5e473`.
3. Use `dom_cua.get_visible_dom()` and confirm the textarea:
   - `node_id=2`
   - `name="query"`
   - placeholder `Ask Genspark to modify or improve your app...`
4. Focus the textarea with Chrome automation:
   - `await gensparkPlanningTab.dom_cua.click({ node_id: '2' })`
5. Discover and activate the real Chrome OS window before any Windows keyboard automation:
   - Prefer `Get-Process chrome | Where-Object MainWindowTitle` over hardcoded window titles.
   - Confirm `WScript.Shell.AppActivate(...)` returns `true`.
6. Put the target message in the Windows clipboard with a retry loop.
7. Send `Ctrl+A`, then `Ctrl+V` through `System.Windows.Forms.SendKeys`.
8. Verify paste using Chrome automation:
   - Read `textarea[name="query"]` value.
   - Confirm expected head/tail and length.
9. Submit by clicking the visible white send button at the lower-right of the chat input, not by `Ctrl+Enter`.
   - Verified coordinate on the 1897x789 screenshot used in this session: approximately `x=552`, `y=655`.
   - Use `await gensparkPlanningTab.cua.click({ x: 552, y: 655 })`.
10. Verify submission by checking the DOM for the sent message appearing as a new chat entry and the textarea becoming empty.

## Safety Notes
- Do not use raw Windows `SendKeys` until Chrome activation has returned `true`.
- Do not assume `Ctrl+Enter` submits in Genspark; in this session it did not.
- Do not rely on `locator.fill`/`type` for long Korean text in this page; it routes through the unavailable virtual clipboard.
- Always run a short ASCII test first if the browser state has changed.
- After OS paste, read the textarea value before submitting.
- If the Chrome title changed, re-run the title discovery step. Never paste until the discovered title clearly belongs to the target Genspark tab.

## Reusable PowerShell Paste Skeleton
```powershell
$msg = @'
...message...
'@

$chrome = Get-Process chrome |
  Where-Object { $_.MainWindowTitle -match 'Genspark|Agent|Claude|AthleteTime|26' } |
  Select-Object -First 1
if (-not $chrome) { throw 'Target Chrome/Genspark window not found' }

$tries = 0
while ($tries -lt 5) {
  try {
    Set-Clipboard -Value $msg
    break
  } catch {
    Start-Sleep -Milliseconds 200
    $tries += 1
  }
}
if ($tries -ge 5) { throw 'Clipboard set failed' }

$ws = New-Object -ComObject WScript.Shell
$activated = $ws.AppActivate($chrome.MainWindowTitle)
if (-not $activated) { throw 'Chrome Genspark window activation failed' }

Start-Sleep -Milliseconds 500
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('^a')
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait('^v')
```

## Reusable Submit Skeleton
```js
await gensparkPlanningTab.cua.click({ x: 552, y: 655 });
await gensparkPlanningTab.playwright.waitForTimeout(4000);
```
