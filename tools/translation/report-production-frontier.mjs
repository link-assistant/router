#!/usr/bin/env node
// Read-only report; no translation, regeneration, execution proof or caches.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {gunzipSync, gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {productionFrontierData} from './production-frontier-data.mjs';

const maxFileBytes = 64 * 1024 * 1024, maxTotalBytes = 512 * 1024 * 1024;
export function reportProductionFrontier(args) {
  const options = {};
  const names = new Set(['--root', '--inventory', '--functions', '--project', '--project-revision', '--project-producer-revision', '--missing-input-revision', '--output']);
  for (let at = 0; at < args.length; at += 2) {
    const key = args[at], value = args[at + 1];
    if (!names.has(key) || !value || Object.hasOwn(options, key)) throw new Error('Unknown, duplicate or incomplete frontier option: ' + key);
    options[key] = value;
  }
  if (!options['--functions'] || !options['--output']?.endsWith('.json.gz')) throw new Error('--functions and new --output FILE.json.gz are required');
  const root = fs.realpathSync(options['--root'] ?? process.cwd());
  const revisions = [options['--project-revision'], options['--project-producer-revision'], options['--missing-input-revision']].filter(Boolean);
  if (revisions.some(value => !/^[a-f0-9]{40}$/u.test(value))) throw new Error('Git read revisions must be complete immutable SHA1s');
  let totalBytes = 0;
  const bounded = bytes => {
    totalBytes += bytes.length;
    if (bytes.length > maxFileBytes || totalBytes > maxTotalBytes) throw new RangeError('Frontier input byte budget exceeded');
    return bytes;
  };
  const readFile = name => {
    const stat = fs.statSync(name);
    if (!stat.isFile() || stat.size > maxFileBytes) throw new Error('Bounded ordinary input file required: ' + name);
    return bounded(fs.readFileSync(name));
  };
  const gitRead = (revision, name) => {
    const result = spawnSync('git', ['show', revision + ':' + name], {cwd: root, maxBuffer: maxFileBytes, timeout: 30000});
    if (result.status !== 0) throw new Error('Complete Git input unavailable: ' + revision + ':' + name);
    return bounded(result.stdout);
  };
  const inputReadOrigins = [];
  const gitInputs = new Map();
  const readInput = name => {
    if (typeof name !== 'string' || !name || path.isAbsolute(name) || name.includes('\\') ||
        /[\x00-\x1f]/u.test(name) || name.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Relative repository input required');
    const physical = path.join(root, name);
    try {
      const actual = fs.realpathSync(physical);
      if (actual !== physical || !actual.startsWith(root + path.sep)) throw new Error('Linked or escaping repository input: ' + name);
      const bytes = readFile(physical);
      inputReadOrigins.push({path: name, origin: 'current-physical-file'});
      return bytes;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (options['--missing-input-revision']) {
        const bytes = gitInputs.has(name) ? gitInputs.get(name) : gitRead(options['--missing-input-revision'], name);
        inputReadOrigins.push({path: name, origin: 'explicit-git-object', revision: options['--missing-input-revision']});
        return bytes;
      }
      inputReadOrigins.push({path: name, origin: 'missing'});
      return null;
    }
  };
  const inventoryName = options['--inventory'] ?? 'parity/rust-source-inventory.json';
  const inventoryBytes = readInput(inventoryName);
  if (!inventoryBytes) throw new Error('Complete inventory missing');
  const projectName = options['--project'] ?? 'tools/translation/projects/rust/src/lib.meta.json';
  const projectDescriptorBytes = options['--project-revision'] ? gitRead(options['--project-revision'], projectName) : readInput(projectName);
  if (!projectDescriptorBytes) throw new Error('Complete project root descriptor missing');
  const packed = readFile(path.resolve(options['--functions']));
  const functionEvidenceBytes = options['--functions'].endsWith('.gz') ? bounded(gunzipSync(packed, {maxOutputLength: maxFileBytes})) : packed;
  if (options['--missing-input-revision']) {
    // Sparse checkouts can omit hundreds of DATA files. Read that explicitly
    // selected immutable snapshot in one bounded Git process, with exact binary
    // sizes; this is an invocation-local transport buffer, not a saved verdict.
    const inventory = JSON.parse(inventoryBytes), evidence = JSON.parse(functionEvidenceBytes);
    const descriptor = JSON.parse(projectDescriptorBytes), project = descriptor.root ?? descriptor;
    const names = new Set([...inventory.sources.map(row => row.source), ...Object.keys(inventory.implementationHashes),
      ...evidence.sources.map(row => row.metaPath), ...project.sources.map(row => row.source)]);
    const missing = [...names].filter(name => {
      if (typeof name !== 'string' || !name || path.isAbsolute(name) || name.includes('\\') ||
          /[\x00-\x1f]/u.test(name) || name.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Bounded relative Git input required');
      return !fs.existsSync(path.join(root, name));
    });
    if (missing.length) {
      const result = spawnSync('git', ['cat-file', '--batch'], {cwd: root, timeout: 60000, maxBuffer: maxTotalBytes,
        input: missing.map(name => options['--missing-input-revision'] + ':' + name + '\n').join('')});
      if (result.status !== 0) throw new Error('Complete sparse Git input batch unavailable');
      let cursor = 0;
      for (const name of missing) {
        const newline = result.stdout.indexOf(10, cursor);
        if (newline < 0) throw new Error('Truncated Git input header');
        const header = result.stdout.subarray(cursor, newline).toString('utf8'); cursor = newline + 1;
        if (header.endsWith(' missing')) { gitInputs.set(name, null); continue; }
        const match = /^[a-f0-9]{40} blob ([0-9]+)$/u.exec(header);
        if (!match) throw new Error('Ordinary Git blob required');
        const size = Number(match[1]), end = cursor + size;
        if (!Number.isSafeInteger(size) || size > maxFileBytes || end >= result.stdout.length || result.stdout[end] !== 10) throw new Error('Bounded complete Git blob required');
        gitInputs.set(name, bounded(result.stdout.subarray(cursor, end))); cursor = end + 1;
      }
      if (cursor !== result.stdout.length) throw new Error('Trailing Git batch data');
    }
  }
  const historicalProjectProducerBytes = options['--project-producer-revision'] ? gitRead(options['--project-producer-revision'], 'tools/translation/project.mjs') : undefined;
  const report = productionFrontierData({inventoryBytes, functionEvidenceBytes, projectDescriptorBytes, historicalProjectProducerBytes, readInput});
  report.projectProducerRead = options['--project-producer-revision'] ? {origin: 'explicit-git-object', revision: options['--project-producer-revision']} : {origin: 'observed-input'};
  report.inputReadOrigins = inputReadOrigins;
  const origins = new Map(inputReadOrigins.map(row => [row.path, row]));
  for (const row of report.vectors) row.observation = origins.get(row.path);
  const gitCompiler = report.vectors.filter(row => row.role === 'stored-compiler-input' && row.observation?.origin === 'explicit-git-object');
  report.staleness.unobservedPhysicalCompilerInputs = report.vectors.filter(row => row.role === 'stored-compiler-input' && row.observation?.origin !== 'current-physical-file').length;
  report.staleness.observedCompilerStatus = report.staleness.compilerStatus;
  if (gitCompiler.length) report.staleness.compilerStatus = 'mixed-physical-and-explicit-git-observations';
  report.staleness.unobservedPhysicalSourceInputs = report.vectors.filter(row => row.role === 'inventory-source' && row.observation?.origin !== 'current-physical-file').length;
  report.projectDescriptorRead = options['--project-revision'] ? {path: projectName, origin: 'explicit-git-object', revision: options['--project-revision']} : origins.get(projectName);
  report.limits = {maxFileBytes, maxTotalBytes, observedInputBytes: totalBytes};
  const text = Buffer.from(JSON.stringify(report) + '\n');
  if (text.length > maxTotalBytes) throw new RangeError('Frontier output byte budget exceeded');
  const compressed = gzipSync(text, {level: 6, mtime: 0});
  // Reopen the exact complete byte stream before committing an exclusive output.
  if (!gunzipSync(compressed, {maxOutputLength: maxTotalBytes}).equals(text)) throw new Error('Complete frontier gzip inverse differs');
  fs.writeFileSync(path.resolve(options['--output']), compressed, {flag: 'wx'});
  return {output: path.resolve(options['--output']), compressedBytes: compressed.length, decodedBytes: text.length,
    historicalCoverage: report.historicalCoverage, staleness: report.staleness, completeness: report.completeness,
    topStoredRefusals: report.exactRefusalGroups.slice(0, 20).map(row => ({key: row.key, records: row.records.length, distinctFunctions: row.functions.length})),
    executableGainMeasured: 0, semanticAuthority: false, runtimeParity: false};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { process.stdout.write(JSON.stringify(reportProductionFrontier(process.argv.slice(2))) + '\n'); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
