// Source preprocessing only. The original compiler independently checks the
// reconstructed Rust; lexical expansion issues no type or namespace permit.
import {createHash} from 'node:crypto';
import {createAttributedLocalDeclarativeMacroEngine} from './attributed-local-declarative-macro-engine.mjs';

import {originalMacroLiteralGrammar} from './macro-literal-source.mjs';
import {originalMacroTrees,originalTopLevelMacroInvocations} from './macro-token-trees.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from './source-module-views.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Local declarative source: '+message);};
const inertTerms=new Set(['fn','struct','enum','union','impl','trait','mod','use','type','const','static']);
const documentation=source=>rustTokens(source).some(token=>token.type==='comment'&&originalDocumentationComment(token.text));
const attributes=item=>item.tokens.find(token=>token.type!=='comment')?.text==='#';
const innerAttribute=item=>item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!';
const span=item=>({start:item.start,end:item.end});
function rootKind(item){
 const tokens=item.tokens.filter(token=>token.type!=='comment');let at=0;
 if(tokens[at]?.text==='pub'){at++;if(tokens[at]?.text==='('){let depth=0;do{if(tokens[at]?.text==='(')depth++;if(tokens[at]?.text===')')depth--;at++;}while(depth&&at<tokens.length);if(depth)return null;}}
 while(['unsafe','async'].includes(tokens[at]?.text))at++;
 if(tokens[at]?.text==='extern'){at++;if(tokens[at]?.type==='string')at++;}
 if(tokens[at]?.text==='const'&&tokens[at+1]?.text==='fn')at++;
 return tokens[at]?.text;
}



const trackedPath=value=>{need(typeof value==='string'&&value.endsWith('.rs')&&!/[\\\0:]/u.test(value)&&value.split('/').every(part=>part&&part!=='.'&&part!=='..'),'repository-relative Rust source path required');return value;};
function captureTrackedDeclarativeSources(options){
 need(options&&typeof options==='object'&&!types.isProxy(options)&&Object.getPrototypeOf(options)===Object.prototype,'ordinary explicit project options required');
 const allowed=new Set(['entry','paths','readSource','compilationProfile']),fields=Object.getOwnPropertyDescriptors(options);
 for(const key of Reflect.ownKeys(fields))need(typeof key==='string'&&allowed.has(key)&&Object.hasOwn(fields[key],'value'),'unknown or accessor project option');const input=Object.fromEntries(Object.entries(fields).map(([key,row])=>[key,row.value])),profile=compilationProfile(input.compilationProfile),profileText=JSON.stringify(profile);
 const entry=trackedPath(input.entry);need(Array.isArray(input.paths)&&!types.isProxy(input.paths)&&Object.getPrototypeOf(input.paths)===Array.prototype&&input.paths.length>0&&input.paths.length<=4096,'bounded complete source universe required');
 const array=Object.getOwnPropertyDescriptors(input.paths);need(Reflect.ownKeys(array).length===input.paths.length+1,'dense ordinary source paths required');const paths=[];
 for(let index=0;index<input.paths.length;index++){need(array[index]&&Object.hasOwn(array[index],'value'),'own source path required');paths.push(trackedPath(array[index].value));}
 need(new Set(paths).size===paths.length&&paths.includes(entry)&&typeof input.readSource==='function'&&!types.isProxy(input.readSource),'unique source universe including entry and ordinary reader required');
 const originals=new Map();let bytes=0;for(const name of paths){const source=input.readSource(name);need(typeof source==='string'&&Buffer.byteLength(source)<=8388608&&!/\p{Surrogate}/u.test(source),'bounded well-formed complete Rust source required');bytes+=Buffer.byteLength(source);need(bytes<=134217728,'complete original project byte budget');originals.set(name,source);}
 const current=()=>{for(const [name,source]of originals)need(input.readSource(name)===source,'complete original source changed during the proposal');need(JSON.stringify(compilationProfile(input.compilationProfile))===profileText,'complete explicit configuration profile changed during source proposal');};
 return {input,entry,paths,originals,current,profile};
}

// Complete fresh multi-file textual-inheritance source operation.


import {types} from 'node:util';
import {resolveModuleGraph} from './project.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {isTrackedModulePathPlan} from './module-paths.mjs';










import {compilationProfile,itemConfiguration,isAbsentConditionalAttribute,evaluateConfiguration} from './cfg-profile.mjs';
import {originalFreshConditionalAttributeSourceInputs} from './conditional-source-operation.mjs';
import {originalTextualConfigurationSourcePlan} from './conditional-source-operation.mjs';
import {createOriginalCommonBuiltinCallerAttributeScope as createOriginalPassiveBuiltinCallerAttributeScope,createModuleMacroUseBuiltinCallerAttributeScope} from './registered-builtin-caller-attribute-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

// Profile-selected source proposals only. Unknown and inner producers retain
// their original source; this adapter issues no original-program permission.



import {createOriginalInnerLintCallerAttributeScope} from './registered-builtin-caller-attribute-source.mjs';














// Profile-selected source proposals only. Unknown and inner producers retain
// their original source; this adapter issues no original-program permission.




