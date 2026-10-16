// Two gzip members retain exactly the old JSON-plus-newline bytes while
// avoiding a second large concatenated JSON string. This grants no authority.
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
export function writeJsonGzip(path,value,replacer){
  // Empty-string concatenation preserves the old coercion even if a caller's
  // JSON hook returns undefined or another primitive; it adds no newline copy.
  const encoded=JSON.stringify(value,replacer)+'';
  const payload=gzipSync(encoded,{mtime:0}),newline=gzipSync('\n',{mtime:0});
  writeFileSync(path,Buffer.concat([payload,newline]));
}
