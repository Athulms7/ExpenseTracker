import { ArrowUpRight, CreditCard, Ellipsis, ShoppingBag, Sparkles, Utensils } from 'lucide-react';

export const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'];

export const CATEGORY_META = {
  Food: { icon: Utensils, color: 'orange' },
  Transport: { icon: ArrowUpRight, color: 'blue' },
  Shopping: { icon: ShoppingBag, color: 'pink' },
  Bills: { icon: CreditCard, color: 'purple' },
  Entertainment: { icon: Sparkles, color: 'green' },
  Other: { icon: Ellipsis, color: 'gray' },
};
