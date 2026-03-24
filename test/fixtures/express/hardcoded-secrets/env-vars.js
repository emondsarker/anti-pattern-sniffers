const config = {
  database: {
    password: process.env.DB_PASSWORD,
    connectionString: process.env.DATABASE_URL,
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  apiKey: process.env.API_KEY,
};

module.exports = config;
