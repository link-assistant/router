import test from 'node:test';
import assert from 'node:assert/strict';
import {externalModuleBindings} from '../registered-bindings.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {TIME_DATA,TIME_CONTRACTS} from '../extensions/time-contracts.mjs';
import {JSON_DATA,JSON_CONTRACTS} from '../extensions/json-contracts.mjs';
import {EFFECT_DATA,EFFECT_CONTRACTS} from '../extensions/effects-contracts.mjs';

const binding=(target,kind='struct',namespace='type')=>({name:target.at(-1),namespace,target,kind});
const duration=binding(['std','time','Duration']);
const fromStr=binding(['std','str','FromStr'],'trait');
const value=binding(['serde_json','Value'],'enum');
const nullVariant=binding(['serde_json','Value','Null'],'constructor','value');
function scope(source,tables) {
  return resolveModuleBindings({modules:[{file:'lib.rs',path:[],source,items:sourceItems(source)}],externalModules:tables}).scopes[0];
}

test('only explicit source data metadata publishes a type or constructor',()=>{
  const data=[{k:'module',name:'example',items:[{k:'data',name:'OpaqueAbi',ctors:[{name:'Private',fields:[]}]},{k:'data',name:'ActualAbi',sourceBinding:{...binding(['example','Actual'],'enum'),constructors:[binding(['example','Actual','Unit'],'constructor','value')]}}]}];
  const tables=externalModuleBindings({data});
  assert.deepEqual(tables.get('example').bindings,[binding(['example','Actual'],'enum')]);
  assert.deepEqual(tables.get('example::Actual').bindings,[binding(['example','Actual','Unit'],'constructor','value')]);
  assert.equal(tables.get('example::Actual').kind,'enum');
  assert.equal(tables.has('example::OpaqueAbi'),false);
});

test('real host ABI layouts do not invent private or monomorphic source names',()=>{
  const tables=externalModuleBindings({data:[...TIME_DATA,...JSON_DATA,...EFFECT_DATA],contracts:[...TIME_CONTRACTS,...JSON_CONTRACTS,...EFFECT_CONTRACTS],extraBindings:[duration,value,fromStr]});
  assert.deepEqual(tables.get('std::time').bindings,[duration]);
  const paths=[...tables.values()].flatMap(table=>table.bindings.map(item=>item.target.join('::')));
  for(const suffix of ['PosInt','NegInt','Float','MapEntry','Map_String_Value','TryFromFloatSecsErrorKind','IoError','from_secs','as_secs'])assert.equal(paths.some(path=>path.split('::').at(-1)===suffix),false,suffix);
  assert.ok(paths.includes('serde_json::from_str'));
  assert.ok(paths.includes('std::fs::read_to_string'));
  assert.ok(paths.includes('tokio::fs::write'));
  assert.ok(paths.includes('std::str::FromStr'));
});

test('source enum namespace and explicit variants resolve with their actual kind',()=>{
  const tables=externalModuleBindings({extraBindings:[value,nullVariant]});
  const result=scope('use serde_json::Value; use serde_json::Value::Null as Empty;',tables);
  assert.equal(result.bindings.find(item=>item.name==='Value'&&item.namespace==='type').kind,'enum');
  assert.deepEqual(result.bindings.find(item=>item.name==='Empty'&&item.namespace==='value').target,['serde_json','Value','Null']);
  assert.equal(result.bindings.find(item=>item.name==='Empty'&&item.namespace==='type'),undefined);
});

test('registered external globs remain uncertain despite named import support',()=>{
  const tables=externalModuleBindings({extraBindings:[duration,fromStr]});
  assert.ok([...tables.values()].every(table=>table.complete===false));
  const named=scope('use std::time::Duration as Delay;',tables);
  assert.deepEqual(named.bindings.find(item=>item.name==='Delay'&&item.namespace==='type').target,duration.target);
  const glob=scope('use std::time::*;',tables);
  assert.equal(glob.unresolvedTypeScope,true);
  assert.equal(glob.unresolvedMacroScope,true);
});

test('methods and associated functions never create importable owner modules',()=>{
  const contracts=[{kind:'method',receiver:{kind:'named',path:['std','time','Duration']},rustPath:['std','time','Duration','as_secs']},{kind:'function',rustPath:['std','time','Duration','new']}];
  const tables=externalModuleBindings({contracts,extraBindings:[duration]});
  assert.equal(tables.has('std::time::Duration'),false);
  assert.deepEqual(tables.get('std::time').bindings,[duration]);
  const unresolved=scope('use std::time::Duration::new;',tables);
  assert.ok(unresolved.bindings.filter(item=>item.name==='new').every(item=>item.status==='unresolved'));
});

test('identical overloads deduplicate and conflicting namespaces refuse',()=>{
  const contract={kind:'function',rustPath:['external','nested','read']};
  const tables=externalModuleBindings({contracts:[contract,{...contract}]});
  assert.equal(tables.get('external::nested').bindings.length,1);
  assert.throws(()=>externalModuleBindings({extraBindings:[duration,{...duration,target:['std','time','Other']}]}));
  assert.throws(()=>externalModuleBindings({extraBindings:[duration,{...duration,kind:'enum'}]}),/Conflicting/u);
  assert.throws(()=>externalModuleBindings({extraBindings:[duration,binding(['std','time','Duration','field'],'constructor','value')]}),/Associated/u);
});

test('tables clone inputs, freeze evidence and serialize without capabilities',()=>{
  const input=structuredClone(fromStr),tables=externalModuleBindings({extraBindings:[input]});
  input.target[0]='changed';
  const table=tables.get('std::str');
  assert.deepEqual(table.bindings,[fromStr]);
  assert.equal(Object.isFrozen(table),true);
  assert.equal(Object.isFrozen(table.bindings[0].target),true);
  assert.deepEqual(JSON.parse(JSON.stringify([...tables])),[...tables]);
});

test('malformed or internal registry paths never become external evidence',()=>{
  for(const descriptor of [{...fromStr,target:['crate','FromStr']},{...fromStr,target:['std']},{...fromStr,namespace:'layout'},{...fromStr,target:['std','str','bad-name']}])assert.throws(()=>externalModuleBindings({extraBindings:[descriptor]}),TypeError);
  assert.throws(()=>externalModuleBindings({data:{}}),TypeError);
  assert.throws(()=>externalModuleBindings({contracts:[{}]}),TypeError);
  assert.throws(()=>resolveModuleBindings({modules:[],externalModules:new Map([['bad',{bindings:[],complete:false,kind:'struct'}]])}),TypeError);
});
