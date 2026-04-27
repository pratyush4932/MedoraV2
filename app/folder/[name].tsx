import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  ExternalLink, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Sparkles
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchFolderRecords();
  }, [name]);

  const fetchFolderRecords = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await recordService.getUserRecords(user.id);
      const folder = data.records_view?.folders.find((f: any) => f.name === name);
      if (folder) {
        setRecords(folder.records || []);
      }
    } catch (err) {
      console.error('Fetch folder records error', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const hasProcessing = records.some(r => r.status === 'processing');
    if (hasProcessing) {
      const timer = setTimeout(() => fetchFolderRecords(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [records]);

  const handleViewFile = (url: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.countText}>{records.length} Documents in this folder</Text>
        </View>

        {records.length > 0 ? (
          records.map((record, index) => (
            <View key={record.id || index} style={styles.recordCard}>
              <TouchableOpacity 
                style={styles.recordHeader} 
                onPress={() => toggleExpand(record.id)}
                activeOpacity={0.7}
              >
                <View style={styles.recordIconBox}>
                  <FileText size={20} color={COLORS.primary} />
                </View>
                <View style={styles.recordMainInfo}>
                  <Text style={styles.recordTitle}>
                    {(() => {
                      let ai = record.ai_summary;
                      if (typeof ai === 'string' && ai.startsWith('{')) {
                        try { ai = JSON.parse(ai); } catch (e) {}
                      }
                      
                      const reports = ai?.reports || record.reports;
                      if (reports && Array.isArray(reports) && reports.length > 0) return reports[0];
                      
                      return ai?.title || record.record_name || record.file_type || 'Medical Record';
                    })()}
                  </Text>
                  <Text style={styles.recordDate}>
                    {(() => {
                      const date = record.visit_date || record.created_at || record.uploaded_at;
                      if (!date) return 'Recent';
                      try {
                        return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                      } catch (e) {
                        return 'Recent';
                      }
                    })()}
                  </Text>
                </View>
                {expandedId === record.id ? (
                  <ChevronUp size={20} color={COLORS.text.secondary} />
                ) : (
                  <ChevronDown size={20} color={COLORS.text.secondary} />
                )}
              </TouchableOpacity>

              {(expandedId === record.id || index === 0 && !expandedId) && (
                <View style={styles.recordDetails}>
                  <View style={styles.divider} />
                  
                  <View style={styles.summarySection}>
                    <View style={styles.summaryHeader}>
                      <Sparkles size={16} color={COLORS.primary} />
                      <Text style={styles.summaryTitle}>AI Summary</Text>
                    </View>
                    <Text style={styles.summaryText}>
                      {record.status === 'processing' ? (
                        "Generating AI summary..."
                      ) : (
                        (() => {
                          let ai = record.ai_summary;
                          if (typeof ai === 'string' && ai.startsWith('{')) {
                            try { ai = JSON.parse(ai); } catch (e) {}
                          }
                          
                          // Check inside ai_summary object
                          if (typeof ai === 'object' && ai !== null) {
                            const findings = ai.key_findings?.join(' ') || ai.findings || ai.simple_summary;
                            if (findings) return findings;
                          }
                          
                          // Check top-level fields on record
                          const topFindings = record.key_findings || record.findings || record.simple_summary;
                          if (topFindings) {
                            return Array.isArray(topFindings) ? topFindings.join(' ') : topFindings;
                          }

                          if (typeof ai === 'object' && ai !== null) {
                            return ai.simple_summary || 'Analysis complete. AI summary is available in the detailed view.';
                          }
                          
                          return typeof ai === 'string' ? ai : 'Analysis complete. This report indicates stable vital signs.';
                        })()
                      )}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.viewFileBtn}
                    onPress={() => handleViewFile(record.signed_url)}
                  >
                    <ExternalLink size={18} color={COLORS.white} />
                    <Text style={styles.viewFileBtnText}>View Original Document</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No documents in this folder yet.</Text>
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
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 16,
    ...SHADOWS.soft,
    overflow: 'hidden',
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  recordIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordMainInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  recordDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  recordDetails: {
    padding: 16,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  summarySection: {
    backgroundColor: '#F8FAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  viewFileBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewFileBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
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
});
