declare namespace ApiResponse {
  interface Blog {
    title: string;
    link: string;
    snippet: string;
    blogger: string;
    postdate: string;
  }

  interface Place {
    placeKey: string;
    name: string;
    category: string;
    address: string;
    roadAddress: string;
    lat: number | null;
    lng: number | null;
    telephone: string;
    link: string;
    summary: string;
    blogs: Blog[];
  }

  interface Unmatched {
    name: string;
    area: string;
    summary: string;
    blogs: Blog[];
  }

  interface Search {
    query: string;
    places: Place[];
    unmatched: Unmatched[];
  }

  // 4xx/5xx 응답 본문
  interface Error {
    code?: 'USER_LIMIT' | 'IN_PROGRESS' | 'NAVER_QUOTA';
    message?: string | string[];
  }
}
