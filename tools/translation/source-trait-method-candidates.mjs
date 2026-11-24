// Complete source-written trait member candidates, not method dispatch. A
// genuine original view authenticates syntax; caller namespaces, supertraits,
// transformed outputs and receiver applicability remain separate obligations.
import {types,isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {copyMetadata,ownData} from './extensions/source-links.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalDeclarationHeader} from './module-bindings.mjs';
import {rustTokens} from './rust-structure.mjs';
import {originalImplMemberItems} from './rust-member-boundaries.mjs';
import {itemConfiguration,isAbsentConditionalAttribute} from './cfg-profile.mjs';
import {isPlainSourceIdentifier} from './module-paths.mjs';
const states=new WeakMap(),queries=new WeakMap(),absences=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original trait method candidates: '+message);};
export const TRAIT_METHOD_CANDIDATE_LIMITS=Object.freeze({sourceBytes:256000,tokens:32000,members:512,depth:64});
const pairs={'(':')','[':']','{':'}'};
const significant=tokens=>tokens.filter(token=>token.type!=='comment');
const tokenData=tokens=>tokens.map(token=>({text:token.text,type:token.type,span:{start:token.start,end:token.end}}));
function endGroup(tokens,start){
 const stack=[pairs[tokens[start]?.text]];if(!stack[0])fail('expected a complete original delimiter group');
 for(let at=start+1;at<tokens.length;at++){const token=tokens[at];if(token.type!=='punct')continue;if(Object.hasOwn(pairs,token.text)){if(stack.length>=TRAIT_METHOD_CANDIDATE_LIMITS.depth)fail('delimiter depth bound');stack.push(pairs[token.text]);}else if([')',']','}'].includes(token.text)){if(stack.pop()!==token.text)fail('mismatched original delimiter');if(!stack.length)return at;}}
 fail('incomplete original delimiter group');
}
function moduleSnapshot(module){
 if(!module||typeof module!=='object'||types.isProxy(module))fail('non-proxy original module required');
 const source=ownData(module,'source'),file=ownData(module,'file'),path=copyMetadata(ownData(module,'path')),sourceView=ownData(module,'sourceView'),profile=copyMetadata(ownData(module,'compilationProfile'));
 if(typeof source!=='string'||Buffer.byteLength(source)>TRAIT_METHOD_CANDIDATE_LIMITS.sourceBytes||typeof file!=='string'||!Array.isArray(path)||path.some(name=>typeof name!=='string'))fail('bounded complete original module required');
 const carrier={source,file,path,sourceView,compilationProfile:profile},items=originalSourceModuleItems(carrier);
 return {carrier,items};
}
function current(state){
 const actual=moduleSnapshot(state.module);
 if(actual.carrier.sourceView!==state.carrier.sourceView||actual.carrier.source!==state.carrier.source||actual.carrier.file!==state.carrier.file||!isDeepStrictEqual(actual.carrier.path,state.carrier.path)||!isDeepStrictEqual(actual.carrier.compilationProfile,state.carrier.compilationProfile)||!actual.items.includes(state.item))fail('original module/view/path/profile/item association changed');
 return state;
}
function attributes(tokens,profile){
 const configuration=itemConfiguration(tokens,profile),obligations=[];
 for(const attribute of configuration.attributes){
  if(isAbsentConditionalAttribute(attribute))continue;
  // cfg changes availability, never adds a written member. Keep every branch;
  // all other attribute owners/transformations need an independent proof.
  if(attribute.name==='cfg'&&attribute.evaluation?.diagnostics.length===0)continue;
  obligations.push({kind:'attribute-owner-or-transformation',attribute});
 }
 for(const diagnostic of configuration.diagnostics)obligations.push({kind:'configuration-grammar',diagnostic});
 return {configuration,obligations};
}
function nestedProducers(tokens,source){
 const result=[];
 for(let at=0;at<tokens.length;at++){
  const token=tokens[at];
  if(token.type==='punct'&&token.text==='#'&&(tokens[at+1]?.text==='['||tokens[at+1]?.text==='!'&&tokens[at+2]?.text==='[')){
   const open=at+(tokens[at+1].text==='!'?2:1),last=endGroup(tokens,open);result.push({kind:'nested-attribute',span:{start:token.start,end:tokens[last].end},original:source.slice(token.start,tokens[last].end)});at=last;continue;
  }
  if(token.type!=='ident')continue;
  const fused=token.text.endsWith('!'),split=tokens[at+1]?.text==='!',group=at+(fused?1:2),macroRules=token.text==='macro_rules!'||token.text==='macro_rules'&&split;
  if(!fused&&!split)continue;
  let open=group;if(macroRules)open++;
  if(!Object.hasOwn(pairs,tokens[open]?.text))fail('opaque bang producer has an unproved boundary');
  const last=endGroup(tokens,open);let begin=at;while(begin>=2&&tokens[begin-1].text==='::'&&tokens[begin-2].type==='ident')begin-=2;result.push({kind:'nested-or-global-bang-output',span:{start:tokens[begin].start,end:tokens[last].end},original:source.slice(tokens[begin].start,tokens[last].end)});
  // Retain nested syntax as well; the outer producer does not close children.
 }
 return result;
}
function functionSignature(tokens,head,source){
 let at=tokens.findIndex(token=>token.end===head.nameSpan.end)+1;if(at<1)fail('original function name boundary required');
 if(tokens[at]?.text==='<'){
  let depth=0;
  for(;at<tokens.length;at++){
   const token=tokens[at];if(Object.hasOwn(pairs,token.text)){at=endGroup(tokens,at);continue;}
   if(token.text==='<')depth++;
   else if(['>','>>','>>>'].includes(token.text)){depth-=token.text.length;if(depth<0)fail('function generic closer crosses the original boundary');if(!depth){at++;break;}}
  }
  if(depth)fail('incomplete function generic prefix');
 }
 if(tokens[at]?.text!=='(')fail('actual function parameter group required');const close=endGroup(tokens,at),parameters=[];let start=at+1;
 let angles=0;
 for(let index=start;index<close;index++){const token=tokens[index];if(Object.hasOwn(pairs,token.text)){index=endGroup(tokens,index);continue;}if(token.text==='<')angles++;else if(['>','>>','>>>'].includes(token.text)){angles-=token.text.length;if(angles<0)fail('parameter generic closers differ');}if(token.text===','&&angles===0){parameters.push(tokens.slice(start,index));start=index+1;}}
 if(angles)fail('parameter generic arguments are incomplete');
 if(start<close)parameters.push(tokens.slice(start,close));
 const first=parameters[0]??[],words=first.map(token=>token.text);let receiver={kind:'associated-function',tokens:tokenData(first)};
 if(words[0]==='self'||words[0]==='mut'&&words[1]==='self')receiver={kind:words.includes(':')?'explicit-self-type':'value',tokens:tokenData(first)};
 else if(words[0]==='&'){
  let index=1;if(first[index]?.type==='char'&&/^'[A-Za-z_][A-Za-z0-9_]*$/u.test(words[index]))index++;
  const mutable=words[index]==='mut';if(mutable)index++;
  receiver={kind:words[index]==='self'&&index+1===words.length?(mutable?'mutable-reference':'shared-reference'):'unresolved',tokens:tokenData(first)};
 }
 let end=close+1,tailAngles=0;for(;end<tokens.length;end++){const token=tokens[end];if(token.text==='<')tailAngles++;else if(['>','>>','>>>'].includes(token.text)){tailAngles-=token.text.length;if(tailAngles<0)fail('signature generic closers differ');}if(token.text===';'&&!tailAngles||token.text==='{'&&!tailAngles)break;if(Object.hasOwn(pairs,token.text))end=endGroup(tokens,end);}
 if(tailAngles)fail('incomplete original signature type arguments');
 if(end===tokens.length)fail('complete original function signature required');
 const boundary=tokens[end],body=boundary.text==='{'?{span:{start:boundary.start,end:tokens.at(-1).end},original:source.slice(boundary.start,tokens.at(-1).end)}:null;
 return {receiver,parameters:parameters.map(tokenData),signature:{span:{start:tokens[0].start,end:boundary.start},original:source.slice(tokens[0].start,boundary.start),tokens:tokenData(tokens.slice(0,end))},body};
}
export function captureOriginalTraitMethodCandidates(input){
 if(!input||typeof input!=='object'||types.isProxy(input))fail('ordinary own-data options required');
 if(Reflect.ownKeys(input).length!==2||!Object.hasOwn(input,'module')||!Object.hasOwn(input,'item'))fail('only original module and item options are accepted');
 const module=ownData(input,'module'),item=ownData(input,'item'),snapshot=moduleSnapshot(module);
 if(!snapshot.items.includes(item))fail('exact original source-view item identity required');
 const head=originalDeclarationHeader(item,snapshot.carrier.path),tokens=significant(item.tokens);
 if(head?.kind!=='trait'||item.term!=='trait'||tokens.length>TRAIT_METHOD_CANDIDATE_LIMITS.tokens)fail('bounded original trait declaration required');
 const keyword=tokens.findIndex(token=>token.start===head.keywordSpan.start),open=tokens.findIndex((token,index)=>index>keyword&&token.text==='{');
 if(open<0||endGroup(tokens,open)!==tokens.length-1)fail('complete original trait body required; aliases remain unproved');
 const source=snapshot.carrier.source,documentation=new Map(),documentationRows=[];let pending=[];for(const token of rustTokens(source)){if(token.type==='comment'){if(token.text.startsWith('///')&&!token.text.startsWith('////')||token.text.startsWith('//!')||token.text.startsWith('/**')||token.text.startsWith('/*!')){const row={kind:'original-documentation-owner',span:{start:token.start,end:token.end},original:source.slice(token.start,token.end)};pending.push(row);documentationRows.push(row);}}else{if(pending.length)documentation.set(token.start,pending);pending=[];}}
 const bodySpan={start:tokens[open].end,end:tokens.at(-1).start},rows=originalImplMemberItems(source,bodySpan).filter(member=>!member.comment);
 if(rows.length>TRAIT_METHOD_CANDIDATE_LIMITS.members)fail('complete trait member bound');
 const outer=attributes(tokens,snapshot.carrier.compilationProfile),nameEnd=tokens.findIndex(token=>token.end===head.nameSpan.end)+1,headerTail=tokens.slice(nameEnd,open),obligations=[...outer.obligations,...(documentation.get(item.start)??[])],members=[];
 if(headerTail.length)obligations.push({kind:'generic-or-supertrait-header',tokens:tokenData(headerTail),original:source.slice(tokens[keyword+1].end,tokens[open].start)});
 for(const row of rows){
  const written=significant(row.tokens),memberHead=originalDeclarationHeader(row,snapshot.carrier.path),valid=memberHead&&['fn','const','type'].includes(memberHead.kind)&&memberHead.kind===row.term;
  if(!valid){const opaque={kind:'opaque-associated-output',span:{start:row.start,end:row.end},original:source.slice(row.start,row.end),tokens:tokenData(written)};members.push(opaque);obligations.push(opaque);continue;}
  const attribute=attributes(written,snapshot.carrier.compilationProfile),fn=memberHead.kind==='fn'?functionSignature(written,memberHead,source):null,producers=nestedProducers(written.filter(token=>token.start>=(attribute.configuration.attributes.at(-1)?.span.end??row.start)),source);
  const originalDocumentation=documentation.get(row.start)??[],nestedDocumentation=documentationRows.filter(doc=>doc.span.start>=row.start&&doc.span.end<=row.end);
  const value={kind:memberHead.kind,name:memberHead.name,namespace:memberHead.kind==='type'?'type':'value',span:{start:row.start,end:row.end},original:source.slice(row.start,row.end),tokens:tokenData(written),configuration:attribute.configuration,availabilitySelected:false,originalDocumentation,nestedDocumentation,...(fn??{}),nestedOrGlobalProducers:producers};members.push(value);
  obligations.push(...nestedDocumentation.map(obligation=>({...obligation,member:memberHead.name})),...originalDocumentation.map(obligation=>({...obligation,member:memberHead.name})),...attribute.obligations.map(obligation=>({...obligation,member:memberHead.name})),...producers.map(producer=>({...producer,member:memberHead.name})));
  if(fn?.receiver.kind==='unresolved'||fn?.receiver.kind==='explicit-self-type')obligations.push({kind:'receiver-type-or-adjustment',member:memberHead.name,receiver:fn.receiver});
 }
 const facts=freeze({schema:'original-trait-method-candidate-census-v1',source:{file:snapshot.carrier.file,modulePath:[...snapshot.carrier.path],sourceSha256:hash(source),sourceViewDigest:snapshot.carrier.sourceView.digest,compilationProfile:copyMetadata(snapshot.carrier.compilationProfile)},trait:{name:head.name,span:{start:item.start,end:item.end},original:source.slice(item.start,item.end),headerTokens:tokenData(tokens.slice(0,open)),configuration:outer.configuration,originalDocumentation:documentation.get(item.start)??[],bodySpan},members,obligations,sourceWrittenCensusComplete:members.every(member=>member.kind!=='opaque-associated-output'),compilerValidityProved:false,inheritedTraitClosureProved:false,availabilitySelected:false,callerNamespaceQualified:false,receiverApplicabilityProved:false,methodSelectionAuthority:false,namespaceAuthority:false,runtimeAuthority:false,copyAuthority:false,noDropAuthority:false});
 const candidate=Object.freeze({schema:'private-original-trait-method-candidates-v1'});states.set(candidate,{module,item,carrier:snapshot.carrier,facts});return candidate;
}
export function originalTraitMethodCandidateFacts(candidate){const state=states.get(candidate);if(!state)fail('copied or unissued candidate');return current(state).facts;}
export function originalTraitMethodCandidateSource(candidate){const state=states.get(candidate);if(!state)fail('copied or unissued candidate');current(state);return freeze({file:state.carrier.file,source:state.carrier.source,sha256:hash(state.carrier.source)});}
export function queryOriginalTraitMethodCandidates(candidate,name){
 const state=states.get(candidate);if(!state)fail('copied or unissued candidate');current(state);
 if(typeof name!=='string'||name.length>128||!isPlainSourceIdentifier(name))fail('bounded original method identifier required');
 const matching=state.facts.members.filter(member=>member.namespace==='value'&&member.name===name),facts=freeze({schema:'original-trait-method-member-query-v1',name,members:matching,sourceWrittenOwnValueMemberAbsent:state.facts.sourceWrittenCensusComplete&&matching.length===0,completeOwnTraitMemberAbsence:state.facts.sourceWrittenCensusComplete&&matching.length===0&&state.facts.obligations.length===0,obligations:state.facts.obligations,compilerValidityProved:false,inheritedTraitClosureProved:false,callerNamespaceQualified:false,receiverSearchOrderProved:false,methodSelectionAuthority:false,runtimeAuthority:false});
 const query=Object.freeze({schema:'private-original-trait-method-member-query-v1'});queries.set(query,{candidate,state,facts});return query;
}
export function originalTraitMethodQueryFacts(query){const record=queries.get(query);if(!record)fail('copied or unissued method query');current(record.state);return record.facts;}
export function proveOriginalTraitMethodAbsent(query){
 const record=queries.get(query);if(!record)fail('copied or unissued method query');current(record.state);if(!record.facts.completeOwnTraitMemberAbsence)fail('original member absence retains a written candidate or unresolved source obligation');
 const proof=Object.freeze({schema:'private-original-trait-member-absence-v1'});absences.set(proof,record);return proof;
}
export function originalTraitMethodAbsenceFacts(proof){const record=absences.get(proof);if(!record)fail('copied or unissued member absence');current(record.state);return record.facts;}
