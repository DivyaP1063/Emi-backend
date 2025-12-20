require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./src/models/Customer');

// Retailer IDs
const retailerIds = [
    '6946618199e7eb6926bd6bae',
    '693ef4318c3db979ec40e8a8',
    '693ece20033753bf1c1edede'
];

// Helper function to generate random date
const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper function to generate random mobile number
const randomMobile = () => {
    return '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
};

// Helper function to generate random aadhar
const randomAadhar = () => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
};

// Helper function to generate random IMEI
const randomIMEI = () => {
    return Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
};

// Sample names
const firstNames = ['Amit', 'Rahul', 'Priya', 'Sagar', 'Neha', 'Vikram', 'Anjali', 'Ravi', 'Pooja', 'Karan', 'Deepak', 'Sneha', 'Arjun', 'Kavita', 'Rohit'];
const lastNames = ['Kumar', 'Sharma', 'Singh', 'Verma', 'Gupta', 'Patel', 'Yadav', 'Reddy', 'Joshi', 'Nair', 'Mehta', 'Chopra', 'Malhotra', 'Agarwal', 'Pandey'];
const fatherNames = ['Rajesh', 'Suresh', 'Mahesh', 'Ramesh', 'Dinesh', 'Mukesh', 'Naresh', 'Ganesh', 'Umesh', 'Hitesh'];
const villages = ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Begusarai', 'Katihar', 'Munger'];
const locations = ['Gandhi Maidan', 'Station Road', 'Market Area', 'Civil Lines', 'Boring Road', 'Fraser Road', 'Ashok Rajpath', 'Bailey Road'];
const districts = ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Begusarai'];
const phoneModels = ['iPhone 14', 'Samsung Galaxy S23', 'OnePlus 11', 'Vivo V27', 'Oppo Reno 10', 'Realme GT 3', 'Xiaomi 13', 'Nothing Phone 2'];
const branches = ['Patna Main', 'Boring Road', 'Kankarbagh', 'Danapur', 'Rajendra Nagar'];

// Generate customer data
const generateCustomer = (retailerId, index) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;
    const model = phoneModels[Math.floor(Math.random() * phoneModels.length)];
    const sellPrice = Math.floor(30000 + Math.random() * 70000);
    const landingPrice = Math.floor(sellPrice * 0.85);
    const downPayment = Math.floor(landingPrice * 0.2);
    const numberOfMonths = [3, 6, 9, 12][Math.floor(Math.random() * 4)];
    const balanceAmount = landingPrice - downPayment;
    const interestAmount = (balanceAmount * 3) / 100;
    const totalEmiAmount = balanceAmount + interestAmount;
    const emiPerMonth = Math.floor(totalEmiAmount / numberOfMonths);

    // Generate EMI months with due dates
    const startDate = randomDate(new Date(2024, 0, 1), new Date(2024, 11, 1));
    const emiMonths = [];
    for (let i = 1; i <= numberOfMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        // Randomly mark some EMIs as paid
        const isPaid = Math.random() > 0.5;

        emiMonths.push({
            month: i,
            dueDate: dueDate,
            amount: emiPerMonth,
            paid: isPaid,
            paidDate: isPaid ? randomDate(dueDate, new Date()) : undefined
        });
    }

    return {
        fullName,
        mobileNumber: randomMobile(),
        mobileVerified: true,
        aadharNumber: randomAadhar(),
        dob: randomDate(new Date(1980, 0, 1), new Date(2005, 11, 31)),
        imei1: randomIMEI(),
        imei2: randomIMEI(),
        fatherName: fatherNames[Math.floor(Math.random() * fatherNames.length)] + ' ' + lastName,
        address: {
            village: villages[Math.floor(Math.random() * villages.length)],
            nearbyLocation: locations[Math.floor(Math.random() * locations.length)],
            post: villages[Math.floor(Math.random() * villages.length)] + ' GPO',
            district: districts[Math.floor(Math.random() * districts.length)],
            pincode: '80000' + Math.floor(Math.random() * 10)
        },
        documents: {
            customerPhoto: `uploads/customers/photo_${retailerId}_${index}.jpg`,
            aadharFrontPhoto: `uploads/customers/aadhar_front_${retailerId}_${index}.jpg`,
            aadharBackPhoto: `uploads/customers/aadhar_back_${retailerId}_${index}.jpg`,
            signaturePhoto: `uploads/customers/signature_${retailerId}_${index}.jpg`
        },
        emiDetails: {
            branch: branches[Math.floor(Math.random() * branches.length)],
            phoneType: Math.random() > 0.5 ? 'NEW' : 'OLD',
            model: model,
            productName: model + ' ' + ['64GB', '128GB', '256GB'][Math.floor(Math.random() * 3)],
            sellPrice: sellPrice,
            landingPrice: landingPrice,
            downPayment: downPayment,
            downPaymentPending: 0,
            balanceAmount: balanceAmount,
            interestRate: 3,
            interestAmount: interestAmount,
            totalEmiAmount: totalEmiAmount,
            emiPerMonth: emiPerMonth,
            numberOfMonths: numberOfMonths,
            emiMonths: emiMonths
        },
        isLocked: false,
        retailerId: retailerId
    };
};

// Seed function
const seedCustomers = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🗑️  Clearing existing seed data...');
        // Optional: Clear existing customers (comment out if you want to keep existing data)
        // await Customer.deleteMany({});

        console.log('🌱 Seeding customers...');
        let totalCreated = 0;

        for (const retailerId of retailerIds) {
            console.log(`\n📦 Creating 10 customers for retailer: ${retailerId}`);

            for (let i = 1; i <= 10; i++) {
                const customerData = generateCustomer(retailerId, i);
                const customer = await Customer.create(customerData);
                totalCreated++;
                console.log(`  ✓ Created customer ${i}/10: ${customer.fullName} (${customer.mobileNumber})`);
            }
        }

        console.log(`\n✅ Successfully seeded ${totalCreated} customers!`);
        console.log('📊 Breakdown:');
        for (const retailerId of retailerIds) {
            const count = await Customer.countDocuments({ retailerId });
            console.log(`  - Retailer ${retailerId}: ${count} customers`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding customers:', error);
        process.exit(1);
    }
};

// Run the seed script
seedCustomers();
