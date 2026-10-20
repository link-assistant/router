import {repositorySourcePath} from "../../tools/translation/test/fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {reviewStoredProjectGeneratedMethods as reviewGeneratedMethods} from '../review-translation-draft.mjs';
import {translateProject} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../../tools/translation/json-macro-inputs.mjs';
import {metadataDigest} from '../../tools/translation/extensions/source-links.mjs';
import {verifyTypedTargets} from '../../tools/translation/test/typed-targets.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {parseProgram} from '../../tools/translation/semantic-meta.mjs';
import {decodeBuiltinSourceMeta,encodeBuiltinSourceMeta} from '../../tools/translation/builtin-source-meta.mjs';
const root=new URL('../../',import.meta.url),read=name=>execFileSync('git',['show','HEAD:'+repositorySourcePath(name,root)],{cwd:root,timeout:30000,maxBuffer:16*1024*1024}).toString(),inputs={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},dependencies=loadDeriveDependencyProof(inputs),jsonMacroDependencies=loadJsonMacroSourceProof(inputs),hash=value=>createHash('sha256').update(value).digest('hex');
function retain(name,value){if(!process.env.ROUTER_OPTION_CLONE_REVIEW_VECTORS)return;mkdirSync(process.env.ROUTER_OPTION_CLONE_REVIEW_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_OPTION_CLONE_REVIEW_VECTORS+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}
function compile(source,file='src/lib.rs'){const result=translateProject({entry:file,paths:[file],readSource:()=>source,cargoManifest:inputs.manifest,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE});return {source,file,result,meta:JSON.parse(JSON.stringify(result.meta))};}
const fixtures=new Map();
function fixture(copy=false){const key=copy?'copy':'fieldwise';if(!fixtures.has(key))fixtures.set(key,compile('#[derive(Clone'+(copy?',Copy':'')+')]pub struct Payload{a:Option<u64>,b:Option<bool>,flag:bool}pub fn duplicate(x:&Payload)->Payload{x.clone()}'));return fixtures.get(key);}
const row=meta=>meta.checkedGeneratedMethods.find(item=>item.generator==='core::clone::Clone'),entry=(meta,key)=>meta[key].program.declarations.$map.find(([,item])=>item.impl?.cloneSourceProof)[1],checked=meta=>entry(meta,'checkedSemanticProgram'),target=meta=>entry(meta,'targetSemanticProgram'),proofs=meta=>[row(meta).cloneSourceProof,checked(meta).impl.cloneSourceProof,target(meta).impl.cloneSourceProof];
function review(f,meta=f.meta,proof=dependencies){return reviewGeneratedMethods(meta,{entry:f.file,checkedGeneratedMethods:f.meta.checkedGeneratedMethods.length},{readSource:()=>f.source,dependencies:proof,jsonMacroDependencies,cargoManifest:inputs.manifest});}
for(const copy of [false,true])test('independent '+(copy?'Copy':'fieldwise')+' Option Clone proof rejoins complete actual source and checked bodies',{timeout:60000},async()=>{
 const f=fixture(copy);retain('original-'+copy,f);const rows=review(f);assert.equal(rows.length,1);assert.equal(rows[0].cloneSourceProof.schema,'original-generated-option-clone-ir-v1');assert.equal(rows[0].receiver,'shared');assert.equal(rows[0].runtimeParity,false);assert.equal(rows[0].semanticAuthority,false);assert.equal(f.meta.executable.length,1);assert.equal(f.meta.checkedMethods.length,0);
 await verifyTypedTargets(f.result,api=>{for(const a of [Object.freeze({$:'None'}),Object.freeze({$:'Some',field0:18446744073709551615n})])for(const b of [Object.freeze({$:'None'}),Object.freeze({$:'Some',field0:false})]){const input=Object.freeze({$:'Payload',a,b,flag:true}),output=api.duplicate(input);assert.deepEqual(output,input);assert.notStrictEqual(output,input);assert.notStrictEqual(output,api.duplicate(input));assert.strictEqual(input.a,a);assert.strictEqual(input.b,b);assert.ok(Object.isFrozen(output));}},{childTimeoutMs:20000});retain('reviewed-'+copy,rows);
});
const walk=(node,visit)=>{if(!node||typeof node!=='object')return;visit(node);for(const [key,value]of Object.entries(node))if(!['type','cloneSourceProof'].includes(key))Array.isArray(value)?value.forEach(child=>walk(child,visit)):walk(value,visit);};
function mirror(meta,change){for(const proof of proofs(meta))change(proof);}
for(const [label,change]of [
 ['plan',meta=>mirror(meta,p=>p.originalCompilerPlanDigest='f'.repeat(64))],
 ['Option-source',meta=>mirror(meta,p=>p.optionSource.selection.method.bodySource='forged')],
 ['Option-AST',meta=>mirror(meta,p=>p.optionSource.syntax.rows.reverse())],
 ['primitive-body',meta=>mirror(meta,p=>p.primitiveBodies[0].syntax.value.path=['other'])],
 ['field-type',meta=>mirror(meta,p=>p.fields[0].payload.rustPrimitiveName='i64')],
 ['field-scope',meta=>mirror(meta,p=>p.fields[0].sourceScopeSha256='f'.repeat(64))],
 ['no-Drop',meta=>mirror(meta,p=>p.noDropProof.copyAuthority=true)],
 ['receiver',meta=>mirror(meta,p=>p.receiver.originalParameter.name='other')],
 ['source-bang',meta=>mirror(meta,p=>p.sourceBangProof.originalHelperOwners.push({foreign:true}))],
 ['extra-proof',meta=>mirror(meta,p=>p.foreign=true)],
 ['signed-key-order',meta=>mirror(meta,p=>{const schema=p.schema;delete p.schema;p.schema=schema;})],
 ['checked-key-order',meta=>{const p=checked(meta).impl.cloneSourceProof,schema=p.schema;delete p.schema;p.schema=schema;}],
 ['target-key-order',meta=>{const p=target(meta).impl.cloneSourceProof,schema=p.schema;delete p.schema;p.schema=schema;}],
 ['body-and-rehash',meta=>{for(const e of [checked(meta),target(meta)]){walk(e.body,n=>{if(n.k==='routerField')n.field='other';});e.body.cloneSourceProof.computationSha256=metadataDigest(checked(meta).body.body);e.body.cloneSourceProof.digest=row(meta).cloneSourceProof.digest;e.body.cloneSourceProof.digest=metadataDigest(e.body.cloneSourceProof);}}],
 ['canonical-generic-layout',meta=>{for(const key of ['checkedSemanticProgram','targetSemanticProgram'])meta[key].program.declarations.$map.find(([,e])=>e.standardGeneric?.kind==='Option')[1].ctors[0].name='Wrong';}],
 ['shared-to-mutable',meta=>checked(meta).params[0].type.rustReference.kind='mutable'],
 ['borrowed-return',meta=>checked(meta).ret.rustReference={kind:'shared'}],
 ['const-authority',meta=>checked(meta).body.constEligible=true],
 ['checked-extra-authority',meta=>checked(meta).semanticAuthority=true],
 ['checked-const-function',meta=>checked(meta).constFunction=true],
 ['target-extra-authority',meta=>target(meta).semanticAuthority=true],
 ['target-const-function',meta=>target(meta).constFunction=true],
 ['wrong-source-term',meta=>row(meta).originalDeclarationTerm='enum'],
 ['original-fn-overlap',meta=>meta.executable.push({source:'src/lib.rs',span:row(meta).span})],
 ['original-method-overlap',meta=>meta.checkedMethods.push({source:'src/lib.rs',span:row(meta).span})],
 ['missing-row',meta=>meta.checkedGeneratedMethods=[]],
 ['duplicate-row',meta=>meta.checkedGeneratedMethods.push(structuredClone(row(meta)))],
 ])test('Option Clone review refuses mirrored or unissued '+label,()=>{const f=fixture(),meta=structuredClone(f.meta);change(meta);let error;try{review(f,meta);}catch(thrown){error=thrown;}assert.ok(error,label);retain('negative-'+label,{meta,error:{message:error.message,cause:error.cause}});});
for(const suffix of ['trait Clone{}','struct Option<T>{value:T}','fn hidden(){impl Drop for Payload{fn drop(&mut self){}}}','use Payload as Alias;fn hidden(){impl Drop for Alias{fn drop(&mut self){}}}','fn hidden(){unknown!();}'])test('Option Clone review rejects changed complete original coherence '+suffix,()=>{const f={...fixture(),source:fixture().source+suffix},meta=structuredClone(f.meta),sha=hash(f.source);meta.sources[0].sha256=sha;mirror(meta,p=>p.sourceSha256=sha);assert.throws(()=>review(f,meta));retain('coherence-'+hash(suffix),{source:f.source,meta});});
test('Option Clone private dependencies, hooks and counts remain mandatory',()=>{const f=fixture();for(const proof of [undefined,structuredClone(dependencies),jsonMacroDependencies])assert.throws(()=>review(f,f.meta,proof===undefined?null:proof));for(const count of [0,2,-1,'1'])assert.throws(()=>reviewGeneratedMethods(f.meta,{entry:f.file,checkedGeneratedMethods:count},{readSource:()=>f.source,dependencies,jsonMacroDependencies}),/count/);let hooks=0;const meta=structuredClone(f.meta);Object.defineProperty(row(meta).cloneSourceProof,'source',{enumerable:true,get(){hooks++;throw Error('getter');}});assert.throws(()=>review(f,meta),/metadata/);assert.throws(()=>review(f,new Proxy(f.meta,{get(){hooks++;throw Error('proxy');}})),/metadata/);assert.equal(hooks,0);});
for(const [label,source]of [['nested','mod inner{#[derive(Clone,Copy)]pub struct Payload{a:Option<u64>}pub fn duplicate(x:&Payload)->Payload{x.clone()}}'],['shared-generic-origin','#[derive(Clone)]pub struct First{a:Option<u64>}#[derive(Clone)]pub struct Second{b:Option<u64>}']])test('Option Clone original generic layout origin '+label,{timeout:60000},()=>{const f=compile(source);retain('layout-'+label,f);const rows=review(f);assert.equal(rows.length,label==='nested'?1:2);});
for(const file of ['src/output_limit.rs'])test('complete original refused Option owner remains independently refused '+file,{timeout:60000},()=>{const f=compile(read(file),file),rows=review(f);assert.ok(f.meta.refused.some(item=>item.name===(file.includes('output')?'OutputTokenLimiter':'UsagePool')+'.clone'));assert.ok(!rows.some(item=>item.cloneSourceProof?.schema==='original-generated-option-clone-ir-v1'));retain('complete-'+file.replaceAll('/','_'),{f,rows});});

function renameLocal(meta,old,name,renameVariables=true){for(const e of [checked(meta),target(meta)])walk(e.body,node=>{if(node.k==='let'&&node.name===old||renameVariables&&node.k==='var'&&node.name===old)node.name=name;});}
function rehash(meta){for(const e of [checked(meta),target(meta)]){e.body.cloneSourceProof.computationSha256=metadataDigest(checked(meta).body.body);e.body.cloneSourceProof.digest=row(meta).cloneSourceProof.digest;e.body.cloneSourceProof.digest=metadataDigest(e.body.cloneSourceProof);}}
test('Option Clone corresponding nested fresh local names preserve original lexical scope',()=>{const f=fixture(),meta=structuredClone(f.meta);const names=[];walk(checked(meta).body,node=>{if(node.k==='let')names.push(node.name);});for(const [index,name]of names.entries())renameLocal(meta,name,'checked_fresh_'+index);rehash(meta);const rows=review(f,meta);assert.equal(rows.length,1);assert.notEqual(rows[0].checkedBodySha256,review(f)[0].checkedBodySha256);retain('genuine-nested-alpha',{meta,rows});});
for(const [label,mutate]of [
 ['capture-parameter',meta=>renameLocal(meta,'ml_source_option_clone_1','ml_clone_self')],
 ['capture-pattern',meta=>renameLocal(meta,'ml_source_option_clone_1','x')],
 ['merge-bindings',meta=>renameLocal(meta,'ml_source_option_clone_2','ml_source_option_clone_1')],
 ['dangling-use',meta=>renameLocal(meta,'ml_source_option_clone_1','other',false)],
 ['initializer-scope',meta=>{for(const e of [checked(meta),target(meta)])e.body.body.value.value.object.name='ml_source_option_clone_2';}],
 ['field-order',meta=>{for(const e of [checked(meta),target(meta)]){const first=e.body.body.value.value.field;e.body.body.value.value.field=e.body.body.body.value.value.field;e.body.body.body.value.value.field=first;}}],
 ])test('Option Clone alpha refuses '+label,()=>{const f=fixture(),meta=structuredClone(f.meta);mutate(meta);rehash(meta);assert.throws(()=>review(f,meta));retain('alpha-negative-'+label,{meta});});
test('Copy Option Clone whole independent Copy and no-Drop certificate remains exact',()=>{const f=fixture(true);for(const mutate of [body=>body.cloneSourceProof.checkedCopyProof=null,body=>body.cloneSourceProof.checkedCopyProof.proof.layout.fullName='Foreign',body=>body.cloneSourceProof.checkedCopyProof.proof.certificate.verified=false]){const meta=structuredClone(f.meta);for(const e of [checked(meta),target(meta)])mutate(e.body);assert.throws(()=>review(f,meta));retain('copy-proof-'+hash(JSON.stringify(meta.checkedSemanticProgram)),{meta});}});
test('Option Clone unrelated original module changes cannot reuse a source proof',()=>{const f=compile('mod sibling{pub struct Unused{field:bool}}'+fixture().source),meta=structuredClone(f.meta),source=f.source.replace('field:bool','field:u8'),sha=hash(source);for(const item of meta.sources)item.sha256=sha;mirror(meta,p=>p.sourceSha256=sha);assert.throws(()=>review({...f,source},meta));retain('unrelated-module-changed',{source,meta});});

// This is the complete unchanged standalone module, not the ancestor library.
// Its old refusal remains in the sealed 1f9 vectors; the whole-library source
// scope still refuses this Clone and grants no corresponding library gain.
let usagePoolFixture;
function usagePool(){return usagePoolFixture??=compile(read('src/subscription_usage_types.rs'),'src/subscription_usage_types.rs');}
const usageRow=meta=>meta.checkedGeneratedMethods.find(item=>item.name==='UsagePool.clone');
function usageEntries(meta){return ['checkedSemanticProgram','targetSemanticProgram'].map(key=>meta[key].program.declarations.$map.find(([,item])=>item.impl?.cloneSourceProof?.span.start===usageRow(meta).span.start)[1]);}
function usageProofs(meta){return [usageRow(meta).cloneSourceProof,...usageEntries(meta).map(item=>item.impl.cloneSourceProof)];}
function sibling(proof,owner='serde::Serialize'){return proof.noDropProof.deriveOutputs.find(item=>item.siblingTrait&&item.originalTraitPath.target.join('::')===owner);}
function unpackStored(node){return node[0]==='leaf'?decodeBuiltinSourceMeta(node[1]):node[0]==='array'?node[1].map(unpackStored):Object.fromEntries(node[1].map(([key,child])=>[key,unpackStored(child)]));}
function changeStoredHeader(storage){
 let changed=0;
 function mutate(node){if(!node||typeof node!=='object')return;if(node.traitIdentity==='serde::Serialize'){node.traitIdentity='core::ops::Drop';changed++;}for(const value of Object.values(node))mutate(value);}
 function visit(node){if(node[0]==='leaf'){const value=structuredClone(decodeBuiltinSourceMeta(node[1]));mutate(value);node[1]=encodeBuiltinSourceMeta(value);}else for(const child of node[1])visit(node[0]==='object'?child[1]:child);}
 visit(storage.tree);assert.ok(changed);const original=JSON.stringify(unpackStored(storage.tree));storage.bytes=Buffer.byteLength(original);storage.sha256=hash(original);
}
test('complete original standalone UsagePool Clone independently rejoins sibling outputs and executes JS and strict TypeScript',{timeout:60000},async()=>{
 const f=usagePool(),rows=review(f),item=usageRow(f.meta),provider=rows.find(row=>row.name==='UsageProvider.clone');assert.ok(item);assert.ok(provider);assert.equal(provider.originalDeclarationTerm,'enum');assert.equal(f.meta.executable.length,0);assert.deepEqual(f.meta.checkedMethods.map(item=>item.name),['UsageProvider.as_str']);assert.deepEqual(rows.map(item=>item.name),['UsageProvider.clone','UsageState.clone','UsagePool.clone']);assert.equal(rows.length+f.meta.refused.length,14);assert.ok(f.meta.refused.some(item=>item.name==='UsageWindow.clone'));assert.ok(!f.meta.refused.some(item=>item.name==='UsagePool.clone'));
 assert.deepEqual(item.cloneSourceProof.noDropProof.deriveOutputs.filter(item=>item.siblingTrait).map(item=>item.originalTraitPath.target.join('::')),['serde::Deserialize','serde::Serialize','schemars::JsonSchema']);
 for(const output of item.cloneSourceProof.noDropProof.deriveOutputs.filter(item=>item.siblingTrait)){const original=unpackStored(output.sourceOutputStorage.tree);assert.equal(original.schema,'original-clone-sibling-trait-output-v1');assert.equal(original.noDropAuthority,false);assert.equal(original.traitBehavior,false);assert.ok(original.routes.every(route=>route.completeAnonymousConst));if(original.owner==='serde::Deserialize')assert.deepEqual(original.routes.map(route=>route.feature),['disabled','enabled']);}
 const program=parseProgram(JSON.stringify(f.meta.targetSemanticProgram)),entry=[...program.declarations.values()].find(entry=>entry.impl?.cloneSourceProof?.span.start===item.span.start),exports='\nexport {'+entry.fullName+' as originalClone,'+provider.targetName+' as originalProviderClone};',targets={...f.result,javascript:f.result.javascript+exports,typescript:f.result.typescript+exports};
 retain('complete-standalone-UsagePool',{f,rows,targets,scope:{entry:f.file,completeOriginalModule:true,ancestorLibraryAdmitted:false,originalFunctions:0,writtenMethods:1,generatedMethods:rows.length,refusals:f.meta.refused.length,unchangedGeneratedAndRefusedTotal:14}});
 await verifyTypedTargets(targets,(_api,_result,module)=>{for(const variant of ['Anthropic','OpenAi','ZAi','Lefine','Gemini','Qwen']){const input=Object.freeze({$:variant}),output=module.originalProviderClone(input);assert.deepEqual(output,input);assert.ok(Object.isFrozen(output));}assert.throws(()=>module.originalProviderClone(Object.freeze({$:'Foreign'})));for(const first of [null,0n,18446744073709551615n])for(const second of [null,0n,18446744073709551615n])for(const third of [null,0n,18446744073709551615n]){
  const option=value=>Object.freeze(value===null?{$:'None'}:{$:'Some',field0:value}),a=option(first),b=option(second),c=option(third),input=Object.freeze({$:'UsagePool',configured_accounts:3n,contributing_accounts:2n,unavailable_accounts:1n,cooling_down_accounts:a,paused_accounts:b,model_cooldowns:c}),output=module.originalClone(input);
  assert.deepEqual(output,{$:'UsagePool',configured_accounts:3n,contributing_accounts:2n,unavailable_accounts:1n,cooling_down_accounts:first===null?{$:'None'}:{$:'Some',field0:first},paused_accounts:second===null?{$:'None'}:{$:'Some',field0:second},model_cooldowns:third===null?{$:'None'}:{$:'Some',field0:third}});assert.notStrictEqual(output,input);assert.notStrictEqual(module.originalClone(input),output);assert.ok(Object.isFrozen(output));assert.strictEqual(input.cooling_down_accounts,a);assert.strictEqual(input.paused_accounts,b);assert.strictEqual(input.model_cooldowns,c);assert.throws(()=>module.originalClone({...input}),/immutable|frozen/);
 }},{childTimeoutMs:20000});
});
for(const [label,mutate]of [
 ['sibling-trait-owner',proof=>sibling(proof).originalTraitPath.target=['core','ops','Drop']],
 ['sibling-feature-closure',proof=>sibling(proof,'serde::Deserialize').sourceOutputDigest='f'.repeat(64)],
 ['mirrored-rehashed-header',proof=>changeStoredHeader(sibling(proof).sourceOutputStorage)],
 ['whole-original-storage-sha',proof=>sibling(proof).sourceOutputStorage.sha256='f'.repeat(64)],
 ['missing-sibling',proof=>proof.noDropProof.deriveOutputs.splice(proof.noDropProof.deriveOutputs.findIndex(item=>item.siblingTrait),1)],
 ['sibling-authority',proof=>sibling(proof).sourceOutputStorage.noDropAuthority=true],
 ['source-header-proof-order',proof=>proof.noDropProof.deriveOutputs.reverse()],
 ['field-type-payload',proof=>proof.fields.find(field=>field.owner==='Option').payload.rustPrimitiveName='u32'],
 ])test('complete UsagePool independent review rejects mirrored '+label,{timeout:60000},()=>{const f=usagePool(),meta=structuredClone(f.meta);for(const proof of usageProofs(meta))mutate(proof);let error;try{review(f,meta);}catch(thrown){error=thrown;}assert.ok(error,label);retain('whole-UsagePool-negative-'+label,{source:f.source,meta,error:{message:error.message,cause:error.cause}});});
