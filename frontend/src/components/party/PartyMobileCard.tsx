import React from 'react';
import { Edit2, Trash2, Users, MapPin, Phone, Building } from 'lucide-react';
import { Party } from '../../lib/api';
import { formatDate } from '../../utils/party/exportHelpers';

interface PartyMobileCardProps {
  parties: Party[];
  onView: (party: Party) => void;
  onEdit: (party: Party) => void;
  onDelete: (id: string, name: string) => void;
}

export const PartyMobileCard: React.FC<PartyMobileCardProps> = ({
  parties,
  onView,
  onEdit,
  onDelete
}) => {
  return (
    <div className="space-y-4 p-4">
      {parties.map((party) => (
        <div 
          key={party.id} 
          className="rounded-lg border bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => onView(party)}
        >
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
              <span className="font-medium">Created at:</span> {formatDate(party.created_at)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 border-t pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(party);
              }}
              className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
              title="Edit party"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(party.id, party.name);
              }}
              className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
              title="Delete party"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
