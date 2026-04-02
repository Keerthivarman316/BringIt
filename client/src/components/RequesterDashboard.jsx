import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RequesterDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [itemName, setItemName] = useState('');
  const [budget, setBudget] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [storeName, setStoreName] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrders(response.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/orders', {
        itemName,
        budget: Number(budget),
        deliveryFee: Number(deliveryFee),
        storeName
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setItemName(''); setBudget(''); setDeliveryFee(''); setStoreName('');
      fetchOrders(); // refresh
    } catch (err) {
      alert('Error placing order');
      console.error(err);
    }
  };

  return (
    <div className="w-full text-left flex flex-col gap-8">
      {/* Create Order Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Place a New Order</h2>
        <form onSubmit={handlePlaceOrder} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <input type="text" required value={itemName} onChange={e => setItemName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-blue-500" placeholder="e.g. 2x Iced Lattes" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store / Location</label>
              <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-blue-500" placeholder="e.g. Starbucks Campus" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Budget ($)</label>
              <input type="number" required value={budget} onChange={e => setBudget(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-blue-500" placeholder="Max price of items" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee ($ Reward)</label>
              <input type="number" required value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-blue-500" placeholder="What you pay the carrier" />
            </div>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-2">
            Submit Request
          </button>
        </form>
      </div>

      {/* Active Orders */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-800">My Active Requests</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500">You haven't placed any orders yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map(order => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-800">{order.itemName}</div>
                  <div className="text-sm text-gray-500">From: {order.storeName || 'Anywhere'}</div>
                  <div className="text-sm text-gray-500">Reward: <span className="font-semibold text-green-600">${order.deliveryFee}</span></div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded text-xs font-bold ${
                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'MATCHED' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {order.status}
                  </span>
                  {order.status === 'MATCHED' && order.match?.trip?.carrier && (
                    <div className="text-xs text-gray-500">
                      Carrier: {order.match.trip.carrier.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequesterDashboard;
