import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {ControlChecker} from '../extensions/control.mjs';
import {SOURCE_F64,PRIMITIVE_FLOAT_PROFILE} from '../extensions/primitive-float-contracts.mjs';
import {parseProgram,serializeProgram,roundTripProgram} from '../semantic-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const binary64=value=>{const bytes=Buffer.alloc(8);bytes.writeDoubleBE(value);return {$binary64:bytes.toString('hex'),classification:Number.isNaN(value)?'NaN':value===Infinity?'+Infinity':value===-Infinity?'-Infinity':Object.is(value,-0)?'-0':'finite'};};
const retain=(name,value)=>{const directory=process.env.ROUTER_MUTABLE_F64_VECTOR_DIR;if(!directory)return;mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value,(_key,item)=>typeof item==='number'?binary64(item):typeof item==='bigint'?{$integer:item.toString()}:item instanceof Map?{$map:[...item]}:item)+'\n');};
const nodes=(node,kind,result=[])=>{if(!node||typeof node!=='object')return result;if(node.k===kind)result.push(node);for(const [key,child]of Object.entries(node))if(key!=='type')Array.isArray(child)?child.forEach(value=>nodes(value,kind,result)):nodes(child,kind,result);return result;};
const same=(actual,expected)=>assert.ok(Object.is(actual,expected),JSON.stringify({actual:binary64(actual),expected:binary64(expected)}));

test('genuine f64 mutable locals and parameters retain IEEE values through serialized meta and both targets',{timeout:60_000},async()=>{
 const source='pub fn local(input:f64)->f64{let mut value=input;value=input;value}pub fn parameter(mut input:f64,other:f64)->f64{input=other;input}pub fn arithmetic(input:f64)->f64{let mut value=input;value+=0.5;value*=2.0;value-=1.0;value/=2.0;value}',result=compile(source),values=[NaN,-0,0,Infinity,-Infinity,Number.MIN_VALUE,-Number.MIN_VALUE,Number.MAX_VALUE,-Number.MAX_VALUE,1.5,-2.5],observations=[];
 retain('01-genuine-f64-source',{source,result,values,profile:PRIMITIVE_FLOAT_PROFILE});assert.deepEqual(result.meta.refused,[]);
 const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));for(const entry of program.items.filter(item=>item.k==='fn'))for(const assignment of nodes(entry.body,'routerSet')){assert.equal(assignment.target.type.kind,'float');assert.equal(assignment.target.type.rustPrimitiveName,'f64');assert.equal(assignment.target.type.rustSourceType,true);assert.equal(assignment.value.type.rustPrimitiveName,'f64');}
 const text=serializeProgram(program);assert.equal(serializeProgram(parseProgram(text)),text);const originalChecked=checkProgram(parseRust(source+' fn main(){}'));assert.equal(serializeProgram(roundTripProgram(originalChecked)),serializeProgram(originalChecked));
 await verifyTypedTargets(result,api=>{const rows=[];for(const input of values){const local=api.local(input),parameter=api.parameter(17,input);same(local,input);same(parameter,input);rows.push({input,local,parameter});}for(const [input,wanted]of [[0,0],[1.5,1.5],[-2.5,-2.5],[Infinity,Infinity],[-Infinity,-Infinity],[NaN,NaN]]){const actual=api.arithmetic(input);same(actual,wanted);rows.push({input,arithmetic:actual});}observations.push(rows);},{childTimeoutMs:20_000});
 retain('01-lossless-target-observations',observations);assert.equal(binary64(-0).$binary64,'8000000000000000');assert.equal(binary64(Infinity).$binary64,'7ff0000000000000');assert.notEqual(binary64(NaN).classification,'finite');
});