import {createOriginalStructuredDocumentationSourceScope as createOriginalLiteralDocumentationSourceScope} from './registered-builtin-caller-attribute-source.mjs';














// Profile-selected source proposals only. Unknown and inner producers retain
// their original source; this adapter issues no original-program permission.

export function proposeStructuredDocumentationConfiguredTrackedSources(options){
 const {input,entry,paths,originals,current,profile}=captureTrackedDeclarativeSources(options),files=[],selections=[],refusals=[];let native=null,conditionalSource=null,retained=0,cells=0;
 const proveNative=()=>{native??=originalTextualConfigurationSourcePlan();conditionalSource??=originalFreshConditionalAttributeSourceInputs();need(native.retainedSourceBytes+conditionalSource.retainedSourceBytes<=8388608,'complete native configuration grammar source byte bound');};
 const passive=createOriginalPassiveBuiltinCallerAttributeScope(),moduleUse=createModuleMacroUseBuiltinCallerAttributeScope(),inner=createOriginalInnerLintCallerAttributeScope(),docs=createOriginalLiteralDocumentationSourceScope(),tick=()=>{if(++cells>200000)need(false,'complete configured textual source-cell bound');};
 try{
  current();for(const [sourcePath,before]of originals){
   const captured=captureSourceModuleViews({source:before,sourcePath,compilationProfile:profile}),rows=[],blocked=[];for(const view of captured.views){const items=originalModuleViewItems(view,before),module={file:sourcePath,path:view.modulePath,source:before,sourceView:view,compilationProfile:view.compilationProfile};if(items.some(item=>innerAttribute(item)&&!inner.at(module,item)&&!docs.innerItem(module,item)))blocked.push(view.bodySpan);let previous=view.bodySpan.start;for(const item of items){rows.push({module,item,preceding:before.slice(previous,item.start)});previous=item.end;}}
   rows.sort((left,right)=>left.item.start-right.item.start||right.item.end-left.item.end);const edits=[];let discardedUntil=-1;
   const refuse=(row,message)=>refusals.push({sourcePath,module:row.module.path,span:span(row.item),original:before.slice(row.item.start,row.item.end),message,sourceAuthority:false,semanticAuthority:false});
   for(const row of rows){
    tick();const {module,item}=row;if(item.start<discardedUntil)continue;const condition=itemConfiguration(item.tokens,module.compilationProfile),conditional=condition.attributes.filter(attribute=>['cfg','cfg_attr'].includes(attribute.name));if(!conditional.length)continue;
    if(blocked.some(bound=>bound.start<=item.start&&bound.end>=item.end)||innerAttribute(item)){refuse(row,'Inner source producers require their separate complete original source rule');continue;}
    if(condition.diagnostics.length||condition.status==='unknown'){refuse(row,'The original condition or conditional attribute expansion remains unknown');continue;}
    if(condition.status==='inactive'){
     if(documentation(row.preceding)){refuse(row,'Dropping a documented item needs its complete original doc attachment rule');continue;}
     proveNative();const selected={span:[item.start,item.end],expected:before.slice(item.start,item.end),replacement:''};edits.push(selected);selections.push({sourcePath,module:module.path,kind:'inactive-original-item',...selected,condition,sourceAuthority:false,semanticAuthority:false});discardedUntil=item.end;continue;
    }
    let closed=true;for(const attribute of condition.attributes){
     tick();if(attribute.name==='cfg'){if(attribute.evaluation?.value!==true||attribute.evaluation.diagnostics.length)closed=false;continue;}
     if(attribute.name==='cfg_attr'){if(!isAbsentConditionalAttribute(attribute))closed=false;continue;}
     if(!(attribute.name==='doc'?docs.attribute(module,item,attribute):attribute.name==='macro_use'?moduleUse.at(module,item,attribute):passive.at(module,item,attribute)))closed=false;
    }
    if(!closed){refuse(row,'Other original attributes or active conditional producers need their separate source rules');continue;}
    for(const attribute of conditional){proveNative();const selected={span:[attribute.span.start,attribute.span.end],expected:before.slice(attribute.span.start,attribute.span.end),replacement:''};edits.push(selected);selections.push({sourcePath,module:module.path,kind:attribute.name==='cfg'?'active-original-cfg':'absent-original-cfg-attr',...selected,condition:attribute.evaluation,sourceAuthority:false,semanticAuthority:false});}
   }
   edits.sort((left,right)=>left.span[0]-right.span[0]);let end=-1;for(const edit of edits){need(edit.span[0]>=end&&before.slice(...edit.span)===edit.expected,'nonoverlapping actual original configuration spans required');end=edit.span[1];}let after=before;for(const edit of [...edits].reverse())after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);need(Buffer.byteLength(after)<=8388608,'complete configured physical source bound');retained+=Buffer.byteLength(before)+Buffer.byteLength(after);need(retained<=201326592,'complete original and configured raw-source bound');
   const concrete=transportConcreteSyntaxSource(before,{language:'Rust'}),run=applyConcreteSyntaxSubstitutions(concrete.document,{languageRules:[{id:'rust:select-only-proved-inactive-items-and-active-or-absent-outer-condition-spans',edits}],repositoryRules:[{id:'router:retain-complete-profile-source-and-explicit-unresolved-producers',edits:[]}]}),reparsed=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(run.value)).source;need(reparsed===after,'complete configured CST source differs');const history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];need(history.inverse===before,'complete original conditional source inverse differs');files.push({sourcePath,before,after,edits,history,trace:run.trace,sourceAuthority:false,semanticAuthority:false});
  }current();return {schema:'literal-doc-inner-lint-configured-tracked-textual-source-proposal-v1',observedSourceCells:cells,entry,compilationProfile:profile??null,files,selections,refusals,status:refusals.length?'partial-source-proposal':'source-proposal',originalCompilerSource:native,conditionalAttributeSource:conditionalSource,compilerDiagnosticTracePreserved:false,originalSourceEquivalenceQualified:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false,receivingExecuted:false};
 }finally{try{try{passive.finish();}finally{try{moduleUse.finish();}finally{try{inner.finish();}finally{docs.finish();}}}}finally{if(native){originalTextualConfigurationSourcePlan();originalFreshConditionalAttributeSourceInputs();}current();}}
}

