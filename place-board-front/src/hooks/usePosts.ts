import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/libs/supabase';
import { HOUR } from '@/libs/utils/time';

// user_id는 빼고 읽는다 (Db.Post 참고)
export const POST_COLUMNS = 'id, place_key, nickname, body, tags, images, photo_taken_at, kind, created_at';

export const postsKey = (placeKey: string) => ['posts', placeKey];

// Broadcast는 글 id·장소·종류만 보낸다 (설계 11장)
export interface PostNotice {
  id: number;
  place_key: string;
  kind: Db.Post['kind'];
}

// 최근 24시간 글, 오래된 순. 차단한 사람·내가 신고한 글·신고로 숨겨진 글은 RLS가 뺀다
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

// 알림으로 받은 id를 다시 조회한다. 차단·신고로 나에게 안 보여야 하는 글이면 RLS가 걸러서 null
export async function fetchVisiblePost(id: number) {
  const { data, error } = await supabase.from('place_posts').select(POST_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Db.Post | null;
}

// POST 응답에 섞일 수 있는 다른 필드는 버리고 Db.Post 컬럼만 남긴다
export function addPost(queryClient: QueryClient, placeKey: string, post: Db.Post) {
  const { id, place_key, nickname, body, tags, images, photo_taken_at, kind, created_at } = post;
  const clean: Db.Post = { id, place_key, nickname, body, tags, images, photo_taken_at, kind, created_at };
  queryClient.setQueryData<Db.Post[]>(postsKey(placeKey), (previous = []) =>
    previous.some((existing) => existing.id === clean.id) ? previous : [...previous, clean],
  );
}

export function removePost(queryClient: QueryClient, placeKey: string, postId: number) {
  queryClient.setQueryData<Db.Post[]>(postsKey(placeKey), (previous = []) =>
    previous.filter((post) => post.id !== postId),
  );
}

// 새 글 실시간 반영 + 보는 사람 수 (설계 11장, 채널 place:{key})
export function usePlaceChannel(placeKey: string) {
  const queryClient = useQueryClient();
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    // 비공개 채널: 로그인 사용자만 받고, 새 글 알림은 서버만 보낼 수 있다 (Realtime 정책)
    // Presence 키는 다른 사람에게 보이므로 사용자 ID 대신 탭마다 임의 값
    const channel = supabase.channel(`place:${placeKey}`, {
      config: { private: true, presence: { key: crypto.randomUUID() } },
    });
    channel
      .on('broadcast', { event: 'post' }, async ({ payload }) => {
        const post = await fetchVisiblePost((payload as PostNotice).id).catch(() => null);
        if (post) addPost(queryClient, placeKey, post);
      })
      .on('presence', { event: 'sync' }, () => setViewers(Object.keys(channel.presenceState()).length))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({});
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [placeKey, queryClient]);

  return viewers;
}
