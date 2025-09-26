const OpenAI = require("openai");
var secretConfig = require('../secret-config');

function getOpenAI() {
    const configuration = {
    apiKey: secretConfig.OPENAI_API_KEY,
    };

    const openai = new OpenAI(configuration);
    return openai;
}

async function getAnswer(messages) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: messages,
  });
  console.log(completion.choices[0].message);
  var message = completion.choices[0].message;
  return message.content;
}

module.exports = {
    getOpenAI,
    getAnswer,
    default: {
        getOpenAI,
        getAnswer
    }
};
