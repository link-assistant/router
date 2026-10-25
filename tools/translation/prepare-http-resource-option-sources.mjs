import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareHttpResourceOptionSources({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/http-resource-options/complete-originals-and-rules.json.gz',pin:'532109fd47c39b9775025639554a66298e8a181633fffc9ed3848f2bbec3c06a',id:'router:http-resource-options-complete-source-substitutions-v1'});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareHttpResourceOptionSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('HTTP resource Option source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
