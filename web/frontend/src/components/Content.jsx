import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar.jsx';

import Home from '../pages/Home.jsx';
import RFID from '../pages/RFID.jsx';
import Vision from '../pages/Vision.jsx';
import UserLog from '../pages/UserLog.jsx';
import Help from '../pages/Help.jsx';

const Content = () => {
    return (
        <div>
            <Navbar />

            <h1 className="text-3xl font-white font-bold">Home Page</h1>;

            <div className="p-6">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/rfid" element={<RFID />} />
                <Route path="/vision" element={<Vision />} />
                <Route path="/user-log" element={<UserLog />} />
                <Route path="/help" element={<Help />} />
            </Routes>
            </div>

        </div>
    )
}

export default Content