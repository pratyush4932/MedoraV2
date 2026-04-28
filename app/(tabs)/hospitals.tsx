import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Hospital as HospitalIcon, 
  ChevronRight, 
  Calendar, 
  CircleUserRound,
  ShieldCheck
} from 'lucide-react-native';
import { COLORS, SPACING, SHADOWS, ROUNDING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { recordService } from '../../services/api';
import { AnimatedCard } from '../../components/AnimatedCard';

export default function HospitalListScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      // Debug: Print token for session verification
      console.log('====================================');
      console.log('SESSION TOKEN:', token);
      console.log('====================================');

      const data = await recordService.getMyProfile();
      const hospitalList = data?.hospital_view || [];
      
      console.log('[Hospitals] RAW PROFILE DATA:', JSON.stringify(data, null, 2));

      hospitalList.sort((a: any, b: any) => {
        const getLatest = (h: any) => {
          if (!h.visits || h.visits.length === 0) return 0;
          return Math.max(...h.visits.map((v: any) => new Date(v.date || v.visit_date || 0).getTime()));
        };
        return getLatest(b) - getLatest(a);
      });
      
      setHospitals(hospitalList);
    } catch (err) {
      console.error('[Hospitals] Fetch error:', err);
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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <HospitalIcon size={22} color={COLORS.primary} />
          </View>
          <Text style={styles.headerTitle}>Medical Facilities</Text>
        </View>
        <TouchableOpacity style={styles.avatarCircle}>
          <CircleUserRound size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.title}>Your Facilities</Text>
          <Text style={styles.subtitle}>
            Records from verified hospitals and clinics where you have received care.
          </Text>
        </View>

        <View style={styles.listContainer}>
          {hospitals.map((hospital, index) => {
            const hospitalName = 
              hospital.hospital_name || 
              hospital.name || 
              hospital.hospital?.name || 
              hospital.hospital?.hospital_name ||
              "Unknown Facility";
            
            console.log(`[Hospitals] Resolved name for card ${index}:`, hospitalName);

            const visitDates = hospital.visits?.map((v: any) => new Date(v.date || v.visit_date).getTime()) || [];
            const latestVisit = visitDates.length > 0 ? new Date(Math.max(...visitDates)) : null;

            return (
              <AnimatedCard 
                key={hospital.hospital_id || index} 
                icon={HospitalIcon}
                iconSize={26}
                style={styles.card}
                iconBoxStyle={styles.cardIconBox}
                onPress={() => router.push({
                  pathname: `/facility/${hospital.hospital_id}`,
                  params: { name: hospitalName }
                })}
                iconBoxChildren={
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={10} color={COLORS.white} />
                  </View>
                }
                borderRadius={24}
              >
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {hospitalName}
                  </Text>
                  
                  <View style={styles.cardMeta}>
                    <Calendar size={14} color={COLORS.text.secondary} />
                    <Text style={styles.cardMetaText}>
                      {latestVisit ? `Last visit: ${formatDate(latestVisit.toISOString())}` : 'Verified Partner'}
                    </Text>
                  </View>
                  
                  {(hospitalName === "Hospital" || hospitalName === "Medical Facility") && (
                    <Text style={{ fontSize: 10, color: COLORS.border, marginTop: 4 }}>
                      ID: {hospital.hospital_id?.substring(0, 8)}...
                    </Text>
                  )}
                </View>
                
                <ChevronRight size={20} color={COLORS.text.secondary} />
              </AnimatedCard>
            );
          })}
        </View>

        {hospitals.length === 0 && (
          <View style={styles.emptyContainer}>
            <HospitalIcon size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No records yet</Text>
            <Text style={styles.emptyText}>When a hospital uploads your records, they will appear here automatically.</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary + '30',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
  },
  title: {
    fontSize: 32,
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
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    ...SHADOWS.soft,
  },
  cardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  emptyText: {
    color: COLORS.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
