import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveOptionWidthNativeSource} from './primitive-option-width-native-source.mjs';
import {prepareJsonStringDefaultSources} from './prepare-json-string-default-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePrimitiveOptionWidthSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/primitive-option-width-source/complete-originals-and-rules.json.gz',pin:'596008d8762a2b2dd1455fe12562607bfe249a1836864248e82e852615a47dd2',id:'router:primitive-option-width-source-complete-source-substitutions-v1',laterPlans:[preparePrimitiveOptionWidthNativeSource({root}),prepareJsonStringDefaultSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=preparePrimitiveOptionWidthSources();if(args[0]==='--write'){const native=preparePrimitiveOptionWidthNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Primitive Option width source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
