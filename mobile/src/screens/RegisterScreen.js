import React, { useState, useEffect, useRef } from 'react';
import { Alert, Animated, Image, ImageBackground, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import { API_ORIGIN } from '../config/api';
import { authService } from '../services/authService';

import { getGroups, getCachedGroups } from '../services/configService';

const DEFAULT_LEVEL_OPTIONS = [
  { value: 'INTEGRATED_SCHOOL', label: 'Integrated School' },
  { value: 'SENIOR_HIGH', label: 'Senior High' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'ETEEAP', label: 'ETEEAP' },
  { value: 'GRAD_SCHOOL', label: 'Grad School' }
];

const DEFAULT_COURSE_GROUPS = [
  {
    key: 'INTEGRATED_SCHOOL',
    label: 'Integrated School',
    title: 'Integrated School',
    options: [
      { value: 'Integrated School - Elementary', label: 'Elementary' },
      { value: 'Integrated School - Junior High', label: 'Junior High' },
      { value: 'Night High', label: 'Night High' }
    ]
  },
  {
    key: 'SENIOR_HIGH',
    label: 'Senior High School',
    title: 'Senior High School',
    options: [
      { value: 'Senior High School', label: 'Senior High School' }
    ]
  },
  {
    key: 'COLLEGE',
    label: 'College',
    title: 'College',
    options: [
      { value: 'SARFAID', label: 'SARFAID' },
      { value: 'SHTM', label: 'SHTM' },
      { value: 'BSIT', label: 'BSIT' },
      { value: 'SSLATE', label: 'SSLATE' }
    ]
  },
  {
    key: 'ETEEAP',
    label: 'ETEEAP',
    title: 'ETEEAP',
    options: [
      { value: 'B.A. in English Language Studies', label: 'Bachelor of Arts - English Language Studies' },
      { value: 'B.S. in Business Administration', label: 'Bachelor of Science - Business Administration' },
      { value: 'B.S. in Hospitality Management', label: 'Bachelor of Science - Hospitality Management' }
    ]
  },
  {
    key: 'GRAD_SCHOOL',
    label: 'Graduate School',
    title: 'Graduate School',
    options: [
      { value: 'Doctor in Business Administration', label: 'Doctor in Business Administration' },
      { value: 'Master of Science in Architecture', label: 'Master of Science - Architecture' },
      { value: 'Master of Science in Hospitality Management', label: 'Master of Science - Hospitality Management' },
      { value: 'Master in Business Administration', label: 'Master in Business Administration (MBA)' },
      { value: 'Master in Business Administration - Human Resource Management', label: 'MBA - Human Resource Management' },
      { value: 'Master of Arts in Counseling', label: 'Master of Arts - Counseling' },
      { value: 'Master of Arts in Educational Management', label: 'Master of Arts - Educational Management' },
      { value: 'Master of Arts in Education - English/Literature', label: 'M.A. in Education - English / Literature' },
      { value: 'Master of Arts in Education - Filipino', label: 'M.A. in Education - Filipino' },
      { value: 'Master of Arts in Education - General Science', label: 'M.A. in Education - General Science' },
      { value: 'Master of Arts in Education - Instructional Technology', label: 'M.A. in Education - Instructional Technology' },
      { value: 'Master of Arts in Education - Mathematics', label: 'M.A. in Education - Mathematics' },
      { value: 'Master of Arts in Education - Religious Studies', label: 'M.A. in Education - Religious Studies' }
    ]
  }
];

const PRIVACY_NOTICE_VERSION = '2026-07-26';
const PRIVACY_NOTICE_URL = `${API_ORIGIN}/privacy-notice`;
const homeImage = require('../../assets/homeimage.jpg');
const alumniLogo = require('../../assets/alumnilogo2.png');

const mapBackendToCourseGroups = (backend) => {
  if (!backend || !backend.groupSectionDefinitions) return DEFAULT_COURSE_GROUPS;
  return backend.groupSectionDefinitions.map((sec) => ({
    key: sec.key,
    label: sec.title || sec.key,
    title: sec.title || sec.key,
    options: (sec.items || []).map((it) => ({ value: it.value, label: it.label }))
  }));
};

const getProgramGroupsForLevel = (groups = [], selectedLevel = '') => groups
  .map((group) => {
    let options = group.options || [];
    if (selectedLevel && group.key !== selectedLevel) {
      options = [];
    }

    return { ...group, options };
  })
  .filter((group) => group.options.length > 0);

const isBlankLevelOption = (option) => !option?.value || String(option.label || '').toLowerCase() === 'all levels';
const isNightHighLevelOption = (option) => {
  const value = String(option?.value || '').trim().toLowerCase();
  const label = String(option?.label || '').trim().toLowerCase();
  return value === 'night_high' || label === 'night high';
};
const getRegisterLevelOptions = (options = []) => options
  .filter((option) => !isBlankLevelOption(option) && !isNightHighLevelOption(option));


export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    studentId: '',
    contactNumber: '',
    email: '',
    password: '',
    level: '',
    course: '',
    batch: '',
    graduationYear: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [levelMenuOpen, setLevelMenuOpen] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [levelOptions, setLevelOptions] = useState(DEFAULT_LEVEL_OPTIONS);
  const [courseGroups, setCourseGroups] = useState(DEFAULT_COURSE_GROUPS);
  const consentFade = useRef(new Animated.Value(0)).current;

  const setField = (key, value) => {
    setForm((prev) => {
      if (key !== 'level') {
        return { ...prev, [key]: value };
      }

      const nextGroups = getProgramGroupsForLevel(courseGroups, value);
      const courseStillAvailable = nextGroups.some((group) =>
        group.options.some((option) => option.value === prev.course)
      );

      return {
        ...prev,
        level: value,
        course: courseStillAvailable ? prev.course : ''
      };
    });
  };

  const filteredCourseGroups = getProgramGroupsForLevel(courseGroups, form.level);
  const registerLevelOptions = getRegisterLevelOptions(levelOptions);
  const COURSE_OPTIONS = courseGroups.flatMap((group) => group.options);
  const hasProgramOptions = filteredCourseGroups.some((group) => group.options.length > 0);
  const selectedLevelLabel = registerLevelOptions.find((option) => option.value === form.level)?.label || '';
  const selectedCourseLabel = COURSE_OPTIONS.find((option) => option.value === form.course)?.label || '';

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Try cached first for faster startup
      try {
        const cached = await getCachedGroups();
        if (mounted && cached) {
          if (cached.levelOptions) setLevelOptions(getRegisterLevelOptions(cached.levelOptions));
          if (cached.groupSectionDefinitions) setCourseGroups(mapBackendToCourseGroups(cached));
        }
      } catch (_e) {
        // ignore
      }

      const fetched = await getGroups();
      if (!mounted) return;
      if (fetched) {
        if (fetched.levelOptions) setLevelOptions(getRegisterLevelOptions(fetched.levelOptions));
        if (fetched.groupSectionDefinitions) setCourseGroups(mapBackendToCourseGroups(fetched));
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!showConsentModal) return;
    consentFade.setValue(0);
    Animated.timing(consentFade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true
    }).start();
  }, [consentFade, showConsentModal]);

  const validateRegistrationForm = () => {
    if (
      !form.username ||
      !form.email ||
      !form.password ||
      !form.firstName ||
      !form.lastName ||
      !form.contactNumber ||
      !form.level ||
      !form.course ||
      !form.batch
    ) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return false;
    }

    return true;
  };

  const onRegister = () => {
    if (!validateRegistrationForm()) return;
    setIsConsentChecked(false);
    setShowConsentModal(true);
  };

  const submitRegistration = async () => {
    if (!validateRegistrationForm()) {
      setShowConsentModal(false);
      return;
    }
    if (!isConsentChecked) {
      Alert.alert('Consent required', 'Please check the consent box before registering.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authService.register({
        ...form,
        consent_core: true,
        consent_timestamp: new Date().toISOString(),
        privacy_notice_version: PRIVACY_NOTICE_VERSION,
        profile_visibility: {
          email: false,
          phone: false,
          address: false,
          employer: false
        }
      });
      setShowConsentModal(false);
      setIsConsentChecked(false);

      Alert.alert('Submitted', response.message || 'Registration submitted for approval.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login')
        }
      ]);
    } catch (error) {
      const message = error?.response?.data?.error || 'Registration failed.';
      Alert.alert('Registration failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer noTopPadding>
      <View style={styles.container}>
        <ImageBackground source={homeImage} style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroOverlay} />
          <View style={styles.brandRow}>
            <Image source={alumniLogo} style={styles.logo} />
            <View>
              <Text style={styles.brandTitle}>LCCB ALUMNI</Text>
              <Text style={styles.brandSubtitle}>CONNECTING EXCELLENCE</Text>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Join the LCCB{'\n'}Alumni Network</Text>
            <Text style={styles.heroText}>Create your account to connect with fellow alumni, share achievements, and access exclusive opportunities.</Text>
          </View>

          <View style={styles.featureStack}>
            <FeatureRow icon="calendar" title="Events & Reunions" subtitle="Stay updated with alumni events" />
            <FeatureRow icon="briefcase" title="Career Opportunities" subtitle="Explore jobs and opportunities" />
          </View>
        </ImageBackground>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome to</Text>
          <Text style={styles.titleBold}>LCCB Alumni</Text>
          <Text style={styles.subtitle}>Create your account and join the alumni community.</Text>

          <View style={styles.warningBanner}>
            <Text style={styles.warningTitle}>⚠ Verification Required:</Text>
            <Text style={styles.warningText}>Please provide accurate information. Admin will verify your alumni status before approval.</Text>
          </View>

          <View style={styles.rowLabel}>
            <Text style={styles.rowLabelItem}>First Name <Text style={styles.required}>*</Text></Text>
            <Text style={styles.rowLabelItem}>Last Name <Text style={styles.required}>*</Text></Text>
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="First name"
              value={form.firstName}
              onChangeText={(value) => setField('firstName', value)}
              placeholderTextColor="#a0aec0"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Last name"
              value={form.lastName}
              onChangeText={(value) => setField('lastName', value)}
              placeholderTextColor="#a0aec0"
            />
          </View>

          <Text style={styles.sectionLabel}>Username <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            value={form.username}
            onChangeText={(value) => setField('username', value)}
            placeholderTextColor="#a0aec0"
          />

          <View style={styles.rowLabel}>
            <Text style={styles.rowLabelItem}>School ID (Optional)</Text>
            <Text style={styles.rowLabelItem}>Contact Number <Text style={styles.required}>*</Text></Text>
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="e.g., 21-0087-958"
              value={form.studentId}
              onChangeText={(value) => setField('studentId', value)}
              placeholderTextColor="#a0aec0"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="09XXXXXXXXX"
              keyboardType="phone-pad"
              value={form.contactNumber}
              onChangeText={(value) => setField('contactNumber', value)}
              placeholderTextColor="#a0aec0"
            />
          </View>

          <Text style={styles.sectionLabel}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={form.email}
            onChangeText={(value) => setField('email', value)}
            placeholderTextColor="#a0aec0"
          />

          <Text style={styles.sectionLabel}>Level <Text style={styles.required}>*</Text></Text>
          <Pressable style={styles.selectInput} onPress={() => setLevelMenuOpen(true)}>
            <Text style={selectedLevelLabel ? styles.selectText : styles.selectPlaceholder}>
              {selectedLevelLabel || 'Select Level'}
            </Text>
            <Text style={styles.selectChevron}>▼</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>Program <Text style={styles.required}>*</Text></Text>
          <Pressable style={styles.selectInput} onPress={() => setCourseMenuOpen(true)}>
            <Text style={selectedCourseLabel ? styles.selectText : styles.selectPlaceholder}>
              {selectedCourseLabel || 'Select Program'}
            </Text>
            <Text style={styles.selectChevron}>▼</Text>
          </Pressable>

          <View style={styles.rowLabel}>
            <Text style={styles.rowLabelItem}>Batch/Year <Text style={styles.required}>*</Text></Text>
            <Text style={styles.rowLabelItem}>Graduation Year</Text>
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="e.g., 2024"
              keyboardType="number-pad"
              value={form.batch}
              onChangeText={(value) => setField('batch', value)}
              placeholderTextColor="#a0aec0"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="e.g., 2025"
              keyboardType="number-pad"
              value={form.graduationYear}
              onChangeText={(value) => setField('graduationYear', value)}
              placeholderTextColor="#a0aec0"
            />
          </View>

          <Text style={styles.sectionLabel}>Password <Text style={styles.required}>*</Text></Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(value) => setField('password', value)}
              placeholderTextColor="#a0aec0"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
            </Pressable>
          </View>

          <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={onRegister} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? 'Submitting...' : 'Sign up'}</Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
          </Pressable>
        </View>

        <Modal visible={levelMenuOpen} transparent animationType="fade" onRequestClose={() => setLevelMenuOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLevelMenuOpen(false)}>
            <Pressable style={styles.menuCard} onPress={() => {}}>
              <View style={styles.menuHandle} />
              <Text style={styles.menuTitle}>Select Level</Text>
              <ScrollView style={styles.menuScroll}>
                {registerLevelOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[styles.menuOption, form.level === option.value && styles.menuOptionActive]}
                    onPress={() => {
                      setField('level', form.level === option.value ? '' : option.value);
                      setLevelMenuOpen(false);
                    }}
                  >
                    <View style={styles.menuOptionContent}>
                      <Text style={[styles.menuOptionText, form.level === option.value && styles.menuOptionTextActive]}>{option.label}</Text>
                      {form.level === option.value ? <Ionicons name="checkmark" size={17} color="#1d4ed8" /> : null}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={courseMenuOpen} transparent animationType="fade" onRequestClose={() => setCourseMenuOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCourseMenuOpen(false)}>
            <Pressable style={styles.menuCard} onPress={() => {}}>
              <View style={styles.menuHandle} />
              <Text style={styles.menuTitle}>{selectedLevelLabel ? `${selectedLevelLabel} Programs` : 'All Programs'}</Text>
              <ScrollView style={styles.menuScroll}>
                {!hasProgramOptions ? (
                  <Text style={styles.menuEmptyText}>No programs available for this level.</Text>
                ) : null}
                {filteredCourseGroups.map((group) => (
                  <View key={group.label} style={styles.menuGroup}>
                    <Text style={styles.menuGroupLabel}>{group.label}</Text>
                    {group.options.map((option) => (
                      <Pressable
                        key={option.value}
                        style={[styles.menuOption, form.course === option.value && styles.menuOptionActive]}
                        onPress={() => {
                          setField('course', form.course === option.value ? '' : option.value);
                          setCourseMenuOpen(false);
                        }}
                      >
                        <View style={styles.menuOptionContent}>
                          <Text style={[styles.menuOptionText, form.course === option.value && styles.menuOptionTextActive]}>{option.label}</Text>
                          {form.course === option.value ? <Ionicons name="checkmark" size={17} color="#1d4ed8" /> : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={showConsentModal} transparent animationType="fade" onRequestClose={() => setShowConsentModal(false)}>
          <View style={styles.consentBackdrop}>
            <Animated.View
              style={[
                styles.consentCard,
                {
                  opacity: consentFade,
                  transform: [{
                    translateY: consentFade.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0]
                    })
                  }]
                }
              ]}
            >
              <View style={styles.consentHeader}>
                <Text style={styles.consentEyebrow}>DATA PRIVACY CONSENT NOTICE</Text>
                <Text style={styles.consentTitle}>Before creating your account</Text>
              </View>

              <ScrollView style={styles.consentScroll} contentContainerStyle={styles.consentContent} showsVerticalScrollIndicator>
                <Text style={styles.consentParagraph}>
                  Creating an account means LCCB will collect and process your personal, academic, and employment information as described in our{' '}
                  <Text style={styles.inlineLink} onPress={() => Linking.openURL(PRIVACY_NOTICE_URL)}>
                    full Privacy Notice
                  </Text>
                  , per the Data Privacy Act of 2012 (RA 10173).
                </Text>

                <View style={styles.commitmentBox}>
                  <Text style={styles.commitmentTitle}>Key points</Text>
                  <Text style={styles.commitmentItem}>
                    <Text style={styles.commitmentStrong}>Secure & limited access</Text> — encrypted storage, visible only to authorized staff.
                  </Text>
                  <Text style={styles.commitmentItem}>
                    <Text style={styles.commitmentStrong}>Directory-safe by default</Text> — directory listing shows only name, batch, and program; contact info, address, and other sensitive fields stay hidden unless the user opts to reveal them individually.
                  </Text>
                  <Text style={styles.commitmentItem}>
                    <Text style={styles.commitmentStrong}>No selling your data</Text> — used only for alumni tracking, events, jobs, and donations; never shared with outside organizations.
                  </Text>
                </View>

                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setIsConsentChecked((value) => !value)}
                  disabled={submitting}
                >
                  <View style={[styles.checkboxBox, isConsentChecked && styles.checkboxBoxChecked]}>
                    {isConsentChecked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                  <View style={styles.consentTextWrap}>
                    <Text style={styles.consentQuestion}>
                      I have read and agree to the Data Privacy Terms and Conditions.
                      <Text style={styles.requiredTag}> Required</Text>
                    </Text>
                    <Text style={styles.consentSubtext}>
                      Needed to create your account and enable core alumni tracking (records, events, employment history).
                    </Text>
                  </View>
                </Pressable>
              </ScrollView>

              <View style={styles.consentActions}>
                <Text style={styles.footerNote}>Declining required consent means an account cannot be created.</Text>
                <View style={styles.consentButtonRow}>
                <Pressable
                  style={[styles.consentButton, styles.declineButton, submitting && styles.buttonDisabled]}
                  onPress={() => {
                    setIsConsentChecked(false);
                    setShowConsentModal(false);
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.declineText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.consentButton,
                    isConsentChecked && !submitting ? styles.agreeButton : styles.agreeButtonDisabled
                  ]}
                  onPress={submitRegistration}
                  disabled={submitting || !isConsentChecked}
                >
                  <Text style={styles.agreeText}>{submitting ? 'Processing...' : 'I Agree & Register'}</Text>
                </Pressable>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

function FeatureRow({ icon, title, subtitle }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 26
  },
  hero: {
    minHeight: 360,
    marginHorizontal: -18,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 34,
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  heroImage: {
    resizeMode: 'cover'
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 58, 138, 0.82)'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logo: {
    width: 48,
    height: 48,
    resizeMode: 'contain'
  },
  brandTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.6
  },
  brandSubtitle: {
    color: '#e0f2fe',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2
  },
  heroCopy: {
    marginTop: 26
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36
  },
  heroText: {
    color: '#e0f2fe',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10
  },
  featureStack: {
    gap: 10,
    marginTop: 24
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 12
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)'
  },
  featureTextWrap: {
    flex: 1
  },
  featureTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800'
  },
  featureSubtitle: {
    color: '#dbeafe',
    fontSize: 12,
    marginTop: 2
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    marginTop: -24,
    marginBottom: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 0
  },
  titleBold: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e3a8a',
    marginBottom: 12
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20
  },
  warningBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4
  },
  warningText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
    marginTop: 8
  },
  rowLabel: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 6
  },
  rowLabelItem: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b'
  },
  required: {
    color: '#dc2626',
    fontWeight: '700'
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  halfInput: {
    flex: 1
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 0,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    fontSize: 14,
    color: '#0f172a',
    includeFontPadding: false,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 14,
    color: '#1e293b',
    includeFontPadding: false
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  selectInput: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1
  },
  selectText: {
    color: '#1e293b',
    fontSize: 14,
    flex: 1,
    marginRight: 8
  },
  selectPlaceholder: {
    color: '#a0aec0',
    fontSize: 14,
    flex: 1,
    marginRight: 8
  },
  selectChevron: {
    color: '#1e293b',
    fontSize: 12
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    maxHeight: '70%',
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  menuHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginBottom: 12
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 16,
    marginBottom: 10
  },
  menuScroll: {
    paddingHorizontal: 10
  },
  menuGroup: {
    marginBottom: 12
  },
  menuGroupLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 8
  },
  menuEmptyText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 12
  },
  menuOption: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginBottom: 8,
    justifyContent: 'center'
  },
  menuOptionActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff'
  },
  menuOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  menuOptionText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  menuOptionTextActive: {
    color: '#1d4ed8',
    fontWeight: '800'
  },
  button: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16
  },
  link: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginBottom: 30
  },
  linkBold: {
    color: '#0891b2',
    fontWeight: '800',
    textDecorationLine: 'underline'
  },
  consentBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.62)',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24
  },
  consentCard: {
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden'
  },
  consentHeader: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  consentEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 1.2
  },
  consentTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 6
  },
  consentScroll: {
    maxHeight: 380
  },
  consentContent: {
    padding: 18,
    gap: 14
  },
  consentParagraph: {
    fontSize: 14,
    lineHeight: 21,
    color: '#334155'
  },
  inlineLink: {
    color: '#1d4ed8',
    fontWeight: '800',
    textDecorationLine: 'underline'
  },
  commitmentBox: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    gap: 10
  },
  commitmentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  commitmentItem: {
    fontSize: 13,
    lineHeight: 20,
    color: '#334155'
  },
  commitmentStrong: {
    fontWeight: '800',
    color: '#0f172a'
  },
  consentTextWrap: {
    flex: 1
  },
  consentQuestion: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    color: '#0f172a'
  },
  requiredTag: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '900'
  },
  consentSubtext: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxBoxChecked: {
    borderColor: '#1d4ed8',
    backgroundColor: '#1d4ed8'
  },
  consentActions: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10
  },
  footerNote: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17
  },
  consentButtonRow: {
    flexDirection: 'row',
    gap: 10
  },
  consentButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  declineButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff'
  },
  agreeButton: {
    backgroundColor: '#1d4ed8'
  },
  agreeButtonDisabled: {
    backgroundColor: '#94a3b8'
  },
  declineText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569'
  },
  agreeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff'
  }
});
