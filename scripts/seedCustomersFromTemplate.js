const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }
});

const Customer = require('../src/models/Customer');
const Retailer = require('../src/models/Retailer');

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
}

function parseCSV(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) throw new Error('CSV file is empty');

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        rows.push(row);
    }
    return rows;
}

async function seedCustomersFromTemplate() {
    try {
        const csvFilePath = process.argv[2] || './CUSTOMER_TEMPLATE.csv';

        if (!fs.existsSync(csvFilePath)) {
            console.error(`❌ File not found: ${csvFilePath}`);
            process.exit(1);
        }

        console.log('🚀 Seeding customers from template...\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('📋 Loading retailers...');
        const retailers = await Retailer.find({});
        const retailerMap = new Map();
        const retailerIdMap = new Map();
        retailers.forEach(r => {
            retailerMap.set(r.shopName, r);
            retailerIdMap.set(r._id.toString(), r);
        });
        console.log(`✅ Loaded ${retailers.length} retailers\n`);

        const csvData = parseCSV(csvFilePath);
        console.log(`📄 Found ${csvData.length} customers\n`);

        let successCount = 0;
        let duplicateCount = 0;
        let failedCount = 0;

        for (const row of csvData) {
            try {
                // Find retailer by ID or Shop Name
                let retailer;
                if (row['Retailer ID']) {
                    retailer = retailerIdMap.get(row['Retailer ID']);
                    if (!retailer) {
                        throw new Error(`Retailer ID not found: ${row['Retailer ID']}`);
                    }
                } else {
                    retailer = retailerMap.get(row['Shop Name']);
                    if (!retailer) {
                        throw new Error(`Retailer not found: ${row['Shop Name']}`);
                    }
                }

                // Parse EMI details
                const sellPrice = parseFloat(row['Sell Price']) || 0;
                const landingPrice = parseFloat(row['Landing Price']) || sellPrice;
                const downPayment = parseFloat(row['Down Payment']) || 0;
                const downPaymentPending = parseFloat(row['Down Payment Pending']) || 0;
                const numberOfMonths = parseInt(row['Number of Months']) || 8;
                const emiRate = parseFloat(row['EMI Rate']) || 3;

                const balanceAmount = landingPrice - downPayment;
                const interestAmount = (balanceAmount * emiRate) / 100;
                const totalEmiAmount = balanceAmount + interestAmount;
                const emiPerMonth = totalEmiAmount / numberOfMonths;

                // Parse EMI months from CSV (supports up to 24 months)
                const emiMonths = [];
                for (let i = 1; i <= numberOfMonths; i++) {
                    const dueDate = row[`Month ${i} Due Date`];
                    const paid = row[`Month ${i} Paid`] === 'true';
                    const paidDate = row[`Month ${i} Paid Date`];
                    const amount = parseFloat(row[`Month ${i} Amount`]) || emiPerMonth;

                    if (!dueDate) {
                        throw new Error(`Missing due date for Month ${i}`);
                    }

                    emiMonths.push({
                        month: i,
                        dueDate: new Date(dueDate),
                        paid: paid,
                        paidDate: paidDate ? new Date(paidDate) : null,
                        amount: amount
                    });
                }

                const customerData = {
                    fullName: row['Customer Full Name'],
                    aadharNumber: row['Aadhar Number'],
                    dob: new Date(row['Date of Birth']),
                    mobileNumber: row['Mobile Number'],
                    mobileVerified: false,
                    imei1: row['IMEI1'],
                    imei2: row['IMEI2'] || null,
                    fatherName: row['Father Name'],

                    address: {
                        village: row['Village'],
                        nearbyLocation: row['Nearby Location'],
                        post: row['Post'],
                        district: row['District'],
                        pincode: row['Pincode']
                    },

                    documents: {
                        customerPhoto: 'https://via.placeholder.com/150',
                        aadharFrontPhoto: 'https://via.placeholder.com/150',
                        aadharBackPhoto: 'https://via.placeholder.com/150',
                        signaturePhoto: 'https://via.placeholder.com/150'
                    },

                    emiDetails: {
                        branch: row['Phone Brand'],
                        phoneType: row['Phone Type'] || 'NEW',
                        model: row['Product Model'],
                        productName: row['Product Name'],
                        sellPrice: sellPrice,
                        landingPrice: landingPrice,
                        downPayment: downPayment,
                        downPaymentPending: downPaymentPending,
                        emiRate: emiRate,
                        numberOfMonths: numberOfMonths,
                        emiMonths: emiMonths,
                        balanceAmount: balanceAmount,
                        emiPerMonth: emiPerMonth,
                        totalEmiAmount: totalEmiAmount
                    },

                    isLocked: false,
                    isActive: row['Status'] === 'ACTIVE',
                    retailerId: retailer._id
                };

                await Customer.create(customerData);
                successCount++;
                if (successCount % 10 === 0) {
                    console.log(`✅ [${successCount}/${csvData.length}] ${customerData.fullName}`);
                }
            } catch (error) {
                if (error.code === 11000) {
                    duplicateCount++;
                } else {
                    failedCount++;
                    if (failedCount <= 5) {
                        console.log(`❌ Failed: ${row['Customer Full Name']} - ${error.message}`);
                    }
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Created: ${successCount}`);
        console.log(`⚠️  Duplicates: ${duplicateCount}`);
        console.log(`❌ Failed: ${failedCount}`);
        console.log('='.repeat(50) + '\n');

        await mongoose.connection.close();
        console.log('✨ Done!\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

seedCustomersFromTemplate();
