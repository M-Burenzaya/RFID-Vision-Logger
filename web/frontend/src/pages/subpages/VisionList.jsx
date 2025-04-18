import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react"; // <-- Add icons
import api from "../../api";

const VisionList = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users");
      setUsers(response.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const capitalizeName = (name) =>
    name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const handleEdit = (user) => {
    const capitalizedUser = {
      ...user,
      name: capitalizeName(user.name),
    };
    navigate("../add", { state: { ...capitalizedUser, fromList: true } });
  };

  const deleteUser = async (userId) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    try {
      await api.delete(`/delete-user/${userId}`);
      console.log("[INFO] User deleted");
      fetchUsers();  // Refresh list
      setSelectedUserId(null);
    } catch (err) {
      console.error("Failed to delete user", err);
      alert("Failed to delete user.");
    }
  };

  const toggleSelect = (userId) => {
    setSelectedUserId(prev => (prev === userId ? null : userId));
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {users.map(user => {
          const isSelected = selectedUserId === user.id;

          return (
            <div
              key={user.id}
              onClick={() => toggleSelect(user.id)}
              className={`relative cursor-pointer flex flex-col items-center p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 ${
                isSelected ? "ring-1 ring-[#285082]" : ""
              }`}
            >
              {isSelected && (
                <div
                  className="absolute top-0 left-0 w-full flex justify-center sm:justify-between items-center px-4 py-2 bg-[#285082] text-white z-10 rounded-t-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="hidden sm:block font-semibold text-sm truncate">
                    {capitalizeName(user.name)}
                  </span>

                  <div className="space-x-2 flex items-center">
                    <button
                      onClick={() => handleEdit(user)}
                      className="bg-white text-[#285082] p-1 rounded-full hover:bg-gray-200"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="bg-white text-[#285082] p-1 rounded-full hover:bg-gray-200"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}

              <img
                src={`http://localhost:8000${user.image_url}`}
                alt={user.name}
                className={`w-24 h-24 object-cover rounded-full mb-2 border ${isSelected ? "opacity-50" : "opacity-100"}`}
              />
              <p className="capitalize text-lg font-medium">{capitalizeName(user.name)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VisionList;
