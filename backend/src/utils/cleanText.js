const cheerio = require('cheerio');

/**
 * Clean and format HTML or raw text into readable markdown/plain text
 * with proper spacing, distinct section headers, and bullet points.
 */
function cleanHtmlToFormattedText(input) {
  if (!input || typeof input !== 'string') return '';

  let text = input;

  // 1. If string contains entity-encoded HTML tags (e.g. &lt;p&gt; or &lt;br&gt;), decode tag symbols only
  if (/&lt;[a-z/!]/i.test(text)) {
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  // 2. If it contains HTML tags, parse with Cheerio
  if (/<[a-z][\s\S]*>/i.test(text)) {
    const $ = cheerio.load(text, null, false);
    $('script, style, noscript, svg, iframe').remove();

    // Replace <br> with newlines
    $('br').replaceWith('\n');

    // Headings
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const t = $(el).text().trim();
      if (t) $(el).replaceWith('\n\n### ' + t + '\n\n');
    });

    // Standalone strong/b tags that act as section titles
    $('strong, b').each((_, el) => {
      const t = $(el).text().trim();
      if (t && (/^(job description|about|responsibilities|requirements|qualifications|skills|benefits|what you'll do|who you are|overview|role overview|key responsibilities|basic qualifications|preferred qualifications)[:]?$/i.test(t) || (t.length < 50 && t.endsWith(':')))) {
        $(el).replaceWith('\n\n**' + t.replace(/:$/, '') + ':**\n\n');
      }
    });

    // List items
    $('li').each((_, el) => {
      const t = $(el).text().trim();
      if (t) $(el).replaceWith('\n• ' + t + '\n');
    });

    // Block containers
    $('p, div, section, article, blockquote, ul, ol').each((_, el) => {
      $(el).prepend('\n\n').append('\n\n');
    });

    text = $.text();
  }

  // 3. Strip any residual HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 4. Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, ' - ')
    .replace(/&bull;/g, '• ');

  // 5. Intelligent section separation for glued text & headings
  const headers = [
    'Job Description',
    'About the Role',
    'About LinkedIn',
    'About Us',
    'About the Company',
    'Role Overview',
    'Key Responsibilities',
    'Responsibilities',
    'Basic Qualifications',
    'Preferred Qualifications',
    'Minimum Qualifications',
    'Qualifications',
    'Requirements',
    'Benefits',
    'What We Offer',
    'Suggested Skills',
    'Equal Opportunity Employer',
    'Equal Opportunity',
    'Additional Information'
  ];

  for (const h of headers) {
    const escaped = h.replace(/([:*?+()])/g, '\\$1');
    const regex = new RegExp('(?:\\*{0,2})\\b(' + escaped + '):?(?:\\*{0,2})', 'gi');
    text = text.replace(regex, '\n\n**$1:**\n\n');
  }

  // 6. Fix glued sentences: period/question/exclamation followed immediately by capital letter (e.g. succeed.Join)
  text = text.replace(/([a-z0-9][.!?])([A-Z][a-z])/g, '$1\n\n$2');

  // 7. Fix glued colon followed by capital letter: 'Responsibilities:Have' -> 'Responsibilities:\n\n• Have'
  text = text.replace(/:\s*([A-Z][a-z]+(?:\s+[a-z]+){1,3})/g, ':\n\n• $1');

  // 8. Process sections and format list items under lists
  const rawSections = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const formattedSections = [];
  let isUnderListHeader = false;

  for (const sec of rawSections) {
    // Check if this section is a list header
    if (/^\*\*(?:Responsibilities|Qualifications|Basic Qualifications|Preferred Qualifications|Requirements|Skills|Benefits):?\*\*/i.test(sec)) {
      isUnderListHeader = true;
      formattedSections.push(sec);
      continue;
    }

    // If another non-list header starts
    if (/^\*\*(?:Job Description|About|Equal Opportunity|Additional)/i.test(sec)) {
      isUnderListHeader = false;
      formattedSections.push(sec);
      continue;
    }

    if (isUnderListHeader) {
      // Split sentences in this list block into bullet points if not already bulleted
      const lines = sec.split('\n').map(l => l.trim()).filter(Boolean);
      const bulletLines = [];

      for (const line of lines) {
        if (/^[-•*]\s+/.test(line)) {
          bulletLines.push('• ' + line.replace(/^[-•*]\s+/, '').trim());
        } else if (line.length > 20) {
          // If a sentence inside the list has multiple sentences ending with '.'
          const splitSentences = line.split(/\.\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
          for (const sentence of splitSentences) {
            const cleanSentence = sentence.replace(/^[-•*:\s]+/, '');
            if (cleanSentence) {
              bulletLines.push('• ' + cleanSentence + (cleanSentence.endsWith('.') ? '' : '.'));
            }
          }
        } else {
          bulletLines.push(line);
        }
      }

      if (bulletLines.length > 0) {
        formattedSections.push(bulletLines.join('\n'));
      }
    } else {
      // Clean regular paragraph lines
      const cleanPara = sec.replace(/\s+/g, ' ').trim();
      if (cleanPara) {
        formattedSections.push(cleanPara);
      }
    }
  }

  // 9. Clean up any weird double-bullet or empty markers
  let finalText = formattedSections.join('\n\n');
  finalText = finalText.replace(/•\s*•/g, '•');
  finalText = finalText.replace(/\*\*\s*\*\*/g, '');
  finalText = finalText.replace(/\n{3,}/g, '\n\n').trim();

  return finalText;
}

module.exports = { cleanHtmlToFormattedText };
