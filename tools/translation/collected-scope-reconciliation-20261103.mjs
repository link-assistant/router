// Complete observation/adoption bookkeeping DATA. No source, parser, namespace,
// type, owner, implementation, translation or executable capability is issued.
import {createHash} from 'node:crypto';
import {draftInventoryPath,DRAFT_REQUIREMENT_IDS} from './draft-inventory-reconciliation.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const requirementIds=new Set(DRAFT_REQUIREMENT_IDS);
const lanes=['forwardJavaScript','strictTypeScript','reverseRust','synchronization'];
const roles=new Set(['application','generated-application','test','example','benchmark','build','dependency-internal','unclassified']);
const fail=message=>{throw TypeError('Collected source reconciliation: '+message);};
function text(value){if(typeof value!=='string'||!value||value.length>4096)fail('bounded nonempty text required');return value;}
function array(value,max=100000){if(!Array.isArray(value)||value.length>max)fail('bounded complete array required');return value;}
function strings(value){const rows=array(value,10000);rows.forEach(text);if(new Set(rows).size!==rows.length)fail('unique complete text records required');return rows;}
function origin(value){
 if(!value||!/^[a-f0-9]{40}$/u.test(value.revision)||!/^[a-f0-9]{40}$/u.test(value.blob)||!['100644','100755','120000'].includes(value.mode)||!Number.isSafeInteger(value.bytes)||value.bytes<0)fail('complete immutable physical origin required');
 draftInventoryPath(value.path);return value;
}
const physical=value=>JSON.stringify([value.path,value.blob,value.mode,value.bytes]);
function span(value,bytes){if(!Array.isArray(value)||value.length!==2||value.some(n=>!Number.isSafeInteger(n))||value[0]<0||value[1]<=value[0]||value[1]>bytes)fail('complete original UTF8 byte span required');return value;}
function canonical(value){return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;}
/** Stable observation locator DATA, never an implementation/body permit. */
export function collectedScopeObservationId(observation){
 accountData(observation);origin(observation?.origin);text(observation.kind);array(observation.owner,1000);
 const location=observation.span;span([location?.byteStart,location?.byteEnd],observation.origin.bytes);
 const identity={physical:physical(observation.origin),kind:observation.kind,language:observation.language??'Rust',name:observation.name??null,owner:observation.owner,span:location,condition:observation.condition??null};
 return createHash('sha256').update(JSON.stringify(canonical(identity))).digest('hex');
}
function catalog(input){
 const result=new Map();let revision=null;
 for(const row of array(input)){
  origin(row);if(result.has(row.path)||revision!==null&&revision!==row.revision)fail('unique complete physical census at one revision required');
  result.set(row.path,row);revision=row.revision;
 }return result;
}
function assignment(value){
 if(!value||!/^[a-f0-9]{64}$/u.test(value.observation)||!roles.has(value.role)||!['OPEN','REVIEWED'].includes(value.reviewStatus))fail('explicit observation, role and source review required');
 strings(value.requirements);if(!value.requirements.length||value.requirements.some(id=>!requirementIds.has(id)))fail('known numbered requirements required');strings(value.unresolved);
 const evidence=new Map();for(const reference of array(value.evidence,10000)){origin(reference);if(evidence.has(reference.path))fail('duplicate evidence origin');evidence.set(reference.path,reference);}
 const needed=new Set();for(const binding of array(value.implementations,1000)){
  draftInventoryPath(binding.path);text(binding.symbol);const reference=evidence.get(binding.path);if(!reference)fail('complete original implementation evidence required');span(binding.span,reference.bytes);needed.add(binding.path);
 }
 if(!value.implementations.length)fail('actual implementation/adoption attempt required');
 for(const lane of lanes){
  const row=value.lanes?.[lane];if(!row||!['required','inapplicable'].includes(row.status))fail('all four receiving/synchronization lanes required');
  strings(row.paths);row.paths.forEach(path=>{draftInventoryPath(path);needed.add(path);});
  if(row.status==='inapplicable')text(row.reason);else if(!row.paths.length&&!value.unresolved.length)fail('missing required lane needs an explicit unresolved gap');
 }
 strings(value.independentCases).forEach(path=>{draftInventoryPath(path);needed.add(path);});
 if(!value.independentCases.length&&!value.unresolved.length)fail('missing independent cases need an explicit gap');
 for(const path of needed)if(!evidence.has(path))fail('all implementation, lane and case sources require retained physical origins');
 return {value,evidence};
}
/** Validate registry metadata before selecting extra physical evidence paths. */
export function collectedScopeEvidencePaths(assignments){
 accountData(assignments);const paths=new Set(),seen=new Set();
 for(const row of array(assignments)){const checked=assignment(row);if(seen.has(row.observation))fail('duplicate observation assignment');seen.add(row.observation);for(const path of checked.evidence.keys())paths.add(path);}
 return [...paths].sort();
}
/** Original native observations remain observations, including refusals and
 * overlapping declaration/function views. Never merge them by their names. */
export function reconcileCollectedScopeBatch({sources,observations,assignments=[]}){
 accountData({sources,observations,assignments});const current=catalog(sources),registry=new Map();
 for(const row of array(assignments)){const checked=assignment(row);if(registry.has(row.observation))fail('duplicate observation assignment');registry.set(row.observation,checked);}
 const seen=new Set(),rows=[];
 for(const observed of array(observations)){
  const id=collectedScopeObservationId(observed),actual=current.get(observed.origin.path);
  if(!actual||physical(actual)!==physical(observed.origin)||actual.revision!==observed.origin.revision)fail('observation must join the actual current complete physical census');
  if(seen.has(id))fail('duplicate complete native observation');seen.add(id);
  const selected=registry.get(id),stale=[];
  if(selected){
   const own=selected.evidence.get(observed.origin.path);if(!own||physical(own)!==physical(observed.origin))fail('assignment must retain its actual observed source origin');
   for(const [path,reference]of selected.evidence)if(!current.has(path)||physical(current.get(path))!==physical(reference))stale.push(path);
  }
  const unresolved=[...(observed.unresolved??[])];strings(unresolved);
  if(!selected)unresolved.push('native-observation-has-no-reviewed-numbered-implementation-adoption');
  else{
   unresolved.push(...selected.value.unresolved);
   if(selected.value.reviewStatus!=='REVIEWED'||selected.value.role==='unclassified')unresolved.push('actual-production-role-and-adoption-review-remains-open');
   if(stale.length)unresolved.push('actual-implementation-lane-case-or-producer-evidence-changed');
  }
  if(observed.producerExpansion==='unknown')unresolved.push('complete-original-producer-input-expansion-output-closure-unproved');
  rows.push({id,observation:observed,assigned:selected!==undefined,role:selected?.value.role??'unclassified',requirements:selected?.value.requirements??[],implementations:selected?.value.implementations??[],lanes:selected?.value.lanes??null,independentCases:selected?.value.independentCases??[],staleEvidence:stale.sort(),unresolved:[...new Set(unresolved)],sourceAuthority:false,semanticAuthority:false});
 }
 return {schema:'router-collected-scope-reconciliation-batch-20261103-v1',rows,observations:rows.length,assignedObservations:rows.filter(row=>row.assigned).length,unassignedObservations:rows.filter(row=>!row.assigned).length,staleObservations:rows.filter(row=>row.staleEvidence.length).length,unresolvedObservations:rows.filter(row=>row.unresolved.length).length,productionFunctionDenominator:null,translationCoverage:null,draftedRequirements:null,semanticAuthority:false,verification:'UNRUN'};
}
