import React from 'react';
import { View, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';

export interface ToggleProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => !disabled && onValueChange(!value)}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderColor: isDark ? colors.borderStrong : colors.border,
        },
      ]}
    >
      <View style={styles.textContainer}>
        <BengaliText variant="bodyBold" color={colors.text}>
          {label}
        </BengaliText>
        {subtitle ? (
          <BengaliText variant="caption" color={colors.textMuted} style={styles.subtitle}>
            {subtitle}
          </BengaliText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.2,
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
});
