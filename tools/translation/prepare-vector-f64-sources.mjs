import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareVectorTextSources} from './prepare-vector-text-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareVectorF64Sources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/vector-f64/complete-originals-and-rules.json.gz',pin:'23cbb3b90512b05222d960ea9066b844a5eedb039cd3cacabf5eef08bc31c2c1',id:'router:vector-f64-complete-source-substitutions-v1',laterPlans:[prepareVectorTextSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareVectorF64Sources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Vector f64 source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
