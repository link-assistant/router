// Regression source only; execute after the entire requirement draft exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateTypeScript} from '../typed-portable.mjs';
import {translatePortableModuleProject} from '../module-project.mjs';
import {prepareGenericScalarAliases} from '../../prepare-generic-scalar-aliases.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};
const identity=(aliases,type)=>aliases+' export function identity(value:'+type+'):'+type+'{return value;}';
for(const [aliases,type,wanted]of [
 ['type Identity<T>=T;','Identity<number>','number'],
 ['type Identity<T>=T;','Identity<string>','string'],
 ['type Maybe<T>=T|undefined;','Maybe<boolean>','boolean|undefined'],
 ['type Nullable<T>=null|T;','Nullable<string>','string|null'],
 ['type Identity<T>=T; type Maybe<T>=Identity<T>|undefined;','Maybe<number>','number|undefined'],
 ['type Maybe<T=number>=T|undefined;','Maybe','number|undefined'],
 ['type Scalar<T extends number|string=number>=T;','Scalar<string>','string'],
 ['type Scalar<T extends number|string=number>=T;','Scalar','number'],
 ['type Pair<A,B extends A=A>=B;','Pair<number>','number'],
 ['type Same<T>=T|T;','Same<boolean>','boolean'],
])test('generic scalar alias resolves '+type+' through '+aliases,limits,()=>{
 const source=identity(aliases,type),result=translateTypeScript(source),history=result.typeAnnotationHistory;
 assert.equal(history.contracts[0].parameters[0].type,wanted);assert.equal(history.contracts[0].returns,wanted);
 assert.equal(history.equations[0].inverse,source);assert.ok(history.aliasInstantiations.length>=2);
 assert.ok(history.aliasInstantiations.every(row=>row.sourceAuthority===false&&row.semanticAuthority===false));
 assert.ok(result.javascript.includes('@param {'+wanted+'} value'));assert.equal(result.wholeRouterSynchronization,false);
});
test('default and constrained alias instantiations retain their written substitution history',limits,()=>{
 const source=identity('type Scalar<T extends number|string=number>=T;','Scalar'),result=translateTypeScript(source);
 const actual=result.typeAnnotationHistory.aliasInstantiations.find(row=>row.name==='Scalar');assert.ok(actual);
 assert.deepEqual(actual.substitutions,[{name:'T',domain:['number'],constraint:['number','string'],defaultSelected:true}]);
 assert.equal(source.slice(...actual.span),'type Scalar<T extends number|string=number>=T;');
});
test('generic aliases preserve numeric edge values in independently emitted targets',limits,async()=>{
 const result=translateTypeScript(identity('type Identity<T extends number>=T;','Identity<number>'));
 await verifyTypedTargets(result,(_api,_result,module)=>{for(const value of [0,-0,1,-1,0.5,Number.MAX_VALUE,Number.MIN_VALUE,Infinity,-Infinity,NaN])assert.ok(Object.is(module.identity(value),value));},{childTimeoutMs:20_000});
});
test('separate native modules link generic alias symbols before typed semantic checking',limits,()=>{
 const result=translatePortableModuleProject({entry:'entry.ts',language:'TypeScript',modules:[
  {path:'entry.ts',source:'import {type Identity,type Maybe} from "./types.js"; export function identity(value:Maybe<Identity<number>>):Maybe<Identity<number>>{return value;}'},
  {path:'types.ts',source:'export type Identity<T>=T; export type Maybe<T>=T|undefined;'},
 ]});assert.equal(result.typeAnnotationHistory.contracts[0].parameters[0].type,'number|undefined');assert.equal(result.moduleSourceHistory.modules.length,2);
});
for(const [aliases,type]of [
 ['type Scalar<T extends number>=T;','Scalar<string>'],
 ['type Scalar<T extends number=string>=T;','Scalar'],
 ['type Pair<T,U extends T>=U;','Pair<number,string>'],
 ['type Identity<T>=T;','Identity'],
 ['type Identity<T>=T;','Identity<number,string>'],
 ['type Cycle<T>=Cycle<T>;','Cycle<number>'],
 ['type A<T>=B<T>;type B<T>=A<T>;','A<number>'],
 ['type Later<T=U,U=number>=T;','Later'],
 ['type Conditional<T>=T extends number?number:string;','Conditional<number>'],
 ['type RecordType<T>={value:T};','RecordType<number>'],
 ['type Asserted<T>=T[];','Asserted<number>'],
 ['type Identity<T>=T;','Identity<any>'],
 ['type Identity<T>=T;','Identity<unknown>'],
 ['type Maybe<T>=T|null|undefined;','Maybe<number>'],
 ['type Mixed<T>=T|boolean;','Mixed<number>'],
])test('unsupported or violated generic scalar contract stays refused: '+aliases+' '+type,limits,()=>{
 assert.throws(()=>translateTypeScript(identity(aliases,type)),TypeError);
});
test('generic type substitution cannot replace a mismatching checked function body or local value',limits,()=>{
 assert.throws(()=>translateTypeScript('type Identity<T>=T; export function wrong(value:Identity<number>):Identity<string>{return value;}'));
 assert.throws(()=>translateTypeScript('type Identity<T>=T; export function wrong(value:Identity<number>):number{const local:Identity<boolean>=value;return value;}'));
 assert.throws(()=>translateTypeScript('export function identity<T>(value:T):T{return value;}'),/nongeneric scalar function/);
});
test('generic alias source copy keeps the full original frontend and both CST inverses',limits,()=>{
 const plan=prepareGenericScalarAliases();assert.equal(plan.files.length,1);const row=plan.files[0];
 assert.equal(row.current,row.currentAfter);assert.equal(row.laterHistories.length,1);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
});
