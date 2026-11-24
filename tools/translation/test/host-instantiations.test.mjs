import test from 'node:test';
import assert from 'node:assert/strict';
import { HostChecker, hostData } from '../extensions/host-contracts.mjs';
import { HostInstantiations } from '../extensions/host-instantiations.mjs';
import { fixed } from '../vendor/meta-language/translation/types.js';
import {historicalRealSourceEntry} from './real-source-fixtures.mjs';

test('factory data is declared and checked once per actual monomorphic receiver', () => {
  const checker = new HostChecker('Rust', []);
  checker.program({language:'Rust',items:hostData(),main:null});
  const registry = new HostInstantiations(checker), span = {start:7,end:11};
  const small = registry.vector(fixed(8,false),span);
  assert.equal(registry.vector(fixed(8,false),span), small);
  const wide = registry.vector(fixed(16,false),span);
  assert.notEqual(wide.option.path[0], small.option.path[0]);
  assert.equal(registry.contracts.size, 6);
  const type = checker.resolveType(small.option,[],span), entry = checker.items.get(type.name);
  assert.deepEqual(entry.standardGeneric,{kind:'Option',arguments:[small.borrowedElement]});
  assert.deepEqual(entry.standardGeneric.arguments[0].rustReference.pointee,fixed(8,false));
  assert.equal(entry.ctors[1].fields[0].type.bits,8);
  assert.equal(registry.items.filter(item=>item.k==='data').length,2);
  assert.throws(()=>registry.vector({kind:'named',path:['Unknown']},span),error=>error.kind==='unsupported'&&error.span.start===7);
  // Portable layout reuse must not reuse a prior caller's source identity.
  for(const sourceFirst of [false,true]){
    const current=new HostInstantiations(checker),portable={...fixed(64,false),rustPrimitiveName:'u64'},source={...portable,rustSourceType:true};
    const order=sourceFirst?[source,portable,fixed(64,false),source]:[fixed(64,false),source,portable,fixed(64,false)];
    let declared;
    for(const input of order){
      const instance=current.fixed(input,span),expected=input.rustSourceType===true?true:undefined;
      for(const contract of instance.contracts){
        assert.equal(contract.receiver.rustSourceType,expected);assert.equal(contract.receiver.rustPrimitiveName,input.rustPrimitiveName);
        for(const parameter of contract.params)assert.deepEqual(parameter,instance.type);
        const output=contract.jsExport.startsWith('rust_fixed_checked_')?contract.ret.rustStandardGeneric.arguments[0]:contract.ret;
        assert.deepEqual(output,instance.type);assert.equal(output.rustSourceType,expected);
      }
      assert.equal(current.instances.size,1);declared??=current.items.length;assert.equal(current.items.length,declared);
    }
  }
});

import { translateProject } from '../project.mjs';
import { loadJavaScript, writeRuntimeAssets } from './artifact-loader.mjs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
const project = source => translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const strict = result => {const dir=mkdtempSync(join(tmpdir(),'router-vector-types-'));try {writeRuntimeAssets(dir);const path=join(dir,'src/fixture.ts');writeFileSync(path,result.typescript);execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--noEmit','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',path],{encoding:'utf8'});}finally{rmSync(dir,{recursive:true,force:true});}};

test('checked shared slice readers preserve positions and reject malformed receivers in emitted runtimes', async () => {
  const result=project('pub fn first(values:&[u8])->Option<&u8>{values.first()} pub fn last(values:&[u8])->Option<&u8>{values.last()} pub fn at(values:&[u8],index:usize)->Option<&u8>{values.get(index)} pub fn collision(values:&[u8],ml_host_rust_vec_first_u8:u8)->Option<&u8>{values.first()}');
  assert.deepEqual(result.meta.refused,[]);strict(result);
  const api=(await loadJavaScript(result.javascript)).translated;
  assert.deepEqual(api.first([7n,9n]),{$:'Some',field0:7n});assert.deepEqual(api.last([7n,9n]),{$:'Some',field0:9n});assert.deepEqual(api.at([7n,9n],1n),{$:'Some',field0:9n});
  assert.deepEqual(api.first([]),{$:'None'});assert.deepEqual(api.at([7n],(1n<<64n)-1n),{$:'None'});assert.deepEqual(api.collision([7n],0n),{$:'Some',field0:7n});
  assert.throws(()=>api.first([256n]),TypeError);assert.throws(()=>api.first(Array(1)),TypeError);assert.throws(()=>api.at([7n],-1n),RangeError);
  let calls=0;const values=[];Object.defineProperty(values,'0',{get(){calls++;return 7n;},enumerable:true});assert.throws(()=>api.first(values),TypeError);assert.equal(calls,0);
});

test('source Vec shadows and unsafely const-eligible readers remain explicit refusals', () => {
  for(const source of ['mod Vec {} pub fn invented(values:Vec<u8>)->Option<&u8>{values.first()}', 'pub struct Vec {value:u8} pub fn invented(values:Vec<u8>)->Option<&u8>{values.first()}', 'const fn invented(values:&[u8])->Option<&u8>{values.first()}']) {
    const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='invented'),false);assert.ok(result.meta.refused.length);
  }
});

