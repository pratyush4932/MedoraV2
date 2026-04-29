import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  Alert,
  Platform,
  Pressable,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Search, 
  Filter, 
  Folder, 
  FileText, 
  ChevronRight, 
  Clock,
  Plus,
  X,
  FolderOpen,
  Trash2
} from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { recordService } from '../../services/api';
import { AnimatedCard } from '../../components/AnimatedCard';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

export default function RecordsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [folders, setFolders] = useState<any[]>([]);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const [foldersList, recordsData] = await Promise.all([
        recordService.getUserFolders().catch(() => []),
        recordService.getMyProfile().catch(() => ({ records_view: { folders: [] } }))
      ]);
      
      const mergedFolders = (foldersList || []).map((f: any) => {
        const recordsFolder = recordsData?.records_view?.folders?.find((rf: any) => rf.id === f.id || rf.name === f.name);
        return {
          ...f,
          records: recordsFolder ? (recordsFolder.records || []) : []
        };
      });

      const filteredFolders = mergedFolders.filter((f: any) => f.name !== 'Personal');
      setFolders(filteredFolders);
      
      let allDocs: any[] = [];
      recordsData?.records_view?.folders?.forEach((f: any) => {
        if (f.records && Array.isArray(f.records)) {
          allDocs = [...allDocs, ...f.records];
        }
      });
      
      if (allDocs.length > 0) {
        allDocs.sort((a, b) => {
          const dateA = new Date(a.created_at || a.date || a.visit_date || 0).getTime();
          const dateB = new Date(b.created_at || b.date || b.visit_date || 0).getTime();
          return dateB - dateA;
        });
      }
      setRecentDocs(allDocs.slice(0, 10));
    } catch (err) {
      console.error('Fetch records error', err);
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    setIsCreating(true);
    try {
      await recordService.createFolder(newFolderName.trim());
      setNewFolderName('');
      setIsModalVisible(false);
      fetchData(true);
      Alert.alert('Success', `Folder "${newFolderName}" created successfully`);
    } catch (error) {
      console.error('Create folder error', error);
      Alert.alert('Error', 'Failed to create folder. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folderName}" and all its contents? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await recordService.deleteFolder(folderId);
              fetchData(true);
            } catch (error) {
              console.error('Delete folder error', error);
              Alert.alert('Error', 'Failed to delete folder.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteRecord = (recordId: string, recordName: string) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete "${recordName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await recordService.deleteRecord(recordId);
              fetchData(true);
            } catch (error) {
              console.error('Delete record error', error);
              Alert.alert('Error', 'Failed to delete record.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr: any) => {
    try {
      if (!dateStr) return 'Unknown Date';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getDocTitle = (doc: any) => {
    let ai = doc.ai_summary;
    if (typeof ai === 'string' && ai.startsWith('{')) {
      try { ai = JSON.parse(ai); } catch (e) {}
    }
    if (ai?.fileName) return ai.fileName;
    const reports = ai?.reports || doc.reports;
    if (reports && Array.isArray(reports) && reports.length > 0) return reports[0];
    return ai?.title || doc.record_name || doc.file_type || 'Medical Report';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const filteredFolders = folders.filter(f => f.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRecentDocs = recentDocs.filter(d => getDocTitle(d).toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View 
        entering={FadeInDown.duration(400)}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Medical Records</Text>
      </Animated.View>

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
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <LinearGradient
            colors={[COLORS.success, COLORS.primary, COLORS.success]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.searchGradientBorder}
          >
            <View style={styles.searchBar}>
              <Search size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchText}
                placeholder="Search reports, labs, doctors..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {searchQuery.length === 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Folders</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(true)}>
              <Text style={styles.seeAll}>Create New</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {(searchQuery.length > 0 ? filteredFolders.length > 0 : true) && (
          <Animated.View layout={Layout.springify()} style={styles.folderGrid}>
            {filteredFolders.map((folder, index) => (
            <Animated.View 
              key={folder.id || index}
              entering={FadeInUp.delay(300 + index * 50).duration(500)}
              style={styles.folderCardContainer}
            >
              <AnimatedCard 
                icon={Folder}
                iconSize={28}
                style={styles.folderCard}
                iconBoxStyle={styles.folderIconBox}
                onPress={() => router.push(`/folder/${folder.name}`)}
                borderRadius={24}
                iconBoxChildren={null}
              >
                <TouchableOpacity 
                  style={styles.deleteFolderBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id, folder.name);
                  }}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
                <Text style={styles.folderName} numberOfLines={1}>{folder.name || 'Untitled'}</Text>
                <Text style={styles.folderCount}>{folder.records?.length || 0} Files</Text>
              </AnimatedCard>
            </Animated.View>
          ))}
          {filteredFolders.length === 0 && searchQuery.length > 0 && (
            <View style={styles.emptyContainer}>
               <Text style={styles.emptyText}>No matching folders found.</Text>
            </View>
          )}
          {folders.length === 0 && searchQuery.length === 0 && (
            <View style={styles.emptyContainer}>
               <Text style={styles.emptyText}>No folders created.</Text>
            </View>
          )}
        </Animated.View>
        )}

        {searchQuery.length === 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Documents</Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {(searchQuery.length > 0 ? filteredRecentDocs.length > 0 : true) && (
          <Animated.View layout={Layout.springify()} style={styles.docsList}>
            {filteredRecentDocs.map((doc, index) => (
            <Animated.View
              key={doc.id || index}
              entering={FadeInUp.delay(500 + index * 50).duration(500)}
            >
              <AnimatedCard 
                icon={FileText}
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
                    <Text style={styles.docMetaText}>
                      {formatDate(doc.created_at || doc.date || doc.visit_date)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.deleteDocBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteRecord(doc.id, getDocTitle(doc));
                  }}
                >
                  <Trash2 size={18} color="#9CA3AF" />
                </TouchableOpacity>
                <ChevronRight size={20} color={COLORS.text.secondary} />
              </AnimatedCard>
            </Animated.View>
          ))}
          
          {filteredRecentDocs.length === 0 && searchQuery.length > 0 && (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyRecentText}>No matching documents found.</Text>
            </View>
          )}
          {recentDocs.length === 0 && searchQuery.length === 0 && (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyRecentText}>No recent documents found.</Text>
            </View>
          )}
        </Animated.View>
        )}
        </Pressable>
      </ScrollView>

      {/* Create Folder Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Folder</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalLabel}>Give your folder a name to organize your records better.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Lab Reports, Prescriptions"
              placeholderTextColor="#9CA3AF"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus={true}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.createBtn, !newFolderName.trim() && styles.disabledBtn]}
                onPress={handleCreateFolder}
                disabled={isCreating || !newFolderName.trim()}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.createBtnText}>Create Folder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  searchBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
    flexGrow: 1,
  },
  searchGradientBorder: {
    padding: 1.5,
    borderRadius: 16,
    marginBottom: SPACING.xl,
    ...SHADOWS.soft,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16 - 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchText: {
    flex: 1,
    color: '#9CA3AF',
    marginLeft: 12,
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  folderCardContainer: {
    width: '47%',
    marginBottom: 16,
  },
  folderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    ...SHADOWS.soft,
    position: 'relative',
    width: '100%',
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
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  docsList: {
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
  },
  emptyRecent: {
    padding: 20,
    alignItems: 'center',
  },
  emptyRecentText: {
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text.secondary,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    ...SHADOWS.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  modalLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },
  createBtn: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  disabledBtn: {
    backgroundColor: '#9CA3AF',
  },
  deleteFolderBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FEE2E2',
    padding: 6,
    borderRadius: 10,
    ...SHADOWS.soft,
    zIndex: 10,
  },
  deleteDocBtn: {
    padding: 8,
    marginRight: 4,
  },
});
