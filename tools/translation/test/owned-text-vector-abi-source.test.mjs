// Independent whole-source ABI/root proposal case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOwnedTextVectorRootSource as propose} from '../owned-text-vector-root-source.mjs';
import {withOriginalOwnedTextVectorSourceOperation as scope,observeCurrentOwnedTextVectorCoreSources as observe,requireCurrentOwnedTextVectorOperationSource as requireOperation,requireCurrentOwnedTextVectorOriginalOperationSource as originalOperation} from '../current-owned-text-vector-source.mjs';
import {ownedTextVectorReceivingConfiguration as configuration} from '../owned-text-vector-receiving-paths.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareOwnedTextVectorAbiSources} from '../prepare-owned-text-vector-abi-sources.mjs';
const limits={timeout:60000},original='// retained original root\r\npub fn keep(value:bool)->bool{value}\n';
const cases=[
 ['new',[],'vec:text-owned',[],[]],
 ['from_slice',['text-owned-list-ref'],'vec:text-owned',[],[0]],
 ['push',['vec:text-owned','text-owned'],'vec:text-owned',[0,1],[]],
 ['append',['vec:text-owned','vec:text-owned'],'vec:text-owned',[0,1],[]],
 ['truncate',['vec:text-owned','u64'],'vec:text-owned',[0],[]],
 ['replace',['vec:text-owned','u64','text-owned'],'vec:text-owned',[0,2],[]],
 ['len',['vec:text-owned-ref'],'u64',[],[0]],
 ['get',['vec:text-owned-ref','u64'],'text-owned-option',[],[0]],
];
function receiving(options={}){const proposal=propose(original,options),files=new Map(proposal.files.map(row=>[row.path,row.after??row.source]));return {proposal,files,options:proposal.configuration};}
for(const entry of ['src/lib.rs','src/main.rs','rust/src/lib.rs','rust/src/main.rs'])for(const separate of [false,true])test(entry+' complete '+(separate?'mirrored':'single')+' receiving source set and two-phase root inverse',limits,()=>{
 const options={entry,runtimeRoot:'runtime',declarationRoot:separate?'types':'runtime'},api=receiving(options),root=api.proposal.files[0],observation=observe(api.files,options);
 assert.equal(root.path,entry);assert.equal(root.before,original);assert.equal(root.inverse,original);assert.equal(root.histories[0].inverse,original);assert.equal(root.histories[1].inverse,root.histories[0].after);assert.equal(root.after,original+'\npub mod translation_owned_text_vectors_core;\n');assert.deepEqual(api.proposal.ruleTrace.map(row=>row.phase),['language','repository']);
 for(const row of api.proposal.sourceInputs)assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.source);
 assert.equal(observation.records.length,separate?14:8);assert.equal(observation.publicFunctions.length,8);assert.equal(api.proposal.files.length,separate?14:8);assert.equal(api.proposal.sourceInputs.length,8);
 const native=entry.startsWith('rust/')?'rust/src/translation_owned_text_vectors_core.rs':'src/translation_owned_text_vectors_core.rs';assert.ok(api.files.has(native));assert.equal(api.files.has(entry.startsWith('rust/')?'src/translation_owned_text_vectors_core.rs':'rust/src/translation_owned_text_vectors_core.rs'),false);
 assert.equal(observation.nativeRootActivated,false);assert.equal(observation.nativeTypeOwnerQualified,false);assert.equal(observation.privateCallerBindingQualified,false);assert.equal(observation.namespaceAuthority,false);assert.equal(observation.nativeRustGrammarChecked,false);assert.equal(observation.crossInvocationCache,false);
 assert.equal(api.proposal.sourceInstalled,false);assert.equal(api.proposal.originalBodyEquivalenceQualified,false);assert.equal(api.proposal.runtimeParity,false);assert.equal(api.proposal.receivingExecuted,false);
 const repeated=propose(root.after,options);assert.equal(repeated.alreadyPresent,true);assert.deepEqual(repeated.missingModules,[]);assert.equal(repeated.files[0].after,root.after);
});
for(const [operation,parameters,returns,consumed,shared]of cases)test(operation+' actual native runtime and strict declaration ABI retains owned text moves and clone results',limits,()=>{
 const api=receiving(),name='router_owned_text_vec_'+operation,result=requireOperation(api.files,api.options,name),native=originalOperation('vec_text_'+operation);
 for(const row of [result,native]){assert.equal(row.operation,operation);assert.equal(row.javascriptName,name);assert.equal(row.rustName,'vec_text_'+operation);assert.deepEqual(row.parameters,parameters);assert.equal(row.returns,returns);assert.deepEqual(row.consumed,consumed);assert.deepEqual(row.shared,shared);assert.equal(row.returnedLoan,false);assert.equal(row.clonesOwnedText,['get','from_slice'].includes(operation));assert.equal(row.privateCallerBindingQualified,false);assert.equal(row.nativeTypeOwnerQualified,false);assert.equal(row.sourceAuthority,false);assert.equal(row.runtimeAuthority,false);assert.equal(row.nativeRootActivated,false);assert.equal(row.crossInvocationCache,false);assert.ok(row.nativeFunction.includes('fn vec_text_'+operation+'('));assert.ok(row.runtimeFunction.includes('function '+name+'('));assert.ok(row.declaration.includes('declare function '+name+'('));}
 assert.equal(result.sourceRecords.length,8);assert.equal(result.nativeFunction,native.nativeFunction);assert.equal(result.runtimeFunction,native.runtimeFunction);assert.equal(result.declaration,native.declaration);
 if(operation==='get'){assert.ok(result.nativeFunction.includes('::core::option::Option<::std::string::String>'));assert.ok(result.declaration.includes('OwnedTextVectorOption'));}
});
test('every required receiving source and mirrored declaration must retain exact current bytes',limits,()=>{
 const api=receiving({runtimeRoot:'runtime',declarationRoot:'types'});
 for(const [path,source]of api.files){if(path===api.options.entry)continue;api.files.delete(path);assert.throws(()=>observe(api.files,api.options));api.files.set(path,source+'\n');assert.throws(()=>requireOperation(api.files,api.options,'vec_text_len'));api.files.set(path,source);assert.equal(observe(api.files,api.options).records.length,14);}
});
test('unknown shadowed private conditional and duplicate root edges remain refused',limits,()=>{
 for(const source of ['pub fn keep()->bool{true}\n','mod translation_owned_text_vectors_core;\n','#[cfg(test)]pub mod translation_owned_text_vectors_core;\n','pub mod translation_owned_text_vectors_core;\npub mod translation_owned_text_vectors_core;\n','pub mod translation_owned_text_vectors_core;\ntype translation_owned_text_vectors_core=bool;\n','use elsewhere::translation_owned_text_vectors_core;\n']){
  if(!source.includes('pub mod translation_owned_text_vectors_core;')){const valid=receiving();valid.files.set(valid.options.entry,source);assert.throws(()=>observe(valid.files,valid.options));}
  if(source!=='pub fn keep()->bool{true}\n')assert.throws(()=>propose(source));
 }
 const api=receiving();api.files.set(api.options.entry,'mod translation_owned_text_vectors_core;\n');assert.throws(()=>requireOperation(api.files,api.options,'vec_text_get'));
});
test('opaque original producer source stays explicit DATA and never gains root/caller/namespace authority',limits,()=>{
 const proposal=propose('unknown_producer!();\n'+original);assert.ok(proposal.files[0].after.startsWith('unknown_producer!();\n'));assert.equal(proposal.nativeRootActivated,false);assert.equal(proposal.privateCallerBindingQualified,false);assert.equal(proposal.nativeTypeOwnerQualified,false);assert.equal(proposal.namespaceAuthority,false);assert.equal(proposal.originalBodyEquivalenceQualified,false);
});
test('caught receiving source failure and later restoration cannot revive the containing source operation',limits,()=>{
 const api=receiving(),path='runtime/owned-text-vector-runtime.mjs',source=api.files.get(path);
 assert.throws(()=>scope(()=>{requireOperation(api.files,api.options,'vec_text_get');api.files.set(path,source+'\n');assert.throws(()=>requireOperation(api.files,api.options,'vec_text_get'));api.files.set(path,source);return 42;}),/invalidated/u);
 assert.equal(requireOperation(api.files,api.options,'vec_text_get').clonesOwnedText,true);
});
test('ordinary application exceptions preserve identity without leaving a failed source scope behind',limits,()=>{
 for(const primary of [null,undefined,Symbol('primary'),new Error('application')]){let caught=false;try{scope(()=>{throw primary;});}catch(error){caught=true;assert.strictEqual(error,primary);}assert.equal(caught,true);assert.equal(scope(()=>42),42);}
});
test('current operation scopes retain their original finite depth and clear references on refusal',limits,()=>{
 const nested=depth=>scope(()=>depth?nested(depth-1):42);assert.equal(nested(63),42);assert.throws(()=>nested(64),/bound/u);assert.equal(scope(()=>42),42);
});
test('descriptor-safe configuration and source maps never invoke coercions proxies or getters',limits,()=>{
 let calls=0;const getter={get runtimeRoot(){calls++;return 'runtime';}},proxy=new Proxy({runtimeRoot:'runtime'},{get(){calls++;throw Error('no read');}}),coerce={toString(){calls++;return 'runtime';}};
 for(const input of [getter,proxy,{runtimeRoot:coerce},{entry:'nested/src/lib.rs'},{entry:null},{runtimeRoot:null},{runtimeRoot:undefined},{runtimeRoot:'../escape'},{runtimeRoot:'bad\\root'},{runtimeRoot:'bad:root'},{runtimeRoot:'bad\u0000root'},{extra:true}])assert.throws(()=>configuration(input));
 const api=receiving();assert.throws(()=>observe(new Proxy(api.files,{get(){calls++;throw Error('no read');}}),api.options));assert.throws(()=>observe({get(){calls++;return api.files.get(api.options.entry);}},api.options));
 const fake={...originalOperation('vec_text_get'),privateCallerBindingQualified:true,nativeTypeOwnerQualified:true};assert.throws(()=>originalOperation(fake));assert.equal(calls,0);
});
test('five complete current ABI/root source equations preserve original modules phases and exact inverses',limits,()=>{
 const plan=prepareOwnedTextVectorAbiSources();assert.equal(plan.files.length,5);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}
});
