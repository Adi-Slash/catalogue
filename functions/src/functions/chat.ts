import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { addCorsHeaders } from '../shared/cors';
import { requireAuthentication } from '../shared/auth';

interface ChatRequest {
  message: string;
  assets: Array<{
    id: string;
    make: string;
    model: string;
    category?: string;
    value: number;
    datePurchased?: string;
  }>;
  language?: string;
}

/**
 * Generates insurance advice using OpenAI API or fallback logic
 */
async function generateInsuranceAdvice(
  message: string,
  assets: ChatRequest['assets'],
  language: string,
  context: InvocationContext
): Promise<string> {
  // Check if OpenAI API key is configured
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (openaiApiKey) {
    try {
      return await generateWithOpenAI(message, assets, language, openaiApiKey, openaiModel, context);
    } catch (error: any) {
      context.warn('OpenAI API error, falling back to rule-based response:', error.message);
      // Fall through to rule-based response
    }
  }

  // Fallback to rule-based insurance advice
  return generateRuleBasedAdvice(message, assets, language, context);
}

/**
 * Generates insurance advice using OpenAI API
 */
async function generateWithOpenAI(
  message: string,
  assets: ChatRequest['assets'],
  language: string,
  apiKey: string,
  model: string,
  context: InvocationContext
): Promise<string> {
  // Map language codes to full language names for better AI understanding
  const languageMap: Record<string, string> = {
    en: 'English',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
  };
  const languageName = languageMap[language] || 'English';

  // Build context about user's assets
  const assetsSummary = assets.length > 0
    ? `The user has ${assets.length} asset(s) in their catalog:\n${assets
        .map(
          (a) =>
            `- ${a.make} ${a.model}${a.category ? ` (${a.category})` : ''} - Value: $${a.value.toLocaleString()}${a.datePurchased ? ` - Purchased: ${a.datePurchased}` : ''}`
        )
        .join('\n')}`
    : 'The user has no assets in their catalog yet.';

  const systemPrompt = `You are a professional insurance advisor specializing in asset insurance. Your role is to provide helpful, accurate, and practical advice about insuring personal assets.

IMPORTANT: You must respond in ${languageName} (${language}). All your responses should be in ${languageName} language.

Key guidelines:
- Provide clear, actionable advice
- Consider the user's specific assets when relevant
- Explain insurance concepts in simple terms
- Recommend appropriate coverage levels
- Mention important considerations like deductibles, coverage limits, and exclusions
- Be professional but friendly
- If asked about specific assets, reference the user's catalog when relevant
- Always emphasize the importance of reading policy documents carefully
- Respond entirely in ${languageName} language

User's asset catalog:
${assetsSummary}

Respond concisely but thoroughly in ${languageName}. If the question is about a specific asset, reference it from the catalog if available.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data: any = await response.json();
  return data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
}

/**
 * Generates rule-based insurance advice (fallback when OpenAI is not available)
 */
function generateRuleBasedAdvice(
  message: string,
  assets: ChatRequest['assets'],
  language: string,
  context: InvocationContext
): string {
  // For rule-based responses, we'll return English for now
  // In a production system, you'd want to add translations here
  // For now, we'll let OpenAI handle localization when available
  const isLocalized = language !== 'en';
  
  if (isLocalized) {
    // Return a message indicating that localized responses require OpenAI API
    const localizedMessages: Record<string, string> = {
      fr: 'Pour des réponses en français, veuillez configurer la clé API OpenAI. En attendant, voici des conseils généraux en anglais.',
      de: 'Für Antworten auf Deutsch konfigurieren Sie bitte den OpenAI API-Schlüssel. Hier sind vorerst allgemeine Ratschläge auf Englisch.',
      ja: '日本語での回答には、OpenAI APIキーの設定が必要です。当面は、英語での一般的なアドバイスを提供します。',
    };
    return localizedMessages[language] || 'For localized responses, please configure the OpenAI API key.';
  }

  // Continue with English rule-based responses below
  const lowerMessage = message.toLowerCase();

  // Calculate total portfolio value
  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);

  // Common insurance advice patterns
  if (lowerMessage.includes('coverage') || lowerMessage.includes('cover')) {
    return `Based on your ${assets.length} asset(s) totaling $${totalValue.toLocaleString()}, I recommend:

1. **Home Contents Insurance**: Covers most household items including electronics, furniture, and tools. Typically covers theft, fire, and water damage.

2. **Valuable Items Insurance**: For high-value items (usually over $1,000-$2,000), consider scheduling them separately for full replacement value coverage.

3. **Specialty Insurance**: 
   - Electronics: May need additional coverage for accidental damage
   - Jewellery: Often requires separate appraisal and scheduling
   - Instruments: May need specialized musical instrument insurance

4. **Coverage Amount**: Ensure your policy limit covers your total portfolio value ($${totalValue.toLocaleString()}).

Would you like advice on any specific category of assets?`;
  }

  if (lowerMessage.includes('premium') || lowerMessage.includes('cost')) {
    return `Insurance premiums vary based on several factors:

1. **Total Coverage Amount**: Your portfolio value of $${totalValue.toLocaleString()} will influence premium costs.

2. **Deductible**: Higher deductibles typically lower premiums but increase out-of-pocket costs.

3. **Location**: Risk factors in your area (crime rates, natural disasters) affect pricing.

4. **Item Types**: High-value electronics, jewellery, and instruments may increase premiums.

5. **Security Measures**: Security systems, safes, and alarms can reduce premiums.

Average home contents insurance costs $50-$200/month depending on coverage. For specific quotes, contact insurance providers directly.

Would you like tips on reducing insurance costs?`;
  }

  if (lowerMessage.includes('deductible')) {
    return `A deductible is the amount you pay out-of-pocket before insurance coverage kicks in.

**Choosing a Deductible:**

- **Low Deductible ($250-$500)**: Higher premiums, but less out-of-pocket when filing claims. Good if you expect frequent claims.

- **High Deductible ($1,000-$2,500)**: Lower premiums, but more out-of-pocket per claim. Good if you want to save on monthly costs and rarely file claims.

**Recommendation**: For a portfolio worth $${totalValue.toLocaleString()}, consider a $500-$1,000 deductible as a balance between premium cost and coverage accessibility.

Remember: Only file claims for significant losses to avoid premium increases.`;
  }

  if (lowerMessage.includes('claim') || lowerMessage.includes('file')) {
    return `When filing an insurance claim:

1. **Document Everything**: Take photos/videos of damaged items, keep receipts, and maintain your asset catalog (like this one!).

2. **File Promptly**: Most policies require claims within a certain timeframe (often 30-60 days).

3. **Know Your Policy**: Understand what's covered, deductibles, and coverage limits before filing.

4. **Prevent Future Claims**: 
   - Keep detailed records (photos, serial numbers, purchase dates)
   - Store valuable items securely
   - Maintain security systems

5. **Consider Claim Impact**: Frequent claims can increase premiums or lead to policy cancellation.

Your asset catalog is already helping with documentation! Make sure to keep it updated with purchase dates and values.`;
  }

  if (lowerMessage.includes('recommend') || lowerMessage.includes('should')) {
    return `Based on your ${assets.length} asset(s), here are my recommendations:

1. **Review Your Current Policy**: Ensure coverage limits match your total portfolio value ($${totalValue.toLocaleString()}).

2. **Schedule High-Value Items**: Items over $1,000-$2,000 should be scheduled separately for full replacement value.

3. **Update Regularly**: As you add assets (you currently have ${assets.length}), update your insurance coverage accordingly.

4. **Document Everything**: Your asset catalog is excellent documentation! Keep it updated with:
   - Purchase dates
   - Receipts/photos
   - Serial numbers
   - Current values

5. **Consider Specialized Coverage**: 
   - Electronics: May need accidental damage coverage
   - Jewellery: Often requires separate appraisal
   - Instruments: Specialized insurance may be better

Would you like specific advice about any of your assets?`;
  }

  // Default response
  return `I'm here to help with insurance advice for your assets! 

You currently have ${assets.length} asset(s) in your catalog${totalValue > 0 ? ` worth $${totalValue.toLocaleString()}` : ''}.

I can help with:
- Coverage recommendations
- Understanding deductibles
- Filing claims
- Premium costs
- Specific asset categories

What would you like to know?`;
}

export async function chatHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Require authentication
    try {
      requireAuthentication(request);
    } catch (authError: any) {
      return addCorsHeaders({
        status: 401,
        jsonBody: { error: authError.message || 'Unauthorized - authentication required' },
      });
    }

    const body = (await request.json()) as ChatRequest;

    if (!body.message || typeof body.message !== 'string') {
      return addCorsHeaders({
        status: 400,
        jsonBody: { error: 'Missing or invalid message' },
      });
    }

    const assets = body.assets || [];
    const language = body.language || 'en';

    // Generate insurance advice
    const response = await generateInsuranceAdvice(body.message, assets, language, context);

    return addCorsHeaders({
      status: 200,
      jsonBody: { response },
    });
  } catch (error: any) {
    context.error('Error in chat handler:', error);
    return addCorsHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message },
    });
  }
}

app.http('chat', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'chat',
  handler: chatHandler,
});
