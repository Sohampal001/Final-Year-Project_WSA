# MongoDB Setup Guide

## Prerequisites

- MongoDB installed locally OR MongoDB Atlas account

## Option 1: Local MongoDB Installation

### Windows

1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install with default settings
3. MongoDB should start automatically as a service
4. Verify installation:
   ```powershell
   mongod --version
   ```

### macOS (using Homebrew)

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux (Ubuntu/Debian)

```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (Free tier M0)
3. Set up database access (create a user)
4. Set up network access (allow your IP or allow from anywhere: 0.0.0.0/0)
5. Get your connection string
6. Update `.env` file:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/suraksha?retryWrites=true&w=majority
   ```

## Configuration

The server uses environment variables for MongoDB connection. Edit the `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/suraksha
```

### Connection String Format

**Local MongoDB:**

```
mongodb://localhost:27017/suraksha
```

**MongoDB Atlas:**

```
mongodb+srv://username:password@cluster.mongodb.net/suraksha?retryWrites=true&w=majority
```

**MongoDB with Authentication:**

```
mongodb://username:password@localhost:27017/suraksha?authSource=admin
```

## Database Structure

The application will automatically create the following collections:

- `users` - User accounts
- `guardians` - Emergency contacts
- `addresses` - User addresses
- `aadhars` - Aadhaar verification records
- `otps` - One-time passwords
- `sosevents` - SOS emergency events
- `alertlogs` - Alert history
- `trustedcontacts` - Trusted contact list
- `volunteers` - Volunteer information

## Starting the Server

1. Ensure MongoDB is running (local) or connection string is configured (Atlas)
2. Start the server:

   ```bash
   npm run dev
   ```

3. You should see:
   ```
   ✅ MongoDB connected successfully
   📍 Database: suraksha
   🌐 Host: localhost
   🚀 Server is running on port 3000
   ```

## Verifying Connection

### Using MongoDB Compass (GUI)

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect using: `mongodb://localhost:27017`
3. You should see the `suraksha` database

### Using MongoDB Shell

```bash
mongosh
use suraksha
show collections
```

## Troubleshooting

### Error: "MongoDB connection failed"

- **Check if MongoDB is running:**

  ```powershell
  # Windows
  Get-Service MongoDB

  # Or check the process
  Get-Process mongod
  ```

- **Start MongoDB service:**

  ```powershell
  # Windows
  net start MongoDB

  # Or using MongoDB's tools
  mongod --dbpath "C:\data\db"
  ```

### Error: "ECONNREFUSED"

- MongoDB is not running or not accessible
- Check if the port 27017 is in use
- Verify firewall settings

### Error: "Authentication failed"

- Check username and password in connection string
- Ensure the user has proper permissions
- For Atlas: verify network access settings

## Database Management

### Backup Database

```bash
mongodump --db suraksha --out ./backup
```

### Restore Database

```bash
mongorestore --db suraksha ./backup/suraksha
```

### Drop Database (Caution!)

```bash
mongosh
use suraksha
db.dropDatabase()
```

## Environment Variables

| Variable      | Description               | Example                              |
| ------------- | ------------------------- | ------------------------------------ |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/suraksha` |
| `NODE_ENV`    | Environment mode          | `development` or `production`        |

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use strong passwords** for MongoDB users
3. **Enable authentication** in production
4. **Restrict network access** to known IPs only
5. **Use SSL/TLS** for connections in production
6. **Regularly backup** your database
7. **Monitor connection logs** for suspicious activity

## Production Deployment

For production, consider:

- Using MongoDB Atlas (managed service)
- Enabling replica sets for high availability
- Setting up automated backups
- Using connection pooling (already configured)
- Enabling SSL/TLS encryption
- Restricting IP whitelist

## Useful Commands

```bash
# Check MongoDB status
systemctl status mongod

# View MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Connect to MongoDB shell
mongosh

# Show all databases
show dbs

# Use suraksha database
use suraksha

# Show all collections
show collections

# Count documents in users collection
db.users.countDocuments()

# Find all users
db.users.find()
```

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB University](https://university.mongodb.com/) - Free courses
