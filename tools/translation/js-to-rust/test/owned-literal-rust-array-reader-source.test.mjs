// Independent additive Rust syntax DATA cases. No caller permission. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readOwnedRustFunction as original} from '../owned-primitive-vector-rust-syntax.mjs';
import {readOwnedRustFunction as literal} from '../owned-primitive-vector-literal-rust-syntax.mjs';
import {readOwnedRustFunction as textLiteral} from '../owned-text-vector-rust-syntax.mjs';
const limits={timeout:60000};
test('new temporary literal reader retains exact original reader refusal and supports the written array observation',limits,()=>{
 const source='fn observed(value: ::core::primitive::u8)->::std::vec::Vec<::core::primitive::u8>{crate::translation_primitive_vectors_core::vec_u8_from_slice(&[value])}';assert.throws(()=>original(source,{primitiveOperators:true}));assert.throws(()=>literal(source));const row=literal(source,{primitiveOperators:true});assert.equal(row.body.tail.kind,'call');assert.equal(row.body.tail.args[0].kind,'borrow');assert.equal(row.body.tail.args[0].value.kind,'json-array');assert.equal(row.body.tail.args[0].value.elements.length,1);
});
test('String array observation retains separate elements and bounds canonical source arity',limits,()=>{
 const type='::std::string::String',prefix='fn observed(first:'+type+',second:'+type+')->::std::vec::Vec<'+type+'>{crate::translation_owned_text_vectors_core::vec_text_from_slice(&[',row=textLiteral(prefix+'first,second])}',{primitiveOperators:true});assert.equal(row.body.tail.args[0].value.elements.length,2);assert.throws(()=>textLiteral(prefix+Array(65).fill('first').join(',')+'])}',{primitiveOperators:true}));assert.throws(()=>textLiteral(prefix+'first;2])}',{primitiveOperators:true}));
});