import {rustTokens} from './rust-structure.mjs';

function originalDocumentationComment(source){return source.startsWith('//!')||source.startsWith('///')&&!source.startsWith('////')||source.startsWith('/*!')||source.startsWith('/**')&&!['*','/'].includes(source[3]);}

// Source-only attachment proposal. The existing compiler still checks the
// complete reconstructed program; no source row is a namespace/type permit.


import {createOriginalStructuredDocumentationSourceScope as createOriginalCommentDocumentationSourceScope} from './registered-builtin-caller-attribute-source.mjs';

export function proposeStructuredDocumentationCommentTrackedSources(options){
 const {entry,originals,current,profile}=captureTrackedDeclarativeSources(options),files=[],selections=[],refusals=[];
 let docs=createOriginalCommentDocumentationSourceScope(),native=null,conditionalSource=null,cells=0,retained=0;
 const passive=createOriginalPassiveBuiltinCallerAttributeScope(),moduleUse=createModuleMacroUseBuiltinCallerAttributeScope(),inner=createOriginalInnerLintCallerAttributeScope();
 const tick=()=>need(++cells<=200000,'complete line documentation source-cell bound');
 const conditional=()=>{native??=originalTextualConfigurationSourcePlan();conditionalSource??=originalFreshConditionalAttributeSourceInputs();need(native.retainedSourceBytes+conditionalSource.retainedSourceBytes<=8388608,'complete native condition source bound');};
 function header(module,item){
  tick();if(innerAttribute(item))return !!(inner.at(module,item)??docs.innerItem(module,item));
  const condition=itemConfiguration(item.tokens,module.compilationProfile);if(condition.status==='unknown'||condition.diagnostics.length)return false;
  for(const attribute of condition.attributes){
   tick();if(attribute.name==='cfg'){if(typeof attribute.evaluation?.value!=='boolean'||attribute.evaluation.diagnostics.length)return false;conditional();continue;}
   if(attribute.name==='cfg_attr'){if(!isAbsentConditionalAttribute(attribute))return false;conditional();continue;}
   if(!(attribute.name==='doc'?docs.attribute(module,item,attribute):attribute.name==='macro_use'?moduleUse.at(module,item,attribute):passive.at(module,item,attribute)))return false;
  }return true;
 }
 try{
  const result=createRulePipeline([
   {phase:'language',rules:[{id:'rust:attach-only-actual-module-gap-comment-doc-tokens-to-original-items',apply:()=>{
    current();for(const [sourcePath,before]of originals){
     const docTokens=rustTokens(before).filter(token=>{tick();return token.type==='comment'&&originalDocumentationComment(token.text);});
     const captured=docTokens.length?captureSourceModuleViews({source:before,sourcePath,compilationProfile:profile}):{views:[]},viewByDigest=new Map(captured.views.map(view=>[view.digest,view])),gaps=[],blocked=new Set(),headers=new Map(),edits=[];
     const refuse=(token,module,message)=>{tick();refusals.push({sourcePath,module:[...module],span:{start:token.start,end:token.end},original:before.slice(token.start,token.end),message,sourceAuthority:false,semanticAuthority:false});};
     for(const view of captured.views){
      tick();const items=originalModuleViewItems(view,before),module={file:sourcePath,path:view.modulePath,source:before,sourceView:view,compilationProfile:view.compilationProfile};
      let closed=!blocked.has(view.parentDigest);if(view.parentDigest){const parent=viewByDigest.get(view.parentDigest),parentRows=originalModuleViewItems(parent,before),owner=parentRows.find(item=>item.start===view.declaration.span.start&&item.end===view.declaration.span.end);need(owner,'complete original parent declaration required');closed=closed&&headers.get(owner)===true;}
      const itemHeaders=new Map();for(const item of items){tick();const selected=header(module,item);itemHeaders.set(item,selected);headers.set(item,selected);if(innerAttribute(item)&&!selected)closed=false;}
      if(!closed)blocked.add(view.digest);let previous=view.bodySpan.start,leading=true;
      for(const item of items){gaps.push({start:previous,end:item.start,module,next:item,leading,closed:closed&&itemHeaders.get(item)});if(!innerAttribute(item))leading=false;previous=item.end;}
      gaps.push({start:previous,end:view.bodySpan.end,module,next:null,leading,closed});
     }
     gaps.sort((left,right)=>left.start-right.start||left.end-right.end);let previousEnd=-1;for(const gap of gaps){tick();need(gap.start>=previousEnd&&gap.end>=gap.start,'disjoint actual original module gaps required');previousEnd=gap.end;}
     let gapIndex=0,tokenIndex=0;
     while(tokenIndex<docTokens.length){
      tick();const token=docTokens[tokenIndex];while(gapIndex<gaps.length&&gaps[gapIndex].end<=token.start)gapIndex++;
      const gap=gaps[gapIndex];if(!gap||token.start<gap.start||token.end>gap.end){refuse(token,[],'Documentation outside a complete module gap needs its own original attachment rule');tokenIndex++;continue;}
      const group=[];while(tokenIndex<docTokens.length&&docTokens[tokenIndex].start>=gap.start&&docTokens[tokenIndex].end<=gap.end)group.push(docTokens[tokenIndex++]);
      let closed=gap.closed,outer=false;const candidates=[];
      for(const comment of group){
       tick();const row=docs.comment({sourcePath,source:before,start:comment.start,end:comment.end});
       if(!row){closed=false;refuse(comment,gap.module.path,'CR or unsupported control-bearing documentation needs a separate original source rule');continue;}
       if(row.style==='inner'&&(!gap.leading||outer)){closed=false;refuse(comment,gap.module.path,'Inner documentation must precede ordinary module items and outer documentation');continue;}
       if(row.style==='outer'){outer=true;if(!gap.next||innerAttribute(gap.next)){closed=false;refuse(comment,gap.module.path,'Outer documentation needs its actual following original ordinary item');continue;}}
       candidates.push({...row,module:[...gap.module.path],attachment:row.style==='inner'?{kind:'module',span:{...gap.module.sourceView.bodySpan}}:{kind:'item',span:span(gap.next)},replacement:'#'+(row.style==='inner'?'!':'')+'[doc='+row.literalSyntax+']'});
      }
      if(!gap.closed)for(const comment of group)refuse(comment,gap.module.path,'An original enclosing or target attribute producer remains unresolved');
      if(closed)for(const row of candidates){const edit={span:[row.span.start,row.span.end],expected:row.original,replacement:row.replacement};edits.push(edit);selections.push({...row,sourcePath,...edit,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false});}
     }
     edits.sort((left,right)=>left.span[0]-right.span[0]);let end=-1,after=before;for(const edit of edits){need(edit.span[0]>=end&&before.slice(...edit.span)===edit.expected,'actual nonoverlapping documentation spans required');end=edit.span[1];}for(const edit of [...edits].reverse())after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);need(Buffer.byteLength(after)<=8388608,'complete normalized documentation file bound');retained+=Buffer.byteLength(before)+Buffer.byteLength(after);need(retained<=201326592,'complete original and normalized documentation raw-source bound');
     const concrete=transportConcreteSyntaxSource(before,{language:'Rust'}),substituted=applyConcreteSyntaxSubstitutions(concrete.document,{languageRules:[{id:'rust:substitute-source-proved-module-comment-doc-tokens-with-exact-literal-attributes',edits}],repositoryRules:[{id:'router:retain-complete-original-attachment-profile-and-refusals',edits:[]}]}),reparsed=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(substituted.value)).source;need(reparsed===after,'complete normalized documentation CST source differs');const history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];need(history.inverse===before,'complete original documentation source inverse differs');files.push({sourcePath,before,after,edits,history,trace:substituted.trace,sourceAuthority:false,semanticAuthority:false});
    }current();return files;
   }}]},
   {phase:'repository',rules:[{id:'router:package-complete-comment-documentation-original-and-normalized-source-domains',apply:()=>{
    current();return {schema:'comment-documentation-tracked-textual-source-proposal-v1',entry,compilationProfile:profile,sourceInputs:[...originals].map(([path,source])=>({path,source})),files,selections,refusals,status:refusals.length?'partial-source-proposal':'source-proposal',originalCompilerSource:native,conditionalAttributeSource:conditionalSource,originalSourceEquivalenceQualified:false,originalApplicationCoverageQualified:false,compilerDiagnosticTracePreserved:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false,receivingExecuted:false};
   }}]},
  ]).run(null);const scope=docs;docs=null;const documentationSource=scope.finish();current();return {...result.value,documentationSource,ruleTrace:result.trace};
 }finally{try{try{passive.finish();}finally{try{moduleUse.finish();}finally{try{inner.finish();}finally{if(docs){const scope=docs;docs=null;scope.finish();}}}}}finally{if(native){originalTextualConfigurationSourcePlan();originalFreshConditionalAttributeSourceInputs();}current();}}
}

