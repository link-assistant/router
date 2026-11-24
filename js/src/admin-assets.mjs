import {readFile,lstat} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const security={'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'x-frame-options':'DENY','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
export function hardenAdmin(response) {for(const [name,value] of Object.entries(security))response.headers.set(name,value);return response;}
export async function serveAdminAsset(request,{directory=fileURLToPath(new URL('./assets/admin/',import.meta.url))}={}) {
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/'))return new Response('not found',{status:404});
  const root=resolve(directory),relative=path.replace(/^\/+|\/+$/g,'') || 'index.html';
  let target=resolve(root,relative);if(target!==root && !target.startsWith(root+'/'))return new Response('not found',{status:404});
  const load=async file=>{const stat=await lstat(file);if(!stat.isFile() || stat.isSymbolicLink() || stat.size>4*1024*1024)throw new Error('invalid asset');return readFile(file);};
  let bytes;
  try{bytes=await load(target);}catch{target=resolve(root,'index.html');try{bytes=await load(target);}catch{return new Response('admin UI bundle is missing from this build',{status:500});}}
  return new Response(bytes,{headers:{'content-type':mime[extname(target)] ?? 'application/octet-stream','cache-control':'no-cache, must-revalidate'}});
}
