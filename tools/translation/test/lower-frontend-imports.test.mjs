import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
for(const [file,names]of [['data',['DataRustParser','DataChecker']],['text',['TextRustParser','TextChecker']],['host-contracts',['HostRustParser','HostChecker']]])test('fresh original '+file+' entry initializes its real parser and checker',{timeout:20000},()=>{
  const url=new URL('../extensions/'+file+'.mjs',import.meta.url).href;
  const program='import('+JSON.stringify(url)+').then(module=>{const names='+JSON.stringify(names)+';if(names.some(name=>typeof module[name]!=="function"))throw Error("missing original classes");process.stdout.write(JSON.stringify({url:'+JSON.stringify(url)+',names,version:process.version}));}).catch(error=>{console.error(error.stack);process.exitCode=1;});';
  const stdout=execFileSync(process.execPath,['-e',program],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
  assert.deepEqual(JSON.parse(stdout).names,names);
  if(process.env.ROUTER_FRONTEND_IMPORT_VECTORS){mkdirSync(process.env.ROUTER_FRONTEND_IMPORT_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_FRONTEND_IMPORT_VECTORS+'/'+file+'.json',JSON.stringify({program,stdout}));}
});
