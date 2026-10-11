import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {withPatternControlParser,withPatternControlChecker,withPatternControlEmitter} from '../extensions/pattern-control.mjs';
import {DataRustParser,DataChecker,DataEmitter} from '../extensions/data.mjs';
import {emitWith} from '../extensions/core.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {annotateRuntimeTypes} from '../translate.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {loadJavaScript,writeRuntimeAssets} from './artifact-loader.mjs';
const Parser=withPatternControlParser(DataRustParser),Checker=withPatternControlChecker(DataChecker),Emitter=withPatternControlEmitter(DataEmitter);
const tagged=($,fields={})=>Object.freeze({$,...fields});
const some=field0=>tagged('Some',{field0}),none=tagged('None');
const hash=text=>createHash('sha256').update(text).digest('hex');
function check(source,externals=[]) {
  const surface=new Parser(tokenizeRust(source+'\nfn main() {}')).file();surface.externals=externals;
  return new Checker('Rust',externals).program(surface);
}
async function compile(source,{externals=[],fixture=''}={}) {
  const checked=check(source,externals),serialized=serializeProgram(checked),program=parseProgram(serialized);
  assert.equal(serializeProgram(program),serialized);
  // Explicit fixture linkage supplies the external name; the pinned emitter
  // otherwise requires every call target to have a local declaration.
  class FixtureEmitter extends Emitter {
    expr(node) {
      if(node.k==='call'&&externals.some(entry=>entry.name===node.fn))return `${node.fn}(${node.args.map(arg=>this.expr(arg)).join(', ')})`;
      return super.expr(node);
    }
  }
  const emitted=emitWith(program,FixtureEmitter),mappings=emitted.mappings.filter(item=>item.kind==='function');
  const runtime=fixture+'\n'+emitted.text+'\nexport const translated = {'+mappings.map(item=>JSON.stringify(item.source)+':'+item.target).join(',')+(fixture?',fixture_count':'')+'};\n';
  const signatures=new Map(),returns=new Map();
  for(const mapping of mappings){const entry=program.declarations.get(mapping.source);signatures.set(mapping.target,entry.params);returns.set(mapping.target,entry.ret);}
  for(const external of externals){signatures.set(external.name,external.params);returns.set(external.name,external.ret);}
  const typed=annotateRuntimeTypes(runtime,signatures,[...program.declarations.values()].filter(entry=>entry.k==='data'),returns);
  execFileSync('node',['--input-type=module','--check'],{input:runtime,encoding:'utf8',timeout:10000});
  const javaScript=(await loadJavaScript(runtime)).translated;
  const directory=mkdtempSync(join(tmpdir(),'router-pattern-ts-'));
  let typeScript;
  try {writeRuntimeAssets(directory);const path=join(directory,'src/module.ts');writeFileSync(path,typed);
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',path],{encoding:'utf8',timeout:30000});
    typeScript=(await import(pathToFileURL(join(directory,'src/module.js')).href)).translated;
  } finally {rmSync(directory,{recursive:true,force:true});}
  return {apis:[javaScript,typeScript],program,runtime};
}
const refuse=source=>assert.throws(()=>check(source),error=>['unsupported','type','syntax'].includes(error.kind)&&Number.isInteger(error.span?.start));

