import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import donationService from '../services/donationService';
import { authService } from '../services/authService';
import { IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { extractDonationMeta, withDonationMeta } from '../utils/donationMeta';
import debitLogo from '../assets/debit.png';
import paymayaLogo from '../assets/paymaya.png';
import gcashLogo from '../assets/gcash1.png';

const countryOptions = [
  'Philippines',
  'United Kingdom',
  'United States',
  'Australia',
  'Canada',
  'Japan',
  'Singapore',
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cambodia',
  'Cameroon',
  'Cape Verde',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Democratic Republic of the Congo',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Poland',
  'Portugal',
  'Qatar',
  'Republic of the Congo',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe'
];

const DonatePage = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stepLoading, setStepLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [successState, setSuccessState] = useState(null);
  const addressInputRef = useRef(null);
  const currencyMenuRef = useRef(null);
  const countryMenuRef = useRef(null);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [isReceiptFullscreen, setIsReceiptFullscreen] = useState(false);

  const [formData, setFormData] = useState({
    donationType: 'money',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    country: 'Philippines',
    address: '',
    phone: '',
    contactByEmail: true,
    contactByPhone: false,
    allowContact: true,
    agreeTerms: false,
    itemDescription: '',
    itemQuantity: '',
    itemCondition: '',
    itemDropOff: '',
    currency: 'PHP',
    paymentMethod: 'card'
  });

  const [paymentDetails, setPaymentDetails] = useState({
    cardholderName: '',
    cardId: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });

  const user = authService.getCurrentUser();
  const isLoggedIn = authService.isLoggedIn();
  const currentRole = authService.getRole();
  const canDonate = currentRole === 'alumni' || currentRole === 'admin' || currentRole === 'teacher';

  const donationSteps = [
    { number: '1', title: 'Select', description: 'Choose donation type' },
    { number: '2', title: 'Details', description: 'Enter donation info' },
    { number: '3', title: 'Verify', description: 'Confirm account access' },
    { number: '4', title: 'Pay', description: 'Finalize donation' },
    { number: '5', title: 'Complete', description: 'Donation recorded' }
  ];

  const presetAmounts = [100, 250, 500, 1000];

  const currencyOptions = [
    { value: 'PHP', label: 'Philippine Peso (PHP)' },
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'JPY', label: 'Japanese Yen (JPY)' },
    { value: 'AUD', label: 'Australian Dollar (AUD)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)' },
    { value: 'SGD', label: 'Singapore Dollar (SGD)' },
    { value: 'AED', label: 'UAE Dirham (AED)' },
    { value: 'AFN', label: 'Afghan Afghani (AFN)' },
    { value: 'ALL', label: 'Albanian Lek (ALL)' },
    { value: 'AMD', label: 'Armenian Dram (AMD)' },
    { value: 'ANG', label: 'Netherlands Antillean Guilder (ANG)' },
    { value: 'AOA', label: 'Angolan Kwanza (AOA)' },
    { value: 'ARS', label: 'Argentine Peso (ARS)' },
    { value: 'AWG', label: 'Aruban Florin (AWG)' },
    { value: 'AZN', label: 'Azerbaijani Manat (AZN)' },
    { value: 'BAM', label: 'Bosnia-Herzegovina Convertible Mark (BAM)' },
    { value: 'BBD', label: 'Barbadian Dollar (BBD)' },
    { value: 'BDT', label: 'Bangladeshi Taka (BDT)' },
    { value: 'BGN', label: 'Bulgarian Lev (BGN)' },
    { value: 'BHD', label: 'Bahraini Dinar (BHD)' },
    { value: 'BIF', label: 'Burundian Franc (BIF)' },
    { value: 'BMD', label: 'Bermudian Dollar (BMD)' },
    { value: 'BND', label: 'Brunei Dollar (BND)' },
    { value: 'BOB', label: 'Bolivian Boliviano (BOB)' },
    { value: 'BRL', label: 'Brazilian Real (BRL)' },
    { value: 'BSD', label: 'Bahamian Dollar (BSD)' },
    { value: 'BTN', label: 'Bhutanese Ngultrum (BTN)' },
    { value: 'BWP', label: 'Botswana Pula (BWP)' },
    { value: 'BYN', label: 'Belarusian Ruble (BYN)' },
    { value: 'BZD', label: 'Belize Dollar (BZD)' },
    { value: 'CDF', label: 'Congolese Franc (CDF)' },
    { value: 'CHF', label: 'Swiss Franc (CHF)' },
    { value: 'CLP', label: 'Chilean Peso (CLP)' },
    { value: 'CNY', label: 'Chinese Yuan (CNY)' },
    { value: 'COP', label: 'Colombian Peso (COP)' },
    { value: 'CRC', label: 'Costa Rican Colon (CRC)' },
    { value: 'CUP', label: 'Cuban Peso (CUP)' },
    { value: 'CVE', label: 'Cape Verdean Escudo (CVE)' },
    { value: 'CZK', label: 'Czech Koruna (CZK)' },
    { value: 'DJF', label: 'Djiboutian Franc (DJF)' },
    { value: 'DKK', label: 'Danish Krone (DKK)' },
    { value: 'DOP', label: 'Dominican Peso (DOP)' },
    { value: 'DZD', label: 'Algerian Dinar (DZD)' },
    { value: 'EGP', label: 'Egyptian Pound (EGP)' },
    { value: 'ERN', label: 'Eritrean Nakfa (ERN)' },
    { value: 'ETB', label: 'Ethiopian Birr (ETB)' },
    { value: 'FJD', label: 'Fijian Dollar (FJD)' },
    { value: 'FKP', label: 'Falkland Islands Pound (FKP)' },
    { value: 'GEL', label: 'Georgian Lari (GEL)' },
    { value: 'GHS', label: 'Ghanaian Cedi (GHS)' },
    { value: 'GIP', label: 'Gibraltar Pound (GIP)' },
    { value: 'GMD', label: 'Gambian Dalasi (GMD)' },
    { value: 'GNF', label: 'Guinean Franc (GNF)' },
    { value: 'GTQ', label: 'Guatemalan Quetzal (GTQ)' },
    { value: 'GYD', label: 'Guyanese Dollar (GYD)' },
    { value: 'HKD', label: 'Hong Kong Dollar (HKD)' },
    { value: 'HNL', label: 'Honduran Lempira (HNL)' },
    { value: 'HRK', label: 'Croatian Kuna (HRK)' },
    { value: 'HTG', label: 'Haitian Gourde (HTG)' },
    { value: 'HUF', label: 'Hungarian Forint (HUF)' },
    { value: 'IDR', label: 'Indonesian Rupiah (IDR)' },
    { value: 'ILS', label: 'Israeli New Shekel (ILS)' },
    { value: 'INR', label: 'Indian Rupee (INR)' },
    { value: 'IQD', label: 'Iraqi Dinar (IQD)' },
    { value: 'IRR', label: 'Iranian Rial (IRR)' },
    { value: 'ISK', label: 'Icelandic Krona (ISK)' },
    { value: 'JMD', label: 'Jamaican Dollar (JMD)' },
    { value: 'JOD', label: 'Jordanian Dinar (JOD)' },
    { value: 'KES', label: 'Kenyan Shilling (KES)' },
    { value: 'KGS', label: 'Kyrgyzstani Som (KGS)' },
    { value: 'KHR', label: 'Cambodian Riel (KHR)' },
    { value: 'KMF', label: 'Comorian Franc (KMF)' },
    { value: 'KRW', label: 'South Korean Won (KRW)' },
    { value: 'KWD', label: 'Kuwaiti Dinar (KWD)' },
    { value: 'KYD', label: 'Cayman Islands Dollar (KYD)' },
    { value: 'KZT', label: 'Kazakhstani Tenge (KZT)' },
    { value: 'LAK', label: 'Lao Kip (LAK)' },
    { value: 'LBP', label: 'Lebanese Pound (LBP)' },
    { value: 'LKR', label: 'Sri Lankan Rupee (LKR)' },
    { value: 'LRD', label: 'Liberian Dollar (LRD)' },
    { value: 'LSL', label: 'Lesotho Loti (LSL)' },
    { value: 'LYD', label: 'Libyan Dinar (LYD)' },
    { value: 'MAD', label: 'Moroccan Dirham (MAD)' },
    { value: 'MDL', label: 'Moldovan Leu (MDL)' },
    { value: 'MGA', label: 'Malagasy Ariary (MGA)' },
    { value: 'MKD', label: 'Macedonian Denar (MKD)' },
    { value: 'MMK', label: 'Myanmar Kyat (MMK)' },
    { value: 'MNT', label: 'Mongolian Tugrik (MNT)' },
    { value: 'MOP', label: 'Macanese Pataca (MOP)' },
    { value: 'MRU', label: 'Mauritanian Ouguiya (MRU)' },
    { value: 'MUR', label: 'Mauritian Rupee (MUR)' },
    { value: 'MVR', label: 'Maldivian Rufiyaa (MVR)' },
    { value: 'MWK', label: 'Malawian Kwacha (MWK)' },
    { value: 'MXN', label: 'Mexican Peso (MXN)' },
    { value: 'MYR', label: 'Malaysian Ringgit (MYR)' },
    { value: 'MZN', label: 'Mozambican Metical (MZN)' },
    { value: 'NAD', label: 'Namibian Dollar (NAD)' },
    { value: 'NGN', label: 'Nigerian Naira (NGN)' },
    { value: 'NIO', label: 'Nicaraguan Cordoba (NIO)' },
    { value: 'NOK', label: 'Norwegian Krone (NOK)' },
    { value: 'NPR', label: 'Nepalese Rupee (NPR)' },
    { value: 'NZD', label: 'New Zealand Dollar (NZD)' },
    { value: 'OMR', label: 'Omani Rial (OMR)' },
    { value: 'PAB', label: 'Panamanian Balboa (PAB)' },
    { value: 'PEN', label: 'Peruvian Sol (PEN)' },
    { value: 'PGK', label: 'Papua New Guinean Kina (PGK)' },
    { value: 'PKR', label: 'Pakistani Rupee (PKR)' },
    { value: 'PLN', label: 'Polish Zloty (PLN)' },
    { value: 'PYG', label: 'Paraguayan Guarani (PYG)' },
    { value: 'QAR', label: 'Qatari Riyal (QAR)' },
    { value: 'RON', label: 'Romanian Leu (RON)' },
    { value: 'RSD', label: 'Serbian Dinar (RSD)' },
    { value: 'RUB', label: 'Russian Ruble (RUB)' },
    { value: 'RWF', label: 'Rwandan Franc (RWF)' },
    { value: 'SAR', label: 'Saudi Riyal (SAR)' },
    { value: 'SBD', label: 'Solomon Islands Dollar (SBD)' },
    { value: 'SCR', label: 'Seychellois Rupee (SCR)' },
    { value: 'SDG', label: 'Sudanese Pound (SDG)' },
    { value: 'SEK', label: 'Swedish Krona (SEK)' },
    { value: 'SHP', label: 'Saint Helena Pound (SHP)' },
    { value: 'SLE', label: 'Sierra Leonean Leone (SLE)' },
    { value: 'SOS', label: 'Somali Shilling (SOS)' },
    { value: 'SRD', label: 'Surinamese Dollar (SRD)' },
    { value: 'SSP', label: 'South Sudanese Pound (SSP)' },
    { value: 'STN', label: 'Sao Tome and Principe Dobra (STN)' },
    { value: 'SYP', label: 'Syrian Pound (SYP)' },
    { value: 'SZL', label: 'Swazi Lilangeni (SZL)' },
    { value: 'THB', label: 'Thai Baht (THB)' },
    { value: 'TJS', label: 'Tajikistani Somoni (TJS)' },
    { value: 'TMT', label: 'Turkmenistani Manat (TMT)' },
    { value: 'TND', label: 'Tunisian Dinar (TND)' },
    { value: 'TOP', label: 'Tongan Paanga (TOP)' },
    { value: 'TRY', label: 'Turkish Lira (TRY)' },
    { value: 'TTD', label: 'Trinidad and Tobago Dollar (TTD)' },
    { value: 'TWD', label: 'New Taiwan Dollar (TWD)' },
    { value: 'TZS', label: 'Tanzanian Shilling (TZS)' },
    { value: 'UAH', label: 'Ukrainian Hryvnia (UAH)' },
    { value: 'UGX', label: 'Ugandan Shilling (UGX)' },
    { value: 'UYU', label: 'Uruguayan Peso (UYU)' },
    { value: 'UZS', label: 'Uzbekistani Som (UZS)' },
    { value: 'VES', label: 'Venezuelan Bolivar (VES)' },
    { value: 'VND', label: 'Vietnamese Dong (VND)' },
    { value: 'VUV', label: 'Vanuatu Vatu (VUV)' },
    { value: 'WST', label: 'Samoan Tala (WST)' },
    { value: 'XAF', label: 'Central African CFA Franc (XAF)' },
    { value: 'XCD', label: 'East Caribbean Dollar (XCD)' },
    { value: 'XOF', label: 'West African CFA Franc (XOF)' },
    { value: 'XPF', label: 'CFP Franc (XPF)' },
    { value: 'YER', label: 'Yemeni Rial (YER)' },
    { value: 'ZAR', label: 'South African Rand (ZAR)' },
    { value: 'ZMW', label: 'Zambian Kwacha (ZMW)' },
    { value: 'ZWL', label: 'Zimbabwean Dollar (ZWL)' }
  ];

  const currencySymbols = {
    PHP: '₱',
    USD: '$',
    JPY: '¥',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
    SGD: 'S$',
    HKD: 'HK$',
    NZD: 'NZ$',
    INR: '₹',
    CNY: '¥',
    KRW: '₩',
    THB: '฿',
    MYR: 'RM',
    IDR: 'Rp',
    VND: '₫',
    ZAR: 'R',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    MXN: '$',
    BRL: 'R$',
    AED: 'د.إ',
    SAR: '﷼'
  };

  const getCurrencySymbol = (currency) => currencySymbols[currency] || currency;

  const donationInfo = campaign ? extractDonationMeta(campaign.description || '') : { cleanDescription: '', meta: {} };
  const campaignDescription = donationInfo.cleanDescription || '';
  const campaignMeta = donationInfo.meta || {};
  const paymentNumber = campaignMeta.paymentNumber || '0912-345-6789';
  const paymentMethods = campaignMeta.paymentMethods || 'GCash / PayMaya / Debit Card';
  const deliveryInstructions = campaignMeta.deliveryInstructions || '';
  const acceptedItems = campaignMeta.acceptedItems || 'Books, shirts, shoes, school supplies';
  const itemInstructions = campaignMeta.itemInstructions || 'Please prepare clean and usable items for drop-off.';

  const paymentProviders = {
    card: { label: 'Debit / credit card' },
    paymaya: {
      label: 'PayMaya',
      url: campaignMeta.paymayaUrl || 'https://www.paymaya.com/'
    },
    gcash: {
      label: 'GCash',
      url: campaignMeta.gcashUrl || 'https://www.gcash.com/'
    }
  };

  const paymentMethodOptions = [
    {
      key: 'card',
      label: 'Debit / credit card',
      icon: <img src={debitLogo} alt="Debit card" className="h-10 w-10 rounded-2xl object-contain" />,
      logo: (
        <div className="flex justify-center p-8">
          <div className="rounded-3xl border border-transparent bg-white p-8 shadow-sm">
            <img src={debitLogo} alt="Debit card logo" className="h-14 w-auto object-contain" />
          </div>
        </div>
      )
    },
    {
      key: 'paymaya',
      label: 'PayMaya',
      icon: <img src={paymayaLogo} alt="PayMaya" className="h-10 w-10 rounded-2xl object-contain" />,
      logo: (
        <div className="flex justify-center p-8">
          <div className="rounded-3xl border border-transparent bg-white p-8 shadow-sm">
            <img src={paymayaLogo} alt="PayMaya logo" className="h-20 w-auto object-contain" />
          </div>
        </div>
      )
    },
    {
      key: 'gcash',
      label: 'GCash',
      icon: <img src={gcashLogo} alt="GCash" className="h-10 w-10 rounded-2xl object-contain" />,
      logo: (
        <div className="flex justify-center p-8">
          <div className="rounded-3xl border border-transparent bg-white p-8 shadow-sm">
            <img src={gcashLogo} alt="GCash logo" className="h-20 w-auto object-contain" />
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        const allDonations = await donationService.getAllDonations();
        const foundCampaign = allDonations.find((d) => d.id === parseInt(campaignId, 10));

        if (!foundCampaign) {
          setError('Donation campaign not found');
          return;
        }

        setCampaign(foundCampaign);
      } catch (err) {
        console.error('Error fetching campaign:', err);
        setError('Failed to load campaign details');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(event.target)) {
        setCurrencyMenuOpen(false);
      }
      if (countryMenuRef.current && !countryMenuRef.current.contains(event.target)) {
        setCountryMenuOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setCurrencyMenuOpen(false);
        setCountryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let nextValue = type === 'checkbox' ? checked : value;

    if (name === 'itemQuantity') {
      nextValue = String(value).replace(/\D/g, '');
    }

    if (name === 'amount') {
      nextValue = String(value).replace(/[^0-9.]/g, '');
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handlePaymentDetailChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentRedirect = (method) => {
    const provider = paymentProviders[method];
    if (!provider?.url) return;
    window.open(provider.url, '_blank', 'noopener,noreferrer');
    toast.info(`Redirecting to ${provider.label}...`);
  };

  const validateStepOne = () => {
    const wantsMoney = formData.donationType === 'money' || formData.donationType === 'both';
    const wantsItems = formData.donationType === 'items' || formData.donationType === 'both';

    if (wantsMoney && (!formData.amount || parseFloat(formData.amount) <= 0)) {
      toast.warning('Please choose or enter a valid donation amount first.');
      return false;
    }

    if (wantsItems && !formData.itemDescription.trim()) {
      toast.warning('Please describe the items you want to donate first.');
      return false;
    }

    if (wantsItems) {
      const qty = parseInt(formData.itemQuantity || '0', 10);
      if (isNaN(qty) || qty <= 0) {
        toast.warning('Please enter a valid numeric quantity for items first.');
        return false;
      }
    }

    return true;
  };

  const goBack = () => setCurrentStep((step) => Math.max(1, step - 1));

  const goNext = () => {
    if (currentStep === 1 && !validateStepOne()) return;

    if (currentStep === 2) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.address || !formData.agreeTerms) {
        toast.warning('Please complete your details and accept the terms before continuing.');
        return;
      }
    }

    setStepLoading(true);
    window.setTimeout(() => {
      setCurrentStep((step) => Math.min(4, step + 1));
      setStepLoading(false);
    }, 350);
  };

  const formatAmount = (amount, currency = 'PHP') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2
    }).format(amount || 0);
  };

  const calculateProgress = (raised, goal) => {
    if (!goal) return 0;
    return Math.min((raised / goal) * 100, 100);
  };

  const getDonorDisplayName = () => {
    const fullName = [formData.title, formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();
    return fullName || user?.username || 'Anonymous donor';
  };

  const buildDonationReceipt = (updatedCampaign, wantsMoney, wantsItems) => {
    const receiptNumber = `RCPT-${Date.now().toString().slice(-8)}`;
    const donationTypeLabel =
      wantsMoney && wantsItems ? 'Money + Items' : wantsMoney ? 'Money' : 'Items';

    return {
      receiptNumber,
      issuedAt: new Date().toLocaleString(),
      donorName: getDonorDisplayName(),
      campaignName: campaign?.purpose || 'Donation Campaign',
      donationTypeLabel,
      amountLabel: wantsMoney ? formatAmount(formData.amount, formData.currency) : 'N/A',
      itemSummary: wantsItems
        ? [
            formData.itemDescription ? `Items: ${formData.itemDescription}` : null,
            formData.itemQuantity ? `Quantity: ${formData.itemQuantity}` : null,
            formData.itemCondition ? `Condition: ${formData.itemCondition}` : null,
            formData.itemDropOff || deliveryInstructions || itemInstructions ? `Drop-off: ${formData.itemDropOff || deliveryInstructions || itemInstructions}` : null
          ].filter(Boolean).join('\n')
        : 'N/A',
      paymentMethod: wantsMoney ? (paymentProviders[formData.paymentMethod]?.label || 'Debit / credit card') : 'N/A'
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      toast.warning('Please log in to make a donation');
      navigate('/login', { state: { returnTo: `/donate/${campaignId}` } });
      return;
    }

    if (!canDonate) {
      toast.warning('Only alumni or admin accounts can make donations.');
      return;
    }

    const wantsMoney = formData.donationType === 'money' || formData.donationType === 'both';
    const wantsItems = formData.donationType === 'items' || formData.donationType === 'both';

    if (!validateStepOne()) return;

    if (wantsMoney && formData.paymentMethod === 'card') {
      const requiredCardFields = ['cardholderName', 'cardId', 'cardNumber', 'expiryMonth', 'expiryYear', 'cvv'];
      const missingCardField = requiredCardFields.find((field) => !paymentDetails[field].trim());
      if (missingCardField) {
        toast.warning('Please complete your debit card details before continuing.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const paymentSummary = wantsMoney
        ? (formData.paymentMethod === 'card'
            ? [
                'Payment method: Debit Card',
                `Card holder: ${paymentDetails.cardholderName}`,
                `Card ID: ${paymentDetails.cardId}`,
                `Card number: **** **** **** ${paymentDetails.cardNumber.replace(/\D/g, '').slice(-4)}`,
                `Expiry: ${paymentDetails.expiryMonth}/${paymentDetails.expiryYear}`,
                `Currency: ${formData.currency}`
              ].join('\n')
            : `Payment method: ${paymentProviders[formData.paymentMethod]?.label || 'GCash'}\nCurrency: ${formData.currency}`)
        : null;

      const itemSummary = wantsItems
        ? [
            'Donation type: Items',
            `Items: ${formData.itemDescription}`,
            `Quantity: ${formData.itemQuantity || '1'}`,
            `Condition: ${formData.itemCondition || 'Usable condition'}`,
            `Drop-off: ${formData.itemDropOff || deliveryInstructions || itemInstructions}`
          ].join('\n')
        : null;

      const donationMeta = {
        donationMode: formData.donationType,
        acceptedItems: wantsItems ? formData.itemDescription : '',
        itemInstructions: wantsItems ? formData.itemCondition || itemInstructions : itemInstructions,
        paymentCurrency: wantsMoney ? formData.currency : '',
        paymentNumber,
        paymentMethods,
        deliveryInstructions: formData.itemDropOff || deliveryInstructions || itemInstructions
      };

      const donorSummary = [
        `Donor: ${[formData.title, formData.firstName, formData.lastName].filter(Boolean).join(' ')}`,
        `Country: ${formData.country}`,
        `Address: ${formData.address}`,
        formData.phone ? `Phone: ${formData.phone}` : null,
        formData.allowContact
          ? `Contact preference: ${[formData.contactByEmail ? 'Email' : null, formData.contactByPhone ? 'Phone' : null].filter(Boolean).join(', ') || 'Open to contact'}`
          : 'Contact preference: Do not contact',
        `Agreement: ${formData.agreeTerms ? 'Accepted' : 'Not accepted'}`,
        itemSummary,
        paymentSummary
      ].filter(Boolean).join('\n');

      const payload = {
        amount: wantsMoney ? parseFloat(formData.amount) : 0,
        description: withDonationMeta(`Donation for: ${campaign.purpose}\n\n${donorSummary}`, donationMeta),
        date: formData.date
      };

      const updatedCampaign = await donationService.contributeToDonation(campaign.id, payload);

      const receipt = buildDonationReceipt(updatedCampaign, wantsMoney, wantsItems);

      setSuccessState({
        campaign: updatedCampaign || campaign,
        receipt
      });
      setCampaign(updatedCampaign || {
        ...campaign,
        amount: campaign.amount + (payload.amount || 0)
      });
      setCurrentStep(5);

      if (wantsMoney && (formData.paymentMethod === 'gcash' || formData.paymentMethod === 'paymaya')) {
        handlePaymentRedirect(formData.paymentMethod);
      }
    } catch (err) {
      console.error('Error submitting donation:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to submit donation';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto" />
          <p className="mt-4 text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/donations')}
            className="px-6 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors"
          >
            View All Campaigns
          </button>
        </div>
      </div>
    );
  }

  const reviewWantsMoney = formData.donationType === 'money' || formData.donationType === 'both';
  const reviewWantsItems = formData.donationType === 'items' || formData.donationType === 'both';
  const donorNameForReview = [formData.title, formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();
  const contactPreferenceForReview = formData.allowContact
    ? [formData.contactByEmail ? 'Email' : null, formData.contactByPhone ? 'Phone' : null].filter(Boolean).join(', ') || 'Open to contact'
    : 'Do not contact';
  const donationTypeForReview = reviewWantsMoney && reviewWantsItems
    ? 'Money + Items'
    : reviewWantsMoney
      ? 'Money'
      : 'Items';
  const verifiedChecks = [
    { label: 'Account signed in', value: user?.username || 'Unknown account', ok: isLoggedIn },
    { label: 'Donation permission', value: canDonate ? `${currentRole || 'User'} account can donate` : 'Role cannot donate', ok: canDonate },
    { label: 'Donor details', value: donorNameForReview || 'Missing donor name', ok: Boolean(donorNameForReview && formData.email && formData.address) },
    { label: 'Terms accepted', value: formData.agreeTerms ? 'Accepted' : 'Not accepted', ok: formData.agreeTerms }
  ];

  const renderReceipt = () => {
    if (!successState) return null;
    return (
      <div className="w-full max-w-sm mx-auto">
        {/* Torn edge top */}
        <div className="receipt-tear-top" />

        <div className="receipt-paper border-x border-slate-200 px-6 py-6 shadow-lg bg-white text-left">
          {/* Receipt header */}
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
            </div>
            <h4 className="text-sm font-black tracking-wider text-slate-900 uppercase">LCCB Alumni</h4>
            <p className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mt-0.5">Donation Receipt</p>
          </div>

          {/* Receipt number and date */}
          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="font-mono">{successState.receipt.receiptNumber}</span>
            <span>{successState.receipt.issuedAt}</span>
          </div>

          {/* Dashed separator */}
          <div className="my-3 border-t border-dashed border-slate-300" />

          {/* Campaign name */}
          <div className="text-center mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Campaign</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{successState.receipt.campaignName}</p>
          </div>

          {/* Dashed separator */}
          <div className="my-3 border-t border-dashed border-slate-300" />

          {/* Itemized details */}
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-slate-500 text-xs font-semibold">Donor</span>
              <span className="font-bold text-slate-900 text-right max-w-[60%] text-xs">{successState.receipt.donorName}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-500 text-xs font-semibold">Type</span>
              <span className="font-bold text-slate-900 text-xs">{successState.receipt.donationTypeLabel}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-500 text-xs font-semibold">Payment</span>
              <span className="font-bold text-slate-900 text-xs">{successState.receipt.paymentMethod}</span>
            </div>
            {successState.receipt.itemSummary && successState.receipt.itemSummary !== 'N/A' && (
              <div className="mt-1">
                <span className="text-slate-500 text-xs font-semibold block mb-1">Items / Notes</span>
                <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed border border-slate-100 font-medium">
                  {successState.receipt.itemSummary}
                </div>
              </div>
            )}
          </div>

          {/* Dashed separator */}
          <div className="my-3 border-t border-dashed border-slate-300" />

          {/* Total amount - big and bold like actual receipts */}
          <div className="text-center py-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Amount</p>
            <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {successState.receipt.amountLabel !== 'N/A' ? successState.receipt.amountLabel : '—'}
            </p>
          </div>

          {/* Dashed separator */}
          <div className="my-3 border-t border-dashed border-slate-300" />

          {/* PAID stamp */}
          <div className="flex justify-center py-2">
            <div className="inline-flex items-center gap-1.5 border-2 border-emerald-500 rounded-lg px-5 py-1.5 transform -rotate-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-black tracking-[0.3em] text-emerald-600 uppercase">Paid</span>
            </div>
          </div>

          {/* Thank you message */}
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500 font-bold">Thank you for your generous donation!</p>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">This receipt serves as your proof of donation.</p>
          </div>

          {/* Barcode-style decoration */}
          <div className="mt-4 flex items-center justify-center gap-[2px] opacity-40">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900"
                style={{
                  width: i % 3 === 0 ? '2px' : '1px',
                  height: i % 5 === 0 ? '18px' : i % 3 === 0 ? '14px' : '10px'
                }}
              />
            ))}
          </div>
          <p className="text-center text-[9px] text-slate-400 mt-1 font-mono tracking-wider font-semibold">
            {successState.receipt.receiptNumber}
          </p>
        </div>

        {/* Torn edge bottom */}
        <div className="receipt-tear-bottom" />
      </div>
    );
  };

  const renderDonationStepper = () => (
    <nav
      className="donation-stepper border-t border-slate-200 bg-white px-4 py-5 sm:px-8"
      aria-label="Donation progress"
      style={{
        '--donation-step': currentStep,
        '--donation-steps': donationSteps.length
      }}
    >
      <p className="donation-stepper__label">
        Step {Math.min(currentStep, donationSteps.length)} of {donationSteps.length}
      </p>
      <div className="donation-stepper__track-wrap">
        <div className="donation-stepper__track-bg" aria-hidden="true" />
        <div className="donation-stepper__track-fill" aria-hidden="true" />
        <ol className="donation-stepper__list">
          {donationSteps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStep;
            const isComplete = stepNum < currentStep;
            const stateClass = isComplete ? 'is-complete' : isActive ? 'is-active' : '';
            return (
              <li
                key={step.number}
                className={`donation-stepper__item ${stateClass}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="donation-stepper__marker">
                  {isComplete ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </span>
                <span className="donation-stepper__title">{step.title}</span>
                <span className="donation-stepper__desc">{step.description}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-100 px-6 py-6 text-slate-900 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-600">Donation journey</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Donate to {campaign?.purpose}</h1>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-600">Signed in as</div>
              <div className="mt-1 font-semibold text-slate-900">{user?.username || 'Guest user'}</div>
              <div className="text-slate-500">{currentRole ? currentRole.toUpperCase() : 'No role detected'}</div>
            </div>
          </div>

          {renderDonationStepper()}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(460px,1.05fr)] xl:items-start">
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-200">
            {campaign.image && (
              <img
                src={campaign.image.startsWith('/') ? `${IMAGE_BASE_URL}${campaign.image}` : campaign.image}
                alt={campaign.purpose}
                className="w-full h-52 object-cover"
              />
            )}
            <div className="p-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{campaign.purpose}</h2>
              {campaignDescription && <p className="text-gray-600 mb-6 leading-7">{campaignDescription}</p>}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-600">Campaign</div>
                  <div className="mt-1 font-semibold text-slate-900">{campaign.category || 'General'}</div>
                  <div className="text-sm text-slate-600">Ends {campaign.date ? new Date(campaign.date).toLocaleDateString() : 'when complete'}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Goal</div>
                  <div className="mt-1 font-semibold text-slate-900">{campaign.goal ? formatAmount(campaign.goal) : 'Open target'}</div>
                  <div className="text-sm text-slate-600">Raised {formatAmount(campaign.amount)}</div>
                </div>
              </div>

              {campaign.goal && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Raised: {formatAmount(campaign.amount)}</span>
                    <span>Goal: {formatAmount(campaign.goal)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-900 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${calculateProgress(campaign.amount, campaign.goal)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-lg">
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Step {currentStep} of 5</p>
              <h3 className="mt-2 text-2xl font-bold">Make a Donation</h3>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800">{error}</div>}

            {successState ? (
              <div className="flex flex-col items-center">
                {/* Success header */}
                <div className="mb-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">Donation Successful!</h3>
                  <p className="mt-1 text-sm text-slate-500">Thank you for your generous contribution.</p>
                </div>

                {/* Render the receipt component */}
                {renderReceipt()}

                {/* Action buttons below receipt */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessState(null);
                      navigate('/donations');
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    Back to Donations
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsReceiptFullscreen(true)}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    View Fullscreen
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const receiptText = [
                        '================================',
                        '       LCCB Alumni',
                        '       Donation Receipt',
                        '================================',
                        '',
                        `Receipt No: ${successState.receipt.receiptNumber}`,
                        `Date: ${successState.receipt.issuedAt}`,
                        '',
                        `Campaign: ${successState.receipt.campaignName}`,
                        '',
                        '--------------------------------',
                        `Donor: ${successState.receipt.donorName}`,
                        `Type: ${successState.receipt.donationTypeLabel}`,
                        `Payment: ${successState.receipt.paymentMethod}`,
                        `Items/Notes: ${successState.receipt.itemSummary}`,
                        '--------------------------------',
                        '',
                        `TOTAL: ${successState.receipt.amountLabel}`,
                        '',
                        '        *** PAID ***',
                        '',
                        'Thank you for your donation!',
                        '================================'
                      ].join('\n');
                      navigator.clipboard.writeText(receiptText).then(() => {
                        toast.success('Receipt copied to clipboard', { position: 'bottom-left', autoClose: 2500 });
                      }).catch(() => {
                        toast.error('Unable to copy receipt right now', { position: 'bottom-left', autoClose: 2500 });
                      });
                    }}
                    className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Receipt
                  </button>
                </div>

                {/* Fullscreen Overlay Portal */}
                {isReceiptFullscreen && createPortal(
                  <div 
                    className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md px-4 py-8 overflow-y-auto"
                    onClick={() => setIsReceiptFullscreen(false)}
                  >
                    {/* Top Info Bar */}
                    <div className="mb-6 text-center max-w-sm pointer-events-none select-none">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-white rounded-full text-xs font-semibold tracking-wider uppercase mb-1">
                        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Fullscreen Receipt
                      </span>
                      <p className="text-[11px] text-slate-300 font-medium">Click outside the receipt or click exit to close</p>
                    </div>

                    {/* Receipt Wrapper with custom large scale and box glow */}
                    <div 
                      className="w-full max-w-sm transform scale-[1.03] sm:scale-[1.08] transition-transform duration-300 shadow-[0_24px_60px_rgba(0,0,0,0.6)] rounded-2xl overflow-visible"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderReceipt()}
                    </div>

                    {/* Floating Exit Button outside the screenshot bounds */}
                    <button
                      onClick={() => setIsReceiptFullscreen(false)}
                      className="mt-8 rounded-xl border border-white/20 bg-white/15 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-white/25 hover:border-white/35 transition-all duration-200 transform active:scale-95 flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Exit Fullscreen
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {currentStep === 1 && (
                  <div>
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Donation type</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { key: 'money', label: 'Money' },
                          { key: 'items', label: 'Items' },
                          { key: 'both', label: 'Both' }
                        ].map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, donationType: option.key }))}
                            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                              formData.donationType === option.key
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      {(formData.donationType === 'items' || formData.donationType === 'both') && (
                        <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">What items are you donating? *</label>
                            <textarea
                              name="itemDescription"
                              value={formData.itemDescription}
                              onChange={handleInputChange}
                              rows="3"
                              className="w-full rounded-xl border border-slate-300 px-4 py-3"
                              placeholder="e.g. Books, shirts, shoes"
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity *</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                step="1"
                                name="itemQuantity"
                                value={formData.itemQuantity}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                                placeholder="20"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Condition</label>
                              <input
                                type="text"
                                name="itemCondition"
                                value={formData.itemCondition}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                                placeholder="New or gently used"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {(formData.donationType === 'money' || formData.donationType === 'both') && (
                      <>
                        <div className="grid gap-4 gap-y-4 sm:grid-cols-[1.2fr_1.8fr] items-start mb-4">
                          <div ref={currencyMenuRef} className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Donation currency *</label>
                            <button
                              type="button"
                              onClick={() => setCurrencyMenuOpen((prev) => !prev)}
                              className={`relative w-full text-left rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition duration-200 ${currencyMenuOpen ? 'ring-2 ring-blue-900 shadow-md' : 'hover:shadow-sm'}`}
                              aria-haspopup="listbox"
                              aria-expanded={currencyMenuOpen}
                            >
                              <span className="block truncate">
                                {currencyOptions.find((option) => option.value === formData.currency)?.label || formData.currency}
                              </span>
                              <span className={`pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 transition-transform duration-200 ${currencyMenuOpen ? 'rotate-180' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </span>
                            </button>

                            {currencyMenuOpen && (
                              <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                                <div className="max-h-[294px] overflow-y-auto">
                                  {currencyOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, currency: option.value }));
                                        setCurrencyMenuOpen(false);
                                      }}
                                      className={`w-full px-4 py-3 text-left text-sm transition ${
                                        formData.currency === option.value
                                          ? 'bg-blue-700 font-semibold text-white'
                                          : 'text-slate-700 hover:bg-slate-100'
                                      }`}
                                      role="option"
                                      aria-selected={formData.currency === option.value}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Donation Amount ({formData.currency}) *</label>
                            <p className="text-xs text-slate-500">Choose the currency you want to donate in for your current location.</p>
                          </div>
                        </div>

                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {presetAmounts.map((presetAmount) => (
                            <button
                              key={presetAmount}
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, amount: String(presetAmount) }))}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              {formatAmount(presetAmount, formData.currency)}
                            </button>
                          ))}
                        </div>

                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500 text-sm">
                            {getCurrencySymbol(formData.currency)}
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            name="amount"
                            value={formData.amount}
                            onChange={handleInputChange}
                            min="1"
                            step="0.01"
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-11"
                            placeholder={`Enter amount in ${formData.currency}`}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Complete your details</p>
                      <h2 className="text-2xl font-bold text-slate-900">Complete your details to make a donation</h2>
                      <p className="text-sm text-slate-600">Please fill in the details below so we can process your donation and keep you informed.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                      <input
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="e.g. Mr or Ms"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">First name</label>
                        <input
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          placeholder="First name"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Last name</label>
                        <input
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          placeholder="Last name"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        />
                      </div>
                    </div>

                    <div ref={countryMenuRef} className="relative">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Where do you live?</label>
                      <button
                        type="button"
                        onClick={() => setCountryMenuOpen((prev) => !prev)}
                        className={`relative w-full rounded-2xl border-0 bg-white px-4 py-3 pr-10 text-left text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 transition focus:outline-none ${countryMenuOpen ? 'ring-2 ring-slate-900' : 'hover:shadow-md'}`}
                        aria-haspopup="listbox"
                        aria-expanded={countryMenuOpen}
                      >
                        <span className="block truncate">{formData.country}</span>
                        <span className={`pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 transition-transform duration-200 ${countryMenuOpen ? 'rotate-180' : ''}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>
                      {countryMenuOpen && (
                        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                          <div className="max-h-[294px] overflow-y-auto">
                            {countryOptions.map((country) => (
                              <button
                                key={country}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, country }));
                                  setCountryMenuOpen(false);
                                }}
                                className={`block w-full px-4 py-3 text-left text-sm transition ${
                                  formData.country === country
                                    ? 'bg-blue-700 font-semibold text-white'
                                    : 'text-slate-700 hover:bg-slate-100'
                                }`}
                                role="option"
                                aria-selected={formData.country === country}
                              >
                                {country}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Find your address</label>
                      <input
                        ref={addressInputRef}
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Start typing your address"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <button
                        type="button"
                        onClick={() => addressInputRef.current?.focus()}
                        className="text-slate-700 underline underline-offset-2"
                      >
                        Enter address manually
                      </button>
                    </div>

                    {formData.address && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Review your address</p>
                            <p className="text-sm text-slate-500">Confirm the address we can use for your donation.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addressInputRef.current?.focus()}
                            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{formData.address}</div>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="name@example.com"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Phone number (optional)</label>
                        <input
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Phone number"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-700">Contact preferences</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm transition-all ${formData.allowContact ? 'border-slate-900 bg-white text-slate-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                          <input
                            type="radio"
                            name="allowContact"
                            value="yes"
                            checked={formData.allowContact === true}
                            onChange={() => setFormData((prev) => ({ ...prev, allowContact: true }))}
                            className="mt-1 h-4 w-4 rounded border-slate-300"
                          />
                          <div>
                            <div className="font-semibold">I'm happy to be contacted</div>
                            <p className="text-sm text-slate-500">For updates by email or phone related to this donation.</p>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm transition-all ${formData.allowContact ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300' : 'border-slate-900 bg-white text-slate-900 shadow-sm'}`}>
                          <input
                            type="radio"
                            name="allowContact"
                            value="no"
                            checked={formData.allowContact === false}
                            onChange={() => setFormData((prev) => ({ ...prev, allowContact: false, contactByEmail: false, contactByPhone: false }))}
                            className="mt-1 h-4 w-4 rounded border-slate-300"
                          />
                          <div>
                            <div className="font-semibold">Please don't contact me</div>
                            <p className="text-sm text-slate-500">Do not contact me by email or phone for the purposes stated.</p>
                          </div>
                        </label>
                      </div>
                      {formData.allowContact && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              name="contactByEmail"
                              checked={formData.contactByEmail}
                              onChange={handleInputChange}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            Email updates
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              name="contactByPhone"
                              checked={formData.contactByPhone}
                              onChange={handleInputChange}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            Phone updates
                          </label>
                        </div>
                      )}
                    </div>

                    <label className="flex items-start gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleInputChange} className="mt-1" />
                      <span>
                        I have read and agree to the Enthuse <a href="/terms" className="text-blue-600 underline">terms & conditions</a> and <a href="/privacy" className="text-blue-600 underline">privacy policy</a>.
                      </span>
                    </label>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Verify before payment</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">Review your donation details</h2>
                        <p className="mt-2 text-sm text-slate-600">Make sure your account, donor details, and contribution summary are correct before continuing.</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${isLoggedIn && canDonate ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {isLoggedIn && canDonate ? 'Verified' : 'Needs login'}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {verifiedChecks.map((check) => (
                        <div key={check.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${check.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {check.ok ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12V16.5z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900">{check.label}</div>
                              <div className="mt-1 break-words text-sm text-slate-600">{check.value}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{campaign?.purpose}</div>
                          <div className="mt-1 text-sm text-slate-500">Campaign selected for this donation</div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-700">{donationTypeForReview}</span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {reviewWantsMoney && (
                          <div className="rounded-xl bg-slate-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Amount</div>
                            <div className="mt-1 text-xl font-black text-slate-900">{formatAmount(formData.amount, formData.currency)}</div>
                            <div className="text-sm text-slate-500">Currency: {formData.currency}</div>
                          </div>
                        )}
                        {reviewWantsItems && (
                          <div className="rounded-xl bg-slate-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Items</div>
                            <div className="mt-1 text-sm font-bold text-slate-900">{formData.itemDescription}</div>
                            <div className="text-sm text-slate-500">Quantity: {formData.itemQuantity || '1'}</div>
                            <div className="text-sm text-slate-500">Condition: {formData.itemCondition || 'Usable condition'}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                        <div className="font-bold text-slate-900">Donor contact</div>
                        <div className="mt-2">{formData.email}</div>
                        <div>{formData.phone || 'No phone number provided'}</div>
                        <div className="mt-2 text-slate-500">{contactPreferenceForReview}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                        <div className="font-bold text-slate-900">Campaign payment details</div>
                        <div className="mt-2">Number: {paymentNumber}</div>
                        <div>Methods: {paymentMethods}</div>
                        {reviewWantsItems && <div className="mt-2 text-slate-500">Drop-off: {formData.itemDropOff || deliveryInstructions || itemInstructions}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    {(formData.donationType === 'items' || formData.donationType === 'both') && (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        <div className="font-semibold">Item donation summary</div>
                        <div className="mt-2">Items: {formData.itemDescription}</div>
                        <div>Quantity: {formData.itemQuantity}</div>
                        <div>Condition: {formData.itemCondition || 'Usable condition'}</div>
                        <div>Drop-off: {formData.itemDropOff || deliveryInstructions || itemInstructions}</div>
                      </div>
                    )}

                    {(formData.donationType === 'money' || formData.donationType === 'both') && (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        <div className="font-semibold">Payment summary</div>
                        <div className="mt-2">Amount: {formatAmount(formData.amount, formData.currency)}</div>
                        <div>Currency: {formData.currency}</div>
                      </div>
                    )}

                    {(formData.donationType === 'money' || formData.donationType === 'both') && (
                      <>
                        <h3 className="text-base font-semibold text-slate-900">Please select a payment method:</h3>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {paymentMethodOptions.map((method) => (
                            <button
                              key={method.key}
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: method.key }))}
                              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all flex items-center gap-3 ${
                                formData.paymentMethod === method.key
                                  ? 'border-slate-900 bg-white text-slate-900 shadow-md'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex-shrink-0">
                                {method.icon}
                              </div>
                              <span>{method.label}</span>
                            </button>
                          ))}
                        </div>

                        {formData.paymentMethod === 'card' && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                            <div className="flex justify-center">{paymentMethodOptions.find((method) => method.key === 'card')?.logo}</div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Card number *</label>
                              <input type="text" name="cardNumber" value={paymentDetails.cardNumber} onChange={handlePaymentDetailChange} placeholder="•••• •••• •••• ••••" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Expiration date *</label>
                                <input type="text" name="expiryMonth" value={paymentDetails.expiryMonth} onChange={handlePaymentDetailChange} placeholder="MM/YY" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Security code *</label>
                                <input type="password" name="cvv" value={paymentDetails.cvv} onChange={handlePaymentDetailChange} placeholder="•••" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                              </div>
                            </div>
                          </div>
                        )}

                        {formData.paymentMethod === 'paymaya' && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4">
                            {paymentMethodOptions.find((method) => method.key === 'paymaya')?.logo}
                            <p className="text-sm text-slate-600">You will be redirected to the PayMaya form. Please fill out all the required form fields.</p>
                          </div>
                        )}

                        {formData.paymentMethod === 'gcash' && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4">
                            {paymentMethodOptions.find((method) => method.key === 'gcash')?.logo}
                            <p className="text-sm text-slate-600">You will be redirected to the GCash form. Please fill out all the required form fields.</p>
                          </div>
                        )}
                      </>
                    )}

                    {formData.donationType === 'items' && (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        Item-only donations do not require payment.
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={currentStep === 1 ? () => navigate('/donations') : goBack} className="flex-1 rounded-xl border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50">
                    {currentStep === 1 ? 'Cancel' : 'Back'}
                  </button>
                  {currentStep < 4 ? (
                    <button type="button" onClick={goNext} disabled={!isLoggedIn || !canDonate || stepLoading} className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400">
                      {stepLoading ? 'Processing...' : currentStep === 3 ? 'Continue to Payment' : 'Next'}
                    </button>
                  ) : (
                    <button type="submit" disabled={!isLoggedIn || !canDonate || submitting} className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400">
                      {submitting
                        ? 'Processing...'
                        : formData.donationType === 'items'
                          ? 'Confirm Item Donation'
                          : 'Pay'}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonatePage;
