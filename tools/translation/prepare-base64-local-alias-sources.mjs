import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareIntegerLocalAliasSources} from './prepare-integer-local-alias-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareBase64LocalAliasSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/base64-local-aliases/complete-originals-and-rules.json.gz',pin:'660df2c0c554d3b696aab52815098031bd9b73d22d45d92c0e083d7d1be76a3d',id:'router:base64-local-aliases-complete-source-substitutions-v1',laterPlans:[prepareIntegerLocalAliasSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareBase64LocalAliasSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Base64 local aliases source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
