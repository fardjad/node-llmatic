import { LLMChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "langchain/prompts";

const model = new OpenAI(
  {
    temperature: 0,
    openAIApiKey: "ANYTHING_WILL_DO",
    modelName: "Ignored",
  },
  {
    basePath: "http://localhost:3000/v1",
  }
);

const template = `A chat between a curious user and an artificial intelligence assistant.
The assistant gives helpful, detailed, and polite answers to the user's questions.

{history}
Human: {humanInput}
AI:`;

const prompt = new PromptTemplate({
  inputVariables: ["history", "humanInput"],
  template,
});

const chatgptChain = new LLMChain({
  llm: model,
  prompt,
  verbose: true,
  memory: new BufferMemory(),
});

await chatgptChain.predict({
  humanInput: "Rememeber that this is a demo of LLMatic with LangChain.",
});
await chatgptChain.predict({
  humanInput: "What did I ask you to remember?",
});
