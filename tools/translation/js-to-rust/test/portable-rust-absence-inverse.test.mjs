// Source-only roundtrip and refusal cases. No Rust or local tests run here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateTypeScript} from '../typed-portable.mjs';
import {translatePortableRust,UnsupportedPortableRustSource} from '../portable-rust.mjs';
import {preparePortableRustAbsenceInverse} from '../../prepare-portable-rust-absence-inverse.mjs';
import {preparePortableRustInverse} from '../../prepare-portable-rust-inverse.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};

for(const [type,values]of [['number|undefined',[undefined,0,-0,1,NaN,Infinity]],['string|null',[null,'','λ😀']],['boolean|undefined',[undefined,false,true]],['null',[null]],['undefined',[undefined]]])test('complete canonical '+type+' identity Rust returns through both checked meta paths',limits,async()=>{
 const original=translateTypeScript('export function identity(value:'+type+'):'+type+'{return value;}'),result=translatePortableRust(original.rust);
 assert.equal(result.portableRustSourceHistory.equation.inverse,original.rust);assert.ok(result.portableRustSourceHistory.selectedHelpers.length>=4);assert.equal(result.rust,original.rust);
 await verifyTypedTargets(result,(_api,_result,module)=>{for(const value of values)assert.ok(Object.is(module.identity(value),value));},{childTimeoutMs:20_000});
});
test('strict absence tests and actual guarded string payloads survive the complete Rust inverse',limits,async()=>{
 const original=translateTypeScript('export function twice(value:string|null):string|null{if(value===null){return null;}return value+value;} export function add(value:number|undefined):number{if(value!==undefined){return value+1;}return 0;}'),result=translatePortableRust(original.rust);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.twice(null),null);assert.equal(module.twice('λ😀'),'λ😀λ😀');assert.equal(module.add(undefined),0);assert.equal(module.add(2),3);assert.ok(Object.is(module.add(-0),1));},{childTimeoutMs:20_000});
});
test('canonical typeof and truthiness patterns preserve absent zero NaN and empty string distinctions',limits,async()=>{
 const original=translateTypeScript('export function typeOf(value:number|null):string{return typeof value;} export function truthy(value:number|undefined):number{if(value){return value+1;}return 0;} export function label(value:string|null):string{if(typeof value==="string"){return value;}return "missing";}'),result=translatePortableRust(original.rust);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.typeOf(null),'object');assert.equal(module.typeOf(2),'number');for(const value of [undefined,0,-0,NaN])assert.equal(module.truthy(value),0);assert.equal(module.truthy(2),3);assert.equal(module.label(null),'missing');assert.equal(module.label(''),'');assert.equal(module.label('😀'),'😀');},{childTimeoutMs:20_000});
});
test('Rust wrapper definitions panic branches and typeof payloads cannot be changed as public metadata',limits,()=>{
 const original=translateTypeScript('export function label(value:string|null):string{if(value===null){return "missing";}return value;}').rust;
 for(const source of [original.replace('Value(T)','Changed(T)'),original.replace('checked absence guard','unchecked replacement'),original.replace('JsNullable::Value(value) => value','JsNullable::Value(value) => "wrong".to_string()')]){assert.notEqual(source,original);assert.throws(()=>translatePortableRust(source),UnsupportedPortableRustSource);}
});
test('complete original frontend and scalar inverse retain the explicit new source layer',limits,()=>{
 const next=preparePortableRustAbsenceInverse();assert.equal(next.files.length,2);
 for(const row of next.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);}
 const parent=preparePortableRustInverse().files.find(row=>row.path.endsWith('/portable-rust-frontends.mjs'));assert.equal(parent.current,parent.currentAfter);assert.equal(parent.currentAfter,next.files.find(row=>row.path===parent.path).after);assert.equal(parent.laterHistories[0].before,parent.after);
});
