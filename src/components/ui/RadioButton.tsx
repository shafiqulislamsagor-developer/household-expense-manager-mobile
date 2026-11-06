import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';

export interface RadioButtonProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  description?: string;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  label,
  selected,
  onSelect,
  description,
  disabled = false,
  color,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const activeColor = color || colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onSelect}
      disabled={disabled}
      style={[
        styles.container,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View
        style={[
          styles.outerCircle,
          {
            borderColor: selected ? activeColor : colors.borderStrong,
            backgroundColor: selected ? (isDark ? '#0F294220' : '#EBF5FF') : 'transparent',
          },
        ]}
      >
        {selected && (
          <View
            style={[
              styles.innerDot,
              { backgroundColor: activeColor },
            ]}
          />
        )}
      </View>

      <View style={styles.textContainer}>
        <BengaliText
          variant="body"
          weight={selected ? '600' : '400'}
          color={disabled ? colors.textLight : colors.text}
        >
          {label}
        </BengaliText>
        {description && (
          <BengaliText
            variant="caption"
            color={colors.textMuted}
            style={styles.description}
          >
            {description}
          </BengaliText>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  outerCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textContainer: {
    flex: 1,
  },
  description: {
    marginTop: 2,
  },
});
