// Complete parent/copy/creation source DATA only; never installs or imports it.
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
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/source-profiles/ordered-scalar-helper-native-20261104/';
const SHA='9524d1358c1c5e9b6f1648b9387b5d0b3452db74487da78e98ae4d142aa914a9',INPUT_SHA='e49b85748ca62cfbc933d903545310514a493f61697d4b2bf64aca6152e7e3d9';
const READERS=['tools/translation/js-to-rust/owned-core-source.mjs','tools/translation/js-to-rust/owned-vector-candidate-source.mjs'];
const COPIES=[
 ['tools/translation/js-to-rust/owned-core-copy-scalar-helper-document.mjs','tools/translation/js-to-rust/owned-core-ordered-scalar-helper-document-20261104.mjs'],
 ['tools/translation/js-to-rust/owned-vector-candidate-copy-scalar-helper-document.mjs','tools/translation/js-to-rust/owned-vector-candidate-ordered-scalar-helper-document-20261104.mjs'],
 ['tools/translation/js-to-rust/owned-copy-scalar-helper-profile-20261103.mjs','tools/translation/js-to-rust/owned-ordered-scalar-helper-profile-20261104.mjs'],
 ['tools/translation/js-to-rust/owned-copy-scalar-total-primitive-rust-20261103.mjs','tools/translation/js-to-rust/owned-ordered-scalar-helper-rust-20261104.mjs'],
 ['tools/translation/js-to-rust/copy-scalar-total-primitive-source-reconciliation-20261103.mjs','tools/translation/js-to-rust/ordered-scalar-helper-source-reconciliation-20261104.mjs'],
];
const RECEIVING='tools/translation/js-to-rust/test/owned-ordered-scalar-helpers-20261104.test.mjs',CREATIONS=COPIES.map(row=>row[1]).concat([RECEIVING]);
const INPUTS=['tools/translation/ordered-scalar-helper-statements-20261103.mjs',...COPIES.map(row=>row[1])];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Ordered helper native source proposal: '+message);};
function utf8(raw){const text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('complete source UTF8 required');return text;}
function sources(raw){return JSON.parse(utf8(gunzipSync(raw,{maxOutputLength:8388608})));}
function equation(row){
 if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')fail('complete original two-sequence source equation required');
 let before=row.before;const stages=[];
 for(const sequence of row.sequences){const rules=sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'whole source occurrence differs')),after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules:[]},{phase:'repository',rules:sequence.phase==='repository'?rules:[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)fail('whole intermediate CST/source inverse differs');stages.push({phase:sequence.phase,before,after,history});before=after;}
 if(before!==row.after)fail('whole final source successor differs');return {...row,stages,sourceAuthority:false,semanticAuthority:false};
}
export function proposeOrderedScalarHelperNativeSources20261104(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const raw=custody.readBytes(ROOT+BASE+'complete-source.json.gz',1048576);if(hash(raw)!==SHA)fail('fixed full parent/copy packet differs');const document=sources(raw);
  if(document.schema!=='ordered-scalar-helper-native-source-20261104-v1'||document.rows.length!==2||new Set(document.rows.map(row=>row.path)).size!==2||document.rows.some(row=>!READERS.includes(row.path))||document.copies.length!==5||document.newFiles.length!==6)fail('complete native source cohort required');
  const files=document.rows.map(row=>{const current=custody.read(ROOT+row.path);if(current!==row.before&&!matchesExactSourceEpoch(row,current,{retainedBytes:Buffer.byteLength(row.before)+Buffer.byteLength(row.after)}))fail('original current native reader differs');return equation(row);});
  const remaining=new Map(COPIES),copies=document.copies.map(row=>{if(remaining.get(row.originalPath)!==row.path||!remaining.delete(row.originalPath)||custody.read(ROOT+row.originalPath)!==row.before||custody.read(ROOT+row.path)!==row.after)fail('complete original/actual native API copy differs');return equation(row);});
  const creations=new Set(CREATIONS),newFiles=document.newFiles.map(row=>{if(!creations.delete(row.path)||typeof row.source!=='string'||hash(row.source)!==row.sha256||row.sequences.join(',')!=='language,repository')fail('complete distinct source creation required');const physical=row.path===RECEIVING?BASE+'receiving-source.mjs.txt':row.path;if(custody.read(ROOT+physical)!==row.source)fail('complete current source creation differs');const concrete=transportConcreteSyntaxSource(row.source,{language:'JavaScript'});if(concrete.source!==row.source||transportConcreteSyntaxMeta(concrete.meta).source!==row.source)fail('complete creation CST differs');return {...row,concreteMeta:concrete.meta,sourceAuthority:false,semanticAuthority:false};});
  const inputRaw=custody.readBytes(ROOT+BASE+'helper-inputs.json.gz',1048576);if(hash(inputRaw)!==INPUT_SHA)fail('fixed complete ordered input archive differs');const input=sources(inputRaw),wanted=new Set(INPUTS);if(input.schema!=='original-ordered-scalar-helper-input-sources-20261104-v1'||input.rows.length!==6)fail('all six ordered source inputs required');
  const inputSources=input.rows.map(row=>{if(!wanted.delete(row.path)||typeof row.source!=='string'||hash(row.source)!==row.sha256||custody.read(ROOT+row.path)!==row.source)fail('whole actual ordered source dependency differs');return row;});
  return {files,copies,newFiles,inputSources,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
