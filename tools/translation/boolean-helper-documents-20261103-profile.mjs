// Complete source-copy proposals, never installed/native permission.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {proposeBooleanHelperSources20261103} from './boolean-helper-20261103-profile.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const FOLDER='tools/translation/source-profiles/boolean-helper-documents-20261103/';
const SHA='79543e342e0a0b5e4903bed17979ada5f0157f362a79c4f1124539bfc94bcf02';
const PREREQUISITE='79413e298030430692e247715f511c70d6a496fd0014a753f3713951e7753da8';
const READERS=['tools/translation/js-to-rust/owned-core-source.mjs','tools/translation/js-to-rust/owned-vector-candidate-source.mjs'];
const COPIES=['core','vector-candidate'].map(variant=>({path:'tools/translation/js-to-rust/owned-'+variant+'-boolean-helper-document.mjs',originalPath:'tools/translation/js-to-rust/owned-'+variant+'-document.mjs'}));
const CREATED=[{path:'tools/translation/js-to-rust/owned-boolean-helper-profile-20261103.mjs',physical:'owned-boolean-helper-profile-20261103.mjs.txt'},{path:'tools/translation/js-to-rust/test/owned-boolean-helper-documents.test.mjs',physical:'receiving-source.mjs.txt'}];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Boolean helper document source: '+message);};
function rewrite(row){
 if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')fail('complete originals, two phases and inverses required');
 const rules=sequence=>sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete original helper source occurrence differs'));
 const result=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:rules(sequence)}))).run(row.before);
 if(result.value!==row.after)fail('complete helper successor differs');let before=row.before;
 const stages=row.sequences.map(sequence=>{
  const after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules(sequence):[]},{phase:'repository',rules:sequence.phase==='repository'?rules(sequence):[]}]).run(before).value;
  const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];
  if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)fail('complete source-copy CST/inverse differs');
  const stage={phase:sequence.phase,before,after,history};before=after;return stage;
 });return {...row,stages,trace:result.trace,sourceAuthority:false,semanticAuthority:false};
}
export function proposeBooleanHelperDocumentSources20261103(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const packed=custody.readBytes(ROOT+FOLDER+'complete-source.json.gz',1048576);if(hash(packed)!==SHA)fail('immutable source-copy packet differs');
  const raw=gunzipSync(packed,{maxOutputLength:8388608}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('lossless source UTF8 required');const document=JSON.parse(text);
  if(document.schema!=='boolean-helper-documents-source-20261103-v1'||document.prerequisitePacketSha256!==PREREQUISITE||document.rows.length!==2||document.copies.length!==2||document.newFiles.length!==2)fail('complete prerequisite/readers/copies/cases required');
  const predecessor=proposeBooleanHelperSources20261103();
  const files=document.rows.map(row=>{if(!READERS.includes(row.path)||predecessor.files.find(original=>original.path===row.path)?.after!==row.before)fail('exact original reader predecessor differs');return rewrite(row);});
  if(new Set(files.map(row=>row.path)).size!==2)fail('distinct original reader cohort required');
  const copies=document.copies.map(row=>{
   const expected=COPIES.find(copy=>copy.path===row.path);if(!expected||row.originalPath!==expected.originalPath||custody.read(ROOT+row.originalPath)!==row.before||custody.read(ROOT+FOLDER+row.path.split('/').at(-1)+'.txt')!==row.after)fail('complete copied document source differs');return rewrite(row);
  });if(new Set(copies.map(row=>row.path)).size!==2)fail('both original document copies required');
  const newFiles=document.newFiles.map(row=>{
   const expected=CREATED.find(copy=>copy.path===row.path);if(!expected||typeof row.source!=='string'||hash(row.source)!==row.sha256||custody.read(ROOT+FOLDER+expected.physical)!==row.source||row.sequences.join(',')!=='language,repository')fail('complete new operation/receiving source differs');
   const concrete=transportConcreteSyntaxSource(row.source,{language:'JavaScript'});if(concrete.source!==row.source||transportConcreteSyntaxMeta(concrete.meta).source!==row.source)fail('complete creation CST differs');return {...row,concreteMeta:concrete.meta,sourceAuthority:false,semanticAuthority:false};
  });if(new Set(newFiles.map(row=>row.path)).size!==2)fail('both new operation and receiving source required');
  return {predecessor,files,copies,newFiles,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
