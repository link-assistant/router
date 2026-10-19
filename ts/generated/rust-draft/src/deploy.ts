type MLData_72705f353236663735373436353732346637303734363936663665356633363566373337343732363936653637 = Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
type MLData_72705f37333734363432653734363936643635326534343735373236313734363936663665 = Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>;
// Generated draft from src/deploy.rs; sha256=0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a
// Carried constructs are data, never runtime parity evidence.
import { std_time_duration_from_secs as ml_host_std_time_duration_from_secs } from "../runtime/time-runtime.mjs";

import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from "../runtime/string-iterator-runtime.mjs";

function ml_router_unexpected(value: any): never {
  throw new TypeError(`unexpected constructor ${value.$}`);
}

function rp_6465706c6f792e434f4e5441494e4552(): string {
  return "router-deploy";
}

function rp_6465706c6f792e52454c4159(): string {
  return "router-deploy-relay";
}

function rp_6465706c6f792e4e4554574f524b(): string {
  return "router-deploy-network";
}

function rp_6465706c6f792e4241434b454e445f505245464958(): string {
  return "router-deploy-backend-";
}

function rp_6465706c6f792e4c4142454c5f4b4559(): string {
  return "com.link-assistant.router.deploy";
}

function rp_6465706c6f792e4c4142454c(): string {
  return "com.link-assistant.router.deploy=1";
}

function rp_6465706c6f792e44454641554c545f504f5254(): bigint {
  return 8080n;
}

function rp_6465706c6f792e4845414c54485f54494d454f5554(): Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }> {
  return ml_host_std_time_duration_from_secs(60n);
}

function rp_6465706c6f792e4445504c4f595f544f4b454e5f4c4142454c(): string {
  return "deploy";
}

function rp_6465706c6f792e66697273745f6c696e65(text: string): string {
  if (!(typeof text === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(text))) throw new TypeError('argument outside supported Rust value domain');
  return ((() => {
    const ml_standard_body_1 = ml_str_next(ml_str_lines(text)) as Readonly<{ readonly "$": "None" }> | Readonly<{ readonly "$": "Some"; readonly "field0": string }>;
    const ml_standard_body_2 = "";
    switch (ml_standard_body_1.$) {
      case "None": {
        return ml_standard_body_2;
      }
      case "Some": {
        const x = ml_standard_body_1.field0;
        return x;
      }
      default: {
        return ml_router_unexpected(ml_standard_body_1);
      }
    }
  })()).replace(/^[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu, '');
}

export const translated: { "CONTAINER": string; "RELAY": string; "NETWORK": string; "BACKEND_PREFIX": string; "LABEL_KEY": string; "LABEL": string; "DEFAULT_PORT": bigint; "HEALTH_TIMEOUT": Readonly<{ readonly "$": "Duration"; readonly "secs": bigint; readonly "nanos": bigint }>; "DEPLOY_TOKEN_LABEL": string; "first_line": (text: string) => string } = { ["CONTAINER"]: rp_6465706c6f792e434f4e5441494e4552(), ["RELAY"]: rp_6465706c6f792e52454c4159(), ["NETWORK"]: rp_6465706c6f792e4e4554574f524b(), ["BACKEND_PREFIX"]: rp_6465706c6f792e4241434b454e445f505245464958(), ["LABEL_KEY"]: rp_6465706c6f792e4c4142454c5f4b4559(), ["LABEL"]: rp_6465706c6f792e4c4142454c(), ["DEFAULT_PORT"]: rp_6465706c6f792e44454641554c545f504f5254(), ["HEALTH_TIMEOUT"]: rp_6465706c6f792e4845414c54485f54494d454f5554(), ["DEPLOY_TOKEN_LABEL"]: rp_6465706c6f792e4445504c4f595f544f4b454e5f4c4142454c(), ["first_line"]: rp_6465706c6f792e66697273745f6c696e65 };
export const provenance = {"sourcePath":"src/deploy.rs","sourceSha256":"0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a","executable":10,"executableFunctions":1,"executableConstants":9,"executableTypes":0,"executableConstructors":0,"carried":26,"preserved":37,"runtimeParity":false};
