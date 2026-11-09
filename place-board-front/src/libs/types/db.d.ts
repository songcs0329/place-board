// Supabase에서 직접 읽는 행 (snake_case 그대로)
declare namespace Db {
  interface Place {
    place_key: string;
    name: string;
    category: string | null;
    address: string | null;
    road_address: string | null;
    lat: number | null;
    lng: number | null;
    telephone: string | null;
    link: string | null;
  }

  // user_id는 읽지 않는다: 방마다 닉네임을 바꾸는 의미가 없어지므로
  interface Post {
    id: number;
    place_key: string;
    nickname: string;
    body: string | null;
    tags: string[];
    images: string[];
    photo_taken_at: string | null;
    kind: 'memo' | 'chat';
    created_at: string;
  }
}
