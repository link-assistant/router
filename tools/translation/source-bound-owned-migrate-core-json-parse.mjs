import {crateModuleSourcePath} from './repository-layout.mjs';
// Proposal-only, fixed optional decode adoption. Full source/namespace producer
// evidence is retained; no proposal record grants executable/type authority.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {resolveModuleGraph} from './project.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves,resolveModuleBindings,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {createCoreAdoptionProducerContext,coreAdoptionProducerBindings,finishCoreAdoptionProducerContext} from './source-bound-owned-core-context.mjs';
import {registeredStandardHostBindings} from './standard-host-bindings.mjs';
import {coreTypeProducerProblemsForModule} from './source-bound-owned-migrate-core-primitives.mjs';
import {compilationProfile,itemConfiguration,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {jsonMacroDependencyProfile} from './json-macro-inputs.mjs';
import {jsonRoundtripCandidateProfile} from './json-roundtrip-capabilities.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-source-data.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const C='crate::translation_core::',hash=source=>createHash('sha256').update(source).digest('hex');
const fail=message=>{throw new TypeError('Owned optional JSON adoption: '+message);};
const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const words=tokens=>tokens.map(token=>token.text).join('');
const inert=new Set(['cfg','doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','track_caller']);
const reserved=new Set(['serde_json','translation_core','Ok','Some','Result','Option','u8','str','std','core']);
function record(value,allowed,bound){
 if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('own input data required');
 const parent=Object.getPrototypeOf(value),keys=Reflect.ownKeys(value),out=Object.create(null),rows=[];
 if(keys.length>bound||keys.some(key=>typeof key!=='string'||key==='stack'||allowed&&!allowed.includes(key)))fail('input fields differ');
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value'))fail('input accessors refused');out[key]=d.value;rows.push([key,d]);}
 return {value:out,verify(){if(Object.getPrototypeOf(value)!==parent||JSON.stringify(Reflect.ownKeys(value))!==JSON.stringify(keys))fail('input keys changed');for(const [key,a]of rows){const b=Object.getOwnPropertyDescriptor(value,key);if(!b||!Object.hasOwn(b,'value')||b.value!==a.value||b.writable!==a.writable||b.enumerable!==a.enumerable||b.configurable!==a.configurable)fail('input fields changed');}}};
}
function close(tokens,start){const pairs={'(':')','[':']','{':'}'},stack=[];for(let at=start;at<tokens.length;at++){const token=tokens[at];if(['string','char','comment'].includes(token.type))continue;if(pairs[token.text])stack.push(pairs[token.text]);else if([')',']','}'].includes(token.text)){if(stack.pop()!==token.text)return -1;if(!stack.length)return at;}}return -1;}
function split(tokens){const rows=[];let start=0;for(let at=0;at<tokens.length;at++){if(['(','[','{'].includes(tokens[at].text)){const end=close(tokens,at);if(end<0)return [];at=end;}else if(tokens[at].text===','){rows.push(tokens.slice(start,at));start=at+1;}}rows.push(tokens.slice(start));return rows.filter(row=>row.length);}
// Preserve the argument interior verbatim. Groups and explicit turbofish/closure
// headers may contain commas; a second outer argument is never adopted.
function singleArgument(tokens,start,end){
 if(start===end)return null;const last=tokens[end-1]?.text===','?end-1:end;if(start===last)return null;
 for(let at=start;at<last;at++){
  const word=tokens[at].text;if(['(','[','{'].includes(word)){const stop=close(tokens,at);if(stop<0||stop>=last)return null;at=stop;}
  else if(word==='<'&&tokens[at-1]?.text==='::'){let depth=1;while(++at<last&&depth){if(['(','[','{'].includes(tokens[at].text)){const stop=close(tokens,at);if(stop<0||stop>=last)return null;at=stop;}else if(tokens[at].text==='<')depth++;else if(tokens[at].text==='>')depth--;else if(tokens[at].text==='>>')depth-=2;}if(depth)return null;at--;}
  else if(word==='|'&&at===start){while(++at<last&&tokens[at].text!=='|'){}if(at===last)return null;}
  else if(word===',')return null;
 }
 return tokens.slice(start,last);
}
function tailRoot(source,tokens,at,stop,body,parameter){
 const question=tokens[stop+1],fused=token=>token?.text==='?.'&&token.end===token.start+2&&source.slice(token.start,token.end)==='?.';
 if(!parameter||at!==body+1||!(question?.text==='?'||fused(question)))return null;
 let cursor=stop+(question.text==='?'?2:1),methods=0;while(cursor<tokens.length-1){if(!(tokens[cursor]?.text==='.'||fused(tokens[cursor]))||!ident(tokens[cursor+1])||tokens[cursor+2]?.text!=='(')return null;const end=close(tokens,cursor+2);if(end<0)return null;cursor=end+1;if(tokens[cursor]?.text==='?')cursor++;methods++;}
 return methods&&cursor===tokens.length-1?{span:[tokens[at].start,tokens[cursor-1].end],questionEnd:fused(question)?question.start+1:question.end}:null;
}
function scope(module,modules,profile,context){
 const ancestors=modules.filter(parent=>parent.path.length<=module.path.length&&parent.path.every((name,at)=>module.path[at]===name)),problems=[],imports=[],identifiers=new Set();
 for(const parent of ancestors){problems.push(...coreTypeProducerProblemsForModule(context,parent));for(const item of originalSourceModuleItems(parent)){
  for(const token of item.tokens)if(token.type==='ident')identifiers.add(token.text.replace(/^r#/u,''));
  if(item.comment||itemConfiguration(item.tokens,profile).status==='inactive')continue;
  const declarationTokens=item.tokens.filter(token=>token.type!=='comment');if(declarationTokens.some((token,at)=>token.text==='extern'&&declarationTokens[at+1]?.text==='crate')){const alias=declarationTokens.findIndex(token=>token.text==='as'),bound=alias<0?declarationTokens[declarationTokens.findIndex(token=>token.text==='crate')+1]?.text:declarationTokens[alias+1]?.text;if(reserved.has(bound))problems.push('competing external crate alias '+bound);}
  const header=originalDeclarationHeader(item,parent.path);if(header&&reserved.has(header.name)&&!(header.name==='translation_core'&&parent.path.length===0&&item.term==='mod'))problems.push('competing decode owner or constructor '+header.name);
  if(item.term==='use')for(const leaf of originalUseDeclarationLeaves(item,parent.path)){imports.push({file:parent.file,module:parent.path,span:[item.start,item.end],leaf});if(leaf.glob||reserved.has(leaf.name))problems.push('glob or competing decode root/constructor import '+leaf.name);}
 }}return {problems,imports,identifiers};
}
// Per-invocation candidates only: the binder/private producer context owns
// import identity, while the newly reconstructed source is checked separately.
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
function aliasShadowed(tokens,body,parameters,name){
 if(parameters.has(name))return true;
 for(let at=body+1;at<tokens.length-1;at++){
  if(tokens[at].text==='let'){let end=at+1;while(end<tokens.length&&!['=',';'].includes(tokens[end].text))end++;if(tokens.slice(at+1,end).some(token=>ident(token)&&token.text===name))return true;}
  if(tokens[at].text==='|'&&['(',',','=','{','return','=>'].includes(tokens[at-1]?.text)){let end=at+1;while(end<tokens.length&&tokens[end].text!=='|')end++;if(tokens.slice(at+1,end).some(token=>ident(token)&&token.text===name))return true;at=end;}
 }
 return false;
}
function selectedRoot(source,tokens,at,stop,body,parameter,identifiers,module,item){
 const root=tailRoot(source,tokens,at,stop,body,parameter);if(!root)return null;
 const names=new Set(identifiers);for(const token of tokens)if(token.type==='ident')names.add(token.text.replace(/^r#/u,''));let suffix=0;while(names.has('__router_json_root_'+suffix))suffix++;
 return {...root,name:'__router_json_root_'+suffix,hygiene:{identifiers:[...names].sort(),sourceModule:module.path},function:item.name};
}
function select(source,item,module,identifiers,imports){
 const tokens=item.tokens.filter(token=>token.type!=='comment'),header=originalDeclarationHeader(item,module.path),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),edits=[],selections=[],roots=[];
 const skip=reason=>({edits:[],selections:[],roots:[],preserved:[{function:item.name,span:[item.start,item.end],reason}]});
 if(name<0||tokens[name+1]?.text!=='(')return skip('ordinary nongeneric function declaration required');
 const paramsEnd=close(tokens,name+1);let body=paramsEnd+1;while(body<tokens.length&&tokens[body].text!=='{')body++;
 if(paramsEnd<0||body>=tokens.length||close(tokens,body)!==tokens.length-1||tokens.slice(0,name).some(token=>['async','unsafe','extern','const'].includes(token.text))||tokens.slice(paramsEnd+1,body).some(token=>token.text==='where'))return skip('complete ordinary function required');
 const parameters=new Map();
 for(const row of split(tokens.slice(name+2,paramsEnd))){if(!ident(row[0])||row[1]?.text!==':'||reserved.has(row[0].text)||parameters.has(row[0].text))return skip('simple distinct immutable source parameters required');const type=words(row.slice(2));parameters.set(row[0].text,{kind:['&str','&'+C+'Str'].includes(type)?'text':type==='&[u8]'?'bytes':null,span:[row[0].start,row.at(-1).end],source:source.slice(row[0].start,row.at(-1).end)});}
 // Do not infer roles through shadowing, nested declarations, macros or raw
 // identifiers. Unknown callbacks are preserved with their complete function.
 for(let at=body+1;at<tokens.length-1;at++){
  const word=tokens[at].text;
  if(['#','fn','mod','use','extern','macro_rules','macro','trait','impl','struct','enum','union','type','const','static','for','while','loop','unsafe','async','await','yield'].includes(word)||word.startsWith('r#')||tokens[at].type==='ident'&&word.endsWith('!')||word==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text))return skip('unexpanded macro, local declaration, loop or effect');
  if(word==='let'){let stop=at+1;while(stop<tokens.length&&!['=',';'].includes(tokens[stop].text))stop++;const pattern=tokens.slice(at+1,stop),ok=pattern.length===4&&pattern[0].text==='Ok'&&pattern[1].text==='('&&ident(pattern[2])&&pattern[3].text===')';if(pattern.some((token,index)=>ident(token)&&(parameters.has(token.text)||reserved.has(token.text)&&!(ok&&index===0))))return skip('source parameter or decode owner is shadowed by a local pattern');}
  if(word==='|'){if(!['(',',','=','{','return','=>'].includes(tokens[at-1]?.text))return skip('unknown pipe or closure context');let end=at+1;while(end<tokens.length&&tokens[end].text!=='|')end++;if(end>=tokens.length||tokens.slice(at+1,end).some(token=>parameters.has(token.text)||reserved.has(token.text)))return skip('closure shadows a decode input or source owner');at=end;}
 }
 for(let at=body+1;at<tokens.length-1;at++){
  if(tokens[at].text!=='serde_json'||['::','.'].includes(tokens[at-1]?.text)||tokens[at+1]?.text!=='::'||!['from_str','from_slice'].includes(tokens[at+2]?.text)||words(tokens.slice(at+3,at+5))!=='::<')continue;
  let endType=at+5;while(endType<tokens.length&&!['>','(',')',';','{'].includes(tokens[endType].text))endType++;
  const targetTokens=tokens.slice(at+5,endType),target=words(targetTokens);if(tokens[endType]?.text!=='>'||tokens[endType+1]?.text!=='(')continue;let importedTarget=null;if(!['serde_json::Value',C+'Json'].includes(target)){if(targetTokens.length!==1||!ident(targetTokens[0])||aliasShadowed(tokens,body,parameters,target))continue;importedTarget=imports.select(module,target);if(!importedTarget)continue;}
  const end=close(tokens,endType+1),argument=end<0?null:singleArgument(tokens,endType+2,end);if(!argument)continue;
  const kind=tokens[at+2].text==='from_str'?'text':'bytes',role=argument.length===1&&ident(argument[0])?parameters.get(argument[0].text):null,parameter=role?.kind===kind?{name:argument[0].text,...role}:null;
  const interior=[tokens[endType+1].end,tokens[end].start],expression={span:interior,source:source.slice(...interior)},operation=kind==='text'?'json_parse':'json_parse_bytes',span=[tokens[at].start,tokens[end].end],replacement=C+operation+'('+expression.source+')';let mode=null,stop=end,patternEdit=null;
  if(words(tokens.slice(end+1,end+5))==='.ok()'){mode='discard-error-ok';stop=end+4;}
  else if(words(tokens.slice(at-6,at-3))==='letOk('&&ident(tokens[at-3])&&tokens[at-2]?.text===')'&&tokens[at-1]?.text==='='&&tokens[end+1]?.text==='else'&&tokens[end+2]?.text==='{'){
   const branchEnd=close(tokens,end+2);if(branchEnd<0||tokens[branchEnd+1]?.text!==';')continue;mode='discard-error-let-else';const pattern=[tokens[at-5].start,tokens[at-5].end];patternEdit={span:pattern,expected:source.slice(...pattern),replacement:C+'Maybe::Some'};
  }
  if(!mode)continue;
  const complete=[span[0],tokens[stop].end];if(item.tokens.some(token=>token.type==='comment'&&token.start>=complete[0]&&token.end<=complete[1]&&!(token.start>=interior[0]&&token.end<=interior[1])))continue;
  const root=mode==='discard-error-ok'?selectedRoot(source,tokens,at,stop,body,parameter,identifiers,module,item):null;if(root)roots.push(root);
  if(patternEdit)edits.push(patternEdit);edits.push({span:complete,expected:source.slice(...complete),replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span:complete,operation,mode,argument:{...(parameter??{}),expression},sourceTarget:target,...(importedTarget?{importedTarget}:{}),originalCall:source.slice(...span),replacement,sourceModule:module.path,originalParserImplementationTranslated:false,originalErrorDropAdmitted:false,executableAdmission:false,evaluationOrder:['borrowed-input-once']});at=stop;
 }
 // Previously adopted calls have no native alias edit. They still pass all
 // original source/profile gates and retain an explicit identity first stage.
 for(let at=body+1;at<tokens.length-1;at++){
  if(words(tokens.slice(at,at+4))!=='crate::translation_core::'||['::','.'].includes(tokens[at-1]?.text)||!['json_parse','json_parse_bytes'].includes(tokens[at+4]?.text)||tokens[at+5]?.text!=='(')continue;
  const end=close(tokens,at+5),argument=end<0?null:singleArgument(tokens,at+6,end),kind=tokens[at+4].text==='json_parse'?'text':'bytes',role=argument?.length===1&&ident(argument[0])?parameters.get(argument[0].text):null,parameter=role?.kind===kind?{name:argument[0].text,...role}:null;
  const root=end<0?null:selectedRoot(source,tokens,at,end,body,parameter,identifiers,module,item);if(!root)continue;
  roots.push(root);selections.push({function:item.name,functionSpan:[item.start,item.end],span:[tokens[at].start,tokens[end].end],operation:tokens[at+4].text,mode:'already-owned-full-tail-root',argument:{...parameter,expression:{span:[tokens[at+5].end,tokens[end].start],source:source.slice(tokens[at+5].end,tokens[end].start)}},sourceTarget:C+'Json',originalCall:source.slice(tokens[at].start,tokens[end].end),sourceModule:module.path,originalParserImplementationTranslated:false,originalErrorDropAdmitted:false,executableAdmission:false,evaluationOrder:['borrowed-input-once']});at=end;
 }
 return {edits,selections,roots,preserved:selections.length?[]:[{function:item.name,span:[item.start,item.end],reason:'no exact canonical unary parse with a retained balanced argument and discarded error'}]};
}
function mapping(source,after,edits){
 const result=[];let old=0,current=0;for(const edit of edits){if(old<edit.span[0]){const size=edit.span[0]-old;result.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}result.push({kind:'substitution',before:edit.span,after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});old=edit.span[1];current+=edit.replacement.length;}if(old<source.length)result.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});
 let restored=after;for(const part of [...result].reverse())if(part.kind==='substitution'){if(restored.slice(...part.after)!==part.replacement)fail('inverse replacement differs');restored=restored.slice(0,part.after[0])+part.expected+restored.slice(part.after[1]);}if(restored!==source)fail('complete inverse differs');return result;
}
function apply(source,edits,language='optional-json-parse:retain-canonical-call-and-error-discard-context',repository='router-core:adopt-qualified-optional-json-decode'){
 const before=transportConcreteSyntaxSource(source,{language:'Rust'});edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('overlapping or changed exact edit');
 const stage=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:language,edits:[]}],repositoryRules:[{id:repository,edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(stage.value));
 return {before:{source,sha256:hash(source),meta:before.meta},after:{source:after.source,sha256:hash(after.source),meta:after.meta},edits,mapping:mapping(source,after.source,edits),trace:stage.trace,executableAdmission:false};
}
function normalize(source,edits,roots){
 const first=apply(source,edits);if(!roots.length)return first;roots.sort((a,b)=>a.span[0]-b.span[0]);
 const offset=point=>{let delta=0;for(const edit of first.edits){if(point<=edit.span[0])break;if(point<edit.span[1])fail('tail boundary crosses adoption edit');delta+=edit.replacement.length-(edit.span[1]-edit.span[0]);}return point+delta;};
 const normalized=roots.map(root=>{const span=root.span.map(offset),question=offset(root.questionEnd),original=first.after.source.slice(...span),line=first.after.source.lastIndexOf('\n',span[0]-1)+1,indent=first.after.source.slice(line,span[0]).match(/^\s*/u)[0],replacement='{\n'+indent+'    let '+root.name+' = '+first.after.source.slice(span[0],question)+';\n'+indent+'    '+root.name+first.after.source.slice(question,span[1])+'\n'+indent+'}';return {span,expected:original,replacement};});
 const second=apply(first.after.source,normalized,'optional-json-parse:retain-complete-tail-and-borrowed-parameter-root','router-core:bind-owned-json-full-tail-root');
 const combined=first.edits.filter(edit=>!roots.some(root=>edit.span[0]>=root.span[0]&&edit.span[1]<=root.span[1])).concat(roots.map((root,index)=>({span:root.span,expected:source.slice(...root.span),replacement:normalized[index].replacement}))).sort((a,b)=>a.span[0]-b.span[0]);
 return {before:first.before,after:second.after,edits:combined,mapping:mapping(source,second.after.source,combined),trace:[...first.trace,...second.trace],stages:[{name:'canonical-native-alias',...first},{name:'lexical-json-full-tail',...second}],tailRoots:roots,executableAdmission:false};
}
export function proposeCoreJsonParseCorpus(options={}){
 const supplied=record(options,['entry','files','compilationProfile','dependencyInputs'],4),{entry='src/lib.rs',files:input,compilationProfile:inputProfile=PRODUCTION_PROFILE,dependencyInputs:requestedDependencies}=supplied.value,captured=record(input,null,1024),files=captured.value,profile=compilationProfile(inputProfile),dependencies=record(requestedDependencies,['manifest','lock'],2),dependencyInputs=dependencies.value;let units=0;
 if(Object.keys(dependencyInputs).length!==2||Object.values(dependencyInputs).some(value=>typeof value!=='string'||value.length>2_000_000))fail('complete bounded Cargo sources required');
 const dependencyProof=jsonMacroDependencyProfile(dependencyInputs).proof;if(!dependencyProof)fail('actual locked serde source profile required');const numericProfile=jsonRoundtripCandidateProfile({dependencies:dependencyProof,compilationProfile:profile});
 for(const [path,source]of Object.entries(files)){if(!path.endsWith('.rs')||path.length>4096||path.includes('\\')||/[\x00-\x1f:]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..')||typeof source!=='string'||source.length>2_000_000)fail('bounded canonical Rust sources required');units+=source.length;if(units>32_000_000)fail('aggregate source limit');}if(typeof entry!=='string'||!Object.hasOwn(files,entry))fail('actual source entry required');
 const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),root=graph.modules.filter(module=>!module.path.length),core=graph.modules.filter(module=>module.path.join('::')==='translation_core'),leaf=graph.modules.filter(module=>module.path.join('::')==='translation_core::primitives');
 if(root.length!==1||core.length!==1||leaf.length!==1||core[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core.rs')||core[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaf[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core/primitives.rs')||leaf[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||core[0].configurationCondition!=='active'||leaf[0].configurationCondition!=='active'||!core[0].source.includes('pub use self::primitives::{json_parse, json_parse_bytes};'))fail('complete current owned decoder interface required');
 const edges=originalSourceModuleItems(root[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edges.length!==1||root[0].source.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_core;')fail('actual public core edge required');
 for(const name of ['json_parse','json_parse_bytes'])if(originalSourceModuleItems(leaf[0]).filter(item=>item.term==='fn'&&item.name===name).length!==1)fail('actual owned decoder declarations required');
 const context=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs}),imports=importedJsonTargets(graph.modules,profile,context),proposals=[],skipped=[],after={...files};
 for(const file of Object.keys(files)){
  if(file===crateModuleSourcePath(graph.modules,'src/translation_core.rs')||file.startsWith(crateModuleSourcePath(graph.modules,'src/translation_core/')))continue;const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>!module.sourceView.modulePath.length);if(origins.length!==1){skipped.push({file,reason:'unique complete physical source origin required'});continue;}
  const edits=[],selections=[],roots=[],preserved=[];for(const module of modules){const scoped=scope(module,graph.modules,profile,context);for(const item of originalSourceModuleItems(module)){if(item.term!=='fn')continue;const condition=itemConfiguration(item.tokens,profile);if(module.configurationCondition!=='active'||condition.status!=='active'||condition.attributes.some(attribute=>!inert.has(attribute.name))||scoped.problems.length){preserved.push({function:item.name,span:[item.start,item.end],reason:'configuration, producer or decode owner uncertainty',problems:scoped.problems});continue;}const selected=select(files[file],item,module,scoped.identifiers,imports);edits.push(...selected.edits);roots.push(...selected.roots);selections.push(...selected.selections.map(row=>({...row,imports:scoped.imports})));preserved.push(...selected.preserved);}}
  const proposal=normalize(files[file],edits,roots);proposals.push({file,...proposal,selections,preserved});after[file]=proposal.after.source;
 }
 imports.verify();const producerEffects=finishCoreAdoptionProducerContext(context),result={schema:'router-owned-optional-json-parse-corpus-v1',entry,compilationProfile:profile,dependencyInputs:{...dependencyInputs},inputs:Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),before:{...files},after,proposals,skipped,...(producerEffects?{producerEffects}:{}),moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},numericSourceProfile:numericProfile,migrationSemantics:'explicit maintainer-owned optional canonical decode adoption; only existing discarded-error contexts; no general Deserialize/Error Drop or old parser capability; fresh checked semantics required',executableAdmission:false};
 dependencies.verify();captured.verify();supplied.verify();return result;
}
