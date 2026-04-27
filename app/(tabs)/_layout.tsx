import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Home, Plus, Hospital } from 'lucide-react-native';
import { COLORS, SHADOWS, ROUNDING } from '../../constants/theme';
import { Platform, View, TouchableOpacity, StyleSheet, Text } from 'react-native';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 94 : 80,
          paddingBottom: Platform.OS === 'ios' ? 30 : 15,
          paddingTop: 12,
          backgroundColor: COLORS.white,
          elevation: 20,
          ...SHADOWS.medium,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Home size={24} color={color} fill={focused ? color : 'none'} />
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="upload_dummy"
        options={{
          title: 'Upload',
          tabBarButton: () => (
            <TouchableOpacity 
              style={styles.uploadBtnContainer}
              onPress={() => router.push('/upload')}
              activeOpacity={0.9}
            >
              <View style={styles.uploadBtn}>
                <Plus size={32} color={COLORS.white} strokeWidth={3} />
              </View>
              <Text style={styles.uploadLabel}>Upload</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="records"
        options={{
          title: 'Hospital',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Hospital size={24} color={color} fill={focused ? color : 'none'} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide settings from nav as per mockup
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 64,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  activeIconWrapper: {
    backgroundColor: '#E6F4F4', // Light teal background for active state
  },
  uploadBtnContainer: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  uploadBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    ...SHADOWS.medium,
    marginBottom: 4,
  },
  uploadLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },
});
