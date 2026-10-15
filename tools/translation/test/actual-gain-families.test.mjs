// Stored complete artifacts, never recompilation with a projected source scope.
// No translator/Host imports: an explicit historical generation can be checked
// while an unrelated worker's compiler sources have changed.
import assert from 'node:assert/strict';
import test,{before,after} from 'node:test';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,readdirSync,lstatSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const SOURCE=resolve(process.env.ROUTER_ACTUAL_GAIN_ROOT??ROOT);
const generation=process.env.ROUTER_ACTUAL_GAIN_GENERATION_REF??null;
if(generation!==null&&!/^[0-9a-f]{40}$/u.test(generation))throw new Error('Actual gains require a complete committed generation SHA');
const hash=value=>createHash('sha256').update(value).digest('hex');
const pin=(path,bytes)=>({path,bytes:bytes.length,sha256:hash(bytes)});
const relative=path=>{assert.ok(typeof path==='string'&&!path.includes('\\')&&!path.includes('\0')&&!path.includes('\n')&&!path.includes(':')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'),'safe artifact path');return path;};
const read=path=>{relative(path);let file=SOURCE;for(const part of path.split('/')){file=join(file,part);assert.ok(!lstatSync(file).isSymbolicLink(),path);}assert.ok(lstatSync(file).isFile(),path);const bytes=readFileSync(file);assert.ok(bytes.length<=32*1024*1024,path);return bytes;};
const git=paths=>{
  const bytes=execFileSync('git',['cat-file','--batch'],{cwd:SOURCE,input:paths.map(path=>generation+':'+relative(path)+'\n').join(''),maxBuffer:128*1024*1024});
  let at=0;const result=new Map();
  for(const path of paths){const end=bytes.indexOf(10,at),header=bytes.subarray(at,end).toString().split(' ');assert.equal(header[1],'blob',path);const length=Number(header[2]);at=end+1;result.set(path,bytes.subarray(at,at+length));at+=length;assert.equal(bytes[at++],10);}
  assert.equal(at,bytes.length);return result;
};
const retain=(name,value)=>{if(process.env.ROUTER_ACTUAL_GAIN_VECTOR_DIR)writeFileSync(join(process.env.ROUTER_ACTUAL_GAIN_VECTOR_DIR,name+'.json'),JSON.stringify(value,(_,item)=>typeof item==='bigint'?{$bigint:item.toString()}:item)+'\n');};
const frozen=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;};
const NONE=Object.freeze({$:'None'}),some=field0=>frozen({$:'Some',field0}),tag=($,fields={})=>frozen({$,...fields});
const CLIENT_CONSTANTS={CODEX_PROVIDER:'link-assistant',CODEX_TOKEN_ENV:'LINK_ASSISTANT_TOKEN',CLAUDE_TOKEN_ENV:'ANTHROPIC_AUTH_TOKEN',CLAUDE_BASE_ENV:'ANTHROPIC_BASE_URL',ROUTER_TOKEN_ENV:'LINK_ASSISTANT_TOKEN',GROK_TOKEN_ENV:'GROK_API_KEY',GROK_BASE_ENV:'GROK_BASE_URL',ROUTER_PROVIDER:'link-assistant',OWNERSHIP_MARKER:'.link-assistant-router-client.json',CLAUDE_MODEL_ENV:['ANTHROPIC_MODEL','ANTHROPIC_DEFAULT_OPUS_MODEL','ANTHROPIC_DEFAULT_SONNET_MODEL','ANTHROPIC_DEFAULT_HAIKU_MODEL','CLAUDE_CODE_SUBAGENT_MODEL'],CLAUDE_GATEWAY_TARGET_ENV:['ANTHROPIC_MODEL','CLAUDE_CODE_SUBAGENT_MODEL'],CLAUDE_DEFAULT_ROW_ENV:['ANTHROPIC_DEFAULT_OPUS_MODEL','ANTHROPIC_DEFAULT_SONNET_MODEL','ANTHROPIC_DEFAULT_HAIKU_MODEL'],OPENAI_MODEL_OWNER:'openai',ANTHROPIC_MODEL_OWNER:'anthropic',GOOGLE_MODEL_OWNER:'google',QWEN_MODEL_OWNER:'qwen',ZAI_MODEL_OWNER:'z.ai',DEFAULT_OPENAI_REASONING_EFFORT:'xhigh',DOCTOR_MAX_TOKENS:64n,DEFAULT_ANTHROPIC_REASONING_EFFORT:'high'};
const DEPLOY_CONSTANTS={RESERVED_ENV:['TOKEN_SECRET','DATA_DIR','STORAGE_POLICY','HOME','PATH','USER','SHELL','PWD','IFS','CLAUDE_CODE_HOME','CLAUDE_CONFIG_DIR','LISTENERS','ROUTER_HOST','ROUTER_PORT','NODE_EXTRA_CA_CERTS'],RESERVED_ENV_PREFIXES:['ROUTER_DEPLOY_','TLS_','VERIFY_','PRESERVATION_'],VERIFIABLE_CLIENTS:['claude','codex','qwen-code','gemini','opencode']};
const areas=JSON.parse(readFileSync(new URL('../fixtures/actual-gain-areas.json',import.meta.url)));
const runExpected=({targets=[],unit=[],filter=null,serial=false})=>tag('Run',{targets,unit,filter:filter===null?NONE:some(filter),serial});
const expectedAreas=areas.map(area=>tag('Area',{...area,runs:area.runs.map(runExpected)}));
const GAINS={
  'src/client_lifecycle/maintenance.rs':{fn:['package']},
  'src/clients.rs':{const:Object.keys(CLIENT_CONSTANTS)},
  'src/clients/catalog.rs':{fn:['claude_context_variant_is_authorized']},
  'src/deploy_config.rs':{const:Object.keys(DEPLOY_CONSTANTS),struct:['DeploySection']},
  'src/subscription_usage.rs':{fn:['parse_provider']},
  'src/verification.rs':{const:['SCHEMA','SKIP_LOG','AREAS'],struct:['Run','Area','Counts'],fn:['tests','unit','status','results']},
};
const rows=[],loaded=new Map();let directory,inventory,compilerEvidence,runtimeEvidence,coverage;
function originalBlock(source,kind,name){
  const pattern=new RegExp('\\b'+kind+'\\s+'+name+'\\b[^\\{]*\\{','u'),match=pattern.exec(source);assert.ok(match,kind+' '+name);let at=match.index+match[0].length,depth=1,end=at;
  for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
  assert.equal(depth,0);return source.slice(at,end-1);
}
function variants(source,name){return [...originalBlock(source,'enum',name).matchAll(/^\s*([A-Z][A-Za-z0-9_]*)\s*,?\s*$/gmu)].map(match=>match[1]);}
function fields(source,name){return [...originalBlock(source,'struct',name).matchAll(/^\s*(?:pub\s+)?([a-z_][a-z0-9_]*)\s*:\s*([^\n]+),\s*$/gmu)].map(match=>({name:match[1],type:match[2].trim()}));}
function outputs(source){const family=loaded.get(source);assert.ok(family,source);return family;}

before(async()=>{
  const inventoryBytes=read('parity/rust-source-inventory.json');inventory=JSON.parse(inventoryBytes);assert.equal(inventory.runtimeParity,false);
  const compilerPaths=Object.keys(inventory.implementationHashes),originals=generation?git(['parity/rust-source-inventory.json',...compilerPaths]):null;
  if(originals)assert.deepEqual(originals.get('parity/rust-source-inventory.json'),inventoryBytes,'stored inventory must belong to explicit generation');
  compilerEvidence=compilerPaths.map(path=>{const bytes=originals?.get(path)??read(path);assert.equal(hash(bytes),inventory.implementationHashes[path],'generation compiler input '+path);return pin(path,bytes);});
  coverage=[];directory=mkdtempSync(join(tmpdir(),'router-actual-gain-families-'));writeFileSync(join(directory,'package.json'),'{"type":"module"}\n');mkdirSync(join(directory,'runtime'),{recursive:true});runtimeEvidence=[];
  const runtimeCopies=new Map();
  for(const runtimeRoot of ['packages/javascript/generated/rust-draft/runtime','packages/typescript/generated/rust-draft/runtime']){
    const names=readdirSync(join(SOURCE,runtimeRoot)).sort(),paths=names.map(name=>runtimeRoot+'/'+name),originalRuntime=generation?git(paths):null;
    for(const name of names){
      const path=runtimeRoot+'/'+name,bytes=read(path);assert.ok(!name.includes('/')&&!name.includes('\\'));
      if(originalRuntime)assert.deepEqual(originalRuntime.get(path),bytes,'runtime from exact committed generation '+path);
      if(runtimeCopies.has(name))assert.deepEqual(runtimeCopies.get(name),bytes,'shared runtime bytes '+name);
      else{runtimeCopies.set(name,bytes);writeFileSync(join(directory,'runtime',name),bytes);}
      runtimeEvidence.push(pin(path,bytes));
    }
  }
  const completeArtifacts=[],companionSources=[];
  for(const source of ['src/subscription_usage_types.rs','src/model_contract.rs']){
    const item=inventory.sources.find(row=>row.source===source),bytes=read(source);assert.ok(item,source);assert.equal(hash(bytes),item.sha256);
    if(generation)assert.deepEqual(git([source]).get(source),bytes,'companion source from exact generation '+source);
    companionSources.push({...pin(source,bytes),source:bytes.toString('utf8')});
  }
  for(const [source,gains]of Object.entries(GAINS)){
    const item=inventory.sources.find(row=>row.source===source);assert.ok(item,source);const sourceBytes=read(source),metaBytes=read(item.targets.meta),javascript=read(item.targets.javascript),typescript=read(item.targets.typescript),meta=JSON.parse(metaBytes);
    assert.equal(hash(sourceBytes),item.sha256);assert.equal(meta.sourceSha256,item.sha256);assert.equal(meta.sourcePath,source);assert.equal(meta.items.map(row=>row.source).join(''),sourceBytes.toString('utf8'));
    if(generation)for(const [path,bytes]of [[source,sourceBytes],[item.targets.meta,metaBytes],[item.targets.javascript,javascript],[item.targets.typescript,typescript]])assert.deepEqual(git([path]).get(path),bytes,'artifact from exact committed generation '+path);
    for(const [term,names]of Object.entries(gains))for(const name of names){const matches=meta.items.filter(row=>row.term===term&&row.name===name);assert.equal(matches.length,1);assert.equal(matches[0].status,'executable',source+' '+name);assert.ok(matches[0].semantic?.checkedIR);coverage.push({source,term,name,span:matches[0].span,project:matches[0].semantic.project??null});}
    const relative=source.slice(0,-3),targetJS=join(directory,relative+'.mjs'),targetTS=join(directory,relative+'.ts');mkdirSync(dirname(targetJS),{recursive:true});writeFileSync(targetJS,javascript);writeFileSync(targetTS,typescript);rows.push({source,relative,targetJS,meta,sourceText:sourceBytes.toString('utf8')});
    completeArtifacts.push({source,sourceBytes:sourceBytes.toString('utf8'),metaBytes:metaBytes.toString('utf8'),javascript:javascript.toString('utf8'),typescript:typescript.toString('utf8')});
  }
  assert.equal(coverage.length,37);assert.equal(coverage.filter(row=>row.term==='fn').length,7);assert.equal(coverage.filter(row=>row.term==='const').length,26);assert.equal(coverage.filter(row=>row.term==='struct').length,4);
  let compiler=process.env.ROUTER_TRANSLATION_TSC;
  if(compiler===undefined)compiler=createRequire(join(SOURCE,'packages/javascript/package.json')).resolve('typescript/bin/tsc');
  const version=execFileSync(process.execPath,[compiler,'--version'],{encoding:'utf8',timeout:30_000}).trim();assert.equal(version,'Version 5.9.3');
  const compiled=join(directory,'compiled');execFileSync(process.execPath,[compiler,'--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',directory,'--outDir',compiled,...rows.map(row=>join(directory,row.relative+'.ts'))],{stdio:'pipe',timeout:30_000});
  cpSync(join(directory,'runtime'),join(compiled,'runtime'),{recursive:true});
  for(const row of rows){const modules=[];for(const path of [row.targetJS,join(compiled,row.relative+'.js')]){const module=await import(pathToFileURL(path).href);assert.deepEqual(module.provenance,{sourcePath:row.source,sourceSha256:row.meta.sourceSha256,...row.meta.counts,runtimeParity:false});assert.equal(Object.keys(module.translated).length,row.meta.counts.executable);modules.push(module.translated);}loaded.set(row.source,modules);}
  retain('complete-original-artifacts',{generation,inventoryBytes:inventoryBytes.toString('utf8'),compilerEvidence,runtimeEvidence,coverage,completeArtifacts,companionSources,compilerVersion:version,localRustExecuted:false});
},{timeout:60_000});
after(()=>{if(directory)rmSync(directory,{recursive:true,force:true});});

test('all37 stored gains retain complete original source, declaration and generation context',()=>{
  assert.equal(coverage.length,37);assert.ok(compilerEvidence.length>0);assert.ok(runtimeEvidence.length>0);
  for(const row of rows)assert.equal(row.meta.items.map(item=>item.source).join(''),row.sourceText);
  retain('source-classifications',{coverage,sourceRows:rows.map(({source,meta})=>({source,counts:meta.counts,items:meta.items}))});
});

test('all26 constants including the complete ten-area source table have independent expectations',()=>{
  const expected={'src/clients.rs':CLIENT_CONSTANTS,'src/deploy_config.rs':DEPLOY_CONSTANTS,'src/verification.rs':{SCHEMA:'link-assistant-router/verification/v1',SKIP_LOG:'ROUTER_VERIFICATION_SKIPS',AREAS:expectedAreas}};const observations=[];
  for(const [source,constants]of Object.entries(expected))for(const translated of outputs(source))for(const [name,value]of Object.entries(constants)){assert.deepEqual(translated[name],value,source+' '+name);observations.push({source,name,expected:value,actual:translated[name]});}
  assert.equal(observations.length,52);retain('all-constants',observations);
});

test('complete original ClientKind and UsageProvider unit enums cover every package/parse arm',()=>{
  const clientSource=read('src/clients.rs').toString('utf8'),providerSource=read('src/subscription_usage_types.rs').toString('utf8');
  const clients=variants(clientSource,'ClientKind');assert.deepEqual(clients,['Codex','ClaudeCode','Cursor','GeminiCli','GrokCli','Opencode','QwenCode','Agent']);
  const providers=variants(providerSource,'UsageProvider');assert.deepEqual(providers,['Anthropic','OpenAi','ZAi','Lefine','Gemini','Qwen']);
  const packages={Codex:'@openai/codex',ClaudeCode:'@anthropic-ai/claude-code',GeminiCli:'@google/gemini-cli',Opencode:'opencode-ai',QwenCode:'@qwen-code/qwen-code'},spellings={anthropic:'Anthropic',openai:'OpenAi','z-ai':'ZAi',lefine:'Lefine',gemini:'Gemini',qwen:'Qwen'},observed=[];
  for(const translated of outputs('src/client_lifecycle/maintenance.rs'))for(const name of clients){const expected=Object.hasOwn(packages,name)?some(packages[name]):NONE,result=translated.package(tag(name));assert.deepEqual(result,expected);observed.push({client:name,expected,result});}
  for(const translated of outputs('src/subscription_usage.rs')){for(const [name,variant]of Object.entries(spellings)){const expected=some(tag(variant)),result=translated.parse_provider(name);assert.deepEqual(result,expected);observed.push({provider:name,expected,result});}for(const name of ['','Anthropic','openai ','z.ai','claude','OPENAI','😀']){assert.deepEqual(translated.parse_provider(name),NONE);observed.push({provider:name,result:NONE});}}
  retain('complete-enum-arms',{clientSource,providerSource,clients,providers,observed});
});

test('catalog context variants require exact nonempty Anthropic-owned complete model rows',()=>{
  const source=read('src/clients/catalog.rs').toString('utf8');assert.deepEqual(fields(source,'RouterModel').map(row=>row.name),['id','owned_by','selector_kind','capability_provenance','default_reasoning_level','provider_created_at','supported_reasoning_levels','client_capabilities','router_unavailable_reason']);
  const model=(id,owned_by)=>tag('RouterModel',{id,owned_by,selector_kind:tag('Unknown'),capability_provenance:tag('Null'),default_reasoning_level:NONE,provider_created_at:NONE,supported_reasoning_levels:NONE,client_capabilities:tag('RouterClientCapabilities',{claude:NONE}),router_unavailable_reason:NONE});
  const cases=[{rows:[],requested:'model[1m]',expected:false},{rows:[model('model','anthropic')],requested:'model[1m]',expected:true},{rows:[model('model','openai')],requested:'model[1m]',expected:false},{rows:[model('model','Anthropic')],requested:'model[1m]',expected:false},{rows:[model('','anthropic')],requested:'[1m]',expected:false},{rows:[model('model','anthropic')],requested:'model',expected:false},{rows:[model('model','anthropic')],requested:'model[1M]',expected:false},{rows:[model('Model','anthropic')],requested:'model[1m]',expected:false},{rows:[model('😀','anthropic')],requested:'😀[1m]',expected:true},{rows:[model('model[1m]','anthropic')],requested:'model[1m][1m]',expected:true},{rows:[model('other','anthropic'),model('model','openai')],requested:'model[1m]',expected:false},{rows:[model('model','openai'),model('model','anthropic')],requested:'model[1m]',expected:true}];const results=[];
  for(const translated of outputs('src/clients/catalog.rs'))for(const row of cases){const actual=translated.claude_context_variant_is_authorized(frozen(row.rows),row.requested);results.push({...row,actual});assert.equal(actual,row.expected);}
  retain('catalog-complete-rows',{source,cases,results});
});

test('status precedence covers every boolean branch and u64 boundary without floating coercion',()=>{
  const results=[];
  for(const translated of outputs('src/verification.rs'))for(const succeeded of [false,true])for(const passed of [0n,1n,18446744073709551615n])for(const failed of [0n,1n])for(const ignored of [0n,1n])for(const skipped of [0n,1n])for(const notRun of [0n,1n]){
    const counts=translated.Counts(passed,failed,ignored),expected=!succeeded||failed!==0n?'failed':passed===0n||ignored!==0n||skipped!==0n||notRun!==0n?'not-proven':'proven',actual=translated.status(succeeded,counts,skipped,notRun);results.push({succeeded,passed,failed,ignored,skipped,notRun,expected,actual});assert.equal(actual,expected);
  }
  for(const translated of outputs('src/verification.rs')){assert.throws(()=>translated.Counts(-1n,0n,0n),RangeError);assert.throws(()=>translated.Counts(18446744073709551616n,0n,0n),RangeError);assert.throws(()=>translated.Counts(1,0n,0n),TypeError);}
  retain('status-truth-table',results);
});

test('results counts Rust LF/CRLF lines and Rust whitespace while retaining BOM and scalar guards',()=>{
  const cases=[['',0n],['test result: ok',1n],['test result: ok\n',1n],['test result: ok\r\nnoise\r\ntest result: failed\r\n',2n],['test result: ok\r',1n],['\n\n',0n],['\u0085test result: ok',1n],['\u2003test result: ok\u3000',1n],['\ufefftest result: ok',0n],['prefix test result: ok',0n],['test result: ok\u2028test result: next',1n],['😀\ntest result: ok',1n],['test result:',0n],['test result: ',0n],['test result: x\ntest result: y\ntest result: z',3n]],observed=[];
  for(const translated of outputs('src/verification.rs')){for(const [input,expected]of cases){const actual=translated.results(input);observed.push({input,expected,actual});assert.equal(actual,expected);}assert.throws(()=>translated.results('\ud800'),TypeError);assert.throws(()=>translated.results(null),TypeError);}
  retain('rust-lines-whitespace',observed);
});

test('allfour new record constructors and both source helper constructors retain exact fields/order',()=>{
  const verification=read('src/verification.rs').toString('utf8'),deploy=read('src/deploy_config.rs').toString('utf8');assert.deepEqual(fields(verification,'Run').map(row=>row.name),['targets','unit','filter','serial']);assert.deepEqual(fields(verification,'Area').map(row=>row.name),['name','covers','enable','runs']);assert.deepEqual(fields(verification,'Counts').map(row=>row.name),['passed','failed','ignored']);
  const deployFields=['server','instance','port','public_port','image','build','root','mode','claude_credentials','seed_credentials'];assert.deepEqual(fields(deploy,'DeploySection').map(row=>row.name),deployFields);const observations=[];
  for(const translated of outputs('src/verification.rs')){
    const targets=frozen(['target','😀']),unit=frozen(['--lib']),run=translated.Run(targets,unit,some('filter'),true);assert.deepEqual(run,runExpected({targets,unit,filter:'filter',serial:true}));assert.ok(Object.isFrozen(run));
    assert.deepEqual(translated.tests(targets),runExpected({targets}));assert.deepEqual(translated.unit(unit,'filter'),runExpected({unit,filter:'filter'}));
    const area=translated.Area('area','coverage','enable',frozen([run]));assert.deepEqual(area,tag('Area',{name:'area',covers:'coverage',enable:'enable',runs:[run]}));assert.deepEqual(translated.Counts(7n,2n,1n),tag('Counts',{passed:7n,failed:2n,ignored:1n}));observations.push({run,area});
  }
  for(const translated of outputs('src/deploy_config.rs')){const args=[some('server'),NONE,some(65535n),some(0n),some('image'),some('build'),some('/root'),some('host'),some('isolated'),frozen(['seed'])],value=translated.DeploySection(...args);assert.deepEqual(value,tag('DeploySection',Object.fromEntries(deployFields.map((name,index)=>[name,args[index]]))));assert.ok(Object.isFrozen(value));assert.throws(()=>translated.DeploySection(...args.slice(0,2),some(65536n),...args.slice(3)));observations.push({value,args});}
  retain('four-record-layouts',{verification,deploy,observations});
});

test('constructor immutable ABI isolates owned vector aliases and never retains mutable static-slice aliases',()=>{
  const observations=[];
  for(const translated of outputs('src/deploy_config.rs')){
    const seeds=['first'],args=[NONE,NONE,NONE,NONE,NONE,NONE,NONE,NONE,NONE,seeds],value=translated.DeploySection(...args),before=[...value.seed_credentials];seeds[0]='changed';seeds.push('second');const after=[...value.seed_credentials];observations.push({kind:'owned-Vec',before,after,caller:seeds,resultFrozen:Object.isFrozen(value.seed_credentials),sameIdentity:value.seed_credentials===seeds,callerFrozen:Object.isFrozen(seeds)});
    const server={$:'Some',field0:'original'},record=translated.DeploySection(server,NONE,NONE,NONE,NONE,NONE,NONE,NONE,NONE,frozen([])),original=record.server.field0;server.field0='changed';observations.push({kind:'owned-Option',before:original,after:record.server.field0,resultFrozen:Object.isFrozen(record.server),sameIdentity:record.server===server,callerFrozen:Object.isFrozen(server)});
  }
  for(const translated of outputs('src/verification.rs')){
    const targets=['first'];let result;try{result=translated.Run(targets,[],NONE,false);}catch(error){assert.ok(error instanceof TypeError);observations.push({kind:'static-slice',refused:error.name});continue;}
    const before=[...result.targets];targets[0]='changed';targets.push('second');observations.push({kind:'static-slice',before,after:[...result.targets],resultFrozen:Object.isFrozen(result.targets),sameIdentity:result.targets===targets});
  }
  for(const translated of outputs('src/verification.rs')){const runs=[runExpected({targets:['first']})];let result;try{result=translated.Area('name','covers','enable',runs);}catch(error){assert.ok(error instanceof TypeError);observations.push({kind:'static-area-slice',refused:error.name});continue;}const before=[...result.runs];runs.push(runExpected({unit:['--lib']}));observations.push({kind:'static-area-slice',before,after:[...result.runs],resultFrozen:Object.isFrozen(result.runs),sameIdentity:result.runs===runs});}
  retain('constructor-alias-isolation',observations);
  for(const row of observations)if(!row.refused){assert.deepEqual(row.after,row.before,'caller mutation must not change the immutable Rust record');assert.equal(row.resultFrozen,true);assert.equal(row.sameIdentity,false);if(row.kind.startsWith('owned-'))assert.equal(row.callerFrozen,false);}
});
