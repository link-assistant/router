import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {loadPinnedFormatSourceStages,formatSourceStageInput} from '../format-source-profiles.mjs';
import {formatRegisteredOriginalInput,loadFormatRegisteredInputs,isFormatRegisteredInputs,formatRegisteredSourceOwner,isFormatRegisteredSourceOwner,expandRegisteredFormatWrapper,isRegisteredFormatWrapperStage,formatRegisteredInputSource,registeredFormatWrapperOriginalExpansion} from '../format-registered-inputs.mjs';
import {declarativeExpansionLineage,declarativeNestedMacroInput} from '../declarative-token-macros.mjs';
import {originalMacroTreeText} from '../macro-token-trees.mjs';
const root=new URL('../source-profiles/format-registered-inputs/',import.meta.url),profile=JSON.parse(readFileSync(new URL('manifest.json',root))),hash=value=>createHash('sha256').update(value).digest('hex');
const capabilities=['callerMacroOwnerResolved','callbackModuleOwnerResolved','sourceNamespaceClosureVerified','compilerAstClosureVerified','sourceSemanticClosureVerified','noDropAuthority','copyAuthority','constAuthority','namespaceAuthority','runtimeAuthority','runtimeParity'];
const denied=value=>capabilities.forEach(key=>assert.equal(value[key],false,key));

test('complete original export and29-row registration sources join without namespace authority',()=>{
 const proof=loadPinnedFormatSourceStages(),inputs=loadFormatRegisteredInputs(proof);assert.equal(isFormatRegisteredInputs(inputs),true);assert.equal(loadFormatRegisteredInputs(proof),inputs);assert.equal(inputs.registration.entries.length,29);assert.equal(inputs.routes.length,22);assert.deepEqual(inputs.wrappers.map(row=>row.name),['vec','format']);denied(inputs);
 const original=formatSourceStageInput(proof,'compiler/rustc_builtin_macros/src/lib.rs').source;assert.equal(inputs.registration.source.original,original.slice(inputs.registration.source.span.start,inputs.registration.source.span.end));assert.equal(hash(inputs.registration.source.original),inputs.registration.source.sha256);assert.equal(inputs.registration.expansion.trees.length,87);assert.equal(inputs.registration.registrationExpansionVerified,true);assert.equal(inputs.registration.resolverExecuted,false);
 const sourceRows=[...original.matchAll(/^\s+([A-Za-z_][A-Za-z0-9_]*): ([A-Za-z_][A-Za-z0-9_]*)::([A-Za-z_][A-Za-z0-9_]*),$/gm)].slice(0,29).map(match=>[match[1],[match[2],match[3]]]);assert.deepEqual(inputs.registration.entries.map(row=>[row.name,row.callbackPath]),sourceRows);
 for(const row of inputs.registration.entries){assert.equal(row.moduleDeclaration.original.trim(),(row.moduleDeclaration.original.includes('pub mod ')?'pub ':'')+'mod '+row.callbackPath[0]+';');assert.equal(inputs.registration.symbols.slots.find(slot=>slot.name===row.name).value,row.name);}
 assert.ok(inputs.namespaceObligations.find(row=>row.sourcePath.endsWith('rustc_builtin_macros/src/lib.rs')).topLevelBangCandidates.some(call=>call.path.join('::')==='rustc_fluent_macro::fluent_messages'));assert.equal(inputs.routes.find(row=>row.name==='format_args').allocHelperExports[0].declaration.original.trim(),'pub use core::format_args;');
});

