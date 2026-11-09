import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// service role 클라이언트: RLS를 우회하므로 서버에서만 쓴다
export const supabaseProvider = {
  provide: SupabaseClient,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    createClient(config.getOrThrow('SUPABASE_URL'), config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
};
