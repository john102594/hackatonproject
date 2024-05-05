import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import morgan from "morgan";
import { Server } from "socket.io";
import { createServer } from "node:http";
import ia from "./services/ia";
// import { Ollama } from "@langchain/community/llms/ollama";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
// import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
// import { MessagesPlaceholder } from "@langchain/core/prompts";

import bd from "./bd";
dotenv.config();

const port = process.env.PORT ?? 4000;

const app = express();
const server = createServer(app);
const io = new Server(server);

//Middleawares
app.use(morgan("dev"));
app.use(express.json());
app.use(cors());
app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb", extended: true }));

//Model
const chatModel = new ChatOllama({
  baseUrl: "http://localhost:11434", // Default value
  model: "phi3",
  temperature: 0.5, //Para que no sea muy creativo
});
//poner a funcionar que el modelo haga el quiz de tipo de aprendizaje segun la metodologia aplicada
const prompt = ChatPromptTemplate.fromMessages([
  ["system", bd.system_prompt],
  ["user", "me gusta aprender con novelas de ciencia ficcion"], //reemplazar esto por un prompt generado por el modelo al hacer la encuesta
  ["ai", "Ok que quieres aprender?"],
  ["user", "{input}"],
]);

//Agregar memoria al modelo
// const historyAwarePrompt = ChatPromptTemplate.fromMessages([
//   new MessagesPlaceholder("chat_history"),
//   ["user", "{input}"],
//   [
//     "user",
//     "Dada la conversación anterior, genere una consulta de búsqueda para buscar información relevante para la conversación",
//   ],
// ]);

// const historyAwareRetrieverChain = await createHistoryAwareRetriever({
//   llm: chatModel,
//   retriever,
//   rephrasePrompt: historyAwarePrompt,
// });

const outputParser = new StringOutputParser();

//WebSocket
io.on("connection", async (socket) => {
  console.log("a user has connected!");

  socket.on("disconnect", () => {
    console.log("an user has disconnected");
  });

  socket.on("chat message", async (msg) => {
    // io.emit("chat message", msg);

    const llmChain = prompt.pipe(chatModel).pipe(outputParser);
    const stream = await llmChain.stream({
      input: msg,
    });
    const chunks = [];
    for await (const chunk of stream) {
      // console.log(chunk);
      chunks.push(chunk);
      await io.emit("chat message", chunk);
    }
    let resp = chunks.join("");
    console.log(resp);
    // await io.emit("chat message", resp);
  });

  if (!socket.recovered) {
    // <- recuperase los mensajes sin conexión
  }
});

function getprompt(student, msg) {
  // console.log(student);
  // console.log(bd.initprompt);
  let prompt = "";
  if (student.isnew) {
    prompt =
      "con base a las siguientes respuestas indicame cual es mi metodo de aprendizaje recomendado en un prompt de maximo 100 palabras dame solo el propmt" +
      bd.initprompt;
    bd.isnew = false;
  } else {
    prompt =
      prompt +
      " por favor basate en esta para explicar todo lo que te preguntare a continuacion:" +
      msg;
  }
  console.log(prompt);

  return prompt;
}

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/src/client/index.html");
});

app.use("/api/chat/", ia);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
