//! Graph processing commands.
//!
//! Handles loading and analyzing spatial graphs from GeoJSON.

use petgraph::stable_graph::{NodeIndex, StableGraph};
use petgraph::Undirected;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone, specta::Type)]
pub struct NodeData {
    pub id: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, specta::Type)]
pub struct EdgeData {
    pub source: String,
    pub target: String,
    pub weight: Option<f64>,
    pub width: Option<f64>,
}

pub type Graph = StableGraph<NodeData, EdgeData, Undirected>;

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct GeoJson {
    #[serde(rename = "type")]
    type_: String,
    features: Vec<Feature>,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct Feature {
    #[serde(rename = "type")]
    type_: String,
    geometry: Geometry,
    properties: Option<Properties>,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct Geometry {
    #[serde(rename = "type")]
    type_: String,
    coordinates: serde_json::Value,
}

#[derive(Deserialize, Debug)]
struct Properties {
    id: Option<String>,
    // Support both naming conventions
    from: Option<String>,
    to: Option<String>,
    source: Option<String>,
    target: Option<String>,
    weight: Option<f64>,
    width: Option<f64>,
}

fn load_graph_from_geojson(json_str: &str) -> Result<Graph, String> {
    let geojson: GeoJson =
        serde_json::from_str(json_str).map_err(|e| format!("Failed to parse GeoJSON: {}", e))?;
    let mut graph = StableGraph::<NodeData, EdgeData, Undirected>::with_capacity(0, 0);
    let mut node_map: HashMap<String, NodeIndex> = HashMap::new();

    for feature in geojson.features {
        match feature.geometry.type_.as_str() {
            "Point" => {
                if let Some(coords) = feature.geometry.coordinates.as_array() {
                    if coords.len() == 2 {
                        let x = coords[0].as_f64().unwrap_or(0.0);
                        let y = coords[1].as_f64().unwrap_or(0.0);
                        let id = feature
                            .properties
                            .as_ref()
                            .and_then(|p| p.id.clone())
                            .unwrap_or_else(|| format!("node_{}", graph.node_count()));
                        let node_data = NodeData {
                            id: id.clone(),
                            x,
                            y,
                        };
                        let node_idx = graph.add_node(node_data);
                        node_map.insert(id, node_idx);
                    }
                }
            }
            "LineString" => {
                if let Some(props) = feature.properties {
                    // Support both "from/to" and "source/target" naming conventions
                    let (source, target) = if let (Some(s), Some(t)) =
                        (props.source.as_ref(), props.target.as_ref())
                    {
                        (s.clone(), t.clone())
                    } else if let (Some(f), Some(t)) = (props.from.as_ref(), props.to.as_ref()) {
                        (f.clone(), t.clone())
                    } else {
                        continue;
                    };

                    let edge_data = EdgeData {
                        source: source.clone(),
                        target: target.clone(),
                        weight: props.weight,
                        width: props.width,
                    };
                    if let (Some(from_idx), Some(to_idx)) =
                        (node_map.get(&source), node_map.get(&target))
                    {
                        graph.add_edge(*from_idx, *to_idx, edge_data);
                    }
                }
            }
            _ => {}
        }
    }

    Ok(graph)
}

fn compute_degree_centrality(graph: &Graph) -> HashMap<String, f64> {
    let n = graph.node_count() as f64;
    let mut result = HashMap::new();
    for node_idx in graph.node_indices() {
        if let Some(node) = graph.node_weight(node_idx) {
            let degree = graph.neighbors(node_idx).count() as f64;
            let centrality = if n > 1.0 { degree / (n - 1.0) } else { 0.0 };
            result.insert(node.id.clone(), centrality);
        }
    }
    result
}

/// Load a graph from GeoJSON string and return the nodes.
#[tauri::command]
#[specta::specta]
pub fn load_graph(geojson: &str) -> Result<Vec<NodeData>, String> {
    let graph = load_graph_from_geojson(geojson)?;
    let nodes: Vec<NodeData> = graph.node_weights().cloned().collect();
    Ok(nodes)
}

/// Compute degree centrality for the graph from GeoJSON.
#[tauri::command]
#[specta::specta]
pub fn compute_centrality(geojson: &str) -> Result<HashMap<String, f64>, String> {
    let graph = load_graph_from_geojson(geojson)?;
    let centrality = compute_degree_centrality(&graph);
    Ok(centrality)
}
