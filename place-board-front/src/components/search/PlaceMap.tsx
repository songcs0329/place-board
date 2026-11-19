import { useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getCategoryIcon } from '@/components/search/categoryIcon';
import { loadNaverMap } from '@/libs/naverMap';

interface Props {
  lat: number;
  lng: number;
  name: string;
  category: string;
}

// 카드 스크롤을 가로채지 않도록 조작할 수 없는 지도
function PlaceMap({ lat, lng, name, category }: Props) {
  const CategoryIcon = getCategoryIcon(category);
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
        new maps.Marker({
          position,
          map,
          icon: {
            // 카테고리 아이콘이 든 둥근 핀. 꼬리 끝이 좌표에 닿도록 anchor를 아래 가운데로 잡는다
            content: `<div style="position:relative;width:36px;height:44px"><div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#111;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">${renderToStaticMarkup(<CategoryIcon />)}</div><div style="position:absolute;left:12px;top:35px;border:6px solid transparent;border-top-color:#111;border-bottom:0"></div></div>`,
            anchor: new maps.Point(18, 42),
          },
        });
      })
      .catch(() => {}); // 지도가 안 떠도 카드의 나머지는 그대로 보인다
    return () => {
      isCancelled = true;
      map?.destroy();
    };
  }, [lat, lng, CategoryIcon]);

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
