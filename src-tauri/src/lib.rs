#[cfg_attr(mobile, allow(dead_code))]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Happy Mixer DJ");
}
