// Authored source DATA only. Exact byte pins and a full inverse do not prove
// type, ownership, method behavior, runtime authority or executable coverage.
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Pinned repository source evolution: '+message);};

export function derivePinnedRepositorySourceEvolution(ts,{profile,profileSha256,path,source}){
 if(ts.version!=='5.9.3'||typeof source!=='string'||Buffer.byteLength(source)>262144)
  fail('installed TypeScript 5.9.3 and bounded complete primitive source required');
 const state=lstatSync(profile);
 if(!state.isFile()||state.isSymbolicLink()||state.size>131072)fail('bounded ordinary authored rule profile required');
 const bytes=readFileSync(profile);
 if(bytes.length!==state.size||hash(bytes)!==profileSha256)fail('complete authored rule profile differs');
 const input=JSON.parse(bytes);
 if(input.schema!=='pinned-repository-source-evolution-v1'||input.path!==path
  ||input.phase!=='repository'||input.sourceAuthority!==false
  ||input.semanticAuthority!==false||input.runtimeAuthority!==false
  ||input.productionExecutableGain!==0||!Array.isArray(input.edits)
  ||input.edits.length<1||input.edits.length>64)fail('complete source rule universe differs');
 if(hash(source)!==input.beforeSha256)fail('unregistered complete source predecessor');
 const languageRules=[];
 const repositoryRules=input.edits.map(edit=>exactLiteralSubstitutionRule(edit.id,
  edit.before,edit.after,'Complete ordered repository source anchor differs: '+edit.id));
 const pipeline=createRulePipeline([
  {phase:'language',rules:languageRules},{phase:'repository',rules:repositoryRules},
 ]);
 const {value:after,trace}=pipeline.run(source);
 if(Buffer.byteLength(after)>262144||hash(after)!==input.afterSha256)
  fail('complete authored source successor differs');
 let inverse=after;
 for(const edit of [...input.edits].reverse()){
  if(inverse.split(edit.after).length!==2)fail('complete ordered inverse anchor differs');
  inverse=inverse.replace(edit.after,()=>edit.before);
 }
 if(inverse!==source)fail('complete source inverse differs');
 for(const text of [source,after]){
  const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length||text.split('\n').length>=1000)
   fail('complete native grammar or line bound differs');
 }
 if(!readFileSync(profile).equals(bytes))fail('complete authored rules changed during derivation');
 return {before:source,after,inverse,edits:input.edits,languageRules,repositoryRules,
  trace,profileSha256,beforeSha256:input.beforeSha256,afterSha256:input.afterSha256,
  sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,
  productionExecutableGain:0};
}
