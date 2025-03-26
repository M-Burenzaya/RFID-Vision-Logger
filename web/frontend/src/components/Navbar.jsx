function Navbar() {
    return (
      <nav className="navbar">

        <a
        // href="https://github.com/M-Burenzaya/RFID-Vision-Logger.git"https://www.mirapro.co.jp/en/
        href="https://www.mirapro.co.jp/en/"
        target="_blank"
        rel="noopener noreferrer"
        className="source-link"
        >
        RFID Vision
        </a>

        <div className="flex gap-6">
          <button className="hover:text-purple-400">Home</button>
          <button className="hover:text-purple-400">RFID</button>
          <button className="hover:text-purple-400">Vision</button>
          <button className="hover:text-purple-400">User Log</button>
          <button className="hover:text-purple-400">Help</button>
        </div>
      </nav>
    );
  }
  
  export default Navbar;
  