// Additive original source DATA; the older complete receiving helper is intact.
import {httpResourceReceivingData} from './http-resource-receiving-data.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../../primitive-option-callback-native-source.mjs';
export function httpResourceOptionCallbackReceivingData(callerFiles=[]){
 const data=httpResourceReceivingData(callerFiles),root=data.files.find(row=>row.path==='src/lib.rs'),path='src/translation_primitive_option_callbacks_core.rs';if(!root||data.files.some(row=>row.path===path)||root.source.includes('mod translation_primitive_option_callbacks_core'))throw new TypeError('Distinct complete original Option callback receiving root required');root.source+='pub mod translation_primitive_option_callbacks_core;\n';data.files.push({path,source:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE});return data;
}
