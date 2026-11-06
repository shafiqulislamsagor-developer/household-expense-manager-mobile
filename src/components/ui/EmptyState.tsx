import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionTitle?: string;
  onActionPress?: () => void;
  style?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'receipt-outline',
  title,
  description,
  actionTitle,
  onActionPress,
  style,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderColor: isDark ? colors.borderStrong : colors.border,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isDark ? `${colors.primary}25` : `${colors.primary}12`,
          },
        ]}
      >
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>

      <BengaliText
        variant="h3"
        color={colors.text}
        align="center"
        weight="700"
        style={styles.title}
      >
        {title}
      </BengaliText>

      {description && (
        <BengaliText
          variant="body"
          color={colors.textMuted}
          align="center"
          style={styles.description}
        >
          {description}
        </BengaliText>
      )}

      {actionTitle && onActionPress && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onActionPress}
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <BengaliText variant="bodyBold" color="#FFFFFF">
            {actionTitle}
          </BengaliText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 28,
    borderRadius: 18,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    marginBottom: 6,
    fontSize: 16,
  },
  description: {
    lineHeight: 21,
    marginBottom: 18,
    maxWidth: 280,
    fontSize: 13,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 6,
  },
});
