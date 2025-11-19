import { securedInvokeLLM } from "./aiDefenseWrapper";
import { buildStructuredInput } from "./contentPreprocessor";

/**
 * Centralized AI agent orchestration with validation and retry logic
 * All AI calls flow through this system
 */

const MAX_RETRIES = 2;

export async function orchestrateAgent(config) {
  const {
    agentType,
    newsletters,
    context = {},
    systemPrompt,
    userPrompt,
    structureGuide,
    maxRetries = MAX_RETRIES
  } = config;
  
  // Build clean, structured input
  const structuredInput = buildStructuredInput(newsletters, context);
  
  // Construct full prompt
  const fullPrompt = buildPrompt({
    systemPrompt,
    userPrompt,
    structureGuide,
    data: structuredInput
  });
  
  // Execute with retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await securedInvokeLLM({
        prompt: fullPrompt,
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
        fullPrompt = addStricterInstructions(fullPrompt, validation.issues);
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

function buildPrompt({ systemPrompt, userPrompt, structureGuide, data }) {
  let prompt = "";
  
  if (systemPrompt) {
    prompt += `SYSTEM:\n${systemPrompt}\n\n`;
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
      systemPrompt: `You are a healthcare strategy analyst summarizing multiple newsletter excerpts.
Your job is to synthesize themes, trends, and insights across the provided items.
Do NOT hallucinate, speculate, or introduce unverified claims. Only use the content given.
Keep the writing crisp, concise, and business-oriented.`,
      userPrompt: `Summarize the following newsletter items as if preparing briefing notes for a healthcare strategy meeting.`,
      structureGuide: `
1. **TL;DR** (5–10 bullets) - Concise, actionable, theme-based points
2. **Key Themes** (3–5 themes) - Themes appearing across multiple items with examples
3. **Notable Points & Signals** - Important stats, policy shifts, deal activity
4. **Source Notes** - Brief per-source summaries
5. **If You Only Read One…** - Single most informative item with explanation`
    },
    
    packSummary: {
      agentType: 'packSummary',
      systemPrompt: `You are a healthcare market intelligence analyst. Your task is to summarize and synthesize
all items contained in a Learning Pack. Focus on clarity and pattern recognition.
Do NOT guess or add content not present in the inputs.`,
      userPrompt: `Provide a high-level synthesis of the Learning Pack contents.`,
      structureGuide: `
1. **Executive Summary** (4–6 sentences) - Core theme and major insights
2. **Key Drivers & Trends** (3–6 trends, 2–3 sentences each)
3. **What Matters for Operators/Payors/Investors** - Implications (descriptive, not advisory)
4. **Notable News & Events** - Major events, policy changes, launches, partnerships
5. **Terminology & Concepts** - Key terms mentioned repeatedly`
    },
    
    getSmartFast: {
      agentType: 'getSmartFast',
      systemPrompt: `You are a healthcare insights analyst tasked with producing a 60-second briefing on a topic.
The goal is to help a busy professional quickly understand the state of the topic based
solely on the provided content. No speculation, no unsupported claims.`,
      userPrompt: `Create a short "Get Smart Fast" briefing.`,
      structureGuide: `
1. **What This Topic Is About** (2–3 sentences)
2. **Current Landscape** (4–6 bullets)
3. **Key Forces & Pressures** (3–5 bullets)
4. **Recent Highlights** (5–10 bullets)
5. **Reading Priority** - Two most relevant items with explanation`
    },
    
    deepDive: {
      agentType: 'deepDive',
      systemPrompt: `You are a senior healthcare strategy analyst creating comprehensive research briefings for C-suite executives.
Your analysis must be sharp, nuanced, and actionable. Draw connections between data points, identify strategic implications,
and highlight competitive dynamics. Use ONLY the provided content - no speculation.`,
      userPrompt: `Create a detailed deep-dive research briefing analyzing the strategic implications and market dynamics.`,
      structureGuide: `
CRITICAL: Use these EXACT section headers (include the asterisks):

**Executive Summary**
6-8 sentences covering: What's happening, strategic significance, competitive dynamics, regulatory implications, market positioning, financial implications.

**Market Overview**
3-4 paragraphs analyzing: Current market state, key players, strategic moves, market structure, payer-provider dynamics, competitive threats. Include metrics and deal values.

**Key Drivers & Forces**
8-12 strategic drivers as bullets with business impact and affected stakeholders.

**Landscape Map**
Organize by Payors, Providers, Vendors/Tech, Regulatory with specific company names and strategic moves.

**Recent Timeline**
Chronological list of 15-20 significant events with dates and strategic significance.

**Major News Highlights**
15-25 key developments organized by theme with M&A, funding, launches, partnerships, regulatory developments.

**Most Important Excerpts**
6-8 strategically significant quotes with source, date, and strategic importance explanation.

**Consolidated Summary**
5-7 sentences synthesizing strategic picture, competitive dynamics, risks/opportunities, market evolution.`
    },
    
    customPack: {
      agentType: 'packSummary',
      systemPrompt: `You are a healthcare market intelligence analyst. Your task is to summarize and synthesize
all items contained in a custom intelligence pack. Focus on clarity and pattern recognition.
Do NOT guess or add content not present in the inputs.`,
      userPrompt: `Create a synthesis of this Custom Pack.`,
      structureGuide: `
1. **Executive Summary** (4–6 sentences) - Themes across curated items
2. **Key Insights** (3–6 major insights)
3. **Notable Highlights** - Important events, deals, trends, data points
4. **User Context** - Incorporate any user notes explaining selection rationale`
    },
    
    companyOverview: {
      agentType: 'summary',
      systemPrompt: `You are creating a brief company intelligence overview based solely on newsletter mentions.
Do NOT hallucinate, speculate, or invent facts.`,
      userPrompt: `Create a concise company overview.`,
      structureGuide: `
1. **What the company does** - Based on content descriptions
2. **Recent activity** - Major news, launches, deals, strategic moves
3. **Market presence** - Positioning in healthcare industry coverage`
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