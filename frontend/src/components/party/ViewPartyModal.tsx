import React from 'react';
import { X, Users, Phone, MapPin, Building, Award } from 'lucide-react';
import { Party } from '../../lib/api';

interface ViewPartyModalProps {
  isOpen: boolean;
  party: Party | null;
  onClose: () => void;
}

export const ViewPartyModal: React.FC<ViewPartyModalProps> = ({
  isOpen,
  party,
  onClose
}) => {
  if (!isOpen || !party) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-lg">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Party Details</h2>
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
            {/* Party Name */}
            <div className="flex items-center">
              <Users className="mr-3 h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900">{party.name}</span>
            </div>

            {/* Description */}
            {party.description && (
              <div className="text-sm text-gray-700 ml-7">
                {party.description}
              </div>
            )}

            {/* Phone Number */}
            {party.phone_number && (
              <div className="flex items-center">
                <Phone className="mr-3 h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{party.phone_number}</span>
              </div>
            )}

            {/* Email ID */}
            {party.email_id && (
              <div className="flex items-center">
                <Building className="mr-3 h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{party.email_id}</span>
              </div>
            )}

            {/* Address */}
            {(party.address || party.city || party.state || party.pincode) && (
              <div className="flex items-start">
                <MapPin className="mr-3 mt-0.5 h-4 w-4 text-gray-400" />
                <div className="text-sm text-gray-700">
                  {party.address && (
                    <div className="mb-1">{party.address}</div>
                  )}
                  <div>
                    {party.city && <span>{party.city}</span>}
                    {party.state && <span>, {party.state}</span>}
                    {party.pincode && <span> - {party.pincode}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* GST Number */}
            {party.gst_number && (
              <div className="flex items-center">
                <Building className="mr-3 h-4 w-4 text-gray-400" />
                <span className="rounded border bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900">
                  {party.gst_number}
                </span>
              </div>
            )}

            {/* Grade */}
            {party.grade && (
              <div className="flex items-center">
                <Award className="mr-3 h-4 w-4 text-gray-400" />
                <div>
                  <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                    party.grade === 'A+' ? 'bg-green-100 text-green-800' :
                    party.grade === 'A' ? 'bg-blue-100 text-blue-800' :
                    party.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                    party.grade === 'C' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Grade {party.grade}
                  </span>
                  <span className="ml-2 text-xs text-gray-600">
                    {party.grade === 'A+' && '(Premium Client)'}
                    {party.grade === 'A' && '(Reliable Client)'}
                    {party.grade === 'B' && '(Average Client)'}
                    {party.grade === 'C' && '(Risky Client)'}
                    {party.grade === 'D' && '(High Risk)'}
                  </span>
                </div>
              </div>
            )}

            {/* Party ID */}
            {party.party_id && (
              <div className="flex items-center">
                <Award className="mr-3 h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">Party ID: {party.party_id}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
