import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTextRootSources({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/text-root-preparation/complete-originals-and-rules.json.gz',pin:'9b29a0ac86397de4afad73bb233cc94b2f651cc27437af67ddf854cf48b26732',id:'router:text-root-preparation-complete-source-substitutions-v1'});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTextRootSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Text native root source draft differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
