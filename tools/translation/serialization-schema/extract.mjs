import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { captureSourceCorpus, sourceCorpusPaths, sourceCorpusText } from '../source-corpus.mjs';
import { resolveModuleGraph } from '../project.mjs';
import { loadDeriveDependencyProof, deriveDependencySource } from '../derive-dependencies.mjs';
import { createDeriveFootprintContext, deriveFootprintAt, deriveFootprintExternalModules } from '../derive-footprints.mjs';
import { resolveModuleBindings } from '../module-bindings.mjs';
import { originalSourceModuleItems } from '../source-module-views.mjs';
import { inspectDeriveInput } from '../derive-inputs.mjs';
import { compilationProfile, itemConfiguration } from '../cfg-profile.mjs';
import { configureParserSourceScope } from '../source-scopes.mjs';
import { withSourceNamespaceParser } from '../extensions/source-namespaces.mjs';
import { primitiveFieldDefault } from './primitive-default.mjs';
import { captureJsonSerializationSources, jsonSerializationExternalModule, jsonSerializationType, jsonValueDefault } from './json-source.mjs';

const contexts = new WeakMap();
// Reuse the production namespace walk and original visibility/reexport maps;
// no expression/body parser or synthetic binding table is introduced here.
const SourceNamespaceResolver=withSourceNamespaceParser(class {});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const key = path => path.join('::');
export const SERIALIZATION_LIMITS = Object.freeze({ types: 128, fields: 1024, variants: 1024, typeDepth: 16, metaBytes: 4 * 1024 * 1024 });
export function freeze(value) { if(value && typeof value === 'object') { for(const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
export class SerializationRefusal extends TypeError {
  constructor(message, source = null, span = null) { super(message); this.name = 'SerializationRefusal'; this.diagnostic = { kind: 'serialization-schema-refusal', message, source, span }; }
}
const refuse = (message, module, span) => { throw new SerializationRefusal(message, module?.file ?? null, span ?? null); };

// Callers cannot manufacture a source/namespace certificate by copying its JSON.
export function captureSerializationContext({ root, paths, entry = 'src/lib.rs', compilationProfile: input = null } = {}) {
  root = resolve(root);
  const corpus = captureSourceCorpus({ root, paths }), profile = compilationProfile(input);
  const graph = resolveModuleGraph({ entry, paths: sourceCorpusPaths(corpus, root), readSource: path => sourceCorpusText(corpus, root, path), compilationProfile: profile });
  const dependencies = loadDeriveDependencyProof({ manifest: sourceCorpusText(corpus, root, 'Cargo.toml'), lock: sourceCorpusText(corpus, root, 'Cargo.lock') });
  const derive = createDeriveFootprintContext({ modules: graph.modules, dependencies, compilationProfile: profile });
  const json=captureJsonSerializationSources({manifest:sourceCorpusText(corpus,root,'Cargo.toml'),lock:sourceCorpusText(corpus,root,'Cargo.lock'),deriveDependencies:dependencies,compilationProfile:profile});
  const external=new Map(deriveFootprintExternalModules(derive));external.set('serde_json',jsonSerializationExternalModule(json));
  const bindings = resolveModuleBindings({ modules: graph.modules, externalModules: external, deriveContext: derive, compilationProfile: profile });
  const modules = new Map(graph.modules.map(module => [key(['crate', ...module.path]), module]));
  const scopes = new Map(bindings.scopes.map(scope => [key(['crate', ...scope.path]), scope]));
  const caseInput=deriveDependencySource(dependencies,'serde_derive','src/internals/case.rs');
  const {source:caseBody,...caseSource}=caseInput;
  const dependencyEvidence={schema:dependencies.schema,manifestSha256:dependencies.manifestSha256,lockSha256:dependencies.lockSha256,sourceProfileSha256:dependencies.sourceProfileSha256,edition:dependencies.edition,rustVersion:dependencies.rustVersion,features:dependencies.features,packages:dependencies.packages,standardCore:dependencies.standardCore};
  const description = freeze({ schema: 'original-serialization-context-v1', entry, compilationProfile: profile, sourceSetSha256: corpus.sourceSetSha256, sources: corpus.sources, cargo: corpus.cargo, dependenciesDigest: dependencies.digest, caseSource, dependencyEvidence, runtimeAuthority: false, generatedTraitBehavior: false });
  contexts.set(description, { corpus, graph, modules, scopes, derive, dependencies, json, namespaceResolvers:new Map() });
  return description;
}
export const isSerializationContext = context => !!context && contexts.has(context);
function state(context) { const value = contexts.get(context); if(!value) throw new SerializationRefusal('Unsealed original serialization context'); return value; }
function matching(tokens, at) {
  const pairs = { '[':']', '(':')', '{':'}', '<':'>' }, stack = [];
  for(let index=at; index<tokens.length; index++) { const token=tokens[index].text; if(pairs[token]) stack.push(pairs[token]); else if([']',')','}','>'].includes(token)) { if(stack.pop()!==token) throw new SerializationRefusal('Unbalanced original declaration delimiters'); if(!stack.length) return index; } }
  throw new SerializationRefusal('Unterminated original declaration');
}
function groups(tokens) {
  const rows=[]; let begin=0;
  for(let at=0;at<tokens.length;at++) { if(['[','(','{','<'].includes(tokens[at].text)) at=matching(tokens,at); else if(tokens[at].text===',') { if(at>begin) rows.push(tokens.slice(begin,at)); begin=at+1; } }
  if(begin<tokens.length) rows.push(tokens.slice(begin)); return rows;
}
function head(tokens) {
  let at=0;
  while(tokens[at]?.text==='#') { if(tokens[at+1]?.text!=='[') throw new SerializationRefusal('Unproved data attribute syntax'); at=matching(tokens,at+1)+1; }
  if(tokens[at]?.text==='pub') { at++; if(tokens[at]?.text==='(') at=matching(tokens,at)+1; }
  return at;
}
const span = tokens => ({ start:tokens[0].start, end:tokens.at(-1).end, unit:'utf16' });
function attributes(input,tokens) { const bounds=span(tokens); return input.attributes.filter(attribute=>attribute.span.start>=bounds.start && attribute.span.end<=bounds.end); }
function dataLayoutTokens(module,tokens) {
  const result=[],pending=[],pairs={'[':']','(':')','{':'}','<':'>'};
  for(const token of tokens) {
    // Rust's type grammar consumes a joint >> as two closes only when two
    // nested generic lists are pending. Preserve each original character span.
    // A shift inside a braced expression has } on top and stays one token;
    // unsupported const expressions still fail the bounded type grammar.
    if(token.text==='>>'&&pending.at(-1)==='>'&&pending.at(-2)==='>') {
      if(module.source.slice(token.start,token.end)!=='>>')refuse('Joint generic closer lacks exact original token bytes',module,span([token]));
      for(let index=0;index<2;index++){result.push({...token,text:'>',start:token.start+index,end:token.start+index+1});pending.pop();}
      continue;
    }
    result.push(token);
    if(pairs[token.text])pending.push(pairs[token.text]);
    else if(token.text===pending.at(-1))pending.pop();
  }
  return result;
}
function resolvePath(s,module,path,allowPrelude=false) {
  const segments=path.split('::'), current=s.scopes.get(key(['crate',...module.path]));
  if(!current || current.configurationCondition!=='active') refuse('Original type scope has no active checked module',module);
  if(current.unresolvedImports.some(entry=>entry.glob)) refuse('Unproved glob may shadow a serialization type',module);
  if(allowPrelude && segments.length===1 && ['String','Vec','Option','bool','i8','i16','i32','i64','u8','u16','u32','u64'].includes(path)) {
    if(current.bindings.some(binding=>binding.name===path && binding.namespace==='type') || current.unresolvedTypeScope) refuse('Prelude serialization type is shadowed or unresolved: '+path,module);
    return { owner:'rust-prelude::'+path, primitive:path };
  }
  const scopeKey=key(['crate',...module.path]);
  let resolver=s.namespaceResolvers.get(scopeKey);
  if(!resolver) {
    resolver=new SourceNamespaceResolver();resolver.cursor={peek:()=>null};
    configureParserSourceScope(resolver,current,[...s.scopes.values()],module.path);
    s.namespaceResolvers.set(scopeKey,resolver);
  }
  // Keep each occurrence's route evidence independent of prior field walks.
  resolver.sourceNamespaceResolvedBindings=new Map();
  const canonical=resolver.resolveSourceNamespace(segments,module.path,'type');
  if(Array.isArray(canonical)&&canonical.length===2&&canonical[0]==='serde_json'&&['Value','Map'].includes(canonical[1])) {
    if(segments[0]==='serde_json')for(let depth=module.path.length;depth>=0;depth--) {
      const ancestor=s.scopes.get(key(['crate',...module.path.slice(0,depth)])),binding=ancestor?.bindings.find(binding=>binding.namespace==='type'&&binding.name==='serde_json');
      if(binding&&(binding.status!=='resolved'||key(binding.target??[])!=='serde_json'))refuse('Original external JSON crate root is shadowed or unresolved',module);
    }
    return {owner:key(canonical),primitive:null,json:canonical[1],routeBindings:[...resolver.sourceNamespaceResolvedBindings.values()]};
  }
  if(!Array.isArray(canonical)||canonical[0]!=='crate'||canonical.some(part=>part.startsWith('ml_'))) refuse('Written serialization type is inaccessible or has no checked original source route: '+path,module);
  const ownerScope=s.scopes.get(key(canonical.slice(0,-1)));
  if(!ownerScope || ownerScope.unresolvedTypeScope) refuse('Qualified serialization type scope remains unresolved: '+key(canonical),module);
  const candidates=ownerScope.bindings.filter(binding=>binding.namespace==='type' && binding.name===canonical.at(-1));
  if(candidates.length!==1 || candidates[0].status!=='resolved' || key(candidates[0].target)!==key(canonical)) refuse('Qualified serialization type has no unique original owner: '+path,module);
  return { owner:key(canonical), primitive:null, routeBindings:[...resolver.sourceNamespaceResolvedBindings.values()] };
}
function typeReference(s,module,tokens,depth=0) {
  if(depth>SERIALIZATION_LIMITS.typeDepth || !tokens.length) refuse('Serialization type nesting exceeds checked grammar',module,tokens.length?span(tokens):null);
  let at=0, names=[];
  while(at<tokens.length) { const token=tokens[at++];if(token.type!=='ident' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(token.text)) refuse('Unsupported serialization type syntax',module,span(tokens));names.push(token.text);if(tokens[at]?.text!=='::')break;at++; }
  const written=names.join('::'), resolution=resolvePath(s,module,written,true), evidence={written,owner:resolution.owner,span:span(tokens),...(resolution.routeBindings?{routeBindings:resolution.routeBindings}:{})};
  if(at===tokens.length) {
    if(resolution.json==='Map')refuse('External JSON Map requires its exact String/Value arguments',module,span(tokens));
    if(resolution.json)return {...evidence,kind:'json-value',sourceProof:jsonSerializationType(s.json,resolution.json)};
    if(['Vec','Option'].includes(resolution.primitive)) refuse('Generic serialization constructor lacks its element type',module,span(tokens));
    return {...evidence,kind:resolution.primitive?'primitive':'named',...(resolution.primitive?{name:resolution.primitive}:{})};
  }
  if(resolution.json==='Map'&&tokens[at]?.text==='<'&&matching(tokens,at)===tokens.length-1) {
    const args=groups(tokens.slice(at+1,-1));if(args.length!==2)refuse('External JSON Map has unsupported arity',module,span(tokens));
    const types=args.map(tokens=>typeReference(s,module,tokens,depth+1));
    if(types[0].kind!=='primitive'||types[0].owner!=='rust-prelude::String'||types[1].kind!=='json-value'||types[1].owner!=='serde_json::Value')refuse('Only the actual external Map<String,Value> trait specialization is admitted',module,span(tokens));
    return {...evidence,kind:'json-map',arguments:types,sourceProof:jsonSerializationType(s.json,'Map')};
  }
  if(tokens[at]?.text!=='<' || matching(tokens,at)!==tokens.length-1 || !['Vec','Option'].includes(resolution.primitive)) refuse('Only proven Option/Vec type applications are projected',module,span(tokens));
  const args=groups(tokens.slice(at+1,-1));if(args.length!==1) refuse('Serialization constructor arity is unsupported',module,span(tokens));
  return {...evidence,kind:resolution.primitive==='Vec'?'vec':'option',type:typeReference(s,module,args[0],depth+1)};
}
function fields(s,module,tokens,input) {
  const rows=groups(tokens);if(rows.length>SERIALIZATION_LIMITS.fields)refuse('Serialization field budget exceeded',module);
  return rows.map(row=>{
    const at=head(row);if(row[at]?.type!=='ident'||row[at+1]?.text!==':')refuse('Only named original serialization fields are projected',module,span(row));
    const field={name:row[at].text,span:span(row),attributes:attributes(input,row),type:typeReference(s,module,row.slice(at+2))};
    const bareDefault=field.attributes.some(attribute=>attribute.name==='serde'&&attribute.helpers?.some(helper=>helper.key==='default'&&helper.value===null));
    if(bareDefault&&field.type.kind==='primitive'&&/^(?:bool|[iu](?:8|16|32|64))$/.test(field.type.name)) {
      try{field.defaultProof=primitiveFieldDefault(field.type,s.dependencies);}catch(error){refuse('Original primitive Default body is unproved: '+error.message,module,field.span);}
    }
    if(bareDefault&&field.type.kind==='json-value') {
      try{field.defaultProof=jsonValueDefault(s.json);}catch(error){refuse('Original JSON Default body is unproved: '+error.message,module,field.span);}
    }
    return field;
  });
}
function declaration(s,owner,direction) {
  const parts=owner.split('::'),module=s.modules.get(key(parts.slice(0,-1)));if(!module)refuse('Reachable serialization owner is not an original tracked module: '+owner);
  const items=originalSourceModuleItems(module).filter(item=>['struct','enum'].includes(item.term)&&item.name===parts.at(-1));
  if(items.length!==1)refuse('Serialization owner does not identify one original data declaration: '+owner,module);
  const item=items[0], certificate=deriveFootprintAt(s.derive,module,item);
  const required=direction==='both'?['serde::Serialize','serde::Deserialize']:[direction==='serialize'?'serde::Serialize':'serde::Deserialize'];
  if(!certificate || !required.every(target=>certificate.owners.some(value=>key(value.target)===target))) refuse('Actual locked '+required.join('/')+' owners are unproved: '+owner,module,{start:item.start,end:item.end});
  const input=inspectDeriveInput(item,module.compilationProfile),tokens=dataLayoutTokens(module,item.tokens.filter(token=>token.type!=='comment')),at=head(tokens);
  // The shared footprint grammar confines helper input, but JSON-only escapes
  // must not make invalid Rust literals executable descriptor metadata.
  for(const attribute of input.attributes) for(const text of attribute.tokens.filter(token=>token.startsWith('"'))) {
    for(let index=1;index<text.length-1;index++) if(text[index]==='\\') {
      if(!['\\','"','n','r','t'].includes(text[++index])) refuse('Rust helper literal escape lacks a checked serialization spelling',module,attribute.span);
    }
  }
  if(tokens[at]?.text!==item.term||tokens[at+1]?.text!==item.name||tokens[at+2]?.text!=='{'||matching(tokens,at+2)!==tokens.length-1)refuse('Tuple/newtype/generic/discriminant serialization declaration is unsupported',module,{start:item.start,end:item.end});
  const common={owner,name:item.name,source:module.file,sourceSha256:hash(module.source),span:{start:item.start,end:item.end,unit:'utf16'},itemSha256:hash(module.source.slice(item.start,item.end)),attributes:input.attributes,derives:input.derives,deriveCertificateDigest:certificate.digest,kind:item.term};
  if(item.term==='struct')return {...common,fields:fields(s,module,tokens.slice(at+3,-1),input)};
  const rows=groups(tokens.slice(at+3,-1));if(rows.length>SERIALIZATION_LIMITS.variants)refuse('Serialization variant budget exceeded',module);
  return {...common,variants:rows.map(row=>{const first=head(row),name=row[first];if(name?.type!=='ident')refuse('Serialization variant needs an original identifier',module,span(row));let layout='unit',members=[];if(first+1<row.length){if(row[first+1].text!=='{'||matching(row,first+1)!==row.length-1)refuse('Tuple/discriminant variant requires a separately proven projection',module,span(row));layout='struct';members=fields(s,module,row.slice(first+2,-1),input);}return {name:name.text,span:span(row),attributes:attributes(input,row).filter(attribute=>attribute.position==='variant'),layout,fields:members};})};
}
export function extractSerializationSchema(context,{roots,direction='both'}={}) {
  if(!['both','serialize','deserialize'].includes(direction))refuse('Serialization direction must have an actual checked trait identity');
  const s=state(context);if(!Array.isArray(roots)||!roots.length||roots.some(value=>typeof value!=='string'||!/^crate(?:::[A-Za-z_][A-Za-z0-9_]*)+$/.test(value)))refuse('Roots must be explicit original crate-qualified data types');
  const queue=[...new Set(roots)],types=[];const seen=new Set();
  function reachable(type){if(type.kind==='named')queue.push(type.owner);if(type.type)reachable(type.type);}
  while(queue.length){const owner=queue.shift();if(seen.has(owner))continue;seen.add(owner);if(seen.size>SERIALIZATION_LIMITS.types)refuse('Reachable serialization type budget exceeded');const value=declaration(s,owner,direction);types.push(value);for(const member of value.fields??value.variants.flatMap(variant=>variant.fields))reachable(member.type);}
  const meta={schema:'original-serialization-meta-v1',...(direction!=='both'?{direction}:{}),context:{entry:context.entry,compilationProfile:context.compilationProfile,sourceSetSha256:context.sourceSetSha256,dependenciesDigest:context.dependenciesDigest,dependencyEvidence:context.dependencyEvidence,caseSource:context.caseSource,cargo:context.cargo},roots:[...new Set(roots)],types:types.sort((a,b)=>a.owner<b.owner?-1:a.owner>b.owner?1:0),obligations:['Bounded data layout projection only; custom serializers, generated traits and whole-crate runtime parity remain unproved'],runtimeAuthority:false,generatedTraitBehavior:false};
  return freeze(meta);
}

// Full original graph discovery is private-context-backed. Unknown derives,
// data scopes and manual trait impls remain source-bearing obligations rather
// than disappearing because a spelling did not match a seven-type list.
export function discoverSerializationCorpus(context) {
  const s=state(context), declarations=[],manualTraitImplementations=[];
  for(const module of s.graph.modules) for(const item of originalSourceModuleItems(module)) {
    if(!['struct','enum','impl'].includes(item.term))continue;
    const tokens=item.tokens.filter(token=>token.type!=='comment');
    const attributes=[];
    for(let at=0;at<tokens.length;at++)if(tokens[at].text==='#'&&tokens[at+1]?.text==='[') {
      const end=matching(tokens,at+1);attributes.push({name:tokens[at+2]?.text,span:{start:tokens[at].start,end:tokens[end].end,unit:'utf16'},tokens:tokens.slice(at,end+1).map(token=>token.text)});at=end;
    }
    const evidence={source:module.file,module:[...module.path],sourceSha256:hash(module.source),itemSha256:hash(module.source.slice(item.start,item.end)),span:{start:item.start,end:item.end,unit:'utf16'},attributes};
    if(item.term==='impl') {
      const body=tokens.findIndex(token=>token.text==='{'),header=tokens.slice(0,body<0?tokens.length:body);
      if(header.some(token=>token.text==='for'))manualTraitImplementations.push({...evidence,headerTokens:header.map(token=>token.text),status:'unproved-manual-trait-implementation',obligation:'Manual trait bodies are not lowered or inferred as serde behavior'});
      continue;
    }
    const owner=key(['crate',...module.path,item.name]),scope=s.scopes.get(key(['crate',...module.path]));
    const condition=itemConfiguration(item.tokens,module.compilationProfile);
    const configurationStatus=module.configurationCondition==='inactive'||condition.status==='inactive'?'inactive':module.configurationCondition!=='active'||condition.status!=='active'?'unknown':'active';
    const active=configurationStatus==='active'&&module.items.some(candidate=>candidate.start===item.start&&candidate.end===item.end);
    let certificate=null,diagnostic=null;
    if(active)try{certificate=deriveFootprintAt(s.derive,module,item);}catch(error){diagnostic=error.diagnostic??{kind:'serialization-owner-refusal',message:error.message,source:module.file,span:evidence.span};}
    const owners=certificate?.owners??[],serdeOwners=owners.filter(owner=>['serde::Serialize','serde::Deserialize'].includes(key(owner.target)));
    const hasDerive=attributes.some(attribute=>attribute.name==='derive'),hasSerdeHelpers=attributes.some(attribute=>attribute.name==='serde');
    const status=configurationStatus==='inactive'?'inactive-original-configuration':!active?'unproved-original-scope':serdeOwners.length?'actual-locked-serde-owner':hasDerive||hasSerdeHelpers?'unproved-derived-or-helper-owner':'no-derived-serde-invocation';
    declarations.push({...evidence,owner,name:item.name,kind:item.term,status,configurationStatus,condition,scopeTypeUnresolved:scope?.unresolvedTypeScope??true,serdeOwners:serdeOwners.map(owner=>({path:owner.path,target:owner.target,source:owner.source,dependencyDigest:owner.dependencyDigest})),...(certificate?{deriveCertificateDigest:certificate.digest}:{}),...(diagnostic?{diagnostic}:{}),...(status==='unproved-derived-or-helper-owner'?{diagnostic:s.derive.diagnostics.find(value=>value.source===module.file&&value.span.start===item.start)??{kind:'serialization-owner-refusal',message:'Original derive/helper owner has no certified layout footprint',source:module.file,span:evidence.span}}:{})});
  }
  return freeze({schema:'original-serialization-discovery-v1',sourceSetSha256:context.sourceSetSha256,compilationProfile:context.compilationProfile,dependenciesDigest:context.dependenciesDigest,declarations:declarations.sort((a,b)=>a.owner<b.owner?-1:a.owner>b.owner?1:a.span.start-b.span.start),manualTraitImplementations,graphDiagnostics:s.graph.diagnostics,sourceCoverage:context.sources.map(source=>({...source,modules:s.graph.modules.filter(module=>module.file===source.source).map(module=>['crate',...module.path].join('::')),status:s.graph.modules.some(module=>module.file===source.source)?'original-module-views-accounted':'outside-reviewed-entry-graph',runtimeAuthority:false})),runtimeAuthority:false,generatedTraitBehavior:false});
}
