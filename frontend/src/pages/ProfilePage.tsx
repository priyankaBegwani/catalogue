import { useState, useEffect } from 'react';
import { api, UserProfile, Party } from '../lib/api';
import { User, Building2, MapPin, Phone, Mail, Edit2, Save, X, Shield, Calendar } from 'lucide-react';

export function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Address form state
  const [addressForm, setAddressForm] = useState({
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone_number: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      
      const userProfile = await api.getProfile();
      setUser(userProfile);

      // If user has a party, fetch party details
      if (userProfile.party_id) {
        try {
          const partyData = await api.getPartyById(userProfile.party_id);
          setParty(partyData);
          setAddressForm({
            address: partyData.address || '',
            city: partyData.city || '',
            state: partyData.state || '',
            pincode: partyData.pincode || '',
            phone_number: partyData.phone_number || '',
          });
        } catch (partyError) {
          console.error('Party loading error:', partyError);
          setError('Failed to load party data');
          setParty(null);
        }
      } else {
        setParty(null);
      }
    } catch (err) {
      console.error('Profile loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAddress = () => {
    setIsEditingAddress(true);
    setError('');
    setSuccessMessage('');
  };

  const handleCancelEdit = () => {
    setIsEditingAddress(false);
    if (party) {
      setAddressForm({
        address: party.address || '',
        city: party.city || '',
        state: party.state || '',
        pincode: party.pincode || '',
        phone_number: party.phone_number || '',
      });
    }
  };

  const handleSaveAddress = async () => {
    if (!party) return;

    try {
      setIsSaving(true);
      setError('');
      
      await api.updateParty(party.id, {
        ...party,
        ...addressForm,
      });

      setSuccessMessage('Address updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsEditingAddress(false);
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update address');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account information and settings</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

     
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Profile Header */}
              <div className="bg-gradient-to-br from-primary to-primary-dark p-6 text-white">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-white bg-opacity-20 flex items-center justify-center mb-4">
                    <User className="w-12 h-12" />
                  </div>
                  <h2 className="text-xl font-bold text-center">{user.full_name}</h2>
                  <p className="text-sm text-white text-opacity-90 mt-1">{user.email}</p>
                </div>
              </div>

              {/* User Details */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-primary bg-opacity-10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Role</p>
                    <p className="font-semibold text-gray-900 capitalize">{user.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-primary bg-opacity-10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-500 text-xs">Email</p>
                    <p className="font-medium text-gray-900 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-primary bg-opacity-10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Member Since</p>
                    <p className="font-medium text-gray-900">{formatDate(user.created_at)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Account Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Party & Address Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Party Information Card */}
            {party ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary bg-opacity-10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Associated Party</h3>
                      <p className="text-sm text-gray-500">Business information</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Party Name</label>
                    <p className="mt-1 text-base font-semibold text-gray-900">{party.name}</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Party ID</label>
                    <p className="mt-1 text-base font-medium text-gray-700">{party.party_id}</p>
                  </div>

                  {party.description && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                      <p className="mt-1 text-sm text-gray-700">{party.description}</p>
                    </div>
                  )}

                  {party.gst_number && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GST Number</label>
                      <p className="mt-1 text-base font-medium text-gray-700">{party.gst_number}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center py-8">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No party associated with your account</p>
                  {user?.role === 'retailer' && (
                    <p className="text-sm text-gray-500 mt-2">
                      Retailer accounts should have an associated party. Please contact an administrator.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Party Loading Error Card */}
            {error && error.includes('party') && (
              <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Party Data Issue</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={loadProfile}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition font-semibold"
                  >
                    Retry Loading
                  </button>
                </div>
              </div>
            )}

            {/* Address Information Card */}
            {party && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary bg-opacity-10 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Address Details</h3>
                      <p className="text-sm text-gray-500">Contact and location information</p>
                    </div>
                  </div>

                  {!isEditingAddress && (
                    <button
                      onClick={handleEditAddress}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="text-sm font-semibold">Edit</span>
                    </button>
                  )}
                </div>

                {isEditingAddress ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                      <textarea
                        value={addressForm.address}
                        onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter complete address"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="City"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                        <input
                          type="text"
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="State"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                        <input
                          type="text"
                          value={addressForm.pincode}
                          onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Pincode"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                        <input
                          type="tel"
                          value={addressForm.phone_number}
                          onChange={(e) => setAddressForm({ ...addressForm, phone_number: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Phone Number"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSaveAddress}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span className="font-semibold">{isSaving ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        <span className="font-semibold">Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</label>
                      <p className="mt-1 text-base text-gray-900">{party.address || 'Not provided'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">City</label>
                        <p className="mt-1 text-base text-gray-900">{party.city || 'Not provided'}</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">State</label>
                        <p className="mt-1 text-base text-gray-900">{party.state || 'Not provided'}</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pincode</label>
                        <p className="mt-1 text-base text-gray-900">{party.pincode || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-5 h-5 text-primary" />
                        <span className="font-medium">{party.phone_number || 'No phone number'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
