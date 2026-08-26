/**
 * Donation Type Step Configurations
 * Defines different step workflows for money vs. item donations
 */

export const DONATION_TYPES = {
  MONEY: 'money',
  ITEMS: 'items',
  BOTH: 'both'
};

export const MONEY_DONATION_STEPS = [
  {
    number: '1',
    title: 'Select',
    description: 'Choose donation type',
    type: 'selection'
  },
  {
    number: '2',
    title: 'Details',
    description: 'Enter donor info',
    type: 'donor_info',
    fields: ['firstName', 'lastName', 'email', 'phone', 'country', 'address']
  },
  {
    number: '3',
    title: 'Amount',
    description: 'Set donation amount',
    type: 'amount',
    fields: ['amount', 'currency']
  },
  {
    number: '4',
    title: 'Verify',
    description: 'Confirm account access',
    type: 'verification',
    fields: ['contactByEmail', 'contactByPhone', 'allowContact', 'agreeTerms']
  },
  {
    number: '5',
    title: 'Pay',
    description: 'Choose payment method',
    type: 'payment',
    fields: ['paymentMethod']
  },
  {
    number: '6',
    title: 'Complete',
    description: 'Donation recorded',
    type: 'completion'
  }
];

export const ITEMS_DONATION_STEPS = [
  {
    number: '1',
    title: 'Select',
    description: 'Choose donation type',
    type: 'selection'
  },
  {
    number: '2',
    title: 'Details',
    description: 'Enter donor info',
    type: 'donor_info',
    fields: ['firstName', 'lastName', 'email', 'phone', 'country', 'address']
  },
  {
    number: '3',
    title: 'Items',
    description: 'Describe items to donate',
    type: 'item_details',
    fields: ['itemDescription', 'itemQuantity', 'itemCondition']
  },
  {
    number: '4',
    title: 'Delivery',
    description: 'Choose delivery method',
    type: 'delivery',
    fields: ['itemDropOff']
  },
  {
    number: '5',
    title: 'Verify',
    description: 'Confirm account access',
    type: 'verification',
    fields: ['contactByEmail', 'contactByPhone', 'allowContact', 'agreeTerms']
  },
  {
    number: '6',
    title: 'Complete',
    description: 'Donation recorded',
    type: 'completion'
  }
];

export const BOTH_DONATION_STEPS = [
  {
    number: '1',
    title: 'Select',
    description: 'Choose donation type',
    type: 'selection'
  },
  {
    number: '2',
    title: 'Details',
    description: 'Enter donor info',
    type: 'donor_info',
    fields: ['firstName', 'lastName', 'email', 'phone', 'country', 'address']
  },
  {
    number: '3',
    title: 'Contributions',
    description: 'Specify money & items',
    type: 'both_contributions',
    fields: ['amount', 'currency', 'itemDescription', 'itemQuantity', 'itemCondition']
  },
  {
    number: '4',
    title: 'Delivery',
    description: 'Delivery & payment methods',
    type: 'both_delivery',
    fields: ['itemDropOff', 'paymentMethod']
  },
  {
    number: '5',
    title: 'Verify',
    description: 'Confirm account access',
    type: 'verification',
    fields: ['contactByEmail', 'contactByPhone', 'allowContact', 'agreeTerms']
  },
  {
    number: '6',
    title: 'Complete',
    description: 'Donation recorded',
    type: 'completion'
  }
];

/**
 * Get steps configuration based on donation type
 * @param {string} donationType - 'money', 'items', or 'both'
 * @returns {Array} Steps array for the given type
 */
export const getStepsForDonationType = (donationType) => {
  switch (donationType?.toLowerCase()) {
    case DONATION_TYPES.MONEY:
      return MONEY_DONATION_STEPS;
    case DONATION_TYPES.ITEMS:
      return ITEMS_DONATION_STEPS;
    case DONATION_TYPES.BOTH:
      return BOTH_DONATION_STEPS;
    default:
      return MONEY_DONATION_STEPS;
  }
};

/**
 * Get required fields for a specific step
 * @param {string} donationType - 'money', 'items', or 'both'
 * @param {number} stepNumber - Step number (1-6)
 * @returns {Array} Required fields for validation
 */
export const getRequiredFieldsForStep = (donationType, stepNumber) => {
  const steps = getStepsForDonationType(donationType);
  const step = steps.find(s => s.number === String(stepNumber));
  return step?.fields || [];
};

/**
 * Check if a step should be visible based on donation type
 * @param {string} donationType - 'money', 'items', or 'both'
 * @param {number} stepNumber - Step number to check
 * @returns {boolean}
 */
export const isStepVisible = (donationType, stepNumber) => {
  const steps = getStepsForDonationType(donationType);
  return steps.some(s => s.number === String(stepNumber));
};

/**
 * Get step type for conditional rendering
 * @param {string} donationType - 'money', 'items', or 'both'
 * @param {number} stepNumber - Step number
 * @returns {string} Step type (e.g., 'payment', 'item_details', 'delivery')
 */
export const getStepType = (donationType, stepNumber) => {
  const steps = getStepsForDonationType(donationType);
  const step = steps.find(s => s.number === String(stepNumber));
  return step?.type || '';
};

/**
 * Validate required fields for current step
 * @param {string} donationType
 * @param {number} stepNumber
 * @param {Object} formData
 * @returns {Object} { isValid: boolean, missingFields: array }
 */
export const validateStepFields = (donationType, stepNumber, formData) => {
  const requiredFields = getRequiredFieldsForStep(donationType, stepNumber);
  const missingFields = requiredFields.filter(field => {
    const value = formData[field];
    if (field === 'agreeTerms') return !value;
    return !value || (typeof value === 'string' && value.trim() === '');
  });

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};