test('if-let expressions bind scalars in the successful branch and shadow lexical names safely',async()=>{
  const {apis,program}=await compile('pub fn pick(value: Option<u8>, outer: u8) -> u8 { if let Some(outer) = value { outer } else { outer } } pub fn nested(value: Option<u8>) -> u8 { let result: u8 = if let Some(v) = value { v } else { 7 }; result }');
  assert.equal(program.declarations.get('pick').body.k,'let');
  assert.equal(program.declarations.get('pick').body.value.k,'var');
  assert.equal(program.declarations.get('pick').body.patternControl.plan.bindings[0].type.kind,'fixed');
  for(const api of apis){assert.equal(api.pick(some(4n),9n),4n);assert.equal(api.pick(none,9n),9n);assert.equal(api.nested(some(255n)),255n);assert.equal(api.nested(none),7n);
    assert.throws(()=>api.pick({$:'Some',field0:4n},9n),TypeError);
    let reads=0;const accessor=Object.freeze(Object.defineProperty({},'$',{get(){reads++;return 'Some';}}));
    assert.throws(()=>api.pick(accessor,9n),TypeError);assert.equal(reads,0);
    const proxy=new Proxy(some(4n),{get(target,key){reads++;return Reflect.get(target,key);}});
    assert.throws(()=>api.pick(proxy,9n),TypeError);assert.equal(reads,0);
  }
  refuse('fn leak(value: Option<u8>) -> u8 { if let Some(v) = value { v } else { v } }');
  refuse('fn leak(value: Option<u8>) -> u8 { if let Some(v) = value {} v }');
  refuse('fn subject(value: Option<u8>) -> u8 { if let Some(v) = if true { return 1; } else { value } { v } else { 0 } }');
  refuse('fn mutate(value: Option<u8>) -> u8 { if let Some(v) = value { v = 3; v } else { 0 } }');
});

test('scalar literal and irrefutable bindings retain Unicode, unit and exact integer values',async()=>{
  const source='pub fn unicode(value: &str) -> bool { if let "Ω" = value { true } else { false } } pub fn unit(value: ()) -> bool { if let () = value { true } else { false } } pub fn collision(value: Option<u8>, ml_pattern_1: u8) -> u8 { if let Some(ml_pattern_1) = value { ml_pattern_1 } else { ml_pattern_1 } } pub fn scalar(value: u64) -> u64 { if let chosen = value { chosen } else { 0 } }';
  const {apis}=await compile(source);
  for(const api of apis){assert.equal(api.unicode('Ω'),true);assert.equal(api.unicode('ω'),false);assert.equal(api.unit(null),true);assert.equal(api.collision(some(8n),3n),8n);assert.equal(api.collision(none,3n),3n);assert.equal(api.scalar(18446744073709551615n),18446744073709551615n);}
  refuse('fn literal(value: u8) -> bool { if let 256 = value { true } else { false } }');
});

test('statement if-let keeps early return and loop break/continue in the surrounding function',async()=>{
  const source='pub fn early(value: Option<u8>) -> u8 { if let Some(v) = value { return v; } 11 } pub fn loops(value: Option<u8>) -> u8 { let mut n: u8 = 0; while n < 4 { n += 1; if let Some(2) = value { continue; } if let None = value { break; } } n }';
  const {apis,runtime}=await compile(source);
  assert.ok(runtime.includes('continue;'));assert.ok(runtime.includes('break;'));
  for(const api of apis){assert.equal(api.early(some(3n)),3n);assert.equal(api.early(none),11n);assert.equal(api.loops(some(2n)),4n);assert.equal(api.loops(some(3n)),4n);assert.equal(api.loops(none),1n);}
  refuse('fn exits(value: Option<u8>) -> u8 { let n: u8 = if let Some(v) = value { return v; } else { 1 }; n }');
  refuse('fn exits(value: Option<u8>) -> u8 { if let Some(_) = value { break; } 1 }');
});

test('nested variants test owners before field projections and preserve literal conditions',async()=>{
  const {apis,program}=await compile('pub fn nested(value: Option<Option<u8>>) -> u8 { if let Some(Some(v)) = value { v } else { 12 } } pub fn exact(value: Option<u64>) -> bool { if let Some(18446744073709551615u64) = value { true } else { false } } pub fn result(value: Result<u8, bool>) -> u8 { if let Ok(v) = value { v } else { 99 } } pub fn boolean(value: bool) -> u8 { if let true = value { 1 } else { 2 } }');
  const plan=program.declarations.get('nested').body.patternControl.plan;
  assert.equal(plan.test.kind,'and');assert.deepEqual(plan.test.tests.map(test=>test.projection),[[],['field0']]);
  assert.deepEqual(plan.bindings[0].projection,['field0','field0']);
  for(const api of apis){assert.equal(api.nested(none),12n);assert.equal(api.nested(some(none)),12n);assert.equal(api.nested(some(some(9n))),9n);assert.equal(api.exact(some(18446744073709551615n)),true);assert.equal(api.exact(some(18446744073709551614n)),false);assert.equal(api.exact(none),false);assert.equal(api.result(tagged('Ok',{field0:8n})),8n);assert.equal(api.result(tagged('Err',{field0:true})),99n);assert.equal(api.boolean(true),1n);assert.equal(api.boolean(false),2n);}
});

