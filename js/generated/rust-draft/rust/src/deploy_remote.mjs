// Generated draft from rust/src/deploy_remote.rs; sha256=24df45bd91c16e3bd1b220793890ba413b68a18b7ef7be87be71d4d9cefa1826
// Carried constructs are data, never runtime parity evidence.
function rp_6465706c6f795f72656d6f74652e4147454e545f4c454153455f45584954() {
  return 73n;
}

function rp_6465706c6f795f72656d6f74652e5452414e53504f52545f45584954() {
  return 10n;
}

function rp_6465706c6f795f72656d6f74652e4c454153455f45584954() {
  return 11n;
}

function ml_make_RemoteMode_Deploy() {
  return Object.freeze({ $: 'Deploy' });
}

function ml_make_RemoteMode_Status() {
  return Object.freeze({ $: 'Status' });
}

function ml_make_RemoteMode_Down() {
  return Object.freeze({ $: 'Down' });
}

const std = {
  io: {

  },
  ffi: {

  },
  env: {

  },
  time: {

  },
  num: {

  },
};

const router_core_base64 = {

};

const serde_json = {
  error: {

  },
};

function rp_6465706c6f795f72656d6f74652e7368656c6c5f71756f7465(value) {
  if (!(typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value))) throw new TypeError('argument outside supported Rust value domain');
  return (() => {
    const ml_fmt_4 = (() => {
      const ml_text_1 = value;
      const ml_text_2 = "'";
      const ml_text_3 = "'\"'\"'";
      return (ml_text_2.length===0?(ml_text_1.length===0?ml_text_3:ml_text_3+Array.from(ml_text_1).join(ml_text_3)+ml_text_3):ml_text_1.split(ml_text_2).join(ml_text_3));
    })();
    return (("'" + ml_fmt_4) + "'");
  })();
}

export const translated = { ["AGENT_LEASE_EXIT"]: rp_6465706c6f795f72656d6f74652e4147454e545f4c454153455f45584954(), ["TRANSPORT_EXIT"]: rp_6465706c6f795f72656d6f74652e5452414e53504f52545f45584954(), ["LEASE_EXIT"]: rp_6465706c6f795f72656d6f74652e4c454153455f45584954(), ["RemoteMode"]: Object.freeze({ ["Deploy"]: ml_make_RemoteMode_Deploy, ["Status"]: ml_make_RemoteMode_Status, ["Down"]: ml_make_RemoteMode_Down }), ["shell_quote"]: rp_6465706c6f795f72656d6f74652e7368656c6c5f71756f7465 };
export const provenance = {"sourcePath":"rust/src/deploy_remote.rs","sourceSha256":"24df45bd91c16e3bd1b220793890ba413b68a18b7ef7be87be71d4d9cefa1826","executable":5,"executableFunctions":1,"executableConstants":3,"executableTypes":1,"executableConstructors":3,"carried":26,"preserved":32,"runtimeParity":false};
