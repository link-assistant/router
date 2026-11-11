// Compare all actual builtin invocations in the unchanged original associative
// module. Complete original graph/context, but no whole-bang or CSV claim.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {associatedOriginalInputs,associatedOriginalDependencyInputs} from '../../tools/translation/test/associated-original-context.mjs';
import {resolveModuleGraph} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {registeredStandardHostBindings} from '../../tools/translation/standard-host-bindings.mjs';
import {originalMatchesNamespaceBindings} from '../../tools/translation/matches-macro-context.mjs';
import {lockedTomlValueNamespaceBindings} from '../../tools/translation/toml-value-namespace.mjs';
import {createDeriveFootprintContext} from '../../tools/translation/derive-footprints.mjs';
import * as candidate from '../../tools/translation/builtin-derive-bang-footprints.mjs';
import {writeCompleteEvidenceJson,readCompleteEvidenceJson} from './complete-evidence-json.mjs';

const parent='f93b01795a935317942adfe7d329f636dcd1848b';
const base='ci-logs/issue-784-restart-2/current-original-csv-ordering-v2';
const root=new URL('../../',import.meta.url),translation=new URL('tools/translation/',root);
const started=performance.now(),hash=value=>createHash('sha256').update(value).digest('hex');
const progress=phase=>console.log(JSON.stringify({phase,elapsedMs:performance.now()-started,memory:process.memoryUsage()}));
function retain(name,value){const bytes=Buffer.from(JSON.stringify(value));assert.ok(bytes.length<=32*1024*1024);const path=writeCompleteEvidenceJson(base+'-'+name+'.json',bytes);console.log(JSON.stringify({path,bytes:bytes.length,sha256:hash(bytes)}));}
function relocate(path,destination,overrides={}){
 const original=execFileSync('git',['show',parent+':tools/translation/'+path],{encoding:'utf8',maxBuffer:1024*1024}),edits=[];
 let shift=0;
 const relocated=original.replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/gu,(whole,prefix,quote,spec,offset)=>{const replacement=prefix+quote+(overrides[spec]??new URL(spec,translation).href)+quote;edits.push({before:whole,after:replacement,sourceStart:offset,targetStart:offset+shift});shift+=replacement.length-whole.length;return replacement;});
 let inverse=relocated;for(const edit of [...edits].reverse()){assert.equal(inverse.slice(edit.targetStart,edit.targetStart+edit.after.length),edit.after);inverse=inverse.slice(0,edit.targetStart)+edit.before+inverse.slice(edit.targetStart+edit.after.length);}assert.equal(inverse,original);
 const target=new URL(destination,import.meta.url);writeFileSync(target,relocated,{flag:'wx'});assert.equal(readFileSync(target,'utf8'),relocated);retain(path.replace('.mjs','')+'-relocation',{parent,path,original,relocated,inverse,edits});return target;
}
const oldAst=relocate('builtin-ordering-ast-route.mjs','struct-ordering-f93-ast-relocated-v2.mjs');
const oldFootprint=relocate('builtin-derive-bang-footprints.mjs','struct-ordering-f93-footprint-relocated-v2.mjs',{'./builtin-ordering-ast-route.mjs':oldAst.href});
const baseline=await import(oldFootprint.href);
retain('candidate-sources',Object.fromEntries(['builtin-ordering-ast-route.mjs','builtin-ordering-struct-ast-route.mjs','builtin-derive-bang-footprints.mjs'].map(path=>[path,readFileSync(new URL(path,translation),'utf8')])));
progress('complete-original-inputs');
const data=associatedOriginalInputs('csv-original-source.test.mjs');
const {manifest,lock}=associatedOriginalDependencyInputs(data),dependencies=loadDeriveDependencyProof({manifest,lock});
const paths=data.inputs.sources.filter(row=>row.source.endsWith('.rs')).map(row=>row.source);
const inputs={inputs:data.inputs,association:data.association,scope:data.scope,sources:[...paths,'Cargo.toml','Cargo.lock'].map(path=>({path,source:data.source(path)}))};
assert.ok(readCompleteEvidenceJson('ci-logs/issue-784-restart-2/current-original-csv-namespace-inputs.json').equals(Buffer.from(JSON.stringify(inputs))));
console.log(JSON.stringify({reusedCompleteInputs:'current-original-csv-namespace-inputs.json.xz',sha256:hash(JSON.stringify(inputs))}));
progress('complete-original-graph');
const graph=resolveModuleGraph({entry:data.inputs.entry,paths,readSource:data.source,compilationProfile:data.inputs.compilationProfile});
const externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(dependencies)]);
progress('complete-original-derive-context');
const context=createDeriveFootprintContext({modules:graph.modules,dependencies,externalModules,compilationProfile:graph.compilationProfile});
assert.ok(readCompleteEvidenceJson('ci-logs/issue-784-restart-2/current-original-csv-namespace-v2-derive.json').equals(Buffer.from(JSON.stringify(context))));
const certificates=context.certificates.filter(row=>row.source==='src/storage/associative.rs');assert.equal(certificates.length,1);
const observations=[];
for(const certificate of certificates){
 assert.equal(certificate.name,'SemanticLink');
 const actual=certificate.attributes.filter(attribute=>attribute.name==='derive').flatMap(attribute=>attribute.derives.map(path=>({path,attributeSpan:attribute.span})));
 assert.deepEqual(actual.map(row=>row.path[0]),['Debug','Clone','PartialEq','Eq','PartialOrd','Ord']);
 for(const invocation of actual)for(const[name,issuer]of [['baseline',baseline],['candidate',candidate]]){
  progress(name+':'+invocation.path.join('::'));
  const args={context,certificate,invocation};let proof,error;
  try{proof=issuer.proveBuiltinDeriveBangFootprint(args);issuer.assertBuiltinDeriveBangFootprint(proof,context,certificate,invocation);}catch(cause){error={name:cause.name,message:cause.message,stack:cause.stack};}
  retain(name+'-'+invocation.path[0],{certificate,invocation,proof:proof??null,error:error??null});
  observations.push({issuer:name,owner:invocation.path[0],passed:!!proof&&!error,error:error?.message??null,schema:proof?.schema??null});
 }
}
retain('complete-observations',{parent,completeOriginalContextDigest:context.digest,completeOriginalModules:graph.modules.length,observations,productionExecutableGain:0,wholeBangContextRun:false,originalCsvReceivingTestRun:false,fullGatePassed:false,runtimeParity:false,rustExecuted:false});
for(const owner of ['PartialOrd','Ord']){assert.equal(observations.find(row=>row.issuer==='baseline'&&row.owner===owner).passed,false);assert.equal(observations.find(row=>row.issuer==='candidate'&&row.owner===owner).passed,true);}
assert.ok(observations.filter(row=>row.issuer==='candidate').every(row=>row.passed));
progress('complete-focused-original-invocation-comparison');
