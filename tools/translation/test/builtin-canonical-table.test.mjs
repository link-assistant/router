import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Hash} from 'node:crypto';
import * as original from '../builtin-source-meta.mjs';
import {builtinCanonicalTableReady} from '../builtin-canonical-table-support.mjs';
import {prepareBuiltinCanonicalTable} from '../prepare-builtin-canonical-table.mjs';
const subjectURL=new URL('../builtin-source-meta-canonical-candidate.mjs',import.meta.url),json=JSON.stringify,get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
function once(source,before,after){assert.equal(source.split(before).length,2,before);return source.replace(before,()=>after);}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message,metadataBytes:error.metadataBytes,metadataCells:error.metadataCells}};}}
async function fixture(t,{coldSupport=false}={}){
 const folder=mkdtempSync(join(tmpdir(),'router-canonical-table-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const actual=readFileSync(subjectURL,'utf8'),anchor='  if((canonical===null?encodeBuiltinSourceMeta(result):canonical)!==text)',replacement='  receiving[canonical===null?\'fallback\':\'selected\']++;\n'+anchor;let source=once(actual,anchor,replacement);assert.equal(once(source,replacement,anchor),actual);
 let guardURL=new URL('../builtin-canonical-table-support.mjs',import.meta.url);if(coldSupport){const copied=readFileSync(guardURL,'utf8').replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/g,(_whole,prefix,quote,path)=>prefix+quote+new URL(path,guardURL).href+quote),target=join(folder,'cold-support.mjs');writeFileSync(target,copied);guardURL=pathToFileURL(target);}
 source=source.replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/g,(_whole,prefix,quote,path)=>prefix+quote+(path==='./builtin-canonical-table-support.mjs'?guardURL.href:new URL(path,subjectURL).href)+quote);source+='\nconst receiving={selected:0,fallback:0};export function facts(){return {...receiving};}\n';const path=join(folder,'receiving.mjs');writeFileSync(path,source);assert.equal(readFileSync(path,'utf8'),source);return {api:await import(pathToFileURL(path).href),guard:await import(guardURL.href),actual,source};
}
function snapshot(value){if(typeof value==='function')return {function:value.name,arity:value.length};return {type:typeof value,json:json(value)};}
function observe(api,wire,owner,key,mutate){
 const field=get(owner,key),tape=[];let result;try{define(owner,key,{...field,value:function(...args){const row={operation:key,receiver:snapshot(this),args:[]};for(const value of args)row.args[row.args.length]=snapshot(value);tape[tape.length]=row;if(mutate)mutate();return apply(field.value,this,args);}});result=outcome(()=>api.decodeBuiltinSourceMeta(wire));}finally{define(owner,key,field);}return {result,tape};
}
function paired(apis,run){const rows=[];for(const api of apis)rows.push(run(api));assert.deepStrictEqual(rows[1],rows[0]);return rows;}

test('actual complete codec native copies and both CST phases preserve original APIs without selecting production',{timeout:60000},()=>{
 const plan=prepareBuiltinCanonicalTable();assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.productionSelected,false);assert.equal(plan.originalPublicAPIsUnchanged,true);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.performanceQualified,false);assert.equal(plan.copies.length,3);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}for(const row of plan.copies)assert.equal(row.inverse,row.completeOriginal);
 assert.equal(readFileSync(new URL('../builtin-source-meta.mjs',import.meta.url),'utf8'),plan.inputs[0].source);assert.equal(builtinCanonicalTableReady(),true);
});

test('positive canonical tables preserve complete values aliases signed numbers escapes object key order and frozen descriptors',{timeout:60000},async t=>{
 const {api}=await fixture(t),shared={source:'abcdefgh',text:'λ😀\ud800\udc00',negative:-13},withProto=Object.fromEntries([['__proto__',{value:'abcdefgh'}],['10','ten'],['2','two'],['name','abcdefgh']]),values=[null,true,0,-0,-13,1.25,'short','abcdefgh',[null,true,'abcdefgh',-13],{},withProto,{left:shared,right:shared,nested:[shared]}];
 for(const value of values){const wire=original.encodeBuiltinSourceMeta(value),before=api.facts();assert.equal(api.encodeBuiltinSourceMeta(value),wire);const decoded=api.decodeBuiltinSourceMeta(wire);assert.deepStrictEqual(decoded,original.decodeBuiltinSourceMeta(wire));assert.equal(api.facts().selected,before.selected+1);assert.equal(api.facts().fallback,before.fallback);if(decoded&&typeof decoded==='object')assert.equal(Object.isFrozen(decoded),true);if(decoded?.left){assert.equal(decoded.left,decoded.right);assert.equal(decoded.left,decoded.nested[0]);assert.equal(Object.isFrozen(decoded.left),true);}assert.equal(original.encodeBuiltinSourceMeta(decoded),wire);assert.deepStrictEqual(api.sealBuiltinSourceMeta(value),original.sealBuiltinSourceMeta(value));}
});

