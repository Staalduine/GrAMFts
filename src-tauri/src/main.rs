// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod graph;

use graph::{load_graph_from_geojson, compute_degree_centrality, Graph, NodeData, EdgeData};
use std::collections::HashMap;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn load_graph(geojson: &str) -> Result<Vec<NodeData>, String> {
    match load_graph_from_geojson(geojson) {
        Ok(g) => {
            let nodes: Vec<NodeData> = g.node_weights().cloned().collect();
            Ok(nodes)
        }
        Err(e) => Err(format!("Failed to load graph: {}", e)),
    }
}

#[tauri::command]
fn compute_centrality(geojson: &str) -> Result<HashMap<String, f64>, String> {
    match load_graph_from_geojson(geojson) {
        Ok(g) => {
            let centrality = compute_degree_centrality(&g);
            Ok(centrality)
        }
        Err(e) => Err(format!("Failed to compute centrality: {}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, load_graph, compute_centrality])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}