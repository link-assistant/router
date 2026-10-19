#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeJavaScriptIndependentCorpus, translateJavaScript, parseMeta, emitRust, emitTypeScript } from '../tools/translation/js-to-rust/translator.mjs';
import { camelFromSnake } from '../tools/translation/js-to-rust/vendor/ir.mjs';
import { buildNativePortableArtifacts, buildNativePortableArtifactsCorpusBulk } from '../tools/translation/js-to-rust/native-portable-artifacts.mjs';

import {repositoryRustLayout} from '../tools/translation/repository-layout.mjs';
import {buildOwnedCoreDocumentArtifacts} from '../tools/translation/js-to-rust/owned-core-corpus.mjs';
import {encodeWord} from '../tools/translation/js-to-rust/vendor/lino.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value)}\n`;

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

function buildArtifactsSelected(root = ROOT, definitions=false, matrix,ownedBuilder) {
  const sources = modules(root, 'js/portable');
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
  const nativeSources = modules(root, 'js/src').map((path) => {
    if (lstatSync(join(root, path)).isSymbolicLink()) throw new Error(`linked native source: ${path}`);
    const source = readFileSync(join(root, path), 'utf8');
    return { path, source };
  });
  const nativeDraft = nativeSources.length === 0
    ? buildNativePortableArtifacts(nativeSources)
    : buildNativePortableArtifactsCorpusBulk(nativeSources);
  const nativeCoverage = nativeDraft.manifest.modules.map(({ path, sha256, topLevel }) => ({ path, sha256,
    sourceItems: topLevel.sourceItems, translatedItems: topLevel.translatedItems,
    unsupportedItems: topLevel.unsupportedItems, diagnostics: topLevel.diagnostics }));
  const unsupportedFixtures = JSON.parse(readFileSync(join(root, 'parity/fixtures/js-first/unsupported.json'), 'utf8'));
  const unsupportedCorpus = unsupportedFixtures.length === 0 ? {analyses:[]}
    : analyzeJavaScriptIndependentCorpus(unsupportedFixtures.map((fixture,index) => ({path:'unsupported-fixture-'+index,source:fixture.source})));
  const unsupported = unsupportedFixtures.map((fixture,index) => {
    const diagnostic = unsupportedCorpus.analyses[index].analysis.diagnostics[0];
    if (!diagnostic || diagnostic.kind !== fixture.kind) throw new Error(`unsupported fixture diagnostic changed: ${fixture.kind}`);
    return { ...fixture, message: diagnostic.message };
  });
  const rustSource=repositoryRustLayout(root).productionPrefix;
  const artifacts = new Map([
    ['tools/translation/js-to-rust/generated/policy.lino', `# GENERATED: executable portable-router-v1 IR, no source envelopes.\n${meta}`],
    [`${rustSource}generated_js_first/policy.rs`, `${header}#![allow(unused_parens, clippy::needless_return, clippy::float_cmp)]\n\n${emitRust(program)}${rustFixtures(fixtures, program)}`],
    [`${rustSource}generated_js_first/mod.rs`, '// Generated from authoritative JavaScript policy kernels.\npub mod policy;\n'],
    ['ts/src/js-first-policy.ts', `${header}${emitTypeScript(program)}`],
  ]);
  for (const [path, content] of nativeDraft.artifacts) artifacts.set(path, content);
  const ownedDraft=definitions?ownedBuilder(root,{matrix}):buildOwnedCoreDocumentArtifacts(root);
  const legacyArtifactPaths=definitions?new Set([...artifacts.keys(),...ownedDraft.legacyArtifactPaths]):null;
  for(const [path,content]of ownedDraft.artifacts)artifacts.set(path,content);
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
    nativePortableDraft: { manifest: 'parity/js-native-portable-draft.json', topLevel: nativeDraft.manifest.topLevel,
      scopedFunctions: nativeDraft.manifest.scopedFunctions, wholeNativeImplementationTranslated: false, runtimeParity: false },
    unsupportedExamples: unsupported,
    ownedCoreDraft:{manifest:'parity/js-owned-core-reverse-draft.json',...ownedDraft.manifest.totals,runtimeParity:false},
    outputs: (definitions?[...artifacts].filter(([path])=>legacyArtifactPaths.has(path)):[...artifacts]).map(([path, content]) => ({ path, bytes: Buffer.byteLength(content), sha256: sha256(content) })),
  };
  artifacts.set('parity/js-first-translation.json', json(manifest));
  return artifacts;
}

