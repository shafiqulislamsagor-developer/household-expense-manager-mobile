import { Ionicons } from '@expo/vector-icons';

export interface PredefinedCategory {
  id: string;
  name: string;
  defaultTitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  type: 'EXPENSE' | 'INCOME';
}

export const PREDEFINED_EXPENSE_CATEGORIES: PredefinedCategory[] = [
  {
    id: 'groceries',
    name: 'বাজার ও মুদিখানা',
    defaultTitle: 'দৈনন্দিন বাজার খরচ',
    icon: 'basket-outline',
    color: '#059669',
    type: 'EXPENSE',
  },
  {
    id: 'meat_fish',
    name: 'মাছ, মাংস ও ডিম',
    defaultTitle: 'মাছ ও মাংস কেনা',
    icon: 'restaurant-outline',
    color: '#dc2626',
    type: 'EXPENSE',
  },
  {
    id: 'veggies',
    name: 'শাকসবজি ও ফল',
    defaultTitle: 'শাকসবজি ও ফলমূল',
    icon: 'leaf-outline',
    color: '#16a34a',
    type: 'EXPENSE',
  },
  {
    id: 'utilities',
    name: 'বিদ্যুৎ ও গ্যাস বিল',
    defaultTitle: 'বিদ্যুৎ/গ্যাস ইউটিলিটি বিল',
    icon: 'flash-outline',
    color: '#d97706',
    type: 'EXPENSE',
  },
  {
    id: 'rent',
    name: 'বাসা ভাড়া',
    defaultTitle: 'মাসিক বাসা ভাড়া',
    icon: 'home-outline',
    color: '#7c3aed',
    type: 'EXPENSE',
  },
  {
    id: 'internet',
    name: 'ইন্টারনেট ও ওয়াইফাই',
    defaultTitle: 'মাসিক ইন্টারনেট বিল',
    icon: 'wifi-outline',
    color: '#0284c7',
    type: 'EXPENSE',
  },
  {
    id: 'transport',
    name: 'যাতায়াত ও ভাড়া',
    defaultTitle: 'রিকশা/সিএনজি/বাস যাতায়াত',
    icon: 'car-outline',
    color: '#ea580c',
    type: 'EXPENSE',
  },
  {
    id: 'medicine',
    name: 'ওষুধ ও চিকিৎসা',
    defaultTitle: 'ওষুধ কেনা ও ডাক্তার ভিজিট',
    icon: 'medkit-outline',
    color: '#e11d48',
    type: 'EXPENSE',
  },
  {
    id: 'dining',
    name: 'নাশতা ও রেস্তোরাঁ',
    defaultTitle: 'চা, নাশতা ও বাইরের খাবার',
    icon: 'cafe-outline',
    color: '#ca8a04',
    type: 'EXPENSE',
  },
  {
    id: 'education',
    name: 'সন্তানের লেখাপড়া',
    defaultTitle: 'স্কুল/মাদ্রাসা ফি ও বইখাতা',
    icon: 'school-outline',
    color: '#2563eb',
    type: 'EXPENSE',
  },
  {
    id: 'mobile',
    name: 'মোবাইল রিচার্জ',
    defaultTitle: 'মোবাইল ব্যালেন্স রিচার্জ',
    icon: 'phone-portrait-outline',
    color: '#0d9488',
    type: 'EXPENSE',
  },
  {
    id: 'shopping',
    name: 'পোশাক ও কেনাকাটা',
    defaultTitle: 'কাপড়চোপড় ও পোশাক',
    icon: 'shirt-outline',
    color: '#db2777',
    type: 'EXPENSE',
  },
  {
    id: 'charity',
    name: 'দান-সদকা ও উপহার',
    defaultTitle: 'দান-সদকা ও উপহার প্রদান',
    icon: 'gift-outline',
    color: '#0891b2',
    type: 'EXPENSE',
  },
  {
    id: 'repair',
    name: 'বাসা মেরামত ও মিস্ত্রি',
    defaultTitle: 'গৃহস্থালি সামগ্রী মেরামত',
    icon: 'construct-outline',
    color: '#475569',
    type: 'EXPENSE',
  },
  {
    id: 'other_expense',
    name: 'অন্যান্য খরচ',
    defaultTitle: 'বিবিধ জরুরী খরচ',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#64748b',
    type: 'EXPENSE',
  },
];

export const PREDEFINED_INCOME_CATEGORIES: PredefinedCategory[] = [
  {
    id: 'salary',
    name: 'মাসিক বেতন',
    defaultTitle: 'চাকরির মাসিক বেতন',
    icon: 'briefcase-outline',
    color: '#059669',
    type: 'INCOME',
  },
  {
    id: 'business',
    name: 'ব্যবসা ও বিক্রয়',
    defaultTitle: 'ব্যবসার নিট লাভ',
    icon: 'storefront-outline',
    color: '#0284c7',
    type: 'INCOME',
  },
  {
    id: 'freelancing',
    name: 'ফ্রিল্যান্সিং ও কাজ',
    defaultTitle: 'ফ্রিল্যান্সিং প্রজেক্ট পেমেন্ট',
    icon: 'laptop-outline',
    color: '#7c3aed',
    type: 'INCOME',
  },
  {
    id: 'rent_income',
    name: 'বাড়ি/দোকান ভাড়া',
    defaultTitle: 'বাড়ি/দোকান থেকে প্রাপ্ত ভাড়া',
    icon: 'key-outline',
    color: '#ca8a04',
    type: 'INCOME',
  },
  {
    id: 'investment',
    name: 'বিনিয়োগ ও মুনাফা',
    defaultTitle: 'সঞ্চয়পত্র বা বিনিয়োগ লভ্যাংশ',
    icon: 'trending-up-outline',
    color: '#16a34a',
    type: 'INCOME',
  },
  {
    id: 'gift_support',
    name: 'উপহার বা অনুদান',
    defaultTitle: 'পারিবারিক সহায়তা বা উপহার',
    icon: 'gift-outline',
    color: '#e11d48',
    type: 'INCOME',
  },
  {
    id: 'bonus',
    name: 'বোনাস ও ইনসেন্টিভ',
    defaultTitle: 'ঈদ বা পারফরম্যান্স বোনাস',
    icon: 'ribbon-outline',
    color: '#d97706',
    type: 'INCOME',
  },
  {
    id: 'other_income',
    name: 'অন্যান্য নিজস্ব আয়',
    defaultTitle: 'অন্যান্য বিবিধ আয়',
    icon: 'cash-outline',
    color: '#0d9488',
    type: 'INCOME',
  },
];

