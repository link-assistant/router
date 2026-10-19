import test from 'node:test';
import assert from 'node:assert/strict';
import {Checker} from '../extensions/core.mjs';
import {JSON_DATA,JSON_CONTRACTS,JSON_TYPES,jsonContracts} from '../extensions/json-contracts.mjs';
import * as json from '../extensions/json-runtime.mjs';
import {formatJsonFloat} from '../extensions/json-numbers.mjs';
const parsed=text=>{const result=json.serde_json_from_str(text);assert.equal(result.$,'Ok',result.field0?.message);return result.field0;};
const number=text=>parsed(text).field0;
test('recursive JSON ABI resolves in the copied checker and all overloads name actual runtime exports',()=>{
  const checker=new Checker('Rust',[]),checked=checker.program({language:'Rust',items:structuredClone(JSON_DATA)});
  assert.equal(checked.declarations.get('serde_json.Value').ctors.find(ctor=>ctor.name === 'Array').fields[0].type.element.name,'serde_json.Value');
  assert.equal(checked.declarations.get('serde_json.MapEntry').ctors[0].fields[1].type.name,'serde_json.Value');
  for(const contract of JSON_CONTRACTS){assert.equal(typeof json[contract.jsExport],'function',contract.id);checker.resolveType(contract.ret,[],{start:0,end:0});assert.ok(Object.isFrozen(contract));}
  assert.equal(jsonContracts('serde_json::Value::get').length,2);assert.equal(jsonContracts('unsupported::api').length,0);
  assert.equal(JSON_TYPES.error.path.join('::'),'serde_json::Error');
});
test('JSON integers retain their full signed and unsigned range and float identity',()=>{
  assert.deepEqual(number('18446744073709551615'),{$:'PosInt',field0:18446744073709551615n});
  assert.deepEqual(number('-9223372036854775808'),{$:'NegInt',field0:-9223372036854775808n});
  assert.deepEqual(json.serde_json_number_as_i64(number('9223372036854775808')),{$:'None'});
  assert.deepEqual(json.serde_json_number_as_u64(number('-1')),{$:'None'});
  assert.deepEqual(json.serde_json_value_as_u64(parsed('256.0')),{$:'None'});
  assert.equal(json.serde_json_value_is_f64(parsed('256.0')),true);
  assert.equal(json.serde_json_value_is_f64(parsed('256')),false);
  assert.equal(Object.is(number('-0').field0,-0),true);assert.equal(number('-0').$,'Float');
  assert.equal(number('18446744073709551616').$,'Float');
  assert.equal(json.serde_json_to_string(parsed('18446744073709551615')).field0,'18446744073709551615');
});
test('default serde decimal decoding follows its accumulator instead of JavaScript JSON numeric coercion',()=>{
  // Pinned de.rs accumulates 10000000000000001100 as u64, casts to f64,
  // then divides by 1e19. Later fractional digits are discarded on overflow.
  const source='1.000000000000000110000';
  assert.equal(JSON.parse(source),1);assert.equal(number(source).field0,1.0000000000000002);
  assert.equal(number('9.99999999999999999999999').field0,10);
  assert.equal(number('0e999999999999999999999').field0,0);
  assert.equal(Object.is(number('-1e-999999999999999999999').field0,-0),true);
  assert.equal(json.serde_json_from_str('1e999999999999999999').field0.message,'number out of range');
  assert.equal(json.serde_json_from_str('1e309').$,'Err');
  assert.equal(number('2.5e-2').field0,0.025);
});
test('shortest finite float formatting uses the pinned zmij decimal layout and preserves negative zero',()=>{
  for(const [value,expected] of [[0,'0.0'],[-0,'-0.0'],[256,'256.0'],[1e-5,'0.00001'],[1e-6,'1e-6'],[1e15,'1000000000000000.0'],[1e16,'1e+16'],[Number.MIN_VALUE,'5e-324'],[Number.MAX_VALUE,'1.7976931348623157e+308'],[0.1,'0.1'],[1.2345678901234567,'1.2345678901234567']])assert.equal(formatJsonFloat(value),expected);
  const view=new DataView(new ArrayBuffer(8));let state=0x123456789abcdefn;
  for(let index=0;index<300;index++) {
    state=BigInt.asUintN(64,state*6364136223846793005n+1442695040888963407n);view.setBigUint64(0,state);
    const value=view.getFloat64(0);if(Number.isFinite(value))assert.ok(Object.is(Number(formatJsonFloat(value)),value));
  }
  for(const value of [NaN,Infinity,-Infinity]){assert.throws(()=>formatJsonFloat(value),/finite binary64/);assert.deepEqual(json.serde_json_number_from_f64(value),{$:'None'});}
});
test('objects sort keys by Rust UTF-8 bytes, preserve large integers and retain last duplicate values',()=>{
  const value=parsed('{"2":2,"10":10,"𐀀":3,"":4,"__proto__":"literal","dup":1,"dup":2}');
  assert.deepEqual(json.serde_json_map_keys(value.field0),['10','2','__proto__','dup','','𐀀']);
  assert.equal(json.serde_json_to_string(value).field0,'{"10":10,"2":2,"__proto__":"literal","dup":2,"":4,"𐀀":3}');
  assert.equal(json.serde_json_value_as_str(json.serde_json_value_get_string(value,'__proto__').field0).field0,'literal');
  assert.equal(json.serde_json_map_len(value.field0),6n);assert.equal(json.serde_json_map_is_empty(value.field0),false);
  assert.ok(Object.isFrozen(value));assert.ok(Object.isFrozen(value.field0.entries));
});
test('JSON pointers and index overloads distinguish absent values from JSON null and reject array aliases',()=>{
  const value=parsed('{"":0,"a/b":{"~key":[null,false,"Ω"]},"~2":"literal"}');
  assert.equal(json.serde_json_value_pointer(value,'').field0,value);
  assert.equal(json.serde_json_value_as_u64(json.serde_json_value_pointer(value,'/').field0).field0,0n);
  assert.equal(json.serde_json_value_as_str(json.serde_json_value_pointer(value,'/a~1b/~0key/2').field0).field0,'Ω');
  assert.equal(json.serde_json_value_pointer(value,'/~2').field0.field0,'literal');
  for(const suffix of ['01','+1','-1','-','18446744073709551616'])assert.deepEqual(json.serde_json_value_pointer(value,'/a~1b/~0key/'+suffix),{$:'None'});
  const array=json.serde_json_value_pointer(value,'/a~1b/~0key').field0;
  assert.deepEqual(json.serde_json_value_as_null(json.serde_json_value_get_usize(array,0n).field0),{$:'Some',field0:null});
  assert.deepEqual(json.serde_json_value_get_string(array,'0'),{$:'None'});
  assert.deepEqual(json.serde_json_value_index_usize(array,99n),{$:'Null'});
  assert.deepEqual(json.serde_json_value_as_bool(json.serde_json_value_get_usize(array,1n).field0),{$:'Some',field0:false});
});
test('byte decoding preserves BOM inside strings, strict Unicode and Rust byte-based error locations',()=>{
  for(const [source,message,line,column,category] of [
    ['','EOF while parsing a value',1n,0n,'Eof'],['[','EOF while parsing a list',1n,1n,'Eof'],['[1,]','trailing comma',1n,4n,'Syntax'],
    ['{"Ω": }','expected value',1n,8n,'Syntax'],['{}\n?','trailing characters',2n,1n,'Syntax'],['01','invalid number',1n,2n,'Syntax'],
    ['"\\uD800','EOF while parsing a string',1n,7n,'Eof'],['"\\uDC00"','lone leading surrogate in hex escape',1n,7n,'Syntax'],
  ]) {
    const result=json.serde_json_from_str(source);assert.equal(result.$,'Err',source);
    assert.equal(result.field0.message,message);assert.equal(json.serde_json_error_line(result.field0),line);assert.equal(json.serde_json_error_column(result.field0),column);assert.equal(json.serde_json_error_classify(result.field0).$ ,category);
    assert.equal(json.serde_json_error_to_string(result.field0),`${message} at line ${line} column ${column}`);
  }
  assert.equal(json.serde_json_from_slice([34n,239n,187n,191n,34n]).field0.field0,'\ufeff');
  assert.equal(json.serde_json_from_slice([34n,255n,34n]).field0.message,'invalid unicode code point');
  assert.equal(json.serde_json_from_slice([255n]).field0.message,'expected value');
  assert.equal(parsed('"\\uD83E\\uDD80"').field0,'🦀');
  assert.equal(json.serde_json_from_str('['.repeat(127)+'0'+']'.repeat(127)).$,'Ok');
  assert.equal(json.serde_json_from_str('['.repeat(128)+'0'+']'.repeat(128)).field0.message,'recursion limit exceeded');
});
test('pretty and UTF-8 byte serialization share layouts, while malformed typed capabilities abort',()=>{
  const value=parsed('{"a":[1,"Ω"],"z":null}'),expected='{\n  "a": [\n    1,\n    "Ω"\n  ],\n  "z": null\n}';
  assert.equal(json.serde_json_to_string_pretty(value).field0,expected);
  assert.deepEqual(json.serde_json_to_vec_pretty(value).field0,Array.from(Buffer.from(expected),byte=>BigInt(byte)));
  for(const invalid of [{$:'Number',field0:{$:'PosInt',field0:18446744073709551616n}},{$:'Number',field0:{$:'Float',field0:Infinity}},{$:'String',field0:'\ud800'},{$:'Bool',field0:'false'},{$:'Unknown'},{$:'Null',field0:null}])assert.throws(()=>json.serde_json_to_string(invalid),TypeError);
  assert.throws(()=>json.serde_json_from_slice([255]),TypeError);assert.throws(()=>json.serde_json_from_str('\ud800'),TypeError);
  const cycle={$:'Array',field0:[]};cycle.field0.push(cycle);assert.throws(()=>json.serde_json_to_string(cycle),/cyclic/);
  const unsorted={$:'Object',field0:{$:'Map',entries:[{$:'MapEntry',key:'b',value:{$:'Null'}},{$:'MapEntry',key:'a',value:{$:'Null'}}]}};
  assert.throws(()=>json.serde_json_to_string(unsorted),/sorted/);
});
