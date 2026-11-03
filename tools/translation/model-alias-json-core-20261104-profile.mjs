// Paired compatibility leaf/source adoption DATA. No compiler or mutation permit.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {sourceItems} from './rust-structure.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/model-alias-json-core-20261104/complete-source.json.gz';
const SHA='2c8c01406d2578d9b9f2420aa39ceeaca3c28b24c02d1d10b2b95761678f6155',hash=value=>createHash('sha256').update(value).digest('hex');
const RESPONSE_PACKET='tools/translation/source-profiles/model-alias-response-adoption-20261104/complete-source.json.gz',RESPONSE_SHA='fd2ebbbd9e1d4d6e1f3ad44ce6185602538e5639adb010865a4270917e0c6afe';
const PATHS=['rust/src/translation_state_core.rs','tools/translation/json-state-native-source.mjs','tools/translation/json-state-contracts.mjs','tools/translation/json-state-runtime.mjs','tools/translation/json-state-runtime.d.mts'];
const NEW=['tools/translation/test/model-alias-json-runtime-20261104.test.mjs','tools/translation/test/model-alias-json-forward-20261104.test.mjs','tools/translation/js-to-rust/test/model-alias-json-reverse-20261104.test.mjs'];
const need=(value,message)=>{if(!value)throw TypeError('Model alias JSON source: '+message);};
function equation(row){
 need(typeof row.before==='string'&&typeof row.after==='string'&&row.inverse===row.before&&hash(row.before)===row.beforeSha256&&hash(row.after)===row.afterSha256&&['Rust','JavaScript','TypeScript'].includes(row.language)&&row.sequences.length===2&&row.sequences[0].phase==='language'&&row.sequences[1].phase==='repository','complete original source/language and two phases required');let before=row.before;const stages=[];
 for(const sequence of row.sequences){const rules=sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete original model-alias source occurrence differs')),after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules:[]},{phase:'repository',rules:sequence.phase==='repository'?rules:[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:row.language}])[0];need(history.inverse===before&&transportConcreteSyntaxMeta(history.beforeMeta).source===before&&transportConcreteSyntaxMeta(history.afterMeta).source===after,'whole intermediate source/CST inverse differs');stages.push({phase:sequence.phase,before,after,history});before=after;}need(before===row.after,'complete final source differs');return {...row,stages};
}
export function proposeModelAliasJsonCoreSources20261104(){return withSourceInputValidation(()=>{
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);need(hash(packed)===SHA,'fixed complete source archive differs');const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');need(Buffer.from(text).equals(raw),'complete source UTF8 differs');const data=JSON.parse(text);need(data.schema==='model-alias-json-core-source-20261104-v1'&&data.rows.length===5&&data.callerRows.length===1&&data.oracleRows.length===1&&data.newFiles.length===3&&data.guards.length===4,'whole paired core/caller/oracle/case cohort required');
  const guards=data.guards.map(row=>{need(['rust/Cargo.toml','Cargo.lock','rust/src/translation_core.rs','rust/src/translation_core/primitives.rs'].includes(row.path)&&typeof row.source==='string'&&hash(row.source)===row.sha256&&custody.read(ROOT+row.path)===row.source,'actual native/Cargo guard differs');return row;});need(new Set(guards.map(row=>row.path)).size===4,'every native guard required');
  const files=data.rows.map((row,at)=>{need(row.path===PATHS[at]&&custody.read(ROOT+row.path)===row.after,'whole installed compatibility core differs');return equation(row);});
  const responsePacked=custody.readBytes(ROOT+RESPONSE_PACKET,1048576);need(hash(responsePacked)===RESPONSE_SHA,'fixed response continuation archive differs');const responseRaw=gunzipSync(responsePacked,{maxOutputLength:8388608}),responseText=responseRaw.toString('utf8');need(Buffer.from(responseText).equals(responseRaw),'complete response UTF8 differs');const responseData=JSON.parse(responseText);need(responseData.schema==='model-alias-response-adoption-source-20261104-v1'&&responseData.rows.length===1,'one whole response continuation required');
  const responseAdoptions=responseData.rows.map(row=>{need(row.path==='rust/src/account_policy_response.rs'&&row.language==='Rust'&&custody.read(ROOT+row.path)===row.after,'actual complete response successor differs');return equation(row);});
  const response=responseAdoptions[0];
  const oracleFiles=data.oracleRows.map(row=>{need(row.path===response.path&&row.after===response.before,'complete production/oracle successor join differs');return {...equation(row),laterHistories:[response],currentAfter:response.after};});
  const callers=data.callerRows.map(row=>{
   need(row.path===response.path&&row.before===response.before&&row.owner==='rewrite_value','actual uninstalled caller ancestry differs');
   const owners=sourceItems(row.before).filter(item=>item.term==='fn'&&item.name===row.owner),currentOwners=sourceItems(response.after).filter(item=>item.term==='fn'&&item.name===row.owner),proposedOwners=sourceItems(row.after).filter(item=>item.term==='fn'&&item.name===row.owner);
   need(owners.length===1&&owners[0].start===row.span[0]&&owners[0].end===row.span[1]&&currentOwners.length===1&&proposedOwners.length===1,'complete original/current lexical function owner differs');
   const original=row.before.slice(...row.span),current=response.after.slice(currentOwners[0].start,currentOwners[0].end),replacement=row.after.slice(proposedOwners[0].start,proposedOwners[0].end);need(current===original,'complete current mutable wrapper differs');
   const rules=[{id:'repository:model-alias-current-mutable-wrapper',before:original,after:replacement,count:1}],currentAfter=createRulePipeline([{phase:'language',rules:[]},{phase:'repository',rules:rules.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete current mutable wrapper occurrence differs'))}]).run(response.after).value;
   const currentProjection=equation({path:row.path,language:'Rust',before:response.after,after:currentAfter,inverse:response.after,beforeSha256:hash(response.after),afterSha256:hash(currentAfter),sequences:[{phase:'language',rows:[]},{phase:'repository',rows:rules}]});
   return {...equation(row),laterHistories:[response],current:response.after,currentAfter,currentProjection,sourceInstalled:false,wholeFunctionAdmitted:false,unresolved:['unique-mutable-Json-parameter-and-mem-take-whole-caller-admission','full-response-body-and-streaming-caller-composition']};
  });
  const copied=data.nativeBodyCopy;need(copied.originalPath==='rust/src/account_policy_response.rs'&&copied.path===PATHS[0]&&copied.before===oracleFiles[0].before&&copied.after===files[0].after&&copied.inverse===copied.before&&hash(copied.before)===copied.beforeSha256&&hash(copied.after)===copied.afterSha256&&copied.before.slice(callers[0].span[0],callers[0].span[1])===copied.originalFunction,'complete native body origin differs');const copyHistory=transportConcreteSourceEquations([{before:copied.before,after:copied.after,language:'Rust'}])[0];need(copyHistory.inverse===copied.before,'whole native body-copy inverse differs');
  const newFiles=data.newFiles.map((row,at)=>{need(row.path===NEW[at]&&typeof row.source==='string'&&hash(row.source)===row.sha256&&row.sequences.join(',')==='language,repository'&&custody.read(ROOT+row.path)===row.source,'whole independent case source differs');const concrete=transportConcreteSyntaxSource(row.source,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===row.source,'complete case CST differs');return {...row,concreteMeta:concrete.meta};});
  return {files,oracleFiles,callers,responseAdoptions,nativeBodyCopy:{...copied,history:copyHistory},newFiles,guards,librarySourceInstalled:true,callerSourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
});}
