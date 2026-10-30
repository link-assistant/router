/** Current Router health identity before minting; never sends an admin token. */
import {sendRemoteManagement} from './remote-operations.js';
import {clientFailure} from './client-files.js';
export async function verifyRemoteClientHealth(context:any,target:any):Promise<void>{
 const answer=await sendRemoteManagement({server:target.server,managementServer:target.server,managementCaCert:target.caCert},{method:'GET',path:'/api/health',response:'router-health'},{fetch:context.fetch,signal:context.invocation?.signal,deadlineMs:10000,maxOutputBytes:65536,cwd:context.invocation?.cwd});
 if(answer?.status!=='ok'&&typeof answer?.version!=='string')throw clientFailure('Selected inference origin does not identify a Router');
}
