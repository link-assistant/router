import {crateModuleSourcePath} from './repository-layout.mjs';
// Maintainer-authorized source adoption; ordinary standard trait dispatch is
// not inferred or granted by this proposal. Fresh checking remains mandatory.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {sourceItems} from './rust-structure.mjs';
import {selectBorrowedTextConversions} from './core-borrowed-text-adoption.mjs';
import {createCoreAdoptionProducerContext,coreAdoptionDeriveAttributeClosed,finishCoreAdoptionProducerContext} from './source-bound-owned-core-context.mjs';
import {createLiteralTextImportRoles,verifyLiteralTextImportRoles} from './source-bound-owned-literal-text-import-roles.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from './source-module-views.mjs';
import {originalUseDeclarationLeaves,originalDeclarationHeader} from './module-bindings.mjs';
import {resolveModuleGraph} from './project.mjs';
import {planTrackedModulePath,isTrackedModulePathPlan} from './module-paths.mjs';
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
// A conditional external module introduces only its module name in this
// parent. Its contents do not import conversion traits into the parent scope.
// Retain both declaration alternatives; never choose the cfg predicate.
function conditionalModule(item,condition,path){
  if(item.term!=='mod'||condition.status!=='unknown'||condition.diagnostics.length||!condition.attributes.some(row=>row.name==='cfg')||condition.attributes.some(row=>row.name!=='cfg'&&!inert.has(row.name)||row.tokens[1]==='!'))return null;
  const header=originalDeclarationHeader(item,path),rows=significant(item);
  if(!header||header.kind!=='mod'||header.rawIdentifier||['ToString','ToOwned','String','std','core'].includes(header.name))return null;
  const keyword=rows.findIndex(row=>row.start===header.keywordSpan.start),tail=rows.slice(keyword);
  if(keyword<0||tail.length!==3||tail[0].text!=='mod'||tail[1].text!==header.name||tail[2].text!==';')return null;
  return {module:[...path],name:header.name,span:[item.start,item.end],declarationTokens:rows.map(row=>({text:row.text,type:row.type,start:row.start,end:row.end})),configuration:condition,predicateSelected:false,alternatives:[{present:false},{present:true,kind:'mod',name:header.name}],role:'noncompeting-external-module-declaration',semanticAdmission:false};
}
// Reissue the existing private tracked-path plan from the current complete
// graph. This closes only a module-file selection, never an arbitrary attribute.
function trackedPathSelector(graph,files){
  const paths=Object.keys(files);
  return (module,item,attribute)=>{
    if(item.term!=='mod'||attribute.name!=='path'||!graph.modules.includes(module))return false;
    let plan;try{plan=planTrackedModulePath(module,item,paths);}catch(error){if(!(error instanceof TypeError))throw error;return false;}
    if(!isTrackedModulePathPlan(plan)||plan.explicitPath===null||!plan.attributes.some(row=>row.name==='path'&&row.span.start===attribute.span.start&&row.span.end===attribute.span.end&&JSON.stringify(row.tokens)===JSON.stringify(attribute.tokens)))return false;
    const childPath=[...module.path,plan.name],target=plan.inline?module.file:plan.target;
    const children=graph.modules.filter(child=>child.file===target&&child.source===files[target]&&child.configurationCondition==='active'&&child.path.length===childPath.length&&child.path.every((name,at)=>name===childPath[at]));
    const edges=graph.edges.filter(edge=>edge.from===module.file&&edge.to===target&&edge.module.length===childPath.length&&edge.module.every((name,at)=>name===childPath[at])&&edge.pathSelection?.span.start===item.start&&edge.pathSelection?.span.end===item.end);
    return children.length===1&&edges.length===1&&JSON.stringify(edges[0].pathSelection)===JSON.stringify(plan);
  };
}
function scopeProblems(items,profile,path=[],module=null,roleFor=null,importRoles=[],conditionalDeclarations=[],producerContext=null,pathFor=null){
  const problems=[];
  for(const item of items){
    const condition=itemConfiguration(item.tokens,profile);if(condition.status==='inactive'||item.comment)continue;
    const rows=significant(item),names=[];
    for(let at=0;at<rows.length;at++){
      if(rows[at].text==='r'&&rows[at+1]?.text==='#'&&rows[at+2]?.type==='ident'&&rows[at].end===rows[at+1].start&&rows[at+1].end===rows[at+2].start){names.push(rows[at+2].text);at+=2;}else names.push(rows[at].text);
    }
    if(condition.status!=='active'){const alternative=conditionalModule(item,condition,path);if(alternative)conditionalDeclarations.push(alternative);else problems.push('unknown declaration configuration');}
    if(condition.attributes.some(attribute=>!inert.has(attribute.name)&&attribute.name!=='cfg'&&!(item.term==='mod'&&attribute.name==='macro_use'&&attribute.tokens.join('')==='#[macro_use]')&&!(module&&pathFor?.(module,item,attribute))&&!(module&&coreAdoptionDeriveAttributeClosed(producerContext,module.source,module.file,module.sourceView?.modulePath??module.path,item,attribute))))problems.push('unresolved declaration attribute producer');
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
// These additional names matter only to the new shared-text candidate lane;
// the original literal-only namespace rules and outputs remain intact.
function borrowedScopeProblems(items,profile,path=[]){
  const reserved=new Set(['str','Option','Some','None','translation_core']),problems=[];
  for(const item of items){if(item.comment||itemConfiguration(item.tokens,profile).status==='inactive')continue;
    const header=originalDeclarationHeader(item,path);if(header&&reserved.has(header.name)&&!(header.kind==='mod'&&header.name==='translation_core'&&path.length===0))problems.push('competing borrowed-text source binding '+header.name);
    if(item.term==='use')try{for(const leaf of originalUseDeclarationLeaves(item,path))if(leaf.glob||reserved.has(leaf.name))problems.push('competing borrowed-text import '+leaf.name);}catch{problems.push('unresolved borrowed-text import');}
    const rows=significant(item);if(rows[0]?.text==='extern'&&rows[1]?.text==='crate'&&reserved.has(rows[3]?.text==='as'?rows[4]?.text:rows[2]?.text))problems.push('competing borrowed-text crate alias');
  }return problems;
}
function macroOpen(rows,at){
  const row=rows[at];if(row?.type!=='ident')return -1;
  const merged=row.text.endsWith('!'),name=merged?row.text.slice(0,-1):row.text;
  const raw=rows[at-2]?.text==='r'&&rows[at-1]?.text==='#'&&rows[at-2].end===rows[at-1].start&&rows[at-1].end===row.start;
  if(keywords.has(name)&&!raw)return -1;
  const open=at+(merged?1:2);return (merged||rows[at+1]?.text==='!')&&['(','[','{'].includes(rows[open]?.text)?open:-1;
}
function functionSelection(source,item,path,profile,problems,borrowedProblems=[]){
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
  if(!borrowedProblems.length){
    const borrowed=selectBorrowedTextConversions(source,item,{rows,parameters,body,macroSpans});skipped.push(...borrowed.skipped.map(row=>({...record,...row})));
    for(const candidate of borrowed.candidates){const replacement=candidate.kind==='option-function-item'?`|${candidate.operand}| ${target}("{}", ${candidate.operand})`:`${target}("{}", ${candidate.operand})`;
      edits.push({span:candidate.span,expected:source.slice(...candidate.span),replacement});selected.push({...candidate,sourceResolvedCandidate:true,checkedTypeAuthority:false});}
  }else skipped.push({...record,reason:'borrowed-text namespace uncertainty: '+borrowedProblems.join('; ')});
  if(!edits.length)return {edits,selection:null,skipped};
  const result=rows.slice(parameters+1,body),bare=result.length===2&&result[0].text==='->'&&result[1].text==='String';
  if(bare)edits.push({span:[result[1].start,result[1].end],expected:'String',replacement:textType});
  return {edits,selection:{...record,conversions:selected,ownedReturnAlias:bare,bodyAdmission:false},skipped};
}
function propose(source,modules,profile,externalProblems=[],roleFor=createLiteralTextImportRoles(modules,profile),externalConditions=[],producerContext=null,externalBorrowedProblems=[],pathFor=null){
  const before=transportConcreteSyntaxSource(source,{language:'Rust'}),edits=[],selections=[],skipped=[],importRoles=[],conditionalDeclarations=[...externalConditions];
  for(const module of modules){
    const ancestors=modules.filter(parent=>parent!==module&&parent.path.length<module.path.length&&parent.path.every((word,at)=>word===module.path[at]));
    const items=originalSourceModuleItems(module),problems=[...externalProblems,...ancestors.flatMap(parent=>scopeProblems(originalSourceModuleItems(parent),profile,parent.path,parent,roleFor,importRoles,conditionalDeclarations,producerContext,pathFor)),...scopeProblems(items,profile,module.path,module,roleFor,importRoles,conditionalDeclarations,producerContext,pathFor)];
    if(module.configurationCondition!=='active'){skipped.push({module:module.path,reason:'module configuration is not active'});continue;}
    for(const item of items){if(item.term!=='fn')continue;let result;try{result=functionSelection(source,item,module.path,profile,problems,[...externalBorrowedProblems,...ancestors.flatMap(parent=>borrowedScopeProblems(originalSourceModuleItems(parent),profile,parent.path)),...borrowedScopeProblems(items,profile,module.path)]);}catch(error){skipped.push({span:[item.start,item.end],reason:error.message});continue;}if(!result)continue;edits.push(...result.edits);skipped.push(...result.skipped);if(result.selection)selections.push(result.selection);}
  }
  edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('source substitutions overlap or differ');
  const applied=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'literal-text:retain-complete-literal-operands',edits:[]}],repositoryRules:[{id:'router-core:adopt-owned-literal-formatting',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));
  const mapping=[];let old=0,current=0;
  for(const edit of edits){if(edit.span[0]>old){const size=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}mapping.push({kind:'substitution',before:[...edit.span],after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});current+=edit.replacement.length;old=edit.span[1];}
  if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});let inverse=after.source;
  for(let at=mapping.length-1;at>=0;at--){const row=mapping[at];if(row.kind==='substitution'){if(inverse.slice(...row.after)!==row.replacement)fail('inverse substitution changed');inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);}}
  if(inverse!==source)fail('complete inverse differs');
  return {schema:'router-owned-literal-text-adoption-v1',before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},compilationProfile:profile,edits,selections,skipped,importRoles,conditionalDeclarations,mapping,trace:applied.trace,executableAdmission:false,migrationSemantics:'maintainer-authorized explicit owned API adoption; no arbitrary original standard trait dispatch theorem',libraryImplementation:'existing untranslated Rust std::format interface'};
}
export function migrateCoreLiteralText(source,{rootSource='',compilationProfile:input=PRODUCTION_PROFILE}={}){
  bounded(source);bounded(rootSource);const profile=normalizeProfile(input),captured=captureSourceModuleViews({source,sourcePath:'src/literal_adoption.rs',compilationProfile:profile}),modules=captured.views.map(view=>({file:'src/literal_adoption.rs',source,path:[...view.modulePath],sourceView:view,compilationProfile:profile,configurationCondition:view.configurationCondition}));
  const conditions=[],problems=rootSource?scopeProblems(sourceItems(rootSource),profile,[],null,null,[],conditions):[];return propose(source,modules,profile,problems,undefined,conditions,null,rootSource?borrowedScopeProblems(sourceItems(rootSource),profile,[]):[]);
}
function sourceMap(input){
  if(!input||typeof input!=='object'||types.isProxy(input)||![null,Object.prototype].includes(Object.getPrototypeOf(input)))fail('own primitive source map required');
  const keys=Reflect.ownKeys(input);if(keys.length>MAX_FILES)fail('file count bound');const files=Object.create(null);let total=0;
  for(const key of keys){if(typeof key!=='string'||key.length>4096||!key.endsWith('.rs')||key.includes('\\')||key.startsWith('/')||/[\x00-\x1f:]/u.test(key)||key.split('/').some(part=>!part||part==='.'||part==='..'))fail('canonical relative Rust source path required');const d=Object.getOwnPropertyDescriptor(input,key);if(!d||!Object.hasOwn(d,'value'))fail('own source data required');bounded(d.value);total+=d.value.length;if(total>MAX_TOTAL)fail('complete corpus source bound');files[key]=d.value;}return files;
}
export function proposeCoreLiteralTextCorpus(options={}){
  const {entry='src/lib.rs',files:input,compilationProfile:inputProfile=PRODUCTION_PROFILE}=options,dependencyField=Object.getOwnPropertyDescriptor(options,'dependencyInputs');
  if(dependencyField&&!Object.hasOwn(dependencyField,'value'))fail('dependencyInputs must be an own data field');
  const dependencyInputs=dependencyField?.value;
  const files=sourceMap(input),profile=normalizeProfile(inputProfile);if(typeof entry!=='string'||!Object.hasOwn(files,entry))fail('actual entry source required');
  const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),same=(module,path)=>module.path.length===path.length&&module.path.every((name,at)=>name===path[at]);
  const roots=graph.modules.filter(module=>same(module,[])),cores=graph.modules.filter(module=>same(module,['translation_core'])),leaves=graph.modules.filter(module=>same(module,['translation_core','primitives']));
  if(roots.length!==1||cores.length!==1||leaves.length!==1||cores[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core.rs')||cores[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaves[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core/primitives.rs')||leaves[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||cores[0].configurationCondition!=='active'||leaves[0].configurationCondition!=='active')fail('complete actual owned facade/primitive source routes required');
  const edge=originalSourceModuleItems(roots[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edge.length!==1||roots[0].source.slice(edge[0].start,edge[0].end).trim()!=='pub mod translation_core;')fail('actual unadorned public core edge required');
  const after={...files},proposals=[],skipped=[],producerContext=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs}),roleFor=createLiteralTextImportRoles(graph.modules,profile,dependencyInputs,producerContext),pathFor=trackedPathSelector(graph,files);
  for(const file of Object.keys(files)){const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>module.sourceView?.modulePath.length===0);if(origins.length!==1){skipped.push({file,reason:'physical source has no unique original module origin'});continue;}const origin=origins[0],ancestors=graph.modules.filter(module=>module.file!==file&&module.path.length<origin.path.length&&module.path.every((name,at)=>origin.path[at]===name)),conditions=[],problems=ancestors.flatMap(module=>scopeProblems(originalSourceModuleItems(module),profile,module.path,module,roleFor,[],conditions,producerContext,pathFor)),borrowedProblems=ancestors.flatMap(module=>borrowedScopeProblems(originalSourceModuleItems(module),profile,module.path)),result=propose(files[file],modules,profile,problems,roleFor,conditions,producerContext,borrowedProblems,pathFor);proposals.push({file,module:origin.path,...result});after[file]=result.after.source;}
  const result={schema:'router-owned-literal-text-corpus-v1',entry,compilationProfile:profile,before:{...files},after,inputs:Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},proposals,skipped,executableAdmission:false};
  const producerEffects=finishCoreAdoptionProducerContext(producerContext);if(producerEffects)result.producerEffects=producerEffects;
  verifyLiteralTextImportRoles(roleFor);const currentDependency=Object.getOwnPropertyDescriptor(options,'dependencyInputs');
  if(!!currentDependency!==!!dependencyField||dependencyField&&(!currentDependency||!Object.hasOwn(currentDependency,'value')||currentDependency.value!==dependencyInputs||currentDependency.writable!==dependencyField.writable||currentDependency.enumerable!==dependencyField.enumerable||currentDependency.configurable!==dependencyField.configurable))fail('dependencyInputs option changed');
  return result;
}

