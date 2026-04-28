import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Bell, 
  Search, 
  FolderOpen, 
  QrCode, 
  ChevronRight, 
  FileText,
  Sparkles,
  Upload,
  Hospital
} from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { recordService, aiService } from '../../services/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await recordService.getMyProfile();
      
      let allRecords: any[] = [];
      
      data?.records_view?.folders?.forEach((f: any) => {
        if (f.records && Array.isArray(f.records)) {
          allRecords = [...allRecords, ...f.records];
        }
      });

      data?.hospital_view?.forEach((h: any) => {
        h.visits?.forEach((v: any) => {
          if (v.records && Array.isArray(v.records)) {
            allRecords = [...allRecords, ...v.records];
          }
        });
      });

      const summaries = allRecords
        .map(r => {
          let s = r.ai_summary;
          if (typeof s === 'string' && s.startsWith('{')) {
            try { s = JSON.parse(s); } catch (e) {}
          }
          return s;
        })
        .filter(s => s && typeof s === 'object' && (s.reports?.length > 0 || s.simple_summary || s.findings || s.key_findings || s.complaints));

      if (summaries.length > 0) {
        try {
          const aggregate = await aiService.summarizeSummaries(summaries);
          setAiInsight(aggregate.data || aggregate);
        } catch (e) {
          console.error('AI Summary error', e);
        }
      }
    } catch (err) {
      console.error('Fetch home data error', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <FileText size={20} color={COLORS.white} fill={COLORS.white} />
          </View>
          <Text style={styles.brandName}>Medora</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Bell size={24} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Prithwi'}</Text>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.text.secondary} style={styles.searchIcon} />
          <TextInput 
            placeholder="Search records, labs, or providers..." 
            placeholderTextColor={COLORS.text.secondary + '80'}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/records')}
          >
            <View style={styles.actionIconBox}>
              <FolderOpen size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionLabel}>Records</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/qr')}
          >
            <View style={styles.actionIconBox}>
              <QrCode size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionLabel}>Generate QR</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/upload')}
          >
            <View style={styles.actionIconBox}>
              <Upload size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionLabel}>Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/hospitals')} 
          >
            <View style={styles.actionIconBox}>
              <Hospital size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionLabel}>Hospital</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Smart Insights</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Last 24 Hours</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.insightsCard}>
          <View style={styles.insightHeader}>
            <View style={styles.insightIconCircle}>
              <Sparkles size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.insightType}>AI ANALYSIS</Text>
          </View>
          <Text style={styles.insightTitle}>
            {aiInsight ? 'Longitudinal Health Overview' : 'All systems look good'}
          </Text>
          <Text style={styles.insightDescription}>
            {aiInsight?.overall_health_picture || 'Based on your recent records, your vital signs are within normal ranges.'}
          </Text>
          {isLoading && !isRefreshing && (
             <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 12 }} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notificationBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: SPACING.lg,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  userName: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: -4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: ROUNDING.full,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: SPACING.xl,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  actionCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: ROUNDING.full,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  insightsCard: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.soft,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightType: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.text.secondary,
    letterSpacing: 1,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});
