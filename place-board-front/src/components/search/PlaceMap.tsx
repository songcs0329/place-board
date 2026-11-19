import { useEffect, useRef } from 'react';
import { loadNaverMap } from '@/libs/naverMap';

interface Props {
  lat: number;
  lng: number;
  name: string;
}

// 카드 스크롤을 가로채지 않도록 조작할 수 없는 지도
function PlaceMap({ lat, lng, name }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: naver.maps.Map | undefined;
    let isCancelled = false;
    loadNaverMap()
      .then((maps) => {
        if (isCancelled || !container.current) return;
        const position = new maps.LatLng(lat, lng);
        map = new maps.Map(container.current, {
          center: position,
          zoom: 16,
          draggable: false,
          pinchZoom: false,
          scrollWheel: false,
          keyboardShortcuts: false,
          disableDoubleClickZoom: true,
          zoomControl: false,
          mapDataControl: false,
        });
        new maps.Marker({ position, map });
      })
      .catch(() => {}); // 지도가 안 떠도 카드의 나머지는 그대로 보인다
    return () => {
      isCancelled = true;
      map?.destroy();
    };
  }, [lat, lng]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={`${name} 위치 지도`}
      className="h-32 w-full rounded-xl bg-neutral-100"
    />
  );
}

export default PlaceMap;
