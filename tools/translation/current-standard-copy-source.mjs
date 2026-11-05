// Fresh source-equation successor. Original public Copy APIs remain available
// in shared-reference-copy-source.mjs. This module introduces no caller/trait
// authority; complete original type/ownership/namespace checks remain required.
import {sharedReferenceCopyIdentity as originalIdentity,SHARED_REFERENCE_COPY_SOURCE,STANDARD_OPTION_COPY_SOURCE} from './shared-reference-copy-source.mjs';
import {compilePinnedArithmeticCopySource} from './arithmetic-copy-source.mjs';
import {rustFixedType,sameType} from './checked-types.mjs';
import {sourceItems} from './rust-structure.mjs';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {withFreshStandardCopyInputs,requireFreshStandardCopyHost,requireStandardCopySynchronous} from './fresh-standard-copy-inputs.mjs';
export {SHARED_REFERENCE_COPY_SOURCE,STANDARD_OPTION_COPY_SOURCE};
const fail=message=>{throw new TypeError('Current standard Copy source: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
let active=null;
export function withCurrentStandardCopySourceOperation(run){
 if(typeof run!=='function'||types.isProxy(run)||types.isAsyncFunction(run))fail('synchronous original source operation callback required');requireFreshStandardCopyHost();
 if(active){const frame=active;if(frame.depth>=64)fail('bounded nested current-source operation required');frame.depth++;try{return requireStandardCopySynchronous(run());}finally{frame.depth--;}}
 return withFreshStandardCopyInputs(inputs=>{const frame={inputs,copies:null,depth:1};active=frame;try{return requireStandardCopySynchronous(run());}finally{if(frame.copies)frame.copies.clear();frame.copies=null;frame.inputs=null;frame.depth=0;active=null;}});
}
function currentPrimitiveCopies(){
 if(!active)fail('original current source operation required');if(active.copies)return active.copies;
 const origins=active.inputs.sources.filter(row=>row.path==='library/core/src/marker.rs');if(origins.length!==1)fail('complete original current marker source required');const source=origins[0].source,primitiveCopySyntax=compilePinnedArithmeticCopySource(),copyTraits=sourceItems(source).filter(item=>item.term==='trait'&&item.name==='Copy');
 if(primitiveCopySyntax.source.sha256!==origins[0].sha256||primitiveCopySyntax.source.bytes!==origins[0].bytes||copyTraits.length!==1||!source.slice(copyTraits[0].start,copyTraits[0].end).includes('lang = "copy"'))fail('original marker macro/lang-item source association differs');
 const copies=new Map();for(const implementation of primitiveCopySyntax.implementations){const target=implementation.target;if(implementation.trait!=='Copy'||target?.fragment!=='ty'||target.trees?.length!==1)continue;let primitive=target.trees[0];for(let depth=0;primitive?.kind==='fragment'&&['tt','ident'].includes(primitive.fragment)&&primitive.trees.length===1;depth++){if(depth>=64)throw new RangeError('Primitive Copy transparent token depth');primitive=primitive.trees[0];}if(primitive?.kind!=='token'||primitive.type!=='ident')continue;copies.set(primitive.text,Object.freeze({profile:'original-core-option-primitive-payload-copy-v1',source:primitiveCopySyntax.source,definitionSha256:hash(JSON.stringify(primitiveCopySyntax.definition)),definitionSpan:primitiveCopySyntax.definition.span,invocation:primitiveCopySyntax.invocation,implementationSha256:hash(JSON.stringify(implementation)),opaqueTypeSha256:hash(JSON.stringify(target)),langItemSpan:copyTraits[0].span??{start:copyTraits[0].start,end:copyTraits[0].end},langItemSha256:hash(source.slice(copyTraits[0].start,copyTraits[0].end)),namespaceAuthority:false,scope:'actual canonical Option primitive field only'}));}active.copies=copies;return copies;
}
export function currentPrimitiveCopySource(type){
 if(!type||types.isProxy(type)||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return null;const name=type.kind==='fixed'?type.rustPrimitiveName:type.kind==='bool'?'bool':type.kind==='float'&&type.rustPrimitiveName==='f64'?'f64':null,fixed=type.kind==='fixed'?rustFixedType(name):null;if(type.kind==='fixed'&&(!fixed||!sameType(type,fixed)))return null;return withCurrentStandardCopySourceOperation(()=>currentPrimitiveCopies().get(name)??null);
}
export function currentSharedReferenceCopyIdentity(type){return !type||types.isProxy(type)||type.rustReference?.kind!=='shared'?null:withCurrentStandardCopySourceOperation(()=>originalIdentity(type));}
