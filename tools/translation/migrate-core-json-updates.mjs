// Explicit maintainer-owned API adoption. This source proposal does not grant
// old Clone/IndexMut dispatch, a checked type or executable admission.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {resolveModuleGraph} from './project.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {createCoreAdoptionProducerContext,finishCoreAdoptionProducerContext} from './core-adoption-producer-context.mjs';
import {coreTypeProducerProblemsForModule} from './migrate-core-primitives.mjs';
import {compilationProfile,itemConfiguration,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-source-data.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex'),C='crate::translation_core::';
const fail=reason=>{throw new TypeError('Owned JSON update adoption: '+reason);};
const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const inert=new Set(['cfg','doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','track_caller']);
function sourceMap(input){
 if(!input||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('complete own-data files required');const files=Object.create(null),names=Reflect.ownKeys(input);if(names.length>1024)fail('source file bound');let total=0;
 for(const name of names){const d=Object.getOwnPropertyDescriptor(input,name);if(typeof name!=='string'||name.length>4096||!name.endsWith('.rs')||name.includes('\\')||/[\x00-\x1f:]/u.test(name)||name.split('/').some(part=>!part||part==='.'||part==='..')||!d||!Object.hasOwn(d,'value')||typeof d.value!=='string'||d.value.length>2_000_000)fail('bounded full canonical source required');total+=d.value.length;if(total>32_000_000)fail('total source bound');files[name]=d.value;}return files;
}
function close(tokens,at){const pairs={'(':')','[':']','{':'}'},stack=[];for(let end=at;end<tokens.length;end++){const token=tokens[end];if(['string','char','comment'].includes(token.type))continue;if(pairs[token.text])stack.push(pairs[token.text]);else if([')',']','}'].includes(token.text)){if(stack.pop()!==token.text)return -1;if(!stack.length)return end;}}return -1;}
function ownedMacro(tokens,at,name){
 if(!['crate','::','translation_core','::'].every((word,index)=>tokens[at+index]?.text===word)||!ident(tokens[at])||!ident(tokens[at+2]))return null;
 const last=tokens[at+4],attached=last?.text===name+'!',separate=last?.text===name&&tokens[at+5]?.text==='!';if(!attached&&!separate)return null;const open=at+(attached?5:6),end=close(tokens,open);return end>=0?{open,end}:null;
}
function statementEnd(tokens,start){for(let at=start;at<tokens.length;at++){if(['(','[','{'].includes(tokens[at].text)){const end=close(tokens,at);if(end<0)return -1;at=end;}else if(tokens[at].text===';')return at;else if(tokens[at].text==='}')return -1;}return -1;}
function select(source,item){
 const tokens=item.tokens.filter(token=>token.type!=='comment'),selections=[],skipped=[],edits=[],claimed=new Set(),names=new Set(tokens.filter(ident).map(token=>token.text));
 if(tokens.some(token=>token.type==='ident'&&token.text.startsWith('r#')))return {edits:[],selections:[],skipped:[{function:item.name,reason:'raw local identity requires separate hygiene checking'}]};
 const header=originalDeclarationHeader(item,[]),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),params=close(tokens,name+1);let body=params+1;while(body<tokens.length&&tokens[body].text!=='{')body++;if(name<0||tokens[name+1]?.text!=='('||params<0||body>=tokens.length||close(tokens,body)!==tokens.length-1)return {edits:[],selections:[],skipped:[{function:item.name,reason:'complete ordinary function body required'}]};
 for(let at=body+1;at<tokens.length;at++){
  // Unknown expansions/local declarations retain the whole original body. A
  // fixed owned JSON/format call cannot introduce Rust bindings into the caller.
  const macro=ownedMacro(tokens,at,'json')??ownedMacro(tokens,at,'format');if(macro){at=macro.open;continue;}
  if(tokens[at].text.endsWith('!')||tokens[at].text==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text)&&!['if','while','return','else'].includes(tokens[at-1].text)||tokens[at].text==='#'||['unsafe','async','await','yield','macro_rules','extern','trait','impl','fn','mod','use','struct','enum','union','type','const','static'].includes(tokens[at].text))return {edits:[],selections:[],skipped:[{function:item.name,reason:'unknown expansion or unsupported local effect/declaration'}]};
 }
 for(let at=0;at+5<tokens.length;at++){
  if(tokens[at].text!=='let'||tokens[at+1].text!=='mut'||!ident(tokens[at+2])||tokens[at+3].text!=='=')continue;
  const local=tokens[at+2].text,initial=ownedMacro(tokens,at+4,'json');if(!initial||tokens[initial.end+1]?.text!==';')continue;
  const root=tokens[initial.open+1],literalRoot=root?.text==='{'||root?.text==='null'&&initial.end===initial.open+2;if(!literalRoot){skipped.push({function:item.name,local,reason:'fresh literal object or null required'});continue;}
  const updates=[];
  for(let index=initial.end+2;index<tokens.length;index++){
   if(tokens[index].text!==local||tokens[index+1]?.text!=='['||tokens[index+2]?.type!=='string'||!(/^(?:"|r#*")/u.test(tokens[index+2].text))||tokens[index+3]?.text!==']'||tokens[index+4]?.text!=='=')continue;
   if(![';','{','}'].includes(tokens[index-1]?.text)){updates.length=0;break;}
   const end=statementEnd(tokens,index+5);if(end<0){updates.length=0;break;}
   if(tokens.slice(index+5,end).some(token=>token.text===local)){updates.length=0;break;}
   if(item.tokens.some(token=>token.type==='comment'&&tokens[index].start<=token.start&&token.end<=tokens[index+4].end)){updates.length=0;break;}
   updates.push({index,end,key:tokens[index+2],rhs:[tokens[index+4].end,tokens[end].start]});index=end;
  }
  if(!updates.length)continue;
  const remaining=tokens.map((token,index)=>({token,index})).filter(({token,index})=>token.text===local&&index!==at+2&&!updates.some(row=>index===row.index));
  if(remaining.length!==1||remaining[0].index<=updates.at(-1).end){skipped.push({function:item.name,local,reason:'only update assignees and one final owned return are supported; aliases/shadows/reads remain'});continue;}
  const tail=remaining[0].index;let end=tokens.length-1;while(tokens[end]?.text==='}')end--;
  const suffix=tokens.slice(tail+1,end+1).map(token=>token.text),before=tokens[tail-1]?.text;
  const finalJson=tokens.some((token,index)=>{const macro=ownedMacro(tokens,index,'json');return macro&&index<tail&&tail<macro.end&&tokens.slice(macro.end+1,end+1).every(token=>token.text===')');});
  if(!(suffix.every(word=>word===')')&&['}',';','(','return'].includes(before)||finalJson)){skipped.push({function:item.name,local,reason:'owned value must be returned in the final expression or owned JSON projection'});continue;}
  // No shadowing binder can pass the complete same-spelling census above.
  for(const update of updates){
   if(update.rhs.some(value=>!Number.isSafeInteger(value))||update.rhs[0]>=update.rhs[1])continue;
   let temporary='__router_json_rhs_394';for(let suffix=2;names.has(temporary);suffix++)temporary='__router_json_rhs_394_'+suffix;names.add(temporary);
   const span=[tokens[update.index].start,tokens[update.end].end],rhs=source.slice(...update.rhs),key=source.slice(update.key.start,update.key.end),replacement='{ let '+temporary+' = '+rhs+'; '+local+' = '+C+'json_with_field('+local+', '+key+', '+temporary+'); }';
   if([...claimed].some(row=>span[0]<row[1]&&row[0]<span[1]))fail('overlapping local update selection');claimed.add(span);edits.push({span,expected:source.slice(...span),replacement});selections.push({function:item.name,local,span,rhs:update.rhs,keySource:key,temporary,sourceOperation:'fresh-owned-json-direct-string-key-assignment',evaluationOrder:['complete-original-RHS','move-owned-base','literal-key','move-computed-value','owned-update'],oldTraitDispatchProved:false});
  }
 }
 return {edits,selections,skipped};
}
function apply(source,edits){
 const before=transportConcreteSyntaxSource(source,{language:'Rust'});edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('overlapping or changed exact edits');
 const changed=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'owned-json-update:retain-complete-assignment-expressions',edits:[]}],repositoryRules:[{id:'router-core:adopt-owned-update-with-RHS-first-local',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(changed.value)),mapping=[];let old=0,current=0;
 for(const edit of edits){if(old<edit.span[0]){const size=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}mapping.push({kind:'substitution',before:edit.span,after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});old=edit.span[1];current+=edit.replacement.length;}
 if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});let inverse=after.source;for(const row of [...mapping].reverse())if(row.kind==='substitution')inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);if(inverse!==source)fail('complete source inverse differs');
 return {before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},edits,mapping,trace:changed.trace,executableAdmission:false};
}
export function proposeCoreJsonUpdateCorpus({entry='src/lib.rs',files:input,compilationProfile:inputProfile=PRODUCTION_PROFILE,dependencyInputs}={}){
 const files=sourceMap(input),profile=compilationProfile(inputProfile);if(!Object.hasOwn(files,entry))fail('actual root source missing');const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),root=graph.modules.filter(module=>!module.path.length),core=graph.modules.filter(module=>module.path.join('::')==='translation_core'),leaf=graph.modules.filter(module=>module.path.join('::')==='translation_core::primitives');
 if(root.length!==1||core.length!==1||leaf.length!==1||core[0].file!=='src/translation_core.rs'||core[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||core[0].configurationCondition!=='active'||leaf[0].file!=='src/translation_core/primitives.rs'||leaf[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||leaf[0].configurationCondition!=='active')fail('complete current owned facade and primitive source required');
 const edges=originalSourceModuleItems(root[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edges.length!==1||root[0].source.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_core;')fail('actual public core edge required');if(originalSourceModuleItems(root[0]).some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_core')))fail('competing core alias');
 const context=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs}),proposals=[],skipped=[],after={...files};
 for(const file of Object.keys(files)){
  if(file==='src/translation_core.rs'||file.startsWith('src/translation_core/'))continue;const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>!module.sourceView.modulePath.length);if(origins.length!==1){skipped.push({file,reason:'one complete physical source origin required'});continue;}const edits=[],selections=[],preserved=[];
  for(const module of modules){const ancestors=graph.modules.filter(parent=>parent.path.length<=module.path.length&&parent.path.every((name,at)=>module.path[at]===name)),problems=ancestors.flatMap(parent=>coreTypeProducerProblemsForModule(context,parent));let uncertain=false;
   for(const parent of ancestors)for(const item of originalSourceModuleItems(parent))if(itemConfiguration(item.tokens,profile).status!=='inactive'){
    const header=originalDeclarationHeader(item,parent.path);if(header?.name==='translation_core'&&!(parent===root[0]&&item.term==='mod'&&item.start===edges[0].start&&item.end===edges[0].end))uncertain=true;if(item.term==='use'&&originalUseDeclarationLeaves(item,parent.path).some(leaf=>leaf.glob))uncertain=true;
   }
   for(const item of originalSourceModuleItems(module)){if(item.term!=='fn')continue;const condition=itemConfiguration(item.tokens,profile);if(module.configurationCondition!=='active'||condition.status!=='active'||condition.attributes.some(attribute=>!inert.has(attribute.name))||problems.length||uncertain){preserved.push({function:item.name,span:[item.start,item.end],reason:'configuration, producer, glob or competing core uncertainty'});continue;}
    const selected=select(files[file],item);edits.push(...selected.edits);selections.push(...selected.selections);preserved.push(...selected.skipped);
   }
  }
  const result=apply(files[file],edits);proposals.push({file,...result,selections,preserved});after[file]=result.after.source;
 }
 const inputs=Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),producerEffects=finishCoreAdoptionProducerContext(context);
 return {schema:'router-owned-json-update-corpus-v1',entry,compilationProfile:profile,inputs,before:{...files},after,proposals,skipped,...(producerEffects?{producerEffects}:{}),moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},migrationSemantics:'explicit-owned-API-adoption; fresh type/ownership/body checks remain mandatory',executableAdmission:false};
}
