import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, FileText, Pill, RefreshCw, Sparkles } from 'lucide-react-native';
import { COLORS, ROUNDING, SHADOWS, SPACING } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { recordService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const POLL_INTERVAL_MS = 4000;   // how often to re-check (ms)
const MAX_POLL_ATTEMPTS = 20;    // give up after ~80 seconds

export default function AISummaryScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();

  const [record, setRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [pollingGaveUp, setPollingGaveUp] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch the record (silent = don't show full-screen spinner) ──────────────
  const fetchRecord = useCallback(
    async (silent = false) => {
      if (!user) return null;
      if (!silent) setIsLoading(true);
      try {
        const data = await recordService.getUserRecords(user.id);
        let found: any = null;
        data.records_view?.folders?.forEach((f: any) => {
          const r = f.records?.find((rec: any) => rec.id === id);
          if (r) found = r;
        });
        setRecord(found);
        return found;
      } catch (err) {
        console.error('[Summary] Fetch record error:', err);
        return null;
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [user, id]
  );

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRecord(false);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [fetchRecord]);

  // ── Polling loop: keeps running as long as ai_summary is missing ─────────────
  useEffect(() => {
    // If we have ai_summary already, no polling needed
    if (record && record.ai_summary) {
      setIsPolling(false);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      return;
    }

    // If record is loaded but has no ai_summary, start polling
    if (record && !record.ai_summary && !pollingGaveUp) {
      setIsPolling(true);

      const scheduleNextPoll = (attempt: number) => {
        pollTimerRef.current = setTimeout(async () => {
          const latest = await fetchRecord(true);
          const nextAttempt = attempt + 1;
          setPollCount(nextAttempt);

          if (latest?.ai_summary) {
            // Got it! Stop polling.
            setIsPolling(false);
          } else if (nextAttempt >= MAX_POLL_ATTEMPTS) {
            // Give up gracefully
            setIsPolling(false);
            setPollingGaveUp(true);
          } else {
            scheduleNextPoll(nextAttempt);
          }
        }, POLL_INTERVAL_MS);
      };

      scheduleNextPoll(pollCount);

      return () => {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      };
    }
  }, [record, pollingGaveUp]);

  // ── Manual refresh ──────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setPollingGaveUp(false);
    setPollCount(0);
    await fetchRecord(false);
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Record not found ────────────────────────────────────────────────────────
  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Insights</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Record not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const aiSummary = record.ai_summary;

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
        {/* Record brief */}
        <View style={styles.recordBrief}>
          <View style={styles.iconCircle}>
            <FileText size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>
            {aiSummary?.reports?.[0] || record.file_type || 'Medical Report'}
          </Text>
          <Text style={styles.subtitle}>Analyzed by Medora AI</Text>
        </View>

        {/* ── AI Summary available ── */}
        {aiSummary ? (
          <>
            {/* Summary text */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Sparkles size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>AI Summary</Text>
              </View>
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryText}>
                  {aiSummary.simple_summary ||
                    aiSummary.findings ||
                    'Analysis complete. No significant findings detected.'}
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

                {aiSummary.findings?.length > 0 && !aiSummary.key_findings?.length && (
                  <View style={styles.findingsList}>
                    {(Array.isArray(aiSummary.findings)
                      ? aiSummary.findings
                      : [aiSummary.findings]
                    ).map((item: any, index: number) => (
                      <View key={index} style={styles.listItem}>
                        <View style={styles.listDot} />
                        <Text style={styles.listText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </View>

            {/* Medications */}
            {aiSummary.medications?.length > 0 && (
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
                        <Text style={styles.medName}>
                          {typeof item === 'string' ? item : item.name}
                        </Text>
                        {item.dosage && (
                          <Text style={styles.medDetails}>
                            {item.dosage} • {item.frequency}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* Allergies */}
            {aiSummary.allergies?.length > 0 && (
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

            {/* Diagnosis */}
            {aiSummary.diagnosis?.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <FileText size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Diagnosis</Text>
                </View>
                <Card style={styles.summaryCard}>
                  {aiSummary.diagnosis.map((item: any, index: number) => (
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
          /* ── AI Summary not yet available ── */
          <View style={styles.emptyState}>
            {isPolling ? (
              <>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.emptyTitle}>Medora AI is analysing…</Text>
                <Text style={styles.emptyText}>
                  This usually takes 10–30 seconds.{'\n'}The page will update automatically.
                </Text>
              </>
            ) : pollingGaveUp ? (
              <>
                <Sparkles size={48} color={COLORS.border} />
                <Text style={styles.emptyTitle}>Still processing…</Text>
                <Text style={styles.emptyText}>
                  The AI is taking longer than expected.{'\n'}Please check back in a moment.
                </Text>
                <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
                  <RefreshCw size={16} color={COLORS.white} />
                  <Text style={styles.refreshBtnText}>Check Again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Sparkles size={48} color={COLORS.border} />
                <Text style={styles.emptyTitle}>AI analysis pending</Text>
                <Text style={styles.emptyText}>Loading your record…</Text>
              </>
            )}
          </View>
        )}

        {/* Disclaimer */}
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
    paddingBottom: 40,
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
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: ROUNDING.lg,
    marginTop: 8,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
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
    backgroundColor: COLORS.background,
    gap: 16,
  },
});
