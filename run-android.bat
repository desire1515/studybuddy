@echo off
REM One-click build + sync + install for StudyBuddy Capacitor Android app
setlocal

REM Ensure we run from project root (where this script lives)
cd /d "%~dp0"

echo [1/5] Building Vite React app...
call npm run build || (echo Build failed && exit /b 1)

echo [2/5] Syncing Capacitor Android project...
call npx cap sync android || (echo Capacitor sync failed && exit /b 1)

echo [3/5] Cleaning and building Android debug APK...
cd android
call gradlew clean assembleDebug || (echo Gradle build failed && exit /b 1)

echo [4/5] Installing debug APK to connected device/emulator...
call gradlew installDebug || (echo Gradle install debug failed (no device?) && exit /b 1)

echo [5/5] Success! Verify device with adb:
adb devices || echo adb not found; add platform-tools to PATH and rerun

echo Done.
endlocal
