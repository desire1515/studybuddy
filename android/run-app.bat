@echo off
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_SDK_ROOT=C:\Users\DESIRE\AppData\Local\Android\Sdk
set PATH=%PATH%;C:\Users\DESIRE\AppData\Local\Android\Sdk\platform-tools
cd /d "%~dp0"
adb shell am start -n com.studybuddy.app/.MainActivity

