import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BengaliText } from '../../src/components/BengaliText';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { TextInput } from '../../src/components/ui/TextInput';
import { SearchInput } from '../../src/components/ui/SearchInput';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { FinancialSummaryCard } from '../../src/components/ui/FinancialSummaryCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { CardSkeleton } from '../../src/components/ui/LoadingSkeleton';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { ProfileAvatar } from '../../src/components/ui/ProfileAvatar';
import { ApiClient } from '../../src/services/apiClient';
import { MoneyUtil } from '../../src/utils/money';
import { logout } from '../../src/store/authSlice';
import { AuthStorage } from '../../src/services/authStorage';
import { useTheme } from '../../src/theme/ThemeContext';
import { useToast } from '../../src/context/ToastContext';

export default function SuperAdminScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [households, setHouseholds] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tabs: 'HOUSEHOLDS' | 'USERS' | 'HEALTH'
  const [activeTab, setActiveTab] = useState<'HOUSEHOLDS' | 'USERS' | 'HEALTH'>('HOUSEHOLDS');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal 1: Create Household
  const [householdModal, setHouseholdModal] = useState(false);
  const [hhName, setHhName] = useState('');
  const [hhCode, setHhCode] = useState('');
  const [hhAddress, setHhAddress] = useState('');
  const [isSubmittingHh, setIsSubmittingHh] = useState(false);

  // Modal 2: Edit Household
  const [editHhModal, setEditHhModal] = useState(false);
  const [editingHhId, setEditingHhId] = useState('');
  const [editHhName, setEditHhName] = useState('');
  const [editHhCode, setEditHhCode] = useState('');
  const [editHhAddress, setEditHhAddress] = useState('');
  const [editHhStatus, setEditHhStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isSubmittingEditHh, setIsSubmittingEditHh] = useState(false);

  // Modal 3: Create Admin
  const [adminModal, setAdminModal] = useState(false);
  const [selectedHhId, setSelectedHhId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Modal 4: Edit User
  const [editUserModal, setEditUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState<'HOME_ADMIN' | 'HOME_USER'>('HOME_USER');
  const [editUserHhId, setEditUserHhId] = useState('');
  const [isSubmittingEditUser, setIsSubmittingEditUser] = useState(false);

  // Modal 5: Reset Password
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Logout Confirm Modal
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [hhRes, userRes] = await Promise.all([
        ApiClient.listHouseholds(),
        ApiClient.listAllUsers(),
      ]);
      if (hhRes?.success && Array.isArray(hhRes.data)) setHouseholds(hhRes.data);
      if (userRes?.success && Array.isArray(userRes.data)) setUsers(userRes.data);
    } catch (err: any) {
      console.error('Super admin load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else showToast({ type: 'info', message: `ফোন নম্বর: ${phoneNumber}` });
      })
      .catch(() => {
        showToast({ type: 'error', message: 'কল চালু করা যায়নি।' });
      });
  };

  // 1. Create Household
  const handleCreateHousehold = async () => {
    if (!hhName.trim() || !hhCode.trim()) {
      showToast({ type: 'error', message: 'পরিবারের নাম এবং কোড দিন।' });
      return;
    }

    setIsSubmittingHh(true);
    try {
      await ApiClient.createHousehold({
        name: hhName.trim(),
        code: hhCode.trim().toUpperCase(),
        address: hhAddress.trim(),
      });

      showToast({ type: 'success', message: 'নতুন পরিবার সফলভাবে তৈরি হয়েছে।' });
      setHouseholdModal(false);
      setHhName('');
      setHhCode('');
      setHhAddress('');
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'তৈরি করা যায়নি।' });
    } finally {
      setIsSubmittingHh(false);
    }
  };

  // 2. Edit Household
  const openEditHouseholdModal = (hh: any) => {
    setEditingHhId(hh._id);
    setEditHhName(hh.name || '');
    setEditHhCode(hh.code || '');
    setEditHhAddress(hh.address || '');
    setEditHhStatus(hh.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
    setEditHhModal(true);
  };

  const handleSaveEditHousehold = async () => {
    if (!editHhName.trim() || !editHhCode.trim()) {
      showToast({ type: 'error', message: 'পরিবারের নাম এবং কোড আবশ্যক।' });
      return;
    }

    setIsSubmittingEditHh(true);
    try {
      await ApiClient.updateHousehold(editingHhId, {
        name: editHhName.trim(),
        code: editHhCode.trim().toUpperCase(),
        address: editHhAddress.trim(),
        status: editHhStatus,
      });

      showToast({ type: 'success', message: 'পরিবারের তথ্য সফলভাবে আপডেট হয়েছে।' });
      setEditHhModal(false);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'আপডেট করা যায়নি।' });
    } finally {
      setIsSubmittingEditHh(false);
    }
  };

  // 3. Create Household Admin
  const handleCreateAdmin = async () => {
    if (!selectedHhId || !adminName.trim() || !adminPhone.trim() || !adminPass.trim()) {
      showToast({ type: 'error', message: 'পরিবার নির্বাচন করুন এবং সকল তথ্য পূরণ করুন।' });
      return;
    }

    setIsSubmittingAdmin(true);
    try {
      await ApiClient.createHouseholdAdmin({
        householdId: selectedHhId,
        name: adminName.trim(),
        phone: adminPhone.trim(),
        password: adminPass.trim(),
      });

      showToast({ type: 'success', message: 'পরিবার অ্যাডমিন একাউন্ট সফলভাবে তৈরি হয়েছে।' });
      setAdminModal(false);
      setSelectedHhId('');
      setAdminName('');
      setAdminPhone('');
      setAdminPass('');
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'অ্যাডমিন তৈরি করা যায়নি।' });
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  // 4. Edit User
  const openEditUserModal = (u: any) => {
    setEditingUserId(u._id);
    setEditUserName(u.name || '');
    setEditUserPhone(u.phone || '');
    setEditUserRole(u.role === 'HOME_ADMIN' ? 'HOME_ADMIN' : 'HOME_USER');
    setEditUserHhId(u.householdId?._id || u.householdId || '');
    setEditUserModal(true);
  };

  const handleSaveEditUser = async () => {
    if (!editUserName.trim() || !editUserPhone.trim()) {
      showToast({ type: 'error', message: 'নাম এবং ফোন নম্বর আবশ্যক।' });
      return;
    }

    setIsSubmittingEditUser(true);
    try {
      await ApiClient.updateUser(editingUserId, {
        name: editUserName.trim(),
        phone: editUserPhone.trim(),
        role: editUserRole,
        householdId: editUserHhId || null,
      });

      showToast({ type: 'success', message: 'ব্যবহারকারীর তথ্য সফলভাবে আপডেট হয়েছে।' });
      setEditUserModal(false);
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'ব্যবহারকারী আপডেট করা যায়নি।' });
    } finally {
      setIsSubmittingEditUser(false);
    }
  };

  // 5. Reset Password
  const openPasswordModal = (u: any) => {
    setPasswordTargetUser(u);
    setNewPassword('');
    setPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      showToast({ type: 'error', message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await ApiClient.resetUserPassword(passwordTargetUser._id, newPassword.trim());
      showToast({
        type: 'success',
        message: `"${passwordTargetUser.name}"-এর নতুন পাসওয়ার্ড সেট করা হয়েছে।`,
      });
      setPasswordModal(false);
      setNewPassword('');
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'পাসওয়ার্ড পরিবর্তন করা যায়নি।' });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Toggle User Status
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean, userName: string) => {
    try {
      await ApiClient.toggleUserStatus(userId);
      showToast({
        type: 'success',
        message: `"${userName}"-এর একাউন্ট ${currentStatus ? 'ব্লক' : 'সক্রিয়'} করা হয়েছে।`,
      });
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'স্ট্যাটাস পরিবর্তন করা যায়নি।' });
    }
  };

  // Toggle Household Status
  const handleToggleHouseholdStatus = async (hhId: string, currentStatus: string, hhName: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await ApiClient.updateHouseholdStatus(hhId, newStatus);
      showToast({
        type: 'success',
        message: `"${hhName}" পরিবারটি ${newStatus === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`,
      });
      await loadData();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'পরিবারের অবস্থা পরিবর্তন করা যায়নি।' });
    }
  };

  const handleLogout = async () => {
    await AuthStorage.clearTokens();
    dispatch(logout());
    router.replace('/login');
  };

  // Filtered lists
  const filteredHouseholds = useMemo(() => {
    return households.filter((h) => {
      if (filterStatus !== 'ALL' && h.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = h.name.toLowerCase().includes(q);
        const matchCode = h.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [households, filterStatus, searchQuery]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filterStatus === 'ACTIVE' && !u.isActive) return false;
      if (filterStatus === 'INACTIVE' && u.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.name.toLowerCase().includes(q);
        const matchPhone = u.phone.includes(q);
        if (!matchName && !matchPhone) return false;
      }
      return true;
    });
  }, [users, filterStatus, searchQuery]);

  const activeHhCount = households.filter((h) => h.status === 'ACTIVE').length;
  const activeUserCount = users.filter((u) => u.isActive).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Super Admin Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.surface : colors.surface,
            borderBottomColor: isDark ? colors.borderStrong : colors.border,
            paddingTop: Math.max(insets.top, 24) + 8,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
            <BengaliText variant="h2" color={colors.text} weight="700">
              সুপার অ্যাডমিন কনসোল
            </BengaliText>
            <BengaliText variant="caption" color={colors.textMuted}>
              প্ল্যাটফর্ম পরিচালনা ও সার্বিক নিয়ন্ত্রণ
            </BengaliText>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerIconBtn}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={isDark ? '#FBBF24' : colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setLogoutModalVisible(true)} style={styles.headerIconBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 60 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Platform Overview Metrics */}
        <FinancialSummaryCard
          title="সিস্টেম সার্বিক স্থিতি"
          amountPaisa={0}
          customValue={`${MoneyUtil.toBengaliNumber(households.length)} টি পরিবার • ${MoneyUtil.toBengaliNumber(users.length)} জন ইউজার`}
          subtitle={`সক্রিয় পরিবার: ${MoneyUtil.toBengaliNumber(activeHhCount)} • সক্রিয় ইউজার: ${MoneyUtil.toBengaliNumber(activeUserCount)}`}
          icon="shield-checkmark"
          variant="hero"
        />

        <View style={styles.gridRow}>
          <FinancialSummaryCard
            title="মোট পরিবার"
            amountPaisa={0}
            customValue={`${MoneyUtil.toBengaliNumber(households.length)} টি`}
            subtitle={`চালু: ${MoneyUtil.toBengaliNumber(activeHhCount)} টি`}
            icon="home"
            variant="income"
            style={{ flex: 1, marginRight: 6 }}
          />
          <FinancialSummaryCard
            title="মোট ব্যবহারকারী"
            amountPaisa={0}
            customValue={`${MoneyUtil.toBengaliNumber(users.length)} জন`}
            subtitle={`চালু: ${MoneyUtil.toBengaliNumber(activeUserCount)} জন`}
            icon="people"
            variant="balance"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.topActionsRow}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <PrimaryButton
              title="নতুন পরিবার তৈরি"
              onPress={() => setHouseholdModal(true)}
              icon="add-circle"
              size="sm"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <PrimaryButton
              title="অ্যাডমিন তৈরি করুন"
              onPress={() => setAdminModal(true)}
              icon="person-add"
              variant="dark"
              size="sm"
            />
          </View>
        </View>

        {/* Segment Tabs */}
        <View
          style={[
            styles.segmentContainer,
            {
              backgroundColor: isDark ? colors.surface : colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('HOUSEHOLDS')}
            style={[
              styles.segmentBtn,
              activeTab === 'HOUSEHOLDS' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
            ]}
          >
            <BengaliText
              variant="caption"
              color={activeTab === 'HOUSEHOLDS' ? '#FFFFFF' : colors.textSecondary}
              weight="700"
            >
              পরিবারসমূহ ({MoneyUtil.toBengaliNumber(households.length)})
            </BengaliText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('USERS')}
            style={[
              styles.segmentBtn,
              activeTab === 'USERS' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
            ]}
          >
            <BengaliText
              variant="caption"
              color={activeTab === 'USERS' ? '#FFFFFF' : colors.textSecondary}
              weight="700"
            >
              ব্যবহারকারীগণ ({MoneyUtil.toBengaliNumber(users.length)})
            </BengaliText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('HEALTH')}
            style={[
              styles.segmentBtn,
              activeTab === 'HEALTH' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
            ]}
          >
            <BengaliText
              variant="caption"
              color={activeTab === 'HEALTH' ? '#FFFFFF' : colors.textSecondary}
              weight="700"
            >
              সিস্টেম স্বাস্থ্য
            </BengaliText>
          </TouchableOpacity>
        </View>

        {/* Search Input for Households and Users */}
        {activeTab !== 'HEALTH' && (
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={
              activeTab === 'HOUSEHOLDS'
                ? 'পরিবারের নাম বা কোড দিয়ে খুঁজুন...'
                : 'ব্যবহারকারীর নাম বা ফোন নম্বর দিয়ে খুঁজুন...'
            }
            style={{ marginBottom: 12 }}
          />
        )}

        {/* Status Filter Chips */}
        {activeTab !== 'HEALTH' && (
          <View style={styles.statusChipsRow}>
            {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
              <TouchableOpacity
                key={st}
                onPress={() => setFilterStatus(st)}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor:
                      filterStatus === st
                        ? colors.primary
                        : isDark ? colors.surfaceSubdued : colors.secondaryLight,
                    borderColor:
                      filterStatus === st
                        ? colors.primary
                        : isDark ? colors.borderStrong : colors.border,
                  },
                ]}
              >
                <BengaliText
                  variant="caption"
                  color={filterStatus === st ? '#FFFFFF' : colors.textSecondary}
                  weight="700"
                >
                  {st === 'ALL' ? 'সকল' : st === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </BengaliText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading ? (
          <View style={{ gap: 10 }}>
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : activeTab === 'HOUSEHOLDS' ? (
          /* ==================== TAB 1: HOUSEHOLDS ==================== */
          <View>
            <SectionHeader
              title="পরিবারের তালিকা"
              count={filteredHouseholds.length}
            />

            {filteredHouseholds.length === 0 ? (
              <EmptyState
                icon="home-outline"
                title="কোনো পরিবার পাওয়া যায়নি"
                description="আপনার ফিল্টারে কোনো পরিবারের রেকর্ড নেই।"
                actionTitle="নতুন পরিবার তৈরি করুন"
                onActionPress={() => setHouseholdModal(true)}
              />
            ) : (
              filteredHouseholds.map((hh) => {
                const isActive = hh.status === 'ACTIVE';
                const adminName = hh.adminUserId?.name || 'অ্যাসাইন করা হয়নি';

                return (
                  <View
                    key={hh._id}
                    style={[
                      styles.cardItem,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surface,
                        borderColor: isDark ? colors.borderStrong : colors.border,
                        borderLeftColor: isActive ? colors.accent : colors.danger,
                      },
                    ]}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <BengaliText variant="h3" color={colors.text} weight="700">
                          {hh.name}
                        </BengaliText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <View
                            style={[
                              styles.codeBadge,
                              { backgroundColor: isDark ? colors.surfaceSubdued : colors.primaryLight },
                            ]}
                          >
                            <BengaliText variant="caption" color={colors.primary} weight="700">
                              কোড: {hh.code}
                            </BengaliText>
                          </View>
                          {hh.address ? (
                            <BengaliText variant="caption" color={colors.textMuted} style={{ marginLeft: 8 }} numberOfLines={1}>
                              📍 {hh.address}
                            </BengaliText>
                          ) : null}
                        </View>
                      </View>

                      <StatusBadge status={hh.status} />
                    </View>

                    <View style={styles.adminInfoRow}>
                      <Ionicons name="person-circle-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                      <BengaliText variant="caption" color={colors.textSecondary}>
                        পরিবার প্রধান: <BengaliText variant="caption" color={colors.text} weight="700">{adminName}</BengaliText>
                      </BengaliText>
                    </View>

                    <View
                      style={[
                        styles.cardActionsRow,
                        { borderTopColor: isDark ? colors.borderLight : colors.borderLight },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => openEditHouseholdModal(hh)}
                        style={[styles.actionBtn, { backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight }]}
                      >
                        <Ionicons name="create-outline" size={14} color={colors.primary} />
                        <BengaliText variant="caption" color={colors.primary} weight="700">সম্পাদনা</BengaliText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleToggleHouseholdStatus(hh._id, hh.status, hh.name)}
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: isActive
                              ? isDark ? '#3B1515' : '#FEF2F2'
                              : isDark ? '#064E3B' : '#ECFDF5',
                          },
                        ]}
                      >
                        <Ionicons
                          name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                          size={14}
                          color={isActive ? colors.danger : colors.accent}
                        />
                        <BengaliText
                          variant="caption"
                          color={isActive ? colors.danger : colors.accent}
                          weight="700"
                        >{isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'}</BengaliText>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : activeTab === 'USERS' ? (
          /* ==================== TAB 2: USERS ==================== */
          <View>
            <SectionHeader
              title="ব্যবহারকারীদের তালিকা"
              count={filteredUsers.length}
            />

            {filteredUsers.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="কোনো ব্যবহারকারী পাওয়া যায়নি"
                description="আপনার ফিল্টারে কোনো ইউজার নেই।"
                actionTitle="নতুন অ্যাডমিন তৈরি করুন"
                onActionPress={() => setAdminModal(true)}
              />
            ) : (
              filteredUsers.map((u) => {
                const isActive = u.isActive;
                const hhName = u.householdId?.name || 'কোনো পরিবারে যুক্ত নয়';

                return (
                  <View
                    key={u._id}
                    style={[
                      styles.cardItem,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surface,
                        borderColor: isDark ? colors.borderStrong : colors.border,
                        borderLeftColor: isActive ? colors.accent : colors.danger,
                      },
                    ]}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <ProfileAvatar name={u.name} size="md" role={u.role} showRoleBadge />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <BengaliText variant="bodyBold" color={colors.text}>
                            {u.name}
                          </BengaliText>
                          <BengaliText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                            ফোন: {MoneyUtil.toBengaliNumber(u.phone)}
                          </BengaliText>
                          <BengaliText variant="caption" color={colors.textLight} numberOfLines={1}>
                            পরিবার: {hhName}
                          </BengaliText>
                        </View>
                      </View>

                      <StatusBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </View>

                    <View
                      style={[
                        styles.cardActionsRow,
                        { borderTopColor: isDark ? colors.borderLight : colors.borderLight },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleCall(u.phone)}
                        style={[styles.iconActionBtn, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}
                      >
                        <Ionicons name="call-outline" size={16} color={colors.accent} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => openEditUserModal(u)}
                        style={[styles.iconActionBtn, { backgroundColor: isDark ? colors.surfaceSubdued : colors.secondaryLight }]}
                      >
                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => openPasswordModal(u)}
                        style={[styles.iconActionBtn, { backgroundColor: isDark ? '#78350F' : '#FFFBEB' }]}
                      >
                        <Ionicons name="key-outline" size={16} color={colors.warning} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleToggleUserStatus(u._id, u.isActive, u.name)}
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: isActive
                              ? isDark ? '#3B1515' : '#FEF2F2'
                              : isDark ? '#064E3B' : '#ECFDF5',
                          },
                        ]}
                      >
                        <Ionicons
                          name={isActive ? 'lock-closed-outline' : 'lock-open-outline'}
                          size={15}
                          color={isActive ? colors.danger : colors.accent}
                          style={{ marginRight: 4 }}
                        />
                        <BengaliText
                          variant="caption"
                          color={isActive ? colors.danger : colors.accent}
                          weight="700"
                          numberOfLines={1}
                        >{isActive ? 'ব্লক' : 'আনব্লক'}</BengaliText>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* ==================== TAB 3: SYSTEM HEALTH ==================== */
          <View style={styles.healthContainer}>
            <SectionHeader title="সার্ভার ও সিস্টেম পরিবেশ" />

            <View
              style={[
                styles.healthCard,
                {
                  backgroundColor: isDark ? colors.surface : colors.surface,
                  borderColor: isDark ? colors.borderStrong : colors.border,
                },
              ]}
            >
              <View style={styles.healthRow}>
                <Ionicons name="server-outline" size={20} color={colors.accent} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    API ব্যাকএন্ড সংযোগ
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.accent} weight="700">
                    🟢 সচল ও সক্রিয় (Operational)
                  </BengaliText>
                </View>
              </View>

              <View style={[styles.menuDivider, { backgroundColor: colors.borderLight, marginVertical: 10 }]} />

              <View style={styles.healthRow}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    আর্থিক ইন্টিগ্রিটি নীতি
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.textMuted}>
                    Strict integer Paisa, zero floating-point drift
                  </BengaliText>
                </View>
              </View>

              <View style={[styles.menuDivider, { backgroundColor: colors.borderLight, marginVertical: 10 }]} />

              <View style={styles.healthRow}>
                <Ionicons name="cloud-done-outline" size={20} color={colors.info} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    বাই-ডিরেকশনাল ডেটা সিঙ্ক
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.textMuted}>
                    SQLite অফলাইন কিউ এবং ব্যাকগ্রাউন্ড পুশ/পুল চালু
                  </BengaliText>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal 1: Create Household */}
      <BottomSheet
        visible={householdModal}
        title="নতুন পরিবার তৈরি করুন"
        subtitle="নাম, ইউনিক কোড এবং ঠিকানা দিন"
        onClose={() => setHouseholdModal(false)}
      >
        <TextInput
          label="পরিবারের নাম"
          placeholder="যেমন: ধানমন্ডি ফ্যামিলি / মেসেয়ার্স"
          value={hhName}
          onChangeText={setHhName}
          required
        />

        <TextInput
          label="পরিবার ইউনিক কোড"
          placeholder="যেমন: DHAKA01"
          value={hhCode}
          onChangeText={(t) => setHhCode(t.toUpperCase())}
          autoCapitalize="characters"
          required
        />

        <TextInput
          label="ঠিকানা (ঐচ্ছিক)"
          placeholder="যেমন: বাড়ি ১২, রোড ৪, ধানমন্ডি"
          value={hhAddress}
          onChangeText={setHhAddress}
        />

        <PrimaryButton
          title="পরিবার সংরক্ষণ করুন"
          onPress={handleCreateHousehold}
          loading={isSubmittingHh}
          icon="checkmark-circle-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Modal 2: Edit Household */}
      <BottomSheet
        visible={editHhModal}
        title="পরিবারের তথ্য সম্পাদনা"
        subtitle="তথ্য পরিবর্তন করে সেভ করুন"
        onClose={() => setEditHhModal(false)}
      >
        <TextInput
          label="পরিবারের নাম"
          value={editHhName}
          onChangeText={setEditHhName}
          required
        />

        <TextInput
          label="ইউনিক কোড"
          value={editHhCode}
          onChangeText={(t) => setEditHhCode(t.toUpperCase())}
          required
        />

        <TextInput
          label="ঠিকানা"
          value={editHhAddress}
          onChangeText={setEditHhAddress}
        />

        <PrimaryButton
          title="আপডেট সংরক্ষণ করুন"
          onPress={handleSaveEditHousehold}
          loading={isSubmittingEditHh}
          icon="save-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Modal 3: Create Admin */}
      <BottomSheet
        visible={adminModal}
        title="পরিবার অ্যাডমিন অ্যাকাউন্ট তৈরি"
        subtitle="নির্বাচিত পরিবারের জন্য নতুন অ্যাডমিন প্রস্তুত করুন"
        onClose={() => setAdminModal(false)}
      >
        <TextInput
          label="অ্যাডমিনের পুরো নাম"
          placeholder="যেমন: মোঃ জাহিদ হাসান"
          value={adminName}
          onChangeText={setAdminName}
          required
        />

        <TextInput
          label="ফোন নম্বর (লগইন আইডি)"
          placeholder="০১৭১১XXXXXX"
          value={adminPhone}
          onChangeText={setAdminPhone}
          keyboardType="phone-pad"
          required
        />

        <TextInput
          label="প্রাথমিক পাসওয়ার্ড"
          placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
          value={adminPass}
          onChangeText={setAdminPass}
          secureTextEntry
          required
        />

        <BengaliText variant="caption" color={colors.textMuted} weight="700" style={{ marginBottom: 6 }}>
          পরিবার নির্বাচন করুন:
        </BengaliText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {households.map((h) => {
            const isSelected = selectedHhId === h._id;
            return (
              <TouchableOpacity
                key={h._id}
                onPress={() => setSelectedHhId(h._id)}
                style={[
                  styles.hhSelectChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark ? colors.surfaceSubdued : colors.secondaryLight,
                    borderColor: isSelected
                      ? colors.primary
                      : isDark ? colors.borderStrong : colors.border,
                  },
                ]}
              >
                <BengaliText
                  variant="caption"
                  color={isSelected ? '#FFFFFF' : colors.text}
                  weight="700"
                >
                  {h.name} ({h.code})
                </BengaliText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <PrimaryButton
          title="অ্যাডমিন অ্যাকাউন্ট তৈরি করুন"
          onPress={handleCreateAdmin}
          loading={isSubmittingAdmin}
          icon="person-add-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Modal 4: Edit User */}
      <BottomSheet
        visible={editUserModal}
        title="ব্যবহারকারীর তথ্য সম্পাদনা"
        subtitle="নাম, ফোন নম্বর ও রোল পরিবর্তন"
        onClose={() => setEditUserModal(false)}
      >
        <TextInput
          label="পুরো নাম"
          value={editUserName}
          onChangeText={setEditUserName}
          required
        />

        <TextInput
          label="ফোন নম্বর"
          value={editUserPhone}
          onChangeText={setEditUserPhone}
          keyboardType="phone-pad"
          required
        />

        <BengaliText variant="caption" color={colors.textMuted} weight="700" style={{ marginBottom: 8 }}>
          ব্যবহারকারীর রোল:
        </BengaliText>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setEditUserRole('HOME_ADMIN')}
            style={[
              styles.roleSelectChip,
              {
                backgroundColor: editUserRole === 'HOME_ADMIN' ? colors.primary : isDark ? colors.surfaceSubdued : colors.secondaryLight,
                borderColor: editUserRole === 'HOME_ADMIN' ? colors.primary : isDark ? colors.borderStrong : colors.border,
              },
            ]}
          >
            <BengaliText variant="caption" color={editUserRole === 'HOME_ADMIN' ? '#FFFFFF' : colors.text} weight="700">
              ⭐ পরিবার অ্যাডমিন
            </BengaliText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setEditUserRole('HOME_USER')}
            style={[
              styles.roleSelectChip,
              {
                backgroundColor: editUserRole === 'HOME_USER' ? colors.primary : isDark ? colors.surfaceSubdued : colors.secondaryLight,
                borderColor: editUserRole === 'HOME_USER' ? colors.primary : isDark ? colors.borderStrong : colors.border,
              },
            ]}
          >
            <BengaliText variant="caption" color={editUserRole === 'HOME_USER' ? '#FFFFFF' : colors.text} weight="700">
              👤 সাধারণ সদস্য
            </BengaliText>
          </TouchableOpacity>
        </View>

        <PrimaryButton
          title="পরিবর্তন সংরক্ষণ করুন"
          onPress={handleSaveEditUser}
          loading={isSubmittingEditUser}
          icon="save-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Modal 5: Reset Password */}
      <BottomSheet
        visible={passwordModal}
        title="পাসওয়ার্ড রিসেট করুন"
        subtitle={passwordTargetUser ? `${passwordTargetUser.name}-এর নতুন পাসওয়ার্ড দিন` : ''}
        onClose={() => setPasswordModal(false)}
      >
        <TextInput
          label="নতুন পাসওয়ার্ড"
          placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          required
        />

        <PrimaryButton
          title="পাসওয়ার্ড পরিবর্তন নিশ্চিত করুন"
          onPress={handleSavePassword}
          loading={isSubmittingPassword}
          variant="danger"
          icon="key-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={logoutModalVisible}
        title="সুপার অ্যাডমিন লগআউট"
        message="আপনি কি নিশ্চিত যে সুপার অ্যাডমিন কনসোল থেকে লগআউট করতে চান?"
        confirmTitle="লগআউট"
        isDestructive
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 4,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1.2,
    padding: 4,
    marginVertical: 10,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardItem: {
    borderRadius: 16,
    borderWidth: 1.2,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  codeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 5,
    alignSelf: 'center',
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthContainer: {
    marginTop: 8,
  },
  healthCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuDivider: {
    height: 1,
  },
  hhSelectChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  roleSelectChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
});
