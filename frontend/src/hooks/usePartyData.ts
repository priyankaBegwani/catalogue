import { useState, useEffect, useMemo } from 'react';
import { api, Party } from '../lib/api';

export const usePartyData = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchParties();
  }, []);

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

  const createParty = async (partyData: any, phoneNumbers: any[]) => {
    try {
      const result = await api.createOrEditParty(partyData, null);
      const partyId = result?.id;
      
      if (partyId) {
        await api.savePartyPhoneNumbers(partyId, phoneNumbers);
      }
      
      await fetchParties();
      return result;
    } catch (err) {
      throw err;
    }
  };

  const updateParty = async (partyData: any, editingParty: Party, phoneNumbers: any[]) => {
    try {
      const result = await api.createOrEditParty(partyData, editingParty);
      const partyId = editingParty.id;
      
      if (partyId) {
        await api.savePartyPhoneNumbers(partyId, phoneNumbers);
      }
      
      await fetchParties();
      return result;
    } catch (err) {
      throw err;
    }
  };

  const deleteParty = async (id: string) => {
    try {
      await api.deleteParty(id);
      await fetchParties();
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete party';
      setError(errorMessage);
      throw err;
    }
  };

  const importParties = async (validRows: any[]) => {
    try {
      const result = await api.importParties(validRows);
      
      if (result.successCount > 0) {
        await fetchParties();
      }
      
      return result;
    } catch (err) {
      throw err;
    }
  };

  const filteredParties = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return parties.filter(party =>
      party.name.toLowerCase().includes(term) ||
      party.description.toLowerCase().includes(term) ||
      (party.address && party.address.toLowerCase().includes(term)) ||
      (party.phone_number && party.phone_number.toLowerCase().includes(term)) ||
      (party.email_id && party.email_id.toLowerCase().includes(term)) ||
      (party.gst_number && party.gst_number.toLowerCase().includes(term)) ||
      (party.pincode && party.pincode.toLowerCase().includes(term)) ||
      (party.city && party.city.toLowerCase().includes(term)) ||
      (party.state && party.state.toLowerCase().includes(term))
    );
  }, [parties, searchTerm]);

  return {
    parties,
    filteredParties,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    setError,
    createParty,
    updateParty,
    deleteParty,
    importParties
  };
};
