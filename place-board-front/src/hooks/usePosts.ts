import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/libs/supabase';
import { HOUR } from '@/libs/utils/time';

// user_id는 빼고 읽는다 (Db.Post 참고)
export const POST_COLUMNS = 'id, place_key, nickname, body, tags, images, photo_taken_at, kind, created_at';

const postsKey = (placeKey: string) => ['posts', placeKey];

// 최근 24시간 글, 오래된 순
export function usePosts(placeKey: string) {
  return useQuery({
    queryKey: postsKey(placeKey),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('place_posts')
        .select(POST_COLUMNS)
        .eq('place_key', placeKey)
        .gte('created_at', new Date(Date.now() - 24 * HOUR).toISOString())
        .order('created_at');
      if (error) throw error;
      return data as Db.Post[];
    },
  });
}

// Realtime·POST 응답은 user_id까지 오므로 Db.Post 컬럼만 남긴다
export function addPost(qc: QueryClient, placeKey: string, post: Db.Post) {
  const { id, place_key, nickname, body, tags, images, photo_taken_at, kind, created_at } = post;
  const clean: Db.Post = { id, place_key, nickname, body, tags, images, photo_taken_at, kind, created_at };
  qc.setQueryData<Db.Post[]>(postsKey(placeKey), (old = []) =>
    old.some((p) => p.id === clean.id) ? old : [...old, clean],
  );
}

// 새 글 실시간 반영 + 보는 사람 수 (설계 11장, 채널 place:{key})
export function usePlaceChannel(placeKey: string) {
  const qc = useQueryClient();
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    // Presence 키는 다른 사람에게 보이므로 사용자 ID 대신 탭마다 임의 값
    const channel = supabase.channel(`place:${placeKey}`, { config: { presence: { key: crypto.randomUUID() } } });
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'place_posts', filter: `place_key=eq.${placeKey}` },
        (payload) => addPost(qc, placeKey, payload.new as Db.Post),
      )
      .on('presence', { event: 'sync' }, () => setViewers(Object.keys(channel.presenceState()).length))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({});
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [placeKey, qc]);

  return viewers;
}
