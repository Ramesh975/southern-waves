const express = require('express');
const router = express.Router();
const RSS = require('rss');
const Article = require('../models/Article');

// @desc    Get RSS Feed for a category (or 'all')
// @route   GET /api/rss/:category
// @access  Public
router.get('/:category', async (req, res, next) => {
  try {
    const { category } = req.params;
    
    const query = { status: 'published' };
    if (category !== 'all') {
      query.category = category;
    }

    const articles = await Article.find(query)
      .populate('author', 'name')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(50); // Standard RSS limit

    const feedTitle = category === 'all' 
      ? 'Southern Waves - All Articles' 
      : `Southern Waves - ${category.toUpperCase()}`;

    const feed = new RSS({
      title: feedTitle,
      description: 'Student Media Platform sharing information and enlightening young minds.',
      feed_url: `${req.protocol}://${req.get('host')}/api/rss/${category}`,
      site_url: `${req.protocol}://${req.get('host')}`,
      language: 'en',
      pubDate: new Date(),
      ttl: 60,
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    articles.forEach(article => {
      feed.item({
        title: article.title,
        description: article.dek || article.lead || article.body.substring(0, 250),
        url: `${clientUrl}/article/${article.slug}`, // Using client URL
        categories: [article.category],
        author: article.author?.name || 'Southern Waves',
        date: article.publishedAt || article.createdAt,
      });
    });

    res.type('application/xml');
    res.send(feed.xml({ indent: true }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
