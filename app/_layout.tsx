import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState, useEffect, useRef } from 'react';
import { BackHandler, View, Image, ActivityIndicator, Animated, Text } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  const [minTimePassed, setMinTimePassed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!fontsLoaded || isLoading || !minTimePassed) {
      // Pulsate scale animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Fade in and slide up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fontsLoaded, isLoading, minTimePassed]);

  useEffect(() => {
    if (!fontsLoaded || isLoading || !minTimePassed) return;

    const inAuthGroup = segments[0] === '(auth)';
    console.log('Auth State Check:', { hasUser: !!user, inAuthGroup, segments });

    if (!user && !inAuthGroup) {
      console.log('User not found, redirecting to login');
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      console.log('User found in auth group, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, fontsLoaded, minTimePassed]);

  useEffect(() => {
    if (fontsLoaded && !isLoading && minTimePassed) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading, minTimePassed]);

  useEffect(() => {
    const backAction = () => {
      if (!router.canGoBack()) {
        return false;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  if (!fontsLoaded || isLoading || !minTimePassed) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <Animated.View style={{ 
          alignItems: 'center', 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          <Animated.Image 
            source={require('../assets/images/logo.png')} 
            style={{ 
              width: 140, 
              height: 140, 
              borderRadius: 32, 
              transform: [{ scale: scaleAnim }] 
            }} 
            resizeMode="contain"
          />
          <Animated.Text style={{ 
            marginTop: 20, 
            fontSize: 32, 
            fontWeight: '800', 
            color: COLORS.primary,
            letterSpacing: 2,
            textTransform: 'uppercase'
          }}>
            Medora
          </Animated.Text>
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 40 }} />
        </Animated.View>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="upload/index" options={{ presentation: 'modal', title: 'Upload Record', headerTintColor: COLORS.primary }} />
      <Stack.Screen name="folder/[name]" options={{ headerShown: false }} />
      <Stack.Screen name="facility/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="facility/[id]/[date]" options={{ headerShown: false }} />
      <Stack.Screen name="summary/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    // SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootLayoutNav fontsLoaded={loaded} />
      </ThemeProvider>
    </AuthProvider>
  );
}
