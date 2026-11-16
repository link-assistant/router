// Independent whole target source DATA cases. No execution during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOpaqueTargetCalleeData} from '../opaque-body-callee-20261102-target.mjs';
const options={timeout:60000,concurrency:false};
const declarations='function first(x){return x+1n;} function second(x){return x-1n;} ';
test('every direct original helper call changes while definitions, arguments, comments and strings stay exact',options,()=>{const before=declarations+'function caller(value){return first(value)+first(value);} // first\n',after=declarations+'function caller(value){return second(value)+second(value);} // first\n',result=proposeOpaqueTargetCalleeData(before,after,'JavaScript');assert.equal(result.groups.length,1);assert.equal(result.groups[0].owner,'caller');assert.equal(result.groups[0].before,'first');assert.equal(result.groups[0].after,'second');assert.equal(result.groups[0].targetOccurrences,2);assert.equal(result.semanticAuthority,false);});
test('complete written TS signatures remain unchanged by the direct callee edit',options,()=>{const prefix='function first(x:bigint):bigint{return x+1n;} function second(x:bigint):bigint{return x-1n;} ',result=proposeOpaqueTargetCalleeData(prefix+'function caller(x:bigint):bigint{return first(x);}',prefix+'function caller(x:bigint):bigint{return second(x);}','TypeScript');assert.equal(result.changedCallees,1);assert.equal(result.sourceAuthority,false);});
test('partial occurrences, shadowed/unknown callees, property edits and changed arguments refuse',options,()=>{for(const[left,right]of [
 ['function caller(x){return first(x)+first(x);}','function caller(x){return second(x)+first(x);}'],
 ['function caller(first){return first(1n);}','function caller(first){return second(1n);}'],
 ['function caller(x){class second{};return first(x);}','function caller(x){class second{};return second(x);}'],
 ['function caller(x){return first(x);}','function caller(x){return missing(x);}'],
 ['function caller(x){return x.first(x);}','function caller(x){return x.second(x);}'],
 ['function caller(x){return first(x);}','function caller(x){return second(x+1n);}'],
 ])assert.throws(()=>proposeOpaqueTargetCalleeData(declarations+left,declarations+right,'JavaScript'));});
test('nested closures, optional/generic invocations and changed top-level calls refuse',options,()=>{for(const[left,right,language]of [
 ['function caller(x){return ()=>first(x);}','function caller(x){return ()=>second(x);}','JavaScript'],
 ['function caller(x){return first?.(x);}','function caller(x){return second?.(x);}','JavaScript'],
 ['function caller(x){return first<bigint>(x);}','function caller(x){return second<bigint>(x);}','TypeScript'],
 ['first(1n);','second(1n);','JavaScript'],
 ])assert.throws(()=>proposeOpaqueTargetCalleeData(declarations+left,declarations+right,language));});

test('simultaneous helper-call swaps use original token positions without treating another changed group as a stale call',options,()=>{const before=declarations+'function caller(x){return first(x)+second(x);}',after=declarations+'function caller(x){return second(x)+first(x);}',result=proposeOpaqueTargetCalleeData(before,after,'JavaScript');assert.equal(result.groups.length,2);assert.deepEqual(result.groups.map(row=>[row.before,row.after]),[['first','second'],['second','first']]);});
