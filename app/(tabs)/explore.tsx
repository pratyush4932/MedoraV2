import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Shield, CircleHelp, LogOut, ChevronRight } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDING, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const SettingItem = ({ icon, title, subtitle, onPress, destructive = false }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBox, destructive && { backgroundColor: COLORS.error + '10' }]}>
        {icon}
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, destructive && { color: COLORS.error }]}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
      {!destructive && <ChevronRight size={20} color={COLORS.text.secondary} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'P'}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name || 'Patient'}</Text>
            <Text style={styles.profilePhone}>{user?.phone}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.sectionContent}>
            <SettingItem 
              icon={<Bell size={20} color={COLORS.primary} />} 
              title="Notifications" 
              subtitle="Alerts for reports & summaries" 
            />
            <SettingItem 
              icon={<Shield size={20} color={COLORS.primary} />} 
              title="Privacy & Security" 
              subtitle="Manage your encryption keys" 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingItem 
              icon={<CircleHelp size={20} color={COLORS.secondary} />} 
              title="Help Center" 
            />
          </View>
        </View>

        <View style={[styles.section, { marginTop: SPACING.xl }]}>
          <SettingItem 
            icon={<LogOut size={20} color={COLORS.error} />} 
            title="Sign Out" 
            onPress={signOut}
            destructive
          />
        </View>

        <Text style={styles.version}>Medora v1.0.0</Text>
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
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: ROUNDING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.soft,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: ROUNDING.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  profilePhone: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  sectionContent: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: ROUNDING.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  itemSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
});
