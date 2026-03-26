export const validateGSTNumber = (gstNumber: string): { isValid: boolean; error: string } => {
  if (!gstNumber) {
    return { isValid: true, error: '' };
  }
  
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstRegex.test(gstNumber)) {
    return { 
      isValid: false, 
      error: 'Invalid GST format. Format: 22AAAAA0000A1Z5' 
    };
  }
  
  return { isValid: true, error: '' };
};

export const validatePhoneNumber = (phoneNumber: string): { isValid: boolean; error: string } => {
  if (!phoneNumber) {
    return { isValid: true, error: '' };
  }
  
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const mobileRegex = /^[6-9]\d{9}$/;
  
  if (cleanPhone.length !== 10) {
    return { 
      isValid: false, 
      error: 'Phone number must be 10 digits' 
    };
  }
  
  if (!mobileRegex.test(cleanPhone)) {
    return { 
      isValid: false, 
      error: 'Invalid phone number. Must start with 6-9' 
    };
  }
  
  return { isValid: true, error: '' };
};
