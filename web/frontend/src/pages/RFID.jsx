import { NavLink } from 'react-router-dom';

const TabNav = () => {
  const tabClass = ({ isActive }) =>
    `relative px-4 py-2 text-sm font-medium transition-all duration-500 ease-in-out ${
      isActive
        ? 'text-[#285082]  after:content-[""] after:absolute after:-bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-10 after:h-0.5 after:bg-[#285082] after:rounded-full'
        : 'text-gray-500  hover:text-[#285082]'
    }`;

  return (
    <nav className="flex items-center gap-6 border-b border-gray-200">
      <NavLink to="add" className={tabClass}>Add UID</NavLink>
      <NavLink to="list" className={tabClass}>UID List</NavLink>
      <NavLink to="settings" className={tabClass}>RFID Settings</NavLink>
    </nav>
  );
};

export default TabNav;
