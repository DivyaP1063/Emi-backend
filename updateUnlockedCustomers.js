require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./src/models/Customer');

async function syncLockAndActiveStatus() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        // Set unlocked customers to inactive
        const unlockedResult = await Customer.updateMany(
            { isLocked: false },
            { $set: { isActive: false } }
        );
        console.log(`Updated ${unlockedResult.modifiedCount} unlocked customers to inactive`);

        // Set locked customers to active
        const lockedResult = await Customer.updateMany(
            { isLocked: true },
            { $set: { isActive: true } }
        );
        console.log(`Updated ${lockedResult.modifiedCount} locked customers to active`);

        // Verify the update
        console.log('\n=== Update Summary ===');
        console.log('Locked + Active:', await Customer.countDocuments({ isLocked: true, isActive: true }));
        console.log('Unlocked + Inactive:', await Customer.countDocuments({ isLocked: false, isActive: false }));
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
