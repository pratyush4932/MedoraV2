import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  AlertTriangle, 
  ArrowLeft, 
  ExternalLink, 
  FileText, 
  Pill, 
  RefreshCw, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity,
  Stethoscope,
  Info
} from 'lucide-react-native';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { recordService, qrService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const POLL_INTERVAL_MS = 4000;   
const MAX_POLL_ATTEMPTS = 20;    

const SectionHeader = React.memo(({ icon: Icon, title, color }: any) => (
  <View style={styles.sectionHeader}>
    <Icon size={18} color={color} strokeWidth={2.5} />
    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
  </View>
));

const AlertCard = React.memo(({ items }: { items: string[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader icon={AlertTriangle} title="Medical Alerts" color="#EF4444" />
      <View style={[styles.card, styles.alertCard]}>
        {items.map((item, index) => (
          <View key={index} style={styles.alertItem}>
            <View style={styles.alertDot} />
            <Text style={styles.alertText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const FindingsCard = React.memo(({ items }: { items: any[] }) => {
  const [expanded, setExpanded] = useState(false);
  if (!items || items.length === 0) return null;
  
  const urgent = items.filter(i => i.isAbnormal || i.type === 'warning');
  const others = items.filter(i => !urgent.includes(i));
  
  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.section}>
      <SectionHeader icon={Activity} title="Key Findings" color="#F59E0B" />
      <View style={styles.card}>
        {/* Abnormal Findings First */}
        {urgent.map((item, index) => (
          <View key={`urgent-${index}`} style={styles.listItem}>
            <View style={[styles.listDot, { backgroundColor: '#F59E0B' }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.listText, { color: '#92400E', fontWeight: '700' }]}>
                {item.text}
              </Text>
            </View>
          </View>
        ))}

        {/* Regular Findings (Collapsible) */}
        {expanded && others.map((item, index) => (
          <View key={`other-${index}`} style={styles.listItem}>
            <View style={[styles.listDot, { backgroundColor: '#10B981' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.listText}>{item.text}</Text>
            </View>
          </View>
        ))}

        {others.length > 0 && (
          <TouchableOpacity onPress={toggleExpanded} style={styles.expandButton}>
            <Text style={styles.expandButtonText}>
              {expanded ? "Show Less" : `View ${others.length} More Findings`}
            </Text>
            {expanded ? <ChevronUp size={14} color={COLORS.primary} /> : <ChevronDown size={14} color={COLORS.primary} />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const SummaryCard = React.memo(({ text }: { text: string }) => {
  if (!text) return null;
  
  const formattedText = Array.isArray(text) 
    ? text.map(line => `• ${line}`).join('\n') 
    : text.split('\n').map(line => line.trim().startsWith('•') || line.trim().startsWith('-') ? line : `• ${line}`).join('\n');

  return (
    <View style={styles.section}>
      <SectionHeader icon={Sparkles} title="AI Summary" color={COLORS.primary} />
      <View style={styles.card}>
        <Text style={styles.summaryText}>
          {formattedText}
        </Text>
      </View>
    </View>
  );
});

const ListCard = React.memo(({ icon, title, items, color }: any) => {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader icon={icon} title={title} color={color} />
      <View style={styles.card}>
        {items.map((item: any, index: number) => (
          <View key={index} style={styles.listItem}>
            <View style={[styles.listDot, { backgroundColor: color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.listText}>
                {typeof item === 'string' ? item : (item.name || item.test_name || JSON.stringify(item))}
              </Text>
              {(item.dosage || item.result) && (
                <Text style={styles.subListText}>
                  {item.dosage || `${item.result} ${item.unit || ''}`} {item.frequency ? `• ${item.frequency}` : ''}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const PatientDetails = React.memo(({ details }: any) => {
  if (!details) return null;
  const parts = [
    details.gender,
    details.age,
    details.blood_group ? `Blood Group: ${details.blood_group}` : null
  ].filter(Boolean);
  
  return (
    <View style={styles.patientCard}>
      <View style={styles.patientAvatar}>
        <Text style={styles.avatarText}>{details.name?.[0] || 'P'}</Text>
      </View>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{details.name || 'Patient'}</Text>
        <Text style={styles.patientSub}>{parts.join(' • ')}</Text>
      </View>
    </View>
  );
});

export default function AISummaryScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();

  const [record, setRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [pollingGaveUp, setPollingGaveUp] = useState(false);
  const [isOpeningDoc, setIsOpeningDoc] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRecord = useCallback(
    async (silent = false) => {
      if (!user) return null;
      if (!silent) setIsLoading(true);
      try {
        const data = await recordService.getMyProfile();
        let found: any = null;
        
        data.records_view?.folders?.forEach((f: any) => {
          const r = f.records?.find((rec: any) => rec.id === id);
          if (r) found = r;
        });

        if (!found) {
          data.hospital_view?.forEach((h: any) => {
            h.visits?.forEach((v: any) => {
              const r = v.records?.find((rec: any) => rec.id === id);
              if (r) found = r;
            });
          });
        }

        setRecord(found);
        return found;
      } catch (err) {
        console.error('[Summary] Fetch record error:', err);
        return null;
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [user?.id, id]
  );

  useEffect(() => {
    if (user?.id) {
      fetchRecord(false);
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [user?.id, id, fetchRecord]);

  useEffect(() => {
    if (record && record.ai_summary) {
      setIsPolling(false);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      return;
    }

    if (record && !record.ai_summary && !pollingGaveUp) {
      setIsPolling(true);

      const scheduleNextPoll = (attempt: number) => {
        pollTimerRef.current = setTimeout(async () => {
          const latest = await fetchRecord(true);
          const nextAttempt = attempt + 1;
          setPollCount(nextAttempt);

          if (latest?.ai_summary) {
            setIsPolling(false);
          } else if (nextAttempt >= MAX_POLL_ATTEMPTS) {
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
  }, [record?.id, !!record?.ai_summary, pollingGaveUp]);

  const handleRefresh = async () => {
    setPollingGaveUp(false);
    setPollCount(0);
    await fetchRecord(false);
  };

  const handleViewDocument = async () => {
    if (!record) return;

    if (record.signed_url) {
      Linking.openURL(record.signed_url);
      return;
    }

    try {
      setIsOpeningDoc(true);
      const { token } = await qrService.generateQR([record.id]);
      const qrData = await qrService.getQRData(token);
      const secureRecord = qrData.records?.find((r: any) => r.id === record.id);
      
      if (secureRecord && secureRecord.file_url) {
        Linking.openURL(secureRecord.file_url);
      } else if (record.file_url) {
        Linking.openURL(record.file_url);
      }
    } catch (error) {
      console.error("Error generating secure link:", error);
      if (record.file_url) {
        Linking.openURL(record.file_url);
      }
    } finally {
      setIsOpeningDoc(false);
    }
  };

  const processedData = useMemo(() => {
    if (!record || !record.ai_summary) return null;
    
    let raw = record.ai_summary;
    if (typeof raw === 'string' && raw.startsWith('{')) {
      try { raw = JSON.parse(raw); } catch (e) { return null; }
    }

    const data = {
      fileName: raw.fileName || raw.reports?.[0] || record.file_type || 'Medical Document',
      findings: Array.isArray(raw.findings) ? raw.findings : (Array.isArray(raw.key_findings) ? raw.key_findings : []),
      diagnosis: Array.isArray(raw.diagnosis) ? raw.diagnosis : [],
      complaints: Array.isArray(raw.complaints) ? raw.complaints : (Array.isArray(raw.key_complaints) ? raw.key_complaints : []),
      medications: Array.isArray(raw.medications) ? raw.medications : [],
      simple_summary: raw.simple_summary || raw.summary || raw.findings_summary || null,
      is_medical_document: raw.is_medical_document !== false,
      patient_details: raw.patient_details || record.patient_details || null
    };

    const getIndicator = (text: string) => {
      const lower = text.toLowerCase();
      if (lower.includes('elevated') || lower.includes('increased') || lower.includes('high')) return '↑';
      if (lower.includes('decreased') || lower.includes('reduced') || lower.includes('low')) return '↓';
      const rangeMatch = text.match(/([\d.]+)\s*.*?(?:range|normal|ref|reference).*?([\d.]+)\s*-\s*([\d.]+)/i);
      if (rangeMatch) {
        const val = parseFloat(rangeMatch[1]);
        const min = parseFloat(rangeMatch[2]);
        const max = parseFloat(rangeMatch[3]);
        if (!isNaN(val) && !isNaN(min) && !isNaN(max)) {
          if (val > max) return '↑';
          if (val < min) return '↓';
        }
      }
      return null;
    };

    const filteredFindings = data.findings
      .map((f: any) => {
        if (!f) return null;
        
        let text = '';
        let indicator = null;
        let isAbnormal = false;
        let statusStr = '';

        if (typeof f === 'string') {
          text = f;
          indicator = getIndicator(f);
          isAbnormal = !!indicator;
        } else if (typeof f === 'object') {
          const parts = [];
          if (f.test_name) parts.push(f.test_name);
          if (f.result !== undefined) parts.push(`: ${f.result}`);
          if (f.unit) parts.push(` ${f.unit}`);
          if (f.reference_range) parts.push(` (Range: ${f.reference_range})`);
          
          text = parts.join('');
          statusStr = (f.status || '').toLowerCase();
          
          if (statusStr.includes('high')) indicator = '↑';
          else if (statusStr.includes('low')) indicator = '↓';
          else if (statusStr.includes('abnormal') || statusStr.includes('borderline')) indicator = '•';
          
          if (!indicator) indicator = getIndicator(text);
          isAbnormal = !!indicator;
        } else {
          return null;
        }

        const lower = text.toLowerCase();
        const hasNumber = /\d/.test(text);
        const hasMetric = /%|mm|mg\/dL|mIU\/L|mmol\/L|g\/dL|mcg|unit|L/i.test(text);
        const hasKeywords = ["ejection fraction", "pressure", "level", "glucose", "cholesterol", "rate"].some(k => lower.includes(k));
        
        const isGeneric = ["normal", "no ", "intact", "within"].some(k => lower.includes(k));
        const keep = (hasNumber || hasMetric || hasKeywords) || !isGeneric;

        if (!keep) return null;

        return {
          text: indicator ? `${text} ${indicator}` : text,
          indicator,
          isAbnormal,
          type: (indicator === '↑' || indicator === '↓' || statusStr.includes('high') || statusStr.includes('low') || statusStr.includes('borderline')) ? 'warning' : 'normal'
        };
      })
      .filter(Boolean);

    return { ...data, filteredFindings };
  }, [record]);



  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

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

  const hasMeaningfulContent = processedData && (
    processedData.diagnosis.length > 0 || 
    processedData.filteredFindings.length > 0
  );

  const renderCTA = () => {
    if (!record || (!record.signed_url && !record.file_url)) return null;
    return (
      <TouchableOpacity
        style={styles.viewFileBtn}
        onPress={handleViewDocument}
        activeOpacity={0.8}
        disabled={isOpeningDoc}
      >
        {isOpeningDoc ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <ExternalLink size={18} color={COLORS.white} />
        )}
        <Text style={styles.viewFileBtnText}>
          {isOpeningDoc ? "Opening Securely..." : "View Original Document"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <View 
        style={{ flex: 1 }} 
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.recordBrief}>
            <View style={styles.fileNameRow}>
              <FileText size={20} color={COLORS.text.primary} strokeWidth={2} />
              <Text style={styles.fileName} numberOfLines={1}>
                {processedData?.fileName || 'Medical Report'}
              </Text>
            </View>
            <View style={styles.tag}>
              <Sparkles size={12} color={COLORS.primary} fill={COLORS.primary} />
              <Text style={styles.tagText}>AI ANALYZED</Text>
            </View>
          </View>

          {processedData ? (
            processedData.is_medical_document === false ? (
              <View style={styles.emptyStateContainer}>
                <Info size={48} color={COLORS.border} />
                <Text style={styles.emptyTitle}>This file does not appear to be a medical report</Text>
              </View>
            ) : !hasMeaningfulContent ? (
              <View style={styles.emptyStateContainer}>
                <Info size={48} color={COLORS.border} />
                <Text style={styles.emptyTitle}>No meaningful medical insights found</Text>
                <Text style={styles.emptyText}>The analysis could not identify critical alerts or key findings in this document.</Text>
              </View>
            ) : (
              <View style={styles.mainContent}>
                <PatientDetails details={processedData.patient_details} />
                
                {/* 1. AI Summary (Top) */}
                <SummaryCard text={processedData.simple_summary} />

                {/* 2. Medical Alerts (Diagnosis) */}
                <AlertCard items={processedData.diagnosis} />

                {/* 3. Medications */}
                <ListCard 
                  icon={Pill} 
                  title="Medications" 
                  items={processedData.medications} 
                  color={COLORS.primary} 
                />

                {/* 4. Symptoms & Complaints */}
                <ListCard 
                  icon={Stethoscope} 
                  title="Symptoms & Complaints" 
                  items={processedData.complaints} 
                  color="#22C55E" 
                />

                {/* 5. Key Findings (Last) */}
                <FindingsCard items={processedData.filteredFindings} />
              </View>
            )
          ) : (
            <View style={styles.emptyState}>
              {isPolling ? (
                <>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.emptyTitle}>Medora AI is analyzing…</Text>
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
        </ScrollView>

        {/* Permanent Sticky Footer */}
        <View style={styles.stickyCTAContainer}>
          {renderCTA()}
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  backBtn: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  recordBrief: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  fileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  // Patient Details Styles
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  patientSub: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  mainContent: {
    gap: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.soft,
  },
  alertCard: {
    backgroundColor: '#FEF2F2',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginTop: 8,
  },
  alertText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991B1B',
    lineHeight: 22,
    flex: 1,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 26,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  listText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 22,
  },
  subListText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  viewFileBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...SHADOWS.medium,
  },
  viewFileBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  stickyCTAContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 10,
  },
});
