// Git metadata DATA only; source bodies and semantic checks remain with callers.
// Follow prepare-isolated-project-compiler: select tree entries before sizes.
export function readSelectedGitSizeRecords({run,revision,select,maxPaths,maxFileBytes,maxTotalBytes}){
 const fail=message=>{throw new TypeError('Selected Git size records: '+message);};
 if(typeof run!=='function'||typeof select!=='function'||typeof revision!=='string'||!/^[a-f0-9]{40}$/u.test(revision)||![maxPaths,maxFileBytes,maxTotalBytes].every(value=>Number.isSafeInteger(value)&&value>0))fail('bounded current source census required');
 const listing=run(['ls-tree','-r','-z',revision]).toString('utf8').split('\0').filter(Boolean),rows=[];
 for(const record of listing){
  const tab=record.indexOf('\t'),path=record.slice(tab+1);if(!select(path))continue;
  const fields=record.slice(0,tab).trim().split(/\s+/u);
  if(tab<0||fields.length!==3||!/^\d{6}$/u.test(fields[0])||fields[1]!=='blob'||!/^[a-f0-9]{40}$/u.test(fields[2]))fail('complete selected tree row required');
  rows.push({path,mode:fields[0],blob:fields[2]});if(rows.length>maxPaths)fail('selected source path bound');
 }
 if(!rows.length)return [];
 const sizeText=run(['cat-file','--batch-check'],{input:rows.map(row=>row.blob+'\n').join('')}).toString('utf8');
 if(!sizeText.endsWith('\n'))fail('complete selected size stream required');const sizes=sizeText.slice(0,-1).split('\n');if(sizes.length!==rows.length)fail('complete selected size census required');
 let total=0;return rows.map((row,index)=>{
  const fields=sizes[index].split(' '),bytes=Number(fields[2]);
  if(fields.length!==3||fields[0]!==row.blob||fields[1]!=='blob'||!/^\d+$/u.test(fields[2])||!Number.isSafeInteger(bytes)||bytes<0||bytes>maxFileBytes)fail('complete selected size association required');
  total+=bytes;if(total>maxTotalBytes)fail('selected source total byte bound');
  // Preserve each caller's complete existing four-field row validation.
  return row.mode+' blob '+row.blob+' '+bytes+'\t'+row.path;
 });
}
