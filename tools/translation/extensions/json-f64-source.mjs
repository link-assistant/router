// Source identity for primitive slots in the existing registered JSON ABI.
// This does not compile serde methods or select a caller's Cargo features.
import {isDeepStrictEqual} from 'node:util';
import {pinnedJsonOriginalSource} from '../json-macro-inputs.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {originalImplMemberItems} from '../rust-member-boundaries.mjs';
import {SOURCE_F64} from './primitive-float-contracts.mjs';
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const text=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('');
const fail=message=>{throw new TypeError('Original JSON f64 slots: '+message);};
const inputs=['src/lib.rs','src/value/mod.rs','src/number.rs'].map(path=>pinnedJsonOriginalSource('serde_json',path));
const byPath=new Map(inputs.map(input=>[input.path,input]));
function one(rows,message){if(rows.length!==1)fail(message);return rows[0];}
function item(input,term,name){return one(sourceItems(input.source).filter(item=>item.term===term&&item.name===name),'original '+term+' '+name+' absent or ambiguous');}
function method(path,owner,name){
 const input=byPath.get(path),impl=one(sourceItems(input.source).filter(item=>{if(item.term!=='impl')return false;const tokens=item.tokens.filter(token=>token.type!=='comment'),start=tokens.findIndex(token=>token.text==='impl'),end=tokens.findIndex((token,index)=>index>start&&token.text==='{');return text(tokens.slice(start,end))==='impl'+owner;}),'original inherent owner absent or ambiguous');
 const implTokens=impl.tokens.filter(token=>token.type!=='comment'),body=implTokens.findIndex(token=>token.text==='{'),bodySpan={start:implTokens[body].end,end:implTokens.at(-1).start};
 const member=one(originalImplMemberItems(input.source,bodySpan).filter(item=>item.term==='fn'&&item.name===name),'original member absent or ambiguous'),tokens=member.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{'),start=tokens.findIndex(token=>token.text==='fn');
 if(open<0||start<0||tokens.at(-1)?.text!=='}')fail('original method lacks complete original delimiters');
 return {source:path,sourceSha256:input.sha256,owner,span:{start:member.start,end:member.end},signature:text(tokens.slice(start,open)),body:text(tokens.slice(open)),originalSource:input.source.slice(member.start,member.end)};
}
const root=byPath.get('src/lib.rs'),value=byPath.get('src/value/mod.rs'),number=byPath.get('src/number.rs');
const exports=[{source:root.path,statement:'#[doc(inline)]pubusecrate::value::{from_value,to_value,Map,Number,Value};'},{source:value.path,statement:'pubusecrate::number::Number;'}].map(route=>{
 const input=byPath.get(route.source),selected=one(sourceItems(input.source).filter(item=>item.term==='use'&&text(item.tokens)===route.statement),'original public export route absent or ambiguous');
 return {...route,span:{start:selected.start,end:selected.end},sourceSha256:input.sha256};
});
// The identifier f64 in each selected source belongs to the primitive slot;
// an alias/import/nominal declaration may not silently stand in for it.
for(const input of inputs)for(const declaration of sourceItems(input.source)){
 if(declaration.name==='f64'||declaration.term==='use'&&declaration.tokens.some(token=>token.type==='ident'&&token.text==='f64'))fail('original primitive f64 source namespace is shadowed');
}
const n=item(number,'enum','N'),numberItem=item(number,'struct','Number'),valueItem=item(value,'enum','Value'),nTokens=n.tokens.filter(token=>token.type!=='comment'),open=nTokens.findIndex(token=>token.text==='{'),nFields=text(nTokens.slice(open));
if(nFields!=='{PosInt(u64),NegInt(i64),Float(f64),}'||!text(nTokens.slice(0,open)).includes('#[cfg(not(feature="arbitrary_precision"))]'))fail('original default Number variants differ');
if(!text(numberItem.tokens).endsWith('pubstructNumber{n:N,}'))fail('original Number storage differs');
if(!text(valueItem.tokens).includes('Number(Number),'))fail('original Value Number field differs');
const alternateN=item(number,'type','N');if(!text(alternateN.tokens).includes('#[cfg(feature="arbitrary_precision")]')||!text(alternateN.tokens).endsWith('typeN=String;'))fail('original alternative Number branch is missing');
const valueAs=method(value.path,'Value','as_f64'),numberAs=method(number.path,'Number','as_f64'),from=method(number.path,'Number','from_f64');
if(valueAs.signature!=='fnas_f64(&self)->Option<f64>'||numberAs.signature!==valueAs.signature||from.signature!=='fnfrom_f64(f:f64)->Option<Number>')fail('actual primitive method signatures differ');
if(valueAs.body!=='{matchself{Value::Number(n)=>n.as_f64(),_=>None,}}')fail('original Value forwarding differs');
if(numberAs.body!=='{#[cfg(not(feature="arbitrary_precision"))]matchself.n{N::PosInt(n)=>Some(nasf64),N::NegInt(n)=>Some(nasf64),N::Float(n)=>Some(n),}#[cfg(feature="arbitrary_precision")]self.n.parse::<f64>().ok().filter(|float|float.is_finite())}')fail('original Number conversion branches differ');
if(from.body!=='{iff.is_finite(){letn={#[cfg(not(feature="arbitrary_precision"))]{N::Float(f)}#[cfg(feature="arbitrary_precision")]{zmij::Buffer::new().format_finite(f).to_owned()}};Some(Number{n})}else{None}}')fail('original Number construction branches differ');
const proof=freeze({schema:'original-registered-json-f64-slots-v1',package:'serde_json',version:'1.0.151',sourceInputs:inputs.map(({path,bytes,sha256,archiveSha256})=>({path,bytes,sha256,archiveSha256})),exports,numberLayout:{span:{start:n.start,end:n.end},originalSource:number.source.slice(n.start,n.end),storageSpan:{start:numberItem.start,end:numberItem.end}},alternateNumber:{span:{start:alternateN.start,end:alternateN.end},originalSource:number.source.slice(alternateN.start,alternateN.end)},methods:[valueAs,numberAs,from],primitiveType:SOURCE_F64,registeredLayoutBranch:'existing not(arbitrary_precision) JSON ABI only',callerFeatureSelection:false,generatedTraitAuthority:false,numberCopyAuthority:false,numberNoDropAuthority:false,newRuntimeImplementation:false,wholeDependencyTranslated:false});
export function originalJsonF64Source(){return proof;}
export function requireOriginalJsonF64Source(value){if(value!==proof||!isDeepStrictEqual(value.primitiveType,SOURCE_F64))fail('requires its private original selection');return proof;}
export function originalJsonF64Inputs(value){requireOriginalJsonF64Source(value);return Object.freeze([...inputs]);}
export function registeredJsonF64Type(){requireOriginalJsonF64Source(proof);return SOURCE_F64;}
