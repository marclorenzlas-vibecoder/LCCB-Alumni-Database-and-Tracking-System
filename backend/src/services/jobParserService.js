const axios = require('axios');
const cheerio = require('cheerio');
const pdfParseModule = require('pdf-parse');
const { cleanHtmlToFormattedText } = require('../utils/cleanText');

/**
 * Extract plain text from PDF buffer, handling both v1 (function) and v2 (class) pdf-parse API
 */
const extractPdfText = async (buffer) => {
  if (typeof pdfParseModule === 'function') {
    const data = await pdfParseModule(buffer);
    return data?.text || '';
  }
  if (typeof pdfParseModule?.default === 'function') {
    const data = await pdfParseModule.default(buffer);
    return data?.text || '';
  }
  if (pdfParseModule?.PDFParse) {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    try {
      const data = await parser.getText();
      return data?.text || '';
    } finally {
      if (typeof parser.destroy === 'function') {
        try {
          await parser.destroy();
        } catch {}
      }
    }
  }
  throw new Error('PDF parsing library could not extract document text.');
};

/**
 * Clean HTML tags and entities to readable text
 */
const htmlToText = (html) => {
  if (!html) return '';
  return cleanHtmlToFormattedText(html);
};

/**
 * Attempt to extract from JSON-LD schema (JobPosting)
 */
const extractFromJsonLd = ($) => {
  let jobData = null;
  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const raw = $(elem).html();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
      for (const item of items) {
        if (item && (item['@type'] === 'JobPosting' || item['@type']?.includes?.('JobPosting'))) {
          jobData = item;
          break;
        }
      }
    } catch {}
  });

  if (!jobData) return null;

  let location = '';
  if (typeof jobData.jobLocation === 'string') {
    location = jobData.jobLocation;
  } else if (jobData.jobLocation?.address) {
    const addr = jobData.jobLocation.address;
    if (typeof addr === 'string') {
      location = addr;
    } else {
      location = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ');
    }
  }

  let type = '';
  const rawType = String(jobData.employmentType || '').toLowerCase();
  if (rawType.includes('full')) type = 'Full-time';
  else if (rawType.includes('part')) type = 'Part-time';
  else if (rawType.includes('contract')) type = 'Contract';
  else if (rawType.includes('remote')) type = 'Remote';

  let description = '';
  if (jobData.description) {
    description = cleanHtmlToFormattedText(jobData.description);
  }

  return {
    job_title: jobData.title || '',
    company: jobData.hiringOrganization?.name || '',
    location,
    type,
    description
  };
};

/**
 * Heuristic fallback extraction
 */
const extractHeuristically = (text, meta = {}) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Title
  let job_title = meta.title || '';
  if (!job_title && lines.length > 0) {
    job_title = lines[0].slice(0, 80);
  }

  // Company
  let company = meta.site_name || '';
  if (!company) {
    const compMatch = text.match(/(?:at|company|employer)[:\s]+([A-Z][A-Za-z0-9\s&.,-]{2,40})/i);
    if (compMatch) company = compMatch[1].trim();
  }

  // Location
  let location = '';
  const locMatch = text.match(/(?:location|based in|office in)[:\s]+([A-Za-z0-9\s,.-]{3,40})/i);
  if (locMatch) {
    location = locMatch[1].trim();
  } else if (/remote/i.test(text.slice(0, 1000))) {
    location = 'Remote';
  }

  // Job Type
  let type = '';
  if (/full[- ]?time/i.test(text)) type = 'Full-time';
  else if (/part[- ]?time/i.test(text)) type = 'Part-time';
  else if (/contract|freelance/i.test(text)) type = 'Contract';
  else if (/remote/i.test(text)) type = 'Remote';

  // Department
  let department = '';
  const lower = text.toLowerCase();
  if (lower.includes('software') || lower.includes('developer') || lower.includes('technology') || lower.includes('it ') || lower.includes('engineer')) {
    department = 'Technology';
  } else if (lower.includes('marketing') || lower.includes('content') || lower.includes('seo') || lower.includes('social media')) {
    department = 'Marketing';
  } else if (lower.includes('data') || lower.includes('analytics') || lower.includes('analyst') || lower.includes('bi ')) {
    department = 'Analytics';
  } else if (lower.includes('finance') || lower.includes('accounting') || lower.includes('audit') || lower.includes('payroll')) {
    department = 'Finance';
  } else if (lower.includes('teacher') || lower.includes('education') || lower.includes('faculty') || lower.includes('instructor')) {
    department = 'Education';
  }

  return {
    job_title: job_title || '',
    company: company || '',
    location: location || '',
    department: department || '',
    type: type || 'Full-time',
    description: meta.description || text.slice(0, 2000)
  };
};

