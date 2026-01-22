const base = 'http://localhost:4000';
const household = 'house-1';

async function run() {
  try {
    // Create
    let res = await fetch(`${base}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-household-id': household },
      body: JSON.stringify({ make: 'Sony', model: 'X1', value: 100 }),
    });
    const created = await res.json();
    console.log('CREATED', created);

    // List
    res = await fetch(`${base}/assets`, { headers: { 'x-household-id': household } });
    const list = await res.json();
    console.log('LIST', list);

    // Get single
    res = await fetch(`${base}/assets/${created.id}`, { headers: { 'x-household-id': household } });
    const single = await res.json();
    console.log('GET', single);

    // Update
    res = await fetch(`${base}/assets/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-household-id': household },
      body: JSON.stringify({ value: 150 }),
    });
    const updated = await res.json();
    console.log('UPDATED', updated);

    // Delete
    res = await fetch(`${base}/assets/${created.id}`, {
      method: 'DELETE',
      headers: { 'x-household-id': household },
    });
    const del = await res.json();
    console.log('DELETED', del);

    // Verify list empty
    res = await fetch(`${base}/assets`, { headers: { 'x-household-id': household } });
    const after = await res.json();
    console.log('AFTER', after);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
}

run();
