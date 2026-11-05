// Independent launch-policy cases. SOURCE ONLY; ALL UNRUN. No client executable.
import test from 'node:test';import assert from 'node:assert/strict';
import {planNativeClientLaunch,forwardedClientModel,preflightNativeClientLaunch,unsupportedClientNativeCommand,nativeClientRequiresModel} from '../src/client-launch-plan.mjs';
import {executeNativeConfigure} from '../src/client-configure.mjs';import {createNativeRouter} from '../src/operations.mjs';
const limits={timeout:60000};
test('native sessions and exact argv preserve intended client subcommands without inferred one-shot flags',limits,()=>{
 for(const [client,args]of [['claude',['--resume','session']],['codex',['resume','session']],['opencode',['session','list']],['gemini',['mcp','list']],['qwen',['extensions','list']],['grok',['mcp']],['agent',['auth']],['cursor-agent',[]]]){const result=planNativeClientLaunch(client,{client_args:args},null,true);assert.deepEqual(result.arguments,args);assert.equal(result.one_shot,false);assert.equal(result.note,null);}
 for(const client of ['claude','codex','opencode','gemini','qwen','grok','agent']){const result=planNativeClientLaunch(client,{client_args:['--','future-command','--flag']},null,false);assert.deepEqual(result.arguments,['future-command','--flag']);assert.equal(result.one_shot,false);}
});
test('prompt mode and model placement follow native client-specific integration mechanics',limits,()=>{
 for(const [client,expected]of [['claude',['--model','model','--print','hello']],['codex',['exec','--model','model','hello']],['opencode',['run','--model','link-assistant/model','hello']],['gemini',['--model','model','-p','hello']],['qwen',['--model','model','-p','hello']],['grok',['--model','model','-p','hello']],['agent',['--model','link-assistant/model','--prompt','hello']]]){const result=planNativeClientLaunch(client,{client_args:['hello']},'model',true);assert.deepEqual(result.arguments,expected,client);assert.equal(result.one_shot,true);assert.equal(result.note,null);}
 assert.deepEqual(planNativeClientLaunch('opencode',{client_args:['hello']},'foreign/model',true).arguments,['run','--model','foreign/model','hello']);assert.deepEqual(planNativeClientLaunch('codex',{client_args:['exec','hello']},'chosen',true).arguments,['exec','--model','chosen','hello']);
});
test('native mode aliases and forwarded models are not duplicated and model conflicts refuse before lookup',limits,()=>{
 for(const [client,args]of [['claude',['-p','hello']],['gemini',['--prompt','hello']],['qwen',['--prompt','hello']],['grok',['--prompt','hello']],['agent',['-p','hello']],['codex',['exec','hello']],['opencode',['run','hello']]])assert.deepEqual(planNativeClientLaunch(client,{client_args:args},null,true).arguments,args);
 assert.deepEqual(planNativeClientLaunch('claude',{client_args:['--model=chosen','hello']},'ignored',true).arguments,['--print','--model=chosen','hello']);assert.equal(forwardedClientModel(['--model=chosen','-m','chosen']),'chosen');assert.equal(forwardedClientModel(['-memory'] ),null);
 for(const args of [['--model'],['--model='],['-m','one','--model=two']])assert.throws(()=>forwardedClientModel(args),/model/);assert.throws(()=>preflightNativeClientLaunch('claude',{model:'one',client_args:['--model=two']}),/conflicts/);
});
test('flag-only nonterminal sessions avoid consuming a flag as an absent prompt',limits,()=>{
 for(const client of ['gemini','qwen','grok','agent']){const result=planNativeClientLaunch(client,{client_args:['--verbose']},null,false);assert.deepEqual(result.arguments,['--verbose']);assert.equal(result.one_shot,true);assert.match(result.note,/none was given/);}
 assert.deepEqual(planNativeClientLaunch('claude',{client_args:['--resume','session']},null,false).arguments,['--print','--resume','session']);assert.equal(planNativeClientLaunch('claude',{interactive:true,client_args:['hello']},null,false).one_shot,false);assert.equal(planNativeClientLaunch('claude',{non_interactive:true,client_args:[]},null,true).one_shot,true);assert.throws(()=>planNativeClientLaunch('claude',{interactive:true,non_interactive:true}),/conflict/);
});
test('Claude control-plane requests and Codex cloud commands refuse across supported root-option spellings',limits,async()=>{
 for(const args of [['remote-control'],['--','ultrareview'],['--cloud=true'],['--environment','cloud-env'],['--rc']])assert.match(unsupportedClientNativeCommand('claude',args),/no Router token was minted/);
 for(const args of [['cloud'],['--search','cloud-tasks'],['-c','key=value','cloud'],['--model=x','cloud'],['-mselected','cloud'],['--','cloud']])assert.match(unsupportedClientNativeCommand('codex',args),/Codex Cloud/);
 assert.equal(unsupportedClientNativeCommand('codex',['--unknown','value','cloud']),null);assert.equal(unsupportedClientNativeCommand('codex',['--model']),null);
 await assert.rejects(executeNativeConfigure({name:'with',options:{client:'codex',client_args:['cloud']}}),/Codex Cloud/);
});
test('actual operation adapter refuses blocked native control planes before constructing the local core',limits,async()=>{
 let reads=0;const core={get config(){reads++;throw Error('core must remain unopened');}},router=createNativeRouter({core}),result=await router.execute('with',{client:'claude',clientArgs:['--cloud']});assert.notEqual(result.exitCode??result.exit_code,0);assert.match(JSON.stringify(result),/no Router token was minted/);assert.equal(reads,0);
});
test('model requirements and bounded Unicode argv are detached input data without shell interpretation',limits,()=>{
 for(const client of ['opencode','qwen','agent'])assert.equal(nativeClientRequiresModel(client),true);for(const client of ['claude','codex','gemini','grok','cursor-agent'])assert.equal(nativeClientRequiresModel(client),false);
 const args=['$(must-remain-literal)','🦀'],result=planNativeClientLaunch('claude',{client_args:args},null,true);args[0]='changed';assert.deepEqual(result.arguments,['--print','$(must-remain-literal)','🦀']);for(const args of [['bad\0arg'],Array(10001).fill('x'),['x'.repeat(2097153)]])assert.throws(()=>planNativeClientLaunch('claude',{client_args:args}),/bounded/);
});
