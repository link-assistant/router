import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{readFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {prepareCanonicalMetaChunks} from '../prepare-canonical-meta-chunks.mjs';
import {transportConcreteCanonicalMetaChunks as receive} from '../concrete-canonical-meta-chunks.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,
 transportConcreteSyntaxMetaChunks as original} from '../concrete-syntax-meta.mjs';

const wire=(source='// Ω😀\r\nfn answer()->u8{7}',language='Rust')=>
 transportConcreteSyntaxSource(source,{language}).meta;

test('complete owning producer retains the old reader and both full source inverses',{timeout:60000},()=>{
 const plan=prepareCanonicalMetaChunks();
 assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.originalReadersUnchanged,true);
 assert.equal(plan.freshBuildsPerRow,2);assert.equal(plan.originalBoundsUnchanged,true);
 assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.semanticAuthority,false);
 assert.equal(plan.runtimeParity,false);assert.equal(plan.files.length,1);
 assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);
 for(const row of plan.files){
  assert.equal(readFileSync(row.original,'utf8'),row.before);
  assert.equal(readFileSync(row.path,'utf8'),row.after);assert.equal(row.current,row.after);
  assert.equal(row.equation.inverse,row.before);
  assert.equal(transportConcreteSyntaxMeta(row.equation.beforeMeta).source,row.before);
  assert.equal(transportConcreteSyntaxMeta(row.equation.afterMeta).source,row.after);
  for(const stage of row.equation.stages){
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
   assert.equal(stage.inverse,stage.before);
  }
  assert.ok(row.after.split('\n').length<1000);
 }
});

test('complete canonical rows match original documents totals diagnostics and reconstructed Unicode',{timeout:60000},()=>{
 const chunks=[[
  wire(),wire('\ufeff// Ω😀\r\nexport const value=1;','JavaScript'),
  wire('export const value:number=1;','TypeScript')
 ],[
  wire(''),wire('fn broken(){"unterminated'),wire('// \ud800\r\nconst value=/[{}]/;','JavaScript')
 ],[wire('// complete source\r\nfn other()->bool{true}')]];
 assert.deepEqual(receive(chunks),original(chunks));
 const frozen=Object.freeze(chunks.map(chunk=>Object.freeze([...chunk])));
 assert.deepEqual(receive(frozen),original(frozen));
 for(const chunk of receive(chunks).chunks)for(const row of chunk.rows){
  assert.deepEqual(row.document.authority,{type:false,owner:false,executable:false});
  assert.equal(row.document.source,row.source);
  assert.equal(row.meta,JSON.stringify(row.document));
 }
});

test('every changed schema encoding node diagnostic and authority field still refuses',{timeout:60000},()=>{
 const complete=wire(),changes=[
  row=>{row.schema='forged';},row=>{row.representationLevel='checked';},
  row=>{row.language='Other';},row=>{row.source+=' ';},row=>{row.status='opaque';},
  row=>{row.sourceEncoding.utf16CodeUnits++;},row=>{row.sourceEncoding.utf8Bytes++;},
  row=>{row.sourceEncoding.wellFormedUnicode=false;},row=>{row.sourceEncoding.utf8BytePreservation=false;},
  row=>{row.sourceEncoding.utf8Mapping='unicode-replacement';},row=>{row.nodes[0][0]='token';},
  row=>{row.nodes[1][1]='forged';},row=>{row.nodes[1][2]++;},row=>{row.nodes[1][3]++;},
  row=>{row.nodes[1][4]++;},row=>{row.nodes[1][5]++;},row=>{row.nodes[1][6]=-1;},
  row=>{row.nodes[1].push(0);},row=>{row.nodes=[];},row=>{row.diagnostics=[['invented',0,1]];},
  row=>{row.authority.type=true;},row=>{row.authority.owner=true;},
  row=>{row.authority.executable=true;},row=>{row.extra='unrecognized';}
 ];
 for(const change of changes){
  const row=JSON.parse(complete);change(row);const input=[[JSON.stringify(row)]];
  assert.throws(()=>original(input),TypeError);assert.throws(()=>receive(input),TypeError);
 }
 assert.deepEqual(receive([[complete]]),original([[complete]]));
});

