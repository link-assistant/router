// Independent native/export regression source; all execution remains deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translatePortableModuleProject} from '../module-project.mjs';
import {prepareModulePublicAPI} from '../../prepare-module-public-api.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
import {ownershipCompiler} from '../vendor/module-syntax.mjs';
const limits={timeout:60_000};
function aliases(){return {entry:'index.mjs',language:'JavaScript',modules:[
 {path:'index.mjs',source:'export {twice as run,twice as again} from "./helper.mjs";'},
 {path:'helper.mjs',source:'/** @param {number} value @returns {number} */ export function twice(value){return value*2;} /** @returns {number} */ export function hidden(){return 9;}'},
]};}
test('actual native reexports preserve function identity and hide private implementation names',limits,async()=>{
 const result=translatePortableModuleProject(aliases());assert.deepEqual(result.moduleSourceHistory.publicExports.map(row=>row.publicName).sort(),['again','run']);assert.ok(result.modulePublicAPIHistory);assert.match(result.rust,/mod __router_portable_project/);assert.match(result.rust,/pub use self::__router_portable_project::.+ as run/);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.deepEqual(Object.keys(module).sort(),['again','run']);assert.equal(module.run,module.again);for(const value of [0,1,-2,0.5])assert.equal(module.run(value),value*2);},{childTimeoutMs:20_000});
});
test('star exports use complete actual native symbols while ambiguous stars remain refused',limits,async()=>{
 const input={entry:'index.mjs',language:'JavaScript',modules:[{path:'index.mjs',source:'export * from "./left.mjs"; export * from "./right.mjs";'},{path:'left.mjs',source:'export function one(){return 1;}'},{path:'right.mjs',source:'export function two(){return 2;}'}]},result=translatePortableModuleProject(input);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.deepEqual(Object.keys(module).sort(),['one','two']);assert.equal(module.one(),1);assert.equal(module.two(),2);},{childTimeoutMs:20_000});
 input.modules[2].source='export function one(){return 2;}';assert.throws(()=>translatePortableModuleProject(input),/native import\/export|public export/);
});
test('type-only scalar reexports remain actual public TypeScript aliases for strict consumers',limits,()=>{
 const result=translatePortableModuleProject({entry:'index.ts',language:'TypeScript',modules:[{path:'index.ts',source:'export {twice as run} from "./helper.js"; export type {Count} from "./helper.js";'},{path:'helper.ts',source:'export type Count=number; export function twice(value:Count):Count{return value*2;}'}]});
 assert.ok(result.typescript.includes('export type {'));assert.equal(result.modulePublicAPIHistory.rustScalarTypeAliasesEmitted,true);assert.match(result.rust,/pub type Count = f64;/);
 const ts=ownershipCompiler(),sources=new Map([['/module.ts',result.typescript],['/consumer.ts','import {run,type Count} from "./module.js"; export const value:Count=run(2);']]),files=new Map([...sources].map(([path,source])=>[path,ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)]));
 const options={noEmit:true,noLib:true,strict:true,target:ts.ScriptTarget.Latest,module:ts.ModuleKind.ESNext},host={getSourceFile:path=>files.get(path),getDefaultLibFileName:()=>'/lib.d.ts',writeFile:()=>assert.fail('no native emit'),getCurrentDirectory:()=>'/','getDirectories':()=>[],fileExists:path=>files.has(path),readFile:path=>sources.get(path),getCanonicalFileName:path=>path,useCaseSensitiveFileNames:()=>true,getNewLine:()=>'\n',resolveModuleNames:()=>[{resolvedFileName:'/module.ts',extension:ts.Extension.Ts}]};
 const program=ts.createProgram({rootNames:['/consumer.ts'],options,host});assert.deepEqual(program.getSemanticDiagnostics(files.get('/consumer.ts')).map(row=>ts.flattenDiagnosticMessageText(row.messageText,' ')),[]);
});
test('mixed constant declaration exports preserve source order and private neighboring bindings',limits,async()=>{
 const result=translatePortableModuleProject({entry:'index.mjs',language:'JavaScript',modules:[{path:'index.mjs',source:'export {publicValue as answer} from "./values.mjs";'},{path:'values.mjs',source:'export const privateValue=2,publicValue=3;'}]});
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.deepEqual(Object.keys(module),['answer']);assert.equal(module.answer,3);},{childTimeoutMs:20_000});
});
test('closed scalar type exports retain absence envelopes even when runtime functions do not use them',limits,()=>{
 const result=translatePortableModuleProject({entry:'index.ts',language:'TypeScript',modules:[{path:'index.ts',source:'export type {MaybeCount,Label,Nothing} from "./types.js"; export {count} from "./types.js";'},{path:'types.ts',source:'export type Maybe<T> = T|undefined; export type MaybeCount=Maybe<number>; export type Label=string; export type Nothing=null; export function count():number{return 3;}'}]});
 assert.match(result.rust,/pub type MaybeCount = JsOptional<f64>;/);assert.match(result.rust,/pub type Label = String;/);assert.match(result.rust,/pub type Nothing = JsNull;/);assert.match(result.rust,/pub enum JsOptional<T>/);assert.equal(result.modulePublicAPIHistory.rustScalarTypes.rows.length,3);
});
test('generic public aliases cannot silently lose their written constraints in Rust',limits,()=>{
 assert.throws(()=>translatePortableModuleProject({entry:'index.ts',language:'TypeScript',modules:[{path:'index.ts',source:'export type Maybe<T extends number> = T|undefined; export function count():number{return 3;}'}]}),/public generic alias constraints/);
});
test('namespace objects default names and missing reexport owners keep explicit refusals',limits,()=>{
 for(const entry of ['export * as namespace from "./helper.mjs";','export {twice as default} from "./helper.mjs";','export {missing} from "./helper.mjs";']){const input=aliases();input.modules[0].source=entry;assert.throws(()=>translatePortableModuleProject(input));}
});
test('all public target aliases retain complete language and repository source inverses',limits,()=>{
 const result=translatePortableModuleProject(aliases());assert.deepEqual(result.modulePublicAPIHistory.equations.map(row=>row.language),['JavaScript','TypeScript','Rust']);for(const row of result.modulePublicAPIHistory.equations){assert.equal(row.stages.length,2);assert.equal(typeof row.stages[0].inverse,'string');assert.equal(typeof row.stages[1].inverse,'string');}
 const plan=prepareModulePublicAPI();assert.equal(plan.files.length,1);const row=plan.files[0];assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);
});
