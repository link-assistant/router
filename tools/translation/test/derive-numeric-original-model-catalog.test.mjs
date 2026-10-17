import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const pins=new Map([
  ['src/model_catalog_sources.rs','8737b379eadfcecd2cae09e3c2036d5ef89ff25aed5ae12d3d14d6ad3061c83a'],
  ['src/model_catalog_sources_config.rs','c2a422b2353658a5c2fd2e21a87769dcd9ff303a4ad07d047652ee245b95df51'],
  ['src/model_catalog_sources_fetch.rs','148888f50d7cae6cafddd085552b0275d9fb6632be9084519d1ed68c024f2d92'],
  ['src/model_catalog_sources_projection.rs','8c6fb9e071d2bebbc327e9cd2839deee818aed9f80691a7de2284b214d9d9632'],
]);
const hash=text=>createHash('sha256').update(text).digest('hex');

test('whole original model catalog retains numeric helpers and source-backed public limits in JS and TS',{timeout:60000},async()=>{
  const sources=new Map([...pins].map(([path,digest])=>{const source=readFileSync(new URL(path,root),'utf8');assert.equal(hash(source),digest);return [path,source];}));
  const result=translateProject({entry:'src/model_catalog_sources.rs',paths:[...sources.keys()],readSource:path=>sources.get(path),cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(result.meta.sources.length,4);for(const entry of result.meta.sources)assert.equal(entry.sha256,pins.get(entry.source));
  assert.equal(result.meta.runtimeParity,false);assert.ok(result.meta.refused.some(entry=>entry.name==='document_schema'),'JsonSchema execution and catalog I/O remain unimplemented');
  const certificate=result.meta.deriveNamespaceFootprints.certificates.find(entry=>entry.name==='ModelCatalogDocument');assert.ok(certificate);assert.equal(certificate.sourceSha256,pins.get('src/model_catalog_sources.rs'));assert.equal(certificate.generatedImplBehavior,false);assert.equal(certificate.dimensions.bangMacroComplete,false);
  assert.deepEqual(certificate.attributes.filter(entry=>entry.name==='schemars').map(entry=>entry.helpers[0].namespaceInput.bounds.map(bound=>[bound.name,bound.value])),[[['min','1'],['max','1']],[['max','4096']]]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  for(const [name,span]of [['MAX_DOCUMENT_BYTES',{start:767,end:817}],['MAX_MODELS',{start:864,end:899}]]){
    assert.deepEqual(result.meta.executable.find(entry=>entry.name===name)?.span,span);
    assert.equal(checked.declarations.get(name)?.constantEvaluationProof?.sourceLinksVerified,true);
  }
  await verifyTypedTargets(result,api=>{assert.equal(api.MAX_DOCUMENT_BYTES,1048576n);assert.equal(api.MAX_MODELS,4096n);assert.equal(api['config.DEFAULT_REFRESH_SECS'],10800n);},{childTimeoutMs:30000});
});
