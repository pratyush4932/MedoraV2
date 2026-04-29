import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState, useEffect, useRef } from 'react';
import { BackHandler, View, Image, ActivityIndicator, Animated, Text } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { COLORS, SHADOWS } from '../constants/theme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  const [minTimePassed, setMinTimePassed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 4000); // Reduced slightly for better feel
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      // Hide splash screen as soon as we are ready to show our custom animation
      SplashScreen.hideAsync();
      
      // Parallel animation for a premium entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Unified text fade in
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fontsLoaded]);

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
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: COLORS.background 
      }}>
        <Animated.View style={{ 
          alignItems: 'center', 
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim }
          ]
        }}>
          <View style={{
            marginBottom: 24,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Image 
              source={require('../assets/images/logo.png')} 
              style={{ 
                width: 160, 
                height: 160, 
              }} 
              resizeMode="contain"
            />
          </View>
          
          <Animated.View style={{ 
            alignItems: 'center',
            opacity: textFadeAnim,
          }}>
            <Text style={{ 
              fontSize: 48, 
              fontWeight: '900', 
              color: COLORS.primary,
              letterSpacing: -1
            }}>
              Medora
            </Text>
          </Animated.View>

          <ActivityIndicator 
            size="small" 
            color={COLORS.primary} 
            style={{ marginTop: 60, opacity: 0.3 }} 
          />
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

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    // SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootLayoutNav fontsLoaded={loaded} />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
