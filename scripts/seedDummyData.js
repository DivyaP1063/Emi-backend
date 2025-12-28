const mongoose = require('mongoose');
const path = require('path');
const Retailer = require('../src/models/Retailer');
const Customer = require('../src/models/Customer');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const seedDummyData = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clean up existing test data
        await Retailer.deleteOne({ mobileNumber: '9876543210' });
        await Customer.deleteMany({ mobileNumber: { $regex: /^98\d{8}$/ } });
        console.log('✅ Cleaned up existing test data');

        // Create 1 Dummy Retailer
        const retailer = await Retailer.create({
            fullName: 'Rajesh Kumar',
            email: 'rajesh.kumar@testshop.com',
            shopName: 'Test Mobile Shop',
            mobileNumber: '9876543210',
            address: {
                country: 'India',
                state: 'Uttar Pradesh',
                city: 'Varanasi',
                address: 'Near Railway Station, Cantt'
            },
            permissions: {
                canPayEmiDownPayment: false,
                dpPending: false,
                autoLockDay: 30,
                serverAadharVerify: true,
                allowElectronic: true,
                allowIPhone: false,
                allow8Month: true,
                allow4Month: false
            },
            status: 'ACTIVE'
        });

        console.log(`✅ Created Retailer: ${retailer.shopName} (ID: ${retailer._id})`);

        // Create 10 Dummy Customers
        const customers = [];
        const pincodes = ['221001', '221002', '221005', '221010', '221001', '221002', '221005', '221001', '221010', '221002'];
        const names = [
            'Amit Kumar', 'Priya Singh', 'Rahul Sharma', 'Sneha Patel', 'Vikram Yadav',
            'Anjali Gupta', 'Suresh Verma', 'Pooja Mishra', 'Ravi Tiwari', 'Kavita Dubey'
        ];

        for (let i = 0; i < 10; i++) {
            const baseDate = new Date();
            const purchaseDate = new Date(baseDate);
            purchaseDate.setDate(purchaseDate.getDate() - 60); // 60 days ago

            // Calculate EMI due dates (monthly)
            const emiMonths = [];
            for (let month = 1; month <= 12; month++) {
                const dueDate = new Date(purchaseDate);
                dueDate.setMonth(dueDate.getMonth() + month);

                emiMonths.push({
                    month: month,
                    dueDate: dueDate,
                    amount: 1500,
                    paid: month <= 2 // First 2 EMIs paid, rest unpaid
                });
            }

            const customer = {
                fullName: names[i],
                mobileNumber: `98${String(i).padStart(8, '0')}`,
                aadharNumber: `${String(i + 1).padStart(12, '0')}`,
                dob: new Date('1995-01-15'),
                fatherName: `Father of ${names[i]}`,
                address: {
                    village: 'Varanasi',
                    nearbyLocation: `Area ${i + 1}`,
                    post: 'Cantt',
                    district: 'Varanasi',
                    pincode: pincodes[i]
                },
                imei1: `35${String(i).padStart(13, '0')}`,
                imei2: `36${String(i).padStart(13, '0')}`,
                fcmToken: null,
                isLocked: i >= 5, // Last 5 customers have locked devices
                deviceLockedAt: i >= 5 ? new Date(baseDate.getTime() - (10 * 24 * 60 * 60 * 1000)) : null, // 10 days ago
                isCollected: false,
                emiDetails: {
                    phoneType: 'NEW',
                    model: `Model ${i + 1}`,
                    productName: `Phone ${i + 1}`,
                    branch: 'Main Branch',
                    sellPrice: 20000,
                    landingPrice: 18000,
                    downPayment: 2000,
                    downPaymentPending: 0,
                    emiRate: 10,
                    numberOfMonths: 12,
                    emiPerMonth: 1500,
                    balanceAmount: 15000, // 10 EMIs remaining * 1500
                    totalEmiAmount: 18000,
                    emiMonths: emiMonths
                },
                documents: {
                    customerPhoto: 'https://example.com/customer.jpg',
                    aadharFrontPhoto: 'https://example.com/aadhar-front.jpg',
                    aadharBackPhoto: 'https://example.com/aadhar-back.jpg',
                    signaturePhoto: 'https://example.com/signature.jpg'
                },
                location: {
                    latitude: 25.3176 + (i * 0.01),
                    longitude: 82.9739 + (i * 0.01),
                    lastUpdated: new Date()
                },
                retailerId: retailer._id,
                assigned: false,
                amapiEnrollment: {
                    enrolled: false,
                    deviceName: null,
                    enrollmentToken: null,
                    policyName: null
                }
            };

            customers.push(customer);
        }

        const createdCustomers = await Customer.insertMany(customers);
        console.log(`✅ Created ${createdCustomers.length} Customers`);

        // Display summary
        console.log('\n📊 Summary:');
        console.log(`Retailer: ${retailer.shopName}`);
        console.log(`Retailer ID: ${retailer._id}`);
        console.log(`Total Customers: ${createdCustomers.length}`);
        console.log(`Locked Customers: ${createdCustomers.filter(c => c.isLocked).length}`);
        console.log(`Customers by Pincode:`);
        const pincodeCount = {};
        createdCustomers.forEach(c => {
            pincodeCount[c.address.pincode] = (pincodeCount[c.address.pincode] || 0) + 1;
        });
        Object.entries(pincodeCount).forEach(([pincode, count]) => {
            console.log(`  ${pincode}: ${count} customers`);
        });

        console.log('\n✅ Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedDummyData();
