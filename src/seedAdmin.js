const Admin = require('./models/Admin');
const connectDB = require('./config/database');
require('dotenv').config();

/**
 * Script to seed initial admin user
 * Run: node src/seedAdmin.js
 */

const seedAdmin = async () => {
  try {
    await connectDB();

    // Create or update admin users
    const admins = [
      {
        name: 'admin',
        email: 'admin@resq.com',
        mobileNumber: '7500719430'
      },
      {
        name: 'admin2',
        email: 'admin2@resq.com',
        mobileNumber: '9455703882'
      }
    ];

    for (const adminData of admins) {
      const existingAdmin = await Admin.findOne({ 
        mobileNumber: adminData.mobileNumber 
      });

      if (existingAdmin) {
        console.log(`✅ Admin with mobile ${adminData.mobileNumber} already exists`);
        continue;
      }

      const admin = await Admin.create({
        name: adminData.name,
        email: adminData.email,
        mobileNumber: adminData.mobileNumber,
        isActive: true,
        role: 'ADMIN'
      });

      console.log(`✅ Admin created: ${admin.name} (${admin.mobileNumber})`);
    }

    console.log('\n🎉 Admin seeding completed!');
    console.log('📱 Test OTP login with either mobile number');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
