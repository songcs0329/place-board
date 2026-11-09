import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/libs/supabase';

// undefined = 확인 중, null = 로그인 안 됨
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // 첫 이벤트(INITIAL_SESSION)에 현재 세션이 오고, 카카오 콜백의 URL 토큰도 여기서 처리된다
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}
