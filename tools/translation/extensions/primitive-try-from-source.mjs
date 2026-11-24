// Complete original numeric macro selections. Callers still need independent
// source namespace, exact primitive, checker and whole-body admission.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {originalTopLevelMacroInvocations,originalMacroTreeText} from '../macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from '../declarative-token-macros.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {originalUseDeclarationLeaves} from '../module-bindings.mjs';
import {ORIGINAL_CORE_PRELUDE_ROOT} from './core-prelude-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text);
const same=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
const fail=message=>{throw new TypeError('Original primitive TryFrom source: '+message);};
const root=new URL('../source-profiles/primitive-try-from/',import.meta.url),manifestBytes=readFileSync(new URL('manifest.json',root));
if(hash(manifestBytes)!=='d69968bad587c3c42e6536d31356abab2ebee03f46d6e215a46bb6824edd4c51')fail('complete source profile differs');
const manifest=JSON.parse(manifestBytes),selected=new WeakMap(),definitions=new Map(),expansions=new Map(),selections=new Map();let sources,namespace,catalog;
export const PRIMITIVE_TRY_FROM_PROFILE=freeze({...manifest,manifestSha256:hash(manifestBytes),wholeTraitAuthority:false,constTraitCall:false,runtimeParity:false});
function originals(){
 if(sources)return sources;const result=new Map();
 for(const row of manifest.sources){
  const encoded=readFileSync(new URL(row.file,root)),raw=row.encoding==='complete-original-utf8'?encoded:gunzipSync(encoded,{maxOutputLength:200000});
  if(row.compressedBytes!==undefined&&(encoded.length!==row.compressedBytes||hash(encoded)!==row.compressedSha256)||raw.length!==row.bytes||hash(raw)!==row.sha256||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==row.gitBlobSha)fail('complete original input differs: '+row.path);
  result.set(row.path,freeze({...row,source:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)}));
 }
 sources=result;return result;
}
export function primitiveTryFromOriginalSource(path){const source=originals().get(path);if(!source)fail('source not retained');return source;}
function unique(items,predicate,message){const rows=items.filter(predicate);if(rows.length!==1)fail(message);return rows[0];}
export function primitiveTryFromNamespace(){
 if(namespace)return namespace;
 const files=originals(),convert=files.get('library/core/src/convert/mod.rs'),items=sourceItems(convert.source),trait=unique(items,item=>item.term==='trait'&&item.name==='TryFrom','original TryFrom trait is absent or ambiguous'),tokens=words(trait.tokens),at=tokens.indexOf('pub');
 if(!same(tokens.slice(at,at+9),['pub','trait','TryFrom','<','T','>',':','Sized','{'])||!tokens.join('').includes('typeError;')||!tokens.join('').includes('fntry_from(value:T)->Result<Self,Self::Error>;'))fail('original trait/Sized/Error/non-const signature differs');
 const numeric=files.get('library/core/src/convert/num.rs');
 const importItem=unique(sourceItems(numeric.source),item=>item.term==='use'&&words(item.tokens).join('')==='usecrate::num::TryFromIntError;','numeric error import differs');
 const number=files.get('library/core/src/num/mod.rs'),numberItems=sourceItems(number.source),errorModule=unique(numberItems,item=>item.term==='mod'&&item.name==='error'&&words(item.tokens).join('')==='moderror;','original numeric error module differs'),errorExport=unique(numberItems,item=>item.term==='use'&&words(item.tokens).slice(-6).join('')==='pubuseerror::TryFromIntError;','original numeric error reexport differs');
 const error=files.get('library/core/src/num/error.rs'),declaration=unique(sourceItems(error.source),item=>item.term==='struct'&&item.name==='TryFromIntError','original conversion error is absent or ambiguous'),dt=words(declaration.tokens),pub=dt.indexOf('pub');
 if(!same(dt.slice(pub),['pub','struct','TryFromIntError','(','pub','(','crate',')','(',')',')',';']))fail('original error tuple/unit/private-field layout differs');
 if(dt.slice(0,pub).join('')!=='#[stable(feature="try_from",since="1.34.0")]#[derive(Debug,Copy,Clone,PartialEq,Eq)]')fail('original error attributes require separate proof');
 const preludeRoutes=[];
 for(const family of ['core','std']){
  const input=files.get('library/'+family+'/src/prelude/mod.rs');
  for(const edition of ['2021','2024']){
   const module=unique(sourceItems(input.source),item=>item.term==='mod'&&item.name==='rust_'+edition,'original edition prelude module differs');
   const tokens=module.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{'),offset=tokens[open]?.end,members=offset===undefined?[]:sourceItems(input.source.slice(offset,tokens.at(-1).start)).filter(item=>!item.comment);
   if(!members.length||members.some(item=>item.term!=='use'||!words(item.tokens).includes('pub')||words(item.tokens).some(word=>['cfg','cfg_attr'].includes(word))))fail('original edition prelude has an unproved member producer or condition');
   const leaves=members.flatMap(item=>originalUseDeclarationLeaves(item).map(leaf=>({item,leaf}))),routes=leaves.filter(({leaf})=>family==='core'?!leaf.glob&&leaf.name==='TryFrom'&&same(leaf.segments,['crate','convert','TryFrom']):leaf.glob&&same(leaf.segments,['core','prelude','rust_'+edition]));
   if(routes.length!==1)fail('original TryFrom edition prelude export differs');
   const selected=routes[0],coreRoute=family==='std'?preludeRoutes.find(route=>route.family==='core'&&route.edition===edition):null;if(family==='std'&&!coreRoute)fail('standard prelude lacks its actual selected core edition route');
   preludeRoutes.push({family,edition,path:input.path,sourceSha256:input.sha256,span:{start:module.start,end:module.end},original:input.source.slice(module.start,module.end),selectedExport:{...selected.leaf,span:{start:offset+selected.item.start,end:offset+selected.item.end},original:input.source.slice(offset+selected.item.start,offset+selected.item.end)},coreRoute:coreRoute?{path:coreRoute.path,span:coreRoute.span,selectedExport:coreRoute.selectedExport}:null});
  }
 }
 const standard=files.get('library/std/src/lib.rs'),stdExports=sourceItems(standard.source).filter(item=>item.term==='use');
 const convertExport=unique(stdExports,item=>words(item.tokens).slice(-6).join('')==='pubusecore::convert;','original std convert reexport differs');
 const witness=(input,item)=>({path:input.path,sourceSha256:input.sha256,span:{start:item.start,end:item.end},original:input.source.slice(item.start,item.end)});
 return namespace=freeze({trait:['core','convert','TryFrom'],traitDeclaration:witness(convert,trait),numericErrorImport:witness(numeric,importItem),numericErrorModule:witness(number,errorModule),numericErrorExport:witness(number,errorExport),errorDeclaration:witness(error,declaration),errorLayout:{constructor:'TryFromIntError',fields:[{name:'field0',type:{kind:'unit'},visibility:'pub(crate)'}]},errorAttributes:{compilerStable:true,originalDerives:['Debug','Copy','Clone','PartialEq','Eq'],deriveExecutionAuthority:false},standardConvertExport:witness(standard,convertExport),originalCorePrelude:ORIGINAL_CORE_PRELUDE_ROOT,preludeRoutes,callerEditionInferred:false,wholeTraitAuthority:false,constTraitCall:false,runtimeParity:false});
}
const fixedName=name=>typeof name==='string'&&/^[iu](8|16|32|64|128)$/u.test(name);
const macroNames=['impl_try_from_lower_bounded','impl_try_from_upper_bounded','impl_try_from_both_bounded'];
export function originalFixedTryFromInvocations(){
 if(catalog)return catalog;
 const input=originals().get('library/core/src/convert/num.rs'),rows=[];
 for(const invocation of originalTopLevelMacroInvocations(input.source)){
  if(invocation.path.length!==1||!macroNames.includes(invocation.path[0]))continue;
  const terms=invocation.trees;if(terms[1]?.text!=='=>')fail('actual numeric invocation grammar differs');
  // Pointer-width-dependent siblings retain their source and are deliberately
  // outside this fixed-width lane. The actual whole invocation is not sliced.
  if(!fixedName(terms[0]?.text))continue;
  const targets=[];
  for(let index=2;index<terms.length;index++){if(index%2===0){if(!fixedName(terms[index]?.text))fail('fixed invocation target is unsupported');targets.push(terms[index].text);}else if(terms[index]?.text!==',')fail('actual target separator differs');}
  if(!targets.length||terms.length%2!==1||new Set(targets).size!==targets.length)fail('complete fixed invocation targets differ');
  rows.push(freeze({input:terms[0].text,targets,macroName:invocation.path[0],sourceSha256:input.sha256,originalSpan:invocation.sourceSpan,originalInvocation:input.source.slice(invocation.sourceSpan.start,invocation.sourceSpan.end),originalInvocationSha256:invocation.sourceSha256}));
 }
 return catalog=freeze(rows);
}
function primitive(type){const actual=rustFixedType(type?.rustPrimitiveName);if(!actual||!fixedName(type.rustPrimitiveName)||type.kind!=='fixed'||actual.bits!==type.bits||actual.signed!==type.signed||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)fail('requires actual by-value fixed integer identity');return {...actual,rustPrimitiveName:type.rustPrimitiveName};}
export function pinnedPrimitiveTryFrom(inputType,targetType){
 const input=primitive(inputType),target=primitive(targetType),key=input.rustPrimitiveName+'>'+target.rustPrimitiveName;
 if(selections.has(key))return selections.get(key);
 const calls=originalFixedTryFromInvocations().filter(call=>call.input===input.rustPrimitiveName&&call.targets.includes(target.rustPrimitiveName));if(calls.length!==1)fail('requires one actual bounded nonidentity original macro invocation');
 const source=originals().get('library/core/src/convert/num.rs'),call=calls[0];
 let expansion=expansions.get(call.originalInvocationSha256),definition=definitions.get(call.macroName);
 if(!definition){definition=compileDeclarativeMacro(source.source,{name:call.macroName,owner:['core','convert','num']});definitions.set(call.macroName,definition);}
 if(!expansion){const original=unique(originalTopLevelMacroInvocations(source.source),row=>row.sourceSha256===call.originalInvocationSha256&&row.sourceSpan.start===call.originalSpan.start,'original invocation lineage differs');expansion=expandDeclarativeMacro(definition,original.trees);expansions.set(call.originalInvocationSha256,expansion);}
 const expandedSource=expansion.trees.map(originalMacroTreeText).join(' '),owners=sourceItems(expandedSource).filter(item=>item.term==='impl');
 if(owners.length!==call.targets.length)fail('complete expansion does not preserve all original implementation outputs');
 const owner=unique(owners,item=>{const t=words(item.tokens),at=t.indexOf('impl');return same(t.slice(at,at+8),['impl','TryFrom','<',input.rustPrimitiveName,'>','for',target.rustPrimitiveName,'{']);},'actual expanded implementation is absent or ambiguous');
 const tokens=owner.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{'),offset=tokens[open].end,members=sourceItems(expandedSource.slice(offset,tokens.at(-1).start)).filter(item=>!item.comment),error=members.filter(item=>item.term==='type'&&item.name==='Error'),methods=members.filter(item=>item.term==='fn'&&item.name==='try_from');
 if(members.length!==2||error.length!==1||words(error[0].tokens).join('')!=='typeError=TryFromIntError;'||methods.length!==1)fail('actual associated Error/sole method closure differs');
 const member=methods[0],mt=member.tokens.filter(token=>token.type!=='comment'),fn=mt.findIndex(token=>token.text==='fn'),body=mt.findIndex((token,index)=>index>fn&&token.text==='{'),end=mt.at(-1);
 if(!same(mt.slice(fn,body).map(token=>token.text),['fn','try_from','(','u',':',input.rustPrimitiveName,')','->','Result','<','Self',',','Self','::','Error','>'])||end?.text!=='}')fail('expanded actual nonconst member signature differs');
 const value=freeze({schema:'original-macro-expanded-primitive-try-from-v1',profileSha256:hash(manifestBytes),revision:manifest.revision,input,target,namespace:primitiveTryFromNamespace(),invocation:call,definitionDigest:definition.digest,definitionSpan:definition.definitionSpan,expansionDigest:expansion.digest,expandedSourceSha256:hash(expandedSource),member:{source:expandedSource.slice(offset+mt[fn].start,offset+end.end),bodySource:expandedSource.slice(offset+mt[body].start,offset+end.end),coordinateKind:'complete authentic macro output projection; original definition and invocation coordinates are separate',projectionSpan:{start:offset+mt[fn].start,end:offset+end.end}},wholeMacroAuthority:false,wholeTraitAuthority:false,constTraitCall:false,runtimeParity:false});
 selected.set(value,{expansion,definition,source,owner,member,expandedSource});selections.set(key,value);return value;
}
export function requirePrimitiveTryFromSelection(selection){const state=selected.get(selection);if(!state)fail('copied, foreign or unselected original method');return selection;}
export function primitiveTryFromExpansion(selection){requirePrimitiveTryFromSelection(selection);return selected.get(selection).expansion;}
