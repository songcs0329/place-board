import BeerIcon from '@/components/commons/icons/BeerIcon';
import CakeIcon from '@/components/commons/icons/CakeIcon';
import CoffeeIcon from '@/components/commons/icons/CoffeeIcon';
import FoodIcon from '@/components/commons/icons/FoodIcon';
import PinIcon from '@/components/commons/icons/PinIcon';

// 네이버 category 예: "음식점>카페,디저트". 위에서부터 먼저 맞는 것을 쓴다 (카페가 음식점보다 우선)
const rules = [
  { pattern: /카페|커피/, icon: CoffeeIcon },
  { pattern: /디저트|베이커리|제과|케이크/, icon: CakeIcon },
  { pattern: /술집|주점|호프|맥주|와인|이자카야|바\(BAR\)/, icon: BeerIcon },
  { pattern: /음식점|식당|한식|양식|일식|중식|분식/, icon: FoodIcon },
];

export function getCategoryIcon(category: string) {
  return rules.find((rule) => rule.pattern.test(category))?.icon ?? PinIcon;
}
