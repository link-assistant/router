// Fresh complete library source histories. Source DATA only, no runtime authority.
import {fileURLToPath} from 'node:url';
import {prepareNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveOptionWidthNativeSource} from './primitive-option-width-native-source.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function currentOptionalTextGenericLibraryHistory({source,root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{
  const eager=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/option-eager-error-source/complete-generic-current-history.json.gz',pin:'71418906886e55274c5d4448071c60e79d42e54b4b65ea9f8908b13ef7976583',id:'router:option-eager-error-generic-history-v1'});
  const current=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/optional-text-source/complete-generic-current-history.json.gz',pin:'58194300347485dd569bbcc3cec369203522be201ffa12bf2681a8a43336f672',id:'router:optional-text-generic-current-history-v1',laterPlans:[eager]});
  const width=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/optional-text-source/complete-generic-width-history.json.gz',pin:'651570475fd28bc681ab42eed839900fb6991da62f4d0512a5b2d8f7fa9faf75',id:'router:optional-text-generic-width-history-v1',laterPlans:[current]});
  const native=preparePrimitiveOptionWidthNativeSource({root,source});return {files:[native.files[0],...width.files],sourceAuthority:false,semanticAuthority:false,receivingExecuted:false,rustExecuted:false};
 });
}
