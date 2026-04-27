import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle2, FileUp, Folder, FolderPlus, Sparkles, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { COLORS, ROUNDING, SHADOWS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { recordService } from '../../services/api';

export default function UploadScreen() {
  const { user } = useAuth();
  const [file, setFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [detectedTitle, setDetectedTitle] = useState<string | null>(null);
  const router = useRouter();

  // Folder State
  const [folders, setFolders] = useState<any[]>([]);
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      recordService.getUserFolders().then(setFolders);
    }
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

  const handleUpload = async () => {
    if (!file || !user) return;

    if (isNewFolder) {
      if (!newFolderName.trim()) {
        Alert.alert('Error', 'Please enter a folder name.');
        return;
      }
      const existingFolder = folders.find(f => f.name.toLowerCase() === newFolderName.trim().toLowerCase());
      if (existingFolder) {
        Alert.alert('Folder Exists', `A folder named "${existingFolder.name}" already exists. Please select it from the existing folders or choose a different name.`);
        return;
      }
    } else if (!selectedFolderId) {
      Alert.alert('Error', 'Please select an existing folder or create a new one.');
      return;
    }

    setIsUploading(true);
    setStatus('idle');
    setErrorMessage('');
    setUploadProgress(0.2);

    try {
      let finalFolderId = selectedFolderId;

      if (isNewFolder) {
        const folderResponse = await recordService.createFolder(newFolderName);
        finalFolderId = folderResponse.folder?.id || folderResponse.id;
        if (!finalFolderId) throw new Error('Failed to create folder');
      }

      // Prepare Upload Data
      const uploadFormData = new FormData();
      // @ts-ignore
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

      console.log("[Upload] Sending record to backend...");
      
      setStatus('idle');
      setIsUploading(true);
      setUploadProgress(0.5);

      const response = await recordService.uploadRecord(uploadFormData);
      console.log('[Upload] Response:', JSON.stringify(response));

      setUploadProgress(1);
      setIsUploading(false);
      setStatus('success');
      setDetectedTitle(file.name);

      setTimeout(() => {
        router.replace('/(tabs)/records');
      }, 2000);

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
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
                    {folders.map(f => (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.folderTag, selectedFolderId === f.id && styles.folderTagActive]}
                        onPress={() => setSelectedFolderId(f.id)}
                      >
                        <Text style={[styles.folderTagText, selectedFolderId === f.id && styles.folderTagTextActive]}>{f.name}</Text>
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

        {(isUploading || isProcessingAI) && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {isUploading ? `Uploading... ${Math.round(uploadProgress * 100)}%` : 'Analyzing with Medora AI...'}
            </Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.successBox}>
            <CheckCircle2 size={32} color={COLORS.success} />
            <Text style={styles.successTitle}>Analysis Complete!</Text>
            <View style={styles.detectedNameCard}>
              <Sparkles size={20} color={COLORS.primary} />
              <Text style={styles.detectedNameText}>{detectedTitle || 'Medical Record'}</Text>
            </View>
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
            title={isProcessingAI ? "Analyzing..." : "Upload & Analyze"}
            onPress={handleUpload}
            isLoading={isUploading || isProcessingAI}
            disabled={!file || status === 'success' || isProcessingAI || (isNewFolder ? !newFolderName.trim() : !selectedFolderId)}
            style={styles.uploadBtn}
          />
          {!isUploading && !isProcessingAI && (
            <Button
              title="Cancel"
              onPress={() => router.back()}
              variant="ghost"
            />
          )}
        </View>
      </ScrollView>
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
  progressText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: SPACING.sm,
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
