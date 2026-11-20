import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router';
import RequireAuth from '@/components/layouts/RequireAuth';
import TabLayout from '@/components/layouts/TabLayout';
const Live = lazy(() => import('@/pages/Live'));
const Login = lazy(() => import('@/pages/Login'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Places = lazy(() => import('@/pages/Places'));
const Search = lazy(() => import('@/pages/Search'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route element={<RequireAuth />}>
            <Route element={<TabLayout />}>
              <Route path="/search" element={<Search />} />
              <Route path="/live" element={<Live />} />
            </Route>
            <Route path="/places/:placeKey" element={<Places />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
