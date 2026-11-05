// Independent deterministic state-space oracle SOURCE; all cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as map from '../ordered-text-map-20261102-runtime.mjs';
const limits={timeout:60000,concurrency:false};
const keys=['','a','😀'],values=['','\0','é'];
const pairs=state=>keys.flatMap((key,index)=>state[index]===null?[]:[[key,state[index]]]);
test('all64 small states preserve scalar order, missing values and every persistent single edit',limits,()=>{
 for(let code=0;code<64;code++){
  const digits=[code%4,Math.floor(code/4)%4,Math.floor(code/16)%4],state=digits.map(digit=>digit===0?null:values[digit-1]),expected=pairs(state);
  const input=expected.map(row=>[...row]).reverse();if(expected.length)input.unshift([expected[0][0],'superseded']);
  const original=map.router_text_map_from_pairs(input);
  assert.deepEqual(map.router_text_map_pairs(original),expected,'state '+code);assert.equal(map.router_text_map_len(original),BigInt(expected.length));assert.deepEqual(map.router_text_map_keys(original),expected.map(row=>row[0]));
  assert.deepEqual(map.router_text_map_get(original,'absent'),{$:'None'});assert.equal(map.router_text_map_contains(original,'absent'),false);assert.deepEqual(map.router_text_map_pairs(map.router_text_map_remove(map.router_text_map_copy(original),'absent')),expected);
  for(let at=0;at<keys.length;at++){
   const key=keys[at];assert.deepEqual(map.router_text_map_get(original,key),state[at]===null?{$:'None'}:{$:'Some',field0:state[at]});assert.equal(map.router_text_map_contains(original,key),state[at]!==null);
   const removed=state.slice();removed[at]=null;assert.deepEqual(map.router_text_map_pairs(map.router_text_map_remove(map.router_text_map_copy(original),key)),pairs(removed));
   for(const value of values){const next=state.slice();next[at]=value;const updated=map.router_text_map_insert(map.router_text_map_copy(original),key,value);assert.deepEqual(map.router_text_map_pairs(updated),pairs(next));assert.deepEqual(map.router_text_map_get(updated,key),{$:'Some',field0:value});assert.deepEqual(map.router_text_map_pairs(original),expected,'edit mutated state '+code);}
  }
 }
});
test('exact supplementary-scalar byte boundary and all key readers share the native domain',limits,()=>{
 const payload='😀'.repeat(262144),original=map.router_text_map_insert(map.router_text_map_new(),'',payload),key='😀'.repeat(262144),oversize=key+'a';assert.deepEqual(map.router_text_map_get(original,''),{$:'Some',field0:payload});assert.deepEqual(map.router_text_map_get(original,key),{$:'None'});assert.equal(map.router_text_map_contains(original,key),false);assert.deepEqual(map.router_text_map_pairs(map.router_text_map_remove(map.router_text_map_copy(original),key)),[['',payload]]);
 for(const read of [()=>map.router_text_map_get(original,oversize),()=>map.router_text_map_contains(original,oversize),()=>map.router_text_map_remove(map.router_text_map_copy(original),oversize)])assert.throws(read);
 const changed=map.router_text_map_insert(map.router_text_map_copy(original),'','é');assert.deepEqual(map.router_text_map_pairs(changed),[['','é']]);assert.deepEqual(map.router_text_map_get(original,''),{$:'Some',field0:payload});
});
