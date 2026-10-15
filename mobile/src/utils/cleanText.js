export const cleanClientText = (raw) => {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw.trim();

  // 1. Unescape escaped HTML tags
  if (/&(?:lt|gt|amp|quot|#39);/.test(text)) {
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  // 2. If text contains HTML tags
  if (/<[a-z][\s\S]*>/i.test(text)) {
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, '\n\n');
    text = text.replace(/<li[^>]*>/gi, '\n• ');
    text = text.replace(/<[^>]+>/g, ' ');
  }

  // 3. Normalize common entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, ' - ')
    .replace(/&bull;/g, '• ');

  // 4. Separate common section headings
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

  // 5. Fix glued sentences: period/question/exclamation followed immediately by capital letter
  text = text.replace(/([a-z0-9][.!?])([A-Z][a-z])/g, '$1\n\n$2');

  // 6. Fix glued colon to capital letter: 'Responsibilities:Have' -> 'Responsibilities:\n\n• Have'
  text = text.replace(/:\s*([A-Z][a-z]+(?:\s+[a-z]+){1,3})/g, ':\n\n• $1');

  // 7. Process sections and format list items under lists
  const rawSections = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const formattedSections = [];
  let isUnderListHeader = false;

  for (const sec of rawSections) {
    if (/^\*\*(?:Responsibilities|Qualifications|Basic Qualifications|Preferred Qualifications|Requirements|Skills|Benefits):?\*\*/i.test(sec)) {
      isUnderListHeader = true;
      formattedSections.push(sec);
      continue;
    }

    if (/^\*\*(?:Job Description|About|Equal Opportunity|Additional)/i.test(sec)) {
      isUnderListHeader = false;
      formattedSections.push(sec);
      continue;
    }

    if (isUnderListHeader) {
      const lines = sec.split('\n').map((l) => l.trim()).filter(Boolean);
      const bulletLines = [];

      for (const line of lines) {
        if (/^[-•*]\s+/.test(line)) {
          bulletLines.push('• ' + line.replace(/^[-•*]\s+/, '').trim());
        } else if (line.length > 20) {
          const splitSentences = line.split(/\.\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
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
      const cleanPara = sec.replace(/\s+/g, ' ').trim();
      if (cleanPara) {
        formattedSections.push(cleanPara);
      }
    }
  }

  let finalText = formattedSections.join('\n\n');
  finalText = finalText.replace(/•\s*•/g, '•');
  finalText = finalText.replace(/\*\*\s*\*\*/g, '');
  finalText = finalText.replace(/\n{3,}/g, '\n\n').trim();

  return finalText;
};
