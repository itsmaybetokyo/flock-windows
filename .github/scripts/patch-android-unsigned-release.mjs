import { readFile, writeFile } from "node:fs/promises";

// Expo's prebuild template signs release builds with the debug keystore. Removing
// that line makes `assembleRelease` emit app-release-unsigned.apk instead.
const path = process.argv[2] ?? "apps/mobile/android/app/build.gradle";
const source = await readFile(path, "utf8");
const release = source.indexOf("release {");
if (release < 0) throw new Error(`release build type not found in ${path}`);
const signing = source.indexOf("signingConfig signingConfigs.debug", release);
if (signing < 0) throw new Error(`release signingConfig not found in ${path}`);
const lineStart = source.lastIndexOf("\n", signing) + 1;
const lineEnd = source.indexOf("\n", signing);
const patched = source.slice(0, lineStart) + source.slice(lineEnd + 1);
await writeFile(path, patched);
console.log(`Removed the release signingConfig from ${path}`);
