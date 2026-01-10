require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function decodeTokenAndCheck() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Ask frontend team to provide their token
        console.log('=== TOKEN DEBUGGING ===');
        console.log('Please ask the frontend team to provide:');
        console.log('1. The full Authorization token they are using');
        console.log('2. The recovery person ID from their decoded token\n');

        const customerId = '6952d1151709de3521e201cb';
        const recoveryPersonIdFromDB = '6952d66e033424f426802972';

        console.log('=== EXPECTED FLOW ===');
        console.log(`Customer ID: ${customerId}`);
        console.log(`Should be assigned to RecoveryPerson: ${recoveryPersonIdFromDB}\n`);

        // Check the RecoveryPerson document
        const RecoveryPerson = mongoose.model('RecoveryPerson', new mongoose.Schema({}, { strict: false }));
        const rp = await RecoveryPerson.findById(recoveryPersonIdFromDB);

        if (rp) {
            console.log('✅ RecoveryPerson found:');
            console.log(`   ID: ${rp._id}`);
            console.log(`   Name: ${rp.fullName}`);
            console.log(`   Mobile: ${rp.mobileNumber}`);
            console.log(`   Customers array type: ${rp.customers[0]?.customerId ? 'NEW (object)' : 'OLD (ObjectId)'}`);
            console.log(`   Total customers: ${rp.customers.length}`);
            console.log(`   Customers: ${JSON.stringify(rp.customers, null, 2)}\n`);

            // Test the findIndex logic
            console.log('=== TESTING FINDINDEX LOGIC ===');
            const customerIndex = rp.customers.findIndex(c => {
                if (c.customerId) {
                    console.log(`   Checking NEW format: ${c.customerId.toString()} === ${customerId}`);
                    return c.customerId.toString() === customerId;
                }
                console.log(`   Checking OLD format: ${c.toString()} === ${customerId}`);
                return c.toString() === customerId;
            });

            console.log(`   Result: customerIndex = ${customerIndex}`);

            if (customerIndex !== -1) {
                console.log('   ✅ Customer found in array!');
                console.log(`   Customer data: ${JSON.stringify(rp.customers[customerIndex])}`);
            } else {
                console.log('   ❌ Customer NOT found in array!');
            }
        }

        console.log('\n=== SOLUTION ===');
        console.log('The frontend team needs to ensure they are:');
        console.log('1. Logged in as the correct recovery person (ID: 6952d66e033424f426802972)');
        console.log('2. Using a valid token for that recovery person');
        console.log('3. If they are logged in as a different recovery person, they need to:');
        console.log('   - Either login as the correct recovery person');
        console.log('   - OR the customer needs to be reassigned to their recovery person account');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

decodeTokenAndCheck();
