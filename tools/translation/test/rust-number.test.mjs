import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeRustInteger,RUST_INTEGER_LITERAL_PROFILE} from '../extensions/rust-number.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {translateSource,sha256} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

test('Rust integer grammar decodes radices separators and suffixes exactly',()=>{
  assert.equal(RUST_INTEGER_LITERAL_PROFILE.rust,'1.89.0');
  const cases=[['0',0n,''],['0123',123n,''],['1___',1n,''],['9_999_999_999_999_i64',9999999999999n,'i64'],['0x_dead_beef_u64',3735928559n,'u64'],['0xff___',255n,''],['0xf32',3890n,''],['0xe1',225n,''],['0o_6_6_6_u32',438n,'u32'],['0b_1010__u8',10n,'u8'],['340282366920938463463374607431768211455u128',(1n<<128n)-1n,'u128']];
  for(const [raw,value,suffix] of cases){const decoded=decodeRustInteger(raw,{start:3,end:3+raw.length});assert.equal(decoded.value,value.toString(),raw);assert.equal(decoded.suffix,suffix);assert.equal(decoded.raw,raw);}
  for(const bits of [8,16,32,64,128])for(const [prefix,base] of [['0b',2],['0o',8],['0x',16]]){
    const value=(1n<<BigInt(bits))-1n,raw=prefix+value.toString(base)+'_u'+bits;
    assert.equal(decodeRustInteger(raw,{start:0,end:raw.length}).value,value.toString());
  }
});

test('malformed radix digits and unsupported float or suffix tokens refuse at their original spans',()=>{
  for(const raw of ['','_1','0x','0x___','0x_u8','0b102','0o89','0Xff','1foo','1f64','1.0','1e3','0b1f32','0x1p10'])assert.throws(()=>decodeRustInteger(raw,{start:7,end:7+raw.length}),error=>['syntax','unsupported'].includes(error.kind)&&error.span.start===7,raw);
});

test('numeric lexical normalization preserves source coordinates across Unicode and opaque literals',()=>{
  const source='/* 😀 0xff */ fn numbers()->u64{let x=0x_ff_u64;let s=r#"0o777"#;let c=\'Ω\';x+1___u64}';
  const tokens=tokenizeRust(source),numbers=tokens.filter(token=>token.kind==='number');
  assert.deepEqual(numbers.map(token=>[token.raw,token.value,token.suffix]),[['0x_ff_u64','255','u64'],['1___u64','1','u64']]);
  for(const token of tokens.filter(token=>['number','rustChar'].includes(token.kind)))assert.equal(source.slice(token.start,token.end),token.raw);
  assert.equal(tokens.find(token=>token.kind==='string').value,'0o777');assert.equal(tokens.find(token=>token.kind==='rustChar').value,'Ω');
  assert.deepEqual(tokenizeRust('0x1..0b11').slice(0,-1).map(token=>token.value),['1','..','3']);
});

test('integer token translation retains source identity bounds and exact values in both targets',async()=>{
  const source='pub fn hex()->u128{0xffff_ffff_ffff_ffff_ffff_ffff_ffff_ffff_u128} pub fn octal()->u32{0o_6_6_6_u32} pub fn binary()->u8{0b_1010__u8} pub fn separated()->i64{9_999_999_999_999_i64} pub fn minimum()->i8{-0x80_i8} pub fn pointer()->usize{0xffff_ffff_ffff_ffff_usize} pub fn inferred()->u16{0xff_ff} pub fn pattern(v:u8)->bool{match v{0b0_1u8 | 0xFF_u8=>true,_=>false}}';
  const result=translateSource(source);assert.equal(result.ir.counts.carried,0,JSON.stringify(result.ir.items.filter(item=>item.status==='carried')));assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  await verifyTypedTargets(result,api=>{assert.equal(api.hex(),(1n<<128n)-1n);assert.equal(api.octal(),438n);assert.equal(api.binary(),10n);assert.equal(api.separated(),9999999999999n);assert.equal(api.minimum(),-128n);assert.equal(api.pointer(),(1n<<64n)-1n);assert.equal(api.inferred(),65535n);for(const [value,expected] of [[0n,false],[1n,true],[17n,false],[255n,true]])assert.equal(api.pattern(value),expected);});
  for(const source of ['pub fn bad()->u8{0x100u8}','pub fn bad()->i8{0x80i8}','pub fn bad()->i8{-0x81i8}','pub fn bad()->u16{0xffu8}','pub fn bad()->usize{0x1u64}','pub fn bad()->u8{0b102}','pub fn bad()->u8{0o89}','pub fn bad()->f64{1.0}']){const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});

test('original octal permission constant translates through source meta and both target generators',async()=>{
  const path='src/unix_listener.rs',original=readFileSync(new URL('../../../'+path,import.meta.url),'utf8'),item=sourceItems(original).find(item=>item.term==='const'&&item.name==='WIDEST_MODE');
  assert.equal(sha256(original),'f2697b44c95c5f9a7aab7d2fc55a03c80360da08b1f987a4caaf4d47fe0441b5');assert.deepEqual([item.start,item.end],[2490,2521]);
  const source=original.slice(item.start,item.end);assert.equal(sha256(source),'42122c491fa4c6c5019c5b342cd822fd2be51c6181b79e33455f0045cdbcf593');assert.equal(source,'const WIDEST_MODE: u32 = 0o666;');
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs',path],readSource:name=>name==='src/lib.rs'?'mod unix_listener;':source});
  assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.runtimeParity,false);
  const entry=result.meta.executable.find(entry=>entry.name==='unix_listener.WIDEST_MODE');assert.equal(entry.source,path);assert.deepEqual(entry.span,{start:0,end:source.length});
  await verifyTypedTargets(result,api=>assert.equal(api['unix_listener.WIDEST_MODE'],438n));
});
