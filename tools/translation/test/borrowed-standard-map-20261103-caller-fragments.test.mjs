// Independent proposal/refusal cases SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {borrowedStandardMapReverseOperation,borrowedStandardMapReverseRustCall,borrowedStandardMapReverseTypeWitness} from '../borrowed-standard-map-20261103-reverse.mjs';
import {parseForwardBorrowedStandardMap,emitForwardBorrowedStandardMap,interpretForwardBorrowedStandardMap} from '../borrowed-standard-map-20261103-forward.mjs';
import {borrowedStandardMapRuntimeAssets} from '../borrowed-standard-map-20261103-packaging.mjs';
const NAME='router_borrowed_text_map_matches_literals';
test('reverse native predicate borrows its map without imposing opaque carrier limits',()=>{
 assert.equal(borrowedStandardMapReverseRustCall(NAME,['__ro_arg_0','__ro_arg_1'],['true','1']),'crate::borrowed_standard_map_20261102::borrowed_text_map_matches_literals(__ro_arg_0, __ro_arg_1, &["true", "1"])');
 const call=borrowedStandardMapReverseRustCall(NAME,['__ro_arg_0','__ro_arg_1'],[]);assert.ok(call.endsWith(', &[])'));assert.equal(call.includes('text_map_copy'),false);
 const operation=borrowedStandardMapReverseOperation(NAME);assert.deepEqual(operation.consumed,[]);assert.equal(operation.returnedLoan,false);assert.equal(operation.containerEntryLimit,null);assert.equal(operation.valueByteLimit,null);assert.equal(operation.semanticAuthority,false);
 assert.deepEqual(borrowedStandardMapReverseTypeWitness('standard-text-map-input'),{name:NAME,kind:'parameter',index:0});
});
test('Rust literal proposals preserve control bytes quotes slashes and Unicode without JSON-only escapes',()=>{
 const source=borrowedStandardMapReverseRustCall(NAME,['__ro_arg_0','__ro_arg_1'],['\0\b\f\x7f','"\\\r\n\t','𐐀','é','e\u0301','$&']);
 assert.ok(source.includes('"\\x00\\x08\\x0c\\x7f"'));assert.ok(source.includes('"\\"\\\\\\r\\n\\t"'));
 assert.ok(source.includes('"𐐀"'));assert.ok(source.includes('"é", "e\u0301"'));assert.ok(source.includes('"$&"'));
 assert.equal(source.includes('\\b'),false);assert.equal(source.includes('\\f'),false);
});
test('extra operands injected source nonliteral choices and malformed scalar strings refuse',()=>{
 for(const args of [[],['__ro_arg_0'],['__ro_arg_0','__ro_arg_1','__ro_arg_2'],['map); panic!(); (map','__ro_arg_1']])assert.throws(()=>borrowedStandardMapReverseRustCall(NAME,args,['true']));
 assert.throws(()=>borrowedStandardMapReverseRustCall(NAME,['__ro_arg_0','__ro_arg_1'],Array(65).fill('x')));
 assert.throws(()=>borrowedStandardMapReverseRustCall(NAME,['__ro_arg_0','__ro_arg_1'],['\ud800']));
 let invoked=0;const choices=[];Object.defineProperty(choices,0,{enumerable:true,get(){invoked++;return 'true';}});
 assert.throws(()=>borrowedStandardMapReverseRustCall(NAME,['__ro_arg_0','__ro_arg_1'],choices));assert.equal(invoked,0);
 assert.equal(borrowedStandardMapReverseOperation('unknown'),null);
});
test('public parser and checked-looking IR cannot grant a borrowed native map type',()=>{
 let observed=0;const parser={};Object.defineProperty(parser,'cursor',{get(){observed++;throw Error('fake cursor');}});
 assert.throws(()=>parseForwardBorrowedStandardMap(parser,[]));assert.equal(observed,0);
 const node={k:'routerHostCall',id:NAME,args:[{k:'var',name:'map',type:{kind:'routerStandardTextMap'}},{k:'lit',value:'stream',type:{kind:'string'}}],type:{kind:'bool'}};
 assert.throws(()=>emitForwardBorrowedStandardMap({expr:()=>''},node,{requireCurrentPrivateCall:()=>{}}),/copied or unissued/u);
 assert.throws(()=>interpretForwardBorrowedStandardMap(node,()=>null,{requireCurrentPrivateCall:()=>{}}),/copied or unissued/u);
});
test('runtime and strict target declarations travel together through complete source CST',{timeout:60000},()=>{
 const files=borrowedStandardMapRuntimeAssets();assert.equal(files.size,4);
 assert.ok(files.get('runtime/borrowed-standard-map-20261102-runtime.mjs').includes('router_borrowed_text_map_matches_literals'));
 assert.ok(files.get('runtime/borrowed-standard-map-20261102-runtime.d.mts').includes('ReadonlyMap<string, string>'));
});
