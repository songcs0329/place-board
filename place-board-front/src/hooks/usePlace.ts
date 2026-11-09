import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/libs/supabase';

export function usePlace(placeKey: string) {
  return useQuery({
    queryKey: ['place', placeKey],
    queryFn: async () => {
      const { data, error } = await supabase.from('places').select('*').eq('place_key', placeKey).maybeSingle();
      if (error) throw error;
      return data as Db.Place | null;
    },
  });
}
