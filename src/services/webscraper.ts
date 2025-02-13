export type WebsiteAnalysis = {
  score: number;
  findings: string[];
  details: {
    hasWhitepaper: boolean;
    hasTeamInfo: boolean;
    hasAudit: boolean;
    hasRoadmap: boolean;
    hasSocialLinks: boolean;
    hasGithub: boolean;
    contentFlags: string[];
    socialLinks: string[];
  };
};

async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function tryFetchWithProxy(url: string): Promise<string> {
  // List of CORS proxies to try
  const proxies = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  let lastError: Error | null = null;

  // Try each proxy until one works
  for (const proxyFn of proxies) {
    try {
      const proxyUrl = proxyFn(url);
      const response = await fetchWithTimeout(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const content = await response.text();
      if (content.length > 0) {
        return content;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      continue; // Try next proxy
    }
  }

  // If all proxies fail, try direct fetch as last resort
  try {
    const response = await fetchWithTimeout(url);
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    // Ignore direct fetch error and throw the last proxy error
  }

  throw lastError || new Error('Failed to fetch website content');
}

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    let content: string;
    try {
      content = await tryFetchWithProxy(url);
    } catch (error) {
      // If fetching fails completely, return a partial analysis
      console.error('Website fetch failed:', error);
      return {
        score: 50,
        findings: [
          'Unable to fully analyze website content',
          'Website might be blocking automated access',
          'Consider manual verification of project legitimacy'
        ],
        details: {
          hasWhitepaper: false,
          hasTeamInfo: false,
          hasAudit: false,
          hasRoadmap: false,
          hasSocialLinks: false,
          hasGithub: false,
          contentFlags: ['fetch-failed'],
          socialLinks: []
        }
      };
    }

    const findings: string[] = [];
    let score = 100;
    const contentFlags: string[] = [];
    const socialLinks: string[] = [];

    // Convert content to lowercase for case-insensitive matching
    const lowerContent = content.toLowerCase();

    // Check for security indicators with more variations
    const securityIndicators = {
      whitepaper: [
        'whitepaper', 'white-paper', 'white paper', 'documentation', 'docs', 'litepaper',
        'bitcoin.pdf', 'bitcoin paper', 'satoshi nakamoto', 'technical paper'
      ],
      team: ['team', 'about us', 'about-us', 'our team', 'founders', 'core team', 'leadership'],
      audit: ['audit', 'security', 'certik', 'hacken', 'consensys', 'verified', 'certification'],
      roadmap: ['roadmap', 'timeline', 'milestones', 'development plan', 'future plans'],
      github: ['github.com', 'gitlab.com', 'bitbucket.org'],
      social: [
        'twitter.com', 't.co',
        'telegram.org', 't.me',
        'discord.com', 'discord.gg',
        'medium.com',
        'linkedin.com',
        'reddit.com/r/',
        'facebook.com'
      ]
    };

    // Also check for links containing these terms
    const hasWhitepaperLink = lowerContent.includes('href') && 
      securityIndicators.whitepaper.some(term => 
        lowerContent.includes(`href="`) && lowerContent.includes(term)
      );

    // Helper function to check for terms
    const containsAny = (terms: string[]) => 
      terms.some(term => lowerContent.includes(term)) || 
      terms.some(term => lowerContent.includes(`href=`) && lowerContent.includes(term));

    const hasWhitepaper = containsAny(securityIndicators.whitepaper) || hasWhitepaperLink;
    const hasTeamInfo = containsAny(securityIndicators.team);
    const hasAudit = containsAny(securityIndicators.audit);
    const hasRoadmap = containsAny(securityIndicators.roadmap);
    const hasGithub = containsAny(securityIndicators.github);
    
    const foundSocialLinks = securityIndicators.social.filter(term => lowerContent.includes(term));
    const hasSocialLinks = foundSocialLinks.length > 0;

    // Analyze findings and adjust score
    if (!hasWhitepaper) {
      findings.push('No whitepaper or documentation found');
      score -= 20;
      contentFlags.push('missing-whitepaper');
    }

    if (!hasTeamInfo) {
      findings.push('No team information found');
      score -= 15;
      contentFlags.push('missing-team-info');
    }

    if (!hasAudit) {
      findings.push('No security audit information found');
      score -= 20;
      contentFlags.push('missing-audit');
    }

    if (!hasRoadmap) {
      findings.push('No roadmap or project timeline found');
      score -= 10;
      contentFlags.push('missing-roadmap');
    }

    if (!hasGithub) {
      findings.push('No GitHub repository linked');
      score -= 10;
      contentFlags.push('missing-github');
    }

    if (!hasSocialLinks) {
      findings.push('Limited or no social media presence');
      score -= 15;
      contentFlags.push('missing-social');
    } else {
      socialLinks.push(...foundSocialLinks);
    }

    // Check for red flags in content
    const redFlags = [
      'guaranteed returns',
      'investment opportunity',
      'limited time offer',
      'act now',
      'instant profits',
      'risk-free',
      '100% safe',
      'get rich',
      'guaranteed profit',
      'no risk',
      'huge returns',
      'massive gains',
      'presale bonus',
      'exclusive offer',
      'once in a lifetime',
      'dont miss out',
      'last chance'
    ];

    const foundRedFlags = redFlags.filter(flag => lowerContent.includes(flag));
    if (foundRedFlags.length > 0) {
      findings.push(`Suspicious marketing language detected: ${foundRedFlags.join(', ')}`);
      score -= 10 * foundRedFlags.length;
      contentFlags.push('suspicious-marketing');
    }

    // Check for SSL/HTTPS
    if (!url.startsWith('https://')) {
      findings.push('Website does not use secure HTTPS connection');
      score -= 15;
      contentFlags.push('no-https');
    }

    return {
      score: Math.max(0, score),
      findings: findings.length > 0 ? findings : ['Website analysis completed successfully'],
      details: {
        hasWhitepaper,
        hasTeamInfo,
        hasAudit,
        hasRoadmap,
        hasSocialLinks,
        hasGithub,
        contentFlags,
        socialLinks
      }
    };
  } catch (error) {
    console.error('Website analysis error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze website');
  }
}