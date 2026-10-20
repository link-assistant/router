import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeRegisteredJsonProgram,decodeRegisteredJsonProgram} from '../registered-json-storage.mjs';
import {renderClassProgramStorage} from '../class-program-storage.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const decode=packet=>decodeRegisteredJsonProgram(packet.encoded,packet.expandedBytes,packet.blockBytes,packet.storageBytes);

test('complete JSON values roundtrip exact Unicode nested arrays numbers and repeated source text',()=>{
 const values=[null,true,false,0,7,-17,1.25,'','λ😀\u0000\r\n',[],{},[null,false,{text:'猫😀',values:[0,1,2]}],{source:'pub fn same()->bool{true}\n'.repeat(3000)}];
 for(const value of values){const wire=JSON.stringify(value),packet=encodeRegisteredJsonProgram(wire);assert.deepEqual(decode(packet),value);assert.equal(JSON.stringify(decode(packet)),wire);assert.deepEqual(encodeRegisteredJsonProgram(wire),packet);}
});

test('malformed complete frames and nonprimitive dimensions refuse before caller coercion',()=>{
 const packet=encodeRegisteredJsonProgram(JSON.stringify({source:'original source '.repeat(100)}));let callbacks=0;const hostile={toString(){callbacks++;throw Error('unexpected coercion');},valueOf(){callbacks++;throw Error('unexpected coercion');}};
 for(const args of [[hostile,packet.expandedBytes,packet.blockBytes,packet.storageBytes],[packet.encoded,hostile,packet.blockBytes,packet.storageBytes],[packet.encoded,packet.expandedBytes,hostile,packet.storageBytes],[packet.encoded,packet.expandedBytes,packet.blockBytes,hostile]])assert.throws(()=>decodeRegisteredJsonProgram(...args));
 for(const field of ['expandedBytes','blockBytes','storageBytes'])for(const value of [NaN,Infinity,-1,1.5,0,1e9])assert.throws(()=>decode({...packet,[field]:value}));
 for(const encoded of ['~'+packet.encoded.slice(1),packet.encoded.slice(0,-1),packet.encoded+'!!!!!'])assert.throws(()=>decode({...packet,encoded}));assert.equal(callbacks,0);
 assert.throws(()=>encodeRegisteredJsonProgram(' {"x":1}'),/canonical|Canonical/);assert.throws(()=>encodeRegisteredJsonProgram(JSON.stringify('x'.repeat(262144))),/bounded|Bounded/);
});

test('actual whole class leaf preserves every existing program byte and complete native CST inverse',{timeout:10000},()=>{
 const source=readFileSync(new URL('../extensions/original-class-definition-birth.mjs',import.meta.url),'utf8'),plan=renderClassProgramStorage({source});
 assert.equal(plan.inverse,source);assert.equal(transportConcreteSyntaxMeta(plan.beforeMeta).source,source);assert.equal(transportConcreteSyntaxMeta(plan.afterMeta).source,plan.text);assert.equal(plan.beforeProgramJson,plan.programJson);assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);
 assert.equal(renderClassProgramStorage({source:plan.text}).text,plan.text);assert.ok(Buffer.byteLength(plan.text)<=262144);
 const metadata=JSON.parse(plan.programJson);assert.equal(metadata.schema,'registered-original-class-birth-v1');assert.deepEqual(metadata.authority,{type:false,owner:false,cfg:false,body:false,executable:false});assert.equal(metadata.definitions.length,24);
});

test('source edits to program DATA retain complete source inverse without changing decoder or source guards',{timeout:10000},()=>{
 const source=readFileSync(new URL('../extensions/original-class-definition-birth.mjs',import.meta.url),'utf8'),first=renderClassProgramStorage({source}),metadata=JSON.parse(first.programJson);metadata.storageRegression={text:'λ😀',values:[null,true,7]};
 const wire=JSON.stringify(metadata),edited=renderClassProgramStorage({source:first.text,programText:wire});assert.equal(edited.inverse,first.text);assert.equal(edited.beforeProgramJson,first.programJson);assert.equal(edited.programJson,wire);assert.equal(JSON.stringify(decode(edited.storage)),wire);assert.equal(renderClassProgramStorage({source:edited.text}).text,edited.text);
 const final=JSON.parse(edited.programJson);assert.deepEqual(final.authority,metadata.authority);assert.equal(final.sourceDomain.partBAnd265,'not authorized by A1');
});

test('ambiguous guards malformed source and prototype-initializing literals cannot borrow the fixed leaf rule',()=>{
 const source=readFileSync(new URL('../extensions/original-class-definition-birth.mjs',import.meta.url),'utf8');
 assert.throws(()=>renderClassProgramStorage({source:source.replace('common()&&privateParserHostAvailable()','true')}),/guarded host/);
 assert.throws(()=>renderClassProgramStorage({source:source+'\nconst PROGRAM={};\n'}),/PROGRAM|syntax/);
 assert.throws(()=>renderClassProgramStorage({source:source+'\nfunction checked(){}\n'}),/helper|syntax/);
 assert.throws(()=>renderClassProgramStorage({source:'const PROGRAM={};'}),/guarded host/);
 const raw=source.replace(/const PROGRAM=.*;/u,'const PROGRAM={"__proto__":{}};');if(raw!==source)assert.throws(()=>renderClassProgramStorage({source:raw}),/prototype|syntax/);
});
