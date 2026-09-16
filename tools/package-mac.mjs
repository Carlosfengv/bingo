import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

function runBuilder(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "electron-builder", ...args], { cwd: projectRoot, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`Packaging failed (${signal || code})`)));
  });
}

/** Only installers leave the hidden temporary build directory. Never launch its app. */
export async function packageMac({
  builder = runBuilder,
  outputDirectory = path.join(projectRoot, "release"),
  temporaryDirectory = os.tmpdir(),
  buildVersion = new Date().toISOString().replace(/\D/g, ""),
  electronDist = process.env.BINGO_ELECTRON_DIST,
} = {}) {
  const staging = await fs.mkdtemp(path.join(temporaryDirectory, ".bingo-package-"));
  try {
    const args = ["--mac", "dmg", "zip", "--arm64", "--publish", "never",
      `-c.directories.output=${staging}`, `-c.buildVersion=${buildVersion}`,
      "-c.artifactName=${productName}-${version}-${buildVersion}-${os}-${arch}.${ext}"];
    if (electronDist) args.push(`-c.electronDist=${electronDist}`);
    await builder(args);
    const files = (await fs.readdir(staging, { withFileTypes: true }))
      .filter(entry => entry.isFile() && /\.(dmg|zip|blockmap)$/.test(entry.name)).map(entry => entry.name);
    if (!files.some(name => name.endsWith(".dmg")) || !files.some(name => name.endsWith(".zip"))) {
      throw new Error("Packaging finished without both DMG and ZIP installers");
    }
    await fs.mkdir(outputDirectory, { recursive: true });
    for (const name of files) await fs.copyFile(path.join(staging, name), path.join(outputDirectory, name), fs.constants.COPYFILE_EXCL);
    return files.map(name => path.join(outputDirectory, name));
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageMac().then(files => console.log(files.join("\n"))).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
