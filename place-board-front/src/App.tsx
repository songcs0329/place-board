import { BrowserRouter, Routes, Route } from 'react-router';
import RequireAuth from '@/components/RequireAuth';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import Search from '@/pages/Search';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Search />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
