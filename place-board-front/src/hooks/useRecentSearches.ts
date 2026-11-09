import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/libs/supabase';
import { HOUR } from '@/libs/utils/time';

export interface RecentSearch {
  id: string;
  query: string;
  createdAt: string;
  places: Pick<Db.Place, 'place_key' | 'name'>[];
}

export const recentSearchesKey = ['recentSearches'];

// 최근 24시간 검색 3개 + 각 검색의 장소 이름 (설계 4.2). RLS로 본인 기록만 보인다
export function useRecentSearches() {
  return useQuery({
    queryKey: recentSearchesKey,
    queryFn: async (): Promise<RecentSearch[]> => {
      const sessions = await supabase
        .from('search_sessions')
        .select('id, query, place_keys, created_at')
        .gte('created_at', new Date(Date.now() - 24 * HOUR).toISOString())
        .order('created_at', { ascending: false })
        .limit(3);
      if (sessions.error) throw sessions.error;

      const keys = [...new Set(sessions.data.flatMap((s) => s.place_keys as string[]))];
      const places = keys.length
        ? await supabase.from('places').select('place_key, name').in('place_key', keys)
        : { data: [], error: null };
      if (places.error) throw places.error;
      const byKey = new Map(places.data.map((p) => [p.place_key, p]));

      return sessions.data.map((s) => ({
        id: s.id,
        query: s.query,
        createdAt: s.created_at,
        places: (s.place_keys as string[]).flatMap((k) => byKey.get(k) ?? []),
      }));
    },
  });
}
