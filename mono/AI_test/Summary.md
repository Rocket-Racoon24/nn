#### Libraries that are being used
**flask**
**pypdf2** - To convert the PDF to text format
**yt-dlp** - To scrape the YT subtitles from the video, both manual and the one that was automatically created by the YT will work

Took a pre-built binary file for the llama.cpp (required to run the model locally)
Models are taken from "**hugging face**"
current model name - "**Qwen3-1.7B-Q8_0**"
- A low end AI model trained with a humongous amount of data having it's knowledge capped till 2024, will be able to run even on low end CPU/GPU.

Other models on hand - "**Qwen3-8B-Q8_0**"
- Higher variant, requiring a higher processing power

#### Running the code as a standalone server to get the API
llama-server.exe -m 'model_name' -c 32768 --host 0.0.0.0 --port 8080
- Token limit (context size) has been increased from 4096 to 32786, to increase the number of tokens that the model can process. 
#### Running the model on the cmd itself
llama-cli -m 'model_name'

The python file will run and call the API as needed from the LLM. A unique ID has been given in the code
```
app = Flask(__name__)

app.secret_key = '5a6602a8e817bc27572a3859ff87457cd262791ea6a92c9d9f5a7673cbcc6597'
```
As of now this code is hardcoded
This key is used to securely sign user sessions, allowing the application to safely remember chat history for each individual user.
___
#### Fine tuning
As training the model is a huge task as of having a good hardware that is suitable is not available at the moment, we went with "prompt engineering" as an alternative, where the model will handle the "Tuning" part.
An example prompt is provided in the back end, the user query is given along with it, and the model will analyze the query along with the hardcoded prompt to give the best result.

```
### INSTRUCTIONS ###

You are a knowledgeable expert and skilled writer. Your task is to take the provided content or outline and expand it into a detailed and readable summary.

  

Use your own knowledge to enrich the content where appropriate. For every point, provide a clear and concise explanation. The final output must be well-structured, accurate, and easy to understand, using markdown for formatting.

  

### EXAMPLE ###

  

**Input Template:**

Making a Cup of Tea

- 1. Preparation:

  - Gather ingredients

  - Boil water

- 2. Brewing:

  - Steep the tea bag

  

**Required Output:**

### Summary of Making a Cup of Tea

- 1. Preparation:

  - Gather ingredients: You will need a teacup, a tea bag of your choice (like black or green tea), and fresh, cold water. Optional ingredients include sugar, milk, lemon, or honey.

  - Boil water: Fill a kettle with the cold water and heat it until it reaches a rolling boil. Using freshly boiled water ensures the best flavor extraction from the tea leaves.

- 2. Brewing:

  - Steep the tea bag: Place the tea bag in your cup and pour the boiling water over it. Allow it to steep for 3-5 minutes, depending on your desired strength, before removing the bag.

  

### TASK ###

Now, using the instructions and example above, create a detailed summary from the following content:
```
This is the current prompt template that is being used.