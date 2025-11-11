try {
    const { document_text, file_name } = payload;

    const docLabel = file_name || "the document provided";

    if (!document_text) {
        throw new Error(`No document content was provided for ${docLabel}.`);
    }

    const docTextLower = document_text.toLowerCase();

    // === Rule catalogue ===
    const rules = [
        { keyword: "gdpr", 
          risk_note: "High Risk: Missing GDPR compliance terms.", 
          fix: "Add a Data Processing Agreement (DPA) defining controller/processor roles, data-subject rights, breach notice, and SCC/IDTA for transfers." },
        { keyword: "confidentiality", 
          risk_note: "Medium Risk: No confidentiality clause detected.", 
          fix: "Add a confidentiality section describing obligations, carve-outs, and survival period after termination." },
        { keyword: "liability", 
          risk_note: "High Risk: No limitation of liability clause found.", 
          fix: "Add a liability cap (e.g., fees paid) and carve-outs for data breach, privacy, and IP infringement." },
        { keyword: "termination", 
          risk_note: "Medium Risk: No termination rights mentioned.", 
          fix: "Add for-cause and for-convenience termination options and specify survival of key clauses." },
        { keyword: "security", 
          risk_note: "Medium Risk: No security or technical measures described.", 
          fix: "Include Technical & Organizational Measures (TOMs): encryption, access control, logging, backups." },
        { keyword: "sub-processor", 
          risk_note: "Low Risk: Sub-processor obligations not defined.", 
          fix: "List sub-processors and require prior notice or consent for changes." },
        { keyword: "audit", 
          risk_note: "Medium Risk: No audit or assurance rights found.", 
          fix: "Allow audits or acceptance of independent reports (SOC 2 / ISO 27001)." },
        { keyword: "indemnity", 
          risk_note: "Medium Risk: No indemnity clause present.", 
          fix: "Add indemnities covering IP infringement and data-breach claims." },
        { keyword: "governing law", 
          risk_note: "Low Risk: Governing law or jurisdiction missing.", 
          fix: "Specify governing law and dispute-resolution forum." },
        { keyword: "sla", 
          risk_note: "Low Risk: No service-level targets found.", 
          fix: "Define availability targets and service-credit remedies." },
        { keyword: "intellectual property", 
          risk_note: "Medium Risk: IP ownership unclear.", 
          fix: "Clarify ownership of deliverables and background IP; define license scope and restrictions." },
        { keyword: "international transfer", 
          risk_note: "Medium Risk: No cross-border data-transfer safeguards.", 
          fix: "Reference SCCs/IDTA and perform transfer impact assessments." }
    ];

    // === Evaluation ===
    const risksFound = [];
    const fixes = [];

    for (const rule of rules) {
        if (!docTextLower.includes(rule.keyword.toLowerCase())) {
            risksFound.push(rule.risk_note);
            fixes.push(rule.fix);
        }
    }

    let reportStatus;
    let reportNotes;
    let remediationAdvice;

    if (risksFound.length === 0) {
        reportStatus = "Pass";
        reportNotes = "No compliance risks found.";
        remediationAdvice = "No action required.";
    } else {
        reportStatus = "Fail";
        reportNotes = risksFound.join("\n");
        // deduplicate fixes and order by risk level keyword (High > Medium > Low)
        const dedupedFixes = Array.from(new Set(fixes.filter(Boolean)));
        remediationAdvice = "Recommended Remediation:\n" + dedupedFixes.map(f => "- " + f).join("\n");
    }

    // === Output ===
    result.success = true;
    result.data = {
        document_label: docLabel,
        status: reportStatus,
        findings: reportNotes,
        remediation: remediationAdvice
    };

} catch (error) {
    log.error(`Audit Script Error for ${payload.file_name || 'unknown file'}: `, error.message);
    result.success = false;
    result.data = { error: error.message };
}
