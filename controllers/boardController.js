const axios = require('axios');
const env = require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});



exports.activateTextToSpeech = async (req, res) => {
    const { text, pitch, voice } = req.body;
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    const payload = {
        "audioConfig": {
            "audioEncoding": "MP3",
            "effectsProfileId": [
                "small-bluetooth-speaker-class-device"
            ],
            "pitch": (0.8 + (pitch * 0.5) + (voice == 2 ? 0.3 : 0)),
            "speakingRate": 1
        },
        "input": {
            "text": text
        },
        "voice": {
            "languageCode": "fil-PH",
            "name": (voice ? (voice == 1 ? "fil-PH-Standard-A" : (voice == 2 ? "fil-PH-Standard-C" : "fil-PH-Standard-D")) : "fil-PH-Standard-D")
        }
    }

    try {
        const response = await axios.post(url, payload)
        res.json(response.data.audioContent.toString('base64'));
    }
    catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        console.log(apiKey)
        return res.status(500).send({ error: 'Failed to activate text-to-speech' });
    }
}

exports.buildSentence = async (req, res) => {
    const { text } = req.body;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: 'You are a communication board that generates full Filipino sentences using Tagalog word sequences from the user, you are being used by the user to communicate, reply like the following user profile (child, 12, minimally-verbal, student)' },
                { role: 'user', content: `${text}` }
            ]
        });
        const message = response.choices[0].message.content;
        res.json({ message });
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        return res.status(500).send({ error: 'Failed to build sentence' });
    }
}
