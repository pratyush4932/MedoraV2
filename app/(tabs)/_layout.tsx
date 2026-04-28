import React, { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Home, Plus, Hospital, FolderOpen, QrCode } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../../constants/theme';
import { Platform, View, TouchableOpacity, StyleSheet, Text, Animated, Easing } from 'react-native';

export default function TabLayout() {
  const router = useRouter();
  
  // Floating animation setup
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startFloating = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -6,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startFloating();
  }, []);

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
          fontSize: 10,
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
              <Home size={22} color={color} fill={focused ? color : 'none'} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="qr"
        options={{
          title: 'QR Share',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <QrCode size={22} color={color} fill={focused ? color : 'none'} />
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
              <Animated.View style={[
                styles.uploadBtn,
                { transform: [{ translateY }] }
              ]}>
                <Plus size={32} color={COLORS.white} strokeWidth={3} />
              </Animated.View>
              <Text style={styles.uploadLabel}>Upload</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <FolderOpen size={22} color={color} fill={focused ? color : 'none'} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="hospitals"
        options={{
          title: 'Facility',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIconWrapper]}>
              <Hospital size={22} color={color} fill={focused ? color : 'none'} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  activeIconWrapper: {
    backgroundColor: '#E6F4F4',
  },
  uploadBtnContainer: {
    top: -24,
    left: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
  },
  uploadBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    ...SHADOWS.medium,
    marginBottom: 4,
  },
  uploadLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 2,
  },
});
