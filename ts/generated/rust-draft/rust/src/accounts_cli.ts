
// Generated draft from rust/src/accounts_cli.rs; sha256=96204b1995384c60625031b35a77c516f3f0eaadaf7f364feba7e712156db460
// Carried constructs are data, never runtime parity evidence.
function rp_6163636f756e74735f636c692e44454641554c545f50415553455f524541534f4e(): string {
  return "paused by an operator";
}

function rp_6163636f756e74735f636c692e4c4f43414c5f4e4f5445(): string {
  return "note: recorded in this machine's data directory; a router started from it applies the change at startup. Pass --server <URL> to change a running router.";
}

function rp_6163636f756e74735f636c692e726573756d655f6d657373616765(name: string, was_paused: boolean): string {
  if (!(typeof name === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(name))) throw new TypeError('argument outside supported Rust value domain');
  if (!(typeof was_paused === 'boolean')) throw new TypeError('argument outside supported Rust value domain');
  if (was_paused) {
    return (() => {
    const ml_fmt_1 = name;
    return ("resumed " + ml_fmt_1);
  })();
  } else {
    return (() => {
    const ml_fmt_2 = name;
    return (ml_fmt_2 + " was not paused");
  })();
  }
}

function rp_6163636f756e74735f636c692e686561646572(): string {
  return (() => {
    const ml_fmt_1 = "name";
    const ml_fmt_2 = "healthy";
    const ml_fmt_3 = "credential";
    const ml_fmt_4 = "used";
    const ml_fmt_5 = "limit";
    const ml_fmt_6 = "remaining";
    return ((((((((((((ml_fmt_1+" ".repeat(Math.max(0,16-Array.from(ml_fmt_1).length))) + "  ") + (ml_fmt_2+" ".repeat(Math.max(0,8-Array.from(ml_fmt_2).length)))) + "  ") + (ml_fmt_3+" ".repeat(Math.max(0,12-Array.from(ml_fmt_3).length)))) + "  ") + (ml_fmt_4+" ".repeat(Math.max(0,6-Array.from(ml_fmt_4).length)))) + "  ") + (ml_fmt_5+" ".repeat(Math.max(0,9-Array.from(ml_fmt_5).length)))) + "  ") + (ml_fmt_6+" ".repeat(Math.max(0,9-Array.from(ml_fmt_6).length)))) + "  home");
  })();
}

export const translated: { "DEFAULT_PAUSE_REASON": string; "LOCAL_NOTE": string; "resume_message": (name: string, was_paused: boolean) => string; "header": () => string } = { ["DEFAULT_PAUSE_REASON"]: rp_6163636f756e74735f636c692e44454641554c545f50415553455f524541534f4e(), ["LOCAL_NOTE"]: rp_6163636f756e74735f636c692e4c4f43414c5f4e4f5445(), ["resume_message"]: rp_6163636f756e74735f636c692e726573756d655f6d657373616765, ["header"]: rp_6163636f756e74735f636c692e686561646572 };
export const provenance = {"sourcePath":"rust/src/accounts_cli.rs","sourceSha256":"96204b1995384c60625031b35a77c516f3f0eaadaf7f364feba7e712156db460","executable":4,"executableFunctions":2,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":11,"preserved":16,"runtimeParity":false};
