import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../src/store';
import { Header } from '../src/components/Header';
import { BengaliText } from '../src/components/BengaliText';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { EmptyState } from '../src/components/ui/EmptyState';
import { BottomSheet } from '../src/components/ui/BottomSheet';
import { AmountInput } from '../src/components/ui/AmountInput';
import { TextInput } from '../src/components/ui/TextInput';
import { ApiClient } from '../src/services/apiClient';
import { MoneyUtil } from '../src/utils/money';
import { useTheme } from '../src/theme/ThemeContext';
import { useToast } from '../src/context/ToastContext';

interface MemberProfile {
  _id: string;
  name: string;
  phone: string;
  role: string;
  relationship?: string;
  occupation?: string;
  incomeStatus?: string;
  monthlyIncomePaisa?: number;
  financialResponsibility?: string;
  sponsorUserId?: { _id: string; name: string } | null;
  defaultRoomName?: string;
  defaultRoomRentPaisa?: number;
  participatesInSharedGroceries?: boolean;
  participatesInSharedUtilities?: boolean;
}

const RELATIONSHIPS = [
  { value: 'FATHER', label: 'বাবা' },
  { value: 'MOTHER', label: 'মা' },
  { value: 'SON', label: 'ছেলে' },
  { value: 'DAUGHTER', label: 'মেয়ে' },
  { value: 'HUSBAND', label: 'স্বামী' },
  { value: 'WIFE', label: 'স্ত্রী' },
  { value: 'BROTHER', label: 'ভাই' },
  { value: 'SISTER', label: 'বোন' },
  { value: 'GRANDFATHER', label: 'দাদা / নানা' },
  { value: 'GRANDMOTHER', label: 'দাদী / নানী' },
  { value: 'ROOMMATE', label: 'রুমমেট' },
  { value: 'OTHER', label: 'অন্যান্য' },
];

const INCOME_STATUSES = [
  { value: 'EARNING', label: 'উপার্জনক্ষম', desc: 'নিজে আয় করেন' },
  { value: 'STUDENT', label: 'শিক্ষার্থী / ছাত্র', desc: 'পড়াশোনা করছেন' },
  { value: 'UNEMPLOYED', label: 'গৃহিণী / বেকার', desc: 'বর্তমানে আয় নেই' },
  { value: 'RETIRED', label: 'অবসরপ্রাপ্ত', desc: 'বয়স্ক বা পেনশনার' },
  { value: 'OTHER', label: 'অন্যান্য', desc: 'অন্যান্য অবস্থা' },
];

const RESPONSIBILITIES = [
  { value: 'FAMILY_HEAD', label: 'পরিবার প্রধান', desc: 'বেশিরভাগ খরচের দায়িত্ব নেন' },
  { value: 'SHARED', label: 'সমান বা আংশিক অংশীদার', desc: 'অন্যদের সাথে ব্যয় ভাগাভাগি' },
  { value: 'SPONSORED', label: 'অন্য সদস্য কর্তৃক স্পনসরড', desc: 'অন্য কেউ খরচ পরিশোধ করবেন' },
  { value: 'SELF', label: 'শুধুমাত্র নিজের খরচ', desc: 'মেস বা রুমমেট মডেল' },
  { value: 'EXEMPT', label: 'অব্যাহতিপ্রাপ্ত', desc: 'কোনো খরচ দিতে হবে না' },
];

