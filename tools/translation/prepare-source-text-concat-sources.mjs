import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareContextualTextIntoSources} from './prepare-contextual-text-into-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareSourceTextConcatSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/source-text-concat/complete-originals-and-rules.json.gz',pin:'ed2a96a99f49c5ae936afdc6e70ed3a76d9d4fe38530aeaeb8c560d8c37d9368',id:'router:source-text-concat-complete-source-substitutions-v1',laterPlans:[prepareContextualTextIntoSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareSourceTextConcatSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Source text concat source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
