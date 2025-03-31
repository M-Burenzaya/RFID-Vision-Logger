import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';

import Home from './pages/Home.jsx';
import RFID from './pages/RFID.jsx';
import Vision from './pages/Vision.jsx';
import UserLog from './pages/UserLog.jsx';
import Help from './pages/Help.jsx';



function App() {
  return (
    <div className="max-w-8xl mx-auto px-8 flex flex-col">
      <BrowserRouter>
        <div className="bg-white text-[#285082] shadow-sm relative h-full">

          <div className="bg-white text-[#285082] py-4 shadow-md relative z-10">
            <Navbar />  
          </div>

          <div className="basis-full">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/rfid/*" element={<RFID />} />
                <Route path="/vision/*" element={<Vision />} />
                <Route path="/user-log" element={<UserLog />} />
                <Route path="/help" element={<Help />} />
            </Routes>
          </div>

        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
