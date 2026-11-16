// Source preparation only. Rust grammar and execution belong to gated CI.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceItems} from './rust-structure.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {emitIntegerDeclarations} from './integer-contracts.mjs';
import {prepareSseCore} from './prepare-sse-core.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ARCHIVE='tools/translation/source-profiles/integer/complete-rust-original.json.gz',PIN='cd133b9bfe609bf71301595b1ec3f7a4fec7e4c903b7c2a3385a7bba6ccea202';
const hash=value=>createHash('sha256').update(value).digest('hex'),need=(value,message)=>{if(!value)throw new TypeError('Integer native source: '+message);};
export function prepareIntegerCore({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,ARCHIVE));need(hash(packed)===PIN,'complete original native root differs');const row=JSON.parse(gunzipSync(packed,{maxOutputLength:2097152}));need(row.schema==='integer-Rust-source-v1'&&row.path==='rust/src/lib.rs'&&hash(row.source)===row.sha256&&Buffer.byteLength(row.source)===row.bytes,'complete root source required');
 const before=row.source;need(!sourceItems(before).some(item=>item.term==='mod'&&item.name==='translation_integer_core'),'original module must be absent');const language=before+'\nmod translation_integer_core;\n',after=before+'\npub mod translation_integer_core;\n';
 const run=createRulePipeline([{phase:'language',rules:[{id:'rust:add-integer-native-library-module',apply:value=>{need(value===before,'whole original join');return language;}}]},{phase:'repository',rules:[{id:'router:publish-source-bound-integer-library-interface',apply:value=>{need(value===language,'whole language join');return after;}}]}]).run(before);
 const modules=sourceItems(after).filter(item=>item.term==='mod'&&item.name==='translation_integer_core');need(modules.length===1&&after.slice(modules[0].start,modules[0].end).trim()==='pub mod translation_integer_core;','one public module edge required');const stages=transportConcreteSourceEquations([{before,after:language,language:'Rust'},{before:language,after,language:'Rust'}]).map((stage,index)=>({...stage,phase:index?'repository':'language'}));need(run.value===after&&stages[0].inverse===before&&stages[1].inverse===language,'complete CST inverses');
 const later=prepareSseCore({root}).files.find(value=>value.path===row.path);need(later?.before===after,'complete adjacent SSE root source history');const currentAfter=later.currentAfter,equation=transportConcreteSourceEquations([{before:after,after:currentAfter,language:'Rust'}])[0];need(equation.inverse===after,'complete SSE root inverse');const current=readFileSync(resolve(root,row.path),'utf8');need(current===before||current===after||current===currentAfter,'unknown current root');need(readFileSync(resolve(root,'tools/translation/integer-runtime.d.mts'),'utf8')===emitIntegerDeclarations(),'actual complete declarations differ');need(readFileSync(resolve(root,row.path),'utf8')===current&&readFileSync(resolve(root,ARCHIVE)).equals(packed),'original inputs changed');
 return {schema:'integer-native-source-plan-v1',id:'router:integer-native-source-v1',files:[{path:row.path,before,language,after,current,currentAfter,laterHistories:[{id:'router:sse-native-source-v1',before:after,after:currentAfter,equation,stages:later.stages,sourceAuthority:false,semanticAuthority:false}],stages,trace:run.trace,inverse:before,nativeRustGrammarChecked:false}],sourceAuthority:false,semanticAuthority:false,rustExecuted:false,receivingExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);need(args.length===1&&['--emit','--write','--check'].includes(args[0]),'use --emit|--write|--check');const plan=prepareIntegerCore();if(args[0]==='--write'){for(const row of plan.files)need(readFileSync(resolve(ROOT,row.path),'utf8')===row.current,'stale root');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.currentAfter);}if(args[0]==='--check')need(plan.files.every(row=>row.current===row.currentAfter),'stale source');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),rustExecuted:false,receivingExecuted:false}));
}
