import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Hash} from 'node:crypto';
import * as original from '../builtin-source-meta.mjs';
import * as previous from '../builtin-source-meta-canonical-candidate.mjs';
import {prepareBuiltinCanonicalInline} from '../prepare-builtin-canonical-inline.mjs';
const subjectURL=new URL('../builtin-source-meta-canonical-inline-candidate.mjs',import.meta.url),json=JSON.stringify,get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const outcome=run=>{try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message,metadataBytes:error.metadataBytes,metadataCells:error.metadataCells}};}};
async function fixture(t){
 const directory=mkdtempSync(join(tmpdir(),'router-canonical-inline-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const actual=readFileSync(subjectURL,'utf8'),anchor='  if((canonical===null?encodeBuiltinSourceMeta(result):canonical)!==text)',replacement="  receiving[canonical===null?'fallback':'selected']++;\n"+anchor;assert.equal(actual.split(anchor).length,2);let source=actual.replace(anchor,()=>replacement);assert.equal(source.replace(replacement,()=>anchor),actual);
 source=source.replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/g,(_whole,prefix,quote,path)=>prefix+quote+new URL(path,subjectURL).href+quote);source+='\nconst receiving={selected:0,fallback:0};export function facts(){return {...receiving};}\n';const path=join(directory,'receiving.mjs');writeFileSync(path,source);return {api:await import(pathToFileURL(path).href),actual};
}
const snapshot=value=>typeof value==='function'?{function:value.name,arity:value.length}:{type:typeof value,json:json(value)};
function observed(api,wire,owner,key,mutate){const field=get(owner,key),tape=[];try{define(owner,key,{...field,value:function(...args){const row={operation:key,receiver:snapshot(this),args:[]};for(const value of args)row.args[row.args.length]=snapshot(value);tape[tape.length]=row;mutate?.();return apply(field.value,this,args);}});return {result:outcome(()=>api.decodeBuiltinSourceMeta(wire)),tape};}finally{define(owner,key,field);}}

test('actual native source copy proves a single private dominated call and preserves all old codec APIs CST phases and inverses',{timeout:60000},()=>{
 const plan=prepareBuiltinCanonicalInline(),row=plan.files[0];assert.equal(row.current,row.after);assert.equal(plan.oldCandidateUnchanged,true);assert.equal(plan.productionSelected,false);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.performanceQualified,false);assert.equal(plan.dominance.oldSelectedFences,4);assert.equal(plan.dominance.newSelectedFences,3);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(row.inverse,row.before);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);assert.equal(plan.copies.length,3);
 assert.equal(readFileSync(new URL('../builtin-source-meta-canonical-candidate.mjs',import.meta.url),'utf8'),plan.inputs[0].source);assert.match(plan.helper.source,/^export function canonicalBuiltinSourceMetaText/u);assert.doesNotMatch(plan.helper.privateSource,/if\(!builtinCanonicalTableReady\(\)\)return null;/u);assert.match(plan.helper.privateSource,/encoded!==text\|\|!builtinCanonicalTableReady\(\)/u);
});

test('selected inline tables preserve full aliases primitive roots numeric tags key order and fresh repeated 256-node results',{timeout:60000},async t=>{
 const {api}=await fixture(t),shared={source:'shared original source',span:{start:1,end:4}},values=[null,true,-0,-13,1.5,'short','abcdefgh',Object.fromEntries([['__proto__',{value:'abcdefgh'}],['10','ten'],['2','two'],['text','λ😀\ud800']]),Array.from({length:256},(_,index)=>({index,source:'source-'+index,shared}))];
 for(const value of values){const wire=original.encodeBuiltinSourceMeta(value),before=api.facts(),first=api.decodeBuiltinSourceMeta(wire),second=api.decodeBuiltinSourceMeta(wire);assert.deepStrictEqual(first,previous.decodeBuiltinSourceMeta(wire));assert.deepStrictEqual(second,first);assert.equal(api.facts().selected,before.selected+2);assert.equal(api.facts().fallback,before.fallback);assert.equal(api.encodeBuiltinSourceMeta(first),wire);if(first&&typeof first==='object'){assert.notEqual(first,second);assert.equal(Object.isFrozen(first),true);}if(Array.isArray(first)){assert.equal(first[0].shared,first[255].shared);assert.notEqual(first[0],second[0]);}}
 const seed=JSON.parse(original.encodeBuiltinSourceMeta({source:'abcdefgh'}));for(const mutate of [row=>{row.table.push(['s','unused original source']);},row=>{row.fieldNames.push('unused');},row=>{row.root='inline long source';}]){const data=JSON.parse(json(seed));mutate(data);assert.deepStrictEqual(outcome(()=>api.decodeBuiltinSourceMeta(json(data))),outcome(()=>previous.decodeBuiltinSourceMeta(json(data))));}
});

