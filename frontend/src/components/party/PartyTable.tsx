import React from 'react';
import { Edit2, Trash2, MapPin, Phone } from 'lucide-react';
import { Party } from '../../lib/api';
import { formatDate } from '../../utils/party/exportHelpers';

interface PartyTableProps {
  parties: Party[];
  onView: (party: Party) => void;
  onEdit: (party: Party) => void;
  onDelete: (id: string, name: string) => void;
}

export const PartyTable: React.FC<PartyTableProps> = ({
  parties,
  onView,
  onEdit,
  onDelete
}) => {
  return (
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
            Created At
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {parties.map((party) => (
          <tr 
            key={party.id} 
            className="transition-colors duration-200 hover:bg-gray-50 cursor-pointer"
            onClick={() => onView(party)}
          >
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
              <div className="text-sm text-gray-900">{formatDate(party.created_at)}</div>
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(party);
                  }}
                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                  title="Edit party"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(party.id, party.name);
                  }}
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
  );
};
