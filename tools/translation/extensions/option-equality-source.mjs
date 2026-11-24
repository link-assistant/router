// Original source routes for one standard trait specialization. This does not
// execute all core traits or close a caller's unknown namespace/macro effects.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {originalUseDeclarationLeaves} from '../module-bindings.mjs';
import {PRIMITIVE_NAMESPACE_SOURCE_PROFILE} from './primitive-namespace-sources.mjs';
import {primitiveTryFromOriginalSource} from './primitive-try-from-source.mjs';
import {ORIGINAL_CORE_PRELUDE_ROOT,originalCorePreludeRootSource} from './core-prelude-source.mjs';
import {pinnedOptionPartialEqBody} from './standard-body-source.mjs';
import {SHARED_REFERENCE_COPY_SOURCE} from '../current-standard-copy-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('');
const fail=message=>{throw new TypeError('Original Option PartialEq source: '+message);};
const one=(items,test,message)=>{const rows=items.filter(test);if(rows.length!==1)fail(message);return rows[0];};
const witness=(input,item)=>({path:input.path,sourceSha256:input.sha256,span:{start:item.start,end:item.end},original:input.source.slice(item.start,item.end)});
function contents(input,item){const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{'),last=tokens.at(-1);if(open<0||last?.text!=='}')fail('complete original item delimiters required');const offset=tokens[open].end;return {offset,items:sourceItems(input.source.slice(offset,last.start))};}
function header(item){const tokens=item.tokens.filter(token=>token.type!=='comment'),at=tokens.findIndex(token=>token.text==='impl'),open=tokens.findIndex((token,index)=>index>at&&token.text==='{');return words(tokens.slice(at,open));}
function decoded(pin,root){const compressed=readFileSync(new URL(pin.archive,root)),raw=gunzipSync(compressed,{maxOutputLength:200000});if(compressed.length!==pin.archiveBytes||hash(compressed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||pin.gitBlobSha&&createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==pin.gitBlobSha)fail('complete original archive changed');return freeze({...pin,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)});}
let cached,originalInputs;
export function originalOptionPartialEqSource(selection){
 if(selection!==pinnedOptionPartialEqBody())fail('actual private method selection required');if(cached)return cached;
 const pin=one(PRIMITIVE_NAMESPACE_SOURCE_PROFILE.coreSources,row=>row.path==='library/core/src/cmp.rs','complete cmp source unavailable'),cmp=decoded(pin,new URL('../source-profiles/primitive-from-namespace/',import.meta.url));
 const trait=one(sourceItems(cmp.source),item=>item.term==='trait'&&item.name==='PartialEq','actual lang trait absent or ambiguous'),traitWords=words(trait.tokens);
 if(!traitWords.includes('#[lang="eq"]')||!traitWords.includes('pubtraitPartialEq<Rhs:PointeeSized=Self>:PointeeSized{')||!traitWords.includes('fneq(&self,other:&Rhs)->bool;'))fail('actual equality lang-item/signature changed');
 const prelude=primitiveTryFromOriginalSource('library/core/src/prelude/mod.rs'),edition=one(sourceItems(prelude.source),item=>item.term==='mod'&&item.name==='rust_2024','actual core edition prelude absent'),members=contents(prelude,edition);
 if(members.items.some(item=>item.term!=='use'||words(item.tokens).includes('#[cfg')))fail('edition export has an unproved producer or condition');
 const routes=members.items.flatMap(item=>originalUseDeclarationLeaves(item).map(leaf=>({item,leaf}))),route=one(routes,row=>row.leaf.glob&&row.leaf.segments.join('::')==='super::v1','actual edition-to-v1 route absent');
 if(routes.some(row=>!row.leaf.glob&&row.leaf.name==='PartialEq'))fail('edition prelude has another equality binding');
 const v1=primitiveTryFromOriginalSource('library/core/src/prelude/v1.rs'),v1Items=sourceItems(v1.source),leaves=v1Items.filter(item=>item.term==='use').flatMap(item=>originalUseDeclarationLeaves(item).map(leaf=>({item,leaf}))),binding=one(leaves,row=>!row.leaf.glob&&row.leaf.name==='PartialEq','actual PartialEq prelude binding absent');
 if(binding.leaf.segments.join('::')!=='crate::cmp::PartialEq')fail('actual prelude resolves a different trait');
 const impls=one(sourceItems(cmp.source),item=>item.term==='mod'&&item.name==='impls','reference implementation module absent'),inside=contents(cmp,impls),reference=one(inside.items,item=>item.term==='impl'&&header(item)==='impl<A:PointeeSized,B:PointeeSized>PartialEq<&B>for&AwhereA:PartialEq<B>,','actual shared-reference trait implementation absent');
 const referenceSpan={start:inside.offset+reference.start,end:inside.offset+reference.end},referenceSource=cmp.source.slice(referenceSpan.start,referenceSpan.end);
 if(!words(rustTokens(referenceSource)).includes('fneq(&self,other:&&B)->bool{PartialEq::eq(*self,*other)}'))fail('shared-reference equality forwarding changed');
 const strPin={path:'library/core/src/str/traits.rs',archive:'rust-str-traits-1.89.0.rs.gz',archiveBytes:4721,archiveSha256:'662360e0d06803201230d9c00abc7e6ab2c378305bdb108a295843802cab3ad6',bytes:31972,sha256:'8373e9a829477d832cde6818f9e5a3c5887d22918a15d3144c933b93681fe6db'},str=decoded(strPin,new URL('../source-profiles/slice-membership/',import.meta.url)),string=one(sourceItems(str.source),item=>item.term==='impl'&&header(item)==='implPartialEqforstr','actual str equality owner absent');
 const stringWords=words(string.tokens);if(!stringWords.includes('fneq(&self,other:&str)->bool{self.as_bytes()==other.as_bytes()}'))fail('actual str equality body changed');
 originalInputs=freeze([cmp,prelude,v1,str,originalCorePreludeRootSource()]);
 cached=freeze({languageRule:'rust.option.borrowed-str.partial-eq.original-body.v1',profile:'original-core-option-borrowed-str-partial-eq-v1',method:selection,trait:witness(cmp,trait),corePrelude:ORIGINAL_CORE_PRELUDE_ROOT,edition:witness(prelude,edition),editionRoute:{...route.leaf,original:prelude.source.slice(members.offset+route.item.start,members.offset+route.item.end)},traitExport:witness(v1,binding.item),referenceImplementation:{path:cmp.path,sourceSha256:cmp.sha256,span:referenceSpan,original:referenceSource},stringImplementation:witness(str,string),sharedReferenceCopy:SHARED_REFERENCE_COPY_SOURCE,payloadOperator:'existing checked standard str/str equality contract on valid Unicode scalars',namespaceComplete:false,traitComplete:false,wholeCoreTranslated:false,globalMacroEffectsClosed:false});
 return cached;
}

// Complete immutable originals are evidence only, separate from repeated IR.
export function originalOptionPartialEqInputs(selection){originalOptionPartialEqSource(selection);return originalInputs;}
