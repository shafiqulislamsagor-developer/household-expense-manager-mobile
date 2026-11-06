import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string | number;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  title,
  subtitle,
  onClose,
  children,
  maxHeight = '88%',
}) => {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                borderColor: isDark ? colors.borderStrong : colors.border,
                maxHeight: maxHeight as any,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Draggable Drag Pill Indicator */}
            <View style={styles.dragPillWrapper}>
              <View
                style={[
                  styles.dragPill,
                  {
                    backgroundColor: isDark ? '#475569' : '#CBD5E1',
                  },
                ]}
              />
            </View>

            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  borderBottomColor: isDark ? colors.borderLight : colors.borderLight,
                },
              ]}
            >
              <View style={styles.titleArea}>
                <BengaliText
                  variant="h2"
                  color={colors.text}
                  weight="700"
                  style={styles.title}
                >
                  {title}
                </BengaliText>
                {subtitle && (
                  <BengaliText
                    variant="caption"
                    color={colors.textMuted}
                    style={styles.subtitle}
                  >
                    {subtitle}
                  </BengaliText>
                )}
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight,
                  },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Content Body */}
            <View style={styles.body}>{children}</View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  dragPillWrapper: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragPill: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
  },
  subtitle: {
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
  },
});
