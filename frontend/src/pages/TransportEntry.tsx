import React, { useState, useEffect } from 'react';
import { Plus, Search, Upload, Download, FileDown, ChevronDown, Truck } from 'lucide-react';
import { api, Transport } from '../lib/api';
import * as XLSX from 'xlsx';
import { Breadcrumb } from '../components';
import { backendConfig } from '../config/backend';

// Hooks
import { useTransportForm } from '../hooks/useTransportForm';
import { useLocationData } from '../hooks/useLocationData';
import { useTransportData } from '../hooks/useTransportData';

// Components
import { 
  TransportTable, 
  TransportMobileCard, 
  ViewTransportModal,
  TransportFormModal 
} from '../components/transport';

// Utils
import { 
  generateSampleExcel, 
  exportToExcel, 
  exportToPDF,
  parseExcelFile,
  validateImportData,
  transformImportData
} from '../utils/transport/exportHelpers';

const TransportEntry: React.FC = () => {
  // Data management
  const {
    filteredTransports,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    setError,
    createTransport,
    updateTransport,
    deleteTransport,
    importTransports
  } = useTransportData();

  // Form management
  const {
    formData,
    setFormData,
    gstError,
    phoneError,
    editingTransport,
    handlePhoneChange,
    handleGSTChange,
    validateForm,
    resetForm,
    loadTransportForEdit
  } = useTransportForm();

  // Location management
  const {
    states,
    districts,
    cities,
    applyLocationFromPincode,
    handleStateChange,
    handleDistrictChange,
    handleCityChange,
    loadDistrictsAndCities
  } = useLocationData();

  // UI state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);

  // Handle export menu click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (editingTransport) {
        await updateTransport(formData, editingTransport);
      } else {
        await createTransport(formData);
      }
      
      resetForm();
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingTransport ? 'update' : 'create'} transport option`);
    }
  };

  const handleEdit = async (transport: Transport) => {
    await loadTransportForEdit(transport);
    
    if (transport.state) {
      await loadDistrictsAndCities(transport.state, transport.district);
    }
    
    setShowCreateForm(true);
  };

  const handleView = (transport: Transport) => {
    setSelectedTransport(transport);
    setShowViewModal(true);
  };

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pincode = e.target.value;
    console.log('=== handlePincodeChange called ===');
    console.log('Pincode entered:', pincode);
    setFormData(prev => ({ ...prev, pincode }));

    if (pincode.length === 6) {
      console.log('Pincode is 6 digits, fetching location...');
      try {
        const locationData = await api.fetchLocationByPincode(pincode);
        console.log('Location data from API:', locationData);
        
        if (locationData.found && locationData.state && locationData.district && locationData.city) {
          console.log('Valid location found, calling applyLocationFromPincode...');
          const updatedLocation = await applyLocationFromPincode({
            state: locationData.state,
            district: locationData.district,
            city: locationData.city,
            pincode: locationData.pincode
          });
          
          setFormData(prev => ({ ...prev, ...updatedLocation }));
          console.log('applyLocationFromPincode completed');
        } else {
          console.log('Location not found or incomplete');
        }
      } catch (err) {
        console.error('Failed to fetch location by pincode:', err);
      }
    }
    console.log('=== handlePincodeChange completed ===');
  };

  const handleStateChangeWrapper = async (state: string) => {
    const updates = await handleStateChange(state);
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleDistrictChangeWrapper = async (district: string) => {
    const updates = await handleDistrictChange(district);
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleCityChangeWrapper = (cityName: string) => {
    const updates = handleCityChange(cityName, cities);
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const token = localStorage.getItem('access_token');
      await exportToExcel(token!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export to Excel');
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  const handleExportPdf = () => {
    try {
      setExportLoading(true);
      exportToPDF(filteredTransports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export to PDF');
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    
    parseExcelFile(file)
      .then(data => {
        setImportPreview(data);
      })
      .catch(err => {
        setError('Failed to read file. Please ensure it is a valid Excel file.');
      });
  };

  const handleImport = async () => {
    if (!importPreview.length) return;

    const validation = validateImportData(importPreview);
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
      return;
    }

    try {
      setImportLoading(true);
      const transformedData = transformImportData(importPreview);
      await importTransports(transformedData);
      
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import transport options');
    } finally {
      setImportLoading(false);
    }
  };

  if (loading && filteredTransports.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-600">Loading transport options...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Transport Entry', path: '/transport-entry' }]} />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Entry</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your transport options</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Transport
          </button>
          
          <div className="relative export-menu-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                <button
                  onClick={handleExportExcel}
                  disabled={exportLoading}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileDown className="h-4 w-4" />
                  Export to Excel
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={exportLoading}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileDown className="h-4 w-4" />
                  Export to PDF
                </button>
                <button
                  onClick={generateSampleExcel}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t"
                >
                  <Download className="h-4 w-4" />
                  Download Sample
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <button 
            onClick={() => setError('')}
            className="text-red-800 hover:text-red-900 text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="relative">
          <Search className="-translate-y-1/2 absolute left-3 top-1/2 h-5 w-5 transform text-gray-400" />
          <input
            type="text"
            placeholder="Search transport ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Transport List */}
      <div className="rounded-lg bg-white shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <TransportTable
            transports={filteredTransports}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={deleteTransport}
          />

          {filteredTransports.length === 0 && (
            <div className="py-12 text-center">
              <Truck className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                {searchTerm ? 'No transport options found matching your search.' : 'No transport options yet. Click "Add Transport" to create one.'}
              </p>
            </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {filteredTransports.length === 0 ? (
            <div className="py-12 text-center">
              <Truck className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                {searchTerm ? 'No transport options found.' : 'No transport options yet.'}
              </p>
            </div>
          ) : (
            <TransportMobileCard
              transports={filteredTransports}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={deleteTransport}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <TransportFormModal
        isOpen={showCreateForm}
        isEditing={!!editingTransport}
        formData={formData}
        states={states}
        districts={districts}
        cities={cities}
        gstError={gstError}
        phoneError={phoneError}
        onClose={() => {
          setShowCreateForm(false);
          resetForm();
        }}
        onSubmit={handleSubmit}
        onFormDataChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
        onPhoneChange={handlePhoneChange}
        onGSTChange={handleGSTChange}
        onPincodeChange={handlePincodeChange}
        onStateChange={handleStateChangeWrapper}
        onDistrictChange={handleDistrictChangeWrapper}
        onCityChange={handleCityChangeWrapper}
      />

      {showViewModal && (
        <ViewTransportModal
          transport={selectedTransport}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">Import Transport Options</h2>
            
            <div className="mb-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {importPreview.length > 0 && (
              <div className="mb-4 max-h-96 overflow-auto">
                <p className="mb-2 text-sm text-gray-600">Preview ({importPreview.length} rows)</p>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Transport Name</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-left">Phone</th>
                      <th className="px-3 py-2 text-left">City</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {importPreview.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{row['Transport Name']}</td>
                        <td className="px-3 py-2">{row['Description']}</td>
                        <td className="px-3 py-2">{row['Phone Number']}</td>
                        <td className="px-3 py-2">{row['City']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview([]);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importLoading || importPreview.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importLoading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportEntry;
