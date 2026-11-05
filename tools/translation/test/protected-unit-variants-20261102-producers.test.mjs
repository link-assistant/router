// Independent full original producer case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import * as portable from '../synchronize-units.mjs';
import * as owned from '../synchronize-owned-project-units.mjs';
import * as runtime from '../owned-project-runtime-materialization.mjs';
const limits={timeout:60000,concurrency:false};
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'protected-unit-producer-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(path,text)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),text);};
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','maintenance.auto=false','-c','gc.auto=0','-c','user.name=Independent fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe',timeout:10000});git(['init','--quiet']);put('seed','baseline');git(['add','seed']);git(['commit','--quiet','-m','Independent original source baseline']);
 const unit={id:'identity',profile:'portable',authority:'auto',paths:{Rust:'rust/src/identity.rs',JavaScript:'js/src/identity.mjs',TypeScript:'ts/src/identity.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/identity.json'};
 put(unit.paths.JavaScript,'/** @param {number} value @returns {number} */\nexport function identity(value){return value;}\n');put('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));
 const policy=(authored=[],unmanaged=[])=>put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged}));return {root,put,unit,policy,options:{root,manifestPath:'units.json'}};
}
for(const [label,plan,apply]of [['portable',portable.planUnitSynchronization,portable.applyUnitSynchronization],['owned',owned.planUnitSynchronization,owned.applyUnitSynchronization],['owned-runtime synchronizer',runtime.planUnitSynchronization,runtime.applyUnitSynchronization],['owned-runtime initialization',runtime.planUnitRuntimeMaterialization,runtime.applyUnitRuntimeMaterialization]]){
 test(label+' actual full fresh producer refuses protected output before any target creation',limits,t=>{const a=fixture(t);a.policy();const proposal=plan(a.options),target=proposal.outputs.find(row=>row.before!==row.after);assert.ok(target);a.policy([target.path]);assert.throws(()=>apply(JSON.stringify(proposal),a.options),/authored\/unmanaged/u);for(const row of proposal.outputs)assert.equal(fs.existsSync(join(a.root,row.path)),row.before!==null);});
 test(label+' original complete fresh-production and ordinary mode/result behavior remain',limits,t=>{const a=fixture(t);a.policy();const proposal=plan(a.options),forged=structuredClone(proposal);forged.outputs[0].after+='\n// changed submitted source\n';assert.throws(()=>apply(JSON.stringify(forged),a.options),/complete fresh source translation/u);const result=apply(JSON.stringify(proposal),a.options);assert.equal(result.rustExecuted,false);for(const row of proposal.outputs){assert.equal(fs.readFileSync(join(a.root,row.path),'utf8'),row.after);assert.equal(fs.statSync(join(a.root,row.path)).mode&0o777,row.before===null?row.mode&~process.umask():row.mode);}assert.equal(fs.readFileSync(join(a.root,a.unit.paths.JavaScript),'utf8'),'/** @param {number} value @returns {number} */\nexport function identity(value){return value;}\n');});
}
