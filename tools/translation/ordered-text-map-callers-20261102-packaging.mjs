// Fresh physical source packaging only. Assets and import rows issue no type,
// owner, source-call or executable-body authority.
import {readFileSync,lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {emitOrderedTextMapDeclarations} from './ordered-text-map-20261102-contracts.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const paths=['ordered-text-map-20261102-runtime.mjs','ordered-text-map-20261102-runtime.d.mts'];
function read(name){const path=fileURLToPath(new URL('./'+name,import.meta.url)),stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)throw TypeError('Actual bounded regular ordered map asset source required');return readFileSync(path,'utf8');}
export function orderedTextMapCallerRuntimeAssets(){
 const sources=paths.map(read);
 return withCompleteSourceClosingFence(()=>{
  if(sources[1]!==emitOrderedTextMapDeclarations())throw TypeError('Complete ordered map declarations differ from the descriptor emitter');
  return new Map(paths.map((name,index)=>['runtime/'+name,sources[index]]));
 },paths.map((name,index)=>()=>{if(read(name)!==sources[index])throw TypeError('Ordered map runtime source changed during packaging');}));
}