/**
 * AI Structuring with Gemini (if API key is provided)
 */
const extractWithGemini = async (content, isImage = false, mimeType = null) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are an HR specialist. Extract job opportunity details from the provided input.
Respond ONLY with a valid JSON object matching this schema:
{
  "job_title": "Clean job title (e.g. Senior Software Engineer)",
  "company": "Company or Organization name",
  "location": "City, Province/Country, or Remote",
  "department": "One of: 'Technology', 'Marketing', 'Analytics', 'Finance', 'Education', or empty string if not applicable",
  "type": "One of: 'Full-time', 'Part-time', 'Contract', 'Remote'",
  "description": "Professional, well-structured description with sections like: Overview, Key Responsibilities (using bullet points '- '), and Qualifications/Requirements (using bullet points '- ')."
}`;

    let contents;
    if (isImage) {
      contents = [
        systemPrompt,
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: content.toString('base64')
          }
        }
      ];
    } else {
      contents = [
        systemPrompt,
        `Job Information:\n${content.slice(0, 25000)}`
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawText = typeof response.text === 'function' ? response.text() : response.text;
    if (!rawText) return null;

    try {
      return JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1').trim();
      return JSON.parse(cleaned);
    }
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('Gemini job extraction error:', msg);
    if (isImage) {
      throw err;
    }
    return null;
  }
};

/**
 * Main parser dispatcher
 */
const jobParserService = {
  /**
   * Parse job details from an external URL
   */
  async parseUrl(url) {
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new Error('A valid HTTP or HTTPS URL is required');
    }

    const response = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 1. Try JSON-LD schema
    const jsonLdResult = extractFromJsonLd($);
    if (jsonLdResult && jsonLdResult.job_title && jsonLdResult.description) {
      jsonLdResult.application_url = url;
      return jsonLdResult;
    }

    // 2. Extract metadata
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const ogSite = $('meta[property="og:site_name"]').attr('content') || '';

    // Strip irrelevant tags
    $('script, style, noscript, nav, footer, header, svg, aside').remove();
    const pageText = $('main, article, [role="main"], body').first().text().replace(/\s+/g, ' ').trim();

    // 3. Try Gemini AI if available
    const aiResult = await extractWithGemini(pageText);
    if (aiResult && aiResult.job_title) {
      aiResult.application_url = url;
      return aiResult;
    }

    // 4. Fallback to heuristic
    const heuristic = extractHeuristically(pageText, {
      title: ogTitle.replace(/\s*[-|–].*$/, '').trim(),
      site_name: ogSite,
      description: ogDesc
    });
    heuristic.application_url = url;
    return heuristic;
  },

  /**
   * Parse job details from uploaded file buffer
   */
  async parseFile(buffer, mimeType, filename = '') {
    if (mimeType.startsWith('image/')) {
      throw new Error('Image files are not supported. Please upload a PDF, DOC, DOCX, or TXT document.');
    }

    let text = '';
    if (mimeType === 'application/pdf') {
      text = await extractPdfText(buffer);
    } else {
      text = buffer.toString('utf-8');
    }

    if (!text.trim()) {
      throw new Error('No readable text content found in the uploaded document');
    }

    // Try Gemini AI first
    const aiResult = await extractWithGemini(text);
    if (aiResult && aiResult.job_title) {
      aiResult.description = cleanHtmlToFormattedText(aiResult.description);
      return aiResult;
    }

    // Fallback heuristic
    const heuristic = extractHeuristically(text, {
      title: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    });
    heuristic.description = cleanHtmlToFormattedText(heuristic.description);
    return heuristic;
  },

  /**
   * Parse job details from raw text pasted by admin
   */
  async parseText(text) {
    if (!text || text.trim().length < 20) {
      throw new Error('Please provide at least a few sentences of job description');
    }

    const cleanedInput = cleanHtmlToFormattedText(text);

    // Try Gemini AI first
    const aiResult = await extractWithGemini(cleanedInput);
    if (aiResult && aiResult.job_title) {
      aiResult.description = cleanHtmlToFormattedText(aiResult.description);
      return aiResult;
    }

    const heuristic = extractHeuristically(cleanedInput);
    heuristic.description = cleanHtmlToFormattedText(heuristic.description || cleanedInput);
    return heuristic;
  }
};

module.exports = jobParserService;
