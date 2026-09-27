require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const connectDB = require('../config/db');

// Import Models
const User = require('../models/User');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const ChatMessage = require('../models/ChatMessage');
const ChatReadStatus = require('../models/ChatReadStatus');
const Notification = require('../models/Notification');
const Newsletter = require('../models/Newsletter');
const FilterWord = require('../models/FilterWord');
const BlockedTag = require('../models/BlockedTag');
const SystemSetting = require('../models/SystemSetting');

const TARGET_COUNT = 10000;
const BATCH_SIZE = 5000;

// Data Pools
const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akash', 'Ananya', 'Arjun', 'Arvind', 'Bhavna', 'Chetan', 'Deepa', 'Divya',
  'Gautam', 'Hari', 'Ishaan', 'Janani', 'Karthik', 'Kavya', 'Lakshmi', 'Madhav', 'Meera', 'Manoj',
  'Naveen', 'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Priya', 'Rahul', 'Ramesh', 'Rhea', 'Rohan',
  'Sai', 'Sanjay', 'Shruti', 'Siddharth', 'Sneha', 'Suresh', 'Swathi', 'Varun', 'Vignesh', 'Zoya'
];

const LAST_NAMES = [
  'Balaji', 'Chandran', 'Iyer', 'Iyengar', 'Kumar', 'Menon', 'Murugan', 'Nair', 'Natarajan', 'Pillai',
  'Prasad', 'Rajan', 'Ramachandran', 'Rao', 'Reddy', 'Sankaran', 'Sharma', 'Subramanian', 'Sundaram', 'Varma'
];

const UNIVERSITIES = [
  'University of Madras',
  'Anna University',
  'Indian Institute of Technology (IIT) Madras',
  'SRM Institute of Science and Technology',
  'VIT University',
  'Loyola College, Chennai',
  'Presidency College, Chennai',
  'Madurai Kamaraj University',
  'Bharathiar University'
];

const MAJORS = [
  'Computer Science and Engineering',
  'Mechanical Engineering',
  'Journalism and Mass Communication',
  'Biotechnology',
  'English Literature',
  'Physics',
  'Commerce and Finance',
  'Visual Communication',
  'Architecture',
  'Mathematics and Computing'
];

const YEARS_OF_STUDY = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate', 'PhD Scholar'];

const CATEGORIES = ['news', 'editorial', 'features', 'kyp', 'tea-shop', 'pictures-speak', 'university-row'];

const SUB_CATEGORIES = {
  news: ['Campus', 'Infrastructure', 'Academics', 'Sports', 'Hostel', 'Placements', 'Elections', 'Health'],
  editorial: ['Opinion', 'Campus Life', 'Policy', 'Higher Education', 'Student Welfare', 'Society'],
  features: ['Culture', 'Spotlight', 'Technology', 'Arts', 'Alumni', 'Environment'],
  kyp: ['Faculty Focus', 'Dean Interview', 'Research Pioneer', 'Department Head', 'Mentor Stories'],
  'tea-shop': ['Campus Buzz', 'Hostel Life', 'Canteen Talks', 'Debates', 'Student Rumors'],
  'pictures-speak': ['Heritage Architecture', 'Monsoon Campus', 'Cultural Fest', 'Sports Glory', 'Night Lights'],
  'university-row': ['Symposiums', 'Inter-Collegiate', 'State Rankings', 'Hackathons', 'Sports League']
};

const SAMPLE_TAGS = [
  'campus', 'students', 'exams', 'placements', 'technology', 'hostel', 'canteen', 'sports',
  'fest', 'research', 'ai', 'innovation', 'heritage', 'library', 'hackathon', 'alumni',
  'sustainability', 'health', 'elections', 'student-rights', 'symposium', 'academics'
];

