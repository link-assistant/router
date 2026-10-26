// Source provenance and CST only. A selected definition is still conditional
// until a separate source-bound macro owner and hygiene proof is available.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {createDeclarativeMacroEngine} from './declarative-macro-engine.mjs';
import {originalMacroEofRule,requireOriginalMacroEofRule} from './macro-eof-source.mjs';
import {originalMacroTrees,originalTopLevelMacroInvocations,originalMacroTreeText} from './macro-token-trees.mjs';
import {originalMacroLiteralGrammar,requireOriginalMacroLiteralGrammar} from './macro-literal-source.mjs';
import {isSourceModuleView,originalModuleViewItems,originalSourceModuleItems} from './source-module-views.mjs';
import {sourceItems} from './rust-structure.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
const initial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const issued=initial?new WeakMap():null;
const fail=reason=>throwOriginalCapturedTypeError('Original declarative item output: '+reason);
function guard(){if(!initial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source operations changed');}
const hash=value=>{const result=createHash('sha256').update(value).digest('hex');guard();return result;};
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function own(value,key){if(!value||typeof value!=='object'||types.isProxy(value))fail('own non-proxy source data required');const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail('own source field required: '+key);return field.value;}
function options(value){guard();if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary options required');const names=Reflect.ownKeys(value);if(names.length!==4||names.some(name=>!['definitionModule','definitionName','invocationModule','invocationSpan'].includes(name)))fail('exact original definition/invocation options required');return {definitionModule:own(value,'definitionModule'),definitionName:own(value,'definitionName'),invocationModule:own(value,'invocationModule'),invocationSpan:own(value,'invocationSpan')};}
function dense(value,maximum){if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>maximum||Reflect.ownKeys(value).length!==value.length+1)fail('bounded dense source array required');const result=[];for(let at=0;at<value.length;at++)result.push(own(value,''+at));return result;}
function moduleInput(module){
 const source=own(module,'source'),file=own(module,'file'),path=dense(own(module,'path'),64),view=own(module,'sourceView');
 if(typeof source!=='string'||Buffer.byteLength(source)>256000||typeof file!=='string'||path.some(part=>typeof part!=='string')||!isSourceModuleView(view))fail('complete bounded original source/module view required');
 const supplied=Object.getOwnPropertyDescriptor(module,'compilationProfile');if(supplied&&!Object.hasOwn(supplied,'value'))fail('own original compilation profile required');
 const current={file,path,source,sourceView:view,...(supplied?{compilationProfile:supplied.value}:{})};
 originalModuleViewItems(view,source);originalSourceModuleItems(current);guard();return {...current,sourceSha256:hash(source),bodySpan:view.bodySpan};
}
function sameModule(before,current){return before.source===current.source&&before.file===current.file&&before.sourceView===current.sourceView&&before.compilationProfile===current.compilationProfile&&before.path.length===current.path.length&&before.path.every((part,index)=>part===current.path[index]);}
function rejoin(state,supplied){
 requireOriginalMacroEofRule(state.eofRule);
 const row=options(supplied),definition=moduleInput(row.definitionModule),invocation=moduleInput(row.invocationModule),span=dense(row.invocationSpan,2);
 if(row.definitionModule!==state.definitionModule||row.invocationModule!==state.invocationModule||row.definitionName!==state.definitionName||span.length!==2||span[0]!==state.span[0]||span[1]!==state.span[1]||!sameModule(state.definition,definition)||!sameModule(state.invocation,invocation))fail('current original source or invocation association changed');
 guard();return row;
}
function candidateInputs(source){
 let parsedBytes=0,cells=0;const rows=[];
 function visit(text,offset,depth){
  if(depth>64||(parsedBytes+=Buffer.byteLength(text))>32000000)fail('generated item source inspection budget');
  for(const item of sourceItems(text)){
   if(++cells>32000)fail('generated item source cell budget');
   if(['struct','enum','union'].includes(item.term)){
    const tokens=originalMacroTrees(text.slice(item.start,item.end)),attributes=[];let at=0;
    while(tokens[at]?.text==='#'&&tokens[at+1]?.delimiter==='['){const prefix=tokens[at],group=tokens[at+1],inner=group.children;if(inner[0]?.text==='derive'&&inner[1]?.delimiter==='('&&inner.length===2){const names=[];let part=[];for(const node of [...inner[1].children,{text:','}]){if(node.text===','){if(!part.length)fail('empty generated derive path');names.push(part.map(originalMacroTreeText).join(' '));part=[];}else part.push(node);}attributes.push({span:[offset+item.start+prefix.span.start,offset+item.start+group.span.end],names});}at+=2;}
    rows.push({index:rows.length,term:item.term,name:item.name,span:[offset+item.start,offset+item.end],source:text.slice(item.start,item.end),attributes,depth,lexicalOnly:true});if(rows.length>512)fail('generated data item census budget');
   }
  }
  const trees=originalMacroTrees(text,{maxBytes:256000,maxTokens:32000,maxDepth:64});
  for(const tree of trees)if(tree.kind==='group'&&tree.delimiter==='{')visit(text.slice(tree.span.start+1,tree.span.end-1),offset+tree.span.start+1,depth+1);
 }
 // A bounded selected macro is within the existing token engine's 256k input
 // domain. Larger generated outputs retain the native CST but refuse this lane.
 if(Buffer.byteLength(source)>256000)fail('generated data inspection exceeds original token source bound');visit(source,0,0);return rows;
}
function render(trees){
 const leaves=[];let text='',cells=0;
 function append(value){text+=value;if(text.length>2097152||Buffer.byteLength(text)>8388608)fail('generated concrete source budget');}
 function sequence(nodes,depth=0){if(depth>64)fail('generated token delimiter budget');for(let at=0;at<nodes.length;at++){if(at)append(' ');const node=nodes[at];if(++cells>32000)fail('generated token cell budget');if(node.kind==='token'){const start=text.length;append(node.text);leaves.push({span:[start,text.length],tree:node,origin:'original-token'});}else if(node.kind==='group'){if(!['(','[','{'].includes(node.delimiter))fail('unknown generated delimiter');const start=text.length;append(node.delimiter);sequence(node.children,depth+1);append({'(':')','[':']','{':'}'}[node.delimiter]);leaves.push({span:[start,start+1],tree:node,origin:'original-delimiter-open'},{span:[text.length-1,text.length],tree:node,origin:'original-delimiter-close'});}else if(node.kind==='fragment'){if(!['ty','meta','ident','tt','expr','block','literal','lifetime','vis','item'].includes(node.fragment))fail('unknown privately forwarded fragment');sequence(node.trees,depth+1);}else fail('unresolved generated $crate or token kind');}}
 sequence(trees);return {source:text,leaves,cells};
}
function fullMap(source,after,span,replacement){const before=source.slice(...span);if(after!==source.slice(0,span[0])+replacement+source.slice(span[1]))fail('whole original source substitution changed');const rows=[];if(span[0])rows.push({kind:'unchanged',before:[0,span[0]],after:[0,span[0]]});rows.push({kind:'substitution',before:[...span],after:[span[0],span[0]+replacement.length],expected:before,replacement});if(span[1]<source.length)rows.push({kind:'unchanged',before:[span[1],source.length],after:[span[0]+replacement.length,after.length]});const inverse=after.slice(0,span[0])+before+after.slice(span[0]+replacement.length);if(inverse!==source)fail('complete original source inverse changed');return rows;}
export async function captureOriginalDeclarativeItemOutput(supplied){
 const request=options(supplied),definition=moduleInput(request.definitionModule),invocation=moduleInput(request.invocationModule),span=dense(request.invocationSpan,2);
 if(typeof request.definitionName!=='string'||!/^[_A-Za-z][_A-Za-z0-9]*$/u.test(request.definitionName)||span.length!==2||span.some(value=>!Number.isSafeInteger(value))||span[0]<invocation.bodySpan.start||span[1]>invocation.bodySpan.end||span[0]>=span[1])fail('exact original bounded invocation interval required');
 const definitionSource=definition.source.slice(definition.bodySpan.start,definition.bodySpan.end),inputSource=invocation.source.slice(...span),originalInvocations=originalTopLevelMacroInvocations(invocation.source.slice(invocation.bodySpan.start,invocation.bodySpan.end));
 const selected=originalInvocations.filter(row=>row.sourceSpan.start+invocation.bodySpan.start===span[0]&&row.sourceSpan.end+invocation.bodySpan.start===span[1]);if(selected.length!==1)fail('invocation is not an exact original module item candidate');const input=selected[0];
 if(input.path.length!==1||input.path[0]!==request.definitionName)fail('written invocation candidate differs from selected definition; no owner inferred');
 const grammar=originalMacroLiteralGrammar();requireOriginalMacroLiteralGrammar(grammar);guard();const eofRule=originalMacroEofRule(),engine=createDeclarativeMacroEngine(null,grammar,eofRule),compiled=engine.compileDeclarativeMacro(definitionSource,{name:request.definitionName,owner:['crate',...definition.path]}),header=engine.declarativeDefinitionHeader(compiled),lineage=[];
 let expansion=engine.expandDeclarativeMacro(compiled,input.trees);
 engine.declarativeExpansionOriginalInput(expansion,input.trees);
 for(let depth=0;;depth++){
  if(depth>32)fail('private recursive lineage budget');lineage.push({expansion,lineage:engine.declarativeExpansionLineage(expansion)});const trees=expansion.trees,nested=engine.declarativeNestedMacroInvocations(expansion);
  // Only a complete self-call is recursively forwarded. Its definition owner
  // remains explicitly unresolved, just like the original engine contract.
  if(trees.length===3&&trees[0]?.text===request.definitionName&&trees[1]?.text==='!'&&trees[2]?.kind==='group'){
   const rows=nested.filter(row=>row.writtenPath.length===1&&row.writtenPath[0]===request.definitionName&&engine.declarativeNestedMacroInput(expansion,row)===trees[2].children);if(rows.length!==1)fail('recursive input lacks its private whole-output lineage');expansion=engine.expandDeclarativeMacro(compiled,engine.declarativeNestedMacroInput(expansion,rows[0]));continue;
  }
  break;
 }
 const generated=render(expansion.trees),dataCandidates=candidateInputs(generated.source),nested=engine.declarativeNestedMacroInvocations(expansion);
 const concrete=await import('./concrete-syntax-meta.mjs');guard();const before=concrete.transportConcreteSyntaxSource(invocation.source,{language:'Rust'}),definitionCst=concrete.transportConcreteSyntaxSource(definition.source,{language:'Rust'}),generatedCst=concrete.transportConcreteSyntaxSource(generated.source,{language:'Rust'});guard();
 const languageId='rust:instantiate-selected-declarative-item-candidate',repositoryId='router:retain-unresolved-generated-item-owners';
 const applied=concrete.applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:languageId,edits:[{span:[...span],expected:inputSource,replacement:generated.source}]}],repositoryRules:[{id:repositoryId,edits:[]}]});
 const serialized=concrete.serializeConcreteSyntaxMeta(applied.value),after=concrete.transportConcreteSyntaxMeta(serialized);guard();const mapping=fullMap(invocation.source,after.source,span,generated.source);
 const state={...request,definition,invocation,span:[...span],engine,compiled,eofRule,input,expansion,meta:serialized};rejoin(state,supplied);guard();
 const facts=freeze({schema:'original-declarative-item-output-provenance-v1',definition:{file:definition.file,source:definition.source,sourceSha256:definition.sourceSha256,bodySpan:definition.bodySpan,header,compiled},invocation:{file:invocation.file,source:invocation.source,sourceSha256:invocation.sourceSha256,span:[...span],input},lineage,expansion,nested,generated,dataCandidates,definitionCst,generatedCst,before,after,mapping,trace:applied.trace,languageRules:[languageId],repositoryRules:[repositoryId],completeCstRoundTrip:true,completeSourceInverse:true,sourceDefinitionSelectionConditional:true,recursiveDefinitionOwnersResolved:false,generatedDeriveOwnersResolved:false,namespaceAuthority:false,typeAuthority:false,runtimeAuthority:false});
 guard();const token=Object.freeze({schema:'private-original-declarative-item-output-v1'});issued.set(token,{...state,facts});return token;
}
export async function originalDeclarativeItemOutputFacts(token,supplied){
 guard();const state=issued.get(token);if(!state)fail('copied or foreign complete item output receipt');rejoin(state,supplied);const concrete=await import('./concrete-syntax-meta.mjs');guard();const current=concrete.transportConcreteSyntaxMeta(state.meta);if(current.source!==state.facts.after.source||current.meta!==state.meta)fail('current complete generated CST changed');rejoin(state,supplied);guard();return state.facts;
}
