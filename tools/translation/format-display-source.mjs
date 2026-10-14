// Original nominal Display specialization for the source default-spec route.
// Caller namespace/coherence and standard helper control are independent of
// parser receipts. This grants no general Formatter, Write, allocator or ABI.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {extractImplDeclarations} from './impl-resolver.mjs';
import {nominalTypeIdentities,resolveNominalImplTarget} from './project-nominal.mjs';
import {originalNestedImplementationObligations} from './nested-implementation-obligations.mjs';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {loadPinnedFormatSourceStages,formatSourceStageInput} from './format-source-profiles.mjs';
import {loadFormatRegisteredInputs,formatRegisteredInputSource} from './format-registered-inputs.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from './declarative-token-macros.mjs';
import {originalMacroTrees,originalTopLevelMacroInvocations,originalMacroTreeText,freezeMacroTree} from './macro-token-trees.mjs';
import {compileFormatSourceControlBodies,formatSourceControlBodyFacts,executeFormatSourceControlBodies,evaluateFormatSourceScalarExpression} from './source-format-template.mjs';
import {originalMethodSemanticFacts} from './source-method-admission.mjs';
import {originalMethodTransformFacts} from './source-method-transforms.mjs';
import {captureOriginalFmtTypeNamespace,resolveOriginalFmtTypePath,resolveOriginalDisplaySignature,proveOriginalDisjointDisplayTrait} from './format-type-namespace.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),fail=message=>{throw new TypeError('original Display source: '+message);};
const syntax=source=>rustTokens(source).filter(token=>token.type!=='comment').map(token=>token.text).join('');
const scopes=new WeakMap(),closures=new WeakMap();let standard;
const root=new URL('./source-profiles/source-format-display/',import.meta.url);
function body(source,item,offset=0){const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{'),last=tokens.at(-1);if(open<0||last.text!=='}')fail('complete original body required');return {text:source.slice(offset+tokens[open].end,offset+last.start),start:offset+tokens[open].end,end:offset+last.start};}
function method(source,header,name){
 const selected=[];
 for(const owner of sourceItems(source).filter(item=>item.term==='impl')){
  const tokens=owner.tokens.filter(token=>token.type!=='comment'),at=tokens.findIndex(token=>token.text==='impl'),open=tokens.findIndex((token,index)=>index>at&&token.text==='{');
  if(tokens.slice(at,open).map(token=>token.text).join('')!==header)continue;
  const frame=body(source,owner);for(const member of sourceItems(frame.text).filter(item=>item.term==='fn'&&item.name===name))selected.push({source:source.slice(frame.start+member.start,frame.start+member.end),span:{start:frame.start+member.start,end:frame.start+member.end},ownerSpan:{start:owner.start,end:owner.end},signature:member.tokens.filter(token=>token.type!=='comment').slice(0,member.tokens.findIndex(token=>token.text==='{')).map(token=>token.text)});
 }
 if(selected.length!==1)fail('one complete original helper owner required: '+header+'::'+name);return selected[0];
}
function allocString(){
 const bytes=readFileSync(new URL('manifest.json',root));if(hash(bytes)!=='c76d57be4642dd119a39e23975fce3cb60737ed1014b64eef1fac90ced40e29e')fail('original String profile changed');
 const profile=JSON.parse(bytes),rows=profile.members.filter(row=>row.path==='library/alloc/src/string.rs');if(rows.length!==1)fail('String full source absent');const row=rows[0],packed=readFileSync(new URL(row.archive,root));if(packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('original String archive changed');const raw=gunzipSync(packed,{maxOutputLength:200000});if(raw.length!==row.bytes||hash(raw)!==row.sha256)fail('original String full source changed');return {path:row.path,sha256:row.sha256,source:new TextDecoder('utf-8',{fatal:true}).decode(raw)};
}
function selectedStandard(){
 if(standard)return standard;
 const proof=loadPinnedFormatSourceStages(),inputs=loadFormatRegisteredInputs(proof),fmt=formatSourceStageInput(proof,'library/core/src/fmt/mod.rs'),allocFmt=formatSourceStageInput(proof,'library/alloc/src/fmt.rs'),std=formatRegisteredInputSource(inputs,proof,'library/std/src/lib.rs'),alloc=formatRegisteredInputSource(inputs,proof,'library/alloc/src/lib.rs'),string=allocString();
 const uses=(source,text)=>sourceItems(source).filter(item=>item.term==='use').filter(item=>{const tokens=item.tokens.filter(token=>token.type!=='comment'),at=tokens.findIndex(token=>token.text==='use');return tokens.slice(at-1).map(token=>token.text).join('')===syntax(text);});
 if(uses(std.source,'pub use alloc_crate::fmt;').length!==1||uses(allocFmt.source,'pub use core::fmt::{Debug, Display};').length!==1||uses(allocFmt.source,'pub use core::fmt::{Formatter, Result, Write};').length!==1)fail('actual std/alloc/core fmt reexport differs');
 const modules=sourceItems(alloc.source).filter(item=>item.term==='mod'&&item.name==='fmt');if(modules.length!==1||!syntax(alloc.source.slice(modules[0].start,modules[0].end)).endsWith('pubmodfmt;'))fail('actual public alloc fmt module absent');
 const traits=sourceItems(fmt.source).filter(item=>item.term==='trait'&&item.name==='Display');if(traits.length!==1)fail('original core Display trait absent');const traitFrame=body(fmt.source,traits[0]),fmtMembers=sourceItems(traitFrame.text).filter(item=>item.term==='fn'&&item.name==='fmt'),traitMethod=fmtMembers[0]?.tokens.filter(token=>token.type!=='comment');if(fmtMembers.length!==1||traitMethod.slice(traitMethod.findIndex(token=>token.text==='fn')).map(token=>token.text).join('')!==syntax("fn fmt(&self, f: &mut Formatter<'_>) -> Result;"))fail('original Display associated method schema differs');
 const helpers={optionsNew:method(fmt.source,'implFormattingOptions','new'),formatterNew:method(fmt.source,"impl<'a>Formatter<'a>",'new'),formatterPad:method(fmt.source,"impl<'a>Formatter<'a>",'pad'),formatterWrite:method(fmt.source,"impl<'a>Formatter<'a>",'write_str'),strDisplay:method(fmt.source,'implDisplayforstr','fmt'),stringWrite:method(string.source,'implfmt::WriteforString','write_str'),stringPush:method(string.source,'implString','push_str')};
 const constants=new Map(),constantSources=[];const flags=sourceItems(fmt.source).filter(item=>item.term==='mod'&&item.name==='flags');if(flags.length!==1)fail('original formatter flag owner absent');const flagFrame=body(fmt.source,flags[0]);
 for(const name of ['WIDTH_FLAG','PRECISION_FLAG','ALIGN_UNKNOWN','ALWAYS_SET']){
  const rows=sourceItems(flagFrame.text).filter(item=>item.term==='const'&&item.name===name);if(rows.length!==1)fail('original formatter constant absent');const row=rows[0],tokens=row.tokens.filter(token=>token.type!=='comment'),equal=tokens.findIndex(token=>token.text==='='),last=tokens.at(-1);if(equal<0||last.text!==';'||tokens[equal-1].text!=='u32')fail('original u32 formatter flag schema');const original=flagFrame.text.slice(tokens[equal].end,last.start),evaluated=evaluateFormatSourceScalarExpression(original);constants.set('flags::'+name,evaluated.result);constantSources.push({name,sourceSpan:{start:flagFrame.start+row.start,end:flagFrame.start+row.end},original:flagFrame.text.slice(row.start,row.end),...evaluated});
 }
 const top=sourceItems(fmt.source),definitions=top.filter(item=>item.term==='macro_rules!'&&item.name==='fmt_refs'),invocations=top.filter(item=>item.term==='opaque'&&item.tokens[0]?.text==='fmt_refs!');if(definitions.length!==1||invocations.length!==1)fail('one original top-level reference macro definition/invocation required');
 const definitionSource=fmt.source.slice(definitions[0].start,definitions[0].end),invocationSource=fmt.source.slice(invocations[0].start,invocations[0].end),definition=compileDeclarativeMacro(definitionSource,{name:'fmt_refs',owner:['core','fmt']}),calls=originalTopLevelMacroInvocations(invocationSource).filter(call=>same(call.path,['fmt_refs']));if(calls.length!==1)fail('original reference Display macro invocation absent');const expansion=expandDeclarativeMacro(definition,calls[0].trees),expanded=expansion.trees.map(originalMacroTreeText).join(' '),referenceDisplay=method(expanded,'impl<T:PointeeSized+Display>Displayfor&T','fmt');helpers.referenceDisplay=referenceDisplay;
 const sources=Object.fromEntries(Object.entries(helpers).map(([name,row])=>[name,row.source])),program=compileFormatSourceControlBodies(sources),metadata=freezeMacroTree({schema:'original-default-spec-display-standard-source-v1',coreFormatSource:fmt,stdReexport:{sourcePath:std.path,sha256:std.sha256,original:uses(std.source,'pub use alloc_crate::fmt;')[0]},allocFormatSource:allocFmt,allocStringSource:string,trait:{original:fmt.source.slice(traits[0].start,traits[0].end),span:{start:traits[0].start,end:traits[0].end}},helpers,constantSources,referenceDisplay:{definition,invocation:calls[0],expansion},program,namespaceAuthority:false,allocatorEffectsVerified:false,runtimeParity:false});
 standard={metadata,program,constants,helpers};return standard;
}
export function sourceDisplayStandardCandidate(){return selectedStandard().metadata;}
function standardRoot(scopes,module){
 const ancestors=scopes.filter(scope=>scope.path.every((name,index)=>module.path[index]===name));
 if(!ancestors.length||ancestors.some(scope=>scope.configurationCondition!=='active'||scope.unresolvedAttributeMacroScope!==false))fail('original active trait/attribute scope remains unresolved');
 if(ancestors.some(scope=>scope.bindings.some(binding=>binding.namespace==='type'&&['std','core'].includes(binding.name))))fail('standard fmt root is shadowed/imported');
 const tokens=rustTokens(module.source).filter(token=>token.type!=='comment');if(tokens.some(token=>['no_core','no_implicit_prelude'].includes(token.text)))fail('implicit standard namespace disabled');
}
export function captureSourceDisplayScope(parser,callSpan,captureNames){
 const state=matchesParserFacts(parser),scope=state.facts.evidence.scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(state.module));if(!scope||!callSpan||!Number.isSafeInteger(callSpan.start)||!Number.isSafeInteger(callSpan.end)||callSpan.start<0||callSpan.end>state.sourceLength)fail('original formatter caller frame absent');
 // This initial route retains frames for actual named nominal parameters.
 // Primitive-only format calls need no nominal trait lookup or frame cache.
 const callOriginalRange={start:state.offset+callSpan.start,end:state.offset+callSpan.end},owners=originalSourceModuleItems(state.module).filter(item=>item.term==='fn'&&item.start<=callOriginalRange.start&&item.end>=callOriginalRange.end);if(owners.length!==1||!Array.isArray(captureNames))fail('original nominal formatting parameter owner absent');
 const owner=owners[0],trees=originalMacroTrees(state.module.source.slice(owner.start,owner.end)),fn=trees.findIndex(node=>node.text==='fn'),group=trees.slice(fn+2).find(node=>node.delimiter==='(');if(!group)fail('original formatting signature absent');
 const originalParameters=[];let at=0;for(let end=0;end<=group.children.length;end++)if(end===group.children.length||group.children[end].text===','){
  const parameter=group.children.slice(at,end),name=parameter[0]?.text,type=parameter.slice(2);at=end+1;
  if(!captureNames.includes(name)||parameter[1]?.text!==':'||!type.length||type.some((node,index)=>node.kind!=='token'||(index%2===0?node.type!=='ident':node.text!=='::')))continue;
  if(['str','bool','String',...['i','u'].flatMap(prefix=>[8,16,32,64,128].map(bits=>prefix+bits))].includes(type[0].text))continue;
  originalParameters.push({name,typePath:type.filter(node=>node.text!=='::').map(node=>node.text),originalTokens:parameter.map(node=>({kind:node.kind,type:node.type,text:node.text,sourceSha256:node.sourceSha256,originalRange:{start:owner.start+node.span.start,end:owner.start+node.span.end}})),ownerRange:{start:owner.start,end:owner.end}});
 }
 if(!originalParameters.length)fail('captured original nominal parameter route absent');
 const originalContext={certificate:state.context,coherenceScopes:state.facts.evidence.scopes.map(owner=>({file:owner.file,path:owner.path,sha256:metadataDigest(owner)}))};
 const issued={schema:'original-display-caller-scope-input-v2',source:state.module.file,module:[...state.module.path],sourceSha256:hash(state.module.source),sourceViewDigest:state.module.sourceView.digest,callOriginalRange,originalParameters,scopeSha256:metadataDigest(scope),originalContextSha256:metadataDigest(originalContext),namespaceAuthority:false,runtimeParity:false},digest=metadataDigest(issued),receipt=freezeMacroTree({...issued,digest});
 // Known source relocation preserves this exact frozen evidence object.
 // Neither public hashes nor equal receipts from another analysis replay it.
 scopes.set(receipt,{state,parser,receipt,fmtNamespace:captureOriginalFmtTypeNamespace(parser)});return receipt;
}
function scopeFacts(receipt){
 const issued=scopes.get(receipt);if(!issued)fail('caller Display scope is copied, forged, stale or foreign');
 const snapshot=copyMetadata(receipt);if(matchesParserFacts(issued.parser)!==issued.state||metadataDigest(Object.fromEntries(Object.entries(snapshot).filter(([name])=>name!=='digest')))!==snapshot.digest)fail('caller Display scope lost its private original parser context');return issued.state;
}
function selectedNominal(state,family,fmtNamespace){
 const scopes=state.facts.evidence.scopes,modules=state.facts.modules.map(module=>({...module,items:originalSourceModuleItems(module)})),identities=nominalTypeIdentities(scopes,modules),matches=[],coherenceExclusions=[];
 if(!identities.has(JSON.stringify(family)))fail('actual nominal Display family absent');
 for(const module of modules){
  if(originalNestedImplementationObligations(module).length)fail('nested implementation coherence is unresolved');
  const extracted=extractImplDeclarations(module.source,{sourcePath:module.file,modulePath:module.path,sourceView:module.sourceView,compilationProfile:state.facts.compilationProfile});
  for(const impl of extracted.implementations){
   if(!impl.traitPath){if(impl.diagnostics.some(diagnostic=>diagnostic.message==='trait implementation needs resolved generic bounds or qualified trait syntax')){const nominal=resolveNominalImplTarget(impl,module,scopes,identities);if(!nominal||same(nominal.family,family))fail('unresolved original trait syntax may overlap Display');}continue;}let traitJoin,traitFailure;
   try{traitJoin=resolveOriginalFmtTypePath(fmtNamespace,module,impl.traitPath,'Display');}catch(error){if(!(error instanceof TypeError))throw error;try{const exclusion=proveOriginalDisjointDisplayTrait(fmtNamespace,module,impl.traitPath);coherenceExclusions.push({implementation:{source:module.file,span:impl.span,original:module.source.slice(impl.span.start,impl.span.end)},exclusion});continue;}catch(exclusionError){if(!(exclusionError instanceof TypeError))throw exclusionError;traitFailure=exclusionError;}}
   const nominal=resolveNominalImplTarget(impl,module,scopes,identities);if(!nominal)fail('potentially overlapping Display nominal target is unresolved');if(!same(nominal.family,family))continue;
   if(traitFailure)fail(traitFailure.message);
   standardRoot(scopes,module);if(impl.genericParameters.length||impl.attributes.some(attribute=>!['allow','doc','inline'].includes(attribute.name)))fail('generic or attributed Display implementation requires further source closure');
   if(impl.methods.length!==1||impl.methods[0].name!=='fmt'||impl.methods[0].receiver!=='shared'||impl.methods[0].async)fail('original Display impl method set differs');
   matches.push({module,impl,nominal,method:impl.methods[0],traitJoin,fmtNamespace});
  }
 }
 if(matches.length!==1)fail('one coherent actual nominal Display implementation required');freezeMacroTree(coherenceExclusions);return {...matches[0],coherenceExclusions,coherenceReferences:coherenceExclusions.map(row=>({source:row.implementation.source,implementationSpan:row.implementation.span,implementationSha256:hash(row.implementation.original),written:row.exclusion.written,target:row.exclusion.target,proofDigest:metadataDigest(row.exclusion)}))};
}
function originalForwarder(selection){
 const program=compileFormatSourceControlBodies({nominalDisplay:selection.method.source}),fn=formatSourceControlBodyFacts(program)[0],ir=fn.ir;
 if(!ir||ir.statements.length||ir.tail?.kind!=='call'||ir.tail.callee?.kind!=='field'||!['pad','write_str'].includes(ir.tail.callee.name)||ir.tail.arguments.length!==1)fail('Display body requires an actual one-expression string forwarder');
 const parameters=fn.parameters;if(parameters.length!==2)fail('Display original receiver/formatter signature differs');
 const names=parameters.map(nodes=>nodes.filter(node=>!['&','mut'].includes(node.text))[0]?.text),formatter=ir.tail.callee.object;
 if(names[0]!=='self'||formatter.kind!=='written-path'||!same(formatter.path,[names[1]]))fail('Display source formatter receiver differs');
 const value=ir.tail.arguments[0];if(value.kind!=='call'||value.callee.kind!=='field'||value.callee.object.kind!=='written-path'||!same(value.callee.object.path,['self'])||value.arguments.length)fail('Display body needs its original zero-argument inherent string method');
 const signatureJoin=resolveOriginalDisplaySignature(selection.fmtNamespace,selection.module,selection.method,names[1]);
 return {program,methodName:value.callee.name,padMethod:ir.tail.callee.name,parameters:names,signatureJoin};
}
function originalInherent(state,family,name){
 const owners=state.facts.evidence.scopes,modules=state.facts.modules.map(module=>({...module,items:originalSourceModuleItems(module)})),identities=nominalTypeIdentities(owners,modules),matches=[];
 for(const module of modules){
  const extracted=extractImplDeclarations(module.source,{sourcePath:module.file,modulePath:module.path,sourceView:module.sourceView,compilationProfile:state.facts.compilationProfile});
  for(const impl of extracted.implementations){
   if(impl.traitPath)continue;const nominal=resolveNominalImplTarget(impl,module,owners,identities);if(!nominal||!same(nominal.family,family))continue;
   for(const method of impl.methods.filter(method=>method.name===name))matches.push({module,impl,nominal,method});
  }
 }
 if(matches.length!==1)fail('one actual original inherent Display source method required');return matches[0];
}
function symbolicStringSink(standard,forwarder){
 const sources={...standard.program.sources,nominalDisplay:forwarder.program.sources.nominalDisplay},program=compileFormatSourceControlBodies(sources),methods=new WeakMap(),slot=Object.freeze({kind:'checked-original-inherent-string-result'}),bytes=Object.freeze({kind:'checked-original-string-byte-view',slot}),self={},vector={},writer={vec:vector},writes=[];
 methods.set(self,new Map([[forwarder.methodName,()=>slot]]));methods.set(slot,new Map([['as_bytes',()=>bytes]]));methods.set(writer,new Map([['write_str','stringWrite'],['push_str','stringPush']]));methods.set(vector,new Map([['extend_from_slice',value=>{if(value!==bytes)fail('original source string sink writes an unresolved value');writes.push(slot);}]]));
 const options=executeFormatSourceControlBodies(program,'optionsNew',[],{constants:standard.constants,methods}),created=executeFormatSourceControlBodies(program,'formatterNew',[writer,options.result],{constants:standard.constants,methods}),formatter=created.result;methods.set(formatter,new Map([['pad','formatterPad'],['write_str','formatterWrite']]));
 const run=executeFormatSourceControlBodies(program,'nominalDisplay',[self,formatter],{constants:standard.constants,methods});if(run.result?.tag!=='Ok'||run.result.args.length!==1||!Array.isArray(run.result.args[0])||run.result.args[0].length||writes.length!==1||writes[0]!==slot)fail('original Display control did not produce exactly its checked string slot');
 return {program,options:options.result,formatterControlTrace:[...options.trace,...created.trace,...run.trace],writes,allocatorEffectsVerified:false,nativeWriteAbiVerified:false};
}
export function sourceNominalDisplayClosure(receipt,family,consumerParser=null){
 if(!Array.isArray(family)||family[0]!=='crate')fail('actual checked nominal family required');const state=scopeFacts(receipt);if(consumerParser!==null&&matchesParserFacts(consumerParser).context!==state.context)fail('foreign original Display consumer parser context');
 const selection=selectedNominal(state,family,scopes.get(receipt).fmtNamespace),forwarder=originalForwarder(selection),inherent=originalInherent(state,family,forwarder.methodName),original=selectedStandard(),execution=symbolicStringSink(original,forwarder),metadata=freezeMacroTree({schema:'original-nominal-default-display-closure-v3',caller:receipt,nominal:selection.nominal,implementation:{source:selection.module.file,sourceSha256:hash(selection.module.source),span:selection.impl.span,original:selection.module.source.slice(selection.impl.span.start,selection.impl.span.end)},method:selection.method,namespaceJoins:{trait:selection.traitJoin,signature:forwarder.signatureJoin,coherenceExclusions:selection.coherenceReferences},originalInherent:{source:inherent.module.file,module:inherent.module.path,sourceSha256:hash(inherent.module.source),sourceViewDigest:inherent.module.sourceView.digest,implementationSpan:inherent.impl.span,method:inherent.method},standard:original.metadata,forwarder:forwarder.program,inherentMethod:forwarder.methodName,padMethod:forwarder.padMethod,execution,namespaceAuthority:false,allocatorEffectsVerified:false,ioEffectsVerified:false,runtimeParity:false});closures.set(metadata,{state,selection,forwarder,inherent,execution});return metadata;
}
export function sourceNominalDisplayClosureFacts(closure){const state=closures.get(closure);if(!state)fail('copied or forged nominal Display closure');scopeFacts(closure.caller);return state;}
export function verifySourceNominalDisplayMethod(closure,semantic,checkedMethod){
 const {state,inherent}=sourceNominalDisplayClosureFacts(closure),parsed=originalMethodSemanticFacts(semantic),origin=originalMethodTransformFacts(parsed.transform),member=origin.member,method=origin.method;
 if(origin.context!==state.context)fail('foreign original Display inherent method analysis context');
 if(member.sourcePath!==inherent.module.file||!same(member.modulePath,inherent.module.path)||member.source!==inherent.module.source||member.sourceView.digest!==inherent.module.sourceView.digest||metadataDigest(member.compilationProfile)!==metadataDigest(state.facts.compilationProfile)||!same(member.implementationSpan,inherent.impl.span)||!same(method.span,inherent.method.span)||!same(method.bodySpan,inherent.method.bodySpan)||method.source!==inherent.method.source||method.name!==closure.inherentMethod||method.receiver!==inherent.method.receiver||!same(origin.proof.owner.owner,closure.nominal.family))fail('checked Display inherent method differs from its exact original implementation/member/source');
 if(checkedMethod.sourceMethodProof!==semantic.sourceMethodProof||checkedMethod.name!==semantic.name||checkedMethod.impl.method!==method.name||checkedMethod.impl.receiver!==method.receiver||!same(checkedMethod.modulePath,member.modulePath))fail('checked Display inherent method lost its original semantic declaration association');
 return freezeMacroTree({schema:'original-display-checked-inherent-source-join-v1',originalContextSha256:closure.caller.originalContextSha256,sourcePath:member.sourcePath,modulePath:member.modulePath,sourceSha256:origin.proof.sourceSha256,sourceViewDigest:member.sourceView.digest,implementationSpan:member.implementationSpan,memberSpan:method.span,bodySpan:method.bodySpan,originalMethodDigest:member.methodDigest,originalTransformDigest:metadataDigest(origin.proof),namespaceAuthority:false,runtimeParity:false});
}
