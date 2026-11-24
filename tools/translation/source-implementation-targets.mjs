// Original implementation targets are independent of executable trait bodies.
// This lane only excludes canonical String/&str from a different nominal Copy
// owner; it supplies no trait, allocator, destructor or general scope authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {sourceItems} from './rust-structure.mjs';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {configureParserSourceScope} from './source-scopes.mjs';
import {HostRustParser,originalHostParserIdentitySnapshot} from './extensions/host-contracts.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from './extensions/text.mjs';
import {assertOriginalParserIdentity} from './original-parser-identity.mjs';
import {metadataDigest} from './extensions/source-links.mjs';
import {originalContainerDefaultBody,assertOriginalContainerDefaultBody} from './default-container-source.mjs';
import {STANDARD_NAMESPACE_PROFILE} from './namespace-standard.mjs';
import {SHARED_REFERENCE_COPY_SOURCE} from './shared-reference-copy-source.mjs';
const issued=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),fail=message=>{throw new TypeError('Original implementation target: '+message);};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fingerprint=value=>metadataDigest(Object.fromEntries(Object.entries(value).filter(([key])=>key!=='sourceImplementationTarget')));
let standardString;
function originalStringIdentity(){
 if(standardString)return standardString;
 const declaration=assertOriginalContainerDefaultBody(originalContainerDefaultBody('String')).evidence.declaration;
 const stdPin=STANDARD_NAMESPACE_PROFILE.sources.find(row=>row.url.endsWith('/library/std/src/lib.rs'));
 const packed=readFileSync(new URL('./source-profiles/namespace-standard/'+stdPin.archive,import.meta.url)),raw=gunzipSync(packed,{maxOutputLength:40000});
 if(hash(packed)!==stdPin.archiveSha256||raw.length!==stdPin.bytes||hash(raw)!==stdPin.sha256)fail('complete original std source differs');
 const std=raw.toString('utf8');
 const csvRoot=new URL('./source-profiles/csv-strings/',import.meta.url),profile=JSON.parse(readFileSync(new URL('manifest.json',csvRoot))),preludePin=profile.sources.find(row=>row.file==='std-prelude-v1.rs.gz'),preludePacked=readFileSync(new URL(preludePin.file,csvRoot)),preludeRaw=gunzipSync(preludePacked,{maxOutputLength:8000});
 if(hash(preludePacked)!==preludePin.compressedSha256||preludeRaw.length!==preludePin.bytes||hash(preludeRaw)!==preludePin.sha256)fail('complete original common prelude differs');
 const prelude=preludeRaw.toString('utf8');
 // Select actual original reexports with their complete attributes retained.
 const selectUse=(source,syntax)=>{const rows=sourceItems(source).filter(item=>item.tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('').endsWith(syntax));if(rows.length!==1)fail('original String reexport differs');return {span:{start:rows[0].start,end:rows[0].end},original:source.slice(rows[0].start,rows[0].end)};};
 standardString=freeze({declaration,stdAlias:{source:'library/std/src/lib.rs',sourceSha256:stdPin.sha256,...selectUse(std,'externcrateallocasalloc_crate;')},stdReexport:{source:'library/std/src/lib.rs',sourceSha256:stdPin.sha256,...selectUse(std,'pubusealloc_crate::string;')},commonPrelude:{source:'library/std/src/prelude/v1.rs',sourceSha256:preludePin.sha256,...selectUse(prelude,'pubusecrate::string::{String,ToString};')},traitBodiesExecuted:false,allocatorInternalsCompiled:false});return standardString;
}
export function bindOriginalStandardImplementationTarget(implementation,{module,modules,sourceScopes,Parser=HostRustParser}={}){
 if(types.isProxy(implementation)||types.isProxy(module)||!implementation||!module||Parser!==HostRustParser)fail('plain original implementation and actual Host parser required');
 assertResolvedSourceScopeOrigin(sourceScopes,{modules,compilationProfile:module.compilationProfile});
 const scope=sourceScopes.find(row=>moduleScopeKey(row)===moduleScopeKey(module)),ancestors=sourceScopes.filter(row=>row.path.every((name,index)=>module.path[index]===name));
 if(!scope||ancestors.some(row=>row.configurationCondition!=='active'||row.unresolvedTypeScope||row.unresolvedAttributeMacroScope))fail('original target type/attribute namespace remains unresolved');
 const candidates=originalSourceModuleItems(module).filter(row=>row.term==='impl'&&row.start===implementation.span?.start&&row.end===implementation.span?.end);
 if(candidates.length!==1||implementation.sourcePath!==module.file||!same(implementation.modulePath,module.path))fail('implementation is outside its exact original source span');
 const item=candidates[0];if(item.tokens.some(token=>token.type==='comment'&&/^\/\/[/!]|^\/\*[*!]/.test(token.text)))return implementation;
 const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{'),header=tokens.slice(0,open);
 if(itemConfiguration(item.tokens,module.compilationProfile).status!=='active'||header[0]?.text!=='impl'||header[1]?.text==='<'||header.some(token=>['#','!','unsafe','where','default'].includes(token.text)))return implementation;
 if(!same(implementation.headerSpan,{start:header[0].start,end:header.at(-1).end}))fail('complete original header span differs');
 let depth=0,forAt=-1;for(let index=1;index<header.length;index++){const text=header[index].text;if(text==='<')depth++;if(text==='>')depth--;if(text==='>>')depth-=2;if(depth<0)return implementation;if(!depth&&text==='for'){if(forAt!==-1)return implementation;forAt=index;}}
 if(depth||forAt<2)return implementation;
 const target=header.slice(forAt+1),syntax=target.map(token=>token.text).join('');if(!['String','&str'].includes(syntax))return implementation;
 // Unknown nested attributes/macros/impls can create unrelated impl effects.
 // Do not use a known target to erase those independent obligations.
 const body=tokens.slice(open+1,-1);if(body.some(token=>token.text==='#'||token.text==='impl'||token.text==='macro'||token.text==='macro_rules!'||token.text.endsWith('!')||token.text==='!'))return implementation;
 for(const owner of modules.filter(owner=>owner.path.every((part,index)=>module.path[index]===part)))for(const row of originalSourceModuleItems(owner))if(row.tokens[1]?.text==='!'&&row.tokens.some(token=>['no_implicit_prelude','no_std','no_core'].includes(token.text)))return implementation;
 const parser=new Parser(tokenizeRust(module.source));configureParserSourceScope(parser,scope,sourceScopes,module.path);parser.modulePath=[...module.path];
 const identity=originalHostParserIdentitySnapshot(),guard=()=>{assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(identity.parserMethods));assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(identity.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});};
 const start=target[0].start,end=target.at(-1).end;parser.cursor.index=parser.cursor.tokens.findIndex(token=>token.start===start);if(parser.cursor.index<0)fail('target has no actual original token boundary');
 guard();const parsed=parser.type();guard();if(parser.cursor.tokens[parser.cursor.index-1]?.end!==end)fail('complete original target type differs');
 const kind=syntax==='String'?'owned-standard-string':'shared-primitive-str';
 if(parsed.kind!=='string'||parsed.rustReference||parsed.rustGenericIdentityUnresolved||parsed.rustOwnership?.kind!==(syntax==='String'?'owned':'borrowed')||parsed.rustOwnership?.source!==(syntax==='String'?'String':'str'))fail('target lacks its original canonical standard type identity');
 const evidence=freeze({schema:'original-standard-implementation-target-v1',kind,source:module.file,sourceSha256:hash(module.source),sourceViewDigest:module.sourceView.digest,implementationSpan:implementation.span,headerSpan:implementation.headerSpan,headerSha256:hash(module.source.slice(header[0].start,header.at(-1).end)),targetSpan:{start,end},targetOriginal:module.source.slice(start,end),parsedType:parsed,scopeSha256:metadataDigest(scope),standardSource:syntax==='String'?originalStringIdentity():SHARED_REFERENCE_COPY_SOURCE,traitBodyExecuted:false,namespaceAuthority:false,copyAuthority:false,noDropAuthority:false,conditionalAvailabilitySelected:false});
 const result={...implementation,sourceImplementationTarget:evidence};issued.set(result,{evidence,fingerprint:fingerprint(result),modules,sourceScopes,module});return result;
}
export function originalStandardImplementationTarget(implementation){
 const state=issued.get(implementation);if(!state)return null;
 if(types.isProxy(implementation)||implementation.sourceImplementationTarget!==state.evidence||fingerprint(implementation)!==state.fingerprint)fail('implementation target evidence changed or was rebound');
 assertResolvedSourceScopeOrigin(state.sourceScopes,{modules:state.modules,compilationProfile:state.module.compilationProfile});return state.evidence;
}
