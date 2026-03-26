import React from 'react';
import { X, Truck, Building, Phone, MapPin } from 'lucide-react';
import { Transport } from '../../lib/api';

interface ViewTransportModalProps {
  transport: Transport | null;
  onClose: () => void;
}

export const ViewTransportModal: React.FC<ViewTransportModalProps> = ({ transport, onClose }) => {
  if (!transport) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-lg">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Transport Details</h2>
          <button
            onClick={onClose}
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
              <span className="font-medium text-gray-900">{transport.transport_name}</span>
            </div>

            {/* Description */}
            {transport.description && (
              <div className="text-sm text-gray-700 ml-7">
                {transport.description}
              </div>
            )}

            {/* Phone Number */}
            {transport.phone_number && (
              <div className="flex items-center">
                <Phone className="mr-3 h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{transport.phone_number}</span>
              </div>
            )}

            {/* Email ID */}
            {transport.email_id && (
              <div className="flex items-center">
                <Building className="mr-3 h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{transport.email_id}</span>
              </div>
            )}

            {/* Address */}
            {(transport.address || transport.city || transport.state || transport.district || transport.pincode) && (
              <div className="flex items-start">
                <MapPin className="mr-3 mt-0.5 h-4 w-4 text-gray-400" />
                <div className="text-sm text-gray-700">
                  {transport.address && (
                    <div className="mb-1">{transport.address}</div>
                  )}
                  <div>
                    {transport.city && <span>{transport.city}</span>}
                    {transport.district && <span>, {transport.district}</span>}
                    {transport.state && <span>, {transport.state}</span>}
                    {transport.pincode && <span> - {transport.pincode}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* GST Number */}
            {transport.gst_number && (
              <div className="flex items-center">
                <Building className="mr-3 h-4 w-4 text-gray-400" />
                <span className="rounded border bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900">
                  {transport.gst_number}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
