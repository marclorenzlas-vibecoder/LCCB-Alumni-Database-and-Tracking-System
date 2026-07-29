import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import donationService from '../services/donationService';
import { authService } from '../services/authService';
import { IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { extractDonationMeta, withDonationMeta } from '../utils/donationMeta';
import paymayaLogo from '../assets/paymaya.png';
import gcashLogo from '../assets/gcash1.png';

const MAX_ITEM_IMAGES = 6;
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

const StyledDropdown = ({
  label,
  value,
  placeholder,
  options,
  isOpen,
  setIsOpen,
  onChange,
  menuRef,
  enableLetterJump = false
}) => {
  const optionRefs = useRef({});
  const selectedOption = options.find((option) => option.value === value);

  const chooseOption = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const jumpToLetter = (letter) => {
    const normalizedLetter = letter.toLowerCase();
    const matches = options.filter((option) => option.label.toLowerCase().startsWith(normalizedLetter));
    if (matches.length === 0) return;

    const nextOption = normalizedLetter === 'p'
      ? matches.find((option) => option.label.toLowerCase().includes('peso')) || matches[0]
      : matches[0];

    onChange(nextOption.value);
    setIsOpen(true);
    window.requestAnimationFrame(() => {
      optionRefs.current[nextOption.value]?.scrollIntoView({ block: 'nearest' });
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (!enableLetterJump || event.key.length !== 1 || !/^[a-z]$/i.test(event.key)) return;
    event.preventDefault();
    jumpToLetter(event.key);
  };

  return (
    <div ref={menuRef} className="relative" onKeyDown={handleKeyDown}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative w-full text-left rounded-2xl border border-slate-300 bg-white py-3 pl-4 pr-11 text-sm text-slate-900 shadow-sm transition duration-200 ${isOpen ? 'ring-2 ring-blue-900 shadow-md' : 'hover:shadow-sm'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`block truncate ${selectedOption ? '' : 'text-slate-400'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <span className={`pointer-events-none absolute inset-y-0 right-3 flex w-5 items-center justify-center text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="max-h-[294px] overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                ref={(node) => {
                  optionRefs.current[option.value] = node;
                }}
                onClick={() => chooseOption(option)}
                className={`w-full px-4 py-3 text-left text-sm transition ${
                  value === option.value
                    ? 'bg-blue-700 font-semibold text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);
  const addressInputRef = useRef(null);
  const currencyMenuRef = useRef(null);
  const countryMenuRef = useRef(null);
  const itemCategoryMenuRef = useRef(null);
  const itemConditionMenuRef = useRef(null);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [itemCategoryMenuOpen, setItemCategoryMenuOpen] = useState(false);
  const [itemConditionMenuOpen, setItemConditionMenuOpen] = useState(false);

  const [formData, setFormData] = useState({
    donationType: 'money',
    amount: '',
    date: new Date().toISOString().split('T')[0],
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
    currency: 'PHP',
    paymentMethod: 'gcash'
  });

  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImages, setItemImages] = useState([]);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);

  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemCategory, setItemCategory] = useState('');
  const [itemCondition, setItemCondition] = useState('New');

  const [deliveryMethod, setDeliveryMethod] = useState('dropoff');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliverySchedule, setDeliverySchedule] = useState('');

  const user = authService.getCurrentUser();
  const isLoggedIn = authService.isLoggedIn();
  const currentRole = authService.getRole();
  const canDonate = currentRole === 'alumni' || currentRole === 'admin' || currentRole === 'teacher';

  const isMoneyPath = formData.donationType === 'money';
  const isWalletPaymentMethod = formData.paymentMethod === 'gcash' || formData.paymentMethod === 'paymaya';
  const receiptRequiredMessage = isMoneyPath && isWalletPaymentMethod
    ? 'Please submit your receipt and payment screenshot first. Your receipt and screenshot are your proof of donation.'
    : 'Please submit your receipt first. Your receipt is your proof of donation.';
  const hasPendingReceipt = Boolean(successState) && !receiptSubmitted;
  const donationSteps = isMoneyPath ? [
    { number: '1', title: 'Amount', description: 'Enter donation amount' },
    { number: '2', title: 'Verify', description: 'Review donor details' },
    { number: '3', title: 'Pay', description: 'Complete payment' },
    { number: '4', title: 'Complete', description: 'Donation recorded' }
  ] : [
    { number: '1', title: 'Select Items', description: 'Enter item info' },
    { number: '2', title: 'Verify Details', description: 'Review item info' },
    { number: '3', title: 'Delivery Information', description: 'Select delivery method' },
    { number: '4', title: 'Complete', description: 'Donation recorded' }
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
  ].sort((a, b) => a.label.localeCompare(b.label));

  const itemCategoryOptions = [
    { value: 'Educational Supplies / Books', label: 'Educational Supplies / Books' },
    { value: 'School Uniforms / Clothing', label: 'School Uniforms / Clothing' },
    { value: 'IT Hardware / Electronic Equipment', label: 'IT Hardware / Electronic Equipment' },
    { value: 'Sports Equipment', label: 'Sports Equipment' },
    { value: 'Classroom Furniture / General Supplies', label: 'Classroom Furniture / General Supplies' },
    { value: 'Other', label: 'Other' }
  ];

  const itemConditionOptions = [
    { value: 'New', label: 'New' },
    { value: 'Like New', label: 'Like New' },
    { value: 'Good', label: 'Good' },
    { value: 'Fair', label: 'Fair' },
    { value: 'Poor', label: 'Poor' }
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
  const paymentNumber = campaignMeta.paymentNumber || '';
  const gcashNumber = campaignMeta.gcashNumber || paymentNumber;
  const paymayaNumber = campaignMeta.paymayaNumber || paymentNumber;
  const paymentMethods = campaignMeta.paymentMethods || 'GCash / PayMaya / Debit Card';
  const selectedWalletNumber = formData.paymentMethod === 'paymaya'
    ? paymayaNumber
    : formData.paymentMethod === 'gcash'
      ? gcashNumber
      : paymentNumber;

  const paymentProviders = {
    paymaya: { label: 'PayMaya' },
    gcash: { label: 'GCash' }
  };

  const paymentMethodOptions = [
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

  // Auto-populate donor details from the logged-in user's session
  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      firstName: prev.firstName
        || user.alumni?.firstName || user.alumni?.first_name
        || user.firstName || user.first_name || '',
      lastName: prev.lastName
        || user.alumni?.lastName || user.alumni?.last_name
        || user.lastName || user.last_name || '',
      email: prev.email || user.email || '',
      phone: prev.phone
        || user.alumni?.contactNumber || user.alumni?.contact_number
        || user.contactNumber || user.contact_number || '',
      address: prev.address
        || user.alumni?.location
        || user.location || '',
      agreeTerms: true,
      allowContact: true,
      contactByEmail: true
    }));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(event.target)) {
        setCurrencyMenuOpen(false);
      }
      if (countryMenuRef.current && !countryMenuRef.current.contains(event.target)) {
        setCountryMenuOpen(false);
      }
      if (itemCategoryMenuRef.current && !itemCategoryMenuRef.current.contains(event.target)) {
        setItemCategoryMenuOpen(false);
      }
      if (itemConditionMenuRef.current && !itemConditionMenuRef.current.contains(event.target)) {
        setItemConditionMenuOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setCurrencyMenuOpen(false);
        setCountryMenuOpen(false);
        setItemCategoryMenuOpen(false);
        setItemConditionMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    if (!hasPendingReceipt) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = receiptRequiredMessage;
      return receiptRequiredMessage;
    };

    const handlePopState = () => {
      window.history.pushState({ pendingDonationReceipt: true }, '', window.location.href);
      toast.warning(receiptRequiredMessage);
    };

    const handleDocumentClick = (event) => {
      const anchor = event.target.closest?.('a[href]');
      if (!anchor) return;

      const targetUrl = new URL(anchor.href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;

      event.preventDefault();
      event.stopPropagation();
      toast.warning(receiptRequiredMessage);
    };

    window.history.pushState({ pendingDonationReceipt: true }, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [hasPendingReceipt, receiptRequiredMessage]);

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

  const handlePaymentScreenshotChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 1) {
      toast.warning('You can only upload 1 payment screenshot.');
    }
    setPaymentScreenshot(files[0] || null);
  };

  const validateStepOne = () => {
    if (formData.donationType === 'items') {
      if (!itemName.trim()) {
        toast.warning('Please enter an item name.');
        return false;
      }
      if (itemImages.length === 0) {
        toast.warning('Please upload at least one photo of the item.');
        return false;
      }
      return true;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.warning('Please choose or enter a valid donation amount first.');
      return false;
    }
    return true;
  };

  const validateMoneyPaymentDetails = () => {
    if (formData.paymentMethod === 'gcash' && !gcashNumber.trim()) {
      toast.warning('This campaign does not have a GCash number yet.');
      return false;
    }

    if (formData.paymentMethod === 'paymaya' && !paymayaNumber.trim()) {
      toast.warning('This campaign does not have a PayMaya number yet.');
      return false;
    }

    return true;
  };

  const validateItemDeliveryDetails = () => {
    if (!deliveryMethod) {
      toast.warning('Please select a delivery method.');
      return false;
    }

    if (deliveryMethod === 'pickup' && !deliveryAddress.trim()) {
      toast.warning('Please enter the pickup address.');
      return false;
    }

    if (!deliverySchedule.trim()) {
      toast.warning('Please enter your preferred delivery date and time.');
      return false;
    }

    return true;
  };

  const goBack = () => setCurrentStep((step) => Math.max(1, step - 1));

  const goNext = () => {
    if (currentStep === 1 && !validateStepOne()) return;

    setStepLoading(true);
    window.setTimeout(() => {
      setCurrentStep((step) => Math.min(3, step + 1));
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
    const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();
    return fullName || user?.username || 'Anonymous donor';
  };

  const buildDonationReceipt = (updatedCampaign) => {
    const receiptNumber = `RCPT-${Date.now().toString().slice(-8)}`;

    return {
      receiptNumber,
      issuedAt: new Date().toLocaleString(),
      donorName: getDonorDisplayName(),
      campaignName: campaign?.purpose || 'Donation Campaign',
      donationTypeLabel: formData.donationType === 'items' ? `Item: ${itemName}` : 'Money',
      amountLabel: formData.donationType === 'items' ? 'Physical Item' : formatAmount(formData.amount, formData.currency),
      paymentMethod: formData.donationType === 'items' ? 'Physical Item' : (paymentProviders[formData.paymentMethod]?.label || 'GCash')
    };
  };

  const handleSubmit = (e) => {
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

    if (!validateStepOne()) return;

    if (isMoneyPath && !validateMoneyPaymentDetails()) return;
    if (!isMoneyPath && !validateItemDeliveryDetails()) return;

    // Generate local receipt preview first
    const receipt = buildDonationReceipt();

    setSuccessState({
      campaign: campaign,
      receipt
    });
    setReceiptSubmitted(false);
    setCurrentStep(4);

  };

  const handleReceiptSubmission = async () => {
    try {
      setSubmitting(true);
      setError('');

      if (isMoneyPath && isWalletPaymentMethod && !paymentScreenshot) {
        toast.warning('Please upload a screenshot of your GCash or PayMaya payment first.');
        return;
      }

      const paymentSummary = isMoneyPath
        ? [
            `Payment method: ${paymentProviders[formData.paymentMethod]?.label || 'GCash'}`,
            `Payment number: ${selectedWalletNumber}`,
            `Currency: ${formData.currency}`
          ].join('\n')
        : [
            `Delivery method: ${deliveryMethod === 'pickup' ? 'Pickup' : 'Drop-off'}`,
            deliveryMethod === 'pickup' ? `Pickup address: ${deliveryAddress}` : null,
            `Preferred schedule: ${deliverySchedule}`
          ].filter(Boolean).join('\n');

      const donationMeta = {
        donationMode: formData.donationType === 'items' ? 'item' : 'money',
        paymentCurrency: isMoneyPath ? formData.currency : null,
        paymentMethod: isMoneyPath ? (paymentProviders[formData.paymentMethod]?.label || 'GCash') : null,
        paymentNumber: isMoneyPath ? selectedWalletNumber : null,
        paymentMethods: isMoneyPath ? paymentMethods : null,
        deliveryMethod: !isMoneyPath ? deliveryMethod : null,
        deliveryAddress: !isMoneyPath && deliveryMethod === 'pickup' ? deliveryAddress : null,
        deliverySchedule: !isMoneyPath ? deliverySchedule : null,
      };

      const donorSummary = [
        `Donor: ${[formData.firstName, formData.lastName].filter(Boolean).join(' ')}`,
        `Country: ${formData.country}`,
        `Address: ${formData.address}`,
        formData.phone ? `Phone: ${formData.phone}` : null,
        formData.allowContact
          ? `Contact preference: ${[formData.contactByEmail ? 'Email' : null, formData.contactByPhone ? 'Phone' : null].filter(Boolean).join(', ') || 'Open to contact'}`
          : 'Contact preference: Do not contact',
        `Agreement: ${formData.agreeTerms ? 'Accepted' : 'Not accepted'}`,
        paymentSummary
      ].filter(Boolean).join('\n');

      const payload = {
        amount: formData.donationType === 'items' ? 0 : parseFloat(formData.amount),
        description: withDonationMeta(donorSummary, donationMeta),
        date: formData.date
      };

      let updatedCampaign;
      if (formData.donationType === 'items') {
        const fd = new FormData();
        fd.append('amount', '0');
        fd.append('description', withDonationMeta(donorSummary, donationMeta));
        fd.append('date', formData.date);
        fd.append('donation_type', 'items');
        fd.append('item_name', itemName);
        if (itemDescription) fd.append('item_description', itemDescription);
        itemImages.forEach((file) => fd.append('images', file));
        updatedCampaign = await donationService.contributeToDonation(campaign.id, fd);
      } else if (isWalletPaymentMethod) {
        const fd = new FormData();
        fd.append('amount', String(parseFloat(formData.amount)));
        fd.append('description', withDonationMeta(donorSummary, donationMeta));
        fd.append('date', formData.date);
        fd.append('donation_type', 'money');
        fd.append('payment_screenshot', paymentScreenshot);
        updatedCampaign = await donationService.contributeToDonation(campaign.id, fd);
      } else {
        updatedCampaign = await donationService.contributeToDonation(campaign.id, payload);
      }

      // Update local states on success
      setCampaign(updatedCampaign || {
        ...campaign,
        amount: campaign.amount + (payload.amount || 0)
      });
      setReceiptSubmitted(true);

      if (isMoneyPath && campaignId && formData.amount && parseFloat(formData.amount) > 0) {
        donationService.broadcastDonationToast(campaignId, {
          amount: formData.amount,
          currency: formData.currency,
          note: ''
        }).catch(() => {});
      }

      toast.success('Receipt submitted! Your donation has been recorded and is visible to the admin.', {
        autoClose: 3500
      });
      
      setTimeout(() => {
        navigate('/donations', { replace: true });
      }, 1500);
    } catch (err) {
      console.error('Error submitting donation receipt:', err);
      const rawErrorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to submit donation receipt';
      const errorMsg = isMoneyPath && isWalletPaymentMethod && /item photos/i.test(rawErrorMsg)
        ? 'You can only upload 1 payment screenshot.'
        : rawErrorMsg;
      setError(errorMsg);
      toast.error(errorMsg);
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

  const donorNameForReview = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim() || user?.username || '';
  const verifiedChecks = [
    { label: 'Account signed in', value: user?.username || user?.email || 'Unknown account', ok: isLoggedIn },
    { label: 'Donation permission', value: canDonate ? `${currentRole || 'User'} account can donate` : 'Role cannot donate', ok: canDonate },
    { label: 'Donor name', value: donorNameForReview || 'Name not found', ok: Boolean(donorNameForReview) },
    { label: 'Email address', value: formData.email || 'Email not found', ok: Boolean(formData.email) }
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
            const isCurrentDone = currentStep >= donationSteps.length && stepNum === donationSteps.length;
            const showCheck = isComplete || isCurrentDone;
            const stateClass = showCheck ? 'is-complete' : isActive ? 'is-active' : '';
            return (
              <li
                key={step.number}
                className={`donation-stepper__item ${stateClass}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="donation-stepper__marker">
                  {showCheck ? (
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
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Step {currentStep} of {donationSteps.length}</p>
              <h3 className="mt-2 text-2xl font-bold">{isMoneyPath ? 'Make a Donation' : 'Donate Physical Items'}</h3>
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
                  <p className="mt-1 text-sm text-slate-500">
                    {isMoneyPath && isWalletPaymentMethod
                      ? 'Upload your wallet payment screenshot so the admin can compare it with this receipt.'
                      : 'Thank you for your generous contribution.'}
                  </p>
                </div>

                {/* Render the receipt component */}
                {renderReceipt()}

                {isMoneyPath && isWalletPaymentMethod && (
                  <div className="mt-6 w-full max-w-md rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                    <label className="block text-sm font-bold text-slate-900">
                      GCash / PayMaya payment screenshot *
                    </label>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Upload the screenshot from your wallet app. The admin will compare the amount in this screenshot with the receipt amount.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple={false}
                      onChange={handlePaymentScreenshotChange}
                      className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    />
                    {paymentScreenshot && (
                      <p className="mt-2 truncate text-xs font-semibold text-blue-900">
                        Selected: {paymentScreenshot.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons below receipt */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!receiptSubmitted) {
                        toast.warning(receiptRequiredMessage);
                        return;
                      }
                      setSuccessState(null);
                      navigate('/donations', { replace: true });
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    Back to Donations
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleReceiptSubmission}
                    className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {submitting ? 'Submitting...' : isMoneyPath && isWalletPaymentMethod ? 'Submit Receipt & Screenshot' : 'Submit Receipt'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {currentStep === 1 && (
                  <div>
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Donation Type</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, donationType: 'money' }))}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            formData.donationType === 'money'
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-blue-300 text-slate-600'
                          }`}
                        >
                          Money
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, donationType: 'items' }))}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            formData.donationType === 'items'
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-blue-300 text-slate-600'
                          }`}
                        >
                          Item
                        </button>
                      </div>
                    </div>

                    {formData.donationType === 'money' ? (
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="grid gap-4 gap-y-4 sm:grid-cols-[1.2fr_1.8fr] items-start mb-4">
                        <StyledDropdown
                          label="Donation currency"
                          value={formData.currency}
                          options={currencyOptions}
                          isOpen={currencyMenuOpen}
                          setIsOpen={setCurrencyMenuOpen}
                          onChange={(currency) => setFormData((prev) => ({ ...prev, currency }))}
                          menuRef={currencyMenuRef}
                          enableLetterJump
                        />

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
                    </div>
                    ) : (
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                        <input
                          type="text"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-4 py-3"
                          placeholder="e.g. Books, Laptop, Chair"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={itemQuantity}
                            onChange={(e) => setItemQuantity(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3"
                            placeholder="e.g. 1"
                          />
                        </div>
                        <StyledDropdown
                          label="Category"
                          value={itemCategory}
                          placeholder="Select category"
                          options={itemCategoryOptions}
                          isOpen={itemCategoryMenuOpen}
                          setIsOpen={setItemCategoryMenuOpen}
                          onChange={setItemCategory}
                          menuRef={itemCategoryMenuRef}
                        />
                        <StyledDropdown
                          label="Condition"
                          value={itemCondition}
                          options={itemConditionOptions}
                          isOpen={itemConditionMenuOpen}
                          setIsOpen={setItemConditionMenuOpen}
                          onChange={setItemCondition}
                          menuRef={itemConditionMenuRef}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                        <textarea
                          value={itemDescription}
                          onChange={(e) => setItemDescription(e.target.value)}
                          rows="3"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 resize-none"
                          placeholder="Describe the item condition, quantity, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Photos * (up to {MAX_ITEM_IMAGES})</label>
                        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 cursor-pointer hover:bg-slate-50 transition-all">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Choose Photos
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const incomingFiles = Array.from(e.target.files);
                              setItemImages((prev) => {
                                const nextFiles = [...prev, ...incomingFiles].slice(0, MAX_ITEM_IMAGES);
                                if (prev.length + incomingFiles.length > MAX_ITEM_IMAGES) {
                                  toast.warning(`You can upload up to ${MAX_ITEM_IMAGES} item photos.`);
                                }
                                return nextFiles;
                              });
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {itemImages.length > 0 && (
                          <div className="flex flex-wrap gap-3 mt-3">
                            {itemImages.map((file, idx) => (
                              <div key={idx} className="relative">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`Item ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => setItemImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {/* Verify Details */}
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-6">

                      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Verify details</p>
                          <h2 className="mt-2 text-2xl font-bold text-slate-900">Review your donation details</h2>
                          <p className="mt-2 text-sm text-slate-600">Make sure your details, and contribution summary are correct before continuing.</p>
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
                          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${isMoneyPath ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isMoneyPath ? 'Money' : 'Items'}
                          </span>
                        </div>

                        {isMoneyPath ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 p-4">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Amount</div>
                              <div className="mt-1 text-xl font-black text-slate-900">{formatAmount(formData.amount, formData.currency)}</div>
                              <div className="text-sm text-slate-500">Currency: {formData.currency}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 space-y-4">
                            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Item Preview</div>
                              <div className="text-base font-bold text-slate-900">{itemName}</div>
                              <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
                                <div><strong>Quantity:</strong> {itemQuantity}</div>
                                <div><strong>Category:</strong> {itemCategory || 'General'}</div>
                                <div><strong>Condition:</strong> {itemCondition}</div>
                              </div>
                              {itemImages.length > 0 && (
                                <div className="mt-3 flex gap-2">
                                  {itemImages.map((file, idx) => (
                                    <img
                                      key={idx}
                                      src={URL.createObjectURL(file)}
                                      alt={`Preview ${idx + 1}`}
                                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && !isMoneyPath && (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Delivery details</p>
                      <h2 className="text-2xl font-bold text-slate-900">Delivery Information</h2>
                      <p className="text-sm text-slate-600">Please choose how you would like to deliver the donated items to us.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-700">Delivery Method</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm transition-all cursor-pointer ${deliveryMethod === 'dropoff' ? 'border-blue-900 bg-white text-blue-900 shadow-sm ring-1 ring-blue-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                          <input
                            type="radio"
                            name="deliveryMethod"
                            value="dropoff"
                            checked={deliveryMethod === 'dropoff'}
                            onChange={() => setDeliveryMethod('dropoff')}
                            className="mt-1 h-4 w-4 text-blue-900 border-slate-300"
                          />
                          <div>
                            <div className="font-semibold">Drop-off</div>
                            <p className="text-sm text-slate-500">Deliver the items directly to the school administration office.</p>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm transition-all cursor-pointer ${deliveryMethod === 'pickup' ? 'border-blue-900 bg-white text-blue-900 shadow-sm ring-1 ring-blue-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                          <input
                            type="radio"
                            name="deliveryMethod"
                            value="pickup"
                            checked={deliveryMethod === 'pickup'}
                            onChange={() => setDeliveryMethod('pickup')}
                            className="mt-1 h-4 w-4 text-blue-900 border-slate-300"
                          />
                          <div>
                            <div className="font-semibold">Pickup</div>
                            <p className="text-sm text-slate-500">Request our team to pick up the items from your address.</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {deliveryMethod === 'pickup' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Address *</label>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Enter pickup address"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Schedule / Date & Time *</label>
                      <input
                        type="text"
                        value={deliverySchedule}
                        onChange={(e) => setDeliverySchedule(e.target.value)}
                        placeholder="e.g. Mondays 9:00 AM - 12:00 PM, or July 10, 2026"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && isMoneyPath && (
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      <div className="font-semibold">Payment summary</div>
                      <div className="mt-2">Amount: {formatAmount(formData.amount, formData.currency)}</div>
                      <div>Currency: {formData.currency}</div>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">Please select a payment method:</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {paymentMethodOptions.map((method) => (
                        <button
                          key={method.key}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, paymentMethod: method.key }));
                          }}
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

                    {formData.paymentMethod === 'paymaya' && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4">
                        {paymentMethodOptions.find((method) => method.key === 'paymaya')?.logo}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Send your donation to this PayMaya number:</p>
                          <p className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 font-mono text-lg font-bold text-blue-900">
                            {paymayaNumber || 'Not set'}
                          </p>
                          <p className="mt-3 text-sm text-slate-600">Open PayMaya, use this number to donate, take a screenshot of the payment, then click Proceed.</p>
                        </div>
                      </div>
                    )}

                    {formData.paymentMethod === 'gcash' && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4">
                        {paymentMethodOptions.find((method) => method.key === 'gcash')?.logo}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Send your donation to this GCash number:</p>
                          <p className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 font-mono text-lg font-bold text-blue-900">
                            {gcashNumber || 'Not set'}
                          </p>
                          <p className="mt-3 text-sm text-slate-600">Open GCash, use this number to donate, take a screenshot of the payment, then click Proceed.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={currentStep === 1 ? () => navigate('/donations') : goBack} className="flex-1 rounded-xl border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50">
                    {currentStep === 1 ? 'Cancel' : 'Back'}
                  </button>
                  {currentStep < 3 ? (
                    <button type="button" onClick={goNext} disabled={!isLoggedIn || !canDonate || stepLoading} className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400">
                      {stepLoading ? 'Processing...' : 'Next'}
                    </button>
                  ) : (
                    <button type="submit" disabled={!isLoggedIn || !canDonate || submitting} className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400">
                      {submitting ? 'Processing...' : isMoneyPath ? 'Proceed' : 'Submit Donation Request'}
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