test('unused reordered duplicate inline-long and noncanonical tables retain the exact original complete error path',{timeout:60000},async t=>{
 const {api}=await fixture(t),seed=JSON.parse(original.encodeBuiltinSourceMeta({value:'abcdefgh',nested:{other:'ijklmnop'}})),cases=[];
 const add=change=>{const data=JSON.parse(json(seed));change(data);cases.push(json(data));};add(data=>{data.table.push(['s','unreachable']);});add(data=>{data.fieldNames.push('unused');});add(data=>{data.table.push(data.table[0]);data.root=-data.table.length;});add(data=>{data.table[0]=['s','tiny'];});add(data=>{data.root='abcdefgh';});add(data=>{data.table[0]=['a',[-9999]];});add(data=>{data.fieldNames[0]=data.fieldNames[1];});add(data=>{const node=data.table.find(row=>row[0]==='o'&&row[1].length===2);node[1].reverse();});
 cases.push(' '+json(seed),json(seed).replace('abcdefgh','\\u0061bcdefgh'),json({schema:'builtin-source-meta-sharing-v1',fieldNames:[],table:[],root:-0}).replace('"root":0','"root":-0'),'[',json({...seed,unknown:true}));
 for(const wire of cases){const before=api.facts();assert.deepStrictEqual(outcome(()=>api.decodeBuiltinSourceMeta(wire)),outcome(()=>original.decodeBuiltinSourceMeta(wire)));assert.equal(api.facts().selected,before.selected);}
});

test('original depth cell and byte limits and complete error metadata remain unchanged',{timeout:60000},async t=>{
 const {api}=await fixture(t),chain=depth=>{let value=null;for(let at=0;at<depth;at++)value={child:value};return value;};
 for(const value of [chain(64),chain(65),'x'.repeat(524288),Array.from({length:16001},(_,at)=>({id:at,source:'source-'+at}))]){const before=outcome(()=>original.encodeBuiltinSourceMeta(value)),after=outcome(()=>api.encodeBuiltinSourceMeta(value));assert.deepStrictEqual(after,before);if(before.value)assert.deepStrictEqual(outcome(()=>api.decodeBuiltinSourceMeta(before.value)),outcome(()=>original.decodeBuiltinSourceMeta(before.value)));}
});

test('every observed JSON freeze collection array object number math and byte-length hook retains full original calls',{timeout:60000},async t=>{
 const {api}=await fixture(t),wire=original.encodeBuiltinSourceMeta({source:'abcdefgh',values:[1,2,{name:'ijklmnop'}]}),modes=[[JSON,'parse'],[JSON,'stringify'],[Object,'freeze'],[Object,'keys'],[Object,'entries'],[Object,'fromEntries'],[Array.prototype,'map'],[Array.prototype,'some'],[Array.prototype,'includes'],[Array.prototype,'push'],[Map.prototype,'get'],[Map.prototype,'set'],[Map.prototype,'has'],[Set.prototype,'add'],[Set.prototype,'has'],[Number,'isFinite'],[Number,'isInteger'],[Number,'isSafeInteger'],[Math,'max'],[Buffer,'byteLength']];
 for(const [owner,key]of modes){const before=api.facts();paired([original,api],subject=>observe(subject,wire,owner,key));assert.equal(api.facts().selected,before.selected);assert.ok(api.facts().fallback>before.fallback);}
 for(const name of ['Map','Set']){const field=get(globalThis,name),rows=[];for(const subject of [original,api]){const tape=[];try{define(globalThis,name,{...field,value:function(...args){tape[tape.length]={constructor:name,args:args.length?json(args):'[]'};return Reflect.construct(field.value,args);}});rows.push({result:outcome(()=>subject.decodeBuiltinSourceMeta(wire)),tape});}finally{define(globalThis,name,field);}}assert.deepStrictEqual(rows[1],rows[0]);assert.ok(rows[0].tape.length>0);}
});

