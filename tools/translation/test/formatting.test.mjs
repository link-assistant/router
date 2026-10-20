import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateSource,sha256} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {currentCoreReceivingFiles as currentCoreFiles,currentCoreOptions,assertCurrentCoreReceivingRefusals as assertCurrentCoreRefusals} from './current-core-text-fixture.mjs';
async function source(source,verify) {
  const result=translateSource(source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  assert.equal(result.ir.counts.carried,0,JSON.stringify(result.ir.items.filter(item=>item.status==='carried').map(item=>item.diagnostic)));
  await verifyTypedTargets(result,verify);
}

test('format positional counters, repeated arguments, named arguments and literal braces retain Rust semantics',async()=>{
  await source('pub fn counters(a:u8,b:u8)->String{format!("{1} {} {0} {}",a,b)} pub fn repeat(a:u64)->String{format!("{0}-{0}",a)} pub fn names(a:u8)->String{format!("{label}: {a} {}",true,label="Ω")} pub fn escaped()->String{format!("{{}} {{{0}}}","x")} pub fn named_position()->String{format!("{0}",name=7)}',api=>{
    assert.equal(api.counters(1n,2n),'2 1 1 2');assert.equal(api.repeat(18446744073709551615n),'18446744073709551615-18446744073709551615');
    assert.equal(api.names(9n),'Ω: 9 true');assert.equal(api.escaped(),'{} {x}');assert.equal(api.named_position(),'7');
  });
});

test('fixed integer decimal and radix format options preserve exact signs, padding and two complement digits',async()=>{
  await source('pub fn signed(v:i8)->String{format!("{v:+05}|{v:04x}|{v:#06X}|{v:04b}|{v:04o}")} pub fn wide(v:u128)->String{format!("{v:#x}|{v:040}")} pub fn spaces(v:i16)->String{format!("{v:5}")}',api=>{
    assert.equal(api.signed(-5n),'-0005|00fb|0x00FB|11111011|0373');assert.equal(api.signed(5n),'+0005|0005|0x0005|0101|0005');
    assert.equal(api.wide(340282366920938463463374607431768211455n),'0xffffffffffffffffffffffffffffffff|0340282366920938463463374607431768211455');
    assert.equal(api.spaces(-5n),'   -5');assert.throws(()=>api.signed(-129n),RangeError);
  });
});

test('string formatting counts Unicode scalars for padding, precision and single scalar fill',async()=>{
  await source('pub fn format(value:&str)->String{format!("{value:<5}|{value:🧱^6.2}|{value:0>4.1}|{value:.0}")}',api=>{
    assert.equal(api.format('😀Ωz'),'😀Ωz  |🧱🧱😀Ω🧱🧱|000😀|');
    assert.equal(api.format('x'),'x    |🧱🧱x🧱🧱🧱|000x|');
  });
});

test('format arguments evaluate once in written order before positional reordering',async()=>{
  // Distinct panics establish argument evaluation order without authoring a
  // replacement Router function or assuming formatting placeholders run calls.
  await source('fn first()->u8{panic!("first argument")} fn second()->u8{panic!("second argument")} pub fn run()->String{format!("{1}{0}{0}",first(),second())}',api=>assert.throws(()=>api.run(),{message:'first argument'}));
  const original='fn value(v:u8)->u8{v} pub fn repeat(v:u8)->String{format!("{0}{0}",value(v))}',result=translateSource(original);
  const checked=result.ir.items.find(item=>item.name==='repeat').semantic.checkedIR;
  assert.equal(checked.body.k,'routerConstObligation');assert.equal(checked.body.constEligible,false);
  const body=checked.body.value;assert.equal(body.k,'let');assert.equal(body.value.k,'call');
  assert.equal(body.formatProvenance.explicitArgumentCount,1);assert.ok(Number.isInteger(body.formatProvenance.sourceTemplateSpan.start));
  const {sourceMacroSpan,sourceTemplateSpan}=body.formatProvenance;
  assert.equal(original.slice(sourceMacroSpan.start,sourceMacroSpan.end),'format!("{0}{0}",value(v))');
  assert.equal(original.slice(sourceTemplateSpan.start,sourceTemplateSpan.end),'"{0}{0}"');
  assert.equal(body.body.left.arg.name,body.body.right.arg.name);
  await verifyTypedTargets(result,api=>assert.equal(api.repeat(3n),'33'));
});

test('captured lexical parameters take precedence over an imported source function alias',async()=>{
  const files={'src/lib.rs':'mod config; use crate::config::label as value; pub fn print(value:u8)->String{format!("{value}")} pub fn module_value()->String{format!("{}",value())}','src/config.rs':'pub fn label()->u8{7}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.print(3n),'3');assert.equal(api.module_value(),'7');});
  const invalid={'src/lib.rs':'mod config; use crate::config::LABEL as value; pub fn print(value:u8)->String{format!("{value}")}','src/config.rs':'pub const LABEL:u8=7;'};
  const refused=translateProject({entry:'src/lib.rs',paths:Object.keys(invalid),readSource:path=>invalid[path]});
  assert.equal(refused.meta.executable.some(entry=>entry.name==='print'),false);
  assert.match(refused.meta.refused.find(entry=>entry.name==='print').message,/source value alias\/local scope collision/);
});

test('unsupported formatting traits, source macros and malformed argument lists stay source-bearing refusals',()=>{
  for(const source of [
    'pub fn bad(v:f64)->String{format!("{v}")}',
    'pub fn bad(v:u8)->String{format!("{v:?}")}',
    'pub fn bad(v:u8)->String{format!("{v:>5}")}',
    'pub fn bad(v:u8)->String{format!("{v:2049}")}',
    'pub fn bad(v:u8)->String{format!("{v:999999999999999999999999}")}',
    'pub fn bad(v:u8)->String{format!("{v:.2}")}',
    'pub fn bad(v:u8)->String{format!("{v:width$}",width=4)}',
    'pub fn bad(v:u8)->String{format!("{v}",1)}',
    'pub fn bad()->String{format!("{1}",1)}',
    'pub fn bad()->String{format!("{v}",v=1,v=2)}',
    'pub fn bad()->String{format!("{v} {}",v=1,2)}',
    'pub fn bad()->String{format!("}")}',
    'pub fn bad(v:&str)->String{format!(v)}',
    'pub fn bad(v:&str)->String{format!({"{v}"})}',
    'pub fn bad()->String{format!(("text"))}',
    'pub const fn bad()->String{format!("text")}',
    'pub fn bad()->u8{let text=format!("x");if let s=text {0}else{1}}',
    'pub fn bad()->u8{if let s=format!("x"){0}else{1}}',
    'pub fn bad()->u8{let text=String::new();if let s=text {0}else{1}}',
    'pub fn bad()->u8{let text=String::from("x");if let s=text {0}else{1}}',
    'macro_rules! format{($($t:tt)*)=>{"custom"}} pub fn bad()->String{format!("text")}',
    'use custom::format; pub fn bad()->String{format!("text")}',
  ]){const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});

test('actual empty String construction retains owning provenance without removing its const capability',async()=>{
  const result=translateSource('pub const fn empty()->String{String::new()}');
  const entry=result.ir.items.find(item=>item.name==='empty');assert.equal(entry.status,'executable');
  assert.equal(entry.semantic.checkedIR.constFunction,true);assert.equal(entry.semantic.checkedIR.body.type.patternOwnershipRefusal,'owned String construction');
  await verifyTypedTargets(result,api=>assert.equal(api.empty(),''));
});

test('original humanize_minutes retains source spans, early returns and literal formatted i64 results in both targets',async()=>{
  const original=readFileSync(new URL('../../../rust/src/auth_import.rs',import.meta.url),'utf8');
  const item=sourceItems(original).find(item=>item.term==='fn'&&item.name==='humanize_minutes');
  assert.ok(item);const body=original.slice(item.start,item.end),result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>body});
  assert.deepEqual(result.meta.refused,[]);const executable=result.meta.executable.find(entry=>entry.name===item.name);
  assert.equal(sha256(body.slice(executable.span.start,executable.span.end)),sha256(body));
  await verifyTypedTargets(result,api=>{for(const [value,expected] of [[-1n,'-1 minutes'],[89n,'89 minutes'],[90n,'1 hours'],[2879n,'47 hours'],[2880n,'2 days'],[9223372036854775807n,'6405119470038038 days'],[-9223372036854775808n,'-9223372036854775808 minutes']])assert.equal(api[item.name](value),expected);});
});

test('actual accounts header translates through its source-bound formatting interface',async()=>{
  const original=readFileSync(new URL('../../../rust/src/accounts_cli.rs',import.meta.url),'utf8'),item=sourceItems(original).find(item=>item.name==='header');
  assert.ok(item);const body=original.slice(item.start,item.end),files=currentCoreFiles('src/accounts_cli.rs','header',body),result=translateProject(currentCoreOptions(files));
  assertCurrentCoreRefusals(result,'src/accounts_cli.rs','header',body);const executable=result.meta.executable.find(entry=>entry.name==='accounts_cli.header');
  assert.equal(executable.source,'src/accounts_cli.rs');assert.deepEqual(executable.span,{start:0,end:body.length});assert.equal(sha256(files['src/accounts_cli.rs'].slice(executable.span.start,executable.span.end)),sha256(body));
  await verifyTypedTargets(result,api=>assert.equal(api['accounts_cli.header'](),'name              healthy   credential    used    limit      remaining  home'));
});
