const mongoose = require('mongoose');
const User = require('./Models/User');

const dbUri = 'mongodb://127.0.0.1:27017/libaseikhlaq';
mongoose.connect(dbUri)
.then(async () => {
    console.log('Connected to MongoDB');
    const users = await User.find({});
    console.log('Users found in database:');
    users.forEach(u => console.log(`Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`));
    mongoose.connection.close();
})
.catch(err => console.error(err));
