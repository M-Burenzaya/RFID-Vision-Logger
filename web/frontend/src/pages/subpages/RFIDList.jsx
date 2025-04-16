import React, { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import api from "../../api";
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
      const response = await api.get("/get-all-boxes");
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
    await api.put(`/update-box/${updatedBox.id}`, updatedBox);
    setEditMode((prev) => ({ ...prev, [uid]: false }));
    fetchBoxes();
    setSelectedBoxUid(null);
  };

  const deleteBox = async (uid) => {
    const confirmed = window.confirm("Are you sure you want to delete this box?");
    if (!confirmed) return;

    try {
      const box = boxes.find((b) => b.uid === uid);
      await api.delete(`/delete-box/${box.id}`);
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
              className={`relative border p-4 rounded-xl shadow bg-white cursor-pointer transition-all duration-200 transform hover:shadow-lg ${
                isSelected ? "ring-1 ring-[#285082]" : ""
              }`}
            >
              {/* Top toolbar overlay */}
              {isSelected && (
                <div
                  className="absolute top-0 left-0 w-full flex justify-between items-center px-4 py-2 bg-[#285082] text-white z-10 rounded-t-md"
                  onClick={(e) => e.stopPropagation()} // prevent deselect
                >
                  <span className="font-semibold">{box.box_name}</span>
                  <div className="space-x-2 flex items-center">
                    <button
                      onClick={() => startEdit(box.uid)}
                      className="bg-white text-[#285082] p-1 rounded-full hover:bg-gray-200"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => deleteBox(box.uid)}
                      className="bg-white text-[#285082] p-1 rounded-full hover:bg-gray-200"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Main content */}
              <div className={`${isSelected ? "opacity-50" : "opacity-100"} select-none`}>
                
                {editMode[box.uid] ? (
                  <p className="text-xl font-bold">
                    {boxChanges[box.uid]?.box_name || box.box_name}
                  </p>
                ) : (
                  <p className="text-xl font-bold">{box.box_name}</p>
                )}

                <p className="text-sm text-gray-500 mt-2">UID: {box.uid}</p>

                {Array.isArray(box.items) && box.items.length > 0 && (
                  <ul className="mt-4 list-disc list-inside text-gray-700">
                    {box.items.map((item) => (
                      <li key={item.id}>
                        {item.item_name} - {item.quantity} pcs
                      </li>
                    ))}
                  </ul>
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
