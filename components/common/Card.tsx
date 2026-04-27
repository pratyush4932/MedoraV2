import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, ROUNDING, SHADOWS, SPACING } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'white' | 'neutral';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'white' }) => {
  return (
    <View
      style={[
        styles.card,
        variant === 'neutral' ? styles.neutral : styles.white,
        SHADOWS.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: ROUNDING.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  white: {
    backgroundColor: COLORS.white,
  },
  neutral: {
    backgroundColor: COLORS.background,
  },
});
