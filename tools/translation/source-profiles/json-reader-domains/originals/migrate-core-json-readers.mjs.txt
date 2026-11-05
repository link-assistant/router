import {crateModuleSourcePath} from './repository-layout.mjs';
// Candidate-only, maintainer-authorized owned API adoption. No original generic method
// dispatch, public type/borrow authority or executable admission is issued.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {resolveModuleGraph} from './project.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {createLiteralTextImportRoles,verifyLiteralTextImportRoles} from './literal-text-import-roles.mjs';
import {createCoreAdoptionProducerContext,finishCoreAdoptionProducerContext,createCoreAdoptionSelfAliasSelector} from './core-adoption-producer-context.mjs';
import {coreTypeProducerProblemsForModule} from './migrate-core-primitives.mjs';
import {compilationProfile,itemConfiguration,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from './router-core-source-data.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {canonicalJsonReaderMember,expandCanonicalJsonReader} from './core-json-reader-normalization.mjs';
import {coreAdoptionProducerBindings} from './core-adoption-producer-context.mjs';
import {registeredStandardHostBindings} from './standard-host-bindings.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves,resolveModuleBindings,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const C='crate::translation_core::',hash=source=>createHash('sha256').update(source).digest('hex');
const fail=reason=>{throw new TypeError('Canonical JSON reader adoption: '+reason);};
const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const inert=new Set(['cfg','doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','track_caller']);
const same=(a,b)=>a.length===b.length&&a.every((value,at)=>value===b[at]);
function record(input,allowed,bound,label){
 if(!input||typeof input!=='object'||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail(label+' own data required');
 const parent=Object.getPrototypeOf(input),names=Reflect.ownKeys(input);if(names.length>bound||names.some(name=>typeof name!=='string'||name==='stack'||allowed&&!allowed.includes(name)))fail(label+' fields differ');
 const rows=names.map(name=>[name,Object.getOwnPropertyDescriptor(input,name)]),value=Object.create(null);for(const [name,d]of rows){if(!d||!Object.hasOwn(d,'value'))fail(label+' own data required');value[name]=d.value;}
 return {value,verify(){if(Object.getPrototypeOf(input)!==parent||!same(Reflect.ownKeys(input),names))fail(label+' changed');for(const [name,a]of rows){const b=Object.getOwnPropertyDescriptor(input,name);if(!b||!Object.hasOwn(b,'value')||b.value!==a.value||b.enumerable!==a.enumerable||b.writable!==a.writable||b.configurable!==a.configurable)fail(label+' changed');}}};
}
function filesSnapshot(input){
 const captured=record(input,null,1024,'files');let total=0;
 for(const [path,source]of Object.entries(captured.value)){if(path.length>4096||!path.endsWith('.rs')||path.includes('\\')||/[\x00-\x1f:]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..')||typeof source!=='string'||source.length>2_000_000)fail('bounded canonical complete source required');total+=source.length;if(total>32_000_000)fail('total source bound');}return captured;
}
function close(tokens,start){const pairs={'(':')','[':']','{':'}'},stack=[];for(let at=start;at<tokens.length;at++){const token=tokens[at];if(['string','char','comment'].includes(token.type))continue;if(pairs[token.text])stack.push(pairs[token.text]);else if([')',']','}'].includes(token.text)){if(stack.pop()!==token.text)return -1;if(!stack.length)return at;}}return -1;}
function macroAt(tokens,at,name){if(!['crate','::','translation_core','::'].every((word,index)=>tokens[at+index]?.text===word)||['::','.'].includes(tokens[at-1]?.text))return null;const attached=tokens[at+4]?.text===name+'!',separate=tokens[at+4]?.text===name&&tokens[at+5]?.text==='!';if(!attached&&!separate)return null;const open=at+(attached?5:6);if(!['(','[','{'].includes(tokens[open]?.text))return null;const end=close(tokens,open);return end<0?null:{open,end};}
const text=tokens=>tokens.map(token=>token.text).join('');
function split(tokens,separator=','){const rows=[];let start=0,angle=0;for(let at=0;at<tokens.length;at++){if(['(','[','{'].includes(tokens[at].text)){const end=close(tokens,at);if(end<0)return [];at=end;}else if(tokens[at].text==='<')angle++;else if(tokens[at].text==='>')angle--;else if(tokens[at].text==='>>')angle-=2;else if(!angle&&tokens[at].text===separator){rows.push(tokens.slice(start,at));start=at+1;}}rows.push(tokens.slice(start));return rows.filter(row=>row.length);}
function scope(module,modules,profile,roleFor,context,selfAlias){
 const ancestors=modules.filter(parent=>parent.path.length<=module.path.length&&parent.path.every((name,at)=>module.path[at]===name)),imports=[],jsonNames=new Set(),mapNames=new Set(),problems=ancestors.flatMap(parent=>coreTypeProducerProblemsForModule(context,parent)),reserved=new Set(['Option','Some','Result','Ok','String','str','usize','serde_json','std','core','Vec','None']);
 for(const parent of ancestors)for(const item of originalSourceModuleItems(parent)){
  if(item.comment||itemConfiguration(item.tokens,profile).status==='inactive')continue;
  const header=originalDeclarationHeader(item,parent.path),words=item.tokens.filter(token=>token.type!=='comment');
  if((item.term==='opaque'||words[0]?.text==='extern'&&words[1]?.text==='crate')&&!selfAlias(parent,item,module))problems.push('opaque or external crate binding requires separate source scope');
  if(item.term==='trait'||item.term==='impl'&&item.tokens.some(token=>token.text==='for'))problems.push('trait implementation requires separate dispatch scope');
  if(item.term!=='use'&&header&&reserved.has(header.name))problems.push('competing standard/source type or constructor '+header.name);
  if(header?.name==='translation_core'&&!(parent.path.length===0&&item.term==='mod'))problems.push('competing owned core root');
  if(item.term!=='use')continue;
  for(const leaf of originalUseDeclarationLeaves(item,parent.path)){
   const role=!leaf.glob&&roleFor(parent,item,leaf);imports.push({file:parent.file,module:parent.path,span:[item.start,item.end],leaf,role});
   if(!role||!['struct','enum','union','fn','const','static','mod','macro','original-graph-nontrait-candidate'].includes(role.role.kind)&&role.role.namespace!=='macro')problems.push('unclassified or trait import '+leaf.name);
   if(leaf.glob||leaf.name==='translation_core'||reserved.has(leaf.name))problems.push('glob or competing standard binding '+leaf.name);
   if(role&&same(leaf.segments,['serde_json','Value'])&&role.role.kind==='enum')jsonNames.add(leaf.name);
   if(role&&same(leaf.segments,['serde_json','Map'])&&role.role.kind==='struct')mapNames.add(leaf.name);
  }
 }
 // Source-role aliases cannot win a same-name declaration/import competition.
 for(const names of [jsonNames,mapNames])for(const name of [...names])if(ancestors.flatMap(parent=>originalSourceModuleItems(parent).filter(item=>itemConfiguration(item.tokens,profile).status!=='inactive'&&originalDeclarationHeader(item,parent.path)?.name===name&&item.term!=='use')).length||imports.filter(row=>row.leaf.name===name).length!==1){names.delete(name);problems.push('competing canonical type alias '+name);}
 return {problems,imports,jsonNames,mapNames};
}
function importedJsonTargets(modules,profile,context){
 let binding=null;const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((part,at)=>part===b[at]);
 let origins=null;
 const verify=()=>{if(origins===null)return;if(modules.length!==origins.length||origins.some((row,at)=>modules[at]!==row.module||row.module.file!==row.file||row.module.source!==row.source||row.module.sourceView!==row.view||row.module.configurationCondition!==row.condition||JSON.stringify(row.module.compilationProfile)!==row.profile||!same(row.module.path,row.path)))fail('canonical import original source changed');};
 const current=()=>{if(binding===null){binding=coreAdoptionProducerBindings(context);if(binding===null){binding=resolveModuleBindings({modules,externalModules:registeredStandardHostBindings(),compilationProfile:profile});assertResolvedSourceScopeOrigin(binding.scopes,{modules,compilationProfile:profile});}}return binding;};
 const select=(module,name)=>{
  if(origins===null)origins=modules.map(module=>({module,file:module.file,path:[...module.path],source:module.source,view:module.sourceView,condition:module.configurationCondition,profile:JSON.stringify(module.compilationProfile)}));verify();if(!origins.some(row=>row.module===module)||module.configurationCondition!=='active')return null;
  // Imports in another/ancestor module do not lexically bind this consumer.
  const scopes=current().scopes.filter(scope=>scope.file===module.file&&same(scope.path,module.path));if(scopes.length!==1||scopes[0].configurationCondition!=='active'||scopes[0].unresolvedTypeScope)return null;
  const rows=scopes[0].bindings.filter(row=>row.namespace==='type'&&row.name===name);if(rows.length!==1)return null;const row=rows[0];
  if(row.status!=='resolved'||row.kind!=='enum'||!same(row.target,['serde_json','Value'])||row.via!=='named-import'||row.source!==module.file)return null;
  const candidates=[];
  for(const item of originalSourceModuleItems(module)){
   if(item.term!=='use')continue;const condition=itemConfiguration(item.tokens,profile);if(condition.status==='inactive')continue;
   for(const leaf of originalUseDeclarationLeaves(item,module.path))if(leaf.name===name)candidates.push({item,condition,leaf});
  }
  if(candidates.length!==1)return null;const {item,condition,leaf}=candidates[0];
  if(condition.status!=='active'||condition.attributes.some(attribute=>attribute.name==='cfg'||!inert.has(attribute.name))||leaf.glob||leaf.self||leaf.validateOnly||leaf.name==='_'||!same(leaf.segments,['serde_json','Value'])||row.span?.start!==item.start||row.span?.end!==item.end)return null;
  const tokens=item.tokens;for(let at=0;at<tokens.length;at++)if(tokens[at].rawIdentifier||tokens[at].text.startsWith('r#')||tokens[at].text==='r'&&tokens[at+1]?.text==='#'&&tokens[at].end===tokens[at+1].start&&tokens[at+1].end===tokens[at+2]?.start)return null;
  verify();return {kind:'original-direct-canonical-json-import-candidate',file:module.file,module:[...module.path],sourceSha256:hash(module.source),span:[item.start,item.end],source:module.source.slice(item.start,item.end),leaf,binding:row,executableAdmission:false};
 };
 return {select,verify};
}

const words=tokens=>tokens.map(token=>token.text).join('');
function parametersOf(tokens,start,end,scoped,imports,module){
 const parameters=new Map(),keys=new Set();
 const json=type=>type===C+'Json'||type==='serde_json::Value'||ident({type:'ident',text:type})&&scoped.jsonNames.has(type)&&imports.select(module,type)!==null;
 for(const row of split(tokens.slice(start,end))){
  if(row.length<3||!ident(row[0])||row[1].text!==':'||parameters.has(row[0].text))return null;
  const type=words(row.slice(2));let role=null;
  if(type.startsWith('&')&&json(type.slice(1)))role='json';
  else if(type.startsWith(C+'Maybe<&')&&type.endsWith('>')&&json(type.slice((C+'Maybe<&').length,-1)))role='optional-json';
  if(type==='&'+C+'Str')keys.add(row[0].text);
  parameters.set(row[0].text,{role,type,span:[row[0].start,row.at(-1).end],sourceName:row[0].text});
 }
 return {parameters,keys};
}
function shadowProblem(tokens,body,parameters,owners){
 const reserved=new Set([...parameters.keys(),...owners,'serde_json','core','crate','translation_core']);
 for(let at=body+1;at<tokens.length-1;at++){
  const macro=macroAt(tokens,at,'json')??macroAt(tokens,at,'format');if(macro){at=macro.end;continue;}
  const word=tokens[at].text;
  if(word==='#'||['unsafe','async','await','yield','for','while','loop','fn','mod','use','extern','macro_rules','macro','trait','impl','struct','enum','union','type','const','static','move'].includes(word)||tokens[at].rawIdentifier||word.startsWith('r#')||word.endsWith('!')&&word!=='!'||word==='!'&&ident(tokens[at-1])&&!['if','else','return','let','match'].includes(tokens[at-1].text)&&['(','[','{'].includes(tokens[at+1]?.text))return 'local producer, macro, loop, raw binding or effect requires its own source closure';
  if(word==='=>'){
   // Any matching-arm binder can shadow a formal without a `let`. Keep the
   // complete arm conservative rather than infer a binding from its spelling.
   let begin=at-1,depth=0;for(;begin>body;begin--){const word=tokens[begin].text;if([')',']','}'].includes(word))depth++;else if(['(','[','{'].includes(word)){if(depth)depth--;else break;}else if(!depth&&['=>',','].includes(word))break;}
   if(tokens.slice(begin+1,at).some(token=>ident(token)&&reserved.has(token.text)))return 'formal or canonical owner may be bound by match arm';
  }
  if(word==='let'){
   let end=at+1;while(end<tokens.length&&!['=',';'].includes(tokens[end].text))end++;
   if(tokens.slice(at+1,end).some(token=>ident(token)&&reserved.has(token.text)))return 'formal or canonical owner shadowed by local pattern';
  }
  if(word==='|'&&['=','(',',','return','{','=>'].includes(tokens[at-1]?.text)){
   let end=at+1;while(end<tokens.length&&tokens[end].text!=='|')end++;
   if(end===tokens.length||tokens.slice(at+1,end).some(token=>ident(token)&&reserved.has(token.text)))return 'formal or canonical owner shadowed by callback';at=end;
  }
 }
 return null;
}
function selectReaders(source,item,module,scoped,imports,names){
 const tokens=item.tokens.filter(token=>token.type!=='comment'),header=originalDeclarationHeader(item,module.path),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),edits=[],selections=[];
 const skip=reason=>({edits,selections,preserved:[{function:item.name,span:[item.start,item.end],reason}]});
 if(name<0||tokens[name+1]?.text!=='(')return skip('complete ordinary nongeneric function required');
 const endParams=close(tokens,name+1);let body=endParams+1;while(body<tokens.length&&tokens[body].text!=='{')body++;
 if(endParams<0||body>=tokens.length||close(tokens,body)!==tokens.length-1||tokens.length>200000||tokens.slice(0,name).some(token=>['async','unsafe','extern','const'].includes(token.text))||tokens.slice(endParams+1,body).some(token=>token.text==='where'||token.text.startsWith("'")))return skip('bounded complete ordinary function with elided source lifetimes required');
 const parsed=parametersOf(tokens,name+2,endParams,scoped,imports,module);if(!parsed)return skip('simple distinct immutable source formal parameters required');
 const {parameters,keys}=parsed,owners=new Set([...scoped.jsonNames]);
 const problem=shadowProblem(tokens,body,parameters,owners);if(problem)return skip(problem);
 let serial=0;const fresh=()=>{let value;do{if(serial>=200000)fail('hygiene bound');value='__router_json_reader_'+serial++;}while(names.has(value));names.add(value);return value;};
 function owner(args){
  const member=args.at(-1)?.text;if(!canonicalJsonReaderMember(member)||args.at(-2)?.text!=='::')return null;
  const prefix=words(args.slice(0,-2));if(prefix===C+'Json'||prefix==='serde_json::Value')return {member,qualified:prefix,import:null};
  if(args.length!==3||!ident(args[0]))return null;const selected=imports.select(module,args[0].text);return selected?{member,qualified:prefix,import:selected}:null;
 }
 for(let at=body+1;at<tokens.length-1;at++){
  const macro=macroAt(tokens,at,'json')??macroAt(tokens,at,'format');if(macro){at=macro.end;continue;}
  const first=tokens[at],parameter=parameters.get(first.text);if(!parameter?.role||['.','::'].includes(tokens[at-1]?.text))continue;
  let cursor=at+1,role=parameter.role;
  while(cursor<tokens.length-1&&tokens[cursor]?.text==='.'&&ident(tokens[cursor+1])&&tokens[cursor+2]?.text==='('){
   const end=close(tokens,cursor+2);if(end<0)break;const method=tokens[cursor+1].text,args=tokens.slice(cursor+3,end);
   if(method==='get'&&role==='json'&&args.length===1&&(args[0].type==='string'||ident(args[0])&&keys.has(args[0].text))){role='optional-json';cursor=end+1;continue;}
   if(method==='unwrap_or'&&role==='optional-json'&&args.length===1&&parameters.get(args[0].text)?.role==='json'){role='json';cursor=end+1;continue;}
   if(method!=='and_then'||role!=='optional-json')break;const selected=owner(args);if(!selected)break;
   const span=[first.start,tokens[end].end],receiverSpan=[first.start,tokens[cursor].start];
   if(item.tokens.some(token=>token.type==='comment'&&token.start>=tokens[cursor].start&&token.end<=span[1]))break;
   const receiver=source.slice(...receiverSpan),input=fresh(),payload=fresh(),expanded=expandCanonicalJsonReader(receiver,selected.member,input,payload);
   edits.push({span,expected:source.slice(...span),replacement:expanded.source,repository:expanded.repository,generatedPaths:expanded.paths});
   selections.push({function:item.name,functionSpan:[item.start,item.end],span,receiver:{span:receiverSpan,source:receiver,formal:parameter},member:selected.member,owner:selected,locals:[input,payload],nativeEquation:'canonical Option<&Json>::and_then with one inert canonical JSON reader function item',executableAdmission:false,loanBoundary:'same shared input root; no owned temporary introduced'});at=end;break;
  }
 }
 return {edits,selections,preserved:selections.length?[]:[{function:item.name,span:[item.start,item.end],reason:'no closed canonical shared Json Option reader function item'}]};
}
function mapping(source,after,edits){
 const rows=[];let old=0,current=0;
 for(const edit of edits){if(old<edit.span[0]){const size=edit.span[0]-old;rows.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}rows.push({kind:'substitution',before:[...edit.span],after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});old=edit.span[1];current+=edit.replacement.length;}
 if(old<source.length)rows.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});
 let inverse=after;for(const row of [...rows].reverse())if(row.kind==='substitution'){if(inverse.slice(...row.after)!==row.replacement)fail('full source inverse expected differs');inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);}if(inverse!==source)fail('full source inverse differs');return rows;
}
function stage(source,document,edits,phase,id){
 for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('overlapping or changed exact reader span');
 const value=applyConcreteSyntaxSubstitutions(document,{languageRules:phase==='language'?[{id,edits}]:[],repositoryRules:phase==='repository'?[{id,edits}]:[]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(value.value)),map=mapping(source,after.source,edits);
 return {before:{source,meta:serializeConcreteSyntaxMeta(document),sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},edits,mapping:map,trace:value.trace,completeInverse:true};
}
function apply(source,selected){
 const before=transportConcreteSyntaxSource(source,{language:'Rust'}),edits=[...selected].sort((a,b)=>a.span[0]-b.span[0]),languageId='canonical-json-readers:expand-option-and-then-on-shared-root',repositoryId='router-core:bind-generated-json-reader-paths';
 const operation=createRulePipeline([{phase:'language',rules:[{id:languageId,apply:()=>stage(source,before.document,edits.map(({span,expected,replacement})=>({span,expected,replacement})),'language',languageId)}]},{phase:'repository',rules:[{id:repositoryId,apply:first=>{
  const paths=[];for(let at=0;at<edits.length;at++){const row=first.mapping.filter(row=>row.kind==='substitution')[at];if(!row||row.expected!==edits[at].expected||row.replacement!==edits[at].replacement)fail('actual intermediate reader mapping differs');for(const path of edits[at].generatedPaths)paths.push({span:path.span.map(offset=>offset+row.after[0]),expected:path.expected,replacement:path.replacement});}
  const second=stage(first.after.source,transportConcreteSyntaxMeta(first.after.meta).document,paths,'repository',repositoryId),composed=edits.map(row=>({span:row.span,expected:row.expected,replacement:row.repository}));
  return {before:first.before,intermediate:first.after,after:second.after,edits:composed,mapping:mapping(source,second.after.source,composed),stages:[{name:'canonical-option-equation',...first},{name:'owned-generated-path-binding',...second}],completeInverse:true,executableAdmission:false};
 }}]}]).run(null);return {...operation.value,trace:operation.trace};
}
export function proposeCoreJsonReadersCorpus(options={}){
 const supplied=record(options,['entry','files','compilationProfile','dependencyInputs'],4,'options'),{entry='src/lib.rs',files:input,compilationProfile:inputProfile=PRODUCTION_PROFILE,dependencyInputs:requestedDependencies}=supplied.value,captured=filesSnapshot(input),files=captured.value,profile=compilationProfile(inputProfile),dependencies=record(requestedDependencies,['manifest','lock'],2,'dependency inputs'),dependencyInputs=dependencies.value;
 if(Object.keys(dependencyInputs).length!==2||Object.values(dependencyInputs).some(source=>typeof source!=='string'||source.length>2_000_000))fail('complete bounded Cargo sources required');
 if(typeof entry!=='string'||!Object.hasOwn(files,entry))fail('actual source entry required');
 const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),root=graph.modules.filter(module=>!module.path.length),core=graph.modules.filter(module=>same(module.path,['translation_core'])),leaf=graph.modules.filter(module=>same(module.path,['translation_core','primitives']));
 if(root.length!==1||core.length!==1||leaf.length!==1||core[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core.rs')||core[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaf[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core/primitives.rs')||leaf[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||core[0].configurationCondition!=='active'||leaf[0].configurationCondition!=='active')fail('complete current owned facade and primitive source required');
 for(const [path,source]of [['ranges',ROUTER_CORE_RANGES_SOURCE],['json_collections',ROUTER_CORE_JSON_COLLECTIONS_SOURCE]]){
  const selected=graph.modules.filter(module=>same(module.path,['translation_core',path]));
  if(selected.length!==1||selected[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core/')+path+'.rs'||selected[0].source!==source||selected[0].configurationCondition!=='active')fail('complete current owned core leaf source required');
 }
 const edges=originalSourceModuleItems(root[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edges.length!==1||root[0].source.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_core;')fail('actual public core edge required');
 const roleFor=createLiteralTextImportRoles(graph.modules,profile,dependencyInputs),context=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs}),selfAlias=createCoreAdoptionSelfAliasSelector({modules:graph.modules,compilationProfile:profile,context}),imports=importedJsonTargets(graph.modules,profile,context),proposals=[],skipped=[],after={...files};
 for(const file of Object.keys(files)){
  if(file===crateModuleSourcePath(graph.modules,'src/translation_core.rs')||file.startsWith(crateModuleSourcePath(graph.modules,'src/translation_core/')))continue;
  const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>!module.sourceView.modulePath.length);if(origins.length!==1){skipped.push({file,reason:'one complete physical source origin required'});continue;}
  const edits=[],selections=[],preserved=[],names=new Set(files[file].match(/[\p{ID_Start}_][\p{ID_Continue}_]*/gu)??[]);
  for(const module of modules){const scoped=scope(module,graph.modules,profile,roleFor,context,selfAlias);for(const item of originalSourceModuleItems(module)){
   if(item.term!=='fn')continue;const condition=itemConfiguration(item.tokens,profile);
   if(scoped.problems.length||module.configurationCondition!=='active'||condition.status!=='active'||condition.attributes.some(attribute=>!inert.has(attribute.name))){preserved.push({function:item.name,span:[item.start,item.end],reason:'configuration, source producer or namespace uncertainty',problems:scoped.problems});continue;}
   const selected=selectReaders(files[file],item,module,scoped,imports,names);edits.push(...selected.edits);selections.push(...selected.selections);preserved.push(...selected.preserved);
  }}
  const proposal=apply(files[file],edits);proposals.push({file,...proposal,selections,preserved});after[file]=proposal.after.source;
 }
 const producerEffects=finishCoreAdoptionProducerContext(context);imports.verify();verifyLiteralTextImportRoles(roleFor);dependencies.verify();captured.verify();supplied.verify();
 return {schema:'router-owned-json-reader-corpus-v1',entry,compilationProfile:profile,dependencyInputs:{...dependencyInputs},inputs:Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),before:{...files},after,proposals,skipped,...(producerEffects?{producerEffects}:{}),moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},migrationSemantics:'canonical shared Json Option equation, followed only by owned generated-path binding; fresh semantic checks required',executableAdmission:false};
}

