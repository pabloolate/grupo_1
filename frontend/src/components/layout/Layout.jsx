import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Navbar />
        <section className="page-area">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