const COMMENT_TEXTS = [
  'This is a crucial issue that needs immediate administrative intervention.',
  'Great article and thorough coverage of the campus pulse.',
  'As a final-year student, I can relate to every single point mentioned here.',
  'Thank you for shedding light on this matter. Hopefully the council takes note.',
  'Very well articulated perspective. Looking forward to follow-up reporting.',
  'The proposed initiative sounds promising if implemented properly.',
  'Outstanding journalism! The team has done phenomenal work with these insights.',
  'I have a slightly different viewpoint on this, but appreciate the author opening dialogue.',
  'Kudos to the student representatives for raising this in the syndicate meeting.',
  'Extremely relevant for everyone living in the university hostels.'
];

const CHAT_TEXTS = [
  'Anyone studying in the central library right now? Is it crowded?',
  'Mess special lunch today is surprisingly great!',
  'Does anyone have lecture notes for Semester 4 Algorithms?',
  'Reminder: The college robotics symposium registration ends tonight.',
  'Who wants to form a team for the upcoming inter-collegiate hackathon?',
  'WiFi in Block B hostel has been acting up since morning.',
  'Great win for our cricket team in the inter-university semi-finals!',
  'Is the placement cell conducting the mock interview drive tomorrow?',
  'Tea shop near the main quadrangle has fresh snacks right now!',
  'Don’t forget to submit your semester project proposal by Friday 5 PM.'
];

const NOTIFICATION_TEMPLATES = [
  { title: 'End-Semester Exam Schedule Published', message: 'The controller of examinations has officially uploaded the revised timetable for all undergraduate and postgraduate programs.', type: 'announcement', priority: 'high' },
  { title: 'Campus Wi-Fi Maintenance Window', message: 'Network connectivity will experience intermittent downtime from 11 PM to 3 AM tonight due to core fiber-optic upgrades.', type: 'system', priority: 'normal' },
  { title: 'Annual Cultural Fest: Volunteer Calls', message: 'Registrations are now open for student coordinators and event leads for the upcoming inter-university cultural extravaganza.', type: 'board_news', priority: 'normal' },
  { title: 'Urgent: Placement Cell Advisory', message: 'All eligible final year students must verify their semester academic records and resume links on the placement portal.', type: 'announcement', priority: 'urgent' },
  { title: 'Central Library Extended Hours', message: 'In light of upcoming final examinations, the reading halls will remain accessible 24/7 with active ID card scanning.', type: 'board_news', priority: 'pinned' },
  { title: 'Content Sensitivity Notice', message: 'A published student submission has been reviewed under standard editorial guidelines and updated with appropriate context.', type: 'sensitivity', priority: 'normal' },
  { title: 'Hostel Committee Meeting Summary', message: 'Minutes of the hostel safety and hygiene advisory meeting have been compiled and circulated for student feedback.', type: 'editorial', priority: 'normal' }
];

const FILTER_CATEGORIES = ['profanity', 'hate-speech', 'scam', 'cyberbullying', 'spam'];
const FILTER_SEVERITIES = ['low', 'medium', 'high'];

// Utility Helpers
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubset(arr, minCount = 1, maxCount = 3) {
  const count = Math.min(arr.length, Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount);
  if (count <= 0) return [];
  const result = [];
  const picked = new Set();
  while (result.length < count) {
    const idx = Math.floor(Math.random() * arr.length);
    if (!picked.has(idx)) {
      picked.add(idx);
      result.push(arr[idx]);
    }
  }
  return result;
}

function getRandomDate(monthsBack = 18) {
  const now = Date.now();
  const past = now - monthsBack * 30 * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

// Ultra-fast Native MongoDB Collection Bulk Insert
async function fastBulkInsert(model, items, collectionName) {
  const startTime = Date.now();
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    await model.collection.insertMany(chunk, { ordered: false });
  }
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const rate = Math.round(items.length / (duration > 0 ? duration : 0.01));
  console.log(`  ✅ [${collectionName.padEnd(20)}] Inserted ${items.length.toLocaleString()} records in ${duration}s (~${rate.toLocaleString()} rec/s)`);
}

