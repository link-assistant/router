import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Buffer as ByteBuffer} from 'node:buffer';
import zlib from 'node:zlib';
import {createPrivateByteOutputTextRetention,createPrivateByteOutputTextMap} from '../private-byte-output-text.mjs';
import {createPrivateOutputTextRetention} from '../private-output-text.mjs';
import {deriveByteOutputTextSource} from '../prepare-byte-output-text.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000};
function allUnits(){let value='';for(let base=0;base<65536;base+=256)value+=String.fromCharCode(...Array.from({length:256},(_,index)=>base+index));return value;}

test('explicit byte retention preserves every original UTF16 unit and independent legacy results',limits,()=>{
 const current=createPrivateByteOutputTextRetention(),old=createPrivateOutputTextRetention();
 const sources=['','\ud800','\udfff','\u0000\uffff',allUnits(),'\ufeff// 😀é\r\n/* literal */ raw!()','\ud800x\udc00'.repeat(30000),'abcde'.repeat(30000)];
 let packed=0;
 for(const source of sources){const cell=current.retain(source);assert.equal(current.restore(cell),source);assert.equal(current.restore(cell),old.restore(old.retain(source)));if(current.observation(cell).mode==='packed')packed++;}
 assert.ok(packed>0);
});

test('complete chunk threshold overlap and incompressible boundaries preserve full source text',limits,()=>{
 const storage=createPrivateByteOutputTextRetention(),unique=allUnits(),sources=[];
 for(const count of [16383,16384,65535,65536,65537,131073])sources.push('z'.repeat(count));
 sources.push(unique+'a'.repeat(70000),'abcd'.repeat(16383)+'\ud83d'+'\ude00tail'.repeat(15000),unique.repeat(3));
 let many=false;for(const source of sources){const cell=storage.retain(source);assert.equal(storage.restore(cell),source);if(storage.observation(cell).chunks>=3)many=true;}
 assert.equal(many,true);
});

test('private byte map preserves native insertion replacement deletion and live iteration',limits,()=>{
 const map=createPrivateByteOutputTextMap(),a='a'.repeat(180000),b='猫\ud800\u0000'.repeat(40000),native=new Map();
 for(const [key,value]of [['a',a],['b',b],['a',b]]){assert.equal(map.set(key,value),map);native.set(key,value);}
 assert.deepEqual([...map],[...native]);assert.deepEqual([...map.keys()],[...native.keys()]);assert.deepEqual([...map.values()],[...native.values()]);assert.equal(map.get('missing'),undefined);
 const cursor=map[Symbol.iterator]();assert.deepEqual(cursor.next().value,['a',b]);map.set('c',a);assert.deepEqual(cursor.next().value,['b',b]);assert.deepEqual(cursor.next().value,['c',a]);assert.equal(cursor.next().done,true);
 assert.equal(map.delete('a'),true);assert.equal(map.delete('a'),false);assert.equal(map.has('a'),false);assert.equal(map.get('b'),b);assert.throws(()=>map.set('invalid',{}),TypeError);
});

test('foreign cells and late changed stock byte operations cannot expose or alter retained payloads',limits,()=>{
 const storage=createPrivateByteOutputTextRetention(),source='source\ud800\u0000猫'.repeat(20000),cell=storage.retain(source);assert.equal(storage.observation(cell).mode,'packed');
 let calls=0;for(const value of [{},Object.create(null),new Proxy({},{get(){calls++;throw Error('foreign trap');}})])assert.throws(()=>storage.restore(value),/Foreign/);assert.equal(calls,0);
 for(const [owner,key]of [[ByteBuffer,'from'],[ByteBuffer.prototype,'toString'],[zlib,'deflateRawSync'],[zlib,'inflateRawSync']]){
  const descriptor=Object.getOwnPropertyDescriptor(owner,key);let error;
  try{Object.defineProperty(owner,key,{...descriptor,value(){calls++;throw Error('changed host called');}});try{storage.restore(cell);}catch(caught){error=caught;}}
  finally{Object.defineProperty(owner,key,descriptor);}
  assert.match(error?.message??'',/stock host changed/);assert.equal(calls,0);assert.equal(storage.restore(cell),source);
 }
});

test('actual two-phase byte producer retains complete original CST source and inverses',limits,()=>{
 const before=readFileSync(new URL('../private-output-text.mjs',import.meta.url),'utf8'),actual=readFileSync(new URL('../private-byte-output-text.mjs',import.meta.url),'utf8'),proposal=deriveByteOutputTextSource(before);
 assert.equal(proposal.text,actual);assert.equal(proposal.inverse,before);assert.equal(transportConcreteSyntaxMeta(proposal.beforeMeta).source,before);assert.equal(transportConcreteSyntaxMeta(proposal.afterMeta).source,actual);assert.deepEqual([...new Set(proposal.trace.map(row=>row.phase))],['language','repository']);
 for(const source of [null,'',before.replace('function detached(','function missing('),before+'\nfunction detached(){}'])assert.throws(()=>deriveByteOutputTextSource(source));
 assert.equal(readFileSync(new URL('../private-output-text.mjs',import.meta.url),'utf8'),before);assert.deepEqual(proposal.authority,{semantic:false,source:false,owner:false});
});
