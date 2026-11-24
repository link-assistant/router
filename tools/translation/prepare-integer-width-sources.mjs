import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareIntegerWidthNativeSource} from './integer-width-native-source.mjs';
import {prepareNativeIntegerLiteralSources} from './prepare-native-integer-literal-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareIntegerWidthSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/integer-width-source/complete-originals-and-rules.json.gz',pin:'dc20fdaf2b208ac29da81ceb97bcc34fa96c67072f8ff0ffa0ee9276a60c7a33',id:'router:integer-width-source-complete-source-substitutions-v1',laterPlans:[prepareIntegerWidthNativeSource({root}),prepareNativeIntegerLiteralSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareIntegerWidthSources();if(args[0]==='--write'){const native=prepareIntegerWidthNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Integer width source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
