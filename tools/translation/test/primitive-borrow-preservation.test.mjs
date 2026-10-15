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
 const source='pub fn fixed(value:&u32)->u32{*value}pub fn nested(value:&&u32)->u32{**value}pub fn boolean(value:&bool)->bool{*value}pub fn float_reference(value:&f64)->&f64{value}pub fn text(value:&str)->&str{value}pub fn bytes(value:&[u8])->&[u8]{value}';
 const result=compile(source);retain('05-established-shared-contracts',{source,result});assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,api=>{assert.equal(api.fixed(9n),9n);assert.equal(api.nested(11n),11n);assert.equal(api.boolean(true),true);for(const value of [-0,0,1.5,Infinity,-Infinity,NaN])assert.ok(Object.is(api.float_reference(value),value));assert.equal(api.text('Ω😀'),'Ω😀');const bytes=Object.freeze([0n,255n]);assert.deepEqual(api.bytes(bytes),bytes);assert.throws(()=>api.fixed(4294967296n),RangeError);assert.throws(()=>api.boolean(1),TypeError);});
});

test('reference-depth mismatches mutable references and unproved float dereferences stay refused',{timeout:5000},()=>{
 const rows=['fn bad(value:&f64)->f64{value}','fn bad(value:&&f64)->&f64{value}','fn bad(value:&bool)->bool{value}','fn bad(value:&&u32)->&u32{value}','fn bad(value:&mut f64)->f64{*value}','fn bad(value:&f64)->f64{*value}'];
 refusals(rows,'06-depth-and-unproved-operation-refusals');
 const original='pub fn original(value:f64)->f64{value}fn main(){}',surface=parseRust(original),entry=surface.items.find(item=>item.name==='original');entry.body={k:'routerTextReference',value:entry.body,sourceBorrowToken:{value:'&',span:{start:0,end:1}},span:entry.body.span};assert.throws(()=>checkProgram(surface),/changed|original|differs/);retain('06-stale-original-syntax',{original,surface});
});
