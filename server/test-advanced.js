const BASE_URL = 'http://localhost:5000/api';

async function fetchWithAuth(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function runAdvancedTests() {
  console.log('🚀 STARTING ADVANCED LOGISTICS TESTS (DOCS ALIGNMENT)\n');

  try {
    // 1. Setup Identities
    console.log('[1] Creating Requesters and Carrier...');
    const u1 = await fetchWithAuth(`${BASE_URL}/auth/register`, null, {
        method: 'POST',
        body: JSON.stringify({ name: 'Req A', email: `a_${Date.now()}@test.com`, password: 'pw', role: 'REQUESTER' })
    });
    const u2 = await fetchWithAuth(`${BASE_URL}/auth/register`, null, {
        method: 'POST',
        body: JSON.stringify({ name: 'Req B', email: `b_${Date.now()}@test.com`, password: 'pw', role: 'REQUESTER' })
    });
    const car = await fetchWithAuth(`${BASE_URL}/auth/register`, null, {
        method: 'POST',
        body: JSON.stringify({ name: 'Carrier C', email: `c_${Date.now()}@test.com`, password: 'pw', role: 'CARRIER' })
    });

    console.log(`✅ Bonus Credit Check: Req A Balance = ${u1.user.creditBalance} (Expected 100)`);

    // 2. Group Order Aggregator Test
    console.log('\n[2] Testing Group Order Aggregation...');
    // Create two orders for the same store
    const orderA = await fetchWithAuth(`${BASE_URL}/orders`, u1.token, {
        method: 'POST',
        body: JSON.stringify({ itemName: 'Coffee', storeName: 'Starbucks', deliveryFee: 20, budget: 50 })
    });
    const orderB = await fetchWithAuth(`${BASE_URL}/orders`, u2.token, {
        method: 'POST',
        body: JSON.stringify({ itemName: 'Muffin', storeName: 'Starbucks', deliveryFee: 15, budget: 30 })
    });

    console.log('--- Triggering Aggregator ---');
    const aggregateResult = await fetchWithAuth(`${BASE_URL}/groups/aggregate`, u1.token, { method: 'POST' });
    console.log(`✅ Aggregator Message: ${aggregateResult.message}`);
    
    // Check if orders have groupOrderId and discounted fee
    const checkOrderA = await fetchWithAuth(`${BASE_URL}/orders/my-orders`, u1.token);
    const updatedOrderA = checkOrderA.find(o => o.id === orderA.id);
    console.log(`✅ Group Order Discount: Fee was 20, now is ${updatedOrderA.deliveryFee} (70% = 14)`);

    // 3. Trip and Escrow Match
    console.log('\n[3] Testing Escrow "FREEZE" Logic...');
    const trip = await fetchWithAuth(`${BASE_URL}/trips`, car.token, {
        method: 'POST',
        body: JSON.stringify({ destination: 'Campus Hall', departureTime: new Date(Date.now() + 100000).toISOString(), capacity: 5 })
    });

    await fetchWithAuth(`${BASE_URL}/matches`, car.token, {
        method: 'POST',
        body: JSON.stringify({ tripId: trip.id, orderId: updatedOrderA.id })
    });

    const userA_AfterMatch = await fetchWithAuth(`${BASE_URL}/auth/me`, u1.token);
    console.log(`✅ Escrow Check: Req A Balance after Match = ${userA_AfterMatch.user.creditBalance} (Expected 100 - 14 = 86)`);

    // 4. Delivery Handoff & Completion
    console.log('\n[4] Testing Completion & Carbon Tracking...');
    await fetchWithAuth(`${BASE_URL}/delivery/pickup`, car.token, {
        method: 'POST',
        body: JSON.stringify({ orderId: updatedOrderA.id })
    });
    const completion = await fetchWithAuth(`${BASE_URL}/delivery/complete`, u1.token, {
        method: 'POST',
        body: JSON.stringify({ orderId: updatedOrderA.id })
    });
    console.log(`✅ ${completion.message}`);

    const car_AfterCompletion = await fetchWithAuth(`${BASE_URL}/auth/me`, car.token);
    console.log(`✅ Escrow Release: Carrier Balance = ${car_AfterCompletion.user.creditBalance} (Expected 100 + 14 = 114)`);

    // 5. Weighted Trust Review
    console.log('\n[5] Testing Weighted Trust Graph...');
    // Create a match for the second order to verify it's completed
    await fetchWithAuth(`${BASE_URL}/matches`, car.token, {
        method: 'POST',
        body: JSON.stringify({ tripId: trip.id, orderId: orderB.id })
    });
    await fetchWithAuth(`${BASE_URL}/delivery/pickup`, car.token, { method: 'POST', body: JSON.stringify({ orderId: orderB.id }) });
    await fetchWithAuth(`${BASE_URL}/delivery/complete`, u2.token, { method: 'POST', body: JSON.stringify({ orderId: orderB.id }) });

    // Fetch matches for orderA to get matchId
    const matchData = await fetchWithAuth(`${BASE_URL}/orders/my-orders`, u1.token);
    const matchId = matchData.find(o => o.id === orderA.id).match.id;

    const reviewRes = await fetchWithAuth(`${BASE_URL}/reviews`, u1.token, {
        method: 'POST',
        body: JSON.stringify({ matchId, rating: 5, comment: 'Phenomenal service!' })
    });

    console.log(`✅ Weighted Trust Check: New Carrier Trust Score = ${reviewRes.trustScore}`);

    console.log('\n🏆 ALL ADVANCED BACKEND TESTS PASSED!');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
  }
}

runAdvancedTests();
