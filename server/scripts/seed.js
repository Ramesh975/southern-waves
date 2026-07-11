require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Article = require('../models/Article');
const Comment = require('../models/Comment');

const rawArticles = [
  // ─── NEWS (17 ARTICLES) ────────────────────────────────────────────
  {
    title: 'University Fee Hike Sparks Campus Protests',
    lead: 'Students across three departments staged a walkout on Monday after the administration announced a 40% fee increase for the upcoming academic year.',
    category: 'news',
    subCategory: 'Campus',
    tags: ['fee hike', 'protest', 'campus', 'student rights']
  },
  {
    title: 'Central Library Extends Hours to 24/7 for Finals',
    lead: 'In response to a student union petition, the administration has announced that the main library will remain open 24 hours a day during final exams.',
    category: 'news',
    subCategory: 'Infrastructure',
    tags: ['library', 'exams', 'campus life']
  },
  {
    title: 'Student Council Proposes Green Campus Initiative',
    lead: 'A new proposal aims to eliminate single-use plastics from campus canteens and install solar-powered charging stations across common areas.',
    category: 'news',
    subCategory: 'Initiative',
    tags: ['green campus', 'sustainability', 'student council']
  },
  {
    title: 'New AI Labs Inaugurated in Engineering Block',
    lead: 'The university has opened a state-of-the-art artificial intelligence and robotics lab, funded by a major tech alumnus partnership.',
    category: 'news',
    subCategory: 'Academics',
    tags: ['ai', 'robotics', 'engineering', 'innovation']
  },
  {
    title: 'Annual Sports Meet: Department of Physics Takes Gold',
    lead: 'The track and field events concluded with a stunning victory for the Physics department, securing the overall championship trophy.',
    category: 'news',
    subCategory: 'Sports',
    tags: ['sports meet', 'athletics', 'physics']
  },
  {
    title: 'WiFi Connectivity Issues Plaguing Hostels',
    lead: 'Students in the senior residential blocks report persistent internet outages, prompting the IT department to promise a full network overhaul.',
    category: 'news',
    subCategory: 'Hostel',
    tags: ['wifi', 'internet', 'student housing']
  },
  {
    title: 'Placement Drive: Record Packages Offered by Tech Giants',
    lead: "This year's campus recruitment drive has seen an unprecedented 25% increase in job offers, with top software firms leading the hiring.",
    category: 'news',
    subCategory: 'Placements',
    tags: ['placements', 'careers', 'recruitment']
  },
  {
    title: 'Campus Elections: Nominations Open Next Monday',
    lead: 'The election commission has released the schedule for the student government elections, with campaigning set to begin next week.',
    category: 'news',
    subCategory: 'Politics',
    tags: ['elections', 'student union', 'democracy']
  },
  {
    title: 'New Health and Wellness Center Opened for Students',
    lead: 'A dedicated health center offering free medical checkups, counseling, and first aid has been inaugurated near the sports complex.',
    category: 'news',
    subCategory: 'Health',
    tags: ['health', 'wellness', 'mental health']
  },
  {
    title: 'Canteen Food Quality Improves After Committee Review',
    lead: 'A joint inspection team of students and faculty has led to a major vendor change and upgraded sanitation standards in the central mess.',
    category: 'news',
    subCategory: 'Campus',
    tags: ['canteen', 'food', 'hygiene']
  },
  {
    title: 'Student Startups Receive Seed Funding from Alumnae',
    lead: 'Three student-led technology and social ventures have been awarded research grants of 5 lakhs each under the university incubation program.',
    category: 'news',
    subCategory: 'Startups',
    tags: ['startup', 'entrepreneurship', 'funding']
  },
  {
    title: 'Transportation Service Added for Off-Campus Hostels',
    lead: 'Two new shuttle buses will run hourly between the off-campus student housing blocks and the main campus starting next semester.',
    category: 'news',
    subCategory: 'Services',
    tags: ['shuttle', 'hostel', 'transport']
  },
  {
    title: 'Anti-Ragging Committee Conducts Orientation Program',
    lead: 'Freshmen were briefed on their safety rights and grievance procedures during the annual orientation seminar held today.',
    category: 'news',
    subCategory: 'Safety',
    tags: ['anti-ragging', 'freshmen', 'safety']
  },
  {
    title: 'Science Exhibition Showcases Innovative Student Projects',
    lead: 'From eco-friendly batteries to smart crop-monitoring drones, the annual science fair highlighted student-designed sustainability projects.',
    category: 'news',
    subCategory: 'Exhibition',
    tags: ['science fair', 'innovation', 'engineering']
  },
  {
    title: 'University Launches Mental Health Support Helpline',
    lead: 'A confidential 24/7 hotline has been launched to provide immediate psychological assistance and stress counseling to students.',
    category: 'news',
    subCategory: 'Support',
    tags: ['mental health', 'helpline', 'student support']
  },
  {
    title: 'Hostel Curfew Hours Relaxed After Student Delegation Meets Dean',
    lead: 'The hostel curfew has been officially moved from 9 PM to 11 PM following successful talks between student representatives and administration.',
    category: 'news',
    subCategory: 'Hostel',
    tags: ['curfew', 'hostel life', 'student representation']
  },
  {
    title: 'Renovation Work Begins on Historic Arts Block Auditorium',
    lead: 'The 80-year-old heritage building is set to undergo a structural upgrade and acoustic redesign without altering its traditional aesthetic.',
    category: 'news',
    subCategory: 'Infrastructure',
    tags: ['renovation', 'heritage', 'campus history']
  },

  // ─── EDITORIAL (17 ARTICLES) ────────────────────────────────────────
  {
    title: 'The Silence We Speak: Language Politics in Tamil Nadu Universities',
    lead: 'An analysis of how language policies in state universities reflect deeper socio-political tensions and their impact on students from rural backgrounds.',
    category: 'editorial',
    tags: ['language', 'education', 'policy', 'editorial']
  },
  {
    title: 'Mental Health in the Pressure Cooker of Tech Placements',
    lead: 'Examining the toxic culture of comparative success during placement season and why universities must prioritize student well-being over metrics.',
    category: 'editorial',
    tags: ['mental health', 'placements', 'academic stress']
  },
  {
    title: 'The Erosion of Student Democracy: Why Campus Elections Matter',
    lead: 'A critical look at the growing administrative restrictions on student activism and the importance of preserving democratic spaces.',
    category: 'editorial',
    tags: ['elections', 'student rights', 'activism']
  },
  {
    title: 'Beyond the Grade: The Flaws of the Cumulative GPA System',
    lead: 'How numerical grading restricts creative risk-taking in academia and the case for project-based qualitative assessments.',
    category: 'editorial',
    tags: ['gpa', 'grading system', 'academic reform']
  },
  {
    title: 'Digital Divide: The Hidden Exclusions of Paperless Classes',
    lead: 'While online submissions and digital learning offer convenience, they build barriers for students with limited access to devices.',
    category: 'editorial',
    tags: ['digital divide', 'equity', 'education']
  },
  {
    title: 'The Changing Face of Campus Journalism',
    lead: 'How digital mediums are democratizing university reporting while introducing challenges of verification and media independence.',
    category: 'editorial',
    tags: ['journalism', 'media', 'campus press']
  },
  {
    title: 'Unpaid Internships: The Gatekeeping of Student Labor',
    lead: 'Exploring how work-experience requirements favor wealthy students and the ethical need for mandatory compensation.',
    category: 'editorial',
    tags: ['internships', 'unpaid labor', 'ethics']
  },
  {
    title: 'Reimagining Higher Education in the Era of Generative AI',
    lead: 'Rather than banning artificial intelligence tools, universities must redesign curricula to foster critical thinking and AI literacy.',
    category: 'editorial',
    tags: ['ai', 'generative ai', 'pedagogy']
  },
  {
    title: 'Gender Safety on Campus: Beyond CCTV Cameras',
    lead: 'True safety requires addressing systemic patriarchal attitudes and creating robust gender sensitization programs, not surveillance.',
    category: 'editorial',
    tags: ['safety', 'gender equality', 'surveillance']
  },
  {
    title: 'The Importance of Humanities in a Tech-Dominated World',
    lead: 'Why neglecting history, literature, and philosophy in engineering curricula harms our ability to solve ethical global problems.',
    category: 'editorial',
    tags: ['humanities', 'technology', 'ethics']
  },
  {
    title: 'Student Debt: The Rising Cost of Academic Ambition',
    lead: 'Analyzing the financial burden of higher education and why state subsidies are vital for securing equal opportunity.',
    category: 'editorial',
    tags: ['student debt', 'tuition fees', 'economics']
  },
  {
    title: 'The Myth of Meritocracy in Standardized Testing',
    lead: 'How coaching centers and economic privileges dictate entrance scores, rendering the testing system deeply unequal.',
    category: 'editorial',
    tags: ['testing', 'meritocracy', 'admissions']
  },
  {
    title: 'Hostel Curfews: Protection or Patronizing Surveillance?',
    lead: 'An analysis of how restrictive residential rules reinforce outdated gender codes under the pretext of safety.',
    category: 'editorial',
    tags: ['hostel', 'curfew', 'gender bias']
  },
  {
    title: 'Climate Action: Why Universities Must Divest from Fossil Fuels',
    lead: 'Higher education institutions must align their financial investments with the science they teach in their lecture halls.',
    category: 'editorial',
    tags: ['climate change', 'divestment', 'sustainability']
  },
  {
    title: 'The Crisis of Research Funding in Public Universities',
    lead: 'How dwindling grants are forcing researchers to seek corporate sponsorships, compromising the independence of science.',
    category: 'editorial',
    tags: ['research', 'funding', 'public education']
  },
  {
    title: 'Rethinking the Syllabus: The Need for Diverse Perspectives',
    lead: 'Why our academic curriculums remain Eurocentric and how incorporating indigenous knowledge can enrich student learning.',
    category: 'editorial',
    tags: ['syllabus', 'decolonization', 'diversity']
  },
  {
    title: 'The Power of Student Solidarity: Lessons from History',
    lead: "Reflecting on how coordinated student movements historically achieved massive social changes and what today's organizers can learn.",
    category: 'editorial',
    tags: ['history', 'solidarity', 'student movement']
  },

  // ─── FEATURES (17 ARTICLES) ─────────────────────────────────────────
  {
    title: "Review: 'Viduthalai' Redefines Tamil Political Cinema",
    lead: "Vetri Maaran's two-part epic challenges comfortable narratives and demands we sit with the complexity of historical injustice.",
    category: 'features',
    subCategory: 'Film Review',
    tags: ['film review', 'viduthalai', 'tamil cinema']
  },
  {
    title: "Book Review: 'The Ministry for the Future' by Kim Stanley Robinson",
    lead: 'A sprawling, urgent, and ultimately hopeful novel about climate catastrophe and the institutions trying to prevent it.',
    category: 'features',
    subCategory: 'Book Review',
    tags: ['book review', 'climate fiction', 'science fiction']
  },
  {
    title: "The Chai-Stall Philosopher: An Interview with Anna of Muthu's Tea Shop",
    lead: "We sit down with the campus's most famous tea vendor, who has witnessed four decades of student generations and movements.",
    category: 'features',
    subCategory: 'Profile',
    tags: ['interview', 'campus culture', 'tea shop']
  },
  {
    title: 'The Art of Dorm Room Cooking: Survival Recipes for Students',
    lead: 'From electric kettle noodles to iron-box toasted sandwiches, here are creative hacks for cooking on a budget.',
    category: 'features',
    subCategory: 'Lifestyle',
    tags: ['cooking', 'hostel life', 'student budget']
  },
  {
    title: 'Exploring the Secret Roofs and Hidden Courtyards of Campus',
    lead: 'A tour of the lesser-known spots on campus where students go to find peace, study, or play acoustic music.',
    category: 'features',
    subCategory: 'Exploration',
    tags: ['architecture', 'campus exploration', 'music']
  },
  {
    title: "Review: 'Asuran' and the Language of Land Rights",
    lead: 'An in-depth look at how the film depicts Dalit land struggle and why it remains a milestone in Tamil storytelling.',
    category: 'features',
    subCategory: 'Film Analysis',
    tags: ['film review', 'asuran', 'land rights', 'tamil cinema']
  },
  {
    title: 'The Rise of Thrill-Seeking: Why Bouldering is Catching On',
    lead: 'Student rock climbers discuss the mental focus and physical challenges of the growing bouldering club on campus.',
    category: 'features',
    subCategory: 'Sports',
    tags: ['climbing', 'bouldering', 'sports']
  },
  {
    title: 'A Guide to the Best Second-Hand Bookstores in Chennai',
    lead: "From Moore Market to Pycrofts Road, we map out the ultimate spots for finding cheap academic texts and classic novels.",
    category: 'features',
    subCategory: 'Guide',
    tags: ['books', 'thrifting', 'chennai guide']
  },
  {
    title: "The Student Musicians Balancing Ragas with Rock N' Roll",
    lead: "A profile of 'Waves of Rhythm,' a student band fusing classical Carnatic music with progressive heavy metal.",
    category: 'features',
    subCategory: 'Music Profile',
    tags: ['band', 'carnatic rock', 'music']
  },
  {
    title: "Review: 'The Great Indian Kitchen' and the Labor of Love",
    lead: "An analysis of the Malayalam film's scathing indictment of domestic patriarchy and its resonance with modern couples.",
    category: 'features',
    subCategory: 'Film Review',
    tags: ['film review', 'malayalam cinema', 'patriarchy']
  },
  {
    title: 'From Campus to Startup: The Journey of Three Tech Graduates',
    lead: 'How a software project developed in a third-year lab turned into a successful logistics venture serving local businesses.',
    category: 'features',
    subCategory: 'Success Story',
    tags: ['startup', 'tech', 'career journey']
  },
  {
    title: 'The History and Future of the Campus Tree Canopy',
    lead: 'Exploring the diverse botanical species on campus, some of which were planted during the colonial era.',
    category: 'features',
    subCategory: 'Nature',
    tags: ['trees', 'botany', 'conservation']
  },
  {
    title: "Review: Arundhati Roy's 'The Ministry of Utmost Happiness'",
    lead: "A review of the author's second novel, tracing its complex tapestry of marginalized voices and political struggles.",
    category: 'features',
    subCategory: 'Book Review',
    tags: ['book review', 'arundhati roy', 'literature']
  },
  {
    title: 'The Night-Writers: Life inside the Student Press Room',
    lead: 'An inside look at the late-night edits, layout struggles, and coffee-fueled debates that bring our issues to life.',
    category: 'features',
    subCategory: 'Behind the Scenes',
    tags: ['journalism', 'student press', 'layout']
  },
  {
    title: "Review: 'Kadaisi Vivasayi' and the Eulogy of Agriculture",
    lead: "Why M. Manikandan's quiet film about an elderly farmer is a profound statement on ecology, law, and community.",
    category: 'features',
    subCategory: 'Film Review',
    tags: ['film review', 'kadaisi vivasayi', 'agriculture']
  },
  {
    title: 'Mental Health Hacks: How to Deal with Exam Anxiety',
    lead: 'Psychological tips, breathing exercises, and study routines compiled from university counselors to help you survive finals.',
    category: 'features',
    subCategory: 'Wellness',
    tags: ['wellness', 'exams', 'mental health']
  },
  {
    title: 'The Silent Theatre: The Art and Struggle of Campus Mime Artists',
    lead: 'A feature on the university mime club, expressing powerful social commentaries using only expression and gesture.',
    category: 'features',
    subCategory: 'Art Feature',
    tags: ['theatre', 'mime', 'art']
  },

  // ─── KYP (KNOW YOUR PAST - 17 ARTICLES) ─────────────────────────────
  {
    title: 'The Madurai Anti-Hindi Agitation of 1965: A Forgotten Fire',
    lead: 'Sixty years on, the sacrifices of students who laid down their lives to protect the Tamil language deserve to be remembered.',
    category: 'kyp',
    tags: ['history', 'anti-hindi', 'tamil rights', '1965']
  },
  {
    title: 'The Legacy of the 1942 Quit India Movement on Campus',
    lead: 'How the student body boycott of classes played a pivotal role in mobilizing civil disobedience in the Madras Presidency.',
    category: 'kyp',
    tags: ['history', 'quit india', 'independence']
  },
  {
    title: 'The Birth of the Student Union: A History of Representation',
    lead: 'Tracing the origins of our student government back to the democratic demands of the early 1950s.',
    category: 'kyp',
    tags: ['history', 'student union', 'democracy']
  },
  {
    title: 'The Madras Plague of 1904: How the University Coped',
    lead: 'Looking back at the historical documents detailing classes being suspended and campus buildings serving as temporary wards.',
    category: 'kyp',
    tags: ['history', 'plague', 'epidemic']
  },
  {
    title: 'The Centenary of the Historic Arts Block Building',
    lead: 'Exploring the Indo-Saracenic architecture and the stories of prominent leaders who walked these corridors a century ago.',
    category: 'kyp',
    tags: ['history', 'architecture', 'heritage']
  },
  {
    title: 'When Subhas Chandra Bose Addressed the Students of Madras',
    lead: "Reconstructing the electric atmosphere of Netaji's 1939 speech at the university grounds urging youth to join the freedom fight.",
    category: 'kyp',
    tags: ['history', 'netaji', 'madras presidency']
  },
  {
    title: 'The 1974 Student Railway Strike: The Day the Wheels Stopped',
    lead: 'How local student organizations coordinated with labor unions to block railway lines, bringing the city to a halt.',
    category: 'kyp',
    tags: ['history', 'strike', 'labor', '1974']
  },
  {
    title: "The Evolution of Women's Education in Tamil Nadu",
    lead: 'Honoring the first batch of female graduates in 1884 who broke barriers to enter higher education in the south.',
    category: 'kyp',
    tags: ['history', 'women education', 'equality']
  },
  {
    title: 'The Student-Led Relief Efforts During the 2015 Chennai Floods',
    lead: 'Remembering how the campus transformed into a massive relief hub, distributing food and medical aid to affected citizens.',
    category: 'kyp',
    tags: ['history', 'chennai floods', 'disaster relief']
  },
  {
    title: 'The Foundation of the Madras Presidency College in 1840',
    lead: 'Uncovering the archival documents that led to the establishment of one of the oldest institutions of higher education in South Asia.',
    category: 'kyp',
    tags: ['history', 'education history', 'presidency']
  },
  {
    title: 'The Anti-Emergency Protests of 1975: Student Voices Under Lock',
    lead: 'A look at the underground newsletters published by students during the Emergency and their fight against censorship.',
    category: 'kyp',
    tags: ['history', 'emergency', 'censorship', 'protest']
  },
  {
    title: "The Legacy of Poet Subramania Bharati's Visit to Campus",
    lead: "How the revolutionary poet's recitation of his nationalist verses inspired a generation of student writers in 1918.",
    category: 'kyp',
    tags: ['history', 'bharatiyar', 'poetry', 'patriotism']
  },
  {
    title: 'The 1989 Protest for Reservation Rights in Education',
    lead: 'A historical analysis of the student-led advocacy that helped secure social justice and equal representation in state universities.',
    category: 'kyp',
    tags: ['history', 'reservation', 'social justice']
  },
  {
    title: 'How the University Contributed to the World War I War Effort',
    lead: "From fundraising drives to student medical corps deployments, we trace the university's involvement in the global conflict.",
    category: 'kyp',
    tags: ['history', 'world war i', 'archives']
  },
  {
    title: 'The Great Student Convocation Boycott of 1931',
    lead: 'An account of how students refused to accept their degrees from the British Governor in protest against the arrest of Mahatma Gandhi.',
    category: 'kyp',
    tags: ['history', 'civil disobedience', 'gandhi']
  },
  {
    title: "The Archival History of our University's Science Labs",
    lead: "Celebrating the pioneers of scientific research in Madras, including Nobel Laureate C.V. Raman's historic visits to our labs.",
    category: 'kyp',
    tags: ['history', 'science history', 'c v raman']
  },
  {
    title: 'The 1968 State Student Law Reforms: Securing Academic Freedom',
    lead: 'How student protests led to the drafting of the University Act, granting departments greater autonomy and representation.',
    category: 'kyp',
    tags: ['history', 'education law', 'student rights']
  },

  // ─── TEA SHOP (16 ARTICLES) ────────────────────────────────────────
  {
    title: 'Exam Timetable Change: Official Circular',
    lead: 'The Controller of Examinations has revised the semester examination schedule. All students are advised to note the updated dates.',
    category: 'tea-shop',
    subCategory: 'Official Circular',
    tags: ['exams', 'schedule', 'official']
  },
  {
    title: "Overheard at Muthu's: The Bonda and Politics Connection",
    lead: "A humorous take on the heated political debates that take place over hot bondas and tea at the university's favorite corner.",
    category: 'tea-shop',
    subCategory: 'Student Voice',
    tags: ['tea shop', 'humor', 'politics']
  },
  {
    title: 'Hostel Wi-Fi Upgraded: Login Guidelines',
    lead: 'The IT department has completed the router installation. Here is how you can register your MAC address for high-speed access.',
    category: 'tea-shop',
    subCategory: 'Announcement',
    tags: ['wifi', 'hostel', 'official']
  },
  {
    title: 'The Student Who Lost Their Lab Coat: A Lost-and-Found Saga',
    lead: 'An entertaining account of a three-week chase across four departments to recover a biochemistry lab coat containing crucial notes.',
    category: 'tea-shop',
    subCategory: 'Chitter Chatter',
    tags: ['lost and found', 'humor', 'chemistry']
  },
  {
    title: 'Cultural Fest Pass Registrations Open Today',
    lead: 'Students can now register for free entry passes using their registration numbers. Check the schedule inside.',
    category: 'tea-shop',
    subCategory: 'Official Notice',
    tags: ['cultural fest', 'registrations', 'official']
  },
  {
    title: 'A Defense of the 3 PM Chai Break',
    lead: 'Why stepping away from the compiler and the journal to drink filter coffee is essential for academic sanity.',
    category: 'tea-shop',
    subCategory: 'Opinion',
    tags: ['coffee', 'tea shop', 'mental health']
  },
  {
    title: 'Lost Keyring Near Sports Ground',
    lead: 'A set of four keys with a wooden guitar keychain was lost yesterday near the football field. Please return to the guard office.',
    category: 'tea-shop',
    subCategory: 'Lost & Found',
    tags: ['lost', 'keys', 'campus']
  },
  {
    title: 'Bus Pass Renewal Deadline Extended',
    lead: 'The transport officer has extended the bus pass concession renewal date by one week. No late fees apply.',
    category: 'tea-shop',
    subCategory: 'Announcement',
    tags: ['bus pass', 'transport', 'official']
  },
  {
    title: 'Circle Chatter: The Best Spot for Samosas Near Arts Block',
    lead: 'A community review comparing the hot samosas at the main canteen with the crispy ones sold by the cycle-vendor.',
    category: 'tea-shop',
    subCategory: 'Student Review',
    tags: ['samosa', 'food', 'snacks']
  },
  {
    title: 'Gymnasium Equipment Upgraded',
    lead: 'Two new treadmills and a multi-station weight rack have been installed. The gym will be open from 6 AM to 9 AM daily.',
    category: 'tea-shop',
    subCategory: 'Official Notice',
    tags: ['gym', 'fitness', 'official']
  },
  {
    title: 'Opinion: Why We Need More Benches in the Courtyard',
    lead: 'A student argues that adding simple seating under tree canopies would foster collaborative studies and social bonds.',
    category: 'tea-shop',
    subCategory: 'Student Voice',
    tags: ['infrastructure', 'campus life', 'opinion']
  },
  {
    title: 'Blood Donation Camp Scheduled for Friday',
    lead: 'The Youth Red Cross is organizing a voluntary blood donation drive in the university auditorium. Volunteers get certificates.',
    category: 'tea-shop',
    subCategory: 'Announcement',
    tags: ['blood donation', 'volunteer', 'health']
  },
  {
    title: 'Overheard: The Legend of the Ghost in the Biotech Lab',
    lead: 'Exploring the folklore of the first-floor lab that supposedly smells like coffee at midnight, despite being locked.',
    category: 'tea-shop',
    subCategory: 'Chitter Chatter',
    tags: ['ghost story', 'folklore', 'biotech']
  },
  {
    title: 'Library Book Return Grace Period Announced',
    lead: 'To assist students during the exams, the library is waiving overdue fines for books returned before the end of the month.',
    category: 'tea-shop',
    subCategory: 'Official Notice',
    tags: ['library', 'fines', 'official']
  },
  {
    title: 'A Review of the Campus cats: Who is the Real King?',
    lead: 'A tongue-in-cheek guide ranking the popular campus felines based on friendliness, size, and hunting skills.',
    category: 'tea-shop',
    subCategory: 'Humor',
    tags: ['cats', 'campus life', 'humor']
  },
  {
    title: 'Library WiFi Access: Network Updates',
    lead: 'The library wifi network has been upgraded to 100Mbps. Access credentials have been updated. Details inside.',
    category: 'tea-shop',
    subCategory: 'Official Announcement',
    tags: ['library', 'wifi', 'official']
  },

  // ─── PICTURES SPEAK (16 ARTICLES) ──────────────────────────────────
  {
    title: "Eyes of the Market: Chennai's Koyambedu in Black and White",
    lead: "A photographic essay exploring the daily lives, labor, and quiet dignity of those who keep the city's largest market alive.",
    category: 'pictures-speak',
    tags: ['photography', 'koyambedu', 'labor', 'black and white']
  },
  {
    title: 'Shadows of the Corridor: The Art of Campus Pillars',
    lead: 'Capturing the interplay of sunlight and architectural shadows in the historic corridors of the Arts Block.',
    category: 'pictures-speak',
    tags: ['photography', 'architecture', 'shadows']
  },
  {
    title: 'The Monsoon Waves: Campus in the Rain',
    lead: 'A photographic capture of paper boats, wet pathways, and students sharing single umbrellas during a sudden downpour.',
    category: 'pictures-speak',
    tags: ['photography', 'monsoon', 'rain']
  },
  {
    title: 'Faces of Labour: The Builders of our New Blocks',
    lead: 'A series of portraits celebrating the brickmasons and workers who construct our new academic buildings.',
    category: 'pictures-speak',
    tags: ['photography', 'labor', 'portraits']
  },
  {
    title: "The Midnight Chai: Chennai's Nightlife in Frames",
    lead: 'Capturing the steam rising from local tea stalls and the student night-owls gathering under the yellow streetlamps.',
    category: 'pictures-speak',
    tags: ['photography', 'nightlife', 'tea shop']
  },
  {
    title: 'Silent Corners: The Abandoned Study Halls',
    lead: 'A visual exploration of the old library rooms, showing dust motes, old bookshelves, and fading light.',
    category: 'pictures-speak',
    tags: ['photography', 'decay', 'books']
  },
  {
    title: 'The Colors of Culturals: Milange in Full Bloom',
    lead: 'Vibrant action shots capturing the energy of folk dancers, heavy metal guitarists, and emotional theatre acts.',
    category: 'pictures-speak',
    tags: ['photography', 'cultural fest', 'milange']
  },
  {
    title: 'Birds of the Canopy: Our Flying Campus Residents',
    lead: 'A telephoto photography feature documenting the diverse birds that inhabit our old campus trees.',
    category: 'pictures-speak',
    tags: ['photography', 'birds', 'wildlife']
  },
  {
    title: 'The Edge of the Field: Emotions of the Sports Meet',
    lead: 'A photo essay capturing the joy of victory and the quiet heartbreak of defeat at the track finish line.',
    category: 'pictures-speak',
    tags: ['photography', 'sports', 'athletics']
  },
  {
    title: 'Dawn over Cooum: A City Waking Up',
    lead: 'Stunning early morning landscape frames showing the mist rising over the river, contrasting with city skyscrapers.',
    category: 'pictures-speak',
    tags: ['photography', 'dawn', 'chennai']
  },
  {
    title: 'The Chemistry Lab: Patterns in Glass',
    lead: 'Macro photography capturing the colorful chemical reactions and intricate glass apparatuses in student labs.',
    category: 'pictures-speak',
    tags: ['photography', 'science', 'macro']
  },
  {
    title: 'Street Art: The Graffiti of the Student Ghetto',
    lead: 'Documenting the expressive murals and political stencil art on the walls surrounding off-campus student housing.',
    category: 'pictures-speak',
    tags: ['photography', 'graffiti', 'street art']
  },
  {
    title: "The Bookworm's Nest: Portraits of Second-Hand Readers",
    lead: "Portraits of students lost in reading, taken in the narrow alleys of Chennai's second-hand book markets.",
    category: 'pictures-speak',
    tags: ['photography', 'reading', 'books']
  },
  {
    title: 'Cat of the Pillars: The Resident Mascot',
    lead: 'A photo feature capturing the lazy life of \'Cinnabon\', the ginger cat that sleeps on the library registry desk.',
    category: 'pictures-speak',
    tags: ['photography', 'cats', 'pets']
  },
  {
    title: 'Fading Textures: The Old Printing Press of Madras',
    lead: 'A photographic tour of an old letterpress workshop in Georgetown, capturing the metal types and ink scents.',
    category: 'pictures-speak',
    tags: ['photography', 'printing', 'history']
  },
  {
    title: 'Under the Banyan: The Evening Debates',
    lead: 'A series of silhouette shots showing student groups debating under the massive banyan tree at sunset.',
    category: 'pictures-speak',
    tags: ['photography', 'silhouette', 'debate']
  }
];

