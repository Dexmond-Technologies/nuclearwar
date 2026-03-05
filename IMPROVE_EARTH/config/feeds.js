"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALERT_EXCLUSIONS = exports.ALERT_KEYWORDS = exports.INTEL_SOURCES = exports.SOURCE_REGION_MAP = exports.FEEDS = exports.SOURCE_PROPAGANDA_RISK = exports.SOURCE_TYPES = exports.SOURCE_TIERS = void 0;
exports.getSourceTier = getSourceTier;
exports.getSourceType = getSourceType;
exports.getSourcePropagandaRisk = getSourcePropagandaRisk;
exports.isStateAffiliatedSource = isStateAffiliatedSource;
const variant_1 = require("./variant");
// Helper to create RSS proxy URL (Vercel)
const rss = (url) => `/api/rss-proxy?url=${encodeURIComponent(url)}`;
// Keep dedicated alias for feeds historically fetched through Railway.
// `rss-proxy` now handles secure server-side fallback.
const railwayRss = (url) => rss(url);
// Source tier system for prioritization (lower = more authoritative)
// Tier 1: Wire services - fastest, most reliable breaking news
// Tier 2: Major outlets - high-quality journalism
// Tier 3: Specialty sources - domain expertise
// Tier 4: Aggregators & blogs - useful but less authoritative
exports.SOURCE_TIERS = {
    // Tier 1 - Wire Services
    'Reuters': 1,
    'AP News': 1,
    'AFP': 1,
    'Bloomberg': 1,
    // Tier 2 - Major Outlets
    'BBC World': 2,
    'BBC Middle East': 2,
    'Guardian World': 2,
    'Guardian ME': 2,
    'NPR News': 2,
    'CNN World': 2,
    'CNBC': 2,
    'MarketWatch': 2,
    'Al Jazeera': 2,
    'Financial Times': 2,
    'Politico': 2,
    'Axios': 2,
    'EuroNews': 2,
    'France 24': 2,
    'Le Monde': 2,
    // Spanish
    'El País': 2,
    'El Mundo': 2,
    'BBC Mundo': 2,
    // German
    'Tagesschau': 1,
    'Der Spiegel': 2,
    'Die Zeit': 2,
    'DW News': 2,
    // Italian
    'ANSA': 1,
    'Corriere della Sera': 2,
    'Repubblica': 2,
    // Dutch
    'NOS Nieuws': 1,
    'NRC': 2,
    'De Telegraaf': 2,
    // Swedish
    'SVT Nyheter': 1,
    'Dagens Nyheter': 2,
    'Svenska Dagbladet': 2,
    'Reuters World': 1,
    'Reuters Business': 1,
    'OpenAI News': 3,
    // Portuguese
    'Brasil Paralelo': 2,
    // Tier 1 - Official Government & International Orgs
    'White House': 1,
    'State Dept': 1,
    'Pentagon': 1,
    'UN News': 1,
    'CISA': 1,
    'Treasury': 2,
    'DOJ': 2,
    'DHS': 2,
    'CDC': 2,
    'FEMA': 2,
    // Tier 3 - Specialty
    'Defense One': 3,
    'Breaking Defense': 3,
    'The War Zone': 3,
    'Defense News': 3,
    'Janes': 3,
    'Military Times': 2,
    'Task & Purpose': 3,
    'USNI News': 2,
    'gCaptain': 3,
    'Oryx OSINT': 2,
    'UK MOD': 1,
    'Foreign Policy': 3,
    'The Diplomat': 3,
    'Bellingcat': 3,
    'Krebs Security': 3,
    'Ransomware.live': 3,
    'Federal Reserve': 3,
    'SEC': 3,
    'MIT Tech Review': 3,
    'Ars Technica': 3,
    'Atlantic Council': 3,
    'Foreign Affairs': 3,
    'CrisisWatch': 3,
    'CSIS': 3,
    'RAND': 3,
    'Brookings': 3,
    'Carnegie': 3,
    'IAEA': 1,
    'WHO': 1,
    'UNHCR': 1,
    'Xinhua': 3,
    'TASS': 3,
    'Layoffs.fyi': 3,
    'BBC Persian': 2,
    'Iran International': 3,
    'Fars News': 3,
    'MIIT (China)': 1,
    'MOFCOM (China)': 1,
    // Turkish
    'BBC Turkce': 2,
    'DW Turkish': 2,
    'Hurriyet': 2,
    // Polish
    'TVN24': 2,
    'Polsat News': 2,
    'Rzeczpospolita': 2,
    // Russian (independent)
    'BBC Russian': 2,
    'Meduza': 2,
    'Novaya Gazeta Europe': 2,
    // Thai
    'Bangkok Post': 2,
    'Thai PBS': 2,
    // Australian
    'ABC News Australia': 2,
    'Guardian Australia': 2,
    // Vietnamese
    'VnExpress': 2,
    'Tuoi Tre News': 2,
    // Tier 2 - Premium Startup/VC Sources
    'Y Combinator Blog': 2,
    'a16z Blog': 2,
    'Sequoia Blog': 2,
    'Crunchbase News': 2,
    'CB Insights': 2,
    'PitchBook News': 2,
    'The Information': 2,
    // Tier 3 - Regional/Specialty Startup Sources
    'EU Startups': 3,
    'Tech.eu': 3,
    'Sifted (Europe)': 3,
    'The Next Web': 3,
    'Tech in Asia': 3,
    'TechCabal (Africa)': 3,
    'Inc42 (India)': 3,
    'YourStory': 3,
    'Paul Graham Essays': 2,
    'Stratechery': 2,
    // Asia - Regional
    'e27 (SEA)': 3,
    'DealStreetAsia': 3,
    'Pandaily (China)': 3,
    '36Kr English': 3,
    'TechNode (China)': 3,
    'China Tech News': 3,
    'The Bridge (Japan)': 3,
    'Japan Tech News': 3,
    'Nikkei Tech': 2,
    'NHK World': 2,
    'Nikkei Asia': 2,
    'Korea Tech News': 3,
    'KED Global': 3,
    'Entrackr (India)': 3,
    'India Tech News': 3,
    'Taiwan Tech News': 3,
    'GloNewswire (Taiwan)': 4,
    // LATAM
    'La Silla Vacía': 3,
    'LATAM Tech News': 3,
    'Startups.co (LATAM)': 3,
    'Contxto (LATAM)': 3,
    'Brazil Tech News': 3,
    'Mexico Tech News': 3,
    'LATAM Fintech': 3,
    // Africa & MENA
    'Wamda (MENA)': 3,
    'Magnitt': 3,
    // Nigeria
    'Premium Times': 2,
    'Vanguard Nigeria': 2,
    'Channels TV': 2,
    'Daily Trust': 3,
    'ThisDay': 2,
    // Greek
    'Kathimerini': 2,
    'Naftemporiki': 2,
    'in.gr': 3,
    'iefimerida': 3,
    'Proto Thema': 3,
    // Tier 3 - Think Tanks
    'Brookings Tech': 3,
    'CSIS Tech': 3,
    'MIT Tech Policy': 3,
    'Stanford HAI': 2,
    'AI Now Institute': 3,
    'OECD Digital': 2,
    'Bruegel (EU)': 3,
    'Chatham House Tech': 3,
    'ISEAS (Singapore)': 3,
    'ORF Tech (India)': 3,
    'RIETI (Japan)': 3,
    'Lowy Institute': 3,
    'China Tech Analysis': 3,
    'DigiChina': 2,
    // Security/Defense Think Tanks
    'RUSI': 2,
    'Wilson Center': 3,
    'GMF': 3,
    'Stimson Center': 3,
    'CNAS': 2,
    // Nuclear & Arms Control
    'Arms Control Assn': 2,
    'Bulletin of Atomic Scientists': 2,
    // Food Security
    'FAO GIEWS': 2,
    'EU ISS': 3,
    // New verified think tanks
    'War on the Rocks': 2,
    'AEI': 3,
    'Responsible Statecraft': 3,
    'FPRI': 3,
    'Jamestown': 3,
    // Tier 3 - Policy Sources
    'Politico Tech': 2,
    'AI Regulation': 3,
    'Tech Antitrust': 3,
    'EFF News': 3,
    'EU Digital Policy': 3,
    'Euractiv Digital': 3,
    'EU Commission Digital': 2,
    'China Tech Policy': 3,
    'UK Tech Policy': 3,
    'India Tech Policy': 3,
    // Tier 2-3 - Podcasts & Newsletters
    'Acquired Podcast': 2,
    'All-In Podcast': 2,
    'a16z Podcast': 2,
    'This Week in Startups': 3,
    'The Twenty Minute VC': 2,
    'Lex Fridman Tech': 3,
    'The Vergecast': 3,
    'Decoder (Verge)': 3,
    'Hard Fork (NYT)': 2,
    'Pivot (Vox)': 2,
    'Benedict Evans': 2,
    'The Pragmatic Engineer': 2,
    'Lenny Newsletter': 2,
    'AI Podcast (NVIDIA)': 3,
    'Gradient Dissent': 3,
    'Eye on AI': 3,
    'How I Built This': 2,
    'Masters of Scale': 2,
    'The Pitch': 3,
    // Tier 4 - Aggregators
    'Hacker News': 4,
    'The Verge': 4,
    'The Verge AI': 4,
    'VentureBeat AI': 4,
    'Yahoo Finance': 4,
    'TechCrunch Layoffs': 4,
    'ArXiv AI': 4,
    'AI News': 4,
    'Layoffs News': 4,
    // Tier 2 - Positive News Sources (Happy variant)
    'Good News Network': 2,
    'Positive.News': 2,
    'Reasons to be Cheerful': 2,
    'Optimist Daily': 2,
    'GNN Science': 3,
    'GNN Animals': 3,
    'GNN Health': 3,
    'GNN Heroes': 3,
};
function getSourceTier(sourceName) {
    return exports.SOURCE_TIERS[sourceName] ?? 4; // Default to tier 4 if unknown
}
exports.SOURCE_TYPES = {
    // Wire services - fastest, most authoritative
    'Reuters': 'wire', 'Reuters World': 'wire', 'Reuters Business': 'wire',
    'AP News': 'wire', 'AFP': 'wire', 'Bloomberg': 'wire',
    // Government & International Org sources
    'White House': 'gov', 'State Dept': 'gov', 'Pentagon': 'gov',
    'Treasury': 'gov', 'DOJ': 'gov', 'DHS': 'gov', 'CDC': 'gov',
    'FEMA': 'gov', 'Federal Reserve': 'gov', 'SEC': 'gov',
    'UN News': 'gov', 'CISA': 'gov',
    // Intel/Defense specialty
    'Defense One': 'intel', 'Breaking Defense': 'intel', 'The War Zone': 'intel',
    'Defense News': 'intel', 'Janes': 'intel', 'Military Times': 'intel', 'Task & Purpose': 'intel',
    'USNI News': 'intel', 'gCaptain': 'intel', 'Oryx OSINT': 'intel', 'UK MOD': 'gov',
    'Bellingcat': 'intel', 'Krebs Security': 'intel',
    'Foreign Policy': 'intel', 'The Diplomat': 'intel',
    'Atlantic Council': 'intel', 'Foreign Affairs': 'intel',
    'CrisisWatch': 'intel',
    'CSIS': 'intel', 'RAND': 'intel', 'Brookings': 'intel', 'Carnegie': 'intel',
    'IAEA': 'gov', 'WHO': 'gov', 'UNHCR': 'gov',
    'Xinhua': 'wire', 'TASS': 'wire',
    'NHK World': 'mainstream', 'Nikkei Asia': 'market',
    // Mainstream outlets
    'BBC World': 'mainstream', 'BBC Middle East': 'mainstream',
    'Guardian World': 'mainstream', 'Guardian ME': 'mainstream',
    'NPR News': 'mainstream', 'Al Jazeera': 'mainstream',
    'CNN World': 'mainstream', 'Politico': 'mainstream', 'Axios': 'mainstream',
    'EuroNews': 'mainstream', 'France 24': 'mainstream', 'Le Monde': 'mainstream',
    // European Addition
    'El País': 'mainstream', 'El Mundo': 'mainstream', 'BBC Mundo': 'mainstream',
    'Tagesschau': 'mainstream', 'Der Spiegel': 'mainstream', 'Die Zeit': 'mainstream', 'DW News': 'mainstream',
    'ANSA': 'wire', 'Corriere della Sera': 'mainstream', 'Repubblica': 'mainstream',
    'NOS Nieuws': 'mainstream', 'NRC': 'mainstream', 'De Telegraaf': 'mainstream',
    'SVT Nyheter': 'mainstream', 'Dagens Nyheter': 'mainstream', 'Svenska Dagbladet': 'mainstream',
    // Brazilian Addition
    'Brasil Paralelo': 'mainstream',
    // Market/Finance
    'CNBC': 'market', 'MarketWatch': 'market', 'Yahoo Finance': 'market',
    'Financial Times': 'market',
    // Tech
    'Hacker News': 'tech', 'Ars Technica': 'tech', 'The Verge': 'tech',
    'The Verge AI': 'tech', 'MIT Tech Review': 'tech', 'TechCrunch Layoffs': 'tech',
    'AI News': 'tech', 'ArXiv AI': 'tech', 'VentureBeat AI': 'tech',
    'Layoffs.fyi': 'tech', 'Layoffs News': 'tech',
    // Regional Tech Startups
    'EU Startups': 'tech', 'Tech.eu': 'tech', 'Sifted (Europe)': 'tech',
    'The Next Web': 'tech', 'Tech in Asia': 'tech', 'e27 (SEA)': 'tech',
    'DealStreetAsia': 'tech', 'Pandaily (China)': 'tech', '36Kr English': 'tech',
    'TechNode (China)': 'tech', 'The Bridge (Japan)': 'tech', 'Nikkei Tech': 'tech',
    'Inc42 (India)': 'tech', 'YourStory': 'tech', 'TechCabal (Africa)': 'tech',
    'Wamda (MENA)': 'tech', 'Magnitt': 'tech',
    // Think Tanks & Policy
    'Brookings Tech': 'intel', 'CSIS Tech': 'intel', 'Stanford HAI': 'intel',
    'AI Now Institute': 'intel', 'OECD Digital': 'intel', 'Bruegel (EU)': 'intel',
    'Chatham House Tech': 'intel', 'DigiChina': 'intel', 'Lowy Institute': 'intel',
    'EFF News': 'intel', 'Politico Tech': 'intel',
    // Security/Defense Think Tanks
    'RUSI': 'intel', 'Wilson Center': 'intel', 'GMF': 'intel',
    'Stimson Center': 'intel', 'CNAS': 'intel',
    // Nuclear & Arms Control
    'Arms Control Assn': 'intel', 'Bulletin of Atomic Scientists': 'intel',
    // Food Security & Regional
    'FAO GIEWS': 'gov', 'EU ISS': 'intel',
    // New verified think tanks
    'War on the Rocks': 'intel', 'AEI': 'intel', 'Responsible Statecraft': 'intel',
    'FPRI': 'intel', 'Jamestown': 'intel',
    // Podcasts & Newsletters
    'Acquired Podcast': 'tech', 'All-In Podcast': 'tech', 'a16z Podcast': 'tech',
    'This Week in Startups': 'tech', 'The Twenty Minute VC': 'tech',
    'Hard Fork (NYT)': 'tech', 'Pivot (Vox)': 'tech', 'Stratechery': 'tech',
    'Benedict Evans': 'tech', 'How I Built This': 'tech', 'Masters of Scale': 'tech',
};
function getSourceType(sourceName) {
    return exports.SOURCE_TYPES[sourceName] ?? 'other';
}
exports.SOURCE_PROPAGANDA_RISK = {
    // High risk - State-controlled media
    'Xinhua': { risk: 'high', stateAffiliated: 'China', note: 'Official CCP news agency' },
    'TASS': { risk: 'high', stateAffiliated: 'Russia', note: 'Russian state news agency' },
    'RT': { risk: 'high', stateAffiliated: 'Russia', note: 'Russian state media, banned in EU' },
    'Sputnik': { risk: 'high', stateAffiliated: 'Russia', note: 'Russian state media' },
    'CGTN': { risk: 'high', stateAffiliated: 'China', note: 'Chinese state broadcaster' },
    'Press TV': { risk: 'high', stateAffiliated: 'Iran', note: 'Iranian state media' },
    'KCNA': { risk: 'high', stateAffiliated: 'North Korea', note: 'North Korean state media' },
    // Medium risk - State-affiliated or known bias
    'Al Jazeera': { risk: 'medium', stateAffiliated: 'Qatar', note: 'Qatari state-funded, independent editorial' },
    'Al Arabiya': { risk: 'medium', stateAffiliated: 'Saudi Arabia', note: 'Saudi-owned, reflects Gulf perspective' },
    'TRT World': { risk: 'medium', stateAffiliated: 'Turkey', note: 'Turkish state broadcaster' },
    'France 24': { risk: 'medium', stateAffiliated: 'France', note: 'French state-funded, editorially independent' },
    'EuroNews': { risk: 'low', note: 'European public broadcaster consortium', knownBiases: ['Pro-EU'] },
    'Le Monde': { risk: 'low', note: 'French newspaper of record' },
    'DW News': { risk: 'medium', stateAffiliated: 'Germany', note: 'German state-funded, editorially independent' },
    'Voice of America': { risk: 'medium', stateAffiliated: 'USA', note: 'US government-funded' },
    'Kyiv Independent': { risk: 'medium', knownBiases: ['Pro-Ukraine'], note: 'Ukrainian perspective on Russia-Ukraine war' },
    'Moscow Times': { risk: 'medium', knownBiases: ['Anti-Kremlin'], note: 'Independent, critical of Russian government' },
    // Low risk - Independent with editorial standards (explicit)
    'Reuters': { risk: 'low', note: 'Wire service, strict editorial standards' },
    'AP News': { risk: 'low', note: 'Wire service, nonprofit cooperative' },
    'AFP': { risk: 'low', note: 'Wire service, editorially independent' },
    'BBC World': { risk: 'low', note: 'Public broadcaster, editorial independence charter' },
    'BBC Middle East': { risk: 'low', note: 'Public broadcaster, editorial independence charter' },
    'Guardian World': { risk: 'low', knownBiases: ['Center-left'], note: 'Scott Trust ownership, no shareholders' },
    'Financial Times': { risk: 'low', note: 'Business focus, Nikkei-owned' },
    'Bellingcat': { risk: 'low', note: 'Open-source investigations, methodology transparent' },
    'Brasil Paralelo': { risk: 'low', note: 'Independent media company: no political ties, no public funding, 100% subscriber-funded.' },
};
function getSourcePropagandaRisk(sourceName) {
    return exports.SOURCE_PROPAGANDA_RISK[sourceName] ?? { risk: 'low' };
}
function isStateAffiliatedSource(sourceName) {
    const profile = exports.SOURCE_PROPAGANDA_RISK[sourceName];
    return !!profile?.stateAffiliated;
}
const FULL_FEEDS = {
    war: [
        { name: 'Defense One', url: rss('https://www.defenseone.com/rss/all/') },
        { name: 'The War Zone', url: rss('https://www.twz.com/feed') },
        { name: 'Defense News', url: rss('https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml') },
        { name: 'Janes', url: rss('https://news.google.com/rss/search?q=site:janes.com+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Military Times', url: rss('https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml') },
        { name: 'Oryx OSINT', url: rss('https://www.oryxspioenkop.com/feeds/posts/default?alt=rss') },
        { name: 'War on the Rocks', url: rss('https://warontherocks.com/feed') },
        { name: 'Reuters Conflict', url: rss('https://news.google.com/rss/search?q=site:reuters.com+(war+OR+conflict+OR+military)+when:1d&hl=en-US&gl=US&ceid=US:en') },
    ],
    medical: [
        { name: 'WHO', url: rss('https://www.who.int/rss-feeds/news-english.xml') },
        { name: 'CDC News', url: rss('https://news.google.com/rss/search?q=site:cdc.gov+OR+CDC+health&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Medical News Today', url: rss('https://www.medicalnewstoday.com/feed') },
        { name: 'Reuters Health', url: rss('https://news.google.com/rss/search?q=site:reuters.com+health+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'NPR Health', url: rss('https://feeds.npr.org/1128/rss.xml') },
        { name: 'STAT News', url: rss('https://www.statnews.com/feed/') },
    ],
    pharma: [
        { name: 'Fierce Pharma', url: rss('https://www.fiercepharma.com/rss/xml') },
        { name: 'PharmaTimes', url: rss('https://www.pharmatimes.com/rss/world') },
        { name: 'BioSpace', url: rss('https://news.google.com/rss/search?q=site:biospace.com+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Endpoints News', url: rss('https://endpts.com/feed/') },
        { name: 'Reuters Pharma', url: rss('https://news.google.com/rss/search?q=site:reuters.com+(pharma+OR+vaccine+OR+FDA)+when:1d&hl=en-US&gl=US&ceid=US:en') },
    ],
    economic: [
        { name: 'Financial Times Econ', url: rss('https://news.google.com/rss/search?q=site:ft.com+economy+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Reuters Economy', url: rss('https://news.google.com/rss/search?q=site:reuters.com+economy+macro+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Bloomberg Econ', url: rss('https://news.google.com/rss/search?q=site:bloomberg.com+economics+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'WSJ Economy', url: rss('https://news.google.com/rss/search?q=site:wsj.com+economy+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'World Bank News', url: rss('https://www.worldbank.org/en/news/all/rss') },
        { name: 'IMF News', url: rss('https://www.imf.org/en/News/RSS') },
    ],
    finance: [
        { name: 'CNBC', url: rss('https://www.cnbc.com/id/100003114/device/rss/rss.html') },
        { name: 'MarketWatch', url: rss('https://news.google.com/rss/search?q=site:marketwatch.com+markets+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Yahoo Finance', url: rss('https://finance.yahoo.com/news/rssindex') },
        { name: 'Financial Times', url: rss('https://www.ft.com/rss/home') },
        { name: 'Reuters Business', url: rss('https://news.google.com/rss/search?q=site:reuters.com+business+markets&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Bloomberg Markets', url: rss('https://news.google.com/rss/search?q=site:bloomberg.com+markets+when:1d&hl=en-US&gl=US&ceid=US:en') },
    ],
};
// Tech/AI variant feeds
const TECH_FEEDS = {
    tech: [
        { name: 'TechCrunch', url: rss('https://techcrunch.com/feed/') },
        { name: 'The Verge', url: rss('https://www.theverge.com/rss/index.xml') },
        { name: 'Ars Technica', url: rss('https://feeds.arstechnica.com/arstechnica/technology-lab') },
        { name: 'Hacker News', url: rss('https://hnrss.org/frontpage') },
        { name: 'MIT Tech Review', url: rss('https://www.technologyreview.com/feed/') },
        { name: 'ZDNet', url: rss('https://www.zdnet.com/news/rss.xml') },
        { name: 'TechMeme', url: rss('https://www.techmeme.com/feed.xml') },
        { name: 'Engadget', url: rss('https://www.engadget.com/rss.xml') },
        { name: 'Fast Company', url: rss('https://feeds.feedburner.com/fastcompany/headlines') },
    ],
    ai: [
        { name: 'AI News', url: rss('https://news.google.com/rss/search?q=(OpenAI+OR+Anthropic+OR+Google+AI+OR+"large+language+model"+OR+ChatGPT+OR+Claude+OR+"AI+model")+when:2d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'VentureBeat AI', url: rss('https://venturebeat.com/category/ai/feed/') },
        { name: 'The Verge AI', url: rss('https://www.theverge.com/rss/ai-artificial-intelligence/index.xml') },
        { name: 'MIT Tech Review AI', url: rss('https://www.technologyreview.com/topic/artificial-intelligence/feed') },
        { name: 'MIT Research', url: rss('https://news.mit.edu/rss/research') },
        { name: 'ArXiv AI', url: rss('https://export.arxiv.org/rss/cs.AI') },
        { name: 'ArXiv ML', url: rss('https://export.arxiv.org/rss/cs.LG') },
        { name: 'AI Weekly', url: rss('https://news.google.com/rss/search?q="artificial+intelligence"+OR+"machine+learning"+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Anthropic News', url: rss('https://news.google.com/rss/search?q=Anthropic+Claude+AI+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'OpenAI News', url: rss('https://news.google.com/rss/search?q=OpenAI+ChatGPT+GPT-4+when:7d&hl=en-US&gl=US&ceid=US:en') },
    ],
    startups: [
        { name: 'TechCrunch Startups', url: rss('https://techcrunch.com/category/startups/feed/') },
        { name: 'VentureBeat', url: rss('https://venturebeat.com/feed/') },
        { name: 'Crunchbase News', url: rss('https://news.crunchbase.com/feed/') },
        { name: 'SaaStr', url: rss('https://www.saastr.com/feed/') },
        { name: 'AngelList News', url: rss('https://news.google.com/rss/search?q=site:angellist.com+OR+"AngelList"+funding+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'TechCrunch Venture', url: rss('https://techcrunch.com/category/venture/feed/') },
        { name: 'The Information', url: rss('https://news.google.com/rss/search?q=site:theinformation.com+startup+OR+funding+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Fortune Term Sheet', url: rss('https://news.google.com/rss/search?q="Term+Sheet"+venture+capital+OR+startup+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'PitchBook News', url: rss('https://news.google.com/rss/search?q=site:pitchbook.com+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'CB Insights', url: rss('https://www.cbinsights.com/research/feed/') },
    ],
    vcblogs: [
        { name: 'Y Combinator Blog', url: rss('https://www.ycombinator.com/blog/rss/') },
        { name: 'a16z Blog', url: rss('https://news.google.com/rss/search?q=site:a16z.com+OR+"Andreessen+Horowitz"+blog+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Sequoia Blog', url: rss('https://news.google.com/rss/search?q=site:sequoiacap.com+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Paul Graham Essays', url: rss('https://news.google.com/rss/search?q="Paul+Graham"+essay+OR+blog+when:30d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'VC Insights', url: rss('https://news.google.com/rss/search?q=("venture+capital"+insights+OR+"VC+trends"+OR+"startup+advice")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Lenny\'s Newsletter', url: rss('https://www.lennysnewsletter.com/feed') },
        { name: 'Stratechery', url: rss('https://stratechery.com/feed/') },
        { name: 'FwdStart Newsletter', url: '/api/fwdstart' },
    ],
    regionalStartups: [
        // Europe
        { name: 'EU Startups', url: rss('https://news.google.com/rss/search?q=site:eu-startups.com+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Tech.eu', url: rss('https://tech.eu/feed/') },
        { name: 'Sifted (Europe)', url: rss('https://sifted.eu/feed') },
        { name: 'The Next Web', url: rss('https://news.google.com/rss/search?q=site:thenextweb.com+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // Asia - General
        { name: 'Tech in Asia', url: rss('https://news.google.com/rss/search?q=site:techinasia.com+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'KrASIA', url: rss('https://news.google.com/rss/search?q=site:kr-asia.com+OR+KrASIA+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'SEA Startups', url: rss('https://news.google.com/rss/search?q=(Singapore+OR+Indonesia+OR+Vietnam+OR+Thailand+OR+Malaysia)+startup+funding+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Asia VC News', url: rss('https://news.google.com/rss/search?q=("Southeast+Asia"+OR+ASEAN)+venture+capital+OR+funding+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // China
        { name: 'China Startups', url: rss('https://news.google.com/rss/search?q=China+startup+funding+OR+"Chinese+startup"+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: '36Kr English', url: rss('https://news.google.com/rss/search?q=site:36kr.com+OR+"36Kr"+startup+china+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'China Tech Giants', url: rss('https://news.google.com/rss/search?q=(Alibaba+OR+Tencent+OR+ByteDance+OR+Baidu+OR+JD.com+OR+Xiaomi+OR+Huawei)+when:3d&hl=en-US&gl=US&ceid=US:en') },
        // Japan
        { name: 'Japan Startups', url: rss('https://news.google.com/rss/search?q=Japan+startup+funding+OR+"Japanese+startup"+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Japan Tech News', url: rss('https://news.google.com/rss/search?q=(Japan+startup+OR+Japan+tech+OR+SoftBank+OR+Rakuten+OR+Sony)+funding+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Nikkei Tech', url: rss('https://news.google.com/rss/search?q=site:asia.nikkei.com+technology+when:3d&hl=en-US&gl=US&ceid=US:en') },
        // Korea
        { name: 'Korea Tech News', url: rss('https://news.google.com/rss/search?q=(Korea+startup+OR+Korean+tech+OR+Samsung+OR+Kakao+OR+Naver+OR+Coupang)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Korea Startups', url: rss('https://news.google.com/rss/search?q=Korea+startup+funding+OR+"Korean+unicorn"+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // India
        { name: 'Inc42 (India)', url: rss('https://inc42.com/feed/') },
        { name: 'YourStory', url: rss('https://yourstory.com/feed') },
        { name: 'India Startups', url: rss('https://news.google.com/rss/search?q=India+startup+funding+OR+"Indian+startup"+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'India Tech News', url: rss('https://news.google.com/rss/search?q=(Flipkart+OR+Razorpay+OR+Zerodha+OR+Zomato+OR+Paytm+OR+PhonePe)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // Southeast Asia
        { name: 'SEA Tech News', url: rss('https://news.google.com/rss/search?q=(Grab+OR+GoTo+OR+Sea+Limited+OR+Shopee+OR+Tokopedia)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Vietnam Tech', url: rss('https://news.google.com/rss/search?q=Vietnam+startup+OR+Vietnam+tech+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Indonesia Tech', url: rss('https://news.google.com/rss/search?q=Indonesia+startup+OR+Indonesia+tech+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // Taiwan
        { name: 'Taiwan Tech', url: rss('https://news.google.com/rss/search?q=(Taiwan+startup+OR+TSMC+OR+MediaTek+OR+Foxconn)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // Latin America
        { name: 'LAVCA (LATAM)', url: rss('https://news.google.com/rss/search?q=site:lavca.org+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'LATAM Startups', url: rss('https://news.google.com/rss/search?q=("Latin+America"+startup+OR+LATAM+funding)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Startups LATAM', url: rss('https://news.google.com/rss/search?q=(startup+Brazil+OR+startup+Mexico+OR+startup+Argentina+OR+startup+Colombia+OR+startup+Chile)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Brazil Tech', url: rss('https://news.google.com/rss/search?q=(Nubank+OR+iFood+OR+Mercado+Libre+OR+Rappi+OR+VTEX)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'FinTech LATAM', url: rss('https://news.google.com/rss/search?q=fintech+(Brazil+OR+Mexico+OR+Argentina+OR+"Latin+America")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // Africa
        { name: 'TechCabal (Africa)', url: rss('https://techcabal.com/feed/') },
        { name: 'Africa Startups', url: rss('https://news.google.com/rss/search?q=Africa+startup+funding+OR+"African+startup"+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Africa Tech News', url: rss('https://news.google.com/rss/search?q=(Flutterwave+OR+Paystack+OR+Jumia+OR+Andela+OR+"Africa+startup")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // Middle East
        { name: 'MENA Startups', url: rss('https://news.google.com/rss/search?q=(MENA+startup+OR+"Middle+East"+funding+OR+Gulf+startup)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'MENA Tech News', url: rss('https://news.google.com/rss/search?q=(UAE+startup+OR+Saudi+tech+OR+Dubai+startup+OR+NEOM+tech)+when:7d&hl=en-US&gl=US&ceid=US:en') },
    ],
    github: [
        { name: 'GitHub Blog', url: rss('https://github.blog/feed/') },
        { name: 'GitHub Trending', url: rss('https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml') },
        { name: 'Show HN', url: rss('https://hnrss.org/show') },
        { name: 'YC Launches', url: rss('https://news.google.com/rss/search?q=("Y+Combinator"+OR+"YC+launch"+OR+"YC+W25"+OR+"YC+S25")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Dev Events', url: rss('https://news.google.com/rss/search?q=("developer+conference"+OR+"tech+summit"+OR+"devcon"+OR+"developer+event")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Open Source News', url: rss('https://news.google.com/rss/search?q="open+source"+project+release+OR+launch+when:3d&hl=en-US&gl=US&ceid=US:en') },
    ],
    ipo: [
        { name: 'IPO News', url: rss('https://news.google.com/rss/search?q=(IPO+OR+"initial+public+offering"+OR+SPAC)+tech+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Renaissance IPO', url: rss('https://news.google.com/rss/search?q=site:renaissancecapital.com+IPO+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Tech IPO News', url: rss('https://news.google.com/rss/search?q=tech+IPO+OR+"tech+company"+IPO+when:7d&hl=en-US&gl=US&ceid=US:en') },
    ],
    funding: [
        { name: 'SEC Filings', url: rss('https://news.google.com/rss/search?q=(S-1+OR+"IPO+filing"+OR+"SEC+filing")+startup+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'VC News', url: rss('https://news.google.com/rss/search?q=("Series+A"+OR+"Series+B"+OR+"Series+C"+OR+"funding+round"+OR+"venture+capital")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Seed & Pre-Seed', url: rss('https://news.google.com/rss/search?q=("seed+round"+OR+"pre-seed"+OR+"angel+round"+OR+"seed+funding")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Startup Funding', url: rss('https://news.google.com/rss/search?q=("startup+funding"+OR+"raised+funding"+OR+"raised+$"+OR+"funding+announced")+when:7d&hl=en-US&gl=US&ceid=US:en') },
    ],
    producthunt: [
        { name: 'Product Hunt', url: rss('https://www.producthunt.com/feed') },
    ],
    outages: [
        { name: 'AWS Status', url: rss('https://news.google.com/rss/search?q=AWS+outage+OR+"Amazon+Web+Services"+down+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Cloud Outages', url: rss('https://news.google.com/rss/search?q=(Azure+OR+GCP+OR+Cloudflare+OR+Slack+OR+GitHub)+outage+OR+down+when:1d&hl=en-US&gl=US&ceid=US:en') },
    ],
    security: [
        { name: 'Krebs Security', url: rss('https://krebsonsecurity.com/feed/') },
        { name: 'The Hacker News', url: rss('https://feeds.feedburner.com/TheHackersNews') },
        { name: 'Dark Reading', url: rss('https://www.darkreading.com/rss.xml') },
        { name: 'Schneier', url: rss('https://www.schneier.com/feed/') },
    ],
    policy: [
        // US Policy
        { name: 'Politico Tech', url: rss('https://rss.politico.com/technology.xml') },
        { name: 'AI Regulation', url: rss('https://news.google.com/rss/search?q=AI+regulation+OR+"artificial+intelligence"+law+OR+policy+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Tech Antitrust', url: rss('https://news.google.com/rss/search?q=tech+antitrust+OR+FTC+Google+OR+FTC+Apple+OR+FTC+Amazon+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'EFF News', url: rss('https://news.google.com/rss/search?q=site:eff.org+OR+"Electronic+Frontier+Foundation"+when:14d&hl=en-US&gl=US&ceid=US:en') },
        // EU Digital Policy
        { name: 'EU Digital Policy', url: rss('https://news.google.com/rss/search?q=("Digital+Services+Act"+OR+"Digital+Markets+Act"+OR+"EU+AI+Act"+OR+"GDPR")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Euractiv Digital', url: rss('https://news.google.com/rss/search?q=site:euractiv.com+digital+OR+tech+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'EU Commission Digital', url: rss('https://news.google.com/rss/search?q=site:ec.europa.eu+digital+OR+technology+when:14d&hl=en-US&gl=US&ceid=US:en') },
        // China Tech Policy
        { name: 'China Tech Policy', url: rss('https://news.google.com/rss/search?q=(China+tech+regulation+OR+China+AI+policy+OR+MIIT+technology)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // UK Policy
        { name: 'UK Tech Policy', url: rss('https://news.google.com/rss/search?q=(UK+AI+safety+OR+"Online+Safety+Bill"+OR+UK+tech+regulation)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // India Policy
        { name: 'India Tech Policy', url: rss('https://news.google.com/rss/search?q=(India+tech+regulation+OR+India+data+protection+OR+India+AI+policy)+when:7d&hl=en-US&gl=US&ceid=US:en') },
    ],
    thinktanks: [
        // US Think Tanks
        { name: 'Brookings Tech', url: rss('https://news.google.com/rss/search?q=site:brookings.edu+technology+OR+AI+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'CSIS Tech', url: rss('https://news.google.com/rss/search?q=site:csis.org+technology+OR+AI+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'MIT Tech Policy', url: rss('https://news.google.com/rss/search?q=%22Tech+Policy+Press%22&hl=en&gl=US&ceid=US:en') },
        { name: 'Stanford HAI', url: rss('https://news.google.com/rss/search?q=site:hai.stanford.edu+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'AI Now Institute', url: rss('https://news.google.com/rss/search?q=%22AI+Now+Institute%22&hl=en&gl=US&ceid=US:en') },
        // Europe Think Tanks
        { name: 'OECD Digital', url: rss('https://news.google.com/rss/search?q=site:oecd.org+digital+OR+AI+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'EU Tech Policy', url: rss('https://news.google.com/rss/search?q=("EU+tech+policy"+OR+"European+digital"+OR+Bruegel+tech)+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Chatham House Tech', url: rss('https://news.google.com/rss/search?q=site:chathamhouse.org+technology+OR+AI+when:14d&hl=en-US&gl=US&ceid=US:en') },
        // Asia Think Tanks
        { name: 'ISEAS (Singapore)', url: rss('https://news.google.com/rss/search?q=site:iseas.edu.sg+technology+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'ORF Tech (India)', url: rss('https://news.google.com/rss/search?q=(India+tech+policy+OR+ORF+technology+OR+"Observer+Research+Foundation"+tech)+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'RIETI (Japan)', url: rss('https://news.google.com/rss/search?q=site:rieti.go.jp+technology+when:30d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Asia Pacific Tech', url: rss('https://news.google.com/rss/search?q=("Asia+Pacific"+tech+policy+OR+"Lowy+Institute"+technology)+when:14d&hl=en-US&gl=US&ceid=US:en') },
        // China Research (External Views)
        { name: 'China Tech Analysis', url: rss('https://news.google.com/rss/search?q=("China+tech+strategy"+OR+"Chinese+AI"+OR+"China+semiconductor")+analysis+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'DigiChina', url: rss('https://news.google.com/rss/search?q=DigiChina+Stanford+China+technology&hl=en&gl=US&ceid=US:en') },
    ],
    finance: [
        { name: 'CNBC Tech', url: rss('https://www.cnbc.com/id/19854910/device/rss/rss.html') },
        { name: 'MarketWatch Tech', url: rss('https://news.google.com/rss/search?q=site:marketwatch.com+technology+markets+when:2d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Yahoo Finance', url: rss('https://finance.yahoo.com/rss/topstories') },
        { name: 'Seeking Alpha Tech', url: rss('https://seekingalpha.com/market_currents.xml') },
    ],
    hardware: [
        { name: "Tom's Hardware", url: rss('https://www.tomshardware.com/feeds/all') },
        { name: 'SemiAnalysis', url: rss('https://news.google.com/rss/search?q=site:semianalysis.com+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Semiconductor News', url: rss('https://news.google.com/rss/search?q=semiconductor+OR+chip+OR+TSMC+OR+NVIDIA+OR+Intel+when:3d&hl=en-US&gl=US&ceid=US:en') },
    ],
    cloud: [
        { name: 'InfoQ', url: rss('https://feed.infoq.com/') },
        { name: 'The New Stack', url: rss('https://thenewstack.io/feed/') },
        { name: 'DevOps.com', url: rss('https://devops.com/feed/') },
    ],
    dev: [
        { name: 'Dev.to', url: rss('https://dev.to/feed') },
        { name: 'Lobsters', url: rss('https://lobste.rs/rss') },
        { name: 'Changelog', url: rss('https://changelog.com/feed') },
    ],
    layoffs: [
        { name: 'Layoffs.fyi', url: rss('https://news.google.com/rss/search?q=tech+layoffs+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'TechCrunch Layoffs', url: rss('https://techcrunch.com/tag/layoffs/feed/') },
    ],
    unicorns: [
        { name: 'Unicorn News', url: rss('https://news.google.com/rss/search?q=("unicorn+startup"+OR+"unicorn+valuation"+OR+"$1+billion+valuation")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'CB Insights Unicorn', url: rss('https://news.google.com/rss/search?q=site:cbinsights.com+unicorn+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Decacorn News', url: rss('https://news.google.com/rss/search?q=("decacorn"+OR+"$10+billion+valuation"+OR+"$10B+valuation")+startup+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'New Unicorns', url: rss('https://news.google.com/rss/search?q=("becomes+unicorn"+OR+"joins+unicorn"+OR+"reaches+unicorn"+OR+"achieved+unicorn")+when:14d&hl=en-US&gl=US&ceid=US:en') },
    ],
    accelerators: [
        { name: 'Techstars News', url: rss('https://news.google.com/rss/search?q=Techstars+accelerator+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: '500 Global News', url: rss('https://news.google.com/rss/search?q="500+Global"+OR+"500+Startups"+accelerator+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Demo Day News', url: rss('https://news.google.com/rss/search?q=("demo+day"+OR+"YC+batch"+OR+"accelerator+batch")+startup+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Startup School', url: rss('https://news.google.com/rss/search?q="Startup+School"+OR+"YC+Startup+School"+when:14d&hl=en-US&gl=US&ceid=US:en') },
    ],
    podcasts: [
        // Tech Podcast Episodes (via Google News - podcast hosts block RSS proxies)
        { name: 'Acquired Episodes', url: rss('https://news.google.com/rss/search?q="Acquired+podcast"+episode+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'All-In Podcast', url: rss('https://news.google.com/rss/search?q="All-In+podcast"+(Chamath+OR+Sacks+OR+Friedberg)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'a16z Insights', url: rss('https://news.google.com/rss/search?q=("a16z"+OR+"Andreessen+Horowitz")+podcast+OR+interview+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'TWIST Episodes', url: rss('https://news.google.com/rss/search?q="This+Week+in+Startups"+Jason+Calacanis+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: '20VC Episodes', url: rss('https://rss.libsyn.com/shows/61840/destinations/240976.xml') },
        { name: 'Lex Fridman Tech', url: rss('https://news.google.com/rss/search?q=("Lex+Fridman"+interview)+(AI+OR+tech+OR+startup+OR+CEO)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        // Tech Media Shows
        { name: 'Verge Shows', url: rss('https://news.google.com/rss/search?q=("Vergecast"+OR+"Decoder+podcast"+Verge)+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Hard Fork (NYT)', url: rss('https://news.google.com/rss/search?q="Hard+Fork"+podcast+NYT+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Pivot Podcast', url: rss('https://feeds.megaphone.fm/pivot') },
        // Newsletters
        { name: 'Tech Newsletters', url: rss('https://news.google.com/rss/search?q=("Benedict+Evans"+OR+"Pragmatic+Engineer"+OR+Stratechery)+tech+when:14d&hl=en-US&gl=US&ceid=US:en') },
        // AI Podcasts & Shows
        { name: 'AI Podcasts', url: rss('https://news.google.com/rss/search?q=("AI+podcast"+OR+"artificial+intelligence+podcast")+episode+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'AI Interviews', url: rss('https://news.google.com/rss/search?q=(NVIDIA+OR+OpenAI+OR+Anthropic+OR+DeepMind)+interview+OR+podcast+when:14d&hl=en-US&gl=US&ceid=US:en') },
        // Startup Shows
        { name: 'How I Built This', url: rss('https://news.google.com/rss/search?q="How+I+Built+This"+Guy+Raz+when:14d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Masters of Scale', url: rss('https://rss.art19.com/masters-of-scale') },
    ],
};
// Finance/Trading variant feeds (all free RSS / Google News proxies)
const FINANCE_FEEDS = {
    markets: [
        { name: 'CNBC', url: rss('https://www.cnbc.com/id/100003114/device/rss/rss.html') },
        // Direct MarketWatch RSS returns frequent 403s from cloud IPs; use Google News fallback.
        { name: 'MarketWatch', url: rss('https://news.google.com/rss/search?q=site:marketwatch.com+markets+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Yahoo Finance', url: rss('https://finance.yahoo.com/rss/topstories') },
        { name: 'Seeking Alpha', url: rss('https://seekingalpha.com/market_currents.xml') },
        { name: 'Reuters Markets', url: rss('https://news.google.com/rss/search?q=site:reuters.com+markets+stocks+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Bloomberg Markets', url: rss('https://news.google.com/rss/search?q=site:bloomberg.com+markets+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Investing.com News', url: rss('https://news.google.com/rss/search?q=site:investing.com+markets+when:1d&hl=en-US&gl=US&ceid=US:en') },
    ],
    forex: [
        { name: 'Forex News', url: rss('https://news.google.com/rss/search?q=("forex"+OR+"currency"+OR+"FX+market")+trading+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Dollar Watch', url: rss('https://news.google.com/rss/search?q=("dollar+index"+OR+DXY+OR+"US+dollar"+OR+"euro+dollar")+when:2d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Central Bank Rates', url: rss('https://news.google.com/rss/search?q=("central+bank"+OR+"interest+rate"+OR+"rate+decision"+OR+"monetary+policy")+when:2d&hl=en-US&gl=US&ceid=US:en') },
    ],
    bonds: [
        { name: 'Bond Market', url: rss('https://news.google.com/rss/search?q=("bond+market"+OR+"treasury+yields"+OR+"bond+yields"+OR+"fixed+income")+when:2d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Treasury Watch', url: rss('https://news.google.com/rss/search?q=("US+Treasury"+OR+"Treasury+auction"+OR+"10-year+yield"+OR+"2-year+yield")+when:2d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Corporate Bonds', url: rss('https://news.google.com/rss/search?q=("corporate+bond"+OR+"high+yield"+OR+"investment+grade"+OR+"credit+spread")+when:3d&hl=en-US&gl=US&ceid=US:en') },
    ],
    commodities: [
        { name: 'Oil & Gas', url: rss('https://news.google.com/rss/search?q=(oil+price+OR+OPEC+OR+"natural+gas"+OR+"crude+oil"+OR+WTI+OR+Brent)+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Gold & Metals', url: rss('https://news.google.com/rss/search?q=(gold+price+OR+silver+price+OR+copper+OR+platinum+OR+"precious+metals")+when:2d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Agriculture', url: rss('https://news.google.com/rss/search?q=(wheat+OR+corn+OR+soybeans+OR+coffee+OR+sugar)+price+OR+commodity+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Commodity Trading', url: rss('https://news.google.com/rss/search?q=("commodity+trading"+OR+"futures+market"+OR+CME+OR+NYMEX+OR+COMEX)+when:2d&hl=en-US&gl=US&ceid=US:en') },
    ],
    crypto: [
        { name: 'CoinDesk', url: rss('https://www.coindesk.com/arc/outboundfeeds/rss/') },
        { name: 'Cointelegraph', url: rss('https://cointelegraph.com/rss') },
        { name: 'The Block', url: rss('https://news.google.com/rss/search?q=site:theblock.co+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Crypto News', url: rss('https://news.google.com/rss/search?q=(bitcoin+OR+ethereum+OR+crypto+OR+"digital+assets")+when:1d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'DeFi News', url: rss('https://news.google.com/rss/search?q=(DeFi+OR+"decentralized+finance"+OR+DEX+OR+"yield+farming")+when:3d&hl=en-US&gl=US&ceid=US:en') },
    ],
    centralbanks: [
        { name: 'Federal Reserve', url: rss('https://www.federalreserve.gov/feeds/press_all.xml') },
        { name: 'ECB Watch', url: rss('https://news.google.com/rss/search?q=("European+Central+Bank"+OR+ECB+OR+Lagarde)+monetary+policy+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'BoJ Watch', url: rss('https://news.google.com/rss/search?q=("Bank+of+Japan"+OR+BoJ)+monetary+policy+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'BoE Watch', url: rss('https://news.google.com/rss/search?q=("Bank+of+England"+OR+BoE)+monetary+policy+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'PBoC Watch', url: rss('https://news.google.com/rss/search?q=("People%27s+Bank+of+China"+OR+PBoC+OR+PBOC)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Global Central Banks', url: rss('https://news.google.com/rss/search?q=("rate+hike"+OR+"rate+cut"+OR+"interest+rate+decision")+central+bank+when:3d&hl=en-US&gl=US&ceid=US:en') },
    ],
    economic: [
        { name: 'Economic Data', url: rss('https://news.google.com/rss/search?q=(CPI+OR+inflation+OR+GDP+OR+"jobs+report"+OR+"nonfarm+payrolls"+OR+PMI)+when:2d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Trade & Tariffs', url: rss('https://news.google.com/rss/search?q=(tariff+OR+"trade+war"+OR+"trade+deficit"+OR+sanctions)+when:2d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Housing Market', url: rss('https://news.google.com/rss/search?q=("housing+market"+OR+"home+prices"+OR+"mortgage+rates"+OR+REIT)+when:3d&hl=en-US&gl=US&ceid=US:en') },
    ],
    ipo: [
        { name: 'IPO News', url: rss('https://news.google.com/rss/search?q=(IPO+OR+"initial+public+offering"+OR+SPAC+OR+"direct+listing")+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Earnings Reports', url: rss('https://news.google.com/rss/search?q=("earnings+report"+OR+"quarterly+earnings"+OR+"revenue+beat"+OR+"earnings+miss")+when:2d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'M&A News', url: rss('https://news.google.com/rss/search?q=("merger"+OR+"acquisition"+OR+"takeover+bid"+OR+"buyout")+billion+when:3d&hl=en-US&gl=US&ceid=US:en') },
    ],
    derivatives: [
        { name: 'Options Market', url: rss('https://news.google.com/rss/search?q=("options+market"+OR+"options+trading"+OR+"put+call+ratio"+OR+VIX)+when:2d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Futures Trading', url: rss('https://news.google.com/rss/search?q=("futures+trading"+OR+"S%26P+500+futures"+OR+"Nasdaq+futures")+when:1d&hl=en-US&gl=US&ceid=US:en') },
    ],
    fintech: [
        { name: 'Fintech News', url: rss('https://news.google.com/rss/search?q=(fintech+OR+"payment+technology"+OR+"neobank"+OR+"digital+banking")+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Trading Tech', url: rss('https://news.google.com/rss/search?q=("algorithmic+trading"+OR+"trading+platform"+OR+"quantitative+finance")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Blockchain Finance', url: rss('https://news.google.com/rss/search?q=("blockchain+finance"+OR+"tokenization"+OR+"digital+securities"+OR+CBDC)+when:7d&hl=en-US&gl=US&ceid=US:en') },
    ],
    regulation: [
        { name: 'SEC', url: rss('https://www.sec.gov/news/pressreleases.rss') },
        { name: 'Financial Regulation', url: rss('https://news.google.com/rss/search?q=(SEC+OR+CFTC+OR+FINRA+OR+FCA)+regulation+OR+enforcement+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Banking Rules', url: rss('https://news.google.com/rss/search?q=(Basel+OR+"capital+requirements"+OR+"banking+regulation")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Crypto Regulation', url: rss('https://news.google.com/rss/search?q=(crypto+regulation+OR+"digital+asset"+regulation+OR+"stablecoin"+regulation)+when:7d&hl=en-US&gl=US&ceid=US:en') },
    ],
    institutional: [
        { name: 'Hedge Fund News', url: rss('https://news.google.com/rss/search?q=("hedge+fund"+OR+"Bridgewater"+OR+"Citadel"+OR+"Renaissance")+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Private Equity', url: rss('https://news.google.com/rss/search?q=("private+equity"+OR+Blackstone+OR+KKR+OR+Apollo+OR+Carlyle)+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Sovereign Wealth', url: rss('https://news.google.com/rss/search?q=("sovereign+wealth+fund"+OR+"pension+fund"+OR+"institutional+investor")+when:7d&hl=en-US&gl=US&ceid=US:en') },
    ],
    analysis: [
        { name: 'Market Outlook', url: rss('https://news.google.com/rss/search?q=("market+outlook"+OR+"stock+market+forecast"+OR+"bull+market"+OR+"bear+market")+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Risk & Volatility', url: rss('https://news.google.com/rss/search?q=(VIX+OR+"market+volatility"+OR+"risk+off"+OR+"market+correction")+when:3d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Bank Research', url: rss('https://news.google.com/rss/search?q=("Goldman+Sachs"+OR+"JPMorgan"+OR+"Morgan+Stanley")+forecast+OR+outlook+when:3d&hl=en-US&gl=US&ceid=US:en') },
    ],
    gccNews: [
        { name: 'Arabian Business', url: rss('https://news.google.com/rss/search?q=site:arabianbusiness.com+(Saudi+Arabia+OR+UAE+OR+GCC)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'The National', url: rss('https://news.google.com/rss/search?q=site:thenationalnews.com+(Abu+Dhabi+OR+UAE+OR+Saudi)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Arab News', url: rss('https://news.google.com/rss/search?q=site:arabnews.com+(Saudi+Arabia+OR+investment+OR+infrastructure)+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Gulf FDI', url: rss('https://news.google.com/rss/search?q=(PIF+OR+"DP+World"+OR+Mubadala+OR+ADNOC+OR+Masdar+OR+"ACWA+Power")+infrastructure+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Gulf Investments', url: rss('https://news.google.com/rss/search?q=("Saudi+Arabia"+OR+"UAE"+OR+"Abu+Dhabi")+investment+infrastructure+when:7d&hl=en-US&gl=US&ceid=US:en') },
        { name: 'Vision 2030', url: rss('https://news.google.com/rss/search?q="Vision+2030"+(project+OR+investment+OR+announced)+when:14d&hl=en-US&gl=US&ceid=US:en') },
    ],
};
const HAPPY_FEEDS = {
    positive: [
        { name: 'Good News Network', url: rss('https://www.goodnewsnetwork.org/feed/') },
        { name: 'Positive.News', url: rss('https://www.positive.news/feed/') },
        { name: 'Reasons to be Cheerful', url: rss('https://reasonstobecheerful.world/feed/') },
        { name: 'Optimist Daily', url: rss('https://www.optimistdaily.com/feed/') },
        { name: 'Upworthy', url: rss('https://www.upworthy.com/feed/') },
        { name: 'DailyGood', url: rss('https://www.dailygood.org/feed') },
        { name: 'Good Good Good', url: rss('https://www.goodgoodgood.co/articles/rss.xml') },
        { name: 'GOOD Magazine', url: rss('https://www.good.is/feed/') },
        { name: 'Sunny Skyz', url: rss('https://www.sunnyskyz.com/rss_tebow.php') },
        { name: 'The Better India', url: rss('https://thebetterindia.com/feed/') },
    ],
    science: [
        { name: 'GNN Science', url: rss('https://www.goodnewsnetwork.org/category/news/science/feed/') },
        { name: 'ScienceDaily', url: rss('https://www.sciencedaily.com/rss/all.xml') },
        { name: 'Nature News', url: rss('https://feeds.nature.com/nature/rss/current') },
        { name: 'Live Science', url: rss('https://www.livescience.com/feeds.xml') },
        { name: 'New Scientist', url: rss('https://www.newscientist.com/feed/home/') },
        { name: 'Singularity Hub', url: rss('https://singularityhub.com/feed/') },
        { name: 'Human Progress', url: rss('https://humanprogress.org/feed/') },
        { name: 'Greater Good (Berkeley)', url: rss('https://greatergood.berkeley.edu/site/rss/articles') },
    ],
    nature: [
        { name: 'GNN Animals', url: rss('https://www.goodnewsnetwork.org/category/news/animals/feed/') },
    ],
    health: [
        { name: 'GNN Health', url: rss('https://www.goodnewsnetwork.org/category/news/health/feed/') },
    ],
    inspiring: [
        { name: 'GNN Heroes', url: rss('https://www.goodnewsnetwork.org/category/news/inspiring/feed/') },
    ],
};
// Variant-aware exports
exports.FEEDS = variant_1.SITE_VARIANT === 'tech'
    ? TECH_FEEDS
    : variant_1.SITE_VARIANT === 'finance'
        ? FINANCE_FEEDS
        : variant_1.SITE_VARIANT === 'happy'
            ? HAPPY_FEEDS
            : FULL_FEEDS;
exports.SOURCE_REGION_MAP = {
    // Full (geopolitical) variant regions
    worldwide: { labelKey: 'header.sourceRegionWorldwide', feedKeys: ['war'] },
    us: { labelKey: 'header.sourceRegionUS', feedKeys: [] },
    europe: { labelKey: 'header.sourceRegionEurope', feedKeys: [] },
    middleeast: { labelKey: 'header.sourceRegionMiddleEast', feedKeys: [] },
    africa: { labelKey: 'header.sourceRegionAfrica', feedKeys: [] },
    latam: { labelKey: 'header.sourceRegionLatAm', feedKeys: [] },
    asia: { labelKey: 'header.sourceRegionAsiaPacific', feedKeys: [] },
    topical: { labelKey: 'header.sourceRegionTopical', feedKeys: ['medical', 'pharma', 'economic', 'finance'] },
    intel: { labelKey: 'header.sourceRegionIntel', feedKeys: [] },
    // Tech variant regions
    techNews: { labelKey: 'header.sourceRegionTechNews', feedKeys: ['tech', 'hardware'] },
    aiMl: { labelKey: 'header.sourceRegionAiMl', feedKeys: ['ai'] },
    startupsVc: { labelKey: 'header.sourceRegionStartupsVc', feedKeys: ['startups', 'vcblogs', 'funding', 'unicorns', 'accelerators', 'ipo'] },
    regionalTech: { labelKey: 'header.sourceRegionRegionalTech', feedKeys: ['regionalStartups'] },
    developer: { labelKey: 'header.sourceRegionDeveloper', feedKeys: ['github', 'cloud', 'dev', 'producthunt', 'outages'] },
    cybersecurity: { labelKey: 'header.sourceRegionCybersecurity', feedKeys: ['security'] },
    techPolicy: { labelKey: 'header.sourceRegionTechPolicy', feedKeys: ['policy', 'thinktanks'] },
    techMedia: { labelKey: 'header.sourceRegionTechMedia', feedKeys: ['podcasts', 'layoffs', 'finance'] },
    // Finance variant regions
    marketsAnalysis: { labelKey: 'header.sourceRegionMarkets', feedKeys: ['markets', 'analysis', 'ipo'] },
    fixedIncomeFx: { labelKey: 'header.sourceRegionFixedIncomeFx', feedKeys: ['forex', 'bonds'] },
    commoditiesRegion: { labelKey: 'header.sourceRegionCommodities', feedKeys: ['commodities'] },
    cryptoDigital: { labelKey: 'header.sourceRegionCryptoDigital', feedKeys: ['crypto', 'fintech'] },
    centralBanksEcon: { labelKey: 'header.sourceRegionCentralBanks', feedKeys: ['centralbanks', 'economic'] },
    dealsCorpFin: { labelKey: 'header.sourceRegionDeals', feedKeys: ['institutional', 'derivatives'] },
    finRegulation: { labelKey: 'header.sourceRegionFinRegulation', feedKeys: ['regulation'] },
    gulfMena: { labelKey: 'header.sourceRegionGulfMena', feedKeys: ['gccNews'] },
};
exports.INTEL_SOURCES = [
    // Defense & Security (Tier 1)
    { name: 'Defense One', url: rss('https://www.defenseone.com/rss/all/'), type: 'defense' },
    { name: 'Breaking Defense', url: rss('https://breakingdefense.com/feed/'), type: 'defense' },
    { name: 'The War Zone', url: rss('https://www.twz.com/feed'), type: 'defense' },
    { name: 'Defense News', url: rss('https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml'), type: 'defense' },
    { name: 'Janes', url: rss('https://news.google.com/rss/search?q=site:janes.com+when:3d&hl=en-US&gl=US&ceid=US:en'), type: 'defense' },
    { name: 'Military Times', url: rss('https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml'), type: 'defense' },
    { name: 'Task & Purpose', url: rss('https://taskandpurpose.com/feed/'), type: 'defense' },
    { name: 'USNI News', url: rss('https://news.usni.org/feed'), type: 'defense' },
    { name: 'gCaptain', url: rss('https://gcaptain.com/feed/'), type: 'defense' },
    { name: 'Oryx OSINT', url: rss('https://www.oryxspioenkop.com/feeds/posts/default?alt=rss'), type: 'defense' },
    { name: 'UK MOD', url: rss('https://www.gov.uk/government/organisations/ministry-of-defence.atom'), type: 'defense' },
    { name: 'CSIS', url: rss('https://news.google.com/rss/search?q=site:csis.org&hl=en&gl=US&ceid=US:en'), type: 'defense' },
    // International Relations (Tier 2)
    { name: 'Chatham House', url: rss('https://news.google.com/rss/search?q=site:chathamhouse.org+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'intl' },
    { name: 'ECFR', url: rss('https://news.google.com/rss/search?q=site:ecfr.eu+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'intl' },
    { name: 'Foreign Policy', url: rss('https://foreignpolicy.com/feed/'), type: 'intl' },
    { name: 'Foreign Affairs', url: rss('https://www.foreignaffairs.com/rss.xml'), type: 'intl' },
    { name: 'Atlantic Council', url: railwayRss('https://www.atlanticcouncil.org/feed/'), type: 'intl' },
    { name: 'Middle East Institute', url: rss('https://news.google.com/rss/search?q=site:mei.edu+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'intl' },
    // Think Tanks & Research (Tier 3)
    { name: 'RAND', url: rss('https://news.google.com/rss/search?q=site:rand.org+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'research' },
    { name: 'Brookings', url: rss('https://news.google.com/rss/search?q=site:brookings.edu&hl=en&gl=US&ceid=US:en'), type: 'research' },
    { name: 'Carnegie', url: rss('https://news.google.com/rss/search?q=site:carnegieendowment.org&hl=en&gl=US&ceid=US:en'), type: 'research' },
    { name: 'FAS', url: rss('https://news.google.com/rss/search?q=site:fas.org+nuclear+weapons+security&hl=en&gl=US&ceid=US:en'), type: 'research' },
    { name: 'NTI', url: rss('https://news.google.com/rss/search?q=site:nti.org+when:30d&hl=en-US&gl=US&ceid=US:en'), type: 'research' },
    { name: 'RUSI', url: rss('https://news.google.com/rss/search?q=site:rusi.org+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'research' },
    { name: 'Wilson Center', url: rss('https://news.google.com/rss/search?q=site:wilsoncenter.org+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'research' },
    { name: 'GMF', url: rss('https://news.google.com/rss/search?q=site:gmfus.org+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'research' },
    { name: 'Stimson Center', url: rss('https://www.stimson.org/feed/'), type: 'research' },
    { name: 'CNAS', url: rss('https://news.google.com/rss/search?q=site:cnas.org+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'research' },
    { name: 'Lowy Institute', url: rss('https://news.google.com/rss/search?q=site:lowyinstitute.org+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'research' },
    // Nuclear & Arms Control (Tier 2)
    { name: 'Arms Control Assn', url: rss('https://news.google.com/rss/search?q=site:armscontrol.org+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'nuclear' },
    { name: 'Bulletin of Atomic Scientists', url: rss('https://news.google.com/rss/search?q=site:thebulletin.org+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'nuclear' },
    // OSINT & Monitoring (Tier 2)
    { name: 'Bellingcat', url: rss('https://news.google.com/rss/search?q=site:bellingcat.com+when:30d&hl=en-US&gl=US&ceid=US:en'), type: 'osint' },
    { name: 'Krebs Security', url: rss('https://krebsonsecurity.com/feed/'), type: 'cyber' },
    { name: 'Ransomware.live', url: rss('https://www.ransomware.live/rss.xml'), type: 'cyber' },
    // Economic & Food Security (Tier 2)
    { name: 'FAO News', url: rss('https://www.fao.org/feeds/fao-newsroom-rss'), type: 'economic' },
    { name: 'FAO GIEWS', url: rss('https://news.google.com/rss/search?q=site:fao.org+GIEWS+food+security+when:30d&hl=en-US&gl=US&ceid=US:en'), type: 'economic' },
    { name: 'EU ISS', url: rss('https://news.google.com/rss/search?q=site:iss.europa.eu+when:7d&hl=en-US&gl=US&ceid=US:en'), type: 'intl' },
];
// Keywords that trigger alert status - must be specific to avoid false positives
exports.ALERT_KEYWORDS = [
    'war', 'invasion', 'military', 'nuclear', 'sanctions', 'missile',
    'airstrike', 'drone strike', 'troops deployed', 'armed conflict', 'bombing', 'casualties',
    'ceasefire', 'peace treaty', 'nato', 'coup', 'martial law',
    'assassination', 'terrorist', 'terror attack', 'cyber attack', 'hostage', 'evacuation order',
];
// Patterns that indicate non-alert content (lifestyle, entertainment, etc.)
exports.ALERT_EXCLUSIONS = [
    'protein', 'couples', 'relationship', 'dating', 'diet', 'fitness',
    'recipe', 'cooking', 'shopping', 'fashion', 'celebrity', 'movie',
    'tv show', 'sports', 'game', 'concert', 'festival', 'wedding',
    'vacation', 'travel tips', 'life hack', 'self-care', 'wellness',
];
