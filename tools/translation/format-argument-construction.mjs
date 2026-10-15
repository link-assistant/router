// Source control and private caller-AST association only. This module is not a
// Host admission hook; unresolved original macros/callees retain their effects.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {formatConstructorInputSource} from './format-constructor-inputs.mjs';
import {sourceItems} from './rust-structure.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {compileSymbolicControlSyntax} from './builtin-source-control.mjs';
import {compileFormatSourceControlBodies,executeFormatSourceControlBodies} from './source-format-template.mjs';
import {isOriginalFormatExplicitArguments,originalFormatExplicitArgumentAst} from './format-explicit-arguments.mjs';
const originals=new WeakMap(),associations=new WeakMap(),candidates=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Original format argument construction: '+message);};
const boundaries={originalCompilerControlExecuted:false,parseArgsControlExecuted:false,argumentAddControlExecuted:false,evaluationOrderVerified:false,expressionEffectsClosed:false,borrowLifetimeVerified:false,noDropAuthority:false,callerMacroOwnerResolved:false,namespaceAuthority:false,runtimeAuthority:false,runtimeParity:false};
function selectedFunction(origin,sourcePath,name,owner){
 const found=[];
 function scan(source,offset,enclosing){
  for(const item of sourceItems(source)){
   if(item.comment)continue;
   const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.find(token=>token.text==='{'),close=tokens.at(-1);
   if(item.term==='fn'&&item.name===name&&enclosing?.owner===owner){
    if(!open||close?.text!=='}')fail('complete original function body required');
    const span={start:offset+item.start,end:offset+item.end},bodySpan={start:offset+open.start,end:offset+close.end};
    found.push({sourcePath,sourceSha256:hash(origin.source),name,owner,span,bodySpan,original:origin.source.slice(span.start,span.end),body:origin.source.slice(bodySpan.start,bodySpan.end),enclosingOriginal:enclosing.original,enclosingSpan:enclosing.span});
   }
   if(item.term==='impl'&&open&&close?.text==='}'){
    const header=tokens.filter(token=>token.start<open.start).map(token=>token.text);
    // Plain inherent impl selection, never a type-name namespace assertion.
    const owner=header.length===2&&header[0]==='impl'?header[1]:null;
    const span={start:offset+item.start,end:offset+item.end};
    scan(source.slice(open.end,close.start),offset+open.end,{owner,span,original:origin.source.slice(span.start,span.end)});
   }
  }
 }
 scan(origin.source,0,{owner:null,span:{start:0,end:origin.source.length},original:origin.source});
 if(found.length!==1)fail('original function absent or ambiguous: '+sourcePath+'::'+String(owner)+'::'+name);
 const row=found[0];return freezeMacroTree({...row,sha256:hash(row.original),bodySha256:hash(row.body),control:compileSymbolicControlSyntax(row.body)});
}
function walk(value,visit,depth=0){
 if(depth>96)fail('control inspection depth bound');if(!value||typeof value!=='object')return;
 visit(value);if(Array.isArray(value)){for(const child of value)walk(child,visit,depth+1);}else for(const child of Object.values(value))walk(child,visit,depth+1);
}
function unresolvedControls(helpers){
 const rows=[];
 for(const helper of helpers){
  if(!helper.control.controlSyntaxProjected)rows.push({helper:helper.name,owner:helper.owner,kind:'original-control-grammar',diagnostics:helper.control.diagnostics});
  walk(helper.control.ir,node=>{
   if(node.kind==='opaque-macro')rows.push({helper:helper.name,owner:helper.owner,kind:'original-macro-output-and-effects',path:node.path,sourceSpan:node.sourceSpan,originalNode:node});
   if(node.kind==='call')rows.push({helper:helper.name,owner:helper.owner,kind:'original-callee-effects-and-return',sourceSpan:node.sourceSpan,originalNode:node});
   if(node.kind==='unary'&&node.operation==='&')rows.push({helper:helper.name,owner:helper.owner,kind:'original-borrow-and-temporary-lifetime',sourceSpan:node.sourceSpan,originalNode:node});
  });
 }
 return rows;
}
function originState(program){const state=originals.get(program);if(!state)fail('copied or foreign original construction control');return state;}
function validateOriginal(state){
 for(const row of state.sources){const actual=formatConstructorInputSource(state.constructor,state.inputs,state.proof,row.path);if(actual.source!==row.source)fail('original constructor source changed');}
}
/** Retain each complete original helper/control, including error and recovery
 * branches. Projection is not execution, namespace, borrowing or Drop proof. */
