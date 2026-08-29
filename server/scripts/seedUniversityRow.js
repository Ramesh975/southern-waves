require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Article = require('../models/Article');

const UNIVERSITY_STORIES = [
  {
    title: 'University Senate Approves Major Academic Overhaul for 2026',
    lead: 'The university governing board approved sweeping changes to credit structures, introducing cross-disciplinary electives and research credits.',
    subCategory: 'Governance',
    tags: ['senate', 'curriculum', 'academics', 'policy'],
    coverImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Central Library Digitisations Project Unveils Century-Old Manuscripts',
    lead: 'Over 5,000 rare manuscripts, colonial gazettes, and early student journals have been digitized and made open-access for students.',
    subCategory: 'Library',
    tags: ['library', 'archives', 'history', 'digitization'],
    coverImage: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Student Union Elections: Record 84% Voter Turnout Reported',
    lead: 'The annual campus union elections saw historic student participation across all six faculties, with progressive welfare at the forefront.',
    subCategory: 'Student Union',
    tags: ['elections', 'student union', 'voting', 'campus voice'],
    coverImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'New Quantum Computing Research Wing Inaugurated at Science Block',
    lead: 'Backed by a $2M alumni research grant, the new physics lab will focus on quantum algorithms and post-silicon micro-architectures.',
    subCategory: 'Research',
    tags: ['quantum', 'science', 'research', 'innovation'],
    coverImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Campus Sustainability Council Launches Zero-Waste Canteen Charter',
    lead: 'Starting next semester, all four central dining halls will shift to compostable packaging and on-campus organic waste recycling.',
    subCategory: 'Sustainability',
    tags: ['green campus', 'sustainability', 'zero waste', 'canteens'],
    coverImage: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Inter-College Dramatic Society Crowned Champions at National Fest',
    lead: 'The varsity drama troupe won Best Production for their bilingual street play addressing mental health stigma in higher education.',
    subCategory: 'Culture',
    tags: ['drama', 'theatre', 'cultural fest', 'arts'],
    coverImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Varsity Athletics Complex Upgraded with Olympic-Standard Track',
    lead: 'The renovated athletic stadium now features synthetic lanes, floodlights for night training, and advanced biometric motion capture.',
    subCategory: 'Sports',
    tags: ['sports', 'athletics', 'stadium', 'varsity'],
    coverImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Dean of Student Welfare Announces Comprehensive Health Insurance Subsidy',
    lead: 'Every undergraduate and postgraduate student will now be covered under a zero-deductible campus health and wellness scheme.',
    subCategory: 'Welfare',
    tags: ['welfare', 'healthcare', 'students', 'insurance'],
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Heritage North Tower Clock Chimes Again After 15-Year Restoration',
    lead: 'Master horologists have restored the historic 1888 mechanical clock tower that overlooks the campus central quadrangle.',
    subCategory: 'Heritage',
    tags: ['heritage', 'architecture', 'history', 'campus life'],
    coverImage: 'https://images.unsplash.com/photo-1562774053-701939374585?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Robotics Team Wins International Autonomous Drone Competition',
    lead: 'Engineering undergraduates outpaced 40 global universities with an autonomous drone designed for rapid wildfire search-and-rescue.',
    subCategory: 'Innovation',
    tags: ['robotics', 'engineering', 'drones', 'awards'],
    coverImage: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'University Hospital Launches Free Mental Wellness Clinic for Students',
    lead: 'Staffed by certified counsellors and clinical psychologists, the walk-in center provides round-the-clock confidential support.',
    subCategory: 'Healthcare',
    tags: ['mental health', 'wellness', 'counselling', 'healthcare'],
    coverImage: 'https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Alumni Endowment Crosses $50 Million Milestone for Scholarships',
    lead: 'The university endowment fund announced 1,200 new full-tuition fellowships for underprivileged rural scholars starting this autumn.',
    subCategory: 'Scholarships',
    tags: ['alumni', 'scholarships', 'endowment', 'admissions'],
    coverImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'University Press Publishes Landmark Anthology on Southern Literature',
    lead: 'Edited by senior literature faculty, the 800-page volume brings together rare translated poetry and prose from over eight decades.',
    subCategory: 'Publications',
    tags: ['literature', 'books', 'publishing', 'humanities'],
    coverImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Fleet of 20 Electric Shuttles Deployed for Zero-Emission Campus Transit',
    lead: 'The university transit service has retired all fossil fuel buses in favor of custom battery-electric perimeter shuttles.',
    subCategory: 'Transport',
    tags: ['transit', 'electric vehicles', 'green campus', 'transport'],
    coverImage: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Annual Hackathon Draws 800 Developers to Solve Climate Challenges',
    lead: 'Over 48 straight hours, student coders developed AI solutions for flood prediction, urban heat mapping, and clean energy dispatch.',
    subCategory: 'Technology',
    tags: ['hackathon', 'coding', 'climate tech', 'software'],
    coverImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Department of Fine Arts Holds Open Studio & Sculpture Exhibition',
    lead: 'Students transformed the visual arts courtyard into a vibrant open-air gallery showcasing stone carvings, installations, and pottery.',
    subCategory: 'Arts',
    tags: ['fine arts', 'sculpture', 'exhibition', 'creativity'],
    coverImage: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Campus Solar Microgrid Now Powers 70% of Daytime Energy Needs',
    lead: 'Rooftop solar arrays across thirty academic buildings were synced with a 2MWh battery storage facility behind the power substation.',
    subCategory: 'Energy',
    tags: ['solar', 'clean energy', 'microgrid', 'infrastructure'],
    coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Hostel Committee Announces Major Room Renovation & Fiber Upgrades',
    lead: 'Senior residential halls will receive refurbished common lounges, modern study pods, and 1Gbps gigabit fiber connections per room.',
    subCategory: 'Hostels',
    tags: ['hostels', 'housing', 'wifi', 'renovations'],
    coverImage: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Philosophy Department Hosts Symposium on Ethics in Artificial General Intelligence',
    lead: 'Distinguished philosophers, legal scholars, and neural network researchers convened for a three-day debate on digital moral agency.',
    subCategory: 'Symposium',
    tags: ['philosophy', 'ethics', 'ai', 'debate'],
    coverImage: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Varsity Swimming Team Breaks Four State Championship Records',
    lead: 'The aquatics squad swept the freestyle relays and 200m individual medley at the Inter-University Games this weekend.',
    subCategory: 'Sports',
    tags: ['swimming', 'records', 'sports', 'aquatics'],
    coverImage: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Botanical Gardens Discovery: Rare Orchid Species Found on Campus Grounds',
    lead: 'Biology researchers identified a previously unrecorded blooming orchid variety flourishing in the secluded medicinal plant sanctuary.',
    subCategory: 'Science',
    tags: ['botany', 'nature', 'discovery', 'biology'],
    coverImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Student Startup Incubator Secures $1.5M Seed Capital from Angel Network',
    lead: 'Five student-founded enterprises focusing on biotech, edtech, and agritech have completed their incubation cycle with institutional backing.',
    subCategory: 'Startups',
    tags: ['startups', 'incubator', 'funding', 'innovation'],
    coverImage: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Placement Office Reports 98% Placement Rate for Engineering Cohort',
    lead: 'Over 200 multinational firms participated in this season’s placement drive, offering an average compensation package increase of 18%.',
    subCategory: 'Placements',
    tags: ['placements', 'careers', 'recruitment', 'engineering'],
    coverImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Foreign Exchange Program Expands to 15 New European & Asian Universities',
    lead: 'Students can now study for one semester abroad with full credit transfer and subsidized accommodation at partner institutions.',
    subCategory: 'Global',
    tags: ['exchange program', 'international', 'study abroad', 'partnerships'],
    coverImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Inter-Departmental Quiz Championship Crowns Economics Department',
    lead: 'After six intense rounds covering world history, science, cinema, and current affairs, the Economics team lifted the Rolling Trophy.',
    subCategory: 'Academics',
    tags: ['quiz', 'competition', 'economics', 'trivia'],
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Campus Radio Station Celebrates 10th Anniversary with Live Concerts',
    lead: 'Student radio DJs, indie campus musicians, and podcast hosts took over the central amphitheater for an all-night broadcast celebration.',
    subCategory: 'Media',
    tags: ['radio', 'broadcasting', 'music', 'student media'],
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Department of Chemistry Patents Bio-Degradable Packaging Material',
    lead: 'Synthesized from agricultural husk residues, the non-toxic polymer degrades completely in soil within twenty-eight days.',
    subCategory: 'Patent',
    tags: ['chemistry', 'patent', 'bioplastics', 'research'],
    coverImage: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'University Debating Society Wins Asian Parliamentary Grand Championship',
    lead: 'The three-member delegation triumphed in Tokyo, defending motions on international trade law and climate debt accountability.',
    subCategory: 'Debate',
    tags: ['debate', 'parliamentary', 'champions', 'international'],
    coverImage: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Annual Photography Contest Showcases Campus Biodiversity & Architecture',
    lead: 'Over 400 student photographs capturing twilight over the library, migratory birds in the lake, and architectural details were juried.',
    subCategory: 'Photography',
    tags: ['photography', 'wildlife', 'architecture', 'exhibition'],
    coverImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Law Faculty Inaugurates Human Rights & Legal Aid Outreach Clinic',
    lead: 'Final-year law students under bar-certified faculty supervision will offer free legal consultations to local marginalized communities.',
    subCategory: 'Law',
    tags: ['law', 'legal aid', 'human rights', 'community'],
    coverImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Meteorology Observatory Records Unprecedented Monsoon Pattern on Campus',
    lead: 'Atmospheric science researchers deployed radar sensors on the observatory tower to study localized urban micro-climates.',
    subCategory: 'Weather',
    tags: ['weather', 'climate', 'science', 'meteorology'],
    coverImage: 'https://images.unsplash.com/photo-1514632595-4944383f2737?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Student Canteen Introduces Nutrition Transparency & Calorie Labelling',
    lead: 'Every meal served across all seven mess facilities now displays verified macro-nutritional counts, allergen tags, and dietary origins.',
    subCategory: 'Food',
    tags: ['nutrition', 'canteen', 'health', 'food'],
    coverImage: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'University Film Club Screens Retrospective of Classic 1970s World Cinema',
    lead: 'Curated by the cinema studies department, the week-long retrospective features 35mm archival prints and post-screening director talks.',
    subCategory: 'Cinema',
    tags: ['cinema', 'film club', 'screening', 'culture'],
    coverImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Department of Archaeology Discovers Ancient Terracotta Kilns Near Riverbank',
    lead: 'Fieldwork students uncovered early medieval kiln structures, beads, and iron slag providing fresh insights into regional trade.',
    subCategory: 'Archaeology',
    tags: ['archaeology', 'discovery', 'excavation', 'history'],
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Campus Blood Donation Camp Collects Over 600 Units for Regional Hospitals',
    lead: 'Organized jointly by the National Service Scheme and Medical College, students turned out in massive numbers throughout the weekend.',
    subCategory: 'Service',
    tags: ['blood donation', 'nss', 'community', 'health'],
    coverImage: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Physics Department Unveils Sub-Millimeter Telescopic Array on Observatory Hill',
    lead: 'The new radio astronomy observatory will allow postgraduates to map molecular gas clouds across the Milky Way galactic plane.',
    subCategory: 'Astronomy',
    tags: ['astronomy', 'telescope', 'physics', 'observatory'],
    coverImage: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Department of Sociology Releases Comprehensive Study on Rural Youth Employment',
    lead: 'Based on surveys of 4,000 households, the policy whitepaper has been submitted to the state development commission.',
    subCategory: 'Sociology',
    tags: ['sociology', 'research', 'employment', 'policy'],
    coverImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Annual Classical Music Festival Features Maestros & Student Prodigies',
    lead: 'The three-day festival held at the historic open-air pavilion attracted music aficionados from across the subcontinent.',
    subCategory: 'Music',
    tags: ['music', 'classical', 'arts', 'festival'],
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'University Signs Agreement with Space Agency for Micro-Satellite Mission',
    lead: 'Undergraduate aerospace students will build, test, and operate a 3U CubeSat payload scheduled for orbit launch next winter.',
    subCategory: 'Aerospace',
    tags: ['space', 'cubesat', 'aerospace', 'satellite'],
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&auto=format&fit=crop&q=60'
  },
  {
    title: 'Campus Green Belt Designated as Protected Urban Wildlife Sanctuary',
    lead: 'The 120-acre forest corridor harboring over 90 species of birds and indigenous flora has received permanent statutory protection.',
    subCategory: 'Wildlife',
    tags: ['wildlife', 'conservation', 'birds', 'green campus'],
    coverImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&auto=format&fit=crop&q=60'
  }
];

