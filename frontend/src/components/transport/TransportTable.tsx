import React from 'react';
import { Edit2, Trash2, Truck, Phone, MapPin } from 'lucide-react';
import { Transport } from '../../lib/api';

interface TransportTableProps {
  transports: Transport[];
  onView: (transport: Transport) => void;
  onEdit: (transport: Transport) => void;
  onDelete: (id: string, name: string) => void;
}

export const TransportTable: React.FC<TransportTableProps> = ({ 
  transports, 
  onView, 
  onEdit, 
  onDelete 
}) => {
  return (
    <table className="min-w-full divide-y divide-gray-200">
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
        {transports.map((transport) => (
          <tr 
            key={transport.id} 
            className="transition-colors duration-200 hover:bg-gray-50 cursor-pointer"
            onClick={() => onView(transport)}
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
                  <div className="max-w-xs">
                    {transport.address && (
                      <div className="mb-1">{transport.address}</div>
                    )}
                    {(transport.city || transport.state || transport.district || transport.pincode) && (
                      <div className="text-gray-600">
                        {transport.pincode ? `${[transport.city, transport.district, transport.state].filter(Boolean).length ? ' - ' : ''}${transport.pincode}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              ) : <div className="text-sm text-gray-500">-</div>}
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
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