test('complete unchanged original policy parent and helper bodies execute retry_backoff IEEE boundaries',{timeout:60_000},async()=>{
 const paths=['src/generated_js_first/mod.rs','src/generated_js_first/policy.rs'],sources=Object.fromEntries(paths.map(path=>{const url=new URL(path,root);assert.ok(statSync(url).size<1024*1024);return [path,readFileSync(url,'utf8')];}));assert.equal(hash(sources[paths[1]]),'c5d5cec07bf54be29de7beed707263256afa6ba1ee87c89695b237d5626f5673');
 const item=sourceItems(sources[paths[1]]).find(item=>item.name==='retry_backoff'&&item.term==='fn');assert.deepEqual([item.start,item.end],[2663,3017]);assert.equal(hash(sources[paths[1]].slice(2680,3017)),'9b2e4c622cdf430a03fc46ebe8554b0fdb6419ae7c12084a8dd64d2bbc778d2a');
 const result=translateProject({entry:paths[0],paths,readSource:path=>sources[path],compilationProfile:PRODUCTION_PROFILE}),cases=[
  [0,10,100,10],[1,10,100,20],[2,10,100,40],[3,10,100,80],[4,10,100,100],[4.9,10,100,100],[-3,10,100,10],[NaN,10,100,10],[-Infinity,10,100,10],
  [3,NaN,100,NaN],[3,10,NaN,NaN],[0,-0,100,-0],[3,-0,100,-0],[0,0,-0,-0],[0,-0,0,-0],[1,-1,100,-2],[2,-1,100,-4],
  [Infinity,1,8,8],[Infinity,1,Infinity,Infinity],[1,Infinity,100,100],[2,-Infinity,100,-Infinity],[2,1,-Infinity,-Infinity],[0,Number.MIN_VALUE,1,Number.MIN_VALUE],[1,Number.MIN_VALUE,1,Number.MIN_VALUE*2],
 ],observations=[];
 const unexecutedDivergence=[{args:[Infinity,0,1],reason:'remaining stays Infinity and doubling zero never reaches maximum'},{args:[Infinity,-1,1],reason:'remaining stays Infinity and negative delay never reaches positive maximum'},{args:[18014398509481984,0,1],reason:'remaining minus one rounds back to the same binary64 value at 2^54 and delay remains zero'}];
 retain('02-complete-original-project',{sources,item,result,cases,unexecutedDivergence,divergenceRuntimeObserved:false,scope:'complete actual policy module context; full-library admission remains a separate verification'});
 for(const name of ['policy.js_min','policy.js_max','policy.retry_backoff'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));for(const row of result.meta.sources)assert.equal(row.sha256,hash(sources[row.source]));
 const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),entry=program.declarations.get('policy.retry_backoff');assert.equal(nodes(entry.body,'routerWhile').length,1);assert.equal(nodes(entry.body,'routerSet').length,2);assert.match(result.javascript,/while\s*\(/u);assert.equal(result.meta.runtimeParity,false);
 await verifyTypedTargets(result,api=>{const rows=[];for(const [failures,base,maximum,wanted]of cases){const actual=api['policy.retry_backoff'](failures,base,maximum);same(actual,wanted);rows.push({failures,base,maximum,actual,wanted});}observations.push(rows);},{childTimeoutMs:20_000});retain('02-lossless-original-target-observations',{observations,unexecutedDivergence,divergenceRuntimeObserved:false});
});

test('finite scalar loops preserve assignment order continue break and lexical shadows',{timeout:60_000},async()=>{
 const source='pub fn order(start:f64)->f64{let mut value=start;let mut encoded=0.0;while value<4.0{encoded=encoded*10.0+value;value+=1.0;}encoded}pub fn count(mut left:f64)->f64{let mut count=0.0;while left>0.0{left-=1.0;if left>2.0{continue;}count+=1.0;}count}pub fn shadow(mut value:f64)->f64{let extra={let mut value=8.0;value-=1.0;value};value+=extra;value}',result=compile(source),observations=[];retain('03-control-source',{source,result});assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,api=>{const rows=[];for(const [start,wanted]of [[0,123],[1,123],[2,23],[3,3],[4,0],[NaN,0],[Infinity,0]]){const actual=api.order(start);same(actual,wanted);rows.push({start,actual,wanted});}same(api.count(5),3);same(api.count(2),2);same(api.count(0),0);same(api.shadow(2),9);same(api.shadow(-7),0);observations.push(rows);},{childTimeoutMs:20_000});retain('03-finite-control-observations',observations);
});

