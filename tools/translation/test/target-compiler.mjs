import {createRequire} from 'node:module';

// Keep standalone-bundle fallback and explicit overrides identical for every
// receiving harness. Repository checks use the lockfile-installed compiler.
export function targetCompiler() {
  let command=process.env.ROUTER_TRANSLATION_TSC,prefix=[],version;
  if(command===undefined){
    try{
      const require=createRequire(new URL('../../../js/package.json',import.meta.url));
      prefix=[require.resolve('typescript/bin/tsc')];
      version=require('typescript/package.json').version;
      command=process.execPath;
    }catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;command='tsc';}
  }
  if(process.env.ROUTER_TRANSLATION_COMPILER_TRACE==='1')process.stderr.write(JSON.stringify({event:'translation-target-compiler',command,prefix,version:version??null})+'\n');
  return {command,prefix};
}
