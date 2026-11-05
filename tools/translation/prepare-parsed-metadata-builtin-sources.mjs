import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareParsedNativeSourceOperationSources} from './prepare-parsed-native-source-operation-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareParsedMetadataBuiltinSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/parsed-metadata-builtins/complete-originals-and-rules.json.gz',pin:'4c6505bc81a6d6eff40815c68ec06dfc18186992c6b12ede03b0290319ba125a',id:'router:parsed-metadata-builtins-complete-source-substitutions-v1',laterPlans:[prepareParsedNativeSourceOperationSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareParsedMetadataBuiltinSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Parsed metadata builtins source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
