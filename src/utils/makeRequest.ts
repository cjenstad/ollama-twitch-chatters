import axios, { AxiosResponse } from 'axios';
import { config } from 'dotenv';

config();

interface OllamaResponse {
    response?: string;
    done?: boolean;
    message?: { role: string, content: string };
}

interface OllamaMessage {
    role: string;
    content: string;
}

const userMessageHistory: { [username: string]: OllamaMessage[] } = {};

export async function sendStringInChunks(str: string, send: (chunk: string) => Promise<void>) {
    const chunkSize = 498;
    let index = 0;
    const delay = 5000; // 5 seconds

    console.log(`Total length to send: ${str.length}`);

    while (index < str.length) {
        const chunk = str.slice(index, index + chunkSize);
        console.log(`Sending chunk from ${index} to ${index + chunkSize}`);
        await send(chunk);
        index += chunkSize;

        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

export async function makeOllamaRequest(prompt: string, username: string, sysprompt: string, sendChunks: (chunk: string) => Promise<void>): Promise<void> {

    const ollamaURL: string = process.env.OLLAMAURL || '127.0.0.1:11434';
    const model: string = process.env.MODEL || 'llama2';
    const systemPrompt: string = sysprompt;

    if (!ollamaURL || !model) {
        throw new Error('OLLAMA URL or MODEL not set in environment variables');
    }

    // initialize user message history
    if (!userMessageHistory[username]) {
        userMessageHistory[username] = [{ role: 'system', content: systemPrompt }];
    }

    userMessageHistory[username].push({ role: 'user', content: prompt });

    const requestData = {
        model,
        messages: userMessageHistory[username],
    }

    console.log(userMessageHistory[username]);

    let fullResponse: string = '';

    return new Promise<void>(async (resolve, reject) => {
        try {
            const response: AxiosResponse = await axios.post(`http://${ollamaURL}/api/chat`, requestData, {
                headers: { 'Content-Type': 'application/json' },
                responseType: 'stream',
            });

            response.data.on('data', async (chunk: Buffer) => {
                const chunkString: string = chunk.toString('utf8');
                const parsed: OllamaResponse = JSON.parse(chunkString);

                if (parsed.hasOwnProperty('response')) {
                    fullResponse += parsed.response;
                }

                if (parsed.hasOwnProperty('done') && parsed.done) {
                    const assistantMessageObject: OllamaMessage = { role: 'assistant', content: fullResponse };
                    userMessageHistory[username].push(assistantMessageObject);
                    console.log("Received 'done', sending all accumulated chunks.");
                    await sendStringInChunks(fullResponse, sendChunks);
                    console.log("All chunks sent.");
                    resolve();
                }
            });

            response.data.on('error', (err: any) => {
                reject(err);
            });
        } catch (err: any) {
            if (err instanceof Error) {
                reject(`Error: ${err.message}`);
            } else {
                reject("An unknown error occurred.");
            }
        }
});

}