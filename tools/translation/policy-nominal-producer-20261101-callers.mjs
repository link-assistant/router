// Candidate CALLERS only. Original types/attributes/impls/modules stay intact;
// fixed spellings below issue no source, namespace, Copy or runtime authority.
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {selectAggregateCopyFunction} from './aggregate-copy-collection-20261101-ir.mjs';
import {sameType} from './checked-types.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const fail=message=>{throw new TypeError('Actual policy nominal callers: '+message);};
export const POLICY_NOMINAL_CALLER_MODULE='__policy_nominal_producer_20261101';
const qualifier=POLICY_NOMINAL_CALLER_MODULE+'.';
const rows=Object.freeze([
 Object.freeze({name:'copied_overrides',kind:'record',owner:'client_policy.SubscriptionOverride',body:'pub fn copied_overrides(input:&[crate::client_policy::SubscriptionOverride])->Vec<crate::client_policy::SubscriptionOverride>{input.iter().copied().collect()}'}),
 Object.freeze({name:'override_clients',kind:'record',owner:'client_policy.SubscriptionOverride',body:'pub fn override_clients(input:&[crate::client_policy::SubscriptionOverride])->Vec<crate::clients::ClientKind>{input.iter().copied().map(|row|row.client).collect()}'}),
 Object.freeze({name:'override_providers',kind:'record',owner:'client_policy.SubscriptionOverride',body:'pub fn override_providers(input:&[crate::client_policy::SubscriptionOverride])->Vec<crate::subscription::SubscriptionProvider>{input.iter().copied().map(|row|row.provider).collect()}'}),
 Object.freeze({name:'copied_clients',kind:'unit',owner:'clients.ClientKind',body:'pub fn copied_clients(input:&[crate::clients::ClientKind])->Vec<crate::clients::ClientKind>{input.iter().copied().collect()}'}),
 Object.freeze({name:'copied_providers',kind:'unit',owner:'subscription.types.SubscriptionProvider',body:'pub fn copied_providers(input:&[crate::subscription::SubscriptionProvider])->Vec<crate::subscription::SubscriptionProvider>{input.iter().copied().collect()}'}),
]);
export function proposeActualPolicyNominalCallers(entry,source){
 accountData({entry,source});if(!['src/lib.rs','rust/src/lib.rs'].includes(entry)||typeof source!=='string')fail('actual complete library source required; binary/private owner extraction is not this domain');
 if(source.includes(POLICY_NOMINAL_CALLER_MODULE))fail('candidate namespace already occurs in original source');const addition='\n// Additive checked caller proposal; original owner declarations are unchanged.\npub mod '+POLICY_NOMINAL_CALLER_MODULE+' {\n'+rows.map(row=>row.body).join('\n')+'\n}\n',after=source+addition;
 const history=transportConcreteSourceEquations([{before:source,after,language:'Rust'}])[0];if(history.inverse!==source||transportConcreteSyntaxMeta(history.beforeMeta).source!==source||transportConcreteSyntaxMeta(history.afterMeta).source!==after)fail('complete original library/caller CST inverse differs');
 const result={schema:'actual-policy-nominal-callers-source-proposal-v1',path:entry,before:source,after,history,selections:rows.map(row=>({qualifiedName:qualifier+row.name,kind:row.kind,owner:row.owner})),originalDeclarationBytesUnchanged:true,originalBodyCoverageAdded:false,productionPolicyMethodsAdmitted:false,sourceAuthority:false,semanticAuthority:false};accountData(result);return result;
}
const owned=type=>type?.kind==='data'&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;
function unitPlan(source,target,nominal,owner){
 const entry=source?.declaration,param=entry?.params?.[0],type=param?.type,element=type?.element,ret=entry?.ret,body=entry?.body,iter=body?.object;
 if(source.schema!=='original-checked-executable-source-v1'||target?.schema!=='original-checked-project-target-binding-v1'||entry?.k!=='fn'||entry.fullName!==source.qualifiedName||target.qualifiedName!==entry.fullName||target.source!==source.source||entry.generated||entry.async||entry.constant||entry.constFunction||entry.params?.length!==1||type?.kind!=='array'||type.rustFixedArray||type.rustOwnership?.kind!=='borrowed'||type.rustOwnership.source!=='slice'||type.rustReference?.kind!=='shared'||type.rustReference.pointee?.kind!=='array'||!owned(element)||!sameType(type.rustReference.pointee.element,element)||ret?.kind!=='array'||ret.rustReference||ret.rustFixedArray||ret.rustOwnership?.kind!=='owned'||ret.rustOwnership.source!=='Vec'||!sameType(ret.element,element))fail('fresh complete actual unit slice/Vec source signature required');
 const candidates=nominal?.owners?.filter(row=>row.typePath?.slice(1).join('.')===owner);if(candidates?.length!==1||element.name!==owner||!candidates[0].variants?.length)fail('fresh genuine actual unit owner observations missing');
 if(body.k!=='routerIteratorOperation'||body.op!=='collect'||body.args?.length!==0||iter?.k!=='routerIteratorOperation'||iter.op!=='iter'||iter.args?.length!==0||iter.object?.k!=='var'||iter.object.name!==param.name||iter.sourceIteratorProof?.operation!=='iter'||iter.sourceIteratorProof.borrowed!==true||iter.sourceIteratorCopy?.operation!=='copied'||iter.sourceIteratorCopy.profile!=='rust-1.89-scalar-iterator-items'||!sameType(iter.type.element,element)||!sameType(iter.sourceIteratorCopy.itemType?.rustReference?.pointee,element))fail('ENTIRE selected actual unit body must be copied slice identity');
 return {schema:'actual-original-policy-unit-copy-call-v1',qualifiedName:entry.fullName,source:source.source,span:source.span,target:target.javascriptName,owner,variants:[...candidates[0].variants],kind:'unit-identity',exactOriginalRestorationOnly:true,sourceAuthority:false,semanticAuthority:false};
}
function fixedSelections(snapshots,nominal,aggregate,selections){
 accountData({snapshots,nominal,aggregate,selections});if(!Array.isArray(snapshots)||!Array.isArray(selections)||selections.length!==rows.length)fail('complete fixed actual caller census required');const names=new Set();for(const selection of selections){if(typeof selection?.qualifiedName!=='string'||names.has(selection.qualifiedName))fail('unique fixed actual caller census required');names.add(selection.qualifiedName);const expected=rows.find(row=>qualifier+row.name===selection.qualifiedName);if(!expected||selection.kind!==expected.kind||selection.owner!==expected.owner)fail('exact actual caller identity/kind/owner required');}if(rows.some(row=>!names.has(qualifier+row.name)))fail('every fixed actual caller identity is required');
}
function one(snapshots,nominal,aggregate,selection){
 const found=snapshots.filter(row=>row.source.qualifiedName===selection.qualifiedName);if(found.length!==1)fail('actual policy caller was refused or not uniquely checked: '+selection.qualifiedName);const {source,target}=found[0],plan=selection.kind==='record'?selectAggregateCopyFunction(source,target,aggregate):unitPlan(source,target,nominal,selection.owner);if(plan.owner!==selection.owner)fail('checked caller type is not the original actual policy owner');return plan;
}
export function selectActualPolicyNominalCallers(snapshots,nominal,aggregate,selections){fixedSelections(snapshots,nominal,aggregate,selections);return selections.map(selection=>one(snapshots,nominal,aggregate,selection));}
export function inspectActualPolicyNominalCallers(snapshots,nominal,aggregate,selections){
 fixedSelections(snapshots,nominal,aggregate,selections);return selections.map(selection=>{try{return {qualifiedName:selection.qualifiedName,kind:selection.kind,owner:selection.owner,selectedCallerAdmitted:true,plan:one(snapshots,nominal,aggregate,selection),sourceAuthority:false,semanticAuthority:false};}catch(error){if(!(error instanceof TypeError))throw error;return {qualifiedName:selection.qualifiedName,kind:selection.kind,owner:selection.owner,selectedCallerAdmitted:false,reason:error.message,sourceAuthority:false,semanticAuthority:false};}});
}
