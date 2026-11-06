import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  required?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  helperText,
  icon,
  rightIcon,
  onRightIconPress,
  required = false,
  clearable = false,
  onClear,
  style,
  value,
  onChangeText,
  secureTextEntry,
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = secureTextEntry !== undefined;

  const handleClear = () => {
    if (onChangeText) onChangeText('');
    if (onClear) onClear();
  };

  const getBorderColor = () => {
    if (error) return colors.danger;
    if (isFocused) return colors.primary;
    return isDark ? colors.borderStrong : colors.border;
  };

  const getBackgroundColor = () => {
    if (isDark) return colors.surface;
    return colors.surface;
  };

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <BengaliText variant="h4" color={isDark ? colors.textSecondary : colors.secondary} style={styles.label}>
            {label}
          </BengaliText>
          {required && (
            <BengaliText variant="h4" color={colors.danger} style={styles.requiredStar}>
              *
            </BengaliText>
          )}
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
          },
          isFocused && styles.inputFocused,
          error ? { backgroundColor: isDark ? '#3B1515' : '#FEF2F2' } : null,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? colors.danger : isFocused ? colors.primary : colors.textMuted}
            style={styles.leftIcon}
          />
        )}

        <RNTextInput
          style={[
            styles.input,
            {
              color: colors.text,
            },
            style,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textLight}
          secureTextEntry={isPassword ? !isPasswordVisible : false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={colors.primary}
          {...props}
        />

        {clearable && value ? (
          <TouchableOpacity onPress={handleClear} style={styles.iconButton}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.iconButton}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.iconButton}
          >
            <Ionicons name={rightIcon} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.feedbackRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} style={{ marginRight: 4 }} />
          <BengaliText variant="caption" color={colors.danger} style={styles.feedbackText}>
            {error}
          </BengaliText>
        </View>
      ) : helperText ? (
        <BengaliText variant="caption" color={colors.textMuted} style={styles.helperText}>
          {helperText}
        </BengaliText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  requiredStar: {
    marginLeft: 3,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputFocused: {
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  iconButton: {
    padding: 6,
    marginLeft: 4,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '500',
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
  },
});
