import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareBooleanExpressionSources} from './prepare-boolean-expression-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareFixedPointPacketSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/fixed-point-packet-source/complete-originals-and-rules.json.gz',pin:'ff92fa815a8ce6ab6ec9a1a4478707ad528b374310e61f06e0577159b1528223',id:'router:fixed-point-packet-source-complete-source-substitutions-v1',laterPlans:[prepareBooleanExpressionSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareFixedPointPacketSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Fixed point packet source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
