// Complete source equations only. These do not authorize a namespace or method.
import {readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-source-origin-phases.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const SELF='tools/translation/prepare-clone-enclosing-source-history.mjs';
const PROFILE='tools/translation/source-profiles/clone-enclosing/source-rules.json';
const PIN='f96f44d34c432fa6608ec95dace9769499d09c169f681f482d494f7d26ed1991';
const PATHS=['builtin-clone-ast-route.mjs','builtin-derive-bang-footprints.mjs',
 'derive-enclosing-namespace-context.mjs'].map(name=>'tools/translation/'+name);
const CHANGED=new Set(['createUnscopedDeriveEnclosingNamespaceContext',
 'deriveEnclosingNamespaceOutputAt','originalDeriveEnclosingNamespaceOutputs',
 'enclosingSelectedOwner','proveDeriveEnclosingNamespaceEffect']);
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Clone enclosing source history: '+message);};

function capture(root,path){
 const absolute=resolve(root,path),state=lstatSync(absolute);
 if(!state.isFile()||state.isSymbolicLink()||state.size>2097152)fail('bounded ordinary complete source required: '+path);
 const bytes=readFileSync(absolute),source=bytes.toString('utf8');
 if(bytes.length!==state.size||!Buffer.from(source).equals(bytes))fail('complete lossless source required: '+path);
 return {path,source,bytes:bytes.length,sha256:hash(bytes)};
}
function profile(){
 const inputs=[capture(ROOT,SELF),capture(ROOT,PROFILE)],selected=inputs[1];
 if(selected.sha256!==PIN)fail('complete authored rule profile differs');
 const rules=JSON.parse(selected.source);
 if(rules.schema!=='clone-enclosing-source-rules-v1'||rules.sourceAuthority!==false||
    rules.productionExecutableGain!==0||rules.rows.length!==3||
    JSON.stringify(rules.rows.map(row=>row.path))!==JSON.stringify(PATHS))fail('complete source universe differs');
 return {rules,inputs};
}
function fresh(inputs){
 for(const row of inputs)if(capture(ROOT,row.path).source!==row.source)fail('complete producer input changed: '+row.path);
}
function syntax(ts,path,source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length||source.split('\n').length>=1000)fail('complete native grammar or line bound differs: '+path);
 return file;
}
function functions(ts,file){
 return file.statements.filter(ts.isFunctionDeclaration).map(node=>({
  name:node.name?.text,source:node.getText(file),span:[node.getStart(file),node.end],
 }));
}
function substitute(source,edits,inverse=false){
 let result=source;
 for(const edit of inverse?[...edits].reverse():edits){
  const before=inverse?edit.after:edit.before,after=inverse?edit.before:edit.after;
  if(typeof before!=='string'||!before.length||typeof after!=='string'||!after.length||result.split(before).length!==2)fail('one complete exact rule anchor required: '+edit.id);
  result=result.replace(before,()=>after);
 }
 return result;
}

// Source DATA for composition with independently checked complete source
// histories. Ordered anchors can overlap; their positions are never batched.
// This operation alone admits no physical source, private issuer or execution.
export function deriveCloneEnclosingContextSourceRules(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>2097152)fail('bounded complete primitive context source required');
 const {rules,inputs}=profile(),selected=rules.rows[2];
 if(selected.path!==PATHS[2]||selected.phase!=='repository')fail('complete ordered context rule selection differs');
 const repositoryRules=selected.edits.map(edit=>exactLiteralSubstitutionRule(
  edit.id,edit.before,edit.after,'Complete ordered Clone context anchor differs: '+edit.id));
 const pipeline=createRulePipeline([{phase:'language',rules:[]},
  {phase:'repository',rules:repositoryRules}]),result=pipeline.run(source),after=result.value;
 if(substitute(source,selected.edits)!==after||substitute(after,selected.edits,true)!==source)fail('complete ordered context inverse differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 syntax(ts,PATHS[2],source);syntax(ts,PATHS[2],after);fresh(inputs);
 return {schema:'clone-enclosing-ordered-source-composition-v1',path:PATHS[2],
  before:source,middle:source,after,inverse:source,rules:selected.edits,
  trace:result.trace,inputs,sourceAuthority:false,runtimeAuthority:false,
  methodExecutionQualified:false,productionExecutableGain:0};
}

