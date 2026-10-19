import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {cargoLayoutManifestMatches,cargoLayoutManifestDigestsMatch} from '../cargo-layout-input-compatibility.mjs';
import {deriveCargoLayoutInputCompatibility} from '../prepare-cargo-layout-input-compatibility.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {loadDeriveDependencyProof,isDeriveDependencyProof,deriveDependencyProfile} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof,isJsonMacroSourceProof,jsonMacroDependencyProfile,createJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {proveJsonMacroFeatures,isJsonMacroFeatureProof} from '../json-macro-features.mjs';
import {jsonMacroProfileMatches} from '../json-macro-profile-layout.mjs';
import {actualJsonCapabilityProfile,isJsonCapabilityProfile} from '../json-capabilities.mjs';
import {loadDeclarativeSourceProof,isDeclarativeSourceProof,taskLocalSourceDefinitions} from '../declarative-source-profile.mjs';
import {numericSourceInputsFromFiles,compileNumericSourceStages} from '../serialization-schema/numeric-source-stage.mjs';
import {lockedTomlValueNamespaceBindings} from '../toml-value-namespace.mjs';
import {rustPackageSourcePath} from '../repository-layout.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const read=path=>readFileSync(new URL(path,root));
const archive=read('tools/translation/source-profiles/cargo-layout-before/inputs.json.gz'),history=JSON.parse(gunzipSync(archive));
const before=Buffer.from(history.manifest,'base64').toString('utf8'),after=read(rustPackageSourcePath(fileURLToPath(root),'Cargo.toml')).toString('utf8'),lock=read('Cargo.lock').toString('utf8');
const input=manifest=>({manifest,lock}),historicalProfile=Buffer.from(history.profiles['tools/translation/source-profiles/json-macro/manifest.json'],'base64');
const consumers=['derive-dependencies','json-macro-inputs','json-capabilities','declarative-source-profile','serialization-schema/numeric-source-stage','json-macro-features','toml-value-namespace','json-macro-profile-layout'];
const sourceInputs=()=>({sources:new Map(consumers.map(name=>['tools/translation/'+name+'.mjs',read('tools/translation/'+name+'.mjs').toString('utf8')])),historyArchive:archive,currentProfile:read('tools/translation/source-profiles/json-macro/manifest.json')});

test('complete actual producer has current installed sources, full CST inverses and only two rule sequences',{timeout:30000},()=>{
 const output=execFileSync(process.execPath,[new URL('../prepare-cargo-layout-input-compatibility.mjs',import.meta.url).pathname,'--check'],{cwd:root,encoding:'utf8',timeout:20000,maxBuffer:1048576});assert.equal(JSON.parse(output).checked,true);
 const proposal=deriveCargoLayoutInputCompatibility(sourceInputs());assert.equal(proposal.files.length,9);assert.equal(proposal.sourceAndOwnerVerdictsCached,false);
 for(const row of proposal.files){assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.source);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.text);assert.equal(row.inverse,row.source);assert.deepEqual([...new Set(row.trace.map(entry=>entry.phase))],['language','repository']);assert.equal(read(row.path).toString('utf8'),row.text);}
 const copied=proposal.files[0];assert.equal(copied.source,proposal.files.at(-1).source);assert.ok(copied.source.includes('export function jsonMacroProfileMatches('));
});

test('only both complete reviewed manifests and their exact counterpart digests are accepted as layout DATA',()=>{
 assert.notEqual(before,after);assert.equal(cargoLayoutManifestMatches(before,hash(after)),true);assert.equal(cargoLayoutManifestMatches(after,hash(before)),true);assert.equal(cargoLayoutManifestDigestsMatch(hash(before),hash(after)),true);assert.equal(cargoLayoutManifestDigestsMatch(hash(after),hash(before)),true);
 for(const manifest of [before+'\n',after+'\n',after.replace('readme = "../README.md"','readme = "README.md"'),after.replace('[dependencies]','[dependencies]\nunreviewed = "1"'),null,{},Buffer.from(before)]){
  if(typeof manifest==='string'){assert.notEqual(manifest,before);assert.notEqual(manifest,after);}
  for(const expected of [hash(before),hash(after)])assert.equal(cargoLayoutManifestMatches(manifest,expected),false);
  if(typeof manifest==='string')for(const load of [loadDeriveDependencyProof,loadJsonMacroSourceProof,loadDeclarativeSourceProof,numericSourceInputsFromFiles])assert.throws(()=>load(input(manifest)),/manifest|Cargo/);
 }
 for(const expected of ['0'.repeat(64),null,{},hash(lock)]){assert.equal(cargoLayoutManifestMatches(before,expected),false);assert.equal(cargoLayoutManifestDigestsMatch(hash(before),expected),false);}
});

test('historical and physical Cargo retain genuine derive proofs with their actual manifest bytes',()=>{
 for(const manifest of [before,after]){const proof=loadDeriveDependencyProof(input(manifest));assert.equal(isDeriveDependencyProof(proof),true);assert.equal(proof.manifestSha256,hash(manifest));assert.equal(proof.lockSha256,hash(lock));assert.equal(deriveDependencyProfile(input(manifest)).diagnostics.length,0);assert.equal(lockedTomlValueNamespaceBindings(proof).length,1);assert.equal(isDeriveDependencyProof({...proof}),false);assert.deepEqual(lockedTomlValueNamespaceBindings({...proof}),[]);}
 assert.equal(deriveDependencyProfile(input(before+'\n')).proof,null);assert.throws(()=>loadDeriveDependencyProof({manifest:before,lock:lock+'\n'}),/manifest or lock/);
});

