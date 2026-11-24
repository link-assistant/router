import {borrowedJsonToolTypeSelectionActive} from './borrowed-json-tool-20261103-type-selection.mjs';
import {originalNamedSourceReferenceLifetime} from './extensions/named-lifetimes.mjs';
// Original shared JSON type observations. Not a public type registry.
import {matchesParserFacts} from './matches-macro-context.mjs';
import {requireOriginalFromNamespaceCallbacks,requireOriginalPrimitiveTryFromChecker,originalJsonCaptureCheckerEligible} from './extensions/host-contracts.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalParsedDeclarationEvidence,originalParsedSyntaxNode,metadataDigest,copyMetadata} from './extensions/source-links.mjs';
import {withBorrowedJsonToolNativeSourceABI,requireBorrowedJsonToolNativeSourceABI} from './borrowed-json-tool-20261103-native-abi.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation,withSourceFailureOperation} from './source-failure-operations.mjs';
import {hasBorrowedJsonToolCaller,freshlyCheckBorrowedJsonToolCaller,borrowedJsonToolSourceScopeActive,registerBorrowedJsonToolSourceCleanup} from './borrowed-json-tool-20261103-requalification.mjs';
let observed=new WeakMap(),observing=false;const captured=new WeakMap(),KIND='routerBorrowedJsonTool';
const NATIVE='::serde_json::Value';
const fail=message=>{throw TypeError('Borrowed original JSON tool type: '+message);};
const joined=parts=>parts.join('::');
function actualTypes(parser,valuePath,modulePath){
 requireOriginalFromNamespaceCallbacks(parser);const frame=matchesParserFacts(parser),facts=frame.facts,modules=facts.modules.filter(module=>joined(module.path)===joined(modulePath));
 if(modules.length!==1)fail('one actual original caller module required');const module=modules[0];originalSourceModuleItems(module);const scopes=facts.evidence.scopes.filter(scope=>scope.file===module.file&&joined(scope.path)===joined(modulePath));if(scopes.length!==1)fail('one original JSON caller scope required');const scope=scopes[0];
 if(scope.configurationCondition!=='active'||scope.unresolvedTypeScope!==false||scope.unresolvedBangMacroScope!==false||scope.unresolvedAttributeMacroScope!==false)fail('actual complete caller producer/type scopes required');
 if(joined(parser.resolveSourceNamespace(valuePath,modulePath,'type'))!=='serde_json::Value')fail('actual serde_json Value import owner differs');return {frame,module,scope,valuePath,modulePath};
}
function current(row){
 if(!row)fail('copied or unissued type');if(row.sourceJoin)row.sourceJoin();
 return withSourceInputValidation(()=>withBorrowedJsonToolNativeSourceABI(row.parser,receipt=>{
  requireBorrowedJsonToolNativeSourceABI(receipt,{parser:row.parser});
  const next=actualTypes(row.parser,row.origin.valuePath,row.origin.modulePath);
  if(next.frame!==row.origin.frame||next.module!==row.origin.module||next.scope!==row.origin.scope||metadataDigest(row.type)!==row.snapshot)fail('original caller/type association changed');
  return row;
 }));
}
function remember(type,parser,origin,role,sourceJoin=null){
 if(!borrowedJsonToolSourceScopeActive())fail('active original JSON source operation required');if(!observing){registerBorrowedJsonToolSourceCleanup(()=>{observed=new WeakMap();observing=false;});observing=true;}
 const row={type,parser,origin,role,sourceJoin,snapshot:metadataDigest(type)};observed.set(type,row);return type;
}
/** Only a genuine written shared monomorphic canonical JSON is selected. */
export function parseBorrowedJsonToolType(parser){
 requireOriginalFromNamespaceCallbacks(parser);if(!borrowedJsonToolTypeSelectionActive(parser))return null;
 const c=parser.cursor;if(!c?.is('&')||c.is('mut',1))return null;const start=c.index;let offset=1;
 if(c.is("'",offset)){
  const quote=c.peek(offset),name=c.peek(offset+1);if(name?.kind!=='identifier'||quote.end!==name.start)fail('contiguous original reference lifetime tokens required');
  if(name.value!=='static'&&!originalNamedSourceReferenceLifetime(parser))fail('actual original free-function lifetime binder required');offset+=2;
 }
 if(c.is('mut',offset))return null;const valuePath=[];if(c.is('::',offset))offset++;
 for(;;){const token=c.peek(offset);if(token?.kind!=='identifier'||valuePath.length>=16)return null;valuePath.push(token.value);offset++;if(!c.is('::',offset))break;offset++;}
 const modulePath=parser.modulePath?.slice();if(!Array.isArray(modulePath))fail('actual original JSON module path required');if(joined(parser.resolveSourceNamespace(valuePath,modulePath,'type'))!=='serde_json::Value')return null;
 const tokens=c.tokens,first=c.peek(),last=c.peek(offset-1),span=Object.freeze({start:first.start,end:last.end});
 return withCompleteSourceClosingFence(()=>withBorrowedJsonToolNativeSourceABI(parser,receipt=>{
  requireBorrowedJsonToolNativeSourceABI(receipt,{parser});const origin=actualTypes(parser,valuePath,modulePath),pointee=remember(Object.freeze({kind:KIND,rustSourceType:true,rustOwnership:Object.freeze({kind:'owned',source:NATIVE})}),parser,origin,'pointee');
  const type=remember(Object.freeze({kind:KIND,rustSourceType:true,patternOwnershipRefusal:'shared original serde JSON reference',rustOwnership:Object.freeze({kind:'borrowed',source:NATIVE}),rustReference:Object.freeze({kind:'shared',pointee,span,tokens:Object.freeze(tokens.slice(start,start+offset).map(token=>Object.freeze({kind:token.kind,value:token.value,span:Object.freeze({start:token.start,end:token.end})})))})}),parser,origin,'shared');
  if(parser.cursor!==c||c.tokens!==tokens||c.index!==start)fail('actual JSON type cursor changed before consumption');c.index+=offset;return type;
 }),[()=>{if(parser.cursor!==c||c.tokens!==tokens||c.index!==start&&c.index!==start+offset)fail('actual original JSON type cursor changed');}]);
}
/** An owned JSON value is deliberately not an admitted boundary. */
export function requireBorrowedJsonToolType(type){
 const row=current(observed.get(type));if(row.role!=='shared'||type.rustReference?.kind!=='shared'||observed.get(type.rustReference.pointee)?.role!=='pointee')fail('only an original shared borrowed-JSON input is admitted');
 current(observed.get(type.rustReference.pointee));return type;
}
export function isBorrowedJsonToolType(type){if(!observed.has(type)||observed.get(type).role!=='shared')return false;requireBorrowedJsonToolType(type);return true;}
export function borrowedJsonToolTypeKey(type){if(type?.kind!==KIND)return null;requireBorrowedJsonToolType(type);return 'shared:serde_json::Value:observed-tool-predicate';}
/** Original syntax-node custody survives the existing ordinary source linker. */
export function withBorrowedJsonToolSourceTypeCapture(checker,surface,run){
 return withSourceFailureOperation(()=>{
 requireOriginalPrimitiveTryFromChecker(checker);if(!originalJsonCaptureCheckerEligible(checker)||captured.has(checker))fail('genuine private checker source operation required');
 const records=new WeakMap(),items=[];captured.set(checker,records);let cells=200000;
 const visit=(item,node,depth=0)=>{
  if(!node||typeof node!=='object')return;if(--cells<0||depth>160)fail('original type source traversal bound');
  if(node.kind===KIND){
   if(item.k==='data')fail('borrowed-JSON aggregate ownership is outside this shared-input boundary');
   const origin=originalParsedSyntaxNode(item,node),source=origin&&observed.get(origin.original);
   if(!origin||!source||origin.actual!==node||origin.parser!==source.parser||metadataDigest(origin.relocated)!==metadataDigest(node))fail('genuine original parsed borrowed-JSON type required');
   current(source);records.set(node,{item,node,origin,source,snapshot:metadataDigest(node)});
  }
  for(const [name,value]of Object.entries(node))if(name!=='span')for(const child of Array.isArray(value)?value:[value])visit(item,child,depth+1);
 };
 const collect=(entries,depth=0)=>{if(--cells<0||depth>160)fail('original item source traversal bound');for(const item of entries)if(item.k==='module')collect(item.items,depth+1);else if(['fn','data'].includes(item.k)&&originalParsedDeclarationEvidence(item)){items.push({item,snapshot:metadataDigest(item)});visit(item,item);}};
 const close=()=>withSourceInputValidation(()=>{requireOriginalPrimitiveTryFromChecker(checker);if(captured.get(checker)!==records)fail('actual checker source scope changed');for(const row of items)if(!originalParsedDeclarationEvidence(row.item)||metadataDigest(row.item)!==row.snapshot)fail('original complete declaration changed');});
 try{return withCompleteSourceClosingFence(()=>{withSourceInputValidation(()=>collect(surface.items));close();return run();},[close]);}finally{captured.delete(checker);items.length=0;}
 });
}
export function resolveBorrowedJsonToolType(checker,type){
 if(type?.kind!==KIND)return null;requireOriginalPrimitiveTryFromChecker(checker);
 if(observed.has(type)){current(observed.get(type));return type;}
 const row=captured.get(checker)?.get(type);if(!row)fail('original linked type capture required');
 const sourceJoin=()=>{requireOriginalPrimitiveTryFromChecker(checker);const origin=originalParsedSyntaxNode(row.item,row.node);if(!originalParsedDeclarationEvidence(row.item)||!origin||origin.actual!==row.node||origin.original!==row.origin.original||origin.parser!==row.source.parser||metadataDigest(origin.relocated)!==row.snapshot||metadataDigest(row.node)!==row.snapshot)fail('original linked type/source association changed');current(row.source);};
 sourceJoin();let result=copyMetadata(type);if(result.rustReference)result={...result,rustReference:Object.freeze({...result.rustReference,pointee:resolveBorrowedJsonToolType(checker,type.rustReference.pointee)})};
 const value=remember(Object.freeze(result),row.source.parser,row.source.origin,row.source.role,sourceJoin);current(observed.get(value));return value;
}

