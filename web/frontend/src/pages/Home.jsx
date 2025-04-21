import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import api from "../api";


const HomePage = () => {
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [ws, setWs] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);

  const [isCreatingLog, setIsCreatingLog] = useState(false);
  const [isPersonFound, setIsPersonFound] = useState(false);

  const isAddingPerson = useRef(false);

  const [isFaceCentered, setIsFaceCentered] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [countdownActive, setCountdownActive] = useState(false);

  const [detectedName, setDetectedName] = useState(null);
  const [confirmedPerson, setConfirmedPerson] = useState(null);
  const [isRecognitionDone, setIsRecognitionDone] = useState(false);

  const [userList, setUserList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);  // 👈 Create ref for search area

  const [manualAdding, setManualAdding] = useState(false); // 👈 Add new state

  const navigate = useNavigate();

  const placeholderImage = "/default-placeholder.svg";

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
  
        // Reset search if user didn't confirm a real user
        if (!userList.some(user => capitalizeName(user.name) === searchTerm)) {
          if (confirmedPerson) {
            setSearchTerm(confirmedPerson); // Back to last confirmed person
          } else {
            setSearchTerm(""); // Otherwise, clear
          }
        }
      }
    }
  
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchTerm, confirmedPerson, userList]);
  

  useEffect(() => {
    const socketRef = { current: null };

    const timer = setTimeout(() => {
      const socket = new WebSocket("ws://localhost:8000/ws");

      socket.onopen = () => {
        setConnectionStatus("Connected");
        console.log("WebSocket connected.");
      };

      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          const json = JSON.parse(event.data);

          if (json.type === "auto_trigger") {
            setIsFaceCentered(json.status);
          } else if (json.type === "recognition") {

            // console.log("Recognition result:", json.name);
            
            if (!isAddingPerson.current) {  
              // console.log("isAddingPerson:", isAddingPerson);

              if (json.name) {
                setDetectedName(capitalizeName(json.name));
                setSearchTerm(capitalizeName(json.name));
                showSavedImage(json.name);
              } else {
                setDetectedName(null);
              }

              setIsRecognitionDone(true);

              if (json.name) {
                api.post("/stopContinuous").then(() => {
                  console.log("Continuous capture stopped after recognition");
                }).catch(err => {
                  console.error("Failed to stop continuous capture:", err);
                });
              }
            }
          }
        } else if (event.data instanceof Blob) {
          const url = URL.createObjectURL(event.data);
          setImageSrc(url);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
      };

      socket.onclose = () => {
        setConnectionStatus("Disconnected");
        console.log("WebSocket connection closed.");
      };

      setWs(socket);
      socketRef.current = socket;
    }, 500);

    return () => {
      clearTimeout(timer);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isFaceCentered) {
      if (!countdownActive && countdown === null) {
        setCountdownActive(true);
        setCountdown(3);
      }
    } else {
      if (countdownActive || countdown !== null) {
        setCountdownActive(false);
        setCountdown(null);
      }
    }
  }, [isFaceCentered]);

  useEffect(() => {
    if (!countdownActive || countdown === null) return;

    if (countdown === 0) {
      triggerOnce();
      setCountdown(null);
      setCountdownActive(false);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, countdownActive]);

  const formatFilename = (name) => {
    return name.trim().toLowerCase().replace(/\s+/g, "_") + ".jpg";
  };
  
  const getUserImageUrl = (filename) => {
    return `http://localhost:8000/user-image/${filename}`;
  };
  
  const showSavedImage = (name) => {
    const filename = formatFilename(name);
    const imageUrl = getUserImageUrl(filename);
  
    // Test if image exists
    fetch(imageUrl)
      .then(res => {
        if (res.ok) {
          setImageSrc(imageUrl);  // image exists, set it
        } else {
          setImageSrc("/default-placeholder.svg");  // fallback image
        }
      })
      .catch(() => {
        setImageSrc("/default-placeholder.svg");  // fallback image on network error
      });
  };
  
  

  const triggerOnce = async () => {
    try {
      await api.post("/triggerOnce");
    } catch (error) {
      console.error("Trigger Once Error:", error);
    }
  };

  const triggerContinuous = async () => {
    try {
      await api.post("/startContinuous");
    } catch (error) {
      console.error("Start Continuous Error:", error);
    }
  }

  const handleConfirmYes = () => {
    setConfirmedPerson(detectedName);
    setShowDropdown(false);  // Hide dropdown if still open
  };
  

  const handleAnotherPerson = () => {
    isAddingPerson.current = true;
    setManualAdding(true); // 👈 Activate manual adding mode

    setDetectedName(null);
    setIsRecognitionDone(false);
    setConfirmedPerson(null);
    
    triggerContinuous();
  };
  

  const handleUserSelect = (name) => {
    const capitalizedName = capitalizeName(name);
    setDetectedName(capitalizedName);
    showSavedImage(capitalizedName);
    setIsRecognitionDone(true);
    setShowDropdown(false);  // Hide dropdown after selection
  };
  
  const handleAddPerson = () => {
    navigate("/add"); // Go to add person page
  };

  const handleNext = () => {
    // Save person info if needed and go to next step
    navigate("/select-items", { state: { personName: confirmedPerson } });
  };

  const capitalizeName = (name) =>
    name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUserList(res.data);
      setFilteredUsers(res.data);  // 👈 initialize both
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handleStartLog = async () => {
    setIsCreatingLog(true);
    
    try {
      await setShowFeatures(true);
      await setAutoCapture(true);
      await fetchUsers();  // <-- Fetch users list when starting!
      await triggerContinuous();
  
    } catch (error) {
      console.error("Failed to start continuous capture", error);
    }
  };

  const setAutoCapture = async (enabled) => {
    try {
      await api.post("/setAutoCapture", { auto_capture: enabled });
      console.log("AutoCapture set to", enabled);
    } catch (error) {
      console.error("Failed to set auto capture:", error);
    }
  };
  
  const setShowFeatures = async (enabled) => {
    try {
      await api.post("/setShowFeatures", { show_features: enabled });
      console.log("ShowFeatures set to", enabled);
    } catch (error) {
      console.error("Failed to set show features:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {!isCreatingLog ? (
        <>
          <img src={imageSrc} alt="Start Placeholder" className="w-[500px] h-auto mb-8" />
          <button
            onClick={handleStartLog}
            className="bg-[#285082] text-white px-8 py-4 rounded-md text-2xl hover:bg-[#1f407a]"
          >
            Create Log
          </button>
        </>
      ) : (

        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          
          {!isAddingPerson.current ? (
            <div ref={searchRef} className="relative w-80 mb-4">

              {/* Search bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    setShowSearchDropdown(true);

                    const filtered = userList.filter(user =>
                      user.name.toLowerCase().includes(value.toLowerCase())
                    );
                    setFilteredUsers(filtered);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 pr-10"
                />

                {/* Search icon */}
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>

              </div>
              
              {showSearchDropdown && (

                <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-md max-h-60 overflow-y-auto z-50">
                  
                  {filteredUsers.map((user) => (

                    <button
                      key={user.id}
                      onClick={() => {
                        const name = capitalizeName(user.name);
                        handleUserSelect(name);
                        setConfirmedPerson(name);
                        setSearchTerm(name);
                        setShowSearchDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      {capitalizeName(user.name)}
                    </button>

                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="relative w-80 h-80 border rounded-md overflow-hidden">
            {countdownActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-6xl font-bold z-20">
                {countdown}
              </div>
            )}
            {!detectedName && (
              <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                <img
                  src="/portrait_guide_overlay.svg"
                  alt="Guide Overlay"
                  className="absolute top-0 left-0 w-full h-full object-contain opacity-50 pointer-events-none z-10"
                />
              </div>
            )}
            <img
              src={imageSrc || placeholderImage}
              alt="Camera feed"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Show detected name after recognition */}
          {isRecognitionDone && (
            <div className="flex flex-col items-center space-y-4">
              {detectedName ? (
                <>
                  <div className="text-xl font-semibold text-gray-800">
                    Are you <span className="text-blue-600">{detectedName}</span>?
                  </div>
                  <div className="flex space-x-4">

                    <button
                      onClick={handleAnotherPerson}
                      className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                    >
                      Another Person?
                    </button>
                    
                    <button
                      onClick={handleConfirmYes}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Yes
                    </button>

                  </div>
                </>
              ) : manualAdding ? ( // 👈 if manual adding
                <>
                  <input
                    type="text"
                    placeholder="Enter name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-80 px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                  />
                  <button
                    onClick={handleAddPerson}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Add Person
                  </button>
                </>
              ) : (
                <>

                  <div className="text-xl font-semibold text-red-600">
                    Person not recognized
                  </div>

                  <button
                    onClick={handleAddPerson}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Add Person
                  </button>

                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;
