// Complete source preparation only. No local Rust grammar/compiler authority.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceItems} from './rust-structure.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {prepareNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {emitJsonIterationDeclarations} from './json-iteration-contracts.mjs';
import {prepareJsonStateCore} from './prepare-json-state-core.mjs';
import {prepareJsonStateSources} from './prepare-json-state-sources.mjs';
import {composeConcreteSourceHistory} from './compose-concrete-source-history.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/json-iteration-core/';
const PIN='feb5b6bd584e6f9493098eaca3c52097d5250975c8c072381090567defd69eaf',JSPIN='887b7228f319e117f08f4e550db450180ede5e330ad21467e4117e90cb8d7c27';
const hash=value=>createHash('sha256').update(value).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Owned JSON iteration core source: '+message);};
export function prepareJsonIterationCore({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,BASE+'complete-rust-original.json.gz'));need(hash(packed)===PIN,'complete pinned Rust original');
 const row=JSON.parse(gunzipSync(packed,{maxOutputLength:2097152}));need(row.path==='rust/src/lib.rs'&&row.schema==='owned-json-iteration-Rust-source-v1'&&hash(row.source)===row.sha256&&Buffer.byteLength(row.source)===row.bytes,'complete original Rust root');
 const before=row.source;need(!sourceItems(before).some(item=>item.term==='mod'&&item.name==='translation_collections_core'),'original module binding must be absent');
 const language=before+'\nmod translation_collections_core;\n',after=before+'\npub mod translation_collections_core;\n';
 const run=createRulePipeline([{phase:'language',rules:[{id:'rust:add-actual-owned-JSON-iteration-library-module',apply:value=>{need(value===before,'whole original source join');return language;}}]},{phase:'repository',rules:[{id:'router:publish-explicit-native-iteration-library-boundary',apply:value=>{need(value===language,'whole language source join');return after;}}]}]).run(before);
 const selected=sourceItems(after).filter(item=>item.term==='mod'&&item.name==='translation_collections_core');need(selected.length===1&&after.slice(selected[0].start,selected[0].end).trim()==='pub mod translation_collections_core;','one actual public Rust module edge');
 const stages=transportConcreteSourceEquations([{before,after:language,language:'Rust'},{before:language,after,language:'Rust'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(run.value===after&&stages[0].inverse===before&&stages[1].inverse===language,'complete Rust source equations and inverses');
 const successor=prepareJsonStateCore({root}),history=composeConcreteSourceHistory({path:row.path,before,after,language:'Rust',laterPlans:[successor]});const current=readFileSync(resolve(root,row.path),'utf8');need(current===before||current===after||current===history.currentAfter,'unknown full current Rust root');
 const javascript=prepareNativeSubstitutionCopy({root,archive:BASE+'complete-javascript-originals-and-rules.json.gz',pin:JSPIN,id:'router:json-iteration-host-assets-source-copy-v1',laterPlans:[prepareJsonStateSources({root})]});
 need(readFileSync(resolve(root,'tools/translation/json-iteration-runtime.d.mts'),'utf8')===emitJsonIterationDeclarations(),'complete declarations must come from the shared operation description');
 need(readFileSync(resolve(root,row.path),'utf8')===current&&readFileSync(resolve(root,BASE+'complete-rust-original.json.gz')).equals(packed),'complete original inputs changed');
 return {schema:'owned-json-iteration-core-source-plan-v1',files:[{path:row.path,before,language,after,current,...history,stages,trace:run.trace,inverse:before,nativeRustGrammarChecked:false},...javascript.files],sourceAuthority:false,semanticAuthority:false,rustExecuted:false,receivingExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);need(args.length===1&&['--emit','--write','--check'].includes(args[0]),'use --emit|--write|--check');const plan=prepareJsonIterationCore();
 if(args[0]==='--write'){for(const row of plan.files)need(readFileSync(resolve(ROOT,row.path),'utf8')===row.current,'stale complete source proposal');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.currentAfter);}
 if(args[0]==='--check')need(plan.files.every(row=>row.current===row.currentAfter),'source proposal is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),rustExecuted:false,receivingExecuted:false}));
}
