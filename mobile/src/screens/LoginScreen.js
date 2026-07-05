import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import { authService } from '../services/authService';

export default function LoginScreen({ navigation, setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please provide email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.login(email.trim(), password);
      if (!result.user) {
        Alert.alert('Login failed', result.error || 'No user data returned.');
        return;
      }

      const role = String(result.user?.role || '').toUpperCase();
      if (role && role !== 'ALUMNI') {
        await authService.logout();
        Alert.alert('Alumni only', 'Only alumni accounts can use the mobile app.');
        return;
      }

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
    <ScreenContainer scroll={false}>
      <ScreenHeader title="Login" subtitle="Access your alumni account" />
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.titleBold}>LCCB Alumni</Text>
        <Text style={styles.subtitle}>Sign in to access your alumni account and connect with your community.</Text>

        <Text style={styles.label}>Email/Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#a0aec0"
        />
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#a0aec0"
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
          </Pressable>
        </View>

        <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={onLogin} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Signing in...' : 'Sign In'}</Text>
        </Pressable>

        <Text style={styles.orText}>or</Text>

        <Pressable style={styles.googleButton}>
          <Text style={styles.googleButtonText}>Signup with Google</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Register</Text></Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 20,
    lineHeight: 20
  },
  label: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: 6
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f8fafc'
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b'
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  button: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
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
  orText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500'
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  googleButtonText: {
    color: '#1e293b',
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
