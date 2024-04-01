<div align="center">

# LLMatic

<img alt="LLMatic Logo" width="300px" height="300px" src="/media/logo.png">

Use self-hosted LLMs with an OpenAI compatible API

<div class="paragraph">

<span class="image"><a href="https://www.npmjs.com/package/llmatic" class="image"><img src="https://img.shields.io/npm/v/llmatic" alt="llmatic" /></a></span> <span class="image"><a href="https://www.npmjs.com/package/llmatic" class="image"><img src="https://img.shields.io/npm/dm/llmatic" alt="llmatic" /></a></span> <span class="image"><a href="https://github.com/fardjad/node-llmatic/actions" class="image"><img src="https://img.shields.io/github/actions/workflow/status/fardjad/node-llmatic/test-and-release.yml?branch=master" alt="test and release" /></a></span>

</div>

</div>

<hr />

## Project status

This project was the result of my curiousity and experimentation with OpenAI's API and I enjoyed building it. It is certainly not the first nor the last project of its kind. Given my limited time and resources, I'd like to pause the development of this project for now. I'll list some other similar projects below that can be used as alternatives:

1. [Ollama](https://github.com/ollama/ollama/blob/main/docs/openai.md)
2. [LLaMA.cpp HTTP Server](https://github.com/ggerganov/llama.cpp/tree/master/examples/server)
3. [GPT4All Chat Server Mode](https://docs.gpt4all.io/gpt4all_chat.html#gpt4all-chat-server-mode)
4. [FastChat](https://github.com/lm-sys/FastChat/blob/main/docs/openai_api.md)


## Synopsis

LLMatic can be used as a drop-in replacement for OpenAI's API [v1.2.0](https://github.com/openai/openai-openapi/blob/88f221442879061d9970ed453a65b973d226f15d/openapi.yaml) (see the
supported endpoints). By default, it uses [llama-node](https://github.com/Atome-FE/llama-node)
with [llama.cpp](https://github.com/ggerganov/llama.cpp) backend to run the models locally. However, you can easily create [your own adapter](#custom-adapters) to use any other model or service.

Supported endpoints:

- [x] /completions (stream and non-stream)
- [x] /chat/completions (stream and non-stream)
- [x] /embeddings
- [x] /models

## How to use

If you prefer a video tutorial, you can watch the following video for step-by-step instructions on how to use this project:

<a href="http://www.youtube.com/watch?feature=player_embedded&v=V_baaAZMY44" target="_blank">
<img src="https://img.youtube.com/vi/V_baaAZMY44/hqdefault.jpg" alt="LLMatic" style="min-height: 200px" />
</a>

### Requirements

- Node.js >=18.16
- Unix-based OS (Linux, macOS, WSL, etc.)

### Installation

Create an empty directory and run `npm init`:

```bash
export LLMATIC_PROJECT_DIR=my-llmatic-project
mkdir $LLMATIC_PROJECT_DIR
cd $LLMATIC_PROJECT_DIR
npm init -y
```

Install and configure LLMatic:

```bash
npm add llmatic
# Download a model and generate a config file
npx llmatic config
```

Adjust the config file to your needs and start the server:

```bash
npx llmatic start
```

You can run `llmatic --help` to see all available commands.

### Usage with [chatbot-ui](https://github.com/mckaywrigley/chatbot-ui)

Clone the repo and install the dependencies:

```bash
git clone https://github.com/mckaywrigley/chatbot-ui.git
cd chatbot-ui
npm install
```

Create a `.env.local` file:

```bash
cat <<EOF > .env.local
# For now, this is ignored by LLMatic
DEFAULT_MODEL=Ignored

NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT=A chat between a curious human (user) and an artificial intelligence assistant (assistant). The assistant gives helpful, detailed, and polite answers to the human's questions.

user: Hello!
assistant: Hello! How may I help you today?
user: Please tell me the largest city in Europe.
assistant: Sure. The largest city in Europe is Moscow, the capital of Russia.

OPENAI_API_KEY=ANYTHING_WILL_DO
OPENAI_API_HOST=http://localhost:3000

GOOGLE_API_KEY=YOUR_API_KEY
GOOGLE_CSE_ID=YOUR_ENGINE_ID
EOF
```

Run the server:

```bash
npm run dev -- --port 3001
```

Demo:

![chatbot-ui Demo](/media/chatbot-ui.gif)

### Usage with [LangChain](https://langchain.com)

There are two examples of using LLMatic with LangChain in the
[`examples`](/examples) directory.

To run the Node.js example, first install the dependencies:

```bash
cd examples/node-langchain
npm install
```

Then run the main script:

```bash
npm start
```

<details>
  <summary>Expand this to see the sample output</summary>

```
[chain/start] [1:chain:llm_chain] Entering Chain run with input: {
  "humanInput": "Rememeber that this is a demo of LLMatic with LangChain.",
  "history": ""
}
[llm/start] [1:chain:llm_chain > 2:llm:openai] Entering LLM run with input: {
  "prompts": [
    "A chat between a curious user and an artificial intelligence assistant.\nThe assistant gives helpful, detailed, and polite answers to the user's questions.\n\n\nHuman: Rememeber that this is a demo of LLMatic with LangChain.\nAI:"
  ]
}
[llm/end] [1:chain:llm_chain > 2:llm:openai] [5.92s] Exiting LLM run with output: {
  "generations": [
    [
      {
        "text": " Yes, I understand. I am ready to assist you with your queries.",
        "generationInfo": {
          "finishReason": "stop",
          "logprobs": null
        }
      }
    ]
  ],
  "llmOutput": {
    "tokenUsage": {}
  }
}
[chain/end] [1:chain:llm_chain] [5.92s] Exiting Chain run with output: {
  "text": " Yes, I understand. I am ready to assist you with your queries."
}
[chain/start] [1:chain:llm_chain] Entering Chain run with input: {
  "humanInput": "What did I ask you to remember?",
  "history": "Human: Rememeber that this is a demo of LLMatic with LangChain.\nAI:  Yes, I understand. I am ready to assist you with your queries."
}
[llm/start] [1:chain:llm_chain > 2:llm:openai] Entering LLM run with input: {
  "prompts": [
    "A chat between a curious user and an artificial intelligence assistant.\nThe assistant gives helpful, detailed, and polite answers to the user's questions.\n\nHuman: Rememeber that this is a demo of LLMatic with LangChain.\nAI:  Yes, I understand. I am ready to assist you with your queries.\nHuman: What did I ask you to remember?\nAI:"
  ]
}
[llm/end] [1:chain:llm_chain > 2:llm:openai] [6.51s] Exiting LLM run with output: {
  "generations": [
    [
      {
        "text": " You asked me to remember that this is a demo of LLMatic with LangChain.",
        "generationInfo": {
          "finishReason": "stop",
          "logprobs": null
        }
      }
    ]
  ],
  "llmOutput": {
    "tokenUsage": {}
  }
}
[chain/end] [1:chain:llm_chain] [6.51s] Exiting Chain run with output: {
  "text": " You asked me to remember that this is a demo of LLMatic with LangChain."
}
```

</details>

<hr>

To run the Python example, first install the dependencies:

```bash
cd examples/python-langchain
pip3 install -r requirements.txt
```

Then run the main script:

```bash
python3 main.py
```

<details>
  <summary>Expand this to see the sample output</summary>

```
> Entering new LLMChain chain...
Prompt after formatting:
A chat between a curious user and an artificial intelligence assistant.
The assistant gives helpful, detailed, and polite answers to the user's questions.


Human: Rememeber that this is a demo of LLMatic with LangChain.
AI:

> Finished chain.
 Yes, I understand. I am ready to assist you with your queries.


> Entering new LLMChain chain...
Prompt after formatting:
A chat between a curious user and an artificial intelligence assistant.
The assistant gives helpful, detailed, and polite answers to the user's questions.

Human: Rememeber that this is a demo of LLMatic with LangChain.
AI:  Yes, I understand. I am ready to assist you with your queries.
Human: What did I ask you to remember?
AI:

> Finished chain.
 You asked me to remember that this is a demo of LLMatic with LangChain.
```

</details>

## Custom Adapters

LLMatic is designed to be easily extensible. You can create your own adapters by extending the [`LlmAdapter`](/src/llm-adapter.ts) class. See [`examples/custom-adapter`](/examples/custom-adapter) for an example.

To start llmatic with a custom adapter, use the `--llm-adapter` flag:

```bash
llmatic start --llm-adapter ./custom-llm-adapter.ts
```