export default function FamilyMembersScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'HOME_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<MemberProfile[]>([]);

  // Add Member Modal State
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberPass, setNewMemberPass] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'HOME_USER' | 'HOME_ADMIN'>('HOME_USER');
  const [newMemberRel, setNewMemberRel] = useState('OTHER');
  const [isSubmittingNewMember, setIsSubmittingNewMember] = useState(false);

  // Edit Modal
  const [editModal, setEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [relationship, setRelationship] = useState('OTHER');
  const [incomeStatus, setIncomeStatus] = useState('EARNING');
  const [financialResponsibility, setFinancialResponsibility] = useState('SHARED');
  const [occupation, setOccupation] = useState('');
  const [monthlyIncomeTaka, setMonthlyIncomeTaka] = useState('');
  const [sponsorId, setSponsorId] = useState('');
  const [participatesGroceries, setParticipatesGroceries] = useState(true);
  const [participatesUtilities, setParticipatesUtilities] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.listMemberProfiles();
      if (res?.success && Array.isArray(res.data)) {
        setMembers(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'সদস্য তালিকা লোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberPhone.trim() || !newMemberPass.trim()) {
      showToast({ type: 'error', message: 'সকল প্রয়োজনীয় তথ্য পূরণ করুন।' });
      return;
    }

    if (newMemberPass.trim().length < 6) {
      showToast({ type: 'error', message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
      return;
    }

    setIsSubmittingNewMember(true);
    try {
      await ApiClient.addMember({
        name: newMemberName.trim(),
        phone: newMemberPhone.trim(),
        password: newMemberPass.trim(),
        role: newMemberRole,
        relationship: newMemberRel,
      } as any);

      showToast({
        type: 'success',
        message: `নতুন সদস্য ${newMemberName} সফলভাবে যুক্ত করা হয়েছে।`,
      });

      setAddMemberModal(false);
      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberPass('');
      setNewMemberRole('HOME_USER');
      setNewMemberRel('OTHER');

      await loadData();
    } catch (err: any) {
      showToast({
        type: 'error',
        message: err.message || 'সদস্য যুক্ত করা যায়নি।',
      });
    } finally {
      setIsSubmittingNewMember(false);
    }
  };

  const handleOpenEdit = (member: MemberProfile) => {
    setSelectedMember(member);
    setRelationship(member.relationship || 'OTHER');
    setIncomeStatus(member.incomeStatus || 'EARNING');
    setFinancialResponsibility(member.financialResponsibility || 'SHARED');
    setOccupation(member.occupation || '');
    setMonthlyIncomeTaka(
      member.monthlyIncomePaisa ? MoneyUtil.paisaToTaka(member.monthlyIncomePaisa).toString() : ''
    );
    setSponsorId(member.sponsorUserId?._id || '');
    setParticipatesGroceries(member.participatesInSharedGroceries !== false);
    setParticipatesUtilities(member.participatesInSharedUtilities !== false);
    setEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedMember) return;
    try {
      setIsSubmitting(true);
      const incTaka = parseFloat(monthlyIncomeTaka);
      const payload: any = {
        relationship,
        incomeStatus,
        financialResponsibility,
        occupation: occupation.trim() || undefined,
        monthlyIncomePaisa: !isNaN(incTaka) && incTaka >= 0 ? MoneyUtil.takaToPaisa(incTaka) : 0,
        sponsorUserId: sponsorId || null,
        participatesInSharedGroceries: participatesGroceries,
        participatesInSharedUtilities: participatesUtilities,
      };

      const res = await ApiClient.updateMemberProfile(selectedMember._id, payload);
      if (res?.success) {
        showToast('সদস্য প্রোফাইল আপডেট করা হয়েছে', 'success');
        setEditModal(false);
        loadData();
      } else {
        showToast(res?.message || 'আপডেট সম্পন্ন হয়নি', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'আপডেট সম্পন্ন হয়নি', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="সদস্য প্রোফাইল ও ভূমিকা"
        subtitle="সম্পর্ক, উপার্জন ও আর্থিক দায়িত্ব কনফিগারেশন"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <BengaliText style={[styles.infoTitle, { color: colors.text }]}>
              বাস্তব পারিবারিক দায়িত্ব ও স্পনসরশিপ
            </BengaliText>
            <BengaliText style={[styles.infoDesc, { color: colors.textMuted }]}>
              ছাত্র, অপ্রাপ্তবয়স্ক বা অবসরপ্রাপ্ত সদস্যদের ব্যয় অন্য উপার্জনক্ষম সদস্য (যেমন: বাবা) স্পনসর করতে পারেন। এতে তাদের ওপর কোনো অযাচিত বকেয়া তৈরি হয় না।
            </BengaliText>
          </View>
        </View>

        {isAdmin && (
          <PrimaryButton
            title="নতুন পরিবার সদস্য যুক্ত করুন"
            icon="person-add-outline"
            onPress={() => setAddMemberModal(true)}
            style={{ marginBottom: 16 }}
          />
        )}

        <SectionHeader title="পরিবারের সকল সদস্য" count={members.length} />

        {members.map((member) => {
          const relLabel = RELATIONSHIPS.find((r) => r.value === member.relationship)?.label || 'সদস্য';
          const incLabel = INCOME_STATUSES.find((i) => i.value === member.incomeStatus)?.label || 'অন্যান্য';
          const respLabel = RESPONSIBILITIES.find((r) => r.value === member.financialResponsibility)?.label || 'অংশীদার';

          return (
            <View
              key={member._id}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.personRow}>
                  <View style={[styles.avatar, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="person" size={20} color={colors.primary} />
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <BengaliText style={[styles.cardTitle, { color: colors.text }]}>
                      {member.name}
                    </BengaliText>
                    <BengaliText style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      {member.phone} • {member.occupation || 'পেশা নির্ধারিত নেই'}
                    </BengaliText>
                  </View>
                </View>

                {isAdmin && (
                  <TouchableOpacity
                    style={[styles.editBtn, { borderColor: colors.border }]}
                    onPress={() => handleOpenEdit(member)}
                  >
                    <Ionicons name="settings-outline" size={16} color={colors.primary} />
                    <BengaliText style={[styles.editBtnText, { color: colors.primary }]}>
                      কনফিগার
                    </BengaliText>
                  </TouchableOpacity>
                )}
              </View>

              {/* Badges */}
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: '#3B82F618' }]}>
                  <BengaliText style={[styles.badgeText, { color: '#2563EB' }]}>
                    সম্পর্ক: {relLabel}
                  </BengaliText>
                </View>

                <View style={[styles.badge, { backgroundColor: member.incomeStatus === 'EARNING' ? '#10B98118' : '#F59E0B18' }]}>
                  <BengaliText style={[styles.badgeText, { color: member.incomeStatus === 'EARNING' ? '#059669' : '#D97706' }]}>
                    {incLabel}
                  </BengaliText>
                </View>

                <View style={[styles.badge, { backgroundColor: colors.primary + '14' }]}>
                  <BengaliText style={[styles.badgeText, { color: colors.primary }]}>
                    {respLabel}
                  </BengaliText>
                </View>
              </View>

              {/* Extra Details */}
              <View style={styles.detailList}>
                {member.sponsorUserId && (
                  <View style={styles.detailRow}>
                    <Ionicons name="shield-outline" size={14} color="#059669" />
                    <BengaliText style={[styles.detailText, { color: colors.text }]}>
                      স্পনসর করছেন: {member.sponsorUserId.name}
                    </BengaliText>
                  </View>
                )}

                {member.defaultRoomName && (
                  <View style={styles.detailRow}>
                    <Ionicons name="home-outline" size={14} color="#3B82F6" />
                    <BengaliText style={[styles.detailText, { color: colors.text }]}>
                      রুম: {member.defaultRoomName} (ভাড়া: {MoneyUtil.formatBengaliCurrency(member.defaultRoomRentPaisa || 0)})
                    </BengaliText>
                  </View>
                )}

                {member.monthlyIncomePaisa ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={14} color="#10B981" />
                    <BengaliText style={[styles.detailText, { color: colors.text }]}>
                      মাসিক আনুমানিক আয়: {MoneyUtil.formatBengaliCurrency(member.monthlyIncomePaisa)}
                    </BengaliText>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* EDIT MEMBER MODAL */}
      <BottomSheet
        visible={editModal}
        onClose={() => setEditModal(false)}
        title={`${selectedMember?.name} এর প্রোফাইল কনফিগারেশন`}
      >
        <ScrollView style={{ maxHeight: 520 }}>
          {/* Relationship */}
          <BengaliText style={[styles.label, { color: colors.text }]}>পরিবারে সম্পর্ক *</BengaliText>
          <View style={styles.pillContainer}>
            {RELATIONSHIPS.map((r) => {
              const isSelected = relationship === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setRelationship(r.value)}
                >
                  <BengaliText style={[styles.pillText, { color: isSelected ? '#FFF' : colors.text }]}>
                    {r.label}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Income Status */}
          <BengaliText style={[styles.label, { color: colors.text }]}>আয়ের বর্তমান অবস্থা *</BengaliText>
          <View style={styles.pillContainer}>
            {INCOME_STATUSES.map((i) => {
              const isSelected = incomeStatus === i.value;
              return (
                <TouchableOpacity
                  key={i.value}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setIncomeStatus(i.value)}
                >
                  <BengaliText style={[styles.pillText, { color: isSelected ? '#FFF' : colors.text }]}>
                    {i.label}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Financial Responsibility */}
          <BengaliText style={[styles.label, { color: colors.text }]}>আর্থিক দায়িত্ব ও খরচের বণ্টন *</BengaliText>
          <View style={styles.pillContainer}>
            {RESPONSIBILITIES.map((resp) => {
              const isSelected = financialResponsibility === resp.value;
              return (
                <TouchableOpacity
                  key={resp.value}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFinancialResponsibility(resp.value)}
                >
                  <BengaliText style={[styles.pillText, { color: isSelected ? '#FFF' : colors.text }]}>
                    {resp.label}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sponsor Picker (shown if SPONSORED or EXEMPT or STUDENT/RETIRED) */}
          <BengaliText style={[styles.label, { color: colors.text }]}>ব্যয়ের স্পনসর (কে খরচ বহন করবেন?)</BengaliText>
          <View style={styles.pillContainer}>
            <TouchableOpacity
              style={[
                styles.pill,
                {
                  backgroundColor: !sponsorId ? colors.primary : colors.surface,
                  borderColor: !sponsorId ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSponsorId('')}
            >
              <BengaliText style={[styles.pillText, { color: !sponsorId ? '#FFF' : colors.text }]}>
                কোনো স্পনসর নেই (নিজে বহন করবেন)
              </BengaliText>
            </TouchableOpacity>

            {members
              .filter((m) => m._id !== selectedMember?._id)
              .map((m) => {
                const isSelected = sponsorId === m._id;
                return (
                  <TouchableOpacity
                    key={m._id}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSponsorId(m._id)}
                  >
                    <BengaliText style={[styles.pillText, { color: isSelected ? '#FFF' : colors.text }]}>
                      {m.name}
                    </BengaliText>
                  </TouchableOpacity>
                );
              })}
          </View>

          <TextInput
            label="পেশা (ঐচ্ছিক)"
            value={occupation}
            onChangeText={setOccupation}
            placeholder="যেমন: সফটওয়্যার ইঞ্জিনিয়ার / ছাত্র"
          />

          <AmountInput
            label="মাসিক আনুমানিক আয় (টাকা, ঐচ্ছিক)"
            value={monthlyIncomeTaka}
            onChangeTaka={setMonthlyIncomeTaka}
            placeholder="0.00"
          />

          <PrimaryButton
            title="কনফিগারেশন সংরক্ষণ করুন"
            onPress={handleSaveProfile}
            loading={isSubmitting}
            style={{ marginTop: 16, marginBottom: 24 }}
          />
        </ScrollView>
      </BottomSheet>

      {/* Add New Member Bottom Sheet */}
      <BottomSheet
        visible={addMemberModal}
        title="নতুন পরিবার সদস্য যুক্ত করুন"
        subtitle="সদস্যের নাম, ফোন নম্বর ও প্রাথমিক পাসওয়ার্ড প্রদান করুন"
        onClose={() => setAddMemberModal(false)}
      >
        <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
          <TextInput
            label="সদস্যের নাম"
            placeholder="যেমন: মোঃ তানভীর রহমান"
            value={newMemberName}
            onChangeText={setNewMemberName}
            icon="person-outline"
            required
          />

          <TextInput
            label="ফোন নম্বর (লগইন আইডি)"
            placeholder="০১৭১১XXXXXX"
            value={newMemberPhone}
            onChangeText={setNewMemberPhone}
            keyboardType="phone-pad"
            icon="call-outline"
            required
          />

          <TextInput
            label="প্রাথমিক পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
            placeholder="পাসওয়ার্ড প্রদান করুন"
            value={newMemberPass}
            onChangeText={setNewMemberPass}
            secureTextEntry
            icon="lock-closed-outline"
            required
          />

          <BengaliText style={styles.label}>ভূমিকা (Role)</BengaliText>
          <View style={styles.pillContainer}>
            <TouchableOpacity
              style={[
                styles.pill,
                {
                  backgroundColor: newMemberRole === 'HOME_USER' ? colors.primary : colors.surface,
                  borderColor: newMemberRole === 'HOME_USER' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setNewMemberRole('HOME_USER')}
            >
              <BengaliText
                style={[
                  styles.pillText,
                  { color: newMemberRole === 'HOME_USER' ? '#FFF' : colors.text },
                ]}
              >
                সাধারণ সদস্য (Member)
              </BengaliText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pill,
                {
                  backgroundColor: newMemberRole === 'HOME_ADMIN' ? colors.primary : colors.surface,
                  borderColor: newMemberRole === 'HOME_ADMIN' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setNewMemberRole('HOME_ADMIN')}
            >
              <BengaliText
                style={[
                  styles.pillText,
                  { color: newMemberRole === 'HOME_ADMIN' ? '#FFF' : colors.text },
                ]}
              >
                পরিবার অ্যাডমিন (Admin)
              </BengaliText>
            </TouchableOpacity>
          </View>

          <BengaliText style={styles.label}>সম্পর্ক (Relationship)</BengaliText>
          <View style={styles.pillContainer}>
            {RELATIONSHIPS.map((r) => {
              const isSelected = newMemberRel === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNewMemberRel(r.value)}
                >
                  <BengaliText
                    style={[styles.pillText, { color: isSelected ? '#FFF' : colors.text }]}
                  >
                    {r.label}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton
            title="সদস্য অ্যাকাউন্ট তৈরি করুন"
            onPress={handleAddMember}
            loading={isSubmittingNewMember}
            icon="person-add-outline"
            size="lg"
            style={{ marginTop: 16, marginBottom: 24 }}
          />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailList: {
    marginTop: 10,
    gap: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
