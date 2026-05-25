const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Web Scraper Server is running!',
    version: '1.0.0',
    endpoints: {
      health: 'GET /',
      scrapeHTML: 'GET /scrape/html?url=https://zefoy.com',
      scrapeText: 'GET /scrape/text?url=https://zefoy.com',
      scrapeLinks: 'GET /scrape/links?url=https://zefoy.com',
      scrapeData: 'POST /scrape/data'
    }
  });
});

// Endpoint 1: Get raw HTML
app.get('/scrape/html', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    res.status(200).json({
      success: true,
      url: url,
      html: response.data,
      statusCode: response.status
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.code || 'Unknown error'
    });
  }
});

// Endpoint 2: Scrape all text content
app.get('/scrape/text', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const text = $('body').text().trim();

    res.status(200).json({
      success: true,
      url: url,
      text: text,
      length: text.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint 3: Scrape all links
app.get('/scrape/links', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const links = [];

    $('a').each((index, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      if (href) {
        links.push({
          text: text || 'No text',
          url: href
        });
      }
    });

    res.status(200).json({
      success: true,
      url: url,
      totalLinks: links.length,
      links: links
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint 4: Custom scraping with selectors
app.post('/scrape/data', async (req, res) => {
  try {
    const { url, selectors } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!selectors || typeof selectors !== 'object') {
      return res.status(400).json({ 
        error: 'Selectors object is required',
        example: { 
          url: 'https://example.com',
          selectors: {
            'title': 'h1',
            'description': 'p.desc'
          }
        }
      });
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const data = {};

    for (const [key, selector] of Object.entries(selectors)) {
      const elements = $(selector);
      
      if (elements.length === 1) {
        data[key] = elements.text().trim();
      } else if (elements.length > 1) {
        data[key] = [];
        elements.each((index, element) => {
          data[key].push($(element).text().trim());
        });
      } else {
        data[key] = null;
      }
    }

    res.status(200).json({
      success: true,
      url: url,
      data: data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint 5: Scrape metadata
app.get('/scrape/meta', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    const meta = {
      title: $('title').text() || 'No title',
      description: $('meta[name="description"]').attr('content') || 'No description',
      keywords: $('meta[name="keywords"]').attr('content') || 'No keywords',
      author: $('meta[name="author"]').attr('content') || 'No author',
      ogTitle: $('meta[property="og:title"]').attr('content') || null,
      ogDescription: $('meta[property="og:description"]').attr('content') || null,
      ogImage: $('meta[property="og:image"]').attr('content') || null
    };

    res.status(200).json({
      success: true,
      url: url,
      metadata: meta
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: {
      'GET /': 'Health check and API documentation',
      'GET /scrape/html': 'Get raw HTML',
      'GET /scrape/text': 'Get all text content',
      'GET /scrape/links': 'Get all links',
      'GET /scrape/meta': 'Get metadata',
      'POST /scrape/data': 'Custom data scraping with selectors'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Web Scraper Server is running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📚 API Docs available at http://localhost:${PORT}/`);
});

module.exports = app;
