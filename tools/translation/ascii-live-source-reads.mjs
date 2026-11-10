// Current source DATA evolution; historical helpers retain their complete bytes.
import {createHash} from 'node:crypto';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-source-origin-phases.mjs';

const HELPER='tools/translation/ascii-runtime-assets.mjs';
const DATA='tools/translation/ascii-runtime-assets-source-data.mjs';
const PREDECESSOR='c86a5e91396b470c6ce46438fd6d024d0087ed8416e0a5a129aeddf45d580563';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('ASCII live source reads: '+message);};
const beforeImport="import {readFileSync} from 'node:fs';";
const afterImport=`import fs from 'node:fs';
import {types} from 'node:util';
const isProxy=types.isProxy;
function readFileSync(...args){
 assertReverseConcreteSourceHost();
 if(!fs||typeof fs!=='object'||isProxy(fs))throw TypeError('ASCII source filesystem host changed');
 const field=Object.getOwnPropertyDescriptor(fs,'readFileSync');
 if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='function'||isProxy(field.value))throw TypeError('ASCII source read host changed');
 return Reflect.apply(field.value,undefined,args);
}`;

export function deriveAsciiLiveSourceReads(ts,result){
 if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const helper=result.files.find(row=>row.path===HELPER),data=result.files.find(row=>row.path===DATA);
 if(!helper||!data||hash(helper.after)!==PREDECESSOR)fail('complete current helper predecessor differs');
 const helperEdits=[{id:'ascii-source:live-own-data-read',before:beforeImport,after:afterImport}];
 const derive=(source,edits)=>{
  const rules=edits.map(edit=>exactLiteralSubstitutionRule(edit.id,edit.before,edit.after,'complete source anchor differs'));
  const transformed=createRulePipeline([{phase:'language',rules:[]},{phase:'repository',rules}]).run(source);
  let inverse=transformed.value;
  for(const edit of [...edits].reverse()){
   if(inverse.split(edit.after).length!==2)fail('complete source inverse anchor differs');
   inverse=inverse.replace(edit.after,()=>edit.before);
  }
  if(inverse!==source)fail('complete source inverse differs');
  return {...transformed,inverse};
 };
 const changed=derive(helper.after,helperEdits);
 const dataEdits=[['ASCII_RUNTIME_ASSET_SOURCE',helper.after,changed.value],
  ['ASCII_RUNTIME_ASSET_SHA256',hash(helper.after),hash(changed.value)]].map(([name,before,after])=>({
   id:'ascii-source:rejoin-'+name,before:'export const '+name+'='+JSON.stringify(before)+';',
   after:'export const '+name+'='+JSON.stringify(after)+';',
  }));
 const changedData=derive(data.after,dataEdits);
 const rows=[{path:HELPER,before:helper.after,after:changed.value,edits:helperEdits},
  {path:DATA,before:data.after,after:changedData.value,edits:dataEdits}];
 const equations=transportConcreteNamedSourcePhases(rows.map((row,at)=>({
  before:row.before,middle:row.before,after:row.after,language:'JavaScript',
  rules:['ascii-live:language:'+at,'ascii-live:repository:'+at,'ascii-live:inverse-language:'+at,'ascii-live:inverse-repository:'+at],
 })));
 for(const row of rows)for(const source of [row.before,row.after]){
  const file=ts.createSourceFile(row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length||source.split('\n').length>=1000)fail('complete native grammar or line bound differs');
 }
 const sourceReadEvolution={files:rows.map((row,at)=>({...row,equation:equations[at]})),
  sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,productionExecutableGain:0};
 return {...result,sourceReadEvolution,files:result.files.map(row=>{
  const evolved=rows.find(other=>other.path===row.path);
  return evolved?{...row,after:evolved.after}:row;
 })};
}
