/**
 * Small build tweaks for the generated Android project:
 *  - Crashlytics does not upload the R8 mapping file at build time (builds must work offline).
 *  - the APK asks for no install-packages permission beyond what the in-app updater needs.
 */
const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withSkelpAndroid(config) {
  return withAppBuildGradle(config, (cfg) => {
    const marker = "// skelp: no crashlytics mapping upload";
    if (!cfg.modResults.contents.includes(marker)) {
      cfg.modResults.contents += `
${marker}
project.plugins.withId("com.google.firebase.crashlytics") {
    android.buildTypes.configureEach { buildType ->
        buildType.firebaseCrashlytics { mappingFileUploadEnabled = false }
    }
}
`;
    }
    return cfg;
  });
};