// Explicit detached packet iteration. The materialized API above is unchanged.
// Events contain primitive JSON snapshots only; no live scope/view/proof escapes.
// Storage consumers may write between next() calls. That NEW writer/producer
// hash interleaving is not the old materialized API's observer schedule.
export function iterateCoreJsonReadersCorpusPackets(options={}){
 const supplied=record(options,['entry','files','compilationProfile','dependencyInputs'],4,'options'),{entry='src/lib.rs',files:input,compilationProfile:inputProfile=PRODUCTION_PROFILE,dependencyInputs:requestedDependencies}=supplied.value,captured=filesSnapshot(input),files=captured.value,profile=compilationProfile(inputProfile),dependencies=record(requestedDependencies,['manifest','lock'],2,'dependency inputs'),dependencyInputs=dependencies.value;
 if(Object.keys(dependencyInputs).length!==2||Object.values(dependencyInputs).some(source=>typeof source!=='string'||source.length>2_000_000))fail('complete bounded Cargo sources required');
 if(typeof entry!=='string'||!Object.hasOwn(files,entry))fail('actual source entry required');
 const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),root=graph.modules.filter(module=>!module.path.length),core=graph.modules.filter(module=>same(module.path,['translation_core'])),leaf=graph.modules.filter(module=>same(module.path,['translation_core','primitives']));
 if(root.length!==1||core.length!==1||leaf.length!==1||core[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core.rs')||core[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaf[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core/primitives.rs')||leaf[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||core[0].configurationCondition!=='active'||leaf[0].configurationCondition!=='active')fail('complete current owned facade and primitive source required');
 for(const [path,source]of [['ranges',ROUTER_CORE_RANGES_SOURCE],['json_collections',ROUTER_CORE_JSON_COLLECTIONS_SOURCE]]){
  const selected=graph.modules.filter(module=>same(module.path,['translation_core',path]));
  if(selected.length!==1||selected[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core/')+path+'.rs'||selected[0].source!==source||selected[0].configurationCondition!=='active')fail('complete current owned core leaf source required');
 }
 const edges=originalSourceModuleItems(root[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edges.length!==1||root[0].source.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_core;')fail('actual public core edge required');
 let roleFor=null,context=null,selfAlias=null,imports=null,finished=false;
 const after={...files},skipped=[],summary={sourceFiles:Object.keys(files).length,proposals:0,selections:0,edits:0,changedFiles:0,skippedFiles:0};
 const packet=(section,ordinal,value)=>({section,ordinal,text:JSON.stringify(value)+'\n'});
 function verifyOriginal(){imports.verify();verifyLiteralTextImportRoles(roleFor);dependencies.verify();captured.verify();supplied.verify();}
 function encodedFile(file,modules){
  const edits=[],selections=[],preserved=[],names=new Set(files[file].match(/[\p{ID_Start}_][\p{ID_Continue}_]*/gu)??[]);
  for(const module of modules){const scoped=scope(module,graph.modules,profile,roleFor,context,selfAlias);for(const item of originalSourceModuleItems(module)){
   if(item.term!=='fn')continue;const condition=itemConfiguration(item.tokens,profile);
   if(scoped.problems.length||module.configurationCondition!=='active'||condition.status!=='active'||condition.attributes.some(attribute=>!inert.has(attribute.name))){preserved.push({function:item.name,span:[item.start,item.end],reason:'configuration, source producer or namespace uncertainty',problems:scoped.problems});continue;}
   const selected=selectReaders(files[file],item,module,scoped,imports,names);edits.push(...selected.edits);selections.push(...selected.selections);preserved.push(...selected.preserved);
  }}
  const proposal=apply(files[file],edits),row={file,...proposal,selections,preserved};
  // This scope ends before yield: no completed per-file CST remains in a list
  // or suspended generator local. Only primitive text/source/counters survive.
  return {text:JSON.stringify(row)+'\n',source:row.after.source,selections:selections.length,edits:row.edits.length,changed:row.before.source!==row.after.source};
 }
 function* packets(){
  for(const [at,[path,source]]of Object.entries(files).entries())yield packet('before',at,{path,source});
  yield packet('graph-metadata',0,{keys:['modules','edges','diagnostics','concreteSyntaxMeta'],values:{}});
  for(let at=0;at<graph.modules.length;at++)yield packet('graph-modules',at,graph.modules[at]);
  yield packet('graph-edges',0,graph.edges);yield packet('graph-diagnostics',0,graph.diagnostics);
  for(let at=0;at<graph.concreteSyntaxMeta.length;at++)yield packet('graph-concrete',at,graph.concreteSyntaxMeta[at]);
  roleFor=createLiteralTextImportRoles(graph.modules,profile,dependencyInputs);context=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs});selfAlias=createCoreAdoptionSelfAliasSelector({modules:graph.modules,compilationProfile:profile,context});imports=importedJsonTargets(graph.modules,profile,context);
  for(const file of Object.keys(files)){
   if(file===crateModuleSourcePath(graph.modules,'src/translation_core.rs')||file.startsWith(crateModuleSourcePath(graph.modules,'src/translation_core/')))continue;
   const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>!module.sourceView.modulePath.length);if(origins.length!==1){skipped.push({file,reason:'one complete physical source origin required'});continue;}
   const encoded=encodedFile(file,modules);after[file]=encoded.source;summary.selections+=encoded.selections;summary.edits+=encoded.edits;if(encoded.changed)summary.changedFiles++;
   yield {section:'proposals',ordinal:summary.proposals++,text:encoded.text};
  }
  const producerEffects=finishCoreAdoptionProducerContext(context);verifyOriginal();
  // Preserve the original producer-only hash order: input source digests are
  // computed after the existing final producer/import/own-input checks.
  const inputs=Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)}));
  for(let at=0;at<inputs.length;at++)yield packet('inputs',at,inputs[at]);
  for(const [at,[path,source]]of Object.entries(after).entries())yield packet('after',at,{path,source});
  const keys=['schema','entry','compilationProfile','dependencyInputs','inputs','before','after','proposals','skipped',...(producerEffects?['producerEffects']:[]),'moduleGraph','migrationSemantics','executableAdmission'];
  const values={schema:'router-owned-json-reader-corpus-v1',entry,compilationProfile:profile,dependencyInputs:{...dependencyInputs},skipped,...(producerEffects?{producerEffects}:{}),migrationSemantics:'canonical shared Json Option equation, followed only by owned generated-path binding; fresh semantic checks required',executableAdmission:false};
  yield packet('metadata',0,{keys,values});verifyOriginal();finished=true;summary.skippedFiles=skipped.length;
  return {after,summary,counts:{modules:graph.modules.length,concreteSyntaxMeta:graph.concreteSyntaxMeta.length}};
 }
 const iterator=packets();
 return {next:()=>iterator.next(),return:()=>iterator.return(),verify(){if(!finished)fail('unfinished packet stream');verifyOriginal();}};
}
