import React, { useRef } from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';

export interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'outline' | 'ghost' | 'tint';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  color?: string;
  fullWidth?: boolean;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  variant = 'outline',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  color,
  fullWidth = true,
}) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const activeColor = color || colors.primary;

  const getBackgroundColor = () => {
    if (disabled) return 'transparent';
    if (variant === 'tint') return isDark ? `${activeColor}20` : `${activeColor}12`;
    if (variant === 'ghost') return 'transparent';
    return isDark ? colors.surface : colors.surface;
  };

  const getBorderColor = () => {
    if (disabled) return colors.border;
    if (variant === 'outline') return isDark ? colors.borderStrong : colors.border;
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled) return colors.textLight;
    return activeColor;
  };

  const sizeStyles = {
    sm: { paddingVertical: 7, paddingHorizontal: 12, minHeight: 36, borderRadius: 10, fontSize: 13 },
    md: { paddingVertical: 11, paddingHorizontal: 16, minHeight: 46, borderRadius: 12, fontSize: 14.5 },
    lg: { paddingVertical: 14, paddingHorizontal: 20, minHeight: 52, borderRadius: 14, fontSize: 16 },
  }[size];

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && styles.fullWidth,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: variant === 'outline' ? 1.5 : 0,
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            minHeight: sizeStyles.minHeight,
            borderRadius: sizeStyles.borderRadius,
          },
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={getTextColor()} />
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={size === 'sm' ? 16 : 19}
                color={getTextColor()}
                style={styles.iconLeft}
              />
            )}
            <BengaliText
              variant="bodyBold"
              color={getTextColor()}
              numberOfLines={1}
              style={[
                styles.text,
                { fontSize: sizeStyles.fontSize },
                textStyle,
              ]}
            >
              {title}
            </BengaliText>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    letterSpacing: 0.2,
  },
  iconLeft: {
    marginRight: 8,
  },
});
