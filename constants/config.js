const corsOptions = {
  origin: [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:5174"  // Add this line
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const CHATAPP_TOKEN = "ChatAppToken";
  
export { corsOptions, CHATAPP_TOKEN };