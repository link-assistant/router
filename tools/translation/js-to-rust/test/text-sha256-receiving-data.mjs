// Complete current source fixture DATA; never an executable/owner permit.
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {ownedOutcomeRuntimeSources} from '../owned-outcome.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../../text-native-source.mjs';
import {ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../../router-core-source-data.mjs';
export function textSha256ReceivingData(source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());
 data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_carriers_core;\npub mod translation_text_core;\n';
 data.files.push({path:'src/translation_carriers_core.rs',source:OWNED_OUTCOME_NATIVE_SOURCE},{path:'src/translation_text_core.rs',source:TEXT_NATIVE_SOURCE},{path:'src/translation_core/ranges.rs',source:ROUTER_CORE_RANGES_SOURCE},{path:'src/translation_core/base64.rs',source:ROUTER_CORE_BASE64_SOURCE});return data;
}
