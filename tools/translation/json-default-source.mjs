// Select a complete original external Default method. This parser-free leaf
// does not construct its result or grant caller type/checker authority.
import {createHash} from 'node:crypto';
import {deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof,jsonMacroOriginalSource} from './json-macro-inputs.mjs';
import {proveJsonMacroFeatures} from './json-macro-features.mjs';
import {sourceItems} from './rust-structure.mjs';
import {itemConfiguration,compilationProfile} from './cfg-profile.mjs';
import {originalUseDeclarationLeaves} from './module-bindings.mjs';
const selections=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original JSON Default source: '+message);};
const significant=item=>item.tokens.filter(token=>token.type!=='comment');
export function originalJsonDefaultBody(dependencies){
  const inputs=deriveDependencyOriginalInputs(dependencies);
  const sourceProof=loadJsonMacroSourceProof(inputs),features=proveJsonMacroFeatures(sourceProof);
  const input=jsonMacroOriginalSource(sourceProof,'serde_json','src/value/mod.rs'),root=jsonMacroOriginalSource(sourceProof,'serde_json','src/lib.rs');
  const profile=compilationProfile({flags:{test:false},values:{feature:features.features},closedKeys:['feature']});
  const declarations=sourceItems(input.source).filter(item=>item.term==='enum'&&item.name==='Value'&&itemConfiguration(item.tokens,profile).status==='active');
  if(declarations.length!==1)fail('one active original Value declaration is required');
  const declaration=declarations[0],dt=significant(declaration),enumAt=dt.findIndex(token=>token.text==='enum');
  if(dt.slice(enumAt-1,enumAt+3).map(token=>token.text).join(' ')!=='pub enum Value {')fail('original public nongeneric declaration header differs');
  const rows=[];let row=[],depth=0;const raw=declaration.tokens,bodyOpen=raw.findIndex(token=>token.type!=='comment'&&token.text==='{'&&token.start>dt[enumAt].start);
  for(const token of raw.slice(bodyOpen+1,-1)){if(token.type!=='comment'&&token.text===','&&!depth){if(row.length)rows.push(row);row=[];continue;}row.push(token);if(token.type==='comment')continue;if(['(','[','{'].includes(token.text))depth++;if([')',']','}'].includes(token.text))depth--;if(depth<0||depth>32)fail('declaration member delimiters differ');}
  if(depth)fail('declaration member delimiters are incomplete');if(row.length)rows.push(row);
  // Keep documentation comments as real attribute obligations, too. A unit
  // syntax candidate is not constructor authority or an inert-attribute proof.
  const unitVariants=rows.flatMap(tokens=>{const significant=tokens.filter(token=>token.type!=='comment');return significant.length===1&&significant[0].type==='ident'?[{name:significant[0].text,span:{start:tokens[0].start,end:tokens.at(-1).end},nameSpan:{start:significant[0].start,end:significant[0].end},tokens,original:input.source.slice(tokens[0].start,tokens.at(-1).end),normalAttributesAbsent:true,documentationAttributes:tokens.filter(token=>token.type==='comment'&&/^\/\/[/!]|^\/\*[*!]/u.test(token.text)),attributeOwnersResolved:false,constructorAuthority:false}]:[];});
  const exports=sourceItems(root.source).filter(item=>item.term==='use').flatMap(item=>originalUseDeclarationLeaves(item).filter(leaf=>!leaf.glob&&!leaf.validateOnly&&leaf.segments.join('::')==='crate::value::Value'&&leaf.name==='Value').map(leaf=>({item,leaf})));
  if(exports.length!==1||!significant(exports[0].item).some(token=>token.text==='pub')||itemConfiguration(exports[0].item.tokens,profile).status!=='active')fail('actual active public Value reexport is absent or ambiguous');
  const owners=sourceItems(input.source).filter(item=>{
    if(item.term!=='impl')return false;const t=significant(item),at=t.findIndex(token=>token.text==='impl'),open=t.findIndex((token,index)=>index>at&&token.text==='{');
    return at>=0&&open>=0&&t.slice(at,open).map(token=>token.text).join(' ')==='impl Default for Value';
  });
  if(owners.length!==1||itemConfiguration(owners[0].tokens,profile).status!=='active')fail('one active owned Value Default implementation is required');
  const owner=owners[0],ot=significant(owner),open=ot.find(token=>token.text==='{'),close=ot.at(-1),offset=open.end;
  const members=sourceItems(input.source.slice(offset,close.start)).filter(item=>!item.comment);
  if(close.text!=='}'||members.length!==1||members[0].term!=='fn'||members[0].name!=='default')fail('complete original implementation member set differs');
  const member=members[0],mt=significant(member),at=mt.findIndex(token=>token.text==='fn'),body=mt.findIndex((token,index)=>index>at&&token.text==='{'),end=mt.at(-1);
  if(at!==0||body<0||end.text!=='}'||mt.slice(at,body).map(token=>token.text).join(' ')!=='fn default ( ) -> Value')fail('actual zero-parameter owned return signature differs');
  const definitionSpan={start:offset+mt[at].start,end:offset+end.end},bodySpan={start:offset+mt[body].start,end:offset+end.end};
  const method={name:member.name,ownerHeader:ot.slice(ot.findIndex(token=>token.text==='impl'),ot.indexOf(open)).map(token=>token.text).join(''),parameters:[],definitionSpan,bodySpan,signatureSource:input.source.slice(definitionSpan.start,bodySpan.start),bodySource:input.source.slice(bodySpan.start,bodySpan.end),definitionSource:input.source.slice(definitionSpan.start,definitionSpan.end)};
  const reference=(source,span)=>({source:source.path,sourceSha256:source.sha256,archiveSha256:source.archiveSha256,span,sha256:hash(source.source.slice(span.start,span.end))});
  const declarationRef=reference(input,{start:declaration.start,end:declaration.end}),exportRef=reference(root,{start:exports[0].item.start,end:exports[0].item.end}),implRef=reference(input,{start:owner.start,end:owner.end});
  const evidence={schema:'original-json-owned-default-source-v1',kind:'original-trait-method-candidate',owner:'serde_json::Value',writtenTrait:['Default'],trait:null,traitOwnerResolved:false,rustPath:input.path,sourceSha256:input.sha256,dependencyDigest:dependencies.digest,jsonDependencyDigest:sourceProof.digest,featureProof:features,declaration:{...declarationRef,name:declaration.name,unitVariants},publicExport:exportRef,implementation:implRef,sourceInputs:[input,root].map(source=>({package:source.package,version:source.version,archiveSha256:source.archiveSha256,sha256:source.sha256,path:source.path})),wholeTraitTranslated:false,namespaceAuthority:false,runtimeAuthority:false,allocatorInternalsCompiled:false};
  const value=freeze({method,evidence,digest:hash(JSON.stringify({method,evidence}))});
  selections.set(value,{dependencies,sourceProof,input,root,declaration,export:exports[0],owner,member,features});return value;
}
export function assertOriginalJsonDefaultBody(value,dependencies){const state=selections.get(value);if(!state||dependencies!==undefined&&state.dependencies!==dependencies)fail('selection is copied, foreign or unsealed');deriveDependencyOriginalInputs(state.dependencies);return value;}
export function originalJsonDefaultBodyEvidence(value){const state=selections.get(value);if(!state)fail('selection is copied or unsealed');return freeze({selection:value,source:state.input,root:state.root,declaration:state.declaration,publicExport:state.export,implementation:state.owner,member:state.member,features:state.features});}
