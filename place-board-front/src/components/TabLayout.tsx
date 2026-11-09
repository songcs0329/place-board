import { NavLink, Outlet } from 'react-router';
import { cn } from '@/libs/utils/cn';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-13 items-center justify-center text-sm',
    isActive ? 'font-bold text-zinc-900 shadow-[inset_0_3px_0_#111]' : 'font-medium text-stone-500',
  );

// 검색 결과 / 실시간 게시판 탭 (설계 4장)
function TabLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF7]">
      <Outlet />
      <nav aria-label="탭" className="sticky bottom-0 mt-auto grid grid-cols-2 border-t border-stone-200 bg-white">
        <NavLink to="/" end className={tabClass}>
          검색 결과
        </NavLink>
        <NavLink to="/live" className={tabClass}>
          실시간 게시판
        </NavLink>
      </nav>
    </div>
  );
}

export default TabLayout;
