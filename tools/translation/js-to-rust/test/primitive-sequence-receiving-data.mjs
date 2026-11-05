// Complete receiving source fixture DATA; no caller or executable authority.
import * as outcome from '../owned-outcome.mjs';
import * as cancellation from '../owned-cancellation.mjs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {ownedCancellationReceivingData} from './owned-cancellation-receiving-data.mjs';
import {proposePrimitiveSequenceRootSource} from '../../primitive-sequence-root-source.mjs';
const families={outcome:{api:outcome,data:ownedStateReceivingData},cancellation:{api:cancellation,data:ownedCancellationReceivingData}};
export function primitiveSequenceReceivingData(family,text,path='caller.mjs'){
 const {api,data}=families[family],result=data([{path,source:text}]);result.primitiveOperators=true;result.files=result.files.filter(row=>!row.path.startsWith('runtime/')).concat(api.ownedOutcomeRuntimeSources());const root=result.files.find(row=>row.path==='src/lib.rs'),proposal=proposePrimitiveSequenceRootSource(root.source),files=new Map(result.files.map(row=>[row.path,row]));for(const row of proposal.files){const next={path:row.path,source:row.after??row.source},previous=files.get(row.path);if(previous&&row.path!=='src/lib.rs'&&previous.source!==next.source)throw new TypeError('Independent receiving source conflict');files.set(row.path,next);}result.files=[...files.values()];return result;
}
