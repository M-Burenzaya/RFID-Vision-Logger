import { BrowserRouter, Routes, Route } from 'react-router-dom';
import React, { createContext, useContext, useState } from "react";

const RFIDContext = createContext();
export const useRFID = () => useContext(RFIDContext);

import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import RFID from './pages/RFID.jsx';
import Vision from './pages/Vision.jsx';
import UserLog from './pages/UserLog.jsx';
import Help from './pages/Help.jsx';

// ✅ FIXED: RFIDProvider returns the context provider
export const RFIDProvider = ({ children }) => {
  const [uid, setUid] = useState("");
  const [isReadyToScan, setIsReadyToScan] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [boxName, setBoxName] = useState("");
  const [items, setItems] = useState([]);

  return (
    <RFIDContext.Provider
      value={{
        uid, setUid,
        isReadyToScan, setIsReadyToScan,
        isScanned, setIsScanned,
        boxName, setBoxName,
        items, setItems,
      }}
    >
      {children}
    </RFIDContext.Provider>
  );
};

// 🟦 App component
function App() {
  return (
    <RFIDProvider>
      <div className="max-w-8xl mx-auto px-0 md:px-8 flex flex-col">
        <BrowserRouter>

          <div className="bg-white text-[#285082] shadow-sm relative min-h-screen">

            <div className="bg-white text-[#285082] py-4 shadow-md relative z-10">
              <Navbar />  
            </div>

            <div>
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
    </RFIDProvider>
  );
}

export default App;
