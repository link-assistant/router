/** Current Router health identity before minting; never sends an admin token. */
import {sendRemoteManagement} from './remote-operations.mjs';
import {clientFailure} from './client-files.mjs';
export async function verifyRemoteClientHealth(context,target){
 const answer=await sendRemoteManagement({server:target.server,managementServer:target.server,managementCaCert:target.caCert},{method:'GET',path:'/api/health',response:'router-health'},{fetch:context.fetch,signal:context.invocation?.signal,deadlineMs:context.healthDeadlineMs??10000,maxOutputBytes:65536,cwd:context.invocation?.cwd});
 if(answer?.status!=='ok'&&typeof answer?.version!=='string')throw clientFailure('Selected inference origin does not identify a Router');
}
