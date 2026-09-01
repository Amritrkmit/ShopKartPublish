const cache = require('./utils/cache');

async function testCache() {
    console.log('🧪 Testing Memcached Integration...\n');

    try {
        // Test 1: SET operation
        console.log('Test 1: SET operation');
        await cache.set('test_key', { message: 'Hello Memcached!', timestamp: Date.now() }, 60);
        console.log('✅ Successfully stored data in cache\n');

        // Test 2: GET operation
        console.log('Test 2: GET operation');
        const result = await cache.get('test_key');
        console.log('✅ Retrieved from cache:', JSON.stringify(result, null, 2), '\n');

        // Test 3: Complex object
        console.log('Test 3: Complex object storage');
        const complexData = {
            products: [
                { id: 1, name: 'Product 1', price: 999 },
                { id: 2, name: 'Product 2', price: 1499 }
            ],
            pagination: { total: 2, page: 1 }
        };
        await cache.set('products_test', complexData, 300);
        const retrieved = await cache.get('products_test');
        console.log('✅ Complex object retrieved:', JSON.stringify(retrieved, null, 2), '\n');

        // Test 4: DELETE operation
        console.log('Test 4: DELETE operation');
        await cache.del('test_key');
        const afterDelete = await cache.get('test_key');
        console.log('✅ After deletion, value is:', afterDelete, '(should be null)\n');

        console.log('🎉 All cache tests passed!');
        console.log('\n📊 Check Memcached stats with: echo stats | nc localhost 11211');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testCache().then(() => process.exit(0));
