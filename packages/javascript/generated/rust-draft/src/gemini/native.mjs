// Generated draft from src/gemini/native.rs; sha256=4c810825b0a056b3a21ac2c81a50e48c9adbeb29fc19ee00d481ad72bc41cef2
// Carried constructs are data, never runtime parity evidence.
import { assertImmutableCopy as ml_pattern_immutable } from "../../runtime/copy-runtime.mjs";

const ml_router_try_return = Symbol('checked Rust early return');
function ml_router_try(value, option) {
  if (option) {
    if (value.$ === 'Some') return value.field0;
    if (value.$ === 'None') throw { [ml_router_try_return]: true, value: Object.freeze({ $: 'None' }) };
  } else {
    if (value.$ === 'Ok') return value.field0;
    if (value.$ === 'Err') throw { [ml_router_try_return]: true, value: Object.freeze({ $: 'Err', field0: value.field0 }) };
  }
  throw new TypeError('checked Rust ? operand does not match its standard Option/Result mode');
}
function ml_router_propagated(error) { return error && error[ml_router_try_return] === true; }

function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }

function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }

function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }

function rp_67656d696e692e6e61746976652e70617273655f6e61746976655f746172676574(path) {
try {
  if (!(typeof path === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(path))) throw new TypeError('argument outside supported Rust value domain');
  const ml_pattern_3 = ml_router_try((() => {
    const ml_text_1 = path;
    const ml_text_2 = ":";
    return (()=>{const index=ml_text_1.lastIndexOf(ml_text_2);return index<0?Object.freeze({ $: 'None' }):Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Tuple', field0: ml_text_1.slice(0,index), field1: ml_text_1.slice(index+ml_text_2.length) }) });})();
  })(), true);
  ml_pattern_immutable(ml_pattern_3);
  const resource = (ml_pattern_3)["field0"];
  const action = (ml_pattern_3)["field1"];
  let streaming;
  ml_control_exit_1: {
    if ((action === "generateContent")) {
      streaming = false;
      break ml_control_exit_1;
    } else {
      if ((action === "streamGenerateContent")) {
        streaming = true;
        break ml_control_exit_1;
      } else {
        return Object.freeze({ $: 'None' });
      }
    }
  }
  const model_2 = (() => {
    const ml_text_104 = (() => {
      const ml_text_102 = ml_host_option_map_or((() => {
        const ml_text_99 = resource;
        const ml_text_100 = "/models/";
        return (()=>{const index=ml_text_99.lastIndexOf(ml_text_100);return index<0?Object.freeze({ $: 'None' }):Object.freeze({ $: 'Some', field0: Object.freeze({ $: 'Tuple', field0: ml_text_99.slice(0,index), field1: ml_text_99.slice(index+ml_text_100.length) }) });})();
      })(), resource, (ml_pattern_callback_101) => { ml_pattern_immutable(ml_pattern_callback_101);
      const model = (ml_pattern_callback_101)["field1"];
      return model; });
      const ml_text_103 = "models/";
      return (()=>{let text=ml_text_102;if(ml_text_103.length===0)return text;while(text.startsWith(ml_text_103))text=text.slice(ml_text_103.length);return text;})();
    })();
    const ml_text_105 = "/";
    return (()=>{let text=ml_text_104;if(ml_text_105.length===0)return text;while(text.startsWith(ml_text_105))text=text.slice(ml_text_105.length);while(text.endsWith(ml_text_105))text=text.slice(0,text.length-ml_text_105.length);return text;})();
  })();
  return ml_host_bool_then(!(model_2.length === 0), () => { return Object.freeze({ $: 'Tuple', field0: model_2, field1: streaming }); });

} catch (ml_router_error) { if (ml_router_propagated(ml_router_error)) return ml_router_error.value; throw ml_router_error; }
}

export const translated = { ["parse_native_target"]: rp_67656d696e692e6e61746976652e70617273655f6e61746976655f746172676574 };
export const provenance = {"sourcePath":"src/gemini/native.rs","sourceSha256":"4c810825b0a056b3a21ac2c81a50e48c9adbeb29fc19ee00d481ad72bc41cef2","executable":1,"executableFunctions":1,"executableConstants":0,"executableTypes":0,"executableConstructors":0,"carried":27,"preserved":29,"runtimeParity":false};
