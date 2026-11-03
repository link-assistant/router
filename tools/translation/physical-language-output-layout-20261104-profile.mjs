// Complete original/copy/producer source proposals. No installer or compiler permit.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {matchesExactSourceEpoch} from './exact-source-compiler-epochs-20261103.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PACKET='tools/translation/source-profiles/physical-language-output-layout-20261104/complete-source.json.gz',SHA='ecd4343196a4bfd1f3bbd6b49919a7866687d208eed2f46821b9c13e420ecf9b';
const PARENTS=['scripts/regenerate-js-first.mjs','tools/translation/js-to-rust/native-typescript.mjs'],CREATIONS=['tools/translation/physical-language-output-layout-20261104.mjs','tools/translation/test/physical-language-output-layout-20261104.test.mjs'];
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Physical language source proposal: '+message);};
function equation(row){
 if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')fail('complete original two-phase source equation required');
 let before=row.before;const stages=[];for(const sequence of row.sequences){const rules=sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'whole physical output source occurrence differs')),after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules:[]},{phase:'repository',rules:sequence.phase==='repository'?rules:[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)fail('complete source/CST inverse differs');stages.push({phase:sequence.phase,before,after,history});before=after;}
 if(before!==row.after)fail('whole final source differs');return {...row,stages,sourceAuthority:false,semanticAuthority:false};
}
export function proposePhysicalLanguageOutputSources20261104(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+PACKET,1048576);if(hash(packed)!==SHA)fail('fixed complete source packet differs');const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('complete packet UTF8 differs');const document=JSON.parse(text);
  if(document.schema!=='physical-language-output-layout-source-20261104-v1'||document.rows.length!==2||new Set(document.rows.map(row=>row.path)).size!==2||document.rows.some(row=>!PARENTS.includes(row.path))||document.copies.length!==1||document.newFiles.length!==2||document.declarations.length!==1)fail('complete original/copy/creation/declaration cohort required');
  const files=document.rows.map(row=>{const current=custody.read(ROOT+row.path);if(current!==row.before&&!matchesExactSourceEpoch(row,current,{retainedBytes:Buffer.byteLength(row.before)+Buffer.byteLength(row.after)}))fail('current original producer source differs');return equation(row);});
  const copies=document.copies.map(row=>{if(row.originalPath!=='tools/translation/layout-ownership-bulk-20261101.mjs'||row.path!==CREATIONS[0]||custody.read(ROOT+row.originalPath)!==row.before||custody.read(ROOT+row.path)!==row.after)fail('whole actual original/copy source differs');return equation(row);});
  const wanted=new Set(CREATIONS),newFiles=document.newFiles.map(row=>{if(!wanted.delete(row.path)||typeof row.source!=='string'||hash(row.source)!==row.sha256||custody.read(ROOT+row.path)!==row.source||row.sequences.join(',')!=='language,repository')fail('whole actual creation source differs');const concrete=transportConcreteSyntaxSource(row.source,{language:'JavaScript'});if(transportConcreteSyntaxMeta(concrete.meta).source!==row.source)fail('complete creation CST differs');return {...row,concreteMeta:concrete.meta};});
  const declarations=document.declarations.map(row=>{if(row.path!=='translation/source-role-contract.json'||row.kind!=='source-role-DATA-not-installation-authority'||typeof row.source!=='string'||hash(row.source)!==row.sha256||custody.read(ROOT+row.path)!==row.source)fail('complete ownership declaration differs');const data=JSON.parse(row.source);if(data.schema!=='router-multilanguage-source-role-contract-20261104-v1'||data.sourceAuthority!==false||data.semanticAuthority!==false||data.installationAuthority!==false)fail('role declaration cannot grant permission');return {...row,data};});
  return {files,copies,newFiles,declarations,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,installationAuthority:false,verification:'UNRUN'};
 },[custody.close]);
}
