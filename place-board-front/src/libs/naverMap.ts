let loading: Promise<typeof naver.maps> | undefined;

// 스크립트는 한 번만 넣고, 카드 여러 개가 동시에 불러도 같은 Promise를 쓴다
export function loadNaverMap() {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${import.meta.env.VITE_NAVER_MAP_CLIENT_ID}`;
    script.onload = () => resolve(naver.maps);
    script.onerror = () => {
      loading = undefined; // 다음에 다시 시도할 수 있게
      reject(new Error('네이버 지도를 불러오지 못했어요.'));
    };
    document.head.append(script);
  });
  return loading;
}
