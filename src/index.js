import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import morgan from "morgan";
import { Server } from "socket.io";
import { createServer } from "node:http";
import ia from "./services/ia";
import { Ollama } from "@langchain/community/llms/ollama";
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

//WebSocket
io.on("connection", async (socket) => {
  console.log("a user has connected!");

  socket.on("disconnect", () => {
    console.log("an user has disconnected");
  });

  socket.on("chat message", async (msg) => {
    console.log(msg);
    let student = bd.students[0];
    console.log(student);

    let student_isnew = student.isnew;
    io.emit("chat message", msg);

    //Utiliza la api de Ollama para obtener respuestas del modelo phi3
    const ollama = new Ollama({
      baseUrl: "http://localhost:11434", // Default value
      model: "phi3", // Default value
    });

    //Get prompt
    let newprompt = getprompt(student, msg);

    //Send prompt to LLM
    const stream = await ollama.stream(newprompt);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
      // console.log(chunk);
      // await io.emit("chat message", chunk);
      //Descomentar esta linea para que responda palabra a palabra por wbsocket
      // await io.emit("chat message", chunk);
    }
    console.log(chunks.join(""));

    //Valida si el estudiante es nuevo para cambiar el propmt de estudio
    if (student_isnew) {
      bd.students[0].prompt = chunks.join("");
      student_isnew = false;
    }
    //coentar esta linea al descomentar la de arriba
    await io.emit("chat message", chunks.join(""));
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
      "con base a las siguientes respuestas indicame cual es mi metodo de aprendizaje recomendado en un prompt de maximo 100 palabras, solo quiero que me respondas con el prompt" +
      bd.initprompt;
    bd.isnew = false;
  } else {
    prompt =
      student.prompt +
      " por favor basate en esta para explicar todo lo que te preguntare a continuacion en maximo 100palabras:" +
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
