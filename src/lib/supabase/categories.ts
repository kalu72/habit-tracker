import { supabase } from './client';
import type { Category } from '@/types';

export interface CreateCategoryInput {
  user_id: string;
  name: string;
  color: string;
  icon: string;
}

// Get all categories for a user
export async function getCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Create a new category
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a category
export async function updateCategory(
  categoryId: string,
  updates: Partial<Omit<CreateCategoryInput, 'user_id'>>
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a category
export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw error;
}

// Create default categories for a new user
export async function createDefaultCategories(userId: string): Promise<Category[]> {
  const defaults = [
    { name: 'Personal Care', color: '#ec4899', icon: '✨' },
    { name: 'Fitness', color: '#84cc16', icon: '💪' },
    { name: 'Learning', color: '#3b82f6', icon: '📚' },
    { name: 'Health', color: '#f97316', icon: '❤️' },
    { name: 'Productivity', color: '#eab308', icon: '⚡' },
  ];

  // Use upsert to avoid duplicates if they already partially exist
  // We match on (user_id, name) thanks to the new unique constraint
  const { data, error } = await supabase
    .from('categories')
    .upsert(
      defaults.map(cat => ({ ...cat, user_id: userId })),
      { onConflict: 'user_id, name', ignoreDuplicates: true }
    )
    .select();

  if (error) throw error;
  return data || [];
}
