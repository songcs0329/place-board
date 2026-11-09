import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/libs/supabase';
import { HOUR } from '@/libs/utils/time';

type LatestMemo = Pick<Db.Post, 'tags' | 'images' | 'created_at'>;

// 검색 결과 카드 배지용: 장소별 가장 최근 현장 메모 (설계 4.1)
export function useLatestMemos(placeKeys: string[]) {
  return useQuery({
    queryKey: ['latestMemos', placeKeys],
    enabled: placeKeys.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('place_posts')
        .select('place_key, tags, images, created_at')
        .in('place_key', placeKeys)
        .eq('kind', 'memo')
        .gte('created_at', new Date(Date.now() - 24 * HOUR).toISOString())
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      const latest: Record<string, LatestMemo> = {};
      for (const row of data) latest[row.place_key] ??= row;
      return latest;
    },
  });
}
