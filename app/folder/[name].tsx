import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  ChevronRight,
  Plus,
  Trash2
} from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { recordService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function FolderDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFolderRecords = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await recordService.getMyProfile();
      const folder = data?.records_view?.folders?.find((f: any) => f.name === name);
      if (folder) {
        setRecords(folder.records || []);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error('Fetch folder records error', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && name) {
      fetchFolderRecords();
    }
  }, [user?.id, name]);

  useEffect(() => {
    const hasProcessing = records.some(r => r.status === 'processing');
    if (hasProcessing) {
      const timer = setTimeout(() => fetchFolderRecords(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [records]);

  const getDocTitle = (record: any) => {
    if (record.status === 'processing') return 'Generating AI summary...';
    let ai = record.ai_summary;
    if (typeof ai === 'string' && ai.startsWith('{')) {
      try { ai = JSON.parse(ai); } catch (e) { }
    }
    const reports = ai?.reports || record.reports;
    if (ai?.fileName) return ai.fileName;
    if (reports && Array.isArray(reports) && reports.length > 0) return reports[0];
    return ai?.title || record.record_name || record.file_type || 'Medical Record';
  };

  const getDocDate = (record: any) => {
    const date = record.visit_date || record.created_at || record.uploaded_at;
    if (!date) return 'Recent';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Recent';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Recent';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
              fetchFolderRecords(true);
            } catch (error) {
              console.error('Delete record error', error);
              Alert.alert('Error', 'Failed to delete record.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteFolder = () => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete this folder and all its contents? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // We need the folder ID. For now, name is used as identifier in many places, 
              // but the API needs the ID. We'll need to find the folder ID from the data.
              const data = await recordService.getMyProfile();
              const folder = data?.records_view?.folders?.find((f: any) => f.name === name);
              if (folder?.id) {
                await recordService.deleteFolder(folder.id);
                router.back();
              } else {
                Alert.alert('Error', 'Could not find folder ID.');
              }
            } catch (error) {
              console.error('Delete folder error', error);
              Alert.alert('Error', 'Failed to delete folder.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name}</Text>
        <TouchableOpacity onPress={handleDeleteFolder} style={styles.deleteFolderHeaderBtn}>
          <Trash2 size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.countText}>{records.length} Document{records.length !== 1 ? 's' : ''} in this folder</Text>
        </View>

        {records.length > 0 ? (
          <View style={styles.docsList}>
            {records.map((record, index) => (
              <TouchableOpacity
                key={record.id || index}
                style={[
                  styles.docItem,
                  index === records.length - 1 && styles.docItemLast,
                ]}
                activeOpacity={0.7}
                onPress={() => router.push(`/summary/${record.id}`)}
              >
                <View style={styles.docIconBox}>
                  <FileText size={22} color={COLORS.primary} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle} numberOfLines={1}>
                    {getDocTitle(record)}
                  </Text>
                  <Text style={styles.docMeta}>{getDocDate(record)}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.deleteBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteRecord(record.id, getDocTitle(record));
                  }}
                >
                  <Trash2 size={18} color="#9CA3AF" />
                </TouchableOpacity>
                <ChevronRight size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No documents in this folder yet.</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push({ pathname: '/upload', params: { folderId: name } })}
      >
        <Plus size={30} color={COLORS.white} />
      </TouchableOpacity>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    ...SHADOWS.soft,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  backBtn: {
    padding: 8,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  intro: {
    marginBottom: SPACING.lg,
  },
  countText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
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
  docItemLast: {
    borderBottomWidth: 0,
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFA',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text.secondary,
    fontSize: 16,
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
  deleteBtn: {
    padding: 8,
    marginRight: 4,
  },
  deleteFolderHeaderBtn: {
    padding: 8,
  },
});
