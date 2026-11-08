// Install only complete helper/DATA outputs, after retaining their old sources.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareCoreAsciiAssets} from '../../tools/translation/prepare-current-core-ascii-assets.mjs';
import {prepareCoreAsciiBaseAssets} from '../../tools/translation/prepare-current-core-ascii-base-assets.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const plans=[prepareCoreAsciiAssets(),prepareCoreAsciiBaseAssets()],files=[];
for(const plan of plans)for(const row of plan.files){
 const historical=plan.historical.files.find(other=>other.path===row.path);
 if(!historical)throw TypeError('Complete historical asset output required');
 if(row.path==='tools/translation/js-to-rust/owned-core-source.mjs'){
  if(row.after!==historical.after)throw TypeError('Unrelated complete source output changed');
  continue;
 }
 const current=readFileSync(resolve(root,row.path),'utf8');
 if(current!==historical.after&&current!==row.after)throw TypeError('Unknown complete physical asset source: '+row.path);
 files.push({path:row.path,before:current,after:row.after});
}
if(files.length!==4||new Set(files.map(row=>row.path)).size!==4)throw TypeError('Four complete helper/DATA outputs required');
for(const row of files)if(readFileSync(resolve(root,row.path),'utf8')!==row.before)throw TypeError('Complete asset source changed before installation');
for(const row of files)writeFileSync(resolve(root,row.path),row.after);
console.log(JSON.stringify({files:files.map(row=>({path:row.path,sha256:createHash('sha256').update(row.after).digest('hex')})),semanticAuthority:false}));
