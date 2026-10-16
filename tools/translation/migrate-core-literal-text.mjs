// Maintainer-authorized source adoption; ordinary standard trait dispatch is
// not inferred or granted by this proposal. Fresh checking remains mandatory.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {sourceItems} from './rust-structure.mjs';
import {createLiteralTextImportRoles} from './literal-text-import-roles.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from './source-module-views.mjs';
import {originalUseDeclarationLeaves,originalDeclarationHeader} from './module-bindings.mjs';
import {resolveModuleGraph} from './project.mjs';
import {PRODUCTION_PROFILE,itemConfiguration,compilationProfile as normalizeProfile} from './cfg-profile.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from './router-core-source-data.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-primitives.mjs';

const MAX_SOURCE=2_000_000,MAX_TOTAL=32_000_000,MAX_FILES=1024;
const target='crate::translation_core::format!',textType='crate::translation_core::Text';
const conversions=new Set(['to_string','to_owned']);
const keywords=new Set('as async await break const continue crate dyn else enum extern false fn for gen if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final macro override priv try typeof unsized virtual yield _'.split(' '));
const inert=new Set(['doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','track_caller','test']);
const fail=reason=>{throw new TypeError('Owned literal text adoption: '+reason);};
const hash=source=>createHash('sha256').update(source).digest('hex');
const significant=item=>item.tokens.filter(row=>row.type!=='comment');
const bounded=source=>{if(typeof source!=='string'||source.length>MAX_SOURCE)fail('bounded primitive complete source required');return source;};
function close(rows,start){
  const pairs={'(':')','[':']','{':'}'},stack=[];
  for(let at=start;at<rows.length;at++){const word=rows[at].text;if(pairs[word])stack.push(pairs[word]);else if([')',']','}'].includes(word)){if(stack.pop()!==word)return -1;if(!stack.length)return at;}}return -1;
}
function scopeProblems(items,profile,path=[],module=null,roleFor=null,importRoles=[]){
  const problems=[];
  for(const item of items){
    const condition=itemConfiguration(item.tokens,profile);if(condition.status==='inactive'||item.comment)continue;
    const rows=significant(item),names=[];
    for(let at=0;at<rows.length;at++){
      if(rows[at].text==='r'&&rows[at+1]?.text==='#'&&rows[at+2]?.type==='ident'&&rows[at].end===rows[at+1].start&&rows[at+1].end===rows[at+2].start){names.push(rows[at+2].text);at+=2;}else names.push(rows[at].text);
    }
    if(condition.status!=='active')problems.push('unknown declaration configuration');
    if(condition.attributes.some(attribute=>!inert.has(attribute.name)&&attribute.name!=='cfg'&&!(item.term==='mod'&&attribute.name==='macro_use'&&attribute.tokens.join('')==='#[macro_use]')))problems.push('unresolved declaration attribute producer');
    if(item.term==='use'){
      try{for(const leaf of originalUseDeclarationLeaves(item,path)){
        if(leaf.glob||['ToString','ToOwned','String','_','std','core'].includes(leaf.name)||leaf.segments.some(name=>['ToString','ToOwned'].includes(name)))problems.push('conversion trait/type import or glob competition');
        else {const role=module&&roleFor?.(module,item,leaf);if(role)importRoles.push(role);else problems.push('named import role is unclassified; it may supply a conversion trait');}
      }}
      catch{problems.push('unresolved import declaration');}
    }
    if(names.some((name,at)=>['trait','type','struct','enum','union','mod'].includes(name)&&['ToString','ToOwned','String','std','core'].includes(names[at+1])))problems.push('conversion trait or String declaration competition');
    if(names.some((name,at)=>name==='fn'&&conversions.has(names[at+1])))problems.push('conversion method declaration competition');
    if(item.term==='opaque'){
      // Ordinary extern-crate bindings do not import trait members. The
      // exact builtin macro_use module attribute imports macro names only;
      // actual invocation/attribute producers remain separate refusals.
      const ordinaryExtern=names[0]==='extern'&&names[1]==='crate'&&rows[2]?.type==='ident'&&(names.length===4&&names[3]===';'||names.length===6&&names[3]==='as'&&rows[4]?.type==='ident'&&names[5]===';');
      if(!ordinaryExtern||['String','ToString','ToOwned','_','std','core'].includes(names.length===6?names[4]:names[2]))problems.push('unresolved declaration producer');
    }
  }
  return [...new Set(problems)];
}
function macroOpen(rows,at){
  const row=rows[at];if(row?.type!=='ident')return -1;
  const merged=row.text.endsWith('!'),name=merged?row.text.slice(0,-1):row.text;
  const raw=rows[at-2]?.text==='r'&&rows[at-1]?.text==='#'&&rows[at-2].end===rows[at-1].start&&rows[at-1].end===row.start;
  if(keywords.has(name)&&!raw)return -1;
  const open=at+(merged?1:2);return (merged||rows[at+1]?.text==='!')&&['(','[','{'].includes(rows[open]?.text)?open:-1;
}
function functionSelection(source,item,path,profile,problems){
  const header=originalDeclarationHeader(item,path),condition=itemConfiguration(item.tokens,profile),rows=significant(item);
  if(!header||header.kind!=='fn')return null;
  const record={function:header.name,module:[...path],span:[item.start,item.end]},skipped=[];
  const stop=reason=>({edits:[],selection:null,skipped:[{...record,reason}]});
  if(problems.length)return stop('source trait/type/producer uncertainty: '+problems.join('; '));
  if(condition.status!=='active'||condition.attributes.some(attribute=>!inert.has(attribute.name)&&attribute.name!=='cfg'))return stop('inactive or unresolved function attribute');
  const fn=rows.findIndex(row=>row.start===header.keywordSpan.start),name=rows.findIndex(row=>row.start===header.nameSpan.start);
  if(header.rawIdentifier||rows[name+1]?.text!=='('||rows.slice(0,fn).some(row=>['const','unsafe','extern','async'].includes(row.text)))return stop('raw, generic, const, unsafe, extern or async function');
  const parameters=close(rows,name+1);let body=parameters+1;
  while(body>0&&body<rows.length&&rows[body].text!=='{')body++;
  if(parameters<0||body>=rows.length||close(rows,body)!==rows.length-1||rows.slice(parameters+1,body).some(row=>row.text==='where'))return stop('complete ordinary function signature/body required');
  const inner=rows.slice(body+1,-1);
  if(inner.some(row=>['fn','trait','impl','use','macro_rules!','macro','type','struct','enum','union','mod'].includes(row.text)))return stop('nested declaration/import/producer');
  const macroSpans=[];
  for(let at=body+1;at<rows.length-1;at++){const open=macroOpen(rows,at);if(open<0)continue;const end=close(rows,open);if(end<0)return stop('unclosed macro token tree');macroSpans.push([at,end]);at=end;}
  const edits=[],selected=[];
  for(let at=body+1;at+4<rows.length-1;at++){
    const literal=rows[at],written=source.slice(literal.start,literal.end),previous=rows[at-1];
    // The structural lexer also masks chars and br/cr strings as string tokens.
    // Admit only written UTF8 str literals, never byte/C/character receivers.
    const stringLiteral=written.startsWith('"')&&!((previous?.type==='ident')&&previous.end===literal.start)||/^r#{0,255}"/u.test(written);
    if(literal.type!=='string'||!stringLiteral||rows[at+1].text!=='.'||!conversions.has(rows[at+2].text)||rows[at+3].text!=='('||rows[at+4].text!==')')continue;
    const span=[literal.start,rows[at+4].end];
    if(macroSpans.some(([first,last])=>at>=first&&at<=last)){skipped.push({...record,span,reason:'literal conversion inside unexpanded macro token tree'});continue;}
    if(item.tokens.some(row=>row.type==='comment'&&row.start>=literal.end&&row.end<=span[1])){skipped.push({...record,span,reason:'conversion trivia contains comments; preserve unchanged'});continue;}
    const original=source.slice(literal.start,literal.end),edit={span,expected:source.slice(...span),replacement:`${target}("{}", ${original})`};
    edits.push(edit);selected.push({span,method:rows[at+2].text,literal:original,originalDispatchProved:false});at+=4;
  }
  if(!edits.length)return {edits,selection:null,skipped};
  const result=rows.slice(parameters+1,body),bare=result.length===2&&result[0].text==='->'&&result[1].text==='String';
  if(bare)edits.push({span:[result[1].start,result[1].end],expected:'String',replacement:textType});
  return {edits,selection:{...record,conversions:selected,ownedReturnAlias:bare,bodyAdmission:false},skipped};
}
function propose(source,modules,profile,externalProblems=[],roleFor=createLiteralTextImportRoles(modules,profile)){
  const before=transportConcreteSyntaxSource(source,{language:'Rust'}),edits=[],selections=[],skipped=[],importRoles=[];
  for(const module of modules){
    const ancestors=modules.filter(parent=>parent!==module&&parent.path.length<module.path.length&&parent.path.every((word,at)=>word===module.path[at]));
    const items=originalSourceModuleItems(module),problems=[...externalProblems,...ancestors.flatMap(parent=>scopeProblems(originalSourceModuleItems(parent),profile,parent.path,parent,roleFor,importRoles)),...scopeProblems(items,profile,module.path,module,roleFor,importRoles)];
    if(module.configurationCondition!=='active'){skipped.push({module:module.path,reason:'module configuration is not active'});continue;}
    for(const item of items){if(item.term!=='fn')continue;let result;try{result=functionSelection(source,item,module.path,profile,problems);}catch(error){skipped.push({span:[item.start,item.end],reason:error.message});continue;}if(!result)continue;edits.push(...result.edits);skipped.push(...result.skipped);if(result.selection)selections.push(result.selection);}
  }
  edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('source substitutions overlap or differ');
  const applied=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'literal-text:retain-complete-literal-operands',edits:[]}],repositoryRules:[{id:'router-core:adopt-owned-literal-formatting',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));
  const mapping=[];let old=0,current=0;
  for(const edit of edits){if(edit.span[0]>old){const size=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}mapping.push({kind:'substitution',before:[...edit.span],after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});current+=edit.replacement.length;old=edit.span[1];}
  if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});let inverse=after.source;
  for(let at=mapping.length-1;at>=0;at--){const row=mapping[at];if(row.kind==='substitution'){if(inverse.slice(...row.after)!==row.replacement)fail('inverse substitution changed');inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);}}
  if(inverse!==source)fail('complete inverse differs');
  return {schema:'router-owned-literal-text-adoption-v1',before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},compilationProfile:profile,edits,selections,skipped,importRoles,mapping,trace:applied.trace,executableAdmission:false,migrationSemantics:'maintainer-authorized explicit owned API adoption; no arbitrary original standard trait dispatch theorem',libraryImplementation:'existing untranslated Rust std::format interface'};
}
export function migrateCoreLiteralText(source,{rootSource='',compilationProfile:input=PRODUCTION_PROFILE}={}){
  bounded(source);bounded(rootSource);const profile=normalizeProfile(input),captured=captureSourceModuleViews({source,sourcePath:'src/literal_adoption.rs',compilationProfile:profile}),modules=captured.views.map(view=>({file:'src/literal_adoption.rs',source,path:[...view.modulePath],sourceView:view,compilationProfile:profile,configurationCondition:view.configurationCondition}));
  return propose(source,modules,profile,rootSource?scopeProblems(sourceItems(rootSource),profile):[]);
}
function sourceMap(input){
  if(!input||typeof input!=='object'||types.isProxy(input)||![null,Object.prototype].includes(Object.getPrototypeOf(input)))fail('own primitive source map required');
  const keys=Reflect.ownKeys(input);if(keys.length>MAX_FILES)fail('file count bound');const files=Object.create(null);let total=0;
  for(const key of keys){if(typeof key!=='string'||key.length>4096||!key.endsWith('.rs')||key.includes('\\')||key.startsWith('/')||/[\x00-\x1f:]/u.test(key)||key.split('/').some(part=>!part||part==='.'||part==='..'))fail('canonical relative Rust source path required');const d=Object.getOwnPropertyDescriptor(input,key);if(!d||!Object.hasOwn(d,'value'))fail('own source data required');bounded(d.value);total+=d.value.length;if(total>MAX_TOTAL)fail('complete corpus source bound');files[key]=d.value;}return files;
}
export function proposeCoreLiteralTextCorpus({entry='src/lib.rs',files:input,compilationProfile:inputProfile=PRODUCTION_PROFILE}={}){
  const files=sourceMap(input),profile=normalizeProfile(inputProfile);if(typeof entry!=='string'||!Object.hasOwn(files,entry))fail('actual entry source required');
  const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),same=(module,path)=>module.path.length===path.length&&module.path.every((name,at)=>name===path[at]);
  const roots=graph.modules.filter(module=>same(module,[])),cores=graph.modules.filter(module=>same(module,['translation_core'])),leaves=graph.modules.filter(module=>same(module,['translation_core','primitives']));
  if(roots.length!==1||cores.length!==1||leaves.length!==1||cores[0].file!=='src/translation_core.rs'||cores[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaves[0].file!=='src/translation_core/primitives.rs'||leaves[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||cores[0].configurationCondition!=='active'||leaves[0].configurationCondition!=='active')fail('complete actual owned facade/primitive source routes required');
  const edge=originalSourceModuleItems(roots[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edge.length!==1||roots[0].source.slice(edge[0].start,edge[0].end).trim()!=='pub mod translation_core;')fail('actual unadorned public core edge required');
  const after={...files},proposals=[],skipped=[],roleFor=createLiteralTextImportRoles(graph.modules,profile);
  for(const file of Object.keys(files)){const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>module.sourceView?.modulePath.length===0);if(origins.length!==1){skipped.push({file,reason:'physical source has no unique original module origin'});continue;}const origin=origins[0],ancestors=graph.modules.filter(module=>module.file!==file&&module.path.length<origin.path.length&&module.path.every((name,at)=>origin.path[at]===name)),problems=ancestors.flatMap(module=>scopeProblems(originalSourceModuleItems(module),profile,module.path,module,roleFor)),result=propose(files[file],modules,profile,problems,roleFor);proposals.push({file,module:origin.path,...result});after[file]=result.after.source;}
  return {schema:'router-owned-literal-text-corpus-v1',entry,compilationProfile:profile,before:{...files},after,inputs:Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},proposals,skipped,executableAdmission:false};
}
