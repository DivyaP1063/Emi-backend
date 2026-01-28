/**
 * Migration Script: Fix Duplicate NULL SKU Values
 * 
 * This script removes the SKU field from all PhoneVariant documents where SKU is null.
 * This is necessary because MongoDB's sparse unique index treats explicit null values
 * as duplicates, but allows multiple documents without the field.
 * 
 * Run this script once to clean up existing data.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PhoneVariant = require('./src/models/PhoneVariant');

// MongoDB connection string - loaded from .env
const MONGODB_URI = process.env.MONGODB_URI;

async function fixDuplicateNullSKU() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all variants with null SKU
        const variantsWithNullSKU = await PhoneVariant.find({ sku: null });
        console.log(`📊 Found ${variantsWithNullSKU.length} variants with null SKU`);

        if (variantsWithNullSKU.length === 0) {
            console.log('✅ No variants with null SKU found. Nothing to fix.');
            return;
        }

        // Remove the SKU field from all documents where it's null
        const result = await PhoneVariant.updateMany(
            { sku: null },
            { $unset: { sku: "" } }
        );

        console.log(`✅ Updated ${result.modifiedCount} variants`);
        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the migration
fixDuplicateNullSKU()
    .then(() => {
        console.log('✅ All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
