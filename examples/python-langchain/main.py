import os

os.environ["OPENAI_API_KEY"] = "ANYTHING_WILL_DO"
os.environ["OPENAI_API_BASE"] = "http://127.0.0.1:3000/v1"

from langchain import OpenAI, LLMChain, PromptTemplate
from langchain.memory import ConversationBufferWindowMemory

template = """A chat between a curious user and an artificial intelligence assistant.
The assistant gives helpful, detailed, and polite answers to the user's questions.

{history}
USER: {human_input}
ASSISTANT:"""

prompt = PromptTemplate(
    input_variables=["history", "human_input"], 
    template=template
)


chatgpt_chain = LLMChain(
    llm=OpenAI(temperature=0, model_name="Ignored"), 
    prompt=prompt, 
    verbose=True, 
    memory=ConversationBufferWindowMemory(k=2),
)

output = chatgpt_chain.predict(human_input="Hello, how are you?")
print(output)