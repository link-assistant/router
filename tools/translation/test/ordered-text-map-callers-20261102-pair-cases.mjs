// Independent adapter case source only. UNRUN and not a caller qualification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {router_text_map_from_tuple_pairs as fromTuples,router_text_map_tuple_pairs as tuples} from '../ordered-text-map-callers-20261102-pair-runtime.mjs';
import {router_text_map_from_pairs as rawFrom,router_text_map_pairs as rawPairs,router_text_map_get as get} from '../ordered-text-map-20261102-runtime.mjs';
const tuple=(field0,field1)=>({$:'Tuple',field0,field1});
test('tuple bridge preserves original raw domain and native order independently',()=>{
 const map=fromTuples([tuple('\u{10000}','wide'),tuple('\ue000','bmp'),tuple('','empty'),tuple('x','before'),tuple('x','after')]);
 assert.deepEqual(rawPairs(map),[['','empty'],['x','after'],['\ue000','bmp'],['\u{10000}','wide']]);
 assert.deepEqual(tuples(map),[tuple('','empty'),tuple('x','after'),tuple('\ue000','bmp'),tuple('\u{10000}','wide')]);
 assert.deepEqual(rawPairs(fromTuples(tuples(map))),rawPairs(map));assert.equal(get(map,'x').field0,'after');
 assert.throws(()=>rawFrom([tuple('x','value')]));assert.throws(()=>fromTuples([['x','value']]));
 assert.equal(Object.isFrozen(tuples(map)),true);assert.equal(Object.isFrozen(tuples(map)[0]),true);
});
test('tuple bridge refuses getters proxies holes inherited fields and all extra keys',()=>{
 let touched=false;const accessor={field0:'x',field1:'value'};Object.defineProperty(accessor,'$',{enumerable:true,get(){touched=true;throw null;}});
 const inherited=Object.create(tuple('x','value'));const extra=tuple('x','value');extra.extra=0;
 const symbol=tuple('x','value');symbol[Symbol('extra')]=0;const hidden=tuple('x','value');Object.defineProperty(hidden,'extra',{value:0});
 const missing=[tuple('x','value')];delete missing[0];const custom=[tuple('x','value')];custom.extra=0;
 const hostile=new Proxy({}, {getPrototypeOf(){touched=true;throw undefined;},ownKeys(){touched=true;throw false;}});
 for(const value of [[accessor],[inherited],[extra],[symbol],[hidden],missing,custom,[hostile],hostile])assert.throws(()=>fromTuples(value));
 assert.equal(touched,false);
});
test('tuple bridge retains pre-deduplication byte and entry bounds',()=>{
 assert.throws(()=>fromTuples(Array.from({length:4097},()=>tuple('x',''))));
 assert.throws(()=>fromTuples([tuple('x','a'.repeat(524288)),tuple('x','b'.repeat(524288))]));
 assert.throws(()=>fromTuples([tuple('x','\ud800')]));assert.throws(()=>fromTuples([tuple('x','a'.repeat(1048576))]));
 assert.deepEqual(rawPairs(fromTuples([])),[]);assert.equal(rawPairs(fromTuples([tuple('','')]))[0][1],'');
});
