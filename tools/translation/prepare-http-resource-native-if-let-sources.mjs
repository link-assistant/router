import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareGenericOptionFoundationSources} from './prepare-generic-option-foundation-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareHttpResourceNativeIfLetSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/http-resource-native-if-let/complete-originals-and-rules.json.gz',pin:'56ba8c02e60dbb6980c3529c18eb890997010cae91d18b4f0ba984cc9fffdd9c',id:'router:http-resource-native-if-let-complete-source-substitutions-v1',laterPlans:[prepareGenericOptionFoundationSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareHttpResourceNativeIfLetSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('HTTP resource native if let source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
