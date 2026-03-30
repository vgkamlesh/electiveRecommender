const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const electives = require('./seedElectives');

const app = express();
const PORT = 3000;
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = 'elective_recommender';

app.use(cors());
app.use(express.json());

let db;
let electivesCollection;
let responsesCollection;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  db = client.db(DB_NAME);
  electivesCollection = db.collection('electives');
  responsesCollection = db.collection('responses');

  console.log('MongoDB connected');
}

function getCgpaBand(gpa) {
  if (gpa >= 8.5 && gpa <= 10) return 'good';
  if (gpa >= 7 && gpa < 8.5) return 'average';
  if (gpa >= 5 && gpa < 7) return 'poor';
  return 'very poor';
}

function difficultyScore(gpa, difficulty) {
  const band = getCgpaBand(gpa);

  if (difficulty === 'high') {
    if (band === 'good') return 20;
    if (band === 'average') return 8;
    if (band === 'poor') return -8;
    return -25;
  }

  if (difficulty === 'medium') {
    if (band === 'good') return 15;
    if (band === 'average') return 12;
    if (band === 'poor') return 6;
    return -10;
  }

  if (difficulty === 'low') {
    if (band === 'good') return 10;
    if (band === 'average') return 10;
    if (band === 'poor') return 12;
    return 15;
  }

  return 0;
}

function preferenceScore(preferredDifficulty, courseDifficulty, gpa) {
  if (!preferredDifficulty) return 0;
  if (preferredDifficulty !== courseDifficulty) return 0;

  const band = getCgpaBand(gpa);

  if (preferredDifficulty === 'high') {
    if (band === 'good') return 10;
    if (band === 'average') return 4;
    return 0;
  }

  if (preferredDifficulty === 'medium') {
    if (band === 'good' || band === 'average') return 8;
    if (band === 'poor') return 5;
    return 0;
  }

  if (preferredDifficulty === 'low') {
    return 6;
  }

  return 0;
}

function goalScore(goal, course) {
  if (goal === 'placement') {
    return course.placementValue * 3;
  }

  if (goal === 'higher') {
    return course.higherStudyValue * 3;
  }

  if (goal === 'both') {
    return (course.placementValue + course.higherStudyValue) * 1.5;
  }

  return 0;
}

function interestScore(studentInterests, courseTags) {
  const matched = courseTags.filter(tag => studentInterests.includes(tag));
  return {
    score: matched.length * 6,
    matched
  };
}

function buildReasons(course, goal, gpa, matchedInterests) {
  const reasons = [];
  const warnings = [];
  const band = getCgpaBand(gpa);

  if (matchedInterests.length > 0) {
    reasons.push(`Matches your interests in ${matchedInterests.join(', ')}`);
  }

  if (goal === 'placement' && course.placementValue >= 8) {
    reasons.push('Strongly aligned with placement opportunities');
  }

  if (goal === 'higher' && course.higherStudyValue >= 8) {
    reasons.push('Suitable for higher studies and advanced learning');
  }

  if (goal === 'both' && course.placementValue >= 7 && course.higherStudyValue >= 7) {
    reasons.push('Balances both placement and higher studies well');
  }

  if (band === 'good') {
    if (course.difficulty === 'high') {
      reasons.push('For your CGPA, you can handle this harder course well');
    } else {
      reasons.push('For your CGPA, you can easily ace this course');
    }
  }

  if (band === 'average') {
    if (course.difficulty === 'high') {
      warnings.push('This is a harder course considering your CGPA');
    } else if (course.difficulty === 'medium') {
      reasons.push('This is a manageable choice for your CGPA');
    } else {
      reasons.push('This should be an easier and safer option for your CGPA');
    }
  }

  if (band === 'poor') {
    if (course.difficulty === 'high') {
      warnings.push('This is a harder course considering your CGPA and may be risky');
    } else if (course.difficulty === 'medium') {
      warnings.push('This course is moderately difficult for your CGPA, so consistent effort will be needed');
    } else {
      reasons.push('This is a safer option for your current CGPA');
    }
  }

  if (band === 'very poor') {
    if (course.difficulty === 'high') {
      warnings.push('This is a very difficult course for your current CGPA and is not recommended unless you are ready for a heavy academic load');
    } else if (course.difficulty === 'medium') {
      warnings.push('This course may still be tough for your current CGPA');
    } else {
      reasons.push('This is the safest difficulty level for your current CGPA');
    }
  }

  return { reasons, warnings };
}

