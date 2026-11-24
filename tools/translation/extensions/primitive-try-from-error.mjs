// Standard-library-only nominal discard boundary, analogous to the retained
// original Option Copy source rule. No caller record or arbitrary type can be
// substituted, and no general Copy certificate is issued by this leaf.
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {originalUseDeclarationLeaves} from '../module-bindings.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
import {primitiveTryFromOriginalSource,primitiveTryFromNamespace,PRIMITIVE_TRY_FROM_PROFILE} from './primitive-try-from-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),issued=new WeakSet();let selected;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const significant=tokens=>tokens.filter(token=>token.type!=='comment'),words=item=>significant(item.tokens).map(token=>token.text),same=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
const fail=message=>{throw new TypeError('Original standard numeric error Copy: '+message);};
function one(items,predicate,message){const values=items.filter(predicate);if(values.length!==1)fail(message);return values[0];}
function witness(input,item){return {path:input.path,sourceSha256:input.sha256,span:{start:item.start,end:item.end},original:input.source.slice(item.start,item.end)};}
function trait(path,name){
 const input=primitiveTryFromOriginalSource(path),item=one(sourceItems(input.source),item=>item.term==='trait'&&item.name===name,'original trait declaration is absent or ambiguous: '+name),tokens=words(item),at=tokens.indexOf('pub');
 if(tokens[at+1]!=='trait'||tokens[at+2]!==name||tokens.slice(0,at).some(word=>['cfg','cfg_attr'].includes(word)))fail('original trait is not an unconditional public declaration');return witness(input,item);
}
function moduleDeclaration(root,name){const item=one(sourceItems(root.source),item=>item.term==='mod'&&item.name===name,'original core module is absent or ambiguous');if(!words(item).slice(-4).join('').endsWith('pubmod'+name+';'))fail('original core module visibility differs');return witness(root,item);}
export function originalStandardNumericErrorCopy(){
 if(selected)return selected;
 const namespace=primitiveTryFromNamespace(),input=primitiveTryFromOriginalSource('library/core/src/num/error.rs'),items=sourceItems(input.source),core=primitiveTryFromOriginalSource('library/core/src/lib.rs'),marker=primitiveTryFromOriginalSource('library/core/src/marker.rs'),markerItems=sourceItems(marker.source),prelude=primitiveTryFromOriginalSource('library/core/src/prelude/v1.rs');
 const copy=one(markerItems,item=>item.term==='trait'&&item.name==='Copy','original Copy trait is absent or ambiguous'),copyText=marker.source.slice(copy.start,copy.end),registration=one(markerItems,item=>item.term==='macro'&&item.name==='Copy','original builtin Copy macro declaration is absent or ambiguous'),rt=words(registration),pub=rt.indexOf('pub');
 if(!copyText.includes('lang = "copy"')||!same(words(copy).slice(-7),['pub','trait','Copy',':','Clone','{','}']))fail('requires the actual compiler Copy lang-item trait');
 if(!rt.slice(0,pub).join('').includes('#[rustc_builtin_macro]')||!same(rt.slice(pub),['pub','macro','Copy','(','$item',':','item',')','{','}'])){
  // The structural lexer may retain or split the original dollar/name token;
  // the token-tree parser supplies Rust's exact generic metavariable boundary.
  const trees=originalMacroTrees(marker.source.slice(registration.start,registration.end)),at=trees.findIndex(tree=>tree.text==='pub'),params=trees[at+3],body=trees[at+4];
  if(!rt.slice(0,pub).join('').includes('#[rustc_builtin_macro]')||trees[at+1]?.text!=='macro'||trees[at+2]?.text!=='Copy'||params?.delimiter!=='('||!same(params.children.map(tree=>tree.text),['$','item',':','item'])||body?.delimiter!=='{'||body.children.length)fail('requires the actual registered builtin item derive macro');
 }
 const exportItem=one(sourceItems(prelude.source),item=>item.term==='use'&&originalUseDeclarationLeaves(item).some(leaf=>leaf.name==='Copy'&&same(leaf.segments,['crate','marker','Copy'])),'actual common prelude Copy export is absent or ambiguous');
 const registry=primitiveTryFromOriginalSource('compiler/rustc_builtin_macros/src/lib.rs'),text='Copy: bounds::expand_deriving_copy',at=registry.source.indexOf(text);
 if(at<0||registry.source.indexOf(text,at+1)>=0)fail('actual compiler derive callback registration differs');
 const callbackInput=primitiveTryFromOriginalSource('compiler/rustc_builtin_macros/src/deriving/bounds.rs'),callback=one(sourceItems(callbackInput.source),item=>item.term==='fn'&&item.name==='expand_deriving_copy','actual compiler Copy callback is absent or ambiguous'),callbackTrees=originalMacroTrees(callbackInput.source.slice(callback.start,callback.end));
 const layout=namespace.errorLayout;if(layout.fields.length!==1||layout.fields[0].type.kind!=='unit'||layout.fields[0].visibility!=='pub(crate)')fail('original standard error requires its one unit field');
 const imports=[];
 for(const item of items.filter(item=>item.term==='use'))for(const leaf of originalUseDeclarationLeaves(item)){
  if(leaf.glob||leaf.name==='Copy'||!same(leaf.segments,['crate',...(leaf.name==='fmt'?['fmt']:leaf.name==='Error'?['error','Error']:leaf.name==='Infallible'?['convert','Infallible']:[])]))fail('original numeric error imports have an unproved owner');imports.push({leaf,...witness(input,item)});
 }
 if(imports.length!==3)fail('complete numeric error import set differs');
 if(items.some(item=>!item.comment&&!['use','struct','enum','impl'].includes(item.term)))fail('original numeric error module has an unproved namespace producer');
 if(items.some(item=>item.name==='Copy'))fail('original standard Copy owner is shadowed');
 const identities={Display:trait('library/core/src/fmt/mod.rs','Display'),Error:trait('library/core/src/error.rs','Error'),From:trait('library/core/src/convert/mod.rs','From')},implementations=[];
 for(const item of items.filter(item=>item.term==='impl')){
  const tokens=significant(item.tokens),begin=tokens.findIndex(token=>token.text==='impl'),open=tokens.findIndex((token,index)=>index>begin&&token.text==='{'),header=tokens.slice(begin,open).map(token=>token.text),forAt=header.indexOf('for');
  if(begin<0||open<0||header.at(-1)==='>'||tokens.slice(0,begin).some(token=>['cfg','cfg_attr'].includes(token.text)))fail('written original implementation header or condition is unproved');
  const target=header.slice(forAt<0?1:forAt+1);if(target.length!==1||!['TryFromIntError','ParseIntError'].includes(target[0]))fail('written original implementation target is unproved');
  const traitHead=forAt<0?null:header.slice(1,forAt),owner=traitHead===null?null:traitHead[0]==='fmt'&&traitHead[1]==='::'&&traitHead[2]==='Display'&&traitHead.length===3?'Display':same(traitHead,['Error'])?'Error':traitHead[0]==='From'&&traitHead[1]==='<'&&traitHead.at(-1)==='>'?'From':null;
  if(forAt>=0&&!owner)fail('written original implementation is not a uniquely resolved non-Drop trait');
  const targetDeclaration=one(items,item=>['struct','enum'].includes(item.term)&&item.name===target[0],'written original implementation has no unique source nominal declaration');
  const offset=tokens[open].end,members=sourceItems(input.source.slice(offset,tokens.at(-1).start)).filter(member=>!member.comment),memberRows=[];
  for(const member of members){
   if(member.term!=='fn')fail('written error implementation has an unproved associated item');
   const mt=significant(member.tokens),fn=mt.findIndex(token=>token.text==='fn'),brace=mt.findIndex((token,index)=>index>fn&&token.text==='{');
   if(fn<0||brace<0||mt.slice(brace+1).some((token,index,list)=>token.text==='impl'||token.text==='macro_rules!'||token.text==='macro'||token.type==='ident'&&token.text.endsWith('!')||token.text==='!'&&list[index-1]?.type==='ident'&&['(','[','{'].includes(list[index+1]?.text)))fail('written member retains a nested impl or bang producer');
   if(mt.slice(0,fn).some(token=>['cfg','cfg_attr'].includes(token.text)))fail('written member has an unproved compilation condition');
   memberRows.push({name:member.name,span:{start:offset+member.start,end:offset+member.end},original:input.source.slice(offset+member.start,offset+member.end),methodExecutionAuthority:false});
  }
  implementations.push({...witness(input,item),header,target,targetDeclaration:witness(input,targetDeclaration),kind:forAt<0?'inherent':'trait',traitOwner:owner?identities[owner]:null,members:memberRows});
 }
 if(implementations.filter(row=>row.target[0]==='TryFromIntError').length!==4)fail('complete original numeric-error implementation census differs');
 const contract='any type implementing [`Drop`] can\'t be `Copy`',contractAt=marker.source.indexOf(contract);if(contractAt<0)fail('actual original compiler Copy/Drop exclusion contract is unavailable');
 const evidence={schema:'original-standard-unit-numeric-error-copy-v1',profileSha256:PRIMITIVE_TRY_FROM_PROFILE.manifestSha256,canonicalType:['core','num','TryFromIntError'],declaration:namespace.errorDeclaration,layout,coreModules:['num','marker','fmt','error','convert'].map(name=>moduleDeclaration(core,name)),corePrelude:namespace.originalCorePrelude,preludeCopyExport:witness(prelude,exportItem),copyTrait:witness(marker,copy),copyMacroRegistration:witness(marker,registration),compilerRegistration:{path:registry.path,sourceSha256:registry.sha256,span:{start:at,end:at+text.length},original:text},compilerCallback:{...witness(callbackInput,callback),trees:callbackTrees,completeOutputBuilderExecuted:false},standardSourceKernel:{kind:'canonical-standard-derived-copy-unit-boundary',generalDerivedCopyAuthority:false,globalWrittenImplAbsenceClaim:false,compilerBuilderExecuted:false},copyDropContract:{explanatoryDocumentationOnly:true,sourcePath:marker.path,sourceSha256:marker.sha256,span:{start:contractAt,end:contractAt+contract.length},original:contract},imports,writtenImplementations:implementations,discardBoundary:'standard source kernel only: privately registered canonical standard TryFromIntError with its actual unit payload; compiler Copy excludes a destructor',generalNominalCopyAuthority:false,errorMethodsExecuted:false,wholeCompilerExecuted:false,wholeCoreTranslated:false,runtimeParity:false};
 selected=freeze({...evidence,digest:hash(JSON.stringify(evidence))});issued.add(selected);return selected;
}
export function requireOriginalStandardNumericErrorCopy(proof){if(!issued.has(proof)||proof!==originalStandardNumericErrorCopy())fail('copied, foreign or unissued original standard error proof');return proof;}
