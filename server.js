const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Define the shape of a destination document
const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ['food', 'sightseeing', 'nightlife'] },
  location: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, default: 3 }
});

// Create a model from the schema
const Destination = mongoose.model('Destination', destinationSchema);

// Seed the database with sample data if empty
async function seedData() {
  const count = await Destination.countDocuments();
  if (count === 0) {
    await Destination.insertMany([
      { name: 'Central Park', description: 'A large public park in New York City with walking trails and lakes', category: 'sightseeing', location: 'New York, USA', rating: 5 },
      { name: 'Tsukiji Outer Market', description: 'Famous street food market with fresh seafood and local delicacies', category: 'food', location: 'Tokyo, Japan', rating: 4 },
      { name: 'Berghain', description: 'Legendary techno nightclub known for its industrial setting', category: 'nightlife', location: 'Berlin, Germany', rating: 5 },
      { name: 'Eiffel Tower', description: 'Iconic iron tower with panoramic city views from observation decks', category: 'sightseeing', location: 'Paris, France', rating: 5 },
      { name: 'Borough Market', description: 'Historic food market with artisan producers and street food stalls', category: 'food', location: 'London, UK', rating: 4 },
      { name: 'Skybar Lebua', description: 'Rooftop bar on the 63rd floor with stunning city views', category: 'nightlife', location: 'Bangkok, Thailand', rating: 4 }
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
        { description: regex },
      ];
    }

    const destinations = await Destination.find(query);
    res.json(destinations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load destinations' });
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
    res.status(400).json({ message: 'Failed to save destination' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Tourist Guide server running at http://localhost:${PORT}`);
});