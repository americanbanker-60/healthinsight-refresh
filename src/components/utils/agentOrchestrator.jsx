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
    agentType
  });
  
  // Execute with retries
  let currentPrompt = fullPrompt;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await securedInvokeLLM({
        prompt: currentPrompt,
        add_context_from_internet: false
      });
      
      // Validate output
      const validation = validateOutput(result, structureGuide, agentType);
      
      if (validation.valid) {
        return result;
      }
      
      // If invalid and retries remain, try again with stricter prompt
      if (attempt < maxRetries) {
        console.warn(`Attempt ${attempt + 1} validation failed:`, validation.issues);
        currentPrompt = addStricterInstructions(currentPrompt, validation.issues);
        continue;
      }
      
      // Final attempt failed, return with warning
      console.error(`All ${maxRetries + 1} attempts failed validation for ${agentType}`);
      return result + "\n\n[Note: Output may not fully meet structure requirements]";
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`Attempt ${attempt + 1} failed with error:`, error.message);
    }
  }
}

async function buildPrompt({ systemPrompt, userPrompt, structureGuide, data, includeFormatting = true, agentType }) {
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

function validateOutput(output, structureGuide, agentType) {
  const issues = [];
  
  if (!output || typeof output !== 'string') {
    issues.push("Output is empty or not a string");
    return { valid: false, issues };
  }
  
  // Check minimum length
  if (output.length < 200) {
    issues.push("Output is too short (< 200 characters)");
  }
  
  // Agent-specific validation
  switch (agentType) {
    case 'deepDive':
      const requiredSections = [
        '**Executive Summary**',
        '**Market Overview**',
        '**Key Drivers & Forces**',
        '**Landscape Map**',
        '**Recent Timeline**',
        '**Major News Highlights**',
        '**Most Important Excerpts**',
        '**Consolidated Summary**'
      ];
      
      requiredSections.forEach(section => {
        if (!output.includes(section)) {
          issues.push(`Missing required section: ${section}`);
        }
      });
      break;
      
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
  
  // Check for hallucination indicators
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
  
  return {
    valid: issues.length === 0,
    issues
  };
}

function addStricterInstructions(prompt, issues) {
  const stricterPrefix = `
CRITICAL VALIDATION ERRORS IN PREVIOUS ATTEMPT:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

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

CRITICAL HEADER FORMATTING:
- Use ## for main section headers (H2)
- Use ### for subsections (H3)
- Put a blank line before and after EVERY header
- Never use bold (**text**) for headers`,
      userPrompt: `Create a detailed actionability-focused deep-dive briefing with BD strategies using proper markdown header hierarchy.`,
      structureGuide: `
CRITICAL: Use this EXACT header structure and hierarchy:

## Executive Summary

6-8 sentences covering: What's happening, BD implications, target opportunities, outreach angles, valuation dynamics, consolidation potential.

## Market Overview

3-4 paragraphs: Current state, key players, strategic moves, deal activity, valuation multiples, payer dynamics. Focus on actionable intelligence.

## Outreach Recommendations

8-12 specific outreach opportunities organized by target type (PE firms, operators, founders, platforms, management teams).
For each: Who to contact, why this matters to them, what angle to use, how to reference the insights.

## BD Pipeline Applications

6-10 deal origination and pipeline ideas: Target lists, subsector theses, geo expansion opportunities, follow-up strategies, PE outreach angles.
Connect each directly to market insights.

## Mini Email Templates

2–3 options formatted as outreach emails FROM the user (banker/advisor) TO potential targets (executives, PE firms, operators):

### Template 1
Subject: [specific subject line]
Body: [4–5 professional sentences positioning the sender as a banker/advisor with relevant market insights]

### Template 2
Subject: [specific subject line]
Body: [4–5 professional sentences]

## Thought Leadership & Marketing

8-12 content ideas: LinkedIn posts, pitch meeting themes, conference talking points, client memos, one-pager topics.
Tie each to valuation drivers, regulatory shifts, reimbursement dynamics, or consolidation themes.

## Collateral Creation Priorities

5-8 deliverable suggestions: Sector snapshots, valuation analyses, legislative timelines, competitive matrices, roll-up maps.
Specify exact focus and why it's timely.

## Valuation Tie-Ins

4-6 bullets on: Multiple expansion/compression factors, revenue durability signals, payer mix implications, scalability indicators, roll-up potential markers.

## Consolidated Action Plan

5-7 sentences synthesizing: Top 3 immediate actions, priority outreach targets, key messaging themes, timeline considerations.`
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