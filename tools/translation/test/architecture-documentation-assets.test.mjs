// Independent complete archive/census SOURCE. All cases remain UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalFreshPrimitiveNamespaceSources,originalFreshPrimitiveNamespaceSourcesWithDocumentation,PRIMITIVE_NAMESPACE_SOURCE_PROFILE} from '../extensions/primitive-namespace-sources.mjs';
import {prepareArchitectureDocumentationAssetsSources} from '../prepare-architecture-documentation-assets-sources.mjs';
const limits={timeout:60000},path='crates/core_arch/src/core_arch_docs.md',hash=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
test('the additive whole archive reader preserves all original Rust members and one exact documentation asset',limits,()=>{
 const current=originalFreshPrimitiveNamespaceSourcesWithDocumentation(),old=originalFreshPrimitiveNamespaceSources();assert.equal(old.has(path),false);assert.equal(current.size,old.size+1);for(const [name,row]of old){const actual=current.get(name);assert.ok(actual,name);assert.equal(actual.source,row.source);assert.equal(actual.sha256,row.sha256);assert.equal(actual.gitBlobSha,row.gitBlobSha);assert.notStrictEqual(actual,row);}const source=current.get(path);assert.equal(source.bytes,12220);assert.ok(source.source.startsWith('SIMD and vendor intrinsics module.'));assert.equal(source.source.includes('\r'),false);assert.equal(source.assetRole,'documentation-source');assert.equal(source.actualRustNamespacePath,null);assert.equal(source.sourceFileContextQualified,false);assert.equal(source.sourceAuthority,false);assert.equal(source.namespaceAuthority,false);assert.equal(source.runtimeAuthority,false);assert.ok(current.get('crates/core_arch/src/mod.rs').source.includes('include_str!("core_arch_docs.md")'));
 assert.equal(PRIMITIVE_NAMESPACE_SOURCE_PROFILE.stdarch.namespaceSourceFiles.length,135);for(const member of PRIMITIVE_NAMESPACE_SOURCE_PROFILE.stdarch.namespaceSourceFiles)assert.ok(current.has(member.path));assert.equal([...current.keys()].filter(name=>name.startsWith('crates/core_arch/')&&!name.endsWith('.rs')).length,1);
});
test('the retained original byte SHA and Git blob identity agree independently with the complete asset pin',limits,()=>{
 const profile=JSON.parse(gunzipSync(readFileSync(new URL('../source-profiles/architecture-documentation-assets/complete-document-asset-inputs.json.gz',import.meta.url))).toString('utf8')),pin=profile.assets[0],asset=originalFreshPrimitiveNamespaceSourcesWithDocumentation().get(path),raw=Buffer.from(asset.source,'utf8');assert.equal(profile.assets.length,1);assert.equal(pin.path,path);assert.equal(profile.primitiveManifestSha256,PRIMITIVE_NAMESPACE_SOURCE_PROFILE.manifestSha256);assert.equal(profile.stdarchArchiveSha256,PRIMITIVE_NAMESPACE_SOURCE_PROFILE.stdarch.archiveSha256);assert.equal(raw.length,pin.bytes);assert.equal(hash(raw),pin.sha256);assert.equal(hash(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw]),'sha1'),pin.gitBlobSha);
});
test('all three complete source equations retain whole original readers native owner spans and both phases',limits,()=>{
 const plan=prepareArchitectureDocumentationAssetsSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
