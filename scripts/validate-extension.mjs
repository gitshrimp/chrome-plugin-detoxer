import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const extensionDir = path.join(root, 'Detoxer');
const manifestPath = path.join(extensionDir, 'manifest.json');
const backgroundPath = path.join(extensionDir, 'background.js');

assert.ok(fs.existsSync(extensionDir), 'Detoxer/ directory is missing');
assert.ok(fs.existsSync(manifestPath), 'Detoxer/manifest.json is missing');
assert.ok(fs.existsSync(backgroundPath), 'Detoxer/background.js is missing');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const backgroundSource = fs.readFileSync(backgroundPath, 'utf8');

assert.equal(manifest.manifest_version, 3, 'manifest_version must be 3');
assert.equal(typeof manifest.name, 'string', 'manifest.name must be a string');
assert.ok(manifest.name.length > 0, 'manifest.name must not be empty');
assert.equal(typeof manifest.version, 'string', 'manifest.version must be a string');
assert.ok(/^\d+\.\d+(\.\d+)?$/.test(manifest.version), 'manifest.version must look like x.y or x.y.z');
assert.equal(manifest.background?.service_worker, 'background.js', 'background.service_worker must point to background.js');
assert.ok(Array.isArray(manifest.permissions), 'manifest.permissions must be an array');
assert.ok(manifest.permissions.includes('activeTab'), 'manifest.permissions must include activeTab');
assert.ok(manifest.permissions.includes('scripting'), 'manifest.permissions must include scripting');

const icons = manifest.action?.default_icon;
assert.ok(icons && typeof icons === 'object', 'action.default_icon must be defined');
for (const size of ['16', '32', '48', '128']) {
  const iconPath = icons[size];
  assert.equal(typeof iconPath, 'string', `default_icon[${size}] must be a string`);
  assert.ok(fs.existsSync(path.join(extensionDir, iconPath)), `Missing icon file for size ${size}: ${iconPath}`);
}

assert.match(backgroundSource, /chrome\.action\.onClicked\.addListener/, 'background.js must register a chrome.action click listener');
assert.match(backgroundSource, /chrome\.scripting\.executeScript/, 'background.js must use chrome.scripting.executeScript');

new Function(backgroundSource);

console.log('Extension validation passed.');
