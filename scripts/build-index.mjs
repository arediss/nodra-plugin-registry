#!/usr/bin/env node
// Build plugins.json from repos.json: for each approved repo, take its latest
// release's plugin.zip, read the manifest inside, enforce permissions ⊆
// approved_permissions, and record the download URL + SHA-256.
// Runs in CI with `gh` + `unzip` available (GITHUB_TOKEN set).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8' });
const repos = JSON.parse(readFileSync('repos.json', 'utf8')).repos ?? [];
const out = [];

for (const { repo, approved_permissions = [] } of repos) {
  // One bad repo (no release, malformed zip, unapproved perms) is skipped and
  // logged — it must never abort the whole index for every other plugin.
  try {
    const release = JSON.parse(gh(['api', `repos/${repo}/releases/latest`]));
    const asset = (release.assets ?? []).find((a) => a.name === 'plugin.zip');
    if (!asset) throw new Error('no plugin.zip in latest release');

    const dir = mkdtempSync(join(tmpdir(), 'plg-'));
    gh(['release', 'download', release.tag_name, '--repo', repo, '--pattern', 'plugin.zip', '--dir', dir]);
    const zip = join(dir, 'plugin.zip');
    const sha256 = createHash('sha256').update(readFileSync(zip)).digest('hex');
    execFileSync('unzip', ['-o', '-q', zip, 'manifest.json', '-d', dir]);
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));

    const bad = (m.permissions ?? []).filter((p) => !approved_permissions.includes(p));
    if (bad.length) throw new Error(`permissions not approved: ${bad.join(', ')}`);

    out.push({
      id: m.id, name: m.name, version: m.version, api_version: m.api_version,
      description: m.description, author: m.author, permissions: m.permissions,
      category: m.category, keywords: m.keywords,
      download_url: asset.browser_download_url, sha256,
    });
  } catch (e) {
    console.warn(`skip ${repo}: ${e.message}`);
  }
}

writeFileSync('plugins.json', JSON.stringify({ version: 1, plugins: out }, null, 2) + '\n');
console.log(`wrote plugins.json with ${out.length} plugin(s)`);
