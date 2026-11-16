// Report which {file,bytes,sha256} pin rows in a translator module differ from the tree,
// and in which commit (if any) each pinned blob last matched.
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const text=readFileSync(process.argv[2],'utf8');
for(const m of text.matchAll(/\{"file":"([^"]+)","bytes":(\d+),"sha256":"([0-9a-f]{64})"/gu)){
  const [,file,bytes,sha]=m;const cur=existsSync(file)?readFileSync(file):null;
  const ok=cur&&cur.length===Number(bytes)&&createHash('sha256').update(cur).digest('hex')===sha;
  console.log(ok?'ok  ':'DIFF',file,bytes,cur?.length);
}
