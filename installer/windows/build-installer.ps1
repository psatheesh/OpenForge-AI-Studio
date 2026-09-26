# One-click RELEASE BUILDER for Windows hosts. Produces the end-user setup.exe.
# Users of the resulting installer do NOT need Node.js or Yarn installed.
[CmdletBinding()]
param(
  [string]$NodeVersion = '22.16.0',
  [string]$YarnVersion = '1.22.22',
  [switch]$Offline,
  [switch]$SkipTests
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$tools=Join-Path $root '.build-tools'
$cache=Join-Path $root 'installer/cache'
$nodeZip=Join-Path $cache "node-v$NodeVersion-win-x64.zip"
$nodeDir=Join-Path $tools "node-v$NodeVersion-win-x64"
$nodeExe=Join-Path $nodeDir 'node.exe'
$yarnBin=Join-Path $tools 'yarn/node_modules/.bin/yarn.cmd'
New-Item -ItemType Directory -Force -Path $tools,$cache | Out-Null
function Invoke-Required([string]$exe,[string[]]$argv){
  & $exe @argv
  if($LASTEXITCODE -ne 0){throw "Failed ($LASTEXITCODE): $exe $($argv -join ' ')"}
}
function Verify-NodeArchive([string]$filename,[string]$shasums){
  $entry=Get-Content $shasums | Where-Object {$_ -match "^([a-fA-F0-9]{64})\s+$([regex]::Escape($filename))$"} | Select-Object -First 1
  if(-not $entry){throw "No SHA256 entry for $filename"}
  $expected=($entry -split '\s+')[0].ToLowerInvariant()
  $actual=(Get-FileHash (Join-Path $cache $filename) -Algorithm SHA256).Hash.ToLowerInvariant()
  if($expected -ne $actual){throw 'Node archive SHA256 mismatch'}
}
Write-Host 'OpenForge: Preparing build tools (Node and Yarn only needed for the builder)'
$shasums=Join-Path $cache "SHASUMS256-v$NodeVersion.txt"
if(-not (Test-Path $nodeExe)){
  if(-not (Test-Path $nodeZip)){
    if($Offline){throw "Offline cache missing: $nodeZip"}
    $base="https://nodejs.org/dist/v$NodeVersion"
    Invoke-WebRequest "$base/node-v$NodeVersion-win-x64.zip" -OutFile $nodeZip -UseBasicParsing
  }
  if(-not (Test-Path $shasums)){
    if($Offline){throw "Offline cache missing: $shasums"}
    Invoke-WebRequest "https://nodejs.org/dist/v$NodeVersion/SHASUMS256.txt" -OutFile $shasums -UseBasicParsing
  }
  Verify-NodeArchive "node-v$NodeVersion-win-x64.zip" $shasums
  Expand-Archive -Path $nodeZip -DestinationPath $tools -Force
}
$env:PATH="$nodeDir;$env:PATH"
$env:npm_config_cache=Join-Path $cache 'npm'
$env:YARN_CACHE_FOLDER=Join-Path $cache 'yarn'
# Bundled npm from the verified Node.js ZIP installs a locally isolated Yarn Classic.
if(-not (Test-Path $yarnBin)){
  if($Offline -and -not (Test-Path $env:npm_config_cache)){
    throw 'Offline Yarn cache missing. First create the offline cache using an online build.'
  }
  $npmCmd=Join-Path $nodeDir 'npm.cmd'
  $args=@('install','--prefix',(Join-Path $tools 'yarn'),"yarn@$YarnVersion",'--ignore-scripts','--no-audit','--no-fund')
  if($Offline){$args+='--offline'}
  Invoke-Required $npmCmd $args
}
Push-Location $root
try {
  Write-Host 'OpenForge: Installing pinned dependencies'
  $install=@('install','--non-interactive')
  if($Offline){$install+='--offline'}
  Invoke-Required $yarnBin $install
  if(-not $SkipTests){
    Write-Host 'OpenForge: Running verification tests'
    Invoke-Required $nodeExe @('--test','tests/unified.test.cjs')
    Invoke-Required $nodeExe @('--test','tests/installer.test.cjs')
    Invoke-Required $nodeExe @('--check','scripts/electron-entry.cjs')
    Invoke-Required $nodeExe @('--check','packages/openforge-workbench/server.js')
  }
  Write-Host 'OpenForge: Building Theia/Electron production application'
  Invoke-Required $yarnBin @('build:desktop:production')
  Write-Host 'OpenForge: Bundling private Node/npm runtime for generated-app builds'
  $runtimeNode=Join-Path $root 'installer/runtime/node'
  New-Item -ItemType Directory -Force -Path $runtimeNode | Out-Null
  Copy-Item -Path (Join-Path $nodeDir '*') -Destination $runtimeNode -Recurse -Force
  if(-not (Test-Path (Join-Path $runtimeNode 'node_modules/npm/bin/npm-cli.js'))){throw 'Portable npm runtime missing'}
  Write-Host 'OpenForge: Packaging Windows setup executable'
  # electron-builder is a build-time dependency. Electron embeds the runtime.
  $builder=Join-Path $root 'node_modules/.bin/electron-builder.cmd'
  Invoke-Required $builder @('--win','nsis','--x64','--publish','never')
  $exe=Get-ChildItem (Join-Path $root 'dist') -Filter 'OpenForge-AI-Studio-Setup-*.exe' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if(-not $exe){throw 'Build command returned success but installer is missing'}
  $hash=(Get-FileHash $exe.FullName -Algorithm SHA256).Hash
  Write-Host "Installer: $($exe.FullName)"
  Write-Host "SHA256: $hash"
  # The release still requires installation smoke tests and security/engineering reviews.
} finally {Pop-Location}
