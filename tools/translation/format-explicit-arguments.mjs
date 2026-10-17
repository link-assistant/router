// Genuine Host expression intervals for explicit format arguments. Syntax
// association alone grants no macro owner, borrowing, Drop or runtime proof.
import {createHash} from 'node:crypto';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {originalMethodParserTokenContext} from './source-method-transforms.mjs';
import {originalMacroInvocation,freezeMacroTree} from './macro-token-trees.mjs';
import {createOriginalMacroFragmentContext,parseOriginalMacroFragment,originalMacroFragmentAst,originalMacroFragmentParser} from './source-macro-fragments.mjs';
const plans=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Original explicit format arguments: '+message);};
export function captureOriginalFormatExplicitArguments(parser,macroSpan){
  // No Host instance or parser method is captured during module initialization.
  const source=capturedRustTokenSource(parser?.cursor?.tokens)??originalMethodParserTokenContext(parser?.cursor?.tokens);
  if(!source||!Number.isSafeInteger(macroSpan?.start)||!Number.isSafeInteger(macroSpan?.end)||macroSpan.start<0||macroSpan.end<=macroSpan.start||macroSpan.end>source.source.length)fail('genuine original invocation span required');
  const original=source.source.slice(macroSpan.start,macroSpan.end),invocation=originalMacroInvocation(original),trees=invocation.trees;
  const context=createOriginalMacroFragmentContext(parser,trees,{sourceStart:macroSpan.start});
  if(trees[0]?.kind!=='token'||trees[0].type!=='string')fail('direct original string literal required');
  const template=trees[0],rows=[],starts=[],names=new Set();let at=1,named=false;
  while(at<trees.length){
    if(trees[at++]?.text!==',')fail('original argument separator required');
    if(at===trees.length)break;
    if(rows.length>=128)fail('explicit argument count budget');
    let name=null,nameSpan=null;
    if(trees[at]?.kind==='token'&&trees[at].type==='ident'&&trees[at+1]?.text==='='){
      const token=trees[at];name=token.text;
      if(names.has(name))fail('duplicate original named argument');
      names.add(name);named=true;nameSpan={start:macroSpan.start+token.span.start,end:macroSpan.start+token.span.end};at+=2;
    }else if(named)fail('original positional argument follows named argument');
    if(at>=trees.length)fail('original argument expression required');
    starts.push(at);const parsed=parseOriginalMacroFragment(context,'expr',trees,at),ast=originalMacroFragmentAst(context,parsed.capture);
    if(parsed.end<=at||parsed.end<trees.length&&trees[parsed.end]?.text!==',')fail('original expression leaves argument tokens');
    const span=parsed.capture.span;
    rows.push({index:rows.length,name,nameSpan,span,original:source.source.slice(span.start,span.end),capture:parsed.capture,ast});at=parsed.end;
  }
  if(!rows.length)fail('at least one explicit original argument required');
  const plan=freezeMacroTree({schema:'original-format-explicit-argument-asts-v1',sourceSha256:hash(source.source),invocationSha256:invocation.sourceSha256,macroSpan:{start:macroSpan.start,end:macroSpan.end},template,arguments:rows,sourceOrder:rows.map(row=>row.index),expressionAstAssociationVerified:true,constructorControlExecuted:false,evaluationOrderVerified:false,borrowLifetimeVerified:false,noDropAuthority:false,callerMacroOwnerResolved:false,namespaceAuthority:false,runtimeParity:false});
  plans.set(plan,{parser,context,source,invocation,rows,starts});return plan;
}
export const isOriginalFormatExplicitArguments=value=>!!value&&plans.has(value);
export function originalFormatExplicitArgumentAst(plan,parser,index){
  const state=plans.get(plan);if(!state||state.parser!==parser||originalMacroFragmentParser(state.context)!==parser)fail('copied or foreign original argument association');
  const row=state.rows[index];if(!Number.isSafeInteger(index)||index<0||!row)fail('original argument index required');
  // Fresh genuine parser validation also detects changed prototypes, methods,
  // source token frames and module scope; no public receipt fields are trusted.
  const parsed=parseOriginalMacroFragment(state.context,'expr',state.invocation.trees,state.starts[index]);
  const ast=originalMacroFragmentAst(state.context,parsed.capture);
  if(hash(JSON.stringify(ast))!==hash(JSON.stringify(row.ast)))fail('original argument AST changed');
  return row.ast;
}
