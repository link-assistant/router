// Complete source construction only. Native grammar and behavior require gated CI.
import {readFileSync,lstatSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceItems} from './rust-structure.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {readCurrentSourceProposalFile as source,installFreshSourceProposal} from './unit-runtime-materialization.mjs';
import {emitHttpDeadlineDeclarations} from './http-deadline-contracts.mjs';
import {prepareHttpDeadlineResultCore} from './prepare-http-deadline-result-core.mjs';
import {HTTP_DEADLINE_NATIVE_SOURCE,HTTP_DEADLINE_RUNTIME_SOURCE,HTTP_DEADLINE_DECLARATIONS_SOURCE} from './http-deadline-native-source.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ARCHIVE='tools/translation/source-profiles/http-deadline/complete-rust-original.json.gz',PIN='6b08832c05567bc63f11a8f3a7241b385fa48998db0e2ce1d52f975205f1e87f';
const hash=value=>createHash('sha256').update(value).digest('hex'),need=(value,message)=>{if(!value)throw new TypeError('HTTP deadline native source: '+message);};
export function prepareHttpDeadlineCore({root=ROOT}={}){
 root=resolve(root);const directory=lstatSync(root);need(directory.isDirectory()&&!directory.isSymbolicLink(),'ordinary repository root required');const packed=readFileSync(resolve(root,ARCHIVE));need(hash(packed)===PIN,'complete original root profile differs');
 const row=JSON.parse(gunzipSync(packed,{maxOutputLength:2097152}));need(row.schema==='http-deadline-native-original-v1'&&row.path==='rust/src/lib.rs'&&row.modulePath==='rust/src/translation_http_deadline_core.rs'&&row.moduleOriginal===null&&hash(row.source)===row.sha256&&Buffer.byteLength(row.source)===row.bytes,'complete original root and absent-library history required');
 const before=row.source;need(!sourceItems(before).some(item=>item.term==='mod'&&item.name==='translation_http_deadline_core'),'original native module must be absent');const language=before+'\nmod translation_http_deadline_core;\n',after=before+'\npub mod translation_http_deadline_core;\n';
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'rust:construct-actual-closed-http-deadline-library-and-root-edge',apply:value=>{need(value===before,'complete original root join');return {root:language,library:HTTP_DEADLINE_NATIVE_SOURCE};}}]},
  {phase:'repository',rules:[{id:'router:publish-complete-http-deadline-library-interface',apply:value=>{need(value.root===language&&value.library===HTTP_DEADLINE_NATIVE_SOURCE,'complete language source join');return {root:after,library:value.library};}}]},
 ]).run(before);
 const modules=sourceItems(after).filter(item=>item.term==='mod'&&item.name==='translation_http_deadline_core');need(modules.length===1&&after.slice(modules[0].start,modules[0].end).trim()==='pub mod translation_http_deadline_core;','actual unique public native module edge');
 const operations=sourceItems(HTTP_DEADLINE_NATIVE_SOURCE).filter(item=>item.term==='fn');need(operations.length===3&&operations.every(item=>['open','read','send'].includes(item.name)),'complete native operation source census');
 const stages=transportConcreteSourceEquations([{before,after:language,language:'Rust'},{before:language,after,language:'Rust'}]).map((value,index)=>({...value,phase:index?'repository':'language'})),libraryStages=transportConcreteSourceEquations([{before:'',after:run.value.library,language:'Rust'},{before:run.value.library,after:run.value.library,language:'Rust'}]).map((value,index)=>({...value,phase:index?'repository':'language'}));need(stages[0].inverse===before&&stages[1].inverse===language&&libraryStages[0].inverse==='','complete root/library CST inverses');
 const later=prepareHttpDeadlineResultCore({root}).files.find(file=>file.path===row.path);need(later?.before===after,'complete adjacent deadline Result root history');const currentAfter=later.currentAfter,equation=transportConcreteSourceEquations([{before:after,after:currentAfter,language:'Rust'}])[0];need(equation.inverse===after,'complete deadline Result root inverse');
 const current=source(root,row.path),currentLibrary=source(root,row.modulePath);need(current===before||current===after||current===currentAfter,'unknown current complete root');need(currentLibrary===null||currentLibrary===HTTP_DEADLINE_NATIVE_SOURCE,'unknown current native deadline library');
 const runtimePath='tools/translation/http-deadline-runtime.mjs',declarationPath='tools/translation/http-deadline-runtime.d.mts',runtime=source(root,runtimePath),declarations=source(root,declarationPath);need(runtime===HTTP_DEADLINE_RUNTIME_SOURCE&&declarations===HTTP_DEADLINE_DECLARATIONS_SOURCE&&declarations===emitHttpDeadlineDeclarations(),'actual runtime and declaration sources differ');
 const inputs=[{path:row.path,source:current},{path:row.modulePath,source:currentLibrary},{path:runtimePath,source:runtime},{path:declarationPath,source:declarations}],files=[{path:row.path,before,language,after,current,currentAfter,laterHistories:[{id:'router:http-deadline-results-native-source-v1',before:after,after:currentAfter,equation,stages:later.stages,sourceAuthority:false,semanticAuthority:false}],stages,trace:run.trace,inverse:before,nativeRustGrammarChecked:false},{path:row.modulePath,before:null,language:run.value.library,after:run.value.library,current:currentLibrary,currentAfter:run.value.library,stages:libraryStages,trace:run.trace,inverse:null,originallyAbsent:true,nativeRustGrammarChecked:false}],outputs=files.map(file=>({path:file.path,before:file.current,after:file.currentAfter,inverse:file.current,mode:file.current===null?0o644:lstatSync(resolve(root,file.path)).mode&0o777,kind:'native-library-source'}));
 for(const input of inputs)need(source(root,input.path)===input.source,'complete original input changed');need(readFileSync(resolve(root,ARCHIVE)).equals(packed),'complete original root archive changed');return {schema:'http-deadline-native-source-plan-v1',id:'router:http-deadline-native-source-v1',root,baseRevision:null,files,inputs,outputs,sourceAuthority:false,semanticAuthority:false,nativeRustGrammarChecked:false,runtimeParity:false,rustExecuted:false,receivingExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);need(args.length===1&&['--emit','--write','--check'].includes(args[0]),'use --emit|--write|--check');const plan=prepareHttpDeadlineCore();if(args[0]==='--write')installFreshSourceProposal(JSON.stringify(plan),()=>prepareHttpDeadlineCore());if(args[0]==='--check')need(plan.outputs.every(row=>row.before===row.after),'current native source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),rustExecuted:false,receivingExecuted:false}));
}
