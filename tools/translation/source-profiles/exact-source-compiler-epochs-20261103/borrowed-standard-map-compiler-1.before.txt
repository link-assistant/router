// Original borrowed standard-map type observations. Not a public type registry.
import {matchesParserFacts} from './matches-macro-context.mjs';
import {requireOriginalFromNamespaceCallbacks,requireOriginalPrimitiveTryFromChecker,originalJsonCaptureCheckerEligible} from './extensions/host-contracts.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalParsedDeclarationEvidence,originalParsedSyntaxNode,metadataDigest,copyMetadata} from './extensions/source-links.mjs';
import {withBorrowedStandardMapNativeSourceABI,requireBorrowedStandardMapNativeSourceABI} from './borrowed-standard-map-20261103-native-abi.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation,withSourceFailureOperation} from './source-failure-operations.mjs';
const observed=new WeakMap(),captured=new WeakMap(),KIND='routerStandardTextMap';
const NATIVE='::std::collections::BTreeMap<::std::string::String,::std::string::String>';
const fail=message=>{throw TypeError('Borrowed original standard-map type: '+message);};
const joined=parts=>parts.join('::');
function actualTypes(parser,mapPath,keyPath,valuePath,modulePath){
 requireOriginalFromNamespaceCallbacks(parser);const frame=matchesParserFacts(parser),facts=frame.facts;
 const modules=facts.modules.filter(module=>joined(module.path)===joined(modulePath));
 if(modules.length!==1)fail('one actual original caller module required');const module=modules[0];originalSourceModuleItems(module);
 const scopes=facts.evidence.scopes.filter(scope=>scope.file===module.file&&joined(scope.path)===joined(modulePath));
 if(scopes.length!==1)fail('one actual original caller type scope required');const scope=scopes[0];
 if(scope.configurationCondition!=='active'||scope.unresolvedTypeScope!==false||scope.unresolvedBangMacroScope!==false||scope.unresolvedAttributeMacroScope!==false)fail('actual complete caller producer/type scopes required');
 const resolve=parts=>parser.resolveSourceNamespace(parts,modulePath,'type');
 if(joined(resolve(mapPath))!=='std::collections::BTreeMap')fail('actual BTreeMap import/alias owner differs');
 const string=parts=>{
  const target=resolve(parts);if(joined(target)==='std::string::String')return;
  if(parts.length!==1||parts[0]!=='String'||joined(target)!=='String'||parser.builtinShadow('String',modulePath))fail('actual original standard String owner differs');
  // The ABI independently rejoins the original ordinary standard prelude and
  // its complete String route. Public unqualified spelling alone is insufficient.
 };
 string(keyPath);string(valuePath);
 return {frame,module,scope,mapPath,keyPath,valuePath,modulePath};
}
function current(row){
 if(!row)fail('copied or unissued type');if(row.sourceJoin)row.sourceJoin();
 return withSourceInputValidation(()=>withBorrowedStandardMapNativeSourceABI(row.parser,receipt=>{
  requireBorrowedStandardMapNativeSourceABI(receipt,{parser:row.parser});
  const next=actualTypes(row.parser,row.origin.mapPath,row.origin.keyPath,row.origin.valuePath,row.origin.modulePath);
  if(next.frame!==row.origin.frame||next.module!==row.origin.module||next.scope!==row.origin.scope||metadataDigest(row.type)!==row.snapshot)fail('original caller/type association changed');
  return row;
 }));
}
function remember(type,parser,origin,role,sourceJoin=null){const row={type,parser,origin,role,sourceJoin,snapshot:metadataDigest(type)};observed.set(type,row);return type;}
/** Only a genuine written shared monomorphic standard text map is selected. */
export function parseBorrowedStandardTextMapType(parser){
 requireOriginalFromNamespaceCallbacks(parser);
 const c=parser.cursor;if(!c?.is('&')||c.is('mut',1))return null;
 const start=c.index;let offset=1;
 const path=()=>{
  const segments=[];if(c.is('::',offset))offset++;
  for(;;){const token=c.peek(offset);if(token?.kind!=='identifier'||segments.length>=16)return null;segments.push(token.value);offset++;if(!c.is('::',offset))break;offset++;}
  return segments;
 };
 const mapPath=path();if(!mapPath||!c.is('<',offset))return null;offset++;
 const keyPath=path();if(!keyPath||!c.is(',',offset))return null;offset++;
 const valuePath=path();if(!valuePath||!c.is('>',offset))return null;offset++;
 requireOriginalFromNamespaceCallbacks(parser);
 const modulePath=parser.modulePath?.slice();if(!Array.isArray(modulePath)||modulePath.some(part=>typeof part!=='string'))fail('actual original module path required');
 if(joined(parser.resolveSourceNamespace(mapPath,modulePath,'type'))!=='std::collections::BTreeMap')return null;
 const tokens=c.tokens,first=c.peek(),last=c.peek(offset-1),span=Object.freeze({start:first.start,end:last.end});
 return withCompleteSourceClosingFence(()=>withBorrowedStandardMapNativeSourceABI(parser,receipt=>{
  requireBorrowedStandardMapNativeSourceABI(receipt,{parser});const origin=actualTypes(parser,mapPath,keyPath,valuePath,modulePath);
  const pointee=remember(Object.freeze({kind:KIND,rustSourceType:true,rustOwnership:Object.freeze({kind:'owned',source:NATIVE})}),parser,origin,'pointee');
  const type=remember(Object.freeze({kind:KIND,rustSourceType:true,patternOwnershipRefusal:'shared original standard-map reference',rustOwnership:Object.freeze({kind:'borrowed',source:NATIVE}),rustReference:Object.freeze({kind:'shared',pointee,span,tokens:Object.freeze(tokens.slice(start,start+offset).map(token=>Object.freeze({kind:token.kind,value:token.value,span:Object.freeze({start:token.start,end:token.end})})))})}),parser,origin,'shared');
  if(parser.cursor!==c||c.tokens!==tokens||c.index!==start)fail('actual type cursor changed before consumption');c.index+=offset;return type;
 }),[()=>{if(parser.cursor!==c||c.tokens!==tokens||c.index!==start&&c.index!==start+offset)fail('actual original type cursor changed');}]);
}
/** An owned standard-map value is deliberately not an admitted boundary. */
export function requireBorrowedStandardTextMapType(type){
 const row=current(observed.get(type));if(row.role!=='shared'||type.rustReference?.kind!=='shared'||observed.get(type.rustReference.pointee)?.role!=='pointee')fail('only an original shared standard-map input is admitted');
 current(observed.get(type.rustReference.pointee));return type;
}
export function isBorrowedStandardTextMapType(type){if(!observed.has(type)||observed.get(type).role!=='shared')return false;requireBorrowedStandardTextMapType(type);return true;}
export function borrowedStandardTextMapTypeKey(type){if(type?.kind!==KIND)return null;requireBorrowedStandardTextMapType(type);return 'shared:std::collections::BTreeMap<std::string::String,std::string::String>';}
/** Original syntax-node custody survives the existing ordinary source linker. */
export function withBorrowedStandardMapSourceTypeCapture(checker,surface,run){
 return withSourceFailureOperation(()=>{
 requireOriginalPrimitiveTryFromChecker(checker);if(!originalJsonCaptureCheckerEligible(checker)||captured.has(checker))fail('genuine private checker source operation required');
 const records=new WeakMap(),items=[];captured.set(checker,records);let cells=200000;
 const visit=(item,node,depth=0)=>{
  if(!node||typeof node!=='object')return;if(--cells<0||depth>160)fail('original type source traversal bound');
  if(node.kind===KIND){
   if(item.k==='data')fail('standard-map aggregate ownership is outside this shared-input boundary');
   const origin=originalParsedSyntaxNode(item,node),source=origin&&observed.get(origin.original);
   if(!origin||!source||origin.actual!==node||origin.parser!==source.parser||metadataDigest(origin.relocated)!==metadataDigest(node))fail('genuine original parsed standard-map type required');
   current(source);records.set(node,{item,node,origin,source,snapshot:metadataDigest(node)});
  }
  for(const [name,value]of Object.entries(node))if(name!=='span')for(const child of Array.isArray(value)?value:[value])visit(item,child,depth+1);
 };
 const collect=(entries,depth=0)=>{if(--cells<0||depth>160)fail('original item source traversal bound');for(const item of entries)if(item.k==='module')collect(item.items,depth+1);else if(['fn','data'].includes(item.k)&&originalParsedDeclarationEvidence(item)){items.push({item,snapshot:metadataDigest(item)});visit(item,item);}};
 const close=()=>withSourceInputValidation(()=>{requireOriginalPrimitiveTryFromChecker(checker);if(captured.get(checker)!==records)fail('actual checker source scope changed');for(const row of items)if(!originalParsedDeclarationEvidence(row.item)||metadataDigest(row.item)!==row.snapshot)fail('original complete declaration changed');});
 try{return withCompleteSourceClosingFence(()=>{withSourceInputValidation(()=>collect(surface.items));close();return run();},[close]);}finally{captured.delete(checker);items.length=0;}
 });
}
export function resolveBorrowedStandardTextMapType(checker,type){
 if(type?.kind!==KIND)return null;requireOriginalPrimitiveTryFromChecker(checker);
 if(observed.has(type)){current(observed.get(type));return type;}
 const row=captured.get(checker)?.get(type);if(!row)fail('original linked type capture required');
 const sourceJoin=()=>{requireOriginalPrimitiveTryFromChecker(checker);const origin=originalParsedSyntaxNode(row.item,row.node);if(!originalParsedDeclarationEvidence(row.item)||!origin||origin.actual!==row.node||origin.original!==row.origin.original||origin.parser!==row.source.parser||metadataDigest(origin.relocated)!==row.snapshot||metadataDigest(row.node)!==row.snapshot)fail('original linked type/source association changed');current(row.source);};
 sourceJoin();let result=copyMetadata(type);if(result.rustReference)result={...result,rustReference:Object.freeze({...result.rustReference,pointee:resolveBorrowedStandardTextMapType(checker,type.rustReference.pointee)})};
 const value=remember(Object.freeze(result),row.source.parser,row.source.origin,row.source.role,sourceJoin);current(observed.get(value));return value;
}
