import { copyFileSync, existsSync, mkdirSync, cpSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const files = [["src/http/dashboard.html", "dist/http/dashboard.html"]];

for (const [src, dest] of files) {
  const srcPath = join(root, src);
  const destPath = join(root, dest);
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  copyFileSync(srcPath, destPath);
  console.log(`Copied ${src} -> ${dest}`);
}

const assetsSrc = join(root, "src/http/assets");
const assetsDest = join(root, "dist/http/assets");
if (existsSync(assetsSrc)) {
  rmSync(assetsDest, { recursive: true, force: true });
  cpSync(assetsSrc, assetsDest, { recursive: true });
  console.log("Copied assets directory to dist/http/assets");
}