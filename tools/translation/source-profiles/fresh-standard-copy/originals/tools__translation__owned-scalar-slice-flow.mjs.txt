// Scalar slice helpers consume the actual privately checked body/type inputs.
// A spelling, public profile or returned DATA object grants no admission.
import {sameType} from './checked-types.mjs';
import {originalPrimitiveCopySource} from './shared-reference-copy-source.mjs';
export function actualPrimitiveSlice(checker,type,node){
 const point=type?.rustReference?.pointee,shape=value=>value?.kind==='array'&&value.rustSourceType===true&&value.rustOwnership?.kind==='borrowed'&&value.rustOwnership.source==='slice'&&!value.rustFixedArray&&!value.rustGenericIdentityUnresolved&&!value.rustBorrowingUnresolved;
 if(type?.rustReference?.kind!=='shared'||!shape(type)||!shape(point)||point.rustReference||point.patternOwnershipRefusal||type.patternOwnershipRefusal!=='shared source reference'||type.rustReference.tokens?.[0]?.value!=='&'||!Number.isInteger(type.rustReference.span?.start)||!Number.isInteger(type.rustReference.span?.end)||type.rustReference.span.start<0||type.rustReference.span.end<type.rustReference.span.start||!sameType(type.element,point.element)||!originalPrimitiveCopySource(type.element)||!originalPrimitiveCopySource(point.element))return null;
 checker.expectedOwnership(type.element,point.element,[],node.span);checker.expectedPrimitiveIdentity(type.element,point.element,[],node.span);return point.element;
}
export function scalarSliceIteratorItem(checker,node,receiver,helpers){
 const {empty,copy,refuse}=helpers,element=receiver.type.element,item=node.type.element,source=node.sourceIteratorCopy;let copied=false;
 if(source){if(source.profile!=='rust-1.89-scalar-iterator-items'||source.operation!=='copied'||source.itemType?.rustReference?.kind!=='shared'||!sameType(source.itemType.rustReference.pointee,element)||!sameType(item,element)||!originalPrimitiveCopySource(item))refuse('scalar slice copying requires its actual standard primitive Copy iterator',node);copied=true;}
 else if(item.rustReference?.kind!=='shared'||!sameType(item.rustReference.pointee,element))refuse('scalar slice item must retain its actual shared primitive reference',node);
 const actual=copied?item:item.rustReference.pointee;checker.expectedOwnership(actual,element,[],node.span);checker.expectedPrimitiveIdentity(actual,element,[],node.span);return {copied,item:copied?empty():copy(helpers.fact)};
}
export function checkPrimitiveSliceDereference(checker,node,state,{visit,domain,ensureRoots,empty,refuse,depth}){
 const pointee=node.value?.type?.rustReference?.pointee;if(node.value?.type?.rustReference?.kind!=='shared'||!pointee||!originalPrimitiveCopySource(pointee)||!originalPrimitiveCopySource(node.type)||!sameType(pointee,node.type)||domain(node.type,node)!=='copy')refuse('primitive loop dereference requires its actual by-value standard Copy pointee',node);
 checker.expectedOwnership(node.type,pointee,state.entry.modulePath,node.span);checker.expectedPrimitiveIdentity(node.type,pointee,state.entry.modulePath,node.span);const fact=visit(node.value,state,'copy',depth+1);ensureRoots(fact,state,node);return empty();
}
