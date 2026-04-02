const BASE_URL = 'http://localhost:5000/api';

async function fetchWithJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function runTests() {
  console.log('--- STARTING REST API TESTS ---');

  try {
    // 1. Register a Requester
    console.log('\n[1] Registering Requester...');
    const reqData = await fetchWithJson(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alice Requester',
        email: `alice_${Date.now()}@campus.edu`,
        password: 'password123',
        role: 'REQUESTER'
      })
    });
    console.log('✅ Requester Registered:', reqData.user.email);
    const reqToken = reqData.token;

    // 2. Register a Carrier
    console.log('\n[2] Registering Carrier...');
    const carData = await fetchWithJson(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bob Carrier',
        email: `bob_${Date.now()}@campus.edu`,
        password: 'password123',
        role: 'CARRIER'
      })
    });
    console.log('✅ Carrier Registered:', carData.user.email);
    const carToken = carData.token;

    // 3. Login Test
    console.log('\n[3] Testing Login...');
    const loginData = await fetchWithJson(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: reqData.user.email,
        password: 'password123',
      })
    });
    console.log('✅ Login Successful for:', loginData.user.email);

    // 4. Create an Order (as Requester)
    console.log('\n[4] Creating Target Order...');
    const orderData = await fetchWithJson(`${BASE_URL}/orders`, {
      method: 'POST',
      body: JSON.stringify({
        itemName: 'Boba Tea',
        itemDescription: 'Matcha milk tea with boba',
        quantity: 2,
        storeName: 'Campus Boba Stop',
        budget: 120, // BringIt credits
        deliveryFee: 15, // BringIt credits
        urgencyLevel: 'URGENT'
      }),
      headers: { Authorization: `Bearer ${reqToken}` }
    });
    console.log('✅ Order Created. ID:', orderData.id, '| Status:', orderData.status);

    // 5. Create a Trip (as Carrier)
    console.log('\n[5] Announcing Trip...');
    const tripData = await fetchWithJson(`${BASE_URL}/trips`, {
      method: 'POST',
      body: JSON.stringify({
        destination: 'North Dormitory',
        departureTime: new Date(Date.now() + 60*60*1000).toISOString(), // 1 hour from now
        capacity: 3
      }),
      headers: { Authorization: `Bearer ${carToken}` }
    });
    console.log('✅ Trip Scheduled. ID:', tripData.id, '| Destination:', tripData.destination);

    // 6. Fetch Requester's Orders
    console.log('\n[6] Fetching My Orders...');
    const fetchOrders = await fetchWithJson(`${BASE_URL}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${reqToken}` }
    });
    console.log(`✅ Found ${fetchOrders.length} orders for Requester.`);
    
    // 7. Test Drop Zone creation
    console.log('\n[7] Creating Seed DropZone...');
    const dropData = await fetchWithJson(`${BASE_URL}/dropzones`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Library Front Desk',
        description: 'Hand over to the librarian',
        lat: 40.7128,
        lng: -74.0060
      }),
      headers: { Authorization: `Bearer ${carToken}` }
    });
    console.log(`✅ DropZone Created: ${dropData.name}`);

    console.log('\n--- ALL TESTS PASSED SUCCESSFULLY! 🚀 ---');
  } catch (error) {
    if (error.data) {
      console.error('\n❌ TEST FAILED:', error.status, error.data);
    } else {
      console.error('\n❌ TEST ERROR:', error.message);
    }
  }
}

runTests();
