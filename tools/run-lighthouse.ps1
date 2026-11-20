param(
  [string]$Url = 'https://dottereldesign.github.io/Bit-Clever-Website/',
  [string]$Stage = 'after',
  [int]$Runs = 3,
  [string]$ChromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
  [string]$NodePath = '.local/audit-runtime/node_modules/node/bin/node.exe',
  [string]$LighthousePath = '.local/audit-runtime/node_modules/lighthouse/cli/index.js'
)
# Isolated headless Chrome, default Lighthouse throttling, one run at a time.
$ErrorActionPreference = 'Stop'
if ($Stage -notmatch '^[a-z0-9-]+$') { throw 'Stage must contain lowercase letters, digits or hyphens.' }
$env:CHROME_PATH = $ChromePath
foreach ($profile in @('mobile','desktop')) {
  foreach ($run in 1..$Runs) {
    $output = ".local/lighthouse-$Stage-$profile-$run"
    $auditArgs = @($Url,'--chrome-flags=--headless --no-sandbox','--output=json','--output=html',"--output-path=$output",'--quiet')
    if ($profile -eq 'desktop') { $auditArgs += '--preset=desktop' }
    & $NodePath $LighthousePath @auditArgs
    if ($LASTEXITCODE -ne 0) { throw "Lighthouse failed: $profile run $run" }
    $report = Get-Content "$output.report.json" -Raw | ConvertFrom-Json
    if ($report.runtimeError) { throw $report.runtimeError.message }
    Write-Output "$Stage $profile $run : performance $($report.categories.performance.score), accessibility $($report.categories.accessibility.score), best practices $($report.categories.'best-practices'.score), SEO $($report.categories.seo.score), TBT $($report.audits.'total-blocking-time'.displayValue)"
  }
}
