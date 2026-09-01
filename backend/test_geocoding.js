require('dotenv').config();

/**
 * Test the geocoding function
 */
async function geocodeLocation(city, pincode, country = 'India') {
    try {
        const query = pincode ? `${pincode}, ${city}, ${country}` : `${city}, ${country}`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;

        console.log(`🌍 Geocoding: ${query}`);
        console.log(`   URL: ${url}\n`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'ReactWebsiteApp/1.0'
            }
        });

        const data = await response.json();

        if (data && data.length > 0) {
            const coords = {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
            console.log(`✅ Geocoded successfully!`);
            console.log(`   Coordinates: ${coords.latitude}, ${coords.longitude}`);
            console.log(`   Location: ${coords.display_name}\n`);
            return coords;
        }

        console.warn(`⚠️ Geocoding failed for ${query}\n`);
        return null;
    } catch (error) {
        console.error('❌ Geocoding error:', error);
        return null;
    }
}

async function testGeocoding() {
    console.log('🧪 Testing Geocoding Implementation\n');
    console.log('='.repeat(60) + '\n');

    // Test cases
    const testCases = [
        { city: 'Gorari', pincode: '802214', description: 'Existing shop location' },
        { city: 'Mumbai', pincode: '400001', description: 'Major city with pincode' },
        { city: 'Delhi', pincode: '110001', description: 'Capital city' },
        { city: 'Bangalore', pincode: '560001', description: 'Tech hub' },
        { city: 'Patna', pincode: '800001', description: 'Bihar capital' }
    ];

    for (const testCase of testCases) {
        console.log(`📍 Test: ${testCase.description}`);
        console.log(`   Input: ${testCase.city}, ${testCase.pincode}`);
        await geocodeLocation(testCase.city, testCase.pincode);

        // Respect Nominatim's usage policy: max 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1100));
    }

    console.log('='.repeat(60));
    console.log('✅ Geocoding tests complete!\n');
}

testGeocoding();
