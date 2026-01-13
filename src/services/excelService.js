const ExcelJS = require('exceljs');

/**
 * Excel Service for generating Excel reports
 */
class ExcelService {
    /**
     * Create a new workbook with common styling
     */
    createWorkbook() {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'EMI Admin System';
        workbook.created = new Date();
        return workbook;
    }

    /**
     * Style header row
     */
    styleHeaderRow(worksheet, headerRow) {
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 25;
    }

    /**
     * Auto-fit columns
     */
    autoFitColumns(worksheet) {
        worksheet.columns.forEach(column => {
            let maxLength = 10;
            column.eachCell({ includeEmpty: true }, cell => {
                const cellValue = cell.value ? cell.value.toString() : '';
                maxLength = Math.max(maxLength, cellValue.length);
            });
            column.width = Math.min(maxLength + 2, 50);
        });
    }

    /**
     * Generate Users Report Excel
     */
    async generateUsersReport(users) {
        const workbook = this.createWorkbook();
        const worksheet = workbook.addWorksheet('Users Report');

        // Define columns
        worksheet.columns = [
            { header: 'Customer ID', key: 'customerId', width: 25 },
            { header: 'Full Name', key: 'fullName', width: 25 },
            { header: 'Father Name', key: 'fatherName', width: 25 },
            { header: 'Mobile Number', key: 'mobileNumber', width: 15 },
            { header: 'Aadhar Number', key: 'aadharNumber', width: 15 },
            { header: 'IMEI', key: 'imei', width: 18 },
            { header: 'Product', key: 'product', width: 20 },
            { header: 'Model', key: 'model', width: 20 },
            { header: 'Sell Price', key: 'sellPrice', width: 12 },
            { header: 'Down Payment', key: 'downPayment', width: 15 },
            { header: 'DP Pending', key: 'dpPending', width: 12 },
            { header: 'EMI Per Month', key: 'emiPerMonth', width: 15 },
            { header: 'Total EMI Amount', key: 'totalEmiAmount', width: 15 },
            { header: 'Balance Amount', key: 'balanceAmount', width: 15 },
            { header: 'EMI Months', key: 'emiMonths', width: 12 },
            { header: 'Paid EMIs', key: 'paidEmis', width: 12 },
            { header: 'Pending EMIs', key: 'pendingEmis', width: 12 },
            { header: 'Is Locked', key: 'isLocked', width: 12 },
            { header: 'Is Active', key: 'isActive', width: 12 },
            { header: 'Retailer', key: 'retailer', width: 25 },
            { header: 'Branch', key: 'branch', width: 20 },
            { header: 'District', key: 'district', width: 20 },
            { header: 'Pincode', key: 'pincode', width: 10 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        // Style header
        this.styleHeaderRow(worksheet, worksheet.getRow(1));

        // Add data
        users.forEach(user => {
            const paidEmis = user.emiDetails.emiMonths.filter(e => e.paid).length;
            const totalEmis = user.emiDetails.emiMonths.length;

            worksheet.addRow({
                customerId: user._id.toString(),
                fullName: user.fullName,
                fatherName: user.fatherName,
                mobileNumber: user.mobileNumber,
                aadharNumber: user.aadharNumber,
                imei: user.imei1,
                product: user.emiDetails.productName,
                model: user.emiDetails.model,
                sellPrice: user.emiDetails.sellPrice,
                downPayment: user.emiDetails.downPayment,
                dpPending: user.emiDetails.downPaymentPending,
                emiPerMonth: user.emiDetails.emiPerMonth,
                totalEmiAmount: user.emiDetails.totalEmiAmount,
                balanceAmount: user.emiDetails.balanceAmount,
                emiMonths: totalEmis,
                paidEmis: paidEmis,
                pendingEmis: totalEmis - paidEmis,
                isLocked: user.isLocked ? 'Yes' : 'No',
                isActive: user.isActive ? 'Yes' : 'No',
                retailer: user.retailerId?.fullName || 'N/A',
                branch: user.emiDetails.branch,
                district: user.address.district,
                pincode: user.address.pincode,
                createdAt: new Date(user.createdAt).toLocaleDateString()
            });
        });

        // Auto-fit columns
        this.autoFitColumns(worksheet);

        return workbook;
    }

    /**
     * Generate Individual User Report Excel
     */
    async generateIndividualUserReport(user) {
        const workbook = this.createWorkbook();

        // Customer Details Sheet
        const detailsSheet = workbook.addWorksheet('Customer Details');
        detailsSheet.columns = [
            { header: 'Field', key: 'field', width: 25 },
            { header: 'Value', key: 'value', width: 40 }
        ];
        this.styleHeaderRow(detailsSheet, detailsSheet.getRow(1));

        detailsSheet.addRows([
            { field: 'Customer ID', value: user._id.toString() },
            { field: 'Full Name', value: user.fullName },
            { field: 'Mobile Number', value: user.mobileNumber },
            { field: 'Aadhar Number', value: user.aadharNumber },
            { field: 'Date of Birth', value: new Date(user.dob).toLocaleDateString() },
            { field: 'Father Name', value: user.fatherName },
            { field: 'Village', value: user.address.village },
            { field: 'Nearby Location', value: user.address.nearbyLocation },
            { field: 'Post', value: user.address.post },
            { field: 'District', value: user.address.district },
            { field: 'Pincode', value: user.address.pincode },
            { field: 'Product Name', value: user.emiDetails.productName },
            { field: 'Model', value: user.emiDetails.model },
            { field: 'Phone Type', value: user.emiDetails.phoneType },
            { field: 'Branch', value: user.emiDetails.branch },
            { field: 'Sell Price', value: user.emiDetails.sellPrice },
            { field: 'Landing Price', value: user.emiDetails.landingPrice },
            { field: 'Down Payment', value: user.emiDetails.downPayment },
            { field: 'Down Payment Pending', value: user.emiDetails.downPaymentPending },
            { field: 'EMI Rate (%)', value: user.emiDetails.emiRate },
            { field: 'Number of Months', value: user.emiDetails.numberOfMonths },
            { field: 'EMI Per Month', value: user.emiDetails.emiPerMonth },
            { field: 'Total EMI Amount', value: user.emiDetails.totalEmiAmount },
            { field: 'Balance Amount', value: user.emiDetails.balanceAmount },
            { field: 'Is Locked', value: user.isLocked ? 'Yes' : 'No' },
            { field: 'Is Active', value: user.isActive ? 'Yes' : 'No' },
            { field: 'Retailer', value: user.retailerId?.fullName || 'N/A' },
            { field: 'Created At', value: new Date(user.createdAt).toLocaleDateString() }
        ]);

        // EMI Schedule Sheet
        const emiSheet = workbook.addWorksheet('EMI Schedule');
        emiSheet.columns = [
            { header: 'Month', key: 'month', width: 10 },
            { header: 'Due Date', key: 'dueDate', width: 15 },
            { header: 'Amount', key: 'amount', width: 12 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Paid Date', key: 'paidDate', width: 15 }
        ];
        this.styleHeaderRow(emiSheet, emiSheet.getRow(1));

        user.emiDetails.emiMonths.forEach(emi => {
            emiSheet.addRow({
                month: emi.month,
                dueDate: new Date(emi.dueDate).toLocaleDateString(),
                amount: emi.amount,
                status: emi.paid ? 'Paid' : 'Pending',
                paidDate: emi.paidDate ? new Date(emi.paidDate).toLocaleDateString() : 'N/A'
            });
        });

        this.autoFitColumns(detailsSheet);
        this.autoFitColumns(emiSheet);

        return workbook;
    }

    /**
     * Generate Retailers Report Excel
     */
    async generateRetailersReport(retailers) {
        const workbook = this.createWorkbook();
        const worksheet = workbook.addWorksheet('Retailers Report');

        worksheet.columns = [
            { header: 'Retailer ID', key: 'retailerId', width: 25 },
            { header: 'Full Name', key: 'fullName', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Mobile Number', key: 'mobileNumber', width: 15 },
            { header: 'Shop Name', key: 'shopName', width: 25 },
            { header: 'City', key: 'city', width: 20 },
            { header: 'State', key: 'state', width: 20 },
            { header: 'Country', key: 'country', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Can Pay EMI/DP', key: 'canPayEmiDownPayment', width: 15 },
            { header: 'DP Pending', key: 'dpPending', width: 12 },
            { header: 'Auto Lock Day', key: 'autoLockDay', width: 12 },
            { header: 'Allow Electronic', key: 'allowElectronic', width: 15 },
            { header: 'Allow iPhone', key: 'allowIPhone', width: 12 },
            { header: 'Allow 8 Month', key: 'allow8Month', width: 12 },
            { header: 'Allow 4 Month', key: 'allow4Month', width: 12 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        this.styleHeaderRow(worksheet, worksheet.getRow(1));

        retailers.forEach(retailer => {
            worksheet.addRow({
                retailerId: retailer._id.toString(),
                fullName: retailer.fullName,
                email: retailer.email,
                mobileNumber: retailer.mobileNumber,
                shopName: retailer.shopName,
                city: retailer.address.city,
                state: retailer.address.state,
                country: retailer.address.country,
                status: retailer.status,
                canPayEmiDownPayment: retailer.permissions.canPayEmiDownPayment ? 'Yes' : 'No',
                dpPending: retailer.permissions.dpPending ? 'Yes' : 'No',
                autoLockDay: retailer.permissions.autoLockDay,
                allowElectronic: retailer.permissions.allowElectronic ? 'Yes' : 'No',
                allowIPhone: retailer.permissions.allowIPhone ? 'Yes' : 'No',
                allow8Month: retailer.permissions.allow8Month ? 'Yes' : 'No',
                allow4Month: retailer.permissions.allow4Month ? 'Yes' : 'No',
                createdAt: new Date(retailer.createdAt).toLocaleDateString()
            });
        });

        this.autoFitColumns(worksheet);

        return workbook;
    }

    /**
     * Generate Overdue EMI Report Excel
     */
    async generateOverdueEmiReport(overdueCustomers) {
        const workbook = this.createWorkbook();
        const worksheet = workbook.addWorksheet('Overdue EMI Report');

        worksheet.columns = [
            { header: 'Customer ID', key: 'customerId', width: 25 },
            { header: 'Full Name', key: 'fullName', width: 25 },
            { header: 'Mobile Number', key: 'mobileNumber', width: 15 },
            { header: 'Product', key: 'product', width: 20 },
            { header: 'Retailer', key: 'retailer', width: 25 },
            { header: 'EMI Month', key: 'emiMonth', width: 12 },
            { header: 'Due Date', key: 'dueDate', width: 15 },
            { header: 'Days Overdue', key: 'daysOverdue', width: 12 },
            { header: 'EMI Amount', key: 'emiAmount', width: 12 },
            { header: 'Total Overdue EMIs', key: 'totalOverdueEmis', width: 15 },
            { header: 'Total Overdue Amount', key: 'totalOverdueAmount', width: 18 },
            { header: 'Is Locked', key: 'isLocked', width: 12 },
            { header: 'District', key: 'district', width: 20 },
            { header: 'Pincode', key: 'pincode', width: 10 }
        ];

        this.styleHeaderRow(worksheet, worksheet.getRow(1));

        overdueCustomers.forEach(customer => {
            customer.overdueEmis.forEach(emi => {
                worksheet.addRow({
                    customerId: customer._id.toString(),
                    fullName: customer.fullName,
                    mobileNumber: customer.mobileNumber,
                    product: customer.emiDetails.productName,
                    retailer: customer.retailerId?.fullName || 'N/A',
                    emiMonth: emi.month,
                    dueDate: new Date(emi.dueDate).toLocaleDateString(),
                    daysOverdue: emi.daysOverdue,
                    emiAmount: emi.amount,
                    totalOverdueEmis: customer.totalOverdueEmis,
                    totalOverdueAmount: customer.totalOverdueAmount,
                    isLocked: customer.isLocked ? 'Yes' : 'No',
                    district: customer.address.district,
                    pincode: customer.address.pincode
                });
            });
        });

        this.autoFitColumns(worksheet);

        return workbook;
    }

    /**
     * Generate Down Payment Pending Report Excel
     */
    async generateDownPaymentPendingReport(customers) {
        const workbook = this.createWorkbook();
        const worksheet = workbook.addWorksheet('Down Payment Pending');

        worksheet.columns = [
            { header: 'Customer ID', key: 'customerId', width: 25 },
            { header: 'Full Name', key: 'fullName', width: 25 },
            { header: 'Father Name', key: 'fatherName', width: 25 },
            { header: 'Mobile Number', key: 'mobileNumber', width: 15 },
            { header: 'Product', key: 'product', width: 20 },
            { header: 'Model', key: 'model', width: 20 },
            { header: 'Retailer', key: 'retailer', width: 25 },
            { header: 'Total Down Payment', key: 'totalDownPayment', width: 18 },
            { header: 'Paid Amount', key: 'paidAmount', width: 15 },
            { header: 'Unpaid Amount', key: 'unpaidAmount', width: 15 },
            { header: 'Paid Date', key: 'paidDate', width: 15 },
            { header: 'Sell Price', key: 'sellPrice', width: 12 },
            { header: 'District', key: 'district', width: 20 },
            { header: 'Pincode', key: 'pincode', width: 10 },
            { header: 'Is Locked', key: 'isLocked', width: 12 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        this.styleHeaderRow(worksheet, worksheet.getRow(1));

        customers.forEach(customer => {
            const paidAmount = customer.emiDetails.downPayment - customer.emiDetails.downPaymentPending;

            worksheet.addRow({
                customerId: customer._id.toString(),
                fullName: customer.fullName,
                fatherName: customer.fatherName || 'N/A',
                mobileNumber: customer.mobileNumber,
                product: customer.emiDetails.productName,
                model: customer.emiDetails.model,
                retailer: customer.retailerId?.fullName || 'N/A',
                totalDownPayment: customer.emiDetails.downPayment,
                paidAmount: paidAmount,
                unpaidAmount: customer.emiDetails.downPaymentPending,
                paidDate: paidAmount > 0 && customer.emiDetails.downPaymentPending === 0 ? new Date(customer.createdAt).toLocaleDateString() : 'Pending',
                sellPrice: customer.emiDetails.sellPrice,
                district: customer.address.district,
                pincode: customer.address.pincode,
                isLocked: customer.isLocked ? 'Yes' : 'No',
                createdAt: new Date(customer.createdAt).toLocaleDateString()
            });
        });

        this.autoFitColumns(worksheet);

        return workbook;
    }

    /**
     * Write workbook to buffer
     */
    async writeToBuffer(workbook) {
        return await workbook.xlsx.writeBuffer();
    }
}

module.exports = new ExcelService();
