// Independent syntax DATA cases. No source flags become compiler permission.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOpaqueTargetBindingRenameData} from '../opaque-body-binding-rename-20261102-target.mjs';
const options={timeout:60000,concurrency:false};
test('all local binding/reference tokens rename through whole JS CST with untouched comments and strings',options,()=>{const before='function sample(input) { const value = input + 1n; return value; }\n// value\nconst text="value";\n',after='function sample(input) { const renamed = input + 1n; return renamed; }\n// value\nconst text="value";\n',result=proposeOpaqueTargetBindingRenameData(before,after,'JavaScript');assert.equal(result.groups.length,1);assert.equal(result.groups[0].before,'value');assert.equal(result.groups[0].after,'renamed');assert.equal(result.groups[0].bindingKind,'local');assert.equal(result.groups[0].targetOccurrences,2);assert.equal(result.semanticAuthority,false);});
test('written TS parameter and local bindings retain complete written types and support independent groups',options,()=>{const before='function sample(input: bigint): bigint { const value: bigint = input + 1n; return value; }\n',after='function sample(argument: bigint): bigint { const output: bigint = argument + 1n; return output; }\n',result=proposeOpaqueTargetBindingRenameData(before,after,'TypeScript');assert.deepEqual(result.groups.map(row=>[row.before,row.after,row.bindingKind]),[['input','argument','parameter'],['value','output','local']]);assert.equal(result.changedIdentifiers,4);});
test('incomplete references, capture, shadowing, property and callee edits each refuse',options,()=>{for(const[before,after]of [
 ['function f(input){const value=input;return value;}','function f(input){const changed=input;return value;}'],
 ['function f(input){const value=input;return value;}','function f(input){const input=input;return input;}'],
 ['function f(input){let value=input;{let value=1n;value;}return value;}','function f(input){let renamed=input;{let renamed=1n;renamed;}return renamed;}'],
 ['function f(input){const value=input;return input.value+value;}','function f(input){const renamed=input;return input.renamed+renamed;}'],
 ['function f(input){return first(input);}','function f(input){return second(input);}'],
 ])assert.throws(()=>proposeOpaqueTargetBindingRenameData(before,after,'JavaScript'));});
test('nested closures, changed comments/types and unsupported top-level bindings cannot pass as local renames',options,()=>{for(const[before,after,language]of [
 ['function f(input){const value=input;return ()=>value;}','function f(input){const renamed=input;return ()=>renamed;}','JavaScript'],
 ['function f(){const value=1n;return value;} // before','function f(){const renamed=1n;return renamed;} // after','JavaScript'],
 ['function f(input: bigint): bigint{return input;}','function f(argument: number): bigint{return argument;}','TypeScript'],
 ['const value=1n;','const renamed=1n;','JavaScript'],
 ])assert.throws(()=>proposeOpaqueTargetBindingRenameData(before,after,language));});
