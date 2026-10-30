// Source-only native module preparation. Rust grammar verification is CI-only.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceItems} from './rust-structure.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {emitJsonFieldDeclarations} from './json-field-contracts.mjs';
import {prepareOwnedOutcomeCore} from './prepare-owned-outcome-core.mjs';
import {composeConcreteSourceHistory} from './compose-concrete-source-history.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/json-fields/';
const PIN='63afa552262b9667a54400918934dfa789c8f3eaa015b413ede2691bd554832f',hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Owned JSON fields core source: '+message);};
export function prepareJsonFieldsCore({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,BASE+'complete-rust-original.json.gz'));need(hash(packed)===PIN,'complete pinned native root original');
 const row=JSON.parse(gunzipSync(packed,{maxOutputLength:2097152}));need(row.schema==='owned-json-fields-Rust-source-v1'&&row.path==='rust/src/lib.rs'&&hash(row.source)===row.sha256&&Buffer.byteLength(row.source)===row.bytes,'complete original Rust root');
 const before=row.source;need(!sourceItems(before).some(item=>item.term==='mod'&&item.name==='translation_json_fields_core'),'original state module edge must be absent');
 const language=before+'\nmod translation_json_fields_core;\n',after=before+'\npub mod translation_json_fields_core;\n';
 const run=createRulePipeline([{phase:'language',rules:[{id:'rust:add-actual-owned-JSON-fields-library-module',apply:value=>{need(value===before,'whole original source join');return language;}}]},{phase:'repository',rules:[{id:'router:publish-explicit-native-fields-library-boundary',apply:value=>{need(value===language,'whole language join');return after;}}]}]).run(before);
 const modules=sourceItems(after).filter(item=>item.term==='mod'&&item.name==='translation_json_fields_core');need(modules.length===1&&after.slice(modules[0].start,modules[0].end).trim()==='pub mod translation_json_fields_core;','one actual public native state module edge');
 const stages=transportConcreteSourceEquations([{before,after:language,language:'Rust'},{before:language,after,language:'Rust'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(run.value===after&&stages[0].inverse===before&&stages[1].inverse===language,'complete native root source inverses');
 const history=composeConcreteSourceHistory({path:row.path,before,after,language:'Rust',laterPlans:[prepareOwnedOutcomeCore({root})]});const current=readFileSync(resolve(root,row.path),'utf8');need(current===before||current===after||current===history.currentAfter,'unknown full current native root');need(readFileSync(resolve(root,'tools/translation/json-fields-runtime.d.mts'),'utf8')===emitJsonFieldDeclarations(),'complete state declarations differ from the shared catalog');
 need(readFileSync(resolve(root,row.path),'utf8')===current&&readFileSync(resolve(root,BASE+'complete-rust-original.json.gz')).equals(packed),'complete original source inputs changed');
 return {schema:'owned-json-fields-native-root-source-plan-v1',id:'router:owned-json-fields-native-root-source-v1',files:[{path:row.path,before,language,after,current,...history,stages,trace:run.trace,inverse:before,nativeRustGrammarChecked:false}],sourceAuthority:false,semanticAuthority:false,rustExecuted:false,receivingExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);need(args.length===1&&['--emit','--write','--check'].includes(args[0]),'use --emit|--write|--check');const plan=prepareJsonStateCore();
 if(args[0]==='--write'){for(const row of plan.files)need(readFileSync(resolve(ROOT,row.path),'utf8')===row.current,'stale complete root proposal');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.currentAfter);}
 if(args[0]==='--check')need(plan.files.every(row=>row.current===row.currentAfter),'native root source proposal is stale');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),rustExecuted:false,receivingExecuted:false}));
}

function prepareJsonStateCore(){return prepareJsonFieldsCore();}
