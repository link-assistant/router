#!/usr/bin/env node
// Deferred tool: do not invoke during source-only drafting.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {collectFeedbackCycle} from './ci-feedback-cycle.mjs';

const API='https://api.github.com';
const MAX_JSON=8*1024*1024;
function need(value,message){if(!value)throw new TypeError(message);}
export function createGitHubFeedbackAdapter({token,fetchImpl=fetch}={}){
  need(typeof token==='string'&&token.length>0&&!/[\r\n]/.test(token),'A GitHub token is required');
  async function request(resource,{signal,maxBytes=MAX_JSON,binary=false}={}){
    need(resource.startsWith('/repos/'),'Unexpected API resource');
    let response=await fetchImpl(API+resource,{signal,redirect:'manual',headers:{
      Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28'}});
    if([301,302,303,307,308].includes(response.status)){
      need(binary,'Unexpected JSON redirect');
      const target=new URL(response.headers.get('location'));
      need(target.protocol==='https:'&&!target.username&&!target.password&&
        (target.hostname==='github.com'||target.hostname.endsWith('.githubusercontent.com')||
         target.hostname.endsWith('.blob.core.windows.net')),'Unrecognized evidence download host');
      await response.body?.cancel();
      // No API credential is sent to an object-storage URL. Refuse further
      // redirects instead of forwarding either credentials or signed URL data.
      response=await fetchImpl(target,{signal,redirect:'error'});
    }
    if(!response.ok){
      const error=new Error(`GitHub API status ${response.status}`);
      error.status=response.status;
      try{await response.body?.cancel();}catch{}
      throw error;
    }
    const advertised=response.headers.get('content-length');
    if(advertised!==null)need(/^\d+$/.test(advertised)&&Number(advertised)<=maxBytes,'Advertised response exceeds bound');
    const reader=response.body?.getReader();need(reader,'Missing complete response body');
    const chunks=[];let size=0,complete=false;
    try{
      for(;;){const row=await reader.read();if(row.done){complete=true;break;}
        size+=row.value.byteLength;need(size<=maxBytes,'Response byte bound exceeded');chunks.push(row.value);}
    }finally{if(!complete)await reader.cancel().catch(()=>{});reader.releaseLock();}
    if(advertised!==null&&!response.headers.get('content-encoding'))need(size===Number(advertised),'Truncated response');
    const data=Buffer.concat(chunks,size);return binary?data:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
  }
  const repo=value=>{need(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value),'Invalid repository');return `/repos/${value}`;};
  const id=value=>{need(Number.isSafeInteger(value)&&value>0,'Invalid API identifier');return value;};
  const pagination=({page,per_page})=>{need(Number.isSafeInteger(page)&&page>0&&page<=100&&per_page===100,'Invalid pagination');return `per_page=100&page=${page}`;};
  return {
    async workflowSource(args){
      need(/^[a-f0-9]{40}$/.test(args.sha)&&/^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(args.sourcePath),'Invalid workflow source');
      const result=await request(`${repo(args.repository)}/contents/${args.sourcePath}?ref=${args.sha}`,args);
      need(result.type==='file'&&result.path===args.sourcePath&&result.encoding==='base64'&&
        typeof result.content==='string'&&Number.isSafeInteger(result.size)&&result.size>=0&&
        result.size<=args.maxBytes,'Malformed workflow source');
      const encoded=result.content.replace(/\n/g,'');
      need(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded),'Invalid workflow base64');
      const bytes=Buffer.from(encoded,'base64');
      need(bytes.length===result.size&&bytes.toString('base64')===encoded,'Truncated workflow source');
      return bytes;
    },
    listRuns(args){need(/^[a-f0-9]{40}$/.test(args.sha),'Invalid SHA');return request(`${repo(args.repository)}/actions/runs?head_sha=${args.sha}&${pagination(args)}`,args);},
    listJobs(args){return request(`${repo(args.repository)}/actions/runs/${id(args.runId)}/attempts/${id(args.attempt)}/jobs?${pagination(args)}`,args);},
    listArtifacts(args){return request(`${repo(args.repository)}/actions/runs/${id(args.runId)}/artifacts?${pagination(args)}`,args);},
    jobLog(args){return request(`${repo(args.repository)}/actions/jobs/${id(args.jobId)}/logs`,{...args,binary:true});},
    artifact(args){return request(`${repo(args.repository)}/actions/artifacts/${id(args.artifactId)}/zip`,{...args,binary:true});},
  };
}

export async function main(argv=process.argv.slice(2)){
  const options={workflowIds:[]};
  for(let index=0;index<argv.length;index++){
    const flag=argv[index],value=argv[++index];need(value,'Flag requires a value');
    if(flag==='--repository')options.repository=value;
    else if(flag==='--sha')options.sha=value;
    else if(flag==='--workflow-id')options.workflowIds.push(Number(value));
    else if(flag==='--output')options.output=path.resolve(value);
    else throw new TypeError(`Unknown option ${flag}`);
  }
  need(options.output,'An exclusive new evidence directory is required');
  const parent=fs.lstatSync(path.dirname(options.output));
  need(parent.isDirectory()&&!parent.isSymbolicLink(),'Evidence parent must be a directory');
  // A private, newly created directory is the cooperating-writer boundary.
  // Existing directories are never merged, overwritten or deleted.
  fs.mkdirSync(options.output,{mode:0o700});
  fs.writeFileSync(path.join(options.output,'INCOMPLETE'),
    'Capture is incomplete until COMPLETE.json exists. Retain partial evidence.\n',{flag:'wx',mode:0o600});
  const api=createGitHubFeedbackAdapter({token:process.env.GH_TOKEN??process.env.GITHUB_TOKEN});
  const controller=new AbortController();
  const interrupted=()=>controller.abort(new Error('Capture interrupted'));
  process.once('SIGINT',interrupted);process.once('SIGTERM',interrupted);
  let written=0;
  try{
    const capture=await collectFeedbackCycle({...options,api,signal:controller.signal,onEvidence(name,bytes){
      need(/^[A-Za-z0-9_./-]+$/.test(name)&&!name.split('/').some(part=>part==='..'||part==='.'||!part),'Invalid generated evidence name');
      const target=path.join(options.output,name);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
      fs.writeFileSync(target,bytes,{flag:'wx',mode:0o600});written+=bytes.length;
    }});
    fs.writeFileSync(path.join(options.output,'COMPLETE.json'),JSON.stringify({
      schema:'router-ci-capture-publication-v1',sha:options.sha,files:capture.files.size,
      bytes:written,completeEvidence:capture.manifest.completeEvidence,
      rustAdmission:false,verificationQualified:false})+'\n',{flag:'wx',mode:0o600});
    process.stdout.write(JSON.stringify({output:options.output,sha:options.sha,
      completeEvidence:capture.manifest.completeEvidence,failures:capture.manifest.failures.length,
      missing:capture.manifest.missing.length,rustAdmission:false})+'\n');
    // Missing/expired logs or artifacts make capture unsuccessful even though
    // all successfully captured bytes and the explicit gaps remain reviewable.
    if(!capture.manifest.completeEvidence)process.exitCode=1;
  }finally{process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
