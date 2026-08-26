$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root "index.html"
$scriptPath = Join-Path $root "script.js"
$release = Get-Date -Format "yyyyMMdd-HHmm"

$index = Get-Content -LiteralPath $indexPath -Raw
$index = [regex]::Replace($index, '\?v=\d{8}-\d{4}', "?v=$release")
$index = [regex]::Replace($index, 'Version: \d{8}-\d{4}', "Version: $release")
Set-Content -LiteralPath $indexPath -Value $index -NoNewline

$script = Get-Content -LiteralPath $scriptPath -Raw
$script = [regex]::Replace($script, 'const appRelease = "\d{8}-\d{4}";', "const appRelease = `"$release`";")
Set-Content -LiteralPath $scriptPath -Value $script -NoNewline

Write-Host "Updated To Do Lizard release stamp to $release"
