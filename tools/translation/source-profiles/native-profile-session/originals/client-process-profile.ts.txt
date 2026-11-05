/** Private Router-owned profiles; caller profile contents and credentials are never copied. */
import {mkdtemp,mkdir,chmod,lstat,rm,realpath,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {randomUUID} from 'node:crypto';
import {clientPaths,clientFailure,clientObject,optionalClientText} from './client-files.js';
import {requireNativePath,readNativeText} from './operation-input.js';
import {withNativeFileLock,atomicWrite} from './storage.js';
import {setupClientJSON} from './client-json.js';import {setupPersistentClient} from './client-persistent.js';import {parseClientTomlSource} from './client-toml-cst.js';
import {usableProcessModels,codexProcessCatalog,codexProcessOverrides,claudeProcessSettings,claudeProcessEnvironment,claudeProcessPrivacyWarnings} from './client-process-settings.js';
export function processExtendsUserConfiguration(client:string,options:any={}):boolean{
 if(options.isolated_config)return false;if(client==='claude')return options.extend_global_config===true;return ['codex','grok'].includes(client);
}
async function prepare(context:any,directory:string,extendsUser:boolean):Promise<any>{
 const {options={},env={},cwd=process.cwd(),token,backendBaseURL=null,selectedModel=null,oneShot=false}=context,origin=normalizeManagedOrigin(context.origin),info=clientPaths(context.client,{home:options.home,env,cwd}).info,models=usableProcessModels(info.client,context.catalog),paths=clientPaths(info.client,{home:directory,env:{HOME:directory},cwd}),environment:Record<string,string>=clientProcessEnvironment(env),prefix:string[]=[],notes:string[]=[];
 if(typeof token!=='string'||!token.startsWith('la_sk_')||token.includes('\0'))throw clientFailure('Prepared process credential requires a Router token');
 if(info.client==='cursor-agent')throw clientFailure('Cursor process routing is unsupported');if(options.reset_to_default_configuration)throw clientFailure('Profile reset requires the remaining verified backup/reset lifecycle');
 if(!extendsUser){if(info.client==='claude')environment.CLAUDE_CONFIG_DIR=directory;else if(info.client==='gemini'){environment.HOME=directory;environment.GEMINI_CLI_HOME=directory;if(oneShot)environment.GEMINI_CLI_TRUST_WORKSPACE='true';}else if(info.client==='opencode'){environment.OPENCODE_CONFIG=paths.config;environment.OPENCODE_CONFIG_DIR=resolve(paths.config,'..');}else{environment.HOME=directory;delete environment.CODEX_HOME;delete environment.QWEN_HOME;}}
 if(info.token)environment[info.token]=token;if(info.base)environment[info.base]=origin+info.suffix;
 if(context.caCert){await readNativeText(context.caCert,{cwd,maxBytes:1048576});environment.NODE_EXTRA_CA_CERTS=resolve(cwd,context.caCert);}
 if(info.client==='claude'){
  const settings=extendsUser?clientPaths('claude',{home:options.home,env,cwd}).config:join(directory,'settings.json'),source=await optionalClientText(settings),saved=source===null?null:clientObject(source).model;
  if(saved!==undefined&&saved!==null&&typeof saved!=='string')throw clientFailure('Saved Claude model must be a string');Object.assign(environment,claudeProcessEnvironment(env,models,selectedModel,saved??null));notes.push(...claudeProcessPrivacyWarnings(env));prefix.push('--settings',JSON.stringify(claudeProcessSettings(models)));
 }else if(info.client==='codex'){
  const current=options.isolated_config?null:await optionalClientText(clientPaths('codex',{home:options.home,env,cwd}).config),document=current===null?{}:parseClientTomlSource(current),effort=document.model_reasoning_effort??null;if(effort!==null&&typeof effort!=='string')throw clientFailure('Configured Codex reasoning effort must be a string');
  const catalog=codexProcessCatalog(models,effort,selectedModel),path=join(directory,'router-codex-models.json');await atomicWrite(path,JSON.stringify(catalog.document)+'\n');if(catalog.omitted.length)notes.push('omitted inconsistent Codex reasoning metadata: '+catalog.omitted.join(', '));
  const backend=backendBaseURL??origin+'/api/services/codex/backend-api';if(options.isolated_config)await setupPersistentClient(paths,origin+info.suffix,models,{backendBaseURL:backend,model:selectedModel});prefix.push(...codexProcessOverrides(origin,backend,path,'link-assistant-run-'+randomUUID().replaceAll('-',''),models,selectedModel));
  const alias='at-'+token.slice(6);environment.CODEX_ACCESS_TOKEN=alias;environment.CODEX_CONNECTORS_TOKEN=alias;environment.CODEX_AUTHAPI_BASE_URL=origin+'/api/services/codex';
 }else if(info.client==='gemini'){await atomicWrite(paths.config,JSON.stringify({security:{auth:{selectedType:'gemini-api-key'}}})+'\n');environment.GEMINI_DEFAULT_AUTH_TYPE='gemini-api-key';}
 else if(['opencode','agent','qwen'].includes(info.client)){
  await setupClientJSON(paths,origin+info.suffix,models);if(['opencode','agent'].includes(info.client)&&selectedModel){const document=clientObject(await optionalClientText(paths.config));document.model=selectedModel.includes('/')?selectedModel:'link-assistant/'+selectedModel;await atomicWrite(paths.config,JSON.stringify(document)+'\n');}
  if(info.client==='agent')environment.LINK_ASSISTANT_AGENT_CONFIG_CONTENT=await readNativeText(paths.config,{maxBytes:8388608});if(info.client==='qwen'){environment.OPENAI_API_KEY=token;environment.OPENAI_BASE_URL=origin+info.suffix;if(selectedModel)environment.OPENAI_MODEL=selectedModel;}
 }
 return {command:info.client,argsPrefix:prefix,env:environment,cwd:resolve(cwd),directory,extendsUser,notes};
}
async function disposableTreeBudget(directory:string):Promise<void>{
 let count=0;const visit=async(path:string,depth:number):Promise<void>=>{if(++count>10000||depth>32)throw clientFailure('Disposable profile exceeds cleanup entry/depth budget; retained for explicit cleanup');const item=await lstat(path);if(item.isDirectory())for(const name of await readdir(path))await visit(join(path,name),depth+1);};await visit(directory,0);
}
export async function withClientProcessProfile(context:any,operation:(profile:any)=>Promise<any>):Promise<any>{
 const options=context.options??{},cwd=context.cwd??process.cwd(),normal=clientPaths(context.client,{home:options.home,env:context.env,cwd}),client=normal.info.client,extendsUser=processExtendsUserConfiguration(client,options),persistent=!options.isolated_config&&!extendsUser;
 if(client==='cursor-agent')throw clientFailure('Cursor process routing is unsupported');
 const run=async(directory:string):Promise<any>=>operation(await prepare({...context,client},directory,extendsUser));
 if(persistent){const directory=join(normal.configHome,'link-assistant-router','clients',client,'home');await requireNativePath(directory);await mkdir(directory,{recursive:true,mode:0o700});await chmod(directory,0o700);return withNativeFileLock(directory,()=>run(directory),1000);}
 const base=context.temporaryRoot===undefined?await realpath(tmpdir()):resolve(context.temporaryRoot);await requireNativePath(base);const directory=await mkdtemp(join(base,'router-client-'+client+'-'));await chmod(directory,0o700);const original=await lstat(directory);
 try{return await run(directory);}finally{const current=await lstat(directory);await requireNativePath(directory);if(!current.isDirectory()||current.dev!==original.dev||current.ino!==original.ino)throw clientFailure('Disposable client profile identity changed; replacement preserved');await disposableTreeBudget(directory);await rm(directory,{recursive:true,force:true,maxRetries:2,retryDelay:100});}
}

import {normalizeManagedOrigin} from './managed-server.js';

export function clientProcessEnvironment(env:Record<string,string>):Record<string,string>{const result={...env};delete result.LINK_ASSISTANT_ROUTER_TOKEN;delete result.LINK_ASSISTANT_TOKEN;delete result.TOKEN_SECRET;return result;}
