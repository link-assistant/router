// Tiny independent native-VM reproduction; not complete producer qualification.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';

const path='tools/translation/prepare-concrete-equation-transaction.mjs',source=readFileSync(path,'utf8');
assert.ok(source.length<262144);
const prefixes=['const physicalSourceMismatchErrors=','export function isConcreteEquationPhysicalSourceMismatch(','function physicalSourceMismatch('];
const declarations=prefixes.map(prefix=>{const rows=source.split('\n').filter(line=>line.startsWith(prefix));assert.equal(rows.length,1);return rows[0].replace(/^export /u,'');});
const observations=runInNewContext(declarations.join('\n')+`\n(()=>{
 let genuine;try{physicalSourceMismatch('src/unknown.rs');}catch(error){genuine=error;}
 const copy=Object.create(Object.getPrototypeOf(genuine),Object.getOwnPropertyDescriptors(genuine));
 const before={genuine:isConcreteEquationPhysicalSourceMismatch(genuine),copy:isConcreteEquationPhysicalSourceMismatch(copy)};
 let calls=0;Reflect.apply=()=>{calls++;return true;};
 const after={genuine:isConcreteEquationPhysicalSourceMismatch(genuine),copy:isConcreteEquationPhysicalSourceMismatch(copy)};
 return {before,after,calls};
})()`);
console.log(JSON.stringify({schema:'isolated-actual-refusal-declaration-native-vm-probe-v1',path,source,sha256:createHash('sha256').update(source).digest('hex'),declarations,observations,completeProducerExecuted:false,sourceAuthority:false,runtimeAuthority:false}));
assert.equal(observations.before.genuine,true);assert.equal(observations.before.copy,false);
assert.equal(observations.after.genuine,true);assert.equal(observations.after.copy,false);
assert.equal(observations.calls,0);