test('JSON private dependencies features and historical profile equations preserve both complete inputs',()=>{
 for(const manifest of [before,after]){const proof=loadJsonMacroSourceProof(input(manifest));assert.equal(isJsonMacroSourceProof(proof),true);assert.equal(proof.manifestSha256,hash(manifest));const features=proveJsonMacroFeatures(proof);assert.equal(isJsonMacroFeatureProof(features),true);assert.ok(features.features.includes('std'));assert.equal(jsonMacroProfileMatches(proof,hash(historicalProfile)),true);assert.equal(jsonMacroProfileMatches({...proof},hash(historicalProfile)),false);assert.throws(()=>proveJsonMacroFeatures({...proof}),/sealed/);assert.equal(jsonMacroDependencyProfile(input(manifest)).diagnostics.length,0);}
 assert.equal(jsonMacroDependencyProfile(input(after+'\n')).proof,null);assert.throws(()=>createJsonMacroSourceProof({...input(before),archives:new Map()}),/checksum/);
});

test('actual parser capability retains the raw input manifest and rejects unrelated bytes',()=>{
 const observations=[before,after].map(manifest=>actualJsonCapabilityProfile(input(manifest)));
 for(const [index,profile]of observations.entries()){assert.equal(isJsonCapabilityProfile(profile),true);assert.equal(profile.kind,'actual-locked-Cargo-profile');assert.equal(profile.manifestSha256,hash([before,after][index]));assert.equal(profile.runtimeParity,false);}
 assert.deepEqual(observations[0].features,observations[1].features);assert.equal(observations[0].parseAvailable,observations[1].parseAvailable);
 assert.equal(actualJsonCapabilityProfile(input(after+'\n')).kind,'actual-Cargo-profile-unavailable');assert.equal(actualJsonCapabilityProfile({manifest:before,lock:lock+'\n'}).parseAvailable,false);
});

test('declarative archives still issue only genuine checked source declarations for each exact manifest',()=>{
 for(const manifest of [before,after]){const proof=loadDeclarativeSourceProof(input(manifest));assert.equal(isDeclarativeSourceProof(proof),true);assert.equal(proof.manifestSha256,hash(manifest));assert.deepEqual([...taskLocalSourceDefinitions(proof).keys()],['task_local','__task_local_inner']);assert.equal(isDeclarativeSourceProof({...proof}),false);assert.throws(()=>taskLocalSourceDefinitions({...proof}),/Unsealed/);}
 assert.throws(()=>loadDeclarativeSourceProof(input(before+'\n')),/manifest\/lock/);
});

test('numeric original input evidence retains actual manifest identity without granting formatter authority',()=>{
 const observations=[before,after].map(manifest=>numericSourceInputsFromFiles(input(manifest)));
 for(const [index,evidence]of observations.entries()){assert.equal(evidence.manifestSha256,hash([before,after][index]));assert.equal(evidence.formatterEquivalence,false);assert.equal(evidence.runtimeParity,false);assert.equal(evidence.parseAdmission,false);assert.throws(()=>compileNumericSourceStages({...evidence}),/private captured/);}
 assert.deepEqual(observations[0].packages,observations[1].packages);assert.throws(()=>numericSourceInputsFromFiles(input(after+'\n')),/exact original Cargo/);
});

test('producer retains unrelated complete source changes and refuses changed anchors or historical archives',()=>{
 const inputs=sourceInputs(),path='tools/translation/derive-dependencies.mjs';inputs.sources.set(path,inputs.sources.get(path).replace('manifest or lock does not match','manifest or lock no longer matches'));
 // Unrelated authored text remains explicit in the full proposal, never hidden.
 const changed=deriveCargoLayoutInputCompatibility(inputs);assert.ok(changed.files.find(row=>row.path===path).text.includes('manifest or lock no longer matches'));
 const broken=sourceInputs();broken.sources.set(path,broken.sources.get(path).replace('hash(manifest)!==profile.manifestSha256','hash(manifest)!==unknownProfile.manifestSha256'));assert.throws(()=>deriveCargoLayoutInputCompatibility(broken),/changed|equation/);
 const corrupted=Buffer.from(archive);corrupted[corrupted.length-1]^=1;assert.throws(()=>deriveCargoLayoutInputCompatibility({...sourceInputs(),historyArchive:corrupted}),/historical input container changed/);
});

test('native syntax rejects duplicate lexical declarations without resolving or executing proposed modules',{timeout:30000},()=>{
 const path='tools/translation/derive-dependencies.mjs',valid=sourceInputs(),original=valid.sources.get(path),suffix='\nimport "__router_native_syntax_probe_missing_package__";\nthrow Error("native syntax must not execute proposed code");\n';
 valid.sources.set(path,original+suffix);const proposal=deriveCargoLayoutInputCompatibility(valid);assert.ok(proposal.files.find(row=>row.path===path).text.endsWith(suffix));
 const invalid=sourceInputs();invalid.sources.set(path,invalid.sources.get(path)+'\nconst __router_duplicate_native_probe=1;const __router_duplicate_native_probe=2;\n');
 assert.throws(()=>deriveCargoLayoutInputCompatibility(invalid),/already been declared/);
});
