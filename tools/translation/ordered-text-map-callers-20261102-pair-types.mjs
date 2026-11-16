// A narrow source-bound Vec<(String,String)> observation. It does not infer
// owned tuples, register public kinds or certify ordinary JSON/array values.
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalParsedDeclarationEvidence,originalParsedSyntaxNode,metadataDigest} from './extensions/source-links.mjs';
import {requireOriginalPrimitiveTryFromChecker,originalJsonCaptureCheckerEligible} from './extensions/host-contracts.mjs';
import {STANDARD_NAMESPACE_EVIDENCE,isStandardNamespaceEvidence} from './namespace-standard.mjs';
import {requireOriginalOrderedMapStandardNamespaceFact} from './ordered-text-map-callers-20261102-standard-source.mjs';
import {forwardOwnedString} from './owned-forward-domain.mjs';
import {SOURCE_STRING} from './extensions/source-contract-types.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const active=new WeakMap(),issued=new WeakMap();
const fail=()=>{throw TypeError('Ordered map pairs require actual original Vec/tuple/String source nodes');};
function owners(){for(const path of ['std::vec::Vec','std::string::String']){const rows=STANDARD_NAMESPACE_EVIDENCE.facts.filter(row=>row.target.join('::')===path);if(rows.length!==1||!isStandardNamespaceEvidence(rows[0]))fail();requireOriginalOrderedMapStandardNamespaceFact(rows[0]);}}
function vector(type){return type?.kind==='array'&&type.rustSourceType===true&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='Vec'&&!type.rustReference&&!type.rustFixedArray&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;}
function tuple(parser,type){
 const element=type?.element,name=element?.rustGeneratedTypeOwner?.name,entry=parser.genericTypes.get(name);
 if(!vector(type)||element?.kind!=='named'||element.path?.join('::')!=='crate::'+name||element.rustGeneratedTypeOwner.generated!=='router-tuple-type'||!entry?.tuple||entry.k!=='data'||entry.name!==name||entry.generated!=='router-tuple-type'||entry.ctors?.length!==1)return null;
 const ctor=entry.ctors[0];if(ctor.name!=='Tuple'||ctor.ctorStyle!=='tuple'||ctor.fields?.length!==2||ctor.fields.some((field,index)=>field.name!=='field'+index||!forwardOwnedString(field.type)||field.type.rustReference||field.type.rustGenericIdentityUnresolved||field.type.rustBorrowingUnresolved))return null;
 return entry;
}
function current(row){
 if(row.poisoned)throw row.primary;try{
 requireOriginalPrimitiveTryFromChecker(row.checker);owners();
 const origin=originalParsedSyntaxNode(row.item,row.node);
 if(!originalParsedDeclarationEvidence(row.item)||metadataDigest(row.item)!==row.parentSnapshot||!origin||origin.original!==row.origin.original||origin.parser!==row.origin.parser||origin.actual!==row.node||metadataDigest(origin.relocated)!==metadataDigest(row.node)||matchesParserFacts(origin.parser)!==row.frame||tuple(origin.parser,origin.original)!==row.tuple||metadataDigest(row.tuple)!==row.tupleSnapshot)fail();
 return row;
 }catch(error){if(!row.poisoned){row.poisoned=true;row.primary=error;}throw error;}
}
export function withOrderedTextMapPairSourceCapture(checker,surface,run){
 requireOriginalPrimitiveTryFromChecker(checker);if(!originalJsonCaptureCheckerEligible(checker)||active.has(checker))fail();
 const records=new WeakMap(),rows=[];active.set(checker,records);let cells=200000;
 const visit=(item,node,depth=0)=>{
  if(!node||typeof node!=='object')return;if(--cells<0||depth>160)fail();
  if(vector(node)&&node.element?.rustGeneratedTypeOwner?.generated==='router-tuple-type'){
   const origin=originalParsedSyntaxNode(item,node),entry=origin&&tuple(origin.parser,origin.original);
   if(entry){const row={checker,item,node,origin,tuple:entry,frame:matchesParserFacts(origin.parser),parentSnapshot:metadataDigest(item),tupleSnapshot:metadataDigest(entry)};current(row);records.set(node,row);rows.push(row);}
  }
  for(const [key,value]of Object.entries(node))if(key!=='span')for(const child of Array.isArray(value)?value:[value])visit(item,child,depth+1);
 };
 const mapSignature=(node,depth=0)=>{if(!node||typeof node!=='object')return false;if(--cells<0||depth>160)fail();if(node.kind==='routerOrderedTextMap')return true;return Object.values(node).some(value=>(Array.isArray(value)?value:[value]).some(child=>mapSignature(child,depth+1)));};
 const items=(entries,depth=0)=>{if(--cells<0||depth>160)fail();for(const item of entries)if(item.k==='module')items(item.items,depth+1);else if(item.k==='fn'&&originalParsedDeclarationEvidence(item)&&(mapSignature(item.ret)||item.params.some(parameter=>mapSignature(parameter.type))))visit(item,item);};
 const close=()=>withCompleteSourceClosingFence(()=>{requireOriginalPrimitiveTryFromChecker(checker);if(active.get(checker)!==records)fail();},rows.map(row=>()=>current(row)));
 try{return withCompleteSourceClosingFence(()=>{items(surface.items);return run();},[close]);}finally{active.delete(checker);rows.length=0;}
}
// Called only after original resolveType has resolved the genuine captured
// node. Public structural metadata has no path into the private observation.
export function retainResolvedOrderedTextMapPairType(checker,source,resolved,path,span){
 const row=active.get(checker)?.get(source);if(!row)return resolved;current(row);
 if(!vector(resolved)||resolved.element?.kind!=='data')fail();
 // The vendor named-to-data resolver intentionally erases parser markers.
 // Rejoin through its actual source lookup, never a required copied marker.
 const entry=checker.items.get(resolved.element.name),selected=checker.lookup(source.element.path,path,span),fields=entry?.ctors?.[0]?.fields;
 if(selected!==entry||resolved.element.name!==entry?.fullName||!entry?.tuple||entry.generated!=='router-tuple-type'||entry.ctors.length!==1||entry.ctors[0].name!=='Tuple'||fields?.length!==2)fail();
 for(let index=0;index<2;index++){const actual=checker.resolveType(fields[index].type,entry.modulePath,span);if(fields[index].name!=='field'+index||!forwardOwnedString(actual))fail();checker.expectedOwnership(actual,SOURCE_STRING,path,span);checker.expectedOwnership(actual,row.tuple.ctors[0].fields[index].type,path,span);}
 const snapshot=metadataDigest(resolved),layoutSnapshot=metadataDigest(entry);
 issued.set(resolved,{row,checker,entry,snapshot,layoutSnapshot});current(row);return resolved;
}
export function actualOrderedTextMapPairVector(checker,type){
 const receipt=issued.get(type);if(!receipt)return false;if(receipt.row.poisoned)throw receipt.row.primary;
 try{requireOriginalPrimitiveTryFromChecker(checker);if(receipt.checker!==checker||metadataDigest(type)!==receipt.snapshot||checker.items.get(type.element.name)!==receipt.entry||metadataDigest(receipt.entry)!==receipt.layoutSnapshot)fail();current(receipt.row);return true;}catch(error){if(!receipt.row.poisoned){receipt.row.poisoned=true;receipt.row.primary=error;}throw error;}
}