test('noncanonical JSON keys spelling nesting and foreign trees cannot supply a CST',{timeout:60000},()=>{
 const complete=wire(),row=JSON.parse(complete);
 const reversed=Object.fromEntries(Object.entries(row).reverse());
 for(const meta of [complete+' ',JSON.stringify(row,null,1),JSON.stringify(reversed),
  complete.replace('"schema":','"schema":"duplicate","schema":'),
  complete.replace('"Rust"','"R\\u0075st"'),complete.slice(0,-1)+',"__proto__":{"executable":true}}',
  'null','[]','1','"source"','{"source":"fn x(){}"}','[[[[[]]]]]',complete.slice(0,-1)]){
  assert.throws(()=>original([[meta]]),TypeError);assert.throws(()=>receive([[meta]]),TypeError);
 }
});

test('hostile chunk arrays and descriptors refuse without invoking caller code',{timeout:60000},()=>{
 const complete=wire();let calls=0;
 const proxy=new Proxy([complete],{get(){calls++;throw Error('get');},ownKeys(){calls++;throw Error('keys');}});
 const accessor=[complete];Object.defineProperty(accessor,'0',{enumerable:true,get(){calls++;throw Error('getter');}});
 const hidden=[complete];Object.defineProperty(hidden,'0',{enumerable:false});
 for(const input of [[proxy],[accessor],[hidden],new Array(1),[new Array(1)],
  Object.assign([[complete]],{extra:true}),[[{meta:complete}]],[[null]]]){
  assert.throws(()=>original(input),TypeError);assert.throws(()=>receive(input),TypeError);
 }
 assert.equal(calls,0);
});

test('original chunk row serialization and aggregate source bounds remain fatal',{timeout:60000},()=>{
 const complete=wire(''),large=wire('/*'+'x'.repeat(400000)+'*/');
 for(const input of [[],[[]],Array.from({length:4},()=>[complete]),
  [Array(257).fill(complete)],[[' '.repeat(33554433)]],[Array(6).fill(large)]]){
  assert.throws(()=>original(input),TypeError);assert.throws(()=>receive(input),TypeError);
 }
 assert.deepEqual(receive([[complete]]),original([[complete]]));
});

test('late filesystem observations cannot replace metadata descriptors or authenticated bytes',{timeout:60000},()=>{
 const complete=wire(),read=Object.getOwnPropertyDescriptor(fs,'readSync');
 for(const change of ['text','descriptor','array','bytes']){
  const input=[[complete]];let calls=0;
  try{
   Object.defineProperty(fs,'readSync',{...read,value:function(...args){
    const count=Reflect.apply(read.value,this,args);
    if(count>0&&calls++===0){
     if(change==='text')input[0][0]+=' ';else if(change==='descriptor')Object.defineProperty(input[0],'0',{writable:false});
     else if(change==='array')input[0]=[complete];else args[1][args[2]]^=1;
    }return count;
   }});syncBuiltinESMExports();
   assert.throws(()=>receive(input),TypeError);assert.ok(calls>0);
  }finally{Object.defineProperty(fs,'readSync',read);syncBuiltinESMExports();}
  assert.deepEqual(receive([[complete]]),original([[complete]]));
 }
});

test('changed native parsing serialization and traversal refuse before replacement hooks run',{timeout:60000},()=>{
 const complete=wire();let calls=0;
 for(const [owner,key]of [[JSON,'parse'],[JSON,'stringify'],[Array.prototype,'entries']]){
  const field=Object.getOwnPropertyDescriptor(owner,key);
  try{
   Object.defineProperty(owner,key,{...field,value:function(){calls++;throw Error('hook');}});
   assert.throws(()=>receive([[complete]]),TypeError);
  }finally{Object.defineProperty(owner,key,field);}
 }
 assert.equal(calls,0);assert.deepEqual(receive([[complete]]),original([[complete]]));
});
