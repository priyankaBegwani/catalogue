import React from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { PartyPhoneNumber } from '../../lib/api';

interface PartyFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: {
    name: string;
    description: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone_number: string;
    email_id: string;
    gst_number: string;
    grade: string;
    preferred_transport_1: string;
    preferred_transport_2: string;
    default_discount: string;
  };
  states: string[];
  districts: string[];
  cities: Array<{ city_name: string; zipcode: string }>;
  selectedDistrict: string;
  transports: Array<{ id: string; transport_name: string }>;
  phoneNumbers: PartyPhoneNumber[];
  gstError: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormDataChange: (updates: any) => void;
  onStateChange: (state: string) => void;
  onDistrictChange: (district: string) => void;
  onCityChange: (city: string) => void;
  onPincodeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGSTChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddPhoneNumber: () => void;
  onRemovePhoneNumber: (index: number) => void;
  onUpdatePhoneNumber: (index: number, field: keyof PartyPhoneNumber, value: string | boolean) => void;
}

export const PartyFormModal: React.FC<PartyFormModalProps> = ({
  isOpen,
  isEditing,
  formData,
  states,
  districts,
  cities,
  selectedDistrict,
  transports,
  phoneNumbers,
  gstError,
  loading,
  onClose,
  onSubmit,
  onFormDataChange,
  onStateChange,
  onDistrictChange,
  onCityChange,
  onPincodeChange,
  onGSTChange,
  onAddPhoneNumber,
  onRemovePhoneNumber,
  onUpdatePhoneNumber
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative flex h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Party' : 'Create New Party'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="Close modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6">
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Party Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormDataChange({ name: e.target.value })}
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
              onChange={(e) => onFormDataChange({ description: e.target.value })}
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
              onChange={(e) => onFormDataChange({ address: e.target.value })}
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
              onChange={onPincodeChange}
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
                onChange={(e) => onStateChange(e.target.value)}
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
                onChange={(e) => onDistrictChange(e.target.value)}
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
                City / Town / Locality
              </label>
              <select
                value={formData.city}
                onChange={(e) => onCityChange(e.target.value)}
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

          {/* Phone Numbers Section */}
          <div className="border-t pt-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Phone Numbers
              </label>
              {phoneNumbers.length < 5 && (
                <button
                  type="button"
                  onClick={onAddPhoneNumber}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Add Phone Number
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {phoneNumbers.map((phoneNumber, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber.phone_number}
                        onChange={(e) => onUpdatePhoneNumber(index, 'phone_number', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="10-digit number"
                        maxLength={10}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={phoneNumber.contact_name}
                        onChange={(e) => onUpdatePhoneNumber(index, 'contact_name', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={phoneNumber.designation}
                        onChange={(e) => onUpdatePhoneNumber(index, 'designation', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Manager"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={phoneNumber.is_default}
                        onChange={() => onUpdatePhoneNumber(index, 'is_default', true)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs">Default for communication</span>
                    </label>
                    
                    {phoneNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemovePhoneNumber(index)}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                      >
                        <Minus className="h-3 w-3" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email ID
            </label>
            <input
              type="email"
              value={formData.email_id}
              onChange={(e) => onFormDataChange({ email_id: e.target.value })}
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
              onChange={onGSTChange}
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

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Client Grade
            </label>
            <select
              value={formData.grade}
              onChange={(e) => onFormDataChange({ grade: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Grade</option>
              <option value="A+">A+ (Premium Client)</option>
              <option value="A">A (Reliable Client)</option>
              <option value="B">B (Average Client)</option>
              <option value="C">C (Risky Client)</option>
              <option value="D">D (High Risk / Problematic)</option>
            </select>
            {formData.grade && (
              <p className="mt-1 text-xs text-gray-600">
                {formData.grade === 'A+' && '✓ High volume + always on-time payment + strong relationship'}
                {formData.grade === 'A' && '✓ Good volume + mostly on-time payment'}
                {formData.grade === 'B' && '⚠ Moderate orders + occasional delays'}
                {formData.grade === 'C' && '⚠ Low volume OR frequent payment delays'}
                {formData.grade === 'D' && '⚠ Payment issues / returns / disputes'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Preferred Transport 1
              </label>
              <select
                value={formData.preferred_transport_1}
                onChange={(e) => onFormDataChange({ preferred_transport_1: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Transport</option>
                {transports.map((transport) => (
                  <option key={transport.id} value={transport.id}>
                    {transport.transport_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Preferred Transport 2
              </label>
              <select
                value={formData.preferred_transport_2}
                onChange={(e) => onFormDataChange({ preferred_transport_2: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Transport</option>
                {transports.map((transport) => (
                  <option key={transport.id} value={transport.id}>
                    {transport.transport_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Default Discount Section */}
          <div className="border-t pt-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Discount Tier
              </label>
              <select
                value={formData.default_discount}
                onChange={(e) => onFormDataChange({ default_discount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Discount Tier</option>
                <option value="gold">Gold - 47.45% Discount</option>
                <option value="silver">Silver - 45% Discount</option>
                <option value="copper">Copper - 40% Discount</option>
                <option value="retail">Retail - 30% Discount</option>
              </select>
              {formData.default_discount && (
                <p className="mt-1 text-xs text-gray-600">
                  {formData.default_discount === 'gold' && '✓ 47.45% discount will be applied to all prices for this party'}
                  {formData.default_discount === 'silver' && '✓ 45% discount will be applied to all prices for this party'}
                  {formData.default_discount === 'copper' && '✓ 40% discount will be applied to all prices for this party'}
                  {formData.default_discount === 'retail' && '✓ 30% discount will be applied to all prices for this party'}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors duration-200 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Party' : 'Create Party')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
