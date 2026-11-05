// Positive written-source grammar only. This does not qualify an original
// macro-expanded caller, builtin/tool ownership, attribute meaning or exports.
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {originalNormalUngatedBuiltinLookupSources,withSharedOriginalParsedBuiltinCallerSources} from './registered-builtin-caller-attribute-source.mjs';
import {originalNamespaceAttributeHeaderFacts} from './original-namespace-parser.mjs';
import {originalPrivateParserIngressUnchanged,originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
const fail=message=>{throw new TypeError('Empty written attribute grammar: '+message);};
const callbackNames=['parse_attribute','parse_attr_item','parse_path','parse_path_inner','parse_path_segments','parse_path_segment','parse_path_segment_ident','parse_ident','parse_ident_common','ident_or_err','parse_attr_args','parse_delim_args_inner'];
const requests=new WeakMap();let active=null;
function guard(){if(!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source grammar host changed');}
export function withOriginalEmptyWrittenAttributeGrammarOperation(run){
 guard();requireSynchronousSourceCallback(run);if(active){const owner=active;if(owner.depth>=64)fail('bounded current grammar operation required');owner.depth++;try{return withCompleteSourceClosingFence(run,[guard]);}finally{owner.depth--;}}
 return withSharedOriginalParsedBuiltinCallerSources(()=>{const frame={depth:1,program:null};active=frame;try{return withCompleteSourceClosingFence(run,[guard]);}finally{frame.program=null;frame.depth=0;active=null;}});
}
function program(){
 if(!active)fail('current written grammar source operation required');if(active.program)return active.program;const native=originalNormalUngatedBuiltinLookupSources('inline'),callbacks=[];let cells=0;
 function count(node,depth=0){if(++cells>200000||depth>64)fail('bounded complete native callback syntax required');if(node?.kind==='group')for(const child of node.children)count(child,depth+1);}
 for(const name of callbackNames){const row=native.parser?.[name];if(row?.name!==name||typeof row.original!=='string'||!row.owner||!Array.isArray(row.syntax))fail('complete original native parser callback required');for(const tree of row.syntax)count(tree);const concrete=transportConcreteSyntaxSource(row.original,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==row.original)fail('whole native parser callback CST inverse differs');callbacks.push({...row,concreteSyntax:concrete.meta,inverse:row.original});}
 const names=native.registrations.map(row=>row.name);if(!names.includes('inline')||new Set(names).size!==names.length)fail('complete original normal ungated name set required');
 active.program=Object.freeze({schema:'original-empty-written-attribute-parser-program-v1',profile:'rust-1.89-ordinary-outer-empty-ascii',callbacks:Object.freeze(callbacks),registeredNames:Object.freeze(names),nativeSources:native.sources,sourceCells:cells,opaqueMacroInputsQualified:false,originalCallerPresenceQualified:false,nativeCallerGrammarQualified:false,callerOwnerResolved:false,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,crossInvocationCache:false});return active.program;
}
export function originalEmptyWrittenAttributeProgramSources(){return withOriginalEmptyWrittenAttributeGrammarOperation(()=>program());}
function written(source,native){
 if(typeof source!=='string'||Buffer.byteLength(source)>4096)fail('bounded original header text required');let at=0,visited=0;const segments=[];const step=()=>{if(++visited>8192)fail('bounded complete written attribute required');};
 const space=()=>{while(at<source.length&&' \t\r\n'.includes(source[at])){step();at++;}};
 const take=value=>{step();if(!source.startsWith(value,at))fail('ordinary outer empty ASCII attribute profile required');at+=value.length;};
 const name=()=>{step();const start=at;if(!/[A-Za-z_]/u.test(source[at]??''))fail('ordinary nonraw ASCII path segment required');at++;while(at<source.length&&/[A-Za-z0-9_]/u.test(source[at])){step();at++;}if(at-start>256)fail('bounded ordinary segment required');return source.slice(start,at);};
 space();const start=at;take('#');space();take('[');space();segments.push(name());space();while(source.startsWith('::',at)){if(segments.length>=32)fail('bounded ordinary path required');take('::');space();segments.push(name());space();}take(']');const end=at;space();if(at!==source.length)fail('the complete header must have empty arguments and EOF');
 const builtin=segments.length===1&&native.registeredNames.includes(segments[0]),tool=segments.length===2&&segments[0]==='rustfmt'&&segments[1]==='skip';if(!builtin&&!tool)fail('only original normal ungated names or the unresolved rustfmt::skip grammar candidate enter this profile');
 return {kind:'NormalAttribute',style:'Outer',safety:'Default',path:{absolute:false,segments},arguments:{kind:'Empty'},span:{start,end},knownBuiltinNameCandidate:builtin,toolNameCandidate:tool,visited};
}
export function parseOriginalEmptyWrittenAttribute(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>4096)fail('bounded original header text required');
 return withOriginalEmptyWrittenAttributeGrammarOperation(()=>{let concrete,native;const result=createRulePipeline([
  {phase:'language',rules:[{id:'rust:reconstruct-the-entire-written-header-through-CST-meta',apply:()=>{concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete original written header CST differs');return source;}},{id:'rust:join-complete-original-callbacks-and-evaluate-the-positive-empty-written-branch',apply:value=>{native=program();return written(value,native);}}]},
  {phase:'repository',rules:[{id:'router:retain-written-reparse-domain-and-all-original-caller-owner-obligations',apply:syntax=>({schema:'original-empty-written-attribute-grammar-v1',profile:native.profile,source,syntax,concreteSyntax:concrete.meta,inverse:source,modeledCallbacks:[...callbackNames],visited:syntax.visited,writtenSourceGrammarQualified:true,sourceDomain:'written-source-header-reparse',opaqueMacroInputsQualified:false,originalCallerPresenceQualified:false,nativeCallerGrammarQualified:false,callerOwnerResolved:false,attributeValueSemanticsQualified:false,typePrefixAbsenceQualified:false,globalExportsClosed:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,receivingExecuted:false,crossInvocationCache:false})}]},
 ]).run(null);guard();return {...result.value,ruleTrace:result.trace};});
}
export function captureOriginalEmptyWrittenAttribute(headerToken,options){
 return withOriginalEmptyWrittenAttributeGrammarOperation(()=>{const header=originalNamespaceAttributeHeaderFacts(headerToken,options);if(header.source.attributeStyle!=='outer'||header.source.argumentKind!=='Empty')fail('actual original outer empty header required');parseOriginalEmptyWrittenAttribute(header.source.originalAttribute);originalNamespaceAttributeHeaderFacts(headerToken,options);const token=Object.freeze({schema:'private-original-empty-written-attribute-v1'});requests.set(token,{headerToken,options});return token;});
}
export function originalEmptyWrittenAttributeFacts(token){
 return withOriginalEmptyWrittenAttributeGrammarOperation(()=>{const request=requests.get(token);if(!request)fail('copied or foreign written grammar request');const header=originalNamespaceAttributeHeaderFacts(request.headerToken,request.options),grammar=parseOriginalEmptyWrittenAttribute(header.source.originalAttribute);originalNamespaceAttributeHeaderFacts(request.headerToken,request.options);return {...grammar,headerSource:header.source,originalHeaderAssociationRechecked:true};});
}
