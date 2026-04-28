import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, ArrowRight, ArrowLeft, Lock } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function OTPScreen() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { phone, name, flow } = useLocalSearchParams<{ phone: string, name: string, flow: string }>();
  const router = useRouter();
  const { signIn } = useAuth();

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP sent to your phone');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      let data;
      if (flow === 'signup') {
        data = await authService.signupVerifyOTP(name as string, phone as string, otp);
      } else {
        data = await authService.verifyOTP(phone as string, otp);
      }
      await signIn(data.token, data.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Invalid OTP. Please try again.');
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
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace('/(auth)/login');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={24} color={COLORS.text.primary} />
                </TouchableOpacity>

                <View style={styles.header}>
                  <Image
                    source={require('../../assets/images/logo.png')}
                    style={{ width: 48, height: 48, borderRadius: 16 }}
                  />
                </View>

                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>
                  We've sent a 6-digit code to{"\n"}<Text style={styles.phoneHighlight}>{phone}</Text>
                </Text>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Enter Code</Text>
                  <View style={styles.otpInputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={otp}
                      onChangeText={setOtp}
                      placeholder="Ex:000000"
                      placeholderTextColor={COLORS.text.secondary + '80'}
                      keyboardType="numeric"
                      maxLength={6}
                      letterSpacing={6}
                    />
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <TouchableOpacity
                  style={[styles.sendButton, isLoading && styles.disabledButton]}
                  onPress={handleVerifyOTP}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <View style={styles.sendButtonContent}>
                    <Text style={styles.sendButtonText}>Verify & Continue</Text>
                    <ArrowRight size={20} color={COLORS.white} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => authService.sendOTP(phone as string)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendLink}>Resend</Text></Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Lock size={14} color={COLORS.accent} />
                  <Text style={styles.footerText}>
                    Secure verification process.
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
    backgroundColor: '#E8F5F5',
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 24,
    padding: 8,
  },
  header: {
    marginTop: 24,
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  phoneHighlight: {
    color: COLORS.text.primary,
    fontWeight: '700',
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
  otpInputContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    fontSize: 24,
    color: COLORS.text.primary,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
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
    marginBottom: 24,
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
  resendText: {
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 32,
  },
  resendLink: {
    color: COLORS.primary,
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
