// Receiving source DATA only. Complete CST equations grant no execution permission.
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRulePipeline} from '../../rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../../literal-substitution-rule.mjs';
import {transportConcreteNamedSourcePhases} from '../../concrete-named-phases.mjs';
const root=new URL('../../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw Error('Complete unit privacy source composition: '+message);};
const identity=state=>['dev','ino','mode','size','mtimeMs','ctimeMs'].map(key=>state[key]);
function physical(path){
 const url=new URL(path,root),before=lstatSync(url);
 if(!before.isFile()||before.isSymbolicLink())fail('ordinary complete physical file required: '+path);
 const source=readFileSync(url,'utf8');
 if(JSON.stringify(identity(before))!==JSON.stringify(identity(lstatSync(url))))fail('physical source changed during read: '+path);
 return {source,identity:identity(before)};
}
export function composeUnitPrivacyApplicationSources(packet){
 const raw=readFileSync(new URL('./unit-privacy-source-rules.json',import.meta.url));
 if(hash(raw)!=='2ea2bda49086d73d03111549a9e6e3c02f28d7d736d1e10fd2f62631237ad0ac')fail('reviewed complete source rules changed');
 const rules=JSON.parse(raw),rows=[];
 if(packet.schema!=='router-unit-matches-complete-application-sources-v1'||packet.files.length!==567||new Set(packet.files.map(row=>row.path)).size!==567)fail('complete original application required');
 for(const part of rules.files){
  const original=packet.files.find(row=>row.path===part.path);
  if(!original||hash(original.source)!==original.sha256||original.sha256!==part.beforeSha256)fail('complete pinned privacy parent differs: '+part.path);
  const applied=createRulePipeline([
   {phase:'language',rules:part.edits.map((edit,at)=>exactLiteralSubstitutionRule('unit-privacy:'+part.path+':'+at,edit.expected,edit.replacement,'Complete reviewed privacy anchor differs: '+part.path))},
   {phase:'repository',rules:[]},
  ]).run(original.source);
  if(hash(applied.value)!==part.afterSha256)fail('complete reviewed privacy afterimage differs: '+part.path);
  rows.push({path:part.path,before:original.source,middle:applied.value,after:applied.value,trace:applied.trace,afterSha256:part.afterSha256});
 }
 if(packet.files.some(row=>row.path===rules.addition.path))fail('new geolocation module already in historical application');
 const addition=physical(rules.addition.path);
 if(hash(addition.source)!==rules.addition.sha256)fail('complete added geolocation module differs');
 rows.push({path:rules.addition.path,before:'',middle:'',after:addition.source,trace:[],afterSha256:rules.addition.sha256,added:true});
 const observed=rows.map(row=>physical(row.path));
 for(const [at,row]of rows.entries())if(observed[at].source!==row.after)fail('complete current privacy source differs: '+row.path);
 const equations=transportConcreteNamedSourcePhases(rows.map(row=>({before:row.before,middle:row.middle,after:row.after,language:'Rust',rules:['unit-privacy:reviewed-language-edits','router:retain-complete-privacy-source','unit-privacy:restore-language-input','router:restore-complete-archived-parent']})));
 const result={};
 for(const [at,row]of rows.entries()){
  const equation=equations[at],current=physical(row.path);
  if(equation.before!==row.before||equation.middle!==row.middle||equation.after!==row.after||equation.inverse!==row.before)fail('whole privacy source equation differs');
  if(current.source!==observed[at].source||JSON.stringify(current.identity)!==JSON.stringify(observed[at].identity))fail('privacy source changed during complete transaction: '+row.path);
  result[row.path]={historicalSource:row.before,source:row.after,equation:{...equation,afterSha256:row.afterSha256},trace:row.trace,added:row.added===true,semanticAuthority:false};
 }
 if(!readFileSync(new URL('./unit-privacy-source-rules.json',import.meta.url)).equals(raw))fail('complete source rules changed during transaction');
 return result;
}
