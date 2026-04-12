import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { api, UserProfile, Party, UserPartyAssociation } from '../../lib/api';

interface PartyAssociationsModalProps {
  user: UserProfile;
  onClose: () => void;
}

export const PartyAssociationsModal: React.FC<PartyAssociationsModalProps> = ({ user, onClose }) => {
  const [associations, setAssociations] = useState<UserPartyAssociation[]>([]);
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [associationsData, partiesData] = await Promise.all([
        api.getUserPartyAssociations(user.id),
        api.fetchParties()
      ]);

      setAssociations(associationsData.associations);
      setAllParties(partiesData.parties);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddParty = async () => {
    if (!selectedPartyId) {
      setError('Please select a party');
      return;
    }

    // Check if already associated
    if (associations.some(a => a.party_id === selectedPartyId)) {
      setError('This party is already associated with the user');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await api.addPartyAssociation(user.id, selectedPartyId);
      await loadData();
      setSelectedPartyId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add party association');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveParty = async (associationId: string) => {
    if (!confirm('Are you sure you want to remove this party association?')) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await api.deletePartyAssociation(associationId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove party association');
    } finally {
      setSubmitting(false);
    }
  };

  const availableParties = allParties.filter(
    party => !associations.some(a => a.party_id === party.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative flex h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Manage Party Associations
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {user.full_name} - {user.user_roles?.role_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Add Party Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Add Party Association
            </h3>
            <div className="flex space-x-2">
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                disabled={submitting || loading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select a party to add</option>
                {availableParties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name} {party.city && `- ${party.city}`}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddParty}
                disabled={!selectedPartyId || submitting || loading}
                className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Associated Parties List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Associated Parties ({associations.length})
            </h3>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : associations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No party associations yet. Add parties above.
              </div>
            ) : (
              <div className="space-y-2">
                {associations.map((association) => (
                  <div
                    key={association.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {association.parties?.name}
                      </h4>
                      {(association.parties?.city || association.parties?.state) && (
                        <p className="text-sm text-gray-500">
                          {association.parties?.city}
                          {association.parties?.city && association.parties?.state && ', '}
                          {association.parties?.state}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Party ID: {association.parties?.party_id}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveParty(association.id)}
                      disabled={submitting}
                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Remove association"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
