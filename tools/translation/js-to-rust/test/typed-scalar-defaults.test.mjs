// Independent source only; execution is deferred until every requirement draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateTypeScript} from '../typed-portable.mjs';
import {evaluate} from '../typed-absence-interpreter.mjs';
import {parseMeta} from '../typed-absence-translator.mjs';
import {prepareTypedScalarDefaults} from '../../prepare-typed-scalar-defaults.mjs';
import {prepareTypedScalarAbsence} from '../../prepare-typed-scalar-absence.mjs';
import {prepareGenericScalarAliases} from '../../prepare-generic-scalar-aliases.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};

test('closed numeric defaults keep missing undefined and explicit zero behavior distinct',limits,async()=>{
 const source='type Amount<T extends number=number>=T; export function amount(value:Amount=3):number{return value*2;} export function omitted():number{return amount();} export function explicit():number{return amount(undefined);}',result=translateTypeScript(source),parsed=parseMeta(result.meta);
 const parameter=result.typeAnnotationHistory.contracts.find(row=>row.name==='amount').parameters[0];assert.equal(parameter.type,'number');assert.equal(parameter.defaultSource.source,'3');assert.equal(source.slice(...parameter.defaultSource.span),'3');assert.equal(result.typeAnnotationHistory.equations[0].inverse,source);assert.match(result.rust,/Option<f64>/);
 for(const [args,wanted]of [[[],6],[[undefined],6],[[0],0],[[-0],-0],[[1],2],[[Infinity],Infinity],[[NaN],NaN]])assert.ok(Object.is(evaluate(parsed,'amount',args),wanted));
 assert.equal(evaluate(parsed,'omitted',[]),6);assert.equal(evaluate(parsed,'explicit',[]),6);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.amount(),6);assert.equal(module.amount(undefined),6);assert.ok(Object.is(module.amount(-0),-0));assert.equal(module.omitted(),6);assert.equal(module.explicit(),6);},{childTimeoutMs:20_000});
});
test('closed string boolean and signed-zero initializer source survives annotation substitutions',limits,async()=>{
 const source='export function text(value:string="λ😀"):string{return value;} export function flag(value:boolean=false):boolean{return value;} export function zero(value:number=-0):number{return value;}',result=translateTypeScript(source),parsed=parseMeta(result.meta);
 assert.equal(evaluate(parsed,'text',[]),'λ😀');assert.equal(evaluate(parsed,'flag',[]),false);assert.ok(Object.is(evaluate(parsed,'zero',[]),-0));
 const defaults=result.typeAnnotationHistory.contracts.map(row=>row.parameters[0].defaultSource);for(const value of defaults)assert.equal(source.slice(...value.span),value.source);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.text(),'λ😀');assert.equal(module.text(''),'');assert.equal(module.flag(),false);assert.equal(module.flag(true),true);assert.ok(Object.is(module.zero(),-0));assert.ok(Object.is(module.zero(0),0));},{childTimeoutMs:20_000});
});
test('a default before a required argument keeps exact call arity and explicit undefined',limits,()=>{
 const source='function total(left:number=2,right:number):number{return left+right;} export function run():number{return total(undefined,3);}',result=translateTypeScript(source),parsed=parseMeta(result.meta);assert.equal(evaluate(parsed,'run',[]),5);
 assert.throws(()=>translateTypeScript('function total(left:number=2,right:number):number{return left+right;} export function run():number{return total();}'));
});
test('closed defaults still require their actual written scalar domain',limits,()=>{
 for(const source of [
  'export function wrong(value:number="x"):number{return value;}',
  'export function wrong(value:boolean=1):boolean{return value;}',
  'export function wrong(value:number=undefined):number{return value;}',
  'export function wrong(value:number|null=1):number|null{return value;}',
  'export function wrong(value:number|undefined=1):number|undefined{return value;}',
  'export function wrong(value:number,other:number=value):number{return other;}',
  'function defaultValue():number{return 1;} export function wrong(value:number=defaultValue()):number{return value;}',
  'export function wrong(value=1):number{return value;}',
 ])assert.throws(()=>translateTypeScript(source));
});
test('all adjacent source layers retain original frontend equations and the latest complete source',limits,()=>{
 const defaults=prepareTypedScalarDefaults(),row=defaults.files[0];assert.equal(row.current,row.currentAfter);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);
 const absence=prepareTypedScalarAbsence().files.find(value=>value.path===row.path);assert.equal(absence.currentAfter,row.currentAfter);assert.equal(absence.laterHistories[0].before,absence.after);assert.equal(absence.laterHistories[0].after,row.currentAfter);
 const aliases=prepareGenericScalarAliases().files[0];assert.equal(aliases.currentAfter,row.currentAfter);assert.equal(aliases.laterHistories[0].laterHistories[0].after,row.currentAfter);assert.equal(aliases.laterHistories[0].laterHistories[0].laterHistories[0].after,row.currentAfter);
});
