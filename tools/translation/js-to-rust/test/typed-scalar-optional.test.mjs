// Source-only behavioral/refusal regressions for the complete drafting phase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateTypeScript} from '../typed-portable.mjs';
import {evaluate} from '../typed-absence-interpreter.mjs';
import {parseMeta} from '../typed-absence-translator.mjs';
import {prepareTypedScalarOptional} from '../../prepare-typed-scalar-optional.mjs';
import {prepareTypedScalarDefaults} from '../../prepare-typed-scalar-defaults.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};

test('optional scalar parameters retain actual question source and native omitted-call arguments',limits,async()=>{
 const source='export function optional(value?:number):number|undefined{return value;} export function omitted():number|undefined{return optional();} export function supplied(value:number):number|undefined{return optional(value);}',result=translateTypeScript(source),parsed=parseMeta(result.meta);
 const optional=result.typeAnnotationHistory.contracts.find(row=>row.name==='optional').parameters[0];assert.equal(optional.type,'number|undefined');assert.equal(source.slice(...optional.optionalSource.span),'?');assert.equal(result.typeAnnotationHistory.callArguments.calls.find(row=>row.name==='optional'&&row.supplied===0).optionalAppended,1);assert.equal(result.typeAnnotationHistory.equations[0].inverse,source);
 assert.equal(evaluate(parsed,'omitted',[]),undefined);for(const value of [0,-0,1,Infinity,NaN])assert.ok(Object.is(evaluate(parsed,'supplied',[value]),value));
 assert.match(result.typescript,/value\?: number \| undefined/);assert.ok(result.optionalTargetHistory);assert.equal(result.optionalTargetHistory.equation.inverse.includes('value?:'),false);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.optional(),undefined);assert.equal(module.omitted(),undefined);assert.ok(Object.is(module.supplied(-0),-0));},{childTimeoutMs:20_000});
});
test('strict TypeScript consumers can omit the restored public optional argument',limits,async()=>{
 const result=translateTypeScript('export function lookup(value?:string):string|undefined{return value;}');
 const consumer='\nexport function externalConsumer(){return lookup();}\n';
 await verifyTypedTargets({...result,javascript:result.javascript+consumer,typescript:result.typescript+consumer},(_api,_result,module)=>{assert.equal(module.externalConsumer(),undefined);assert.equal(module.lookup('λ😀'),'λ😀');},{childTimeoutMs:20_000});
});
test('multiple optional arguments and mixed closed defaults preserve evaluation positions',limits,async()=>{
 const source='function total(first:number=2,second?:number,third?:number):number{if(second===undefined){return first;}if(third===undefined){return first+second;}return first+second+third;} export function none():number{return total();} export function one():number{return total(1);} export function two():number{return total(1,3);} export function three():number{return total(undefined,3,4);}',result=translateTypeScript(source),parsed=parseMeta(result.meta);
 for(const [name,wanted]of [['none',2],['one',1],['two',4],['three',9]])assert.equal(evaluate(parsed,name,[]),wanted);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.none(),2);assert.equal(module.one(),1);assert.equal(module.two(),4);assert.equal(module.three(),9);},{childTimeoutMs:20_000});
});
test('trailing commas comments and UTF16 source positions retain complete original equations',limits,()=>{
 const source='const label:string="😀"; function read(value?:number /* ) parameter comment */):number|undefined{return value;} export function empty():number|undefined{return read(/* ) call comment */);} export function one():number|undefined{return read(1,/* trailing */);} export function labelValue():string{return label;}',result=translateTypeScript(source),parsed=parseMeta(result.meta);
 assert.equal(evaluate(parsed,'empty',[]),undefined);assert.equal(evaluate(parsed,'one',[]),1);assert.equal(evaluate(parsed,'label_value',[]),'😀');assert.equal(result.typeAnnotationHistory.equations[0].inverse,source);
 const edits=result.typeAnnotationHistory.callArguments.edits;assert.equal(edits.length,1);assert.equal(source.slice(edits[0].span[0],edits[0].span[1]),'');assert.equal(source[edits[0].span[0]],')');
});
test('native symbols keep local argument changes separate from shadowed callable parameters',limits,()=>{
 assert.throws(()=>translateTypeScript('function target(value?:number):number|undefined{return value;} export function wrong(target:number):number{return target();}'));
 assert.throws(()=>translateTypeScript('function target(value:number|undefined):number|undefined{return value;} export function wrong():number|undefined{return target();}'),/required call argument/);
 assert.throws(()=>translateTypeScript('function target(value?:number):number|undefined{return value;} export function wrong():number|undefined{return target(1,2);}'),/excessive/);
});
test('optional domains required ordering spread and unguarded reads keep explicit refusals',limits,()=>{
 for(const source of [
  'export function wrong(value?:number):number{return value+1;}',
  'export function wrong(value?:number|null):number|null|undefined{return value;}',
  'export function wrong(value?:null):null|undefined{return value;}',
  'export function wrong(first?:number,second:number):number{return second;}',
  'export function wrong(...values:number[]):number{return 1;}',
  'function target(value?:number):number|undefined{return value;} export function wrong():number|undefined{return target(...[1]);}',
 ])assert.throws(()=>translateTypeScript(source));
});
test('complete optional/default source layers keep the current frontend and original refusal source',limits,()=>{
 const plan=prepareTypedScalarOptional();assert.equal(plan.files.length,2);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);}
 const defaults=prepareTypedScalarDefaults().files[0];assert.equal(defaults.current,defaults.currentAfter);assert.equal(defaults.laterHistories[0].before,defaults.after);assert.equal(defaults.laterHistories[0].after,plan.files[0].after);
});
