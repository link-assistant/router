import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createAsyncTraitSourceInputs,loadAsyncTraitSourceInputs,requireAsyncTraitSourceInputs,originalAsyncTraitSource,originalAsyncTraitInputEvidence} from '../async-trait-source-inputs.mjs';
import {originalAsyncTraitEffectPlan,requireAsyncTraitEffectPlan,originalAsyncTraitEffectEvidence,originalAsyncTraitFunction,requireAsyncTraitFunction,inspectOriginalAsyncTraitImpl,originalAsyncTraitCallerEvidence} from '../async-trait-source-effects.mjs';
import {metadataDigest} from '../extensions/source-links.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const test=(name,body)=>nodeTest(name,{timeout:5000},body);
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')}),inputs=loadAsyncTraitSourceInputs(dependencies),plan=originalAsyncTraitEffectPlan(inputs);
function retain(name,value){const directory=process.env.ROUTER_ASYNC_TRAIT_VECTORS;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}}
function context(source,entry='src/lib.rs'){
 const graph=resolveModuleGraph({entry,paths:[entry],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE}),binding=resolveModuleBindings({modules:graph.modules,externalModules:registeredStandardHostBindings(),compilationProfile:PRODUCTION_PROFILE});return {source,graph,binding,module:graph.modules[0]};
}
function candidate(input,item){return inspectOriginalAsyncTraitImpl(plan,{module:input.module,modules:input.graph.modules,sourceScopes:input.binding.scopes,span:{start:item.start,end:item.end}});}
test('complete original async-trait archive and existing syntax sources retain exact locked bytes and licenses',()=>{
 const full=originalAsyncTraitInputEvidence(inputs),actual=full.sources.filter(row=>row.package==='async-trait');assert.equal(actual.length,53);assert.ok(actual.some(row=>row.path==='LICENSE-APACHE'));assert.ok(actual.some(row=>row.path==='LICENSE-MIT'));assert.equal(inputs.archiveSha256,'82f6aeea286b8eb4dd3431a1be1b59d290ace00f5bfd8e2a159bc2a05e2c1667');assert.equal(inputs.revision,'82e7e9edd60f622294373a23c0ce9c0077ad0263');
 for(const origin of full.sources)assert.equal(hash(origin.source),origin.sha256);
 for(const key of ['namespaceAuthority','headerTargetAuthority','wholeExpansionCompiled','runtimeParity'])assert.equal(inputs[key],false);retain('complete-original-inputs',{inputs,full});
});
test('source plans retain visitors Verbatim quote slots and the original Syn printers without effect authority',()=>{
 const full=originalAsyncTraitEffectEvidence(plan),expand=originalAsyncTraitFunction(plan,{package:'async-trait',path:'src/expand.rs',name:'expand'}),observer=full.observations.find(row=>row.function.sha256===expand.sha256);assert.ok(observer);assert.ok(observer.effects.mutableBorrows.some(row=>row.writtenPath.join('.')==='input.items'));assert.ok(observer.effects.mutableBorrows.some(row=>row.writtenPath.join('.')==='method.sig'));assert.ok(observer.effects.mutableBorrows.some(row=>row.writtenPath.join('.')==='method.block'));assert.equal(observer.effects.mutableBorrows.some(row=>row.writtenPath.includes('self_ty')),false);assert.ok(expand.original.includes('ImplItem::Verbatim(tokens)'));assert.ok(expand.original.includes('*tokens = quote!(#method)'));
 const printer=originalAsyncTraitFunction(plan,{package:'syn',path:'src/item.rs',name:'to_tokens',ownerContains:'implToTokensforItemImpl'});assert.ok(printer.original.includes('self.self_ty.to_tokens(tokens)'));assert.ok(printer.original.includes('tokens.append_all(&self.items)'));
 const replace=originalAsyncTraitSource(inputs,'async-trait','src/receiver.rs');assert.ok(replace.source.includes('visit_macro_mut'));assert.ok(plan.uncompiled.includes('copied input attributes and nested macros'));assert.equal(plan.completeOutputConfinement,false);retain('full-original-effects',{plan,full,expand,printer});
});
test('original compact public references fit unchanged metadata limits and roundtrip without becoming authority',()=>{
 const text=JSON.stringify(plan),copy=JSON.parse(text);assert.equal(metadataDigest(copy),metadataDigest(plan));assert.ok(Buffer.byteLength(text)<4*1024*1024);assert.equal('originalCargoInputs' in plan,false);assert.equal('observations' in plan,false);assert.equal('sources' in plan,false);
 for(const fake of [copy,{...plan},new Proxy(plan,{})])assert.throws(()=>requireAsyncTraitEffectPlan(fake),/copied, foreign or proxy/);
 const fn=originalAsyncTraitFunction(plan,{package:'async-trait',path:'src/expand.rs',name:'transform_sig'});assert.equal(requireAsyncTraitFunction(plan,fn),fn);for(const fake of [structuredClone(fn),{...fn},new Proxy(fn,{})])assert.throws(()=>requireAsyncTraitFunction(plan,fake),/copied or foreign/);
 const foreign=originalAsyncTraitEffectPlan(inputs);assert.throws(()=>requireAsyncTraitFunction(foreign,fn),/copied or foreign/);retain('compact-roundtrip-controls',{plan,copy,fullPublicBytes:Buffer.byteLength(text),function:fn});
});
test('forged dependency carriers changed complete archives and public source selectors cannot issue input proofs',()=>{
 const archive=readFileSync(new URL('../source-profiles/async-trait-output/async-trait-0.1.92.crate',import.meta.url)),changed=Buffer.from(archive);changed[changed.length-1]^=1;
 for(const fake of [structuredClone(dependencies),{...dependencies},new Proxy(dependencies,{})])assert.throws(()=>createAsyncTraitSourceInputs({deriveDependencies:fake,archive}),/genuine original/);
 assert.throws(()=>createAsyncTraitSourceInputs({deriveDependencies:dependencies,archive:changed}),/archive differs/);assert.throws(()=>createAsyncTraitSourceInputs({deriveDependencies:dependencies,archive:archive.subarray(0,-1)}),/archive differs/);
 for(const fake of [structuredClone(inputs),{...inputs},new Proxy(inputs,{})])assert.throws(()=>requireAsyncTraitSourceInputs(fake),/copied or foreign/);assert.throws(()=>originalAsyncTraitSource(inputs,'async-trait','../src/expand.rs'),/outside complete/);retain('archive-origin-negative-controls',{inputs,originalSha256:hash(archive),changedSha256:hash(changed)});
});
for(const [file,target,macroCount]of [['src/provider_connector.rs','SubscriptionConnector',0],['src/crater.rs','ForgeFedTaskProvider',2]])test('complete unchanged '+file+' retains exact original impl and all copied macro residuals',()=>{
 const source=readFileSync(new URL(file,root),'utf8'),input=context(source,file),items=originalSourceModuleItems(input.module).filter(item=>item.term==='impl'&&item.tokens.some((token,index,tokens)=>token.text==='for'&&tokens[index+1]?.text===target));assert.equal(items.length,1);const selected=candidate(input,items[0]),full=originalAsyncTraitCallerEvidence(selected);assert.equal(selected.sourceSha256,hash(source));assert.equal(selected.originalSha256,hash(full.original));assert.equal(selected.copiedBodyMacros.length,macroCount);assert.ok(selected.members.some(row=>row.async));assert.equal(selected.headerTargetAuthority,false);assert.equal(selected.completeOutputConfinement,false);assert.equal(selected.callerOwnerJoined,false);
 if(macroCount)assert.ok(selected.copiedBodyMacros.every(row=>row.path.join('')==='format'));
 for(const fake of [structuredClone(selected),{...selected},new Proxy(selected,{})])assert.throws(()=>originalAsyncTraitCallerEvidence(fake),/copied, foreign or proxy/);retain('whole-original-'+target,{file,source,graphDiagnostics:input.graph.diagnostics,binding:input.binding,selected,original:full.original,members:full.members,bodyMacros:full.bodyMacros});
});
test('custom attributes unknown cfg bang macros and nested Drop remain explicit inert caller obligations',()=>{
 const rows=[];for(const source of ['#[custom] impl Trait for Payload {async fn run(&self){unknown!()}}','#[cfg(unix)] #[async_trait] impl Trait for Payload {async fn run(&self){}}','#[async_trait] impl Trait for Payload {async fn run(&self){impl Drop for Payload {fn drop(&mut self){}}}}']){
  const input=context(source),item=originalSourceModuleItems(input.module).find(row=>row.term==='impl');assert.ok(item);const selected=candidate(input,item),full=originalAsyncTraitCallerEvidence(selected);assert.equal(selected.callerOwnerJoined,false);assert.equal(selected.noDropAuthority,false);assert.equal(selected.headerTargetAuthority,false);assert.equal(full.original,source);rows.push({source,selected,original:full.original});
 }
 const input=context('#[async_trait] impl Trait for Payload {async fn run(&self){}}'),item=originalSourceModuleItems(input.module).find(row=>row.term==='impl');assert.throws(()=>inspectOriginalAsyncTraitImpl(plan,{module:input.module,modules:input.graph.modules,sourceScopes:structuredClone(input.binding.scopes),span:{start:item.start,end:item.end}}),/exact original/);assert.throws(()=>inspectOriginalAsyncTraitImpl(plan,{module:{...input.module,source:input.source+' '},modules:input.graph.modules,sourceScopes:input.binding.scopes,span:{start:item.start,end:item.end}}),/Original module view is unsealed or its complete source changed/);
 const mutable={...input.module},captured=inspectOriginalAsyncTraitImpl(plan,{module:mutable,modules:input.graph.modules,sourceScopes:input.binding.scopes,span:{start:item.start,end:item.end}});assert.equal(originalAsyncTraitCallerEvidence(captured).original,input.source);mutable.source+=' ';assert.throws(()=>originalAsyncTraitCallerEvidence(captured),/Original module view is unsealed or its complete source changed/);retain('actual-caller-refusal-controls',{rows,outsideSpanMutation:{original:input.source,changed:mutable.source,captured,denied:true}});
});
test('original body pairing and commented cfg retain exact boundaries and unknown availability',()=>{
 const rows=[];for(const source of ['#[async_trait]impl Trait<{1}> for Payload {async fn run(&self){}}','/// Original documentation\n#[cfg(unix)]#[async_trait]impl Trait for Payload{async fn run(&self){}}']){
  const input=context(source),item=originalSourceModuleItems(input.module).find(row=>row.term==='impl'),selected=candidate(input,item),full=originalAsyncTraitCallerEvidence(selected);assert.equal(selected.members.filter(row=>row.name==='run').length,1);assert.equal(full.body,source.slice(selected.bodySpan.start,selected.bodySpan.end));assert.equal(selected.headerTargetAuthority,false);if(source.includes('cfg(unix)'))assert.equal(selected.condition.status,'unknown');rows.push({source,selected,original:full.original,body:full.body});
 }
 retain('original-boundary-and-condition-controls',rows);
});
