# install-adb.ps1 — Detect or install Android platform-tools and add to User PATH
# Run in PowerShell: .\install-adb.ps1

$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if ($adbCmd) {
  Write-Host "adb already available: $($adbCmd.Path)"
  adb version
  exit 0
}

# Common locations to check
$paths = @(
  "$env:LOCALAPPDATA\Android\Sdk\platform-tools",
  "$env:USERPROFILE\Downloads\platform-tools",
  "C:\Program Files\Android\platform-tools",
  "C:\Android\platform-tools"
)

$found = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($found) {
  $pt = $found
  Write-Host "Found platform-tools at: $pt"
} else {
  $installDir = "$env:LOCALAPPDATA\Android\platform-tools"
  $consent = Read-Host "platform-tools not found. Download and install to '$installDir'? (Y/N)"
  if ($consent -notin 'Y','y') { Write-Error 'Aborted by user.'; exit 1 }

  $zip = Join-Path $env:TEMP 'platform-tools.zip'
  $url = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'
  Write-Host "Downloading platform-tools..."
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing

  Write-Host "Extracting..."
  $tmp = Join-Path $env:TEMP 'platform-tools'
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $env:TEMP -Force

  if (Test-Path $tmp) {
    if (Test-Path $installDir) { Remove-Item $installDir -Recurse -Force }
    Move-Item -Path $tmp -Destination $installDir
    Remove-Item $zip -Force
    $pt = $installDir
    Write-Host "Installed platform-tools to: $pt"
  } else {
    Write-Error "Extraction failed; expected folder: $tmp"; exit 1
  }
}

# Add to User PATH if not already present (PowerShell v5 compatible)
$userPath = [Environment]::GetEnvironmentVariable('Path','User')
if ($null -eq $userPath) { $userPath = '' }
if ($userPath -notlike "*$pt*") {
  if ($userPath -eq '') { $newUserPath = $pt } else { $newUserPath = $userPath + ';' + $pt }
  [Environment]::SetEnvironmentVariable('Path', $newUserPath, 'User')
  # also update current session PATH so we can use adb immediately
  $env:Path = $env:Path + ';' + $pt
  Write-Host "Added platform-tools to User PATH."
} else {
  Write-Host "platform-tools already in User PATH."
}

# Verify adb
$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if ($adbCmd) {
  Write-Host "adb available now at: $($adbCmd.Path)"
  adb version
  Write-Host "Run 'adb devices' to verify your device connection."
} else {
  Write-Error "adb still not found. Restart your terminal or sign out/in to apply PATH changes."
}
