// Ordered language substitution: the original four-arm core method checks
// through ordinary tuple/match/string IR. There is no tagged-object deepEq.
import {BOOL} from '../checked-types.mjs';
import {metadataDigest} from './source-links.mjs';
import {typeError,TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
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
// A contextual constructor returns the portable data type in the base checker.
// Rejoin only that actual checked constructor to the already proved expected
// generic; every argument keeps its original checked type and ownership.
function contextualConstructor(checker,value,expected,path,span){
 if(canonical(checker,value.type)||value.k!=='ctor'||value.type?.kind!=='data'||value.type.rustStandardGeneric||value.type.rustReference||value.type.rustOwnership||value.type.patternOwnershipRefusal||value.type.rustGenericIdentityUnresolved||value.type.rustBorrowingUnresolved||value.type.name!==expected.name||value.data!==expected.name)return value;
 const entry=checker.items.get(expected.name),ctor=entry?.ctors.find(ctor=>ctor.name===value.ctor);if(!canonical(checker,expected)||!ctor||value.args.length!==ctor.fields.length)throw typeError('Original Option equality contextual constructor differs from its checked generic',span);
 optionPayload(checker,expected,path,span);for(let index=0;index<value.args.length;index++){const actual=value.args[index].type,wanted=checker.resolveType(ctor.fields[index].type,entry.modulePath,span);checker.expectedOwnership(actual,wanted,path,span);checker.expectedPrimitiveIdentity(actual,wanted,path,span);if(actual.kind!==wanted.kind)throw typeError('Original Option equality contextual field differs from its checked payload',span);}
 return {...value,type:{...value.type,rustSourceType:true,rustStandardGeneric:structuredClone(expected.rustStandardGeneric)}};
}
export function checkOriginalOptionEquality(checker,node,env,path,Parser){
 if(node?.k!=='binary'||node.op!=='eq'||!hasOriginalStandardCall(checker,node))return null;
 requireOriginalPrimitiveTryFromChecker(checker);if(checker.language!=='Rust')return null;
 let phase='candidate-types';
 try{
 const leftKnown=knownOption(checker,node.left,env,path),rightKnown=knownOption(checker,node.right,env,path);
 // This is candidate discovery only. All constructor resolution remains in
 // the normal source checker, and no spelling or public shape grants a type.
 if(!leftKnown&&!rightKnown&&!constructorSyntax(node.left)&&!constructorSyntax(node.right))return null;
 phase='source-call';
 requireOriginalStandardCall(checker,node);
 phase='left-expression';
 const initialLeft=checker.expr(node.left,env,path,rightKnown??undefined,true),left=rightKnown?contextualConstructor(checker,initialLeft,rightKnown,path,node.span):initialLeft;if(!canonical(checker,left.type))return null;
 phase='left-payload';
 const leftPayload=optionPayload(checker,left.type,path,node.span);if(leftPayload.owner!=='&str')return null;
 phase='right-expression';
 const right=contextualConstructor(checker,checker.expr(node.right,env,path,left.type,true),left.type,path,node.span);
 phase='right-payload';
 if(!canonical(checker,right.type)||optionPayload(checker,right.type,path,node.span).owner!=='&str')throw typeError('Original Option equality requires the same canonical borrowed-str specialization',node.span);
 phase='operand-joins';
 checker.expectedOwnership(right.type,left.type,path,node.span);checker.expectedPrimitiveIdentity(right.type,left.type,path,node.span);
 phase='original-method';
 const selection=pinnedOptionPartialEqBody();originalOptionPartialEqSource(selection);const original=parsePinnedBody(Parser,selection),values=[left,right],previous=operandsByChecker.get(checker);operandsByChecker.set(checker,{caller:node,values,digests:values.map(value=>metadataDigest(value))});
 phase='borrowed-body';
 try{const operands=values.map((value,index)=>originalStandardOperandLoan(checker,node,value,original,index)),checked=checkPinnedBorrowedMethod(checker,node,original,operands,BOOL,env);let body=checked.body;for(let index=checked.bindings.length-1;index>=0;index--)body={k:'let',name:checked.bindings[index].name,value:checked.bindings[index].value,body,type:BOOL,span:node.span};requireOriginalStandardCall(checker,node);return body;}
 finally{if(previous)operandsByChecker.set(checker,previous);else operandsByChecker.delete(checker);}
 }catch(error){if(!(error instanceof TranslationError))throw error;throw new TranslationError(error.kind,error.reason+' [original Option equality: '+phase+']',error.span,error.details);}
}
