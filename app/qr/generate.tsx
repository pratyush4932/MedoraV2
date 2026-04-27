import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Share, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Share2, Clock, ShieldCheck } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { qrService } from '../../services/api';

export default function QRGenerateScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 mins default
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateToken();
  }, []);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const generateToken = async () => {
    setIsLoading(true);
    try {
      const data = await qrService.generateQR([]); // Empty list for all recent records as per usual flow
      setToken(data.token);
      setExpiresAt(new Date(data.expires_at));
    } catch (e) {
      console.error('Failed to generate QR', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!token) return;
    try {
      await Share.share({
        message: `View my medical records securely: https://medora.link/qr/${token}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Health QR</Text>
          <Text style={styles.subtitle}>Show this to your doctor to share records</Text>
        </View>

        <Card style={styles.qrCard}>
          {token ? (
            <View style={styles.qrContainer}>
              <QRCode
                value={token}
                size={220}
                color={COLORS.text.primary}
                backgroundColor={COLORS.white}
              />
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load QR</Text>
              <Button title="Retry" onPress={generateToken} variant="outline" />
            </View>
          )}
        </Card>

        <View style={styles.timerContainer}>
          <Clock size={20} color={COLORS.accent} />
          <Text style={styles.timerText}>
            Expires in <Text style={styles.timeValue}>{formatTime(timeLeft)}</Text>
          </Text>
        </View>

        <View style={styles.securityInfo}>
          <ShieldCheck size={16} color={COLORS.success} />
          <Text style={styles.securityText}>Token is time-limited and single-use</Text>
        </View>

        <View style={styles.footer}>
          <Button
            title="Share Link"
            onPress={handleShare}
            style={styles.shareBtn}
            variant="primary"
          />
          <Button
            title="Refresh QR"
            onPress={generateToken}
            variant="ghost"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white, // Pure white for QR visibility
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  qrCard: {
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    ...SHADOWS.medium,
    borderRadius: ROUNDING.lg,
    marginTop: SPACING.md,
  },
  qrContainer: {
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    backgroundColor: COLORS.accent + '10',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: ROUNDING.full,
  },
  timerText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  timeValue: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
  },
  securityText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  footer: {
    marginTop: 'auto',
    width: '100%',
    gap: SPACING.sm,
  },
  shareBtn: {
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 220,
    width: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontWeight: '600',
  },
});
