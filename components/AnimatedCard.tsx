import React, { useState } from 'react';
import { View, Pressable, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
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
  fillColor = COLORS.success,
  borderRadius = ROUNDING.lg,
  iconBoxChildren
}: AnimatedCardProps) {
  const [animation] = useState(new Animated.Value(0));

  const handleIn = () => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const handleOut = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable 
      style={style}
      onPress={onPress}
      onHoverIn={handleIn}
      onHoverOut={handleOut}
      onPressIn={handleIn}
      onPressOut={handleOut}
    >
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { 
            backgroundColor: fillColor + '15', 
            borderRadius: borderRadius,
            opacity: animation 
          }
        ]} 
      />
      <View style={[iconBoxStyle, { position: 'relative' }]}>
        <View style={{ width: iconSize, height: iconSize }}>
          <Icon size={iconSize} color={iconColor} />
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: animation }]}>
            <Icon size={iconSize} color={fillColor} fill={fillColor} />
          </Animated.View>
        </View>
        {iconBoxChildren}
      </View>
      {children}
    </Pressable>
  );
}
