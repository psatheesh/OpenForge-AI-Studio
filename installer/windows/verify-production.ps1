# Final release gate. Run only on a Windows host AFTER native compilation and UI verification.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Installer,[string]$EvidenceDirectory='release-evidence')
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if(!(Test-Path $Installer)){ throw "Installer file not found: $Installer" }
$signature=Get-AuthenticodeSignature -FilePath $Installer
if($signature.Status -ne 'Valid'){ throw "Release blocked: Authenticode signature is $($signature.Status)" }
foreach($file in @('windows-native-build.json','windows-clean-install.json','windows-ui-e2e.json','security-review.json','windows-signing.json')){
  $e=Join-Path (Join-Path $root $EvidenceDirectory) $file
  if(!(Test-Path $e)){ throw "Release blocked: missing evidence $file" }
  $record=Get-Content -Raw $e | ConvertFrom-Json
  if($record.status -ne 'pass'){throw "Release blocked: $file does not record a pass"}
}
if(!(Test-Path (Join-Path $root 'yarn.lock'))){throw 'Release blocked: no committed dependency lockfile'}
$sum=(Get-FileHash $Installer -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Host "Release checks passed for $Installer"
Write-Host "SHA256: $sum"
