import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeNestedMacroInvocations,declarativeNestedMacroInput} from '../declarative-token-macros.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
import {compileExpandedControlExpression,builtinSourceControlFacts} from '../builtin-source-control.mjs';
import {observeBangOutput,bangOutputObservationFacts,lowerObservedBooleanExpression} from '../bang-output-observer.mjs';
import {checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {roundTripProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {loadStandardMatchesSourceProfile,standardMatchesOriginalSource,standardMatchesOriginalDefinition} from '../matches-source-profile.mjs';
const retain=(name,value)=>{const directory=process.env.ROUTER_BANG_OUTPUT_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json',JSON.stringify(value)+'\n',{flag:'wx'});}};
const compile=(source,name,input='',owner=['fixture'])=>{const definition=compileDeclarativeMacro(source,{name,owner}),expansion=expandDeclarativeMacro(definition,originalMacroTrees(input));return {source,definition,expansion};};
const source='macro_rules! inner { ($value:tt) => {{if $value { false } else { true }}}; } macro_rules! outer { ($value:tt) => {{inner!($value)}}; }';
function nested(input){
 const parent=compile(source,'outer',input),records=declarativeNestedMacroInvocations(parent.expansion);assert.equal(records.length,1);
 const definition=compileDeclarativeMacro(source,{name:'inner',owner:['fixture']}),expansion=expandDeclarativeMacro(definition,declarativeNestedMacroInput(parent.expansion,records[0])),child=observeBangOutput(expansion),observation=observeBangOutput(parent.expansion,{children:[child]});return {parent,definition,expansion,child,observation};
}
test('whole expanded expression keeps exact origins and never selects a convenient nested body',()=>{
 const fixture=compile('macro_rules! original { () => {{true && !false}}; }','original'),control=compileExpandedControlExpression(fixture.expansion),observation=observeBangOutput(fixture.expansion);
 assert.equal(control.controlSyntaxProjected,true);assert.equal(control.ir.sourceSpan,null);assert.equal(builtinSourceControlFacts(control).expansion,fixture.expansion);assert.equal(observation.completeSelectedExpressionObserved,true);assert.deepEqual(observation.selectedOutputModuleDeclarations,[]);assert.equal(observation.namespaceAuthority,false);
 const omitted=compile('macro_rules! original { () => {fn hidden(){} {true}}; }','original'),refusal=compileExpandedControlExpression(omitted.expansion);assert.equal(refusal.controlSyntaxProjected,false);assert.throws(()=>observeBangOutput(omitted.expansion));retain('01-complete-expression-no-body-selection',{fixture,control,observation,omitted,refusal});
});
test('actual nested authored macro source lowers through checked meta to JavaScript and strict TypeScript',{timeout:60000},async()=>{
 const observations=[];
 for(const [input,expected]of [['true',false],['false',true]]){
  const fixture=nested(input),lowered=lowerObservedBooleanExpression(fixture.observation);
  // Generic compiler test entry only: the entire body is the source-derived
  // expression. This is not an original Router declaration or census gain.
  const surface={language:'Rust',items:[{k:'fn',name:'observed',params:[],ret:{kind:'bool'},body:lowered.surface}],main:null},checked=roundTripProgram(checkProgram(surface)),emitted=emitJavaScript(checked),target=emitted.mappings.find(row=>row.source==='observed').target;
  const javascript=[...emitted.preludes,...emitted.definitions,'export const translated={observed:'+target+'};'].join('\n'),result={javascript,typescript:javascript};
  await verifyTypedTargets(result,api=>assert.equal(api.observed(),expected),{childTimeoutMs:20000});observations.push({input,expected,...fixture,lowered,checked:JSON.parse(serializeProgram(checked)),result});
 }
 retain('02-authored-whole-nested-source-execution',{source,observations,originalRouterBodyGains:0});
});
test('a nested proof requires its exact original parent invocation and complete output',()=>{
 const first=nested('true'),second=nested('false');
 assert.throws(()=>observeBangOutput(first.parent.expansion),/unproved nested/);assert.throws(()=>observeBangOutput(first.parent.expansion,{children:[second.child]}),/another actual parent/);assert.throws(()=>observeBangOutput(first.parent.expansion,{children:[first.child,first.child]}),/missing or extra/);
 const input=declarativeNestedMacroInput(first.parent.expansion,declarativeNestedMacroInvocations(first.parent.expansion)[0]),wrongDefinition=compileDeclarativeMacro('macro_rules! different {($value:tt)=>{{true}}}',{name:'different',owner:['fixture']}),wrong=observeBangOutput(expandDeclarativeMacro(wrongDefinition,input));assert.throws(()=>observeBangOutput(first.parent.expansion,{children:[wrong]}),/actual lexical\/qualified owner/);
 for(const copied of [structuredClone(first.observation),new Proxy(first.observation,{})])assert.throws(()=>bangOutputObservationFacts(copied),/copied or foreign/);
 for(const copied of [structuredClone(first.parent.expansion),new Proxy(first.parent.expansion,{})])assert.throws(()=>observeBangOutput(copied),/Unsealed/);retain('03-exact-parent-child-proof-boundaries',{first,second});
});
test('unknown expansions attributes and nested implementation items are never confined by a block alone',()=>{
 const refused=[];
 for(const output of ['{unknown!()}','{if false {unknown!()}else{true}}','{#[allow(unused)] true}','{impl Drop for Payload{fn drop(&mut self){}} true}','{let thunk=||{impl Drop for Payload{fn drop(&mut self){}}};true}','{fn()}','{use()}']){
  const fixture=compile('macro_rules! original { () => {'+output+'}; }','original');assert.throws(()=>observeBangOutput(fixture.expansion));refused.push({output,...fixture});
 }
 retain('04-full-expression-and-hidden-output-refusals',{refused});
});
test('opaque expr fragments remain original and refused until a genuine AST namespace join exists',()=>{
 const fixture=compile('macro_rules! original { ($value:expr) => {{$value}}; }','original','external()'),control=compileExpandedControlExpression(fixture.expansion);assert.equal(control.controlSyntaxProjected,false);assert.equal(fixture.expansion.trees[0].children[0].kind,'fragment');assert.equal(fixture.expansion.trees[0].children[0].fragment,'expr');assert.throws(()=>observeBangOutput(fixture.expansion),/prefix|fragment/);retain('05-opaque-original-fragment-refusal',{fixture,control});
});
test('definition site owner paths retain their actual source without resolving the owner from spelling',()=>{
 const fixture=compile('macro_rules! original { () => {{$crate::Marker}}; }','original','',['actual','definition']),control=compileExpandedControlExpression(fixture.expansion),observation=observeBangOutput(fixture.expansion),node=control.ir.body.tail;
 assert.deepEqual(node.path,['actual','definition','Marker']);assert.equal(node.definitionSiteOwner.kind,'owner');assert.equal(node.definitionSiteOwner.verified,false);assert.equal(node.ownerResolved,false);assert.equal(observation.macroOwnerResolved,false);assert.throws(()=>lowerObservedBooleanExpression(observation),/additional checked semantics/);retain('06-definition-site-owner-stays-unresolved',{fixture,control,observation});
});
test('output projection data and child arrays reject forgeries proxies accessors and extra authority fields',()=>{
 const fixture=nested('true');let getters=0;
 const options=Object.defineProperty({},'children',{get(){getters++;return [fixture.child];}});assert.throws(()=>observeBangOutput(fixture.parent.expansion,options),/accessor/);
 const children=[];Object.defineProperty(children,'0',{get(){getters++;return fixture.child;}});assert.throws(()=>observeBangOutput(fixture.parent.expansion,{children}),/accessor/);
 assert.throws(()=>observeBangOutput(fixture.parent.expansion,{children:[fixture.child],namespaceAuthority:true}),/own child/);assert.equal(getters,0);retain('07-public-data-no-private-authority',{fixture,getters});
});
test('actual Router resume source remains unchanged and carries its complete unresolved caller obligations',()=>{
 const root=new URL('../../../',import.meta.url),accounts=readFileSync(new URL('src/accounts_cli.rs',root),'utf8'),unix=readFileSync(new URL('src/unix_listener.rs',root),'utf8');
 assert.ok(accounts.includes('fn resume_message(name: &str, was_paused: bool) -> String {'));assert.ok(accounts.includes('format!("resumed {name}")'));assert.ok(accounts.includes('format!("{name} was not paused")'));assert.ok(unix.includes('tracing::info!'));assert.ok(unix.includes('tracing::error!'));
 retain('08-original-source-frontier',{accounts,unix,callerOwnerResolved:false,transitiveTracingOutputClosed:false,formatArgsOutputClosed:false,conditionalUnixSelected:false,originalRouterBodyGains:0});
});
test('complete pinned matches and assert_eq source retain actual unclosed fragment and expansion barriers',()=>{
 const profile=loadStandardMatchesSourceProfile(),core=standardMatchesOriginalSource(profile,'library/core/src/macros/mod.rs'),items=sourceItems(core.source).filter(item=>!item.comment&&item.name==='assert_eq');assert.equal(items.length,1);
 const originals=[{name:'matches',source:standardMatchesOriginalDefinition(profile),input:'true,true',span:profile.definition.span},{name:'assert_eq',source:core.source.slice(items[0].start,items[0].end),input:'true,true',span:{start:items[0].start,end:items[0].end}}],failures=[];
 for(const original of originals){let definition,expansion,failure;assert.throws(()=>{try{definition=compileDeclarativeMacro(original.source,{name:original.name,owner:['core']});expansion=expandDeclarativeMacro(definition,originalMacroTrees(original.input));observeBangOutput(expansion);}catch(error){failure={name:error.name,message:error.message};throw error;}},TypeError);failures.push({...original,definition,expansion,failure});}
 retain('09-complete-pinned-original-control-frontiers',{profile,core,failures,ownerResolved:false,originalMacroRuntimeExecuted:false});
});
