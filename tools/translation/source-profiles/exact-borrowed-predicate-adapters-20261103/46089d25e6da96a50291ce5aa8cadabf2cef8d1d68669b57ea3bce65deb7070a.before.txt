// Original parser/checker fragments. Only the whole parent issuer grants IR.
import {BORROWED_STANDARD_MAP_LITERAL_PREDICATE as CONTRACT} from './borrowed-standard-map-20261103-contracts.mjs';
import {withBorrowedStandardMapNativeSourceABI,requireBorrowedStandardMapNativeSourceABI} from './borrowed-standard-map-20261103-native-abi.mjs';
import {requireBorrowedStandardTextMapType} from './borrowed-standard-map-20261103-native-types.mjs';
import {requireOriginalFromNamespaceCallbacks,requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {requireBorrowedString} from './extensions/string-iterators.mjs';
import {SOURCE_STR} from './extensions/source-contract-types.mjs';
import {BOOL,sameType} from './checked-types.mjs';
import {metadataDigest} from './extensions/source-links.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {router_borrowed_text_map_matches_literals as runtimePredicate} from './borrowed-standard-map-20261102-runtime.mjs';
const calls=new WeakMap(),words=CONTRACT.rustPath.split('::').flatMap((word,at)=>at?['::',word]:[word]);
const fail=message=>{throw TypeError('Borrowed standard-map caller: '+message);};
function native(parser,run){return withBorrowedStandardMapNativeSourceABI(parser,receipt=>{requireBorrowedStandardMapNativeSourceABI(receipt,{parser});return run(receipt);});}
export function parseForwardBorrowedStandardMap(parser,path){
 requireOriginalFromNamespaceCallbacks(parser);const c=parser.cursor;
 if(!words.every((word,at)=>c.is(word,at)))return null;
 const tokens=c.tokens,start=c.index,frame=matchesParserFacts(parser),first=c.peek();let end=null;
 return withCompleteSourceClosingFence(()=>native(parser,()=>{
  c.index+=words.length;c.expect('(','borrowed standard-map predicate');const args=[];
  while(!c.is(')')){if(args.length>=3)fail('exact native predicate arity required');args.push(parser.expr(path));if(!c.eat(','))break;}
  const last=c.expect(')','borrowed standard-map predicate');end=c.index;if(args.length!==3)fail('exact native predicate arity required');
  const node={k:'routerCoreJsonUpdateCall',operation:CONTRACT.javascriptName,args,span:{start:first.start,end:last.end}};
  calls.set(node,{parser,frame,snapshot:metadataDigest(node)});return {node,sourceAuthority:false,semanticAuthority:false};
 }),[()=>withSourceInputValidation(()=>{requireOriginalFromNamespaceCallbacks(parser);if(matchesParserFacts(parser)!==frame||parser.cursor!==c||c.tokens!==tokens||end!==null&&c.index!==end||c.index<start||c.index>tokens.length)fail('original predicate parser/cursor changed');})]);
}
function literalItems(syntax){
 if(syntax?.k!=='routerSharedArrayLiteral'||!Array.isArray(syntax.sourceArrayBorrow?.tokens)||syntax.sourceArrayBorrow.tokens[0]?.value!=='&'||syntax.value?.k!=='array'||!Array.isArray(syntax.value.items)||syntax.value.items.length>CONTRACT.maximumLiteralCount)fail('actual written shared bounded literal slice required');
 return syntax.value.items.map(item=>{if(item.spread||item.value?.k!=='lit'||typeof item.value.value!=='string')fail('pure native text literal slice required');return item.value;});
}
function scalar(value){if(typeof value!=='string')fail('primitive original scalar literal required');for(const point of value){const code=point.codePointAt(0);if(code>=0xd800&&code<=0xdfff)fail('unpaired native literal surrogate');}return value;}
export function checkForwardBorrowedStandardMap(checker,node,env,path,expected,{current,sourceNode=node}={}){
 requireOriginalPrimitiveTryFromChecker(checker);const original=calls.get(sourceNode);
 if(!original||metadataDigest(sourceNode)!==original.snapshot||node.operation!==CONTRACT.javascriptName||!Array.isArray(node.args)||node.args.length!==3)fail('genuine original parsed predicate required');
 const snapshot=metadataDigest(node),close=()=>withSourceInputValidation(()=>{requireOriginalPrimitiveTryFromChecker(checker);current();if(metadataDigest(node)!==snapshot||metadataDigest(sourceNode)!==original.snapshot||matchesParserFacts(original.parser)!==original.frame)fail('actual predicate source/caller changed');native(original.parser,()=>null);});
 return withCompleteSourceClosingFence(()=>{
  close();const syntax=literalItems(node.args[2]),map=checker.expr(node.args[0],env,path);requireBorrowedStandardTextMapType(map.type);close();
  const key=checker.expr(node.args[1],env,path,SOURCE_STR);requireBorrowedString(key.type,node.args[1].span);checker.expectedOwnership(key.type,SOURCE_STR,path,node.args[1].span);close();
  const literals=[];for(const item of syntax){const value=checker.expr(item,env,path,SOURCE_STR);requireBorrowedString(value.type,item.span);checker.expectedOwnership(value.type,SOURCE_STR,path,item.span);if(value.k!=='lit'||scalar(value.value)!==item.value)fail('actual checked scalar literal required');literals.push(value);}close();
  if(expected){if(!sameType(BOOL,expected))fail('bool result expected');checker.expectedOwnership(BOOL,expected,path,node.span);checker.expectedPrimitiveIdentity(BOOL,expected,path,node.span);}
  return {k:'routerHostCall',id:CONTRACT.javascriptName,args:[map,key,...literals],type:BOOL,span:node.span,constEligible:false};
 },[close]);
}
/** The extra operands are independently checked pure literals, not an owned Vec. */
export function emitForwardBorrowedStandardMap(emitter,node,{requireCurrentPrivateCall}={}){
 requireCurrentPrivateCall(node);
 if(node.k!=='routerHostCall'||node.id!==CONTRACT.javascriptName||node.args.length<2||node.args.length>66)fail('complete checked literal-predicate operands required');
 requireBorrowedStandardTextMapType(node.args[0].type);
 for(const literal of node.args.slice(2)){if(literal.k!=='lit')fail('checked literal operand required');scalar(literal.value);}
 const result='ml_host_'+CONTRACT.javascriptName+'('+emitter.expr(node.args[0])+', '+emitter.expr(node.args[1])+', ['+node.args.slice(2).map(literal=>emitter.expr(literal)).join(', ')+'])';
 requireCurrentPrivateCall(node);(emitter.borrowedStandardMaps??=new Set()).add(CONTRACT.javascriptName);return result;
}
export function borrowedStandardMapForwardImports(names,runtimeModule='./runtime/borrowed-standard-map-20261102-runtime.mjs'){
 if(!names?.size)return [];if(names.size!==1||!names.has(CONTRACT.javascriptName)||typeof runtimeModule!=='string')fail('fixed original borrowed-map runtime import required');
 return ['import { '+CONTRACT.javascriptName+' as ml_host_'+CONTRACT.javascriptName+' } from '+JSON.stringify(runtimeModule)+';'];
}
/** Shared adapter for both real interpreters, after their private caller check. */
export function interpretForwardBorrowedStandardMap(node,evaluate,{requireCurrentPrivateCall}={}){
 const snapshot=metadataDigest(node);
 const sourceCurrent=()=>withSourceInputValidation(()=>{requireCurrentPrivateCall(node);if(metadataDigest(node)!==snapshot)fail('checked predicate changed during interpretation');});
 const typeCurrent=()=>requireBorrowedStandardTextMapType(node.args[0].type);
 return withCompleteSourceClosingFence(()=>{
  sourceCurrent();if(node.k!=='routerHostCall'||node.id!==CONTRACT.javascriptName||node.args.length<2||node.args.length>66)fail('whole checked predicate required');typeCurrent();
  for(const literal of node.args.slice(2)){if(literal.k!=='lit')fail('pure checked literal required');scalar(literal.value);}
  const values=[];for(const argument of node.args)values.push(evaluate(argument));sourceCurrent();typeCurrent();
  return runtimePredicate(values[0],values[1],values.slice(2));
 },[sourceCurrent,typeCurrent]);
}
