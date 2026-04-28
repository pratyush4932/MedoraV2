import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Folder,
  ChevronRight,
  Calendar,
  FileText
} from 'lucide-react-native';
import { COLORS, SPACING, SHADOWS } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
import { recordService } from '../../../services/api';
import { AnimatedCard } from '../../../components/AnimatedCard';

export default function HospitalDetailScreen() {
  const { id, name } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [hospitalData, setHospitalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await recordService.getMyProfile();
      const found = data.hospital_view?.find((h: any) => h.hospital_id === id);
      setHospitalData(found);
    } catch (err) {
      console.error('Fetch hospital details error', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchData();
    }
  }, [user, id]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!hospitalData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Hospital data not available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{hospitalData.hospital_name || name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.title}>Visit Dates</Text>
          <Text style={styles.subtitle}>
            Browse records uploaded by {hospitalData.hospital_name} grouped by the date of your visit.
          </Text>
        </View>

        <View style={styles.folderGrid}>
          {hospitalData.visits?.map((visit: any, index: number) => (
            <AnimatedCard 
              key={index} 
              icon={Folder}
              iconSize={28}
              style={styles.folderCard}
              iconBoxStyle={styles.folderIconBox}
              onPress={() => router.push({
                pathname: `/facility/${id}/${visit.date || visit.visit_date}`,
                params: { 
                  hospitalName: hospitalData.hospital_name,
                  dateStr: visit.date || visit.visit_date
                }
              })}
              borderRadius={24}
            >
              <Text style={styles.folderName}>{formatDate(visit.date || visit.visit_date)}</Text>
              <View style={styles.metaRow}>
                <FileText size={12} color={COLORS.text.secondary} />
                <Text style={styles.folderCount}>{visit.records?.length || 0} Files</Text>
              </View>
            </AnimatedCard>
          ))}
        </View>

        {(!hospitalData.visits || hospitalData.visits.length === 0) && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No visits found for this hospital.</Text>
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
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  folderCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    ...SHADOWS.soft,
  },
  folderIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  folderCount: {
    fontSize: 13,
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
