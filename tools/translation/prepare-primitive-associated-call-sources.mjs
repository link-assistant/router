import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareCheckedOptionExpectSources} from './prepare-checked-option-expect-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePrimitiveAssociatedCallSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/primitive-associated-calls/complete-originals-and-rules.json.gz',pin:'1814756b34d78515d99862043fad3ba1b536e2864859e7256dcd07dbbf8905fb',id:'router:primitive-associated-calls-complete-source-substitutions-v1',laterPlans:[prepareCheckedOptionExpectSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=preparePrimitiveAssociatedCallSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Primitive associated call source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
