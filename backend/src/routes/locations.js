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

export default router;
