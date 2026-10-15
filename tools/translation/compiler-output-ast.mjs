// Opt-in original compiler source flow. Structured syntax is not an executed
// iterator, typed constructor value, hygiene proof or complete output theorem.
import {compilerOutputAstSourceAccess,compilerOutputCollectionSourceAccess,requireCompilerOutputAstSourceAccess} from './builtin-derive-ast-meta.mjs';
import {createCompilerOutputAstSourceSubstitution} from './builtin-ast-source-substitution.mjs';
import {originalMacroTrees,originalMacroInvocation} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeExpansionOriginalInput,declarativeExpansionLineage,declarativeDefinitionHeader} from './declarative-token-macros.mjs';
import {isPlainSourceIdentifier} from './module-paths.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {createBuiltinAstBuilderMetaCompiler} from './builtin-ast-builder-meta.mjs';
const compilers=new WeakMap(),flows=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const edition='compiler/rustc_builtin_macros/src/edition_panic.rs';
// Paths identify missing original contracts, not acquired sources or owners.
// Each remains a machine-readable work item after focused receiving checks.
export const COMPILER_OUTPUT_COLLECTION_WORKLIST=freeze([
 {id:'rust.collection.once',inputs:['library/core/src/iter/sources/once.rs'],requires:['Iterator::next','once construction','single owned Ident value']},
 {id:'rust.collection.chain',inputs:['library/core/src/iter/adapters/chain.rs'],requires:['ordered next/short-circuit','Once then slice Map state']},
 {id:'rust.collection.map',inputs:['library/core/src/iter/adapters/map.rs'],requires:['actual Iterator/FnMut owner','closure input and call once per yielded element']},
 {id:'rust.collection.slice-iter',inputs:['library/core/src/slice/iter.rs'],requires:['slice lifetime/length','unsafe pointer implementation','shared reference Copy and |&s| pattern']},
 {id:'rust.collection.vec-into-iter',inputs:['library/alloc/src/vec/into_iter.rs'],requires:['owned vector traversal/drop','IntoIterator actual route']},
 {id:'rust.collection.vec-collect',inputs:['library/alloc/src/vec/mod.rs','library/alloc/src/vec/spec_from_iter.rs'],requires:['FromIterator specialization','allocator/storage/drop','complete collect source route']},
 {id:'rust.compiler.path-segment',inputs:['compiler/rustc_ast/src/lib.rs','compiler/rustc_ast/src/ast.rs'],requires:['wildcard public reexport namespace','PathSegment::from_ident actual impl','Self/Ident/NodeId/Option source types']},
 {id:'rust.compiler.std-path',inputs:['compiler/rustc_expand/src/base.rs','compiler/rustc_span/src/symbol.rs'],requires:['ExtCtxt original receiver','def-site span/hygiene','DollarCrate actual owner','Ident constructors','immutable collection contracts above']},
 {id:'rust.compiler.return-carriers',inputs:['compiler/rustc_expand/src/base.rs'],requires:['ExpandResult Ready/Retry actual variants','make_MacEager complete declarative expansion','all MacResult expression/pattern/items/stmts/type accessors','selected expr slot and all other fields exact']},
 {id:'rust.compiler.edition-stack',inputs:[edition],requires:['actual private expansion stack','allow_internal_unstable lookup','call-site ancestry','all loop/continue/break conditions','edition comparison']},
 {id:'rust.compiler.nested-format-output',inputs:['library/core/src/panic.rs','library/std/src/panic.rs','compiler/rustc_builtin_macros/src/format.rs'],requires:['both editions/abort alternatives','actual selected panic/unreachable owner','format_args/const_format_args full arguments and output']},
].map(entry=>({...entry,rustRevision:'29483883eed69d5fb4db01964cdf2af4d86e9cb2',status:'unresolved',sourceAcquisitionComplete:false,semanticsProved:false})));
export function createCompilerOutputAstCompiler(profile,sourcePlan){
 const access=compilerOutputAstSourceAccess(profile,sourcePlan),stage=createCompilerOutputAstSourceSubstitution(profile,access);
 const compiler=Object.freeze({schema:'private-compiler-output-source-flow-v1'});compilers.set(compiler,{profile,sourcePlan,access,stage});return compiler;
}
export function compileOriginalCompilerOutputFlow(compiler,path,name,selector=null){
 const state=compilers.get(compiler);if(!state)throw new TypeError('Original compiler output requires its private compiler');
 requireCompilerOutputAstSourceAccess(state.access,state.profile);
 if(typeof path!=='string'||typeof name!=='string'||!/^[_a-zA-Z][_a-zA-Z0-9]*$/u.test(name))throw new TypeError('Original compiler source member and function required');
 const original=state.access.original(path),fragment=state.access.function(path,name,selector),program=state.stage.compile(fragment),substitution=state.stage.substitute(program);
 const token=Object.freeze({schema:'private-original-compiler-output-flow-v1'}),facts=freeze({schema:'original-compiler-output-flow-v1',original,fragment,program,substitution,
  sourceSyntaxRetained:true,concreteCollectionValuesProved:false,constructorOwnerResolved:false,controlAndEffectClosureComplete:false,completeOutputProved:false,namespaceAuthority:false,runtimeAuthority:false,
  worklist:COMPILER_OUTPUT_COLLECTION_WORKLIST});
 flows.set(token,{compiler,state,fragment,facts});return token;
}
export function originalCompilerOutputFlowFacts(token,compiler){
 const record=flows.get(token);if(!record||record.compiler!==compiler||compilers.get(compiler)!==record.state)throw new TypeError('Copied or foreign original compiler output flow');
 requireCompilerOutputAstSourceAccess(record.state.access,record.state.profile).assert(record.fragment);record.state.stage.assert(record.facts.substitution);return record.facts;
}

