// Independent source only. No Rust tool or tests run during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateTypeScript} from '../typed-portable.mjs';
import {prepareTypedAbsenceLibraryTypes} from '../../prepare-typed-absence-library-types.mjs';
import {prepareTypedScalarAbsence} from '../../prepare-typed-scalar-absence.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};
for(const [type,wrapper,values]of [
 ['number|null','JsNullable',[null,0,-0,1,NaN,Infinity]],
 ['number|undefined','JsOptional',[undefined,0,-0,1,NaN,Infinity]],
 ['string|null','JsNullable',[null,'','λ😀']],
 ['boolean|undefined','JsOptional',[undefined,false,true]],
 ['null','JsNull',[null]],
 ['undefined','JsUndefined',[undefined]],
])test('identity-only '+type+' retains Rust boundary declarations without absent body literals',limits,async()=>{
 const result=translateTypeScript('export function identity(value:'+type+'):'+type+'{return value;}');
 assert.match(result.rust,new RegExp('pub (?:struct|enum) '+wrapper+'\\b'));assert.equal(result.program[0].body[0].value.kind,'variable');
 await verifyTypedTargets(result,(_api,_result,module)=>{for(const value of values)assert.ok(Object.is(module.identity(value),value));},{childTimeoutMs:20_000});
});
test('library type selection keeps the complete copied emitter and adjacent private source history',limits,()=>{
 const plan=prepareTypedAbsenceLibraryTypes(),row=plan.files[0];assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);
 const parent=prepareTypedScalarAbsence().files.find(value=>value.path===row.path);assert.equal(parent.current,parent.currentAfter);assert.equal(parent.currentAfter,row.after);assert.equal(parent.laterHistories[0].before,parent.after);assert.equal(parent.laterHistories[0].after,row.after);
});
