import express from 'express';
import { supabaseAdmin } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired,
  validateUUID,
  executeQuery
} from '../utils/index.js';

const router = express.Router();

// Get phone numbers for a party
router.get('/:partyId', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { partyId } = req.params;
    
    validateUUID(partyId, 'Party ID');

    const phoneNumbers = await executeQuery(
      supabaseAdmin
        .from('party_phone_numbers')
        .select('*')
        .eq('party_id', partyId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true }),
      'Failed to fetch phone numbers'
    );

    res.json({ phoneNumbers });
  })
);

// Create or update phone numbers for a party
router.post('/:partyId', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { partyId } = req.params;
    const { phoneNumbers } = req.body;

    validateUUID(partyId, 'Party ID');
    validateRequired(req.body, ['phoneNumbers']);

    // Delete existing phone numbers
    await executeQuery(
      supabaseAdmin
        .from('party_phone_numbers')
        .delete()
        .eq('party_id', partyId),
      'Failed to delete existing phone numbers'
    );

    // Insert new phone numbers
    if (phoneNumbers && phoneNumbers.length > 0) {
      const phoneNumbersToInsert = phoneNumbers.map(pn => ({
        party_id: partyId,
        phone_number: pn.phone_number || '',
        contact_name: pn.contact_name || '',
        designation: pn.designation || '',
        is_default: pn.is_default || false
      }));

      await executeQuery(
        supabaseAdmin
          .from('party_phone_numbers')
          .insert(phoneNumbersToInsert),
        'Failed to create phone numbers'
      );
    }

    res.json({ message: 'Phone numbers updated successfully' });
  })
);

// Delete a phone number
router.delete('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Phone number ID');

    await executeQuery(
      supabaseAdmin
        .from('party_phone_numbers')
        .delete()
        .eq('id', id),
      'Failed to delete phone number'
    );

    res.json({ message: 'Phone number deleted successfully' });
  })
);

export default router;
