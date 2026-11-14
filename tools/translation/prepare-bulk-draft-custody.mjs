// Complete source composition. Output custody cannot replace semantic checks.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedModuleBindings} from './source-copy-native-bindings.mjs';
import {derivePinnedRepositorySourceEvolution} from './pinned-repository-source-evolution.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-source-origin-phases.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PROFILE=new URL('./source-profiles/bulk-draft-custody/',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Complete bulk draft source: '+message);};
const ADDITION=`
export function regenerateWithDraftCustody({check=false,draftDirectory,...options}={}){
  if(check!==true)throw new TypeError('Complete bulk draft custody requires the original freshness check');
  const inputs=captureBulkDraftInputs(options),plan=planRegeneration(options);
  const verifyFresh=()=>{validateRegenerationPlan(plan);assertBulkDraftInputs(inputs,options);};
  verifyFresh();
  const state=plans.get(plan),draft=retainBulkDraft({root:state.root,directory:draftDirectory,plan,expected:state.expected,inputs,verifyFresh});
  const result=applyRegenerationPlan(plan,{check});
  return {...result,draft};
}
`;
const COMMENT='// Optional complete DATA custody; the original freshness result stays fatal.\n';
function inputs(){
 const bytes=readFileSync(new URL('manifest.json',PROFILE));
 if(hash(bytes)!=='81e0e3fc380cc044899954d8ad0610742721ed4e41566e91f6c6922017f85238')fail('complete original manifest differs');
 return JSON.parse(bytes).sources.map(row=>{
  const packed=readFileSync(new URL(row.archive,PROFILE));if(packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('complete original archive differs');
  const raw=gunzipSync(packed,{maxOutputLength:131072});if(raw.length!==row.bytes||hash(raw)!==row.sha256)fail('complete original source differs');
  const source=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw);if(hash(source)!==row.sha256)fail('complete Unicode original differs');return {...row,source};
 });
}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native syntax differs');return file;}
function shape(ts,node){const children=[];ts.forEachChild(node,child=>{children.push(shape(ts,child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];}
function nativeCopy(ts,path,source){
 const file=parse(ts,path,source),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};
 const copies=file.statements.map(node=>{const copy=ts.getSynthesizedDeepClone(node);detach(copy);return copy;});
 const copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,copies));
 if(JSON.stringify(shape(ts,file))!==JSON.stringify(shape(ts,parse(ts,path,copy))))fail('complete detached native copy differs');return {source,copy,completeNativeAstCopy:true};
}
function one(source,before,after){if(source.split(before).length!==2)fail('unique complete native anchor differs');return source.replace(before,()=>after);}
export function deriveBulkDraftSource(ts,path,before){
 if(ts.version!=='5.9.3')fail('lockfile-installed TypeScript 5.9.3 required');
 const file=parse(ts,path,before);let language,after;
 if(path==='tools/translation/bulk.mjs'){
  const functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='regenerate');
  if(functions.length!==1||functions[0].getText(file)!=="export function regenerate({check=false,...options}={}){\n  return applyRegenerationPlan(planRegeneration(options),{check});\n}")fail('original complete regeneration function differs');
  language="import {captureBulkDraftInputs,assertBulkDraftInputs} from './bulk-draft-inputs.mjs';\nimport {retainBulkDraft} from './bulk-draft-custody.mjs';\n"+before+ADDITION;
  after=one(language,ADDITION,'\n'+COMMENT+ADDITION.slice(1));
 }else if(path==='scripts/translate-router.mjs'){
  const old="import { regenerate } from '../tools/translation/bulk.mjs';",updated="import { regenerate,regenerateWithDraftCustody } from '../tools/translation/bulk.mjs';";
  const call='}):regenerate(options);',replacement='}):process.env.ROUTER_BULK_DRAFT_DIRECTORY?regenerateWithDraftCustody({...options,draftDirectory:process.env.ROUTER_BULK_DRAFT_DIRECTORY}):regenerate(options);';
  language=one(one(before,old,updated),call,replacement);
  after=one(language,'}else if(!retainOutputText){','}else if(!retainOutputText){\n'+COMMENT);
 }else fail('unregistered complete original path');
 parse(ts,path,language);parse(ts,path,after);return {language,after};
}
export function prepareBulkDraftCustody({root=ROOT}={}){
 const ts=ownershipCompiler(),archiveOriginals=inputs(),originals=[],files=[];
 for(const archived of archiveOriginals){
  const sourceEvolution=archived.path==='scripts/translate-router.mjs'
   ?derivePinnedRepositorySourceEvolution(ts,{
    profile:new URL('./source-profiles/namespace-progress-observer/1-rules.json',import.meta.url),
    profileSha256:'76fd46c143c5599a94a29df82ffdfe22b4fdb77e430f4d78c9b90a88dcadb2c1',path:archived.path,source:archived.source,
   }):null;
  const before=sourceEvolution?sourceEvolution.after:archived.source;
  const input={path:archived.path,source:before,bytes:Buffer.byteLength(before),sha256:hash(before),
   archivedOriginal:archived,sourceEvolution};originals.push(input);
  const legacy=deriveBulkDraftSource(ts,input.path,before);
  const previousLegacy=deriveBulkDraftSource(ts,input.path,archived.source);
  input.current=readFileSync(resolve(root,input.path),'utf8');
  if(input.current!==before&&input.current!==archived.source&&input.current!==legacy.after&&input.current!==previousLegacy.after)fail('original physical source is outside the complete equation');
  const path=input.path.replace(/\.mjs$/u,'-with-draft-custody.mjs');
  let {language,after}=legacy,previousAfter=previousLegacy.after;
  if(input.path==='scripts/translate-router.mjs'){
   const old="from '../tools/translation/bulk.mjs';",next="from '../tools/translation/bulk-with-draft-custody.mjs';";
   const admission="import {assertBulkDraftCompanionsFresh} from '../tools/translation/prepare-bulk-draft-custody.mjs';\nassertBulkDraftCompanionsFresh();\n";
   const admit=source=>{const at=source.startsWith('#!')?source.indexOf('\n')+1:0;return source.slice(0,at)+admission+source.slice(at);};
   language=admit(one(language,old,next));after=admit(one(after,old,next));
   previousAfter=admit(one(previousAfter,old,next));
  }
  let current='';try{current=readFileSync(resolve(root,path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  if(current!==''&&current!==after&&current!==previousAfter)fail('companion physical source is outside the complete equation');
  const [equation]=transportConcreteNamedSourcePhases([{before,middle:language,after,language:'JavaScript',rules:['javascript:retain-complete-private-output-data-after-fresh-input-checks','router:keep-original-freshness-failure-unconditional','javascript:restore-complete-original-bulk-and-cli','router:restore-original-output-observer-contract']}]);
  if(equation.inverse!==before)fail('complete serialized/reparsed CST inverse differs');
  const [previousEquation]=transportConcreteNamedSourcePhases([{
   before:previousAfter,middle:after,after,language:'JavaScript',
   rules:['javascript:retain-complete-original-draft-companion','router:compose-explicit-namespace-observer',
    'javascript:restore-complete-original-draft-companion','router:restore-original-namespace-progress-contract'],
  }]);
  if(previousEquation.inverse!==previousAfter||previousEquation.after!==after)
   fail('complete companion source-history inverse differs');
  files.push({path,sourcePath:input.path,before,language,after,current,sourceEvolution,previousAfter,previousEquation,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:equation.beforeMeta,afterMeta:equation.afterMeta,inverse:equation.inverse,trace:equation.trace,stages:equation.stages,nativeCopies:[nativeCopy(ts,path,before),nativeCopy(ts,path,after)]});
 }
 const bindings=verifyNativeCopiedModuleBindings(ts,files.map(row=>({path:resolve(root,row.path),source:row.after})));
 for(const [at,row]of files.entries()){
  row.nativeBindings=bindings[at];let current='';
  try{current=readFileSync(resolve(root,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  if(current!==row.current)fail('complete physical source changed');
 }
 for(const input of originals)if(readFileSync(resolve(root,input.path),'utf8')!==input.current)fail('complete original physical source changed');
 if(hash(readFileSync(new URL('./source-profiles/namespace-progress-observer/1-rules.json',import.meta.url)))!=='76fd46c143c5599a94a29df82ffdfe22b4fdb77e430f4d78c9b90a88dcadb2c1')fail('complete CLI source history changed');
 return {schema:'complete-bulk-draft-source-composition-v2',typescriptVersion:ts.version,archiveOriginals,originals,files,semanticAuthority:false,sourceAuthority:false,originalRegenerateBodyChanged:false,runtimeParity:false,rustExecuted:false};
}
export function assertBulkDraftCompanionsFresh(){
 const plan=prepareBulkDraftCustody();
 if(plan.originals.some(row=>row.current!==row.source)||plan.files.some(row=>row.current!==row.after))fail('complete original or companion source differs');
 return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||!['--emit','--check','--write'].includes(process.argv[2]))fail('use --emit|--check|--write');
 const plan=prepareBulkDraftCustody();
 if(process.argv[2]==='--emit')console.log(JSON.stringify(plan));else{
  if(process.argv[2]==='--write'){
   for(const row of plan.originals)if(row.current!==row.source||readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)
    fail('complete original source must be current before companion installation');
   for(const row of plan.files){let current='';try{current=readFileSync(resolve(ROOT,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
    if(current!==row.current)fail('complete companion changed before source installation');}
   for(const row of plan.files){writeFileSync(resolve(ROOT,row.path),row.after);row.current=row.after;}
  }if(plan.originals.some(row=>row.current!==row.source)||plan.files.some(row=>row.current!==row.after))fail('complete current source differs');console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),semanticAuthority:false}));}
}
