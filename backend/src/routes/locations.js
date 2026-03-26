import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired,
  executeQuery,
  cacheMiddleware
} from '../utils/index.js';

const router = express.Router();

// Get all states
router.get('/states', 
  authenticateUser, 
  cacheMiddleware(3600), // Cache for 1 hour
  asyncHandler(async (req, res) => {
    const states = await executeQuery(
      supabase
        .from('states')
        .select('state_name')
        .order('state_name'),
      'Failed to fetch states'
    );

    const stateNames = states.map(state => state.state_name);
    res.json({ states: stateNames });
  })
);

// Get districts by state
router.get('/districts', 
  authenticateUser, 
  cacheMiddleware(3600), // Cache for 1 hour
  asyncHandler(async (req, res) => {
    const { state } = req.query;
    
    if (!state) {
      throw new AppError('State parameter is required', 400);
    }

    const districts = await executeQuery(
      supabase
        .from('districts')
        .select(`
          district_name,
          states!inner(state_name)
        `)
        .eq('states.state_name', state)
        .order('district_name'),
      'Failed to fetch districts'
    );

    const districtNames = districts.map(district => district.district_name);
    res.json({ districts: districtNames });
  })
);

// Get cities by district
router.get('/cities', 
  authenticateUser, 
  cacheMiddleware(3600), // Cache for 1 hour
  asyncHandler(async (req, res) => {
    const { district } = req.query;
    
    if (!district) {
      throw new AppError('District parameter is required', 400);
    }

    const cities = await executeQuery(
      supabase
        .from('cities')
        .select(`
          city_name,
          zipcode,
          is_major_city,
          districts!inner(district_name)
        `)
        .eq('districts.district_name', district)
        .order('is_major_city', { ascending: false })
        .order('city_name'),
      'Failed to fetch cities'
    );

    const cityData = cities.map(city => ({
      city_name: city.city_name,
      zipcode: city.zipcode,
      is_major_city: city.is_major_city
    }));

    res.json({ cities: cityData });
  })
);

// Get all locations hierarchy (optional endpoint for convenience)
router.get('/hierarchy', 
  authenticateUser, 
  cacheMiddleware(3600), // Cache for 1 hour
  asyncHandler(async (req, res) => {
    const locationData = await executeQuery(
      supabase
        .from('states')
        .select(`
          state_name,
          districts(
            district_name,
            cities(
              city_name,
              zipcode,
              is_major_city
            )
          )
        `)
        .order('state_name'),
      'Failed to fetch location hierarchy'
    );

    res.json({ locations: locationData });
  })
);

// Get location by pincode
router.get('/pincode/:pincode', 
  authenticateUser, 
  cacheMiddleware(3600), // Cache for 1 hour
  asyncHandler(async (req, res) => {
    const { pincode } = req.params;
    
    console.log('=== BACKEND: Pincode lookup request ===');
    console.log('Pincode:', pincode);
    
    if (!pincode) {
      throw new AppError('Pincode parameter is required', 400);
    }

    console.log('Querying cities table for zipcode:', pincode);
    const locationData = await executeQuery(
      supabase
        .from('cities')
        .select(`
          city_name,
          zipcode,
          districts!inner(
            district_name,
            states!inner(
              state_name
            )
          )
        `)
        .eq('zipcode', pincode)
        .limit(1),
      'Failed to fetch location by pincode'
    );

    console.log('Query result:', locationData);
    console.log('Number of records found:', locationData.length);

    if (locationData.length === 0) {
      console.log('No location found for pincode:', pincode);
      return res.json({ 
        found: false,
        message: 'No location found for this pincode' 
      });
    }

    const location = locationData[0];
    console.log('Location found:', location);
    console.log('Districts object:', location.districts);
    
    const response = { 
      found: true,
      state: location.districts.states.state_name,
      district: location.districts.district_name,
      city: location.city_name,
      pincode: location.zipcode
    };
    console.log('Sending response:', response);
    res.json(response);
  })
);

export default router;