const seedUniversityRow = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB for University Row Seeding...');

    // Find an admin/editor author to associate articles with
    let author = await User.findOne({ role: { $in: ['admin', 'editor', 'writer'] } });
    if (!author) {
      author = await User.findOne({});
    }

    if (!author) {
      console.error('No users found to set as article author. Please create a user first.');
      process.exit(1);
    }

    console.log(`Using Author: ${author.name} (${author._id})`);

    // Remove existing university-row articles to avoid duplicates if re-running
    await Article.deleteMany({ category: 'university-row' });
    console.log('Cleared existing University Row articles.');

    const articlesToInsert = UNIVERSITY_STORIES.map((story, i) => {
      const publishedDate = new Date(Date.now() - (40 - i) * 6 * 60 * 60 * 1000);
      return {
        title: story.title,
        slug: story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now().toString(36)}-${i}`,
        lead: story.lead,
        body: `<p>${story.lead}</p><p>The university administration and department representatives noted that this development marks a milestone for our campus community. Faculty members, researchers, and student councils have contributed extensively over the past semester to bring this initiative to fruition.</p><p>Further town halls and detailed follow-up workshops are scheduled across respective academic blocks throughout the coming weeks. All enrolled students and faculty are invited to participate actively in shaping ongoing campus developments.</p>`,
        category: 'university-row',
        categories: ['university-row'],
        subCategory: story.subCategory,
        coverImage: story.coverImage,
        tags: story.tags,
        author: author._id,
        status: 'published',
        publishedAt: publishedDate,
        viewsCount: Math.floor(Math.random() * 450) + 50,
        likesCount: Math.floor(Math.random() * 80) + 10,
        isFeatured: i === 0,
        isTrending: i < 5,
        isBreaking: i === 1,
      };
    });

    const inserted = await Article.insertMany(articlesToInsert);
    console.log(`Successfully seeded ${inserted.length} University Row news articles!`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding University Row articles:', err);
    process.exit(1);
  }
};

seedUniversityRow();
