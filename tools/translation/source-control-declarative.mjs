// Candidate control only. Original AST fragments stay opaque through the real
// declarative matcher/transcriber; this grants no caller macro owner authority.
import {createHash} from 'node:crypto';
import {HostRustParser} from './extensions/host-contracts.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {originalMacroInvocation,freezeMacroTree} from './macro-token-trees.mjs';
import {createOriginalMacroFragmentContext,originalMacroFragmentAst} from './source-macro-fragments.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeExpansionLineage} from './declarative-macros.mjs';
import {loadStandardMatchesSourceProfile,standardMatchesOriginalDefinition} from './matches-source-profile.mjs';
const proofs=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('original declarative control: '+message);};
const operators={and:'&&',or:'||',eq:'==',ne:'!=',lt:'<',le:'<=',gt:'>',ge:'>=',add:'+',sub:'-',mul:'*',div:'/',rem:'%'};
function expression(ast,origin,depth=0){
 if(depth>64)fail('opaque expression depth');const node=(kind,fields)=>({kind,...fields,sourceSpan:ast.span,sourceOrigins:[origin],namespaceAuthority:false}),child=value=>expression(value,origin,depth+1);
 if(ast.k==='name')return node('written-path',{path:ast.path,ownerResolved:false});
 if(['bool','str','num'].includes(ast.k))return node('literal',{raw:ast.k==='str'?JSON.stringify(ast.value):String(ast.value),sourceLiteralKind:ast.k});
 if(ast.k==='binary'&&operators[ast.op])return node('binary',{operation:operators[ast.op],left:child(ast.left),right:child(ast.right),operatorOwnerResolved:false});
 if(ast.k==='unary'&&['not','neg'].includes(ast.op))return node('unary',{operation:ast.op==='not'?'!':'-',value:child(ast.arg),operatorOwnerResolved:false});
 if(ast.k==='routerField')return node('field',{object:child(ast.object),name:ast.field,fieldOwnerResolved:false});
 // Preserve the actual generic method AST, including its original spelling;
 // the bounded machine still refuses methods outside its existing operations.
 if(ast.k==='routerDispatchMethod')return node('call',{callee:node('field',{object:child(ast.object),name:ast.method,fieldOwnerResolved:false}),arguments:ast.args.map(child),calleeOwnerResolved:false});
 if(ast.k==='routerStringOperation'&&ast.op==='is_empty')return node('call',{callee:node('field',{object:child(ast.object),name:ast.op,fieldOwnerResolved:false}),arguments:[],calleeOwnerResolved:false});
 fail('opaque original expression requires additional grammar: '+ast.k);
}
export function expandOriginalControlDeclarative(source,macro){
 if(typeof source!=='string'||macro?.kind!=='opaque-macro'||macro.path.length!==1)fail('complete original helper and bounded macro node required');
 const {start,end}=macro.sourceSpan;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end>source.length)fail('original invocation span');
 const profile=loadStandardMatchesSourceProfile();if(macro.path[0]!==profile.name)fail('unresolved original macro '+macro.path.join('::'));
 const invocation=originalMacroInvocation(source.slice(start,end));if(invocation.path.join('::')!==profile.name)fail('source invocation differs');
 // No parser instance or parser method is captured at module initialization.
 const parser=new HostRustParser(tokenizeRust(source)),fragments=createOriginalMacroFragmentContext(parser,invocation.trees,{sourceStart:start,definitionProfile:profile});
 const definitionSource=standardMatchesOriginalDefinition(profile),definition=compileDeclarativeMacro(definitionSource,{name:profile.name,owner:['core'],sourceFragments:fragments}),expansion=expandDeclarativeMacro(definition,invocation.trees),lineage=declarativeExpansionLineage(expansion);
 if(lineage.parent!==null||lineage.depth!==0||lineage.definition.sourceSha256!==profile.definition.sha256||expansion.input.sha256!==invocation.sourceSha256)fail('foreign expansion lineage');
 const slots=new WeakMap(),origins=[];let cells=0;
 const visit=tree=>{
  if(++cells>8192)fail('expanded control cell bound');
  if(tree.kind==='fragment'){
   const capture=tree.sourceAstCapture,ast=originalMacroFragmentAst(fragments,capture);if(capture.fragment!==tree.fragment||capture.originalSourceSha256!==invocation.sourceSha256||capture.span.start<start||capture.span.end>end)fail('foreign opaque original capture');
   const origin={kind:'original-invocation-fragment',sourceSha256:hash(source),invocationSha256:invocation.sourceSha256,fragment:tree.fragment,span:capture.span},slot={kind:'original-control-ast-slot',fragment:tree.fragment,span:capture.span,sourceOrigins:[origin]};
   slots.set(slot,freezeMacroTree({fragment:tree.fragment,ast,ir:tree.fragment==='expr'?expression(ast,origin):null}));origins.push(origin);return slot;
  }
  if(!['token','group'].includes(tree.kind))fail('unknown expanded token kind');const span=tree.span??tree.sourceSyntax?.span;if(!span||span.start<0||span.end>definitionSource.length)fail('generated token original definition span');
  if(tree.kind==='token'&&definitionSource.slice(span.start,span.end)!==tree.text)fail('generated token differs from definition');
  const origin={kind:'original-definition',sourcePath:profile.definition.sourcePath,sourceSha256:profile.sources.find(pin=>pin.sourcePath===profile.definition.sourcePath).sha256,span:{start:profile.definition.span.start+span.start,end:profile.definition.span.start+span.end}};origins.push(origin);
  return {...tree,sourceOrigins:[origin],...(tree.kind==='group'?{children:tree.children.map(visit)}:{})};
 };
 const trees=expansion.trees.map(visit),proof=freezeMacroTree({schema:'original-declarative-control-candidate-v1',original:source.slice(start,end),sourceSha256:hash(source),sourceSpan:{start,end},profile,definitionSource,expansion,trees,origins,macroOwnerResolved:false,namespaceAuthority:false,typeAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
 proofs.set(proof,{source,macro,slots,trees});return proof;
}
function state(proof,source,macro){const facts=proofs.get(proof);if(!facts||facts.source!==source||facts.macro!==macro)fail('copied or foreign expansion proof');return facts;}
export function originalControlDeclarativeFacts(proof,source,macro){return Object.freeze({trees:state(proof,source,macro).trees});}
export function originalControlDeclarativeSlot(proof,source,macro,tree){const slot=state(proof,source,macro).slots.get(tree);if(!slot)fail('foreign or copied original AST slot');return slot;}
