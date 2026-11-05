// Qualified standard ownership calls. Source, type names and saved profiles
// alone issue no executable permission; only actual parser/checker custody joins.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual,types} from 'node:util';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {copyMetadata,originalParsedDeclarationEvidence,originalParsedSyntaxNode} from './extensions/source-links.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
import {originalDataFreezeIntrinsicsUnchanged,originalFlatTokenIntrinsicsUnchanged,originalStaticSourceIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
const calls=new WeakMap(),operands=new WeakMap(),active=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const PROFILE='fc475f48ff1ad9d568cb75abb9ab744e041fc1a5d8b5d51026d5ac576ae1ca18';
const fail=(message,span)=>{throw unsupported('qualified standard String ToOwned',message,span);};
function host(){if(!originalDataFreezeIntrinsicsUnchanged()||!originalFlatTokenIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged())fail('original native ownership source host changed');}
function sourceInputs(){
 const root=new URL('./source-profiles/string-clone/',import.meta.url),manifestURL=new URL('manifest.json',root),bytes=readFileSync(manifestURL);if(hash(bytes)!==PROFILE)fail('complete standard ownership source profile differs');const profile=JSON.parse(bytes),inputs=[{url:manifestURL,bytes}];let retained=bytes.length;
 if(!Array.isArray(profile.sources)||profile.sources.length!==9)fail('complete original standard ownership source set required');
 for(const row of profile.sources){const url=new URL(row.archive,root);if(!url.pathname.startsWith(new URL('./source-profiles/',import.meta.url).pathname))fail('standard source archive escapes its owned profile');const packed=readFileSync(url);if(packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('complete standard source archive differs');const raw=gunzipSync(packed,{maxOutputLength:160000});if(raw.length!==row.bytes||hash(raw)!==row.sha256||!Buffer.from(raw.toString('utf8')).equals(raw))fail('complete original standard source bytes differ');retained+=packed.length+raw.length;if(retained>8388608)fail('standard ownership source input bound');inputs.push({url,bytes:packed});}
 return inputs;
}
export function parseOriginalQualifiedStringToOwned(parser,path){
 const c=parser.cursor,words=['::','std','::','borrow','::','ToOwned','::','to_owned','('];if(!words.every((word,at)=>c.is(word,at)))return null;
 host();const state=matchesParserFacts(parser),tokens=c.tokens,start=c.index,first=c.peek(),resolved=parser.resolveSourceNamespace(['std'],path,'type');if(resolved.join('::')!=='std')fail('the actual standard extern owner must remain unshadowed',first);
 c.index+=words.length;let prefix=0;while(c.is('(',prefix)){if(++prefix>64)fail('bounded shared ownership operand grouping required',first);}if(c.is('&&',prefix)||c.is('&',prefix)&&c.is('mut',prefix+1))fail('mutable and nested shared ownership operands remain separate',first);const written=parser.expr(path);if(c.eat(',')){if(!c.is(')'))fail('exactly one standard ownership operand required',first);}const last=c.expect(')','qualified String ToOwned'),borrow=written.k==='routerTextReference';
 const node={k:'routerQualifiedStringToOwned',object:borrow?written.value:written,borrow,span:{start:first.start,end:last.end}};
 if(matchesParserFacts(parser)!==state||parser.cursor!==c||c.tokens!==tokens||c.index<=start+words.length)fail('actual source parser changed during ownership call',node.span);
 const receipt={parser,syntax:copyMetadata(node)};calls.set(node,receipt);operands.set(node.object,receipt);return node;
}
function receipt(node){
 const exact=calls.get(node);if(exact)return exact;
 const previous=node?.block===true&&operands.get(node.object);return previous&&isDeepStrictEqual(copyMetadata(node),{...previous.syntax,block:true})?{...previous,syntax:{...previous.syntax,block:true}}:null;
}
export function withOriginalQualifiedStringToOwnedProgram(checker,surface,run){
 if(!originalDataFreezeIntrinsicsUnchanged()||!originalFlatTokenIntrinsicsUnchanged()||!originalStaticSourceIntrinsicsUnchanged())return run();
 const nodes=new WeakMap();let selected=0,entries=0;
 function declaration(entry){
  const found=[];let cells=0;function visit(node,depth=0){if(node===null||typeof node!=='object')return;if(++cells>200000||depth>160||types.isProxy(node))return;for(const key of Reflect.ownKeys(node)){if(typeof key!=='string'||key==='stack')return;const field=Object.getOwnPropertyDescriptor(node,key);if(!field||!Object.hasOwn(field,'value'))return;if(key==='k'&&field.value==='routerQualifiedStringToOwned')found.push(node);if(!['type','span','length'].includes(key))visit(field.value,depth+1);}}visit(entry);
  if(!found.length)return;if(!originalParsedDeclarationEvidence(entry))fail('actual original parsed declaration required',entry.span);requireOriginalPrimitiveTryFromChecker(checker);
  for(const node of found){const origin=originalParsedSyntaxNode(entry,node),original=origin&&receipt(origin.original);if(origin?.actual!==node||!original||original.parser!==origin.parser||!isDeepStrictEqual(origin.original,original.syntax)||!isDeepStrictEqual(node,origin.relocated))fail('qualified ownership call lacks its actual original parser/source association',node.span);nodes.set(node,{entry,parser:original.parser,original:origin.original,syntax:copyMetadata(node)});if(++selected>4096)fail('bounded actual ownership calls required',node.span);}
 }
 function items(rows,depth=0){if(!Array.isArray(rows)||types.isProxy(rows)||depth>160)return;const fields=Object.getOwnPropertyDescriptors(rows);for(let at=0;at<rows.length;at++){const field=fields[at];if(!field||!Object.hasOwn(field,'value'))continue;const entry=field.value;if(!entry||typeof entry!=='object'||types.isProxy(entry))continue;const kind=Object.getOwnPropertyDescriptor(entry,'k');if(!kind||!Object.hasOwn(kind,'value'))continue;if(++entries>200000)fail('original declaration bound');if(kind.value==='fn')declaration(entry);else if(kind.value==='module'){const child=Object.getOwnPropertyDescriptor(entry,'items');if(child&&Object.hasOwn(child,'value'))items(child.value,depth+1);}}}
 const root=surface&&typeof surface==='object'&&!types.isProxy(surface)?Object.getOwnPropertyDescriptor(surface,'items'):null;if(root&&Object.hasOwn(root,'value'))items(root.value);if(!selected)return run();if(active.has(checker))fail('nested ownership checker frame is unsupported');const inputs=sourceInputs();active.set(checker,{nodes});let primaryFailed=false;
 try{return run();}catch(error){primaryFailed=true;throw error;}finally{active.delete(checker);let changed=false;for(const input of inputs)try{if(!readFileSync(input.url).equals(input.bytes))changed=true;}catch{changed=true;}inputs.length=0;if(!primaryFailed&&changed)fail('actual standard source input changed during checking');}
}
export function checkOriginalQualifiedStringToOwned(checker,node,env,path,expected){
 host();const capture=active.get(checker)?.nodes.get(node);if(!capture)fail('actual original ownership call/frame required');requireOriginalPrimitiveTryFromChecker(checker);
 const current=()=>{host();const origin=originalParsedSyntaxNode(capture.entry,node);if(!originalParsedDeclarationEvidence(capture.entry)||origin?.actual!==node||origin.original!==capture.original||origin.parser!==capture.parser||!isDeepStrictEqual(node,capture.syntax)||!isDeepStrictEqual(node,origin.relocated))fail('actual qualified ownership source changed',node.span);requireOriginalPrimitiveTryFromChecker(checker);};current();
 const value=checker.expr(node.object,env,path),type=value.type,pointee=type.rustReference?.pointee;
 const owned=type=>type?.kind==='string'&&type.rustSourceType===true&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String'&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&(!type.patternOwnershipRefusal||['ownership-bearing String type','owned String source type','owned String formatting','owned String construction','owned String conversion','owned String replacement'].includes(type.patternOwnershipRefusal));
 const borrowed=type?.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&!type.rustReference&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&(type.rustSourceType===true||type.rustBorrowLifetime?.kind==='static'&&type.rustBorrowLifetime.source==='string-literal'||type.rustStandardSignature?.kind==='borrowed-str');
 if(node.borrow?!owned(type):!(borrowed||type.rustReference?.kind==='shared'&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&owned(pointee)))fail('only actual borrowed str or one shared standard owned String operand is drafted',node.span);
 const result={k:'toString',arg:value,type:{kind:'string',rustSourceType:true,rustOwnership:{kind:'owned',source:'String'}},constEligible:false,sourceOwnershipOperation:{profile:'checked-standard-string-ownership-v1',verified:true,operation:'to_owned',receiverType:copyMetadata(type),qualifiedPath:'::std::borrow::ToOwned::to_owned',span:{...node.span}},span:node.span};checker.expectedOwnership(result.type,expected,path,node.span);current();return result;
}
