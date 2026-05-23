import React, { useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import axios from 'axios';

ModuleRegistry.registerModules([AllCommunityModule]);

const API_BASE = 'http://localhost:8000';

export default function InventoryMigrator() {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const uploadPreview = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setLoading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/upload-preview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setProgress(pct);
        }
      });

      const data = res.data;
      setRows(data.all_rows);
      setWarnings(data.warnings);

      // Generate column definitions for AG Grid
      if (data.all_rows.length > 0) {
        const cols = Object.keys(data.all_rows[0]).map(key => ({
          field: key,
          headerName: key,
          editable: true,
          flex: 1,
          minWidth: 100
        }));
        setColumnDefs(cols);
      }

      setMessage(`Loaded ${data.total_rows} rows`);
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const onCellValueChanged = useCallback((params) => {
    // Cell edit committed - row data automatically updated by AG Grid
    console.log('Cell changed:', params.colDef.field, 'New value:', params.value);
  }, []);

  const downloadFile = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/download-import-file`, formData, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'design_import_ready.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setMessage('Download error: ' + err.message);
    }
  };

  const confirmImport = async () => {
    if (rows.length === 0) return;

    try {
      const res = await axios.post(`${API_BASE}/confirm-import`, {
        rows: rows
      });

      if (res.data.success) {
        setMessage(`Successfully imported ${res.data.inserted} rows!`);
      }
    } catch (err) {
      setMessage('Import error: ' + err.message);
    }
  };

  const defaultColDef = {
    editable: true,
    resizable: true,
    sortable: true,
    filter: true
  };

  const gridOptions = {
    singleClickEdit: false,
    stopEditingWhenCellsLoseFocus: true
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h2>Inventory Migration Tool</h2>

      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
      />

      <br /><br />

      <button onClick={uploadPreview} disabled={loading}>
        {loading ? 'Uploading...' : 'Generate Preview'}
      </button>

      {loading && (
        <div style={{ marginTop: 20 }}>
          <progress value={progress} max="100" />
          <div>{progress}%</div>
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ marginTop: 20, padding: 10, backgroundColor: '#fff3cd', borderRadius: 4 }}>
          <h4>Warnings</h4>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>
            Preview ({rows.length} rows) - Click any cell to edit
          </h3>

          <div
            className="ag-theme-alpine"
            style={{
              height: 500,
              width: '100%',
              marginTop: 10
            }}
          >
            <AgGridReact
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onCellValueChanged={onCellValueChanged}
              gridOptions={gridOptions}
              pagination={true}
              paginationPageSize={100}
              domLayout="normal"
            />
          </div>

          <br />

          <button onClick={downloadFile}>
            Download Excel
          </button>

          <button
            style={{ marginLeft: 20 }}
            onClick={confirmImport}
          >
            Looks Correct — Import to DB
          </button>
        </>
      )}

      {message && (
        <h3 style={{ marginTop: 20, color: message.includes('Error') ? 'red' : 'green' }}>
          {message}
        </h3>
      )}
    </div>
  );
}