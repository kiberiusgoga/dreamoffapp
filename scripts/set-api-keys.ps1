# Sets the AI keys in server/.env without opening an editor.
#
#   powershell -ExecutionPolicy Bypass -File scripts\set-api-keys.ps1
#
# The keys are typed at a prompt, so they never appear in a command line, in
# shell history, or on screen. Press Enter alone to leave a key unchanged.

$ErrorActionPreference = 'Stop'

$envPath = Join-Path $PSScriptRoot '..\server\.env'
$envPath = [System.IO.Path]::GetFullPath($envPath)

if (-not (Test-Path $envPath)) {
    Write-Host "Not found: $envPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Editing $envPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Gemini       interpretation and the Oracle chat"
Write-Host "               https://aistudio.google.com/apikey"
Write-Host "  Hugging Face the dream image"
Write-Host "               https://huggingface.co/settings/tokens"
Write-Host ""
Write-Host "  Press Enter alone to leave a key as it is." -ForegroundColor DarkGray
Write-Host ""

# Read-Host without -AsSecureString so a paste is visible enough to check, but
# the value still never reaches a command line or the history file.
$gemini = Read-Host 'GEMINI_API_KEY'
$hf     = Read-Host 'HUGGINGFACE_API_KEY'

# Keep every other line exactly as it is, comments included.
$lines = [System.IO.File]::ReadAllLines($envPath)

function Set-Key {
    param($lines, $name, $value)
    if ([string]::IsNullOrWhiteSpace($value)) { return $lines }

    $trimmed = $value.Trim().Trim('"').Trim("'")
    $found = $false
    $out = foreach ($line in $lines) {
        if ($line -match "^$name=") { $found = $true; "$name=$trimmed" } else { $line }
    }
    if (-not $found) { $out = $out + "$name=$trimmed" }
    return $out
}

$lines = Set-Key $lines 'GEMINI_API_KEY' $gemini
$lines = Set-Key $lines 'HUGGINGFACE_API_KEY' $hf

# UTF-8 with no byte order mark. Set-Content in Windows PowerShell writes a BOM,
# which would attach itself to the first variable name in the file.
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($envPath, $lines, $utf8NoBom)

Write-Host ""
Write-Host "Saved. Current values:" -ForegroundColor Green
foreach ($line in [System.IO.File]::ReadAllLines($envPath)) {
    if ($line -match '^(GEMINI_API_KEY|HUGGINGFACE_API_KEY)=(.*)$') {
        $v = $matches[2].Trim()
        $shown = if ($v) { "$($v.Substring(0, [Math]::Min(6, $v.Length)))... ($($v.Length) chars)" } else { "(empty - feature off)" }
        Write-Host ("  {0,-20} {1}" -f $matches[1], $shown)
    }
}

Write-Host ""
Write-Host "Restart the server for this to take effect." -ForegroundColor Yellow
Write-Host "tsx watch follows imports, and .env is read at startup rather than imported."
Write-Host ""
