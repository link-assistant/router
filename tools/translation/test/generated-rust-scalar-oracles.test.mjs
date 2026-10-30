import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {rustTokens} from '../rust-structure.mjs';
import {scalarLiteral,discoverScalarRustAssertions} from './rust-scalar-assertions.mjs';
import {verifyTypedTargetsBatch} from './typed-targets-batch.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const signature=(name,params,ret)=>({name,semantic:{checkedIR:{params:params.map((kind,index)=>({name:'p'+index,type:{kind}})),ret:{kind:ret}}}});
const literal=(source,kind)=>scalarLiteral(rustTokens(source).filter(token=>token.type!=='comment'),{kind});
function f64Bits(value){const buffer=new ArrayBuffer(8),view=new DataView(buffer);view.setFloat64(0,value,false);return view.getBigUint64(0,false);}

test('original Rust literal data keeps integer and floating boundaries and Unicode without evaluating source',{timeout:60000},()=>{
 for(const [source,kind,want]of [['18446744073709551615_u64','int',18446744073709551615n],['-128_i8','int',-128n],['0xff_u16','int',255n],['-0.0_f64','float',-0],['1_000.25_f64','float',1000.25],['true','bool',true],['"Ω😀\\n"','string','Ω😀\n'],['r###"a\\n\"b"###','string','a\\n"b'],['"text".to_string()','string','text']])assert.ok(Object.is(literal(source,kind),want),source);
 for(const [source,kind]of [['effect()','int'],['1 + 2','int'],['f64::NAN','float'],['1.0_f32','float'],['true || effect()','bool'],['"\\u{1f600}"','string'],['"x".unknown()','string']])assert.throws(()=>literal(source,kind),/Original scalar assertion:/);
 assert.equal(f64Bits(-0),9223372036854775808n);assert.equal(f64Bits(0),0n);
});
test('discovery retains original source spans and excludes shadowed computed and panic-only assertions',{timeout:60000},()=>{
 const source='pub fn f(n:u8)->u8{n}\n#[cfg(test)]mod tests{use super::*;#[test]fn vectors(){assert_eq!(f(0),0);assert_eq!(super::f(255_u8),255_u8);assert_eq!(f(effect()),0);/* assert_eq!(f(42),42); */let text="assert_eq!(f(43),43)";}#[test]fn shadow(){let f=|x|x+1;assert_eq!(f(7),7);}#[test]#[should_panic]fn panic(){assert_eq!(f(4),0);}}',functions=new Map([['f',signature('f',['int'],'int')]]),result=discoverScalarRustAssertions(source,functions);
 assert.equal(result.assertions.length,2);assert.deepEqual(result.assertions.map(row=>[row.name,row.args,row.expected]),[['f',[0n],0n],['f',[255n],255n]]);assert.ok(result.excluded.length>=2);for(const row of result.assertions){assert.equal(source.slice(row.sourceSpan.start,row.sourceSpan.end),row.assertion);assert.equal(row.originalTest,'vectors');}assert.equal(result.sourceAuthority,false);assert.equal(result.runtimeAuthority,false);
});
test('top-level generated Rust tests retain exact to_bits observations and unknown child imports refuse',{timeout:60000},()=>{
 const source='pub fn f(n:f64)->f64{n}\n#[test]fn zero(){assert_eq!(f(-0.0_f64).to_bits(),(-0.0_f64).to_bits());}\n#[cfg(test)]mod tests{use super::*;use unknown::*;#[test]fn bad(){assert_eq!(f(1.0),1.0);}}#[cfg(test)]#[rustfmt::skip]mod shared_fixtures{use super::*;#[test]fn normal(){assert_eq!(f(2.0_f64),2.0_f64);}}',result=discoverScalarRustAssertions(source,new Map([['f',signature('f',['float'],'float')]]));assert.equal(result.assertions.length,2);assert.equal(result.assertions[0].observe,'f64-bits');assert.ok(Object.is(result.assertions[0].args[0],-0));assert.ok(Object.is(result.assertions[0].expected,-0));
});
test('all discovered original scalar unit assertions run against current generated JavaScript and independent strict TypeScript',{timeout:60000},async t=>{
 const inventory=JSON.parse(read('parity/rust-source-inventory.json')),results=[],census={modules:0,functions:0,assertions:0,excluded:0},seen=new Set();
 for(const row of inventory.sources){
  if(!row.source.startsWith('rust/src/')||/tests|test_support/u.test(row.source)||!row.executableFunctions)continue;
  const source=read(row.source),meta=JSON.parse(read(row.targets.meta));assert.equal(hash(source),row.sha256);assert.equal(meta.sourceSha256,row.sha256);assert.equal(meta.items.map(item=>item.source).join(''),source);const functions=new Map(meta.items.filter(item=>item.term==='fn'&&item.status==='executable').map(item=>[item.name,item])),plan=discoverScalarRustAssertions(source,functions);census.excluded+=plan.excluded.length;if(!plan.assertions.length)continue;
  for(const assertion of plan.assertions){assert.equal(source.slice(assertion.sourceSpan.start,assertion.sourceSpan.end),assertion.assertion);assert.ok(functions.has(assertion.name));seen.add(row.source+'::'+assertion.name);}
  results.push({javascript:read(row.targets.javascript),typescript:read(row.targets.typescript),meta:{entry:row.source,sourceSha256:row.sha256,assertions:plan.assertions}});census.modules++;census.assertions+=plan.assertions.length;
 }
 census.functions=seen.size;assert.ok(census.functions>=10,JSON.stringify(census));assert.ok(census.assertions>=20,JSON.stringify(census));let executed=0;
 await verifyTypedTargetsBatch(results,async(api,result,module)=>{assert.equal(module.provenance.sourceSha256,result.meta.sourceSha256);assert.equal(module.provenance.runtimeParity,false);for(const row of result.meta.assertions){assert.equal(typeof api[row.name],'function');const actual=await api[row.name](...row.args),message=result.meta.entry+'::'+row.originalTest+' '+row.assertion;if(row.observe==='f64-bits')assert.equal(f64Bits(actual),f64Bits(row.expected),message);else if(row.returns==='float')assert.ok(actual===row.expected,message);else assert.deepEqual(actual,row.expected,message);executed++;}},{childTimeoutMs:20000});
 assert.equal(executed,census.assertions*2);t.diagnostic(JSON.stringify({...census,executed,targets:['actual JavaScript','independent strict TypeScript'],rustExecuted:false,runtimeParity:false}));
});
