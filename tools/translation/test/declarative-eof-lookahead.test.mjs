// EOF distinction is a source-token rule, not a macro-owner or namespace permit.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createDeclarativeMacroEngine} from '../declarative-macro-engine.mjs';
import {originalMacroEofRule,requireOriginalMacroEofRule} from '../macro-eof-source.mjs';
import {originalMacroTrees,originalMacroTreeText,originalTopLevelMacroInvocations} from '../macro-token-trees.mjs';
import {captureOriginalDeclarativeItemOutput,originalDeclarativeItemOutputFacts} from '../original-declarative-item-output.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {originalPrimitiveNamespaceSources} from '../extensions/primitive-namespace-sources.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const test=(name,body)=>nodeTest(name,{timeout:60000},body);
let serial=0;
function retain(name,value){const output=process.env.ROUTER_DECLARATIVE_EOF_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(output+'/'+String(++serial).padStart(3,'0')+'-'+name+'.json.gz',gzipSync(JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$bigint:String(item)}:item)),{flag:'wx'});}return value;}
const definitionOptions={name:'data',owner:['unresolved_fixture']};
function engine(rule=originalMacroEofRule()){return createDeclarativeMacroEngine(null,null,rule);}
function expand(selected,source,input,limits){const definition=selected.compileDeclarativeMacro(source,definitionOptions),trees=originalMacroTrees(input);return {definition,input,trees,result:selected.expandDeclarativeMacro(definition,trees,limits)};}
const rendered=result=>result.trees.map(originalMacroTreeText).join(' ');
const nullable='macro_rules! data {($(#![$m:meta])* $( $(#[$doc:meta])* pub struct $name:ident; )*)=>{ $(#[$m])* $( $(#[$doc])* pub struct $name; )* };}';
function module(source,file){const result=captureSourceModuleViews({source,sourcePath:file,compilationProfile:PRODUCTION_PROFILE});return {file,path:[],source,sourceView:result.views[0],compilationProfile:PRODUCTION_PROFILE};}
function request(definition,invocation,index){const row=originalTopLevelMacroInvocations(invocation.source).filter(row=>row.path.join('::')==='types')[index];assert.ok(row);return {definitionModule:definition,definitionName:'types',invocationModule:invocation,invocationSpan:[row.sourceSpan.start,row.sourceSpan.end]};}
function inverse(facts){assert.equal(facts.definitionCst.source,facts.definition.source);assert.equal(facts.generatedCst.source,facts.generated.source);const [a,b]=facts.invocation.span;assert.equal(facts.after.source.slice(0,a)+facts.invocation.source.slice(a,b)+facts.after.source.slice(a+facts.generated.source.length),facts.invocation.source);assert.deepEqual(facts.trace.map(row=>row.phase),['language','repository']);let before='',after='';for(const row of facts.mapping){assert.equal(row.before[0],before.length);assert.equal(row.after[0],after.length);before+=facts.before.source.slice(...row.before);after+=facts.after.source.slice(...row.after);}assert.equal(before,facts.before.source);assert.equal(after,facts.after.source);for(const key of ['namespaceAuthority','typeAuthority','runtimeAuthority','generatedDeriveOwnersResolved','recursiveDefinitionOwnersResolved'])assert.equal(facts[key],false);}

