// Independent integration regression SOURCE. No execution during bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,symlinkSync,chmodSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {planUnitRuntimeMaterialization,applyUnitRuntimeMaterialization} from '../unit-runtime-materialization.mjs';
import {prepareUnitRuntimeMaterialization} from '../prepare-unit-runtime-materialization.mjs';
import {sourceUnitArguments} from '../../../scripts/sync-router-units.mjs';
const limits={timeout:60_000};
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-runtime-materialization-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'});
 git(['init','--quiet']);write('seed.txt','runtime baseline\n');git(['add','seed.txt']);git(['commit','--quiet','-m','Runtime baseline']);
 const unit={id:'example',profile:'portable',authority:'auto',paths:{Rust:'rust/src/example.rs',JavaScript:'js/src/example.mjs',TypeScript:'ts/src/example.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/example.json'},manifest={schema:'router-source-unit-sync-v1',units:[unit]};
 const source='// Artifact initialization must not translate this unsupported application.\nexport class NativeAdapter {}\n';write(unit.paths.JavaScript,source);write('units.json',JSON.stringify(manifest));
 const options={root,manifestPath:'units.json'};return {root,unit,manifest,source,write,options,plan:()=>planUnitRuntimeMaterialization(options),apply:value=>applyUnitRuntimeMaterialization(JSON.stringify(value),options)};
}
test('complete registered runtime and declaration assets initialize both language roots without source translation',limits,async t=>{
 const api=fixture(t),proposal=api.plan();assert.equal(proposal.schema,'router-source-unit-runtime-materialization-v1');assert.equal(proposal.rustExecuted,false);assert.equal(proposal.runtimeParity,false);assert.equal(proposal.crossInvocationCache,false);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.ok(proposal.outputs.some(row=>row.path==='js/runtime/json-state-runtime.mjs'));assert.ok(proposal.outputs.some(row=>row.path==='ts/runtime/json-state-runtime.d.mts'));assert.ok(proposal.outputs.some(row=>/LICENSE|NOTICE/u.test(row.path)));
 const applied=api.apply(proposal);assert.equal(applied.schema,proposal.schema);assert.equal(readFileSync(join(api.root,api.unit.paths.JavaScript),'utf8'),api.source);assert.equal(existsSync(join(api.root,api.unit.paths.Rust)),false);assert.equal(existsSync(join(api.root,api.unit.paths.TypeScript)),false);
 const state=await import(pathToFileURL(join(api.root,'js/runtime/json-state-runtime.mjs')).href),json=await import(pathToFileURL(join(api.root,'js/runtime/json-macro-runtime.mjs')).href),base=json.json_macro_array([]),value=json.json_macro_string('λ😀');assert.deepEqual(state.router_state_json_append(base,value),json.json_macro_array([value]));assert.deepEqual(base,json.json_macro_array([]));
 const next=api.plan();assert.equal(next.outputs.every(row=>row.before===row.after),true);assert.deepEqual(api.apply(next).changed,[]);
});
test('fresh installation rejects changed application inputs and forged runtime proposals',limits,t=>{
 const api=fixture(t),proposal=api.plan(),forged=structuredClone(proposal);forged.outputs.find(row=>row.path.endsWith('/json-state-runtime.mjs')).after+='\n// forged\n';assert.throws(()=>api.apply(forged),/fresh source translation/);assert.equal(existsSync(join(api.root,'js/runtime/json-state-runtime.mjs')),false);
 api.write(api.unit.paths.JavaScript,api.source+'\n// concurrent edit\n');assert.throws(()=>api.apply(proposal),/fresh source translation/);assert.equal(existsSync(join(api.root,'js/runtime/json-state-runtime.mjs')),false);
});
test('existing artifact originals inverses and modes survive a reviewed replacement',limits,t=>{
 const api=fixture(t),path='js/runtime/json-state-runtime.mjs',before='// complete previous generated artifact\n';api.write(path,before);chmodSync(join(api.root,path),0o750);const proposal=api.plan(),row=proposal.outputs.find(row=>row.path===path);assert.equal(row.before,before);assert.equal(row.inverse,before);api.apply(proposal);assert.equal(readFileSync(join(api.root,path),'utf8'),row.after);if(process.platform!=='win32')assert.equal(statSync(join(api.root,path)).mode&0o777,0o750);
});
test('runtime roots cannot traverse links or overwrite source or metadata paths',limits,t=>{
 const api=fixture(t);mkdirSync(join(api.root,'external'),{recursive:true});mkdirSync(join(api.root,'js'),{recursive:true});symlinkSync('../external',join(api.root,'js/runtime'),'dir');assert.throws(api.plan,/linked or non-directory/);rmSync(join(api.root,'js/runtime'));
 api.unit.paths.JavaScript='js/runtime/json-macro-runtime.mjs';api.write('units.json',JSON.stringify(api.manifest));assert.throws(api.plan,/overwrite a source descriptor/);assert.equal(existsSync(join(api.root,'js/runtime/json-macro-runtime.mjs')),false);
});
test('runtime mode keeps the existing worker resource limits and complete source-copy histories',limits,()=>{
 const args=sourceUnitArguments(['--manifest','units.json','--plan','runtime.json','--runtime-only']);assert.equal(args.runtimeOnly,true);assert.throws(()=>sourceUnitArguments(['--manifest','units.json','--plan','runtime.json','--runtime-only','--runtime-only']),/Repeated/);
 const proposal=prepareUnitRuntimeMaterialization();assert.equal(proposal.files.length,2);for(const row of proposal.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(proposal.receivingExecuted,false);
});
