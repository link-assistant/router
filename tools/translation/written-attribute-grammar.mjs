// Positive written empty/delimited ASCII attribute model. No native caller,
// hygiene, attribute meaning, namespace or producer/export authority follows.
import {createRulePipeline} from './rule-pipeline.mjs';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withOriginalEmptyWrittenAttributeGrammarOperation,originalEmptyWrittenAttributeProgramSources,parseOriginalEmptyWrittenAttribute} from './empty-written-attribute-grammar.mjs';
import {originalNamespaceAttributeHeaderFacts} from './original-namespace-parser.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
const fail=message=>{throw new TypeError('Written attribute grammar: '+message);};
const bounded=message=>{throw new RangeError('Written attribute grammar: '+message);};
const requests=new WeakMap();let active=null;
export function withOriginalWrittenAttributeGrammarOperation(run){
 requireSynchronousSourceCallback(run);return withOriginalEmptyWrittenAttributeGrammarOperation(()=>{
  if(active){const frame=active;if(frame.depth>=64)fail('bounded current grammar operation required');frame.depth++;try{return withCompleteSourceClosingFence(run,[]);}finally{frame.depth--;}}
  const frame={depth:1,program:null};active=frame;try{return withCompleteSourceClosingFence(run,[]);}finally{frame.program=null;frame.depth=0;active=null;}
 });
}
function program(){
 if(!active)fail('actual current grammar operation required');if(active.program)return active.program;const empty=originalEmptyWrittenAttributeProgramSources(),owner=empty.callbacks.find(row=>row.name==='parse_attr_args'),source=empty.nativeSources.find(row=>row.path===owner?.path&&row.sourceSha256===owner?.sourceSha256),nodes=owner?.owner?.body?.children,selected=[];let work=empty.sourceCells;
 if(!source||!Array.isArray(nodes)||source.sourceSha256!==owner.sourceSha256)fail('complete original native argument parser owner/source required');
 for(let at=0;at<nodes.length;at++){
  if(++work>200000)bounded('complete native parser inventory budget');if(nodes[at].text!=='fn'||nodes[at+1]?.text!=='parse_token_tree')continue;let end=at+2;while(end<nodes.length&&nodes[end].delimiter!=='{'&&nodes[end].text!==';'){if(++work>200000)bounded('complete native parser callback budget');end++;}
  const body=nodes[end];if(body?.delimiter!=='{')fail('complete original native token-tree parser body required');const span={start:nodes[at].span.start,end:body.span.end};if(span.start<owner.owner.span.start||span.end>owner.owner.span.end)fail('actual token-tree callback containment required');const original=source.source.slice(span.start,span.end),concrete=transportConcreteSyntaxSource(original,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==original)fail('complete token-tree parser CST inverse differs');
  const syntax=nodes.slice(at,end+1);const count=(node,depth=0)=>{if(++work>200000||depth>64)bounded('complete native token-tree callback syntax budget');if(node.kind==='group')for(const child of node.children)count(child,depth+1);};for(const node of syntax)count(node);selected.push({name:'parse_token_tree',path:source.path,sourceSha256:source.sourceSha256,span,original,syntax,owner:owner.owner,concreteSyntax:concrete.meta,inverse:original});
 }
 if(selected.length!==1)fail('one complete actual native token-tree callback required');active.program=Object.freeze({...empty,schema:'original-written-attribute-parser-program-v1',profile:'rust-1.89-ordinary-outer-empty-or-delimited-ascii',callbacks:Object.freeze([...empty.callbacks,Object.freeze(selected[0])]),sourceCells:work,nativeTokenTreeLexingQualified:false});return active.program;
}
export function originalWrittenAttributeProgramSources(){return withOriginalWrittenAttributeGrammarOperation(()=>program());}
function lexical(source){
 let at=0,visited=0;const tick=()=>{if(++visited>200000)bounded('complete written lexical budget');};
 while(at<source.length){tick();const char=source[at],code=source.charCodeAt(at);if(code>126||code<32&&!['\t','\n','\r'].includes(char))fail('ordinary ASCII token profile required');
  if(char==='"'){
   if(at&&/[A-Za-z0-9_#]/u.test(source[at-1]))fail('prefixed/raw string literals remain outside this profile');at++;let closed=false;while(at<source.length){tick();const value=source[at++],number=value.charCodeAt(0);if(value==='"'){closed=true;break;}if(value==='\\'){if(at>=source.length||!'\\"nrt0'.includes(source[at++]))fail('only original simple cooked ASCII string escapes enter this profile');}else if(number<32||number>126)fail('only single-line cooked ASCII strings enter this profile');}if(!closed)fail('complete original quoted token required');if(at<source.length&&/[A-Za-z0-9_#]/u.test(source[at]))fail('literal suffixes remain outside this profile');continue;
  }
  if(/[A-Za-z_]/u.test(char)){const start=at++;while(at<source.length&&/[A-Za-z0-9_]/u.test(source[at])){tick();at++;}if(at-start>256||source[at]==='#')fail('bounded ordinary nonraw token name required');continue;}
  if(/[0-9]/u.test(char)){const start=at++;while(at<source.length&&/[0-9]/u.test(source[at])){tick();at++;}if(at-start>128||at-start>1&&source[start]==='0'||at<source.length&&/[A-Za-z_.]/u.test(source[at]))fail('bounded plain decimal token required');continue;}
  if(char==='/'&&['/','*'].includes(source[at+1]))fail('comments/documentation tokens remain outside this positive lexical profile');if(!' \t\r\n#[](){}:,=!-+&|^<>;.*?/@$%'.includes(char))fail('unsupported written token spelling');at++;
 }return visited;
}
function written(source,native){
 const visited=lexical(source);let trees;try{trees=originalMacroTrees(source,{maxBytes:256000,maxTokens:32000,maxDepth:64});}catch(error){if(error instanceof TypeError&&['Declarative macro token budget exceeded','Declarative macro delimiter budget exceeded'].includes(error.message))bounded(error.message);throw error;}if(trees.length!==2||trees[0].kind!=='token'||trees[0].text!=='#'||trees[1].kind!=='group'||trees[1].delimiter!=='[')fail('one complete ordinary outer written attribute required');const body=trees[1].children,segments=[];let at=0;
 const name=()=>{const value=body[at++];if(value?.kind!=='token'||! /^[A-Za-z_][A-Za-z0-9_]*$/u.test(value.text))fail('ordinary written path segment required');return value.text;};segments.push(name());while(body[at]?.text==='::'){if(segments.length>=32)fail('bounded original written path required');at++;segments.push(name());}
 const builtin=segments.length===1&&native.registeredNames.includes(segments[0]),tool=segments.length===2&&segments[0]==='rustfmt'&&segments[1]==='skip';if(!builtin&&!tool)fail('only actual normal ungated names or unresolved rustfmt::skip enter this profile');const args=body[at++];if(!args){const empty=parseOriginalEmptyWrittenAttribute(source);return {...empty.syntax,visited:visited+empty.visited};}
 if(args.kind!=='group'||!['(','[','{'].includes(args.delimiter)||at!==body.length)fail('one complete empty or delimited argument branch required');let cells=0;const count=(node,depth=0)=>{if(++cells>32000||depth>64)bounded('complete ordinary written argument tree budget');if(node.sourceFeature)fail('complete ordinary written argument tree profile required');if(node.kind==='group')for(const child of node.children)count(child,depth+1);};count(args);
 return {kind:'NormalAttribute',style:'Outer',safety:'Default',path:{absolute:false,segments},arguments:{kind:'Delimited',delimiter:args.delimiter,span:{...args.span},original:source.slice(args.span.start,args.span.end),trees:args.children,tokenMeaningQualified:false},span:{start:trees[0].span.start,end:trees[1].span.end},knownBuiltinNameCandidate:builtin,toolNameCandidate:tool,visited:visited+cells};
}
export function parseOriginalWrittenAttribute(source){
 if(typeof source!=='string')fail('original header text required');if(Buffer.byteLength(source)>256000)bounded('complete original header byte budget');return withOriginalWrittenAttributeGrammarOperation(()=>{let concrete,native;const result=createRulePipeline([
  {phase:'language',rules:[{id:'rust:reconstruct-the-complete-written-attribute-through-CST-meta',apply:()=>{concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete original written header CST inverse differs');return source;}},{id:'rust:model-ordinary-empty-or-delimited-arguments-with-complete-native-parser-sources',apply:value=>{native=program();return written(value,native);}}]},
  {phase:'repository',rules:[{id:'router:retain-written-reparse-domain-with-all-original-caller-and-argument-obligations',apply:syntax=>({schema:'original-written-attribute-grammar-v1',profile:native.profile,source,syntax,concreteSyntax:concrete.meta,inverse:source,modeledCallbacks:native.callbacks.map(row=>row.name),visited:syntax.visited,writtenSourceGrammarQualified:true,sourceDomain:'written-source-header-reparse',nativeTokenTreeLexingQualified:false,opaqueMacroInputsQualified:false,originalCallerPresenceQualified:false,nativeCallerGrammarQualified:false,callerOwnerResolved:false,attributeValueSemanticsQualified:false,attributeTransformationsResolved:false,argumentMacroOwnerResolved:false,typePrefixAbsenceQualified:false,globalExportsClosed:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,wholeCompilerExecuted:false,receivingExecuted:false,crossInvocationCache:false})}]},
 ]).run(null);return {...result.value,ruleTrace:result.trace};});
}
export function captureOriginalWrittenAttribute(headerToken,options){return withOriginalWrittenAttributeGrammarOperation(()=>{const header=originalNamespaceAttributeHeaderFacts(headerToken,options);if(header.source.attributeStyle!=='outer'||!['Empty','Delimited'].includes(header.source.argumentKind))fail('actual original outer empty/delimited header required');parseOriginalWrittenAttribute(header.source.originalAttribute);originalNamespaceAttributeHeaderFacts(headerToken,options);const token=Object.freeze({schema:'private-original-written-attribute-v1'});requests.set(token,{headerToken,options});return token;});}
export function originalWrittenAttributeFacts(token){return withOriginalWrittenAttributeGrammarOperation(()=>{const request=requests.get(token);if(!request)fail('copied or foreign written grammar request');const header=originalNamespaceAttributeHeaderFacts(request.headerToken,request.options),grammar=parseOriginalWrittenAttribute(header.source.originalAttribute);originalNamespaceAttributeHeaderFacts(request.headerToken,request.options);return {...grammar,headerSource:header.source,originalHeaderAssociationRechecked:true};});}
