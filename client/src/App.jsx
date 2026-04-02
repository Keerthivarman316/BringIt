import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'

function App() {
  const [socketStatus, setSocketStatus] = useState('Disconnected');

  useEffect(() => {
    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      setSocketStatus('Connected');
    });

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
    });

    return () => socket.disconnect();
  }, [])

  return (
    <Router>
      <div className="min-h-screen p-8 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold text-blue-600 mb-6 tracking-tight">BringIt</h1>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">WebSocket Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              socketStatus === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {socketStatus}
            </span>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <Link to="/login" className="bg-gray-50 hover:bg-gray-100 p-4 rounded-lg font-medium text-gray-700 transition">
              Login Route Test
            </Link>
            <Link to="/register" className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg font-medium text-white transition">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </Router>
  )
}

export default App
