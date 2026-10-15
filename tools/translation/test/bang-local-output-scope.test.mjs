import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import * as token from '../declarative-token-macros.mjs';
import * as ast from '../declarative-macros.mjs';
import {originalMacroTrees,originalMacroInvocation} from '../macro-token-trees.mjs';
import {observeLocalBangOutput,localBangOutputFacts} from '../bang-local-output-scope.mjs';
import {observeBangOutput} from '../bang-output-observer.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {createOriginalMacroFragmentContext} from '../source-macro-fragments.mjs';
import {loadStandardMatchesSourceProfile,standardMatchesOriginalDefinition} from '../matches-source-profile.mjs';
import {sourceItems} from '../rust-structure.mjs';
const test=(name,body)=>nodeTest(name,{timeout:5000},body);
const retain=(name,value)=>{const directory=process.env.ROUTER_LOCAL_BANG_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json',JSON.stringify(value)+'\n',{flag:'wx'});}};
const hash=value=>createHash('sha256').update(value).digest('hex');
function compile(source,name='root',input=''){
  const definition=token.compileDeclarativeMacro(source,{name,owner:['authored','local']}),expansion=token.expandDeclarativeMacro(definition,originalMacroTrees(input));return {source,name,input,definition,expansion};
}
const output=body=>compile('macro_rules! root{()=>{'+body+'};}');
const facts=(proof,fixture)=>localBangOutputFacts(proof,{expansion:fixture.expansion});
const refusal=run=>{let error;assert.throws(()=>{try{run();}catch(cause){error={name:cause.name,message:cause.message};throw cause;}},TypeError);return error;};
function nested(){
  const source='macro_rules! leaf{($value:tt)=>{{$value}}}macro_rules! root{()=>{{use crate::tools::{Cell as C,view::{self,View}};static META:bool=leaf!(true);if false{let callback=||leaf!(false);callback();&META as &dyn View}else{&META as &dyn View}}}}';
  const fixture=compile(source),records=token.declarativeNestedMacroInvocations(fixture.expansion),definition=token.compileDeclarativeMacro(source,{name:'leaf',owner:['authored','local']});
  const leaves=records.map(record=>{const expansion=token.expandDeclarativeMacro(definition,token.declarativeNestedMacroInput(fixture.expansion,record)),proof=observeLocalBangOutput(expansion);return {record,expansion,proof};});return {...fixture,records,leaves};
}
function captured(source='matches!(flag,true)'){
  const profile=loadStandardMatchesSourceProfile(),parser=new HostRustParser(tokenizeRust(source)),input=originalMacroInvocation(source).trees,context=createOriginalMacroFragmentContext(parser,input,{sourceStart:0,definitionProfile:profile}),definitionSource=standardMatchesOriginalDefinition(profile),definition=ast.compileDeclarativeMacro(definitionSource,{name:profile.name,owner:['core'],sourceFragments:context}),expansion=ast.expandDeclarativeMacro(definition,input);return {source,profile,parser,input,context,definitionSource,definition,expansion};
}
test('complete local use/static output retains every original use branch type and initializer without authority',()=>{
  const fixture=output('{use crate::tools::{Cell as C,view::{self,View}};static VALUE:Cell<\'static> =Cell::new(true);let ptr:&dyn View=&VALUE as &dyn View;ptr}'),proof=observeLocalBangOutput(fixture.expansion),actual=facts(proof,fixture);
  assert.equal(actual.ir.kind,'block');assert.deepEqual(actual.ir.statements.map(row=>row.kind),['local-use','local-static','local-let']);
  const imported=actual.ir.statements[0],stored=actual.ir.statements[1],binding=actual.ir.statements[2];assert.equal(imported.tree.kind,'use-branch');assert.ok(imported.originalTrees.length>0);assert.equal(stored.name,'VALUE');assert.equal(stored.type.arguments[0].original.text,"'static");assert.equal(stored.initializer.kind,'call');assert.equal(binding.initializer.kind,'cast');assert.equal(binding.type.value.kind,'dyn-type');
  assert.equal(actual.sourceMode,'original-token-trees');assert.equal(actual.definitionProfile,null);assert.ok(Object.isFrozen(actual.ir));assert.deepEqual(Object.keys(proof),['schema']);for(const key of ['callerOwnerResolved','namespaceAuthority','typeAuthority','runtimeAuthority','runtimeParity'])assert.equal(actual[key],false);
  assert.throws(()=>observeBangOutput(fixture.expansion),TypeError);retain('01-local-output-and-strict-api-preserved',{fixture,proof,facts:actual,strictExpressionApiStillRefuses:true});
});
test('static initializers closures and dead branches require all exact original child outputs',()=>{
  const fixture=nested();assert.equal(fixture.leaves.length,2);const children=fixture.leaves.map(row=>row.proof),proof=observeLocalBangOutput(fixture.expansion,{children:[...children].reverse()}),actual=facts(proof,fixture);
  assert.equal(actual.children.length,2);assert.equal(actual.ir.statements[1].initializer.kind,'nested-macro');const errors=[refusal(()=>observeLocalBangOutput(fixture.expansion)),refusal(()=>observeLocalBangOutput(fixture.expansion,{children:children.slice(0,1)})),refusal(()=>observeLocalBangOutput(fixture.expansion,{children:[...children,children[0]]}))];
  const foreign=output('{false}'),extra=observeLocalBangOutput(foreign.expansion);errors.push(refusal(()=>observeLocalBangOutput(fixture.expansion,{children:[...children,extra]})));retain('02-complete-initializer-and-branch-children',{fixture,proof,facts:actual,errors});
});
test('copied tokens foreign same-byte analyses and repeated occurrence aliases cannot supply output proof',()=>{
  const first=nested(),second=nested(),children=first.leaves.map(row=>row.proof),proof=observeLocalBangOutput(first.expansion,{children}),errors=[];assert.equal(first.expansion.digest,second.expansion.digest);
  for(const childList of [second.leaves.map(row=>row.proof),children.map(value=>({...value})),children.map(value=>new Proxy(value,{}))])errors.push(refusal(()=>observeLocalBangOutput(first.expansion,{children:childList})));
  for(const fake of [{...proof},structuredClone(proof),new Proxy(proof,{})])errors.push(refusal(()=>localBangOutputFacts(fake,{expansion:first.expansion})));
  errors.push(refusal(()=>localBangOutputFacts(proof,{expansion:second.expansion})),refusal(()=>observeLocalBangOutput({...first.expansion})));
  const source='macro_rules! root{($group:tt)=>{{$group;$group}}}macro_rules! leaf{()=>{true}}',aliased=compile(source,'root','{leaf!()}'),records=token.declarativeNestedMacroInvocations(aliased.expansion),definition=token.compileDeclarativeMacro(source,{name:'leaf',owner:['authored','local']}),childExpansion=token.expandDeclarativeMacro(definition,token.declarativeNestedMacroInput(aliased.expansion,records[0])),child=observeLocalBangOutput(childExpansion);
  assert.equal(records.length,2);const aliasError=refusal(()=>observeLocalBangOutput(aliased.expansion,{children:[child]}));assert.match(aliasError.message,/alias-ambiguous/);
  retain('03-private-cross-analysis-boundaries',{first,second,proof,errors,aliased,records,childExpansion,child,aliasError});
});
test('malformed use static and type syntax cannot be observed by dropping suffixes',()=>{
  const cases=['{use crate::*;true}','{use crate::{};true}','{use crate::x as;true}','{use crate::x true}','{static X:bool;true}','{static X:bool=true true}','{static mut X:bool=true;true}','{static X:Vec<>=true;true}','{static X:[bool;unknown!()]=true;true}','{static X:bool=true;} false','static X:bool=true;'],errors=[];
  for(const source of cases){const fixture=output(source);errors.push({fixture,error:refusal(()=>observeLocalBangOutput(fixture.expansion))});}retain('04-complete-malformed-output-refusals',{errors});
});
test('attributes and hidden global items refuse throughout static initializers closures dead branches and types',()=>{
  const cases=['{static X:bool={#[macro_export]macro_rules! escape{()=>{true}}true};X}','{let callback=||{#[macro_export]macro_rules! escape{()=>{true}}true};false}','{if false{#[macro_export]macro_rules! escape{()=>{true}}}else{true}}','{#[allow(unused_imports)]use crate::Cell;true}','{static X:#[custom]bool=true;X}','{static X:bool={fn hidden(){}true};X}','{#[cfg(unix)]static X:bool=true;true}'],errors=[];
  for(const source of cases){const fixture=output(source);errors.push({fixture,error:refusal(()=>observeLocalBangOutput(fixture.expansion))});}retain('05-all-hidden-attribute-and-item-refusals',{errors,knownBuiltinSpellingSuppliesNoAuthority:true});
});
test('genuine opaque expression and pattern slots join exact original parser context and definition edition',()=>{
  const row=captured(),proof=observeLocalBangOutput(row.expansion,{sourceFragments:row.context}),actual=facts(proof,row);assert.equal(actual.sourceMode,'original-host-ast');assert.equal(actual.definitionProfile.edition,'2024');assert.equal(actual.sourceFragments,row.context);assert.equal(actual.captures.length,2);assert.equal(actual.ir.kind,'match');
  for(const capture of actual.captures){assert.equal(capture.ast,capture.capture.ast);assert.equal(capture.context,row.context);assert.ok(Object.isFrozen(capture.ast));}
  const other=captured(),errors=[refusal(()=>observeLocalBangOutput(row.expansion)),refusal(()=>observeLocalBangOutput(row.expansion,{sourceFragments:other.context})),refusal(()=>observeLocalBangOutput(row.expansion,{sourceFragments:structuredClone(row.context)}))];
  const compound=captured('matches!(flag == true,true | false if guard)'),compoundProof=observeLocalBangOutput(compound.expansion,{sourceFragments:compound.context}),compoundFacts=facts(compoundProof,compound);assert.equal(compoundFacts.captures.length,3);assert.deepEqual(compoundFacts.captures.map(value=>value.ast.k),['binary','or','name']);
  retain('06-authentic-opaque-AST-association',{source:row.source,profile:row.profile,input:row.input,context:row.context,definitionSource:row.definitionSource,definition:row.definition,expansion:row.expansion,proof,facts:actual,errors,compoundSource:compound.source,compoundExpansion:compound.expansion,compoundProof,compoundFacts});
});
test('unissued expression/type fragments and unsupported genuine AST shapes remain explicit refusals',()=>{
  const rows=[];
  for(const [fragment,input]of [['expr','external()'],['ty','bool'],['meta','allow(unused)']]){
    const source='macro_rules! root{($value:'+fragment+')=>{{static VALUE:'+ (fragment==='ty'?'$value':'bool')+'='+(fragment==='expr'?'$value':'true')+';'+(fragment==='meta'?'#[$value]':'')+'true}}}',fixture=compile(source,'root',input),error=refusal(()=>observeLocalBangOutput(fixture.expansion));
    assert.match(error.message,fragment==='expr'?/opaque expr requires its exact original AST context/:fragment==='ty'?/opaque type fragment lacks an original type AST issuer/:/output attribute owner\/effect remains unproved/);rows.push({fragment,input,source,fixture,stage:'B1 complete output observation',error});
  }
  const row=captured('matches!(subject(),true)'),error=refusal(()=>observeLocalBangOutput(row.expansion,{sourceFragments:row.context}));assert.match(error.message,/original expression AST grammar/);retain('07-unproved-opaque-grammar',{rows,originalSource:row.source,profile:row.profile,expansion:row.expansion,error});
});
test('public option descriptors and same-key-count child holes cannot invoke inherited callbacks',()=>{
  const fixture=output('{static VALUE:bool=true;VALUE}');let reads=0;
  const getter=Object.defineProperty({},'children',{get(){reads++;return [];}}),hostile=new Proxy([],{get(){reads++;throw new Error('untrusted');},ownKeys(){reads++;throw new Error('untrusted');}}),errors=[];
  for(const input of [getter,{children:hostile},{children:new Array(1)},{namespaceAuthority:true}])errors.push(refusal(()=>observeLocalBangOutput(fixture.expansion,input)));
  const hole=new Array(1);hole.extra='same descriptor count';const old=Object.getOwnPropertyDescriptor(Object.prototype,'0');let failure;
  try{Object.defineProperty(Object.prototype,'0',{configurable:true,get(){reads++;return {value:{}};}});try{observeLocalBangOutput(fixture.expansion,{children:hole});}catch(cause){failure={name:cause.name,message:cause.message};}}
  finally{if(old)Object.defineProperty(Object.prototype,'0',old);else delete Object.prototype[0];}
  assert.match(failure.message,/child accessor or hole/);assert.equal(reads,0);retain('08-descriptor-only-ingress',{fixture,errors,failure,reads});
});
test('full local type trees and finite depth are checked even when their initializer is unused',()=>{
  const fixture=output('{use crate::x as _;static X:(&\'static [bool;2],&dyn View)=(&[true,false],&true as &dyn View);false}'),proof=observeLocalBangOutput(fixture.expansion),actual=facts(proof,fixture);assert.equal(actual.ir.statements[1].type.kind,'tuple-type');
  const tooDeep=output('{static X:'+ '& '.repeat(66)+'bool=true;false}'),error=refusal(()=>observeLocalBangOutput(tooDeep.expansion));assert.match(error.message,/type depth/);const empty=output(''),emptyProof=observeLocalBangOutput(empty.expansion);assert.equal(facts(emptyProof,empty).ir.kind,'empty-output');retain('09-complete-types-and-bounds',{fixture,proof,facts:actual,tooDeep,error,empty,emptyProof});
});
test('complete pinned tracing inputs retain their actual ownership attribute and opaque-output barriers',()=>{
  const root=new URL('../source-profiles/tracing-bang-inputs/',import.meta.url),manifestBytes=readFileSync(new URL('manifest.json',root)),manifest=JSON.parse(manifestBytes),pin=manifest.archives.find(row=>row.package==='tracing'),archive=readFileSync(new URL(pin.archive,root));assert.equal(archive.length,pin.archiveBytes);assert.equal(hash(archive),pin.archiveSha256);
  const tar=gunzipSync(archive,{maxOutputLength:16777216});let source=null;
  for(let at=0;at+512<=tar.length;){const header=tar.subarray(at,at+512),name=header.subarray(0,100).toString().split('\0')[0];if(!name)break;const length=parseInt(header.subarray(124,136).toString().replace(/\0/g,'').trim(),8);assert.ok(Number.isSafeInteger(length)&&length>=0&&length<=2097152);at+=512;if(name==='tracing-0.1.44/src/macros.rs')source=tar.subarray(at,at+length).toString();at+=Math.ceil(length/512)*512;}
  assert.ok(source?.includes('macro_rules! event'));const selections=sourceItems(source).filter(item=>item.term==='macro_rules!'&&item.name==='event');assert.equal(selections.length,1);
  const selected=selections[0],original=source.slice(selected.start,selected.end),definition=token.compileDeclarativeMacro(original,{name:'event',owner:['tracing'],maxRules:64}),expansion=token.expandDeclarativeMacro(definition,originalMacroTrees('target: "authored target", Level::INFO, { "actual original message" }')),error=refusal(()=>observeLocalBangOutput(expansion));
  assert.match(error.message,/^Local bang output scope: missing duplicate or foreign exact child proof$/);retain('10-complete-original-tracing-refusal',{manifestBytes:manifestBytes.toString(),manifest,archiveSha256:hash(archive),archiveBytes:archive.length,source,selectionSpan:{start:selected.start,end:selected.end},original,definition,expansion,stage:'B1 complete output observation needs genuine callsite2 child',error,ownershipClosed:false,formatArgsClosed:false,callerNamespaceClosed:false,actualRouterBodyGains:0});
});
