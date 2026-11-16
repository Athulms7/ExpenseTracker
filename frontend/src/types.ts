export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Other',
] as const;

export type Category = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: number;
  title: string;
  amount: number | string;
  category: Category;
  date: string;
  note: string | null;
}

export interface ExpenseDraft {
  title: string;
  amount: string;
  category: Category;
  date: string;
  note: string;
}

export interface ExpenseFilters {
  category: Category | '';
  date_from: string;
  date_to: string;
  title: string;
}

export interface ExpensePage {
  items: Expense[];
  total: number;
  limit: number;
  offset: number;
}

export interface CategoryTotal {
  category: Category;
  total: number | string;
  count: number;
}

export interface MonthlySummary {
  month: string;
  total: number | string;
  count: number;
  categories: CategoryTotal[];
}

export interface User {
  id: number;
  username: string;
}
