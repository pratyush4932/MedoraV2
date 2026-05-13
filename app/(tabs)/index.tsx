import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Image, Pressable, Keyboard, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Search as SearchIcon, 
  FolderOpen, 
  QrCode, 
  FileText,
  Sparkles,
  Upload,
  Hospital,
  LogOut,
  LucideIcon,
  Calendar
} from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { recordService, aiService } from '../../services/api';
import { AnimatedCard } from '../../components/AnimatedCard';
import { LinearGradient } from 'expo-linear-gradient';

const LogoutButton = ({ onPress }: { onPress: () => void }) => {
  const [animation] = useState(new Animated.Value(0));

  const handleIn = () => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleOut = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={handleIn}
      onHoverOut={handleOut}
      onPressIn={handleIn}
      onPressOut={handleOut}
    >
      <View style={[styles.logoutBtn, { backgroundColor: COLORS.error + '20', overflow: 'hidden' }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.error, opacity: animation }]} />
        <View style={{ position: 'relative', width: 20, height: 20 }}>
           <LogOut size={20} color={COLORS.error} style={{ position: 'absolute' }} />
           <Animated.View style={{ opacity: animation, position: 'absolute' }}>
             <LogOut size={20} color={COLORS.white} />
           </Animated.View>
        </View>
      </View>
    </Pressable>
  );
};

const GlowingAppointmentButton = ({ onPress }: { onPress: () => void }) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Pressable onPress={onPress}>
      <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View 
          style={{ 
            position: 'absolute', 
            width: '100%', 
            height: '100%', 
            backgroundColor: COLORS.primary, 
            borderRadius: ROUNDING.full,
            opacity: 0.4,
            transform: [{ scale: pulseAnim }]
          }} 
        />
        <LinearGradient
          colors={[COLORS.primary, '#00A3A3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingHorizontal: 16, 
            paddingVertical: 10, 
            borderRadius: ROUNDING.full,
            gap: 8,
            ...SHADOWS.medium
          }}
        >
          <Calendar size={18} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>Book Appt</Text>
        </LinearGradient>
      </View>
    </Pressable>
  );
};

import Reanimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [folders, setFolders] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  const fetchData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await recordService.getMyProfile();
      
      const userFolders = data?.records_view?.folders || [];
      const userHospitals = data?.hospital_view || [];
      
      let allRecords: any[] = [];
      
      userFolders.forEach((f: any) => {
        if (f.records && Array.isArray(f.records)) {
          allRecords = [...allRecords, ...f.records];
        }
      });

      userHospitals.forEach((h: any) => {
        h.visits?.forEach((v: any) => {
          if (v.records && Array.isArray(v.records)) {
            allRecords = [...allRecords, ...v.records];
          }
        });
      });

      setFolders(userFolders);
      setHospitals(userHospitals);
      setRecords(allRecords);

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

  const filteredFolders = folders.filter(f => f.name?.toLowerCase().includes(searchQuery.toLowerCase()) && f.name !== 'Personal');
  const filteredHospitals = hospitals.filter(h => h.hospital_name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRecords = records.filter(r => getDocTitle(r).toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={{ width: 32, height: 32, borderRadius: 8 }} 
          />
          <Text style={styles.brandName}>Medora</Text>
        </View>
        <LogoutButton onPress={signOut} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable 
          style={{ flex: 1, minHeight: '100%' }}
          onPress={() => {
            Keyboard.dismiss();
            if (searchQuery.length > 0) setSearchQuery('');
          }}
        >
          <Reanimated.View 
            entering={FadeInDown.delay(100).duration(600)}
            style={[styles.heroSection, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
          >
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.name || 'Prithwi'}</Text>
            </View>
            <GlowingAppointmentButton onPress={() => router.push('/appointment')} />
          </Reanimated.View>

          <Reanimated.View entering={FadeInDown.delay(200).duration(600)}>
            <LinearGradient
              colors={[COLORS.success, COLORS.primary, COLORS.success]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.searchGradientBorder}
            >
              <View style={styles.searchContainer}>
                <SearchIcon size={20} color={COLORS.text.secondary} style={styles.searchIcon} />
                <TextInput 
                  placeholder="Search records, labs, or providers..." 
                  placeholderTextColor={COLORS.text.secondary + '80'}
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </LinearGradient>
          </Reanimated.View>

        {searchQuery.length > 0 ? (
          <View style={styles.searchResults}>
            {filteredFolders.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultHeader}>Folders</Text>
                {filteredFolders.map((folder, i) => (
                  <AnimatedCard
                    key={folder.id || i}
                    icon={FolderOpen}
                    iconSize={20}
                    style={styles.resultItem}
                    onPress={() => router.push(`/folder/${folder.name}`)}
                  >
                    <Text style={styles.resultText}>{folder.name}</Text>
                  </AnimatedCard>
                ))}
              </View>
            )}
            
            {filteredHospitals.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultHeader}>Hospitals</Text>
                {filteredHospitals.map((hospital, i) => (
                  <AnimatedCard
                    key={hospital.hospital_id || i}
                    icon={Hospital}
                    iconSize={20}
                    style={styles.resultItem}
                    onPress={() => router.push(`/facility/${hospital.hospital_id}`)}
                  >
                    <Text style={styles.resultText}>{hospital.hospital_name}</Text>
                  </AnimatedCard>
                ))}
              </View>
            )}

            {filteredRecords.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultHeader}>Documents</Text>
                {filteredRecords.map((record, i) => (
                  <AnimatedCard
                    key={record.id || i}
                    icon={FileText}
                    iconSize={20}
                    style={styles.resultItem}
                    onPress={() => router.push(`/summary/${record.id}`)}
                  >
                    <Text style={styles.resultText} numberOfLines={1}>{getDocTitle(record)}</Text>
                  </AnimatedCard>
                ))}
              </View>
            )}

            {filteredFolders.length === 0 && filteredHospitals.length === 0 && filteredRecords.length === 0 && (
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>{`No results found for "${searchQuery}"`}</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <Reanimated.View 
              entering={FadeInDown.delay(300).duration(600)}
              style={styles.quickActions}
            >
              <AnimatedCard 
                icon={FolderOpen}
                label="Records"
                style={styles.actionCard}
                iconBoxStyle={styles.actionIconBox}
                onPress={() => router.push('/records')}
              >
                <Text style={styles.actionLabel}>Records</Text>
              </AnimatedCard>

              <AnimatedCard 
                icon={QrCode}
                label="Generate QR"
                style={styles.actionCard}
                iconBoxStyle={styles.actionIconBox}
                onPress={() => router.push('/qr')}
              >
                <Text style={styles.actionLabel}>Generate QR</Text>
              </AnimatedCard>

              <AnimatedCard 
                icon={Upload}
                label="Upload"
                style={styles.actionCard}
                iconBoxStyle={styles.actionIconBox}
                onPress={() => router.push('/upload')}
              >
                <Text style={styles.actionLabel}>Upload</Text>
              </AnimatedCard>

              <AnimatedCard 
                icon={Hospital}
                label="Hospital"
                style={styles.actionCard}
                iconBoxStyle={styles.actionIconBox}
                onPress={() => router.push('/hospitals')}
              >
                <Text style={styles.actionLabel}>Hospital</Text>
              </AnimatedCard>
            </Reanimated.View>

            <Reanimated.View entering={FadeInUp.delay(400).duration(600)}>
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
                  <View style={styles.insightHeaderText}>
                    <Text style={styles.insightType}>AI ANALYSIS</Text>
                    <Text style={styles.insightUpdateStatus}>Updated just now</Text>
                  </View>
                </View>
                
                <Text style={styles.insightTitle}>
                  {aiInsight ? 'Longitudinal Health Overview' : 'All systems look good'}
                </Text>
                
                <Text style={styles.insightDescription}>
                  {aiInsight?.overall_health_picture 
                    ? (Array.isArray(aiInsight.overall_health_picture) 
                        ? aiInsight.overall_health_picture.join('\n') 
                        : aiInsight.overall_health_picture)
                    : 'Based on your recent records, your vital signs are within normal ranges.'}
                </Text>

                {aiInsight?.identified_patterns && aiInsight.identified_patterns.length > 0 && (
                  <View style={styles.patternsContainer}>
                    <Text style={styles.patternsLabel}>Key Observations:</Text>
                    <View style={styles.patternsGrid}>
                      {aiInsight.identified_patterns.map((item: any, idx: number) => (
                        <View key={idx} style={styles.patternChip}>
                          <View style={styles.patternDot} />
                          <Text style={styles.patternText}>{item?.pattern || item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {isLoading && !isRefreshing && (
                   <View style={styles.insightLoading}>
                     <ActivityIndicator size="small" color={COLORS.primary} />
                     <Text style={styles.insightLoadingText}>Analyzing records...</Text>
                   </View>
                )}
              </View>
            </Reanimated.View>
          </>
        )}
        </Pressable>
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
  logoutBtn: {
    padding: 10,
    borderRadius: ROUNDING.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
    flexGrow: 1,
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
  searchGradientBorder: {
    padding: 1.5,
    borderRadius: ROUNDING.full,
    marginBottom: SPACING.xl,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: ROUNDING.full - 1.5,
    paddingHorizontal: 16,
    height: 46,
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
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  insightHeaderText: {
    flex: 1,
  },
  insightIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightType: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  insightUpdateStatus: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  insightDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  patternsContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  patternsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 10,
  },
  patternsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  patternChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  patternDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  patternText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  insightLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  insightLoadingText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  searchResults: {
    marginBottom: SPACING.xl,
  },
  resultSection: {
    marginBottom: SPACING.md,
  },
  resultHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
    marginLeft: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: ROUNDING.lg,
    marginBottom: 8,
    gap: 12,
    ...SHADOWS.soft,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  emptySearch: {
    padding: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
});
