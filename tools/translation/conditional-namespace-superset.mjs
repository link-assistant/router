// Complete original source candidates before caller ownership or cfg selection.
// Every unresolved producer remains an alternative beside any builtin recipe.
import {types,isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {copyMetadata,ownData} from './extensions/source-links.mjs';
import {originalSourceModuleItems,isSourceModuleView} from './source-module-views.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {rustTokens} from './rust-structure.mjs';
import {captureOriginalNamespaceFunction,originalNamespaceFunctionMembers,originalNamespaceFunctionFacts,originalNamespaceFunctionInvocationPosition,originalNamespacePositionFacts} from './original-namespace-parser.mjs';
import {inspectConditionalAttribute} from './conditional-attributes.mjs';
import {evaluateConfiguration} from './cfg-profile.mjs';
import {isDeriveDependencyProof} from './derive-dependencies.mjs';
import {captureOriginalBuiltinNamespaceCandidate,originalBuiltinNamespaceCandidateFacts} from './builtin-derive-namespace-candidates.mjs';
const states=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original conditional namespace superset: '+message);};
const pairs={'(':')','[':']','{':'}'};
export const CONDITIONAL_NAMESPACE_SUPERSET_LIMITS=Object.freeze({sourceBytes:256000,tokens:32000,attributes:4096,bangs:4096,declarations:4096,depth:64,deriveInvocations:1024});
const tokenData=token=>({text:token.text,type:token.type,start:token.start,end:token.end});
const range=tokens=>({start:tokens[0].start,end:tokens.at(-1).end});
function endOf(tokens,start){
 const stack=[pairs[tokens[start]?.text]];if(!stack[0])fail('original delimiter group required');
 for(let at=start+1;at<tokens.length;at++){
  const token=tokens[at];if(token.type!=='punct')continue;
  if(Object.hasOwn(pairs,token.text)){if(stack.length>=CONDITIONAL_NAMESPACE_SUPERSET_LIMITS.depth)fail('delimiter depth bound');stack.push(pairs[token.text]);}
  else if([')',']','}'].includes(token.text)){if(stack.pop()!==token.text)fail('mismatched original delimiter');if(!stack.length)return at;}
 }
 fail('incomplete original delimiter');
}
function input(options){
 if(!options||typeof options!=='object'||types.isProxy(options)||Reflect.ownKeys(options).length!==2||!Object.hasOwn(options,'module')||!Object.hasOwn(options,'dependencies'))fail('only own original module and dependencies options required');
 const module=ownData(options,'module'),dependencies=ownData(options,'dependencies');
 if(!module||typeof module!=='object'||types.isProxy(module)||!isDeriveDependencyProof(dependencies))fail('genuine dependencies and non-proxy original module required');
 const source=ownData(module,'source'),file=ownData(module,'file'),sourceView=ownData(module,'sourceView');
 const path=copyMetadata(ownData(module,'path')),compilationProfile=copyMetadata(ownData(module,'compilationProfile'));
 if(typeof source!=='string'||Buffer.byteLength(source)>CONDITIONAL_NAMESPACE_SUPERSET_LIMITS.sourceBytes||typeof file!=='string'||!isSourceModuleView(sourceView)||!Array.isArray(path)||path.some(part=>typeof part!=='string'))fail('bounded complete private original source view required');
 const carrier={source,file,path,sourceView,compilationProfile},items=originalSourceModuleItems(carrier);
 if(items.length>CONDITIONAL_NAMESPACE_SUPERSET_LIMITS.declarations)fail('original declaration bound');
 return {module,dependencies,carrier,items};
}
function current(state,options){
 const actual=input(options),prior=state.input;
 if(actual.dependencies!==prior.dependencies||actual.carrier.sourceView!==prior.carrier.sourceView||actual.carrier.source!==prior.carrier.source||actual.carrier.file!==prior.carrier.file||!isDeepStrictEqual(actual.carrier.path,prior.carrier.path)||!isDeepStrictEqual(actual.carrier.compilationProfile,prior.carrier.compilationProfile)||actual.items!==prior.items)fail('original source/view/path/profile/dependency association changed');
 for(const join of state.positionJoins){originalNamespaceFunctionFacts(join.token,join.options);for(const proof of join.proofs)originalNamespacePositionFacts(proof,join.token,join.options);}
 return state;
}
function alternatives(body,profile,source,depth=0){
 if(depth>CONDITIONAL_NAMESPACE_SUPERSET_LIMITS.depth)fail('conditional attribute nesting bound');
 const span=range(body),written={span,original:source.slice(span.start,span.end),tokens:body.map(tokenData),ownerResolved:false};
 if(body[0]?.text!=='cfg_attr')return {...written,kind:'written-attribute',name:body[0]?.text??null};
 // Use the complete actual token interval, never rendered/reparsed fragments.
 // Predicate evaluation is retained as evidence; neither alternative is erased.
 try{
  const inspected=inspectConditionalAttribute(body),predicate=evaluateConfiguration(inspected.predicate,profile);
  return {...written,kind:'conditional-attribute',predicate:{tokens:inspected.predicate.map(tokenData),evaluation:predicate},availabilitySelected:false,
   alternatives:[{kind:'absent'},...inspected.attributes.map(attribute=>{
    const original=body.filter(token=>token.start>=attribute.span.start&&token.end<=attribute.span.end);
    if(!original.length||original[0].start!==attribute.span.start||original.at(-1).end!==attribute.span.end)fail('conditional attribute original token interval differs');
    return {kind:'present',attribute:alternatives(original,profile,source,depth+1)};
   })]};
 }catch(error){if(!(error instanceof TypeError))throw error;return {...written,kind:'unparsed-conditional-attribute',name:'cfg_attr',error:{name:error.name,message:error.message},allOutputObligationsPending:true};}
}
function lexical(state){
 const {source,sourceView,compilationProfile}=state.carrier,span=sourceView.bodySpan;
 const full=rustTokens(source),tokens=full.filter(token=>token.type!=='comment'&&token.start>=span.start&&token.end<=span.end);
 if(tokens.length>CONDITIONAL_NAMESPACE_SUPERSET_LIMITS.tokens)fail('complete module token bound');
 const attributes=[],bangs=[],documentation=[];
 for(const token of full)if(token.start>=span.start&&token.end<=span.end&&token.type==='comment'&&(token.text.startsWith('///')&&!token.text.startsWith('////')||token.text.startsWith('//!')||token.text.startsWith('/**')||token.text.startsWith('/*!')))documentation.push({kind:'original-documentation-attribute-owner',span:{start:token.start,end:token.end},original:token.text,ownerResolved:false});
 for(let at=0;at<tokens.length;at++){
  const token=tokens[at];
  if(token.type==='punct'&&token.text==='#'&&(tokens[at+1]?.text==='['||tokens[at+1]?.text==='!'&&tokens[at+2]?.text==='[')){
   const open=at+(tokens[at+1]?.text==='!'?2:1);
   if(tokens[open]?.text!=='[')fail('unproved original attribute boundary');
   const last=endOf(tokens,open),body=tokens.slice(open+1,last);if(!body.length)fail('empty original attribute');
   attributes.push({span:{start:token.start,end:tokens[last].end},style:open===at+2?'inner':'outer',original:source.slice(token.start,tokens[last].end),attribute:alternatives(body,compilationProfile,source),ownerResolved:false});
   // Do not skip the group: bangs and attributes in every nested meta payload
   // are independent pending producers, even if the outer word looks builtin.
  }
  if(token.type!=='ident')continue;
  const fused=token.text.endsWith('!'),separate=tokens[at+1]?.text==='!';if(!fused&&!separate)continue;
  let open=at+(fused?1:2);const definition=token.text.replace(/!$/u,'')==='macro_rules';if(definition)open++;
  if(!Object.hasOwn(pairs,tokens[open]?.text))fail('opaque bang boundary required');
  const last=endOf(tokens,open);let begin=at;while(begin>=2&&tokens[begin-1].text==='::'&&tokens[begin-2].type==='ident')begin-=2;
  bangs.push({kind:definition?'written-declarative-definition':'unresolved-bang-output',span:{start:tokens[begin].start,end:tokens[last].end},original:source.slice(tokens[begin].start,tokens[last].end),tokens:tokens.slice(begin,last+1).map(tokenData),ownerResolved:false,parsedExpansionPosition:false,
   dimensions:{enclosingAttributeEffect:'pending-authentic-position',globalBangEffect:'unresolved',runtimeEffect:'unresolved'}});
 }
 if(attributes.length>CONDITIONAL_NAMESPACE_SUPERSET_LIMITS.attributes||bangs.length>CONDITIONAL_NAMESPACE_SUPERSET_LIMITS.bangs)fail('complete producer bound');
 return {attributes,bangs,documentation,tokens:tokens.map(tokenData)};
}
function derivePaths(body){
 if(body[0]?.text!=='derive'||body[1]?.text!=='('||endOf(body,1)!==body.length-1)return null;
 const result=[];let path=[],name=true;
 for(const token of body.slice(2,-1)){
  if(name){if(token.type!=='ident'||!/^[\p{XID_Start}_][\p{XID_Continue}_]*$/u.test(token.text))return null;path.push(token.text);name=false;}
  else if(token.text==='::')name=true;
  else if(token.text===','){result.push(path);path=[];name=true;}
  else return null;
 }
 if(path.length){if(name)return null;result.push(path);}return result.length?result:null;
}
function declarations(state,syntax){
 const result=[],outputs=[];let invocationCount=0;
 for(const item of state.items){
  let header=null,error=null,imports=[];try{header=originalDeclarationHeader(item,state.carrier.path);if(item.term==='use')imports=originalUseDeclarationLeaves(item,state.carrier.path);}catch(cause){if(!(cause instanceof Error))throw cause;error={name:cause.name,message:cause.message};}
  const written=item.tokens.filter(token=>token.type!=='comment'),attributes=syntax.attributes.filter(attribute=>attribute.span.start>=item.start&&attribute.span.end<=item.end),span={start:item.start,end:item.end};
  result.push({span,original:state.carrier.source.slice(span.start,span.end),term:item.term,header,imports,error,originalItemIdentityPrivatelyRetained:true,configurationSelected:false,attributes:attributes.map(attribute=>attribute.span),namespaceResolved:false});
  // Only direct original container attributes enter the builtin syntax issuer.
  // Every invocation still retains a custom/ambiguous-owner alternative.
  let at=0,index=0;
  while(written[at]?.text==='#'&&written[at+1]?.text==='['){
   const last=endOf(written,at+1),body=written.slice(at+2,last),paths=derivePaths(body);
   if(paths)for(const path of paths){
    if(++invocationCount>CONDITIONAL_NAMESPACE_SUPERSET_LIMITS.deriveInvocations)fail('complete derive invocation bound');
    const alternatives=[{kind:'unresolved-custom-or-ambiguous-owner',path,outputDimensions:'unresolved'}];
    try{
     const input={dependencies:state.dependencies,module:state.carrier,item,invocationIndex:index},token=captureOriginalBuiltinNamespaceCandidate(input),facts=originalBuiltinNamespaceCandidateFacts(token,input);
     alternatives.push({kind:'registered-builtin-source-syntax-candidate',token,facts});
    }catch(cause){if(!(cause instanceof TypeError))throw cause;alternatives.push({kind:'builtin-source-candidate-refused',error:{name:cause.name,message:cause.message}});}
    outputs.push({itemSpan:span,attributeSpan:{start:written[at].start,end:written[last].end},invocationIndex:index++,path,alternatives,ownerResolved:false});
   }
   at=last+1;
  }
 }
 return {declarations:result,outputs};
}
function parsedPositions(state,syntax){
 const frames=[],positions=[],joins=[];
 function capture(item,memberIndex){
  const options={module:state.carrier,item,memberIndex};
  try{
   const token=captureOriginalNamespaceFunction(options),facts=originalNamespaceFunctionFacts(token,options);frames.push({token,facts});const proofs=[];joins.push({token,options,proofs});
   for(let index=0;index<facts.opaqueInvocations.length;index++){
    const proof=originalNamespaceFunctionInvocationPosition(token,options,index),position=originalNamespacePositionFacts(proof,token,options);positions.push({proof,frame:token,index,facts:position});proofs.push(proof);
   }
  }catch(error){if(!(error instanceof TypeError))throw error;frames.push({itemSpan:{start:item.start,end:item.end},memberIndex,refusal:{name:error.name,message:error.message},sourcePositionUnproved:true});}
 }
 for(const item of state.items){
  let header;try{header=originalDeclarationHeader(item,state.carrier.path);}catch(error){if(!(error instanceof Error))throw error;frames.push({itemSpan:{start:item.start,end:item.end},refusal:{name:error.name,message:error.message},sourcePositionUnproved:true});continue;}
  if(header?.kind==='fn')capture(item,null);
  else if(['trait','impl'].includes(header?.kind)){
   let members;try{members=originalNamespaceFunctionMembers({module:state.carrier,item});}catch(error){if(!(error instanceof TypeError))throw error;frames.push({itemSpan:{start:item.start,end:item.end},refusal:{name:error.name,message:error.message},sourcePositionUnproved:true});continue;}
   for(const member of members)if(member.kind==='fn')capture(item,member.memberIndex);
  }
 }
 const bangs=syntax.bangs.map(bang=>{
  if(bang.kind!=='unresolved-bang-output')return bang;
  const matching=positions.filter(position=>position.facts.invocation.span.start===bang.span.start&&position.facts.invocation.span.end===bang.span.end);
  if(matching.length!==1)return bang;
  const position=matching[0];return {...bang,parsedExpansionPosition:true,originalPosition:position,
   dimensions:{...bang.dimensions,enclosingAttributeEffect:'ordinary-bindings-block-local; global-generated-macro-kind-pending',globalAttributeEffect:'unresolved-generated-export-kind-and-original-attribute-transformations',ordinaryGeneratedImportsAndProcStubsRemainBlockLocal:true}};
 });
 return {frames,bangs,joins};
}
export function captureOriginalNamespaceSourceSuperset(options){
 const selected=input(options),syntax=lexical(selected),written=declarations(selected,syntax),positions=parsedPositions(selected,syntax),token=Object.freeze({schema:'private-original-namespace-source-superset-v1'});
 const facts=freeze({schema:'original-namespace-source-superset-v1',source:{file:selected.carrier.file,path:selected.carrier.path,sourceSha256:hash(selected.carrier.source),sourceViewDigest:selected.carrier.sourceView.digest,bodySpan:selected.carrier.sourceView.bodySpan,compilationProfile:selected.carrier.compilationProfile},...syntax,...written,bangs:positions.bangs,originalFunctionFrames:positions.frames,
  originalTokenCensusComplete:true,allWrittenAlternativesRetained:true,allConditionalAlternativesRetained:true,wholePackageComplete:false,callerScopeComplete:false,attributeOwnersResolved:false,namespaceAuthority:false,runtimeAuthority:false,
  obligations:['exact genuine complete package/module/profile/edition origin','private original parser expansion-position association for dimension-specific output effects','actual builtin doc AND lint namespace noncompetition','complete fresh190 output reissue for every selected original derive','unknown custom and generated source alternatives remain pending']});
 const state={input:selected,facts,positionJoins:positions.joins};current(state,options);states.set(token,state);return token;
}
export function originalNamespaceSourceSupersetFacts(token,options){const state=states.get(token);if(!state)fail('copied or unissued source superset');return current(state,options).facts;}
