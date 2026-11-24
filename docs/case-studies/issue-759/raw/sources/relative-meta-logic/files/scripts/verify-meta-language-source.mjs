#!/usr/bin/env node
/** Verify the shipped official-source snapshot; --source also compares a pinned checkout. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function verifyMetaLanguageSource({ source } = {}) {
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'js/vendor/meta-language-provenance.json')));
  assert.equal(provenance.schema, 'rml-upstream-meta-language/v1');
  assert.match(provenance.revision, /^[a-f0-9]{40}$/);
  for (const item of [provenance.license, provenance.corpus]) {
    assert.equal(hash(fs.readFileSync(path.join(root, item.archive ?? item.path))), item.sha256, item.archive ?? item.path);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'js/package.json')));
  assert.equal(manifest.imports['#meta-language'], './vendor/meta-language/js/src/index.js');
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'js/package-lock.json')));
  for (const [name, version] of Object.entries(provenance.javascript.consumerDependencyVersions)) {
    assert.equal(manifest.dependencies[name], version);
    assert.equal(lock.packages[`node_modules/${name}`].version, version);
    assert.ok(lock.packages[`node_modules/${name}`].integrity?.startsWith('sha512-'));
  }
  const cargo = fs.readFileSync(path.join(root, 'rust/Cargo.toml'), 'utf8');
  assert.equal(provenance.rust.revision, provenance.revision);
  assert.equal(provenance.submodule.revision, provenance.revision);
  assert.equal(provenance.rust.defaultFeatures, false);
  assert.equal(provenance.rust.version, provenance.sourceVersion);
  assert.equal(provenance.release.tag, `v${provenance.sourceVersion}`);
  assert.equal(provenance.rust.source, 'registry+https://github.com/rust-lang/crates.io-index');
  assert.match(provenance.rust.checksum, /^[a-f0-9]{64}$/);
  for (const directory of ['rust', 'rust/control-flow', 'rust/relational-kernel', 'rust/linked-target']) {
    const locked = fs.readFileSync(path.join(root, directory, 'Cargo.lock'), 'utf8')
      .split('[[package]]').filter(item => /^\s*name = "meta-language"\n/u.test(item));
    assert.equal(locked.length, 1, `${directory}: one meta-language package`);
    for (const [name, value] of Object.entries({ version: provenance.rust.version, source: provenance.rust.source, checksum: provenance.rust.checksum })) {
      assert.ok(locked[0].includes(`${name} = "${value}"`), `${directory}: meta-language ${name}`);
    }
  }
  assert.ok(cargo.includes(`meta-language = { version = "=${provenance.rust.version}", default-features = false }`));
  assert.ok(fs.readFileSync(path.join(root, 'rust/control-flow/Cargo.toml'), 'utf8')
    .includes(`meta-language = { version = "=${provenance.rust.version}", default-features = false }`));
  const packageRoot = path.join(root, provenance.javascript.directory);
  const upstreamManifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json')));
  assert.equal(upstreamManifest.version, provenance.sourceVersion);
  assert.deepEqual(upstreamManifest.dependencies, provenance.javascript.upstreamDependencyVersions);
  const runtimeFiles = fs.readdirSync(path.join(packageRoot, 'src'), { recursive: true })
    .map(file => `src/${file.split(path.sep).join('/')}`).filter(file => fs.statSync(path.join(packageRoot, file)).isFile());
  assert.deepEqual([...runtimeFiles, 'README.md', 'package.json'].sort(), provenance.javascript.files.map(file => file.path).sort());
  let sourceRoot;
  if (source) {
    sourceRoot = path.resolve(source);
    assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim(), provenance.revision);
    assert.equal(hash(fs.readFileSync(path.join(sourceRoot, 'LICENSE'))), provenance.license.sha256);
    assert.equal(hash(fs.readFileSync(path.join(sourceRoot, provenance.corpus.sourcePath))), provenance.corpus.sha256);
  }
  for (const file of provenance.javascript.files) {
    assert.ok(!file.path.split('/').includes('..') && !path.isAbsolute(file.path));
    assert.equal(hash(fs.readFileSync(path.join(packageRoot, file.path))), file.sha256, `installed ${file.path}`);
    if (sourceRoot) assert.equal(hash(fs.readFileSync(path.join(sourceRoot, 'js', file.path))), file.sha256, `upstream ${file.path}`);
  }
  return { revision: provenance.revision, releaseVersion: provenance.sourceVersion, rustSource: provenance.rust.source, verifiedFiles: provenance.javascript.files.length, sourceFiles: provenance.javascript.directory };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--source')) throw new Error('Usage: verify-meta-language-source.mjs [--source pinned-checkout]');
  console.log(JSON.stringify(verifyMetaLanguageSource({ source: args[1] })));
}
