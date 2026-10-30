// Source-only regressions. No tests may run until the whole bulk draft exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateTypeScript} from '../typed-portable.mjs';
import {translateJavaScript as legacyTranslate} from '../translator.mjs';
import {parseMeta} from '../typed-absence-translator.mjs';
import {evaluate} from '../typed-absence-interpreter.mjs';
import {parseLinks,writeLink} from '../vendor/lino.mjs';
import {prepareTypedScalarAbsence} from '../../prepare-typed-scalar-absence.mjs';
import {prepareGenericScalarAliases} from '../../prepare-generic-scalar-aliases.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};

test('nullable string parameters have owned Rust envelopes and preserve repeated source reads',limits,async()=>{
 const source='export function choose(value:string|null,other:string|null):string|null{if(value===null){return other;}return value+value;}',result=translateTypeScript(source);
 assert.equal(result.semanticProfile,'portable-router-scalar-absence-v1');assert.match(result.rust,/JsNullable<String>/);assert.match(result.rust,/checked absence guard/);assert.equal(result.typeAnnotationHistory.equations[0].inverse,source);
 const cases=[[null,null,null],[null,'x','x'],['','x',''],['😀','x','😀😀'],['λ',null,'λλ']];
 const parsed=parseMeta(result.meta);for(const [value,other,wanted]of cases)assert.equal(evaluate(parsed,'choose',[value,other]),wanted);
 await verifyTypedTargets(result,(_api,_result,module)=>{for(const [value,other,wanted]of cases)assert.equal(module.choose(value,other),wanted);},{childTimeoutMs:20_000});
});
test('undefined numeric guards preserve signed zero NaN infinities and actual short circuiting',limits,async()=>{
 const source='export function identity(value:number|undefined):number|undefined{if(value!==undefined){return value;}return undefined;} export function positive(value:number|undefined):boolean{if(value!==undefined&&value>0){return true;}return false;}',result=translateTypeScript(source),parsed=parseMeta(result.meta);
 const values=[undefined,0,-0,1,-1,Number.MIN_VALUE,Number.MAX_VALUE,Infinity,-Infinity,NaN];
 for(const value of values){assert.ok(Object.is(evaluate(parsed,'identity',[value]),value));assert.equal(evaluate(parsed,'positive',[value]),value!==undefined&&value>0);}
 await verifyTypedTargets(result,(_api,_result,module)=>{for(const value of values){assert.ok(Object.is(module.identity(value),value));assert.equal(module.positive(value),value!==undefined&&value>0);}},{childTimeoutMs:20_000});
});
test('typeof guards distinguish nullable objects undefined and their actual present scalar domains',limits,async()=>{
 const source='export function typeOf(value:number|null):string{return typeof value;} export function numeric(value:number|undefined):number{if(typeof value!=="undefined"){return value+1;}return 0;} export function label(value:string|null):string{if(typeof value==="string"){return value;}return "missing";}',result=translateTypeScript(source),parsed=parseMeta(result.meta);
 assert.match(result.rust,/JsNullable::Value/);assert.match(result.rust,/JsOptional::Value/);
 for(const [name,args,wanted]of [['type_of',[null],'object'],['type_of',[3],'number'],['numeric',[undefined],0],['numeric',[2],3],['label',[null],'missing'],['label',['λ'],'λ']])assert.equal(evaluate(parsed,name,args),wanted);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.typeOf(null),'object');assert.equal(module.typeOf(1),'number');assert.equal(module.numeric(undefined),0);assert.equal(module.numeric(2),3);assert.equal(module.label(null),'missing');assert.equal(module.label('λ'),'λ');},{childTimeoutMs:20_000});
});
test('truthy present edges refine while false edges retain their entire absence domain',limits,async()=>{
 const source='export function add(value:number|undefined):number{if(value){return value+1;}return 0;} export function echo(value:string|null):string|null{if(value){return value;}return value;}',result=translateTypeScript(source),parsed=parseMeta(result.meta);
 for(const [value,wanted]of [[undefined,0],[0,0],[-0,0],[NaN,0],[1,2],[-1,0],[Infinity,Infinity]])assert.ok(Object.is(evaluate(parsed,'add',[value]),wanted));
 for(const value of [null,'','x','😀'])assert.equal(evaluate(parsed,'echo',[value]),value);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.add(undefined),0);assert.equal(module.add(NaN),0);assert.equal(module.add(2),3);for(const value of [null,'','😀'])assert.equal(module.echo(value),value);},{childTimeoutMs:20_000});
});
test('actual call signatures lift only matching primitive or absence operands into Rust envelopes',limits,()=>{
 const source='function accept(value:string|null):string|null{return value;} export function missing():string|null{return accept(null);} export function present(value:string):string|null{return accept(value);} export function again(value:string|null):string|null{return accept(value);}',result=translateTypeScript(source),parsed=parseMeta(result.meta);
 assert.equal(evaluate(parsed,'missing',[]),null);assert.equal(evaluate(parsed,'present',['x']),'x');assert.equal(evaluate(parsed,'again',[null]),null);assert.match(result.rust,/JsNullable::Null/);assert.match(result.rust,/JsNullable::Value/);
 assert.throws(()=>translateTypeScript('function accept(value:number|null):number|null{return value;} export function wrong():number|null{return accept("wrong");}'));
});
test('unguarded scalar operations mismatched absence and union defaults remain explicit refusals',limits,()=>{
 for(const source of [
  'export function wrong(value:number|undefined):number{return value+1;}',
  'export function wrong(value:string|null):boolean{return value.startsWith("x");}',
  'export function wrong(value:number|null):number{return value;}',
  'export function wrong(value:number|null):number|undefined{return value;}',
  'export function wrong(value:number|undefined=1):number|undefined{return value;}',
 ])assert.throws(()=>translateTypeScript(source));
});
test('legacy JavaScript refusal is preserved and forged meta cannot borrow a branch refinement',limits,()=>{
 assert.throws(()=>legacyTranslate('/** @param {number|undefined} value @returns {number|undefined} */ export function identity(value){return value;}'));
 const result=translateTypeScript('export function safe(value:number|undefined):number{if(value===undefined){return 0;}return value+1;}');
 // Change the source-presence guard in the actual serialized document. The
 // unguarded addition must fail a fresh complete check after decoding.
 const links=parseLinks(result.meta);let changed=false;function replaceGuard(value){if(!Array.isArray(value))return;if(!changed&&value[0]==='if'){value[1]=['boolean','true'];changed=true;return;}for(const child of value)replaceGuard(child);}replaceGuard(links);
 assert.equal(changed,true);const wrong=links.map(writeLink).join('\n')+'\n';assert.notEqual(wrong,result.meta);assert.throws(()=>parseMeta(wrong));
});
test('source-copy layers retain all complete originals and never rewind a later typed frontend',limits,()=>{
 const current=prepareTypedScalarAbsence();assert.equal(current.files.length,6);
 for(const row of current.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);if(row.originalPath&&row.originalPath!==row.path)assert.equal(readFileSync(new URL('../../../../'+row.originalPath,import.meta.url),'utf8'),row.before);}
 const aliases=prepareGenericScalarAliases().files[0];assert.equal(aliases.current,aliases.currentAfter);assert.notEqual(aliases.after,aliases.currentAfter);assert.equal(aliases.laterHistories[0].before,aliases.after);assert.equal(aliases.laterHistories[0].equation.inverse,aliases.after);
});
