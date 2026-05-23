import { useState, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, RowClassParams } from 'ag-grid-community';
import { 
  Search, 
  Download, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Filter,
  FileSpreadsheet,
  Edit3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TransformedRow } from './TransformDataModal';

ModuleRegistry.registerModules([AllCommunityModule]);

interface PreviewDataGridProps {
  data: TransformedRow[];
  columns: string[];
  warnings: Array<{ column?: string; row?: number; warning: string }>;
  errors: Array<{ column?: string; row?: number; error: string }>;
  totalRows: number;
  onDataChange: (data: TransformedRow[]) => void;
}

export function PreviewDataGrid({
  data,
  columns,
  warnings,
  errors,
  totalRows,
  onDataChange,
}: PreviewDataGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Generate column definitions for AG Grid
  const columnDefs: ColDef[] = useMemo(() => {
    return columns.map((col) => ({
      field: col,
      headerName: col,
      editable: true,
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 120,
      cellStyle: { fontSize: '13px' },
      headerClass: 'font-semibold text-gray-700',
    }));
  }, [columns]);

  const defaultColDef = useMemo(() => ({
    editable: true,
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lowerTerm = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(lowerTerm)
      )
    );
  }, [data, searchTerm]);

  // Get row style based on errors/warnings
  const getRowStyle = useCallback((params: RowClassParams) => {
    const rowIndex = params.node.rowIndex ?? 0;
    const hasError = errors.some((e) => e.row === rowIndex || (Array.isArray(e.row) && e.row.includes(rowIndex)));
    const hasWarning = warnings.some((w) => w.row === rowIndex);

    if (hasError) {
      return { backgroundColor: '#fef2f2' }; // red-50
    }
    if (hasWarning) {
      return { backgroundColor: '#fffbeb' }; // amber-50
    }
    return undefined;
  }, [errors, warnings]);

  // Handle cell edit
  const onCellValueChanged = useCallback((params: any) => {
    const newData = [...data];
    const rowIndex = params.node.rowIndex;
    if (rowIndex !== undefined && rowIndex >= 0 && rowIndex < newData.length) {
      newData[rowIndex] = { ...newData[rowIndex], [params.colDef.field]: params.newValue };
      onDataChange(newData);
    }
  }, [data, onDataChange]);

  // Add new row
  const handleAddRow = () => {
    const newRow: TransformedRow = {};
    columns.forEach((col) => {
      newRow[col] = '';
    });
    onDataChange([...data, newRow]);
  };

  // Delete selected rows
  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) return;
    const newData = data.filter((_, index) => !selectedRows.has(index));
    onDataChange(newData);
    setSelectedRows(new Set());
  };

  // Download transformed data as Excel
  const handleDownloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transformed Data');
    XLSX.writeFile(wb, `transformed_designs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Validate required fields
  const requiredFields = ['design_no', 'name'];
  const missingRequiredCount = useMemo(() => {
    return data.filter((row) =>
      requiredFields.some((field) => !row[field] || String(row[field]).trim() === '')
    ).length;
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">Total Rows</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{data.length}</p>
          <p className="text-xs text-blue-600">of {totalRows} source rows</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700 font-medium">Warnings</span>
          </div>
          <p className="text-2xl font-bold text-amber-900">{warnings.length}</p>
          <p className="text-xs text-amber-600">Data quality issues</p>
        </div>

        <div className={`border rounded-xl p-4 ${errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            {errors.length > 0 ? (
              <XCircle className="w-4 h-4 text-red-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
            <span className={`text-sm font-medium ${errors.length > 0 ? 'text-red-700' : 'text-green-700'}`}>Errors</span>
          </div>
          <p className={`text-2xl font-bold ${errors.length > 0 ? 'text-red-900' : 'text-green-900'}`}>{errors.length}</p>
          <p className={`text-xs ${errors.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {errors.length > 0 ? 'Issues to fix' : 'All validations passed'}
          </p>
        </div>

        <div className={`border rounded-xl p-4 ${missingRequiredCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Edit3 className={`w-4 h-4 ${missingRequiredCount > 0 ? 'text-orange-600' : 'text-green-600'}`} />
            <span className={`text-sm font-medium ${missingRequiredCount > 0 ? 'text-orange-700' : 'text-green-700'}`}>Required Fields</span>
          </div>
          <p className={`text-2xl font-bold ${missingRequiredCount > 0 ? 'text-orange-900' : 'text-green-900'}`}>
            {data.length - missingRequiredCount}/{data.length}
          </p>
          <p className={`text-xs ${missingRequiredCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {missingRequiredCount > 0 ? `${missingRequiredCount} rows missing required fields` : 'All rows complete'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search in data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition ${showFilters ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Toggle filters"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddRow}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </button>
          {selectedRows.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedRows.size})
            </button>
          )}
          <button
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </button>
        </div>
      </div>

      {/* Issues Panel */}
      {(warnings.length > 0 || errors.length > 0) && (
        <div className="space-y-2">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900 text-sm">Errors</span>
              </div>
              <ul className="space-y-1">
                {errors.slice(0, 5).map((err, idx) => (
                  <li key={idx} className="text-xs text-red-700 flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    {err.column && <span className="font-medium">{err.column}:</span>}
                    {err.error}
                    {err.row !== undefined && <span className="text-red-500">(Row {err.row})</span>}
                  </li>
                ))}
                {errors.length > 5 && (
                  <li className="text-xs text-red-600 italic">...and {errors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-900 text-sm">Warnings</span>
              </div>
              <ul className="space-y-1">
                {warnings.slice(0, 5).map((warn, idx) => (
                  <li key={idx} className="text-xs text-amber-700 flex items-start gap-2">
                    <span className="text-amber-400">•</span>
                    {warn.column && <span className="font-medium">{warn.column}:</span>}
                    {warn.warning}
                  </li>
                ))}
                {warnings.length > 5 && (
                  <li className="text-xs text-amber-600 italic">...and {warnings.length - 5} more warnings</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Data Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="ag-theme-alpine"
          style={{ height: 400, width: '100%' }}
        >
          <AgGridReact
            rowData={filteredData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onCellValueChanged={onCellValueChanged}
            rowStyle={getRowStyle}
            pagination={true}
            paginationPageSize={100}
            domLayout="normal"
            animateRows={true}
            rowSelection="multiple"
            suppressRowClickSelection={false}
            onSelectionChanged={(event) => {
              const selected = event.api.getSelectedNodes();
              setSelectedRows(new Set(selected.map((n) => n.rowIndex ?? 0)));
            }}
            getRowHeight={() => 40}
          />
        </div>
      </div>

      {/* Grid Footer Info */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <p>Showing {filteredData.length} of {data.length} rows</p>
        <p>Double-click any cell to edit. Use column headers to sort/filter.</p>
      </div>
    </div>
  );
}
