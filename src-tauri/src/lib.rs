use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::PathBuf,
};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
struct RecipePagePayload {
    url: String,
    html: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultSnapshot {
    recipe_files: HashMap<String, String>,
    #[serde(default)]
    recipe_paths: HashMap<String, String>,
    #[serde(default)]
    attachments: HashMap<String, String>,
    taxonomy: Value,
}

fn vault_root(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("cookbook");
    fs::create_dir_all(root.join("recipes")).map_err(|error| error.to_string())?;
    Ok(root)
}

fn read_text_file(path: &PathBuf) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| error.to_string())
}

fn write_text_file(path: &PathBuf, contents: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn load_vault_snapshot(app: AppHandle) -> Result<VaultSnapshot, String> {
    let root = vault_root(&app)?;
    let recipes_dir = root.join("recipes");

    let taxonomy = match fs::read_to_string(root.join("taxonomy.json")) {
        Ok(contents) => serde_json::from_str(&contents).map_err(|error| error.to_string())?,
        Err(_) => Value::Null,
    };

    let attachments = match fs::read_to_string(root.join("attachments.json")) {
        Ok(contents) => serde_json::from_str(&contents).map_err(|error| error.to_string())?,
        Err(_) => HashMap::new(),
    };

    let mut recipe_files = HashMap::new();
    let mut recipe_paths = HashMap::new();

    if recipes_dir.exists() {
        for entry in fs::read_dir(&recipes_dir).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            let path = entry.path();

            if path.extension().and_then(|extension| extension.to_str()) != Some("md") {
                continue;
            }

            let markdown = read_text_file(&path)?;
            let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };

            let Some(frontmatter_line) = markdown
                .lines()
                .find(|line| line.starts_with("id: "))
                .map(|line| line.trim_start_matches("id: ").trim())
            else {
                continue;
            };

            let recipe_id: String =
                serde_json::from_str(frontmatter_line).unwrap_or_else(|_| frontmatter_line.to_string());
            recipe_files.insert(recipe_id.clone(), markdown);
            recipe_paths.insert(recipe_id, format!("recipes/{file_name}"));
        }
    }

    Ok(VaultSnapshot {
        recipe_files,
        recipe_paths,
        attachments,
        taxonomy,
    })
}

#[tauri::command]
fn replace_vault_snapshot(app: AppHandle, snapshot: VaultSnapshot) -> Result<VaultSnapshot, String> {
    let root = vault_root(&app)?;
    let recipes_dir = root.join("recipes");
    let expected_paths: HashSet<String> = snapshot.recipe_paths.values().cloned().collect();

    if recipes_dir.exists() {
        for entry in fs::read_dir(&recipes_dir).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            let path = entry.path();
            if path.extension().and_then(|extension| extension.to_str()) != Some("md") {
                continue;
            }

            let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            let relative = format!("recipes/{file_name}");
            if !expected_paths.contains(&relative) {
                fs::remove_file(path).map_err(|error| error.to_string())?;
            }
        }
    }

    for (recipe_id, markdown) in &snapshot.recipe_files {
        let relative_path = snapshot
            .recipe_paths
            .get(recipe_id)
            .cloned()
            .unwrap_or_else(|| format!("recipes/{recipe_id}.md"));
        write_text_file(&root.join(relative_path), markdown)?;
    }

    write_text_file(
        &root.join("taxonomy.json"),
        &serde_json::to_string_pretty(&snapshot.taxonomy).map_err(|error| error.to_string())?,
    )?;
    write_text_file(
        &root.join("attachments.json"),
        &serde_json::to_string_pretty(&snapshot.attachments).map_err(|error| error.to_string())?,
    )?;

    load_vault_snapshot(app)
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
        .invoke_handler(tauri::generate_handler![
            fetch_recipe_page,
            load_vault_snapshot,
            replace_vault_snapshot
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
