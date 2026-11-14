// Finite Bun experiment: canonical private issuers, complete project source.
// This is a candidate source observation, not a source producer or parity check.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {plugin} from 'bun';
const project=new URL('../../tools/translation/project.mjs',import.meta.url);
// Replay this failed draft from its frozen complete input; production evolved
// after the experiment and must never be silently substituted for that input.
const input=new URL('../../ci-logs/issue-784-restart-2/project-facade-after-attempt-1.mjs',import.meta.url);
let source=readFileSync(input,'utf8');
const inputSha256=createHash('sha256').update(source).digest('hex');
assert.equal(inputSha256,'a15004541bc8f84e9f1ebc247f4e74bc30c51fc04dbbc57b983243a1d6afc407');
function replace(before,after){assert.equal(source.split(before).length,2);source=source.replace(before,()=>after);}
replace('function createProjectLowerer(target,entry,name){return function','const createProjectLowerer=(()=>function(target,entry,name){return function');
replace('  };}\nfunction createProjectCheckedSource','  };})();\nfunction createProjectCheckedSource');
replace('function createProjectCheckedSource(checked,graph,entry){const checkedSource=','const createProjectCheckedSource=(()=>function(checked,graph,entry){const facade={checkedSource:');
replace('  };return checkedSource;}','  }};return facade.checkedSource;})();');
plugin({name:'complete-project-engine-layout',setup(builder){builder.onLoad({filter:/\/tools\/translation\/project\.mjs$/},args=>{assert.equal(args.path,project.pathname);return {contents:source,loader:'js'};});}});
const {translateProject}=await import(project.href);
const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=> 'pub fn root(x:u8)->u8{x+1}'});
const facade=result.executableDeclarations.find(row=>row.name==='root');
const observe=fn=>({name:fn.name,length:fn.length,prototype:Object.hasOwn(fn,'prototype'),source:Function.prototype.toString.call(fn)});
console.log(JSON.stringify({inputSha256,candidateSha256:createHash('sha256').update(source).digest('hex'),lower:observe(facade.lower),checkedSource:observe(facade.checkedSource)}));
