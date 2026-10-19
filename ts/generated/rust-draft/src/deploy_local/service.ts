
// Generated draft from src/deploy_local/service.rs; sha256=11acbe449d5b18fec6e4935bdbcb8414a15fa63eb1a3be6815d59218f2ab007d
// Carried constructs are data, never runtime parity evidence.
function rp_6465706c6f795f6c6f63616c2e736572766963652e4d414e414745525f454e56(): string {
  return "LINK_ASSISTANT_ROUTER_SERVICE_MANAGER";
}

function rp_6465706c6f795f6c6f63616c2e736572766963652e5245434f5244(): string {
  return "service.json";
}

function rp_6465706c6f795f6c6f63616c2e736572766963652e534543524554(): string {
  return "token-secret";
}

function rp_6465706c6f795f6c6f63616c2e736572766963652e786d6c(value: string): string {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  const ml_text_118 = (() => {
    const ml_text_115 = (() => {
      const ml_text_112 = (() => {
        const ml_text_109 = value;
        const ml_text_110 = "&";
        const ml_text_111 = "&amp;";
        return (ml_text_110.length===0?(ml_text_109.length===0?ml_text_111:ml_text_111+Array.from(ml_text_109).join(ml_text_111)+ml_text_111):ml_text_109.split(ml_text_110).join(ml_text_111));
      })();
      const ml_text_113 = "<";
      const ml_text_114 = "&lt;";
      return (ml_text_113.length===0?(ml_text_112.length===0?ml_text_114:ml_text_114+Array.from(ml_text_112).join(ml_text_114)+ml_text_114):ml_text_112.split(ml_text_113).join(ml_text_114));
    })();
    const ml_text_116 = ">";
    const ml_text_117 = "&gt;";
    return (ml_text_116.length===0?(ml_text_115.length===0?ml_text_117:ml_text_117+Array.from(ml_text_115).join(ml_text_117)+ml_text_117):ml_text_115.split(ml_text_116).join(ml_text_117));
  })();
  const ml_text_119 = "\"";
  const ml_text_120 = "&quot;";
  return (ml_text_119.length===0?(ml_text_118.length===0?ml_text_120:ml_text_120+Array.from(ml_text_118).join(ml_text_120)+ml_text_120):ml_text_118.split(ml_text_119).join(ml_text_120));
}

export const translated: { "MANAGER_ENV": string; "RECORD": string; "SECRET": string; "xml": (value: string) => string } = { ["MANAGER_ENV"]: rp_6465706c6f795f6c6f63616c2e736572766963652e4d414e414745525f454e56(), ["RECORD"]: rp_6465706c6f795f6c6f63616c2e736572766963652e5245434f5244(), ["SECRET"]: rp_6465706c6f795f6c6f63616c2e736572766963652e534543524554(), ["xml"]: rp_6465706c6f795f6c6f63616c2e736572766963652e786d6c };
export const provenance = {"sourcePath":"src/deploy_local/service.rs","sourceSha256":"11acbe449d5b18fec6e4935bdbcb8414a15fa63eb1a3be6815d59218f2ab007d","executable":4,"executableFunctions":1,"executableConstants":3,"executableTypes":0,"executableConstructors":0,"carried":25,"preserved":30,"runtimeParity":false};
