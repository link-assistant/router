//! Independent all-exit helper cleanup SOURCE. JavaScript-gated Rust CI only.
use link_assistant_router::translation_http_transport_core as transport;

fn release(client: &mut transport::Client) { transport::client_dispose(client); }

fn duplicated() -> Result<transport::Client,String> {
    let mut client = transport::client_new(0,0,0,"")?;
    let returned = match transport::client_clone(&client) {
        Ok(value) => value,
        Err(error) => {release(&mut client); return Err(error);}
    };
    release(&mut client);
    Ok(returned)
}

#[test]
fn nested_release_helpers_close_every_original_owned_client() {
    for _ in 0..40 {
        let mut client = duplicated().unwrap();
        release(&mut client);
    }
}
