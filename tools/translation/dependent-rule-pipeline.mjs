// Extensible orchestration only. No parser, source, ownership or type authority.
import {types} from 'node:util';
import {createRulePipeline} from './rule-pipeline.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw TypeError('Dependent substitution rules: '+message);};
function own(value,key){if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary rule declaration required');const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('own rule data required');return field.value;}
/** All rules are selected explicitly. Dependencies never discover hidden code.
 * Descriptors: {id,phase,requires,conflicts,apply}. Phases stay language/repository.
 * Rule dependencies are topologically ordered, with declaration order as tie
 * break. Missing dependencies, cycles, selected conflicts and reverse phase
 * dependencies fail before any rule runs. The original pipeline enforces its
 * existing synchronous callback, DATA declaration and primary-error contracts.
 */
export function createDependentRulePipeline(input){
 if(!Array.isArray(input)||types.isProxy(input)||Object.getPrototypeOf(input)!==Array.prototype||input.length>1024||Reflect.ownKeys(input).length!==input.length+1)fail('bounded dense rule array required');const rules=[],byId=new Map();
 for(let at=0;at<input.length;at++){const field=Object.getOwnPropertyDescriptor(input,String(at));if(!field||!Object.hasOwn(field,'value'))fail('dense own rule sequence required');const row=field.value,keys=Reflect.ownKeys(ownContainer(row));if(keys.length!==5||keys.some(key=>!['id','phase','requires','conflicts','apply'].includes(key)))fail('exact rule descriptor fields required');const id=own(row,'id'),phase=own(row,'phase'),requires=copyMetadata(own(row,'requires')),conflicts=copyMetadata(own(row,'conflicts')),apply=own(row,'apply');account({id,phase,requires,conflicts});if(typeof id!=='string'||!id||id.length>160||byId.has(id)||!['language','repository'].includes(phase)||!Array.isArray(requires)||!Array.isArray(conflicts)||requires.length>1024||conflicts.length>1024)fail('unique bounded rule identity/phase/dependencies required');for(const list of [requires,conflicts])if(new Set(list).size!==list.length||list.some(key=>typeof key!=='string'||!key||key.length>160||key===id))fail('unique ordinary nonself rule references required');const rule={id,phase,requires,conflicts,apply,order:at};rules.push(rule);byId.set(id,rule);}
 const size=account(rules.map(({id,phase,requires,conflicts})=>({id,phase,requires,conflicts})));if(size.utf8Bytes>1048576)fail('complete rule graph metadata bound');
 for(const rule of rules){for(const id of rule.requires){const dependency=byId.get(id);if(!dependency)fail('missing required rule: '+id);if(rule.phase==='language'&&dependency.phase==='repository')fail('language cannot depend on a later repository rule');}for(const id of rule.conflicts){if(!byId.has(id))fail('unknown conflict rule: '+id);fail('explicitly selected rules conflict: '+rule.id+' / '+id);}}
 const ordered=[],counts=new Map(rules.map(row=>[row.id,row.requires.length])),dependents=new Map(rules.map(row=>[row.id,[]])),ready={language:[],repository:[]};
 for(const row of rules){for(const key of row.requires)dependents.get(key).push(row);if(!row.requires.length)ready[row.phase].push(row);}
 const enqueue=row=>{const queue=ready[row.phase],at=queue.findIndex(other=>other.order>row.order);queue.splice(at<0?queue.length:at,0,row);};
 // Each dependency edge is visited once. At most1024 ordered queue insertions
 // replace repeated whole pending/dependency scans on broad bulk plans.
 for(const phase of ['language','repository']){const total=rules.filter(row=>row.phase===phase).length;for(let at=0;at<total;at++){const row=ready[phase].shift();if(!row)fail('cyclic substitution rule dependencies');ordered.push(row);for(const next of dependents.get(row.id)){const count=counts.get(next.id)-1;counts.set(next.id,count);if(count===0)enqueue(next);}}}
 const pipeline=createRulePipeline(['language','repository'].map(phase=>({phase,rules:ordered.filter(row=>row.phase===phase).map(({id,apply})=>({id,apply}))}))),description=Object.freeze(ordered.map(({id,phase,requires,conflicts})=>Object.freeze({id,phase,requires:Object.freeze([...requires]),conflicts:Object.freeze([...conflicts])})));
 return Object.freeze({describe:()=>description,run:(value,context)=>pipeline.run(value,context)});
}
function ownContainer(value){if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary rule declaration required');return value;}
