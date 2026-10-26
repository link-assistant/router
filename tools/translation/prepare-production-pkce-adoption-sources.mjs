// Complete source construction only. Original semantic and runtime gates remain.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {preparePinnedRustSourceRecipe} from './pinned-rust-source-recipe.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareProductionPkceAdoptionSources({root=ROOT}={}){
 return preparePinnedRustSourceRecipe({root,archive:'tools/translation/source-profiles/production-pkce-adoption/complete-production-originals-and-rules.json.gz',pin:'8701b0237b96db8704734d8ede7e0bcad4407e541c33d491a94de226085f40be',id:'router:production-pkce-source-adoption-v1',targetPrefix:'crate::translation_text_core::'});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))throw new TypeError('Use --emit|--check');const plan=prepareProductionPkceAdoptionSources();if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Production PKCE source adoption differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,paths:plan.files.map(row=>row.path),receivingExecuted:false}));
}
