import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { User, FileText, Calendar, ShieldCheck, Sparkles } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { qrService } from '../../../services/api';

export default function DoctorViewScreen() {
  const { token } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQRData();
  }, [token]);

  const fetchQRData = async () => {
    if (!token) return;
    console.log('[DoctorView] Fetching data for token:', token);
    setIsLoading(true);
    try {
      const response = await qrService.getQRData(token as string);
      console.log('[DoctorView] Data received:', response);
      setData(response);
    } catch (e: any) {
      console.error('[DoctorView] Error fetching QR data:', e.response?.data || e.message);
      setError(e.response?.data?.message || 'Access expired or invalid token');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching Patient Records...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.patientAvatar}>
            <User size={32} color={COLORS.secondary} />
          </View>
          <Text style={styles.patientName}>{data?.patient?.name}</Text>
          <View style={styles.secureTag}>
            <ShieldCheck size={14} color={COLORS.success} />
            <Text style={styles.secureText}>Verified Access</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Medical Summary</Text>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            This patient has shared {data?.records?.length || 0} records for your review.
            Below are the latest diagnostic reports and prescriptions.
          </Text>
        </Card>

        {data?.ai_summary && (
          <>
            <Text style={styles.sectionTitle}>Longitudinal Health Overview (AI)</Text>
            <Card style={styles.insightsCard}>
              <View style={styles.insightHeader}>
                <View style={styles.insightIconCircle}>
                  <Sparkles size={18} color={COLORS.primary} />
                </View>
                <View style={styles.insightHeaderText}>
                  <Text style={styles.insightType}>CLINICAL INTELLIGENCE</Text>
                  <Text style={styles.insightUpdateStatus}>
                    Processed: {data.ai_summary.last_processed_at ? new Date(data.ai_summary.last_processed_at).toLocaleDateString() : 'Ready'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.insightDescription}>
                {data.ai_summary.overall_health_picture 
                  ? (Array.isArray(data.ai_summary.overall_health_picture) 
                      ? data.ai_summary.overall_health_picture.join('\n') 
                      : data.ai_summary.overall_health_picture)
                  : 'No longitudinal patterns identified yet.'}
              </Text>

              {data.ai_summary.identified_patterns && data.ai_summary.identified_patterns.length > 0 && (
                <View style={styles.patternsContainer}>
                  <Text style={styles.patternsLabel}>Identified Patterns:</Text>
                  <View style={styles.patternsGrid}>
                    {data.ai_summary.identified_patterns.map((item: any, idx: number) => (
                      <View key={idx} style={styles.patternChip}>
                        <View style={styles.patternDot} />
                        <Text style={styles.patternText}>{item?.pattern || item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {data.ai_summary.clinical_signals && data.ai_summary.clinical_signals.length > 0 && (
                <View style={styles.patternsContainer}>
                  <Text style={styles.patternsLabel}>Clinical Signals:</Text>
                  <View style={styles.patternsGrid}>
                    {data.ai_summary.clinical_signals.map((item: any, idx: number) => (
                      <View key={idx} style={[styles.patternChip, { backgroundColor: COLORS.accent + '15' }]}>
                        <View style={[styles.patternDot, { backgroundColor: COLORS.accent }]} />
                        <Text style={[styles.patternText, { color: COLORS.accent }]}>
                          {item?.signal || item} ({item?.confidence || 'low'} confidence)
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Card>
          </>
        )}

        <Text style={styles.sectionTitle}>Shared Records</Text>
        {data?.records?.map((record: any) => (
          <Card key={record.id} style={styles.recordCard}>
            <View style={styles.recordIcon}>
              <FileText size={24} color={COLORS.primary} />
            </View>
            <View style={styles.recordDetails}>
              <Text style={styles.recordType}>{record.file_type || 'Medical Document'}</Text>
              <View style={styles.dateRow}>
                <Calendar size={12} color={COLORS.text.secondary} />
                <Text style={styles.recordDate}>{new Date(record.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.recordSource}>Source: {record.source}</Text>
            </View>
          </Card>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Access expires: {new Date(data?.expires_at).toLocaleTimeString()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    ...SHADOWS.soft,
  },
  patientAvatar: {
    width: 64,
    height: 64,
    borderRadius: ROUNDING.full,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: ROUNDING.sm,
  },
  secureText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  summaryCard: {
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: ROUNDING.md,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDetails: {
    flex: 1,
  },
  recordType: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  recordDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  recordSource: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    paddingBottom: SPACING.xl,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.text.secondary,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  insightsCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 8,
  },
  insightIconCircle: {
    width: 32,
    height: 32,
    borderRadius: ROUNDING.full,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightHeaderText: {
    flex: 1,
  },
  insightType: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  insightUpdateStatus: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
  insightDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  patternsContainer: {
    marginTop: SPACING.sm,
  },
  patternsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  patternsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  patternChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDING.sm,
    gap: 6,
  },
  patternDot: {
    width: 6,
    height: 6,
    borderRadius: ROUNDING.full,
    backgroundColor: COLORS.primary,
  },
  patternText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
