// The provided script processes a document's content to enable text analysis. 
// It begins by extracting the document text and file name from an input payload, verifying that the text is present. 
// The document text is then normalized to lowercase and whitespace is standardized.

// Key functionalities of the script include:

//     Conversion to Array: A function that transforms various types of input into lowercase strings in an array format.
//     Regular Expression Creation: A function that converts input into an array of case-insensitive regex patterns for searching.
//     Phrase Matching: Functions that allow checking for specific phrases within the document text and locating their first occurrence.
//     Snippet Generation: While the implementation for generating text snippets from the document based on found phrases is incomplete, it implies a functionality for extracting relevant text snippets related to search queries.

// Overall, the script is designed to facilitate document content analysis, enabling keyword searching and snippet extraction through regular expressions and phrase matching.

try {
    const { document_text, file_name } = payload;

    const docLabel = file_name || "the document provided";

    if (!document_text) {
        throw new Error(`No document content was provided for ${docLabel}.`);
    }

    
    const rawText = String(document_text);
    const normalizedText = rawText.toLowerCase().replace(/\s+/g, " ");

   
    function toArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) {
            return value.map(v => String(v).toLowerCase());
        }
        if (typeof value === "object") {
            try {
                return Object.values(value).map(v => String(v).toLowerCase());
            } catch (e) {
                return [];
            }
        }
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map(v => String(v).toLowerCase());
            }
        } catch (e) {}
        return [];
    }

    function toRegexArray(value) {
        const arr = toArray(value);
        const regexes = [];
        for (const s of arr) {
            try {
                
                regexes.push(new RegExp(s, "i"));
            } catch (e) {
               
            }
        }
        return regexes;
    }

    
    function containsPhrase(text, phrase) {
        if (!phrase) return false;
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp("\\b" + escaped + "\\b", "i");
        return re.test(text);
    }

    function findFirstPhraseIndex(text, phrases) {
        for (const p of phrases) {
            const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            const m = text.match(re);
            if (m && m.index != null) {
                return { index: m.index, phrase: p };
            }
        }
        return null;
    }

    function getSnippet(original, phrase, index) {
        if (index == null || index < 0) return null;
        const r = 200;
        const start = Math.max(0, index - r);
        const end = Math.min(original.length, index + phrase.length + r);
        return original.substring(start, end).trim();
    }

   
    function tokenOverlapSimilarity(text, phrase) {
        const textTokens = new Set(
            text.toLowerCase().split(/\W+/).filter(Boolean)
        );
        const phraseTokens = phrase
            .toLowerCase()
            .split(/\W+/)
            .filter(Boolean);
        if (phraseTokens.length === 0) return 0;
        let overlap = 0;
        for (const t of phraseTokens) {
            if (textTokens.has(t)) overlap++;
        }
        return overlap / phraseTokens.length; 
    }

    function severityWeight(sev) {
        const s = (sev || "").toLowerCase();
        if (s === "high") return 3;
        if (s === "medium") return 2;
        return 1;
    }

   
    const rules = await entities.audit_rules.find({
        select: [
            "rule_id",
            "clause_title",
            "severity",
            "enabled",
            "triggers_any",
            "require_any",
            "require_all",
            "regex_any",
            "weight",
            "depends_on",
            "risk_note",
            "remediation"
        ],
        where: { enabled: true },
        order: { rule_id: "ASC" },
        skip: 0,
        take: 1000,
        cache: false
    });

    if (!rules || rules.length === 0) {
        throw new Error("No enabled rules found in audit_rules table.");
    }

    const parsedRules = rules.map((r) => ({
        rule_id: r.rule_id,
        clause_title: r.clause_title,
        severity: r.severity || "Medium",
        triggers: toArray(r.triggers_any),
        reqAny: toArray(r.require_any),
        reqAll: toArray(r.require_all),
        regexAny: toRegexArray(r.regex_any),
        
        weight: typeof r.weight === "number" ? r.weight : null,
        dependsOn: toArray(r.depends_on).map((id) => id.toUpperCase()),
        riskNote: r.risk_note,
        remediation: r.remediation
    }));

    
    const ruleById = {};
    parsedRules.forEach((r) => {
        ruleById[r.rule_id.toUpperCase()] = r;
    });

   
    function evaluateRule(rule) {
        const severity = rule.severity;
        const triggers = rule.triggers;
        const reqAny = rule.reqAny;
        const reqAll = rule.reqAll;
        const regexAny = rule.regexAny;

       
        let applicable = true;
        if (triggers.length > 0) {
            applicable = triggers.some((p) => containsPhrase(normalizedText, p));
        }
        if (!applicable) {
            return {
                rule_id: rule.rule_id,
                clause_title: rule.clause_title,
                severity,
                status: "not_applicable",
                score: 0,
                matchedPhrases: [],
                snippet: null,
                riskNote: null,
                remediation: null,
                dependsOn: rule.dependsOn
            };
        }

        
        const matchedAny = [];

       
        for (const p of reqAny) {
            if (containsPhrase(normalizedText, p)) {
                matchedAny.push(p);
            } else {
                
                const sim = tokenOverlapSimilarity(normalizedText, p);
                if (sim >= 0.6) {
                    matchedAny.push(p + " (fuzzy)");
                }
            }
        }

        
        for (const re of regexAny) {
            if (re.test(rawText)) {
                matchedAny.push(re.toString() + " (regex)");
            }
        }

        
        const allRequiredAllPresent =
            reqAll.length === 0 || reqAll.every((p) => containsPhrase(normalizedText, p));

        let status = "missing";
        let score = 0;

        if (matchedAny.length > 0 && allRequiredAllPresent) {
            status = "present";
            score = 1;
        } else if (matchedAny.length > 0) {
            status = "weak";
            score = 0.5;
        }

        
        let snippet = null;
        const searchPhrases =
            matchedAny.length > 0 ? reqAny : reqAny;
        const firstHit = findFirstPhraseIndex(normalizedText, searchPhrases);
        if (firstHit) {
            snippet = getSnippet(rawText, firstHit.phrase, firstHit.index);
        }

        return {
            rule_id: rule.rule_id,
            clause_title: rule.clause_title,
            severity,
            status,
            score,
            matchedPhrases: matchedAny,
            snippet,
            riskNote: status === "missing" || status === "weak" ? rule.riskNote : null,
            remediation:
                status === "missing" || status === "weak" ? rule.remediation : null,
            dependsOn: rule.dependsOn
        };
    }

    const clauseResults = parsedRules.map(evaluateRule);

    
    let totalRiskScore = 0;
    let highSeverityIssue = false;

    function getClauseWeight(rule, severity) {
        if (rule.weight != null) return rule.weight;
        return severityWeight(severity);
    }

    for (const c of clauseResults) {
        const baseRule = ruleById[c.rule_id.toUpperCase()];
        const weight = getClauseWeight(baseRule, c.severity);

        if (c.status === "missing") {
            totalRiskScore += weight;
            if ((c.severity || "").toLowerCase() === "high") {
                highSeverityIssue = true;
            }
        } else if (c.status === "weak") {
            totalRiskScore += weight * 0.5;
            if ((c.severity || "").toLowerCase() === "high") {
                highSeverityIssue = true;
            }
        }
    }


    const byIdResult = {};
    clauseResults.forEach((c) => {
        byIdResult[c.rule_id.toUpperCase()] = c;
    });

    const gdprRes = byIdResult["GDPR"];
    const securityRes = byIdResult["SECURITY"];

    if (gdprRes && gdprRes.status !== "not_applicable" && securityRes) {
        if (securityRes.status === "missing" || securityRes.status === "weak") {
            
            totalRiskScore += 2;
            if (securityRes.severity.toLowerCase() === "medium") {
                
                highSeverityIssue = true;
            }
        }
    }

    
    for (const c of clauseResults) {
        if (c.dependsOn && c.dependsOn.length > 0) {
            for (const depId of c.dependsOn) {
                const parent = byIdResult[depId.toUpperCase()];
                if (parent && parent.status !== "not_applicable") {
                    if (c.status === "missing" || c.status === "weak") {
                        totalRiskScore += 1; 
                    }
                }
            }
        }
    }

    
    let riskLevel = "Low";
    if (totalRiskScore > 0 && totalRiskScore <= 4) {
        riskLevel = "Medium";
    } else if (totalRiskScore > 4) {
        riskLevel = "High";
    }

    let status = "Pass";
    if (highSeverityIssue || totalRiskScore > 0) {
        status = "Fail";
    }

    
    const missingOrWeak = clauseResults.filter(
        (c) => c.status === "missing" || c.status === "weak"
    );

    let findingsText;
    let remediationText;

    if (missingOrWeak.length === 0) {
        findingsText = "No material compliance risks detected in the audited clauses.";
        remediationText = "No action required for the audited clauses.";
    } else {
        findingsText = missingOrWeak
            .map((c) => {
                const sev =
                    c.severity.charAt(0).toUpperCase() +
                    c.severity.slice(1).toLowerCase();
                const note = c.riskNote ? ` ${c.riskNote}` : "";
                return `- [${sev}] ${c.clause_title}: ${c.status}.${note}`;
            })
            .join("\n");

        const remSet = new Set();
        for (const c of missingOrWeak) {
            if (c.remediation) {
                remSet.add(`- ${c.remediation}`);
            }
        }
        remediationText = Array.from(remSet).join("\n");
    }

   
    result.success = true;
    result.data = {
        document_label: docLabel,
        status,
        risk_score: totalRiskScore,
        risk_level: riskLevel,
        findings: findingsText,
        remediation: remediationText,
        clauses: clauseResults
    };

} catch (error) {
    log.error(
        `Audit Script Error for ${payload.file_name || "unknown file"}: `,
        error.message
    );
    result.success = false;
    result.data = { error: error.message };
}
