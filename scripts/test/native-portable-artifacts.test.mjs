import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildNativePortableArtifacts } from '../../tools/translation/js-to-rust/native-portable-artifacts.mjs';
import { regenerate } from '../regenerate-js-first.mjs';
import { parseMeta } from '../../tools/translation/js-to-rust/translator.mjs';
import { camelFromSnake,toLino } from '../../tools/translation/js-to-rust/vendor/ir.mjs';
import {createConstructorSourceGraph} from '../../tools/translation/js-to-rust/vendor/source-constructors.mjs';
import { loadTypeScript, regenerateNativeTypeScript } from '../../tools/translation/js-to-rust/native-typescript.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = `export const LIMIT = 3;
export function outer(input) {
  const clean = value => typeof value === 'string' ? value.trim() : null;
  return missing(clean(input));
}`;
const row = (name = 'one', text = source) => ({ path: `packages/javascript/native/${name}.mjs`, source: text });

test('bulk drafts retain refused owners and independent lexical bodies, with deterministic distinct identities', () => {
  const a = buildNativePortableArtifacts([row('two'), row()]);
  const b = buildNativePortableArtifacts([row(), row('two')]);
  assert.deepEqual([...a.artifacts], [...b.artifacts]);
  assert.deepEqual(a.manifest.topLevel, { sourceItems: 4, translatedItems: 2, unsupportedItems: 2, fullDomainTranslatedItems: 2, conditionalPrivateBodyDraftItems: 0 });
  assert.deepEqual(a.manifest.scopedFunctions, { sourceItems: 2, translatedItems: 2, unsupportedItems: 0, fullDomainTranslatedItems: 2, conditionalPrivateBodyDraftItems: 0 });
  assert.equal(a.manifest.contract.runtimeParity, false);
  const identities = a.manifest.modules.flatMap((module) => module.scopedFunctions.items.map((item) => item.name));
  assert.equal(new Set(identities).size, 2);
  for (const module of a.manifest.modules) {
    assert.equal(module.scopedFunctions.items[0].owner.status, 'unsupported');
    for (const output of module.outputs.filter((output) => output.path.endsWith('.lino'))) {
      const program = parseMeta(a.artifacts.get(output.path));
      assert.equal(program.length, output.definitions);
      assert.ok(!program.some((item) => item.name === 'outer'));
    }
  }
  assert.throws(() => buildNativePortableArtifacts([row(), row()]), /duplicate/u);
  assert.throws(() => buildNativePortableArtifacts([{ ...row(), path: 'packages/javascript/native/../escape.mjs' }]), /invalid/u);
  assert.throws(() => buildNativePortableArtifacts([row('bad', 'export function broken(')]), /incomplete scoped/u);
});

test('emitted scoped TypeScript compiles strictly and preserves independently authored full-domain observations', async () => {
  const ts = loadTypeScript(ROOT);
  const { artifacts } = buildNativePortableArtifacts([row(), row('two')]);
  const directory = mkdtempSync(join(tmpdir(), 'router-native-portable-behavior-'));
  try {
    const files = [];
    for (const [path, content] of artifacts) if (path.endsWith('.ts')) {
      const target = join(directory, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content); files.push(target);
    }
    const program = ts.createProgram(files, { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []);
    const meta = parseMeta(artifacts.get('tools/translation/js-to-rust/generated/native-portable/scoped/one.lino'));
    const name = camelFromSnake(meta[0].name);
    const text = `${artifacts.get('packages/typescript/native/portable-draft/scoped/one.ts')}\nexport { ${name} };\n`;
    const erased = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    const target = join(directory, 'target.mjs'); writeFileSync(target, erased);
    const fn = (await import(pathToFileURL(target).href))[name];
    const observations = [['\uFEFF hi \u00A0', 'hi'], ['\ud800', '\ud800'], ['', ''], [null, null], [undefined, null], [0, null], [-0, null], [NaN, null], [0n, null], [10n ** 100n, null], [Symbol('opaque'), null], [() => {}, null], [new String('boxed'), null]];
    let hooks = 0; const opaque = { toString() { hooks++; throw Error('coercion'); }, valueOf() { hooks++; throw Error('coercion'); } };
    for (const [value, expected] of [...observations, [opaque, null]]) assert.equal(fn(value), expected);
    assert.equal(hooks, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('regeneration clears newly refused bodies and reports/removes stale drafts without mutating in check mode', { timeout: 30_000 }, () => {
  const root = mkdtempSync(join(tmpdir(), 'router-native-portable-drift-'));
  try {
    for (const path of ['packages/javascript/portable/policy.mjs', 'parity/fixtures/js-first/policy.json', 'parity/fixtures/js-first/unsupported.json']) {
      mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), readFileSync(join(ROOT, path)));
    }
    const input = join(root, row().path); mkdirSync(dirname(input), { recursive: true }); writeFileSync(input, source);
    regenerate(root);
    const target = 'packages/typescript/native/portable-draft/scoped/one.ts';
    const original = readFileSync(join(root, target), 'utf8');
    regenerateNativeTypeScript(root, { sourceRoot: ROOT });
    assert.equal(readFileSync(join(root, target), 'utf8'), original);
    assert.deepEqual(regenerateNativeTypeScript(root, { sourceRoot: ROOT, check: true }).unexpected, []);
    assert.deepEqual(regenerate(root, { check: true }).changed, []);
    writeFileSync(input, source.replace('value.trim()', 'value.unknown()'));
    assert.ok(regenerate(root, { check: true }).changed.includes(target));
    assert.equal(readFileSync(join(root, target), 'utf8'), original);
    regenerate(root);
    assert.doesNotMatch(readFileSync(join(root, target), 'utf8'), /function scoped/u);
    assert.deepEqual(regenerate(root, { check: true }).changed, []);
    rmSync(input);
    assert.ok(regenerate(root, { check: true }).changed.includes(target));
    assert.ok(existsSync(join(root, target)));
    regenerate(root);
    assert.equal(existsSync(join(root, target)), false);
    assert.deepEqual(regenerate(root, { check: true }).changed, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('bulk census separates conditional private definitions and retains producer capability refusals', () => {
  const source = "export function outer(input) { return String(input).split(';').map(part => part.trim()); }";
  const { manifest, artifacts } = buildNativePortableArtifacts([row('conditional', source)]);
  const census = manifest.scopedFunctions;
  assert.equal(census.fullDomainTranslatedItems, 0);
  assert.equal(census.conditionalPrivateBodyDraftItems, 1);
  assert.equal(census.translatedItems, 1);
  assert.equal(census.sourceItems, 1);
  assert.equal(manifest.topLevel.translatedItems, 0);
  const item = manifest.modules[0].scopedFunctions.items[0];
  assert.equal(item.coverageContract, 'conditional-private-body-draft');
  assert.equal(item.inputContract.capability.originalSignatureFullDomainPreserved, false);
  assert.equal(item.inputContract.capability.producerLookupStabilityProved, false);
  assert.equal(item.inputContract.capability.parentAdmitted, false);
  assert.equal(item.inputContract.capability.unqualifiedCallerAdmitted, false);
  const metaPath = 'tools/translation/js-to-rust/generated/native-portable/scoped/conditional.lino';
  const program = parseMeta(artifacts.get(metaPath));
  assert.equal(program[0].conditionalInputs, true);
  assert.match(artifacts.get('packages/typescript/native/portable-draft/scoped/conditional.ts'), /conditional/u);
  assert.match(artifacts.get('tools/translation/js-to-rust/generated/native-portable/scoped/conditional.rs.txt'), /conditional/u);
  assert.equal(manifest.contract.runtimeParity, false);
});

test('producer and captured-collection flags count each privately reissued draft once', () => {
  const source = 'const owned=new Set(["name"]);export function owner(input){const scalar=key=>owned.has(key);const full=value=>typeof value==="string";return Object.entries(input).filter(([key])=>owned.has(key));}';
  const {manifest,artifacts}=buildNativePortableArtifacts([row('captured',source)]),scope=manifest.scopedFunctions;
  assert.deepEqual(scope,{sourceItems:3,translatedItems:3,unsupportedItems:0,fullDomainTranslatedItems:1,conditionalPrivateBodyDraftItems:2});
  assert.equal(manifest.modules[0].topLevel.items.find(item=>item.start===source.indexOf('export function owner'))?.status,'unsupported');
  const program=parseMeta(artifacts.get('tools/translation/js-to-rust/generated/native-portable/scoped/captured.lino'));
  const captured=program.filter(item=>item.conditionalCaptures);assert.equal(captured.length,2);assert.equal(captured.filter(item=>item.conditionalInputs).length,1);
  for(const item of captured){assert.equal(item.environment.collectionLookupStabilityProved,false);assert.equal(item.environment.originalSignatureFullDomainPreserved,false);assert.deepEqual(item.captures,[]);const wrong=JSON.parse(JSON.stringify(item));wrong.environment.collectionLookupStabilityProved=true;assert.throws(()=>parseMeta(toLino(wrong)));}
  assert.match(manifest.contract.scopedFunctions,/privately source-checked/u);assert.match(manifest.contract.scopedFunctions,/collection intrinsics/u);assert.equal(manifest.contract.runtimeParity,false);
  const mutated=buildNativePortableArtifacts([row('mutated',source.replace('const scalar','owned.add("other");const scalar'))]);
  assert.equal(mutated.manifest.scopedFunctions.translatedItems,1);assert.equal(mutated.manifest.scopedFunctions.conditionalPrivateBodyDraftItems,0);
});

test('checked original owned-call bodies keep their intrinsic qualification and separate scoped census', () => {
  const source='export function owner(value){return [1].some(item=>typeof item===typeof value);}',{manifest,artifacts}=buildNativePortableArtifacts([row('source-calls',source)]);
  assert.deepEqual(manifest.topLevel,{sourceItems:1,translatedItems:1,unsupportedItems:0,fullDomainTranslatedItems:0,conditionalPrivateBodyDraftItems:1});
  assert.deepEqual(manifest.scopedFunctions,{sourceItems:1,translatedItems:1,unsupportedItems:0,fullDomainTranslatedItems:1,conditionalPrivateBodyDraftItems:0});
  const program=parseMeta(artifacts.get('tools/translation/js-to-rust/generated/native-portable/top-level/source-calls.lino'));
  assert.equal(program[0].conditionalCalls,true);assert.equal(program[0].sourceCalls.iterations[0].standardArraySomeRequired,true);assert.equal(program[0].sourceCalls.iterations[0].lookupStabilityProved,false);
  assert.equal(manifest.modules[0].topLevel.items[0].coverageContract,'conditional-original-body-draft');
  for(const path of ['packages/typescript/native/portable-draft/top-level/source-calls.ts','tools/translation/js-to-rust/generated/native-portable/top-level/source-calls.rs.txt'])assert.match(artifacts.get(path),/Conditional original body draft/u);
  for(const mutate of [item=>delete item.conditionalCalls,item=>item.sourceCalls.iterations[0].lookupStabilityProved=true,item=>delete item.sourceCalls]){const wrong=JSON.parse(JSON.stringify(program[0]));mutate(wrong);assert.throws(()=>parseMeta(toLino(wrong)));}
  const changed=buildNativePortableArtifacts([row('changed','Array.prototype.some=evil;'+source)]);assert.equal(changed.manifest.topLevel.translatedItems,0);assert.equal(changed.manifest.scopedFunctions.translatedItems,0);
  assert.equal(manifest.contract.runtimeParity,false);
});


test('genuine imported constructor bodies stay conditional and require the original complete producer graph', () => {
  const sources=[row('constructor-error',"export class Failure extends Error {constructor(message,status=400){super(message);this.status=status;this.code='bounded';}}"),row('constructor-owner',"import {Failure} from './constructor-error.mjs';export function selected(value){if(value===null)throw new Failure('bad');return value;}export function caller(value){return selected(value);}")];
  const graph=createConstructorSourceGraph(sources),{manifest,artifacts}=buildNativePortableArtifacts(sources);
  assert.deepEqual(manifest.topLevel,{sourceItems:4,translatedItems:1,unsupportedItems:3,fullDomainTranslatedItems:0,conditionalPrivateBodyDraftItems:1});
  assert.deepEqual(manifest.scopedFunctions,{sourceItems:0,translatedItems:0,unsupportedItems:0,fullDomainTranslatedItems:0,conditionalPrivateBodyDraftItems:0});
  const path='tools/translation/js-to-rust/generated/native-portable/top-level/constructor-owner.lino',meta=artifacts.get(path),program=parseMeta(meta,{constructorGraph:graph});
  assert.equal(program.length,1);assert.equal(program[0].name,'selected');assert.equal(program[0].conditionalConstructors,true);assert.equal(program[0].params[0].type,'value');assert.equal(program[0].returns,'value');
  const errorModule=manifest.modules.find(module=>module.path.endsWith('constructor-error.mjs')),ownerModule=manifest.modules.find(module=>module.path.endsWith('constructor-owner.mjs'));assert.equal(errorModule.topLevel.items.length,1);assert.equal(errorModule.topLevel.items[0].diagnostic.kind,'class');assert.equal(ownerModule.topLevel.items.length,3);assert.equal(ownerModule.topLevel.items.find(item=>item.start===0).diagnostic.kind,'no-definition');assert.equal(ownerModule.topLevel.items.find(item=>item.name==='caller').status,'unsupported');
  const proof=program[0].sourceConstructors;assert.equal(proof.runtimeParity,false);assert.equal(proof.constructors[0].conditions.hostDiagnosticLocationsPreserved,false);assert.equal(proof.constructors[0].conditions.outsideModulePrototypeClosureProved,false);
  assert.equal(manifest.modules.find(module=>module.path.endsWith('constructor-owner.mjs')).topLevel.items.find(item=>item.name==='selected').coverageContract,'conditional-original-constructor-body-draft');
  assert.throws(()=>parseMeta(meta),/copied or foreign/u);
  const foreign=createConstructorSourceGraph(sources.map(source=>({...source,source:source.source.replace('status=400','status=401')})));assert.throws(()=>parseMeta(meta,{constructorGraph:foreign}),/producer graph/u);
  for(const changed of [sources.slice(1),sources.map(source=>({...source,source:source.source+';Array.prototype.includes=evil;'}))]){const current=buildNativePortableArtifacts(changed);assert.equal(current.manifest.topLevel.translatedItems,0);assert.equal(current.manifest.topLevel.conditionalPrivateBodyDraftItems,0);}
  const typescript=artifacts.get('packages/typescript/native/portable-draft/top-level/constructor-owner.ts');assert.match(typescript,/import \{ Failure as routerOriginalError0 \} from "\.\.\/\.\.\/constructor-error\.js"/u);assert.match(typescript,/unknown/u);
  assert.match(artifacts.get('tools/translation/js-to-rust/generated/native-portable/top-level/constructor-owner.rs.txt'),/Result<JsPayload<'a>, SourceErrorProjection>/u);assert.equal(manifest.contract.runtimeParity,false);
});
