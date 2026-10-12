import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateSource, json, PIN, sha256 } from './translate.mjs';
import { translateProject } from './project.mjs';
import {PRODUCTION_PROFILE,compilationProfile} from './cfg-profile.mjs';
import { effectRuntimeAssets } from './effect-assets.mjs';
import {hostRuntimeAssets} from './host-assets.mjs';
import {deriveDependencyProfile} from './derive-dependencies.mjs';
import {actualJsonCapabilityProfile} from './json-capabilities.mjs';
import {trackedSource,sourceCorpusPaths,sourceCorpusText,assertSourceCorpusSelection} from './source-corpus.mjs';
import {compilationMatrixDescription} from './compilation-matrix.mjs';
export {trackedSource} from './source-corpus.mjs';
import {jsonMacroDependencyProfile} from './json-macro-sources.mjs';
import {translationProgressReporter} from './translation-progress.mjs';

export const OUTPUT_ROOTS = ['tools/translation/meta', 'packages/javascript/generated/rust-draft', 'packages/typescript/generated/rust-draft', 'tools/translation/projects', 'packages/javascript/generated/rust-project', 'packages/typescript/generated/rust-project'];
const plans=new WeakMap();
function freezeData(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freezeData);Object.freeze(value);}
  return value;
}
export const BULK_PLAN_LIMITS=Object.freeze({profileExpectedBytes:512*1024*1024});
function profilePrefix(input){
  if(input===undefined)return '';
  if(typeof input!=='string'||!(/^profiles\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*-[a-f0-9]{64}$/).test(input)||input.length>150)throw new TypeError('bulk profile output requires an isolated safe profile/digest directory');
  return input;
}
function assertProfileOutput(root,path){
  let current=root;
  for(const part of path.split('/')){
    current=join(current,part);
    try{if(lstatSync(current).isSymbolicLink())throw new TypeError('bulk profile output cannot follow a symbolic link');}
    catch(error){if(error.code!=='ENOENT')throw error;}
  }
}
function files(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(root, entry.name)) : [join(root, entry.name)]);
}

