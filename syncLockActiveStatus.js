require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./src/models/Customer');

async function syncLockAndActiveStatus() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        // Set unlocked customers to active
        const unlockedResult = await Customer.updateMany(
            { isLocked: false },
            { $set: { isActive: true } }
        );
        console.log(`Updated ${unlockedResult.modifiedCount} unlocked customers to active`);

        // Set locked customers to inactive
        const lockedResult = await Customer.updateMany(
            { isLocked: true },
            { $set: { isActive: false } }
        );
        console.log(`Updated ${lockedResult.modifiedCount} locked customers to inactive`);

        // Verify the update
        console.log('\n=== Update Summary ===');
        console.log('Unlocked + Active:', await Customer.countDocuments({ isLocked: false, isActive: true }));
        console.log('Locked + Inactive:', await Customer.countDocuments({ isLocked: true, isActive: false }));
        console.log('=====================\n');

        await mongoose.disconnect();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error updating customers:', error);
        process.exit(1);
    }
}

syncLockAndActiveStatus();
