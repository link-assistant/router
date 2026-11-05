// Whole native reader and immutable-state lowering source proposals. UNRUN.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/ordered-mutable-scalars-20261104/';
const SHA='b1e1e2c83ec432d3072b0d410e08a42689c9e103875c47f0db2a9694521097a9',INPUT_SHA='8d6d8c4912bad515f11694a9443221fa276ea048b26e707ac50dcf8326810055';
const PATHS=['tools/translation/js-to-rust/owned-core-source.mjs','tools/translation/js-to-rust/owned-vector-candidate-source.mjs'];
const NEW=['tools/translation/ordered-mutable-scalar-statements-20261104.mjs','tools/translation/test/ordered-mutable-scalar-statements-20261104.test.mjs','tools/translation/js-to-rust/test/owned-mutable-scalars-20261104.test.mjs'];
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Mutable scalar source proposal: '+message);};
function unpack(custody,path,sha,max){const packed=custody.readBytes(ROOT+path,1048576);if(hash(packed)!==sha)fail('fixed complete compressed source differs');const raw=gunzipSync(packed,{maxOutputLength:max}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('whole source UTF8 differs');return JSON.parse(text);}
function equation(row){
 if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||!Array.isArray(row.sequences)||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')fail('complete original source/inverse and two phases required');
 let before=row.before;const stages=[];
 for(const sequence of row.sequences){if(!Array.isArray(sequence.rows)||sequence.rows.length>32)fail('bounded complete substitution sequence required');const rules=sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'whole original mutable source occurrence differs')),run=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules:[]},{phase:'repository',rules:sequence.phase==='repository'?rules:[]}]).run(before),after=run.value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)fail('complete intermediate source/CST inverse differs');stages.push({phase:sequence.phase,before,after,history,trace:run.trace});before=after;}
 if(before!==row.after)fail('complete final source differs');return {...row,stages,sourceAuthority:false,semanticAuthority:false};
}
export function proposeOrderedMutableScalarSources20261104(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const data=unpack(custody,BASE+'complete-source.json.gz',SHA,8388608);if(data.schema!=='ordered-mutable-scalar-source-20261104-v1'||data.rows.length!==2||data.copies.length!==1||data.newFiles.length!==3||data.inputArchiveSha256!==INPUT_SHA)fail('whole reader/copy/creation cohort required');
  const files=data.rows.map((row,at)=>{if(row.path!==PATHS[at])fail('exact original reader path required');const source=custody.read(ROOT+row.path);if(source!==row.before&&source!==row.after)fail('actual whole original reader differs');return equation(row);});
  const copies=data.copies.map(row=>{if(row.originalPath!=='tools/translation/ordered-scalar-early-return-statements-20261104.mjs'||row.path!==NEW[0]||custody.read(ROOT+row.originalPath)!==row.before||custody.read(ROOT+row.path)!==row.after)fail('complete unchanged parent and additive copy required');return equation(row);});
  const newFiles=data.newFiles.map((row,at)=>{if(row.path!==NEW[at]||typeof row.source!=='string'||hash(row.source)!==row.sha256||row.sequences.join(',')!=='language,repository'||custody.read(ROOT+row.path)!==row.source)fail('complete actual creation source differs');const concrete=transportConcreteSyntaxSource(row.source,{language:'JavaScript'});if(transportConcreteSyntaxMeta(concrete.meta).source!==row.source)fail('whole creation CST differs');return {...row,concreteMeta:concrete.meta};});
  const inputs=unpack(custody,BASE+'helper-inputs.json.gz',INPUT_SHA,1048576),wanted=new Set(['tools/translation/ordered-scalar-helper-statements-20261103.mjs','tools/translation/js-to-rust/owned-core-ordered-scalar-helper-document-20261104.mjs','tools/translation/js-to-rust/owned-vector-candidate-ordered-scalar-helper-document-20261104.mjs','tools/translation/js-to-rust/owned-ordered-scalar-helper-profile-20261104.mjs','tools/translation/js-to-rust/owned-ordered-scalar-helper-rust-20261104.mjs','tools/translation/js-to-rust/ordered-scalar-helper-source-reconciliation-20261104.mjs','tools/translation/ordered-scalar-helper-layout-graph-20261104.mjs','tools/translation/ordered-scalar-early-return-statements-20261104.mjs',NEW[0]]);
  if(inputs.schema!=='original-ordered-mutable-scalar-input-sources-20261104-v1'||inputs.rows.length!==9)fail('all nine original source inputs required');for(const row of inputs.rows)if(!wanted.delete(row.path)||typeof row.source!=='string'||hash(row.source)!==row.sha256||custody.read(ROOT+row.path)!==row.source)fail('whole original input source differs');
  return {files,copies,newFiles,inputSources:inputs.rows,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
