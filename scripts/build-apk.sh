#!/usr/bin/env bash
# Builds a release APK and copies it to release/skelp.apk
# Needs: Node 20+, JDK 17+, Android SDK (ANDROID_HOME) with platform 36, build-tools 36.0.0 and NDK 27.1.12297006
#
# Signing: Android only installs an update over an app signed with the same key, so releases must
# always be signed with the Skelp! release key. Point these at it:
#   SKELP_KEYSTORE            path to the keystore file
#   SKELP_KEYSTORE_PASSWORD   its password
#   SKELP_KEY_ALIAS           key alias (default: skelp)
# Without them the APK keeps the public debug signature: fine for testing, never for a release.
set -euo pipefail
cd "$(dirname "$0")/.."
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
ABIS="${ABIS:-arm64-v8a,armeabi-v7a}"

[ -d node_modules ] || npm ci
npx expo prebuild --platform android --no-install --clean
node scripts/patch-tcp-socket.js
(cd android && ./gradlew --no-daemon assembleRelease -PreactNativeArchitectures="$ABIS" -Pexpo.useLegacyPackaging=true)
mkdir -p release
cp android/app/build/outputs/apk/release/app-release.apk release/skelp.apk

if [ -n "${SKELP_KEYSTORE:-}" ]; then
  tools=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
  "$tools/zipalign" -f -p 4 release/skelp.apk release/skelp-aligned.apk
  mv release/skelp-aligned.apk release/skelp.apk
  "$tools/apksigner" sign --ks "$SKELP_KEYSTORE" --ks-key-alias "${SKELP_KEY_ALIAS:-skelp}" \
    --ks-pass env:SKELP_KEYSTORE_PASSWORD --key-pass env:SKELP_KEYSTORE_PASSWORD release/skelp.apk
  rm -f release/skelp.apk.idsig
  "$tools/apksigner" verify --print-certs release/skelp.apk | grep -i "SHA-256" || true
  echo "Signed with the release key."
else
  echo "WARNING: no SKELP_KEYSTORE set - this APK is debug-signed and cannot update an installed release."
fi
ls -lh release/skelp.apk
