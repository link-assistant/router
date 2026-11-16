// Independent actual project fixture source. No execution during drafting.
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from '../js-to-rust/test/owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../owned-outcome-native-source.mjs';
import {OWNED_OUTCOME_NATIVE_INPUTS,ownedOutcomeUnitRuntimeSources} from '../owned-outcome-unit.mjs';
import {planUnitSynchronization} from '../synchronize-owned-project-units.mjs';
import {installFreshAsyncSourceProposal} from '../unit-runtime-materialization.mjs';
import {planOwnedPeerReconciliation,applyOwnedPeerReconciliation} from '../owned-peer-reconcile-20261101.mjs';
export const OWNED_PEER_SOURCE=`import {primitiveBitwise as bitwise} from "../runtime/primitive-operator-runtime.mjs";
import {router_carrier_json_ok as ok,router_carrier_json_err as err,router_carrier_json_result_copy as copy,router_carrier_json_result_to_option as optional,router_carrier_json_option_or as optionalOr} from "../runtime/owned-outcome-runtime.mjs";
/** @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} left @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} right */
export function combined(left,right){return bitwise(left,right,"|",8,false);}
/** @param {ReturnType<typeof ok>} value */
export function changed(value){if(value.$==='Err'){return err("old");}return copy(value);}
/** @param {ReturnType<typeof ok>} value @param {import("../runtime/json-macro-runtime.mjs").JsonValue} fallback */
export function recovered(value,fallback){const option=optional(value);return optionalOr(option,fallback);}
`;
export async function ownedPeerFixture(t,{source=OWNED_PEER_SOURCE,primitiveOperators=true}={}){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-owned-peer-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const write=(path,value)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),value);},read=path=>fs.readFileSync(join(root,path),'utf8'),git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','user.name=Owned peer fixture','-c','user.email=fixture@example.invalid',...args],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024}),commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Exact owned peer epoch']);};git(['init','--quiet']);write('seed.txt','exact source baseline\n');commit();
 const unit={id:'owned-pair',profile:'owned-outcome',...(primitiveOperators?{primitiveOperators:true}:{}),authority:'auto',paths:{Rust:'rust/src/caller.rs',JavaScript:'js/src/caller.mjs',TypeScript:'ts/src/caller.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/caller.json',nativeSources:OWNED_OUTCOME_NATIVE_INPUTS.map(path=>({path,sourcePath:path==='Cargo.lock'?path:'rust/'+path}))},data=ownedStateReceivingData(),native=new Map(data.files.filter(row=>!row.path.startsWith('runtime/')).map(row=>[row.path,row.source]));native.set('src/lib.rs',native.get('src/lib.rs')+'pub mod translation_carriers_core;\n');native.set('src/translation_carriers_core.rs',OWNED_OUTCOME_NATIVE_SOURCE);for(const row of unit.nativeSources)write(row.sourcePath,native.get(row.path));for(const row of ownedOutcomeUnitRuntimeSources(unit))write(row.path,row.source);write('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="2"\n');write('package.json','{"private":true,"type":"module"}\n');write(unit.paths.JavaScript,source);write('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));
 const options={root,manifestPath:'units.json'},bootstrap=planUnitSynchronization(options);await installFreshAsyncSourceProposal(JSON.stringify(bootstrap),()=>planUnitSynchronization(options));commit();
 const edit=(before,after)=>{for(const language of ['JavaScript','TypeScript']){const path=unit.paths[language],original=read(path),changed=original.replaceAll(before,after);if(changed===original)throw Error('Independent source edit marker missing: '+language+' '+before);write(path,changed);}};
 return {root,unit,source,options,write,read,git,commit,edit,plan:()=>planOwnedPeerReconciliation(options),apply:proposal=>applyOwnedPeerReconciliation(JSON.stringify(proposal),options)};
}
