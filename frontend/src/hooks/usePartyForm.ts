import { useState } from 'react';
import { api, Party, PartyPhoneNumber } from '../lib/api';

interface PartyFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  phone_number: string;
  email_id: string;
  gst_number: string;
  grade: string;
  preferred_transport_1: string;
  preferred_transport_2: string;
  default_discount: string;
}

const initialFormData: PartyFormData = {
  name: '',
  description: '',
  address: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
  phone_number: '',
  email_id: '',
  gst_number: '',
  grade: '',
  preferred_transport_1: '',
  preferred_transport_2: '',
  default_discount: ''
};

export const usePartyForm = () => {
  const [formData, setFormData] = useState<PartyFormData>(initialFormData);
  const [gstError, setGstError] = useState('');
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<PartyPhoneNumber[]>([
    { phone_number: '', contact_name: '', designation: '', is_default: true }
  ]);

  const validateGSTNumber = (gstNumber: string) => {
    if (!gstNumber) {
      setGstError('');
      return true;
    }
    
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    
    if (!gstRegex.test(gstNumber.toUpperCase())) {
      setGstError('Invalid GST number format. Please enter a valid GSTIN (e.g., 22AAAAA0000A1Z5)');
      return false;
    }
    
    setGstError('');
    return true;
  };

  const handleGSTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setFormData({ ...formData, gst_number: value });
    validateGSTNumber(value);
  };

  const validateForm = () => {
    return validateGSTNumber(formData.gst_number);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setPhoneNumbers([{ phone_number: '', contact_name: '', designation: '', is_default: true }]);
    setEditingParty(null);
    setGstError('');
  };

  const loadPartyForEdit = async (party: Party, setDistricts: (districts: string[]) => void, setCities: (cities: any[]) => void, setSelectedDistrict: (district: string) => void) => {
    setEditingParty(party);
    setFormData({
      name: party.name,
      description: party.description,
      address: party.address,
      city: party.city,
      district: party.district || '',
      state: party.state,
      pincode: party.pincode,
      phone_number: party.phone_number,
      email_id: party.email_id || '',
      gst_number: party.gst_number,
      grade: party.grade || '',
      preferred_transport_1: party.preferred_transport_1 || '',
      preferred_transport_2: party.preferred_transport_2 || '',
      default_discount: party.default_discount || ''
    });
    
    // Load districts for editing
    if (party.state) {
      try {
        const districtData = await api.fetchDistricts(party.state);
        setDistricts(districtData.districts);
      } catch (err) {
        console.error('Failed to load location data:', err);
      }
    }

    // Load phone numbers for this party
    try {
      const phoneData = await api.fetchPartyPhoneNumbers(party.id);
      if (phoneData.phoneNumbers && phoneData.phoneNumbers.length > 0) {
        setPhoneNumbers(phoneData.phoneNumbers);
      } else {
        setPhoneNumbers([{ phone_number: '', contact_name: '', designation: '', is_default: true }]);
      }
    } catch (err) {
      console.error('Failed to load phone numbers:', err);
      setPhoneNumbers([{ phone_number: '', contact_name: '', designation: '', is_default: true }]);
    }
  };

  const addPhoneNumber = () => {
    if (phoneNumbers.length < 5) {
      setPhoneNumbers([...phoneNumbers, { phone_number: '', contact_name: '', designation: '', is_default: false }]);
    }
  };

  const removePhoneNumber = (index: number) => {
    if (phoneNumbers.length > 1) {
      const newPhoneNumbers = phoneNumbers.filter((_, i) => i !== index);
      if (phoneNumbers[index].is_default && newPhoneNumbers.length > 0) {
        newPhoneNumbers[0].is_default = true;
      }
      setPhoneNumbers(newPhoneNumbers);
    }
  };

  const updatePhoneNumber = (index: number, field: keyof PartyPhoneNumber, value: string | boolean) => {
    const newPhoneNumbers = [...phoneNumbers];
    newPhoneNumbers[index] = { ...newPhoneNumbers[index], [field]: value };
    
    if (field === 'is_default' && value === true) {
      newPhoneNumbers.forEach((pn, i) => {
        if (i !== index) pn.is_default = false;
      });
    }
    
    setPhoneNumbers(newPhoneNumbers);
  };

  return {
    formData,
    setFormData,
    gstError,
    phoneNumbers,
    setPhoneNumbers,
    editingParty,
    handleGSTChange,
    validateForm,
    resetForm,
    loadPartyForEdit,
    addPhoneNumber,
    removePhoneNumber,
    updatePhoneNumber
  };
};