test('actual symbol generator and full licensed sources retain exact bytes and spans',()=>{
 const proof=loadPinnedFormatSourceStages(),inputs=loadFormatRegisteredInputs(proof);
 for(const pin of profile.sources){const packed=readFileSync(new URL(pin.archive,root)),candidate=formatRegisteredOriginalInput(pin.path,packed),genuine=formatRegisteredInputSource(inputs,proof,pin.path);assert.equal(hash(candidate.source),pin.sha256);assert.equal(candidate.source,genuine.source);assert.equal(isFormatRegisteredInputs(candidate),false);denied(candidate);const changed=Buffer.from(packed);changed[changed.length-1]^=1;assert.throws(()=>formatRegisteredOriginalInput(pin.path,changed),/full archive changed/);assert.throws(()=>formatRegisteredOriginalInput(pin.path,packed.subarray(0,packed.length-1)),/full archive changed/);}
 for(const reference of [inputs.registration.symbols.parser,inputs.registration.symbols.generator]){const original=formatRegisteredInputSource(inputs,proof,reference.sourcePath).source;assert.equal(original.slice(reference.span.start,reference.span.end),reference.original);assert.equal(hash(reference.original),reference.sha256);}
 assert.equal(inputs.registration.symbols.internerExecuted,false);assert.throws(()=>formatRegisteredOriginalInput('foreign/path',Buffer.alloc(0)),/one retained/);
});

test('all three originalformat callbacks keep their actualBoolean/lifetime forwarding and target body',()=>{
 const proof=loadPinnedFormatSourceStages(),inputs=loadFormatRegisteredInputs(proof),source=formatSourceStageInput(proof,'compiler/rustc_builtin_macros/src/format.rs').source;
 for(const [name,newline] of [['format_args',false],['const_format_args',false],['format_args_nl',true]]){const owner=formatRegisteredSourceOwner(inputs,proof,name);assert.equal(isFormatRegisteredSourceOwner(owner),true);denied(owner);assert.equal(owner.callbackModuleSourceBindingVerified,true);assert.equal(owner.registeredSymbolSourceValueVerified,true);assert.equal(owner.forwarder.arguments.at(-1).value,newline);assert.deepEqual(owner.forwarder.parameters,['ecx','sp','tts']);assert.equal(owner.target.function.name,'expand_format_args_impl');assert.equal(hash(source.slice(owner.target.function.span.start,owner.target.function.span.end)),owner.target.function.sha256);assert.ok(owner.callback.function.signatureTokens.some(token=>token.text==="'cx"));assert.ok(owner.target.function.controlTokens.some(token=>token.text==='return'));}
 assert.throws(()=>formatRegisteredSourceOwner(inputs,proof,'println'),/route absent/);assert.throws(()=>formatRegisteredSourceOwner(inputs,proof,'concat'),error=>error.code==='ERR_FORMAT_SOURCE_INPUT_UNAVAILABLE');
});

test('actual alloc wrapper expansion retains input effects and genuine nested source forwarding',()=>{
 const proof=loadPinnedFormatSourceStages(),inputs=loadFormatRegisteredInputs(proof),original='format!(r#"{1} {0} {0}"#, first(), second())',stage=expandRegisteredFormatWrapper(inputs,proof,'format',original);assert.equal(stage.originalSource,original);assert.equal(stage.originalSourceSha256,hash(original));denied(stage);assert.equal(isRegisteredFormatWrapperStage(stage),true);assert.equal(stage.nested.length,1);const originalExpansion=registeredFormatWrapperOriginalExpansion(stage,inputs,proof),nested=originalExpansion.nested[0];assert.deepEqual(nested.call.writtenPath,['alloc','__export','format_args']);assert.equal(nested.call.hygiene,'definition-site-dollar-crate');assert.equal(nested.sourceBindingVerified,true);assert.equal(nested.compilerAstClosureVerified,false);assert.equal(nested.owner.name,'format_args');assert.equal(declarativeExpansionLineage(originalExpansion.expansion).depth,0);assert.equal(declarativeNestedMacroInput(originalExpansion.expansion,nested.call),nested.forwardedInput);
 const output=stage.expansion.trees.map(originalMacroTreeText).join(' ');assert.match(output,/first \(\) , second \(\)/);assert.equal(stage.ordinaryCalleeExecutionVerified,false);assert.equal(stage.nestedCompilerExecuted,false);
 assert.throws(()=>expandRegisteredFormatWrapper(inputs,proof,'format','other!("x")'),/written wrapper syntax/);assert.throws(()=>expandRegisteredFormatWrapper(inputs,proof,'println','println!("x")'),/wrapper declaration/);
});

