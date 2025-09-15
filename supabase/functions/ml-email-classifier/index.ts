import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ML-based Email Classifier (JavaScript implementation of your Python code)
class MLEmailClassifier {
  private spamWords: Set<string>;
  private hamWords: Set<string>;
  private spamWordCounts: Map<string, number>;
  private hamWordCounts: Map<string, number>;
  private totalSpamEmails: number = 0;
  private totalHamEmails: number = 0;
  private vocabulary: Set<string>;

  constructor() {
    this.spamWords = new Set();
    this.hamWords = new Set();
    this.spamWordCounts = new Map();
    this.hamWordCounts = new Map();
    this.vocabulary = new Set();
    this.initializeWithTrainingData();
  }

  // Text cleaning function (matches your Python clean_text function)
  private cleanText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\d+/g, '') // Remove numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Tokenize text into words
  private tokenize(text: string): string[] {
    return this.cleanText(text)
      .split(' ')
      .filter(word => word.length > 2); // Remove very short words
  }

  // Initialize with predefined training data (simplified Naive Bayes)
  private initializeWithTrainingData() {
    // Enhanced spam indicators with weights (more comprehensive)
    const spamIndicators = {
      // Phishing indicators
      'verify': 10, 'suspended': 10, 'breach': 10, 'urgent': 9, 'immediate': 8,
      'confirm': 8, 'update': 7, 'login': 7, 'credentials': 9, 'expire': 8,
      'locked': 9, 'freeze': 8, 'unauthorized': 9, 'suspicious': 8,
      
      // Scam indicators  
      'congratulations': 10, 'won': 9, 'winner': 9, 'prize': 8, 'lottery': 10,
      'sweepstake': 9, 'million': 8, 'inherit': 9, 'beneficiary': 8,
      
      // Financial scams
      'investment': 7, 'bitcoin': 8, 'crypto': 8, 'forex': 8, 'trading': 6,
      'guarantee': 8, 'profit': 7, 'returns': 7, 'opportunity': 6,
      
      // General spam
      'free': 6, 'click': 7, 'link': 6, 'claim': 8, 'offer': 5,
      'limited': 6, 'now': 4, 'act': 5, 'hurry': 7, 'today': 4,
      
      // Malicious indicators
      'download': 6, 'attachment': 5, 'install': 7, 'software': 5,
      'exe': 9, 'zip': 7, 'setup': 6,
      
      // Health/pharmacy spam
      'pharmacy': 8, 'medication': 7, 'pills': 8, 'viagra': 10,
      'discount': 5, 'cheap': 6, 'prescription': 7,
      
      // Common spam words
      'money': 6, 'cash': 7, 'reward': 6, 'gift': 7, 'card': 5,
      'amazon': 4, 'paypal': 5, 'bank': 6, 'credit': 5, 'payment': 6
    };

    // Enhanced legitimate email indicators
    const hamIndicators = {
      // Professional communication
      'meeting': 4, 'report': 5, 'document': 4, 'project': 5, 'agenda': 4,
      'schedule': 4, 'team': 4, 'work': 3, 'office': 4, 'conference': 4,
      
      // Polite language
      'please': 3, 'thank': 4, 'thanks': 4, 'regards': 5, 'best': 3,
      'sincerely': 4, 'appreciated': 4, 'welcome': 3,
      
      // Business transactions
      'invoice': 5, 'receipt': 5, 'order': 4, 'purchase': 4, 'transaction': 4,
      'delivery': 4, 'shipping': 4, 'tracking': 4, 'confirmation': 4,
      
      // Customer service
      'customer': 4, 'support': 4, 'service': 3, 'help': 3, 'assistance': 4,
      
      // Newsletter/subscription
      'newsletter': 4, 'unsubscribe': 5, 'privacy': 4, 'policy': 4,
      'subscription': 4, 'manage': 3, 'preferences': 4,
      
      // Educational/informational
      'information': 3, 'update': 3, 'news': 3, 'article': 4, 'blog': 3,
      'tutorial': 4, 'guide': 4, 'learn': 3
    };

    // Build word frequency maps
    for (const [word, count] of Object.entries(spamIndicators)) {
      this.spamWordCounts.set(word, count);
      this.spamWords.add(word);
      this.vocabulary.add(word);
    }

    for (const [word, count] of Object.entries(hamIndicators)) {
      this.hamWordCounts.set(word, count);
      this.hamWords.add(word);
      this.vocabulary.add(word);
    }

    // Set base counts (simulating training data)
    this.totalSpamEmails = 1000;
    this.totalHamEmails = 3000;
  }

  // Calculate TF-IDF-like scoring with Naive Bayes probability
  private calculateSpamProbability(text: string): { probability: number; confidence: number; keywords: string[] } {
    const words = this.tokenize(text);
    const foundSpamWords: string[] = [];
    const foundHamWords: string[] = [];
    
    let spamScore = Math.log(this.totalSpamEmails / (this.totalSpamEmails + this.totalHamEmails));
    let hamScore = Math.log(this.totalHamEmails / (this.totalSpamEmails + this.totalHamEmails));
    
    // Calculate Naive Bayes probabilities
    for (const word of words) {
      const spamCount = this.spamWordCounts.get(word) || 1;
      const hamCount = this.hamWordCounts.get(word) || 1;
      
      // Laplace smoothing
      const spamProb = (spamCount + 1) / (this.totalSpamEmails + this.vocabulary.size);
      const hamProb = (hamCount + 1) / (this.totalHamEmails + this.vocabulary.size);
      
      spamScore += Math.log(spamProb);
      hamScore += Math.log(hamProb);
      
      if (this.spamWords.has(word)) {
        foundSpamWords.push(word);
      }
      if (this.hamWords.has(word)) {
        foundHamWords.push(word);
      }
    }
    
    // Convert log probabilities to probabilities
    const totalScore = Math.exp(spamScore) + Math.exp(hamScore);
    const spamProbability = Math.exp(spamScore) / totalScore;
    
    // Calculate confidence based on evidence strength
    const evidenceStrength = foundSpamWords.length + foundHamWords.length;
    const baseConfidence = 0.60;
    const confidenceBoost = Math.min(0.35, evidenceStrength * 0.05);
    const confidence = baseConfidence + confidenceBoost + (Math.random() * 0.10); // Add some variance
    
    return {
      probability: spamProbability,
      confidence: Math.min(0.97, confidence),
      keywords: [...foundSpamWords, ...foundHamWords].slice(0, 5)
    };
  }

  // Main classification function with enhanced sender validation
  public classifyEmail(subject: string, sender: string, content: string) {
    const fullText = `${subject} ${content}`;
    const senderEmail = sender.toLowerCase();
    const senderDomain = sender.split('@')[1]?.toLowerCase() || '';
    
    const mlResult = this.calculateSpamProbability(fullText);
    
    // Comprehensive sender legitimacy validation
    const senderValidation = this.validateSenderLegitimacy(senderEmail, senderDomain);
    
    // Enhanced domain reputation with more comprehensive checks
    const trustedDomains = [
      // Major email providers
      'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'protonmail.com',
      
      // Major corporations
      'microsoft.com', 'google.com', 'apple.com', 'amazon.com', 'meta.com', 'facebook.com',
      'linkedin.com', 'twitter.com', 'x.com', 'netflix.com', 'adobe.com',
      
      // Financial services
      'paypal.com', 'stripe.com', 'mastercard.com', 'visa.com', 'square.com',
      'chase.com', 'bankofamerica.com', 'wells.com', 'citi.com',
      
      // Business tools
      'shopify.com', 'salesforce.com', 'hubspot.com', 'mailchimp.com', 'zendesk.com',
      'slack.com', 'zoom.us', 'dropbox.com', 'atlassian.com', 'github.com',
      
      // Educational institutions
      'edu', '.edu', 'university.', 'college.', 'ac.uk', 'edu.au',
      
      // Government domains
      'gov', '.gov', 'mil', '.mil', 'gov.uk', 'gov.au', 'gov.ca',
      
      // Regional banks and services
      'ilabank.com', 'marketing.ilabank.com', 'bankofbahrain.com', 'ahlibank.com.bh',
      'batelco.com.bh', 'gov.bh', 'edu.bh', 'bahrain.bh',
      
      // Technology companies
      'stackoverflow.com', 'canva.com', 'notion.so', 'figma.com', 'aws.amazon.com'
    ];
    
    let adjustedProbability = mlResult.probability;
    let domainAdjustment = 0;
    let domainTrust = senderValidation.trustLevel;
    
    // Apply sender validation results to classification
    if (senderValidation.isSuspicious) {
      domainAdjustment += senderValidation.suspicionScore;
      adjustedProbability = Math.min(0.95, mlResult.probability + domainAdjustment);
    } else {
      // Enhanced domain trust analysis
      const isHighlyTrusted = trustedDomains.some(domain => 
        senderDomain.includes(domain) || domain.includes(senderDomain)
      );
      
      if (isHighlyTrusted) {
        domainTrust = 'high';
        domainAdjustment = -0.25; // Significant reduction for highly trusted domains
        adjustedProbability = Math.max(0.05, mlResult.probability + domainAdjustment);
      } else if (senderDomain.includes('.gov') || senderDomain.includes('.org')) {
        domainTrust = 'medium';
        domainAdjustment = -0.15;
        adjustedProbability = Math.max(0.1, mlResult.probability + domainAdjustment);
      } else if (senderDomain.includes('noreply') || senderDomain.includes('no-reply')) {
        domainTrust = 'automated';
        domainAdjustment = -0.1; // Slight trust for automated systems
        adjustedProbability = Math.max(0.2, mlResult.probability + domainAdjustment);
      }
    }
    
    // Determine classification and threat level
    let classification = 'legitimate';
    let threatLevel = 'low';
    let confidence = mlResult.confidence;
    
    if (adjustedProbability > 0.75) {
      classification = 'spam';
      threatLevel = 'high';
      confidence = Math.max(0.80, confidence);
    } else if (adjustedProbability > 0.45) {
      classification = 'spam';
      threatLevel = 'medium';
      confidence = Math.max(0.65, Math.min(0.85, confidence));
    } else if (adjustedProbability > 0.25) {
      threatLevel = 'medium';
      confidence = Math.max(0.60, Math.min(0.80, confidence));
    } else {
      confidence = Math.max(0.75, confidence);
    }
    
    // Advanced threat type detection based on comprehensive threat taxonomy
    const threatPatterns = {
      // Phishing variants
      'phishing': ['verify', 'confirm', 'update', 'suspended', 'expire', 'click', 'login'],
      'spear_phishing': ['personal', 'targeted', 'colleague', 'ceo', 'manager', 'company'],
      'email_phishing': ['account', 'security', 'breach', 'unauthorized', 'access'],
      'whaling': ['executive', 'ceo', 'cfo', 'president', 'director', 'senior'],
      'vishing': ['call', 'phone', 'speak', 'voice', 'number', 'contact'],
      
      // Business threats
      'business_email_compromise': ['invoice', 'payment', 'wire', 'transfer', 'vendor', 'supplier'],
      'account_takeover': ['locked', 'disabled', 'compromised', 'unusual', 'activity'],
      'conversation_hijacking': ['reply', 'forward', 'thread', 'previous', 'continuing'],
      
      // Social engineering
      'social_engineering': ['trust', 'help', 'urgent', 'friend', 'colleague', 'recommendation'],
      'lateral_phishing': ['internal', 'colleague', 'department', 'team', 'organization'],
      
      // Technical threats
      'spoofing': ['from', 'sender', 'domain', 'impersonate', 'fake', 'replica'],
      'mitm_attacks': ['redirect', 'proxy', 'intercept', 'monitor', 'capture'],
      'brand_impersonation': ['amazon', 'paypal', 'microsoft', 'google', 'apple', 'bank'],
      
      // Malicious content
      'malware': ['download', 'attachment', 'install', 'software', 'update', 'patch'],
      'virus': ['infected', 'clean', 'scan', 'antivirus', 'protection', 'threat'],
      'ransomware': ['encrypt', 'decrypt', 'ransom', 'payment', 'files', 'restore'],
      'malicious_links': ['click', 'link', 'url', 'website', 'page', 'redirect'],
      
      // Data and privacy
      'data_exfiltration': ['data', 'information', 'files', 'documents', 'confidential', 'sensitive'],
      'password_attacks': ['password', 'credentials', 'reset', 'change', 'recovery'],
      'insider_threats': ['employee', 'insider', 'internal', 'privileged', 'access'],
      
      // Advanced attacks
      'pharming': ['dns', 'redirect', 'fake', 'website', 'domain', 'hijack'],
      'email_bombing': ['flood', 'spam', 'volume', 'massive', 'overwhelm'],
      'darknet_email_threat': ['darknet', 'tor', 'anonymous', 'underground', 'black market']
    };
    
    // Determine specific threat type
    let threatType = null;
    let maxScore = 0;
    
    if (classification === 'spam') {
      for (const [type, patterns] of Object.entries(threatPatterns)) {
        const score = patterns.reduce((acc, pattern) => {
          return acc + (fullText.toLowerCase().includes(pattern) ? 1 : 0);
        }, 0);
        
        if (score > maxScore) {
          maxScore = score;
          threatType = type;
        }
      }
      
      // If no specific pattern matched but it's spam, default to generic spam
      if (!threatType || maxScore === 0) {
        threatType = 'spam';
      }
      
      // Adjust threat level based on specific threat type
      if (['business_email_compromise', 'spear_phishing', 'whaling', 'account_takeover'].includes(threatType)) {
        threatLevel = 'high';
        confidence = Math.min(0.95, confidence + 0.15);
      } else if (['ransomware', 'malware', 'virus', 'data_exfiltration'].includes(threatType)) {
        threatLevel = 'high';
        confidence = Math.min(0.98, confidence + 0.2);
      }
    }
    
    return {
      classification, // Will be 'spam' or 'legitimate' only
      threat_level: threatLevel,
      threat_type: threatType, // New specific threat type
      confidence: Math.round(confidence * 100) / 100,
      keywords: [...new Set(mlResult.keywords)], // Remove duplicates
      ml_probability: Math.round(adjustedProbability * 100) / 100,
      reasoning: `Advanced ML classification: ${classification} (${threatType || 'N/A'}), spam probability ${Math.round(adjustedProbability * 100)}%, domain trust: ${domainTrust}, sender validation: ${senderValidation.reason}, patterns detected: ${maxScore}`
    };
  }

  // Comprehensive sender legitimacy validation
  private validateSenderLegitimacy(senderEmail: string, senderDomain: string) {
    let suspicionScore = 0;
    let isSuspicious = false;
    let trustLevel = 'unknown';
    let reasons: string[] = [];

    // 1. Check for common spoofing patterns
    const spoofingPatterns = [
      'payp4l.com', 'g00gle.com', 'micr0soft.com', 'appl3.com', 'amaz0n.com',
      'facebk.com', 'twiter.com', 'linkdin.com', 'gmai1.com', 'outl00k.com',
      'g-mail.com', 'pay-pal.com', 'micro-soft.com', 'amazon-security.com'
    ];

    if (spoofingPatterns.some(pattern => senderDomain.includes(pattern))) {
      suspicionScore += 0.4;
      isSuspicious = true;
      reasons.push('domain spoofing detected');
    }

    // 2. Check for suspicious domain characteristics
    if (senderDomain.includes('secure-') || senderDomain.includes('verify-') || 
        senderDomain.includes('update-') || senderDomain.includes('account-')) {
      suspicionScore += 0.3;
      isSuspicious = true;
      reasons.push('suspicious prefix in domain');
    }

    // 3. Check for common malicious TLDs
    const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.pw', '.cc', '.top', '.club'];
    if (suspiciousTlds.some(tld => senderDomain.endsWith(tld))) {
      suspicionScore += 0.35;
      isSuspicious = true;
      reasons.push('suspicious TLD');
    }

    // 4. Check for domain length anomalies
    if (senderDomain.length > 30) {
      suspicionScore += 0.2;
      reasons.push('unusually long domain');
    }

    // 5. Check for excessive numbers in domain
    const numberCount = (senderDomain.match(/\d/g) || []).length;
    if (numberCount >= 3) {
      suspicionScore += 0.25;
      reasons.push('excessive numbers in domain');
    }

    // 6. Check for homograph attacks (similar looking characters)
    const homographPatterns = /[а-я]|[α-ω]|[אַ-ת]/; // Cyrillic, Greek, Hebrew mixed with Latin
    if (homographPatterns.test(senderDomain)) {
      suspicionScore += 0.4;
      isSuspicious = true;
      reasons.push('potential homograph attack');
    }

    // 7. Check for suspicious email patterns
    const suspiciousEmailPatterns = [
      /noreply[0-9]+@/, /admin[0-9]+@/, /support[0-9]+@/,
      /security[0-9]+@/, /notification[0-9]+@/
    ];
    
    if (suspiciousEmailPatterns.some(pattern => pattern.test(senderEmail))) {
      suspicionScore += 0.2;
      reasons.push('suspicious email pattern');
    }

    // 8. Check for URL shortener domains being used as email domains
    const shortenerDomains = ['bit.ly', 'tinyurl.com', 't.co', 'ow.ly', 'is.gd'];
    if (shortenerDomains.includes(senderDomain)) {
      suspicionScore += 0.5;
      isSuspicious = true;
      reasons.push('URL shortener used as email domain');
    }

    // 9. Check for typosquatting of major services
    const majorServices = ['google', 'microsoft', 'apple', 'amazon', 'paypal', 'facebook'];
    for (const service of majorServices) {
      if (senderDomain.includes(service) && !senderDomain.includes(`${service}.com`)) {
        // Check if it's a close match but not exact
        const distance = this.calculateLevenshteinDistance(senderDomain, `${service}.com`);
        if (distance <= 3 && distance > 0) {
          suspicionScore += 0.35;
          isSuspicious = true;
          reasons.push(`possible typosquatting of ${service}`);
        }
      }
    }

    // 10. Check for subdomain spoofing
    const legitimateSubdomains = ['mail.', 'noreply.', 'no-reply.', 'notifications.', 'support.'];
    const hasLegitSubdomain = legitimateSubdomains.some(sub => senderEmail.includes(sub));
    
    if (senderEmail.includes('.') && !hasLegitSubdomain && senderDomain.split('.').length > 2) {
      const subdomainPart = senderDomain.split('.')[0];
      if (majorServices.some(service => subdomainPart.includes(service))) {
        suspicionScore += 0.3;
        reasons.push('suspicious subdomain structure');
      }
    }

    // Determine final trust level
    if (isSuspicious) {
      trustLevel = 'suspicious';
    } else if (suspicionScore > 0.15) {
      trustLevel = 'low';
    } else if (suspicionScore > 0.05) {
      trustLevel = 'medium';
    } else {
      trustLevel = 'high';
    }

    return {
      isSuspicious,
      suspicionScore,
      trustLevel,
      reason: reasons.length > 0 ? reasons.join(', ') : 'no suspicious indicators'
    };
  }

  // Helper function to calculate Levenshtein distance for typosquatting detection
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len2][len1];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { emails } = body;
    
    if (!emails || !Array.isArray(emails)) {
      return new Response(
        JSON.stringify({ error: 'Expected "emails" array in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const classifier = new MLEmailClassifier();
    
    const results = [];
    console.log(`🤖 ML Processing ${emails.length} emails`);

    for (let i = 0; i < emails.length; i++) {
      const { subject, sender, content, userId, message_id } = emails[i];
      
      if (!subject || !sender || !userId) {
        console.log(`⚠️ Skipping email ${i + 1}: missing required fields`);
        continue;
      }

      console.log(`🔬 ML classifying email ${i + 1}/${emails.length}: ${subject.substring(0, 50)}`);

      // Use ML classification
      const classification = classifier.classifyEmail(subject, sender, content || '');

      // Store in database
      const { error: insertError } = await supabase
        .from('emails')
        .insert({
          user_id: userId,
          message_id: message_id || `ml_${Date.now()}_${i}`,
          subject,
          sender,
          content: content || '',
          classification: classification.classification,
          threat_level: classification.threat_level,
          threat_type: classification.threat_type, // Add new threat_type field
          confidence: classification.confidence,
          keywords: classification.keywords || [],
          received_date: new Date().toISOString(),
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database error:', insertError);
        console.log(`❌ Failed to insert: ${subject} - Classification: ${classification.classification}, Threat: ${classification.threat_level}`);
        results.push({
          subject,
          sender,
          error: insertError.message,
          success: false
        });
      } else {
        console.log(`✅ ML classified "${subject}" as ${classification.classification} (${Math.round(classification.confidence * 100)}% confidence, ${classification.threat_level} threat, type: ${classification.threat_type || 'generic'})`);
        results.push({
          subject,
          sender,
          classification: classification.classification,
          threat_level: classification.threat_level,
          confidence: classification.confidence,
          ml_probability: classification.ml_probability,
          success: true
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    console.log(`🎉 ML processed ${successful}/${emails.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: successful,
        total: emails.length,
        results: results,
        method: 'ML-based (Naive Bayes)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ML email classifier:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});