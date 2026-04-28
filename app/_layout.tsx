import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { BackHandler, View, Image, ActivityIndicator, Animated } from 'react-native';
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!fontsLoaded || isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [fontsLoaded, isLoading, scaleAnim]);

  useEffect(() => {
    if (!fontsLoaded || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    console.log('Auth State Check:', { hasUser: !!user, inAuthGroup, segments });

    if (!user && !inAuthGroup) {
      console.log('User not found, redirecting to login');
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      console.log('User found in auth group, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

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

  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFA' }}>
        <Animated.Image 
          source={require('../assets/images/logo.png')} 
          style={{ width: 120, height: 120, borderRadius: 24, transform: [{ scale: scaleAnim }] }} 
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
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