test('input byte-length and decoder freeze callbacks cannot change intrinsics then enter the optimized path',{timeout:60000},async t=>{
 const {api}=await fixture(t),wire=original.encodeBuiltinSourceMeta({source:'abcdefgh',nested:{value:'ijklmnop'}});
 for(const [owner,key]of [[Buffer,'byteLength'],[Object,'freeze']]){const stringify=get(JSON,'stringify'),before=api.facts();const rows=[];for(const subject of [original,api]){let changed=false;try{rows.push(observe(subject,wire,owner,key,()=>{if(!changed){changed=true;define(JSON,'stringify',{...stringify,value:function(...args){return apply(stringify.value,this,args);}});}}));}finally{define(JSON,'stringify',stringify);}}assert.deepStrictEqual(rows[1],rows[0]);assert.equal(api.facts().selected,before.selected);assert.ok(api.facts().fallback>before.fallback);}
 const bufferField=get(globalThis,'Buffer'),actualBuffer=Buffer;
 if(!Object.hasOwn(bufferField,'value')&&typeof bufferField.set==='function'){
  const before=api.facts(),rows=[];for(const subject of [original,api]){const tape=[],shadow={get byteLength(){tape.push('shadow-byte-length');return actualBuffer.byteLength;}};try{apply(bufferField.set,globalThis,[shadow]);assert.equal(builtinCanonicalTableReady(),false);rows.push({result:outcome(()=>subject.decodeBuiltinSourceMeta(wire)),tape});}finally{apply(bufferField.set,globalThis,[actualBuffer]);}}
  assert.deepStrictEqual(rows[1],rows[0]);assert.equal(api.facts().selected,before.selected);assert.ok(api.facts().fallback>before.fallback);assert.equal(builtinCanonicalTableReady(),true);
 }
 for(const proxy of [false,true]){let reads=0;const getter=function(){reads++;return actualBuffer;};try{define(globalThis,'Buffer',{enumerable:bufferField.enumerable,configurable:bufferField.configurable,get:proxy?new Proxy(getter,{apply(target,receiver,args){return Reflect.apply(target,receiver,args);}}):getter,set:bufferField.set});const cold=await fixture(t,{coldSupport:true}),prior=reads;assert.equal(cold.guard.builtinCanonicalTableReady(),false);assert.equal(reads,prior);const rows=[];for(const subject of [original,cold.api]){const started=reads;rows.push({result:outcome(()=>subject.decodeBuiltinSourceMeta(wire)),reads:reads-started});}assert.deepStrictEqual(rows[1],rows[0]);assert.equal(cold.api.facts().selected,0);assert.equal(cold.api.facts().fallback,1);}finally{define(globalThis,'Buffer',bufferField);}}
});

test('complete seal Hash payloads and frozen results stay fresh with mutable input and real callbacks',{timeout:60000},async t=>{
 const {api}=await fixture(t),field=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),runs=[];
 for(const subject of [original,api]){const tape=[],reads=[],input={};define(input,'source',{enumerable:true,get(){reads.push('source');return 'abcdefgh';}});let result;try{define(Hash.prototype,'update',{...field,value:function(...args){tape[tape.length]={op:'update',args};return apply(field.value,this,args);}});define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);tape[tape.length]={op:'digest',args,value};return value;}});result=subject.sealBuiltinSourceMeta(input);}finally{define(Hash.prototype,'update',field);define(Hash.prototype,'digest',digest);}runs.push({result,tape,reads});}
 assert.deepStrictEqual(runs[1],runs[0]);assert.equal(runs[0].tape.length,2);assert.ok(runs[0].reads.length>0);const value={source:'abcdefgh'};const first=api.sealBuiltinSourceMeta(value);value.source='ijklmnop';const second=api.sealBuiltinSourceMeta(value);assert.notEqual(second.digest,first.digest);assert.deepStrictEqual(second,original.sealBuiltinSourceMeta(value));assert.equal(Object.isFrozen(second),true);
});

test('repeated complete 256-node tables use invocation-local validation without retaining prior verdicts or values',{timeout:60000},async t=>{
 const {api}=await fixture(t),shared={source:'shared original source',span:{start:1,end:4}},value=Array.from({length:256},(_,index)=>({index,source:'source-'+index,shared})),wire=original.encodeBuiltinSourceMeta(value),before=api.facts();const first=api.decodeBuiltinSourceMeta(wire),second=api.decodeBuiltinSourceMeta(wire);assert.deepStrictEqual(first,original.decodeBuiltinSourceMeta(wire));assert.deepStrictEqual(second,first);assert.notEqual(second,first);assert.notEqual(second[0],first[0]);assert.equal(first[0].shared,first[255].shared);assert.equal(second[0].shared,second[255].shared);assert.equal(api.facts().selected,before.selected+2);const data=JSON.parse(wire);data.table.push(['s','unreachable original source']);assert.deepStrictEqual(outcome(()=>api.decodeBuiltinSourceMeta(json(data))),outcome(()=>original.decodeBuiltinSourceMeta(json(data))));assert.equal(api.facts().selected,before.selected+2);
});
