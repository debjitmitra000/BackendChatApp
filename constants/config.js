const corsOptions = {
    origin: [
      process.env.CLIENT_SERVER,
      "http://localhost:5173",
      "http://localhost:4173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"]
  };
  
  const CHATAPP_TOKEN = "ChatAppToken";
  
  export { corsOptions, CHATAPP_TOKEN };