const getCoverImage = (category, index) => {
  const images = {
    news: [
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800',
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800',
      'https://images.unsplash.com/photo-1525921429624-479b6c294a40?w=800'
    ],
    editorial: [
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
      'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=800',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800',
      'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800'
    ],
    features: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800'
    ],
    kyp: [
      'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800',
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800',
      'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800',
      'https://images.unsplash.com/photo-1473163928189-364b2c4e1135?w=800'
    ],
    'tea-shop': [
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800',
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800',
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800',
      'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800'
    ],
    'pictures-speak': [
      'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800',
      'https://images.unsplash.com/photo-1501183007986-d0d080b147f9?w=800',
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
      'https://images.unsplash.com/photo-1452784444945-3f422708fe5e?w=800'
    ]
  };
  const list = images[category] || images.news;
  return list[index % list.length];
};

const generateBody = (title, lead, category) => {
  const p1 = `<p>${lead}</p>`;
  const p2 = `<p>This issue has sparked a wider conversation among the student community and faculty members. Many believe that this is a turning point for the campus, highlighting long-standing discussions around resources, representation, and the direction of student life. "We need to ensure that decisions are made with transparency and the active participation of all stakeholders," a student representative remarked.</p>`;
  const p3 = `<p>As the academic semester progresses, observers note that the outcome of these discussions will likely influence policies for years to come. Updates on this developing story will be posted as they become available at the local hubs and official circular boards.</p>`;
  
  if (category === 'pictures-speak') {
    return `${p1}<p>Through these frames, we attempt to capture the unspoken narratives of our daily environment. Every shadow, expression, and contrast tells a story of its own — a quiet testament to the rich tapestry of student life and the city we inhabit.</p><p>Photography allows us to freeze these transient moments, turning the mundane into the memorable. These images serve as both an archive and a prompt for reflection.</p>`;
  }
  
  return `${p1}${p2}${p3}`;
};

