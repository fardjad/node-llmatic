import os

os.environ["OPENAI_API_KEY"] = "ANYTHING_WILL_DO"
os.environ["OPENAI_API_BASE"] = "http://127.0.0.1:3000/v1"

from langchain import OpenAI, LLMChain, PromptTemplate
from langchain.memory import ConversationBufferMemory
    
model = OpenAI(temperature=0, model_name="Ignored")

template = """A chat between a curious user and an artificial intelligence assistant.
The assistant gives helpful, detailed, and polite answers to the user's questions.

{history}
Human: {human_input}
AI:"""

prompt = PromptTemplate(
    input_variables=["history", "human_input"], 
    template=template
)

chatgpt_chain = LLMChain(
    llm=model,
    prompt=prompt, 
    verbose=True,
    memory=ConversationBufferMemory(),
)

print(chatgpt_chain.predict(human_input="Rememeber that this is a demo of LLMatic with LangChain."))
print(chatgpt_chain.predict(human_input="What did I ask you to remember?"))