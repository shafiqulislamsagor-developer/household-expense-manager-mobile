import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { MoneyUtil } from '../../utils/money';
import { useTheme } from '../../theme/ThemeContext';

export interface AmountInputProps {
  label?: string;
  value: string; // Taka string e.g. "500"
  onChangeTaka: (val: string) => void;
  error?: string | null;
  placeholder?: string;
  required?: boolean;
  presets?: number[]; // Taka presets, default [100, 500, 1000, 2000, 5000]
  showPresets?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  label = 'টাকার পরিমাণ',
  value,
  onChangeTaka,
  error,
  placeholder = '0.00',
  required = true,
  presets = [100, 500, 1000, 2000, 5000],
  showPresets = true,
}) => {
  const { colors, isDark } = useTheme();

  // Convert Bengali digits to English if typed in Bengali
  const handleTextChange = (text: string) => {
    const bengaliMap: Record<string, string> = {
      '০': '0',
      '১': '1',
      '২': '2',
      '৩': '3',
      '৪': '4',
      '৫': '5',
      '৬': '6',
      '৭': '7',
      '৮': '8',
      '৯': '9',
    };
    let sanitized = '';
    for (const char of text) {
      if (bengaliMap[char] !== undefined) {
        sanitized += bengaliMap[char];
      } else if ((char >= '0' && char <= '9') || char === '.') {
        sanitized += char;
      }
    }

    // prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    onChangeTaka(sanitized);
  };

  const handleAddPreset = (taka: number) => {
    const currentNum = parseFloat(value) || 0;
    const newTotal = currentNum + taka;
    onChangeTaka(String(newTotal));
  };

  const handleClear = () => {
    onChangeTaka('');
  };

  const numericVal = parseFloat(value);
  const isValidAmount = !isNaN(numericVal) && numericVal > 0;
  const paisa = isValidAmount ? MoneyUtil.takaToPaisa(numericVal) : 0;

  return (
    <View style={styles.container}>
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

      <View
        style={[
          styles.inputCard,
          {
            backgroundColor: isDark ? colors.surface : colors.surface,
            borderColor: error ? colors.danger : isValidAmount ? colors.accent : isDark ? colors.borderStrong : colors.border,
          },
        ]}
      >
        <View style={styles.amountRow}>
          <View
            style={[
              styles.currencyBadge,
              {
                backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}14`,
                borderColor: `${colors.accent}30`,
              },
            ]}
          >
            <BengaliText
              variant="h2"
              color={colors.accent}
              style={styles.currencySymbol}
            >
              ৳
            </BengaliText>
          </View>

          <RNTextInput
            style={[
              styles.input,
              {
                color: colors.text,
              },
            ]}
            value={value}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
            selectionColor={colors.accent}
          />

          {value ? (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Live Bengali Currency Preview */}
        {isValidAmount ? (
          <View
            style={[
              styles.previewRow,
              {
                borderTopColor: isDark ? colors.borderLight : colors.borderLight,
              },
            ]}
          >
            <BengaliText variant="caption" color={colors.textMuted}>
              হিসাবে জমা হবে:
            </BengaliText>
            <BengaliText
              variant="bodyBold"
              color={colors.accent}
              style={styles.previewAmount}
            >
              {MoneyUtil.formatBengaliCurrency(paisa)}
            </BengaliText>
          </View>
        ) : null}
      </View>

      {/* Preset Amount Chips */}
      {showPresets && (
        <View style={styles.presetContainer}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset}
              activeOpacity={0.7}
              onPress={() => handleAddPreset(preset)}
              style={[
                styles.presetChip,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.secondaryLight,
                  borderColor: isDark ? colors.borderStrong : colors.border,
                },
              ]}
            >
              <BengaliText
                variant="caption"
                color={colors.textSecondary}
                style={styles.presetText}
              >
                +৳{MoneyUtil.toBengaliNumber(preset)}
              </BengaliText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} style={{ marginRight: 4 }} />
          <BengaliText variant="caption" color={colors.danger}>
            {error}
          </BengaliText>
        </View>
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
  inputCard: {
    borderWidth: 1.6,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  currencyBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  clearBtn: {
    padding: 6,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  previewAmount: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  presetChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
});
