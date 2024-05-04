import { config } from 'dotenv';
import { makeOllamaRequest } from './utils/makeRequest';
import * as tmi from 'tmi.js';

config();

const botOneOpts = {
    identity: {
        username: process.env.USER1 || 'ollama_bot',
        password: process.env.OAUTH1 || 'oauth:1234567890',
    },
    channels: process.env.CHANNELS?.split(',') || ['ollama']
};

const botTwoOpts = {
    identity: {
        username: process.env.USER2 || 'ollama_bot2',
        password: process.env.OAUTH2 || 'oauth:1234567890',
    },
    channels: process.env.CHANNELS?.split(',') || ['ollama']
};

const stopCommand: string = process.env.STOPCOMMAND || '!stop';
const startCommand: string = process.env.STARTCOMMAND || '!ollama';

const botOne = new tmi.client(botOneOpts);
const botTwo = new tmi.client(botTwoOpts);

const botOneSystemPrompt = process.env.SYSPROMPT1 || 'You are a Chatbot.';
const botTwoSystemPrompt = process.env.SYSPROMPT2 || 'You are a Chatbot.';

botOne.connect().catch(console.error);
botTwo.connect().catch(console.error);

botOne.on('message', async (channel, tags, message, self) => {
    if (self || message.startsWith(stopCommand)) return;
    else {
        if (message.toLowerCase().startsWith(startCommand) || (tags.username === process.env.USER2)) {
            
            let query;

            if (message.startsWith(startCommand)) {
                query = message.replace(startCommand, '').trim();
                botOne.say(channel, "👂");

            }
            const sendChunks = async (chunk: string) => {
                await botOne.say(channel, chunk);
            };

            try {

                const username = tags.username || 'ollama';

                if(query) {
                    await makeOllamaRequest(query, username, botOneSystemPrompt, sendChunks);
                }

            } catch (err: any) {
                console.error(err);
            }
        }
    }
});

botTwo.on('message', async (channel, tags, message, self) => {
    if (self || message.startsWith(stopCommand)) return;
    else {
        if (tags.username === process.env.USER1) {
            
            let query;

            if (message.startsWith(startCommand)) {
                query = message.replace(startCommand, '').trim();

            }
            const sendChunks = async (chunk: string) => {
                await botTwo.say(channel, chunk);
            };

            try {

                const username = tags.username || 'ollama';

                if(query) {
                    await makeOllamaRequest(query, username, botTwoSystemPrompt, sendChunks);
                }
                
            } catch (err: any) {
                console.error(err);
            }
        }
    }
});

