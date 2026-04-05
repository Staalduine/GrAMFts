use petgraph::stable_graph::{StableGraph, NodeIndex};
use petgraph::Undirected;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NodeData {
    pub id: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EdgeData {
    pub from: String,
    pub to: String,
}

pub type Graph = StableGraph<NodeData, EdgeData, Undirected>;

#[derive(Deserialize, Debug)]
struct GeoJson {
    #[serde(rename = "type")]
    type_: String,
    features: Vec<Feature>,
}

#[derive(Deserialize, Debug)]
struct Feature {
    #[serde(rename = "type")]
    type_: String,
    geometry: Geometry,
    properties: Option<Properties>,
}

#[derive(Deserialize, Debug)]
struct Geometry {
    #[serde(rename = "type")]
    type_: String,
    coordinates: serde_json::Value, // Can be array for Point or LineString
}

#[derive(Deserialize, Debug)]
struct Properties {
    id: Option<String>,
    from: Option<String>,
    to: Option<String>,
}

pub fn load_graph_from_geojson(json_str: &str) -> Result<Graph, Box<dyn std::error::Error>> {
    let geojson: GeoJson = serde_json::from_str(json_str)?;
    let mut graph = StableGraph::<NodeData, EdgeData, Undirected>::with_capacity(0, 0);
    let mut node_map: HashMap<String, NodeIndex> = HashMap::new();

    for feature in geojson.features {
        match feature.geometry.type_.as_str() {
            "Point" => {
                if let Some(coords) = feature.geometry.coordinates.as_array() {
                    if coords.len() == 2 {
                        let x = coords[0].as_f64().unwrap_or(0.0);
                        let y = coords[1].as_f64().unwrap_or(0.0);
                        let id = feature.properties.as_ref().and_then(|p| p.id.clone()).unwrap_or_else(|| format!("node_{}", graph.node_count()));
                        let node_data = NodeData { id: id.clone(), x, y };
                        let node_idx = graph.add_node(node_data);
                        node_map.insert(id, node_idx);
                    }
                }
            }
            "LineString" => {
                if let Some(props) = feature.properties {
                    if let (Some(from), Some(to)) = (props.from, props.to) {
                        if let Some(coords) = feature.geometry.coordinates.as_array() {
                            // Assume coords has at least two points, but for edge, we don't need coords if nodes exist
                            let edge_data = EdgeData { from: from.clone(), to: to.clone() };
                            if let (Some(from_idx), Some(to_idx)) = (node_map.get(&from), node_map.get(&to)) {
                                graph.add_edge(*from_idx, *to_idx, edge_data);
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    Ok(graph)
}

pub fn compute_degree_centrality(graph: &Graph) -> HashMap<String, f64> {
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