# Acceptance gate for the standalone installer of the generated Notes fixture.
# Execute on a fresh Windows runner (ideally also repeat on a pristine consumer VM).
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$SetupPath,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '../../build/acceptance-evidence')
)
$ErrorActionPreference='Stop'
$setup=(Resolve-Path $SetupPath).Path
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$report=[ordered]@{started=(Get-Date).ToUniversalTime().ToString('o');installer=$setup;installerSha256=(Get-FileHash $setup -Algorithm SHA256).Hash.ToLowerInvariant();tests=[ordered]@{};pass=$false;environment='Windows clean CI runner with Node/Yarn excluded from runtime PATH'}
try{
  if(-not [Environment]::Is64BitOperatingSystem){throw 'Expected Windows x64 test runner'}
  # NSIS per-user setup. No installed OpenForge, Node or Yarn is invoked.
  $installer=Start-Process -FilePath $setup -ArgumentList '/S' -PassThru -Wait
  if($installer.ExitCode -ne 0){throw "NSIS setup exited $($installer.ExitCode)"}
  $report.tests.installation='passed'
  $app=Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'Programs') -Filter 'OpenForge Notes.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  if(-not $app -or -not (Test-Path $app)){throw 'Installed OpenForge Notes.exe was not found'}
  $report.installedExe=$app
  $report.tests.installedExecutable='passed'
  $savedPath=$env:Path
  $env:Path="$env:SystemRoot\System32;$env:SystemRoot;$env:SystemRoot\System32\Wbem"
  Remove-Item Env:NODE_PATH,Env:NODE_OPTIONS,Env:npm_config_prefix,Env:OPENFORGE_NODE,Env:OPENFORGE_NPM_CLI -ErrorAction SilentlyContinue
  # Get-Command avoids leaving a nonzero native $LASTEXITCODE when the runtime is absent.
  $node=Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue
  $yarn=Get-Command yarn.cmd -CommandType Application -ErrorAction SilentlyContinue
  if($node -or $yarn){throw 'Node or Yarn is unexpectedly discoverable on the acceptance PATH'}
  $report.tests.noDevelopmentRuntimeInPath='passed'
  $selftest=Join-Path $OutputDirectory 'packaged-selftest.json'
  $env:OPENFORGE_SELFTEST_OUTPUT=$selftest
  $process=Start-Process -FilePath $app -ArgumentList '--openforge-selftest' -Wait -PassThru
  if($process.ExitCode -ne 0){throw "Packaged application self-test exited $($process.ExitCode)"}
  if(-not (Test-Path $selftest)){throw 'Packaged runtime did not produce self-test evidence'}
  $check=Get-Content $selftest -Raw | ConvertFrom-Json
  if(-not($check.ok -and $check.packaged -and $check.nodeBundled -and $check.electronBundled) -or $check.missing.Count -gt 0){throw 'Bundled runtime or packaged resources self-test failed'}
  $report.tests.bundledRuntime='passed'
  Remove-Item Env:OPENFORGE_SELFTEST_OUTPUT -ErrorAction SilentlyContinue
  $startup=Join-Path $OutputDirectory 'normal-startup.json'
  $env:OPENFORGE_STARTUP_OUTPUT=$startup
  $running=Start-Process -FilePath $app -PassThru
  $stopwatch=[Diagnostics.Stopwatch]::StartNew()
  while(-not(Test-Path $startup) -and $stopwatch.Elapsed.TotalSeconds -lt 45){Start-Sleep -Milliseconds 500}
  if(-not(Test-Path $startup)){throw 'Installed application did not finish loading its window'}
  $opened=Get-Content $startup -Raw | ConvertFrom-Json
  if(-not($opened.loaded -and $opened.packaged -and $opened.windowVisible -and $opened.url.StartsWith('file:'))){throw 'Installed application window failed to load from packaged local files'}
  $report.tests.normalLaunch='passed'
  if($running -and -not $running.HasExited){Stop-Process -Id $running.Id -Force -ErrorAction SilentlyContinue}
  $env:Path=$savedPath
  $report.pass=$true
  Write-Host 'PASS: clean runner installed and launched the standalone Electron application without Node, Yarn or OpenForge on PATH.'
}catch{
  $report.error=$_.Exception.Message
  Write-Error "FAIL: $($report.error)"
}finally{
  $report.completed=(Get-Date).ToUniversalTime().ToString('o')
  $out=Join-Path $OutputDirectory 'windows-generated-app-acceptance.json'
  $report|ConvertTo-Json -Depth 8|Set-Content $out -Encoding UTF8
  Write-Host "Acceptance evidence: $out"
  if(-not $report.pass){exit 1}
  # Explicit success is required by GitHub Actions even after earlier native probes.
  exit 0
}