export function buildArtifacts(root = ROOT){return buildArtifactsSelected(root);}
export async function buildArtifactsWithOwnedDefinitions(root = ROOT,{matrix=false}={}){const [owned,profiles]=await Promise.all([import('../tools/translation/js-to-rust/owned-core-definition-corpus.mjs'),import('../tools/translation/compilation-matrix.mjs')]);return buildArtifactsSelected(root,true,matrix?profiles.createCompilationMatrix({profiles:profiles.DECLARED_FAMILY_PROFILES}):undefined,owned.buildOwnedCoreDefinitionArtifacts);}
function applyArtifactsSelected(root,{check=false}={},artifacts,definitionCleanup,matrix=false){
  const changed = [];
  const witnessPrefix='tools/translation/js-to-rust/generated/owned-core-witness';
  const witnessIndex=join(root,witnessPrefix+'-inputs.json'),previousWitness=new Map();
  if(existsSync(witnessIndex)){
    if(lstatSync(witnessIndex).isSymbolicLink()||lstatSync(witnessIndex).size>32*1024*1024)throw Error('Invalid old owned witness index');
    const previous=JSON.parse(readFileSync(witnessIndex,'utf8'));
    if(previous.schema!=='owned-core-reverse-ci-witness-v1'||!Array.isArray(previous.stagedReceivingInputs?.files))throw Error('Unknown old owned witness index');
    for(const row of previous.stagedReceivingInputs.files)if(typeof row.path==='string'&&row.path.startsWith(witnessPrefix+'/')&&typeof row.source==='string')previousWitness.set(row.path,row.source);
  }
  // Empty current programs are emitted too, so a newly refused body cannot
  // survive. Removed source modules also remove only recognized owned drafts.
  for (const directory of ['tools/translation/js-to-rust/generated/native-portable', 'ts/src/portable-draft','tools/translation/js-to-rust/generated/owned-core','ts/generated/reverse-owned-core',witnessPrefix]) {
    const visit = (path) => {
      if (!existsSync(join(root, path))) return;
      if (lstatSync(join(root, path)).isSymbolicLink()) throw new Error(`linked generated draft: ${path}`);
      for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
        const child = `${path}/${entry.name}`;
        if (entry.isSymbolicLink()) throw new Error(`linked generated draft: ${child}`);
        if (entry.isDirectory()) visit(child);
        else if (!artifacts.has(child)) {
          if (previousWitness.get(child)!==readFileSync(join(root,child),'utf8')&&!(child.endsWith('/inputs.json')&&JSON.parse(readFileSync(join(root,child),'utf8')).schema==='owned-core-reverse-original-inputs-v1')&&!readFileSync(join(root, child), 'utf8').startsWith(entry.name.endsWith('.lino') ? '# GENERATED:' : '// GENERATED:')) {
            throw new Error(`unrecognized stale native draft: ${child}`);
          }
          changed.push(child);
          if (!check) rmSync(join(root, child));
        }
      }
    };
    visit(directory);
  }
  for(const path of [witnessPrefix+'.rs',witnessPrefix+'.lino',witnessPrefix+'-inputs.json']){
    const absolute=join(root,path);if(!existsSync(absolute)||artifacts.has(path))continue;
    if(lstatSync(absolute).isSymbolicLink())throw Error('Linked old owned witness output');
    const content=readFileSync(absolute,'utf8');
    if(path.endsWith('.rs')?!content.startsWith('// GENERATED: actual checked reverse owned-core receiving witness.'):
       path.endsWith('.lino')?!(content.startsWith('(owned-core-context ')||content.startsWith('(owned-source-document ')&&content.startsWith('(owned-source-document '+encodeWord('{"profile":"router-owned-core-source-document-v1","context":'))):JSON.parse(content).schema!=='owned-core-reverse-ci-witness-v1')throw Error('Unknown old owned witness output');
    changed.push(path);if(!check)rmSync(absolute);
  }
  if(definitionCleanup)definitionCleanup(root,artifacts,changed,{check,matrix});
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

export function regenerate(root = ROOT,{check=false}={}){const artifacts=buildArtifacts(root);return applyArtifactsSelected(root,{check},artifacts);}
export async function regenerateWithOwnedDefinitions(root = ROOT,{check=false,matrix=false}={}){const artifacts=await buildArtifactsWithOwnedDefinitions(root,{matrix}),owned=await import('../tools/translation/js-to-rust/owned-core-definition-corpus.mjs');return applyArtifactsSelected(root,{check},artifacts,owned.cleanOwnedDefinitionDrafts,matrix);}

if (process.argv[1] && relative(ROOT, process.argv[1]) === relative(ROOT, fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--check', '--write','--owned-core-definitions','--profile-matrix'].includes(arg))) throw new Error('usage: node scripts/regenerate-js-first.mjs [--check|--write] [--owned-core-definitions [--profile-matrix]]');
  const check = args.includes('--check');
  const definitions=args.includes('--owned-core-definitions'),matrix=args.includes('--profile-matrix');
  if(matrix&&!definitions)throw Error('--profile-matrix requires explicit --owned-core-definitions');
  if(definitions){
    regenerateWithOwnedDefinitions(ROOT,{check,matrix}).then(result=>{
  if (check && result.changed.length) {
    console.error(`JavaScript-first artifacts differ: ${result.changed.join(', ')}. Run node scripts/regenerate-js-first.mjs.`);
    process.exitCode = 1;
  } else console.log(`JavaScript-first ${check ? 'regeneration verified' : 'regenerated'}: ${result.bytes} bytes; ${result.changed.length} changed artifacts.`);
    }).catch(error=>{console.error(error);process.exitCode=1;});
  }else{
  const result = regenerate(ROOT, { check });
  if (check && result.changed.length) {
    console.error(`JavaScript-first artifacts differ: ${result.changed.join(', ')}. Run node scripts/regenerate-js-first.mjs.`);
    process.exitCode = 1;
  } else console.log(`JavaScript-first ${check ? 'regeneration verified' : 'regenerated'}: ${result.bytes} bytes; ${result.changed.length} changed artifacts.`);
  }
}
