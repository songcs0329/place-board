import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/libs/supabase';
import { HOUR } from '@/libs/utils/time';

export type LatestMemo = Pick<Db.Post, 'body' | 'tags' | 'images' | 'created_at'>;

const latestMemosKey = (placeKeys: string[]) => ['latestMemos', placeKeys];

// 장소별 가장 최근 현장 메모: 검색 카드 배지(설계 4.1), 실시간 게시판 탭(4.2)
export function useLatestMemos(placeKeys: string[]) {
  return useQuery({
    queryKey: latestMemosKey(placeKeys),
    enabled: placeKeys.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('place_posts')
        .select('place_key, body, tags, images, created_at')
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

// 새 메모 실시간 반영 (설계 11장: place_key=in.(...), 받은 뒤 memo만)
export function useMemoFeed(placeKeys: string[]) {
  const qc = useQueryClient();
  const filterKeys = placeKeys.join(',');

  useEffect(() => {
    if (!filterKeys) return;
    const keys = filterKeys.split(',');
    const channel = supabase
      .channel(`memo-feed:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        // in 필터는 값 100개까지: 검색 3개 × 최대 15곳이라 충분
        { event: 'INSERT', schema: 'public', table: 'place_posts', filter: `place_key=in.(${filterKeys})` },
        (payload) => {
          const post = payload.new as Db.Post;
          if (post.kind !== 'memo') return;
          const { body, tags, images, created_at } = post;
          qc.setQueryData<Record<string, LatestMemo>>(latestMemosKey(keys), (old = {}) => ({
            ...old,
            [post.place_key]: { body, tags, images, created_at },
          }));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [filterKeys, qc]);
}
