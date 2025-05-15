import { database, ref, onValue } from "./firebase-config.js";

// Database references
const membersRef = ref(database, "members");
const trainersRef = ref(database, "trainers");
const staffRef = ref(database, "staff");
const plansRef = ref(database, "plans");
const paymentsRef = ref(database, "member_payments");
const attendanceRef = ref(database, "attendance");

// Initialize the import/export functionality
function initImportExport() {
  // Members export
  document.getElementById("export-members").addEventListener("click", () => {
    exportData(membersRef, "members", formatMembersData);
  });

  // Trainers export
  document.getElementById("export-trainers").addEventListener("click", () => {
    exportData(trainersRef, "trainers", formatTrainersData);
  });

  // Staff export
  document.getElementById("export-staff").addEventListener("click", () => {
    exportData(staffRef, "staff", formatStaffData);
  });

  // Plans export
  document.getElementById("export-plans").addEventListener("click", () => {
    exportData(plansRef, "plans", formatPlansData);
  });

  // Membership payments export
  document
    .getElementById("export-membership-payments")
    .addEventListener("click", () => {
      exportFilteredPayments("Membership Plan", formatMembershipPaymentsData);
    });

  // Personal training payments export
  document
    .getElementById("export-training-payments")
    .addEventListener("click", () => {
      exportFilteredPayments(
        "Personal Training Plan",
        formatTrainingPaymentsData
      );
    });

  // Attendance export
  document.getElementById("export-attendance").addEventListener("click", () => {
    exportData(attendanceRef, "attendance", formatAttendanceData);
  });
}

// Export payments filtered by plan type with specific formatter
function exportFilteredPayments(planType, formatter) {
  onValue(
    paymentsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        alert(`No payments data found to export!`);
        return;
      }

      const rawData = snapshot.val();
      const filteredData = Object.values(rawData).filter(
        (payment) => payment.plan_type === planType
      );

      if (filteredData.length === 0) {
        alert(`No ${planType} payments found to export!`);
        return;
      }

      const formattedData = formatter(filteredData);
      const fileName =
        planType === "Membership Plan"
          ? "membership_payments"
          : "training_payments";
      exportToExcel(formattedData, fileName);
    },
    { onlyOnce: true }
  );
}

// Generic function to export data
function exportData(dbRef, fileName, formatter) {
  onValue(
    dbRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        alert(`No ${fileName} data found to export!`);
        return;
      }

      const rawData = snapshot.val();
      const formattedData = formatter(rawData);
      exportToExcel(formattedData, fileName);
    },
    { onlyOnce: true }
  );
}

// Export to Excel using SheetJS
function exportToExcel(data, fileName) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(
    workbook,
    `${fileName}_export_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

// Data formatters for each data type
function formatMembersData(members) {
  return Object.values(members).map((member) => ({
    "Member UID": member.member_uid || "",
    "Full Name": member.full_name || "",
    Email: member.email || "",
    "Contact No": member.contact_no || "",
    "Emergency Contact": member.emergency_contact_no || "",
    "Date of Birth": member.dob || "",
    Gender: member.gender || "",
    Address: member.address || "",
    "Guardian Name": member.guardian_name || "",
    "Medical Conditions": member.medical_conditions || "",
  }));
}

function formatTrainersData(trainers) {
  return Object.values(trainers).map((trainer) => ({
    "Trainer UID": trainer.trainers_uid || "",
    Name: trainer.name || "",
    Email: trainer.email || "",
    Mobile: trainer.mobile || "",
    "Date of Birth": trainer.dob || "",
    Gender: trainer.gender || "",
    Address: trainer.address || "",
    "Experience (years)": trainer.experience || "",
    "Joined Date": trainer.joinedDate || "",
    Shift: trainer.shift || "",
    Salary: trainer.salary || "",
  }));
}

function formatStaffData(staff) {
  return Object.values(staff).map((staffMember) => ({
    "Staff UID": staffMember.uid || "",
    Name: staffMember.name || "",
    Email: staffMember.email || "",
    Phone: staffMember.phoneNumber || "",
    "Date of Birth": staffMember.dateOfBirth || "",
    Gender: staffMember.gender || "",
    Address: staffMember.address || "",
    Role: staffMember.role || "",
    "Joined Date": staffMember.joinedDate || "",
    Shift: staffMember.shift || "",
    Salary: staffMember.salary || "",
  }));
}

function formatPlansData(plans) {
  return Object.values(plans).map((plan) => ({
    "Plan UID": plan.plan_uid || "",
    "Plan Name": plan.plan_name || "",
    "Plan Type": plan.plan_type || "",
    Amount: plan.amount || "",
    Duration: plan.plan_duration || "",
    Description: plan.description || "",
  }));
}

// Format for Membership Plan payments (without trainer fields)
function formatMembershipPaymentsData(payments) {
  return payments.map((payment) => ({
    "Payment UID": payment.payment_uid || "",
    "Member UID": payment.member_uid || "",
    "Member Name": payment.member_name || "",
    "Received From": payment.received_from || "",
    "Received By": payment.received_by || "",
    "Plan UID": payment.plan_uid || "",
    "Plan Name": payment.plan_name || "",
    "Plan Type": payment.plan_type || "",
    "Plan Duration": payment.plan_duration || "",
    "Plan Status": payment.plan_validity_status || "",
    "Start Date": payment.start_date || "",
    "End Date": payment.end_date || "",
    "Date Paid": payment.date_paid || "",
    "Total Amount": payment.total_amount || "",
    "Pre-Booking Amount": payment.pre_booking_amount || "",
    "Balance Due": payment.balance_due || "",
    "Due Status": payment.due_status || "",
    "Payment Method": payment.payment_method || "",
  }));
}

// Format for Personal Training Plan payments (with trainer fields)
function formatTrainingPaymentsData(payments) {
  return payments.map((payment) => ({
    "Payment UID": payment.payment_uid || "",
    "Member UID": payment.member_uid || "",
    "Member Name": payment.member_name || "",
    "Received From": payment.received_from || "",
    "Received By": payment.received_by || "",
    "Plan UID": payment.plan_uid || "",
    "Plan Name": payment.plan_name || "",
    "Plan Type": payment.plan_type || "",
    "Plan Duration": payment.plan_duration || "",
    "Plan Status": payment.plan_validity_status || "",
    "Start Date": payment.start_date || "",
    "End Date": payment.end_date || "",
    "Date Paid": payment.date_paid || "",
    "Total Amount": payment.total_amount || "",
    "Pre-Booking Amount": payment.pre_booking_amount || "",
    "Balance Due": payment.balance_due || "",
    "Due Status": payment.due_status || "",
    "Payment Method": payment.payment_method || "",
    "Assigned Trainer UID": payment.assigned_trainer_uid || "",
    "Assigned Trainer Name": payment.assigned_trainer_name || "",
  }));
}

function formatAttendanceData(attendance) {
  return Object.values(attendance).map((record) => ({
    "Attendance UID": record.attendance_uid || "",
    "Member UID": record.member_uid || "",
    "Member Name": record.member_name || "",
    "Date Marked": record.date_marked || "",
    Status: record.attendance_status || "",
  }));
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initImportExport);
