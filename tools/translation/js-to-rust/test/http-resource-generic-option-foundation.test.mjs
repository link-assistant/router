// Independent generic carrier ABI and source-producer SOURCE. All cases unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,copyFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {router_option_identity} from '../../primitive-option-runtime.mjs';
import {requireGenericOptionIdentitySources} from '../owned-primitive-option-contracts.mjs';
import {httpResourceReceivingData} from './http-resource-receiving-data.mjs';
import {translateHttpResourceCallerJavaScript} from '../http-resource-callers.mjs';
import {prepareGenericOptionLibrary} from '../../prepare-generic-option-library.mjs';
import {prepareGenericOptionFoundationSources} from '../../prepare-generic-option-foundation-sources.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE,PRIMITIVE_OPTION_RUNTIME_SOURCE,PRIMITIVE_OPTION_DECLARATIONS_SOURCE} from '../../primitive-option-native-source.mjs';
import {emitPrimitiveOptionDeclarations} from '../../primitive-option-contracts.mjs';
const limits={timeout:60000};
test('opaque whole carriers keep generic payload identity without observing fields or dropping values',()=>{
 const payload=new Proxy({},{get(){throw Error('payload must stay opaque');},ownKeys(){throw Error('payload must stay opaque');}}),some=Object.freeze({$:'Some',field0:payload}),none=Object.freeze({$:'None'});assert.strictEqual(router_option_identity(some),some);assert.strictEqual(router_option_identity(some).field0,payload);assert.strictEqual(router_option_identity(none),none);
});
test('complete original native and actual JS/dts body/declaration proofs remain fresh source data',limits,()=>{
 const input=httpResourceReceivingData(),files=new Map(input.files.map(row=>[row.path,row.source])),records=requireGenericOptionIdentitySources(files,{runtimeRoot:'runtime',declarationRoot:'runtime'});assert.ok(records.some(row=>row.path==='src/translation_primitive_option_core.rs'));assert.ok(records.some(row=>row.path==='runtime/primitive-option-runtime.mjs'));assert.ok(records.some(row=>row.path==='runtime/primitive-option-runtime.d.mts'));for(const row of records){assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);}
 assert.equal(emitPrimitiveOptionDeclarations(),PRIMITIVE_OPTION_DECLARATIONS_SOURCE);for(const path of ['src/translation_primitive_option_core.rs','runtime/primitive-option-runtime.mjs','runtime/primitive-option-runtime.d.mts']){const changed=new Map(files);changed.set(path,changed.get(path)+'\n');assert.throws(()=>requireGenericOptionIdentitySources(changed,{runtimeRoot:'runtime',declarationRoot:'runtime'}),/source|ABI/u);}
});
test('the new ABI contract cannot be used as an unchecked ordinary runtime call',limits,()=>{
 const source='import {router_option_identity as identity} from "./runtime/primitive-option-runtime.mjs";\n/** @param {boolean} value */\nexport function bad(value) { return identity(value); }',input={sourcePath:'caller.mjs',...httpResourceReceivingData([{path:'caller.mjs',source}])};assert.throws(()=>translateHttpResourceCallerJavaScript(source,input),/qualified type queries/u);
});
test('complete three-language library producers retain exact original CST inverses and current mirrors',limits,()=>{
 const plan=prepareGenericOptionLibrary();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.trace.map(step=>step.phase),['language','repository']);assert.equal(row.equation.inverse,row.before);}assert.equal(plan.files[0].after,PRIMITIVE_OPTION_NATIVE_SOURCE);assert.equal(plan.files[1].after,PRIMITIVE_OPTION_RUNTIME_SOURCE);assert.equal(plan.files[2].after,PRIMITIVE_OPTION_DECLARATIONS_SOURCE);assert.equal(plan.semanticAuthority,false);assert.equal(plan.rustExecuted,false);
});
test('original physical library snapshots can be drafted into a separate receiving source tree',limits,t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-generic-option-source-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const path='tools/translation/source-profiles/generic-option-foundation/complete-library-originals.json.gz',archive=readFileSync(new URL('../../source-profiles/generic-option-foundation/complete-library-originals.json.gz',import.meta.url)),original=JSON.parse(gunzipSync(archive));mkdirSync(dirname(join(directory,path)),{recursive:true});copyFileSync(new URL('../../source-profiles/generic-option-foundation/complete-library-originals.json.gz',import.meta.url),join(directory,path));for(const row of original.files){mkdirSync(dirname(join(directory,row.path)),{recursive:true});writeFileSync(join(directory,row.path),row.source);}
 const plan=prepareGenericOptionLibrary({root:directory});for(const row of plan.files){assert.equal(row.current,row.before);assert.equal(row.equation.inverse,row.before);assert.notEqual(row.after,row.before);}assert.equal(plan.receivingExecuted,false);
});
test('eleven complete compiler source equations retain owner bounds both phases and full inverses',limits,()=>{
 const plan=prepareGenericOptionFoundationSources();assert.equal(plan.files.length,11);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
