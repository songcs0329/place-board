declare namespace ApiRequest {
  // 서버 src/moderation/moderation.controller.ts REPORT_REASONS와 같은 목록
  type ReportReason = 'spam' | 'abuse' | 'privacy' | 'etc';

  interface CreatePost {
    body?: string;
    tags: string[];
    imagePath?: string;
    photoTakenAt?: string;
  }
}