function buildOverallWarnings(gpa, interests) {
  const warnings = [];
  const band = getCgpaBand(gpa);

  const choseMl =
    interests.includes('ai') ||
    interests.includes('machine learning') ||
    interests.includes('nlp') ||
    interests.includes('math');

  const choseData = interests.includes('data');

  const choseSecurity =
    interests.includes('security') ||
    interests.includes('privacy');

  if ((band === 'poor' || band === 'very poor') && choseMl) {
    warnings.push('You have a low CGPA, and AI/ML-related electives are usually tougher academically.');
    warnings.push('These subjects often require stronger mathematical and problem-solving skills, so they may be harder to score well in right now.');
  }

  if ((band === 'poor' || band === 'very poor') && choseData) {
    warnings.push('Data-oriented electives can still be manageable, but some may involve statistics and analytical depth that can be challenging with your current CGPA.');
  }

  if ((band === 'poor' || band === 'very poor') && choseSecurity) {
    warnings.push('Cyber security electives can be demanding conceptually and may require steady effort if your CGPA is currently low.');
  }

  return warnings;
}

app.post('/api/seed', async (req, res) => {
  const ip = req.ip;
  if (['12.2.343.3', '43.4.5.4', '192.168.1.20'].includes(ip)) {
    return res.status(403).send('error:(');
  }
  try {
    const count = await electivesCollection.countDocuments();

    if (count > 0) {
      return res.json({ message: 'Electives already seeded' });
    }

    await electivesCollection.insertMany(electives);
    res.json({ message: 'Electives seeded successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to seed electives' });
  }
});

app.post('/api/recommend', async (req, res) => {
  try {
    const { name, gpa, goal, interests, preferredDifficulty } = req.body;

    if (
      !name ||
      typeof gpa !== 'number' ||
      !goal ||
      !Array.isArray(interests) ||
      interests.length === 0
    ) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    const courses = await electivesCollection.find().toArray();

    const recommendations = courses.map(course => {
      const interestResult = interestScore(interests, course.tags);

      const score =
        goalScore(goal, course) +
        interestResult.score +
        difficultyScore(gpa, course.difficulty) +
        preferenceScore(preferredDifficulty, course.difficulty, gpa);

      const detail = buildReasons(course, goal, gpa, interestResult.matched);

      return {
        name: course.name,
        domain: course.domain,
        difficulty: course.difficulty,
        placementValue: course.placementValue,
        higherStudyValue: course.higherStudyValue,
        description: course.description,
        score,
        reasons: detail.reasons || [],
        warnings: detail.warnings || []
      };
    });

    recommendations.sort((a, b) => b.score - a.score);

    const topRecommendations = recommendations.slice(0, 5);
    const overallWarnings = buildOverallWarnings(gpa, interests);

    const responseDoc = {
      student: {
        name,
        gpa,
        goal,
        interests,
        preferredDifficulty
      },
      recommendations: topRecommendations,
      overallWarnings,
      createdAt: new Date().toISOString()
    };

    const result = await responsesCollection.insertOne(responseDoc);

    res.json({
      responseId: result.insertedId.toString(),
      ...responseDoc
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate recommendation' });
  }
});

app.get('/api/recommendation/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const docs = await responsesCollection.aggregate([
      {
        $match: {
          _id: new ObjectId(id)
        }
      },
      {
        $project: {
          _id: 1,
          student: 1,
          recommendations: 1,
          overallWarnings: 1,
          createdAt: 1
        }
      }
    ]).toArray();

    const doc = docs[0];

    if (!doc) {
      return res.status(404).json({ message: 'Recommendation not found' });
    }

    res.json({
      responseId: doc._id.toString(),
      student: doc.student,
      recommendations: Array.isArray(doc.recommendations)
        ? doc.recommendations.map(item => ({
            ...item,
            reasons: Array.isArray(item.reasons) ? item.reasons : [],
            warnings: Array.isArray(item.warnings) ? item.warnings : []
          }))
        : [],
      overallWarnings: Array.isArray(doc.overallWarnings) ? doc.overallWarnings : [],
      createdAt: doc.createdAt
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch recommendation' });
  }
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('DB connection failed:', error);
  });

  
