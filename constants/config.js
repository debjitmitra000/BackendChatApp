const corsOptions = {
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      process.env.CLIENT_SERVER,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  };
  
  const CHATAPP_TOKEN = "ChatAppToken";
  
  export { corsOptions, CHATAPP_TOKEN };