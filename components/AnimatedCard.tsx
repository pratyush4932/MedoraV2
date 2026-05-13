import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { COLORS, ROUNDING } from '../constants/theme';

interface AnimatedCardProps {
  icon: LucideIcon;
  iconSize?: number;
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  iconBoxStyle?: StyleProp<ViewStyle>;
  iconColor?: string;
  fillColor?: string;
  borderRadius?: number;
  iconBoxChildren?: React.ReactNode;
}

export function AnimatedCard({
  icon: Icon,
  iconSize = 24,
  children,
  onPress,
  style,
  iconBoxStyle,
  iconColor = COLORS.primary,
  fillColor = COLORS.primary,
  borderRadius = ROUNDING.lg,
  iconBoxChildren
}: AnimatedCardProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(pressed.value ? 0.98 : 1, { damping: 10, stiffness: 200 }) },
        { translateY: withSpring(pressed.value ? 2 : 0) }
      ],
      backgroundColor: withTiming(pressed.value ? COLORS.primary + '05' : COLORS.white),
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(pressed.value ? 0.05 : 0),
    };
  });

  const iconAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(pressed.value ? 1.1 : 1) }],
    };
  });

  const tap = Gesture.Tap()
    .onBegin(() => {
      pressed.value = 1;
    })
    .onFinalize(() => {
      pressed.value = 0;
    })
    .onEnd(() => {
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[styles.card, style, animatedStyle, { borderRadius }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: fillColor,
              borderRadius: borderRadius,
            },
            overlayStyle
          ]}
        />
        {Icon && (
          <View style={[iconBoxStyle, { position: 'relative' }]}>
            <Animated.View style={[{ width: iconSize, height: iconSize }, iconAnimStyle]}>
              <Icon size={iconSize} color={iconColor} />
            </Animated.View>
            {iconBoxChildren}
          </View>
        )}
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

export default AnimatedCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  }
});
