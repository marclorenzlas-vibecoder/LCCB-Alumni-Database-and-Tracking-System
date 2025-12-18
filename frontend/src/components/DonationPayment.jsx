import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gcashLogo from '../assets/gcash.jpeg';
import paymayaLogo from '../assets/paymaya.jpeg';
import coinsLogo from '../assets/coins.jpeg';
import paypalLogo from '../assets/paypal.png';

const DonationPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const donation = location.state?.donation;

  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!donation) {
      navigate('/donations');
    }
  }, [donation, navigate]);

  if (!donation) return null;

  const suggestedAmounts = [100, 500, 1000, 2500, 5000, 10000];

  const paymentMethods = [
    {
      id: 'gcash',
      name: 'GCash',
      iconUrl: gcashLogo,
      description: 'Pay using GCash mobile wallet',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'paymaya',
      name: 'PayMaya',
      iconUrl: paymayaLogo,
      description: 'Pay using PayMaya digital wallet',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: '🏦',
      description: 'Direct bank transfer',
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      id: 'credit',
      name: 'Credit/Debit Card',
      icon: '💳',
      description: 'Pay with Visa, Mastercard, or other cards',
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      iconUrl: paypalLogo,
      description: 'Pay securely using PayPal',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'coins',
      name: 'Coins.ph',
      iconUrl: coinsLogo,
      description: 'Pay using Coins.ph wallet',
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    }
  ];

  const handleAmountSelect = (value) => {
    setAmount(value.toString());
    setCustomAmount('');
  };

  const handleCustomAmount = (e) => {
    const value = e.target.value;
    setCustomAmount(value);
    setAmount(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid donation amount');
      return;
    }
    
    if (!selectedMethod) {
      alert('Please select a payment method');
      return;
    }

    // For demo purposes - in production, this would integrate with actual payment gateway
    alert(`Payment processing for ₱${parseFloat(amount).toLocaleString()} via ${paymentMethods.find(m => m.id === selectedMethod)?.name}. This is a demo - actual payment integration would go here.`);
    
    // Navigate back to donations page
    navigate('/donations');
  };

  const formatAmount = (amt) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amt);
  };

  const calculateProgress = (raised, goal) => {
    if (!goal) return 0;
    return Math.min((raised / goal) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/donations')}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Campaigns
        </button>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Campaign Summary - Left Side */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-6">
              <img
                src={
                  donation.image 
                    ? (donation.image.startsWith('/') ? `http://localhost:5001${donation.image}` : donation.image)
                    : 'https://placehold.co/600x400/e2e8f0/94a3b8?text=Donation+Campaign'
                }
                alt={donation.purpose}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <span className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">
                  {donation.category || 'General'}
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-3 mb-2">
                  {donation.purpose}
                </h2>
                {donation.description && (
                  <p className="text-sm text-gray-600 mb-4">
                    {donation.description}
                  </p>
                )}
                
                {/* Progress */}
                {donation.goal && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span className="font-medium">Raised: {formatAmount(donation.amount)}</span>
                      <span>Goal: {formatAmount(donation.goal)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${calculateProgress(donation.amount, donation.goal)}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {Math.round(calculateProgress(donation.amount, donation.goal))}% of goal reached
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Form - Right Side */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Donation</h1>
              <p className="text-gray-600 mb-6">Choose your donation amount and payment method</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Donation Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select or Enter Amount *
                  </label>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {suggestedAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleAmountSelect(amt)}
                        className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                          amount === amt.toString() && !customAmount
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-blue-300 text-gray-700'
                        }`}
                      >
                        ₱{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₱</span>
                    <input
                      type="number"
                      placeholder="Enter custom amount"
                      value={customAmount}
                      onChange={handleCustomAmount}
                      min="1"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>
                </div>

                {/* Donor Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                {/* Optional Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows="3"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                    placeholder="Leave a message of support..."
                  />
                </div>

                {/* Payment Methods */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Payment Method *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                          selectedMethod === method.id
                            ? `${method.borderColor} ${method.bgColor}`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {method.iconUrl ? (
                            <img src={method.iconUrl} alt={method.name} className="w-10 h-10 object-contain rounded" />
                          ) : (
                            <span className="text-2xl">{method.icon}</span>
                          )}
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{method.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{method.description}</div>
                          </div>
                          {selectedMethod === method.id && (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Information Box */}
                {selectedMethod && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Secure Payment</p>
                        <p>You will be redirected to {paymentMethods.find(m => m.id === selectedMethod)?.name} to complete your donation securely. Your payment information is encrypted and protected.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {amount && parseFloat(amount) > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-medium text-gray-700">Total Donation:</span>
                      <span className="font-bold text-blue-600 text-2xl">
                        {formatAmount(parseFloat(amount))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/donations')}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!amount || parseFloat(amount) <= 0 || !selectedMethod || !donorName || !donorEmail}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationPayment;