test('complete pinned matcher source and four whole callbacks establish only the separate EOF rule',()=>{
 const rule=originalMacroEofRule();retain('complete-source-proof',rule);assert.equal(requireOriginalMacroEofRule(rule),rule);assert.equal(rule.callbacks.length,4);assert.deepEqual(rule.callbacks.map(row=>row.name),['compute_locs','parse_tt_inner','parse_tt','token_name_eq']);for(const callback of rule.callbacks){assert.ok(callback.source.startsWith('fn '+callback.name));assert.equal(createHash('sha256').update(callback.source).digest('hex'),callback.sha256);assert.equal(callback.semanticSourceRoundTrip,true);assert.ok(callback.source.endsWith('}'));}assert.equal(rule.emptyVersusMandatoryTerminal,true);assert.equal(rule.captureOrNullablePrefixSeparated,false);assert.equal(rule.namespaceAuthority,false);assert.equal(rule.runtimeAuthority,false);
 let reads=0;const accessor=Object.defineProperty({},'sourceSha256',{get(){reads++;throw Error('fake');}});for(const bad of [structuredClone(rule),Object.freeze(structuredClone(rule)),accessor,new Proxy(rule,{get(){reads++;throw Error('proxy');}})])assert.throws(()=>createDeclarativeMacroEngine(null,null,bad),/copied or foreign/);assert.equal(reads,0);
});
test('source-selected EOF permits disjoint inner attributes before a genuinely nullable item suffix',()=>{
 const selected=engine(),outcomes=[];for(const input of ['', '#![allow(dead_code)]', 'pub struct A;', '#[doc="Ω😀"] pub struct A;', '#![allow(dead_code)] #[doc="Ω😀"] pub struct A; pub struct B;']){const row=expand(selected,nullable,input);outcomes.push(row);assert.equal(row.result.ownerVerified,false);assert.equal(row.result.namespaceComplete,false);assert.equal(row.result.generatedBehavior,false);if(input.includes('A'))assert.ok(rendered(row.result).includes('A'));}retain('complete-eof-values',outcomes);
 for(const source of ['macro_rules! data {($(a b)* $(a c)*)=>{OK};}','macro_rules! data {($(#[left])* $(#[right])*)=>{OK};}']){const selected=engine(),input=source.includes('#')?'#[left] #[right]':'a b a c';assert.equal(rendered(expand(selected,source,input).result),'OK');}
});
test('default engine preserves its original conservative EOF refusal and complete existing outputs',()=>{
 const defaultEngine=createDeclarativeMacroEngine(),proofEngine=engine();assert.throws(()=>expand(defaultEngine,nullable,'#[doc="whole"] pub struct A;'),/locally ambiguous/);
 const subjects=[['macro_rules! data {($v:ident)=>{($v)};}','name'],['macro_rules! data {($v:ty)=>{($v)};}','Option<u8>'],['macro_rules! data {($($v:ident),*)=>{$($v),*};}','a,b,c'],['macro_rules! data {($v:ident $(,)?)=>{$v};}','name,']];const rows=[];for(const [source,input]of subjects){const left=expand(defaultEngine,source,input),right=expand(proofEngine,source,input);rows.push({left,right});assert.deepEqual(right,left);}retain('default-versus-selected-complete-values',rows);
});
test('real terminal overlap capture prefixes and multiple nullable choices retain ambiguity refusal',()=>{
 const rows=[];for(const [matcher,input]of [['$(a)* a','a'],['$($v:ident)* ending','ending'],['$(#[$v:meta])* $(#[$w:meta])*','#[doc="x"]'],['$($v:vis)* $(pub)?','pub'],['$($v:ident)* $(,)? ending','ending'],['$(( $v:ident ))? $t:ty','(T) u64']]){const source='macro_rules! data {('+matcher+')=>{};}';let error;try{expand(engine(),source,input);}catch(caught){error=caught;}rows.push({source,input,error:error&&{name:error.name,message:error.message}});assert.ok(error instanceof TypeError);assert.match(error.message,/ambigu|empty source sequence/);}retain('complete-real-overlap-refusals',rows);
});
test('all four actual types inputs preserve complete parents recursion and all thirty generated data records',async()=>{
 const sources=originalPrimitiveNamespaceSources(),definition=module(sources.get('crates/core_arch/src/macros.rs').source,'crates/core_arch/src/macros.rs'),invocation=module(sources.get('crates/core_arch/src/x86/mod.rs').source,'crates/core_arch/src/x86/mod.rs'),calls=originalTopLevelMacroInvocations(invocation.source).filter(row=>row.path.join('::')==='types');assert.equal(calls.length,4);const rows=[];
 for(let index=0;index<calls.length;index++){const options=request(definition,invocation,index),token=await captureOriginalDeclarativeItemOutput(options),facts=await originalDeclarativeItemOutputFacts(token,options);retain('actual-types-'+index,facts);inverse(facts);assert.ok(facts.lineage.length>=2);assert.ok(facts.generated.source.includes('repr'));assert.ok(facts.generated.source.includes('simd_shuffle'));rows.push(facts);}
 const candidates=rows.flatMap(row=>row.dataCandidates),roots=candidates.filter(row=>row.depth===0),nested=candidates.filter(row=>row.name==='JustOne');assert.equal(roots.length,15);assert.equal(nested.length,15);assert.deepEqual(roots.map(row=>row.name),['__m128i','__m128','__m128d','__m256i','__m256','__m256d','__m512i','__m512','__m512d','__m128bh','__m256bh','__m512bh','__m128h','__m256h','__m512h']);for(const row of candidates)assert.equal(row.lexicalOnly,true);retain('complete-thirty-data-census',{roots,nested});
});
test('required EOF retains leftover-input failure opaque captures and original resource bounds',()=>{
 const selected=engine();for(const input of ['pub struct A; trailing','#![allow(dead_code)] trailing'])assert.throws(()=>expand(selected,nullable,input),/does not match/);
 const sender=expand(selected,'macro_rules! data {($t:ty)=>{$t};}','u8'),receiver=selected.compileDeclarativeMacro('macro_rules! data {(u8)=>{LITERAL};($t:ty)=>{OPAQUE};}',definitionOptions);assert.equal(rendered(selected.expandDeclarativeMacro(receiver,selected.declarativeSubInput(sender.result,[]))),'OPAQUE');
 const source='macro_rules! data {($(a b)* $(a c)*)=>{OK};}';assert.throws(()=>expand(selected,source,'a b a b a c',{repetitions:1}),/budget/);assert.throws(()=>expand(selected,source,'a b',{steps:1}),/budget/);assert.throws(()=>expand(selected,'macro_rules! data {($(a b)* $(a c)*)=>{ONE TWO};}','a b',{output:1}),/budget/);assert.throws(()=>expand(selected,'macro_rules! data {($()*)=>{};}',''),/consuming original source sequence/);retain('complete-resource-and-opacity',{sender});
});
test('native source changes and late source observers refuse without converting EOF facts into owner permission',()=>{
 const field=Object.getOwnPropertyDescriptor(JSON,'parse');let calls=0;try{Object.defineProperty(JSON,'parse',{...field,value(...args){calls++;return Reflect.apply(field.value,this,args);}});assert.throws(()=>originalMacroEofRule(),/source JSON parser changed/);assert.equal(calls,0);}finally{Object.defineProperty(JSON,'parse',field);}
 const rule=originalMacroEofRule(),owner=Object.getPrototypeOf(createHash('sha256')),update=Object.getOwnPropertyDescriptor(owner,'update'),slice=Object.getOwnPropertyDescriptor(String.prototype,'slice'),tape=[];let changed=false;
 try{Object.defineProperty(owner,'update',{...update,value(data,...args){tape.push({operation:'Hash.update',data:Buffer.isBuffer(data)?{$buffer:data.toString('base64')}:data,args});const value=Reflect.apply(update.value,this,[data,...args]);if(!changed){changed=true;Object.defineProperty(String.prototype,'slice',{...slice,value(...values){return Reflect.apply(slice.value,this,values);}});}return value;}});assert.throws(()=>requireOriginalMacroEofRule(rule),/source operations changed/);}finally{Object.defineProperty(owner,'update',update);Object.defineProperty(String.prototype,'slice',slice);}retain('complete-native-source-observer',{tape,changed});assert.equal(changed,true);assert.equal(requireOriginalMacroEofRule(rule),rule);assert.equal(rule.namespaceAuthority,false);
});
test('ordinary JavaScript and strict TypeScript behavior remains independent from source-token EOF effects',async()=>{
 const source='pub fn bounded(value:u8)->bool{value>2}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});retain('independent-checked-target',result);assert.ok(result.meta.executable.some(row=>row.name==='bounded'));await verifyTypedTargets(result,api=>{for(const [value,want]of [[0n,false],[2n,false],[3n,true],[255n,true]])assert.equal(api.bounded(value),want);assert.throws(()=>api.bounded(256n),TypeError);assert.throws(()=>api.bounded(3),TypeError);},{childTimeoutMs:20000});
});
