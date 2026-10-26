import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareJsonReaderAliasSources} from './prepare-json-reader-alias-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonReaderDefaultSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-reader-defaults/complete-originals-and-rules.json.gz',pin:'47abf09bfc8b1ee2fba088fe72b604bc6a952170e9a78f37870e69c3532c05b1',id:'router:json-reader-defaults-complete-source-substitutions-v1',laterPlans:[prepareJsonReaderAliasSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonReaderDefaultSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('JSON reader defaults source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
