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

        // Clean up existing test data (all retailers with test mobile numbers)
        await Retailer.deleteMany({ mobileNumber: { $regex: /^987654\d{4}$/ } });
        await Customer.deleteMany({ mobileNumber: { $regex: /^98\d{8}$/ } });
        console.log('✅ Cleaned up existing test data');

        // Retailer configurations
        // hello
        const retailerConfigs = [
            {
                fullName: 'Rajesh Kumar',
                email: 'rajesh.kumar@testshop.com',
                shopName: 'Kumar Mobile Center',
                mobileNumber: '9876543210',
                city: 'Varanasi',
                state: 'Uttar Pradesh',
                address: 'Near Railway Station, Cantt'
            },
            {
                fullName: 'Suresh Patel',
                email: 'suresh.patel@mobilehub.com',
                shopName: 'Patel Mobile Hub',
                mobileNumber: '9876543211',
                city: 'Lucknow',
                state: 'Uttar Pradesh',
                address: 'Hazratganj Main Road'
            },
            {
                fullName: 'Amit Sharma',
                email: 'amit.sharma@techworld.com',
                shopName: 'Sharma Tech World',
                mobileNumber: '9876543212',
                city: 'Kanpur',
                state: 'Uttar Pradesh',
                address: 'Civil Lines, Mall Road'
            }
        ];

        // Customer names pool
        const customerNames = [
            'Amit Kumar', 'Priya Singh', 'Rahul Sharma', 'Sneha Patel', 'Vikram Yadav',
            'Anjali Gupta', 'Suresh Verma', 'Pooja Mishra', 'Ravi Tiwari', 'Kavita Dubey',
            'Deepak Singh', 'Neha Agarwal', 'Sanjay Yadav', 'Rekha Sharma', 'Manish Gupta',
            'Sunita Verma', 'Rajesh Tiwari', 'Meena Dubey', 'Anil Kumar', 'Geeta Patel',
            'Vijay Singh', 'Asha Mishra', 'Ramesh Yadav', 'Kiran Sharma', 'Dinesh Gupta',
            'Savita Verma', 'Mukesh Tiwari', 'Lalita Dubey', 'Prakash Kumar', 'Usha Patel'
        ];

        // Pincodes for different cities (10 pincodes per city)
        const pincodesByCity = {
            'Varanasi': ['221001', '221002', '221005', '221010', '221001', '221002', '221005', '221001', '221010', '221002'],
            'Lucknow': ['226001', '226002', '226003', '226010', '226001', '226002', '226003', '226001', '226010', '226002'],
            'Kanpur': ['208001', '208002', '208005', '208012', '208001', '208002', '208005', '208001', '208012', '208002']
        };

        let totalCustomersCreated = 0;
        let totalLockedCustomers = 0;
        let totalEligibleForAssignment = 0;

        // Create 3 retailers with 10 customers each
        for (let r = 0; r < retailerConfigs.length; r++) {
            const config = retailerConfigs[r];

            // Create retailer
            const retailer = await Retailer.create({
                fullName: config.fullName,
                email: config.email,
                shopName: config.shopName,
                mobileNumber: config.mobileNumber,
                address: {
                    country: 'India',
                    state: config.state,
                    city: config.city,
                    address: config.address
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

            console.log(`\n✅ Created Retailer ${r + 1}: ${retailer.shopName} (ID: ${retailer._id})`);

            // Create 10 customers for this retailer
            const customers = [];
            const pincodes = pincodesByCity[config.city];

            for (let i = 0; i < 10; i++) {
                const customerIndex = (r * 10) + i;
                const baseDate = new Date();

                // Determine if this customer should be eligible for assignment
                // 6 out of 10 customers will be locked with overdue EMIs (60%)
                const shouldBeLocked = i >= 4; // Last 6 customers

                // For locked customers, set purchase date to ensure EMIs are 5+ days overdue
                // For non-locked customers, set more recent purchase date
                const daysAgo = shouldBeLocked ? 40 : 20; // 40 days ensures 2nd EMI is overdue by 10 days
                const purchaseDate = new Date(baseDate);
                purchaseDate.setDate(purchaseDate.getDate() - daysAgo);

                // Calculate EMI due dates (monthly)
                const emiMonths = [];
                for (let month = 1; month <= 12; month++) {
                    const dueDate = new Date(purchaseDate);
                    dueDate.setMonth(dueDate.getMonth() + month);

                    // For locked customers: first EMI paid, rest unpaid (ensures overdue)
                    // For non-locked customers: first 2 EMIs paid
                    const isPaid = shouldBeLocked ? (month <= 1) : (month <= 2);

                    emiMonths.push({
                        month: month,
                        dueDate: dueDate,
                        amount: 1500,
                        paid: isPaid
                    });
                }

                const customer = {
                    fullName: customerNames[customerIndex],
                    mobileNumber: `98${String(customerIndex).padStart(8, '0')}`,
                    aadharNumber: `${String(customerIndex + 1).padStart(12, '0')}`,
                    dob: new Date('1995-01-15'),
                    fatherName: `Father of ${customerNames[customerIndex]}`,
                    address: {
                        village: config.city,
                        nearbyLocation: `Area ${i + 1}`,
                        post: 'Main Post',
                        district: config.city,
                        pincode: pincodes[i]
                    },
                    imei1: `35${String(customerIndex).padStart(13, '0')}`,
                    imei2: `36${String(customerIndex).padStart(13, '0')}`,
                    fcmToken: null,
                    isLocked: shouldBeLocked,
                    isCollected: false,
                    emiDetails: {
                        phoneType: 'NEW',
                        model: `Model ${customerIndex + 1}`,
                        productName: `Phone ${customerIndex + 1}`,
                        branch: 'Main Branch',
                        sellPrice: 20000,
                        landingPrice: 18000,
                        downPayment: 2000,
                        downPaymentPending: 0,
                        emiRate: 10,
                        numberOfMonths: 12,
                        emiPerMonth: 1500,
                        balanceAmount: shouldBeLocked ? 16500 : 15000, // 11 or 10 EMIs remaining
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
                        latitude: 25.3176 + (customerIndex * 0.01),
                        longitude: 82.9739 + (customerIndex * 0.01),
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

                if (shouldBeLocked) {
                    totalLockedCustomers++;
                    totalEligibleForAssignment++;
                }
            }

            const createdCustomers = await Customer.insertMany(customers);
            totalCustomersCreated += createdCustomers.length;

            console.log(`   📊 Created ${createdCustomers.length} customers`);
            console.log(`   🔒 Locked customers: ${createdCustomers.filter(c => c.isLocked).length}`);
            console.log(`   ✅ Eligible for assignment: ${createdCustomers.filter(c => c.isLocked && !c.isCollected).length}`);

            // Show pincode distribution
            const pincodeCount = {};
            createdCustomers.forEach(c => {
                pincodeCount[c.address.pincode] = (pincodeCount[c.address.pincode] || 0) + 1;
            });
            console.log(`   📍 Pincode distribution:`, pincodeCount);
        }

        // Display overall summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 OVERALL SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Total Retailers Created: 3`);
        console.log(`✅ Total Customers Created: ${totalCustomersCreated}`);
        console.log(`🔒 Total Locked Customers: ${totalLockedCustomers}`);
        console.log(`📋 Eligible for Recovery Assignment: ${totalEligibleForAssignment}`);
        console.log(`   (Criteria: locked + not collected + 5+ days overdue)`);
        console.log('='.repeat(60));

        console.log('\n✅ Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedDummyData();
