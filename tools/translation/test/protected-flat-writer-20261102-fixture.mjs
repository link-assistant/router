// Full copied receiving fixture SOURCE. No small compiler/history substitution.
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {exportFullAncillaryCompilerSourceVault} from '../full-ancillary-source-export-20261102.mjs';
import {readCompactSourceVaultDirectory} from '../compact-source-vault-store-20261102.mjs';
import {materializeOrderedTextMapFullCompilerSources,ORDERED_MAP_FULL_SOURCE_TRANSFER_LIMITS as L} from '../ordered-text-map-callers-20261102-full-materialization.mjs';
import {compactSparseGit,compactSparsePhysicalCensus} from '../compact-sparse-git-io-20261102.mjs';
const SOURCE=fileURLToPath(new URL('../../../',import.meta.url));
export function protectedFlatWriterFixture(t){
 const parent=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-protected-flat-full-')));
 t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
 const fixed=JSON.parse(fs.readFileSync(join(SOURCE,'tools/translation/source-profiles/forward-output-ownership-20261101/complete-source-equations.json'),'utf8'));
 const extras=[...new Set([...fixed.files,...fixed.preparerCaseSources,...fixed.cases].map(row=>row.path))];
 const bank=join(parent,'vault');exportFullAncillaryCompilerSourceVault({sourceRoot:SOURCE,output:bank,extraPaths:extras});
 const model=readCompactSourceVaultDirectory(bank);let materialized;
 try{materialized=materializeOrderedTextMapFullCompilerSources({model,output:join(parent,'compiler')});}
 finally{model.volumes.length=0;model.metadata.files.length=0;model.metadata.objects.length=0;}
 const root=materialized.root,capacity=(extra=0)=>{if(compactSparsePhysicalCensus(parent,{maximum:L.aggregateBytes}).total+extra>L.aggregateBytes)throw TypeError('Complete protected flat fixture exceeds384MiB source/Git/vault bound');};
 capacity();compactSparseGit(root,['init','--quiet','--template='],{maxBytes:1048576});
 const rows=materialized.currentClosure.slice().sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),index=[];
 for(let at=0;at<rows.length;at+=128){const batch=rows.slice(at,at+128);capacity(batch.reduce((sum,row)=>sum+row.bytes,0)+1048576);
  const ids=compactSparseGit(root,['hash-object','-w','--no-filters','--stdin-paths'],{input:batch.map(row=>row.path).join('\n')+'\n',maxBytes:1048576}).trim().split('\n');
  if(ids.length!==batch.length)throw TypeError('Complete fixture source index objects required');
  for(let n=0;n<batch.length;n++)index.push(batch[n].mode+' '+ids[n]+'\t'+batch[n].path+'\0');
 }
 compactSparseGit(root,['update-index','-z','--index-info'],{input:index.join(''),maxBytes:8388608});capacity();
 fs.mkdirSync(join(root,'js/node_modules'),{recursive:true});const require=createRequire(join(SOURCE,'js/package.json'));
 fs.symlinkSync(dirname(require.resolve('typescript/package.json')),join(root,'js/node_modules/typescript'),'dir');
 return root;
}
