// Complete receiving library source data, never an executable/source permit.
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {httpDeadlineRuntimeSources} from '../../http-deadline-runtime-sources.mjs';
import {TEXT_NATIVE_SOURCE} from '../../text-native-source.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../../owned-result-native-source.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {HTTP_PROTOCOL_NATIVE_SOURCE} from '../../http-protocol-native-source.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE} from '../../async-control-native-source.mjs';
import {HTTP_TRANSPORT_NATIVE_SOURCE,HTTP_TRANSPORT_GUARD_SOURCE} from '../../http-transport-native-source.mjs';
import {HTTP_DEADLINE_NATIVE_SOURCE} from '../../http-deadline-native-source.mjs';
export function httpDeadlineReceivingData(callerFiles=[]){
 const data=ownedStateReceivingData(callerFiles);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(httpDeadlineRuntimeSources());for(const [name,source]of [['translation_text_core',TEXT_NATIVE_SOURCE],['translation_owned_results_core',OWNED_RESULT_NATIVE_SOURCE],['translation_carriers_core',OWNED_OUTCOME_NATIVE_SOURCE],['translation_http_protocol_core',HTTP_PROTOCOL_NATIVE_SOURCE],['translation_async_control_core',ASYNC_CONTROL_NATIVE_SOURCE],['translation_http_transport_core',HTTP_TRANSPORT_NATIVE_SOURCE],['upstream_guard',HTTP_TRANSPORT_GUARD_SOURCE],['translation_http_deadline_core',HTTP_DEADLINE_NATIVE_SOURCE]]){data.files.find(row=>row.path==='src/lib.rs').source+='pub mod '+name+';\n';data.files.push({path:'src/'+name+'.rs',source});}return data;
}
