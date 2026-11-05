/** Fresh bounded selected-CA loading; normal chain/hostname verification remains enabled. */
import {X509Certificate} from 'node:crypto';import {rootCertificates} from 'node:tls';import {resolve} from 'node:path';
import {readNativeText} from './operation-input.js';import {clientFailure} from './client-files.js';
export async function readClientRouterCA(path:string,cwd=process.cwd()):Promise<any>{
 if(typeof path!=='string'||!path||path.includes('\0'))throw clientFailure('Selected Router CA requires a nonempty path');const filename=resolve(cwd,path),pem=await readNativeText(filename,{maxBytes:1048576}),blocks=pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gu);
 if(!blocks?.length||blocks.length>256)throw clientFailure('Selected Router CA requires a bounded certificate bundle');try{for(const block of blocks)new X509Certificate(block);}catch{throw clientFailure('Selected Router CA contains an invalid certificate');}
 return {path:filename,ca:[...rootCertificates,pem]};
}
