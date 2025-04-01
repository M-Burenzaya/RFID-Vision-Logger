// src/pages/RFID.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import RFIDAdd from './subpages/RFIDAdd.jsx';
import RFIDList from './subpages/RFIDList.jsx';
import RFIDSettings from './subpages/RFIDSettings';
import TabLink from '../components/TabLink.jsx';

const RFID = () => {
  return (
    <div className="px-6 sm:px-6 md:px-12 lg:px-18 xl:px-24 py-6">

      {/* Sub-navigation */}
      <div className="flex justify-center gap-4 sm:gap-12 md:gap-16 lg:gap-20 xl:gap-24 border-b pb-2 mb-4">
        <TabLink to="add">Add UID</TabLink>
        <TabLink to="list">UID List</TabLink>
        <TabLink to="settings">RFID Settings</TabLink>
      </div>

      {/* Nested sub-routes */}
      <Routes>
        <Route index element={<Navigate to="add" replace />} />
        <Route path="add" element={<RFIDAdd />} />
        <Route path="list" element={<RFIDList />} />
        <Route path="settings" element={<RFIDSettings />} />
      </Routes>
    </div>
  );
};

export default RFID;
