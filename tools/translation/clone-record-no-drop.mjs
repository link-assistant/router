// A separate, original-source no-Drop proof for Clone-only primitive records.
// This does not issue Copy, arbitrary nominal ownership, or trait execution.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {assertDefaultCaller} from './default-trait-source.mjs';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {assertCloneCaller,cloneSourceContextFacts} from './clone-trait-source.mjs';
import {inspectDeriveInput} from './derive-inputs.mjs';
import {deriveFootprintAt,deriveFootprintClapArgsSourceOutput} from './derive-footprints.mjs';
import {createDeriveBangContext,deriveBangOutputAt} from './derive-bang-context.mjs';
import {proveBuiltinScalarSourceOutput,assertBuiltinScalarSourceOutput} from './builtin-scalar-ast-route.mjs';
import {originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {nominalTypeIdentities,resolveNominalImplTarget} from './project-nominal.mjs';
import {originalClapQuoteText} from './derive-clap-value-enum.mjs';
import {originalNestedImplementationObligations} from './nested-implementation-obligations.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),proofs=new WeakMap();let drop;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text),fail=message=>{throw new TypeError('Clone-only no-Drop: '+message);};
function originalDrop(){
  if(drop)return drop;const packed=readFileSync(new URL('./source-profiles/source-clone/rust-1.89-drop.rs.gz',import.meta.url)),raw=gunzipSync(packed,{maxOutputLength:16000});
  if(hash(packed)!=='2b1a008cd7e87f680b7d7206688a28127a9958214c665478b140a953cef228c5'||raw.length!==9930||hash(raw)!=='a04e5438385053157665cbb0e2287a19e26e01f2eaf5ddc03d1b599eff7ba375')fail('original standard destructor source differs');
  const source=raw.toString('utf8'),traits=sourceItems(source).filter(item=>item.term==='trait'&&item.name==='Drop');if(traits.length!==1)fail('original destructor trait is absent or ambiguous');const trait=traits[0],t=trait.tokens.filter(token=>token.type!=='comment'),at=t.findIndex(token=>token.text==='trait'),open=t.findIndex((token,index)=>index>at&&token.text==='{');
  if(words(t.slice(at,open)).join(' ')!=='trait Drop'||!words(t.slice(0,at)).join(' ').includes('lang = "drop"'))fail('original destructor lang-item owner differs');
  const members=sourceItems(source.slice(t[open].end,t.at(-1).start)).filter(item=>!item.comment);if(members.length!==1||members[0].term!=='fn'||members[0].name!=='drop')fail('original destructor associated items differ');const mt=members[0].tokens.filter(token=>token.type!=='comment'),fn=mt.findIndex(token=>token.text==='fn');if(words(mt.slice(fn)).join(' ')!=='fn drop ( & mut self ) ;')fail('original mutable destructor signature differs');
  drop=freeze({source:'library/core/src/ops/drop.rs',sourceSha256:hash(raw),span:{start:trait.start,end:trait.end},original:source.slice(trait.start,trait.end),langItem:'drop',signature:'fn drop ( & mut self ) ;',bodyExecuted:false});return drop;
}
export function proveCloneOnlyRecordNoDrop(context,module,item,output){
  const {state,original}=assertCloneCaller(context,module),span={start:item.start,end:item.end},args={dependencies:state.dependencies,source:original.source,span,owner:'Clone'};assertBuiltinScalarSourceOutput(output,args);
  const actual=originalSourceModuleItems(original).find(entry=>entry.start===item.start&&entry.end===item.end&&entry.name===item.name);if(!actual)fail('original record differs');const input=inspectDeriveInput(actual,state.compilationProfile);
  if(input.derives.some(owner=>same(owner.path,['Copy'])))fail('Copy branch needs its existing independent private Copy certificate');
  const outputs=[];for(const invocation of input.derives){
    if(invocation.path.length===1&&['Clone','Debug','Default'].includes(invocation.path[0])){const proof=proveBuiltinScalarSourceOutput({...args,owner:invocation.path[0]});assertBuiltinScalarSourceOutput(proof,{...args,owner:invocation.path[0]});outputs.push({owner:invocation.path,sourceOutputDigest:proof.digest,kind:'source-sealed one trait implementation',trait:invocation.path[0]});continue;}
    if(same(invocation.path,['clap','Args'])){
      const certificate=deriveFootprintAt(state.deriveContext,original,actual);if(!certificate||certificate.dimensions.typeNamespaceComplete!==true||certificate.dimensions.attributeMacroComplete!==true)fail('original Args helper/output owner remains unresolved');
      const bang=deriveBangOutputAt(createDeriveBangContext({deriveContext:state.deriveContext}),state.deriveContext,original,actual);if(!bang||bang.dimensions.bangMacroComplete!==true)fail('original Args emitted expression macros retain an independent expansion/export obligation');
      const clap=deriveFootprintClapArgsSourceOutput(state.deriveContext,certificate);
      const headers=clap.outputs.map(branch=>{const emitted=originalClapQuoteText(branch.syntax),impls=sourceItems(emitted).filter(entry=>entry.term==='impl');if(impls.length!==2)fail('complete original Args implementation set differs');return impls.map(entry=>{const t=entry.tokens.filter(token=>token.type!=='comment'),at=t.findIndex(token=>token.text==='impl'),open=t.findIndex((token,index)=>index>at&&token.text==='{'),header=words(t.slice(at,open));if(!['impl clap :: FromArgMatches for '+item.name,'impl clap :: Args for '+item.name].includes(header.join(' ')))fail('original Args output contains another implementation target/trait');return header;});});
      outputs.push({owner:invocation.path,sourceOutputDigest:clap.digest,headers,certificateDigest:certificate.digest,bangOutputDigest:bang.digest,generatedImplBehavior:false});continue;
    }
    fail('independent sibling derive output remains unproved: '+invocation.path.join('::'));
  }
  // The complete source composition must not hide an item-exporting
  // attribute or unresolved type declaration in a sibling module. Written
  // user bang invocations can emit impl items even inside function blocks;
  // this first Clone-only route refuses them rather than assuming inertness.
  const scopes=state.binding.scopes;if(scopes.some(scope=>scope.configurationCondition!=='active'||scope.unresolvedTypeScope||scope.unresolvedAttributeMacroScope))fail('complete caller source type/attribute composition is unresolved');
  for(const owner of state.modules)if(originalNestedImplementationObligations(owner).length)fail('nested original implementation target or coherence remains unproved');
  for(const owner of state.modules)for(const token of rustTokens(owner.source))if(token.type!=='comment'&&token.text.endsWith('!')&&token.text!=='!')fail('written caller bang expansion remains unproved');
  const identities=nominalTypeIdentities(scopes,state.modules),family=['crate',...original.path,item.name],implementations=[];
  for(const owner of state.modules)for(const implementation of originalSourceModuleItems(owner).filter(entry=>entry.term==='impl')){
    const condition=itemConfiguration(implementation.tokens,state.compilationProfile);if(condition.status==='inactive')continue;if(condition.status!=='active')fail('original implementation condition is unresolved');
    const target=resolveNominalImplTarget({span:{start:implementation.start,end:implementation.end}}, {...owner,items:originalSourceModuleItems(owner)},scopes,identities);if(!target)fail('an original implementation target is unresolved');
    const t=implementation.tokens.filter(token=>token.type!=='comment'),at=t.findIndex(token=>token.text==='impl'),open=t.findIndex((token,index)=>index>at&&token.text==='{'),head=t.slice(at+1,open),forAt=head.findIndex(token=>token.text==='for');
    if(!same(target.family,family)){implementations.push({source:owner.file,span:{start:implementation.start,end:implementation.end},target,relation:'different actual nominal target'});continue;}
    if(t.slice(0,open).some(token=>['unsafe','cfg_attr'].includes(token.text)))fail('matching unsafe/conditional implementation remains unproved');
    if(forAt>=0){
      const trait=head.slice(0,forAt).map(token=>token.text).join(''),scope=scopes.find(scope=>moduleScopeKey(scope)===moduleScopeKey(owner)),binding=scope?.bindings.find(binding=>binding.namespace==='type'&&binding.name==='Default');
      assertDefaultCaller(state.defaultContext,owner);
      const standard=trait==='std::default::Default'||trait==='core::default::Default'||trait==='Default'&&(!binding||binding.status==='resolved'&&['std.default.Default','core.default.Default'].includes(binding.target.join('.')));
      if(!standard)fail('matching manual trait/destructor implementation remains unproved');
      implementations.push({source:owner.file,span:{start:implementation.start,end:implementation.end},target,relation:'actual original standard Default trait differs from destructor lang-item',standardTraitSource:state.standard.defaultIdentity});
    }else implementations.push({source:owner.file,span:{start:implementation.start,end:implementation.end},target,relation:'inherent implementation; no destructor trait header'});
  }
  const evidence={schema:'original-clone-only-record-no-drop-v1',contextDigest:context.digest,source:original.file,sourceSha256:hash(original.source),sourceViewDigest:original.sourceView.digest,span,itemSha256:hash(original.source.slice(item.start,item.end)),family,fieldTypes:output.input.fields.map(field=>({name:field.name,type:field.type,typeSpan:field.typeSpan})),destructor:originalDrop(),deriveOutputs:outputs,implementations,copyAuthority:false,bodyExecutionAuthority:false,wholeCrateRuntimeParity:false};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,module:original,item:actual,output,args});return proof;
}
export function requireCloneOnlyRecordNoDrop(proof,context,module,item){const state=proofs.get(proof);if(!state||state.context!==context||state.module.source!==module.source||state.module.sourceView!==module.sourceView||state.item.start!==item.start||state.item.end!==item.end)fail('proof is copied, changed or rebound');assertCloneCaller(context,module);assertBuiltinScalarSourceOutput(state.output,state.args);return proof;}
