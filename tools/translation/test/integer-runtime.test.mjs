import test from 'node:test';
import assert from 'node:assert/strict';
import {Checker} from '../extensions/core.mjs';
import {integerContracts,INTEGER_TYPES} from '../extensions/integer-contracts.mjs';
import {createIntegerRuntime,std_num_parse_int_error_kind,std_num_parse_int_error_to_string} from '../extensions/integer-runtime.mjs';
import {valueSchema} from '../type-layout.mjs';
import {validateRustValue} from '../type-layout-runtime.mjs';
const fixed=(bits,signed=false)=>({kind:'fixed',bits,signed});
const check=items=>new Checker('Rust',[]).program({language:'Rust',items:structuredClone(items)});
const reason=result=>{assert.equal(result.$,'Err');return std_num_parse_int_error_kind(result.field0).$;};
test('integer instantiations register actual typed errors and collision-free Result layouts in the copied checker',()=>{
  const factory=integerContracts(fixed(64)),program=check(factory.data),schema=valueSchema(program.declarations);
  assert.equal(program.declarations.get('std.num.IntErrorKind').ctors.length,5);
  assert.equal(program.declarations.get('std.num.ParseIntError').ctors[0].fields[0].type.name,'std.num.IntErrorKind');
  assert.equal(factory.contracts[0].constEligible,false);assert.equal(factory.contracts[2].constEligible,true);
  const repeated=integerContracts(fixed(64),program.declarations);assert.equal(repeated.data.length,0);
  const signed=integerContracts(fixed(64,true),program.declarations);assert.notEqual(signed.ret.path[0],factory.ret.path[0]);assert.equal(signed.data.length,1);
  for(const input of ['18446744073709551615','18446744073709551616','+',''])assert.equal(validateRustValue(createIntegerRuntime(factory.type).rust_integer_parse(input),factory.ret,schema),true);
  assert.equal(validateRustValue({$:'ParseIntError',kind:{$:'Zero'}},INTEGER_TYPES.error,schema),true);
  for(const type of [null,{kind:'float'},fixed(7),{kind:'fixed',bits:64,signed:'false'}])assert.throws(()=>integerContracts(type),TypeError);
  const conflict=new Map(program.declarations);conflict.set('std.num.IntErrorKind',{k:'data',ctors:[{name:'Empty',fields:[]}]});assert.throws(()=>integerContracts(fixed(64),conflict),/Conflicting checked/);
});
test('all fixed widths preserve exact signed and unsigned boundaries without Number conversion',()=>{
  for(const bits of [8,16,32,64,128])for(const signed of [false,true]) {
    const parser=createIntegerRuntime(fixed(bits,signed)),width=BigInt(bits),min=signed?-(1n<<(width-1n)):0n,max=signed?(1n<<(width-1n))-1n:(1n<<width)-1n;
    for(const value of [min,0n,max])assert.deepEqual(parser.rust_integer_parse(String(value)),{$:'Ok',field0:value});
    assert.equal(reason(parser.rust_integer_parse(String(max+1n))),'PosOverflow');
    assert.equal(reason(parser.rust_integer_parse(String(min-1n))),signed?'NegOverflow':'InvalidDigit');
    assert.deepEqual(parser.rust_integer_parse('+00042'),{$:'Ok',field0:42n});
    assert.deepEqual(parser.rust_integer_parse(signed?'-0':'0'),{$:'Ok',field0:0n});
  }
});
test('string parsing rejects whitespace, Unicode digits, Rust literal underscores and misplaced signs',()=>{
  const parser=createIntegerRuntime(fixed(64));
  assert.equal(reason(parser.rust_integer_parse('')),'Empty');
  for(const source of ['+','-','-0','-1',' 1','1 ','1\n','\ufeff1','١','１','1_000','0xff','++1','1+2','1e3','1.0','1\0','Ω'])assert.equal(reason(parser.rust_integer_parse(source)),'InvalidDigit',source);
  assert.throws(()=>parser.rust_integer_parse('\ud800'),TypeError);assert.throws(()=>parser.rust_integer_parse(42),TypeError);
});
test('digit validation and arithmetic overflow preserve pinned source error precedence',()=>{
  const unsigned=createIntegerRuntime(fixed(8)),signed=createIntegerRuntime(fixed(8,true));
  assert.equal(reason(unsigned.rust_integer_parse('25x')),'InvalidDigit');
  assert.equal(reason(unsigned.rust_integer_parse('255x')),'InvalidDigit');
  assert.equal(reason(unsigned.rust_integer_parse('256x')),'PosOverflow');
  assert.equal(reason(unsigned.rust_integer_parse('2550x')),'PosOverflow');
  assert.equal(reason(signed.rust_integer_parse('-128x')),'InvalidDigit');
  assert.equal(reason(signed.rust_integer_parse('-129x')),'NegOverflow');
  assert.equal(reason(signed.rust_integer_parse('-1280x')),'NegOverflow');
  assert.deepEqual(unsigned.rust_integer_parse('0'.repeat(128)+'255'),{$:'Ok',field0:255n});
});
test('radix parsing supports stable bases two through thirty-six and distinguishes panic from Result errors',()=>{
  const parser=createIntegerRuntime(fixed(128));
  for(const radix of [2n,8n,10n,16n,36n]) {
    const value=340282366920938463463374607431768211455n;
    assert.deepEqual(parser.rust_integer_from_str_radix(value.toString(Number(radix)),radix),{$:'Ok',field0:value});
    assert.equal(reason(parser.rust_integer_from_str_radix((value+1n).toString(Number(radix)),radix)),'PosOverflow');
  }
  assert.deepEqual(parser.rust_integer_from_str_radix('aBcDeF',16n),{$:'Ok',field0:11259375n});
  assert.equal(reason(parser.rust_integer_from_str_radix('0xff',16n)),'InvalidDigit');
  for(const radix of [0n,1n,37n,4294967295n])assert.throws(()=>parser.rust_integer_from_str_radix('',radix),RangeError);
  for(const radix of [-1n,4294967296n,10])assert.throws(()=>parser.rust_integer_from_str_radix('1',radix),TypeError);
});
test('typed parse errors expose stable categories and source display while rejecting forged accessors',()=>{
  const parser=createIntegerRuntime(fixed(8)),expected=[['','cannot parse integer from empty string'],['x','invalid digit found in string'],['256','number too large to fit in target type']];
  for(const [input,message] of expected)assert.equal(std_num_parse_int_error_to_string(parser.rust_integer_parse(input).field0),message);
  assert.equal(std_num_parse_int_error_to_string(createIntegerRuntime(fixed(8,true)).rust_integer_parse('-129').field0),'number too small to fit in target type');
  assert.equal(std_num_parse_int_error_to_string({$:'ParseIntError',kind:{$:'Zero'}}),'number would be zero for non-zero type');
  let invoked=0;const accessor={$:'ParseIntError',get kind(){invoked++;return {$:'Empty'};}};
  for(const value of [accessor,{$:'Other',kind:{$:'Empty'}},{$:'ParseIntError',kind:{$:'Unknown'}},{$:'ParseIntError',kind:{$:'Empty',extra:true}},{$:'ParseIntError',kind:{$:'Empty'},extra:true},null])assert.throws(()=>std_num_parse_int_error_to_string(value),TypeError);
  assert.equal(invoked,0);assert.ok(Object.isFrozen(parser.rust_integer_parse('1')));assert.ok(Object.isFrozen(parser.rust_integer_parse('x').field0));
});
