import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {translateSource} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {TextChecker} from '../extensions/text.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {SOURCE_F64} from '../extensions/primitive-float-contracts.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {loadJavaScript} from './artifact-loader.mjs';
import {originalSharedF64CopySource} from '../extensions/shared-f64-copy-source.mjs';
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const retain=(name,value)=>{const directory=process.env.ROUTER_PRIMITIVE_BORROW_VECTORS;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item instanceof Map?{$map:[...item]}:item)+'\n');}};
const find=(node,kind)=>{if(!node||typeof node!=='object')return null;if(node.k===kind)return node;for(const [key,child]of Object.entries(node)){if(key==='type')continue;for(const item of Array.isArray(child)?child:[child]){const result=find(item,kind);if(result)return result;}}return null;};
function refusals(rows,name){
 const observed=rows.map(source=>({source,result:translateSource(source,'src/lib.rs')}));retain(name,observed);
 for(const {source,result}of observed){const item=result.ir.items.find(item=>item.name==='bad');assert.ok(item,source);assert.equal(item.status,'carried',source);assert.match(item.diagnostic.message??item.diagnostic.reason,/reference|borrow|ownership|mutable aggregate/i,source);}
}

test('source primitive reference expressions cannot become by-value returns or inferred locals',{timeout:5000},()=>{
 const rows=[];
 for(const type of ['bool','u32','f64'])rows.push(`pub fn bad(value:${type})->${type}{&value}`,`pub fn bad(value:${type})->${type}{let borrowed=&value;borrowed}`,`pub fn bad(value:${type})->${type}{let borrowed=&value;let alias=borrowed;alias}`);
 rows.push('pub fn bad()->bool{let borrowed=&true;borrowed}','pub fn bad(value:u32)->bool{let borrowed=&(value>0);borrowed}','pub fn bad()->f64{let borrowed=&1.0;borrowed}','pub fn bad(value:f64)->f64{let borrowed=&value;let deeper=&borrowed;deeper}');
 refusals(rows,'01-return-and-inferred-local-refusals');
});

test('primitive assignments retain the exact original f64 borrow-erasure counterexample',{timeout:5000},()=>{
 const original='fn bad(value:f64)->f64{let mut local=value;local=&value;local}';
 refusals([original,...['bool','u32'].map(type=>`fn bad(value:${type})->${type}{let mut local=value;local=&value;local}`),...['bool','u32','f64'].map(type=>`fn bad(value:${type})->${type}{let borrowed=&value;let mut local=value;local=borrowed;local}`)],'02-assignment-refusals');
});

test('original primitive argument boundaries reject direct and inferred borrowed values',{timeout:5000},()=>{
 const rows=[];
 for(const type of ['bool','u32','f64'])rows.push(`fn consume(value:${type})->${type}{value}pub fn bad(value:${type})->${type}{consume(&value)}`,`fn consume(value:${type})->${type}{value}pub fn bad(value:${type})->${type}{let borrowed=&value;consume(borrowed)}`);
 refusals(rows,'03-argument-refusals');
});

test('checked primitive borrow syntax retains pointee identity and exact original ampersand coordinates',{timeout:5000},()=>{
 const source='fn original(value:f64){let borrowed=&value;}fn main(){}',surface=parseRust(source),node=find(surface,'routerTextReference');assert.ok(node);
 const domains=[{kind:'bool'},{kind:'bool',rustSourceType:true},{...rustFixedType('u32'),rustPrimitiveName:'u32',rustSourceType:true},SOURCE_F64],rows=[];
 for(const domain of domains){const value=new TextChecker('Rust',[]).expr(node,new Map([['value',domain]]),[]);assert.equal(value.type.rustReference.kind,'shared');assert.deepEqual(value.type.rustReference.pointee,domain);for(const [key,field]of Object.entries(domain))assert.deepEqual(value.type[key],field);assert.equal(Object.hasOwn(value.type,'rustSourceType'),Object.hasOwn(domain,'rustSourceType'));assert.notEqual(value.type.rustReference.pointee,domain);assert.deepEqual(value.type.rustReference.span,node.span);assert.equal(source.slice(value.type.rustReference.tokens[0].span.start,value.type.rustReference.tokens[0].span.end),'&');assert.equal(value.type.patternOwnershipRefusal,'explicit shared reference expression');rows.push({domain,node,value});}
 const portableDomain={kind:'bool'},portable=new TextChecker('JavaScript',[]).expr(node,new Map([['value',portableDomain]]),[]);assert.equal(Object.hasOwn(portable.type,'rustReference'),false);assert.equal(portable.type.patternOwnershipRefusal,'explicit shared reference expression');
 retain('04-primitive-reference-type-witnesses',{source,surface,rows,portableDomain,portable,bodyAdmissionClaim:false});
});

