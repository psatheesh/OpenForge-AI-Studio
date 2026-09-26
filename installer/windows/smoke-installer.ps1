# Clean-user installation smoke test for CI / Windows build host.
[CmdletBinding()]
param([switch]$SkipLaunch)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$setup=Get-ChildItem (Join-Path $root 'dist') -Filter 'OpenForge-AI-Studio-Setup-*.exe' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if(-not $setup){ throw 'Expected installer executable is absent' }
$hash=(Get-FileHash $setup.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $($setup.Name)" | Set-Content (Join-Path $root 'dist/SHA256SUMS.txt') -Encoding ascii
Write-Host "Installer exists: $($setup.Name) SHA256: $hash"
if($SkipLaunch){return}
# Electron Builder NSIS supports /S silent installation.
$setupProcess=Start-Process $setup.FullName -ArgumentList '/S' -PassThru -Wait
if($setupProcess.ExitCode -ne 0){throw "Installer failed with exit code $($setupProcess.ExitCode)"}
$app=Join-Path $env:LOCALAPPDATA 'Programs/OpenForge AI Studio/OpenForge AI Studio.exe'
if(-not (Test-Path $app)){
  # Electron Builder may alter installation directory naming across versions.
  $app=Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Programs') -Filter 'OpenForge AI Studio.exe' -Recurse -ErrorAction SilentlyContinue |
      Select-Object -First 1 -ExpandProperty FullName
}
if(-not $app -or -not (Test-Path $app)){throw 'Silent installer completed but desktop application is missing'}
Write-Host "Installation successful: $app"
# Starting Theia in an unattended runner is best-effort; a release is not
# production-verified until full interactive UI and AI model tests are recorded.