test('item-bearing or custom-argument macros preserve explicit unresolved namespace obligations',()=>{
 const proof=loadPinnedFormatSourceStages(),inputs=loadFormatRegisteredInputs(proof);
 for(const source of ['format!("{:?}",{impl Drop for Local {fn drop(&mut self){}}; value})','format!("{}",unknown!())','format!("{}",owned_string)','format!("{capture}")']){const stage=expandRegisteredFormatWrapper(inputs,proof,'format',source);denied(stage);assert.equal(stage.originalSource,source);assert.equal(stage.nestedCompilerExecuted,false);}
 // The syntax source is not an actual caller scope; even qualified or local
 // same-spelled syntax cannot inherit the joined library source identity.
 const syntactic=expandRegisteredFormatWrapper(inputs,proof,'format','local::format!("x")');assert.equal(syntactic.callerMacroOwnerResolved,false);
});

test('copied, refrozen, proxy, getter and foreign proof carriers never reuse private joins',()=>{
 const proof=loadPinnedFormatSourceStages(),inputs=loadFormatRegisteredInputs(proof),foreign=loadPinnedFormatSourceStages();let reads=0;const getter=Object.defineProperty({},'schema',{get(){reads++;return inputs.schema;}});
 for(const fake of [structuredClone(inputs),JSON.parse(JSON.stringify(inputs)),Object.freeze({...inputs}),new Proxy(inputs,{}),getter]){assert.equal(isFormatRegisteredInputs(fake),false);assert.throws(()=>formatRegisteredSourceOwner(fake,proof,'format_args'),/copied or foreign/);assert.throws(()=>expandRegisteredFormatWrapper(fake,proof,'format','format!("x")'),/copied or foreign/);assert.throws(()=>formatRegisteredInputSource(fake,proof,'library/std/src/lib.rs'),/copied or foreign/);}
 for(const fake of [structuredClone(proof),Object.freeze({...proof}),new Proxy(proof,{}),getter])assert.throws(()=>loadFormatRegisteredInputs(fake),/private original/);assert.equal(reads,0);assert.throws(()=>formatRegisteredSourceOwner(inputs,foreign,'format_args'),/copied or foreign/);
 const owner=formatRegisteredSourceOwner(inputs,proof,'format_args'),stage=expandRegisteredFormatWrapper(inputs,proof,'format','format!("x")');assert.equal(isFormatRegisteredSourceOwner(structuredClone(owner)),false);assert.equal(isRegisteredFormatWrapperStage(structuredClone(stage)),false);assert.throws(()=>registeredFormatWrapperOriginalExpansion(structuredClone(stage),inputs,proof),/copied or foreign/);assert.throws(()=>registeredFormatWrapperOriginalExpansion(stage,inputs,foreign),/copied or foreign/);assert.throws(()=>{inputs.namespaceAuthority=true;},TypeError);
});

test('fresh-process serialized source/meta cannot reconstruct registered authority',{timeout:15000},()=>{
 const proof=loadPinnedFormatSourceStages(),inputs=loadFormatRegisteredInputs(proof),module=new URL('../format-registered-inputs.mjs',import.meta.url).href,profileModule=new URL('../format-source-profiles.mjs',import.meta.url).href;
 const code=`import {loadFormatRegisteredInputs,formatRegisteredSourceOwner,isFormatRegisteredInputs}from ${JSON.stringify(module)};import{loadPinnedFormatSourceStages}from ${JSON.stringify(profileModule)};import{readFileSync}from'node:fs';const original=JSON.parse(readFileSync(0,'utf8'));if(isFormatRegisteredInputs(original))throw new Error('forged identity');try{formatRegisteredSourceOwner(original,loadPinnedFormatSourceStages(),'format_args');throw new Error('admitted');}catch(error){if(!error.message.includes('copied or foreign'))throw error;}console.log('private-original-identity-retained');`;
 const args=process.versions.bun?['--eval',code]:['--input-type=module','--eval',code],child=spawnSync(process.execPath,args,{input:JSON.stringify(inputs),encoding:'utf8',timeout:15000,maxBuffer:1024*1024});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),'private-original-identity-retained');
});
