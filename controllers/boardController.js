const axios = require('axios');
const env = require('dotenv').config();

exports.activateTextToSpeech = async (req, res) => {
    const { text } = req.body;
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    const payload = {
        "audioConfig": {
            "audioEncoding": "MP3",
            "effectsProfileId": [
                "small-bluetooth-speaker-class-device"
            ],
            "pitch": 0,
            "speakingRate": 1
        },
        "input": {
            "text": text
        },
        "voice": {
            "languageCode": "fil-PH",
            "name": "fil-PH-Standard-D"
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