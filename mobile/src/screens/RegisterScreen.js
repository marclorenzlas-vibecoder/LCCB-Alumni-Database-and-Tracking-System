import React, { useState, useEffect } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import { authService } from '../services/authService';

import { getGroups, getCachedGroups } from '../services/configService';

const DEFAULT_LEVEL_OPTIONS = [
  { value: 'INTEGRATED_SCHOOL', label: 'Integrated School' },
  { value: 'NIGHT_HIGH', label: 'Night High' },
  { value: 'SENIOR_HIGH', label: 'Senior High' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'ETEEAP', label: 'ETEEAP' },
  { value: 'GRAD_SCHOOL', label: 'Grad School' }
];

const DEFAULT_COURSE_GROUPS = [
  {
    label: 'College Programs',
    options: [
      { value: 'BSIT', label: 'BS Information Technology' },
      { value: 'BSCS', label: 'BS Computer Science' },
      { value: 'BSBA', label: 'BS Business Administration' },
      { value: 'BSA', label: 'BS Accountancy' },
      { value: 'BSED', label: 'BS Education' },
      { value: 'BEED', label: 'Bachelor of Elementary Education' },
      { value: 'BSN', label: 'BS Nursing' },
      { value: 'BSHM', label: 'BS Hospitality Management' },
      { value: 'BSTM', label: 'BS Tourism Management' },
      { value: 'BSPSYCH', label: 'BS Psychology' },
      { value: 'AB-COMM', label: 'AB Communication' },
      { value: 'AB-POLSCI', label: 'AB Political Science' }
    ]
  },
  {
    label: 'Senior High School Tracks',
    options: [
      { value: 'ABM', label: 'Accountancy, Business and Management (ABM)' },
      { value: 'STEM', label: 'Science, Technology, Engineering and Mathematics (STEM)' },
      { value: 'HUMSS', label: 'Humanities and Social Sciences (HUMSS)' },
      { value: 'GAS', label: 'General Academic Strand (GAS)' },
      { value: 'TVL-HE', label: 'TVL - Home Economics' },
      { value: 'TVL-ICT', label: 'TVL - Information and Communications Technology' }
    ]
  },
  {
    label: 'High School',
    options: [{ value: 'HS', label: 'High School' }]
  }
];

const mapBackendToCourseGroups = (backend) => {
  if (!backend || !backend.groupSectionDefinitions) return DEFAULT_COURSE_GROUPS;
  return backend.groupSectionDefinitions.map((sec) => ({
    label: sec.title || sec.key,
    options: (sec.items || []).map((it) => ({ value: it.value, label: it.label }))
  }));
};


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
  const [levelMenuOpen, setLevelMenuOpen] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [levelOptions, setLevelOptions] = useState(DEFAULT_LEVEL_OPTIONS);
  const [courseGroups, setCourseGroups] = useState(DEFAULT_COURSE_GROUPS);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const COURSE_OPTIONS = courseGroups.flatMap((group) => group.options);
  const selectedLevelLabel = levelOptions.find((option) => option.value === form.level)?.label || '';
  const selectedCourseLabel = COURSE_OPTIONS.find((option) => option.value === form.course)?.label || '';

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Try cached first for faster startup
      try {
        const cached = await getCachedGroups();
        if (mounted && cached) {
          if (cached.levelOptions) setLevelOptions(cached.levelOptions);
          if (cached.groupSectionDefinitions) setCourseGroups(mapBackendToCourseGroups(cached));
        }
      } catch (e) {
        // ignore
      }

      const fetched = await getGroups();
      if (!mounted) return;
      if (fetched) {
        if (fetched.levelOptions) setLevelOptions(fetched.levelOptions);
        if (fetched.groupSectionDefinitions) setCourseGroups(mapBackendToCourseGroups(fetched));
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onRegister = async () => {
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
      return;
    }

    setSubmitting(true);
    try {
      const response = await authService.register(form);

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
    <ScreenContainer>
      <ScreenHeader title="Register" subtitle="Create your alumni account" />
      <ScrollView contentContainerStyle={styles.container}>
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

          <Text style={styles.sectionLabel}>Course <Text style={styles.required}>*</Text></Text>
          <Pressable style={styles.selectInput} onPress={() => setCourseMenuOpen(true)}>
            <Text style={selectedCourseLabel ? styles.selectText : styles.selectPlaceholder}>
              {selectedCourseLabel || 'Select Course'}
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
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            secureTextEntry
            value={form.password}
            onChangeText={(value) => setField('password', value)}
            placeholderTextColor="#a0aec0"
          />

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
              <Text style={styles.menuTitle}>Select Level</Text>
              <ScrollView style={styles.menuScroll}>
                {levelOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    style={styles.menuOption}
                    onPress={() => {
                      setField('level', option.value);
                      setLevelMenuOpen(false);
                    }}
                  >
                    <Text style={styles.menuOptionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={courseMenuOpen} transparent animationType="fade" onRequestClose={() => setCourseMenuOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCourseMenuOpen(false)}>
            <Pressable style={styles.menuCard} onPress={() => {}}>
              <Text style={styles.menuTitle}>Select Course</Text>
              <ScrollView style={styles.menuScroll}>
                {courseGroups.map((group) => (
                  <View key={group.label} style={styles.menuGroup}>
                    <Text style={styles.menuGroupLabel}>{group.label}</Text>
                    {group.options.map((option) => (
                      <Pressable
                        key={option.value}
                        style={styles.menuOption}
                        onPress={() => {
                          setField('course', option.value);
                          setCourseMenuOpen(false);
                        }}
                      >
                        <Text style={styles.menuOptionText}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 24,
    marginBottom: 24
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 0
  },
  titleBold: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20
  },
  warningBanner: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6'
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
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    fontSize: 14,
    color: '#1e293b'
  },
  selectInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
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
    borderRadius: 12,
    maxHeight: '70%',
    paddingVertical: 10
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    paddingHorizontal: 14,
    marginBottom: 8
  },
  menuScroll: {
    paddingHorizontal: 6
  },
  menuGroup: {
    marginBottom: 8
  },
  menuGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  menuOption: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8
  },
  menuOptionText: {
    fontSize: 14,
    color: '#0f172a'
  },
  button: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  link: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginBottom: 30
  },
  linkBold: {
    color: '#1d4ed8',
    fontWeight: '600'
  }
});
