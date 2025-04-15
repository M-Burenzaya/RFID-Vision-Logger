import React, { useEffect, useState } from "react";
import axios from "axios";

const RFIDList = () => {
  const [boxes, setBoxes] = useState([]);
  const [expandedBox, setExpandedBox] = useState(null);
  const [editMode, setEditMode] = useState({});
  const [boxChanges, setBoxChanges] = useState({});

  useEffect(() => {
    fetchBoxes();
  }, []);

  const fetchBoxes = async () => {
    const response = await axios.get("http://localhost:8000/users");
    const boxList = await axios.get("http://localhost:8000/get-all-boxes"); // You may need to implement this route
    setBoxes(boxList.data);
  };

  const toggleExpand = (uid) => {
    setExpandedBox(expandedBox === uid ? null : uid);
  };

  const startEdit = (uid) => {
    setEditMode((prev) => ({ ...prev, [uid]: true }));
    const box = boxes.find((b) => b.uid === uid);
    setBoxChanges((prev) => ({ ...prev, [uid]: { ...box } }));
  };

  const cancelEdit = (uid) => {
    setEditMode((prev) => ({ ...prev, [uid]: false }));
    setBoxChanges((prev) => {
      const newChanges = { ...prev };
      delete newChanges[uid];
      return newChanges;
    });
  };

  const saveChanges = async (uid) => {
    const updatedBox = boxChanges[uid];
    await axios.put(`http://localhost:8000/update-box/${updatedBox.id}`, updatedBox);
    setEditMode((prev) => ({ ...prev, [uid]: false }));
    fetchBoxes();
  };

  const handleChange = (uid, key, value) => {
    setBoxChanges((prev) => ({
      ...prev,
      [uid]: { ...prev[uid], [key]: value },
    }));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">RFID Boxes</h1>
      {boxes.map((box) => (
        <div key={box.uid} className="border p-4 rounded-xl mb-4 shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">UID: {box.uid}</p>
              {editMode[box.uid] ? (
                <input
                  type="text"
                  value={boxChanges[box.uid]?.box_name || ""}
                  onChange={(e) => handleChange(box.uid, "box_name", e.target.value)}
                  className="text-xl font-bold border rounded px-2"
                />
              ) : (
                <p className="text-xl font-bold">{box.box_name}</p>
              )}
            </div>
            <div className="space-x-2">
              <button onClick={() => toggleExpand(box.uid)} className="text-blue-600 hover:underline">
                {expandedBox === box.uid ? "Hide Items" : "Show Items"}
              </button>
              <button onClick={() => startEdit(box.uid)} className="text-yellow-600 hover:underline">
                Edit
              </button>
            </div>
          </div>
          {expandedBox === box.uid && (
            <div className="mt-4">
              <ul className="list-disc list-inside">
                {box.items.map((item) => (
                  <li key={item.id}>
                    {item.item_name} - {item.quantity} pcs
                  </li>
                ))}
              </ul>
            </div>
          )}
          {editMode[box.uid] && (
            <div className="mt-4 space-x-2">
              <button
                onClick={() => saveChanges(box.uid)}
                className="bg-green-500 text-white px-4 py-1 rounded"
              >
                Save Changes
              </button>
              <button
                onClick={() => cancelEdit(box.uid)}
                className="bg-red-500 text-white px-4 py-1 rounded"
              >
                Discard
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default RFIDList;
