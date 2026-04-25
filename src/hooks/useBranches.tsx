import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBranches() {
  return useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('name')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data || []).map(b => b.name);
    },
  });
}
