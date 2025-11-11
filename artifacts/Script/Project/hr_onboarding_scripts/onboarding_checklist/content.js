try {
    log.info("onboarding_checklist: Script execution started.");

    const { employee_name } = payload;
    const employeeName = employee_name || "New Employee";

    log.info(`onboarding_checklist: Generating checklist for: ${employeeName}`);

    const checklist = [
        { task: "Read your personalized Welcome Guide and company overview", status: "Pending", due: "Day 0 (Before Start)" },
        { task: "Complete 'Welcome to the Team' e-learning (company values, culture, security basics)", status: "Pending", due: "Day 1" },
        { task: "Activate accounts: email, HR portal, MFA, and VPN access", status: "Pending", due: "Day 1" },
        { task: "Set up bank details for payroll (direct deposit + tax information)", status: "Pending", due: "Day 1" },
        { task: "Meet with your manager to confirm goals, role scope, and success metrics", status: "Pending", due: "Day 2" },
        { task: "Review and sign the Code of Conduct and Acceptable Use policies", status: "Pending", due: "Day 3" },
        { task: "Enroll in health benefits (medical, dental, vision) or decline coverage", status: "Pending", due: "Day 5" },
        { task: "Complete mandatory trainings: Security Awareness, Data Privacy (GDPR), and Anti-Harassment", status: "Pending", due: "Week 1" },
        { task: "Set up work tools: Teams/Slack, calendar preferences, project repositories, and password manager", status: "Pending", due: "Week 1" },
        { task: "Book 1:1 intros with your immediate team and key stakeholders", status: "Pending", due: "Week 1" },
        { task: "Shadow a colleague on a live task or customer interaction", status: "Pending", due: "Week 2" },
        { task: "Submit first-week check-in: blockers, feedback, and equipment needs", status: "Pending", due: "Week 2" }
    ];

    result.success = true;
    result.data = {
        employee: employeeName,
        checklist: checklist
    };
    
    log.info("onboarding_checklist: Script success, result.data is set.");

} catch (error) {
    log.error("onboarding_checklist: An error occurred: ", error.message);
    
    result.success = false;
    result.data = {
        error: "Script failed with an exception: " + error.message
    };
}
