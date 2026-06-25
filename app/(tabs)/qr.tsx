import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Share, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { 
  Share2, 
  Clock, 
  ShieldCheck, 
  LayoutGrid, 
  Hospital as HospitalIcon, 
  FolderOpen, 
  ChevronRight, 
  CheckCircle2,
  RefreshCw,
  ArrowLeft
} from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { qrService, recordService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const GradientSelectionCard = ({ selected, onPress, children }: any) => (
  <LinearGradient
    colors={selected ? [COLORS.success, COLORS.primary, COLORS.success] : [COLORS.border, COLORS.border, COLORS.border]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.selectionGradientWrapper}
  >
    <TouchableOpacity 
      style={[styles.selectionItem, selected && styles.selectedItem]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  </LinearGradient>
);

export default function QRGenerateScreen() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(3600);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(true);
  
  const [folders, setFolders] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('all'); 
  const qrRef = useRef<any>(null);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await recordService.getMyProfile();
      setFolders(data?.records_view?.folders || []);
      setHospitals(data?.hospital_view || []);
    } catch (e) {
      console.error('Failed to fetch records for selection', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSelecting && user?.id) {
      fetchData();
    }
  }, [isSelecting, user?.id]);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const generateToken = async () => {
    setIsLoading(true);
    try {
      let selectedIds: string[] = [];
      
      if (selectedOption === 'all') {
        folders.forEach(f => {
          if (f.records) selectedIds.push(...f.records.map((r: any) => r.id));
        });
        hospitals.forEach(h => {
          if (h.visits) {
            h.visits.forEach((v: any) => {
              if (v.records) selectedIds.push(...v.records.map((r: any) => r.id));
            });
          }
        });
      } else if (selectedOption === 'hospitals') {
        hospitals.forEach(h => {
          if (h.visits) {
            h.visits.forEach((v: any) => {
              if (v.records) selectedIds.push(...v.records.map((r: any) => r.id));
            });
          }
        });
      } else if (selectedOption === 'folders') {
        folders.forEach(f => {
          if (f.records) selectedIds.push(...f.records.map((r: any) => r.id));
        });
      } else if (selectedOption.startsWith('hospital_')) {
        const hId = selectedOption.replace('hospital_', '');
        const h = hospitals.find(h => h.hospital_id === hId);
        if (h && h.visits) {
          h.visits.forEach((v: any) => {
            if (v.records) selectedIds.push(...v.records.map((r: any) => r.id));
          });
        }
      } else if (selectedOption.startsWith('folder_')) {
        const fId = selectedOption.replace('folder_', '');
        const f = folders.find(f => f.id === fId || f.name === fId);
        if (f && f.records) {
          selectedIds.push(...f.records.map((r: any) => r.id));
        }
      }

      console.log('[QR] Generating token for record IDs:', selectedIds);
      const data = await qrService.generateQR(selectedIds, 3600, selectedOption);
      console.log('[QR] Token generated successfully:', data);
      
      setToken(data.token);
      setExpiresAt(new Date(data.expires_at));
      setIsSelecting(false);
    } catch (e) {
      console.error('[QR] Failed to generate QR:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!token || !qrRef.current) return;
    
    try {
      qrRef.current.toDataURL(async (data: string) => {
        const filename = `${FileSystem.cacheDirectory}medora-qr-${token}.png`;
        const base64Data = data.includes('base64,') ? data.split('base64,')[1] : data;

        try {
          await FileSystem.writeAsStringAsync(filename, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const isSharingAvailable = await Sharing.isAvailableAsync();
          if (isSharingAvailable) {
            await Sharing.shareAsync(filename);
          } else {
            await Share.share({
              message: `View my medical records securely: https://medora.link/qr/${token}`,
            });
          }
        } catch (fileError) {
          console.error('File operation failed:', fileError);
          await Share.share({
            message: `View my medical records securely: https://medora.link/qr/${token}`,
          });
        }
      });
    } catch (error) {
      console.error('Sharing failed:', error);
      await Share.share({
        message: `View my medical records securely: https://medora.link/qr/${token}`,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading && isSelecting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching records...</Text>
      </View>
    );
  }

  if (isSelecting) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Share Records</Text>
          <Text style={styles.subtitle}>Select what you want to share with the doctor</Text>
        </View>

        <ScrollView style={styles.selectionList} contentContainerStyle={styles.selectionContent}>
          <Text style={styles.sectionTitle}>Presets</Text>
          
          <GradientSelectionCard 
            selected={selectedOption === 'all'} 
            onPress={() => setSelectedOption('all')}
          >
            <View style={[styles.iconBox, { backgroundColor: COLORS.primary + '10' }]}>
              <LayoutGrid size={22} color={COLORS.primary} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>All Records</Text>
              <Text style={styles.itemDesc}>Everything in your profile</Text>
            </View>
            {selectedOption === 'all' && <CheckCircle2 size={20} color={COLORS.primary} />}
          </GradientSelectionCard>

          <GradientSelectionCard 
            selected={selectedOption === 'hospitals'} 
            onPress={() => setSelectedOption('hospitals')}
          >
            <View style={[styles.iconBox, { backgroundColor: COLORS.accent + '10' }]}>
              <HospitalIcon size={22} color={COLORS.accent} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Only Hospital Records</Text>
              <Text style={styles.itemDesc}>Verified hospital visits only</Text>
            </View>
            {selectedOption === 'hospitals' && <CheckCircle2 size={20} color={COLORS.primary} />}
          </GradientSelectionCard>

          <GradientSelectionCard 
            selected={selectedOption === 'folders'} 
            onPress={() => setSelectedOption('folders')}
          >
            <View style={[styles.iconBox, { backgroundColor: COLORS.secondary + '10' }]}>
              <FolderOpen size={22} color={COLORS.secondary} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Only Personal Folders</Text>
              <Text style={styles.itemDesc}>Records you uploaded manually</Text>
            </View>
            {selectedOption === 'folders' && <CheckCircle2 size={20} color={COLORS.primary} />}
          </GradientSelectionCard>

          {hospitals.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Specific Hospitals</Text>
              {hospitals.map((h) => (
                <GradientSelectionCard 
                  key={h.hospital_id}
                  selected={selectedOption === `hospital_${h.hospital_id}`} 
                  onPress={() => setSelectedOption(`hospital_${h.hospital_id}`)}
                >
                  <View style={styles.iconBox}>
                    <HospitalIcon size={20} color={COLORS.text.secondary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{h.hospital_name}</Text>
                    <Text style={styles.itemDesc}>{h.visits?.length || 0} visits found</Text>
                  </View>
                  {selectedOption === `hospital_${h.hospital_id}` && <CheckCircle2 size={20} color={COLORS.primary} />}
                </GradientSelectionCard>
              ))}
            </>
          )}

          {folders.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Specific Folders</Text>
              {folders.map((f) => (
                <GradientSelectionCard 
                  key={f.id || f.name}
                  selected={selectedOption === `folder_${f.id}` || selectedOption === `folder_${f.name}`} 
                  onPress={() => setSelectedOption(`folder_${f.id || f.name}`)}
                >
                  <View style={styles.iconBox}>
                    <FolderOpen size={20} color={COLORS.text.secondary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{f.name}</Text>
                    <Text style={styles.itemDesc}>{f.records?.length || 0} records</Text>
                  </View>
                  {(selectedOption === `folder_${f.id}` || selectedOption === `folder_${f.name}`) && <CheckCircle2 size={20} color={COLORS.primary} />}
                </GradientSelectionCard>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isLoading ? "Generating..." : "Generate Secured QR"}
            onPress={generateToken}
            disabled={isLoading}
            style={styles.generateBtn}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.qrHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setIsSelecting(true)}>
            <ArrowLeft size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <View style={styles.qrHeaderText}>
            <Text style={styles.title}>Your Health QR</Text>
            <Text style={styles.subtitle}>Show this to your doctor to share</Text>
          </View>
        </View>

        <Card style={styles.qrCard}>
          {token ? (
            <View style={styles.qrContainer}>
              <QRCode
                value={token}
                size={220}
                color={COLORS.text.primary}
                backgroundColor={COLORS.white}
                getRef={(c) => (qrRef.current = c)}
              />
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load QR</Text>
              <Button title="Retry" onPress={generateToken} variant="outline" />
            </View>
          )}
        </Card>

        <View style={styles.timerContainer}>
          <Clock size={20} color={COLORS.accent} />
          <Text style={styles.timerText}>
            Expires in <Text style={styles.timeValue}>{formatTime(timeLeft)}</Text>
          </Text>
        </View>

        <View style={styles.securityInfo}>
          <ShieldCheck size={16} color={COLORS.success} />
          <Text style={styles.securityText}>Token is time-limited and single-use</Text>
        </View>

        <View style={styles.footer}>
          <Button
            title="Share Link"
            onPress={handleShare}
            style={styles.shareBtn}
            variant="primary"
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.ghostBtn} onPress={generateToken}>
              <RefreshCw size={18} color={COLORS.primary} />
              <Text style={styles.ghostBtnText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setIsSelecting(true)}>
              <ArrowLeft size={18} color={COLORS.primary} />
              <Text style={styles.ghostBtnText}>Change Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFA',
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.xl,
  },
  backBtn: {
    padding: SPACING.sm,
    marginRight: SPACING.md,
  },
  qrHeaderText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  selectionList: {
    flex: 1,
  },
  selectionContent: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectionGradientWrapper: {
    padding: 1.5,
    borderRadius: ROUNDING.md + 1.5,
    marginBottom: SPACING.sm,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: ROUNDING.md,
  },
  selectedItem: {
    backgroundColor: COLORS.primary + '05',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  qrCard: {
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    ...SHADOWS.medium,
    borderRadius: ROUNDING.lg,
    marginTop: SPACING.md,
  },
  qrContainer: {
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    backgroundColor: COLORS.accent + '10',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: ROUNDING.full,
  },
  timerText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  timeValue: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
  },
  securityText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  footer: {
    marginTop: 'auto',
    width: '100%',
    padding: SPACING.xl,
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  generateBtn: {
    width: '100%',
  },
  shareBtn: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: SPACING.sm,
  },
  ghostBtnText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFA',
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    height: 220,
    width: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontWeight: '600',
  },
});