// Generated detached literal-text packet DATA; original materialized API unchanged.
const literalStreamSame=(a,b)=>a.length===b.length&&a.every((value,at)=>value===b[at]);
function literalStreamRecord(input,allowed,bound,label){
 if(!input||typeof input!=='object'||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail(label+' own data required');
 const parent=Object.getPrototypeOf(input),names=Reflect.ownKeys(input);if(names.length>bound||names.some(name=>typeof name!=='string'||name==='stack'||allowed&&!allowed.includes(name)))fail(label+' fields differ');
 const rows=names.map(name=>[name,Object.getOwnPropertyDescriptor(input,name)]),value=Object.create(null);for(const [name,d]of rows){if(!d||!Object.hasOwn(d,'value'))fail(label+' own data required');value[name]=d.value;}
 return {value,verify(){if(Object.getPrototypeOf(input)!==parent||!literalStreamSame(Reflect.ownKeys(input),names))fail(label+' changed');for(const [name,a]of rows){const b=Object.getOwnPropertyDescriptor(input,name);if(!b||!Object.hasOwn(b,'value')||b.value!==a.value||b.enumerable!==a.enumerable||b.writable!==a.writable||b.configurable!==a.configurable)fail(label+' changed');}}};
}
export function iterateCoreLiteralTextCorpusPackets(options={}){
  const optionSnapshot=literalStreamRecord(options,['entry','files','compilationProfile','dependencyInputs'],4,'options');
  const {entry='src/lib.rs',files:input,compilationProfile:inputProfile=PRODUCTION_PROFILE}=optionSnapshot.value,dependencyField=Object.getOwnPropertyDescriptor(options,'dependencyInputs');
  if(dependencyField&&!Object.hasOwn(dependencyField,'value'))fail('dependencyInputs must be an own data field');
  const dependencyInputs=dependencyField?.value;
  const inputSnapshot=literalStreamRecord(input,null,MAX_FILES,'files'),dependencySnapshot=dependencyInputs===undefined?null:literalStreamRecord(dependencyInputs,['manifest','lock'],2,'dependency inputs');
  const files=sourceMap(inputSnapshot.value),profile=normalizeProfile(inputProfile);if(typeof entry!=='string'||!Object.hasOwn(files,entry))fail('actual entry source required');
  const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),same=(module,path)=>module.path.length===path.length&&module.path.every((name,at)=>name===path[at]);
  const roots=graph.modules.filter(module=>same(module,[])),cores=graph.modules.filter(module=>same(module,['translation_core'])),leaves=graph.modules.filter(module=>same(module,['translation_core','primitives']));
  if(roots.length!==1||cores.length!==1||leaves.length!==1||cores[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core.rs')||cores[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaves[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core/primitives.rs')||leaves[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||cores[0].configurationCondition!=='active'||leaves[0].configurationCondition!=='active')fail('complete actual owned facade/primitive source routes required');
  const edge=originalSourceModuleItems(roots[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edge.length!==1||roots[0].source.slice(edge[0].start,edge[0].end).trim()!=='pub mod translation_core;')fail('actual unadorned public core edge required');
  const after={...files},proposals=[],skipped=[],producerContext=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs}),roleFor=createLiteralTextImportRoles(graph.modules,profile,dependencyInputs,producerContext),pathFor=trackedPathSelector(graph,files);

  const summary={sourceFiles:Object.keys(files).length,proposals:0,selections:0,edits:0,changedFiles:0,skippedFiles:0};let finished=false;
  const packet=(section,ordinal,value)=>({section,ordinal,text:JSON.stringify(value)+'\n'});
  function verifyStreamInputs(){verifyLiteralTextImportRoles(roleFor);dependencySnapshot?.verify();inputSnapshot.verify();optionSnapshot.verify();}
  function encodedFile(file){const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>module.sourceView?.modulePath.length===0);if(origins.length!==1){skipped.push({file,reason:'physical source has no unique original module origin'});return null;}const origin=origins[0],ancestors=graph.modules.filter(module=>module.file!==file&&module.path.length<origin.path.length&&module.path.every((name,at)=>origin.path[at]===name)),conditions=[],problems=ancestors.flatMap(module=>scopeProblems(originalSourceModuleItems(module),profile,module.path,module,roleFor,[],conditions,producerContext,pathFor)),borrowedProblems=ancestors.flatMap(module=>borrowedScopeProblems(originalSourceModuleItems(module),profile,module.path)),result=propose(files[file],modules,profile,problems,roleFor,conditions,producerContext,borrowedProblems,pathFor);return {text:JSON.stringify({file,module:origin.path,...result})+'\n',source:result.after.source,selections:result.selections.length,edits:result.edits.length,changed:files[file]!==result.after.source};}
  function* packets(){
  for(const [at,[path,source]]of Object.entries(files).entries())yield packet('before',at,{path,source});
yield packet('graph-metadata',0,{keys:['modules','edges','diagnostics','concreteSyntaxMeta'],values:{}});
for(let at=0;at<graph.modules.length;at++)yield packet('graph-modules',at,graph.modules[at]);
yield packet('graph-edges',0,graph.edges);
yield packet('graph-diagnostics',0,graph.diagnostics);
for(let at=0;at<graph.concreteSyntaxMeta.length;at++)yield packet('graph-concrete',at,graph.concreteSyntaxMeta[at]);
  for(const file of Object.keys(files)){
   const encoded=encodedFile(file);if(!encoded)continue;after[file]=encoded.source;summary.selections+=encoded.selections;summary.edits+=encoded.edits;if(encoded.changed)summary.changedFiles++;
   yield {section:'proposals',ordinal:summary.proposals++,text:encoded.text};
  }

  const result={schema:'router-owned-literal-text-corpus-v1',entry,compilationProfile:profile,before:{...files},after,inputs:Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},proposals,skipped,executableAdmission:false};
  const producerEffects=finishCoreAdoptionProducerContext(producerContext);if(producerEffects)result.producerEffects=producerEffects;
  verifyLiteralTextImportRoles(roleFor);const currentDependency=Object.getOwnPropertyDescriptor(options,'dependencyInputs');
  if(!!currentDependency!==!!dependencyField||dependencyField&&(!currentDependency||!Object.hasOwn(currentDependency,'value')||currentDependency.value!==dependencyInputs||currentDependency.writable!==dependencyField.writable||currentDependency.enumerable!==dependencyField.enumerable||currentDependency.configurable!==dependencyField.configurable))fail('dependencyInputs option changed');

  for(let at=0;at<result.inputs.length;at++)yield packet('inputs',at,result.inputs[at]);
  for(const [at,[path,source]]of Object.entries(after).entries())yield packet('after',at,{path,source});
  const keys=Object.keys(result),excluded=new Set(['before','after','inputs','moduleGraph','proposals']),values={};for(const key of keys)if(!excluded.has(key))values[key]=result[key];
  yield packet('metadata',0,{keys,values});verifyStreamInputs();finished=true;summary.skippedFiles=skipped.length;
  return {after,summary,counts:{modules:graph.modules.length,concreteSyntaxMeta:graph.concreteSyntaxMeta.length}};


  }
  const iterator=packets();return {next:()=>iterator.next(),return:()=>iterator.return(),verify(){if(!finished)fail('unfinished literal packet stream');verifyStreamInputs();}};
}