import {inspectConditionalAttribute} from './conditional-attributes.mjs';
import {originalActiveTextualConfigurationSourcePlan} from './conditional-source-operation.mjs';

// Full source proposal only. Current native builtin configuration recipes,
// original token intervals and independently checked expanded headers are
// required; complete checked targets and original equivalence remain separate.
export function proposeStructuredDocumentationActiveConditionalSources(options){
 const {entry,originals,current,profile}=captureTrackedDeclarativeSources(options),files=[],selections=[],refusals=[];
 const passive=createOriginalPassiveBuiltinCallerAttributeScope(),moduleUse=createModuleMacroUseBuiltinCallerAttributeScope(),inner=createOriginalInnerLintCallerAttributeScope(),docs=createOriginalCommentDocumentationSourceScope();
 let native=null,conditionalSource=null,cells=0,attributes=0,parsedBytes=0,retained=0;
 const tick=()=>need(++cells<=200000,'complete active conditional source-cell bound');
 const prove=()=>{native??=originalActiveTextualConfigurationSourcePlan();conditionalSource??=originalFreshConditionalAttributeSourceInputs();need(native.retainedSourceBytes+conditionalSource.retainedSourceBytes<=8388608,'complete native active condition source bound');};
 function safeHeader(module,item){
  tick();if(innerAttribute(item))return !!(inner.at(module,item)??docs.innerItem(module,item));const condition=itemConfiguration(item.tokens,module.compilationProfile);if(condition.diagnostics.length||condition.status==='unknown')return false;
  for(const attribute of condition.attributes){tick();if(attribute.name==='cfg'){if(typeof attribute.evaluation?.value!=='boolean'||attribute.evaluation.diagnostics.length)return false;prove();continue;}if(attribute.name==='cfg_attr')return false;if(!(attribute.name==='doc'?docs.attribute(module,item,attribute):attribute.name==='macro_use'?moduleUse.at(module,item,attribute):passive.at(module,item,attribute)))return false;}return true;
 }
 function expand(body,module,style,depth=0){
  tick();need(depth<=64&&body[0]?.type==='ident'&&body[0].text==='cfg_attr','complete bounded plain original cfg_attr required');const inspected=inspectConditionalAttribute(body),predicate=evaluateConfiguration(inspected.predicate,profile);need(typeof predicate.value==='boolean'&&!predicate.diagnostics.length,'explicit original conditional predicate must be known');prove();
  const evidence={span:{start:body[0].start,end:body.at(-1).end},original:module.source.slice(body[0].start,body.at(-1).end),predicate,outputs:[],sourceAuthority:false,semanticAuthority:false};if(!predicate.value)return {replacement:'',evidence};const output=[];
  for(const attribute of inspected.attributes){
   tick();need(++attributes<=4096,'complete active conditional expanded-attribute bound');const tokens=body.filter(token=>token.start>=attribute.span.start&&token.end<=attribute.span.end);need(tokens.length&&tokens[0].start===attribute.span.start&&tokens.at(-1).end===attribute.span.end&&tokens.length===attribute.tokens.length&&tokens.every((token,index)=>token.text===attribute.tokens[index]),'whole actual original conditional payload tokens required');
   if(tokens[0]?.text==='cfg_attr'){const nested=expand(tokens,module,style,depth+1);output.push(nested.replacement);evidence.outputs.push(nested.evidence);}else{need(!['crate_name','crate_type'].includes(tokens[0]?.text),'native cfg_attr crate-name/type errors cannot be rewritten away');const original=module.source.slice(attribute.span.start,attribute.span.end),replacement='#'+(style==='inner'?'!':'')+'['+original+']';output.push(replacement);evidence.outputs.push({span:{...attribute.span},original,replacement,ownerResolved:false,sourceAuthority:false,semanticAuthority:false});}
  }
  const replacement=output.join('');need(Buffer.byteLength(replacement)<=256000,'complete expanded conditional header bound');return {replacement,evidence};
 }
 function proposal(module,item){
  tick();const condition=itemConfiguration(item.tokens,module.compilationProfile),conditional=condition.attributes.filter(attribute=>attribute.name==='cfg_attr');if(!conditional.length)return {closed:safeHeader(module,item),edits:[],selections:[]};const edits=[],selected=[],style=innerAttribute(item)?'inner':'outer';
  for(const attribute of conditional){const actual=item.tokens.filter(token=>token.type!=='comment'&&token.start>=attribute.span.start&&token.end<=attribute.span.end),begin=style==='inner'?3:2;need(actual[0]?.text==='#'&&actual[style==='inner'?2:1]?.text==='['&&actual.at(-1)?.text===']','whole original cfg_attr boundary required');const result=expand(actual.slice(begin,-1),module,style);edits.push({span:[attribute.span.start,attribute.span.end],expected:module.source.slice(attribute.span.start,attribute.span.end),replacement:result.replacement});selected.push({sourcePath:module.file,module:[...module.path],style,span:{...attribute.span},original:module.source.slice(attribute.span.start,attribute.span.end),expansion:result.evidence,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false});}
  let fragment=module.source.slice(item.start,item.end);for(const edit of [...edits].reverse())fragment=fragment.slice(0,edit.span[0]-item.start)+edit.replacement+fragment.slice(edit.span[1]-item.start);parsedBytes+=Buffer.byteLength(fragment);need(parsedBytes<=33554432,'complete independently reparsed conditional header source bound');const captured=captureSourceModuleViews({source:fragment,sourcePath:module.file,compilationProfile:profile}),view=captured.views[0],rows=originalModuleViewItems(view,fragment);need(style==='inner'?rows.every(innerAttribute):rows.length===1&&!innerAttribute(rows[0]),'expanded conditional source retains its original item style');const carrier={file:module.file,path:module.path,source:fragment,sourceView:view,compilationProfile:profile};if(!rows.every(row=>safeHeader(carrier,row)))return {closed:false,edits:[],selections:[]};return {closed:true,edits,selections:selected};
 }
 try{
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'rust:expand-current-explicit-conditional-attributes-in-original-payload-order',apply:()=>{
    current();for(const [sourcePath,before]of originals){
     const captured=before.includes('cfg_attr')?captureSourceModuleViews({source:before,sourcePath,compilationProfile:profile}):{views:[]},planned=new Map(),blocked=new Set(),edits=[];
     const refuse=(module,item,message)=>refusals.push({sourcePath,module:[...module.path],span:span(item),original:before.slice(item.start,item.end),message,sourceAuthority:false,semanticAuthority:false});
     for(const view of captured.views){
      tick();const module={file:sourcePath,path:view.modulePath,source:before,sourceView:view,compilationProfile:profile},items=originalModuleViewItems(view,before);let closed=!blocked.has(view.parentDigest),leading=true;
      if(view.parentDigest){const parent=captured.views.find(row=>row.digest===view.parentDigest),owner=originalModuleViewItems(parent,before).find(item=>item.start===view.declaration.span.start&&item.end===view.declaration.span.end);need(owner,'actual original conditional parent module required');closed=closed&&planned.get(owner)?.closed===true;}
      for(const item of items){let value;try{value=proposal(module,item);if(innerAttribute(item)&&!leading)value={closed:false,edits:[],selections:[]};}catch(error){if(!(error instanceof TypeError))throw error;value={closed:false,edits:[],selections:[],message:error.message};}planned.set(item,value);if(innerAttribute(item)&&!value.closed)closed=false;if(!innerAttribute(item))leading=false;}
      if(!closed)blocked.add(view.digest);
      for(const item of items){const value=planned.get(item),conditional=itemConfiguration(item.tokens,profile).attributes.some(attribute=>attribute.name==='cfg_attr');if(!conditional)continue;if(!closed||!value.closed){refuse(module,item,value.message??'An original enclosing, conditional or expanded attribute producer remains unresolved');continue;}edits.push(...value.edits);selections.push(...value.selections);}
     }
     edits.sort((left,right)=>left.span[0]-right.span[0]);let end=-1,after=before;for(const edit of edits){tick();need(edit.span[0]>=end&&before.slice(...edit.span)===edit.expected,'actual nonoverlapping conditional attribute intervals required');end=edit.span[1];}for(const edit of [...edits].reverse())after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);need(Buffer.byteLength(after)<=8388608,'complete active conditional physical source bound');retained+=Buffer.byteLength(before)+Buffer.byteLength(after);need(retained<=201326592,'complete original and active conditional raw-source bound');const concrete=transportConcreteSyntaxSource(before,{language:'Rust'}),substituted=applyConcreteSyntaxSubstitutions(concrete.document,{languageRules:[{id:'rust:substitute-only-complete-source-selected-known-cfg-attr-spans',edits}],repositoryRules:[{id:'router:preserve-complete-original-profile-source-and-unresolved-producer-domains',edits:[]}]}),reparsed=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(substituted.value)).source;need(reparsed===after,'complete active conditional source CST inverse differs');const history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];need(history.inverse===before,'complete original active conditional source inverse differs');files.push({sourcePath,before,after,edits,history,trace:substituted.trace,sourceAuthority:false,semanticAuthority:false});
    }current();return files;
   }}]},
   {phase:'repository',rules:[{id:'router:retain-complete-original-and-source-selected-active-conditional-histories',apply:()=>{
    current();return {schema:'active-conditional-tracked-textual-source-proposal-v1',observedSourceCells:cells,observedParsedBytes:parsedBytes,expandedAttributes:attributes,entry,compilationProfile:profile,sourceInputs:[...originals].map(([path,source])=>({path,source})),files,selections,refusals,status:refusals.length?'partial-source-proposal':'source-proposal',originalCompilerSource:native,conditionalAttributeSource:conditionalSource,originalSourceEquivalenceQualified:false,originalApplicationCoverageQualified:false,compilerDiagnosticTracePreserved:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false,receivingExecuted:false};
   }}]},
  ]).run(null);current();return {...run.value,ruleTrace:run.trace};
 }finally{try{try{passive.finish();}finally{try{moduleUse.finish();}finally{try{inner.finish();}finally{docs.finish();}}}}finally{if(native){originalActiveTextualConfigurationSourcePlan();originalFreshConditionalAttributeSourceInputs();}current();}}
}

