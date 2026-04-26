import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Branch {
  id: string;
  name: string;
}

export function useBranches() {
  return useQuery<Branch[]>({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data || []).map(b => ({ id: b.id as string, name: b.name as string }));
    },
  });
}
