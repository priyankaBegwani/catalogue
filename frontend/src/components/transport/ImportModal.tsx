import React from 'react';
import { X } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  importPreview: any[];
  importLoading: boolean;
  onClose: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onDownloadSample: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  importPreview,
  importLoading,
  onClose,
  onFileUpload,
  onImport,
  onDownloadSample
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        
        <h2 className="mb-4 pr-8 text-xl font-bold text-gray-900">
          Import Transport Details from Excel
        </h2>
        
        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Select Excel File
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={onDownloadSample}
                className="whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Download Sample
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Upload an Excel file (.xlsx or .xls) with transport details. Download the sample format to see the expected structure.
            </p>
          </div>

          {/* Expected Format Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-blue-900">Expected Excel Format:</h3>
            <div className="space-y-1 text-xs text-blue-800">
              <p><strong>Required Column:</strong> Transport Name</p>
              <p><strong>Optional Columns:</strong> Email ID, Address, City, State, Pincode, Phone Number, GST Number</p>
              <p><strong>Note:</strong> Column names must match exactly (case-sensitive)</p>
            </div>
          </div>

          {/* Preview Data */}
          {importPreview.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-medium text-gray-900">
                Preview ({importPreview.filter(row => row.isValid).length} valid rows)
              </h3>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-300">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Transport Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Email ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">City</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">State</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {importPreview.map((row, index) => (
                      <tr key={index} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                        <td className="px-3 py-2 text-gray-900">{row.rowNumber}</td>
                        <td className="px-3 py-2 text-gray-900">{row.transport_name || '-'}</td>
                        <td className="px-3 py-2 text-gray-900">{row.email_id || '-'}</td>
                        <td className="px-3 py-2 text-gray-900">{row.city || '-'}</td>
                        <td className="px-3 py-2 text-gray-900">{row.state || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            row.isValid 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {row.isValid ? 'Valid' : 'Invalid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onImport}
              disabled={importLoading || !importPreview.length || !importPreview.some(row => row.isValid)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
            >
              {importLoading ? 'Importing...' : `Import ${importPreview.filter(row => row.isValid).length} Transports`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