import {withStructuredDocumentationMacroAttributeValidation} from './passive-macro-attribute-source.mjs';

export function proposeStructuredDocumentationGeneratedTrackedLocalDeclarativeSources(options){
 return withStructuredDocumentationMacroAttributeValidation(validator=>{
 const {input,entry,paths,originals,current}=captureTrackedDeclarativeSources(options);let graph,engine,edits=[],definitions=[],refusals=[],files=[],rootCalls=0,renderedBytes=0,renderedCells=0;
 const refuse=(module,item,kind,message)=>refusals.push({kind,sourcePath:module.file,module:[...module.path],span:span(item),source:module.source.slice(item.start,item.end),message,sourceAuthority:false,semanticAuthority:false});
 const result=createRulePipeline([
  {phase:'language',rules:[
   {id:'configured-generated-tracked-local-declarative:serialize-and-reparse-complete-original-cst',apply:()=>{
    current();graph=resolveModuleGraph({entry,paths,readSource:name=>{need(originals.has(name),'module graph requested uncaptured source');return originals.get(name);},compilationProfile:input.compilationProfile});current();
    for(const row of graph.diagnostics)refusals.push({kind:'original-module-graph',sourcePath:row.file??entry,module:row.module??[],span:row.span??null,source:originals.get(row.file??entry)??null,message:row.message,sourceAuthority:false,semanticAuthority:false});
    return graph;
   }},
   {id:'configured-generated-tracked-local-declarative:select-actual-prior-textual-definitions-and-private-inputs',apply:()=>{
    // An inner attribute may rewrite the whole crate. No spelling is presumed
    // inert, and a textual definition cannot discharge that enclosing effect.
    const modules=new Map(graph.modules.map(module=>[JSON.stringify(module.path),module])),childrenByOwner=new Map();for(const edge of graph.edges){const key=JSON.stringify(edge.module.slice(0,-1));if(!childrenByOwner.has(key))childrenByOwner.set(key,[]);childrenByOwner.get(key).push(edge);}
    function visit(module,inherited,depth=0){
     const view=module.sourceView,before=module.source,sourcePath=module.file;
     need(depth<=64,'whole-file original inline scope depth bound');const items=originalSourceModuleItems(module),initialRefusals=refusals.length;
     if(module.configurationCondition!=='active'||view.configurationCondition!=='active'||items.some(item=>innerAttribute(item)&&!validator.inner(module,item))){for(const item of items)refuse(module,item,'enclosing-attribute','Whole original module attributes or configuration need an independent owner/effect rule');return {closed:false,visible:new Map()};}
     const visible=new Map(inherited);let previous=view.bodySpan.start;
     for(const item of items){
     const prefix=validator.header(module,item),lastAttribute=prefix.attributes.at(-1)?.span.end??item.start,fragment=before.slice(item.start,item.end),hasDocumentation=documentation(before.slice(previous,item.start)),kind=prefix.closed?rootKind({...item,tokens:item.tokens.filter(token=>token.start>=lastAttribute)}):null;previous=item.end;
     if(prefix.inner)continue;
     if(['macro_rules!','macro_rules','macro'].includes(kind)){
      try{
       need(!hasDocumentation&&prefix.closed,'Macro declaration attributes remain unresolved');
       const trees=originalMacroTrees(fragment);let begin=0;while(trees[begin]?.text==='#'&&trees[begin+1]?.delimiter==='[')begin+=2;const name=trees[begin+2]?.text;need(trees[begin]?.text==='macro_rules'&&trees[begin+1]?.text==='!'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??''),'plain original macro_rules declaration required');
       engine??=createAttributedLocalDeclarativeMacroEngine(null,originalMacroLiteralGrammar());const definition=engine.compileDeclarativeMacro(fragment,{name,owner:['crate',...module.path]}),header=engine.declarativeDefinitionHeader(definition);
       need(header.kind==='macro_rules'&&header.visibility===null&&header.attributes.length===prefix.attributes.length&&header.span.start===trees[0].span.start,'complete plain original macro declaration header required');
       need(header.span.end===trees.at(-1)?.span.end||trees.at(-1)?.text===';'&&header.span.end===trees.at(-2)?.span.end,'unresolved source outside the macro declaration');
       visible.set(name,definition);definitions.push({name,sourcePath,module:[...module.path],span:span(item),source:fragment,sourceSha256:hash(fragment),definition,header,ownerVerified:false,semanticAuthority:false});
      }catch(error){if(!(error instanceof TypeError))throw error;visible.clear();refuse(module,item,'definition',error.message);}
      continue;
     }
     if(attributes(item)&&!prefix.closed||hasDocumentation){visible.clear();refuse(module,item,'attribute-producer','An unresolved attributed source item can change later textual bindings');continue;}
     // A child inherits only definitions visible at its actual declaration.
     // The source-checked word macro_use branch retains the final child scope.
     // Ordinary children restore the parent; unknown producers retain refusals.
     if(kind==='mod'){const children=(childrenByOwner.get(JSON.stringify(module.path))??[]).filter(edge=>edge.from===module.file&&(edge.span??edge.pathSelection?.span)?.start===item.start&&(edge.span??edge.pathSelection?.span)?.end===item.end);need(children.length<=1,'unique actual tracked child module edge');if(children.length){const edge=children[0],child=modules.get(JSON.stringify(edge.module));need(child&&child.file===edge.to&&(!edge.pathSelection||isTrackedModulePathPlan(edge.pathSelection)),'actual fresh child file/view and private path selection required');const childScope=visit(child,visible,depth+1);if(!childScope.closed)visible.clear();else if(prefix.macroUse){visible.clear();for(const [name,definition]of childScope.visible)visible.set(name,definition);}}else{visible.clear();refuse(module,item,'module-edge','Original module lacks a complete tracked child source');}continue;}
     if(inertTerms.has(kind))continue;
     if(fragment.trim()===';')continue;
     try{
      const invocations=originalTopLevelMacroInvocations(fragment);need(invocations.length===1,'one complete original root invocation required');const invocation=invocations[0];
      need(invocation.path.length===1&&fragment.slice(0,invocation.sourceSpan.start).trim()===''&&['',';'].includes(fragment.slice(invocation.sourceSpan.end).trim()),'plain unqualified root invocation required');
      const definition=visible.get(invocation.path[0]);need(definition,'no preceding unambiguous original textual definition');
      need(++rootCalls<=128,'whole-file root expansion count budget');const proof=engine.expandDeclarativeMacro(definition,invocation.trees);engine.declarativeExpansionOriginalInput(proof,invocation.trees);
      const rendered=engine.renderLocalDeclarativeExpansion(proof,name=>visible.get(name)??null),passiveAttributes=validator.generated(rendered.source,{sourcePath,compilationProfile:module.compilationProfile});
      renderedBytes+=rendered.renderedRawBytes+(passiveAttributes.sourceNormalization?.retainedRawBytes??0);renderedCells+=rendered.renderCells+(passiveAttributes.sourceNormalization?.observedSourceCells??0);need(renderedBytes<=8388608&&renderedCells<=200000,'whole-file rendered raw-source and tree-cell budgets');
      // Resolve generated items while still inside the same source transaction.
      // All original definitions stay in place for unexpanded ordinary bodies.
      const replacement=fragment.slice(0,invocation.sourceSpan.start)+passiveAttributes.source+fragment.slice(invocation.sourceSpan.end);
      edits.push({sourcePath,module:[...module.path],span:span(item),before:fragment,after:replacement,name:invocation.path[0],definitionDigest:definition.digest,originalInput:invocation,expansion:rendered,passiveAttributes,sourceAuthority:false,semanticAuthority:false});
     }catch(error){if(!(error instanceof TypeError))throw error;visible.clear();refuse(module,item,'invocation',error.message);}
     }return {closed:refusals.length===initialRefusals,visible};
    }if(!graph.diagnostics.length){const rootModule=modules.get('[]');need(rootModule&&rootModule.file===entry,'actual complete original root module required');visit(rootModule,new Map());}
    return edits;
   }},
   {id:'configured-generated-tracked-local-declarative:substitute-only-complete-actual-root-call-spans',apply:()=>{
    current();let retained=0;for(const [sourcePath,before]of originals){const selected=edits.filter(edit=>edit.sourcePath===sourcePath).sort((left,right)=>left.span.start-right.span.start);let end=0,after=before;
     for(const edit of selected){need(edit.span.start>=end&&before.slice(edit.span.start,edit.span.end)===edit.before,'overlapping or stale original invocation');end=edit.span.end;}
     for(const edit of [...selected].reverse())after=after.slice(0,edit.span.start)+edit.after+after.slice(edit.span.end);need(Buffer.byteLength(after)<=8388608,'complete expanded source byte budget');retained+=Buffer.byteLength(before)+Buffer.byteLength(after);need(retained<=201326592,'complete original and expanded raw-source budget');const history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];need(history.inverse===before,'complete original physical source inverse differs');files.push({sourcePath,before,after,history,edits:selected,definitions:definitions.filter(row=>row.sourcePath===sourcePath),refusals:refusals.filter(row=>row.sourcePath===sourcePath),sourceAuthority:false,semanticAuthority:false});
    }current();return files;
   }},
  ]},
  {phase:'repository',rules:[{id:'router:retain-complete-original-expanded-cst-and-refusals',apply:()=>{
   current();return {schema:'configured-generated-tracked-local-declarative-source-proposal-v1',entry,sourceInputs:[...originals].map(([path,source])=>({path,source})),files,definitions,edits,refusals,originalGraph:{modules:graph.modules.map(module=>({file:module.file,path:module.path,sourceView:module.sourceView,configurationCondition:module.configurationCondition})),edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},status:refusals.length?'partial-source-proposal':'source-proposal',scope:'source-bound-word-module-macro-use-with-complete-tracked-textual-scopes',sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false,receivingExecuted:false};
  }}]},
 ]).run(null);current();return {...result.value,ruleTrace:result.trace};
 });
}












// Profile-selected source proposals only. Unknown and inner producers retain
// their original source; this adapter issues no original-program permission.
