// Ordered language substitution: the original four-arm core method checks
// through ordinary tuple/match/string IR. There is no tagged-object deepEq.
import {BOOL} from '../checked-types.mjs';
import {metadataDigest} from './source-links.mjs';
import {typeError} from '../vendor/meta-language/translation/diagnostics.js';
import {hasOriginalStandardCall,requireOriginalStandardCall} from './original-standard-calls.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './host-contracts.mjs';
import {pinnedOptionPartialEqBody,parsePinnedBody} from './standard-body-source.mjs';
import {originalOptionPartialEqSource} from './option-equality-source.mjs';
import {optionPayload} from './standard-body-checker.mjs';
import {originalStandardOperandLoan} from './standard-source-frame.mjs';
import {checkPinnedBorrowedMethod} from './standard-method-context.mjs';
const operandsByChecker=new WeakMap();
export function requireOriginalOptionEqualityOperand(checker,caller,index,value){requireOriginalPrimitiveTryFromChecker(checker);const active=operandsByChecker.get(checker);if(!active||active.caller!==caller||active.values[index]!==value||active.digests[index]!==metadataDigest(value))throw new TypeError('Original Option equality requires its actual privately checked operand association');requireOriginalStandardCall(checker,caller);}
const canonical=(checker,type)=>type?.kind==='data'&&!type.rustReference&&checker.items.get(type.name)?.standardGeneric?.kind==='Option'&&type.rustStandardGeneric?.kind==='Option';
function knownOption(checker,node,env,path){let type;if(node.k==='name'&&node.path?.length===1)type=env.get(node.path[0]);else if(node.k==='app'&&node.fn?.k==='name'&&!env.has(node.fn.path[0])){const entry=checker.lookup(node.fn.path,path,node.span);if(entry?.k==='fn')type=entry.ret;}return canonical(checker,type)?type:null;}
const constructorSyntax=node=>node.k==='routerRegisteredConstructor'&&node.kind==='Option'||node.k==='app'&&node.fn?.k==='name'&&['Some','None'].includes(node.fn.path?.at(-1))||node.k==='name'&&node.path?.at(-1)==='None';
export function checkOriginalOptionEquality(checker,node,env,path,Parser){
 if(node?.k!=='binary'||node.op!=='eq'||!hasOriginalStandardCall(checker,node))return null;
 requireOriginalPrimitiveTryFromChecker(checker);if(checker.language!=='Rust')return null;
 const leftKnown=knownOption(checker,node.left,env,path),rightKnown=knownOption(checker,node.right,env,path);
 // This is candidate discovery only. All constructor resolution remains in
 // the normal source checker, and no spelling or public shape grants a type.
 if(!leftKnown&&!rightKnown&&!constructorSyntax(node.left)&&!constructorSyntax(node.right))return null;
 requireOriginalStandardCall(checker,node);
 const left=checker.expr(node.left,env,path,rightKnown??undefined,true);if(!canonical(checker,left.type))return null;
 const leftPayload=optionPayload(checker,left.type,path,node.span);if(leftPayload.owner!=='&str')return null;
 const right=checker.expr(node.right,env,path,left.type,true);if(!canonical(checker,right.type)||optionPayload(checker,right.type,path,node.span).owner!=='&str')throw typeError('Original Option equality requires the same canonical borrowed-str specialization',node.span);
 checker.expectedOwnership(right.type,left.type,path,node.span);checker.expectedPrimitiveIdentity(right.type,left.type,path,node.span);
 const selection=pinnedOptionPartialEqBody();originalOptionPartialEqSource(selection);const original=parsePinnedBody(Parser,selection),values=[left,right],previous=operandsByChecker.get(checker);operandsByChecker.set(checker,{caller:node,values,digests:values.map(value=>metadataDigest(value))});
 try{const operands=values.map((value,index)=>originalStandardOperandLoan(checker,node,value,original,index)),checked=checkPinnedBorrowedMethod(checker,node,original,operands,BOOL,env);let body=checked.body;for(let index=checked.bindings.length-1;index>=0;index--)body={k:'let',name:checked.bindings[index].name,value:checked.bindings[index].value,body,type:BOOL,span:node.span};requireOriginalStandardCall(checker,node);return body;}
 finally{if(previous)operandsByChecker.set(checker,previous);else operandsByChecker.delete(checker);}
}
