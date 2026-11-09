import { BrowserRouter, Routes, Route } from 'react-router';
import RequireAuth from '@/components/RequireAuth';
import TabLayout from '@/components/TabLayout';
import Board from '@/pages/Board';
import Live from '@/pages/Live';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Search from '@/pages/Search';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<TabLayout />}>
            <Route path="/" element={<Search />} />
            <Route path="/live" element={<Live />} />
          </Route>
          <Route path="/places/:placeKey" element={<Board />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
