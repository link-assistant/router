// Independent physical HTTP source-unit regression SOURCE; all cases unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {planUnitSynchronization,applyUnitSynchronization} from '../synchronize-units.mjs';
import {planUnitRuntimeMaterialization,applyUnitRuntimeMaterialization} from '../unit-runtime-materialization.mjs';
import {HTTP_RESOURCE_NATIVE_INPUTS,httpResourceUnitRuntimeSources} from '../http-resource-unit.mjs';
import {httpResourceOptionCallbackReceivingData as httpDeadlineReceivingData} from '../js-to-rust/test/http-resource-option-callback-receiving-data.mjs';
import {HTTP_DEADLINE_NATIVE_SOURCE} from '../http-deadline-native-source.mjs';
import {prepareHttpResourceUnitSources} from '../prepare-http-resource-unit-sources.mjs';
const limits={timeout:60000};
function fixture(t,{runtimes=true}={}){
 const root=mkdtempSync(join(tmpdir(),'router-http-unit-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);},read=path=>readFileSync(join(root,path),'utf8'),git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe',timeout:20000}),commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Source baseline']);};git(['init','--quiet']);write('seed.txt','source baseline\n');commit();
 const unit={id:'http-deadline',profile:'http-resource',authority:'auto',paths:{Rust:'rust/src/caller.rs',JavaScript:'js/src/caller.mjs',TypeScript:'ts/src/caller.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/caller.json',nativeSources:HTTP_RESOURCE_NATIVE_INPUTS.concat(['src/translation_primitive_option_callbacks_core.rs']).map(path=>({path,sourcePath:path==='Cargo.lock'?path:'rust/'+path}))};
 const data=httpDeadlineReceivingData(),native=new Map(data.files.filter(row=>!row.path.startsWith('runtime/')).map(row=>[row.path,row.source]));for(const row of unit.nativeSources)write(row.sourcePath,native.get(row.path));if(runtimes)for(const row of httpResourceUnitRuntimeSources(unit))write(row.path,row.source);
 const source="import {router_option_bool_some as some} from '../runtime/primitive-option-runtime.mjs';\nimport {router_option_callback_bool_to_u64_map as map} from '../runtime/primitive-option-callback-runtime.mjs';\nexport function chosen(){return map(some(true),value=>{if(value){return 0n;}else{return 0n;}});}\n";write(unit.paths.JavaScript,source);write('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));const options={root,manifestPath:'units.json'};return {root,unit,source,write,read,commit,options,plan:()=>planUnitSynchronization(options),apply:value=>applyUnitSynchronization(JSON.stringify(value),options)};
}





export {fixture as httpResourceOptionCallbackUnitFixture};
