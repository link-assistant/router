// Complete width-aware native loop source proposals and independent Rust cases.
// Source/canonical CST DATA only; no native or executable permission. UNRUN.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/width-counted-ranges-20261104/complete-source.json.gz';
const SHA='7de9bcc926672790f381ee8de0b9751d9f24e976b381f83b9b05d87936ef1fd1';
const PATHS=['owned-outcome','owned-cancellation','owned-text-vector-outcome','owned-text-vector-cancellation','owned-text-vector-join-outcome','owned-text-vector-join-cancellation'].map(name=>'tools/translation/js-to-rust/'+name+'-source.mjs');
const NEW=['tools/translation/js-to-rust/owned-width-counted-for-source-20261104.mjs','tools/translation/js-to-rust/test/width-counted-ranges-20261104.test.mjs'];
const hash=value=>createHash('sha256').update(value).digest('hex'),need=(value,message)=>{if(!value)throw TypeError('Width counted range source proposal: '+message);};
function equation(row,language='JavaScript'){
 need(typeof row.before==='string'&&typeof row.after==='string'&&row.inverse===row.before&&hash(row.before)===row.beforeSha256&&hash(row.after)===row.afterSha256&&row.sequences.length===2&&row.sequences[0].phase==='language'&&row.sequences[1].phase==='repository','complete original/copy and two phases required');
 let before=row.before;const stages=[];for(const sequence of row.sequences){need(Array.isArray(sequence.rows)&&sequence.rows.length<=16,'bounded complete substitution rules required');const rules=sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'whole native loop source occurrence differs')),after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules:[]},{phase:'repository',rules:sequence.phase==='repository'?rules:[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language}])[0];need(history.inverse===before&&transportConcreteSyntaxMeta(history.beforeMeta).source===before&&transportConcreteSyntaxMeta(history.afterMeta).source===after,'complete intermediate source/CST inverse differs');stages.push({phase:sequence.phase,before,after,history});before=after;}
 need(before===row.after,'complete final source differs');return {...row,stages,sourceAuthority:false,semanticAuthority:false};
}
export function proposeWidthCountedRangeSources20261104(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);need(hash(packed)===SHA,'fixed whole source archive differs');const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');need(Buffer.from(text).equals(raw),'whole source UTF8 differs');const data=JSON.parse(text);need(data.schema==='width-counted-range-source-20261104-v1'&&data.rows.length===6&&data.copies.length===1&&data.newFiles.length===2&&data.oracleRows.length===1,'complete six-reader/copy/creation/oracle cohort required');
  const files=data.rows.map((row,at)=>{need(row.path===PATHS[at],'exact original reader path required');const current=custody.read(ROOT+row.path);need(current===row.before||current===row.after,'actual complete original reader differs');return equation(row);});
  const copies=data.copies.map(row=>{need(row.originalPath==='tools/translation/js-to-rust/owned-counted-for-source.mjs'&&row.path===NEW[0]&&custody.read(ROOT+row.originalPath)===row.before&&custody.read(ROOT+row.path)===row.after,'complete unchanged original loop checker and additive copy required');return equation(row);});
  const newFiles=data.newFiles.map((row,at)=>{need(row.path===NEW[at]&&typeof row.source==='string'&&hash(row.source)===row.sha256&&row.sequences.join(',')==='language,repository'&&custody.read(ROOT+row.path)===row.source,'complete actual creation source required');const concrete=transportConcreteSyntaxSource(row.source,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===row.source,'whole creation CST differs');return {...row,concreteMeta:concrete.meta};});
  const oracleFiles=data.oracleRows.map(row=>{need(row.path==='rust/tests/translation_owned_loop_oracle.rs'&&row.language==='Rust'&&custody.read(ROOT+row.path)===row.after,'actual complete independent native oracle source differs');return equation(row,'Rust');});
  return {files,copies,newFiles,oracleFiles,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
