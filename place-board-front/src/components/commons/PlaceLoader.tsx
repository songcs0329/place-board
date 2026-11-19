import CoffeeIcon from './icons/CoffeeIcon';
import FoodIcon from './icons/FoodIcon';
import PinIcon from './icons/PinIcon';
import CakeIcon from './icons/CakeIcon';
import BeerIcon from './icons/BeerIcon';
import CameraIcon from './icons/CameraIcon';

const icons = [CoffeeIcon, FoodIcon, PinIcon, CakeIcon, BeerIcon, CameraIcon];

// 커피·음식·지도 아이콘이 차례로 통통 튀는 로딩 표시
function PlaceLoader() {
  return (
    <div aria-hidden="true" className="flex justify-center gap-2 text-neutral-700">
      {icons.map((Icon, index) => (
        <span key={index} className="animate-place-bounce" style={{ animationDelay: `${index * 120}ms` }}>
          <Icon />
        </span>
      ))}
    </div>
  );
}

export default PlaceLoader;
