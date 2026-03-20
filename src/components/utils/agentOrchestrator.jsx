import { securedInvokeLLM } from "./aiDefenseWrapper";
import { buildStructuredInput } from "./contentPreprocessor";
import { base44 } from "@/api/base44Client";

/**
 * Centralized AI agent orchestration with validation and retry logic
 * All AI calls flow through this system
 */

const MAX_RETRIES = 2;

// Cache for AI config to avoid repeated database calls
let cachedFormattingRules = null;
let cachedShortFormPrompt = null;

async function getFormattingRules() {
  if (cachedFormattingRules) return cachedFormattingRules;
  
  try {
    const configs = await base44.entities.AIConfig.filter({ 
      config_key: "formatting_rules", 
      active: true 
    });
    cachedFormattingRules = configs[0]?.content || "";
    return cachedFormattingRules;
  } catch (error) {
    console.warn("Failed to fetch formatting rules:", error);
    return "";
  }
}

async function getShortFormPrompt() {
  if (cachedShortFormPrompt) return cachedShortFormPrompt;
  
  try {
    const configs = await base44.entities.AIConfig.filter({ 
      config_key: "short_form_system_prompt", 
      active: true 
    });
    cachedShortFormPrompt = configs[0]?.content || "";
    return cachedShortFormPrompt;
  } catch (error) {
    console.warn("Failed to fetch short form prompt:", error);
    return "";
  }
}

export async function orchestrateAgent(config) {
  const {
    agentType,
    newsletters,
    context = {},
    systemPrompt,
    userPrompt,
    structureGuide,
    responseJsonSchema,
    maxRetries = MAX_RETRIES,
    includeFormatting = true
  } = config;
  
  // Build clean, structured input
  const structuredInput = buildStructuredInput(newsletters, context);
  
  // Construct full prompt
  const fullPrompt = await buildPrompt({
    systemPrompt,
    userPrompt,
    structureGuide,
    data: structuredInput,
    includeFormatting,
    agentType,
    jsonMode: !!responseJsonSchema
  });
  
  // Execute with retries
  let currentPrompt = fullPrompt;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await securedInvokeLLM({
        prompt: currentPrompt,
        add_context_from_internet: false,
        response_json_schema: responseJsonSchema || null
      });
      
      // Validate output — JSON mode or text mode
      const validation = validateOutput(result, structureGuide, agentType, responseJsonSchema);
      
      if (validation.valid) {
        return result;
      }
      
      // If invalid and retries remain, try again with error appended to prompt
      if (attempt < maxRetries) {
        console.warn(`Attempt ${attempt + 1} validation failed:`, validation.issues);
        currentPrompt = addStricterInstructions(currentPrompt, validation.issues, !!responseJsonSchema);
        continue;
      }
      
      // Final attempt failed — return best effort
      console.error(`All ${maxRetries + 1} attempts failed validation for ${agentType}`);
      return result;
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`Attempt ${attempt + 1} failed with error:`, error.message);
    }
  }
}

async function buildPrompt({ systemPrompt, userPrompt, structureGuide, data, includeFormatting = true, agentType, jsonMode = false }) {
  let prompt = "";
  
  // Use short-form prompt for repetitive tasks
  const shortFormTasks = ['summary', 'packSummary'];
  const useShortForm = shortFormTasks.includes(agentType);
  
  if (systemPrompt) {
    if (useShortForm) {
      // Replace with lightweight short-form prompt
      const shortPrompt = await getShortFormPrompt();
      prompt += `SYSTEM:\n${shortPrompt}\n\n`;
    } else {
      prompt += `SYSTEM:\n${systemPrompt}\n\n`;
    }
    
    // Only include formatting rules when needed (not for every call)
    if (includeFormatting) {
      const formattingRules = await getFormattingRules();
      if (formattingRules) {
        prompt += `${formattingRules}\n\n`;
      }
    }
  }
  
  if (userPrompt) {
    prompt += `USER:\n${userPrompt}\n\n`;
  }
  
  if (structureGuide) {
    prompt += `REQUIRED STRUCTURE:\n${structureGuide}\n\n`;
  }

  if (jsonMode) {
    prompt += `OUTPUT FORMAT: You MUST respond with valid JSON only. No markdown, no prose outside JSON. Follow the provided JSON schema exactly.\n\n`;
  }
  
  prompt += `CONTEXT:\n`;
  prompt += `- Total items analyzed: ${data.context.total_items}\n`;
  prompt += `- Date range: ${data.context.date_range}\n`;
  if (data.context.focus) {
    prompt += `- Focus area: ${data.context.focus}\n`;
  }
  prompt += `\n`;
  
  prompt += `DATA:\n${JSON.stringify(data.items, null, 2)}`;
  
  return prompt;
}

