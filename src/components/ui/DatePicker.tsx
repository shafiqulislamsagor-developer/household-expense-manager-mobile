import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

export interface DatePickerProps {
  label?: string;
  value: string; // ISO date string e.g. "2026-11-06T10:00:00.000Z" or "2026-11-06"
  onChangeDate: (dateIso: string) => void;
  required?: boolean;
}

const BENGALI_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

export const DatePicker: React.FC<DatePickerProps> = ({
  label = 'তারিখ',
  value,
  onChangeDate,
  required = false,
}) => {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const currentDate = value ? new Date(value) : new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const day = currentDate.getDate();

  const formattedBengaliDate = `${MoneyUtil.toBengaliNumber(day)} ${
    BENGALI_MONTHS[month]
  } ${MoneyUtil.toBengaliNumber(year)}`;

  const setPreset = (type: 'TODAY' | 'YESTERDAY' | 'MONTH_START') => {
    const d = new Date();
    if (type === 'YESTERDAY') {
      d.setDate(d.getDate() - 1);
    } else if (type === 'MONTH_START') {
      d.setDate(1);
    }
    onChangeDate(d.toISOString());
    setModalVisible(false);
  };

  const adjustDay = (amount: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + amount);
    onChangeDate(d.toISOString());
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

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: isDark ? colors.surface : colors.surface,
            borderColor: isDark ? colors.borderStrong : colors.border,
          },
        ]}
      >
        <View style={styles.leftContent}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark ? `${colors.primary}25` : `${colors.primary}12`,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </View>
          <BengaliText variant="bodyBold" color={colors.text}>
            {formattedBengaliDate}
          </BengaliText>
        </View>

        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Date Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                borderColor: isDark ? colors.borderStrong : colors.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <BengaliText variant="h3" color={colors.text}>
                তারিখ নির্বাচন করুন
              </BengaliText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                onPress={() => setPreset('TODAY')}
                style={[styles.presetBtn, { backgroundColor: colors.accentLight }]}
              >
                <BengaliText variant="caption" color={colors.accent} weight="700">
                  আজ
                </BengaliText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPreset('YESTERDAY')}
                style={[styles.presetBtn, { backgroundColor: colors.primaryLight }]}
              >
                <BengaliText variant="caption" color={colors.primary} weight="700">
                  গতকাল
                </BengaliText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPreset('MONTH_START')}
                style={[styles.presetBtn, { backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight }]}
              >
                <BengaliText variant="caption" color={colors.textSecondary} weight="700">
                  মাসের প্রথম দিন
                </BengaliText>
              </TouchableOpacity>
            </View>

            {/* Day Adjuster */}
            <View
              style={[
                styles.adjusterBox,
                {
                  backgroundColor: isDark ? colors.surfaceSubdued : colors.backgroundSecondary,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => adjustDay(-1)}
                style={[styles.adjustBtn, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }]}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
                <BengaliText variant="caption" color={colors.text} style={{ marginLeft: 4 }}>
                  পূর্বের দিন
                </BengaliText>
              </TouchableOpacity>

              <View style={styles.currentDateDisplay}>
                <BengaliText variant="h3" color={colors.primary} align="center">
                  {MoneyUtil.toBengaliNumber(day)}
                </BengaliText>
                <BengaliText variant="caption" color={colors.textMuted} align="center">
                  {BENGALI_MONTHS[month]} {MoneyUtil.toBengaliNumber(year)}
                </BengaliText>
              </View>

              <TouchableOpacity
                onPress={() => adjustDay(1)}
                style={[styles.adjustBtn, { backgroundColor: isDark ? colors.surface : '#FFFFFF' }]}
              >
                <BengaliText variant="caption" color={colors.text} style={{ marginRight: 4 }}>
                  পরের দিন
                </BengaliText>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            >
              <BengaliText variant="bodyBold" color="#FFFFFF" align="center">
                নিশ্চিত করুন
              </BengaliText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  adjusterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    elevation: 1,
  },
  currentDateDisplay: {
    alignItems: 'center',
  },
  confirmBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
});
