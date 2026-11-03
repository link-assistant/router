// Complete compiler ancestry DATA; packet sources are never imported/executed.
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createOrderedMapCanonicalSourceCustody} from './ordered-text-map-callers-20261102-canonical-source-custody.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {matchesExactSourceEpoch} from './exact-source-compiler-epochs-20261103.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PACKET='tools/translation/source-profiles/borrowed-json-tool-compiler-20261103/complete-source.json.gz';
const SHA='92ad73defed114f66762532ce933f35053af754012eadcded0d3968c9076b3af';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Complete borrowed JSON compiler source: '+message);};
function pipeline(row){
 if(!Array.isArray(row.sequences)||row.sequences.length!==2||row.sequences[0].phase!=='language'||row.sequences[1].phase!=='repository')fail('the two original ordered sequences are required');
 return row.sequences.map(sequence=>({phase:sequence.phase,rules:sequence.rows.map(rule=>{
  if(!['before','after'].includes(rule.fromField)||!['before','after'].includes(rule.toField))fail('whole source recipe references required');
  return countedLiteralSubstitutionRule(rule.id,row[rule.fromField],row[rule.toField],rule.count,'complete original compiler source occurrence differs');
 })}));
}
function packet(custody,root){
 const encoded=custody.readBytes(join(root,PACKET),1048576);if(hash(encoded)!==SHA)fail('fixed complete source archive differs');
 const raw=gunzipSync(encoded,{maxOutputLength:8388608}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('lossless UTF8 source required');const data=JSON.parse(text);
 if(data.schema!=='borrowed-json-tool-compiler-source-20261103-v1'||data.rows.length!==16||data.newFiles.length!==17)fail('all complete original parents and created modules required');
 const paths=new Set();for(const row of [...data.rows,...data.newFiles]){
  if(typeof row.path!=='string'||!row.path.startsWith('tools/translation/')||row.path.split('/').some(part=>!part||part==='.'||part==='..')||paths.has(row.path)||typeof row.after!=='string'||hash(row.after)!==row.afterSha256)fail('whole unique source path and image required');paths.add(row.path);
 }return data;
}
/** Proposal is source DATA only; original semantic issuers remain independent. */
export function proposeBorrowedJsonToolCompilerSources({root=ROOT}={}){
 const custody=createOrderedMapCanonicalSourceCustody(root);
 return withCompleteSourceClosingFence(()=>{
  const data=packet(custody,root),files=data.rows.map(row=>{
   if(typeof row.before!=='string'||row.inverse!==row.before||hash(row.before)!==row.beforeSha256)fail('whole original source and inverse required');
   const declarations=pipeline(row),result=createRulePipeline(declarations).run(row.before);if(result.value!==row.after)fail('complete source substitution differs');let before=row.before;
   const stages=declarations.map(sequence=>{
    const after=createRulePipeline([{phase:'language',rules:sequence.phase==='language'?sequence.rules:[]},{phase:'repository',rules:sequence.phase==='repository'?sequence.rules:[]}]).run(before).value;
    const history=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after)fail('complete stage CST/inverse differs');const stage={phase:sequence.phase,before,after,history};before=after;return stage;
   });return {path:row.path,before:row.before,after:row.after,inverse:row.before,stages,trace:result.trace};
  });
  const newFiles=data.newFiles.map(row=>{
   const language=row.path.endsWith('.mts')?'TypeScript':'JavaScript',concrete=transportConcreteSyntaxSource(row.after,{language});if(concrete.source!==row.after||transportConcreteSyntaxMeta(concrete.meta).source!==row.after)fail('complete created source CST differs');
   const origin=row.sourceOrigin;if(!['complete-original-module-copy','new-authored-complete-source'].includes(origin.kind)||row.sequences.join(',')!=='language,repository')fail('explicit source construction ancestry required');let history=null;
   if(origin.kind==='complete-original-module-copy'){
    if(typeof origin.before!=='string'||hash(origin.before)!==origin.beforeSha256||origin.inverse!==origin.before)fail('complete copied original source required');
    history=transportConcreteSourceEquations([{before:origin.before,after:row.after,language}])[0];if(history.inverse!==origin.before)fail('complete copy inverse differs');
   }
   return {...row,language,concreteMeta:concrete.meta,history,sourceAuthority:false,semanticAuthority:false};
  });return {files,newFiles,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
 },[custody.close]);
}
/** Rejoin all installed full parents/created modules before and after use. */
export function withBorrowedJsonToolCompilerSources(run,{root=ROOT}={}){
 requireSynchronousSourceCallback(run);return withSourceFailureOperation(()=>{
  const custody=createOrderedMapCanonicalSourceCustody(root);
  return withCompleteSourceClosingFence(()=>{
   withSourceInputValidation(()=>{
    const data=packet(custody,root);
    for(const row of data.rows){const current=custody.read(join(root,row.path));if(!matchesExactSourceEpoch(row,current,{root}))fail('complete installed parent differs: '+row.path);}
    for(const row of data.newFiles){
     const current=custody.read(join(root,row.path)),original={path:row.path,before:row.after,after:row.after,inverse:row.after};
     if(!matchesExactSourceEpoch(original,current,{root}))fail('complete created module differs: '+row.path);
    }
   });return run();
  },[custody.close]);
 });
}