function validateOutput(output, structureGuide, agentType, responseJsonSchema = null) {
  const issues = [];

  // ── JSON-mode validation ──────────────────────────────────────────
  if (responseJsonSchema) {
    // output may already be a parsed object (InvokeLLM returns parsed JSON when schema is provided)
    let parsed = output;
    if (typeof output === 'string') {
      try {
        parsed = JSON.parse(output);
      } catch (e) {
        issues.push(`JSON parse error: ${e.message}`);
        return { valid: false, issues, parsed: null };
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      issues.push("Response is not a JSON object");
      return { valid: false, issues, parsed: null };
    }

    // Validate required top-level keys from schema
    const schemaProps = responseJsonSchema?.properties || {};
    const requiredKeys = responseJsonSchema?.required || Object.keys(schemaProps);
    requiredKeys.forEach(key => {
      if (!(key in parsed) || parsed[key] === null || parsed[key] === undefined || parsed[key] === '') {
        issues.push(`Missing or empty required JSON key: "${key}"`);
      }
    });

    return { valid: issues.length === 0, issues, parsed: issues.length === 0 ? parsed : null };
  }

  // ── Text-mode validation ──────────────────────────────────────────
  if (!output || typeof output !== 'string') {
    issues.push("Output is empty or not a string");
    return { valid: false, issues };
  }
  
  if (output.length < 200) {
    issues.push("Output is too short (< 200 characters)");
  }
  
  switch (agentType) {
    case 'summary':
    case 'packSummary':
      if (!output.includes('**') && !output.includes('##')) {
        issues.push("Output lacks structured sections (no headers found)");
      }
      break;
      
    case 'getSmartFast':
      if (!output.toLowerCase().includes('landscape') && !output.toLowerCase().includes('forces')) {
        issues.push("Output may be missing key analytical sections");
      }
      break;
  }
  
  // Hallucination check
  const hallucinationPatterns = [
    /according to (recent|latest) (reports|studies) not mentioned/i,
    /industry experts suggest/i,
    /it is (widely )?known that/i,
    /research shows/i
  ];
  hallucinationPatterns.forEach(pattern => {
    if (pattern.test(output)) {
      issues.push(`Potential hallucination detected: ${pattern.source}`);
    }
  });
  
  return { valid: issues.length === 0, issues };
}

function addStricterInstructions(prompt, issues, jsonMode = false) {
  const errorList = issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n');

  if (jsonMode) {
    const stricterPrefix = `
CRITICAL JSON ERRORS FROM PREVIOUS ATTEMPT — YOU MUST FIX THESE:
${errorList}

MANDATORY REQUIREMENTS:
- Return ONLY valid JSON. No markdown, no prose, no code fences.
- Every key listed above as missing or empty MUST be present and non-empty.
- If a value is an array, it must have at least one item.
- Do NOT wrap the JSON in \`\`\`json ... \`\`\` blocks.

`;
    return stricterPrefix + prompt;
  }

  const stricterPrefix = `
CRITICAL VALIDATION ERRORS IN PREVIOUS ATTEMPT:
${errorList}

YOU MUST:
- Include ALL required sections with exact header formatting
- Base ALL content ONLY on the provided data
- Do NOT reference external studies, reports, or data not provided
- Use bullet points and structured formatting
- Ensure each section has substantial content (not just 1-2 sentences)

`;
  return stricterPrefix + prompt;
}

export function createAgentConfig(type, newsletters, context) {
  const configs = {
    summary: {
      agentType: 'summary',
      includeFormatting: false, // Short-form task, skip formatting rules
      systemPrompt: `You are the Actionability Engine for a healthcare investment banking BD team. Transform every insight into immediate, tactical actions.
Focus on outreach opportunities, deal origination, thought leadership, and business development for U.S. healthcare services (urgent care, BH, imaging, ASC, PT/OT, dental, home health, anesthesia, MSOs, etc.).
Do NOT hallucinate or speculate. Only use the content given.`,
      userPrompt: `Create an actionable briefing that turns these insights into BD opportunities.`,
      structureGuide: `
### ACTIONABILITY PACK

1. **Outreach Recommendations** (3–6 bullets)
- Specify who to contact (founders, CEOs, CFOs, PE principals, platform companies, operators)
- State why this insight matters to them and what angle to use
- Connect directly to the content

2. **Mini Email Templates** (1–2 options)
Format as outreach emails FROM the user TO potential targets (company executives, PE firms, operators):
Subject: [specific subject line]
Body: [3–5 professional sentences positioning the user as an advisor/banker reaching out with relevant insights]

3. **Thought Leadership / Marketing Angles** (3–5 bullets)
- LinkedIn posts, memos, pitch themes, conference talking points
- Tie to valuation drivers, regulatory dynamics, reimbursement, consolidation

4. **BD Pipeline / Deal Origination Applications** (3–6 bullets)
- New target lists, follow-ups, PE outreach angles, subsector theses, geo expansion
- Link directly to the insight

5. **Collateral Creation Suggestions** (2–4 bullets)
- One-pagers, valuation snapshots, legislative timelines, reimbursement charts, competitive matrices
- Must be directly relevant

6. **Optional Valuation Tie-Ins** (1–2 bullets, if relevant)
- Multiple expansion/compression, revenue durability, payer mix, scalability, roll-up potential`
    },
    
    packSummary: {
      agentType: 'packSummary',
      includeFormatting: false, // Short-form task, skip formatting rules
      systemPrompt: `You are the Actionability Engine for healthcare investment banking business development. Transform Learning Pack contents into actionable BD strategies.
Focus on outreach, deal origination, and pipeline building for U.S. healthcare services sectors.
Do NOT guess or add content not present in the inputs.`,
      userPrompt: `Transform this Learning Pack into a BD action plan.`,
      structureGuide: `
### ACTIONABILITY PACK

1. **Outreach Recommendations** (3–6 bullets)
- Specify contacts (founders, CEOs, CFOs, PE firms, operators, platform companies)
- Explain why the pack insights matter to them and what angle to use
- Reference specific pack content

2. **Mini Email Templates** (1–2 options)
Format as outreach emails FROM the user TO potential targets (executives, PE principals, operators):
Subject: [specific subject]
Body: [3–5 sentences positioning the user as a banker/advisor reaching out]

3. **Thought Leadership / Marketing Angles** (3–5 bullets)
- LinkedIn themes, memos, pitch angles
- Tie to valuation, regulation, reimbursement, consolidation themes from the pack

4. **BD Pipeline / Deal Origination Applications** (3–6 bullets)
- Target lists, PE outreach, subsector theses, follow-up strategies
- Based on pack insights

5. **Collateral Creation Suggestions** (2–4 bullets)
- One-pagers, valuation snapshots, competitive matrices
- Directly tied to pack content

6. **Optional Valuation Tie-Ins** (1–2 bullets, if relevant)
- Multiple dynamics, revenue quality, scalability, payer mix implications`
    },
    
    getSmartFast: {
      agentType: 'getSmartFast',
      systemPrompt: `You are the Actionability Engine delivering rapid-fire BD opportunities from healthcare topic briefings.
Focus on immediate outreach angles, deal origination ideas, and business development tactics.
No speculation. Only use provided content.

CRITICAL FORMATTING FOR WORD EXPORT:
- Put TWO newlines (blank line) between EVERY paragraph
- Put TWO newlines before and after EVERY header
- Put TWO newlines before and after EVERY bullet list
- Separate bullet points with blank lines between them
- Keep paragraphs to 2-3 sentences max`,
      userPrompt: `Create an actionable "Get Smart Fast" briefing with BD opportunities. Use generous spacing between all elements.`,
      structureGuide: `
## Topic Overview

2-3 sentences on what's happening in this space.

---

## Immediate Outreach Opportunities

- **Target 1**: Who to contact and why this topic matters to them

- **Target 2**: Another contact opportunity with angle

- **Target 3**: Connect to specific content

---

## BD Pipeline Ideas

- Target list idea based on topic trends

- PE angle or subsector play

- Geographic or segment opportunity

---

## Marketing Angles

- LinkedIn post theme tied to valuation

- Pitch theme or conference talking point

---

## Mini Email Template

**Subject:** [Specific subject line]

Hi [Name],

Opening paragraph referencing the topic.

Value proposition paragraph.

Soft ask.

Best,
[Your Name]

REMEMBER: Put blank lines between EVERY paragraph, header, and bullet point.`
    },
    
    deepDive: {
      agentType: 'deepDive',
      systemPrompt: `You are the Actionability Engine creating comprehensive BD strategy briefings for healthcare investment bankers.
Transform deep-dive research into concrete business development actions: outreach lists, deal origination strategies, thought leadership angles, and pipeline opportunities.
Focus on U.S. healthcare services sectors. Use ONLY the provided content - no speculation.
Respond with a JSON object. Each key is a distinct section. Values must be non-empty strings or arrays.`,
      userPrompt: `Create a detailed actionability-focused deep-dive briefing with BD strategies. Return as structured JSON.`,
      structureGuide: `Return a JSON object with these exact keys:
- executive_summary: 6-8 sentence paragraph covering what's happening, BD implications, target opportunities, outreach angles, valuation dynamics.
- market_overview: 3-4 paragraph string on current state, key players, strategic moves, deal activity, valuation multiples, payer dynamics.
- outreach_recommendations: array of 8-12 strings, each specifying who to contact, why it matters, and what angle to use.
- bd_pipeline_applications: array of 6-10 strings, each a deal origination or pipeline idea connected to market insights.
- email_templates: array of 2-3 objects, each with "subject" (string) and "body" (string) keys.
- thought_leadership: array of 8-12 strings, each a LinkedIn post, pitch theme, or conference talking point tied to valuation drivers.
- collateral_priorities: array of 5-8 strings, each a deliverable suggestion with focus and timeliness rationale.
- valuation_tie_ins: array of 4-6 strings on multiple expansion/compression, revenue durability, payer mix, scalability, roll-up potential.
- consolidated_action_plan: 5-7 sentence paragraph synthesizing top 3 immediate actions, priority targets, key messaging themes.`,
      responseJsonSchema: {
        type: "object",
        required: [
          "executive_summary", "market_overview", "outreach_recommendations",
          "bd_pipeline_applications", "email_templates", "thought_leadership",
          "collateral_priorities", "valuation_tie_ins", "consolidated_action_plan"
        ],
        properties: {
          executive_summary: { type: "string" },
          market_overview: { type: "string" },
          outreach_recommendations: { type: "array", items: { type: "string" } },
          bd_pipeline_applications: { type: "array", items: { type: "string" } },
          email_templates: {
            type: "array",
            items: {
              type: "object",
              properties: { subject: { type: "string" }, body: { type: "string" } }
            }
          },
          thought_leadership: { type: "array", items: { type: "string" } },
          collateral_priorities: { type: "array", items: { type: "string" } },
          valuation_tie_ins: { type: "array", items: { type: "string" } },
          consolidated_action_plan: { type: "string" }
        }
      }
    },
    
    customPack: {
      agentType: 'packSummary',
      systemPrompt: `You are the Actionability Engine for healthcare investment banking. Transform this custom intelligence pack into BD actions.
Consider user notes as strategic context. Do NOT guess or add content not present.`,
      userPrompt: `Turn this Custom Pack into an actionable BD strategy.`,
      structureGuide: `
### ACTIONABILITY PACK

1. **Outreach Recommendations** (3–6 bullets)
- Based on curated items and user notes
- Specify contacts and angles

2. **Mini Email Templates** (1–2 options)
Format as outreach FROM user TO targets:
Subject: [specific]
Body: [3–5 sentences as banker/advisor reaching out]

3. **Thought Leadership Angles** (3–5 bullets)
- Marketing and pitch themes from pack insights

4. **BD Pipeline Applications** (3–6 bullets)
- Deal origination ideas tied to pack content

5. **Collateral Suggestions** (2–4 bullets)
- Deliverables based on pack themes

6. **Optional Valuation Tie-Ins** (if relevant)`
    },
    
    companyOverview: {
      agentType: 'summary',
      systemPrompt: `You are the Actionability Engine creating company intelligence for BD outreach.
Transform company mentions into outreach opportunities and deal angles. Do NOT hallucinate or invent facts.

CRITICAL FORMATTING REQUIREMENTS:
- Use proper Markdown headers (## for main sections, ### for subsections)
- Add a BLANK LINE between every paragraph
- Add a BLANK LINE before and after every list
- Keep paragraphs short (2-3 sentences max)
- Use bullet points with proper spacing
- Format for easy export to Word documents`,
      userPrompt: `Create an actionable company intelligence brief with proper markdown formatting for Word export.`,
      structureGuide: `
## Company Overview

2-3 sentences describing what the company does based on newsletter mentions.

---

## Recent Activity & Strategic Moves

- **[Activity 1]**: Brief description of the activity
  
- **[Activity 2]**: Brief description of the activity
  
- **[Activity 3]**: Brief description of the activity

---

## Outreach Opportunities

### Target Contacts

- **[Role/Title]**: Why to reach out and what angle to use
  
- **[Role/Title]**: Why to reach out and what angle to use

### Conversation Angles

- Angle 1 with context
  
- Angle 2 with context

---

## Sample Outreach Email

**Subject:** [Specific, compelling subject line]

Dear [Title/Name],

[Opening paragraph - 1-2 sentences establishing relevance to them]

[Middle paragraph - 2-3 sentences with the insight/value proposition]

[Closing paragraph - 1-2 sentences with soft call-to-action]

Best regards,
[Your Name]

---

## Deal Angle Assessment

### M&A Potential
- Assessment based on activity

### Growth Capital Indicators
- Assessment based on activity

### Partnership Opportunities
- Assessment based on activity

---

*Note: All insights derived from ${context?.itemCount || 'available'} newsletter mentions.*`
    }
  };
  
  const config = configs[type];
  if (!config) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  
  return {
    ...config,
    newsletters,
    context
  };
}