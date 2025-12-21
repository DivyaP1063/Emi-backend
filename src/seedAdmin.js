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
        name: 'admin3',
        email: 'admin3@resq.com',
        mobileNumber: '8429604825'
      },
      {
        name: 'admin4',
        email: 'admin4@resq.com',
        mobileNumber: '9304735742'
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
