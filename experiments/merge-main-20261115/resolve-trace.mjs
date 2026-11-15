// Usage: node --import ./experiments/merge-main-20261115/resolve-trace.mjs entry.mjs
// Logs (stderr) resolutions whose specifier matches RESOLVE_TRACE regex.
import {register} from 'node:module';
register('data:text/javascript,'+encodeURIComponent(`import * as require_fs from 'node:fs';const re=new RegExp(process.env.RESOLVE_TRACE||'.');export async function resolve(s,c,n){const r=await n(s,c);if(re.test(r.url))require_fs.appendFileSync('/tmp/resolve-trace.log','RESOLVE '+r.url.split('/translation/').pop()+' <- '+(c.parentURL||'').split('/translation/').pop()+'\\n');return r;}`));
