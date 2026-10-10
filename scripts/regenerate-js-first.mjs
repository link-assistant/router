#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeJavaScript, translateJavaScript, parseMeta, emitRust, emitTypeScript } from '../tools/translation/js-to-rust/translator.mjs';
import { camelFromSnake } from '../tools/translation/js-to-rust/vendor/ir.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function modules(root, directory) {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? modules(root, `${directory}/${entry.name}`)
    : entry.name.endsWith('.mjs') ? [`${directory}/${entry.name}`] : []).sort();
}

export function decodeFixture(value) {
  if (value && typeof value === 'object' && '$number' in value) {
    return ({ NaN: Number.NaN, Infinity: Infinity, '-Infinity': -Infinity, '-0': -0 })[value.$number];
  }
  return value;
}

const rustLiteral = (value) => {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object') return ({ NaN: 'f64::NAN', Infinity: 'f64::INFINITY', '-Infinity': 'f64::NEG_INFINITY', '-0': '-0.0_f64' })[value.$number];
  const text = String(value);
  return text.includes('.') || /e/iu.test(text) ? `${text}_f64` : `${text}.0_f64`;
};

function rustFixtures(fixtures, program) {
  const functions = new Map(program.filter((item) => item.kind === 'function').map((item) => [camelFromSnake(item.name), item]));
  const rows = fixtures.cases.map((fixture) => {
    const item = functions.get(fixture.function);
    if (!item) throw new Error(`fixture names missing translated function ${fixture.function}`);
    const call = `${item.name}(${fixture.args.map(rustLiteral).join(', ')})`;
    let assertion;
    if (fixture.expected?.$number === 'NaN') assertion = `assert!(${call}.is_nan());`;
    else if (item.returns === 'number') assertion = `assert_eq!(${call}.to_bits(), (${rustLiteral(fixture.expected)}).to_bits());`;
    else assertion = `assert_eq!(${call}, ${rustLiteral(fixture.expected)});`;
    return `    #[test]\n    fn ${fixture.id.replace(/-/gu, '_')}() {\n        ${assertion}\n    }`;
  });
  return `\n#[cfg(test)]\n#[rustfmt::skip]\nmod shared_fixtures {\n    use super::*;\n\n${rows.join('\n\n')}\n}\n`;
}

export function buildArtifacts(root = ROOT) {
  const sources = modules(root, 'packages/javascript/portable');
  if (!sources.length) throw new Error('no authoritative portable JavaScript modules found');
  const sourceRows = [];
  const metas = [];
  for (const path of sources) {
    const source = readFileSync(join(root, path), 'utf8');
    const translated = translateJavaScript(source);
    metas.push(translated.meta);
    sourceRows.push({ path, sha256: sha256(source), bytes: Buffer.byteLength(source), functions: translated.program.filter((item) => item.kind === 'function').map((item) => ({ javascript: camelFromSnake(item.name), rust: item.name, parameters: item.params, returns: item.returns })) });
  }
  const meta = metas.join('');
  const program = parseMeta(meta);
  if (new Set(program.map((item) => item.name)).size !== program.length) throw new Error('duplicate portable definition across source modules');
  const fixturesPath = 'parity/fixtures/js-first/policy.json';
  const fixtureSource = readFileSync(join(root, fixturesPath), 'utf8');
  const fixtures = JSON.parse(fixtureSource);
  const header = `// GENERATED: node scripts/regenerate-js-first.mjs\n// JavaScript -> portable-router-v1 Links IR -> target; IR sha256=${sha256(meta)}\n`;
  const nativeCoverage = modules(root, 'packages/javascript/native').map((path) => {
    const source = readFileSync(join(root, path), 'utf8');
    const analyzed = analyzeJavaScript(source);
    return { path, sha256: sha256(source), sourceItems: analyzed.items.length, translatedItems: analyzed.program.length, unsupportedItems: analyzed.items.filter((item) => item.status === 'unsupported').length, diagnostics: analyzed.diagnostics };
  });
  const unsupported = JSON.parse(readFileSync(join(root, 'parity/fixtures/js-first/unsupported.json'), 'utf8')).map((fixture) => {
    const diagnostic = analyzeJavaScript(fixture.source).diagnostics[0];
    if (!diagnostic || diagnostic.kind !== fixture.kind) throw new Error(`unsupported fixture diagnostic changed: ${fixture.kind}`);
    return { ...fixture, message: diagnostic.message };
  });
  const artifacts = new Map([
    ['tools/translation/js-to-rust/generated/policy.lino', `# GENERATED: executable portable-router-v1 IR, no source envelopes.\n${meta}`],
    ['src/generated_js_first/policy.rs', `${header}#![allow(unused_parens, clippy::needless_return, clippy::float_cmp)]\n\n${emitRust(program)}${rustFixtures(fixtures, program)}`],
    ['src/generated_js_first/mod.rs', '// Generated from authoritative JavaScript policy kernels.\npub mod policy;\n'],
    ['packages/typescript/native/js-first-policy.ts', `${header}${emitTypeScript(program)}`],
  ]);
  const manifest = {
    schemaVersion: 1,
    translator: 'tools/translation/js-to-rust/translator.mjs',
    provenance: 'tools/translation/js-to-rust/provenance.json',
    fragment: 'portable-router-v1',
    contract: {
      status: 'bounded-executable-translation',
      wholeNativeImplementationTranslated: false,
      numbers: 'JavaScript Number and Rust f64, IEEE-754 binary64; NaN and signed zero preserved by min/max encodings',
      strings: 'Unicode scalar strings; length counts UTF-16 code units; Rust String cannot represent unpaired UTF-16 surrogate input',
      runtime: 'Node >=20; TypeScript strict; generated Rust uses only std',
      arguments: 'Callers supply the JSDoc annotated primitive types; JavaScript implicit coercion is not part of this fragment',
      unsupportedPolicy: 'strict portable regeneration fails; native source census reports refusals without source envelopes',
    },
    sources: sourceRows,
    fixtures: { path: fixturesPath, sha256: sha256(fixtureSource), cases: fixtures.cases.length, expectedResults: 'independently authored JSON, not generated from the JavaScript implementation' },
    nativeCoverage,
    unsupportedExamples: unsupported,
    outputs: [...artifacts].map(([path, content]) => ({ path, bytes: Buffer.byteLength(content), sha256: sha256(content) })),
  };
  artifacts.set('parity/js-first-translation.json', json(manifest));
  return artifacts;
}

export function regenerate(root = ROOT, { check = false } = {}) {
  const artifacts = buildArtifacts(root);
  const changed = [];
  for (const [path, content] of artifacts) {
    const absolute = join(root, path);
    if (existsSync(absolute) && readFileSync(absolute, 'utf8') === content) continue;
    changed.push(path);
    if (!check) {
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content);
    }
  }
  return { changed, bytes: [...artifacts.values()].reduce((sum, value) => sum + Buffer.byteLength(value), 0) };
}

if (process.argv[1] && relative(ROOT, process.argv[1]) === relative(ROOT, fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--check', '--write'].includes(arg))) throw new Error('usage: node scripts/regenerate-js-first.mjs [--check|--write]');
  const check = args.includes('--check');
  const result = regenerate(ROOT, { check });
  if (check && result.changed.length) {
    console.error(`JavaScript-first artifacts differ: ${result.changed.join(', ')}. Run node scripts/regenerate-js-first.mjs.`);
    process.exitCode = 1;
  } else console.log(`JavaScript-first ${check ? 'regeneration verified' : 'regenerated'}: ${result.bytes} bytes; ${result.changed.length} changed artifacts.`);
}
