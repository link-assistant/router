import {execFileSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';

// Fixed local Git operations only; inherited repository redirection must not
// move an admitted source write to another worktree. No hooks or Rust tools.
export function serializationWriterGit(root,args,input){
 const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.toUpperCase().startsWith('GIT_')));
 const options={cwd:root,env,encoding:'utf8'};
 const prefix=['--no-optional-locks','-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','gc.auto=0','-c','maintenance.auto=false'];
 const top=execFileSync('git',[...prefix,'rev-parse','--show-toplevel'],options).trim();
 if(realpathSync(resolve(top))!==root)throw new TypeError('Serialization source writer Git root differs from admitted root');
 if(!Array.isArray(args)||!(args.length===3&&args[0]==='apply'&&args[1]==='--check'&&args[2]==='-'||args.length===2&&args[0]==='apply'&&args[1]==='-'))throw new TypeError('Fixed serialization patch operation required');
 return execFileSync('git',[...prefix,...args],{...options,input});
}
