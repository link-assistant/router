import {crateModuleSourcePath} from './repository-layout.mjs';
// Candidate-only, maintainer-authorized owned API adoption. No original Index
// dispatch, public type/borrow authority or executable admission is issued.
import {createHash} from 'node:crypto';
import {createLegacyJsonReaderNormalizer} from './core-json-reader-normalization.mjs';
import {types} from 'node:util';
import {resolveModuleGraph} from './project.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {createLiteralTextImportRoles,verifyLiteralTextImportRoles} from './source-bound-owned-literal-text-import-roles.mjs';
import {createCoreAdoptionProducerContext,finishCoreAdoptionProducerContext,createCoreAdoptionSelfAliasSelector} from './source-bound-owned-core-context.mjs';
import {coreTypeProducerProblemsForModule} from './source-bound-owned-migrate-core-primitives.mjs';
import {compilationProfile,itemConfiguration,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from './router-core-source-data.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const C='crate::translation_core::',hash=source=>createHash('sha256').update(source).digest('hex');
const fail=reason=>{throw new TypeError('Owned JSON collection adoption: '+reason);};
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
function sliceRole(tokens,scoped){
 const value=text(tokens);if(!value.startsWith('&[')||!value.endsWith(']'))return false;
 const item=value.slice(2,-1);return item===C+'Json'||scoped.jsonNames.has(item);
}
// Only new reader normalizations introduce ordinary standard Option patterns.
// The module/ancestor scope is already closed above; this additional original
// function census excludes local bindings or producers that could replace them.
function optionNormalizationProblem(tokens,body,parameters,callbackParameter){
 const names=new Set(['Some','None','Option']);
 if(names.has(callbackParameter)||parameters.some(row=>names.has(row[0]?.text)))return 'standard Option constructor parameter shadow';
 for(let at=body+1;at<tokens.length;at++){
  const macro=macroAt(tokens,at,'json')??macroAt(tokens,at,'format');if(macro){at=macro.end;continue;}
  const word=tokens[at].text;
  if(word==='#'||['use','extern','fn','mod','struct','enum','union','type','trait','impl','macro_rules','macro','const','static'].includes(word)||word.endsWith('!')&&word!=='!'||word==='!'&&ident(tokens[at-1])&&!['if','else','return','let','match','while'].includes(tokens[at-1].text)&&['(','[','{'].includes(tokens[at+1]?.text))return 'local declaration, attribute or macro producer may replace standard Option constructors';
  if(word==='let'){
   for(let end=at+1;end<tokens.length&&!['=',':',';','{','}'].includes(tokens[end].text);end++)if(ident(tokens[end])&&names.has(tokens[end].text))return 'local Option constructor pattern or binding requires separate scope';
  }
  if(word==='|'&&['=','(',',','return','{','=>','move'].includes(tokens[at-1]?.text)){
   let end=at+1;for(;end<tokens.length&&tokens[end].text!=='|';end++)if(ident(tokens[end])&&names.has(tokens[end].text))return 'local callback parameter shadows standard Option constructor';
  }
 }
 return null;
}
function select(source,item,scoped,modulePath,names){
 const tokens=item.tokens.filter(token=>token.type!=='comment'),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),params=close(tokens,name+1),edits=[],selections=[],skipped=[];
 if(name<0||tokens[name+1]?.text!=='('||params<0)return {edits,selections,skipped};
 let body=params+1;while(body<tokens.length&&tokens[body].text!=='{')body++;
 if(body>=tokens.length||close(tokens,body)!==tokens.length-1||tokens.length>200000||tokens.slice(0,name).some(token=>['unsafe','async','const','extern'].includes(token.text)))return {edits,selections,skipped:[{function:item.name,reason:'bounded ordinary nongeneric complete function required'}]};
 const parameters=split(tokens.slice(name+2,params)),slices=new Set();
 for(const row of parameters){if(!ident(row[0])||row[1]?.text!==':'||parameters.filter(other=>other[0]?.text===row[0].text).length!==1)return {edits,selections,skipped:[{function:item.name,reason:'distinct immutable parameter binding required'}]};if(sliceRole(row.slice(2),scoped))slices.add(row[0].text);}
 const result=text(tokens.slice(params+1,body)),vector=/^->(?:Vec|std::vec::Vec|::std::vec::Vec)<(.+)>$/u.exec(result);
 if(!vector||!(vector[1]===C+'Json'||scoped.jsonNames.has(vector[1])))return {edits,selections,skipped:[{function:item.name,reason:'actual canonical Vec<Json> result syntax required'}]};
 const {fresh,normalizations,knownCallbackBinders,readers,normalize}=createLegacyJsonReaderNormalizer(source,tokens,scoped.jsonNames,names);
 for(let at=body+1;at<tokens.length;at++){
  if(!slices.has(tokens[at].text)||!ident(tokens[at])||text(tokens.slice(at+1,at+6))!=='.iter().')continue;
  // The receiver is an unshadowed immutable source parameter for this first
  // profile. A declaration anywhere with that spelling remains uncertain.
  const receiver=tokens[at].text;let receiverShadow=false;
  for(let index=body+1;index<tokens.length;index++){
   if(['for','while','loop'].includes(tokens[index].text))receiverShadow=true;
   if(tokens[index].text==='let'){let end=index+1;while(end<tokens.length&&!['=',';','{','}'].includes(tokens[end].text))end++;if(tokens.slice(index+1,end).some(token=>token.text===receiver))receiverShadow=true;}
   if(tokens[index].text==='=>'){let start=index-1;while(start>body&&!['{','}',',',';'].includes(tokens[start-1].text))start--;if(tokens.slice(start,index).some(token=>token.text===receiver))receiverShadow=true;}
  }
  if(receiverShadow)continue;
  const operation=tokens[at+6]?.text,open=at+7;if(!['map','filter_map'].includes(operation)||tokens[open]?.text!=='(')continue;
  const callbackEnd=close(tokens,open),begin=open+1;if(callbackEnd<0||tokens[begin]?.text!=='|'||!ident(tokens[begin+1])||tokens[begin+2]?.text!=='|'||tokens[begin+3]?.text!=='{')continue;
  const callbackBody=begin+3,bodyEnd=close(tokens,callbackBody);if(bodyEnd!==callbackEnd-1)continue;
  let collect=callbackEnd+1;if(tokens[collect]?.text!=='.'||tokens[collect+1]?.text!=='collect'||tokens[collect+2]?.text!=='('||tokens[collect+3]?.text!==')')continue;
  const end=collect+3,parameter=tokens[begin+1].text;
  let uncertain=false;for(let index=callbackBody+1;index<bodyEnd;index++){
   const macro=macroAt(tokens,index,'json')??macroAt(tokens,index,'format');if(macro){index=macro.end;continue;}
   const word=tokens[index].text;if(word==='#'||['unsafe','async','await','yield','for','while','loop','fn','mod','use','extern','macro_rules','trait','impl','struct','enum','union','type','const','static','move'].includes(word)||word.endsWith('!')&&word!=='!'||word==='!'&&ident(tokens[index-1])&&['(','[','{'].includes(tokens[index+1]?.text))uncertain=true;
   if(word==='let'){let end=index+1;while(end<bodyEnd&&!['=',';','{','}'].includes(tokens[end].text))end++;if(tokens.slice(index+1,end).some(token=>token.text===parameter))uncertain=true;}
  }
  if(uncertain){skipped.push({function:item.name,reason:'callback producer, effect, loop or shadow uncertainty'});continue;}
  const normalizationStart=normalizations.length,callback=source.slice(tokens[begin].start,tokens[callbackBody].end)+normalize(callbackBody+1,bodyEnd,parameter,tokens[callbackBody].end,tokens[bodyEnd].start)+source.slice(tokens[bodyEnd].start,tokens[bodyEnd].end);
  const optionProblem=normalizations.length>normalizationStart?optionNormalizationProblem(tokens,body,parameters,parameter):null;
  if(optionProblem){skipped.push({function:item.name,reason:optionProblem});continue;}
  if(tokens.slice(callbackBody+1,bodyEnd).some((token,index,list)=>token.text==='|'&&ident(list[index+1])&&list[index+2]?.text==='|'&&!knownCallbackBinders.has(token.start)||token.text==='||'&&['=','(',',','return','{','=>'].includes(list[index-1]?.text))){skipped.push({function:item.name,reason:'unknown nested callback binding/effect'});continue;}
  const span=[tokens[at].start,tokens[end].end],replacement=C+'json_'+operation+'('+receiver+', '+callback+')';
  edits.push({span,expected:source.slice(...span),replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation:'json_'+operation,receiver,callbackParameter:parameter,readerNormalizations:[...normalizations],oldTraitDispatchProved:false,executableAdmission:false,evaluationOrder:['receiver-once','callback-once','ordered-eager-collection']});at=end;
 }
 if(!edits.length)skipped.push({function:item.name,reason:'no closed canonical borrowed Json slice terminal map/filter_map collection'});return {edits,selections,skipped};
}
function apply(source,edits){
 const before=transportConcreteSyntaxSource(source,{language:'Rust'});edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('overlapping or changed exact edits');
 const changed=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'json-collections:retain-complete-callback-and-evaluation-order',edits:[]}],repositoryRules:[{id:'router-core:adopt-eager-json-collections',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(changed.value)),mapping=[];let old=0,current=0;
 for(const edit of edits){if(old<edit.span[0]){const size=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}mapping.push({kind:'substitution',before:edit.span,after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});old=edit.span[1];current+=edit.replacement.length;}if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});let inverse=after.source;for(const row of [...mapping].reverse())if(row.kind==='substitution'){if(inverse.slice(...row.after)!==row.replacement)fail('inverse source differs');inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);}if(inverse!==source)fail('complete source inverse differs');return {before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},edits,mapping,trace:changed.trace,executableAdmission:false};
}
export function proposeCoreJsonCollectionsCorpus(options={}){
 const supplied=record(options,['entry','files','compilationProfile','dependencyInputs'],4,'options'),{entry='src/lib.rs',files:input,compilationProfile:inputProfile=PRODUCTION_PROFILE,dependencyInputs:requestedDependencies}=supplied.value,captured=filesSnapshot(input),files=captured.value,profile=compilationProfile(inputProfile),dependencies=requestedDependencies===undefined?null:record(requestedDependencies,['manifest','lock'],2,'dependency inputs'),dependencyInputs=dependencies?.value;
 if(dependencies&&(Object.keys(dependencyInputs).length!==2||Object.values(dependencyInputs).some(source=>typeof source!=='string'||source.length>2_000_000)))fail('complete bounded Cargo sources required');
 if(typeof entry!=='string'||!Object.hasOwn(files,entry))fail('actual source entry required');const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),root=graph.modules.filter(module=>!module.path.length),core=graph.modules.filter(module=>same(module.path,['translation_core'])),leaf=graph.modules.filter(module=>same(module.path,['translation_core','json_collections']));
 if(root.length!==1||core.length!==1||leaf.length!==1||core[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core.rs')||core[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaf[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core/json_collections.rs')||leaf[0].source!==ROUTER_CORE_JSON_COLLECTIONS_SOURCE||core[0].configurationCondition!=='active'||leaf[0].configurationCondition!=='active')fail('complete current owned facade and primitive source required');
 const ownedFunctions=originalSourceModuleItems(leaf[0]);for(const name of ['json_map','json_filter_map'])if(ownedFunctions.filter(item=>item.term==='fn'&&item.name===name).length!==1||!core[0].source.includes('pub use self::json_collections::{json_map, json_filter_map};'))fail('registered owned collection declarations and exports required');
 const edges=originalSourceModuleItems(root[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edges.length!==1||root[0].source.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_core;')fail('actual public core edge required');
 const roleFor=createLiteralTextImportRoles(graph.modules,profile,dependencyInputs),context=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs}),selfAlias=createCoreAdoptionSelfAliasSelector({modules:graph.modules,compilationProfile:profile,context}),proposals=[],skipped=[],after={...files};
 for(const file of Object.keys(files)){
  if(file===crateModuleSourcePath(graph.modules,'src/translation_core.rs')||file.startsWith(crateModuleSourcePath(graph.modules,'src/translation_core/')))continue;const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>!module.sourceView.modulePath.length);if(origins.length!==1){skipped.push({file,reason:'one complete physical source origin required'});continue;}const edits=[],selections=[],preserved=[],hygieneNames=new Set(files[file].match(/[\p{ID_Start}_][\p{ID_Continue}_]*/gu)??[]);
  for(const module of modules){const scoped=scope(module,graph.modules,profile,roleFor,context,selfAlias);for(const item of originalSourceModuleItems(module)){if(item.term!=='fn')continue;const condition=itemConfiguration(item.tokens,profile);if(scoped.problems.length||module.configurationCondition!=='active'||condition.status!=='active'||condition.attributes.some(attribute=>!inert.has(attribute.name))){preserved.push({function:item.name,span:[item.start,item.end],reason:'configuration, source producer or namespace uncertainty',problems:scoped.problems});continue;}const selected=select(files[file],item,scoped,module.path,hygieneNames);edits.push(...selected.edits);selections.push(...selected.selections);preserved.push(...selected.skipped);}}
  const proposal=apply(files[file],edits);proposals.push({file,...proposal,selections,preserved});after[file]=proposal.after.source;
 }
 const inputs=Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),producerEffects=finishCoreAdoptionProducerContext(context),result={schema:'router-owned-json-collections-corpus-v1',entry,compilationProfile:profile,dependencyInputs:dependencyInputs===undefined?null:{manifest:dependencyInputs.manifest,lock:dependencyInputs.lock},inputs,before:{...files},after,proposals,skipped,...(producerEffects?{producerEffects}:{}),moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},migrationSemantics:'explicit maintainer-owned API adoption; no original Iterator/Option method authority; fresh semantic/ownership/emission checks required',executableAdmission:false};verifyLiteralTextImportRoles(roleFor);dependencies?.verify();captured.verify();supplied.verify();return result;
}
