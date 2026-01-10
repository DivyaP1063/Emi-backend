require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const logFile = 'debug_output.txt';
const logs = [];

function log(message) {
    console.log(message);
    logs.push(message);
}

async function checkCustomerAssignment() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        log('✅ Connected to MongoDB\n');

        const customerId = '6952d1151709de3521e201cb';

        // Check RecoveryPerson collection
        log('=== Checking RecoveryPerson Collection ===');
        const RecoveryPerson = mongoose.model('RecoveryPerson', new mongoose.Schema({}, { strict: false }));

        // Get all recovery persons and check their customers arrays
        log('\nChecking ALL RecoveryPersons for this customer:');
        const allRPs = await RecoveryPerson.find({});
        log(`Total RecoveryPersons: ${allRPs.length}\n`);

        let foundInRP = false;
        for (const rp of allRPs) {
            if (rp.customers && rp.customers.length > 0) {
                const hasCustomer = rp.customers.some(c => {
                    if (c.customerId) {
                        return c.customerId.toString() === customerId;
                    }
                    return c.toString() === customerId;
                });

                if (hasCustomer) {
                    foundInRP = true;
                    log(`✅ Found in RecoveryPerson: ${rp._id} (${rp.fullName})`);
                    log(`   Customers array format: ${rp.customers[0].customerId ? 'NEW (object)' : 'OLD (ObjectId)'}`);
                    log(`   Customers array:\n${JSON.stringify(rp.customers, null, 2)}\n`);
                }
            }
        }

        if (!foundInRP) {
            log('❌ Customer NOT found in any RecoveryPerson.customers array\n');
        }

        // Check RecoveryHeadAssignment collection
        log('\n=== Checking RecoveryHeadAssignment Collection ===');
        const Assignment = mongoose.model('RecoveryHeadAssignment', new mongoose.Schema({}, { strict: false }));

        const assignments = await Assignment.find({
            customerId: new mongoose.Types.ObjectId(customerId)
        });

        log(`Found ${assignments.length} assignment(s):`);
        for (const assignment of assignments) {
            log(`\n  Assignment ID: ${assignment._id}`);
            log(`  Recovery Person ID: ${assignment.recoveryPersonId}`);
            log(`  Status: ${assignment.status}`);
            log(`  Created: ${assignment.createdAt}`);
            if (assignment.unassignedAt) {
                log(`  Unassigned At: ${assignment.unassignedAt}`);
            }
        }

        // Check Customer collection
        log('\n\n=== Checking Customer Collection ===');
        const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));

        const customer = await Customer.findById(customerId);
        if (customer) {
            log('✅ Customer found:');
            log(`   Name: ${customer.fullName}`);
            log(`   Mobile: ${customer.mobileNumber}`);
            log(`   Assigned: ${customer.assigned}`);
            log(`   IsCollected: ${customer.isCollected}`);
        } else {
            log('❌ Customer not found');
        }

        // Write to file
        fs.writeFileSync(logFile, logs.join('\n'));
        log(`\n✅ Full output written to ${logFile}`);

    } catch (error) {
        log(`❌ Error: ${error.message}`);
        log(error.stack);
    } finally {
        await mongoose.connection.close();
        log('\n✅ Database connection closed');
    }
}

checkCustomerAssignment();
