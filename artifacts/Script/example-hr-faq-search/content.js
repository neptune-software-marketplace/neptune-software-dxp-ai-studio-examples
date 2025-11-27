/*
This script takes the user’s question, loads FAQ entries from the faq-knowledge table, and uses custom 
text-matching rules to score and find the most relevant answer. It compares tokens from the question 
with each FAQ title, content, and category, applies special handling for “how to” and password-related 
queries, ranks all entries, and returns the best match plus up to two supporting results. 
If nothing matches or an error occurs, it returns a clear, structured error message.
*/


try {
    const question = payload && payload.question
        ? String(payload.question).trim()
        : "";

    const categoryFilter = payload && payload.category
        ? String(payload.category).trim()
        : "";

    if (!question) {
        throw new Error("missing-question");
    }

    const findOptions = {
        select: ["id", "display_id", "category", "title", "content"],
        where: {},
        take: 200,
        cache: false
    };



    const rows = await entities["example-faq-knowledge"].find(findOptions);

    if (!rows || !rows.length) {
        result.success = true;
        result.data = {
            question,
            answer: "",
            primarySource: null,
            supportingSources: [],
            error: "no-knowledge-rows"
        };
        return;
    }

    function normalizeText(text) {
        if (!text) return "";
        let norm = String(text)
            .toLowerCase()
            .replace(/[^a-z0-9äöüëéèàçåøæñ\s]/gi, " ")
            .replace(/\s+/g, " ")
            .trim();

       
        norm = norm
            .replace(/\blogged out\b/g, "logout")
            .replace(/\blog out\b/g, "logout")
            .replace(/\blog in\b/g, "login")
            .replace(/\blog-in\b/g, "login");

        return norm;
    }

    function uniqueTokens(text) {
        const norm = normalizeText(text);
        if (!norm) return [];
        const parts = norm.split(" ");
        const seen = {};
        const out = [];
        for (let i = 0; i < parts.length; i++) {
            const t = parts[i];
            if (!t || t.length <= 2) continue;
            if (!seen[t]) {
                seen[t] = true;
                out.push(t);
            }
        }
        return out;
    }

    function intersectionCount(setA, tokensB) {
        if (!setA || !tokensB || !tokensB.length) return 0;
        let c = 0;
        for (let i = 0; i < tokensB.length; i++) {
            if (setA[tokensB[i]]) c++;
        }
        return c;
    }

    function containsAny(text, words) {
        if (!text || !words || !words.length) return false;
        for (let i = 0; i < words.length; i++) {
            if (text.indexOf(words[i]) !== -1) return true;
        }
        return false;
    }

    const normQ = normalizeText(question);
    const qTokens = uniqueTokens(question);
    const qSet = {};
    for (let i = 0; i < qTokens.length; i++) {
        qSet[qTokens[i]] = true;
    }

    const qMentionsPassword = normQ.indexOf("password") !== -1;
    const qMentionsPwdAction = containsAny(normQ, [
        "reset", "change", "forgot", "reset password", "change password"
    ]);
    const qMentionsLogin = containsAny(normQ, ["login", "logout", "account", "session"]);

    const scored = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || {};

        const id         = row.id || null;
        const display_id = row.display_id || null;
        const category   = row.category || "";
        const title      = row.title || "";
        const content    = row.content || "";

        const normTitle   = normalizeText(title);
        const normContent = normalizeText(content);

        const titleTokens   = uniqueTokens(title);
        const contentTokens = uniqueTokens(content);

        const titleMatches   = intersectionCount(qSet, titleTokens);
        const contentMatches = intersectionCount(qSet, contentTokens);

        let score = 0;

        if (titleTokens.length > 0 && titleMatches > 0) {
            score += 8 * (titleMatches / titleTokens.length);
        }
        if (contentTokens.length > 0 && contentMatches > 0) {
            score += 3 * (contentMatches / Math.sqrt(contentTokens.length));
        }

        if (normTitle && normQ && normTitle.indexOf(normQ) !== -1) {
            score += 10;
        }
        if (normContent && normQ && normContent.indexOf(normQ) !== -1) {
            score += 4;
        }

        // "how to" questions
        if (normQ.indexOf("how to ") === 0 && normTitle.indexOf("how to ") === 0) {
            score += 5;
        }

        // Password-specific boosting
        if (qMentionsPassword &&
            (normTitle.indexOf("password") !== -1 || normContent.indexOf("password") !== -1)) {
            score += 4;
            if (qMentionsPwdAction &&
                (containsAny(normTitle, ["reset", "change", "forgot"]) ||
                 containsAny(normContent, ["reset", "change", "forgot"]))) {
                score += 8;
            }
        }

        // Login / logout / account issues
        if (qMentionsLogin &&
            (containsAny(normTitle, ["login", "logout"]) ||
             containsAny(normContent, ["login", "logout"]))) {
            score += 6;
        }


        if (categoryFilter) {
            const catTokens = uniqueTokens(categoryFilter);
            if (intersectionCount(qSet, catTokens) > 0) {
                score += 1;
            }
        }

        const totalTokenOverlap = titleMatches + contentMatches;

        scored.push({
            row: { id, display_id, category, title, content },
            score,
            totalTokenOverlap
        });
    }

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    
    const MIN_SCORE = 2;
    const MIN_OVERLAP = 1;

    if (
        !best ||
        best.score < MIN_SCORE ||
        best.totalTokenOverlap < MIN_OVERLAP
    ) {
        result.success = true;
        result.data = {
            question,
            answer: "",
            primarySource: null,
            supportingSources: [],
            error: "no-good-match"
        };
        return;
    }

    const primary = best.row;
    const supporting = [];

    for (let i = 1; i < scored.length && supporting.length < 2; i++) {
        const cand = scored[i];
        if (
            cand.score >= MIN_SCORE &&
            cand.totalTokenOverlap >= MIN_OVERLAP &&
            cand.row.title &&
            cand.row.title !== primary.title
        ) {
            supporting.push(cand.row);
        }
    }

    result.success = true;
    result.data = {
        question,
        answer: primary.content || "",
        primarySource: primary,
        supportingSources: supporting,
        error: null
    };

} catch (error) {
    log.error("FAQ Script Error:", error.message);
    result.success = false;
    result.data = {
        question: payload && payload.question ? String(payload.question) : "",
        answer: "",
        primarySource: null,
        supportingSources: [],
        error: error.message || "unexpected-error"
    };
}
