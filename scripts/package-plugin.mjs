#!/usr/bin/env node
// Package a plugin folder into plugin.zip (manifest.json at the archive root)
// and print its SHA-256 — attach the zip to a GitHub Release, put the sha in the PR.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error('usage: node package-plugin.mjs <plugin-dir>');
  process.exit(1);
}
const dir = resolve(src);
if (!existsSync(resolve(dir, 'manifest.json'))) {
  console.error('error: manifest.json not found in', dir);
  process.exit(1);
}
const out = resolve('plugin.zip');
execFileSync('rm', ['-f', out]);
// zip the CONTENTS of the dir so manifest.json sits at the archive root,
// excluding dev junk (run against a clean dist folder, not a checkout).
execFileSync(
  'zip',
  ['-r', '-q', out, '.', '-x', '.git/*', 'node_modules/*', '.DS_Store', '*.swp', '.env', '.env.*'],
  { cwd: dir },
);
const sha = createHash('sha256').update(readFileSync(out)).digest('hex');
console.log(`plugin.zip  (${basename(dir)})`);
console.log(`sha256: ${sha}`);
