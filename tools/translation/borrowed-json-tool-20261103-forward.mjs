// Original parser/checker fragments; only the complete parent issuer grants IR.
import {BORROWED_JSON_TOOL_PREDICATE as CONTRACT} from './borrowed-json-tool-20261103-contracts.mjs';
import {borrowedPredicateNativeArity} from './borrowed-predicate-operation-descriptions-20261103.mjs';
import {withBorrowedJsonToolNativeSourceABI,requireBorrowedJsonToolNativeSourceABI} from './borrowed-json-tool-20261103-native-abi.mjs';
import {requireBorrowedJsonToolType} from './borrowed-json-tool-20261103-native-types.mjs';
import {requireOriginalFromNamespaceCallbacks,requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {BOOL,sameType} from './checked-types.mjs';
import {metadataDigest} from './extensions/source-links.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {borrowedJsonToolIsTranslatable as predicate} from './borrowed-json-tool-predicate-20261103-runtime.mjs';
const calls=new WeakMap(),words=CONTRACT.rustPath.split('::').flatMap((word,at)=>at?['::',word]:[word]);
const fail=message=>{throw TypeError('Original borrowed JSON predicate: '+message);};
function native(parser,run){return withBorrowedJsonToolNativeSourceABI(parser,receipt=>{requireBorrowedJsonToolNativeSourceABI(receipt,{parser});return run(receipt);});}
export function parseForwardBorrowedJsonTool(parser,path){
 requireOriginalFromNamespaceCallbacks(parser);const c=parser.cursor;if(!words.every((word,at)=>c.peek(at)?.kind===(word==='::'?'punct':'identifier')&&c.is(word,at)))return null;
 const tokens=c.tokens,start=c.index,frame=matchesParserFacts(parser),first=c.peek();let end=null;
 return withCompleteSourceClosingFence(()=>native(parser,()=>{
  c.index+=words.length;c.expect('(','original borrowed JSON predicate');const argument=parser.expr(path);c.eat(',');const last=c.expect(')','original borrowed JSON predicate');end=c.index;const node={k:'routerCoreJsonUpdateCall',operation:CONTRACT.javascriptName,args:[argument],span:{start:first.start,end:last.end}};calls.set(node,{parser,frame,snapshot:metadataDigest(node)});return {node,sourceAuthority:false,semanticAuthority:false};
 }),[()=>withSourceInputValidation(()=>{requireOriginalFromNamespaceCallbacks(parser);if(matchesParserFacts(parser)!==frame||parser.cursor!==c||c.tokens!==tokens||end!==null&&c.index!==end||c.index<start||c.index>tokens.length)fail('original parser/cursor/source association changed');})]);
}
export function checkForwardBorrowedJsonTool(checker,node,env,path,expected,{current,sourceNode=node}={}){
 requireOriginalPrimitiveTryFromChecker(checker);const original=calls.get(sourceNode);if(!original||metadataDigest(sourceNode)!==original.snapshot||node.operation!==CONTRACT.javascriptName||node.args.length!==borrowedPredicateNativeArity(CONTRACT.id))fail('genuine original parsed predicate required');const snapshot=metadataDigest(node);
 const close=()=>withSourceInputValidation(()=>{requireOriginalPrimitiveTryFromChecker(checker);current();if(metadataDigest(node)!==snapshot||metadataDigest(sourceNode)!==original.snapshot||matchesParserFacts(original.parser)!==original.frame)fail('whole original predicate/caller association changed');native(original.parser,()=>null);});
 return withCompleteSourceClosingFence(()=>{close();const value=checker.expr(node.args[0],env,path);requireBorrowedJsonToolType(value.type);close();if(expected){if(!sameType(BOOL,expected))fail('original boolean result required');checker.expectedOwnership(BOOL,expected,path,node.span);checker.expectedPrimitiveIdentity(BOOL,expected,path,node.span);}return {k:'routerHostCall',id:CONTRACT.javascriptName,args:[value],type:BOOL,span:node.span,constEligible:false};},[close]);
}
export function emitForwardBorrowedJsonTool(emitter,node,{requireCurrentPrivateCall}={}){
 requireCurrentPrivateCall(node);if(node.k!=='routerHostCall'||node.id!==CONTRACT.javascriptName||node.args.length!==borrowedPredicateNativeArity(CONTRACT.id))fail('complete original checked predicate required');requireBorrowedJsonToolType(node.args[0].type);const value='ml_host_'+CONTRACT.javascriptName+'('+emitter.expr(node.args[0])+')';requireCurrentPrivateCall(node);(emitter.borrowedJsonTools??=new Set()).add(CONTRACT.javascriptName);return value;
}
export function borrowedJsonToolForwardImports(names,runtimeModule='./runtime/'+CONTRACT.runtimeModule){
 if(!names?.size)return [];if(names.size!==1||!names.has(CONTRACT.javascriptName)||typeof runtimeModule!=='string')fail('fixed original JSON runtime import required');return ['import { '+CONTRACT.javascriptName+' as ml_host_'+CONTRACT.javascriptName+' } from '+JSON.stringify(runtimeModule)+';'];
}
export function interpretForwardBorrowedJsonTool(node,evaluate,{requireCurrentPrivateCall}={}){
 const snapshot=metadataDigest(node),current=()=>withSourceInputValidation(()=>{requireCurrentPrivateCall(node);if(metadataDigest(node)!==snapshot)fail('checked JSON predicate changed during interpretation');});const typeCurrent=()=>requireBorrowedJsonToolType(node.args[0].type);
 return withCompleteSourceClosingFence(()=>{current();if(node.k!=='routerHostCall'||node.id!==CONTRACT.javascriptName||node.args.length!==borrowedPredicateNativeArity(CONTRACT.id))fail('whole original checked JSON predicate required');typeCurrent();const input=evaluate(node.args[0]);current();typeCurrent();return predicate(input);},[current,typeCurrent]);
}