test('existing shared primitive reads depth and borrowed string slice contracts remain executable',{timeout:60000},async()=>{
 const source='pub fn fixed(value:&u32)->u32{*value}pub fn nested(value:&&u32)->u32{**value}pub fn boolean(value:&bool)->bool{*value}pub fn float_reference(value:&f64)->&f64{value}pub fn text(value:&str)->&str{value}pub fn bytes(value:&[u8])->&[u8]{value}pub fn copied_float(value:&f64)->f64{*value}';
 const result=compile(source);retain('05-established-shared-contracts',{source,result});assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,api=>{assert.equal(api.fixed(9n),9n);assert.equal(api.nested(11n),11n);assert.equal(api.boolean(true),true);for(const value of [-0,0,1.5,Infinity,-Infinity,NaN]){assert.ok(Object.is(api.float_reference(value),value));assert.ok(Object.is(api.copied_float(value),value));}for(const value of [null,undefined,1n,'1',new Number(1),{},true])assert.throws(()=>api.copied_float(value),TypeError);assert.equal(api.text('Ω😀'),'Ω😀');const bytes=Object.freeze([0n,255n]);assert.deepEqual(api.bytes(bytes),bytes);assert.throws(()=>api.fixed(4294967296n),RangeError);assert.throws(()=>api.boolean(1),TypeError);});
});

test('reference-depth mismatches mutable references and unproved float dereferences stay refused',{timeout:5000},async()=>{
 const rows=['fn bad(value:&f64)->f64{value}','fn bad(value:&&f64)->&f64{value}','fn bad(value:&bool)->bool{value}','fn bad(value:&&u32)->&u32{value}','fn bad(value:&mut f64)->f64{*value}'];
 refusals(rows,'06-depth-and-unproved-operation-refusals');
 // The former negative is now backed by the separate genuine primitive Copy
 // profile. Keep its exact original source and all real outcomes in this case.
 const provedSource='fn bad(value:&f64)->f64{*value}',proved=translateSource(provedSource,'src/lib.rs'),item=proved.ir.items.find(item=>item.name==='bad'),profile=originalSharedF64CopySource();assert.equal(item.status,'executable');assert.equal(proved.ir.items.map(item=>item.source).join(''),provedSource);const dereference=find(item.semantic.checkedIR,'routerPrimitiveDereference');assert.ok(dereference);assert.equal(dereference.dereferenceProof.kind,'shared-f64-copy');assert.deepEqual(JSON.parse(JSON.stringify(dereference.dereferenceProof.source)),JSON.parse(JSON.stringify(profile)));assert.equal(profile.primitiveSourceEvidence.source.sha256,'db5d413946a48f816af89e83f99741693d1aaf088633db60c8d372a555ff8809');
 const api=(await loadJavaScript(proved.javascript)).translated,observations=[],bits=value=>{const bytes=new DataView(new ArrayBuffer(8));bytes.setFloat64(0,value);return bytes.getBigUint64(0).toString(16).padStart(16,'0');};
 for(const value of [NaN,Infinity,-Infinity,-0,0,Number.MIN_VALUE,-Number.MIN_VALUE,Number.MAX_VALUE,-Number.MAX_VALUE,1.5,-2.5]){const actual=api.bad(value);assert.ok(Object.is(actual,value));observations.push({inputBinary64:bits(value),outputBinary64:bits(actual),same:true});}
 const refused=[];for(const value of [null,undefined,1n,'1',new Number(1),{},true]){let failure;assert.throws(()=>{try{return api.bad(value);}catch(error){failure={name:error.name,message:error.message};throw error;}},TypeError);refused.push({input:value,kind:value===null?'null':typeof value,boxed:value instanceof Number,failure});}
 retain('526-proved-original-f64-copy-subject',{provedSource,proved,profile,observations,refused});
 const original='pub fn original(value:f64)->f64{value}fn main(){}',surface=parseRust(original),entry=surface.items.find(item=>item.name==='original');entry.body={k:'routerTextReference',value:entry.body,sourceBorrowToken:{value:'&',span:{start:0,end:1}},span:entry.body.span};assert.throws(()=>checkProgram(surface),/changed|original|differs/);retain('06-stale-original-syntax',{original,surface});
});