test('every observable decoder intrinsic hook preserves complete previous-candidate calls and exact fallback results',{timeout:60000},async t=>{
 const {api}=await fixture(t),wire=original.encodeBuiltinSourceMeta({source:'abcdefgh',values:[1,2,{name:'ijklmnop'}]}),modes=[[JSON,'parse'],[JSON,'stringify'],[Object,'freeze'],[Object,'keys'],[Object,'entries'],[Object,'fromEntries'],[Array.prototype,'map'],[Array.prototype,'some'],[Array.prototype,'includes'],[Array.prototype,'push'],[Map.prototype,'get'],[Map.prototype,'set'],[Map.prototype,'has'],[Set.prototype,'add'],[Set.prototype,'has'],[Number,'isFinite'],[Number,'isInteger'],[Number,'isSafeInteger'],[Math,'max'],[Buffer,'byteLength']];
 for(const [owner,key]of modes){const before=api.facts(),left=observed(previous,wire,owner,key),right=observed(api,wire,owner,key);assert.deepStrictEqual(right,left,key);assert.equal(api.facts().selected,before.selected);assert.ok(api.facts().fallback>before.fallback);}
 for(const name of ['Map','Set']){const field=get(globalThis,name),rows=[];for(const subject of [previous,api]){const tape=[];try{define(globalThis,name,{...field,value:function(...args){tape[tape.length]={constructor:name,args:args.length?json(args):'[]'};return Reflect.construct(field.value,args);}});rows.push({result:outcome(()=>subject.decodeBuiltinSourceMeta(wire)),tape});}finally{define(globalThis,name,field);}}assert.deepStrictEqual(rows[1],rows[0]);}
});

test('input freeze mutations retain exact fallback callbacks while complete seal Hash payloads stay fresh',{timeout:60000},async t=>{
 const {api}=await fixture(t),wire=original.encodeBuiltinSourceMeta({source:'abcdefgh',nested:{value:'ijklmnop'}});
 for(const [owner,key]of [[Buffer,'byteLength'],[Object,'freeze']]){const stringify=get(JSON,'stringify'),rows=[],before=api.facts();for(const subject of [previous,api]){let changed=false;try{rows.push(observed(subject,wire,owner,key,()=>{if(!changed){changed=true;define(JSON,'stringify',{...stringify,value:function(...args){return apply(stringify.value,this,args);}});}}));}finally{define(JSON,'stringify',stringify);}}assert.deepStrictEqual(rows[1],rows[0]);assert.equal(api.facts().selected,before.selected);}
 const update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),runs=[];for(const subject of [previous,api]){const tape=[],reads=[],input={};define(input,'source',{enumerable:true,get(){reads.push('source');return 'abcdefgh';}});let result;try{define(Hash.prototype,'update',{...update,value:function(...args){tape[tape.length]={op:'update',args};return apply(update.value,this,args);}});define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);tape[tape.length]={op:'digest',args,value};return value;}});result=subject.sealBuiltinSourceMeta(input);}finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}runs.push({result,tape,reads});}assert.deepStrictEqual(runs[1],runs[0]);assert.equal(runs[0].tape.length,2);
 const value={source:'abcdefgh'},first=api.sealBuiltinSourceMeta(value);value.source='ijklmnop';const second=api.sealBuiltinSourceMeta(value);assert.notEqual(first.digest,second.digest);assert.deepStrictEqual(second,previous.sealBuiltinSourceMeta(value));
});
