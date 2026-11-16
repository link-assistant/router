// Complete source/CST proposal DATA. Never a caller or compiler permission.
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const PACKET=new URL('./source-profiles/ordered-map-canonical-cohort-20261102/complete-source.json.gz',import.meta.url);
// Filled from the complete authored source packet, not a runtime verdict.
const PIN='193b6d96b856abbcb5ad7438b8d50f36684c0dda50d4b3475dc1b455599b2354';
function packet(){const raw=fs.readFileSync(PACKET);if(raw.length>1048576||createHash('sha256').update(raw).digest('hex')!==PIN)throw TypeError('complete pinned canonical activation source packet required');return JSON.parse(gunzipSync(raw,{maxOutputLength:2097152}).toString('utf8'));}
export function proposeCanonicalMapCohortSourceCopies(input){
 account(input);const data=copyMetadata(input),original=packet(),row=original.rows[0];
 if(!data||Object.keys(data).sort().join(',')!=='path,source'||data.path!==row.path||data.source!==row.before)throw TypeError('complete original synchronization module required');
 const run=createRulePipeline([
  {phase:'language',rules:[]},
  {phase:'repository',rules:[countedLiteralSubstitutionRule('router:canonical-map-source-activation-and-original-producer-lifetimes',row.before,row.after,1,'complete original synchronization source differs')]},
 ]).run(data.source);
 const history=transportConcreteSourceEquations([{before:row.before,after:run.value,language:'JavaScript'}])[0];
 const files=original.authored.map(item=>({path:item.path,source:item.source,
  ...(item.path.endsWith('.mjs')?{history:transportConcreteSourceEquations([{before:'',after:item.source,language:'JavaScript'}])[0]}:{inverse:null,concrete:false})}));
 packet();const result={path:row.path,before:row.before,after:run.value,inverse:row.before,history,trace:run.trace,files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};account(result);return result;
}
