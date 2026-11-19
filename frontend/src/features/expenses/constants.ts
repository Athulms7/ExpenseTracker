import { Activity, ArrowUpRight, CreditCard, Ellipsis, ShoppingBag, Sparkles, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EXPENSE_CATEGORIES, type Category } from '../../types';

export const CATEGORIES = EXPENSE_CATEGORIES;

export const CATEGORY_META: Record<Category, { icon: LucideIcon; color: string }> = {
  Food: { icon: Utensils, color: 'orange' },
  Transport: { icon: ArrowUpRight, color: 'blue' },
  Shopping: { icon: ShoppingBag, color: 'pink' },
  Bills: { icon: CreditCard, color: 'purple' },
  Entertainment: { icon: Sparkles, color: 'green' },
  Health: { icon: Activity, color: 'blue' },
  Other: { icon: Ellipsis, color: 'gray' },
};
