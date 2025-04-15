import React, { useEffect, useState } from "react";
import axios from "axios";

const RFIDList = () => {
  const [boxes, setBoxes] = useState([]);
  const [editMode, setEditMode] = useState({});
  const [boxChanges, setBoxChanges] = useState({});
  const [selectedBoxUid, setSelectedBoxUid] = useState(null);

  useEffect(() => {
    fetchBoxes();
  }, []);

  const fetchBoxes = async () => {
    try {
      const response = await axios.get("http://localhost:8000/get-all-boxes");
      setBoxes(response.data);
    } catch (err) {
      console.error("Failed to fetch boxes", err);
    }
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
    setSelectedBoxUid(null);
  };

  const saveChanges = async (uid) => {
    const updatedBox = boxChanges[uid];
    await axios.put(`http://localhost:8000/update-box/${updatedBox.id}`, updatedBox);
    setEditMode((prev) => ({ ...prev, [uid]: false }));
    fetchBoxes();
    setSelectedBoxUid(null);
  };

  const deleteBox = async (uid) => {
    const confirmed = window.confirm("Are you sure you want to delete this box?");
    if (!confirmed) return;

    try {
      const box = boxes.find((b) => b.uid === uid);
      await axios.delete(`http://localhost:8000/delete-box/${box.id}`);
      fetchBoxes();
      setSelectedBoxUid(null);
    } catch (err) {
      console.error("Failed to delete box", err);
      alert("Failed to delete box.");
    }
  };

  const handleChange = (uid, key, value) => {
    setBoxChanges((prev) => ({
      ...prev,
      [uid]: { ...prev[uid], [key]: value },
    }));
  };

  const toggleSelect = (uid) => {
    setSelectedBoxUid(prev => (prev === uid ? null : uid));
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {boxes.map((box) => {
          const isSelected = selectedBoxUid === box.uid;

          return (
            <div
              key={box.uid}
              onClick={() => toggleSelect(box.uid)}
              className={`relative border p-4 rounded-xl shadow bg-white cursor-pointer transition-all duration-200 ${
                isSelected ? "ring-2 ring-[#285082]" : ""
              }`}
            >
              {/* Top toolbar overlay */}
              {isSelected && (
                <div
                  className="absolute top-0 left-0 w-full flex justify-between items-center px-4 py-2 bg-[#285082] text-white rounded-t-xl z-10"
                  onClick={(e) => e.stopPropagation()} // prevent deselect
                >
                  <span className="font-semibold">{box.box_name}</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => startEdit(box.uid)}
                      className="bg-yellow-400 text-[#1e3a5f] px-3 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteBox(box.uid)}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Main content */}
              <div className={`${isSelected ? "pt-12" : ""}`}>
                <p className="text-sm text-gray-500">UID: {box.uid}</p>

                {editMode[box.uid] ? (
                  <input
                    type="text"
                    value={boxChanges[box.uid]?.box_name || ""}
                    onChange={(e) => handleChange(box.uid, "box_name", e.target.value)}
                    className="text-xl font-bold border rounded px-2 mt-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p className="text-xl font-bold mt-2">{box.box_name}</p>
                )}

                {Array.isArray(box.items) && box.items.length > 0 && (
                  <ul className="mt-4 list-disc list-inside text-gray-700">
                    {box.items.map((item) => (
                      <li key={item.id}>
                        {item.item_name} - {item.quantity} pcs
                      </li>
                    ))}
                  </ul>
                )}

                {editMode[box.uid] && (
                  <div className="mt-4 space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => saveChanges(box.uid)}
                      className="bg-green-500 text-white px-4 py-1 rounded"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => cancelEdit(box.uid)}
                      className="bg-gray-400 text-white px-4 py-1 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RFIDList;
