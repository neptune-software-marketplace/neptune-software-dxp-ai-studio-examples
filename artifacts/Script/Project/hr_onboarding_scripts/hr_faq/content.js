try {
  const userQuery = (payload.query || "").toLowerCase();

  const faqDatabase = {
    // --- Password ---
    "how do i reset my password": "Go to the login page and select **Forgot Password**. Complete the verification steps to set a new password. If MFA is enabled, have your device ready.",
    "i forgot my password": "Use **Forgot Password** on the login page and finish the identity check to create a new password.",
    "reset my password": "Click **Forgot Password** on the login screen, verify your identity, and set a new password.",
    "password": "Reset your password via **Forgot Password** on the login page. If you’re locked out, a reset also unlocks your account.",
    "locked out": "Use **Forgot Password** on the login page to unlock and reset. If you still can’t sign in after 15 minutes, contact the IT Help Desk.",

    // --- IT Support ---
    "who do i contact for it support": "Email **it_support@neptune-software.com.com** or call **x5000**. For non-urgent issues, open a ticket in the **IT Help Desk** portal for tracking.",
    "it support": "Contact **it_support@neptune-software.com.com** or **x5000**. You can also open a ticket in the **IT Help Desk** portal for updates and SLA visibility.",
    "help desk": "Open a ticket in the **IT Help Desk** portal, or reach us at **it_support@neptune-software.com.com** / **x5000**.",
    "laptop": "For laptop setup, repairs, or software requests, contact **it_support@neptune-software.com.com** or **x5000**. A ticket helps us track your case.",

    // --- Time Off ---
    "how do i request time off": "In the HR portal, go to **My Time → New PTO Request**. Enter dates and reason, then submit for your manager’s approval.",
    "vacation": "Request vacation in **HR Portal → My Time → New PTO Request**. Provide dates and reason; your manager will approve or comment.",
    "pto": "Submit PTO via **HR Portal → My Time → New PTO Request**. You’ll receive a notification when it’s approved.",

    // --- Expenses ---
    "how do i submit an expense report": "Use **My Expenses** in the HR portal. Attach itemized receipts, add business purpose, and submit within **30 days** of purchase.",
    "expense": "File expenses in **HR Portal → My Expenses** with receipts and business reason. Submit within **30 days** for on-time reimbursement.",
    "reimburse": "Request reimbursement via **My Expenses**. Upload receipts, add purpose, and submit for approval. Payout follows the next payroll cycle.",

    // --- Payslip ---
    "where can i find my payslip": "Payslips are in **HR Portal → Payroll**. New statements post each pay cycle and are available for PDF download.",
    "paycheck": "View or download your payslip in **HR Portal → Payroll**. It’s posted each pay cycle.",
    "pay": "Go to **HR Portal → Payroll** to access current and prior payslips.",

    // --- Bank Details ---
    "how do i update my bank details": "In **HR Portal → Payroll → Bank Details**, select **Edit**. Changes may take one payroll cycle to take effect.",
    "direct deposit": "Update direct deposit in **Payroll → Bank Details**. Allow up to one payroll cycle for changes to apply.",
    "bank": "Edit bank details under **Payroll → Bank Details**. Double-check account info to avoid delays.",

    // --- Other FAQs ---
    "how do i change my home address": "Update your address in **HR Portal → My Profile**. Changes sync to payroll and benefits after you save.",
    "how do i enroll in health benefits": "Go to **HR Portal → Benefits → Enroll Now**. Complete enrollment within **30 days** of start or qualifying life event.",
    "what should i do if i am sick": "Notify your manager ASAP and record time as **Sick Leave** in **My Time**. Provide documentation if your local policy requires it."
  };

  let foundAnswer = faqDatabase[userQuery];

  if (!foundAnswer) {
    const keywords = Object.keys(faqDatabase).sort((a, b) => b.length - a.length);
    for (const key of keywords) {
      if (userQuery.includes(key)) {
        foundAnswer = faqDatabase[key];
        break;
      }
    }
  }

  if (foundAnswer) {
    result.success = true;
    result.data = { answer: foundAnswer };
  } else {
    throw new Error("No FAQ answer found for the query.");
  }
} catch (error) {
  result.success = false;
  result.data = { error: error.message };
}
