import { NavLink, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';

const Navbar = () => {
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
  
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);
  
  const location = useLocation();

  const pageNameMap = {
    '/': 'Home',
    '/rfid': 'RFID Settings',
    '/vision': 'Vision Settings',
    '/user-log': 'User Log',
    '/help': 'Help'
  };
  
  const pathSegments = location.pathname.split('/');
  const firstSegment = pathSegments[1] ? '/' + pathSegments[1] : '/';
  const currentPage = pageNameMap[firstSegment] || 'Page';

  const linkClass = ({ isActive }) =>
    `px-4 py-2 text-sm md:text-base rounded transition ${
      isActive ? 'bg-[#285082] text-white shadow' : 'hover:text-[#678cdf]'
    }`;

  return (
    <nav>
      <div className="mx-auto flex items-center justify-between px-6 sm:px-6 md:px-12 lg:px-18 xl:px-24">

        {/* Logo */}
        <a className="text-xl py-3 font-bold hover:text-[#678cdf]"
          href="https://www.mirapro.co.jp/en/"
          target="_blank"
          rel="noopener noreferrer"
        >
          RFID Vision
        </a>

        {/* Mobile: Current Page + Hamburger */}
        <div className="md:hidden flex items-center gap-12 ">

          <span className="text-lg font-medium">{currentPage}</span>

          <button onClick={() => setMenuOpen(!menuOpen)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Nav Links (Desktop) */}
          <div className="hidden md:flex gap-4 text-sm font-medium text-[#285082]">

            <NavLink to="/" className={linkClass}>Home</NavLink>

            <NavLink to="/rfid" className={linkClass}>
              <span className="inline lg:hidden">RFID</span>
              <span className="hidden lg:inline">RFID Settings</span>
            </NavLink>

             <NavLink to="/vision" className={linkClass}>
              <span className="inline lg:hidden">Vision</span>
              <span className="hidden lg:inline">Vision Settings</span>
            </NavLink>

            <NavLink to="/user-log" className={linkClass}>User Log</NavLink>
            <NavLink to="/help" className={linkClass}>Help</NavLink>
          </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-16 right-0 z-50 w-48 bg-white shadow-lg rounded-lg p-4 flex flex-col gap-2 text-lg font-semibold text-[#285082]"
          ref={menuRef}
        >
          <NavLink to="/" className={linkClass} onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/rfid" className={linkClass} onClick={() => setMenuOpen(false)}>RFID Settings</NavLink>
          <NavLink to="/vision" className={linkClass} onClick={() => setMenuOpen(false)}>Vision Settings</NavLink>
          <NavLink to="/user-log" className={linkClass} onClick={() => setMenuOpen(false)}>User Log</NavLink>
          <NavLink to="/help" className={linkClass} onClick={() => setMenuOpen(false)}>Help</NavLink>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
