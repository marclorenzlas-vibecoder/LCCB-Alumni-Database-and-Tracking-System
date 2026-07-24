import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../../components/ScreenContainer';
import LoadingState from '../../components/LoadingState';
import BackButton from '../../components/BackButton';
import { donationService } from '../../services/donationService';
import { isAlumni, isTeacher } from '../../utils/auth';
import { safeGoBack } from '../../utils/safeGoBack';
import { extractDonationMeta, withDonationMeta } from '../../utils/donationMeta';

const MAX_ITEM_IMAGES = 6;

const CURRENCY_OPTIONS = [
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

const COUNTRY_OPTIONS = [
  'Philippines', 'United Kingdom', 'United States', 'Australia', 'Canada', 'Japan', 'Singapore',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina',
  'Armenia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus',
  'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana',
  'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
  'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
  'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali',
  'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Poland',
  'Portugal', 'Qatar', 'Republic of the Congo', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone',
  'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan',
  'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

const CURRENCY_SYMBOLS = { PHP: '\u20B1', USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5', AUD: 'A$', CAD: 'C$', SGD: 'S$' };
const PRESET_AMOUNTS = [100, 250, 500, 1000];

const PAYMENT_METHODS = [
  { key: 'card', label: 'Debit / credit card', icon: 'card-outline' },
  { key: 'gcash', label: 'GCash', icon: 'wallet-outline' },
  { key: 'paymaya', label: 'PayMaya', icon: 'phone-portrait-outline' }
];

const ITEM_CATEGORIES = [
  'Educational Supplies / Books',
  'School Uniforms / Clothing',
  'IT Hardware / Electronic Equipment',
  'Sports Equipment',
  'Classroom Furniture / General Supplies',
  'Other'
];

const ITEM_CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

export default function DonationDetailScreen({ route, navigation, user }) {
  const { donationId } = route.params || {};
  const teacher = isTeacher(user);
  const alumniUser = isAlumni(user);
  const role = String(user?.role || '').toUpperCase();
  const canDonate = alumniUser || teacher || role === 'ADMIN';

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successState, setSuccessState] = useState(null);

  const [currency, setCurrency] = useState('PHP');
  const [amount, setAmount] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const [firstName, setFirstName] = useState(user?.alumni?.first_name || user?.alumni?.firstName || '');
  const [lastName, setLastName] = useState(user?.alumni?.last_name || user?.alumni?.lastName || '');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.alumni?.contact_number || '');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Philippines');
  const [allowContact, setAllowContact] = useState(true);
  const [contactByEmail, setContactByEmail] = useState(true);
  const [contactByPhone, setContactByPhone] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardholderName, setCardholderName] = useState('');
  const [cardId, setCardId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const [donationType, setDonationType] = useState('money');
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImages, setItemImages] = useState([]);
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemCategory, setItemCategory] = useState('');
  const [itemCondition, setItemCondition] = useState('New');
  const [showItemCategoryPicker, setShowItemCategoryPicker] = useState(false);
  const [showItemConditionPicker, setShowItemConditionPicker] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('dropoff');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliverySchedule, setDeliverySchedule] = useState('');

  const isMoneyPath = donationType === 'money';
  const steps = useMemo(() => (
    isMoneyPath
      ? [
          { number: '1', title: 'Amount' },
          { number: '2', title: 'Verify' },
          { number: '3', title: 'Pay' },
          { number: '4', title: 'Complete' }
        ]
      : [
          { number: '1', title: 'Select Items' },
          { number: '2', title: 'Verify Details' },
          { number: '3', title: 'Delivery' },
          { number: '4', title: 'Complete' }
        ]
  ), [isMoneyPath]);

  const loadCampaign = useCallback(async () => {
    if (!donationId) { setError('Donation not found'); return; }
    try {
      setError('');
      const allDonations = await donationService.getAll();
      const found = allDonations.find(d => d.id === parseInt(donationId));
      if (!found) setError('Campaign not found');
      else setCampaign(found);
    } catch (err) {
      console.error('Error loading donation:', err);
      setError('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [donationId]);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    setLoading(true);
    loadCampaign().catch(() => {}).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [loadCampaign]));

  useEffect(() => {
    if (!user) return;
    setFirstName((prev) => prev || user.alumni?.firstName || user.alumni?.first_name || user.firstName || user.first_name || '');
    setLastName((prev) => prev || user.alumni?.lastName || user.alumni?.last_name || user.lastName || user.last_name || '');
    setEmail((prev) => prev || user.email || '');
    setPhone((prev) => prev || user.alumni?.contactNumber || user.alumni?.contact_number || user.contactNumber || user.contact_number || '');
    setAddress((prev) => prev || user.alumni?.location || user.location || '');
    setAgreeTerms(true);
    setAllowContact(true);
    setContactByEmail(true);
    setContactByPhone(false);
  }, [user]);

  const donationInfo = campaign ? extractDonationMeta(campaign.description || '') : { cleanDescription: '', meta: {} };
  const campaignMeta = donationInfo.meta || {};
  const paymentNumber = campaignMeta.paymentNumber || '0912-345-6789';
  const paymentMethods = campaignMeta.paymentMethods || 'GCash / PayMaya / Debit Card';
  const paymentRedirects = {
    gcash: campaignMeta.gcashUrl || 'https://www.gcash.com/',
    paymaya: campaignMeta.paymayaUrl || 'https://www.paymaya.com/'
  };

  const getSymbol = (cur) => CURRENCY_SYMBOLS[cur] || cur;
  const formatAmount = (val, cur) => {
    const num = parseFloat(val) || 0;
    return `${getSymbol(cur)}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const donorNameForReview = useMemo(
    () => [firstName, lastName].filter(Boolean).join(' ').trim() || user?.username || '',
    [firstName, lastName, user]
  );
  const contactPreferenceForReview = allowContact
    ? [contactByEmail ? 'Email' : null, contactByPhone ? 'Phone' : null].filter(Boolean).join(', ') || 'Open to contact'
    : 'Do not contact';
  const displayRole = String(user?.role || role || 'User').toLowerCase();
  const verifiedChecks = useMemo(() => ([
    { label: 'Account signed in', value: user?.username || user?.email || 'Unknown account', ok: Boolean(user) },
    { label: 'Donation permission', value: canDonate ? `${displayRole} account can donate` : 'Role cannot donate', ok: canDonate },
    { label: 'Donor name', value: donorNameForReview || 'Name not found', ok: Boolean(donorNameForReview) },
    { label: 'Email address', value: email || 'Email not found', ok: Boolean(email) }
  ]), [user, canDonate, displayRole, donorNameForReview, email]);

  const pickItemImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo access to upload item images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setItemImages((prev) => {
        const nextImages = [...prev, ...result.assets].slice(0, MAX_ITEM_IMAGES);
        if (prev.length + result.assets.length > MAX_ITEM_IMAGES) {
          Alert.alert('Image limit reached', `You can upload up to ${MAX_ITEM_IMAGES} item photos.`);
        }
        return nextImages;
      });
    }
  };

  const removeItemImage = (index) => {
    setItemImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (donationType === 'item') {
        if (!itemName.trim()) { Alert.alert('Missing Item Name', 'Please enter the name of the item you wish to donate.'); return false; }
        if (!itemQuantity.trim() || Number(itemQuantity) <= 0) { Alert.alert('Missing Quantity', 'Please enter the item quantity.'); return false; }
        if (!itemCategory.trim()) { Alert.alert('Missing Category', 'Please select an item category.'); return false; }
        if (itemImages.length === 0) { Alert.alert('Item Image Required', 'Please upload at least one photo of the item.'); return false; }
        return true;
      }
      if (!amount || parseFloat(amount) <= 0) { Alert.alert('Invalid Amount', 'Please enter a valid donation amount.'); return false; }
      return true;
    }
    if (step === 2) {
      if (!user || !canDonate) {
        Alert.alert('Donation unavailable', 'Please log in with an alumni or admin account to donate.');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (donationType === 'item') {
        if (deliveryMethod === 'pickup' && !deliveryAddress.trim()) {
          Alert.alert('Pickup Address Required', 'Please enter the pickup address.');
          return false;
        }
        if (!deliverySchedule.trim()) {
          Alert.alert('Schedule Required', 'Please enter your preferred delivery schedule.');
          return false;
        }
        return true;
      }
      if (paymentMethod === 'card') {
        if (!String(cardNumber || '').trim() || !String(expiryMonth || '').trim() || !String(cardCvv || '').trim()) {
          Alert.alert('Card Details Required', 'Please complete your debit card details before continuing.');
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep(s => Math.min(3, s + 1));
  };
  const goBack = () => {
    if (successState) {
      setSuccessState(null);
      setCurrentStep(3);
      return;
    }
    if (currentStep > 1) setCurrentStep(s => s - 1);
    else safeGoBack(navigation);
  };

  const getDonorDisplayName = () => [title, firstName, lastName].filter(Boolean).join(' ').trim() || user?.username || 'Anonymous donor';

  const buildReceipt = () => ({
    receiptNumber: `RCPT-${Date.now().toString().slice(-8)}`,
    issuedAt: new Date().toLocaleString(),
    donorName: getDonorDisplayName(),
    campaignName: campaign?.purpose || 'Donation Campaign',
    donationTypeLabel: donationType === 'item' ? `Item: ${itemName}` : 'Money',
    amountLabel: donationType === 'item' ? 'Item' : formatAmount(amount, currency)
  });

  const handleSubmit = async () => {
    if (!campaign) return;
    if (!validateStep(currentStep)) return;

    const receipt = buildReceipt();
    setSuccessState(receipt);
    setCurrentStep(4);

    if (donationType === 'money' && amount && parseFloat(amount) > 0) {
      donationService.broadcastDonationToast(campaign.id, {
        amount,
        currency,
        note: ''
      }).catch((err) => {
        console.error('Failed to broadcast donation toast:', err?.response?.data || err?.message || err);
      });
    }

    if (donationType === 'money' && (paymentMethod === 'gcash' || paymentMethod === 'paymaya')) {
      Linking.openURL(paymentRedirects[paymentMethod]).catch(() => {});
    }
  };

  const handleReceiptSubmission = async () => {
    if (!campaign || !successState) return;
    setSubmitting(true);
    try {
      const paymentLabel = PAYMENT_METHODS.find(m => m.key === paymentMethod)?.label || 'Card';
      const paymentSummary = paymentMethod === 'card'
        ? [
            'Payment method: Debit Card',
            `Card holder: ${cardholderName}`,
            `Card ID: ${cardId}`,
            `Card number: **** **** **** ${String(cardNumber).replace(/\D/g, '').slice(-4)}`,
            `Expiry: ${expiryMonth}/${expiryYear}`,
            `Currency: ${currency}`
          ].join('\n')
        : `Payment method: ${paymentLabel}\nCurrency: ${currency}`;

      const contactPreference = allowContact
        ? [contactByEmail ? 'Email' : null, contactByPhone ? 'Phone' : null].filter(Boolean).join(', ') || 'Open to contact'
        : 'Do not contact';
      const donationMeta = {
        donationMode: donationType === 'item' ? 'item' : 'money',
        paymentCurrency: donationType === 'money' ? currency : null,
        paymentNumber: donationType === 'money' ? paymentNumber : null,
        paymentMethods: donationType === 'money' ? paymentMethods : null,
        deliveryMethod: donationType === 'item' ? deliveryMethod : null,
        deliveryAddress: donationType === 'item' && deliveryMethod === 'pickup' ? deliveryAddress : null,
        deliverySchedule: donationType === 'item' ? deliverySchedule : null
      };
      const donorSummary = [
        `Donor: ${[firstName, lastName].filter(Boolean).join(' ')}`,
        `Country: ${country}`,
        `Address: ${address}`,
        phone ? `Phone: ${phone}` : null,
        `Contact preference: ${contactPreference}`,
        `Agreement: ${agreeTerms ? 'Accepted' : 'Not accepted'}`,
        donationType === 'item'
          ? [
              'Donation type: Item',
              `Item quantity: ${itemQuantity}`,
              `Item category: ${itemCategory || 'General'}`,
              `Item condition: ${itemCondition}`,
              `Delivery method: ${deliveryMethod === 'pickup' ? 'Pickup' : 'Drop-off'}`,
              deliveryMethod === 'pickup' ? `Pickup address: ${deliveryAddress}` : null,
              `Preferred schedule: ${deliverySchedule}`
            ].filter(Boolean).join('\n')
          : paymentSummary
      ].filter(Boolean).join('\n');

      let payload;
      if (donationType === 'item') {
        const fd = new FormData();
        fd.append('donation_type', 'item');
        fd.append('item_name', itemName);
        if (itemDescription) fd.append('item_description', itemDescription);
        fd.append('description', withDonationMeta(donorSummary, donationMeta));
        fd.append('amount', '0');
        fd.append('date', new Date().toISOString().split('T')[0]);
        fd.append('item_quantity', itemQuantity);
        fd.append('item_category', itemCategory);
        fd.append('item_condition', itemCondition);
        itemImages.forEach((asset, idx) => {
          const file = {
            uri: asset.uri,
            type: 'image/jpeg',
            name: `item-${Date.now()}-${idx}.jpg`
          };
          fd.append('images', file);
        });
        payload = fd;
      } else {
        payload = {
          amount: parseFloat(amount),
          description: withDonationMeta(donorSummary, donationMeta),
          date: new Date().toISOString().split('T')[0]
        };
      }

      const result = await donationService.contributeToDonation(campaign.id, payload);
      setCampaign(result || { ...campaign, amount: (campaign.amount || 0) + parseFloat(amount) });
      Alert.alert('Receipt submitted', 'Your donation has been recorded and is visible to the admin.', [
        { text: 'OK', onPress: () => navigation.navigate('DonationsList') }
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.response?.data?.error || 'Failed to submit donation receipt');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ScreenContainer scroll={false}><LoadingState label="Loading campaign" /></ScreenContainer>;
  if (error || !campaign) {
    return (
      <ScreenContainer>
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorTitle}>Campaign Not Found</Text>
          <BackButton navigation={navigation} label="Go Back" />
        </View>
      </ScreenContainer>
    );
  }

  if (successState) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.successWrap}>
          <View style={styles.successIconBox}>
            <View style={styles.receiptIconCircle}>
              <Ionicons name="checkmark" size={32} color="#fff" />
            </View>
          </View>
          <Text style={styles.successTitle}>Review Receipt</Text>
          <Text style={styles.successSub}>Submit this receipt to record your donation for admin review.</Text>

          <View style={styles.receiptCard}>
            <View style={styles.receiptHeaderRow}>
              <Ionicons name="school-outline" size={16} color="#1d4ed8" />
              <View>
                <Text style={styles.receiptHeader}>LCCB ALUMNI</Text>
                <Text style={styles.receiptSubheader}>Donation Receipt</Text>
              </View>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Receipt No</Text>
              <Text style={styles.receiptValue}>{successState.receiptNumber}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Date</Text>
              <Text style={styles.receiptValue}>{successState.issuedAt}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptCenter}>
              <Text style={styles.receiptCenterLabel}>Campaign</Text>
              <Text style={styles.receiptCenterValue}>{successState.campaignName}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Donor</Text>
              <Text style={styles.receiptValue}>{successState.donorName}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Type</Text>
              <Text style={styles.receiptValue}>{successState.donationTypeLabel || 'Money'}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptTotalRow}>
              <Text style={styles.receiptTotalLabel}>Total Amount</Text>
              <Text style={styles.receiptTotalAmount}>{successState.amountLabel}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptPaidBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text style={styles.receiptPaidText}>{donationType === 'item' ? 'READY' : 'PAID'}</Text>
            </View>
            <View style={styles.receiptFooterWrap}>
              <Text style={styles.receiptFooter}>Thank you for your generous donation!</Text>
              <Text style={styles.receiptFooterSub}>This receipt serves as your proof of donation.</Text>
            </View>
            <View style={styles.receiptBarcode}>
              {Array.from({ length: 30 }).map((_, i) => (
                <View key={i} style={{ width: i % 3 === 0 ? 2 : 1, height: i % 5 === 0 ? 18 : i % 3 === 0 ? 14 : 10, backgroundColor: '#0f172a', opacity: 0.4 }} />
              ))}
            </View>
            <Text style={styles.receiptBarcodeText}>{successState.receiptNumber}</Text>
          </View>

          <View style={styles.successActions}>
            <Pressable style={styles.successBtnOutline} onPress={goBack} disabled={submitting}>
              <Text style={styles.successBtnOutlineText}>Back</Text>
            </Pressable>
            <Pressable style={[styles.successBtnSolid, submitting && styles.btnDisabled]} onPress={handleReceiptSubmission} disabled={submitting}>
              <Text style={styles.successBtnSolidText}>{submitting ? 'Submitting...' : 'Submit Receipt'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step Indicator */}
        <View style={styles.stepperCard}>
          <Text style={styles.stepperLabel}>Step {currentStep} of {steps.length}</Text>
          <View style={styles.stepperRow}>
            {steps.map((step, i) => {
              const stepNum = i + 1;
              const isComplete = stepNum < currentStep;
              const isLastStep = stepNum === steps.length;
              const showCheck = isComplete || (currentStep >= steps.length && isLastStep);
              const isActive = stepNum === currentStep;
              return (
                <View key={step.number} style={styles.stepItem}>
                  <View style={[styles.stepDot, showCheck && styles.stepDotComplete, isActive && styles.stepDotActive]}>
                    {showCheck ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={[styles.stepDotText, isActive && styles.stepDotTextActive]}>{step.number}</Text>}
                  </View>
                  <Text style={[styles.stepTitle, isActive && styles.stepTitleActive]}>{step.title}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Step 1: Amount / Item */}
        {currentStep === 1 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepCardTitle}>Donation Type</Text>
            <Text style={styles.stepCardSub}>Choose how you would like to contribute.</Text>

            {/* Type Toggle */}
            <View style={styles.typeToggle}>
              <Pressable
                style={[styles.typeToggleBtn, donationType === 'money' && styles.typeToggleBtnActive]}
                onPress={() => setDonationType('money')}
              >
                <Text style={[styles.typeToggleText, donationType === 'money' && styles.typeToggleTextActive]}>Money</Text>
              </Pressable>
              <Pressable
                style={[styles.typeToggleBtn, donationType === 'item' && styles.typeToggleBtnActive]}
                onPress={() => setDonationType('item')}
              >
                <Text style={[styles.typeToggleText, donationType === 'item' && styles.typeToggleTextActive]}>Item</Text>
              </Pressable>
            </View>

            {donationType === 'money' ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Currency</Text>
                  <Pressable style={styles.selectBtn} onPress={() => setShowCurrencyPicker(true)}>
                    <Text style={styles.countryValue} numberOfLines={1} ellipsizeMode="tail">{CURRENCY_OPTIONS.find(c => c.value === currency)?.label || currency}</Text>
                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                  </Pressable>
                </View>

                <View style={styles.presetGrid}>
                  {PRESET_AMOUNTS.map(preset => (
                    <Pressable key={preset} style={[styles.presetBtn, amount === String(preset) && styles.presetBtnActive]} onPress={() => setAmount(String(preset))}>
                      <Text style={[styles.presetBtnText, amount === String(preset) && styles.presetBtnTextActive]}>{getSymbol(currency)}{preset}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.amountInputWrap}>
                  <Text style={styles.amountSymbol}>{getSymbol(currency)}</Text>
                  <TextInput style={styles.amountInput} placeholder="0.00" placeholderTextColor="#cbd5e1" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
                </View>
              </>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Item Name</Text>
                  <TextInput style={styles.textInput} placeholder="e.g. Books, Laptop, Chair" placeholderTextColor="#94a3b8" value={itemName} onChangeText={setItemName} />
                </View>

                <View style={styles.row2}>
                  <View style={[styles.fieldGroup, styles.quantityField]}>
                    <Text style={styles.fieldLabel}>Quantity</Text>
                    <TextInput style={[styles.textInput, styles.quantityInput]} placeholder="e.g. 1" placeholderTextColor="#94a3b8" keyboardType="number-pad" value={itemQuantity} onChangeText={setItemQuantity} />
                  </View>
                  <View style={[styles.fieldGroup, styles.categoryField]}>
                    <Text style={styles.fieldLabel}>Category</Text>
                    <Pressable style={styles.selectBtn} onPress={() => setShowItemCategoryPicker(true)}>
                      <Text style={styles.countryValue} numberOfLines={1} ellipsizeMode="tail">{itemCategory || 'Select category'}</Text>
                      <Ionicons name="chevron-down" size={16} color="#64748b" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Condition</Text>
                  <Pressable style={styles.selectBtn} onPress={() => setShowItemConditionPicker(true)}>
                    <Text style={styles.countryValue} numberOfLines={1} ellipsizeMode="tail">{itemCondition}</Text>
                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                  </Pressable>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Description (optional)</Text>
                  <TextInput style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Describe the item condition, quantity, etc." placeholderTextColor="#94a3b8" multiline value={itemDescription} onChangeText={setItemDescription} />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Item Photos (up to {MAX_ITEM_IMAGES})</Text>
                  <Pressable style={styles.currencyBtn} onPress={pickItemImages}>
                    <Ionicons name="camera-outline" size={18} color="#475569" />
                    <Text style={styles.currencyBtnLabel}>Choose Photos</Text>
                    <Ionicons name="chevron-forward" size={16} color="#64748b" />
                  </Pressable>
                  {itemImages.length > 0 && (
                    <View style={styles.imagePreviewRow}>
                      {itemImages.map((img, idx) => (
                        <View key={idx} style={styles.imagePreviewItem}>
                          <Image source={{ uri: img.uri }} style={styles.imagePreviewThumb} />
                          <Pressable style={styles.imageRemoveBtn} onPress={() => removeItemImage(idx)}>
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* Step 2: Verify */}
        {currentStep === 2 && (
          <View style={styles.verifySection}>
            <View style={styles.verifyHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyEyebrow}>Verify details</Text>
                <Text style={styles.verifyTitle}>Review your donation details</Text>
                <Text style={styles.verifySub}>Make sure your details, and contribution summary are correct before continuing.</Text>
              </View>
              <View style={[styles.verifyBadge, user && canDonate ? styles.verifyBadgeOk : styles.verifyBadgeWarn]}>
                <Text style={[styles.verifyBadgeText, user && canDonate ? styles.verifyBadgeTextOk : styles.verifyBadgeTextWarn]}>
                  {user && canDonate ? 'Verified' : 'Needs login'}
                </Text>
              </View>
            </View>

            <View style={styles.verifyChecksGrid}>
              {verifiedChecks.map((check) => (
                <View key={check.label} style={styles.verifyCheckCard}>
                  <View style={styles.verifyCheckRow}>
                    <View style={[styles.verifyCheckIcon, check.ok ? styles.verifyCheckIconOk : styles.verifyCheckIconWarn]}>
                      <Ionicons name={check.ok ? 'checkmark' : 'warning'} size={14} color={check.ok ? '#047857' : '#b45309'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifyCheckLabel}>{check.label}</Text>
                      <Text style={styles.verifyCheckValue}>{check.value}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.verifyCampaignCard}>
              <View style={styles.verifyCampaignHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifyCampaignName}>{campaign.purpose}</Text>
                  <Text style={styles.verifyCampaignSub}>Campaign selected for this donation</Text>
                </View>
                <View style={[styles.verifyTypeBadge, isMoneyPath ? styles.verifyTypeBadgeMoney : styles.verifyTypeBadgeItem]}>
                  <Text style={[styles.verifyTypeBadgeText, isMoneyPath ? styles.verifyTypeBadgeTextMoney : styles.verifyTypeBadgeTextItem]}>
                    {isMoneyPath ? 'Money' : 'Items'}
                  </Text>
                </View>
              </View>

              {isMoneyPath ? (
                <View style={styles.verifyAmountBox}>
                  <Text style={styles.verifyAmountLabel}>Amount</Text>
                  <Text style={styles.verifyAmountValue}>{formatAmount(amount, currency)}</Text>
                  <Text style={styles.verifyAmountMeta}>Currency: {currency}</Text>
                </View>
              ) : (
                <View style={styles.verifyItemPreview}>
                  <Text style={styles.verifyAmountLabel}>Item Preview</Text>
                  <Text style={styles.verifyItemName}>{itemName}</Text>
                  <View style={styles.verifyItemMetaRow}>
                    <Text style={styles.verifyItemMeta}><Text style={styles.verifyItemMetaStrong}>Quantity:</Text> {itemQuantity}</Text>
                    <Text style={styles.verifyItemMeta}><Text style={styles.verifyItemMetaStrong}>Category:</Text> {itemCategory || 'General'}</Text>
                    <Text style={styles.verifyItemMeta}><Text style={styles.verifyItemMetaStrong}>Condition:</Text> {itemCondition}</Text>
                  </View>
                  {itemImages.length > 0 && (
                    <View style={styles.verifyItemPhotos}>
                      {itemImages.map((img, idx) => (
                        <Image key={idx} source={{ uri: img.uri }} style={styles.verifyItemPhoto} />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {isMoneyPath && (
              <View style={styles.verifyInfoRow}>
                <View style={[styles.verifyInfoCard, { flex: 1 }]}>
                  <Text style={styles.verifyInfoTitle}>Donor contact</Text>
                  <Text style={styles.verifyInfoText}>{email}</Text>
                  <Text style={styles.verifyInfoText}>{phone || 'No phone number provided'}</Text>
                  <Text style={styles.verifyInfoMeta}>{contactPreferenceForReview}</Text>
                </View>
                <View style={[styles.verifyInfoCard, { flex: 1 }]}>
                  <Text style={styles.verifyInfoTitle}>Campaign payment details</Text>
                  <Text style={styles.verifyInfoText}>Number: {paymentNumber}</Text>
                  <Text style={styles.verifyInfoText}>Methods: {paymentMethods}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Step 3: Delivery or Pay */}
        {currentStep === 3 && !isMoneyPath && (
          <View style={styles.stepCard}>
            <Text style={styles.verifyEyebrow}>Delivery details</Text>
            <Text style={styles.stepCardTitle}>Delivery Information</Text>
            <Text style={styles.stepCardSub}>Please choose how you would like to deliver the donated items to us.</Text>

            <Text style={styles.fieldLabel}>Delivery Method</Text>
            <Pressable
              style={[styles.deliveryOption, deliveryMethod === 'dropoff' && styles.deliveryOptionActive]}
              onPress={() => setDeliveryMethod('dropoff')}
            >
              <Ionicons name={deliveryMethod === 'dropoff' ? 'radio-button-on' : 'radio-button-off'} size={20} color={deliveryMethod === 'dropoff' ? '#1d4ed8' : '#94a3b8'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deliveryOptionTitle}>Drop-off</Text>
                <Text style={styles.deliveryOptionSub}>Deliver the items directly to the school administration office.</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.deliveryOption, deliveryMethod === 'pickup' && styles.deliveryOptionActive]}
              onPress={() => setDeliveryMethod('pickup')}
            >
              <Ionicons name={deliveryMethod === 'pickup' ? 'radio-button-on' : 'radio-button-off'} size={20} color={deliveryMethod === 'pickup' ? '#1d4ed8' : '#94a3b8'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deliveryOptionTitle}>Pickup</Text>
                <Text style={styles.deliveryOptionSub}>Request our team to pick up the items from your address.</Text>
              </View>
            </Pressable>

            {deliveryMethod === 'pickup' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Pickup Address</Text>
                <TextInput style={styles.textInput} placeholder="Enter pickup address" placeholderTextColor="#94a3b8" value={deliveryAddress} onChangeText={setDeliveryAddress} />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Preferred Schedule / Date & Time</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Mondays 9:00 AM - 12:00 PM, or July 10, 2026"
                placeholderTextColor="#94a3b8"
                value={deliverySchedule}
                onChangeText={setDeliverySchedule}
              />
            </View>
          </View>
        )}

        {currentStep === 3 && isMoneyPath && (
          <View style={styles.stepCard}>
            <View style={styles.paymentSummary}>
              <Text style={styles.paymentSummaryLabel}>Payment summary</Text>
              <Text style={styles.verifyInfoText}>Amount: {formatAmount(amount, currency)}</Text>
              <Text style={styles.verifyInfoText}>Currency: {currency}</Text>
            </View>

            <Text style={styles.stepCardTitle}>Please select a payment method:</Text>

            <View style={styles.paymentMethods}>
              {PAYMENT_METHODS.map(method => (
                <Pressable key={method.key} style={[styles.paymentMethodBtn, paymentMethod === method.key && styles.paymentMethodActive]} onPress={() => setPaymentMethod(method.key)}>
                  <Ionicons name={method.icon} size={22} color={paymentMethod === method.key ? '#1d4ed8' : '#64748b'} />
                  <Text style={[styles.paymentMethodLabel, paymentMethod === method.key && styles.paymentMethodLabelActive]}>{method.label}</Text>
                  {paymentMethod === method.key && <Ionicons name="checkmark-circle" size={18} color="#1d4ed8" />}
                </Pressable>
              ))}
            </View>

            {paymentMethod === 'card' && (
              <View style={styles.cardForm}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Card Number</Text>
                  <TextInput style={styles.textInput} placeholder="1234 5678 9012 3456" placeholderTextColor="#94a3b8" keyboardType="number-pad" maxLength={19} value={cardNumber} onChangeText={setCardNumber} />
                </View>
                <View style={styles.row2}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Expiration date</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="MM/YY"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      maxLength={5}
                      value={expiryMonth}
                      onChangeText={(text) => {
                        setExpiryMonth(text);
                        const yr = text.split('/')[1];
                        if (yr) setExpiryYear(yr);
                      }}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Security code</Text>
                    <TextInput style={styles.textInput} placeholder="123" placeholderTextColor="#94a3b8" keyboardType="number-pad" maxLength={4} secureTextEntry value={cardCvv} onChangeText={setCardCvv} />
                  </View>
                </View>
              </View>
            )}

            {(paymentMethod === 'gcash' || paymentMethod === 'paymaya') && (
              <View style={styles.redirectInfo}>
                <Ionicons name="information-circle-outline" size={20} color="#475569" />
                <Text style={styles.redirectText}>You will be redirected to {PAYMENT_METHODS.find(m => m.key === paymentMethod)?.label} to complete the payment.</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={goBack} disabled={submitting}>
            <Text style={styles.cancelBtnText}>{currentStep === 1 ? 'Cancel' : 'Back'}</Text>
          </Pressable>
          {currentStep < 3 ? (
            <Pressable style={[styles.nextBtn, (submitting || !user || !canDonate) && styles.btnDisabled]} onPress={goNext} disabled={submitting || !user || !canDonate}>
              <Text style={styles.nextBtnText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.nextBtn, (submitting || !user || !canDonate) && styles.btnDisabled]} onPress={handleSubmit} disabled={submitting || !user || !canDonate}>
              <Text style={styles.nextBtnText}>{submitting ? 'Processing...' : isMoneyPath ? 'Pay' : 'Submit Donation Request'}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCurrencyPicker(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Currency</Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {CURRENCY_OPTIONS.map(opt => (
                <Pressable key={opt.value} style={[styles.modalOption, currency === opt.value && styles.modalOptionActive]} onPress={() => { setCurrency(opt.value); setShowCurrencyPicker(false); }}>
                  <Text style={[styles.modalOptionText, currency === opt.value && styles.modalOptionTextActive]} numberOfLines={1} ellipsizeMode="tail">{opt.label}</Text>
                  {currency === opt.value && <Ionicons name="checkmark" size={16} color="#1d4ed8" />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={() => setShowCurrencyPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="fade" onRequestClose={() => setShowCountryPicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCountryPicker(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Where do you live?</Text>
            <View style={styles.modalSearchWrap}>
              <Ionicons name="search-outline" size={16} color="#94a3b8" />
              <TextInput style={styles.modalSearchInput} placeholder="Search country..." placeholderTextColor="#94a3b8" value={countrySearch} onChangeText={setCountrySearch} autoCapitalize="words" />
            </View>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {COUNTRY_OPTIONS.filter(c => !countrySearch || c.toLowerCase().includes(countrySearch.toLowerCase())).map(c => (
                <Pressable key={c} style={[styles.modalOption, country === c && styles.modalOptionActive]} onPress={() => { setCountry(c); setShowCountryPicker(false); }}>
                  <Text style={[styles.modalOptionText, country === c && styles.modalOptionTextActive]} numberOfLines={1} ellipsizeMode="tail">{c}</Text>
                  {country === c && <Ionicons name="checkmark" size={16} color="#1d4ed8" />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={() => setShowCountryPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showItemCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowItemCategoryPicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowItemCategoryPicker(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {ITEM_CATEGORIES.map((cat) => (
                <Pressable key={cat} style={[styles.modalOption, itemCategory === cat && styles.modalOptionActive]} onPress={() => { setItemCategory(cat); setShowItemCategoryPicker(false); }}>
                  <Text style={[styles.modalOptionText, itemCategory === cat && styles.modalOptionTextActive]} numberOfLines={1} ellipsizeMode="tail">{cat}</Text>
                  {itemCategory === cat && <Ionicons name="checkmark" size={16} color="#1d4ed8" />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={() => setShowItemCategoryPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showItemConditionPicker} transparent animationType="fade" onRequestClose={() => setShowItemConditionPicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowItemConditionPicker(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Condition</Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {ITEM_CONDITIONS.map((cond) => (
                <Pressable key={cond} style={[styles.modalOption, itemCondition === cond && styles.modalOptionActive]} onPress={() => { setItemCondition(cond); setShowItemConditionPicker(false); }}>
                  <Text style={[styles.modalOptionText, itemCondition === cond && styles.modalOptionTextActive]} numberOfLines={1} ellipsizeMode="tail">{cond}</Text>
                  {itemCondition === cond && <Ionicons name="checkmark" size={16} color="#1d4ed8" />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={() => setShowItemConditionPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 48, paddingHorizontal: 16 },
  stepperCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 12 },
  stepperLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 10 },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  stepDotComplete: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  stepDotActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  stepDotText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  stepDotTextActive: { color: '#fff' },
  stepTitle: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  stepTitleActive: { color: '#1d4ed8' },
  stepCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 12, gap: 12 },
  stepCardTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  stepCardSub: { fontSize: 13, color: '#64748b', marginTop: -8 },
  currencyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, backgroundColor: '#f8fafc' },
  selectBtn: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderColor: '#dbe4f0', borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#fff' },
  currencyBtnLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  currencyBtnValue: { fontSize: 13, color: '#0f172a', fontWeight: '600', flex: 1, marginHorizontal: 8 },
  currencyPicker: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, overflow: 'hidden' },
  currencyOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  currencyOptionActive: { backgroundColor: '#eff6ff' },
  currencyOptionText: { fontSize: 13, color: '#475569' },
  currencyOptionTextActive: { color: '#1d4ed8', fontWeight: '600' },
  presetGrid: { flexDirection: 'row', gap: 8 },
  presetBtn: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  presetBtnActive: { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  presetBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  presetBtnTextActive: { color: '#1d4ed8' },
  amountInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#f8fafc' },
  amountSymbol: { fontSize: 18, fontWeight: '600', color: '#64748b', marginRight: 6 },
  amountInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#0f172a' },
  typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 12, backgroundColor: '#f8fafc' },
  typeToggleBtnActive: { borderColor: '#1d4ed8', backgroundColor: '#1d4ed8' },
  typeToggleText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  typeToggleTextActive: { color: '#fff' },
  imagePreviewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  imagePreviewItem: { position: 'relative', width: 72, height: 72 },
  imagePreviewThumb: { width: 72, height: 72, borderRadius: 8 },
  imageRemoveBtn: { position: 'absolute', top: -6, right: -6 },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  textInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#fff', fontSize: 14, color: '#0f172a' },
  quantityInput: { minHeight: 46, borderColor: '#dbe4f0', paddingVertical: 0 },
  contactSection: { gap: 8 },
  contactToggle: { borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', gap: 0 },
  contactToggleBtn: { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#f8fafc' },
  contactToggleActive: { backgroundColor: '#1d4ed8' },
  contactToggleText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  contactToggleTextActive: { color: '#fff' },
  contactChecks: { gap: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkLabel: { fontSize: 13, color: '#475569', flex: 1 },
  verifyCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, gap: 10 },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  verifyValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  verifySection: { backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 12, gap: 14 },
  verifyHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  verifyEyebrow: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 1.2, textTransform: 'uppercase' },
  verifyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  verifySub: { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 19 },
  verifyBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  verifyBadgeOk: { backgroundColor: '#d1fae5' },
  verifyBadgeWarn: { backgroundColor: '#ffe4e6' },
  verifyBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  verifyBadgeTextOk: { color: '#047857' },
  verifyBadgeTextWarn: { color: '#be123c' },
  verifyChecksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  verifyCheckCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  verifyCheckRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  verifyCheckIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  verifyCheckIconOk: { backgroundColor: '#d1fae5' },
  verifyCheckIconWarn: { backgroundColor: '#fef3c7' },
  verifyCheckLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  verifyCheckValue: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 17 },
  verifyCampaignCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 },
  verifyCampaignHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  verifyCampaignName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  verifyCampaignSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  verifyTypeBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  verifyTypeBadgeMoney: { backgroundColor: '#dbeafe' },
  verifyTypeBadgeItem: { backgroundColor: '#fef3c7' },
  verifyTypeBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  verifyTypeBadgeTextMoney: { color: '#1d4ed8' },
  verifyTypeBadgeTextItem: { color: '#b45309' },
  verifyAmountBox: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12 },
  verifyAmountLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase' },
  verifyAmountValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  verifyAmountMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  verifyItemPreview: { marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, gap: 4 },
  verifyItemName: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  verifyItemMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  verifyItemMeta: { fontSize: 12, color: '#64748b', flexGrow: 1, minWidth: '30%' },
  verifyItemMetaStrong: { fontWeight: '700', color: '#475569' },
  verifyItemPhotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  verifyItemPhoto: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  verifyInfoRow: { flexDirection: 'column', gap: 10 },
  verifyInfoCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  verifyInfoTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  verifyInfoText: { fontSize: 12, color: '#475569', marginTop: 6 },
  verifyInfoMeta: { fontSize: 12, color: '#64748b', marginTop: 6 },
  deliveryOption: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, backgroundColor: '#fff' },
  deliveryOptionActive: { borderColor: '#1e3a8a', backgroundColor: '#eff6ff' },
  deliveryOptionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  deliveryOptionSub: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 17 },
  paymentSummary: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 14, alignItems: 'center', gap: 2 },
  paymentSummaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  paymentSummaryAmount: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  paymentMethods: { gap: 8 },
  paymentMethodBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, backgroundColor: '#fff' },
  paymentMethodActive: { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  paymentMethodLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#475569' },
  paymentMethodLabelActive: { color: '#0f172a' },
  cardForm: { gap: 12 },
  row2: { flexDirection: 'row', gap: 10 },
  quantityField: { flex: 0.7 },
  categoryField: { flex: 1.3, minWidth: 0 },
  redirectInfo: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12 },
  redirectText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 13, alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  nextBtn: { flex: 1.5, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
  successWrap: { alignItems: 'center', gap: 12, paddingBottom: 48, paddingHorizontal: 16 },
  successIconBox: { marginTop: 20 },
  receiptIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  successSub: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  receiptCard: { width: '100%', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, gap: 6 },
  receiptHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 },
  receiptHeader: { fontSize: 16, fontWeight: '800', color: '#0f172a', letterSpacing: 1 },
  receiptSubheader: { fontSize: 10, color: '#64748b', letterSpacing: 0.5 },
  receiptDivider: { borderTopWidth: 1, borderTopColor: '#e2e8f0', borderStyle: 'dashed', marginVertical: 6 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  receiptLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  receiptValue: { fontSize: 12, fontWeight: '600', color: '#0f172a', textAlign: 'right', maxWidth: '60%' },
  receiptCenter: { alignItems: 'center', paddingVertical: 4 },
  receiptCenterLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  receiptCenterValue: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  receiptTotalRow: { alignItems: 'center', paddingVertical: 8 },
  receiptTotalLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  receiptTotalAmount: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  receiptPaidBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 2, borderColor: '#16a34a', borderRadius: 8, paddingVertical: 6, alignSelf: 'center', paddingHorizontal: 20, transform: [{ rotate: '-3deg' }] },
  receiptPaidText: { fontSize: 14, fontWeight: '800', color: '#16a34a', letterSpacing: 3 },
  receiptFooterWrap: { alignItems: 'center', paddingTop: 6 },
  receiptFooter: { fontSize: 12, color: '#64748b', textAlign: 'center', fontWeight: '600' },
  receiptFooterSub: { fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 2 },
  receiptBarcode: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, opacity: 0.4, paddingTop: 10 },
  receiptBarcodeText: { fontSize: 9, color: '#94a3b8', textAlign: 'center', fontFamily: 'monospace', letterSpacing: 1 },
  successActions: { flexDirection: 'row', gap: 10, width: '100%' },
  successBtnOutline: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  successBtnOutlineText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  successBtnSolid: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  successBtnSolidText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#dc2626' },
  errorBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 24 },
  errorBtnText: { color: '#fff', fontWeight: '700' },
  countryValue: { minWidth: 0, fontSize: 14, color: '#0f172a', fontWeight: '600', flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.48)', justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 12 },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, maxHeight: '78%', paddingTop: 10, paddingBottom: 14, shadowColor: '#0f172a', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
  modalHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 999, backgroundColor: '#cbd5e1', marginBottom: 10 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', textAlign: 'center', paddingBottom: 12 },
  modalSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#dbe4f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8fafc' },
  modalSearchInput: { flex: 1, fontSize: 14, color: '#0f172a', padding: 0 },
  modalList: { maxHeight: 400 },
  modalListContent: { paddingHorizontal: 16, paddingBottom: 4, gap: 7 },
  modalOption: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  modalOptionActive: { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
  modalOptionText: { minWidth: 0, flex: 1, fontSize: 14, color: '#475569', lineHeight: 18 },
  modalOptionTextActive: { color: '#1d4ed8', fontWeight: '600' },
  modalCancel: { marginTop: 10, marginHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#dbe4f0', backgroundColor: '#f8fafc' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#64748b' }
});
