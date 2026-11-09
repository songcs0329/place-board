import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchVisiblePost, type PostNotice } from '@/hooks/usePosts';
import { supabase } from '@/libs/supabase';
import { HOUR } from '@/libs/utils/time';

// 가장 최근 메모 + 24시간 안의 가장 최근 사진 (최신 메모에 사진이 없어도 썸네일은 보여준다)
export type LatestMemo = Pick<Db.Post, 'body' | 'tags' | 'images' | 'created_at'> & { photo?: string };

const latestMemosKey = (placeKeys: string[]) => ['latestMemos', placeKeys];

// 장소별 가장 최근 현장 메모: 검색 카드 배지·썸네일(설계 4.1), 실시간 게시판 탭(4.2)
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
      for (const row of data) {
        const memo = (latest[row.place_key] ??= { ...row });
        memo.photo ??= row.images[0];
      }
      return latest;
    },
  });
}

// 새 메모 실시간 반영 (설계 11장): 장소마다 비공개 채널 place:{key}의 Broadcast를 받고, 메모만 반영
// 검색 3개 × 최대 15곳이라 채널은 많아야 45개 (Supabase 클라이언트당 채널 한도 100 안쪽)
export function useMemoFeed(placeKeys: string[]) {
  const queryClient = useQueryClient();
  const joinedKeys = placeKeys.join(',');

  useEffect(() => {
    if (!joinedKeys) return;
    const keys = joinedKeys.split(',');
    // 알림은 id만 오므로 메모일 때만 다시 조회한다. 차단·신고로 안 보여야 하면 RLS가 걸러서 null
    const onPost = async (notice: PostNotice) => {
      if (notice.kind !== 'memo') return;
      const post = await fetchVisiblePost(notice.id).catch(() => null);
      if (!post) return;
      const { body, tags, images, created_at } = post;
      queryClient.setQueryData<Record<string, LatestMemo>>(latestMemosKey(keys), (previous = {}) => ({
        ...previous,
        [post.place_key]: { body, tags, images, created_at, photo: images[0] ?? previous[post.place_key]?.photo },
      }));
    };
    const channels = keys.map((placeKey) =>
      supabase
        .channel(`place:${placeKey}`, { config: { private: true } })
        .on('broadcast', { event: 'post' }, (message) => void onPost(message.payload as PostNotice))
        .subscribe(),
    );
    return () => {
      for (const channel of channels) void supabase.removeChannel(channel);
    };
  }, [joinedKeys, queryClient]);
}
