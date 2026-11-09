import { BrowserRouter, Navigate, Routes, Route } from 'react-router';
import RequireAuth from '@/components/layouts/RequireAuth';
import TabLayout from '@/components/layouts/TabLayout';
import Live from '@/pages/Live';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Places from '@/pages/Places';
import Search from '@/pages/Search';

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
