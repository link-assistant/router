import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareConstAsyncBlockSources} from './prepare-const-async-block-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonReaderSpanJoinSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-reader-span-joins/complete-originals-and-rules.json.gz',pin:'8a0a4b3abf3191e912323ed5f2858cef082d0a53b8e487e087e8f77d1a906653',id:'router:json-reader-span-joins-complete-source-substitutions-v1',laterPlans:[prepareConstAsyncBlockSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonReaderSpanJoinSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('JSON reader span joins source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
