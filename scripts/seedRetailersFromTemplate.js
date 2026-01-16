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

async function seedRetailersFromTemplate() {
    try {
        const csvFilePath = process.argv[2] || './RETAILER_TEMPLATE.csv';

        if (!fs.existsSync(csvFilePath)) {
            console.error(`❌ File not found: ${csvFilePath}`);
            process.exit(1);
        }

        console.log('🚀 Seeding retailers from template...\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const csvData = parseCSV(csvFilePath);
        console.log(`📄 Found ${csvData.length} retailers\n`);

        let successCount = 0;
        let duplicateCount = 0;
        let failedCount = 0;

        for (const row of csvData) {
            try {
                const retailerData = {
                    fullName: row['Owner Full Name'],
                    shopName: row['Shop Name'],
                    email: row['Email'],
                    mobileNumber: row['Mobile Number'],

                    address: {
                        country: row['Country'] || 'India',
                        state: row['State'],
                        city: row['City'],
                        address: row['Address']
                    },

                    permissions: {
                        canPayEmiDownPayment: row['Can Pay EMI Down Payment'] === 'true',
                        dpPending: row['DP Pending'] === 'true',
                        autoLockDay: parseInt(row['Auto Lock Day']) || 30,
                        serverAadharVerify: row['Server Aadhar Verify'] !== 'false',
                        allowElectronic: row['Allow Electronic'] !== 'false',
                        allowIPhone: row['Allow iPhone'] === 'true',
                        allow8Month: row['Allow 8 Month'] !== 'false',
                        allow4Month: row['Allow 4 Month'] === 'true'
                    },

                    status: row['Status'] || 'ACTIVE'
                };

                await Retailer.create(retailerData);
                successCount++;
                console.log(`✅ [${successCount}] ${retailerData.shopName}`);
            } catch (error) {
                if (error.code === 11000) {
                    duplicateCount++;
                    console.log(`⚠️  Duplicate: ${row['Shop Name']}`);
                } else {
                    failedCount++;
                    console.log(`❌ Failed: ${row['Shop Name']} - ${error.message}`);
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Created: ${successCount}`);
        console.log(`⚠️  Duplicates: ${duplicateCount}`);
        console.log(`❌ Failed: ${failedCount}`);
        console.log('='.repeat(50) + '\n');

        if (successCount > 0) {
            console.log('📋 Retailer IDs for reference:\n');
            const allRetailers = await Retailer.find({}).sort({ createdAt: -1 }).limit(successCount);
            allRetailers.reverse().forEach(r => {
                console.log(`${r._id} - ${r.shopName}`);
            });
            console.log('\nℹ️  Copy these IDs to use in CUSTOMER_TEMPLATE.csv "Retailer ID" column\n');
        }

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

seedRetailersFromTemplate();
