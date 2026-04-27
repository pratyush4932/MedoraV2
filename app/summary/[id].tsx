import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Sparkles, ArrowLeft, Pill, AlertTriangle, FileText } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { recordService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AISummaryScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecordData();
  }, [id]);

  const fetchRecordData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await recordService.getUserRecords(user.id);
      let foundRecord = null;
      data.records_view.folders.forEach((f: any) => {
        const r = f.records.find((rec: any) => rec.id === id);
        if (r) foundRecord = r;
      });
      setRecord(foundRecord);
    } catch (err) {
      console.error('Fetch record error', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (record?.status === 'processing') {
      const timer = setTimeout(() => fetchRecordData(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [record]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const aiSummary = record?.ai_summary;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.recordBrief}>
          <View style={styles.iconCircle}>
            <FileText size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>{aiSummary?.reports?.[0] || record?.file_type || 'Medical Report'}</Text>
          <Text style={styles.subtitle}>Analyzed by Medora AI</Text>
        </View>

        {aiSummary ? (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Sparkles size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>AI Summary</Text>
              </View>
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryText}>
                  {aiSummary.simple_summary || aiSummary.findings || 'Analysis complete. No significant findings detected.'}
                </Text>
                
                {aiSummary.key_findings?.length > 0 && (
                  <View style={styles.findingsList}>
                    {aiSummary.key_findings.map((item: any, index: number) => (
                      <View key={index} style={styles.listItem}>
                        <View style={styles.listDot} />
                        <Text style={styles.listText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </View>

            {(aiSummary.medications?.length > 0) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Pill size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Medications Detected</Text>
                </View>
                <Card style={styles.summaryCard}>
                  {aiSummary.medications.map((item: any, index: number) => (
                    <View key={index} style={styles.listItem}>
                      <View style={styles.listDot} />
                      <View>
                        <Text style={styles.medName}>{typeof item === 'string' ? item : item.name}</Text>
                        {item.dosage && <Text style={styles.medDetails}>{item.dosage} • {item.frequency}</Text>}
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {(aiSummary.allergies?.length > 0) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <AlertTriangle size={20} color={COLORS.accent} />
                  <Text style={styles.sectionTitle}>Allergy Alerts</Text>
                </View>
                <Card style={styles.summaryCard}>
                  {aiSummary.allergies.map((item: any, index: number) => (
                    <View key={index} style={styles.listItem}>
                      <View style={styles.listDot} />
                      <Text style={styles.listText}>{item}</Text>
                    </View>
                  ))}
                </Card>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Sparkles size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>AI analysis is in progress...</Text>
          </View>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Note: This summary is AI-generated and should be verified by a medical professional.
          </Text>
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
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    ...SHADOWS.soft,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  recordBrief: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: ROUNDING.full,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  summaryText: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 24,
    marginBottom: 12,
  },
  findingsList: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 8,
  },
  listText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  medDetails: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: '#F3F4F6',
    borderRadius: ROUNDING.md,
  },
  disclaimerText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFA',
  },
});
