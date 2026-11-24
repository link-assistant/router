import test from 'node:test';
import assert from 'node:assert/strict';
import {planStandardStringEquality,STANDARD_STRING_EQUALITY_PROFILE} from '../extensions/standard-string-equality.mjs';
const range={start:1,end:2};
const owned={kind:'string',rustSourceType:true,patternOwnershipRefusal:'ownership-bearing String type',rustOwnership:{kind:'owned',source:'String'}};
const borrowed={kind:'string',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'}};
const shared={kind:'string',rustOwnership:{kind:'borrowed',source:'String'},patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:owned,span:range,tokens:[{value:'&'},{value:'String'}]}};
const value=type=>({k:'var',name:'v',type,span:range});

test('standard String equality planner registers only actual pinned trait pairs',()=>{
  for(const [lhs,rhs,left,right]of [[owned,owned,'String','String'],[owned,borrowed,'String','&str'],[borrowed,owned,'&str','String'],[borrowed,borrowed,'&str','&str'],[shared,shared,'&String','&String'],[shared,borrowed,'&String','&str'],[borrowed,shared,'&str','&String']])assert.deepEqual(planStandardStringEquality(value(lhs),value(rhs)),{profile:STANDARD_STRING_EQUALITY_PROFILE.id,left,right});
  for(const pair of [[owned,shared],[shared,owned]])assert.throws(()=>planStandardStringEquality(...pair.map(value)),/registered String\/str PartialEq/);
});

test('string equality refuses erased custom unresolved and noncanonical reference evidence',()=>{
  for(const type of [{kind:'string'},{kind:'data',name:'String'}, {...owned,patternOwnershipRefusal:'unproved'},{...owned,rustGenericIdentityUnresolved:true},{...owned,rustBorrowingUnresolved:'unknown'}, {...shared,rustReference:{kind:'mutable',pointee:owned}},{...shared,rustReference:{kind:'shared'}},{...shared,rustReference:{kind:'shared',pointee:shared}},{...borrowed,patternOwnershipRefusal:'unproved'}])assert.throws(()=>planStandardStringEquality(value(type),value(borrowed)),/checked source reference/);
});

test('shared String field places require their actual checked nominal layout',()=>{
  const receiver={kind:'data',name:'S',rustReference:{kind:'shared',pointee:{kind:'data',name:'S'},span:range}};
  const declarations=new Map([['S',{record:true,ctors:[{name:'S',fields:[{name:'text',type:owned,rustTypeSyntax:['String']}]}]}]]);
  const place={k:'routerField',field:'text',object:value(receiver),span:range,type:{...shared,patternOwnershipRefusal:'shared field place',rustReference:{...shared.rustReference,source:'shared-field-projection',sourceReceiverSpan:range}},sharedProjectionProof:{kind:'borrowed-field-place',field:'text',pointee:{kind:'data',name:'S'}}};
  assert.equal(planStandardStringEquality(place,value(borrowed),{declarations}).left,'String');
  for(const mutate of [p=>{p.sharedProjectionProof.field='other'},p=>{p.object.type.rustReference.kind='mutable'},p=>{p.object.type.rustReference.pointee.name='Other'},p=>{delete p.sharedProjectionProof},p=>{p.type.rustReference.sourceReceiverSpan={start:4,end:5}}]){const forged=structuredClone(place);mutate(forged);assert.throws(()=>planStandardStringEquality(forged,value(borrowed),{declarations}),/checked source reference/);}
  assert.throws(()=>planStandardStringEquality(place,value(borrowed),{declarations:new Map()}),/checked source reference/);
});
