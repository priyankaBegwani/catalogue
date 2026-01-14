import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Get all states
router.get('/states', authenticateUser, async (req, res) => {
  try {
    const { data: states, error } = await supabase
      .from('states')
      .select('state_name')
      .order('state_name');

    if (error) {
      console.error('States fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch states' });
    }

    const stateNames = states.map(state => state.state_name);
    res.json({ states: stateNames });
  } catch (error) {
    console.error('States fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

// Get districts by state
router.get('/districts', authenticateUser, async (req, res) => {
  try {
    const { state } = req.query;
    
    if (!state) {
      return res.status(400).json({ error: 'State parameter is required' });
    }

    const { data: districts, error } = await supabase
      .from('districts')
      .select(`
        district_name,
        states!inner(state_name)
      `)
      .eq('states.state_name', state)
      .order('district_name');

    if (error) {
      console.error('Districts fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch districts' });
    }

    const districtNames = districts.map(district => district.district_name);
    res.json({ districts: districtNames });
  } catch (error) {
    console.error('Districts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

// Get cities by district
router.get('/cities', authenticateUser, async (req, res) => {
  try {
    const { district } = req.query;
    
    if (!district) {
      return res.status(400).json({ error: 'District parameter is required' });
    }

    const { data: cities, error } = await supabase
      .from('cities')
      .select(`
        city_name,
        zipcode,
        is_major_city,
        districts!inner(district_name)
      `)
      .eq('districts.district_name', district)
      .order('is_major_city', { ascending: false })
      .order('city_name');

    if (error) {
      console.error('Cities fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch cities' });
    }

    const cityData = cities.map(city => ({
      city_name: city.city_name,
      zipcode: city.zipcode,
      is_major_city: city.is_major_city
    }));

    res.json({ cities: cityData });
  } catch (error) {
    console.error('Cities fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// Get all locations hierarchy (optional endpoint for convenience)
router.get('/hierarchy', authenticateUser, async (req, res) => {
  try {
    const { data: locationData, error } = await supabase
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
      .order('state_name');

    if (error) {
      console.error('Location hierarchy fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch location hierarchy' });
    }

    res.json({ locations: locationData });
  } catch (error) {
    console.error('Location hierarchy fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch location hierarchy' });
  }
});

export default router;