// Native comparison DATA for a caller that transports the complete ordered
// source batch itself. This function grants no CST or semantic qualification.
export function deriveCloneEnclosingNativeSourceHistory({path,source}){
 if(!PATHS.includes(path))return null;
 if(typeof source!=='string')fail('complete primitive source required');
 const {rules,inputs}=profile(),selected=rules.rows.find(row=>row.path===path),currentSha256=hash(source);
 let before;
 if(currentSha256===selected.sourceSha256)before=source;
 else if(currentSha256===selected.afterSha256)before=substitute(source,selected.edits,true);
 else fail('unregistered complete source: '+path);
 if(hash(before)!==selected.sourceSha256||!['language','repository'].includes(selected.phase))fail('complete historical inverse differs');
 const edits=selected.edits.map(edit=>exactLiteralSubstitutionRule(edit.id,edit.before,edit.after,'Complete Clone source anchor differs: '+edit.id));
 const language=createRulePipeline([{phase:'language',rules:selected.phase==='language'?edits:[]},
  {phase:'repository',rules:[]}]).run(before);
 const repository=createRulePipeline([{phase:'language',rules:[]},
  {phase:'repository',rules:selected.phase==='repository'?edits:[]}]).run(language.value);
 const middle=language.value,after=repository.value;
 if(hash(after)!==selected.afterSha256||substitute(after,selected.edits,true)!==before||
    substitute(before,selected.edits)!==after||source!==before&&source!==after)fail('complete forward/inverse source equation differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 const oldFunctions=functions(ts,syntax(ts,path,before)),newFunctions=functions(ts,syntax(ts,path,after));
 const unchangedOriginalFunctions=[],changedOriginalFunctions=[];
 for(const old of oldFunctions){
  const matches=newFunctions.filter(row=>row.name===old.name);
  if(matches.length!==1)fail('original function removed or duplicated: '+old.name);
  const current=matches[0],row={name:old.name,before:old.source,after:current.source,
   beforeSpan:old.span,afterSpan:current.span};
  if(old.source===current.source)unchangedOriginalFunctions.push(row);
  else{
   if(path!==PATHS[2]||!CHANGED.has(old.name))fail('unexpected original function change: '+old.name);
   changedOriginalFunctions.push(row);
  }
 }
 if(path!==PATHS[2]&&!after.startsWith(before))fail('complete original Clone/Debug prefix must remain byte exact');
 fresh(inputs);
 return {schema:'clone-enclosing-complete-source-history-v1',path,phase:selected.phase,
  before,middle,after,current:source,beforeSha256:hash(before),afterSha256:hash(after),
  rules:selected.edits,languageTrace:language.trace,repositoryTrace:repository.trace,
  unchangedOriginalFunctions,changedOriginalFunctions,
  appendedFunctions:newFunctions.filter(row=>!oldFunctions.some(old=>old.name===row.name)),
  inputs,inverse:before,sourceAuthority:false,runtimeAuthority:false,
  methodExecutionQualified:false,productionExecutableGain:0,fullGatePassed:false};
}

export function assertCloneEnclosingSourceInputsFresh(history){fresh(history.inputs);}
function complete(rows){
 const equations=transportConcreteNamedSourcePhases(rows.map(({before,middle,after})=>({before,middle,after,language:'JavaScript',
  rules:['javascript:original-Clone-enclosing-named-unit-grammar',
   'router:join-distinct-private-Clone-enclosing-issuer',
   'javascript:restore-complete-original-Clone-source',
   'router:restore-complete-original-enclosing-consumer']})));
 return rows.map((row,at)=>{
  const equation=equations[at];
  if(equation.before!==row.before||equation.middle!==row.middle||equation.after!==row.after||equation.inverse!==row.before)fail('complete serialized/reparsed CST equation differs');
  fresh(row.inputs);return {...row,equation};
 });
}
export function deriveCloneEnclosingSourceHistory(input){
 const row=deriveCloneEnclosingNativeSourceHistory(input);return row?complete([row])[0]:null;
}

export function prepareCloneEnclosingSources({root=ROOT}={}){
 root=resolve(root);const current=PATHS.map(path=>capture(root,path));
 const rows=complete(current.map(row=>deriveCloneEnclosingNativeSourceHistory({path:row.path,source:row.source})));
 for(const row of current)if(capture(root,row.path).source!==row.source)fail('complete physical source changed: '+row.path);
 return {schema:'clone-enclosing-complete-source-proposal-v1',typescriptVersion:'5.9.3',rows,
  sourceEquationsOnly:true,namespaceReceivingQualified:false,methodExecutionQualified:false,
  originalCloneOutputBudgetChanged:false,productionExecutableGain:0,fullGatePassed:false};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args[0]==='--check'&&args.length===1){
  const plan=prepareCloneEnclosingSources();
  if(plan.rows.some(row=>row.current!==row.after))fail('complete installed source is stale');
  console.log('Three complete Clone source equations and native/CST inverses are current; no executable authority.');
 }else if(args[0]==='--emit'&&args.length===2){
  const plan=prepareCloneEnclosingSources(),raw=Buffer.from(JSON.stringify(plan)+'\n'),packed=gzipSync(raw,{mtime:0});
  if(!gunzipSync(packed).equals(raw))fail('complete compressed proposal differs');
  writeFileSync(args[1],packed,{flag:'wx'});
  console.log(JSON.stringify({schema:plan.schema,files:plan.rows.length,completeBytes:raw.length,sha256:hash(raw),productionExecutableGain:0}));
 }else fail('usage: --check | --emit FRESH_COMPLETE_PROPOSAL.json.gz');
}
