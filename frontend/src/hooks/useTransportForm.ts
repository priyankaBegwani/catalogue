import { useState } from 'react';
import { Transport } from '../lib/api';
import { validateGSTNumber, validatePhoneNumber } from '../utils/transport/validation';

export interface TransportFormData {
  transport_name: string;
  description: string;
  address: string;
  phone_number: string;
  email_id: string;
  gst_number: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
}

export const useTransportForm = () => {
  const [formData, setFormData] = useState<TransportFormData>({
    transport_name: '',
    description: '',
    address: '',
    phone_number: '',
    email_id: '',
    gst_number: '',
    state: '',
    district: '',
    city: '',
    pincode: ''
  });
  
  const [gstError, setGstError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, phone_number: value }));
    
    const validation = validatePhoneNumber(value);
    setPhoneError(validation.error);
  };

  const handleGSTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, gst_number: value }));
    
    const validation = validateGSTNumber(value);
    setGstError(validation.error);
  };

  const validateForm = (): boolean => {
    const gstValidation = validateGSTNumber(formData.gst_number);
    const phoneValidation = validatePhoneNumber(formData.phone_number);
    
    setGstError(gstValidation.error);
    setPhoneError(phoneValidation.error);
    
    return gstValidation.isValid && phoneValidation.isValid;
  };

  const resetForm = () => {
    setFormData({
      transport_name: '',
      description: '',
      address: '',
      phone_number: '',
      email_id: '',
      gst_number: '',
      state: '',
      district: '',
      city: '',
      pincode: ''
    });
    setGstError('');
    setPhoneError('');
    setEditingTransport(null);
  };

  const loadTransportForEdit = async (transport: Transport) => {
    setEditingTransport(transport);
    setFormData({
      transport_name: transport.transport_name,
      description: transport.description,
      address: transport.address || '',
      phone_number: transport.phone_number || '',
      email_id: transport.email_id || '',
      gst_number: transport.gst_number || '',
      state: transport.state || '',
      district: transport.district || '',
      city: transport.city || '',
      pincode: transport.pincode || ''
    });
  };

  return {
    formData,
    setFormData,
    gstError,
    phoneError,
    editingTransport,
    handlePhoneChange,
    handleGSTChange,
    validateForm,
    resetForm,
    loadTransportForEdit
  };
};