export function planRegeneration({ root, sources, entries, compilationProfile:profileInput=PRODUCTION_PROFILE,outputPrefix:prefixInput,sourceCorpus,matrix,progress:progressInput } = {}) {
  root = resolve(root);
  const progress=translationProgressReporter(progressInput);
  progress({stage:'corpus',state:'start'});
  const profile=compilationProfile(profileInput);
  const prefix=profilePrefix(prefixInput),outputRoots=OUTPUT_ROOTS.map(path=>prefix?`${prefix}/${path}`:path);
  const matrixDescription=matrix?compilationMatrixDescription(matrix):null;
  const matrixMember=matrixDescription?.profiles.find(member=>member.directory===prefix);
  if(prefix&&(!matrixMember||JSON.stringify(matrixMember.compilationProfile)!==JSON.stringify(profile)))throw new TypeError('bulk profile output must match its original matrix member and exact compilation profile');
  if(matrix&&!prefix)throw new TypeError('matrix bulk outputs require their isolated member directory');
  const readSource=path=>sourceCorpus?sourceCorpusText(sourceCorpus,root,path):trackedSource(root,path);
  const corpusPaths=sourceCorpus?sourceCorpusPaths(sourceCorpus,root):null;
  if(corpusPaths&&sources!==undefined)assertSourceCorpusSelection(sourceCorpus,root,sources);
  // Standalone fixture roots without Cargo have no registered derive owner.
  // A real Cargo root must verify every consumed dependency input.
  const cargoManifest=sourceCorpus?readSource('Cargo.toml'):existsSync(join(root,'Cargo.toml'))?readSource('Cargo.toml'):null;
  const deriveProfile=deriveDependencyProfile({manifest:sourceCorpus?readSource('Cargo.toml'):existsSync(join(root,'Cargo.toml'))?readSource('Cargo.toml'):null,lock:sourceCorpus?readSource('Cargo.lock'):existsSync(join(root,'Cargo.lock'))?readSource('Cargo.lock'):null}),deriveDependencies=deriveProfile.proof;
  const jsonParserProfile=actualJsonCapabilityProfile({manifest:sourceCorpus?readSource('Cargo.toml'):existsSync(join(root,'Cargo.toml'))?readSource('Cargo.toml'):null,lock:sourceCorpus?readSource('Cargo.lock'):existsSync(join(root,'Cargo.lock'))?readSource('Cargo.lock'):null,compilationProfile:profile});
  const jsonMacroProfile=jsonMacroDependencyProfile({manifest:sourceCorpus?readSource('Cargo.toml'):existsSync(join(root,'Cargo.toml'))?readSource('Cargo.toml'):null,lock:sourceCorpus?readSource('Cargo.lock'):existsSync(join(root,'Cargo.lock'))?readSource('Cargo.lock'):null}),jsonMacroDependencies=jsonMacroProfile.proof;
  const paths = (corpusPaths??sources ?? execFileSync('git', ['ls-files', '-z', '--', '*.rs'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)).sort();
  const expected = new Map();
  const assets = effectRuntimeAssets();
  const hostAssets=hostRuntimeAssets();
  for (const index of [1,2,4,5]) {
    const output=outputRoots[index],typed=index===2||index===5;
    expected.set(`${output}/runtime/effects.mjs`, assets.javascript);
    if (typed) expected.set(`${output}/runtime/effects.d.mts`, assets.declarations);
    for(const [path,content] of hostAssets)if(typed||!path.endsWith('.d.mts'))expected.set(`${output}/runtime/${path}`,content);
  }
  const inventory = [];
  const diagnostics = new Map();
  const coverage = () => ({ topLevelFunctions: 0, executableFunctions: 0, carriedFunctions: 0, refusalCategories: {} });
  const functionCoverage = { scope: 'top-level fn items; nested declarations inside carried enclosing items are excluded', productionPathRule: 'src/ paths excluding names containing tests or test_support', all: coverage(), production: coverage() };
  const totals = { sources: paths.length, executable: 0, executableFunctions: 0, executableConstants: 0, executableTypes: 0, executableConstructors: 0, carried: 0, preserved: 0 };
  const projects = [], projectDeclarations = [], projectSourceScopes=[];
  progress({stage:'corpus',state:'end',total:paths.length});
  for (const entry of entries ?? ['src/lib.rs', 'src/main.rs'].filter(path => paths.includes(path))) {
    progress({stage:'project',state:'start',entry});
    const result = translateProject({ entry, paths, readSource,compilationProfile:profile,deriveDependencies,jsonParserProfile,jsonMacroDependencies,cargoManifest,progress:progressInput });
    result.meta.deriveDependencyProfile={available:!!deriveDependencies,digest:deriveDependencies?.digest??null,diagnostics:deriveProfile.diagnostics};
    result.meta.jsonMacroDependencyProfile={available:!!jsonMacroDependencies,digest:jsonMacroDependencies?.digest??null,diagnostics:jsonMacroProfile.diagnostics};
    projectDeclarations.push(...result.executableDeclarations);projectSourceScopes.push(...result.sourceScopes);
    const stem = entry.replace(/\.rs$/u, '');
    const targets = { meta: `${outputRoots[3]}/${stem}.meta.json`, javascript: `${outputRoots[4]}/${stem}.mjs`, typescript: `${outputRoots[5]}/${stem}.ts` };
    expected.set(targets.meta, json(result.meta)); expected.set(targets.javascript, result.javascript); expected.set(targets.typescript, result.typescript);
    projects.push({ entry, status: 'partial', runtimeParity: false, sources: result.meta.sources.length, moduleEdges: result.meta.moduleEdges.length, moduleDiagnostics: result.meta.moduleDiagnostics.length, executableFunctions: result.meta.executable.filter(item => item.term === 'fn').length, executableConstants: result.meta.executable.filter(item => item.term === 'const').length, checkedMethods: result.meta.checkedMethods?.length ?? 0, refused: result.meta.refused.length, unloweredItems: result.meta.unloweredItems.length, targets });
    progress({stage:'project',state:'end',entry});
  }
  progress({stage:'standalone',state:'start',total:paths.length});
  let completedSources=0;
  for (const path of paths) {
    if(completedSources%32===0)progress({stage:'standalone',state:'advance',source:path,completed:completedSources,total:paths.length});
    completedSources++;
    if (path.split('/').includes('..') || path.startsWith('/')) throw new Error(`source must be repository relative: ${path}`);
    const source = readSource(path);
    // Only genuine captured project scopes inherit this crate's edition.
    // Unmatched scripts, experiments and archived sources keep it unknown.
    const result = translateSource(source, path, { projectDeclarations,projectSourceScopes,jsonParserProfile });
    const stem = path.replace(/\.rs$/u, '');
    const targets = { meta: `${outputRoots[0]}/${stem}.meta.json`, javascript: `${outputRoots[1]}/${stem}.mjs`, typescript: `${outputRoots[2]}/${stem}.ts` };
    expected.set(targets.meta, json(result.ir));
    expected.set(targets.javascript, result.javascript);
    expected.set(targets.typescript, result.typescript);
    inventory.push({ source: path, sha256: result.ir.sourceSha256, bytes: result.ir.sourceBytes, ...result.ir.counts, runtimeParity: false, targets });
    for (const key of ['executable', 'executableFunctions', 'executableConstants', 'executableTypes', 'executableConstructors', 'carried', 'preserved']) totals[key] += result.ir.counts[key];
    for (const item of result.ir.items) if (item.diagnostic) {
      const key = `${item.diagnostic.kind}: ${item.diagnostic.message}`;
      diagnostics.set(key, (diagnostics.get(key) ?? 0) + 1);
    }
    for (const item of result.ir.items.filter(item => item.term === 'fn')) {
      const groups = [functionCoverage.all];
      if (path.startsWith('src/') && !/tests|test_support/u.test(path)) groups.push(functionCoverage.production);
      for (const group of groups) {
        group.topLevelFunctions++;
        if (item.status === 'executable') { group.executableFunctions++; continue; }
        group.carriedFunctions++;
        const message = item.diagnostic?.message ?? 'missing diagnostic';
        const category = /\basync\b/u.test(message) ? 'async or effects'
          : /mutable|mutation|for loop/u.test(message) ? 'mutation or iteration'
            : /closure|method iter|method map|higher-order/u.test(message) ? 'closures or iterator methods'
              : /unknown type|type .+generic|generic function|turbofish/u.test(message) ? 'unresolved or generic types'
                : /unknown name|unknown function|called function/u.test(message) ? 'unresolved declaration or carried dependency'
                  : /tuple|destructuring/u.test(message) ? 'tuples or destructuring'
                    : /#\[|attributes|conditional/u.test(message) ? 'attributes or compilation conditions'
                      : /^method /u.test(message) ? 'other unsupported methods'
                        : item.diagnostic?.kind ?? 'missing diagnostic';
        group.refusalCategories[category] = (group.refusalCategories[category] ?? 0) + 1;
      }
    }
  }
  progress({stage:'standalone',state:'end',completed:completedSources,total:paths.length});
  progress({stage:'fingerprint',state:'start'});
  const implementation = ['tools/translation/translate.mjs', 'tools/translation/checked-types.mjs', 'tools/translation/checked-coercions.mjs', 'tools/translation/rust-structure.mjs', 'tools/translation/bulk.mjs', 'tools/translation/cfg-profile.mjs', 'tools/translation/project.mjs', 'tools/translation/project-copy.mjs', 'tools/translation/project-nominal.mjs', 'tools/translation/semantic-meta.mjs', 'tools/translation/effect-assets.mjs', 'tools/translation/host-assets.mjs', 'tools/translation/type-layout.mjs', 'tools/translation/type-layout-runtime.mjs', 'tools/translation/pattern-bindings.mjs', 'tools/translation/pattern-syntax.mjs', 'tools/translation/monomorphic.mjs', 'tools/translation/macro-provenance.mjs', 'tools/translation/module-bindings.mjs', 'tools/translation/registered-bindings.mjs', 'tools/translation/source-scopes.mjs', 'tools/translation/impl-resolver.mjs', ...readdirSync(new URL('./extensions/', import.meta.url)).filter(name => name.endsWith('.mjs')).map(name => `tools/translation/extensions/${name}`)];
  const translatorRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  // Namespace authority consumes the exact offline dependency source bytes,
  // not only descriptors containing their expected digests.
  implementation.push(...['derive-dependencies.mjs','derive-footprints.mjs','derive-helper-paths.mjs','derive-builtin-default.mjs','derive-inputs.mjs','derive-layout.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push('tools/translation/extensions/slice-membership-runtime.d.mts');
  implementation.push('tools/translation/cargo-edition-context.mjs');
  implementation.push(...readdirSync(new URL('./source-profiles/let-chains/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/let-chains/${name}`));
  implementation.push('tools/translation/json-capabilities.mjs');
  implementation.push(...readdirSync(new URL('./source-profiles/json-capabilities/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/json-capabilities/${name}`));
  implementation.push(...['json-macro-sources.mjs','json-macro-features.mjs','json-macro-context.mjs','json-macro-syntax.mjs','json-macro-plans.mjs','json-macro-runtime.mjs','json-macro-runtime.d.mts','json-macro-arrays.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...files(fileURLToPath(new URL('./source-profiles/json-macro/',import.meta.url))).map(path=>path.slice(translatorRoot.length+1)).sort());
  implementation.push('tools/translation/json-roundtrip-capabilities.mjs');
  implementation.push('tools/translation/json-roundtrip-cached-powers.mjs');
  implementation.push('tools/translation/json-roundtrip-limb-arithmetic.mjs');
  implementation.push(...['arithmetic-digit-retention.mjs','json-retention-runtime-assets.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...['arithmetic-source-fragments.mjs','arithmetic-source-data.mjs','arithmetic-associated-source.mjs','arithmetic-record-source.mjs','arithmetic-reference-source.mjs','arithmetic-copy-source.mjs','json-roundtrip-storage-fragments.mjs','json-roundtrip-reference-fragments.mjs','json-roundtrip-num-expansions.mjs','json-roundtrip-limb-fragments.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...files(fileURLToPath(new URL('./source-profiles/json-roundtrip/',import.meta.url))).map(path=>path.slice(translatorRoot.length+1)).sort());
  implementation.push(...['exact-binary64.d.mts','json-roundtrip-runtime.d.mts','json-roundtrip-numbers.d.mts'].map(name=>`tools/translation/extensions/${name}`));
  implementation.push(...['json-roundtrip-lexical.d.mts','json-roundtrip-NOTICE.md','json-roundtrip-LICENSE-MIT.txt','json-roundtrip-LICENSE-APACHE.txt'].map(name=>`tools/translation/extensions/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/slice-membership/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/slice-membership/${name}`));
  implementation.push(...['derive-quote-meta.mjs','serde-bang-footprints.mjs','serde-serialize-struct-route.mjs','serde-deserialize-bang-footprints.mjs','serde-deserialize-struct-route.mjs','derive-bang-context.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...['builtin-derive-ast-meta.mjs','builtin-derive-bang-footprints.mjs','builtin-eq-ast-route.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push('tools/translation/builtin-source-meta.mjs','tools/translation/builtin-ast-builder-meta.mjs');
  implementation.push('tools/translation/builtin-ast-container-inputs.mjs');
  implementation.push(...['builtin-ast-caller-environments.mjs','builtin-ast-callback-bridge.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...['builtin-ast-source-substitution.mjs','builtin-ast-field-construction.mjs','builtin-vec-remove-plan.mjs','builtin-parsed-field-values.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/builtin-derive-bang/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/builtin-derive-bang/${name}`));
  implementation.push(...['matches-source-profile.mjs','source-macro-fragments.mjs','original-macro-module-context.mjs','matches-macro-context.mjs','matches-source-bridge.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...['source-method-transforms.mjs','source-method-parser.mjs','source-method-admission.mjs','original-parser-identity.mjs','standard-host-bindings.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/matches-source/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/matches-source/${name}`));
  implementation.push('tools/translation/copy-trait-owners.mjs');
  implementation.push('tools/translation/source-module-views.mjs');
  implementation.push('tools/translation/module-paths.mjs');
  implementation.push('tools/translation/source-corpus.mjs');
  implementation.push('tools/translation/compilation-matrix.mjs','tools/translation/matrix-bulk.mjs');
  implementation.push('tools/translation/conditional-attributes.mjs',...readdirSync(new URL('./source-profiles/conditional-attributes/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/conditional-attributes/${name}`));
  implementation.push('scripts/translate-router.mjs');
  implementation.push('tools/translation/translation-progress.mjs');
  implementation.push(...readdirSync(new URL('./source-profiles/module-paths/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/module-paths/${name}`));
  implementation.push(...['namespace-census.mjs','namespace-standard.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...['rust-std-lib-1.89.0.rs.gz','rust-alloc-lib-1.89.0.rs.gz','rust-alloc-fmt-1.89.0.rs.gz'].map(name=>`tools/translation/source-profiles/namespace-standard/${name}`));
  implementation.push(...['tool-attributes.mjs','tool-attribute-layout.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...['rust-resolve-macros-1.89.0.rs.gz','rust-resolve-ident-1.89.0.rs.gz','rust-builtin-attrs-1.89.0.rs.gz'].map(name=>`tools/translation/source-profiles/tool-attributes/${name}`));
  implementation.push(...['rust-marker-1.89.0.rs.gz','rust-fmt-1.89.0.rs.gz','rust-path-1.89.0.rs.gz'].map(name=>`tools/translation/source-profiles/copy-standard/${name}`));
  implementation.push(...['rust-lexer-1.89.0.rs.gz','rust-dec2flt-1.89.0.rs.gz'].map(name=>`tools/translation/source-profiles/floating-standard/${name}`));
  implementation.push('tools/translation/derive-success-frontier.mjs');
  implementation.push(...['macro-token-trees.mjs','macro-fragments.mjs','macro-items.mjs','declarative-macros.mjs','declarative-macro-engine.mjs','declarative-token-macros.mjs','declarative-source-profile.mjs','declarative-closure.mjs','declarative-owner-frontier.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/declarative/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/declarative/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/derive/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/derive/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/primitive-float/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/primitive-float/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/utf16-fixed-f64/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/utf16-fixed-f64/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/string-iterators/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/string-iterators/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/whitespace-iterators/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/whitespace-iterators/${name}`));
  implementation.push('tools/translation/generate-whitespace-data.mjs');
  implementation.push(...readdirSync(new URL('./source-profiles/csv-strings/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/csv-strings/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/result-iterators/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/result-iterators/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/scalar-enumerate/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/scalar-enumerate/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/reversed-ranges/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/reversed-ranges/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/while-let/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/while-let/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/string-bytes/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/string-bytes/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/cooked-byte-char/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/cooked-byte-char/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/option-deref/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/option-deref/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/standard-method-bodies/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/standard-method-bodies/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/reverse-string-iterators/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/reverse-string-iterators/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/standard-bool/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/standard-bool/${name}`));
  const implementationHashes = Object.fromEntries(implementation.map(path => [path, sha256(readFileSync(join(translatorRoot, path)))]));
  progress({stage:'fingerprint',state:'end',total:implementation.length});
  progress({stage:'plan',state:'start'});
  const manifest = { schemaVersion: 1, kind: 'draft-translation-inventory', runtimeParity: false, compilationProfile:profile, compilationProfileScope:'resolved tracked crate contexts; unmatched standalone source conditions remain unknown', translatorCommit: PIN, implementationHashes, totals, functionCoverage, diagnosticCounts: Object.fromEntries([...diagnostics].sort(([a], [b]) => a.localeCompare(b))), sources: inventory, projects };
  if(sourceCorpus)manifest.originalSourceCorpus={schema:sourceCorpus.schema,sourceSetSha256:sourceCorpus.sourceSetSha256,sources:sourceCorpus.sources,cargo:sourceCorpus.cargo,totalSourceBytes:sourceCorpus.totalSourceBytes};
  if(prefix)manifest.outputPrefix=prefix;
  if(matrixDescription)manifest.explicitCompilationMatrix={sha256:matrix.sha256,profile:matrixMember.name,profileSha256:matrixMember.sha256,requiredProfiles:matrixDescription.requiredProfiles,selectedProfiles:matrixDescription.profiles.map(member=>({name:member.name,sha256:member.sha256})),platformDomainComplete:false,commonExecutableOutput:false,runtimeParity:false};
  freezeData(manifest);
  expected.set(`${prefix?prefix+'/':''}parity/rust-source-inventory.json`, json(manifest));
  const expectedBytes=[...expected.values()].reduce((sum,content)=>sum+Buffer.byteLength(content),0);
  if(prefix&&expectedBytes>BULK_PLAN_LIMITS.profileExpectedBytes)throw new TypeError('bulk profile output plan exceeds its 536870912 byte budget');
  const outputs=[...expected].map(([path,content])=>Object.freeze({path,bytes:Buffer.byteLength(content),sha256:sha256(content)}));
  const plan=Object.freeze({schema:'checked-bulk-output-plan-v1',root,outputPrefix:prefix||null,outputRoots:Object.freeze(outputRoots),expectedBytes,outputs:Object.freeze(outputs),manifest});
  plans.set(plan,{root,prefix,outputRoots,expected,manifest});
  progress({stage:'plan',state:'end',outputs:outputs.length,bytes:expectedBytes});
  return plan;
}

export function validateRegenerationPlan(plan){
  const state=plans.get(plan);if(!state)throw new TypeError('Unsealed bulk output plan');
  if(state.prefix){
    for(const path of state.expected.keys())assertProfileOutput(state.root,path);
    for(const output of state.outputRoots){
      assertProfileOutput(state.root,output);
      for(const target of files(join(state.root,output)))assertProfileOutput(state.root,target.slice(state.root.length+1));
    }
  }
  return plan;
}

export function applyRegenerationPlan(plan,{check=false}={}){
  validateRegenerationPlan(plan);
  const {root,expected,outputRoots,manifest}=plans.get(plan);
  const failures = [];
  for (const [path, content] of expected) {
    const target = join(root, path);
    if (check) {
      if (!existsSync(target)) failures.push(`missing: ${path}`);
      else if (readFileSync(target, 'utf8') !== content) failures.push(`stale: ${path}`);
    } else { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content); }
  }
  for (const output of outputRoots) for (const target of files(join(root, output))) {
    const relative = target.slice(root.length + 1);
    if (!expected.has(relative)) {
      if (check) failures.push(`unexpected: ${relative}`);
      else unlinkSync(target);
    }
  }
  return { manifest, failures };
}

export function regenerate({check=false,...options}={}){
  return applyRegenerationPlan(planRegeneration(options),{check});
}
