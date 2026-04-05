//! Time-series data management commands.
//!
//! Handles storage and retrieval of time-series data associated with graph elements.
//! Data is stored as ID -> Time -> Value mappings for efficient temporal queries.

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use std::sync::Mutex;

// Global time-series storage (in-memory for now)
// In production, this could be backed by a database or file system
lazy_static::lazy_static! {
    static ref TIMESERIES_STORE: Mutex<HashMap<String, BTreeMap<String, serde_json::Value>>> = Mutex::new(HashMap::new());
}

#[derive(Serialize, Deserialize, Debug, Clone, specta::Type)]
pub struct TimeSeriesPoint {
    pub timestamp: String,
    pub value: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug, Clone, specta::Type)]
pub struct TimeSeriesData {
    pub id: String,
    pub points: Vec<TimeSeriesPoint>,
}

/// Load time-series data for a specific ID
#[tauri::command]
#[specta::specta]
pub fn load_timeseries(id: &str) -> Result<Vec<TimeSeriesPoint>, String> {
    let store = TIMESERIES_STORE.lock().map_err(|e| format!("Lock error: {}", e))?;

    let points = store
        .get(id)
        .map(|data| {
            data.iter()
                .map(|(timestamp, value)| TimeSeriesPoint {
                    timestamp: timestamp.clone(),
                    value: value.clone(),
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(points)
}

/// Save time-series data for a specific ID (replaces existing data)
#[tauri::command]
#[specta::specta]
pub fn save_timeseries(id: &str, points: Vec<TimeSeriesPoint>) -> Result<(), String> {
    let mut store = TIMESERIES_STORE.lock().map_err(|e| format!("Lock error: {}", e))?;

    let mut data: BTreeMap<String, serde_json::Value> = BTreeMap::new();
    for point in points {
        data.insert(point.timestamp, point.value);
    }

    store.insert(id.to_string(), data);
    Ok(())
}

/// Add a single time-series data point
#[tauri::command]
#[specta::specta]
pub fn add_timeseries_point(id: &str, timestamp: String, value: serde_json::Value) -> Result<(), String> {
    let mut store = TIMESERIES_STORE.lock().map_err(|e| format!("Lock error: {}", e))?;

    store
        .entry(id.to_string())
        .or_insert_with(BTreeMap::new)
        .insert(timestamp, value);

    Ok(())
}

/// Query time-series data for an ID within a time range
#[tauri::command]
#[specta::specta]
pub fn query_timeseries_range(
    id: &str,
    start_time: Option<String>,
    end_time: Option<String>,
) -> Result<Vec<TimeSeriesPoint>, String> {
    let store = TIMESERIES_STORE.lock().map_err(|e| format!("Lock error: {}", e))?;

    let points = if let Some(data) = store.get(id) {
        let mut result = Vec::new();

        for (timestamp, value) in data {
            let in_range = match (&start_time, &end_time) {
                (Some(start), Some(end)) => timestamp >= start && timestamp <= end,
                (Some(start), None) => timestamp >= start,
                (None, Some(end)) => timestamp <= end,
                (None, None) => true,
            };

            if in_range {
                result.push(TimeSeriesPoint {
                    timestamp: timestamp.clone(),
                    value: value.clone(),
                });
            }
        }

        result
    } else {
        Vec::new()
    };

    Ok(points)
}

/// Get all time-series IDs currently stored
#[tauri::command]
#[specta::specta]
pub fn get_timeseries_ids() -> Result<Vec<String>, String> {
    let store = TIMESERIES_STORE.lock().map_err(|e| format!("Lock error: {}", e))?;
    let ids: Vec<String> = store.keys().cloned().collect();
    Ok(ids)
}

/// Clear all time-series data
#[tauri::command]
#[specta::specta]
pub fn clear_timeseries() -> Result<(), String> {
    let mut store = TIMESERIES_STORE.lock().map_err(|e| format!("Lock error: {}", e))?;
    store.clear();
    Ok(())
}