import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const useLocationData = () => {
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<Array<{ city_name: string; zipcode: string; is_major_city: boolean }>>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      const data = await api.fetchStates();
      setStates(data.states);
    } catch (err) {
      console.error('Failed to fetch states:', err);
    }
  };

  const applyLocationFromPincode = async (locationData: {
    state: string;
    district: string;
    city: string;
    pincode?: string;
  }) => {
    console.log('=== applyLocationFromPincode called ===');
    console.log('Input locationData:', locationData);
    console.log('Current states array:', states);
    
    const normalizedState = locationData.state.trim();
    const normalizedDistrict = locationData.district.trim();
    const normalizedCity = locationData.city.trim();
    const normalizedPincode = locationData.pincode?.trim() || '';

    console.log('Normalized values:', { normalizedState, normalizedDistrict, normalizedCity, normalizedPincode });

    const matchedState = states.find(
      (stateOption) => stateOption.trim().toLowerCase() === normalizedState.toLowerCase()
    ) || normalizedState;

    console.log('Matched state:', matchedState);
    console.log('Fetching districts for state:', matchedState);

    const districtData = await api.fetchDistricts(matchedState);
    console.log('Districts received:', districtData.districts);
    setDistricts(districtData.districts);

    const matchedDistrict = districtData.districts.find(
      (districtOption) => districtOption.trim().toLowerCase() === normalizedDistrict.toLowerCase()
    ) || normalizedDistrict;

    console.log('Matched district:', matchedDistrict);
    console.log('Fetching cities for district:', matchedDistrict);

    const cityData = await api.fetchCities(matchedDistrict);
    console.log('Cities received:', cityData.cities);
    setCities(cityData.cities);

    const matchedCity = cityData.cities.find(
      (cityOption) => cityOption.city_name.trim().toLowerCase() === normalizedCity.toLowerCase()
    )?.city_name || normalizedCity;

    console.log('Matched city:', matchedCity);

    const matchedPincode = cityData.cities.find(
      (cityOption) => cityOption.city_name.trim().toLowerCase() === matchedCity.toLowerCase()
    )?.zipcode || normalizedPincode;

    console.log('Matched pincode:', matchedPincode);

    const finalFormData = {
      state: matchedState,
      district: matchedDistrict,
      city: matchedCity,
      pincode: matchedPincode || normalizedPincode
    };

    console.log('Setting form data to:', finalFormData);
    console.log('=== applyLocationFromPincode completed ===');
    
    return finalFormData;
  };

  const handleStateChange = async (state: string) => {
    setDistricts([]);
    setCities([]);
    
    if (state) {
      try {
        const data = await api.fetchDistricts(state);
        setDistricts(data.districts);
      } catch (err) {
        console.error('Failed to fetch districts:', err);
      }
    }
    
    return { state, district: '', city: '', pincode: '' };
  };

  const handleDistrictChange = async (district: string) => {
    setCities([]);
    
    if (district) {
      try {
        const data = await api.fetchCities(district);
        setCities(data.cities);
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      }
    }
    
    return { district, city: '', pincode: '' };
  };

  const handleCityChange = (cityName: string, currentCities: typeof cities) => {
    const selectedCity = currentCities.find(c => c.city_name === cityName);
    return {
      city: cityName,
      pincode: selectedCity?.zipcode || ''
    };
  };

  const loadDistrictsAndCities = async (state: string, district?: string) => {
    if (state) {
      try {
        const districtData = await api.fetchDistricts(state);
        setDistricts(districtData.districts);
        
        if (district) {
          const cityData = await api.fetchCities(district);
          setCities(cityData.cities);
        }
      } catch (err) {
        console.error('Failed to load location data:', err);
      }
    }
  };

  return {
    states,
    districts,
    cities,
    selectedDistrict,
    setSelectedDistrict,
    setDistricts,
    setCities,
    applyLocationFromPincode,
    handleStateChange,
    handleDistrictChange,
    handleCityChange,
    loadDistrictsAndCities
  };
};
