import React from 'react';
import { View, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { useTheme } from '../../theme/ThemeContext';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmTitle?: string;
  cancelTitle?: string;
  isDestructive?: boolean;
  confirmVariant?: 'primary' | 'accent' | 'danger' | 'dark';
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmTitle = 'হ্যাঁ, নিশ্চিত করুন',
  cancelTitle = 'বাতিল',
  isDestructive = false,
  confirmVariant,
  loading = false,
  icon,
  onConfirm,
  onCancel,
}) => {
  const { colors, isDark } = useTheme();

  const variant = confirmVariant || (isDestructive ? 'danger' : 'primary');
  const iconName = icon || (isDestructive ? 'trash-outline' : 'help-circle-outline');
  const iconColor = isDestructive ? colors.danger : colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark ? `${iconColor}25` : `${iconColor}14`,
              },
            ]}
          >
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>

          <BengaliText
            variant="h2"
            color={colors.text}
            align="center"
            weight="700"
            style={styles.title}
          >
            {title}
          </BengaliText>

          <BengaliText
            variant="body"
            color={colors.textMuted}
            align="center"
            style={styles.message}
          >
            {message}
          </BengaliText>

          <View style={styles.buttonRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <SecondaryButton
                title={cancelTitle}
                onPress={onCancel}
                disabled={loading}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <PrimaryButton
                title={confirmTitle}
                onPress={onConfirm}
                variant={variant}
                loading={loading}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 9,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    fontSize: 18,
  },
  message: {
    lineHeight: 21,
    marginBottom: 24,
    fontSize: 13.5,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
  },
});
