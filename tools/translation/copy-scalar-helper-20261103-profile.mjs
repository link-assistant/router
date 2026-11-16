// Uninstalled full-source substitutions/copies. No native admission authority.
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {matchesExactSourceEpoch} from './exact-source-compiler-epochs-20261103.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const BASE='tools/translation/source-profiles/copy-scalar-helper-20261103/';
const SHA='39dbd0b8b50e4b9d9385d0c4bee557f29ef0817cca56c06194186a6772b706a8';
const INPUT_SHA='fc7224ee767ba0149c46b8a8600ee1b95dfa81fb9ff53089bda93ea1940818f7';
const PARENTS=['core','vector-candidate'].map(variant=>'tools/translation/js-to-rust/owned-'+variant+'-source.mjs');
const COPIES=['core','vector-candidate'].map(variant=>({path:'tools/translation/js-to-rust/owned-'+variant+'-copy-scalar-helper-document.mjs',originalPath:'tools/translation/js-to-rust/owned-'+variant+'-boolean-helper-document.mjs'})).concat([{path:'tools/translation/js-to-rust/owned-copy-scalar-helper-profile-20261103.mjs',originalPath:'tools/translation/js-to-rust/owned-boolean-helper-profile-20261103.mjs'},{path:'tools/translation/js-to-rust/owned-copy-scalar-helper-rust-20261103.mjs',originalPath:'tools/translation/js-to-rust/owned-boolean-helper-rust-20261103.mjs'}]);
const CREATED=[{path:'tools/translation/copy-scalar-helper-substitution-20261103.mjs',physical:'tools/translation/copy-scalar-helper-substitution-20261103.mjs'},{path:'tools/translation/js-to-rust/test/owned-copy-scalar-helpers.test.mjs',physical:BASE+'receiving-source.mjs.txt'},{path:'rust/tests/translation_copy_scalar_helper_oracle.rs',physical:'rust/tests/translation_copy_scalar_helper_oracle.rs'}];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Copy scalar helper source: '+message);};
function decode(raw){const bytes=gunzipSync(raw,{maxOutputLength:8388608}),text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes))fail('complete source UTF8 required');return JSON.parse(text);}
function rewrite(row){
 if(typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')fail('complete original/source hashes and two sequences required');
 const rules=sequence=>sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete original scalar-helper source occurrence differs'));
 const result=createRulePipeline(row.sequences.map(sequence=>({phase:sequence.phase,rules:rules(sequence)}))).run(row.before);if(result.value!==row.after)fail('whole source successor differs');let before=row.before;
 const stages=row.sequences.map(sequence=>{
  const after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?rules(sequence):[]},{phase:'repository',rules:sequence.phase==='repository'?rules(sequence):[]}]).run(before).value,history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];
  if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)fail('full source stage CST/inverse differs');const stage={phase:sequence.phase,before,after,history};before=after;return stage;
 });return {...row,stages,trace:result.trace,sourceAuthority:false,semanticAuthority:false};
}
export function proposeCopyScalarHelperSources20261103(){
 const custody=createOrderedMapCanonicalSourceCustody(ROOT);
 return withCompleteSourceClosingFence(()=>{
  const raw=custody.readBytes(ROOT+BASE+'complete-source.json.gz',1048576);if(hash(raw)!==SHA)fail('fixed complete source packet differs');const document=decode(raw);
  if(document.schema!=='copy-scalar-helper-source-20261103-v1'||document.rows.length!==2||document.copies.length!==4||document.newFiles.length!==3)fail('both original readers, four copies and three creations required');
  const files=document.rows.map(row=>{if(!PARENTS.includes(row.path))fail('original reader path differs');const current=custody.read(ROOT+row.path);if(current!==row.before&&!matchesExactSourceEpoch(row,current,{retainedBytes:Buffer.byteLength(row.before)+Buffer.byteLength(row.after)}))fail('actual complete reader epoch differs');return rewrite(row);});
  if(new Set(files.map(row=>row.path)).size!==2)fail('distinct original readers required');
  const copies=document.copies.map(row=>{const expected=COPIES.find(copy=>copy.path===row.path);if(!expected||row.originalPath!==expected.originalPath||custody.read(ROOT+row.originalPath)!==row.before||custody.read(ROOT+BASE+row.path.split('/').at(-1)+'.txt')!==row.after)fail('actual complete original/copied source differs');return rewrite(row);});
  if(new Set(copies.map(row=>row.path)).size!==4)fail('all four distinct complete copies required');
  const newFiles=document.newFiles.map(row=>{const expected=CREATED.find(file=>file.path===row.path);if(!expected||typeof row.source!=='string'||hash(row.source)!==row.sha256||custody.read(ROOT+expected.physical)!==row.source||row.sequences.join(',')!=='language,repository')fail('complete creation source differs');const concrete=transportConcreteSyntaxSource(row.source,{language:row.path.endsWith('.rs')?'Rust':'JavaScript'});if(concrete.source!==row.source||transportConcreteSyntaxMeta(concrete.meta).source!==row.source)fail('complete creation CST differs');return {...row,concreteMeta:concrete.meta,sourceAuthority:false,semanticAuthority:false};});
  if(new Set(newFiles.map(row=>row.path)).size!==3)fail('all three distinct creation sources required');
  const encoded=custody.readBytes(ROOT+BASE+'helper-inputs.json.gz',1048576);if(hash(encoded)!==INPUT_SHA)fail('fixed six-input helper archive differs');const input=decode(encoded),expected=new Map(copies.map(row=>[row.path,row.after]));expected.set(CREATED[0].path,newFiles.find(row=>row.path===CREATED[0].path).source);expected.set('tools/translation/primitive-bitwise-types.mjs',custody.read(ROOT+'tools/translation/primitive-bitwise-types.mjs'));
  if(input.schema!=='original-Copy-scalar-helper-input-sources-20261103-v1'||input.rows.length!==6||new Set(input.rows.map(row=>row.path)).size!==6||input.rows.some(row=>typeof row.source!=='string'||hash(row.source)!==row.sha256||expected.get(row.path)!==row.source))fail('all six complete original helper inputs required');
  return {files,copies,newFiles,inputSources:input.rows,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
