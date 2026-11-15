#!/usr/bin/env bash
# Builds a release APK and copies it to release/skelp.apk
# Needs: Node 20+, JDK 17+, Android SDK (ANDROID_HOME) with platform 36, build-tools 36.0.0 and NDK 27.1.12297006
set -euo pipefail
cd "$(dirname "$0")/.."
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
ABIS="${ABIS:-arm64-v8a,armeabi-v7a}"

[ -d node_modules ] || npm ci
npx expo prebuild --platform android --no-install --clean
(cd android && ./gradlew --no-daemon assembleRelease -PreactNativeArchitectures="$ABIS" -Pexpo.useLegacyPackaging=true)
mkdir -p release
cp android/app/build/outputs/apk/release/app-release.apk release/skelp.apk
ls -lh release/skelp.apk
