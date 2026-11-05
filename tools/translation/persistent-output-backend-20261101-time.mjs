// Source-defined UTC/RFC3339 and string-only serde-json record rendering.
// No Date millisecond truncation, locale formatter or JSON numeric coercion.
import {scalarText,launcherRecordMessage} from './persistent-output-backend-20261101-text.mjs';
const quote=JSON.stringify;
const floor=(value,divisor)=>{const result=value/divisor;return value%divisor<0n?result-1n:result;};
export function chronoUtcRfc3339(seconds,nanoseconds){
 if(typeof seconds!=='bigint'||seconds<-(1n<<63n)||seconds>(1n<<63n)-1n||!Number.isInteger(nanoseconds)||nanoseconds<0||nanoseconds>=1000000000)throw new TypeError('Actual non-leap system-time seconds/nanoseconds required');
 const days=floor(seconds,86400n),within=seconds-days*86400n,z=days+719468n,era=floor(z,146097n),day=z-era*146097n,yearOfEra=(day-day/1460n+day/36524n-day/146096n)/365n;
 let year=yearOfEra+era*400n;const dayOfYear=day-(365n*yearOfEra+yearOfEra/4n-yearOfEra/100n),monthPrime=(5n*dayOfYear+2n)/153n,dayOfMonth=dayOfYear-(153n*monthPrime+2n)/5n+1n,month=monthPrime+(monthPrime<10n?3n:-9n);if(month<=2n)year++;
 if(year<0n||year>9999n)throw new RangeError('RFC3339 ordinary four-digit UTC year domain');
 const pad=(value,width)=>String(value).padStart(width,'0'),hour=within/3600n,minute=within%3600n/60n,second=within%60n;
 const fraction=nanoseconds===0?'':'.'+(nanoseconds%1000000===0?pad(nanoseconds/1000000,3):nanoseconds%1000===0?pad(nanoseconds/1000,6):pad(nanoseconds,9));
 return pad(year,4)+'-'+pad(month,2)+'-'+pad(dayOfMonth,2)+'T'+pad(hour,2)+':'+pad(minute,2)+':'+pad(second,2)+fraction+'+00:00';
}
export function launcherJsonRecord(event,launchId,message,secrets,instant){return launcherJsonRecordFromRendered(event,launchId,launcherRecordMessage(message,secrets),instant);}

export function nativeLogRecord(level,message,instant){scalarText(message);if(level!=='WARN'&&level!=='INFO')throw new TypeError('Actual process diagnostic/event level required');return chronoUtcRfc3339(instant.seconds,instant.nanoseconds)+' '+level+' '+message;}

export function launcherJsonRecordFromRendered(event,launchId,rendered,instant){scalarText(event);scalarText(launchId);scalarText(rendered);if(Buffer.byteLength(event)>256||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(launchId))throw new TypeError('qualified event and actual UUIDv4 required');return '{"event":'+quote(event)+',"launch_id":'+quote(launchId)+',"message":'+quote(rendered)+',"timestamp":'+quote(chronoUtcRfc3339(instant.seconds,instant.nanoseconds))+'}\n';}
export function nativeExitCodeDebug(value){if(!Number.isInteger(value)||value<0||value>255)throw new TypeError('actual ExitCode::from(u8) required');if(process.platform==='win32')return 'ExitCode(ExitCode('+value+'))';if(['linux','darwin','freebsd','openbsd','netbsd','aix','sunos','android'].includes(process.platform))return 'ExitCode(unix_exit_status('+value+'))';throw new TypeError('unqualified Rust1.89 ExitCode Debug target');}
