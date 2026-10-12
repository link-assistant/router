// Genuine original source -> reconstructed continuation meta -> bounded
// candidate-call prefix. This does not execute Rust/compiler callbacks or
// resolve namespaces, traits, argument types, effects or caller resumptions.
import {createHash} from 'node:crypto';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {formatSourceStageInput,isPinnedFormatSourceStages} from './format-source-profiles.mjs';
import {compileFormatCompilerSourceMeta} from './format-source-meta.mjs';
import {compileFormatCallbackDataflow} from './format-builtin-dataflow.mjs';
import {compileBuiltinSourceControl} from './builtin-source-control.mjs';
import {compileBuiltinControlContinuations,builtinControlContinuationFacts,projectBuiltinControlContinuations} from './builtin-source-continuations.mjs';
const collections=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const limits={compilerHandlerOwnerResolved:false,sourceSemanticClosureVerified:false,typedCompilerIRChecked:false,rustGrammarValidated:false,executable:false,traitSelectionVerified:false,allocatorEffectsVerified:false,ioEffectsVerified:false,namespaceAuthority:false,runtimeParity:false};
const word=token=>token.text;
function owner(dataflow) {
  const item=dataflow.enclosingOriginalItem,opening=item.tokens.findIndex(token=>token.text==='{'),header=opening<0?item.tokens:item.tokens.slice(0,opening);
  return {term:item.term,name:item.name??null,span:item.span,sha256:item.sha256,originalHeader:header,hasOriginalAttributes:header.some(token=>word(token)==='#'),traitImplementation:item.term==='impl'&&header.some(token=>word(token)==='for'),namespaceResolved:false,conditionResolved:false};
}
// The actual unique function is selected by complete pinned source membership.
// Names are not registrations and candidates never certify a callable owner.
export function captureBuiltinSourceCallFrames(proof,sourcePath) {
  if(!isPinnedFormatSourceStages(proof))throw new TypeError('Source frames require private pinned original inputs');
  const pin=formatSourceStageInput(proof,sourcePath),meta=compileFormatCompilerSourceMeta(proof,sourcePath),rows=[],programs=new Map(),counts=new Map();
  for(const fn of meta.functions)counts.set(fn.name,(counts.get(fn.name)??0)+1);
  for(const fn of meta.functions){
    const original={name:fn.name,span:fn.span,sha256:fn.sha256,bodySpan:fn.bodySpan,bodySha256:fn.bodySha256,signatureTokens:fn.signatureTokens};
    if(counts.get(fn.name)!==1){rows.push({...original,sourceCandidateAmbiguous:true,projectable:false,diagnostic:'Actual original function name has multiple source definitions'});continue;}
    const dataflow=compileFormatCallbackDataflow(proof,sourcePath,fn.name),control=compileBuiltinSourceControl(dataflow),scope=owner(dataflow);let program=null,diagnostic=null;
    if(control.controlSyntaxProjected)try{program=compileBuiltinControlContinuations(control);}catch(error){if(!(error instanceof TypeError))throw error;diagnostic=error.message;}
    else diagnostic=control.diagnostics[0]?.reason??'Original control syntax remains unsupported';
    rows.push({...original,owner:scope,sourceCandidateAmbiguous:false,projectable:!!program,diagnostic,originalControlDiagnostics:control.diagnostics});
    if(program)programs.set(fn.name,{program,owner:scope,original});
  }
  const payload={schema:'original-source-candidate-call-frames-v1',sourcePath,sourceSha256:pin.sourceSha256,sourceBytes:pin.sourceBytes,functions:rows,originalWholeSourceRetained:true,privateSourceAssociationVerified:true,...limits},text=JSON.stringify(copyMetadata(payload)),reparsed=JSON.parse(text);
  if(metadataDigest(payload)!==metadataDigest(reparsed))throw new TypeError('Original source call-frame reconstruction changed');
  const result=freezeMacroTree({...reparsed,privateMetaRoundtrip:true,metaSha256:hash(text)});collections.set(result,Object.freeze({proof,pin,programs,digest:metadataDigest(result)}));return result;
}
function facts(frames) {
  const state=collections.get(frames);if(!state)throw new TypeError('Source call frames are copied, fabricated or differently issued');
  if(metadataDigest(frames)!==state.digest)throw new TypeError('Original source call-frame snapshot changed');
  formatSourceStageInput(state.proof,frames.sourcePath);return state;
}
const sameOwner=(left,right)=>left.term===right.term&&left.sha256===right.sha256&&metadataDigest(left.span)===metadataDigest(right.span);
function candidate(state,current,projection) {
  const result=projection.result;if(result.status!=='frontier'||result.obligation!=='original-callee-owner-and-effects')return {obligation:'original-control-or-callee-return-rule'};
  const node=current.program.nodes[result.node],callee=current.program.nodes[node?.callee];
  if(node?.kind!=='call')throw new TypeError('Private source projection lost its original call node');
  const address=result.callee;let name,scopeKind;
  if(address.kind==='written-source-callee'&&address.path.length===1&&callee.kind==='written-path'&&callee.path.length===1&&current.owner.term==='fn'){
    name=address.path[0];scopeKind='same-pinned-module-function-candidate';
  }else if(address.kind==='source-member-callee'&&callee.kind==='field'&&current.owner.term==='impl'&&!current.owner.traitImplementation){
    const receiver=current.program.nodes[callee.object];
    if(receiver?.kind!=='written-path'||receiver.path.length!==1||receiver.path[0]!=='self')return {obligation:'actual-source-receiver-and-method-selection'};
    name=address.name;scopeKind='same-exact-original-impl-member-candidate';
  }else return {obligation:address.kind==='source-local-callee'?'original-lexical-callee-shadow':'original-imported-or-qualified-callee-owner'};
  const target=state.programs.get(name);
  if(!target)return {obligation:'original-callee-unavailable-ambiguous-or-unsupported',name};
  if(current.owner.hasOriginalAttributes||target.owner.hasOriginalAttributes)return {obligation:'original-call-frame-attribute-and-condition-owner',name};
  if(scopeKind==='same-pinned-module-function-candidate'&&target.owner.term!=='fn'||scopeKind==='same-exact-original-impl-member-candidate'&&!sameOwner(current.owner,target.owner))return {obligation:'actual-original-callee-module-or-impl-identity',name};
  const inputs=scopeKind==='same-exact-original-impl-member-candidate'?[address.receiver,...result.arguments]:result.arguments;
  if(inputs.length!==target.program.parameters.length)return {obligation:'actual-original-callee-parameter-shape',name};
  return {target,inputs,scopeKind,sourceCallSpan:result.sourceSpan};
}
// This is a CONDITIONAL symbolic prefix, not a Rust invocation: source
// candidates are staged to reveal their next precise implementation frontier.
// A completed callee cannot bypass the pending caller's control/try/return
// continuation. No callback registry, source scopes or authority flags exist.
export function projectBuiltinSourceCallFrames(frames,functionName,inputs,options={}) {
  const state=facts(frames),settings=copyMetadata(options);
  if(Object.keys(settings).some(key=>key!=='maxFrames'))throw new TypeError('Source call-frame projection accepts only its finite frame bound');
  const maxFrames=settings.maxFrames??16;
  if(!Number.isSafeInteger(maxFrames)||maxFrames<1||maxFrames>32)throw new RangeError('Source candidate frame bound must be between 1 and 32');
  if(typeof functionName!=='string')throw new TypeError('Source function selection requires its actual name');
  const selected=frames.functions.filter(row=>row.name===functionName);
  if(selected.length!==1||!state.programs.has(functionName))throw new TypeError('Actual selected source function is ambiguous or unsupported');
  let current=state.programs.get(functionName),arguments_=copyMetadata(inputs);const trace=[],seen=new Set();let terminal;
  for(let index=0;index<maxFrames;index++){
    builtinControlContinuationFacts(current.program);
    const key=current.original.span.start+':'+metadataDigest(arguments_);
    if(seen.has(key)){terminal={obligation:'recursive-original-callee-owner-and-termination',function:current.original.name};break;}seen.add(key);
    const projection=projectBuiltinControlContinuations(current.program,arguments_);
    // The continuation has already validated these inert operands and their
    // JSON round trip. Expose the same ordinary metadata snapshot in each frame.
    trace.push({function:current.original,owner:current.owner,arguments:JSON.parse(JSON.stringify(arguments_)),projection});
    const next=candidate(state,current,projection);
    if(!next.target){terminal={...next,sourceFunction:current.original,sourceProjection:projection.result};break;}
    trace.at(-1).candidateCall={scopeKind:next.scopeKind,target:next.target.original,sourceCallSpan:next.sourceCallSpan,actualRustOwnerResolved:false,argumentTypesChecked:false,returnContinuationResumed:false};
    if(index+1===maxFrames){terminal={obligation:'original-source-candidate-frame-budget',nextSourceFunction:next.target.original};break;}
    current=next.target;arguments_=copyMetadata(next.inputs);
  }
  return freezeMacroTree({schema:'original-source-candidate-call-prefix-v1',sourcePath:frames.sourcePath,sourceSha256:frames.sourceSha256,frames:trace,terminal,conditionalSourceProjection:true,pendingCallerContinuations:trace.length>1,originalFunctionBodiesRetained:true,callbackInvocations:0,...limits});
}
