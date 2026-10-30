import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareBase64LocalAliasSources} from './prepare-base64-local-alias-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareBase64LocalValueSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/base64-local-values/complete-originals-and-rules.json.gz',pin:'67e219893ef70d2cf38eaefa48f282e4c7e2d9e674f4800186026fb59da661ad',id:'router:base64-local-values-complete-source-substitutions-v1',laterPlans:[prepareBase64LocalAliasSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareBase64LocalValueSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Base64 local values source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
