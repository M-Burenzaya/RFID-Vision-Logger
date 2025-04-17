import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import api from "../../api";

const VisionList = () => {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/users")
      .then(res => setUsers(res.data))
      .catch(err => console.error("Failed to fetch users:", err));
  }, []);

  const capitalizeName = (name) =>
  name
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const handleUserClick = (user) => {
    const capitalizedUser = {
      ...user,
      name: capitalizeName(user.name),
    };
    navigate("../add", { state: { ...capitalizedUser, fromList: true } });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {users.map(user => (
        <div
          key={user.id}
          onClick={() => handleUserClick(user)}
          className="cursor-pointer flex flex-col items-center p-4 bg-white rounded-2xl shadow-md hover:shadow-lg"
        >
          <img
            src={`http://localhost:8000${user.image_url}`}
            alt={user.name}
            className="w-24 h-24 object-cover rounded-full mb-2 border"
          />
          <p className="capitalize text-lg font-medium">{user.name}</p>
        </div>
      ))}
    </div>
  );
};

export default VisionList;
