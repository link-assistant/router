// Complete fixture source data only. This grants no resource or source permission.
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {ownedCancellationRuntimeSources} from '../owned-cancellation.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE} from '../../async-control-native-source.mjs';
export function ownedCancellationReceivingData(callerFiles=[]){
 const data=ownedStateReceivingData(callerFiles);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedCancellationRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_async_control_core;\n';data.files.push({path:'src/translation_async_control_core.rs',source:ASYNC_CONTROL_NATIVE_SOURCE});return data;
}
