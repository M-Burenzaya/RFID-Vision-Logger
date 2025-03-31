import { NavLink } from 'react-router-dom';

const TabLink = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `relative pb-2 transition-all duration-300 ${
        isActive
          ? 'text-[#285082] font-semibold after:content-[""] after:absolute after:-bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-full after:h-0.25 after:bg-[#285082] after:rounded-full'
          : 'text-gray-400 hover:text-[#285082]'
      }`
    }
  >
    {children}
  </NavLink>
);

export default TabLink;
