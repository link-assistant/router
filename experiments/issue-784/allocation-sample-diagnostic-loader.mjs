// Actual canonical URLs retain private issuer identities. Diagnostic code only.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const variant=process.env.ROUTER_784_ALLOCATION_VARIANT??'original';
if(!['original','shared-project'].includes(variant))throw Error('Explicit diagnostic source variant required');
const name=variant==='original'?'allocation-sample':'shared-proof-arithmetic';
const schema=variant==='original'?'complete-allocation-sample-diagnostic-v1':'complete-shared-proof-arithmetic-diagnostic-v1';
const plan=JSON.parse(gunzipSync(readFileSync(new URL('ci-logs/issue-784-restart-2/'+name+'-diagnostic.json.gz',root)),{maxOutputLength:32*1024*1024}));
if(plan.schema!==schema||plan.diagnosticOnly!==true||plan.files.length!==3)throw Error('Complete diagnostic profile differs');
const selected=new Map(),hash=value=>createHash('sha256').update(value).digest('hex');
for(const [at,row]of plan.files.entries()){
 if(row.path!==['tools/translation/project.mjs','tools/translation/derive-bang-context.mjs','tools/translation/module-bindings.mjs'][at]||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||readFileSync(new URL(row.path,root),'utf8')!==row.before)throw Error('Complete canonical diagnostic source differs');
 selected.set(new URL(row.path,root).href,row.after);
}
export async function load(url,context,next){const result=await next(url,context);return selected.has(url)?{...result,source:selected.get(url)}:result;}