export function createCompilerOutputCollectionCompiler(profile,sourcePlan){
 collectionSyntaxGuard();const access=compilerOutputCollectionSourceAccess(compilerOutputAstSourceAccess(profile,sourcePlan)),stage=createCompilerOutputAstSourceSubstitution(profile,access);
 const compiler=Object.freeze({schema:'private-compiler-output-collection-source-v1'});compilers.set(compiler,{profile,sourcePlan,access,stage});return compiler;
}

// Complete genuine expansion -> narrow positive item/construction AST. No
// rendered output is reparsed and no opaque type is assigned a Rust meaning.
const collectionSyntaxInitiallyNative=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const itemOutputs=collectionSyntaxInitiallyNative?new WeakMap():null,sourceItemOutputs=collectionSyntaxInitiallyNative?new WeakMap():null;
const outputFailure=message=>{throw new TypeError('Original compiler item output: '+message);};
function collectionSyntaxGuard(){if(!collectionSyntaxInitiallyNative||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())outputFailure('original syntax operations changed');}
export function observeOriginalCompilerItemOutput(expansion,input){
 collectionSyntaxGuard();declarativeExpansionOriginalInput(expansion,input);const lineage=declarativeExpansionLineage(expansion),captures=[];let cells=0;
 const count=depth=>{if(++cells>32000||depth>96)outputFailure('complete output tree/AST bound');};
 function tree(node,depth=0){count(depth);if(!node||typeof node!=='object')outputFailure('original output tree required');
  if(node.kind==='token')return;
  if(node.kind==='group'){for(const child of node.children)tree(child,depth+1);return;}
  if(node.kind==='fragment'){for(const child of node.trees)tree(child,depth+1);return;}
  outputFailure('unsupported output tree kind');
 }
 for(const node of expansion.trees)tree(node);
 function captured(node,kind){
  if(node.kind!=='fragment'||node.fragment!==kind||!node.trees.length)outputFailure('exact original '+kind+' capture required');
  const starts=[];for(let start=0;start+node.trees.length<=input.length;start++)if(node.trees.every((child,index)=>child===input[start+index]))starts.push(start);
  if(starts.length!==1)outputFailure('capture is not one exact original input sequence');
  const value={kind:'original-'+kind+'-slot',tree:node,inputStart:starts[0],inputLength:node.trees.length,ownerResolved:false};captures.push(value);return value;
 }
 function word(node){if(node?.kind==='fragment'){if(node.fragment!=='ident'||node.trees.length!==1)outputFailure('identifier capture required');captured(node,'ident');node=node.trees[0];}return node?.kind==='token'&&isPlainSourceIdentifier(node.text)?node.text:null;}
 const token=(node,text)=>node?.kind==='token'&&node.text===text;
 function parser(nodes,depth=0){let at=0;
  const peek=()=>nodes[at],take=text=>{const node=nodes[at];if(token(node,text)){at++;return node;}return null;},need=text=>{const node=take(text);if(!node)outputFailure('expected complete '+text);return node;};
  const name=()=>{const node=nodes[at++],value=word(node);if(!value)outputFailure('original identifier required');return {name:value,tree:node};};
  const group=delimiter=>{const node=nodes[at++];if(node?.kind!=='group'||node.delimiter!==delimiter)outputFailure('complete '+delimiter+' group required');return node;};
  const end=()=>{if(at!==nodes.length)outputFailure('unsupported or hidden output suffix');};
  function attrs(){const values=[];while(take('#')){if(take('!'))outputFailure('inner attribute position unsupported');const node=group('[');values.push({tree:node,ownerResolved:false,transformationClosed:false});}return values;}
  function visibility(){if(!take('pub'))return null;if(peek()?.kind==='group'&&peek().delimiter==='(')outputFailure('restricted visibility remains unresolved');return 'pub';}
  function path(){const segments=[name()];while(take('::'))segments.push(name());return {kind:'written-path',segments,ownerResolved:false};}
  function type(level=depth){count(level);if(peek()?.kind==='fragment'&&peek().fragment==='ty'){const slot=captured(nodes[at++],'ty');return {...slot,typeMeaningEstablished:false};}
   if(take('dyn'))return {kind:'written-dyn-bound',bound:type(level+1),traitOwnerResolved:false};
   const value=path(),arguments_=[];
   if(take('<')){if(token(peek(),'>'))outputFailure('empty generic arguments');do{arguments_.push(type(level+1));}while(take(','));need('>');}
   return {kind:'written-path-type',path:value,arguments:arguments_,typeMeaningEstablished:false};
  }
  function expression(bindings){count(depth);const value=path();let result={...value,kind:'written-value-path'};
   if(value.segments.length===1&&bindings.has(value.segments[0].name))result={kind:'original-parameter-reference',binding:bindings.get(value.segments[0].name),path:value};
   if(peek()?.kind==='group'&&peek().delimiter==='{'){
    const body=group('{'),fields=[],child=parser(body.children,depth+1);let update=null;
    while(child.remaining()){
     if(child.updatePrefix()){update=child.expression(bindings);child.end();break;}
     const field=child.name();child.need(':');fields.push({name:field,value:child.expression(bindings)});
     if(!child.take(',')){child.end();break;}
    }
    if(new Set(fields.map(field=>field.name.name)).size!==fields.length)outputFailure('duplicate source record field');
    result={kind:'written-record-construction',path:value,fields,update,tree:body,constructorOwnerResolved:false,defaultOrUpdateSemanticsProved:false};
   }
   while(peek()?.kind==='group'&&peek().delimiter==='('){const body=group('('),child=parser(body.children,depth+1),args=[];while(child.remaining()){args.push(child.expression(bindings));if(!child.take(',')){child.end();break;}}result={kind:'written-call-construction',callee:result,args,tree:body,callOwnerResolved:false,effectsProved:false};}
   return result;
  }
  function updatePrefix(){const left=nodes[at],right=nodes[at+1];if(token(left,'.')&&token(right,'.')&&left.span?.end===right.span?.start){at+=2;return true;}return false;}
  function method(){const attributes=attrs(),public_=visibility();need('fn');const identifier=name(),parameters_=group('('),child=parser(parameters_.children,depth+1),parameters=[],bindings=new Map();
   while(child.remaining()){const parameter=child.name();child.need(':');const value={kind:'original-generated-parameter',name:parameter,type:child.type(),ownerResolved:false};if(bindings.has(parameter.name))outputFailure('duplicate original parameter');parameters.push(value);bindings.set(parameter.name,value);if(!child.take(',')){child.end();break;}}
   need('->');const returnType=type(),body=group('{'),bodyParser=parser(body.children,depth+1),result=bodyParser.expression(bindings),semicolon=bodyParser.take(';');bodyParser.end();
   return {kind:'original-generated-function',name:identifier,visibility:public_,attributes,parameters,returnType,body:{tree:body,result,semicolon},signatureAndCallOwnersResolved:false};
  }
  function item(){count(depth);const attributes=attrs(),public_=visibility();
   if(take('struct')){const identifier=name(),body=group('{'),child=parser(body.children,depth+1),fields=[];
    while(child.remaining()){const attributes=child.attrs(),public_=child.visibility(),identifier=child.name();child.need(':');fields.push({name:identifier,visibility:public_,attributes,type:child.type()});if(!child.take(',')){child.end();break;}}
    if(new Set(fields.map(field=>field.name.name)).size!==fields.length)outputFailure('duplicate original struct field');
    return {kind:'original-generated-record',name:identifier,visibility:public_,attributes,fields,tree:body,layoutAndAttributeOwnersResolved:false};
   }
   if(take('impl')){if(public_!==null)outputFailure('impl visibility unsupported');const target=type(),body=group('{'),child=parser(body.children,depth+1),methods=[];while(child.remaining())methods.push(child.method());return {kind:'original-generated-inherent-impl-syntax',attributes,target,methods,tree:body,implOwnerResolved:false};}
   outputFailure('unclosed original item grammar');
  }
  return {item,method,attrs,visibility,type,name,need,take,end,expression,updatePrefix,remaining:()=>at<nodes.length};
 }
 const cursor=parser(expansion.trees),items=[];while(cursor.remaining())items.push(cursor.item());cursor.end();
 declarativeExpansionOriginalInput(expansion,input);collectionSyntaxGuard();const proof=Object.freeze({schema:'private-original-compiler-item-output-v1'}),facts=freeze({schema:'original-compiler-item-output-v1',expansion,lineage,items,captures,wholeOutputSyntaxObserved:true,allOriginalTypeSlotsRetained:true,attributeOwnersResolved:false,constructorOwnersResolved:false,defaultOrUpdateSemanticsProved:false,completeDimensionalTheorem:false,namespaceAuthority:false,runtimeAuthority:false});
 itemOutputs.set(proof,{expansion,input,facts});return proof;
}
export function originalCompilerItemOutputFacts(proof,expansion,input){
 collectionSyntaxGuard();const state=itemOutputs.get(proof);if(!state||state.expansion!==expansion||state.input!==input)outputFailure('copied or foreign whole output observation');declarativeExpansionOriginalInput(expansion,input);collectionSyntaxGuard();return state.facts;
}
export function compileOriginalCompilerItemExpansion(compiler,path,name){
 collectionSyntaxGuard();const state=compilers.get(compiler);if(!state)outputFailure('original private compiler required');requireCompilerOutputAstSourceAccess(state.access,state.profile);
 if(typeof path!=='string'||typeof name!=='string'||!isPlainSourceIdentifier(name))outputFailure('original source member and macro identifier required');
 const original=state.access.original(path),roots=originalMacroTrees(original.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),sites=[];
 for(let at=0;at+2<roots.length;at++)if(roots[at].kind==='token'&&roots[at].text===name&&roots[at+1].text==='!'&&roots[at+2].kind==='group')sites.push({start:roots[at].span.start,end:roots[at+2].span.end,tree:roots[at+2]});
 if(sites.length!==1)outputFailure('one complete original root invocation required');
 const site=sites[0],invocation=originalMacroInvocation(original.source.slice(site.start,site.end)),definition=compileDeclarativeMacro(original.source,{name,owner:['original_compiler_candidate']}),header=declarativeDefinitionHeader(definition),expansion=expandDeclarativeMacro(definition,invocation.trees),output=observeOriginalCompilerItemOutput(expansion,invocation.trees),observed=originalCompilerItemOutputFacts(output,expansion,invocation.trees);
 const proof=Object.freeze({schema:'private-original-compiler-source-item-expansion-v1'}),facts=freeze({schema:'original-compiler-source-item-expansion-v1',source:original,site,invocation,definition,header,expansion,output:observed,sourceProfileSha256:state.access.sourceProfileSha256??null,registeredSourceSyntaxOnly:true,macroOwnerResolved:false,allMacroAttributeOwnersResolved:false,defaultOrUpdateSemanticsProved:false,completeDimensionalTheorem:false,namespaceAuthority:false,runtimeAuthority:false,worklist:COMPILER_OUTPUT_COLLECTION_WORKLIST});
 collectionSyntaxGuard();sourceItemOutputs.set(proof,{compiler,state,invocation,expansion,output,facts});return proof;
}
export function originalCompilerSourceItemExpansionFacts(proof,compiler){
 collectionSyntaxGuard();const state=sourceItemOutputs.get(proof);if(!state||state.compiler!==compiler||compilers.get(compiler)!==state.state)outputFailure('copied or foreign original source item expansion');requireCompilerOutputAstSourceAccess(state.state.access,state.state.profile);originalCompilerItemOutputFacts(state.output,state.expansion,state.invocation.trees);return state.facts;
}

