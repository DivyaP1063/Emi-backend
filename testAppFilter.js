require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./src/models/Customer');

async function testAppInstallationFilter() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('=== FCM Token Analysis ===');
        const total = await Customer.countDocuments({});
        const hasToken = await Customer.countDocuments({
            fcmToken: { $ne: null, $exists: true }
        });
        const noToken = await Customer.countDocuments({
            $or: [{ fcmToken: null }, { fcmToken: { $exists: false } }]
        });

        console.log('Total customers:', total);
        console.log('Has FCM token:', hasToken);
        console.log('No FCM token:', noToken);

        if (hasToken > 0) {
            const samples = await Customer.find({
                fcmToken: { $ne: null }
            }).limit(3).select('fullName fcmToken isActive isLocked');

            console.log('\nSamples with FCM token:');
            samples.forEach(s => {
                console.log(`  - ${s.fullName}`);
                console.log(`    FCM: ${s.fcmToken ? s.fcmToken.substring(0, 30) + '...' : 'null'}`);
                console.log(`    isActive: ${s.isActive}, isLocked: ${s.isLocked}`);
            });
        }

        console.log('\n=== Filter Test Results ===');
        const installed = await Customer.countDocuments({
            fcmToken: { $ne: null },
            isActive: true
        });
        const uninstalled = await Customer.countDocuments({
            fcmToken: { $ne: null },
            isActive: false
        });
        const notInstalled = await Customer.countDocuments({
            fcmToken: null
        });

        console.log('App Installed (FCM + active):', installed);
        console.log('App Uninstalled (FCM + inactive):', uninstalled);
        console.log('App Not Installed (no FCM):', notInstalled);
        console.log('Total should equal:', installed + uninstalled + notInstalled);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testAppInstallationFilter();
