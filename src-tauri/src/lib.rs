use serde::Serialize;

#[derive(Serialize)]
struct RecipePagePayload {
    url: String,
    html: String,
}

#[tauri::command]
async fn fetch_recipe_page(url: String) -> Result<RecipePagePayload, String> {
    let client = reqwest::Client::builder()
        .user_agent("Cookbook/0.1")
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("HTTP {} while importing {}", status, url));
    }

    let final_url = response.url().to_string();
    let html = response.text().await.map_err(|error| error.to_string())?;

    Ok(RecipePagePayload {
        url: final_url,
        html,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![fetch_recipe_page])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
