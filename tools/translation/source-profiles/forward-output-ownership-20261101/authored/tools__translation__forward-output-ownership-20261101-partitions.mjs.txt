// Closed physical output coordinates, DATA only. A partition never admits
// source or ownership: actual private producers and exact prior bytes do that.
export const FORWARD_OWNERSHIP_PRODUCERS=Object.freeze(['bulk.mjs','retained-bulk.mjs','owned-definitions-bulk.mjs','retained-owned-definitions-bulk.mjs','owned-field-bulk.mjs','retained-owned-field-bulk.mjs','native-retained-owned-field-bulk.mjs','flat-native-retained-owned-field-bulk.mjs']);
export const FORWARD_SHARED_OUTPUT_ROOTS=Object.freeze(['tools/translation/meta','js/generated/rust-draft','ts/generated/rust-draft','tools/translation/projects','js/generated/rust-project','ts/generated/rust-project']);
export const FORWARD_OWNED_OUTPUT_ROOTS=Object.freeze(['tools/translation/generated/owned-definitions','js/generated/rust-owned-definitions','ts/generated/rust-owned-definitions']);
export const FORWARD_OWNERSHIP_BASE='.router-forward-output-ownership';
const need=(yes,message)=>{if(!yes)throw new TypeError('Forward physical partitions: '+message);};
function prefix(value){need(value===''||typeof value==='string'&&value.length<=150&&/^profiles\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*-[a-f0-9]{64}$/u.test(value),'exact original profile output prefix required');return value;}
function extra(value){need(typeof value==='string'&&/^profiles\/(?:owned-definitions-)?matrix-[a-f0-9]{64}\.json$/u.test(value),'actual closed matrix index path required');return value;}
export function describeForwardOutputPartitions({producer,prefixes=[''],extraPaths=[]}){
 need(FORWARD_OWNERSHIP_PRODUCERS.includes(producer),'unknown producer refused before receipt/output planning');
 need(Array.isArray(prefixes)&&prefixes.length>=1&&prefixes.length<=16&&new Set(prefixes).size===prefixes.length,'complete distinct actual profile coordinates required');prefixes=prefixes.map(prefix);
 need(prefixes.length===1||prefixes.every(Boolean),'canonical and matrix coordinates cannot be mixed');
 need(Array.isArray(extraPaths)&&extraPaths.length<=2&&new Set(extraPaths).size===extraPaths.length,'distinct actual matrix indexes required');extraPaths=extraPaths.map(extra);
 need(extraPaths.length===0||prefixes.every(Boolean),'matrix index requires actual matrix profile coordinates');
 const owned=producer==='owned-definitions-bulk.mjs'||producer==='retained-owned-definitions-bulk.mjs',parts=[];
 for(const outputPrefix of prefixes){
  const lead=outputPrefix?outputPrefix+'/':'',coordinate=outputPrefix||'canonical';
  for(const kind of owned?['base','owned']:['base']){
   const roots=(kind==='base'?FORWARD_SHARED_OUTPUT_ROOTS:FORWARD_OWNED_OUTPUT_ROOTS).map(root=>lead+root);
   // The common six roots use exactly the SAME home for ordinary and owned
   // producers and every overlapping matrix selection. No selection hash bank.
   const home=FORWARD_OWNERSHIP_BASE+'/parts/'+coordinate+'/'+kind;
   parts.push(Object.freeze({id:coordinate+'/'+kind,kind,prefix:outputPrefix,home,roots:Object.freeze(roots),inventory:kind==='base'?lead+'parity/rust-source-inventory.json':null,index:null}));
  }
 }
 for(const index of extraPaths){
  const coordinate=index.slice('profiles/'.length,-'.json'.length),home=FORWARD_OWNERSHIP_BASE+'/indexes/'+coordinate;
  parts.push(Object.freeze({id:'index/'+coordinate,kind:'index',prefix:null,home,roots:Object.freeze([]),inventory:null,index}));
 }
 const frozen=Object.freeze(parts);
 const locate=name=>{need(typeof name==='string','actual output name required');let found=null;for(const part of frozen)if(name===part.inventory||name===part.index||part.roots.some(root=>name.startsWith(root+'/'))){need(found===null,'overlapping physical output partition refused');found=part;}need(found,'output outside actual closed producer partitions: '+name);return found;};
 return Object.freeze({producer,parts:frozen,locate});
}