test('actual local constructor owners and aliases survive same-named prelude variants',async()=>{
  const source='enum Shadow { Some(u8), None } use crate::Shadow::Some as Actual; pub fn local(value: Shadow) -> u8 { if let Actual(v) = value { v } else { 8 } } pub fn qualified(value: Shadow) -> bool { if let Shadow::None = value { true } else { false } }';
  const {apis}=await compile(source);
  for(const api of apis){assert.equal(api.local(tagged('Some',{field0:6n})),6n);assert.equal(api.local(tagged('None')),8n);assert.equal(api.qualified(tagged('None')),true);assert.equal(api.qualified(tagged('Some',{field0:1n})),false);}
  refuse('enum Shadow { Some(u8), None } fn wrong(value: Shadow) -> u8 { if let Some(v) = value { v } else { 0 } }');
  refuse('enum Wrong { Some(u8) } fn wrong(value: Option<u8>) -> u8 { if let Wrong::Some(v) = value { v } else { 0 } }');
  refuse('mod foo { pub fn Some(v: u8) -> u8 { v } } fn wrong(value: Option<u8>) -> u8 { if let foo::Some(v) = value { v } else { 0 } }');
});

test('record, tuple-struct and consistent or-patterns bind only checked scalar fields',async()=>{
  const source='struct Record { amount: u8, enabled: bool } struct Pair(u8, bool); enum Choice { A(u8), B(u8), Empty } pub fn record(value: Record) -> u8 { if let Record { amount: count, enabled: true } = value { count } else { 0 } } pub fn pair(value: Pair) -> u8 { if let Pair(count, true) = value { count } else { 0 } } pub fn choice(value: Choice) -> u8 { if let Choice::A(v) | Choice::B(v) = value { v } else { 0 } }';
  const {apis}=await compile(source);
  for(const api of apis){assert.equal(api.record(tagged('Record',{amount:5n,enabled:true})),5n);assert.equal(api.record(tagged('Record',{amount:5n,enabled:false})),0n);assert.equal(api.pair(tagged('Pair',{field0:4n,field1:true})),4n);assert.equal(api.choice(tagged('A',{field0:2n})),2n);assert.equal(api.choice(tagged('B',{field0:3n})),3n);assert.equal(api.choice(tagged('Empty')),0n);}
  refuse('enum Choice { A(u8), B(u8) } fn wrong(value: Choice) -> u8 { if let Choice::A(a) | Choice::B(b) = value { a } else { 0 } }');
  refuse('struct Pair(u8,bool); fn wrong(value: Pair) -> u8 { if let (v, _) = value { v } else { 0 } }');
});

test('matched receiver is evaluated exactly once under an explicit synthetic external contract',async()=>{
  // This counter is fixture instrumentation, never a replacement Router body.
  const preparsed=check('fn shape(value: Option<u8>) -> Option<u8> { value }'),option=preparsed.declarations.get('shape').ret;
  const externals=[{k:'fn',name:'fixture_read',params:[{name:'value',type:option}],ret:option}];
  const fixture='let fixture_reads = 0; function fixture_read(value) { fixture_reads += 1; return value; } function fixture_count() { return fixture_reads; }';
  const {apis,program}=await compile('pub fn once(value: Option<u8>) -> u8 { if let Some(v) = fixture_read(value) { v } else { 0 } }',{externals,fixture});
  assert.equal(program.declarations.get('once').body.value.k,'call');
  assert.equal(program.declarations.get('once').body.value.fn,'fixture_read');
  for(const api of apis){assert.equal(api.once(some(4n)),4n);assert.equal(api.fixture_count(),1);assert.equal(api.once(none),0n);assert.equal(api.fixture_count(),2);}
});