test('existing effect guards execute once in source order and stop before further calls',{timeout:60_000},async()=>{
 const source='pub fn guarded(enabled:bool)->f64{let mut value=0.0;while enabled&&std::env::var("STEP").is_ok(){value+=1.0;if value==3.0{break;}}value}',result=compile(source),observations=[];retain('04-effect-source',{source,result});assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,(api,_result,_module,{effects})=>{for(const [enabled,available,wanted,expectedCalls]of [[false,10,0,0],[true,0,0,1],[true,2,2,3],[true,10,3,3]]){const calls=[],environment={get(key){calls.push(key);return calls.length<=available?'present':undefined;}};const actual=effects.withEffectCapabilities({environment},()=>api.guarded(enabled));same(actual,wanted);assert.deepEqual(calls,Array(expectedCalls).fill('STEP'));observations.push({enabled,available,wanted,actual,calls});}},{childTimeoutMs:20_000});retain('04-effect-order-and-once-observations',observations);
});

test('reference aggregate f32 and unresolved alias states remain carried',()=>{
 const sources=['fn bad(value:&f64)->&f64{let mut local=value;local}','fn bad(mut value:&f64)->f64{0.0}','fn bad(value:&mut f64)->f64{*value}','fn bad(value:f32)->f32{let mut local=value;local}','struct Float{value:f64}fn bad(value:Float)->Float{let mut local=value;local}','fn bad(value:Vec<f64>)->Vec<f64>{let mut local=value;local}','type Real=f64;fn bad(value:Real)->Real{let mut local=value;local}','struct f64{value:u8}fn bad(value:f64)->f64{let mut local=value;local}','mod local{pub struct Float{value:u8}}use local::Float as f64;fn bad(value:f64)->f64{let mut local=value;local}','const bad:f64={let mut value=1.0;value+=1.0;value};'];
 const rows=sources.map(source=>{const result=translateSource(source,'src/lib.rs');assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);return {source,result};});retain('05-source-type-refusals',rows);
});

test('portable and unproved float descriptions gain no scalar-state admission',()=>{
 const span={start:0,end:1},types=[{kind:'float'},{...SOURCE_F64,rustSourceType:false},{...SOURCE_F64,rustPrimitiveName:'f32'},{...SOURCE_F64,rustReference:{kind:'shared',pointee:SOURCE_F64}},{...SOURCE_F64,rustOwnership:{kind:'owned',source:'custom'}},{...SOURCE_F64,patternOwnershipRefusal:'shared source reference'},{...SOURCE_F64,rustGenericIdentityUnresolved:true},{...SOURCE_F64,rustBorrowingUnresolved:true},{...SOURCE_F64,rustBorrowLifetime:{kind:'unproved'}}],rows=[];
 for(const type of types){const surface={language:'Rust',items:[{k:'fn',name:'bad',params:[{name:'input',type,span}],ret:type,body:{k:'let',name:'local',mutable:true,value:{k:'name',path:['input'],span},body:{k:'name',path:['local'],span},span},span}]};assert.throws(()=>new ControlChecker('Rust',[]).program(surface),/mutable aggregate/);rows.push({type,surface});}retain('06-unproved-portable-float-refusals',rows);
});

test('immutable assignments scope escapes and stale original source still refuse',()=>{
 const sources=['fn bad(value:f64)->f64{let local=value;local=1.0;local}','fn bad(value:f64)->f64{missing=value;value}','fn bad(value:f64)->f64{{let mut inner=value;inner+=1.0;}inner}','fn bad(value:f64)->f64{let mut local=value;local=&value;local}'],rows=sources.map(source=>{const result=translateSource(source,'src/lib.rs');assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);return {source,result};});retain('07-assignment-scope-refusals',rows);
 const source='fn actual(value:f64)->f64{let mut local=value;local+=1.0;local}',surface=parseRust(source+' fn main(){}'),entry=surface.items.find(item=>item.name==='actual');entry.params[0].type={...entry.params[0].type,rustPrimitiveName:'f32'};assert.throws(()=>checkProgram(surface),/changed|differs/);retain('07-stale-original-source',{source,surface});
});
