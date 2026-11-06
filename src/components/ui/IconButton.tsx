import React, { useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  ViewStyle,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'tint' | 'solid' | 'outline';
  color?: string;
  badge?: number | string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  color,
  badge,
  disabled = false,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const iconColor = color || (variant === 'solid' ? '#FFFFFF' : colors.text);

  const sizeMetrics = {
    sm: { buttonSize: 32, iconSize: 18, borderRadius: 8 },
    md: { buttonSize: 42, iconSize: 22, borderRadius: 12 },
    lg: { buttonSize: 48, iconSize: 26, borderRadius: 14 },
  }[size];

  const getBackgroundColor = () => {
    if (variant === 'solid') return color || colors.primary;
    if (variant === 'tint') return isDark ? `${iconColor}22` : `${iconColor}14`;
    if (variant === 'outline') return isDark ? colors.surface : '#FFFFFF';
    return 'transparent';
  };

  const getBorderColor = () => {
    if (variant === 'outline') return isDark ? colors.borderStrong : colors.border;
    return 'transparent';
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.button,
          {
            width: sizeMetrics.buttonSize,
            height: sizeMetrics.buttonSize,
            borderRadius: sizeMetrics.borderRadius,
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: variant === 'outline' ? 1.5 : 0,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}
      >
        <Ionicons name={icon} size={sizeMetrics.iconSize} color={iconColor} />

        {badge !== undefined && (
          <View style={[styles.badge, { backgroundColor: colors.danger }]}>
            <BengaliText
              variant="caption"
              color="#FFFFFF"
              style={styles.badgeText}
            >
              {badge}
            </BengaliText>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
  },
});
