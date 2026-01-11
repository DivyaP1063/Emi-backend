const mongoose = require('mongoose');
const Stockist = require('./src/models/Stockist');
require('dotenv').config();

/**
 * Seed script to create a stockist account
 * Run: node seedStockist.js
 */

const seedStockist = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if stockist already exists
        const existingStockist = await Stockist.findOne({ mobileNumber: '9999999999' });

        if (existingStockist) {
            console.log('⚠️  Stockist already exists:');
            console.log('   Mobile: 9999999999');
            console.log('   Shop Name:', existingStockist.shopName);
            console.log('   ID:', existingStockist._id.toString());
            await mongoose.disconnect();
            return;
        }

        // Create stockist
        const stockist = await Stockist.create({
            fullName: 'Ramesh Kumar',
            mobileNumber: '9999999999',
            shopName: 'Mobile Point - Main Branch',
            address: {
                street: 'Main Market Road',
                city: 'Varanasi',
                state: 'Uttar Pradesh',
                pincode: '221001'
            },
            pinCodes: ['221001', '221002', '221005', '221010'],
            isActive: true,
            mobileVerified: false
        });

        console.log('✅ Stockist created successfully!');
        console.log('\n📋 Stockist Details:');
        console.log('   ID:', stockist._id.toString());
        console.log('   Full Name:', stockist.fullName);
        console.log('   Shop Name:', stockist.shopName);
        console.log('   Mobile Number:', stockist.mobileNumber);
        console.log('   Address:', `${stockist.address.street}, ${stockist.address.city}, ${stockist.address.state} - ${stockist.address.pincode}`);
        console.log('   Service Pincodes:', stockist.pinCodes.join(', '));
        console.log('   Status:', stockist.isActive ? 'ACTIVE' : 'INACTIVE');
        console.log('\n🔐 Login Credentials:');
        console.log('   Mobile: 9999999999');
        console.log('   OTP: Will be sent via Firebase');
        console.log('\n💡 Use this stockist ID when submitting devices from recovery person app');
        console.log('   Stockist ID:', stockist._id.toString());

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error seeding stockist:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

seedStockist();
