// Actual free-function lifetime binders, never rewritten as 'static tokens.
// https://doc.rust-lang.org/reference/lifetime-elision.html
import {STRING} from '../checked-types.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';

const frames=new WeakMap();
const range=(first,last)=>({start:first.start,end:last.end});
const tokenCopy=token=>({kind:token.kind,value:token.value,span:range(token,token)});
function declarations(cursor) {
  const prefix=['async','const'].includes(cursor.peek().value)&&cursor.peek(1).value==='fn'?1:0;
  let at=cursor.index+prefix+2;
  if(cursor.tokens[at]?.value!=='<')return null;
  const first=cursor.tokens[at],names=[],tokens=[first];at++;
  while(cursor.tokens[at]?.value!=='>') {
    const quote=cursor.tokens[at++],name=cursor.tokens[at++];
    if(quote?.value!=="'"||name?.kind!=='identifier')throw unsupported('generic function','generic signatures require monomorphization',range(first,name??quote??first));
    if(['static','_'].includes(name.value)||names.includes(name.value))throw typeError('Lifetime parameters require distinct nonreserved source names',range(quote,name));
    names.push(name.value);tokens.push(quote,name);
    if(names.length>32)throw unsupported('named lifetime binders','exceeds the checked 32-parameter bound',range(first,name));
    if(cursor.tokens[at]?.value==='>')break;
    const comma=cursor.tokens[at++];
    if(comma?.value!==',')throw unsupported('lifetime bounds','require separately checked outlives and trait constraints',range(first,comma??name));
    tokens.push(comma);
  }
  const last=cursor.tokens[at];
  if(!last||!names.length)throw typeError('Lifetime parameter list requires actual source binders',first);
  tokens.push(last);
  return {start:cursor.index+prefix+2,end:at+1,names,tokens,span:range(first,last)};
}

export function withNamedLifetimeParser(Base) {return class extends Base {
  fn(path) {
    const previous=frames.get(this),frame=declarations(this.cursor);
    frames.set(this,frame);
    try {return super.fn(path);}
    finally {if(previous===undefined)frames.delete(this);else frames.set(this,previous);}
  }
  sourceLifetimeParameters() {
    const frame=frames.get(this),c=this.cursor;
    if(!frame)return null;
    if(c.index!==frame.start||frame.tokens.some((token,index)=>c.tokens[frame.start+index]!==token))throw unsupported('named lifetime source','requires its unchanged original function token group',c.peek());
    c.index=frame.end;
    return {profile:'source-named-shared-lifetimes-v1',names:[...frame.names],span:{...frame.span},tokens:frame.tokens.map(tokenCopy)};
  }
  namedSourceReferenceType() {
    const c=this.cursor,start=c.index,first=c.peek();
    if(!c.is('&')||!c.is("'",1)||c.peek(2).value==='static')return null;
    const frame=frames.get(this),name=c.peek(2);
    if(name.kind!=='identifier'||!frame?.names.includes(name.value))throw unsupported('named reference lifetime','requires a declared lifetime in this actual free function',range(first,name));
    c.next();c.next();c.next();
    if(c.is('mut'))throw unsupported('mutable reference','mutation is outside the portable core',range(first,c.peek()));
    const depth=this.referenceTypeDepth??0,ownershipDepth=this.ownershipReferenceDepth??0;
    if(depth>=32)throw unsupported('shared reference type nesting','exceeds the checked depth bound',first);
    let pointee;
    if(c.is('str')) {c.next();pointee=STRING;}
    else {
      this.referenceTypeDepth=depth+1;this.ownershipReferenceDepth=ownershipDepth+1;
      try {pointee=this.type();}
      finally {this.referenceTypeDepth=depth;this.ownershipReferenceDepth=ownershipDepth;}
    }
    const tokens=c.tokens.slice(start,c.index),location=range(first,tokens.at(-1));
    if(pointee===STRING)return {...STRING,rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'},rustBorrowLifetime:{kind:`named:${name.value}`,source:'borrowed-str-type',span:location,tokens:tokens.map(tokenCopy)}};
    return {...pointee,patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:structuredClone(pointee),span:location,tokens:tokens.map(tokenCopy)}};
  }
};}
