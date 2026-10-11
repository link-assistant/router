import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function artifacts(result,operation){
  assert.deepEqual(result.meta.refused,[]);
  const directory=mkdtempSync(join(tmpdir(),'router-primitive-meta-'));
  try {writeRuntimeAssets(directory);const js=join(directory,'src/fixture.mjs'),ts=join(directory,'src/fixture.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{encoding:'utf8'});
    try {execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'compiled'),ts],{encoding:'utf8'});}catch(error){throw new Error('strict compiled artifact failed: '+error.stdout+error.stderr,{cause:error});}
    for(const path of [js,join(directory,'compiled/fixture.js')])operation((await import(pathToFileURL(path).href)).translated);
  }finally{rmSync(directory,{recursive:true,force:true});}
}
const none=Object.freeze({$:'None'}),some=value=>Object.freeze({$:'Some',field0:value});
const error=kind=>({$:'Err',field0:{$:'ParseIntError',kind:{$:kind}}});

test('fixed parse and checked standard callbacks execute in unchanged JavaScript and strict compiled TypeScript', {timeout:30_000}, async()=>{
  const result=project('pub fn parse(source:&str)->Result<u64,std::num::ParseIntError>{source.parse::<u64>()} pub fn signed(source:&str)->Result<i8,std::num::ParseIntError>{source.parse::<i8>()} pub fn inferred(source:&str)->Result<u16,std::num::ParseIntError>{source.parse()} pub fn ok(source:&str)->Option<u64>{source.parse::<u64>().ok()} pub fn map(value:Option<u8>)->Option<u16>{value.map(|v|v as u16)} pub fn lazy(flag:bool)->Option<u8>{flag.then(||panic!("called"))} pub fn kind(value:&std::num::ParseIntError)->&std::num::IntErrorKind{value.kind()}');
  await artifacts(result,api=>{
    for(const [input,expected] of [['23',{$:'Ok',field0:23n}],['+23',{$:'Ok',field0:23n}],['18446744073709551615',{$:'Ok',field0:18446744073709551615n}],['18446744073709551616',error('PosOverflow')],['-1',error('InvalidDigit')],['23x',error('InvalidDigit')],['',error('Empty')]])assert.deepEqual(api.parse(input),expected);
    assert.deepEqual(api.signed('-128'),{$:'Ok',field0:-128n});assert.deepEqual(api.signed('-129'),error('NegOverflow'));assert.deepEqual(api.inferred('65535'),{$:'Ok',field0:65535n});
    assert.deepEqual(api.ok('23'),some(23n));assert.deepEqual(api.ok('wrong'),none);assert.deepEqual(api.map(some(7n)),some(7n));assert.deepEqual(api.map(none),none);
    assert.deepEqual(api.lazy(false),none);assert.throws(()=>api.lazy(true),{message:'called'});assert.deepEqual(api.kind(error('PosOverflow').field0),{$:'PosOverflow'});
    assert.throws(()=>api.parse('\ud800'),TypeError);assert.throws(()=>api.map({$:'Some',field0:256n}),TypeError);
  });
});

test('associated integer parsing keeps actual trait scope, radix panic and constructor owners', {timeout:30_000}, async()=>{
  await artifacts(project('use std::str::FromStr; fn FromStr()->u8{1} pub fn decimal(source:&str)->Result<u8,std::num::ParseIntError>{u8::from_str(source)} pub fn radix(source:&str,base:u32)->Result<u8,std::num::ParseIntError>{u8::from_str_radix(source,base)}'),api=>{
    assert.deepEqual(api.decimal('255'),{$:'Ok',field0:255n});assert.deepEqual(api.radix('ff',16n),{$:'Ok',field0:255n});assert.deepEqual(api.radix('100',16n),error('PosOverflow'));assert.throws(()=>api.radix('1',1n),RangeError);
  });
  for(const source of [
    'pub fn invented(s:&str)->Result<u8,std::num::ParseIntError>{u8::from_str(s)}',
    'fn FromStr()->u8{1} pub fn invented(s:&str)->Result<u8,std::num::ParseIntError>{u8::from_str(s)}',
    'use custom::FromStr; pub fn invented(s:&str)->Result<u8,std::num::ParseIntError>{u8::from_str(s)}',
    'use std::str::FromStr; use custom::FromStr; pub fn invented(s:&str)->Result<u8,std::num::ParseIntError>{u8::from_str(s)}',
    'mod std{} use std::str::FromStr; pub fn invented(s:&str)->Result<u8,std::num::ParseIntError>{u8::from_str(s)}',
    'pub struct u8 {value:u8} pub fn invented(s:&str)->Result<u8,std::num::ParseIntError>{s.parse::<u8>()}',
    'pub enum Fake {None,Some(u8)} pub fn invented(value:Fake)->Option<u8>{value.map(|v|v)}',
    'pub enum Fake {Ok(u8),Err(u8)} pub fn invented(value:Fake)->Option<u8>{value.ok()}',
    'mod std {} pub fn invented(s:&str)->Option<u8>{s.parse::<u8>().ok()}',
    'pub fn invented(s:&str)->crate::std::num::ParseIntError{panic!("never")}',
    'pub fn invented()->u64{crate::std::time::Duration::from_secs(1).as_secs()}',
  ])assert.equal(project(source).meta.executable.some(entry=>entry.name==='invented'),false,source);
});

