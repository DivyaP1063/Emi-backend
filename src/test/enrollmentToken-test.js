require('dotenv').config();
const { initializeAndroidManagement, generateEnrollmentToken } = require('../services/androidManagementService');

async function testEnrollmentToken() {
    console.log('🧪 Testing Enrollment Token Generation\n');
    
    try {
        // Initialize AMAPI
        console.log('1. Initializing AMAPI...');
        await initializeAndroidManagement();
        
        // Generate token
        console.log('\n2. Generating enrollment token...');
        const result = await generateEnrollmentToken(
            'test-customer-123',  // Test customer ID
            process.env.ANDROID_MANAGEMENT_DEFAULT_POLICY_ID,            // Your policy
            3600                  // 1 hour
        );
        
        // Verify result
        console.log('\n3. Results:');
        console.log('✅ Success:', result.success);
        console.log('✅ Token:', result.token?.substring(0, 20) + '...');
        console.log('✅ Expires:', result.expirationTime);
        console.log('✅ Policy:', result.policyName);
        
        // Validate token format
        if (result.token && result.token.length > 10) {
            console.log('\n✅ TOKEN IS VALID!');
        } else {
            console.log('\n❌ TOKEN SEEMS INVALID!');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

testEnrollmentToken();