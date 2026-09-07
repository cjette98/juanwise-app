#!/usr/bin/env node
/**
 * Builds a release APK and bumps the app version on every build.
 *
 * `app.json` is the single source of truth for versions: `android/` is
 * generated (and gitignored), so `expo prebuild` copies `expo.version` into
 * versionName and `expo.android.versionCode` into versionCode.
 *
 * Usage:
 *   npm run build:apk                  # patch bump  (1.0.0 -> 1.0.1)
 *   npm run build:apk -- --minor       # minor bump  (1.0.1 -> 1.1.0)
 *   npm run build:apk -- --major       # major bump  (1.1.0 -> 2.0.0)
 *   npm run build:apk -- --set 2.3.4   # explicit version
 *   npm run build:apk -- --no-bump     # rebuild the current version
 *   npm run build:apk -- --clean       # prebuild --clean before building
 *   npm run build:apk -- --dry-run     # show the version change, build nothing
 *
 * versionCode is always incremented, except with --no-bump.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appJsonPath = join(root, 'app.json');
const packageJsonPath = join(root, 'package.json');
const outputDir = join(root, 'builds');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const explicitVersion = (() => {
  const i = args.findIndex((a) => a === '--set' || a.startsWith('--set='));
  if (i === -1) return null;
  const value = args[i].startsWith('--set=') ? args[i].slice('--set='.length) : args[i + 1];
  if (!value || !/^\d+\.\d+\.\d+$/.test(value)) {
    fail(`--set expects a semver version like 1.2.3, got: ${value ?? '(nothing)'}`);
  }
  return value;
})();

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function bump(version, level) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    fail(`expo.version in app.json is not a semver version: ${version}`);
  }
  const [major, minor, patch] = parts;
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function run(command, commandArgs, cwd = root) {
  console.log(`\n$ ${command} ${commandArgs.join(' ')}`);
  execFileSync(command, commandArgs, { cwd, stdio: 'inherit' });
}

const appJson = readJson(appJsonPath);
const expo = appJson.expo ?? fail('app.json has no "expo" key');
const currentVersion = expo.version ?? fail('app.json has no expo.version');
const currentVersionCode = expo.android?.versionCode ?? 1;

const level = has('--major') ? 'major' : has('--minor') ? 'minor' : 'patch';
const nextVersion = has('--no-bump')
  ? currentVersion
  : (explicitVersion ?? bump(currentVersion, level));
const nextVersionCode = has('--no-bump') ? currentVersionCode : currentVersionCode + 1;

console.log(
  `JuanWise release APK\n` +
    `  version:     ${currentVersion} -> ${nextVersion}\n` +
    `  versionCode: ${currentVersionCode} -> ${nextVersionCode}`
);

if (has('--dry-run')) {
  console.log('\n--dry-run: nothing written, nothing built.');
  process.exit(0);
}

if (!has('--no-bump')) {
  expo.version = nextVersion;
  expo.android = { ...expo.android, versionCode: nextVersionCode };
  writeJson(appJsonPath, appJson);

  const packageJson = readJson(packageJsonPath);
  packageJson.version = nextVersion;
  writeJson(packageJsonPath, packageJson);
  console.log('\n✔ Updated app.json and package.json');
}

// Sync the generated android/ project with the new version, then build.
run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install', ...(has('--clean') ? ['--clean'] : [])]);
run('./gradlew', ['assembleRelease'], join(root, 'android'));

const builtApk = join(root, 'android/app/build/outputs/apk/release/app-release.apk');
mkdirSync(outputDir, { recursive: true });
const destination = join(outputDir, `juanwise-${nextVersion}-${nextVersionCode}.apk`);
copyFileSync(builtApk, destination);

console.log(`\n✔ APK ready: ${destination.replace(`${root}/`, '')}`);
