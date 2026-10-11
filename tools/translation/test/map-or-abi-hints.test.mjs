import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {planStandardMethod,completeStandardMethod} from '../extensions/standard-method-plans.mjs';

test('coarse portable string hints do not invent source ownership obligations',()=>{
  const checked=checkProgram(parseRust('fn input(v:Option<u8>)->u8{0} fn main(){}'));
  const options={declarations:checked.declarations,resolveType:type=>type,argumentCount:2,defaultType:{kind:'string',rustOwnership:{kind:'borrowed',source:'str'}},expected:{kind:'string'}};
  const plan=planStandardMethod(checked.declarations.get('input').params[0].type,'map_or',options);
  assert.deepEqual(completeStandardMethod(plan,options.defaultType),options.defaultType);
  for(const expected of [{kind:'string',rustSourceType:true},{kind:'string',rustSourceType:true,rustOwnership:{kind:'owned',source:'String'}}])assert.throws(()=>planStandardMethod(checked.declarations.get('input').params[0].type,'map_or',{...options,expected}));
});