test('original timeout helpers retain Rust Unicode whitespace and exact u64 parsing behavior', {timeout:30_000}, async()=>{
  const provenance=JSON.parse(readFileSync(new URL('../fixtures/real-source-provenance.json',import.meta.url))),entry=provenance.entries.find(item=>item.id==='timeout-parser');
  const original=readFileSync(new URL('../../../'+entry.path,import.meta.url),'utf8');
  const result=project(entry.declarations.map(declaration=>original.slice(declaration.start,declaration.end)).join('\n'));
  await artifacts(result,api=>{
    const duration=secs=>({$:'Duration',secs,nanos:0n});
    for(const [input,expected] of [[none,some(duration(10n))],[some('0'),none],[some(' 3 '),some(duration(3n))],[some('\u00853'),some(duration(3n))],[some('\ufeff3'),some(duration(10n))],[some('18446744073709551615'),some(duration(18446744073709551615n))],[some('18446744073709551616'),some(duration(10n))],[some('-1'),some(duration(10n))]])assert.deepEqual(api.parse_timeout_secs(input,10n),expected);
    assert.deepEqual(api.parse_upstream_read_timeout(none),some(duration(120n)));assert.deepEqual(api.parse_timeout_secs(none,0n),none);
  });
});

test('original const limiter constructor retains derives and match body while saturation remains exact', {timeout:30_000}, async()=>{
  const original=readFileSync(new URL('../../../src/output_limit.rs',import.meta.url),'utf8'),items=sourceItems(original);
  const declarations=items.filter(item=>['CHARS_PER_TOKEN','OutputTokenLimiter'].includes(item.name)&&['const','struct'].includes(item.term)).map(item=>original.slice(item.start,item.end));
  const methods=extractImplDeclarations(original).implementations.find(entry=>entry.typePath.join('.')==='OutputTokenLimiter').methods.filter(method=>['new','enabled','stopped'].includes(method.name));
  declarations.push('impl OutputTokenLimiter {\n'+methods.map(method=>original.slice(method.span.start,method.span.end)).join('\n')+'\n}','pub fn create(limit:Option<u64>)->OutputTokenLimiter{OutputTokenLimiter::new(limit)} pub fn enabled(value:&OutputTokenLimiter)->bool{value.enabled()} pub fn stopped(value:&OutputTokenLimiter)->bool{value.stopped()}');
  const result=project(declarations.join('\n')),checked=new Map(result.meta.checkedSemanticProgram.program.declarations.$map);
  assert.deepEqual(checked.get('OutputTokenLimiter').deriveTraits,['Clone','Debug','Default']);assert.equal(checked.get('OutputTokenLimiter').ctors[0].ctorStyle,'named');assert.equal([...checked.values()].find(entry=>entry.impl?.method==='new').constFunction,true);
  await artifacts(result,api=>{
    for(const [limit,remaining] of [[none,none],[some(0n),some(0n)],[some(2n),some(8n)],[some((1n<<62n)-1n),some((1n<<64n)-4n)],[some(1n<<62n),some((1n<<64n)-1n)],[some((1n<<64n)-1n),some((1n<<64n)-1n)]]) {
      const value=api.create(limit);assert.deepEqual(value,{$:'OutputTokenLimiter',remaining,stopped:false});assert.equal(api.enabled(value),limit.$==='Some');assert.equal(api.stopped(value),false);
    }
  });
});

test('const legality and infallible primitive conversions require source capabilities',{timeout:30_000},async()=>{
  await artifacts(project('pub fn widen(value:u8)->u64{u64::from(value)} pub fn text(value:&str)->String{String::from(value)} pub const fn add(left:u8,right:u8)->u8{left.saturating_add(right)}'),api=>{assert.equal(api.widen(255n),255n);assert.equal(api.text('text'),'text');assert.equal(api.add(250n,9n),255n);});
  for(const source of [
    'pub const fn invented(value:&str)->String{String::from(value)}',
    'pub const fn invented(value:u8)->u16{u16::from(value)}',
    'pub const fn invented()->String{format!("text")}',
    'pub const fn invented(value:Option<u8>)->u8{value.unwrap_or(1)}',
    'pub const fn invented(value:&str)->&str{value.trim()}',
    'pub const fn invented(value:&str)->Option<u8>{value.parse::<u8>().ok()}',
    'pub const fn invented(flag:bool)->Option<u8>{flag.then(||1u8)}',
    'pub const fn invented(value:u8)->u8{value.min(1)}',
    'pub fn invented()->String{String::from(1u8)}',
    'pub fn invented(value:u16)->u8{u8::from(value)}',
    'pub fn invented(value:usize)->u64{u64::from(value)}',
    'pub fn invented(value:u32)->usize{usize::from(value)}',
  ])assert.equal(project(source).meta.executable.some(entry=>entry.name==='invented'),false,source);
});

test('String conversion preserves owning provenance in checked expression metadata',()=>{
  const checked=checkProgram(parseRust('pub fn owned()->String{String::from("x")} fn main(){}'));
  assert.ok(JSON.stringify(checked.declarations.get('owned').body).includes('owned String conversion'));
});
