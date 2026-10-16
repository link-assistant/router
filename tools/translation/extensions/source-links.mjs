// Original source association is captured during parsing, never inferred from
// a caller-supplied file checksum. Private contexts are not semantic IR nodes.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {originalFlatTokenIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {capturedRustTokenSource} from './lexical.mjs';

const parsed=new WeakMap(), linked=new WeakMap(), capturedContexts=new WeakMap(), checkedContexts=new WeakMap(), bound=new WeakMap();
const parserSources=new WeakMap(),syntaxOrigins=new WeakMap();
const itemCache=new Map();let cachedCharacters=0;
const mapEntries=Map.prototype.entries, mapGet=Map.prototype.get;
const hash=text=>createHash('sha256').update(text).digest('hex');
const fail=reason=>{throw new TypeError('source links: '+reason);};
export const ordinal=(a,b)=>a<b?-1:a>b?1:0;
export function ownData(value,key) {
  if(!value||typeof value!=='object'||types.isProxy(value))fail('expected non-proxy metadata');
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('missing data property '+key);
  return descriptor.value;
}
export function snapshotMap(value) {
  if(!value||types.isProxy(value)||Object.getPrototypeOf(value)!==Map.prototype||Reflect.ownKeys(value).length)fail('expected an unmodified native Map');
  return new Map(mapEntries.call(value));
}
// Descriptor inspection precedes value access, including non-enumerable and
// symbol properties. This never calls getters or caller-defined Map methods.
export function copyMetadata(value,{cells=200000,bytes=4194304,preserveKeyOrder=false}={},depth=0,active=new Set(),budget=null) {
  budget??={cells,bytes};if(--budget.cells<0||depth>160)fail('metadata budget exhausted');
  if(value===null||value===undefined||typeof value==='boolean'||typeof value==='bigint')return value;
  if(typeof value==='number'){if(!Number.isSafeInteger(value))fail('non-integer metadata number');return value;}
  if(typeof value==='string'){budget.bytes-=Buffer.byteLength(value);if(budget.bytes<0)fail('metadata byte budget exhausted');return value;}
  if(!value||typeof value!=='object'||types.isProxy(value)||active.has(value))fail('metadata must be acyclic data');
  const prototype=Object.getPrototypeOf(value);
  if(prototype!==Object.prototype&&prototype!==null&&prototype!==Array.prototype)fail('unexpected metadata prototype');
  // Reuse this enumeration without adding reflection or coercing a caller's
  // rebound String result twice; the membership lookup uses the numeric index.
  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors),array=Array.isArray(value),ownIndexes=array?{__proto__:null}:null;
  for(const key of keys){const descriptor=descriptors[key];if(typeof key!=='string'||!Object.hasOwn(descriptor,'value')||(!descriptor.enumerable&&!(array&&key==='length')))fail('accessor, symbol or hidden metadata');if(array)ownIndexes[key]=true;}
  active.add(value);let result;
  if(array){
    const length=descriptors.length.value;if(!Number.isSafeInteger(length)||length<0||length>budget.cells)fail('array metadata budget exhausted');
    if(keys.length!==length+1)fail('array metadata holes or extra properties');
    result=[];for(let index=0;index<length;index++){const key=String(index);if(ownIndexes[index]!==true)fail('array metadata hole');const descriptor=descriptors[key];if(!descriptor)fail('array metadata hole');result.push(copyMetadata(descriptor.value,{preserveKeyOrder},depth+1,active,budget));}
  }else {
    // Copy certificates hash their original JSON property order. Canonical
    // metadata cloning must retain every signed byte inside those envelopes.
    result=Object.create(null);for(const key of preserveKeyOrder?keys:keys.sort(ordinal))Object.defineProperty(result,key,{value:copyMetadata(descriptors[key].value,{preserveKeyOrder:preserveKeyOrder||key==='copyCertificate'},depth+1,active,budget),enumerable:true,writable:true,configurable:true});
  }
  active.delete(value);return result;
}
export function metadataDigest(value) {
  return hash(JSON.stringify(copyMetadata(value),(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item));
}
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
const signature=entry=>({name:entry.name,params:entry.params??[],ret:entry.ret??null,constant:Boolean(entry.constant),constFunction:Boolean(entry.constFunction),async:Boolean(entry.async),...(Object.hasOwn(entry,'sourceLifetimeParameters')?{sourceLifetimeParameters:ownData(entry,'sourceLifetimeParameters')}:{})});
const parsedSyntax=entry=>entry.k==='data'?entry:{signature:signature(entry),body:entry.body};
function recordParsedDeclaration(parser,entry,record) {
  verifyParserTokens(parser);
  const records=parsed.get(parser)??[];records.push({entry,body:entry.body,syntaxSha256:metadataDigest(parsedSyntax(entry)),...copyMetadata(record)});parsed.set(parser,records);return entry;
}
export function withCapturedSourceParser(Base) {return class extends Base {
  constructor(tokens,...args) {
    const capture=capturedRustTokenSource(tokens);
    super(tokens,...args);if(capture)parserSources.set(this,capture);
  }
  items(root,items,...args) {
    const start=items.length,result=super.items(root,items,...args);
    for(const entry of items.slice(start))if(entry.k==='data'&&!entry.generated)recordParsedDeclaration(this,entry,{start:entry.span.start,end:entry.span.start,bodySpan:null});
    return result;
  }
  constItem(path) {
    const c=this.cursor,start=c.next(),name=c.identifier('const').value;
    c.expect(':','const');const ret=this.type();c.expect('=','const');const bodyStart=c.peek().start,body=this.expr(path),bodyEnd=c.tokens[c.index-1].end;
    const end=c.expect(';','const'),entry={k:'fn',name,params:[],ret,body,constant:true,span:{start:start.start,end:Math.max(start.end,c.peek().kind!=='eof'?c.peek().start:start.end)}};
    return recordParsedDeclaration(this,entry,{start:start.start,end:end.end,bodySpan:{start:bodyStart,end:bodyEnd}});
  }
  fn(path) {
    const c=this.cursor,qualifier=c.is('fn')&&c.index>0&&c.tokens[c.index-1].value==='const'?c.tokens[c.index-1]:null,start=qualifier?.start??c.peek().start,frame={bodySpan:null};(this.sourceFunctionCaptures??=[]).push(frame);
    try {const entry=super.fn(path);if(qualifier)entry.constFunction=true;return recordParsedDeclaration(this,entry,{start,end:c.tokens[c.index-1].end,bodySpan:frame.bodySpan});}
    finally {this.sourceFunctionCaptures.pop();}
  }
  block(...args) {
    const c=this.cursor,frame=this.sourceFunctionCaptures?.at(-1),capture=frame&&!frame.bodySpan,start=c.peek().start;
    if(capture)frame.bodySpan={start,end:start};
    const body=super.block(...args);if(capture)frame.bodySpan.end=c.tokens[c.index-1].end;return body;
  }
};}
// This is a successful-only specialization of the unchanged copier below.
// It re-reads every mutable descriptor/scalar, charges each alias occurrence,
// and never throws a comparison refusal before full legacy validation.
function originalFlatTokens(actual,expectedTokens){
  if(!actual||types.isProxy(actual)||!Array.isArray(actual)||Object.getPrototypeOf(actual)!==Array.prototype)return false;
  const descriptors=Object.getOwnPropertyDescriptors(actual),keys=Reflect.ownKeys(descriptors),length=Object.hasOwn(descriptors,'length')?descriptors.length.value:null;
  let cells=199999,bytes=4194304,expectedIndex=0,secondHalf=false,matches=true;
  if(!Number.isSafeInteger(length)||length<0||length>cells||keys.length!==length+1)return false;
  for(let at=0;at<keys.length;at++){const key=keys[at],field=descriptors[key];if(typeof key!=='string'||!Object.hasOwn(field,'value')||(!field.enumerable&&key!=='length'))return false;}
  const equal=(fields,names,expected,half=0)=>{
    if(!expected||names.length!==Object.keys(expected).length)return false;
    const wanted=Object.keys(expected);
    for(let at=0;at<wanted.length;at++){const key=wanted[at];if(!Object.hasOwn(fields,key))return false;const value=half&&key==='value'?'&':half===1&&key==='end'?expected.start+1:half===2&&key==='start'?expected.start+1:expected[key];if(fields[key].value!==value)return false;}
    return true;
  };
  for(let index=0;index<length;index++){
    if(!Object.hasOwn(descriptors,index))return false;
    const token=descriptors[index].value;if(--cells<0||!token||typeof token!=='object'||types.isProxy(token)||Array.isArray(token))return false;
    const prototype=Object.getPrototypeOf(token);if(prototype!==Object.prototype&&prototype!==null&&prototype!==Array.prototype)return false;
    const fields=Object.getOwnPropertyDescriptors(token),names=Reflect.ownKeys(fields);
    for(let at=0;at<names.length;at++){
      const key=names[at],field=fields[key];if(typeof key!=='string'||!Object.hasOwn(field,'value')||!field.enumerable||--cells<0)return false;
      const value=field.value,type=typeof value;
      if(type==='string'){bytes-=Buffer.byteLength(value);if(bytes<0)return false;}
      else if(type==='number'){if(!Number.isSafeInteger(value))return false;}
      else if(value!==null&&value!==undefined&&type!=='boolean'&&type!=='bigint')return false;
    }
    if(!matches)continue;
    const expected=expectedTokens[expectedIndex];
    if(secondHalf){if(!equal(fields,names,expected,2))matches=false;secondHalf=false;expectedIndex++;}
    else if(equal(fields,names,expected))expectedIndex++;
    else if(expected?.value==='&&'&&expected.end===expected.start+2&&equal(fields,names,expected,1))secondHalf=true;
    else matches=false;
  }
  return matches&&!secondHalf&&expectedIndex===expectedTokens.length;
}
function verifyParserTokens(parser) {
  const origin=parserSources.get(parser);if(!origin)return null;
  // Host.type splits one original && token into exactly two positioned &
  // tokens. No other replacement, insertion, deletion or field change is
  // permitted by this source association, even after parser construction.
  const tokens=ownData(ownData(parser,'cursor'),'tokens');
  if(originalFlatTokenIntrinsicsUnchanged()&&originalFlatTokens(tokens,origin.tokens))return origin;
  const actual=copyMetadata(tokens);let index=0;
  // copyMetadata already validates descriptors, scalar domains and budgets.
  // Token snapshots contain scalar fields only: compare those exact fields
  // directly rather than serializing and hashing every token repeatedly.
  const equal=(left,right)=>left&&Object.keys(left).length===Object.keys(right).length&&Object.keys(right).every(key=>Object.hasOwn(left,key)&&left[key]===right[key]);
  for(const expected of origin.tokens) {
    const token=actual[index++];
    if(equal(token,expected))continue;
    const second=actual[index++];
    if(expected.value!=='&&'||expected.end!==expected.start+2||!equal(token,{...expected,value:'&',end:expected.start+1})||!equal(second,{...expected,value:'&',start:expected.start+1}))fail('parser token stream differs from original tokenizer input');
  }
  if(index!==actual.length)fail('parser token stream differs from original tokenizer input');
  return origin;
}
function originalItems(source,path=[],offset=0) {
  const result=[];
  for(const item of sourceItems(source).filter(item=>!item.comment)){
    result.push({...item,path,start:item.start+offset,end:item.end+offset});
    if(item.term==='mod'){
      const open=item.tokens.find(token=>token.text==='{'),close=item.tokens.at(-1);
      if(open&&close.text==='}')result.push(...originalItems(source.slice(open.end,close.start),[...path,item.name],offset+open.end));
    }
  }
  return result;
}
function originalContext(source) {
  let context=itemCache.get(source);if(context)return context;
  // The key is the complete immutable string, not a caller-owned checksum or
  // mutable source object. A changed byte necessarily creates another context.
  context=freeze({items:originalItems(source),sourceBytes:Buffer.byteLength(source),sourceSha256:hash(source)});
  if(source.length<=262144){while(itemCache.size>=16||cachedCharacters+source.length>1048576){const key=itemCache.keys().next().value;cachedCharacters-=key.length;itemCache.delete(key);}itemCache.set(source,context);cachedCharacters+=source.length;}
  return context;
}
// Relocation changes coordinates, not source semantics. Raw certificates are
// immutable evidence and never executable target-relative span containers.
function relocatedSyntax(value,offset) {
  if(Array.isArray(value))return value.map(item=>relocatedSyntax(item,offset));
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,['copyCertificate','sourceParameterPatterns','sourceParameterPattern','sourcePattern','constantEvaluationProof','deriveNamespaceProof','toolAttributeProof','jsonMacroProof','sourceMatchesProof','pinnedStandardBodyProof','sourceMethodProof','sourceDisplayScope','sourceBoolFromScope','sourceConversionProof'].includes(key)?item:['span','subjectSyntaxSpan','patternSpan'].includes(key)&&item?{start:item.start+offset,end:item.end+offset}:relocatedSyntax(item,offset)]));
}
function verifyRelocatedSyntax(entry,semantic,offset) {
  if(!Number.isSafeInteger(offset)||offset<0)fail('source relocation requires an exact nonnegative offset');
  if(metadataDigest(relocatedSyntax(copyMetadata(entry),offset))!==metadataDigest(semantic))fail('semantic declaration differs from the exact source relocation');
}
// Keep exact object correspondence for selected owned calls and let-else. This
// eligibility scan grants nothing and retains no parser for old declarations.
function rangeSyntaxOrigin(parser,syntax,semantic,offset){
  let nodes=null,cells=200000;const path=[];
  const visit=(original,actual,depth=0)=>{
    if(--cells<0||depth>160||!original||typeof original!=='object'||!actual||typeof actual!=='object'||types.isProxy(original)||types.isProxy(actual))return;
    const kind=Object.getOwnPropertyDescriptor(original,'k');
    if(kind&&Object.hasOwn(kind,'value')&&(kind.value==='routerCoreF64InclusiveCall'||kind.value==='routerCoreScalarCountCall'||kind.value==='routerCoreJsonCall'||kind.value==='routerCoreJsonUpdateCall'||kind.value==='routerLetElse')){nodes??=new WeakMap();nodes.set(actual,{original,path:[...path]});}
    for(const key of Reflect.ownKeys(original))if(typeof key==='string'&&!['type','span','length'].includes(key)){
      const left=Object.getOwnPropertyDescriptor(original,key),right=Object.getOwnPropertyDescriptor(actual,key);
      if(left&&right&&Object.hasOwn(left,'value')&&Object.hasOwn(right,'value')){path.push(key);visit(left.value,right.value,depth+1);path.pop();}
    }
  };visit(syntax,semantic);
  return nodes?Object.freeze({parser,syntax,offset,nodes}):null;
}
function attach(parser,entry,semantic,{source,sourcePath,offset=0,itemSpan=null,scope=null,path=[],syntaxParser=parser,syntaxOffset=0}) {
  const origin=verifyParserTokens(parser);if(!origin)fail('requires original tokenizer source capture');
  if(itemSpan?source.slice(itemSpan.start,itemSpan.end)!==origin.source:source!==origin.source)fail('original source bytes differ from tokenizer input');
  const record=parsed.get(parser)?.find(record=>record.entry===entry||record.body&&record.body===entry.body);
  if(['fn','data'].includes(entry.k)&&!record)return false;
  if(record&&record.syntaxSha256!==metadataDigest(parsedSyntax(entry)))fail('parser syntax changed before original source linking');
  const context=originalContext(source),items=context.items,item=itemSpan?items.find(item=>item.start===itemSpan.start&&item.end===itemSpan.end):items.find(item=>item.name===entry.name&&item.path.join('.')===path.join('.')&&(!record||item.start<=record.start&&record.end<=item.end));
  if(!item||!['fn','const','struct','enum'].includes(item.term))return false;
  const bodySpan=record?.bodySpan?{start:record.bodySpan.start+offset,end:record.bodySpan.end+offset}:{start:item.start,end:item.end};
  if(bodySpan.start<item.start||bodySpan.end>item.end)return false;
  const evidence={schemaVersion:1,sourcePath,sourceBytes:context.sourceBytes,sourceSha256:context.sourceSha256,declarationSpan:{start:item.start,end:item.end},declarationSha256:hash(source.slice(item.start,item.end)),bodySpan,bodySha256:hash(source.slice(bodySpan.start,bodySpan.end)),checkedSpan:copyMetadata(semantic.span),sourceOffset:0,sourceScopeSha256:metadataDigest(scope),compilationProfileSha256:metadataDigest(scope?.compilationProfile??null),parsedSurfaceSha256:metadataDigest(semantic)};
  linked.set(semantic,freeze(evidence));
  if(record){const association=rangeSyntaxOrigin(syntaxParser,entry,semantic,syntaxOffset);if(association)syntaxOrigins.set(semantic,association);}
  return true;
}
// Project parsing uses declaration-local tokens but links to the full original
// file. globalOffset is the module offset; itemOffset relocates parser tokens.
export function linkProjectDeclaration(parser,entry,semantic,{source,sourcePath,itemSpan,itemOffset,globalOffset,path,scope}) {
  const origin=verifyParserTokens(parser);if(!origin)fail('requires original tokenizer source capture');
  if(itemOffset!==itemSpan.start||source.slice(itemSpan.start,itemSpan.end)!==origin.source)fail('original project slice differs from tokenizer input');
  verifyRelocatedSyntax(entry,semantic,itemOffset+globalOffset);
  const record=parsed.get(parser)?.find(record=>record.entry===entry||record.body&&record.body===entry.body);
  const linkedRecord=record?{...record,start:record.start+itemOffset,end:record.end+itemOffset,bodySpan:record.bodySpan?{start:record.bodySpan.start+itemOffset,end:record.bodySpan.end+itemOffset}:null}:null;
  const temporary={cursor:parser.cursor};parserSources.set(temporary,origin);if(linkedRecord)parsed.set(temporary,[{...linkedRecord,entry,body:entry.body}]);
  const result=attach(temporary,entry,semantic,{source,sourcePath,itemSpan,offset:0,path,scope,syntaxParser:parser,syntaxOffset:itemOffset+globalOffset});
  if(result){const evidence=linked.get(semantic);linked.set(semantic,freeze({...evidence,sourceOffset:globalOffset}));}
  return result;
}
// The actual Host admission independently requires the private original-method
// parse/semantic brand. This low linker records exact source/relocation data;
// caller-provided public hashes alone cannot satisfy that high admission.
function methodScopeMismatch(parser,scope,transform,entry,sourcePath,memberSpan) {
  let difference='complete scope metadata';
  // Diagnostic only: these parsed bindings never replace the independently
  // captured owner digest or participate in admission. Native descriptors
  // avoid invoking a caller getter, proxy trap or overridden Map method.
  try {
    const map=ownData(parser,'sourceNamespaceBindingEvidence');
    if(types.isProxy(map)||Object.getPrototypeOf(map)!==Map.prototype||Reflect.ownKeys(map).length)throw new TypeError('non-native diagnostic binding map');
    const original=copyMetadata(mapGet.call(map,transform.modulePath.join('.'))),outer=scope?.bindingEvidence?.bindings;
    if(Array.isArray(original)&&Array.isArray(outer))for(const expected of original){
      const actual=outer.find(binding=>binding.name===expected.name&&binding.namespace===expected.namespace);
      if(!actual){difference=`missing ${expected.namespace} binding ${expected.name}`;break;}
      if(metadataDigest(actual)!==metadataDigest(expected)){
        const key=[...new Set([...Object.keys(actual),...Object.keys(expected)])].sort().find(key=>!Object.hasOwn(actual,key)||!Object.hasOwn(expected,key)||metadataDigest(actual[key])!==metadataDigest(expected[key]));
        difference=`${expected.namespace} binding ${expected.name}.${key??'metadata'}`;break;
      }
    }
  }catch(error){if(!(error instanceof TypeError))throw error;}
  const path=typeof sourcePath==='string'?sourcePath:'<unproved source path>',name=typeof entry.name==='string'?entry.name:'<unproved method name>';
  return `method binding scope differs from its independently captured original owner (${JSON.stringify(path.slice(0,256))}:${memberSpan.start}..${memberSpan.end} ${JSON.stringify(name.slice(0,80))}; ${difference.slice(0,160)})`;
}
export function linkProjectMethodDeclaration(parser,entry,normalized,semantic,{source,sourcePath,memberSpan,bodySpan,globalOffset=0,scope=null}) {
  if(typeof source!=='string')fail('method requires complete original source text');
  copyMetadata(entry);copyMetadata(normalized);copyMetadata(semantic);
  ({sourcePath,memberSpan,bodySpan,globalOffset,scope}=copyMetadata({sourcePath,memberSpan,bodySpan,globalOffset,scope}));
  const record=parsed.get(parser)?.find(record=>record.entry===entry);
  if(!record||record.syntaxSha256!==metadataDigest(parsedSyntax(entry)))fail('method requires unchanged captured parser body/signature');
  const marker=ownData(semantic,'sourceMethodProof'),transform=ownData(ownData(marker,'parse'),'transform');
  if(marker.schema!=='original-method-semantic-source-v1'||transform.sourcePath!==sourcePath||transform.sourceSha256!==hash(source)||metadataDigest(transform.originalMemberSpan)!==metadataDigest(memberSpan)||metadataDigest(transform.originalBodySpan)!==metadataDigest(bodySpan))fail('method source differs from its exact original transform');
  if(!Number.isSafeInteger(memberSpan.start)||!Number.isSafeInteger(memberSpan.end)||memberSpan.start<0||memberSpan.end>source.length||memberSpan.end<=memberSpan.start||bodySpan.start<memberSpan.start||bodySpan.end>memberSpan.end||metadataDigest(record.bodySpan)!==metadataDigest(bodySpan))fail('method body escapes its captured original member');
  const context=originalContext(source),implementation=context.items.find(item=>item.term==='impl'&&item.start===transform.originalImplementationSpan.start&&item.end===transform.originalImplementationSpan.end&&item.start<=memberSpan.start&&memberSpan.end<=item.end);
  if(!implementation)fail('method has no exact enclosing original implementation');
  if(metadataDigest(scope?.compilationProfile??null)!==metadataDigest(transform.owner.compilationProfile))fail('method compilation profile differs from its original source');
  if(metadataDigest(scope?.bindingEvidence??null)!==transform.owner.scopeMetadataSha256)fail(methodScopeMismatch(parser,scope,transform,entry,sourcePath,memberSpan));
  verifyRelocatedSyntax(normalized,semantic,globalOffset);
  const evidence={schemaVersion:1,sourceAssociationKind:'original-inherent-token-transform',sourcePath,sourceBytes:context.sourceBytes,sourceSha256:context.sourceSha256,declarationSpan:copyMetadata(memberSpan),declarationSha256:hash(source.slice(memberSpan.start,memberSpan.end)),bodySpan:copyMetadata(bodySpan),bodySha256:hash(source.slice(bodySpan.start,bodySpan.end)),checkedSpan:copyMetadata(semantic.span),sourceOffset:globalOffset,sourceScopeSha256:metadataDigest(scope),compilationProfileSha256:metadataDigest(scope?.compilationProfile??null),parsedSurfaceSha256:metadataDigest(semantic),originalMethodTransformSha256:metadataDigest(transform)};
  linked.set(semantic,freeze(evidence));return true;
}
export function linkParsedFile(parser,surface,source,{sourcePath='<standalone>',scope=null}={}) {
  const visit=(items,path=[])=>{for(const entry of items){if(entry.k==='module')visit(entry.items,[...path,entry.name]);else if(!entry.generated)attach(parser,entry,entry,{source,sourcePath,path,scope});}};
  visit(surface.items);return surface;
}
export function relocateSourceLink(entry,semantic,{source,sourcePath,itemSpan,offset=0,scope=null}) {
  const evidence=linked.get(entry);if(!evidence)return false;
  if(evidence.parsedSurfaceSha256!==metadataDigest(entry)||hash(source.slice(itemSpan.start,itemSpan.end))!==evidence.declarationSha256)fail('original declaration differs from parsed source');
  const shift=itemSpan.start-evidence.declarationSpan.start;
  verifyRelocatedSyntax(entry,semantic,shift+offset);
  const context=originalContext(source);
  linked.set(semantic,freeze({...copyMetadata(evidence),sourcePath,sourceBytes:context.sourceBytes,sourceSha256:context.sourceSha256,declarationSpan:copyMetadata(itemSpan),bodySpan:{start:evidence.bodySpan.start+shift,end:evidence.bodySpan.end+shift},checkedSpan:copyMetadata(semantic.span),sourceOffset:offset,sourceScopeSha256:metadataDigest(scope),compilationProfileSha256:metadataDigest(scope?.compilationProfile??null),parsedSurfaceSha256:metadataDigest(semantic)}));
  const origin=syntaxOrigins.get(entry);if(origin){const association=rangeSyntaxOrigin(origin.parser,origin.syntax,semantic,origin.offset+shift+offset);if(association)syntaxOrigins.set(semantic,association);}
  return true;
}
export function linkedSourceContext(surface) {
  const result=new Map();
  const visit=(items,path=[])=>{for(const entry of items){if(entry.k==='module')visit(entry.items,[...path,entry.name]);else {const evidence=linked.get(entry);if(evidence){if(evidence.parsedSurfaceSha256!==metadataDigest(entry))fail('parsed declaration changed after source capture');result.set([...path,entry.name].join('.'),evidence);}}}};
  visit(surface.items);const token=Object.freeze({schemaVersion:1,kind:'private-parser-source-context'});capturedContexts.set(token,result);return token;
}
// Read-only access to an existing private parser association. Checking the
// WeakMap first rejects public clones/proxies without inspecting their fields.
// The digest is integrity after issuance, never a caller authority mechanism.
export function originalParsedDeclarationEvidence(entry) {
  const evidence=linked.get(entry);if(!evidence)return null;
  if(evidence.parsedSurfaceSha256!==metadataDigest(entry))fail('original parsed declaration changed after source capture');
  return evidence;
}
// Recover a node only through an existing genuine, unchanged parent link.
// The private origin was retained at its approved relocation boundary; public
// clones, checksums and caller-selected offsets cannot create this association.
// This records ordinary parse/relocation only, not method normalization.
export function originalParsedSyntaxNode(entry,node){
  const origin=syntaxOrigins.get(entry),association=origin?.nodes.get(node);
  if(!association||!originalParsedDeclarationEvidence(entry))return null;
  let actual=entry;for(const key of association.path)actual=ownData(actual,key);
  if(actual!==node)return null;
  return Object.freeze({parser:origin.parser,original:association.original,actual,relocated:relocatedSyntax(copyMetadata(association.original),origin.offset)});
}
// Only a successful compiler check associates a program with its captured
// parser context. External checked-looking IR cannot mint a bound certificate.
export function withCheckedSourceLinks(Base) {return class extends Base {
  program(surface) {
    const context=linkedSourceContext(surface),program=super.program(surface),digests=new Map();
    for(const [name] of capturedContexts.get(context)){const entry=program.declarations.get(name);if(entry)digests.set(name,metadataDigest({signature:signature(entry),body:entry.body??entry.ctors,span:entry.span}));}
    checkedContexts.set(program,{context,digests});return program;
  }
};}
export const checkedSourceContext=program=>checkedContexts.get(program)?.context??null;
export function bindCheckedSourceLinks(program,context,options={}) {
  const captured=capturedContexts.get(context);if(!captured)fail('requires a private parser source context');
  const checked=checkedContexts.get(program);if(checked?.context!==context)fail('requires a genuine checked parser invocation');
  const {targetProfile,compilationProfile=null}=copyMetadata(options);
  if(!targetProfile)fail('requires an explicit target profile');
  const links=new Map(),declarations=snapshotMap(ownData(program,'declarations'));
  for(const [name,evidence] of captured){
    const entry=mapGet.call(declarations,name);if(!entry)continue;
    if(checked.digests.get(name)!==metadataDigest({signature:signature(entry),body:entry.body??entry.ctors,span:entry.span}))fail('checked declaration changed before source binding');
    if(entry.fullName!==name||entry.span?.start!==evidence.checkedSpan?.start||entry.span?.end!==evidence.checkedSpan?.end)fail('checked declaration differs from captured parser association');
    if(compilationProfile!==null&&metadataDigest(compilationProfile)!==evidence.compilationProfileSha256)fail('compilation profile differs from captured source');
    links.set(name,freeze({...copyMetadata(evidence),checkedSignatureSha256:metadataDigest(signature(entry)),checkedBodySha256:metadataDigest(entry.body??entry.ctors),targetProfileSha256:metadataDigest(targetProfile)}));
  }
  const token=Object.freeze({schemaVersion:1,kind:'private-parser-source-links'});bound.set(token,links);return token;
}
export function checkedSourceEvidence(token,entry) {
  const links=bound.get(token);if(!links)return null;
  const evidence=mapGet.call(links,entry.fullName);if(!evidence)return null;
  if(evidence.checkedSignatureSha256!==metadataDigest(signature(entry))||evidence.checkedBodySha256!==metadataDigest(entry.body??entry.ctors)||entry.span?.start!==evidence.checkedSpan.start||entry.span?.end!==evidence.checkedSpan.end)fail('checked source association became stale');
  return evidence;
}
