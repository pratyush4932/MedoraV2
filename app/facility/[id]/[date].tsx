import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft,
  FileText,
  ChevronRight,
  Clock,
  User,
  Activity,
  FlaskConical
} from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
import { recordService } from '../../../services/api';
import { AnimatedCard } from '../../../components/AnimatedCard';

export default function VisitFilesScreen() {
  const { id, date, hospitalName: initialName, dateStr } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [hName, setHName] = useState<string | null>(initialName as string || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await recordService.getMyProfile();
      const hospital = data.hospital_view?.find((h: any) => h.hospital_id === id);
      
      if (hospital) {
        setHName(hospital.hospital_name);
        const targetDate = (date || dateStr) as string;
        const visit = hospital.visits?.find((v: any) => (v.date || v.visit_date) === targetDate);
        setRecords(visit?.records || []);
      }
    } catch (err) {
      console.error('Fetch visit files error', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchData();
    }
  }, [user, id, date]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData(true);
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const getDocIcon = (type: string, title: string) => {
    const t = (type || title || '').toLowerCase();
    if (t.includes('blood') || t.includes('lab')) return FlaskConical;
    if (t.includes('mri') || t.includes('scan') || t.includes('imaging')) return Activity;
    return FileText;
  };

  const getDocTitle = (doc: any) => {
    let ai = doc.ai_summary;
    if (typeof ai === 'string' && ai.startsWith('{')) {
      try { ai = JSON.parse(ai); } catch (e) {}
    }
    if (ai?.fileName) return ai.fileName;
    const reports = ai?.reports || doc.reports;
    if (reports && Array.isArray(reports) && reports.length > 0) return reports[0];
    return ai?.title || doc.record_name || doc.file_type || 'Medical Record';
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{hName || 'Visit Records'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.title}>{formatDate((Array.isArray(date) ? date[0] : (date || dateStr)) as string)}</Text>
          <Text style={styles.subtitle}>
            Medical documents uploaded during this visit at {hName}.
          </Text>
        </View>

        <View style={styles.listContainer}>
          {records?.map((doc, index) => (
            <AnimatedCard 
              key={doc.id || index} 
              icon={getDocIcon(doc.file_type, doc.ai_summary?.reports?.[0])}
              iconSize={22}
              style={styles.docCard}
              iconBoxStyle={styles.docIconBox}
              onPress={() => router.push(`/summary/${doc.id}`)}
              borderRadius={20}
            >
              <View style={styles.docInfo}>
                <Text style={styles.docTitle} numberOfLines={1}>
                  {getDocTitle(doc)}
                </Text>
                <View style={styles.docMeta}>
                  <Clock size={12} color={COLORS.text.secondary} />
                  <Text style={styles.docMetaText}>{doc.status === 'processing' ? 'Processing...' : 'Analyzed'}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={COLORS.text.secondary} />
            </AnimatedCard>
          ))}
        </View>

        {records.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No records found for this visit.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    ...SHADOWS.soft,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  listContainer: {
    gap: 12,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    ...SHADOWS.soft,
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docMetaText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text.secondary,
    fontSize: 16,
  },
});
