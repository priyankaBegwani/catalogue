import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Package, Calendar, Truck, FileText, CheckCircle, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PartyDetails {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone_number: string;
}

export function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [partyDetails, setPartyDetails] = useState<PartyDetails | null>(null);
  const [transportOptions, setTransportOptions] = useState<any[]>([]);
  const [partyList, setPartyList] = useState<any[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    party_name: '',
    expected_delivery_date: '',
    transport: '',
    remarks: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadCheckoutData();
    }
  }, [isOpen, user]);

  const loadCheckoutData = async () => {
    try {
      setLoadingData(true);
      
      // Debug logging
      console.log('CheckoutModal - User object:', user);
      console.log('CheckoutModal - User role:', user?.role);
      console.log('CheckoutModal - User party_id:', user?.party_id);
      console.log('CheckoutModal - Should show dropdown:', user?.role === 'admin' || !user?.party_id);
      
      // Fetch transport options
      const transports = await api.getTransportOptions();
      setTransportOptions(transports);

      // If user is admin or has no party_id, fetch all parties for selection
      if (user?.role === 'admin' || !user?.party_id) {
        const partiesResponse = await api.fetchParties();
        setPartyList(partiesResponse.parties || []);
      } else if (user?.party_id) {
        // Fetch party details if user has associated party (retailer)
        const party = await api.getPartyById(user.party_id);
        setPartyDetails({
          id: party.id,
          name: party.name || '',
          address: party.address || '',
          city: party.city || '',
          state: party.state || '',
          pincode: party.pincode || '',
          phone_number: party.phone_number || ''
        });
        
        // Pre-fill party name
        setFormData(prev => ({ ...prev, party_name: party.name || '' }));
      } else if (user?.parties?.name) {
        // Fallback to user.parties if available
        setFormData(prev => ({ ...prev, party_name: user.parties?.name || '' }));
      }
    } catch (err) {
      console.error('Failed to load checkout data:', err);
      // Don't show error, just continue with empty data
    } finally {
      setLoadingData(false);
    }
  };

  const handlePartySelection = async (partyId: string) => {
    setSelectedPartyId(partyId);
    
    if (!partyId) {
      setPartyDetails(null);
      setFormData(prev => ({ ...prev, party_name: '' }));
      return;
    }

    try {
      const party = await api.getPartyById(partyId);
      setPartyDetails({
        id: party.id,
        name: party.name || '',
        address: party.address || '',
        city: party.city || '',
        state: party.state || '',
        pincode: party.pincode || '',
        phone_number: party.phone_number || ''
      });
      
      // Update party name in form
      setFormData(prev => ({ ...prev, party_name: party.name || '' }));
    } catch (err) {
      console.error('Failed to load party details:', err);
      setError('Failed to load party details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.party_name.trim()) {
      setError('Party name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await api.checkout({
        party_name: formData.party_name.trim(),
        expected_delivery_date: formData.expected_delivery_date || undefined,
        transport: formData.transport || undefined,
        remarks: formData.remarks || undefined
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      party_name: '',
      expected_delivery_date: '',
      transport: '',
      remarks: ''
    });
    setError('');
    setSuccess(false);
    setPartyDetails(null);
    setTransportOptions([]);
    setPartyList([]);
    setSelectedPartyId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-primary">Checkout</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Order Created Successfully!</h3>
            <p className="text-gray-600">Your order has been placed and your cart has been cleared.</p>
          </div>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {loadingData && (
                <div className="text-center py-4 text-gray-500">
                  Loading party details...
                </div>
              )}

              {/* Party Selection Dropdown (for admin or users without party) */}
              {(user?.role === 'admin' || !user?.party_id) && partyList.length > 0 && (
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <Package className="w-4 h-4" />
                    <span>Select Party *</span>
                  </label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => handlePartySelection(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  >
                    <option value="">Choose a party...</option>
                    {partyList.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Party Details Section */}
              {partyDetails && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 mb-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span>Party Details</span>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600">Party Name</label>
                    <p className="text-sm font-semibold text-gray-900">{partyDetails.name}</p>
                  </div>

                  {partyDetails.address && (
                    <div>
                      <label className="flex items-center space-x-1 text-xs font-medium text-gray-600 mb-1">
                        <MapPin className="w-3 h-3" />
                        <span>Address</span>
                      </label>
                      <p className="text-sm text-gray-700">
                        {partyDetails.address}
                        {partyDetails.city && `, ${partyDetails.city}`}
                        {partyDetails.state && `, ${partyDetails.state}`}
                        {partyDetails.pincode && ` - ${partyDetails.pincode}`}
                      </p>
                    </div>
                  )}

                  {partyDetails.phone_number && (
                    <div>
                      <label className="text-xs font-medium text-gray-600">Phone</label>
                      <p className="text-sm text-gray-700">{partyDetails.phone_number}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Party Name Input (fallback for manual entry) */}
              {!partyDetails && partyList.length === 0 && (
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <Package className="w-4 h-4" />
                    <span>Party Name *</span>
                  </label>
                  <input
                    type="text"
                    value={formData.party_name}
                    onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter party name"
                  />
                </div>
              )}

              {/* Expected Delivery Date */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Expected Delivery Date</span>
                </label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Transport */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Truck className="w-4 h-4" />
                  <span>Transport</span>
                </label>
                <select
                  value={formData.transport}
                  onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                >
                  <option value="">Select transport (optional)</option>
                  {transportOptions.map((transport) => (
                    <option key={transport.id} value={transport.transport_name}>
                      {transport.transport_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4" />
                  <span>Remarks</span>
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder="Add any special instructions or notes (optional)"
                />
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Creating Order...' : 'Place Order'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
