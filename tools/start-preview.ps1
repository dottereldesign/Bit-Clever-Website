$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$previewUrl = 'http://127.0.0.1:4175'
function Get-Preview {
    try { Invoke-RestMethod -Uri "$previewUrl/__preview/health" -TimeoutSec 2 } catch { $null }
}
try {
    $running = Get-Preview
    if (-not $running) {
        $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
        $logDirectory = Join-Path $projectRoot '.local'
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $serverPath = Join-Path $PSScriptRoot 'preview-server.cjs'
        $process = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'preview.log') -RedirectStandardError (Join-Path $logDirectory 'preview-error.log')
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            Start-Sleep -Milliseconds 200
            $running = Get-Preview
            if ($running) { break }
            if ($process.HasExited) { throw 'The preview could not start. Check .local/preview-error.log; port 4175 may be in use.' }
        }
    }
    if (-not $running -or $running.app -ne 'bit-clever-preview' -or $running.root -ne $projectRoot) {
        throw 'The local preview is unavailable or port 4175 belongs to another project.'
    }
    Start-Process $previewUrl
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'Bit Clever preview') | Out-Null
    exit 1
}
