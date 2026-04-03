import React, { useState, useEffect } from 'react';
import { Plus, Search, Upload, Download, FileDown, ChevronDown, Users } from 'lucide-react';
import { Party } from '../lib/api';
import { Breadcrumb } from '../components';

// Hooks
import { usePartyData } from '../hooks/usePartyData';
import { usePartyForm } from '../hooks/usePartyForm';
import { useLocationData } from '../hooks/useLocationData';

// Components
import { 
  PartyTable, 
  PartyMobileCard, 
  ViewPartyModal,
  PartyFormModal,
  ImportModal
} from '../components/party';

// Utils
import { 
  generateSampleExcel, 
  exportToExcel,
  exportToPDF,
  parseExcelFile,
  validateImportData,
  transformImportData
} from '../utils/party/exportHelpers';

const PartyEntry: React.FC = () => {
  // Data management
  const {
    filteredParties,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    setError,
    createParty,
    updateParty,
    deleteParty,
    importParties
  } = usePartyData();

  // Form management
  const {
    formData,
    setFormData,
    gstError,
    phoneNumbers,
    editingParty,
    handleGSTChange,
    validateForm,
    resetForm,
    loadPartyForEdit,
    addPhoneNumber,
    removePhoneNumber,
    updatePhoneNumber
  } = usePartyForm();

  // Location management
  const {
    states,
    districts,
    cities,
    selectedDistrict,
    setSelectedDistrict,
    setDistricts,
    setCities,
    applyLocationFromPincode
  } = useLocationData();

  // UI state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [transports, setTransports] = useState<Array<{ id: string; transport_name: string }>>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch transports on mount
  useEffect(() => {
    fetchTransports();
  }, []);

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

  const fetchTransports = async () => {
    try {
      const { api } = await import('../lib/api');
      const data = await api.fetchTransports();
      setTransports(data.transportOptions || []);
    } catch (err) {
      console.error('Failed to fetch transports:', err);
    }
  };

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pincode = e.target.value;
    setFormData(prev => ({ ...prev, pincode }));

    if (pincode.length === 6) {
      try {
        const { api } = await import('../lib/api');
        const locationData = await api.fetchLocationByPincode(pincode);
        
        if (locationData.found && locationData.state && locationData.district && locationData.city) {
          const updatedLocationData = await applyLocationFromPincode({
            state: locationData.state,
            district: locationData.district,
            city: locationData.city,
            pincode: locationData.pincode
          });
          
          // Update form data with the matched location values
          if (updatedLocationData) {
            setFormData(prev => ({
              ...prev,
              state: updatedLocationData.state,
              city: updatedLocationData.city,
              pincode: updatedLocationData.pincode
            }));
            
            // Update selected district for the dropdown
            setSelectedDistrict(updatedLocationData.district);
          }
        }
      } catch (err) {
        console.error('Failed to fetch location by pincode:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (editingParty) {
        await updateParty(formData, editingParty, phoneNumbers);
      } else {
        await createParty(formData, phoneNumbers);
      }
      
      resetForm();
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingParty ? 'update' : 'create'} party`);
    }
  };

  const handleView = (party: Party) => {
    setSelectedParty(party);
    setShowViewModal(true);
  };

  const handleEdit = async (party: Party) => {
    await loadPartyForEdit(party, setDistricts, setCities, setSelectedDistrict);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string, partyName: string) => {
    if (!confirm(`Are you sure you want to delete party "${partyName}"?`)) return;
    
    try {
      await deleteParty(id);
    } catch (err) {
      console.error('Party deletion error:', err);
    }
  };

  const handleStateChangeWrapper = async (state: string) => {
    // Clear districts and cities when state changes
    setDistricts([]);
    setCities([]);
    setSelectedDistrict('');
    
    // Update state in form data, clear district and city but keep pincode
    setFormData(prev => ({
      ...prev,
      state,
      city: '',
    }));
    
    // Fetch districts for the new state
    if (state) {
      try {
        const { api } = await import('../lib/api');
        const data = await api.fetchDistricts(state);
        setDistricts(data.districts);
      } catch (err) {
        console.error('Failed to fetch districts:', err);
      }
    }
  };

  const handleDistrictChangeWrapper = async (district: string) => {
    // Clear cities when district changes
    setCities([]);
    setSelectedDistrict(district);
    
    // Update district in form data, clear city but keep pincode
    setFormData(prev => ({
      ...prev,
      city: '',
    }));
    
    // Fetch cities for the new district
    if (district) {
      try {
        const { api } = await import('../lib/api');
        const data = await api.fetchCities(district);
        setCities(data.cities);
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      }
    }
  };

  const handleCityChangeWrapper = (cityName: string) => {
    const selectedCity = cities.find(c => c.city_name === cityName);
    
    // Update city and optionally pincode if city has one
    setFormData(prev => ({
      ...prev,
      city: cityName,
      pincode: selectedCity?.zipcode || prev.pincode
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    
    try {
      const data = await parseExcelFile(file);
      setImportPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    }
  };

  const handleImportData = async () => {
    if (!importPreview.length) return;
    
    const validation = validateImportData(importPreview);
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
      return;
    }

    try {
      setImportLoading(true);
      const transformedData = transformImportData(importPreview);
      const result = await importParties(transformedData);
      
      if (result.errors.length > 0) {
        setError(`Import completed with ${result.successCount} success(es) and ${result.errors.length} error(s):\n${result.errors.join('\n')}`);
      } else {
        setError('');
      }

      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
    } catch (err) {
      setError('Failed to import data. Please try again.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportExcel = () => {
    try {
      setExportLoading(true);
      exportToExcel(filteredParties);
    } catch (err) {
      setError('Failed to export to Excel');
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  const handleExportPdf = () => {
    try {
      setExportLoading(true);
      exportToPDF(filteredParties);
    } catch (err) {
      setError('Failed to export to PDF');
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  if (loading && filteredParties.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-600">Loading parties...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-2 sm:pb-8">
      <Breadcrumb />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Party Entry</h1>
            <p className="mt-1 text-gray-600">Manage party information and contacts</p>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
            <button
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Party
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
                </div>
              )}
            </div>

            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center"
            >
              <Upload className="mr-2 h-5 w-5" />
              Import
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-600">{error}</p>
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
              placeholder="Search parties by ID, name, city, state, or GST number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Parties List */}
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto md:block">
            <PartyTable
              parties={filteredParties}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            {filteredParties.length === 0 && (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-500">
                  {searchTerm ? 'No parties found matching your search' : 'No parties found'}
                </p>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {filteredParties.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-500">
                  {searchTerm ? 'No parties found matching your search' : 'No parties found'}
                </p>
              </div>
            ) : (
              <PartyMobileCard
                parties={filteredParties}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>

        {/* Modals */}
        <PartyFormModal
          isOpen={showCreateForm}
          isEditing={!!editingParty}
          formData={formData}
          states={states}
          districts={districts}
          cities={cities}
          selectedDistrict={selectedDistrict}
          transports={transports}
          phoneNumbers={phoneNumbers}
          gstError={gstError}
          loading={loading}
          onClose={() => {
            setShowCreateForm(false);
            resetForm();
            // Clear location dropdowns
            setDistricts([]);
            setCities([]);
            setSelectedDistrict('');
          }}
          onSubmit={handleSubmit}
          onFormDataChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
          onStateChange={handleStateChangeWrapper}
          onDistrictChange={handleDistrictChangeWrapper}
          onCityChange={handleCityChangeWrapper}
          onPincodeChange={handlePincodeChange}
          onGSTChange={handleGSTChange}
          onAddPhoneNumber={addPhoneNumber}
          onRemovePhoneNumber={removePhoneNumber}
          onUpdatePhoneNumber={updatePhoneNumber}
        />

        <ViewPartyModal
          isOpen={showViewModal}
          party={selectedParty}
          onClose={() => setShowViewModal(false)}
        />

        <ImportModal
          isOpen={showImportModal}
          importPreview={importPreview}
          importLoading={importLoading}
          onClose={() => {
            setShowImportModal(false);
            setImportFile(null);
            setImportPreview([]);
          }}
          onFileUpload={handleFileUpload}
          onImport={handleImportData}
          onDownloadSample={generateSampleExcel}
        />
      </div>
    </div>
  );
};

export default PartyEntry;