/** Private pointees are checked only inside ownership/source reconstruction. */
export function requireBorrowedJsonToolOwnership(type){
 const row=current(observed.get(type));
 if(row.role==='shared')requireBorrowedJsonToolType(type);
 else if(row.role!=='pointee'||type.rustReference||type.rustOwnership?.kind!=='owned')fail('actual internal borrowed-JSON pointee required');
 return type;
}
export function assertBorrowedJsonToolBoundary(actual,expected){
 if(actual?.kind!==KIND&&expected?.kind!==KIND)return false;
 requireBorrowedJsonToolType(actual);
 if(expected){requireBorrowedJsonToolType(expected);if(borrowedJsonToolTypeKey(actual)!==borrowedJsonToolTypeKey(expected))fail('shared borrowed-JSON boundary differs');}
 return true;
}
export function preserveBorrowedJsonToolResult(value){
 if(value?.type?.kind!==KIND)return null;requireBorrowedJsonToolType(value.type);return value;
}
/** Decoded public tags regain no authority until the WHOLE caller is rechecked. */
export function reissueBorrowedJsonToolFunction(candidate,program=null){
 if(!hasBorrowedJsonToolCaller(candidate))return candidate;
 const checked=freshlyCheckBorrowedJsonToolCaller(candidate,{program});if(!checked)fail('whole original caller reconstruction required');
 let cells=200000;
 const visit=(actual,fresh,depth=0)=>{
  if(!actual||typeof actual!=='object')return;if(--cells<0||depth>160||!fresh||typeof fresh!=='object')fail('complete type correspondence bound');
  if(actual.kind===KIND){const source=observed.get(fresh);if(!source||metadataDigest(actual)!==metadataDigest(fresh))fail('whole checked type differs');current(source);remember(actual,source.parser,source.origin,source.role,()=>current(source));}
  for(const [name,value]of Object.entries(actual))if(value&&typeof value==='object')visit(value,fresh[name],depth+1);
 };
 visit(candidate.params,checked.fresh.params);visit(candidate.ret,checked.fresh.ret);visit(candidate.body,checked.fresh.body);return candidate;
}
export function reissueBorrowedJsonToolProgram(program){
 if(!(program?.declarations instanceof Map)||!Array.isArray(program.items))fail('whole original program required');
 const qualified=new Set();for(const [name,entry]of program.declarations)if(entry.k==='fn'&&hasBorrowedJsonToolCaller(entry)){reissueBorrowedJsonToolFunction(entry,program);qualified.add(name);}
 for(const entry of program.items)if(entry.k==='fn'&&hasBorrowedJsonToolCaller(entry)){if(!qualified.has(entry.fullName))fail('item missing original checked declaration');reissueBorrowedJsonToolFunction(entry,program);}return program;
}
