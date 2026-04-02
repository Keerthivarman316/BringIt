import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LiveMap from './LiveMap'; // Wait, let's just omit LiveMap from the global view and conditionally show it when matched

const CarrierDashboard = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [myTrips, setMyTrips] = useState([]);
  
  // Trip creation state
  const [destination, setDestination] = useState('');
  const [capacity, setCapacity] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [ordersRes, tripsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders/pending', { headers }),
        axios.get('http://localhost:5000/api/trips/my-trips', { headers })
      ]);
      setPendingOrders(ordersRes.data);
      setMyTrips(tripsRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/trips', {
        destination,
        capacity: Number(capacity),
        departureTime
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDestination(''); setCapacity(''); setDepartureTime('');
      fetchData(); // Refresh trips
    } catch (err) {
      alert('Error creating trip');
      console.error(err);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    if (myTrips.length === 0) {
      alert("You must create a trip first before accepting an order!");
      return;
    }
    
    // For simplicity in MVP, we just assign the order to their most recent active trip.
    const activeTrip = myTrips[0];

    try {
      await axios.post('http://localhost:5000/api/matches', {
        tripId: activeTrip.id,
        orderId: orderId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData(); // Refresh list so the accepted order disappears from feed
    } catch (err) {
      alert('Error accepting order: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="w-full text-left flex flex-col gap-8">
      {/* Create Trip Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Declare a Trip</h2>
        <form onSubmit={handleCreateTrip} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
              <input type="text" required value={destination} onChange={e => setDestination(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-blue-500" placeholder="e.g. North Dorms" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departure Time</label>
              <input type="datetime-local" required value={departureTime} onChange={e => setDepartureTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Capacity</label>
              <input type="number" required value={capacity} onChange={e => setCapacity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-blue-500" placeholder="Max items" />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded mt-2 w-max">
            Create Trip & Start Driving
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Job Feed */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-800">Available Jobs</h2>
          {pendingOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">No pending jobs available right now.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-800">{order.itemName}</span>
                    <span className="font-bold text-green-600">+${order.deliveryFee}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">From: {order.storeName || 'Anywhere'}</div>
                  <div className="text-xs text-gray-400 mt-1">Requester: {order.requester.name}</div>
                  <button 
                    onClick={() => handleAcceptOrder(order.id)}
                    className="mt-3 w-full bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-1 rounded transition"
                  >
                    Accept Delivery
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Active Trips */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-800">My Trips</h2>
          {myTrips.length === 0 ? (
            <p className="text-gray-500 text-sm">No recorded trips.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {myTrips.map(trip => (
                <div key={trip.id} className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <div className="font-bold text-indigo-900">Trip to {trip.destination}</div>
                  <div className="text-sm text-indigo-700 mt-1">
                    Leaves: {new Date(trip.departureTime).toLocaleString()}
                  </div>
                  <div className="mt-2 pt-2 border-t border-indigo-200 text-sm">
                    <strong>Assigned Orders:</strong> {trip.matches?.length || 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarrierDashboard;
