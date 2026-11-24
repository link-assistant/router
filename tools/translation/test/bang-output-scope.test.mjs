import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeNestedMacroInvocations,declarativeNestedMacroInput} from '../declarative-token-macros.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
import {observeBangOutput,bangOutputObservationFacts} from '../bang-output-observer.mjs';
import {proveBangOutputScope,bangOutputScopeFacts} from '../bang-output-scope.mjs';
import {loadStandardMatchesSourceProfile,standardMatchesOriginalSource,standardMatchesOriginalDefinition} from '../matches-source-profile.mjs';
const retain=(name,value)=>{
  const directory=process.env.ROUTER_BANG_SCOPE_VECTOR_DIR;if(!directory)return;
  mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json',JSON.stringify(value)+'\n',{flag:'wx'});
};
const compile=(source,name='original',input='')=>{
  const definition=compileDeclarativeMacro(source,{name,owner:['authored','fixture']}),expansion=expandDeclarativeMacro(definition,originalMacroTrees(input));
  return {source,input,definition,expansion};
};
const single=output=>compile('macro_rules! original { () => {'+output+'}; }');
function nested(input='true'){
  const source='macro_rules! leaf{($value:tt)=>{{$value}}}macro_rules! original{($value:tt)=>{{leaf!($value)&&leaf!(false)}}}',fixture=compile(source,'original',input),records=declarativeNestedMacroInvocations(fixture.expansion);
  assert.equal(records.length,2);const definition=compileDeclarativeMacro(source,{name:'leaf',owner:['authored','fixture']});
  const leaves=records.map(record=>{const expansion=expandDeclarativeMacro(definition,declarativeNestedMacroInput(fixture.expansion,record)),observation=observeBangOutput(expansion),token=proveBangOutputScope(observation);return {record,expansion,observation,token};});
  const observation=observeBangOutput(fixture.expansion,{children:leaves.map(row=>row.observation)});
  return {...fixture,records,leaves,observation};
}
test('private scope tokens inspect the entire actual expression without claiming owner or runtime authority',()=>{
  const fixture=single('{let value=true;if value {external()}else{false}}'),observation=observeBangOutput(fixture.expansion),token=proveBangOutputScope(observation),facts=bangOutputScopeFacts(token,{expansion:fixture.expansion});
  assert.equal(facts.expansion,fixture.expansion);assert.equal(facts.observation,observation);assert.equal(facts.control,bangOutputObservationFacts(observation).control);assert.ok(facts.cells>0);assert.ok(Object.isFrozen(facts));assert.ok(Object.isFrozen(token));assert.deepEqual(Object.keys(token),['schema']);
  assert.equal(token.namespaceAuthority,undefined);assert.equal(observation.macroOwnerResolved,false);assert.equal(observation.runtimeAuthority,false);
  retain('01-complete-expression',{fixture,observation,token,facts,calleeRuntimeExecuted:false,callerNamespaceClosed:false});
});
test('every exact nested child requires its own private scope token and is visited once',()=>{
  const fixture=nested(),children=fixture.leaves.map(row=>row.token),token=proveBangOutputScope(fixture.observation,{children:[...children].reverse()}),facts=bangOutputScopeFacts(token,{expansion:fixture.expansion});
  assert.equal(facts.children.length,2);assert.ok(facts.cells>fixture.leaves.reduce((total,row)=>total+bangOutputScopeFacts(row.token,{expansion:row.expansion}).cells,0));
  assert.throws(()=>proveBangOutputScope(fixture.observation),/missing/);
  assert.throws(()=>proveBangOutputScope(fixture.observation,{children:children.slice(0,1)}),/missing/);
  assert.throws(()=>proveBangOutputScope(fixture.observation,{children:[...children,children[0]]}),/duplicate|extra/);
  retain('02-complete-nested-lineage',{fixture,children,token,facts});
});
test('identical public bytes never let foreign analyses or copied tokens supply a missing child',()=>{
  const first=nested(),second=nested();assert.equal(first.expansion.digest,second.expansion.digest);assert.notEqual(first.expansion,second.expansion);
  const token=proveBangOutputScope(first.observation,{children:first.leaves.map(row=>row.token)});
  assert.throws(()=>proveBangOutputScope(first.observation,{children:second.leaves.map(row=>row.token)}),/missing/);
  assert.throws(()=>proveBangOutputScope(first.observation,{children:first.leaves.map(row=>({...row.token}))}),/missing/);
  for(const copied of [{...token},structuredClone(token),new Proxy(token,{})])assert.throws(()=>bangOutputScopeFacts(copied,{expansion:first.expansion}),/unissued/);
  for(const expansion of [second.expansion,{...first.expansion},new Proxy(first.expansion,{})])assert.throws(()=>bangOutputScopeFacts(token,{expansion}),/another genuine expansion/);
  assert.equal(bangOutputScopeFacts(token,{expansion:first.expansion}).expansion,first.expansion);
  retain('03-foreign-and-copied-proof-controls',{first,second,token,publicDigestsEqual:true,privateIdentitiesDistinct:true});
});
test('options and child containers cannot execute getters proxies or fabricate authority',()=>{
  const fixture=nested(),children=fixture.leaves.map(row=>row.token);let callbacks=0;
  const getter=Object.defineProperty({},'children',{get(){callbacks++;return children;}}),array=[];Object.defineProperty(array,'0',{get(){callbacks++;return children[0];}});
  const proxy=new Proxy(children,{get(){callbacks++;throw new Error('untrusted');},ownKeys(){callbacks++;throw new Error('untrusted');}});
  for(const input of [getter,{children:array},{children:proxy},{children,namespaceAuthority:true},{children:new Array(2)}])assert.throws(()=>proveBangOutputScope(fixture.observation,input),TypeError);
  const token=proveBangOutputScope(fixture.observation,{children}),options=Object.defineProperty({},'expansion',{get(){callbacks++;return fixture.expansion;}});
  assert.throws(()=>bangOutputScopeFacts(token,options),/accessor/);assert.equal(callbacks,0);
  retain('04-no-public-authority-callbacks',{fixture,token,callbacks});
});
test('hidden items attributes and exports remain refused in every branch closure and surrounding output',()=>{
  const cases=[
    'fn hidden(){} {true}',
    '{true} #[macro_export]macro_rules! escape{()=>{true}}',
    '{#[allow(unused)]true}',
    '{if false{#[macro_export]macro_rules! escape{()=>{true}}}else{true}}',
    '{let callback=||{fn hidden(){}true};true}',
    '{impl Drop for Payload{fn drop(&mut self){}}true}',
    '{use external::Owner;true}',
    '{static VALUE:bool=true;VALUE}',
    '{const VALUE:bool=true;VALUE}',
    '{async{true}}',
  ],refusals=[];
  for(const output of cases){const fixture=single(output);let stage='142 complete expression prerequisite',observation,error;
    assert.throws(()=>{try{observation=observeBangOutput(fixture.expansion);stage='155 independent output-scope grammar';proveBangOutputScope(observation);}catch(cause){error={name:cause.name,message:cause.message};throw cause;}},TypeError);
    refusals.push({output,fixture,observation,stage,error});
  }
  retain('05-full-hidden-output-refusals',{refusals,noBranchesElided:true,noScopeTokenIssued:true});
});
test('unknown nested output stays refused even behind a literal false branch',()=>{
  const refusals=[];
  for(const output of ['{unknown!()}','{if false{unknown!()}else{true}}','{let callback=||unknown!();true}']){
    const fixture=single(output);let error;assert.throws(()=>{try{proveBangOutputScope(observeBangOutput(fixture.expansion));}catch(cause){error={name:cause.name,message:cause.message};throw cause;}},TypeError);refusals.push({fixture,error});
  }
  const fixture=nested(),foreign=single('{true}'),foreignObservation=observeBangOutput(foreign.expansion),extra=proveBangOutputScope(foreignObservation);
  assert.throws(()=>proveBangOutputScope(fixture.observation,{children:[...fixture.leaves.map(row=>row.token),extra]}),/extra or foreign/);
  retain('06-unknown-and-extra-output-refusals',{refusals,fixture,foreign,foreignObservation,extra});
});
test('opaque fragment ASTs and private source controls cannot be replaced by a public observation',()=>{
  const refused=[];
  for(const [kind,input]of [['expr','external()'],['pat','Some(value)'],['ty','Option<bool>'],['meta','allow(unused)']]){
    const source='macro_rules! original{($value:'+kind+')=>{{$value}}}';let fixture,error,stage='original token-engine definition';
    assert.throws(()=>{try{fixture=compile(source,'original',input);stage='142 complete expression /155 scope';proveBangOutputScope(observeBangOutput(fixture.expansion));}catch(cause){error={name:cause.name,message:cause.message};throw cause;}},TypeError);refused.push({kind,source,input,fixture,stage,error});
  }
  const fixture=single('{true}'),observation=observeBangOutput(fixture.expansion);
  for(const copied of [{...observation},structuredClone(observation),new Proxy(observation,{})])assert.throws(()=>proveBangOutputScope(copied),/copied or foreign/);
  assert.throws(()=>proveBangOutputScope(fixture.expansion),/copied or foreign/);
  retain('07-opaque-private-control-boundaries',{refused,fixture,observation});
});
test('complete pinned matches source retains its real unresolved opaque-output frontier',()=>{
  const profile=loadStandardMatchesSourceProfile(),source=standardMatchesOriginalDefinition(profile),core=standardMatchesOriginalSource(profile,'library/core/src/macros/mod.rs');let definition,expansion,error,stage='original declarative definition';
  assert.throws(()=>{try{definition=compileDeclarativeMacro(source,{name:'matches',owner:['core']});stage='original expansion';expansion=expandDeclarativeMacro(definition,originalMacroTrees('true,true'));stage='complete142 expression and155 scope';proveBangOutputScope(observeBangOutput(expansion));}catch(cause){error={name:cause.name,message:cause.message};throw cause;}},TypeError);
  retain('08-complete-original-frontier',{profile,source,core,definition,expansion,stage,error,scopeTokenIssued:false,callerOwnerResolved:false,tracingStaticUseCfgClosed:false,formatArgsClosed:false,originalRouterBodyGains:0,prerequisite142Verified:false});
});
test('same-key-count child holes and ambient toJSON cannot supply descriptor or lineage evidence',()=>{
  const fixture=nested(),provided=fixture.leaves.map(row=>row.token),hole=new Array(1);Object.defineProperty(hole,'unrelated',{value:provided[0]});
  assert.equal(Reflect.ownKeys(hole).length,hole.length+1);assert.equal(Object.hasOwn(hole,'0'),false);
  const numeric=Object.getOwnPropertyDescriptor(Object.prototype,'0');let numericCallbacks=0,holeError;
  try{
    Object.defineProperty(Object.prototype,'0',{configurable:true,get(){numericCallbacks++;return {value:provided[0]};}});
    try{proveBangOutputScope(fixture.observation,{children:hole});}catch(error){holeError=error;}
  }finally{if(numeric)Object.defineProperty(Object.prototype,'0',numeric);else delete Object.prototype[0];}
  assert.ok(holeError instanceof TypeError);assert.match(holeError.message,/child accessor or hole/);assert.equal(numericCallbacks,0);
  const arrayJson=Object.getOwnPropertyDescriptor(Array.prototype,'toJSON'),objectJson=Object.getOwnPropertyDescriptor(Object.prototype,'toJSON');let jsonCallbacks=0,token,pathError;
  const substitute=()=>{jsonCallbacks++;return ['substituted','path'];};
  try{
    Object.defineProperty(Array.prototype,'toJSON',{configurable:true,value:substitute});Object.defineProperty(Object.prototype,'toJSON',{configurable:true,value:substitute});
    try{token=proveBangOutputScope(fixture.observation,{children:provided});bangOutputScopeFacts(token,{expansion:fixture.expansion});}catch(error){pathError=error;}
  }finally{
    if(arrayJson)Object.defineProperty(Array.prototype,'toJSON',arrayJson);else delete Array.prototype.toJSON;
    if(objectJson)Object.defineProperty(Object.prototype,'toJSON',objectJson);else delete Object.prototype.toJSON;
  }
  assert.equal(pathError,undefined);assert.ok(token);assert.equal(jsonCallbacks,0);
  assert.equal(bangOutputScopeFacts(token,{expansion:fixture.expansion}).expansion,fixture.expansion);
  retain('09-own-descriptor-and-direct-lineage',{fixture,holeOwnKeys:Reflect.ownKeys(hole),holeLength:hole.length,holeError:{name:holeError.name,message:holeError.message},numericCallbacks,jsonCallbacks,token});
});
