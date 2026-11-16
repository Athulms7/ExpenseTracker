import { ArrowUpRight, CreditCard, Ellipsis, ShoppingBag, Sparkles, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Category } from '../../types';

export const CATEGORIES: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'];

export const CATEGORY_META: Record<Category, { icon: LucideIcon; color: string }> = {
  Food: { icon: Utensils, color: 'orange' },
  Transport: { icon: ArrowUpRight, color: 'blue' },
  Shopping: { icon: ShoppingBag, color: 'pink' },
  Bills: { icon: CreditCard, color: 'purple' },
  Entertainment: { icon: Sparkles, color: 'green' },
  Other: { icon: Ellipsis, color: 'gray' },
};
