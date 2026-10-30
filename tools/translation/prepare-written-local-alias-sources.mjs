import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareForAliasScopeSources} from './prepare-for-alias-scope-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareWrittenLocalAliasSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/written-local-alias-source/complete-originals-and-rules.json.gz',pin:'fb7234eadec4761b9b1c28636562eaabfd3c70c8afd8f67f1dfa7848e867e21a',id:'router:written-local-alias-source-complete-source-substitutions-v1',laterPlans:[prepareForAliasScopeSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareWrittenLocalAliasSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Written local alias source source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
