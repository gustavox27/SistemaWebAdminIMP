import { supabase } from './supabase';
import { User } from '../types';

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
}

export interface UserSearchParams {
  searchTerm?: string;
  page: number;
  pageSize: number;
}

export class PaginatedSupabaseService {
  async getUsersPaginated(params: UserSearchParams): Promise<PaginatedResponse<User>> {
    try {
      const { searchTerm = '', page, pageSize } = params;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        query = query.or(`name.ilike.%${searchLower}%,empresa.ilike.%${searchLower}%,usuario_windows.ilike.%${searchLower}%,position.ilike.%${searchLower}%,contact.ilike.%${searchLower}%`);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      const convertedData: User[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        contact: item.contact,
        position: item.position,
        empresa: item.empresa,
        usuarioWindows: item.usuario_windows,
        createdAt: item.created_at ? new Date(item.created_at) : undefined,
        updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
      }));

      return {
        data: convertedData,
        totalCount: count || 0,
        hasMore: (count || 0) > to + 1
      };
    } catch (error) {
      console.error('Error getting paginated users:', error);
      throw error;
    }
  }

  async getTotalUsersCount(searchTerm?: string): Promise<number> {
    try {
      let query = supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        query = query.or(`name.ilike.%${searchLower}%,empresa.ilike.%${searchLower}%,usuario_windows.ilike.%${searchLower}%,position.ilike.%${searchLower}%,contact.ilike.%${searchLower}%`);
      }

      const { count, error } = await query;

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error getting total users count:', error);
      return 0;
    }
  }
}

export const paginatedSupabaseService = new PaginatedSupabaseService();