test('an exact pinned identity reader executes through generic slice, Option and JSON contracts', async () => {
  const {source}=historicalRealSourceEntry('identity-first-block');
  const result=project(source);assert.deepEqual(result.meta.refused,[]);assert.ok(result.meta.executable.some(entry=>entry.name==='first_block_is_identity'));strict(result);
  const api=(await loadJavaScript(result.javascript)).translated;
  const string=value=>Object.freeze({$:'String',field0:value});
  const object=text=>Object.freeze({$:'Object',field0:Object.freeze({$:'Map',entries:[Object.freeze({$:'MapEntry',key:'text',value:text})]})});
  assert.equal(api.first_block_is_identity([]),false);assert.equal(api.first_block_is_identity([object(string(api.CLAUDE_CODE_SYSTEM_PROMPT))]),true);
  assert.equal(api.first_block_is_identity([object(string(api.CLAUDE_CODE_SYSTEM_PROMPT+' suffix'))]),true);
  assert.equal(api.first_block_is_identity([object(string('other')),object(string(api.CLAUDE_CODE_SYSTEM_PROMPT))]),false);
  assert.throws(()=>api.first_block_is_identity([{text:api.CLAUDE_CODE_SYSTEM_PROMPT}]),TypeError);
});

test('builtin constructors preserve resolved user owners and custom scalar type layouts', async () => {
  const files={'src/lib.rs':"mod String; mod Box; pub fn empty()->&'static str{String::new()} pub fn converted(value:u8)->u8{Box::new(value)} pub fn text(value:u8)->&'static str{String::from(value)}",'src/String.rs':"pub fn new()->&'static str{\"custom\"} pub fn from(value:u8)->&'static str{\"changed\"}",'src/Box.rs':'pub fn new(value:u8)->u8{value+1}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(result.meta.refused,[]);strict(result);
  const api=(await loadJavaScript(result.javascript)).translated;assert.equal(api.empty(),'custom');assert.equal(api.converted(1n),2n);assert.equal(api.text(1n),'changed');
  const custom=project('pub struct String {amount:u8} pub fn identity(value:String)->String{value}');assert.deepEqual(custom.meta.refused,[]);const value=Object.freeze({$:'String',amount:7n});const identity=(await loadJavaScript(custom.javascript)).translated.identity;assert.equal(identity(value),value);assert.throws(()=>identity('ordinary'),TypeError);
});

import {translateSource} from '../translate.mjs';
test('source macro bindings and unresolved import scopes cannot acquire builtin behavior', () => {
  const sources=[
    'macro_rules! format { ($($tt:tt)*) => { String::from("CUSTOM") }; } pub fn caller()->String{format!("BUILTIN")}',
    'macro_rules! vec { ($($tt:tt)*) => { [9u8] }; } pub fn caller()->u8{vec![1u8][0]}',
    'macro_rules! panic { ($($tt:tt)*) => { 9u8 }; } pub fn caller()->u8{panic!("BUILTIN")}',
    'use other::format; pub fn caller()->String{format!("BUILTIN")}',
    'use other::replacement as vec; pub fn caller()->u8{vec![1u8][0]}',
    'use other::*; pub fn caller()->String{String::new()}',
    '#[macro_use] extern crate other; pub fn caller()->String{format!("BUILTIN")}',
    'use other::Some; pub fn caller()->Option<u8>{Some(1)}',
    'use other::String; pub fn caller()->String{String::new()}',
  ];
  for(const source of sources){
    const standalone=translateSource(source);assert.equal(standalone.ir.items.find(item=>item.name==='caller').status,'carried',source);assert.equal(standalone.ir.items.map(item=>item.source).join(''),source);
    const assembled=project(source);assert.equal(assembled.meta.executable.some(entry=>entry.name==='caller'),false,source);assert.ok(assembled.meta.refused.some(entry=>entry.name==='caller'),source);
  }
  const files={'src/lib.rs':'macro_rules! format { ($($tt:tt)*) => { "custom" }; } mod child;','src/child.rs':'pub fn caller()->String{format!("BUILTIN")}'};
  const nested=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.equal(nested.meta.executable.some(entry=>entry.name==='child.caller'),false);
  assert.equal(translateSource('pub fn caller()->String{format!("{}",1u8)}').ir.counts.executableFunctions,1);
});

test('const qualification permits checked const callees and refuses ordinary functions', async () => {
  const accepted=project('const fn helper(value:u8)->u8{value+1} pub const fn caller(value:u8)->u8{helper(value)}');
  assert.deepEqual(accepted.meta.refused,[]);const declarations=new Map(accepted.meta.checkedSemanticProgram.program.declarations.$map);assert.equal(declarations.get('helper').constFunction,true);assert.equal(declarations.get('helper').span.start,0);assert.equal((await loadJavaScript(accepted.javascript)).translated.caller(1n),2n);
  for(const source of ['fn helper(value:u8)->u8{value+1} pub const fn caller(value:u8)->u8{helper(value)}','pub const fn caller(value:&[u8])->Option<&u8>{value.first()}']) {
    const refused=project(source);assert.equal(refused.meta.executable.some(entry=>entry.name==='caller'),false);assert.ok(refused.meta.refused.some(entry=>entry.name==='caller'));
  }
});
