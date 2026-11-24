import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateSource} from '../translate.mjs';
import {assertConstructorInput,snapshotConstructorValue} from '../extensions/constructor-value-runtime.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const vectorCounts=new Map();
const retain=(name,value)=>{
  if(!process.env.ROUTER_CONSTRUCTOR_VALUE_VECTORS)return;
  mkdirSync(process.env.ROUTER_CONSTRUCTOR_VALUE_VECTORS,{recursive:true});
  const count=(vectorCounts.get(name)??0)+1;vectorCounts.set(name,count);
  writeFileSync(process.env.ROUTER_CONSTRUCTOR_VALUE_VECTORS+'/'+name+'-'+count+'.json',JSON.stringify(value,(_,value)=>typeof value==='bigint'?{$bigint:String(value)}:value)+'\n',{flag:'wx'});
};
const compile=(source,path='src/fixture.rs')=>{
  const result=translateSource(source,path);retain(path.replace(/[^A-Za-z0-9]/gu,'_'),{source,sourceSha256:hash(source),result});return result;
};
const typed=(result,verify)=>verifyTypedTargets(result,verify,{childTimeoutMs:20000});

test('original DeploySection namespace refusal remains and authored owned fields isolate caller values',{timeout:60000},async()=>{
  const original=readFileSync(repositorySourceURL('src/deploy_config.rs',root),'utf8'),standalone=compile(original,'src/deploy_config.rs');
  const item=standalone.ir.items.find(row=>row.name==='DeploySection');assert.equal(item?.status,'carried');
  assert.equal(item.diagnostic.message,'shadowed Option generic: the standard prelude type requires actual resolution');assert.deepEqual(item.diagnostic.span,{start:14155,end:14169});
  retain('original-deploy-context',{original,standalone,runtimeAdmissionClaim:false});
  const source='pub struct OwnedSettings{server:Option<String>,instance:Option<String>,port:Option<u16>,public_port:Option<u16>,image:Option<String>,build:Option<String>,root:Option<String>,mode:Option<String>,claude_credentials:Option<String>,seed_credentials:Vec<String>}';
  const result=compile(source,'src/authored-constructor-owned.rs');assert.equal(result.ir.counts.carried,0);
  await typed(result,api=>{
    const server={$:'Some',field0:'before-server'},none=Object.freeze({$:'None'}),names=['before'];
    const output=api.OwnedSettings(server,none,none,none,none,none,none,none,none,names);
    assert.ok(Object.isFrozen(output));assert.ok(Object.isFrozen(output.seed_credentials));assert.ok(Object.isFrozen(output.server));
    assert.notEqual(output.seed_credentials,names);assert.notEqual(output.server,server);
    names[0]='after';names.push('extra');server.field0='after-server';
    assert.deepEqual(output.seed_credentials,['before']);assert.equal(output.server.field0,'before-server');
    assert.equal(Object.isFrozen(names),false);assert.equal(Object.isFrozen(server),false);
    retain('authored-owned-observation',{output,caller:{server,names},callerFrozen:[Object.isFrozen(server),Object.isFrozen(names)],scope:'authored complete fixture; actual stored original constructor covered independently by test150 after regeneration'});
  });
});
test('original verification namespace refusals remain and authored slice constructors snapshot caller arrays',{timeout:60000},async()=>{
  const original=readFileSync(repositorySourceURL('src/verification.rs',root),'utf8'),standalone=compile(original,'src/verification.rs');
  for(const name of ['Run','Area']){const item=standalone.ir.items.find(row=>row.name===name);assert.equal(item?.status,'carried');assert.match(item.diagnostic.message,/shadowed borrowed str type: requires actual standard primitive identity/u);}
  retain('original-verification-context',{original,standalone,runtimeAdmissionClaim:false});
  const source="pub struct Run{targets:&'static [&'static str],unit:&'static [&'static str],filter:Option<&'static str>,serial:bool} pub struct Area{name:&'static str,covers:&'static str,enable:&'static str,runs:&'static [Run]}";
  const result=compile(source,'src/authored-constructor-slices.rs');
  for(const name of ['Run','Area'])assert.equal(result.ir.items.find(row=>row.name===name)?.status,'executable');
  await typed(result,api=>{
    const targets=['first'],unit=[],none=Object.freeze({$:'None'}),run=api.Run(targets,unit,none,false),runs=[run];
    const area=api.Area('name','covers','enable',runs);
    targets[0]='changed';unit.push('unit');runs.push(run);
    assert.deepEqual(run.targets,['first']);assert.deepEqual(run.unit,[]);assert.equal(area.runs.length,1);
    assert.notEqual(run.targets,targets);assert.notEqual(area.runs,runs);assert.equal(area.runs[0],run);
    for(const value of [run,run.targets,run.unit,area,area.runs])assert.ok(Object.isFrozen(value));
    for(const value of [targets,unit,runs])assert.equal(Object.isFrozen(value),false);
    const frozen=Object.freeze(['frozen']);assert.deepEqual(api.Run(frozen,Object.freeze([]),none,true).targets,['frozen']);
    retain('authored-slice-observation',{run,area,caller:{targets,unit,runs},scope:'authored complete fixture; actual stored original constructors covered independently by test150 after regeneration'});
  });
});
test('named tuple and enum constructor boundaries recursively isolate mutable nested values',{timeout:60000},async()=>{
  const source='pub struct Record{values:Vec<String>} pub struct Pair(Vec<Vec<String>>,Record); pub enum Choice{Named{value:Option<Vec<Record>>},Tuple(Vec<String>),Empty}';
  const result=compile(source);assert.equal(result.ir.counts.carried,0);
  await typed(result,api=>{
    const inner=['one'],matrix=[inner],record={$:'Record',values:['record']},pair=api.Pair(matrix,record);
    const option={$:'Some',field0:[record]},choice=api.Choice.Named(option),tuple=api.Choice.Tuple(inner);
    inner[0]='changed';matrix.push([]);record.values.push('after');option.field0=[];
    assert.deepEqual(pair.field0,[['one']]);assert.deepEqual(pair.field1.values,['record']);
    assert.deepEqual(choice.value.field0[0].values,['record']);assert.deepEqual(tuple.field0,['one']);
    assert.ok(Object.isFrozen(pair.field0[0]));assert.ok(Object.isFrozen(choice.value.field0));
    assert.equal(Object.isFrozen(inner),false);assert.equal(Object.isFrozen(record),false);
    assert.deepEqual(api.Choice.Empty(),{$:'Empty'});
    retain('nested-observation',{pair,choice,tuple});
  });
});
test('whole exported constructors reject hostile aggregates before any original parameter guard callback',{timeout:60000},async()=>{
  const result=compile('pub struct Strings{values:Vec<String>} pub struct Child{value:String} pub struct Children{values:Vec<Child>} pub enum Choice{Values(Vec<String>)}');
  await typed(result,api=>{
    let calls=0;const trap=()=>{calls++;throw new Error('untrusted callback');};
    const proxy=new Proxy(['safe'],{get:trap,getOwnPropertyDescriptor:trap,getPrototypeOf:trap,ownKeys:trap});
    const getter=[];Object.defineProperty(getter,'0',{get:trap,enumerable:true});
    const iterator=['safe'];Object.defineProperty(iterator,Symbol.iterator,{value:trap});
    const species=['safe'];Object.defineProperty(species,'constructor',{get:trap});
    const child={$:'Child'};Object.defineProperty(child,'value',{get:trap,enumerable:true});
    for(const value of [proxy,getter,iterator,species,new Array(2)]){
      assert.throws(()=>api.Strings(value),TypeError);assert.throws(()=>api.Choice.Values(value),TypeError);
    }
    assert.throws(()=>api.Children([child]),TypeError);
    const outer=new Proxy({$:'Child',value:'safe'},{get:trap,getOwnPropertyDescriptor:trap,getPrototypeOf:trap,ownKeys:trap});
    assert.throws(()=>api.Children([outer]),TypeError);assert.equal(calls,0);
    retain('hostile-boundary-observation',{calls,allRefused:true});
  });
});
test('constructor argument expressions evaluate exactly once in order and scalar guards keep their original errors',{timeout:60000},async()=>{
  const result=compile('pub struct Pair{left:Vec<String>,right:Vec<String>} pub enum State{Ready,Waiting(u8)}');
  await typed(result,api=>{
    const order=[],argument=name=>{order.push(name);return [name];};
    const pair=api.Pair(argument('left'),argument('right'));assert.deepEqual(order,['left','right']);
    assert.deepEqual(pair.left,['left']);assert.deepEqual(pair.right,['right']);
    assert.throws(()=>api.State.Waiting(256n),RangeError);assert.throws(()=>api.State.Waiting('wrong'),TypeError);
    retain('order-and-errors',{order,pair,rangeErrorPreserved:true});
  });
});
test('valid large Vec and slice constructor inputs retain their existing length domain',{timeout:60000},async()=>{
  const result=compile("pub struct Owned{values:Vec<String>} pub struct Borrowed{values:&'static [&'static str]}");
  await typed(result,api=>{
    const values=Array.from({length:20001},(_,index)=>String(index));
    const owned=api.Owned(values),borrowed=api.Borrowed(values);
    assert.equal(owned.values.length,20001);assert.equal(borrowed.values.length,20001);
    assert.notEqual(owned.values,values);assert.notEqual(borrowed.values,values);
    values[20000]='after';assert.equal(owned.values[20000],'20000');assert.equal(borrowed.values[20000],'20000');
    retain('large-values',{length:values.length,lastOwned:owned.values[20000],lastBorrowed:borrowed.values[20000],callerFrozen:Object.isFrozen(values)});
  });
});
test('existing immutable host records keep identity only after their original refinement guards',{timeout:60000},async()=>{
  const result=compile('pub struct Payload{value:serde_json::Value}');
  await typed(result,api=>{
    const value=serde_json_from_str('{"nested":[2,true]}').field0,output=api.Payload(value);
    assert.equal(output.value,value);assert.ok(Object.isFrozen(output));
    const invalid=Object.freeze({$:'Number',field0:Object.freeze({$:'Float',field0:Infinity})});
    assert.throws(()=>api.Payload(invalid),TypeError);
    retain('host-refinement-observation',{identityPreserved:output.value===value,output,invalidRefused:true});
  });
});
test('ordinary borrowed slice function inputs remain accepted and caller-owned',{timeout:60000},async()=>{
  const result=compile('pub fn length(values:&[u8])->usize{values.len()} pub struct Owned{values:Vec<String>}');
  await typed(result,api=>{
    const values=[1n,2n];assert.equal(api.length(values),2n);values.push(3n);assert.equal(api.length(values),3n);
    assert.equal(Object.isFrozen(values),false);retain('ordinary-function-observation',{values,length:api.length(values)});
  });
});
test('iterative schema snapshot rejects cycles and accessors while preserving unbounded finite recursive values',{timeout:5000},()=>{
  const type={kind:'data',name:'Node'},schema={schemaVersion:1,types:{Node:{kind:'data',name:'Node',ctors:[{name:'End',fields:[]},{name:'Link',fields:[{name:'next',type}]}]}}};
  let value={$:'End'};for(let index=0;index<20001;index++)value={$:'Link',next:value};
  assert.equal(assertConstructorInput(value,type,schema),true);const result=snapshotConstructorValue(value,type,schema);let current=result,count=0;
  while(current.$==='Link'){assert.ok(Object.isFrozen(current));count++;current=current.next;}assert.equal(count,20001);assert.equal(Object.isFrozen(value),false);
  const cycle={$:'Link'};cycle.next=cycle;assert.throws(()=>snapshotConstructorValue(cycle,type,schema),/cyclic/);
  let calls=0;const accessor={};Object.defineProperty(accessor,'$',{get(){calls++;return 'End';}});assert.throws(()=>assertConstructorInput(accessor,type,schema),/accessor/);assert.equal(calls,0);
  retain('iterative-runtime-observation',{count,cyclesRefused:true,getterCalls:calls,scope:'runtime helper only; not a claim of source recursive Box support'});
});
