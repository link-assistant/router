// Native-library network policy internals, matching upstream_guard.rs.
// These ordinary functions grant no compiler source or operation authority.
import {isIP} from 'node:net';
import {router_text_trim as trim} from './text-runtime.mjs';
const asciiLower=value=>value.replace(/[A-Z]/gu,value=>value.toLowerCase());
export function parseHttpNetworkPolicy(value){
 const policy={loopback:false,private:false,linkLocal:false,all:false};
 for(const input of value.split(',')){const word=asciiLower(trim(input));if(['all','1','true','yes'].includes(word))Object.assign(policy,{loopback:true,private:true,linkLocal:true,all:true});else if(['loopback','localhost'].includes(word))policy.loopback=true;else if(word==='private')policy.private=true;else if(['link-local','link_local'].includes(word))policy.linkLocal=true;}
 return Object.freeze(policy);
}
function ipv4(parts){const [a,b,c,d]=parts;if(a===127)return 'loopback';if(a===169&&b===254)return 'link-local';if(a===10||a===172&&b>=16&&b<32||a===192&&b===168||a===100&&b>=64&&b<128)return 'private';if(a===0||a>=224&&a<=239||a===255&&b===255&&c===255&&d===255)return 'non-unicast';return null;}
function ipv6(address){
 let text=address.toLowerCase();if(text.includes('.')){const at=text.lastIndexOf(':'),tail=text.slice(at+1).split('.').map(Number);text=text.slice(0,at+1)+((tail[0]<<8)|tail[1]).toString(16)+':'+((tail[2]<<8)|tail[3]).toString(16);}
 const halves=text.split('::'),left=halves[0]?halves[0].split(':').map(value=>parseInt(value,16)):[],right=halves[1]?halves[1].split(':').map(value=>parseInt(value,16)):[];return halves.length===1?left:[...left,...Array(8-left.length-right.length).fill(0),...right];
}
export function classifyHttpAddress(address){
 const kind=isIP(address);if(kind===4)return ipv4(address.split('.').map(Number));if(kind!==6)throw new TypeError('Actual IP address required');const words=ipv6(address),tail=[words[6]>>8,words[6]&255,words[7]>>8,words[7]&255],firstZero=words.slice(0,6).every(value=>value===0),mapped=words.slice(0,5).every(value=>value===0)&&words[5]===65535,nat64=words[0]===0x64&&words[1]===0xff9b&&words.slice(2,6).every(value=>value===0),compatible=firstZero&&(words[6]!==0||words[7]>1);
 if(mapped||nat64||compatible)return ipv4(tail);if(words.slice(0,7).every(value=>value===0)&&words[7]===1)return 'loopback';if((words[0]&0xffc0)===0xfe80)return 'link-local';if((words[0]&0xfe00)===0xfc00)return 'private';if(words.every(value=>value===0)||(words[0]&0xff00)===0xff00)return 'non-unicast';return null;
}
export function httpAddressAllowed(policy,address){const kind=classifyHttpAddress(address);return kind===null||policy.all||kind==='loopback'&&policy.loopback||kind==='private'&&policy.private||kind==='link-local'&&policy.linkLocal;}
export function httpHostAllowed(policy,hostname){
 const host=asciiLower(hostname.replace(/^\[|\]$/gu,'').replace(/\.+$/u,''));if(isIP(host))return httpAddressAllowed(policy,host);if((host==='localhost'||host.endsWith('.localhost'))&&!policy.all&&!policy.loopback)return false;if(['metadata.google.internal','metadata','instance-data'].includes(host)&&!policy.all&&!policy.linkLocal)return false;return host.length>0;
}
