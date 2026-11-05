// Complete actual Router source proposal; all receiving checks remain unrun.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {preparePinnedRustSourceRecipe} from './pinned-rust-source-recipe.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareProductionCoreBase64AdoptionSources({root=ROOT}={}){
 return preparePinnedRustSourceRecipe({root,archive:'tools/translation/source-profiles/production-core-base64-adoption/complete-originals-and-rules.json.gz',pin:'63f2b243f1f631f5b784fbdcfdcd4ea4c2e12759664e9e96cffa62ba3a43f83e',id:'router:production-core-base64-source-adoption-v1'});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))throw new TypeError('Use --emit|--check');const plan=prepareProductionCoreBase64AdoptionSources();if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.after))throw new TypeError('Production base64 source adoption differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,paths:plan.files.map(row=>row.path),receivingExecuted:false}));
}
