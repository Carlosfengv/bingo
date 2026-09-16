const path = require("node:path");
const { execFileSync } = require("node:child_process");

/**
 * Apple Silicon requires a valid code signature even for a local test build.
 * Apply an ad-hoc signature first; electron-builder can replace it with a
 * configured Developer ID signature later in the packaging lifecycle.
 */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("/usr/bin/codesign", [
    "--force",
    "--deep",
    "--sign",
    "-",
    "--timestamp=none",
    appPath,
  ], { stdio: "inherit" });
};
