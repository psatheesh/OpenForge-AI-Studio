# Prepare an OPTIONAL offline AI edition from explicitly approved cached binaries.
# Does not assume that a proprietary or third-party model may be redistributed.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$OllamaExe,
  [Parameter(Mandatory=$true)][string]$ModelDirectory,
  [Parameter(Mandatory=$true)][string]$ModelName,
  [Parameter(Mandatory=$true)][string]$OllamaSHA256
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$out=Join-Path $root 'installer/offline'
if(-not (Test-Path $OllamaExe -PathType Leaf)){throw 'Ollama executable not found'}
if(-not (Test-Path $ModelDirectory -PathType Container)){throw 'Ollama model cache not found'}
$actual=(Get-FileHash $OllamaExe -Algorithm SHA256).Hash
if($actual -ine $OllamaSHA256){throw 'Ollama executable SHA256 mismatch'}
$manifest=Join-Path $ModelDirectory 'manifests'
$blobs=Join-Path $ModelDirectory 'blobs'
if(-not (Test-Path $manifest) -or -not (Test-Path $blobs)){throw 'Require a complete Ollama model cache including manifests and blobs'}
New-Item -Force -ItemType Directory (Join-Path $out 'ollama'),(Join-Path $out 'models') | Out-Null
Copy-Item $OllamaExe (Join-Path $out 'ollama/ollama.exe') -Force
Copy-Item (Join-Path $ModelDirectory '*') (Join-Path $out 'models') -Recurse -Force
$files=@(Get-ChildItem (Join-Path $out 'models') -File -Recurse | ForEach-Object { $_.FullName.Substring((Join-Path $out 'models').Length+1).Replace('\','/') })
@{format=1;models=@(@{name=$ModelName;files=$files});ollamaSHA256=$actual} |
  ConvertTo-Json -Depth 10 | Set-Content (Join-Path $out 'bundle-manifest.json') -Encoding UTF8
Write-Host "Offline model bundle ready: $ModelName. Confirm license allows redistribution."
