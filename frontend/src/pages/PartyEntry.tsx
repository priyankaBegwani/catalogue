import React, { useState, useEffect } from 'react';
import { api, Party } from '../lib/api';
import * as XLSX from 'xlsx';
import { Plus, Search, Edit2, Trash2, Users, MapPin, Phone, Upload, Download, Building, Award } from 'lucide-react';
import { PartyTierSelector } from '../components/PartyTierSelector';
import { getPricingConfig } from '../utils/pricingTiers';


const PartyEntry: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<Array<{ city_name: string; zipcode: string }>>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone_number: '',
    gst_number: '',
    volume_tier_id: '',
    relationship_tier_id: '',
    hybrid_auto_tier_id: '',
    hybrid_manual_override: false,
    hybrid_override_tier_id: '',
    monthly_order_count: 0
  });
  const [gstError, setGstError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    fetchParties();
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
    setFormData({ ...formData, state, city: '', pincode: '' });
    setSelectedDistrict('');
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
    setSelectedDistrict(district);
    setFormData({ ...formData, city: '', pincode: '' });
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

  const fetchParties = async () => {
     try {
      setLoading(true);
      const data = await api.fetchParties();
      setParties(data.parties);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load parties');
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

     await api.createOrEditParty({
      ...formData
     }, editingParty);
      
      resetForm();
      fetchParties();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingParty ? 'update' : 'create'} party`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (party: Party) => {
    setEditingParty(party);
    setFormData({
      name: party.name,
      description: party.description,
      address: party.address,
      city: party.city,
      state: party.state,
      pincode: party.pincode,
      phone_number: party.phone_number,
      gst_number: party.gst_number,
      volume_tier_id: party.volume_tier_id || '',
      relationship_tier_id: party.relationship_tier_id || '',
      hybrid_auto_tier_id: party.hybrid_auto_tier_id || '',
      hybrid_manual_override: party.hybrid_manual_override || false,
      hybrid_override_tier_id: party.hybrid_override_tier_id || '',
      monthly_order_count: party.monthly_order_count || 0
    });
    
    // Load districts and cities for editing
    if (party.state) {
      try {
        const districtData = await api.fetchDistricts(party.state);
        setDistricts(districtData.districts);
        
        // For parties, we need to find the district from the city
        // Since party table doesn't have district field, we'll load all cities for now
        // This is a limitation - ideally party table should also have district field
      } catch (err) {
        console.error('Failed to load location data:', err);
      }
    }
    
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string, partyName: string) => {
      if (!confirm(`Are you sure you want to delete party "${partyName}"?`)) return;
      try {
          await api.deleteParty(id);
          await fetchParties();
          setError(''); // Clear any previous errors
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to delete party';
          setError(errorMessage);
          console.error('Party deletion error:', err);
        }
  };
    

  const generateSampleExcel = () => {
    const sampleData = [
      {
        'Party Name': 'ABC Textiles Ltd',
        'Description': 'Leading textile manufacturer',
        'Address': '123 Industrial Area, Sector 5',
        'City': 'Mumbai',
        'State': 'Maharashtra',
        'Pincode': '400001',
        'Phone Number': '9876543210',
        'GST Number': '27AAAAA0000A1Z5'
      },
      {
        'Party Name': 'XYZ Fabrics Pvt Ltd',
        'Description': 'Premium fabric supplier',
        'Address': '456 Textile Hub, Block B',
        'City': 'Surat',
        'State': 'Gujarat',
        'Pincode': '395007',
        'Phone Number': '9123456789',
        'GST Number': '24BBBBB1111B2Y6'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Party Details');
    
    // Set column widths
    ws['!cols'] = [
      { width: 25 }, // Party Name
      { width: 30 }, // Description
      { width: 35 }, // Address
      { width: 15 }, // City
      { width: 15 }, // State
      { width: 10 }, // Pincode
      { width: 15 }, // Phone Number
      { width: 20 }  // GST Number
    ];

    XLSX.writeFile(wb, 'party_details_sample.xlsx');
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
          name: row['Party Name'] || '',
          description: row['Description'] || '',
          address: row['Address'] || '',
          city: row['City'] || '',
          state: row['State'] || '',
          pincode: row['Pincode'] || '',
          phone_number: row['Phone Number'] || '',
          gst_number: row['GST Number'] || '',
          isValid: !!(row['Party Name']) // At least party name is required
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

       const result = await api.importParties(validRows);
       
      if (result.successCount > 0) {
        fetchParties(); // Refresh the parties list
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone_number: '',
      gst_number: '',
      volume_tier_id: '',
      relationship_tier_id: '',
      hybrid_auto_tier_id: '',
      hybrid_manual_override: false,
      hybrid_override_tier_id: '',
      monthly_order_count: 0
    });
    setSelectedDistrict('');
    setDistricts([]);
    setCities([]);
    setShowCreateForm(false);
    setEditingParty(null);
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

  const filteredParties = parties.filter(party =>
    //party.party_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.gst_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && parties.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-600">Loading parties...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Party Entry</h1>
          <p className="mt-1 text-gray-600">Manage party information and contacts</p>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
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
            Sample Format
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Party
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
            placeholder="Search parties by ID, name, city, state, or GST number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Parties Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  GST Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredParties.map((party) => (
                <tr key={party.id} className="transition-colors duration-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{party.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs text-sm text-gray-900">
                      {party.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {party.phone_number && (
                      <div className="mb-1 flex items-center text-sm text-gray-900">
                        <Phone className="mr-1 h-3 w-3 text-gray-400" />
                        {party.phone_number}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {party.gst_number && (
                      <div className="rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-900">
                        {party.gst_number}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {party.address && (
                      <div className="max-w-xs text-sm text-gray-900">{party.address}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(party.city || party.state) && (
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="mr-1 h-3 w-3 text-gray-400" />
                        <span>
                          {party.city}{party.city && party.state && ', '}{party.state}
                        </span>
                      </div>
                    )}
                    {party.pincode && (
                      <div className="text-sm text-gray-500">PIN: {party.pincode}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">{party.user_profiles?.full_name}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500">{formatDate(party.created_at)}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(party)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit party"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(party.id, party.name)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete party"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
            <div className="space-y-4 p-4">
              {filteredParties.map((party) => (
                <div key={party.id} className="rounded-lg border bg-gray-50 p-4">
                  {/* Party Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{party.name}</span>
                    </div>
                    <span className="rounded bg-white px-2 py-1 font-mono text-xs text-gray-500">
                      {party.party_id}
                    </span>
                  </div>

                  {/* Description */}
                  {party.description && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600">{party.description}</p>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="mb-3 space-y-1">
                    {party.phone_number && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="mr-2 h-3 w-3 text-gray-400" />
                        <span className="text-xs">{party.phone_number}</span>
                      </div>
                    )}
                    {party.gst_number && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Building className="mr-2 h-3 w-3 text-gray-400" />
                        <span className="rounded border bg-white px-2 py-1 font-mono text-xs">
                          {party.gst_number}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  {(party.address || party.city || party.state) && (
                    <div className="mb-3">
                      <div className="flex items-start text-sm text-gray-900">
                        <MapPin className="mr-2 mt-0.5 h-3 w-3 text-gray-400" />
                        <div className="text-xs">
                          {party.address && (
                            <div className="mb-1">{party.address}</div>
                          )}
                          <div>
                            {party.city}{party.city && party.state && ', '}{party.state}
                            {party.pincode && ` - ${party.pincode}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Created Info */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Created by:</span> {party.user_profiles?.full_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(party.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 border-t pt-2">
                    <button
                      onClick={() => handleEdit(party)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                      title="Edit party"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(party.id, party.name)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                      title="Delete party"
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

      {/* Create/Edit Party Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {editingParty ? 'Edit Party' : 'Create New Party'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Party Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter party name"
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
                  placeholder="Enter party description"
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
                    value={selectedDistrict} 
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
                    disabled={!selectedDistrict}
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

              {/* Pricing Tier Section */}
              <div className="border-t pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Pricing Tier</h3>
                </div>
                <PartyTierSelector
                  partyId={editingParty?.id}
                  volumeTierId={formData.volume_tier_id}
                  relationshipTierId={formData.relationship_tier_id}
                  hybridAutoTierId={formData.hybrid_auto_tier_id}
                  hybridManualOverride={formData.hybrid_manual_override}
                  hybridOverrideTierId={formData.hybrid_override_tier_id}
                  monthlyOrderCount={formData.monthly_order_count}
                  onTierChange={(tierData) => {
                    setFormData({
                      ...formData,
                      volume_tier_id: tierData.volumeTierId || formData.volume_tier_id,
                      relationship_tier_id: tierData.relationshipTierId || formData.relationship_tier_id,
                      hybrid_auto_tier_id: tierData.hybridAutoTierId || formData.hybrid_auto_tier_id,
                      hybrid_manual_override: tierData.hybridManualOverride !== undefined ? tierData.hybridManualOverride : formData.hybrid_manual_override,
                      hybrid_override_tier_id: tierData.hybridOverrideTierId || formData.hybrid_override_tier_id
                    });
                  }}
                />
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
                  {loading ? 'Saving...' : (editingParty ? 'Update Party' : 'Create Party')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Import Party Details from Excel
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
                  Upload an Excel file (.xlsx or .xls) with party details. Download the sample format to see the expected structure.
                </p>
              </div>

              {/* Expected Format Info */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-2 text-sm font-medium text-blue-900">Expected Excel Format:</h3>
                <div className="space-y-1 text-xs text-blue-800">
                  <p><strong>Required Column:</strong> Party Name</p>
                  <p><strong>Optional Columns:</strong> Description, Address, City, State, Pincode, Phone Number, GST Number</p>
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
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Party Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">City</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">State</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">GST</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importPreview.map((row, index) => (
                          <tr key={index} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                            <td className="px-3 py-2 text-gray-900">{row.rowNumber}</td>
                            <td className="px-3 py-2 text-gray-900">{row.name || '-'}</td>
                            <td className="px-3 py-2 text-gray-900">{row.city || '-'}</td>
                            <td className="px-3 py-2 text-gray-900">{row.state || '-'}</td>
                            <td className="px-3 py-2 text-gray-900">{row.gst_number || '-'}</td>
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
                  onClick={handleImportData}
                  disabled={importLoading || !importPreview.length || !importPreview.some(row => row.isValid)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                >
                  {importLoading ? 'Importing...' : `Import ${importPreview.filter(row => row.isValid).length} Parties`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PartyEntry;