// Mechanically bind an actual privately issued source call to an original
// builder recipe candidate. This does not establish that method's receiver or
// namespace ownership, or execute any unresolved call in the returned recipe.
const builderReturns=collectionSyntaxInitiallyNative?new WeakMap():null;
export function compileOriginalCompilerBuilderReturn(compiler,flow,callStart){
 collectionSyntaxGuard();const state=compilers.get(compiler),source=flows.get(flow);if(!state||source?.compiler!==compiler)outputFailure('original private source flow required');
 const facts=originalCompilerOutputFlowFacts(flow,compiler);if(!Number.isSafeInteger(callStart)||callStart<0)outputFailure('actual original call span required');
 const matches=[];let cells=0;
 function calls(value,depth=0){if(++cells>32000||depth>96)outputFailure('source-call association bound');if(!value||typeof value!=='object')return;if(value.kind==='source-method-call'&&value.tag==='open-source-expression'&&value.span.start===callStart)matches.push(value);for(const [key,child]of Object.entries(value))if(!['syntax','schema','import','typeSyntax'].includes(key))if(Array.isArray(child))for(const item of child)calls(item,depth+1);else calls(child,depth+1);}
 calls({tree:facts.program.tree,slots:facts.program.slots});if(matches.length!==1)outputFailure('one actual original source method occurrence required');
 const call=matches[0],builder=createBuiltinAstBuilderMetaCompiler(state.profile),contract=builder.compile(call.method),parameters=contract.parameters.filter(parameter=>!parameter.receiver);
 if(parameters.length!==call.args.length)outputFailure('original builder candidate arity differs');
 const bindings=parameters.map((parameter,index)=>({parameter,argument:call.args[index]})),values=new Map(bindings.map(row=>[row.parameter.name,row]));cells=0;
 function project(value,depth=0){if(++cells>32000||depth>96)outputFailure('complete constructor substitution bound');if(!value||typeof value!=='object')return value;if(Array.isArray(value))return value.map(child=>project(child,depth+1));
  if(value.tag==='bound-source-slot'){
   if(value.binding.kind==='local')return {tag:'original-builder-local-substitution',original:value,value:project(value.binding.value,depth+1),effectsProved:false};
   const binding=values.get(value.name);if(!binding)outputFailure('unproved original builder source slot');return {tag:'original-builder-argument-substitution',original:value,binding,argumentValueMeaningProved:false};
  }
  const result={};for(const [key,child]of Object.entries(value))result[key]=['syntax','import','variantSchema','fieldSchema','recipe'].includes(key)?child:project(child,depth+1);return result;
 }
 const result=project(contract.result),proof=Object.freeze({schema:'private-original-builder-return-candidate-v1'}),value=freeze({schema:'original-builder-return-candidate-v1',sourceCall:call,contract,bindings,result,sourceSlotsAssociated:true,builderCandidateOnly:true,actualMethodOwnerResolved:false,receiverTypeAndLifetimeProved:false,allCalleeEffectsProved:false,completeDimensionalTheorem:false,namespaceAuthority:false,runtimeAuthority:false});builder.assert(contract);originalCompilerOutputFlowFacts(flow,compiler);collectionSyntaxGuard();builderReturns.set(proof,{compiler,flow,builder,contract,value});return proof;
}
export function originalCompilerBuilderReturnFacts(proof,compiler,flow){collectionSyntaxGuard();const state=builderReturns.get(proof);if(!state||state.compiler!==compiler||state.flow!==flow)outputFailure('copied or foreign builder return candidate');originalCompilerOutputFlowFacts(flow,compiler);state.builder.assert(state.contract);return state.value;}
