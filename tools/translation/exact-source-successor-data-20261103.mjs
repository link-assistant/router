// Reusable exact source-history DATA algebra. Never type/body/source permission.
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const fail=message=>{throw TypeError('Exact source successor DATA: '+message);};
const fields=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===names.slice().sort().join(',');
function choose(input){
 if(!fields(input,['path','before','current','edges'])||typeof input.path!=='string'||!input.path||input.path.length>4096||typeof input.before!=='string'||input.current!==null&&typeof input.current!=='string'||!Array.isArray(input.edges)||input.edges.length>64)fail('bounded complete source/path/edge DATA required');
 const transitions=new Map(),ids=new Set(),known=new Set();let language=null;
 for(const edge of input.edges){
  if(!fields(edge,['id','language','before','after'])||typeof edge.id!=='string'||!edge.id||edge.id.length>256||ids.has(edge.id)||!['Rust','JavaScript','TypeScript'].includes(edge.language)||typeof edge.before!=='string'||typeof edge.after!=='string')fail('unique complete source edge required');
  ids.add(edge.id);if(language!==null&&language!==edge.language)fail('one source language per path required');language=edge.language;known.add(edge.before);known.add(edge.after);
  if(edge.before===edge.after)continue;
  let next=transitions.get(edge.before);if(!next){next=new Map();transitions.set(edge.before,next);}
  const equivalent=next.get(edge.after);if(equivalent)equivalent.ids.push(edge.id);else next.set(edge.after,{before:edge.before,after:edge.after,language:edge.language,ids:[edge.id]});
 }
 if(!known.has(input.before))return null;
 let value=input.before;const chain=[],seen=new Set([value]),states=[value];
 for(let depth=0;;depth++){
  const next=transitions.get(value);if(!next||next.size===0)break;
  if(depth>=64)fail('complete source-history depth bound');if(next.size!==1)fail('ambiguous complete source successors require explicit review');
  const edge=next.values().next().value;if(seen.has(edge.after))fail('cyclic complete source history refused');chain.push(edge);value=edge.after;states.push(value);seen.add(value);
 }
 return {path:input.path,before:input.before,current:input.current,after:value,currentAfter:value,inverse:input.before,language,chain,
  currentInSelectedChain:states.includes(input.current),currentIsTerminal:input.current===value,
  sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
}
/** Every invocation clones bounded own DATA; no graph/result cache survives. */
export function composeExactSourceSuccessorData(input){
 account(input);input=copyMetadata(input);
 const result=createRulePipeline([{phase:'language',rules:[{id:'language:compose-unique-exact-whole-source-chain',apply:choose}]},{phase:'repository',rules:[]}]).run(input);
 return result.value===null?null:{...result.value,selectionTrace:result.trace};
}
