import React from 'react';
import { X } from 'lucide-react';
import { TransportFormData } from '../../hooks/useTransportForm';

interface TransportFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: TransportFormData;
  states: string[];
  districts: string[];
  cities: Array<{ city_name: string; zipcode: string; is_major_city: boolean }>;
  gstError: string;
  phoneError: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormDataChange: (data: Partial<TransportFormData>) => void;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGSTChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPincodeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStateChange: (state: string) => void;
  onDistrictChange: (district: string) => void;
  onCityChange: (city: string) => void;
}

export const TransportFormModal: React.FC<TransportFormModalProps> = ({
  isOpen,
  isEditing,
  formData,
  states,
  districts,
  cities,
  gstError,
  phoneError,
  onClose,
  onSubmit,
  onFormDataChange,
  onPhoneChange,
  onGSTChange,
  onPincodeChange,
  onStateChange,
  onDistrictChange,
  onCityChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative flex h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Transport Option' : 'Add New Transport Option'}
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
              Transport Name *
            </label>
            <input
              type="text"
              value={formData.transport_name}
              onChange={(e) => onFormDataChange({ transport_name: e.target.value })}
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
              onChange={(e) => onFormDataChange({ description: e.target.value })}
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
                value={formData.district}
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
                City
              </label>
              <select
                value={formData.city}
                onChange={(e) => onCityChange(e.target.value)}
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
              onChange={onPhoneChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                phoneError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter 10-digit mobile number"
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
              placeholder="22AAAAA0000A1Z5"
            />
            {gstError && (
              <p className="mt-1 text-sm text-red-600">{gstError}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
