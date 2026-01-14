import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Truck, MapPin, Phone, Building, Upload, Download } from 'lucide-react';
import { api, Transport } from '../lib/api';
import * as XLSX from 'xlsx';

const TransportEntry: React.FC = () => {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<Array<{ city_name: string; zipcode: string }>>([]);
  const [formData, setFormData] = useState({
    transport_name: '',
    description: '',
    address: '',
    phone_number: '',
    gst_number: '',
    state: '',
    district: '',
    city: '',
    pincode: ''
  });
  const [gstError, setGstError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    fetchTransports();
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      const data = await api.fetchStates();
      setStates(data.states);
    } catch (err) {
      console.error('Failed to fetch states:', err);
    }
  };

  const handleStateChange = async (state: string) => {
    setFormData({ ...formData, state, district: '', city: '', pincode: '' });
    setDistricts([]);
    setCities([]);
    
    if (state) {
      try {
        const data = await api.fetchDistricts(state);
        setDistricts(data.districts);
      } catch (err) {
        console.error('Failed to fetch districts:', err);
      }
    }
  };

  const handleDistrictChange = async (district: string) => {
    setFormData({ ...formData, district, city: '', pincode: '' });
    setCities([]);
    
    if (district) {
      try {
        const data = await api.fetchCities(district);
        setCities(data.cities);
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      }
    }
  };

  const handleCityChange = (cityName: string) => {
    const selectedCity = cities.find(c => c.city_name === cityName);
    setFormData({ 
      ...formData, 
      city: cityName,
      pincode: selectedCity?.zipcode || formData.pincode
    });
  };

  const fetchTransports = async () => {
     try {
      setLoading(true);
      const data = await api.fetchTransports();
      setTransports(data.transportOptions);
    } catch (err) {
     setError(err instanceof Error ? err.message : 'Failed to fetch transport options');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate GST number and phone number before submission
    const isGSTValid = validateGSTNumber(formData.gst_number);
    const isPhoneValid = validatePhoneNumber(formData.phone_number);
    
    if (!isGSTValid || !isPhoneValid) {
      return;
    }
    
    setLoading(true);

    try {
         await api.createOrEditTransport({
      ...formData
     }, editingTransport);
      
      resetForm();
      fetchTransports();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingTransport ? 'update' : 'create'} transport option`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (transport: Transport) => {
    setEditingTransport(transport);
    setFormData({
      transport_name: transport.transport_name,
      description: transport.description,
      address: transport.address || '',
      phone_number: transport.phone_number || '',
      gst_number: transport.gst_number || '',
      state: transport.state || '',
      district: transport.district || '',
      city: transport.city || '',
      pincode: transport.pincode || ''
    });
    
    // Load districts and cities for editing
    if (transport.state) {
      try {
        const districtData = await api.fetchDistricts(transport.state);
        setDistricts(districtData.districts);
        
        if (transport.district) {
          const cityData = await api.fetchCities(transport.district);
          setCities(cityData.cities);
        }
      } catch (err) {
        console.error('Failed to load location data:', err);
      }
    }
    
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number, transportName: string) => {
    if (!confirm(`Are you sure you want to delete transport option "${transportName}"?`)) return;

    try {
          await api.deleteTransport(id);
          await fetchTransports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transport option');
    }
  };

  const resetForm = () => {
    setFormData({
      transport_name: '',
      description: '',
      address: '',
      phone_number: '',
      gst_number: '',
      state: '',
      district: '',
      city: '',
      pincode: ''
    });
    setDistricts([]);
    setCities([]);
    setShowCreateForm(false);
    setEditingTransport(null);
    setError('');
    setGstError('');
    setPhoneError('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const validateGSTNumber = (gstNumber: string) => {
    if (!gstNumber) {
      setGstError('');
      return true;
    }
    
    // GSTIN format: 2 characters (state code) + 10 characters (PAN) + 1 character (entity) + 1 character (checksum) + 1 character (Z) + 1 digit (default)
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    
    if (!gstRegex.test(gstNumber.toUpperCase())) {
      setGstError('Invalid GST number format. Please enter a valid GSTIN (e.g., 22AAAAA0000A1Z5)');
      return false;
    }
    
    setGstError('');
    return true;
  };

  const validatePhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) {
      setPhoneError('');
      return true;
    }
    
    // Remove any non-digit characters for validation
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Indian mobile number validation: 10 digits starting with 6-9
    const mobileRegex = /^[6-9]\d{9}$/;
    
    if (cleanPhone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      return false;
    }
    
    if (!mobileRegex.test(cleanPhone)) {
      setPhoneError('Invalid mobile number. Must start with 6-9 and be 10 digits');
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const handleGSTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setFormData({ ...formData, gst_number: value });
    validateGSTNumber(value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    setFormData({ ...formData, phone_number: value });
    validatePhoneNumber(value);
  };

  const generateSampleExcel = () => {
    const sampleData = [
      {
        'Transport Name': 'Express Logistics',
        'Description': 'Fast and reliable delivery service',
        'Address': '123 Main Street, Industrial Area',
        'City': 'Mumbai',
        'State': 'Maharashtra',
        'District': 'Mumbai',
        'Pincode': '400001',
        'Phone Number': '9876543210',
        'GST Number': '27AAAAA0000A1Z5'
      },
      {
        'Transport Name': 'Swift Cargo',
        'Description': 'Nationwide transport solutions',
        'Address': '456 Transport Hub',
        'City': 'Delhi',
        'State': 'Delhi',
        'District': 'Central Delhi',
        'Pincode': '110001',
        'Phone Number': '9123456789',
        'GST Number': '07BBBBB1111B2Z6'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transport Details');
    
    // Set column widths
    ws['!cols'] = [
      { width: 25 },  // Transport Name
      { width: 35 },  // Description
      { width: 35 },  // Address
      { width: 15 },  // City
      { width: 15 },  // State
      { width: 15 },  // District
      { width: 10 },  // Pincode
      { width: 15 },  // Phone Number
      { width: 20 }   // GST Number
    ];

    XLSX.writeFile(wb, 'transport_details_sample.xlsx');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate and transform data
        const transformedData = jsonData.map((row: any, index: number) => ({
          rowNumber: index + 2, // Excel row number (starting from 2, accounting for header)
          transport_name: row['Transport Name'] || '',
          description: row['Description'] || '',
          address: row['Address'] || '',
          city: row['City'] || '',
          state: row['State'] || '',
          district: row['District'] || '',
          pincode: row['Pincode'] || '',
          phone_number: row['Phone Number'] || '',
          gst_number: row['GST Number'] || '',
          isValid: !!(row['Transport Name']) // At least transport name is required
        }));
        
        setImportPreview(transformedData);
      } catch (err) {
        setError('Failed to read Excel file. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportData = async () => {
    if (!importPreview.length) return;
    
    setImportLoading(true);
    const validRows = importPreview.filter(row => row.isValid);
    
    try {
      const result = await api.importTransports(validRows);
       
      if (result.successCount > 0) {
        fetchTransports(); // Refresh the transports list
      }

      if (result.errors.length > 0) {
        setError(`Import completed with ${result.successCount} success(es) and ${result.errors.length} error(s):\n${result.errors.join('\n')}`);
      } else {
        setError('');
      }

      // Close modal and reset state
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
      
    } catch (err) {
      setError('Failed to import data. Please try again.');
    } finally {
      setImportLoading(false);
    }
  };

  const filteredTransports = transports.filter(transport =>
    transport.transport_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transport.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transport.city && transport.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (transport.state && transport.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (transport.gst_number && transport.gst_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && transports.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-600">Loading transport options...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transport Entry</h1>
          <p className="mt-1 text-gray-600">Manage transport methods and delivery options</p>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:mt-0">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center"
          >
            <Upload className="mr-2 h-5 w-5" />
            Import Excel
          </button>
          <button
            onClick={generateSampleExcel}
            className="flex items-center justify-center rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-gray-700"
          >
            <Download className="mr-2 h-5 w-5" />
            Sample Excel
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Transport
          </button>
        </div>
      </div>

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
            placeholder="Search transport options by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Transport Options Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Transport Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  GST Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredTransports.map((transport) => (
                <tr key={transport.id} className="transition-colors duration-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Truck className="mr-2 h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{transport.transport_name}</div>
                        {transport.description && (
                          <div className="text-xs text-gray-500">{transport.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {transport.phone_number && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="mr-1 h-3 w-3 text-gray-400" />
                        {transport.phone_number}
                      </div>
                    )}
                    {transport.address && (
                      <div className="text-xs text-gray-500 mt-1">{transport.address}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(transport.city || transport.state) && (
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="mr-1 h-3 w-3 text-gray-400" />
                        <span>
                          {transport.city}{transport.city && transport.state && ', '}{transport.state}
                        </span>
                      </div>
                    )}
                    {transport.district && (
                      <div className="text-xs text-gray-500">{transport.district}</div>
                    )}
                    {transport.pincode && (
                      <div className="text-xs text-gray-500">PIN: {transport.pincode}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {transport.gst_number && (
                      <div className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900">
                        {transport.gst_number}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500">{formatDate(transport.created_at)}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(transport)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit transport option"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(transport.id, transport.transport_name)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete transport option"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTransports.length === 0 && (
            <div className="py-12 text-center">
              <Truck className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                {searchTerm ? 'No transport options found matching your search' : 'No transport options found'}
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
                {searchTerm ? 'No transport options found matching your search' : 'No transport options found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {filteredTransports.map((transport) => (
                <div key={transport.id} className="rounded-lg border bg-gray-50 p-4">
                  {/* Transport Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <Truck className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{transport.transport_name}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {transport.description && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600">{transport.description}</p>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="mb-3 space-y-1">
                    {transport.phone_number && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="mr-2 h-3 w-3 text-gray-400" />
                        <span className="text-xs">{transport.phone_number}</span>
                      </div>
                    )}
                    {transport.gst_number && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Building className="mr-2 h-3 w-3 text-gray-400" />
                        <span className="rounded border bg-white px-2 py-1 font-mono text-xs">
                          {transport.gst_number}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  {(transport.address || transport.city || transport.state) && (
                    <div className="mb-3">
                      <div className="flex items-start text-sm text-gray-900">
                        <MapPin className="mr-2 mt-0.5 h-3 w-3 text-gray-400" />
                        <div className="text-xs">
                          {transport.address && (
                            <div className="mb-1">{transport.address}</div>
                          )}
                          <div>
                            {transport.city}{transport.city && transport.state && ', '}{transport.state}
                            {transport.pincode && ` - ${transport.pincode}`}
                          </div>
                          {transport.district && (
                            <div className="text-gray-500">District: {transport.district}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(transport.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 border-t pt-2">
                    <button
                      onClick={() => handleEdit(transport)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                      title="Edit transport option"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(transport.id, transport.transport_name)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                      title="Delete transport option"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
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
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <button
                    onClick={generateSampleExcel}
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
                  <p><strong>Optional Columns:</strong> Description, Address, City, State, District, Pincode, Phone Number, GST Number</p>
                  <p className="mt-2 text-blue-700">Note: Phone numbers should be 10 digits. GST numbers should follow the standard format.</p>
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
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Transport Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">City</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">State</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Phone</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importPreview.map((row, index) => (
                          <tr key={index} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                            <td className="px-3 py-2 text-gray-900">{row.rowNumber}</td>
                            <td className="px-3 py-2 text-gray-900">{row.transport_name || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{row.city || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{row.state || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{row.phone_number || '-'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                row.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportData}
                  disabled={importLoading || importPreview.filter(row => row.isValid).length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importLoading ? 'Importing...' : `Import ${importPreview.filter(row => row.isValid).length} Transport(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Transport Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {editingTransport ? 'Edit Transport Option' : 'Create New Transport Option'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Transport Name *
                </label>
                <input
                  type="text"
                  value={formData.transport_name}
                  onChange={(e) => setFormData({ ...formData, transport_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter transport name (e.g., Express Delivery)"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter complete address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    District
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!formData.state}
                  >
                    <option value="">Select District</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!formData.district}
                  >
                    <option value="">Select City</option>
                    {cities.map((city) => (
                      <option key={city.city_name} value={city.city_name}>{city.city_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter pincode"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={handlePhoneChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    phoneError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                />
                {phoneError && (
                  <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  GST Number
                </label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={handleGSTChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    gstError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter GST number (e.g., 22AAAAA0000A1Z5)"
                  maxLength={15}
                />
                {gstError && (
                  <p className="mt-1 text-sm text-red-600">{gstError}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors duration-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingTransport ? 'Update Transport' : 'Create Transport')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default TransportEntry;