async function seedLargeScale() {
  const overallStart = Date.now();
  console.log('===============================================================');
  console.log('  SOUTHERN WAVES - HIGH PERFORMANCE LARGE SCALE SEEDER');
  console.log(`  Target: ${TARGET_COUNT.toLocaleString()} records each across 9 features`);
  console.log('===============================================================');

  await connectDB();

  // 1. Ensure SystemSetting default exists
  let setting = await SystemSetting.findOne({ key: 'global_settings' });
  if (!setting) {
    await SystemSetting.create({ key: 'global_settings' });
  }

  // Ensure Admin User exists
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    const rootAdminHash = await bcrypt.hash('Admin@1234', 10);
    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@southernwaves.com',
      password: rootAdminHash,
      role: 'admin',
      username: 'admin',
      university: 'University of Madras',
      isVerified: true,
      emailVerified: true,
      hasCompletedOnboarding: true
    });
  }

  // Pre-compute bcrypt password hash once
  const testPasswordHash = await bcrypt.hash('TestPass@1234', 10);

  // Clean previous synthetic test data to avoid key collisions and ensure clean state
  console.log('🧹 Cleaning any existing synthetic test records...');
  await Promise.all([
    User.collection.deleteMany({ email: /^testuser_/ }),
    Article.collection.deleteMany({ slug: /-test-\d+$/ }),
    Comment.collection.deleteMany({ text: /\[Comment #\d+\]/ }),
    ChatMessage.collection.deleteMany({ text: /\[Msg #\d+\]/ }),
    Notification.collection.deleteMany({ title: /\[Alert #\d+\]/ }),
    Newsletter.collection.deleteMany({ email: /^newsletter_sub_/ }),
    FilterWord.collection.deleteMany({ word: /^testfilterword_/ }),
    BlockedTag.collection.deleteMany({ tag: /^blockedtag_/ }),
    ChatReadStatus.collection.deleteMany({ room: 'tea-shop-test' })
  ]);
  console.log('✨ Cleaned old test data. Starting generation...');

  // ==========================================
  // 1. USERS (10,000)
  // ==========================================
  console.log('\n--- 1. Generating Users (10,000) ---');
  const userDocs = [];
  const userIds = [];
  const authorUserIds = [];

  for (let i = 1; i <= TARGET_COUNT; i++) {
    const userId = new mongoose.Types.ObjectId();
    userIds.push(userId);

    const fName = getRandomItem(FIRST_NAMES);
    const lName = getRandomItem(LAST_NAMES);
    const role = i % 50 === 0 ? 'admin' : (i % 25 === 0 ? 'editor' : (i % 40 === 0 ? 'moderator' : 'student'));
    if (['editor', 'student', 'admin'].includes(role)) {
      authorUserIds.push(userId);
    }
    const uni = getRandomItem(UNIVERSITIES);
    const major = getRandomItem(MAJORS);
    const year = getRandomItem(YEARS_OF_STUDY);
    const createdAt = getRandomDate(18);

    userDocs.push({
      _id: userId,
      name: `${fName} ${lName}`,
      firstName: fName,
      lastName: lName,
      username: `student_${i}`,
      email: `testuser_${i}@southernwaves.test`,
      password: testPasswordHash,
      role,
      university: uni,
      academicMajor: major,
      yearOfStudy: year,
      phone: `+91 9${String(100000000 + (i % 900000000))}`,
      age: 18 + (i % 8),
      gender: i % 2 === 0 ? 'male' : 'female',
      bio: `${year} student studying ${major} at ${uni}. Passionate about campus reporting and student discussions.`,
      hasCompletedOnboarding: true,
      isPublicProfile: true,
      isVerified: true,
      emailVerified: true,
      phoneVerified: i % 3 !== 0,
      recommendationSettings: {
        preferredCategories: getRandomSubset(CATEGORIES, 1, 3),
        preferredTags: getRandomSubset(SAMPLE_TAGS, 2, 4)
      },
      appearanceSettings: {
        theme: i % 3 === 0 ? 'light' : 'dark',
        themeEngine: 'default',
        accentColor: ['blue', 'emerald', 'indigo', 'rose'][i % 4]
      },
      isActive: true,
      isBlocked: i % 200 === 0,
      createdAt,
      updatedAt: createdAt
    });
  }
  await fastBulkInsert(User, userDocs, 'users');

  // ==========================================
  // 2. ARTICLES (10,000)
  // ==========================================
  console.log('\n--- 2. Generating Articles (10,000) ---');
  const articleDocs = [];
  const articleIds = [];

  const sampleImages = [
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80',
    'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80',
    'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1200&q=80',
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80'
  ];

  const headlineTopics = [
    'New Technological Breakthrough Announced by University Research Wing',
    'Student Union Submits Key Resolution on Campus Hostel Infrastructure',
    'State-Level Inter-University Sports Meet Commences in Grand Ceremony',
    'Central Library Launches Digital Archive of Rare Regional Manuscripts',
    'Placement Drive Surpasses Previous Records with Global Tech Offers',
    'Campus Sustainability Council Installs High-Efficiency Solar Grid',
    'Annual Cultural Fest Celebrates Vibrant Heritage and Student Artistry',
    'Canteen Quality Committee Implements Comprehensive Health Audit',
    'In-Depth Feature: Life, Aspirations, and Challenges of Hostel Residents',
    'Interviews with Academic Pioneers: Department Heads Share Vision for 2027',
    'Campus Debate Society Tackles Contemporary Educational Policy Reforms',
    'University Robotics Lab Unveils Autonomous Campus Assistance Rover'
  ];

  for (let i = 1; i <= TARGET_COUNT; i++) {
    const articleId = new mongoose.Types.ObjectId();
    articleIds.push(articleId);

    const baseHeadline = headlineTopics[i % headlineTopics.length];
    const category = CATEGORIES[i % CATEGORIES.length];
    const subCat = getRandomItem(SUB_CATEGORIES[category]);
    const author = getRandomItem(authorUserIds);
    const publishedAt = getRandomDate(18);

    const title = `${baseHeadline} [Edition #${i}]`;
    const slug = `${slugify(baseHeadline, { lower: true, strict: true })}-test-${i}`;

    let categoriesArr = [category];
    if (!['tea-shop', 'pictures-speak'].includes(category) && i % 3 === 0) {
      categoriesArr.push('features');
    }

    const likesCount = Math.floor(Math.random() * 30);
    const articleLikes = getRandomSubset(userIds, 0, likesCount);
    const status = i % 20 === 0 ? 'draft' : (i % 30 === 0 ? 'pending' : (i % 50 === 0 ? 'archived' : 'published'));

    articleDocs.push({
      _id: articleId,
      title,
      slug,
      lead: `Comprehensive overview and student reporting regarding ${baseHeadline.toLowerCase()} across major university departments.`,
      dek: `Special report on academic developments and campus updates for the current term.`,
      body: `<p>In an impactful turn of events across the university network, this edition covers the comprehensive background, implementation milestones, and direct student reactions regarding <strong>${baseHeadline}</strong>.</p>
             <p>Key stakeholders and department representatives met earlier this week to assess the broader implications for the student body. According to senior faculty and student council delegates, these measures mark a milestone in university governance and student welfare.</p>
             <p>"We are committed to maintaining the highest journalistic integrity and providing our readers with accurate, real-time reporting," remarked the campus editorial desk.</p>
             <blockquote>"Collaboration between student innovators and university leadership continues to drive meaningful transformation."</blockquote>
             <p>Stay tuned to Southern Waves for rolling updates, student interviews, and comprehensive analytical pieces on this story.</p>`,
      category,
      categories: categoriesArr,
      subCategory: subCat,
      coverImage: sampleImages[i % sampleImages.length],
      imageCaption: `Campus photo highlights regarding ${subCat} developments.`,
      author,
      tags: getRandomSubset(SAMPLE_TAGS, 2, 5),
      status,
      isFeatured: i % 100 === 0,
      isTrending: i % 50 === 0,
      isBreaking: i % 200 === 0,
      isPushedToHome: i % 80 === 0,
      views: Math.floor(Math.random() * 35000) + 100,
      shares: Math.floor(Math.random() * 450),
      likes: articleLikes,
      publishedAt: status === 'published' ? publishedAt : null,
      createdAt: publishedAt,
      updatedAt: publishedAt
    });
  }
  await fastBulkInsert(Article, articleDocs, 'articles');

  // ==========================================
  // 3. COMMENTS (10,000)
  // ==========================================
  console.log('\n--- 3. Generating Comments (10,000) ---');
  const commentDocs = [];
  for (let i = 1; i <= TARGET_COUNT; i++) {
    const articleId = getRandomItem(articleIds);
    const authorId = getRandomItem(userIds);
    const textBase = getRandomItem(COMMENT_TEXTS);
    const createdAt = getRandomDate(12);

    commentDocs.push({
      _id: new mongoose.Types.ObjectId(),
      article: articleId,
      author: authorId,
      text: `${textBase} [Comment #${i}]`,
      isApproved: i % 20 !== 0,
      likes: getRandomSubset(userIds, 0, 10),
      createdAt,
      updatedAt: createdAt
    });
  }
  await fastBulkInsert(Comment, commentDocs, 'comments');

  // ==========================================
  // 4. CHAT MESSAGES (10,000)
  // ==========================================
  console.log('\n--- 4. Generating Chat Messages (10,000) ---');
  const chatDocs = [];
  const chatRooms = ['tea-shop', 'university-row', 'campus-buzz', 'tech-talk', 'study-group', 'hostel-chat'];
  const emojis = ['👍', '❤️', '🔥', '👏', '💡', '🎉', '☕', '📚'];

  for (let i = 1; i <= TARGET_COUNT; i++) {
    const userId = getRandomItem(userIds);
    const textBase = getRandomItem(CHAT_TEXTS);
    const category = getRandomItem(chatRooms);
    const createdAt = getRandomDate(3);

    const reactions = [];
    if (i % 2 === 0) {
      const reactionUsers = getRandomSubset(userIds, 1, 4);
      reactionUsers.forEach(uId => {
        reactions.push({ user: uId, emoji: getRandomItem(emojis) });
      });
    }

    chatDocs.push({
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      text: `${textBase} [Msg #${i}]`,
      category,
      tags: getRandomSubset(SAMPLE_TAGS, 1, 2),
      isBroadcast: i % 100 === 0,
      reactions,
      createdAt,
      updatedAt: createdAt
    });
  }
  await fastBulkInsert(ChatMessage, chatDocs, 'chatmessages');

  // ==========================================
  // 5. NOTIFICATIONS (10,000)
  // ==========================================
  console.log('\n--- 5. Generating Notifications (10,000) ---');
  const notifDocs = [];
  for (let i = 1; i <= TARGET_COUNT; i++) {
    const template = NOTIFICATION_TEMPLATES[i % NOTIFICATION_TEMPLATES.length];
    const createdAt = getRandomDate(6);
    const readUsers = getRandomSubset(userIds, 0, 15);

    notifDocs.push({
      _id: new mongoose.Types.ObjectId(),
      title: `${template.title} [Alert #${i}]`,
      message: `${template.message} Official student advisory reference ID: SW-NOTIF-${i}.`,
      type: template.type,
      priority: template.priority,
      actionUrl: `/notifications`,
      sender: adminUser._id,
      readBy: readUsers,
      createdAt,
      updatedAt: createdAt
    });
  }
  await fastBulkInsert(Notification, notifDocs, 'notifications');

  // ==========================================
  // 6. NEWSLETTER SUBSCRIBERS (10,000)
  // ==========================================
  console.log('\n--- 6. Generating Newsletter Subscribers (10,000) ---');
  const newsletterDocs = [];
  for (let i = 1; i <= TARGET_COUNT; i++) {
    const subscribedAt = getRandomDate(12);

    newsletterDocs.push({
      _id: new mongoose.Types.ObjectId(),
      email: `newsletter_sub_${i}@example.com`,
      subscribedAt,
      confirmed: i % 4 !== 0,
      createdAt: subscribedAt,
      updatedAt: subscribedAt
    });
  }
  await fastBulkInsert(Newsletter, newsletterDocs, 'newsletters');

  // ==========================================
  // 7. CHAT READ STATUSES (10,000)
  // ==========================================
  console.log('\n--- 7. Generating Chat Read Statuses (10,000) ---');
  const readStatusDocs = [];
  for (let i = 0; i < TARGET_COUNT; i++) {
    const uId = userIds[i];
    const lastReadAt = getRandomDate(1);

    readStatusDocs.push({
      _id: new mongoose.Types.ObjectId(),
      user: uId,
      room: 'tea-shop-test',
      lastReadAt,
      createdAt: lastReadAt,
      updatedAt: lastReadAt
    });
  }
  await fastBulkInsert(ChatReadStatus, readStatusDocs, 'chatreadstatuses');

  // ==========================================
  // 8. FILTER WORDS (10,000)
  // ==========================================
  console.log('\n--- 8. Generating Filter Words (10,000) ---');
  const filterDocs = [];
  for (let i = 1; i <= TARGET_COUNT; i++) {
    const category = FILTER_CATEGORIES[i % FILTER_CATEGORIES.length];
    const severity = FILTER_SEVERITIES[i % FILTER_SEVERITIES.length];

    filterDocs.push({
      _id: new mongoose.Types.ObjectId(),
      word: `testfilterword_${i}`,
      category,
      severity,
      createdBy: adminUser._id,
      isActive: i % 10 !== 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  await fastBulkInsert(FilterWord, filterDocs, 'filterwords');

  // ==========================================
  // 9. BLOCKED TAGS (10,000)
  // ==========================================
  console.log('\n--- 9. Generating Blocked Tags (10,000) ---');
  const blockedTagDocs = [];
  for (let i = 1; i <= TARGET_COUNT; i++) {
    blockedTagDocs.push({
      _id: new mongoose.Types.ObjectId(),
      tag: `blockedtag_${i}`,
      createdBy: adminUser._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  await fastBulkInsert(BlockedTag, blockedTagDocs, 'blockedtags');

  // ==========================================
  // FINAL DATABASE AUDIT
  // ==========================================
  const totalElapsed = ((Date.now() - overallStart) / 1000).toFixed(2);
  console.log('\n===============================================================');
  console.log('  FINAL DATABASE AUDIT: DOCUMENT COUNTS PER COLLECTION');
  console.log('===============================================================');

  const collections = [
    { name: 'Users', model: User },
    { name: 'Articles', model: Article },
    { name: 'Comments', model: Comment },
    { name: 'Chat Messages', model: ChatMessage },
    { name: 'Notifications', model: Notification },
    { name: 'Newsletter Subscribers', model: Newsletter },
    { name: 'Chat Read Statuses', model: ChatReadStatus },
    { name: 'Filter Words (Moderation)', model: FilterWord },
    { name: 'Blocked Tags (Moderation)', model: BlockedTag },
  ];

  for (const c of collections) {
    const count = await c.model.countDocuments();
    console.log(`  📊 ${c.name.padEnd(30)} : ${count.toLocaleString()} records`);
  }

  console.log('===============================================================');
  console.log(`⚡ Large-Scale Dataset Population Finished in ${totalElapsed}s!`);
  console.log('🔑 Login Credentials:');
  console.log('   Admin: admin@southernwaves.com / Admin@1234');
  console.log('   Test Users Password: TestPass@1234 (student_1 ... student_10000)');
  console.log('===============================================================');

  process.exit(0);
}

seedLargeScale().catch((err) => {
  console.error('\n❌ Fatal Seeding Error:', err);
  process.exit(1);
});
