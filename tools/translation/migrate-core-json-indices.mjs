// Candidate-only, maintainer-authorized owned API adoption. No original Index
// dispatch, public type/borrow authority or executable admission is issued.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {resolveModuleGraph} from './project.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {createLiteralTextImportRoles,verifyLiteralTextImportRoles} from './literal-text-import-roles.mjs';
import {createCoreAdoptionProducerContext,finishCoreAdoptionProducerContext} from './core-adoption-producer-context.mjs';
import {coreTypeProducerProblemsForModule} from './migrate-core-primitives.mjs';
import {compilationProfile,itemConfiguration,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-source-data.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const C='crate::translation_core::',hash=source=>createHash('sha256').update(source).digest('hex');
const fail=reason=>{throw new TypeError('Owned JSON index adoption: '+reason);};
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
function scope(module,modules,profile,roleFor,context){
 const ancestors=modules.filter(parent=>parent.path.length<=module.path.length&&parent.path.every((name,at)=>module.path[at]===name)),imports=[],jsonNames=new Set(),mapNames=new Set(),problems=ancestors.flatMap(parent=>coreTypeProducerProblemsForModule(context,parent)),reserved=new Set(['Option','Some','Result','Ok','String','str','usize','serde_json','std','core']);
 for(const parent of ancestors)for(const item of originalSourceModuleItems(parent)){
  if(item.comment||itemConfiguration(item.tokens,profile).status==='inactive')continue;
  const header=originalDeclarationHeader(item,parent.path),words=item.tokens.filter(token=>token.type!=='comment');
  if(item.term==='opaque'||words[0]?.text==='extern'&&words[1]?.text==='crate')problems.push('opaque or external crate binding requires separate source scope');
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
function typeRole(tokens,scoped){
 let source=tokens.map(token=>token.text+(token.type==='char'&&token.text.startsWith("'")?' ':'')).join(''),optional=false;const option=/^(?:Option|std::option::Option|::std::option::Option|crate::translation_core::Maybe)<([\s\S]*)>$/u.exec(source);if(option){optional=true;source=option[1];}
 if(source==='usize'||source==='::std::primitive::usize')return optional?null:{kind:'usize',optional:false};
 if(!source.startsWith('&')||source.startsWith('&mut'))return null;source=source.slice(1).replace(/^'[\p{ID_Start}_][\p{ID_Continue}_]*\s+/u,'').replace(/\s+/gu,'');
 let kind=null;if(source===C+'Json'||scoped.jsonNames.has(source))kind='value';else if(source==='str'||source===C+'Str'||source==='::std::primitive::str')kind='str';else{const match=/^([^<]+)<(.+)>$/u.exec(source);if(match&&scoped.mapNames.has(match[1])){const args=match[2].split(',');if(args.length===2&&args[0]==='String'&&(args[1]===C+'Json'||scoped.jsonNames.has(args[1])))kind='map';}}
 return kind?{kind,optional}:null;
}
function expressionRole(tokens,env,scoped,depth=0){
 if(depth>32||!tokens.length)return null;
 if(tokens[0].text==='('&&close(tokens,0)===tokens.length-1)return expressionRole(tokens.slice(1,-1),env,scoped,depth+1);
 const tried=tokens.at(-1).text==='?';if(tried)tokens=tokens.slice(0,-1);
 let at=1;if(!ident(tokens[0]))return null;let role=env.get(tokens[0].text);if(!role)return null;role={...role};
 let steps=0;while(at<tokens.length){
  if(++steps>32)return null;if(tokens[at]?.text!=='.'||!ident(tokens[at+1])||tokens[at+2]?.text!=='(')return null;const end=close(tokens,at+2);if(end<0)return null;const method=tokens[at+1].text,args=tokens.slice(at+3,end);
  if(method==='as_object'&&role.kind==='value'&&!role.optional&&!args.length)role={...role,kind:'map',optional:true};
  else if(method==='get'&&['map','value'].includes(role.kind)&&!role.optional&&keyRole(args,env,scoped,role.kind))role={...role,kind:'value',optional:true};
  else if(method==='and_then'&&role.kind==='value'&&role.optional&&scoped.jsonNames.has(args[0]?.text)&&text(args.slice(1))==='::as_object')role={...role,kind:'map'};
  else if(method==='filter'&&role.optional){const words=text(args),match=/^\|([\p{ID_Start}_][\p{ID_Continue}_]*)\|!?\1\.(?:is_object|is_null)\(\)$/u.exec(words);if(!match)return null;}
  else if(method==='ok_or_else'&&role.optional&&tried&&end===tokens.length-1&&args[0]?.text==='||')role={...role,optional:false};
  else return null;at=end+1;
 }
 return tried&&role.optional?null:role;
}
function keyRole(tokens,env,scoped,receiver){
 if(tokens.length!==1)return null;const token=tokens[0];if(token.type==='string'&&/^(?:"|r#*")/u.test(token.text))return 'str';
 if(ident(token)){const role=env.get(token.text);return role&&!role.optional&&(role.kind==='str'||role.kind==='usize'&&receiver==='value')?role.kind:null;}
 if(receiver==='value'&&/^[0-9][0-9_]*(?:usize)?$/u.test(token.text)){try{if(BigInt(token.text.replace(/usize$/u,'').replaceAll('_',''))<=18446744073709551615n)return 'usize';}catch{}}return null;
}
function interpolationReads(tokens,start,stop,accept,depth=0){
 if(depth>32||start>=stop)return;
 if(tokens[start].text==='('&&close(tokens,start)===stop-1){interpolationReads(tokens,start+1,stop-1,accept,depth+1);return;}
 if(['{','['].includes(tokens[start].text)&&close(tokens,start)===stop-1){
  const object=tokens[start].text==='{';for(const row of split(tokens.slice(start+1,stop-1))){let value=row;if(object){if(row[0]?.type!=='string'||row[1]?.text!==':')continue;value=row.slice(2);}if(value.length)interpolationReads(tokens,tokens.indexOf(value[0]),tokens.indexOf(value.at(-1))+1,accept,depth+1);}return;
 }
 // The whole interpolation leaf is one read. Never rewrite a place nested in
 // a call/operator/method/assignment, where changing Value into &Value could
 // alter Rust overload or move behavior before the independent checker runs.
 if(ident(tokens[start])&&tokens[start+1]?.text==='['&&close(tokens,start+1)===stop-1)accept(start,stop-1);
}
function errorFormatTail(tokens,start,stop){
 for(let depth=0;depth<=32;depth++){
  if(start>=stop)return false;
  if(['{','('].includes(tokens[start].text)&&close(tokens,start)===stop-1){start++;stop--;continue;}
  const call=macroAt(tokens,start,'format');return !!call&&call.end===stop-1;
 }
 return false;
}
function select(source,item,scoped){
 const tokens=item.tokens.filter(token=>token.type!=='comment'),header=originalDeclarationHeader(item,[]),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),edits=[],selections=[],skipped=[];let open=name+1;
 // Only source lifetimes may appear between the actual name and parameter list.
 while(open<tokens.length&&tokens[open].text!=='(')open++;const generic=text(tokens.slice(name+1,open));if(generic&&!/^<(?:'[\p{ID_Start}_][\p{ID_Continue}_]*,?)+>$/u.test(generic))return {edits,selections,skipped:[{function:item.name,reason:'generic type/const parameters require separate roles'}]};
 const params=close(tokens,open);let body=params+1;while(body<tokens.length&&tokens[body].text!=='{')body++;
 if(tokens.slice(0,name).some(token=>['const','unsafe','async','extern'].includes(token.text))||tokens.slice(params+1,body).some(token=>token.text==='where'))return {edits,selections,skipped:[{function:item.name,reason:'nonordinary function or generic bounds require separate roles'}]};
 if(tokens.length>200000||name<0||params<0||body>=tokens.length||close(tokens,body)!==tokens.length-1)return {edits,selections,skipped:[{function:item.name,reason:'complete ordinary function body required'}]};
 const env=new Map(),blocked=new Set(),parameterNames=new Set();
 for(const row of split(tokens.slice(open+1,params))){if(!ident(row[0])||row[1]?.text!==':'||parameterNames.has(row[0].text)||['Some','Ok','Option','Result','serde_json','translation_core'].includes(row[0].text))return {edits,selections,skipped:[{function:item.name,reason:'simple immutable distinct source parameters required'}]};parameterNames.add(row[0].text);const role=typeRole(row.slice(2),scoped);env.set(row[0].text,role?{...role,root:{name:row[0].text,span:[row[0].start,row[0].end]},evidence:[{kind:'source-parameter',span:[row[0].start,row.at(-1).end],source:source.slice(row[0].start,row.at(-1).end)}]}:null);}
 for(let at=body+1;at<tokens.length;at++){
  const macro=macroAt(tokens,at,'json')??macroAt(tokens,at,'format');if(macro){at=macro.open;continue;}
  if(tokens[at].text==='#'||tokens[at].type==='ident'&&tokens[at].text.startsWith('r#')||['unsafe','async','await','yield','fn','mod','use','extern','macro_rules','macro','trait','impl','struct','enum','union','type','const','static','for','while','loop'].includes(tokens[at].text)||tokens[at].type==='ident'&&tokens[at].text.endsWith('!')||tokens[at].text==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text))return {edits:[],selections:[],skipped:[{function:item.name,reason:'unknown expansion, loop, local declaration or effect'}]};
  if(tokens[at].text==='|'&&ident(tokens[at+1])){const end=tokens[at-1]?.text==='('?close(tokens,at-1):-1,args=end<0?'':text(tokens.slice(at,end));if(tokens[at-2]?.text!=='filter'||tokens[at-3]?.text!=='.'||!/^\|([\p{ID_Start}_][\p{ID_Continue}_]*)\|!?\1\.(?:is_object|is_null)\(\)$/u.test(args))return {edits:[],selections:[],skipped:[{function:item.name,reason:'unknown callback binding/effects'}]};blocked.add(tokens[at+1].text);at+=2;continue;}
  if(tokens[at].text==='||'&&['=','(',',','return','{','=>'].includes(tokens[at-1]?.text)){const end=tokens[at-1].text==='('?close(tokens,at-1):-1;if(tokens[at-2]?.text!=='ok_or_else'||tokens[at-3]?.text!=='.'||end<0||!errorFormatTail(tokens,at+1,end))return {edits:[],selections:[],skipped:[{function:item.name,reason:'unknown callback binding/effects'}]};}
  // Unknown closure and conditional-pattern names cannot borrow outer roles.
  if(tokens[at].text==='=>'){let start=at-1;while(start>body&&!['{','}',',',';'].includes(tokens[start-1].text))start--;const pattern=tokens.slice(start,at);if(pattern.length!==1||!['string','number','ident'].includes(pattern[0].type))return {edits:[],selections:[],skipped:[{function:item.name,reason:'nontrivial match binder scope requires separate roles'}]};if(ident(pattern[0]))blocked.add(pattern[0].text);}
  if(tokens[at].text==='let'&&['if','while'].includes(tokens[at-1]?.text)){const stop=tokens.slice(at+1).findIndex(token=>token.text==='=');for(const token of tokens.slice(at+1,stop<0?at+1:at+1+stop))if(ident(token))blocked.add(token.text);}
 }
 const walk=(start,stop,current,depth=0)=>{if(depth>64)return;for(let at=start;at<stop;at++){
  const macro=macroAt(tokens,at,'json');if(macro){
   interpolationReads(tokens,macro.open+1,macro.end,(index,end)=>{
    const receiver=tokens[index],role=current.get(receiver.text);if(!role||role.optional||!['value','map'].includes(role.kind)||blocked.has(receiver.text))return;const key=keyRole(tokens.slice(index+2,end),current,scoped,role.kind);if(!key||tokens.slice(index+2,end).some(token=>blocked.has(token.text)))return;
    const operation=role.kind==='map'?'json_map_index':key==='usize'?'json_index_usize':'json_index_str',span=[receiver.start,tokens[end].end],keySource=source.slice(tokens[index+1].end,tokens[end].start),replacement=C+operation+'(&'+source.slice(receiver.start,tokens[index+1].start)+', '+keySource+')';
    edits.push({span,expected:source.slice(...span),replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,receiver:receiver.text,keySource,operation,candidateRole:role,imports:scoped.imports,oldTraitDispatchProved:false,executableAdmission:false,evaluationOrder:['receiver-once','key-once'],missing:role.kind==='map'?'panic-no-entry':'canonical-Null'});
   });at=macro.end;continue;
  }
  const format=macroAt(tokens,at,'format');if(format){at=format.end;continue;}
  if(tokens[at].text==='let'&&!['if','while'].includes(tokens[at-1]?.text)){
   let equals=at+1;while(equals<stop&&!['=',';','{','}'].includes(tokens[equals].text))equals++;if(tokens[equals]?.text!=='=')continue;
   let end=equals+1,otherwise=-1;for(;end<stop;end++){if(tokens[end].text==='else'){otherwise=end;const closeElse=tokens[end+1]?.text==='{'?close(tokens,end+1):-1;if(closeElse<0)break;end=closeElse;continue;}if(['(','[','{'].includes(tokens[end].text)){const endGroup=close(tokens,end);if(endGroup<0)break;end=endGroup;continue;}if(tokens[end].text===';')break;}
   if(end>=stop||tokens[end].text!==';')continue;const pattern=tokens.slice(at+1,equals),plain=ident(pattern[0])&&(pattern.length===1||pattern[1]?.text===':'),some=pattern.length===4&&pattern[0].text==='Some'&&pattern[1].text==='('&&ident(pattern[2])&&pattern[3].text===')'&&otherwise>=0,binding=plain?pattern[0]:some?pattern[2]:pattern[0]?.text==='mut'&&ident(pattern[1])?pattern[1]:null;
   walk(equals+1,otherwise<0?end:otherwise,new Map(current),depth+1);if(otherwise>=0)walk(otherwise+1,end,new Map(current),depth+1);
   if(binding){let role=plain||some?expressionRole(tokens.slice(equals+1,otherwise<0?end:otherwise),current,scoped):null;if(some)role=role?.optional?{...role,optional:false}:null;else if(plain&&pattern.length>1){const declared=typeRole(pattern.slice(2),scoped);if(!declared||!role||declared.kind!==role.kind||declared.optional!==role.optional)role=null;}if(role?.evidence.length>=32)role=null;if(role)role={...role,evidence:[...role.evidence,{kind:some?'Some-let-else':'immutable-reader-alias',span:[tokens[at].start,tokens[end].end],source:source.slice(tokens[at].start,tokens[end].end)}]};current.set(binding.text,role);}else for(const token of pattern)if(ident(token))current.set(token.text,null);
   // Alias inference never accepts a newly introduced binding in its own RHS.
   at=end;continue;
  }
  if(tokens[at].text==='{'){const end=close(tokens,at);if(end<0||end>stop)return;walk(at+1,end,new Map(current),depth+1);at=end;}
 }};walk(body+1,tokens.length-1,env);
 if(!edits.length)skipped.push({function:item.name,span:[item.start,item.end],reason:'no closed shared canonical read inside qualified owned JSON interpolation'});return {edits,selections,skipped};
}
function apply(source,edits){
 const before=transportConcreteSyntaxSource(source,{language:'Rust'});edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('overlapping or changed exact edits');
 const changed=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'json-index:retain-complete-read-expression-and-evaluation-order',edits:[]}],repositoryRules:[{id:'router-core:adopt-fixed-shared-json-index-operation',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(changed.value)),mapping=[];let old=0,current=0;
 for(const edit of edits){if(old<edit.span[0]){const size=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}mapping.push({kind:'substitution',before:edit.span,after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});old=edit.span[1];current+=edit.replacement.length;}if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});let inverse=after.source;for(const row of [...mapping].reverse())if(row.kind==='substitution'){if(inverse.slice(...row.after)!==row.replacement)fail('inverse source differs');inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);}if(inverse!==source)fail('complete source inverse differs');return {before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},edits,mapping,trace:changed.trace,executableAdmission:false};
}
export function proposeCoreJsonIndicesCorpus(options={}){
 const supplied=record(options,['entry','files','compilationProfile','dependencyInputs'],4,'options'),{entry='src/lib.rs',files:input,compilationProfile:inputProfile=PRODUCTION_PROFILE,dependencyInputs:requestedDependencies}=supplied.value,captured=filesSnapshot(input),files=captured.value,profile=compilationProfile(inputProfile),dependencies=requestedDependencies===undefined?null:record(requestedDependencies,['manifest','lock'],2,'dependency inputs'),dependencyInputs=dependencies?.value;
 if(dependencies&&(Object.keys(dependencyInputs).length!==2||Object.values(dependencyInputs).some(source=>typeof source!=='string'||source.length>2_000_000)))fail('complete bounded Cargo sources required');
 if(typeof entry!=='string'||!Object.hasOwn(files,entry))fail('actual source entry required');const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),root=graph.modules.filter(module=>!module.path.length),core=graph.modules.filter(module=>same(module.path,['translation_core'])),leaf=graph.modules.filter(module=>same(module.path,['translation_core','primitives']));
 if(root.length!==1||core.length!==1||leaf.length!==1||core[0].file!=='src/translation_core.rs'||core[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaf[0].file!=='src/translation_core/primitives.rs'||leaf[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||core[0].configurationCondition!=='active'||leaf[0].configurationCondition!=='active')fail('complete current owned facade and primitive source required');
 const ownedFunctions=originalSourceModuleItems(leaf[0]);for(const name of ['json_index_str','json_index_usize','json_map_index'])if(ownedFunctions.filter(item=>item.term==='fn'&&item.name===name).length!==1||!core[0].source.includes('pub use self::primitives::{json_index_str, json_index_usize, json_map_index};'))fail('registered owned index declarations and exports required');
 const edges=originalSourceModuleItems(root[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edges.length!==1||root[0].source.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_core;')fail('actual public core edge required');
 const roleFor=createLiteralTextImportRoles(graph.modules,profile,dependencyInputs),context=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs}),proposals=[],skipped=[],after={...files};
 for(const file of Object.keys(files)){
  if(file==='src/translation_core.rs'||file.startsWith('src/translation_core/'))continue;const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>!module.sourceView.modulePath.length);if(origins.length!==1){skipped.push({file,reason:'one complete physical source origin required'});continue;}const edits=[],selections=[],preserved=[];
  for(const module of modules){const scoped=scope(module,graph.modules,profile,roleFor,context);for(const item of originalSourceModuleItems(module)){if(item.term!=='fn')continue;const condition=itemConfiguration(item.tokens,profile);if(scoped.problems.length||module.configurationCondition!=='active'||condition.status!=='active'||condition.attributes.some(attribute=>!inert.has(attribute.name))){preserved.push({function:item.name,span:[item.start,item.end],reason:'configuration, source producer or namespace uncertainty',problems:scoped.problems});continue;}const selected=select(files[file],item,scoped);edits.push(...selected.edits);selections.push(...selected.selections);preserved.push(...selected.skipped);}}
  const proposal=apply(files[file],edits);proposals.push({file,...proposal,selections,preserved});after[file]=proposal.after.source;
 }
 const inputs=Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),producerEffects=finishCoreAdoptionProducerContext(context),result={schema:'router-owned-json-index-corpus-v1',entry,compilationProfile:profile,dependencyInputs:dependencyInputs===undefined?null:{manifest:dependencyInputs.manifest,lock:dependencyInputs.lock},inputs,before:{...files},after,proposals,skipped,...(producerEffects?{producerEffects}:{}),moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},migrationSemantics:'explicit maintainer-owned API adoption; no original Index authority; fresh semantic/ownership/emission checks required',executableAdmission:false};verifyLiteralTextImportRoles(roleFor);dependencies?.verify();captured.verify();supplied.verify();return result;
}
