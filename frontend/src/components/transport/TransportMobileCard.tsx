import React from 'react';
import { Edit2, Trash2, Truck, Phone, Building, MapPin } from 'lucide-react';
import { Transport } from '../../lib/api';

interface TransportMobileCardProps {
  transports: Transport[];
  onView: (transport: Transport) => void;
  onEdit: (transport: Transport) => void;
  onDelete: (id: string, name: string) => void;
}

export const TransportMobileCard: React.FC<TransportMobileCardProps> = ({ 
  transports, 
  onView, 
  onEdit, 
  onDelete 
}) => {
  return (
    <div className="space-y-4 p-4">
      {transports.map((transport) => (
        <div 
          key={transport.id} 
          className="rounded-lg border bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => onView(transport)}
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
                  onEdit(transport);
                }}
                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                title="Edit transport option"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(transport.id, transport.transport_name);
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
            {(transport.address || transport.city || transport.state || transport.district || transport.pincode) && (
              <div className="flex items-start text-sm text-gray-900">
                <MapPin className="mr-2 mt-0.5 h-3 w-3 text-gray-400" />
                <div className="text-xs">
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
  );
};
