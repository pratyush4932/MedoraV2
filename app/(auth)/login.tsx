import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BriefcaseMedical, Globe, ArrowRight, Lock, User } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { authService } from '../../services/api';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!isLogin && !name) {
      setError('Please enter your full name for sign up');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      if (isLogin) {
        await authService.sendOTP(phone);
      } else {
        await authService.signupSendOTP(name, phone);
      }
      
      router.push({
        pathname: '/(auth)/otp',
        params: { phone, name, flow: isLogin ? 'signin' : 'signup' },
      });
    } catch (e: any) {
      console.error('OTP Send Error:', e.response?.data || e.message);
      const msg = e.response?.data?.message || e.response?.data?.error || 'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
              <View style={styles.card}>
                <View style={styles.header}>
                  <Image 
                    source={require('../../assets/images/logo.png')} 
                    style={{ width: 48, height: 48, borderRadius: 16 }} 
                  />
                </View>

                <Text style={styles.title}>Welcome to{"\n"}Medora</Text>
                <Text style={styles.subtitle}>
                  Securely access and manage your clinical narrative.
                </Text>

                <View style={styles.tabContainer}>
                  <TouchableOpacity 
                    style={[styles.tab, isLogin && styles.activeTab]} 
                    onPress={() => setIsLogin(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.tab, !isLogin && styles.activeTab]} 
                    onPress={() => setIsLogin(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Sign Up</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputSection}>
                  {!isLogin && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.inputLabel}>Full Name</Text>
                      <View style={styles.phoneInputContainer}>
                        <View style={styles.prefixContainer}>
                          <User size={18} color={COLORS.text.primary} />
                        </View>
                        <View style={styles.separator} />
                        <TextInput
                          style={styles.textInput}
                          value={name}
                          onChangeText={setName}
                          placeholder="John Doe"
                          placeholderTextColor={COLORS.text.secondary + '80'}
                        />
                      </View>
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.phoneInputContainer}>
                    <View style={styles.prefixContainer}>
                      <Globe size={18} color={COLORS.text.primary} />
                      <Text style={styles.prefixText}>+91</Text>
                    </View>
                    <View style={styles.separator} />
                    <TextInput
                      style={styles.textInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="00000 00000"
                      placeholderTextColor={COLORS.text.secondary + '80'}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <TouchableOpacity 
                  style={[styles.sendButton, isLoading && styles.disabledButton]} 
                  onPress={handleSendOTP}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <View style={styles.sendButtonContent}>
                    <Text style={styles.sendButtonText}>Send OTP</Text>
                    <ArrowRight size={20} color={COLORS.white} />
                  </View>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Lock size={14} color={COLORS.accent} />
                  <Text style={styles.footerText}>
                    Your records are encrypted and secure.
                  </Text>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5F5', // Light teal background
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 32,
    ...SHADOWS.medium,
  },
  header: {
    marginBottom: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text.primary,
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 6,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: COLORS.white,
    ...SHADOWS.soft,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.text.primary,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  prefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  disabledButton: {
    opacity: 0.7,
  },
  sendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '500',
  },
});
