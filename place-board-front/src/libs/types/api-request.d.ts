declare namespace ApiRequest {
  interface CreatePost {
    body?: string;
    tags: string[];
    imagePath?: string;
    photoTakenAt?: string;
  }
}
