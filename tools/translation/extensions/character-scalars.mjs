// A Rust char is one Unicode scalar, distinct from str/String and integers.
// Its checked target value is a scalar string; this is never string coercion.
import {decodeRustCharacter} from './rust-character.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {FIXED_ARRAY_MAX_LENGTH} from '../checked-types.mjs';

export const CHARACTER=Object.freeze({kind:'char'});
const trims=new Set(['trim_start_matches','trim_end_matches','trim_matches']);
const borrowedText=type=>type?.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&!type.rustReference&&!type.patternOwnershipRefusal;
const location=(first,last)=>({start:first.start,end:last.end});
const nonlocal=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue','routerTry','routerAwait'].includes(node.k)||Object.entries(node).some(([key,value])=>!['type','span'].includes(key)&&(Array.isArray(value)?value.some(nonlocal):nonlocal(value))));
export function checkedCharacterType(type,span){
  if(type?.kind!=='char'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('character scalar type','requires an actual by-value Unicode scalar, without erased borrowing or integer/string conversion',span);
  return type;
}
export function assertCharacterBoundary(actual,expected,span){
  if(actual?.kind==='char')checkedCharacterType(actual,span);
  if(expected?.kind==='char')checkedCharacterType(expected,span);
  if(actual&&expected&&(actual.kind==='char')!==(expected.kind==='char'))throw typeError('Rust character scalar identity differs from the expected value type',span);
}
export function parseCharacterType(parser){
  const c=parser.cursor;
  if(c.peek().kind!=='identifier'||!c.is('char')||parser.builtinShadow('char',parser.modulePath))return null;
  const token=c.next();return {...CHARACTER,rustSourceType:true,sourceCharacterType:{span:location(token,token)}};
}
export function needsCharacterValueGuard(type){return type?.kind==='char'||type?.kind==='array'&&needsCharacterValueGuard(type.element);}
export function requireCharacterLiteral(node){
  checkedCharacterType(node?.type,node?.span);
  const raw=node.raw,span=node.span;
  if(node.k!=='routerCharacterLiteral'||typeof raw!=='string'||!span||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<0||span.end-span.start!==raw.length||decodeRustCharacter(raw,span)!==node.value)throw new TypeError('Character literal differs from its original decoded scalar and source span');
  return node.value;
}
function character(checker,surface,env,path){
  const value=checker.expr(surface,env,path,CHARACTER);checkedCharacterType(value.type,surface.span);return value;
}
export function checkCharacterExpression(checker,node,env,path,expected){
  if(node.k==='routerPatternChar'){
    const value={k:'routerCharacterLiteral',value:node.value,raw:node.raw,type:CHARACTER,span:node.span};requireCharacterLiteral(value);
    if(expected&&expected.kind!=='char')throw typeError('a Rust char is not a String, borrowed str, byte or integer value',node.span);
    if(expected)checkedCharacterType(expected,node.span);return value;
  }
  if(node.k!=='routerTextPattern'||!trims.has(node.op)||node.args?.length!==1)return null;
  const arg=node.args[0],literal=arg.k==='array'&&arg.sourceFixedArrayLiteral===true;
  const scalar=arg.k==='routerPatternChar'||arg.k==='name'&&arg.path.length===1&&env.get(arg.path[0])?.kind==='char';
  if(!literal&&!scalar)return null;
  env=checker.contextEnvironment(node,env,expected);
  // Preserve receiver-before-pattern evaluation. A set is a fresh source
  // array of scalar values; no general array borrow/Copy or Drop permit is made.
  if(nonlocal(node.object))throw unsupported('character Pattern control','requires an ordinary receiver without nonlocal exits',node.span);
  const receiver=checker.expr(node.object,env,path);
  if(nonlocal(arg))throw unsupported('character Pattern control','requires ordinary scalar expressions without nonlocal exits',arg.span);
  if(!borrowedText(receiver.type))throw unsupported('character Pattern receiver','requires an existing checked borrowed str receiver and origin',node.span);
  let items;
  if(literal){
    if(arg.items.length>FIXED_ARRAY_MAX_LENGTH||arg.items.some(item=>item.spread!==false))throw unsupported('character Pattern set','requires a bounded dense fresh comma-separated scalar array',arg.span);
    items=arg.items.map(item=>character(checker,item.value,env,path));
  }else items=[character(checker,arg,env,path)];
  const pattern={k:'routerCharacterSet',items,type:{kind:'array',element:CHARACTER},span:arg.span,origin:literal?'fresh-character-array-pattern':'single-character-pattern'};
  const type={kind:'string',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'}};
  return {k:'routerTextPattern',op:node.op,value:receiver,args:[pattern],type,patternKind:'character-set',sourceProfile:'checked-str-pattern-v1',constEligible:false,span:node.span};
}
function requireCharacterSet(node){
  if(node.k!=='routerCharacterSet'||node.type?.kind!=='array'||node.type.element?.kind!=='char'||!Array.isArray(node.items)||node.items.length>FIXED_ARRAY_MAX_LENGTH||!['fresh-character-array-pattern','single-character-pattern'].includes(node.origin)||node.origin==='single-character-pattern'&&node.items.length!==1)throw new TypeError('Missing checked scalar character Pattern set');
  for(const item of node.items){checkedCharacterType(item?.type,node.span);if(item.k==='routerCharacterLiteral')requireCharacterLiteral(item);}
}
export function emitCharacterExpression(emitter,node){
  if(node.k==='routerCharacterLiteral')return JSON.stringify(requireCharacterLiteral(node));
  if(node.k==='routerCharacterSet'){
    requireCharacterSet(node);return `Object.freeze([${node.items.map(item=>emitter.expr(item)).join(', ')}])`;
  }
  if(node.k!=='routerTextPattern'||node.patternKind!=='character-set')return null;
  if(!trims.has(node.op)||node.args?.length!==1||!borrowedText(node.value?.type)||!borrowedText(node.type)||node.sourceProfile!=='checked-str-pattern-v1'||node.constEligible!==false)throw new TypeError('Missing checked borrowed character Pattern trimming');
  requireCharacterSet(node.args[0]);
  const receiver=emitter.expr(node.value),pattern=emitter.expr(node.args[0]);
  // Function arguments evaluate once left-to-right outside the local names.
  // Array.from splits valid source text into scalars, never UTF16 code units.
  const start=node.op!=='trim_end_matches'?'while(start<end&&pattern.includes(chars[start]))start++;':'';
  const end=node.op!=='trim_start_matches'?'while(end>start&&pattern.includes(chars[end-1]))end--;':'';
  return `((text, pattern) => { const chars=Array.from(text); let start=0, end=chars.length; ${start}${end}return chars.slice(start,end).join(''); })(${receiver}, ${pattern})`;
}
