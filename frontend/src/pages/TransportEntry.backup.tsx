import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Truck, MapPin, Phone, Building, Upload, Download, FileDown, ChevronDown, X } from 'lucide-react';
import { api, Transport } from '../lib/api';
import * as XLSX from 'xlsx';
import { Breadcrumb } from '../components';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { backendConfig } from '../config/backend';

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
    email_id: '',
    gst_number: '',
    state: '',
    district: '',
    city: '',
    pincode: ''
  });
  const [gstError, setGstError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);

  useEffect(() => {
    fetchTransports();
    fetchStates();
  }, []);

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

  const fetchStates = async () => {
    try {
      const data = await api.fetchStates();
      setStates(data.states);
    } catch (err) {
      console.error('Failed to fetch states:', err);
    }
  };

  const applyLocationFromPincode = async (locationData: {
    state: string;
    district: string;
    city: string;
    pincode?: string;
  }) => {
    console.log('=== applyLocationFromPincode called ===');
    console.log('Input locationData:', locationData);
    console.log('Current states array:', states);
    
    const normalizedState = locationData.state.trim();
    const normalizedDistrict = locationData.district.trim();
    const normalizedCity = locationData.city.trim();
    const normalizedPincode = locationData.pincode?.trim() || '';

    console.log('Normalized values:', { normalizedState, normalizedDistrict, normalizedCity, normalizedPincode });

    const matchedState = states.find(
      (stateOption) => stateOption.trim().toLowerCase() === normalizedState.toLowerCase()
    ) || normalizedState;

    console.log('Matched state:', matchedState);
    console.log('Fetching districts for state:', matchedState);

    const districtData = await api.fetchDistricts(matchedState);
    console.log('Districts received:', districtData.districts);
    setDistricts(districtData.districts);

    const matchedDistrict = districtData.districts.find(
      (districtOption) => districtOption.trim().toLowerCase() === normalizedDistrict.toLowerCase()
    ) || normalizedDistrict;

    console.log('Matched district:', matchedDistrict);
    console.log('Fetching cities for district:', matchedDistrict);

    const cityData = await api.fetchCities(matchedDistrict);
    console.log('Cities received:', cityData.cities);
    setCities(cityData.cities);

    const matchedCity = cityData.cities.find(
      (cityOption) => cityOption.city_name.trim().toLowerCase() === normalizedCity.toLowerCase()
    )?.city_name || normalizedCity;

    console.log('Matched city:', matchedCity);

    const matchedPincode = cityData.cities.find(
      (cityOption) => cityOption.city_name.trim().toLowerCase() === matchedCity.toLowerCase()
    )?.zipcode || normalizedPincode;

    console.log('Matched pincode:', matchedPincode);

    const finalFormData = {
      state: matchedState,
      district: matchedDistrict,
      city: matchedCity,
      pincode: matchedPincode || normalizedPincode
    };

    console.log('Setting form data to:', finalFormData);

    setFormData(prev => {
      console.log('Previous form data:', prev);
      const newData = {
        ...prev,
        ...finalFormData
      };
      console.log('New form data:', newData);
      return newData;
    });

    console.log('=== applyLocationFromPincode completed ===');
  };

  const handleStateChange = async (state: string) => {
    setFormData(prev => ({ ...prev, state, district: '', city: '', pincode: '' }));
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
    setFormData(prev => ({ ...prev, district, city: '', pincode: '' }));
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
    setFormData(prev => ({ 
      ...prev, 
      city: cityName,
      pincode: selectedCity?.zipcode || prev.pincode
    }));
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      console.log('=== FRONTEND: Starting Excel export ===');
      
      const token = localStorage.getItem('access_token'); // Use 'access_token' to match API client
      console.log('Token present:', !!token);
      console.log('Token value (first 20 chars):', token?.substring(0, 20));
      
      // Check backend configuration
      console.log('Backend config:', backendConfig);
      console.log('Making request to: /api/transport/export/excel');
      const response = await fetch('/api/transport/export/excel', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response content-type:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export failed. Status:', response.status);
        console.error('Error response:', errorText);
        
        if (response.status === 401) {
          console.error('Authentication failed - token may be invalid or expired');
          throw new Error('Authentication failed. Please log in again.');
        }
        
        throw new Error(`Export failed with status ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Response parsed successfully');
      console.log('Data received:', result);
      
      const { data } = result;
      console.log('Number of records:', data?.length || 0);
      
      if (!data || data.length === 0) {
        setError('No transport data available to export');
        return;
      }
      
      console.log('Creating Excel file...');
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transport');
      
      const filename = `Transport_${new Date().toISOString().split('T')[0]}.xlsx`;
      console.log('Writing file:', filename);
      XLSX.writeFile(workbook, filename);
      console.log('Excel file created successfully');
      
      setShowExportMenu(false);
    } catch (err) {
      console.error('=== FRONTEND: Excel export error ===');
      console.error('Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorStack = err instanceof Error ? err.stack : '';
      console.error('Error message:', errorMessage);
      console.error('Error stack:', errorStack);
      setError(`Failed to export to Excel: ${errorMessage}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      console.log('=== FRONTEND: Starting PDF export ===');
      
      const token = localStorage.getItem('access_token'); // Use 'access_token' to match API client
      console.log('Token present:', !!token);
      
      const response = await fetch('/api/transport/export/pdf', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('PDF Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF Export failed. Status:', response.status);
        console.error('Error response:', errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        
        throw new Error(`PDF Export failed with status ${response.status}`);
      }
      
      const { data } = await response.json();
      console.log('PDF data received:', data?.length || 0, 'records');
      
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Transport Options', 14, 20);
      
      const tableData = data.map((item: any) => [
        item.transport_name,
        item.phone_number,
        item.email_id,
        `${item.city}, ${item.state}`,
        item.gst_number,
        item.created_at
      ]);
      
      autoTable(doc, {
        head: [['Transport Name', 'Phone', 'Email', 'Location', 'GST Number', 'Created Date']],
        body: tableData,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      console.log('Creating PDF file...');
      doc.save(`Transport_${new Date().toISOString().split('T')[0]}.pdf`);
      console.log('PDF file created successfully');
      setShowExportMenu(false);
    } catch (err) {
      console.error('=== FRONTEND: PDF export error ===');
      console.error('Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error message:', errorMessage);
      setError(`Failed to export to PDF: ${errorMessage}`);
    } finally {
      setExportLoading(false);
    }
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
      email_id: transport.email_id || '',
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

  const handleView = (transport: Transport) => {
    setSelectedTransport(transport);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string, transportName: string) => {
    if (!confirm(`Are you sure you want to delete transport option "${transportName}"?`)) return;

    try {
          await api.deleteTransport(id);
          await fetchTransports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transport option');
    }
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
          await applyLocationFromPincode({
            state: locationData.state,
            district: locationData.district,
            city: locationData.city,
            pincode: locationData.pincode
          });
          console.log('applyLocationFromPincode completed');
        } else {
          console.log('Location not found or incomplete');
          console.log('Found:', locationData.found);
          console.log('State:', locationData.state);
          console.log('District:', locationData.district);
          console.log('City:', locationData.city);
        }
      } catch (err) {
        console.error('Failed to fetch location by pincode:', err);
      }
    } else {
      console.log('Pincode length is', pincode.length, '- waiting for 6 digits');
    }
    console.log('=== handlePincodeChange completed ===');
  };

  const resetForm = () => {
    setFormData({
      transport_name: '',
      description: '',
      address: '',
      phone_number: '',
      email_id: '',
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
        'Email ID': 'express@example.com',
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
        'Email ID': 'swift@example.com',
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
      { width: 25 },  // Email ID
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
          email_id: row['Email ID'] || '',
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

  const filteredTransports = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return transports.filter(transport =>
      transport.transport_name.toLowerCase().includes(term) ||
      transport.description.toLowerCase().includes(term) ||
      (transport.phone_number && transport.phone_number.toLowerCase().includes(term)) ||
      (transport.email_id && transport.email_id.toLowerCase().includes(term)) ||
      (transport.gst_number && transport.gst_number.toLowerCase().includes(term)) ||
      (transport.pincode && transport.pincode.toLowerCase().includes(term)) ||
      (transport.city && transport.city.toLowerCase().includes(term)) ||
      (transport.district && transport.district.toLowerCase().includes(term)) ||
      (transport.state && transport.state.toLowerCase().includes(term)) ||
      (transport.address && transport.address.toLowerCase().includes(term))
    );
  }, [transports, searchTerm]);

  if (loading && transports.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-600">Loading transport options...</div>
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
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Transport
          </button>
          <div className="relative export-menu-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exportLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <FileDown className="mr-2 h-5 w-5" />
              {exportLoading ? 'Exporting...' : 'Export'}
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                <button
                  onClick={handleExportExcel}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export to PDF
                </button>
              </div>
            )}
          </div>
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
            placeholder="Search transport ..."
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
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Full Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  GST Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredTransports.map((transport) => (
                <tr 
                  key={transport.id} 
                  className="transition-colors duration-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleView(transport)}
                >
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center">
                      <Truck className="mr-2 h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{transport.transport_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="max-w-xs text-sm text-gray-900">
                      {transport.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    {transport.phone_number && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="mr-1 h-3 w-3 text-gray-400" />
                        {transport.phone_number}
                      </div>
                    ) || <div className="text-sm text-gray-500">-</div>}
                  </td>
                  <td className="px-6 py-4 align-top">
                    {(transport.address || transport.city || transport.state || transport.district || transport.pincode) ? (
                      <div className="flex items-start text-sm text-gray-900">
                        <MapPin className="mr-1 mt-0.5 h-3 w-3 text-gray-400" />
                        <div className="max-w-xs text-sm text-gray-900">
                          {transport.address && <div>{transport.address}</div>}
                          {(transport.city || transport.state || transport.district || transport.pincode) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {[transport.city, transport.district, transport.state].filter(Boolean).join(', ')}
                              {transport.pincode ? `${[transport.city, transport.district, transport.state].filter(Boolean).length ? ' - ' : ''}${transport.pincode}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top">
                    {transport.gst_number && (
                      <div className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900">
                        {transport.gst_number}
                      </div>
                    ) || <div className="text-sm text-gray-500">-</div>}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(transport);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit transport option"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(transport.id, transport.transport_name);
                        }}
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
                <div 
                  key={transport.id} 
                  className="rounded-lg border bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleView(transport)}
                >
                  {/* Transport Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <Truck className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{transport.transport_name}</span>
                    </div>
                    {/* Actions */}
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(transport);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit transport option"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(transport.id, transport.transport_name);
                        }}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete transport option"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    {transport.description && (
                      <p className="text-xs text-gray-600">{transport.description}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="mb-3">
                    {transport.phone_number && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="mr-2 h-3 w-3 text-gray-400" />
                        <span className="text-xs">{transport.phone_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Email ID */}
                  <div className="mb-3">
                    {transport.email_id && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Building className="mr-2 h-3 w-3 text-gray-400" />
                        <span className="text-xs">{transport.email_id}</span>
                      </div>
                    )}
                  </div>

                  {/* Full Address */}
                  <div className="mb-3">
                    {(transport.address || transport.city || transport.state || transport.district || transport.pincode) ? (
                      <div className="flex items-start text-sm text-gray-900">
                        <MapPin className="mr-2 mt-0.5 h-3 w-3 text-gray-400" />
                        <div className="text-xs">
                          {transport.address && (
                            <div className="mb-1">{transport.address}</div>
                          )}
                          <div>
                            {[transport.city, transport.district, transport.state].filter(Boolean).join(', ')}
                            {transport.pincode ? `${[transport.city, transport.district, transport.state].filter(Boolean).length ? ' - ' : ''}${transport.pincode}` : ''}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">-</div>
                    )}
                  </div>

                  {/* GST Number */}
                  <div className="mb-3 space-y-1">
                    {transport.gst_number && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Building className="mr-2 h-3 w-3 text-gray-400" />
                        <span className="rounded border bg-white px-2 py-1 font-mono text-xs">
                          {transport.gst_number}
                        </span>
                      </div>
                    )}
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
          <div className="max-h-[90vh] w-full max-w-4xl rounded-lg bg-white flex flex-col">
            {/* Fixed header with close button */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Import Transport Details from Excel
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview([]);
                }}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-6">
            
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
                  <p><strong>Optional Columns:</strong> Description, Address, City, State, District, Pincode, Phone Number, Email ID, GST Number</p>
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
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Email</th>
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
                            <td className="px-3 py-2 text-gray-600">{row.email_id || '-'}</td>
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
        </div>
      )}

      {/* Create/Edit Transport Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl rounded-lg bg-white flex flex-col">
            {/* Fixed header with close button */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTransport ? 'Edit Transport' : 'Create New Transport'}
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-6">
            
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

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={handlePincodeChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter pincode"
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
                  Email ID
                </label>
                <input
                  type="email"
                  value={formData.email_id}
                  onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
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
        </div>
      )}

      {/* View Transport Modal */}
      {showViewModal && selectedTransport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Transport Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4">
              <div className="space-y-3">
                {/* Transport Name */}
                <div className="flex items-center">
                  <Truck className="mr-3 h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{selectedTransport.transport_name}</span>
                </div>

                {/* Description */}
                {selectedTransport.description && (
                  <div className="text-sm text-gray-700 ml-7">
                    {selectedTransport.description}
                  </div>
                )}

                {/* Phone Number */}
                {selectedTransport.phone_number && (
                  <div className="flex items-center">
                    <Phone className="mr-3 h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{selectedTransport.phone_number}</span>
                  </div>
                )}

                {/* Email ID */}
                {selectedTransport.email_id && (
                  <div className="flex items-center">
                    <Building className="mr-3 h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{selectedTransport.email_id}</span>
                  </div>
                )}

                {/* Address */}
                {(selectedTransport.address || selectedTransport.city || selectedTransport.state || selectedTransport.district || selectedTransport.pincode) && (
                  <div className="flex items-start">
                    <MapPin className="mr-3 mt-0.5 h-4 w-4 text-gray-400" />
                    <div className="text-sm text-gray-700">
                      {selectedTransport.address && (
                        <div className="mb-1">{selectedTransport.address}</div>
                      )}
                      <div>
                        {selectedTransport.city && <span>{selectedTransport.city}</span>}
                        {selectedTransport.district && <span>, {selectedTransport.district}</span>}
                        {selectedTransport.state && <span>, {selectedTransport.state}</span>}
                        {selectedTransport.pincode && <span> - {selectedTransport.pincode}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* GST Number */}
                {selectedTransport.gst_number && (
                  <div className="flex items-center">
                    <Building className="mr-3 h-4 w-4 text-gray-400" />
                    <span className="rounded border bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900">
                      {selectedTransport.gst_number}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default TransportEntry;