test('aggregate moves, aliases, references, generic patterns and guards remain explicit refusals',()=>{
  for(const source of [
    'fn aggregate(value: Option<Option<u8>>) -> u8 { if let Some(v) = value { 0 } else { 1 } }',
    'fn aggregate(value: Option<Vec<u8>>) -> u8 { if let Some(v) = value { 0 } else { 1 } }',
    'fn conversion(value: &str) -> u8 { let owned: String = value.to_string(); if let text = owned { 0 } else { 1 } }',
    'fn annotated(value: Option<&str>) -> u8 { let owned: Option<String> = value; if let Some(text) = owned { 0 } else { 1 } }',
    'fn owned(value: Option<String>) -> u8 { if let Some(v) = value { 0 } else { 1 } }',
    'struct OwnedText(String); fn owned(value: OwnedText) -> u8 { if let OwnedText(v) = value { 0 } else { 1 } }',
    'fn reference(value: Option<&u8>) -> u8 { if let Some(v) = value { 0 } else { 1 } }',
    'fn boxed(value: Option<Box<u8>>) -> u8 { if let Some(v) = value { v } else { 1 } }',
    'struct Owned(Box<u8>); fn boxed(value: Owned) -> u8 { if let Owned(v) = value { v } else { 1 } }',
    'fn alias(value: Option<u8>) -> u8 { if let all @ Some(v) = value { v } else { 0 } }',
    'fn reference(value: Option<u8>) -> u8 { if let Some(ref v) = value { 0 } else { 1 } }',
    'fn mutable(value: Option<u8>) -> u8 { if let Some(mut v) = value { v } else { 0 } }',
    'fn reference(value: Option<u8>) -> u8 { if let &Some(v) = value { v } else { 0 } }',
    'fn generic(value: Option<u8>) -> u8 { if let Some::<u8>(v) = value { v } else { 0 } }',
    'fn chain(value: Option<u8>) -> u8 { if let Some(v) = value && v > 0 { v } else { 0 } }',
    'fn chain(value: Option<u8>) -> u8 { if let Some(v) = value && let Some(w) = value { v } else { 0 } }',
  ])refuse(source);
});

test('original upstream-path function translates unchanged through the independent pattern pipeline',async()=>{
  const source=readFileSync(new URL('../../../src/proxy/upstream_path.rs',import.meta.url),'utf8');
  assert.equal(hash(source),'bd1cf836b23868fdc92750d17c0548c8318930314eef81196fd9768d46ccb898');
  const item=sourceItems(source).find(item=>item.name==='resolve_upstream_path');
  assert.equal(item.start,687);assert.equal(item.end,1472);
  const original=source.slice(item.start,item.end);
  assert.equal(hash(original),'f6e0b6a8d1b6a82416241b45b855013c192e8c394fb07eb3306b4a288e18eaa7');
  assert.match(original,/^#\[must_use\]/u);
  const {apis,program}=await compile(original);
  assert.deepEqual([...program.declarations.values()].filter(entry=>entry.k==='fn').map(entry=>entry.name),['resolve_upstream_path']);
  // Literal expected outcomes follow strip_prefix, including its lack of a
  // slash-boundary condition. No Rust execution or full project parity claim.
  for(const api of apis)for(const [path,expected] of [['/api/services/anthropic/v1/messages','/v1/messages'],['/api/services/bedrock/invoke','/invoke'],['/api/services/vertex/model:rawPredict','/model:rawPredict'],['/api/anthropic/v1/messages','/v1/messages'],['/api/latest/anthropic/v1/messages','/v1/messages'],['/v1/messages','/v1/messages'],['/api/anthropicx','x'],['/api/services/anthropic',''],['','']])assert.equal(api.resolve_upstream_path(path),expected);
});
