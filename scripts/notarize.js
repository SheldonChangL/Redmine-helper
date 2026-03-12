/**
 * electron-builder afterSign hook — notarizes the macOS .app bundle.
 *
 * Required environment variables (set in GitHub Actions secrets):
 *   APPLE_ID                   — your Apple Developer account email
 *   APPLE_APP_SPECIFIC_PASSWORD — app-specific password from appleid.apple.com
 *   APPLE_TEAM_ID              — 10-character Team ID from developer.apple.com
 *
 * If APPLE_ID is not set the step is silently skipped, so local builds work
 * without Apple credentials.
 */
exports.default = async function notarizing(context) {
  if (context.electronPlatformName !== 'darwin') return;

  if (!process.env.APPLE_ID) {
    console.log('[notarize] APPLE_ID not set — skipping notarization.');
    return;
  }

  const { notarize } = require('@electron/notarize');

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${context.appOutDir}/${appName}.app`;

  console.log(`[notarize] Notarizing ${appPath} …`);

  await notarize({
    tool:                 'notarytool',
    appPath,
    appleId:              process.env.APPLE_ID,
    appleIdPassword:      process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId:               process.env.APPLE_TEAM_ID,
  });

  console.log('[notarize] Done.');
};
