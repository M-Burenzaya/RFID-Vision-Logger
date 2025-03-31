// src/pages/Vision.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import VisionAdd from './subpages/VisionAdd.jsx';
import VisionList from './subpages/VisionList.jsx';
import VisionSettings from './subpages/VisionSettings.jsx';
import TabLink from '../components/TabLink.jsx';

const Vision = () => {
  return (
    <div className="px-6 sm:px-6 md:px-12 lg:px-18 xl:px-24 py-6">

      {/* Sub-navigation */}
      <div className="flex justify-center gap-12 sm:gap-12 md:gap-16 lg:gap-20 xl:gap-24 border-b pb-2 mb-4">
        <TabLink to="add">Add User</TabLink>
        <TabLink to="list">User List</TabLink>
        <TabLink to="settings">Camera Settings</TabLink>
      </div>

      {/* Nested sub-routes */}
      <Routes>
        <Route index element={<Navigate to="add" replace />} />
        <Route path="add" element={<VisionAdd />} />
        <Route path="list" element={<VisionList />} />
        <Route path="settings" element={<VisionSettings />} />
      </Routes>
    </div>
  );
};

export default Vision;
