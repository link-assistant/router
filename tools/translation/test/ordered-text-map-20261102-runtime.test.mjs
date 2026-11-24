// Independent expectations; source drafted only, execution deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as map from '../ordered-text-map-20261102-runtime.mjs';
import {ORDERED_TEXT_MAP_CONTRACTS} from '../ordered-text-map-20261102-contracts.mjs';
const limits={timeout:60000};
test('empty maps distinguish absent keys from present empty strings',limits,()=>{
 const empty=map.router_text_map_new();assert.equal(map.router_text_map_len(empty),0n);assert.deepEqual(map.router_text_map_pairs(empty),[]);
 assert.deepEqual(map.router_text_map_get(empty,''),{$:'None'});const present=map.router_text_map_insert(empty,'','');
 assert.equal(map.router_text_map_contains(present,''),true);assert.deepEqual(map.router_text_map_get(present,''),{$:'Some',field0:''});assert.equal(map.router_text_map_len(empty),0n);
});
test('native UTF-8 key order differs from JavaScript UTF-16 order',limits,()=>{
 const input=[['😀','supplementary'],['\ue000','bmp'],['a','ascii'],['é','accent'],['','empty'],['\u0000','nul']];
 const value=map.router_text_map_from_pairs(input);assert.deepEqual(map.router_text_map_keys(value),['','\u0000','a','é','\ue000','😀']);
 assert.deepEqual(map.router_text_map_pairs(value),[['','empty'],['\u0000','nul'],['a','ascii'],['é','accent'],['\ue000','bmp'],['😀','supplementary']]);
});
test('duplicate input keys replace values without duplicating or reordering keys',limits,()=>{
 const value=map.router_text_map_from_pairs([['z','one'],['a','two'],['z','three']]);assert.equal(map.router_text_map_len(value),2n);
 assert.deepEqual(map.router_text_map_pairs(value),[['a','two'],['z','three']]);const replaced=map.router_text_map_insert(value,'a','last');
 assert.deepEqual(map.router_text_map_get(replaced,'a'),{$:'Some',field0:'last'});assert.deepEqual(map.router_text_map_get(value,'a'),{$:'Some',field0:'two'});
});
test('copies removal and outputs have independent frozen container storage',limits,()=>{
 const input=[['a','x'],['b','y']],value=map.router_text_map_from_pairs(input),copy=map.router_text_map_copy(value),pairs=map.router_text_map_pairs(value);
 input[0][1]='changed';input.push(['c','z']);assert.deepEqual(map.router_text_map_pairs(value),[['a','x'],['b','y']]);assert.notEqual(copy,value);assert.notEqual(copy.entries,value.entries);assert.notEqual(copy.entries[0],value.entries[0]);assert.notEqual(pairs,value.entries);
 for(const target of [value,value.entries,value.entries[0],copy,pairs,pairs[0],map.router_text_map_keys(value),map.router_text_map_get(value,'a')])assert.equal(Object.isFrozen(target),true);
 assert.deepEqual(map.router_text_map_pairs(map.router_text_map_remove(value,'a')),[['b','y']]);assert.deepEqual(map.router_text_map_remove(value,'missing'),value);
});
test('normalization preserves distinct scalar spellings and prototype-like keys',limits,()=>{
 const value=map.router_text_map_from_pairs([['é','composed'],['e\u0301','decomposed'],['__proto__','safe'],['constructor','safe too']]);
 assert.equal(map.router_text_map_len(value),4n);assert.deepEqual(map.router_text_map_get(value,'é'),{$:'Some',field0:'composed'});assert.deepEqual(map.router_text_map_get(value,'e\u0301'),{$:'Some',field0:'decomposed'});assert.equal(map.router_text_map_contains(value,'__proto__'),true);
});
test('malformed maps arrays accessors proxies and non-scalar text are refused without coercion',limits,()=>{
 let traps=0;const proxy=new Proxy({}, {get(){traps++;throw Error('trap');},ownKeys(){traps++;throw Error('trap');}});
 for(const value of [proxy,null,[],{$:'OrderedTextMap',entries:[['b','x'],['a','y']]},{$:'OrderedTextMap',entries:[['a','x'],['a','y']]},{$:'OrderedTextMap',entries:[],extra:1}])assert.throws(()=>map.router_text_map_len(value));
 assert.equal(traps,0);const accessor=[];Object.defineProperty(accessor,'0',{enumerable:true,get(){traps++;throw Error('getter');}});accessor.length=1;
 for(const value of [accessor,new Array(1),[['a']],[[1,'x']],[[new String('a'),'x']],[['a','\ud800']],[['\udfff','x']]])assert.throws(()=>map.router_text_map_from_pairs(value));assert.equal(traps,0);
 let coerced=0;assert.throws(()=>map.router_text_map_insert(map.router_text_map_new(),{toString(){coerced++;return 'x';}},'y'));assert.equal(coerced,0);
});
test('entry and UTF-8 bounds include superseded input and complete outputs',limits,()=>{
 const maximum=map.router_text_map_from_pairs(Array.from({length:4096},(_,index)=>[String(index),'']));assert.equal(map.router_text_map_len(maximum),4096n);
 assert.equal(map.router_text_map_len(map.router_text_map_insert(maximum,'0','replace')),4096n);assert.throws(()=>map.router_text_map_insert(maximum,'new',''));
 assert.throws(()=>map.router_text_map_from_pairs(Array.from({length:4097},()=>['same',''])));
 const large='x'.repeat(1048575),value=map.router_text_map_from_pairs([['a',large]]);assert.equal(map.router_text_map_contains(value,'a'),true);
 assert.throws(()=>map.router_text_map_insert(value,'b',''));assert.throws(()=>map.router_text_map_from_pairs([['a',large],['a','replace']]));
 assert.throws(()=>map.router_text_map_from_pairs([['a','😀'.repeat(262144)]]));assert.throws(()=>map.router_text_map_get(value,'x'.repeat(1048577)));
 assert.deepEqual(map.router_text_map_pairs(map.router_text_map_insert(value,'a','small')),[['a','small']]);
});
test('operation descriptions retain consumption loans and explicit unqualified caller gaps',limits,()=>{
 assert.equal(ORDERED_TEXT_MAP_CONTRACTS.length,10);const get=ORDERED_TEXT_MAP_CONTRACTS.find(row=>row.operation==='get'),insert=ORDERED_TEXT_MAP_CONTRACTS.find(row=>row.operation==='insert');
 assert.equal(get.returnedLoan,true);assert.equal(get.loanRoot,0);assert.deepEqual(insert.consumed,[0,1,2]);
 for(const row of ORDERED_TEXT_MAP_CONTRACTS){assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);assert.equal(row.privateCallerBindingQualified,false);assert.equal(row.forwardCallerLoweringComplete,false);assert.equal(row.reverseCallerLoweringComplete,false);}
});
