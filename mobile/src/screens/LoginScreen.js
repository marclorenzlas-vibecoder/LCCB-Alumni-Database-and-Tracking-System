import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, ImageBackground, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import { authService } from '../services/authService';

const homeImage = require('../../assets/homeimage.jpg');
const alumniLogo = require('../../assets/alumnilogo2.png');
const MIN_SIGNING_DISPLAY_MS = 1600;
const SUCCESS_DISPLAY_MS = 900;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function LoginScreen({ navigation, setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loginStatus, setLoginStatus] = useState('signing');
  const [showPassword, setShowPassword] = useState(false);
  const overlayScale = useRef(new Animated.Value(0.98)).current;

  const showStatusOverlay = (status = 'signing') => {
    setLoginStatus(status);
    setSubmitting(true);
    overlayScale.setValue(0.98);
    Animated.spring(overlayScale, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: true
    }).start();
  };

  const waitForMinimumSigningDisplay = async (startedAt) => {
    const remaining = MIN_SIGNING_DISPLAY_MS - (Date.now() - startedAt);
    if (remaining > 0) await delay(remaining);
  };

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please provide email and password.');
      return;
    }

    showStatusOverlay('signing');
    const signingStartedAt = Date.now();

    try {
      const result = await authService.login(email.trim(), password);
      if (!result.user) {
        Alert.alert('Login failed', result.error || 'No user data returned.');
        return;
      }

      const role = String(result.user?.role || '').toUpperCase();
      if (role && role !== 'ALUMNI') {
        await waitForMinimumSigningDisplay(signingStartedAt);
        setLoginStatus('success');
        await delay(SUCCESS_DISPLAY_MS);
        await authService.logout();
        Alert.alert('Alumni only', 'Only alumni accounts can use the mobile app.');
        return;
      }

      await waitForMinimumSigningDisplay(signingStartedAt);
      setLoginStatus('success');
      await delay(SUCCESS_DISPLAY_MS);
      setUser(result.user);
    } catch (error) {
      const code = error?.response?.data?.code;
      const backendMessage = error?.response?.data?.error || '';
      const message = code === 'SERVER_AT_CAPACITY' || String(backendMessage).toLowerCase().includes('at capacity')
        ? 'Server is full right now. Please try again in a few minutes.'
        : backendMessage || 'Invalid credentials.';
      Alert.alert('Login failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScreenContainer noTopPadding>
        <View style={styles.screen}>
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
              <Text style={styles.heroTitle}>Connect with Your{'\n'}LCCB Community</Text>
              <Text style={styles.heroText}>Access your alumni profile, track achievements, and stay connected with fellow graduates.</Text>
            </View>

            <View style={styles.featureStack}>
              <FeatureRow icon="people" title="Alumni Network" subtitle="Connect with fellow graduates" />
              <FeatureRow icon="star" title="Track Achievements" subtitle="Showcase your milestones" />
            </View>
          </ImageBackground>

          <View style={styles.card}>
            <View style={styles.headingBlock}>
              <Text style={styles.title}>Welcome to</Text>
              <Text style={styles.titleAccent}>LCCB Alumni</Text>
              <Text style={styles.subtitle}>Sign in to reconnect with your community, manage your profile, and stay updated with alumni opportunities.</Text>
            </View>

            <Text style={styles.label}>Email/Username</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#64748b" />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#94a3b8"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
              </Pressable>
            </View>

            <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={onLogin} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? 'Signing in...' : 'Sign In'}</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.googleButton}>
              <GoogleIcon />
              <Text style={styles.googleButtonText}>Signup with Google</Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Do not have an account? <Text style={styles.linkBold}>Register</Text></Text>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>

      <Modal
        visible={submitting}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.statusBackdrop}>
          <Animated.View style={[styles.statusCard, { transform: [{ scale: overlayScale }] }]}>
            {loginStatus === 'success' ? (
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={32} color="#fff" />
              </View>
            ) : (
              <ActivityIndicator size="large" color="#1e3a8a" />
            )}
            <Text style={styles.statusTitle}>{loginStatus === 'success' ? 'Login successful!' : 'Signing in...'}</Text>
            <Text style={styles.statusText}>{loginStatus === 'success' ? 'Logging in...' : 'Please wait while we connect you to the dashboard.'}</Text>
          </Animated.View>
        </View>
      </Modal>
    </>
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

function GoogleIcon() {
  return (
    <View style={styles.googleIcon} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.googleRing, styles.googleRedSegment]} />
      <View style={[styles.googleRing, styles.googleYellowSegment]} />
      <View style={[styles.googleRing, styles.googleGreenSegment]} />
      <View style={[styles.googleRing, styles.googleBlueSegment]} />
      <View style={styles.googleGap} />
      <View style={styles.googleBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 26
  },
  hero: {
    minHeight: 340,
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
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  headingBlock: {
    marginBottom: 18
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a'
  },
  titleAccent: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e3a8a',
    marginTop: 2
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 21,
    marginTop: 8
  },
  label: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 6
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 13,
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    color: '#0f172a',
    includeFontPadding: false
  },
  eyeButton: {
    paddingVertical: 10,
    paddingLeft: 6
  },
  button: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    alignItems: 'center'
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0'
  },
  orText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700'
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#dbe3ef',
    borderRadius: 14,
    minHeight: 54,
    paddingVertical: 12,
    marginBottom: 18,
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1
  },
  googleIcon: {
    width: 22,
    height: 22,
    position: 'relative'
  },
  googleRing: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: 'transparent'
  },
  googleRedSegment: {
    borderTopColor: '#EA4335',
    borderLeftColor: '#EA4335',
    transform: [{ rotate: '-35deg' }]
  },
  googleYellowSegment: {
    borderLeftColor: '#FBBC05',
    borderBottomColor: '#FBBC05',
    transform: [{ rotate: '-10deg' }]
  },
  googleGreenSegment: {
    borderBottomColor: '#34A853',
    borderRightColor: '#34A853',
    transform: [{ rotate: '20deg' }]
  },
  googleBlueSegment: {
    borderRightColor: '#4285F4',
    borderTopColor: '#4285F4',
    transform: [{ rotate: '42deg' }]
  },
  googleGap: {
    position: 'absolute',
    right: -1,
    top: 7,
    width: 11,
    height: 7,
    backgroundColor: '#fff'
  },
  googleBar: {
    position: 'absolute',
    right: 0,
    top: 9,
    width: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#4285F4'
  },
  googleButtonText: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: 15
  },
  link: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginBottom: 2
  },
  linkBold: {
    color: '#0891b2',
    fontWeight: '800',
    textDecorationLine: 'underline'
  },
  statusBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  statusCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center'
  },
  successIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  statusTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10
  },
  statusText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19
  }
});