export function compileOriginalFormatArgumentConstruction(constructor,inputs,proof){
 const ast='compiler/rustc_ast/src/format.rs',builtin='compiler/rustc_builtin_macros/src/format.rs',lowering='compiler/rustc_ast_lowering/src/format.rs';
 const sources=[ast,builtin,lowering].map(path=>({path,...formatConstructorInputSource(constructor,inputs,proof,path)}));
 const source=path=>sources.find(row=>row.path===path);
 const helpers=[...['new','add','by_name','by_index','unnamed_args','named_args','explicit_args','all_args'].map(name=>selectedFunction(source(ast),ast,name,'FormatArguments')),selectedFunction(source(ast),ast,'ident','FormatArgumentKind'),selectedFunction(source(builtin),builtin,'parse_args',null),selectedFunction(source(lowering),lowering,'expand_format_args',null),selectedFunction(source(lowering),lowering,'make_argument',null)];
 const result=freezeMacroTree({schema:'original-format-argument-construction-controls-v1',sources,helpers,unresolvedControls:unresolvedControls(helpers),completeOriginalDeclarationsRetained:true,controlSyntaxProjected:helpers.every(row=>row.control.controlSyntaxProjected),...boundaries});
 originals.set(result,{constructor,inputs,proof,sources,helpers});return result;
}
export function originalFormatArgumentConstructionFacts(program){const state=originState(program);validateOriginal(state);return Object.freeze({helpers:program.helpers,sources:program.sources,unresolvedControls:program.unresolvedControls});}
/** Associate genuine caller ASTs without executing, reordering or evaluating
 * them. The original parser's add branches and lowering stay full obligations. */
export function associateOriginalFormatArgumentConstruction(program,argumentsPlan,parser){
 const state=originState(program);validateOriginal(state);
 if(!isOriginalFormatExplicitArguments(argumentsPlan))fail('copied or foreign explicit argument association');
 const args=argumentsPlan.arguments.map((row,index)=>({index,name:row.name,span:row.span,original:row.original,ast:originalFormatExplicitArgumentAst(argumentsPlan,parser,index)}));
 const parseArgs=state.helpers.find(row=>row.name==='parse_args'),add=state.helpers.find(row=>row.name==='add');
 const result=freezeMacroTree({schema:'original-format-argument-construction-association-v1',sourceSha256:argumentsPlan.sourceSha256,invocationSha256:argumentsPlan.invocationSha256,macroSpan:argumentsPlan.macroSpan,template:argumentsPlan.template,arguments:args,writtenArgumentOrder:args.map(row=>row.index),parseArgs,add,lowering:state.helpers.filter(row=>row.sourcePath.includes('ast_lowering')),callerAstAssociationVerified:true,constructionControl:program,...boundaries});
 associations.set(result,{program,argumentsPlan,parser,args});return result;
}
export function originalFormatArgumentConstructionAssociation(association,program,parser){
 const state=associations.get(association);if(!state||state.program!==program||state.parser!==parser)fail('copied or foreign construction association');
 originalFormatArgumentConstructionFacts(program);
 for(const row of state.args)if(originalFormatExplicitArgumentAst(state.argumentsPlan,parser,row.index)!==row.ast)fail('original expression AST changed');
 return association;
}
/** Executable generic authored control fixture. Original compiler controls do
 * not pass through this separate issuer and gain no execution authority. */
export function compileFormatArgumentControlCandidate(sources){
 const machine=compileFormatSourceControlBodies(sources),result=freezeMacroTree({schema:'format-argument-authored-control-candidate-v1',machine,...boundaries});candidates.set(result,machine);return result;
}
function values(args){
 let cells=0,bytes=0;
 const copy=(value,depth=0)=>{
  if(depth>64)fail('candidate value depth bound');
  if(++cells>4096)fail('candidate value cell bound');
  if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isSafeInteger(value))return value;
  if(typeof value==='string'){bytes+=Buffer.byteLength(value);if(bytes>32768)fail('candidate value byte bound');return value;}
  if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('candidate values must be scalar or ordinary dense arrays');
  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors);if(keys.length!==value.length+1||!Object.hasOwn(descriptors,'length')||!Object.hasOwn(descriptors.length,'value'))fail('candidate array descriptors');
  const out=[];for(let index=0;index<value.length;index++){if(!Object.hasOwn(descriptors,String(index)))fail('candidate dense own values required');const descriptor=descriptors[index];if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)fail('candidate dense own values required');out.push(copy(descriptor.value,depth+1));}return out;
 };
 if(!Array.isArray(args)||types.isProxy(args))fail('candidate argument array required');return copy(args);
}
export function executeFormatArgumentControlCandidate(program,entry,args){
 const machine=candidates.get(program);if(!machine)fail('copied or foreign authored control candidate');
 const execution=executeFormatSourceControlBodies(machine,entry,values(args));return freezeMacroTree({schema:'executed-format-argument-authored-control-v1',entry,execution,authoredControlExecuted:true,...boundaries});
}
