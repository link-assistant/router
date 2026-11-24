import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {JSON_MACRO_RUNTIME_AUTHORITY,json_macro_null,json_macro_bool,json_macro_string,json_macro_i64,json_macro_u64,json_macro_value,json_macro_array,json_macro_object} from '../json-macro-runtime.mjs';
const tag=($,field0)=>Object.freeze(field0===undefined?{$}:{$,field0});

test('candidate scalar adapters preserve the canonical JSON layout and integer boundaries',()=>{
  assert.deepEqual(json_macro_null(),{$:'Null'});assert.deepEqual(json_macro_bool(true),tag('Bool',true));assert.deepEqual(json_macro_string('α💡\0'),tag('String','α💡\0'));
  assert.deepEqual(json_macro_i64(-(1n<<63n)),tag('Number',tag('NegInt',-(1n<<63n))));assert.deepEqual(json_macro_i64(0n),tag('Number',tag('PosInt',0n)));assert.deepEqual(json_macro_u64((1n<<64n)-1n),tag('Number',tag('PosInt',(1n<<64n)-1n)));
  for(const value of [-1n,1n<<64n,1,1.25,NaN])assert.throws(()=>json_macro_u64(value),TypeError);
  for(const value of [-(1n<<63n)-1n,1n<<63n,'1'])assert.throws(()=>json_macro_i64(value),TypeError);
  assert.throws(()=>json_macro_string('\ud800'),TypeError);assert.throws(()=>json_macro_bool(1),TypeError);assert.equal(Object.values(JSON_MACRO_RUNTIME_AUTHORITY).every(value=>value===false),true);
});

test('nested arrays and literal objects preserve values and canonical UTF-8 key ordering',()=>{
  const object=json_macro_object([['β',json_macro_array([json_macro_bool(false),json_macro_null()])],['a',json_macro_string('value')]]);
  assert.deepEqual(object.field0.entries.map(entry=>entry.key),['a','β']);assert.deepEqual(object.field0.entries[1].value.field0,[tag('Bool',false),tag('Null')]);
  assert.equal(Object.isFrozen(object),true);assert.equal(Object.isFrozen(object.field0.entries),true);
  assert.throws(()=>json_macro_object([['x',json_macro_null()],['x',json_macro_bool(true)]]),/Duplicate/);
  assert.throws(()=>json_macro_object([['x']]),TypeError);assert.throws(()=>json_macro_array(new Array(1)),TypeError);
});

test('canonical existing Value copy preserves finite Number without scalar float conversion or custom serialization',()=>{
  const original=tag('Array',Object.freeze([tag('Number',tag('Float',1.5)),tag('Number',tag('NegInt',-4n))]));
  const copy=json_macro_value(original);assert.deepEqual(copy,original);assert.notEqual(copy,original);assert.notEqual(copy.field0,original.field0);
  assert.throws(()=>json_macro_value(tag('Number',tag('Float',Infinity))),TypeError);assert.throws(()=>json_macro_value(tag('Custom',1n)),TypeError);
  assert.throws(()=>json_macro_value(tag('Object',Object.freeze({$:'Map',entries:Object.freeze([{ $:'MapEntry',key:'z',value:tag('Null')},{ $:'MapEntry',key:'a',value:tag('Null')}])}))),TypeError);
});

test('proxy getter prototype cyclic sparse and oversized domains reject before user dispatch',()=>{
  let reads=0;const proxy=new Proxy({}, {get(){reads++;throw new Error('read');},getPrototypeOf(){reads++;throw new Error('prototype');},ownKeys(){reads++;throw new Error('keys');}});
  assert.throws(()=>json_macro_value(proxy),TypeError);assert.throws(()=>json_macro_array(proxy),TypeError);assert.equal(reads,0);
  const getter=Object.defineProperty({$:'String'},'field0',{enumerable:true,get(){reads++;throw new Error('getter');}});assert.throws(()=>json_macro_value(getter),TypeError);assert.equal(reads,0);
  const custom=Object.create({serialize(){reads++;}});custom.$='Null';assert.throws(()=>json_macro_value(custom),TypeError);assert.equal(reads,0);
  const cycle={$:'Array',field0:[]};cycle.field0.push(cycle);assert.throws(()=>json_macro_value(cycle),TypeError);
  assert.throws(()=>json_macro_array(new Array(4097).fill(tag('Null'))),TypeError);
  assert.throws(()=>json_macro_value({$:'Null',[Symbol('field')]:true}),TypeError);
});

test('runtime constructor source order is receiver-free ordinary argument order with each scalar evaluated once',()=>{
  const effects=[];const scalar=(name,value)=>{effects.push(name);return json_macro_string(value);};
  const result=json_macro_object([['b',scalar('first','β')],['a',scalar('second','α')]]);
  assert.deepEqual(effects,['first','second']);assert.deepEqual(result.field0.entries.map(entry=>entry.key),['a','b']);
  // This authored adapter test does not claim Rust macro expansion or admission.
  assert.equal(JSON_MACRO_RUNTIME_AUTHORITY.expansionAuthority,false);
});

test('candidate scalar adapter carrier has matching JavaScript and separately strict-compiled TypeScript behavior',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-json-macro-candidate-'));
  try {
    mkdirSync(join(directory,'extensions'));
    for(const file of ['json-macro-runtime.mjs','json-macro-runtime.d.mts','extensions/json-values.mjs','extensions/json-numbers.mjs'])cpSync(new URL('../'+file,import.meta.url),join(directory,file));
    const source='import {json_macro_object,json_macro_string,json_macro_u64} from "./json-macro-runtime.mjs";\nexport const candidate=()=>json_macro_object([["name",json_macro_string("α💡")],["count",json_macro_u64(9n)]]);\n';
    writeFileSync(join(directory,'carrier.mts'),source);writeFileSync(join(directory,'carrier.mjs'),source);
    execFileSync(process.execPath,['--check',join(directory,'carrier.mjs')],{stdio:'pipe'});
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--outDir',join(directory,'compiled'),join(directory,'carrier.mts')],{stdio:'pipe'});
    cpSync(join(directory,'json-macro-runtime.mjs'),join(directory,'compiled/json-macro-runtime.mjs'));cpSync(join(directory,'extensions'),join(directory,'compiled/extensions'),{recursive:true});
    for(const file of ['carrier.mjs','compiled/carrier.mjs']){const module=await import(pathToFileURL(join(directory,file)));const value=module.candidate();assert.deepEqual(value.field0.entries.map(entry=>entry.key),['count','name']);assert.deepEqual(value.field0.entries[1].value,tag('String','α💡'));}
  } finally{rmSync(directory,{recursive:true,force:true});}
});
