import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw } from "lucide-react";
import api from "../api";


const HomePage = () => {
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [ws, setWs] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);

  const [isCreatingLog, setIsCreatingLog] = useState(false);
  const [isAddingPerson, setIsAddingPerson] = useState(false);

  const [hasCaptured, setHasCaptured] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const isAnotherPersonRef = useRef(false);

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
  const searchRef = useRef(null);

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
            
            if (!isAnotherPersonRef.current) {  
              // console.log("isAnotherPersonRef:", isAnotherPersonRef);

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
    if (isFaceCentered && !isRecognitionDone) {
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
  }, [isFaceCentered, isRecognitionDone]);

  useEffect(() => {
    if (!countdownActive || countdown === null) return;

    if (countdown === 0) {
      triggerOnce();
      setCountdown(null);
      setCountdownActive(false);
      setIsAddingPerson(true);
      setHasCaptured(true);

      console.log("Counter reached zero, isAddingPerson: " + isAddingPerson);
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

  const stopContinuous = async () => {
    try {
      await api.post("/stopContinuous");
    } catch (error) {
      console.error("Stop Continuous Error:", error);
    }
  }

  const handleConfirmYes = async () => {
    await stopContinuous();
    setConfirmedPerson(detectedName); // Keep updating the state for internal logic
    setShowDropdown(false);
    navigate("/home/select-items", { state: { personName: detectedName } }); // ✅ use detectedName directly
  };
  

  const handleAnotherPerson = () => {
    isAnotherPersonRef.current = true;
    setIsAddingPerson(true);

    setDetectedName(null);
    setIsRecognitionDone(false);
    setConfirmedPerson(null);
    setSearchTerm("");
    
    triggerContinuous();
  };
  

  const handleUserSelect = (name) => {
    const capitalizedName = capitalizeName(name);

    setDetectedName(capitalizedName);
    showSavedImage(capitalizedName);

    setIsRecognitionDone(true);
    setShowDropdown(false);  // Hide dropdown after selection

    setIsAddingPerson(false);
    
    stopContinuous();
  };
  
  const handleReturn = async () => {
    // if (!isAddingPerson) {
    //   // Normal "Return" from home
    //   await stopContinuous();
    //   setIsCreatingLog(false); // Hide everything and go back to Home
    //   setImageSrc(null);       // Clear camera feed
    //   setDetectedName(null);   // Clear detected name
    //   setConfirmedPerson(null);
    //   setIsRecognitionDone(false);
    //   setSearchTerm("");       // Clear search bar
    //   setShowSearchDropdown(false);
    //   isAnotherPersonRef.current = false;
    //   return;
    // }
  
    // If "Adding Person" mode
    await stopContinuous();
    setIsCreatingLog(false); // Hide everything and go back to Home
    setImageSrc(null);       // Clear camera feed

    setIsAddingPerson(false);
    setIsRecognitionDone(false);
    setConfirmedPerson(null);
    setDetectedName(null);
    setSearchTerm("");
    setNameInput("");
    setShowSearchDropdown(false);
    isAnotherPersonRef.current = false;
  
    // await triggerContinuous();
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
      // console.log("AutoCapture set to", enabled);
    } catch (error) {
      console.error("Failed to set auto capture:", error);
    }
  };
  
  const setShowFeatures = async (enabled) => {
    try {
      await api.post("/setShowFeatures", { show_features: enabled });
      // console.log("ShowFeatures set to", enabled);
    } catch (error) {
      console.error("Failed to set show features:", error);
    }
  };

  const handleCaptureImage = async () => {
    try {
      setHasCaptured(false);
      triggerContinuous();
    } catch (error) {
      console.error("Capture Image Error:", error);
    }
  };


  const handleAddUser = async () => {
    if (nameInput.trim() === "") {
      alert("Please enter a name.");
      return;
    }
  
    if (!hasCaptured) {
      alert("Please capture an image before saving.");
      return;
    }
  
    try {
      const payload = { name: nameInput };
  
      const response = await api.post("/add-user", payload);
      if (response.status === 200) {
        alert("User added successfully!");
        navigate("/home/select-items", { state: { personName: nameInput } });
      }
  
      setIsAddingPerson(false);
      setHasCaptured(false);
      setSearchTerm("");
      setConfirmedPerson(null);
      setDetectedName(null);
      setIsRecognitionDone(false);
      isAnotherPersonRef.current = false;

    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to save user.");
    }
  };
  

  return (
    <div className="flex flex-col items-center justify-center">
      {!isCreatingLog ? (
        <>
          <img src={imageSrc || placeholderImage} alt="Start Placeholder" className="w-[600px] h-auto mb-8" />
          <button
            onClick={handleStartLog}
            className="bg-[#285082] text-white px-8 py-4 rounded-md text-2xl hover:bg-[#1f407a]"
          >
            Create Log
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center w-full px-8">

          <div className="flex flex-col items-center w-full max-w-xl space-y-8 mt-6">

            <div ref={searchRef} className="relative max-w-80 mb-4">

              {/* Search bar */}
              <div className="relative w-full">
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

            <div className="relative w-full h-auto border rounded-md overflow-hidden">
              {/* Retry Icon Button (Bottom Right) */}
              {hasCaptured && (
              <div className="absolute bottom-3 right-3 z-10">
                <button
                  onClick={handleCaptureImage}
                  className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 active:bg-gray-200"
                  title="Retry"
                >
                  <RotateCcw className="h-12 w-12 text-[#285082]" />
                </button>
              </div>
              )}
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
          </div>


          {!isAddingPerson && !detectedName && (
            <div className="flex flex-col w-full items-center space-y-4 mt-4">

              <button
                onClick={handleReturn}
                className="w-full max-w-60 p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
                hover:bg-[#f0f8ff] active:bg-[#285082] active:text-white"
              >
                Return
              </button>

            </div>
          )}
         
          
          {/* Show detected name after recognition */}
          {isRecognitionDone && (
            <div className="flex w-full max-w-xl flex-col items-center space-y-4">
              {detectedName && (
                <div className="flex flex-col w-full items-center space-y-4 mt-4">
                  <div className="text-xl text-[#285082]">
                    Are you <span className="font-bold">{detectedName}</span>?
                  </div>

                  <div className="flex w-full gap-4">
                    <button
                      onClick={handleAnotherPerson}
                      className="w-full p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
                      hover:bg-[#f0f8ff] active:bg-[#285082] active:text-white"                  >
                      Another Person?
                    </button>
                    <button
                      onClick={handleConfirmYes}
                      className="w-full p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
                      hover:bg-[#f0f8ff] active:bg-[#285082] active:text-white"
                    >
                      Yes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
                
          {isAddingPerson && (
            <div className="flex w-full max-w-xl flex-col items-center space-y-4">
              <div className="flex flex-col w-full items-center space-y-4 mt-4">

                <input
                  type="text"
                  placeholder="Enter name..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-80 px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                />

                {/* <div className="text-xl font-semibold text-red-600">
                  Person not recognized
                </div> */}

                <div className="flex w-full gap-4">

                  <button
                    onClick={handleReturn}
                    className="w-full p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
                    hover:bg-[#f0f8ff] active:bg-[#285082] active:text-white"
                  >
                    Return
                  </button>

                  <button
                    onClick={handleAddUser}
                    className="w-full p-2 border border-[#285082] bg-white text-[#285082] rounded-md cursor-pointer 
                    hover:bg-[#f0f8ff] active:bg-[#285082] active:text-white"
                  >
                    Add Person
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      )}
    </div>
  );
};

export default HomePage;
