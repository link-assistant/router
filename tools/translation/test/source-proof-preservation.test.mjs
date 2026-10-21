import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {translateProject} from '../project.mjs';
import {prepareSourceProofPreservation,composeSourceProofPreservation} from '../prepare-source-proof-preservation.mjs';
import {requireSourceConversionScope} from '../extensions/source-conversion-scope.mjs';
import {requireOriginalConversionEmission} from '../extensions/source-conversion-body.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
const root=new URL('../../../',import.meta.url),inputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},dependencies=loadDeriveDependencyProof(inputs);
function conversions(node,result=[]){if(!node||typeof node!=='object')return result;if(node.k==='routerSourceConversion')result.push(node);for(const [key,value]of Object.entries(node))if(key!=='sourceConversionProof')for(const child of Array.isArray(value)?value:[value])conversions(child,result);return result;}
test('complete source proof preservation composes after the exact checkedSource parent and retains native copies and inverses',{timeout:60000},()=>{
 const plan=prepareSourceProofPreservation();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.nativeCopies.length,2);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));assert.equal(row.completeNativeAstCopy,true);assert.equal(row.inverse,row.before);assert.equal(row.current,row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.stages.every(stage=>stage.completeInverse));assert.ok(row.after.includes("'sourceConversionScope'"));}
 const prior=Object.fromEntries(plan.files.map(row=>[row.path,{after:row.before}])),composed=composeSourceProofPreservation(prior);assert.equal(composed.layers.length,1);assert.equal(composed.sources['tools/translation/project.mjs'].after,plan.files[0].after);assert.equal(composed.historicalSources,prior);assert.throws(()=>composeSourceProofPreservation({'tools/translation/project.mjs':{after:plan.files[0].before+' '}}),/preceding/);
});
test('root and nonzero nested Into call sites retain complete original Engine caller proof coordinates in both checked targets',{timeout:60000},async()=>{
 const source='use base64::Engine as _;pub fn prefix(v:u8)->u8{v}pub fn route(v:u8)->u8{v.into()}mod inner{pub fn route(v:u8)->u8{v.into()}}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:inputs.manifest,deriveDependencies:dependencies});assert.deepEqual(result.meta.refused.filter(row=>row.term==='fn'),[]);const nodes=[...new Map(conversions(result.meta.checkedSemanticProgram).map(node=>[node.sourceConversionProof.digest,node])).values()];assert.equal(nodes.length,2);
 for(const node of nodes){assert.ok(requireOriginalConversionEmission(node));const caller=requireSourceConversionScope(node.sourceConversionProof.caller);assert.ok(caller.anonymousTraits.length);const producer=caller.anonymousTraits[0].declaration.originalProducerSourceABI;assert.equal(producer.items.length,2);assert.deepEqual(producer.items.map(item=>item.span),[{start:18105,end:18517},{start:18571,end:18814}]);const copy=structuredClone(caller);copy.anonymousTraits[0].declaration.originalProducerSourceABI.items[0].span.start++;assert.throws(()=>requireSourceConversionScope(copy),/changed|forged/);}
 await verifyTypedTargets(result,api=>{for(const name of ['route','inner.route'])for(const value of [0n,1n,127n,255n])assert.equal(api[name](value),value);assert.throws(()=>api.prefix(256n),RangeError);},{childTimeoutMs:20000});
});
