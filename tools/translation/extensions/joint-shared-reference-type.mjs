// Read a plain shared f64 chain without changing the original tokenizer array.
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const range=(first,last)=>({start:first.start,end:last.end});
export function parseJointSharedReferenceType(parser){
 const c=parser.cursor,first=c.peek();
 if(!c.is('&&'))return null;
 // Other reference forms retain the existing binder and ownership parser.
 let offset=1;while(['&','&&'].includes(c.peek(offset).value))offset++;
 if(c.peek(offset).value!=='f64'||parser.builtinShadow('f64'))return null;
 const depth=parser.referenceTypeDepth??0,ownershipDepth=parser.ownershipReferenceDepth??0;
 if(depth+2>32)throw unsupported('shared reference type nesting','exceeds the checked depth bound',first);
 const start=c.index;c.next();let pointee;
 parser.referenceTypeDepth=depth+2;parser.ownershipReferenceDepth=ownershipDepth+2;
 try{pointee=parser.type();}finally{parser.referenceTypeDepth=depth;parser.ownershipReferenceDepth=ownershipDepth;}
 const remaining=c.tokens.slice(start+1,c.index),last=remaining.at(-1);
 if(!last)throw unsupported('joint shared reference','requires its complete original pointee',first);
 const tokenCopy=token=>({value:token.value,kind:token.kind,span:range(token,token)});
 const layer=(value,token,tokens)=>({...value,rustSourceType:true,patternOwnershipRefusal:'shared source reference',
  rustReference:{kind:'shared',pointee:structuredClone(value),span:range(token,last),tokens:tokens.map(tokenCopy)}});
 const outer={...first,value:'&',end:first.start+1},inner={...first,value:'&',start:first.start+1};
 return layer(layer(pointee,inner,[inner,...remaining]),outer,[outer,inner,...remaining]);
}
