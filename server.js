const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'https://tourist-guide.lukholo-m.workers.dev',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Define the shape of a destination document
const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ['food', 'sightseeing', 'nightlife'] },
  location: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, default: 3 },
  votes: { type: Number, default: 0 }
});

// Create a model from the schema
const Destination = mongoose.model('Destination', destinationSchema);

// Seed the database with sample data if empty
async function seedData() {
  const count = await Destination.countDocuments();

  if (count === 0) {
    await Destination.insertMany([
      {
        name: 'Central Park',
        description: 'A large public park in New York City with walking trails and lakes',
        category: 'sightseeing',
        location: 'New York, USA',
        rating: 5
      },
      {
        name: 'Tsukiji Outer Market',
        description: 'Famous street food market with fresh seafood and local delicacies',
        category: 'food',
        location: 'Tokyo, Japan',
        rating: 4
      },
      {
        name: 'Berghain',
        description: 'Legendary techno nightclub known for its industrial setting',
        category: 'nightlife',
        location: 'Berlin, Germany',
        rating: 5
      },
      {
        name: 'Eiffel Tower',
        description: 'Iconic iron tower with panoramic city views from observation decks',
        category: 'sightseeing',
        location: 'Paris, France',
        rating: 5
      },
      {
        name: 'Borough Market',
        description: 'Historic food market with artisan producers and street food stalls',
        category: 'food',
        location: 'London, UK',
        rating: 4
      },
      {
        name: 'Skybar Lebua',
        description: 'Rooftop bar on the 63rd floor with stunning city views',
        category: 'nightlife',
        location: 'Bangkok, Thailand',
        rating: 4
      }
    ]);

    console.log('Database seeded with sample destinations');
  }
}

// Connect to MongoDB and seed data on success
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    return seedData();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Test Geoapify Places API
app.get('/api/geoapify/places', async (req, res) => {
  try {
    const {
      lat = '-33.9608',
      lon = '25.6022'
    } = req.query;
    const radius = 5000;
    const categories =
      'tourism.sights,tourism.attraction,tourism.museum';
    const url =
      `https://api.geoapify.com/v2/places` +
      `?categories=${encodeURIComponent(categories)}` +
      `&filter=circle:${lon},${lat},${radius}` +
      `&limit=20` +
      `&apiKey=${process.env.GEOAPIFY_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        'Geoapify error:',
        response.status,
        errorText
      );
      return res.status(response.status).json({
        message: 'Geoapify request failed'
      });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(
      'Geoapify API error:',
      error
    );
    res.status(500).json({
      message: 'Failed to load places from Geoapify'
    });
  }
});

// Return destinations, optionally filtered by category and/or search term
app.get('/api/destinations', async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');

      query.$or = [
        { name: regex },
        { location: regex },
        { description: regex }
      ];
    }

    const destinations = await Destination.find(query);

    res.json(destinations);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to load destinations'
    });
  }
});

// Save a new destination to the database
app.post('/api/destinations', async (req, res) => {
  try {
    const destination = new Destination(req.body);
    const saved = await destination.save();

    res.status(201).json(saved);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: 'Failed to save destination'
    });
  }
});

// Vote for a destination
app.post('/api/destinations/:id/vote', async (req, res) => {
  try {
    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      { $inc: { votes: 1 } },
      { new: true }
    );

    if (!destination) {
      return res.status(404).json({
        message: 'Destination not found'
      });
    }

    res.json({
      votes: destination.votes
    });

  } catch (error) {
    console.error('Vote error:', error);

    res.status(500).json({
      message: 'Failed to vote'
    });
  }
});

// Get current weather for a destination
app.get('/api/weather', async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({
        message: 'Location is required'
      });
    }

    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
    );

    if (!weatherResponse.ok) {
      return res.status(weatherResponse.status).json({
        message: 'Failed to fetch weather'
      });
    }

    const weather = await weatherResponse.json();

    res.json({
      location: weather.name,
      temperature: Math.round(weather.main.temp),
      feelsLike: Math.round(weather.main.feels_like),
      description: weather.weather[0].description,
      icon: weather.weather[0].icon,
      humidity: weather.main.humidity,
      windSpeed: weather.wind.speed
    });

  } catch (error) {
    console.error('Weather API error:', error);

    res.status(500).json({
      message: 'Failed to load weather'
    });
  }
});
// Get an image for a destination
app.get('/api/image', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        message: 'Query is required'
      });
    }

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY
        }
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        message: 'Failed to fetch image'
      });
    }

    const data = await response.json();

    if (!data.photos || data.photos.length === 0) {
      return res.json({
        image: null
      });
    }

    res.json({
      image: data.photos[0].src.large,
      photographer: data.photos[0].photographer,
      photographerUrl: data.photos[0].photographer_url
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to load image'
    });
  }
});
// Start the server
app.listen(PORT, () => {
  console.log(`Tourist Guide server running at http://localhost:${PORT}`);
});
