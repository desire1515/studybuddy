# install-temurin17.ps1
# Downloads Temurin 17 MSI, runs installer (elevated), sets JAVA_HOME (Machine), updates Path, runs Gradle build

$ErrorActionPreference = 'Stop'
$msi = Join-Path $env:TEMP 'temurin17.msi'
$url = 'https://github.com/adoptium/temurin17-binaries/releases/latest/download/OpenJDK17U-jdk_x64_windows_hotspot_latest.msi'

Write-Host "Downloading Temurin 17 from $url to $msi"
Invoke-WebRequest -Uri $url -OutFile $msi -UseBasicParsing

Write-Host "Running installer (you may be prompted for elevation)..."
Start-Process -FilePath msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart" -Verb runAs -Wait

Write-Host 'Detecting JDK installation folder...'
$candidates = @(
  'C:\Program Files\Eclipse Adoptium',
  'C:\Program Files\Adoptium',
  'C:\Program Files\Temurin',
  'C:\Program Files\Amazon Corretto',
  'C:\Program Files\Java'
)

$jdkPath = $null
foreach ($p in $candidates) {
  if (Test-Path $p) {
    $child = Get-ChildItem $p -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'jdk' -or $_.Name -match '17' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($child) { $jdkPath = $child.FullName; break }
  }
}

if (-not $jdkPath) {
  # fallback: search Program Files for likely JDK folders
  $alt = Get-ChildItem 'C:\Program Files' -Directory -ErrorAction SilentlyContinue | ForEach-Object { Get-ChildItem $_.FullName -Directory -ErrorAction SilentlyContinue } | Where-Object { $_.Name -match 'jdk|17|temurin|adoptium|corretto' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($alt) { $jdkPath = $alt.FullName }
}

if ($jdkPath) {
  Write-Host "Setting JAVA_HOME to $jdkPath (Machine scope)"
  [Environment]::SetEnvironmentVariable('JAVA_HOME', $jdkPath, 'Machine')
  $mp = [Environment]::GetEnvironmentVariable('Path','Machine')
  $bin = Join-Path $jdkPath 'bin'
  if ($mp -notlike "*$bin*") {
    [Environment]::SetEnvironmentVariable('Path', $mp + ';' + $bin, 'Machine')
    Write-Host "Added $bin to Machine Path"
  }
  # update current session
  $env:JAVA_HOME = $jdkPath
  $env:Path = $env:Path + ';' + $bin
  Write-Host "java version:"; java -version
} else {
  Write-Error 'JDK installed but could not detect installation path. Please set JAVA_HOME manually.'
}

# Run Gradle build
Write-Host 'Running Gradle assembleDebug...'
Push-Location (Join-Path $PSScriptRoot 'android')
try {
  & .\gradlew assembleDebug
} finally {
  Pop-Location
}

Write-Host 'Done.'
