import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, RefreshControl, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Bell, 
  ChevronRight, 
  FileText,
  FlaskConical,
  ClipboardList,
  Activity,
  Folder
} from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { recordService } from '../../services/api';

export default function RecordsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [folders, setFolders] = useState<any[]>([]);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const [foldersList, recordsData] = await Promise.all([
        recordService.getUserFolders(),
        recordService.getUserRecords(user.id)
      ]);
      
      // Merge: Start with all folders from the database
      const mergedFolders = foldersList.map((f: any) => {
        // Find matching record data if any
        const recordsFolder = recordsData.records_view?.folders?.find((rf: any) => rf.id === f.id || rf.name === f.name);
        return {
          ...f,
          records: recordsFolder ? recordsFolder.records : []
        };
      });

      // User folders only as requested - filtering out default "Personal" folder
      const filteredFolders = mergedFolders.filter((f: any) => f.name !== 'Personal');
      setFolders(filteredFolders);
      
      // Flatten all docs from folders for "Recent Documents"
      let allDocs: any[] = [];
      recordsData.records_view?.folders.forEach((f: any) => {
        allDocs = [...allDocs, ...f.records];
      });
      allDocs.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
      setRecentDocs(allDocs.slice(0, 5));
    } catch (err) {
      console.error('Fetch records error', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const hasProcessing = folders.some(f => f.records?.some((r: any) => r.status === 'processing')) || 
                        recentDocs.some(r => r.status === 'processing');
    if (hasProcessing) {
      const timer = setTimeout(() => fetchData(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [folders, recentDocs]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const getFolderIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('lab')) return <FlaskConical size={24} color={COLORS.primary} />;
    if (n.includes('pres')) return <ClipboardList size={24} color={COLORS.primary} />;
    if (n.includes('imag') || n.includes('scan')) return <Activity size={24} color={COLORS.primary} />;
    return <Folder size={24} color={COLORS.primary} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <FileText size={20} color={COLORS.white} fill={COLORS.white} />
          </View>
          <Text style={styles.brandName}>Medora</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Bell size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.title}>Records</Text>
          <Text style={styles.subtitle}>
            Your clinical narrative, curated and secured with fintech-grade precision.
          </Text>
        </View>

        {/* Removed Filter Tabs (All, Hospital, Manual) as requested */}

        <View style={styles.folderGrid}>
          {folders.map((folder, index) => (
            <TouchableOpacity 
              key={folder.id || index} 
              style={styles.folderCard}
              onPress={() => router.push(`/folder/${folder.name}`)}
            >
              <View style={styles.folderIconBox}>
                {getFolderIcon(folder.name)}
              </View>
              <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
              <Text style={styles.folderCount}>{folder.records?.length || 0} Documents</Text>
            </TouchableOpacity>
          ))}
          {/* Add a placeholder if folders are empty */}
          {folders.length === 0 && (
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyText}>No folders found.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Documents</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.docsList}>
          {recentDocs.length > 0 ? (
            recentDocs.map((doc, index) => (
              <TouchableOpacity 
                key={doc.id || index} 
                style={styles.docItem}
                onPress={() => router.push(`/summary/${doc.id}`)}
              >
                <View style={styles.docIconBox}>
                  <FileText size={22} color={COLORS.text.primary} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle} numberOfLines={1}>
                    {doc.status === 'processing' ? 'Generating AI summary...' : (doc.ai_summary?.reports?.[0] || doc.file_type || 'Health Report')}
                  </Text>
                  <Text style={styles.docMeta}>
                    {new Date(doc.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {doc.source || 'Lab'}
                  </Text>
                </View>
                <ChevronRight size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent documents.</Text>
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
    paddingBottom: 120,
  },
  heroSection: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 34,
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
    marginBottom: SPACING.xl,
  },
  folderCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.soft,
  },
  folderIconBox: {
    width: 48,
    height: 48,
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
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  emptyGrid: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  docsList: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingVertical: 8,
    ...SHADOWS.soft,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
  },
  docMeta: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
});
