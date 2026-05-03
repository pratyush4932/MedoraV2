import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle2, Clock, FileUp, Folder, FolderPlus, Sparkles, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/common/Button';
import { COLORS, ROUNDING, SHADOWS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { aiService, recordService } from '../../services/api';

// Maximum number of /ai/status polls before giving up and proceeding anyway
const MAX_POLL_ATTEMPTS = 30; // 30 × 3s = 90 seconds max wait
const POLL_INTERVAL_MS = 3000;

export default function UploadScreen() {
  const { user } = useAuth();
  const [file, setFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [detectedTitle, setDetectedTitle] = useState<string | null>(null);
  const [aiStatusText, setAiStatusText] = useState('Analyzing with Medora AI...');
  const router = useRouter();

  // Folder State
  const [folders, setFolders] = useState<any[]>([]);
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Polling ref so we can cancel on unmount
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user) {
      recordService.getUserFolders().then(setFolders);
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [user]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });

      if (!result.canceled) {
        setFile(result.assets[0]);
        setStatus('idle');
        setDetectedTitle(null);
      }
    } catch (err) {
      console.error('Pick file error', err);
    }
  };

  /**
   * Polls /ai/status/:jobId until the job is completed/failed or we hit MAX_POLL_ATTEMPTS.
   * Returns the final AI summary data object, or null if unavailable.
   */
  const pollJobUntilDone = (jobId: string): Promise<any | null> => {
    return new Promise((resolve) => {
      let attempts = 0;

      const doPoll = async () => {
        try {
          attempts++;
          const statusRes = await aiService.getJobStatus(jobId);
          console.log(`[Poll attempt ${attempts}] state:`, statusRes.state);

          if (statusRes.state === 'completed') {
            setAiStatusText('AI analysis complete!');
            resolve(statusRes.data ?? null);
            return;
          }

          if (statusRes.state === 'failed') {
            console.warn('[Poll] AI job failed:', statusRes.error);
            setAiStatusText('AI analysis unavailable for this file.');
            resolve(null);
            return;
          }

          if (attempts >= MAX_POLL_ATTEMPTS) {
            console.warn('[Poll] Reached max attempts, giving up.');
            setAiStatusText('AI is still processing — check back soon.');
            resolve(null);
            return;
          }

          // still pending/processing — update status text and reschedule
          setAiStatusText(
            statusRes.state === 'processing'
              ? 'Extracting medical data...'
              : 'Queued for AI analysis...'
          );
          pollTimerRef.current = setTimeout(doPoll, POLL_INTERVAL_MS);
        } catch (err) {
          console.error('[Poll] Error checking AI status:', err);
          if (attempts >= MAX_POLL_ATTEMPTS) {
            resolve(null);
          } else {
            pollTimerRef.current = setTimeout(doPoll, POLL_INTERVAL_MS);
          }
        }
      };

      doPoll();
    });
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    if (isNewFolder) {
      if (!newFolderName.trim()) {
        Alert.alert('Error', 'Please enter a folder name.');
        return;
      }
      const existingFolder = folders.find(
        (f) => f.name.toLowerCase() === newFolderName.trim().toLowerCase()
      );
      if (existingFolder) {
        Alert.alert(
          'Folder Exists',
          `A folder named "${existingFolder.name}" already exists. Please select it from the existing folders or choose a different name.`
        );
        return;
      }
    } else if (!selectedFolderId) {
      Alert.alert('Error', 'Please select an existing folder or create a new one.');
      return;
    }

    setIsUploading(true);
    setStatus('idle');
    setErrorMessage('');
    setUploadProgress(0.1);

    try {
      // ── Step 1: Create folder if needed ──────────────────────────
      let finalFolderId = selectedFolderId;
      if (isNewFolder) {
        const folderResponse = await recordService.createFolder(newFolderName);
        finalFolderId = folderResponse.folder?.id || folderResponse.id;
        if (!finalFolderId) throw new Error('Failed to create folder');
      }
      setUploadProgress(0.2);

      // ── Step 2: Upload the record to /records/upload ──────────────
      const uploadFormData = new FormData();
      // @ts-ignore — React Native FormData accepts this shape
      uploadFormData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      });
      if (finalFolderId) {
        uploadFormData.append('folder_id', finalFolderId);
      }
      uploadFormData.append('visit_date', new Date().toISOString());
      uploadFormData.append('record_name', file.name);

      console.log('[Upload] Sending record to backend...');
      const uploadResponse = await recordService.uploadRecord(uploadFormData);
      console.log('[Upload] Response:', JSON.stringify(uploadResponse));
      setUploadProgress(0.5);
      setIsUploading(false);

      // ── Step 3: Send file to /ai/summarize to get a jobId ─────────
      // The backend also queues AI internally after /records/upload,
      // but calling /ai/summarize gives us a jobId we can poll in real-time.
      setIsProcessingAI(true);
      setAiStatusText('Sending to Medora AI...');
      setUploadProgress(0.6);

      const aiFormData = new FormData();
      // @ts-ignore
      aiFormData.append('documents', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      });

      let jobId: string | null = null;
      try {
        const aiResponse = await recordService.summarize(aiFormData);
        console.log('[AI Summarize] Response:', JSON.stringify(aiResponse));

        // Response: { success: true, data: [{ fileName, success, jobId }] }
        if (aiResponse?.data?.[0]?.jobId) {
          jobId = aiResponse.data[0].jobId;
        } else if (aiResponse?.data?.[0]?.fromCache) {
          // Cache hit — summary already available; no polling needed
          setAiStatusText('AI analysis complete (from cache)!');
          setDetectedTitle(aiResponse.data[0]?.reports?.[0] || file.name);
          setUploadProgress(1);
          setIsProcessingAI(false);
          setStatus('success');
          setTimeout(() => router.replace('/(tabs)/records'), 2000);
          return;
        }
      } catch (aiErr: any) {
        console.warn('[AI Summarize] Failed to get jobId:', aiErr?.message);
        // Non-fatal: backend already queued the job internally via /records/upload
      }

      // ── Step 4: Poll for completion ───────────────────────────────
      if (jobId) {
        setUploadProgress(0.7);
        await pollJobUntilDone(jobId);
      } else {
        setAiStatusText('AI is processing in the background...');
      }

      setUploadProgress(1);
      setIsProcessingAI(false);
      setStatus('success');
      setDetectedTitle(file.name);

      setTimeout(() => router.replace('/(tabs)/records'), 2000);
    } catch (err: any) {
      console.error('Upload error', err);
      let errorMsg = 'Upload Failed. Try again.';
      if (err.response?.data?.error || err.response?.data?.message) {
        errorMsg = err.response?.data?.error || err.response?.data?.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setErrorMessage(errorMsg);
      setStatus('error');
      setIsUploading(false);
      setIsProcessingAI(false);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Add New Record</Text>
            <Text style={styles.subtitle}>Upload your medical reports or prescriptions</Text>
          </View>

          <TouchableOpacity
            style={[styles.dropZone, file && styles.dropZoneActive]}
            onPress={handlePickFile}
            disabled={isUploading || isProcessingAI}
          >
            {file ? (
              <View style={styles.fileInfo}>
                <FileUp size={32} color={COLORS.primary} />
                <Text style={styles.fileName}>{file.name}</Text>
                <Text style={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</Text>
                {!isUploading && !isProcessingAI && (
                  <TouchableOpacity onPress={() => setFile(null)} style={styles.removeBtn}>
                    <X size={20} color={COLORS.text.secondary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.emptyDropZone}>
                <View style={styles.iconCircle}>
                  <FileUp size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.dropZoneTitle}>Tap to select a file</Text>
                <Text style={styles.dropZoneSubtitle}>PDF or Images up to 10MB</Text>
              </View>
            )}
          </TouchableOpacity>

          {!isUploading && !isProcessingAI && status !== 'success' && (
            <View style={styles.folderSection}>
              <Text style={styles.sectionLabel}>Save to Folder</Text>
              <View style={styles.folderChoiceRow}>
                <TouchableOpacity
                  style={[styles.folderChoice, !isNewFolder && styles.folderChoiceActive]}
                  onPress={() => setIsNewFolder(false)}
                >
                  <Folder size={20} color={!isNewFolder ? COLORS.primary : COLORS.text.secondary} />
                  <Text style={[styles.folderChoiceText, !isNewFolder && styles.folderChoiceTextActive]}>Existing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.folderChoice, isNewFolder && styles.folderChoiceActive]}
                  onPress={() => setIsNewFolder(true)}
                >
                  <FolderPlus size={20} color={isNewFolder ? COLORS.primary : COLORS.text.secondary} />
                  <Text style={[styles.folderChoiceText, isNewFolder && styles.folderChoiceTextActive]}>New Folder</Text>
                </TouchableOpacity>
              </View>

              {isNewFolder ? (
                <TextInput
                  style={styles.textInput}
                  placeholder="Folder Name (e.g., Blood Reports)"
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  placeholderTextColor={COLORS.text.secondary}
                />
              ) : (
                <View style={styles.foldersList}>
                  {folders.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.foldersScroll}>
                      {folders.map((f) => (
                        <TouchableOpacity
                          key={f.id}
                          style={[styles.folderTag, selectedFolderId === f.id && styles.folderTagActive]}
                          onPress={() => setSelectedFolderId(f.id)}
                        >
                          <Text style={[styles.folderTagText, selectedFolderId === f.id && styles.folderTagTextActive]}>
                            {f.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noFoldersText}>No folders yet. Create a new one!</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Progress bar — shown during upload and AI processing */}
          {(isUploading || isProcessingAI) && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
              </View>
              <View style={styles.progressLabelRow}>
                {isProcessingAI && <Sparkles size={14} color={COLORS.primary} />}
                {isUploading && <Clock size={14} color={COLORS.primary} />}
                <Text style={styles.progressText}>
                  {isUploading
                    ? `Uploading... ${Math.round(uploadProgress * 100)}%`
                    : aiStatusText}
                </Text>
              </View>
            </View>
          )}

          {status === 'success' && (
            <View style={styles.successBox}>
              <CheckCircle2 size={32} color={COLORS.success} />
              <Text style={styles.successTitle}>Upload Complete!</Text>
              <View style={styles.detectedNameCard}>
                <Sparkles size={20} color={COLORS.primary} />
                <Text style={styles.detectedNameText}>{detectedTitle || 'Medical Record'}</Text>
              </View>
              <Text style={styles.successSubtitle}>AI summary will appear shortly in your records.</Text>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.statusBox}>
              <AlertCircle size={24} color={COLORS.error} />
              <Text style={[styles.statusText, { color: COLORS.error, flexShrink: 1 }]}>
                {errorMessage || 'Upload Failed. Try again.'}
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Button
              title={isUploading ? 'Uploading...' : isProcessingAI ? 'Analyzing...' : 'Upload & Analyze'}
              onPress={handleUpload}
              isLoading={isUploading || isProcessingAI}
              disabled={
                !file ||
                status === 'success' ||
                isProcessingAI ||
                (isNewFolder ? !newFolderName.trim() : !selectedFolderId)
              }
              style={styles.uploadBtn}
            />
            {!isUploading && !isProcessingAI && (
              <Button title="Cancel" onPress={() => router.back()} variant="ghost" />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  dropZone: {
    height: 200,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: ROUNDING.xl,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    ...SHADOWS.soft,
  },
  dropZoneActive: {
    borderColor: COLORS.primary,
    borderStyle: 'solid',
    backgroundColor: COLORS.primary + '05',
  },
  emptyDropZone: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: ROUNDING.full,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  dropZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  dropZoneSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  fileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.full,
    padding: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  folderSection: {
    marginTop: SPACING.xl,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  folderChoiceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  folderChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  folderChoiceActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  folderChoiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  folderChoiceTextActive: {
    color: COLORS.primary,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: 16,
    fontSize: 15,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  foldersList: {
    minHeight: 44,
  },
  foldersScroll: {
    gap: 8,
  },
  folderTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  folderTagActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  folderTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  folderTagTextActive: {
    color: COLORS.white,
  },
  noFoldersText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: ROUNDING.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBox: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.xl,
    ...SHADOWS.soft,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.success,
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  detectedNameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: ROUNDING.lg,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  detectedNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  uploadBtn: {
    height: 56,
    borderRadius: ROUNDING.lg,
  },
});
