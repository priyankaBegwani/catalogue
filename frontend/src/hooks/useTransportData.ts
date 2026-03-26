import { useState, useEffect, useMemo } from 'react';
import { api, Transport } from '../lib/api';

export const useTransportData = () => {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTransports();
  }, []);

  const fetchTransports = async () => {
    try {
      setLoading(true);
      const data = await api.fetchTransports();
      setTransports(data.transportOptions);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transport options');
    } finally {
      setLoading(false);
    }
  };

  const createTransport = async (formData: any) => {
    await api.createOrEditTransport(formData, null);
    await fetchTransports();
  };

  const updateTransport = async (formData: any, transport: Transport) => {
    await api.createOrEditTransport(formData, transport);
    await fetchTransports();
  };

  const deleteTransport = async (id: string, transportName: string) => {
    if (!confirm(`Are you sure you want to delete transport option "${transportName}"?`)) {
      return false;
    }

    try {
      await api.deleteTransport(id);
      await fetchTransports();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transport option');
      return false;
    }
  };

  const importTransports = async (data: any[]) => {
    await api.importTransports(data);
    await fetchTransports();
  };

  const filteredTransports = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return transports.filter(transport =>
      transport.transport_name.toLowerCase().includes(term) ||
      transport.description.toLowerCase().includes(term) ||
      (transport.phone_number && transport.phone_number.toLowerCase().includes(term)) ||
      (transport.email_id && transport.email_id.toLowerCase().includes(term)) ||
      (transport.gst_number && transport.gst_number.toLowerCase().includes(term)) ||
      (transport.pincode && transport.pincode.toLowerCase().includes(term)) ||
      (transport.city && transport.city.toLowerCase().includes(term)) ||
      (transport.district && transport.district.toLowerCase().includes(term)) ||
      (transport.state && transport.state.toLowerCase().includes(term)) ||
      (transport.address && transport.address.toLowerCase().includes(term))
    );
  }, [transports, searchTerm]);

  return {
    transports,
    filteredTransports,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    setError,
    fetchTransports,
    createTransport,
    updateTransport,
    deleteTransport,
    importTransports
  };
};
