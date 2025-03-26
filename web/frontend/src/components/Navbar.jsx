const Navbar = () => {
  return (
    <nav className="w-full px-8 py-4 flex justify-between items-center bg-black text-white shadow-md">
      
      {/* Logo / Title */}
      <a
        href="https://www.mirapro.co.jp/en/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xl font-bold flex items-center gap-2 hover:text-purple-400 transition"
      >
        {/* <img
          src="/vite.svg" // or your own logo path
          alt="Logo"
          className="w-6 h-6"
        /> */}
        RFID Vision
      </a>

      {/* Nav Buttons */}
      <div className="flex gap-6 text-sm font-medium">
        <button className="hover:text-purple-400 transition">Home</button>
        <button className="hover:text-purple-400 transition">RFID</button>
        <button className="hover:text-purple-400 transition">Vision</button>
        <button className="hover:text-purple-400 transition">User Log</button>
        <button className="hover:text-purple-400 transition">Help</button>
      </div>
    </nav>
  );
};

export default Navbar;
