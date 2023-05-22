import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";

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

const template = "What is a good name for a company that makes {product}?";
const prompt = new PromptTemplate({
  template,
  inputVariables: ["product"],
});

const chain = new LLMChain({ llm: model, prompt });
const response = await chain.call({ product: "colorful socks" });
console.log(response.text);
