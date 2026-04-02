import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import Login from './components/Login'
import Register from './components/Register'
import RequesterDashboard from './components/RequesterDashboard'
import CarrierDashboard from './components/CarrierDashboard'

const MainContent = ({ socketStatus, user, handleLogout }) => {
  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">WebSocket Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            socketStatus === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {socketStatus}
          </span>
        </div>

        {user ? (
          <div className="mt-4 flex flex-col justify-center items-center">
            <h2 className="text-2xl font-bold text-gray-800">Welcome, {user.name}!</h2>
            <div className="flex gap-4 items-center mb-6">
              <span className="text-gray-500 font-medium">Logged in as {user.role}</span>
              <button onClick={handleLogout} className="bg-red-50 hover:bg-red-100 text-red-600 font-medium py-1 px-4 rounded-lg transition text-sm text-center">Logout</button>
            </div>
            
            {/* Dynamic Dashboard Injection */}
            {user.role === 'REQUESTER' && <RequesterDashboard />}
            {user.role === 'CARRIER' && <CarrierDashboard />}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4">
            <Link to="/login" className="bg-gray-50 hover:bg-gray-100 p-4 rounded-lg font-medium text-gray-700 transition">
              Login
            </Link>
            <Link to="/register" className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg font-medium text-white transition">
              Create Account
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [socketStatus, setSocketStatus] = useState('Disconnected');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      setSocketStatus('Connected');
    });

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
    });

    return () => socket.disconnect();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 p-8 text-center flex flex-col items-center">
        <Link to="/">
          <h1 className="text-4xl font-extrabold text-blue-600 mb-6 tracking-tight">BringIt</h1>
        </Link>
        
        <Routes>
          <Route path="/" element={<MainContent socketStatus={socketStatus} user={user} handleLogout={handleLogout} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
