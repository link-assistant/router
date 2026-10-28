// Qualified vector repetitions reuse actual fixed-array operand/type lowering.
// No native Clone implementation or dynamic allocation count is inferred here.
import {decodeRustInteger} from './extensions/rust-number.mjs';
import {FIXED_ARRAY_MAX_LENGTH} from './checked-types.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
const reject=(message,span)=>{throw unsupported('owned vector repetition',message,span);};
export function parseOwnedVectorRepeat(parser,path,macro){
 const cursor=parser.cursor,tokens=cursor.tokens,first=cursor.peek();
 if(!cursor.is('['))return null;
 const pairs={'[':']','(':')','{':'}'},stack=[];let repetition=false,complete=false;
 for(let at=cursor.index;at<tokens.length;at++){
  if(at-cursor.index>200000)reject('complete source scan exceeds its token bound',first);
  const token=tokens[at];if(['string','char','comment'].includes(token.kind))continue;
  const word=token.value;if(Object.hasOwn(pairs,word)){if(stack.length>=64)reject('source delimiter depth bound',first);stack.push(pairs[word]);}
  else if([']',')','}'].includes(word)){if(stack.pop()!==word)reject('source delimiter mismatch',token);if(!stack.length){complete=true;break;}}
  else if(word===';'&&stack.length===1)repetition=true;
 }
 if(!complete)reject('complete original invocation required',first);
 if(!repetition)return null;
 cursor.expect('[','owned vec repetition');const value=parser.expr(path);cursor.expect(';','owned vec repetition');const count=cursor.next();
 if(count.kind!=='number')reject('count requires a literal usize within the existing allocation bound',count);
 const integer=decodeRustInteger(count.raw??count.value,count);
 if(integer.suffix&&integer.suffix!=='usize')throw typeError('vector repetition count requires usize identity',count);
 const amount=BigInt(integer.value);if(amount<0n||amount>BigInt(FIXED_ARRAY_MAX_LENGTH))reject('count exceeds the existing allocation bound',count);
 const last=cursor.expect(']','owned vec repetition');return {k:'routerCoreVectorRepeat',value,length:Number(amount),sourceLength:{kind:count.kind,value:count.value,raw:count.raw??count.value,span:{start:count.start,end:count.end}},span:{start:macro.start,end:last.end}};
}
export function checkOwnedVectorRepeat(checker,node,env,path,expected,allowLiteral){
 if(expected&&(expected.kind!=='array'||expected.rustFixedArray||expected.rustArrayBorrowStorage||expected.rustOwnership?.kind!=='owned'||expected.rustOwnership.source!=='Vec'))throw typeError('vector repetition requires actual owned Vec result storage',node.span);
 const hint=expected?{kind:'array',element:expected.element}:undefined;
 const checked=checker.expr({...node,k:'routerFixedArrayRepeat'},env,path,hint,allowLiteral);
 if(checked.k!=='let'||checked.body?.k!=='array'||checked.body.items.length!==node.length)reject('requires the complete checked fixed-repeat operand lowering',node.span);
 const element=checked.body.type?.element;
 if(!element||element.rustReference||element.rustGenericIdentityUnresolved||element.rustBorrowingUnresolved||!(element.kind==='float'&&element.rustPrimitiveName==='f64'&&element.rustSourceType===true&&!element.rustOwnership&&!element.patternOwnershipRefusal||element.kind==='bool'||element.kind==='fixed'&&typeof element.rustPrimitiveName==='string'))reject('only checked Copy integer, f64 and bool elements are qualified; text, aggregate and custom Clone remain separate',node.span);
 const array={...checked.body};delete array.fixedArrayProof;delete array.repeatSeed;
 const type={kind:'array',element,rustOwnership:{kind:'owned',source:'Vec'},rustSourceType:true};
 return {checked,array:{...array,type,sourceRustOwnership:{kind:'owned',source:'Vec'},constEligible:false}};
}