const seed = async () => {
  await connectDB();

  // Clean existing data
  await User.deleteMany();
  await Article.deleteMany();
  await Comment.deleteMany();

  console.log('🌱 Seeding database...');

  // Create users
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@southernwaves.com',
    password: 'Admin@1234',
    role: 'admin',
    bio: 'Platform administrator',
  });

  const editor = await User.create({
    name: 'Priya Raghavan',
    email: 'priya@southernwaves.com',
    password: 'Editor@1234',
    role: 'editor',
    bio: 'Senior Editor at Southern Waves',
  });

  const writer1 = await User.create({
    name: 'Karthik Selvam',
    email: 'karthik@southernwaves.com',
    password: 'Student@1234',
    role: 'student',
    bio: 'Student journalist covering campus news',
  });

  const writer2 = await User.create({
    name: 'Deepa Nair',
    email: 'deepa@southernwaves.com',
    password: 'Student@1234',
    role: 'student',
    bio: 'Features and culture writer',
  });

  const authors = [admin._id, editor._id, writer1._id, writer2._id];

  // Map rawArticles to model-compatible objects
  const articlesToCreate = rawArticles.map((raw, idx) => {
    // Determine publishedAt date spread across the last 30 days
    const daysAgo = Math.floor(idx / 3.3); // distribute beautifully
    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - daysAgo);

    // Dynamic author assignment
    const author = authors[idx % authors.length];

    // Cover image
    const coverImage = getCoverImage(raw.category, idx);

    // Body
    const body = generateBody(raw.title, raw.lead, raw.category);

    // Random view count between 200 and 5000
    const views = Math.floor(Math.random() * 4800) + 200;

    // Feature / Trend states (Select first few of each category to showcase)
    const categoryIndex = rawArticles.filter((r, i) => i <= idx && r.category === raw.category).length;
    const isFeatured = categoryIndex === 1; // first one is featured
    const isTrending = categoryIndex <= 2 && idx % 2 === 0; // some are trending
    const isBreaking = categoryIndex === 1 && raw.category === 'news';

    return {
      title: raw.title,
      lead: raw.lead,
      body,
      category: raw.category,
      subCategory: raw.subCategory || '',
      coverImage,
      author,
      tags: raw.tags || [],
      status: 'published',
      views,
      publishedAt,
      isFeatured,
      isTrending,
      isBreaking,
    };
  });

  console.log(`Creating ${articlesToCreate.length} articles...`);
  const createdArticles = await Article.create(articlesToCreate);
  console.log(`Successfully created ${createdArticles.length} articles!`);

  // Create some approved comments
  const commentTextOptions = [
    'This is a critical issue. The administration needs to address student concerns immediately.',
    'Excellent reporting. It is good to see coverage on these campus topics.',
    'A very well-written article, thank you for sharing this perspective.',
    'I agree with the author. More dialogue is needed between departments.',
    'Brilliant coverage! This really highlights what students go through.',
  ];

  const commentsToCreate = [];
  // Add comments to first 15 articles
  for (let i = 0; i < 15; i++) {
    const article = createdArticles[i];
    // Create 1-3 comments per article
    const numComments = Math.floor(Math.random() * 3) + 1;
    for (let c = 0; c < numComments; c++) {
      commentsToCreate.push({
        article: article._id,
        author: authors[(i + c) % authors.length],
        text: commentTextOptions[(i * 3 + c) % commentTextOptions.length],
        isApproved: true,
      });
    }
  }

  await Comment.create(commentsToCreate);
  console.log(`Created ${commentsToCreate.length} comments!`);

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('👤 Admin Login: admin@southernwaves.com / Admin@1234');
  console.log('📝 Editor Login: priya@southernwaves.com / Editor@1234');
  console.log('🎓 Student Login: karthik@southernwaves.com / Student@1234');
  console.log('');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
